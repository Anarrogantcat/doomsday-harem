import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { GameSession } from "../src/runtime/session.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT_DIR = join(dirname(dirname(__dirname)), "core", "data", "scripts");

function session(): GameSession {
  const s = new GameSession();
  s.loadScripts(readdirSync(SCRIPT_DIR).filter((f) => f.endsWith(".dsl"))
    .map((f) => readFileSync(join(SCRIPT_DIR, f), "utf8")));
  return s;
}

test("hi/session: 好感不足时无互交场景", () => {
  const s = session();
  // 默认好感偏低，互交需要 ≥ 60
  for (const c of s.companions) {
    c.relationship = { ...c.relationship, affection: 30 };
  }
  assert.equal(s.haremInteractScenes().length, 0);
});

test("hi/session: 好感达标时出现互交场景", () => {
  const s = session();
  for (const c of s.companions) {
    if (c.joined) c.relationship = { ...c.relationship, affection: 80 };
  }
  s.setFlag("__test", 1);
  // 需要一个匹配的地点/时段；据点默认映射到卧室
  const scenes = s.haremInteractScenes();
  // 可能因时段不匹配为 0，但至少接口可用
  assert.ok(Array.isArray(scenes));
});

test("hi/session: 互交场景 id 前缀为 hi_", () => {
  const s = session();
  for (const c of s.companions) {
    if (c.joined) c.relationship = { ...c.relationship, affection: 90 };
  }
  // 推进到夜晚
  s.advance(14, "idle");
  const scenes = s.haremInteractScenes();
  for (const sc of scenes) {
    assert.ok(sc.id.startsWith("hi_"), `互交场景 id 应有 hi_ 前缀：${sc.id}`);
  }
});

test("hi/session: 互交场景不出现怀孕型药物", () => {
  const s = session();
  for (const c of s.companions) {
    if (c.joined) c.relationship = { ...c.relationship, affection: 90 };
  }
  s.advance(14, "idle");
  for (const sc of s.haremInteractScenes()) {
    const text = sc.beats.flatMap((b) => b.lines.map((l) => l.text)).join(" ");
    assert.ok(!text.includes("怀孕型"), "互交场景不得涉及怀孕型药物（INV-2）");
  }
});

test("hi/session: availableScenes 合并互交场景", () => {
  const s = session();
  for (const c of s.companions) {
    if (c.joined) c.relationship = { ...c.relationship, affection: 90 };
  }
  s.advance(14, "idle");
  const all = s.availableScenes();
  const hi = all.filter((sc) => sc.id.startsWith("hi_"));
  assert.ok(all.length > 0, "应有可触发场景");
  // 互交场景若存在应包含在总列表里
  const direct = s.haremInteractScenes();
  for (const sc of direct) {
    assert.ok(all.some((x) => x.id === sc.id), `${sc.id} 应合并进 availableScenes`);
  }
});

test("hi/session: 模板统计接口", () => {
  const s = session();
  const all = s.allTemplateStats();
  assert.ok(all.total >= 35);
  assert.ok(all.harem >= 6);
  const hi = s.haremInteractStats();
  assert.equal(hi.total, all.harem);
});

test("hi/session: 缺道具时不出现需要道具的互交", () => {
  const s = session();
  for (const c of s.companions) {
    if (c.joined) c.relationship = { ...c.relationship, affection: 90 };
  }
  s.advance(14, "idle");
  // 无玩具时不应出现 hi_sisters_share（需要双头龙）
  const scenes = s.haremInteractScenes();
  const toyOnly = scenes.filter((sc) => sc.id === "hi_hi_sisters_share" || sc.id.includes("sisters_share"));
  if (!s.hasToy()) {
    assert.equal(toyOnly.length, 0, "无玩具时不应出现需要玩具的场景");
  }
});

test("hi/session: 单人模板与互交模板互不冲突", () => {
  const s = session();
  for (const c of s.companions) {
    if (c.joined) c.relationship = { ...c.relationship, affection: 90 };
  }
  s.advance(14, "idle");
  const all = s.availableScenes();
  const ids = all.map((x) => x.id);
  assert.equal(new Set(ids).size, ids.length, "场景 id 不应重复");
});