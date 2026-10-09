/**
 * 基地建造系统。
 *
 * 定位：
 *  - 把科技树的「解锁」变成实际的「建造」：解锁只是允许，建造才是占有
 *  - 每个设施有建造消耗、工时、等级、效果
 *  - 设施提供加成（容量 / 效率 / 解锁能力），与岗位、科技叠加
 *  - 安全屋（地表）与避难所（山内）分层，资源层更下层
 *
 * 纯函数式，不触碰 IO。
 */

/** 基地层级 */
export type BaseLevel = "surface" | "bunker" | "resource";

export const LEVEL_LABEL: Record<BaseLevel, string> = {
  surface: "安全屋（地表）",
  bunker: "避难所（山内）",
  resource: "资源层（深层）"
};

/** 设施分类 */
export type FacilityCategory =
  | "living"     // 居住
  | "utility"    // 水电风
  | "production" // 生产
  | "medical"    // 医疗
  | "research"   // 研究
  | "defense"    // 防御
  | "storage"    // 仓储
  | "special";   // 特殊

export const FACILITY_CATEGORY_LABEL: Record<FacilityCategory, string> = {
  living: "居住",
  utility: "基础设施",
  production: "生产",
  medical: "医疗",
  research: "研究",
  defense: "防御",
  storage: "仓储",
  special: "特殊"
};

export interface FacilityDef {
  id: string;
  name: string;
  level: BaseLevel;
  category: FacilityCategory;
  description: string;
  /** 建造消耗 */
  cost: Record<string, number>;
  /** 建造工时（游戏内小时） */
  hours: number;
  /** 前置科技节点 */
  requiresTech: string[];
  /** 前置设施（需已建成） */
  requiresFacility: string[];
  /** 最大等级 */
  maxTier: number;
  /** 每级消耗倍率 */
  costGrowth: number;
  /** 每级工时倍率 */
  hourGrowth: number;
  /** 每级提供的效果（数值累乘或累加，键名见 aggregateFacilityBonuses） */
  bonusPerTier?: Record<string, number>;
  /** 效果描述模板，{tier} 会替换为当前等级 */
  effectTemplate: string;
  /** 是否独占（同层同分类只能有一个） */
  unique?: boolean;
}

/** 一座已建成（或在建）的设施 */
export interface Facility {
  id: string;
  tier: number;
  /** 在建进度（0 表示已完工） */
  buildingHours: number;
  /** 本次建造目标等级 */
  targetTier: number;
}

export interface Base {
  facilities: Facility[];
  /** 当前正在建造的设施 id（一次只能建一个） */
  building: string | null;
}

// ============ 设施目录 ============

const f = (
  id: string, name: string, level: BaseLevel, category: FacilityCategory,
  description: string, cost: Record<string, number>, hours: number,
  requiresTech: string[], requiresFacility: string[], maxTier: number,
  costGrowth: number, hourGrowth: number, effectTemplate: string,
  bonusPerTier?: Record<string, number>, unique?: boolean
): FacilityDef => ({
  id, name, level, category, description, cost, hours, requiresTech,
  requiresFacility, maxTier, costGrowth, hourGrowth, effectTemplate,
  bonusPerTier, unique
});

