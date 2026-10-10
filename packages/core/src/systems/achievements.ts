/**
 * 成就系统。
 *
 * 设计定位：
 *  - 成就是可选的正反馈，不影响任何游戏内容解锁
 *  - 开启作弊时仍可记录（由玩家自选），但会标注
 *  - 成就分为若干类别，便于浏览
 *  - 进度类成就显示当前/目标
 *
 * 纯函数式。
 */

export type AchievementCategory =
  | "survival"    // 生存
  | "harem"       // 后宫
  | "intimacy"    // 亲密
  | "tech"        // 科技
  | "base"        // 基地
  | "combat"      // 战斗
  | "explore"     // 探索
  | "family"      // 家庭
  | "special";    // 特殊

export const ACH_CATEGORY_LABEL: Record<AchievementCategory, string> = {
  survival: "生存",
  harem: "后宫",
  intimacy: "亲密",
  tech: "科技",
  base: "基地",
  combat: "战斗",
  explore: "探索",
  family: "家庭",
  special: "特殊"
};

export const ACH_CATEGORY_ICON: Record<AchievementCategory, string> = {
  survival: "♥",
  harem: "♛",
  intimacy: "❋",
  tech: "★",
  base: "⌂",
  combat: "⚔",
  explore: "◎",
  family: "☘",
  special: "✦"
};

/** 成就稀有度 */
export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export const RARITY_LABEL: Record<Rarity, string> = {
  common: "普通",
  uncommon: "少见",
  rare: "稀有",
  epic: "史诗",
  legendary: "传说"
};

export const RARITY_COLOR: Record<Rarity, string> = {
  common: "#9aa8bf",
  uncommon: "#0CD71C",
  rare: "#00F5EF",
  epic: "#D982EF",
  legendary: "#E8C815"
};

/** 成就定义 */
export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  rarity: Rarity;
  /** 是否为进度类（有目标值） */
  target?: number;
  /** 是否隐藏（未解锁时不显示描述） */
  hidden?: boolean;
}

