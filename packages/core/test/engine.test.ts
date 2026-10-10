import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
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
import {
  conceptionChance, tryConceive, startPregnancy, advancePregnancy,
  pregnancyStage, pregnancyPenalty, makeOffspring, isMature, GESTATION_DAYS
} from "../src/systems/pregnancy.ts";
import {
  decideReaction, applyPlayerChoice, haremIntimacy, proactiveAction,
  PARTICIPATION_LABEL, PROACTIVE_DESCRIPTION
} from "../src/systems/harem.ts";
import { PixelRenderer, sisterSheet } from "../src/render/pixel.ts";
import { SceneRegistry } from "../src/registry/scene.ts";
import { toRows, fromRows, rowSummary } from "../src/save/store.ts";
import { DEFAULT_VIEW_CONFIG } from "../src/text/view.ts";
import {
  BRANCHES, BRANCH_NAMES, allNodes, findNode,
  type TechNode, type BranchId
} from "../src/tech/branches.ts";
import {
  newTechState, isUnlocked, prereqsMet, checkAvailability, canUnlock, unlock,
  unlockBranchToTier, unlockAll, reset, tickResearch, startResearch,
  aggregateBonuses, branchProgress, branchView
} from "../src/tech/tree.ts";
import {
  newCombatant, startCombat, attack, playerAttack, charmEnemy,
  enemyTurn, advanceRound, playerFromBonuses, mulberry32
} from "../src/systems/combat.ts";
import { tick, fastForward } from "../src/runtime/loop.ts";

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
  assert.match(on.exec("/nope"), /未知命令：\/nope/);
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



// ============ 怀孕系统 ============
test("pregnancy: 娱乐型扶她药绝不受孕", () => {
  const base = { affection: 100, lust: 100, fertileWindow: true, techBonus: 1, roll: 0 };
  assert.equal(conceptionChance({ ...base, medType: "recreational" }), 0);
  assert.equal(tryConceive({ ...base, medType: "recreational" }), false);
});

test("pregnancy: 各修正项提高受孕率", () => {
  const low = conceptionChance({ affection: 0, lust: 0, fertileWindow: false, medType: "none", techBonus: 0, roll: 0 });
  const high = conceptionChance({ affection: 100, lust: 100, fertileWindow: true, medType: "pregnant", techBonus: 0.15, roll: 0 });
  assert.ok(high > low);
  assert.ok(high <= 0.95);
});

test("pregnancy: 怀孕推进与分娩", () => {
  const p = startPregnancy("sister", "hero", 10, 2);
  assert.equal(pregnancyStage(p), "none");
  const a = advancePregnancy(p, 5);
  assert.equal(pregnancyStage(a.pregnancy), "early");
  const b = advancePregnancy(a.pregnancy, 10);
  assert.equal(pregnancyStage(b.pregnancy), "mid");
  const c = advancePregnancy(b.pregnancy, 10);
  assert.equal(pregnancyStage(c.pregnancy), "late");
  const d = advancePregnancy(c.pregnancy, 10);
  assert.equal(d.delivered, true);
  assert.equal(d.offspringCount, 2);
});

test("pregnancy: 后期限制战斗并提高欲情增长", () => {
  assert.equal(pregnancyPenalty("early").canCombat, true);
  assert.equal(pregnancyPenalty("late").canCombat, false);
  assert.ok(pregnancyPenalty("due").lustGain > pregnancyPenalty("early").lustGain);
});

test("pregnancy: 后代恒为女性（INV-4）", () => {
  const o = makeOffspring("kid1", "女儿", "sister", "hero", 100);
  assert.equal(o.sex, "female");
  assert.equal(o.physiology.sex, "female");
  assert.equal(isMature(o, 100), false);
  assert.equal(isMature(o, o.maturityDay), true);
});

// ============ 后宫互交与多人场景 ============
test("harem: 后宫之间禁用怀孕型扶她药（INV-2）", () => {
  const i = { with: {} as Record<string, number> };
  const blocked = haremIntimacy(i, "sister", "mother", "pregnant" as never);
  assert.equal(blocked.blocked, true);
  assert.match(blocked.reason!, /INV-2/);

  const ok = haremIntimacy(i, "sister", "mother", "recreational");
  assert.equal(ok.blocked, false);
  assert.equal(ok.intimacy.with["mother"], 5);
  assert.equal(ok.intimacy.with["sister"], 5);
});