export const FACILITIES: FacilityDef[] = [
  // ============ 地表：安全屋 ============
  f("power_basic", "电力基础", "surface", "utility",
    "照明、冰箱、充电插座", { "copper_wire": 10, "magnet": 5 }, 4, [], [], 3, 1.6, 1.5,
    "全屋通电，日供电 {tier} 级", { powerCapacity: 10 }),
  f("water_basic", "简易水源", "surface", "utility",
    "雨水收集与初级过滤", { "pvc_pipe": 20, "filter_mesh": 5 }, 4, [], [], 3, 1.6, 1.5,
    "日供水 {tier} 级", { waterPerDay: 30 }),
  f("vent_basic", "通风系统", "surface", "utility",
    "基础空气循环", { "fan": 3, "duct": 10 }, 3, [], [], 3, 1.6, 1.5,
    "空气循环等级 {tier}", { airQuality: 10 }),
  f("storage_room", "储物间", "surface", "storage",
    "扩大仓库容量", { "metal_shelf": 15, "wood": 20 }, 6, [], [], 5, 1.5, 1.3,
    "仓库容量 ×{tier}", { storageMult: 1.5 }),
  f("kitchen", "厨房", "surface", "living",
    "可做热食，提升心情", { "steel_bar": 10, "cement": 10 }, 8, [], ["power_basic"], 3, 1.6, 1.4,
    "热食供给 {tier} 级", { moodBonus: 5 }),
  f("dining", "餐厅", "surface", "living",
    "集体用餐空间", { "wood": 30, "furniture": 3 }, 10, [], ["kitchen"], 2, 1.6, 1.4,
    "用餐容量 {tier} 级", { moodBonus: 4 }),
  f("living_room", "会客厅", "surface", "living",
    "休息与娱乐空间", { "furniture": 5, "wood": 20 }, 12, [], [], 3, 1.5, 1.3,
    "心情恢复 +{tier} 级", { moodRecovery: 8 }),
  f("bedroom", "卧室", "surface", "living",
    "居住空间，容纳同伴", { "wood": 40, "furniture": 6 }, 16, [], ["power_basic"], 4, 1.5, 1.3,
    "可容纳 {tier} 人", { livingCapacity: 4 }),
  f("garage", "车库", "surface", "special",
    "停放与维修房车", { "cement": 30, "steel_bar": 20 }, 20, [], [], 2, 1.6, 1.4,
    "可停 {tier} 辆车", { vehicleSlots: 1 }),
  f("armory", "武器室", "surface", "storage",
    "存放武器与弹药（暗格）", { "steel_bar": 15, "metal_shelf": 5 }, 10, [], ["storage_room"], 3, 1.5, 1.3,
    "武器容量 {tier} 级", { weaponStorage: 20 }),
  f("comm_room", "通讯室", "surface", "utility",
    "无线电与监控", { "radio": 2, "electronics": 5 }, 12, [], ["power_basic"], 3, 1.6, 1.4,
    "通讯等级 {tier}", { commRange: 20 }),
  f("security_gate", "门禁系统", "surface", "defense",
    "三重认证入口", { "electronics": 8, "steel_bar": 10 }, 14, [], ["power_basic"], 3, 1.5, 1.3,
    "门禁等级 {tier}", { baseSecurity: 15 }),

  // ============ 山内：避难所 ============
  f("elevator", "隐蔽电梯", "bunker", "special",
    "连接地表与避难所", { "steel_bar": 30, "hydraulic": 2, "electronics": 10 }, 30, [], ["power_basic"], 2, 1.7, 1.5,
    "通道等级 {tier}", { accessLevel: 1 }),
  f("bunker_power", "地热发电", "bunker", "utility",
    "避难所主力能源", { "machine_part": 10, "steel_bar": 30, "copper_wire": 30 }, 40, [], ["elevator"], 4, 1.6, 1.5,
    "日发电 {tier} 级", { powerCapacity: 40 }),
  f("bunker_water", "净水系统", "bunker", "utility",
    "深层净水，日产量高", { "activated_carbon": 10, "pump": 2, "pvc_pipe": 20 }, 24, [], ["elevator"], 4, 1.5, 1.4,
    "日供水 {tier} 级", { waterPerDay: 100 }),
  f("greenhouse", "温室", "bunker", "production",
    "水培土培，全年产粮", { "glass": 20, "led": 10, "pvc_pipe": 10 }, 28, [], ["bunker_power", "bunker_water"], 4, 1.5, 1.4,
    "产粮 {tier} 级", { foodPerDay: 6 }),
  f("medical_bay", "医疗区", "bunker", "medical",
    "手术室与病房", { "surgical_kit": 2, "medical_supply": 20, "steel_bar": 10 }, 26, [], ["elevator", "bunker_power"], 4, 1.5, 1.4,
    "医疗等级 {tier}", { healRate: 0.15 }),
  f("lab", "实验室", "bunker", "research",
    "制药与生物研究", { "machine_part": 5, "glass": 15, "electronics": 15 }, 36, [], ["elevator", "bunker_power"], 5, 1.5, 1.4,
    "研究速度 +{tier} 级", { researchRate: 0.15 }),
  f("training_room", "训练场", "bunker", "special",
    "格斗与体能训练", { "steel_bar": 20, "wood": 20 }, 24, [], ["elevator"], 3, 1.5, 1.3,
    "训练效率 +{tier} 级", { trainingRate: 0.15 }),
  f("workshop", "地下工厂", "bunker", "production",
    "3D 打印与 CNC 加工", { "machine_part": 15, "steel_bar": 40, "electronics": 20 }, 48, ["shelter_power"], ["elevator", "bunker_power"], 4, 1.5, 1.4,
    "加工等级 {tier}", { craftRate: 0.2 }),
  f("ammo_press", "弹药复装台", "bunker", "production",
    "自制弹药", { "machine_part": 5, "mold": 5, "gunpowder": 10 }, 20, [], ["workshop"], 3, 1.5, 1.3,
    "弹药产量 {tier} 级", { ammoRate: 0.25 }),
  f("bunker_storage", "主仓库", "bunker", "storage",
    "大型仓储", { "metal_shelf": 30, "steel_bar": 20 }, 22, [], ["elevator"], 5, 1.5, 1.3,
    "仓库容量 ×{tier}", { storageMult: 2 }),
  f("harem_dorm", "后宫宿舍", "bunker", "living",
    "独立卧室与公共浴室", { "furniture": 20, "insulation": 10, "wood": 40 }, 40, [], ["bedroom", "bunker_power"], 3, 1.6, 1.4,
    "可容纳 {tier}×4 人", { livingCapacity: 4, moodRecovery: 6 }),
  f("private_room", "专属空间", "bunker", "special",
    "隔音私密室", { "insulation": 10, "furniture": 5 }, 16, [], ["bedroom"], 2, 1.5, 1.3,
    "私密等级 {tier}", { privacy: 1, hSceneUnlock: 1 }),
  f("bathhouse", "大浴场", "bunker", "living",
    "集体洗浴", { "cement": 30, "pvc_pipe": 20, "glass": 10 }, 30, [], ["bunker_water"], 2, 1.6, 1.4,
    "洗浴容量 {tier} 级", { moodRecovery: 10, hygiene: 15 }),
  f("cryo_bay", "冷冻休眠舱", "bunker", "medical",
    "濒死同伴冷冻", { "machine_part": 20, "isotope": 1 }, 60, ["shelter_medical"], ["medical_bay", "bunker_power"], 2, 1.8, 1.5,
    "休眠位 {tier}×2", { cryoSlots: 2 }),
  f("clone_lab", "克隆实验室", "bunker", "research",
    "细胞培养与克隆", { "machine_part": 30, "gene_sample": 5, "glass": 30 }, 80, ["shelter_medical"], ["lab"], 2, 1.8, 1.5,
    "培养等级 {tier}", { cloneRate: 0.1 }),

  // ============ 防御设施 ============
  f("fence", "围墙", "surface", "defense",
    "基础围栏", { "wood": 50, "steel_bar": 10 }, 12, [], [], 5, 1.4, 1.3,
    "防御等级 {tier}", { defense: 10 }),
  f("trench", "壕沟", "surface", "defense",
    "外围壕沟与尖刺", { "steel_bar": 10, "wood": 20 }, 16, [], ["fence"], 3, 1.4, 1.3,
    "阻敌等级 {tier}", { defense: 15 }),
  f("watchtower", "瞭望哨", "surface", "defense",
    "制高点观察", { "wood": 20, "rope": 2 }, 8, [], [], 3, 1.4, 1.3,
    "预警等级 {tier}", { earlyWarning: 10 }),
  f("sandbag", "射击掩体", "surface", "defense",
    "半地下掩体", { "cloth": 20, "stone": 30 }, 18, [], ["trench"], 3, 1.4, 1.3,
    "掩体等级 {tier}", { cover: 12 }),
  f("turret", "哨戒枪", "surface", "defense",
    "固定自动武器", { "machine_part": 5, "steel_bar": 10, "ammo_762": 100 }, 24, [], ["sandbag", "power_basic"], 3, 1.6, 1.4,
    "火力等级 {tier}", { autoFire: 20 }),
  f("drone_bay", "无人机机库", "bunker", "defense",
    "侦察与攻击无人机", { "drone_part": 10, "electronics": 20 }, 40, [], ["elevator", "workshop"], 3, 1.6, 1.4,
    "无人机 {tier}×3", { drones: 3 }),
  f("robot_bay", "机器人充电站", "bunker", "defense",
    "哨兵机器人基地", { "drone_part": 8, "electronics": 25, "machine_part": 10 }, 44, [], ["drone_bay"], 3, 1.6, 1.4,
    "机器人位 {tier}×2", { robots: 2 }),
  f("energy_shield", "能量护盾", "bunker", "defense",
    "短时能量屏障", { "isotope": 3, "electronics": 50, "machine_part": 30 }, 100, [], ["robot_bay"], 2, 1.8, 1.5,
    "护盾等级 {tier}", { shield: 30 }),

  // ============ 资源层 ============
  f("deep_well", "深层水井", "resource", "utility",
    "地下 200m 清洁水源", { "pump": 5, "steel_bar": 40, "pvc_pipe": 40 }, 50, [], ["elevator"], 3, 1.5, 1.4,
    "日供水 {tier} 级", { waterPerDay: 200 }),
  f("geo_plant", "地热机组", "resource", "utility",
    "深层地热发电", { "machine_part": 25, "steel_bar": 60, "isotope": 2 }, 70, [], ["bunker_power"], 4, 1.6, 1.5,
    "日发电 {tier} 级", { powerCapacity: 100 }),
  f("mine", "矿物采集", "resource", "production",
    "自产建材", { "steel_bar": 20, "machine_part": 10 }, 45, [], ["elevator"], 4, 1.5, 1.4,
    "日产 {tier} 级", { materialPerDay: 8 }),
  f("escape_tunnel", "逃生密道", "resource", "special",
    "通往山外的秘密出口", { "steel_bar": 30, "gunpowder": 20 }, 60, [], ["elevator"], 3, 1.6, 1.4,
    "密道 {tier} 条", { escapeRoutes: 1 }),
  f("fusion_plant", "聚变电站", "resource", "utility",
    "终极能源", { "isotope": 10, "machine_part": 60, "electronics": 80 }, 140, [], ["geo_plant"], 2, 1.8, 1.6,
    "日发电 {tier} 级", { powerCapacity: 500 }),
  f("air_filter", "通风过滤", "bunker", "utility",
    "防毒防生化过滤", { "filter_mesh": 20, "activated_carbon": 20, "fan": 10 }, 32, [], ["vent_basic", "bunker_power"], 3, 1.5, 1.4,
    "过滤等级 {tier}", { airQuality: 25 })
];

