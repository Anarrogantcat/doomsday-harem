#!/usr/bin/env node
/**
 * 全角色立绘批量生成。
 *
 * 从角色数据解析体型/罩杯，用 ComfyUI 生成一张标准立绘，
 * 存入 apps/desktop/public/assets/portraits/<id>.png
 *
 * 用法：
 *   node scripts/gen-portraits.mjs              # 全部角色
 *   node scripts/gen-portraits.mjs --only sister,mother
 *   node scripts/gen-portraits.mjs --force      # 覆盖已存在
 *   node scripts/gen-portraits.mjs --size 512   # 宽度（高度为 1.5 倍）
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const imp = (rel) => import(pathToFileURL(join(root, rel)).href);

const args = process.argv.slice(2);
const flag = (n, d) => {
  const i = args.indexOf("--" + n);
  return i !== -1 && args[i + 1] ? args[i + 1] : d;
};
const has = (n) => args.includes("--" + n);

const EP = flag("endpoint", "http://127.0.0.1:8188");
const ONLY = flag("only", null)?.split(",").map((s) => s.trim()) ?? null;
const FORCE = has("force");
const W = Number(flag("size", "512"));
const H = Math.round(W * 1.5);
const STEPS = Number(flag("steps", "24"));

const OUT_DIR = join(root, "apps", "desktop", "public", "assets", "portraits");

const { COMPANIONS } = await imp("packages/core/src/systems/companions.ts");
const { buildPortraitPrompt } = await imp("packages/core/src/systems/plugins.ts");

// ---------- 解析罩杯 ----------
function parseCup(build) {
  const m = build.match(/([A-H])[-\s]?cup/i);
  if (!m) return 3;
  const idx = "ABCDEFGH".indexOf(m[1].toUpperCase());
  return idx >= 0 ? idx : 3;
}

// ---------- 解析体型倾向 ----------
function parseBodyHint(build) {
  if (/娇小|纤细|柔软|清纯/.test(build)) return "petite, slim";
  if (/结实|肌肉|精瘦|干练|运动/.test(build)) return "toned, athletic";
  if (/丰腴|丰满|成熟|保养/.test(build)) return "curvy, mature";
  if (/御姐|蜂腰|翘臀/.test(build)) return "curvy, tall";
  return "";
}

// ---------- 年长/成熟角色 ----------
// 这些角色应偏御姐气质（成熟脸、狭长眼、成人身材）
const MATURE_IDS = new Set([
  "mother",       // 45 岁母亲
  "sister",       // 26 岁姐姐
  "teacher",      // 大学教师
  "surgeon",      // 外科医生
  "heiress",      // 富二代御姐
  "librarian",    // 图书管理员
  "pianist",      // 钢琴家
  "neighbor",     // 邻居人妻
  "colleague",    // 前同事
  "singlemom",    // 单亲妈妈
  "idol",         // 前偶像（成年）
  "pilot",        // 女飞行员
  "mechanic",     // 机械师
  "hunter",       // 女猎人
  "pharmacist"    // 药剂师
]);

// ---------- 性格 → 情绪 ----------
const MOOD_BY_PERSONALITY = {
  warm: "温柔",
  bold: "自信",
  shy: "害羞",
  cool: "平静",
  practical: "平静",
  devout: "平静",
  artistic: "开心",
  ai: "平静"
};

// ---------- 角色 → 提示词 ----------
function promptFor(c) {
  const cup = parseCup(c.build);
  const hint = parseBodyHint(c.build);
  const mood = MOOD_BY_PERSONALITY[c.personality] ?? "平静";
  const height = c.heightCm && c.heightCm > 0 ? c.heightCm : 165;

  const extra = [
    hint,
    // 身份相关标签
    c.id === "nun" ? "nun habit, modest dress" : "",
    c.id === "idol" ? "stage outfit" : "",
    c.id === "mechanic" ? "work clothes, overalls" : "",
    c.id === "teacher" ? "cardigan, glasses" : "",
    c.id === "pilot" ? "flight jacket" : "",
    c.id === "surgeon" ? "medical coat" : "",
    c.id === "heiress" ? "elegant dress" : "",
    c.id === "baker" ? "apron" : "",
    c.id === "ai" ? "holographic figure, glowing, translucent" : ""
  ].filter(Boolean).join(", ");

  return buildPortraitPrompt({
    name: c.name,
    build: c.build,
    cup,
    height,
    futanari: false,
    pregnant: false,
    exposure: 30,
    mood,
    mature: MATURE_IDS.has(c.id),
    extra
  });
}

// ---------- 探测服务 ----------
try {
  const res = await fetch(EP + "/system_stats");
  if (!res.ok) throw new Error("HTTP " + res.status);
  const j = await res.json();
  console.log("✓ ComfyUI 在线　" + (j.devices?.[0]?.name ?? ""));
} catch (e) {
  console.error("✗ ComfyUI 不可用：" + String(e));
  console.error("  请先启动：D:\\AI\\ComfyUI\\python\\python.exe ComfyUI\\main.py --port 8188");
  process.exit(1);
}

const info = await (await fetch(EP + "/object_info/CheckpointLoaderSimple")).json();
const models = info.CheckpointLoaderSimple.input.required.ckpt_name[0];
const ckpt = models.find((m) => m.includes("anything")) ?? models[0];
console.log("✓ 模型：" + ckpt);
console.log("");

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

// ---------- 逐张生成 ----------
const list = ONLY ? COMPANIONS.filter((c) => ONLY.includes(c.id)) : COMPANIONS;
let ok = 0, skip = 0, fail = 0;
const t0 = Date.now();

for (const [i, c] of list.entries()) {
  const outFile = join(OUT_DIR, c.id + ".png");

  if (existsSync(outFile) && !FORCE) {
    console.log("[" + (i + 1) + "/" + list.length + "] " + c.name + " … 已存在，跳过");
    skip++;
    continue;
  }

  const { prompt, negative } = promptFor(c);
  process.stdout.write("[" + (i + 1) + "/" + list.length + "] " + c.name + " …");

  const wf = {
    "3": { class_type: "KSampler", inputs: {
      seed: 100000 + i * 7919, steps: STEPS, cfg: 7,
      sampler_name: "dpmpp_2m", scheduler: "karras", denoise: 1,
      model: ["4", 0], positive: ["6", 0], negative: ["7", 0], latent_image: ["5", 0] } },
    "4": { class_type: "CheckpointLoaderSimple", inputs: { ckpt_name: ckpt } },
    "5": { class_type: "EmptyLatentImage", inputs: { width: W, height: H, batch_size: 1 } },
    "6": { class_type: "CLIPTextEncode", inputs: { text: prompt, clip: ["4", 1] } },
    "7": { class_type: "CLIPTextEncode", inputs: { text: negative, clip: ["4", 1] } },
    "8": { class_type: "VAEDecode", inputs: { samples: ["3", 0], vae: ["4", 2] } },
    "9": { class_type: "SaveImage", inputs: { filename_prefix: "dh_" + c.id, images: ["8", 0] } }
  };

  const start = Date.now();
  try {
    const sub = await fetch(EP + "/prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: wf, client_id: "dh-portraits" })
    });
    if (!sub.ok) {
      console.log(" ✗ 提交失败 " + sub.status);
      fail++;
      continue;
    }
    const { prompt_id } = await sub.json();

    let done = false;
    for (let k = 0; k < 150; k++) {
      await new Promise((r) => setTimeout(r, 900));
      const h = await (await fetch(EP + "/history/" + prompt_id)).json();
      const e = h[prompt_id];
      if (!e) continue;

      if (e.status?.status_str === "error") {
        console.log(" ✗ 执行出错");
        fail++;
        break;
      }

      for (const node of Object.values(e.outputs ?? {})) {
        const imgs = node.images;
        if (imgs?.length) {
          const img = imgs[0];
          const url = EP + "/view?filename=" + encodeURIComponent(img.filename) +
            "&subfolder=" + encodeURIComponent(img.subfolder ?? "") +
            "&type=" + (img.type ?? "output");
          const bin = await fetch(url);
          const buf = Buffer.from(await bin.arrayBuffer());
          writeFileSync(outFile, buf);
          console.log(" ✓ " + Math.round(buf.length / 1024) + " KB　" +
            ((Date.now() - start) / 1000).toFixed(1) + "s");
          ok++;
          done = true;
          break;
        }
      }
      if (done) break;
    }
    if (!done && !existsSync(outFile)) { console.log(" ✗ 超时"); fail++; }
  } catch (e) {
    console.log(" ✗ " + String(e).slice(0, 60));
    fail++;
  }
}

console.log("");
console.log("完成：成功 " + ok + "　跳过 " + skip + "　失败 " + fail +
  "　耗时 " + ((Date.now() - t0) / 1000).toFixed(0) + "s");
console.log("输出目录：" + OUT_DIR);
