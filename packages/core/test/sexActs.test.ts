import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ACTS, actDef, actsByPart, actsByDirection, actsByTier, actStats,
  newProficiency, recordAct, partLevel, partExpForLevel, proficiencyBonus,
  canPerform, availableActs, proficiencySummary,
  PART_LABEL, DIRECTION_LABEL, ACT_TIER_LABEL,
  proficiencyToJSON, proficiencyFromJSON,
  type ActPart
} from "../src/systems/sexActs.ts";

// ============ 行为目录 ============

test("acts: 行为数量充足", () => {
  assert.ok(ACTS.length >= 25, `应有 25+ 种行为，实际 ${ACTS.length}`);
});

test("acts: id 唯一", () => {
  const ids = new Set(ACTS.map((a) => a.id));
  assert.equal(ids.size, ACTS.length);
});

test("acts: 字段合法", () => {
  for (const a of ACTS) {
    assert.ok(a.name.length > 0, `${a.id} 缺名称`);
    assert.ok(a.description.length > 10, `${a.id} 缺描写要点`);
    assert.ok(a.staminaCost > 0, `${a.id} 体力消耗应为正`);
    assert.ok(a.lustGain > 0, `${a.id} 欲情收益应为正`);
    assert.ok(a.intimacyExp > 0);
    assert.ok(a.requiresProficiency >= 0);
    assert.ok(["basic", "advanced", "expert"].includes(a.tier));
  }
});

test("acts: 覆盖口交", () => {
  const oral = actsByPart("mouth");
  assert.ok(oral.length >= 3, "口部行为应至少 3 种");
  assert.ok(oral.some((a) => a.direction === "give"));
  assert.ok(oral.some((a) => a.direction === "receive"));
  assert.ok(oral.some((a) => a.direction === "mutual"));
});

test("acts: 覆盖后庭", () => {
  const anal = actsByPart("anus");
  assert.ok(anal.length >= 4, "后庭行为应至少 4 种");
  assert.ok(anal.some((a) => a.direction === "give"));
  assert.ok(anal.some((a) => a.direction === "receive"));
  assert.ok(anal.some((a) => a.id === "anal_prep"), "应有准备工作");
});

test("acts: 覆盖前庭", () => {
  const vag = actsByPart("vagina");
  assert.ok(vag.length >= 4, "前庭行为应至少 4 种");
});

test("acts: 覆盖手/胸/腿/足/道具", () => {
  for (const p of ["hand", "breast", "thigh", "foot", "toy"] as ActPart[]) {
    assert.ok(actsByPart(p).length >= 1, `缺少 ${p} 行为`);
  }
});

test("acts: 三种分级都有", () => {
  assert.ok(actsByTier("basic").length >= 8);
  assert.ok(actsByTier("advanced").length >= 8);
  assert.ok(actsByTier("expert").length >= 3);
});

test("acts: 三种方向都有", () => {
  for (const d of ["give", "receive", "mutual"] as const) {
    assert.ok(actsByDirection(d).length >= 2, `缺少方向 ${d}`);
  }
});

test("acts: 高难行为有前置熟练度", () => {
  for (const a of ACTS.filter((x) => x.tier === "expert")) {
    assert.ok(a.requiresProficiency >= 4, `${a.id} 作为高阶行为应有较高前置`);
  }
});

test("acts: 需要道具的行为标注正确", () => {
  const toyActs = actsByPart("toy");
  assert.ok(toyActs.every((a) => a.needsToy), "道具类行为都应标注 needsToy");
});

test("acts: 标签完整", () => {
  for (const a of ACTS) {
    assert.ok(PART_LABEL[a.part], `缺少部位标签 ${a.part}`);
    assert.ok(DIRECTION_LABEL[a.direction], `缺少方向标签 ${a.direction}`);
    assert.ok(ACT_TIER_LABEL[a.tier], `缺少分级标签 ${a.tier}`);
  }
});

test("acts: 统计", () => {
  const s = actStats();
  assert.equal(s.total, ACTS.length);
  assert.equal(s.basic + s.advanced + s.expert, s.total);
  assert.ok(Object.keys(s.byPart).length >= 8);
});

// ============ 熟练度 ============

test("prof: 初始为空", () => {
  const p = newProficiency();
  assert.deepEqual(p.counts, {});
  assert.equal(partLevel(p, "mouth"), 0);
});

test("prof: 记录行为累计次数", () => {
  const p = newProficiency();
  const r = recordAct(p, "oral_give");
  assert.equal(r.proficiency.counts["oral_give"], 1);
  const r2 = recordAct(r.proficiency, "oral_give");
  assert.equal(r2.proficiency.counts["oral_give"], 2);
});

test("prof: 熟练度升级", () => {
  let p = newProficiency();
  const need = partExpForLevel(0);
  // 反复记录直到升级
  let leveled = false;
  for (let i = 0; i < 20 && !leveled; i++) {
    const r = recordAct(p, "oral_give");
    p = r.proficiency;
    if (r.leveledParts.length > 0) leveled = true;
  }
  assert.ok(leveled, "重复行为应提升熟练度");
  assert.ok(partLevel(p, "mouth") >= 1);
});

