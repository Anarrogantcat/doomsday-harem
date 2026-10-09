/**
 * 物品与资源系统。
 *
 * 定位：
 *  - 统一承载科技消耗、建造材料、食物饮水、药品、弹药、玩具、礼物
 *  - 背包有容量与重量上限，据点仓库无上限但有分类
 *  - 物品有耐久、堆叠、品质
 *  - 采集/搜刮/合成/交易 全部走这里的纯函数
 *
 * 纯函数式，不触碰 IO。
 */

export type ItemCategory =
  | "material"   // 建材、金属、电子
  | "food"       // 食物
  | "water"      // 饮水
  | "medical"    // 药品
  | "ammo"       // 弹药
  | "weapon"     // 武器
  | "tool"       // 工具
  | "clothing"   // 服装（与 clothing.ts 的 id 对应）
  | "toy"        // 成人道具
  | "drug"       // 扶她药等
  | "luxury"     // 奢侈品、礼物
  | "key"        // 钥匙、门禁卡
  | "data";      // 数据芯片、档案

export const CATEGORY_LABEL: Record<ItemCategory, string> = {
  material: "材料",
  food: "食物",
  water: "饮水",
  medical: "药品",
  ammo: "弹药",
  weapon: "武器",
  tool: "工具",
  clothing: "服装",
  toy: "道具",
  drug: "药剂",
  luxury: "奢侈品",
  key: "钥匙",
  data: "数据"
};

export type Quality = "poor" | "common" | "good" | "rare" | "pristine";

export const QUALITY_LABEL: Record<Quality, string> = {
  poor: "劣质", common: "普通", good: "良好", rare: "稀有", pristine: "完美"
};

/** 品质对效果的倍率 */
export const QUALITY_MULT: Record<Quality, number> = {
  poor: 0.7, common: 1.0, good: 1.2, rare: 1.5, pristine: 2.0
};

export interface ItemDef {
  id: string;
  name: string;
  category: ItemCategory;
  /** 单件重量 */
  weight: number;
  /** 最大堆叠（1 表示不可堆叠） */
  stack: number;
  /** 基础价值，用于交易 */
  value: number;
  /** 耐久，0 表示无耐久概念 */
  durability: number;
  description: string;
  /** 效果：如 hunger+40 / thirst+50 / heal+30 / lust+20 / armor+5 */
  effects?: Record<string, number>;
  tags?: string[];
}

/** 一个堆叠 */
export interface Stack {
  itemId: string;
  count: number;
  /** 有耐久的物品：逐件的剩余耐久（count > 1 时取平均展示） */
  durability: number;
  quality: Quality;
}

/** 容器：背包或仓库 */
export interface Container {
  stacks: Stack[];
  /** 重量上限，Infinity 表示无限（据点仓库） */
  maxWeight: number;
  /** 槽位上限，Infinity 表示无限 */
  maxSlots: number;
}

// ============ 物品目录 ============

const d = (
  id: string, name: string, category: ItemCategory,
  weight: number, stack: number, value: number, durability: number,
  description: string, effects?: Record<string, number>, tags?: string[]
): ItemDef => ({ id, name, category, weight, stack, value, durability, description, effects, tags });

