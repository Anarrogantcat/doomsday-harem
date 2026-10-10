/**
 * 加成共享系统。
 *
 * 设计定位（对应需求「后宫可以享受科技与基地加成，低于主角」）：
 *  - 主角获得 100% 加成
 *  - 后宫默认只享受一部分，且需要玩家逐项授权
 *  - 授权是可选的：玩家可以选择不让某些加成惠及后宫
 *  - 后宫享受的比例固定低于主角（见 SHARE_RATIO）
 *
 * 纯函数式。
 */

import type { HeroAttributes } from "./heroGrowth.ts";

/** 加成类别 */
export type BonusCategory =
  | "survival"   // 生存：食物、水、医疗、卫生
  | "combat"     // 战斗：防御、武器、护盾
  | "facility"   // 设施：居住、训练、研究
  | "comfort"    // 舒适：心情、隐私、氛围
  | "special";   // 特殊：H 场景解锁等

export const BONUS_CATEGORY_LABEL: Record<BonusCategory, string> = {
  survival: "生存",
  combat: "战斗",
  facility: "设施",
  comfort: "舒适",
  special: "特殊"
};

export const BONUS_CATEGORY_DESC: Record<BonusCategory, string> = {
  survival: "食物产出、饮水、医疗与卫生条件",
  combat: "防御工事、武器储备、护盾与自动火力",
  facility: "居住容量、训练效率、研究速率",
  comfort: "心情恢复、隐私程度、生活氛围",
  special: "特定内容的解锁条件"
};

/** 加成定义 */
export interface BonusDef {
  key: string;
  label: string;
  category: BonusCategory;
  /** 对后宫的适用方式 */
  appliesTo: "numeric" | "unlock" | "none";
  /** 说明 */
  description: string;
  /** 是否默认授权给后宫 */
  defaultShared: boolean;
}

/**
 * 全部加成定义。
 * appliesTo 决定后宫能从中获得什么：
 *  - numeric：数值类，后宫按比例享受
 *  - unlock：解锁类，授权即生效（不按比例）
 *  - none：纯主角专属（如研究速率）
 */
