/**
 * 日常 H 场景模板库。
 *
 * 定位（对应需求「让模型稳定产出，替代 160 场手写」）：
 *  - 手写剧本覆盖关键剧情（破处/怀孕/分娩）
 *  - 本模板库覆盖日常可重复 H：给出「结构化骨架 + 提示词约束」
 *    模型按骨架填肉，产出稳定且贴合角色
 *  - 每个模板声明：地点、时段、姿势序列、参与人数、前置条件、
 *    道具、节拍骨架、语气基调
 *
 * 纯函数式。
 */
import type { ClothingSlot, BodyZone } from "./clothing.ts";

/** 场景发生地点 */
export type HLocation =
  | "bedroom" | "bathroom" | "kitchen" | "living_room" | "dining"
  | "garage" | "lab" | "greenhouse" | "training_room" | "monitor_room"
  | "bathhouse" | "vehicle_private" | "camp_tent" | "rooftop" | "cellar"
  | "workshop" | "private_room";

export const H_LOCATION_LABEL: Record<HLocation, string> = {
  bedroom: "卧室",
  bathroom: "浴室",
  kitchen: "厨房",
  living_room: "客厅",
  dining: "餐厅",
  garage: "车库",
  lab: "实验室",
  greenhouse: "温室",
  training_room: "训练场",
  monitor_room: "监控室",
  bathhouse: "大浴场",
  vehicle_private: "房车私室",
  camp_tent: "野外帐篷",
  rooftop: "屋顶",
  cellar: "地窖",
  workshop: "地下工厂",
  private_room: "专属空间"
};

/** 地点特性：影响描写侧重 */
export const H_LOCATION_TRAIT: Record<HLocation, string> = {
  bedroom: "私密、安静、床的触感是主体",
  bathroom: "湿热、水声、镜子与瓷砖的反光",
  kitchen: "站着、台面、节奏快、随时可能被打断",
  living_room: "半公开、沙发、有被撞见的风险",
  dining: "桌椅、餐具、半正式",
  garage: "工具台的冷硬、机油味、粗粝质感",
  lab: "冷硬的专业场所、器械、消毒水味、反差感",
  greenhouse: "植物环绕、湿热、泥土与叶片的触感",
  training_room: "运动后的汗味、镜子、垫子",
  monitor_room: "屏幕光、随时可能被传感器打断的紧张感",
  bathhouse: "蒸汽、大面积水面、多人共用",
  vehicle_private: "狭小、随车晃动、隔音改装后的密闭感",
  camp_tent: "帐篷布的单薄、外面有风声、随时可能有人经过",
  rooftop: "开阔、夜风、星空、暴露在外的刺激",
  cellar: "阴暗、储物架的阴影、潮湿空气",
  workshop: "机械与金属、机油味、加工台",
  private_room: "隔音、绝对私密、可以彻底放开"
};

/** 时段基调 */
export type HTimeSlot = "morning" | "forenoon" | "noon" | "evening" | "night" | "lateNight";

export const H_TIME_TONE: Record<HTimeSlot, string> = {
  morning: "半梦半醒、慵懒、晨间的生理反应",
  forenoon: "偷懒、离岗、匆忙而急切",
  noon: "午后倦怠、慢节奏、拉长的前戏",
  evening: "收工后的放松、身体还带着一天的疲惫",
  night: "正式、完整、有仪式感",
  lateNight: "私密、低语、安静到能听见呼吸"
};

/** 姿势序列中的一个节拍 */
export interface PoseBeat {
  /** 姿势键，供像素层切帧 */
  pose: string;
  /** 该节拍的动作要点（给模型的约束） */
  action: string;
  /** 该节拍的情绪走向 */
  mood: string;
}

/** 场景模板 */
export interface HTemplate {
  id: string;
  name: string;
  /** 适用地点 */
  locations: HLocation[];
  /** 适用时段 */
  times: HTimeSlot[];
  /** 参与人数：1 = 一对一，2+ = 多人 */
  minParticipants: number;
  maxParticipants: number;
  /** 前置条件描述（供 UI 提示） */
  requirement: string;
  /** 需要的道具标签 */
  props: string[];
  /** 是否可用扶她药 */
  allowsMed: boolean;
  /** 节拍骨架 */
  beats: PoseBeat[];
  /** 语气基调 */
  tone: string;
  /** 模型额外约束 */
  guidance: string;
  /** 场景分级 */
  tier: "minor" | "ambient";
}

// ============ 模板目录 ============

