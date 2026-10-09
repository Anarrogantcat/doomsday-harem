/**
 * 存档管理系统。
 *
 * 设计：
 *  - 多槽位：手动存档 × 10 + 自动存档 × 3 + 快速存档 × 1
 *  - 每个槽位记录元数据（时间、进度摘要、作弊标记）
 *  - 实际读写由 Tauri 侧（AES-256-GCM）或 Node 侧（测试）完成
 *  - 本模块只管槽位语义与校验，不碰 IO
 *
 * 纯函数式。
 */
import type { SaveData } from "./serialize.ts";
import { contentChecksum, wrap, unwrap, checkInvariants, type SaveEnvelope } from "./serialize.ts";
import { SCHEMA_VERSION, VERSION } from "../version.ts";

export type SlotKind = "manual" | "auto" | "quick";

export interface SlotMeta {
  slot: string;
  kind: SlotKind;
  /** 游戏内时间 */
  day: number;
  minute: number;
  /** 真实时间戳 */
  savedAt: string;
  /** 进度摘要 */
  summary: {
    companions: number;
    techUnlocked: number;
    baseBuilt: number;
    questsCompleted: number;
    offspring: number;
    region: string;
  };
  /** 作弊标记 */
  cheatBadge: string | null;
  /** 存档结构版本 */
  schemaVersion: number;
  /** 游戏版本 */
  version: string;
  /** 完整性校验和 */
  checksum: string;
  /** 存档大小（字节，用于 UI 显示） */
  bytes: number;
}

export interface SlotDef {
  slot: string;
  kind: SlotKind;
  label: string;
}

export const MANUAL_SLOTS = 10;
export const AUTO_SLOTS = 3;

/** 生成全部槽位定义 */
export function allSlots(): SlotDef[] {
  const out: SlotDef[] = [];
  for (let i = 1; i <= MANUAL_SLOTS; i++) {
    out.push({ slot: `manual${i}`, kind: "manual", label: `存档 ${i}` });
  }
  for (let i = 1; i <= AUTO_SLOTS; i++) {
    out.push({ slot: `auto${i}`, kind: "auto", label: `自动存档 ${i}` });
  }
  out.push({ slot: "quick", kind: "quick", label: "快速存档" });
  return out;
}

export function slotDef(slot: string): SlotDef | undefined {
  return allSlots().find((s) => s.slot === slot);
}

export function slotKind(slot: string): SlotKind | null {
  return slotDef(slot)?.kind ?? null;
}

/** 自动存档轮换：返回应写入的槽位 */
export function nextAutoSlot(existing: SlotMeta[]): string {
  const autos = existing.filter((m) => m.kind === "auto").sort((a, b) => {
    return new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime();
  });
  if (autos.length < AUTO_SLOTS) {
    // 还有空位
    for (let i = 1; i <= AUTO_SLOTS; i++) {
      const slot = `auto${i}`;
      if (!autos.some((m) => m.slot === slot)) return slot;
    }
  }
  // 覆盖最旧的
  return autos[0].slot;
}

/** 从 SaveData 提取元数据 */
export function metaFrom(data: SaveData, savedAt = new Date().toISOString()): Omit<SlotMeta, "slot" | "kind" | "bytes"> {
  const heroes = data.entities.filter((e) => e.kind === "hero");
  const companions = data.entities.filter((e) => e.kind === "companion" || e.kind === "ai");
  const flags = data.flags ?? {};

  const offspring = Array.isArray(flags["offspring"]) ? (flags["offspring"] as unknown[]).length : 0;
  const baseBuilt = data.entities.length > 0 && flags["base"]
    ? ((flags["base"] as { facilities?: Array<{ tier: number }> }).facilities ?? []).filter((f) => f.tier > 0).length
    : 0;
  const questsCompleted = flags["quests"]
    ? Object.values(flags["quests"] as Record<string, { completed?: boolean }>).filter((q) => q?.completed).length
    : 0;
  const region = typeof flags["world"] === "object" && flags["world"] !== null
    ? String((flags["world"] as { current?: string }).current ?? "home")
    : "home";

  void heroes;

  return {
    day: data.time.day,
    minute: data.time.minute,
    savedAt,
    summary: {
      companions: companions.length,
      techUnlocked: data.tech.filter((t) => t.unlocked).length,
      baseBuilt,
      questsCompleted,
      offspring,
      region
    },
    cheatBadge: data.cheatBadge,
    schemaVersion: data.schemaVersion,
    version: data.version,
    checksum: contentChecksum(data)
  };
}

