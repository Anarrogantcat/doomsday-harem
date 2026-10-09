/**
 * 服装系统。
 *
 * 设计定位：
 *  - 生存维度：保暖（天气）、防护（战斗）、隐蔽（巡逻）
 *  - 职业维度：岗位制服（实验室白大褂 / 医疗服 / 围裙）
 *  - 成人维度：覆盖度决定暴露程度，脱衣有明确的层序
 *  - 画风维度：每件衣服可挂 variant，供像素/插画差分
 *
 * 纯函数式：所有操作返回新对象，不修改入参。
 */

/** 装备槽位 */
export type ClothingSlot =
  | "head" | "face" | "torso" | "outer" | "legs" | "feet" | "hands"
  | "underwear_top" | "underwear_bottom" | "accessory" | "harness";

/** 身体区域 */
export type BodyZone =
  | "head" | "face" | "neck" | "chest" | "belly" | "back"
  | "genital" | "buttock" | "thigh" | "calf" | "foot" | "hand" | "arm" | "shoulder";

/** 穿着层级：决定脱衣顺序 */
export type ClothingLayer = "under" | "mid" | "outer" | "accessory";

export interface ClothingItem {
  id: string;
  name: string;
  slot: ClothingSlot;
  layer: ClothingLayer;
  /** 各身体区域的覆盖度 0-1；未列出的区域为 0 */
  coverage: Partial<Record<BodyZone, number>>;
  /** 保暖值，负数为透气降温 */
  insulation: number;
  /** 防护值 */
  armor: number;
  /** 魅力加成 */
  charm: number;
  /** 隐蔽加成，负数为显眼 */
  stealth: number;
  /** 最大耐久 */
  durability: number;
  /** 重量 */
  weight: number;
  /** 标签：job:lab / job:medical / job:kitchen / restraint / revealing / futanari-ok ... */
  tags: string[];
}

/** 一件实际持有的衣物实例 */
export interface Garment {
  itemId: string;
  durability: number;
  /** 画风差分用的变体标识（配色/花纹） */
  variant?: string;
}

export interface Wardrobe {
  equipped: Partial<Record<ClothingSlot, Garment>>;
  stored: Garment[];
}

export const SLOT_LABEL: Record<ClothingSlot, string> = {
  head: "头部",
  face: "面部",
  torso: "上身",
  outer: "外套",
  legs: "下身",
  feet: "足部",
  hands: "手部",
  underwear_top: "内衣上",
  underwear_bottom: "内衣下",
  accessory: "配饰",
  harness: "束具"
};

export const ZONE_LABEL: Record<BodyZone, string> = {
  head: "头", face: "脸", neck: "颈", chest: "胸", belly: "腹", back: "背",
  genital: "私处", buttock: "臀", thigh: "大腿", calf: "小腿",
  foot: "脚", hand: "手", arm: "臂", shoulder: "肩"
};

/** 敏感区域 —— 暴露度按这些区域计算 */
export const SENSITIVE_ZONES: BodyZone[] = ["chest", "genital", "buttock", "thigh", "belly"];

/** 脱衣顺序：由外到内，最后是束具 */
export const UNDRESS_SEQUENCE: ClothingSlot[] = [
  "accessory", "head", "face", "hands", "feet", "outer",
  "legs", "torso", "underwear_top", "underwear_bottom", "harness"
];

export const WEATHER_LABEL: Record<string, string> = {
  clear: "晴", rain: "雨", snow: "雪", heat: "酷热", cold: "严寒", storm: "暴风"
};

export type Weather = "clear" | "rain" | "snow" | "heat" | "cold" | "storm";

// ============ 衣物目录 ============

const c = (
  id: string, name: string, slot: ClothingSlot, layer: ClothingLayer,
  coverage: Partial<Record<BodyZone, number>>,
  insulation: number, armor: number, charm: number, stealth: number,
  durability: number, weight: number, tags: string[] = []
): ClothingItem => ({
  id, name, slot, layer, coverage, insulation, armor, charm, stealth,
  durability, weight, tags
});

