/**
 * 后宫成长系统。
 *
 * 设计定位：
 *  - 每位同伴独立成长，与主角的成长曲线并行但不同源
 *  - 成长来源：亲密行为熟练度、羁绊等级、岗位经验、怀孕生育
 *  - 同伴**不享受**科技与基地加成（那是主角专属）
 *  - 好感/忠诚/羁绊只升不降（INV-1）
 *
 * 纯函数式。
 */

import {
  type Proficiency, type ActPart, type ActDef,
  newProficiency, recordAct, partLevel, proficiencySummary
} from "./sexActs.ts";

/** 同伴技能（与主角的七技能并行，但只有部分） */
export interface CompanionSkill {
  id: string;
  name: string;
  level: number;
  exp: number;
  description: string;
}

/** 同伴可训练的技能 */
export const COMPANION_SKILL_DEFS: Array<{ id: string; name: string; description: string }> = [
  { id: "combat", name: "战斗", description: "参战时的攻击与防御" },
  { id: "scavenge", name: "搜刮", description: "外出搜集物资的效率" },
  { id: "craft", name: "制作", description: "协助合成与改装的效率" },
  { id: "medical", name: "医护", description: "治疗他人与自我恢复" },
  { id: "cooking", name: "烹饪", description: "食物产出与心情提升" },
  { id: "charm", name: "魅力", description: "影响主角的欲情与招募" }
];

/** 同伴成长状态 */
export interface CompanionGrowth {
  /** 亲密熟练度（按部位） */
  proficiency: Proficiency;
  /** 岗位经验（按岗位 id） */
  jobExp: Record<string, number>;
  /** 累计亲密次数 */
  totalActs: number;
  /** 累计生育次数 */
  births: number;
  /** 解锁的专属行为（由羁绊与熟练度决定） */
  unlockedActs: string[];
  /** 被动增益（由成长累积） */
  perks: CompanionPerk[];

  // ---- 扩展维度 ----

  /** 技能等级（6 项） */
  skills: CompanionSkill[];
  /** 等级（由总经验换算） */
  level: number;
  /** 累计经验 */
  exp: number;
  /** 心情（独立于主角的心情系统，代表该同伴的状态） */
  mood: number;
  /** 体力（用于岗位与战斗） */
  stamina: number;
  /** 体力上限 */
  staminaMax: number;
  /** 亲密度层级（0-5，由羁绊与累计亲密共同决定） */
  intimacyTier: number;
  /** 受过的伤（影响战斗与心情，需治疗） */
  injuries: number;
  /** 累计参与防御的次数 */
  defensesFought: number;
  /** 累计外出次数 */
  expeditions: number;
  /** 训练累计小时 */
  trainingHours: number;
}

/** 被动增益 */
export interface CompanionPerk {
  id: string;
  name: string;
  description: string;
  /** 获得条件描述 */
  condition: string;
}

export const PERK_DEFS: Array<CompanionPerk & { check: (g: CompanionGrowth, ctx: PerkContext) => boolean }> = [
  {
    id: "eager", name: "主动", description: "欲情增长加快 20%", condition: "累计亲密 10 次",
    check: (g) => g.totalActs >= 10
  },
  {
    id: "skilled_mouth", name: "口技娴熟", description: "口部行为效率 +30%", condition: "口部熟练度 5 级",
    check: (g) => partLevel(g.proficiency, "mouth") >= 5
  },
  {
    id: "skilled_anal", name: "后庭适应", description: "后庭行为体力消耗 -30%", condition: "后庭熟练度 5 级",
    check: (g) => partLevel(g.proficiency, "anus") >= 5
  },
  {
    id: "versatile", name: "全能", description: "全部位熟练度加成 +10%", condition: "至少 5 个部位达 3 级",
    check: (g) => {
      const parts: ActPart[] = ["mouth", "vagina", "anus", "hand", "breast", "thigh", "foot", "toy"];
      return parts.filter((p) => partLevel(g.proficiency, p) >= 3).length >= 5;
    }
  },
  {
    id: "devoted", name: "死心塌地", description: "忠诚不再受任何事件影响", condition: "羁绊 5 级且累计亲密 30 次",
    check: (g, ctx) => ctx.bond >= 5 && g.totalActs >= 30
  },
  {
    id: "fertile", name: "易孕", description: "怀孕概率 +25%", condition: "已生育 1 次",
    check: (g) => g.births >= 1
  },
  {
    id: "veteran_worker", name: "熟练工", description: "岗位产出 +20%", condition: "单岗位累计 30 天",
    check: (g) => Object.values(g.jobExp).some((v) => v >= 30)
  },
  {
    id: "insatiable", name: "不知足", description: "夜袭触发阈值降低 15", condition: "累计亲密 50 次",
    check: (g) => g.totalActs >= 50
  }
];

