import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  QUESTS, questDef, questForCompanion, questsByReward,
  newQuestStates, questState, currentStep, progressText, checkStep, advanceQuest,
  pauseQuest, resumeQuest, resetQuest,
  RECRUIT_TEMPLATES, recruitTemplatesForRegion, tryRecruit,
  summarizeQuests, questsToJSON, questsFromJSON,
  type QuestContext, type QuestStage
} from "../src/systems/quest.ts";
import { mulberry32 } from "../src/systems/inventory.ts";
import { GameSession } from "../src/runtime/session.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT_DIR = join(__dirname, "..", "data", "scripts");
const scripts = () => readdirSync(SCRIPT_DIR).filter((f) => f.endsWith(".dsl")).map((f) => readFileSync(join(SCRIPT_DIR, f), "utf8"));

/** 按主线的下一步区域自动构造上下文并推进，返回推进结果 */
function runStep(states: Record<string, any>, def: any, opts: { affection?: number; flags?: Record<string, unknown>; countOf?: () => number } = {}) {
  const st = states[def.id];
  const step = def.steps.find((x: any) => x.stage === st.stage + 1);
  const region = step?.region ?? "home";
  const c = ctx({
    region,
    flags: opts.flags ?? { sister_first_done: true, teacher_joined: true, baker_joined: true, heiress_joined: true, mechanic_joined: true, hunter_joined: true, idol_joined: true, librarian_joined: true, neighbor_joined: true, nun_joined: true, pharmacist_joined: true, pianist_joined: true, pilot_joined: true, singlemom_joined: true, surgeon_joined: true, colleague_joined: true },
    affection: opts.affection ?? 100,
    countOf: opts.countOf ?? (() => 100)
  });
  return advanceQuest(states, def, c);
}

function ctx(over: Partial<QuestContext> = {}): QuestContext {
  return {
    flags: {},
    region: "home",
    countOf: () => 100,
    affection: 100,
    paused: false,
    ...over
  };
}

// ============ 目录 ============

test("quest: 主线目录非空且 id 唯一", () => {
  assert.ok(QUESTS.length >= 15, `应有 15+ 主线，实际 ${QUESTS.length}`);
  const ids = new Set(QUESTS.map((x) => x.id));
  assert.equal(ids.size, QUESTS.length);
});

test("quest: 主线字段合法", () => {
  for (const q of QUESTS) {
    assert.ok(q.title.length > 0, `${q.id} 缺标题`);
    assert.ok(q.summary.length > 0, `${q.id} 缺摘要`);
    assert.ok(q.companionName.length > 0, `${q.id} 缺角色名`);
    assert.ok(q.steps.length >= 3, `${q.id} 至少应有 3 步，实际 ${q.steps.length}`);
    assert.ok(q.rewards.length > 0, `${q.id} 缺奖励`);
  }
});

test("quest: 步骤编号连续从 1 开始", () => {
  for (const q of QUESTS) {
    const stages = q.steps.map((s) => s.stage).sort((a, b) => a - b);
    for (let i = 0; i < stages.length; i++) {
      assert.equal(stages[i], i + 1, `${q.id} 步骤编号不连续：${stages.join(",")}`);
    }
  }
});

test("quest: 覆盖设计中的 15 条主线", () => {
  const need = [
    "q_teacher", "q_pharmacist", "q_nun", "q_idol", "q_mechanic",
    "q_hunter", "q_pianist", "q_pilot", "q_baker", "q_neighbor",
    "q_colleague", "q_librarian", "q_heiress", "q_surgeon", "q_singlemom"
  ];
  for (const id of need) assert.ok(questDef(id), `缺少主线 ${id}`);
});

test("quest: 附带后宫定义正确", () => {
  const teacher = questDef("q_teacher")!;
  assert.ok(teacher.grantsCompanions?.some((c) => c.id === "student"), "教师线应附带女学生");

  const mom = questDef("q_singlemom")!;
  assert.ok(mom.grantsCompanions?.some((c) => c.id === "daughter"), "单亲妈妈线应附带女儿");
});

