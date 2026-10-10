import { test } from "node:test";
import assert from "node:assert/strict";

import {
  BUILTIN_PLUGINS, PLUGIN_KIND_LABEL, PLUGIN_KIND_ICON,
  PLUGIN_STATUS_LABEL, PLUGIN_STATUS_COLOR,
  builtinPlugin, pluginsOfKind, defaultPluginConfig, mergedParams,
  isPluginEnabled, enabledImagePlugins, enabledTtsPlugins, activePlugin,
  buildPortraitPrompt, buildTtsRequest, defaultVoiceFor, DEFAULT_VOICES,
  portraitCacheKey, ttsCacheKey, pluginStats,
  pluginConfigToJSON, pluginConfigFromJSON,
  type PluginKind
} from "../src/systems/plugins.ts";

// ============ 目录 ============

test("plugin: 内置插件齐备", () => {
  assert.ok(BUILTIN_PLUGINS.length >= 5, `应有 5+ 插件，实际 ${BUILTIN_PLUGINS.length}`);
  const ids = new Set(BUILTIN_PLUGINS.map((p) => p.id));
  assert.equal(ids.size, BUILTIN_PLUGINS.length, "id 应唯一");
});

test("plugin: 字段完整", () => {
  for (const p of BUILTIN_PLUGINS) {
    assert.ok(p.name.length > 0, `${p.id} 缺名称`);
    assert.ok(p.description.length > 0, `${p.id} 缺说明`);
    assert.ok(p.provider.length > 0);
    assert.ok(p.endpoint.length > 0);
    assert.ok(p.capabilities.length > 0, `${p.id} 缺能力声明`);
    assert.ok(PLUGIN_KIND_LABEL[p.kind], `${p.id} kind 无效`);
  }
});

test("plugin: 有文生图与语音两类", () => {
  assert.ok(pluginsOfKind("image").length >= 1);
  assert.ok(pluginsOfKind("tts").length >= 2);
});

test("plugin: 按 id 查询", () => {
  assert.ok(builtinPlugin("comfyui"));
  assert.ok(builtinPlugin("edge-tts"));
  assert.equal(builtinPlugin("nonexistent"), undefined);
});

test("plugin: 图标与状态齐备", () => {
  for (const k of ["image", "tts", "llm", "other"] as PluginKind[]) {
    assert.ok(PLUGIN_KIND_LABEL[k]);
    assert.ok(PLUGIN_KIND_ICON[k]);
  }
  for (const s of ["unknown", "online", "offline", "error"] as const) {
    assert.ok(PLUGIN_STATUS_LABEL[s]);
    assert.ok(PLUGIN_STATUS_COLOR[s]);
  }
});

test("plugin: 统计", () => {
  const s = pluginStats();
  assert.equal(s.total, BUILTIN_PLUGINS.length);
  assert.ok(s.byKind.image >= 1);
  assert.ok(s.byKind.tts >= 2);
  assert.ok(s.providers.length >= 3);
});

// ============ 配置 ============

test("plugin: 默认配置", () => {
  const c = defaultPluginConfig();
  assert.equal(c.ttsEnabled, false, "语音默认关闭");
  assert.equal(c.imageEnabled, false, "文生图默认关闭");
  assert.equal(c.activeImagePlugin, "comfyui");
  assert.equal(c.activeTtsPlugin, "edge-tts");
  assert.ok(c.ttsVolume > 0 && c.ttsVolume <= 1);
});

test("plugin: 参数合并", () => {
  const p = builtinPlugin("comfyui")!;
  const c = defaultPluginConfig();
  const merged = mergedParams(p, c);
  assert.equal(merged.width, 512);
  assert.equal(merged.model, "anything-v5-PrtRE.safetensors");

  // 用户覆盖
  const c2 = { ...c, params: { comfyui: { width: 768 } } };
  const merged2 = mergedParams(p, c2);
  assert.equal(merged2.width, 768);
  assert.equal(merged2.height, 768, "未覆盖的保持默认");
});

test("plugin: 启用判定", () => {
  const c = defaultPluginConfig();
  assert.equal(isPluginEnabled(c, "comfyui"), true);
  assert.equal(isPluginEnabled(c, "gpt-sovits"), false);
});

test("plugin: 列表筛选", () => {
  const c = defaultPluginConfig();
  assert.ok(enabledImagePlugins(c).some((p) => p.id === "comfyui"));
  assert.ok(enabledTtsPlugins(c).some((p) => p.id === "edge-tts"));
});

