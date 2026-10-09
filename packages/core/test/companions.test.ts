import { test } from "node:test";
import assert from "node:assert/strict";

import {
  COMPANIONS, companionDef, companionsByOrigin, companionsByPersonality, companionsByQuest,
  startingCompanions, companionStats, traitsOf, lustGrowthFor,
  shouldInvite, shouldRaid, approachLine, raidLine,
  specialtyBonus, bestJobFor, describeCompanion,
  PERSONALITY_LABEL, PERSONALITY_TRAITS,
  type Personality, type CompanionDef
} from "../src/systems/companions.ts";
import { QUESTS } from "../src/systems/quest.ts";
import { ALL_JOBS } from "../src/systems/jobs.ts";

// ============ 目录 ============

test("companions: 共 21 位基础后宫", () => {
  assert.equal(COMPANIONS.length, 21, `应为 21 位，实际 ${COMPANIONS.length}`);
});

test("companions: id 唯一", () => {
  const ids = new Set(COMPANIONS.map((x) => x.id));
  assert.equal(ids.size, COMPANIONS.length);
});

test("companions: 字段合法", () => {
  for (const c of COMPANIONS) {
    assert.ok(c.name.length > 0, `${c.id} 缺名称`);
    assert.ok(c.title.length > 0, `${c.id} 缺头衔`);
    assert.ok(c.build.length > 0, `${c.id} 缺体型描述`);
    assert.ok(PERSONALITY_LABEL[c.personality], `${c.id} 性格未知`);
    assert.ok(c.initial.affection >= 0 && c.initial.affection <= 100, `${c.id} 初始好感越界`);
    assert.ok(c.initial.loyalty >= 0 && c.initial.loyalty <= 100, `${c.id} 初始忠诚越界`);
    assert.ok(c.initial.bond >= 1 && c.initial.bond <= 5, `${c.id} 羁绊越界`);
    assert.ok(c.initialLust >= 0 && c.initialLust <= 100, `${c.id} 初始欲情越界`);
    assert.ok(c.specialties.length > 0, `${c.id} 缺岗位专长`);
  }
});

test("companions: 来源分布符合设计", () => {
  const s = companionStats();
  assert.equal(s.byOrigin.family, 3, "家庭 3 人：母亲/姐姐/妹妹");
  assert.equal(s.byOrigin.mainline, 15, "主线 15 人");
  assert.equal(s.byOrigin.side, 2, "附带 2 人：女学生/女儿");
  assert.equal(s.byOrigin.ai, 1, "特殊 AI 1 人");
  assert.equal(s.total, 21);
});

test("companions: 开局 4 人在队", () => {
  const start = startingCompanions();
  assert.equal(start.length, 4);
  const ids = start.map((c) => c.id).sort();
  assert.deepEqual(ids, ["ai", "mother", "sister", "sister2"]);
});

test("companions: 岗位专长使用合法岗位", () => {
  for (const c of COMPANIONS) {
    for (const s of c.specialties) {
      assert.ok(ALL_JOBS.includes(s.job), `${c.id} 的岗位 ${s.job} 不合法`);
      assert.ok(s.bonus > 0 && s.bonus <= 1, `${c.id} 的加成 ${s.bonus} 越界`);
    }
  }
});

test("companions: 主线角色关联有效主线", () => {
  for (const c of COMPANIONS) {
    if (c.origin !== "mainline" && c.origin !== "side") continue;
    assert.ok(c.questId, `${c.id} 应关联主线`);
    assert.ok(QUESTS.some((q) => q.id === c.questId), `${c.id} 的主线 ${c.questId} 不存在`);
  }
});

test("companions: 15 条主线都有对应角色", () => {
  const mainlineQuests = QUESTS.filter((q) => q.companionId && q.id.startsWith("q_"));
  for (const q of mainlineQuests) {
    const c = companionDef(q.companionId);
    assert.ok(c, `主线 ${q.id} 的角色 ${q.companionId} 缺少数据`);
  }
});

