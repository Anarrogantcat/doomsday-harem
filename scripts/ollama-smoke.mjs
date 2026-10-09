#!/usr/bin/env node
/**
 * 真实模型集成测试 —— 需要本地 Ollama 正在运行。
 *
 *   node scripts/ollama-smoke.mjs
 *   node scripts/ollama-smoke.mjs --model qwen2.5:7b
 *   node scripts/ollama-smoke.mjs --url http://127.0.0.1:11434
 *
 * 不进入 CI：无模型时应跳过而非失败。
 */
import { createNarrator } from "../packages/llm/src/narrator.ts";
import { PROVIDER_PRESETS } from "../packages/llm/src/factory.ts";

const args = process.argv.slice(2);
function flag(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
}

const baseUrl = flag("url", PROVIDER_PRESETS.ollama.baseUrl);
const model = flag("model", PROVIDER_PRESETS.ollama.models[0]);

console.log(`探测 ${baseUrl} ...`);

const narrator = createNarrator({ kind: "ollama", baseUrl, model, timeoutMs: 180_000 });
const status = await narrator.status();

if (!status.available) {
  console.log(`✗ 模型不可用：${status.error}`);
  console.log("  跳过（这是可选测试，无模型时不算失败）");
  process.exit(0);
}

console.log(`✓ 可用（${status.latencyMs}ms）`);
console.log(`  已安装模型：${(status.models ?? []).join(", ") || "（无）"}`);

if (status.models && status.models.length > 0 && !status.models.includes(model)) {
  console.log(`⚠ 指定模型 "${model}" 不在列表中，改用 "${status.models[0]}"`);
}

const scripted = {
  id: "smoke",
  title: "冒烟测试",
  participants: ["主角", "姐姐"],
  tone: "测试",
  beats: [{ id: "b1", poseKey: "p", lines: [{ layer: "action", text: "（手写兜底内容）" }] }]
};

console.log("\n生成中（流式）...\n");
let chunks = 0;
const t0 = Date.now();

const result = await narrator.narrateStream(
  {
    sceneId: "smoke",
    title: "互相破处",
    tone: "压抑十年的释放",
    participants: [
      { name: "主角", title: "扶她御姐", physiology: "处女" },
      { name: "姐姐", title: "项目经理", relation: "好感 60 / 羁绊 Lv3 / 欲情 92" }
    ],
    props: ["双头龙"],
    direction: "姐姐主导",
    time: "第1天 22:00",
    location: "安全屋卧室"
  },
  (delta) => {
    process.stdout.write(delta);
    chunks++;
  },
  scripted
);

console.log("\n\n--- 结果 ---");
console.log(`来源：${result.source}`);
console.log(`耗时：${Date.now() - t0}ms`);
console.log(`流式块数：${chunks}`);
console.log(`节拍数：${result.scene.beats.length}`);
if (result.error) console.log(`错误：${result.error}`);

console.log("\n--- 结构化节拍 ---");
for (const [i, b] of result.scene.beats.entries()) {
  const layers = b.lines.map((l) => l.layer).join("/");
  console.log(`节拍 ${i + 1} [${layers}] ${b.lines.length} 行`);
}

// 缓存验证
console.log("\n--- 缓存验证 ---");
const again = await narrator.narrateStream(
  {
    sceneId: "smoke",
    title: "互相破处",
    tone: "压抑十年的释放",
    participants: [
      { name: "主角", title: "扶她御姐", physiology: "处女" },
      { name: "姐姐", title: "项目经理", relation: "好感 60 / 羁绊 Lv3 / 欲情 92" }
    ],
    props: ["双头龙"],
    direction: "姐姐主导",
    time: "第1天 22:00",
    location: "安全屋卧室"
  },
  () => {},
  scripted
);
console.log(`第二次来源：${again.source}${again.source === "cache" ? " ✓" : "（未命中缓存）"}`);

console.log("\n完成。");
