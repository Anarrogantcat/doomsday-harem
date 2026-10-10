/**
 * 叙事服务 —— 模型生成与手写剧本的统一入口。
 *
 * 核心原则（与游戏设计一致）：
 *  1. 文本是成人内容的第一呈现层，模型只是生成手段之一
 *  2. 模型不可用 → 自动降级到手写剧本，游戏绝不中断
 *  3. 模型输出经过四层分类，喂给同一个文本引擎渲染
 *  4. 相同输入命中缓存，避免重复推理
 */
import type { Beat, Line, Scene } from "@doomsday/core";
import type { ChatMessage, GenerateOptions, GenerateResult, LlmProvider, ModelStatus } from "./types.ts";
import { LlmError } from "./types.ts";
import { buildMessages, classifyLines, parseBeats, type ScenePromptContext } from "./prompt.ts";
import { LlmCache, cacheKey } from "./cache.ts";
import { createProvider } from "./factory.ts";
import type { ProviderConfig } from "./types.ts";

export type NarrationMode = "scripted" | "model" | "hybrid";

export interface NarratorOptions {
  provider: LlmProvider;
  cache?: LlmCache;
  /** 默认生成参数 */
  defaults?: GenerateOptions;
  /** 失败重试次数 */
  retries?: number;
  /** 重试退避基数（毫秒） */
  backoffMs?: number;
  /** 生成失败时的回调 */
  onError?: (err: LlmError) => void;
}

export interface NarrateResult {
  scene: Scene;
  source: "scripted" | "model" | "cache";
  model?: string;
  latencyMs: number;
  error?: string;
}

const DEFAULT_GEN: GenerateOptions = {
  temperature: 0.85,
  topP: 0.92,
  topK: 40,
  maxTokens: 1200,
  repeatPenalty: 1.1
};

export class Narrator {
  private provider: LlmProvider;
  private cache: LlmCache;
  private defaults: GenerateOptions;
  private retries: number;
  private backoffMs: number;
  private onError?: (err: LlmError) => void;
  private lastStatus: ModelStatus | null = null;

  constructor(opt: NarratorOptions) {
    this.provider = opt.provider;
    this.cache = opt.cache ?? new LlmCache();
    this.defaults = { ...DEFAULT_GEN, ...(opt.defaults ?? {}) };
    this.retries = opt.retries ?? 2;
    this.backoffMs = opt.backoffMs ?? 400;
    this.onError = opt.onError;
  }

  getProvider(): LlmProvider {
    return this.provider;
  }

  setProvider(p: LlmProvider): void {
    this.provider = p;
    this.lastStatus = null;
  }

  getCache(): LlmCache {
    return this.cache;
  }

  async status(): Promise<ModelStatus> {
    this.lastStatus = await this.provider.probe();
    return this.lastStatus;
  }

  cachedStatus(): ModelStatus | null {
    return this.lastStatus;
  }

  /** 合并默认参数与调用参数 */
  private mergeOptions(o?: GenerateOptions): GenerateOptions {
    return { ...this.defaults, ...(o ?? {}) };
  }