export interface PerkContext {
  bond: number;
  affection: number;
  loyalty: number;
}

export function newCompanionGrowth(): CompanionGrowth {
  return {
    proficiency: newProficiency(),
    jobExp: {},
    totalActs: 0,
    births: 0,
    unlockedActs: [],
    perks: [],
    skills: COMPANION_SKILL_DEFS.map((d) => ({ ...d, level: 0, exp: 0 })),
    level: 1,
    exp: 0,
    mood: 60,
    stamina: 100,
    staminaMax: 100,
    intimacyTier: 0,
    injuries: 0,
    defensesFought: 0,
    expeditions: 0,
    trainingHours: 0
  };
}

/** 同伴升级所需经验 */
export function companionExpForLevel(level: number): number {
  return Math.min(200_000, Math.round(80 * Math.pow(1.32, level - 1)));
}

/** 同伴技能升级所需经验 */
export function companionSkillExp(level: number): number {
  return Math.round(40 * Math.pow(1.38, level));
}

/** 给予同伴经验，可能升级 */
export function gainCompanionExp(
  g: CompanionGrowth, amount: number
): { growth: CompanionGrowth; levelsGained: number } {
  if (amount <= 0) return { growth: g, levelsGained: 0 };

  let level = g.level;
  let exp = g.exp + amount;
  let gained = 0;

  while (level < 99 && exp >= companionExpForLevel(level)) {
    exp -= companionExpForLevel(level);
    level++;
    gained++;
  }

  // 升级提升体力上限
  const staminaMax = g.staminaMax + gained * 5;

  return {
    growth: {
      ...g,
      level,
      exp,
      staminaMax,
      stamina: Math.min(staminaMax, g.stamina + gained * 5)
    },
    levelsGained: gained
  };
}

/** 给予同伴技能经验 */
export function gainCompanionSkillExp(
  g: CompanionGrowth, skillId: string, amount: number
): CompanionGrowth {
  if (amount <= 0) return g;
  return {
    ...g,
    skills: g.skills.map((s) => {
      if (s.id !== skillId || s.level >= 10) return s;
      let level = s.level;
      let exp = s.exp + amount;
      while (level < 10 && exp >= companionSkillExp(level)) {
        exp -= companionSkillExp(level);
        level++;
      }
      return { ...s, level, exp };
    })
  };
}

/** 训练（消耗时间，提升技能与体力上限） */
export function trainCompanion(
  g: CompanionGrowth, hours: number, skillId: string
): CompanionGrowth {
  let next = { ...g, trainingHours: g.trainingHours + hours };
  // 每 10 小时给一次技能经验
  const gain = Math.floor(hours / 10) * 15;
  if (gain > 0) next = gainCompanionSkillExp(next, skillId, gain);
  next = gainCompanionExp(next, Math.floor(hours * 1.5)).growth;
  return next;
}

/** 调整心情（只升不降的约束不适用于心情，心情可波动） */
export function adjustMood(g: CompanionGrowth, delta: number): CompanionGrowth {
  return { ...g, mood: Math.max(0, Math.min(100, g.mood + delta)) };
}

/** 消耗体力 */
export function spendStamina(
  g: CompanionGrowth, amount: number
): { growth: CompanionGrowth; ok: boolean } {
  if (g.stamina < amount) return { growth: g, ok: false };
  return { growth: { ...g, stamina: g.stamina - amount }, ok: true };
}

/** 恢复体力（休息） */
export function restCompanion(g: CompanionGrowth, hours: number): CompanionGrowth {
  const heal = Math.floor(hours * 1.2);
  return {
    ...g,
    stamina: Math.min(g.staminaMax, g.stamina + heal),
    mood: Math.min(100, g.mood + Math.floor(hours / 6))
  };
}

/** 记录受伤 */
export function addInjury(g: CompanionGrowth, count = 1): CompanionGrowth {
  return {
    ...g,
    injuries: g.injuries + count,
    mood: Math.max(0, g.mood - 5 * count)
  };
}

/** 治疗 */
export function healInjury(g: CompanionGrowth, amount = 1): CompanionGrowth {
  return { ...g, injuries: Math.max(0, g.injuries - amount) };
}

/** 记录参与防御 */
export function recordDefense(g: CompanionGrowth): CompanionGrowth {
  const next = { ...g, defensesFought: g.defensesFought + 1 };
  return gainCompanionSkillExp(next, "combat", 12);
}

