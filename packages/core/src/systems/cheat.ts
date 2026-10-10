/**
 * 内置作弊器。
 *
 * 设计原则：
 *  - 开启主开关即全开（不设轻度/中度分档）
 *  - 控制台 / 成就记录 / 存档标记 三项由玩家自选，与主开关解耦
 *  - 覆盖游戏全部系统，不因开作弊封锁任何内容
 *  - 每项作弊标注它影响的系统，便于玩家理解
 *
 * 纯函数式。
 */

export interface CheatOptions {
  enabled: boolean;
  console: boolean;
  recordAchievements: boolean;
  markSave: boolean;
}

export const DEFAULT_CHEAT: CheatOptions = {
  enabled: false,
  console: false,
  recordAchievements: false,
  markSave: true
};

// ============ 作弊分类 ============

export type CheatCategory =
  | "vitals"      // 生存
  | "hero"        // 主角成长
  | "harem"       // 后宫成长
  | "intimacy"    // 亲密与熟练度
  | "base"        // 基地与科技
  | "vehicle"     // 房车
  | "world"       // 世界与探索
  | "combat"      // 战斗
  | "defense"     // 防御
  | "pregnancy"   // 生育
  | "quest"       // 主线
  | "time"        // 时间
  | "sharing"     // 加成共享
  | "meta";       // 元操作

export const CHEAT_CATEGORY_LABEL: Record<CheatCategory, string> = {
  vitals: "生存状态",
  hero: "主角成长",
  harem: "后宫成长",
  intimacy: "亲密与熟练度",
  base: "基地与科技",
  vehicle: "房车",
  world: "世界与探索",
  combat: "战斗",
  defense: "防御",
  pregnancy: "生育",
  quest: "主线",
  time: "时间",
  sharing: "加成共享",
  meta: "元操作"
};

export const CHEAT_CATEGORY_ICON: Record<CheatCategory, string> = {
  vitals: "♥",
  hero: "★",
  harem: "♛",
  intimacy: "❋",
  base: "⌂",
  vehicle: "▤",
  world: "◎",
  combat: "⚔",
  defense: "⛨",
  pregnancy: "☘",
  quest: "✦",
  time: "◷",
  sharing: "⇄",
  meta: "⌘"
};

/** 单条作弊操作的定义 */
export interface CheatActionDef {
  id: string;
  name: string;
  category: CheatCategory;
  /** 说明它做什么 */
  description: string;
  /** 是否需要额外参数（如指定同伴） */
  needsTarget?: boolean;
}