const BY_ID = new Map(FACILITIES.map((x) => [x.id, x]));

export function facilityDef(id: string): FacilityDef | undefined {
  return BY_ID.get(id);
}

export function facilitiesByLevel(level: BaseLevel): FacilityDef[] {
  return FACILITIES.filter((x) => x.level === level);
}

export function facilitiesByCategory(cat: FacilityCategory): FacilityDef[] {
  return FACILITIES.filter((x) => x.category === cat);
}

// ============ 基地操作 ============

export function newBase(): Base {
  return { facilities: [], building: null };
}

export function findFacility(base: Base, id: string): Facility | undefined {
  return base.facilities.find((x) => x.id === id);
}

export function tierOf(base: Base, id: string): number {
  return findFacility(base, id)?.tier ?? 0;
}

export function isBuilt(base: Base, id: string): boolean {
  return tierOf(base, id) > 0;
}

export function isBuilding(base: Base, id: string): boolean {
  const fac = findFacility(base, id);
  return !!fac && fac.buildingHours > 0;
}

/** 建造/升级到下一级所需的消耗 */
export function upgradeCost(def: FacilityDef, currentTier: number): Record<string, number> {
  const mult = Math.pow(def.costGrowth, currentTier);
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(def.cost)) {
    out[k] = Math.ceil(v * mult);
  }
  return out;
}