export const ITEMS: ItemDef[] = [
  // ---- 材料 ----
  d("wood", "木材", "material", 2.0, 99, 2, 0, "基础建材，可用于建造与燃料"),
  d("stone", "石料", "material", 3.0, 99, 1, 0, "粗糙石块，砌墙用"),
  d("cement", "水泥", "material", 5.0, 50, 6, 0, "建筑核心材料"),
  d("steel_bar", "钢筋", "material", 4.0, 50, 8, 0, "结构加固用"),
  d("copper_wire", "铜线", "material", 0.5, 99, 5, 0, "电路与电机材料"),
  d("magnet", "磁铁", "material", 0.3, 50, 6, 0, "发电机与电机部件"),
  d("pvc_pipe", "PVC管", "material", 1.0, 99, 3, 0, "水路系统"),
  d("filter_mesh", "滤网", "material", 0.2, 99, 4, 0, "初级过滤"),
  d("activated_carbon", "活性炭", "material", 0.5, 99, 5, 0, "净水滤芯"),
  d("pump", "水泵", "material", 3.0, 10, 25, 0, "供水系统核心"),
  d("fan", "风扇", "material", 1.5, 20, 8, 0, "通风系统"),
  d("duct", "通风管道", "material", 2.0, 50, 4, 0, "空气循环"),
  d("glass", "玻璃", "material", 3.0, 50, 5, 0, "温室与窗户"),
  d("led", "LED灯", "material", 0.3, 50, 7, 0, "温室补光"),
  d("metal_shelf", "金属架", "material", 5.0, 20, 10, 0, "储物优化"),
  d("insulation", "隔音材料", "material", 1.0, 50, 9, 0, "私密空间改造"),
  d("furniture", "定制家具", "material", 8.0, 10, 20, 0, "生活品质"),
  d("solar_panel", "光伏板", "material", 6.0, 20, 45, 0, "发电核心"),
  d("battery", "蓄电池", "material", 8.0, 20, 35, 0, "储能"),
  d("controller", "控制器", "material", 1.0, 20, 18, 0, "电力调节"),
  d("electronics", "电子元件", "material", 0.2, 99, 12, 0, "精密电路"),
  d("machine_part", "机床部件", "material", 6.0, 20, 40, 0, "弹药复装与加工"),
  d("mold", "模具", "material", 2.0, 20, 15, 0, "弹药成型"),
  d("hydraulic", "液压系统", "material", 5.0, 10, 50, 0, "重型门与升降"),
  d("armor_plate", "装甲板", "material", 8.0, 20, 60, 0, "车辆与防御装甲"),
  d("welding_kit", "焊接设备", "material", 4.0, 10, 30, 0, "金属加工"),
  d("rare_catalyst", "稀有催化剂", "material", 0.3, 20, 120, 0, "高级制药"),
  d("rare_plant", "稀有植物", "material", 0.5, 20, 40, 0, "药剂原料"),
  d("hormone_precursor", "激素前体", "material", 0.2, 20, 55, 0, "扶她药原料"),
  d("gene_sample", "基因样本", "material", 0.1, 10, 150, 0, "高级生物科技"),
  d("isotope", "稀有同位素", "material", 0.5, 5, 400, 0, "聚变材料"),

  // ---- 食物 ----
  d("canned_food", "罐头", "food", 0.4, 50, 6, 0, "长期储备", { hunger: 45 }),
  d("dried_food", "脱水食品", "food", 0.2, 99, 4, 0, "轻便口粮", { hunger: 30 }),
  d("bread", "面包", "food", 0.3, 20, 3, 0, "新鲜烘焙", { hunger: 35, mood: 5 }),
  d("meat", "肉干", "food", 0.3, 30, 12, 0, "高热量", { hunger: 55, mood: 8 }),
  d("vegetable", "蔬菜", "food", 0.3, 30, 5, 0, "温室产出", { hunger: 25, mood: 3 }),
  d("candy", "糖果", "luxury", 0.1, 99, 5, 0, "甜食", { mood: 12 }),
  d("coffee", "咖啡", "food", 0.2, 30, 15, 0, "提神", { energy: 30, mood: 8 }),
  d("alcohol", "烈酒", "luxury", 0.8, 20, 25, 0, "消毒与放松", { mood: 18, energy: -5 }),

  // ---- 饮水 ----
  d("water_bottle", "瓶装水", "water", 0.5, 50, 3, 0, "干净饮水", { thirst: 50 }),
  d("dirty_water", "浑浊水", "water", 0.5, 50, 0, 0, "需过滤", { thirst: 30, mood: -5 }),
  d("water_purifier", "净水滤芯", "material", 0.5, 20, 12, 0, "过滤耗材"),

  // ---- 药品 ----
  d("painkiller", "止疼药", "medical", 0.1, 50, 8, 0, "缓解疼痛", { heal: 10 }),
  d("antibiotic", "抗生素", "medical", 0.1, 30, 25, 0, "抗感染", { heal: 30 }),
  d("bandage", "绷带", "medical", 0.1, 99, 4, 0, "止血包扎", { heal: 15 }),
  d("stimulant", "兴奋剂", "medical", 0.1, 20, 30, 0, "短时爆发", { stamina: 40, energy: 25 }),
  d("surgical_kit", "手术器械", "tool", 2.0, 5, 80, 0, "重伤处理", { heal: 60 }),
  d("gene_stabilizer", "基因稳定剂", "medical", 0.2, 10, 150, 0, "寿命科技原料"),
  d("regen_promoter", "再生促进剂", "medical", 0.2, 10, 180, 0, "加速愈合", { heal: 80 }),

  // ---- 弹药 ----
  d("ammo_762", "7.62mm 步枪弹", "ammo", 0.02, 200, 2, 0, "步枪弹药"),
  d("ammo_9mm", "9mm 手枪弹", "ammo", 0.015, 300, 1, 0, "手枪弹药"),
  d("ammo_shell", "霰弹", "ammo", 0.03, 100, 3, 0, "霰弹枪弹药"),
  d("gunpowder", "火药", "material", 0.3, 50, 10, 0, "弹药与炸药原料"),

  // ---- 武器 ----
  d("knife", "战术刀", "weapon", 0.5, 1, 30, 100, "近战武器"),
  d("axe", "消防斧", "weapon", 2.5, 1, 40, 120, "破门与近战"),
  d("bat", "棒球棍", "weapon", 1.5, 1, 20, 150, "钝器"),
  d("pistol", "手枪", "weapon", 1.0, 1, 200, 200, "轻武器"),
  d("rifle", "步枪", "weapon", 3.5, 1, 450, 250, "制式武器"),
  d("shotgun", "霰弹枪", "weapon", 3.2, 1, 350, 220, "近距离强力"),
  d("machinegun", "轻机枪", "weapon", 8.0, 1, 900, 300, "压制火力"),

  // ---- 工具 ----
  d("toolbox", "工具箱", "tool", 5.0, 1, 60, 150, "维修基础"),
  d("crowbar", "撬棍", "tool", 2.0, 1, 25, 200, "撬门"),
  d("flashlight", "手电", "tool", 0.5, 5, 15, 80, "照明"),
  d("rope", "绳索", "tool", 1.5, 10, 12, 0, "攀爬与固定"),
  d("binocular", "望远镜", "tool", 1.0, 5, 40, 0, "侦察"),
  d("radio", "无线电", "tool", 2.0, 5, 70, 0, "通讯"),
  d("radar_module", "雷达模块", "tool", 3.0, 5, 200, 0, "探测"),
  d("sensor", "传感器", "material", 0.3, 50, 15, 0, "自动化与警戒"),
  d("drone_part", "无人机部件", "material", 2.0, 10, 120, 0, "空中侦察"),

  // ---- 成人道具 ----
  d("dildo_double", "双头龙", "toy", 0.4, 5, 60, 60, "两人同时使用", { lust: 25 }),
  d("strap_on", "穿戴式假阳具", "toy", 0.5, 5, 55, 60, "单人穿戴", { lust: 22 }),
  d("vibrator", "震动棒", "toy", 0.3, 5, 45, 80, "电动刺激", { lust: 20 }),
  d("egg_vibe", "跳蛋", "toy", 0.1, 10, 30, 70, "隐蔽刺激", { lust: 15 }),
  d("restraint_set", "捆绑带", "toy", 0.3, 5, 35, 50, "束缚道具", { lust: 18 }),
  d("lube", "润滑剂", "toy", 0.2, 20, 20, 0, "减少不适", { lust: 10 }),

  // ---- 扶她药 ----
  d("futa_recreational", "扶她药·娱乐型", "drug", 0.1, 20, 120, 0,
    "服用后短暂长出男性器官（数小时），仅用于亲密互动",
    { lust: 40 }, ["futa", "temporary"]),
  d("futa_pregnant", "扶她药·怀孕型", "drug", 0.1, 10, 320, 0,
    "服用后短暂具生殖能力，可让主角受孕",
    { lust: 45 }, ["futa", "temporary", "fertility"]),
  d("contraceptive", "避孕药", "drug", 0.05, 30, 40, 0, "降低受孕概率"),
  d("fertility_boost", "促孕剂", "drug", 0.05, 20, 60, 0, "提高受孕概率"),

  // ---- 奢侈品 / 礼物 ----
  d("jewelry", "珠宝", "luxury", 0.1, 10, 200, 0, "高价值礼物", { mood: 25 }),
  d("perfume", "香水", "luxury", 0.2, 10, 80, 0, "提升魅力", { mood: 15 }),
  d("chocolate", "巧克力", "luxury", 0.1, 30, 30, 0, "甜食礼物", { mood: 20 }),
  d("book", "书籍", "luxury", 0.5, 20, 25, 0, "消遣", { mood: 12, energy: 5 }),
  d("music_player", "音乐播放器", "luxury", 0.3, 5, 90, 0, "氛围营造", { mood: 22 }),
  d("piano", "立式钢琴", "luxury", 200, 1, 500, 0, "精神支柱", { mood: 30 }),
  d("photo", "旧照片", "key", 0.01, 1, 0, 0, "主角转变前的样子"),

  // ---- 钥匙 / 数据 ----
  d("key_villa", "别墅储藏室钥匙", "key", 0.02, 1, 0, 0, "开启高端物资"),
  d("key_neighbor", "邻居家钥匙", "key", 0.02, 1, 0, 0, "遗留物资"),
  d("access_card", "门禁卡", "key", 0.02, 10, 0, 0, "研究所门禁"),
  d("data_chip", "数据芯片", "data", 0.05, 20, 60, 0, "科技资料"),
  d("archive", "旧档案", "data", 0.5, 10, 40, 0, "知识资料"),
  d("formula_notes", "配方笔记", "data", 0.1, 5, 100, 0, "制药前置"),
  d("gene_data", "基因优化数据", "data", 0.1, 5, 300, 0, "寿命科技前置"),
  d("flight_coords", "坠机点坐标", "data", 0.05, 5, 0, 0, "可回收物资点"),
  d("medical_supply", "医疗物资", "medical", 0.3, 50, 12, 0, "通用医疗耗材", { heal: 20 }),
  d("cloth", "布料", "material", 0.5, 99, 3, 0, "纺织与包扎材料"),
  d("generic_material", "通用材料", "material", 1.0, 999, 5, 0,
    "未分类的建造/研发材料（科技树中未单独建模的资源）")
];

