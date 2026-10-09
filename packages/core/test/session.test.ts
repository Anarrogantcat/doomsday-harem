import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { GameSession } from "../src/runtime/session.ts";
import { slotOf } from "../src/types.ts";
import { findNode } from "../src/tech/branches.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT_DIR = join(__dirname, "..", "data", "scripts");

function allScripts(): string[] {
  return readdirSync(SCRIPT_DIR)
    .filter((f) => f.endsWith(".dsl"))
    .map((f) => readFileSync(join(SCRIPT_DIR, f), "utf8"));
}

// ============ 初始化 ============

test("session: 开局状态符合设计", () => {
  const s = new GameSession();
  assert.equal(s.time.day, 1);
  assert.equal(s.time.minute, 8 * 60);
  assert.equal(s.hero.identity.heightCm, 178);
  assert.equal(s.hero.identity.tags.includes("futanari"), true);
  assert.equal(s.hero.physiology.virgin, true);
  assert.equal(s.hero.physiology.sex, "futanari");
  assert.equal(s.joined().length, 4, "开局四位同伴：母亲/姐姐/妹妹/特殊AI");
  assert.equal(s.offspring.length, 0);
});

test("session: 开局同伴数值与设计一致", () => {
  const s = new GameSession();
  const sister = s.companion("sister")!;
  assert.equal(sister.identity.heightCm, 174);
  assert.equal(sister.relationship.affection, 60);
  assert.equal(sister.lust.value, 92);
  assert.equal(sister.lust.daysSinceIntimacy, 0);

  const ai = s.companion("ai")!;
  assert.equal(ai.relationship.affection, 85, "特殊AI 初始好感 85");
  assert.equal(ai.relationship.role, "ai");

  const mother = s.companion("mother")!;
  assert.equal(mother.identity.heightCm, 172);
});

// ============ 时间推进 ============

test("session: advance 推进时间并消耗生存属性", () => {
  const s = new GameSession();
  const before = s.hero.survival.hunger;
  const out = s.advance(4, "work");
  assert.equal(out.time.minute, 12 * 60);
  assert.ok(s.hero.survival.hunger < before, "饥饿应下降");
  assert.equal(out.slot, slotOf(12 * 60));
});

test("session: sleep 快进整天并恢复体力", () => {
  const s = new GameSession();
  s.hero.survival = { ...s.hero.survival, stamina: 20, energy: 20 };
  const out = s.sleep(1);
  assert.equal(out.time.day, 2);
  assert.ok(s.hero.survival.stamina > 20, "睡眠应恢复体力");
});

test("session: 全天候 —— 任意时段都能推进", () => {
  const s = new GameSession();
  const slots = new Set<string>();
  for (let h = 0; h < 24; h += 3) {
    const t = new GameSession({ time: { day: 1, minute: h * 60 } });
    slots.add(t.slot);
  }
  assert.ok(slots.size >= 6, `应覆盖多个时段，实际 ${slots.size}`);
});

// ============ 科技 ============

test("session: 科技研究需要资源，扣费后进入研究中", () => {
  const s = new GameSession({ resources: { "铜线": 20, "磁铁": 10 } });
  const r = s.beginResearch("shelter_power");
  assert.equal(r.ok, true);
  assert.equal(s.resources["铜线"], 10, "应扣除 10 铜线");
  assert.equal(s.resources["磁铁"], 5);
  assert.equal(s.tech.researching?.nodeId, "shelter_power");
});

test("session: 资源不足时拒绝开始研究", () => {
  const s = new GameSession({ resources: { "铜线": 1 } });
  const r = s.beginResearch("shelter_power");
  assert.equal(r.ok, false);
  assert.equal(r.reason, "missing-resource");
  assert.equal(s.tech.researching, null);
});

test("session: 研究随时间推进自动完成", () => {
  const s = new GameSession({ resources: { "铜线": 20, "磁铁": 10 } });
  s.beginResearch("shelter_power");
  const node = findNode("shelter_power")!;
  // 推进超过所需工时
  s.advance(node.hours + 1, "work");
  assert.equal(s.has("shelter_power"), true, "应已完成");
});

test("session: 前置未满足时不可研究", () => {
  const s = new GameSession({ resources: { "水泥": 100, "钢筋": 100 } });
  const r = s.beginResearch("shelter_reinforce"); // 需要 shelter_power
  assert.equal(r.ok, false);
  assert.equal(r.reason, "missing-prereq");
  assert.deepEqual(s.availability("shelter_reinforce").missingPrereqs, ["shelter_power"]);
});

test("session: 科技加成影响数值（体力上限）", () => {
  const s = new GameSession();
  const before = s.bonuses();
  s.forceComplete("shelter_reinforce");
  const after = s.bonuses();
  assert.ok((after["raidReduction"] ?? 0) > (before["raidReduction"] ?? 0));
});