test("plugin: 总开关关闭时无生效插件", () => {
  const c = defaultPluginConfig();
  assert.equal(activePlugin(c, "image"), null, "imageEnabled=false 应返回 null");
  assert.equal(activePlugin(c, "tts"), null, "ttsEnabled=false 应返回 null");

  const on = { ...c, imageEnabled: true };
  assert.ok(activePlugin(on, "image"));
});

test("plugin: 插件未启用时不算生效", () => {
  const c = { ...defaultPluginConfig(), imageEnabled: true, enabled: {} };
  assert.equal(activePlugin(c, "image"), null);
});

test("plugin: 序列化往返", () => {
  const c = defaultPluginConfig();
  c.ttsEnabled = true;
  c.params = { comfyui: { steps: 30 } };

  const json = pluginConfigToJSON(c);
  const back = pluginConfigFromJSON(json);
  assert.equal(back.ttsEnabled, true);
  assert.equal(back.params.comfyui.steps, 30);
});

test("plugin: 空数据返回默认", () => {
  const c = pluginConfigFromJSON(null);
  assert.equal(c.ttsEnabled, false);
  assert.ok(c.enabled.comfyui);
});

// ============ 提示词构建 ============

test("prompt: 基本结构", () => {
  const { prompt, negative } = buildPortraitPrompt({
    name: "姐姐", build: "高挑丰满", cup: 4, height: 174,
    futanari: false, pregnant: false, exposure: 30, mood: "温柔"
  });
  assert.ok(prompt.includes("masterpiece"));
  assert.ok(prompt.includes("anime style"));
  assert.ok(prompt.includes("large breasts"), "罩杯 4 应对应 large breasts");
  assert.ok(negative.includes("lowres"));
});

test("prompt: 身高影响体型标签", () => {
  const tall = buildPortraitPrompt({
    name: "A", build: "", height: 180, futanari: false,
    pregnant: false, exposure: 30, mood: "平静"
  });
  const short = buildPortraitPrompt({
    name: "B", build: "", height: 155, futanari: false,
    pregnant: false, exposure: 30, mood: "平静"
  });
  assert.ok(tall.prompt.includes("tall woman"));
  assert.ok(short.prompt.includes("petite woman"));
});

test("prompt: 罩杯分档", () => {
  for (let cup = 0; cup <= 7; cup++) {
    const r = buildPortraitPrompt({
      name: "X", build: "", height: 165, cup, futanari: false,
      pregnant: false, exposure: 30, mood: "平静"
    });
    assert.ok(r.prompt.length > 0, `cup ${cup} 应产生提示词`);
  }
});

test("prompt: 怀孕标签", () => {
  const r = buildPortraitPrompt({
    name: "X", build: "", height: 165, futanari: false,
    pregnant: true, exposure: 30, mood: "平静"
  });
  assert.ok(r.prompt.includes("pregnant"));
  assert.ok(r.prompt.includes("swollen belly"));
});

test("prompt: 扶她标签", () => {
  const r = buildPortraitPrompt({
    name: "X", build: "", height: 178, futanari: true,
    pregnant: false, exposure: 30, mood: "平静"
  });
  assert.ok(r.prompt.includes("futanari"));
});

test("prompt: 暴露度影响着装", () => {
  const low = buildPortraitPrompt({
    name: "X", build: "", height: 165, futanari: false,
    pregnant: false, exposure: 10, mood: "平静"
  });
  const high = buildPortraitPrompt({
    name: "X", build: "", height: 165, futanari: false,
    pregnant: false, exposure: 90, mood: "平静"
  });
  assert.ok(low.prompt.includes("modest"));
  assert.ok(high.prompt.includes("revealing"));
});

test("prompt: 情绪映射（含复合词）", () => {
  const cases: Array<[string, string]> = [
    ["温柔", "gentle"],
    ["害羞", "blushing"],
    ["生气", "angry"],
    ["欲情", "aroused"],
    ["紧张", "nervous"],
    ["疲惫", "tired"]
  ];
  for (const [mood, expect] of cases) {
    const r = buildPortraitPrompt({
      name: "X", build: "", height: 165, futanari: false,
      pregnant: false, exposure: 30, mood
    });
    assert.ok(r.prompt.includes(expect), `${mood} 应映射到 ${expect}，实际: ${r.prompt}`);
  }
});

test("prompt: 未知情绪回退中性", () => {
  const r = buildPortraitPrompt({
    name: "X", build: "", height: 165, futanari: false,
    pregnant: false, exposure: 30, mood: "某个没定义的词"
  });
  assert.ok(r.prompt.includes("neutral"));
});

// ============ TTS ============

test("tts: 请求构建", () => {
  const r = buildTtsRequest({ speakerId: "sister", text: "别动。", tone: "温柔" });
  assert.equal(r.speakerId, "sister");
  assert.equal(r.text, "别动。");
  assert.equal(r.emotion, "gentle");
});

