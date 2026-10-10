/**
 * 性爱行为系统。
 *
 * 设计定位：
 *  - 行为按「部位 × 方式 × 施受方向」三维建模，而非罗列固定招式
 *  - 每个行为有独立的熟练度成长（后宫与主角各自累计）
 *  - 熟练度影响：描写细腻度、体力消耗、欲情效率
 *  - 约束：后宫之间的互动只允许娱乐型扶她药（INV-2）
 *  - 约束：夜袭无拒绝选项（INV-5）
 *
 * 纯函数式。
 */

/** 涉及的身体部位 */
export type ActPart =
  | "mouth"      // 口
  | "vagina"     // 前庭
  | "anus"       // 后庭
  | "hand"       // 手
  | "breast"     // 胸
  | "thigh"      // 腿交
  | "foot"       // 足
  | "tail"       // 尾（如有）
  | "toy";       // 道具

export const PART_LABEL: Record<ActPart, string> = {
  mouth: "口",
  vagina: "前庭",
  anus: "后庭",
  hand: "手",
  breast: "胸",
  thigh: "腿",
  foot: "足",
  tail: "尾",
  toy: "道具"
};

/** 施受方向 */
export type ActDirection =
  | "give"       // 施（主角对对方）
  | "receive"    // 受（对方对主角）
  | "mutual"     // 互相
  | "solo";      // 单人

export const DIRECTION_LABEL: Record<ActDirection, string> = {
  give: "施",
  receive: "受",
  mutual: "互",
  solo: "独"
};

/** 行为定义 */
export interface ActDef {
  id: string;
  name: string;
  part: ActPart;
  direction: ActDirection;
  /** 是否需要主角有对应器官 */
  requiresFutanari?: boolean;
  /** 是否需要对方有对应器官 */
  requiresPartnerFutanari?: boolean;
  /** 体力消耗基数 */
  staminaCost: number;
  /** 欲情效率（对对方的） */
  lustGain: number;
  /** 亲密技能收益 */
  intimacyExp: number;
  /** 前置熟练度（该部位） */
  requiresProficiency: number;
  /** 描写要点，供模型生成 */
  description: string;
  /** 分级：是否属于入门行为 */
  tier: "basic" | "advanced" | "expert";
  /** 是否需要道具 */
  needsToy?: boolean;
}

/** 分级标签 */
export const ACT_TIER_LABEL: Record<ActDef["tier"], string> = {
  basic: "入门",
  advanced: "进阶",
  expert: "高阶"
};

