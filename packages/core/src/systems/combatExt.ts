/**
 * 战斗扩展 —— 技能 / 道具 / 姿态 / 地形 / 连携。
 *
 * 设计定位：
 *  - 在基础回合制之上增加策略层，避免「点一下打一下」
 *  - 技能有冷却与消耗，需权衡使用时机
 *  - 姿态影响攻防倾向，每回合可切换
 *  - 地形提供情境加成，由遭遇地点决定
 *  - 同伴参战时提供连携攻击
 *
 * 纯函数式。
 */

import type { Combatant, CombatState } from "./combat.ts";

// ============ 战斗姿态 ============

export type Stance = "aggressive" | "balanced" | "defensive";

export const STANCE_LABEL: Record<Stance, string> = {
  aggressive: "进攻",
  balanced: "均衡",
  defensive: "防御"
};

export const STANCE_DESC: Record<Stance, string> = {
  aggressive: "攻击 +30%，受到伤害 +25%",
  balanced: "无增减",
  defensive: "防御 +50%，攻击 -20%"
};

export interface StanceMod {
  attackMult: number;
  defenseMult: number;
  /** 闪避修正（加法） */
  dodgeMod: number;
}

export const STANCE_MODS: Record<Stance, StanceMod> = {
  aggressive: { attackMult: 1.30, defenseMult: 1.0, dodgeMod: 0 },
  balanced: { attackMult: 1.0, defenseMult: 1.0, dodgeMod: 0 },
  defensive: { attackMult: 0.80, defenseMult: 1.50, dodgeMod: 0.05 }
};

// ============ 战斗技能 ============

export type SkillKind =
  | "damage"      // 伤害
  | "aoe"         // 范围
  | "heal"        // 治疗
  | "buff"        // 增益
  | "debuff"      // 减益
  | "control"     // 控制（眩晕等）
  | "charm";      // 魅惑

export interface CombatSkill {
  id: string;
  name: string;
  kind: SkillKind;
  /** 冷却回合 */
  cooldown: number;
  /** 体力消耗 */
  cost: number;
  /** 伤害倍率（damage/aoe 用） */
  mult?: number;
  /** 治疗量 */
  heal?: number;
  /** 施加的状态 */
  status?: { kind: string; turns: number; power: number };
  description: string;
  /** 需要的最低技能等级（对应同伴或主角的技能） */
  requiresLevel?: number;
}

export const COMBAT_SKILLS: CombatSkill[] = [
  {
    id: "power_strike", name: "重击", kind: "damage",
    cooldown: 2, cost: 15, mult: 2.0,
    description: "全力一击，造成 2 倍伤害",
    status: { kind: "stun", turns: 1, power: 1 }
  },
  {
    id: "sweep", name: "横扫", kind: "aoe",
    cooldown: 3, cost: 20, mult: 1.2,
    description: "攻击全部敌人，各造成 1.2 倍伤害"
  },
  {
    id: "precise_shot", name: "精准射击", kind: "damage",
    cooldown: 1, cost: 10, mult: 1.6,
    description: "高暴击率的一击（暴击率 +40%）"
  },
  {
    id: "first_aid", name: "急救", kind: "heal",
    cooldown: 4, cost: 15, heal: 35,
    description: "恢复自身 35 点生命"
  },
  {
    id: "rally", name: "鼓舞", kind: "buff",
    cooldown: 4, cost: 12,
    description: "全队攻击 +25%，持续 3 回合",
    status: { kind: "buff", turns: 3, power: 0.25 }
  },
  {
    id: "suppress", name: "压制", kind: "debuff",
    cooldown: 3, cost: 12,
    description: "目标防御 -40%，持续 2 回合",
    status: { kind: "debuff", turns: 2, power: 0.40 }
  },
  {
    id: "flashbang", name: "闪光弹", kind: "control",
    cooldown: 4, cost: 18,
    description: "使全部敌人眩晕 1 回合",
    status: { kind: "stun", turns: 1, power: 1 }
  },
  {
    id: "seduce", name: "魅惑", kind: "charm",
    cooldown: 3, cost: 10,
    description: "魅惑人形敌人，使其跳过回合",
    status: { kind: "charm", turns: 2, power: 1 }
  },
  {
    id: "adrenaline", name: "肾上腺爆发", kind: "buff",
    cooldown: 6, cost: 25,
    description: "自身攻击翻倍，持续 2 回合",
    status: { kind: "buff", turns: 2, power: 1.0 }
  },
  {
    id: "bleed_cut", name: "割裂", kind: "damage",
    cooldown: 2, cost: 12, mult: 1.3,
    description: "造成伤害并附加流血 3 回合",
    status: { kind: "bleed", turns: 3, power: 8 }
  }
];