test("harem: 参与方式按性格与道具判定", () => {
  const bold = decideReaction(
    { entityId: "sister", name: "姐姐", lust: 95, affection: 90, personality: "bold", hasToy: true, medStock: 2 },
    { othersPresent: 1, roll: 0.5 }
  );
  assert.ok(Object.keys(PARTICIPATION_LABEL).includes(bold.kind));

  const shyNoToy = decideReaction(
    { entityId: "sister2", name: "妹妹", lust: 20, affection: 30, personality: "shy", hasToy: false, medStock: 0 },
    { othersPresent: 0, roll: 0.5 }
  );
  assert.ok(["selfMasturbate", "verbalTease"].includes(shyNoToy.kind));
});

test("harem: 拒绝永不扣好感（核心铁律）", () => {
  for (const kind of Object.keys(PARTICIPATION_LABEL) as Array<keyof typeof PARTICIPATION_LABEL>) {
    const out = applyPlayerChoice("refuse", kind);
    assert.equal(out.affectionDelta, 0, `拒绝 ${kind} 时好感必须为 0`);
    assert.ok(out.lustDelta > 0, "欲情应继续累积");
  }
});

test("harem: 接受升级为多人，拒绝转为旁观", () => {
  const accept = applyPlayerChoice("accept", "useToy");
  assert.equal(accept.affectionDelta, 3);
  assert.equal(accept.becomesMulti, true);
  assert.equal(accept.lustDelta, -100);

  const refuse = applyPlayerChoice("refuse", "useToy");
  assert.equal(refuse.becomesObserver, true);
  assert.equal(refuse.becomesMulti, false);
});

test("harem: 欲情阶段映射到主动行为", () => {
  assert.equal(proactiveAction("nightRaid"), "nightRaid");
  assert.equal(proactiveAction("invite"), "invite");
  assert.match(PROACTIVE_DESCRIPTION["nightRaid"], /无拒绝/);
});

// ============ 像素渲染器（可选视图） ============
test("pixel: 关闭时不接收任何节拍", () => {
  const r = new PixelRenderer({ ...DEFAULT_VIEW_CONFIG, pixel: "off" });
  r.registerSheet(sisterSheet());
  r.setActiveSheet("sister_32");
  r.onBeat({ sceneId: "s", beatIndex: 0, beatId: "b1", poseKey: "push_down", participants: [], tags: ["keyframe"] });
  assert.equal(r.frameCount(), 0);
});

test("pixel: 关键帧模式只接收标记节拍", () => {
  const r = new PixelRenderer({ ...DEFAULT_VIEW_CONFIG, pixel: "keyframe" });
  r.onBeat({ sceneId: "s", beatIndex: 0, beatId: "b1", poseKey: "push_down", participants: [], tags: ["keyframe"] });
  r.onBeat({ sceneId: "s", beatIndex: 1, beatId: "b2", poseKey: "straddle", participants: [], tags: [] });
  assert.equal(r.frameCount(), 1);
});

test("pixel: 全程模式接收全部节拍", () => {
  const r = new PixelRenderer({ ...DEFAULT_VIEW_CONFIG, pixel: "full" });
  for (let i = 0; i < 5; i++) {
    r.onBeat({ sceneId: "s", beatIndex: i, beatId: `b${i}`, poseKey: "slow", participants: [], tags: [] });
  }
  assert.equal(r.frameCount(), 5);
});

test("pixel: poseKey 解析为精灵表坐标", () => {
  const r = new PixelRenderer();
  r.registerSheet(sisterSheet());
  r.setActiveSheet("sister_32");
  const f = r.currentFrame("sink")!;
  assert.equal(f.index, 2);
  assert.equal(f.x, 2 * 32);
  assert.equal(f.y, 0);
  assert.equal(f.size, 32);
});

test("pixel: 未知 poseKey 回退到 fallback", () => {
  const r = new PixelRenderer();
  r.registerSheet(sisterSheet());
  r.setActiveSheet("sister_32");
  assert.equal(r.currentFrame("不存在的姿势")!.index, 0);
});

