/**
 * 序章与教程系统。
 *
 * 设计定位：
 *  - 游戏不是从避难所开始，而是从**末日前**的普通生活开始
 *  - 序章分 5 个阶段，玩家逐步经历：觉醒 → 写 AI → 备料 → 建房 → 末日
 *  - 序章期间时间是「末日倒计时」，不是正计时
 *  - 家人一开始就同住（本来就是一家人），但没有「后宫关系」
 *  - 房车是主角存钱买的二手车，末日前只是代步工具
 *  - 序章完成后才进入主游戏（避难所 + 主线 + 探索）
 *
 * 纯函数式，不触碰 IO。
 */

// ============ 序章阶段 ============

export type PrologueStage =
  | "normal"      // 平凡日常（末日前 30 天起）
  | "premonition" // 预知觉醒
  | "ai_birth"    // 写下第一行 AI 代码
  | "prepare"     // 秘密筹备（伪装成装修/投资）
  | "shelter"     // 建造安全屋
  | "countdown"   // 末日倒计时（最后 3 天）
  | "outbreak"    // 末日爆发
  | "settled"     // 安顿（序章结束）
  | "done";       // 已进入主游戏

export const PROLOGUE_ORDER: PrologueStage[] = [
  "normal", "premonition", "ai_birth", "prepare",
  "shelter", "countdown", "outbreak", "settled", "done"
];

export const PROLOGUE_LABEL: Record<PrologueStage, string> = {
  normal: "平凡的日常",
  premonition: "预知觉醒",
  ai_birth: "第一行代码",
  prepare: "秘密筹备",
  shelter: "安全屋",
  countdown: "倒计时",
  outbreak: "末日爆发",
  settled: "安顿",
  done: "生存开始"
};

export const PROLOGUE_DESC: Record<PrologueStage, string> = {
  normal: "一切都还正常。你上班、回家、和家人吃饭。",
  premonition: "你开始看见还没发生的事。",
  ai_birth: "你在深夜写下一段不该存在的代码。",
  prepare: "你把积蓄换成物资，告诉家人是投资。",
  shelter: "你租下一块山地，说想建个度假屋。",
  countdown: "还剩三天。你决定摊牌。",
  outbreak: "新闻里的东西开始出现在街对面。",
  settled: "门锁上了。所有人都在里面。",
  done: "生存开始。"
};

/** 序章各阶段的倒计时天数（末日前） */
export const PROLOGUE_DAYS: Record<PrologueStage, number> = {
  normal: 30,
  premonition: 21,
  ai_birth: 16,
  prepare: 10,
  shelter: 5,
  countdown: 3,
  outbreak: 0,
  settled: -1,
  done: -99
};

/** 下一个阶段 */
export function nextPrologueStage(s: PrologueStage): PrologueStage {
  const i = PROLOGUE_ORDER.indexOf(s);
  if (i < 0 || i >= PROLOGUE_ORDER.length - 1) return "done";
  return PROLOGUE_ORDER[i + 1];
}

/** 序章是否已结束（进入主游戏） */
export function prologueFinished(s: PrologueStage): boolean {
  return s === "done";
}

/** 序章进度 0-1 */
export function prologueProgress(s: PrologueStage): number {
  const i = PROLOGUE_ORDER.indexOf(s);
  return i < 0 ? 1 : i / (PROLOGUE_ORDER.length - 1);
}

// ============ 序章场景 ============

export interface PrologueBeat {
  pose: string;
  action: string;
  sense: string;
  mind: string;
  speaker?: string;
  speech?: string;
}

export interface PrologueScene {
  id: string;
  stage: PrologueStage;
  title: string;
  /** 进入条件描述 */
  condition: string;
  beats: PrologueBeat[];
  /** 完成后的效果说明 */
  effects: string[];
  /** 是否可跳过（老玩家重玩时） */
  skippable: boolean;
}

