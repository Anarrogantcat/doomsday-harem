/**
 * Ollama 原生接口。
 *   POST /api/chat      对话（支持 stream）
 *   GET  /api/tags      列出本地模型
 *   GET  /api/version   健康探测
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
import { getFetch, getJson, postJson, readLines } from "../transport.ts";

interface OllamaChatResponse {
  model: string;
  message?: { role: string; content: string };
  response?: string;
  done: boolean;
  prompt_eval_count?: number;
  eval_count?: number;
  done_reason?: string;
}

interface OllamaTagsResponse {
  models?: Array<{ name: string; model?: string }>;
}

export class OllamaProvider implements LlmProvider {
  readonly kind: ProviderKind = "ollama";
  readonly model: string;
  readonly baseUrl: string;
  private cfg: ProviderConfig;

  constructor(cfg: ProviderConfig) {
    this.cfg = cfg;
    this.model = cfg.model;
    this.baseUrl = cfg.baseUrl.replace(/\/$/, "");
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { ...(this.cfg.headers ?? {}) };
    if (this.cfg.apiKey) h["authorization"] = `Bearer ${this.cfg.apiKey}`;
    return h;
  }

  private timeout(): number {
    return this.cfg.timeoutMs ?? 120_000;
  }

  private options(req: GenerateRequest): Record<string, unknown> {
    const o = req.options ?? {};
    const out: Record<string, unknown> = {};
    if (o.temperature !== undefined) out.temperature = o.temperature;
    if (o.topP !== undefined) out.top_p = o.topP;
    if (o.topK !== undefined) out.top_k = o.topK;
    if (o.maxTokens !== undefined) out.num_predict = o.maxTokens;
    if (o.numCtx !== undefined) out.num_ctx = o.numCtx;
    if (o.seed !== undefined) out.seed = o.seed;
    if (o.repeatPenalty !== undefined) out.repeat_penalty = o.repeatPenalty;
    if (o.stop) out.stop = o.stop;
    return out;
  }

  async probe(): Promise<ModelStatus> {
    const t0 = Date.now();
    try {
      await getJson<{ version: string }>(`${this.baseUrl}/api/version`, this.headers(), 5000);
      const models = await this.listModels();
      return {
        available: true,
        provider: this.kind,
        model: this.model,
        baseUrl: this.baseUrl,
        models,
        latencyMs: Date.now() - t0
      };
    } catch (e) {
      return {
        available: false,
        provider: this.kind,
        model: this.model,
        baseUrl: this.baseUrl,
        error: e instanceof Error ? e.message : String(e),
        latencyMs: Date.now() - t0
      };
    }
  }

  async listModels(): Promise<string[]> {
    const res = await getJson<OllamaTagsResponse>(`${this.baseUrl}/api/tags`, this.headers(), 8000);
    return (res.models ?? []).map((m) => m.name ?? m.model ?? "").filter(Boolean);
  }

  async generate(req: GenerateRequest): Promise<GenerateResult> {
    const t0 = Date.now();
    try {
      const body = {
        model: this.model,
        messages: req.messages,
        stream: false,
        options: this.options(req)
      };
      const res = await postJson<OllamaChatResponse>(
        `${this.baseUrl}/api/chat`,
        body,
        this.headers(),
        this.timeout()
      );
      return {
        text: res.message?.content ?? res.response ?? "",
        model: res.model ?? this.model,
        provider: this.kind,
        cached: false,
        latencyMs: Date.now() - t0,
        finishReason: res.done_reason === "length" ? "length" : "stop",
        usage: {
          promptTokens: res.prompt_eval_count,
          completionTokens: res.eval_count,
          totalTokens: (res.prompt_eval_count ?? 0) + (res.eval_count ?? 0)
        }
      };
    } catch (e) {
      throw new LlmError(this.kind, e instanceof Error ? e.message : String(e));
    }
  }

  async *stream(req: GenerateRequest): AsyncGenerator<StreamChunk, void, unknown> {
    const fetchFn = getFetch();
    const res = await fetchFn(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json", ...this.headers() },
      body: JSON.stringify({
        model: this.model,
        messages: req.messages,
        stream: true,
        options: this.options(req)
      })
    });
    if (!res.ok) {
      const t = await res.text();
      throw new LlmError(this.kind, `HTTP ${res.status}: ${t.slice(0, 300)}`, res.status);
    }
    const body = res.body();
    if (!body) {
      // 无流式能力，退化为一次性
      const r = await this.generate(req);
      yield { delta: r.text, done: true };
      return;
    }
    for await (const line of readLines(body)) {
      try {
        const j = JSON.parse(line) as OllamaChatResponse;
        const delta = j.message?.content ?? j.response ?? "";
        if (delta) yield { delta, done: false };
        if (j.done) {
          yield { delta: "", done: true };
          return;
        }
      } catch {
        // 忽略无法解析的行
      }
    }
    yield { delta: "", done: true };
  }
}
