/**
 * 无人机战斗系统。
 *
 * 把科技树里解锁的无人机/机器人变成战斗单位，每回合自动行动。
 *
 * 设计：
 *  - 无人机不是同伴，不占队伍位，不需要玩家操作。
 *  - 每台无人机有自己的行动方式与冷却，轮到它时由 AI 自动执行。
 *  - 无人机可以被打掉（HP 归零后失效，战斗结束自动修复）。
 *  - 玩家可以在战前选择带哪几台（编队上限来自 rob_dispatch）。
 */

import type { Combatant } from "./combat.ts";

/** 无人机的战斗角色 */
export type DroneRole =
  | "attack"    // 直接造成伤害
  | "burst"     // 爆发伤害（有冷却）
  | "heal"      // 治疗
  | "shield"    // 减伤护盾
  | "debuff"    // 削弱敌人
  | "scout"     // 提升命中/暴击
  | "jam"       // 干扰：减少敌人行动
  | "decoy"     // 吸引仇恨
  | "supply";   // 补给：恢复精力

/** 一台无人机的静态定义 */
export interface DroneDef {
  id: string;
  name: string;
  role: DroneRole;
  /** 对应的科技加成键（aggregateBonuses 的 key，不是节点 id） */
  tech: string;
  /** 基础数值（伤害/治疗/减伤百分比） */
  power: number;
  /** 冷却：几回合行动一次 */
  cooldown: number;
  /** 自身耐久 */
  hp: number;
  /** 描述 */
  desc: string;
  /** 图标 */
  icon: string;
}

/** 全部无人机定义 */
export const DRONE_DEFS: DroneDef[] = [
  { id: "dr_scout", name: "侦察无人机", role: "scout", tech: "expScout",
    power: 8, cooldown: 0, hp: 12, icon: "🔭",
    desc: "标记敌人弱点，全队命中与暴击 +8%" },
  { id: "dr_escort", name: "护航无人机", role: "attack", tech: "expEscort",
    power: 6, cooldown: 0, hp: 18, icon: "🛡",
    desc: "每回合造成 6 点伤害，可吸引仇恨" },
  { id: "dr_medic", name: "医疗无人机", role: "heal", tech: "expMedic",
    power: 8, cooldown: 3, hp: 14, icon: "🚑",
    desc: "每 3 回合治疗最重伤者 8 点" },
  { id: "dr_light", name: "照明无人机", role: "scout", tech: "expLight",
    power: 5, cooldown: 0, hp: 10, icon: "💡",
    desc: "夜间不受惩罚，命中 +5%" },
  { id: "dr_relay", name: "通讯中继机", role: "supply", tech: "expRelay",
    power: 10, cooldown: 4, hp: 12, icon: "📡",
    desc: "每 4 回合恢复全队 10 点精力" },
  { id: "dr_path", name: "探路机器人", role: "scout", tech: "expPath",
    power: 10, cooldown: 0, hp: 16, icon: "🧭",
    desc: "先手探测，首回合全队先攻" },
  { id: "dr_broadcast", name: "广播诱敌机", role: "decoy", tech: "expDecoy",
    power: 1, cooldown: 3, hp: 10, icon: "📻",
    desc: "每 3 回合强制敌人转向它" },
  { id: "dr_heat", name: "热诱饵无人机", role: "decoy", tech: "expHeatDecoy",
    power: 2, cooldown: 4, hp: 12, icon: "🔥",
    desc: "每 4 回合吸引全部敌人攻击 2 轮" },
  { id: "dr_heavy", name: "重装护卫机", role: "shield", tech: "expEscortDr",
    power: 20, cooldown: 0, hp: 30, icon: "⚙",
    desc: "跟随者受到的伤害减少 20%" },
  { id: "dr_flock", name: "伴飞护卫群", role: "attack", tech: "expFlock",
    power: 9, cooldown: 0, hp: 24, icon: "🛸",
    desc: "三机编队，每回合共造成 9 点伤害" },
  { id: "dr_recon_uav", name: "空中侦察机", role: "scout", tech: "aerialVision",
    power: 6, cooldown: 0, hp: 14, icon: "🛩",
    desc: "俯瞰战场，命中 +6%" },
  { id: "dr_kamikaze", name: "自爆追击机", role: "burst", tech: "kamikaze",
    power: 45, cooldown: 8, hp: 8, icon: "💥",
    desc: "冲向目标自爆，造成 45 点伤害，一次性" },
  { id: "dr_swarm", name: "蜂群微型机", role: "attack", tech: "microSwarm",
    power: 12, cooldown: 0, hp: 20, icon: "🐝",
    desc: "八台微型机持续撕咬，每回合 12 点" },
  { id: "dr_spotter", name: "舰载校射机", role: "debuff", tech: "carrierSpotter",
    power: 15, cooldown: 3, hp: 16, icon: "🎯",
    desc: "校正弹着点，敌人防御 -15%（3 回合）" },
  { id: "dr_attack_jet", name: "舰载攻击机", role: "burst", tech: "carrierAttack",
    power: 38, cooldown: 5, hp: 22, icon: "💣",
    desc: "对地打击，38 点伤害（5 回合冷却）" },
  { id: "dr_bomber", name: "舰载轰炸机", role: "burst", tech: "carrierBomber",
    power: 60, cooldown: 7, hp: 26, icon: "🛬",
    desc: "大范围轰炸，全体敌人 60 点（7 回合）" },
  { id: "dr_ew", name: "舰载电子战机", role: "jam", tech: "carrierEW",
    power: 1, cooldown: 5, hp: 20, icon: "📶",
    desc: "瘫痪敌人电子设备，跳过其 1 次行动" },
  { id: "dr_swarmpod", name: "蜂群投放荚舱", role: "burst", tech: "carrierSwarm",
    power: 30, cooldown: 6, hp: 24, icon: "📦",
    desc: "投放 24 台微型机，30 点范围伤害" },
  { id: "dr_wingman", name: "舰载无人僚机", role: "attack", tech: "carrierWingman",
    power: 16, cooldown: 0, hp: 24, icon: "✈",
    desc: "与攻击机编队，每回合 16 点伤害" }
];