const BY_ID = new Map(ITEMS.map((x) => [x.id, x]));

/** 中文名 → id（科技树的 cost 用中文名书写，此处做兼容） */
const BY_NAME = new Map(ITEMS.map((x) => [x.name, x.id]));

/**
 * 科技树与配方里的中文资源名 → 物品 id 别名。
 *
 * 科技树有 190+ 个资源名，无法逐一建目录条目；这里把常见名映射到
 * 已有物品，未映射的名字走「通用材料」兜底（见 resolveItemId）。
 */
const ALIASES: Record<string, string> = {
  // 电力 / 电子
  "铜线": "copper_wire", "磁铁": "magnet", "光伏板": "solar_panel",
  "蓄电池": "battery", "电池": "battery", "电池组": "battery",
  "高容量电池": "battery", "控制器": "controller", "显示屏": "electronics",
  "显示终端": "electronics", "摄像头": "electronics", "传感器": "sensor",
  "运动传感器": "sensor", "传感器网络": "sensor", "通信模块": "electronics",
  "伺服": "electronics", "无线电": "radio", "电台": "radio",
  "雷达模块": "radar_module", "无线充电模块": "electronics",
  "智能配电": "electronics", "特殊接口": "electronics",
  "全息投影": "electronics", "全息导航": "electronics",
  "神经接口": "electronics", "同步模块": "electronics",
  "AI控制器": "electronics", "AI火控": "electronics", "AI战术模块": "electronics",
  "自主AI": "electronics", "高算力服务器": "electronics",
  "数据模型": "data_chip", "追踪系统": "sensor", "自动灌溉": "sensor",

  // 建材 / 结构
  "水泥": "cement", "钢筋": "steel_bar", "钢板": "armor_plate",
  "装甲板": "armor_plate", "复合装甲板": "armor_plate",
  "强化装甲": "armor_plate", "合金装甲": "armor_plate",
  "军用装甲套件": "armor_plate", "轻型装甲": "armor_plate",
  "木材": "wood", "石料": "stone", "砖石": "stone",
  "玻璃": "glass", "管道": "duct", "通风管道": "duct",
  "PVC管": "pvc_pipe", "滤网": "filter_mesh", "活性炭": "activated_carbon",
  "水泵": "pump", "泵": "pump", "风扇": "fan", "金属架": "metal_shelf",
  "隔音材料": "insulation", "定制家具": "furniture", "装饰": "furniture",
  "私密隔间": "furniture", "折叠床": "furniture",
  "焊接设备": "welding_kit", "工具套装": "toolbox", "工具箱": "toolbox",
  "液压系统": "hydraulic", "升降平台": "hydraulic",
  "模具": "mold", "机床": "machine_part", "CNC机床": "machine_part",
  "3D打印机": "machine_part", "自动制药机": "machine_part",
  "弹药联动": "machine_part", "联动弹链": "machine_part", "供弹机": "machine_part",
  "机床部件": "machine_part", "精密仪器": "machine_part",
  "化学合成台": "machine_part", "精密合成台": "machine_part",
  "手术器械": "surgical_kit", "药品柜": "surgical_kit",
  "折叠手术台": "surgical_kit", "医疗监控": "sensor",

  // 能源
  "柴油机": "machine_part", "发电机": "machine_part",
  "大型汽轮机": "machine_part", "汽轮机": "machine_part",
  "涡轮": "machine_part", "热泵": "machine_part", "多组热泵": "machine_part",
  "热交换器": "machine_part", "地热井": "machine_part",
  "电解槽": "machine_part", "合成塔": "machine_part",
  "聚光镜": "solar_panel", "塔架": "steel_bar", "扇叶": "machine_part",
  "油箱": "steel_bar", "油管": "pvc_pipe", "输油管道": "duct",
  "防水箱": "steel_bar", "冗余系统": "electronics",
  "稳定约束场": "electronics", "约束装置": "electronics",
  "能源过载器": "isotope", "水晶核心": "isotope",
  "稀有同位素": "isotope",

  // 食物 / 农业
  "温室": "glass", "LED灯": "led", "原料温棚": "glass",
  "冰箱": "machine_part", "炉灶": "machine_part",

  // 制药 / 生物
  "稀有植物": "rare_plant", "稀有草药": "rare_plant", "草药": "rare_plant",
  "稀有催化剂": "rare_catalyst", "激素前体": "hormone_precursor",
  "基因样本": "gene_sample", "基因稳定剂": "gene_stabilizer",
  "稳定剂": "gene_stabilizer", "营养剂": "medical_supply",
  "化学试剂": "rare_catalyst", "稀有化合物": "rare_catalyst",
  "珍稀材料": "rare_catalyst", "顶级材料": "rare_catalyst",
  "干细胞培养舱": "machine_part", "培养舱": "machine_part",
  "细胞培养皿": "glass", "显微镜": "toolbox", "激素分析仪": "machine_part",
  "DNA分析仪": "machine_part", "全基因编辑套件": "machine_part",
  "生物芯片": "electronics", "生物过滤器": "filter_mesh",
  "人工皮肤": "electronics", "仿生骨架": "machine_part",
  "特殊培养液": "rare_catalyst", "生物子宫": "machine_part",
  "激素模拟": "electronics", "基因适配": "electronics",
  "DNA修正": "gene_sample", "细胞活化": "gene_sample",
  "血液样本": "gene_sample",

  // 武器 / 弹药
  "火药": "gunpowder", "轻机枪": "machinegun", "机枪": "machinegun",
  "重机枪": "machinegun", "备用枪管": "machine_part",
  "枪架": "machine_part", "轻武器架": "machine_part",
  "三角架": "steel_bar", "旋转底座": "machine_part",
  "炮塔基座": "machine_part", "自动炮塔": "machine_part",
  "攻击无人机": "drone_part", "侦察无人机": "drone_part",
  "机器人": "drone_part", "履带底盘": "machine_part",
  "四足机构": "machine_part", "地形传感器": "sensor",
  "遥控系统": "electronics", "锁扣": "steel_bar",
  "绞盘": "machine_part", "破障铲": "steel_bar",
  "沙袋": "cloth", "覆土": "stone", "尖刺": "steel_bar",
  "削尖木桩": "wood", "铁丝": "steel_bar", "铁丝网": "steel_bar",
  "铁钉": "steel_bar", "铁皮罐": "steel_bar", "大石": "stone",
  "杠杆": "steel_bar", "绳子": "rope", "玻璃瓶": "glass",
  "铲子": "toolbox", "备胎": "machine_part", "宽胎": "machine_part",
  "涉水喉": "pvc_pipe", "舱口改造": "machine_part",
  "伪装门": "steel_bar", "地形涂层": "insulation",
  "全息伪装网": "insulation", "扩展帐篷": "cloth",
  "货架": "metal_shelf", "捆扎带": "cloth", "水箱": "steel_bar",

  // 训练 / 自我科技
  "自制哑铃": "steel_bar", "引体架": "steel_bar", "木人桩": "wood",
  "计时训练": "data_chip", "预知日记": "book", "纸笔": "book",
  "哨子": "toolbox", "照明": "led", "充电桩": "electronics",
  "充电舱": "electronics", "冷却系统": "machine_part",
  "身体改造手术": "surgical_kit", "深层意识整合": "data_chip",
  "觉醒仪式": "rare_catalyst", "终极试炼": "data_chip",
  "终极研究数据": "gene_data", "意识训练": "data_chip",
  "心理训练": "data_chip", "专注训练": "data_chip",
  "预知训练": "data_chip", "抗毒训练": "data_chip",
  "生物反馈训练": "data_chip", "体能循环": "data_chip",
  "冥想练习": "data_chip", "穴位研究": "book",
  "信息素控制": "hormone_precursor", "燃油": "gunpowder",
  "药品": "medical_supply"
};

