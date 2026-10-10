/**
 * 名字生成系统。
 *
 * 用途：
 *  - 新游戏时按玩家输入的主角姓名推导家人姓氏与名字
 *  - 为同伴 / NPC 生成名字
 *  - 为后代生成名字
 *
 * 规则（已与用户确认）：
 *  - 主角名由玩家输入
 *  - 姐姐 / 妹妹 / 后代 / AI 随主角姓
 *  - 母亲保留娘家姓（独立姓氏）
 *  - 后代恒为女性（INV-4）
 *
 * 全部为纯函数 + 确定性随机（mulberry32），同一 seed 结果一致。
 */

/** 名字风格 */
export type NameStyle =
  | "onee"     // 御姐 / 成熟
  | "youth"    // 少女 / 妹妹
  | "matron"   // 母亲 / 中年女性
  | "ai"       // 特殊 AI
  | "feminine" // 通用女性
  | "enemy";   // 敌对 / 匪徒

export interface NamePool {
  style: NameStyle;
  label: string;
  desc: string;
  /** 单字名 */
  single: string[];
  /** 双字名 */
  double: string[];
}

/* ==================== 姓氏池 ==================== */

/** 常见单字姓（按人口比例粗略排序） */
export const SURNAMES_SINGLE: string[] = [
  "王","李","张","刘","陈","杨","黄","赵","周","吴",
  "徐","孙","胡","朱","高","林","何","郭","马","罗",
  "梁","宋","郑","谢","韩","唐","冯","于","董","萧",
  "程","曹","袁","邓","许","傅","沈","曾","彭","吕",
  "苏","卢","蒋","蔡","贾","丁","魏","薛","叶","阎",
  "余","潘","杜","戴","夏","钟","汪","田","任","姜",
  "范","方","石","姚","谭","廖","邹","熊","金","陆",
  "郝","孔","白","崔","康","毛","邱","秦","江","史",
  "顾","侯","邵","孟","龙","万","段","雷","钱","汤",
  "尹","黎","易","常","武","乔","贺","赖","龚","文"
];

/** 复姓 */
export const SURNAMES_COMPOUND: string[] = [
  "欧阳","司马","上官","诸葛","东方","独孤","南宫","慕容",
  "夏侯","尉迟","皇甫","长孙","宇文","公孙","闻人","令狐",
  "钟离","轩辕","端木","百里","呼延","赫连","澹台","公冶"
];

/** 母亲可能要用的、更柔和的娘家姓（略偏女性家庭感） */
export const SURNAMES_MAIDEN: string[] = [
  "苏","温","柳","沈","梅","陶","简","舒","穆","岑",
  "阮","祁","蓝","宋","黎","蔺","卫","章","池","裴",
  "虞","凌","闻","宓","庄","冉","殷","鞠","霍","邵"
];

/* ==================== 名字池 ==================== */

