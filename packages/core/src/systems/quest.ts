/**
 * 主线与招募系统。
 *
 * 设计（对应设定）：
 *  - 主线只用于解锁后宫，与科技树完全独立
 *  - 每条主线 3-5 步，可随时中断后续接
 *  - 主线不是唯一解锁途径：救援事件/随机遭遇也能获得后宫
 *  - 15 条主线，每条对应一位后宫，附带奖励（非科技）
 *  - 附带后宫（女学生、女儿）随主线一同加入
 *
 * 纯函数式，不触碰 IO。
 */

/** 主线阶段 */
export type QuestStage = 0 | 1 | 2 | 3 | 4 | 5;

/** 主线步骤定义 */
export interface QuestStepDef {
  stage: QuestStage;
  name: string;
  description: string;
  /** 需要前往的区域（可选） */
  region?: string;
  /** 需要的物品（可选） */
  requiresItems?: Record<string, number>;
  /** 需要的最低好感（可选，用于羁绊类步骤） */
  minAffection?: number;
  /** 完成后给予的物品 */
  rewardItems?: Record<string, number>;
  /** 完成后提升的好感 */
  rewardAffection?: number;
  /** 完成后设置的标志 */
  setFlag?: string;
  /** 是否需要战斗判定 */
  combat?: { danger: number };
}

/** 主线定义 */
export interface QuestDef {
  id: string;
  /** 对应后宫 id */
  companionId: string;
  companionName: string;
  companionTitle: string;
  title: string;
  summary: string;
  /** 触发条件：需要的标志 */
  requiresFlags?: string[];
  /** 触发条件：需要的最低好感（用于家庭线） */
  requiresAffection?: number;
  /** 步骤 */
  steps: QuestStepDef[];
  /** 完成后附带加入的同伴（如女学生、女儿） */
  grantsCompanions?: Array<{ id: string; name: string; title: string }>;
  /** 完成奖励（非科技） */
  rewards: string[];
}

/** 主线运行时状态 */
export interface QuestState {
  id: string;
  stage: QuestStage;
  started: boolean;
  completed: boolean;
  /** 中断标记 */
  paused: boolean;
  /**
   * 尚未发放的好感奖励。
   * 主线解锁的同伴在完成前可能还没加入队伍，此时奖励先暂存，
   * 待同伴加入后由会话补发，避免奖励丢失。
   */
  pendingAffection?: number;
}

// ============ 主线目录（15 条） ============

const step = (
  stage: QuestStage, name: string, description: string,
  opts: Partial<Omit<QuestStepDef, "stage" | "name" | "description">> = {}
): QuestStepDef => ({ stage, name, description, ...opts });

