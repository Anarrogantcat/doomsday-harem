/**
 * 性爱统计系统。
 *
 * 三个必须分清的维度（混在一起数字就会翻倍或对不上）：
 *
 *  1. **方向**：射精有方向。`shots`/`shotInside`… 是「自己射出去」，
 *     `inside`/`inMouth`… 是「身上接受」。主角的内射率看前者，
 *     后宫的被内射率看后者。
 *
 *  2. **插入**：插入同样有方向。`penetrate` 是自己插入对方，
 *     `penetrated` 是被对方插入，并按前庭 / 后庭细分。
 *     主角与姐姐、母亲是双向的，所以两边都要记。
 *
 *  3. **致孕能力**：内射 ≠ 致孕。娱乐型扶她药让后宫可以插入、
 *     可以内射，但精子不具致孕能力；只有怀孕型扶她药才可能让主角受孕。
 *     主角自己的精子始终有效。
 *
 * 同一场行为双边同时记账：主角射出去 → 同伴身上接受；同伴（临时器官）
 * 射出去 → 主角身上接受。见 applyActEvent。
 *
 * 纯函数式，可 JSON 序列化。
 */

import { type ActPart, type ActDirection, actDef } from "./sexActs.ts";

/** 射精落点 */
export type ShotTarget =
  | "none"      // 本次无射精
  | "vagina"    // 射入前庭
  | "anus"      // 射入后庭
  | "mouth"     // 射入口中
  | "facial"    // 射在脸上
  | "breast"    // 射在胸部
  | "outside";  // 射在体外（手 / 腿 / 足）

export const SHOT_LABEL: Record<ShotTarget, string> = {
  none: "无",
  vagina: "内射（前庭）",
  anus: "内射（后庭）",
  mouth: "口爆",
  facial: "颜射",
  breast: "胸射",
  outside: "外射"
};

/** 计入「内射」的落点 */
export const INSIDE_SHOTS: ShotTarget[] = ["vagina", "anus"];

/** 扶她药类型 */
export type MedType = "none" | "recreational" | "pregnant";

/**
 * 每种扶她药对内射与致孕的影响。
 * 娱乐型**可以内射**，只是不具致孕能力 —— 这是设计明确要求的。
 */
export const MED_SHOT_NOTE: Record<MedType, string> = {
  none: "无器官 · 不可插入 · 不可内射",
  recreational: "可插入 · 可内射 · 不致孕",
  pregnant: "可插入 · 可内射 · 可致孕"
};

/** 该药物类型是否让使用者获得致孕能力 */
export function medFertile(med: MedType): boolean {
  return med === "pregnant";
}

/** 该药物类型是否让使用者获得插入 / 内射能力 */
export function medCapable(med: MedType): boolean {
  return med === "recreational" || med === "pregnant";
}

/** 单角色性爱统计 */
export interface SexStats {
  // ---- 通用 ----
  acts: number;
  orgasm: number;
  minutes: number;
  firstDay: number | null;
  lastDay: number | null;

  // ---- 用口 / 用手（区分施受）----
  givenOral: number;
  receivedOral: number;
  givenHand: number;
  receivedHand: number;

  // ---- 插入 ----
  /** 自己插入对方的总次数 */
  penetrate: number;
  /** 自己被对方插入的总次数 */
  penetrated: number;
  penetrateVagina: number;
  penetrateAnus: number;
  penetratedVagina: number;
  penetratedAnus: number;

  // ---- 自己射出去 ----
  shots: number;
  /** 自己内射（射入对方体内） */
  shotInside: number;
  shotOutside: number;
  shotMouth: number;
  shotFacial: number;
  shotBreast: number;

  // ---- 身上接受的落点 ----
  /** 自己被内射 */
  inside: number;
  outside: number;
  inMouth: number;
  facial: number;
  breast: number;

  // ---- 道具与准备 ----
  toys: number;
  lube: number;
  enema: number;
  /** 事后避孕处理次数 */
  contraceptives: number;

  // ---- 后庭专项 ----
  /** 后庭准备流程完成次数（每次走完全部步骤记 1） */
  analPrep: number;
  /** 后庭玩具次数 */
  analToy: number;
  /** 双穴同时次数 */
  analDouble: number;

  // ---- 受精与生育 ----
  /** 内射发生在可致孕条件下的次数 */
  fertilized: number;
  conceived: number;
  births: number;
  children: number;