export const NAME_POOLS: NamePool[] = [
  {
    style: "onee",
    label: "御姐 / 成熟",
    desc: "气质稳、有距离感，适合姐姐、职场女性",
    single: [
      "清","雪","遥","薇","瑾","岚","汐","凝","曼","晴",
      "澜","筝","瑶","珺","沁","荞","柚","棠","沅","洛",
      "榕","檀","毓","婳","姝","娴","韵","苓","宸","昭",
      "璎","璇","玥","瑄","芷","蘅","蔓","菡","蓉","蕊",
      "澄","栖","翎","屏","砚","笺","琛","琅"
    ],
    double: [
      "听澜","望舒","疏影","沉月","疏桐","白露","初霁","云薇",
      "沐清","染霜","临霜","画棠","叙棠","扶苏","若韫","清梧",
      "知微","见月","司南","照澜","蘅芜","南浔","青崖","渡舟",
      "含章","拾光","慕青","砚书","泠鸢","栖迟","灼华","归荑"
    ]
  },
  {
    style: "youth",
    label: "少女 / 妹妹",
    desc: "轻快、有朝气，适合妹妹、学生",
    single: [
      "果","棠","星","芽","莳","菀","笙","柚","桃","桔",
      "栗","麦","茉","栀","蘅","苜","荚","薏","荞","禾",
      "苗","苇","竹","葵","苋","芩","苕","荔","荑","荃",
      "灿","甜","恬","娖","冉","然","袅","眠","菡","莞"
    ],
    double: [
      "小满","小禾","星禾","禾苗","莳萝","半夏","青禾","苇塘",
      "竹青","初雪","未央","筱鹿","豆蔻","拾夏","栀夏","苜蓿",
      "桔梗","荔枝","杏子","柚子","桃夭","芣苢","木莲","溪荪",
      "知夏","闻笛","晚禾","沐禾","昭禾","翎羽","芩芩","葳蕤"
    ]
  },
  {
    style: "matron",
    label: "母亲 / 中年女性",
    desc: "温婉端庄，符合 45 岁上下的名字风格",
    single: [
      "淑","静","慧","兰","秀","英","娟","芳","梅","荷",
      "琴","珍","玉","霞","娥","莲","蓉","芹","贞","娴",
      "芝","菊","萍","玲","敏","颖","莉","蕾","薇","芬"
    ],
    double: [
      "淑华","淑芳","静娴","慧兰","秀英","美娟","玉兰","秀云",
      "桂英","凤兰","丽华","雅琴","素芬","静宜","文娟","春梅",
      "秋兰","红霞","秀珍","月娥","金凤","兰英","玉梅","秀兰",
      "爱华","惠芳","佩兰","淑珍","玉珍","素华","锦华","云霞"
    ]
  },
  {
    style: "ai",
    label: "特殊 AI",
    desc: "理性、克制，或者由主角亲手取的偏爱之名",
    single: [
      "昭","澈","枢","序","衍","微","铭","旸","珩","砚",
      "笺","爻","瑢","莹","泠","弦","屿","铉","衡","朔",
      "熹","熨","铖","铮","翎","霈","抒","澜","墟","弥"
    ],
    double: [
      "初零","未名","知微","见微","司序","明澈","泠泠","归零",
      "拾壹","零壹","序壹","未晞","既白","将明","持枢","执衡",
      "守微","澄明","含光","栖迟","衔枝","归荑","拾光","秉烛"
    ]
  },
  {
    style: "feminine",
    label: "通用女性",
    desc: "适合任意女性角色、同伴、NPC",
    single: [
      "琳","娜","婷","婉","妍","璐","蕊","萱","瑾","琬",
      "岚","芮","蕾","菡","菁","芸","薇","筱","琪","玥",
      "嘉","佳","诗","语","依","若","瑜","颜","茉","芷"
    ],
    double: [
      "语嫣","若雪","诗涵","婉清","嘉怡","雅静","梦琪","子萱",
      "思琪","雨薇","静雯","芷若","思雨","雨萱","语彤","婧琪",
      "可馨","若彤","语汐","婉婷","嘉悦","以宁","安然","柔嘉",
      "玳瑁","玉簪","青黛","朱砂","白芷","紫苏","忍冬","辛夷"
    ]
  },
  {
    style: "enemy",
    label: "敌对 / 匪徒",
    desc: "适合匪徒、掠夺者等敌对角色",
    single: [
      "彪","刚","猛","烈","狼","豺","琥","狰","枭","犴",
      "獠","蔓","姒","妲","妺","魃","妘","嫱","婀","娃"
    ],
    double: [
      "黑鸦","铁牙","断刃","赤狼","独眼","疤脸","活阎","老刀",
      "刀疤","野狗","秃鹫","毒钉","疯狗","恶煞","血手","断掌"
    ]
  }
];

/** 按风格取名字池 */
export function poolOf(style: NameStyle): NamePool | undefined {
  return NAME_POOLS.find((p) => p.style === style);
}

/* ==================== 确定性随机 ==================== */

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 字符串 → 稳定 seed */
export function seedOf(text: string, salt = 0): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(arr: T[], rnd: () => number): T {
  return arr[Math.floor(rnd() * arr.length)] as T;
}

/* ==================== 姓氏处理 ==================== */

/** 复姓表（用于识别前两字是否为姓） */
const COMPOUND_SET = new Set(SURNAMES_COMPOUND);

export interface SplitName {
  /** 姓 */
  surname: string;
  /** 名 */
  given: string;
  /** 是否复姓 */
  compound: boolean;
}

/**
 * 从全名里拆出姓与名。
 *  - 复姓优先（欧阳/司马/上官…）
 *  - 单姓取首字
 *  - 空输入回落到「林」
 */
