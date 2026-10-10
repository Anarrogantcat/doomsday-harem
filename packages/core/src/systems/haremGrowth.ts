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
    perks: []
  };
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
  totalActs: number;
  births: number;
  perkCount: number;
  topParts: Array<{ label: string; level: number }>;
} {
  const summary = proficiencySummary(g.proficiency)
    .filter((s) => s.level > 0 || s.acts > 0)
    .sort((a, b) => b.level - a.level || b.acts - a.acts);

  return {
    level: growthLevel(g),
    totalActs: g.totalActs,
    births: g.births,
    perkCount: g.perks.length,
    topParts: summary.slice(0, 5).map((s) => ({ label: s.label, level: s.level }))
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
    perks: g.perks.map((p) => ({ ...p }))
  };
}

export function companionGrowthFromJSON(j: CompanionGrowthJSON | null | undefined): CompanionGrowth {
  if (!j) return newCompanionGrowth();
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
    perks: Array.isArray(j.perks) ? j.perks : []
  };
}

/** 统计 */
export function growthStats(): { perkCount: number } {
  return { perkCount: PERK_DEFS.length };
}
