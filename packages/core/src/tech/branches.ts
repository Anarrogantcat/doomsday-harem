/**
 * 八条科技分支的完整节点表。
 * 与设计文档一一对应：避难所 / 远征 / 自我 / 防御 / 机器人 / 能源 / 制药 / 寿命。
 */

export type BranchId =
  | "shelter" | "expedition" | "self" | "defense"
  | "robot" | "energy" | "pharma" | "longevity";

export interface TechNode {
  id: string;
  name: string;
  tier: number;
  /** 前置节点 id */
  requires: string[];
  /** 消耗：资源名 → 数量 */
  cost: Record<string, number>;
  /** 研究工时（游戏内小时） */
  hours: number;
  /** 效果描述 */
  effect: string;
  /** 数值加成，键为效果名 */
  bonus?: Record<string, number>;
}

export interface Branch {
  id: BranchId;
  name: string;
  description: string;
  nodes: TechNode[];
}

export const BRANCH_NAMES: Record<BranchId, string> = {
  shelter: "避难所科技",
  expedition: "远征科技",
  self: "自我科技",
  defense: "防御科技",
  robot: "机器人科技",
  energy: "能源科技",
  pharma: "制药科技",
  longevity: "寿命科技"
};

const n = (
  id: string, name: string, tier: number, requires: string[],
  cost: Record<string, number>, hours: number, effect: string,
  bonus?: Record<string, number>
): TechNode => ({ id, name, tier, requires, cost, hours, effect, bonus });

// ============ 避难所 ============
const shelter: TechNode[] = [
  n("shelter_power", "电力基础", 1, [], { "铜线": 10, "磁铁": 5 }, 4, "安全屋通电（照明/冰箱/充电）"),
  n("shelter_water", "简易水源", 1, [], { "PVC管": 20, "滤网": 5 }, 4, "雨天集水 + 初级过滤"),
  n("shelter_vent", "通风系统", 1, [], { "风扇": 3, "管道": 10 }, 3, "避难所基础空气循环"),
  n("shelter_reinforce", "加固结构", 2, ["shelter_power"], { "水泥": 30, "钢筋": 20 }, 8, "外墙加固，夜间遇袭概率 -30%", { raidReduction: 0.30 }),
  n("shelter_purify", "净水系统", 2, ["shelter_water"], { "活性炭": 10, "泵": 2 }, 8, "日产量 100L 洁净水", { waterPerDay: 100 }),
  n("shelter_storage", "储物优化", 2, ["shelter_water"], { "金属架": 15 }, 6, "仓库容量 ×2", { storageMult: 2 }),
  n("shelter_greenhouse", "温室", 3, ["shelter_purify"], { "玻璃": 20, "LED灯": 10 }, 14, "水培/土培，全年产粮", { foodSelfSufficient: 1 }),
  n("shelter_medical", "医疗站", 3, ["shelter_power"], { "药品": 20, "手术器械": 5 }, 14, "可做基础手术、处理重伤"),
  n("shelter_private", "专属空间", 3, ["shelter_medical"], { "隔音材料": 10, "定制家具": 5 }, 10, "解锁后宫集体活动场景", { hSceneUnlock: 1 }),
  n("shelter_auto_farm", "自动化种植", 4, ["shelter_greenhouse"], { "传感器": 10, "自动灌溉": 1 }, 20, "产出 +50%，人力 -80%", { foodMult: 1.5 }),
  n("shelter_reload", "弹药复装台", 4, ["shelter_medical"], { "机床": 1, "模具": 5 }, 18, "自制弹药"),
  n("shelter_harem_dorm", "后宫宿舍", 4, ["shelter_private"], { "装饰": 30, "私密隔间": 8 }, 24, "同伴容量 +8，心情恢复加速", { haremCap: 8 }),
  n("shelter_closed_loop", "封闭循环", 5, ["shelter_auto_farm"], { "生物过滤器": 5, "AI控制器": 1 }, 32, "空气/水/食物完全闭环"),
  n("shelter_factory", "地下工厂", 6, ["shelter_reload"], { "3D打印机": 1, "CNC机床": 1 }, 40, "可加工任意中级以下装备"),
  n("shelter_cryo", "冷冻休眠舱", 6, ["shelter_closed_loop"], { "冷却系统": 3, "医疗监控": 1 }, 36, "同伴濒死可冷冻，后期复活", { cryoSlots: 4 }),
  n("shelter_fortress", "要塞化", 7, ["shelter_factory", "shelter_harem_dorm"], { "合金装甲": 50, "自动炮塔": 2 }, 60, "抵御军队级攻击"),
  n("shelter_clone", "克隆实验室", 7, ["shelter_cryo"], { "DNA分析仪": 1, "培养舱": 3 }, 64, "食物无限 + 克隆动植物"),

  // ============ 资源生产体系 ============
  n("prod_scrap_sorter", "废料分拣线", 2, ["shelter_storage"], { "传送带": 4, "筛网": 6, "电机": 2 }, 16, "把搜刮回来的杂料自动分类", { autoSort: 1 }),
  n("prod_smelter", "小型熔炉", 2, ["shelter_power"], { "耐火砖": 20, "鼓风机": 1, "坩埚": 2 }, 20, "废金属重熔成钢锭", { smelter: 1 }),
  n("prod_water_pump", "水泵站", 2, ["shelter_purify"], { "水泵": 2, "管道": 20, "阀门": 4 }, 14, "从溪谷/蓄水层持续抽水", { waterPump: 1 }),
  n("prod_sawmill", "锯木工位", 2, ["shelter_power"], { "圆锯": 1, "电机": 1, "导轨": 3 }, 12, "原木加工成板材", { sawmill: 1 }),

  n("prod_greenhouse_auto", "自动温室", 4, ["shelter_auto_farm"], { "温室骨架": 6, "灌溉系统": 1, "补光灯": 12 }, 26, "无需人力，日产蔬菜", { foodPerDay: 12 }),
  n("prod_mushroom", "菌菇房", 3, ["shelter_greenhouse"], { "菌架": 8, "湿度控制": 1 }, 18, "废弃有机物转蛋白", { mushroomFarm: 1 }),
  n("prod_fish_tank", "循环鱼池", 4, ["prod_mushroom"], { "水箱": 4, "过滤泵": 2, "饵料": 20 }, 24, "室内养鱼，蛋白自给", { fishFarm: 1 }),
  n("prod_hydroponic", "水培塔", 5, ["prod_greenhouse_auto"], { "水培架": 12, "营养液": 30, "泵": 2 }, 34, "垂直种植，产量 ×2", { hydroponic: 2 }),
  n("prod_hydroponic_up", "多层水培", 6, ["prod_hydroponic"], { "水培架": 30, "补光阵列": 1 }, 46, "往上长，占地不变产量 ×3", { hydroponic3: 3 }),

  n("prod_machine_basic", "基础机床组", 3, ["shelter_power"], { "车床": 1, "钻床": 1, "台钳": 2 }, 22, "加工零件与简单部件", { machining: 1 }),
  n("prod_cnc", "数控加工中心", 5, ["prod_machine_basic"], { "CNC": 1, "控制电脑": 1, "刀具组": 6 }, 40, "高精度零件，装备品质 +1", { cnc: 1 }),
  n("prod_3dprint", "3D 打印车间", 5, ["prod_machine_basic"], { "3D打印机": 2, "耗材": 40 }, 36, "塑料/树脂件快速成型", { printer3d: 1 }),
  n("prod_metal_print", "金属烧结打印", 7, ["prod_cnc", "prod_3dprint"], { "金属打印机": 1, "激光器": 1 }, 62, "直接打印金属零件，省料", { metalPrint: 1 }),
  n("prod_assembly", "装配线", 4, ["prod_machine_basic"], { "传送带": 10, "机械臂": 2, "工装夹具": 8 }, 30, "批量生产，速度 +80%", { assemblyLine: 0.8 }),
  n("prod_assembly_auto", "无人装配车间", 6, ["prod_assembly", "rob_repair_arm"], { "工业机械臂": 6, "视觉识别": 1, "调度软件": 1 }, 56, "全自动，产能再 +150%", { autoAssembly: 1.5 }),
  n("prod_quality", "质量管控", 5, ["prod_assembly"], { "检测仪": 3, "标准件": 20 }, 26, "出品质检，废品率 -80%", { qc: 0.8 }),
  n("prod_recycle", "材料回收", 4, ["prod_scrap_sorter"], { "破碎机": 1, "分选机": 1, "熔炉": 1 }, 28, "废品回收再利用率 70%", { recycle: 0.7 }),

  n("prod_ammo_line", "弹药生产线", 5, ["shelter_reload", "prod_assembly"], { "装填机": 1, "模具组": 4, "火药": 40 }, 38, "多种口径弹药自产", { ammoLine: 1 }),
  n("prod_gun_smith", "枪械工坊", 6, ["prod_cnc", "prod_ammo_line"], { "精密机床": 1, "枪管料": 10 }, 52, "可造与改装枪械", { gunsmith: 1 }),
  n("prod_armor_line", "装甲生产线", 7, ["prod_metal_print"], { "轧机": 1, "热处理炉": 1, "装甲板": 20 }, 54, "批量生产装甲板与护具", { armorLine: 1 }),
  n("prod_electronics", "电子车间", 5, ["prod_3dprint"], { "焊接台": 2, "示波器": 1, "元件盒": 10 }, 34, "电路板与传感器自产", { electronicsShop: 1 }),
  n("prod_chip", "芯片蚀刻间", 7, ["prod_electronics"], { "蚀刻设备": 1, "无尘柜": 1, "晶圆": 20 }, 68, "自产芯片，高级设备不再卡脖子", { chipFab: 1 }),

  n("prod_textile", "纺织车间", 2, ["shelter_power"], { "织机": 2, "纺轮": 4 }, 14, "布料与绳索自产", { textile: 1 }),
  n("prod_tailor", "制衣工位", 3, ["prod_textile"], { "缝纫机": 2, "剪裁台": 1 }, 16, "服装制作与修补", { tailor: 1 }),
  n("prod_chem_lab", "化工车间", 5, ["prod_smelter"], { "反应釜": 2, "蒸馏塔": 1, "原料": 40 }, 42, "酸碱、溶剂、火药原料自产", { chemLab: 1 }),
  n("prod_pharma_line", "药品生产线", 6, ["prod_chem_lab", "shelter_medical"], { "压片机": 1, "灌装机": 1, "培养箱": 2 }, 50, "常用药品批量自产", { pharmaLine: 1 }),
  n("prod_lens", "光学磨制", 6, ["prod_cnc"], { "研磨机": 1, "光学玻璃": 20 }, 40, "镜片与瞄准镜自产", { lensShop: 1 }),

  n("prod_robot_line", "机器人组装线", 7, ["prod_assembly_auto", "rob_repair_arm"], { "专用夹具": 12, "机械臂": 8, "控制柜": 1 }, 72, "量产巡逻与随行机器人", { robotLine: 1 }),
  n("prod_drone_line", "无人机产线", 7, ["prod_robot_line"], { "测试台": 2, "气压台": 1, "机体模": 8 }, 64, "自产各型无人机", { droneLine: 1 }),
  n("prod_vehicle_bay", "车辆改装间", 7, ["prod_armor_line"], { "举升机": 1, "焊接台": 2, "改装件": 20 }, 48, "房车与皮车改装", { vehicleBay: 1 }),

  n("prod_mining_rig", "采矿机组", 5, ["prod_smelter"], { "凿岩机": 1, "传送带": 8, "矿车": 4 }, 44, "矿洞自动采矿", { miningRig: 1 }),
  n("prod_quarry_auto", "自动碎石线", 5, ["prod_mining_rig"], { "颚式破碎机": 1, "筛分机": 2 }, 40, "石料与砂石量产", { quarryAuto: 1 }),
  n("prod_oil_extract", "油脂提取", 4, ["prod_smelter"], { "压榨机": 1, "储罐": 2 }, 30, "废弃油脂转生物柴油原料", { oilExtract: 1 }),
  n("prod_logging", "采伐机械", 3, ["prod_sawmill"], { "链锯": 4, "集材架": 1 }, 20, "林地自动采伐", { logging: 1 }),

  n("prod_conveyor_net", "传送网", 5, ["prod_assembly"], { "传送带": 30, "转向机": 8 }, 36, "各车间物料自动流转", { conveyorNet: 1 }),
  n("prod_storage_auto", "自动立体仓", 6, ["prod_conveyor_net", "shelter_storage"], { "货架": 40, "堆垛机": 2, "系统": 1 }, 48, "库存自动管理，容量 ×3", { autoWarehouse: 3 }),
  n("prod_mes", "生产管理系统", 7, ["prod_conveyor_net", "prod_recycle"], { "MES 软件": 1, "传感器网": 1 }, 58, "AI 排产，全厂产能 +25%", { mesBonus: 0.25 }),
  n("prod_fully_auto", "全自动基地", 8, ["prod_mes", "prod_robot_line", "en_off_grid"], { "总控系统": 1, "冗余产线": 1 }, 110, "物资完全自给，可脱离外部搜刮", { fullyAuto: 1 }),

  // ============ 生产机器人 ============
  n("prod_bot_hauler", "搬运机器人", 4, ["rob_sentry"], { "底盘": 2, "货斗": 2 }, 26, "车间内自动搬料", { haulBots: 2 }),
  n("prod_bot_welder", "焊接机器人", 5, ["prod_bot_hauler"], { "焊接臂": 2, "控制柜": 1 }, 34, "自动焊接，比人快且稳", { weldBots: 2 }),
  n("prod_bot_assembler", "装配机器人", 6, ["prod_bot_welder", "prod_assembly"], { "装配臂": 4, "视觉系统": 1 }, 46, "自动装配，24 小时不停", { assemblyBots: 4 }),
  n("prod_bot_painter", "喷涂机器人", 5, ["prod_bot_welder"], { "喷涂臂": 1, "漆料": 20 }, 28, "防腐与伪装涂装", { paintBots: 1 }),
  n("prod_bot_inspector", "质检机器人", 6, ["prod_quality"], { "检测臂": 2, "视觉系统": 1 }, 32, "自动全检，不放过次品", { inspectBots: 2 }),
  n("prod_bot_harvester", "采收机器人", 5, ["prod_greenhouse_auto"], { "采摘臂": 2, "识别模块": 1 }, 30, "温室自动采摘与分拣", { harvestBots: 2 }),
  n("prod_bot_miner", "采矿机器人", 6, ["prod_mining_rig"], { "凿岩臂": 1, "装载斗": 1 }, 48, "矿洞无人采矿", { minerBots: 1 }),
  n("prod_bot_cook", "厨房机器人", 5, ["prod_bot_cleaner"], { "料理臂": 2, "菜谱库": 1 }, 26, "自动备餐，解放人力", { cookBots: 2 }),
  n("prod_bot_cleaner", "清洁机器人", 3, ["rob_monitor"], { "清扫机构": 1, "滤芯": 4 }, 16, "基地日常清洁", { cleanerBots: 2 }),
  n("prod_bot_swarm_work", "蜂群作业机", 8, ["prod_bot_assembler", "rob_swarm_micro"], { "微型机架": 12, "协同芯片": 1 }, 74, "十几台小机协同作业", { workSwarm: 12 })
];