export const QUESTS: QuestDef[] = [
  {
    id: "q_teacher",
    companionId: "teacher",
    companionName: "大学女教师",
    companionTitle: "带着学生躲了两个月",
    title: "废都幸存者",
    summary: "电台里有一段重复了四十七遍的求救信号，坐标指向城南大学。",
    steps: [
      step(1, "定位信号源", "在通讯室分析信号，确定发射位置。", { region: "home", setFlag: "teacher_signal_found" }),
      step(2, "穿越丧尸区", "穿过两公里的高密度丧尸区抵达教学楼。", { region: "school", combat: { danger: 3 } }),
      step(3, "救出被困者", "她抱着一个学生的书包，手里攥着消防斧。", { region: "school", setFlag: "teacher_rescued" }),
      step(4, "护送回基地", "回程路上她一直回头看那栋楼。", { region: "home", rewardAffection: 20 }),
      step(5, "安顿与加入", "她开始整理鞋柜，说以后作息由她管。", { region: "home", setFlag: "teacher_joined" })
    ],
    grantsCompanions: [{ id: "student", name: "女学生", title: "18 岁，教师带来的学生" }],
    rewards: ["女学生（独立后宫）"]
  },
  {
    id: "q_pharmacist",
    companionId: "pharmacist",
    companionName: "女药剂师",
    companionTitle: "连锁药店店长",
    title: "荒野医生",
    summary: "废弃诊所里留着一份医疗记录，指向城东的药品仓库。",
    steps: [
      step(1, "解读记录", "医疗记录提到一批未拆封的原料药。", { region: "hospital", setFlag: "pharm_notes" }),
      step(2, "前往药品仓库", "仓库在药店后巷，门口有翻倒的货架。", { region: "suburb", combat: { danger: 2 } }),
      step(3, "击退劫匪", "三个守着一批止痛药的人。", { region: "suburb", combat: { danger: 3 } }),
      step(4, "劝她加入", "她说她只管配药，不管别的。", { region: "home", rewardAffection: 25, setFlag: "pharmacist_joined" })
    ],
    rewards: ["私藏配方笔记（剧情物品）", "高级制药前置"]
  },
  {
    id: "q_nun",
    companionId: "nun",
    companionName: "修女",
    companionTitle: "教堂志愿者",
    title: "山脚下的回声",
    summary: "山脚的老教堂里还有人在点蜡烛。",
    steps: [
      step(1, "调查教堂", "蜡烛是新的，灰烬是热的。", { region: "rural_east", setFlag: "nun_found" }),
      step(2, "与她交谈", "她说她在给所有没被埋葬的人记账。", { region: "rural_east", rewardAffection: 15 }),
      step(3, "帮忙清理", "清理教堂后的墓园。", { region: "rural_east", combat: { danger: 2 } }),
      step(4, "邀请同行", "她说她需要一个能放账本的地方。", { region: "home", setFlag: "nun_joined" })
    ],
    rewards: ["手写末日纪事（剧情道具）"]
  },
  {
    id: "q_idol",
    companionId: "idol",
    companionName: "前偶像",
    companionTitle: "过气女团成员",
    title: "最后的广播",
    summary: "通讯塔收到一段加密广播，是电台里循环播放的旧歌。",
    steps: [
      step(1, "破译广播", "歌词里夹着坐标。", { region: "home", setFlag: "idol_signal" }),
      step(2, "定位发射源", "山顶电台，覆盖半个城市。", { region: "radio_station", combat: { danger: 4 } }),
      step(3, "击败精英敌人", "电台里有一队占据发射塔的人。", { region: "radio_station", combat: { danger: 5 } }),
      step(4, "她的坚守", "她一个人在电台守了几个月，只为把歌播出去。", { region: "radio_station", rewardAffection: 25, setFlag: "idol_joined" })
    ],
    rewards: ["旧演出录像（可播放，提升全员心情）", "远程通讯升级模块"]
  },
  {
    id: "q_mechanic",
    companionId: "mechanic",
    companionName: "女机械师",
    companionTitle: "修车厂老板",
    title: "扳手与机油",
    summary: "西区工业园里有间修车厂，卷帘门半开着。",
    steps: [
      step(1, "接近修车厂", "厂里有金属摩擦的声音。", { region: "industrial_west", setFlag: "mech_found" }),
      step(2, "清理威胁", "几只被困在车间的变异兽。", { region: "industrial_west", combat: { danger: 4 } }),
      step(3, "交谈", "她修了二十年车，手上有洗不掉的机油味。", { region: "industrial_west", rewardAffection: 20 }),
      step(4, "带上工具", "她只带了一个工具箱，说别的都不重要。", { region: "home", setFlag: "mechanic_joined" })
    ],
    rewards: ["她的旧工具箱（可修复房车）"]
  },
  {
    id: "q_hunter",
    companionId: "hunter",
    companionName: "女猎人",
    companionTitle: "山里长大的护林员",
    title: "沉默的幸存者",
    summary: "北侧林子里有独立生存的痕迹，但没有营地。",
    steps: [
      step(1, "追踪足迹", "足迹很轻，是刻意留下的。", { region: "forest_north", setFlag: "hunter_tracks" }),
      step(2, "持续追踪", "她一直在绕圈，在测试你是否值得信任。", { region: "forest_north" }),
      step(3, "相遇", "她从树上下来，手里没有武器。", { region: "forest_north", rewardAffection: 20 }),
      step(4, "外围定居", "她同意在基地外围定居，不进山。", { region: "home", setFlag: "hunter_joined" })
    ],
    rewards: ["采集点地图"]
  },
  {
    id: "q_pianist",
    companionId: "pianist",
    companionName: "女钢琴家",
    companionTitle: "音乐学院教授",
    title: "废墟中的歌者",
    summary: "旧剧院里传出隐约的钢琴声。",
    steps: [
      step(1, "循声前往", "剧院的门是开着的，幕布还挂着。", { region: "theater", setFlag: "pianist_found" }),
      step(2, "找到她", "她在舞台上弹一架走了音的立式钢琴。", { region: "theater", rewardAffection: 15 }),
      step(3, "取回遗物", "她的乐谱留在音乐学院的琴房。", { region: "school", combat: { danger: 3 } }),
      step(4, "护送回基地", "她说基地需要一个能让人安静下来的地方。", { region: "home", setFlag: "pianist_joined" })
    ],
    rewards: ["可搬回的立式钢琴（基地设施，纯氛围）"]
  },
  {
    id: "q_pilot",
    companionId: "pilot",
    companionName: "女飞行员",
    companionTitle: "民航副驾驶",
    title: "黑箱",
    summary: "小型机场跑道上有一架歪斜的小飞机。",
    steps: [
      step(1, "搜索残骸", "驾驶舱是空的，但副驾驶座有血迹。", { region: "airfield", setFlag: "pilot_crash" }),
      step(2, "找到幸存者", "她在机库的维修间里，腿受了伤。", { region: "airfield", setFlag: "pilot_found" }),
      step(3, "救治", "需要医疗物资与担架。", { region: "airfield", requiresItems: { "medical_supply": 10, "bandage": 5 } }),
      step(4, "护送回基地", "她一路上都在看天。", { region: "home", rewardAffection: 20, setFlag: "pilot_joined" })
    ],
    rewards: ["坠机点残骸坐标（可回收物资点）", "解锁飞行器"]
  },
  {
    id: "q_baker",
    companionId: "baker",
    companionName: "女烘焙师",
    companionTitle: "街角面包店店主",
    title: "面包与黄油",
    summary: "城南居民区有家面包店，橱窗碎了但烤炉还是热的。",
    steps: [
      step(1, "进入面包店", "面粉的味道盖过了外面的腐味。", { region: "suburb", setFlag: "baker_found" }),
      step(2, "与她交谈", "她已经三天没吃东西，但先把面包给了你。", { region: "suburb", rewardAffection: 20 }),
      step(3, "护送回基地", "她说她留下来是因为烤箱还能用。", { region: "home", setFlag: "baker_joined" })
    ],
    rewards: ["她手写的配方本（基地烘焙氛围设施）"]
  },
  {
    id: "q_neighbor",
    companionId: "neighbor",
    companionName: "邻居人妻",
    companionTitle: "对门住户",
    title: "隔壁的女人",
    summary: "老城区商业街旁的居民楼，有一户还亮着灯。",
    steps: [
      step(1, "敲门", "门从里面反锁，但有人应声。", { region: "adult_district", setFlag: "neighbor_found" }),
      step(2, "她开门", "她丈夫末日后失踪，她一直没敢出门。", { region: "adult_district", rewardAffection: 15 }),
      step(3, "帮她搬家", "她只带了一个行李箱。", { region: "home", setFlag: "neighbor_joined" })
    ],
    rewards: ["她家遗留的物资钥匙"]
  },
  {
    id: "q_colleague",
    companionId: "colleague",
    companionName: "前同事",
    companionTitle: "转变前的公司同事",
    title: "旧识",
    summary: "市中心的写字楼里，有人在用办公设备打印东西。",
    steps: [
      step(1, "进入写字楼", "电梯停了，只能走楼梯。", { region: "downtown", combat: { danger: 4 } }),
      step(2, "找到她", "她在自己的工位上，打印机还在吐纸。", { region: "downtown", setFlag: "colleague_found" }),
      step(3, "坦诚", "她认识「原来的你」。她需要时间接受。", { region: "downtown", rewardAffection: 25 }),
      step(4, "带她回基地", "她说她需要一个能继续工作的地方。", { region: "home", setFlag: "colleague_joined" })
    ],
    rewards: ["主角转变前的旧照片（剧情物品）"]
  },
  {
    id: "q_librarian",
    companionId: "librarian",
    companionName: "女图书管理员",
    companionTitle: "市图书馆古籍部",
    title: "书页之间",
    summary: "大学图书馆的还书箱里有一摞没被搬走的书。",
    steps: [
      step(1, "进入图书馆", "书架倒了一半，但古籍区的柜子是锁着的。", { region: "school", setFlag: "librarian_found" }),
      step(2, "找到钥匙", "她把钥匙藏在了目录卡里。", { region: "school" }),
      step(3, "与她交谈", "她说她留下来是为了把书搬到干燥的地方。", { region: "school", rewardAffection: 20 }),
      step(4, "运送书籍", "需要额外的载重。", { region: "home", requiresItems: { "cloth": 10 }, setFlag: "librarian_joined" })
    ],
    rewards: ["一批未损毁的旧档案（基地图书角设施）"]
  },
  {
    id: "q_heiress",
    companionId: "heiress",
    companionName: "富二代御姐",
    companionTitle: "家族企业继承人",
    title: "云端之上",
    summary: "半山腰的私人度假别墅，是她的。",
    steps: [
      step(1, "发现别墅", "围栏完好，车道上有两辆抛锚的车。", { region: "hillside", setFlag: "heiress_found" }),
      step(2, "见面", "她站在二楼阳台上，问你是谁。", { region: "hillside", rewardAffection: 10 }),
      step(3, "谈判", "她不缺物资，缺的是能让她留下来的理由。", { region: "hillside", rewardAffection: 20 }),
      step(4, "加入", "她说她算过，基地三个月的物资缺口是 47%。", { region: "home", setFlag: "heiress_joined" })
    ],
    rewards: ["她别墅的地下储藏室钥匙（大量高端物资）"]
  },
  {
    id: "q_surgeon",
    companionId: "surgeon",
    companionName: "女外科医生",
    companionTitle: "三甲医院主治",
    title: "医生",
    summary: "市立医院的手术室灯还亮着。",
    steps: [
      step(1, "进入医院", "急诊大厅的灯还在闪。", { region: "hospital", combat: { danger: 4 } }),
      step(2, "找到她", "她刚做完一台没做完的手术，手套还没摘。", { region: "hospital", setFlag: "surgeon_found" }),
      step(3, "劝她离开", "她说她不能把病人留在这里。", { region: "hospital", rewardAffection: 25 }),
      step(4, "回基地", "她需要一间能做手术的屋子。", { region: "home", requiresItems: { "surgical_kit": 1 }, setFlag: "surgeon_joined" })
    ],
    rewards: ["她的手术器械箱"]
  },
  {
    id: "q_singlemom",
    companionId: "singlemom",
    companionName: "单亲妈妈",
    companionTitle: "母亲的老同学",
    title: "母亲的朋友",
    summary: "母亲提起她有个老同学住在东郊农庄。",
    steps: [
      step(1, "前往农庄", "农庄的温室骨架还在。", { region: "rural_east", setFlag: "singlemom_found" }),
      step(2, "找到她", "她带着女儿，靠一口井和几畦菜活着。", { region: "rural_east", rewardAffection: 20 }),
      step(3, "说服她", "她说她不能带着孩子冒险。", { region: "rural_east", requiresItems: { "canned_food": 10 } }),
      step(4, "搬家", "她女儿先跑进了车里。", { region: "home", setFlag: "singlemom_joined" })
    ],
    grantsCompanions: [{ id: "daughter", name: "女儿", title: "19 岁，单亲妈妈的女儿" }],
    rewards: ["女儿（独立后宫）"]
  },
  // ---- 家庭线（深化羁绊，非解锁） ----
  {
    id: "q_mother",
    companionId: "mother",
    companionName: "母亲",
    companionTitle: "单亲母亲",
    title: "母亲的过去",
    summary: "母亲在老照片背后写了一行字，字迹被水洇过。",
    requiresFlags: ["sister_first_done"],
    requiresAffection: 70,
    steps: [
      step(1, "发现旧物", "她在整理箱子时把一张照片掉在地上。", { region: "home", setFlag: "mother_past_start" }),
      step(2, "听她讲", "她讲起年轻时一个人带三个孩子的事。", { region: "home", rewardAffection: 15 }),
      step(3, "陪她回故地", "她想回老房子看一眼。", { region: "suburb", combat: { danger: 2 } }),
      step(4, "羁绊加深", "回来的路上她一直没说话。", { region: "home", rewardAffection: 20, setFlag: "mother_bond_up" })
    ],
    rewards: ["母亲专属对话与互动选项"]
  },
  {
    id: "q_sister2",
    companionId: "sister2",
    companionName: "妹妹",
    companionTitle: "大学生",
    title: "姐妹之间",
    summary: "妹妹的日记本掉在客厅，翻到了某一页。",
    requiresFlags: ["sister_first_done"],
    requiresAffection: 60,
    steps: [
      step(1, "发现秘密", "日记里写着她早就知道你和姐姐的事。", { region: "home", setFlag: "sister2_secret" }),
      step(2, "坦诚交谈", "她说她一直在等一个机会。", { region: "home", rewardAffection: 20 }),
      step(3, "她的选择", "她说她也想要。", { region: "home", setFlag: "sister2_joined" })
    ],
    rewards: ["妹妹专属 H 场景"]
  }
];

