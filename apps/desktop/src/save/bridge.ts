/**
 * 桌面后端桥接 —— 数据目录与 Mod 加载。
 *
 * 支持两种宿主（迁移期并存）：
 *   1. Electron（当前）—— window.dh.*，见 apps/desktop/electron/preload.cjs
 *   2. Tauri（旧）     —— @tauri-apps/api 的 invoke
 *
 * 迁移原因：Tauri 产物是「Rust 外壳 + 运行时自解压」，
 * 撞杀软高危特征；Electron 的 asar 结构误报率低。
 *
 * 浏览器环境下降级为空实现，便于开发预览。
 */
import { bridge as electronBridge } from "./electronBridge.ts";

export interface DataLayout {
  root: string;
  saves: string;
  config: string;
  mods: string;
  logs: string;
  /** 是否使用游戏安装目录（便携模式） */
  portable: boolean;
}

export interface ModContents {
  scripts: number;
  data: number;
  assets: number;
}

export interface ModEntry {
  id: string;
  path: string;
  enabled: boolean;
  manifest: Record<string, unknown> | null;
  contents: ModContents;
  error: string | null;
}

export interface ModFile {
  path: string;
  size: number;
}

/** 是否运行在 Electron 环境 */
export function isElectronEnv(): boolean {
  return typeof window !== "undefined" && !!electronBridge;
}

/** 是否运行在 Tauri 环境（旧宿主，迁移期保留） */
/** Tauri 环境检测（迁移后恒为 false，保留以兼容调用点） */
export function isTauriEnv(): boolean {
  return false;
}

/** 是否运行在任一桌面宿主内 */
export function isDesktopEnv(): boolean {
  return isElectronEnv() || isTauriEnv();
}

/** Tauri 已移除 —— 保留此函数仅为兼容旧分支的编译通过 */
async function invoke<T>(_cmd: string, _args: Record<string, unknown> = {}): Promise<T> {
  throw new Error("Tauri 后端已移除，请使用 Electron");
}

/** 获取数据目录布局 */
export async function getDataLayout(): Promise<DataLayout | null> {
  // Electron：主进程 data:layout
  if (electronBridge) {
    try {
      const l = await electronBridge.data.layout();
      return {
        root: l.dataRoot,
        saves: l.saves,
        config: l.dataRoot,
        mods: l.mods,
        logs: l.logs,
        portable: false
      };
    } catch {
      return null;
    }
  }
  if (!isTauriEnv()) {
    return {
      root: "（浏览器预览，无真实目录）",
      saves: "localStorage",
      config: "localStorage",
      mods: "（不可用）",
      logs: "（不可用）",
      portable: false
    };
  }
  try {
    return await invoke<DataLayout>("get_data_layout");
  } catch {
    return null;
  }
}

/** 打开数据目录（返回路径；实际打开由系统处理） */
export async function openDataDir(): Promise<string | null> {
  if (!isTauriEnv()) return null;
  try {
    return await invoke<string>("open_data_dir");
  } catch {
    return null;
  }
}

/** 设置自定义数据目录（重启后生效） */
export async function setDataDir(path: string): Promise<{ ok: boolean; message: string }> {
  if (!isTauriEnv()) {
    return { ok: false, message: "浏览器环境不支持自定义数据目录" };
  }
  try {
    const r = await invoke<string>("set_data_dir", { path });
    return { ok: true, message: `已设置为 ${r}（重启后生效）` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

// ============ Mod ============

export async function listMods(): Promise<ModEntry[]> {
  if (!isTauriEnv()) return [];
  try {
    return await invoke<ModEntry[]>("list_mods");
  } catch {
    return [];
  }
}

export async function setModEnabled(id: string, enabled: boolean): Promise<boolean> {
  if (!isTauriEnv()) return false;
  try {
    return await invoke<boolean>("set_mod_enabled", { id, enabled });
  } catch {
    return false;
  }
}

export async function readModFile(id: string, rel: string): Promise<string | null> {
  if (!isTauriEnv()) return null;
  try {
    return await invoke<string>("read_mod_file", { id, rel });
  } catch {
    return null;
  }
}

export async function listModFiles(id: string): Promise<ModFile[]> {
  if (!isTauriEnv()) return [];
  try {
    return await invoke<ModFile[]>("list_mod_files", { id });
  } catch {
    return [];
  }
}

export async function openModsDir(): Promise<string | null> {
  if (!isTauriEnv()) return null;
  try {
    return await invoke<string>("open_mods_dir");
  } catch {
    return null;
  }
}

/**
 * 加载全部已启用 Mod 的剧本。
 * 返回 DSL 文本，可直接喂给 loadScripts。
 */
export async function loadModScripts(): Promise<Array<{ modId: string; file: string; text: string }>> {
  const mods = await listMods();
  const out: Array<{ modId: string; file: string; text: string }> = [];

  for (const m of mods) {
    if (!m.enabled) continue;
    const files = await listModFiles(m.id);
    for (const f of files) {
      if (!f.path.endsWith(".dsl")) continue;
      const text = await readModFile(m.id, f.path);
      if (text) out.push({ modId: m.id, file: f.path, text });
    }
  }

  return out;
}

/** 环境能力探测 */
export function capabilities(): { tauri: boolean; dataDir: boolean; mods: boolean } {
  const t = isTauriEnv();
  return { tauri: t, dataDir: t, mods: t };
}
