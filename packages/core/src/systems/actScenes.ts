/**
 * 性爱行为的场景叙事库。
 *
 * 设计定位：
 *  - 每个行为对应一组可渲染的场景骨架（节拍 + 四层描写）
 *  - 骨架不是成品文本，而是「给模型的详细指令」：
 *    未启用模型时玩家能看到结构，启用后由模型填肉
 *  - 场景按行为 id 索引，含差分变体（初次 / 熟练 / 多人）
 *
 * 纯函数式。
 */
import type { Scene, Beat, Line } from "../text/engine.ts";
import type { ActDef, ActPart } from "./sexActs.ts";

/** 场景差分类型 */
export type SceneVariant =
  | "first"      // 初次（对方是新手）
  | "familiar"   // 熟悉（已做过）
  | "skilled"    // 熟练（双方熟练度都高）
  | "pregnant"   // 怀孕中
  | "observer";  // 有旁观者

export const VARIANT_LABEL: Record<SceneVariant, string> = {
  first: "初次",
  familiar: "熟悉",
  skilled: "熟练",
  pregnant: "孕中",
  observer: "旁观"
};

/** 场景骨架中的一节 */
export interface SceneBeatSpec {
  /** 姿势键，供像素层切帧 */
  pose: string;
  /** 动作要点 */
  action: string;
  /** 感官要点 */
  sense: string;
  /** 心理要点 */
  mind: string;
  /** 台词提示（说话人由引擎填入） */
  speech?: string;
}

/** 一个行为的场景骨架 */
export interface ActSceneSpec {
  actId: string;
  /** 场景标题模板 */
  titleTemplate: string;
  /** 基调 */
  tone: string;
  /** 需要的道具 */
  props: string[];
  /** 节拍序列 */
  beats: SceneBeatSpec[];
  /** 模型额外约束 */
  guidance: string;
  /** 是否含后庭准备流程 */
  requiresPrep?: boolean;
}

// ============ 后庭准备流程 ============

/**
 * 后庭使用的标准准备流程。
 *
 * 设计依据：后庭行为在实际生理上需要准备，直接进入会造成伤害。
 * 游戏内体现为强制的前置步骤，同时也是叙事的一部分。
 */
export interface EnemaStep {
  id: string;
  name: string;
  description: string;
  /** 消耗品 */
  requiresItem?: string;
  /** 该步骤给后庭熟练度的加成 */
  proficiencyGain: number;
  /** 叙事要点 */
  narrative: string;
}

export const ENEMA_STEPS: EnemaStep[] = [
  {
    id: "warm_water",
    name: "温水准备",
    description: "准备温水与清洗器具，水温要接近体温",
    requiresItem: "enema_kit",
    proficiencyGain: 2,
    narrative: "调水温的过程本身就有一种仪式感。对方会紧张，需要安抚。"
  },
  {
    id: "first_flush",
    name: "第一次注水",
    description: "缓慢注入温水，让内部适应",
    requiresItem: "enema_kit",
    proficiencyGain: 3,
    narrative: "注水的速度必须慢。对方的腹部会有胀感，需要有人握着她的手。"
  },
  {
    id: "hold",
    name: "保持",
    description: "保持数分钟，让水充分作用",
    requiresItem: "enema_kit",
    proficiencyGain: 2,
    narrative: "这几分钟最难熬。可以说话分散注意力，或者只是抱着。"
  },
  {
    id: "release",
    name: "排出",
    description: "排出，观察是否清澈",
    requiresItem: "enema_kit",
    proficiencyGain: 2,
    narrative: "这一步最羞耻。需要完全放下体面，也是信任的体现。"
  },
  {
    id: "repeat",
    name: "重复至清澈",
    description: "若未清澈则重复，通常 2-3 次",
    requiresItem: "enema_kit",
    proficiencyGain: 3,
    narrative: "重复的次数越多，对方越疲惫，也越依赖扶着她的那个人。"
  },
  {
    id: "relax",
    name: "放松与润滑",
    description: "用润滑剂充分放松，配合手指渐进扩张",
    requiresItem: "lube",
    proficiencyGain: 4,
    narrative: "这是正式进入前的最后一步。手指从一根到三根，耐心是关键。"
  }
];

/** 准备流程总熟练度收益 */
export function enemaTotalGain(): number {
  return ENEMA_STEPS.reduce((s, x) => s + x.proficiencyGain, 0);
}

/** 准备流程需要的道具 */
export function enemaRequiredItems(): string[] {
  const out = new Set<string>();
  for (const s of ENEMA_STEPS) {
    if (s.requiresItem) out.add(s.requiresItem);
  }
  return [...out];
}

// ============ 行为场景骨架 ============

