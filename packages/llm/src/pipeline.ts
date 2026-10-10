/**
 * 生成管线 —— 按剧本分级决定使用手写还是模型生成。
 *
 * 核心保证（对应需求「非重要剧情玩家自己可以使用本地模型生成」）：
 *  1. 关键剧情永远用手写，模型不参与
 *  2. 可生成场景：优先模型，失败或未启用则回退手写
 *  3. 手写兜底永远存在，因此关闭模型或模型故障时游戏照常运行
 *  4. 生成结果按场景 id 缓存，同一场景不重复推理
 */
import type { Scene } from "@doomsday/core";
import {
  shouldGenerate, tierOfScene, tierGuidance, describeTier,
  type GenerationMode, type SceneTier
} from "@doomsday/core";
import type { Narrator } from "./narrator.ts";
import type { ScenePromptContext } from "./prompt.ts";

export interface PipelineOptions {
  /** 生成模式（玩家设置） */
  mode: GenerationMode;
  /** 叙事器；null 表示模型未启用 */
  narrator: Narrator | null;
  /** 生成失败时是否回退手写（默认 true） */
  fallbackToScript?: boolean;
  /** 单场最大节拍数 */
  maxBeats?: number;
}

export interface PipelineResult {
  scene: Scene;
  /** 来源 */
  source: "scripted" | "model" | "cache";
  /** 剧本分级 */
  tier: SceneTier;
  /** 分级描述 */
  tierNote: string;
  /** 未生成的原因（若走手写） */
  skippedReason?: "critical" | "mode-off" | "no-narrator" | "generation-failed";
  error?: string;
}

export class GenerationPipeline {
  private opts: PipelineOptions;
  private cache = new Map<string, Scene>();

  constructor(opts: PipelineOptions) {
    this.opts = opts;
  }

  setMode(mode: GenerationMode): void {
    this.opts = { ...this.opts, mode };
  }

  setNarrator(narrator: Narrator | null): void {
    this.opts = { ...this.opts, narrator };
  }

  get mode(): GenerationMode {
    return this.opts.mode;
  }

  /** 清除生成缓存（切换模型或修改设置后调用） */
  clearCache(): void {
    this.cache.clear();
  }

  cacheSize(): number {
    return this.cache.size;
  }

  /**
   * 获取场景。
   * scripted 为手写剧本（兜底），ctx 为生成上下文。
   */
  async getScene(
    sceneId: string,
    scripted: Scene,
    ctx: ScenePromptContext
  ): Promise<PipelineResult> {
    const tier = tierOfScene(sceneId);
    const tierNote = describeTier(sceneId);

    // 1. 关键剧情：永远手写
    if (tier === "critical") {
      return { scene: scripted, source: "scripted", tier, tierNote, skippedReason: "critical" };
    }

    // 2. 模式判定
    if (!shouldGenerate(sceneId, this.opts.mode)) {
      return { scene: scripted, source: "scripted", tier, tierNote, skippedReason: "mode-off" };
    }

    // 3. 模型不可用
    if (!this.opts.narrator) {
      return { scene: scripted, source: "scripted", tier, tierNote, skippedReason: "no-narrator" };
    }

    // 4. 生成缓存
    const hit = this.cache.get(sceneId);
    if (hit) {
      return { scene: hit, source: "cache", tier, tierNote };
    }

    // 5. 调用模型（附分级约束）
    const enriched: ScenePromptContext = {
      ...ctx,
      extra: [ctx.extra, tierGuidance(tier)].filter(Boolean).join("\n"),
      beatCount: ctx.beatCount ?? this.opts.maxBeats
    };

    // 关闭回退时把手写剧本传 null，让叙事器在失败时抛错
    const fallback = this.opts.fallbackToScript === false ? null : scripted;

    try {
      const result = await this.opts.narrator.narrate(enriched, fallback);
      const scene = result.scene;

      if (result.source === "scripted") {
        // 叙事器内部已降级
        return {
          scene,
          source: "scripted",
          tier,
          tierNote,
          skippedReason: "generation-failed",
          error: result.error
        };
      }

      this.cache.set(sceneId, scene);
      return { scene, source: result.source === "cache" ? "cache" : "model", tier, tierNote };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (this.opts.fallbackToScript !== false) {
        return {
          scene: scripted, source: "scripted", tier, tierNote,
          skippedReason: "generation-failed", error: msg
        };
      }
      throw e;
    }
  }

  /** 流式版本：逐块回调，最终返回结果 */
  async getSceneStream(
    sceneId: string,
    scripted: Scene,
    ctx: ScenePromptContext,
    onDelta: (delta: string) => void
  ): Promise<PipelineResult> {
    const tier = tierOfScene(sceneId);
    const tierNote = describeTier(sceneId);

    if (tier === "critical") {
      return { scene: scripted, source: "scripted", tier, tierNote, skippedReason: "critical" };
    }
    if (!shouldGenerate(sceneId, this.opts.mode)) {
      return { scene: scripted, source: "scripted", tier, tierNote, skippedReason: "mode-off" };
    }
    if (!this.opts.narrator) {
      return { scene: scripted, source: "scripted", tier, tierNote, skippedReason: "no-narrator" };
    }

    const hit = this.cache.get(sceneId);
    if (hit) {
      onDelta("（来自缓存）");
      return { scene: hit, source: "cache", tier, tierNote };
    }

    const enriched: ScenePromptContext = {
      ...ctx,
      extra: [ctx.extra, tierGuidance(tier)].filter(Boolean).join("\n"),
      beatCount: ctx.beatCount ?? this.opts.maxBeats
    };

    const fallback = this.opts.fallbackToScript === false ? null : scripted;
    const result = await this.opts.narrator.narrateStream(enriched, onDelta, fallback);
    if (result.source === "scripted") {
      return {
        scene: result.scene, source: "scripted", tier, tierNote,
        skippedReason: "generation-failed", error: result.error
      };
    }
    this.cache.set(sceneId, result.scene);
    return { scene: result.scene, source: "model", tier, tierNote };
  }

  /** 统计：哪些场景会走生成 */
  planReport(sceneIds: string[]): {
    total: number;
    willGenerate: string[];
    scriptedOnly: string[];
    byTier: Record<SceneTier, number>;
  } {
    const willGenerate: string[] = [];
    const scriptedOnly: string[] = [];
    const byTier: Record<SceneTier, number> = { critical: 0, major: 0, minor: 0, ambient: 0 };

    for (const id of sceneIds) {
      const t = tierOfScene(id);
      byTier[t]++;
      if (shouldGenerate(id, this.opts.mode) && this.opts.narrator) willGenerate.push(id);
      else scriptedOnly.push(id);
    }

    return { total: sceneIds.length, willGenerate, scriptedOnly, byTier };
  }
}