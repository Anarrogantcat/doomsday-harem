/**
 * 传输层 —— 通过注入的 fetch 实现，使 core 保持零依赖、可在 Node 与浏览器/WebView 通用。
 */

export interface HttpResponse {
  ok: boolean;
  status: number;
  text(): Promise<string>;
  /** 流式响应体；无流式能力时为 null */
  body(): ReadableStream<Uint8Array> | null;
}

export type FetchLike = (
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  }
) => Promise<HttpResponse>;

/** 默认从全局取 fetch（Node 18+ / 浏览器 / WebView 均可用） */
export function defaultFetch(): FetchLike {
  const f = (globalThis as unknown as { fetch?: unknown }).fetch;
  if (typeof f !== "function") {
    throw new Error("当前环境没有 fetch，请通过 setFetch() 注入实现");
  }
  return f as FetchLike;
}

let current: FetchLike | null = null;

export function setFetch(f: FetchLike): void {
  current = f;
}

export function getFetch(): FetchLike {
  return current ?? defaultFetch();
}

/** 带超时的 JSON 请求 */
export async function postJson<T>(
  url: string,
  body: unknown,
  headers: Record<string, string>,
  timeoutMs: number
): Promise<T> {
  const fetchFn = getFetch();
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetchFn(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: ac.signal
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
    return JSON.parse(text) as T;
  } finally {
    clearTimeout(timer);
  }
}

export async function getJson<T>(
  url: string,
  headers: Record<string, string>,
  timeoutMs: number
): Promise<T> {
  const fetchFn = getFetch();
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetchFn(url, { method: "GET", headers, signal: ac.signal });
    const text = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
    return JSON.parse(text) as T;
  } finally {
    clearTimeout(timer);
  }
}

/** NDJSON / SSE 行读取器 */
export async function* readLines(
  stream: ReadableStream<Uint8Array>
): AsyncGenerator<string, void, unknown> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buf.indexOf("\n")) !== -1) {
        const line = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 1);
        if (line) yield line;
      }
    }
    const tail = buf.trim();
    if (tail) yield tail;
  } finally {
    reader.releaseLock();
  }
}
