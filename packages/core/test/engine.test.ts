import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { World } from "../src/ecs.ts";
import { clamp100, slotOf } from "../src/types.ts";
import { advance, formatTime, slot } from "../src/time.ts";
import { tickSurvival, BASE_RATES, statusOf, eat } from "../src/systems/survival.ts";
import { gain, tickLust, satisfy, refuse, loyaltyTier, intimacyUp, intimacyStage } from "../src/systems/relationship.ts";
import { jobEfficiency, tickJob, totalBonus } from "../src/systems/jobs.ts";
import { renderScene, sceneLength, sliceBeats, type Scene } from "../src/text/engine.ts";
import { effectsFor, saveBadge, CheatConsole, DEFAULT_CHEAT, parseCommand } from "../src/systems/cheat.ts";
import { evaluate } from "../src/script/condition.ts";
import { parseScript, materializeScene, materializeAll } from "../src/script/parser.ts";
import {
  newSave, wrap, unwrap, contentChecksum,
  checkInvariants, checkRuntimeInvariants
} from "../src/save/serialize.ts";
import { VERSION, SCHEMA_VERSION, buildInfo, isSaveCompatible } from "../src/version.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const scenePath = join(__dirname, "..", "data", "scenes", "sister_first.json");
const scene: Scene = JSON.parse(readFileSync(scenePath, "utf8"));

test("ECS: create, attach, query", () => {
  const w = new World();
  w.create("hero");
  w.create("sister");
  w.add("hero", "identity", { name: "主角" });
  w.add("sister", "identity", { name: "姐姐" });
  w.add("sister", "lust", { value: 10, daysSinceIntimacy: 0, forced: false });
  assert.equal(w.query("identity").length, 2);
  assert.equal(w.query("identity", "lust").length, 1);
  assert.equal(w.get<{name:string}>("sister", "identity").name, "姐姐");
  assert.equal(w.has("hero", "lust"), false);
});

test("time: slots cover 24h, no gaps", () => {
  const seen = new Set<string>();
  for (let h = 0; h < 24; h++) seen.add(slotOf(h * 60));
  assert.equal(seen.size, 7);
  assert.equal(slotOf(0), "lateNight");
  assert.equal(slotOf(7 * 60), "morning");
  assert.equal(slotOf(21 * 60), "night");
});

test("time: advance rolls over days", () => {
  const t = advance({ day: 1, minute: 23 * 60 }, 3 * 60);
  assert.equal(t.day, 2);
  assert.equal(t.minute, 2 * 60);
  assert.equal(slot(t), "lateNight"); // 02:00 属于深夜（23:00-03:00），凌晨从 03:00 起算
  assert.match(formatTime(t), /第2天 02:00/);
});

test("survival: drains, clamps at 0, never negative", () => {
  const s = { hunger: 50, thirst: 50, stamina: 50, energy: 50, mood: 50 };
  const after = tickSurvival(s, 24, "combat");
  assert.equal(after.hunger, 0);
  assert.equal(after.thirst, 0);
  assert.ok(after.stamina >= 0);
  assert.ok(statusOf(after).length >= 2);
});

test("survival: eating restores hunger and mood", () => {
  const s = { hunger: 10, thirst: 10, stamina: 10, energy: 10, mood: 10 };
  const e = eat(s, 40);
  assert.equal(e.hunger, 50);
  assert.equal(e.mood, 12);
});

test("relationship: affection and loyalty only rise", () => {
  const r0 = { affection: 90, loyalty: 95, bond: 3 as const, role: "main" as const };
  const r1 = gain(r0, 20, 20);
  assert.equal(r1.affection, 100);
  assert.equal(r1.loyalty, 100);
  // 拒绝不改变好感与忠诚
  const l = refuse({ value: 50, daysSinceIntimacy: 3, forced: false });
  assert.equal(l.value, 60);
  assert.deepEqual(r0, gain(r0, 0, 0));
});