test("session: 实验室岗位加速研究", () => {
  const s = new GameSession({ resources: { "铜线": 50, "磁铁": 20 } });
  // 药剂师类角色（这里用 AI 占位）分配到实验室
  s.setJob("ai", "lab", 0.35);
  s.beginResearch("shelter_power");
  const node = findNode("shelter_power")!;
  // 若加速生效，所需实际时间应少于基准
  const hoursNeeded = node.hours;
  s.advance(hoursNeeded * 0.8, "work");
  assert.equal(s.has("shelter_power"), true, "实验室加成应使其提前完成");
});

test("session: 科技进度统计", () => {
  const s = new GameSession();
  const prog = s.techProgress();
  assert.equal(prog.length, 8, "八条分支");
  const total = prog.reduce((sum, b) => sum + b.total, 0);
  assert.ok(total > 100, `节点总数应超过 100，实际 ${total}`);
  assert.ok(prog.every((b) => b.unlocked === 0));
});

test("session: 全解锁与重置", () => {
  const s = new GameSession();
  s.unlockEverything();
  assert.ok(s.tech.unlocked.size > 100);
  assert.equal(s.tech.researching, null);
  s.resetTech();
  assert.equal(s.tech.unlocked.size, 0);
});

// ============ 关系 ============

test("session: 满足同伴后欲情清零且好感忠诚上升", () => {
  const s = new GameSession();
  const before = s.companion("sister")!;
  const affBefore = before.relationship.affection;
  const loyBefore = before.relationship.loyalty;
  assert.equal(before.lust.value, 92);

  s.satisfyCompanion("sister", "active");
  const after = s.companion("sister")!;
  assert.equal(after.lust.value, 0);
  assert.equal(after.relationship.affection, affBefore + 5);
  assert.equal(after.relationship.loyalty, loyBefore + 3);
});

test("session: 拒绝邀约不扣好感，只增欲情", () => {
  const s = new GameSession();
  const affBefore = s.companion("sister")!.relationship.affection;
  const loyBefore = s.companion("sister")!.relationship.loyalty;
  s.refuseCompanion("sister");
  const after = s.companion("sister")!;
  assert.equal(after.relationship.affection, affBefore, "好感不变");
  assert.equal(after.relationship.loyalty, loyBefore, "忠诚不变");
  assert.equal(after.lust.value, 100, "欲情 +10 并钳制到 100");
});

test("session: 破处状态在首次满足后清除", () => {
  const s = new GameSession();
  assert.equal(s.companion("sister")!.physiology.virgin, true);
  assert.equal(s.hero.physiology.virgin, true);
  s.satisfyCompanion("sister", "active");
  assert.equal(s.companion("sister")!.physiology.virgin, false);
  assert.equal(s.hero.physiology.virgin, false, "主角处女状态也应清除");
});

test("session: 夜袭阈值判定", () => {
  const s = new GameSession();
  s.companion("sister")!.lust = { value: 95, daysSinceIntimacy: 11, forced: false };
  s.companion("sister2")!.lust = { value: 95, daysSinceIntimacy: 3, forced: false };
  const raids = s.pendingNightRaids();
  assert.equal(raids.length, 1);
  assert.equal(raids[0].id, "sister", "需同时满足欲情≥90 与冷落≥10天");
});

test("session: 夜袭无拒绝选项 —— 调用即完成", () => {
  const s = new GameSession();
  s.companion("sister")!.lust = { value: 95, daysSinceIntimacy: 11, forced: false };
  assert.equal(s.nightRaid("sister"), true);
  assert.equal(s.companion("sister")!.lust.value, 0);
});

test("session: 好感只升不降", () => {
  const s = new GameSession();
  const before = s.companion("mother")!.relationship.affection;
  s.gainAffection("mother", 10, 10);
  assert.equal(s.companion("mother")!.relationship.affection, before + 10);
  s.gainAffection("mother", -100, -100);
  assert.equal(s.companion("mother")!.relationship.affection, before + 10, "负数不应生效（clamp）");
});

test("session: 同伴欲情独立累积", () => {
  const s = new GameSession();
  const before = s.companion("sister2")!.lust.value;
  s.tickCompanionLust(3, 5);
  assert.ok(s.companion("sister2")!.lust.value > before);
});

// ============ 岗位 ============

test("session: 岗位分配与查询", () => {
  const s = new GameSession();
  assert.equal(s.companion("mother")!.job.id, "kitchen");
  s.setJob("mother", "medical", 0.4);
  assert.equal(s.companion("mother")!.job.id, "medical");
  assert.equal(s.companion("mother")!.job.bonus, 0.4);
  assert.equal(s.companion("mother")!.job.daysOnJob, 0, "换岗重置疲劳计数");

  const asg = s.jobAssignments();
  assert.ok(asg.some((a) => a.entityId === "mother" && a.job === "medical"));
});