const BY_ID = new Map(QUESTS.map((x) => [x.id, x]));

export function questDef(id: string): QuestDef | undefined {
  return BY_ID.get(id);
}

export function questForCompanion(companionId: string): QuestDef | undefined {
  return QUESTS.find((q) => q.companionId === companionId);
}

export function questsByReward(keyword: string): QuestDef[] {
  return QUESTS.filter((q) => q.rewards.some((r) => r.includes(keyword)));
}

// ============ 运行时状态 ============

export function newQuestStates(): Record<string, QuestState> {
  const out: Record<string, QuestState> = {};
  for (const q of QUESTS) {
    out[q.id] = { id: q.id, stage: 0, started: false, completed: false, paused: false };
  }
  return out;
}

export function questState(states: Record<string, QuestState>, id: string): QuestState | undefined {
  return states[id];
}

/** 当前步骤定义 */
export function currentStep(def: QuestDef, st: QuestState): QuestStepDef | null {
  if (st.completed) return null;
  const next = def.steps.find((s) => s.stage === st.stage + 1);
  return next ?? null;
}

/** 进度文本 */
export function progressText(def: QuestDef, st: QuestState): string {
  if (st.completed) return "已完成";
  if (!st.started) return "未开始";
  const s = currentStep(def, st);
  return s ? `第 ${s.stage}/${def.steps.length} 步：${s.name}` : "等待推进";
}