/** 全部成就 */
export const ACHIEVEMENTS: AchievementDef[] = [
  // ---- 生存 ----
  { id: "survive_1", name: "第一天", description: "活过第一天", category: "survival", rarity: "common" },
  { id: "survive_7", name: "一周", description: "活过七天", category: "survival", rarity: "common" },
  { id: "survive_30", name: "一个月", description: "活过三十天", category: "survival", rarity: "uncommon" },
  { id: "survive_100", name: "百日", description: "活过一百天", category: "survival", rarity: "rare" },
  { id: "survive_365", name: "一年", description: "活过一整年", category: "survival", rarity: "epic" },
  { id: "no_hunger", name: "未雨绸缪", description: "连续 30 天饥饿值未低于 30", category: "survival", rarity: "rare" },

  // ---- 后宫 ----
  { id: "harem_1", name: "第一个", description: "第一位后宫加入", category: "harem", rarity: "common" },
  { id: "harem_5", name: "小家庭", description: "5 位后宫", category: "harem", rarity: "uncommon", target: 5 },
  { id: "harem_10", name: "大家庭", description: "10 位后宫", category: "harem", rarity: "rare", target: 10 },
  { id: "harem_15", name: "人丁兴旺", description: "15 位后宫", category: "harem", rarity: "epic", target: 15 },
  { id: "harem_all", name: "全员到齐", description: "21 位后宫全部加入", category: "harem", rarity: "legendary", target: 21 },
  { id: "bond_max_1", name: "深爱", description: "某位同伴羁绊满级", category: "harem", rarity: "rare" },
  { id: "bond_max_5", name: "众心所向", description: "5 位同伴羁绊满级", category: "harem", rarity: "epic", target: 5 },
  { id: "bond_max_all", name: "无可替代", description: "全部同伴羁绊满级", category: "harem", rarity: "legendary", target: 21 },

  // ---- 亲密 ----
  { id: "act_1", name: "初次", description: "第一次亲密行为", category: "intimacy", rarity: "common" },
  { id: "act_10", name: "渐入佳境", description: "累计 10 次亲密", category: "intimacy", rarity: "common", target: 10 },
  { id: "act_100", name: "老练", description: "累计 100 次亲密", category: "intimacy", rarity: "rare", target: 100 },
  { id: "act_500", name: "不知疲倦", description: "累计 500 次亲密", category: "intimacy", rarity: "epic", target: 500 },
  { id: "act_1000", name: "传说", description: "累计 1000 次亲密", category: "intimacy", rarity: "legendary", target: 1000 },
  { id: "prof_max_1", name: "专精", description: "某个部位熟练度满级", category: "intimacy", rarity: "rare" },
  { id: "prof_max_all", name: "全能", description: "全部部位熟练度满级", category: "intimacy", rarity: "legendary", target: 8 },
  { id: "all_acts", name: "博览", description: "尝试过全部 26 种行为", category: "intimacy", rarity: "epic", target: 26 },
  { id: "enema_first", name: "准备工作", description: "完成一次后庭准备流程", category: "intimacy", rarity: "uncommon" },
  { id: "toy_all", name: "收藏家", description: "集齐全部成人道具", category: "intimacy", rarity: "rare" },
  { id: "multi_3", name: "三人同席", description: "完成一次三人场景", category: "intimacy", rarity: "rare" },
  { id: "multi_4", name: "四人", description: "完成一次四人场景", category: "intimacy", rarity: "epic" },
  { id: "harem_interact", name: "互相", description: "触发一次后宫互交场景", category: "intimacy", rarity: "uncommon" },

  // ---- 科技 ----
  { id: "tech_1", name: "第一步", description: "解锁第一个科技节点", category: "tech", rarity: "common" },
  { id: "tech_10", name: "研究者", description: "解锁 10 个节点", category: "tech", rarity: "common", target: 10 },
  { id: "tech_50", name: "技术宅", description: "解锁 50 个节点", category: "tech", rarity: "rare", target: 50 },
  { id: "tech_all", name: "全知", description: "解锁全部 127 个节点", category: "tech", rarity: "legendary", target: 127 },
  { id: "tech_branch", name: "专精一路", description: "某条分支全部解锁", category: "tech", rarity: "rare" },
  { id: "tech_personal", name: "自我超越", description: "解锁 10 个主角个人科技", category: "tech", rarity: "epic", target: 10 },
  { id: "tech_shared", name: "群策群力", description: "后宫科研人员参与完成 10 次研究", category: "tech", rarity: "rare", target: 10 },

  // ---- 基地 ----
  { id: "base_1", name: "安身之所", description: "建成第一座设施", category: "base", rarity: "common" },
  { id: "base_10", name: "初具规模", description: "建成 10 座设施", category: "base", rarity: "uncommon", target: 10 },
  { id: "base_30", name: "要塞", description: "建成 30 座设施", category: "base", rarity: "rare", target: 30 },
  { id: "base_all", name: "完整要塞", description: "全部 41 座设施建成", category: "base", rarity: "legendary", target: 41 },
  { id: "base_max", name: "满级", description: "某座设施升到满级", category: "base", rarity: "uncommon" },
  { id: "base_max_10", name: "精益求精", description: "10 座设施满级", category: "base", rarity: "epic", target: 10 },

  // ---- 战斗 ----
  { id: "combat_1", name: "首次交锋", description: "赢得第一场战斗", category: "combat", rarity: "common" },
  { id: "combat_10", name: "老兵", description: "赢得 10 场战斗", category: "combat", rarity: "uncommon", target: 10 },
  { id: "combat_50", name: "战士", description: "赢得 50 场战斗", category: "combat", rarity: "rare", target: 50 },
  { id: "combat_flawless", name: "毫发无伤", description: "无伤赢得一场战斗", category: "combat", rarity: "epic" },
  { id: "combat_aoe", name: "横扫千军", description: "一次范围技能击败 3 个以上敌人", category: "combat", rarity: "rare" },
  { id: "combat_charm", name: "不战而屈", description: "用魅惑结束一场战斗", category: "combat", rarity: "uncommon" },

  // ---- 探索 ----
  { id: "explore_1", name: "出门", description: "首次离开据点", category: "explore", rarity: "common" },
  { id: "explore_5", name: "周边", description: "发现 5 个区域", category: "explore", rarity: "common", target: 5 },
  { id: "explore_all", name: "踏遍", description: "发现全部 17 个区域", category: "explore", rarity: "epic", target: 17 },
  { id: "explore_clear", name: "清扫", description: "清理全部区域", category: "explore", rarity: "rare", target: 17 },
  { id: "vehicle_full", name: "全副武装", description: "房车 23 项改装全部安装", category: "explore", rarity: "epic", target: 23 },

  // ---- 家庭 ----
  { id: "family_sister", name: "姐姐", description: "姐姐加入", category: "family", rarity: "common" },
  { id: "family_mother", name: "母亲", description: "母亲加入", category: "family", rarity: "common" },
  { id: "family_sister2", name: "妹妹", description: "妹妹加入", category: "family", rarity: "common" },
  { id: "family_all", name: "一家人", description: "家庭成员全部加入", category: "family", rarity: "rare" },
  { id: "family_first", name: "血脉初章", description: "与家庭成员完成第一次", category: "family", rarity: "uncommon" },
  { id: "pregnant_1", name: "新生命", description: "第一次怀孕", category: "family", rarity: "uncommon" },
  { id: "birth_1", name: "诞生", description: "第一个后代出生", category: "family", rarity: "rare" },
  { id: "birth_10", name: "人丁", description: "10 个后代", category: "family", rarity: "epic", target: 10 },
  { id: "birth_50", name: "家族", description: "50 个后代", category: "family", rarity: "legendary", target: 50 },
  { id: "all_female", name: "全是女儿", description: "拥有 20 个后代且全为女性", category: "family", rarity: "rare" },

  // ---- 特殊 ----
  { id: "ai_awaken", name: "她醒了", description: "特殊AI 觉醒", category: "special", rarity: "rare" },
  { id: "ai_body", name: "有身体了", description: "特殊AI 获得移动载体", category: "special", rarity: "epic" },
  { id: "ai_love", name: "跨越介质", description: "与特殊AI 完成亲密", category: "special", rarity: "legendary" },
  { id: "all_perks", name: "全员增益", description: "全部同伴都获得至少一项被动增益", category: "special", rarity: "epic" },
  { id: "raid_win_10", name: "守夜人", description: "成功抵御 10 次夜袭", category: "special", rarity: "rare", target: 10 },
  { id: "no_cheat", name: "纯净之旅", description: "未开作弊完成 100 天", category: "special", rarity: "legendary" },
  { id: "cheat_used", name: "作弊者", description: "使用过作弊器", category: "special", rarity: "common" }
];

