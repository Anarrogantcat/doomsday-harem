/**
 * 房车系统。
 *
 * 设计（对应设定）：
 *  - 起点是主角用存款购买的普通 C 型房车，无装甲无武装
 *  - 8 级改装科技线，逐级解锁装甲、武器、电力、生活设施
 *  - 房车是远征载具：续航、速度、载重、装甲、武器站
 *  - 内部空间可容纳同伴，T4 后解锁私室（远征 H 场景）
 *
 * 纯函数式，不触碰 IO。
 */

/** 改装槽位 */
export type VehicleSlot =
  | "armor"      // 装甲
  | "engine"     // 动力
  | "power"      // 电力
  | "weapon"     // 武器
  | "storage"    // 储物
  | "living"     // 生活
  | "comm"       // 通讯
  | "utility";   // 功能

export const VEHICLE_SLOT_LABEL: Record<VehicleSlot, string> = {
  armor: "装甲",
  engine: "动力",
  power: "电力",
  weapon: "武器",
  storage: "储物",
  living: "生活",
  comm: "通讯",
  utility: "功能"
};

/** 改装层级 T1-T8 */
export type ModTier = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface ModDef {
  id: string;
  name: string;
  tier: ModTier;
  slot: VehicleSlot;
  description: string;
  /** 安装消耗 */
  cost: Record<string, number>;
  /** 安装工时 */
  hours: number;
  /** 前置改装 */
  requires: string[];
  /** 前置科技 */
  requiresTech: string[];
  /** 数值影响 */
  effects: Partial<VehicleStats>;
  /** 能力标签：如 armory / private_room / drone / ammo_feed */
  grants?: string[];
}

/** 房车数值 */
export interface VehicleStats {
  /** 最高时速 km/h（公路） */
  topSpeed: number;
  /** 越野时速 km/h */
  offroadSpeed: number;
  /** 续航 km（柴油） */
  range: number;
  /** 纯电续航 km */
  electricRange: number;
  /** 载重 kg */
  capacity: number;
  /** 装甲等级 B0-B7 */
  armorLevel: number;
  /** 静音等级 dB */
  noiseDb: number;
  /** 座位数 */
  seats: number;
  /** 乘员舒适度 0-100 */
  comfort: number;
  /** 电力输出 kWh/日 */
  powerOutput: number;
  /** 燃料容量 L */
  fuelCapacity: number;
  /** 是否具备火力 */
  firepower: number;
  /** 是否涉水 */
  wading: number;
}

export const BASE_STATS: VehicleStats = {
  topSpeed: 90,
  offroadSpeed: 35,
  range: 600,
  electricRange: 0,
  capacity: 800,
  armorLevel: 0,
  noiseDb: 75,
  seats: 4,
  comfort: 30,
  powerOutput: 0,
  fuelCapacity: 200,
  firepower: 0,
  wading: 0
};

/** 一辆房车 */
export interface Vehicle {
  id: string;
  name: string;
  /** 已安装的改装 id */
  mods: string[];
  /** 已解锁的改装科技（由主科技树提供，此处仅记录） */
  unlockedTiers: ModTier[];
  /** 燃料（升） */
  fuel: number;
  /** 电量（kWh） */
  charge: number;
  /** 车身耐久 0-100 */
  hull: number;
  /** 是否停在据点（外出时为 false） */
  atBase: boolean;
}

// ============ 改装目录 ============

const m = (
  id: string, name: string, tier: ModTier, slot: VehicleSlot,
  description: string, cost: Record<string, number>, hours: number,
  requires: string[], requiresTech: string[],
  effects: Partial<VehicleStats>, grants?: string[]
): ModDef => ({ id, name, tier, slot, description, cost, hours, requires, requiresTech, effects, grants });