test("quest: 按同伴与奖励查询", () => {
  assert.equal(questForCompanion("teacher")?.id, "q_teacher");
  assert.equal(questForCompanion("nonexistent"), undefined);
  assert.ok(questsByReward("钥匙").length >= 1);
});

test("quest: 家庭线需要前置标志与好感", () => {
  const mother = questDef("q_mother")!;
  assert.ok(mother.requiresFlags?.includes("sister_first_done"));
  assert.ok((mother.requiresAffection ?? 0) > 0);
});

// ============ 运行时状态 ============

test("quest: 初始状态全部未开始", () => {
  const s = newQuestStates();
  assert.equal(Object.keys(s).length, QUESTS.length);
  for (const q of QUESTS) {
    assert.equal(s[q.id].stage, 0);
    assert.equal(s[q.id].started, false);
    assert.equal(s[q.id].completed, false);
    assert.equal(s[q.id].paused, false);
  }
});

test("quest: 当前步骤与进度文本", () => {
  const def = questDef("q_baker")!;
  let states = newQuestStates();
  assert.equal(progressText(def, states[def.id]), "未开始");

  states = runStep(states, def).states;
  assert.match(progressText(def, states[def.id]), /第 2\/3 步/);
});

// ============ 检查 ============

test("quest: 条件齐备时通过", () => {
  const def = questDef("q_baker")!;
  const states = newQuestStates();
  // 第一步区域是 suburb
  const check = checkStep(def, states[def.id], ctx({ region: "suburb" }));
  assert.equal(check.ok, true);
});

test("quest: 区域不符时拒绝", () => {
  const def = questDef("q_baker")!;
  const states = newQuestStates();
  const check = checkStep(def, states[def.id], ctx({ region: "home" }));
  assert.equal(check.ok, false);
  assert.equal(check.reason, "wrong-region");
  assert.equal(check.regionOk, false);
});

test("quest: 缺物品时拒绝", () => {
  const def = questDef("q_surgeon")!;
  let states = newQuestStates();
  // 推进到第 4 步（需要手术器械）
  const base = ctx({ region: "hospital" });
  states = advanceQuest(states, def, base).states;
  states = advanceQuest(states, def, base).states;
  states = advanceQuest(states, def, base).states;

  const check = checkStep(def, states[def.id], ctx({ region: "home", countOf: () => 0 }));
  assert.equal(check.ok, false);
  assert.equal(check.reason, "missing-items");
  assert.ok(Object.keys(check.missingItems).length > 0);
});

test("quest: 缺前置标志时拒绝", () => {
  const def = questDef("q_mother")!;
  const states = newQuestStates();
  const check = checkStep(def, states[def.id], ctx({ flags: {}, region: "home" }));
  assert.equal(check.ok, false);
  assert.equal(check.reason, "missing-flag");
  assert.ok(check.missingFlags.includes("sister_first_done"));
});

test("quest: 好感不足时拒绝", () => {
  const def = questDef("q_mother")!;
  const states = newQuestStates();
  const check = checkStep(def, states[def.id], ctx({
    flags: { sister_first_done: true },
    affection: 10
  }));
  assert.equal(check.ok, false);
  assert.equal(check.reason, "low-affection");
  assert.ok(check.needAffection > 0);
});

test("quest: 暂停时拒绝", () => {
  const def = questDef("q_baker")!;
  const states = newQuestStates();
  const check = checkStep(def, states[def.id], ctx({ region: "suburb", paused: true }));
  assert.equal(check.ok, false);
  assert.equal(check.reason, "paused");
});

test("quest: 完成后拒绝", () => {
  const def = questDef("q_baker")!;
  let states = newQuestStates();
  for (let i = 0; i < def.steps.length; i++) {
    states = runStep(states, def).states;
  }
  assert.equal(states[def.id].completed, true);
  const check = checkStep(def, states[def.id], ctx());
  assert.equal(check.reason, "completed");
});

// ============ 推进 ============