test("pixel: 未注册精灵表抛错", () => {
  const r = new PixelRenderer();
  assert.throws(() => r.setActiveSheet("nope"), /未注册的精灵表/);
});

// ============ 场景注册表 ============
const DSL_DIR = join(__dirname, "..", "data", "scripts");
const allDsl = readdirSync(DSL_DIR)
  .filter((f) => f.endsWith(".dsl"))
  .map((f) => readFileSync(join(DSL_DIR, f), "utf8"));

test("registry: 载入全部剧本并去重", () => {
  const reg = new SceneRegistry();
  const n1 = reg.loadAll(allDsl);
  assert.equal(n1, 20, `应载入 20 个场景（15 主线 + 家庭 3 + AI 1 + 夜袭 1），实际 ${n1}`);
  const n2 = reg.loadAll(allDsl);
  assert.equal(n2, 0, "重复载入不应新增");
  assert.equal(reg.size(), n1);
});

test("registry: 每个剧本都有四层齐全的节拍", () => {
  const reg = new SceneRegistry();
  reg.loadAll(allDsl);
  for (const s of reg.all()) {
    assert.ok(s.beats.length >= 4, `${s.id} 节拍过少`);
    for (const b of s.beats) {
      const layers = new Set(b.lines.map((l) => l.layer));
      assert.ok(layers.has("action"), `${s.id}/${b.id} 缺 action`);
      assert.ok(layers.has("mind"), `${s.id}/${b.id} 缺 mind`);
    }
  }
});

test("registry: 按条件过滤可触发场景", () => {
  const reg = new SceneRegistry();
  reg.loadAll(allDsl);
  const none = reg.available({});
  const some = reg.available({ virgin: true, affection: 90, ai_awakened: false, mainline_teacher_stage: 0 });
  assert.ok(some.length > none.length);
});

test("registry: 按角色过滤", () => {
  const reg = new SceneRegistry();
  reg.loadAll(allDsl);
  const forMother = reg.availableFor("母亲", { affection: 90, sister_first_done: true });
  assert.ok(forMother.length >= 1);
  assert.ok(forMother.every((s) => s.participants.includes("母亲")));
});

test("registry: 夜袭场景在欲情不足时不可触发", () => {
  const reg = new SceneRegistry();
  reg.loadAll(allDsl);
  assert.equal(reg.materialize("night_raid_sister", { lust: 50, days_since: 2 }), null);
  assert.ok(reg.materialize("night_raid_sister", { lust: 95, days_since: 12 }));
});

// ============ 存档 ↔ SQL 行映射 ============
test("store: SaveData 摊平为 SQL 行", () => {
  const data = newSave(VERSION, { day: 3, minute: 600 });
  data.entities.push({
    id: "hero", kind: "hero",
    identity: { name: "主角", title: "扶她御姐", age: 28, heightCm: 178, tags: [] },
    physiology: { sex: "futanari", virgin: true, pregnant: false, pregnancyProgress: 0, fertileWindow: false },
    survival: { hunger: 80, thirst: 70, stamina: 90, energy: 85, mood: 60 }
  });
  data.relations.push({ fromId: "hero", toId: "sister", affection: 60, loyalty: 50, bond: 3, intimacy: 20, lust: 92, daysSinceIntimacy: 11 });
  data.jobs.push({ entityId: "sister", jobId: "logistics", bonus: 0.15, daysOnJob: 4 });
  data.tech.push({ branch: "pharma", nodeId: "med_recreational", tier: 3, unlocked: true, progress: 1 });

  const rows = toRows(1, data);
  const sum = rowSummary(rows);
  assert.equal(sum["save"], 1);
  assert.equal(sum["world"], 1);
  assert.equal(sum["entity"], 1);
  assert.equal(sum["relationship"], 1);
  assert.equal(sum["job"], 1);
  assert.equal(sum["tech"], 1);
});