export type QuestLockReason =
  | "ok" | "completed" | "missing-flag" | "low-affection" | "wrong-region"
  | "missing-items" | "paused";

export interface QuestCheck {
  ok: boolean;
  reason: QuestLockReason;
  missingFlags: string[];
  missingItems: Record<string, number>;
  needAffection: number;
  currentAffection: number;
  regionOk: boolean;
}

export interface QuestContext {
  /** 已设置的标志 */
  flags: Record<string, unknown>;
  /** 当前区域 */
  region: string;
  /** 背包+仓库的库存查询 */
  countOf: (itemId: string) => number;
  /** 与目标的当前好感 */
  affection: number;
  /** 是否暂停 */
  paused: boolean;
}

/** 检查下一步是否可执行 */
export function checkStep(def: QuestDef, st: QuestState, ctx: QuestContext): QuestCheck {
  const s = currentStep(def, st);
  const base: QuestCheck = {
    ok: false, reason: "ok", missingFlags: [], missingItems: {},
    needAffection: 0, currentAffection: ctx.affection, regionOk: true
  };
  if (st.completed || !s) return { ...base, reason: "completed" };
  if (ctx.paused) return { ...base, reason: "paused" };

  // 区域
  const regionOk = !s.region || s.region === ctx.region;
  if (!regionOk) return { ...base, reason: "wrong-region", regionOk: false };

  // 物品
  const missingItems: Record<string, number> = {};
  for (const [id, n] of Object.entries(s.requiresItems ?? {})) {
    const have = ctx.countOf(id);
    if (have < n) missingItems[id] = n - have;
  }
  if (Object.keys(missingItems).length > 0) {
    return { ...base, reason: "missing-items", missingItems, regionOk };
  }

  // 好感
  if (s.minAffection !== undefined && ctx.affection < s.minAffection) {
    return { ...base, reason: "low-affection", needAffection: s.minAffection, regionOk };
  }

  // 起始条件（仅第一步）
  if (!st.started) {
    const missingFlags = (def.requiresFlags ?? []).filter((f) => !ctx.flags[f]);
    if (missingFlags.length > 0) {
      return { ...base, reason: "missing-flag", missingFlags, regionOk };
    }
    if (def.requiresAffection !== undefined && ctx.affection < def.requiresAffection) {
      return { ...base, reason: "low-affection", needAffection: def.requiresAffection, regionOk };
    }
  }

  return { ...base, ok: true, reason: "ok", missingItems, regionOk };
}

