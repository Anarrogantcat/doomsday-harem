import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeOutput, parseBeats, classifyLines } from "../src/prompt.ts";

test("normalize: 修复说话人与台词被换行拆开", () => {
  const bad = "她掀开被子。\n姐姐\n「今晚别吵醒我」";
  const fixed = normalizeOutput(bad);
  assert.match(fixed, /姐姐「今晚别吵醒我」/);
  assert.doesNotMatch(fixed, /姐姐\n「/);
});

test("normalize: 收拢嵌套引号", () => {
  assert.equal(normalizeOutput("姐姐「「别动」」"), "姐姐「别动」");
  assert.equal(normalizeOutput("妹妹「『我不敢』」"), "妹妹「我不敢」");
});

test("normalize: 去掉说话人后的冒号", () => {
  assert.equal(normalizeOutput("姐姐：「别动。」"), "姐姐「别动。」");
});

test("normalize: 清理孤立引号", () => {
  assert.equal(normalizeOutput("她走过来。「」"), "她走过来。");
});

test("normalize: 去掉行首孤立问号", () => {
  assert.equal(normalizeOutput("?「台词」"), "「台词」");
});

test("normalize: 不破坏正常文本", () => {
  const good = "姐姐「别动。」\n她跨坐上来。\n温热的气息喷在颈侧。";
  assert.equal(normalizeOutput(good), good);
});

test("normalize: 保留多句台词", () => {
  const s = "姐姐「抓紧我。」\n妹妹「那个……姐姐？」\n主角「……好。」";
  assert.equal(normalizeOutput(s), s);
});

test("normalize: 幂等", () => {
  const bad = "姐姐\n「「别动」」";
  const once = normalizeOutput(bad);
  const twice = normalizeOutput(once);
  assert.equal(once, twice, "重复规范化不应再改变");
});

test("normalize: 端到端 —— 异常输出可被正确分类", () => {
  const bad = "门被推开。\n姐姐\n「「今晚别吵醒我」」\n她钻进被子里。";
  const beats = parseBeats(bad);
  assert.equal(beats.length, 1);

  const lines = classifyLines(beats[0]);
  const speech = lines.filter((l) => l.layer === "speech");
  assert.equal(speech.length, 1, "应识别出 1 句台词");
  assert.equal(speech[0].speaker, "姐姐", "说话人应正确");
  assert.equal(speech[0].text, "今晚别吵醒我");
  assert.ok(lines.some((l) => l.layer === "action"));
});

test("normalize: 处理真实模型输出样本", () => {
  // 来自 qwen3:14b 的实际输出
  const real = `被子边缘被掀开时带起一阵凉意，你感受到她的脊背正抵住床头柜。
睡裙下摆滑落在膝弯处，发尾扫过你的手腕，像一只试探的猫科动物。
姐姐
?「「今晚...别吵醒我」」`;
  const fixed = normalizeOutput(real);
  const lines = classifyLines(fixed);
  const speech = lines.filter((l) => l.layer === "speech");
  assert.equal(speech.length, 1);
  assert.equal(speech[0].speaker, "姐姐");
  assert.equal(speech[0].text, "今晚...别吵醒我");
});

test("normalize: 多个断裂说话人", () => {
  const bad = "动作一。\n姐姐\n「第一句」\n动作二。\n妹妹\n「第二句」";
  const fixed = normalizeOutput(bad);
  const lines = classifyLines(fixed);
  const speech = lines.filter((l) => l.layer === "speech");
  assert.equal(speech.length, 2);
  assert.equal(speech[0].speaker, "姐姐");
  assert.equal(speech[1].speaker, "妹妹");
});