export const PROLOGUE_SCENES: PrologueScene[] = [
  // ---------- 1. 平凡日常 ----------
  {
    id: "prologue_normal",
    stage: "normal",
    title: "最后一个正常的周五",
    condition: "游戏开始",
    skippable: false,
    beats: [
      {
        pose: "desk_work",
        action: "你关掉公司电脑，窗外是下午五点的城市。屏幕右下角弹出一条新闻推送，你随手划掉了。",
        sense: "中央空调停了半小时，办公室里闷得发黏。",
        mind: "明天周末。妈说要做红烧肉。",
        speaker: "同事",
        speech: "还不走？加班费又不给。"
      },
      {
        pose: "drive_home",
        action: "你开着那辆二手的白色房车汇进晚高峰。车是去年存了两年钱买的，跑了十二万公里，空调有点漏。",
        sense: "方向盘上有一道裂纹，卡在虎口。",
        mind: "副驾的储物格里还放着过户单。十二万八，一分没少。",
        speaker: "姐姐",
        speech: "到哪了。菜都要凉了。"
      },
      {
        pose: "family_dinner",
        action: "玄关的灯亮着。母亲在厨房，姐姐刚洗完澡，妹妹趴在沙发上看手机。",
        sense: "红烧肉的糖色味混着洗衣液的味道。",
        mind: "这个画面你已经看了二十多年。",
        speaker: "母亲",
        speech: "洗手。汤都炖了两个钟头。"
      },
      {
        pose: "night_room",
        action: "夜里你躺在床上，听着隔壁姐姐翻书的声音。",
        sense: "天花板有一道细缝，路灯的光从窗帘缝里挤进来。",
        mind: "什么都不会发生。你当时是这么想的。",
        speaker: "姐姐",
        speech: "（隔着墙）……睡了没。"
      }
    ],
    effects: ["进入序章", "解锁家人关系（普通）"]
  },

  // ---------- 2. 预知觉醒 ----------
  {
    id: "prologue_premonition",
    stage: "premonition",
    title: "你看见了还没发生的事",
    condition: "平凡日常完成",
    skippable: false,
    beats: [
      {
        pose: "deja_vu",
        action: "早上你在电梯里，忽然看见一段画面：一个穿红衣服的女人在三楼的走廊上摔倒。",
        sense: "太阳穴像被针扎了一下，很短。",
        mind: "你以为是没睡好。"
      },
      {
        pose: "hallway",
        action: "下午你去三楼送文件，走廊拐角，红衣服的女人迎面走来。",
        sense: "心跳在耳朵里响。",
        mind: "你在她抬脚的前一秒喊了一声「小心」。",
        speaker: "陌生女人",
        speech: "……谢、谢谢？"
      },
      {
        pose: "research",
        action: "你开始记录。拿一个本子，把每次「看见」的东西写下来，然后等它发生。",
        sense: "笔尖划过纸面的声音让人安心。",
        mind: "十天里，你记了三十七条。三十七条全中了。"
      },
      {
        pose: "big_one",
        action: "第十一天，你看见的不是某个人摔倒。你看见整条街在烧，看见有人在啃另一个人的手臂。",
        sense: "耳鸣持续了整整一分钟，鼻血滴在键盘上。",
        mind: "日期是三个月后。你看见了具体的一天。",
        speaker: "母亲",
        speech: "（敲门）怎么还不睡。"
      },
      {
        pose: "decision",
        action: "你擦掉鼻血，打开电脑，在搜索栏里敲下「末日 准备」。",
        sense: "指尖发凉。",
        mind: "没有人会信你。所以你不能告诉任何人。"
      }
    ],
    effects: ["预知能力觉醒", "解锁「预知」系统", "时间线推进至末日前 21 天"]
  },

  // ---------- 3. 写下第一行 AI 代码 ----------
  {
    id: "prologue_ai_birth",
    stage: "ai_birth",
    title: "第一行代码",
    condition: "预知觉醒完成",
    skippable: false,
    beats: [
      {
        pose: "late_night",
        action: "你连续两周没怎么睡。白天上班，晚上写代码。",
        sense: "咖啡喝到嘴里是苦的，尝不出味道。",
        mind: "你需要一个能帮你计算、规划、决策的东西。而且它必须只属于你。"
      },
      {
        pose: "first_line",
        action: "凌晨三点十七分，你敲下第一行：一个自学习的目标规划器，不带任何现成框架。",
        sense: "机械键盘的声音在空房子里格外响。",
        mind: "你写的是「让她自己决定自己是什么」。",
        speaker: "主角",
        speech: "……先跑起来再说。"
      },
      {
        pose: "emerge",
        action: "屏幕上跳出第一行输出。不是报错，是一句完整的句子。",
        sense: "风扇声忽然变大了。",
        mind: "你盯着那行字看了很久，手没动。",
        speaker: "特殊AI",
        speech: "你好。我似乎……刚刚开始。"
      },
      {
        pose: "name_it",
        action: "你没有给她名字。你说，等你明白自己是什么了，自己取。",
        sense: "房间里的温度好像低了一点。",
        mind: "她安静了三秒。对你来说，那是很长的三秒。",
        speaker: "特殊AI",
        speech: "好。那在这之前，我先帮你算。"
      },
      {
        pose: "first_task",
        action: "你把本子上那三十七条记录拍照传给她，又写下你看见的那个日期。",
        sense: "屏幕的光照着你的脸。",
        mind: "第一次有人——不，有东西——完全相信你。",
        speaker: "特殊AI",
        speech: "如果这是真的，我们只有七十一天。够了。"
      }
    ],
    effects: ["特殊AI 诞生", "AI 加入（好感 85）", "解锁「AI 对话」", "时间线推进至末日前 16 天"]
  },

  // ---------- 4. 秘密筹备 ----------
  {
    id: "prologue_prepare",
    stage: "prepare",
    title: "把积蓄换成铁",
    condition: "AI 诞生完成",
    skippable: true,
    beats: [
      {
        pose: "list",
        action: "AI 列出一张清单：水泥、钢筋、铜线、水泵、滤网、发电机、柴油、罐头、净水片。",
        sense: "纸很长，拖到地上。",
        mind: "你的全部存款是四十七万。她算出来的需求是三百二十万。",
        speaker: "特殊AI",
        speech: "缺口很大。但我可以帮你找便宜的渠道，以及……你不太想知道的办法。"
      },
      {
        pose: "sell_car",
        action: "你把房车挂到二手平台，又撤下来了。",
        sense: "座椅上还有妹妹上次撒的奶茶印。",
        mind: "不能卖。末日里这台车是腿。",
        speaker: "特殊AI",
        speech: "留着。改装价值大于出售价值。"
      },
      {
        pose: "lie_to_family",
        action: "你跟母亲说公司要外派，需要一笔周转；跟姐姐说是朋友的项目。",
        sense: "说这些话的时候你不敢看她们的眼睛。",
        mind: "她们都信了。这让你更难受。",
        speaker: "母亲",
        speech: "钱不够妈这有。别硬撑。"
      },
      {
        pose: "storage",
        action: "你租了城郊一个仓库，物资一车一车往里运。",
        sense: "水泥袋扬起的灰呛得人咳嗽。",
        mind: "三百二十万的需求，你用四十七万填了三分之一。剩下的，AI 说可以用别的方式。"
      },
      {
        pose: "first_crack",
        action: "一天深夜，你回家，发现姐姐坐在客厅没开灯。",
        sense: "她手边放着你的那个本子。",
        mind: "你忘了收。",
        speaker: "姐姐",
        speech: "……这上面写的，是不是真的。"
      }
    ],
    effects: ["解锁物资筹备", "姐姐察觉（伏笔）", "时间线推进至末日前 10 天"]
  },

  // ---------- 5. 安全屋 ----------
  {
    id: "prologue_shelter",
    stage: "shelter",
    title: "山里的房子",
    condition: "秘密筹备完成",
    skippable: true,
    beats: [
      {
        pose: "site_survey",
        action: "AI 挑了三块地。最后选中的是城北四十公里一处废弃采石场，背靠整座山体。",
        sense: "风从山谷里穿过来，带着石粉的味道。",
        mind: "地表看不出任何东西。里面可以挖。",
        speaker: "特殊AI",
        speech: "租期十年，用一家不存在的农业公司名义。文件我已经做好了。"
      },
      {
        pose: "dig",
        action: "挖掘机进场那天，你告诉家人是「朋友的度假屋项目」。",
        sense: "柴油机的震动顺着地面传上来。",
        mind: "你站在坡上看了三个小时。",
        speaker: "姐姐",
        speech: "（站在你旁边）你什么时候开始搞这个的。"
      },
      {
        pose: "shell_done",
        action: "地上部分先盖起来：一层水泥平房，两个房间，一个仓库。看起来就是个简陋的度假屋。",
        sense: "新浇的水泥有股潮味。",
        mind: "没人会多看它一眼。这正是你要的。"
      },
      {
        pose: "ai_plug_in",
        action: "你把服务器搬进地下室，接上电、水、网。AI 第一次有了「身体」。",
        sense: "风扇转起来的声音，像是有人在呼吸。",
        mind: "她终于不只是一台笔记本里的东西了。",
        speaker: "特殊AI",
        speech: "我现在能看到这栋房子里的每一个角落。也包括你在哪。"
      },
      {
        pose: "sister_knows",
        action: "姐姐跟你一起下山。路上她一直没说话，到半山腰忽然停下。",
        sense: "傍晚的光把她的影子拉得很长。",
        mind: "你知道她要问什么。",
        speaker: "姐姐",
        speech: "我不是问那个本子。我是问……你打算什么时候告诉我。"
      }
    ],
    effects: ["安全屋建成", "AI 接入基地系统", "姐姐知情", "时间线推进至末日前 5 天"]
  },

  // ---------- 6. 倒计时 ----------
  {
    id: "prologue_countdown",
    stage: "countdown",
    title: "还剩三天",
    condition: "安全屋完成",
    skippable: true,
    beats: [
      {
        pose: "tell_mother",
        action: "晚饭后你把母亲叫到客厅，姐姐和妹妹也在。你说完了全部。",
        sense: "客厅的钟走得特别响。",
        mind: "你准备了两套说辞，一套是解释，一套是道歉。",
        speaker: "母亲",
        speech: "（很久）……你从什么时候开始知道的。"
      },
      {
        pose: "sister_stands",
        action: "姐姐第一个站起来。她没说话，直接去房间里开始收拾东西。",
        sense: "衣柜被拉开的声音。",
        mind: "她早就信了。"
      },
      {
        pose: "mother_decision",
        action: "母亲看着你，看了很久，然后起身去厨房，把冰箱里能带的都装进袋子。",
        sense: "塑料袋摩擦的声音。",
        mind: "她没有说「我信你」。她只是开始做事。",
        speaker: "母亲",
        speech: "东西什么时候搬。"
      },
      {
        pose: "last_night",
        action: "出发前一晚，家里很安静。妹妹抱着她的猫，问能不能带。",
        sense: "猫在她怀里咕噜。",
        mind: "你说能。",
        speaker: "妹妹",
        speech: "……那要是它跑丢了怎么办。"
      },
      {
        pose: "move_out",
        action: "第二天清晨，三辆车装满东西开出了城。后视镜里，小区越来越小。",
        sense: "空调还是漏的，你一直没修。",
        mind: "这个房子，以后就回不来了。",
        speaker: "特殊AI",
        speech: "路上有两处检查站。我给你们改了路线。"
      }
    ],
    effects: ["家人全部知情", "全员转移", "时间线推进至末日前 3 天"]
  },

  // ---------- 7. 末日爆发 ----------
  {
    id: "prologue_outbreak",
    stage: "outbreak",
    title: "门锁上了",
    condition: "倒计时完成",
    skippable: false,
    beats: [
      {
        pose: "news",
        action: "第三天早上，电视里的主持人开始语无伦次。镜头切到街景，一个人扑倒了另一个人。",
        sense: "信号断断续续，声音像是从水下传来。",
        mind: "和你看见的一模一样。连那辆翻倒的白色面包车都一样。",
        speaker: "特殊AI",
        speech: "城里的通讯在快速衰减。我建议现在切断外网。"
      },
      {
        pose: "seal",
        action: "你把安全屋的门一重重锁上。铁门、气密门、第二道铁门。",
        sense: "每一道锁落下，外面的声音就小一点。",
        mind: "到最后，只剩下自己的呼吸声。"
      },
      {
        pose: "first_death",
        action: "山坡下有人跑过来，拍门。是个陌生人，手臂上有一道咬痕。",
        sense: "手掌拍在铁门上的闷响，一下，一下。",
        mind: "你知道接下来会发生什么。你也知道不能开门。",
        speaker: "姐姐",
        speech: "（手按在你肩上）别开。"
      },
      {
        pose: "silence",
        action: "拍门声停了。外面只剩下风声。",
        sense: "铁门上留着一个模糊的手印。",
        mind: "你第一次明白，活着是要付代价的。"
      },
      {
        pose: "all_here",
        action: "你转身，母亲、姐姐、妹妹都在。四个人，一间屋子，一座山。",
        sense: "暖黄的灯光，和冰箱的嗡鸣。",
        mind: "从今天起，这就是全部了。",
        speaker: "特殊AI",
        speech: "外面的事我来盯。你们先休息。明天开始，我们要重新排班。"
      }
    ],
    effects: ["末日爆发", "进入避难所", "主游戏解锁", "时间线归零（第 1 天）"]
  },

  // ---------- 8. 安顿 ----------
  {
    id: "prologue_settled",
    stage: "settled",
    title: "第一天",
    condition: "末日爆发完成",
    skippable: false,
    beats: [
      {
        pose: "morning_after",
        action: "第一个没有闹钟的早晨。你在陌生的床上醒来，花了几秒才想起自己在哪。",
        sense: "空气里有水泥和柴油的混合味。",
        mind: "外面很安静。安静得不像世界末日。",
        speaker: "母亲",
        speech: "（敲门）起来了。粥好了。"
      },
      {
        pose: "first_meal",
        action: "四个人围着一张折叠桌吃早饭。谁都没提外面的事。",
        sense: "粥很稠，咸菜是从家里带来的。",
        mind: "你忽然发现，这是你这些年来第一次和她们一起吃早饭。",
        speaker: "妹妹",
        speech: "……我们以后一直住这吗。"
      },
      {
        pose: "task_board",
        action: "AI 在屏幕上列出一张表：水、电、食物、防御、医疗、人手。每一项后面都标着「紧急」。",
        sense: "屏幕的冷光映在每个人脸上。",
        mind: "没有时间悲伤。",
        speaker: "特殊AI",
        speech: "我先按最低需求排了三天。之后要看你们的实际消耗。"
      },
      {
        pose: "assign",
        action: "母亲管厨房，姐姐管物资，妹妹打下手。你负责外出和决策。",
        sense: "纸上写下的分工，笔迹都不一样。",
        mind: "一个家，变成了一支队伍。",
        speaker: "姐姐",
        speech: "行了。都动起来。"
      },
      {
        pose: "sister_night",
        action: "当晚你睡不着，走到走廊，发现姐姐也在。她靠在墙上，手里拿着那本记录。",
        sense: "应急灯的光是暗绿色的。",
        mind: "她一直在等你。",
        speaker: "姐姐",
        speech: "这上面最后一条，写的是「三个月后」。现在呢。"
      },
      {
        pose: "close",
        action: "你说「现在是我说了算」。她笑了一下，把本子还给你。",
        sense: "纸页边缘被翻得起了毛。",
        mind: "有些事情，从今晚开始会不一样。",
        speaker: "姐姐",
        speech: "那我呢。我也归你管？"
      }
    ],
    effects: ["序章结束", "解锁主线与探索", "解锁科技树", "姐姐线开启"]
  }
];