/** 全部作弊操作 */
export const CHEAT_ACTIONS: CheatActionDef[] = [
  // ---- 生存状态 ----
  { id: "vitals_full", name: "状态全满", category: "vitals", description: "体力/饥饿/口渴/精力/心情全部拉满" },
  { id: "vitals_zero_lust", name: "欲情清零", category: "vitals", description: "主角与全部同伴的欲情归零" },
  { id: "vitals_max_lust", name: "欲情拉满", category: "vitals", description: "主角与全部同伴的欲情拉满" },
  { id: "vitals_heal", name: "清除全部伤病", category: "vitals", description: "主角与同伴恢复健康，清除受伤状态" },

  // ---- 主角成长 ----
  { id: "hero_max_level", name: "等级拉满", category: "hero", description: "主角等级直接升到 99" },
  { id: "hero_max_points", name: "属性点给满", category: "hero", description: "给予 500 点可用属性点" },
  { id: "hero_max_attrs", name: "属性全满", category: "hero", description: "六维属性全部拉满到上限" },
  { id: "hero_max_skills", name: "技能全满", category: "hero", description: "七项技能全部升到 10 级" },
  { id: "hero_max_exp", name: "经验给足", category: "hero", description: "给予大量经验值" },

  // ---- 后宫成长 ----
  { id: "harem_max_level", name: "全员等级拉满", category: "harem", description: "全部同伴升到 99 级" },
  { id: "harem_max_skills", name: "全员技能全满", category: "harem", description: "同伴六项技能全部升到 10 级" },
  { id: "harem_max_mood", name: "全员心情拉满", category: "harem", description: "同伴心情全部 100" },
  { id: "harem_max_stamina", name: "全员体力拉满", category: "harem", description: "同伴体力恢复至上限" },
  { id: "harem_max_perks", name: "解锁全部被动增益", category: "harem", description: "直接获得全部 8 项被动增益" },
  { id: "harem_max_tier", name: "亲密度拉满", category: "harem", description: "全部同伴亲密度层级升到 5" },
  { id: "harem_heal", name: "全员治愈", category: "harem", description: "清除全部同伴的伤" },

  // ---- 亲密与熟练度 ----
  { id: "intimacy_max_prof", name: "主角熟练度全满", category: "intimacy", description: "全部部位熟练度升到 10 级" },
  { id: "intimacy_max_comp_prof", name: "同伴熟练度全满", category: "intimacy", description: "全部同伴的部位熟练度升到 10 级" },
  { id: "intimacy_prep_all", name: "后庭准备全完成", category: "intimacy", description: "全部同伴的后庭准备直接完成" },
  { id: "intimacy_clear_prep", name: "重置后庭准备", category: "intimacy", description: "清除全部准备进度（用于重看流程）" },
  { id: "intimacy_toys", name: "道具全给", category: "intimacy", description: "给予全部成人道具与清洁用品" },
  { id: "intimacy_unlock_all", name: "解锁全部行为", category: "intimacy", description: "熟练度与前置全部满足" },

  // ---- 基地与科技 ----
  { id: "base_unlock_tech", name: "科技全解锁", category: "base", description: "解锁全部 127 个科技节点" },
  { id: "base_build_all", name: "基地全建成", category: "base", description: "45 座设施全部满级" },
  { id: "base_clear_queue", name: "清空建造队列", category: "base", description: "取消正在进行的建造" },
  { id: "base_materials", name: "材料给足", category: "base", description: "给予全部建材与合成材料" },

  // ---- 房车 ----
  { id: "vehicle_all_mods", name: "改装全装", category: "vehicle", description: "23 项改装全部安装" },
  { id: "vehicle_full_tank", name: "燃料电量加满", category: "vehicle", description: "油箱与电池全部充满" },
  { id: "vehicle_repair", name: "车况修复", category: "vehicle", description: "车况恢复到 100%" },

  // ---- 世界与探索 ----
  { id: "world_discover_all", name: "地图全开", category: "world", description: "发现全部 17 个区域" },
  { id: "world_clear_all", name: "全区域清理", category: "world", description: "全部区域清理完毕" },
  { id: "world_unlimited_loot", name: "搜刮点补满", category: "world", description: "全部区域的搜刮点恢复" },

  // ---- 战斗 ----
  { id: "combat_win", name: "立即结束战斗", category: "combat", description: "当前战斗直接判定胜利" },
  { id: "combat_end", name: "退出战斗", category: "combat", description: "无条件脱离当前战斗" },
  { id: "combat_weapons", name: "武器弹药全给", category: "combat", description: "给予全部武器与弹药" },

  // ---- 防御 ----
  { id: "defense_max", name: "防御拉满", category: "defense", description: "围墙/声望/安全等级全部最优" },
  { id: "defense_clear_captured", name: "营救全部被掳", category: "defense", description: "立即救回全部被掳同伴" },
  { id: "defense_skip_raid", name: "取消今晚夜袭", category: "defense", description: "清除待处理的夜袭事件" },

  // ---- 生育 ----
  { id: "pregnancy_hero", name: "主角立即怀孕", category: "pregnancy", description: "主角进入怀孕状态" },
  { id: "pregnancy_all", name: "全员怀孕", category: "pregnancy", description: "全部符合条件的同伴怀孕" },
  { id: "pregnancy_deliver", name: "立即分娩", category: "pregnancy", description: "全部怀孕者立即生产" },
  { id: "pregnancy_clear", name: "清除怀孕状态", category: "pregnancy", description: "解除全部怀孕" },

  // ---- 主线 ----
  { id: "quest_unlock_all", name: "解锁全部后宫", category: "quest", description: "21 位角色全部加入队伍" },
  { id: "quest_complete_all", name: "主线全部完成", category: "quest", description: "跳过全部主线步骤" },
  { id: "quest_max_relations", name: "关系拉满", category: "quest", description: "好感/忠诚/羁绊全部最大" },
  { id: "quest_reset_relations", name: "关系重置", category: "quest", description: "关系恢复到初始值" },

  // ---- 时间 ----
  { id: "time_advance_day", name: "推进一天", category: "time", description: "游戏内时间 +1 天" },
  { id: "time_advance_week", name: "推进一周", category: "time", description: "游戏内时间 +7 天" },
  { id: "time_set_morning", name: "设为清晨", category: "time", description: "时间设为 07:00" },
  { id: "time_set_night", name: "设为深夜", category: "time", description: "时间设为 23:00" },

  // ---- 加成共享 ----
  { id: "sharing_all_on", name: "全部授权给后宫", category: "sharing", description: "32 项加成全部共享" },
  { id: "sharing_all_off", name: "全部取消授权", category: "sharing", description: "后宫不享受任何加成" },
  { id: "sharing_reset", name: "恢复默认授权", category: "sharing", description: "按设计默认值重置" },

  // ---- 元操作 ----
  { id: "meta_full_unlock", name: "一键全开", category: "meta", description: "执行全部作弊操作（除时间类）" },
  { id: "meta_export_state", name: "导出状态摘要", category: "meta", description: "输出当前游戏状态概览" }
];