export interface StepResult {
  states: Record<string, QuestState>;
  /** 推进后的阶段 */
  newStage: QuestStage;
  /** 完成的步骤 */
  step: QuestStepDef | null;
  /** 是否整条主线完成 */
  questCompleted: boolean;
  /** 给予的物品 */
  rewardItems: Record<string, number>;
  /** 提升的好感 */
  rewardAffection: number;
  /** 设置的标志 */
  setFlag: string | null;
  /** 附带加入的同伴 */
  grantsCompanions: Array<{ id: string; name: string; title: string }>;
  /** 完成奖励描述 */
  rewards: string[];
}

/** 推进主线一步 */
export function advanceQuest(
  states: Record<string, QuestState>,
  def: QuestDef,
  ctx: QuestContext
): StepResult {
  const st = states[def.id];
  const empty: StepResult = {
    states, newStage: st?.stage ?? 0, step: null, questCompleted: false,
    rewardItems: {}, rewardAffection: 0, setFlag: null, grantsCompanions: [], rewards: []
  };
  if (!st) return empty;

  const check = checkStep(def, st, ctx);
  if (!check.ok) return empty;

  const s = currentStep(def, st)!;
  const newStage = (st.stage + 1) as QuestStage;
  // 执行完最后一步即完成；也兼容 steps 编号与数量不一致的情况
  const isLast = newStage >= def.steps.length;

  const next: QuestState = {
    ...st,
    stage: newStage,
    started: true,
    completed: isLast,
    pendingAffection: (st.pendingAffection ?? 0) + (s.rewardAffection ?? 0)
  };

  return {
    states: { ...states, [def.id]: next },
    newStage,
    step: s,
    questCompleted: isLast,
    rewardItems: s.rewardItems ?? {},
    rewardAffection: s.rewardAffection ?? 0,
    setFlag: s.setFlag ?? null,
    grantsCompanions: isLast ? (def.grantsCompanions ?? []) : [],
    rewards: isLast ? def.rewards : []
  };
}

