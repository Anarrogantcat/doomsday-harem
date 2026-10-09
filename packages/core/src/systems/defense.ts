/**
 * 防御与事件系统。
 *
 * 设计（对应设定）：
 *  - 防御设施由 base.ts 提供（围墙/壕沟/掩体/哨戒枪/炮塔/无人机/护盾）
 *  - 本模块负责「夜间遇袭」的判定与结算
 *  - 事件类型：野兽 / 零星丧尸 / 丧尸潮 / 匪帮突袭 / 变异兽 /
 *    军方残部 / 全面围攻
 *  - 防御等级由设施加成 + 同伴巡逻 + AI 监控共同决定
 *  - 失败有代价：同伴受伤、物资损失、被掳走（后续营救任务）
 *
 * 纯函数式，不触碰 IO。
 */

/** 事件类型 */
export type RaidKind =
  | "wildlife"      // 野兽侵扰
  | "strays"        // 零星丧尸
  | "wanderers"     // 流浪者乞讨
  | "scouts"        // 侦察者
  | "horde"         // 丧尸潮
  | "bandits"       // 匪帮突袭
  | "mutant"        // 变异兽
  | "military"      // 军方残部
  | "siege";        // 全面围攻

export const RAID_LABEL: Record<RaidKind, string> = {
  wildlife: "野兽侵扰",
  strays: "零星丧尸",
  wanderers: "流浪者乞讨",
  scouts: "侦察者",
  horde: "丧尸潮",
  bandits: "匪帮突袭",
  mutant: "变异兽",
  military: "军方残部",
  siege: "全面围攻"
};

export interface RaidDef {
  kind: RaidKind;
  /** 最低天数要求 */
  minDay: number;
  /** 触发基础权重 */
  weight: number;
  /** 敌人强度 0-100 */
  strength: number;
  /** 敌人数量范围 */
  count: [number, number];
  /** 是否可谈判（非战斗解决） */
  negotiable: boolean;
  /** 是否可被威慑（防御足够高时自动退去） */
  deterrable: boolean;
  /** 描述 */
  description: string;
  /** 突破后果描述 */
  breachConsequence: string;
}

export const RAIDS: RaidDef[] = [
  {
    kind: "wildlife", minDay: 1, weight: 30, strength: 10, count: [1, 3],
    negotiable: false, deterrable: true,
    description: "狼群在围墙外徘徊，被灯光惊到但没有离开。",
    breachConsequence: "同伴受轻伤，心情下降"
  },
  {
    kind: "strays", minDay: 3, weight: 40, strength: 20, count: [3, 8],
    negotiable: false, deterrable: true,
    description: "几只游荡的丧尸闻到气味，朝围墙走来。",
    breachConsequence: "消耗弹药，围墙需修补"
  },
  {
    kind: "wanderers", minDay: 5, weight: 25, strength: 5, count: [2, 5],
    negotiable: true, deterrable: false,
    description: "山道下有人喊话，说只想要点水和吃的。",
    breachConsequence: "名声下降，可能引来更多人"
  },
  {
    kind: "scouts", minDay: 10, weight: 20, strength: 15, count: [1, 3],
    negotiable: false, deterrable: false,
    description: "远处有人用望远镜观察你的据点，被发现后撤走了。",
    breachConsequence: "数日后可能引来匪帮"
  },
  {
    kind: "horde", minDay: 25, weight: 35, strength: 55, count: [20, 50],
    negotiable: false, deterrable: false,
    description: "黑压压的一片从公路方向涌来，是丧尸潮。",
    breachConsequence: "外围防线可能被冲破，进入安全屋战斗"
  },
  {
    kind: "bandits", minDay: 35, weight: 30, strength: 60, count: [8, 15],
    negotiable: true, deterrable: true,
    description: "一队武装匪徒有战术地接近，有人负责掩护有人负责突进。",
    breachConsequence: "同伴可能被掳走，需要后续营救"
  },
  {
    kind: "mutant", minDay: 50, weight: 20, strength: 80, count: [1, 2],
    negotiable: false, deterrable: false,
    description: "一只体型异常的变异兽撞碎了外围拒马。",
    breachConsequence: "围墙被毁，至少需主角亲自迎战"
  },
  {
    kind: "military", minDay: 80, weight: 15, strength: 90, count: [6, 12],
    negotiable: true, deterrable: false,
    description: "一支全副武装的小队要求征用你的避难所。",
    breachConsequence: "正面冲突损失极大，可选择谈判"
  },
  {
    kind: "siege", minDay: 110, weight: 10, strength: 100, count: [30, 60],
    negotiable: false, deterrable: false,
    description: "联合起来的掠夺者与匪帮，从三个方向同时压上来。",
    breachConsequence: "一旦突破，避难所会被洗劫"
  }
];