export const CLOTHING: ClothingItem[] = [
  // ---- 日常上身 ----
  c("tee_shirt", "基础T恤", "torso", "mid",
    { chest: 0.7, belly: 0.6, back: 0.7, shoulder: 0.4, neck: 0.1 },
    1, 0, 0, 0, 60, 0.3, ["futanari-ok"]),
  c("work_shirt", "工装衬衫", "torso", "mid",
    { chest: 0.85, belly: 0.8, back: 0.85, shoulder: 0.6, neck: 0.3, arm: 0.4 },
    2, 1, 0, 0, 80, 0.5),
  c("hoodie", "连帽卫衣", "torso", "mid",
    { chest: 0.85, belly: 0.85, back: 0.85, shoulder: 0.7, head: 0.2 },
    4, 1, 0, 0, 90, 0.8),
  c("scrubs", "医疗服", "torso", "mid",
    { chest: 0.9, belly: 0.9, back: 0.9, shoulder: 0.7, arm: 0.5 },
    2, 1, 0, 0, 70, 0.4, ["job:medical"]),
  c("towel", "浴巾", "torso", "mid",
    { chest: 0.8, belly: 0.5, genital: 0.4, buttock: 0.5 },
    0, 0, 1, 0, 20, 0.2, ["revealing"]),
  c("nightgown", "睡衣", "torso", "mid",
    { chest: 0.7, belly: 0.6, buttock: 0.5, thigh: 0.3 },
    2, 0, 1, 0, 40, 0.2, ["revealing"]),

  // ---- 外套 ----
  c("tactical_vest", "战术背心", "outer", "outer",
    { chest: 0.9, belly: 0.7, back: 0.9 },
    2, 6, 0, 0, 120, 2.5, ["armor"]),
  c("jacket", "冲锋衣", "outer", "outer",
    { chest: 0.9, belly: 0.8, back: 0.9, arm: 0.7, shoulder: 0.8 },
    6, 2, 0, 0, 100, 1.2),
  c("down_jacket", "羽绒服", "outer", "outer",
    { chest: 0.95, belly: 0.9, back: 0.95, arm: 0.85, shoulder: 0.9 },
    12, 1, 0, 0, 110, 1.8, ["winter"]),
  c("lab_coat", "实验室白大褂", "outer", "outer",
    { chest: 0.7, belly: 0.7, back: 0.8, thigh: 0.4 },
    2, 0, 1, 0, 60, 0.6, ["job:lab"]),
  c("apron", "围裙", "outer", "outer",
    { chest: 0.5, belly: 0.8, genital: 0.3 },
    1, 1, 0, 0, 50, 0.4, ["job:kitchen"]),
  c("nun_habit", "修女服", "outer", "outer",
    { chest: 0.95, belly: 0.9, back: 0.9, head: 0.8, thigh: 0.6 },
    4, 1, 0, 0, 90, 1.0, ["job:faith", "modest"]),
  c("evening_gown", "晚礼服", "outer", "outer",
    { chest: 0.6, belly: 0.4, thigh: 0.3 },
    1, 0, 8, -2, 50, 0.8, ["charm", "revealing"]),
  c("stage_costume", "演出服", "outer", "outer",
    { chest: 0.5, belly: 0.4, buttock: 0.3 },
    0, 0, 10, -3, 40, 0.5, ["charm", "revealing"]),
  c("maid_outfit", "女仆装", "outer", "outer",
    { chest: 0.75, belly: 0.5, buttock: 0.6, thigh: 0.4 },
    1, 0, 7, -1, 45, 0.6, ["charm"]),
  c("bunny_suit", "兔女郎装", "outer", "outer",
    { chest: 0.4, belly: 0.3, buttock: 0.4, thigh: 0.2 },
    0, 0, 12, -4, 30, 0.3, ["charm", "revealing"]),
  c("school_uniform", "校服", "outer", "outer",
    { chest: 0.8, belly: 0.7, back: 0.8, thigh: 0.5 },
    2, 0, 3, 0, 60, 0.7),

  // ---- 下身 ----
  c("cargo_pants", "工装裤", "legs", "mid",
    { buttock: 0.95, genital: 0.9, thigh: 0.9, calf: 0.7 },
    3, 2, 0, 0, 100, 0.8),
  c("jeans", "牛仔裤", "legs", "mid",
    { buttock: 0.95, genital: 0.9, thigh: 0.9, calf: 0.6 },
    3, 2, 1, 0, 110, 0.9),
  c("long_skirt", "长裙", "legs", "mid",
    { buttock: 0.9, genital: 0.7, thigh: 0.8, calf: 0.6 },
    2, 0, 3, 0, 70, 0.5),
  c("shorts", "短裤", "legs", "mid",
    { buttock: 0.85, genital: 0.8, thigh: 0.3 },
    0, 0, 1, 0, 60, 0.3, ["revealing"]),

  // ---- 足部 ----
  c("combat_boots", "军靴", "feet", "outer",
    { foot: 1, calf: 0.4 },
    5, 4, 0, 0, 140, 1.4, ["armor"]),
  c("sneakers", "帆布鞋", "feet", "mid",
    { foot: 1 },
    2, 1, 0, 0, 80, 0.6),
  c("heels", "高跟鞋", "feet", "mid",
    { foot: 0.9 },
    0, 0, 4, -1, 50, 0.4, ["charm"]),
  c("slippers", "家居拖鞋", "feet", "under",
    { foot: 0.7 },
    1, 0, 0, 0, 40, 0.2),

  // ---- 手部 / 头部 / 面部 ----
  c("tactical_gloves", "战术手套", "hands", "outer",
    { hand: 1 },
    2, 3, 0, 0, 90, 0.3, ["armor"]),
  c("cap", "棒球帽", "head", "mid",
    { head: 0.6 },
    1, 0, 0, 0, 50, 0.2),
  c("gas_mask", "防毒面具", "face", "outer",
    { face: 1, neck: 0.4 },
    3, 2, -3, 2, 100, 0.8, ["protection"]),
  c("goggles", "护目镜", "face", "mid",
    { face: 0.3 },
    1, 1, 0, 1, 60, 0.2),

  // ---- 内衣 ----
  c("sport_bra", "运动内衣", "underwear_top", "under",
    { chest: 0.8, back: 0.3 },
    1, 0, 0, 0, 50, 0.1, ["futanari-ok"]),
  c("cotton_bra", "棉质内衣", "underwear_top", "under",
    { chest: 0.75 },
    1, 0, 1, 0, 40, 0.1),
  c("lace_bra", "蕾丝内衣", "underwear_top", "under",
    { chest: 0.5 },
    0, 0, 5, 0, 30, 0.05, ["charm", "revealing"]),
  c("plain_panties", "基础内裤", "underwear_bottom", "under",
    { genital: 0.9, buttock: 0.8 },
    1, 0, 0, 0, 40, 0.1, ["futanari-ok"]),
  c("boxer_briefs", "平角内裤", "underwear_bottom", "under",
    { genital: 0.85, buttock: 0.6 },
    1, 0, 0, 0, 45, 0.1, ["futanari-ok"]),
  c("lace_panties", "蕾丝内裤", "underwear_bottom", "under",
    { genital: 0.5, buttock: 0.4 },
    0, 0, 5, 0, 25, 0.05, ["charm", "revealing"]),

  // ---- 配饰 / 束具 ----
  c("scarf", "围巾", "accessory", "accessory",
    { neck: 1, chest: 0.2 },
    3, 0, 2, 0, 50, 0.3),
  c("collar", "项圈", "accessory", "accessory",
    { neck: 0.3 },
    0, 0, 2, 0, 30, 0.1, ["restraint"]),
  c("rope", "麻绳", "accessory", "accessory",
    {},
    0, 0, 0, 0, 20, 0.2, ["restraint"]),
  c("harness", "束具", "harness", "accessory",
    { chest: 0.2, belly: 0.2, thigh: 0.2 },
    0, 0, 3, 0, 40, 0.3, ["restraint"]),

  // ---- 功能衣物 ----
  c("rain_coat", "雨衣", "outer", "outer",
    { chest: 0.9, belly: 0.85, back: 0.9, arm: 0.8, thigh: 0.5 },
    4, 1, 0, 0, 90, 0.9, ["waterproof"]),
  c("thermal_top", "保暖内衣", "underwear_top", "under",
    { chest: 0.85, belly: 0.7, back: 0.6, arm: 0.4 },
    5, 0, 0, 0, 60, 0.2, ["winter", "futanari-ok"]),
  c("thermal_bottom", "保暖长裤", "underwear_bottom", "under",
    { genital: 0.9, buttock: 0.9, thigh: 0.7, calf: 0.5 },
    5, 0, 0, 0, 60, 0.25, ["winter"]),
  c("long_sleeve", "长袖内搭", "torso", "under",
    { chest: 0.75, belly: 0.7, back: 0.75, arm: 0.9, shoulder: 0.6 },
    3, 0, 0, 0, 70, 0.4),
  c("bathrobe", "浴袍", "outer", "outer",
    { chest: 0.85, belly: 0.7, genital: 0.5, thigh: 0.4 },
    2, 0, 1, 0, 40, 0.5, ["casual"]),
  c("swimsuit", "泳装", "torso", "mid",
    { chest: 0.5, belly: 0.3, genital: 0.6, buttock: 0.5 },
    0, 0, 9, -2, 30, 0.15, ["charm", "revealing"]),
  c("stockings", "丝袜", "legs", "under",
    { thigh: 0.8, calf: 0.9 },
    1, 0, 4, 0, 25, 0.1, ["charm", "revealing"])
];