  // ---- 偏好 ----
  partners: Record<string, number>;
  poses: Record<string, number>;
}

export function newSexStats(): SexStats {
  return {
    acts: 0, orgasm: 0, minutes: 0, firstDay: null, lastDay: null,
    givenOral: 0, receivedOral: 0, givenHand: 0, receivedHand: 0,
    penetrate: 0, penetrated: 0,
    penetrateVagina: 0, penetrateAnus: 0,
    penetratedVagina: 0, penetratedAnus: 0,
    shots: 0, shotInside: 0, shotOutside: 0, shotMouth: 0, shotFacial: 0, shotBreast: 0,
    inside: 0, outside: 0, inMouth: 0, facial: 0, breast: 0,
    toys: 0, lube: 0, enema: 0, contraceptives: 0,
    analPrep: 0, analToy: 0, analDouble: 0,
    fertilized: 0, conceived: 0, births: 0, children: 0,
    partners: {}, poses: {}
  };
}

/** 一次行为的完整上下文 */
export interface ActEvent {
  actId: string;
  day: number;
  minutes: number;
  /** 主角是否具有器官（本作主角恒为扶她） */
  heroFutanari: boolean;
  /** 同伴是否临时获得器官（服用扶她药 / 天生扶她） */
  partnerFutanari: boolean;
  /** 同伴使用的扶她药类型 */
  partnerMedType: MedType;
  /** 主角与否获得致孕能力 */
  heroFutanariFertile: boolean;
  /** 同伴（临时器官）是否具备致孕能力 —— 娱乐型为 false */
  partnerFutanariFertile: boolean;
  /** 主角当前是否处于可受孕状态 */
  heroCanConceive: boolean;
  /** 同伴当前是否处于可受孕状态 */
  partnerCanConceive: boolean;
  heroOrgasm: boolean;
  partnerOrgasm: boolean;
  usedLube: boolean;
  usedToy: boolean;
  usedEnema: boolean;
  /** 是否使用了事后避孕 */
  usedContraceptive: boolean;
}

/** 不产生任何射精的行为 */
const NO_SHOT_ACTS = new Set([
  "anal_prep", "nipple_focus", "breast_play", "restraint_play"
]);

/** 不产生插入的行为（准备与玩具） */
const NO_PENETRATION_ACTS = new Set([
  "anal_prep", "anal_play", "toy_use_partner", "toy_use_self",
  "double_dildo", "strap_on_give", "restraint_play"
]);

/**
 * 本次行为的插入方向。
 *
 *  - `give`    主角插入对方
 *  - `receive` 对方插入主角（需要对方服用了扶她药）
 *  - `mutual`  双方互插
 */
export type PenetrationSide = "hero" | "partner" | "both" | "none";

export function insertionSide(actId: string): PenetrationSide {
  const def = actDef(actId);
  if (!def) return "none";
  if (def.part !== "vagina" && def.part !== "anus") return "none";
  if (NO_PENETRATION_ACTS.has(actId)) return "none";
  switch (def.direction) {
    case "give": return "hero";
    case "receive": return "partner";
    case "mutual": return "both";
    default: return "none";
  }
}

/** 出手方向 */
export interface Sides { giver: boolean; receiver: boolean }

export function sidesFor(dir: ActDirection): { hero: Sides; companion: Sides } {
  switch (dir) {
    case "give":
      return { hero: { giver: true, receiver: false }, companion: { giver: false, receiver: true } };
    case "receive":
      return { hero: { giver: false, receiver: true }, companion: { giver: true, receiver: false } };
    case "mutual":
    case "solo":
      return { hero: { giver: true, receiver: true }, companion: { giver: true, receiver: true } };
  }
}

/**
 * 由行为推导「某一侧」的射精落点。
 *
 * 判定原则：**谁的器官被使用，谁射**。
 *
 *  | 部位            | 射精方                              | 例                              |
 *  |-----------------|-------------------------------------|---------------------------------|
 *  | 前庭 / 后庭     | 插入方（由 insertionSide 决定）      | 正面位 → 主角；后庭（受）→ 对方  |
 *  | 胸（胸交）      | 主角                                | 胸交                            |
 *  | 口 / 手 / 腿/足 | 被服务方（direction 为受的一方）     | 口交（受）→ 主角；口交（施）→ 对方 |
 *
 * 注意：注射 / 内射能力只看是否具备器官，**不要求具备致孕能力**，
 * 因此娱乐型扶她药下的同伴照常输出落点。
 */
