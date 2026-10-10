/**
 * 铁律与不变式注册表。
 *
 * 为什么要有这个文件：
 *   本作有 15 条铁律（L-1~L-15）与 8 条不变式（INV-1~INV-8），
 *   此前它们只存在于设计文档里，代码中散落着零散判定。
 *   一旦要新增一条，就得同时在 5 个地方改 —— 必然漏。
 *
 * 这里把「铁律」数据化为**单一来源**：
 *   - 元数据（编号 / 名称 / 说明 / 落地位置）集中声明
 *   - 校验函数按 id 注册，可动态增补
 *   - 校验器只跑注册表，不写死任何一条
 *
 * 未来新增铁律只需两件事：
 *   1) 在本文件 LAWS 数组里加一条记录
 *   2) 若有校验逻辑，注册进相应的 registry
 *
 * 纯函数式，零 IO。
 */

// ============ 铁律 ============

/** 铁律分类 */
export type LawCategory =
  | "exclusivity"   // 独占：后宫专属
  | "worldview"     // 世界观：病毒 / 性别
  | "physiology"    // 生理：处女 / 受孕
  | "dominance"     // 支配：调教 / 淫纹
  | "enemy"         // 敌对：敌人相关
  | "narrative";    // 叙事：血脉 / 称谓

export const LAW_CATEGORY_LABEL: Record<LawCategory, string> = {
  exclusivity: "独占",
  worldview: "世界观",
  physiology: "生理",
  dominance: "支配",
  enemy: "敌对",
  narrative: "叙事"
};

/** 落地状态 */
export type LawStatus = "decided" | "planned" | "implemented";

export const LAW_STATUS_LABEL: Record<LawStatus, string> = {
  decided: "已定未做",
  planned: "已规划",
  implemented: "已落地"
};

export interface LawDef {
  /** 编号，如 "L-1" */
  id: string;
  /** 标题 */
  name: string;
  /** 完整语义（决定内容） */
  rule: string;
  category: LawCategory;
  status: LawStatus;
  /** 落地位置（文件:行 或模块名） */
  targets: string[];
  /** 关联不变式 */
  invariants?: string[];
}

/**
 * 十五条铁律。
 *
 * 顺序即优先级：L-1 是底线，越往后越是玩法扩展。
 */
