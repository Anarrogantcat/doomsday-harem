/**
 * 生成结果缓存 —— 相同提示词与参数直接复用，避免重复推理。
 * 纯内存 LRU，可选持久化回调（由 app 层接入 SQLite / 文件）。
 */
export interface CacheEntry {
  key: string;
  text: string;
  model: string;
  createdAt: number;
  hits: number;
}

export interface CacheOptions {
  maxEntries?: number;
  /** 存活时间（毫秒），0 表示不过期 */
  ttlMs?: number;
  /** 持久化钩子 */
  onPersist?: (entries: CacheEntry[]) => void;
}

export function cacheKey(
  model: string,
  messages: Array<{ role: string; content: string }>,
  options?: Record<string, unknown>
): string {
  const payload = JSON.stringify({ model, messages, options: options ?? {} });
  let h = 0x811c9dc5;
  for (let i = 0; i < payload.length; i++) {
    h ^= payload.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `${model}:${h.toString(16).padStart(8, "0")}`;
}

export class LlmCache {
  private map = new Map<string, CacheEntry>();
  private max: number;
  private ttl: number;
  private onPersist?: (entries: CacheEntry[]) => void;

  constructor(opt: CacheOptions = {}) {
    this.max = opt.maxEntries ?? 256;
    this.ttl = opt.ttlMs ?? 0;
    this.onPersist = opt.onPersist;
  }

  get(key: string): CacheEntry | null {
    const e = this.map.get(key);
    if (!e) return null;
    if (this.ttl > 0 && Date.now() - e.createdAt > this.ttl) {
      this.map.delete(key);
      return null;
    }
    e.hits++;
    // LRU：命中后移到末尾
    this.map.delete(key);
    this.map.set(key, e);
    return e;
  }

  set(key: string, text: string, model: string): void {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, { key, text, model, createdAt: Date.now(), hits: 0 });
    while (this.map.size > this.max) {
      const oldest = this.map.keys().next().value;
      if (oldest === undefined) break;
      this.map.delete(oldest);
    }
    this.onPersist?.([...this.map.values()]);
  }

  load(entries: CacheEntry[]): void {
    for (const e of entries) {
      this.map.set(e.key, e);
    }
  }

  entries(): CacheEntry[] {
    return [...this.map.values()];
  }

  size(): number {
    return this.map.size;
  }

  clear(): void {
    this.map.clear();
    this.onPersist?.([]);
  }

  /** 统计：命中率 */
  stats(): { size: number; totalHits: number } {
    let totalHits = 0;
    for (const e of this.map.values()) totalHits += e.hits;
    return { size: this.map.size, totalHits };
  }
}
