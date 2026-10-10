/**
 * 分支事件系统 —— 怀孕线与战败线。
 *
 * 设计定位：
 *  - 怀孕线：从确认怀孕 → 孕期变化 → 分娩 → 产后，共 4 个阶段
 *  - 战败线：非致命，战败会触发俘虏/逃脱/被救三条分支
 *  - 两条线都是**可选内容**，不影响主线推进
 *  - 所有分支都可重复触发（分娩、战败等），但初次有专属场景
 *
 * 纯函数式。
 */

// ============ 怀孕线 ============

/** 怀孕阶段 */
export type BranchPregStage =
  | "discover"    // 发现怀孕（1-3 天）
  | "early"       // 孕早期（4-10 天）
  | "middle"      // 孕中期（11-20 天）
  | "late"        // 孕晚期（21-29 天）
  | "delivery"    // 分娩（30 天）
  | "postpartum"; // 产后（30 天后）

export const BRANCH_PREG_LABEL: Record<BranchPregStage, string> = {
  discover: "察觉异样",
  early: "孕早期",
  middle: "孕中期",
  late: "孕晚期",
  delivery: "临产",
  postpartum: "产后"
};

export const BRANCH_PREG_DESC: Record<BranchPregStage, string> = {
  discover: "身体的细微变化，还没确认",
  early: "确认怀孕，开始调整作息",
  middle: "腹部开始显怀，行动渐不便",
  late: "临近生产，需要绝对安全的环境",
  delivery: "分娩",
  postpartum: "身体恢复与照顾新生儿"
};

/** 由怀孕天数推导阶段 */
export function branchPregStage(progress: number): BranchPregStage {
  if (progress <= 3) return "discover";
  if (progress <= 10) return "early";
  if (progress <= 20) return "middle";
  if (progress <= 29) return "late";
  if (progress <= 31) return "delivery";
  return "postpartum";
}

/** 怀孕事件定义 */
export interface PregnancyEvent {
  id: string;
  stage: BranchPregStage;
  title: string;
  /** 触发条件描述 */
  condition: string;
  /** 节拍骨架 */
  beats: Array<{ pose: string; action: string; sense: string; mind: string; speech?: string }>;
  /** 一次性还是可重复 */
  repeatable: boolean;
  guidance: string;
}

