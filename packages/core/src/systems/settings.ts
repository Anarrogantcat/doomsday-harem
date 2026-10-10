/**
 * 设置系统。
 *
 * 分类：
 *  - display  显示（画风、详细度、标签、字号）
 *  - gameplay 玩法（时间流速、自动存档、难度辅助）
 *  - content  内容（成人内容开关与强度、生成范围）
 *  - audio    音频（四通道音量）
 *  - lang     语言
 *  - cheat    作弊
 *  - about    关于（版本、更新、声明）
 *
 * 纯函数式；持久化由宿主环境负责。
 */
import type { DetailLevel } from "../text/engine.ts";
import type { Locale } from "../i18n/index.ts";
import type { AudioChannel } from "../audio/index.ts";
import type { GenerationMode } from "./sceneTier.ts";

export type SettingsTab =
  | "display" | "gameplay" | "content" | "audio" | "lang" | "cheat" | "sharing" | "about";

export const SETTINGS_TAB_LABEL: Record<SettingsTab, string> = {
  display: "显示",
  gameplay: "玩法",
  content: "内容",
  audio: "音频",
  lang: "语言",
  cheat: "作弊",
  sharing: "加成共享",
  about: "关于"
};

export const SETTINGS_TAB_ICON: Record<SettingsTab, string> = {
  display: "▤",
  gameplay: "◈",
  content: "♥",
  audio: "≈",
  lang: "文",
  cheat: "⌘",
  sharing: "⇄",
  about: "ⓘ"
};

/** 画面风格 */
export type RenderStyle = "text" | "pixel" | "illustration" | "live2d";

export const RENDER_STYLE_LABEL: Record<RenderStyle, string> = {
  text: "纯文字",
  pixel: "像素",
  illustration: "插画",
  live2d: "Live2D"
};

export const RENDER_STYLE_DESC: Record<RenderStyle, string> = {
  text: "只有文字，性能最好",
  pixel: "像素画面（当前可用）",
  illustration: "插画立绘（需素材）",
  live2d: "动态立绘（需素材）"
};

/** 内容强度 */
export type ContentIntensity = "tasteful" | "explicit" | "unrestrained";

export const INTENSITY_LABEL: Record<ContentIntensity, string> = {
  tasteful: "含蓄",
  explicit: "露骨（默认）",
  unrestrained: "无保留"
};

export const INTENSITY_DESC: Record<ContentIntensity, string> = {
  tasteful: "侧重情感与氛围，身体描写点到为止",
  explicit: "完整身体描写，四层结构齐全",
  unrestrained: "不加修饰的详细描写，不回避任何细节"
};

/** 时间流速（每次操作推进的分钟数倍率） */
export type TimeScale = "slow" | "normal" | "fast";

export const TIME_SCALE_LABEL: Record<TimeScale, string> = {
  slow: "慢（×0.5）",
  normal: "正常（×1）",
  fast: "快（×2）"
};

export const TIME_SCALE_VALUE: Record<TimeScale, number> = {
  slow: 0.5,
  normal: 1,
  fast: 2
};

export interface DisplaySettings {
  renderStyle: RenderStyle;
  detail: DetailLevel;
  showLayerTags: boolean;
  fontSize: number;
  showPortrait: boolean;
  showStatusBar: boolean;
  animation: boolean;
}

export interface GameplaySettings {
  timeScale: TimeScale;
  autoSave: boolean;
  autoSaveIntervalDays: number;
  confirmDangerous: boolean;
  showTooltips: boolean;
  compactRoster: boolean;
}

export interface ContentSettings {
  adultEnabled: boolean;
  intensity: ContentIntensity;
  generationMode: GenerationMode;
  /** 是否在场景中显示「可用本地模型生成」按钮 */
  showGenerateButton: boolean;
  /** 后宫互交场景是否启用 */
  haremInteraction: boolean;
  /** 是否显示怀孕相关提示 */
  pregnancyHints: boolean;
}