export const MODS: ModDef[] = [
  // ---- T1 ----
  m("solar_panel", "车顶太阳能板", 1, "power",
    "日发电 2kWh，可为小型设备充电",
    { "solar_panel": 4, "battery": 2 }, 8, [], ["shelter_power"],
    { powerOutput: 2 }),
  m("toolbox", "车载工具箱", 1, "utility",
    "房车可自行维修，延长寿命",
    { "toolbox": 1, "steel_bar": 5 }, 6, [], [],
    {}, ["self_repair"]),
  m("storage_basic", "储物扩容", 1, "storage",
    "储物容量 +50%",
    { "metal_shelf": 5, "cloth": 10 }, 6, [], [],
    { capacity: 400 }),

  // ---- T2 ----
  m("aux_tank", "副油箱", 2, "engine",
    "续航 +50%",
    { "steel_bar": 10, "pvc_pipe": 5 }, 10, ["toolbox"], [],
    { range: 300, fuelCapacity: 100 }),
  m("armor_b1", "简易装甲", 2, "armor",
    "B1 级：防手枪与丧尸撕咬",
    { "steel_bar": 15, "welding_kit": 1 }, 14, ["toolbox"], [],
    { armorLevel: 1 }),
  m("weapon_rack", "车内武器架", 2, "weapon",
    "可固定存放 2 把长枪",
    { "steel_bar": 8, "cloth": 5 }, 8, [], [],
    {}, ["weapon_rack"]),

  // ---- T3 ----
  m("armor_b4", "装甲升级", 3, "armor",
    "B4 级：防步枪射击，基础防爆",
    { "armor_plate": 10, "welding_kit": 1, "steel_bar": 20 }, 24, ["armor_b1"], ["shelter_power"],
    { armorLevel: 3 }),
  m("kitchen", "厨房改造", 3, "living",
    "可做热食，支持 4 人远征饮食",
    { "machine_part": 2, "steel_bar": 10 }, 16, ["aux_tank"], [],
    { comfort: 15, seats: 1 }),
  m("comm_terminal", "通讯终端", 2, "comm",
    "远征途中与基地保持联系",
    { "radio": 2, "electronics": 8 }, 14, ["solar_panel"], ["shelter_power"],
    {}, ["comm"]),

  // ---- T4 ----
  m("armor_b6", "重型装甲", 4, "armor",
    "B6+ 级：防弹防爆",
    { "armor_plate": 25, "welding_kit": 2, "machine_part": 5 }, 40, ["armor_b4"], ["shelter_power"],
    { armorLevel: 2 }),
  m("medical_bay", "医疗舱", 4, "living",
    "远征中可进行中级医疗",
    { "surgical_kit": 2, "medical_supply": 20 }, 24, ["kitchen"], ["shelter_medical"],
    { comfort: 10 }, ["medical_bay"]),
  m("battery_pack", "房车电池组", 3, "power",
    "纯电续航 100km，静默模式 40dB",
    { "battery": 8, "electronics": 10 }, 22, ["comm_terminal"], ["shelter_power"],
    { electricRange: 100, noiseDb: -35 }),
  m("private_room", "房车私室", 4, "living",
    "远征途中可触发亲密场景",
    { "insulation": 10, "furniture": 5 }, 20, ["armor_b4", "battery_pack"], [],
    { comfort: 20 }, ["private_room"]),

  // ---- T5 ----
  m("weapon_mount", "顶部武器架", 5, "weapon",
    "车顶可架设机枪/榴弹发射器（人操作）",
    { "steel_bar": 15, "machine_part": 8 }, 26, ["armor_b6"], ["shelter_power"],
    { firepower: 30 }, ["top_weapon"]),
  m("radar", "探测雷达", 5, "comm",
    "扫描 3km 内敌情与资源点",
    { "radar_module": 1, "electronics": 12 }, 24, ["battery_pack"], ["shelter_power"],
    {}, ["radar"]),
  m("water_tank", "备用水箱", 5, "utility",
    "200L 储水，远征饮水自给",
    { "steel_bar": 10, "pvc_pipe": 10 }, 14, ["medical_bay"], [],
    { capacity: 200 }),

  // ---- T6 ----
  m("remote_weapon", "遥控武器站", 6, "weapon",
    "车内操控车顶武器，无需探身",
    { "machine_part": 12, "electronics": 15, "ammo_762": 100 }, 36, ["weapon_mount"], ["shelter_power"],
    { firepower: 40 }, ["remote_weapon"]),
  m("terrain_kit", "地形适应套件", 6, "utility",
    "可通过泥沼/浅河/陡坡",
    { "machine_part": 10, "steel_bar": 20 }, 30, ["radar"], [],
    { offroadSpeed: 15, wading: 120 }),
  m("camp_ext", "扩展营地", 6, "living",
    "侧面帐篷 30㎡，形成临时营地",
    { "cloth": 30, "steel_bar": 10 }, 20, ["water_tank"], [],
    { comfort: 15, seats: 2 }, ["camp"]),

  // ---- T7 ----
  m("tactical_center", "战术指挥中心", 7, "comm",
    "全息导航与 AI 战术辅助",
    { "electronics": 30, "data_chip": 5 }, 50, ["remote_weapon", "terrain_kit"], ["shelter_power"],
    {}, ["tactical"]),
  m("ammo_feed", "自动弹药装填", 7, "weapon",
    "遥控武器持续射击时间 ×3",
    { "machine_part": 15, "mold": 5, "gunpowder": 20 }, 32, ["camp_ext"], ["shelter_power"],
    { firepower: 30 }, ["ammo_feed"]),

  // ---- T8 ----
  m("drone_rack", "微型无人机挂载", 8, "utility",
    "携带 2 架侦察无人机",
    { "drone_part": 4, "electronics": 20 }, 40, ["ammo_feed"], ["shelter_power"],
    {}, ["drone"]),
  m("ultimate", "终极改装", 8, "engine",
    "续航 1500km / B7 装甲 / 30dB 静音",
    { "rare_catalyst": 5, "armor_plate": 40, "isotope": 1 }, 80, ["tactical_center", "ammo_feed"], ["shelter_power"],
    { range: 600, armorLevel: 1, noiseDb: -10, topSpeed: 30, capacity: 400 })
];