/** 暂停 / 继续（可随时中断后续接） */
export function pauseQuest(states: Record<string, QuestState>, id: string): Record<string, QuestState> {
  const st = states[id];
  if (!st) return states;
  return { ...states, [id]: { ...st, paused: true } };
}

export function resumeQuest(states: Record<string, QuestState>, id: string): Record<string, QuestState> {
  const st = states[id];
  if (!st) return states;
  return { ...states, [id]: { ...st, paused: false } };
}

/** 放弃并重置（保留已完成） */
export function resetQuest(states: Record<string, QuestState>, id: string): Record<string, QuestState> {
  const st = states[id];
  if (!st) return states;
  if (st.completed) return states;
  return { ...states, [id]: { id, stage: 0, started: false, completed: false, paused: false } };
}

// ============ 招募（非主线途径） ============

/** 随机遭遇的后宫类型库 */
export interface RecruitTemplate {
  id: string;
  name: string;
  title: string;
  kind: "rescue" | "camp" | "explore" | "special";
  /** 出现区域标签 */
  regions: string[];
  /** 基础好感 */
  baseAffection: number;
  /** 特长描述 */
  trait: string;
}

export const RECRUIT_TEMPLATES: RecruitTemplate[] = [
  { id: "r_heiress", name: "财阀千金", title: "被困别墅", kind: "rescue", regions: ["hillside"], baseAffection: 20, trait: "物资调度" },
  { id: "r_scholar", name: "大学研究员", title: "被困研究所", kind: "rescue", regions: ["lab_underground"], baseAffection: 25, trait: "研究加速" },
  { id: "r_nurse", name: "护士长", title: "被困诊所", kind: "rescue", regions: ["hospital"], baseAffection: 25, trait: "医疗辅助" },
  { id: "r_vet", name: "兽医", title: "被困宠物医院", kind: "rescue", regions: ["suburb"], baseAffection: 20, trait: "医疗辅助" },
  { id: "r_veteran", name: "退役女兵", title: "据点守卫", kind: "camp", regions: ["military_checkpoint"], baseAffection: 15, trait: "战斗训练" },
  { id: "r_cop", name: "女警", title: "最后值班", kind: "camp", regions: ["downtown"], baseAffection: 15, trait: "巡逻警戒" },
  { id: "r_blacksmith", name: "铁匠", title: "手工作坊", kind: "explore", regions: ["industrial_west"], baseAffection: 20, trait: "装备加工" },
  { id: "r_watchmaker", name: "钟表匠", title: "精密手艺", kind: "explore", regions: ["adult_district"], baseAffection: 20, trait: "精密加工" },
  { id: "r_farmer", name: "农场主", title: "守着土地", kind: "explore", regions: ["rural_east"], baseAffection: 20, trait: "温室种植" },
  { id: "r_florist", name: "花店老板", title: "残存的花", kind: "explore", regions: ["suburb"], baseAffection: 18, trait: "温室种植" },
  { id: "r_dancer", name: "舞者", title: "最后的舞台", kind: "rescue", regions: ["theater"], baseAffection: 22, trait: "士气与心情" },
  { id: "r_painter", name: "画家", title: "墙上的画", kind: "explore", regions: ["school"], baseAffection: 18, trait: "士气与心情" },
  { id: "r_twins", name: "双胞胎", title: "姐妹档", kind: "special", regions: ["residential"], baseAffection: 30, trait: "组合技能" },
  { id: "r_sisters", name: "姐妹档", title: "相依为命", kind: "special", regions: ["rural_east"], baseAffection: 28, trait: "组合技能" },
  { id: "r_fisher", name: "渔女", title: "海边的船", kind: "explore", regions: ["coast_south"], baseAffection: 20, trait: "食物采集" },
  { id: "r_radio_op", name: "女通讯兵", title: "守着频率", kind: "camp", regions: ["radio_station"], baseAffection: 25, trait: "远程通讯" }
];