/** 战斗中的一台无人机实例 */
export interface DroneUnit {
  id: string;
  def: DroneDef;
  hp: number;
  maxHp: number;
  /** 当前冷却 */
  cd: number;
  /** 是否已失效 */
  down: boolean;
  /** 本场已行动次数 */
  acted: number;
}

/** 一台无人机的行动记录 */
export interface DroneAction {
  droneId: string;
  droneName: string;
  icon: string;
  kind: "attack" | "heal" | "shield" | "debuff" | "scout" | "jam" | "decoy" | "supply";
  /** 数值 */
  value: number;
  /** 目标名 */
  target: string;
  /** 展示文本 */
  text: string;
}

/** 从科技加成里找出可用无人机 */
export function availableDrones(bonuses: Record<string, number>): DroneDef[] {
  return DRONE_DEFS.filter((d) => (bonuses[d.tech] ?? 0) > 0);
}

/** 编队上限（来自巡逻调度中枢 rob_dispatch） */
export function droneSquadCap(bonuses: Record<string, number>): number {
  return 3 + Math.floor(bonuses["squadCap"] ?? 0);
}

/** 组建无人机编队 */
export function squadDrones(
  bonuses: Record<string, number>,
  picked?: string[]
): DroneUnit[] {
  const avail = availableDrones(bonuses);
  const cap = droneSquadCap(bonuses);
  const chosen = picked
    ? avail.filter((d) => picked.includes(d.id))
    : avail.slice(0, cap);
  return chosen.slice(0, cap).map((def) => ({
    id: def.id,
    def,
    hp: def.hp,
    maxHp: def.hp,
    cd: 0,
    down: false,
    acted: 0
  }));
}