/** 兜底物品：未映射的资源名统一归到此 id，避免科技树无法扣费 */
export const GENERIC_MATERIAL_ID = "generic_material";

/**
 * 解析物品标识：接受英文 id 或中文名。
 * 科技树/配方里的 cost 用中文名（如「铜线」），物品目录用英文 id
 * （copper_wire），这里统一归一化。
 */
export function resolveItemId(key: string): string {
  if (BY_ID.has(key)) return key;
  const byName = BY_NAME.get(key);
  if (byName) return byName;
  const alias = ALIASES[key];
  if (alias) return alias;
  // 未收录的名字统一归到通用材料，保证科技树扣费不会失败
  return GENERIC_MATERIAL_ID;
}

/** 该名字是否被目录或别名收录（未收录走兜底） */
export function isKnownItem(key: string): boolean {
  return BY_ID.has(key) || BY_NAME.has(key) || key in ALIASES;
}

export function itemDef(id: string): ItemDef | undefined {
  return BY_ID.get(id) ?? BY_ID.get(BY_NAME.get(id) ?? "");
}

/** 归一化 cost 字典：中文名 → id */
export function normalizeCost(cost: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(cost)) {
    const id = resolveItemId(k);
    out[id] = (out[id] ?? 0) + v;
  }
  return out;
}

