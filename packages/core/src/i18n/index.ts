/**
 * 多语言系统。
 *
 * 设计：
 *  - 文本包即语言包：游戏内所有 UI 文案走 key 查表
 *  - 剧本文本（DSL）本身也是多语言的：同一场景可挂不同语言的 DSL
 *  - 缺失回退：key 缺失时回退到默认语言，再回退到 key 本身
 *  - 纯函数式，不碰 IO
 */

export type Locale = "zh-CN" | "en-US" | "ja-JP";

export const LOCALE_LABEL: Record<Locale, string> = {
  "zh-CN": "简体中文",
  "en-US": "English",
  "ja-JP": "日本語"
};

export const DEFAULT_LOCALE: Locale = "zh-CN";

/** 文本包：扁平 key → 文案 */
export type TextBundle = Record<string, string>;

export interface I18nState {
  locale: Locale;
  bundles: Partial<Record<Locale, TextBundle>>;
  fallback: Locale;
}

export function newI18n(locale: Locale = DEFAULT_LOCALE): I18nState {
  return { locale, bundles: {}, fallback: DEFAULT_LOCALE };
}

export function registerBundle(state: I18nState, locale: Locale, bundle: TextBundle): I18nState {
  return {
    ...state,
    bundles: { ...state.bundles, [locale]: { ...(state.bundles[locale] ?? {}), ...bundle } }
  };
}

export function setLocale(state: I18nState, locale: Locale): I18nState {
  return { ...state, locale };
}

/**
 * 查表翻译。
 * params 用于占位符替换：{name} → params.name
 */
export function t(
  state: I18nState,
  key: string,
  params?: Record<string, string | number>
): string {
  let text =
    state.bundles[state.locale]?.[key] ??
    state.bundles[state.fallback]?.[key] ??
    key;

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.split(`{${k}}`).join(String(v));
    }
  }
  return text;
}

/** 缺失的 key 列表（用于校验语言包完整性） */
export function missingKeys(state: I18nState, locale: Locale, reference: Locale = DEFAULT_LOCALE): string[] {
  const ref = state.bundles[reference] ?? {};
  const target = state.bundles[locale] ?? {};
  return Object.keys(ref).filter((k) => !(k in target));
}

/** 语言包覆盖率 */
export function bundleCoverage(state: I18nState, locale: Locale, reference: Locale = DEFAULT_LOCALE): number {
  const ref = Object.keys(state.bundles[reference] ?? {});
  if (ref.length === 0) return 1;
  const target = state.bundles[locale] ?? {};
  const hit = ref.filter((k) => k in target).length;
  return hit / ref.length;
}

// ============ 内置文案 ============

/** UI 文案 key 与中文原文 */
export const ZH_UI: TextBundle = {
  "app.title": "末日生存·后宫",
  "tab.status": "状态",
  "tab.map": "地图",
  "tab.canvas": "画面",
  "tab.vehicle": "房车",
  "tab.quests": "主线",
  "tab.defense": "防御",
  "tab.harem": "后宫",
  "tab.roster": "角色",
  "tab.jobs": "岗位",
  "tab.tech": "科技",
  "tab.base": "基地",
  "tab.wardrobe": "服装",
  "tab.items": "物品",
  "tab.scenes": "场景",
  "tab.llm": "模型",
  "tab.save": "存档",
  "tab.cheats": "设置",

  "stat.hunger": "饥饿",
  "stat.thirst": "口渴",
  "stat.stamina": "体力",
  "stat.energy": "精力",
  "stat.mood": "心情",
  "stat.lust": "欲情",

  "action.advance1h": "+1 小时",
  "action.sleep": "睡一觉",
  "action.research": "研究",
  "action.build": "建造",
  "action.travel": "前往",
  "action.loot": "搜刮",
  "action.satisfy": "亲密",
  "action.refuse": "拒绝",
  "action.raid": "夜袭",
  "action.save": "保存",
  "action.load": "读取",
  "action.delete": "删除",

  "label.affection": "好感",
  "label.loyalty": "忠诚",
  "label.bond": "羁绊",
  "label.daysSince": "冷落",
  "label.job": "岗位",
  "label.status": "状态",

  "msg.saved": "已保存到 {slot}",
  "msg.loaded": "已读取 {slot}",
  "msg.deleted": "已删除 {slot}",
  "msg.cheatOn": "作弊器已启用",
  "msg.nightRaid": "夜袭：{kind}（{outcome}）",
  "msg.questDone": "主线完成：{title}",
  "msg.techDone": "科技完成：{name}",
  "msg.arrived": "抵达 {region}",

  "slot.manual": "存档 {n}",
  "slot.auto": "自动存档 {n}",
  "slot.quick": "快速存档",
  "slot.empty": "（空）",

  "personality.bold": "主动强势",
  "personality.shy": "害羞内敛",
  "personality.reserved": "沉默寡言",
  "personality.warm": "温柔照顾",
  "personality.proud": "高傲",
  "personality.devout": "虔诚",
  "personality.artistic": "艺术家气质",
  "personality.practical": "务实",
  "personality.neutral": "中性",
  "personality.ai": "特殊"
};

