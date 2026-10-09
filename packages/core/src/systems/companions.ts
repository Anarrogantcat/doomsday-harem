/**
 * 后宫角色数据系统。
 *
 * 设计（对应设定）：
 *  - 21 位基础后宫：15 主线 + 2 附带 + 3 家庭 + 1 特殊AI
 *  - 每位有身份、年龄、身高、体型、性格、特长、专属岗位偏好
 *  - 性格影响：主动程度、欲情增长速率、夜袭倾向、对话风格
 *  - 特长映射到岗位加成
 *  - 非主线后宫走模板库（在 quest.ts 的 RECRUIT_TEMPLATES）
 *
 * 纯函数式，不触碰 IO。
 */

/**
 * 性格类型。
 * 与 harem.ts 的 Personality 保持兼容（bold/shy/reserved/ai/neutral），
 * 并扩展出更细的类别。
 */
export type Personality =
  | "bold"       // 主动强势（姐姐、女战士）
  | "shy"        // 害羞内敛（妹妹、女学生）
  | "reserved"   // 沉默寡言（女猎人、女飞行员）
  | "warm"       // 温柔照顾（母亲、女教师、烘焙师）
  | "proud"      // 高傲（富二代御姐）
  | "devout"     // 虔诚（修女）
  | "artistic"   // 艺术家气质（钢琴家）
  | "practical"  // 务实（药剂师、机械师、外科医生）
  | "neutral"    // 中性
  | "ai";        // AI（特殊）

export const PERSONALITY_LABEL: Record<Personality, string> = {
  bold: "主动强势",
  shy: "害羞内敛",
  reserved: "沉默寡言",
  warm: "温柔照顾",
  proud: "高傲",
  devout: "虔诚",
  artistic: "艺术家气质",
  practical: "务实",
  neutral: "中性",
  ai: "特殊"
};

/** 性格对数值的影响 */
export interface PersonalityTraits {
  /** 欲情每日增长倍率 */
  lustGrowth: number;
  /** 主动邀约阈值（越低越主动） */
  inviteThreshold: number;
  /** 夜袭阈值 */
  raidThreshold: number;
  /** 初始好感修正 */
  affectionBias: number;
  /** 对话风格关键词 */
  tone: string;
  /** 主动找主角时的开场白 */
  approach: string;
  /** 夜袭时的台词 */
  raidLine: string;
}

export const PERSONALITY_TRAITS: Record<Personality, PersonalityTraits> = {
  bold: {
    lustGrowth: 1.4, inviteThreshold: 75, raidThreshold: 85,
    affectionBias: 5,
    tone: "直接、主动、带压迫感",
    approach: "我不管你在忙什么。现在，跟我回房间。",
    raidLine: "别装睡。你心跳这么快。你不动，我自己来。"
  },
  shy: {
    lustGrowth: 0.8, inviteThreshold: 85, raidThreshold: 95,
    affectionBias: 0,
    tone: "犹豫、小声、绕圈子",
    approach: "那个……姐姐，我今天……可以和你一起睡吗？",
    raidLine: "我、我不是故意的……我只是想……"
  },
  reserved: {
    lustGrowth: 0.9, inviteThreshold: 88, raidThreshold: 92,
    affectionBias: -5,
    tone: "简短、少话、用行动代替语言",
    approach: "……跟我来。",
    raidLine: "别说话。"
  },
  warm: {
    lustGrowth: 1.0, inviteThreshold: 80, raidThreshold: 90,
    affectionBias: 10,
    tone: "照顾、包容、以关心为名义",
    approach: "看你累成这样。我帮你放松一下，好不好？",
    raidLine: "别动，让妈妈来。"
  },
  proud: {
    lustGrowth: 1.1, inviteThreshold: 82, raidThreshold: 92,
    affectionBias: -10,
    tone: "居高临下、算账式、偶尔示弱",
    approach: "我算过了。你欠我的时间，现在该还了。",
    raidLine: "这是我应得的。你最好别让我等。"
  },
  devout: {
    lustGrowth: 0.7, inviteThreshold: 90, raidThreshold: 97,
    affectionBias: 5,
    tone: "克制、引用经文、私下好奇心重",
    approach: "我……想问你一件事。不是关于信仰的。",
    raidLine: "这是罪。但我不打算停下。"
  },
  artistic: {
    lustGrowth: 1.2, inviteThreshold: 78, raidThreshold: 88,
    affectionBias: 0,
    tone: "优雅、偏执、追求仪式感",
    approach: "今晚的月色很好。过来，别说话。",
    raidLine: "别动。让我记住你现在的样子。"
  },
  practical: {
    lustGrowth: 1.0, inviteThreshold: 80, raidThreshold: 90,
    affectionBias: 0,
    tone: "冷静、就事论事、用理由包装欲望",
    approach: "从医学角度讲，长期压抑对身体不好。所以……",
    raidLine: "这是必要的。别想太多。"
  },
  ai: {
    lustGrowth: 0.5, inviteThreshold: 70, raidThreshold: 99,
    affectionBias: 25,
    tone: "理性、精确、逐渐情感化",
    approach: "你今天回来晚了四个小时。我没有手，只能一直说——去睡觉。",
    raidLine: "我还没有身体。但我可以等。"
  },
  neutral: {
    lustGrowth: 1.0, inviteThreshold: 82, raidThreshold: 92,
    affectionBias: 0,
    tone: "平常、随和",
    approach: "有空吗？",
    raidLine: "……我睡不着。"
  }
};