export function itemsByCategory(cat: ItemCategory): ItemDef[] {
  return ITEMS.filter((x) => x.category === cat);
}

export function itemsByTag(tag: string): ItemDef[] {
  return ITEMS.filter((x) => x.tags?.includes(tag));
}

// ============ 容器操作 ============

export function newContainer(maxWeight = 40, maxSlots = 30): Container {
  return { stacks: [], maxWeight, maxSlots };
}

export function newStorage(): Container {
  return { stacks: [], maxWeight: Infinity, maxSlots: Infinity };
}

export function weightOf(c: Container): number {
  return c.stacks.reduce((s, st) => {
    const def = itemDef(st.itemId);
    return s + (def?.weight ?? 0) * st.count;
  }, 0);
}

export function countOf(c: Container, itemId: string): number {
  const id = resolveItemId(itemId);
  return c.stacks.filter((s) => s.itemId === id).reduce((a, s) => a + s.count, 0);
}

export function totalCount(c: Container): number {
  return c.stacks.reduce((a, s) => a + s.count, 0);
}

export function has(c: Container, itemId: string, n = 1): boolean {
  return countOf(c, itemId) >= n;
}

export function freeWeight(c: Container): number {
  return c.maxWeight === Infinity ? Infinity : Math.max(0, c.maxWeight - weightOf(c));
}

export function freeSlots(c: Container): number {
  return c.maxSlots === Infinity ? Infinity : Math.max(0, c.maxSlots - c.stacks.length);
}

export function isFull(c: Container): boolean {
  return freeWeight(c) <= 0 || freeSlots(c) <= 0;
}

export interface AddResult {
  container: Container;
  added: number;
  /** 因容量不足而未放入的数量 */
  overflow: number;
  reason?: "weight" | "slots" | "both";
}

/** 添加物品。超出容量时部分放入并报告溢出。 */
export function add(c: Container, itemId: string, n = 1, quality: Quality = "common"): AddResult {
  const resolved = resolveItemId(itemId);
  const def = itemDef(resolved);
  if (!def || n <= 0) return { container: c, added: 0, overflow: Math.max(0, n) };
  itemId = resolved;

  const stacks = c.stacks.map((s) => ({ ...s }));
  let remaining = n;
  let added = 0;

  // 1) 先填已有未满的堆叠
  if (def.stack > 1) {
    for (const s of stacks) {
      if (remaining <= 0) break;
      if (s.itemId !== itemId || s.quality !== quality) continue;
      const room = def.stack - s.count;
      if (room <= 0) continue;
      const want = Math.min(room, remaining);
      let put = want;
      if (c.maxWeight !== Infinity) {
        const free = freeWeight({ ...c, stacks });
        const byWeight = def.weight > 0 ? Math.floor(free / def.weight) : want;
        put = Math.min(want, byWeight);
      }
      if (put <= 0) break;
      s.count += put;
      remaining -= put;
      added += put;
    }
  }

  // 2) 新建堆叠
  // 注意：容量必须逐件判断。整堆一起判断会导致「单件装得下但整堆装不下」
  // 时被整体拒绝，与设计意图（部分放入）不符。
  let slots = c.maxSlots === Infinity ? Infinity : c.maxSlots - stacks.length;
  while (remaining > 0 && slots > 0) {
    // 本堆叠最多能放多少件（受堆叠上限与剩余数量限制）
    const want = def.stack === 1 ? 1 : Math.min(def.stack, remaining);
    // 再受剩余容量限制
    let put = 0;
    if (c.maxWeight === Infinity) {
      put = want;
    } else {
      const room = freeWeight({ ...c, stacks });
      const byWeight = def.weight > 0 ? Math.floor(room / def.weight) : want;
      put = Math.min(want, byWeight);
    }
    if (put <= 0) break;
    stacks.push({ itemId, count: put, durability: def.durability, quality });
    remaining -= put;
    added += put;
    if (slots !== Infinity) slots--;
  }

  const overflow = remaining;
  let reason: AddResult["reason"];
  if (overflow > 0) {
    const wFull = freeWeight({ ...c, stacks }) <= 0;
    const sFull = freeSlots({ ...c, stacks }) <= 0;
    reason = wFull && sFull ? "both" : wFull ? "weight" : "slots";
  }

  return { container: { ...c, stacks }, added, overflow, reason };
}

