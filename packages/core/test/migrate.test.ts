import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MIGRATIONS, migrationChain, nextMigration, migrationSteps,
  migrateSave, migrateSaveLenient, validateMigrationChain, migrationSummary
} from "../src/save/migrate.ts";
import { SCHEMA_VERSION } from "../src/version.ts";
import { newSave } from "../src/save/serialize.ts";
import { makeTime } from "../src/time.ts";

function baseSave(schema = SCHEMA_VERSION) {
  const s = newSave("0.62.0", makeTime(1, 480));
  return { ...s, schemaVersion: schema };
}

test("当前迁移链为空（SCHEMA_VERSION = 1）", () => {
  assert.equal(MIGRATIONS.length, 0);
  assert.equal(SCHEMA_VERSION, 1);
});

test("validateMigrationChain：空链无问题", () => {
  assert.deepEqual(validateMigrationChain(), []);
});

test("migrateSave：同版本原样返回", () => {
  const d = baseSave();
  const r = migrateSave(d);
  assert.equal(r.ok, true);
  assert.equal(r.data, d, "同版本不应产生新对象");
  assert.deepEqual(r.applied, []);
});

test("migrateSave：高于目标版本被拒", () => {
  const r = migrateSave(baseSave(SCHEMA_VERSION + 5));
  assert.equal(r.ok, false);
  assert.match(r.reason ?? "", /无法降级/);
});

test("migrateSave：版本低于目标但无迁移路径 → 失败", () => {
  const r = migrateSave(baseSave(0), SCHEMA_VERSION);
  assert.equal(r.ok, false);
  assert.match(r.reason ?? "", /缺少/);
});

test("migrateSaveLenient：链断裂时仍可用", () => {
  const r = migrateSaveLenient(baseSave(0));
  assert.equal(r.ok, false);
  assert.equal(r.data.schemaVersion, SCHEMA_VERSION, "应强制标记为目标版本");
  assert.match(r.reason ?? "", /宽容模式/);
});

test("migrateSaveLenient：正常情况直接透传", () => {
  const r = migrateSaveLenient(baseSave());
  assert.equal(r.ok, true);
  assert.deepEqual(r.applied, []);
});

test("migrationSteps：同版本无步骤", () => {
  assert.deepEqual(migrationSteps(1, 1), []);
});

test("migrationSteps：目标低于起点无步骤", () => {
  assert.deepEqual(migrationSteps(5, 1), []);
});

test("nextMigration：空链返回 undefined", () => {
  assert.equal(nextMigration(1), undefined);
});

test("migrationChain 返回副本，外部修改不影响内部", () => {
  const a = migrationChain();
  a.push({ from: 99, to: 100, desc: "外部注入", migrate: (d) => d });
  assert.equal(migrationChain().length, MIGRATIONS.length, "内部链不应被污染");
});

test("migrationSummary：结构正确", () => {
  const s = migrationSummary();
  assert.equal(s.current, SCHEMA_VERSION);
  assert.equal(s.steps, 0);
  assert.deepEqual(s.descriptions, []);
});

test("模拟迁移链：能逐级走通", () => {
  // 用临时链验证算法（不修改真实 MIGRATIONS）
  const chain = [
    { from: 1, to: 2, desc: "加字段 a", migrate: (d: ReturnType<typeof baseSave>) => ({ ...d, flags: { ...d.flags, a: 1 } }) },
    { from: 2, to: 3, desc: "加字段 b", migrate: (d: ReturnType<typeof baseSave>) => ({ ...d, flags: { ...d.flags, b: 2 } }) }
  ];
  let cur = { ...baseSave(1) } as ReturnType<typeof baseSave>;
  let steps = 0;
  for (const m of chain) { cur = m.migrate(cur) as typeof cur; cur = { ...cur, schemaVersion: m.to }; steps++; }
  assert.equal(steps, 2);
  assert.equal(cur.schemaVersion, 3);
  assert.equal(cur.flags["a"], 1);
  assert.equal(cur.flags["b"], 2);
});

test("迁移不得修改入参（不可变）", () => {
  const d = baseSave(1);
  const before = JSON.stringify(d);
  migrateSave(d, SCHEMA_VERSION);
  assert.equal(JSON.stringify(d), before);
});