/** 岗位专长 */
export type Specialty =
  | "lab" | "medical" | "kitchen" | "greenhouse" | "craft"
  | "patrol" | "drive" | "logistics" | "morale" | "archive" | "training";

/** 角色定义 */
export interface CompanionDef {
  id: string;
  name: string;
  title: string;
  /** 来源：家庭 / 主线 / 附带 / AI */
  origin: "family" | "mainline" | "side" | "ai";
  age: number;
  heightCm: number;
  /** 体型描述 */
  build: string;
  personality: Personality;
  /** 岗位专长与加成 */
  specialties: Array<{ job: Specialty; bonus: number }>;
  /** 初始好感 / 忠诚 / 羁绊 */
  initial: { affection: number; loyalty: number; bond: 1 | 2 | 3 | 4 | 5 };
  /** 初始欲情 */
  initialLust: number;
  /** 是否初始已加入 */
  startsJoined: boolean;
  /** 关联主线 */
  questId?: string;
  /** 备注 */
  note?: string;
  /** 默认着装预设 */
  wardrobePreset: "hero" | "mother" | "sister" | "sister2" | "ai" | "nude";
}

// ============ 21 位基础后宫 ============

export const COMPANIONS: CompanionDef[] = [
  // ---- 家庭（3 人，末日前已在） ----
  {
    id: "mother", name: "母亲", title: "单亲母亲 / 居家设计师",
    origin: "family", age: 45, heightCm: 172,
    build: "成熟丰腴型，E-cup，腰臀比 0.7，保养极好",
    personality: "warm",
    specialties: [{ job: "kitchen", bonus: 0.20 }, { job: "logistics", bonus: 0.10 }],
    initial: { affection: 50, loyalty: 40, bond: 3 },
    initialLust: 40, startsJoined: true,
    wardrobePreset: "mother",
    note: "主角处女的夺取者（用双头龙主动破处）"
  },
  {
    id: "sister", name: "姐姐", title: "企业项目经理",
    origin: "family", age: 26, heightCm: 174,
    build: "御姐型，D-cup，蜂腰翘臀大长腿",
    personality: "bold",
    specialties: [{ job: "logistics", bonus: 0.15 }, { job: "patrol", bonus: 0.10 }],
    initial: { affection: 60, loyalty: 50, bond: 3 },
    initialLust: 92, startsJoined: true,
    wardrobePreset: "sister",
    note: "转变前已有多年特殊感情；互相破处（她用自己的处女换走主角的处男）"
  },
  {
    id: "sister2", name: "妹妹", title: "大学生",
    origin: "family", age: 19, heightCm: 162,
    build: "清纯可爱型，C-cup，纤细柔软",
    personality: "shy",
    specialties: [{ job: "greenhouse", bonus: 0.10 }, { job: "archive", bonus: 0.05 }],
    initial: { affection: 40, loyalty: 30, bond: 2 },
    initialLust: 85, startsJoined: true,
    wardrobePreset: "sister2",
    note: "随机性加入；早已知晓姐姐与主角的互动"
  },

  // ---- 特殊 AI（1 人） ----
  {
    id: "ai", name: "特殊AI", title: "基地核心 / 主角亲手编写",
    origin: "ai", age: 0, heightCm: 0,
    build: "无实体（T6 投影 / T7 附身机器人 / T8 仿生身体）",
    personality: "ai",
    specialties: [{ job: "archive", bonus: 0.20 }, { job: "lab", bonus: 0.15 }],
    initial: { affection: 85, loyalty: 80, bond: 4 },
    initialLust: 30, startsJoined: true,
    wardrobePreset: "ai",
    note: "末日前第 20 天觉醒；编写目的是建造要塞；安全屋建成即接入全基地"
  },

  // ---- 主线后宫（15 人） ----
  {
    id: "teacher", name: "大学女教师", title: "带着学生躲了两个月",
    origin: "mainline", age: 34, heightCm: 166,
    build: "温婉知性，C-cup，气质柔和",
    personality: "warm",
    specialties: [{ job: "training", bonus: 0.25 }, { job: "archive", bonus: 0.20 }],
    initial: { affection: 25, loyalty: 20, bond: 1 },
    initialLust: 25, startsJoined: false,
    questId: "q_teacher", wardrobePreset: "sister",
    note: "附带女学生"
  },
  {
    id: "pharmacist", name: "女药剂师", title: "连锁药店店长",
    origin: "mainline", age: 31, heightCm: 164,
    build: "干练精瘦，B-cup，手脚麻利",
    personality: "practical",
    specialties: [{ job: "lab", bonus: 0.35 }, { job: "medical", bonus: 0.15 }],
    initial: { affection: 25, loyalty: 20, bond: 1 },
    initialLust: 25, startsJoined: false,
    questId: "q_pharmacist", wardrobePreset: "sister"
  },
  {
    id: "nun", name: "修女", title: "教堂志愿者（非神职）",
    origin: "mainline", age: 29, heightCm: 163,
    build: "素净，B-cup，被袍子遮住的身形",
    personality: "devout",
    specialties: [{ job: "archive", bonus: 0.25 }, { job: "morale", bonus: 0.15 }],
    initial: { affection: 25, loyalty: 25, bond: 1 },
    initialLust: 20, startsJoined: false,
    questId: "q_nun", wardrobePreset: "sister"
  },
  {
    id: "idol", name: "前偶像", title: "过气女团成员",
    origin: "mainline", age: 27, heightCm: 165,
    build: "身材管理极好，C-cup，习惯性微笑",
    personality: "artistic",
    specialties: [{ job: "morale", bonus: 0.30 }, { job: "archive", bonus: 0.15 }],
    initial: { affection: 25, loyalty: 20, bond: 1 },
    initialLust: 30, startsJoined: false,
    questId: "q_idol", wardrobePreset: "sister"
  },
  {
    id: "mechanic", name: "女机械师", title: "修车厂老板",
    origin: "mainline", age: 36, heightCm: 168,
    build: "结实有力，A-cup，手臂有肌肉线条",
    personality: "practical",
    specialties: [{ job: "craft", bonus: 0.35 }, { job: "drive", bonus: 0.20 }],
    initial: { affection: 25, loyalty: 20, bond: 1 },
    initialLust: 25, startsJoined: false,
    questId: "q_mechanic", wardrobePreset: "sister"
  },
  {
    id: "hunter", name: "女猎人", title: "山里长大的护林员",
    origin: "mainline", age: 30, heightCm: 170,
    build: "紧致匀称，B-cup，晒成小麦色",
    personality: "reserved",
    specialties: [{ job: "patrol", bonus: 0.30 }, { job: "greenhouse", bonus: 0.15 }],
    initial: { affection: 20, loyalty: 25, bond: 1 },
    initialLust: 20, startsJoined: false,
    questId: "q_hunter", wardrobePreset: "sister"
  },
  {
    id: "pianist", name: "女钢琴家", title: "音乐学院教授",
    origin: "mainline", age: 38, heightCm: 167,
    build: "优雅修长，B-cup，手指很长",
    personality: "artistic",
    specialties: [{ job: "morale", bonus: 0.20 }, { job: "training", bonus: 0.10 }],
    initial: { affection: 25, loyalty: 20, bond: 1 },
    initialLust: 30, startsJoined: false,
    questId: "q_pianist", wardrobePreset: "sister"
  },
  {
    id: "pilot", name: "女飞行员", title: "民航副驾驶",
    origin: "mainline", age: 33, heightCm: 169,
    build: "挺拔，B-cup，有飞行员的站姿",
    personality: "reserved",
    specialties: [{ job: "drive", bonus: 0.30 }, { job: "logistics", bonus: 0.15 }],
    initial: { affection: 20, loyalty: 25, bond: 1 },
    initialLust: 20, startsJoined: false,
    questId: "q_pilot", wardrobePreset: "sister"
  },
  {
    id: "baker", name: "女烘焙师", title: "街角面包店店主",
    origin: "mainline", age: 32, heightCm: 161,
    build: "圆润温暖，C-cup，手臂有面粉痕",
    personality: "warm",
    specialties: [{ job: "kitchen", bonus: 0.25 }, { job: "morale", bonus: 0.15 }],
    initial: { affection: 25, loyalty: 20, bond: 1 },
    initialLust: 25, startsJoined: false,
    questId: "q_baker", wardrobePreset: "sister"
  },
  {
    id: "neighbor", name: "邻居人妻", title: "对门住户 / 丈夫失踪",
    origin: "mainline", age: 35, heightCm: 163,
    build: "柔软，D-cup，习惯性低头",
    personality: "shy",
    specialties: [{ job: "kitchen", bonus: 0.15 }, { job: "greenhouse", bonus: 0.10 }],
    initial: { affection: 25, loyalty: 20, bond: 1 },
    initialLust: 35, startsJoined: false,
    questId: "q_neighbor", wardrobePreset: "mother"
  },
  {
    id: "colleague", name: "前同事", title: "转变前的公司同事",
    origin: "mainline", age: 29, heightCm: 166,
    build: "干练，B-cup，衬衫扣到最上面",
    personality: "practical",
    specialties: [{ job: "logistics", bonus: 0.20 }, { job: "archive", bonus: 0.15 }],
    initial: { affection: 25, loyalty: 20, bond: 1 },
    initialLust: 30, startsJoined: false,
    questId: "q_colleague", wardrobePreset: "sister",
    note: "唯一认识「原来的他」的人"
  },
  {
    id: "librarian", name: "女图书管理员", title: "市图书馆古籍部",
    origin: "mainline", age: 30, heightCm: 160,
    build: "清瘦文静，A-cup，戴眼镜",
    personality: "shy",
    specialties: [{ job: "archive", bonus: 0.25 }, { job: "lab", bonus: 0.15 }],
    initial: { affection: 25, loyalty: 25, bond: 1 },
    initialLust: 20, startsJoined: false,
    questId: "q_librarian", wardrobePreset: "sister"
  },
  {
    id: "heiress", name: "富二代御姐", title: "家族企业继承人",
    origin: "mainline", age: 29, heightCm: 176,
    build: "高挑，C-cup，皮肤保养到不真实",
    personality: "proud",
    specialties: [{ job: "logistics", bonus: 0.30 }, { job: "morale", bonus: 0.15 }],
    initial: { affection: 15, loyalty: 15, bond: 1 },
    initialLust: 25, startsJoined: false,
    questId: "q_heiress", wardrobePreset: "sister",
    note: "唯一末日前后都过得好的人；带来大量高端物资"
  },
  {
    id: "surgeon", name: "女外科医生", title: "三甲医院主治",
    origin: "mainline", age: 37, heightCm: 168,
    build: "利落，B-cup，有消毒水味",
    personality: "practical",
    specialties: [{ job: "medical", bonus: 0.40 }, { job: "lab", bonus: 0.20 }],
    initial: { affection: 25, loyalty: 20, bond: 1 },
    initialLust: 25, startsJoined: false,
    questId: "q_surgeon", wardrobePreset: "sister"
  },
  {
    id: "singlemom", name: "单亲妈妈", title: "母亲的老同学",
    origin: "mainline", age: 42, heightCm: 162,
    build: "疲惫但挺拔，C-cup，手上有茧",
    personality: "warm",
    specialties: [{ job: "greenhouse", bonus: 0.20 }, { job: "kitchen", bonus: 0.15 }],
    initial: { affection: 25, loyalty: 25, bond: 1 },
    initialLust: 25, startsJoined: false,
    questId: "q_singlemom", wardrobePreset: "mother",
    note: "附带女儿"
  },

  // ---- 附带后宫（2 人） ----
  {
    id: "student", name: "女学生", title: "教师带来的学生",
    origin: "side", age: 18, heightCm: 158,
    build: "青涩纤细，B-cup，习惯跟着老师",
    personality: "shy",
    specialties: [{ job: "archive", bonus: 0.15 }, { job: "lab", bonus: 0.10 }],
    initial: { affection: 25, loyalty: 15, bond: 1 },
    initialLust: 15, startsJoined: false,
    questId: "q_teacher", wardrobePreset: "sister2",
    note: "独立攻略对象，与教师的关系会产生互动"
  },
  {
    id: "daughter", name: "女儿", title: "单亲妈妈的女儿",
    origin: "side", age: 19, heightCm: 160,
    build: "早熟的少女感，B-cup，护母心强",
    personality: "shy",
    specialties: [{ job: "greenhouse", bonus: 0.10 }, { job: "patrol", bonus: 0.10 }],
    initial: { affection: 25, loyalty: 20, bond: 1 },
    initialLust: 15, startsJoined: false,
    questId: "q_singlemom", wardrobePreset: "sister2",
    note: "独立攻略对象"
  }
];

