import { test } from "node:test";
import assert from "node:assert/strict";

import {
  allSlots, slotDef, slotKind, nextAutoSlot, metaFrom, buildMeta,
  validateAndUnwrap, packForSave,
  newSlotList, upsertMeta, removeMeta, getMeta, slotView, slotStats,
  formatSlotTime, describeMeta,
  MANUAL_SLOTS, AUTO_SLOTS,
  type SlotMeta, type SlotList
} from "../src/save/slots.ts";
import { newSave, wrap, unwrap, type SaveData } from "../src/save/serialize.ts";
import { VERSION, SCHEMA_VERSION } from "../src/version.ts";

function sampleSave(): SaveData {
  const d = newSave(VERSION, { day: 12, minute: 8 * 60 }, "2026-02-14T10:00:00.000Z");
  d.entities.push({
    id: "hero", kind: "hero",
    identity: { name: "主角", title: "扶她御姐", age: 28, heightCm: 178, tags: [] },
    physiology: { sex: "futanari", virgin: true, pregnant: false, pregnancyProgress: 0, fertileWindow: false },
    survival: { hunger: 80, thirst: 70, stamina: 90, energy: 85, mood: 60 }
  });
  d.entities.push({
    id: "sister", kind: "companion",
    identity: { name: "姐姐", title: "项目经理", age: 26, heightCm: 174, tags: [] },
    physiology: { sex: "female", virgin: false, pregnant: false, pregnancyProgress: 0, fertileWindow: false },
    survival: { hunger: 80, thirst: 70, stamina: 90, energy: 85, mood: 60 }
  });
  d.entities.push({
    id: "ai", kind: "ai",
    identity: { name: "特殊AI", title: "基地核心", age: 0, heightCm: 0, tags: [] },
    physiology: { sex: "female", virgin: true, pregnant: false, pregnancyProgress: 0, fertileWindow: false },
    survival: { hunger: 0, thirst: 0, stamina: 0, energy: 100, mood: 60 }
  });
  d.tech.push({ branch: "shelter", nodeId: "shelter_power", tier: 1, unlocked: true, progress: 0 });
  d.tech.push({ branch: "shelter", nodeId: "shelter_water", tier: 1, unlocked: true, progress: 0 });
  d.flags["base"] = { facilities: [{ id: "fence", tier: 2, buildingHours: 0, targetTier: 2 }], building: null };
  d.flags["quests"] = { q_baker: { completed: true }, q_teacher: { completed: false } };
  d.flags["world"] = { current: "hillside" };
  d.flags["offspring"] = [{ id: "c1" }];
  return d;
}

// ============ 槽位定义 ============

test("slots: 槽位总数正确", () => {
  const all = allSlots();
  assert.equal(all.length, MANUAL_SLOTS + AUTO_SLOTS + 1);
  assert.equal(all.filter((s) => s.kind === "manual").length, 10);
  assert.equal(all.filter((s) => s.kind === "auto").length, 3);
  assert.equal(all.filter((s) => s.kind === "quick").length, 1);
});

test("slots: 槽位查询", () => {
  assert.equal(slotKind("manual1"), "manual");
  assert.equal(slotKind("auto2"), "auto");
  assert.equal(slotKind("quick"), "quick");
  assert.equal(slotKind("nonexistent"), null);
  assert.equal(slotDef("manual1")?.label, "存档 1");
});

// ============ 自动存档轮换 ============

test("slots: 自动存档优先填空位", () => {
  assert.equal(nextAutoSlot([]), "auto1");
  const one: SlotMeta[] = [{
    slot: "auto1", kind: "auto", day: 1, minute: 0,
    savedAt: "2026-01-01T00:00:00Z",
    summary: { companions: 0, techUnlocked: 0, baseBuilt: 0, questsCompleted: 0, offspring: 0, region: "home" },
    cheatBadge: null, schemaVersion: 1, version: VERSION, checksum: "x", bytes: 0
  }];
  assert.equal(nextAutoSlot(one), "auto2");
});