const SKILL_BY_ID = new Map(COMBAT_SKILLS.map((s) => [s.id, s]));

export function combatSkill(id: string): CombatSkill | undefined {
  return SKILL_BY_ID.get(id);
}

// ============ 战斗地形 ============

export type CombatTerrain =
  | "open"       // 开阔
  | "narrow"     // 狭窄
  | "rubble"     // 废墟
  | "night"      // 夜战
  | "interior";  // 室内

export const COMBAT_TERRAIN_LABEL: Record<CombatTerrain, string> = {
  open: "开阔地",
  narrow: "狭窄通道",
  rubble: "废墟",
  night: "夜间",
  interior: "室内"
};

export const COMBAT_TERRAIN_DESC: Record<CombatTerrain, string> = {
  open: "远程攻击 +20%，无掩体",
  narrow: "只能逐个接敌，范围技能效果减半",
  rubble: "闪避 +15%，移动受限",
  night: "命中 -20%，暴击 +10%",
  interior: "掩体充足，防御 +25%"
};

export interface TerrainMod {
  attackMult: number;
  defenseMult: number;
  dodgeMod: number;
  critMod: number;
  /** 范围技能是否减半 */
  aoeHalved: boolean;
}

export const COMBAT_TERRAIN_MODS: Record<CombatTerrain, TerrainMod> = {
  open: { attackMult: 1.20, defenseMult: 1.0, dodgeMod: 0, critMod: 0, aoeHalved: false },
  narrow: { attackMult: 1.0, defenseMult: 1.0, dodgeMod: 0, critMod: 0, aoeHalved: true },
  rubble: { attackMult: 1.0, defenseMult: 1.0, dodgeMod: 0.15, critMod: 0, aoeHalved: false },
  night: { attackMult: 0.80, defenseMult: 1.0, dodgeMod: 0, critMod: 0.10, aoeHalved: false },
  interior: { attackMult: 1.0, defenseMult: 1.25, dodgeMod: 0, critMod: 0, aoeHalved: false }
};

/** 由区域地形推断战斗地形 */
export function terrainFromRegion(terrain: string): CombatTerrain {
  switch (terrain) {
    case "urban": case "residential": case "industrial": return "rubble";
    case "mountain": case "forest": return "narrow";
    case "coast": case "road": case "rural": return "open";
    case "base": case "lab": case "military": return "interior";
    default: return "open";
  }
}

// ============ 战斗状态扩展 ============

/** 单个单位的战斗附加状态 */
export interface UnitState {
  id: string;
  stance: Stance;
  /** 技能 id → 剩余冷却回合 */
  cooldowns: Record<string, number>;
  /** 是否已行动（本回合） */
  acted: boolean;
}

export interface ExtendedCombat {
  /** 基础战斗状态 */
  base: CombatState;
  /** 地形 */
  terrain: CombatTerrain;
  /** 各单位附加状态 */
  units: Record<string, UnitState>;
  /** 战斗回合数 */
  turnCount: number;
  /** 本场战斗获得的经验 */
  expGained: number;
  /** 战利品 */
  loot: Array<{ itemId: string; count: number }>;
}

export function newUnitState(id: string): UnitState {
  return { id, stance: "balanced", cooldowns: {}, acted: false };
}

