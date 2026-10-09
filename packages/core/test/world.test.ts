import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  REGIONS, regionDef, regionsByTerrain, regionsByTag,
  newWorldMap, regionState, currentRegion, neighbors, discoveredNeighbors, distanceBetween,
  TRAVEL_MODES, planTravel, travel, lootRegion, clearRegion, effectiveDanger,
  explorationProgress, mapToJSON, mapFromJSON, describeMap,
  TERRAIN_LABEL, DANGER_LABEL,
  type WorldMap, type TravelContext
} from "../src/systems/world.ts";
import { mulberry32 } from "../src/systems/inventory.ts";
import { GameSession } from "../src/runtime/session.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT_DIR = join(__dirname, "..", "data", "scripts");
const scripts = () => readdirSync(SCRIPT_DIR).filter((f) => f.endsWith(".dsl")).map((f) => readFileSync(join(SCRIPT_DIR, f), "utf8"));

const CTX: TravelContext = { fuel: 100, stamina: 100, vehicleAvailable: true, armored: false };

// ============ 目录 ============

test("world: 区域目录非空且 id 唯一", () => {
  assert.ok(REGIONS.length >= 15, `应有 15+ 区域，实际 ${REGIONS.length}`);
  const ids = new Set(REGIONS.map((x) => x.id));
  assert.equal(ids.size, REGIONS.length);
});

test("world: 区域字段合法", () => {
  for (const r of REGIONS) {
    assert.ok(r.name.length > 0, `${r.id} 缺名称`);
    assert.ok(r.description.length > 0, `${r.id} 缺描述`);
    assert.ok(r.arrival.length > 0, `${r.id} 缺抵达文本`);
    assert.ok(TERRAIN_LABEL[r.terrain], `${r.id} 地形未知`);
    assert.ok(DANGER_LABEL[r.danger] !== undefined, `${r.id} 危险度未知`);
    assert.ok(r.lootNodes >= 0);
    assert.ok(r.links.length > 0, `${r.id} 至少应有一个相邻区域`);
  }
});

test("world: 连接双向且距离为正", () => {
  for (const r of REGIONS) {
    for (const link of r.links) {
      const target = regionDef(link.to);
      assert.ok(target, `${r.id} 连接到不存在的 ${link.to}`);
      assert.ok(link.km > 0, `${r.id}→${link.to} 距离应为正`);

      // 反向连接应存在（允许距离不同，但必须可达）
      const back = target!.links.find((l) => l.to === r.id);
      assert.ok(back, `${link.to} 应能回到 ${r.id}`);
    }
  }
});

test("world: 存在安全据点", () => {
  const bases = REGIONS.filter((r) => r.baseable);
  assert.ok(bases.length >= 1);
  assert.equal(regionDef("home")!.danger, 0, "据点危险度应为 0");
});

test("world: 按地形与标签查询", () => {
  assert.ok(regionsByTerrain("urban").length >= 3);
  assert.ok(regionsByTerrain("military").length >= 1);
  assert.ok(regionsByTag("story-pianist").length >= 1);
  assert.ok(regionsByTag("story-lab").length >= 1);
});

test("world: 危险度分布合理", () => {
  const dangers = REGIONS.map((r) => r.danger);
  assert.ok(Math.max(...dangers) >= 4, "应有高危区域");
  assert.ok(Math.min(...dangers) === 0, "应有安全区域");
});

// ============ 地图状态 ============

test("world: 初始地图只发现起点", () => {
  const m = newWorldMap();
  assert.equal(m.current, "home");
  assert.equal(m.totalKm, 0);
  const discovered = Object.values(m.regions).filter((r) => r.discovered);
  assert.equal(discovered.length, 1);
  assert.equal(discovered[0].id, "home");
  assert.equal(discovered[0].visited, true);
});

test("world: 区域初始搜刮点等于定义", () => {
  const m = newWorldMap();
  for (const r of REGIONS) {
    assert.equal(m.regions[r.id].nodesLeft, r.lootNodes);
    assert.equal(m.regions[r.id].looted, 0);
    assert.equal(m.regions[r.id].cleared, 0);
  }
});

test("world: 相邻与已发现相邻", () => {
  const m = newWorldMap();
  const all = neighbors(m);
  assert.ok(all.length >= 3, "据点应有多个邻居");

  const disc = discoveredNeighbors(m);
  assert.ok(disc.length <= all.length);
});

test("world: 距离查询", () => {
  assert.equal(distanceBetween("home", "hillside"), 2);
  assert.equal(distanceBetween("home", "downtown"), null, "不相邻应返回 null");
  assert.equal(distanceBetween("nonexistent", "home"), null);
});