const BY_ID = new Map(CLOTHING.map((x) => [x.id, x]));

export function itemById(id: string): ClothingItem | undefined {
  return BY_ID.get(id);
}

export function itemsBySlot(slot: ClothingSlot): ClothingItem[] {
  return CLOTHING.filter((x) => x.slot === slot);
}

export function itemsByTag(tag: string): ClothingItem[] {
  return CLOTHING.filter((x) => x.tags.includes(tag));
}

// ============ 衣橱操作 ============

export function newWardrobe(): Wardrobe {
  return { equipped: {}, stored: [] };
}

function garment(itemId: string, variant?: string): Garment {
  const item = itemById(itemId);
  return { itemId, durability: item?.durability ?? 50, variant };
}

/** 穿上一件（若同槽已有则替换，旧的收入储物） */
export function equip(w: Wardrobe, itemId: string, variant?: string): Wardrobe {
  const item = itemById(itemId);
  if (!item) throw new Error("未知衣物：" + itemId);
  const equipped = { ...w.equipped };
  const stored = [...w.stored];
  const prev = equipped[item.slot];
  if (prev) stored.push(prev);
  equipped[item.slot] = garment(itemId, variant);
  return { equipped, stored };
}

/** 一次穿多件 */
export function equipAll(w: Wardrobe, itemIds: string[]): Wardrobe {
  let out = w;
  for (const id of itemIds) out = equip(out, id);
  return out;
}

