/**
 * 主角成长系统。
 *
 * 设计定位（对应需求「身体强化只来自科技树与基地建设，且只作用于主角」）：
 *  - 主角有独立于同伴的成长曲线
 *  - 强化来源只有两类：科技解锁、基地设施
 *  - 无任何超自然来源
 *  - 同伴不享受这些加成
 *
 * 纯函数式。
 */

/** 六维属性 */
export interface HeroAttributes {
  /** 力量：影响近战伤害与负重 */
  strength: number;
  /** 敏捷：影响闪避与行动速度 */
  agility: number;
  /** 体质：影响体力上限与恢复 */
  endurance: number;
  /** 感知：影响搜刮效率与预警 */
  perception: number;
  /** 意志：影响精神抗性与欲情控制 */
  willpower: number;
  /** 魅力：影响招募与关系推进 */
  charisma: number;
}

export const ATTR_LABEL: Record<keyof HeroAttributes, string> = {
  strength: "力量",
  agility: "敏捷",
  endurance: "体质",
  perception: "感知",
  willpower: "意志",
  charisma: "魅力"
};

export const ATTR_DESC: Record<keyof HeroAttributes, string> = {
  strength: "影响近战伤害与负重上限",
  agility: "影响闪避率与移动速度",
  endurance: "影响体力上限与恢复速率",
  perception: "影响搜刮效率与夜袭预警",
  willpower: "影响欲情控制与精神抗性",
  charisma: "影响招募成功率与关系推进"
};

export const ATTR_KEYS: Array<keyof HeroAttributes> = [
  "strength", "agility", "endurance", "perception", "willpower", "charisma"
];

/** 技能等级 */
export interface HeroSkill {
  id: string;
  name: string;
  /** 0-10 */
  level: number;
  /** 累计经验 */
  exp: number;
  description: string;
}

export const SKILL_DEFS: Array<{ id: string; name: string; description: string }> = [
  { id: "melee", name: "近战", description: "使用刀棍等近身武器" },
  { id: "firearm", name: "射击", description: "使用枪械远程武器" },
  { id: "scavenge", name: "搜刮", description: "从废墟中获取物资" },
  { id: "craft", name: "制作", description: "合成物品与改装" },
  { id: "medical", name: "医疗", description: "治疗与手术" },
  { id: "stealth", name: "潜行", description: "避开敌人与危险" },
  { id: "intimacy", name: "亲密", description: "推进关系的效率" }
];

/** 主角成长状态 */
export interface HeroGrowth {
  /** 等级 1-99 */
  level: number;
  /** 当前经验 */
  exp: number;
  /** 六维属性（基础值） */
  attributes: HeroAttributes;
  /** 技能 */
  skills: HeroSkill[];
  /** 可用属性点 */
  points: number;
}

/** 基础属性（未强化） */
export const BASE_ATTRIBUTES: HeroAttributes = {
  strength: 10,
  agility: 10,
  endurance: 10,
  perception: 10,
  willpower: 10,
  charisma: 10
};

/**
 * 每级所需经验。
 *
 * 1→2 需 100，之后每级 ×1.35，但**封顶 50 万** ——
 * 否则 90 级以后的需求会涨到天文数字，实际不可达。
 */
export const EXP_CAP = 500_000;

export function expForLevel(level: number): number {
  return Math.min(EXP_CAP, Math.round(100 * Math.pow(1.35, level - 1)));
}

/** 升级奖励的属性点 */
export function pointsPerLevel(): number {
  return 2;
}

/** 新建成长状态 */
export function newHeroGrowth(): HeroGrowth {
  return {
    level: 1,
    exp: 0,
    attributes: { ...BASE_ATTRIBUTES },
    skills: SKILL_DEFS.map((d) => ({ ...d, level: 0, exp: 0 })),
    points: 0
  };
}

/**
 * 增加经验，可能触发升级。
 * 返回新状态与升级次数。
 */
export function gainExp(g: HeroGrowth, amount: number): { growth: HeroGrowth; levelsGained: number } {
  if (amount <= 0) return { growth: g, levelsGained: 0 };

  let level = g.level;
  let exp = g.exp + amount;
  let gained = 0;

  while (level < 99 && exp >= expForLevel(level)) {
    exp -= expForLevel(level);
    level++;
    gained++;
  }

  return {
    growth: {
      ...g,
      level,
      exp,
      points: g.points + gained * pointsPerLevel()
    },
    levelsGained: gained
  };
}

/** 技能经验阈值 */
export function skillExpForLevel(level: number): number {
  return Math.round(50 * Math.pow(1.4, level));
}