export const BONUS_DEFS: BonusDef[] = [
  // ---- 生存 ----
  { key: "foodPerDay", label: "食物产出", category: "survival", appliesTo: "numeric", description: "温室与厨房的每日产出", defaultShared: true },
  { key: "waterPerDay", label: "饮水产出", category: "survival", appliesTo: "numeric", description: "净水系统的每日产水", defaultShared: true },
  { key: "healRate", label: "治疗效率", category: "survival", appliesTo: "numeric", description: "医疗舱的恢复速度", defaultShared: true },
  { key: "hygiene", label: "卫生条件", category: "survival", appliesTo: "numeric", description: "浴室与清洁设施水平", defaultShared: true },
  { key: "airQuality", label: "空气质量", category: "survival", appliesTo: "numeric", description: "通风与过滤效果", defaultShared: true },
  { key: "materialPerDay", label: "材料产出", category: "survival", appliesTo: "numeric", description: "矿场与回收的每日产出（可授权后宫参与）", defaultShared: false },

  // ---- 战斗 ----
  { key: "defense", label: "防御强度", category: "combat", appliesTo: "numeric", description: "围墙与掩体的防护值", defaultShared: true },
  { key: "shield", label: "能量护盾", category: "combat", appliesTo: "numeric", description: "护盾发生器的强度", defaultShared: false },
  { key: "autoFire", label: "自动火力", category: "combat", appliesTo: "numeric", description: "炮塔与无人机的自动射击", defaultShared: true },
  { key: "ammoRate", label: "弹药产能", category: "combat", appliesTo: "numeric", description: "弹药复装的速率", defaultShared: true },
  { key: "cover", label: "掩体覆盖", category: "combat", appliesTo: "numeric", description: "战时的掩护程度", defaultShared: true },
  { key: "baseSecurity", label: "据点安全", category: "combat", appliesTo: "numeric", description: "整体安全等级", defaultShared: true },
  { key: "weaponStorage", label: "武器储备", category: "combat", appliesTo: "numeric", description: "军械库容量", defaultShared: false },
  { key: "earlyWarning", label: "预警范围", category: "combat", appliesTo: "numeric", description: "瞭望塔与传感器的探测距离", defaultShared: true },

  // ---- 设施 ----
  { key: "livingCapacity", label: "居住容量", category: "facility", appliesTo: "numeric", description: "可容纳的人数", defaultShared: true },
  { key: "trainingRate", label: "训练效率", category: "facility", appliesTo: "numeric", description: "训练场的提升速度", defaultShared: true },
  { key: "craftRate", label: "制作效率", category: "facility", appliesTo: "numeric", description: "工坊的合成速度（可授权后宫协助）", defaultShared: true },
  { key: "researchRate", label: "研究效率", category: "facility", appliesTo: "numeric", description: "实验室的研发速度（可授权后宫科研人员参与）", defaultShared: true },
  { key: "storageMult", label: "仓储容量", category: "facility", appliesTo: "numeric", description: "仓库的存储上限", defaultShared: false },
  { key: "powerCapacity", label: "电力容量", category: "facility", appliesTo: "numeric", description: "发电与储能总量", defaultShared: true },
  { key: "vehicleSlots", label: "车位", category: "facility", appliesTo: "numeric", description: "可停放的车辆数", defaultShared: true },
  { key: "cryoSlots", label: "冷冻舱位", category: "facility", appliesTo: "numeric", description: "冷冻保存的容量", defaultShared: true },

  // ---- 舒适 ----
  { key: "moodBonus", label: "心情加成", category: "comfort", appliesTo: "numeric", description: "生活品质带来的心情提升", defaultShared: true },
  { key: "moodRecovery", label: "心情恢复", category: "comfort", appliesTo: "numeric", description: "休息时的心情恢复速度", defaultShared: true },
  { key: "privacy", label: "隐私程度", category: "comfort", appliesTo: "numeric", description: "隔音与私人空间", defaultShared: true },
  { key: "accessLevel", label: "通行等级", category: "comfort", appliesTo: "numeric", description: "可进入的区域范围", defaultShared: true },
  { key: "commRange", label: "通讯范围", category: "comfort", appliesTo: "numeric", description: "通讯设备的覆盖距离", defaultShared: true },
  { key: "escapeRoutes", label: "撤离通道", category: "comfort", appliesTo: "numeric", description: "紧急撤离路线数量", defaultShared: true },

  // ---- 特殊 ----
  { key: "hSceneUnlock", label: "亲密场景解锁", category: "special", appliesTo: "unlock", description: "解锁特定的亲密场景", defaultShared: true },
  { key: "drones", label: "无人机", category: "special", appliesTo: "numeric", description: "可部署的无人机数量", defaultShared: true },
  { key: "robots", label: "机器人", category: "special", appliesTo: "numeric", description: "可部署的机器人数量", defaultShared: true },
  { key: "cloneRate", label: "克隆效率", category: "special", appliesTo: "numeric", description: "克隆舱的产出速率", defaultShared: false }
];

const BONUS_BY_KEY = new Map(BONUS_DEFS.map((b) => [b.key, b]));

export function bonusDef(key: string): BonusDef | undefined {
  return BONUS_BY_KEY.get(key);
}

export function bonusesByCategory(c: BonusCategory): BonusDef[] {
  return BONUS_DEFS.filter((b) => b.category === c);
}

/**
 * 后宫享受的比例。
 *
 * 固定低于主角 —— 这是设计约束：
 * 强化只来自科技与基地，主角是建设者，因此受益最大。
 */
export const SHARE_RATIO = 0.6;

/** 主角专属比例 */
export const HERO_RATIO = 1.0;

/** 授权状态 */
export interface ShareState {
  /** 键 → 是否授权给后宫 */
  shared: Record<string, boolean>;
}