/** 脱下某槽位 */
export function unequip(w: Wardrobe, slot: ClothingSlot): Wardrobe {
  const equipped = { ...w.equipped };
  const stored = [...w.stored];
  const g = equipped[slot];
  if (g) {
    stored.push(g);
    delete equipped[slot];
  }
  return { equipped, stored };
}

/** 从储物中重新穿上（按 itemId 找） */
export function wearFromStorage(w: Wardrobe, itemId: string): Wardrobe {
  const idx = w.stored.findIndex((g) => g.itemId === itemId);
  if (idx === -1) return w;
  const g = w.stored[idx];
  const stored = w.stored.filter((_, i) => i !== idx);
  const equipped = { ...w.equipped };
  const item = itemById(itemId);
  if (!item) return w;
  const prev = equipped[item.slot];
  if (prev) stored.push(prev);
  equipped[item.slot] = g;
  return { equipped, stored };
}

export function equippedItems(w: Wardrobe): ClothingItem[] {
  const out: ClothingItem[] = [];
  for (const g of Object.values(w.equipped)) {
    if (!g) continue;
    const item = itemById(g.itemId);
    if (item) out.push(item);
  }
  return out;
}

export function equippedGarments(w: Wardrobe): Array<{ slot: ClothingSlot; garment: Garment; item: ClothingItem }> {
  const out: Array<{ slot: ClothingSlot; garment: Garment; item: ClothingItem }> = [];
  for (const [slot, g] of Object.entries(w.equipped)) {
    if (!g) continue;
    const item = itemById(g.itemId);
    if (item) out.push({ slot: slot as ClothingSlot, garment: g, item });
  }
  return out;
}

// ============ 派生数值 ============

/** 各身体区域的覆盖度（多层累加，上限 1） */
export function coverage(w: Wardrobe): Record<BodyZone, number> {
  const out = {} as Record<BodyZone, number>;
  for (const item of equippedItems(w)) {
    for (const [zone, v] of Object.entries(item.coverage)) {
      const z = zone as BodyZone;
      out[z] = Math.min(1, (out[z] ?? 0) + (v ?? 0));
    }
  }
  return out;
}

