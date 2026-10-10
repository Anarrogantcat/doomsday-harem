import { test } from "node:test";
import assert from "node:assert/strict";

import {
  tierOfScene, canGenerate, shouldGenerate, tierStats, scenesByTier,
  tierGuidance, describeTier,
  TIER_LABEL, TIER_GENERATABLE, MODE_LABEL,
  type SceneTier, type GenerationMode
} from "@doomsday/core";
import { GenerationPipeline } from "../src/pipeline.ts";
import { createNarrator } from "../src/narrator.ts";
import { setFetch } from "../src/transport.ts";
import type { Scene } from "@doomsday/core";
import type { ScenePromptContext } from "../src/prompt.ts";

function scripted(id: string): Scene {
  return {
    id, title: "手写场景", participants: ["主角", "姐姐"], tone: "手写",
    beats: [{ id: "b1", poseKey: "p", lines: [{ layer: "action", text: "手写内容" }] }]
  };
}

function ctx(id: string): ScenePromptContext {
  return {
    sceneId: id, title: "测试", tone: "测试",
    participants: [{ name: "主角" }, { name: "姐姐" }]
  };
}

// ============ 分级 ============

test("tier: 关键剧情识别", () => {
  assert.equal(tierOfScene("sister_first"), "critical");
  assert.equal(tierOfScene("sister2_first"), "critical");
  assert.equal(tierOfScene("mother_first"), "critical");
  assert.equal(tierOfScene("ai_awaken"), "critical");
  assert.equal(tierOfScene("hero_pregnant_1"), "critical");
  assert.equal(tierOfScene("delivery_day30"), "critical");
});

test("tier: 重要剧情识别", () => {
  assert.equal(tierOfScene("story_teacher"), "major");
  assert.equal(tierOfScene("story_baker"), "major");
  assert.equal(tierOfScene("story_heiress"), "major");
});

test("tier: 日常场景识别", () => {
  assert.equal(tierOfScene("night_raid"), "minor");
  assert.equal(tierOfScene("daily_morning"), "minor");
  assert.equal(tierOfScene("repeat_kitchen"), "minor");
});

test("tier: 氛围场景为默认", () => {
  assert.equal(tierOfScene("random_encounter"), "ambient");
  assert.equal(tierOfScene("unknown"), "ambient");
});

test("tier: 关键剧情不可生成", () => {
  assert.equal(canGenerate("sister_first"), false);
  assert.equal(canGenerate("story_teacher"), true);
  assert.equal(canGenerate("night_raid"), true);
});

test("tier: 分级标签与可生成标记", () => {
  assert.equal(TIER_LABEL.critical, "关键剧情");
  assert.equal(TIER_GENERATABLE.critical, false);
  assert.equal(TIER_GENERATABLE.major, true);
  assert.equal(TIER_GENERATABLE.minor, true);
  assert.equal(TIER_GENERATABLE.ambient, true);
});

test("tier: 模式 off 全部不生成", () => {
  for (const id of ["story_teacher", "night_raid", "random"]) {
    assert.equal(shouldGenerate(id, "off"), false);
  }
});

test("tier: 模式 minor 只生成日常与氛围", () => {
  assert.equal(shouldGenerate("night_raid", "minor"), true);
  assert.equal(shouldGenerate("random", "minor"), true);
  assert.equal(shouldGenerate("story_teacher", "minor"), false, "重要剧情不在 minor 模式生成");
  assert.equal(shouldGenerate("sister_first", "minor"), false, "关键剧情永不生成");
});

test("tier: 模式 all 生成除关键外全部", () => {
  assert.equal(shouldGenerate("story_teacher", "all"), true);
  assert.equal(shouldGenerate("night_raid", "all"), true);
  assert.equal(shouldGenerate("random", "all"), true);
  assert.equal(shouldGenerate("sister_first", "all"), false, "关键剧情仍不生成");
});

test("tier: 关键剧情在任何模式下都手写", () => {
  for (const mode of ["off", "minor", "all"] as GenerationMode[]) {
    assert.equal(shouldGenerate("sister_first", mode), false, `模式 ${mode} 下关键剧情不应生成`);
  }
});

test("tier: 分级统计", () => {
  const ids = ["sister_first", "story_teacher", "night_raid", "random", "unknown2"];
  const s = tierStats(ids);
  assert.equal(s.critical, 1);
  assert.equal(s.major, 1);
  assert.equal(s.minor, 1);
  assert.equal(s.ambient, 2);
});

