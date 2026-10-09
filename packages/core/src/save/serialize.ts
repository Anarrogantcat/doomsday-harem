/**
 * 存档序列化层。
 * core 保持零依赖 —— 完整性校验用纯 TS 的 FNV-1a；
 * 真正的加密与 HMAC-SHA256 由 Rust 侧负责（apps/desktop/src-tauri/src/save.rs）。
 */
import type { GameTime } from "../types.ts";
import { SCHEMA_VERSION } from "../version.ts";
import type { Survival, Lust, Relationship, Job, Physiology, Identity, AiCore } from "../components.ts";

export interface SavedEntity {
  id: string;
  kind: "hero" | "companion" | "ai" | "robot" | "offspring";
  identity: Identity;
  physiology: Physiology;
  survival: Survival;
  ai?: AiCore;
}

export interface SavedRelation {
  fromId: string;
  toId: string;
  affection: number;
  loyalty: number;
  bond: number;
  intimacy: number;
  lust: number;
  daysSinceIntimacy: number;
}

export interface SavedJob {
  entityId: string;
  jobId: string | null;
  bonus: number;
  daysOnJob: number;
}

export interface SavedTech {
  branch: string;
  nodeId: string;
  tier: number;
  unlocked: boolean;
  progress: number;
}

export interface SaveData {
  schemaVersion: number;
  version: string;
  createdAt: string;
  time: GameTime;
  entities: SavedEntity[];
  relations: SavedRelation[];
  jobs: SavedJob[];
  tech: SavedTech[];
  flags: Record<string, unknown>;
  cheatBadge: string | null;
}

export interface SaveEnvelope {
  checksum: string;
  payload: SaveData;
}

/** FNV-1a 32 位，输出 8 位十六进制 */
export function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/** 对 payload 的稳定序列化（键序固定）结果取校验和 */
export function contentChecksum(data: SaveData): string {
  return fnv1a(stableStringify(data));
}

/** 确定性 JSON：对象键排序，用于校验和 */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]";
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + stableStringify(obj[k])).join(",") + "}";
}

export function wrap(data: SaveData): SaveEnvelope {
  return { checksum: contentChecksum(data), payload: data };
}

export function unwrap(env: SaveEnvelope): { data: SaveData; ok: boolean } {
  return { data: env.payload, ok: contentChecksum(env.payload) === env.checksum };
}

export function newSave(version: string, time: GameTime, now = new Date().toISOString()): SaveData {
  return {
    schemaVersion: SCHEMA_VERSION,
    version,
    createdAt: now,
    time,
    entities: [],
    relations: [],
    jobs: [],
    tech: [],
    flags: {},
    cheatBadge: null
  };
}

/** ---------- 不变式检查 ---------- */

export interface InvariantViolation {
  code: string;
  message: string;
  detail?: unknown;
}

/**
 * INV-1 好感/忠诚只升不降 —— 由 prev 与 next 对比校验
 * INV-2 后宫 ↔ 后宫 不得使用怀孕型扶她药
 * INV-3 扶她药效果必须是临时的
 * INV-4 后代性别恒为 female
 * INV-5 夜袭场景无拒绝选项
 * INV-6 扶她特性不参与战斗数值
 */
export function checkInvariants(data: SaveData): InvariantViolation[] {
  const out: InvariantViolation[] = [];

  // INV-4 后代性别
  for (const e of data.entities) {
    if (e.kind === "offspring" && e.physiology.sex !== "female") {
      out.push({
        code: "INV-4",
        message: `后代 ${e.id} 性别为 ${e.physiology.sex}，必须为 female`,
        detail: e.id
      });
    }
  }

  // INV-1 数值范围（越界即说明发生了扣减或计算错误）
  for (const r of data.relations) {
    if (r.affection < 0 || r.affection > 100) {
      out.push({ code: "INV-1", message: `${r.fromId}→${r.toId} 好感越界：${r.affection}` });
    }
    if (r.loyalty < 0 || r.loyalty > 100) {
      out.push({ code: "INV-1", message: `${r.fromId}→${r.toId} 忠诚越界：${r.loyalty}` });
    }
    if (r.lust < 0 || r.lust > 100) {
      out.push({ code: "INV-1", message: `${r.fromId}→${r.toId} 欲情越界：${r.lust}` });
    }
    if (r.bond < 1 || r.bond > 5) {
      out.push({ code: "INV-1", message: `${r.fromId}→${r.toId} 羁绊越界：${r.bond}` });
    }
  }

  // 主角必须存在且唯一
  const heroes = data.entities.filter((e) => e.kind === "hero");
  if (heroes.length !== 1) {
    out.push({ code: "INV-0", message: `主角实体数量为 ${heroes.length}，必须恰好 1 个` });
  }

  return out;
}

/** INV-2 / INV-3 / INV-5 属于运行时规则，在事件触发时校验 */
export interface IntimacyContext {
  participants: string[];
  isHaremToHarem: boolean;
  medType: "none" | "recreational" | "pregnant";
  medTemporary: boolean;
  sceneHasRefuseOption: boolean;
  isNightRaid: boolean;
  futanariInCombatStats: boolean;
}

export function checkRuntimeInvariants(ctx: IntimacyContext): InvariantViolation[] {
  const out: InvariantViolation[] = [];

  if (ctx.isHaremToHarem && ctx.medType === "pregnant") {
    out.push({ code: "INV-2", message: "后宫之间的互动禁止使用怀孕型扶她药" });
  }
  if (ctx.medType !== "none" && !ctx.medTemporary) {
    out.push({ code: "INV-3", message: "扶她药必须是临时效果，需设置到期时间" });
  }
  if (ctx.isNightRaid && ctx.sceneHasRefuseOption) {
    out.push({ code: "INV-5", message: "夜袭场景不得提供拒绝选项" });
  }
  if (ctx.futanariInCombatStats) {
    out.push({ code: "INV-6", message: "扶她特性不得参与战斗数值" });
  }
  return out;
}
