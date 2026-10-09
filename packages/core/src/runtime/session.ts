/**
 * 游戏会话 —— 把所有系统串成一个可操作的整体。
 *
 * 职责边界：
 *  - 持有全部运行时状态（时间 / 主角 / 同伴 / 科技 / 资源 / 怀孕 / 标志位）
 *  - 暴露玩家可执行的操作（推进时间、研究、分配岗位、满足欲情、触发场景）
 *  - 提供存档往返（与 save/serialize.ts 对接）
 *  - 不触碰 IO、不依赖渲染 —— UI 层订阅它，Node 测试直接调用它
 */
import type { GameTime, TimeSlot } from "../types.ts";
import { makeTime, slot as slotOfTime } from "../time.ts";
import type { Survival, Lust, Relationship, Job, Physiology, Identity, JobId } from "../components.ts";
import { DEFAULT_LUST, DEFAULT_RELATIONSHIP, gain, satisfy, refuse, tickLust, type LustStage } from "../systems/relationship.ts";
import { tickSurvival, type Activity } from "../systems/survival.ts";
import { reassign, type JobAssignment } from "../systems/jobs.ts";
import { tick, fastForward, type TickInput, type TickOutput } from "./loop.ts";
import {
  newTechState, startResearch, tickResearch, unlock, unlockAll, reset as resetTechState,
  aggregateBonuses, branchProgress, isUnlocked, checkAvailability,
  type TechState, type BranchProgress, type Availability
} from "../tech/tree.ts";
import { findNode } from "../tech/branches.ts";
import { SceneRegistry } from "../registry/scene.ts";
import type { Vars } from "../script/condition.ts";
import type { Scene } from "../text/engine.ts";
import { startPregnancy, advancePregnancy, type Pregnancy, type Offspring, makeOffspring } from "../systems/pregnancy.ts";
import {
  type Wardrobe, type Weather, type WardrobePreset,
  presetWardrobe, wardrobeToJSON, wardrobeFromJSON,
  equip, unequip, wearFromStorage, equippedGarments,
  coverage, zoneCoverage, exposure, insulation, armor as armorOf, charm as charmOf,
  stealth as stealthOf, totalWeight, hasTag, uniformOk,
  undressStep, undressTo, undressAll, damage as damageCloth, conditionOf, repairAll, pruneBroken,
  suitability, describe as describeWardrobe, SLOT_LABEL,
  type ClothingSlot, type BodyZone, type ClothingItem, type Suitability
} from "../systems/clothing.ts";
import {
  type Container, type Quality,
  newContainer, newStorage, add, addMany, remove, countOf, totalCount, weightOf,
  canAfford, transfer, prune, use as useItem, rollLoot, lootTable,
  recipeById, canCraft, craft as craftRecipe,
  containerToJSON, containerFromJSON, describeContainer, itemDef, resolveItemId, normalizeCost
} from "../systems/inventory.ts";
import { newSave, type SaveData, type SavedEntity, type SavedRelation, type SavedJob, type SavedTech } from "../save/serialize.ts";
import { VERSION } from "../version.ts";

/** 一位同伴的运行时状态 */
export interface CompanionRuntime {
  id: string;
  identity: Identity;
  physiology: Physiology;
  relationship: Relationship;
  lust: Lust;
  job: Job;
  /** 当前着装 */
  wardrobe: Wardrobe;
  /** 是否已在队伍中（未加入的只存在于主线数据里） */
  joined: boolean;
}

/** 主角运行时状态 */
export interface HeroRuntime {
  id: string;
  identity: Identity;
  physiology: Physiology;
  survival: Survival;
  lust: Lust;
  pregnancy: Pregnancy | null;
  wardrobe: Wardrobe;
}

export interface SessionOptions {
  /** 初始时间 */
  time?: GameTime;
  /** 主角显示名 */
  heroName?: string;
  /** 欲情每日增长基数 */
  lustDailyGain?: number;
  /** 实验室研究效率倍率 */
  researchRate?: number;
  /** 初始资源（进仓库） */
  resources?: Record<string, number>;
  /** 背包重量上限 */
  backpackWeight?: number;
  /** 背包槽位上限 */
  backpackSlots?: number;
  /** 作弊器：秒完成研究 */
  instantResearch?: boolean;
  /** 作弊器：冻结时间 */
  freezeTime?: boolean;
}

const DEFAULT_SURVIVAL: Survival = { hunger: 80, thirst: 70, stamina: 90, energy: 85, mood: 60 };

