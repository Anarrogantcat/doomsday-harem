//! Mod 加载。
//!
//! 设计：
//!  - Mod 放在数据目录的 mods/ 下，每个 mod 一个子目录
//!  - mod.json 描述元信息（id/name/version/author/内容类型）
//!  - 支持内容类型：scripts（DSL 剧本）、data（数据覆盖）、assets（素材）
//!  - 读取失败不影响其他 mod（单个损坏不阻断）

use serde::Serialize;
use std::fs;
use std::path::PathBuf;

#[derive(Serialize, Clone)]
pub struct ModEntry {
    pub id: String,
    pub path: String,
    /// 是否已启用（由启停文件控制）
    pub enabled: bool,
    pub manifest: Option<serde_json::Value>,
    /// 该 mod 提供的内容统计
    pub contents: ModContents,
    /// 读取错误（若有）
    pub error: Option<String>,
}

#[derive(Serialize, Clone, Default)]
pub struct ModContents {
    /// DSL 剧本数量
    pub scripts: usize,
    /// 数据文件数量
    pub data: usize,
    /// 素材文件数量
    pub assets: usize,
}

/// 单个 mod 的文件内容
#[derive(Serialize)]
pub struct ModFile {
    /// 相对路径
    pub path: String,
    pub size: u64,
}

fn mods_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    crate::data::mods_dir(app)
}

/// 统计某目录下的文件数
fn count_files(dir: &PathBuf, ext: Option<&str>) -> usize {
    let mut n = 0;
    if let Ok(entries) = fs::read_dir(dir) {
        for e in entries.flatten() {
            let p = e.path();
            if p.is_file() {
                match ext {
                    Some(x) => {
                        if p.extension().and_then(|s| s.to_str()) == Some(x) {
                            n += 1;
                        }
                    }
                    None => n += 1,
                }
            }
        }
    }
    n
}

/// 递归统计（用于素材目录）
fn count_files_recursive(dir: &PathBuf) -> usize {
    let mut n = 0;
    if let Ok(entries) = fs::read_dir(dir) {
        for e in entries.flatten() {
            let p = e.path();
            if p.is_dir() {
                n += count_files_recursive(&p);
            } else {
                n += 1;
            }
        }
    }
    n
}

/// 扫描一个 mod 目录
fn scan_mod(dir: PathBuf) -> ModEntry {
    let id = dir
        .file_name()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_default();

    // 元信息
    let manifest_path = dir.join("mod.json");
    let (manifest, error) = match fs::read_to_string(&manifest_path) {
        Ok(s) => match serde_json::from_str::<serde_json::Value>(&s) {
            Ok(v) => (Some(v), None),
            Err(e) => (None, Some(format!("mod.json 解析失败: {}", e))),
        },
        Err(_) => (None, Some("缺少 mod.json".to_string())),
    };

    // 启停标记：存在 .disabled 文件表示停用
    let enabled = !dir.join(".disabled").exists();

    let contents = ModContents {
        scripts: count_files(&dir.join("scripts"), Some("dsl")),
        data: count_files(&dir.join("data"), Some("json")),
        assets: count_files_recursive(&dir.join("assets")),
    };

    ModEntry {
        id,
        path: dir.to_string_lossy().to_string(),
        enabled,
        manifest,
        contents,
        error,
    }
}

#[tauri::command]
pub fn list_mods(app: tauri::AppHandle) -> Result<Vec<ModEntry>, String> {
    let dir = mods_dir(&app)?;
    let mut out = Vec::new();
    for entry in fs::read_dir(dir).map_err(|e| e.to_string())? {
        let e = entry.map_err(|e| e.to_string())?;
        if !e.path().is_dir() {
            continue;
        }
        out.push(scan_mod(e.path()));
    }
    out.sort_by(|a, b| a.id.cmp(&b.id));
    Ok(out)
}

#[tauri::command]
pub fn read_mod_manifest(app: tauri::AppHandle, id: String) -> Result<String, String> {
    let path = mods_dir(&app)?.join(&id).join("mod.json");
    fs::read_to_string(path).map_err(|e| e.to_string())
}

/// 启用/停用 mod
#[tauri::command]
pub fn set_mod_enabled(app: tauri::AppHandle, id: String, enabled: bool) -> Result<bool, String> {
    let dir = mods_dir(&app)?.join(&id);
    if !dir.exists() {
        return Err(format!("mod 不存在：{}", id));
    }
    let flag = dir.join(".disabled");
    if enabled {
        if flag.exists() {
            fs::remove_file(&flag).map_err(|e| e.to_string())?;
        }
    } else {
        fs::write(&flag, b"disabled").map_err(|e| e.to_string())?;
    }
    Ok(enabled)
}

/// 读取 mod 内的某个文件（用于加载剧本/数据）
#[tauri::command]
pub fn read_mod_file(app: tauri::AppHandle, id: String, rel: String) -> Result<String, String> {
    // 防目录穿越
    if rel.contains("..") {
        return Err("非法路径".into());
    }
    let path = mods_dir(&app)?.join(&id).join(&rel);
    fs::read_to_string(path).map_err(|e| e.to_string())
}

/// 列出某个 mod 内的文件
#[tauri::command]
pub fn list_mod_files(app: tauri::AppHandle, id: String) -> Result<Vec<ModFile>, String> {
    let root = mods_dir(&app)?.join(&id);
    let mut out = Vec::new();

    fn walk(base: &PathBuf, cur: &PathBuf, out: &mut Vec<ModFile>) {
        if let Ok(entries) = fs::read_dir(cur) {
            for e in entries.flatten() {
                let p = e.path();
                if p.is_dir() {
                    walk(base, &p, out);
                } else if let Ok(rel) = p.strip_prefix(base) {
                    let size = fs::metadata(&p).map(|m| m.len()).unwrap_or(0);
                    out.push(ModFile {
                        path: rel.to_string_lossy().to_string(),
                        size,
                    });
                }
            }
        }
    }

    walk(&root, &root, &mut out);
    out.sort_by(|a, b| a.path.cmp(&b.path));
    Ok(out)
}

/// 打开 mods 目录
#[tauri::command]
pub fn open_mods_dir(app: tauri::AppHandle) -> Result<String, String> {
    Ok(mods_dir(&app)?.to_string_lossy().to_string())
}
