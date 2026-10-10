import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyLines, parseBeats } from "../src/prompt.ts";

const NAMES = ["主角", "姐姐", "修女", "大学女教师"];

test("quote: 多引号行拆成多条台词", () => {
  const line = "大学女教师「今天去了哪里？」「你看看现在几点了！」";
  const out = classifyLines(line, NAMES);
  const speeches = out.filter((l) => l.layer === "speech");
  assert.equal(speeches.length, 2, "应拆成 2 条");
  assert.equal(speeches[0].speaker, "大学女教师");
  assert.equal(speeches[1].speaker, "大学女教师");
  assert.equal(speeches[0].text, "今天去了哪里？");
  assert.equal(speeches[1].text, "你看看现在几点了！");
});

test("quote: 多余闭合引号被丢弃", () => {
  const line = "「但祂从未教过我们该如何抚摸彼此」」";
  const out = classifyLines(line, NAMES);
  const speeches = out.filter((l) => l.layer === "speech");
  assert.equal(speeches.length, 1, "只应有 1 条台词");
  assert.equal(speeches[0].text, "但祂从未教过我们该如何抚摸彼此");
  // 不应出现只有引号的残片
  assert.ok(!out.some((l) => /^[「『」』\s]*$/.test(l.text)));
});

test("quote: 孤立引号行被丢弃", () => {
  const line = "……\n」\n她低下头。";
  const out = classifyLines(line, NAMES);
  assert.ok(!out.some((l) => l.text === "」"), "孤立引号不应成为内容");
  assert.ok(out.some((l) => l.text.includes("她低下头")));
});

test("quote: 裸引号沿用上一位说话人", () => {
  const text = "修女「主说你们要生养众多」\n「但祂从未教过我们如何收尾」";
  const out = classifyLines(text, NAMES);
  const speeches = out.filter((l) => l.layer === "speech");
  assert.equal(speeches.length, 2);
  assert.equal(speeches[0].speaker, "修女");
  assert.equal(speeches[1].speaker, "修女", "第二句应沿用修女而非主角");
});

test("quote: 嵌套引号不破坏解析", () => {
  const line = "修女「主说『你们要生养众多』」";
  const out = classifyLines(line, NAMES);
  const speeches = out.filter((l) => l.layer === "speech");
  assert.ok(speeches.length >= 1);
  assert.equal(speeches[0].speaker, "修女");
});

test("quote: 端到端 —— 真实模型输出的修女案例", () => {
  const real = [
    "你把外套轻轻搭在椅背上。",
    "修女「主说『你们要生养众多」",
    "……「但祂从未教过我们该如何抚摸彼此」」",
    "你低头看见她睫毛在皮肤投下的阴影。"
  ].join("\n");

  const out = classifyLines(real, ["主角", "修女"]);
  const speeches = out.filter((l) => l.layer === "speech");

  // 所有台词都应有说话人
  for (const sp of speeches) {
    assert.ok(sp.speaker, `台词缺少说话人：${sp.text}`);
  }
  // 不应有纯引号残片
  assert.ok(!out.some((l) => /^[「『」』\s]*$/.test(l.text)));
});

test("quote: 真实模型输出的教师案例", () => {
  const real = [
    "大学女教师",
    "大学女教师「今天去了哪里？」「你看看现在几点了！」",
    "你后腰抵着门板。",
    "主角「我、我不是……」",
    "大学女教师「别动。」"
  ].join("\n");

  const out = classifyLines(real, ["主角", "大学女教师"]);
  const speeches = out.filter((l) => l.layer === "speech");
  assert.equal(speeches.length, 4, `应有 4 条台词，实际 ${speeches.length}`);
  for (const sp of speeches) {
    assert.ok(sp.speaker, "每条都应有说话人");
  }
});

test("quote: 空段不产生内容", () => {
  const out = classifyLines("「」", NAMES);
  assert.ok(!out.some((l) => l.layer === "speech" && !l.text.trim()));
});