/** 开局同伴（末日降临前已在安全屋的四位） */
function defaultCompanions(): CompanionRuntime[] {
  const mk = (
    id: string, name: string, title: string, age: number, heightCm: number,
    rel: Partial<Relationship>, lustValue: number, jobId: JobId | null, bonus: number,
    preset: WardrobePreset, tags: string[] = []
  ): CompanionRuntime => ({
    id,
    identity: { name, title, age, heightCm, tags },
    physiology: {
      sex: "female",
      virgin: id === "sister" || id === "sister2",
      pregnant: false,
      pregnancyProgress: 0,
      fertileWindow: false
    },
    relationship: { ...DEFAULT_RELATIONSHIP, role: "family", ...rel },
    lust: { ...DEFAULT_LUST, value: lustValue },
    job: { id: jobId, bonus, daysOnJob: 0 },
    wardrobe: presetWardrobe(preset),
    joined: true
  });

  return [
    mk("mother", "母亲", "单亲母亲", 45, 172,
       { affection: 50, loyalty: 40, bond: 3 }, 40, "kitchen", 0.20, "mother"),
    mk("sister", "姐姐", "项目经理", 26, 174,
       { affection: 60, loyalty: 50, bond: 3 }, 92, "logistics", 0.15, "sister"),
    mk("sister2", "妹妹", "大学生", 19, 162,
       { affection: 40, loyalty: 30, bond: 2 }, 85, "greenhouse", 0.10, "sister2"),
    mk("ai", "特殊AI", "基地核心", 1, 0,
       { affection: 85, loyalty: 80, bond: 4, role: "ai" }, 30, "archive", 0.20, "ai", ["ai", "no-body"])
  ];
}

export class GameSession {
  time: GameTime;
  hero: HeroRuntime;
  companions: CompanionRuntime[];
  tech: TechState;
  /** 主角随身背包（有容量限制） */
  backpack: Container;
  /** 据点仓库（无上限） */
  storage: Container;
  flags: Record<string, unknown>;
  registry: SceneRegistry;
  offspring: Offspring[];
  /** 当前天气，影响保暖判定 */
  weather: Weather;

  private opts: {
    heroName: string;
    lustDailyGain: number;
    researchRate: number;
    instantResearch: boolean;
    freezeTime: boolean;
  };

  constructor(options: SessionOptions = {}) {
    this.time = options.time ?? makeTime(1, 8 * 60);
    this.opts = {
      heroName: options.heroName ?? "主角",
      lustDailyGain: options.lustDailyGain ?? 5,
      researchRate: options.researchRate ?? 1,
      instantResearch: options.instantResearch ?? false,
      freezeTime: options.freezeTime ?? false
    };

    this.hero = {
      id: "hero",
      identity: {
        name: this.opts.heroName,
        title: "扶她御姐",
        age: 28,
        heightCm: 178,
        tags: ["futanari"]
      },
      physiology: {
        sex: "futanari",
        virgin: true,
        pregnant: false,
        pregnancyProgress: 0,
        fertileWindow: false
      },
      survival: { ...DEFAULT_SURVIVAL },
      lust: { ...DEFAULT_LUST, value: 20 },
      pregnancy: null,
      wardrobe: presetWardrobe("hero")
    };

    this.companions = defaultCompanions();
    this.tech = newTechState();
    this.backpack = newContainer(options.backpackWeight ?? 40, options.backpackSlots ?? 30);
    this.storage = newStorage();
    if (options.resources) {
      this.storage = addMany(this.storage, Object.entries(options.resources).map(([id, n]) => ({ id, n }))).container;
    }
    this.flags = {};
    this.registry = new SceneRegistry();
    this.offspring = [];
    this.weather = "clear";
  }

