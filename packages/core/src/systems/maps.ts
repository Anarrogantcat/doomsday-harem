/**
 * 地图网格系统。
 *
 * 结构：三张主地图（江城） + 两张子地图（北岭山 / 要塞内部）
 *
 *   主地图①「江城 · 城南」   8×6 = 48 格   主角家所在，紧挨北岭山脚
 *        │ 城南出口
 *        ▼
 *   主地图②「江城 · 市中心」 8×6 = 48 格
 *        │ 城北出口
 *        ▼
 *   主地图③「江城 · 东部郊野」8×6 = 48 格
 *
 *   子地图「北岭山」         6×6 = 36 格   从城南「北岭山脚」进
 *        ├─ 山道 / 溪谷 / 林场 / 采药坡
 *        └─ 要塞外围 / 山体要塞 / 后山暗道
 *
 *   子地图「要塞内部」       6×6 = 36 格   基地核心
 *
 * 相邻关系由坐标隐式决定：正交相邻即可移动。
 * 方向键（↑↓←→）直接对应网格移动，走到出口格切图。
 *
 * 命名约定：同图内格 id 在所属地图命名空间下唯一；出口目标写 图id/格id。
 */

export type CellKind =
  | "city" | "town" | "road" | "wild"
  | "mountain" | "base" | "military" | "lab"
  | "water" | "interior" | "ruin" | "farm" | "industrial";

export type ExitDir = "N" | "S" | "E" | "W";

export interface MapExit {
  dir: ExitDir;
  toMap: string;
  toCell: string;
  label: string;
}

export interface SubEntry {
  id: string;
  label: string;
  at: string;
}

export interface MapCellData {
  id: string;
  name: string;
  kind: CellKind;
  danger: number;
  desc: string;
  loot: string[];
  x: number;
  y: number;
  exits?: MapExit[];
  sub?: SubEntry;
  locked?: boolean;
}

export interface GameMap {
  id: string;
  name: string;
  subtitle: string;
  cols: number;
  rows: number;
  kind: "main" | "sub";
  parent?: string;
  cells: MapCellData[];
}

export const DIR_DELTA: Record<ExitDir, [number, number]> = {
  N: [0, -1], S: [0, 1], W: [-1, 0], E: [1, 0]
};
export const DIR_LABEL: Record<ExitDir, string> = { N: "北", S: "南", W: "西", E: "东" };
export const DIR_ARROW: Record<ExitDir, string> = { N: "↑", S: "↓", W: "←", E: "→" };
export const KIND_LABEL: Record<CellKind, string> = {
  city: "城区", town: "城郊", road: "道路", wild: "野地", mountain: "山地",
  base: "据点", military: "军事", lab: "研究", water: "水域",
  interior: "室内", ruin: "废墟", farm: "农地", industrial: "工业区"
};
export const KIND_ICON: Record<CellKind, string> = {
  city: "🏢", town: "🏘", road: "🛣", wild: "🌳", mountain: "⛰",
  base: "🏰", military: "🛡", lab: "🔬", water: "💧",
  interior: "🚪", ruin: "🏚", farm: "🌾", industrial: "🏭"
};
export const KIND_COLOR: Record<CellKind, string> = {
  city: "#4a6fa5", town: "#5b7a8c", road: "#6b6f7a", wild: "#3d6b4a",
  mountain: "#5a5266", base: "#8D31B0", military: "#7a5a3a",
  lab: "#3a6b7a", water: "#2f5a7a", interior: "#6a4a7a", ruin: "#7a5f5f",
  farm: "#5a7a4a", industrial: "#6a6a7a"
};

/** 建格子的简写 */
function c(
  id: string, name: string, kind: CellKind, x: number, y: number,
  danger: number, desc: string, loot: string[] = [],
  extra: Partial<MapCellData> = {}
): MapCellData {
  return { id, name, kind, x, y, danger, desc, loot, ...extra };
}

/* ==================== 主地图① 江城 · 城南（48 格） ==================== */
/* 主角家所在。西边靠山，东边接市中心，南边是城郊。 */

