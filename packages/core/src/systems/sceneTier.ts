/**
 * 剧本分级 —— 区分「重要剧情」与「可生成内容」。
 *
 * 设计原则（对应需求）：
 *  - 重要剧情：主线关键节点、破处、怀孕、分娩、家庭和解等
 *    必须手写，保证质量与一致性，模型不得改动
 *  - 可生成：日常亲热、可重复 H、随机遭遇、差分变体、氛围描写
 *    允许玩家用本地模型生成，也可使用手写兜底
 *
 * 纯函数式。
 */

/** 剧情重要性 */
export type SceneTier =
  | "critical"   // 关键：主线节点、破处、怀孕、分娩、结局 —— 手写锁定
  | "major"      // 重要：羁绊解锁、专属剧情 —— 手写优先，可生成变体
  | "minor"      // 次要：日常亲热、可重复 H —— 可生成
  | "ambient";   // 氛围：环境描写、随机遭遇、闲聊 —— 可生成

export const TIER_LABEL: Record<SceneTier, string> = {
  critical: "关键剧情",
  major: "重要剧情",
  minor: "日常场景",
  ambient: "氛围描写"
};

/** 各等级是否允许模型生成 */
export const TIER_GENERATABLE: Record<SceneTier, boolean> = {
  critical: false,   // 绝不允许
  major: true,       // 允许生成变体，但保留手写
  minor: true,
  ambient: true
};

/** 判定依据：场景 id 前缀 */
const CRITICAL_PREFIXES = [
  "sister_first",   // 姐姐互相破处
  "sister2_first",  // 妹妹初夜
  "mother_first",   // 母亲破主角处女
  "ai_awaken",      // 特殊AI觉醒
];

const MAJOR_PREFIXES = [
  "story_",         // 15 条主线相遇场景
];

/** 场景分级判定 */
export function tierOfScene(sceneId: string): SceneTier {
  if (CRITICAL_PREFIXES.some((p) => sceneId.startsWith(p))) return "critical";
  if (sceneId.includes("pregnant") || sceneId.includes("delivery") || sceneId.includes("birth")) {
    return "critical";
  }
  if (MAJOR_PREFIXES.some((p) => sceneId.startsWith(p))) return "major";
  if (sceneId.startsWith("night_raid") || sceneId.startsWith("daily_") || sceneId.startsWith("repeat_")) {
    return "minor";
  }
  return "ambient";
}

export function canGenerate(sceneId: string): boolean {
  return TIER_GENERATABLE[tierOfScene(sceneId)];
}

/** 生成模式：玩家可选 */
export type GenerationMode =
  | "off"        // 全部使用手写剧本
  | "minor"      // 仅生成日常与氛围（默认推荐）
  | "all";       // 生成除关键剧情外的全部

export const MODE_LABEL: Record<GenerationMode, string> = {
  off: "关闭（全部手写）",
  minor: "仅日常与氛围",
  all: "除关键剧情外全部"
};

/** 按模式判断某场景是否应生成 */
export function shouldGenerate(sceneId: string, mode: GenerationMode): boolean {
  const tier = tierOfScene(sceneId);
  if (tier === "critical") return false; // 任何模式都不生成
  switch (mode) {
    case "off": return false;
    case "minor": return tier === "minor" || tier === "ambient";
    case "all": return true;
  }
}

/** 分级统计 */
export function tierStats(sceneIds: string[]): Record<SceneTier, number> {
  const out: Record<SceneTier, number> = { critical: 0, major: 0, minor: 0, ambient: 0 };
  for (const id of sceneIds) out[tierOfScene(id)]++;
  return out;
}

/** 按分级过滤 */
export function scenesByTier(sceneIds: string[], tier: SceneTier): string[] {
  return sceneIds.filter((id) => tierOfScene(id) === tier);
}

/**
 * 生成提示词时的额外约束（按分级调整）。
 * 关键剧情不生成，重要剧情要求贴合原设定，日常允许自由发挥。
 */
export function tierGuidance(tier: SceneTier): string {
  switch (tier) {
    case "critical":
      return "（关键剧情，不允许生成）";
    case "major":
      return "严格贴合给定场景设定与角色关系，不要新增人物或改变剧情走向。";
    case "minor":
      return "可自由发挥细节与互动方式，但保持角色性格与当前关系阶段。";
    case "ambient":
      return "可自由发挥氛围、环境与闲聊，不必推进剧情。";
  }
}

/** 描述 */
export function describeTier(sceneId: string): string {
  const tier = tierOfScene(sceneId);
  return `${TIER_LABEL[tier]}${TIER_GENERATABLE[tier] ? "（可生成）" : "（手写锁定）"}`;
}