export const ACTS: ActDef[] = [
  // ---- 口 ----
  {
    id: "oral_give", name: "口交（施）", part: "mouth", direction: "give",
    staminaCost: 8, lustGain: 18, intimacyExp: 6, requiresProficiency: 0,
    tier: "basic",
    description: "主角用口为对方服务。注意舌头动作、含入深度、对方的反应。"
  },
  {
    id: "oral_receive", name: "口交（受）", part: "mouth", direction: "receive",
    staminaCost: 4, lustGain: 22, intimacyExp: 6, requiresProficiency: 0,
    tier: "basic",
    description: "对方用口为主角服务。注意主角的克制、对方的口技、视线交流。"
  },
  {
    id: "oral_mutual", name: "互相口交", part: "mouth", direction: "mutual",
    staminaCost: 14, lustGain: 26, intimacyExp: 10, requiresProficiency: 2,
    tier: "advanced",
    description: "双方同时用口。注意姿势的别扭、节奏的互相干扰与配合。"
  },
  {
    id: "deep_throat", name: "深喉", part: "mouth", direction: "give",
    requiresFutanari: true,
    staminaCost: 16, lustGain: 30, intimacyExp: 12, requiresProficiency: 4,
    tier: "advanced",
    description: "全根没入。注意窒息感、眼泪、对方的克制与最终释放。"
  },

  // ---- 前庭 ----
  {
    id: "vaginal_missionary", name: "正面位", part: "vagina", direction: "give",
    requiresFutanari: true,
    staminaCost: 18, lustGain: 24, intimacyExp: 8, requiresProficiency: 0,
    tier: "basic",
    description: "面对面。注意视线交流、体重压迫、腿的位置。"
  },
  {
    id: "vaginal_doggy", name: "背后位", part: "vagina", direction: "give",
    requiresFutanari: true,
    staminaCost: 20, lustGain: 26, intimacyExp: 8, requiresProficiency: 1,
    tier: "basic",
    description: "从背后。注意腰臀曲线、抓握的位置、节奏的深浅。"
  },
  {
    id: "vaginal_ride", name: "骑乘位", part: "vagina", direction: "receive",
    staminaCost: 12, lustGain: 28, intimacyExp: 9, requiresProficiency: 1,
    tier: "basic",
    description: "对方在上。注意对方的主动、主角被压制的感受、重力带来的深度。"
  },
  {
    id: "vaginal_side", name: "侧位", part: "vagina", direction: "give",
    requiresFutanari: true,
    staminaCost: 14, lustGain: 22, intimacyExp: 8, requiresProficiency: 2,
    tier: "advanced",
    description: "侧躺。注意慢节奏、全身贴合、手的自由。"
  },

  // ---- 后庭 ----
  {
    id: "anal_prep", name: "后庭准备", part: "anus", direction: "give",
    staminaCost: 10, lustGain: 12, intimacyExp: 10, requiresProficiency: 0,
    tier: "basic",
    description: "手指与润滑的准备工作。注意耐心、对方的紧张与逐渐放松。"
  },
  {
    id: "anal_give", name: "后庭（施）", part: "anus", direction: "give",
    requiresFutanari: true,
    staminaCost: 24, lustGain: 32, intimacyExp: 14, requiresProficiency: 3,
    tier: "advanced",
    description: "主角进入对方后庭。注意紧致度差异、对方的适应过程、慢进慢出。"
  },
  {
    id: "anal_receive", name: "后庭（受）", part: "anus", direction: "receive",
    staminaCost: 16, lustGain: 34, intimacyExp: 14, requiresProficiency: 3,
    tier: "advanced",
    description: "对方进入主角后庭。注意主角的不适与逐渐适应、对方的克制。"
  },
  {
    id: "anal_play", name: "后庭玩具", part: "anus", direction: "give",
    staminaCost: 12, lustGain: 26, intimacyExp: 12, requiresProficiency: 2,
    tier: "advanced", needsToy: true,
    description: "用玩具开发后庭。注意尺寸递进、对方的反应、视觉呈现。"
  },
  {
    id: "anal_double", name: "双穴同时", part: "anus", direction: "give",
    requiresFutanari: true,
    staminaCost: 30, lustGain: 38, intimacyExp: 18, requiresProficiency: 6,
    tier: "expert", needsToy: true,
    description: "前后同时。注意两种触感的对比、对方的极限、节奏协调。"
  },

  // ---- 手 ----
  {
    id: "hand_give", name: "手活（施）", part: "hand", direction: "give",
    staminaCost: 5, lustGain: 14, intimacyExp: 4, requiresProficiency: 0,
    tier: "basic",
    description: "用手。注意握法、节奏变化、拇指的运用。"
  },
  {
    id: "hand_receive", name: "手活（受）", part: "hand", direction: "receive",
    staminaCost: 3, lustGain: 16, intimacyExp: 4, requiresProficiency: 0,
    tier: "basic",
    description: "对方用手。注意主角的被动感受、对方的技巧。"
  },
  {
    id: "fingering", name: "指入", part: "hand", direction: "give",
    staminaCost: 8, lustGain: 20, intimacyExp: 8, requiresProficiency: 1,
    tier: "basic",
    description: "手指进入。注意寻找敏感点、弯曲的角度、对方的反应。"
  },

  // ---- 胸 ----
  {
    id: "breast_play", name: "胸部爱抚", part: "breast", direction: "give",
    staminaCost: 6, lustGain: 16, intimacyExp: 5, requiresProficiency: 0,
    tier: "basic",
    description: "揉捏与吸吮。注意力度、乳头的反应、对方的喘息。"
  },
  {
    id: "paizuri", name: "胸交", part: "breast", direction: "give",
    requiresFutanari: true,
    staminaCost: 12, lustGain: 24, intimacyExp: 9, requiresProficiency: 3,
    tier: "advanced",
    description: "用胸部夹住。注意乳沟的紧致、润滑、对方低头观看的角度。"
  },
  {
    id: "nipple_focus", name: "乳头专注", part: "breast", direction: "mutual",
    staminaCost: 8, lustGain: 20, intimacyExp: 7, requiresProficiency: 2,
    tier: "advanced",
    description: "同时刺激双方乳头。注意电击般的传导感、连锁反应。"
  },

  // ---- 腿 / 足 ----
  {
    id: "thigh_job", name: "腿交", part: "thigh", direction: "give",
    requiresFutanari: true,
    staminaCost: 10, lustGain: 20, intimacyExp: 7, requiresProficiency: 2,
    tier: "advanced",
    description: "夹在腿间。注意大腿内侧的柔软、润滑、对方的收紧。"
  },
  {
    id: "foot_job", name: "足交", part: "foot", direction: "give",
    requiresFutanari: true,
    staminaCost: 8, lustGain: 18, intimacyExp: 6, requiresProficiency: 3,
    tier: "advanced",
    description: "用足。注意脚趾的灵活、足弓的弧度、俯视的角度。"
  },

  // ---- 道具 ----
  {
    id: "toy_use_partner", name: "对同伴用玩具", part: "toy", direction: "give",
    staminaCost: 8, lustGain: 28, intimacyExp: 10, requiresProficiency: 0,
    tier: "basic", needsToy: true,
    description: "用玩具刺激对方。注意档位变化、对方的失控、旁观者的反应。"
  },
  {
    id: "toy_use_self", name: "对主角用玩具", part: "toy", direction: "receive",
    staminaCost: 6, lustGain: 30, intimacyExp: 10, requiresProficiency: 0,
    tier: "basic", needsToy: true,
    description: "对方用玩具刺激主角。注意主角的被动、对方掌握节奏的支配感。"
  },
  {
    id: "double_dildo", name: "双头龙共用", part: "toy", direction: "mutual",
    staminaCost: 22, lustGain: 34, intimacyExp: 16, requiresProficiency: 4,
    tier: "expert", needsToy: true,
    description: "两端各由一人使用。注意动作的互相牵制、节奏必须同步、谁先撑不住。"
  },
  {
    id: "strap_on_give", name: "穿戴式（施）", part: "toy", direction: "give",
    staminaCost: 20, lustGain: 30, intimacyExp: 14, requiresProficiency: 3,
    tier: "advanced", needsToy: true,
    description: "穿戴式假阳具。注意穿戴者的主动、被进入方的适应、没有肉体感觉的落差。"
  },
  {
    id: "restraint_play", name: "束缚", part: "toy", direction: "give",
    staminaCost: 14, lustGain: 26, intimacyExp: 12, requiresProficiency: 5,
    tier: "expert", needsToy: true,
    description: "用束缚带限制行动。注意信任、无力感、任人摆布的心理。"
  }
];