/** 单区域覆盖度 */
export function zoneCoverage(w: Wardrobe, zone: BodyZone): number {
  return coverage(w)[zone] ?? 0;
}

/** 暴露度 0-100：敏感区域未被覆盖的平均值 */
export function exposure(w: Wardrobe): number {
  const cov = coverage(w);
  let sum = 0;
  for (const z of SENSITIVE_ZONES) sum += 1 - (cov[z] ?? 0);
  return Math.round((sum / SENSITIVE_ZONES.length) * 100);
}

export function insulation(w: Wardrobe): number {
  return equippedItems(w).reduce((s, i) => s + i.insulation, 0);
}

export function armor(w: Wardrobe): number {
  return equippedItems(w).reduce((s, i) => s + i.armor, 0);
}

export function charm(w: Wardrobe): number {
  return equippedItems(w).reduce((s, i) => s + i.charm, 0);
}

export function stealth(w: Wardrobe): number {
  return equippedItems(w).reduce((s, i) => s + i.stealth, 0);
}

export function totalWeight(w: Wardrobe): number {
  return equippedItems(w).reduce((s, i) => s + i.weight, 0);
}

/** 是否有某标签的衣物 */
export function hasTag(w: Wardrobe, tag: string): boolean {
  return equippedItems(w).some((i) => i.tags.includes(tag));
}

/** 岗位制服是否齐备 */
export function uniformOk(w: Wardrobe, jobTag: string): boolean {
  return hasTag(w, "job:" + jobTag);
}

// ============ 脱衣 ============

/** 当前可脱的槽位顺序（由外到内） */
export function undressOrder(w: Wardrobe): ClothingSlot[] {
  return UNDRESS_SEQUENCE.filter((s) => w.equipped[s] !== undefined);
}

export interface UndressStep {
  wardrobe: Wardrobe;
  slot: ClothingSlot | null;
  item: ClothingItem | null;
  /** 脱掉后的暴露度 */
  exposure: number;
}

/** 脱掉最外一层 */
export function undressStep(w: Wardrobe): UndressStep {
  const order = undressOrder(w);
  const slot = order[0] ?? null;
  if (!slot) return { wardrobe: w, slot: null, item: null, exposure: exposure(w) };
  const g = w.equipped[slot];
  const item = g ? itemById(g.itemId) ?? null : null;
  const next = unequip(w, slot);
  return { wardrobe: next, slot, item, exposure: exposure(next) };
}

/** 连续脱到指定暴露度（不低于 target） */
export function undressTo(w: Wardrobe, targetExposure: number): { wardrobe: Wardrobe; removed: ClothingItem[] } {
  let cur = w;
  const removed: ClothingItem[] = [];
  let guard = 0;
  while (exposure(cur) < targetExposure && guard++ < 20) {
    const step = undressStep(cur);
    if (!step.slot) break;
    cur = step.wardrobe;
    if (step.item) removed.push(step.item);
  }
  return { wardrobe: cur, removed };
}

/** 全部脱光 */
export function undressAll(w: Wardrobe): { wardrobe: Wardrobe; removed: ClothingItem[] } {
  return undressTo(w, 100);
}

// ============ 耐久 ============

/** 对全部在穿衣物造成磨损 */
export function damage(w: Wardrobe, amount: number): Wardrobe {
  const equipped = { ...w.equipped };
  for (const [slot, g] of Object.entries(equipped)) {
    if (!g) continue;
    equipped[slot as ClothingSlot] = { ...g, durability: Math.max(0, g.durability - amount) };
  }
  return { equipped, stored: w.stored };
}

/** 衣物状况 0-1（取最低值） */
export function conditionOf(w: Wardrobe): number {
  const gs = Object.values(w.equipped).filter((g): g is Garment => !!g);
  if (gs.length === 0) return 1;
  let worst = 1;
  for (const g of gs) {
    const item = itemById(g.itemId);
    if (!item || item.durability <= 0) continue;
    worst = Math.min(worst, g.durability / item.durability);
  }
  return worst;
}