test("tts: 无基调时无情绪", () => {
  const r = buildTtsRequest({ speakerId: "x", text: "hi" });
  assert.equal(r.emotion, undefined);
});

test("tts: 语速可指定", () => {
  const r = buildTtsRequest({ speakerId: "x", text: "hi", speed: 1.3 });
  assert.equal(r.speed, 1.3);
});

test("tts: 默认音色分配", () => {
  assert.ok(DEFAULT_VOICES.length >= 5);
  const v = defaultVoiceFor("sister");
  assert.equal(v.companionId, "sister");
  assert.ok(v.voiceName);
  assert.ok(v.pluginId);
});

test("tts: 未知角色有兜底音色", () => {
  const v = defaultVoiceFor("nobody");
  assert.ok(v.voiceName);
  assert.ok(v.pluginId);
});

// ============ 缓存键 ============

test("cache: 立绘键稳定", () => {
  const a = portraitCacheKey({ companionId: "sister", cup: 4, pregnant: false, exposure: 30, mood: "温柔", futanari: false });
  const b = portraitCacheKey({ companionId: "sister", cup: 4, pregnant: false, exposure: 30, mood: "温柔", futanari: false });
  assert.equal(a, b);
});

test("cache: 状态变化产生新键", () => {
  const base = { companionId: "sister", cup: 4, pregnant: false, exposure: 30, mood: "温柔", futanari: false };
  const k1 = portraitCacheKey(base);
  const k2 = portraitCacheKey({ ...base, pregnant: true });
  const k3 = portraitCacheKey({ ...base, mood: "生气" });
  assert.notEqual(k1, k2);
  assert.notEqual(k1, k3);
});

test("cache: 暴露度分档避免频繁重生成", () => {
  const base = { companionId: "s", cup: 3, pregnant: false, mood: "平静", futanari: false };
  const a = portraitCacheKey({ ...base, exposure: 21 });
  const b = portraitCacheKey({ ...base, exposure: 39 });
  assert.equal(a, b, "同档内应复用");

  const c = portraitCacheKey({ ...base, exposure: 41 });
  assert.notEqual(a, c, "跨档应换图");
});

test("cache: 语音键稳定且区分内容", () => {
  const a = ttsCacheKey("sister", "别动。");
  const b = ttsCacheKey("sister", "别动。");
  const c = ttsCacheKey("sister", "过来。");
  assert.equal(a, b);
  assert.notEqual(a, c);
});

test("cache: 语音键区分说话者", () => {
  const a = ttsCacheKey("sister", "别动。");
  const b = ttsCacheKey("mother", "别动。");
  assert.notEqual(a, b);
});

// ============ 成熟度（御姐化） ============

test("prompt: mature 注入御姐标签", () => {
  const r = buildPortraitPrompt({
    name: "主角", build: "高挑健硕", cup: 4, height: 178,
    futanari: true, pregnant: false, exposure: 25, mood: "平静",
    mature: true
  });
  assert.ok(r.prompt.includes("mature female"), "应含 mature female");
  assert.ok(r.prompt.includes("onee-san"), "应含 onee-san");
  assert.ok(r.prompt.includes("defined jawline"), "应有下颌线");
  assert.ok(r.prompt.includes("sharp narrow eyes"), "应有狭长眼");
});

test("prompt: 非 mature 也有成年标签", () => {
  const r = buildPortraitPrompt({
    name: "妹妹", build: "娇小纤细", cup: 1, height: 162,
    futanari: false, pregnant: false, exposure: 30, mood: "开心"
  });
  assert.ok(r.prompt.includes("adult woman"), "所有角色都是成年人");
  assert.ok(!r.prompt.includes("onee-san"), "非成熟角色不注入御姐标签");
});

test("prompt: 负向排除幼态", () => {
  const r = buildPortraitPrompt({
    name: "X", build: "", height: 165, futanari: false,
    pregnant: false, exposure: 30, mood: "平静"
  });
  for (const bad of ["loli", "child", "baby face", "schoolgirl", "cute face"]) {
    assert.ok(r.negative.includes(bad), `负向应含 ${bad}`);
  }
});

test("prompt: 丰腴体型映射为成熟曲线", () => {
  const r = buildPortraitPrompt({
    name: "母亲", build: "成熟丰腴型", cup: 3, height: 172,
    futanari: false, pregnant: false, exposure: 30, mood: "温柔",
    mature: true
  });
  assert.ok(r.prompt.includes("voluptuous") || r.prompt.includes("curvy"),
    "丰腴应映射为 voluptuous/curvy");
});
