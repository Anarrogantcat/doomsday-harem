/**
 * 游戏主循环：把时间、生存、欲情、岗位、科技串成一次 tick。
 * 纯函数，不触碰 IO —— 渲染与持久化由调用方负责。
 */
import type { GameTime, TimeSlot } from "../types.ts";
import { advance, slot } from "../time.ts";
import { tickSurvival, type Activity } from "../systems/survival.ts";
import { tickLust, type LustStage } from "../systems/relationship.ts";
import { tickJob } from "../systems/jobs.ts";
import type { Survival, Lust, Job } from "../components.ts";
import { tickResearch, type TechState } from "../tech/tree.ts";
import { aggregateBonuses } from "../tech/tree.ts";
import { pregnancyPenalty, pregnancyStage, advancePregnancy, type Pregnancy } from "../systems/pregnancy.ts";

export interface TickInput {
  time: GameTime;
  survival: Survival;
  activity: Activity;
  lust: Lust;
  job: Job | null;
  tech: TechState;
  pregnancy: Pregnancy | null;
  /** 科技研究效率倍率（实验室岗位加成） */
  researchRate: number;
  /** 欲情每日增长基数 */
  lustDailyGain: number;
  /** 作弊器：秒完成研究 */
  instantResearch?: boolean;
  /** 作弊器：冻结时间 */
  freezeTime?: boolean;
}

export interface TickOutput {
  time: GameTime;
  slot: TimeSlot;
  survival: Survival;
  lust: Lust;
  lustStage: LustStage;
  job: Job | null;
  tech: TechState;
  completedTech: string | null;
  pregnancy: Pregnancy | null;
  delivered: number;
  warnings: string[];
}

/** 单次 tick。hours 为经过的游戏内小时数。 */
export function tick(input: TickInput, hours: number): TickOutput {
  const bonuses = aggregateBonuses(input.tech);
  const warnings: string[] = [];

  // 1. 时间
  const time = input.freezeTime ? input.time : advance(input.time, Math.round(hours * 60));
  const s = slot(time);

  // 2. 怀孕惩罚：降低体力并可能禁止战斗
  const preg = input.pregnancy;
  const stage = preg ? pregnancyStage(preg) : "none";
  const pen = pregnancyPenalty(stage);
  if (!pen.canCombat && input.activity === "combat") {
    warnings.push("孕晚期无法参与战斗，已改为待命");
  }

  // 3. 生存
  const activity: Activity = !pen.canCombat && input.activity === "combat" ? "idle" : input.activity;
  let survival = tickSurvival(input.survival, hours, activity);
  if (pen.stamina > 0) {
    survival = { ...survival, stamina: Math.max(0, survival.stamina - pen.stamina * 100 * (hours / 24)) };
  }
  // 科技加成：体力上限
  if ((bonuses["staminaMax"] ?? 0) > 0) {
    survival = { ...survival, stamina: Math.min(100, survival.stamina * (1 + bonuses["staminaMax"])) };
  }

  // 4. 欲情（每游戏日累积；怀孕会加快）
  // 注意：tickLust 内部会按 days 放大 dailyGain，此处不可再乘一次
  const days = hours / 24;
  const dailyGain = input.lustDailyGain + pen.lustGain;
  const lustTick = tickLust(input.lust, days, dailyGain);
  if (lustTick.stage === "nightRaid") warnings.push("欲情已达夜袭阈值（无拒绝选项）");
  if (lustTick.stage === "forced") warnings.push("欲情溢出，强制触发");

  // 5. 岗位疲劳
  const job = input.job ? tickJob(input.job, days) : null;

  // 6. 科技研究
  const rate = input.researchRate * (1 + (bonuses["tacticsBonus"] ?? 0));
  const res = tickResearch(input.tech, hours, rate, input.instantResearch ?? false);
  if (res.completed) warnings.push(`科技完成：${res.completed}`);

  // 7. 怀孕推进
  let delivered = 0;
  let nextPreg = preg;
  if (preg) {
    const r = advancePregnancy(preg, days);
    nextPreg = r.pregnancy;
    if (r.delivered) {
      delivered = r.offspringCount;
      warnings.push(`分娩完成，产出 ${r.offspringCount} 名女性后代`);
      nextPreg = null;
    }
  }

  return {
    time,
    slot: s,
    survival,
    lust: lustTick.lust,
    lustStage: lustTick.stage,
    job,
    tech: res.state,
    completedTech: res.completed,
    pregnancy: nextPreg,
    delivered,
    warnings
  };
}

/** 快进若干天（用于睡眠/跳过夜晚） */
export function fastForward(input: TickInput, days: number): TickOutput {
  return tick({ ...input, activity: "sleep" }, days * 24);
}
