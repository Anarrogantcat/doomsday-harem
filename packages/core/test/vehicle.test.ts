import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  MODS, modDef, modsByTier, modsBySlot,
  newVehicle, hasMod, stats, armorLabel,
  checkMod, installMod, removeMod, installUpToTier, installAll,
  refuel, charge, drive, repair, hullRatio, canOffroad,
  hasPrivateRoom, droneCapacity, firepower, crewCapacity,
  modsByInstalledTier, maxTier, modProgress,
  vehicleToJSON, vehicleFromJSON, describeVehicle,
  VEHICLE_SLOT_LABEL, BASE_STATS,
  type Vehicle, type ModTier, type VehicleSlot
} from "../src/systems/vehicle.ts";
import { newContainer, add, missingFor } from "../src/systems/inventory.ts";
import { GameSession } from "../src/runtime/session.ts";

const missing = (c: ReturnType<typeof newContainer>) => (cost: Record<string, number>) => missingFor(c, cost);

// ============ 目录 ============

test("vehicle: 改装目录非空且 id 唯一", () => {
  assert.ok(MODS.length >= 20, `应有 20+ 改装，实际 ${MODS.length}`);
  const ids = new Set(MODS.map((x) => x.id));
  assert.equal(ids.size, MODS.length);
});

test("vehicle: 改装字段合法", () => {
  for (const def of MODS) {
    assert.ok(def.name.length > 0, `${def.id} 缺名称`);
    assert.ok(def.description.length > 0, `${def.id} 缺描述`);
    assert.ok(def.tier >= 1 && def.tier <= 8, `${def.id} 层级越界`);
    assert.ok(VEHICLE_SLOT_LABEL[def.slot], `${def.id} 槽位未知`);
    assert.ok(def.hours > 0, `${def.id} 工时应为正`);
    assert.ok(Object.keys(def.cost).length > 0, `${def.id} 缺消耗`);
  }
});

test("vehicle: 前置改装引用有效", () => {
  for (const def of MODS) {
    for (const req of def.requires) {
      const r = modDef(req);
      assert.ok(r, `${def.id} 前置 ${req} 不存在`);
      assert.ok(r!.tier < def.tier, `${def.id} 的前置 ${req} 层级应更低`);
    }
  }
});

test("vehicle: 八个层级都有改装", () => {
  for (let t = 1; t <= 8; t++) {
    assert.ok(modsByTier(t as ModTier).length > 0, `T${t} 应有改装`);
  }
});

test("vehicle: 槽位覆盖完整", () => {
  const slots = new Set(MODS.map((x) => x.slot));
  for (const s of ["armor", "engine", "power", "weapon", "storage", "living", "comm", "utility"] as VehicleSlot[]) {
    assert.ok(slots.has(s), `缺少槽位 ${s}`);
  }
});

test("vehicle: 设计中的关键改装存在", () => {
  const need = [
    "solar_panel", "toolbox", "storage_basic", "aux_tank", "armor_b1",
    "weapon_rack", "armor_b4", "kitchen", "comm_terminal", "armor_b6",
    "medical_bay", "battery_pack", "private_room", "weapon_mount", "radar",
    "water_tank", "remote_weapon", "terrain_kit", "camp_ext",
    "tactical_center", "ammo_feed", "drone_rack", "ultimate"
  ];
  for (const id of need) assert.ok(modDef(id), `缺少改装 ${id}`);
});

// ============ 初始状态 ============

test("vehicle: 初始为普通房车", () => {
  const v = newVehicle();
  assert.equal(v.mods.length, 0);
  assert.equal(v.fuel, 200);
  assert.equal(v.hull, 100);
  assert.equal(v.atBase, true);

  const st = stats(v);
  assert.equal(st.armorLevel, 0);
  assert.equal(st.firepower, 0);
  assert.equal(st.range, 600, "初始续航 600km");
  assert.equal(st.topSpeed, 90);
  assert.equal(st.electricRange, 0);
});

test("vehicle: 初始无任何能力", () => {
  const v = newVehicle();
  assert.equal(hasPrivateRoom(v), false);
  assert.equal(droneCapacity(v), 0);
  assert.equal(canOffroad(v), false);
  assert.equal(firepower(v), 0);
});

// ============ 安装 ============

test("vehicle: 安装改装", () => {
  let v = newVehicle();
  v = installMod(v, "solar_panel");
  assert.equal(hasMod(v, "solar_panel"), true);
  assert.equal(stats(v).powerOutput, 2);
});