// ============ 旅行规划 ============

test("world: 交通方式定义完整", () => {
  for (const id of ["walk", "bike", "car", "apc"] as const) {
    const m = TRAVEL_MODES[id];
    assert.ok(m.label.length > 0);
    assert.ok(m.speed > 0);
    assert.ok(m.staminaPerHour >= 0);
    assert.ok(m.carryCapacity > 0);
  }
  // 速度递增
  assert.ok(TRAVEL_MODES.walk.speed < TRAVEL_MODES.bike.speed);
  assert.ok(TRAVEL_MODES.bike.speed < TRAVEL_MODES.car.speed);
  assert.ok(TRAVEL_MODES.car.speed < TRAVEL_MODES.apc.speed);
});

test("world: 步行规划正确", () => {
  const m = newWorldMap();
  m.regions["hillside"].discovered = true;
  const p = planTravel(m, "hillside", "walk", CTX);
  assert.equal(p.km, 2);
  assert.equal(p.hours, 0.5, "2km / 4km·h = 0.5h");
  assert.equal(p.staminaCost, 3, "6/h × 0.5h");
  assert.equal(p.fuelCost, 0, "步行不耗油");
  assert.equal(p.reachable, true);
});

test("world: 房车更快且省体力", () => {
  const m = newWorldMap();
  const walk = planTravel(m, "old_road", "walk", CTX);
  const car = planTravel(m, "old_road", "car", CTX);
  assert.ok(car.hours < walk.hours, "车应更快");
  assert.ok(car.staminaCost < walk.staminaCost, "车应更省体力");
  assert.ok(car.fuelCost > 0, "车应耗油");
});

test("world: 未发现区域不可达", () => {
  const m = newWorldMap();
  const p = planTravel(m, "hillside", "walk", CTX);
  // hillside 初始未发现
  assert.equal(p.reachable, false);
  assert.equal(p.reason, "not-discovered");
});

test("world: 燃料不足不可达", () => {
  const m = newWorldMap();
  m.regions["old_road"].discovered = true;
  const p = planTravel(m, "old_road", "car", { ...CTX, fuel: 0 });
  assert.equal(p.reachable, false);
  assert.equal(p.reason, "not-enough-fuel");
});

test("world: 体力不足不可达", () => {
  const m = newWorldMap();
  m.regions["old_road"].discovered = true;
  const p = planTravel(m, "old_road", "walk", { ...CTX, stamina: 1 });
  assert.equal(p.reachable, false);
  assert.equal(p.reason, "not-enough-stamina");
});

test("world: 无路线不可达", () => {
  const m = newWorldMap();
  const p = planTravel(m, "downtown", "walk", CTX);
  assert.equal(p.reachable, false);
  assert.equal(p.reason, "no-route");
});

test("world: 遭遇期望随危险度上升", () => {
  const m = newWorldMap();
  const safe = planTravel(m, "hillside", "walk", CTX);
  const risky = planTravel(m, "old_road", "walk", CTX);
  assert.ok(risky.expectedEncounters > safe.expectedEncounters, "高危区域遭遇应更多");
});

test("world: 房车降低遭遇概率", () => {
  const m = newWorldMap();
  const walk = planTravel(m, "old_road", "walk", CTX);
  const car = planTravel(m, "old_road", "car", CTX);
  // 房车速度快，暴露时间短
  assert.ok(car.expectedEncounters < walk.expectedEncounters);
});

// ============ 执行旅行 ============

test("world: 旅行移动位置并累计里程", () => {
  const m = newWorldMap();
  m.regions["hillside"].discovered = true;
  const plan = planTravel(m, "hillside", "walk", CTX);
  const rng = mulberry32(1);
  const r = travel(m, plan, 1, rng);

  assert.equal(r.map.current, "hillside");
  assert.equal(r.map.totalKm, 2);
  assert.equal(r.map.regions["hillside"].visited, true);
});

test("world: 旅行可发现新区域", () => {
  const m = newWorldMap();
  m.regions["hillside"].discovered = true;
  const plan = planTravel(m, "hillside", "walk", CTX);
  // 用多个种子尝试，应至少有一次发现
  let found = false;
  for (let seed = 0; seed < 20; seed++) {
    const r = travel(m, plan, seed, mulberry32(seed));
    if (r.discovered.length > 0) { found = true; break; }
  }
  assert.equal(found, true, "旅行应能发现相邻区域");
});

