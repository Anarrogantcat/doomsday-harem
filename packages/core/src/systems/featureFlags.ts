/**
 * 功能开关注册表（Feature Flags）。
 *
 * 为什么需要：
 *   未来会持续加玩法（淫纹、榨精、调教、敌人统计、血脉……），
 *   其中一部分是**可选的成人向内容**，玩家有权关闭。
 *   若每加一个都在 UI 里硬编码一个开关，界面会被撑爆且极易漏。
 *
 * 这里把所有可选玩法收成**注册表**：
 *   - 每个 flag 声明默认值、分类、依赖关系
 *   - 支持 localStorage 持久化（浏览器/桌面共用）
 *   - 支持「父开关关闭时子项自动失效」
 *
 * 新增玩法只需在这里加一条记录，UI 会自动渲染出开关。
 *
 * 纯函数式，无 IO —— localStorage 读写由调用方注入。
 */

/** 开关分类 */
export type FlagCategory =
  | "nsfw"      // 成人向内容
  | "system"    // 系统玩法
  | "display"   // 显示
  | "audio";    // 音频

export const FLAG_CATEGORY_LABEL: Record<FlagCategory, string> = {
  nsfw: "成人向",
  system: "系统",
  display: "显示",
  audio: "音频"
};

export interface FlagDef {
  /** 存储键（localStorage） */
  key: string;
  /** 显示名 */
  name: string;
  /** 说明 */
  desc: string;
  category: FlagCategory;
  /** 默认值 */
  def: boolean;
  /** 被这些开关依赖；父项关闭时本项无效 */
  requires?: string[];
  /** 关联铁律 */
  laws?: string[];
  /** 是否「实验性」——UI 上可标灰 */
  experimental?: boolean;
}

/**
 * 全部功能开关。
 *
 * 已存在的键保持兼容：
 *   dh-inputbar     输入栏开关（v0.51.0）
 *   dh-eventbar-h   事件栏高度
 *   dh-col-widths   栏宽
 */