/** 建造/升级所需工时 */
export function upgradeHours(def: FacilityDef, currentTier: number): number {
  return Math.ceil(def.hours * Math.pow(def.hourGrowth, currentTier));
}

export type BuildLockReason =
  | "ok" | "max-tier" | "building-other" | "missing-tech"
  | "missing-facility" | "missing-resource";

export interface BuildCheck {
  ok: boolean;
  reason: BuildLockReason;
  /** 下一级等级 */
  nextTier: number;
  cost: Record<string, number>;
  hours: number;
  missingTech: string[];
  missingFacility: string[];
  missingResource: Record<string, number>;
}

/** 建造可用性检查 */
export function checkBuild(
  base: Base,
  def: FacilityDef,
  techs: string[],
  resources: Record<string, number>,
  missingFor: (cost: Record<string, number>) => Record<string, number>
): BuildCheck {
  const cur = tierOf(base, def.id);
  const nextTier = cur + 1;
  const cost = upgradeCost(def, cur);
  const hours = upgradeHours(def, cur);

  const missingTech = def.requiresTech.filter((t) => !techs.includes(t));
  const missingFacility = def.requiresFacility.filter((f) => tierOf(base, f) === 0);
  const missingResource = missingFor(cost);

  let reason: BuildLockReason = "ok";
  if (cur >= def.maxTier) reason = "max-tier";
  else if (base.building && base.building !== def.id) reason = "building-other";
  else if (missingTech.length > 0) reason = "missing-tech";
  else if (missingFacility.length > 0) reason = "missing-facility";
  else if (Object.keys(missingResource).length > 0) reason = "missing-resource";

  return {
    ok: reason === "ok",
    reason,
    nextTier,
    cost,
    hours,
    missingTech,
    missingFacility,
    missingResource
  };
}