export const MAP_CITY_SOUTH: GameMap = {
  id: "jc_south", name: "江城 · 城南", subtitle: "主角家所在，西靠北岭",
  cols: 8, rows: 6, kind: "main",
  cells: [
    // ── 第 0 行 ──
    c("nw_hill_view", "西北坡", "wild", 0, 0, 1, "能看见整片城南的缓坡。", ["草药", "野果"]),
    c("west_reservoir", "西山水库", "water", 1, 0, 2, "城南的备用水源，堤上能钓鱼。", ["清水", "鱼", "渔具"]),
    c("tunnel_west", "西山隧道", "road", 2, 0, 3, "穿过北岭支脉的旧隧道，长 1.2km。", ["电缆", "工具箱"]),
    c("uni_north", "大学北门", "city", 3, 0, 2, "校门卫室还锁着，传达室里能翻出钥匙。", ["钥匙", "值班记录"]),
    c("uni_library", "大学图书馆", "city", 4, 0, 2, "四层书库。技术资料最多的地方之一。", ["技术手册", "图纸", "书"]),
    c("uni_dorm", "大学宿舍楼", "city", 5, 0, 3, "楼道里散落着行李箱和被翻乱的柜子。", ["衣物", "行李箱", "洗漱用品"]),
    c("uni_canteen", "大学食堂", "city", 6, 0, 3, "后厨冷库还有没坏的冻品。", ["冻品", "米面", "厨具"]),
    c("uni_sports", "大学体育馆", "city", 7, 0, 2, "看台能俯瞰南区，器械房里器材还很全。", ["运动装备", "绳索", "护具"]),

    // ── 第 1 行 ──
    c("mountain_foot", "北岭山脚", "road", 0, 1, 1,
      "出小区往西走十分钟。上山的路从这里开始。", ["登山绳", "岩钉"],
      { sub: { id: "beiling", label: "上山", at: "mt_foot_camp" } }),
    c("hero_home", "主角家", "city", 1, 1, 0,
      "城南小区六楼，一家四口住一起。朝西的窗户正对着北岭，桌上的电脑还亮着。",
      ["电脑配件", "笔记", "家常储备"]),
    c("home_block", "小区楼下", "town", 2, 1, 1, "六层老楼，电梯停过两次。楼下有个小卖部。", ["日用品", "零食", "电池"]),
    c("univ_neigh", "大学路", "road", 3, 1, 1, "连接小区与大学的主路，两侧都是商铺。", ["日用品", "五金"]),
    c("street_east", "南城商业街", "city", 4, 1, 2, "店铺大半被撬开，剩下些没人要的东西。", ["内衣", "酒", "化妆品", "玩具"]),
    c("middle_school", "城南中学", "city", 5, 1, 2, "黑板上还有半截没擦掉的字。", ["文具", "运动服", "工具箱"]),
    c("south_plaza", "城南广场", "city", 6, 1, 2, "广场上停着几辆当年撤离时的车。", ["燃油", "物资箱", "收音机"]),
    c("south_bank", "城南储蓄所", "city", 7, 1, 3, "柜台被砸开了，保险柜还锁着。", ["现金", "保险柜", "印章"]),

    // ── 第 2 行 ──
    c("hillside_road", "山道口", "road", 0, 2, 2, "窄窄的上山路，车开不进去，只能走。", ["岩钉", "柴刀"]),
    c("south_park", "城南公园", "wild", 1, 2, 1, "湖面很静，适合歇脚。", ["草药", "木材"]),
    c("park_lake", "人工湖", "water", 2, 2, 2, "水不深，湖底沉着当年扔下去的东西。", ["清水", "鱼", "沉物"]),
    c("clin_neigh", "社区诊所", "city", 3, 2, 2, "小诊所，药品不多但还没被翻过。", ["药品", "绷带", "注射器"]),
    c("res_blocks", "居民楼群", "town", 4, 2, 2, "一整片居民楼，楼道里翻得出家常物资。", ["罐头", "衣物", "药品", "工具"]),
    c("noodle_shop", "老街面馆", "city", 5, 2, 2, "灶台还在，后厨有整袋的面粉。", ["面粉", "调料", "锅具"]),
    c("pawn_shop", "当铺", "city", 6, 2, 3, "橱窗碎了，柜台里还有没拿走的东西。", ["首饰", "手表", "器械"]),
    c("south_highschool", "城南高中", "city", 7, 2, 2, "操场长满草，器材室锁着。", ["文具", "运动器材", "工具箱"]),

    // ── 第 3 行 ──
    c("metro_south", "地铁口", "city", 0, 3, 3, "入口塌了一半，地下通道通向城北。", ["电缆", "手电", "工具箱"]),
    c("under_parking", "地下停车场", "ruin", 1, 3, 4, "黑暗、回声，还有别的东西在动。", ["燃油", "车用工具", "备用轮胎"]),
    c("warehouse_s", "城南仓库", "industrial", 2, 3, 3, "堆满未拆封的货箱。", ["建材", "物资箱", "绳索"]),
    c("city_hospital", "市立医院", "city", 3, 3, 4, "药房被翻过，但地下室还有存货。", ["药品", "绷带", "手术器械"]),
    c("bus_station", "城南汽车站", "ruin", 4, 3, 3, "十几辆大巴停在场上，车里有遗留的行李。", ["衣物", "行李箱", "燃油"]),
    c("abandoned_mall", "废弃商场", "city", 5, 3, 3, "扶梯停了，二楼有几家店还锁着。", ["服装", "鞋", "饰品"]),
    c("old_theater", "旧剧院", "city", 6, 3, 3, "帷幕还挂着，后台有间没锁的更衣室。", ["戏服", "化妆镜", "缎带"]),
    c("junkyard", "废车场", "ruin", 7, 3, 3, "上百辆报废车压成垛，零件管够。", ["零件", "钢材", "轮胎"]),

    // ── 第 4 行 ──
    c("res_west", "城西小区", "town", 0, 4, 2, "老式家属院，院子里的水井还能用。", ["清水", "日用品", "工具"]),
    c("shoemaker", "街边铺子", "city", 1, 4, 2, "修鞋铺、锁铺、缝纫店挤在一起。", ["工具", "皮革", "布料"]),
    c("vegetable_market", "城南菜场", "city", 2, 4, 3, "菜摊早烂了，干货铺和粮行还有存货。", ["粮食", "干货", "调料"]),
    c("east_warehouse", "城东仓库", "industrial", 3, 4, 3, "大件仓库，叉车还停在门口。", ["建材", "钢索", "托盘"]),
    c("gas_station", "加油站", "road", 4, 4, 4, "油罐还有余量，但需要泵才取得出来。", ["燃油", "油泵", "抹布"]),
    c("subway_tunnel", "地下通道", "ruin", 5, 4, 3, "连接商场与车站的地下步行道，很长。", ["电缆", "手电", "雨衣"]),
    c("fire_station", "消防站", "city", 6, 4, 2, "消防车还在，装备库没人动过。", ["防护服", "绳索", "破拆工具"]),
    c("post_office", "邮局", "city", 7, 4, 2, "信件和包裹堆成山，没人来取。", ["包裹", "文具", "纸张"]),

    // ── 第 5 行 ──
    c("west_industrial", "西区工业园", "industrial", 0, 5, 3, "厂房铁门锈死了，车间里还有能用的机器。", ["钢材", "零件", "燃油", "工具"]),
    c("rail_yard_s", "南站货场", "industrial", 1, 5, 3, "货运车厢歪在轨道上。", ["钢锭", "枕木", "柴油"]),
    c("brick_kiln", "砖窑", "industrial", 2, 5, 2, "窑还热过一阵子，砖石成堆。", ["砖石", "水泥"]),
    c("river_bank", "城南河岸", "water", 3, 5, 2, "河水不深，岸边有渔船拖着。", ["渔具", "绳索", "船用燃油"]),
    c("farm_south", "城南菜地", "farm", 4, 5, 1, "一片没荒透的菜地，还有活水。", ["蔬菜", "种子", "农具"]),
    c("orchard", "果园", "farm", 5, 5, 1, "果树没人修剪，果子长得又小又酸。", ["水果", "木材", "蜂蜜"]),
    c("southeast_mill", "东南磨坊", "industrial", 6, 5, 2, "老式磨坊，机器还能转。", ["粮食", "面粉", "零件"]),
    c("south_gate", "城南出口", "road", 7, 5, 2,
      "通往市中心的公路从这里开始。", ["路牌", "汽油桶"],
      { exits: [{ dir: "E", toMap: "jc_center", toCell: "center_gate_n", label: "进城，往市中心" }] })
  ]
};