const BY_KIND = new Map(RAIDS.map((x) => [x.kind, x]));

export function raidDef(kind: RaidKind): RaidDef | undefined {
  return BY_KIND.get(kind);
}

/** 可用事件（按天数过滤） */
export function availableRaids(day: number): RaidDef[] {
  return RAIDS.filter((r) => day >= r.minDay);
}

// ============ 防御等级 ============

export interface DefenseInput {
  /** 设施提供的防御值 */
  facilityDefense: number;
  /** 预警值（瞭望哨 + AI 监控） */
  earlyWarning: number;
  /** 掩体值 */
  cover: number;
  /** 自动火力（哨戒枪 + 炮塔 + 无人机） */
  autoFire: number;
  /** 护盾值 */
  shield: number;
  /** 巡逻同伴的加成总和 */
  patrolBonus: number;
  /** 在岗同伴数（可参与防御） */
  defenders: number;
  /** 主角战斗属性加成 */
  heroBonus: number;
}

export interface DefenseLevel {
  /** 综合防御力 */
  total: number;
  /** 等级 1-5 */
  tier: 1 | 2 | 3 | 4 | 5;
  /** 等级标签 */
  label: string;
  /** 安全指数 0-100 */
  safety: number;
  /** 夜间遇袭基础概率 */
  raidChance: number;
  /** 可抵御的事件上限强度 */
  withstand: number;
  breakdown: Record<string, number>;
}

const TIER_LABEL: Record<number, string> = {
  1: "基础", 2: "初级", 3: "中级", 4: "高级", 5: "要塞级"
};

/** 计算防御等级 */
export function defenseLevel(input: DefenseInput): DefenseLevel {
  const breakdown: Record<string, number> = {
    设施: input.facilityDefense,
    预警: input.earlyWarning * 0.5,
    掩体: input.cover * 0.8,
    自动火力: input.autoFire,
    护盾: input.shield,
    巡逻: input.patrolBonus * 100,
    人手: input.defenders * 8,
    主角: input.heroBonus * 100
  };

  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);

  let tier: DefenseLevel["tier"] = 1;
  if (total >= 400) tier = 5;
  else if (total >= 250) tier = 4;
  else if (total >= 140) tier = 3;
  else if (total >= 60) tier = 2;

  // 安全指数与遇袭概率
  const safety = Math.min(100, Math.round((total / 450) * 100));
  const raidChance = Math.max(0.03, 0.4 - safety * 0.0035);

  // 可抵御强度
  const withstand = Math.round(total * 0.6 + 20);

  return {
    total: Math.round(total),
    tier,
    label: TIER_LABEL[tier],
    safety,
    raidChance,
    withstand,
    breakdown
  };
}

// ============ 事件判定 ============

export interface RaidContext {
  day: number;
  defense: DefenseLevel;
  /** 是否夜间（夜间概率更高） */
  night: boolean;
  /** 名声（越高越容易引来匪帮） */
  reputation: number;
  /** 血腥值（越高越容易引来丧尸） */
  blood: number;
}

export interface RaidEvent {
  kind: RaidKind;
  def: RaidDef;
  count: number;
  /** 敌人实际强度（含随机波动） */
  strength: number;
  /** 是否被威慑退去 */
  deterred: boolean;
  /** 是否可谈判 */
  canNegotiate: boolean;
}

/**
 * 判定今晚是否发生事件。
 * rng 为确定性随机。
 */
export function rollRaid(ctx: RaidContext, rng: () => number): RaidEvent | null {
  // 基础概率
  let chance = ctx.defense.raidChance;
  if (ctx.night) chance *= 1.6;
  chance *= 1 + ctx.blood * 0.002;
  chance *= 1 + ctx.reputation * 0.001;
  chance = Math.min(0.95, chance);

  if (rng() > chance) return null;

  // 按权重选事件类型
  const pool = availableRaids(ctx.day);
  if (pool.length === 0) return null;

  const weights = pool.map((r) => {
    let w = r.weight;
    // 高名声更容易引来匪帮与军方
    if (r.kind === "bandits" || r.kind === "military") w *= 1 + ctx.reputation * 0.003;
    // 高血腥更容易引来丧尸
    if (r.kind === "horde" || r.kind === "strays") w *= 1 + ctx.blood * 0.003;
    return w;
  });

  const totalW = weights.reduce((a, b) => a + b, 0);
  let pick = rng() * totalW;
  let def = pool[0];
  for (let i = 0; i < pool.length; i++) {
    pick -= weights[i];
    if (pick <= 0) { def = pool[i]; break; }
  }

  // 数量
  const span = def.count[1] - def.count[0];
  const count = def.count[0] + Math.floor(rng() * (span + 1));

  // 强度波动 ±15%
  const strength = Math.round(def.strength * (0.85 + rng() * 0.3));

  // 威慑判定
  const deterred = def.deterrable && ctx.defense.total >= strength * 2.2;

  return {
    kind: def.kind,
    def,
    count,
    strength,
    deterred,
    canNegotiate: def.negotiable
  };
}