export interface SaveRequest {
  slot: string;
  data: SaveData;
  /** 存档序列化后的字节数（由调用方提供，用于 UI 显示） */
  bytes?: number;
  savedAt?: string;
}

/** 构造一个待写入的槽位元数据 */
export function buildMeta(req: SaveRequest): SlotMeta {
  const kind = slotKind(req.slot);
  if (!kind) throw new Error(`未知槽位：${req.slot}`);
  const meta = metaFrom(req.data, req.savedAt);
  return {
    slot: req.slot,
    kind,
    ...meta,
    bytes: req.bytes ?? 0
  };
}

export interface LoadResult {
  ok: boolean;
  data?: SaveData;
  /** 校验失败原因 */
  error?: "checksum" | "schema" | "invariant" | "missing";
  violations?: Array<{ code: string; message: string }>;
}

/** 校验并解包存档 */
export function validateAndUnwrap(env: SaveEnvelope | null): LoadResult {
  if (!env) return { ok: false, error: "missing" };

  const { data, ok } = unwrap(env);
  if (!ok) return { ok: false, error: "checksum" };

  if (data.schemaVersion !== SCHEMA_VERSION) {
    return { ok: false, error: "schema" };
  }

  const violations = checkInvariants(data);
  if (violations.length > 0) {
    return { ok: false, error: "invariant", violations, data };
  }

  return { ok: true, data };
}

/** 打包存档（附加元数据到 flags） */
export function packForSave(data: SaveData, slot: string): SaveEnvelope {
  const withSlot: SaveData = {
    ...data,
    version: VERSION,
    flags: { ...data.flags, slot }
  };
  return wrap(withSlot);
}

// ============ 槽位列表管理（内存侧） ============

export interface SlotList {
  metas: SlotMeta[];
}

export function newSlotList(): SlotList {
  return { metas: [] };
}

/** 写入或更新槽位元数据 */
export function upsertMeta(list: SlotList, meta: SlotMeta): SlotList {
  const metas = list.metas.filter((m) => m.slot !== meta.slot);
  metas.push(meta);
  metas.sort((a, b) => {
    // 手动槽按编号，其他按时间倒序
    const ai = allSlots().findIndex((s) => s.slot === a.slot);
    const bi = allSlots().findIndex((s) => s.slot === b.slot);
    return ai - bi;
  });
  return { metas };
}

export function removeMeta(list: SlotList, slot: string): SlotList {
  return { metas: list.metas.filter((m) => m.slot !== slot) };
}

export function getMeta(list: SlotList, slot: string): SlotMeta | undefined {
  return list.metas.find((m) => m.slot === slot);
}

/** 完整槽位视图：已用 + 空位 */
export function slotView(list: SlotList): Array<{ def: SlotDef; meta: SlotMeta | null }> {
  return allSlots().map((def) => ({
    def,
    meta: list.metas.find((m) => m.slot === def.slot) ?? null
  }));
}

/** 统计 */
export function slotStats(list: SlotList): {
  total: number;
  used: number;
  byKind: Record<SlotKind, { used: number; total: number }>;
  latest: SlotMeta | null;
} {
  const all = allSlots();
  const byKind = {
    manual: { used: 0, total: MANUAL_SLOTS },
    auto: { used: 0, total: AUTO_SLOTS },
    quick: { used: 0, total: 1 }
  } as Record<SlotKind, { used: number; total: number }>;

  for (const m of list.metas) {
    if (byKind[m.kind]) byKind[m.kind].used++;
  }

  const sorted = [...list.metas].sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  );

  return {
    total: all.length,
    used: list.metas.length,
    byKind,
    latest: sorted[0] ?? null
  };
}

/** 时间格式化 */
export function formatSlotTime(meta: SlotMeta): string {
  const h = Math.floor(meta.minute / 60);
  const m = meta.minute % 60;
  const d = new Date(meta.savedAt);
  const real = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `第 ${meta.day} 天 ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}（${real}）`;
}

/** 描述文本 */
export function describeMeta(meta: SlotMeta): string {
  const s = meta.summary;
  const parts = [
    formatSlotTime(meta),
    `同伴 ${s.companions}`,
    `科技 ${s.techUnlocked}`,
    `设施 ${s.baseBuilt}`,
    `主线 ${s.questsCompleted}`
  ];
  if (s.offspring > 0) parts.push(`后代 ${s.offspring}`);
  if (meta.cheatBadge) parts.push(`[${meta.cheatBadge}]`);
  return parts.join("　");
}