export function newShareState(): ShareState {
  const shared: Record<string, boolean> = {};
  for (const b of BONUS_DEFS) shared[b.key] = b.defaultShared;
  return { shared };
}

/** 切换授权 */
export function toggleShare(s: ShareState, key: string): ShareState {
  const def = bonusDef(key);
  if (!def) return s;
  return { ...s, shared: { ...s.shared, [key]: !s.shared[key] } };
}

/** 批量设置某分类 */
export function setCategoryShare(s: ShareState, c: BonusCategory, on: boolean): ShareState {
  const next = { ...s.shared };
  for (const b of bonusesByCategory(c)) next[b.key] = on;
  return { ...s, shared: next };
}

/** 是否授权 */
export function isShared(s: ShareState, key: string): boolean {
  const def = bonusDef(key);
  if (!def || def.appliesTo === "none") return false;
  return s.shared[key] ?? false;
}

/** 已授权的键 */
export function sharedKeys(s: ShareState): string[] {
  return BONUS_DEFS.filter((b) => isShared(s, b.key)).map((b) => b.key);
}

/**
 * 计算后宫实际获得的加成。
 *
 * numeric 类按 SHARE_RATIO 折算；unlock 类授权即全额生效。
 */
export function companionBonuses(
  raw: Record<string, number>,
  share: ShareState
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw)) {
    const def = bonusDef(k);
    if (!def) {
      // 未登记的键：保守起见不共享
      continue;
    }
    if (!isShared(share, k)) continue;

    out[k] = def.appliesTo === "unlock" ? v : v * SHARE_RATIO;
  }
  return out;
}

/** 主角获得的加成（全额） */
export function heroBonuses(raw: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw)) {
    const def = bonusDef(k);
    // 主角全额享受，包括 none 类
    out[k] = def ? v * HERO_RATIO : v;
  }
  return out;
}

/**
 * 后宫从共享加成获得的属性提升。
 *
 * 映射规则与主角一致，但按比例缩减。
 */
export function companionAttributeBonus(
  sharedRaw: Record<string, number>
): Partial<HeroAttributes> {
  const out: Partial<HeroAttributes> = {};
  const add = (k: keyof HeroAttributes, v: number) => {
    if (v > 0) out[k] = (out[k] ?? 0) + v;
  };

  add("strength", Math.floor((sharedRaw["meleeDmg"] ?? 0) / 8));
  add("agility", Math.floor((sharedRaw["trainingRate"] ?? 0) / 15));
  add("endurance", Math.floor((sharedRaw["staminaMax"] ?? 0) / 15));
  add("perception", Math.floor((sharedRaw["earlyWarning"] ?? 0) / 15));
  add("willpower", Math.floor((sharedRaw["moodRecovery"] ?? 0) / 15));
  add("charisma", Math.floor((sharedRaw["moodBonus"] ?? 0) / 15));

  return out;
}

/** 授权统计 */
export function shareStats(s: ShareState): {
  total: number;
  shared: number;
  byCategory: Record<BonusCategory, { total: number; shared: number }>;
} {
  const byCategory = {} as Record<BonusCategory, { total: number; shared: number }>;
  for (const c of ["survival", "combat", "facility", "comfort", "special"] as BonusCategory[]) {
    const list = bonusesByCategory(c);
    byCategory[c] = {
      total: list.length,
      shared: list.filter((b) => isShared(s, b.key)).length
    };
  }
  return {
    total: BONUS_DEFS.length,
    shared: sharedKeys(s).length,
    byCategory
  };
}

/** 序列化 */
export interface ShareJSON {
  shared: Record<string, boolean>;
}

export function shareToJSON(s: ShareState): ShareJSON {
  return { shared: { ...s.shared } };
}

export function shareFromJSON(j: ShareJSON | null | undefined): ShareState {
  if (!j || !j.shared) return newShareState();
  const base = newShareState();
  return { shared: { ...base.shared, ...j.shared } };
}