test("vehicle: 重复安装幂等", () => {
  let v = installMod(newVehicle(), "solar_panel");
  v = installMod(v, "solar_panel");
  assert.equal(v.mods.filter((x) => x === "solar_panel").length, 1);
});

test("vehicle: 未知改装被忽略", () => {
  const v = installMod(newVehicle(), "nonexistent");
  assert.equal(v.mods.length, 0);
});

test("vehicle: 卸载改装", () => {
  let v = installMod(newVehicle(), "solar_panel");
  v = removeMod(v, "solar_panel");
  assert.equal(hasMod(v, "solar_panel"), false);
  assert.equal(stats(v).powerOutput, 0);
});

test("vehicle: 数值累加", () => {
  let v = newVehicle();
  v = installMod(v, "armor_b1");
  assert.equal(stats(v).armorLevel, 1);
  v = installMod(v, "armor_b4");
  assert.equal(stats(v).armorLevel, 4, "1 + 3 = 4");
  v = installMod(v, "armor_b6");
  assert.equal(stats(v).armorLevel, 6, "4 + 2 = 6");
});

test("vehicle: 装甲上限 B7", () => {
  let v = installAll(newVehicle());
  assert.equal(stats(v).armorLevel, 7, "不应超过 B7");
});

test("vehicle: 静音下限 30dB", () => {
  let v = installAll(newVehicle());
  assert.ok(stats(v).noiseDb >= 30, `静音不应低于 30dB，实际 ${stats(v).noiseDb}`);
});

test("vehicle: 一键装到指定层级", () => {
  const v = installUpToTier(newVehicle(), 4);
  for (const def of MODS.filter((x) => x.tier <= 4)) {
    assert.equal(hasMod(v, def.id), true, `T${def.tier} 的 ${def.id} 应已安装`);
  }
  assert.equal(hasMod(v, "weapon_mount"), false, "T5 不应安装");
});

test("vehicle: 全装齐", () => {
  const v = installAll(newVehicle());
  assert.equal(v.mods.length, MODS.length);
  const p = modProgress(v);
  assert.equal(p.percent, 100);
});

// ============ 检查 ============

test("vehicle: 已安装时拒绝重复", () => {
  const v = installMod(newVehicle(), "solar_panel");
  const c = newContainer(1000, 50);
  const check = checkMod(v, modDef("solar_panel")!, [], missing(c));
  assert.equal(check.reason, "already");
});

test("vehicle: 缺前置时拒绝", () => {
  const v = newVehicle();
  const c = add(newContainer(1000, 50), "armor_plate", 100).container;
  const check = checkMod(v, modDef("armor_b4")!, ["shelter_power"], missing(c));
  assert.equal(check.reason, "missing-prereq");
  assert.ok(check.missing.includes("armor_b1"));
});

test("vehicle: 缺科技时拒绝", () => {
  const v = newVehicle();
  const c = add(newContainer(1000, 50), "solar_panel", 100).container;
  const check = checkMod(v, modDef("solar_panel")!, [], missing(c));
  assert.equal(check.reason, "missing-tech");
  assert.ok(check.missingTech.includes("shelter_power"));
});

test("vehicle: 缺材料时拒绝", () => {
  const v = newVehicle();
  const check = checkMod(v, modDef("solar_panel")!, ["shelter_power"], missing(newContainer(1000, 50)));
  assert.equal(check.reason, "missing-resource");
  assert.ok(Object.keys(check.missingResource).length > 0);
});

test("vehicle: 条件齐备时通过", () => {
  const v = newVehicle();
  const c = add(newContainer(1000, 50), "solar_panel", 10).container;
  const c2 = add(c, "battery", 10).container;
  const check = checkMod(v, modDef("solar_panel")!, ["shelter_power"], missing(c2));
  assert.equal(check.ok, true);
});

// ============ 燃料与行驶 ============

test("vehicle: 加油不超过容量", () => {
  const v = refuel(newVehicle(), 1000);
  assert.equal(v.fuel, stats(v).fuelCapacity);
});

test("vehicle: 抽油与下限", () => {
  // 满箱 200 抽 100 → 100
  assert.equal(refuel(newVehicle(), -100).fuel, 100);
  // 抽到负值应钳制到 0
  assert.equal(refuel(newVehicle(), -1000).fuel, 0);
  // 超过容量应钳制到容量
  assert.equal(refuel(newVehicle(), 1000).fuel, stats(newVehicle()).fuelCapacity);
});

test("vehicle: 行驶消耗燃料", () => {
  const v = newVehicle();
  const r = drive(v, 100);
  assert.equal(r.km, 100);
  assert.ok(r.fuelUsed > 0, "应消耗燃料");
  assert.ok(r.vehicle.fuel < v.fuel);
  assert.equal(r.stranded, false);
});

