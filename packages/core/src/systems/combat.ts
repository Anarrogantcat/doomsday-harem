/**
 * 回合制战斗系统。
 * 主角的扶她特性不参与战斗数值（INV-6），仅影响外观与 H 场景。
 */

export interface Combatant {
  id: string;
  name: string;
  hp: number;
  hpMax: number;
  stamina: number;
  staminaMax: number;
  /** 基础攻击 */
  attack: number;
  /** 基础防御 */
  defense: number;
  /** 闪避率 0-1 */
  dodge: number;
  /** 暴击率 0-1 */
  critRate: number;
  /** 暴击倍率 */
  critDmg: number;
  /** 是否为变异体（可被魅惑） */
  humanoid: boolean;
  /** 状态效果 */
  status: StatusEffect[];
}

export interface StatusEffect {
  id: string;
  kind: "stun" | "bleed" | "poison" | "charm" | "buff";
  /** 剩余回合 */
  turns: number;
  /** 数值强度 */
  power: number;
}

export type Side = "player" | "enemy";

export interface CombatState {
  player: Combatant;
  enemies: Combatant[];
  allies: Combatant[];
  round: number;
  turn: Side;
  log: string[];
  over: boolean;
  victory: boolean;
}

export function newCombatant(p: Partial<Combatant> & { id: string; name: string }): Combatant {
  return {
    hp: 50, hpMax: 50,
    stamina: 40, staminaMax: 40,
    attack: 10, defense: 3, dodge: 0.05,
    critRate: 0.05, critDmg: 1.5,
    humanoid: false,
    status: [],
    ...p
  };
}

export function startCombat(player: Combatant, enemies: Combatant[], allies: Combatant[] = []): CombatState {
  return {
    player,
    enemies: enemies.map((e) => ({ ...e, status: [...e.status] })),
    allies: allies.map((a) => ({ ...a, status: [...a.status] })),
    round: 1,
    turn: "player",
    log: [`遭遇 ${enemies.map((e) => e.name).join("、")}（${enemies.length} 个单位）`],
    over: false,
    victory: false
  };
}

/** 确定性伪随机，便于测试注入 */
export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface AttackResult {
  damage: number;
  crit: boolean;
  dodged: boolean;
  targetHp: number;
}

/** 计算一次攻击 */
export function attack(attacker: Combatant, defender: Combatant, rng: Rng, mult = 1): AttackResult {
  if (rng() < defender.dodge) {
    return { damage: 0, crit: false, dodged: true, targetHp: defender.hp };
  }
  const crit = rng() < attacker.critRate;
  const base = Math.max(1, attacker.attack * mult - defender.defense);
  const damage = Math.round(base * (crit ? attacker.critDmg : 1));
  const targetHp = Math.max(0, defender.hp - damage);
  return { damage, crit, dodged: false, targetHp };
}

/** 应用伤害到状态（返回新状态，不改原对象） */
export function applyDamage(state: CombatState, targetId: string, damage: number): CombatState {
  return {
    ...state,
    player: state.player.id === targetId
      ? { ...state.player, hp: Math.max(0, state.player.hp - damage) }
      : state.player,
    enemies: state.enemies.map((e) =>
      e.id === targetId ? { ...e, hp: Math.max(0, e.hp - damage) } : e
    ),
    allies: state.allies.map((a) =>
      a.id === targetId ? { ...a, hp: Math.max(0, a.hp - damage) } : a
    )
  };
}

export function addLog(state: CombatState, line: string): CombatState {
  return { ...state, log: [...state.log, line] };
}

/** 玩家行动：攻击指定敌人 */
export function playerAttack(state: CombatState, enemyId: string, rng: Rng, mult = 1): CombatState {
  if (state.over) return state;
  const enemy = state.enemies.find((e) => e.id === enemyId);
  if (!enemy) return addLog(state, "目标不存在");
  const r = attack(state.player, enemy, rng, mult);
  let next = state;
  if (r.dodged) {
    next = addLog(next, `${state.player.name} 攻击 ${enemy.name}，被闪避`);
  } else {
    next = applyDamage(next, enemyId, r.damage);
    next = addLog(next, `${state.player.name} 攻击 ${enemy.name}，造成 ${r.damage} 伤害${r.crit ? "（暴击）" : ""}`);
  }
  return checkOver(next);
}

/** 魅惑：人形敌人停滞 1 回合 */
export function charmEnemy(state: CombatState, enemyId: string, rng: Rng): CombatState {
  const enemy = state.enemies.find((e) => e.id === enemyId);
  if (!enemy) return addLog(state, "目标不存在");
  if (!enemy.humanoid) return addLog(state, `${enemy.name} 不是人形，魅惑无效`);
  const success = rng() < 0.6;
  if (!success) return addLog(state, `魅惑 ${enemy.name} 失败`);
  const next: CombatState = {
    ...state,
    enemies: state.enemies.map((e) =>
      e.id === enemyId
        ? { ...e, status: [...e.status, { id: "charm", kind: "charm" as const, turns: 1, power: 1 }] }
        : e
    )
  };
  return addLog(next, `魅惑 ${enemy.name}，其停滞 1 回合`);
}

/** 敌人回合：逐个攻击玩家或同伴 */
export function enemyTurn(state: CombatState, rng: Rng): CombatState {
  let next = state;
  for (const enemy of state.enemies) {
    if (enemy.hp <= 0) continue;
    if (enemy.status.some((s) => s.kind === "charm" && s.turns > 0)) {
      next = addLog(next, `${enemy.name} 被魅惑，无法行动`);
      continue;
    }
    const r = attack(enemy, next.player, rng);
    if (r.dodged) {
      next = addLog(next, `${enemy.name} 攻击，被闪避`);
    } else {
      next = applyDamage(next, next.player.id, r.damage);
      next = addLog(next, `${enemy.name} 攻击，造成 ${r.damage} 伤害`);
    }
  }
  return checkOver(next);
}

/** 回合推进：递减状态、切换回合、回合数 +1 */
export function advanceRound(state: CombatState): CombatState {
  const tick = (c: Combatant): Combatant => ({
    ...c,
    status: c.status
      .map((s) => ({ ...s, turns: s.turns - 1 }))
      .filter((s) => s.turns > 0)
  });
  return {
    ...state,
    player: tick(state.player),
    enemies: state.enemies.map(tick),
    allies: state.allies.map(tick),
    turn: "player",
    round: state.round + 1
  };
}

export function checkOver(state: CombatState): CombatState {
  if (state.player.hp <= 0) {
    return { ...state, over: true, victory: false, log: [...state.log, "主角倒下——战斗失败"] };
  }
  if (state.enemies.every((e) => e.hp <= 0)) {
    return { ...state, over: true, victory: true, log: [...state.log, "敌人全部被击倒——战斗胜利"] };
  }
  return state;
}

/** 从科技加成构造主角战斗数值 */
export interface CombatBonus {
  meleeDmg?: number;
  dodge?: number;
  critRate?: number;
  critDmg?: number;
  burstMult?: number;
  charm?: number;
}

export function playerFromBonuses(base: Partial<Combatant>, b: CombatBonus): Combatant {
  return newCombatant({
    id: "hero",
    name: "主角",
    attack: Math.round(10 * (1 + (b.meleeDmg ?? 0))),
    dodge: 0.05 + (b.dodge ?? 0),
    critRate: 0.05 + (b.critRate ?? 0),
    // critDmg 为绝对倍率（科技表里 2 即 ×2）
    critDmg: b.critDmg ?? 1.5,
    ...base
  });
}