// ============ 远征（房车） ============
const expedition: TechNode[] = [
  n("exp_solar", "车顶太阳能板", 1, [], { "光伏板": 4, "电池": 2 }, 4, "日发电 2kWh", { powerPerDay: 2 }),
  n("exp_toolbox", "车载工具箱", 1, [], { "工具套装": 1, "备胎": 2 }, 3, "房车可自行维修"),
  n("exp_storage", "储物扩容", 1, [], { "货架": 5, "捆扎带": 10 }, 3, "储物容量 +50%", { storageMult: 1.5 }),
  n("exp_fueltank", "副油箱", 2, ["exp_toolbox"], { "油箱": 2, "油管": 1 }, 6, "续航 +50%（900km）", { rangeMult: 1.5 }),
  n("exp_armor1", "简易装甲 B1", 2, ["exp_storage"], { "钢板": 10 }, 8, "防小口径手枪 / 丧尸撕咬", { armor: 1 }),
  n("exp_weaponrack", "车内武器架", 2, ["exp_armor1"], { "枪架": 2, "锁扣": 4 }, 5, "固定存放 2 把长枪", { weaponSlots: 2 }),
  n("exp_armor4", "装甲升级 B4", 3, ["exp_armor1"], { "复合装甲板": 15 }, 14, "防步枪射击，基础防爆", { armor: 4 }),
  n("exp_kitchen", "厨房改造", 3, ["exp_fueltank"], { "炉灶": 1, "冰箱": 1 }, 10, "可做热食，支持 4 人饮食"),
  n("exp_comm", "通讯终端", 3, ["exp_solar"], { "电台": 1, "显示终端": 1 }, 12, "远征途中与基地 AI 联系"),
  n("exp_armor6", "重型装甲 B6+", 4, ["exp_armor4"], { "军用装甲套件": 1 }, 24, "防弹 + 防爆", { armor: 6 }),
  n("exp_medical", "医疗舱改装", 4, ["exp_kitchen"], { "折叠手术台": 1, "药品柜": 1 }, 18, "远征中可中级医疗"),
  n("exp_battery", "房车电池组", 4, ["exp_comm", "exp_solar"], { "高容量电池": 8 }, 20, "纯电 100km，静默 40dB", { silentRange: 100 }),
  n("exp_private", "房车私室", 4, ["exp_armor6", "exp_battery"], { "隔音材料": 10, "折叠床": 1 }, 16, "远征途中可触发 H 事件", { expeditionH: 1 }),
  n("exp_topgun", "顶部武器架", 5, ["exp_armor6"], { "舱口改造": 1, "旋转底座": 1 }, 22, "车顶架设机枪/榴弹（人工）"),
  n("exp_radar", "探测雷达", 5, ["exp_battery"], { "雷达模块": 1, "显示屏": 1 }, 20, "扫描 3km 内敌情/资源", { radarKm: 3 }),
  n("exp_watertank", "备用水箱", 5, ["exp_medical"], { "水箱": 2, "水泵": 1 }, 12, "200L 饮水自给"),
  n("exp_rcws", "遥控武器站", 6, ["exp_topgun"], { "遥控系统": 1, "机枪": 1 }, 34, "车内操控车顶武器", { remoteWeapon: 1 }),
  n("exp_terrain", "地形适应套件", 6, ["exp_radar"], { "绞盘": 1, "涉水喉": 1, "宽胎": 4 }, 26, "可通过泥沼/浅河/陡坡"),
  n("exp_camp", "扩展营地", 6, ["exp_watertank"], { "扩展帐篷": 1, "照明": 4 }, 18, "停车展开 30㎡ 侧帐"),
  n("exp_command", "战术指挥中心", 7, ["exp_rcws", "exp_terrain"], { "全息导航": 1, "AI战术模块": 1 }, 44, "战术规划效率 +50%", { tacticsBonus: 0.5 }),
  n("exp_autoload", "自动弹药装填", 7, ["exp_camp"], { "联动弹链": 1, "供弹机": 1 }, 30, "持续射击时间 ×3", { sustainedFire: 3 }),
  n("exp_drone", "微型无人机挂载", 8, ["exp_command"], { "侦察无人机": 2, "充电舱": 1 }, 48, "携带 2 架侦察无人机", { drones: 2 }),
  n("exp_ultimate", "终极改装", 8, ["exp_command", "exp_autoload", "exp_drone"], { "顶级材料": 10, "稀有元件": 5 }, 72, "续航 1500km / B7 装甲 / 30dB", { range: 1500, armor: 7 })
];