/** 初始化扩展战斗 */
export function initExtended(base: CombatState, terrain: CombatTerrain = "open"): ExtendedCombat {
  const units: Record<string, UnitState> = {};
  units[base.player.id] = newUnitState(base.player.id);
  for (const a of base.allies) units[a.id] = newUnitState(a.id);
  for (const e of base.enemies) units[e.id] = newUnitState(e.id);

  return {
    base,
    terrain,
    units,
    turnCount: 1,
    expGained: 0,
    loot: []
  };
}

/** 切换姿态 */
export function setStance(c: ExtendedCombat, unitId: string, stance: Stance): ExtendedCombat {
  const u = c.units[unitId];
  if (!u) return c;
  return { ...c, units: { ...c.units, [unitId]: { ...u, stance } } };
}

/** 冷却递减 */
export function tickCooldowns(c: ExtendedCombat): ExtendedCombat {
  const units: Record<string, UnitState> = {};
  for (const [id, u] of Object.entries(c.units)) {
    const cd: Record<string, number> = {};
    for (const [k, v] of Object.entries(u.cooldowns)) {
      if (v > 1) cd[k] = v - 1;
    }
    units[id] = { ...u, cooldowns: cd, acted: false };
  }
  return { ...c, units, turnCount: c.turnCount + 1 };
}

/** 技能是否可用 */
export function canUseSkill(
  c: ExtendedCombat,
  unitId: string,
  skillId: string
): { ok: boolean; reason?: string } {
  const skill = combatSkill(skillId);
  if (!skill) return { ok: false, reason: "未知技能" };

  const u = c.units[unitId];
  if (!u) return { ok: false, reason: "单位不存在" };

  if ((u.cooldowns[skillId] ?? 0) > 0) {
    return { ok: false, reason: `冷却中（${u.cooldowns[skillId]} 回合）` };
  }

  const unit = unitById(c, unitId);
  if (!unit) return { ok: false, reason: "单位不存在" };
  if (unit.stamina < skill.cost) {
    return { ok: false, reason: `体力不足（需 ${skill.cost}）` };
  }

  return { ok: true };
}

function unitById(c: ExtendedCombat, id: string): Combatant | undefined {
  if (c.base.player.id === id) return c.base.player;
  return c.base.allies.find((a) => a.id === id) ?? c.base.enemies.find((e) => e.id === id);
}

/** 计算单位的有效攻防（含姿态与地形） */
export function effectiveStats(
  c: ExtendedCombat,
  unitId: string,
  side: "player" | "enemy"
): { attack: number; defense: number; dodge: number; critRate: number } {
  const unit = unitById(c, unitId);
  if (!unit) return { attack: 0, defense: 0, dodge: 0, critRate: 0 };

  const u = c.units[unitId];
  const stance = STANCE_MODS[u?.stance ?? "balanced"];
  const terr = COMBAT_TERRAIN_MODS[c.terrain];

  // 状态效果修正
  let attackMult = 1;
  let defenseMult = 1;
  for (const s of unit.status) {
    if (s.kind === "buff") {
      if (s.power >= 0) attackMult += s.power;
      else defenseMult -= Math.abs(s.power);
    }
  }

  return {
    attack: unit.attack * stance.attackMult * terr.attackMult * attackMult,
    defense: unit.defense * stance.defenseMult * terr.defenseMult * defenseMult,
    dodge: Math.max(0, Math.min(0.8, unit.dodge + stance.dodgeMod + terr.dodgeMod)),
    critRate: Math.max(0, Math.min(0.9, unit.critRate + terr.critMod))
  };
}

/** 使用技能的结果 */
export interface SkillResult {
  combat: ExtendedCombat;
  log: string[];
}