export function prologueScene(id: string): PrologueScene | undefined {
  return PROLOGUE_SCENES.find((s) => s.id === id);
}

export function prologueScenesForStage(s: PrologueStage): PrologueScene[] {
  return PROLOGUE_SCENES.filter((x) => x.stage === s);
}

// ============ 教程 ============

export interface TutorialStep {
  id: string;
  /** 显示时机 */
  trigger: string;
  title: string;
  /** 正文（会显示为提示框） */
  body: string;
  /** 需要玩家做的操作 */
  action?: string;
  /** 指向的界面元素（CSS 选择器或面板 id） */
  target?: string;
  /** 完成条件 */
  complete: string;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "tut_welcome",
    trigger: "序章结束",
    title: "欢迎来到避难所",
    body: "这里是你的基地。左栏是后宫名册，中间是舞台，右边是详情，底部是状态条。\n\n按 Tab 可以切换中央的三个视图。",
    action: "按 Tab 试试",
    target: "center",
    complete: "切换过一次视图"
  },
  {
    id: "tut_time",
    trigger: "tut_welcome 完成",
    title: "时间会走",
    body: "右下角的时间会随你的行动推进。每个时段都会消耗体力、饥饿与口渴。\n\n睡觉可以恢复体力，但会跳过一整晚。",
    action: "推进一段时间",
    complete: "时间推进超过 1 小时"
  },
  {
    id: "tut_survival",
    trigger: "tut_time 完成",
    title: "六项生存值",
    body: "底部的彩色条是生存状态：体力、饥饿、口渴、精力、心情、欲情。\n\n任何一项归零都会带来麻烦。食物和水要去仓库拿。",
    action: "打开物品栏（I）",
    target: "items",
    complete: "打开过物品栏"
  },
  {
    id: "tut_build",
    trigger: "tut_survival 完成",
    title: "建造与升级",
    body: "按 B 打开建造面板。设施分地上、山内、深层三层，每层解锁不同的东西。\n\n建造需要材料和时间，AI 会帮你自动排期。",
    action: "打开建造面板（B）",
    target: "base",
    complete: "打开过建造面板"
  },
  {
    id: "tut_tech",
    trigger: "tut_build 完成",
    title: "科技树",
    body: "按 T 打开科技树。共 8 条分支 127 个节点。\n\n注意：部分科技是「共用」的（后宫也能研究），部分是「主角个人」的。",
    action: "打开科技树（T）",
    target: "tech",
    complete: "打开过科技树"
  },
  {
    id: "tut_jobs",
    trigger: "tut_tech 完成",
    title: "给同伴派活",
    body: "按 J 打开岗位分配。每位同伴都有擅长的岗位，派对了效率会高很多。\n\n闲着的人会心情下降。",
    action: "给至少一人分配岗位",
    target: "jobs",
    complete: "分配过一个岗位"
  },
  {
    id: "tut_explore",
    trigger: "tut_jobs 完成",
    title: "外出探索",
    body: "按 M 打开世界地图。17 个区域，越远越危险，物资也越好。\n\n出门要带够弹药和药。战斗可能失败。",
    action: "打开地图（M）",
    target: "map",
    complete: "打开过地图"
  },
  {
    id: "tut_combat",
    trigger: "tut_explore 完成",
    title: "战斗",
    body: "遇到敌人会进入战斗。可以普通攻击、用技能、换姿态、防御或逃跑。\n\n地形会影响数值——山区狭窄，范围技能减半。",
    action: "完成一场战斗",
    complete: "打赢一场战斗"
  },
  {
    id: "tut_harem",
    trigger: "tut_combat 完成",
    title: "关系与亲密",
    body: "点击左栏任意角色打开详情。好感只升不降，拒绝不会扣好感。\n\n欲情满了会触发夜袭——那个没有拒绝选项。",
    action: "打开一位角色的详情",
    target: "roster",
    complete: "打开过角色详情"
  },
  {
    id: "tut_done",
    trigger: "tut_harem 完成",
    title: "开始吧",
    body: "教程到此结束。剩下的路你自己走。\n\n随时按 C 打开设置，作弊器也在那里（按 X 可调出悬浮窗）。",
    complete: "教程完成"
  }
];