/** 编队总览 */
export function squadSummary(units: DroneUnit[]): {
  total: number; alive: number; down: number;
  roles: Record<string, number>;
  dps: number; hps: number;
} {
  const alive = units.filter((u) => !u.down);
  let dps = 0, hps = 0;
  const roles: Record<string, number> = {};
  for (const u of alive) {
    roles[u.def.role] = (roles[u.def.role] ?? 0) + 1;
    if (u.def.role === "attack" || u.def.role === "burst") {
      dps += u.def.cooldown === 0 ? u.def.power : Math.round(u.def.power / u.def.cooldown);
    }
    if (u.def.role === "heal") hps += Math.round(u.def.power / Math.max(1, u.def.cooldown));
  }
  return { total: units.length, alive: alive.length, down: units.length - alive.length, roles, dps, hps };
}

export interface DroneTurnInput {
  units: DroneUnit[];
  /** 我方单位（第一个是主角） */
  allies: { id: string; name: string; hp: number; maxHp: number }[];
  /** 敌人 */
  enemies: { id: string; name: string; hp: number; maxHp: number; defense?: number }[];
  /** 回合号 */
  round: number;
  /** 玩家累计命中加成（scout 会改写） */
  accuracy: { value: number };
  /** 玩家累计减伤（shield 会改写） */
  damageReduction: { value: number };
  /** 敌人被跳过行动的计数 */
  skipEnemy: { value: number };
}

export interface DroneTurnResult {
  actions: DroneAction[];
  /** 敌人受到的伤害（id → 点数） */
  enemyDamage: Record<string, number>;
  /** 我方受到的治疗（id → 点数） */
  allyHeal: Record<string, number>;
  /** 我方精力恢复（全体） */
  stamina: number;
  /** 结构化的效果汇总，供 UI 显示 */
  effects: {
    accuracyBonus: number;
    damageReduction: number;
    enemyDefenseDown: number;
    forcedAggro: number;
    skipCount: number;
  };
}

/**
 * 执行一轮无人机行动。
 *
 * 纯函数：不修改传入的 units / allies / enemies，只返回结果，
 * 由调用方应用到战斗状态上。
 */