// ============ 自我 ============
const self: TechNode[] = [
  n("self_cardio", "心肺强化", 1, [], { "计时训练": 1 }, 6, "体力上限 +20%，消耗 -15%", { staminaMax: 0.20 }),
  n("self_strength", "力量训练", 1, [], { "自制哑铃": 1, "引体架": 1 }, 6, "近战伤害 +25%，负重 +15", { meleeDmg: 0.25 }),
  n("self_senses", "感官敏锐", 1, [], { "冥想练习": 1 }, 5, "夜视 +30%，听力 +50%", { nightVision: 0.30 }),
  n("self_heal", "自愈加速", 2, ["self_cardio"], { "营养剂": 5 }, 10, "愈合 ×2，感染率 -50%", { healMult: 2 }),
  n("self_combat", "战斗本能", 2, ["self_strength"], { "木人桩": 1 }, 10, "闪避 +20%，反击 +15%", { dodge: 0.20 }),
  n("self_intuition", "直觉强化", 2, ["self_senses"], { "预知日记": 1 }, 12, "预知预警 3 秒 → 6 秒", { premonitionSec: 6 }),
  n("self_hormone", "荷尔蒙控制", 3, ["self_heal"], { "生物反馈训练": 1 }, 16, "可切换外观形态（仅 H 场景）", { hormoneControl: 1 }),
  n("self_adrenal", "肾上腺爆发", 3, ["self_combat"], { "心理训练": 1 }, 18, "15 秒全属性 ×2，冷却 1h", { burstMult: 2 }),
  n("self_gaze", "预知凝视", 3, ["self_intuition"], { "专注训练": 1 }, 20, "看清 5 秒内攻击轨迹，闪避 3 次", { precogDodge: 3 }),
  n("self_toughness", "韧性体质", 4, ["self_hormone"], { "抗毒训练": 1 }, 24, "负面状态 -40%，抵抗 +30%", { resist: 0.30 }),
  n("self_sustain", "连续作战", 4, ["self_adrenal"], { "体能循环": 1 }, 22, "爆发后疲惫减半", { burstRecovery: 0.5 }),
  n("self_fate", "命运模糊", 4, ["self_gaze"], { "意识训练": 1 }, 26, "关键选择前出现预感提示", { fateHint: 1 }),
  n("self_precise", "精准打击", 5, ["self_toughness"], { "穴位研究": 1 }, 30, "暴击率 +30%，暴伤 ×2", { critRate: 0.30, critDmg: 2 }),
  n("self_charm", "激素魅惑", 5, ["self_sustain"], { "信息素控制": 1 }, 28, "对人形敌人魅惑，停滞 1 回合", { charm: 1 }),
  n("self_simulate", "危机预演", 5, ["self_fate"], { "预知训练": 1 }, 32, "预演未来 10 分钟，冷却 12h", { simulateMin: 10 }),
  n("self_breakthrough", "极限突破", 6, ["self_precise", "self_charm"], { "身体改造手术": 1 }, 48, "全属性上限 +100", { statCap: 100 }),
  n("self_genestable", "基因稳定", 6, ["self_simulate"], { "DNA修正": 1, "细胞活化": 1 }, 46, "衰老 -50%，疾病免疫 +90%", { aging: -0.5 }),
  n("self_futanari", "扶她完全体", 7, ["self_breakthrough", "self_genestable"], { "深层意识整合": 1 }, 64, "H 场景全部解锁", { hFull: 1 }),
  n("self_precog_eye", "预知之眼", 7, ["self_futanari"], { "觉醒仪式": 1 }, 68, "预见 24h 内事件，冷却 24h", { precogHours: 24 }),
  n("self_transcend", "超越者", 8, ["self_precog_eye"], { "终极试炼": 1 }, 96, "全属性 +200%，预知冷却减半", { allStats: 2 })
];

