#!/usr/bin/env node
/**
 * 批量预生成日常 H 场景文本。
 *
 * 用法：
 *   node scripts/pregenerate.mjs                     # 全部模板 × 全部角色组合
 *   node scripts/pregenerate.mjs --model qwen3:14b   # 指定模型
 *   node scripts/pregenerate.mjs --limit 20          # 只跑前 20 个组合
 *   node scripts/pregenerate.mjs --dry               # 只列出计划，不实际生成
 *   node scripts/pregenerate.mjs --template morning_wake
 *
 * 产物：
 *   packages/core/data/generated/h_scenes.json
 *   结构：{ generatedAt, model, entries: [{ key, templateId, companionId, text, beats, latencyMs }] }
 *
 * 特性：
 *   - 断点续跑：已存在的 key 跳过
 *   - 失败重试与超时保护
 *   - 逐条落盘，中断不丢进度
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
/** Windows 上动态 import 必须用 file:// URL */
const imp = (rel) => import(pathToFileURL(join(root, rel)).href);

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};
const has = (name) => args.includes(`--${name}`);

const MODEL = flag("model", "qwen3:14b");
const BASE_URL = flag("url", "http://127.0.0.1:11434");
const LIMIT = Number(flag("limit", "0")) || Infinity;
const ONLY_TEMPLATE = flag("template", null);
const DRY = has("dry");
const TIMEOUT_MS = Number(flag("timeout", "180000")) || 180000;

const OUT_DIR = join(root, "packages", "core", "data", "generated");
const OUT_FILE = join(OUT_DIR, "h_scenes.json");
/** 同时输出到前端可访问目录，供运行时加载 */
const PUB_DIR = join(root, "apps", "desktop", "public", "data");
const PUB_FILE = join(PUB_DIR, "h_scenes.json");
mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(PUB_DIR, { recursive: true });

// ---------- 载入 core（Node 直接跑 TS） ----------
const core = await imp("packages/core/src/index.ts");
const {
  H_TEMPLATES, hTemplate, templateToPrompt, H_LOCATION_LABEL, H_TIME_TONE,
  COMPANIONS, companionDef, PERSONALITY_LABEL, PERSONALITY_TRAITS
} = core;

const { createNarrator } = await imp("packages/llm/src/narrator.ts");

// ---------- 载入已有进度 ----------
let store = { generatedAt: null, model: MODEL, entries: [] };
if (existsSync(OUT_FILE)) {
  try {
    store = JSON.parse(readFileSync(OUT_FILE, "utf8"));
    console.log(`已有进度：${store.entries.length} 条`);
  } catch {
    console.log("已有文件解析失败，将重建");
  }
}
const done = new Set(store.entries.map((e) => e.key));

// ---------- 构建生成计划 ----------
/** 能参与日常 H 的角色（排除 AI，因为它无身体） */
const HERO_IDS = COMPANIONS.filter((c) => c.id !== "ai").map((c) => c.id);

const plan = [];
for (const t of H_TEMPLATES) {
  if (ONLY_TEMPLATE && t.id !== ONLY_TEMPLATE) continue;
  // 一对一模板：每个角色一条；多人模板：取前 N 个角色组合（用前 3 位）
  const combos = t.maxParticipants <= 1
    ? HERO_IDS.map((id) => [id])
    : HERO_IDS.slice(0, 6).map((id) => [id]).concat([HERO_IDS.slice(0, 2)]);
  for (const combo of combos) {
    const key = `${t.id}__${combo.join("+")}`;
    if (done.has(key)) continue;
    plan.push({ template: t, companionIds: combo, key });
  }
}

console.log(`计划生成 ${plan.length} 条（已完成 ${done.size} 条）`);
if (DRY) {
  for (const p of plan.slice(0, 30)) {
    console.log(`  ${p.key}　${p.template.name}　${p.companionIds.join("+")}`);
  }
  if (plan.length > 30) console.log(`  …共 ${plan.length} 条`);
  process.exit(0);
}
if (plan.length === 0) {
  console.log("无需生成");
  process.exit(0);
}

