import type { LlmProvider, ProviderConfig, ProviderKind } from "./types.ts";
import { OllamaProvider } from "./providers/ollama.ts";
import { OpenAiCompatProvider } from "./providers/openai.ts";
import { OfflineProvider } from "./providers/offline.ts";

export function createProvider(cfg: ProviderConfig): LlmProvider {
  switch (cfg.kind) {
    case "ollama":
      return new OllamaProvider(cfg);
    case "lmstudio":
    case "vllm":
    case "llamacpp":
    case "openai-compat":
    case "custom":
      return new OpenAiCompatProvider(cfg);
    case "offline":
      return new OfflineProvider(cfg);
    default: {
      const never: never = cfg.kind;
      throw new Error(`未知的 Provider 类型：${String(never)}`);
    }
  }
}

/** 各后端的默认端点与常用模型，用于设置界面的预填 */
export const PROVIDER_PRESETS: Record<ProviderKind, { baseUrl: string; models: string[]; label: string }> = {
  ollama: {
    baseUrl: "http://127.0.0.1:11434",
    models: ["qwen2.5:14b", "qwen2.5:7b", "llama3.1:8b", "mistral-nemo:12b", "gemma2:9b"],
    label: "Ollama"
  },
  lmstudio: {
    baseUrl: "http://127.0.0.1:1234",
    models: ["local-model"],
    label: "LM Studio"
  },
  vllm: {
    baseUrl: "http://127.0.0.1:8000",
    models: ["Qwen/Qwen2.5-14B-Instruct"],
    label: "vLLM"
  },
  llamacpp: {
    baseUrl: "http://127.0.0.1:8080",
    models: ["local-model"],
    label: "llama.cpp server"
  },
  "openai-compat": {
    baseUrl: "http://127.0.0.1:8080",
    models: ["local-model"],
    label: "OpenAI 兼容端点"
  },
  custom: {
    baseUrl: "http://127.0.0.1:8080",
    models: ["local-model"],
    label: "自定义"
  },
  offline: {
    baseUrl: "",
    models: [],
    label: "离线（仅手写剧本）"
  }
};
