/**
 * 插件系统 —— 文生图与 TTS 的可插拔接入。
 *
 * 设计定位：
 *  - 游戏本体不绑定任何具体服务，全部通过插件接入
 *  - 插件声明能力（capability），宿主按需调用
 *  - 插件可提供：立绘生成、语音合成、或其他扩展
 *  - 插件失败不影响游戏（降级为程序化立绘 / 静音）
 *
 * 纯函数式，不含 IO。IO 由宿主（桌面端）实现。
 */

// ============ 插件元信息 ============

export type PluginKind =
  | "image"   // 文生图（立绘、场景图）
  | "tts"     // 语音合成
  | "llm"     // 文本生成
  | "other";

export const PLUGIN_KIND_LABEL: Record<PluginKind, string> = {
  image: "文生图",
  tts: "语音合成",
  llm: "文本生成",
  other: "其他"
};

export const PLUGIN_KIND_ICON: Record<PluginKind, string> = {
  image: "▣",
  tts: "♪",
  llm: "✎",
  other: "⚙"
};

/** 插件声明 */
export interface PluginManifest {
  id: string;
  name: string;
  kind: PluginKind;
  version: string;
  /** 提供方（如 ComfyUI / GPT-SoVITS） */
  provider: string;
  description: string;
  /** 服务地址（本地或远程） */
  endpoint: string;
  /** 该插件支持的能力 */
  capabilities: string[];
  /** 默认参数 */
  defaults?: Record<string, unknown>;
}

/** 插件运行状态 */
export type PluginStatus = "unknown" | "online" | "offline" | "error";

export const PLUGIN_STATUS_LABEL: Record<PluginStatus, string> = {
  unknown: "未检测",
  online: "在线",
  offline: "离线",
  error: "异常"
};

export const PLUGIN_STATUS_COLOR: Record<PluginStatus, string> = {
  unknown: "#9aa8bf",
  online: "#0CD71C",
  offline: "#FF0000",
  error: "#E8C815"
};

// ============ 内置插件定义 ============

/**
 * 内置插件预设。
 *
 * 这些只是「如何连」的声明，不含任何调用逻辑 ——
 * 实际请求由桌面端执行。
 */
export const BUILTIN_PLUGINS: PluginManifest[] = [
  {
    id: "comfyui",
    name: "ComfyUI 文生图",
    kind: "image",
    version: "1.0.0",
    provider: "ComfyUI",
    description: "本地 Stable Diffusion / Flux 生成角色立绘与场景图",
    endpoint: "http://127.0.0.1:8188",
    capabilities: [
      "portrait",      // 角色立绘
      "scene",         // 场景插画
      "fullbody",      // 全身像
      "expression"     // 表情差分
    ],
    defaults: {
      width: 512,
      height: 768,
      steps: 24,
      cfg: 7,
      sampler: "dpmpp_2m",
      scheduler: "karras",
      model: "anything-v5-PrtRE.safetensors"
    }
  },
  {
    id: "gpt-sovits",
    name: "GPT-SoVITS 语音合成",
    kind: "tts",
    version: "1.0.0",
    provider: "GPT-SoVITS",
    description: "少样本音色克隆，为每位角色合成专属语音",
    endpoint: "http://127.0.0.1:9880",
    capabilities: ["tts", "voice-clone", "emotion"],
    defaults: {
      refAudioPath: "",
      promptText: "",
      promptLang: "zh",
      textLang: "zh",
      speed: 1.0
    }
  },
  {
    id: "index-tts",
    name: "IndexTTS 语音合成",
    kind: "tts",
    version: "1.0.0",
    provider: "IndexTTS",
    description: "工业级零样本 TTS，中文表现好",
    endpoint: "http://127.0.0.1:7860",
    capabilities: ["tts", "zero-shot"],
    defaults: { speed: 1.0 }
  },
  {
    id: "edge-tts",
    name: "Edge TTS（在线）",
    kind: "tts",
    version: "1.0.0",
    provider: "Microsoft Edge",
    description: "无需本地模型，直接用系统语音，音色较通用",
    endpoint: "system",
    capabilities: ["tts"],
    defaults: { voice: "zh-CN-XiaoxiaoNeural", rate: 1.0 }
  },
  {
    id: "system-tts",
    name: "系统语音合成",
    kind: "tts",
    version: "1.0.0",
    provider: "Windows SAPI",
    description: "使用 Windows 内置语音，零依赖但音质一般",
    endpoint: "system",
    capabilities: ["tts"],
    defaults: { voice: "", rate: 1.0 }
  }
];