export const ACT_SCENES: ActSceneSpec[] = [
  // ---------- 口 ----------
  {
    actId: "oral_give",
    titleTemplate: "口交·{partner}",
    tone: "主导、观察对方的反应",
    props: [],
    beats: [
      { pose: "kneel_before", action: "主角让{partner}坐下或靠墙，自己跪下或俯身", sense: "地面的硬度、对方的体温", mind: "掌控节奏的自觉", speech: "「别动。」" },
      { pose: "first_touch", action: "先用手，再用唇，从外围逐渐靠近", sense: "对方皮肤的颤抖、呼吸的变化", mind: "故意拖延的恶趣味" },
      { pose: "take_in", action: "含入，注意牙齿避开，舌头贴住", sense: "口腔的温度、对方的硬度", mind: "专注于对方每一个细微反应", speech: "「唔……」" },
      { pose: "rhythm", action: "找到节奏，深浅交替，手同时辅助", sense: "唾液、下巴的酸胀", mind: "观察对方快到极限的信号" },
      { pose: "swallow_or_not", action: "最后的选择：吞下或退开", sense: "喉咙的收缩、对方的高潮", mind: "这个选择本身也是一种表态", speech: "「……」" }
    ],
    guidance: "重点写「掌控节奏」的主动权。对方是被动的，主角决定什么时候快什么时候慢。注意口腔的触感与对方失控的细节。"
  },
  {
    actId: "oral_receive",
    titleTemplate: "{partner}的口·主角",
    tone: "被动、克制、被服务",
    props: [],
    beats: [
      { pose: "sit_back", action: "{partner}让主角坐下，自己跪在中间", sense: "被安排的姿态、对方的视线", mind: "交出主动权的不习惯" },
      { pose: "tease_first", action: "对方先用脸颊与唇磨蹭，迟迟不开始", sense: "若有若无的触碰", mind: "想催促又不想开口", speech: "「你……」" },
      { pose: "take_in", action: "对方含入，动作生疏或熟练视经验而定", sense: "湿热、牙齿的偶尔磕碰", mind: "克制住按头的手" },
      { pose: "eye_contact", action: "对方抬眼看向主角", sense: "视线交汇的瞬间", mind: "被看穿的感觉", speech: "「看着我。」" },
      { pose: "release", action: "释放，对方的选择", sense: "最后几秒的失控", mind: "被完全接纳的安心" }
    ],
    guidance: "重点写「被服务」时的克制。主角想主导但又享受被动，这种矛盾是核心。注意对方抬眼看过来时的视线交流。"
  },
  {
    actId: "oral_mutual",
    titleTemplate: "互相口交·{partner}",
    tone: "笨拙、互相干扰、忍不住笑",
    props: [],
    beats: [
      { pose: "arrange_69", action: "调整成互相能够到的姿势，往往要试几次", sense: "身体的重量、压迫感", mind: "姿势的别扭带来的滑稽感", speech: "「这样对吗……」「再往上一点。」" },
      { pose: "start", action: "同时开始，但节奏完全对不上", sense: "互相干扰的触感", mind: "想专注又被对方打断" },
      { pose: "sync", action: "逐渐找到配合的节奏", sense: "同步时的双重快感", mind: "默契形成的瞬间" },
      { pose: "race", action: "变成比谁先撑不住", sense: "越来越急促的呼吸", mind: "不服输的心态", speech: "「你、你先……」" },
      { pose: "together", action: "几乎同时结束", sense: "同时到达的冲击", mind: "分不清是谁先的满足" }
    ],
    guidance: "重点写「笨拙与默契」的转换。开头要写出姿势调整的滑稽与身体的不协调，中间逐渐同步，最后变成竞争。不要写成顺利的流水账。"
  },
  {
    actId: "deep_throat",
    titleTemplate: "深喉·{partner}",
    tone: "极限、窒息感、信任",
    props: [],
    beats: [
      { pose: "prep", action: "主角调整角度，说明接下来会很难受", sense: "喉咙深处的异物感预期", mind: "做好心理准备", speech: "「不舒服就掐我。」" },
      { pose: "slow_in", action: "缓慢推进到极限，中途停顿", sense: "窒息、眼泪、唾液溢出", mind: "克制呕吐反射" },
      { pose: "hold", action: "短暂保持，对方的手按住主角后脑", sense: "完全被填满的压迫", mind: "把控制权完全交出去" },
      { pose: "pull_back", action: "退出，大口喘气，唾液拉丝", sense: "空气涌入的刺痛", mind: "活过来的实感", speech: "「咳……继续。」" },
      { pose: "finish", action: "再次进入，这次到底", sense: "喉咙的痉挛、对方的高潮", mind: "做到极限的成就感" }
    ],
    guidance: "核心是「窒息与信任」。要写出眼泪、唾液、呕吐反射的克制，但不能写成暴力。重点是主角主动把控制权交出去。",
    requiresPrep: false
  },

  // ---------- 前庭 ----------
  {
    actId: "vaginal_missionary",
    titleTemplate: "正面位·{partner}",
    tone: "面对面、视线无法回避",
    props: [],
    beats: [
      { pose: "position", action: "让{partner}躺下，主角在正面撑起身体", sense: "床的塌陷、对方的体温", mind: "将要发生的事的实感" },
      { pose: "slow_entry", action: "缓慢进入，观察对方的表情", sense: "湿热的紧致、逐渐被包裹", mind: "不想弄疼对方", speech: "「疼就说。」" },
      { pose: "adjust", action: "停住等对方适应，额头相抵", sense: "呼吸交缠、心跳同步", mind: "这一刻的亲密超过快感本身" },
      { pose: "rhythm", action: "开始动作，逐渐加深", sense: "摩擦、体液、床的声响", mind: "看着对方的脸无法移开视线", speech: "「看着我。」" },
      { pose: "climax", action: "最后加速，对方先到或同时", sense: "收缩、失控的叫声", mind: "一起到达的满足" }
    ],
    guidance: "核心是「视线无法回避」。全程保持对视，动作要慢，重点写额头相抵时的呼吸与心跳。不要写成纯肉体描写。"
  },
  {
    actId: "vaginal_doggy",
    titleTemplate: "背后位·{partner}",
    tone: "无法看到脸、腰臀曲线、掌控感",
    props: [],
    beats: [
      { pose: "turn_over", action: "{partner}翻身趴下，抬高腰", sense: "后背的线条、肩胛骨", mind: "看不到脸的疏离感" },
      { pose: "entry", action: "从后方进入，扶住对方的腰", sense: "角度不同带来的紧致差异", mind: "掌控节奏的自觉" },
      { pose: "grip", action: "抓住对方的腰或肩，拉向自己", sense: "臀部撞击的声响、体液的黏腻", mind: "想更深一点的冲动", speech: "「放松点。」" },
      { pose: "hair_or_hand", action: "抓住头发或手腕，加强控制", sense: "被固定的束缚感", mind: "对方的顺从让主角更兴奋" },
      { pose: "climax", action: "最后几下最重，然后停住", sense: "深度、颤抖的双腿", mind: "从掌控中获得的满足" }
    ],
    guidance: "核心是「看不到脸」的疏离与掌控感。重点写腰臀曲线、撞击的声响、抓握的位置。对方的脸埋在枕头里，声音是闷的。"
  },
  {
    actId: "vaginal_ride",
    titleTemplate: "{partner}在上",
    tone: "被压制、交出主动权、仰望",
    props: [],
    beats: [
      { pose: "straddle", action: "{partner}跨坐上来，双手撑在主角胸口", sense: "大腿内侧的贴合、体重", mind: "被压制的意外快感" },
      { pose: "lower", action: "对方自己慢慢坐下去", sense: "重力带来的深度、完全被包裹", mind: "无法控制节奏的无力感", speech: "「……好深。」" },
      { pose: "ride", action: "对方开始动，主角只能配合", sense: "起伏的节奏、胸前的晃动", mind: "从仰视的角度看对方的姿态" },
      { pose: "grab_hip", action: "主角忍不住扶住对方的腰加速", sense: "角色短暂反转的触感", mind: "想夺回主导权的冲动" },
      { pose: "climax", action: "对方脱力趴下，主角在最后一刻翻身", sense: "位置的颠倒、最后的冲刺", mind: "最终仍要主导的执念" }
    ],
    guidance: "核心是「被压制」与「夺回主导」的张力。仰视视角是关键，要写清楚从这个角度看对方的身体。最后翻身的反转是亮点。"
  },
  {
    actId: "vaginal_side",
    titleTemplate: "侧位·{partner}",
    tone: "慢节奏、全身贴合、手自由",
    props: [],
    beats: [
      { pose: "lie_side", action: "两人侧躺，主角从后方贴合", sense: "全身皮肤相接的面积", mind: "慵懒而不着急" },
      { pose: "entry", action: "抬起对方一条腿，缓慢进入", sense: "角度浅但摩擦面大", mind: "享受慢节奏的余裕" },
      { pose: "hands_free", action: "双手可以自由游走：胸口、腰、大腿", sense: "同时多处的触感", mind: "掌控与安抚并存" },
      { pose: "slow_build", action: "保持慢速但持续，不急着结束", sense: "逐渐累积的紧绷", mind: "把时间拉长的意愿" },
      { pose: "quiet_end", action: "轻声结束，谁都没急着动", sense: "汗湿的皮肤、平复的呼吸", mind: "温存的余韵" }
    ],
    guidance: "核心是「慢」。全程保持低速度，重点写全身贴合的面积与双手的自由。这是余韵型场景，不要写激烈。"
  },

  // ---------- 后庭 ----------
  {
    actId: "anal_prep",
    titleTemplate: "后庭准备·{partner}",
    tone: "耐心、羞耻、信任",
    props: ["lube"],
    beats: [
      { pose: "explain", action: "主角说明接下来要做什么，让对方有心理准备", sense: "房间的安静、对方的紧张", mind: "把话说开的郑重", speech: "「有不舒服立刻说。」" },
      { pose: "position", action: "让对方侧躺或趴好，膝盖收到胸前", sense: "暴露的羞耻感", mind: "对方的顺从本身就是信任" },
      { pose: "lube", action: "充分涂抹润滑，宁可多不可少", sense: "冰凉的凝胶、逐渐变热", mind: "不想让对方疼的谨慎" },
      { pose: "one_finger", action: "一根手指缓慢进入，停住等适应", sense: "括约肌的收缩、内部的温度", mind: "观察每一丝肌肉的反应", speech: "「呼吸，别憋着。」" },
      { pose: "three_fingers", action: "逐渐增加到三根，能够开合", sense: "被撑开的胀感", mind: "准备就绪的判断", speech: "「好了。」" }
    ],
    guidance: "核心是「耐心」。手指递进是关键，每一步都要停住等适应。要写出对方的羞耻感与逐渐放松的过程，以及这种顺从背后的信任。",
    requiresPrep: false
  },
  {
    actId: "anal_give",
    titleTemplate: "后庭·{partner}",
    tone: "紧致、适应过程、慢进慢出",
    props: ["lube", "enema_kit"],
    beats: [
      { pose: "confirm_prep", action: "确认准备已完成（灌肠与扩张）", sense: "残留的润滑、放松的肌肉", mind: "对准备工作的负责感" },
      { pose: "slow_entry", action: "龟头抵住，极缓慢推进，中途多次停顿", sense: "括约肌的强烈阻力、内部的高温", mind: "被夹住的痛感与快感并存", speech: "「别夹，放松。」" },
      { pose: "full_in", action: "完全进入后静止不动，等对方适应", sense: "被完全包裹的压迫感", mind: "不敢动的谨慎" },
      { pose: "slow_move", action: "极慢地抽送，每次只动一点", sense: "摩擦的质感与前面完全不同", mind: "逐渐找到节奏", speech: "「疼吗？」「……不疼。」" },
      { pose: "build", action: "确认无碍后逐渐加快，但始终不粗暴", sense: "深度的变化、对方的呻吟", mind: "从谨慎到投入的转变" },
      { pose: "climax", action: "结束时退出的动作也要慢", sense: "空虚感、体液的流出", mind: "做完了的松弛" }
    ],
    guidance: "核心是「慢」。每一步都要停住等适应，绝不能粗暴。要写出与前面的质感差异（更紧、更热、阻力更大）。对方的适应过程是重点。",
    requiresPrep: true
  },
  {
    actId: "anal_receive",
    titleTemplate: "{partner}的后庭·主角",
    tone: "主角承受、不适与适应、交出控制",
    props: ["lube", "enema_kit"],
    beats: [
      { pose: "prep_self", action: "主角自己完成准备工作", sense: "独自面对器具的尴尬", mind: "为对方做准备的主动" },
      { pose: "position", action: "主角摆好姿势，把后背交给对方", sense: "看不见对方动作的不安", mind: "完全信任的姿态", speech: "「慢点。」" },
      { pose: "entry", action: "对方进入，主角需要刻意放松", sense: "撕裂般的胀感、冷汗", mind: "忍住不喊出来的倔强" },
      { pose: "adapt", action: "几次呼吸后逐渐适应", sense: "痛感转化为别的感觉", mind: "身体自己找到节奏" },
      { pose: "accept", action: "主动往后迎合，表示可以继续", sense: "主动接纳的心理转变", mind: "从承受变成享受", speech: "「……可以了。」" },
      { pose: "climax", action: "结束时主角腿软，需要被扶住", sense: "脱力、颤抖", mind: "做到极限的满足" }
    ],
    guidance: "核心是「主角承受」。要写出不适、冷汗、忍住不喊的倔强，以及逐渐适应后的转变。主角主动迎合的那一刻是转折点。",
    requiresPrep: true
  },
  {
    actId: "anal_play",
    titleTemplate: "后庭玩具·{partner}",
    tone: "尺寸递进、观察、视觉呈现",
    props: ["vibrator", "lube"],
    beats: [
      { pose: "show", action: "主角拿出玩具让对方看，说明用途", sense: "对方的视线在玩具上", mind: "观察对方的紧张程度", speech: "「从最小的开始。」" },
      { pose: "small", action: "用最小的那根开始，缓慢进出", sense: "异物感、逐渐适应", mind: "把节奏完全握在自己手里" },
      { pose: "medium", action: "换更大一号，需要重新适应", sense: "再次被撑开的胀感", mind: "对方的反应是唯一指标" },
      { pose: "vibrate", action: "打开震动，观察对方失控", sense: "持续的震感、无法预测的节奏", mind: "掌控他人快感的权力感", speech: "「忍不住就出声。」" },
      { pose: "remove", action: "缓慢抽出，看对方松弛下来", sense: "空虚感、体液", mind: "准备工作完成的确认" }
    ],
    guidance: "核心是「尺寸递进」与「观察」。每换一号都要重新适应，主角要时刻观察对方的反应决定下一步。视觉呈现（对方能看到自己被使用）是重点。"
  },
  {
    actId: "anal_double",
    titleTemplate: "双穴·{partner}",
    tone: "极限、两种触感对比、节奏协调",
    props: ["strap_on", "lube", "enema_kit"],
    beats: [
      { pose: "arrange", action: "调整姿势，让前后都能进入", sense: "被两处同时撑开的压迫", mind: "极限就在眼前的紧张", speech: "「撑不住就说。」" },
      { pose: "both_entry", action: "先后进入，前庭先，后庭后", sense: "两种完全不同的紧致度", mind: "协调两个节奏的困难" },
      { pose: "sync", action: "尝试同步，往往需要多次调整", sense: "被夹在中间的挤压感", mind: "节奏同步后的双重快感" },
      { pose: "alternate", action: "改为交替进出，错开节奏", sense: "无法预测的下一击", mind: "对方的极限在哪里" },
      { pose: "overload", action: "同时加速直到结束", sense: "过载的冲击", mind: "彻底的失控" },
      { pose: "collapse", action: "结束后完全脱力，谁都说不出话", sense: "全身的颤抖", mind: "做完极限之事的空白" }
    ],
    guidance: "核心是「两种触感的对比」与「节奏协调的困难」。要写清楚前庭与后庭的质感差异，以及协调两个节奏时的笨拙。这是高阶行为，允许激烈但不要粗暴。",
    requiresPrep: true
  },

  // ---------- 手 ----------
  {
    actId: "hand_give",
    titleTemplate: "手活·{partner}",
    tone: "轻快、前戏、观察",
    props: [],
    beats: [
      { pose: "reach", action: "主角伸手过去，先隔着布料", sense: "布料的摩擦、对方的反应", mind: "试探的第一步" },
      { pose: "grip", action: "握住，找到合适的力度", sense: "硬度与温度、脉搏", mind: "通过手感受对方的状态", speech: "「这样可以吗？」" },
      { pose: "rhythm", action: "上下动作，拇指照顾顶端", sense: "逐渐湿润、速度变化", mind: "观察对方什么时候皱眉" },
      { pose: "speed_up", action: "加快，同时另一只手辅助别处", sense: "两处同时被照顾", mind: "把对方推向边缘" },
      { pose: "finish", action: "最后时刻的处理", sense: "溅在手上的温度", mind: "前戏完成的满足" }
    ],
    guidance: "这是前戏型场景，节奏轻快。重点写手的触感与对方的反应，不要写太长。"
  },
  {
    actId: "hand_receive",
    titleTemplate: "{partner}的手·主角",
    tone: "被动、观察对方技巧",
    props: [],
    beats: [
      { pose: "offer", action: "主角放松身体，把主动权交出去", sense: "对方掌心的温度", mind: "等待的期待感" },
      { pose: "first_touch", action: "对方开始，手法生疏或熟练", sense: "力度不对时的微妙不适", mind: "要不要指导的犹豫" },
      { pose: "guide", action: "主角忍不住握住对方的手引导", sense: "两只手交叠的触感", mind: "示范比说更直接", speech: "「慢一点……对。」" },
      { pose: "learn", action: "对方学会后自己来", sense: "被正确对待的快感", mind: "教会对方的成就感" },
      { pose: "finish", action: "结束", sense: "释放后的放松", mind: "被服务好的满足" }
    ],
    guidance: "核心是「引导与学会」。主角从被动到主动指导，对方从生疏到熟练，这个过程是重点。"
  },
  {
    actId: "fingering",
    titleTemplate: "指入·{partner}",
    tone: "探索、寻找、耐心",
    props: ["lube"],
    beats: [
      { pose: "outer", action: "先用指腹在外围打转，不急着进入", sense: "逐渐湿润的过程", mind: "观察对方的呼吸变化" },
      { pose: "one_in", action: "一根手指缓慢进入", sense: "内部的褶皱、温度", mind: "感受每一处不同" },
      { pose: "search", action: "弯曲手指寻找敏感点", sense: "某个位置带来的强烈反应", mind: "找到时的成就感", speech: "「这里？」" },
      { pose: "two_or_three", action: "增加到两根或三根，同时刺激", sense: "被撑开与内部刺激叠加", mind: "为后续做准备" },
      { pose: "finish", action: "抽出手指，看对方的反应", sense: "液体的拉丝", mind: "准备就绪的判断" }
    ],
    guidance: "核心是「寻找」。重点写手指在内部探索的过程，找到敏感点时的反应是关键。这是探索型场景，不要急躁。"
  },

  // ---------- 胸 ----------
  {
    actId: "breast_play",
    titleTemplate: "胸部爱抚·{partner}",
    tone: "轻柔、循序渐进",
    props: [],
    beats: [
      { pose: "over_cloth", action: "隔着衣服开始，用手掌包裹", sense: "布料下的形状与弹性", mind: "不急着脱的耐心" },
      { pose: "under_cloth", action: "手从下摆伸进去，直接接触", sense: "皮肤的温度、乳头的硬度", mind: "对方的反应比预想的大" },
      { pose: "knead", action: "揉捏，注意力度不要太大", sense: "柔软与弹性、对方的喘息", mind: "观察力度是否合适", speech: "「疼吗？」" },
      { pose: "mouth", action: "改用口，含住吸吮", sense: "舌头的湿润、牙齿要避开", mind: "对方的颤抖让主角满足" },
      { pose: "both", action: "两边同时照顾，手口并用", sense: "两处同时被刺激", mind: "把对方推向边缘" }
    ],
    guidance: "核心是「循序渐进」。从隔衣到直接接触，从手到口，每一步都要写清楚。力度是关键，不能粗暴。"
  },
  {
    actId: "paizuri",
    titleTemplate: "胸交·{partner}",
    tone: "视觉呈现、俯视、主动配合",
    props: ["lube"],
    beats: [
      { pose: "arrange", action: "{partner}跪坐或躺下，主角把器具放在乳沟间", sense: "柔软的包裹感", mind: "俯视对方的姿态" },
      { pose: "lube_up", action: "涂润滑，避免摩擦过度", sense: "滑腻的触感", mind: "保证舒适的必要步骤" },
      { pose: "squeeze", action: "对方用双手挤压两侧，主角开始动作", sense: "柔软但有阻力的摩擦", mind: "看着对方低头注视的样子", speech: "「夹紧一点。」" },
      { pose: "mouth_add", action: "对方伸出舌头照顾顶端", sense: "胸部与口腔的双重刺激", mind: "双重照顾的快感" },
      { pose: "finish", action: "最后时刻", sense: "溅在胸口与脸上", mind: "视觉冲击带来的满足" }
    ],
    guidance: "核心是「视觉」。俯视视角是关键，要写清楚从上方看到对方低头注视的画面。乳沟的柔软与阻力是重点。"
  },
  {
    actId: "nipple_focus",
    titleTemplate: "乳头专注·{partner}",
    tone: "同时刺激、连锁反应",
    props: [],
    beats: [
      { pose: "prepare", action: "两人调整到能互相触碰的位置", sense: "肌肤相接的面积", mind: "要同时进行的期待" },
      { pose: "start", action: "同时开始，用指尖或口", sense: "电击般的传导感", mind: "双倍刺激的冲击" },
      { pose: "sync", action: "尝试同步动作", sense: "同步时的共鸣感", mind: "通过对方的反应调整自己" },
      { pose: "intensify", action: "逐渐加重，互相攀比", sense: "越来越强的刺激", mind: "不服输的心态", speech: "「你……也……」" },
      { pose: "finish", action: "几乎同时到达", sense: "双重高潮", mind: "同步的满足" }
    ],
    guidance: "核心是「同步」与「连锁」。两人同时刺激，互相通过对方的反应调整自己，最后几乎同时到达。"
  },

  // ---------- 腿 / 足 ----------
  {
    actId: "thigh_job",
    titleTemplate: "腿交·{partner}",
    tone: "柔软的包裹、被动配合",
    props: ["lube"],
    beats: [
      { pose: "arrange", action: "主角把器具放进{partner}腿间", sense: "大腿内侧的柔软与温度", mind: "利用对方身体的直接感" },
      { pose: "lube", action: "涂润滑避免干涩", sense: "滑腻的触感", mind: "实用主义的一步" },
      { pose: "squeeze", action: "对方夹紧大腿，主角开始动作", sense: "柔软但有阻力的摩擦", mind: "享受对方配合的姿态" },
      { pose: "hands", action: "主角的手可以自由摸别处", sense: "同时多处的触感", mind: "掌控全局的满足" },
      { pose: "finish", action: "最后时刻", sense: "溅在大腿内侧", mind: "视觉与触感的双重满足" }
    ],
    guidance: "核心是「大腿内侧的柔软」。腿交的摩擦与前面完全不同，更柔和但阻力小，需要润滑。"
  },
  {
    actId: "foot_job",
    titleTemplate: "足交·{partner}",
    tone: "俯视、视觉主导、服从",
    props: ["lube"],
    beats: [
      { pose: "sit_above", action: "{partner}坐在椅子或床边，主角站在前方", sense: "被俯视的位置感", mind: "被俯视的微妙屈辱" },
      { pose: "feet_touch", action: "对方抬起脚，用足弓夹住", sense: "足底的温度、脚趾的灵活", mind: "被脚趾拨弄的怪异感" },
      { pose: "lube", action: "涂润滑避免摩擦伤", sense: "滑腻与体温的混合", mind: "实用主义的一步" },
      { pose: "move", action: "主角自己挺动，对方只是保持姿势", sense: "主动与被动的倒置", mind: "主动配合对方姿势的服从感", speech: "「……再夹紧一点。」" },
      { pose: "finish", action: "最后时刻", sense: "溅在脚背与足弓上", mind: "视觉冲击的满足" }
    ],
    guidance: "核心是「俯视与服从」。被俯视的位置感是关键，主角主动挺动但姿势由对方决定，这种倒置是重点。"
  },

  // ---------- 道具 ----------
  {
    actId: "toy_use_partner",
    titleTemplate: "对{partner}使用玩具",
    tone: "掌控、观察失控、档位变化",
    props: ["vibrator"],
    beats: [
      { pose: "show", action: "主角拿出玩具，让对方看到并说明用途", sense: "对方视线落在玩具上", mind: "观察对方的紧张与期待", speech: "「选一个档位。」" },
      { pose: "place", action: "贴在外部，先用最低档", sense: "细微的震感", mind: "从最低开始的谨慎" },
      { pose: "increase", action: "逐渐提高档位，观察反应", sense: "震感逐渐变强", mind: "掌控他人快感的权力感" },
      { pose: "hold_down", action: "对方想躲时按住不让动", sense: "被迫承受的刺激", mind: "略带恶意的掌控", speech: "「不许躲。」" },
      { pose: "max", action: "开到最后档，直到对方崩溃", sense: "过载的刺激、失控的叫声", mind: "彻底的掌控满足" }
    ],
    guidance: "核心是「掌控」。档位递进是关键，每次提高都要观察对方反应。「不许躲」的掌控感是重点，但不要写成虐待。"
  },
  {
    actId: "toy_use_self",
    titleTemplate: "{partner}对主角使用玩具",
    tone: "被动、交出控制、失控",
    props: ["vibrator"],
    beats: [
      { pose: "give_over", action: "主角把玩具交给对方，表示让对方来", sense: "交出控制权的不习惯", mind: "信任对方的姿态", speech: "「你来。」" },
      { pose: "first", action: "对方先用最低档试探", sense: "意料之外的震感", mind: "被掌控的微妙不适" },
      { pose: "play", action: "对方故意忽高忽低地捉弄", sense: "无法预测的节奏", mind: "想夺回控制又不想打断", speech: "「你……」" },
      { pose: "hold", action: "主角想躲时被对方按住", sense: "被迫承受的刺激", mind: "被动接受的快感" },
      { pose: "break", action: "最后在对方的掌控下失控", sense: "彻底放开的冲击", mind: "交出控制的释然" }
    ],
    guidance: "核心是「交出控制」。主角从主动到被动的转变是重点，被捉弄时想夺回控制又不想打断的矛盾心理要写清楚。"
  },
  {
    actId: "double_dildo",
    titleTemplate: "双头龙·与{partner}",
    tone: "互相牵制、节奏必须同步",
    props: ["dildo_double"],
    beats: [
      { pose: "arrange", action: "两人面对面或背对背，各持一端", sense: "器具的硬度与温度", mind: "必须配合的约束感", speech: "「一起。」" },
      { pose: "enter", action: "同时缓慢进入", sense: "两端同时被填满", mind: "同步的困难" },
      { pose: "sync", action: "尝试同步动作，互相迁就", sense: "一动另一端也动的连锁", mind: "完全依赖对方节奏的被动感" },
      { pose: "compete", action: "谁想快一点就会被另一端制约", sense: "被牵制的无力感", mind: "想主导却做不到的焦躁", speech: "「你慢点……」「是你快了。」" },
      { pose: "together", action: "找到共同节奏后一起加速", sense: "同步到达的双重冲击", mind: "默契形成的满足" },
      { pose: "collapse", action: "结束后各自喘息", sense: "连接的余韵", mind: "必须互相依赖的实感" }
    ],
    guidance: "核心是「互相牵制」。节奏必须同步，谁想快都会被制约，这种被迫的配合是重点。要写出焦躁与最终默契的形成。",
    requiresPrep: true
  },
  {
    actId: "strap_on_give",
    titleTemplate: "穿戴式·{partner}",
    tone: "主动、无肉体感觉的落差",
    props: ["strap_on"],
    beats: [
      { pose: "wear", action: "主角穿戴好，调整绑带", sense: "器具与身体分离的怪异", mind: "没有肉体感觉的落差", speech: "「会有点怪。」" },
      { pose: "position", action: "让对方摆好姿势", sense: "从上方看到的身体", mind: "完全靠视觉与反馈判断" },
      { pose: "entry", action: "缓慢进入，全靠对方的反应判断", sense: "没有直接触感的隔阂", mind: "必须更依赖观察", speech: "「疼就说。」" },
      { pose: "rhythm", action: "找节奏，只能靠对方的呻吟调整", sense: "间接的、观察得来的快感", mind: "从掌控他人中获得满足" },
      { pose: "climax", action: "对方到达，主角从对方的失控中获得满足", sense: "没有生理高潮但心理满足", mind: "掌控者的成就感" }
    ],
    guidance: "核心是「没有肉体感觉的落差」。主角完全靠视觉与对方的反应判断，这种间接性是重点。心理满足替代生理满足。"
  },
  {
    actId: "restraint_play",
    titleTemplate: "束缚·{partner}",
    tone: "信任、无力感、任人摆布",
    props: ["restraint_set"],
    beats: [
      { pose: "consent", action: "主角说明会用束缚带，确认对方同意", sense: "拿起束具的重量", mind: "必须确认的郑重", speech: "「不舒服就眨三下眼。」" },
      { pose: "bind_wrists", action: "先绑手腕，留出活动余地", sense: "布料或皮革的触感", mind: "观察对方的表情变化" },
      { pose: "bind_more", action: "视情况增加，固定脚踝或大腿", sense: "行动被限制的无力感", mind: "对方完全交出自己的信任" },
      { pose: "tease", action: "利用对方的无力感进行挑逗", sense: "想躲却躲不开的刺激", mind: "掌控与照顾并存的复杂感", speech: "「想让我碰哪里？」" },
      { pose: "release", action: "结束后立刻解开，检查勒痕", sense: "血液回流的感觉", mind: "照顾的责任感", speech: "「有没有麻？」" },
      { pose: "aftercare", action: "抱住对方，确认状态", sense: "体温、心跳", mind: "事后照顾是必须的" }
    ],
    guidance: "核心是「信任」与「事后照顾」。必须写清楚开始前的确认与结束后的检查。束缚是信任的极致体现，不是虐待。事后照顾环节不能省略。"
  }
];

