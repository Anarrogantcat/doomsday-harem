/**
 * 离线 Provider —— 不调用任何模型，始终返回空文本。
 * 用于：模型不可用时的降级目标，使游戏完全依靠手写剧本运行。
 */
import {
  LlmError,
  type GenerateRequest,
  type GenerateResult,
  type LlmProvider,
  type ModelStatus,
  type ProviderConfig,
  type ProviderKind,
  type StreamChunk
} from "../types.ts";

export class OfflineProvider implements LlmProvider {
  readonly kind: ProviderKind = "offline";
  readonly model = "offline";
  readonly baseUrl = "";

  constructor(_cfg?: Partial<ProviderConfig>) {
    void _cfg;
  }

  async probe(): Promise<ModelStatus> {
    return {
      available: true,
      provider: this.kind,
      model: this.model,
      baseUrl: "",
      latencyMs: 0
    };
  }

  async listModels(): Promise<string[]> {
    return [];
  }

  async generate(_req: GenerateRequest): Promise<GenerateResult> {
    return {
      text: "",
      model: this.model,
      provider: this.kind,
      cached: false,
      latencyMs: 0,
      finishReason: "stop"
    };
  }

  async *stream(_req: GenerateRequest): AsyncGenerator<StreamChunk, void, unknown> {
    yield { delta: "", done: true };
  }

  static unavailable(): never {
    throw new LlmError("offline", "离线模式不生成文本");
  }
}
