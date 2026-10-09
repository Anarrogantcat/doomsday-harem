import type { Survival } from "../components.ts";
import { clamp100 } from "../types.ts";

/** 每小时的基础消耗率 */
export interface SurvivalRates {
  hunger: number;
  thirst: number;
  stamina: number;
  energy: number;
}

export const BASE_RATES: SurvivalRates = {
  hunger: 2.2,
  thirst: 2.8,
  stamina: 1.6,
  energy: 1.2
};

/** 活动强度倍率 */
export type Activity = "idle" | "work" | "patrol" | "combat" | "expedition" | "sleep";

export const ACTIVITY_MULT: Record<Activity, SurvivalRates> = {
  idle:       { hunger: 1.0, thirst: 1.0, stamina: 1.0, energy: 1.0 },
  work:       { hunger: 1.5, thirst: 1.6, stamina: 1.8, energy: 1.3 },
  patrol:     { hunger: 1.7, thirst: 1.8, stamina: 2.2, energy: 1.4 },
  combat:     { hunger: 2.2, thirst: 2.4, stamina: 3.0, energy: 1.8 },
  expedition: { hunger: 1.9, thirst: 2.6, stamina: 2.0, energy: 1.5 },
  sleep:      { hunger: 0.6, thirst: 0.6, stamina: -3.0, energy: -4.0 }
};

/**
 * 推进生存属性。hours 为经过的游戏内小时数。
 * 返回新的 Survival（不修改入参）。
 */
export function tickSurvival(s: Survival, hours: number, act: Activity): Survival {
  const r = BASE_RATES;
  const m = ACTIVITY_MULT[act];
  return {
    hunger: clamp100(s.hunger - r.hunger * m.hunger * hours),
    thirst: clamp100(s.thirst - r.thirst * m.thirst * hours),
    stamina: clamp100(s.stamina - r.stamina * m.stamina * hours),
    energy: clamp100(s.energy - r.energy * m.energy * hours),
    mood: s.mood
  };
}

export function eat(s: Survival, nutrition = 40): Survival {
  return { ...s, hunger: clamp100(s.hunger + nutrition), mood: clamp100(s.mood + 2) };
}

export function drink(s: Survival, hydration = 50): Survival {
  return { ...s, thirst: clamp100(s.thirst + hydration) };
}

export function rest(s: Survival, hours: number): Survival {
  return {
    ...s,
    stamina: clamp100(s.stamina + 18 * hours),
    energy: clamp100(s.energy + 20 * hours)
  };
}

/** 归零惩罚判定 */
export function statusOf(s: Survival): string[] {
  const out: string[] = [];
  if (s.hunger <= 0) out.push("饥饿虚弱（战斗失效）");
  if (s.thirst <= 0) out.push("脱水昏厥");
  if (s.stamina <= 0) out.push("无法行动");
  if (s.energy <= 0) out.push("研究速度下降");
  if (s.mood <= 20) out.push("抑郁倾向");
  return out;
}