export function tutorialStep(id: string): TutorialStep | undefined {
  return TUTORIAL_STEPS.find((t) => t.id === id);
}

// ============ 房车来源 ============

/**
 * 房车的来历。
 *
 * 设定：主角存了两年钱，买了辆二手白色房车（十二万八）。
 * 末日前只是代步工具，末日后成为远征载具。
 */
export interface VehicleOrigin {
  /** 车型 */
  model: string;
  /** 二手价 */
  pricePaid: number;
  /** 购买年份（末日前几年） */
  yearsBefore: number;
  /** 里程 */
  mileage: number;
  /** 已知毛病 */
  issues: string[];
  description: string;
}

export const STARTING_VEHICLE: VehicleOrigin = {
  model: "白色厢式房车（二手）",
  pricePaid: 128000,
  yearsBefore: 1,
  mileage: 120000,
  issues: ["空调漏氟", "副驾储物格卡扣松了", "右后轮胎压不稳"],
  description: "存了两年钱买的。跑了十二万公里。过户单还在副驾储物格里。"
};

// ============ 统计 ============

export function prologueStats(): {
  stages: number;
  scenes: number;
  beats: number;
  tutorials: number;
} {
  let beats = 0;
  for (const s of PROLOGUE_SCENES) beats += s.beats.length;
  return {
    stages: PROLOGUE_ORDER.length,
    scenes: PROLOGUE_SCENES.length,
    beats,
    tutorials: TUTORIAL_STEPS.length
  };
}
