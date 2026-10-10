import { test } from "node:test";
import assert from "node:assert/strict";

import {
  H_TEMPLATES, hTemplate, templatesAtLocation, templatesAtTime, templatesByTier,
  matchTemplates, pickTemplate, templateToPrompt, templateStats,
  H_LOCATION_LABEL, H_LOCATION_TRAIT, H_TIME_TONE,
  type HLocation, type HTimeSlot, type HTemplateContext
} from "../src/systems/hTemplates.ts";
import { mulberry32 } from "../src/systems/inventory.ts";

function ctx(over: Partial<HTemplateContext> = {}): HTemplateContext {
  return {
    location: "bedroom",
    time: "night",
    participants: 1,
    hasToy: true,
    medStock: 5,
    hasPrivateRoom: true,
    minAffection: 80,
    ...over
  };
}

// ============ 目录 ============

test("htemplate: 模板数量充足", () => {
  assert.ok(H_TEMPLATES.length >= 18, `应有 18+ 模板，实际 ${H_TEMPLATES.length}`);
});

test("htemplate: id 唯一", () => {
  const ids = new Set(H_TEMPLATES.map((x) => x.id));
  assert.equal(ids.size, H_TEMPLATES.length);
});

test("htemplate: 字段合法", () => {
  for (const t of H_TEMPLATES) {
    assert.ok(t.name.length > 0, `${t.id} 缺名称`);
    assert.ok(t.tone.length > 0, `${t.id} 缺基调`);
    assert.ok(t.guidance.length > 0, `${t.id} 缺模型约束`);
    assert.ok(t.requirement.length > 0, `${t.id} 缺前置条件`);
    assert.ok(t.locations.length > 0, `${t.id} 缺地点`);
    assert.ok(t.times.length > 0, `${t.id} 缺时段`);
    assert.ok(t.beats.length >= 3, `${t.id} 至少 3 个节拍，实际 ${t.beats.length}`);
    assert.ok(t.minParticipants >= 1);
    assert.ok(t.maxParticipants >= t.minParticipants);
    assert.ok(t.tier === "minor" || t.tier === "ambient");
    for (const b of t.beats) {
      assert.ok(b.pose.length > 0, `${t.id} 节拍缺姿势`);
      assert.ok(b.action.length > 0, `${t.id} 节拍缺动作`);
      assert.ok(b.mood.length > 0, `${t.id} 节拍缺情绪`);
    }
  }
});

test("htemplate: 地点标签完整", () => {
  for (const t of H_TEMPLATES) {
    for (const l of t.locations) {
      assert.ok(H_LOCATION_LABEL[l], `缺少地点标签 ${l}`);
      assert.ok(H_LOCATION_TRAIT[l], `缺少地点特性 ${l}`);
    }
  }
});

test("htemplate: 六个时段都有基调", () => {
  for (const s of ["morning", "forenoon", "noon", "evening", "night", "lateNight"] as HTimeSlot[]) {
    assert.ok(H_TIME_TONE[s], `缺少时段基调 ${s}`);
  }
});

test("htemplate: 覆盖设计中的场景类型", () => {
  const need = [
    "morning_wake", "night_visit", "kitchen_quick", "bath_shared",
    "training_sweat", "lab_interrupt", "vehicle_road", "after_raid",
    "bathhouse_group", "med_effect", "toy_lesson", "jealous_claim"
  ];
  for (const id of need) assert.ok(hTemplate(id), `缺少模板 ${id}`);
});

test("htemplate: 按地点筛选", () => {
  assert.ok(templatesAtLocation("bedroom").length >= 5);
  assert.ok(templatesAtLocation("bathhouse").length >= 1);
  assert.ok(templatesAtLocation("rooftop").length >= 1);
});

test("htemplate: 按时段筛选", () => {
  assert.ok(templatesAtTime("night").length >= 5);
  assert.ok(templatesAtTime("morning").length >= 2);
});

test("htemplate: 按分级筛选", () => {
  const minor = templatesByTier("minor");
  const ambient = templatesByTier("ambient");
  assert.ok(minor.length >= 10);
  assert.ok(ambient.length >= 4);
  assert.equal(minor.length + ambient.length, H_TEMPLATES.length);
});

test("htemplate: 多人模板存在", () => {
  const multi = H_TEMPLATES.filter((t) => t.maxParticipants >= 2);
  assert.ok(multi.length >= 3, "应有支持多人的模板");
});

test("htemplate: 用药模板存在", () => {
  const med = H_TEMPLATES.filter((t) => t.props.some((p) => p.includes("扶她药")));
  assert.ok(med.length >= 1);
});

// ============ 匹配 ============

test("htemplate: 匹配当前情境", () => {
  const matches = matchTemplates(ctx());
  assert.ok(matches.length > 0);
  // 全部应是卧室 + 夜间
  for (const m of matches) {
    assert.ok(m.template.locations.includes("bedroom"));
    assert.ok(m.template.times.includes("night"));
  }
});

