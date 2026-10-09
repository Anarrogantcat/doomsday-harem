import { create } from "zustand";
import {
  GameSession, effectsFor, saveBadge, DEFAULT_CHEAT, allScriptTexts,
  type CheatOptions, type CheatEffects,
  type CompanionRuntime, type Activity, type JobId,
  type Weather, type ClothingSlot, type BodyZone,
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

  equipClothing: (who: string, itemId: string) => void;
  unequipClothing: (who: string, slot: ClothingSlot) => void;
  undress: (who: string) => void;
  stripAll: (who: string) => void;
  setWeather: (weather: Weather) => void;
  loot: (tableId: string) => void;
  useItem: (itemId: string) => void;
  takeFromStorage: (itemId: string, n?: number) => void;
  putToStorage: (itemId: string, n?: number) => void;
  craftItem: (recipeId: string) => void;
  beginBuild: (facilityId: string) => void;
  finishBuild: (facilityId: string) => void;
  finishAllBuilds: (level?: "surface" | "bunker" | "resource") => void;
  demolishFacility: (facilityId: string) => void;
  travelTo: (regionId: string, mode?: "walk" | "bike" | "car" | "apc") => void;
  setTravelMode: (mode: "walk" | "bike" | "car" | "apc") => void;
  lootCurrent: () => void;
  clearCurrent: () => void;
  installVehicleMod: (modId: string) => void;
  uninstallVehicleMod: (modId: string) => void;
  installAllVehicleMods: () => void;
  refuelVehicle: (liters: number) => void;
  repairVehicle: () => void;
  advanceQuest: (questId: string) => void;
  pauseQuest: (questId: string) => void;
  resumeQuest: (questId: string) => void;
  tryRecruitHere: () => void;
  triggerRaid: (kind: string) => void;
  rescueCaptured: (companionId: string) => void;
  repairWall: () => void;
  rollRaid: () => void;
  repairClothing: (who: string) => void;

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

  equipClothing: (who, itemId) => {
    const { session, pushLog, refresh } = get();
    session.equipClothing(who, itemId);
    const name = who === "hero" ? "主角" : session.companion(who)?.identity.name ?? who;
    pushLog(`${name} 换上了 ${itemId}`);
    refresh();
  },

  unequipClothing: (who, slot) => {
    const { session, pushLog, refresh } = get();
    session.unequipClothing(who, slot);
    const name = who === "hero" ? "主角" : session.companion(who)?.identity.name ?? who;
    pushLog(`${name} 脱下了 ${slot}`);
    refresh();
  },

  undress: (who) => {
    const { session, pushLog, refresh } = get();
    const r = session.undress(who);
    const name = who === "hero" ? "主角" : session.companion(who)?.identity.name ?? who;
    pushLog(r.item ? `${name} 脱掉 ${r.item.name}（暴露度 ${r.exposure}）` : `${name} 已无可脱`);
    refresh();
  },

  stripAll: (who) => {
    const { session, pushLog, refresh } = get();
    const removed = session.stripAll(who);
    const name = who === "hero" ? "主角" : session.companion(who)?.identity.name ?? who;
    pushLog(`${name} 脱光（${removed.length} 件）`);
    refresh();
  },

  loot: (tableId) => {
    const { session, pushLog, refresh } = get();
    const seed = session.time.day * 1000 + session.time.minute;
    const r = session.loot(tableId, seed);
    if (r.got.length === 0) pushLog(`搜刮 ${tableId}：一无所获`);
    else pushLog(`搜刮 ${tableId}：${r.got.map((g) => `${g.id}×${g.n}`).join("、")}`);
    refresh();
  },

  useItem: (itemId) => {
    const { session, pushLog, refresh } = get();
    const fx = session.useItem(itemId);
    if (!fx) pushLog(`没有 ${itemId} 可用`);
    else pushLog(`使用 ${itemId}：${Object.entries(fx).map(([k, v]) => `${k}+${v}`).join(" ")}`);
    refresh();
  },

  takeFromStorage: (itemId, n = 1) => {
    const { session, pushLog, refresh } = get();
    const moved = session.takeFromStorage(itemId, n);
    pushLog(moved > 0 ? `取出 ${itemId}×${moved}` : `取出失败（背包已满）`);
    refresh();
  },

  putToStorage: (itemId, n = 1) => {
    const { session, pushLog, refresh } = get();
    const moved = session.putToStorage(itemId, n);
    pushLog(moved > 0 ? `存入 ${itemId}×${moved}` : "存入失败");
    refresh();
  },

  craftItem: (recipeId) => {
    const { session, pushLog, refresh } = get();
    const r = session.craft(recipeId);
    if (r.ok) pushLog(`合成完成：${recipeId}`);
    else pushLog(`合成失败：${r.missingTech.length ? "缺科技 " + r.missingTech.join("、") : "缺材料"}`);
    refresh();
  },

  beginBuild: (facilityId) => {
    const { session, pushLog, refresh } = get();
    const r = session.beginBuild(facilityId);
    if (r.ok) pushLog(`开工：${facilityId}`);
    else pushLog(`无法开工 ${facilityId}（${r.reason}）`);
    refresh();
  },

  finishBuild: (facilityId) => {
    const { session, pushLog, refresh } = get();
    session.finishBuild(facilityId);
    pushLog(`秒建成：${facilityId}`);
    refresh();
  },

  finishAllBuilds: (level) => {
    const { session, pushLog, refresh } = get();
    session.finishAllBuilds(level);
    pushLog(`一键建成：${level ?? "全部"}`);
    refresh();
  },

  demolishFacility: (facilityId) => {
    const { session, pushLog, refresh } = get();
    session.demolishFacility(facilityId);
    pushLog(`拆除：${facilityId}`);
    refresh();
  },

  travelTo: (regionId, mode) => {
    const { session, pushLog, refresh } = get();
    const r = session.travelTo(regionId, mode);
    if (!r.ok) {
      pushLog(`无法前往 ${regionId}（${r.reason}）`);
    } else {
      pushLog(`抵达 ${session.here()?.name ?? regionId}（${r.plan.km}km，${r.plan.hours.toFixed(1)}h）`);
      if (r.discovered.length > 0) pushLog(`途中发现：${r.discovered.join("、")}`);
      if (r.encounters > 0) pushLog(`途中遭遇 ${r.encounters} 次`);
    }
    refresh();
  },

  setTravelMode: (mode) => {
    const { session, pushLog, refresh } = get();
    session.setTravelMode(mode);
    pushLog(`交通方式：${mode}`);
    refresh();
  },

  lootCurrent: () => {
    const { session, pushLog, refresh } = get();
    const r = session.lootCurrent();
    if (r.exhausted) pushLog("此处已无可搜刮的资源");
    else pushLog(`搜刮 ${r.tableId}：${r.got.length ? r.got.map((g) => `${g.id}×${g.n}`).join("、") : "一无所获"}`);
    refresh();
  },

  clearCurrent: () => {
    const { session, pushLog, refresh } = get();
    const n = session.clearCurrent();
    pushLog(n > 0 ? `清理区域，危险度下降 ${n}` : "此处已无可清理");
    refresh();
  },

  installVehicleMod: (modId) => {
    const { session, pushLog, refresh } = get();
    const r = session.installVehicleMod(modId);
    if (r.ok) pushLog(`房车改装完成：${modId}`);
    else pushLog(`改装失败 ${modId}（${r.reason}）`);
    refresh();
  },

  uninstallVehicleMod: (modId) => {
    const { session, pushLog, refresh } = get();
    session.uninstallVehicleMod(modId);
    pushLog(`卸下改装：${modId}`);
    refresh();
  },

  installAllVehicleMods: () => {
    const { session, pushLog, refresh } = get();
    session.installAllVehicleMods();
    pushLog("房车改装全部装齐");
    refresh();
  },

  refuelVehicle: (liters) => {
    const { session, pushLog, refresh } = get();
    session.refuelVehicle(liters);
    pushLog(`加油 ${liters}L（当前 ${session.vehicle.fuel.toFixed(0)}L）`);
    refresh();
  },

  repairVehicle: () => {
    const { session, pushLog, refresh } = get();
    session.repairVehicle(100);
    pushLog("房车已修复");
    refresh();
  },

  advanceQuest: (questId) => {
    const { session, pushLog, refresh } = get();
    const r = session.advanceQuest(questId);
    if (!r.ok) {
      pushLog(`主线 ${questId} 无法推进（${r.reason}）`);
    } else {
      pushLog(`主线推进：${r.step}`);
      if (r.rewardAffection) pushLog(`好感 +${r.rewardAffection}`);
      if (r.granted?.length) pushLog(`新同伴加入：${r.granted.map((g) => g.name).join("、")}`);
      if (r.questCompleted) pushLog(`★ 主线完成：${(r.rewards ?? []).join("、")}`);
    }
    refresh();
  },

  pauseQuest: (questId) => {
    const { session, pushLog, refresh } = get();
    session.pauseQuest(questId);
    pushLog(`主线暂停：${questId}`);
    refresh();
  },

  resumeQuest: (questId) => {
    const { session, pushLog, refresh } = get();
    session.resumeQuest(questId);
    pushLog(`主线继续：${questId}`);
    refresh();
  },

  tryRecruitHere: () => {
    const { session, pushLog, refresh } = get();
    const seed = session.time.day * 10000 + session.time.minute + session.companions.length;
    const r = session.tryRecruitHere(seed);
    if (!r.template) pushLog("附近没有遇到幸存者");
    else if (r.success) pushLog(`招募成功：${r.template.name}（${r.template.trait}）`);
    else pushLog(`遇到 ${r.template.name}，但对方拒绝了`);
    refresh();
  },

  triggerRaid: (kind) => {
    const { session, pushLog, refresh } = get();
    const r = session.triggerRaid(kind as never);
    if (!r) pushLog(`无法触发事件 ${kind}`);
    else pushLog(`${kind}：${r.outcome}（伤亡 ${r.casualties}，弹药 -${r.ammoUsed}）`);
    refresh();
  },

  rescueCaptured: (companionId) => {
    const { session, pushLog, refresh } = get();
    const seed = session.time.day * 1000 + session.time.minute;
    const ok = session.rescueCaptured(companionId, seed);
    pushLog(ok ? `营救成功：${companionId}` : `营救失败：${companionId}`);
    refresh();
  },

  repairWall: () => {
    const { session, pushLog, refresh } = get();
    const n = session.repairWall(1);
    pushLog(n > 0 ? `围墙修复 ${n} 级` : "围墙无需修复");
    refresh();
  },

  rollRaid: () => {
    const { session, pushLog, refresh } = get();
    const ev = session.rollTonightRaid();
    if (!ev) pushLog("今晚平安无事");
    else pushLog(`今晚有情况：${ev.def.description}`);
    refresh();
  },

  setWeather: (weather) => {
    const { session, pushLog, refresh } = get();
    session.setWeather(weather);
    pushLog(`天气变为 ${weather}`);
    refresh();
  },

  repairClothing: (who) => {
    const { session, pushLog, refresh } = get();
    session.repairClothing(who);
    pushLog("衣物已修补");
    refresh();
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