test("prof: 熟练度上限 10", () => {
  let p = newProficiency();
  for (let i = 0; i < 5000; i++) {
    p = recordAct(p, "oral_give").proficiency;
  }
  assert.equal(partLevel(p, "mouth"), 10);
});

test("prof: 未知行为被忽略", () => {
  const p = newProficiency();
  const r = recordAct(p, "nonexistent");
  assert.deepEqual(r.proficiency.counts, {});
});

test("prof: 熟练度加成", () => {
  let p = newProficiency();
  assert.equal(proficiencyBonus(p, "mouth"), 0);
  for (let i = 0; i < 100; i++) p = recordAct(p, "oral_give").proficiency;
  assert.ok(proficiencyBonus(p, "mouth") > 0);
  assert.ok(proficiencyBonus(p, "mouth") <= 1);
});

test("prof: 不同部位独立", () => {
  let p = newProficiency();
  for (let i = 0; i < 20; i++) p = recordAct(p, "oral_give").proficiency;
  assert.ok(partLevel(p, "mouth") > 0);
  assert.equal(partLevel(p, "anus"), 0, "未涉及的部位应保持 0");
});

test("prof: 总览", () => {
  let p = newProficiency();
  for (let i = 0; i < 10; i++) p = recordAct(p, "anal_give").proficiency;
  const sum = proficiencySummary(p);
  assert.ok(sum.length >= 8);
  const anal = sum.find((x) => x.part === "anus")!;
  assert.ok(anal.acts >= 10);
  assert.ok(anal.level > 0);
});

// ============ 可用性判定 ============

test("canPerform: 基础行为可用", () => {
  const r = canPerform(actDef("oral_give")!, {
    heroFutanari: true, partnerFutanari: false,
    hasToy: false, proficiency: newProficiency(), stamina: 100
  });
  assert.equal(r.ok, true);
});

test("canPerform: 体力不足被拒", () => {
  const r = canPerform(actDef("anal_give")!, {
    heroFutanari: true, partnerFutanari: false,
    hasToy: false, proficiency: newProficiency(), stamina: 1
  });
  assert.equal(r.ok, false);
  assert.match(r.reason ?? "", /体力不足/);
});

test("canPerform: 熟练度不足被拒", () => {
  const r = canPerform(actDef("anal_give")!, {
    heroFutanari: true, partnerFutanari: false,
    hasToy: false, proficiency: newProficiency(), stamina: 100
  });
  assert.equal(r.ok, false);
  assert.match(r.reason ?? "", /熟练度不足/);
});

test("canPerform: 缺道具被拒", () => {
  const r = canPerform(actDef("toy_use_partner")!, {
    heroFutanari: true, partnerFutanari: false,
    hasToy: false, proficiency: newProficiency(), stamina: 100
  });
  assert.equal(r.ok, false);
  assert.match(r.reason ?? "", /需要道具/);
});

test("canPerform: 缺器官被拒", () => {
  const r = canPerform(actDef("anal_give")!, {
    heroFutanari: false, partnerFutanari: false,
    hasToy: false, proficiency: newProficiency(), stamina: 100
  });
  assert.equal(r.ok, false);
  assert.match(r.reason ?? "", /没有对应器官/);
});

test("canPerform: 熟练度足够时解锁", () => {
  let p = newProficiency();
  for (let i = 0; i < 200; i++) p = recordAct(p, "anal_prep").proficiency;
  const r = canPerform(actDef("anal_give")!, {
    heroFutanari: true, partnerFutanari: false,
    hasToy: false, proficiency: p, stamina: 100
  });
  assert.equal(r.ok, true, `熟练度 ${partLevel(p, "anus")} 应已足够`);
});

test("availableActs: 返回全部行为", () => {
  const list = availableActs(newProficiency(), {
    heroFutanari: true, partnerFutanari: false, hasToy: true, stamina: 100
  });
  assert.equal(list.length, ACTS.length);
  assert.ok(list.some((x) => x.usable));
  assert.ok(list.some((x) => !x.usable));
});

// ============ 序列化 ============

test("prof: 序列化往返", () => {
  let p = newProficiency();
  for (let i = 0; i < 30; i++) p = recordAct(p, "oral_give").proficiency;
  p = recordAct(p, "anal_give").proficiency;

  const json = proficiencyToJSON(p);
  const back = proficiencyFromJSON(json);
  assert.deepEqual(back.counts, p.counts);
  assert.deepEqual(back.parts, p.parts);
});

test("prof: 空数据返回默认", () => {
  const p = proficiencyFromJSON(null);
  assert.deepEqual(p.counts, {});
});

test("prof: 序列化不共享引用", () => {
  const p = newProficiency();
  const json = proficiencyToJSON(p);
  json.counts["x"] = 99;
  assert.equal(p.counts["x"], undefined);
});