export interface AudioSettingsUI {
  master: number;
  channels: Record<AudioChannel, number>;
  muted: Record<AudioChannel, boolean>;
  crossfadeMs: number;
}

export interface CheatSettingsUI {
  enabled: boolean;
  console: boolean;
  recordAchievements: boolean;
  markSave: boolean;
}

export interface LangSettings {
  locale: Locale;
}

export interface Settings {
  display: DisplaySettings;
  gameplay: GameplaySettings;
  content: ContentSettings;
  audio: AudioSettingsUI;
  lang: LangSettings;
  cheat: CheatSettingsUI;
  /** 玩家是否已确认过成人内容声明 */
  adultAcknowledged: boolean;
  /** 是否检查过更新 */
  lastUpdateCheck: string | null;
  /** 跳过更新检查 */
  skipUpdateCheck: boolean;
}

export function defaultSettings(): Settings {
  return {
    display: {
      renderStyle: "pixel",
      detail: "detailed",
      showLayerTags: false,
      fontSize: 14,
      showPortrait: true,
      showStatusBar: true,
      animation: true
    },
    gameplay: {
      timeScale: "normal",
      autoSave: true,
      autoSaveIntervalDays: 3,
      confirmDangerous: true,
      showTooltips: true,
      compactRoster: false
    },
    content: {
      adultEnabled: true,
      intensity: "explicit",
      generationMode: "minor",
      showGenerateButton: true,
      haremInteraction: true,
      pregnancyHints: true
    },
    audio: {
      master: 0.7,
      channels: { bgm: 0.6, ambient: 0.4, sfx: 0.8, voice: 1 },
      muted: { bgm: false, ambient: false, sfx: false, voice: false },
      crossfadeMs: 800
    },
    lang: { locale: "zh-CN" },
    cheat: { enabled: false, console: false, recordAchievements: true, markSave: true },
    adultAcknowledged: false,
    lastUpdateCheck: null,
    skipUpdateCheck: false
  };
}

/** 局部更新某个分类 */
export function patchSettings<S extends Settings>(s: Settings, patch: Partial<S>): Settings {
  return { ...s, ...patch };
}

export function patchDisplay(s: Settings, p: Partial<DisplaySettings>): Settings {
  return { ...s, display: { ...s.display, ...p } };
}

export function patchGameplay(s: Settings, p: Partial<GameplaySettings>): Settings {
  return { ...s, gameplay: { ...s.gameplay, ...p } };
}

export function patchContent(s: Settings, p: Partial<ContentSettings>): Settings {
  return { ...s, content: { ...s.content, ...p } };
}

export function patchAudio(s: Settings, p: Partial<AudioSettingsUI>): Settings {
  return { ...s, audio: { ...s.audio, ...p } };
}

export function patchCheat(s: Settings, p: Partial<CheatSettingsUI>): Settings {
  return { ...s, cheat: { ...s.cheat, ...p } };
}

export function patchLang(s: Settings, p: Partial<LangSettings>): Settings {
  return { ...s, lang: { ...s.lang, ...p } };
}

// ============ 关于 ============

export interface AboutInfo {
  name: string;
  tagline: string;
  version: string;
  buildDate: string;
  engine: string;
  license: string;
  repository: string;
}

export const ABOUT: AboutInfo = {
  name: "末日生存·后宫",
  tagline: "Doomsday Harem",
  version: "0.27.0",
  buildDate: "2026-10",
  engine: "TypeScript + Tauri 2 + React 18",
  license: "个人非商业使用",
  repository: ""
};