/** 批量添加，返回未放入的数量 */
export function addMany(c: Container, entries: Array<{ id: string; n: number; quality?: Quality }>): { container: Container; overflow: Record<string, number> } {
  let cur = c;
  const overflow: Record<string, number> = {};
  for (const e of entries) {
    const r = add(cur, e.id, e.n, e.quality);
    cur = r.container;
    if (r.overflow > 0) overflow[e.id] = (overflow[e.id] ?? 0) + r.overflow;
  }
  return { container: cur, overflow };
}

export interface RemoveResult {
  container: Container;
  removed: number;
  missing: number;
}

/** 移除物品。不足时移除全部并报告缺口。 */
export function remove(c: Container, itemId: string, n = 1): RemoveResult {
  itemId = resolveItemId(itemId);
  if (n <= 0) return { container: c, removed: 0, missing: 0 };
  const stacks: Stack[] = [];
  let remaining = n;
  let removed = 0;

  for (const s of c.stacks) {
    if (remaining <= 0) {
      stacks.push({ ...s });
      continue;
    }
    if (s.itemId !== itemId) {
      stacks.push({ ...s });
      continue;
    }
    const take = Math.min(s.count, remaining);
    removed += take;
    remaining -= take;
    const left = s.count - take;
    if (left > 0) stacks.push({ ...s, count: left });
  }

  return { container: { ...c, stacks }, removed, missing: remaining };
}

/** 检查并一次性移除一组物品（用于科技消耗） */
export function canAfford(c: Container, cost: Record<string, number>): boolean {
  for (const [id, n] of Object.entries(normalizeCost(cost))) {
    if (countOf(c, id) < n) return false;
  }
  return true;
}

export function missingFor(c: Container, cost: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [id, n] of Object.entries(normalizeCost(cost))) {
    const lack = n - countOf(c, id);
    if (lack > 0) out[id] = lack;
  }
  return out;
}

export function spend(c: Container, cost: Record<string, number>): { container: Container; ok: boolean } {
  if (!canAfford(c, cost)) return { container: c, ok: false };
  let cur = c;
  for (const [id, n] of Object.entries(normalizeCost(cost))) {
    cur = remove(cur, id, n).container;
  }
  return { container: cur, ok: true };
}

/** 两容器之间转移 */
export function transfer(from: Container, to: Container, itemId: string, n = 1): { from: Container; to: Container; moved: number } {
  const take = Math.min(n, countOf(from, itemId));
  if (take <= 0) return { from, to, moved: 0 };
  const r = remove(from, itemId, take);
  const a = add(to, itemId, take);
  // 放不下的退回
  if (a.overflow > 0) {
    const back = add(r.container, itemId, a.overflow);
    return { from: back.container, to: a.container, moved: take - a.overflow };
  }
  return { from: r.container, to: a.container, moved: take };
}

/** 合并堆叠（同 id 同品质） */
export function consolidate(c: Container): Container {
  const groups = new Map<string, Stack>();
  for (const s of c.stacks) {
    const key = s.itemId + "|" + s.quality;
    const def = itemDef(s.itemId);
    const max = def?.stack ?? 1;
    const cur = groups.get(key);
    if (!cur) {
      groups.set(key, { ...s, count: Math.min(s.count, max) });
      let left = s.count - Math.min(s.count, max);
      while (left > 0) {
        const put = Math.min(max, left);
        // 需要新键避免覆盖
        groups.set(key + "#" + groups.size, { ...s, count: put });
        left -= put;
      }
    } else {
      const room = max - cur.count;
      const put = Math.min(room, s.count);
      cur.count += put;
      let left = s.count - put;
      while (left > 0) {
        const p = Math.min(max, left);
        groups.set(key + "#" + groups.size, { ...s, count: p });
        left -= p;
      }
    }
  }
  return { ...c, stacks: [...groups.values()] };
}

/** 丢弃零数量堆叠 */
export function prune(c: Container): Container {
  return { ...c, stacks: c.stacks.filter((s) => s.count > 0) };
}

// ============ 使用物品 ============

export interface UseOutcome {
  effects: Record<string, number>;
  /** 耐久消耗后的新容器 */
  container: Container;
  consumed: boolean;
  def: ItemDef;
}

/** 使用一件：返回效果并消耗（耐久类不消耗，只降耐久） */
export function use(c: Container, itemId: string): UseOutcome | null {
  const def = itemDef(itemId);
  if (!def || countOf(c, itemId) <= 0) return null;

  const effects: Record<string, number> = {};
  for (const [k, v] of Object.entries(def.effects ?? {})) effects[k] = v;

  // 有耐久的物品：不消耗数量，降低耐久
  if (def.durability > 0) {
    const stacks = c.stacks.map((s) => ({ ...s }));
    for (const s of stacks) {
      if (s.itemId !== itemId) continue;
      const item = itemDef(s.itemId);
      const step = Math.max(1, Math.round((item?.durability ?? 100) * 0.1));
      s.durability = Math.max(0, s.durability - step);
      break;
    }
    const broken = stacks.filter((s) => s.durability > 0 || (itemDef(s.itemId)?.durability ?? 0) === 0);
    // 耐久归零的堆叠减少一件
    const out: Stack[] = [];
    for (const s of stacks) {
      const item = itemDef(s.itemId);
      if (s.itemId === itemId && item && item.durability > 0 && s.durability <= 0) {
        if (s.count > 1) out.push({ ...s, count: s.count - 1, durability: item.durability });
        continue;
      }
      out.push(s);
    }
    void broken;
    return { effects, container: { ...c, stacks: out }, consumed: false, def };
  }

  // 无耐久：直接消耗一件
  const r = remove(c, itemId, 1);
  return { effects, container: r.container, consumed: true, def };
}

