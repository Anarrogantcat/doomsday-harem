/**
 * 模型设置 —— 可持久化的配置对象，供设置界面与存档使用。
 */
import type { GenerateOptions, ProviderConfig, ProviderKind } from "./types.ts";
import { PROVIDER_PRESETS } from "./factory.ts";

export interface LlmSettings {
  /** 是否启用模型生成（关闭则纯手写剧本） */
  enabled: boolean;
  config: ProviderConfig;
  generation: GenerateOptions;
  /** 缓存上限 */
  cacheSize: number;
  /** 缓存存活时间（毫秒），0 为不过期 */
  cacheTtlMs: number;
  /** 是否流式输出 */
  stream: boolean;
  /** 失败重试次数 */
  retries: number;
  /** 单次生成的节拍数上限，防止模型跑飞 */
  maxBeats: number;
  /** 内容过滤开关（本地模型可能输出越界内容） */
  contentFilter: "off" | "basic";
}

export const DEFAULT_LLM_SETTINGS: LlmSettings = {
  enabled: false,
  config: {
    kind: "ollama",
    baseUrl: PROVIDER_PRESETS.ollama.baseUrl,
    model: PROVIDER_PRESETS.ollama.models[0],
    timeoutMs: 120_000
  },
  generation: {
    temperature: 0.85,
    topP: 0.92,
    topK: 40,
    maxTokens: 1200,
    repeatPenalty: 1.1
  },
  cacheSize: 256,
  cacheTtlMs: 0,
  stream: true,
  retries: 2,
  maxBeats: 12,
  contentFilter: "off"
};

export function applyPreset(s: LlmSettings, kind: ProviderKind): LlmSettings {
  const p = PROVIDER_PRESETS[kind];
  return {
    ...s,
    config: {
      ...s.config,
      kind,
      baseUrl: p.baseUrl,
      model: p.models[0] ?? ""
    }
  };
}

/** 校验设置合法性 */
export function validateSettings(s: LlmSettings): string[] {
  const errs: string[] = [];
  if (s.enabled) {
    if (!s.config.model.trim()) errs.push("未指定模型名");
    if (s.config.kind !== "offline" && !/^https?:\/\//.test(s.config.baseUrl)) {
      errs.push("端点地址需以 http:// 或 https:// 开头");
    }
    if ((s.config.timeoutMs ?? 0) < 1000) errs.push("超时时间至少 1000 毫秒");
  }
  if ((s.generation.temperature ?? 0) < 0 || (s.generation.temperature ?? 0) > 2) {
    errs.push("temperature 应在 0 到 2 之间");
  }
  return errs;
}

/** 供 UI 显示的摘要 */
export function describeSettings(s: LlmSettings): string {
  if (!s.enabled) return "已关闭（仅手写剧本）";
  if (s.config.kind === "offline") return "离线模式";
  return `${PROVIDER_PRESETS[s.config.kind].label} · ${s.config.model} @ ${s.config.baseUrl}`;
}