const ACH_BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));

export function achievementDef(id: string): AchievementDef | undefined {
  return ACH_BY_ID.get(id);
}

export function achievementsByCategory(c: AchievementCategory): AchievementDef[] {
  return ACHIEVEMENTS.filter((a) => a.category === c);
}

export const ACH_CATEGORIES: AchievementCategory[] = [
  "survival", "harem", "intimacy", "tech", "base", "combat", "explore", "family", "special"
];

// ============ 运行时状态 ============

/** 单个成就的进度 */
export interface AchievementProgress {
  id: string;
  unlocked: boolean;
  /** 解锁时间（游戏内天数） */
  unlockedAtDay: number | null;
  /** 当前进度（进度类用） */
  current: number;
  /** 是否在作弊状态下解锁 */
  cheated: boolean;
}

export interface AchievementState {
  progress: Record<string, AchievementProgress>;
  /** 累计统计（供条件判定） */
  stats: AchievementStats;
}

/** 累计统计 */
export interface AchievementStats {
  daysSurvived: number;
  haremCount: number;
  maxBondCount: number;
  totalActs: number;
  maxProficiency: number;
  uniqueActs: string[];
  techUnlocked: number;
  personalTechUnlocked: number;
  sharedResearchCount: number;
  baseBuilt: number;
  baseMaxed: number;
  combatsWon: number;
  regionsDiscovered: number;
  regionsCleared: number;
  vehicleMods: number;
  births: number;
  femaleBirths: number;
  raidsDefended: number;
  usedCheat: boolean;
}

export function emptyStats(): AchievementStats {
  return {
    daysSurvived: 0,
    haremCount: 0,
    maxBondCount: 0,
    totalActs: 0,
    maxProficiency: 0,
    uniqueActs: [],
    techUnlocked: 0,
    personalTechUnlocked: 0,
    sharedResearchCount: 0,
    baseBuilt: 0,
    baseMaxed: 0,
    combatsWon: 0,
    regionsDiscovered: 0,
    regionsCleared: 0,
    vehicleMods: 0,
    births: 0,
    femaleBirths: 0,
    raidsDefended: 0,
    usedCheat: false
  };
}