const ACT_BY_ID = new Map(ACTS.map((a) => [a.id, a]));

export function actDef(id: string): ActDef | undefined {
  return ACT_BY_ID.get(id);
}

/** 按部位筛选 */
export function actsByPart(part: ActPart): ActDef[] {
  return ACTS.filter((a) => a.part === part);
}

/** 按方向筛选 */
export function actsByDirection(d: ActDirection): ActDef[] {
  return ACTS.filter((a) => a.direction === d);
}

/** 按分级筛选 */
export function actsByTier(t: ActDef["tier"]): ActDef[] {
  return ACTS.filter((a) => a.tier === t);
}

// ============ 熟练度 ============

/** 某部位/行为的熟练度记录 */
export interface Proficiency {
  /** 行为 id → 累计次数 */
  counts: Record<string, number>;
  /** 部位 → 熟练度等级 0-10 */
  parts: Partial<Record<ActPart, number>>;
  /** 部位 → 累计经验 */
  partExp: Partial<Record<ActPart, number>>;
}

export function newProficiency(): Proficiency {
  return { counts: {}, parts: {}, partExp: {} };
}

/** 部位熟练度升级阈值 */
export function partExpForLevel(level: number): number {
  return Math.round(30 * Math.pow(1.45, level));
}

/** 熟练度等级 */
export function partLevel(p: Proficiency, part: ActPart): number {
  return p.parts[part] ?? 0;
}