  /**
   * 生成场景。
   * scripted 提供兜底：模型失败时返回它。
   */
  async narrate(
    ctx: ScenePromptContext,
    scripted: Scene | null,
    options?: GenerateOptions
  ): Promise<NarrateResult> {
    const t0 = Date.now();
    const messages = buildMessages(ctx);
    const opts = this.mergeOptions(options);
    const key = cacheKey(this.provider.model, messages, opts as Record<string, unknown>);

    const hit = this.cache.get(key);
    if (hit) {
      return {
        scene: this.toScene(ctx, hit.text),
        source: "cache",
        model: hit.model,
        latencyMs: Date.now() - t0
      };
    }

    let lastErr: Error | null = null;
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const res = await this.provider.generate({ messages, options: opts });
        const text = res.text.trim();
        if (!text) throw new LlmError(this.provider.kind, "模型返回空文本");

        this.cache.set(key, text, res.model);
        return {
          scene: this.toScene(ctx, text),
          source: "model",
          model: res.model,
          latencyMs: Date.now() - t0
        };
      } catch (e) {
        lastErr = e instanceof Error ? e : new Error(String(e));
        if (attempt < this.retries) {
          await sleep(this.backoffMs * Math.pow(2, attempt));
        }
      }
    }

    const err = new LlmError(
      this.provider.kind,
      lastErr?.message ?? "生成失败"
    );
    this.onError?.(err);

    if (scripted) {
      return {
        scene: scripted,
        source: "scripted",
        latencyMs: Date.now() - t0,
        error: err.message
      };
    }
    throw err;
  }

  /** 流式生成：逐块回调，最终返回完整场景 */
  async narrateStream(
    ctx: ScenePromptContext,
    onDelta: (delta: string) => void,
    scripted: Scene | null,
    options?: GenerateOptions
  ): Promise<NarrateResult> {
    const t0 = Date.now();
    const messages = buildMessages(ctx);
    const opts = this.mergeOptions(options);
    const key = cacheKey(this.provider.model, messages, opts as Record<string, unknown>);

    const hit = this.cache.get(key);
    if (hit) {
      onDelta(hit.text);
      return { scene: this.toScene(ctx, hit.text), source: "cache", model: hit.model, latencyMs: Date.now() - t0 };
    }

    let full = "";
    try {
      for await (const chunk of this.provider.stream({ messages, options: opts })) {
        if (chunk.delta) {
          full += chunk.delta;
          onDelta(chunk.delta);
        }
        if (chunk.done) break;
      }
      if (!full.trim()) throw new LlmError(this.provider.kind, "模型返回空文本");
      this.cache.set(key, full, this.provider.model);
      return {
        scene: this.toScene(ctx, full),
        source: "model",
        model: this.provider.model,
        latencyMs: Date.now() - t0
      };
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      this.onError?.(new LlmError(this.provider.kind, err.message));
      if (scripted) {
        return { scene: scripted, source: "scripted", latencyMs: Date.now() - t0, error: err.message };
      }
      throw err;
    }
  }

  /**
   * 把模型文本转成引擎可渲染的 Scene。
   * 公开为 public，供批量预生成脚本复用同一套解析与规范化逻辑。
   */
  toScene(ctx: ScenePromptContext, text: string): Scene {
    const chunks = parseBeats(text);
    const beats: Beat[] = chunks.map((chunk, i) => {
      const lines: Line[] = classifyLines(chunk).map((l) => ({
        layer: l.layer as Line["layer"],
        text: l.text,
        speaker: l.speaker
      }));
      return {
        id: `${ctx.sceneId}_gen${i + 1}`,
        poseKey: ctx.pose ?? "generated",
        lines
      };
    });

    // 模型没输出分隔符时，按空行段落切
    if (beats.length <= 1) {
      const paras = text.split(/\n\s*\n/).filter((p) => p.trim());
      if (paras.length > 1) {
        return {
          id: ctx.sceneId,
          title: ctx.title,
          participants: ctx.participants.map((p) => p.name),
          tone: ctx.tone,
          beats: paras.map((p, i) => ({
            id: `${ctx.sceneId}_p${i + 1}`,
            poseKey: ctx.pose ?? "generated",
            lines: classifyLines(p).map((l) => ({
              layer: l.layer as Line["layer"],
              text: l.text,
              speaker: l.speaker
            }))
          }))
        };
      }
    }

    return {
      id: ctx.sceneId,
      title: ctx.title,
      participants: ctx.participants.map((p) => p.name),
      tone: ctx.tone,
      beats
    };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** 便捷构造：从配置直接建 Narrator */
export function createNarrator(cfg: ProviderConfig, opt?: Partial<NarratorOptions>): Narrator {
  const provider = createProvider(cfg);
  return new Narrator({ provider, ...opt });
}

/** 可用性探测 + 自动降级：模型不可用则返回离线 Provider */
export async function ensureAvailable(
  cfg: ProviderConfig,
  fallbackToOffline = true
): Promise<{ narrator: Narrator; status: ModelStatus }> {
  const narrator = createNarrator(cfg);
  const status = await narrator.status();
  if (!status.available && fallbackToOffline) {
    narrator.setProvider(createProvider({ ...cfg, kind: "offline", model: "offline" }));
  }
  return { narrator, status };
}