test("companions: 附带后宫关联正确主线", () => {
  const student = companionDef("student")!;
  assert.equal(student.questId, "q_teacher");
  const daughter = companionDef("daughter")!;
  assert.equal(daughter.questId, "q_singlemom");
  assert.equal(student.age, 18);
  assert.equal(daughter.age, 19);
});

test("companions: 按来源与性格查询", () => {
  assert.equal(companionsByOrigin("family").length, 3);
  assert.ok(companionsByPersonality("warm").length >= 3);
  assert.ok(companionsByPersonality("shy").length >= 3);
  assert.equal(companionsByQuest("q_teacher").length, 2, "教师线含教师 + 女学生");
});

// ============ 性格 ============

test("companions: 九种性格都有定义", () => {
  for (const p of Object.keys(PERSONALITY_LABEL) as Personality[]) {
    assert.ok(PERSONALITY_TRAITS[p], `缺少 ${p} 的性格参数`);
  }
});

test("companions: 性格参数合法", () => {
  for (const p of Object.keys(PERSONALITY_TRAITS) as Personality[]) {
    const t = PERSONALITY_TRAITS[p];
    assert.ok(t.lustGrowth > 0, `${p} 欲情增长倍率应为正`);
    assert.ok(t.inviteThreshold > 0 && t.inviteThreshold <= 100);
    assert.ok(t.raidThreshold >= t.inviteThreshold, `${p} 夜袭阈值应不低于邀约阈值`);
    assert.ok(t.tone.length > 0, `${p} 缺语气描述`);
    assert.ok(t.approach.length > 0, `${p} 缺开场白`);
    assert.ok(t.raidLine.length > 0, `${p} 缺夜袭台词`);
  }
});

test("companions: 主动性格阈值更低", () => {
  assert.ok(PERSONALITY_TRAITS.bold.inviteThreshold < PERSONALITY_TRAITS.shy.inviteThreshold);
  assert.ok(PERSONALITY_TRAITS.bold.raidThreshold < PERSONALITY_TRAITS.shy.raidThreshold);
});

test("companions: 主动性格欲情增长更快", () => {
  assert.ok(PERSONALITY_TRAITS.bold.lustGrowth > PERSONALITY_TRAITS.shy.lustGrowth);
});

test("companions: 性格查询", () => {
  assert.equal(companionDef("sister")!.personality, "bold");
  assert.equal(companionDef("sister2")!.personality, "shy");
  assert.equal(companionDef("mother")!.personality, "warm");
  assert.equal(companionDef("heiress")!.personality, "proud");
  assert.equal(companionDef("ai")!.personality, "ai");
});

test("companions: 欲情增长按性格调整", () => {
  const bold = lustGrowthFor("sister", 5);
  const shy = lustGrowthFor("sister2", 5);
  assert.ok(bold > shy, `主动 ${bold} 应高于害羞 ${shy}`);
  assert.equal(lustGrowthFor("nonexistent", 5), 5, "未知角色按基准");
});

test("companions: 邀约与夜袭判定", () => {
  // 姐姐：bold，邀约阈值 75，夜袭 85
  assert.equal(shouldInvite("sister", 80, 6), true);
  assert.equal(shouldInvite("sister", 70, 6), false, "未达阈值");
  assert.equal(shouldInvite("sister", 80, 3), false, "冷落天数不足");

  assert.equal(shouldRaid("sister", 90, 11), true);
  assert.equal(shouldRaid("sister", 90, 5), false);

  // 妹妹：shy，阈值更高
  assert.equal(shouldInvite("sister2", 80, 6), false, "害羞角色 80 未达 85");
  assert.equal(shouldInvite("sister2", 90, 6), true);
});