/** 记录一次行为，累计熟练度 */
export function recordAct(
  p: Proficiency, actId: string
): { proficiency: Proficiency; leveledParts: ActPart[] } {
  const def = actDef(actId);
  if (!def) return { proficiency: p, leveledParts: [] };

  const counts = { ...p.counts, [actId]: (p.counts[actId] ?? 0) + 1 };
  const parts = { ...p.parts };
  const partExp = { ...p.partExp };

  let level = parts[def.part] ?? 0;
  let exp = (partExp[def.part] ?? 0) + def.intimacyExp;
  const leveled: ActPart[] = [];

  while (level < 10 && exp >= partExpForLevel(level)) {
    exp -= partExpForLevel(level);
    level++;
    leveled.push(def.part);
  }

  parts[def.part] = level;
  partExp[def.part] = exp;

  return { proficiency: { counts, parts, partExp }, leveledParts: leveled };
}

/** 熟练度对行为的加成（0-1） */
export function proficiencyBonus(p: Proficiency, part: ActPart): number {
  return partLevel(p, part) / 10;
}

/**
 * 判断某行为是否可用。
 * 返回不可用的原因（若可用则 ok 为 true）。
 */
export function canPerform(
  def: ActDef,
  opts: {
    heroFutanari: boolean;
    partnerFutanari: boolean;
    hasToy: boolean;
    proficiency: Proficiency;
    stamina: number;
  }
): { ok: boolean; reason?: string } {
  if (def.requiresFutanari && !opts.heroFutanari) {
    return { ok: false, reason: "主角没有对应器官" };
  }
  if (def.requiresPartnerFutanari && !opts.partnerFutanari) {
    return { ok: false, reason: "对方没有对应器官" };
  }
  if (def.needsToy && !opts.hasToy) {
    return { ok: false, reason: "需要道具" };
  }
  if (opts.stamina < def.staminaCost) {
    return { ok: false, reason: `体力不足（需 ${def.staminaCost}）` };
  }
  const lv = partLevel(opts.proficiency, def.part);
  if (lv < def.requiresProficiency) {
    return { ok: false, reason: `${PART_LABEL[def.part]}熟练度不足（需 ${def.requiresProficiency} 级）` };
  }
  return { ok: true };
}

/** 当前可用行为列表 */
export function availableActs(
  proficiency: Proficiency,
  opts: {
    heroFutanari: boolean;
    partnerFutanari: boolean;
    hasToy: boolean;
    stamina: number;
  }
): Array<{ def: ActDef; usable: boolean; reason?: string }> {
  return ACTS.map((def) => {
    const c = canPerform(def, { ...opts, proficiency });
    return { def, usable: c.ok, reason: c.reason };
  });
}

/** 统计 */
export function actStats(): {
  total: number;
  byPart: Record<string, number>;
  byTier: Record<string, number>;
  basic: number;
  advanced: number;
  expert: number;
} {
  const byPart: Record<string, number> = {};
  const byTier: Record<string, number> = {};
  for (const a of ACTS) {
    byPart[a.part] = (byPart[a.part] ?? 0) + 1;
    byTier[a.tier] = (byTier[a.tier] ?? 0) + 1;
  }
  return {
    total: ACTS.length,
    byPart,
    byTier,
    basic: byTier.basic ?? 0,
    advanced: byTier.advanced ?? 0,
    expert: byTier.expert ?? 0
  };
}

/** 熟练度总览（供 UI） */
export function proficiencySummary(p: Proficiency): Array<{
  part: ActPart;
  label: string;
  level: number;
  exp: number;
  need: number;
  acts: number;
}> {
  const parts: ActPart[] = ["mouth", "vagina", "anus", "hand", "breast", "thigh", "foot", "toy"];
  return parts.map((part) => {
    const level = p.parts[part] ?? 0;
    const exp = p.partExp[part] ?? 0;
    const need = level >= 10 ? 0 : partExpForLevel(level);
    const acts = ACTS.filter((a) => a.part === part)
      .reduce((s, a) => s + (p.counts[a.id] ?? 0), 0);
    return { part, label: PART_LABEL[part], level, exp, need, acts };
  });
}

/** 序列化 */
export interface ProficiencyJSON {
  counts: Record<string, number>;
  parts: Partial<Record<ActPart, number>>;
  partExp: Partial<Record<ActPart, number>>;
}

export function proficiencyToJSON(p: Proficiency): ProficiencyJSON {
  return { counts: { ...p.counts }, parts: { ...p.parts }, partExp: { ...p.partExp } };
}

export function proficiencyFromJSON(j: ProficiencyJSON | null | undefined): Proficiency {
  if (!j) return newProficiency();
  return {
    counts: j.counts ?? {},
    parts: j.parts ?? {},
    partExp: j.partExp ?? {}
  };
}