// ============ 采集与搜刮 ============

/** 确定性伪随机（mulberry32），保证采集可复现 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface LootTableEntry {
  itemId: string;
  /** 出现概率 0-1 */
  chance: number;
  min: number;
  max: number;
  quality?: Quality;
}

export interface LootTable {
  id: string;
  name: string;
  entries: LootTableEntry[];
}

/** 按掉落表产出 */
export function rollLoot(table: LootTable, seed: number): Array<{ id: string; n: number; quality: Quality }> {
  const rng = mulberry32(seed);
  const out: Array<{ id: string; n: number; quality: Quality }> = [];
  for (const e of table.entries) {
    if (rng() > e.chance) continue;
    const span = e.max - e.min;
    const n = e.min + Math.floor(rng() * (span + 1));
    if (n > 0) out.push({ id: e.itemId, n, quality: e.quality ?? "common" });
  }
  return out;
}

export const LOOT_TABLES: LootTable[] = [
  {
    id: "ruins",
    name: "城市废墟",
    entries: [
      { itemId: "canned_food", chance: 0.6, min: 1, max: 4 },
      { itemId: "water_bottle", chance: 0.5, min: 1, max: 3 },
      { itemId: "bandage", chance: 0.45, min: 1, max: 5 },
      { itemId: "electronics", chance: 0.35, min: 1, max: 3 },
      { itemId: "steel_bar", chance: 0.3, min: 1, max: 4 },
      { itemId: "ammo_9mm", chance: 0.25, min: 5, max: 20 },
      { itemId: "book", chance: 0.2, min: 1, max: 2 },
      { itemId: "data_chip", chance: 0.1, min: 1, max: 1, quality: "good" }
    ]
  },
  {
    id: "pharmacy",
    name: "药店废墟",
    entries: [
      { itemId: "painkiller", chance: 0.7, min: 2, max: 8 },
      { itemId: "antibiotic", chance: 0.4, min: 1, max: 3 },
      { itemId: "bandage", chance: 0.6, min: 2, max: 6 },
      { itemId: "stimulant", chance: 0.25, min: 1, max: 2 },
      { itemId: "rare_plant", chance: 0.15, min: 1, max: 2 }
    ]
  },
  {
    id: "workshop",
    name: "修车厂",
    entries: [
      { itemId: "toolbox", chance: 0.5, min: 1, max: 1 },
      { itemId: "steel_bar", chance: 0.6, min: 2, max: 6 },
      { itemId: "welding_kit", chance: 0.3, min: 1, max: 1 },
      { itemId: "machine_part", chance: 0.25, min: 1, max: 2 },
      { itemId: "ammo_shell", chance: 0.2, min: 3, max: 12 }
    ]
  },
  {
    id: "military",
    name: "军事据点",
    entries: [
      { itemId: "ammo_762", chance: 0.7, min: 20, max: 60 },
      { itemId: "armor_plate", chance: 0.35, min: 1, max: 3 },
      { itemId: "rifle", chance: 0.2, min: 1, max: 1, quality: "good" },
      { itemId: "gunpowder", chance: 0.4, min: 2, max: 6 },
      { itemId: "sensor", chance: 0.3, min: 1, max: 4 }
    ]
  },
  {
    id: "lab",
    name: "研究所",
    entries: [
      { itemId: "rare_catalyst", chance: 0.3, min: 1, max: 2 },
      { itemId: "gene_sample", chance: 0.2, min: 1, max: 1 },
      { itemId: "hormone_precursor", chance: 0.35, min: 1, max: 3 },
      { itemId: "electronics", chance: 0.5, min: 2, max: 5 },
      { itemId: "access_card", chance: 0.4, min: 1, max: 2 },
      { itemId: "gene_data", chance: 0.1, min: 1, max: 1, quality: "rare" }
    ]
  },
  {
    id: "residential",
    name: "居民区",
    entries: [
      { itemId: "canned_food", chance: 0.55, min: 1, max: 3 },
      { itemId: "dirty_water", chance: 0.4, min: 1, max: 4 },
      { itemId: "clothing", chance: 0, min: 0, max: 0 },
      { itemId: "candy", chance: 0.3, min: 1, max: 5 },
      { itemId: "chocolate", chance: 0.2, min: 1, max: 2 },
      { itemId: "jewelry", chance: 0.08, min: 1, max: 1, quality: "good" },
      { itemId: "photo", chance: 0.05, min: 1, max: 1 }
    ]
  },
  {
    id: "adult_shop",
    name: "成人用品店",
    entries: [
      { itemId: "dildo_double", chance: 0.6, min: 1, max: 2 },
      { itemId: "strap_on", chance: 0.5, min: 1, max: 2 },
      { itemId: "vibrator", chance: 0.5, min: 1, max: 2 },
      { itemId: "egg_vibe", chance: 0.4, min: 1, max: 3 },
      { itemId: "restraint_set", chance: 0.35, min: 1, max: 2 },
      { itemId: "lube", chance: 0.6, min: 1, max: 4 }
    ]
  }
];

export function lootTable(id: string): LootTable | undefined {
  return LOOT_TABLES.find((t) => t.id === id);
}