test("store: SQL 行还原回 SaveData", () => {
  const data = newSave(VERSION, { day: 7, minute: 480 });
  data.entities.push({
    id: "hero", kind: "hero",
    identity: { name: "主角", title: "扶她御姐", age: 28, heightCm: 178, tags: ["futanari"] },
    physiology: { sex: "futanari", virgin: true, pregnant: false, pregnancyProgress: 0, fertileWindow: false },
    survival: { hunger: 80, thirst: 70, stamina: 90, energy: 85, mood: 60 }
  });
  data.relations.push({ fromId: "hero", toId: "mother", affection: 75, loyalty: 60, bond: 4, intimacy: 0, lust: 30, daysSinceIntimacy: 2 });
  data.flags = { slot: "auto", weather: "rain", season: "autumn" };

  const rows = toRows(1, data);
  const back = fromRows(rows, VERSION, SCHEMA_VERSION);
  assert.equal(back.time.day, 7);
  assert.equal(back.entities.length, 1);
  assert.equal(back.entities[0].identity.name, "主角");
  assert.equal(back.relations[0].affection, 75);
  assert.equal(back.relations[0].bond, 4);
  assert.equal(back.flags["weather"], "rain");
});

test("store: 往返后不变式仍成立", () => {
  const data = newSave(VERSION, { day: 1, minute: 0 });
  data.entities.push({
    id: "hero", kind: "hero",
    identity: { name: "主角", title: "扶她御姐", age: 28, heightCm: 178, tags: [] },
    physiology: { sex: "futanari", virgin: true, pregnant: false, pregnancyProgress: 0, fertileWindow: false },
    survival: { hunger: 50, thirst: 50, stamina: 50, energy: 50, mood: 50 }
  });
  data.relations.push({ fromId: "hero", toId: "x", affection: 50, loyalty: 50, bond: 2, intimacy: 0, lust: 0, daysSinceIntimacy: 0 });
  const back = fromRows(toRows(1, data), VERSION, SCHEMA_VERSION);
  assert.equal(checkInvariants(back).length, 0);
});



// ============ 科技树 ============
test("tech: 八条分支节点齐备", () => {
  assert.equal(BRANCHES.length, 8);
  const ids = new Set(allNodes().map((n) => n.id));
  assert.equal(ids.size, allNodes().length, "节点 id 必须唯一");
  for (const b of BRANCHES) {
    assert.ok(b.nodes.length >= 6, `${b.id} 节点过少：${b.nodes.length}`);
  }
});

test("tech: 所有前置引用有效且层级不高于自身", () => {
  for (const node of allNodes()) {
    for (const r of node.requires) {
      const pre = findNode(r);
      assert.ok(pre, `${node.id} 引用了不存在的前置 ${r}`);
      // 同层前置合法（如 shelter_private 依赖同层的 shelter_medical），
      // 但不得出现"依赖更高层"的循环倒挂
      assert.ok(pre!.tier <= node.tier, `${node.id}(T${node.tier}) 的前置 ${r}(T${pre!.tier}) 层级倒挂`);
    }
  }
});

test("tech: 每个分支的入口层都有无前置节点（不存在孤儿层）", () => {
  for (const b of BRANCHES) {
    const tiers = [...new Set(b.nodes.map((n) => n.tier))].sort((a, z) => a - z);
    const entry = tiers[0];
    // 机器人（末日前已存在）、制药与寿命（依赖医疗站）按设计自 T3 起步，
    // 避难所 / 远征 / 自我 / 防御 / 能源 自 T1 起
    const LATE_ENTRY: BranchId[] = ["robot", "pharma", "longevity"];
    if (!LATE_ENTRY.includes(b.id)) {
      assert.equal(entry, 1, `${b.id} 应从 T1 起步，实际 T${entry}`);
    } else {
      assert.equal(entry, 3, `${b.id} 应按设计自 T3 起步，实际 T${entry}`);
    }
    // 入口层必须存在无前置的节点，否则整条分支不可达
    const entryNodes = b.nodes.filter((n) => n.tier === entry);
    assert.ok(
      entryNodes.some((n) => n.requires.length === 0),
      `${b.id} 入口层 T${entry} 无无前置节点，整条分支不可达`
    );
    // 其余每层至少有一个节点的前置位于更低的层
    for (const t of tiers.filter((x) => x > entry)) {
      const layer = b.nodes.filter((n) => n.tier === t);
      const reachable = layer.some((n) => n.requires.some((r) => findNode(r)!.tier < t));
      assert.ok(reachable, `${b.id} T${t} 无可达节点`);
    }
  }
});

