import { test } from "node:test";
import assert from "node:assert/strict";

import {
  BRANCH_PREG_LABEL, BRANCH_PREG_DESC, branchPregStage,
  PREGNANCY_EVENTS, pregnancyEvent, pregnancyEventsForStage,
  DEFEAT_LABEL, DEFEAT_EVENTS, defeatEvent, rollDefeatOutcome, branchStats,
  type BranchPregStage, type DefeatOutcome
} from "../src/systems/branchEvents.ts";
import { GameSession } from "../src/runtime/session.ts";

const rng = () => 0.5;

// ============ 怀孕线 ============

test("branch: 六个怀孕阶段齐备", () => {
  for (const s of ["discover", "early", "middle", "late", "delivery", "postpartum"] as BranchPregStage[]) {
    assert.ok(BRANCH_PREG_LABEL[s], `${s} 缺标签`);
    assert.ok(BRANCH_PREG_DESC[s], `${s} 缺说明`);
  }
});

test("branch: 怀孕天数推导阶段", () => {
  assert.equal(branchPregStage(1), "discover");
  assert.equal(branchPregStage(3), "discover");
  assert.equal(branchPregStage(5), "early");
  assert.equal(branchPregStage(10), "early");
  assert.equal(branchPregStage(15), "middle");
  assert.equal(branchPregStage(25), "late");
  assert.equal(branchPregStage(30), "delivery");
  assert.equal(branchPregStage(35), "postpartum");
});

test("branch: 每个阶段都有事件", () => {
  for (const s of ["discover", "early", "middle", "late", "delivery", "postpartum"] as BranchPregStage[]) {
    assert.ok(pregnancyEventsForStage(s).length > 0, `${s} 无事件`);
  }
});

test("branch: 怀孕事件结构完整", () => {
  for (const e of PREGNANCY_EVENTS) {
    assert.ok(e.title.length > 0, `${e.id} 缺标题`);
    assert.ok(e.condition.length > 0, `${e.id} 缺条件`);
    assert.ok(e.guidance.length > 0, `${e.id} 缺写作指导`);
    assert.ok(e.beats.length >= 3, `${e.id} 节拍不足`);
    for (const b of e.beats) {
      assert.ok(b.pose.length > 0, `${e.id} 节拍缺 pose`);
      assert.ok(b.action.length > 0, `${e.id} 节拍缺 action`);
      assert.ok(b.sense.length > 0, `${e.id} 节拍缺 sense`);
      assert.ok(b.mind.length > 0, `${e.id} 节拍缺 mind`);
    }
  }
});

test("branch: 按 id 查询怀孕事件", () => {
  assert.ok(pregnancyEvent("preg_discover"));
  assert.equal(pregnancyEvent("nonexistent"), undefined);
});

test("branch: 分娩与产后可重复", () => {
  assert.equal(pregnancyEvent("preg_delivery")!.repeatable, true);
  assert.equal(pregnancyEvent("preg_postpartum")!.repeatable, true);
  assert.equal(pregnancyEvent("preg_discover")!.repeatable, false);
});

// ============ 战败线 ============

test("branch: 四种战败结果齐备", () => {
  for (const o of ["captured", "escaped", "rescued", "abandoned"] as DefeatOutcome[]) {
    assert.ok(DEFEAT_LABEL[o], `${o} 缺标签`);
  }
});

test("branch: 战败事件结构完整", () => {
  for (const e of DEFEAT_EVENTS) {
    assert.ok(e.title.length > 0);
    assert.ok(e.condition.length > 0);
    assert.ok(e.consequence.length > 0, `${e.id} 缺后果说明`);
    assert.ok(e.guidance.length > 0);
    assert.ok(e.beats.length >= 3, `${e.id} 节拍不足`);
    assert.ok(e.weight > 0, `${e.id} 权重应为正`);
  }
});

test("branch: 按 id 查询战败事件", () => {
  assert.ok(defeatEvent("defeat_captured"));
  assert.equal(defeatEvent("nonexistent"), undefined);
});

