import type { Physiology } from "../components.ts";

/** 受孕概率的各修正项 */
export interface ConceptionInput {
  /** 对方好感 0-100 */
  affection: number;
  /** 对方欲情 0-100 */
  lust: number;
  /** 是否处于排卵期 */
  fertileWindow: boolean;
  /** 用药类型：none 表示主角自身扶她（无需药） */
  medType: "none" | "recreational" | "pregnant";
  /** 科技加成，例如生育调控的促孕 +0.15 */
  techBonus: number;
  /** 0-1 随机数，测试时可注入固定值 */
  roll: number;
}

/** 基础受孕率 8% */
export const BASE_CONCEPTION = 0.08;

/**
 * 计算最终受孕概率。
 * 只有 medType 为 pregnant（后宫让主角受孕）或 none（主角让后宫受孕）才可能受孕。
 * recreational 明确不可受孕。
 */
export function conceptionChance(input: ConceptionInput): number {
  if (input.medType === "recreational") return 0;

  let p = BASE_CONCEPTION;
  p += (input.affection / 100) * 0.12;
  p += (input.lust / 100) * 0.08;
  if (input.fertileWindow) p += 0.10;
  p += input.techBonus;

  return Math.max(0, Math.min(0.95, p));
}

export function tryConceive(input: ConceptionInput): boolean {
  return input.roll < conceptionChance(input);
}

/** 孕期总天数 */
export const GESTATION_DAYS = 30;
/** 产后恢复天数 */
export const RECOVERY_DAYS = 7;

export type PregnancyStage = "none" | "early" | "mid" | "late" | "due";

export interface Pregnancy {
  motherId: string;
  fatherId: string;
  conceivedDay: number;
  progress: number;
  multiple: number;
}

export function startPregnancy(
  motherId: string, fatherId: string, day: number, multiple = 1
): Pregnancy {
  return { motherId, fatherId, conceivedDay: day, progress: 0, multiple };
}

export function pregnancyStage(p: Pregnancy): PregnancyStage {
  if (p.progress <= 0) return "none";
  if (p.progress >= GESTATION_DAYS) return "due";
  if (p.progress >= 21) return "late";
  if (p.progress >= 11) return "mid";
  return "early";
}

/** 各阶段的体力惩罚与行动限制 */
export function pregnancyPenalty(stage: PregnancyStage): { stamina: number; canCombat: boolean; lustGain: number } {
  switch (stage) {
    case "early": return { stamina: 0.10, canCombat: true,  lustGain: 0.5 };
    case "mid":   return { stamina: 0.25, canCombat: true,  lustGain: 1.0 };
    case "late":  return { stamina: 0.45, canCombat: false, lustGain: 1.5 };
    case "due":   return { stamina: 0.60, canCombat: false, lustGain: 2.0 };
    default:      return { stamina: 0,    canCombat: true,  lustGain: 0 };
  }
}

export interface DeliveryResult {
  pregnancy: Pregnancy;
  delivered: boolean;
  offspringCount: number;
}

export function advancePregnancy(p: Pregnancy, days: number): DeliveryResult {
  const progress = p.progress + days;
  if (progress >= GESTATION_DAYS) {
    return {
      pregnancy: { ...p, progress: GESTATION_DAYS },
      delivered: true,
      offspringCount: p.multiple
    };
  }
  return { pregnancy: { ...p, progress }, delivered: false, offspringCount: 0 };
}

/** 后代必然为女性 —— 主角精子只携带 X 染色体（INV-4） */
export interface Offspring {
  id: string;
  name: string;
  motherId: string;
  fatherId: string;
  bornDay: number;
  sex: "female";
  physiology: Physiology;
  /** 16 岁后可加入后宫 */
  maturityDay: number;
}

export function makeOffspring(
  id: string, name: string, motherId: string, fatherId: string, bornDay: number
): Offspring {
  return {
    id,
    name,
    motherId,
    fatherId,
    bornDay,
    sex: "female",
    physiology: {
      sex: "female",
      virgin: true,
      pregnant: false,
      pregnancyProgress: 0,
      fertileWindow: false
    },
    maturityDay: bornDay + 16 * 360
  };
}

export function isMature(o: Offspring, currentDay: number): boolean {
  return currentDay >= o.maturityDay;
}