export const PREGNANCY_EVENTS: PregnancyEvent[] = [
  {
    id: "preg_discover",
    stage: "discover",
    title: "晨间的反胃",
    condition: "主角怀孕 1-3 天",
    repeatable: false,
    beats: [
      { pose: "morning_sick", action: "主角在洗手池前干呕，扶着台面等这阵过去", sense: "嘴里的酸味、额头的冷汗", mind: "以为是吃坏了东西", speech: "「……没事。」" },
      { pose: "watch_from_door", action: "同伴站在门口看着，没有进来", sense: "她手扶着门框的力度", mind: "她比主角先想明白了", speech: "「你上次来例假是什么时候。」" },
      { pose: "count_days", action: "两人在日历上数日子，越数越安静", sense: "铅笔划过纸面的声音", mind: "数字对上了", speech: "「……对上了。」" },
      { pose: "silence", action: "谁都没先开口，房间里只有冰箱的嗡鸣", sense: "空气里未散尽的酸味", mind: "这个孩子来得不是时候，但没人说出口" }
    ],
    guidance: "核心是「还没准备好但已经来了」。不要写成喜悦或恐慌，写成一种安静的事实确认。"
  },
  {
    id: "preg_early",
    stage: "early",
    title: "调整",
    condition: "怀孕 4-10 天",
    repeatable: false,
    beats: [
      { pose: "reassign_job", action: "同伴们重新分配了主角的岗位，没人问过主角意见", sense: "被挪走的工具、空出来的位置", mind: "被照顾的不适应", speech: "「我自己能行。」" },
      { pose: "food_change", action: "餐桌上多了几样东西，少了几样", sense: "以前爱吃的被撤下去了", mind: "她们记得比主角清楚", speech: "「这个别吃。」" },
      { pose: "check_supply", action: "有人开始清点药品储备，算够不够用", sense: "药盒被反复翻动的声音", mind: "她们在为十个月后做准备" },
      { pose: "night_talk", action: "夜里主角睡不着，发现旁边的人也醒着", sense: "黑暗中均匀的呼吸声", mind: "她一直在等主角先开口", speech: "「怕吗。」「……有点。」" }
    ],
    guidance: "核心是「被照顾的不适应」。主角想维持原状，但所有人都在悄悄改变安排。"
  },
  {
    id: "preg_middle",
    stage: "middle",
    title: "显怀",
    condition: "怀孕 11-20 天",
    repeatable: false,
    beats: [
      { pose: "mirror_look", action: "主角对着镜子看自己的腹部，衣服已经遮不住了", sense: "皮肤被撑开的紧绷", mind: "第一次真实地感觉到里面有个东西", speech: "「……真的在动。」" },
      { pose: "feel_kick", action: "同伴把手放上来，等了一会儿才感觉到", sense: "掌心的温度与皮下的一下轻踢", mind: "隔着肚皮的第一次接触", speech: "「踢了。」" },
      { pose: "clothes_fit", action: "旧衣服扣不上了，翻出一件宽松的", sense: "布料的陌生触感", mind: "身体不再完全属于自己" },
      { pose: "plan_name", action: "有人开始讨论名字，主角插不上话", sense: "纸上的字迹", mind: "她们已经默认孩子会出生", speech: "「……随你们。」" }
    ],
    guidance: "核心是「身体的陌生感」与「他人的默认」。要写出主角对身体变化的复杂感受。"
  },
  {
    id: "preg_late",
    stage: "late",
    title: "临产前",
    condition: "怀孕 21-29 天",
    repeatable: false,
    beats: [
      { pose: "lockdown", action: "据点进入戒备状态，所有外出取消", sense: "门闩落下的声音", mind: "所有人都在为那一刻准备", speech: "「没必要这样。」「有必要。」" },
      { pose: "prepare_room", action: "专属空间被改成了产房，器具摆得整整齐齐", sense: "消毒水的味道", mind: "这一切都是为一个人准备的" },
      { pose: "sleepless", action: "夜里翻身困难，同伴起来帮主角调整姿势", sense: "被托住的重量", mind: "连翻身都需要别人帮忙" },
      { pose: "wait", action: "所有人都在等，日子变得很慢", sense: "走廊里的脚步声", mind: "倒计时的感觉", speech: "「还有几天。」" }
    ],
    guidance: "核心是「全员戒备」的紧张与「被托住」的安心。要写出等待的重量。"
  },
  {
    id: "preg_delivery",
    stage: "delivery",
    title: "分娩",
    condition: "怀孕满 30 天",
    repeatable: true,
    beats: [
      { pose: "onset", action: "阵痛开始，主角抓住床沿", sense: "规律的收缩、冷汗", mind: "真的开始了", speech: "「叫她们进来。」" },
      { pose: "labor", action: "医护的同伴主导，其他人打下手", sense: "被按住的手腕、毛巾的粗糙", mind: "把身体完全交出去", speech: "「呼吸，跟着我。」" },
      { pose: "push", action: "最后一次用力，房间里的声音都停了", sense: "撕裂感、然后是空", mind: "一瞬间什么都没了" },
      { pose: "cry", action: "第一声哭", sense: "又细又尖的声音", mind: "有什么东西落地了", speech: "「……女孩。」" },
      { pose: "hold", action: "孩子被放在主角胸口，湿漉漉的", sense: "小小的重量与温度", mind: "这是从自己身体里出来的" }
    ],
    guidance: "核心是「交出身体」与「第一声哭」。要写出疼痛但不渲染血腥，重点在声音与重量的变化。"
  },
  {
    id: "preg_postpartum",
    stage: "postpartum",
    title: "产后",
    condition: "分娩后",
    repeatable: true,
    beats: [
      { pose: "recover", action: "主角躺在床上，连抬手都费劲", sense: "全身的酸软", mind: "身体被掏空的感觉" },
      { pose: "feed", action: "第一次喂奶，姿势怎么都不对", sense: "被吸吮的刺痛", mind: "什么都要从头学", speech: "「这样对吗。」" },
      { pose: "watch_sleep", action: "孩子睡着后，所有人都盯着看", sense: "房间里只剩呼吸声", mind: "这么小的一团，居然要养活" },
      { pose: "new_normal", action: "据点重新排班，多了照顾孩子的一班", sense: "纸上的新表格", mind: "生活被永久改变了", speech: "「以后就这么过吧。」" }
    ],
    guidance: "核心是「什么都要从头学」。要写出疲惫与笨拙，但落点在「新的日常」。"
  }
];