// ============ 结算 ============

export type RaidOutcome = "repelled" | "breached" | "negotiated" | "deterred" | "retreated";

export const OUTCOME_LABEL: Record<RaidOutcome, string> = {
  repelled: "击退",
  breached: "被突破",
  negotiated: "谈判解决",
  deterred: "威慑退去",
  retreated: "自行撤离"
};

export interface RaidResult {
  outcome: RaidOutcome;
  /** 我方伤亡（同伴受伤数） */
  casualties: number;
  /** 弹药消耗 */
  ammoUsed: number;
  /** 物资损失 */
  lootLost: number;
  /** 围墙破损等级 */
  wallDamage: number;
  /** 是否有人被掳走 */
  captured: string[];
  /** 战利品 */
  spoils: Record<string, number>;
  /** 描述文本 */
  narrative: string;
}

export interface ResolveInput {
  event: RaidEvent;
  defense: DefenseLevel;
  /** 我方战力（主角 + 同伴） */
  power: number;
  /** 可用弹药 */
  ammo: number;
  /** 参与防御的同伴 id 列表 */
  defenders: string[];
  /** 玩家选择的应对：战斗 / 谈判 / 固守 */
  choice: "fight" | "negotiate" | "hold";
}

/** 结算一次夜袭 */
export function resolveRaid(input: ResolveInput, rng: () => number): RaidResult {
  const { event, defense, power, ammo, choice } = input;

  // 威慑退去
  if (event.deterred) {
    return {
      outcome: "deterred",
      casualties: 0, ammoUsed: 0, lootLost: 0, wallDamage: 0, captured: [], spoils: {},
      narrative: `${event.def.description}\n\n你的防御工事让它们停在射程外，徘徊一阵后退走了。`
    };
  }

  // 谈判
  if (choice === "negotiate" && event.canNegotiate) {
    const success = rng() < 0.55 + defense.safety * 0.003;
    if (success) {
      return {
        outcome: "negotiated",
        casualties: 0, ammoUsed: 0, lootLost: Math.round(rng() * 20), wallDamage: 0, captured: [], spoils: {},
        narrative: `${event.def.description}\n\n你用少量物资换来了他们离开。`
      };
    }
    // 谈判失败 → 转为战斗
    return fightItOut(input, rng, true);
  }

  // 固守（不主动出击，依赖工事）
  if (choice === "hold") {
    const holdPower = defense.total * 1.2;
    return fightItOut({ ...input, power: holdPower }, rng, false);
  }

  return fightItOut(input, rng, false);
}

function fightItOut(input: ResolveInput, rng: () => number, negotiationFailed: boolean): RaidResult {
  const { event, defense, power, ammo, defenders } = input;

  // 我方综合战力 = 战力 + 防御工事 + 自动火力
  const myPower = power + defense.total * 0.8 + Math.min(ammo / 10, defense.breakdown["自动火力"] ?? 0);
  const enemyPower = event.strength * (event.count / 10 + 1) * 0.6;

  const ratio = myPower / Math.max(1, enemyPower);

  // 结果判定
  let outcome: RaidOutcome;
  if (ratio >= 1.8) outcome = "repelled";
  else if (ratio >= 1.0) outcome = rng() < 0.7 ? "repelled" : "retreated";
  else if (ratio >= 0.6) outcome = rng() < 0.5 ? "breached" : "retreated";
  else outcome = "breached";

  const ammoUsed = Math.round(Math.min(ammo, event.count * (1 + event.strength / 50)));
  const casualties = outcome === "repelled"
    ? (rng() < 0.3 ? 1 : 0)
    : outcome === "retreated"
    ? Math.floor(rng() * 2)
    : 1 + Math.floor(rng() * Math.max(1, defenders.length));

  const wallDamage = outcome === "repelled" ? (rng() < 0.4 ? 1 : 0)
    : outcome === "retreated" ? 1
    : 2 + Math.floor(rng() * 2);

  // 被掳走：突破且有匪帮类事件时
  const captured: string[] = [];
  if (outcome === "breached" && (event.kind === "bandits" || event.kind === "siege")) {
    const n = Math.min(defenders.length, 1 + Math.floor(rng() * 2));
    for (let i = 0; i < n; i++) captured.push(defenders[i]);
  }

  // 战利品：击退时获得
  const spoils: Record<string, number> = {};
  if (outcome === "repelled") {
    spoils["ammo_9mm"] = Math.round(event.count * 1.5);
    if (rng() < 0.3) spoils["ammo_762"] = Math.round(event.count * 0.5);
    if (rng() < 0.2) spoils["steel_bar"] = Math.round(rng() * 5) + 1;
  }

  const lootLost = outcome === "breached" ? Math.round(rng() * 40) + 10 : 0;

  const lines: string[] = [event.def.description, ""];
  if (negotiationFailed) lines.push("谈判破裂，对方先动了手。");
  if (outcome === "repelled") {
    lines.push(`战斗持续了十几分钟。围墙上的射击孔把火力集中在正面，${RAID_LABEL[event.kind]}被压制在壕沟外。`);
    lines.push("天亮后清点：我方无阵亡，弹药有消耗。");
  } else if (outcome === "retreated") {
    lines.push("对方在付出代价后撤走了，但没有走远。");
    lines.push(event.def.breachConsequence);
  } else {
    lines.push("防线被冲开了。");
    lines.push(event.def.breachConsequence);
    if (captured.length > 0) lines.push(`有 ${captured.length} 名同伴被带走。`);
  }

  return {
    outcome,
    casualties,
    ammoUsed,
    lootLost,
    wallDamage,
    captured,
    spoils,
    narrative: lines.join("\n")
  };
}