export const H_TEMPLATES: HTemplate[] = [
  {
    id: "morning_wake",
    name: "晨间唤醒",
    locations: ["bedroom"],
    times: ["morning"],
    minParticipants: 1, maxParticipants: 2,
    requirement: "好感 ≥ 40，同床或早起进入对方房间",
    props: [],
    allowsMed: false,
    tone: H_TIME_TONE.morning,
    beats: [
      { pose: "lying_close", action: "两人还躺着，身体贴在一起，对方的手在被子下慢慢移动", mood: "慵懒、不急着开始" },
      { pose: "hand_play", action: "手指探入衣料，隔着或贴着布料抚弄，观察反应", mood: "试探、看对方的反应" },
      { pose: "oral_wake", action: "对方滑下被子，用口唤醒，主角的手按住她的头发", mood: "主动、专注" },
      { pose: "morning_entry", action: "主角进入或对方坐上来，动作从慢到稳", mood: "彻底清醒后的投入" },
      { pose: "afterglow_hold", action: "结束后两人没动，阳光从窗帘缝里进来", mood: "温存、不想起床" }
    ],
    guidance: "强调「还没完全醒」的模糊感与逐渐清醒的过程。不要一上来就激烈。",
    tier: "minor"
  },
  {
    id: "night_visit",
    name: "深夜到访",
    locations: ["bedroom"],
    times: ["night", "lateNight"],
    minParticipants: 1, maxParticipants: 1,
    requirement: "好感 ≥ 60，或对方欲情 ≥ 80",
    props: [],
    allowsMed: false,
    tone: H_TIME_TONE.lateNight,
    beats: [
      { pose: "door_open", action: "门被轻轻推开，脚步声很轻，对方停在床边", mood: "犹豫、还是来了" },
      { pose: "climb_in", action: "她掀开被子钻进来，背对着或直接贴近", mood: "用行动代替开口" },
      { pose: "under_cover", action: "被子下的手开始动，两人都不说话", mood: "压抑着声音" },
      { pose: "slow_entry", action: "进入，动作很慢，怕弄出声音", mood: "克制、敏感" },
      { pose: "silent_climax", action: "高潮时咬住枕头或对方的手，不发出声音", mood: "极致的压抑与释放" }
    ],
    guidance: "核心是「不能出声」的压抑感。台词极少，多用呼吸与身体反应表达。",
    tier: "minor"
  },
  {
    id: "kitchen_quick",
    name: "厨房偷欢",
    locations: ["kitchen", "dining"],
    times: ["forenoon", "noon", "evening"],
    minParticipants: 1, maxParticipants: 2,
    requirement: "好感 ≥ 50，其他人不在附近",
    props: [],
    allowsMed: false,
    tone: "站着、台面、节奏快、随时可能被打断",
    beats: [
      { pose: "behind_hug", action: "从背后抱住，手从围裙下摆伸进去", mood: "偷袭式的亲密" },
      { pose: "bend_over", action: "把她压在料理台上，从背后进入", mood: "急促、没有前戏" },
      { pose: "hand_cover_mouth", action: "外面有脚步声，主角用手捂住她的嘴", mood: "紧张、刺激" },
      { pose: "quick_climax", action: "快速结束，两人赶紧整理衣服", mood: "意犹未尽的草率收场" }
    ],
    guidance: "强调「随时可能被撞见」的紧张感，动作快、台词少、有中途停顿听动静的细节。",
    tier: "minor"
  },
  {
    id: "bath_shared",
    name: "共浴",
    locations: ["bathroom", "bathhouse"],
    times: ["evening", "night"],
    minParticipants: 1, maxParticipants: 3,
    requirement: "好感 ≥ 55，浴室已建成",
    props: [],
    allowsMed: false,
    tone: "湿热、水声、皮肤在水下的触感",
    beats: [
      { pose: "back_wash", action: "她帮主角擦背，手从肩滑到腰", mood: "以照顾为名义的接近" },
      { pose: "front_wash", action: "转到正面，手上沾着泡沫往下走", mood: "明知道会发生什么" },
      { pose: "wall_press", action: "把主角按在瓷砖墙上，水从两人之间流下", mood: "主动、压迫" },
      { pose: "tub_entry", action: "进入浴缸，水面因动作而晃动溢出", mood: "节奏被水的阻力拖慢" },
      { pose: "wet_afterglow", action: "结束后靠在浴缸边，水已经温了", mood: "疲惫而满足" }
    ],
    guidance: "充分利用水的介质：浮力、阻力、水声、溢出的水。皮肤湿滑是重点。",
    tier: "minor"
  },
  {
    id: "training_sweat",
    name: "训练后的汗",
    locations: ["training_room"],
    times: ["forenoon", "noon", "evening"],
    minParticipants: 1, maxParticipants: 2,
    requirement: "训练场已建成，好感 ≥ 50",
    props: [],
    allowsMed: false,
    tone: "运动后的汗味、镜子、垫子",
    beats: [
      { pose: "spar_press", action: "对练中被压制在地垫上，两人都在喘", mood: "从较劲转向别的" },
      { pose: "stretch_tease", action: "她做拉伸，主角从镜子里看着她", mood: "被看的自觉" },
      { pose: "mirror_watch", action: "面对着镜子，主角在她身后", mood: "看着镜中自己的羞耻" },
      { pose: "mat_climax", action: "在地垫上结束，汗把垫子浸湿", mood: "剧烈、失控" }
    ],
    guidance: "核心是「汗与肌肉」的质感，以及镜子的视觉刺激。台词可以带较劲的语气。",
    tier: "minor"
  },
  {
    id: "lab_interrupt",
    name: "实验室的中断",
    locations: ["lab"],
    times: ["forenoon", "noon", "lateNight"],
    minParticipants: 1, maxParticipants: 2,
    requirement: "实验室已建成，好感 ≥ 60",
    props: ["实验台"],
    allowsMed: true,
    tone: "冷硬的专业场所、器械、消毒水味、反差感",
    beats: [
      { pose: "lean_bench", action: "她坐在实验台边缘，白大褂还穿着", mood: "专业外壳下的另一面" },
      { pose: "coat_open", action: "白大褂被解开，里面只剩内衣", mood: "脱掉身份的象征" },
      { pose: "bench_entry", action: "在实验台上进行，旁边是还开着的仪器", mood: "被设备的嗡鸣包围" },
      { pose: "sample_joke", action: "结束后她整理衣服，顺手记录了什么", mood: "若无其事地回到工作" }
    ],
    guidance: "重点在「专业场所」与「私密行为」的反差。仪器、消毒水味、白大褂是核心意象。",
    tier: "minor"
  },
  {
    id: "greenhouse_warm",
    name: "温室里的湿热",
    locations: ["greenhouse"],
    times: ["noon", "evening", "night"],
    minParticipants: 1, maxParticipants: 2,
    requirement: "温室已建成，好感 ≥ 50",
    props: [],
    allowsMed: false,
    tone: "植物环绕、湿热、泥土与叶片的触感",
    beats: [
      { pose: "watering_meet", action: "她在浇水，主角从背后靠近，手扶住她的腰", mood: "自然的接近" },
      { pose: "leaf_wall", action: "被抵在种植架旁，叶子擦过皮肤", mood: "被植物环绕的私密感" },
      { pose: "ground_soft", action: "转移到铺了布的土面上，湿热的空气让人出汗", mood: "闷热、黏腻" },
      { pose: "after_scent", action: "结束后空气里有泥土和植物汁液的味道", mood: "平静" }
    ],
    guidance: "充分利用温室的湿热、植物的触感与气味。出汗与黏腻是重点。",
    tier: "ambient"
  },
  {
    id: "vehicle_road",
    name: "房车私室·途中",
    locations: ["vehicle_private"],
    times: ["noon", "evening", "night"],
    minParticipants: 1, maxParticipants: 2,
    requirement: "房车私室已改装，正在远征途中",
    props: [],
    allowsMed: true,
    tone: "狭小、随车晃动、隔音改装后的密闭感",
    beats: [
      { pose: "narrow_sit", action: "空间太窄，两人只能贴在一起坐着", mood: "被迫的亲密" },
      { pose: "bump_rhythm", action: "车过颠簸路段，动作被路面打断又继续", mood: "被外物干扰的节奏" },
      { pose: "outside_view", action: "透过小窗能看到外面荒凉的公路", mood: "世界只剩这一间" },
      { pose: "park_stop", action: "车停下，外面很安静", mood: "安静下来后的专注" }
    ],
    guidance: "核心是「狭小空间」与「车辆晃动」。车窗外的荒原对比车内是重点。",
    tier: "minor"
  },
  {
    id: "rooftop_night",
    name: "屋顶的夜",
    locations: ["rooftop"],
    times: ["night", "lateNight"],
    minParticipants: 1, maxParticipants: 2,
    requirement: "好感 ≥ 70，天气晴朗",
    props: [],
    allowsMed: false,
    tone: "开阔、夜风、星空、暴露在外的刺激",
    beats: [
      { pose: "sit_watch", action: "两人坐在屋顶边缘，肩靠着肩", mood: "平静的前奏" },
      { pose: "turn_kiss", action: "她转过头来吻，手撑在身后的瓦片上", mood: "自然的转折" },
      { pose: "edge_danger", action: "在屋顶边缘进行，下面是很高的落差", mood: "危险带来的刺激" },
      { pose: "starlit_end", action: "结束后两人躺着看星星", mood: "辽阔而安静" }
    ],
    guidance: "强调开阔的环境、夜风、星空的辽阔感，以及高处带来的紧张刺激。",
    tier: "ambient"
  },
  {
    id: "after_raid",
    name: "战后安抚",
    locations: ["bedroom", "living_room"],
    times: ["night", "lateNight"],
    minParticipants: 1, maxParticipants: 2,
    requirement: "刚经历夜袭事件，好感 ≥ 60",
    props: [],
    allowsMed: false,
    tone: "紧绷后的释放、手还在抖",
    beats: [
      { pose: "hand_tremble", action: "她的手还在抖，主角握住", mood: "肾上腺素未退" },
      { pose: "urgent_kiss", action: "吻得很急，像是在确认彼此还活着", mood: "用身体确认存在" },
      { pose: "tight_hold", action: "抱得很紧，动作带着还没散尽的暴力感", mood: "失控边缘" },
      { pose: "collapse", action: "结束后两人瘫着，谁都没说话", mood: "彻底的疲惫" }
    ],
    guidance: "核心是「紧绷后的释放」。动作带一点失控感，台词少而短。不要写成暴力。",
    tier: "minor"
  },
  {
    id: "rainy_day",
    name: "雨天的午后",
    locations: ["bedroom", "living_room", "cellar"],
    times: ["noon"],
    minParticipants: 1, maxParticipants: 2,
    requirement: "天气为雨，好感 ≥ 45",
    props: [],
    allowsMed: false,
    tone: "雨声、慵懒、没有别的安排",
    beats: [
      { pose: "window_watch", action: "两人看着窗外的雨，她靠在主角肩上", mood: "无所事事" },
      { pose: "slow_undress", action: "慢慢解开衣服，动作被雨声放慢", mood: "不着急" },
      { pose: "long_foreplay", action: "前戏很长，反复在边缘停下", mood: "刻意的拖延" },
      { pose: "rain_climax", action: "高潮时正好一道雷声盖过她的声音", mood: "被雨声掩护" },
      { pose: "under_blanket", action: "结束后盖着毯子听雨", mood: "温暖、满足" }
    ],
    guidance: "雨声是贯穿全程的背景。节奏要慢，前戏要长，避免激烈。",
    tier: "ambient"
  },
  {
    id: "bathhouse_group",
    name: "大浴场的多人",
    locations: ["bathhouse"],
    times: ["evening", "night"],
    minParticipants: 2, maxParticipants: 4,
    requirement: "大浴场已建成，至少 2 名同伴好感 ≥ 60",
    props: ["性玩具"],
    allowsMed: true,
    tone: "蒸汽、大面积水面、多人共用",
    beats: [
      { pose: "water_approach", action: "两人在水中靠近主角，水汽模糊了视线", mood: "默契的包围" },
      { pose: "dual_hands", action: "一人一边，手同时伸过来", mood: "被两个人同时对待" },
      { pose: "toy_join", action: "其中一人拿出了玩具", mood: "场景升级" },
      { pose: "steam_multi", action: "水汽里分不清谁在做什么", mood: "混乱而投入" },
      { pose: "pool_rest", action: "结束后靠在水池边，蒸汽还在上升", mood: "疲惫的安静" }
    ],
    guidance: "多人场景：不要写成流水账，要写出「分不清谁是谁」的混乱感。每个角色仍有性格反应。",
    tier: "minor"
  },
  {
    id: "med_effect",
    name: "药效之下",
    locations: ["bedroom", "living_room", "vehicle_private"],
    times: ["night", "lateNight", "noon"],
    minParticipants: 1, maxParticipants: 2,
    requirement: "持有扶她药，好感 ≥ 65",
    props: ["娱乐型扶她药"],
    allowsMed: true,
    tone: "身体变化带来的新奇与失控",
    beats: [
      { pose: "take_med", action: "她当着主角的面服下药，等待反应", mood: "期待与紧张" },
      { pose: "body_change", action: "身体开始变化，她低头看着自己的新部位", mood: "新奇、不知所措" },
      { pose: "reverse_entry", action: "她第一次以这个形态进入主角", mood: "生涩但投入" },
      { pose: "adjust_rhythm", action: "从笨拙到找到节奏", mood: "渐入佳境" },
      { pose: "effect_fade", action: "药效开始退去，她有些不舍", mood: "短暂的拥有" }
    ],
    guidance: "药效是短暂的（数小时）。重点写「身体变化的新奇感」与「药效退去的不舍」。",
    tier: "minor"
  },
  {
    id: "morning_after",
    name: "事后的清晨",
    locations: ["bedroom"],
    times: ["morning"],
    minParticipants: 1, maxParticipants: 2,
    requirement: "前一晚发生过亲密行为",
    props: [],
    allowsMed: false,
    tone: "疲惫、满足、残留的体温",
    beats: [
      { pose: "tangled", action: "两人还缠在一起，谁都没先动", mood: "不想打破" },
      { pose: "trace_marks", action: "她用手指描主角身上的痕迹", mood: "回味的平静" },
      { pose: "lazy_touch", action: "又摸到一起，但谁都没打算真的再来一次", mood: "慵懒的试探" },
      { pose: "get_up", action: "最后还是得起床", mood: "不情愿的结束" }
    ],
    guidance: "这是纯余韵场景，不要安排第二次高潮。重点在身体接触与安静的氛围。",
    tier: "ambient"
  },
  {
    id: "jealous_claim",
    name: "吃醋的宣示",
    locations: ["bedroom", "living_room"],
    times: ["night"],
    minParticipants: 1, maxParticipants: 1,
    requirement: "该同伴好感 ≥ 75，且近期主角与其他同伴亲密过",
    props: [],
    allowsMed: false,
    tone: "占有欲、带一点赌气",
    beats: [
      { pose: "block_door", action: "她堵在门口，问主角今天去了哪里", mood: "兴师问罪" },
      { pose: "push_down", action: "把主角推倒，动作比平时用力", mood: "带着情绪的主动" },
      { pose: "mark_body", action: "刻意留下痕迹，说要让所有人都看见", mood: "占有欲的宣示" },
      { pose: "rough_end", action: "结束时她说下次不许这样", mood: "嘴硬心软" }
    ],
    guidance: "台词要带赌气的成分，动作比平时用力，但核心不是暴力而是占有欲。",
    tier: "minor"
  },
  {
    id: "toy_lesson",
    name: "玩具教学",
    locations: ["bedroom"],
    times: ["evening", "night"],
    minParticipants: 2, maxParticipants: 3,
    requirement: "持有性玩具，至少 2 名同伴好感 ≥ 65",
    props: ["双头龙", "穿戴式假阳具"],
    allowsMed: false,
    tone: "教导、观察、逐渐卷入",
    beats: [
      { pose: "show_toy", action: "一人拿出玩具，另一人好奇地看着", mood: "教学的开场" },
      { pose: "guide_hand", action: "有经验的那个握着另一个的手引导", mood: "手把手" },
      { pose: "observe_first", action: "主角在旁边看着，被观察的那个更紧张", mood: "被看的自觉" },
      { pose: "join_all", action: "主角最终加入，变成三人", mood: "场景升级" }
    ],
    guidance: "教学场景的重点是「有经验者引导新手」的过程。新手的笨拙与逐渐熟练要写清楚。",
    tier: "minor"
  },
  {
    id: "work_break",
    name: "工作中的短暂离开",
    locations: ["lab", "workshop", "monitor_room", "greenhouse"],
    times: ["forenoon", "noon"],
    minParticipants: 1, maxParticipants: 1,
    requirement: "好感 ≥ 55，对方正在岗位上",
    props: [],
    allowsMed: false,
    tone: "从岗位上被叫走、时间有限",
    beats: [
      { pose: "pull_aside", action: "主角把她从岗位上拉进隔间", mood: "突然的打断" },
      { pose: "fast_start", action: "没有前戏，直接开始", mood: "时间紧迫" },
      { pose: "listen_door", action: "外面有人经过，两人停下", mood: "紧张" },
      { pose: "return_work", action: "结束后她整理衣服回去继续干活", mood: "若无其事" }
    ],
    guidance: "强调「时间有限」与「随时要回去」的紧迫感。台词少，动作快。",
    tier: "minor"
  },
  {
    id: "first_after_bond",
    name: "羁绊升级后的第一次",
    locations: ["bedroom", "private_room"],
    times: ["night"],
    minParticipants: 1, maxParticipants: 1,
    requirement: "该同伴羁绊刚升到新等级",
    props: [],
    allowsMed: false,
    tone: "关系变化后的郑重",
    beats: [
      { pose: "confess_change", action: "她说出关系变了，从今往后不一样了", mood: "郑重的开场" },
      { pose: "slow_undress", action: "很慢地解开衣服，像在完成一个仪式", mood: "认真对待" },
      { pose: "face_to_face", action: "面对面进行，全程看着对方的眼睛", mood: "没有回避" },
      { pose: "promise", action: "结束后她说了什么，主角没回答但抱得更紧", mood: "不需要回应的承诺" }
    ],
    guidance: "这是关系里程碑场景，基调庄重而非激烈。全程保持对视与慢节奏。",
    tier: "minor"
  },
  {
    id: "garage_hands",
    name: "车库里的手",
    locations: ["garage"],
    times: ["forenoon", "noon", "evening"],
    minParticipants: 1, maxParticipants: 2,
    requirement: "车库已建成，好感 ≥ 50",
    props: [],
    allowsMed: false,
    tone: "工具台的冷硬、机油味、粗粝质感",
    beats: [
      { pose: "tool_lean", action: "她靠在工具台边，手上还沾着机油，主角走过去握住那只手", mood: "粗糙与柔软的对比" },
      { pose: "bench_sit", action: "被抱上工具台，冰冷的金属隔着衣料也能感觉到", mood: "冷硬的触感" },
      { pose: "dirty_hand", action: "机油蹭在皮肤上，留下一道道痕迹", mood: "被弄脏的自觉" },
      { pose: "hood_hot", action: "旁边是刚熄火的车，引擎盖还有余温", mood: "两种热度" },
      { pose: "wipe_off", action: "结束后她用抹布擦手，也擦主角身上的印子", mood: "若无其事地收拾" }
    ],
    guidance: "核心意象是机油、金属、工具。粗粝的环境与身体的柔软形成对比。",
    tier: "minor"
  },
  {
    id: "cellar_dark",
    name: "地窖的黑暗",
    locations: ["cellar"],
    times: ["night", "lateNight"],
    minParticipants: 1, maxParticipants: 2,
    requirement: "地窖已建成，好感 ≥ 55",
    props: [],
    allowsMed: false,
    tone: "阴暗、储物架的阴影、潮湿空气",
    beats: [
      { pose: "fetch_supplies", action: "她下地窖取东西，主角跟着下去", mood: "日常的开端" },
      { pose: "dark_touch", action: "灯坏了，黑暗中只能靠摸的", mood: "视觉被剥夺" },
      { pose: "shelf_press", action: "被抵在储物架上，罐头在身后晃动", mood: "触觉与听觉放大" },
      { pose: "echo_voice", action: "地窖有回音，她的声音听起来不一样", mood: "空间感异常" }
    ],
    guidance: "强调黑暗中被剥夺视觉后的触觉与听觉放大。罐头晃动、回音是重点细节。",
    tier: "ambient"
  },
  {
    id: "dining_formal",
    name: "餐桌旁的半正式",
    locations: ["dining"],
    times: ["evening", "night"],
    minParticipants: 1, maxParticipants: 2,
    requirement: "餐厅已建成，好感 ≥ 60",
    props: [],
    allowsMed: false,
    tone: "桌椅、餐具、半正式的氛围",
    beats: [
      { pose: "after_meal", action: "饭后两人还坐在桌边，她用小指碰了碰主角的手", mood: "试探性的开场" },
      { pose: "lap_sit", action: "她坐到主角腿上，裙摆散在桌面下", mood: "半公开的亲密" },
      { pose: "table_edge", action: "转移到桌沿，餐具被推到一边发出声响", mood: "被打断的仪式感" },
      { pose: "clean_up", action: "结束后两人默默收拾碗筷", mood: "回到日常" }
    ],
    guidance: "半正式场合的张力：餐具、桌布、椅子。不要写成完全私密的场景。",
    tier: "ambient"
  },
  {
    id: "camp_outdoor",
    name: "野外帐篷",
    locations: ["camp_tent"],
    times: ["night", "lateNight"],
    minParticipants: 1, maxParticipants: 2,
    requirement: "房车扩展营地已改装，正在野外过夜",
    props: [],
    allowsMed: true,
    tone: "帐篷布的单薄、外面有风声、随时可能有人经过",
    beats: [
      { pose: "zip_close", action: "她拉上帐篷拉链，外面的风声立刻变得遥远", mood: "制造一个封闭空间" },
      { pose: "sleeping_bag", action: "两个人挤在一个睡袋里，空间不够只能贴着", mood: "被迫的紧密" },
      { pose: "quiet_voice", action: "隔壁帐篷有动静，她捂住自己的嘴", mood: "不能出声" },
      { pose: "wind_cover", action: "一阵风吹得帐篷作响，正好盖住声音", mood: "被自然掩护" },
      { pose: "morning_dew", action: "天亮后帐篷内壁结满水珠", mood: "潮湿的清晨" }
    ],
    guidance: "帐篷的单薄与外面的野外交互为重点。压低声音、随时可能被听见是核心张力。",
    tier: "minor"
  },
  {
    id: "monitor_watch",
    name: "监控室的屏幕光",
    locations: ["monitor_room"],
    times: ["lateNight", "night"],
    minParticipants: 1, maxParticipants: 2,
    requirement: "通讯室已建成，好感 ≥ 55",
    props: [],
    allowsMed: false,
    tone: "屏幕光、随时可能被传感器打断的紧张感",
    beats: [
      { pose: "night_shift", action: "她值夜班，盯着屏幕，主角端了杯热的进来", mood: "日常的关心" },
      { pose: "chair_turn", action: "她转过椅子，主角俯身吻她", mood: "从工作转向别的" },
      { pose: "screen_glow", action: "只有屏幕的光照着两个人，脸色发蓝", mood: "冷光源下的身体" },
      { pose: "alert_pause", action: "传感器突然报警，两人同时僵住", mood: "被打断的紧张" },
      { pose: "resume_after", action: "确认是误报后，她主动拉回主角", mood: "被打断后的急切" }
    ],
    guidance: "屏幕冷光、警报可能随时打断——这两个元素构成核心张力。",
    tier: "minor"
  },
  {
    id: "workshop_metal",
    name: "工厂的加工台",
    locations: ["workshop"],
    times: ["forenoon", "noon", "night"],
    minParticipants: 1, maxParticipants: 2,
    requirement: "地下工厂已建成，好感 ≥ 60",
    props: ["穿戴式假阳具"],
    allowsMed: true,
    tone: "机械与金属、机油味、加工台",
    beats: [
      { pose: "machine_off", action: "她关掉机器，厂房突然安静下来", mood: "噪音消失后的空" },
      { pose: "bench_tools", action: "加工台上还散着工具，被扫到一边", mood: "工具落地的声响" },
      { pose: "strap_on", action: "她从工具架上取下改装过的穿戴式道具", mood: "把工作成果用在别处" },
      { pose: "steady_rhythm", action: "动作带着机械般的规律感", mood: "精准而持久" },
      { pose: "machine_on", action: "结束后她重新开机器，噪音回来了", mood: "回到工作" }
    ],
    guidance: "机械的规律感与身体的反应形成对比。机器的开关是天然的段落标记。",
    tier: "minor"
  },
  {
    id: "private_room_full",
    name: "专属空间·彻底放开",
    locations: ["private_room"],
    times: ["night", "lateNight", "noon"],
    minParticipants: 1, maxParticipants: 3,
    requirement: "专属空间已建成（隔音），好感 ≥ 75",
    props: ["性玩具", "捆绑带"],
    allowsMed: true,
    tone: "隔音、绝对私密、可以彻底放开",
    beats: [
      { pose: "door_lock", action: "她反锁了门，说这里没人听得见", mood: "解除所有顾虑" },
      { pose: "undress_slow", action: "慢慢地、完整地脱掉所有衣服", mood: "不再需要保留" },
      { pose: "toy_select", action: "她从柜子里挑道具，问主角想要哪个", mood: "选择权交给对方" },
      { pose: "restraint", action: "用上捆绑带，把主动权交出去或拿过来", mood: "信任的极限" },
      { pose: "loud_climax", action: "因为隔音，她第一次不再压抑声音", mood: "彻底的释放" },
      { pose: "long_after", action: "结束后两人躺着，谁都不急着穿衣服", mood: "安全的余韵" }
    ],
    guidance: "这个场景的核心是「不必压抑」。与深夜到访的压抑感形成对比，声音可以放开。",
    tier: "minor"
  },
  {
    id: "garden_dawn",
    name: "温室·天亮前",
    locations: ["greenhouse"],
    times: ["morning", "forenoon"],
    minParticipants: 1, maxParticipants: 1,
    requirement: "温室已建成，好感 ≥ 45",
    props: [],
    allowsMed: false,
    tone: "清晨的湿气、植物、安静",
    beats: [
      { pose: "early_water", action: "天没亮她就来浇水，主角跟着进来", mood: "还没睡醒的对话" },
      { pose: "warm_air", action: "温室里比外面暖，衣服显得多余", mood: "温度的对比" },
      { pose: "soil_kneel", action: "在松过的土面上，膝盖陷进去", mood: "被土地包围" },
      { pose: "first_light", action: "阳光透过玻璃照进来，照在两个人身上", mood: "光线的变化" }
    ],
    guidance: "清晨温室的光线与湿气是核心。节奏要慢，像刚醒来的状态。",
    tier: "ambient"
  },
  {
    id: "living_public",
    name: "客厅的半公开",
    locations: ["living_room"],
    times: ["evening", "night"],
    minParticipants: 1, maxParticipants: 3,
    requirement: "好感 ≥ 55，其他同伴可能经过",
    props: [],
    allowsMed: false,
    tone: "半公开、沙发、有被撞见的风险",
    beats: [
      { pose: "sofa_sit", action: "两人在沙发上，手在毯子下面动", mood: "表面正常" },
      { pose: "door_sound", action: "走廊有脚步声，两人立刻分开", mood: "装作若无其事" },
      { pose: "resume_bold", action: "声音远去后，她反而更大胆了", mood: "刺激感升级" },
      { pose: "almost_seen", action: "门被推开一条缝，又被关上", mood: "心跳到嗓子眼" },
      { pose: "quick_finish", action: "匆忙结束，整理好衣服", mood: "庆幸与不甘" }
    ],
    guidance: "半公开场合的核心是「随时可能被看见」。脚步声与门缝是关键的紧张来源。",
    tier: "minor"
  },
  {
    id: "bath_quick",
    name: "浴室的速战",
    locations: ["bathroom"],
    times: ["morning", "forenoon", "noon"],
    minParticipants: 1, maxParticipants: 2,
    requirement: "好感 ≥ 50",
    props: [],
    allowsMed: false,
    tone: "水汽、瓷砖、站着",
    beats: [
      { pose: "brush_together", action: "两人并排刷牙，镜子里互相看", mood: "日常的开场" },
      { pose: "sink_press", action: "被按在洗手台上，镜子里能看见两个人的表情", mood: "被镜子逼视" },
      { pose: "shower_stand", action: "转移到淋浴间，站着进行，水一直开着", mood: "湿滑、站立不稳" },
      { pose: "steam_mirror", action: "结束时镜子全是雾，什么都看不见了", mood: "视线被遮蔽" }
    ],
    guidance: "镜子的视觉刺激与湿滑的地面是重点。节奏比共浴更快。",
    tier: "ambient"
  },
  {
    id: "quiet_company",
    name: "无声的陪伴",
    locations: ["living_room", "bedroom", "rooftop"],
    times: ["lateNight"],
    minParticipants: 1, maxParticipants: 1,
    requirement: "好感 ≥ 50，主角心情较低",
    props: [],
    allowsMed: false,
    tone: "安静、不需要理由",
    beats: [
      { pose: "sit_quiet", action: "她什么都没问，只是坐到主角旁边", mood: "不说话" },
      { pose: "lean_in", action: "靠过来，头搁在主角肩上", mood: "提供身体的存在感" },
      { pose: "gentle_touch", action: "手慢慢摸上来，动作很轻", mood: "不是要索取什么" },
      { pose: "hold_end", action: "结束后她只是抱着，没有别的动作", mood: "安静地结束" }
    ],
    guidance: "全程台词极少甚至没有。重点在身体的存在感与安静。不要写成情欲场景。",
    tier: "ambient"
  }
];