test("tier: 按分级过滤", () => {
  const ids = ["sister_first", "story_teacher", "night_raid", "random"];
  assert.deepEqual(scenesByTier(ids, "critical"), ["sister_first"]);
  assert.deepEqual(scenesByTier(ids, "major"), ["story_teacher"]);
});

test("tier: 分级约束文本", () => {
  assert.match(tierGuidance("critical"), /不允许生成/);
  assert.match(tierGuidance("major"), /严格贴合/);
  assert.match(tierGuidance("minor"), /可自由发挥/);
  assert.match(tierGuidance("ambient"), /氛围/);
});

test("tier: 描述文本", () => {
  assert.match(describeTier("sister_first"), /关键剧情.*手写锁定/);
  assert.match(describeTier("story_teacher"), /重要剧情.*可生成/);
});

test("tier: 模式标签完整", () => {
  for (const m of ["off", "minor", "all"] as GenerationMode[]) {
    assert.ok(MODE_LABEL[m], `缺少 ${m} 标签`);
  }
});

// ============ 管线 ============

test("pipeline: 关键剧情走手写", async () => {
  const p = new GenerationPipeline({ mode: "all", narrator: null });
  const r = await p.getScene("sister_first", scripted("sister_first"), ctx("sister_first"));
  assert.equal(r.source, "scripted");
  assert.equal(r.tier, "critical");
  assert.equal(r.skippedReason, "critical");
  assert.equal(r.scene.beats[0].lines[0].text, "手写内容");
});

test("pipeline: 关闭模式走手写", async () => {
  const p = new GenerationPipeline({ mode: "off", narrator: null });
  const r = await p.getScene("night_raid", scripted("night_raid"), ctx("night_raid"));
  assert.equal(r.source, "scripted");
  assert.equal(r.skippedReason, "mode-off");
});

test("pipeline: 无叙事器走手写", async () => {
  const p = new GenerationPipeline({ mode: "all", narrator: null });
  const r = await p.getScene("night_raid", scripted("night_raid"), ctx("night_raid"));
  assert.equal(r.source, "scripted");
  assert.equal(r.skippedReason, "no-narrator");
});

test("pipeline: 模型可用时生成", async () => {
  setFetch(async () => ({
    ok: true, status: 200,
    text: async () => JSON.stringify({
      model: "m", done: true,
      message: { content: "姐姐「别动。」\n她跨坐上来。\n温热的紧致吞上来。" }
    }),
    body: () => null
  }));

  const narrator = createNarrator({ kind: "ollama", baseUrl: "http://127.0.0.1:11434", model: "m" });
  const p = new GenerationPipeline({ mode: "all", narrator });
  const r = await p.getScene("night_raid", scripted("night_raid"), ctx("night_raid"));

  assert.equal(r.source, "model");
  assert.equal(r.tier, "minor");
  assert.ok(r.scene.beats.length > 0);
  assert.notEqual(r.scene.beats[0].lines[0].text, "手写内容");
});

test("pipeline: 生成结果进入缓存", async () => {
  let calls = 0;
  setFetch(async () => {
    calls++;
    return {
      ok: true, status: 200,
      text: async () => JSON.stringify({
        model: "m", done: true, message: { content: "生成内容" }
      }),
      body: () => null
    };
  });

  const narrator = createNarrator({ kind: "ollama", baseUrl: "http://127.0.0.1:11434", model: "m" });
  const p = new GenerationPipeline({ mode: "all", narrator });

  const a = await p.getScene("daily_x", scripted("daily_x"), ctx("daily_x"));
  const b = await p.getScene("daily_x", scripted("daily_x"), ctx("daily_x"));

  assert.equal(a.source, "model");
  assert.equal(b.source, "cache");
  assert.equal(calls, 1, "第二次应命中缓存");
  assert.equal(p.cacheSize(), 1);
});

test("pipeline: 清缓存后重新生成", async () => {
  let calls = 0;
  setFetch(async () => {
    calls++;
    return {
      ok: true, status: 200,
      text: async () => JSON.stringify({ model: "m", done: true, message: { content: "x" } }),
      body: () => null
    };
  });
  const narrator = createNarrator({ kind: "ollama", baseUrl: "http://127.0.0.1:11434", model: "m" });
  const p = new GenerationPipeline({ mode: "all", narrator });

  await p.getScene("daily_y", scripted("daily_y"), ctx("daily_y"));
  // 需同时清 pipeline 与 narrator 两层缓存
  p.clearCache();
  narrator.getCache().clear();
  await p.getScene("daily_y", scripted("daily_y"), ctx("daily_y"));
  assert.equal(calls, 2);
});

