import { intimacyUp, type LustStage } from "./relationship.ts";
import type { Intimacy } from "../components.ts";

export type ParticipationKind =
  | "selfMasturbate"
  | "useToy"
  | "useRecreationalMed"
  | "pairWithOther"
  | "verbalTease"
  | "assist";

export const PARTICIPATION_LABEL: Record<ParticipationKind, string> = {
  selfMasturbate: "自慰旁观",
  useToy: "使用性玩具加入",
  useRecreationalMed: "服用娱乐型扶她药加入",
  pairWithOther: "与另一名同伴互做",
  verbalTease: "言语挑逗",
  assist: "协助主角"
};

export type Personality = "bold" | "shy" | "reserved" | "ai" | "neutral";

/** 在场但未参与的同伴 */
export interface Presence {
  entityId: string;
  name: string;
  lust: number;
  affection: number;
  personality: Personality;
  /** 是否持有性玩具 */
  hasToy: boolean;
  /** 娱乐型扶她药存货 */
  medStock: number;
}

export interface Reaction {
  entityId: string;
  kind: ParticipationKind;
  /** 判定权重，用于日志与调试 */
  weight: number;
}

/**
 * 决定一名在场同伴的参与方式。
 * 规则：
 *  - 欲情越高越可能主动
 *  - 持有玩具 → 可用玩具加入
 *  - 有娱乐型药存货 → 可服药加入
 *  - 性格 shy 更倾向自慰旁观；bold 更倾向直接加入
 *  - 场内有两人以上时，可能互相配对
 */
export function decideReaction(
  p: Presence, opts: { othersPresent: number; roll: number }
): Reaction {
  const candidates: Array<{ kind: ParticipationKind; weight: number }> = [];

  const lustFactor = p.lust / 100;
  const boldness = p.personality === "bold" ? 1.3
    : p.personality === "shy" ? 0.7
    : p.personality === "ai" ? 1.1
    : 1.0;

  candidates.push({ kind: "verbalTease", weight: 1.0 });
  candidates.push({ kind: "selfMasturbate", weight: 1.0 + lustFactor * 1.5 });

  if (p.hasToy) candidates.push({ kind: "useToy", weight: (0.8 + lustFactor * 1.2) * boldness });
  if (p.medStock > 0) candidates.push({ kind: "useRecreationalMed", weight: (0.5 + lustFactor) * boldness });
  if (opts.othersPresent >= 1) candidates.push({ kind: "pairWithOther", weight: 0.6 + lustFactor });
  if (p.personality === "bold" || p.affection >= 80) {
    candidates.push({ kind: "assist", weight: 1.2 * boldness });
  }

  const total = candidates.reduce((s, c) => s + c.weight, 0);
  let acc = 0;
  const target = opts.roll * total;
  for (const c of candidates) {
    acc += c.weight;
    if (target <= acc) return { entityId: p.entityId, kind: c.kind, weight: c.weight };
  }
  const last = candidates[candidates.length - 1];
  return { entityId: p.entityId, kind: last.kind, weight: last.weight };
}

/** 玩家在多人场景中的实时选项 */
export type PlayerChoice = "accept" | "makeHerWait" | "letHerPlay" | "refuse";

export const PLAYER_CHOICE_LABEL: Record<PlayerChoice, string> = {
  accept: "接受加入",
  makeHerWait: "让她稍等（先做完）",
  letHerPlay: "让她自己玩",
  refuse: "拒绝"
};

export interface ChoiceOutcome {
  /** 好感变化 —— 拒绝时恒为 0 */
  affectionDelta: number;
  /** 欲情变化 */
  lustDelta: number;
  /** 是否升级为多人场景 */
  becomesMulti: boolean;
  /** 是否转为旁观 */
  becomesObserver: boolean;
  note: string;
}

export function applyPlayerChoice(choice: PlayerChoice, kind: ParticipationKind): ChoiceOutcome {
  switch (choice) {
    case "accept":
      return { affectionDelta: 3, lustDelta: -100, becomesMulti: true, becomesObserver: false, note: "场景升级为多人" };
    case "makeHerWait":
      return { affectionDelta: 0, lustDelta: 5, becomesMulti: false, becomesObserver: true, note: "她先等着" };
    case "letHerPlay":
      return { affectionDelta: 2, lustDelta: -100, becomesMulti: false, becomesObserver: false, note: "让她自己解决" };
    case "refuse":
      return {
        affectionDelta: 0, // 铁律：拒绝永不扣好感
        lustDelta: 10,
        becomesMulti: false,
        becomesObserver: true,
        note: kind === "useToy" ? "她把玩具放下了" : "她退到一边看着"
      };
  }
}

/** 后宫互交：两名同伴之间发生关系，只允许娱乐型扶她药 */
export function haremIntimacy(
  intimacy: Intimacy, aId: string, bId: string, medType: "none" | "recreational"
): { intimacy: Intimacy; blocked: boolean; reason?: string } {
  if ((medType as string) === "pregnant") {
    return { intimacy, blocked: true, reason: "INV-2：后宫之间的互动禁止使用怀孕型扶她药" };
  }
  let next = intimacyUp(intimacy, bId, 5);
  next = intimacyUp(next, aId, 5);
  return { intimacy: next, blocked: false };
}

/** 由欲情阶段推导该同伴的主动行为 */
export function proactiveAction(stage: LustStage): "none" | "hint" | "invite" | "nightRaid" | "forced" {
  return stage;
}

export const PROACTIVE_DESCRIPTION: Record<string, string> = {
  none: "无主动行为",
  hint: "主动暗示：靠近、穿得少、肢体接触",
  invite: "主动邀约：直接开口或拉进房间（可拒绝）",
  nightRaid: "夜袭榨精：深夜潜入（无拒绝选项）",
  forced: "强制触发：无论何时何地必定发生"
};