export const LAWS: LawDef[] = [
  {
    id: "L-1", name: "禁止同伴被侵犯 / 被展示",
    rule: "同伴不得被侵犯、被展示给外部实体。主角自己与敌人的性内容允许（主角是当事人，非视角反转 NTR）。",
    category: "exclusivity", status: "decided",
    targets: ["systems/branchEvents.ts:193"],
    invariants: ["INV-7", "INV-8"]
  },
  {
    id: "L-2", name: "旧关系必须不可逆",
    rule: "「丈夫失踪」一律改为不可逆措辞（已故 / 爆发初期去世）。失踪会埋下「他还会回来」的钩子。",
    category: "exclusivity", status: "decided",
    targets: ["systems/companions.ts:314", "systems/quest.ts:228",
             "data/scripts/story_neighbor.dsl", "data/scripts/q_neighbor_s2.dsl"]
  },
  {
    id: "L-3", name: "敌人全部女性",
    rule: "末日病毒导致男性消失，全世界只存在女性。一切 NPC（战斗 / 交易 / 剧情）一律女性。",
    category: "worldview", status: "decided",
    targets: ["systems/combat.ts", "data/scripts/", "docs/世界观.md"]
  },
  {
    id: "L-4", name: "处女规则",
    rule: "非人妻后宫全为处女；有过伴侣者最多 3 人。同样适用于敌人（未与主角发生过关系前为处女）。",
    category: "physiology", status: "decided",
    targets: ["runtime/session.ts:281", "systems/companions.ts"]
  },
  {
    id: "L-5", name: "「人妻」定义",
    rule: "「人妻」= 有过伴侣的女性。mother + singlemom + neighbor = 正好 3 人，名额卡满。",
    category: "physiology", status: "decided",
    targets: ["systems/companions.ts", "runtime/session.ts:281"]
  },
  {
    id: "L-6", name: "男性消失跨度",
    rule: "男性消失跨度 = 几个月到一年（渐进灭绝，非瞬间）。序章预知剧情与敌人构成依此展开。",
    category: "worldview", status: "decided",
    targets: ["docs/世界观.md", "systems/prologue.ts"]
  },
  {
    id: "L-7", name: "主角 × 女性敌人",
    rule: "主角可与女性敌人发生性关系，主角为受方（被榨精）。与后宫的可攻可受定位一致。",
    category: "enemy", status: "decided",
    targets: ["systems/combat.ts", "runtime/session.ts"],
    invariants: ["INV-6"]
  },
  {
    id: "L-8", name: "存活者全员出众",
    rule: "敌人全部相貌身材出众；不出众者已在末日中死亡。使「全员好看」成为世界观必然。",
    category: "worldview", status: "decided",
    targets: ["systems/combat.ts", "systems/companions.ts"]
  },
  {
    id: "L-9", name: "后宫互交",
    rule: "后宫之间可以发生关系，但全员忠于主角、爱主角。仅限娱乐型扶她药。",
    category: "exclusivity", status: "decided",
    targets: ["systems/harem.ts"],
    invariants: ["INV-1", "INV-2"]
  },
  {
    id: "L-10", name: "敌人性爱统计",
    rule: "女性敌人也拥有完整的性爱统计，与后宫同结构同字段。",
    category: "enemy", status: "decided",
    targets: ["systems/sexStats.ts", "runtime/session.ts", "save/serialize.ts"]
  },
  {
    id: "L-11", name: "敌人受孕",
    rule: "女性敌人也有概率怀孕。后代恒为女性，不生成可攻略实体，只记 children 计数。",
    category: "enemy", status: "decided",
    targets: ["systems/pregnancy.ts", "systems/combat.ts"],
    invariants: ["INV-4"]
  },
  {
    id: "L-12", name: "主角可调教后宫",
    rule: "主角可以调教后宫。服从度提升，好感/忠诚不受影响（只升不降）。",
    category: "dominance", status: "decided",
    targets: ["components.ts", "systems/harem.ts"],
    invariants: ["INV-1"]
  },
  {
    id: "L-13", name: "双向调教白名单",
    rule: "仅姐姐与母亲可与主角互相调教，其余同伴为单向。落在既定的「可攻可受」设定内。",
    category: "dominance", status: "decided",
    targets: ["systems/companions.ts", "systems/harem.ts"]
  },
  {
    id: "L-14", name: "魅魔血脉",
    rule: "主角拥有魅魔血脉 —— 这是她变成扶她的原因。只走叙事，不给独立数值，INV-6 保持完整。",
    category: "narrative", status: "decided",
    targets: ["docs/世界观.md", "tech/branches.ts"],
    invariants: ["INV-6"]
  },
  {
    id: "L-15", name: "淫纹",
    rule: "主角可赋予后宫淫纹。效果：欲情 / 羁绊 / 远程感知 / 服从度，均可关闭。三条硬约束：只能主角赋予、不可移除、无他人可激活机制。",
    category: "dominance", status: "decided",
    targets: ["components.ts", "systems/harem.ts", "render/rig.ts"],
    invariants: ["INV-1", "INV-7"]
  }
];

/** 按 id 取铁律 */
export function lawDef(id: string): LawDef | undefined {
  return LAWS.find((l) => l.id === id);
}

export function lawsByCategory(c: LawCategory): LawDef[] {
  return LAWS.filter((l) => l.category === c);
}

export function lawsByStatus(s: LawStatus): LawDef[] {
  return LAWS.filter((l) => l.status === s);
}

/** 铁律编号连续性自检（防止新增时跳号/重号） */
export function lawIdGaps(): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const l of LAWS) {
    if (seen.has(l.id)) out.push(`重复：${l.id}`);
    seen.add(l.id);
  }
  const nums = LAWS.map((l) => Number(l.id.replace("L-", ""))).sort((a, b) => a - b);
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] !== i + 1) {
      out.push(`缺号或跳号：期望 L-${i + 1}，实际 L-${nums[i]}`);
      break;
    }
  }
  return out;
}

// ============ 不变式 ============

export interface InvariantDef {
  id: string;
  name: string;
  /** 一句话描述 */
  rule: string;
  /** 校验时机：存档校验 / 运行时事件 / 两者 */
  when: "save" | "runtime" | "both";
}

/**
 * 八条不变式。
 *
 * INV-1 ~ INV-6 已实现（save/serialize.ts）；
 * INV-7 / INV-8 待实现（见 NTR-1 / NTR-2 待办）。
 */