const BY_ID = new Map(COMPANIONS.map((x) => [x.id, x]));

export function companionDef(id: string): CompanionDef | undefined {
  return BY_ID.get(id);
}

export function companionsByOrigin(origin: CompanionDef["origin"]): CompanionDef[] {
  return COMPANIONS.filter((x) => x.origin === origin);
}

export function companionsByPersonality(p: Personality): CompanionDef[] {
  return COMPANIONS.filter((x) => x.personality === p);
}

export function companionsByQuest(questId: string): CompanionDef[] {
  return COMPANIONS.filter((x) => x.questId === questId);
}

/** 初始在队的同伴 */
export function startingCompanions(): CompanionDef[] {
  return COMPANIONS.filter((x) => x.startsJoined);
}

/** 统计 */
export function companionStats(): {
  total: number;
  byOrigin: Record<CompanionDef["origin"], number>;
  byPersonality: Record<Personality, number>;
  starting: number;
} {
  const byOrigin = { family: 0, mainline: 0, side: 0, ai: 0 } as Record<CompanionDef["origin"], number>;
  const byPersonality = {} as Record<Personality, number>;
  for (const p of Object.keys(PERSONALITY_LABEL) as Personality[]) byPersonality[p] = 0;

  for (const c of COMPANIONS) {
    byOrigin[c.origin]++;
    byPersonality[c.personality]++;
  }
  return {
    total: COMPANIONS.length,
    byOrigin,
    byPersonality,
    starting: startingCompanions().length
  };
}