test("tech: 前置未满足时不可解锁", () => {
  let s = newTechState();
  const res = { 玻璃: 99, LED灯: 99, PVC管: 99, 滤网: 99 };
  const av = checkAvailability(s, "shelter_greenhouse", res);
  assert.equal(av.ok, false);
  assert.equal(av.reason, "missing-prereq");
  assert.deepEqual(av.missingPrereqs, ["shelter_purify"]);
});

test("tech: 资源不足时不可解锁", () => {
  let s = newTechState();
  const av = checkAvailability(s, "shelter_power", { 铜线: 3, 磁铁: 1 });
  assert.equal(av.ok, false);
  assert.equal(av.reason, "missing-resource");
  assert.deepEqual(av.missingResources, ["铜线", "磁铁"]);
});

test("tech: 满足条件可解锁，解锁后幂等", () => {
  let s = newTechState();
  assert.equal(canUnlock(s, "shelter_power", { 铜线: 10, 磁铁: 5 }), true);
  s = unlock(s, "shelter_power");
  assert.equal(isUnlocked(s, "shelter_power"), true);
  const av = checkAvailability(s, "shelter_power", {});
  assert.equal(av.reason, "unlocked");
  // 前置链打通后可研究下一层
  assert.equal(canUnlock(s, "shelter_reinforce", { 水泥: 30, 钢筋: 20 }), true);
});

test("tech: 研究推进按工时累积，到点完成", () => {
  let s = newTechState();
  s = startResearch(s, "shelter_power");
  const node = findNode("shelter_power")!;
  let r = tickResearch(s, node.hours / 2);
  assert.equal(r.completed, null);
  assert.ok(Math.abs(r.state.researching!.hours - node.hours / 2) < 0.001);
  r = tickResearch(r.state, node.hours / 2 + 1);
  assert.equal(r.completed, "shelter_power");
  assert.equal(r.state.researching, null);
  assert.equal(isUnlocked(r.state, "shelter_power"), true);
});

test("tech: 效率倍率与秒完成", () => {
  let s = newTechState();
  s = startResearch(s, "shelter_power");
  const node = findNode("shelter_power")!;
  // 2 倍效率，一半工时即可完成
  const fast = tickResearch(s, node.hours / 2, 2);
  assert.equal(fast.completed, "shelter_power");

  let s2 = newTechState();
  s2 = startResearch(s2, "shelter_power");
  const inst = tickResearch(s2, 0, 1, true);
  assert.equal(inst.completed, "shelter_power");
});

test("tech: 一键解锁到指定层级保持前置完整", () => {
  let s = newTechState();
  s = unlockBranchToTier(s, "energy", 3);
  for (const node of BRANCHES.find((b) => b.id === "energy")!.nodes.filter((n) => n.tier <= 3)) {
    assert.ok(isUnlocked(s, node.id), `${node.id} 应已解锁`);
  }
  // T4 未解锁
  assert.equal(isUnlocked(s, "en_solar3"), false);
});

test("tech: 全解锁包含所有节点", () => {
  const s = unlockAll(newTechState());
  for (const node of allNodes()) assert.ok(isUnlocked(s, node.id));
  assert.equal(s.unlocked.size, allNodes().length);
});

test("tech: 加成汇总区分乘算与加算", () => {
  let s = newTechState();
  s = unlock(s, "shelter_storage");   // storageMult: 2（乘）
  s = unlock(s, "exp_storage");       // storageMult: 1.5（乘）
  s = unlock(s, "self_cardio");       // staminaMax: 0.2（加）
  const b = aggregateBonuses(s);
  assert.equal(b["storageMult"], 3);        // 2 × 1.5
  assert.equal(Math.round(b["staminaMax"] * 100), 20);
});

test("tech: 分支进度统计", () => {
  let s = newTechState();
  s = unlockBranchToTier(s, "pharma", 3);
  const p = branchProgress(s).find((x) => x.branch === "pharma")!;
  assert.equal(p.name, "制药科技");
  assert.ok(p.unlocked >= 2);
  assert.equal(p.maxTier, 3);
  assert.ok(p.percent > 0 && p.percent < 100);
});