export const INVARIANTS: InvariantDef[] = [
  { id: "INV-0", name: "主角唯一", rule: "主角实体必须恰好 1 个", when: "save" },
  { id: "INV-1", name: "数值只升不降", rule: "好感 / 忠诚只升不降，越界即视为扣减", when: "both" },
  { id: "INV-2", name: "后宫禁怀孕型扶她药", rule: "后宫之间的互动禁止使用怀孕型扶她药", when: "runtime" },
  { id: "INV-3", name: "扶她药必须临时", rule: "扶她药效果必须是临时的，需设置到期时间", when: "runtime" },
  { id: "INV-4", name: "后代恒为女性", rule: "后代性别恒为 female（后宫与敌人所生皆然）", when: "both" },
  { id: "INV-5", name: "夜袭无拒绝", rule: "夜袭场景不得提供拒绝选项", when: "runtime" },
  { id: "INV-6", name: "扶她不入战斗数值", rule: "扶她特性与魅魔血脉不得参与战斗数值", when: "both" },
  { id: "INV-7", name: "同伴专属独占", rule: "同伴只能与主角或其他同伴发生关系，不得与任何非后宫实体发生", when: "runtime" },
  { id: "INV-8", name: "敌意实体无性向互动", rule: "敌方 / 俘虏者 / 外部势力不得与后宫产生亲密内容（含暗示）", when: "runtime" }
];

export function invariantDef(id: string): InvariantDef | undefined {
  return INVARIANTS.find((i) => i.id === id);
}

// ============ 参与者白名单校验（INV-7 落地）============

/** 参与者角色类型 */
export type ParticipantKind = "hero" | "companion" | "enemy" | "outsider";

export interface Participant {
  id: string;
  kind: ParticipantKind;
}

export interface Violation {
  code: string;
  message: string;
  detail?: unknown;
}

/**
 * INV-7 / INV-8 的核心校验：三类白名单。
 *
 * 规则（L-1 + L-7 + L-9 + L-10 合并后的语义）：
 *
 *   ✅ 主角 ↔ 女性敌人    允许（L-7）
 *   ✅ 后宫 ↔ 后宫        允许（L-9）
 *   ✅ 主角 ↔ 后宫        允许
 *   ❌ 敌人 ↔ 同伴        禁止（这才是 NTR）
 *   ❌ 敌人 ↔ 敌人        禁止（无主角参与）
 *   ❌ 任何 outsider      禁止
 *
 * 关键约束：**敌人参与的性场景必须包含主角**。
 */
export function checkParticipants(participants: Participant[]): Violation[] {
  const out: Violation[] = [];
  if (participants.length === 0) {
    return [{ code: "INV-7", message: "场景参与者为空" }];
  }

  const kinds = new Set(participants.map((p) => p.kind));
  const hasHero = kinds.has("hero");
  const hasCompanion = kinds.has("companion");
  const hasEnemy = kinds.has("enemy");
  const hasOutsider = kinds.has("outsider");

  if (hasOutsider) {
    out.push({
      code: "INV-7",
      message: "场景包含非后宫实体（外部者），禁止",
      detail: participants.filter((p) => p.kind === "outsider").map((p) => p.id)
    });
  }

  // 敌人 × 同伴 —— 这是 NTR，最高优先级
  if (hasEnemy && hasCompanion) {
    out.push({
      code: "INV-7",
      message: "敌人与同伴不得同场发生性内容（NTR）",
      detail: {
        enemies: participants.filter((p) => p.kind === "enemy").map((p) => p.id),
        companions: participants.filter((p) => p.kind === "companion").map((p) => p.id)
      }
    });
  } else if (hasEnemy && !hasHero) {
    // 没有同伴搅和，但敌人参与却没带主角 → 无主角参与，同样非法
    out.push({
      code: "INV-7",
      message: "敌人参与的性场景必须包含主角",
      detail: participants.filter((p) => p.kind === "enemy").map((p) => p.id)
    });
  } else if (!hasHero && !hasCompanion) {
    // 没有任何后宫成员
    out.push({ code: "INV-7", message: "场景必须至少包含主角或一位同伴" });
  }

  return out;
}

/** 被掳 / 被俘状态下的性内容校验（L-1 + INV-8） */
export interface CaptiveContext {
  /** 该项是否处于被掳/被俘状态 */
  captive: boolean;
  /** 该场景的主体是同伴还是主角 */
  subject: "hero" | "companion";
  /** 场景是否含性内容 */
  sexual: boolean;
}

export function checkCaptiveRule(ctx: CaptiveContext): Violation[] {
  if (!ctx.sexual || !ctx.captive) return [];
  if (ctx.subject === "companion") {
    return [{
      code: "INV-8",
      message: "同伴处于被掳 / 被俘状态时，不得产生任何性内容"
    }];
  }
  // 主角被俘：L-1 已放宽，允许与敌人的性内容，但要确保对象是敌人
  return [];
}

