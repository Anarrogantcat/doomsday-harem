import { test } from "node:test";
import assert from "node:assert/strict";

import {
  setFetch, type FetchLike, type HttpResponse
} from "../src/transport.ts";
import { LlmCache, cacheKey } from "../src/cache.ts";
import { buildMessages, buildSystemPrompt, parseBeats, classifyLines, extractSpeech } from "../src/prompt.ts";
import { createProvider, PROVIDER_PRESETS } from "../src/factory.ts";
import { Narrator, createNarrator, ensureAvailable } from "../src/narrator.ts";
import { OllamaProvider } from "../src/providers/ollama.ts";
import { OpenAiCompatProvider } from "../src/providers/openai.ts";
import { OfflineProvider } from "../src/providers/offline.ts";
import { DEFAULT_LLM_SETTINGS, applyPreset, validateSettings, describeSettings } from "../src/settings.ts";
import type { ProviderConfig } from "../src/types.ts";

/** ---------- mock 传输层 ---------- */

function jsonRes(obj: unknown, status = 200): HttpResponse {
  const text = JSON.stringify(obj);
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => text,
    body: () => null
  };
}

function streamRes(lines: string[], status = 200): HttpResponse {
  const enc = new TextEncoder();
  const chunks = lines.map((l) => enc.encode(l + "\n"));
  let i = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(c) {
      if (i >= chunks.length) { c.close(); return; }
      c.enqueue(chunks[i++]);
    }
  });
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => lines.join("\n"),
    body: () => stream
  };
}

interface Recorded { url: string; method: string; body: unknown }

function mockFetch(handler: (url: string, init?: { method?: string; body?: string }) => HttpResponse) {
  const calls: Recorded[] = [];
  const f: FetchLike = async (url, init) => {
    let body: unknown = undefined;
    if (init?.body) { try { body = JSON.parse(init.body); } catch { body = init.body; } }
    calls.push({ url, method: init?.method ?? "GET", body });
    return handler(url, init);
  };
  setFetch(f);
  return calls;
}

/** ---------- 传输层 ---------- */

test("transport: 注入的 fetch 被 provider 使用", async () => {
  const calls = mockFetch((url) => {
    if (url.endsWith("/api/version")) return jsonRes({ version: "0.5.0" });
    if (url.endsWith("/api/tags")) return jsonRes({ models: [{ name: "qwen2.5:14b" }] });
    return jsonRes({});
  });
  const p = new OllamaProvider({ kind: "ollama", baseUrl: "http://127.0.0.1:11434", model: "qwen2.5:14b" });
  const st = await p.probe();
  assert.equal(st.available, true);
  assert.deepEqual(st.models, ["qwen2.5:14b"]);
  assert.ok(calls.length >= 2);
});

/** ---------- Ollama ---------- */

test("ollama: 非流式生成解析 content 与 usage", async () => {
  mockFetch(() => jsonRes({
    model: "qwen2.5:14b",
    message: { role: "assistant", content: "她跨坐上来。" },
    done: true,
    prompt_eval_count: 120,
    eval_count: 45
  }));
  const p = new OllamaProvider({ kind: "ollama", baseUrl: "http://127.0.0.1:11434", model: "qwen2.5:14b" });
  const r = await p.generate({ messages: [{ role: "user", content: "写一段" }] });
  assert.equal(r.text, "她跨坐上来。");
  assert.equal(r.provider, "ollama");
  assert.equal(r.usage?.totalTokens, 165);
  assert.equal(r.finishReason, "stop");
});

test("ollama: 流式生成按块产出", async () => {
  mockFetch(() => streamRes([
    JSON.stringify({ message: { content: "她" }, done: false }),
    JSON.stringify({ message: { content: "跨坐" }, done: false }),
    JSON.stringify({ message: { content: "上来。" }, done: false }),
    JSON.stringify({ message: { content: "" }, done: true })
  ]));
  const p = new OllamaProvider({ kind: "ollama", baseUrl: "http://127.0.0.1:11434", model: "qwen2.5:14b" });
  let acc = "";
  for await (const c of p.stream({ messages: [{ role: "user", content: "x" }] })) {
    if (c.delta) acc += c.delta;
  }
  assert.equal(acc, "她跨坐上来。");
});