test("vehicle: 燃料耗尽时中途停下", () => {
  let v = refuel(newVehicle(), -1000); // 清空
  v = { ...v, fuel: 10 };
  const r = drive(v, 500);
  assert.ok(r.km < 500, "不应跑完全程");
  assert.equal(r.stranded, true);
  assert.equal(r.vehicle.fuel, 0);
});

test("vehicle: 纯电优先且静音", () => {
  let v = installAll(newVehicle());
  v = charge(v, 100);
  const r = drive(v, 50);
  assert.equal(r.silent, true, "有电时应静音行驶");
  assert.ok(r.chargeUsed > 0);
  assert.equal(r.fuelUsed, 0, "纯电段不耗油");
});

test("vehicle: 电用尽后切燃油", () => {
  let v = installAll(newVehicle());
  v = charge(v, 20);
  const r = drive(v, 200);
  assert.ok(r.chargeUsed > 0, "应先用完电");
  assert.ok(r.fuelUsed > 0, "超出电量后应烧油");
});

test("vehicle: 行驶造成车身磨损", () => {
  const v = newVehicle();
  const r = drive(v, 300);
  assert.ok(r.vehicle.hull < 100);
  assert.ok(hullRatio(r.vehicle) < 1);
});

test("vehicle: 修复车身", () => {
  let v = drive(newVehicle(), 500).vehicle;
  v = repair(v, 100);
  assert.equal(v.hull, 100);
});

test("vehicle: 升级后续航更长", () => {
  const base = stats(newVehicle());
  const modded = stats(installMod(newVehicle(), "aux_tank"));
  assert.ok(modded.range > base.range);
});

test("vehicle: 地形套件解锁越野", () => {
  assert.equal(canOffroad(newVehicle()), false);
  const v = installMod(newVehicle(), "terrain_kit");
  assert.equal(canOffroad(v), true);
  assert.ok(stats(v).wading > 0);
});

// ============ 能力 ============

test("vehicle: 私室改装解锁远征亲密场景", () => {
  assert.equal(hasPrivateRoom(newVehicle()), false);
  assert.equal(hasPrivateRoom(installMod(newVehicle(), "private_room")), true);
});

test("vehicle: 无人机挂载提供 2 架位", () => {
  assert.equal(droneCapacity(newVehicle()), 0);
  assert.equal(droneCapacity(installMod(newVehicle(), "drone_rack")), 2);
});

test("vehicle: 火力随武器改装上升", () => {
  let v = newVehicle();
  assert.equal(firepower(v), 0);
  v = installMod(v, "weapon_mount");
  assert.ok(firepower(v) > 0);
  v = installMod(v, "remote_weapon");
  assert.ok(firepower(v) > 30);
});

test("vehicle: 乘员容量随生活改装上升", () => {
  const base = crewCapacity(newVehicle());
  let v = installMod(newVehicle(), "kitchen");
  assert.ok(crewCapacity(v) > base);
  v = installMod(v, "camp_ext");
  assert.ok(crewCapacity(v) > base);
});

test("vehicle: 按已装层级分组", () => {
  const v = installUpToTier(newVehicle(), 3);
  const groups = modsByInstalledTier(v);
  assert.equal(groups.length, 3, "T1-T3 各一组");
  assert.equal(groups[0].tier, 1);
  assert.equal(maxTier(v), 3);
});

test("vehicle: 装甲等级标签", () => {
  assert.equal(armorLabel(0), "无装甲");
  assert.equal(armorLabel(4), "B4 级");
});

// ============ 序列化 ============

test("vehicle: 序列化往返", () => {
  let v = installUpToTier(newVehicle(), 3);
  v = refuel(v, -100);
  v = drive(v, 50).vehicle;

  const json = vehicleToJSON(v);
  const back = vehicleFromJSON(json);

  assert.equal(back.mods.length, v.mods.length);
  assert.equal(back.fuel, v.fuel);
  assert.equal(back.hull, v.hull);
  assert.deepEqual(stats(back), stats(v));
});

test("vehicle: 反序列化忽略未知改装", () => {
  const back = vehicleFromJSON({
    id: "nomad", name: "测试", mods: ["nonexistent", "solar_panel"],
    fuel: 100, charge: 0, hull: 90, atBase: true
  });
  assert.equal(back.mods.length, 1);
  assert.equal(back.mods[0], "solar_panel");
});

test("vehicle: 空输入返回初始车", () => {
  const v = vehicleFromJSON(null);
  assert.equal(v.mods.length, 0);
  assert.equal(v.fuel, 200);
});