// ============ 旧关系校验（L-2 / L-5）============

export interface PartnerHistory {
  id: string;
  name: string;
  /** 是否有过伴侣 */
  hadPartner: boolean;
  /** 伴侣现状描述 */
  fate?: string;
}

/** 不可逆措辞白名单（L-2） */
export const IRREVERSIBLE_FATES = [
  "已故", "去世", "死亡", "死", "没了", "已不在", "爆发初期"
] as const;

/** 触发「可能回来」的措辞黑名单（L-2） */
export const REVERSIBLE_FATES = [
  "失踪", "走失", "失联", "下落不明", "离开", "走了", "没回来", "找不到"
] as const;

/** 有过伴侣者上限（L-4 / L-5） */
export const PARTNER_HISTORY_LIMIT = 3;

export function checkPartnerFate(fate: string): Violation[] {
  const out: Violation[] = [];
  for (const bad of REVERSIBLE_FATES) {
    if (fate.includes(bad)) {
      out.push({
        code: "L-2",
        message: `旧关系措辞「${bad}」暗示可能回归，须改为不可逆措辞`,
        detail: { fate, allowed: IRREVERSIBLE_FATES }
      });
      break;
    }
  }
  return out;
}

export function checkPartnerHistoryLimit(list: PartnerHistory[]): Violation[] {
  const withPartner = list.filter((p) => p.hadPartner);
  if (withPartner.length > PARTNER_HISTORY_LIMIT) {
    return [{
      code: "L-4",
      message: `有过伴侣者 ${withPartner.length} 人，超过上限 ${PARTNER_HISTORY_LIMIT} 人`,
      detail: withPartner.map((p) => p.id)
    }];
  }
  return [];
}

// ============ NTR 词汇扫描（供测试使用）============

/**
 * 禁止词表。
 *
 * 用于 ntr-guard 测试扫描源码与剧本 —— 一旦命中即说明
 * 有人写出了可能滑向 NTR 的内容。
 */
export const NTR_FORBIDDEN_TERMS: Array<{ term: string; reason: string }> = [
  { term: "强暴", reason: "侵犯" },
  { term: "强奸", reason: "侵犯" },
  { term: "轮奸", reason: "侵犯" },
  { term: "卖淫", reason: "肉体交易" },
  { term: "援交", reason: "肉体交易" },
  { term: "沦为", reason: "归属转移" },
  { term: "别人的女人", reason: "归属转移" },
  { term: "已经是他的人", reason: "归属转移" },
  { term: "调教成", reason: "归属转移（外部调教）" },
  { term: "驯服", reason: "归属转移" },
  { term: "归属权", reason: "归属转移" },
  { term: "所有权", reason: "归属转移" },
  { term: "男匪", reason: "他方男性" },
  { term: "男兵", reason: "他方男性" },
  { term: "其他男人", reason: "他方男性" }
];

export interface TermHit {
  term: string;
  reason: string;
  line: number;
  text: string;
}

/** 扫描一段文本是否含禁止词（供测试调用） */
export function scanForbiddenTerms(source: string): TermHit[] {
  const out: TermHit[] = [];
  const lines = source.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    for (const f of NTR_FORBIDDEN_TERMS) {
      if (lines[i].includes(f.term)) {
        out.push({ term: f.term, reason: f.reason, line: i + 1, text: lines[i].trim().slice(0, 120) });
      }
    }
  }
  return out;
}

// ============ 汇总 ============

export interface LawsSummary {
  laws: number;
  invariants: number;
  byCategory: Record<string, number>;
  byStatus: Record<string, number>;
  /** 待实现的不变式数量 */
  pendingInvariants: number;
}

export function lawsSummary(): LawsSummary {
  const byCategory: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  for (const l of LAWS) {
    byCategory[l.category] = (byCategory[l.category] ?? 0) + 1;
    byStatus[l.status] = (byStatus[l.status] ?? 0) + 1;
  }
  return {
    laws: LAWS.length,
    invariants: INVARIANTS.length,
    byCategory,
    byStatus,
    // INV-7 / INV-8 尚未落地
    pendingInvariants: INVARIANTS.filter((i) => i.id === "INV-7" || i.id === "INV-8").length
  };
}

/** 一条铁律是否已被代码完整落地 */
export function lawImplemented(id: string): boolean {
  return lawDef(id)?.status === "implemented";
}
