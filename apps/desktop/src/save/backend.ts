/**
 * 存档持久化桥接层。
 *
 * 三种后端：
 *  - Electron 环境：经 preload 走主进程（AES-256-GCM + HMAC，写入 userData/data/saves）
 *  - 浏览器环境：降级到 localStorage（明文，仅供开发预览）
 *  - 内存：测试用
 *
 * 上层（store）只调用本模块，不关心运行环境。
 *
 * 迁移说明：此前是 Tauri 后端（Rust 侧 save.rs）。切到 Electron 的原因
 * 是 Tauri 产物撞杀软「自解压 + 写文件」特征，误报率高。
 */

export interface SaveBackend {
  readonly kind: "electron" | "localStorage" | "memory";
  save(slot: string, json: string): Promise<string>;
  load(slot: string): Promise<string>;
  list(): Promise<string[]>;
  remove(slot: string): Promise<void>;
}

/** 检测是否运行在 Electron 环境 */
export function isElectron(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as { dh?: { isElectron?: boolean } };
  return !!w.dh?.isElectron;
}

/** Electron 后端（走 preload 暴露的 window.dh.save） */
class ElectronBackend implements SaveBackend {
  readonly kind = "electron" as const;

  private get api() {
    const w = window as unknown as { dh?: {
      save: {
        write(slot: string, json: string): Promise<string>;
        read(slot: string): Promise<string>;
        list(): Promise<Array<{ slot: string }>>;
        remove(slot: string): Promise<boolean>;
      }
    } };
    if (!w.dh?.save) throw new Error("Electron 桥未就绪");
    return w.dh.save;
  }

  async save(slot: string, json: string): Promise<string> {
    return this.api.write(slot, json);
  }

  async load(slot: string): Promise<string> {
    return this.api.read(slot);
  }

  async list(): Promise<string[]> {
    const rows = await this.api.list();
    return rows.map((r) => r.slot);
  }

  async remove(slot: string): Promise<void> {
    await this.api.remove(slot);
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
  if (isElectron()) {
    cached = new ElectronBackend();
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
  return k === "electron" ? "Electron（AES-256-GCM 加密）"
    : k === "localStorage" ? "浏览器 localStorage（明文，仅预览）"
    : "内存（未持久化）";
}
