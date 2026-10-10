/**
 * 科技树双轨制。
 *
 * 设计依据（对应需求）：
 *  - 科技树分两类：**共用科技** 与 **主角个人科技**
 *  - 共用科技：后宫科研人员可以参与研究，成果全基地共享
 *  - 主角个人科技：只有主角能研究，效果也只作用于主角
 *  - 科技树解锁本身是主角独享的（只有主角能启动研究）
 *
 * 分类原则：
 *  - 设施/基建/防御/能源/机器人 → 共用
 *  - 自我强化/预知/寿命/扶她相关 → 主角个人
 *  - 制药：部分共用（药品生产）、部分个人（自身改造）
 *
 * 纯函数式。
 */

import type { TechNode, BranchId } from "./branches.ts";
import { BRANCHES } from "./branches.ts";

/** 科技归属 */
export type TechScope =
  | "shared"   // 共用：后宫科研人员可参与，效果全基地共享
  | "personal"; // 主角个人：只有主角能研究，效果只作用于主角

export const SCOPE_LABEL: Record<TechScope, string> = {
  shared: "共用科技",
  personal: "主角个人"
};

export const SCOPE_DESC: Record<TechScope, string> = {
  shared: "后宫科研人员可参与研究，成果全基地共享",
  personal: "只有主角能研究，效果只作用于主角"
};

export const SCOPE_ICON: Record<TechScope, string> = {
  shared: "⇄",
  personal: "★"
};

/**
 * 各分支的默认归属。
 * 单个节点可在下方 SCOPE_OVERRIDES 里覆盖。
 */
export const BRANCH_SCOPE: Record<BranchId, TechScope> = {
  shelter: "shared",     // 避难所：基建，全员受益
  expedition: "shared",  // 远征：房车，全员使用
  self: "personal",      // 自我：主角身体强化
  defense: "shared",     // 防御：工事，全员受益
  robot: "shared",       // 机器人：设施
  energy: "shared",      // 能源：基建
  pharma: "shared",      // 制药：默认共用，个别覆盖
  longevity: "personal"  // 寿命：主角自身
};

/** 单个节点的归属覆盖（默认继承分支） */
export const SCOPE_OVERRIDES: Record<string, TechScope> = {
  // 制药里涉及自身改造的归主角个人
  pharma_selftreat: "personal",
  pharma_futanari: "personal",
  pharma_fertility: "personal",
  // 自我分支里的训练设施归共用
  self_cardio: "personal",
  self_strength: "personal",
  // 机器人里 AI 相关归共用（AI 是全基地的）
  rob_ai_interface: "shared",
  rob_possess: "shared",
  // 寿命里涉及全员的归共用
  longevity_cryo_all: "shared"
};

/** 判定某节点的归属 */
export function nodeScope(node: TechNode, branch: BranchId): TechScope {
  return SCOPE_OVERRIDES[node.id] ?? BRANCH_SCOPE[branch];
}

/** 判定某节点是否可由后宫科研人员参与 */
export function canCompanionResearch(node: TechNode, branch: BranchId): boolean {
  return nodeScope(node, branch) === "shared";
}

/**
 * 科研人员的贡献度。
 *
 * 由同伴的技能与岗位决定：
 *  - 科研相关技能（craft / medical）越高，贡献越大
 *  - 岗位为 lab / archive 时有额外加成
 *  - 贡献度上限低于主角（主角是主导者）
 */
export const COMPANION_RESEARCH_CAP = 0.45;

export function researchContribution(opts: {
  craftLevel: number;
  medicalLevel: number;
  jobId: string | null;
  perkCount: number;
}): number {
  let base = (opts.craftLevel * 0.03) + (opts.medicalLevel * 0.02);

  // 岗位加成
  if (opts.jobId === "lab") base += 0.10;
  else if (opts.jobId === "archive") base += 0.06;

  // 被动增益加成
  base += opts.perkCount * 0.01;

  return Math.max(0, Math.min(COMPANION_RESEARCH_CAP, base));
}

/**
 * 计算含科研人员加成的总研究速率。
 *
 * 主角始终是主导者（至少 1.0），科研人员在此之上叠加，
 * 但总加成有上限，避免人多就无限快。
 */
export const MAX_TEAM_BONUS = 1.5;

export function teamResearchRate(
  heroRate: number,
  contributions: number[]
): { rate: number; bonus: number; contributors: number } {
  const sum = contributions.reduce((s, x) => s + x, 0);
  const bonus = Math.min(MAX_TEAM_BONUS, sum);
  return {
    rate: heroRate * (1 + bonus),
    bonus,
    contributors: contributions.filter((x) => x > 0).length
  };
}

/** 统计科技树双轨分布 */
export function scopeStats(
  allNodes: Array<{ node: TechNode; branch: BranchId }>
): {
  total: number;
  shared: number;
  personal: number;
  byBranch: Record<string, { shared: number; personal: number }>;
} {
  let shared = 0;
  let personal = 0;
  const byBranch: Record<string, { shared: number; personal: number }> = {};

  for (const { node, branch } of allNodes) {
    const scope = nodeScope(node, branch);
    if (scope === "shared") shared++;
    else personal++;

    if (!byBranch[branch]) byBranch[branch] = { shared: 0, personal: 0 };
    byBranch[branch][scope]++;
  }

  return { total: allNodes.length, shared, personal, byBranch };
}

/** 筛选可共用研究的节点 */
export function sharedNodes(
  allNodes: Array<{ node: TechNode; branch: BranchId }>
): Array<{ node: TechNode; branch: BranchId }> {
  return allNodes.filter((x) => nodeScope(x.node, x.branch) === "shared");
}

/** 全部节点及其所属分支 */
export function allNodePairs(): Array<{ node: TechNode; branch: BranchId }> {
  return BRANCHES.flatMap((b) => b.nodes.map((node) => ({ node, branch: b.id })));
}

/** 全部节点的归属映射 */
export function scopeMap(): Record<string, TechScope> {
  const out: Record<string, TechScope> = {};
  for (const { node, branch } of allNodePairs()) {
    out[node.id] = nodeScope(node, branch);
  }
  return out;
}

/** 全局统计（无需参数） */
export function globalScopeStats() {
  return scopeStats(allNodePairs());
}

/** 某分支的归属 */
export function branchScopeOf(branch: BranchId): TechScope {
  return BRANCH_SCOPE[branch];
}