/* ==================== 主地图② 江城 · 市中心（48 格） ==================== */

export const MAP_CITY_CENTER: GameMap = {
  id: "jc_center", name: "江城 · 市中心", subtitle: "曾经的商业核心，尸潮最密",
  cols: 8, rows: 6, kind: "main",
  cells: [
    // ── 第 0 行 ──
    c("n_uni_annex", "大学北校区", "city", 0, 0, 3, "理科院系所在，实验室里试剂很全。", ["化学试剂", "玻璃器皿", "显微镜"]),
    c("n_res_high", "城北高层住宅", "town", 1, 0, 3, "三十层塔楼，电梯全停了。", ["家具", "衣物", "厨具"]),
    c("n_train_station", "江城火车站", "city", 2, 0, 4, "售票大厅的灯还亮着，列车停在站台。", ["行李", "补给包", "燃油"]),
    c("central_plaza", "中央广场", "city", 3, 0, 3, "喷泉干了，地上摊着撤离时丢下的东西。", ["物资箱", "折叠椅"]),
    c("city_hall", "市政厅", "city", 4, 0, 4, "行政档案和储备物资都在里面，门锁着。", ["档案", "钥匙", "通讯设备"]),
    c("commercial_center", "商业中心", "city", 5, 0, 4, "玻璃幕墙碎了一半，中庭里停着几辆车。", ["电子产品", "服装", "饰品"]),
    c("city_library", "市图书馆", "city", 6, 0, 2, "安静得不像话。技术资料最全的地方。", ["技术手册", "地图", "图纸"]),
    c("n_tech_park", "科技园区", "city", 7, 0, 3, "孵化器大楼，服务器机房还在。", ["服务器", "硬盘", "线缆"]),

    // ── 第 1 行 ──
    c("w_depot", "城西货运站", "industrial", 0, 1, 3, "集装箱堆成小山，编号还能看清。", ["建材", "物资箱", "钢索"]),
    c("w_power_plant", "市电厂", "industrial", 1, 1, 5, "机组停了，燃料库还有余量。", ["燃油", "电缆", "变压器零件"]),
    c("w_water_plant", "自来水厂", "industrial", 2, 1, 4, "滤池还能用，接上就有净水。", ["滤料", "管件", "泵零件"]),
    c("central_oldcity", "老城巷", "city", 3, 1, 2, "青砖窄巷，两侧都是老宅。", ["腌菜", "老酒", "铁锅"]),
    c("central_hospital", "中心医院", "city", 4, 1, 4, "楼层太高，只能一层层清。", ["药品", "血浆", "呼吸机零件"]),
    c("stadium", "体育馆", "city", 5, 1, 3, "看台能俯瞰半个城区。", ["运动装备", "补给包", "广播设备"]),
    c("tv_station", "电视台", "city", 6, 1, 4, "发射塔还有电，能往外发信号。", ["电子元件", "天线", "硬盘"]),
    c("n_finance", "金融街", "city", 7, 1, 4, "写字楼群，金库和档案室都在。", ["现金", "档案", "保险柜"]),

    // ── 第 2 行 ──
    c("w_market", "城西市场", "city", 0, 2, 3, "批发市场，货架倒了一半。", ["粮食", "干货", "日用品"]),
    c("w_school", "城西中学", "city", 1, 2, 2, "校园里长满了草。", ["文具", "体育器材", "工具"]),
    c("w_factory", "轻工厂", "industrial", 2, 2, 3, "纺织车间，布料成捆。", ["布料", "缝纫机", "零件"]),
    c("center_gate_n", "城南路口", "road", 3, 2, 2,
      "回城南的岔路口。", ["路障", "汽油桶"],
      { exits: [{ dir: "W", toMap: "jc_south", toCell: "south_gate", label: "回城南" }] }),
    c("central_library_br", "古籍分馆", "city", 4, 2, 2, "老建筑，木楼梯踩上去吱呀响。", ["古籍", "字画", "图纸"]),
    c("central_court", "市法院", "city", 5, 2, 3, "档案室锁得死死的。", ["档案", "印章", "钥匙"]),
    c("commercial_2", "商业街二期", "city", 6, 2, 3, "步行街，店铺大多空了。", ["服装", "鞋", "化妆品"]),
    c("e_post", "东区邮局", "city", 7, 2, 2, "信件与包裹塞满了货架。", ["包裹", "文具", "邮票"]),

    // ── 第 3 行 ──
    c("w_bus_depot", "城西停车场", "ruin", 0, 3, 3, "公交车停在场上，油箱还有油。", ["柴油", "备用轮胎", "工具"]),
    c("central_park", "中央公园", "wild", 1, 3, 1, "城市正中的一片绿，湖里还有鱼。", ["草药", "鱼", "木材"]),
    c("museum", "市博物馆", "city", 2, 3, 3, "展柜碎了，但库房在负一层。", ["古董", "金属器", "工具"]),
    c("under_street", "地下商业街", "ruin", 3, 3, 4, "灯光还亮着几盏，通道很长。", ["内衣", "饰品", "手电"]),
    c("central_school", "市中心小学", "city", 4, 3, 2, "教室里桌椅还摆得整整齐齐。", ["文具", "工具", "雨具"]),
    c("post_hub", "邮政枢纽", "industrial", 5, 3, 3, "分拣车间，传送带停着。", ["包裹", "纸箱", "捆扎带"]),
    c("e_market", "东区菜市场", "city", 6, 3, 3, "摊位烂了，冷库还有干货。", ["干货", "粮食", "调料"]),
    c("e_park_small", "东区小游园", "wild", 7, 3, 1, "几棵树，一张长椅，能歇脚。", ["草药", "木材"]),

    // ── 第 4 行 ──
    c("south_station", "南部车站", "ruin", 0, 4, 3, "货运车厢歪在轨道上。", ["钢锭", "枕木", "柴油"]),
    c("under_parking_2", "地下停车场", "ruin", 1, 4, 4, "黑暗、回声、还有别的东西。", ["燃油", "车用工具", "备用轮胎"]),
    c("s_industrial", "重工业区", "industrial", 2, 4, 4, "大型机械车间，能拆出好东西。", ["钢材", "机床零件", "液压件"]),
    c("central_clinic", "中心牙科", "city", 3, 4, 2, "小小的诊所，器械很精细。", ["器械", "药品", "麻醉剂"]),
    c("central_bath", "公共浴场", "city", 4, 4, 2, "锅炉房还能烧，热水管全通。", ["工具", "锅炉件", "毛巾"]),
    c("central_laundry", "洗衣厂", "industrial", 5, 4, 2, "成排洗衣机和蒸汽管道。", ["零件", "布料", "清洁剂"]),
    c("central_gym", "健身会所", "city", 6, 4, 2, "器械区还完整，储物柜锁着。", ["运动装备", "蛋白粉", "毛巾"]),
    c("central_pool", "游泳馆", "water", 7, 4, 2, "池水混了，但过滤设备还在。", ["滤料", "泵件", "泳具"]),

    // ── 第 5 行 ──
    c("north_gate", "城北出口", "road", 0, 5, 2,
      "出城的公路，通向东部郊野。", ["路牌", "汽油桶"],
      { exits: [{ dir: "E", toMap: "jc_east", toCell: "e_gate_n", label: "出城，往东部郊野" }] }),
    c("s_warehouse", "南部仓库区", "industrial", 1, 5, 4, "连片大仓库，物资最多也最危险。", ["建材", "物资箱", "钢板"]),
    c("chemical_wh", "化工仓库", "industrial", 2, 5, 5, "气味刺鼻，但试剂和原料都在这。", ["化学试剂", "原料", "防护服"]),
    c("s_quarry", "采石场", "wild", 3, 5, 3, "碎石机还在，石壁上有炸开的洞。", ["碎石", "炸药", "钢索", "水泥"]),
    c("s_oil_depot", "油库", "industrial", 4, 5, 5, "大型储油罐，能取到大量燃油。", ["燃油", "油泵", "阀门"]),
    c("s_granary", "国家粮库", "industrial", 5, 5, 4, "筒仓还立着，粮还在里面。", ["粮食", "面粉", "豆类"]),
    c("s_brewer", "啤酒厂", "industrial", 6, 5, 3, "发酵罐和灌装线，酒管够。", ["酒", "粮食", "不锈钢罐"]),
    c("s_power_sub", "南郊变电站", "industrial", 7, 5, 4, "变压器还能用，电缆成捆。", ["电缆", "变压器", "配电盘"])
  ]
};