export function builtinPlugin(id: string): PluginManifest | undefined {
  return BUILTIN_PLUGINS.find((p) => p.id === id);
}

export function pluginsOfKind(kind: PluginKind): PluginManifest[] {
  return BUILTIN_PLUGINS.filter((p) => p.kind === kind);
}

// ============ 插件配置 ============

export interface PluginConfig {
  /** 插件 id → 是否启用 */
  enabled: Record<string, boolean>;
  /** 插件 id → 自定义参数覆盖 */
  params: Record<string, Record<string, unknown>>;
  /** 当前使用的立绘插件（image 类） */
  activeImagePlugin: string | null;
  /** 当前使用的语音插件（tts 类） */
  activeTtsPlugin: string | null;
  /** 语音总开关 */
  ttsEnabled: boolean;
  /** 语音音量 0-1 */
  ttsVolume: number;
  /** 是否自动朗读台词 */
  autoSpeak: boolean;
  /** 立绘生成总开关 */
  imageEnabled: boolean;
  /** 立绘缓存目录策略 */
  cacheMode: "memory" | "disk";
}

export function defaultPluginConfig(): PluginConfig {
  return {
    enabled: { comfyui: true, "edge-tts": true },
    params: {},
    activeImagePlugin: "comfyui",
    activeTtsPlugin: "edge-tts",
    ttsEnabled: false,
    ttsVolume: 0.8,
    autoSpeak: false,
    imageEnabled: false,
    cacheMode: "disk"
  };
}

/** 合并参数（默认值 + 用户覆盖） */
export function mergedParams(
  manifest: PluginManifest,
  cfg: PluginConfig
): Record<string, unknown> {
  return { ...(manifest.defaults ?? {}), ...(cfg.params[manifest.id] ?? {}) };
}

/** 某插件是否可用（已启用） */
export function isPluginEnabled(cfg: PluginConfig, id: string): boolean {
  return cfg.enabled[id] === true;
}

/** 启用的 image 插件列表 */
export function enabledImagePlugins(cfg: PluginConfig): PluginManifest[] {
  return pluginsOfKind("image").filter((p) => isPluginEnabled(cfg, p.id));
}

/** 启用的 tts 插件列表 */
export function enabledTtsPlugins(cfg: PluginConfig): PluginManifest[] {
  return pluginsOfKind("tts").filter((p) => isPluginEnabled(cfg, p.id));
}

/** 当前生效的插件（考虑总开关） */
export function activePlugin(
  cfg: PluginConfig,
  kind: PluginKind
): PluginManifest | null {
  if (kind === "image") {
    if (!cfg.imageEnabled) return null;
    const id = cfg.activeImagePlugin;
    if (!id || !isPluginEnabled(cfg, id)) return null;
    return builtinPlugin(id) ?? null;
  }
  if (kind === "tts") {
    if (!cfg.ttsEnabled) return null;
    const id = cfg.activeTtsPlugin;
    if (!id || !isPluginEnabled(cfg, id)) return null;
    return builtinPlugin(id) ?? null;
  }
  return null;
}

// ============ 请求构造（供宿主执行）============

/** 立绘生成请求 */
export interface PortraitRequest {
  /** 角色 id */
  companionId: string;
  /** 提示词（正向） */
  prompt: string;
  /** 负向提示词 */
  negative: string;
  width: number;
  height: number;
  seed: number;
  /** 表情/姿态等附加标签 */
  tags: string[];
}