const SCENE_BY_ACT = new Map(ACT_SCENES.map((s) => [s.actId, s]));

export function actScene(actId: string): ActSceneSpec | undefined {
  return SCENE_BY_ACT.get(actId);
}

/** 按部位筛选有场景的行为 */
export function scenesForPart(part: ActPart): ActSceneSpec[] {
  return ACT_SCENES.filter((s) => s.actId.startsWith(part.slice(0, 4)));
}

/** 统计 */
export function actSceneStats(): {
  total: number;
  totalBeats: number;
  avgBeats: number;
  withPrep: number;
  propUsing: number;
} {
  let totalBeats = 0;
  let withPrep = 0;
  let propUsing = 0;
  for (const s of ACT_SCENES) {
    totalBeats += s.beats.length;
    if (s.requiresPrep) withPrep++;
    if (s.props.length > 0) propUsing++;
  }
  return {
    total: ACT_SCENES.length,
    totalBeats,
    avgBeats: ACT_SCENES.length > 0 ? Math.round((totalBeats / ACT_SCENES.length) * 10) / 10 : 0,
    withPrep,
    propUsing
  };
}

/** 把场景骨架转成引擎可渲染的 Scene */
export function actSceneToScene(
  spec: ActSceneSpec,
  heroName: string,
  partnerName: string,
  variant: SceneVariant = "familiar"
): Scene {
  const title = spec.titleTemplate.replace("{partner}", partnerName);
  const variantNote = variant !== "familiar" ? `（${VARIANT_LABEL[variant]}）` : "";

  const beats: Beat[] = spec.beats.map((b, i) => {
    const lines: Line[] = [
      { layer: "action", text: b.action.replace(/{partner}/g, partnerName) },
      { layer: "sense", text: b.sense.replace(/{partner}/g, partnerName) },
      { layer: "mind", text: b.mind.replace(/{partner}/g, partnerName) }
    ];
    if (b.speech) {
      // 台词说话人：判断这句是谁说的
      const speaker = b.speech.includes("你") || b.speech.includes("主角")
        ? heroName
        : partnerName;
      lines.push({
        layer: "speech",
        speaker,
        text: b.speech.replace(/{partner}/g, partnerName)
      });
    }
    return { id: `${spec.actId}_b${i + 1}`, poseKey: b.pose, lines };
  });

  return {
    id: `act_${spec.actId}`,
    title: `${title}${variantNote}`,
    participants: [heroName, partnerName],
    tone: spec.tone,
    beats
  };
}