export function shotFor(
  actId: string,
  futanari: boolean,
  side: "hero" | "partner"
): ShotTarget {
  if (!futanari) return "none";
  const def = actDef(actId);
  if (!def) return "none";
  if (NO_SHOT_ACTS.has(actId)) return "none";

  const dir = def.direction;
  const isHero = side === "hero";
  const organUsed = isHero
    ? dir === "receive" || dir === "mutual"
    : dir === "give" || dir === "mutual";

  switch (def.part) {
    case "vagina":
    case "anus": {
      const ins = insertionSide(actId);
      const isInserter = (isHero && (ins === "hero" || ins === "both"))
        || (!isHero && (ins === "partner" || ins === "both"));
      if (!isInserter) return "none";
      return def.part === "vagina" ? "vagina" : "anus";
    }
    case "breast":
      // 只有胸交会射在胸上；胸交的器官属于主角
      return actId === "paizuri" && isHero ? "breast" : "none";
    case "mouth":
      return organUsed ? "mouth" : "none";
    case "hand":
    case "thigh":
    case "foot":
      return organUsed ? "outside" : "none";
    case "toy":
    case "tail":
    default:
      return "none";
  }
}

/** 主角视角的射精落点（常用简写） */
export function shotTargetFor(actId: string, futanari: boolean): ShotTarget {
  return shotFor(actId, futanari, "hero");
}

function add(n: number, by = 1): number { return n + by; }

function bumpMap(s: SexStats, key: "partners" | "poses", k: string): void {
  s[key][k] = (s[key][k] ?? 0) + 1;
}

/** 把一个落点记到「自己射出去」那组字段 */
function recordOwnShot(s: SexStats, shot: ShotTarget): void {
  if (shot === "none") return;
  s.shots = add(s.shots);
  if (shot === "vagina" || shot === "anus") s.shotInside = add(s.shotInside);
  else if (shot === "outside") s.shotOutside = add(s.shotOutside);
  else if (shot === "mouth") s.shotMouth = add(s.shotMouth);
  else if (shot === "facial") s.shotFacial = add(s.shotFacial);
  else if (shot === "breast") s.shotBreast = add(s.shotBreast);
}

/**
 * 把一个落点记到「身上接受」那组字段。
 *
 * @param canConceive 受方当前是否可能怀孕（生理可孕 + 易孕窗口）
 * @param shooterFertile 射方精子是否具备致孕能力
 */
function recordReceived(
  s: SexStats, shot: ShotTarget, canConceive: boolean, shooterFertile: boolean
): void {
  if (shot === "none") return;
  if (shot === "vagina" || shot === "anus") {
    s.inside = add(s.inside);
    if (canConceive && shooterFertile) s.fertilized = add(s.fertilized);
  } else if (shot === "outside") s.outside = add(s.outside);
  else if (shot === "mouth") s.inMouth = add(s.inMouth);
  else if (shot === "facial") s.facial = add(s.facial);
  else if (shot === "breast") s.breast = add(s.breast);
}

/** 记插入方向 */
function recordPenetration(
  s: SexStats, part: ActPart | undefined, inserting: boolean
): void {
  if (part !== "vagina" && part !== "anus") return;
  if (inserting) {
    s.penetrate = add(s.penetrate);
    if (part === "vagina") s.penetrateVagina = add(s.penetrateVagina);
    else s.penetrateAnus = add(s.penetrateAnus);
  } else {
    s.penetrated = add(s.penetrated);
    if (part === "vagina") s.penetratedVagina = add(s.penetratedVagina);
    else s.penetratedAnus = add(s.penetratedAnus);
  }
}