/** 由角色数据构建提示词 */
export function buildPortraitPrompt(opts: {
  name: string;
  build: string;
  cup?: number;
  height: number;
  futanari: boolean;
  pregnant: boolean;
  exposure: number;
  mood: string;
  /** 成熟御姐气质（主角与年长角色） */
  mature?: boolean;
  extra?: string;
}): { prompt: string; negative: string } {
  const parts: string[] = [];

  // 基础质量标签
  parts.push("masterpiece", "best quality", "highly detailed");

  // 风格
  parts.push("anime style", "soft lighting", "portrait");

  // 成熟度：默认成年女性，mature 时强化御姐气质
  if (opts.mature) {
    parts.push(
      "mature female", "adult woman", "onee-san", "ara ara",
      "mature face", "sharp narrow eyes", "defined jawline", "high cheekbones",
      "elegant", "sophisticated", "confident gaze", "commanding presence",
      "adult body", "womanly figure", "mature proportions", "long legs"
    );
  } else {
    parts.push("adult woman", "mature face", "defined features");
  }

  // 体型
  if (opts.height >= 175) parts.push("tall woman", "long legs");
  else if (opts.height >= 165) parts.push("average height woman");
  else parts.push("petite woman");

  if (opts.build.includes("丰腴") || opts.build.includes("丰满") || opts.build.includes("肉")) {
    parts.push("voluptuous body", "curvy figure", "womanly hips");
  } else if (opts.build.includes("纤细") || opts.build.includes("瘦")) {
    parts.push("slender body");
  } else if (opts.build.includes("健") || opts.build.includes("运动") || opts.build.includes("结实")) {
    parts.push("athletic body", "toned physique", "fit body");
  } else if (opts.build.includes("娇小")) {
    parts.push("petite body");
  } else {
    parts.push("normal body");
  }

  // 胸围
  if (opts.cup !== undefined) {
    const cupLabels = ["flat", "very small breasts", "small breasts", "medium breasts",
      "large breasts", "very large breasts", "huge breasts", "gigantic breasts"];
    parts.push(cupLabels[Math.min(7, Math.max(0, opts.cup))]);
  }

  // 怀孕
  if (opts.pregnant) parts.push("pregnant", "swollen belly");

  // 扶她（可选表现）
  if (opts.futanari) parts.push("futanari");

  // 暴露度影响衣着
  if (opts.exposure > 70) parts.push("revealing clothes");
  else if (opts.exposure > 40) parts.push("casual clothes");
  else parts.push("modest clothes", "long sleeves");

  // 表情
  // 情绪映射（支持复合词，按包含匹配）
  const moodRules: Array<[string[], string]> = [
    [["温柔", "亲昵", "宠溺", "柔和", "温暖"], "gentle smile, soft eyes"],
    [["开心", "高兴", "愉悦", "笑"], "happy, smile"],
    [["害羞", "羞", "脸红"], "blushing, embarrassed"],
    [["生气", "怒", "严厉", "不满"], "angry, frown"],
    [["冷淡", "平静", "淡然", "无表情"], "expressionless, calm"],
    [["欲", "媚", "挑逗", "情动"], "aroused, half-closed eyes, blush"],
    [["疲惫", "累", "困", "倦"], "tired, sleepy, half-closed eyes"],
    [["紧张", "慌", "不安", "焦虑"], "nervous, worried"],
    [["悲伤", "难过", "失落", "忧郁"], "sad, melancholy"],
    [["认真", "专注", "严肃"], "serious, focused"],
    [["惊讶", "吃惊"], "surprised, wide eyes"],
    [["害羞带怯", "怯"], "shy, timid"]
  ];

  let moodTag = "neutral expression";
  for (const [keys, tag] of moodRules) {
    if (keys.some((k) => opts.mood.includes(k))) { moodTag = tag; break; }
  }
  parts.push(moodTag);

  // 末日背景
  parts.push("ruined city background", "post-apocalyptic");

  if (opts.extra) parts.push(opts.extra);

  const negative = [
    "lowres", "bad anatomy", "bad hands", "worst quality", "low quality",
    "jpeg artifacts", "watermark", "signature", "text", "error",
    "extra limbs", "missing limbs", "deformed", "blurry",
    // 排除幼态：所有角色都是成年人
    "loli", "child", "childlike", "young girl", "teen", "schoolgirl",
    "baby face", "immature face", "round face", "chubby cheeks",
    "flat chest", "petite frame", "small stature", "short height",
    "oversized eyes", "kawaii", "cute face"
  ].join(", ");

  return { prompt: parts.join(", "), negative };
}

/** TTS 请求 */
export interface TtsRequest {
  /** 说话者角色 id */
  speakerId: string;
  /** 要朗读的文本 */
  text: string;
  /** 情绪（可选） */
  emotion?: string;
  /** 语速倍率 */
  speed?: number;
}