test("slots: 自动存档满时覆盖最旧", () => {
  const mk = (slot: string, savedAt: string): SlotMeta => ({
    slot, kind: "auto", day: 1, minute: 0, savedAt,
    summary: { companions: 0, techUnlocked: 0, baseBuilt: 0, questsCompleted: 0, offspring: 0, region: "home" },
    cheatBadge: null, schemaVersion: 1, version: VERSION, checksum: "x", bytes: 0
  });
  const full = [
    mk("auto1", "2026-01-03T00:00:00Z"),
    mk("auto2", "2026-01-01T00:00:00Z"),
    mk("auto3", "2026-01-02T00:00:00Z")
  ];
  assert.equal(nextAutoSlot(full), "auto2", "应覆盖最旧的 auto2");
});

// ============ 元数据提取 ============

test("slots: 从存档提取元数据", () => {
  const d = sampleSave();
  const meta = metaFrom(d, "2026-02-14T12:00:00.000Z");

  assert.equal(meta.day, 12);
  assert.equal(meta.minute, 480);
  assert.equal(meta.summary.companions, 2, "1 同伴 + 1 AI");
  assert.equal(meta.summary.techUnlocked, 2);
  assert.equal(meta.summary.baseBuilt, 1);
  assert.equal(meta.summary.questsCompleted, 1);
  assert.equal(meta.summary.offspring, 1);
  assert.equal(meta.summary.region, "hillside");
  assert.equal(meta.schemaVersion, SCHEMA_VERSION);
  assert.ok(meta.checksum.length > 0);
});

test("slots: 作弊标记被提取", () => {
  const d = sampleSave();
  d.cheatBadge = "CHEAT";
  assert.equal(metaFrom(d).cheatBadge, "CHEAT");
});

test("slots: 空存档元数据不崩", () => {
  const d = newSave(VERSION, { day: 1, minute: 0 });
  const meta = metaFrom(d);
  assert.equal(meta.summary.companions, 0);
  assert.equal(meta.summary.baseBuilt, 0);
  assert.equal(meta.summary.questsCompleted, 0);
});

test("slots: buildMeta 校验槽位", () => {
  const d = sampleSave();
  const meta = buildMeta({ slot: "manual3", data: d, bytes: 1024 });
  assert.equal(meta.slot, "manual3");
  assert.equal(meta.kind, "manual");
  assert.equal(meta.bytes, 1024);

  assert.throws(() => buildMeta({ slot: "bad", data: d }), /未知槽位/);
});

// ============ 校验 ============

test("slots: 正常存档通过校验", () => {
  const env = wrap(sampleSave());
  const r = validateAndUnwrap(env);
  assert.equal(r.ok, true);
  assert.ok(r.data);
});

test("slots: 篡改被检出", () => {
  const env = wrap(sampleSave());
  env.payload.time.day = 999;
  const r = validateAndUnwrap(env);
  assert.equal(r.ok, false);
  assert.equal(r.error, "checksum");
});

test("slots: 结构版本不符被拒", () => {
  const env = wrap(sampleSave());
  env.payload.schemaVersion = SCHEMA_VERSION + 1;
  // 校验和会先失败，需重算
  const env2 = wrap(env.payload);
  const r = validateAndUnwrap(env2);
  assert.equal(r.ok, false);
  assert.equal(r.error, "schema");
});

test("slots: 不变式违规被检出", () => {
  const d = sampleSave();
  d.entities.push({
    id: "kid", kind: "offspring",
    identity: { name: "女儿", title: "后代", age: 0, heightCm: 50, tags: [] },
    physiology: { sex: "futanari", virgin: true, pregnant: false, pregnancyProgress: 0, fertileWindow: false },
    survival: { hunger: 100, thirst: 100, stamina: 100, energy: 100, mood: 100 }
  });
  const r = validateAndUnwrap(wrap(d));
  assert.equal(r.ok, false);
  assert.equal(r.error, "invariant");
  assert.ok(r.violations?.some((v) => v.code === "INV-4"));
});