/* ==================== 主地图③ 江城 · 东部郊野（48 格） ==================== */

export const MAP_CITY_EAST: GameMap = {
  id: "jc_east", name: "江城 · 东部郊野", subtitle: "工业、林场与军事设施",
  cols: 8, rows: 6, kind: "main",
  cells: [
    // ── 第 0 行 ──
    c("e_pulp_mill", "东部纸浆厂", "industrial", 0, 0, 3, "木材堆成山，制浆设备还在。", ["木材", "化工原料", "零件"]),
    c("e_forestry", "东部林场", "wild", 1, 0, 2, "松林连片，伐木道还在。", ["木材", "松脂", "野味"]),
    c("e_sawmill", "锯木厂", "industrial", 2, 0, 2, "圆锯锈了，但木料库还满着。", ["木材", "木板", "工具"]),
    c("e_reservoir", "东部水库", "water", 3, 0, 2, "水面很大，坝上有设备房。", ["清水", "鱼", "渔具"]),
    c("e_farm_north", "北部农场", "farm", 4, 0, 1, "大田农场，农机还停在棚里。", ["粮食", "农机零件", "柴油"]),
    c("e_poultry", "养鸡场", "farm", 5, 0, 2, "笼子空了，但饲料库还有存货。", ["饲料", "蛋", "工具"]),
    c("e_pig_farm", "养猪场", "farm", 6, 0, 3, "气味很冲，饲料槽还在。", ["饲料", "工具"]),
    c("checkpoint", "军方检查站", "military", 7, 0, 5, "沙袋工事还在，封锁线没来得及撤。", ["弹药", "军用背包", "枪械零件", "防弹板"]),

    // ── 第 1 行 ──
    c("e_industrial", "东部工业区", "industrial", 0, 1, 3, "成排厂房，管线横七竖八。", ["钢材", "化工原料", "零件"]),
    c("e_machine_shop", "机械车间", "industrial", 1, 1, 3, "车床、铣床、钻床都还在。", ["机床零件", "刀具", "钢材"]),
    c("e_foundry", "铸造厂", "industrial", 2, 1, 4, "熔炉冷透了，模具成排。", ["模具", "钢锭", "砂箱"]),
    c("e_gate_n", "城北路口", "road", 3, 1, 2,
      "回市中心的岔路口。", ["路障", "汽油桶"],
      { exits: [{ dir: "W", toMap: "jc_center", toCell: "north_gate", label: "回市中心" }] }),
    c("e_canning", "罐头厂", "industrial", 4, 1, 3, "生产线停着，成品库里还有货。", ["罐头", "玻璃瓶", "设备零件"]),
    c("e_dairy", "乳品厂", "industrial", 5, 1, 3, "冷库断电了，但设备能修。", ["设备零件", "不锈钢管", "清洁剂"]),
    c("e_mill", "面粉厂", "industrial", 6, 1, 3, "磨粉机组，麦子还在筒仓。", ["面粉", "粮食", "零件"]),
    c("e_barracks", "军营旧址", "military", 7, 1, 4, "营房、仓库、训练场。", ["军粮", "装备", "弹药箱"]),

    // ── 第 2 行 ──
    c("e_quarry", "采石场", "wild", 0, 2, 3, "碎石机还在，石壁上有炸开的洞。", ["碎石", "炸药", "钢索", "水泥"]),
    c("e_cement", "水泥厂", "industrial", 1, 2, 4, "回转窑停了，熟料堆还在。", ["水泥", "石灰", "设备件"]),
    c("e_rail_bridge", "铁路桥", "road", 2, 2, 3, "桥下是深沟，桥面只剩半边能走。", ["钢板", "枕木", "螺钉"]),
    c("e_junction", "东部枢纽", "road", 3, 2, 2, "公路与铁路交汇，往南往北都方便。", ["路牌", "工具"]),
    c("e_solar_farm", "光伏电站", "industrial", 4, 2, 3, "成片光伏板，逆变器还能用。", ["光伏板", "逆变器", "电缆"]),
    c("e_wind_farm", "风电场", "wild", 5, 2, 3, "山脊上立着十几台风机。", ["风机叶片", "发电机", "电缆"]),
    c("e_gas_plant", "燃气站", "industrial", 6, 2, 4, "储气罐高耸，阀门还能开。", ["燃气", "阀门", "管件"]),
    c("e_radar", "雷达站", "military", 7, 2, 4, "天线阵还立着，控制室里有设备。", ["电子元件", "电池", "雷达零件"]),

    // ── 第 3 行 ──
    c("e_swamp", "沼泽地", "water", 0, 3, 3, "泥很深，走一步陷一步。", ["草药", "泥炭", "鱼"]),
    c("e_mine", "废弃矿洞", "wild", 1, 3, 4, "洞口支着木架，里面往下有几十米。", ["矿石", "煤", "矿灯"]),
    c("e_coal_yard", "储煤场", "industrial", 2, 3, 3, "煤堆成山，铲车还在。", ["煤", "铲车零件", "燃油"]),
    c("e_farm_main", "东郊农庄", "farm", 3, 3, 1, "农舍、菜地、一口井。有活水。", ["蔬菜", "种子", "农具", "粮食"]),
    c("e_greenhouse", "温室大棚", "farm", 4, 3, 1, "棚膜还完整，里面的菜还活着。", ["蔬菜", "种子", "灌溉件"]),
    c("e_orchard_e", "东郊果园", "farm", 5, 3, 1, "果树成片，秋天能收。", ["水果", "木材", "蜂蜜"]),
    c("e_livestock", "牧场", "farm", 6, 3, 2, "围栏倒了一半，牲口跑了。", ["饲料", "皮革", "绳索"]),
    c("e_airfield", "小型机场", "road", 7, 3, 4, "跑道裂了，机库里还停着一架小型机。", ["航空燃油", "导航仪", "降落伞", "工具"]),

    // ── 第 4 行 ──
    c("e_dock", "东部码头", "water", 0, 4, 3, "货运码头，起重机和驳船都还在。", ["绳索", "船用燃油", "吊具"]),
    c("e_river_mouth", "河口", "water", 1, 4, 3, "江水在这里汇入湖泊，岸边有船。", ["渔具", "船用燃油", "绳索"]),
    c("e_lake", "东湖", "water", 2, 4, 2, "湖面开阔，湖心有个小岛。", ["鱼", "清水", "渔具"]),
    c("e_fish_farm", "水产养殖场", "farm", 3, 4, 2, "网箱还在，鱼还在里面。", ["鱼", "饲料", "网具"]),
    c("e_kitchen_gr", "中央厨房", "industrial", 4, 4, 3, "为附近工业区供餐的厨房，设备齐全。", ["粮食", "厨具", "燃气灶"]),
    c("e_warehouse_gr", "东郊大仓", "industrial", 5, 4, 3, "巨型仓库，货架高到看不清顶。", ["物资箱", "建材", "叉车零件"]),
    c("e_market_gr", "农贸集散地", "city", 6, 4, 3, "批发集散中心，货场很大。", ["粮食", "干货", "日用品"]),
    c("e_hangar", "旧机库", "military", 7, 4, 4, "大跨度钢结构机库，能藏东西。", ["钢材", "工具", "机械零件"]),

    // ── 第 5 行 ──
    c("e_abandon_mill", "废弃造纸厂", "ruin", 0, 5, 3, "厂区荒了很久，但仓库还锁着。", ["纸张", "木材", "化学品"]),
    c("e_rail_depot", "东站车辆段", "industrial", 1, 5, 3, "机车库里停着几台内燃机车。", ["柴油", "机件", "工具"]),
    c("e_swamp_south", "南部湿地", "water", 2, 5, 3, "芦苇荡，水深不明。", ["草药", "鱼", "芦苇"]),
    c("e_temp_camp", "临时营地", "ruin", 3, 5, 2, "别人撤离时留下的营地，帐篷还立着。", ["睡袋", "罐头", "柴火", "地图残页"]),
    c("e_refugee_camp", "难民营旧址", "ruin", 4, 5, 3, "成排的临时安置房，空无一人。", ["衣物", "日用品", "药品"]),
    c("e_checkpoint_2", "路检站", "military", 5, 5, 4, "路障和铁皮哨亭，还有警示牌。", ["弹药", "路障件", "工具"]),
    c("e_radio_tower", "中波发射塔", "military", 6, 5, 4, "高塔还立着，机房有备用电源。", ["电子元件", "天线", "电池"]),
    c("e_border", "东界碑", "road", 7, 5, 3, "公路在这里分出岔道，通往更远的地方。", ["路牌", "地图残页", "汽油桶"])
  ]
};