/** 由台词构建 TTS 请求 */
export function buildTtsRequest(opts: {
  speakerId: string;
  text: string;
  tone?: string;
  speed?: number;
}): TtsRequest {
  // 从基调推断情绪
  const toneMap: Array<[RegExp, string]> = [
    [/温柔|亲昵|宠溺|柔和/, "gentle"],
    [/生气|愤怒|严厉|不满/, "angry"],
    [/害羞|羞|脸红/, "shy"],
    [/紧张|慌|不安/, "nervous"],
    [/欲|媚|挑逗|情动/, "aroused"],
    [/冷|淡|平静/, "calm"],
    [/急|催|紧迫/, "urgent"],
    [/悲|伤|难过|失落/, "sad"],
    [/认真|专注|严肃/, "serious"],
    [/惊讶|吃惊/, "surprised"]
  ];

  let emotion: string | undefined;
  for (const [re, e] of toneMap) {
    if (opts.tone && re.test(opts.tone)) { emotion = e; break; }
  }

  return {
    speakerId: opts.speakerId,
    text: opts.text,
    emotion,
    speed: opts.speed ?? 1.0
  };
}

// ============ 角色音色绑定 ============

export interface VoiceBinding {
  companionId: string;
  pluginId: string;
  /** 参考音频路径（音色克隆用） */
  refAudio?: string;
  /** 参考文本 */
  promptText?: string;
  /** 直接指定音色名（如 edge-tts 的 voice） */
  voiceName?: string;
  /** 语速 */
  speed?: number;
  /** 音高微调 */
  pitch?: number;
}

/** 默认音色分配（按角色性格） */
export const DEFAULT_VOICES: VoiceBinding[] = [
  { companionId: "sister", pluginId: "edge-tts", voiceName: "zh-CN-XiaoyiNeural", speed: 1.0 },
  { companionId: "mother", pluginId: "edge-tts", voiceName: "zh-CN-XiaoxiaoNeural", speed: 0.95 },
  { companionId: "sister2", pluginId: "edge-tts", voiceName: "zh-CN-XiaobeiNeural", speed: 1.1 },
  { companionId: "ai", pluginId: "edge-tts", voiceName: "zh-CN-XiaohanNeural", speed: 1.0 },
  { companionId: "teacher", pluginId: "edge-tts", voiceName: "zh-CN-XiaomengNeural", speed: 0.98 },
  { companionId: "nun", pluginId: "edge-tts", voiceName: "zh-CN-XiaoxuanNeural", speed: 0.92 }
];

export function defaultVoiceFor(companionId: string): VoiceBinding {
  return DEFAULT_VOICES.find((v) => v.companionId === companionId) ?? {
    companionId,
    pluginId: "edge-tts",
    voiceName: "zh-CN-XiaoxiaoNeural",
    speed: 1.0
  };
}

// ============ 缓存键 ============

/**
 * 立绘缓存键。
 *
 * 同一角色在同一状态下复用同一张图，
 * 状态变化（怀孕/着装/表情）则生成新图。
 */
export function portraitCacheKey(opts: {
  companionId: string;
  cup?: number;
  pregnant: boolean;
  exposure: number;
  mood: string;
  futanari: boolean;
}): string {
  // 暴露度按 20 分档，避免频繁重生成
  const expBucket = Math.floor(opts.exposure / 20);
  return [
    opts.companionId,
    opts.cup ?? "?",
    opts.pregnant ? "preg" : "norm",
    expBucket,
    opts.mood,
    opts.futanari ? "futa" : "f"
  ].join("_");
}

/** 语音缓存键 */
export function ttsCacheKey(speakerId: string, text: string, emotion?: string): string {
  // 简单哈希（FNV-1a）
  let h = 0x811c9dc5;
  const s = `${speakerId}|${emotion ?? ""}|${text}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `tts_${(h >>> 0).toString(36)}`;
}

// ============ 统计 ============

export function pluginStats(): {
  total: number;
  byKind: Record<string, number>;
  providers: string[];
} {
  const byKind: Record<string, number> = {};
  const providers = new Set<string>();
  for (const p of BUILTIN_PLUGINS) {
    byKind[p.kind] = (byKind[p.kind] ?? 0) + 1;
    providers.add(p.provider);
  }
  return {
    total: BUILTIN_PLUGINS.length,
    byKind,
    providers: [...providers]
  };
}

/** 序列化 */
export function pluginConfigToJSON(c: PluginConfig): PluginConfig {
  return JSON.parse(JSON.stringify(c)) as PluginConfig;
}

export function pluginConfigFromJSON(j: Partial<PluginConfig> | null | undefined): PluginConfig {
  const base = defaultPluginConfig();
  if (!j) return base;
  return {
    ...base,
    ...j,
    enabled: { ...base.enabled, ...(j.enabled ?? {}) },
    params: { ...base.params, ...(j.params ?? {}) }
  };
}