/** 使用技能 */
export function useSkill(
  c: ExtendedCombat,
  casterId: string,
  skillId: string,
  targetId: string | null,
  rng: () => number
): SkillResult {
  const skill = combatSkill(skillId);
  const check = canUseSkill(c, casterId, skillId);
  if (!skill || !check.ok) {
    return { combat: c, log: [check.reason ?? "无法使用"] };
  }

  const caster = unitById(c, casterId);
  if (!caster) return { combat: c, log: ["施法者不存在"] };

  const log: string[] = [];
  const eff = effectiveStats(c, casterId, "player");

  // 扣除体力
  const nextUnits = { ...c.units };
  const u = nextUnits[casterId] ?? newUnitState(casterId);
  nextUnits[casterId] = {
    ...u,
    cooldowns: { ...u.cooldowns, [skillId]: skill.cooldown }
  };

  // 更新施法者体力
  const nextBase: CombatState = {
    ...c.base,
    player: c.base.player.id === casterId
      ? { ...c.base.player, stamina: Math.max(0, c.base.player.stamina - skill.cost) }
      : c.base.player,
    allies: c.base.allies.map((a) =>
      a.id === casterId ? { ...a, stamina: Math.max(0, a.stamina - skill.cost) } : a
    )
  };

  let combat: ExtendedCombat = { ...c, base: nextBase, units: nextUnits };
  log.push(`${caster.name} 使用「${skill.name}」`);

  switch (skill.kind) {
    case "damage": {
      if (!targetId) { log.push("需要指定目标"); break; }
      const dmgTarget: string = targetId;
      const target = unitById(combat, dmgTarget);
      if (!target) { log.push("目标不存在"); break; }
      const crit = rng() < eff.critRate;
      const raw = eff.attack * (skill.mult ?? 1) - target.defense;
      const dmg = Math.max(1, Math.round(raw * (crit ? caster.critDmg : 1)));
      combat = applyToUnit(combat, dmgTarget, dmg);
      log.push(`对 ${target.name} 造成 ${dmg} 伤害${crit ? "（暴击）" : ""}`);
      if (skill.status) {
        combat = applyStatus(combat, dmgTarget, skill.status);
        log.push(`${target.name} 陷入${statusLabel(skill.status.kind)}`);
      }
      break;
    }

    case "aoe": {
      const mult = COMBAT_TERRAIN_MODS[combat.terrain].aoeHalved ? 0.5 : 1;
      let total = 0;
      for (const e of combat.base.enemies) {
        if (e.hp <= 0) continue;
        const raw = eff.attack * (skill.mult ?? 1) * mult - e.defense;
        const dmg = Math.max(1, Math.round(raw));
        combat = applyToUnit(combat, e.id, dmg);
        total += dmg;
      }
      log.push(`对全部敌人造成 ${total} 总伤害${mult < 1 ? "（地形减半）" : ""}`);
      if (skill.status) {
        for (const e of combat.base.enemies) {
          if (e.hp > 0) combat = applyStatus(combat, e.id, skill.status);
        }
      }
      break;
    }

    case "heal": {
      const amt = skill.heal ?? 20;
      combat = healUnit(combat, casterId, amt);
      log.push(`恢复 ${amt} 点生命`);
      break;
    }

    case "buff": {
      const targets = [casterId, ...combat.base.allies.map((a) => a.id)];
      for (const t of targets) {
        if (skill.status) combat = applyStatus(combat, t, skill.status);
      }
      log.push(`全队获得增益（${skill.status?.turns} 回合）`);
      break;
    }

    case "debuff": {
      if (!targetId) { log.push("需要指定目标"); break; }
      const debuffTarget: string = targetId;
      if (skill.status) combat = applyStatus(combat, debuffTarget, {
        ...skill.status,
        power: -Math.abs(skill.status.power)
      });
      const dt = unitById(combat, debuffTarget);
      log.push(`${dt?.name} 防御下降`);
      break;
    }

    case "control": {
      for (const e of combat.base.enemies) {
        if (e.hp <= 0) continue;
        if (skill.status) combat = applyStatus(combat, e.id, skill.status);
      }
      log.push("全部敌人被眩晕");
      break;
    }

    case "charm": {
      if (!targetId) { log.push("需要指定目标"); break; }
      const charmTarget: string = targetId;
      const ct = unitById(combat, charmTarget);
      if (!ct?.humanoid) { log.push("目标不是人形，魅惑无效"); break; }
      if (skill.status) combat = applyStatus(combat, charmTarget, skill.status);
      log.push(`${ct.name} 被魅惑`);
      break;
    }
  }

  return { combat, log };
}