test("pipeline: 生成失败回退手写", async () => {
  setFetch(async () => { throw new Error("ECONNREFUSED"); });
  const narrator = createNarrator(
    { kind: "ollama", baseUrl: "http://127.0.0.1:11434", model: "m" },
    { retries: 0 }
  );
  const p = new GenerationPipeline({ mode: "all", narrator });
  const r = await p.getScene("night_raid", scripted("night_raid"), ctx("night_raid"));

  assert.equal(r.source, "scripted");
  assert.equal(r.skippedReason, "generation-failed");
  assert.equal(r.scene.beats[0].lines[0].text, "手写内容");
  assert.ok(r.error);
});

test("pipeline: 关闭回退时抛错", async () => {
  setFetch(async () => { throw new Error("down"); });
  const narrator = createNarrator(
    { kind: "ollama", baseUrl: "http://127.0.0.1:11434", model: "m" },
    { retries: 0 }
  );
  const p = new GenerationPipeline({ mode: "all", narrator, fallbackToScript: false });
  await assert.rejects(() => p.getScene("night_raid", scripted("night_raid"), ctx("night_raid")));
});

test("pipeline: 分级约束注入提示词", async () => {
  let captured: string = "";
  setFetch(async (_url, init) => {
    captured = init?.body ?? "";
    return {
      ok: true, status: 200,
      text: async () => JSON.stringify({ model: "m", done: true, message: { content: "x" } }),
      body: () => null
    };
  });
  const narrator = createNarrator({ kind: "ollama", baseUrl: "http://127.0.0.1:11434", model: "m" });
  const p = new GenerationPipeline({ mode: "all", narrator });
  await p.getScene("night_raid", scripted("night_raid"), ctx("night_raid"));

  assert.match(captured, /可自由发挥/, "应注入 minor 分级约束");
});

test("pipeline: 模式切换", () => {
  const p = new GenerationPipeline({ mode: "off", narrator: null });
  assert.equal(p.mode, "off");
  p.setMode("all");
  assert.equal(p.mode, "all");
});

test("pipeline: 计划报告", () => {
  const p = new GenerationPipeline({ mode: "minor", narrator: null });
  const ids = ["sister_first", "story_teacher", "night_raid", "random"];
  const rep = p.planReport(ids);

  assert.equal(rep.total, 4);
  assert.equal(rep.byTier.critical, 1);
  // 无叙事器时全部手写
  assert.equal(rep.willGenerate.length, 0);
  assert.equal(rep.scriptedOnly.length, 4);
});

test("pipeline: 有叙事器时计划区分", () => {
  setFetch(async () => ({
    ok: true, status: 200,
    text: async () => JSON.stringify({ model: "m", done: true, message: { content: "x" } }),
    body: () => null
  }));
  const narrator = createNarrator({ kind: "ollama", baseUrl: "http://127.0.0.1:11434", model: "m" });
  const p = new GenerationPipeline({ mode: "minor", narrator });
  const ids = ["sister_first", "story_teacher", "night_raid", "random"];
  const rep = p.planReport(ids);

  assert.ok(rep.willGenerate.includes("night_raid"));
  assert.ok(rep.willGenerate.includes("random"));
  assert.ok(!rep.willGenerate.includes("sister_first"), "关键剧情不应生成");
  assert.ok(!rep.willGenerate.includes("story_teacher"), "minor 模式下重要剧情不生成");
});

test("pipeline: 流式生成", async () => {
  setFetch(async () => {
    const enc = new TextEncoder();
    const lines = [
      JSON.stringify({ message: { content: "姐姐「别动。」" }, done: false }),
      JSON.stringify({ message: { content: "" }, done: true })
    ];
    let i = 0;
    return {
      ok: true, status: 200,
      text: async () => "",
      body: () => new ReadableStream<Uint8Array>({
        pull(c) {
          if (i >= lines.length) { c.close(); return; }
          c.enqueue(enc.encode(lines[i++] + "\n"));
        }
      })
    };
  });
  const narrator = createNarrator({ kind: "ollama", baseUrl: "http://127.0.0.1:11434", model: "m" });
  const p = new GenerationPipeline({ mode: "all", narrator });

  const chunks: string[] = [];
  const r = await p.getSceneStream("daily_z", scripted("daily_z"), ctx("daily_z"), (d) => chunks.push(d));
  assert.equal(r.source, "model");
  assert.ok(chunks.length > 0);
});