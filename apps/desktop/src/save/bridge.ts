/**
 * Tauri 后端桥接 —— 数据目录与 Mod 加载。
 *
 * 与 save/backend.ts 分开：
 *  - backend.ts 负责存档读写（Tauri / localStorage / 内存三后端）
 *  - 本模块负责数据目录查询与 Mod 加载（仅 Tauri 可用）
 *
 * 浏览器环境下降级为空实现，便于开发预览。
 */

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

/** 是否运行在 Tauri 环境 */
export function isTauriEnv(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as Record<string, unknown>;
  return "__TAURI_INTERNALS__" in w || "__TAURI__" in w;
}

async function invoke<T>(cmd: string, args: Record<string, unknown> = {}): Promise<T> {
  const mod = await import("@tauri-apps/api/core");
  return mod.invoke<T>(cmd, args);
}

/** 获取数据目录布局 */
export async function getDataLayout(): Promise<DataLayout | null> {
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