test("tech: 分支视图按层级排序并标注可用性", () => {
  const s = newTechState();
  const view = branchView(s, "pharma");
  assert.ok(view.length >= 6);
  const tiers = view.map((v) => v.node.tier);
  assert.deepEqual(tiers, [...tiers].sort((a, b) => a - b));
  assert.equal(view[0].available, true, "T3 基础制药无前置，应可用");
});

test("tech: 扶她药节点存在且效果明确", () => {
  const rec = findNode("ph_med_recreational")!;
  assert.match(rec.effect, /短暂/);
  const preg = findNode("ph_med_pregnant")!;
  assert.match(preg.effect, /主角受孕/);
  assert.equal(preg.tier, 4);
});

test("tech: 特殊AI接口节点位于机器人分支", () => {
  const node = findNode("rob_ai_interface")!;
  assert.equal(node.tier, 6);
  assert.match(node.effect, /长出脚|移动载体/);
  assert.ok(node.requires.includes("rob_network"));
});

test("tech: 重置清空全部状态", () => {
  let s = unlockAll(newTechState());
  s = reset(s);
  assert.equal(s.unlocked.size, 0);
  assert.equal(s.researching, null);
});



// ============ 战斗系统 ============
const rng = () => mulberry32(42);

test("combat: 初始化与单位构造", () => {
  const hero = newCombatant({ id: "hero", name: "主角", attack: 12, hp: 60, hpMax: 60 });
  const zombie = newCombatant({ id: "z1", name: "丧尸", hp: 30, hpMax: 30 });
  const s = startCombat(hero, [zombie]);
  assert.equal(s.round, 1);
  assert.equal(s.turn, "player");
  assert.equal(s.over, false);
  assert.match(s.log[0], /遭遇 丧尸/);
});

test("combat: 攻击造成伤害且不超过敌方血量", () => {
  const hero = newCombatant({ id: "hero", name: "主角", attack: 50, critRate: 0 });
  const zombie = newCombatant({ id: "z1", name: "丧尸", hp: 10, hpMax: 10, defense: 0, dodge: 0 });
  let s = startCombat(hero, [zombie]);
  s = playerAttack(s, "z1", rng());
  assert.equal(s.enemies[0].hp, 0);
  assert.equal(s.over, true);
  assert.equal(s.victory, true);
  assert.match(s.log[s.log.length - 1], /战斗胜利/);
});

test("combat: 闪避时伤害为 0", () => {
  const hero = newCombatant({ id: "hero", name: "主角", attack: 50 });
  const ninja = newCombatant({ id: "n1", name: "忍者", hp: 30, hpMax: 30, dodge: 1 });
  let s = startCombat(hero, [ninja]);
  s = playerAttack(s, "n1", rng());
  assert.equal(s.enemies[0].hp, 30);
  assert.match(s.log[s.log.length - 1], /被闪避/);
});

test("combat: 暴击提升伤害", () => {
  const a = newCombatant({ id: "a", name: "A", attack: 20, critRate: 0 });
  const b = newCombatant({ id: "b", name: "B", attack: 20, critRate: 1, critDmg: 2 });
  const target = () => newCombatant({ id: "t", name: "T", defense: 0, dodge: 0, hp: 100, hpMax: 100 });
  const normal = attack(a, target(), rng());
  const crit = attack(b, target(), rng());
  assert.equal(normal.crit, false);
  assert.equal(crit.crit, true);
  assert.ok(crit.damage > normal.damage);
});

test("combat: 魅惑仅对人形生效", () => {
  const hero = newCombatant({ id: "hero", name: "主角" });
  const human = newCombatant({ id: "h1", name: "掠夺者", humanoid: true });
  const beast = newCombatant({ id: "b1", name: "变异兽", humanoid: false });

  let s = startCombat(hero, [human, beast]);
  s = charmEnemy(s, "b1", () => 0.1);
  assert.match(s.log[s.log.length - 1], /不是人形/);

  s = charmEnemy(s, "h1", () => 0.1);
  assert.equal(s.enemies.find((e) => e.id === "h1")!.status.length, 1);
  assert.match(s.log[s.log.length - 1], /停滞 1 回合/);
});