/** 生成给模型的提示词骨架 */
export function actSceneToPrompt(
  spec: ActSceneSpec,
  partnerName: string,
  variant: SceneVariant
): string {
  const lines: string[] = [];
  lines.push(`【场景】${spec.titleTemplate.replace("{partner}", partnerName)}`);
  lines.push(`【基调】${spec.tone}`);
  lines.push(`【差分】${VARIANT_LABEL[variant]}`);
  if (spec.props.length > 0) lines.push(`【道具】${spec.props.join("、")}`);
  lines.push("");
  lines.push("请严格按以下节拍生成，每拍用「---」分隔：");
  spec.beats.forEach((b, i) => {
    lines.push(`${i + 1}. 姿势=${b.pose}`);
    lines.push(`   动作：${b.action.replace(/{partner}/g, partnerName)}`);
    lines.push(`   感官：${b.sense.replace(/{partner}/g, partnerName)}`);
    lines.push(`   心理：${b.mind.replace(/{partner}/g, partnerName)}`);
    if (b.speech) lines.push(`   台词：${b.speech.replace(/{partner}/g, partnerName)}`);
  });
  lines.push("");
  lines.push(`【额外要求】${spec.guidance}`);
  return lines.join("\n");
}

/** 判断差分类型 */
export function pickVariant(opts: {
  partnerActs: number;
  partnerProficiency: number;
  pregnant: boolean;
  observers: number;
}): SceneVariant {
  if (opts.observers > 0) return "observer";
  if (opts.pregnant) return "pregnant";
  if (opts.partnerActs === 0) return "first";
  if (opts.partnerProficiency >= 6) return "skilled";
  return "familiar";
}