/** 开工 */
export function startBuild(base: Base, defId: string): Base {
  const def = facilityDef(defId);
  if (!def) return base;
  const facilities = base.facilities.map((x) => ({ ...x }));
  const cur = facilities.find((x) => x.id === defId);
  if (cur) {
    cur.targetTier = cur.tier + 1;
    cur.buildingHours = 0.0001; // 标记已开工
  } else {
    facilities.push({ id: defId, tier: 0, buildingHours: 0.0001, targetTier: 1 });
  }
  return { facilities, building: defId };
}

export interface BuildTick {
  base: Base;
  completed: string | null;
  completedTier: number;
}

/** 推进建造（rate 为建造效率倍率） */
export function tickBuild(base: Base, hours: number, rate = 1): BuildTick {
  if (!base.building) return { base, completed: null, completedTier: 0 };
  const def = facilityDef(base.building);
  if (!def) return { base: { ...base, building: null }, completed: null, completedTier: 0 };

  const facilities = base.facilities.map((x) => ({ ...x }));
  const fac = facilities.find((x) => x.id === def.id);
  if (!fac) return { base: { ...base, building: null }, completed: null, completedTier: 0 };

  const need = upgradeHours(def, fac.tier);
  fac.buildingHours += hours * rate;

  if (fac.buildingHours >= need) {
    const newTier = fac.tier + 1;
    return {
      base: {
        facilities: facilities.map((x) =>
          x.id === def.id ? { ...x, tier: newTier, buildingHours: 0, targetTier: newTier } : x
        ),
        building: null
      },
      completed: def.id,
      completedTier: newTier
    };
  }
  return { base: { facilities, building: base.building }, completed: null, completedTier: 0 };
}

/** 立即完工（作弊器） */
export function instantBuild(base: Base, defId: string): Base {
  const def = facilityDef(defId);
  if (!def) return base;
  const cur = tierOf(base, defId);
  if (cur >= def.maxTier) return base;
  const facilities = base.facilities.map((x) => ({ ...x }));
  const fac = facilities.find((x) => x.id === defId);
  const next = cur + 1;
  if (fac) {
    fac.tier = next;
    fac.buildingHours = 0;
    fac.targetTier = next;
  } else {
    facilities.push({ id: defId, tier: next, buildingHours: 0, targetTier: next });
  }
  return { facilities, building: base.building === defId ? null : base.building };
}

/** 一键建成某层全部（作弊器） */
export function instantBuildAll(base: Base, level?: BaseLevel): Base {
  let out = base;
  const targets = level ? facilitiesByLevel(level) : FACILITIES;
  for (const def of targets) {
    for (let i = 0; i < def.maxTier; i++) out = instantBuild(out, def.id);
  }
  return out;
}

/** 拆除（退回一半材料的概念由调用方处理） */
export function demolish(base: Base, defId: string): Base {
  return {
    facilities: base.facilities.filter((x) => x.id !== defId),
    building: base.building === defId ? null : base.building
  };
}

// ============ 效果汇总 ============

/**
 * 汇总全部设施加成。
 * 键名以 Mult 结尾的按乘积累乘，其余累加（与科技树一致）。
 */