// ============ 防御 ============
const defense: TechNode[] = [
  n("def_lookout", "瞭望哨", 1, [], { "木材": 20, "绳子": 5 }, 4, "树顶平台，视野 +300m"),
  n("def_trap", "陷阱入门", 1, [], { "铁丝": 10, "尖刺": 20 }, 4, "绊索陷阱 + 尖刺坑"),
  n("def_fence", "木栅栏", 1, [], { "木材": 50, "石料": 30 }, 6, "安全屋周边木栅栏"),
  n("def_chevaux", "拒马阵", 2, ["def_lookout"], { "削尖木桩": 20, "铁丝网": 10 }, 8, "阻挡冲锋"),
  n("def_trench", "壕沟挖掘", 2, ["def_trap"], { "铲子": 5 }, 10, "壕沟 + 尖刺底"),
  n("def_concrete", "混凝土墙", 2, ["def_fence"], { "水泥": 40, "钢筋": 20 }, 12, "高 2m 混凝土墙"),
  n("def_bunker", "射击掩体", 3, ["def_chevaux", "def_trench"], { "沙袋": 20, "覆土": 10 }, 14, "4 个半地下掩体"),
  n("def_mg", "手动哨戒枪", 3, ["def_concrete"], { "轻机枪": 1, "三角架": 1 }, 16, "屋顶固定机枪，人工瞄准"),
  n("def_caltrop", "铁蒺藜带", 3, ["def_trench"], { "铁钉": 200, "铁丝": 20 }, 8, "刺破轮胎/脚底"),
  n("def_wall_high", "围墙加高", 4, ["def_concrete", "def_caltrop"], { "砖石": 40, "水泥": 20 }, 18, "高 3m，顶部碎玻璃"),
  n("def_mine", "地雷制造", 4, ["def_caltrop"], { "铁皮罐": 10, "火药": 10 }, 20, "手工绊线地雷"),
  n("def_rolling", "滚石机关", 4, ["def_bunker"], { "大石": 5, "杠杆": 2 }, 12, "避难所入口滚石封路"),
  n("def_auto_mg", "自动哨戒枪", 4, ["def_mg"], { "运动传感器": 2, "伺服": 2 }, 26, "CORE 瞄准，自动射击", { autoAim: 1 }),
  n("def_twin_mg", "双人机枪阵地", 5, ["def_mg", "def_wall_high"], { "重机枪": 1, "备用枪管": 2 }, 24, "2 人操作，持续火力"),
  n("def_roster", "轮换排班表", 5, ["def_mine"], { "纸笔": 1, "哨子": 1 }, 6, "预警效率 +30%", { alertBonus: 0.30 }),
  n("def_fire_trap", "燃烧陷阱", 5, ["def_rolling"], { "燃油": 20, "玻璃瓶": 10 }, 16, "壕沟内火墙阻敌"),
  n("def_turret", "安全屋炮塔", 5, ["def_twin_mg"], { "炮塔基座": 1, "重机枪": 1 }, 32, "屋顶遥控炮塔，180° 覆盖", { turret: 1 }),
  n("def_camo", "伪装进阶", 5, ["def_wall_high"], { "全息伪装网": 1, "地形涂层": 5 }, 20, "无人机航拍不可辨", { camouflage: 1 }),
  n("def_ammo_depot", "地下弹药库", 6, ["def_turret"], { "防水箱": 10, "货架": 5 }, 22, "弹药不受潮，容量 ×2"),
  n("def_network", "自动防御网络", 6, ["def_auto_mg", "def_roster"], { "AI火控": 1, "传感器网络": 1 }, 44, "多武器联动，自动识别敌友", { autoNetwork: 1 }),
  n("def_hangar", "地下机库", 6, ["def_camo"], { "升降平台": 1, "伪装门": 1 }, 40, "房车可停入山体"),
  n("def_drone3", "无人机 ×3", 7, ["def_network"], { "侦察无人机": 3 }, 42, "手动遥控侦察"),
  n("def_core_armor", "要塞核心装甲", 7, ["def_hangar"], { "强化装甲": 50 }, 56, "抵御导弹/重炮"),
  n("def_swarm", "无人机蜂群", 8, ["def_drone3", "def_core_armor"], { "攻击无人机": 10, "自主AI": 1 }, 72, "10 架自动巡逻 + 攻击", { swarm: 10 }),
  n("def_shield", "能量护盾", 8, ["def_core_armor", "def_swarm"], { "水晶核心": 3, "能源过载器": 1 }, 88, "60 秒能量屏障", { shieldSec: 60 }),

  // ---- 自动炮台 ----
  n("def_turret_mg762", "7.62mm 机枪塔", 5, ["def_turret"], { "炮塔基座": 1, "轻机枪": 1, "伺服": 2 }, 28, "通用机枪塔，性价比最高", { turret762: 1 }),
  n("def_turret_mg127", "12.7mm 重机枪", 6, ["def_turret_mg762"], { "炮塔基座": 1, "重机枪": 1, "重型伺服": 2 }, 36, "大口径，能打穿轻型装甲", { turret127: 1 }),
  n("def_turret_grenade", "榴弹发射台", 6, ["def_turret_mg127"], { "炮塔基座": 1, "榴弹发射器": 1 }, 40, "面杀伤，对付成群目标", { turretGrenade: 1 }),
  n("def_turret_flame", "火焰喷射塔", 6, ["def_fire_trap"], { "喷火器": 1, "燃油罐": 2 }, 38, "近距离清场，克制丧尸潮", { turretFlame: 1 }),
  n("def_turret_taser", "电击塔", 6, ["def_auto_mg"], { "高压发生器": 1, "电容组": 2 }, 34, "电击使目标麻痹，不用弹药", { turretTaser: 1 }),
  n("def_turret_laser", "激光切割塔", 8, ["def_network"], { "激光发生器": 1, "聚焦镜组": 2 }, 76, "高精度持续伤害，弹药无限", { turretLaser: 1 }),
  n("def_turret_emp", "电磁脉冲塔", 8, ["def_turret_laser"], { "EMP 发生器": 1, "大电容": 3 }, 70, "瘫痪电子设备与机械敌人", { turretEMP: 1 }),
  n("def_turret_mortar", "迫击炮台", 7, ["def_turret_grenade"], { "迫击炮管": 1, "弹道计算机": 1 }, 54, "曲射，打击掩体后的目标", { turretMortar: 1 }),
  n("def_turret_tear", "催泪瓦斯塔", 6, ["def_turret_taser"], { "瓦斯罐": 4, "风机": 1 }, 30, "驱散人群，不致命（对付人类袭扰）", { turretTear: 1 }),
  n("def_turret_flechette", "钉刺弹发射器", 6, ["def_turret_mg762"], { "钉刺弹箱": 2, "发射机构": 1 }, 32, "近距离弹幕，杀伤面广", { turretFlechette: 1 }),
  n("def_turret_sonic", "声波震慑塔", 7, ["def_turret_tear"], { "声波发生器": 1, "功率放大": 2 }, 48, "大范围震慑，可驱赶兽群", { turretSonic: 1 }),
  n("def_turret_aa", "防空炮台", 8, ["def_turret_mortar"], { "防空炮": 1, "雷达联动": 1 }, 82, "对空火力，防无人机与飞行变异体", { turretAA: 1 }),

  // ---- 内层与核心防御 ----
  n("def_inner_gate", "内层隔离门", 6, ["def_network"], { "气密门": 2, "液压机构": 1 }, 36, "分区隔离，把敌人挡在通道里", { innerGate: 2 }),
  n("def_loophole", "射击孔", 6, ["def_inner_gate"], { "钢板": 20, "射孔套件": 6 }, 30, "掩体后还击，不减员", { loophole: 6 }),
  n("def_burner", "燃烧装置", 5, ["def_fire_trap"], { "燃油管": 2, "点火器": 1 }, 32, "走廊内点燃，封闭空间杀伤", { burner: 1 }),
  n("def_gas_valve", "毒气阀", 6, ["def_burner"], { "毒气罐": 4, "气阀": 2 }, 40, "封闭区投毒，需己方先撤离", { gasValve: 1 }),
  n("def_trap_corridor", "陷阱走廊", 6, ["def_loophole", "def_burner"], { "机关套件": 1, "传感器": 6 }, 46, "整条通道做成杀伤区", { trapCorridor: 1 }),
  n("def_zone_lock", "分区封锁", 6, ["def_inner_gate"], { "分区控制器": 1, "电磁锁": 8 }, 38, "失守时逐一封锁，不一次丢光", { zoneLock: 1 }),
  n("def_corridor_mg", "走廊机枪位", 6, ["def_loophole"], { "轻机枪": 2, "射击底座": 2 }, 34, "交叉火力封锁走廊", { corridorMG: 2 }),
  n("def_sound_seal", "隔音隔气层", 6, ["def_gas_valve"], { "隔音材料": 20, "密封条": 10 }, 28, "防毒气扩散，也隔绝声音", { soundSeal: 1 }),
  n("def_corridor_cam", "走廊摄像头", 6, ["def_network"], { "摄像头": 8, "线缆": 10 }, 26, "全程监控通道，无死角", { corridorCam: 8 }),
  n("def_power_cut", "紧急断电闸", 7, ["def_zone_lock"], { "断路器": 3, "机械闸": 1 }, 42, "遇袭时切断非必要电路，集中供电", { powerCut: 1 }),
  n("def_core_gate", "核心区门禁", 6, ["def_zone_lock"], { "生物识别": 1, "厚重金库门": 1 }, 44, "只有主角与 AI 能开", { coreGate: 1 }),
  n("def_cell_reinforce", "收容室加固", 6, ["def_core_gate"], { "强化墙板": 10, "独立锁": 1 }, 32, "关在里面的人跑不出来", { cellReinforce: 1 }),
  n("def_server_shield", "服务器防护", 7, ["def_core_gate"], { "法拉第笼": 1, "防火层": 1 }, 48, "保护 AI 机房，防电磁与火", { serverShield: 1 }),
  n("def_self_destruct", "自毁装置", 8, ["def_server_shield"], { "炸药套件": 10, "双人授权锁": 1 }, 90, "守不住时炸毁要塞，不给敌人留东西", { selfDestruct: 1 }),
  n("def_safe_nook", "人质暗格", 7, ["def_cell_reinforce"], { "暗门": 1, "隐蔽空间": 1 }, 40, "把家人藏起来，敌人搜不到", { safeNook: 1 }),

  // ---- 夜视与探测 ----
  n("def_lowlight", "微光夜视", 5, ["def_lookout"], { "夜视仪": 4, "光电管": 4 }, 24, "夜间岗哨可视，成本低", { defNightVision: 1 }),
  n("def_thermal", "热成像哨位", 6, ["def_lowlight"], { "热像仪": 4, "处理单元": 1 }, 34, "夜间发现热源，可穿烟尘", { defThermal: 1 }),
  n("def_sonar_pit", "声呐警戒坑", 6, ["def_thermal"], { "地音传感器": 8, "分析仪": 1 }, 36, "听脚步声，摸黑也能预警", { defSonar: 1 }),
  n("def_radar_net", "雷达预警网", 7, ["def_sonar_pit"], { "小型雷达": 4, "组网模块": 1 }, 56, "半径 5km 内提前发现来袭", { radarNet: 5 }),
  n("def_light_low", "定向低光灯", 5, ["def_lookout"], { "低光灯": 6, "遮光罩": 6 }, 18, "只照亮脚下一小块，不暴露位置", { lowLight: 6 }),
  n("def_blackout", "灯光管制", 5, ["def_light_low"], { "遮光帘": 20, "管制开关": 1 }, 16, "全要塞夜间熄灯，靠红外与夜视", { blackout: 1 })
];