/* ==================== 子地图 北岭山（36 格） ==================== */

export const MAP_MOUNTAIN: GameMap = {
  id: "beiling", name: "北岭山", subtitle: "基地所在，山体要塞藏在这里",
  cols: 6, rows: 6, kind: "sub", parent: "jc_south",
  cells: [
    // ── 第 0 行 ──
    c("mt_foot_camp", "山脚营地", "mountain", 0, 0, 1,
      "上山第一站。房车最初停在这里。", ["柴油", "备用轮胎", "工具"],
      { exits: [{ dir: "W", toMap: "jc_south", toCell: "mountain_foot", label: "回城南" }] }),
    c("mt_trail", "登山步道", "mountain", 1, 0, 2, "石阶被落叶盖住，两侧是密林。", ["登山绳", "柴火"]),
    c("mt_stream", "溪谷", "water", 2, 0, 1, "山泉从石缝流下来，是干净水源。", ["清水", "鱼", "草药"]),
    c("mt_forestry", "北岭林场", "wild", 3, 0, 2, "成片松林，伐木道痕迹还在。", ["木材", "松脂", "野味"]),
    c("mt_ridge_n", "北面山脊", "mountain", 4, 0, 3, "风很大，能望到江城全貌。", ["望远镜", "矿石"]),
    c("mt_cave_n", "北岩洞", "wild", 5, 0, 3, "洞口塌了一角，里面很深。", ["矿石", "蝙蝠粪", "岩钉"]),

    // ── 第 1 行 ──
    c("mt_rv_park", "房车停放点", "mountain", 0, 1, 1, "半山腰一块平地，房车现在停这儿。", ["备件", "燃油"]),
    c("mt_ledge", "山腰平台", "mountain", 1, 1, 2, "建要塞之前住过的帐篷点，能俯瞰城区。", ["睡袋", "望远镜"]),
    c("mt_waterfall", "小瀑布", "water", 2, 1, 2, "落差三米，水声盖住一切动静。", ["清水", "草药"]),
    c("mt_bamboo", "竹林", "wild", 3, 1, 1, "竹子长得极密，砍了能搭架子。", ["竹材", "竹笋"]),
    c("mt_herb_slope", "采药坡", "wild", 4, 1, 2, "向阳的缓坡，药草长得比别处好。", ["草药", "蜂蜜"]),
    c("mt_old_shrine", "山神庙", "ruin", 5, 1, 2, "小庙早就塌了，香案底下有暗格。", ["铜器", "供品", "暗格"]),

    // ── 第 2 行 ──
    c("mt_cliff_path", "岩壁通道", "mountain", 0, 2, 3, "贴着岩壁凿出的窄路，一人侧身能过。", ["岩钉", "钢索"]),
    c("mt_quarry_small", "小石场", "wild", 1, 2, 2, "山民采石头留下的坑，碎石很多。", ["碎石", "钢钎"]),
    c("mt_tunnel_mouth", "防空隧道口", "mountain", 2, 2, 2, "冷战时期挖的通道，接进了要塞通风。", ["通风管", "电缆", "灯泡"]),
    c("mt_water_tank", "高位水池", "water", 3, 2, 1, "早年建的水池，能存十几吨水。", ["清水", "管件"]),
    c("mt_radio", "山顶电台", "mountain", 4, 2, 4, "铁塔还立着，机房偶尔能收到信号。", ["电子元件", "天线", "电池"]),
    c("mt_watchtower", "石砌瞭望台", "ruin", 5, 2, 2, "石头垒的老台子，视野极好。", ["石料", "望远镜"]),

    // ── 第 3 行 ──
    c("mt_south_cliff", "南麓断崖", "mountain", 0, 3, 3, "崖下就是城区。视野极好，也能往下扔东西。", ["藤蔓", "鸟蛋"]),
    c("mt_forest_s", "南坡林地", "wild", 1, 3, 2, "朝南的坡，树长得壮。", ["木材", "野果"]),
    c("mt_fortress_out", "要塞外围", "base", 2, 3, 1, "铁丝网、壕沟、哨位。主角一个人弄出来的。", ["铁丝", "沙袋", "木桩"]),
    c("mt_fortress_side", "要塞侧翼", "base", 3, 3, 1, "岩壁上的射击位，控制上山唯一的路。", ["沙袋", "钢板"]),
    c("mt_hangar", "秘密机库", "base", 4, 3, 1, "山体里掏出来的空间，能停车也能藏东西。", []),
    c("mt_lab_gate", "研究所入口", "lab", 5, 3, 4, "水泥井盖下面是铁梯，通往地下。", ["门禁卡", "数据盘"]),

    // ── 第 4 行 ──
    c("mt_spring_s", "南泉", "water", 0, 4, 1, "从岩缝渗出的泉眼，常年不冻。", ["清水", "草药"]),
    c("mt_terraces", "梯田", "farm", 1, 4, 1, "山民开的小块梯田，还能种东西。", ["蔬菜", "种子", "农具"]),
    c("mt_workshop_out", "山脚工棚", "base", 2, 4, 1, "搭建时用的工棚，工具都还在。", ["工具", "建材", "钢材"]),
    c("mt_fortress", "山体要塞", "base", 3, 4, 0,
      "整座要塞的门面。岩壁里嵌着防爆门。", [],
      { sub: { id: "fortress_inside", label: "进入要塞内部", at: "ft_entry" } }),
    c("mt_back_tunnel", "后山暗道", "mountain", 4, 4, 2, "要塞的第二出口，只主角知道。", []),
    c("mt_drop_shaft", "垂直风井", "mountain", 5, 4, 3, "通到要塞通风系统的竖井，可以攀绳下去。", ["绳索", "岩钉"]),

    // ── 第 5 行 ──
    c("mt_graveyard", "山中墓园", "ruin", 0, 5, 2, "山民的老坟，石碑上刻着名字。", ["铜器", "供品"]),
    c("mt_road_south", "南麓山路", "road", 1, 5, 2, "盘山公路的一段，通向城南。", ["碎石", "路牌"]),
    c("mt_gate_south", "要塞南门", "base", 2, 5, 1, "车能开到的唯一入口，门是双层的。", ["沙袋", "钢板"]),
    c("mt_garage_out", "外围车棚", "base", 3, 5, 1, "停备用车和拖车的地方。", ["燃油", "备件"]),
    c("mt_sewage", "排水暗渠", "ruin", 4, 5, 3, "雨水和污水的出口，能钻人。", ["藤蔓", "工具"]),
    c("mt_lookout_s", "南哨位", "base", 5, 5, 1, "正对上山路的哨岗，24 小时有人。", ["沙袋", "照明件"])
  ]
};