export const FEATURE_FLAGS: FlagDef[] = [
  // ---------- 成人向 ----------
  {
    key: "dh-nsfw",
    name: "成人向内容总开关",
    desc: "关闭后所有成人向玩法一并停用（叙事降为淡出处理）",
    category: "nsfw", def: true
  },
  {
    key: "dh-nsfw-marks",
    name: "淫纹",
    desc: "主角以魅魔血脉赋予后宫淫纹（已赋予的数据保留，仅隐藏显示）",
    category: "nsfw", def: true, requires: ["dh-nsfw"], laws: ["L-15"]
  },
  {
    key: "dh-nsfw-training",
    name: "调教",
    desc: "主角调教后宫；姐姐与母亲可双向。影响服从度，不影响好感",
    category: "nsfw", def: true, requires: ["dh-nsfw"], laws: ["L-12", "L-13"]
  },
  {
    key: "dh-nsfw-enemy",
    name: "敌对亲密",
    desc: "主角与女性敌人的榨精互动。关闭后敌人仅作为战斗对象",
    category: "nsfw", def: true, requires: ["dh-nsfw"], laws: ["L-7"]
  },
  {
    key: "dh-nsfw-enemy-preg",
    name: "敌人受孕",
    desc: "敌人被内射后有概率怀孕（只记 children 计数，不生成实体）",
    category: "nsfw", def: true, requires: ["dh-nsfw-enemy"], laws: ["L-11"]
  },
  {
    key: "dh-nsfw-harem-interact",
    name: "后宫互交",
    desc: "后宫成员之间发生关系（仅限娱乐型扶她药）",
    category: "nsfw", def: true, requires: ["dh-nsfw"], laws: ["L-9"]
  },
  {
    key: "dh-nsfw-pregnancy",
    name: "怀孕与生育",
    desc: "受孕、孕程、分娩、后代系统",
    category: "nsfw", def: true, requires: ["dh-nsfw"]
  },
  {
    key: "dh-nsfw-nightraid",
    name: "夜袭",
    desc: "欲情满时同伴的深夜主动行为（无拒绝选项）",
    category: "nsfw", def: true, requires: ["dh-nsfw"], laws: ["INV-5"]
  },
  {
    key: "dh-nsfw-solo",
    name: "主角自慰",
    desc: "单人场景与自慰子页",
    category: "nsfw", def: true, requires: ["dh-nsfw"], laws: ["S-11"]
  },

  // ---------- 系统 ----------
  {
    key: "dh-inputbar",
    name: "输入栏",
    desc: "中栏底部的自由输入框（对话 / 行动指令）",
    category: "system", def: true
  },
  {
    key: "dh-optionsbar",
    name: "选项区",
    desc: "叙事与事件记录之间的选项按钮（继续 / 对话 / 判定 / 行动）",
    category: "system", def: true
  },
  {
    key: "dh-autotravel",
    name: "跨图移动消耗",
    desc: "跨地图移动按距离计算时间与燃料（关闭则瞬移）",
    category: "system", def: true, laws: ["M-5"]
  },
  {
    key: "dh-fog",
    name: "地图迷雾",
    desc: "未探索格显示为未知",
    category: "system", def: true, laws: ["M-7"]
  },
  {
    key: "dh-enemy-stats",
    name: "敌人性爱统计",
    desc: "为女性敌人记录完整的性爱统计（与后宫同结构）",
    category: "system", def: true, laws: ["L-10"], experimental: true
  },
  {
    key: "dh-bloodline",
    name: "魅魔血脉叙事",
    desc: "叙事层面体现血脉线（不给任何数值）",
    category: "system", def: true, laws: ["L-14"]
  },

  // ---------- 显示 ----------
  {
    key: "dh-show-appellation",
    name: "显示称谓",
    desc: "名册与标题使用称谓（姐姐），关闭则使用真名（林苓）",
    category: "display", def: true, laws: ["N-1"]
  },
  {
    key: "dh-show-stats",
    name: "显示性爱统计",
    desc: "主角 / 后宫 / 敌人三处统计区块",
    category: "display", def: true
  },
  {
    key: "dh-pixel-strip",
    name: "像素条",
    desc: "状态条下方的像素装饰条",
    category: "display", def: true, laws: ["U-15"]
  },
  {
    key: "dh-tooltip",
    name: "悬停提示",
    desc: "鼠标悬停显示详细说明",
    category: "display", def: true, laws: ["U-16"]
  },

  // ---------- 音频 ----------
  {
    key: "dh-tts",
    name: "语音朗读",
    desc: "生成文本时同步出声",
    category: "audio", def: false, laws: ["T-3", "T-9"]
  },
  {
    key: "dh-tts-narration",
    name: "朗读旁白",
    desc: "除对话外，旁白也朗读",
    category: "audio", def: false, requires: ["dh-tts"], laws: ["T-11"]
  },
  {
    key: "dh-audio-bgm",
    name: "背景音乐",
    desc: "24 轨音频框架（当前无音频文件）",
    category: "audio", def: false, laws: ["U-18"]
  }
];

/** 按 key 取定义 */
export function flagDef(key: string): FlagDef | undefined {
  return FEATURE_FLAGS.find((f) => f.key === key);
}

export function flagsByCategory(c: FlagCategory): FlagDef[] {
  return FEATURE_FLAGS.filter((f) => f.category === c);
}

/** 开关状态表 */
export type FlagState = Record<string, boolean>;

export function defaultFlags(): FlagState {
  const out: FlagState = {};
  for (const f of FEATURE_FLAGS) out[f.key] = f.def;
  return out;
}

/**
 * 补全缺失的键（旧存档 / 新版本新增 flag）。
 * 已存在的值保持不变。
 */
export function mergeFlags(saved: FlagState | null | undefined): FlagState {
  const out = defaultFlags();
  if (!saved) return out;
  for (const f of FEATURE_FLAGS) {
    if (typeof saved[f.key] === "boolean") out[f.key] = saved[f.key];
  }
  return out;
}