export function newAchievementState(): AchievementState {
  const progress: Record<string, AchievementProgress> = {};
  for (const a of ACHIEVEMENTS) {
    progress[a.id] = { id: a.id, unlocked: false, unlockedAtDay: null, current: 0, cheated: false };
  }
  return { progress, stats: emptyStats() };
}

/**
 * 评估全部成就。
 *
 * 根据当前统计判断哪些成就应解锁。
 * 返回新状态与本次新解锁的成就列表。
 */
export function evaluateAchievements(
  state: AchievementState,
  stats: AchievementStats,
  day: number,
  cheated: boolean
): { state: AchievementState; newlyUnlocked: AchievementDef[] } {
  const progress = { ...state.progress };
  const newly: AchievementDef[] = [];

  const unlock = (id: string) => {
    const p = progress[id];
    if (!p || p.unlocked) return;
    progress[id] = { ...p, unlocked: true, unlockedAtDay: day, cheated };
    const def = achievementDef(id);
    if (def) newly.push(def);
  };

  const setProgress = (id: string, current: number) => {
    const p = progress[id];
    if (!p) return;
    if (current !== p.current) progress[id] = { ...p, current };
  };

  // ---- 生存 ----
  if (stats.daysSurvived >= 1) unlock("survive_1");
  if (stats.daysSurvived >= 7) unlock("survive_7");
  if (stats.daysSurvived >= 30) unlock("survive_30");
  if (stats.daysSurvived >= 100) unlock("survive_100");
  if (stats.daysSurvived >= 365) unlock("survive_365");

  // ---- 后宫 ----
  setProgress("harem_5", stats.haremCount);
  setProgress("harem_10", stats.haremCount);
  setProgress("harem_15", stats.haremCount);
  setProgress("harem_all", stats.haremCount);
  if (stats.haremCount >= 1) unlock("harem_1");
  if (stats.haremCount >= 5) unlock("harem_5");
  if (stats.haremCount >= 10) unlock("harem_10");
  if (stats.haremCount >= 15) unlock("harem_15");
  if (stats.haremCount >= 21) unlock("harem_all");

  setProgress("bond_max_5", stats.maxBondCount);
  setProgress("bond_max_all", stats.maxBondCount);
  if (stats.maxBondCount >= 1) unlock("bond_max_1");
  if (stats.maxBondCount >= 5) unlock("bond_max_5");
  if (stats.maxBondCount >= 21) unlock("bond_max_all");

  // ---- 亲密 ----
  setProgress("act_10", stats.totalActs);
  setProgress("act_100", stats.totalActs);
  setProgress("act_500", stats.totalActs);
  setProgress("act_1000", stats.totalActs);
  if (stats.totalActs >= 1) unlock("act_1");
  if (stats.totalActs >= 10) unlock("act_10");
  if (stats.totalActs >= 100) unlock("act_100");
  if (stats.totalActs >= 500) unlock("act_500");
  if (stats.totalActs >= 1000) unlock("act_1000");

  setProgress("prof_max_all", stats.maxProficiency);
  if (stats.maxProficiency >= 1) unlock("prof_max_1");
  if (stats.maxProficiency >= 8) unlock("prof_max_all");

  setProgress("all_acts", stats.uniqueActs.length);
  if (stats.uniqueActs.length >= 26) unlock("all_acts");

  // ---- 科技 ----
  setProgress("tech_10", stats.techUnlocked);
  setProgress("tech_50", stats.techUnlocked);
  setProgress("tech_all", stats.techUnlocked);
  if (stats.techUnlocked >= 1) unlock("tech_1");
  if (stats.techUnlocked >= 10) unlock("tech_10");
  if (stats.techUnlocked >= 50) unlock("tech_50");
  if (stats.techUnlocked >= 127) unlock("tech_all");

  setProgress("tech_personal", stats.personalTechUnlocked);
  if (stats.personalTechUnlocked >= 10) unlock("tech_personal");

  setProgress("tech_shared", stats.sharedResearchCount);
  if (stats.sharedResearchCount >= 10) unlock("tech_shared");

  // ---- 基地 ----
  setProgress("base_10", stats.baseBuilt);
  setProgress("base_30", stats.baseBuilt);
  setProgress("base_all", stats.baseBuilt);
  if (stats.baseBuilt >= 1) unlock("base_1");
  if (stats.baseBuilt >= 10) unlock("base_10");
  if (stats.baseBuilt >= 30) unlock("base_30");
  if (stats.baseBuilt >= 41) unlock("base_all");

  setProgress("base_max_10", stats.baseMaxed);
  if (stats.baseMaxed >= 1) unlock("base_max");
  if (stats.baseMaxed >= 10) unlock("base_max_10");

  // ---- 战斗 ----
  setProgress("combat_10", stats.combatsWon);
  setProgress("combat_50", stats.combatsWon);
  if (stats.combatsWon >= 1) unlock("combat_1");
  if (stats.combatsWon >= 10) unlock("combat_10");
  if (stats.combatsWon >= 50) unlock("combat_50");

  // ---- 探索 ----
  setProgress("explore_5", stats.regionsDiscovered);
  setProgress("explore_all", stats.regionsDiscovered);
  setProgress("explore_clear", stats.regionsCleared);
  setProgress("vehicle_full", stats.vehicleMods);
  if (stats.regionsDiscovered >= 1) unlock("explore_1");
  if (stats.regionsDiscovered >= 5) unlock("explore_5");
  if (stats.regionsDiscovered >= 17) unlock("explore_all");
  if (stats.regionsCleared >= 17) unlock("explore_clear");
  if (stats.vehicleMods >= 23) unlock("vehicle_full");

  // ---- 家庭 ----
  setProgress("birth_10", stats.births);
  setProgress("birth_50", stats.births);
  if (stats.births >= 1) unlock("birth_1");
  if (stats.births >= 10) unlock("birth_10");
  if (stats.births >= 50) unlock("birth_50");
  if (stats.births >= 20 && stats.femaleBirths >= 20) unlock("all_female");

  // ---- 特殊 ----
  setProgress("raid_win_10", stats.raidsDefended);
  if (stats.raidsDefended >= 10) unlock("raid_win_10");
  if (stats.usedCheat) unlock("cheat_used");
  if (!stats.usedCheat && stats.daysSurvived >= 100) unlock("no_cheat");

  return { state: { progress, stats }, newlyUnlocked: newly };
}