const ACTION_BY_ID = new Map(CHEAT_ACTIONS.map((a) => [a.id, a]));

export function cheatActionDef(id: string): CheatActionDef | undefined {
  return ACTION_BY_ID.get(id);
}

export function cheatsByCategory(c: CheatCategory): CheatActionDef[] {
  return CHEAT_ACTIONS.filter((a) => a.category === c);
}

export const CHEAT_CATEGORIES: CheatCategory[] = [
  "vitals", "hero", "harem", "intimacy", "base", "vehicle",
  "world", "combat", "defense", "pregnancy", "quest", "time",
  "sharing", "meta"
];

export function cheatStats(): {
  total: number;
  byCategory: Record<string, number>;
} {
  const byCategory: Record<string, number> = {};
  for (const a of CHEAT_ACTIONS) {
    byCategory[a.category] = (byCategory[a.category] ?? 0) + 1;
  }
  return { total: CHEAT_ACTIONS.length, byCategory };
}

// ============ 效果开关（用于运行时判定） ============

export interface CheatEffects {
  infiniteVitals: boolean;
  infiniteResources: boolean;
  godMode: boolean;
  oneHitKill: boolean;
  maxStats: boolean;
  noCooldown: boolean;
  stealth: boolean;
  speedMult: number;
  infiniteWeight: boolean;
  unlockAllTech: boolean;
  instantResearch: boolean;
  maxAffection: boolean;
  maxLoyalty: boolean;
  unlockAllHarem: boolean;
  instantPregnancy: boolean;
  instantBuild: boolean;
  freezeTime: boolean;
}

export const CHEAT_ALL_ON: CheatEffects = {
  infiniteVitals: true,
  infiniteResources: true,
  godMode: true,
  oneHitKill: true,
  maxStats: true,
  noCooldown: true,
  stealth: true,
  speedMult: 3,
  infiniteWeight: true,
  unlockAllTech: true,
  instantResearch: true,
  maxAffection: true,
  maxLoyalty: true,
  unlockAllHarem: true,
  instantPregnancy: true,
  instantBuild: true,
  freezeTime: false
};

export function effectsFor(opt: CheatOptions): CheatEffects | null {
  if (!opt.enabled) return null;
  return { ...CHEAT_ALL_ON };
}

/** 存档角标 */
export function saveBadge(opt: CheatOptions): string | null {
  return opt.enabled && opt.markSave ? "CHEAT" : null;
}

// ============ 控制台 ============

export interface CheatCommand {
  cmd: string;
  args: string[];
}

export function parseCommand(input: string): CheatCommand | null {
  const s = input.trim();
  if (!s.startsWith("/")) return null;
  const [cmd, ...args] = s.slice(1).split(/\s+/);
  return { cmd, args };
}

export type CommandHandler = (c: CheatCommand) => string;

/** 内置命令帮助文本 */
export const CONSOLE_HELP: Array<{ cmd: string; desc: string }> = [
  { cmd: "/help", desc: "显示本帮助" },
  { cmd: "/act <同伴id> <行为id>", desc: "执行一次亲密行为" },
  { cmd: "/enema <同伴id>", desc: "完成后庭准备" },
  { cmd: "/train <同伴id> <小时> <技能>", desc: "训练同伴" },
  { cmd: "/exp <数值>", desc: "给主角经验" },
  { cmd: "/attr <属性>", desc: "给主角加点" },
  { cmd: "/share <键> <on|off>", desc: "切换加成共享" },
  { cmd: "/spawn <物品id> <数量>", desc: "添加物品到仓库" },
  { cmd: "/flag <键> <值>", desc: "设置标志位" },
  { cmd: "/state", desc: "输出状态摘要" }
];

export class CheatConsole {
  private handlers = new Map<string, CommandHandler>();
  private opt: CheatOptions;

  constructor(opt: CheatOptions) {
    this.opt = opt;
  }

  register(cmd: string, h: CommandHandler): void {
    this.handlers.set(cmd, h);
  }

  /** 注册默认帮助命令 */
  registerHelp(): void {
    this.register("help", () =>
      CONSOLE_HELP.map((h) => `${h.cmd.padEnd(28)} ${h.desc}`).join("\n")
    );
  }

  exec(input: string): string {
    if (!this.opt.enabled || !this.opt.console) return "控制台未启用";
    const c = parseCommand(input);
    if (!c) return "无法识别的输入（命令需以 / 开头）";
    const h = this.handlers.get(c.cmd);
    if (!h) return `未知命令：/${c.cmd}（输入 /help 查看可用命令）`;
    return h(c);
  }

  /** 已注册的命令数 */
  commandCount(): number {
    return this.handlers.size;
  }
}