/** 游戏介绍段落 */
export const ABOUT_INTRO: string[] = [
  "你是这世上唯一知道末日何时到来的人。",
  "没有理由，没有解释 —— 预知能力在某天清晨毫无征兆地苏醒。你看见了三十天后的一切：城市陷落、秩序崩解、活人比死人更危险。",
  "于是你开始准备。先写下一个能自主思考的特殊 AI，让它替你处理那些不能留下痕迹的事；再在城郊建起一间看起来毫不起眼的现代安全屋，配上武装房车；而真正的避难所，藏在山体深处。",
  "你还把三个人接了过来 —— 母亲、姐姐、妹妹。她们不知道你在做什么，只知道你突然变得很奇怪。",
  "三十天后，末日如期而至。",
  "现在，你带着 21 位后宫，在这片废墟上活下去。"
];

/** 玩法要点 */
export const ABOUT_FEATURES: Array<{ title: string; body: string }> = [
  {
    title: "科技树与建造",
    body: "8 条科技分支、127 个节点。所有身体强化只作用于主角，来自科技与基地建设 —— 没有任何超自然来源。"
  },
  {
    title: "山体要塞",
    body: "三层结构：地表是伪装成普通民居的安全屋，山内是真正的避难所，深层是资源层。45 座设施可建造。"
  },
  {
    title: "21 位后宫",
    body: "9 种性格，各有说话风格与行为边界。关系只升不降，拒绝不扣好感，夜袭没有拒绝选项。"
  },
  {
    title: "文字驱动",
    body: "四层结构描写（动作/感官/心理/对白），四档详细度。像素画面是可选的装饰层，可完全关闭。"
  },
  {
    title: "本地模型生成",
    body: "日常场景可交给本地模型（Ollama 等）生成。关键剧情永远手写锁定，保证质量与一致性。"
  },
  {
    title: "随时可玩",
    body: "模型不可用会自动回退手写剧本。加密存档、作弊器、多语言、音频系统全部就绪。"
  }
];

/** 声明 */
export const ABOUT_NOTICES: Array<{ title: string; body: string }> = [
  {
    title: "成人内容",
    body: "本作包含明确的成人内容，仅面向 18 岁以上成年玩家。所有角色均为虚构的成年人（母亲 45 岁、姐姐 26 岁、妹妹 19 岁，其余角色均设定为成年）。"
  },
  {
    title: "虚构声明",
    body: "游戏中的世界、事件、人物、组织均为虚构。故事中涉及的末日、暴力、生存行为不构成任何现实建议或鼓励。"
  },
  {
    title: "内容分级",
    body: "关键剧情（初夜、怀孕、分娩、主线节点）采用手写剧本，模型不参与，以确保表现稳定与角色一致。日常场景可由本地模型生成。"
  },
  {
    title: "数据与隐私",
    body: "游戏不联网、不上传任何数据。使用本地模型时，请求只发往你自己配置的地址（默认本机 11434 端口）。存档加密保存在本地。"
  },
  {
    title: "第三方素材",
    body: "像素素材来自 Kenney.nl，采用 CC0 1.0 公有领域授权（无需署名，此处致谢）。字体与运行时库遵循各自许可。"
  },
  {
    title: "使用范围",
    body: "本作供个人非商业使用。请勿用于商业分发、二次售卖或任何违法用途。"
  }
];

/** 更新检查结果 */
export interface UpdateCheckResult {
  checked: boolean;
  /** 是否有新版本 */
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string | null;
  /** 更新说明 */
  notes: string[];
  /** 下载地址（若有） */
  url: string | null;
  error?: string;
  checkedAt: string;
}

export function newUpdateResult(current: string): UpdateCheckResult {
  return {
    checked: false,
    hasUpdate: false,
    currentVersion: current,
    latestVersion: null,
    notes: [],
    url: null,
    checkedAt: new Date().toISOString()
  };
}

/**
 * 比较版本号（语义化）。
 * 返回 1 表示 a > b，-1 表示 a < b，0 表示相等。
 */