test("relationship: lust stages follow the spec", () => {
  const base = { value: 55, daysSinceIntimacy: 0, forced: false };
  assert.equal(tickLust(base, 1, 5).stage, "none");
  assert.equal(tickLust({ value: 60, daysSinceIntimacy: 5, forced: false }, 0, 0).stage, "hint");
  assert.equal(tickLust({ value: 82, daysSinceIntimacy: 7, forced: false }, 0, 0).stage, "invite");
  assert.equal(tickLust({ value: 92, daysSinceIntimacy: 10, forced: false }, 0, 0).stage, "nightRaid");
  assert.equal(tickLust({ value: 99, daysSinceIntimacy: 0, forced: false }, 1, 5).stage, "forced");
});

test("relationship: satisfy clears lust and adds affection", () => {
  const r = { affection: 50, loyalty: 50, bond: 2 as const, role: "family" as const };
  const l = { value: 95, daysSinceIntimacy: 12, forced: true };
  const out = satisfy(r, l, "active");
  assert.equal(out.lust.value, 0);
  assert.equal(out.relationship.affection, 55);
  assert.equal(out.relationship.loyalty, 53);
});

test("relationship: loyalty tiers", () => {
  assert.equal(loyaltyTier({ affection: 0, loyalty: 10, bond: 1, role: "side" }).tier, 1);
  assert.equal(loyaltyTier({ affection: 0, loyalty: 70, bond: 1, role: "side" }).bonus, 0.2);
  assert.equal(loyaltyTier({ affection: 0, loyalty: 100, bond: 1, role: "side" }).tier, 4);
});

test("relationship: harem intimacy is pairwise", () => {
  let i = { with: {} as Record<string, number> };
  i = intimacyUp(i, "sister", 65);
  i = intimacyUp(i, "mother", 30);
  assert.equal(intimacyStage(i, "sister"), "亲密");
  assert.equal(intimacyStage(i, "mother"), "友好");
  assert.equal(i.with["sister"], 65);
});

test("jobs: fatigue reduces efficiency after 7 days", () => {
  const fresh = { id: "lab" as const, bonus: 0.35, daysOnJob: 3 };
  const tired = tickJob(fresh, 10);
  assert.equal(jobEfficiency(fresh), 0.35);
  assert.ok(jobEfficiency(tired) < 0.35);
  assert.ok(jobEfficiency(tired) >= 0.175);
});

test("jobs: total bonus aggregates by job", () => {
  const list = [
    { entityId: "a", job: { id: "lab" as const, bonus: 0.35, daysOnJob: 0 } },
    { entityId: "b", job: { id: "lab" as const, bonus: 0.20, daysOnJob: 0 } },
    { entityId: "c", job: { id: "kitchen" as const, bonus: 0.25, daysOnJob: 0 } }
  ];
  assert.equal(Math.round(totalBonus(list, "lab") * 100), 55);
  assert.equal(Math.round(totalBonus(list, "kitchen") * 100), 25);
});

test("text engine: renders all four layers per beat", () => {
  const out = renderScene(scene, { detail: "detailed", showLayerTags: false });
  assert.match(out, /互相破处/);
  assert.match(out, /「你以前不是这样的。但我还是想要你。」/);
  assert.match(out, /疼。但她笑了。/);
});

test("text engine: detail level changes beat count, not content", () => {
  const brief = sliceBeats(scene, "brief");
  const full = sliceBeats(scene, "exhaustive");
  assert.ok(brief.length < full.length);
  assert.equal(full.length, scene.beats.length);
  // 首尾保留
  assert.equal(brief[0].id, "b1");
  assert.equal(brief[brief.length - 1].id, "b7");
});

test("text engine: detailed scene reaches target length", () => {
  const len = sceneLength(scene, { detail: "detailed", showLayerTags: false });
  assert.ok(len > 150, `expected >150 chars, got ${len}`);
});

test("cheat: off by default, all-on when enabled", () => {
  assert.equal(effectsFor(DEFAULT_CHEAT), null);
  const fx = effectsFor({ ...DEFAULT_CHEAT, enabled: true });
  assert.ok(fx && fx.godMode && fx.unlockAllTech && fx.maxAffection);
  assert.equal(saveBadge({ ...DEFAULT_CHEAT, enabled: true }), "CHEAT");
  assert.equal(saveBadge({ ...DEFAULT_CHEAT, enabled: true, markSave: false }), null);
});