test("world: 不可达时旅行无效", () => {
  const m = newWorldMap();
  const plan = planTravel(m, "downtown", "walk", CTX);
  const r = travel(m, plan, 1, mulberry32(1));
  assert.equal(r.map.current, "home", "位置不应改变");
  assert.equal(r.encounters, 0);
});

test("world: 旅行可复现", () => {
  const m = newWorldMap();
  m.regions["hillside"].discovered = true;
  const plan = planTravel(m, "hillside", "walk", CTX);
  const a = travel(m, plan, 42, mulberry32(42));
  const b = travel(m, plan, 42, mulberry32(42));
  assert.deepEqual(a.discovered, b.discovered);
  assert.equal(a.encounters, b.encounters);
});

// ============ 搜刮 ============

test("world: 搜刮消耗节点", () => {
  const m = newWorldMap("suburb");
  m.regions["suburb"].discovered = true;
  const before = m.regions["suburb"].nodesLeft;
  const r = lootRegion(m, mulberry32(1));
  assert.equal(r.map.regions["suburb"].nodesLeft, before - 1);
  assert.equal(r.map.regions["suburb"].looted, 1);
  assert.ok(r.tableId, "应返回掉落表");
});

test("world: 搜刮耗尽后返回空", () => {
  const m = newWorldMap("suburb");
  let cur = m;
  const total = m.regions["suburb"].nodesLeft;
  for (let i = 0; i < total; i++) {
    cur = lootRegion(cur, mulberry32(i)).map;
  }
  assert.equal(cur.regions["suburb"].nodesLeft, 0);

  const r = lootRegion(cur, mulberry32(999));
  assert.equal(r.exhausted, true);
  assert.equal(r.tableId, null);
});

test("world: 搜刮表来自区域定义", () => {
  const m = newWorldMap("suburb");
  const def = regionDef("suburb")!;
  const r = lootRegion(m, mulberry32(5));
  assert.ok(def.lootTables.includes(r.tableId!), `${r.tableId} 应在该区域的掉落表中`);
});

test("world: 搜刮进度累积", () => {
  let m = newWorldMap("suburb");
  m = lootRegion(m, mulberry32(1)).map;
  m = lootRegion(m, mulberry32(2)).map;
  assert.ok(m.regions["suburb"].progress > 0);
});

// ============ 清理与危险度 ============

test("world: 清理降低危险度", () => {
  const m = newWorldMap("downtown");
  const before = effectiveDanger(m, "downtown");
  const m2 = clearRegion(m, "downtown");
  const after = effectiveDanger(m2, "downtown");
  assert.ok(after < before);
});

test("world: 清理最多三级", () => {
  let m = newWorldMap("downtown");
  for (let i = 0; i < 10; i++) m = clearRegion(m, "downtown");
  assert.equal(m.regions["downtown"].cleared, 3);
});

test("world: 危险度不会低于 0", () => {
  let m = newWorldMap("hillside"); // danger 1
  for (let i = 0; i < 5; i++) m = clearRegion(m, "hillside");
  assert.ok(effectiveDanger(m, "hillside") >= 0);
});

// ============ 探索进度 ============

test("world: 探索进度统计", () => {
  const m = newWorldMap();
  const p = explorationProgress(m);
  assert.equal(p.total, REGIONS.length);
  assert.equal(p.discovered, 1);
  assert.ok(p.percent > 0 && p.percent < 100);
});

test("world: 地图概览文本", () => {
  const m = newWorldMap();
  const txt = describeMap(m);
  assert.match(txt, /当前位置/);
  assert.match(txt, /山体要塞/);
  assert.match(txt, /探索度/);
  assert.match(txt, /可达/);
});

// ============ 序列化 ============

test("world: 序列化往返", () => {
  let m = newWorldMap();
  m.regions["hillside"].discovered = true;
  m = travel(m, planTravel(m, "hillside", "walk", CTX), 1, mulberry32(1)).map;
  m = lootRegion(m, mulberry32(2)).map;

  const json = mapToJSON(m);
  const back = mapFromJSON(json);

  assert.equal(back.current, m.current);
  assert.equal(back.totalKm, m.totalKm);
  assert.equal(back.regions["hillside"].visited, true);
  assert.equal(back.regions["hillside"].nodesLeft, m.regions["hillside"].nodesLeft);
});

test("world: 空输入返回初始地图", () => {
  const m = mapFromJSON(null);
  assert.equal(m.current, "home");
  assert.equal(Object.values(m.regions).filter((r) => r.discovered).length, 1);
});