test("branch: 无同伴时不会触发被救", () => {
  for (let i = 0; i < 30; i++) {
    const e = rollDefeatOutcome(false, true, () => i / 30);
    assert.notEqual(e.outcome, "rescued", "无同伴不应触发被救");
  }
});

test("branch: 有同伴时可触发被救", () => {
  let found = false;
  for (let i = 0; i < 50; i++) {
    const e = rollDefeatOutcome(true, true, () => i / 50);
    if (e.outcome === "rescued") found = true;
  }
  assert.ok(found, "有同伴时应能触发被救");
});

test("branch: 非人形敌人不触发被俘", () => {
  for (let i = 0; i < 30; i++) {
    const e = rollDefeatOutcome(true, false, () => i / 30);
    assert.notEqual(e.outcome, "captured", "非人形不应触发被俘");
  }
});

test("branch: 有同伴时不触发昏迷", () => {
  for (let i = 0; i < 30; i++) {
    const e = rollDefeatOutcome(true, true, () => i / 30);
    assert.notEqual(e.outcome, "abandoned");
  }
});

test("branch: 统计", () => {
  const s = branchStats();
  assert.ok(s.pregnancyEvents >= 6);
  assert.equal(s.pregnancyStages, 6);
  assert.ok(s.defeatEvents >= 4);
  assert.equal(s.defeatOutcomes, 4);
  assert.ok(s.totalBeats > 30);
});

// ============ 会话集成 ============

test("session: 未怀孕时阶段为 null", () => {
  const s = new GameSession();
  assert.equal(s.heroPregnancyStage(), null);
  assert.equal(s.currentPregnancyEvent(), null);
});

test("session: 怀孕后可取阶段与事件", () => {
  const s = new GameSession();
  s.startHeroPregnancy("sister");
  const stage = s.heroPregnancyStage();
  assert.ok(stage, "应有怀孕阶段");
  const ev = s.currentPregnancyEvent();
  assert.ok(ev, "应有可触发事件");
});

test("session: 一次性事件不重复触发", () => {
  const s = new GameSession();
  s.startHeroPregnancy("sister");
  const first = s.currentPregnancyEvent();
  assert.ok(first);

  s.markPregnancyEventFired(first!.id);
  const second = s.currentPregnancyEvent();
  assert.notEqual(second?.id, first!.id, "已触发的事件不应再出现");
});

test("session: 战败结算产生结果", () => {
  const s = new GameSession();
  s.beginCombat("strays", 3);
  const e = s.resolveDefeat();
  assert.ok(e.id);
  assert.ok(e.title);
  assert.ok(DEFEAT_LABEL[e.outcome]);
});

test("session: 战败记录累积", () => {
  const s = new GameSession();
  s.beginCombat("strays", 3);
  s.resolveDefeat();
  s.beginCombat("strays", 3);
  s.resolveDefeat();

  const log = s.defeatLog();
  assert.equal(log.length, 2);
  assert.ok(log[0].label.length > 0);
});

test("session: 战败损失物资", () => {
  const s = new GameSession();
  s.addToStorage("ammo_9mm", 100);
  const before = s.storage.stacks.find((x) => x.itemId === "ammo_9mm")?.count ?? 0;

  s.beginCombat("strays", 3);
  s.resolveDefeat();

  const after = s.storage.stacks.find((x) => x.itemId === "ammo_9mm")?.count ?? 0;
  assert.ok(after <= before, "战败应损失物资或不变");
});

test("session: 分支事件统计可查", () => {
  const s = new GameSession();
  const st = s.branchEventStats();
  assert.ok(st.pregnancyEvents > 0);
  assert.ok(st.defeatEvents > 0);
});

test("session: 可浏览全部事件", () => {
  const s = new GameSession();
  assert.ok(s.allDefeatEvents().length >= 4);
  assert.ok(s.allPregnancyEvents().length >= 6);
});