const BY_ID = new Map(H_TEMPLATES.map((x) => [x.id, x]));

export function hTemplate(id: string): HTemplate | undefined {
  return BY_ID.get(id);
}

/** 按地点筛选 */
export function templatesAtLocation(loc: HLocation): HTemplate[] {
  return H_TEMPLATES.filter((t) => t.locations.includes(loc));
}

/** 按时段筛选 */
export function templatesAtTime(time: HTimeSlot): HTemplate[] {
  return H_TEMPLATES.filter((t) => t.times.includes(time));
}

export function templatesByTier(tier: "minor" | "ambient"): HTemplate[] {
  return H_TEMPLATES.filter((t) => t.tier === tier);
}

/** 场景上下文：用于筛选可用模板 */
export interface HTemplateContext {
  location: HLocation;
  time: HTimeSlot;
  participants: number;
  /** 队伍中是否有人持有性玩具 */
  hasToy: boolean;
  /** 娱乐型扶她药存货 */
  medStock: number;
  /** 是否有私人房间设施 */
  hasPrivateRoom: boolean;
  /** 好感最低值（参与者的） */
  minAffection: number;
}

export interface TemplateMatch {
  template: HTemplate;
  /** 匹配度 0-1 */
  score: number;
  /** 不满足的条件（软性，可为空） */
  unmet: string[];
}

