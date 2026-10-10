import { test } from "node:test";
import assert from "node:assert/strict";
import { parseBeats, isBeatMarker, classifyLines } from "../src/prompt.ts";

test("beats: 标准分隔符", () => {
  const t = "第一节。\n---\n第二节。\n---\n第三节。";
  assert.equal(parseBeats(t).length, 3);
});

test("beats: 兼容「--- 节拍 1/5 ---」写法", () => {
  const t = `--- 节拍 1/5 ---
内容一。
--- 节拍 2/5 ---
内容二。`;
  const beats = parseBeats(t);
  assert.equal(beats.length, 2, "应切出 2 个节拍");
  assert.equal(beats[0], "内容一。");
  assert.equal(beats[1], "内容二。");
});

test("beats: 兼容「节拍 1/5」独立标题行", () => {
  const t = `节拍 1/5
内容一。
---
节拍 2/5
内容二。`;
  const beats = parseBeats(t);
  assert.equal(beats.length, 2);
  assert.equal(beats[0], "内容一。");
});

test("beats: 兼容星号与等号分隔", () => {
  assert.equal(parseBeats("一。\n***\n二。").length, 2);
  assert.equal(parseBeats("一。\n===\n二。").length, 2);
});

test("beats: 节拍标记不进入正文", () => {
  const t = "--- 节拍 1/5 ---\n内容。";
  const beats = parseBeats(t);
  assert.equal(beats.length, 1);
  assert.doesNotMatch(beats[0], /节拍/, "标记不应残留在正文");
  assert.equal(beats[0], "内容。");
});

test("beats: isBeatMarker 判定", () => {
  assert.equal(isBeatMarker("---"), true);
  assert.equal(isBeatMarker("--- 节拍 1/5 ---"), true);
  assert.equal(isBeatMarker("***"), true);
  assert.equal(isBeatMarker("内容"), false);
  assert.equal(isBeatMarker("--- 这是正文 ---"), false);
});

test("beats: 端到端 —— 真实模型输出可正确分层", () => {
  const real = `--- 节拍 1/5 ---
你迷迷糊糊地翻了个身。
母亲
?「「唔……你还在这儿啊」」`;
  const beats = parseBeats(real);
  assert.equal(beats.length, 1);

  const lines = classifyLines(beats[0]);
  const speech = lines.filter((l) => l.layer === "speech");
  assert.equal(speech.length, 1);
  assert.equal(speech[0].speaker, "母亲");
  assert.equal(speech[0].text, "唔……你还在这儿啊");
  assert.ok(lines.some((l) => l.layer === "action"));
  // 不应有节拍标记残留
  assert.ok(!lines.some((l) => l.text.includes("节拍")));
});

test("beats: 多节拍真实输出", () => {
  const real = `--- 节拍 1/5 ---
动作一。
母亲「第一句」

--- 节拍 2/5 ---
动作二。
母亲「第二句」`;
  const beats = parseBeats(real);
  assert.equal(beats.length, 2);
  const s1 = classifyLines(beats[0]).filter((l) => l.layer === "speech");
  const s2 = classifyLines(beats[1]).filter((l) => l.layer === "speech");
  assert.equal(s1[0].text, "第一句");
  assert.equal(s2[0].text, "第二句");
});