// ---------- 探测模型 ----------
const narrator = createNarrator({ kind: "ollama", baseUrl: BASE_URL, model: MODEL, timeoutMs: TIMEOUT_MS });
const status = await narrator.status();
if (!status.available) {
  console.error(`✗ 模型不可用：${status.error}`);
  console.error("  请确认 Ollama 正在运行，且模型已安装");
  process.exit(1);
}
console.log(`✓ 模型可用（${status.latencyMs}ms）`);

// ---------- 逐条生成 ----------
let ok = 0;
let fail = 0;
const t0 = Date.now();

for (const [i, item] of plan.entries()) {
  if (i >= LIMIT) { console.log(`达到上限 ${LIMIT}，停止`); break; }

  const t = item.template;
  const names = item.companionIds.map((id) => companionDef(id)?.name ?? id);
  const locLabel = H_LOCATION_LABEL[t.locations[0]];
  const timeTone = H_TIME_TONE[t.times[0]];

  // 构造提示词
  const participants = [
    { name: "主角", title: "扶她御姐", role: "主角" },
    ...item.companionIds.map((id) => {
      const def = companionDef(id);
      const traits = def ? PERSONALITY_TRAITS[def.personality] : null;
      return {
        name: def?.name ?? id,
        title: def?.title,
        role: "参与方",
        personality: def ? PERSONALITY_LABEL[def.personality] : undefined,
        tone: traits?.tone,
        voiceSample: traits?.approach,
        outfit: "（按当前着装）"
      };
    })
  ];

  const ctx = {
    sceneId: `h_${t.id}`,
    title: t.name,
    tone: t.tone,
    participants,
    props: t.props,
    pose: t.beats[0]?.pose,
    beatCount: t.beats.length,
    time: timeTone,
    location: locLabel,
    extra: `${templateToPrompt(t, names)}\n\n【模型约束】${t.guidance}`
  };

  const start = Date.now();
  try {
    const r = await narrator.narrate(ctx, null);
    const text = r.scene.beats
      .map((b, bi) => {
        const lines = b.lines.map((l) =>
          l.layer === "speech"
            ? `${l.speaker ?? "?"}「${l.text}」`
            : l.text
        ).join("\n");
        return `--- 节拍 ${bi + 1}/${r.scene.beats.length} ---\n${lines}`;
      })
      .join("\n\n");

    const entry = {
      key: item.key,
      templateId: t.id,
      companionIds: item.companionIds,
      location: t.locations[0],
      time: t.times[0],
      tier: t.tier,
      text,
      beatCount: r.scene.beats.length,
      chars: text.replace(/\s/g, "").length,
      model: r.model,
      latencyMs: Date.now() - start
    };
    store.entries.push(entry);
    ok++;

    // 逐条落盘（同时更新前端副本）
    store.generatedAt = new Date().toISOString();
    const json = JSON.stringify(store, null, 2);
    writeFileSync(OUT_FILE, json, "utf8");
    writeFileSync(PUB_FILE, json, "utf8");

    const pct = Math.round(((i + 1) / Math.min(plan.length, LIMIT)) * 100);
    console.log(`[${pct}%] ${item.key}　${entry.chars} 字　${entry.latencyMs}ms`);
  } catch (e) {
    fail++;
    console.error(`✗ ${item.key}：${String(e).slice(0, 120)}`);
  }
}

const total = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`\n完成：成功 ${ok}　失败 ${fail}　耗时 ${total}s`);
console.log(`输出：${OUT_FILE}`);
console.log(`前端副本：${PUB_FILE}`);
console.log(`累计条目：${store.entries.length}`);

// 统计
const totalChars = store.entries.reduce((s, e) => s + (e.chars ?? 0), 0);
console.log(`累计字数：${totalChars.toLocaleString()}`);