/** 通用记账：通用字段 + 施受 + 道具 + 插入 */
function recordCommon(
  s: SexStats, part: ActPart | undefined, side: Sides,
  ev: ActEvent, partnerId: string, orgasm: boolean,
  inserting: boolean | null
): void {
  s.acts = add(s.acts);
  s.minutes = add(s.minutes, ev.minutes);
  if (s.firstDay === null) s.firstDay = ev.day;
  s.lastDay = ev.day;
  if (orgasm) s.orgasm = add(s.orgasm);
  bumpMap(s, "partners", partnerId);
  bumpMap(s, "poses", ev.actId);

  if (part === "mouth") {
    if (side.giver) s.givenOral = add(s.givenOral);
    if (side.receiver) s.receivedOral = add(s.receivedOral);
  }
  if (part === "hand") {
    if (side.giver) s.givenHand = add(s.givenHand);
    if (side.receiver) s.receivedHand = add(s.receivedHand);
  }
  if (part === "toy") s.toys = add(s.toys);
  // 后庭专项：准备、玩具、双穴各自单列，因为这三项在 UI 上是分开显示的
  if (ev.actId === "anal_prep") {
    s.analPrep = add(s.analPrep);
    s.enema = add(s.enema);
  }
  if (ev.actId === "anal_play") {
    s.analToy = add(s.analToy);
    s.toys = add(s.toys);   // 后庭玩具也属于玩具消耗
  }
  if (ev.actId === "anal_double") s.analDouble = add(s.analDouble);

  if (ev.usedToy) s.toys = add(s.toys);
  if (ev.usedLube) s.lube = add(s.lube);
  // 灌肠准备行为本身已经记过一次 enema，避免 usedEnema 重复计数
  if (ev.usedEnema && ev.actId !== "anal_prep") s.enema = add(s.enema);
  if (ev.usedContraceptive) s.contraceptives = add(s.contraceptives);

  if (inserting !== null) recordPenetration(s, part, inserting);
}

/** 一次行为的双边结果 */
export interface ActEventResult {
  hero: SexStats;
  companion: SexStats;
  heroShot: ShotTarget;
  partnerShot: ShotTarget;
  /** 本次插入方向 */
  penetration: PenetrationSide;
}

/**
 * 记录一次行为，同时更新主角与同伴两侧的统计。
 *
 * 为什么不拆两次调用：一场行为对双方是同一次经历，
 * 分开写容易漏掉镜像，出现两侧次数对不上的脏数据。
 *
 * 入参对象**不被修改**，返回全新对象，方便存档快照与回滚。
 */
export function applyActEvent(
  heroStats: SexStats,
  companionStats: SexStats,
  ev: ActEvent,
  heroId: string,
  companionId: string
): ActEventResult {
  const def = actDef(ev.actId);
  const dir: ActDirection = def?.direction ?? "give";
  const sides = sidesFor(dir);
  const pen = insertionSide(ev.actId);

  const heroShot = shotFor(ev.actId, ev.heroFutanari, "hero");
  const partnerShot = shotFor(ev.actId, ev.partnerFutanari, "partner");

  const h: SexStats = {
    ...heroStats,
    partners: { ...heroStats.partners },
    poses: { ...heroStats.poses }
  };
  const c: SexStats = {
    ...companionStats,
    partners: { ...companionStats.partners },
    poses: { ...companionStats.poses }
  };

  // ---- 主角侧 ----
  recordCommon(
    h, def?.part, sides.hero, ev, companionId, ev.heroOrgasm,
    pen === "hero" || pen === "both" ? true
      : pen === "partner" ? false : null
  );
  recordOwnShot(h, heroShot);
  // 同伴射出来的，落在了主角身上（能否致孕看同伴的精子能力）
  recordReceived(h, partnerShot, ev.heroCanConceive, ev.partnerFutanariFertile);

  // ---- 同伴侧（镜像）----
  recordCommon(
    c, def?.part, sides.companion, ev, heroId, ev.partnerOrgasm,
    pen === "partner" || pen === "both" ? true
      : pen === "hero" ? false : null
  );
  recordOwnShot(c, partnerShot);
  // 主角射出来的，落在了同伴身上
  recordReceived(c, heroShot, ev.partnerCanConceive, ev.heroFutanariFertile);

  return { hero: h, companion: c, heroShot, partnerShot, penetration: pen };
}

/** 只更新单侧（供无对象场景，如自慰、AI 观测） */
export function recordSoloAct(s: SexStats, ev: ActEvent, selfId: string): SexStats {
  const def = actDef(ev.actId);
  const pen = insertionSide(ev.actId);
  const out: SexStats = { ...s, partners: { ...s.partners }, poses: { ...s.poses } };
  recordCommon(out, def?.part, { giver: true, receiver: true }, ev, selfId,
    ev.heroOrgasm, pen === "hero" || pen === "both" ? true : null);
  recordOwnShot(out, shotFor(ev.actId, ev.heroFutanari, "hero"));
  return out;
}