/** 筛选当前情境下可用的模板，按匹配度排序 */
export function matchTemplates(ctx: HTemplateContext): TemplateMatch[] {
  const out: TemplateMatch[] = [];

  for (const t of H_TEMPLATES) {
    const unmet: string[] = [];
    let score = 0;

    // 地点（硬条件）
    if (!t.locations.includes(ctx.location)) continue;
    score += 0.35;

    // 时段（硬条件）
    if (!t.times.includes(ctx.time)) continue;
    score += 0.25;

    // 人数（硬条件）
    if (ctx.participants < t.minParticipants || ctx.participants > t.maxParticipants) continue;
    score += 0.15;

    // 道具（软条件）
    if (t.props.includes("性玩具") || t.props.includes("双头龙") || t.props.includes("穿戴式假阳具")) {
      if (ctx.hasToy) score += 0.1;
      else unmet.push("需要性玩具");
    } else if (t.props.length === 0) {
      score += 0.1;
    }

    // 扶她药（软条件）
    if (t.allowsMed && t.props.some((p) => p.includes("扶她药"))) {
      if (ctx.medStock > 0) score += 0.08;
      else unmet.push("需要娱乐型扶她药");
    }

    // 私密空间
    if (t.locations.includes("private_room")) {
      if (ctx.hasPrivateRoom) score += 0.05;
      else unmet.push("需要专属空间");
    }

    // 好感
    if (ctx.minAffection >= 70) score += 0.07;
    else if (ctx.minAffection >= 50) score += 0.04;
    else unmet.push("好感偏低");

    out.push({ template: t, score: Math.min(1, score), unmet });
  }

  return out.sort((a, b) => b.score - a.score);
}