/**
 * 解析依赖链：父开关关闭时，子项视为关闭。
 *
 * 为什么不用「关闭时直接改写子项」：
 *   那样父项重新打开后子项无法恢复原状。
 *   这里只做**读取时求值**，底层数据不动。
 */
export function isFlagOn(state: FlagState, key: string): boolean {
  const def = flagDef(key);
  if (!def) return false;
  if (state[key] !== true) return false;
  for (const parent of def.requires ?? []) {
    if (!isFlagOn(state, parent)) return false;
  }
  return true;
}

/**
 * 列出因父项关闭而「实际失效」的开关（UI 可以把它们标灰）。
 */
export function shadowedFlags(state: FlagState): string[] {
  const out: string[] = [];
  for (const f of FEATURE_FLAGS) {
    if (state[f.key] === true && !isFlagOn(state, f.key)) out.push(f.key);
  }
  return out;
}

/** 设置某个开关（返回新对象） */
export function setFlag(state: FlagState, key: string, on: boolean): FlagState {
  if (!flagDef(key)) return state;
  return { ...state, [key]: on };
}

/** 批量设置 */
export function setFlags(state: FlagState, patch: FlagState): FlagState {
  let out = state;
  for (const [k, v] of Object.entries(patch)) out = setFlag(out, k, v);
  return out;
}

/** 全部开启（进度管理用） */
export function enableAll(state: FlagState): FlagState {
  let out = state;
  for (const f of FEATURE_FLAGS) out = setFlag(out, f.key, true);
  return out;
}

/** 全部恢复默认 */
export function resetFlags(): FlagState {
  return defaultFlags();
}

/** 与铁律关联的开关（供「铁律」设置页展示） */
export function flagsForLaw(lawId: string): FlagDef[] {
  return FEATURE_FLAGS.filter((f) => f.laws?.includes(lawId));
}

/** 开关统计 */
export function flagStats(state: FlagState): {
  total: number; on: number; off: number;
  shadowed: number;
  byCategory: Record<string, { total: number; on: number }>;
} {
  const byCategory: Record<string, { total: number; on: number }> = {};
  for (const f of FEATURE_FLAGS) {
    const c = (byCategory[f.category] ??= { total: 0, on: 0 });
    c.total++;
    if (isFlagOn(state, f.key)) c.on++;
  }
  const on = FEATURE_FLAGS.filter((f) => isFlagOn(state, f.key)).length;
  return {
    total: FEATURE_FLAGS.length,
    on,
    off: FEATURE_FLAGS.length - on,
    shadowed: shadowedFlags(state).length,
    byCategory
  };
}

// ============ 序列化 ============

export interface FlagsJSON {
  v: number;
  on: Record<string, boolean>;
}

export const FLAGS_FORMAT_VERSION = 1;

export function flagsToJSON(state: FlagState): FlagsJSON {
  const on: Record<string, boolean> = {};
  for (const f of FEATURE_FLAGS) on[f.key] = state[f.key] === true;
  return { v: FLAGS_FORMAT_VERSION, on };
}

export function flagsFromJSON(j: FlagsJSON | null | undefined): FlagState {
  if (!j || j.v !== FLAGS_FORMAT_VERSION) return defaultFlags();
  return mergeFlags(j.on);
}

// ============ localStorage 适配（可选，由调用方注入 storage）============

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** 从 storage 读取全部开关 */
export function loadFlags(storage: StorageLike): FlagState {
  const on: Record<string, boolean> = {};
  for (const f of FEATURE_FLAGS) {
    const raw = storage.getItem(f.key);
    if (raw === "1" || raw === "true") on[f.key] = true;
    else if (raw === "0" || raw === "false") on[f.key] = false;
  }
  return mergeFlags(on);
}

/** 写回 storage */
export function saveFlags(storage: StorageLike, state: FlagState): void {
  for (const f of FEATURE_FLAGS) {
    storage.setItem(f.key, state[f.key] === true ? "1" : "0");
  }
}