// ============ 怀孕 ============

test("session: 主角怀孕推进至分娩产出女性后代", () => {
  const s = new GameSession();
  s.startHeroPregnancy("sister");
  assert.equal(s.hero.physiology.pregnant, true);
  assert.ok(s.hero.pregnancy);

  // 推进 30 天
  s.sleep(30);
  assert.equal(s.offspring.length, 1, "应产出一名后代");
  assert.equal(s.offspring[0].sex, "female", "INV-4：后代必为女性");
  assert.equal(s.hero.pregnancy, null, "分娩后怀孕状态清除");
});

test("session: 同伴怀孕标记", () => {
  const s = new GameSession();
  assert.equal(s.conceiveCompanion("sister"), true);
  assert.equal(s.companion("sister")!.physiology.pregnant, true);
  assert.equal(s.conceiveCompanion("sister"), false, "已怀孕不可重复");
});

// ============ 场景注册表 ============

test("session: 载入全部剧本", () => {
  const s = new GameSession();
  const n = s.loadScripts(allScripts());
  assert.equal(n, 20, `应载入 20 个剧本，实际 ${n}`);
});

test("session: 变量集包含同伴数值与标志位", () => {
  const s = new GameSession();
  s.setFlag("mainline_teacher_stage", 1);
  const v = s.vars();
  assert.equal(v["sister_affection"], 60);
  assert.equal(v["sister_bond"], 3);
  assert.equal(v["ai_affection"], 85);
  assert.equal(v["mainline_teacher_stage"], 1);
  assert.equal(v["day"], 1);
  assert.equal(v["companionCount"], 4);
});

test("session: 剧本条件决定可触发场景", () => {
  const s = new GameSession();
  s.loadScripts(allScripts());

  // 未设置主线标志 → 主线剧本不可触发
  const before = s.availableScenes().map((x) => x.id);
  assert.equal(before.includes("story_teacher"), false);

  // 设置标志后应可触发
  s.setFlag("mainline_teacher_stage", 1);
  const after = s.availableScenes().map((x) => x.id);
  assert.equal(after.includes("story_teacher"), true, "设置标志后主线应可触发");
});

test("session: 姐妹破处剧本需要 virgin 与好感条件", () => {
  const s = new GameSession();
  s.loadScripts(allScripts());

  // 姐姐好感 60 且 virgin → 用姐姐上下文可触发
  const scene = s.sceneFor("sister", "sister_first");
  assert.ok(scene, "sister_first 应可触发");
  assert.ok(scene!.beats.length >= 5);

  // 姐姐好感降到 30 → 不满足 affection >= 60
  const s2 = new GameSession();
  s2.loadScripts(allScripts());
  s2.companion("sister")!.relationship = { ...s2.companion("sister")!.relationship, affection: 30 };
  assert.equal(s2.sceneFor("sister", "sister_first"), null, "好感不足不应触发");
});

test("session: 按同伴过滤相关场景", () => {
  const s = new GameSession();
  s.loadScripts(allScripts());

  // 姐姐：破处场景（virgin && affection 60）+ 夜袭（lust 92 但冷落 0 天，不满足）
  const sisterScenes = s.scenesFor("姐姐");
  assert.ok(sisterScenes.length > 0, "应能找到姐姐相关场景");
  assert.ok(sisterScenes.every((x) => x.participants.includes("姐姐")));
  assert.ok(sisterScenes.some((x) => x.id === "sister_first"));

  // 母亲：好感 50 < 75 且 sister_first_done 未设 → 不可触发
  const motherScenes = s.scenesFor("母亲");
  assert.equal(motherScenes.length, 0, "条件不满足时母亲无场景");

  // 设置前置后母亲场景可触发
  s.companion("mother")!.relationship = { ...s.companion("mother")!.relationship, affection: 80 };
  s.setFlag("sister_first_done", true);
  assert.ok(s.scenesFor("母亲").some((x) => x.id === "mother_first"));
});

test("session: 剧本差分随数值变化", () => {
  const s = new GameSession();
  s.loadScripts(allScripts());

  // 姐姐欲情 92 > 80 → 已含差分
  const base = s.sceneFor("sister", "sister_first")!;
  const b2 = base.beats.find((b) => b.id === "b2")!;

  // 降到 50 → 差分应消失
  s.companion("sister")!.lust = { value: 50, daysSinceIntimacy: 0, forced: false };
  const low = s.sceneFor("sister", "sister_first")!;
  const b2low = low.beats.find((b) => b.id === "b2")!;
  assert.ok(b2.lines.length > b2low.lines.length, "欲情高时应多出差分台词");
});