export function pregnancyEvent(id: string): PregnancyEvent | undefined {
  return PREGNANCY_EVENTS.find((e) => e.id === id);
}

export function pregnancyEventsForStage(s: BranchPregStage): PregnancyEvent[] {
  return PREGNANCY_EVENTS.filter((e) => e.stage === s);
}

// ============ 战败线 ============

/** 战败结果 */
export type DefeatOutcome =
  | "captured"   // 被俘
  | "escaped"    // 逃脱
  | "rescued"    // 被救
  | "abandoned"; // 弃置（重伤昏迷后自己醒来）

export const DEFEAT_LABEL: Record<DefeatOutcome, string> = {
  captured: "被俘",
  escaped: "逃脱",
  rescued: "被同伴救回",
  abandoned: "重伤昏迷"
};

/** 战败事件 */
export interface DefeatEvent {
  id: string;
  outcome: DefeatOutcome;
  title: string;
  /** 触发权重 */
  weight: number;
  /** 条件描述 */
  condition: string;
  beats: Array<{ pose: string; action: string; sense: string; mind: string; speech?: string }>;
  /** 后果说明 */
  consequence: string;
  guidance: string;
}

export const DEFEAT_EVENTS: DefeatEvent[] = [
  {
    id: "defeat_captured",
    outcome: "captured",
    title: "醒来时手脚被绑着",
    weight: 0.3,
    condition: "战败且敌人为人形",
    consequence: "损失部分物资，数日后可逃脱",
    beats: [
      { pose: "wake_bound", action: "主角醒来，手脚被胶带缠着，后脑勺很疼", sense: "胶带的黏腻、地面的凉", mind: "先确认自己还活着" },
      { pose: "interrogate", action: "有人蹲下来搜身，把背包翻空", sense: "东西被一件件拿走的声音", mind: "记住对方的人数与位置", speech: "「东西拿走，人留着。」" },
      { pose: "plan", action: "主角在黑暗中默默算时间，等换班", sense: "外面的脚步规律", mind: "只要能撑到换班就有机会" },
      { pose: "escape", action: "趁换班时挣脱，从后门离开", sense: "手腕被磨破的疼", mind: "东西可以不要，人得回去", speech: "「……回家。」" }
    ],
    guidance: "核心是「冷静计算」。不要写绝望，写主角在被俘时仍在观察与计划。逃脱过程要简洁有力。"
  },
  {
    id: "defeat_escaped",
    outcome: "escaped",
    title: "扔下背包跑",
    weight: 0.35,
    condition: "战败但体力尚存",
    consequence: "丢失背包物资，体力大幅下降",
    beats: [
      { pose: "realize", action: "主角意识到打不过，立刻决定撤退", sense: "心跳与耳鸣", mind: "命比东西重要" },
      { pose: "drop_bag", action: "把背包扔出去吸引注意，转身就跑", sense: "背包落地的一声闷响", mind: "三个月攒下来的东西，没了" },
      { pose: "run", action: "在废墟里穿行，不敢回头", sense: "肺里的灼烧、腿的酸胀", mind: "只要跑进树林就安全了" },
      { pose: "collapse", action: "跑不动了才停下，扶着墙大口喘气", sense: "血腥味在喉咙里", mind: "活着回来了", speech: "「……值。」" }
    ],
    guidance: "核心是「果断放弃」。要写出决断的那一刻与奔跑的狼狈，落点在「活着回来」。"
  },
  {
    id: "defeat_rescued",
    outcome: "rescued",
    title: "有人把她拉开了",
    weight: 0.25,
    condition: "有同伴随行且忠诚 ≥ 50",
    consequence: "同伴受伤，好感提升",
    beats: [
      { pose: "fall", action: "主角被打倒在地，视野开始发黑", sense: "耳朵里的嗡鸣", mind: "撑不住了" },
      { pose: "intervene", action: "随行的同伴冲上来，把敌人撞开", sense: "两声闷响、然后是喊叫", mind: "她不该来的", speech: "「起来！」" },
      { pose: "drag", action: "同伴拖着主角往后撤，一边开枪压制", sense: "被拖行的摩擦、枪声", mind: "她在用命换时间" },
      { pose: "safe", action: "退回据点后，同伴才坐下检查自己的伤", sense: "她手在抖，但先看的是主角", mind: "她第一个想的是主角", speech: "「下次别逞强。」" }
    ],
    guidance: "核心是「有人替你挡了」。要写出主角的无能为力与同伴的决断，落点在事后的照顾。"
  },
  {
    id: "defeat_abandoned",
    outcome: "abandoned",
    title: "昏迷了三天",
    weight: 0.1,
    condition: "独自外出且战败",
    consequence: "昏迷三天，丢失全部携带物资",
    beats: [
      { pose: "blackout", action: "主角倒在地上，最后的意识是天空的颜色", sense: "后脑的温度在流失", mind: "这次真的完了" },
      { pose: "wake", action: "再睁眼时天已经黑了又亮，不知道过了几天", sense: "干裂的嘴唇、僵硬的四肢", mind: "还活着" },
      { pose: "crawl", action: "撑着墙站起来，检查身上还剩什么", sense: "什么都没有了", mind: "得自己走回去" },
      { pose: "return", action: "走了很久，终于看到据点的灯", sense: "玄关的暖光", mind: "她们一定以为我死了", speech: "「……我回来了。」" }
    ],
    guidance: "核心是「独自熬过来」。要写出时间感的错乱与归途的漫长，落点在看到灯光的那一刻。"
  }
];

