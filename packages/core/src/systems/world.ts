/**
 * 探索与地图系统。
 *
 * 定位：
 *  - 世界由若干「区域」构成，区域之间有连接与距离
 *  - 移动消耗时间与体力，途中可能遭遇
 *  - 每个区域有危险度、搜刮点、资源、特殊事件
 *  - 远征以房车为载具，速度与续航受车辆改装影响
 *
 * 纯函数式，不触碰 IO。
 */

export type TerrainKind =
  | "base"       // 据点（安全）
  | "urban"      // 城市废墟
  | "residential"// 居民区
  | "industrial" // 工业区
  | "forest"     // 林地
  | "mountain"   // 山地
  | "road"       // 公路
  | "rural"      // 郊野
  | "coast"      // 海岸
  | "lab"        // 研究设施
  | "military";  // 军事区

export const TERRAIN_LABEL: Record<TerrainKind, string> = {
  base: "据点",
  urban: "城市废墟",
  residential: "居民区",
  industrial: "工业区",
  forest: "林地",
  mountain: "山地",
  road: "公路",
  rural: "郊野",
  coast: "海岸",
  lab: "研究设施",
  military: "军事区"
};

/** 危险等级 */
export type DangerLevel = 0 | 1 | 2 | 3 | 4 | 5;

export const DANGER_LABEL: Record<DangerLevel, string> = {
  0: "安全", 1: "低危", 2: "中危", 3: "高危", 4: "极危", 5: "死地"
};

export interface RegionDef {
  id: string;
  name: string;
  terrain: TerrainKind;
  danger: DangerLevel;
  description: string;
  /** 相邻区域 id 与距离（公里） */
  links: Array<{ to: string; km: number }>;
  /** 搜刮点数量 */
  lootNodes: number;
  /** 可用的掉落表 id */
  lootTables: string[];
  /** 是否可作为据点 */
  baseable?: boolean;
  /** 特殊标记 */
  tags?: string[];
  /** 首次进入的文字描述 */
  arrival: string;
}

/** 已探索状态 */
export interface RegionState {
  id: string;
  discovered: boolean;
  visited: boolean;
  /** 已搜刮次数 */
  looted: number;
  /** 剩余搜刮点 */
  nodesLeft: number;
  /** 危险度是否因清理而下降 */
  cleared: number;
  /** 探索进度 0-1 */
  progress: number;
}

export interface WorldMap {
  regions: Record<string, RegionState>;
  /** 当前位置 */
  current: string;
  /** 累计旅行里程 */
  totalKm: number;
}

// ============ 世界定义 ============

