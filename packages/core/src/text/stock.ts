/**
 * 预生成文本库存的读取层。
 *
 * 库存文件 packages/core/data/generated/h_scenes.json 体积大且按需重建，
 * 因此本模块只提供「查找接口」，实际数据由宿主环境注入：
 *  - Tauri / 桌面：从文件系统读取
 *  - 浏览器：从 fetch 加载
 *  - 测试：直接注入内存对象
 *
 * 查不到时返回 null，上层回退到实时生成或模板骨架。
 */

/** 一条预生成记录 */
export interface GeneratedEntry {
  key: string;
  templateId: string;
  companionIds: string[];
  location: string;
  time: string;
  tier: "minor" | "ambient";
  text: string;
  beatCount: number;
  chars: number;
  model: string;
  latencyMs: number;
}

export interface GeneratedStore {
  generatedAt: string | null;
  model: string;
  entries: GeneratedEntry[];
}

/** 空库存 */
export function emptyStore(): GeneratedStore {
  return { generatedAt: null, model: "", entries: [] };
}

/** 生成 key（与 pregenerate 脚本一致） */
export function entryKey(templateId: string, companionIds: string[]): string {
  return `${templateId}__${companionIds.join("+")}`;
}

/** 库存索引：key → 条目 */
export class StockIndex {
  private byKey = new Map<string, GeneratedEntry>();
  private byTemplate = new Map<string, GeneratedEntry[]>();
  private byCompanion = new Map<string, GeneratedEntry[]>();
  private store: GeneratedStore;

  constructor(store: GeneratedStore = emptyStore()) {
    this.store = store;
    for (const e of store.entries) {
      this.byKey.set(e.key, e);
      const t = this.byTemplate.get(e.templateId) ?? [];
      t.push(e);
      this.byTemplate.set(e.templateId, t);
      for (const c of e.companionIds) {
        const l = this.byCompanion.get(c) ?? [];
        l.push(e);
        this.byCompanion.set(c, l);
      }
    }
  }

  get size(): number {
    return this.byKey.size;
  }

  get meta(): { generatedAt: string | null; model: string } {
    return { generatedAt: this.store.generatedAt, model: this.store.model };
  }

  /** 精确查找 */
  get(templateId: string, companionIds: string[]): GeneratedEntry | null {
    return this.byKey.get(entryKey(templateId, companionIds)) ?? null;
  }

  /** 模糊查找：模板匹配即可，角色顺序不敏感 */
  find(templateId: string, companionIds: string[]): GeneratedEntry | null {
    const exact = this.get(templateId, companionIds);
    if (exact) return exact;

    const candidates = this.byTemplate.get(templateId) ?? [];
    if (candidates.length === 0) return null;

    // 优先角色集合完全一致的
    const wanted = [...companionIds].sort().join("+");
    const same = candidates.find((e) => [...e.companionIds].sort().join("+") === wanted);
    if (same) return same;

    // 其次：包含全部指定角色的
    const contains = candidates.find((e) =>
      companionIds.every((c) => e.companionIds.includes(c))
    );
    if (contains) return contains;

    // 最后：任意一条（保证有内容可用）
    return candidates[0] ?? null;
  }

  /** 某角色的全部库存 */
  forCompanion(companionId: string): GeneratedEntry[] {
    return this.byCompanion.get(companionId) ?? [];
  }

  /** 某模板的全部库存 */
  forTemplate(templateId: string): GeneratedEntry[] {
    return this.byTemplate.get(templateId) ?? [];
  }

  /** 统计 */
  stats(): {
    total: number;
    totalChars: number;
    templates: number;
    companions: number;
    avgChars: number;
    avgLatencyMs: number;
  } {
    const entries = this.store.entries;
    const totalChars = entries.reduce((s, e) => s + (e.chars ?? 0), 0);
    const totalLatency = entries.reduce((s, e) => s + (e.latencyMs ?? 0), 0);
    return {
      total: entries.length,
      totalChars,
      templates: this.byTemplate.size,
      companions: this.byCompanion.size,
      avgChars: entries.length > 0 ? Math.round(totalChars / entries.length) : 0,
      avgLatencyMs: entries.length > 0 ? Math.round(totalLatency / entries.length) : 0
    };
  }

  /** 覆盖某条记录（用于实时生成后回填） */
  put(entry: GeneratedEntry): void {
    this.store.entries.push(entry);
    this.byKey.set(entry.key, entry);
    const t = this.byTemplate.get(entry.templateId) ?? [];
    t.push(entry);
    this.byTemplate.set(entry.templateId, t);
    for (const c of entry.companionIds) {
      const l = this.byCompanion.get(c) ?? [];
      l.push(entry);
      this.byCompanion.set(c, l);
    }
  }

  /** 导出（用于保存回填后的库存） */
  export(): GeneratedStore {
    return { ...this.store, entries: [...this.store.entries] };
  }
}

/** 从 JSON 文本构建索引 */
export function indexFromJson(json: string): StockIndex {
  try {
    const parsed = JSON.parse(json) as GeneratedStore;
    if (!Array.isArray(parsed.entries)) return new StockIndex();
    return new StockIndex(parsed);
  } catch {
    return new StockIndex();
  }
}