/** 记录一次成功受孕 */
export function recordConception(s: SexStats): SexStats {
  return { ...s, conceived: add(s.conceived) };
}

/** 记录一次生产（注意与 haremGrowth 的 recordBirth 区分命名） */
export function recordBirthStat(s: SexStats, children = 1): SexStats {
  return { ...s, births: add(s.births), children: s.children + children };
}

/** 记录一次事后避孕处理 */
export function recordContraceptive(s: SexStats): SexStats {
  return { ...s, contraceptives: add(s.contraceptives) };
}

/** 用生育履历覆盖受精 / 生产计数 */
export function syncPregnancyHistory(
  s: SexStats,
  h: { conceived: number; births: number; children: number }
): SexStats {
  return { ...s, conceived: h.conceived, births: h.births, children: h.children };
}

// ---------- 派生指标 ----------

/** 已解锁行为种数 */
export function unlockedActCount(s: SexStats): number {
  return Object.keys(s.poses).length;
}

/** 身上被射的总次数 */
export function receivedTotal(s: SexStats): number {
  return s.inside + s.outside + s.inMouth + s.facial + s.breast;
}

/** 自己射出去时的内射占比（0-100） */
export function shotInsideRate(s: SexStats): number {
  if (s.shots <= 0) return 0;
  return Math.round((s.shotInside / s.shots) * 100);
}

/** 身上被射时的内射占比（0-100） */
export function receivedInsideRate(s: SexStats): number {
  const tot = receivedTotal(s);
  if (tot <= 0) return 0;
  return Math.round((s.inside / tot) * 100);
}

/** 综合内射占比：有射精记录时看自己射出去的，否则看身上接受的 */
export function insideRate(s: SexStats): number {
  if (s.shots > 0) return shotInsideRate(s);
  return receivedInsideRate(s);
}

/** 平均单次时长（分钟） */
export function avgMinutes(s: SexStats): number {
  if (s.acts <= 0) return 0;
  return Math.round(s.minutes / s.acts);
}

/**
 * 后庭开发度（0-10）。
 *
 * 权重设计：双穴 > 玩具 > 插入 > 准备。
 * 后庭是被动接受度最能体现「开发程度」的部位，所以接受侧权重与插入侧相同，
 * 而不是只数插入次数。
 */
export function analLevel(s: SexStats): number {
  const score = s.analPrep * 3
    + s.penetrateAnus * 2
    + s.penetratedAnus * 2
    + s.analToy * 3
    + s.analDouble * 3;
  return Math.min(10, Math.floor(score / 6));
}

/** 后庭总次数（施 + 受） */
export function analTotal(s: SexStats): number {
  return s.penetrateAnus + s.penetratedAnus;
}

/** 攻受比：插入 / 被插入 */
export function topRatio(s: SexStats): number {
  const tot = s.penetrate + s.penetrated;
  if (tot <= 0) return 0;
  return Math.round((s.penetrate / tot) * 100);
}

function topOf(m: Record<string, number>): { id: string; count: number } | null {
  let best: string | null = null;
  let bestN = 0;
  for (const [k, v] of Object.entries(m)) {
    if (v > bestN) { best = k; bestN = v; }
  }
  return best === null ? null : { id: best, count: bestN };
}

/** 最常配合的体位 / 行为 */
export function favoritePose(s: SexStats): { id: string; count: number } | null {
  return topOf(s.poses);
}

/** 主要对象 */
export function mainPartner(s: SexStats): { id: string; count: number } | null {
  return topOf(s.partners);
}

/** 部位使用次数 */
export function partUsage(s: SexStats): Array<{ part: string; count: number }> {
  return [
    { part: "口", count: s.givenOral + s.receivedOral },
    { part: "前庭", count: s.penetrateVagina + s.penetratedVagina },
    { part: "后庭", count: analTotal(s) + s.analToy + s.analDouble + s.analPrep },
    { part: "手", count: s.givenHand + s.receivedHand },
    { part: "道具", count: s.toys }
  ];
}

// ---------- UI 展示结构 ----------

export interface SexStatsView {
  // 总览
  total: number;
  orgasm: number;
  unlocked: number;
  minutes: number;
  avgMinutes: number;
  firstDay: number | null;
  lastDay: number | null;

  // 插入
  penetrate: number;
  penetrated: number;
  penetrateVagina: number;
  penetrateAnus: number;
  penetratedVagina: number;
  penetratedAnus: number;
  /** 攻受比（插入占比，0-100） */
  topRatio: number;