export const EN_UI: TextBundle = {
  "app.title": "Doomsday Harem",
  "tab.status": "Status",
  "tab.map": "Map",
  "tab.canvas": "View",
  "tab.vehicle": "Vehicle",
  "tab.quests": "Quests",
  "tab.defense": "Defense",
  "tab.harem": "Harem",
  "tab.roster": "Roster",
  "tab.jobs": "Jobs",
  "tab.tech": "Tech",
  "tab.base": "Base",
  "tab.wardrobe": "Wardrobe",
  "tab.items": "Items",
  "tab.scenes": "Scenes",
  "tab.llm": "Model",
  "tab.save": "Save",
  "tab.cheats": "Settings",

  "stat.hunger": "Hunger",
  "stat.thirst": "Thirst",
  "stat.stamina": "Stamina",
  "stat.energy": "Energy",
  "stat.mood": "Mood",
  "stat.lust": "Lust",

  "action.advance1h": "+1 hour",
  "action.sleep": "Sleep",
  "action.research": "Research",
  "action.build": "Build",
  "action.travel": "Travel",
  "action.loot": "Scavenge",
  "action.satisfy": "Intimacy",
  "action.refuse": "Refuse",
  "action.raid": "Night raid",
  "action.save": "Save",
  "action.load": "Load",
  "action.delete": "Delete",

  "label.affection": "Affection",
  "label.loyalty": "Loyalty",
  "label.bond": "Bond",
  "label.daysSince": "Neglect",
  "label.job": "Job",
  "label.status": "Status",

  "msg.saved": "Saved to {slot}",
  "msg.loaded": "Loaded {slot}",
  "msg.deleted": "Deleted {slot}",
  "msg.cheatOn": "Cheats enabled",
  "msg.nightRaid": "Night raid: {kind} ({outcome})",
  "msg.questDone": "Quest complete: {title}",
  "msg.techDone": "Tech complete: {name}",
  "msg.arrived": "Arrived at {region}",

  "slot.manual": "Slot {n}",
  "slot.auto": "Auto {n}",
  "slot.quick": "Quick save",
  "slot.empty": "(empty)",

  "personality.bold": "Bold",
  "personality.shy": "Shy",
  "personality.reserved": "Reserved",
  "personality.warm": "Warm",
  "personality.proud": "Proud",
  "personality.devout": "Devout",
  "personality.artistic": "Artistic",
  "personality.practical": "Practical",
  "personality.neutral": "Neutral",
  "personality.ai": "Special"
};

export const JA_UI: TextBundle = {
  "app.title": "終末サバイバル・ハーレム",
  "tab.status": "状態",
  "tab.map": "マップ",
  "tab.canvas": "画面",
  "tab.vehicle": "車両",
  "tab.quests": "メイン",
  "tab.defense": "防衛",
  "tab.harem": "ハーレム",
  "tab.roster": "キャラ",
  "tab.jobs": "配置",
  "tab.tech": "技術",
  "tab.base": "拠点",
  "tab.wardrobe": "衣装",
  "tab.items": "物品",
  "tab.scenes": "シーン",
  "tab.llm": "モデル",
  "tab.save": "セーブ",
  "tab.cheats": "設定",

  "stat.hunger": "空腹",
  "stat.thirst": "渇き",
  "stat.stamina": "体力",
  "stat.energy": "気力",
  "stat.mood": "機嫌",
  "stat.lust": "欲情",

  "action.advance1h": "+1 時間",
  "action.sleep": "眠る",
  "action.research": "研究",
  "action.build": "建設",
  "action.travel": "移動",
  "action.loot": "物資回収",
  "action.satisfy": "親密",
  "action.refuse": "断る",
  "action.raid": "夜襲",
  "action.save": "保存",
  "action.load": "読込",
  "action.delete": "削除",

  "label.affection": "好感度",
  "label.loyalty": "忠誠",
  "label.bond": "絆",
  "label.daysSince": "放置",
  "label.job": "配置",
  "label.status": "状態",

  "msg.saved": "{slot} に保存しました",
  "msg.loaded": "{slot} を読み込みました",
  "msg.deleted": "{slot} を削除しました",
  "msg.cheatOn": "チート有効",
  "msg.nightRaid": "夜襲：{kind}（{outcome}）",
  "msg.questDone": "メイン完了：{title}",
  "msg.techDone": "技術完了：{name}",
  "msg.arrived": "{region} に到着",

  "slot.manual": "セーブ {n}",
  "slot.auto": "オート {n}",
  "slot.quick": "クイックセーブ",
  "slot.empty": "（空）",

  "personality.bold": "強気",
  "personality.shy": "内気",
  "personality.reserved": "寡黙",
  "personality.warm": "優しい",
  "personality.proud": "高慢",
  "personality.devout": "敬虔",
  "personality.artistic": "芸術家肌",
  "personality.practical": "実務的",
  "personality.neutral": "中庸",
  "personality.ai": "特殊"
};

/** 建一个载入全部内置文案的 i18n */
export function defaultI18n(locale: Locale = DEFAULT_LOCALE): I18nState {
  let s = newI18n(locale);
  s = registerBundle(s, "zh-CN", ZH_UI);
  s = registerBundle(s, "en-US", EN_UI);
  s = registerBundle(s, "ja-JP", JA_UI);
  return s;
}