export const REGIONS: RegionDef[] = [
  {
    id: "home",
    name: "山体要塞",
    terrain: "base",
    danger: 0,
    description: "你的据点。地表是现代风格的安全屋，山体内是避难所。",
    links: [
      { to: "hillside", km: 2 },
      { to: "forest_north", km: 6 },
      { to: "old_road", km: 9 }
    ],
    lootNodes: 0,
    lootTables: [],
    baseable: true,
    tags: ["safe", "home"],
    arrival: "你回到了要塞。门禁识别通过，灯光亮起。"
  },
  {
    id: "hillside",
    name: "山腰观察点",
    terrain: "mountain",
    danger: 1,
    description: "能俯瞰周边的高点，适合侦察。",
    links: [
      { to: "home", km: 2 },
      { to: "forest_north", km: 4 },
      { to: "old_road", km: 7 }
    ],
    lootNodes: 1,
    lootTables: ["residential"],
    tags: ["vantage"],
    arrival: "山风很大。从这里能看见远处公路上的废弃车队。"
  },
  {
    id: "forest_north",
    name: "北侧林地",
    terrain: "forest",
    danger: 2,
    description: "针叶林，有野生动物与采集点。",
    links: [
      { to: "home", km: 6 },
      { to: "hillside", km: 4 },
      { to: "rural_east", km: 8 }
    ],
    lootNodes: 3,
    lootTables: ["residential"],
    tags: ["forage", "wildlife"],
    arrival: "林子里很安静。地上有新鲜的兽迹。"
  },
  {
    id: "old_road",
    name: "废弃公路",
    terrain: "road",
    danger: 2,
    description: "通往城区的旧国道，两侧有抛锚车辆。",
    links: [
      { to: "home", km: 9 },
      { to: "hillside", km: 7 },
      { to: "suburb", km: 12 },
      { to: "industrial_west", km: 15 }
    ],
    lootNodes: 4,
    lootTables: ["ruins", "workshop"],
    tags: ["road"],
    arrival: "公路被废弃车辆堵了一半。空气里有汽油味。"
  },
  {
    id: "rural_east",
    name: "东郊农庄",
    terrain: "rural",
    danger: 1,
    description: "废弃农场，有温室与地下水井。",
    links: [
      { to: "forest_north", km: 8 },
      { to: "suburb", km: 10 }
    ],
    lootNodes: 3,
    lootTables: ["residential", "pharmacy"],
    tags: ["farm", "water"],
    arrival: "农庄的温室骨架还在。井盖被人撬开过。"
  },
  {
    id: "industrial_west",
    name: "西区工业园",
    terrain: "industrial",
    danger: 3,
    description: "工厂与仓库群，物资丰富但危险。",
    links: [
      { to: "old_road", km: 15 },
      { to: "suburb", km: 11 },
      { to: "military_checkpoint", km: 18 },
      { to: "airfield", km: 20 }
    ],
    lootNodes: 5,
    lootTables: ["workshop", "military"],
    tags: ["factory"],
    arrival: "厂房的卷帘门半开着。里面有金属摩擦的声音。"
  },
  {
    id: "suburb",
    name: "城南居民区",
    terrain: "residential",
    danger: 2,
    description: "密集住宅区，适合搜刮生活物资。",
    links: [
      { to: "old_road", km: 12 },
      { to: "rural_east", km: 10 },
      { to: "industrial_west", km: 11 },
      { to: "downtown", km: 8 },
      { to: "school", km: 5 },
      { to: "adult_district", km: 6 }
    ],
    lootNodes: 6,
    lootTables: ["residential", "pharmacy"],
    tags: ["houses"],
    arrival: "一整片安静的房子。有些门是开着的，有些从里面被钉死。"
  },
  {
    id: "school",
    name: "城南大学",
    terrain: "urban",
    danger: 2,
    description: "大学校园，有图书馆与实验楼。",
    links: [
      { to: "suburb", km: 5 },
      { to: "downtown", km: 7 }
    ],
    lootNodes: 4,
    lootTables: ["lab", "residential"],
    tags: ["knowledge"],
    arrival: "教学楼的广播还在循环播放疏散通知。电池快没电了。"
  },
  {
    id: "downtown",
    name: "市中心废墟",
    terrain: "urban",
    danger: 4,
    description: "高楼林立的旧城区，高价值物资与高密度威胁。",
    links: [
      { to: "suburb", km: 8 },
      { to: "school", km: 7 },
      { to: "hospital", km: 6 },
      { to: "theater", km: 4 },
      { to: "coast_south", km: 20 },
      { to: "adult_district", km: 9 }
    ],
    lootNodes: 8,
    lootTables: ["ruins", "pharmacy", "military"],
    tags: ["dense", "high-value"],
    arrival: "街道上全是碎玻璃。远处的楼里传来低沉的呻吟。"
  },
  {
    id: "hospital",
    name: "市立医院",
    terrain: "urban",
    danger: 4,
    description: "大型医院，药品与器械集中。",
    links: [
      { to: "downtown", km: 6 },
      { to: "lab_underground", km: 9 }
    ],
    lootNodes: 6,
    lootTables: ["pharmacy", "lab"],
    tags: ["medical"],
    arrival: "急诊大厅的灯还在闪。地上有拖行的血痕。"
  },
  {
    id: "theater",
    name: "旧剧院",
    terrain: "urban",
    danger: 3,
    description: "废弃剧院，传闻夜里能听到钢琴声。",
    links: [
      { to: "downtown", km: 4 }
    ],
    lootNodes: 3,
    lootTables: ["residential", "lab"],
    tags: ["story-pianist"],
    arrival: "舞台的幕布还挂着。观众席的座椅蒙了灰。"
  },
  {
    id: "military_checkpoint",
    name: "军方检查站",
    terrain: "military",
    danger: 5,
    description: "被放弃的检查站，军械库可能还有货。",
    links: [
      { to: "industrial_west", km: 18 },
      { to: "radio_station", km: 22 },
      { to: "airfield", km: 14 }
    ],
    lootNodes: 6,
    lootTables: ["military"],
    tags: ["military", "high-risk"],
    arrival: "铁丝网还立着。沙袋后面有已经干掉的痕迹。"
  },
  {
    id: "radio_station",
    name: "山顶电台",
    terrain: "mountain",
    danger: 4,
    description: "能覆盖半个城市的发射塔。",
    links: [
      { to: "military_checkpoint", km: 22 },
      { to: "coast_south", km: 26 }
    ],
    lootNodes: 3,
    lootTables: ["lab", "military"],
    tags: ["story-broadcast"],
    arrival: "发射塔的红色警示灯还在慢闪。频率上有人。"
  },
  {
    id: "lab_underground",
    name: "地下研究所",
    terrain: "lab",
    danger: 5,
    description: "封锁的研究设施，基因资料与样本。",
    links: [
      { to: "hospital", km: 9 }
    ],
    lootNodes: 5,
    lootTables: ["lab"],
    tags: ["story-lab", "high-value"],
    arrival: "气密门需要门禁卡。门缝里有冷气漏出来。"
  },
  {
    id: "coast_south",
    name: "南部海岸",
    terrain: "coast",
    danger: 3,
    description: "海边小镇，有船坞与渔具。",
    links: [
      { to: "downtown", km: 20 },
      { to: "radio_station", km: 26 }
    ],
    lootNodes: 5,
    lootTables: ["residential", "workshop"],
    tags: ["coast"],
    arrival: "海风里带着咸味。渔船还拴在码头上。"
  },
  {
    id: "airfield",
    name: "小型机场",
    terrain: "road",
    danger: 4,
    description: "民用机场，机库与塔台。",
    links: [
      { to: "military_checkpoint", km: 14 },
      { to: "industrial_west", km: 20 }
    ],
    lootNodes: 4,
    lootTables: ["military", "workshop"],
    tags: ["story-pilot"],
    arrival: "跑道上有一架歪斜的小飞机。塔台的窗玻璃碎了。"
  },
  {
    id: "adult_district",
    name: "老城区商业街",
    terrain: "urban",
    danger: 2,
    description: "包含一家成人用品店与几家药妆店。",
    links: [
      { to: "suburb", km: 6 },
      { to: "downtown", km: 9 }
    ],
    lootNodes: 4,
    lootTables: ["adult_shop", "pharmacy", "residential"],
    tags: ["adult"],
    arrival: "卷帘门被撬开过。橱窗里的东西还摆着。"
  }
];