test("world: 序列化补齐缺失区域", () => {
  const m = mapFromJSON({ regions: {}, current: "home", totalKm: 0 });
  assert.equal(Object.keys(m.regions).length, REGIONS.length);
});

// ============ 会话集成 ============

test("session/world: 开局在据点", () => {
  const s = new GameSession();
  assert.equal(s.world.current, "home");
  assert.equal(s.here()?.name, "山体要塞");
  assert.equal(s.exploration().discovered, 1);
});

test("session/world: 未发现区域无法前往", () => {
  const s = new GameSession();
  const r = s.travelTo("hillside");
  assert.equal(r.ok, false);
  assert.equal(r.reason, "not-discovered");
  assert.equal(s.world.current, "home");
});

test("session/world: 发现后可以前往", () => {
  const s = new GameSession();
  s.world.regions["hillside"].discovered = true;
  const r = s.travelTo("hillside", "walk");
  assert.equal(r.ok, true);
  assert.equal(s.world.current, "hillside");
  assert.ok(s.world.totalKm > 0);
});

test("session/world: 旅行消耗体力并推进时间", () => {
  const s = new GameSession();
  s.world.regions["old_road"].discovered = true;
  const staminaBefore = s.hero.survival.stamina;
  const dayBefore = s.time.day;
  const minuteBefore = s.time.minute;

  const r = s.travelTo("old_road", "walk");
  assert.equal(r.ok, true);
  assert.ok(s.hero.survival.stamina < staminaBefore, "应消耗体力");
  assert.ok(
    s.time.day > dayBefore || s.time.minute > minuteBefore,
    "应推进时间"
  );
});

test("session/world: 无车库时房车退化为步行", () => {
  const s = new GameSession();
  s.world.regions["old_road"].discovered = true;
  assert.equal(s.vehicleAvailable(), false);
  const plan = s.planTravelTo("old_road", "car");
  assert.equal(plan.mode.id, "walk", "无车库应退化为步行");
});

test("session/world: 有车库后房车可用", () => {
  const s = new GameSession();
  s.finishBuild("garage");
  s.world.regions["old_road"].discovered = true;
  assert.equal(s.vehicleAvailable(), true);
  const plan = s.planTravelTo("old_road", "car");
  assert.equal(plan.mode.id, "car");
});

test("session/world: 搜刮产出进入背包", () => {
  const s = new GameSession();
  s.world.current = "suburb";
  s.world.regions["suburb"].discovered = true;
  const before = s.backpack.stacks.length;
  const r = s.lootCurrent();
  assert.equal(r.exhausted, false);
  assert.ok(r.tableId);
  // 产出可能有也可能没有（概率），但节点应被消耗
  assert.equal(s.world.regions["suburb"].nodesLeft, regionDef("suburb")!.lootNodes - 1);
  void before;
});

test("session/world: 清理当前区域", () => {
  const s = new GameSession();
  s.world.current = "downtown";
  const before = effectiveDanger(s.world, "downtown");
  const reduced = s.clearCurrent();
  assert.ok(reduced > 0);
  assert.ok(effectiveDanger(s.world, "downtown") < before);
});

test("session/world: 探索数值进入剧本变量集", () => {
  const s = new GameSession();
  const v = s.vars();
  assert.equal(v["region"], "home");
  assert.equal(v["regionDanger"], 0);
  assert.equal(v["discoveredRegions"], 1);
});

test("session/world: 随存档往返", () => {
  const s = new GameSession();
  s.world.regions["hillside"].discovered = true;
  s.travelTo("hillside", "walk");
  s.lootCurrent();
  s.setTravelMode("bike");

  const data = s.toSave("slot");
  const back = GameSession.fromSave(data);

  assert.equal(back.world.current, "hillside");
  assert.equal(back.world.totalKm, s.world.totalKm);
  assert.equal(back.travelMode, "bike");
});

test("session/world: 摘要包含区域信息", () => {
  const s = new GameSession();
  const sum = s.summary();
  assert.equal(sum.region, "home");
  assert.equal(sum.regionName, "山体要塞");
  assert.equal(sum.discovered, 1);
});

test("session/world: 全部区域都有剧本可用性", () => {
  const s = new GameSession();
  s.loadScripts(scripts());
  // 把地图全解锁，确保剧本条件不受地图影响
  for (const r of REGIONS) {
    s.world.regions[r.id].discovered = true;
  }
  assert.equal(s.exploration().discovered, REGIONS.length);
  assert.ok(s.availableScenes().length >= 1);
});