test("slots: 空输入", () => {
  const r = validateAndUnwrap(null);
  assert.equal(r.ok, false);
  assert.equal(r.error, "missing");
});

test("slots: packForSave 附加槽位与版本", () => {
  const env = packForSave(sampleSave(), "manual5");
  assert.equal(env.payload.flags["slot"], "manual5");
  assert.equal(env.payload.version, VERSION);
  assert.equal(unwrap(env).ok, true, "打包后校验应通过");
});

// ============ 槽位列表 ============

test("slots: 列表写入与查询", () => {
  let list = newSlotList();
  assert.equal(list.metas.length, 0);

  const meta = buildMeta({ slot: "manual1", data: sampleSave() });
  list = upsertMeta(list, meta);
  assert.equal(getMeta(list, "manual1")?.slot, "manual1");
});

test("slots: 同槽位覆盖", () => {
  let list = newSlotList();
  list = upsertMeta(list, buildMeta({ slot: "manual1", data: sampleSave() }));
  const d2 = sampleSave();
  d2.time.day = 99;
  list = upsertMeta(list, buildMeta({ slot: "manual1", data: d2 }));
  assert.equal(list.metas.length, 1, "不应重复");
  assert.equal(getMeta(list, "manual1")?.day, 99);
});

test("slots: 删除槽位", () => {
  let list = newSlotList();
  list = upsertMeta(list, buildMeta({ slot: "manual1", data: sampleSave() }));
  list = removeMeta(list, "manual1");
  assert.equal(list.metas.length, 0);
});

test("slots: 槽位视图包含空位", () => {
  let list = newSlotList();
  list = upsertMeta(list, buildMeta({ slot: "manual2", data: sampleSave() }));
  const view = slotView(list);
  assert.equal(view.length, allSlots().length);
  assert.ok(view.find((v) => v.def.slot === "manual2")?.meta);
  assert.equal(view.find((v) => v.def.slot === "manual1")?.meta, null);
});

test("slots: 统计", () => {
  let list = newSlotList();
  list = upsertMeta(list, buildMeta({ slot: "manual1", data: sampleSave() }));
  list = upsertMeta(list, buildMeta({ slot: "auto1", data: sampleSave() }));

  const s = slotStats(list);
  assert.equal(s.total, allSlots().length);
  assert.equal(s.used, 2);
  assert.equal(s.byKind.manual.used, 1);
  assert.equal(s.byKind.auto.used, 1);
  assert.equal(s.byKind.quick.used, 0);
  assert.ok(s.latest);
});

test("slots: 列表按槽位顺序排序", () => {
  let list = newSlotList();
  list = upsertMeta(list, buildMeta({ slot: "manual5", data: sampleSave() }));
  list = upsertMeta(list, buildMeta({ slot: "manual1", data: sampleSave() }));
  list = upsertMeta(list, buildMeta({ slot: "auto1", data: sampleSave() }));

  const order = list.metas.map((m) => m.slot);
  const expected = allSlots().map((s) => s.slot).filter((s) => order.includes(s));
  assert.deepEqual(order, expected);
});

// ============ 显示 ============

test("slots: 时间格式化", () => {
  const meta = buildMeta({
    slot: "manual1",
    data: sampleSave(),
    savedAt: "2026-02-14T10:30:00.000Z"
  });
  const txt = formatSlotTime(meta);
  assert.match(txt, /第 12 天 08:00/);
  assert.match(txt, /2026-02-14/);
});

test("slots: 描述文本包含摘要", () => {
  const meta = buildMeta({ slot: "manual1", data: sampleSave() });
  const txt = describeMeta(meta);
  assert.match(txt, /同伴 2/);
  assert.match(txt, /科技 2/);
  assert.match(txt, /设施 1/);
  assert.match(txt, /主线 1/);
  assert.match(txt, /后代 1/);
});

test("slots: 描述含作弊标记", () => {
  const d = sampleSave();
  d.cheatBadge = "CHEAT";
  const meta = buildMeta({ slot: "manual1", data: d });
  assert.match(describeMeta(meta), /\[CHEAT\]/);
});