test("ollama: HTTP 错误抛 LlmError 且带状态码", async () => {
  mockFetch(() => jsonRes({ error: "model not found" }, 404));
  const p = new OllamaProvider({ kind: "ollama", baseUrl: "http://127.0.0.1:11434", model: "nope" });
  await assert.rejects(
    () => p.generate({ messages: [{ role: "user", content: "x" }] }),
    (e: Error) => e.name === "LlmError" && /404/.test(e.message)
  );
});

test("ollama: 探测失败时 available 为 false 并带错误", async () => {
  setFetch(async () => { throw new Error("ECONNREFUSED"); });
  const p = new OllamaProvider({ kind: "ollama", baseUrl: "http://127.0.0.1:11434", model: "x" });
  const st = await p.probe();
  assert.equal(st.available, false);
  assert.match(st.error ?? "", /ECONNREFUSED/);
});

/** ---------- OpenAI 兼容 ---------- */

test("openai 兼容: 非流式与模型列表", async () => {
  mockFetch((url) => {
    if (url.endsWith("/v1/models")) return jsonRes({ data: [{ id: "local-model" }] });
    return jsonRes({
      model: "local-model",
      choices: [{ message: { role: "assistant", content: "文本" }, finish_reason: "stop" }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
    });
  });
  const p = new OpenAiCompatProvider({ kind: "lmstudio", baseUrl: "http://127.0.0.1:1234", model: "local-model" });
  assert.deepEqual(await p.listModels(), ["local-model"]);
  const r = await p.generate({ messages: [{ role: "user", content: "x" }] });
  assert.equal(r.text, "文本");
  assert.equal(r.provider, "lmstudio");
});

test("openai 兼容: SSE 流式解析 data: 行", async () => {
  mockFetch(() => streamRes([
    'data: {"choices":[{"delta":{"content":"第一"}}]}',
    'data: {"choices":[{"delta":{"content":"第二"}}]}',
    "data: [DONE]"
  ]));
  const p = new OpenAiCompatProvider({ kind: "vllm", baseUrl: "http://127.0.0.1:8000", model: "m" });
  let acc = "";
  for await (const c of p.stream({ messages: [{ role: "user", content: "x" }] })) {
    if (c.delta) acc += c.delta;
  }
  assert.equal(acc, "第一第二");
});

test("openai 兼容: 无流式能力时退化为一次性返回", async () => {
  mockFetch(() => jsonRes({
    choices: [{ message: { content: "完整文本" }, finish_reason: "stop" }]
  }));
  const p = new OpenAiCompatProvider({ kind: "llamacpp", baseUrl: "http://127.0.0.1:8080", model: "m" });
  let acc = "";
  for await (const c of p.stream({ messages: [{ role: "user", content: "x" }] })) {
    if (c.delta) acc += c.delta;
  }
  assert.equal(acc, "完整文本");
});

/** ---------- 离线 ---------- */

test("offline: 永远可用且返回空文本", async () => {
  const p = new OfflineProvider();
  assert.equal((await p.probe()).available, true);
  const r = await p.generate({ messages: [{ role: "user", content: "x" }] });
  assert.equal(r.text, "");
  assert.equal(r.provider, "offline");
});

/** ---------- 工厂 ---------- */

test("factory: 各类型映射到正确 provider", () => {
  const cases: Array<[ProviderConfig["kind"], string]> = [
    ["ollama", "ollama"],
    ["lmstudio", "lmstudio"],
    ["vllm", "vllm"],
    ["llamacpp", "llamacpp"],
    ["openai-compat", "openai-compat"],
    ["custom", "custom"],
    ["offline", "offline"]
  ];
  for (const [kind, expect] of cases) {
    const p = createProvider({ kind, baseUrl: "http://127.0.0.1:1", model: "m" });
    assert.equal(p.kind, expect);
  }
});

test("factory: 预置包含 ollama 且端点正确", () => {
  assert.equal(PROVIDER_PRESETS.ollama.baseUrl, "http://127.0.0.1:11434");
  assert.ok(PROVIDER_PRESETS.ollama.models.length > 0);
  assert.equal(PROVIDER_PRESETS.offline.baseUrl, "");
});

/** ---------- 缓存 ---------- */

test("cache: LRU 淘汰与命中计数", () => {
  const c = new LlmCache({ maxEntries: 2 });
  c.set("a", "1", "m");
  c.set("b", "2", "m");
  c.get("a");            // a 变最近
  c.set("c", "3", "m");  // 淘汰 b
  assert.equal(c.size(), 2);
  assert.ok(c.get("a"));
  assert.equal(c.get("b"), null);
  assert.equal(c.get("c")?.text, "3");
  assert.equal(c.stats().totalHits, 3); // a 命中 2 次 + c 命中 1 次
});

test("cache: TTL 过期", async () => {
  const c = new LlmCache({ ttlMs: 20 });
  c.set("k", "v", "m");
  assert.ok(c.get("k"));
  await new Promise((r) => setTimeout(r, 40));
  assert.equal(c.get("k"), null);
});

test("cache: 相同输入生成相同 key，不同则不同", () => {
  const msgs = [{ role: "user", content: "写" }];
  const a = cacheKey("m", msgs, { temperature: 0.8 });
  const b = cacheKey("m", msgs, { temperature: 0.8 });
  const c = cacheKey("m", msgs, { temperature: 0.9 });
  assert.equal(a, b);
  assert.notEqual(a, c);
});

test("cache: 持久化回调被触发", () => {
  let persisted: unknown = null;
  const c = new LlmCache({ onPersist: (e) => { persisted = e; } });
  c.set("k", "v", "m");
  assert.ok(Array.isArray(persisted));
});

/** ---------- 提示词 ---------- */

test("prompt: system 强制四层结构与输出格式", () => {
  const s = buildSystemPrompt();
  assert.equal(s.role, "system");
  assert.match(s.content, /动作层/);
  assert.match(s.content, /感官层/);
  assert.match(s.content, /心理层/);
  assert.match(s.content, /对白层/);
  assert.match(s.content, /---/);
});

test("prompt: system 含说话人规范", () => {
  const s = buildSystemPrompt();
  assert.match(s.content, /角色名「台词内容」/);
  assert.match(s.content, /主角的说话人一律标注为「主角」/);
  assert.match(s.content, /禁止写出没有说话人的台词/);
});

test("prompt: system 含姿势与道具物理约束", () => {
  const s = buildSystemPrompt();
  assert.match(s.content, /双头龙：两端各由一人使用/);
  assert.match(s.content, /不要自行切换体位/);
  assert.match(s.content, /不要凭空出现第三人/);
});

test("prompt: system 含反暴力约束", () => {
  const s = buildSystemPrompt();
  assert.match(s.content, /禁止血腥描写/);
  assert.match(s.content, /禁止暴力伤害/);
  assert.match(s.content, /不是受伤/);
});

test("prompt: system 含角色一致性约束", () => {
  const s = buildSystemPrompt();
  assert.match(s.content, /害羞的角色不会主动扑上去/);
  assert.match(s.content, /不得描写未穿着的衣物/);
  assert.match(s.content, /旁观者/);
});

test("prompt: 场景上下文含性格/着装/定位", () => {
  const msgs = buildMessages({
    sceneId: "s1",
    title: "姐妹同场",
    tone: "姐姐主导",
    participants: [
      {
        name: "姐姐", title: "项目经理", role: "主导方",
        personality: "主动强势", tone: "直接、主动、带压迫感",
        voiceSample: "跟我回房间。",
        relation: "好感 60 / 羁绊 Lv3 / 欲情 92",
        outfit: "围巾 / 工装衬衫 / 牛仔裤", exposure: 6
      }
    ],
    props: ["双头龙"],
    pose: "床沿坐姿",
    beatCount: 2
  });
  const u = msgs[1].content;
  assert.match(u, /主导方/);
  assert.match(u, /主动强势/);
  assert.match(u, /直接、主动、带压迫感/);
  assert.match(u, /语气参考/);
  assert.match(u, /围巾/);
  assert.match(u, /暴露度 6%/);
  assert.match(u, /当前姿势】床沿坐姿/);
  assert.match(u, /生成 2 个节拍/);
});

test("prompt: 台词识别（extractSpeech）", () => {
  assert.deepEqual(extractSpeech("姐姐「别动。」"), { speaker: "姐姐", text: "别动。" });
  assert.deepEqual(extractSpeech("妹妹「我、我不是故意的……」"), { speaker: "妹妹", text: "我、我不是故意的……" });
  assert.equal(extractSpeech("她跨坐上来。"), null);
});

test("prompt: 台词识别支持冒号写法", () => {
  const r = extractSpeech("姐姐：别动。");
  assert.equal(r?.speaker, "姐姐");
});

test("prompt: classifyLines 提取说话人", () => {
  const out = classifyLines("姐姐「别动。」\n她跨坐上来。");
  const speech = out.find((l) => l.layer === "speech");
  assert.equal(speech?.speaker, "姐姐");
  assert.equal(speech?.text, "别动。");
});

test("prompt: 场景上下文含角色关系与道具", () => {
  const msgs = buildMessages({
    sceneId: "s1",
    title: "互相破处",
    tone: "压抑十年的释放",
    participants: [
      { name: "主角", title: "扶她御姐", physiology: "处女" },
      { name: "姐姐", title: "项目经理", relation: "好感 85 / 羁绊 Lv3 / 欲情 92" }
    ],
    props: ["双头龙", "娱乐型扶她药"],
    priorBeats: ["她推倒了你"],
    direction: "姐姐主导",
    time: "第1天 22:00",
    location: "安全屋卧室"
  });
  assert.equal(msgs.length, 2);
  const u = msgs[1].content;
  assert.match(u, /互相破处/);
  assert.match(u, /好感 85/);
  assert.match(u, /双头龙/);
  assert.match(u, /姐姐主导/);
  assert.match(u, /安全屋卧室/);
});

test("prompt: parseBeats 按 --- 切分", () => {
  const beats = parseBeats("第一节\n内容\n---\n第二节\n内容\n---\n第三节");
  assert.equal(beats.length, 3);
  assert.match(beats[1], /第二节/);
});

test("prompt: classifyLines 区分四层", () => {
  const out = classifyLines('你把她按在床沿。\n皮肤很热，呼吸发抖。\n「别动。」\n她想了很久。');
  const layers = out.map((l) => l.layer);
  assert.ok(layers.includes("action"));
  assert.ok(layers.includes("sense"));
  assert.ok(layers.includes("speech"));
  assert.ok(layers.includes("mind"));
});

test("prompt: 整段单行时按句末标点切分", () => {
  const oneLine = "她跨坐上来，扶住你的肩。温热的紧致吞上来，湿滑的阻力卡在中段。「别动。」她想了很久。";
  const out = classifyLines(oneLine);
  const layers = out.map((l) => l.layer);
  assert.ok(layers.includes("action"), "应有动作句");
  assert.ok(layers.includes("sense"), "应有感官句");
  assert.ok(layers.includes("speech"), "应有对白句");
  assert.ok(layers.includes("mind"), "应有心理句");
  assert.ok(out.length >= 4, `应至少 4 段，实际 ${out.length}`);
});

test("prompt: 对白引号内的句号不切句，引号块独立成段", () => {
  const s = "「你以前不是这样的。但我还是想要你。」她低下头。";
  const out = classifyLines(s);
  const speech = out.filter((l) => l.layer === "speech");
  assert.equal(speech.length, 1, "引号块应作为一句台词，内部句号不切分");
  assert.match(speech[0].text, /你以前不是这样的。但我还是想要你。/);
  assert.ok(out.some((l) => /她低下头/.test(l.text)), "后续叙述应保留");
});

test("prompt: 引号前的叙述与台词合并为一条（便于判定说话人）", () => {
  // 这是刻意行为：合并后可用「谁在说话之前做了什么」判定说话人
  const s = "她的膝盖顶住你腰侧，呼吸喷在你耳后。「别动了」";
  const out = classifyLines(s, ["主角", "大学女教师"]);
  const speech = out.find((l) => l.layer === "speech");
  assert.equal(speech?.text, "别动了");
  assert.equal(speech?.speaker, "大学女教师", "应能从叙述主语推断说话人");
});

test("prompt: 纯对白整段归为 speech", () => {
  const out = classifyLines("「别动，让我自己来。」");
  assert.equal(out.length, 1);
  assert.equal(out[0].layer, "speech");
});

test("prompt: 引号占比高时整段归为 speech", () => {
  const out = classifyLines("「我等你这个……等了快十年。」");
  assert.equal(out[0].layer, "speech");
});

test("prompt: 空段落不丢内容", () => {
  const out = classifyLines("   ");
  assert.equal(out.length, 1);
  assert.equal(out[0].layer, "mind");
});

test("prompt: 真实模型输出形态可被分类", () => {
  // 取自实际 qwen3:14b 输出片段
  const real = "你跪在橡木床沿，指尖抵住姐姐被金属扣环锁住的脚踝。她将双头龙项链绕过你脖颈时，银质蛇首擦过喉结的震颤让你吞咽下慌乱的喘息「别...」话音被她猛然拽向膝盖的动作掐断，温热的呼吸拂过你耳后汗湿的皮肤。";
  const out = classifyLines(real);
  assert.ok(out.length >= 2, `应至少切出 2 句，实际 ${out.length}`);
  const layers = new Set(out.map((l) => l.layer));
  assert.ok(layers.size >= 2, "应识别出不止一种层次");
});

/** ---------- Narrator ---------- */

const scriptedScene = {
  id: "fallback",
  title: "兜底剧本",
  participants: ["主角", "姐姐"],
  tone: "手写",
  beats: [{ id: "b1", poseKey: "p", lines: [{ layer: "action" as const, text: "手写内容" }] }]
};

function ctx() {
  return {
    sceneId: "test_scene",
    title: "测试场景",
    tone: "测试",
    participants: [{ name: "主角" }, { name: "姐姐" }]
  };
}

test("narrator: 模型成功时返回 model 来源", async () => {
  mockFetch(() => jsonRes({
    model: "qwen2.5:14b",
    message: { content: "她跨坐上来。\n---\n她坐到底。" },
    done: true
  }));
  const n = createNarrator({ kind: "ollama", baseUrl: "http://127.0.0.1:11434", model: "qwen2.5:14b" });
  const r = await n.narrate(ctx(), scriptedScene);
  assert.equal(r.source, "model");
  assert.equal(r.scene.beats.length, 2);
});

test("narrator: 第二次相同输入命中缓存", async () => {
  const calls = mockFetch(() => jsonRes({
    model: "m",
    message: { content: "文本" },
    done: true
  }));
  const n = createNarrator({ kind: "ollama", baseUrl: "http://127.0.0.1:11434", model: "m" });
  const a = await n.narrate(ctx(), scriptedScene);
  const b = await n.narrate(ctx(), scriptedScene);
  assert.equal(a.source, "model");
  assert.equal(b.source, "cache");
  assert.equal(calls.length, 1);
});

test("narrator: 模型不可用时降级到脚本且不抛错", async () => {
  setFetch(async () => { throw new Error("ECONNREFUSED"); });
  const n = createNarrator(
    { kind: "ollama", baseUrl: "http://127.0.0.1:11434", model: "m" },
    { retries: 0 }
  );
  const r = await n.narrate(ctx(), scriptedScene);
  assert.equal(r.source, "scripted");
  assert.equal(r.scene.beats[0].lines[0].text, "手写内容");
  assert.match(r.error ?? "", /ECONNREFUSED/);
});

test("narrator: 无脚本兜底时向上抛错", async () => {
  setFetch(async () => { throw new Error("down"); });
  const n = createNarrator(
    { kind: "ollama", baseUrl: "http://127.0.0.1:11434", model: "m" },
    { retries: 0 }
  );
  await assert.rejects(() => n.narrate(ctx(), null), (e: Error) => e.name === "LlmError");
});

test("narrator: 重试后成功", async () => {
  let attempt = 0;
  setFetch(async () => {
    attempt++;
    if (attempt === 1) throw new Error("transient");
    return jsonRes({ model: "m", message: { content: "成功" }, done: true });
  });
  const n = createNarrator(
    { kind: "ollama", baseUrl: "http://127.0.0.1:11434", model: "m" },
    { retries: 2, backoffMs: 1 }
  );
  const r = await n.narrate(ctx(), null);
  assert.equal(r.source, "model");
  assert.equal(attempt, 2);
});

test("narrator: 流式回调逐块触发", async () => {
  mockFetch(() => streamRes([
    JSON.stringify({ message: { content: "第一" }, done: false }),
    JSON.stringify({ message: { content: "第二" }, done: true })
  ]));
  const n = createNarrator({ kind: "ollama", baseUrl: "http://127.0.0.1:11434", model: "m" });
  const chunks: string[] = [];
  const r = await n.narrateStream(ctx(), (d) => chunks.push(d), scriptedScene);
  assert.equal(r.source, "model");
  assert.deepEqual(chunks, ["第一", "第二"]);
});

test("narrator: 流式失败降级脚本", async () => {
  setFetch(async () => { throw new Error("stream down"); });
  const n = createNarrator({ kind: "ollama", baseUrl: "http://127.0.0.1:11434", model: "m" });
  const r = await n.narrateStream(ctx(), () => {}, scriptedScene);
  assert.equal(r.source, "scripted");
});

test("narrator: status 反映探测结果", async () => {
  mockFetch((url) => {
    if (url.endsWith("/api/version")) return jsonRes({ version: "1" });
    if (url.endsWith("/api/tags")) return jsonRes({ models: [{ name: "qwen2.5:14b" }] });
    return jsonRes({});
  });
  const n = createNarrator({ kind: "ollama", baseUrl: "http://127.0.0.1:11434", model: "qwen2.5:14b" });
  const st = await n.status();
  assert.equal(st.available, true);
  assert.deepEqual(n.cachedStatus()?.models, ["qwen2.5:14b"]);
});

test("narrator: ensureAvailable 不可用时切到离线", async () => {
  setFetch(async () => { throw new Error("ECONNREFUSED"); });
  const { narrator, status } = await ensureAvailable(
    { kind: "ollama", baseUrl: "http://127.0.0.1:11434", model: "m" },
    true
  );
  assert.equal(status.available, false);
  assert.equal(narrator.getProvider().kind, "offline");
});

test("narrator: 无分隔符时长文本按段落切节拍", async () => {
  mockFetch(() => jsonRes({
    model: "m",
    message: { content: "第一段内容，足够长。\n\n第二段内容，也足够长。\n\n第三段。" },
    done: true
  }));
  const n = createNarrator({ kind: "ollama", baseUrl: "http://127.0.0.1:11434", model: "m" });
  const r = await n.narrate(ctx(), null);
  assert.equal(r.scene.beats.length, 3);
});

/** ---------- 设置 ---------- */

test("settings: 默认关闭，预设可切换", () => {
  assert.equal(DEFAULT_LLM_SETTINGS.enabled, false);
  assert.equal(DEFAULT_LLM_SETTINGS.config.kind, "ollama");
  const s = applyPreset(DEFAULT_LLM_SETTINGS, "lmstudio");
  assert.equal(s.config.kind, "lmstudio");
  assert.equal(s.config.baseUrl, PROVIDER_PRESETS.lmstudio.baseUrl);
});

test("settings: 校验捕捉非法端点与超时", () => {
  assert.equal(validateSettings(DEFAULT_LLM_SETTINGS).length, 0);

  const bad = {
    ...DEFAULT_LLM_SETTINGS,
    enabled: true,
    config: { ...DEFAULT_LLM_SETTINGS.config, baseUrl: "127.0.0.1:11434", timeoutMs: 100 }
  };
  const errs = validateSettings(bad);
  assert.ok(errs.some((e) => /http/.test(e)));
  assert.ok(errs.some((e) => /超时/.test(e)));

  const noModel = {
    ...DEFAULT_LLM_SETTINGS,
    enabled: true,
    config: { ...DEFAULT_LLM_SETTINGS.config, model: "  " }
  };
  assert.ok(validateSettings(noModel).some((e) => /模型名/.test(e)));
});

test("settings: 摘要文本", () => {
  assert.match(describeSettings(DEFAULT_LLM_SETTINGS), /已关闭/);
  const on = { ...DEFAULT_LLM_SETTINGS, enabled: true };
  assert.match(describeSettings(on), /Ollama/);
  const off = applyPreset(on, "offline");
  assert.match(describeSettings(off), /离线/);
});