const BY_ID = new Map(REGIONS.map((x) => [x.id, x]));

export function regionDef(id: string): RegionDef | undefined {
  return BY_ID.get(id);
}

export function regionsByTerrain(t: TerrainKind): RegionDef[] {
  return REGIONS.filter((x) => x.terrain === t);
}

export function regionsByTag(tag: string): RegionDef[] {
  return REGIONS.filter((x) => x.tags?.includes(tag));
}

// ============ 地图状态 ============

export function newWorldMap(startId = "home"): WorldMap {
  const regions: Record<string, RegionState> = {};
  for (const r of REGIONS) {
    regions[r.id] = {
      id: r.id,
      discovered: r.id === startId,
      visited: false,
      looted: 0,
      nodesLeft: r.lootNodes,
      cleared: 0,
      progress: 0
    };
  }
  // 起点自动标记为已访问
  if (regions[startId]) regions[startId].visited = true;
  return { regions, current: startId, totalKm: 0 };
}

export function regionState(map: WorldMap, id: string): RegionState | undefined {
  return map.regions[id];
}

/** 当前位置定义 */
export function currentRegion(map: WorldMap): RegionDef | undefined {
  return regionDef(map.current);
}

/** 可达区域（相邻） */
export function neighbors(map: WorldMap, id = map.current): Array<{ def: RegionDef; km: number }> {
  const def = regionDef(id);
  if (!def) return [];
  const out: Array<{ def: RegionDef; km: number }> = [];
  for (const link of def.links) {
    const target = regionDef(link.to);
    if (target) out.push({ def: target, km: link.km });
  }
  return out;
}

/** 已发现的相邻区域 */
export function discoveredNeighbors(map: WorldMap, id = map.current): Array<{ def: RegionDef; km: number }> {
  return neighbors(map, id).filter((x) => map.regions[x.def.id]?.discovered);
}

/** 两点距离（直接相连时） */
export function distanceBetween(from: string, to: string): number | null {
  const def = regionDef(from);
  if (!def) return null;
  const link = def.links.find((l) => l.to === to);
  return link ? link.km : null;
}

// ============ 旅行 ============