/** 随机挑一个可用模板（确定性） */
export function pickTemplate(ctx: HTemplateContext, rng: () => number): HTemplate | null {
  const matches = matchTemplates(ctx).filter((m) => m.unmet.length === 0);
  if (matches.length === 0) return null;
  // 按 score 加权
  const total = matches.reduce((s, m) => s + m.score, 0);
  let acc = 0;
  const target = rng() * total;
  for (const m of matches) {
    acc += m.score;
    if (target <= acc) return m.template;
  }
  return matches[matches.length - 1].template;
}

// ============ 生成提示词骨架 ============

/**
 * 把模板转成给模型的「骨架提示」。
 * 模型按节拍顺序填肉，保证产出结构稳定。
 */
export function templateToPrompt(t: HTemplate, participantNames: string[]): string {
  const lines: string[] = [];
  lines.push(`【场景骨架】${t.name}`);
  lines.push(`【基调】${t.tone}`);
  lines.push(`【节拍数】${t.beats.length}`);
  lines.push("");
  lines.push("请严格按以下节拍顺序生成，每个节拍用「---」分隔：");
  t.beats.forEach((b, i) => {
    lines.push(`${i + 1}. 姿势=${b.pose}　动作要点：${b.action}　情绪：${b.mood}`);
  });
  lines.push("");
  lines.push(`【参与角色】${participantNames.join("、")}`);
  if (t.props.length > 0) lines.push(`【可用道具】${t.props.join("、")}`);
  lines.push("");
  lines.push(`【额外要求】${t.guidance}`);
  return lines.join("\n");
}

