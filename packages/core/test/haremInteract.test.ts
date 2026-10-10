import { test } from "node:test";
import assert from "node:assert/strict";

import {
  HAREM_INTERACT_TEMPLATES, haremInteractTemplate, haremInteractStats,
  haremInteractToScene, allTemplateStats, H_TEMPLATES, templateStats,
  type HaremInteractTemplate
} from "../src/systems/hTemplates.ts";

test("hi: 互交模板数量", () => {
  assert.ok(HAREM_INTERACT_TEMPLATES.length >= 6, `应至少 6 个，实际 ${HAREM_INTERACT_TEMPLATES.length}`);
});

test("hi: id 唯一且不与单人模板冲突", () => {
  const ids = new Set(HAREM_INTERACT_TEMPLATES.map((t) => t.id));
  assert.equal(ids.size, HAREM_INTERACT_TEMPLATES.length);
  const solo = new Set(H_TEMPLATES.map((t) => t.id));
  for (const id of ids) {
    assert.ok(!solo.has(id), `id 冲突：${id}`);
  }
});

test("hi: 字段合法", () => {
  for (const t of HAREM_INTERACT_TEMPLATES) {
    assert.ok(t.name.length > 0);
    assert.ok(t.tone.length > 0);
    assert.ok(t.guidance.length > 0);
    assert.ok(t.requirement.length > 0);
    assert.ok(t.locations.length > 0);
    assert.ok(t.times.length > 0);
    assert.ok(t.beats.length >= 4, `${t.id} 至少 4 个节拍`);
    assert.ok(t.minParticipants >= 2, `${t.id} 互交场景至少 2 人`);
    assert.ok(t.maxParticipants >= t.minParticipants);
    for (const b of t.beats) {
      assert.ok(b.pose && b.action && b.mood);
    }
  }
});

test("hi: 互交类型覆盖", () => {
  const kinds = new Set(HAREM_INTERACT_TEMPLATES.map((t) => t.interactKind));
  for (const k of ["pair", "trio", "observe", "teach", "rival"]) {
    assert.ok(kinds.has(k as never), `缺少互交类型：${k}`);
  }
});

test("hi: 只允许娱乐型扶她药（INV-2）", () => {
  for (const t of HAREM_INTERACT_TEMPLATES) {
    const hasPregMed = t.props.some((p) => p.includes("怀孕型"));
    assert.ok(!hasPregMed, `${t.id} 不得使用怀孕型扶她药（INV-2）`);
  }
});

test("hi: 按 id 查询", () => {
  assert.ok(haremInteractTemplate("hi_sisters_share"));
  assert.ok(haremInteractTemplate("hi_observe"));
  assert.equal(haremInteractTemplate("nonexistent"), undefined);
});

test("hi: 统计", () => {
  const s = haremInteractStats();
  assert.equal(s.total, HAREM_INTERACT_TEMPLATES.length);
  assert.ok(s.totalBeats >= 28);
  assert.ok(Object.keys(s.byKind).length >= 5);
});

test("hi: 转场景", () => {
  const t = haremInteractTemplate("hi_sisters_share")!;
  const sc = haremInteractToScene(t, ["姐姐", "妹妹"], "卧室");
  assert.equal(sc.participants.length, 2);
  assert.match(sc.title, /卧室/);
  assert.equal(sc.beats.length, t.beats.length);
  assert.ok(sc.beats.every((b) => b.lines.length >= 2));
  // 节拍含姿势键
  assert.ok(sc.beats.every((b) => b.poseKey.length > 0));
});

test("hi: 转场景含台词占位", () => {
  const t = haremInteractTemplate("hi_teach")!;
  const sc = haremInteractToScene(t, ["母亲", "妹妹", "姐姐"], "卧室");
  const hasSpeech = sc.beats.some((b) => b.lines.some((l) => l.layer === "speech"));
  assert.ok(hasSpeech, "互交场景应含台词占位");
});

test("hi: 统一统计", () => {
  const a = allTemplateStats();
  const s = templateStats();
  const h = haremInteractStats();
  assert.equal(a.solo, s.total);
  assert.equal(a.harem, h.total);
  assert.equal(a.total, s.total + h.total);
  assert.equal(a.totalBeats, s.totalBeats + h.totalBeats);
  assert.ok(a.total >= 35, `模板总数应达 35+，实际 ${a.total}`);
});

test("hi: 内容量估算", () => {
  const a = allTemplateStats();
  const est = a.totalBeats * 300;
  assert.ok(est > 45000, `模板骨架可支撑 4.5 万字以上，实际估算 ${est}`);
});

test("hi: 覆盖多个地点", () => {
  const locs = new Set<string>();
  for (const t of HAREM_INTERACT_TEMPLATES) for (const l of t.locations) locs.add(l);
  assert.ok(locs.size >= 4, `互交应覆盖 4+ 地点，实际 ${locs.size}`);
});

test("hi: 含多人（3 人以上）模板", () => {
  const multi = HAREM_INTERACT_TEMPLATES.filter((t) => t.maxParticipants >= 3);
  assert.ok(multi.length >= 3, "应有 3 人以上的互交模板");
});