const BY_ID = new Map(MODS.map((x) => [x.id, x]));

export function modDef(id: string): ModDef | undefined {
  return BY_ID.get(id);
}

export function modsByTier(tier: ModTier): ModDef[] {
  return MODS.filter((x) => x.tier === tier);
}

export function modsBySlot(slot: VehicleSlot): ModDef[] {
  return MODS.filter((x) => x.slot === slot);
}

// ============ 车辆操作 ============

export function newVehicle(name = "游牧者号"): Vehicle {
  return {
    id: "nomad",
    name,
    mods: [],
    unlockedTiers: [1],
    fuel: 200,
    charge: 0,
    hull: 100,
    atBase: true
  };
}

export function hasMod(v: Vehicle, id: string): boolean {
  return v.mods.includes(id);
}

/** 当前数值（基础 + 已装改装） */
export function stats(v: Vehicle): VehicleStats {
  const out: VehicleStats = { ...BASE_STATS };
  for (const id of v.mods) {
    const def = modDef(id);
    if (!def) continue;
    for (const [k, val] of Object.entries(def.effects)) {
      const key = k as keyof VehicleStats;
      out[key] = (out[key] ?? 0) + (val as number);
    }
  }
  // 装甲等级上限 B7
  out.armorLevel = Math.min(7, out.armorLevel);
  out.noiseDb = Math.max(30, out.noiseDb);
  return out;
}

/** 装甲等级标签 */
export function armorLabel(level: number): string {
  return level <= 0 ? "无装甲" : `B${level} 级`;
}

export type ModLockReason =
  | "ok" | "already" | "missing-prereq" | "missing-tech" | "missing-resource";

export interface ModCheck {
  ok: boolean;
  reason: ModLockReason;
  missing: string[];
  missingTech: string[];
  missingResource: Record<string, number>;
}

export function checkMod(
  v: Vehicle, def: ModDef, techs: string[],
  missingFor: (cost: Record<string, number>) => Record<string, number>
): ModCheck {
  const missing = def.requires.filter((r) => !v.mods.includes(r));
  const missingTech = def.requiresTech.filter((t) => !techs.includes(t));
  const missingResource = missingFor(def.cost);

  let reason: ModLockReason = "ok";
  if (v.mods.includes(def.id)) reason = "already";
  else if (missing.length > 0) reason = "missing-prereq";
  else if (missingTech.length > 0) reason = "missing-tech";
  else if (Object.keys(missingResource).length > 0) reason = "missing-resource";

  return { ok: reason === "ok", reason, missing, missingTech, missingResource };
}

/** 安装改装 */
export function installMod(v: Vehicle, id: string): Vehicle {
  if (v.mods.includes(id)) return v;
  if (!modDef(id)) return v;
  return { ...v, mods: [...v.mods, id] };
}

/** 卸载改装 */
export function removeMod(v: Vehicle, id: string): Vehicle {
  return { ...v, mods: v.mods.filter((x) => x !== id) };
}

/** 一键装齐到某层级（作弊器） */
export function installUpToTier(v: Vehicle, tier: ModTier): Vehicle {
  let out = v;
  for (let t = 1; t <= tier; t++) {
    for (const def of modsByTier(t as ModTier)) out = installMod(out, def.id);
  }
  return out;
}

/** 全部装齐 */
export function installAll(v: Vehicle): Vehicle {
  return installUpToTier(v, 8);
}

// ============ 燃料与行驶 ============

/** 加油（负数视为抽油，不低于 0） */
export function refuel(v: Vehicle, liters: number): Vehicle {
  const cap = stats(v).fuelCapacity;
  return { ...v, fuel: Math.max(0, Math.min(cap, v.fuel + liters)) };
}

/** 充电 */
export function charge(v: Vehicle, kwh: number): Vehicle {
  const cap = stats(v).electricRange;
  return { ...v, charge: Math.max(0, Math.min(cap, v.charge + kwh)) };
}

export interface DriveResult {
  vehicle: Vehicle;
  /** 实际行驶里程 */
  km: number;
  /** 消耗燃料 */
  fuelUsed: number;
  /** 消耗电量 */
  chargeUsed: number;
  /** 是否用纯电（静音） */
  silent: boolean;
  /** 是否因燃料耗尽而中途停下 */
  stranded: boolean;
}

