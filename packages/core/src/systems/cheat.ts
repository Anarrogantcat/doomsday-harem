/**
 * 内置作弊器。开启即全开（不设轻度/中度分档）。
 * 控制台 / 成就记录 / 存档 CHEAT 标记 三项由玩家自选。
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

/** 控制台命令解析（仅在 opt.console 为 true 时可用） */
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

export class CheatConsole {
  private handlers = new Map<string, CommandHandler>();
  private opt: CheatOptions;

  constructor(opt: CheatOptions) {
    this.opt = opt;
  }

  register(cmd: string, h: CommandHandler): void {
    this.handlers.set(cmd, h);
  }

  exec(input: string): string {
    if (!this.opt.enabled || !this.opt.console) return "控制台未启用";
    const c = parseCommand(input);
    if (!c) return "无法识别的输入";
    const h = this.handlers.get(c.cmd);
    if (!h) return `未知命令：/${c.cmd}`;
    return h(c);
  }
}