test("quest: 逐步推进到完成", () => {
  const def = questDef("q_baker")!;
  let states = newQuestStates();

  const r1 = advanceQuest(states, def, ctx({ region: "suburb" }));
  assert.equal(r1.newStage, 1);
  assert.equal(r1.step?.name, "进入面包店");
  assert.equal(r1.questCompleted, false);
  assert.equal(r1.setFlag, "baker_found");
  states = r1.states;

  const r2 = advanceQuest(states, def, ctx({ region: "suburb" }));
  assert.equal(r2.newStage, 2);
  assert.ok(r2.rewardAffection > 0, "应提升好感");
  states = r2.states;

  const r3 = advanceQuest(states, def, ctx({ region: "home" }));
  assert.equal(r3.questCompleted, true, "第三步应完成整条主线");
  assert.ok(r3.rewards.length > 0);
  assert.equal(r3.states[def.id].completed, true);
});

test("quest: 条件不满足时推进无效", () => {
  const def = questDef("q_baker")!;
  const states = newQuestStates();
  const r = advanceQuest(states, def, ctx({ region: "home" }));
  assert.equal(r.step, null);
  assert.equal(r.newStage, 0);
  assert.deepEqual(r.states, states);
});

test("quest: 附带后宫在完成时给予", () => {
  const def = questDef("q_teacher")!;
  let states = newQuestStates();
  for (let i = 0; i < def.steps.length; i++) {
    const r = runStep(states, def);
    states = r.states;
    if (r.questCompleted) {
      assert.ok(r.grantsCompanions.some((c) => c.id === "student"));
      break;
    }
  }
});

test("quest: 暂停与继续", () => {
  const def = questDef("q_baker")!;
  let states = newQuestStates();
  states = advanceQuest(states, def, ctx({ region: "suburb" })).states;

  states = pauseQuest(states, def.id);
  assert.equal(states[def.id].paused, true);

  const blocked = advanceQuest(states, def, ctx({ region: "suburb", paused: true }));
  assert.equal(blocked.step, null, "暂停时不应推进");

  states = resumeQuest(states, def.id);
  assert.equal(states[def.id].paused, false);
  const ok = advanceQuest(states, def, ctx({ region: "suburb" }));
  assert.ok(ok.step);
});

test("quest: 重置未完成的主线", () => {
  const def = questDef("q_baker")!;
  let states = newQuestStates();
  states = advanceQuest(states, def, ctx({ region: "suburb" })).states;
  states = resetQuest(states, def.id);
  assert.equal(states[def.id].stage, 0);
  assert.equal(states[def.id].started, false);
});

test("quest: 已完成的主线不可重置", () => {
  const def = questDef("q_baker")!;
  let states = newQuestStates();
  for (let i = 0; i < def.steps.length; i++) {
    states = runStep(states, def).states;
  }
  const after = resetQuest(states, def.id);
  assert.equal(after[def.id].completed, true, "已完成应保留");
});

// ============ 招募 ============

test("quest: 招募模板库合法", () => {
  assert.ok(RECRUIT_TEMPLATES.length >= 10);
  for (const t of RECRUIT_TEMPLATES) {
    assert.ok(t.name.length > 0, `${t.id} 缺名称`);
    assert.ok(t.trait.length > 0, `${t.id} 缺特长`);
    assert.ok(t.regions.length > 0, `${t.id} 缺区域`);
    assert.ok(t.baseAffection > 0);
  }
});

test("quest: 按区域筛选模板", () => {
  const list = recruitTemplatesForRegion(["hospital"]);
  assert.ok(list.some((t) => t.id === "r_nurse"));
});

test("quest: 招募判定可复现", () => {
  const a = tryRecruit(["suburb"], mulberry32(42));
  const b = tryRecruit(["suburb"], mulberry32(42));
  assert.deepEqual(a, b);
});

test("quest: 招募有成功率", () => {
  let hits = 0;
  for (let seed = 0; seed < 100; seed++) {
    const r = tryRecruit(["suburb"], mulberry32(seed));
    if (r.template) hits++;
  }
  assert.ok(hits > 0, "100 次应至少遇到一次");
  assert.ok(hits < 100, "不应每次都遇到");
});

test("quest: 无匹配区域时返回空", () => {
  const r = tryRecruit(["nonexistent_region"], mulberry32(1));
  assert.equal(r.template, null);
  assert.equal(r.success, false);
});