// ============ 机器人 ============
const robot: TechNode[] = [
  n("rob_monitor", "自动监控终端", 3, [], { "摄像头": 5, "显示终端": 1 }, 12, "固定摄像头 + 画面分析报警（末日前已存在）"),
  n("rob_sentry", "哨兵机器人", 4, ["rob_monitor"], { "履带底盘": 1, "电池组": 1, "轻型装甲": 1 }, 26, "按预设路线巡逻 + 警报", { sentries: 1 }),
  n("rob_armed", "武装哨兵", 5, ["rob_sentry"], { "轻武器架": 1, "弹药联动": 1 }, 30, "加装轻机枪，按规则自动射击", { armedSentries: 1 }),
  n("rob_charger", "充电站", 5, ["rob_sentry"], { "充电桩": 2, "无线充电模块": 1 }, 16, "机器人自动回充"),
  n("rob_network", "哨兵网络", 6, ["rob_armed", "rob_charger"], { "机器人": 2, "通信模块": 1 }, 40, "3 台协同巡逻", { sentries: 3 }),
  n("rob_ai_interface", "特殊AI接口", 6, ["rob_network"], { "高算力服务器": 1, "特殊接口": 1 }, 48, "特殊AI入驻，获得移动载体（长出脚）", { aiMobile: 1 }),
  n("rob_possess", "附身模块", 7, ["rob_ai_interface"], { "全息投影": 1, "同步模块": 1 }, 44, "AI 意识投射到机器人，拟人互动", { possession: 1 }),
  n("rob_allterrain", "全地形底盘", 7, ["rob_possess"], { "四足机构": 1, "地形传感器": 4 }, 46, "废墟/林间/山地自由移动"),
  n("rob_body", "仿生身体", 8, ["rob_allterrain"], { "仿生骨架": 1, "人工皮肤": 1, "神经接口": 1 }, 96, "女性躯体，触觉/味觉/痛觉，AI 实体化", { aiBody: 1 }),
  n("rob_body_fertility", "生育模块", 8, ["rob_body"], { "生物子宫": 1, "激素模拟": 1 }, 52, "仿生身体可怀孕", { aiFertile: 1 }),

  // ---- 巡逻与警戒 ----
  n("rob_patrol_basic", "巡逻机器人", 4, ["rob_sentry"], { "履带底盘": 2, "电池组": 2 }, 30, "基地内固定路线巡逻 ×2", { patrolBots: 2 }),
  n("rob_uav_scout", "空中侦察无人机", 4, ["rob_monitor"], { "四旋翼框架": 1, "摄像头": 2, "电池": 1 }, 28, "空中巡逻，视野覆盖要塞外围", { aerialVision: 1 }),
  n("rob_dispatch", "巡逻调度中枢", 5, ["rob_patrol_basic", "rob_uav_scout"], { "调度软件": 1, "通信模块": 2 }, 36, "AI 统一调度巡逻单位，编队上限 +2", { patrolCoord: 1, squadCap: 2 }),
  n("rob_thermal", "红外热成像", 5, ["rob_uav_scout"], { "热成像模块": 2, "处理器": 1 }, 22, "夜间红外探测 60m，可穿透薄墙烟雾", { thermalRange: 60 }),
  n("rob_lowlight", "微光夜视仪", 5, ["rob_thermal"], { "光电倍增管": 2, "镜组": 1 }, 20, "极弱光下可视，与红外互补", { nightVision: 1 }),
  n("rob_heat_track", "热源追踪仪", 6, ["rob_thermal"], { "热源传感器": 4, "算法模块": 1 }, 30, "自动追踪热源移动，锁定潜行者", { heatTrack: 1 }),
  n("rob_sonar", "声呐探测阵", 6, ["rob_thermal"], { "声呐探头": 6, "处理器": 2 }, 34, "探测墙后与地下动静，无视黑暗", { sonarDetect: 1 }),
  n("rob_quad", "四足巡查机", 6, ["rob_sentry"], { "四足机构": 2, "地形传感器": 6 }, 44, "能走车开不进的地方", { allTerrainBot: 1 }),
  n("rob_drone_wire", "巡线固定翼", 5, ["rob_uav_scout"], { "固定翼框架": 1, "弹射架": 1 }, 26, "沿预设航线长距离巡视", { longRangePatrol: 1 }),
  n("rob_tether_guard", "系留值守机", 5, ["rob_uav_scout"], { "系留缆": 1, "升空平台": 1 }, 24, "缆绳供电，24 小时悬停不移位", { tetheredWatch: 1 }),
  n("rob_balloon", "浮空监视气球", 6, ["rob_tether_guard"], { "气球囊体": 2, "吊舱": 1 }, 30, "高空长时间视野", { balloonWatch: 1 }),
  n("rob_swarm_micro", "蜂群微型机", 7, ["rob_dispatch"], { "微型机架": 8, "集群芯片": 1 }, 52, "一次放出 8 台微型机", { microSwarm: 8 }),
  n("rob_tether_listen", "系留监听机", 6, ["rob_tether_guard"], { "监听阵列": 2, "线缆": 1 }, 28, "长时间悬停监听周边动静", { listenPost: 1 }),
  n("rob_flare_drop", "照明弹投放机", 6, ["rob_uav_scout"], { "投放机构": 1, "照明弹": 20 }, 26, "夜间投放照明弹", { flareDrop: 1 }),
  n("rob_jammer", "干扰信号机", 7, ["rob_dispatch"], { "干扰模块": 3, "天线": 2 }, 40, "压制敌方通讯与遥控引爆", { jammer: 1 }),
  n("rob_relay_air", "中继浮空平台", 7, ["rob_balloon"], { "中继模块": 2, "浮空平台": 1 }, 38, "升空做通讯中继", { airRelay: 1 }),
  n("rob_high_alt", "高空侦察机", 8, ["rob_relay_air"], { "高空机体": 1, "光学吊舱": 1 }, 60, "升限 12000m，看清整座城市", { highAltRecon: 1 }),
  n("rob_heavy_sentry", "重装哨戒机", 6, ["rob_armed"], { "重型底盘": 1, "重武器架": 1, "装甲板": 6 }, 42, "重甲重火力，镇守要塞入口", { heavySentry: 1 }),
  n("rob_kamikaze", "自爆追击机", 7, ["rob_heavy_sentry"], { "炸药包": 4, "冲刺机构": 1 }, 34, "追到目标后自毁引爆", { kamikaze: 1 }),
  n("rob_repair_arm", "自动维修臂", 6, ["rob_sentry"], { "机械臂": 2, "焊接模块": 1 }, 32, "损坏的机器与设施自动修", { autoRepair: 1 }),
  n("rob_mine_layer", "地雷布设机", 7, ["rob_repair_arm"], { "布设机构": 1, "地雷": 20 }, 36, "外出时自动布设雷区", { mineLayer: 1 }),
  n("rob_decoy", "诱饵假人机", 6, ["rob_sentry"], { "假人形架": 2, "加热片": 4 }, 24, "模拟人形热源引开敌人", { decoy: 1 }),
  n("rob_search_rescue", "搜救无人机", 6, ["rob_uav_scout"], { "生命探测仪": 1, "抓取机构": 1 }, 30, "搜救废墟下的人，回收物资", { searchRescue: 1 }),
  n("rob_smoke", "烟雾发生器", 6, ["rob_sentry"], { "发烟剂": 10, "风机": 1 }, 20, "释放烟幕掩护撤离或突入", { smokeScreen: 1 }),
  n("rob_spider", "蛛形攀壁机", 7, ["rob_quad"], { "攀附机构": 4, "吸附足": 8 }, 46, "爬墙贴顶，走没人想到的路", { wallCrawler: 1 }),
  n("rob_snake_pipe", "蛇形管道机", 7, ["rob_spider"], { "蛇形节段": 12, "柔性摄像头": 1 }, 42, "钻管道与通风井探查死角", { pipeCrawler: 1 }),
  n("rob_fixed_guard", "固定警戒机", 6, ["rob_monitor"], { "固定座": 4, "传感器": 4 }, 22, "装固定点的警戒哨", { fixedGuard: 1 }),
  n("rob_sonar_boat", "声呐探测艇", 7, ["rob_sonar"], { "浮体": 1, "声呐": 2 }, 38, "水面/水下探测", { sonarBoat: 1 }),
  n("rob_track_heavy", "履带重装机", 8, ["rob_heavy_sentry"], { "重履带": 1, "装甲板": 12, "重火力": 1 }, 64, "能推能撞能压，攻坚尖兵", { trackHeavy: 1 }),

  // ---- 随行探索 ----
  n("rob_exp_scout", "侦察无人机", 4, ["rob_uav_scout"], { "便携机体": 1, "标记模块": 1 }, 24, "随行：标记 2 格内敌人与物资", { expScout: 1 }),
  n("rob_exp_carry", "搬运无人机", 5, ["rob_exp_scout"], { "载货框架": 1, "吊索": 2 }, 26, "随行：额外载重 +60kg", { expCarry: 60 }),
  n("rob_exp_medic", "医疗无人机", 5, ["rob_exp_scout"], { "医疗模块": 1, "药剂箱": 1 }, 28, "随行：战斗中每 3 回合治疗 8", { expMedic: 8 }),
  n("rob_exp_escort", "护航无人机", 5, ["rob_exp_scout"], { "武器挂架": 1, "瞄准模块": 1 }, 30, "随行：每回合造成 6 点伤害", { expEscort: 6 }),
  n("rob_exp_light", "照明无人机", 4, ["rob_uav_scout"], { "探照模块": 1, "电池": 2 }, 18, "随行：夜战不受视野惩罚", { expLight: 1 }),
  n("rob_exp_relay", "通讯中继机", 5, ["rob_exp_scout"], { "中继模块": 1, "天线": 1 }, 26, "随行：8km 内保持基地联系", { expRelay: 8 }),
  n("rob_exp_collect", "采集无人机", 5, ["rob_exp_scout"], { "采集爪": 2, "分拣模块": 1 }, 26, "随行：自动搜刮，产出 +20%", { expCollect: 0.2 }),
  n("rob_exp_pathfinder", "探路机器人", 5, ["rob_exp_scout"], { "地形扫描仪": 1, "探雷器": 1 }, 28, "随行：先探陷阱与地形", { expPath: 1 }),
  n("rob_exp_escort_heavy", "重装护卫机", 6, ["rob_exp_escort"], { "重装甲板": 6, "护盾模块": 1 }, 44, "随行：跟随者伤害减免 +20%", { expEscortDr: 0.2 }),
  n("rob_exp_worker", "采集型作业机", 6, ["rob_exp_collect"], { "作业臂": 2, "破碎机构": 1 }, 38, "随行：外出时自动采集材料", { expWorker: 1 }),
  n("rob_exp_flock", "伴飞护卫群", 7, ["rob_exp_escort_heavy"], { "小型机架": 3, "集群模块": 1 }, 50, "随行：三机围成一圈护住跟随者", { expFlock: 3 }),
  n("rob_exp_sampler", "取样无人机", 6, ["rob_exp_scout"], { "取样机械臂": 1, "样本箱": 1 }, 32, "随行：取样，研究进度 +10%", { expSample: 0.1 }),
  n("rob_exp_mapper", "测绘无人机", 5, ["rob_exp_scout"], { "测绘相机": 1, "建模软件": 1 }, 28, "随行：飞过即探明整格地形", { expMap: 1 }),
  n("rob_exp_broadcast", "广播诱敌机", 6, ["rob_exp_scout"], { "扩音模块": 1, "定时器": 1 }, 26, "随行：播放声音把敌人引开", { expDecoy: 1 }),
  n("rob_exp_heat_decoy", "热诱饵无人机", 7, ["rob_exp_broadcast"], { "热源发生器": 1, "投放机构": 1 }, 40, "随行：投射热源吸引丧尸潮", { expHeatDecoy: 1 }),
  n("rob_exp_tow", "牵引拖救机", 6, ["rob_exp_carry"], { "牵引绞盘": 1, "抓取臂": 1 }, 34, "随行：把倒地同伴拖回安全区", { expTow: 1 }),
  n("rob_exp_hive", "孵化蜂群舱", 8, ["rob_exp_flock"], { "孵化舱": 1, "微型机架": 6 }, 58, "随行：随身投放 6 台微型机", { expHive: 6 }),
  n("rob_exp_underwater", "水下探查机", 7, ["rob_sonar_boat"], { "防水机体": 1, "推进器": 2 }, 42, "随行：江河湖海专用", { expUnderwater: 1 }),

  // ---- 空中航母 ----
  n("rob_carrier_hull", "无人母舰机体", 8, ["rob_high_alt"], { "运输机机体": 1, "导航系统": 1 }, 120, "载机 24 架，作战半径 210km", { carrierHull: 1 }),
  n("rob_carrier_scout", "舰载侦察机", 8, ["rob_carrier_hull"], { "舰载机体": 4, "光学吊舱": 4 }, 40, "舰载：全图探明", { carrierScout: 4 }),
  n("rob_carrier_attack", "舰载攻击机", 8, ["rob_carrier_hull"], { "舰载机体": 3, "挂弹架": 3 }, 44, "舰载：对地打击", { carrierAttack: 3 }),
  n("rob_carrier_escort", "舰载护航机", 8, ["rob_carrier_hull"], { "舰载机体": 2, "干扰模块": 2 }, 40, "舰载：空中掩护", { carrierEscort: 2 }),
  n("rob_carrier_relay", "舰载中继机", 8, ["rob_carrier_hull"], { "舰载机体": 2, "中继模块": 2 }, 38, "舰载：全城通讯不断联", { carrierRelay: 2 }),
  n("rob_carrier_rescue", "舰载救援机", 8, ["rob_carrier_hull"], { "舰载机体": 2, "救援吊舱": 2 }, 42, "舰载：投送药品与弹药", { carrierRescue: 2 }),
  n("rob_carrier_spotter", "舰载校射机", 8, ["rob_carrier_attack"], { "校射模块": 1, "观测吊舱": 1 }, 36, "舰载：为地面火力校正弹着点", { carrierSpotter: 1 }),
  n("rob_carrier_bomber", "舰载重型轰炸机", 9, ["rob_carrier_attack"], { "重型机体": 1, "炸弹舱": 1 }, 88, "舰载：大范围覆盖轰炸", { carrierBomber: 1 }),
  n("rob_carrier_ew", "舰载电子战机", 9, ["rob_carrier_escort"], { "电子战模块": 2, "大功率天线": 1 }, 80, "舰载：瘫痪敌方电子设备", { carrierEW: 1 }),
  n("rob_carrier_swarm", "蜂群投放荚舱", 9, ["rob_carrier_bomber"], { "荚舱": 1, "微型机架": 24 }, 96, "舰载：一次投放 24 台微型机", { carrierSwarm: 24 }),
  n("rob_carrier_wingman", "舰载无人僚机", 9, ["rob_carrier_bomber"], { "僚机机体": 2, "协同模块": 2 }, 84, "舰载：与攻击机编队协同", { carrierWingman: 2 })
];