/** 增加技能经验 */
export function gainSkillExp(g: HeroGrowth, skillId: string, amount: number): HeroGrowth {
  if (amount <= 0) return g;
  return {
    ...g,
    skills: g.skills.map((s) => {
      if (s.id !== skillId || s.level >= 10) return s;
      let level = s.level;
      let exp = s.exp + amount;
      while (level < 10 && exp >= skillExpForLevel(level)) {
        exp -= skillExpForLevel(level);
        level++;
      }
      return { ...s, level, exp };
    })
  };
}

/** 花费属性点 */
export function spendPoint(
  g: HeroGrowth,
  attr: keyof HeroAttributes
): { growth: HeroGrowth; ok: boolean; reason?: string } {
  if (g.points <= 0) return { growth: g, ok: false, reason: "没有可用属性点" };
  if (g.attributes[attr] >= 50) return { growth: g, ok: false, reason: "该属性已达上限" };

  return {
    growth: {
      ...g,
      points: g.points - 1,
      attributes: { ...g.attributes, [attr]: g.attributes[attr] + 1 }
    },
    ok: true
  };
}

/**
 * 来自科技与基地的加成。
 *
 * 这是主角强化的**唯一来源** —— 没有超自然、没有天降奇遇。
 */
export interface HeroBonuses {
  attributes: Partial<HeroAttributes>;
  /** 体力上限加成 */
  staminaMax: number;
  /** 负重上限加成 */
  carryBonus: number;
  /** 近战伤害加成 */
  meleeBonus: number;
  /** 闪避加成 */
  dodgeBonus: number;
  /** 搜刮效率加成（倍率） */
  scavengeMult: number;
  /** 研究效率加成（倍率） */
  researchMult: number;
  /** 夜袭预警加成 */
  alertBonus: number;
}

export function emptyBonuses(): HeroBonuses {
  return {
    attributes: {},
    staminaMax: 0,
    carryBonus: 0,
    meleeBonus: 0,
    dodgeBonus: 0,
    scavengeMult: 1,
    researchMult: 1,
    alertBonus: 0
  };
}

/** 最终属性 = 基础 + 加点 + 科技/基地加成 */
export function effectiveAttributes(g: HeroGrowth, b: HeroBonuses): HeroAttributes {
  const out = { ...g.attributes };
  for (const k of ATTR_KEYS) {
    out[k] = g.attributes[k] + (b.attributes[k] ?? 0);
  }
  return out;
}

/** 属性总和（用于展示「战力」） */
export function attributeTotal(a: HeroAttributes): number {
  return ATTR_KEYS.reduce((s, k) => s + a[k], 0);
}

/** 技能总等级 */
export function skillTotal(g: HeroGrowth): number {
  return g.skills.reduce((s, x) => s + x.level, 0);
}

/** 升级进度 0-1 */
export function levelProgress(g: HeroGrowth): number {
  if (g.level >= 99) return 1;
  const need = expForLevel(g.level);
  return need > 0 ? Math.min(1, g.exp / need) : 0;
}

/** 描述当前成长状态 */
export function describeGrowth(g: HeroGrowth, b: HeroBonuses): string {
  const attrs = effectiveAttributes(g, b);
  const lines = [
    `等级 ${g.level}　经验 ${g.exp}/${expForLevel(g.level)}`,
    `可用属性点 ${g.points}`,
    "",
    ...ATTR_KEYS.map((k) => {
      const base = g.attributes[k];
      const bonus = b.attributes[k] ?? 0;
      return `${ATTR_LABEL[k]}　${attrs[k]}${bonus > 0 ? `（${base}+${bonus}）` : ""}`;
    }),
    "",
    ...g.skills.map((s) => `${s.name}　Lv${s.level}${s.level < 10 ? `（${s.exp}/${skillExpForLevel(s.level)}）` : ""}`)
  ];
  return lines.join("\n");
}

/** 序列化 */
export interface HeroGrowthJSON {
  level: number;
  exp: number;
  attributes: HeroAttributes;
  skills: HeroSkill[];
  points: number;
}

export function growthToJSON(g: HeroGrowth): HeroGrowthJSON {
  return {
    level: g.level,
    exp: g.exp,
    attributes: { ...g.attributes },
    skills: g.skills.map((s) => ({ ...s })),
    points: g.points
  };
}

export function growthFromJSON(j: HeroGrowthJSON | null | undefined): HeroGrowth {
  if (!j) return newHeroGrowth();
  return {
    level: j.level ?? 1,
    exp: j.exp ?? 0,
    attributes: { ...BASE_ATTRIBUTES, ...(j.attributes ?? {}) },
    skills: Array.isArray(j.skills) && j.skills.length > 0
      ? j.skills
      : SKILL_DEFS.map((d) => ({ ...d, level: 0, exp: 0 })),
    points: j.points ?? 0
  };
}