// ============ 合成 ============

export interface Recipe {
  id: string;
  output: { itemId: string; n: number };
  cost: Record<string, number>;
  /** 所需工时（游戏内小时） */
  hours: number;
  /** 需要解锁的科技节点 */
  requiresTech?: string[];
  /** 需要的工作台标签 */
  station?: string;
}

export const RECIPES: Recipe[] = [
  { id: "craft_bandage", output: { itemId: "bandage", n: 3 }, cost: { cloth: 1 }, hours: 0.5 },
  { id: "craft_water_filter", output: { itemId: "water_purifier", n: 1 }, cost: { activated_carbon: 2, pvc_pipe: 1 }, hours: 1 },
  { id: "craft_ammo_9mm", output: { itemId: "ammo_9mm", n: 20 }, cost: { gunpowder: 2, steel_bar: 1 }, hours: 2, requiresTech: ["shelter_power"], station: "ammo" },
  { id: "craft_ammo_762", output: { itemId: "ammo_762", n: 20 }, cost: { gunpowder: 3, steel_bar: 2 }, hours: 2.5, requiresTech: ["shelter_power"], station: "ammo" },
  { id: "craft_painkiller", output: { itemId: "painkiller", n: 5 }, cost: { rare_plant: 1, alcohol: 1 }, hours: 2, requiresTech: ["shelter_medical"], station: "lab" },
  { id: "craft_antibiotic", output: { itemId: "antibiotic", n: 3 }, cost: { rare_plant: 2, alcohol: 2 }, hours: 4, requiresTech: ["shelter_medical"], station: "lab" },
  { id: "craft_futa_rec", output: { itemId: "futa_recreational", n: 2 }, cost: { rare_plant: 2, hormone_precursor: 2 }, hours: 6, requiresTech: ["shelter_medical"], station: "lab" },
  { id: "craft_futa_preg", output: { itemId: "futa_pregnant", n: 1 }, cost: { rare_catalyst: 2, hormone_precursor: 3, gene_sample: 1 }, hours: 12, requiresTech: ["shelter_medical"], station: "lab" },
  { id: "craft_stimulant", output: { itemId: "stimulant", n: 3 }, cost: { rare_plant: 3, coffee: 2 }, hours: 3, requiresTech: ["shelter_medical"], station: "lab" },
  { id: "craft_lube", output: { itemId: "lube", n: 4 }, cost: { alcohol: 1 }, hours: 1 }
];

export function recipeById(id: string): Recipe | undefined {
  return RECIPES.find((r) => r.id === id);
}

export interface CraftCheck {
  ok: boolean;
  missing: Record<string, number>;
  missingTech: string[];
}

export function canCraft(c: Container, recipe: Recipe, unlockedTech: string[]): CraftCheck {
  const missing = missingFor(c, recipe.cost);
  const missingTech = (recipe.requiresTech ?? []).filter((t) => !unlockedTech.includes(t));
  return { ok: Object.keys(missing).length === 0 && missingTech.length === 0, missing, missingTech };
}

export function craft(c: Container, recipe: Recipe, unlockedTech: string[]): { container: Container; ok: boolean; missing: Record<string, number>; missingTech: string[] } {
  const check = canCraft(c, recipe, unlockedTech);
  if (!check.ok) return { container: c, ok: false, missing: check.missing, missingTech: check.missingTech };
  const sp = spend(c, recipe.cost);
  const a = add(sp.container, recipe.output.itemId, recipe.output.n);
  return { container: a.container, ok: true, missing: {}, missingTech: [] };
}

// ============ 序列化 ============

export interface ContainerJSON {
  stacks: Array<{ itemId: string; count: number; durability: number; quality: Quality }>;
  maxWeight: number | null;
  maxSlots: number | null;
}

export function containerToJSON(c: Container): ContainerJSON {
  return {
    stacks: c.stacks.map((s) => ({ itemId: s.itemId, count: s.count, durability: s.durability, quality: s.quality })),
    maxWeight: c.maxWeight === Infinity ? null : c.maxWeight,
    maxSlots: c.maxSlots === Infinity ? null : c.maxSlots
  };
}

export function containerFromJSON(j: ContainerJSON | null | undefined, fallbackWeight = 40, fallbackSlots = 30): Container {
  if (!j) return newContainer(fallbackWeight, fallbackSlots);
  const stacks = (j.stacks ?? [])
    .filter((s) => itemDef(s.itemId) && s.count > 0)
    .map((s) => ({ itemId: s.itemId, count: s.count, durability: s.durability, quality: s.quality ?? "common" }));
  return {
    stacks,
    maxWeight: j.maxWeight === null || j.maxWeight === undefined ? Infinity : j.maxWeight,
    maxSlots: j.maxSlots === null || j.maxSlots === undefined ? Infinity : j.maxSlots
  };
}

/** 摘要文本 */
export function describeContainer(c: Container): string {
  if (c.stacks.length === 0) return "（空）";
  return c.stacks
    .map((s) => {
      const def = itemDef(s.itemId);
      const q = s.quality === "common" ? "" : QUALITY_LABEL[s.quality];
      return `${def?.name ?? s.itemId}${q ? "(" + q + ")" : ""}×${s.count}`;
    })
    .join("　");
}

/** 按分类归组，供 UI 显示 */
export function groupByCategory(c: Container): Record<ItemCategory, Stack[]> {
  const out = {} as Record<ItemCategory, Stack[]>;
  for (const s of c.stacks) {
    const def = itemDef(s.itemId);
    if (!def) continue;
    (out[def.category] ??= []).push(s);
  }
  return out;
}