  /**
   * 兼容旧接口的只读资源视图（聚合背包 + 仓库）。
   * 科技树与旧测试按 { 名称: 数量 } 访问，这里保持可用。
   */
  get resources(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const s of [...this.backpack.stacks, ...this.storage.stacks]) {
      const def = itemDef(s.itemId);
      const key = def?.name ?? s.itemId;
      out[key] = (out[key] ?? 0) + s.count;
      // 同时暴露 id 键，便于新代码访问
      out[s.itemId] = (out[s.itemId] ?? 0) + s.count;
    }
    return out;
  }

  // ---------- 物品 ----------

  /** 加物品到仓库 */
  addToStorage(itemId: string, n = 1, quality: Quality = "common"): number {
    const r = add(this.storage, itemId, n, quality);
    this.storage = r.container;
    return r.added;
  }

  /** 加物品到背包 */
  addToBackpack(itemId: string, n = 1, quality: Quality = "common"): number {
    const r = add(this.backpack, itemId, n, quality);
    this.backpack = r.container;
    return r.added;
  }

  /** 从仓库取到背包 */
  takeFromStorage(itemId: string, n = 1): number {
    const r = transfer(this.storage, this.backpack, itemId, n);
    this.storage = r.from;
    this.backpack = r.to;
    return r.moved;
  }

  /** 背包放回仓库 */
  putToStorage(itemId: string, n = 1): number {
    const r = transfer(this.backpack, this.storage, itemId, n);
    this.backpack = r.from;
    this.storage = r.to;
    return r.moved;
  }

  /** 丢弃 */
  dropItem(itemId: string, n = 1, from: "backpack" | "storage" = "backpack"): number {
    const target = from === "backpack" ? this.backpack : this.storage;
    const r = remove(target, itemId, n);
    if (from === "backpack") this.backpack = prune(r.container);
    else this.storage = prune(r.container);
    return r.removed;
  }

  /** 使用一件（应用效果） */
  useItem(itemId: string, from: "backpack" | "storage" = "backpack"): Record<string, number> | null {
    const target = from === "backpack" ? this.backpack : this.storage;
    const r = useItem(target, itemId);
    if (!r) return null;
    if (from === "backpack") this.backpack = prune(r.container);
    else this.storage = prune(r.container);

    // 应用效果到主角
    const s = { ...this.hero.survival };
    for (const [k, v] of Object.entries(r.effects)) {
      if (k in s) {
        const key = k as keyof typeof s;
        s[key] = Math.max(0, Math.min(100, s[key] + v));
      }
    }
    this.hero.survival = s;
    if (r.effects["lust"]) {
      this.hero.lust = { ...this.hero.lust, value: Math.max(0, Math.min(100, this.hero.lust.value + r.effects["lust"])) };
    }
    return r.effects;
  }

  /** 采集：按掉落表产出到背包（放不下的留在仓库待取） */
  loot(tableId: string, seed: number): { got: Array<{ id: string; n: number; quality: Quality }>; overflow: Record<string, number> } {
    const table = lootTable(tableId);
    if (!table) return { got: [], overflow: {} };
    const got = rollLoot(table, seed);
    const overflow: Record<string, number> = {};
    for (const g of got) {
      const r = add(this.backpack, g.id, g.n, g.quality);
      this.backpack = r.container;
      if (r.overflow > 0) {
        const st = add(this.storage, g.id, r.overflow, g.quality);
        this.storage = st.container;
        overflow[g.id] = (overflow[g.id] ?? 0) + r.overflow;
      }
    }
    return { got, overflow };
  }

  /** 合成 */
  craft(recipeId: string): { ok: boolean; missing: Record<string, number>; missingTech: string[] } {
    const recipe = recipeById(recipeId);
    if (!recipe) return { ok: false, missing: {}, missingTech: [] };
    const merged = this.mergedStorage();
    const r = craftRecipe(merged, recipe, [...this.tech.unlocked]);
    if (!r.ok) return { ok: false, missing: r.missing, missingTech: r.missingTech };
    this.storage = r.container;
    return { ok: true, missing: {}, missingTech: [] };
  }

  /** 合成可用性检查（合并背包与仓库） */
  craftCheck(recipeId: string): { ok: boolean; missing: Record<string, number>; missingTech: string[] } {
    const recipe = recipeById(recipeId);
    if (!recipe) return { ok: false, missing: {}, missingTech: [] };
    return canCraft(this.mergedStorage(), recipe, [...this.tech.unlocked]);
  }

  /** 背包 + 仓库的合并视图（只读，用于消耗判定） */
  private mergedStorage(): Container {
    return {
      stacks: [...this.storage.stacks, ...this.backpack.stacks],
      maxWeight: Infinity,
      maxSlots: Infinity
    };
  }

  /** 从合并视图扣除（优先扣仓库） */
  private spendMerged(cost: Record<string, number>): boolean {
    if (!canAfford(this.mergedStorage(), cost)) return false;
    for (const [id, n] of Object.entries(cost)) {
      const fromStore = Math.min(n, countOf(this.storage, id));
      if (fromStore > 0) this.storage = remove(this.storage, id, fromStore).container;
      const rest = n - fromStore;
      if (rest > 0) this.backpack = remove(this.backpack, id, rest).container;
    }
    this.storage = prune(this.storage);
    this.backpack = prune(this.backpack);
    return true;
  }

  /** 库存概览 */
  inventorySummary(): {
    backpack: { used: number; max: number; slots: number; maxSlots: number; describe: string };
    storage: { items: number; kinds: number; describe: string };
  } {
    return {
      backpack: {
        used: weightOf(this.backpack),
        max: this.backpack.maxWeight === Infinity ? -1 : this.backpack.maxWeight,
        slots: this.backpack.stacks.length,
        maxSlots: this.backpack.maxSlots === Infinity ? -1 : this.backpack.maxSlots,
        describe: describeContainer(this.backpack)
      },
      storage: {
        items: totalCount(this.storage),
        kinds: this.storage.stacks.length,
        describe: describeContainer(this.storage)
      }
    };
  }

  // ---------- 查询 ----------

  get slot(): TimeSlot {
    return slotOfTime(this.time);
  }

  get day(): number {
    return this.time.day;
  }

  companion(id: string): CompanionRuntime | undefined {
    return this.companions.find((c) => c.id === id);
  }

  /** 已加入的同伴 */
  joined(): CompanionRuntime[] {
    return this.companions.filter((c) => c.joined);
  }

  /** 用于剧本条件求值的变量集 */
  vars(extra: Vars = {}): Vars {
    const v: Vars = {
      day: this.time.day,
      minute: this.time.minute,
      hunger: this.hero.survival.hunger,
      thirst: this.hero.survival.thirst,
      stamina: this.hero.survival.stamina,
      energy: this.hero.survival.energy,
      mood: this.hero.survival.mood,
      lust: this.hero.lust.value,
      virgin: this.hero.physiology.virgin,
      pregnant: this.hero.physiology.pregnant,
      companionCount: this.joined().length,
      offspringCount: this.offspring.length,
      weather: this.weather,
      hero_exposure: exposure(this.hero.wardrobe),
      hero_insulation: insulation(this.hero.wardrobe),
      hero_armor: armorOf(this.hero.wardrobe),
      hero_charm: charmOf(this.hero.wardrobe)
    };
    // 每位同伴的关键数值以 <id>_<field> 暴露
    for (const c of this.companions) {
      v[`${c.id}_affection`] = c.relationship.affection;
      v[`${c.id}_loyalty`] = c.relationship.loyalty;
      v[`${c.id}_bond`] = c.relationship.bond;
      v[`${c.id}_lust`] = c.lust.value;
      v[`${c.id}_joined`] = c.joined;
      v[`${c.id}_virgin`] = c.physiology.virgin;
      v[`${c.id}_exposure`] = exposure(c.wardrobe);
      v[`${c.id}_charm`] = charmOf(c.wardrobe);
    }
    for (const [k, val] of Object.entries(this.flags)) {
      if (typeof val === "number" || typeof val === "boolean" || typeof val === "string") {
        v[k] = val;
      }
    }
    return { ...v, ...extra };
  }

  /**
   * 以某位同伴为「当前对话对象」的变量集。
   *
   * 剧本里写的是裸变量名（affection / bond / lust / virgin / days_since），
   * 它们指的是当前场景的对话对象。此方法把这些名字绑定到该同伴。
   */
  varsFor(companionId: string): Vars {
    const c = this.companion(companionId);
    if (!c) return this.vars();
    return this.vars({
      affection: c.relationship.affection,
      loyalty: c.relationship.loyalty,
      bond: c.relationship.bond,
      lust: c.lust.value,
      days_since: c.lust.daysSinceIntimacy,
      virgin: c.physiology.virgin,
      pregnant: c.physiology.pregnant,
      name: c.identity.name
    });
  }

  /** 按显示名或 id 找到同伴 */
  findCompanion(nameOrId: string): CompanionRuntime | undefined {
    return this.companions.find((c) => c.id === nameOrId || c.identity.name === nameOrId);
  }

  bonuses(): Record<string, number> {
    return aggregateBonuses(this.tech);
  }

  techProgress(): BranchProgress[] {
    return branchProgress(this.tech);
  }

  availability(nodeId: string): Availability {
    return checkAvailability(this.tech, nodeId, this.resources);
  }

  // ---------- 时间推进 ----------

  private tickInput(activity: Activity): TickInput {
    const researchJob = this.companions
      .filter((c) => c.joined && c.job.id === "lab")
      .reduce((s, c) => s + c.job.bonus, 0);
    return {
      time: this.time,
      survival: this.hero.survival,
      activity,
      lust: this.hero.lust,
      job: null,
      tech: this.tech,
      pregnancy: this.hero.pregnancy,
      researchRate: this.opts.researchRate * (1 + researchJob),
      lustDailyGain: this.opts.lustDailyGain,
      instantResearch: this.opts.instantResearch,
      freezeTime: this.opts.freezeTime
    };
  }

  /** 应用一次 tick 结果到会话状态 */
  private apply(out: TickOutput): TickOutput {
    this.time = out.time;
    this.hero.survival = out.survival;
    this.hero.lust = out.lust;
    this.tech = out.tech;
    this.hero.pregnancy = out.pregnancy;

    // 同伴的欲情与岗位疲劳随时间推进
    const days = Math.max(0, out.time.day - (this.time.day - 0)) || 0;
    for (const c of this.companions) {
      if (!c.joined) continue;
      const lt = tickLust(c.lust, 0, 0); // 仅重算阶段，不重复累积
      c.lust = lt.lust;
    }

    if (out.delivered > 0) {
      for (let i = 0; i < out.delivered; i++) {
        const idx = this.offspring.length + 1;
        this.offspring.push(
          makeOffspring(
            `child_${idx}`,
            `女儿${idx}`,
            this.hero.id,
            this.hero.pregnancy?.fatherId ?? "sister",
            this.time.day
          )
        );
      }
    }
    return out;
  }

  /** 推进若干游戏内小时 */
  advance(hours: number, activity: Activity = "idle"): TickOutput {
    const out = tick(this.tickInput(activity), hours);
    return this.apply(out);
  }

  /** 快进若干天（睡眠） */
  sleep(days = 1): TickOutput {
    const out = fastForward(this.tickInput("sleep"), days);
    return this.apply(out);
  }

  /** 同伴的欲情按天累积（独立于主角） */
  tickCompanionLust(days: number, perDay = 5): void {
    for (const c of this.companions) {
      if (!c.joined) continue;
      const r = tickLust(c.lust, days, perDay);
      c.lust = r.lust;
    }
  }

  // ---------- 科技 ----------

  beginResearch(nodeId: string): { ok: boolean; reason?: string } {
    const av = this.availability(nodeId);
    if (!av.ok) return { ok: false, reason: av.reason };
    const node = findNode(nodeId);
    if (!node) return { ok: false, reason: "unknown-node" };
    // 扣除资源（仓库优先，不足再从背包补）
    if (!this.spendMerged(node.cost)) {
      return { ok: false, reason: "missing-resource" };
    }
    this.tech = startResearch(this.tech, nodeId);
    return { ok: true };
  }

  /** 立即完成研究（作弊器 / 测试） */
  forceComplete(nodeId: string): void {
    this.tech = unlock(this.tech, nodeId);
  }

  unlockEverything(): void {
    this.tech = unlockAll(this.tech);
  }

  resetTech(): void {
    this.tech = resetTechState(this.tech);
  }

  has(nodeId: string): boolean {
    return isUnlocked(this.tech, nodeId);
  }

  // ---------- 岗位 ----------

  setJob(entityId: string, jobId: JobId | null, bonus = 0.1): void {
    const c = this.companion(entityId);
    if (!c) return;
    c.job = reassign({ ...c.job, bonus }, jobId);
  }

  jobAssignments(): JobAssignment[] {
    return this.joined()
      .filter((c) => c.job.id !== null)
      .map((c) => ({ entityId: c.id, job: c.job.id as JobId }));
  }

  // ---------- 关系 ----------

  /** 满足某位同伴：欲情清零，好感 +3，忠诚 +2 */
  satisfyCompanion(id: string, kind: "accept" | "raid" | "active" | "multi" = "active"): boolean {
    const c = this.companion(id);
    if (!c) return false;
    const out = satisfy(c.relationship, c.lust, kind);
    c.relationship = out.relationship;
    c.lust = out.lust;
    if (c.physiology.virgin) c.physiology = { ...c.physiology, virgin: false };
    if (this.hero.physiology.virgin) {
      this.hero.physiology = { ...this.hero.physiology, virgin: false };
    }
    return true;
  }

  /** 拒绝主动邀约：好感不变，欲情 +10 */
  refuseCompanion(id: string): boolean {
    const c = this.companion(id);
    if (!c) return false;
    c.lust = refuse(c.lust);
    return true;
  }

  /** 夜袭（无拒绝选项）：直接完成 */
  nightRaid(id: string): boolean {
    return this.satisfyCompanion(id, "raid");
  }

  gainAffection(id: string, affection = 0, loyalty = 0): void {
    const c = this.companion(id);
    if (!c) return;
    c.relationship = gain(c.relationship, affection, loyalty);
  }

  /** 当前处于夜袭阈值的同伴 */
  pendingNightRaids(): CompanionRuntime[] {
    return this.joined().filter((c) => c.lust.value >= 90 && c.lust.daysSinceIntimacy >= 10);
  }

  lustStageOf(id: string): LustStage {
    const c = this.companion(id);
    if (!c) return "none";
    return tickLust(c.lust, 0, 0).stage;
  }

  // ---------- 怀孕 ----------

  conceiveCompanion(id: string, fatherId = "hero"): boolean {
    const c = this.companion(id);
    if (!c || c.physiology.pregnant) return false;
    c.physiology = { ...c.physiology, pregnant: true, pregnancyProgress: 0 };
    return true;
  }

  startHeroPregnancy(fatherId: string, multiple = 1): Pregnancy {
    const p = startPregnancy(this.hero.id, fatherId, this.time.day, multiple);
    this.hero.pregnancy = p;
    this.hero.physiology = { ...this.hero.physiology, pregnant: true };
    return p;
  }

  // ---------- 服装 ----------

  setWeather(weather: Weather): void {
    this.weather = weather;
  }

  /** 换装：穿上一件（同槽位自动替换） */
  equipClothing(who: string, itemId: string, variant?: string): void {
    const target = who === "hero" ? this.hero : this.companion(who);
    if (!target) return;
    target.wardrobe = equip(target.wardrobe, itemId, variant);
  }

  /** 脱下某槽位 */
  unequipClothing(who: string, slot: ClothingSlot): void {
    const target = who === "hero" ? this.hero : this.companion(who);
    if (!target) return;
    target.wardrobe = unequip(target.wardrobe, slot);
  }

  /** 从储物中取出穿上 */
  wearFromStorage(who: string, itemId: string): void {
    const target = who === "hero" ? this.hero : this.companion(who);
    if (!target) return;
    target.wardrobe = wearFromStorage(target.wardrobe, itemId);
  }

  /** 脱掉最外一层，返回该层信息 */
  undress(who: string): { slot: ClothingSlot | null; item: ClothingItem | null; exposure: number } {
    const target = who === "hero" ? this.hero : this.companion(who);
    if (!target) return { slot: null, item: null, exposure: 0 };
    const step = undressStep(target.wardrobe);
    target.wardrobe = step.wardrobe;
    return { slot: step.slot, item: step.item, exposure: step.exposure };
  }

  /** 脱到指定暴露度 */
  undressTo(who: string, targetExposure: number): ClothingItem[] {
    const target = who === "hero" ? this.hero : this.companion(who);
    if (!target) return [];
    const r = undressTo(target.wardrobe, targetExposure);
    target.wardrobe = r.wardrobe;
    return r.removed;
  }

  /** 脱光 */
  stripAll(who: string): ClothingItem[] {
    return this.undressTo(who, 100);
  }

  /** 着装派生数值 */
  outfitOf(who: string): {
    exposure: number;
    insulation: number;
    armor: number;
    charm: number;
    stealth: number;
    weight: number;
    condition: number;
    coverage: Record<BodyZone, number>;
    describe: string;
    items: Array<{ slot: ClothingSlot; name: string; itemId: string; durability: number }>;
  } | null {
    const target = who === "hero" ? this.hero : this.companion(who);
    if (!target) return null;
    const w = target.wardrobe;
    return {
      exposure: exposure(w),
      insulation: insulation(w),
      armor: armorOf(w),
      charm: charmOf(w),
      stealth: stealthOf(w),
      weight: totalWeight(w),
      condition: conditionOf(w),
      coverage: coverage(w),
      describe: describeWardrobe(w),
      items: equippedGarments(w).map((x) => ({
        slot: x.slot,
        name: x.item.name,
        itemId: x.item.id,
        durability: x.garment.durability
      }))
    };
  }

  /** 某区域覆盖度 */
  zoneCoverageOf(who: string, zone: BodyZone): number {
    const target = who === "hero" ? this.hero : this.companion(who);
    if (!target) return 0;
    return zoneCoverage(target.wardrobe, zone);
  }

  /** 天气适配判定 */
  weatherFitness(who: string): Suitability | null {
    const target = who === "hero" ? this.hero : this.companion(who);
    if (!target) return null;
    return suitability(target.wardrobe, this.weather);
  }

  /** 岗位制服是否齐备 */
  uniformReady(who: string, jobTag: string): boolean {
    const target = who === "hero" ? this.hero : this.companion(who);
    if (!target) return false;
    return uniformOk(target.wardrobe, jobTag);
  }

  /** 衣物磨损（战斗 / 劳作后调用） */
  wearClothing(who: string, amount: number): void {
    const target = who === "hero" ? this.hero : this.companion(who);
    if (!target) return;
    target.wardrobe = pruneBroken(damageCloth(target.wardrobe, amount));
  }

  /** 修补全部衣物 */
  repairClothing(who: string): void {
    const target = who === "hero" ? this.hero : this.companion(who);
    if (!target) return;
    target.wardrobe = repairAll(target.wardrobe);
  }

  // ---------- 场景 ----------

  loadScript(src: string): number {
    return this.registry.load(src);
  }

  /** 批量载入剧本源 */
  loadScripts(sources: string[]): number {
    return this.registry.loadAll(sources);
  }

  /**
   * 当前可触发的全部场景。
   *
   * 剧本里的裸变量名（affection / bond / lust / virgin / days_since）指
   * 「当前对话对象」。因此需要分别用全局变量与每位同伴的上下文求值，
   * 任一上下文满足即视为可触发。返回的场景已用其对应上下文实体化
   * （即差分文本正确注入）。
   */
  availableScenes(): Scene[] {
    const seen = new Map<string, Scene>();

    // 1) 全局上下文：用于主线剧本（条件只依赖标志位）
    for (const sc of this.registry.available(this.vars())) {
      seen.set(sc.id, sc);
    }

    // 2) 每位同伴的上下文：用于关系剧本（条件依赖 affection 等裸变量）
    for (const c of this.companions) {
      if (!c.joined) continue;
      const vars = this.varsFor(c.id);
      for (const scriptScene of this.registry.all()) {
        const involves =
          scriptScene.participants.includes(c.identity.name) ||
          scriptScene.participants.includes(c.id);
        if (!involves) continue;
        const m = this.registry.materialize(scriptScene.id, vars);
        if (m) seen.set(m.id, m);
      }
    }

    return [...seen.values()];
  }

  /** 某位同伴相关的可触发场景（接受 id 或显示名） */
  scenesFor(nameOrId: string): Scene[] {
    const c = this.findCompanion(nameOrId);
    if (!c) return [];
    const vars = this.varsFor(c.id);
    const out: Scene[] = [];
    for (const sc of this.registry.all()) {
      if (!sc.participants.includes(c.identity.name) && !sc.participants.includes(c.id)) continue;
      const m = this.registry.materialize(sc.id, vars);
      if (m) out.push(m);
    }
    return out;
  }

  /** 用指定同伴的上下文实体化一个场景 */
  sceneFor(companionId: string, sceneId: string): Scene | null {
    return this.registry.materialize(sceneId, this.varsFor(companionId));
  }

  /** 实体化指定场景；条件不满足返回 null */
  scene(id: string): Scene | null {
    return this.registry.materialize(id, this.vars());
  }

  /** 标记某个剧本条件已达成（供主线推进） */
  setFlag(key: string, value: number | boolean | string): void {
    this.flags[key] = value;
  }

  getFlag(key: string): number | boolean | string | undefined {
    const v = this.flags[key];
    return typeof v === "number" || typeof v === "boolean" || typeof v === "string" ? v : undefined;
  }

  // ---------- 存档 ----------

  toSave(slot = "auto"): SaveData {
    const data = newSave(VERSION, this.time);
    data.flags = { ...this.flags, slot };

    data.entities.push({
      id: this.hero.id,
      kind: "hero",
      identity: this.hero.identity,
      physiology: this.hero.physiology,
      survival: this.hero.survival
    });

    for (const c of this.companions) {
      const e: SavedEntity = {
        id: c.id,
        kind: c.id === "ai" ? "ai" : "companion",
        identity: c.identity,
        physiology: c.physiology,
        survival: DEFAULT_SURVIVAL
      };
      if (c.id === "ai") {
        e.ai = { level: 2, hasBody: false, hasProjection: false, possessesRobot: null };
      }
      data.entities.push(e);

      const rel: SavedRelation = {
        fromId: this.hero.id,
        toId: c.id,
        affection: c.relationship.affection,
        loyalty: c.relationship.loyalty,
        bond: c.relationship.bond,
        intimacy: 0,
        lust: c.lust.value,
        daysSinceIntimacy: c.lust.daysSinceIntimacy
      };
      data.relations.push(rel);

      const job: SavedJob = {
        entityId: c.id,
        jobId: c.job.id,
        bonus: c.job.bonus,
        daysOnJob: c.job.daysOnJob
      };
      data.jobs.push(job);
    }

    for (const id of this.tech.unlocked) {
      const node = findNode(id);
      if (!node) continue;
      const t: SavedTech = {
        branch: id.split("_")[0],
        nodeId: id,
        tier: node.tier,
        unlocked: true,
        progress: 0
      };
      data.tech.push(t);
    }
    if (this.tech.researching) {
      const node = findNode(this.tech.researching.nodeId);
      if (node) {
        data.tech.push({
          branch: this.tech.researching.nodeId.split("_")[0],
          nodeId: this.tech.researching.nodeId,
          tier: node.tier,
          unlocked: false,
          progress: this.tech.researching.hours
        });
      }
    }

    data.flags["backpack"] = containerToJSON(this.backpack);
    data.flags["storage"] = containerToJSON(this.storage);
    data.flags["offspring"] = this.offspring;
    data.flags["weather"] = this.weather;
    data.flags["wardrobe_hero"] = wardrobeToJSON(this.hero.wardrobe);
    const wardrobes: Record<string, unknown> = {};
    for (const c of this.companions) wardrobes[c.id] = wardrobeToJSON(c.wardrobe);
    data.flags["wardrobes"] = wardrobes;
    return data;
  }

  static fromSave(data: SaveData): GameSession {
    const s = new GameSession({ time: data.time });
    const hero = data.entities.find((e) => e.kind === "hero");
    if (hero) {
      s.hero.identity = hero.identity;
      s.hero.physiology = hero.physiology;
      s.hero.survival = hero.survival;
    }
    for (const r of data.relations) {
      const c = s.companion(r.toId);
      if (!c) continue;
      c.relationship = { ...c.relationship, affection: r.affection, loyalty: r.loyalty, bond: r.bond as Relationship["bond"] };
      c.lust = { ...c.lust, value: r.lust, daysSinceIntimacy: r.daysSinceIntimacy };
    }
    for (const j of data.jobs) {
      const c = s.companion(j.entityId);
      if (!c) continue;
      c.job = { id: j.jobId as JobId | null, bonus: j.bonus, daysOnJob: j.daysOnJob };
    }
    for (const t of data.tech) {
      if (t.unlocked) {
        s.tech = unlock(s.tech, t.nodeId);
      } else {
        // 未完成但已有进度 → 恢复为研究中
        s.tech = startResearch(s.tech, t.nodeId);
        s.tech = { ...s.tech, researching: { nodeId: t.nodeId, hours: t.progress } };
      }
    }
    s.backpack = containerFromJSON(data.flags["backpack"] as never, 40, 30);
    s.storage = containerFromJSON(data.flags["storage"] as never);
    // 兼容旧存档：resources 字典迁入仓库
    const legacyRes = data.flags["resources"];
    if (legacyRes && typeof legacyRes === "object") {
      for (const [id, n] of Object.entries(legacyRes as Record<string, number>)) {
        s.storage = add(s.storage, id, n).container;
      }
    }
    const off = data.flags["offspring"];
    if (Array.isArray(off)) s.offspring = off as Offspring[];
    s.hero.wardrobe = wardrobeFromJSON(data.flags["wardrobe_hero"] as never);
    const ws = data.flags["wardrobes"];
    if (ws && typeof ws === "object") {
      for (const [id, j] of Object.entries(ws as Record<string, unknown>)) {
        const c = s.companion(id);
        if (c) c.wardrobe = wardrobeFromJSON(j as never);
      }
    }
    const weather = data.flags["weather"];
    if (typeof weather === "string") s.weather = weather as Weather;

    const flags: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data.flags)) {
      if (k === "resources" || k === "offspring" || k === "slot" ||
          k === "weather" || k === "wardrobe_hero" || k === "wardrobes" ||
          k === "backpack" || k === "storage") continue;
      flags[k] = v;
    }
    s.flags = flags;
    return s;
  }

  /** 状态摘要（调试与 UI 概览用） */
  summary(): {
    time: string; day: number; slot: TimeSlot; hero: Survival;
    companions: number; techUnlocked: number; techTotal: number; offspring: number;
    pendingRaids: string[]; researching: string | null;
    weather: Weather; heroExposure: number; heroInsulation: number;
  } {
    const total = branchProgress(this.tech).reduce((s, b) => s + b.total, 0);
    const h = Math.floor(this.time.minute / 60);
    const m = this.time.minute % 60;
    return {
      time: `第${this.time.day}天 ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
      day: this.time.day,
      slot: this.slot,
      hero: this.hero.survival,
      companions: this.joined().length,
      techUnlocked: this.tech.unlocked.size,
      techTotal: total,
      offspring: this.offspring.length,
      pendingRaids: this.pendingNightRaids().map((c) => c.id),
      researching: this.tech.researching?.nodeId ?? null,
      weather: this.weather,
      heroExposure: exposure(this.hero.wardrobe),
      heroInsulation: insulation(this.hero.wardrobe)
    };
  }
}