/** 按权重随机选一个战败结果 */
export function rollDefeatOutcome(
  hasCompanion: boolean,
  isHumanoid: boolean,
  rng: () => number
): DefeatEvent {
  const candidates = DEFEAT_EVENTS.filter((e) => {
    if (e.outcome === "captured" && !isHumanoid) return false;
    if (e.outcome === "rescued" && !hasCompanion) return false;
    if (e.outcome === "abandoned" && hasCompanion) return false;
    return true;
  });

  const list = candidates.length > 0 ? candidates : [DEFEAT_EVENTS[1]];
  const total = list.reduce((s, e) => s + e.weight, 0);
  let acc = 0;
  const target = rng() * total;
  for (const e of list) {
    acc += e.weight;
    if (target <= acc) return e;
  }
  return list[list.length - 1];
}

export function defeatEvent(id: string): DefeatEvent | undefined {
  return DEFEAT_EVENTS.find((e) => e.id === id);
}

// ============ 统计 ============

export function branchStats(): {
  pregnancyEvents: number;
  pregnancyStages: number;
  defeatEvents: number;
  defeatOutcomes: number;
  totalBeats: number;
} {
  let beats = 0;
  for (const e of PREGNANCY_EVENTS) beats += e.beats.length;
  for (const e of DEFEAT_EVENTS) beats += e.beats.length;

  return {
    pregnancyEvents: PREGNANCY_EVENTS.length,
    pregnancyStages: Object.keys(BRANCH_PREG_LABEL).length,
    defeatEvents: DEFEAT_EVENTS.length,
    defeatOutcomes: Object.keys(DEFEAT_LABEL).length,
    totalBeats: beats
  };
}