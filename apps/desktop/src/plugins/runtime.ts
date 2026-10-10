/**
 * 插件运行时 —— 实际调用文生图与 TTS 服务。
 *
 * 职责：
 *  - 探测服务可用性
 *  - 提交生成请求并轮询结果
 *  - 缓存产物（立绘 / 语音）
 *  - 失败时静默降级（不阻断游戏）
 *
 * 全部通过 HTTP 调用本地服务，不依赖额外 npm 包。
 */

import type { PluginManifest, PortraitRequest, TtsRequest } from "@doomsday/core";

// ============ 通用 ============

export interface ProbeResult {
  online: boolean;
  latencyMs: number;
  error?: string;
  /** 服务返回的附加信息（如可用模型列表） */
  info?: string;
}

/** 带超时的 fetch */
async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 5000
): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ============ ComfyUI ============

/** 探测 ComfyUI */
export async function probeComfyUI(endpoint: string): Promise<ProbeResult> {
  const t0 = Date.now();
  try {
    const res = await fetchWithTimeout(`${endpoint}/system_stats`, {}, 4000);
    if (!res.ok) return { online: false, latencyMs: Date.now() - t0, error: `HTTP ${res.status}` };
    const data = await res.json();
    const dev = data?.devices?.[0];
    const info = dev
      ? `${dev.name ?? "GPU"}　显存 ${Math.round((dev.vram_total ?? 0) / 1024 / 1024 / 1024)}GB`
      : "已连接";
    return { online: true, latencyMs: Date.now() - t0, info };
  } catch (e) {
    return {
      online: false,
      latencyMs: Date.now() - t0,
      error: e instanceof Error ? e.message : String(e)
    };
  }
}