/** 记录外出 */
export function recordExpedition(g: CompanionGrowth): CompanionGrowth {
  const next = { ...g, expeditions: g.expeditions + 1 };
  return gainCompanionSkillExp(next, "scavenge", 10);
}

/** 计算亲密度层级 */
export function computeIntimacyTier(g: CompanionGrowth, bond: number): number {
  // 由羁绊与累计亲密共同决定
  if (bond >= 5 && g.totalActs >= 50) return 5;
  if (bond >= 5 && g.totalActs >= 25) return 4;
  if (bond >= 4 && g.totalActs >= 15) return 3;
  if (bond >= 3 && g.totalActs >= 8) return 2;
  if (bond >= 2 && g.totalActs >= 3) return 1;
  return 0;
}

export const INTIMACY_TIER_LABEL: Record<number, string> = {
  0: "生疏",
  1: "熟悉",
  2: "亲近",
  3: "依恋",
  4: "深爱",
  5: "归属"
};

/** 刷新亲密度层级 */
export function refreshIntimacyTier(g: CompanionGrowth, bond: number): CompanionGrowth {
  return { ...g, intimacyTier: computeIntimacyTier(g, bond) };
}

/** 技能总等级 */
export function companionSkillTotal(g: CompanionGrowth): number {
  return g.skills.reduce((s, x) => s + x.level, 0);
}

/** 综合战力（用于战斗与展示） */
export function companionPower(g: CompanionGrowth): number {
  return companionSkillTotal(g) * 3
    + g.level * 2
    + g.perks.length * 4
    + g.intimacyTier * 3
    - g.injuries * 5;
}

/**
 * 记录一次亲密行为，更新该同伴的成长。
 * 返回新状态与本次获得的增益。
 */
export function recordIntimacy(
  g: CompanionGrowth, actId: string, ctx: PerkContext
): { growth: CompanionGrowth; leveledParts: ActPart[]; newPerks: CompanionPerk[] } {
  const r = recordAct(g.proficiency, actId);

  const next: CompanionGrowth = {
    ...g,
    proficiency: r.proficiency,
    totalActs: g.totalActs + 1
  };

  // 检查新解锁的增益
  const owned = new Set(g.perks.map((p) => p.id));
  const newPerks: CompanionPerk[] = [];
  for (const def of PERK_DEFS) {
    if (owned.has(def.id)) continue;
    if (def.check(next, ctx)) {
      const perk: CompanionPerk = {
        id: def.id, name: def.name,
        description: def.description, condition: def.condition
      };
      newPerks.push(perk);
      next.perks = [...next.perks, perk];
    }
  }

  return { growth: next, leveledParts: r.leveledParts, newPerks };
}

/** 记录岗位工作日 */
export function recordJobDay(g: CompanionGrowth, jobId: string): CompanionGrowth {
  return {
    ...g,
    jobExp: { ...g.jobExp, [jobId]: (g.jobExp[jobId] ?? 0) + 1 }
  };
}

/** 记录一次生育 */
export function recordBirth(g: CompanionGrowth, ctx: PerkContext): {
  growth: CompanionGrowth; newPerks: CompanionPerk[];
} {
  const next = { ...g, births: g.births + 1 };
  const owned = new Set(g.perks.map((p) => p.id));
  const newPerks: CompanionPerk[] = [];
  for (const def of PERK_DEFS) {
    if (owned.has(def.id)) continue;
    if (def.check(next, ctx)) {
      const perk: CompanionPerk = {
        id: def.id, name: def.name,
        description: def.description, condition: def.condition
      };
      newPerks.push(perk);
      next.perks = [...next.perks, perk];
    }
  }
  return { growth: next, newPerks };
}

/** 是否拥有某增益 */
export function hasPerk(g: CompanionGrowth, perkId: string): boolean {
  return g.perks.some((p) => p.id === perkId);
}

/** 增益带来的倍率（供其他系统查询） */
export function perkMultipliers(g: CompanionGrowth): {
  lustRate: number;
  actEfficiency: number;
  analCost: number;
  jobOutput: number;
  pregnancyChance: number;
  raidThreshold: number;
} {
  return {
    lustRate: hasPerk(g, "eager") ? 1.2 : 1,
    actEfficiency: hasPerk(g, "versatile") ? 1.1 : 1,
    analCost: hasPerk(g, "skilled_anal") ? 0.7 : 1,
    jobOutput: hasPerk(g, "veteran_worker") ? 1.2 : 1,
    pregnancyChance: hasPerk(g, "fertile") ? 1.25 : 1,
    raidThreshold: hasPerk(g, "insatiable") ? -15 : 0
  };
}