/** 修好全部（含储物） */
export function repairAll(w: Wardrobe): Wardrobe {
  const fix = (g: Garment): Garment => {
    const item = itemById(g.itemId);
    return { ...g, durability: item?.durability ?? g.durability };
  };
  const equipped: Wardrobe["equipped"] = {};
  for (const [slot, g] of Object.entries(w.equipped)) {
    if (g) equipped[slot as ClothingSlot] = fix(g);
  }
  return { equipped, stored: w.stored.map(fix) };
}

/** 破损到 0 的衣物会被移除 */
export function pruneBroken(w: Wardrobe): Wardrobe {
  const equipped: Wardrobe["equipped"] = {};
  for (const [slot, g] of Object.entries(w.equipped)) {
    if (g && g.durability > 0) equipped[slot as ClothingSlot] = g;
  }
  return { equipped, stored: w.stored.filter((g) => g.durability > 0) };
}

// ============ 天气适配 ============

export interface Suitability {
  ok: boolean;
  insulation: number;
  reasons: string[];
}

/** 当前着装对某天气是否合适 */
export function suitability(w: Wardrobe, weather: Weather): Suitability {
  const ins = insulation(w);
  const reasons: string[] = [];
  let ok = true;

  if (weather === "cold" || weather === "snow") {
    if (ins < 10) { ok = false; reasons.push("保暖不足（需 10，当前 " + ins + "）"); }
  }
  if (weather === "heat") {
    if (ins > 6) { ok = false; reasons.push("过于厚重（建议 ≤6，当前 " + ins + "）"); }
  }
  if (weather === "rain" || weather === "storm") {
    if (ins < 3) { ok = false; reasons.push("缺少防水外层"); }
  }
  return { ok, insulation: ins, reasons };
}

// ============ 预设着装 ============

export type WardrobePreset = "hero" | "mother" | "sister" | "sister2" | "ai" | "nude";

const PRESETS: Record<WardrobePreset, string[]> = {
  hero: ["sport_bra", "boxer_briefs", "work_shirt", "cargo_pants", "combat_boots", "tactical_gloves"],
  mother: ["cotton_bra", "plain_panties", "nightgown", "long_skirt", "slippers"],
  sister: ["lace_bra", "lace_panties", "work_shirt", "jeans", "heels", "scarf"],
  sister2: ["sport_bra", "plain_panties", "hoodie", "jeans", "sneakers"],
  ai: [],
  nude: []
};

export function presetWardrobe(preset: WardrobePreset): Wardrobe {
  return equipAll(newWardrobe(), PRESETS[preset] ?? []);
}

export function presetItems(preset: WardrobePreset): string[] {
  return [...(PRESETS[preset] ?? [])];
}

// ============ 序列化 ============

export interface WardrobeJSON {
  equipped: Record<string, { itemId: string; durability: number; variant?: string }>;
  stored: Array<{ itemId: string; durability: number; variant?: string }>;
}

export function wardrobeToJSON(w: Wardrobe): WardrobeJSON {
  const equipped: WardrobeJSON["equipped"] = {};
  for (const [slot, g] of Object.entries(w.equipped)) {
    if (g) equipped[slot] = { itemId: g.itemId, durability: g.durability, variant: g.variant };
  }
  return { equipped, stored: w.stored.map((g) => ({ itemId: g.itemId, durability: g.durability, variant: g.variant })) };
}

export function wardrobeFromJSON(j: WardrobeJSON | undefined | null): Wardrobe {
  if (!j) return newWardrobe();
  const equipped: Wardrobe["equipped"] = {};
  for (const [slot, g] of Object.entries(j.equipped ?? {})) {
    if (!itemById(g.itemId)) continue;
    equipped[slot as ClothingSlot] = { itemId: g.itemId, durability: g.durability, variant: g.variant };
  }
  const stored: Garment[] = (j.stored ?? [])
    .filter((g) => itemById(g.itemId))
    .map((g) => ({ itemId: g.itemId, durability: g.durability, variant: g.variant }));
  return { equipped, stored };
}

/** 摘要文本，供 UI 显示 */
export function describe(w: Wardrobe): string {
  const items = equippedGarments(w).sort(
    (a, b) => UNDRESS_SEQUENCE.indexOf(a.slot) - UNDRESS_SEQUENCE.indexOf(b.slot)
  );
  if (items.length === 0) return "（未着衣物）";
  return items.map((x) => x.item.name).join(" / ");
}
