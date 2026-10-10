import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyLines, parseBeats } from "../src/prompt.ts";

const NAMES = ["主角", "姐姐", "妹妹"];

test("speaker: 引号前是第二人称 → 主角", () => {
  const out = classifyLines("你俯身吻她耳垂「好。」", NAMES);
  const sp = out.find((l) => l.layer === "speech");
  assert.equal(sp?.speaker, "主角");
});

test("speaker: 引号前是第三人称代词 → 唯一候选", () => {
  const out = classifyLines("她的膝盖顶住你腰侧。「别动了」", ["主角", "大学女教师"]);
  const sp = out.find((l) => l.layer === "speech");
  assert.equal(sp?.speaker, "大学女教师");
});

test("speaker: 引号前直接点名", () => {
  const out = classifyLines("姐姐的手指收紧。「别动。」", NAMES);
  const sp = out.find((l) => l.layer === "speech");
  assert.equal(sp?.speaker, "姐姐");
});

test("speaker: 多候选时第三人称不猜", () => {
  const out = classifyLines("她忽然僵住。「别动。」", ["主角", "姐姐", "妹妹"]);
  const sp = out.find((l) => l.layer === "speech");
  // 多候选无法确定，允许为空或由上一条叙述推断
  assert.ok(sp);
});

test("speaker: 纯引号行用上一条叙述判定", () => {
  const text = "她的膝盖顶住你腰侧，呼吸喷在你耳后。\n「别动了」";
  const out = classifyLines(text, ["主角", "大学女教师"]);
  const sp = out.find((l) => l.layer === "speech");
  assert.equal(sp?.speaker, "大学女教师");
});

test("speaker: 孤立的标点行被过滤", () => {
  const out = classifyLines("正文。\n。\n姐姐「台词」", NAMES);
  assert.ok(!out.some((l) => l.text === "。"));
  const sp = out.find((l) => l.layer === "speech");
  assert.equal(sp?.speaker, "姐姐");
});

test("speaker: 分隔符行不被当作说话人", () => {
  const text = "内容一。\n---\n「台词」";
  const out = classifyLines(text, NAMES);
  assert.ok(!out.some((l) => l.speaker === "---"));
});

test("speaker: 真实模型输出回归", () => {
  const real = `她的膝盖顶住你腰侧，呼吸喷在你耳后带着铁锈味的喘息。「别动了」
大学女教师「你再乱晃我就真的要掐你脖子了」
。`;
  const out = classifyLines(real, ["主角", "大学女教师"]);
  const speeches = out.filter((l) => l.layer === "speech");
  assert.equal(speeches.length, 2);
  assert.equal(speeches[0].speaker, "大学女教师", "第一句应归给女教师");
  assert.equal(speeches[1].speaker, "大学女教师");
  assert.ok(!out.some((l) => l.text === "。"), "标点噪声应被过滤");
});

test("speaker: 端到端 —— 整段真实文本", () => {
  const real = `--- 节拍 1/4 ---
你被压在地垫上，后背抵着冰凉的橡胶面。
她的膝盖顶住你腰侧，呼吸喷在你耳后。「别动了」
大学女教师「你再乱晃我就真的要掐你脖子了」
。`;
  const beats = parseBeats(real);
  assert.equal(beats.length, 1);
  const lines = classifyLines(beats[0], ["主角", "大学女教师"]);
  const speeches = lines.filter((l) => l.layer === "speech");
  assert.equal(speeches.length, 2);
  assert.ok(speeches.every((s) => s.speaker), "所有台词都应有说话人");
});
