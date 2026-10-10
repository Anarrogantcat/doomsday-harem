import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ACT_SCENES, actScene, actSceneStats, actSceneToScene, actSceneToPrompt,
  ENEMA_STEPS, enemaTotalGain, enemaRequiredItems, pickVariant,
  VARIANT_LABEL,
  type SceneVariant
} from "../src/systems/actScenes.ts";
import { ACTS } from "../src/systems/sexActs.ts";

// ============ 场景库 ============

test("actscene: 场景数量与行为对应", () => {
  assert.ok(ACT_SCENES.length >= 20, `应有 20+ 场景，实际 ${ACT_SCENES.length}`);
  // 每个场景的 actId 都应是有效行为
  for (const s of ACT_SCENES) {
    assert.ok(ACTS.some((a) => a.id === s.actId), `${s.actId} 不是有效行为`);
  }
});

test("actscene: actId 唯一", () => {
  const ids = new Set(ACT_SCENES.map((s) => s.actId));
  assert.equal(ids.size, ACT_SCENES.length);
});

test("actscene: 字段完整", () => {
  for (const s of ACT_SCENES) {
    assert.ok(s.titleTemplate.includes("{partner}"), `${s.actId} 标题应含占位符`);
    assert.ok(s.tone.length > 0, `${s.actId} 缺基调`);
    assert.ok(s.guidance.length > 10, `${s.actId} 缺模型约束`);
    assert.ok(s.beats.length >= 5, `${s.actId} 至少 5 个节拍`);
    for (const b of s.beats) {
      assert.ok(b.pose.length > 0, `${s.actId} 节拍缺姿势`);
      assert.ok(b.action.length > 0, `${s.actId} 节拍缺动作`);
      assert.ok(b.sense.length > 0, `${s.actId} 节拍缺感官`);
      assert.ok(b.mind.length > 0, `${s.actId} 节拍缺心理`);
    }
  }
});

test("actscene: 覆盖口交", () => {
  assert.ok(actScene("oral_give"));
  assert.ok(actScene("oral_receive"));
  assert.ok(actScene("oral_mutual"));
  assert.ok(actScene("deep_throat"));
});

test("actscene: 覆盖后庭", () => {
  assert.ok(actScene("anal_prep"));
  assert.ok(actScene("anal_give"));
  assert.ok(actScene("anal_receive"));
  assert.ok(actScene("anal_play"));
  assert.ok(actScene("anal_double"));
});

test("actscene: 覆盖道具", () => {
  assert.ok(actScene("toy_use_partner"));
  assert.ok(actScene("toy_use_self"));
  assert.ok(actScene("double_dildo"));
  assert.ok(actScene("strap_on_give"));
  assert.ok(actScene("restraint_play"));
});

test("actscene: 后庭行为标注需要准备", () => {
  const analActs = ACT_SCENES.filter((s) =>
    ["anal_give", "anal_receive", "anal_double"].includes(s.actId)
  );
  for (const s of analActs) {
    assert.equal(s.requiresPrep, true, `${s.actId} 应标注需要准备`);
  }
});

test("actscene: 准备类行为不需要再次准备", () => {
  const prep = actScene("anal_prep")!;
  assert.notEqual(prep.requiresPrep, true, "准备流程本身不应要求先准备");
});

test("actscene: 统计", () => {
  const s = actSceneStats();
  assert.equal(s.total, ACT_SCENES.length);
  assert.ok(s.totalBeats >= 100);
  assert.ok(s.avgBeats >= 5);
  assert.ok(s.withPrep >= 3);
  assert.ok(s.propUsing >= 8);
});

// ============ 灌肠流程 ============

test("enema: 步骤完整", () => {
  assert.ok(ENEMA_STEPS.length >= 6, `应有 6+ 步骤，实际 ${ENEMA_STEPS.length}`);
  for (const s of ENEMA_STEPS) {
    assert.ok(s.name.length > 0);
    assert.ok(s.description.length > 0);
    assert.ok(s.narrative.length > 10, `${s.id} 缺叙事要点`);
    assert.ok(s.proficiencyGain > 0);
  }
});

test("enema: 步骤顺序合理", () => {
  const ids = ENEMA_STEPS.map((s) => s.id);
  assert.equal(ids[0], "warm_water", "应先准备温水");
  assert.equal(ids[ids.length - 1], "relax", "最后应放松润滑");
});

test("enema: 总熟练度收益", () => {
  const total = enemaTotalGain();
  assert.ok(total >= 15, `总收益应可观，实际 ${total}`);
  assert.equal(total, ENEMA_STEPS.reduce((s, x) => s + x.proficiencyGain, 0));
});

test("enema: 必需道具", () => {
  const items = enemaRequiredItems();
  assert.ok(items.includes("enema_kit"), "需要灌肠器具");
  assert.ok(items.includes("lube"), "需要润滑剂");
});

test("enema: 道具类步骤标注", () => {
  const withItem = ENEMA_STEPS.filter((s) => s.requiresItem);
  assert.ok(withItem.length >= 5, "大部分步骤应有道具要求");
});

