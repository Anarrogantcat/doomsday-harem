import {
  BRANCHES, BRANCH_NAMES, allNodes, findNode,
  type BranchId, type TechNode
} from "./branches.ts";

export interface TechState {
  unlocked: Set<string>;
  /** 当前研究中的节点 → 已投入工时 */
  researching: { nodeId: string; hours: number } | null;
  /** 已投入但未完成的其他节点进度 */
  progress: Map<string, number>;
}

export function newTechState(): TechState {
  return { unlocked: new Set(), researching: null, progress: new Map() };
}

export function isUnlocked(s: TechState, id: string): boolean {
  return s.unlocked.has(id);
}

/** 前置是否全部满足 */
export function prereqsMet(s: TechState, node: TechNode): boolean {
  return node.requires.every((r) => s.unlocked.has(r));
}

export type LockReason = "ok" | "unlocked" | "missing-prereq" | "missing-resource";

export interface Availability {
  ok: boolean;
  reason: LockReason;
  missingPrereqs: string[];
  missingResources: string[];
}

export function checkAvailability(
  s: TechState, nodeId: string, resources: Record<string, number>
): Availability {
  const node = findNode(nodeId);
  if (!node) {
    return { ok: false, reason: "missing-prereq", missingPrereqs: [nodeId], missingResources: [] };
  }
  if (s.unlocked.has(nodeId)) {
    return { ok: true, reason: "unlocked", missingPrereqs: [], missingResources: [] };
  }
  const missingPrereqs = node.requires.filter((r) => !s.unlocked.has(r));
  if (missingPrereqs.length > 0) {
    return { ok: false, reason: "missing-prereq", missingPrereqs, missingResources: [] };
  }
  const missingResources = Object.entries(node.cost)
    .filter(([res, need]) => (resources[res] ?? 0) < need)
    .map(([res]) => res);
  if (missingResources.length > 0) {
    return { ok: false, reason: "missing-resource", missingPrereqs: [], missingResources };
  }
  return { ok: true, reason: "ok", missingPrereqs: [], missingResources: [] };
}

export function canUnlock(s: TechState, nodeId: string, resources: Record<string, number>): boolean {
  return checkAvailability(s, nodeId, resources).ok;
}

export function unlock(s: TechState, nodeId: string): TechState {
  const next: TechState = {
    unlocked: new Set(s.unlocked),
    researching: s.researching,
    progress: new Map(s.progress)
  };
  next.unlocked.add(nodeId);
  next.progress.delete(nodeId);
  return next;
}

/** 一次性解锁某分支到指定层级（作弊器用） */
export function unlockBranchToTier(s: TechState, branchId: BranchId, tier: number): TechState {
  const branch = BRANCHES.find((b) => b.id === branchId);
  if (!branch) return s;
  const next: TechState = {
    unlocked: new Set(s.unlocked),
    researching: s.researching,
    progress: new Map(s.progress)
  };
  // 逐层解锁，确保前置链完整
  for (let t = 1; t <= tier; t++) {
    for (const node of branch.nodes.filter((x) => x.tier === t)) {
      if (node.requires.every((r) => next.unlocked.has(r))) next.unlocked.add(node.id);
    }
  }
  return next;
}

/** 全解锁（作弊器用） */
export function unlockAll(s: TechState): TechState {
  return {
    unlocked: new Set(allNodes().map((x) => x.id)),
    researching: null,
    progress: new Map()
  };
}

export function reset(s: TechState): TechState {
  return newTechState();
}

export interface ResearchTick {
  state: TechState;
  completed: string | null;
}

/**
 * 推进研究。rate 为效率倍率（岗位加成等），instant 为秒完成（作弊器）。
 */
export function tickResearch(s: TechState, hours: number, rate = 1, instant = false): ResearchTick {
  if (!s.researching) return { state: s, completed: null };
  const node = findNode(s.researching.nodeId);
  if (!node) return { state: { ...s, researching: null }, completed: null };

  const added = instant ? node.hours : hours * rate;
  const total = s.researching.hours + added;

  if (total >= node.hours) {
    const next = unlock(s, node.id);
    return { state: { ...next, researching: null }, completed: node.id };
  }
  return { state: { ...s, researching: { nodeId: node.id, hours: total } }, completed: null };
}

export function startResearch(s: TechState, nodeId: string): TechState {
  return { ...s, researching: { nodeId, hours: s.progress.get(nodeId) ?? 0 } };
}

/** 汇总所有已解锁节点的数值加成 */
export function aggregateBonuses(s: TechState): Record<string, number> {
  const out: Record<string, number> = {};
  for (const id of s.unlocked) {
    const node = findNode(id);
    if (!node?.bonus) continue;
    for (const [k, v] of Object.entries(node.bonus)) {
      // 乘法类加成按乘积累乘，加法类累加
      if (k.endsWith("Mult")) out[k] = (out[k] ?? 1) * v;
      else out[k] = (out[k] ?? 0) + v;
    }
  }
  return out;
}

export interface BranchProgress {
  branch: BranchId;
  name: string;
  unlocked: number;
  total: number;
  maxTier: number;
  percent: number;
}

export function branchProgress(s: TechState): BranchProgress[] {
  return BRANCHES.map((b) => {
    const unlocked = b.nodes.filter((x) => s.unlocked.has(x.id)).length;
    const total = b.nodes.length;
    const maxTier = b.nodes.filter((x) => s.unlocked.has(x.id)).reduce((m, x) => Math.max(m, x.tier), 0);
    return {
      branch: b.id,
      name: BRANCH_NAMES[b.id],
      unlocked,
      total,
      maxTier,
      percent: total === 0 ? 0 : Math.round((unlocked / total) * 100)
    };
  });
}

/** 按层级列出某分支的节点，附带解锁状态 */
export function branchView(s: TechState, branchId: BranchId) {
  const b = BRANCHES.find((x) => x.id === branchId);
  if (!b) return [];
  return b.nodes
    .slice()
    .sort((x, y) => x.tier - y.tier)
    .map((node) => ({
      node,
      unlocked: s.unlocked.has(node.id),
      available: prereqsMet(s, node)
    }));
}
