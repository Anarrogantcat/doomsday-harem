import { create } from "zustand";
import {
  GameSession, effectsFor, saveBadge, DEFAULT_CHEAT, allScriptTexts,
  type CheatOptions, type CheatEffects,
  type CompanionRuntime, type Activity, type JobId,
} from "@doomsday/core";
import {
  DEFAULT_LLM_SETTINGS, createNarrator, ensureAvailable,
  type LlmSettings, type ModelStatus, type Narrator,
} from "@doomsday/llm";

// 剧本由 scripts/gen-scripts.mjs 在构建前内联为模块
const SCRIPT_SOURCES: string[] = allScriptTexts();

/** 一次会话 + 由会话派生的界面状态 */
export interface GameState {
  session: GameSession;

  // 界面派生量（每次变更后由 refresh 重算）
  version: number;
  cheat: CheatOptions;
  llm: LlmSettings;
  narrator: Narrator | null;
  log: string[];

  // 操作
  refresh: () => void;
  pushLog: (line: string) => void;

  advanceHours: (hours: number, activity?: Activity) => void;
  sleepDays: (days?: number) => void;
  setJob: (id: string, job: JobId | null, bonus?: number) => void;
  satisfy: (id: string, kind?: "accept" | "raid" | "active" | "multi") => void;
  refuse: (id: string) => void;
  nightRaid: (id: string) => void;
  beginResearch: (nodeId: string) => void;
  forceComplete: (nodeId: string) => void;
  addResources: (res: Record<string, number>) => void;

  setCheat: (patch: Partial<CheatOptions>) => void;
  cheatEffects: () => CheatEffects | null;
  cheatBadge: () => string | null;

  setLlm: (patch: Partial<LlmSettings>) => void;
  testLlm: () => Promise<ModelStatus>;
  rebuildNarrator: () => Promise<void>;
}

/** 建一个已载入全部剧本的会话 */
function makeSession(): GameSession {
  const s = new GameSession({ resources: { "铜线": 40, "磁铁": 20, "水泥": 60, "钢筋": 40 } });
  s.loadScripts(SCRIPT_SOURCES);
  return s;
}

export const useGame = create<GameState>((set, get) => ({
  session: makeSession(),
  version: 0,
  cheat: { ...DEFAULT_CHEAT },
  llm: { ...DEFAULT_LLM_SETTINGS },
  narrator: null,
  log: [],

  refresh: () => set((s) => ({ version: s.version + 1 })),

  pushLog: (line) =>
    set((s) => ({
      log: [`第${s.session.day}天 ${line}`, ...s.log].slice(0, 200)
    })),

  advanceHours: (hours, activity = "idle") => {
    const { session, pushLog } = get();
    const before = session.tech.researching?.nodeId ?? null;
    const out = session.advance(hours, activity);
    session.tickCompanionLust(hours / 24);
    for (const w of out.warnings) pushLog(`⚠ ${w}`);
    if (out.completedTech && out.completedTech !== before) pushLog(`科技完成：${out.completedTech}`);
    get().refresh();
  },

  sleepDays: (days = 1) => {
    const { session, pushLog } = get();
    const out = session.sleep(days);
    session.tickCompanionLust(days);
    for (const w of out.warnings) pushLog(`⚠ ${w}`);
    pushLog(`睡了一觉（${days} 天）`);
    get().refresh();
  },

  setJob: (id, job, bonus = 0.15) => {
    const { session, pushLog } = get();
    session.setJob(id, job, bonus);
    const c = session.companion(id);
    pushLog(`${c?.identity.name ?? id} 调岗为 ${job ?? "空闲"}`);
    get().refresh();
  },

  satisfy: (id, kind = "active") => {
    const { session, pushLog } = get();
    const c = session.companion(id);
    session.satisfyCompanion(id, kind);
    pushLog(`与 ${c?.identity.name ?? id} 亲密（欲情清零）`);
    get().refresh();
  },

  refuse: (id) => {
    const { session, pushLog } = get();
    const c = session.companion(id);
    session.refuseCompanion(id);
    pushLog(`拒绝了 ${c?.identity.name ?? id}（好感不变）`);
    get().refresh();
  },

  nightRaid: (id) => {
    const { session, pushLog } = get();
    const c = session.companion(id);
    session.nightRaid(id);
    pushLog(`${c?.identity.name ?? id} 夜袭（无拒绝选项）`);
    get().refresh();
  },

  beginResearch: (nodeId) => {
    const { session, pushLog } = get();
    const r = session.beginResearch(nodeId);
    if (r.ok) pushLog(`开始研究：${nodeId}`);
    else pushLog(`无法研究 ${nodeId}（${r.reason}）`);
    get().refresh();
  },

  forceComplete: (nodeId) => {
    const { session, pushLog } = get();
    session.forceComplete(nodeId);
    pushLog(`秒完成：${nodeId}`);
    get().refresh();
  },

  addResources: (res) => {
    const { session, pushLog } = get();
    for (const [k, v] of Object.entries(res)) {
      session.resources[k] = (session.resources[k] ?? 0) + v;
    }
    pushLog(`获得物资：${Object.entries(res).map(([k, v]) => `${k}×${v}`).join("、")}`);
    get().refresh();
  },

  setCheat: (patch) => {
    set((s) => ({ cheat: { ...s.cheat, ...patch } }));
    const { cheat, session, refresh, pushLog } = get();
    // 作弊器与主循环开关联动
    if (cheat.enabled) {
      session.unlockEverything();
      for (const c of session.companions) {
        c.relationship = { ...c.relationship, affection: 100, loyalty: 100, bond: 5 };
        c.lust = { ...c.lust, value: 0 };
      }
      pushLog("作弊器已启用（全开）");
    }
    refresh();
  },

  cheatEffects: () => effectsFor(get().cheat),
  cheatBadge: () => saveBadge(get().cheat),

  setLlm: (patch) => {
    set((s) => ({ llm: { ...s.llm, ...patch } }));
    void get().rebuildNarrator();
  },

  testLlm: async () => {
    const { llm } = get();
    const { narrator, status } = await ensureAvailable(llm.config, true);
    set({ narrator });
    return status;
  },

  rebuildNarrator: async () => {
    const { llm } = get();
    if (!llm.enabled) {
      set({ narrator: null });
      return;
    }
    set({ narrator: createNarrator(llm.config, { retries: llm.retries }) });
  }
}));

export { DEFAULT_CHEAT };
export type { CompanionRuntime };