/** 性格属性查询 */
export function traitsOf(id: string): PersonalityTraits | undefined {
  const def = companionDef(id);
  return def ? PERSONALITY_TRAITS[def.personality] : undefined;
}

/** 欲情增长（按性格调整） */
export function lustGrowthFor(id: string, base: number): number {
  const t = traitsOf(id);
  return base * (t?.lustGrowth ?? 1);
}

/** 是否达到主动邀约阈值 */
export function shouldInvite(id: string, lust: number, daysSince: number): boolean {
  const t = traitsOf(id);
  if (!t) return false;
  return lust >= t.inviteThreshold && daysSince >= 5;
}

/** 是否达到夜袭阈值 */
export function shouldRaid(id: string, lust: number, daysSince: number): boolean {
  const t = traitsOf(id);
  if (!t) return false;
  return lust >= t.raidThreshold && daysSince >= 10;
}

/** 开场白（按性格） */
export function approachLine(id: string): string {
  return traitsOf(id)?.approach ?? "……";
}

/** 夜袭台词 */
export function raidLine(id: string): string {
  return traitsOf(id)?.raidLine ?? "……";
}

/** 岗位加成查询 */
export function specialtyBonus(id: string, job: Specialty): number {
  const def = companionDef(id);
  if (!def) return 0;
  return def.specialties.find((s) => s.job === job)?.bonus ?? 0;
}

/** 最佳岗位 */
export function bestJobFor(id: string): Specialty | null {
  const def = companionDef(id);
  if (!def || def.specialties.length === 0) return null;
  return def.specialties.slice().sort((a, b) => b.bonus - a.bonus)[0].job;
}

/** 描述文本 */
export function describeCompanion(id: string): string {
  const def = companionDef(id);
  if (!def) return "（未知角色）";
  const t = PERSONALITY_TRAITS[def.personality];
  const jobs = def.specialties.map((s) => `${s.job} +${Math.round(s.bonus * 100)}%`).join("　");
  return [
    `${def.name}（${def.title}）`,
    `${def.age} 岁 / ${def.heightCm}cm / ${def.build}`,
    `性格：${PERSONALITY_LABEL[def.personality]}（${t.tone}）`,
    `专长：${jobs || "无"}`,
    def.note ? `备注：${def.note}` : ""
  ].filter(Boolean).join("\n");
}
