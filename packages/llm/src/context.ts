/**
 * 从 GameSession 构建完整的提示词上下文。
 *
 * 这一步是关键：把角色性格、着装、关系、姿势、道具全部传进去，
 * 避免模型凭空捏造（穿错衣服、用错性格、搞混说话人）。
 */
import {
  type GameSession, type Scene,
  companionDef, PERSONALITY_TRAITS, PERSONALITY_LABEL,
  exposure, describe as describeWardrobe
} from "@doomsday/core";
import type { ScenePromptContext, ParticipantContext } from "./prompt.ts";

export interface BuildContextOptions {
  scene: Scene;
  /** 主导方（决定 role 标注） */
  dominant?: string;
  /** 旁观者列表 */
  observers?: string[];
  /** 可用道具 */
  props?: string[];
  /** 指定姿势 */
  pose?: string;
  /** 要求节拍数 */
  beatCount?: number;
  /** 本场走向 */
  direction?: string;
  /** 额外要求 */
  extra?: string;
}

/** 从会话状态构建单个参与者的上下文 */
export function buildParticipant(
  session: GameSession,
  name: string,
  role?: string
): ParticipantContext {
  const c = session.findCompanion(name);
  const isHero = name === "主角" || name === session.hero.identity.name;

  if (!c && isHero) {
    // 主角：同样给出性格与语气，避免模型对主角的处理不一致
    const h = session.hero;
    const outfit = session.outfitOf("hero");
    const phys: string[] = [];
    if (h.physiology.virgin) phys.push("初次");
    if (h.physiology.pregnant) phys.push(`已怀孕 ${Math.floor(h.pregnancy?.progress ?? 0)} 天`);
    return {
      name,
      title: h.identity.title,
      role: role ?? "主角",
      personality: "扶她御姐",
      tone: "克制、内敛、偶尔流露主导欲",
      voiceSample: "……好。",
      relation: `欲情 ${Math.round(h.lust.value)} / 体力 ${Math.round(h.survival.stamina)}`,
      physiology: phys.length > 0 ? phys.join("；") : undefined,
      outfit: outfit?.describe,
      exposure: outfit?.exposure
    };
  }

  if (!c) {
    // 既不是主角也不是已知同伴：给最小上下文，不猜测
    return { name, role };
  }

  const def = companionDef(c.id);
  const traits = def ? PERSONALITY_TRAITS[def.personality] : null;
  const outfit = session.outfitOf(c.id);

  const physiology: string[] = [];
  if (c.physiology.virgin) physiology.push("初次");
  if (c.physiology.pregnant) physiology.push(`已怀孕 ${Math.floor(c.physiology.pregnancyProgress)} 天`);
  if (!c.joined) physiology.push("尚未加入队伍");

  return {
    name: c.identity.name,
    title: c.identity.title,
    role,
    personality: def ? `${PERSONALITY_LABEL[def.personality]}` : undefined,
    tone: traits?.tone,
    voiceSample: traits?.approach,
    relation: `好感 ${Math.round(c.relationship.affection)} / 忠诚 ${Math.round(c.relationship.loyalty)} / 羁绊 Lv${c.relationship.bond} / 欲情 ${Math.round(c.lust.value)}`,
    physiology: physiology.length > 0 ? physiology.join("；") : undefined,
    outfit: outfit?.describe ?? describeWardrobe(c.wardrobe),
    exposure: outfit?.exposure ?? exposure(c.wardrobe)
  };
}

/** 构建完整场景上下文 */
export function buildSceneContext(
  session: GameSession,
  opt: BuildContextOptions
): ScenePromptContext {
  const participants: ParticipantContext[] = [];

  for (const name of opt.scene.participants) {
    const isObserver = opt.observers?.includes(name);
    const isDominant = opt.dominant === name;
    const role = isObserver ? "旁观者（只观察与反应，不参与主要行为）"
      : isDominant ? "主导方"
      : name === "主角" ? "主角"
      : "承受方";

    participants.push(buildParticipant(session, name, role));
  }

  // 场景内提到但不在 participants 里的同伴（如旁观者）
  for (const name of opt.observers ?? []) {
    if (!participants.some((p) => p.name === name)) {
      participants.push(buildParticipant(session, name, "旁观者（只观察与反应，不参与主要行为）"));
    }
  }

  const h = Math.floor(session.time.minute / 60);
  const m = session.time.minute % 60;

  return {
    sceneId: opt.scene.id,
    title: opt.scene.title,
    tone: opt.scene.tone,
    participants,
    props: opt.props,
    pose: opt.pose,
    beatCount: opt.beatCount,
    priorBeats: opt.scene.beats.slice(0, 2).map((b) => b.lines[0]?.text ?? "").filter(Boolean),
    direction: opt.direction ?? opt.scene.tone,
    time: `第${session.time.day}天 ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
    location: session.here()?.name ?? "安全屋",
    extra: opt.extra
  };
}