export function aggregateFacilityBonuses(base: Base): Record<string, number> {
  const out: Record<string, number> = {};
  for (const fac of base.facilities) {
    const def = facilityDef(fac.id);
    if (!def?.bonusPerTier || fac.tier <= 0) continue;
    for (const [k, v] of Object.entries(def.bonusPerTier)) {
      const total = v * fac.tier;
      if (k.endsWith("Mult")) {
        out[k] = (out[k] ?? 1) * Math.pow(v, fac.tier);
      } else {
        out[k] = (out[k] ?? 0) + total;
      }
    }
  }
  return out;
}

/** 效果描述（把 {tier} 替换为当前等级） */
export function effectText(base: Base, def: FacilityDef): string {
  const tier = tierOf(base, def.id);
  return def.effectTemplate.replace(/\{tier\}/g, String(Math.max(1, tier)));
}

// ============ 基地状态 ============

export interface BaseSummary {
  total: number;
  built: number;
  maxed: number;
  building: string | null;
  buildingProgress: number;
  byLevel: Record<BaseLevel, { built: number; total: number }>;
  byCategory: Record<FacilityCategory, { built: number; total: number }>;
}

export function summarize(base: Base): BaseSummary {
  const byLevel: BaseSummary["byLevel"] = {
    surface: { built: 0, total: 0 },
    bunker: { built: 0, total: 0 },
    resource: { built: 0, total: 0 }
  };
  const byCategory = {} as BaseSummary["byCategory"];
  for (const cat of Object.keys(FACILITY_CATEGORY_LABEL) as FacilityCategory[]) {
    byCategory[cat] = { built: 0, total: 0 };
  }

  let built = 0;
  let maxed = 0;
  for (const def of FACILITIES) {
    byLevel[def.level].total++;
    byCategory[def.category].total++;
    const t = tierOf(base, def.id);
    if (t > 0) {
      built++;
      byLevel[def.level].built++;
      byCategory[def.category].built++;
    }
    if (t >= def.maxTier) maxed++;
  }

  let progress = 0;
  if (base.building) {
    const def = facilityDef(base.building);
    const fac = findFacility(base, base.building);
    if (def && fac) {
      const need = upgradeHours(def, fac.tier);
      progress = need > 0 ? Math.min(1, fac.buildingHours / need) : 0;
    }
  }

  return {
    total: FACILITIES.length,
    built,
    maxed,
    building: base.building,
    buildingProgress: progress,
    byLevel,
    byCategory
  };
}

/** 居住容量（可容纳同伴数） */
export function livingCapacity(base: Base): number {
  let cap = 0;
  for (const fac of base.facilities) {
    const def = facilityDef(fac.id);
    if (!def?.bonusPerTier?.["livingCapacity"]) continue;
    cap += def.bonusPerTier["livingCapacity"] * fac.tier;
  }
  return cap;
}

/** 是否已解锁 H 场景（专属空间） */
export function hSceneUnlocked(base: Base): boolean {
  return base.facilities.some((x) => {
    const def = facilityDef(x.id);
    return !!def?.bonusPerTier?.["hSceneUnlock"] && x.tier > 0;
  });
}

// ============ 序列化 ============

export interface BaseJSON {
  facilities: Array<{ id: string; tier: number; buildingHours: number; targetTier: number }>;
  building: string | null;
}

export function baseToJSON(base: Base): BaseJSON {
  return {
    facilities: base.facilities.map((x) => ({
      id: x.id, tier: x.tier, buildingHours: x.buildingHours, targetTier: x.targetTier
    })),
    building: base.building
  };
}

export function baseFromJSON(j: BaseJSON | null | undefined): Base {
  if (!j) return newBase();
  const facilities = (j.facilities ?? [])
    .filter((x) => facilityDef(x.id))
    .map((x) => ({ id: x.id, tier: x.tier, buildingHours: x.buildingHours, targetTier: x.targetTier }));
  return { facilities, building: j.building ?? null };
}

/** 摘要文本 */
export function describeBase(base: Base): string {
  const built = base.facilities.filter((x) => x.tier > 0);
  if (built.length === 0) return "（尚未建成任何设施）";
  return built
    .map((x) => {
      const def = facilityDef(x.id);
      return `${def?.name ?? x.id} Lv${x.tier}`;
    })
    .join("　");
}