export interface TravelMode {
  id: "walk" | "bike" | "car" | "apc";
  label: string;
  /** 速度 km/h */
  speed: number;
  /** 每小时体力消耗 */
  staminaPerHour: number;
  /** 每小时燃料消耗（0 表示不用燃料） */
  fuelPerHour: number;
  /** 遭遇概率倍率 */
  encounterMult: number;
  /** 负重上限 */
  carryCapacity: number;
}

export const TRAVEL_MODES: Record<TravelMode["id"], TravelMode> = {
  walk: { id: "walk", label: "步行", speed: 4, staminaPerHour: 6, fuelPerHour: 0, encounterMult: 1.3, carryCapacity: 25 },
  bike: { id: "bike", label: "自行车", speed: 12, staminaPerHour: 4, fuelPerHour: 0, encounterMult: 1.1, carryCapacity: 35 },
  car: { id: "car", label: "房车", speed: 40, staminaPerHour: 1, fuelPerHour: 1.2, encounterMult: 0.7, carryCapacity: 200 },
  apc: { id: "apc", label: "装甲房车", speed: 55, staminaPerHour: 0.5, fuelPerHour: 1.8, encounterMult: 0.4, carryCapacity: 350 }
};

export interface TravelPlan {
  from: string;
  to: string;
  km: number;
  mode: TravelMode;
  hours: number;
  staminaCost: number;
  fuelCost: number;
  /** 遭遇次数期望 */
  expectedEncounters: number;
  reachable: boolean;
  reason?: "no-route" | "not-discovered" | "not-enough-fuel" | "not-enough-stamina";
}

export interface TravelContext {
  fuel: number;
  stamina: number;
  /** 车辆是否可用（未改装则只有步行/自行车） */
  vehicleAvailable: boolean;
  armored: boolean;
}

/** 规划一次旅行 */
export function planTravel(map: WorldMap, to: string, modeId: TravelMode["id"], ctx: TravelContext): TravelPlan {
  const mode = TRAVEL_MODES[modeId];
  const km = distanceBetween(map.current, to);
  const target = regionDef(to);

  if (km === null || !target) {
    return {
      from: map.current, to, km: 0, mode, hours: 0, staminaCost: 0, fuelCost: 0,
      expectedEncounters: 0, reachable: false, reason: "no-route"
    };
  }

  const hours = km / mode.speed;
  const staminaCost = mode.staminaPerHour * hours;
  const fuelCost = mode.fuelPerHour * hours;

  // 遭遇期望：危险度 × 距离 × 模式倍率
  const expectedEncounters = (target.danger / 5) * (km / 10) * mode.encounterMult;

  let reachable = true;
  let reason: TravelPlan["reason"];
  if (!map.regions[to]?.discovered) { reachable = false; reason = "not-discovered"; }
  else if (fuelCost > ctx.fuel) { reachable = false; reason = "not-enough-fuel"; }
  else if (staminaCost > ctx.stamina) { reachable = false; reason = "not-enough-stamina"; }

  return {
    from: map.current, to, km, mode, hours, staminaCost, fuelCost,
    expectedEncounters, reachable, reason
  };
}

export interface TravelResult {
  map: WorldMap;
  plan: TravelPlan;
  /** 途中发现的区域 */
  discovered: string[];
  /** 遭遇次数（确定性随机） */
  encounters: number;
}

/**
 * 执行旅行。
 * 使用确定性随机（seed 通常为天数+分钟）保证可复现。
 */
export function travel(map: WorldMap, plan: TravelPlan, seed: number, rng: () => number): TravelResult {
  if (!plan.reachable) return { map, plan, discovered: [], encounters: 0 };

  const regions = { ...map.regions };
  const discovered: string[] = [];

  // 抵达目标
  const cur = regions[plan.to];
  if (cur) {
    regions[plan.to] = { ...cur, discovered: true, visited: true, progress: Math.max(cur.progress, 0.3) };
  }

  // 途中可能发现相邻区域
  const targetDef = regionDef(plan.to);
  if (targetDef) {
    for (const link of targetDef.links) {
      if (regions[link.to]?.discovered) continue;
      // 距离越近越容易发现
      const chance = Math.max(0.15, 0.6 - link.km / 40);
      if (rng() < chance) {
        regions[link.to] = { ...regions[link.to], discovered: true };
        discovered.push(link.to);
      }
    }
  }

  // 遭遇次数
  let encounters = Math.floor(plan.expectedEncounters);
  const frac = plan.expectedEncounters - encounters;
  if (rng() < frac) encounters++;

  void seed;

  return {
    map: { regions, current: plan.to, totalKm: map.totalKm + plan.km },
    plan,
    discovered,
    encounters
  };
}

