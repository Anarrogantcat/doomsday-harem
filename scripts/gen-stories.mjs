#!/usr/bin/env node
/**
 * 主线剧情批量生成。
 *
 * 现状：每条主线只有 1 个手写场景，但设计需要 3-5 步。
 * 本脚本用本地模型为每条主线的**后续步骤**生成场景，产出 DSL。
 *
 * 用法：
 *   node scripts/gen-stories.mjs                    # 全部主线
 *   node scripts/gen-stories.mjs --quest q_teacher  # 指定主线
 *   node scripts/gen-stories.mjs --limit 5          # 只跑 5 条
 *   node scripts/gen-stories.mjs --dry              # 只看计划
 *   node scripts/gen-stories.mjs --model qwen3:14b
 *
 * 产物：packages/core/data/scripts/story_<id>_s<N>.dsl
 * 已存在的文件跳过（断点续跑）。
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const imp = (rel) => import(pathToFileURL(join(root, rel)).href);

const args = process.argv.slice(2);
const flag = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : d;
};
const has = (n) => args.includes(`--${n}`);

const MODEL = flag("model", "qwen3:14b");
const BASE_URL = flag("url", "http://127.0.0.1:11434");
const LIMIT = Number(flag("limit", "0")) || Infinity;
const ONLY = flag("quest", null);
const DRY = has("dry");
const TIMEOUT = Number(flag("timeout", "240000"));

const SCRIPT_DIR = join(root, "packages", "core", "data", "scripts");

// ---------- 载入数据 ----------
const { QUESTS } = await imp("packages/core/src/systems/quest.ts");
const { createNarrator } = await imp("packages/llm/src/narrator.ts");

// ---------- 构建计划 ----------
// 第 1 步已有手写场景，为第 2 步及以后生成
const plan = [];
for (const q of QUESTS) {
  if (ONLY && q.id !== ONLY) continue;
  for (const s of q.steps) {
    if (s.stage <= 1) continue; // 第 1 步已手写
    const outFile = join(SCRIPT_DIR, `${q.id}_s${s.stage}.dsl`);
    if (existsSync(outFile)) continue;
    plan.push({ quest: q, step: s, outFile });
  }
}

console.log(`计划生成 ${plan.length} 个场景（${new Set(plan.map(p => p.quest.id)).size} 条主线）`);
if (DRY) {
  for (const p of plan.slice(0, 30)) {
    console.log(`  ${p.quest.id}_s${p.step.stage}  ${p.quest.companionName}  ${p.step.name}`);
  }
  if (plan.length > 30) console.log(`  …共 ${plan.length} 个`);
  process.exit(0);
}
if (plan.length === 0) { console.log("无需生成"); process.exit(0); }

// ---------- 探测模型 ----------
const narrator = createNarrator({ kind: "ollama", baseUrl: BASE_URL, model: MODEL, timeoutMs: TIMEOUT });
const status = await narrator.status();
if (!status.available) {
  console.error(`✗ 模型不可用：${status.error}`);
  process.exit(1);
}
console.log(`✓ 模型可用（${status.latencyMs}ms）\n`);

// ---------- 生成提示词 ----------
function buildPrompt(quest, step, prevStep) {
  return `你正在为一款末日生存文字游戏撰写主线剧情。

【主线】${quest.title}
【概要】${quest.summary}
【角色】${quest.companionName}（${quest.companionTitle}）
【本步骤】第 ${step.stage} 步 · ${step.name}
【步骤描述】${step.description}
${step.region ? `【发生地点】${step.region}` : ""}
${step.combat ? `【包含战斗】危险度 ${step.combat.danger}/5` : ""}
${prevStep ? `【上一步】${prevStep.name}：${prevStep.description}` : ""}
【完成奖励】${quest.rewards.join("、")}

请输出这一步骤的场景，严格遵守以下 DSL 格式（不要输出任何其他内容）：

@scene ${quest.id}_s${step.stage}
  title: （场景标题，4-8 字）
  participants: 主角, ${quest.companionName}
  tone: （基调，6-12 字）
  when: mainline_${quest.companionId}_stage >= ${step.stage}

  @beat b1 pose:（姿势键，英文小写下划线）
    action: （动作描写，一句话，具体）
    sense:  （感官描写，一句话，有质感）
    mind:   （心理描写，一句话，有深度）
    speech(${quest.companionName}): （台词，符合角色性格）

  @beat b2 pose:（姿势键）
    action: ...
    sense:  ...
    mind:   ...
    speech(主角): ...

  @beat b3 pose:（姿势键）
    action: ...
    sense:  ...
    mind:   ...
    speech(${quest.companionName}): ...

  @variant b2 when: affection >= 60
    speech(${quest.companionName}): （好感高时的差分台词）

@end

要求：
1. 共 3-4 个 @beat，每个 beat 必须同时有 action / sense / mind / speech 四行
2. pose 用英文小写加下划线，如 signal_scan / cross_zone / rescue
3. 台词要符合「${quest.companionName}」的身份与性格
4. 描写要克制、具体、有质感，避免空洞形容词
5. 基调要贴合末日生存，不要写成轻松日常
6. 最后必须有一个 @variant 差分
7. 只输出 DSL，不要 markdown 代码块，不要解释`;
}

// ---------- 校验 DSL ----------
function validateDsl(text, quest, step) {
  const issues = [];
  const sceneId = `${quest.id}_s${step.stage}`;

  if (!text.includes(`@scene ${sceneId}`)) issues.push("缺少 @scene 或 id 不符");
  if (!text.trimEnd().endsWith("@end")) issues.push("缺少 @end");
  if (!/title:\s*\S/.test(text)) issues.push("缺少 title");
  if (!text.includes("participants:")) issues.push("缺少 participants");
  if (!text.includes("tone:")) issues.push("缺少 tone");
  if (!text.includes("when:")) issues.push("缺少 when");

  const beats = [...text.matchAll(/@beat\s+(\S+)\s+pose:(\S+)/g)];
  if (beats.length < 3) issues.push(`节拍不足（${beats.length}，需 3+）`);

  // 每个 beat 必须有四层
  const blocks = text.split(/@beat\s+/).slice(1);
  for (const b of blocks) {
    const id = b.split(/\s/)[0];
    if (!/action:/.test(b)) issues.push(`${id} 缺 action`);
    if (!/sense:/.test(b)) issues.push(`${id} 缺 sense`);
    if (!/mind:/.test(b)) issues.push(`${id} 缺 mind`);
    if (!/speech\(/.test(b)) issues.push(`${id} 缺 speech`);
  }

  if (!text.includes("@variant")) issues.push("缺少 @variant");

  // 括号必须闭合
  const open = (text.match(/speech\(/g) ?? []).length;
  const close = (text.match(/\):/g) ?? []).length;
  if (open > close + 2) issues.push("speech 括号可能未闭合");

  return issues;
}

/** 清理模型输出 */
function cleanup(text) {
  let t = text.trim();

  // 去掉 markdown 代码块
  t = t.replace(/^```(?:dsl|text|nsi)?\s*/i, "").replace(/```\s*$/, "");
  // 去掉「输出：」之类的前缀
  t = t.replace(/^(?:输出|结果|DSL|以下是)[:：]?\s*/i, "");
  // 统一行尾
  t = t.replace(/\r\n/g, "\n");

  // 只保留 @scene 到 @end 之间的内容（模型有时会前后加解释）
  const start = t.indexOf("@scene");
  if (start > 0) t = t.slice(start);

  // 修 pose 后的空格：pose: xxx → pose:xxx
  t = t.replace(/pose:\s+/g, "pose:");

  // 去掉台词两侧的英文引号（DSL 不需要）
  t = t.replace(/(speech\([^)]+\):\s*)["'“”]([^"'“”]*)["'“”]/g, "$1$2");
  // 去掉行尾多余的引号
  t = t.replace(/(speech\([^)]+\):\s*[^\n]*?)["']\s*$/gm, "$1");

  // 统一顶层指令缩进（模型有时多缩一层）
  t = t.replace(/^\s*@scene\s+/gm, "@scene ");
  t = t.replace(/^\s*@end\s*$/gm, "@end");
  t = t.replace(/^\s*@beat\s+/gm, "  @beat ");
  t = t.replace(/^\s*@variant\s+/gm, "  @variant ");
  t = t.replace(/^\s*(title|participants|tone|when):/gm, "  $1:");

  // 统一节拍内容缩进：4 空格
  t = t.replace(/^\s*action:/gm, "    action:");
  t = t.replace(/^\s*sense:/gm, "    sense:");
  t = t.replace(/^\s*mind:/gm, "    mind:");
  t = t.replace(/^\s*speech\(/gm, "    speech(");

  // 确保以 @end 结尾
  if (!/@end\s*$/.test(t)) {
    const i = t.lastIndexOf("@end");
    if (i >= 0) {
      t = t.slice(0, i + 4);
    } else {
      t = t.trimEnd() + "\n\n@end";
    }
  }

  return t.trim() + "\n";
}

// ---------- 逐条生成 ----------
let ok = 0, fail = 0;
const t0 = Date.now();

for (const [i, item] of plan.entries()) {
  if (i >= LIMIT) break;

  const { quest, step, outFile } = item;
  const prevStep = quest.steps.find((s) => s.stage === step.stage - 1);

  process.stdout.write(`[${i + 1}/${Math.min(plan.length, LIMIT)}] ${quest.id}_s${step.stage} …`);

  const start = Date.now();
  try {
    const res = await narrator.getProvider().generate({
      messages: [
        { role: "system", content: "你是一位末日题材的文字游戏编剧。只输出要求的 DSL，不要任何解释。" },
        { role: "user", content: buildPrompt(quest, step, prevStep) }
      ],
      options: { temperature: 0.9, topP: 0.92, maxTokens: 1500 }
    });

    const dsl = cleanup(res.text);
    const issues = validateDsl(dsl, quest, step);

    if (issues.length > 0) {
      console.log(` ✗ 校验失败：${issues.slice(0, 3).join("；")}`);
      fail++;
      // 保存失败样本供排查
      writeFileSync(outFile.replace(/\.dsl$/, ".bad.txt"), dsl, "utf8");
      continue;
    }

    writeFileSync(outFile, dsl, "utf8");
    const chars = dsl.replace(/\s/g, "").length;
    console.log(` ✓ ${chars} 字　${((Date.now() - start) / 1000).toFixed(1)}s`);
    ok++;
  } catch (e) {
    console.log(` ✗ ${String(e).slice(0, 80)}`);
    fail++;
  }
}

const total = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`\n完成：成功 ${ok}　失败 ${fail}　耗时 ${total}s`);

// 统计
const files = readdirSync(SCRIPT_DIR).filter((f) => f.endsWith(".dsl"));
console.log(`剧本总数：${files.length}`);