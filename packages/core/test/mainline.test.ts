import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { GameSession } from "../src/runtime/session.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DSL_DIR = join(dirname(dirname(__dirname)), "core", "data", "scripts");

function session(): GameSession {
  const s = new GameSession();
  s.loadScripts(readdirSync(DSL_DIR).filter((f) => f.endsWith(".dsl"))
    .map((f) => readFileSync(join(DSL_DIR, f), "utf8")));
  return s;
}

// ============ 生成的主线场景可被发现 ============

test("mainline: 每条主线都有多个场景", () => {
  const s = session();
  const overview = s.mainlineOverview();
  assert.ok(overview.length >= 17, `应有 17+ 条主线，实际 ${overview.length}`);

  for (const o of overview) {
    assert.ok(o.scenes >= 2, `${o.companionName} 只有 ${o.scenes} 个场景`);
  }
});

test("mainline: 场景按阶段排序", () => {
  const s = session();
  const scenes = s.mainlineScenesFor("teacher");
  assert.ok(scenes.length >= 3);
  for (let i = 1; i < scenes.length; i++) {
    assert.ok(scenes[i].stage >= scenes[i - 1].stage, "阶段应递增");
  }
});

test("mainline: 阶段从 0 开始", () => {
  const s = session();
  assert.equal(s.mainlineStage("teacher"), 0);
});

test("mainline: 推进任务会设置阶段变量", () => {
  const s = session();
  // 直接设置标志模拟推进
  s.setFlag("mainline_teacher_stage", 2);
  assert.equal(s.mainlineStage("teacher"), 2);
});

test("mainline: 阶段推进后场景可触发", () => {
  const s = session();
  // 生成场景从第 2 步起（第 1 步是手写场景）
  const generated = s.mainlineScenesFor("teacher");
  assert.ok(generated.length >= 3, "teacher 应有 3+ 个生成场景");
  assert.ok(generated.every((x) => x.stage >= 2), "生成场景应从第 2 步起");

  s.setFlag("mainline_teacher_stage", 3);
  const vars = s.vars();
  assert.equal(vars["mainline_teacher_stage"], 3);

  const sc2 = s.scene("q_teacher_s2");
  const sc3 = s.scene("q_teacher_s3");
  assert.ok(sc2, "阶段 3 时第 2 步场景应可触发");
  assert.ok(sc3, "阶段 3 时第 3 步场景应可触发");
});

test("mainline: 阶段不足时场景不可触发", () => {
  const s = session();
  // 未推进时第 5 步场景不应可触发
  const sc5 = s.scene("q_teacher_s5");
  assert.equal(sc5, null, "阶段 0 时第 5 步场景不应触发");
});

test("mainline: 概述含进度信息", () => {
  const s = session();
  s.setFlag("mainline_teacher_stage", 2);
  const o = s.mainlineOverview().find((x) => x.companionId === "teacher")!;
  assert.equal(o.stage, 2);
  assert.ok(o.totalSteps >= 4);
  assert.ok(o.companionName.length > 0);
  assert.ok(o.title.length > 0);
});

test("mainline: 全部生成场景都能解析", () => {
  // 用全新会话只载入生成的主线场景，验证其自身可解析
  const s = new GameSession();
  const files = readdirSync(DSL_DIR).filter((f) => f.startsWith("q_") && f.endsWith(".dsl"));
  assert.ok(files.length >= 40, `应有 40+ 个生成场景，实际 ${files.length}`);

  const n = s.loadScripts(files.map((f) => readFileSync(join(DSL_DIR, f), "utf8")));
  assert.equal(n, files.length, "全部生成场景都应载入");
});

test("mainline: 场景参与者与主线角色一致", () => {
  const s = session();
  for (const o of s.mainlineOverview().slice(0, 5)) {
    const scenes = s.mainlineScenesFor(o.companionId);
    assert.ok(scenes.length > 0, `${o.companionName} 无场景`);
    const sc = s.scene(scenes[0].id);
    if (sc) {
      assert.ok(
        sc.participants.some((p) => p === o.companionName || p === "主角"),
        `${scenes[0].id} 参与者异常`
      );
    }
  }
});

test("mainline: 每个场景都有四层节拍", () => {
  const s = session();
  const files = readdirSync(DSL_DIR).filter((f) => f.startsWith("q_") && f.endsWith(".dsl"));
  s.loadScripts(files.map((f) => readFileSync(join(DSL_DIR, f), "utf8")));

  for (const sc of s.registry.all()) {
    if (!sc.id.startsWith("q_")) continue;
    for (const b of sc.beats) {
      const layers = new Set(b.lines.map((l) => l.layer));
      assert.ok(layers.has("action"), `${sc.id}/${b.id} 缺 action`);
      assert.ok(layers.has("sense"), `${sc.id}/${b.id} 缺 sense`);
      assert.ok(layers.has("mind"), `${sc.id}/${b.id} 缺 mind`);
      assert.ok(layers.has("speech"), `${sc.id}/${b.id} 缺 speech`);
    }
  }
});