// ============ 能源 ============
const energy: TechNode[] = [
  n("en_hand", "手摇发电机", 1, [], { "磁铁": 3, "铜线": 5 }, 3, "人力发电 0.1kWh/h", { powerPerDay: 2.4 }),
  n("en_solar1", "基础太阳能", 1, [], { "光伏板": 2, "控制器": 1 }, 4, "日发电 1kWh", { powerPerDay: 1 }),
  n("en_wind", "小型风力发电机", 2, [], { "扇叶": 3, "发电机": 1, "塔架": 1 }, 8, "日发电 2-4kWh", { powerPerDay: 3 }),
  n("en_solar2", "太阳能阵列", 2, ["en_solar1"], { "光伏板": 8, "蓄电池": 4 }, 12, "日发电 5kWh，储 20kWh", { powerPerDay: 5, storage: 20 }),
  n("en_diesel", "柴油发电机", 3, [], { "柴油机": 1, "油箱": 1 }, 14, "10kW，耗油 2L/h", { powerKw: 10 }),
  n("en_hydro", "微型水利", 3, ["en_wind"], { "涡轮": 1, "管道": 10 }, 18, "日发电 6kWh，24h 持续", { powerPerDay: 6 }),
  n("en_geo_survey", "地热勘探", 4, ["en_solar2", "en_hydro"], { "钻探设备": 1, "热交换器": 1 }, 22, "评估地热潜力"),
  n("en_solar3", "大规模太阳能", 4, ["en_solar2"], { "光伏板": 30, "蓄电池": 20 }, 28, "日发电 15kWh，储 80kWh", { powerPerDay: 15, storage: 80 }),
  n("en_geo_small", "地热发电（小型）", 5, ["en_geo_survey"], { "地热井": 1, "热泵": 1, "汽轮机": 1 }, 40, "日发电 30kWh，可持续 50 年", { powerPerDay: 30 }),
  n("en_diesel_store", "柴油储备库", 5, ["en_diesel"], { "油箱": 10, "输油管道": 1 }, 20, "储备 2000L，自动补油"),
  n("en_solar_concentrated", "高级太阳能（聚光）", 6, ["en_solar3"], { "聚光镜": 20, "追踪系统": 1 }, 38, "日发电 40kWh，效率 ×3", { powerPerDay: 40 }),
  n("en_geo_large", "地热发电（大型）", 6, ["en_geo_small"], { "多组热泵": 1, "大型汽轮机": 1 }, 52, "日发电 80kWh", { powerPerDay: 80 }),
  n("en_fuel_synth", "燃料合成", 7, ["en_geo_large"], { "电解槽": 1, "合成塔": 1 }, 56, "电 + 水 → 氢燃料，能源闭环"),
  n("en_fusion_small", "聚变电站（小型）", 7, ["en_fuel_synth"], { "稀有同位素": 5, "约束装置": 1 }, 72, "日发电 500kWh（实验性，有事故风险）", { powerPerDay: 500, risk: 1 }),
  n("en_fusion_stable", "聚变电站（稳定）", 8, ["en_fusion_small"], { "稳定约束场": 1, "冗余系统": 1 }, 96, "日发电 1000kWh，100% 稳定", { powerPerDay: 1000 }),
  n("en_grid", "分布式电网", 8, ["en_fusion_stable"], { "全基地布线": 1, "智能配电": 1 }, 64, "全基地电力自由调配"),

  // ---- 生物质与废物利用 ----
  n("en_biogas", "沼气池", 3, ["en_diesel"], { "发酵罐": 2, "密封池": 1 }, 18, "厨余与粪便产沼气，做饭与照明", { biogas: 1 }),
  n("en_biogas_up", "沼气升级", 4, ["en_biogas"], { "提纯塔": 1, "储气罐": 2 }, 24, "沼气提纯，可驱动发电机", { biogasGen: 1 }),
  n("en_compost", "堆肥与肥料", 3, ["en_biogas"], { "堆肥箱": 3 }, 12, "废物转肥料，供温室使用", { compost: 1 }),
  n("en_biodiesel", "生物柴油", 4, ["en_biogas_up"], { "酯化设备": 1, "甲醇": 20 }, 32, "废弃油脂与作物转柴油，替代燃油", { biodiesel: 1 }),
  n("en_wood_gas", "木材气化", 4, ["en_biogas"], { "气化炉": 1, "过滤罐": 2 }, 26, "把木柴变成可燃气体，开车也能用", { woodGas: 1 }),
  n("en_ethanol", "乙醇燃料", 4, ["en_compost"], { "蒸馏塔": 1, "发酵池": 2 }, 30, "粮食/果渣发酵成燃料", { ethanol: 1 }),

  // ---- 储能 ----
  n("en_battery_bank", "蓄电池组", 3, ["en_solar2"], { "蓄电池": 8, "配电盘": 1 }, 20, "存住白天发的电，夜里也能用", { batteryBank: 1 }),
  n("en_battery_large", "大容量储能", 5, ["en_battery_bank", "en_solar3"], { "蓄电池": 30, "电池管理": 1 }, 40, "储能翻三倍，撑过连续阴天", { batteryLarge: 1 }),
  n("en_flow_battery", "液流电池", 6, ["en_battery_large"], { "电解液罐": 4, "电堆": 2 }, 52, "循环寿命极长，几乎不衰减", { flowBattery: 1 }),
  n("en_flywheel", "飞轮储能", 6, ["en_battery_large"], { "飞轮组": 2, "磁悬浮轴承": 1 }, 48, "瞬时放电，供电磁武器与脉冲塔", { flywheel: 1 }),
  n("en_thermal_store", "储热罐", 5, ["en_geo_small"], { "保温罐": 2, "热媒": 20 }, 34, "夜里继续供暖与热水", { thermalStore: 1 }),

  // ---- 热电联产与余热 ----
  n("en_cogen", "热电联产", 6, ["en_diesel", "en_thermal_store"], { "余热回收器": 1, "换热器": 2 }, 44, "发电的废热用来取暖与烧水", { cogen: 1 }),
  n("en_waste_heat", "余热回收", 5, ["en_thermal_store"], { "换热管路": 10, "循环泵": 2 }, 30, "把机器散的热收集起来", { wasteHeat: 1 }),

  // ---- 车辆多能源 ----
  n("en_veh_bio", "生物燃料改造", 4, ["en_biodiesel"], { "改装套件": 1, "油路改造": 1 }, 28, "房车可烧生物柴油与乙醇", { vehBio: 1 }),
  n("en_veh_gas", "气化燃料改造", 5, ["en_wood_gas"], { "气化改装": 1, "储气瓶": 2 }, 32, "房车可烧木材气化气", { vehGas: 1 }),
  n("en_veh_hybrid", "油电混合", 5, ["en_battery_large"], { "电机套件": 1, "电控单元": 1 }, 36, "低速用电，高速烧油，续航翻倍", { vehHybrid: 1 }),
  n("en_veh_electric", "纯电驱动", 6, ["en_veh_hybrid", "en_flow_battery"], { "大扭矩电机": 1, "快充模块": 1 }, 46, "静音行驶，夜间不被听见", { vehElectric: 1 }),
  n("en_veh_solar", "车顶太阳能扩展", 4, ["en_solar2"], { "柔性光伏": 12, "控制器": 1 }, 26, "行车与驻扎都能补电", { vehSolar: 1 }),
  n("en_veh_charger", "移动充电桩", 5, ["en_veh_hybrid"], { "充电桩": 2, "电缆": 10 }, 28, "外出时给无人机与机器人补电", { vehCharger: 1 }),

  // ---- 其他自然能源 ----
  n("en_waterwheel", "水轮发电", 3, ["en_hydro"], { "水轮": 2, "传动轴": 1 }, 22, "溪谷常流水，24 小时不断电", { waterwheel: 1 }),
  n("en_micro_hydro", "微型水电群", 5, ["en_waterwheel"], { "微型水轮": 6, "管渠": 20 }, 36, "多级布置，把水能榨干", { microHydro: 1 }),
  n("en_wind_turbine", "中型风机", 4, ["en_wind"], { "叶片组": 3, "塔架": 2, "发电机": 1 }, 30, "山顶风大，夜里也能发", { windTurbine: 1 }),
  n("en_wind_farm", "风电阵列", 6, ["en_wind_turbine"], { "风机": 8, "变流器": 2 }, 50, "成排风机，大风天满发", { windFarm: 8 }),
  n("en_solar_track", "追踪式光伏", 6, ["en_solar_concentrated"], { "追踪支架": 8, "控制单元": 1 }, 42, "跟着太阳转，发电 +35%", { solarTrack: 0.35 }),
  n("en_geothermal_loop", "地热闭环", 7, ["en_geo_large"], { "闭环管路": 20, "热泵组": 2 }, 58, "不取水只换热，永久可用", { geoLoop: 1 }),

  // ---- 能源管理与自给 ----
  n("en_grid_manage", "能源管理中枢", 6, ["en_battery_large", "en_cogen"], { "能源管理软件": 1, "传感器网络": 1 }, 40, "AI 自动调配，用最省的能源", { gridAI: 1 }),
  n("en_off_grid", "完全离网", 7, ["en_grid_manage", "en_wind_farm", "en_micro_hydro"], { "离网控制器": 1, "冗余线路": 1 }, 66, "不依赖任何外部供应", { offGrid: 1 }),
  n("en_fuel_independent", "燃料自给", 7, ["en_biodiesel", "en_ethanol", "en_wood_gas"], { "多燃料系统": 1, "储罐组": 3 }, 60, "基地与车辆的燃料全部自产", { fuelSelfSufficient: 1 }),
  n("en_emergency", "应急电源", 5, ["en_battery_bank"], { "应急电池": 4, "切换开关": 1 }, 24, "主电源断了自动接管关键设施", { emergencyPower: 1 })
];