export function splitName(fullName: string): SplitName {
  const s = (fullName ?? "").trim();
  if (!s) return { surname: "林", given: "", compound: false };

  // 英文名：取最后一个词
  if (/^[A-Za-z][A-Za-z .'-]*$/.test(s)) {
    const parts = s.split(/\s+/).filter(Boolean);
    const last = parts.length > 1 ? parts[parts.length - 1] : parts[0];
    return { surname: last, given: parts.slice(0, -1).join(" ") || last, compound: false };
  }

  const two = s.slice(0, 2);
  if (COMPOUND_SET.has(two) && s.length > 2) {
    return { surname: two, given: s.slice(2), compound: true };
  }
  return { surname: s[0]!, given: s.slice(1), compound: false };
}

/** 取姓 */
export function surnameOf(fullName: string): string {
  return splitName(fullName).surname;
}

/** 取单姓（复姓取第二字，用于更亲昵的称呼） */
export function shortSurname(fullName: string): string {
  const sp = splitName(fullName);
  return sp.compound ? sp.surname[1]! : sp.surname;
}

/* ==================== 名字生成 ==================== */

export interface GenerateOptions {
  /** 指定姓氏；不传则用默认池 */
  surname?: string;
  /** 只用单字名 / 双字名（不传则两者都可能） */
  length?: 1 | 2;
  /** 排除已有名字，避免重名 */
  exclude?: string[];
}

/**
 * 生成一个名字。
 * 同一个 seed + style + options 结果一致。
 */
export function generateName(
  style: NameStyle,
  seed: number,
  opts: GenerateOptions = {}
): string {
  const rnd = mulberry32(seed);
  const pool = poolOf(style) ?? poolOf("feminine")!;

  // 姓氏
  let surname = opts.surname;
  if (surname === undefined) {
    surname = pick(SURNAMES_SINGLE, rnd);
  }

  // 名字长度
  let wantLen = opts.length;
  if (wantLen === undefined) {
    wantLen = rnd() < 0.45 ? 2 : 1;
  }

  const exclude = new Set(opts.exclude ?? []);
  const cands =
    wantLen === 2
      ? pool.double
      : pool.single;

  for (let attempt = 0; attempt < 24; attempt++) {
    const given = cands[Math.floor(rnd() * cands.length)]!;
    const full = surname + given;
    if (!exclude.has(full) && !exclude.has(given)) return full;
  }
  // 兜底：加序号
  return surname + cands[0]! + "Ⅱ";
}

/** 生成一个名（不带姓） */
export function generateGivenName(style: NameStyle, seed: number, length?: 1 | 2): string {
  const rnd = mulberry32(seed);
  const pool = poolOf(style) ?? poolOf("feminine")!;
  const len = length ?? (rnd() < 0.45 ? 2 : 1);
  return len === 2 ? pick(pool.double, rnd) : pick(pool.single, rnd);
}

/* ==================== 家人命名 ==================== */

export interface FamilyNames {
  /** 主角全名（玩家输入） */
  hero: string;
  /** 主角姓 */
  surname: string;
  /** 姐姐全名 */
  sister: string;
  /** 妹妹全名 */
  sister2: string;
  /** 母亲全名（娘家姓） */
  mother: string;
  /** 母亲的娘家姓 */
  motherSurname: string;
  /** 特殊 AI 全名 */
  ai: string;
  /** AI 的名（不带姓） */
  aiGiven: string;
}

export interface FamilyOptions {
  /** 母亲娘家姓；不传则从娘家姓池随机 */
  motherSurname?: string;
  /** AI 的名；不传则从 AI 池随机 */
  aiGiven?: string;
  /** 已占用的名字（避免重名） */
  exclude?: string[];
}

/**
 * 按主角名生成全家名字。
 *
 * 规则（已与用户确认）：
 *  - 姐姐 / 妹妹 / AI 随主角姓
 *  - 母亲保留娘家姓
 */
export function familyNames(heroName: string, opts: FamilyOptions = {}): FamilyNames {
  const hero = (heroName ?? "").trim() || "林晓";
  const sp = splitName(hero);
  const surname = sp.surname;

  const used: string[] = [...(opts.exclude ?? [])];
  const take = (style: NameStyle, salt: number): string => {
    const n = generateName(style, seedOf(hero + ":" + style + ":" + salt), {
      surname,
      exclude: used
    });
    used.push(n);
    return n;
  };

  const sister = take("onee", 1);
  const sister2 = take("youth", 2);

  // 母亲：娘家姓 + 中年女性名
  const motherSurname =
    opts.motherSurname ?? pick(SURNAMES_MAIDEN, mulberry32(seedOf(hero + ":maiden")));
  const motherGiven =
    generateGivenName("matron", seedOf(hero + ":matron"), 2);
  const mother = motherSurname + motherGiven;
  used.push(mother);

  // AI：随主角姓
  const aiGiven =
    opts.aiGiven ?? generateGivenName("ai", seedOf(hero + ":ai"), 2);
  const ai = surname + aiGiven;

  return { hero, surname, sister, sister2, mother, motherSurname, ai, aiGiven };
}

/** 后代命名（恒为女性，随主角姓） */
export function offspringName(
  heroName: string,
  index: number,
  style: NameStyle = "youth"
): string {
  const surname = surnameOf(heroName);
  return generateName(style, seedOf(heroName + ":child:" + index), { surname });
}

/** 给 NPC / 同伴随机取名 */
export function randomName(seed: number, style: NameStyle = "feminine"): string {
  return generateName(style, seed);
}

/* ==================== 统计 ==================== */

/** 名字池规模 */
export function namePoolStats(): {
  styles: number;
  single: number;
  double: number;
  total: number;
  surnames: number;
} {
  let single = 0, double = 0;
  const singles = new Set<string>();
  const doubles = new Set<string>();
  for (const p of NAME_POOLS) {
    for (const s of p.single) singles.add(s);
    for (const d of p.double) doubles.add(d);
  }
  // 去重后统计
  single = singles.size;
  double = doubles.size;
  let raw = 0;
  for (const p of NAME_POOLS) raw += p.single.length + p.double.length;
  return {
    styles: NAME_POOLS.length,
    single,
    double,
    total: single + double,
    surnames: SURNAMES_SINGLE.length + SURNAMES_COMPOUND.length
  };
}