test("companions: 台词按性格", () => {
  assert.match(approachLine("sister"), /跟我回房间/);
  assert.match(approachLine("mother"), /帮你放松/);
  assert.match(approachLine("heiress"), /算过了/);
  assert.match(raidLine("sister"), /别装睡/);
  assert.equal(approachLine("nonexistent"), "……");
});

// ============ 岗位 ============

test("companions: 岗位加成查询", () => {
  assert.equal(specialtyBonus("pharmacist", "lab"), 0.35);
  assert.equal(specialtyBonus("surgeon", "medical"), 0.40);
  assert.equal(specialtyBonus("baker", "kitchen"), 0.25);
  assert.equal(specialtyBonus("pharmacist", "kitchen"), 0, "无该岗位专长");
});

test("companions: 最佳岗位", () => {
  assert.equal(bestJobFor("pharmacist"), "lab");
  assert.equal(bestJobFor("surgeon"), "medical");
  assert.equal(bestJobFor("baker"), "kitchen");
  assert.equal(bestJobFor("mechanic"), "craft");
  assert.equal(bestJobFor("teacher"), "training");
});

test("companions: 全部 11 个岗位都有人专长", () => {
  const covered = new Set<string>();
  for (const c of COMPANIONS) {
    for (const s of c.specialties) covered.add(s.job);
  }
  for (const job of ALL_JOBS) {
    assert.ok(covered.has(job), `岗位 ${job} 无人专长`);
  }
});

test("companions: 每人至少一个专长岗位", () => {
  for (const c of COMPANIONS) {
    assert.ok(bestJobFor(c.id) !== null, `${c.id} 无专长岗位`);
  }
});

// ============ 描述 ============

test("companions: 描述文本包含关键信息", () => {
  const txt = describeCompanion("heiress");
  assert.match(txt, /富二代御姐/);
  assert.match(txt, /家族企业继承人/);
  assert.match(txt, /29 岁/);
  assert.match(txt, /176cm/);
  assert.match(txt, /高傲/);
  assert.match(txt, /logistics/);
});

test("companions: 未知角色描述", () => {
  assert.equal(describeCompanion("nonexistent"), "（未知角色）");
});

test("companions: 备注信息完整", () => {
  assert.match(companionDef("sister")!.note ?? "", /破处/);
  assert.match(companionDef("mother")!.note ?? "", /双头龙/);
  assert.match(companionDef("ai")!.note ?? "", /编写目的/);
  assert.match(companionDef("heiress")!.note ?? "", /高端物资/);
});

// ============ 设计一致性 ============

test("companions: 身高符合设定", () => {
  assert.equal(companionDef("mother")!.heightCm, 172);
  assert.equal(companionDef("sister")!.heightCm, 174);
  assert.equal(companionDef("sister2")!.heightCm, 162);
  assert.equal(companionDef("heiress")!.heightCm, 176, "富二代最高");
});

test("companions: 年龄符合设定", () => {
  assert.equal(companionDef("mother")!.age, 45);
  assert.equal(companionDef("sister")!.age, 26);
  assert.equal(companionDef("sister2")!.age, 19);
  assert.equal(companionDef("student")!.age, 18);
  assert.equal(companionDef("daughter")!.age, 19);
});

test("companions: 初始欲情符合设定", () => {
  assert.equal(companionDef("sister")!.initialLust, 92, "姐姐欲情 92（夜袭阈值）");
  assert.equal(companionDef("sister2")!.initialLust, 85);
  assert.equal(companionDef("ai")!.initialLust, 30);
});

test("companions: AI 初始好感 85", () => {
  assert.equal(companionDef("ai")!.initial.affection, 85);
  assert.equal(companionDef("ai")!.initial.bond, 4);
});

test("companions: 全部 21 位都有默认着装预设", () => {
  const valid = ["hero", "mother", "sister", "sister2", "ai", "nude"];
  for (const c of COMPANIONS) {
    assert.ok(valid.includes(c.wardrobePreset), `${c.id} 着装预设非法：${c.wardrobePreset}`);
  }
});