  // 自己射出去
  shots: number;
  shotInside: number;
  shotOutside: number;
  shotMouth: number;
  shotFacial: number;
  shotBreast: number;
  /** 自己内射率 */
  shotInsideRate: number;

  // 身上接受
  inside: number;
  outside: number;
  inMouth: number;
  facial: number;
  breast: number;
  receivedTotal: number;
  /** 被内射占比 */
  receivedInsideRate: number;
  receiveBJ: number;
  receiveHand: number;

  // 主动
  giveBJ: number;
  giveHand: number;
  toys: number;
  lube: number;
  enema: number;
  contraceptives: number;

  // 后庭专项
  analPrep: number;
  analToy: number;
  analDouble: number;
  analTotal: number;
  analLevel: number;
  /** 后庭准备是否就绪（由会话传入的步骤数决定） */
  prep: string;
  prepReady: boolean;

  // 受精与生育
  fertilized: number;
  conceived: number;
  births: number;
  children: number;
  /** 事后避孕 = 显式计数，缺省时回退为「受精风险 − 成功受孕」 */
  pill: number;

  // 偏好
  partner: string;
  pose: string;
  /** 名册用的单一内射占比 */
  insideRate: number;
}

export interface SexStatsViewNames {
  poseName?: (id: string) => string | undefined;
  partnerName?: (id: string) => string | undefined;
  /** 后庭准备已完成步骤数（0-2）；缺省为 0 */
  analPrepSteps?: number;
  /** 后庭准备总步骤数；缺省为 2 */
  analPrepTotal?: number;
}

/** 生成展示结构 */
export function sexStatsView(s: SexStats, names: SexStatsViewNames = {}): SexStatsView {
  const poseTop = favoritePose(s);
  const partnerTop = mainPartner(s);
  const recv = receivedTotal(s);
  const pill = s.contraceptives > 0
    ? s.contraceptives
    : Math.max(0, s.fertilized - s.conceived);
  const prepSteps = names.analPrepSteps ?? 0;
  const prepTotalN = names.analPrepTotal ?? 2;
  const prepReady = prepSteps >= prepTotalN;
  const prepLabel = prepReady ? "已就绪" : (prepSteps > 0 ? prepSteps + "/" + prepTotalN : "未准备");
  return {
    total: s.acts,
    orgasm: s.orgasm,
    unlocked: unlockedActCount(s),
    minutes: s.minutes,
    avgMinutes: avgMinutes(s),
    firstDay: s.firstDay,
    lastDay: s.lastDay,

    penetrate: s.penetrate,
    penetrated: s.penetrated,
    penetrateVagina: s.penetrateVagina,
    penetrateAnus: s.penetrateAnus,
    penetratedVagina: s.penetratedVagina,
    penetratedAnus: s.penetratedAnus,
    topRatio: topRatio(s),

    shots: s.shots,
    shotInside: s.shotInside,
    shotOutside: s.shotOutside,
    shotMouth: s.shotMouth,
    shotFacial: s.shotFacial,
    shotBreast: s.shotBreast,
    shotInsideRate: shotInsideRate(s),

    inside: s.inside,
    outside: s.outside,
    inMouth: s.inMouth,
    facial: s.facial,
    breast: s.breast,
    receivedTotal: recv,
    receivedInsideRate: receivedInsideRate(s),
    receiveBJ: s.receivedOral,
    receiveHand: s.receivedHand,

    giveBJ: s.givenOral,
    giveHand: s.givenHand,
    toys: s.toys,
    lube: s.lube,
    enema: s.enema,
    contraceptives: s.contraceptives,

    analPrep: s.analPrep,
    analToy: s.analToy,
    analDouble: s.analDouble,
    analTotal: analTotal(s),
    analLevel: analLevel(s),
    prep: prepLabel,
    prepReady,

    fertilized: s.fertilized,
    conceived: s.conceived,
    births: s.births,
    children: s.children,
    pill,

    partner: partnerTop ? (names.partnerName?.(partnerTop.id) ?? partnerTop.id) : "—",
    pose: poseTop
      ? (names.poseName?.(poseTop.id) ?? poseTop.id) + " · " + poseTop.count + " 次"
      : "—",
    insideRate: insideRate(s)
  };
}

