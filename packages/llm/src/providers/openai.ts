/**
 * OpenAI 兼容接口 —— 覆盖 LM Studio / vLLM / llama.cpp server / LocalAI / 任意兼容端点。
 *   POST /v1/chat/completions
 *   GET  /v1/models
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

interface OaiChoice {
  message?: { role: string; content: string };
  delta?: { content?: string };
  finish_reason?: string | null;
}

interface OaiResponse {
  model?: string;
  choices?: OaiChoice[];
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

interface OaiModels {
  data?: Array<{ id: string }>;
}

export class OpenAiCompatProvider implements LlmProvider {
  readonly kind: ProviderKind;
  readonly model: string;
  readonly baseUrl: string;
  private cfg: ProviderConfig;

  constructor(cfg: ProviderConfig) {
    this.cfg = cfg;
    this.kind = cfg.kind;
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

  private payload(req: GenerateRequest, stream: boolean): Record<string, unknown> {
    const o = req.options ?? {};
    const body: Record<string, unknown> = {
      model: this.model,
      messages: req.messages,
      stream
    };
    if (o.temperature !== undefined) body.temperature = o.temperature;
    if (o.topP !== undefined) body.top_p = o.topP;
    if (o.maxTokens !== undefined) body.max_tokens = o.maxTokens;
    if (o.stop) body.stop = o.stop;
    if (o.seed !== undefined) body.seed = o.seed;
    return body;
  }

  async probe(): Promise<ModelStatus> {
    const t0 = Date.now();
    try {
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
    const res = await getJson<OaiModels>(`${this.baseUrl}/v1/models`, this.headers(), 8000);
    return (res.data ?? []).map((m) => m.id);
  }

  async generate(req: GenerateRequest): Promise<GenerateResult> {
    const t0 = Date.now();
    try {
      const res = await postJson<OaiResponse>(
        `${this.baseUrl}/v1/chat/completions`,
        this.payload(req, false),
        this.headers(),
        this.timeout()
      );
      const choice = res.choices?.[0];
      return {
        text: choice?.message?.content ?? "",
        model: res.model ?? this.model,
        provider: this.kind,
        cached: false,
        latencyMs: Date.now() - t0,
        finishReason: choice?.finish_reason === "length" ? "length" : "stop",
        usage: {
          promptTokens: res.usage?.prompt_tokens,
          completionTokens: res.usage?.completion_tokens,
          totalTokens: res.usage?.total_tokens
        }
      };
    } catch (e) {
      throw new LlmError(this.kind, e instanceof Error ? e.message : String(e));
    }
  }

  async *stream(req: GenerateRequest): AsyncGenerator<StreamChunk, void, unknown> {
    const fetchFn = getFetch();
    const res = await fetchFn(`${this.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", ...this.headers() },
      body: JSON.stringify(this.payload(req, true))
    });
    if (!res.ok) {
      const t = await res.text();
      throw new LlmError(this.kind, `HTTP ${res.status}: ${t.slice(0, 300)}`, res.status);
    }
    const body = res.body();
    if (!body) {
      const r = await this.generate(req);
      yield { delta: r.text, done: true };
      return;
    }
    for await (const line of readLines(body)) {
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") {
        yield { delta: "", done: true };
        return;
      }
      try {
        const j = JSON.parse(data) as OaiResponse;
        const delta = j.choices?.[0]?.delta?.content ?? "";
        if (delta) yield { delta, done: false };
      } catch {
        // 忽略
      }
    }
    yield { delta: "", done: true };
  }
}
