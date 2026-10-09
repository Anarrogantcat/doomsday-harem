/**
 * 本地模型接口 —— 类型定义。
 *
 * 设计目标：
 *  1. 剧情文本可由本地模型生成，也可完全离线使用手写剧本（模型是可选增强）
 *  2. 后端可插拔：Ollama / llama.cpp / LM Studio / vLLM / OpenAI 兼容 / 纯离线
 *  3. 流式与非流式统一接口
 *  4. 失败可降级：模型不可用时回退到手写剧本，游戏不中断
 */

export type ProviderKind =
  | "ollama"          // 原生 Ollama API
  | "llamacpp"        // llama.cpp server
  | "lmstudio"        // LM Studio (OpenAI 兼容)
  | "vllm"            // vLLM (OpenAI 兼容)
  | "openai-compat"   // 任意 OpenAI 兼容端点
  | "custom"          // 自定义 HTTP
  | "offline";        // 不调用模型，只用手写剧本

export interface ProviderConfig {
  kind: ProviderKind;
  /** 端点基址，如 http://127.0.0.1:11434 */
  baseUrl: string;
  /** 模型名，如 qwen2.5:14b / llama3.1:8b */
  model: string;
  /** 可选 API key（本地通常为空） */
  apiKey?: string;
  /** 请求超时（毫秒） */
  timeoutMs?: number;
  /** 附加请求头 */
  headers?: Record<string, string>;
}

export type Role = "system" | "user" | "assistant";

export interface ChatMessage {
  role: Role;
  content: string;
}

export interface GenerateOptions {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxTokens?: number;
  stop?: string[];
  seed?: number;
  /** 惩罚重复 */
  repeatPenalty?: number;
  /** 上下文窗口 */
  numCtx?: number;
  /** 是否流式 */
  stream?: boolean;
}

export interface GenerateRequest {
  messages: ChatMessage[];
  options?: GenerateOptions;
}

export interface TokenUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface GenerateResult {
  text: string;
  model: string;
  provider: ProviderKind;
  usage?: TokenUsage;
  /** 是否来自缓存 */
  cached: boolean;
  /** 生成耗时（毫秒） */
  latencyMs: number;
  /** 若非流式，附带结束原因 */
  finishReason?: "stop" | "length" | "error";
}

export interface StreamChunk {
  delta: string;
  done: boolean;
}

export interface ModelStatus {
  available: boolean;
  provider: ProviderKind;
  model: string;
  baseUrl: string;
  /** 探测到的可用模型列表 */
  models?: string[];
  error?: string;
  latencyMs?: number;
}

/** 统一的 Provider 接口 */
export interface LlmProvider {
  readonly kind: ProviderKind;
  readonly model: string;
  readonly baseUrl: string;

  /** 健康探测 */
  probe(): Promise<ModelStatus>;

  /** 列出模型 */
  listModels(): Promise<string[]>;

  /** 非流式生成 */
  generate(req: GenerateRequest): Promise<GenerateResult>;

  /** 流式生成 */
  stream(req: GenerateRequest): AsyncGenerator<StreamChunk, void, unknown>;
}

export class LlmError extends Error {
  readonly provider: ProviderKind;
  readonly status?: number;
  readonly retryable: boolean;

  constructor(provider: ProviderKind, message: string, status?: number, retryable = true) {
    super(message);
    this.name = "LlmError";
    this.provider = provider;
    this.status = status;
    this.retryable = retryable;
  }
}
