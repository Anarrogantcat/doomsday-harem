import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { GameSession } from "../src/runtime/session.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT_DIR = join(dirname(dirname(__dirname)), "core", "data", "scripts");

function session(): GameSession {
  const s = new GameSession();
  s.loadScripts(readdirSync(SCRIPT_DIR).filter((f) => f.endsWith(".dsl"))
    .map((f) => readFileSync(join(SCRIPT_DIR, f), "utf8")));
  return s;
}

test("rightcol: 可建造列表非空", () => {
  const s = session();
  const list = s.buildableFacilities();
  assert.ok(list.length > 0, "初始应有可建造设施");
});

test("rightcol: 可建造列表含完整字段", () => {
  const s = session();
  for (const f of s.buildableFacilities()) {
    assert.ok(f.id.length > 0);
    assert.ok(f.name.length > 0);
    assert.ok(["surface", "bunker", "resource"].includes(f.level), `未知层级 ${f.level}`);
    assert.ok(f.nextTier >= 1);
    assert.ok(f.maxTier >= f.nextTier, `${f.id} 满级应不低于下一级`);
    assert.ok(typeof f.canBuild === "boolean");
    assert.ok(f.reason.length > 0);
    assert.ok(typeof f.hours === "number");
    assert.ok(f.hours >= 0);
  }
});

test("rightcol: 满级设施不在列表中", () => {
  const s = session();
  s.giveCheatMaterials();
  s.unlockEverything();
  for (const f of s.buildableFacilities()) {
    assert.ok(f.currentTier < f.maxTier, `${f.id} 已满级仍出现在列表`);
  }
});

test("rightcol: 可建造的排在前面", () => {
  const s = session();
  const list = s.buildableFacilities();
  let seenLocked = false;
  for (const f of list) {
    if (!f.canBuild) seenLocked = true;
    else assert.ok(!seenLocked, "可建造项不应排在锁定项之后");
  }
});

test("rightcol: 缺材料时标注原因", () => {
  const s = session();
  const list = s.buildableFacilities();
  const locked = list.filter((f) => !f.canBuild);
  if (locked.length > 0) {
    assert.ok(locked.every((f) => f.reason !== "ok"), "锁定项应有具体原因");
  }
});

test("rightcol: quickBuild 可开工", () => {
  const s = session();
  // 作弊全开：解锁科技 + 给足材料
  s.giveCheatMaterials();
  s.unlockEverything();
  const ready = s.buildableFacilities().find((f) => f.canBuild);
  assert.ok(ready, `全开后应有可建造项，实际 0/${s.buildableFacilities().length}`);
  const r = s.quickBuild(ready!.id);
  assert.equal(r.ok, true, `开工失败：${r.reason}`);
  assert.ok(s.base.building === ready!.id, "应进入建造状态");
});

test("rightcol: quickBuild 缺条件时拒绝", () => {
  const s = session();
  const list = s.buildableFacilities();
  const locked = list.find((f) => !f.canBuild);
  if (locked) {
    const r = s.quickBuild(locked.id);
    assert.equal(r.ok, false);
    assert.ok(r.reason);
  }
});

test("rightcol: 未知设施被拒", () => {
  const s = session();
  const r = s.quickBuild("nonexistent_facility");
  assert.equal(r.ok, false);
});

test("rightcol: 可改装列表", () => {
  const s = session();
  const list = s.installableMods();
  assert.ok(list.length > 0, "应有房车改装项");
  for (const m of list) {
    assert.ok(m.id.length > 0);
    assert.ok(m.name.length > 0);
    assert.ok(m.tier >= 1);
    assert.ok(typeof m.installed === "boolean");
    assert.ok(typeof m.canInstall === "boolean");
  }
});

test("rightcol: 已安装的排前面", () => {
  const s = session();
  const list = s.installableMods();
  let seenNotInstalled = false;
  for (const m of list) {
    if (!m.installed) seenNotInstalled = true;
    else assert.ok(!seenNotInstalled, "已安装项应排在前面");
  }
});

test("rightcol: quickInstallMod 可安装", () => {
  const s = session();
  s.giveCheatMaterials();
  s.unlockEverything();
  const ready = s.installableMods().find((m) => m.canInstall);
  assert.ok(ready, `全开后应有可安装项，实际 0/${s.installableMods().length}`);
  const r = s.quickInstallMod(ready!.id);
  assert.equal(r.ok, true, `安装失败：${r.reason}`);
  assert.ok(s.vehicle.mods.includes(ready!.id), "应出现在已装列表");
});

test("rightcol: 未知改装被拒", () => {
  const s = session();
  const r = s.quickInstallMod("nonexistent_mod");
  assert.equal(r.ok, false);
});