// ============ 制药 ============
const pharma: TechNode[] = [
  n("ph_base", "基础制药", 3, [], { "草药": 10, "化学试剂": 5 }, 12, "止疼药 / 抗生素 / 兴奋剂"),
  n("ph_med_recreational", "扶她药·娱乐型", 3, ["ph_base"], { "稀有植物": 5, "激素前体": 3 }, 16, "后宫服用后短暂长出男性器官（数小时），解锁新 H 互动", { medRecreational: 1 }),
  n("ph_advanced", "高级制药", 4, ["ph_med_recreational"], { "精密仪器": 1, "化学合成台": 1 }, 22, "基因稳定剂 / 再生促进剂"),
  n("ph_med_pregnant", "扶她药·怀孕型", 4, ["ph_advanced"], { "稀有催化剂": 3, "基因样本": 1 }, 26, "后宫服用后短暂具生殖能力，可让主角受孕", { medPregnant: 1 }),
  n("ph_fertility_ctrl", "生育调控", 5, ["ph_med_pregnant"], { "激素分析仪": 1, "数据模型": 1 }, 30, "促孕 / 避孕 / 精准选择受孕方", { fertilityControl: 1 }),
  n("ph_mass", "大规模制药", 5, ["ph_fertility_ctrl"], { "自动制药机": 1, "原料温棚": 1 }, 36, "自动批量，产量 ×5", { medMult: 5 }),

  n("ph_herb_garden", "药草园", 3, ["shelter_greenhouse"], { "药苗": 20, "花盆": 30 }, 14, "自种常用药草，不再靠采集", { herbGarden: 1 }),
  n("ph_herb_dry", "药草炮制", 3, ["ph_base"], { "晒架": 4, "研磨器": 2 }, 10, "干燥与研磨，药效保存更久", { herbDry: 1 }),
  n("ph_antibiotic", "抗生素", 3, ["ph_base"], { "培养基": 10, "培养箱": 1 }, 20, "最要紧的药，能救感染", { antibiotic: 1 }),
  n("ph_painkiller", "镇痛与麻醉", 3, ["ph_base"], { "原料": 20, "蒸馏器": 1 }, 16, "手术与重伤处理的基础", { painkiller: 1 }),
  n("ph_blood_pack", "血浆制备", 4, ["ph_antibiotic"], { "冷藏库": 1, "血袋": 20 }, 24, "重伤与失血时救命", { bloodPack: 1 }),
  n("ph_surgery_kit", "外科套装", 4, ["ph_painkiller"], { "手术器械": 2, "消毒液": 20 }, 22, "可做清创与缝合", { surgeryKit: 1 }),
  n("ph_surgery_adv", "高级外科", 6, ["ph_surgery_kit", "shelter_medical"], { "无影灯": 1, "监护仪": 1, "精密器械": 6 }, 44, "能开腹、接骨、取弹片", { surgeryAdv: 1 }),
  n("ph_antidote_univ", "广谱解毒剂", 5, ["ph_antibiotic"], { "解毒剂": 6, "分析仪": 1 }, 30, "毒气、蛇咬、感染性毒素通用", { antidote: 1 }),

  n("ph_supplement", "营养补剂", 3, ["ph_herb_dry"], { "维生素原": 20, "胶囊壳": 100 }, 14, "长期吃不到新鲜食物也不垮", { supplement: 1 }),
  n("ph_immunity", "免疫力增强", 5, ["ph_supplement"], { "免疫原": 10, "培养箱": 2 }, 34, "减少感染与发病人数", { immunity: 1 }),
  n("ph_radiation", "抗辐射药", 6, ["ph_immunity"], { "碘剂": 20, "稀有化合物": 6 }, 40, "进入辐射区前服用", { antiRad: 1 }),
  n("ph_stimulant", "兴奋剂", 4, ["ph_base"], { "咖啡因": 50, "激素前体": 6 }, 18, "短时间内战力与耐力提升", { stimulant: 1 }),
  n("ph_stim_adv", "高级兴奋剂", 6, ["ph_stimulant"], { "合成激素": 10, "注射器": 20 }, 36, "战斗持续更久，副作用更小", { stimAdv: 1 }),
  n("ph_regen", "再生促进剂", 7, ["ph_stim_adv", "ph_surgery_adv"], { "生长因子": 8, "培养设备": 1 }, 56, "加速伤口愈合，重伤恢复减半", { regen: 0.5 }),

  n("ph_med_potent", "扶她药·强效型", 5, ["ph_med_recreational", "ph_advanced"], { "浓缩激素": 6, "稳定剂": 4 }, 28, "效果持续更久（仍为临时）", { medPotent: 1 }),
  n("ph_med_stable", "扶她药·稳定型", 6, ["ph_med_potent"], { "稳定剂": 10, "缓释载体": 6 }, 34, "副作用最小化", { medStable: 1 }),
  n("ph_med_twin", "扶她药·双效型", 6, ["ph_med_stable", "ph_med_pregnant"], { "双效配方": 1, "稀有催化剂": 6 }, 42, "娱乐与怀孕效果合一", { medTwin: 1 }),
  n("ph_med_perfect", "扶她药·完美体", 8, ["ph_med_twin", "ph_fertility_ctrl"], { "完美配方": 1, "基因样本": 4, "精密合成台": 1 }, 78, "一次性达到最优形态，无副作用", { medPerfect: 1 }),
  n("ph_fertility_harm", "生育调律", 6, ["ph_fertility_ctrl"], { "激素分析仪": 2, "模型库": 1 }, 38, "可主动决定受孕时机与孕程节奏", { fertilityHarm: 1 }),
  n("ph_contraception", "可控避孕", 5, ["ph_fertility_ctrl"], { "药基": 20, "稳定剂": 4 }, 24, "想生才生，完全受控", { contraception: 1 }),
  n("ph_ai_body_bio", "仿生体生物系统", 8, ["ph_med_perfect", "rob_body"], { "生物子宫": 1, "神经耦合": 1, "激素模拟": 1 }, 88, "配合 AI 仿生身体的生理机能", { aiBodyBio: 1 }),

  n("ph_raw_greenhouse", "药用原料棚", 4, ["ph_herb_garden"], { "棚架": 6, "控温设备": 1 }, 26, "稀有植物可控种植", { rawGreenhouse: 1 }),
  n("ph_synthesis", "人工合成", 6, ["ph_advanced", "prod_chem_lab"], { "合成台": 2, "反应釜": 1 }, 46, "不依赖稀有植物也能做药", { synthesis: 1 }),
  n("ph_auto_line", "自动制药线", 7, ["ph_synthesis", "prod_armor_line"], { "灌装机": 2, "压片机": 2, "机器人臂": 4 }, 58, "24 小时无人产药", { autoPharma: 1 }),
  n("ph_storage", "药品恒温库", 5, ["ph_base"], { "恒温柜": 4, "除湿机": 1 }, 20, "药品保质期 ×4", { pharmaStorage: 4 }),
  n("ph_analysis", "成分分析台", 5, ["ph_advanced"], { "色谱仪": 1, "分析软件": 1 }, 28, "能仿造捡到的药", { pharmaAnalysis: 1 }),
  n("ph_field_kit", "野战药箱", 4, ["ph_painkiller"], { "药箱": 2, "分装盒": 10 }, 16, "外出时能现场配药与急救", { fieldKit: 1 }),

  n("ph_antiviral", "抗病毒药", 6, ["ph_immunity"], { "抗病毒原": 8, "培养箱": 1 }, 38, "对感染性病原有效", { antiviral: 1 }),
  n("ph_cure_early", "早期感染抑制", 7, ["ph_antiviral"], { "抑制剂": 6, "样本": 4 }, 52, "被咬后短时间内可以阻断", { cureEarly: 1 }),
  n("ph_cryo_drug", "冷冻保护剂", 7, ["ph_regen", "shelter_cryo"], { "保护剂": 10, "冷却系统": 1 }, 54, "配合冷冻休眠舱使用", { cryoDrug: 1 }),
  n("ph_longevity", "延寿配方", 8, ["ph_regen", "lo_genome"], { "端粒酶": 4, "稀有化合物": 10 }, 82, "长期服用显著延缓衰老", { longevityDrug: 1 }),
  n("ph_psyche", "情绪调控剂", 5, ["ph_painkiller"], { "药基": 20, "镇静剂": 6 }, 26, "降低同伴压力与冲突", { psyche: 1 }),
  n("ph_aphrodisiac", "催情剂", 4, ["ph_med_recreational"], { "催情原": 10, "载体": 6 }, 18, "提升欲情（非扶她药）", { aphrodisiac: 1 }),
  n("ph_lactation", "泌乳调控", 5, ["ph_fertility_ctrl"], { "激素原": 10, "分析仪": 1 }, 24, "产后哺乳相关调控", { lactation: 1 }),
  n("ph_prenatal", "孕期营养剂", 5, ["ph_fertility_ctrl"], { "营养原": 20, "维生素": 30 }, 22, "孕期减少不适，胎儿更健康", { prenatal: 1 })
];