test("vehicle: 描述文本", () => {
  const txt = describeVehicle(newVehicle());
  assert.match(txt, /90km\/h/);
  assert.match(txt, /续航 600km/);
  assert.match(txt, /无装甲/);
});

// ============ 会话集成 ============

test("session/vehicle: 开局是普通房车", () => {
  const s = new GameSession();
  assert.equal(s.vehicle.mods.length, 0);
  assert.equal(s.vehicleStats().armorLevel, 0);
  assert.equal(s.vehiclePrivateRoom(), false);
});

test("session/vehicle: 安装改装扣材料", () => {
  const s = new GameSession({ resources: { "solar_panel": 10, "battery": 10 } });
  s.unlockEverything();
  const before = s.resources["solar_panel"];
  const r = s.installVehicleMod("solar_panel");
  assert.equal(r.ok, true);
  assert.ok(s.resources["solar_panel"] < before, "应扣材料");
  assert.equal(s.vehicleStats().powerOutput, 2);
});

test("session/vehicle: 缺科技时拒绝", () => {
  const s = new GameSession({ resources: { "solar_panel": 10, "battery": 10 } });
  const r = s.installVehicleMod("solar_panel");
  assert.equal(r.ok, false);
  assert.equal(r.reason, "missing-tech");
});

test("session/vehicle: 一键装齐（作弊器）", () => {
  const s = new GameSession();
  s.installAllVehicleMods();
  assert.equal(s.vehicle.mods.length, MODS.length);
  assert.equal(s.vehicleStats().armorLevel, 7);
  assert.equal(s.vehiclePrivateRoom(), true);
});

test("session/vehicle: 加油与修理", () => {
  const s = new GameSession();
  s.refuelVehicle(500);
  assert.equal(s.vehicle.fuel, s.vehicleStats().fuelCapacity);
  s.repairVehicle(100);
  assert.equal(s.vehicle.hull, 100);
});

test("session/vehicle: 房车出行消耗燃料", () => {
  const s = new GameSession();
  s.finishBuild("garage");
  s.world.regions["old_road"].discovered = true;
  const before = s.vehicle.fuel;
  const r = s.travelTo("old_road", "car");
  assert.equal(r.ok, true);
  assert.ok(s.vehicle.fuel < before, "房车出行应耗油");
});

test("session/vehicle: 步行不耗房车燃料", () => {
  const s = new GameSession();
  s.world.regions["hillside"].discovered = true;
  const before = s.vehicle.fuel;
  s.travelTo("hillside", "walk");
  assert.equal(s.vehicle.fuel, before, "步行不应耗油");
});

test("session/vehicle: 房车数值进入剧本变量集", () => {
  const s = new GameSession();
  s.installAllVehicleMods();
  const v = s.vars();
  assert.equal(v["vehicleArmor"], 7);
  assert.equal(v["vehiclePrivate"], true);
});

test("session/vehicle: 随存档往返", () => {
  const s = new GameSession();
  s.installAllVehicleMods();
  s.refuelVehicle(-50);

  const data = s.toSave("slot");
  const back = GameSession.fromSave(data);

  assert.equal(back.vehicle.mods.length, MODS.length);
  assert.equal(back.vehicle.fuel, s.vehicle.fuel);
  assert.equal(back.vehicleStats().armorLevel, 7);
});

test("session/vehicle: 摘要包含房车信息", () => {
  const s = new GameSession();
  s.installAllVehicleMods();
  const sum = s.summary();
  assert.equal(sum.vehicleMods, MODS.length);
  assert.equal(sum.vehicleArmor, 7);
});

test("session/vehicle: 改装顺序正确（T1→T8）", () => {
  const s = new GameSession();
  s.unlockEverything();
  // 给足材料
  for (const id of ["solar_panel","battery","toolbox","steel_bar","metal_shelf","cloth",
                    "pvc_pipe","welding_kit","armor_plate","machine_part","radio","electronics",
                    "surgical_kit","medical_supply","insulation","furniture","radar_module",
                    "ammo_762","mold","gunpowder","drone_part","rare_catalyst","isotope",
                    "data_chip"]) {
    s.addToStorage(id, 500);
  }
  // 按层级顺序安装，全部应成功
  let ok = 0;
  for (let t = 1; t <= 8; t++) {
    for (const def of modsByTier(t as ModTier)) {
      const r = s.installVehicleMod(def.id);
      if (r.ok) ok++;
    }
  }
  assert.equal(ok, MODS.length, `应能装齐 ${MODS.length} 项，实际 ${ok}`);
});