/* ==================== 子地图 要塞内部（36 格） ==================== */

export const MAP_FORTRESS: GameMap = {
  id: "fortress_inside", name: "要塞内部", subtitle: "基地核心",
  cols: 6, rows: 6, kind: "sub", parent: "beiling",
  cells: [
    // ── 第 0 行：地表层 ──
    c("ft_entry", "防爆门厅", "interior", 0, 0, 0,
      "两道防爆门，中间是缓冲区。", [],
      { exits: [{ dir: "W", toMap: "beiling", toCell: "mt_fortress", label: "出要塞" }] }),
    c("ft_villa", "地表别墅", "interior", 1, 0, 0, "伪装成度假屋，是对外的门面。", []),
    c("ft_garage", "车库", "interior", 2, 0, 0, "房车停这，还有一辆备用皮卡。", ["燃油", "备件"]),
    c("ft_power", "动力室", "interior", 3, 0, 0, "柴油机组、发电设备与配电盘。", ["柴油", "电瓶"]),
    c("ft_water", "蓄水层", "interior", 4, 0, 0, "山泉引下的储水罐，接了三层过滤。", ["清水", "滤芯"]),
    c("ft_air", "通风机房", "interior", 5, 0, 0, "整座山的呼吸系统，接的是防空隧道。", ["滤网", "风机零件"]),

    // ── 第 1 行：生活层 ──
    c("ft_hall", "中央大厅", "interior", 0, 1, 0, "要塞枢纽，所有人都会经过这里。", []),
    c("ft_kitchen", "厨房食堂", "interior", 1, 1, 0, "灶台、长桌、储备粮架。", ["食材", "调味料"]),
    c("ft_living", "生活区", "interior", 2, 1, 0, "一排房间，每人一间。", []),
    c("ft_medbay", "医务室", "interior", 3, 1, 0, "手术台、药柜、两张病床。", ["药品", "绷带"]),
    c("ft_bath", "公共浴室", "interior", 4, 1, 0, "温泉引水，全天有热水。", []),
    c("ft_laundry", "洗衣房", "interior", 5, 1, 0, "成排洗衣机与烘干设备。", ["清洁剂", "零件"]),

    // ── 第 2 行：个人房间 ──
    c("ft_room_hero", "主角房间", "interior", 0, 2, 0, "双人床、独立浴室、工作台、保险柜。", []),
    c("ft_room_ai", "AI 机房室", "interior", 1, 2, 0, "服务器柜、备用电源、移动载体充电座。", []),
    c("ft_room_a", "同伴房间 A", "interior", 2, 2, 0, "大床、梳妆台、衣帽间、独立浴室。", []),
    c("ft_room_b", "同伴房间 B", "interior", 3, 2, 0, "大床、单人沙发、小厨房角落。", []),
    c("ft_room_c", "同伴房间 C", "interior", 4, 2, 0, "单人床、书桌、猫窝、玩偶架。", []),
    c("ft_room_empty", "空房间 ×2", "interior", 5, 2, 0, "为将来加入的同伴预留，可扩建。", []),

    // ── 第 3 行：技术层 ──
    c("ft_workshop", "工坊", "interior", 0, 3, 0, "车床、焊台、零件架。装备和道具在这造。", ["零件", "钢材"]),
    c("ft_lab", "研究室", "interior", 1, 3, 0, "科技树在这推进。", ["试剂", "硬盘"]),
    c("ft_armory", "军械库", "interior", 2, 3, 0, "枪架、弹药箱、防弹衣挂钩。", ["弹药", "枪械零件"]),
    c("ft_armor_wb", "装甲工位", "interior", 3, 3, 0, "车辆装甲改装与机器人组装。", ["装甲板", "焊接件"]),
    c("ft_robot_bay", "机器人机库", "interior", 4, 3, 0, "所有巡逻与随行机器人的停放与维护位。", ["零件", "电池"]),
    c("ft_drone_bay", "无人机机库", "interior", 5, 3, 0, "无人机停放、充电与挂弹。", []),

    // ── 第 4 行：核心层 ──
    c("ft_server", "核心机房", "interior", 0, 4, 0, "主服务器。特殊 AI 的物理载体之一。", ["硬盘", "冷却液"]),
    c("ft_cell", "收容室", "interior", 1, 4, 0, "带锁的房间，用来关不配合的人。", []),
    c("ft_nursery", "育婴房", "interior", 2, 4, 0, "为后代准备的房间，温控与看护设备齐全。", []),
    c("ft_vault", "储物库", "interior", 3, 4, 0, "要塞的总仓库，恒温恒湿。", ["物资箱", "货架"]),
    c("ft_cold", "冷藏库", "interior", 4, 4, 0, "长时间保存食物与药品。", ["冻品", "药品"]),
    c("ft_gym", "训练场", "interior", 5, 4, 0, "提升同伴战斗与技能的地方。", ["护具", "器械"]),

    // ── 第 5 行：深层 ──
    c("ft_tunnel", "后山暗道口", "interior", 0, 5, 1, "要塞第二出口，通向后山。", []),
    c("ft_escape_shaft", "逃生井", "interior", 1, 5, 0, "直通山体外的竖井，带绳索与缓降器。", ["绳索", "缓降器"]),
    c("ft_safe_nook", "安全暗格", "interior", 2, 5, 0, "极隐蔽的小空间，把家人藏起来的地方。", []),
    c("ft_deep_lab", "深层实验室", "interior", 3, 5, 0, "更高等级的科技研究需要在这进行。", ["试剂", "数据盘"]),
    c("ft_reactor", "能源核心", "interior", 4, 5, 0, "聚变电站所在，全要塞的心脏。", []),
    c("ft_self_destruct", "自毁装置", "interior", 5, 5, 0, "守不住时炸毁要塞。需要双人授权。", [])
  ]
};