// ============ 场景转换 ============

test("actscene: 转引擎场景", () => {
  const spec = actScene("oral_give")!;
  const scene = actSceneToScene(spec, "主角", "姐姐");
  assert.equal(scene.participants.length, 2);
  assert.match(scene.title, /姐姐/);
  assert.equal(scene.beats.length, spec.beats.length);
  assert.ok(scene.beats.every((b) => b.lines.length >= 3));
});

test("actscene: 四层描写齐备", () => {
  const spec = actScene("anal_give")!;
  const scene = actSceneToScene(spec, "主角", "妹妹");
  const layers = new Set(scene.beats.flatMap((b) => b.lines.map((l) => l.layer)));
  assert.ok(layers.has("action"));
  assert.ok(layers.has("sense"));
  assert.ok(layers.has("mind"));
  assert.ok(layers.has("speech"));
});

test("actscene: 占位符被替换", () => {
  const spec = actScene("vaginal_doggy")!;
  const scene = actSceneToScene(spec, "主角", "母亲");
  const text = scene.beats.flatMap((b) => b.lines.map((l) => l.text)).join(" ");
  assert.doesNotMatch(text, /\{partner\}/, "占位符应被替换");
  assert.match(text, /母亲/);
});

test("actscene: 台词说话人正确归属", () => {
  const spec = actScene("oral_give")!;
  const scene = actSceneToScene(spec, "主角", "姐姐");
  const speeches = scene.beats.flatMap((b) => b.lines.filter((l) => l.layer === "speech"));
  for (const sp of speeches) {
    assert.ok(sp.speaker, "台词应有说话人");
    assert.ok(["主角", "姐姐"].includes(sp.speaker!), `说话人异常：${sp.speaker}`);
  }
});

test("actscene: 差分标注", () => {
  const spec = actScene("oral_give")!;
  const first = actSceneToScene(spec, "主角", "姐姐", "first");
  assert.match(first.title, /初次/);

  const skilled = actSceneToScene(spec, "主角", "姐姐", "skilled");
  assert.match(skilled.title, /熟练/);

  const normal = actSceneToScene(spec, "主角", "姐姐", "familiar");
  assert.doesNotMatch(normal.title, /（/, "熟悉差分不加标注");
});

test("actscene: 差分选择逻辑", () => {
  assert.equal(pickVariant({ partnerActs: 0, partnerProficiency: 0, pregnant: false, observers: 0 }), "first");
  assert.equal(pickVariant({ partnerActs: 5, partnerProficiency: 2, pregnant: false, observers: 0 }), "familiar");
  assert.equal(pickVariant({ partnerActs: 20, partnerProficiency: 7, pregnant: false, observers: 0 }), "skilled");
  assert.equal(pickVariant({ partnerActs: 5, partnerProficiency: 2, pregnant: true, observers: 0 }), "pregnant");
  assert.equal(pickVariant({ partnerActs: 5, partnerProficiency: 2, pregnant: false, observers: 1 }), "observer");
});

test("actscene: 旁观者优先于其他差分", () => {
  const v = pickVariant({ partnerActs: 0, partnerProficiency: 0, pregnant: true, observers: 2 });
  assert.equal(v, "observer");
});

test("actscene: 全部差分有标签", () => {
  for (const v of ["first", "familiar", "skilled", "pregnant", "observer"] as SceneVariant[]) {
    assert.ok(VARIANT_LABEL[v], `缺少差分标签 ${v}`);
  }
});

// ============ 提示词生成 ============

test("actscene: 提示词骨架", () => {
  const spec = actScene("anal_give")!;
  const p = actSceneToPrompt(spec, "姐姐", "familiar");
  assert.match(p, /场景/);
  assert.match(p, /基调/);
  assert.match(p, /差分/);
  assert.match(p, /节拍/);
  assert.match(p, /姿势=/);
  assert.match(p, /动作：/);
  assert.match(p, /感官：/);
  assert.match(p, /心理：/);
  assert.match(p, /额外要求/);
  assert.match(p, /姐姐/);
});

test("actscene: 提示词含道具", () => {
  const spec = actScene("anal_give")!;
  const p = actSceneToPrompt(spec, "妹妹", "first");
  assert.match(p, /道具/);
});

test("actscene: 提示词含节拍序号", () => {
  const spec = actScene("oral_give")!;
  const p = actSceneToPrompt(spec, "姐姐", "skilled");
  assert.match(p, /1\. 姿势=/);
  assert.match(p, /2\. 姿势=/);
});

test("actscene: 全部场景都能生成提示词", () => {
  for (const s of ACT_SCENES) {
    const p = actSceneToPrompt(s, "测试", "familiar");
    assert.ok(p.length > 100, `${s.actId} 提示词过短`);
    assert.doesNotMatch(p, /\{partner\}/);
  }
});

test("actscene: 内容量估算", () => {
  const s = actSceneStats();
  // 每节拍模型可产出 150-300 字
  const est = s.totalBeats * 200;
  assert.ok(est > 25000, `场景库可支撑 2.5 万字以上，实际估算 ${est}`);
});