test("combat: 被魅惑的敌人跳过回合", () => {
  const hero = newCombatant({ id: "hero", name: "主角", hp: 100, hpMax: 100 });
  const human = newCombatant({ id: "h1", name: "掠夺者", humanoid: true, attack: 20 });
  let s = startCombat(hero, [human]);
  s = charmEnemy(s, "h1", () => 0.1);
  const before = s.player.hp;
  s = enemyTurn(s, rng());
  assert.equal(s.player.hp, before, "被魅惑的敌人不应造成伤害");
  assert.match(s.log[s.log.length - 1], /无法行动/);
});

test("combat: 敌人回合造成伤害并可致败", () => {
  const hero = newCombatant({ id: "hero", name: "主角", hp: 5, hpMax: 50, dodge: 0, defense: 0 });
  const brute = newCombatant({ id: "b1", name: "暴徒", attack: 30, critRate: 0 });
  let s = startCombat(hero, [brute]);
  s = enemyTurn(s, rng());
  assert.equal(s.player.hp, 0);
  assert.equal(s.over, true);
  assert.equal(s.victory, false);
  assert.match(s.log[s.log.length - 1], /战斗失败/);
});

test("combat: 回合推进递减状态并清理过期效果", () => {
  const hero = newCombatant({ id: "hero", name: "主角" });
  const human = newCombatant({ id: "h1", name: "掠夺者", humanoid: true });
  let s = startCombat(hero, [human]);
  s = charmEnemy(s, "h1", () => 0.1);
  assert.equal(s.enemies[0].status.length, 1);
  s = advanceRound(s);
  assert.equal(s.enemies[0].status.length, 0, "1 回合后魅惑应失效");
  assert.equal(s.round, 2);
  assert.equal(s.turn, "player");
});

test("combat: 科技加成正确折算到主角数值", () => {
  const c = playerFromBonuses({ hp: 80, hpMax: 80 }, { meleeDmg: 0.25, dodge: 0.2, critRate: 0.3, critDmg: 2 });
  assert.equal(c.attack, 13);          // 10 × 1.25 = 12.5 → 13
  assert.ok(Math.abs(c.dodge - 0.25) < 1e-9);
  assert.ok(Math.abs(c.critRate - 0.35) < 1e-9);
  assert.equal(c.critDmg, 2);
  assert.equal(c.hp, 80);
});

test("combat: 扶她特性不参与战斗数值（INV-6）", () => {
  const c = playerFromBonuses({}, {});
  // 构造时不接受任何 futanari / 性征相关参数
  assert.equal("futanari" in c, false);
  assert.equal("sex" in c, false);
  assert.equal(Object.keys(c).some((k) => /sex|futanari|hormone/i.test(k)), false);
});

test("combat: 确定性随机可复现", () => {
  const a = mulberry32(123);
  const b = mulberry32(123);
  const seqA = Array.from({ length: 5 }, () => a());
  const seqB = Array.from({ length: 5 }, () => b());
  assert.deepEqual(seqA, seqB);
  assert.notDeepEqual(seqA, Array.from({ length: 5 }, () => mulberry32(999)()));
});

test("combat: 多敌人逐个行动", () => {
  const hero = newCombatant({ id: "hero", name: "主角", hp: 200, hpMax: 200, dodge: 0, defense: 0 });
  const e1 = newCombatant({ id: "e1", name: "丧尸A", attack: 10, critRate: 0 });
  const e2 = newCombatant({ id: "e2", name: "丧尸B", attack: 10, critRate: 0 });
  let s = startCombat(hero, [e1, e2]);
  s = enemyTurn(s, rng());
  assert.equal(s.player.hp, 180, "两个敌人各造成 10 点伤害");
});



// ============ 运行时主循环 ============
const baseTick = () => ({
  time: { day: 1, minute: 8 * 60 },
  survival: { hunger: 90, thirst: 90, stamina: 100, energy: 100, mood: 70 },
  activity: "idle" as const,
  lust: { value: 0, daysSinceIntimacy: 0, forced: false },
  job: null,
  tech: newTechState(),
  pregnancy: null,
  researchRate: 1,
  lustDailyGain: 5
});