/** 已解锁数量 */
export function unlockedCount(state: AchievementState): number {
  return Object.values(state.progress).filter((p) => p.unlocked).length;
}

/** 按稀有度统计 */
export function rarityStats(state: AchievementState): Record<Rarity, { total: number; unlocked: number }> {
  const out = {} as Record<Rarity, { total: number; unlocked: number }>;
  for (const r of ["common", "uncommon", "rare", "epic", "legendary"] as Rarity[]) {
    const list = ACHIEVEMENTS.filter((a) => a.rarity === r);
    out[r] = {
      total: list.length,
      unlocked: list.filter((a) => state.progress[a.id]?.unlocked).length
    };
  }
  return out;
}

/** 完成度 0-1 */
export function completion(state: AchievementState): number {
  return ACHIEVEMENTS.length > 0 ? unlockedCount(state) / ACHIEVEMENTS.length : 0;
}

/** 序列化 */
export interface AchievementJSON {
  progress: Record<string, AchievementProgress>;
  stats: AchievementStats;
}

export function achToJSON(s: AchievementState): AchievementJSON {
  return {
    progress: Object.fromEntries(
      Object.entries(s.progress).map(([k, v]) => [k, { ...v, uniqueActs: undefined } as never])
    ),
    stats: { ...s.stats, uniqueActs: [...s.stats.uniqueActs] }
  };
}

export function achFromJSON(j: AchievementJSON | null | undefined): AchievementState {
  const base = newAchievementState();
  if (!j || !j.progress) return base;

  const progress: Record<string, AchievementProgress> = {};
  for (const a of ACHIEVEMENTS) {
    const saved = j.progress[a.id];
    progress[a.id] = saved
      ? { ...base.progress[a.id], ...saved }
      : base.progress[a.id];
  }

  return {
    progress,
    stats: { ...emptyStats(), ...(j.stats ?? {}) }
  };
}

/** 统计 */
export function achStats(): {
  total: number;
  byCategory: Record<string, number>;
  byRarity: Record<string, number>;
} {
  const byCategory: Record<string, number> = {};
  const byRarity: Record<string, number> = {};
  for (const a of ACHIEVEMENTS) {
    byCategory[a.category] = (byCategory[a.category] ?? 0) + 1;
    byRarity[a.rarity] = (byRarity[a.rarity] ?? 0) + 1;
  }
  return { total: ACHIEVEMENTS.length, byCategory, byRarity };
}