test("cheat: console is gated by its own toggle", () => {
  const off = new CheatConsole({ ...DEFAULT_CHEAT, enabled: true, console: false });
  assert.equal(off.exec("/god"), "控制台未启用");

  const on = new CheatConsole({ ...DEFAULT_CHEAT, enabled: true, console: true });
  on.register("god", () => "无敌已开启");
  assert.equal(on.exec("/god"), "无敌已开启");
  assert.equal(on.exec("/nope"), "未知命令：/nope");
  assert.deepEqual(parseCommand("/add item:medicine 50"), { cmd: "add", args: ["item:medicine", "50"] });
});

test("clamp helper", () => {
  assert.equal(clamp100(-5), 0);
  assert.equal(clamp100(105), 100);
  assert.equal(clamp100(50), 50);
});



// ============ M1: 条件表达式 ============
test("condition: 比较与逻辑运算", () => {
  assert.equal(evaluate("affection >= 60", { affection: 75 }), true);
  assert.equal(evaluate("affection >= 60", { affection: 30 }), false);
  assert.equal(evaluate("virgin == true && affection >= 60", { virgin: true, affection: 60 }), true);
  assert.equal(evaluate("virgin == true && affection >= 60", { virgin: false, affection: 90 }), false);
  assert.equal(evaluate("lust > 80 || bond >= 4", { lust: 20, bond: 4 }), true);
  assert.equal(evaluate("!(lust > 80)", { lust: 20 }), true);
});

test("condition: 未定义变量视为 false 而非报错", () => {
  assert.equal(evaluate("unknown_var >= 10"), false);
});

test("condition: 空表达式视为 true", () => {
  assert.equal(evaluate(""), true);
  assert.equal(evaluate("   "), true);
});

test("condition: 字符串比较与括号优先级", () => {
  assert.equal(evaluate('name == "姐姐"', { name: "姐姐" }), true);
  assert.equal(evaluate("(a > 1 || b > 1) && c > 1", { a: 0, b: 5, c: 5 }), true);
  assert.equal(evaluate("a > 1 || b > 1 && c > 1", { a: 0, b: 5, c: 0 }), false);
});

test("condition: 非法表达式抛错", () => {
  assert.throws(() => evaluate("a > "), /意外的记号|缺少/);
  assert.throws(() => evaluate("(a > 1"), /缺少右括号/);
  assert.throws(() => evaluate('a == "未闭合'), /未闭合的字符串/);
});

// ============ M1: DSL 解析 ============
const DSL_PATH = join(__dirname, "..", "data", "scripts", "sister_first.dsl");
const dslSrc = readFileSync(DSL_PATH, "utf8");

test("dsl: 解析出场景、节拍与差分", () => {
  const r = parseScript(dslSrc);
  assert.equal(r.formatVersion, 1);
  assert.equal(r.scenes.length, 1);
  const s = r.scenes[0];
  assert.equal(s.id, "sister_first");
  assert.equal(s.title, "互相破处");
  assert.deepEqual(s.participants, ["主角", "姐姐"]);
  assert.equal(s.beats.length, 7);
  assert.equal(s.variants.length, 2);
  assert.equal(s.beats[0].poseKey, "push_down");
});

test("dsl: 每个节拍四层齐全", () => {
  const s = parseScript(dslSrc).scenes[0];
  for (const b of s.beats) {
    const layers = new Set(b.lines.map((l) => l.layer));
    assert.ok(layers.has("action"), `${b.id} 缺 action`);
    assert.ok(layers.has("sense"), `${b.id} 缺 sense`);
    assert.ok(layers.has("mind"), `${b.id} 缺 mind`);
    assert.ok(layers.has("speech"), `${b.id} 缺 speech`);
  }
});