/** 模板统计 */
export function templateStats(): {
  total: number;
  minor: number;
  ambient: number;
  byLocation: Record<string, number>;
  totalBeats: number;
  avgBeats: number;
} {
  const byLocation: Record<string, number> = {};
  let totalBeats = 0;
  for (const t of H_TEMPLATES) {
    for (const l of t.locations) byLocation[l] = (byLocation[l] ?? 0) + 1;
    totalBeats += t.beats.length;
  }
  return {
    total: H_TEMPLATES.length,
    minor: templatesByTier("minor").length,
    ambient: templatesByTier("ambient").length,
    byLocation,
    totalBeats,
    avgBeats: H_TEMPLATES.length > 0 ? Math.round((totalBeats / H_TEMPLATES.length) * 10) / 10 : 0
  };
}

// ============ 模板 → Scene 转换 ============

import type { Scene, Beat, Line } from "../text/engine.ts";

/**
 * 把模板转成引擎可渲染的 Scene。
 *
 * 说明：模板只提供「骨架」，因此生成的节拍里每个动作要点作为一条
 * 提示性 action 行，情绪作为一条 mind 行。模型生成时会替换为完整文本；
 * 未启用模型时玩家至少能看到这场戏的结构与走向。
 */
export function templateToScene(
  t: HTemplate,
  participants: string[],
  locationLabel: string,
  timeTone: string
): Scene {
  const beats: Beat[] = t.beats.map((b, i) => {
    const lines: Line[] = [
      { layer: "action", text: b.action },
      { layer: "mind", text: b.mood }
    ];
    // 参与者的第一人在每个节拍给一句台词提示（真正的台词由模型填）
    if (participants.length > 1) {
      lines.push({
        layer: "speech",
        speaker: participants[1],
        text: "（此处为台词占位，可用本地模型生成完整内容）"
      });
    }
    return {
      id: `${t.id}_b${i + 1}`,
      poseKey: b.pose,
      lines
    };
  });

  return {
    id: `h_${t.id}`,
    title: `${t.name}（${locationLabel}·${timeTone}）`,
    participants: ["主角", ...participants],
    tone: t.tone,
    beats
  };
}

/** 判断模板是否匹配当前情境（硬条件） */
export function templateFits(
  t: HTemplate,
  location: HLocation,
  time: HTimeSlot,
  participants: number
): boolean {
  if (!t.locations.includes(location)) return false;
  if (!t.times.includes(time)) return false;
  if (participants < t.minParticipants || participants > t.maxParticipants) return false;
  return true;
}

/** 模板 id 前缀，用于与手写剧本区分 */
export const H_TEMPLATE_PREFIX = "h_";

/** 从场景 id 反查模板 */
export function templateFromSceneId(sceneId: string): HTemplate | undefined {
  if (!sceneId.startsWith(H_TEMPLATE_PREFIX)) return undefined;
  return hTemplate(sceneId.slice(H_TEMPLATE_PREFIX.length));
}
