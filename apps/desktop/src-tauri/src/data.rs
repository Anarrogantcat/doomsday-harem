//! 游戏数据目录管理。
//!
//! 设计（对应需求「游戏数据和存档默认和游戏安装在一起」）：
//!  - 优先使用可执行文件同级的 `data/` 目录
//!  - 若安装目录不可写（如 Program Files 无权限），回退到用户目录
//!  - 启动时自动创建所需子目录
//!  - 提供目录信息供前端显示

use std::fs;
use std::path::{Path, PathBuf};
use tauri::Manager;

/// 数据目录结构
#[derive(serde::Serialize, Clone)]
pub struct DataLayout {
    /// 根目录（游戏安装目录或回退目录）
    pub root: String,
    /// 存档目录
    pub saves: String,
    /// 配置目录
    pub config: String,
    /// Mod 目录
    pub mods: String,
    /// 日志目录
    pub logs: String,
    /// 是否使用游戏安装目录（false 表示回退到用户目录）
    pub portable: bool,
}

/// 探测可执行文件所在目录
fn exe_dir() -> Option<PathBuf> {
    std::env::current_exe().ok()?.parent().map(|p| p.to_path_buf())
}

/// 检测目录是否可写
fn is_writable(dir: &Path) -> bool {
    if !dir.exists() {
        return false;
    }
    let probe = dir.join(".write-test");
    match fs::write(&probe, b"test") {
        Ok(_) => {
            let _ = fs::remove_file(&probe);
            true
        }
        Err(_) => false,
    }
}

/// 确保目录存在
fn ensure(dir: &Path) -> Result<(), String> {
    if dir.exists() {
        return Ok(());
    }
    fs::create_dir_all(dir).map_err(|e| format!("无法创建目录 {}: {}", dir.display(), e))
}

/// 解析数据根目录。
///
/// 顺序：
///  1. 环境变量 DH_DATA_DIR（便于测试与自定义）
///  2. 可执行文件同级 data/（便携模式）
///  3. 用户数据目录（回退）
pub fn resolve_root(app: &tauri::AppHandle) -> (PathBuf, bool) {
    // 1) 环境变量优先
    if let Ok(custom) = std::env::var("DH_DATA_DIR") {
        let p = PathBuf::from(custom);
        if ensure(&p).is_ok() && is_writable(&p) {
            return (p, true);
        }
    }

    // 2) 便携模式：exe 同级 data/
    if let Some(dir) = exe_dir() {
        let data = dir.join("data");
        // 先尝试创建
        if ensure(&data).is_ok() && is_writable(&data) {
            return (data, true);
        }
        // 安装目录本身可写但 data 不存在 → 尝试直接用 exe 同级
        if is_writable(&dir) {
            if ensure(&data).is_ok() {
                return (data, true);
            }
        }
    }

    // 3) 回退到用户数据目录
    let fallback = app
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("."));
    let _ = ensure(&fallback);
    (fallback, false)
}

/// 获取完整目录布局（并确保子目录存在）
pub fn layout(app: &tauri::AppHandle) -> Result<DataLayout, String> {
    let (root, portable) = resolve_root(app);

    let saves = root.join("saves");
    let config = root.join("config");
    let mods = root.join("mods");
    let logs = root.join("logs");

    for d in [&saves, &config, &mods, &logs] {
        ensure(d)?;
    }

    Ok(DataLayout {
        root: root.to_string_lossy().to_string(),
        saves: saves.to_string_lossy().to_string(),
        config: config.to_string_lossy().to_string(),
        mods: mods.to_string_lossy().to_string(),
        logs: logs.to_string_lossy().to_string(),
        portable,
    })
}

/// 存档目录
pub fn saves_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(layout(app)?.saves.into())
}

/// Mod 目录
pub fn mods_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(layout(app)?.mods.into())
}

/// 配置目录
pub fn config_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(layout(app)?.config.into())
}

// ============ Tauri 命令 ============

#[tauri::command]
pub fn get_data_layout(app: tauri::AppHandle) -> Result<DataLayout, String> {
    layout(&app)
}

/// 打开数据目录（资源管理器）
#[tauri::command]
pub fn open_data_dir(app: tauri::AppHandle) -> Result<String, String> {
    let l = layout(&app)?;
    Ok(l.root)
}

/// 设置自定义数据目录（写入环境变量，重启后生效）
#[tauri::command]
pub fn set_data_dir(path: String) -> Result<String, String> {
    let p = PathBuf::from(&path);
    ensure(&p)?;
    if !is_writable(&p) {
        return Err(format!("目录不可写：{}", path));
    }
    std::env::set_var("DH_DATA_DIR", &path);
    Ok(path)
}