test("dsl: speech 说话人解析正确", () => {
  const s = parseScript(dslSrc).scenes[0];
  const speech = s.beats[0].lines.find((l) => l.layer === "speech")!;
  assert.equal(speech.speaker, "姐姐");
  assert.match(speech.text, /你以前不是这样的/);
});

test("dsl: 场景级 when 不满足则不可实体化", () => {
  const r = parseScript(dslSrc);
  assert.equal(materializeAll(r, { virgin: false, affection: 90 }).length, 0);
  assert.equal(materializeAll(r, { virgin: true, affection: 30 }).length, 0);
  assert.equal(materializeAll(r, { virgin: true, affection: 60 }).length, 1);
});

test("dsl: 差分文本按条件注入同一节拍", () => {
  const r = parseScript(dslSrc);
  const base = materializeScene(r.scenes[0], { virgin: true, affection: 60, lust: 0, bond: 1 })!;
  const withLust = materializeScene(r.scenes[0], { virgin: true, affection: 60, lust: 90, bond: 1 })!;

  const b2base = base.beats.find((b) => b.id === "b2")!;
  const b2lust = withLust.beats.find((b) => b.id === "b2")!;
  assert.equal(b2base.lines.length, 4);
  assert.equal(b2lust.lines.length, 5);
  assert.match(b2lust.lines[4].text, /我等不了了/);
});

test("dsl: 差分可叠加", () => {
  const r = parseScript(dslSrc);
  const both = materializeScene(r.scenes[0], { virgin: true, affection: 60, lust: 90, bond: 5 })!;
  const b4 = both.beats.find((b) => b.id === "b4")!;
  assert.equal(b4.lines.length, 5);
  assert.match(b4.lines[4].text, /换你来/);
});

test("dsl: 实体化后可被文本引擎渲染", () => {
  const r = parseScript(dslSrc);
  const scene = materializeScene(r.scenes[0], { virgin: true, affection: 60, lust: 0, bond: 1 })!;
  const text = renderScene(scene, { detail: "detailed", showLayerTags: false });
  assert.match(text, /互相破处/);
  assert.match(text, /「我等你这个……等了快十年。」/);
});

test("dsl: 语法错误给出带行号的提示", () => {
  assert.throws(() => parseScript("@scene a\n  @beat b1\n    action: x\n"), /缺少 @end/);
  assert.throws(() => parseScript("@scene a\n@end\n"), /没有任何 @beat/);
  assert.throws(() => parseScript("@scene a\n  @beat b1\n    nope: x\n  @end\n"), /只允许 action/);
  assert.throws(() => parseScript("action: x\n"), /@scene 之外/);
  assert.throws(() => parseScript("@scene a\n  @beat b1\n    action: x\n  @variant nope when: a > 1\n    speech: y\n  @end\n"), /不存在的节拍/);
});

test("dsl: 续行拼接", () => {
  const r = parseScript(`@scene t
  title: T
  @beat b1
    action: 第一段
    | 第二段
    | 第三段
  @end
`);
  const b = r.scenes[0].beats[0];
  assert.equal(b.lines[0].text, "第一段第二段第三段");
});

// ============ M2: 存档序列化 ============
test("save: 往返序列化保持等价", () => {
  const data = newSave(VERSION, { day: 12, minute: 480 }, "2026-02-14T00:00:00.000Z");
  data.entities.push({
    id: "hero", kind: "hero",
    identity: { name: "主角", title: "扶她御姐", age: 28, heightCm: 178, tags: ["futanari"] },
    physiology: { sex: "futanari", virgin: true, pregnant: false, pregnancyProgress: 0, fertileWindow: false },
    survival: { hunger: 80, thirst: 70, stamina: 90, energy: 85, mood: 60 }
  });
  data.relations.push({ fromId: "hero", toId: "sister", affection: 60, loyalty: 50, bond: 3, intimacy: 0, lust: 92, daysSinceIntimacy: 11 });

  const env = wrap(data);
  const back = unwrap(JSON.parse(JSON.stringify(env)));
  assert.equal(back.ok, true);
  assert.deepEqual(back.data, data);
  assert.equal(back.data.time.day, 12);
});

