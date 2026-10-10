/**
 * 存档迁移链。
 *
 * 为什么需要：
 *   SCHEMA_VERSION 现在是 1。未来每次不兼容变更（新增必需字段、
 *   改结构、改语义）都要递增版本号 —— 但**目前没有地方承接旧档**。
 *   读档路径里全是 `?? 默认值` 的散装兜底，加一个字段就要改一处。
 *
 * 这里建立**显式迁移链**：
 *   - 每个版本升级对应一个 migration 函数
 *   - 从旧版到新版**逐级应用**，而不是一步到位
 *   - 每一步只关心「上一版 → 这一版」
 *
 * 这样新增 SCHEMA_VERSION = 2 时，只需：
 *   1) MIGRATIONS.push({ from: 1, to: 2, migrate: ... })
 *   2) version.ts 的 SCHEMA_VERSION 改为 2
 *
 * 纯函数式，不修改入参。
 */

import type { SaveData } from "./serialize.ts";
import { SCHEMA_VERSION } from "../version.ts";

/** 一次版本迁移 */
export interface Migration {
  from: number;
  to: number;
  /** 简述这次迁移做了什么 */
  desc: string;
  /** 迁移函数：接收旧数据，返回新结构的数据 */
  migrate: (data: SaveData) => SaveData;
}

/**
 * 迁移链。
 *
 * 目前为空 —— SCHEMA_VERSION 仍为 1。
 * 下面给出**范例注释**，未来照着加即可。
 *
 * 范例：
 * ```ts
 * {
 *   from: 1, to: 2,
 *   desc: "新增关系服从度字段（L-12 调教）",
 *   migrate: (d) => ({
 *     ...d,
 *     relations: d.relations.map((r) => ({ ...r, submission: 0 }))
 *   })
 * }
 * ```
 */
export const MIGRATIONS: Migration[] = [];

/** 按 from 升序排列的迁移链 */
export function migrationChain(): Migration[] {
  return [...MIGRATIONS].sort((a, b) => a.from - b.from);
}

/** 找到从某个版本出发的下一步迁移 */
export function nextMigration(from: number): Migration | undefined {
  return migrationChain().find((m) => m.from === from);
}

/** 某版本之后要经过几步 */
export function migrationSteps(from: number, to: number = SCHEMA_VERSION): Migration[] {
  const chain = migrationChain();
  const out: Migration[] = [];
  let cur = from;
  // 防止迁移链形成环
  let guard = 0;
  while (cur < to && guard++ < 100) {
    const m = chain.find((x) => x.from === cur);
    if (!m) break;
    out.push(m);
    cur = m.to;
  }
  return out;
}

export interface MigrateResult {
  data: SaveData;
  /** 实际应用的迁移描述 */
  applied: string[];
  /** 是否完整迁移到目标版本 */
  ok: boolean;
  /** 失败原因（链断裂 / 版本倒挂） */
  reason?: string;
}

/**
 * 把存档迁移到目标版本。
 *
 * 关键行为：
 *   - 已经是目标版本 → 原样返回
 *   - 比目标还新 → 拒绝（降级不安全）
 *   - 链断裂 → 返回 ok:false，由调用方决定是否回落到默认值
 */
export function migrateSave(
  data: SaveData,
  target: number = SCHEMA_VERSION
): MigrateResult {
  const from = data.schemaVersion ?? 0;

  if (from === target) {
    return { data, applied: [], ok: true };
  }

  if (from > target) {
    return {
      data,
      applied: [],
      ok: false,
      reason: `存档版本 ${from} 高于当前支持的 ${target}，无法降级`
    };
  }

  const steps = migrationSteps(from, target);
  if (steps.length === 0) {
    return {
      data,
      applied: [],
      ok: false,
      reason: `缺少 ${from} → ${target} 的迁移路径`
    };
  }

  let cur = data;
  const applied: string[] = [];
  for (const s of steps) {
    cur = s.migrate(cur);
    cur = { ...cur, schemaVersion: s.to };
    applied.push(`${s.from} → ${s.to}：${s.desc}`);
  }

  // 链没走到底
  if (cur.schemaVersion !== target) {
    return {
      data: cur,
      applied,
      ok: false,
      reason: `迁移链在 ${cur.schemaVersion} 处中断，未到达 ${target}`
    };
  }

  return { data: cur, applied, ok: true };
}

/**
 * 宽容读取：迁移失败时尽量救回可用数据。
 *
 * 用于「玩家不想丢档」的场景 —— 即使迁移链断了，
 * 也要把能读的字段尽量读出来。
 */
export function migrateSaveLenient(data: SaveData): MigrateResult {
  const r = migrateSave(data);
  if (r.ok) return r;
  // 兜底：把 schemaVersion 强制标记为目标版本，让逐字段的
  // `?? 默认值` 兜底逻辑继续工作
  return {
    data: { ...data, schemaVersion: SCHEMA_VERSION },
    applied: r.applied,
    ok: false,
    reason: (r.reason ?? "") + "（已按宽容模式读取）"
  };
}

/** 迁移链自检：是否有环 / 跳号 / 重复 from */
export function validateMigrationChain(): string[] {
  const out: string[] = [];
  const chain = migrationChain();
  const froms = new Set<number>();
  for (const m of chain) {
    if (m.to <= m.from) out.push(`迁移 ${m.from}→${m.to} 版本未递增`);
    if (froms.has(m.from)) out.push(`重复的起始版本 ${m.from}`);
    froms.add(m.from);
  }
  // 从 1 开始能走到 SCHEMA_VERSION 吗
  if (SCHEMA_VERSION > 1) {
    const steps = migrationSteps(1, SCHEMA_VERSION);
    const reach = steps.length > 0 ? steps[steps.length - 1].to : 1;
    if (reach !== SCHEMA_VERSION) {
      out.push(`从 1 无法走到 ${SCHEMA_VERSION}（最远到 ${reach}）`);
    }
  }
  return out;
}

/** 迁移链概览（供「关于」页展示） */
export function migrationSummary(): {
  current: number;
  steps: number;
  descriptions: string[];
} {
  return {
    current: SCHEMA_VERSION,
    steps: MIGRATIONS.length,
    descriptions: migrationChain().map((m) => `${m.from} → ${m.to}：${m.desc}`)
  };
}