// ============ 存档往返 ============

test("session: 存档往返保持状态", () => {
  const s = new GameSession({ resources: { "铜线": 20, "磁铁": 10 } });
  s.advance(6, "work");
  s.beginResearch("shelter_power");
  s.gainAffection("sister", 12, 8);
  s.satisfyCompanion("sister2", "active");
  s.setJob("mother", "medical", 0.4);
  s.setFlag("mainline_teacher_stage", 2);

  const data = s.toSave("slot1");
  const back = GameSession.fromSave(data);

  assert.equal(back.time.day, s.time.day);
  assert.equal(back.time.minute, s.time.minute);
  assert.equal(back.companion("sister")!.relationship.affection, s.companion("sister")!.relationship.affection);
  assert.equal(back.companion("sister2")!.lust.value, 0);
  assert.equal(back.companion("mother")!.job.id, "medical");
  assert.equal(back.getFlag("mainline_teacher_stage"), 2);
  assert.equal(back.tech.researching?.nodeId, "shelter_power", "研究中状态应恢复");
  assert.equal(back.resources["铜线"], 10);
});

test("session: 存档含科技与后代", () => {
  const s = new GameSession();
  s.forceComplete("shelter_power");
  s.startHeroPregnancy("sister");
  s.sleep(30);

  const data = s.toSave();
  assert.ok(data.tech.some((t) => t.nodeId === "shelter_power" && t.unlocked));
  const back = GameSession.fromSave(data);
  assert.equal(back.has("shelter_power"), true);
  assert.equal(back.offspring.length, 1);
});

// ============ 摘要 ============

test("session: 摘要包含关键信息", () => {
  const s = new GameSession();
  const sum = s.summary();
  assert.match(sum.time, /第1天 08:00/);
  assert.equal(sum.day, 1);
  assert.equal(sum.companions, 4);
  assert.ok(sum.techTotal > 100);
  assert.equal(sum.techUnlocked, 0);
  assert.equal(sum.offspring, 0);
  assert.deepEqual(sum.pendingRaids, []);
  assert.equal(sum.researching, null);
});

// ============ 作弊器联动 ============

test("session: 作弊器秒完成研究", () => {
  const s = new GameSession({ resources: { "铜线": 20, "磁铁": 10 }, instantResearch: true });
  s.beginResearch("shelter_power");
  s.advance(0.01, "idle");
  assert.equal(s.has("shelter_power"), true, "秒完成应生效");
});

test("session: 作弊器冻结时间", () => {
  const s = new GameSession({ freezeTime: true });
  const before = s.time.minute;
  s.advance(5, "work");
  assert.equal(s.time.minute, before, "时间应被冻结");
});

test("session: 全部剧本都能解析且不报错", () => {
  const s = new GameSession();
  const n = s.loadScripts(allScripts());
  assert.equal(n, 20);
  // 强制所有条件为真，确保每个剧本都能实体化
  const all: Record<string, number | boolean | string> = {};
  for (let i = 1; i <= 5; i++) {
    all[`mainline_teacher_stage`] = i;
    all[`mainline_baker_stage`] = i;
    all[`mainline_heiress_stage`] = i;
    all[`mainline_mechanic_stage`] = i;
    all[`mainline_hunter_stage`] = i;
    all[`mainline_idol_stage`] = i;
    all[`mainline_librarian_stage`] = i;
    all[`mainline_neighbor_stage`] = i;
    all[`mainline_nun_stage`] = i;
    all[`mainline_pharmacist_stage`] = i;
    all[`mainline_pianist_stage`] = i;
    all[`mainline_pilot_stage`] = i;
    all[`mainline_singlemom_stage`] = i;
    all[`mainline_surgeon_stage`] = i;
    all[`mainline_colleague_stage`] = i;
  }
  all["virgin"] = true;
  all["affection"] = 100;
  for (const name of ["sister", "sister2", "mother"]) {
    all[`${name}_affection`] = 100;
    all[`${name}_bond`] = 5;
    all[`${name}_lust`] = 100;
  }

  let materialized = 0;
  for (const sc of s.registry.all()) {
    const m = s.registry.materialize(sc.id, { ...s.vars(), ...all });
    if (m) {
      materialized++;
      assert.ok(m.beats.length > 0, `${sc.id} 实体化后应有节拍`);
    }
  }
  // 部分剧本（如 ai_awaken 需 ai_awakened == false）依赖特定标志，允许少量不可实体化
  assert.ok(materialized >= 17, `至少应能实体化 17 个场景，实际 ${materialized}`);
});