/**
 * 行驶。
 * 优先用电（静音），电用尽后切燃油。offroad 为越野比例 0-1。
 */
export function drive(v: Vehicle, km: number, offroad = 0): DriveResult {
  const st = stats(v);
  let remaining = km;
  let chargeUsed = 0;
  let fuelUsed = 0;
  let silent = false;

  // 纯电段
  if (v.charge > 0 && st.electricRange > 0) {
    const electricKm = Math.min(remaining, v.charge);
    chargeUsed = electricKm;
    remaining -= electricKm;
    silent = electricKm > 0;
  }

  // 燃油段
  if (remaining > 0) {
    const eff = st.range / st.fuelCapacity; // km/L
    const needed = remaining / eff;
    if (needed <= v.fuel) {
      fuelUsed = needed;
      remaining = 0;
    } else {
      // 燃料不足
      const canGo = v.fuel * eff;
      fuelUsed = v.fuel;
      remaining -= canGo;
    }
  }

  const actualKm = km - remaining;
  return {
    vehicle: {
      ...v,
      fuel: Math.max(0, v.fuel - fuelUsed),
      charge: Math.max(0, v.charge - chargeUsed),
      hull: Math.max(0, v.hull - km * 0.01) // 每 100km 磨损 1 点
    },
    km: actualKm,
    fuelUsed,
    chargeUsed,
    silent,
    stranded: remaining > 0
  };
}

/** 修复车身 */
export function repair(v: Vehicle, amount: number): Vehicle {
  return { ...v, hull: Math.max(0, Math.min(100, v.hull + amount)) };
}

/** 车身状况 0-1 */
export function hullRatio(v: Vehicle): number {
  return v.hull / 100;
}

/** 是否可越野 */
export function canOffroad(v: Vehicle): boolean {
  return stats(v).wading > 0;
}

/** 是否有私室（远征 H 场景） */
export function hasPrivateRoom(v: Vehicle): boolean {
  return v.mods.includes("private_room");
}

/** 是否可携带无人机 */
export function droneCapacity(v: Vehicle): number {
  return v.mods.includes("drone_rack") ? 2 : 0;
}

/** 火力总值 */
export function firepower(v: Vehicle): number {
  return stats(v).firepower;
}

/** 乘员容量 */
export function crewCapacity(v: Vehicle): number {
  return stats(v).seats;
}

/** 已装改装按层级分组 */
export function modsByInstalledTier(v: Vehicle): Array<{ tier: ModTier; defs: ModDef[] }> {
  const out: Array<{ tier: ModTier; defs: ModDef[] }> = [];
  for (let t = 1; t <= 8; t++) {
    const tier = t as ModTier;
    const defs = v.mods.map((id) => modDef(id)).filter((d): d is ModDef => !!d && d.tier === tier);
    if (defs.length > 0) out.push({ tier, defs });
  }
  return out;
}

/** 最高已装层级 */
export function maxTier(v: Vehicle): ModTier {
  let max = 1 as ModTier;
  for (const id of v.mods) {
    const def = modDef(id);
    if (def && def.tier > max) max = def.tier;
  }
  return max;
}

/** 改装进度 */
export function modProgress(v: Vehicle): { installed: number; total: number; percent: number } {
  const total = MODS.length;
  const installed = v.mods.filter((id) => modDef(id)).length;
  return { installed, total, percent: Math.round((installed / total) * 100) };
}

// ============ 序列化 ============

export interface VehicleJSON {
  id: string;
  name: string;
  mods: string[];
  fuel: number;
  charge: number;
  hull: number;
  atBase: boolean;
}

export function vehicleToJSON(v: Vehicle): VehicleJSON {
  return {
    id: v.id, name: v.name, mods: [...v.mods],
    fuel: v.fuel, charge: v.charge, hull: v.hull, atBase: v.atBase
  };
}

export function vehicleFromJSON(j: VehicleJSON | null | undefined): Vehicle {
  if (!j) return newVehicle();
  return {
    id: j.id ?? "nomad",
    name: j.name ?? "游牧者号",
    mods: (j.mods ?? []).filter((id) => modDef(id)),
    unlockedTiers: [1],
    fuel: j.fuel ?? 0,
    charge: j.charge ?? 0,
    hull: j.hull ?? 100,
    atBase: j.atBase ?? true
  };
}

/** 摘要文本 */
export function describeVehicle(v: Vehicle): string {
  const st = stats(v);
  const parts = [
    `${st.topSpeed}km/h`,
    `续航 ${st.range}km`,
    `${armorLabel(st.armorLevel)}`,
    `载重 ${st.capacity}kg`,
    `${st.seats} 座`
  ];
  if (st.electricRange > 0) parts.push(`电 ${st.electricRange}km`);
  if (st.firepower > 0) parts.push(`火力 ${st.firepower}`);
  return parts.join("　");
}
