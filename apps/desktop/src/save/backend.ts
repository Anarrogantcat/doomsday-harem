/**
 * 存档持久化桥接层。
 *
 * 两种后端：
 *  - Tauri 环境：invoke 调用 Rust 侧（AES-256-GCM + HMAC，写入 app_data/saves）
 *  - 浏览器环境：降级到 localStorage（明文，仅供开发预览）
 *
 * 上层（store）只调用本模块，不关心运行环境。
 */

export interface SaveBackend {
  readonly kind: "tauri" | "localStorage" | "memory";
  save(slot: string, json: string): Promise<string>;
  load(slot: string): Promise<string>;
  list(): Promise<string[]>;
  remove(slot: string): Promise<void>;
}

/** 检测是否运行在 Tauri 环境 */
export function isTauri(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as Record<string, unknown>;
  return "__TAURI_INTERNALS__" in w || "__TAURI__" in w;
}

/** Tauri 后端 */
class TauriBackend implements SaveBackend {
  readonly kind = "tauri" as const;

  private async invoke<T>(cmd: string, args: Record<string, unknown>): Promise<T> {
    const mod = await import("@tauri-apps/api/core");
    return mod.invoke<T>(cmd, args);
  }

  async save(slot: string, json: string): Promise<string> {
    return this.invoke<string>("save_game", { slot, json });
  }

  async load(slot: string): Promise<string> {
    return this.invoke<string>("load_game", { slot });
  }

  async list(): Promise<string[]> {
    return this.invoke<string[]>("list_saves", {});
  }

  async remove(slot: string): Promise<void> {
    await this.invoke<void>("delete_save", { slot });
  }
}

/** localStorage 后端（浏览器开发预览用） */
class LocalStorageBackend implements SaveBackend {
  readonly kind = "localStorage" as const;
  private prefix = "doomsday-harem:save:";

  async save(slot: string, json: string): Promise<string> {
    localStorage.setItem(this.prefix + slot, json);
    return this.prefix + slot;
  }

  async load(slot: string): Promise<string> {
    const v = localStorage.getItem(this.prefix + slot);
    if (v === null) throw new Error(`存档不存在：${slot}`);
    return v;
  }

  async list(): Promise<string[]> {
    const out: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(this.prefix)) out.push(k.slice(this.prefix.length));
    }
    return out.sort();
  }

  async remove(slot: string): Promise<void> {
    localStorage.removeItem(this.prefix + slot);
  }
}

/** 内存后端（测试用） */
class MemoryBackend implements SaveBackend {
  readonly kind = "memory" as const;
  private store = new Map<string, string>();

  async save(slot: string, json: string): Promise<string> {
    this.store.set(slot, json);
    return slot;
  }

  async load(slot: string): Promise<string> {
    const v = this.store.get(slot);
    if (v === undefined) throw new Error(`存档不存在：${slot}`);
    return v;
  }

  async list(): Promise<string[]> {
    return [...this.store.keys()].sort();
  }

  async remove(slot: string): Promise<void> {
    this.store.delete(slot);
  }
}

let cached: SaveBackend | null = null;

/** 获取当前环境的后端 */
export function getBackend(): SaveBackend {
  if (cached) return cached;
  if (isTauri()) {
    cached = new TauriBackend();
  } else if (typeof localStorage !== "undefined") {
    cached = new LocalStorageBackend();
  } else {
    cached = new MemoryBackend();
  }
  return cached;
}

/** 强制指定后端（测试用） */
export function setBackend(b: SaveBackend): void {
  cached = b;
}

export function newMemoryBackend(): SaveBackend {
  return new MemoryBackend();
}

/** 环境描述，供 UI 显示 */
export function backendLabel(): string {
  const k = getBackend().kind;
  return k === "tauri" ? "Tauri（AES-256-GCM 加密）"
    : k === "localStorage" ? "浏览器 localStorage（明文，仅预览）"
    : "内存（未持久化）";
}