test("loop: 时间推进与时段计算", () => {
  const out = tick(baseTick(), 8);
  assert.equal(out.time.day, 1);
  assert.equal(out.time.minute, 16 * 60);
  assert.equal(out.slot, "evening");
});

test("loop: 冻结时间不推进", () => {
  const out = tick({ ...baseTick(), freezeTime: true }, 12);
  assert.equal(out.time.minute, 8 * 60);
});

test("loop: 生存随时间下降", () => {
  const out = tick(baseTick(), 24);
  assert.ok(out.survival.hunger < 90);
  assert.ok(out.survival.thirst < 90);
  assert.ok(out.survival.hunger >= 0);
});

test("loop: 睡眠恢复体力", () => {
  const out = tick({ ...baseTick(), survival: { ...baseTick().survival, stamina: 20 }, activity: "sleep" }, 8);
  assert.ok(out.survival.stamina > 20, "睡眠应恢复体力");
});

test("loop: 欲情累积并触发夜袭警告", () => {
  // 85 + 2 天 × 5 = 95，冷落 12 天 → 夜袭阈值（未溢出到 100）
  const input = { ...baseTick(), lust: { value: 85, daysSinceIntimacy: 10, forced: false } };
  const out = tick(input, 24 * 2);
  assert.equal(out.lustStage, "nightRaid");
  assert.ok(out.warnings.some((w) => /夜袭/.test(w)));
});

test("loop: 欲情溢出到 100 转为强制触发", () => {
  const input = { ...baseTick(), lust: { value: 85, daysSinceIntimacy: 10, forced: false } };
  const out = tick(input, 24 * 3); // 85 + 15 = 100
  assert.equal(out.lustStage, "forced");
  assert.ok(out.warnings.some((w) => /强制触发/.test(w)));
});

test("loop: 科技研究在循环内推进并完成", () => {
  let tech = newTechState();
  tech = startResearch(tech, "shelter_power");
  const node = findNode("shelter_power")!;
  const out = tick({ ...baseTick(), tech }, node.hours + 1);
  assert.equal(out.completedTech, "shelter_power");
  assert.ok(isUnlocked(out.tech, "shelter_power"));
  assert.ok(out.warnings.some((w) => /科技完成/.test(w)));
});

test("loop: 作弊秒完成研究", () => {
  let tech = newTechState();
  tech = startResearch(tech, "shelter_clone");
  const out = tick({ ...baseTick(), tech, instantResearch: true }, 0);
  assert.equal(out.completedTech, "shelter_clone");
});

test("loop: 岗位疲劳随时间累积", () => {
  const out = tick({ ...baseTick(), job: { id: "lab", bonus: 0.35, daysOnJob: 0 } }, 24 * 5);
  assert.equal(out.job!.daysOnJob, 5);
});

test("loop: 孕晚期禁止战斗并改为待命", () => {
  const preg = { motherId: "hero", fatherId: "sister", conceivedDay: 0, progress: 25, multiple: 1 };
  const out = tick({ ...baseTick(), pregnancy: preg, activity: "combat" }, 1);
  assert.ok(out.warnings.some((w) => /无法参与战斗/.test(w)));
});

test("loop: 怀孕推进至分娩产出女性后代", () => {
  const preg = { motherId: "hero", fatherId: "sister", conceivedDay: 0, progress: 25, multiple: 2 };
  const out = tick({ ...baseTick(), pregnancy: preg }, 24 * 10);
  assert.equal(out.delivered, 2);
  assert.equal(out.pregnancy, null);
  assert.ok(out.warnings.some((w) => /分娩完成/.test(w)));
});

test("loop: 快进多天用于跳过夜晚", () => {
  const out = fastForward(baseTick(), 3);
  assert.equal(out.time.day, 4);
  assert.ok(out.survival.stamina >= 0);
});

test("loop: 科技加成影响体力上限", () => {
  let tech = newTechState();
  tech = unlock(tech, "self_cardio"); // staminaMax +20%
  const out = tick({ ...baseTick(), tech, survival: { ...baseTick().survival, stamina: 50 } }, 1);
  assert.ok(out.survival.stamina > 50, "心肺强化应提升体力");
});