export function droneTurn(input: DroneTurnInput): DroneTurnResult {
  const actions: DroneAction[] = [];
  const enemyDamage: Record<string, number> = {};
  const allyHeal: Record<string, number> = {};

  const alive = input.units.filter((u) => !u.down);
  const aliveEnemies = input.enemies.filter((e) => e.hp > 0);
  const aliveAllies = input.allies.filter((a) => a.hp > 0);

  let accuracyBonus = 0;
  let damageReduction = 0;
  let enemyDefenseDown = 0;
  let forcedAggro = 0;
  let skipCount = 0;
  let stamina = 0;

  for (const u of alive) {
    // 冷却中
    if (u.cd > 0) continue;
    const d = u.def;

    switch (d.role) {
      case "attack": {
        if (!aliveEnemies.length) break;
        // 打血最少的敌人（补刀）
        const t = aliveEnemies.reduce((a, b) => (a.hp <= b.hp ? a : b));
        enemyDamage[t.id] = (enemyDamage[t.id] ?? 0) + d.power;
        actions.push({
          droneId: d.id, droneName: d.name, icon: d.icon, kind: "attack",
          value: d.power, target: t.name,
          text: d.name + " 攻击 " + t.name + "，" + d.power + " 点伤害"
        });
        break;
      }
      case "burst": {
        if (!aliveEnemies.length) break;
        // 大范围：打血最多的
        const t = aliveEnemies.reduce((a, b) => (a.hp >= b.hp ? a : b));
        enemyDamage[t.id] = (enemyDamage[t.id] ?? 0) + d.power;
        actions.push({
          droneId: d.id, droneName: d.name, icon: d.icon, kind: "attack",
          value: d.power, target: t.name,
          text: d.name + " 命中 " + t.name + "，" + d.power + " 点爆发伤害"
        });
        break;
      }
      case "heal": {
        if (!aliveAllies.length) break;
        const t = aliveAllies.reduce((a, b) =>
          a.hp / a.maxHp <= b.hp / b.maxHp ? a : b);
        allyHeal[t.id] = (allyHeal[t.id] ?? 0) + d.power;
        actions.push({
          droneId: d.id, droneName: d.name, icon: d.icon, kind: "heal",
          value: d.power, target: t.name,
          text: d.name + " 治疗 " + t.name + "，" + d.power + " 点"
        });
        break;
      }
      case "shield": {
        damageReduction += d.power;
        actions.push({
          droneId: d.id, droneName: d.name, icon: d.icon, kind: "shield",
          value: d.power, target: "全队",
          text: d.name + " 展开护盾，全队伤害减免 " + d.power + "%"
        });
        break;
      }
      case "scout": {
        accuracyBonus += d.power;
        actions.push({
          droneId: d.id, droneName: d.name, icon: d.icon, kind: "scout",
          value: d.power, target: "全队",
          text: d.name + " 标记弱点，命中 +" + d.power + "%"
        });
        break;
      }
      case "debuff": {
        enemyDefenseDown += d.power;
        const t = aliveEnemies[0];
        actions.push({
          droneId: d.id, droneName: d.name, icon: d.icon, kind: "debuff",
          value: d.power, target: t?.name ?? "敌人",
          text: d.name + " 校正弹着点，" + (t?.name ?? "敌人") + " 防御 -" + d.power + "%"
        });
        break;
      }
      case "jam": {
        skipCount += 1;
        const t = aliveEnemies[0];
        actions.push({
          droneId: d.id, droneName: d.name, icon: d.icon, kind: "jam",
          value: 1, target: t?.name ?? "敌人",
          text: d.name + " 干扰成功，" + (t?.name ?? "敌人") + " 跳过下次行动"
        });
        break;
      }
      case "decoy": {
        forcedAggro += d.power;
        actions.push({
          droneId: d.id, droneName: d.name, icon: d.icon, kind: "decoy",
          value: d.power, target: "自身",
          text: d.name + " 释放诱饵，吸引敌人 " + d.power + " 轮"
        });
        break;
      }
      case "supply": {
        stamina += d.power;
        actions.push({
          droneId: d.id, droneName: d.name, icon: d.icon, kind: "supply",
          value: d.power, target: "全队",
          text: d.name + " 投放补给，全队恢复 " + d.power + " 精力"
        });
        break;
      }
    }
  }

  return {
    actions,
    enemyDamage,
    allyHeal,
    stamina,
    effects: { accuracyBonus, damageReduction, enemyDefenseDown, forcedAggro, skipCount }
  };
}

/** 应用冷却：行动后重置 cd，未行动则递减 */
export function tickDrones(units: DroneUnit[], actedIds: string[]): DroneUnit[] {
  return units.map((u) => {
    const acted = actedIds.includes(u.id);
    if (acted) return { ...u, cd: u.def.cooldown, acted: u.acted + 1 };
    return u.cd > 0 ? { ...u, cd: u.cd - 1 } : u;
  });
}

/** 无人机承受伤害 */
export function damageDrones(units: DroneUnit[], amount: number): DroneUnit[] {
  // 优先打最脆的
  const alive = units.filter((u) => !u.down).sort((a, b) => a.hp - b.hp);
  if (!alive.length) return units;
  const target = alive[0];
  return units.map((u) => {
    if (u.id !== target.id) return u;
    const hp = u.hp - amount;
    return { ...u, hp: Math.max(0, hp), down: hp <= 0 };
  });
}

/** 战斗结束：全部修复（战后自动维护） */
export function repairDrones(units: DroneUnit[]): DroneUnit[] {
  return units.map((u) => ({ ...u, hp: u.maxHp, down: false, cd: 0 }));
}