// ============ 汇总 ============

test("quest: 汇总统计", () => {
  let states = newQuestStates();
  const def = questDef("q_baker")!;
  for (let i = 0; i < def.steps.length; i++) {
    states = runStep(states, def).states;
  }

  const sum = summarizeQuests(states);
  assert.equal(sum.total, QUESTS.length);
  assert.equal(sum.completed, 1);
  assert.ok(sum.started >= 1);
  assert.ok(sum.unlockedCompanions >= 1);
  assert.equal(sum.list.length, QUESTS.length);
});

// ============ 序列化 ============

test("quest: 序列化往返", () => {
  let states = newQuestStates();
  const def = questDef("q_baker")!;
  states = advanceQuest(states, def, ctx({ region: "suburb" })).states;
  states = pauseQuest(states, def.id);

  const json = questsToJSON(states);
  const back = questsFromJSON(json);

  assert.equal(back[def.id].stage, 1);
  assert.equal(back[def.id].started, true);
  assert.equal(back[def.id].paused, true);
});

test("quest: 空输入返回初始状态", () => {
  const s = questsFromJSON(null);
  assert.equal(Object.keys(s).length, QUESTS.length);
  assert.equal(s[QUESTS[0].id].stage, 0);
});

// ============ 会话集成 ============

test("session/quest: 开局全部未开始", () => {
  const s = new GameSession();
  const sum = s.questSummary();
  assert.equal(sum.total, QUESTS.length);
  assert.equal(sum.started, 0);
  assert.equal(sum.completed, 0);
});

test("session/quest: 推进需要正确区域", () => {
  const s = new GameSession();
  const r = s.advanceQuest("q_baker");
  assert.equal(r.ok, false);
  assert.equal(r.reason, "wrong-region");

  // 移动到城南居民区
  s.world.current = "suburb";
  const r2 = s.advanceQuest("q_baker");
  assert.equal(r2.ok, true);
  assert.equal(r2.step, "进入面包店");
  assert.equal(s.flags["baker_found"], true);
});

test("session/quest: 完成主线给予附带后宫", () => {
  const s = new GameSession();
  const before = s.joined().length;
  const def = questDef("q_teacher")!;

  // 按每步的区域推进
  for (let i = 0; i < def.steps.length; i++) {
    const st = s.quests["q_teacher"];
    const step = def.steps.find((x) => x.stage === st.stage + 1);
    if (step?.region) s.world.current = step.region;
    const r = s.advanceQuest("q_teacher");
    if (r.questCompleted) {
      assert.ok(r.granted?.some((g) => g.id === "student"), "应附带女学生");
      break;
    }
  }
  assert.ok(s.joined().length > before, "同伴数应增加");
  assert.ok(s.companion("student"), "女学生应已加入");
});

test("session/quest: 完成主线设置加入标志", () => {
  const s = new GameSession();
  const def = questDef("q_baker")!;
  for (let i = 0; i < def.steps.length; i++) {
    const st = s.quests["q_baker"];
    const step = def.steps.find((x) => x.stage === st.stage + 1);
    if (step?.region) s.world.current = step.region;
    s.advanceQuest("q_baker");
  }
  assert.equal(s.flags["baker_joined"], true);
  assert.equal(s.flags["q_baker_done"], true);
});

test("session/quest: 好感奖励生效", () => {
  const s = new GameSession();
  const def = questDef("q_teacher")!;
  let gotAffection = 0;

  for (let i = 0; i < def.steps.length; i++) {
    const st = s.quests["q_teacher"];
    const step = def.steps.find((x) => x.stage === st.stage + 1);
    if (step?.region) s.world.current = step.region;
    const r = s.advanceQuest("q_teacher");
    if ((r.rewardAffection ?? 0) > 0) gotAffection += r.rewardAffection!;
  }
  assert.ok(gotAffection > 0, "应至少获得一次好感奖励");
  assert.ok(s.companion("teacher"), "教师应已加入");
  // 初始 25 + 暂存好感（第 4 步的 +20）应已补发
  assert.equal(s.companion("teacher")!.relationship.affection, 45, "初始 25 + 暂存 20");
  assert.equal(s.quests["q_teacher"].pendingAffection, 0, "暂存好感应已清零");
});