test("save: 篡改后校验失败", () => {
  const data = newSave(VERSION, { day: 1, minute: 0 });
  const env = wrap(data);
  env.payload.time.day = 999;
  assert.equal(unwrap(env).ok, false);
});

test("save: 校验和与键序无关", () => {
  const a = newSave(VERSION, { day: 1, minute: 0 });
  a.flags = { b: 2, a: 1 };
  const b = newSave(VERSION, { day: 1, minute: 0 });
  b.flags = { a: 1, b: 2 };
  assert.equal(contentChecksum(a), contentChecksum(b));
});

test("save: 不变式捕获后代性别与数值越界", () => {
  const data = newSave(VERSION, { day: 1, minute: 0 });
  data.entities.push({
    id: "kid", kind: "offspring",
    identity: { name: "女儿", title: "后代", age: 0, heightCm: 50, tags: [] },
    physiology: { sex: "female", virgin: true, pregnant: false, pregnancyProgress: 0, fertileWindow: false },
    survival: { hunger: 100, thirst: 100, stamina: 100, energy: 100, mood: 100 }
  });
  data.entities.push({
    id: "hero", kind: "hero",
    identity: { name: "主角", title: "扶她御姐", age: 28, heightCm: 178, tags: [] },
    physiology: { sex: "futanari", virgin: true, pregnant: false, pregnancyProgress: 0, fertileWindow: false },
    survival: { hunger: 50, thirst: 50, stamina: 50, energy: 50, mood: 50 }
  });
  assert.equal(checkInvariants(data).length, 0);

  // 制造违规
  data.entities[0].physiology.sex = "futanari" as never;
  data.relations.push({ fromId: "hero", toId: "x", affection: 120, loyalty: -5, bond: 9, intimacy: 0, lust: 0, daysSinceIntimacy: 0 });
  const v = checkInvariants(data);
  assert.ok(v.some((x) => x.code === "INV-4"), "应捕获 INV-4");
  assert.ok(v.filter((x) => x.code === "INV-1").length >= 3, "应捕获多处 INV-1");
});

test("save: 运行时不变式拦住后宫怀孕药与夜袭拒绝项", () => {
  const bad = checkRuntimeInvariants({
    participants: ["sister", "mother"],
    isHaremToHarem: true,
    medType: "pregnant",
    medTemporary: true,
    sceneHasRefuseOption: false,
    isNightRaid: false,
    futanariInCombatStats: false
  });
  assert.ok(bad.some((v) => v.code === "INV-2"));

  const raid = checkRuntimeInvariants({
    participants: ["hero", "sister"],
    isHaremToHarem: false,
    medType: "none",
    medTemporary: true,
    sceneHasRefuseOption: true,
    isNightRaid: true,
    futanariInCombatStats: false
  });
  assert.ok(raid.some((v) => v.code === "INV-5"));

  const temp = checkRuntimeInvariants({
    participants: ["hero", "sister"],
    isHaremToHarem: false,
    medType: "recreational",
    medTemporary: false,
    sceneHasRefuseOption: false,
    isNightRaid: false,
    futanariInCombatStats: true
  });
  assert.ok(temp.some((v) => v.code === "INV-3"));
  assert.ok(temp.some((v) => v.code === "INV-6"));

  const ok = checkRuntimeInvariants({
    participants: ["hero", "sister"],
    isHaremToHarem: false,
    medType: "pregnant",
    medTemporary: true,
    sceneHasRefuseOption: false,
    isNightRaid: false,
    futanariInCombatStats: false
  });
  assert.equal(ok.length, 0);
});

// ============ 版本 ============
test("version: 构建信息与存档兼容性", () => {
  const info = buildInfo();
  assert.match(info.version, /^\d+\.\d+\.\d+$/);
  assert.equal(info.schemaVersion, SCHEMA_VERSION);
  assert.equal(isSaveCompatible(SCHEMA_VERSION), true);
  assert.equal(isSaveCompatible(SCHEMA_VERSION + 1), false);
});