export const ALL_MAPS: GameMap[] = [
  MAP_CITY_SOUTH, MAP_CITY_CENTER, MAP_CITY_EAST, MAP_MOUNTAIN, MAP_FORTRESS
];
export const MAIN_MAPS: GameMap[] = [MAP_CITY_SOUTH, MAP_CITY_CENTER, MAP_CITY_EAST];

export function getMap(id: string): GameMap | undefined { return ALL_MAPS.find((m) => m.id === id); }
export function getCell(mapId: string, cellId: string): MapCellData | undefined {
  return getMap(mapId)?.cells.find((c) => c.id === cellId);
}
export function cellAt(mapId: string, x: number, y: number): MapCellData | undefined {
  return getMap(mapId)?.cells.find((c) => c.x === x && c.y === y);
}

export type NeighborResult =
  | { kind: "move"; map: string; cell: MapCellData }
  | { kind: "exit"; map: string; cellId: string; label: string }
  | null;

export function neighbor(mapId: string, cellId: string, dir: ExitDir): NeighborResult {
  const cell = getCell(mapId, cellId);
  if (!cell) return null;
  const ex = cell.exits?.find((e) => e.dir === dir);
  if (ex) return { kind: "exit", map: ex.toMap, cellId: ex.toCell, label: ex.label };
  const [dx, dy] = DIR_DELTA[dir];
  const nb = cellAt(mapId, cell.x + dx, cell.y + dy);
  if (nb) return { kind: "move", map: mapId, cell: nb };
  return null;
}

