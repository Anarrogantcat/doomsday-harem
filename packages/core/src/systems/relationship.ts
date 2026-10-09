import type { Relationship, Lust, Intimacy } from "../components.ts";
import { clamp100 } from "../types.ts";

export const DEFAULT_RELATIONSHIP: Relationship = {
  affection: 0,
  loyalty: 0,
  bond: 1,
  role: "side"
};

export const DEFAULT_LUST: Lust = {
  value: 0,
  daysSinceIntimacy: 0,
  forced: false
};

/**
 * 好感/忠诚只升不降（INV-1）。
 * 负增量一律忽略 —— 任何行为都不得扣减关系数值。
 */
export function gain(r: Relationship, affection = 0, loyalty = 0): Relationship {
  const dAff = Math.max(0, affection);
  const dLoy = Math.max(0, loyalty);
  return {
    ...r,
    affection: clamp100(r.affection + dAff),
    loyalty: clamp100(r.loyalty + dLoy)
  };
}

export function bondUp(r: Relationship): Relationship {
  const next = Math.min(5, r.bond + 1) as Relationship["bond"];
  return { ...r, bond: next };
}

export function loyaltyTier(r: Relationship): { tier: number; bonus: number; desc: string } {
  if (r.loyalty >= 81) return { tier: 4, bonus: 0.30, desc: "任务效率+30%，解锁专属协作" };
  if (r.loyalty >= 61) return { tier: 3, bonus: 0.20, desc: "任务效率+20%，战斗更愿配合" };
  if (r.loyalty >= 31) return { tier: 2, bonus: 0.10, desc: "任务效率+10%，主动分担工作" };
  return { tier: 1, bonus: 0, desc: "基础" };
}

/**
 * 欲情只升不降。每日累积 +3~8（受性格与科技影响）。
 * 返回新状态 + 触发阶段。
 */
export type LustStage = "none" | "hint" | "invite" | "nightRaid" | "forced";

export function tickLust(l: Lust, days: number, dailyGain: number): { lust: Lust; stage: LustStage } {
  const v = clamp100(l.value + dailyGain * days);
  const d = l.daysSinceIntimacy + days;
  let stage: LustStage = "none";
  if (v >= 100) stage = "forced";
  else if (v >= 90 && d >= 10) stage = "nightRaid";
  else if (v >= 80 && d >= 7) stage = "invite";
  else if (v >= 60 && d >= 5) stage = "hint";
  return { lust: { value: v, daysSinceIntimacy: d, forced: stage === "forced" }, stage };
}

/** 被满足：欲情清零，好感+3，忠诚+2 */
export function satisfy(r: Relationship, l: Lust, kind: "accept" | "raid" | "active" | "multi") {
  const table = {
    accept: { aff: 3, loy: 2 },
    raid:   { aff: 3, loy: 2 },
    active: { aff: 5, loy: 3 },
    multi:  { aff: 2, loy: 1 }
  } as const;
  const t = table[kind];
  return {
    relationship: gain(r, t.aff, t.loy),
    lust: { ...l, value: 0, daysSinceIntimacy: 0, forced: false } as Lust
  };
}

/** 拒绝主动邀约：好感不变，欲情继续累积，忠诚不变 */
export function refuse(l: Lust): Lust {
  return { ...l, value: clamp100(l.value + 10) };
}

/** 后宫两两亲密度 */
export function intimacyUp(i: Intimacy, otherId: string, amount: number): Intimacy {
  const cur = i.with[otherId] ?? 0;
  return { ...i, with: { ...i.with, [otherId]: clamp100(cur + amount) } };
}

export function intimacyStage(i: Intimacy, otherId: string): string {
  const v = i.with[otherId] ?? 0;
  if (v >= 80) return "恋人";
  if (v >= 60) return "亲密";
  if (v >= 30) return "友好";
  return "陌生";
}