// ============ 搜刮 ============

export interface LootNodeResult {
  map: WorldMap;
  tableId: string | null;
  seed: number;
  exhausted: boolean;
}

/**
 * 在当前区域搜刮一次。
 * 返回用于掉落表的 tableId 与种子；实际产出入库由调用方（会话）处理。
 */
export function lootRegion(map: WorldMap, rng: () => number): LootNodeResult {
  const def = regionDef(map.current);
  const st = map.regions[map.current];
  if (!def || !st || st.nodesLeft <= 0) {
    return { map, tableId: null, seed: 0, exhausted: true };
  }

  const tableId = def.lootTables[Math.floor(rng() * def.lootTables.length)] ?? def.lootTables[0] ?? null;
  const seed = Math.floor(rng() * 1_000_000);

  const regions = {
    ...map.regions,
    [map.current]: {
      ...st,
      nodesLeft: st.nodesLeft - 1,
      looted: st.looted + 1,
      progress: Math.min(1, (st.looted + 1) / Math.max(1, def.lootNodes))
    }
  };

  return { map: { ...map, regions }, tableId, seed, exhausted: false };
}

/** 清理区域（降低危险度） */
export function clearRegion(map: WorldMap, id: string): WorldMap {
  const st = map.regions[id];
  if (!st) return map;
  return {
    ...map,
    regions: { ...map.regions, [id]: { ...st, cleared: Math.min(3, st.cleared + 1) } }
  };
}

/** 有效危险度（被清理后下降） */
export function effectiveDanger(map: WorldMap, id: string): number {
  const def = regionDef(id);
  const st = map.regions[id];
  if (!def) return 0;
  const reduce = (st?.cleared ?? 0);
  return Math.max(0, def.danger - reduce);
}

/** 探索进度 */
export function explorationProgress(map: WorldMap): { discovered: number; total: number; percent: number } {
  const total = REGIONS.length;
  const discovered = Object.values(map.regions).filter((r) => r.discovered).length;
  return { discovered, total, percent: Math.round((discovered / total) * 100) };
}

// ============ 序列化 ============

export interface WorldMapJSON {
  regions: Record<string, RegionState>;
  current: string;
  totalKm: number;
}

export function mapToJSON(map: WorldMap): WorldMapJSON {
  return { regions: map.regions, current: map.current, totalKm: map.totalKm };
}

export function mapFromJSON(j: WorldMapJSON | null | undefined): WorldMap {
  if (!j) return newWorldMap();
  const base = newWorldMap(j.current ?? "home");
  const regions: Record<string, RegionState> = {};
  for (const r of REGIONS) {
    const saved = j.regions?.[r.id];
    regions[r.id] = saved
      ? {
          id: r.id,
          discovered: !!saved.discovered,
          visited: !!saved.visited,
          looted: saved.looted ?? 0,
          nodesLeft: saved.nodesLeft ?? r.lootNodes,
          cleared: saved.cleared ?? 0,
          progress: saved.progress ?? 0
        }
      : base.regions[r.id];
  }
  return { regions, current: j.current ?? "home", totalKm: j.totalKm ?? 0 };
}

/** 地图文本概览 */
export function describeMap(map: WorldMap): string {
  const cur = currentRegion(map);
  const prog = explorationProgress(map);
  const lines: string[] = [];
  lines.push(`当前位置：${cur?.name ?? map.current}（${cur ? TERRAIN_LABEL[cur.terrain] : "?"}，危险 ${cur ? DANGER_LABEL[effectiveDanger(map, cur.id) as DangerLevel] : "?"}）`);
  lines.push(`探索度：${prog.discovered}/${prog.total}（${prog.percent}%）　累计里程 ${map.totalKm} km`);
  const ns = neighbors(map);
  if (ns.length > 0) {
    lines.push("可达：");
    for (const n of ns) {
      const st = map.regions[n.def.id];
      const mark = st?.discovered ? "" : "（未发现）";
      lines.push(`  · ${n.def.name} ${n.km}km ${DANGER_LABEL[n.def.danger]}${mark}`);
    }
  }
  return lines.join("\n");
}