export function compareVersion(a: string, b: string): number {
  const pa = a.split(".").map((x) => parseInt(x, 10) || 0);
  const pb = b.split(".").map((x) => parseInt(x, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

/**
 * 更新源检查。
 *
 * 设计：本作不内置联网，因此默认返回「无法检查」。
 * 若玩家自行配置了更新源（updateUrl），则去请求它。
 * 返回体期望为 { version, notes[], url }。
 */
export async function checkUpdate(
  currentVersion: string,
  updateUrl: string | null,
  fetchImpl?: typeof fetch
): Promise<UpdateCheckResult> {
  const base = newUpdateResult(currentVersion);

  if (!updateUrl) {
    return {
      ...base,
      checked: true,
      error: "未配置更新源。本作不内置联网检查，可在下方手动填写更新源地址。"
    };
  }

  const f = fetchImpl ?? (typeof fetch !== "undefined" ? fetch : undefined);
  if (!f) {
    return { ...base, checked: true, error: "当前环境不支持网络请求" };
  }

  try {
    const res = await f(updateUrl, { headers: { accept: "application/json" } });
    if (!res.ok) {
      return { ...base, checked: true, error: `更新源返回 ${res.status}` };
    }
    const data = await res.json() as { version?: string; notes?: string[]; url?: string };
    if (!data.version) {
      return { ...base, checked: true, error: "更新源格式不正确（缺少 version 字段）" };
    }
    return {
      checked: true,
      hasUpdate: compareVersion(data.version, currentVersion) > 0,
      currentVersion,
      latestVersion: data.version,
      notes: Array.isArray(data.notes) ? data.notes : [],
      url: data.url ?? null,
      checkedAt: new Date().toISOString()
    };
  } catch (e) {
    return {
      ...base,
      checked: true,
      error: `检查失败：${e instanceof Error ? e.message : String(e)}`
    };
  }
}

/** 更新日志（内置，供离线查看） */
export const CHANGELOG: Array<{ version: string; date: string; items: string[] }> = [
  {
    version: "0.27.0", date: "2026-10",
    items: [
      "Demo 构建与启动器",
      "修复文本库存未自动加载",
      "新增 DEMO.md 说明文档"
    ]
  },
  {
    version: "0.26.0", date: "2026-10",
    items: [
      "修复说话人归属推断（78% → 100%）",
      "修复引号前叙述被切走",
      "修复说话人正则误匹配叙述句",
      "修复主语判定取错小句",
      "修复引号闭合后叙述未拆分"
    ]
  },
  {
    version: "0.25.0", date: "2026-10",
    items: [
      "修复节拍分隔符解析（兼容「--- 节拍 1/5 ---」）",
      "脚本改用引擎解析路径并自动校验格式"
    ]
  },
  {
    version: "0.24.0", date: "2026-10",
    items: [
      "新增输出规范化（修复换行拆开的说话人与嵌套引号）",
      "新增预生成文本库存索引",
      "库存接入生成管线（命中省去推理）"
    ]
  },
  {
    version: "0.23.0", date: "2026-10",
    items: [
      "日常 H 模板接入场景筛选",
      "战斗接入防御事件（夜袭自动开战）",
      "接入 CC0 像素头像"
    ]
  },
  {
    version: "0.22.0", date: "2026-10",
    items: [
      "接入 Kenney CC0 素材（瓦片集 + 角色图集）",
      "要塞剖面加瓦片纹理带"
    ]
  },
  {
    version: "0.21.0", date: "2026-10",
    items: [
      "新增 29 个日常 H 场景模板（129 节拍）",
      "界面重构为三栏（后宫名册/舞台/角色详情）",
      "战斗 UI 上线"
    ]
  }
];

/** 统计信息（关于页展示） */
export interface AboutStats {
  companions: number;
  techNodes: number;
  facilities: number;
  items: number;
  clothing: number;
  templates: number;
  scripts: number;
  systems: number;
}

export function aboutStats(s: {
  companions: number;
  techNodes: number;
  facilities: number;
  items: number;
  clothing: number;
  templates: number;
  scripts: number;
}): AboutStats {
  return { ...s, systems: 21 };
}