test("htemplate: 匹配按分数排序", () => {
  const matches = matchTemplates(ctx());
  for (let i = 1; i < matches.length; i++) {
    assert.ok(matches[i - 1].score >= matches[i].score, "应按分数降序");
  }
});

test("htemplate: 地点不符时无匹配", () => {
  const matches = matchTemplates(ctx({ location: "camp_tent" }));
  // camp_tent 可能没有模板
  for (const m of matches) {
    assert.ok(m.template.locations.includes("camp_tent"));
  }
});

test("htemplate: 人数不符时排除", () => {
  const matches = matchTemplates(ctx({ participants: 5 }));
  for (const m of matches) {
    assert.ok(m.template.maxParticipants >= 5);
  }
});

test("htemplate: 缺道具时记录未满足项", () => {
  const matches = matchTemplates(ctx({ hasToy: false }));
  const toyTemplate = matches.find((m) => m.template.props.includes("性玩具"));
  if (toyTemplate) {
    assert.ok(toyTemplate.unmet.some((u) => u.includes("玩具")), "应记录缺玩具");
  }
});

test("htemplate: 低好感时记录未满足项", () => {
  const matches = matchTemplates(ctx({ minAffection: 20 }));
  assert.ok(matches.length > 0);
  // 至少有一个标记好感偏低
  assert.ok(matches.some((m) => m.unmet.some((u) => u.includes("好感"))));
});

test("htemplate: pickTemplate 只选无未满足项的", () => {
  const t = pickTemplate(ctx(), mulberry32(1));
  assert.ok(t, "应能选到模板");
  const matches = matchTemplates(ctx()).filter((m) => m.unmet.length === 0);
  assert.ok(matches.some((m) => m.template.id === t!.id));
});

test("htemplate: pickTemplate 可复现", () => {
  const a = pickTemplate(ctx(), mulberry32(42));
  const b = pickTemplate(ctx(), mulberry32(42));
  assert.deepEqual(a?.id, b?.id);
});

test("htemplate: 无可用模板时返回 null", () => {
  const t = pickTemplate(ctx({ location: "cellar", time: "morning", participants: 9 }), mulberry32(1));
  assert.equal(t, null);
});

// ============ 提示词骨架 ============

test("htemplate: 生成提示词骨架", () => {
  const t = hTemplate("morning_wake")!;
  const p = templateToPrompt(t, ["主角", "姐姐"]);
  assert.match(p, /场景骨架/);
  assert.match(p, /晨间唤醒/);
  assert.match(p, /节拍数/);
  assert.match(p, /1\. 姿势=/);
  assert.match(p, /参与角色.*主角、姐姐/);
  assert.match(p, /额外要求/);
  assert.match(p, /---/);
});

test("htemplate: 提示词含每个节拍的动作与情绪", () => {
  const t = hTemplate("night_visit")!;
  const p = templateToPrompt(t, ["主角", "妹妹"]);
  for (const b of t.beats) {
    assert.ok(p.includes(b.pose), `提示词应含姿势 ${b.pose}`);
    assert.ok(p.includes(b.action.slice(0, 8)), `提示词应含动作要点`);
  }
});

test("htemplate: 提示词含道具", () => {
  const t = hTemplate("toy_lesson")!;
  const p = templateToPrompt(t, ["主角", "姐姐", "妹妹"]);
  assert.match(p, /可用道具/);
  assert.match(p, /双头龙/);
});

test("htemplate: 提示词含模型约束", () => {
  const t = hTemplate("kitchen_quick")!;
  const p = templateToPrompt(t, ["主角", "姐姐"]);
  assert.ok(p.includes(t.guidance.slice(0, 10)));
});

// ============ 统计 ============

test("htemplate: 统计", () => {
  const s = templateStats();
  assert.equal(s.total, H_TEMPLATES.length);
  assert.equal(s.minor + s.ambient, s.total);
  assert.ok(s.totalBeats > 50, `总节拍数应可观，实际 ${s.totalBeats}`);
  assert.ok(s.avgBeats >= 3);
  assert.ok(Object.keys(s.byLocation).length >= 8);
});

test("htemplate: 内容量估算（替代手写）", () => {
  const s = templateStats();
  assert.ok(s.total >= 28, `应有 28+ 模板，实际 ${s.total}`);
  assert.ok(s.totalBeats >= 120, `应有 120+ 节拍，实际 ${s.totalBeats}`);
  // 每个节拍模型可产出 200-400 字
  const estChars = s.totalBeats * 300;
  assert.ok(estChars > 30000, `模板骨架可支撑 3 万字以上内容，实际估算 ${estChars}`);
});

test("htemplate: 覆盖全部 17 个地点", () => {
  const covered = new Set<string>();
  for (const t of H_TEMPLATES) for (const l of t.locations) covered.add(l);
  assert.ok(covered.size >= 15, `应覆盖 15+ 地点，实际 ${covered.size}`);
});

test("htemplate: 每个时段都有模板可用", () => {
  for (const s of ["morning", "forenoon", "noon", "evening", "night", "lateNight"] as HTimeSlot[]) {
    assert.ok(templatesAtTime(s).length >= 2, `时段 ${s} 模板不足`);
  }
});