function statusLabel(kind: string): string {
  const m: Record<string, string> = {
    stun: "眩晕", bleed: "流血", poison: "中毒",
    charm: "魅惑", buff: "增益", debuff: "减益"
  };
  return m[kind] ?? kind;
}

function applyToUnit(c: ExtendedCombat, id: string, dmg: number): ExtendedCombat {
  return {
    ...c,
    base: {
      ...c.base,
      player: c.base.player.id === id
        ? { ...c.base.player, hp: Math.max(0, c.base.player.hp - dmg) }
        : c.base.player,
      allies: c.base.allies.map((a) =>
        a.id === id ? { ...a, hp: Math.max(0, a.hp - dmg) } : a),
      enemies: c.base.enemies.map((e) =>
        e.id === id ? { ...e, hp: Math.max(0, e.hp - dmg) } : e)
    }
  };
}

function healUnit(c: ExtendedCombat, id: string, amt: number): ExtendedCombat {
  return {
    ...c,
    base: {
      ...c.base,
      player: c.base.player.id === id
        ? { ...c.base.player, hp: Math.min(c.base.player.hpMax, c.base.player.hp + amt) }
        : c.base.player,
      allies: c.base.allies.map((a) =>
        a.id === id ? { ...a, hp: Math.min(a.hpMax, a.hp + amt) } : a)
    }
  };
}

function applyStatus(
  c: ExtendedCombat,
  id: string,
  s: { kind: string; turns: number; power: number }
): ExtendedCombat {
  const add = (unit: Combatant): Combatant => ({
    ...unit,
    status: [...unit.status.filter((x) => x.kind !== s.kind), {
      id: `${s.kind}_${id}`,
      kind: s.kind as never,
      turns: s.turns,
      power: s.power
    }]
  });

  return {
    ...c,
    base: {
      ...c.base,
      player: c.base.player.id === id ? add(c.base.player) : c.base.player,
      allies: c.base.allies.map((a) => (a.id === id ? add(a) : a)),
      enemies: c.base.enemies.map((e) => (e.id === id ? add(e) : e))
    }
  };
}

/** 结算：经验与战利品 */
export function settleCombat(
  c: ExtendedCombat,
  rng: () => number
): { exp: number; loot: Array<{ itemId: string; count: number }> } {
  const defeated = c.base.enemies.filter((e) => e.hp <= 0).length;
  if (!c.base.victory) return { exp: 0, loot: [] };

  const exp = defeated * 25 + c.turnCount * 2;
  const loot: Array<{ itemId: string; count: number }> = [];

  // 基础战利品
  loot.push({ itemId: "ammo_9mm", count: Math.round(rng() * 15) + 5 });
  if (rng() < 0.5) loot.push({ itemId: "bandage", count: 1 + Math.round(rng() * 2) });
  if (rng() < 0.35) loot.push({ itemId: "steel_bar", count: 1 + Math.round(rng() * 2) });
  if (rng() < 0.2) loot.push({ itemId: "electronics", count: 1 });

  return { exp, loot };
}

/** 战斗统计（供 UI 展示） */
export function combatSummary(c: ExtendedCombat): {
  round: number;
  terrain: string;
  terrainDesc: string;
  enemiesAlive: number;
  enemiesTotal: number;
  alliesAlive: number;
  playerHpPct: number;
} {
  return {
    round: c.turnCount,
    terrain: COMBAT_TERRAIN_LABEL[c.terrain],
    terrainDesc: COMBAT_TERRAIN_DESC[c.terrain],
    enemiesAlive: c.base.enemies.filter((e) => e.hp > 0).length,
    enemiesTotal: c.base.enemies.length,
    alliesAlive: c.base.allies.filter((a) => a.hp > 0).length,
    playerHpPct: c.base.player.hpMax > 0
      ? Math.round((c.base.player.hp / c.base.player.hpMax) * 100)
      : 0
  };
}

/** 统计 */
export function combatExtStats(): {
  skills: number;
  terrains: number;
  stances: number;
} {
  return {
    skills: COMBAT_SKILLS.length,
    terrains: Object.keys(COMBAT_TERRAIN_MODS).length,
    stances: Object.keys(STANCE_MODS).length
  };
}