/** 一句话汇总 */
export function sexStatsSummary(s: SexStats, name = "该角色"): string {
  if (s.acts <= 0) return `${name}尚无性经验`;
  const parts = [
    `累计亲密 ${s.acts} 次`,
    `高潮 ${s.orgasm} 次`
  ];
  if (s.penetrate > 0 || s.penetrated > 0) {
    parts.push(`插入 ${s.penetrate} / 被插入 ${s.penetrated}`);
  }
  if (s.shots > 0) {
    parts.push(`射精 ${s.shots} 次`, `内射 ${s.shotInside} 次`, `内射率 ${shotInsideRate(s)}%`);
  }
  if (s.inside > 0) parts.push(`被内射 ${s.inside} 次`);
  if (analTotal(s) > 0) parts.push(`后庭 ${analTotal(s)} 次（开发度 Lv${analLevel(s)}）`);
  parts.push(`平均 ${avgMinutes(s)} 分钟`);
  if (s.conceived > 0) parts.push(`受孕 ${s.conceived} 次`);
  return parts.join(" · ");
}

// ---------- JSON ----------

export interface SexStatsJSON {
  a: number; o: number; mi: number; fd: number | null; ld: number | null;
  go: number; ro: number; gh: number; rh: number;
  pen: number; pened: number; pv: number; pa: number; pev: number; pea: number;
  sh: number; si: number; so: number; sm: number; sf: number; sb: number;
  ins: number; out: number; im: number; fa: number; br: number;
  ty: number; lu: number; en: number; cp: number;
  anpr: number; anty: number; andb: number;
  fe: number; co: number; bi: number; ch: number;
  pt: Record<string, number>; po: Record<string, number>;
}

export function sexStatsToJSON(s: SexStats): SexStatsJSON {
  return {
    a: s.acts, o: s.orgasm, mi: s.minutes, fd: s.firstDay, ld: s.lastDay,
    go: s.givenOral, ro: s.receivedOral, gh: s.givenHand, rh: s.receivedHand,
    pen: s.penetrate, pened: s.penetrated,
    pv: s.penetrateVagina, pa: s.penetrateAnus,
    pev: s.penetratedVagina, pea: s.penetratedAnus,
    sh: s.shots, si: s.shotInside, so: s.shotOutside,
    sm: s.shotMouth, sf: s.shotFacial, sb: s.shotBreast,
    ins: s.inside, out: s.outside, im: s.inMouth, fa: s.facial, br: s.breast,
    ty: s.toys, lu: s.lube, en: s.enema, cp: s.contraceptives,
    anpr: s.analPrep, anty: s.analToy, andb: s.analDouble,
    fe: s.fertilized, co: s.conceived, bi: s.births, ch: s.children,
    pt: s.partners, po: s.poses
  };
}

export function sexStatsFromJSON(j: SexStatsJSON | null | undefined): SexStats {
  const base = newSexStats();
  if (!j) return base;
  return {
    acts: j.a ?? 0, orgasm: j.o ?? 0, minutes: j.mi ?? 0,
    firstDay: j.fd ?? null, lastDay: j.ld ?? null,
    givenOral: j.go ?? 0, receivedOral: j.ro ?? 0,
    givenHand: j.gh ?? 0, receivedHand: j.rh ?? 0,
    penetrate: j.pen ?? 0, penetrated: j.pened ?? 0,
    penetrateVagina: j.pv ?? 0, penetrateAnus: j.pa ?? 0,
    penetratedVagina: j.pev ?? 0, penetratedAnus: j.pea ?? 0,
    shots: j.sh ?? 0,
    shotInside: j.si ?? 0, shotOutside: j.so ?? 0,
    shotMouth: j.sm ?? 0, shotFacial: j.sf ?? 0, shotBreast: j.sb ?? 0,
    inside: j.ins ?? 0, outside: j.out ?? 0,
    inMouth: j.im ?? 0, facial: j.fa ?? 0, breast: j.br ?? 0,
    toys: j.ty ?? 0, lube: j.lu ?? 0, enema: j.en ?? 0,
    contraceptives: j.cp ?? 0,
    analPrep: j.anpr ?? 0, analToy: j.anty ?? 0, analDouble: j.andb ?? 0,
    fertilized: j.fe ?? 0, conceived: j.co ?? 0,
    births: j.bi ?? 0, children: j.ch ?? 0,
    partners: j.pt ?? {}, poses: j.po ?? {}
  };
}