export function recruitTemplatesForRegion(regionTags: string[]): RecruitTemplate[] {
  return RECRUIT_TEMPLATES.filter((t) => t.regions.some((r) => regionTags.includes(r)));
}

export interface RecruitResult {
  template: RecruitTemplate | null;
  success: boolean;
  affection: number;
}

/** 随机遭遇判定（确定性随机） */
export function tryRecruit(regionTags: string[], rng: () => number): RecruitResult {
  const pool = recruitTemplatesForRegion(regionTags);
  if (pool.length === 0) return { template: null, success: false, affection: 0 };

  // 30% 概率遇到
  if (rng() > 0.3) return { template: null, success: false, affection: 0 };

  const t = pool[Math.floor(rng() * pool.length)];
  // 遭遇后 60% 概率成功招募
  const success = rng() < 0.6;
  return { template: t, success, affection: success ? t.baseAffection : 0 };
}

// ============ 汇总 ============

export interface QuestSummary {
  total: number;
  started: number;
  completed: number;
  paused: number;
  /** 已完成主线解锁的后宫数 */
  unlockedCompanions: number;
  list: Array<{ def: QuestDef; state: QuestState; progress: string }>;
}

export function summarizeQuests(states: Record<string, QuestState>): QuestSummary {
  const list = QUESTS.map((def) => {
    const st = states[def.id] ?? { id: def.id, stage: 0 as QuestStage, started: false, completed: false, paused: false };
    return { def, state: st, progress: progressText(def, st) };
  });
  const completed = list.filter((x) => x.state.completed);
  return {
    total: QUESTS.length,
    started: list.filter((x) => x.state.started).length,
    completed: completed.length,
    paused: list.filter((x) => x.state.paused).length,
    unlockedCompanions: completed.length + completed.reduce((s, x) => s + (x.def.grantsCompanions?.length ?? 0), 0),
    list
  };
}

// ============ 序列化 ============

export function questsToJSON(states: Record<string, QuestState>): Record<string, QuestState> {
  return states;
}

export function questsFromJSON(j: Record<string, QuestState> | null | undefined): Record<string, QuestState> {
  const base = newQuestStates();
  if (!j) return base;
  for (const q of QUESTS) {
    const saved = j[q.id];
    if (!saved) continue;
    base[q.id] = {
      id: q.id,
      stage: (saved.stage ?? 0) as QuestStage,
      started: !!saved.started,
      completed: !!saved.completed,
      paused: !!saved.paused,
      pendingAffection: saved.pendingAffection ?? 0
    };
  }
  return base;
}