/** 手动触发事件（用于测试与作弊器） */
export function forceRaid(kind: RaidKind, day: number): RaidEvent | null {
  const def = raidDef(kind);
  if (!def) return null;
  return {
    kind,
    def,
    count: def.count[0],
    strength: def.strength,
    deterred: false,
    canNegotiate: def.negotiable
  };
}

// ============ 声望与血腥值 ============

export interface ReputationState {
  /** 名声 0-100：越高越容易引来匪帮与军方 */
  reputation: number;
  /** 血腥值 0-100：越高越容易引来丧尸 */
  blood: number;
}

export function newReputation(): ReputationState {
  return { reputation: 10, blood: 5 };
}

/** 战斗后更新 */
export function afterRaid(rep: ReputationState, kind: RaidKind, outcome: RaidOutcome): ReputationState {
  let { reputation, blood } = rep;

  if (outcome === "repelled") {
    reputation = Math.min(100, reputation + 3);
    blood = Math.min(100, blood + 5);
  } else if (outcome === "breached") {
    reputation = Math.max(0, reputation - 5);
    blood = Math.min(100, blood + 15);
  } else if (outcome === "negotiated") {
    reputation = Math.min(100, reputation + 1);
  }

  // 丧尸类事件提升血腥值
  if (kind === "horde" || kind === "strays") blood = Math.min(100, blood + 8);

  return { reputation, blood };
}

/** 每日自然衰减 */
export function decayReputation(rep: ReputationState, days = 1): ReputationState {
  return {
    reputation: Math.max(0, rep.reputation - days * 0.5),
    blood: Math.max(0, rep.blood - days * 1.5)
  };
}

// ============ 序列化 ============

export interface DefenseJSON {
  reputation: number;
  blood: number;
  wallDamage: number;
  lastRaidDay: number;
  /** 被掳走的同伴（等待营救） */
  captured: string[];
  history: Array<{ day: number; kind: RaidKind; outcome: RaidOutcome }>;
}

export function newDefenseState(): DefenseJSON {
  return { reputation: 10, blood: 5, wallDamage: 0, lastRaidDay: 0, captured: [], history: [] };
}

export function defenseToJSON(s: DefenseJSON): DefenseJSON {
  return { ...s, captured: [...s.captured], history: [...s.history] };
}

export function defenseFromJSON(j: DefenseJSON | null | undefined): DefenseJSON {
  if (!j) return newDefenseState();
  return {
    reputation: j.reputation ?? 10,
    blood: j.blood ?? 5,
    wallDamage: j.wallDamage ?? 0,
    lastRaidDay: j.lastRaidDay ?? 0,
    captured: j.captured ?? [],
    history: (j.history ?? []).filter((h) => raidDef(h.kind))
  };
}

/** 防御摘要文本 */
export function describeDefense(level: DefenseLevel, state: DefenseJSON): string {
  const lines = [
    `防御等级：${level.label}（综合 ${level.total}）`,
    `安全指数：${level.safety}/100　夜间遇袭概率：${(level.raidChance * 100).toFixed(1)}%`,
    `可抵御强度：${level.withstand}`,
    `名声：${state.reputation.toFixed(0)}　血腥值：${state.blood.toFixed(0)}　围墙破损：${state.wallDamage}`
  ];
  if (state.captured.length > 0) {
    lines.push(`待营救：${state.captured.join("、")}`);
  }
  return lines.join("\n");
}