/** 综合等级（用于排序与展示） */
export function growthLevel(g: CompanionGrowth): number {
  const parts: ActPart[] = ["mouth", "vagina", "anus", "hand", "breast", "thigh", "foot", "toy"];
  const profSum = parts.reduce((s, p) => s + partLevel(g.proficiency, p), 0);
  return profSum + g.perks.length * 2 + Math.min(20, Math.floor(g.totalActs / 5));
}

/** 成长总览（供 UI） */
export function growthSummary(g: CompanionGrowth): {
  level: number;
  exp: number;
  expNeed: number;
  totalActs: number;
  births: number;
  perkCount: number;
  topParts: Array<{ label: string; level: number }>;
  skillTotal: number;
  mood: number;
  stamina: number;
  staminaMax: number;
  intimacyTier: number;
  intimacyLabel: string;
  injuries: number;
  defensesFought: number;
  expeditions: number;
  trainingHours: number;
  power: number;
} {
  const summary = proficiencySummary(g.proficiency)
    .filter((s) => s.level > 0 || s.acts > 0)
    .sort((a, b) => b.level - a.level || b.acts - a.acts);

  return {
    level: g.level,
    exp: g.exp,
    expNeed: companionExpForLevel(g.level),
    totalActs: g.totalActs,
    births: g.births,
    perkCount: g.perks.length,
    topParts: summary.slice(0, 5).map((s) => ({ label: s.label, level: s.level })),
    skillTotal: companionSkillTotal(g),
    mood: g.mood,
    stamina: g.stamina,
    staminaMax: g.staminaMax,
    intimacyTier: g.intimacyTier,
    intimacyLabel: INTIMACY_TIER_LABEL[g.intimacyTier] ?? "生疏",
    injuries: g.injuries,
    defensesFought: g.defensesFought,
    expeditions: g.expeditions,
    trainingHours: g.trainingHours,
    power: companionPower(g)
  };
}

/** 序列化 */
export interface CompanionGrowthJSON {
  proficiency: ReturnType<typeof import("./sexActs.ts").proficiencyToJSON>;
  jobExp: Record<string, number>;
  totalActs: number;
  births: number;
  unlockedActs: string[];
  perks: CompanionPerk[];
  // 扩展维度（旧存档缺省时补默认值）
  skills?: CompanionSkill[];
  level?: number;
  exp?: number;
  mood?: number;
  stamina?: number;
  staminaMax?: number;
  intimacyTier?: number;
  injuries?: number;
  defensesFought?: number;
  expeditions?: number;
  trainingHours?: number;
}

export function companionGrowthToJSON(g: CompanionGrowth): CompanionGrowthJSON {
  return {
    proficiency: {
      counts: { ...g.proficiency.counts },
      parts: { ...g.proficiency.parts },
      partExp: { ...g.proficiency.partExp }
    },
    jobExp: { ...g.jobExp },
    totalActs: g.totalActs,
    births: g.births,
    unlockedActs: [...g.unlockedActs],
    perks: g.perks.map((p) => ({ ...p })),
    skills: g.skills.map((s) => ({ ...s })),
    level: g.level,
    exp: g.exp,
    mood: g.mood,
    stamina: g.stamina,
    staminaMax: g.staminaMax,
    intimacyTier: g.intimacyTier,
    injuries: g.injuries,
    defensesFought: g.defensesFought,
    expeditions: g.expeditions,
    trainingHours: g.trainingHours
  };
}

export function companionGrowthFromJSON(j: CompanionGrowthJSON | null | undefined): CompanionGrowth {
  const base = newCompanionGrowth();
  if (!j) return base;
  return {
    proficiency: {
      counts: j.proficiency?.counts ?? {},
      parts: j.proficiency?.parts ?? {},
      partExp: j.proficiency?.partExp ?? {}
    },
    jobExp: j.jobExp ?? {},
    totalActs: j.totalActs ?? 0,
    births: j.births ?? 0,
    unlockedActs: j.unlockedActs ?? [],
    perks: Array.isArray(j.perks) ? j.perks : [],
    // 旧存档补默认值
    skills: Array.isArray(j.skills) && j.skills.length > 0 ? j.skills : base.skills,
    level: j.level ?? 1,
    exp: j.exp ?? 0,
    mood: j.mood ?? 60,
    stamina: j.stamina ?? 100,
    staminaMax: j.staminaMax ?? 100,
    intimacyTier: j.intimacyTier ?? 0,
    injuries: j.injuries ?? 0,
    defensesFought: j.defensesFought ?? 0,
    expeditions: j.expeditions ?? 0,
    trainingHours: j.trainingHours ?? 0
  };
}

/** 统计 */
export function growthStats(): { perkCount: number } {
  return { perkCount: PERK_DEFS.length };
}