/** 列出 ComfyUI 可用的 checkpoint */
export async function listComfyModels(endpoint: string): Promise<string[]> {
  try {
    const res = await fetchWithTimeout(`${endpoint}/object_info/CheckpointLoaderSimple`, {}, 6000);
    if (!res.ok) return [];
    const data = await res.json();
    const list = data?.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/** 构建 ComfyUI 工作流（txt2img） */
function buildWorkflow(req: PortraitRequest, params: Record<string, unknown>) {
  const ckpt = (params.model as string) ?? "anything-v5-PrtRE.safetensors";
  const steps = (params.steps as number) ?? 24;
  const cfg = (params.cfg as number) ?? 7;
  const sampler = (params.sampler as string) ?? "dpmpp_2m";
  const scheduler = (params.scheduler as string) ?? "karras";

  return {
    "3": {
      class_type: "KSampler",
      inputs: {
        seed: req.seed,
        steps,
        cfg,
        sampler_name: sampler,
        scheduler,
        denoise: 1,
        model: ["4", 0],
        positive: ["6", 0],
        negative: ["7", 0],
        latent_image: ["5", 0]
      }
    },
    "4": {
      class_type: "CheckpointLoaderSimple",
      inputs: { ckpt_name: ckpt }
    },
    "5": {
      class_type: "EmptyLatentImage",
      inputs: { width: req.width, height: req.height, batch_size: 1 }
    },
    "6": {
      class_type: "CLIPTextEncode",
      inputs: { text: req.prompt, clip: ["4", 1] }
    },
    "7": {
      class_type: "CLIPTextEncode",
      inputs: { text: req.negative, clip: ["4", 1] }
    },
    "8": {
      class_type: "VAEDecode",
      inputs: { samples: ["3", 0], vae: ["4", 2] }
    },
    "9": {
      class_type: "SaveImage",
      inputs: { filename_prefix: `dh_${req.companionId}`, images: ["8", 0] }
    }
  };
}

export interface ImageResult {
  ok: boolean;
  /** base64 数据 URL，或本地文件路径 */
  data?: string;
  error?: string;
  /** 生成耗时 */
  elapsedMs: number;
}

/**
 * 通过 ComfyUI 生成立绘。
 *
 * 流程：POST /prompt → 轮询 /history/{id} → 取图
 */
export async function generatePortrait(
  endpoint: string,
  req: PortraitRequest,
  params: Record<string, unknown> = {},
  timeoutMs = 180000
): Promise<ImageResult> {
  const t0 = Date.now();
  try {
    const workflow = buildWorkflow(req, params);

    const submit = await fetchWithTimeout(`${endpoint}/prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: workflow, client_id: "doomsday-harem" })
    }, 15000);

    if (!submit.ok) {
      const txt = await submit.text().catch(() => "");
      return { ok: false, error: `提交失败 HTTP ${submit.status} ${txt.slice(0, 120)}`, elapsedMs: Date.now() - t0 };
    }

    const { prompt_id } = await submit.json();
    if (!prompt_id) return { ok: false, error: "未返回 prompt_id", elapsedMs: Date.now() - t0 };

    // 轮询
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      await sleep(800);

      const hist = await fetchWithTimeout(`${endpoint}/history/${prompt_id}`, {}, 8000);
      if (!hist.ok) continue;

      const data = await hist.json();
      const entry = data[prompt_id];
      if (!entry) continue;

      if (entry.status?.status_str === "error") {
        return { ok: false, error: "工作流执行出错", elapsedMs: Date.now() - t0 };
      }

      const outputs = entry.outputs ?? {};
      for (const node of Object.values(outputs) as Array<Record<string, unknown>>) {
        const images = node.images as Array<{ filename: string; subfolder: string; type: string }> | undefined;
        if (images && images.length > 0) {
          const img = images[0];
          const url = `${endpoint}/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder ?? "")}&type=${img.type ?? "output"}`;
          const bin = await fetchWithTimeout(url, {}, 20000);
          if (!bin.ok) return { ok: false, error: "取图失败", elapsedMs: Date.now() - t0 };

          const buf = await bin.arrayBuffer();
          const b64 = base64FromBytes(new Uint8Array(buf));
          return {
            ok: true,
            data: `data:image/png;base64,${b64}`,
            elapsedMs: Date.now() - t0
          };
        }
      }
    }

    return { ok: false, error: "生成超时", elapsedMs: Date.now() - t0 };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      elapsedMs: Date.now() - t0
    };
  }
}

function base64FromBytes(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

// ============ TTS ============

/** 探测 GPT-SoVITS */
export async function probeGptSoVits(endpoint: string): Promise<ProbeResult> {
  const t0 = Date.now();
  try {
    // GPT-SoVITS 的 api 通常有 /docs 或根路径
    const res = await fetchWithTimeout(endpoint, {}, 4000);
    return {
      online: res.ok || res.status === 404,
      latencyMs: Date.now() - t0,
      info: `HTTP ${res.status}`
    };
  } catch (e) {
    return {
      online: false,
      latencyMs: Date.now() - t0,
      error: e instanceof Error ? e.message : String(e)
    };
  }
}

/**
 * GPT-SoVITS 合成。
 *
 * 其 API 形态：POST /tts 带参考音频与文本。
 */
export async function synthesizeGptSoVits(
  endpoint: string,
  req: TtsRequest,
  params: Record<string, unknown> = {}
): Promise<ImageResult> {
  const t0 = Date.now();
  try {
    const body = {
      text: req.text,
      text_lang: (params.textLang as string) ?? "zh",
      ref_audio_path: (params.refAudioPath as string) ?? "",
      prompt_text: (params.promptText as string) ?? "",
      prompt_lang: (params.promptLang as string) ?? "zh",
      speed_factor: req.speed ?? (params.speed as number) ?? 1.0,
      media_type: "wav",
      streaming_mode: false
    };

    const res = await fetchWithTimeout(`${endpoint}/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }, 60000);

    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}`, elapsedMs: Date.now() - t0 };
    }

    const buf = await res.arrayBuffer();
    const b64 = base64FromBytes(new Uint8Array(buf));
    return { ok: true, data: `data:audio/wav;base64,${b64}`, elapsedMs: Date.now() - t0 };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      elapsedMs: Date.now() - t0
    };
  }
}

/** IndexTTS 合成 */
export async function synthesizeIndexTts(
  endpoint: string,
  req: TtsRequest,
  params: Record<string, unknown> = {}
): Promise<ImageResult> {
  const t0 = Date.now();
  try {
    const form = new FormData();
    form.append("text", req.text);
    form.append("speed", String(req.speed ?? 1.0));
    if (params.refAudio) form.append("ref_audio", params.refAudio as string);

    const res = await fetchWithTimeout(`${endpoint}/api/tts`, {
      method: "POST",
      body: form
    }, 60000);

    if (!res.ok) return { ok: false, error: `HTTP ${res.status}`, elapsedMs: Date.now() - t0 };

    const buf = await res.arrayBuffer();
    return {
      ok: true,
      data: `data:audio/wav;base64,${base64FromBytes(new Uint8Array(buf))}`,
      elapsedMs: Date.now() - t0
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e), elapsedMs: Date.now() - t0 };
  }
}

/**
 * 用浏览器内置语音合成（零依赖兜底）。
 *
 * 不产生音频数据，直接朗读。
 */
export function speakWithBrowser(text: string, voice?: string, rate = 1.0): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "zh-CN";
    u.rate = rate;
    if (voice) {
      const v = window.speechSynthesis.getVoices().find((x) => x.name === voice);
      if (v) u.voice = v;
    }
    window.speechSynthesis.speak(u);
    return true;
  } catch {
    return false;
  }
}

export function stopBrowserSpeech(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

// ============ 统一入口 ============

/** 探测任意插件 */
export async function probePlugin(p: PluginManifest): Promise<ProbeResult> {
  if (p.id === "comfyui") return probeComfyUI(p.endpoint);
  if (p.id === "gpt-sovits") return probeGptSoVits(p.endpoint);
  if (p.id === "index-tts") return probeGptSoVits(p.endpoint);
  if (p.id === "edge-tts" || p.id === "system-tts") {
    const ok = typeof window !== "undefined" && "speechSynthesis" in window;
    return { online: ok, latencyMs: 0, info: ok ? "浏览器语音可用" : "不可用" };
  }
  return { online: false, latencyMs: 0, error: "未知插件" };
}

/** 统一语音合成 */
export async function synthesize(
  plugin: PluginManifest,
  req: TtsRequest,
  params: Record<string, unknown> = {}
): Promise<ImageResult> {
  switch (plugin.id) {
    case "gpt-sovits":
      return synthesizeGptSoVits(plugin.endpoint, req, params);
    case "index-tts":
      return synthesizeIndexTts(plugin.endpoint, req, params);
    case "edge-tts":
    case "system-tts": {
      const ok = speakWithBrowser(req.text, params.voice as string, req.speed ?? 1.0);
      return { ok, elapsedMs: 0, error: ok ? undefined : "浏览器语音不可用" };
    }
    default:
      return { ok: false, error: "不支持的语音插件", elapsedMs: 0 };
  }
}

// ============ 缓存 ============

/**
 * 立绘缓存。
 *
 * 内存 + localStorage 双层：
 *  - 内存避免同会话重复请求
 *  - localStorage 跨会话保留（base64 可能较大，超限时静默失败）
 */
const portraitMem = new Map<string, string>();
const ttsMem = new Map<string, string>();

export function cacheGet(key: string): string | undefined {
  const mem = portraitMem.get(key) ?? ttsMem.get(key);
  if (mem) return mem;
  try {
    return localStorage.getItem(`dh_pc_${key}`) ?? undefined;
  } catch {
    return undefined;
  }
}

export function cacheSet(key: string, data: string, persist = true): void {
  if (key.startsWith("tts_")) ttsMem.set(key, data);
  else portraitMem.set(key, data);

  if (!persist) return;
  try {
    // 单条超过 1MB 不持久化（避免撑爆配额）
    if (data.length < 1_400_000) localStorage.setItem(`dh_pc_${key}`, data);
  } catch {
    // 配额不足，静默忽略
  }
}

export function cacheClear(): void {
  portraitMem.clear();
  ttsMem.clear();
  try {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith("dh_pc_"));
    for (const k of keys) localStorage.removeItem(k);
  } catch {
    // 忽略
  }
}

export function cacheSize(): { memory: number; persisted: number } {
  let persisted = 0;
  try {
    persisted = Object.keys(localStorage).filter((k) => k.startsWith("dh_pc_")).length;
  } catch {
    // 忽略
  }
  return { memory: portraitMem.size + ttsMem.size, persisted };
}