// ============ 寿命 ============
const longevity: TechNode[] = [
  n("lo_genome", "基础基因图谱", 3, [], { "血液样本": 5, "显微镜": 1 }, 14, "分析端粒长度，了解衰老机制"),
  n("lo_telomere", "端粒修复", 4, ["lo_genome"], { "稀有化合物": 3, "细胞培养皿": 1 }, 24, "主角衰老 -30%，寿命 +20 年", { aging: -0.30, lifeYears: 20 }),
  n("lo_companion_antiaging", "同伴抗衰", 4, ["lo_telomere"], { "稀有草药": 5, "营养剂": 5 }, 22, "同伴衰老 -20%，寿命 +15 年", { companionAging: -0.20 }),
  n("lo_cell_regen", "细胞再生", 5, ["lo_companion_antiaging"], { "稀有催化剂": 3, "基因稳定剂": 3 }, 32, "主角外表锁定，不再变老", { appearanceLock: 1 }),
  n("lo_life_extend", "寿命延长剂·初级", 5, ["lo_cell_regen"], { "珍稀材料": 10, "精密合成台": 1 }, 30, "服用一次 +10 年（可重复，药效递减）", { lifeYears: 10 }),
  n("lo_gene_opt", "基因优化", 6, ["lo_life_extend"], { "全基因编辑套件": 1 }, 46, "主角寿命 ×2，疾病免疫 +80%", { lifeMult: 2, immunity: 0.80 }),
  n("lo_companion_gene_opt", "同伴基因优化", 6, ["lo_gene_opt"], { "稳定剂": 10, "生物芯片": 5 }, 44, "同伴寿命 +30 年，免疫 +50%", { companionLifeYears: 30 }),
  n("lo_immortal_cell", "永续细胞", 7, ["lo_companion_gene_opt"], { "干细胞培养舱": 1 }, 64, "主角永生（意外死亡仍会死）", { immortal: 1 }),
  n("lo_companion_immortal", "同伴永生", 7, ["lo_immortal_cell"], { "特殊培养液": 10, "基因适配": 1 }, 62, "同伴不再衰老", { companionImmortal: 1 }),
  n("lo_transcend", "彻底超越", 8, ["lo_companion_immortal"], { "终极研究数据": 1 }, 88, "意外死亡抗性 +30%（爆头/粉碎仍死）", { accidentResist: 0.30 })
];

export const BRANCHES: Branch[] = [
  { id: "shelter", name: "避难所科技", description: "扩大基地功能、解锁建筑、提升生存上限", nodes: shelter },
  { id: "expedition", name: "远征科技", description: "房车改装、探索范围、远征续航", nodes: expedition },
  { id: "self", name: "自我科技", description: "主角自身强化（仅限主角）", nodes: self },
  { id: "defense", name: "防御科技", description: "围墙、陷阱、炮塔、无人机、能量护盾", nodes: defense },
  { id: "robot", name: "机器人科技", description: "哨兵机器人 → 特殊AI接口 → 仿生身体", nodes: robot },
  { id: "energy", name: "能源科技", description: "手摇 → 太阳能 → 地热 → 聚变", nodes: energy },
  { id: "pharma", name: "制药科技", description: "基础药品 → 扶她药（娱乐型/怀孕型）", nodes: pharma },
  { id: "longevity", name: "寿命科技", description: "端粒修复 → 基因优化 → 永续细胞", nodes: longevity }
];

export function allNodes(): TechNode[] {
  return BRANCHES.flatMap((b) => b.nodes);
}

export function findNode(id: string): TechNode | undefined {
  return allNodes().find((x) => x.id === id);
}

export function branchOf(id: string): Branch | undefined {
  return BRANCHES.find((b) => b.nodes.some((x) => x.id === id));
}