test("session/quest: 暂停与继续", () => {
  const s = new GameSession();
  s.world.current = "suburb";
  s.advanceQuest("q_baker");
  s.pauseQuest("q_baker");
  const blocked = s.advanceQuest("q_baker");
  assert.equal(blocked.ok, false);
  assert.equal(blocked.reason, "paused");

  s.resumeQuest("q_baker");
  const ok = s.advanceQuest("q_baker");
  assert.equal(ok.ok, true);
});

test("session/quest: 随机招募", () => {
  const s = new GameSession();
  s.world.current = "hospital";
  let recruited = false;
  for (let seed = 0; seed < 50; seed++) {
    const r = s.tryRecruitHere(seed);
    if (r.success && r.template) { recruited = true; break; }
  }
  assert.equal(recruited, true, "50 次尝试应至少招募到一人");
});

test("session/quest: 主线数值进入剧本变量集", () => {
  const s = new GameSession();
  const v = s.vars();
  assert.equal(v["questsCompleted"], 0);
  assert.equal(v["questsTotal"], QUESTS.length);
});

test("session/quest: 随存档往返", () => {
  const s = new GameSession();
  s.world.current = "suburb";
  s.advanceQuest("q_baker");
  s.advanceQuest("q_baker");
  s.pauseQuest("q_baker");

  const data = s.toSave("slot");
  const back = GameSession.fromSave(data);

  assert.equal(back.quests["q_baker"].stage, 2);
  assert.equal(back.quests["q_baker"].paused, true);
});

test("session/quest: 摘要包含主线信息", () => {
  const s = new GameSession();
  const sum = s.summary();
  assert.equal(sum.questsCompleted, 0);
  assert.equal(sum.questsTotal, QUESTS.length);
});

test("session/quest: 全部主线可走通", () => {
  const s = new GameSession();
  s.unlockEverything();
  // 给足所有可能需要的物品
  for (const id of ["medical_supply", "bandage", "surgical_kit", "cloth", "canned_food",
                    "copper_wire", "magnet", "wood", "steel_bar"]) {
    s.addToStorage(id, 999);
  }
  // 提升所有同伴好感
  for (const c of s.companions) {
    c.relationship = { ...c.relationship, affection: 100, bond: 5 };
  }
  s.flags["sister_first_done"] = true;

  let completed = 0;
  for (const q of QUESTS) {
    // 找到该主线所有涉及的区域，逐个尝试推进
    for (let guard = 0; guard < 20; guard++) {
      const st = s.quests[q.id];
      if (st.completed) break;
      const stepDef = q.steps.find((x) => x.stage === st.stage + 1);
      if (!stepDef) break;
      if (stepDef.region) s.world.current = stepDef.region;
      const r = s.advanceQuest(q.id);
      if (!r.ok) {
        // 好感或标志不足时补齐
        for (const c of s.companions) {
          c.relationship = { ...c.relationship, affection: 100 };
        }
        s.flags["sister_first_done"] = true;
        s.flags["teacher_joined"] = true;
        s.flags["baker_joined"] = true;
        s.flags["heiress_joined"] = true;
        s.flags["mechanic_joined"] = true;
        s.flags["hunter_joined"] = true;
        s.flags["idol_joined"] = true;
        s.flags["librarian_joined"] = true;
        s.flags["neighbor_joined"] = true;
        s.flags["nun_joined"] = true;
        s.flags["pharmacist_joined"] = true;
        s.flags["pianist_joined"] = true;
        s.flags["pilot_joined"] = true;
        s.flags["singlemom_joined"] = true;
        s.flags["surgeon_joined"] = true;
        s.flags["colleague_joined"] = true;
        const retry = s.advanceQuest(q.id);
        if (!retry.ok) break;
      }
    }
    if (s.quests[q.id].completed) completed++;
  }
  assert.equal(completed, QUESTS.length, `应能走通全部 ${QUESTS.length} 条主线，实际 ${completed}`);
});