export interface DirOption {
  dir: ExitDir;
  arrow: string;
  label: string;
  kind: "move" | "exit";
  name: string;
  danger: number | null;
  icon: string;
}

export function availableDirs(mapId: string, cellId: string): DirOption[] {
  const out: DirOption[] = [];
  for (const dir of ["N", "W", "E", "S"] as ExitDir[]) {
    const n = neighbor(mapId, cellId, dir);
    if (!n) continue;
    if (n.kind === "move") {
      out.push({
        dir, arrow: DIR_ARROW[dir], label: DIR_LABEL[dir], kind: "move",
        name: n.cell.name, danger: n.cell.danger, icon: KIND_ICON[n.cell.kind]
      });
    } else {
      const t = getCell(n.map, n.cellId);
      out.push({
        dir, arrow: DIR_ARROW[dir], label: DIR_LABEL[dir], kind: "exit",
        name: t?.name ?? n.label, danger: t?.danger ?? null,
        icon: t ? KIND_ICON[t.kind] : "⇢"
      });
    }
  }
  return out;
}

export function mapStats(mapId: string) {
  const m = getMap(mapId);
  if (!m) return null;
  const explored = m.cells.filter((c) => !c.locked).length;
  const cells = m.cells.length || 1;
  const avg = Math.round(m.cells.reduce((s, c) => s + c.danger, 0) / cells * 10) / 10;
  const safe = m.cells.filter((c) => c.danger === 0).length;
  return { total: m.cells.length, explored, danger: avg, safe, cols: m.cols, rows: m.rows };
}

export function worldStats() {
  let total = 0, safe = 0;
  for (const m of ALL_MAPS) for (const c of m.cells) { total++; if (c.danger === 0) safe++; }
  return { maps: ALL_MAPS.length, cells: total, safeCells: safe };
}
