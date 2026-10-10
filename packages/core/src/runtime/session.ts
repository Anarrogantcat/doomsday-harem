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
import {
  type PrologueStage, type PrologueScene, type TutorialStep,
  PROLOGUE_ORDER, PROLOGUE_LABEL, PROLOGUE_DESC, PROLOGUE_DAYS,
  PROLOGUE_SCENES, TUTORIAL_STEPS, STARTING_VEHICLE,
  nextPrologueStage, prologueFinished, prologueProgress,
  prologueScene, prologueScenesForStage, prologueStats
} from "../systems/prologue.ts";
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
  remove as removeFrom,
  newContainer, newStorage, add, addMany, remove, countOf, totalCount, weightOf,
  canAfford, missingFor, transfer, prune, use as useItem, rollLoot, lootTable,
  recipeById, canCraft, craft as craftRecipe,
  containerToJSON, containerFromJSON, describeContainer, itemDef, resolveItemId, normalizeCost
} from "../systems/inventory.ts";
import {
  type Base, type BaseLevel, type FacilityCategory, type FacilityDef, type BuildCheck,
  newBase, facilityDef, facilitiesByLevel, facilitiesByCategory,
  findFacility, tierOf, isBuilt, isBuilding,
  upgradeCost, upgradeHours, checkBuild, startBuild, tickBuild,
  instantBuild, instantBuildAll, demolish,
  aggregateFacilityBonuses, effectText, summarize, livingCapacity, hSceneUnlocked,
  baseToJSON, baseFromJSON, describeBase, FACILITIES,
  LEVEL_LABEL, FACILITY_CATEGORY_LABEL
} from "../systems/base.ts";
import {
  type WorldMap, type RegionDef, type RegionState, type TravelMode, type TravelPlan, type TravelResult,
  type TerrainKind, type DangerLevel,
  REGIONS, regionDef, regionsByTerrain, regionsByTag,
  newWorldMap, regionState, currentRegion, neighbors, discoveredNeighbors, distanceBetween,
  TRAVEL_MODES, planTravel, travel, lootRegion, clearRegion, effectiveDanger,
  explorationProgress, mapToJSON, mapFromJSON, describeMap,
  TERRAIN_LABEL, DANGER_LABEL
} from "../systems/world.ts";
import {
  type Vehicle, type VehicleStats, type ModDef, type ModTier, type VehicleSlot, type ModCheck,
  MODS, modDef, modsByTier, modsBySlot,
  newVehicle, hasMod, stats as vehicleStats, armorLabel,
  checkMod, installMod, removeMod, installUpToTier, installAll,
  refuel, charge as chargeVehicle, drive as driveVehicle, repair as repairVehicle,
  hullRatio, canOffroad, hasPrivateRoom as vehicleHasPrivateRoom, droneCapacity,
  firepower, crewCapacity, modsByInstalledTier, maxTier as vehicleMaxTier, modProgress,
  vehicleToJSON, vehicleFromJSON, describeVehicle,
  VEHICLE_SLOT_LABEL, BASE_STATS
} from "../systems/vehicle.ts";
import {
  type QuestDef, type QuestState, type QuestStage, type QuestCheck, type QuestContext,
  type RecruitResult, type QuestSummary,
  QUESTS, questDef, questForCompanion,
  newQuestStates, currentStep, progressText, checkStep, advanceQuest as advanceQuestPure,
  pauseQuest as pauseQuestPure, resumeQuest as resumeQuestPure, resetQuest as resetQuestPure,
  tryRecruit, summarizeQuests, questsToJSON, questsFromJSON
} from "../systems/quest.ts";
import {
  type RaidKind, type RaidDef, type RaidEvent, type RaidResult, type RaidOutcome,
  type DefenseInput, type DefenseLevel, type DefenseJSON, type ReputationState,
  RAIDS, raidDef, availableRaids, defenseLevel, rollRaid, resolveRaid, forceRaid,
  newReputation, afterRaid, decayReputation,
  newDefenseState, defenseToJSON, defenseFromJSON, describeDefense,
  RAID_LABEL, OUTCOME_LABEL
} from "../systems/defense.ts";
import {
  type CompanionDef, type Specialty,
  COMPANIONS, companionDef, startingCompanions, companionStats,
  traitsOf, lustGrowthFor, shouldInvite, shouldRaid, approachLine, raidLine,
  specialtyBonus, bestJobFor, describeCompanion,
  PERSONALITY_LABEL, PERSONALITY_TRAITS
} from "../systems/companions.ts";
import {
  type HLocation, type HTimeSlot, type HTemplate, type HTemplateContext, type TemplateMatch,
  H_TEMPLATES, H_LOCATION_LABEL, H_TIME_TONE, hTemplate,
  matchTemplates, pickTemplate, templateToPrompt, templateStats,
  templateToScene, templateFits, templateFromSceneId, H_TEMPLATE_PREFIX,
  HAREM_INTERACT_TEMPLATES, haremInteractTemplate, haremInteractStats,
  haremInteractToScene, allTemplateStats, type HaremInteractTemplate
} from "../systems/hTemplates.ts";
import {
  type ActDef, type ActPart, type Proficiency,
  ACTS, actDef, actsByPart, actsByDirection, actsByTier,
  newProficiency, recordAct, partLevel, partExpForLevel, proficiencyBonus,
  canPerform, availableActs, actStats, proficiencySummary,
  PART_LABEL, DIRECTION_LABEL, proficiencyToJSON, proficiencyFromJSON,
  type ProficiencyJSON
} from "../systems/sexActs.ts";
import {
  type ShareState, type BonusCategory, type BonusDef,
  BONUS_DEFS, bonusDef, bonusesByCategory, newShareState, toggleShare,
  setCategoryShare, isShared, sharedKeys, companionBonuses, heroBonuses,
  companionAttributeBonus, shareStats, SHARE_RATIO, HERO_RATIO,
  CATEGORY_LABEL, CATEGORY_DESC, shareToJSON, shareFromJSON,
  type ShareJSON
} from "../systems/bonusSharing.ts";
import {
  type SceneVariant, type ActSceneSpec, type EnemaStep,
  ACT_SCENES, actScene, actSceneStats, actSceneToScene, actSceneToPrompt,
  ENEMA_STEPS, enemaTotalGain, enemaRequiredItems, pickVariant,
  VARIANT_LABEL
} from "../systems/actScenes.ts";
import {
  type BranchPregStage, type PregnancyEvent, type DefeatEvent, type DefeatOutcome,
  BRANCH_PREG_LABEL, BRANCH_PREG_DESC, branchPregStage,
  PREGNANCY_EVENTS, pregnancyEvent, pregnancyEventsForStage,
  DEFEAT_LABEL, DEFEAT_EVENTS, defeatEvent, rollDefeatOutcome, branchStats
} from "../systems/branchEvents.ts";
import {
  type CombatTerrain, type Stance, type ExtendedCombat, type CombatSkill,
  COMBAT_SKILLS, COMBAT_TERRAIN_LABEL, COMBAT_TERRAIN_DESC, COMBAT_TERRAIN_MODS,
  STANCE_LABEL, STANCE_DESC, STANCE_MODS,
  terrainFromRegion, initExtended, setStance, useSkill, tickCooldowns,
  canUseSkill, effectiveStats, combatSummary, settleCombat
} from "../systems/combatExt.ts";
import {
  type DroneDef, type DroneUnit, type DroneTurnResult, type DroneAction,
  DRONE_DEFS, availableDrones, droneSquadCap, squadDrones, squadSummary,
  droneTurn, tickDrones, damageDrones, repairDrones
} from "../systems/droneCombat.ts";
import {
  type TechScope, SCOPE_LABEL, SCOPE_DESC, SCOPE_ICON,
  BRANCH_SCOPE, SCOPE_OVERRIDES, nodeScope, canCompanionResearch,
  researchContribution, teamResearchRate, scopeStats, sharedNodes,
  allNodePairs, scopeMap, globalScopeStats, branchScopeOf,
  COMPANION_RESEARCH_CAP, MAX_TEAM_BONUS
} from "../tech/scope.ts";
import { findNode as findTechNode, branchOf as techBranchOf } from "../tech/branches.ts";
import {
  type CheatHost, type CheatResult,
  runCheatOp, runCheatAll as runCheatAllOps, cheatOpIds
} from "../systems/cheatRunner.ts";
import {
  type CompanionGrowth, type CompanionPerk, type PerkContext,
  newCompanionGrowth, recordIntimacy, recordJobDay, recordBirth,
  hasPerk, perkMultipliers, growthLevel, growthSummary,
  PERK_DEFS, companionGrowthToJSON, companionGrowthFromJSON,
  type CompanionGrowthJSON,
  trainCompanion, restCompanion as restCompanionGrowth, healInjury,
  adjustMood, spendStamina, refreshIntimacyTier, computeIntimacyTier,
  companionSkillTotal, companionPower, companionSkillExp,
  COMPANION_SKILL_DEFS, INTIMACY_TIER_LABEL,
  gainCompanionExp, gainCompanionSkillExp,
  type CompanionSkill
} from "../systems/haremGrowth.ts";
import {
  type SexStats, type SexStatsView, type ActEvent, type ShotTarget,
  type MedType, type PenetrationSide,
  newSexStats, applyActEvent, shotFor, shotTargetFor, recordConception,
  recordContraceptive, recordBirthStat, sexStatsView, sexStatsSummary, insideRate,
  shotInsideRate, receivedInsideRate, receivedTotal, avgMinutes, topRatio,
  unlockedActCount, insertionSide, analLevel,
  sexStatsToJSON, sexStatsFromJSON, type SexStatsJSON,
  SHOT_LABEL, MED_SHOT_NOTE, medCapable, medFertile
} from "../systems/sexStats.ts";
import {
  type HeroGrowth, type HeroAttributes, type HeroBonuses,
  newHeroGrowth, gainExp, gainSkillExp, spendPoint, effectiveAttributes,
  emptyBonuses, attributeTotal, skillTotal, levelProgress, expForLevel,
  ATTR_KEYS, ATTR_LABEL, growthToJSON, growthFromJSON,
  type HeroGrowthJSON
} from "../systems/heroGrowth.ts";
import {
  type Combatant, type CombatState, type CombatBonus, type AttackResult,
  newCombatant, startCombat, mulberry32 as combatRng, attack as combatAttack,
  applyDamage, addLog, playerAttack, charmEnemy, enemyTurn, advanceRound,
  checkOver, playerFromBonuses
} from "../systems/combat.ts";
import { mulberry32 } from "../systems/inventory.ts";
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
  /**
   * 是否有过伴侣（L-5）。
   *
   * 与 physiology.virgin 互补：virgin 是生理事实，
   * hadPartner 是履历。全队上限 3 人（L-4）。
   */
  hadPartner: boolean;
  /** 成长状态（熟练度/岗位经验/被动增益） */
  growth: CompanionGrowth;
  /** 性爱统计（与主角同结构） */
  sexStats: SexStats;
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
  /** 成长状态（等级/属性/技能）—— 只有主角有 */
  growth: HeroGrowth;
  /** 性爱熟练度（按部位） */
  proficiency: Proficiency;
  /** 性爱统计（与同伴同结构） */
  sexStats: SexStats;
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

/**
 * 由角色数据构建运行时同伴。
 * 全部 21 位后宫的身份、年龄、身高、体型、性格、岗位专长、初始数值
 * 都来自 systems/companions.ts，此处只做数据到运行时的映射。
 */
export function makeCompanion(def: CompanionDef, joined = true): CompanionRuntime {
  return {
    id: def.id,
    growth: newCompanionGrowth(),
    identity: {
      name: def.name,
      title: def.title,
      age: def.age,
      heightCm: def.heightCm,
      tags: [def.origin, def.personality, def.build]
    },
    physiology: {
      sex: "female",
      /**
       * 处女判定（L-4 / L-5）。
       *
       * 此前写法是 `origin === "family" || "mainline" || "side"` ——
       * 对 21 人**全部**返回 true，与「母亲生育 3 次」
       * 「单亲妈妈有 19 岁女儿」直接矛盾。
       *
       * 现在改为读取角色定义：默认处女，
       * 仅 mother / singlemom / neighbor 三人（有过伴侣）为 false。
       */
      virgin: def.virgin ?? true,
      pregnant: false,
      pregnancyProgress: 0,
      fertileWindow: false
    },
    /** 是否有过伴侣（L-5：「人妻」= 有过伴侣的女性） */
    hadPartner: def.hadPartner ?? false,
    relationship: {
      ...DEFAULT_RELATIONSHIP,
      affection: def.initial.affection,
      loyalty: def.initial.loyalty,
      bond: def.initial.bond,
      role: def.origin === "family" ? "family"
        : def.origin === "ai" ? "ai"
        : def.origin === "mainline" ? "main" : "side"
    },
    lust: { ...DEFAULT_LUST, value: def.initialLust },
    job: {
      id: def.specialties.length > 0 ? def.specialties[0].job : null,
      bonus: def.specialties.length > 0 ? def.specialties[0].bonus : 0,
      daysOnJob: 0
    },
    wardrobe: presetWardrobe(def.wardrobePreset),
    joined,
    sexStats: newSexStats()
  };
}

/**
 * 开局同伴。
 *
 * 序章开始时，主角和家人住在城里，过普通生活：
 *  - 母亲 / 姐姐 / 妹妹 同住（本来就是一家人，不是「后宫」）
 *  - 特殊AI **尚未诞生** —— 序章第 3 阶段才由主角写下
 *  - 安全屋 / 避难所 **尚不存在**
 *
 * 家人以 joined=true 存在，但 relationship.role 为 "family"，
 * 且好感从亲情基准起步，序章中逐步发展为后宫关系。
 */
function defaultCompanions(): CompanionRuntime[] {
  const FAMILY_IDS = ["mother", "sister", "sister2"];

  return startingCompanions()
    .filter((def) => FAMILY_IDS.includes(def.id))
    .map((def) => {
      const c = makeCompanion(def, true);
      // 序章期间：亲情关系，好感基准而非满值
      c.relationship = {
        ...c.relationship,
        role: "family",
        affection: Math.min(c.relationship.affection, 50),
        loyalty: Math.min(c.relationship.loyalty, 40),
        bond: 1
      };
      return c;
    });
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
  /** 最近一次战败事件（供 UI 展示） */
  lastDefeatEvent: DefeatEvent | null = null;
  flags: Record<string, unknown>;
  registry: SceneRegistry;
  offspring: Offspring[];
  /** 当前天气，影响保暖判定 */
  weather: Weather;
  /** 基地设施 */
  base: Base;
  /** 世界地图 */
  world: WorldMap;
  /** 当前使用的交通方式 */
  travelMode: TravelMode["id"];
  /** 房车 */
  vehicle: Vehicle;
  /** 主线状态 */
  quests: Record<string, QuestState>;
  /** 防御状态（名声/血腥值/围墙破损/被掳走） */
  defense: DefenseJSON;
  /** 当前战斗（null 表示不在战斗中） */
  combat: CombatState | null;
  /** 后庭准备进度：同伴 id → 已完成步骤数 */
  analPrep: Record<string, number>;
  /** 加成共享授权（玩家决定哪些加成惠及后宫） */
  share: ShareState;
  /**
   * 临时扶她药状态：同伴 id → { 类型, 到期日 }。
   *
   * 为什么放在 session 而不是 physiology：physiology 存的是「天生性征」，
   * 扶她药是几小时到一天的临时状态（INV-3），混进去会污染存档与生理判定。
   */
  futaMeds: Record<string, { type: MedType; untilDay: number }>;
  /** 本次战斗的逃跑尝试次数（影响随机源，使重复尝试结果不同） */
  private fleeAttempts = 0;

  private opts: {
    heroName: string;
    lustDailyGain: number;
    researchRate: number;
    instantResearch: boolean;
    freezeTime: boolean;
  };

  constructor(options: SessionOptions = {}) {
    // 序章从「末日前 30 天」开始，不是第 1 天
    this.time = options.time ?? makeTime(PROLOGUE_DAYS.normal, 8 * 60);
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
      wardrobe: presetWardrobe("hero"),
      growth: newHeroGrowth(),
      proficiency: newProficiency(),
      sexStats: newSexStats()
    };

    this.companions = defaultCompanions();
    this.tech = newTechState();
    this.backpack = newContainer(options.backpackWeight ?? 40, options.backpackSlots ?? 30);
    this.storage = newStorage();
    if (options.resources) {
      this.storage = addMany(this.storage, Object.entries(options.resources).map(([id, n]) => ({ id, n }))).container;
    }
    this.flags = {};
    // 序章起始状态：末日前 30 天，尚未觉醒
    this.flags["prologue_stage"] = "normal";
    this.flags["prologue_days_left"] = PROLOGUE_DAYS.normal;
    this.flags["prologue_fired"] = [];
    this.flags["ai_awakened"] = false;
    this.flags["shelter_built"] = false;
    this.flags["outbreak_happened"] = false;
    this.registry = new SceneRegistry();
    this.offspring = [];
    this.weather = "clear";
    this.base = newBase();
    this.world = newWorldMap();
    this.travelMode = "walk";
    this.vehicle = newVehicle();
    this.quests = newQuestStates();
    this.defense = newDefenseState();
    this.combat = null;
    this.analPrep = {};
    this.share = newShareState();
    this.futaMeds = {};
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
      hero_charm: charmOf(this.hero.wardrobe),
      baseBuilt: this.base.facilities.filter((x) => x.tier > 0).length,
      housingCapacity: livingCapacity(this.base),
      privateRoom: hSceneUnlocked(this.base),
      region: this.world.current,
      regionDanger: effectiveDanger(this.world, this.world.current),
      discoveredRegions: Object.values(this.world.regions).filter((r) => r.discovered).length,
      totalKm: this.world.totalKm,
      vehicleArmor: vehicleStats(this.vehicle).armorLevel,
      vehicleRange: vehicleStats(this.vehicle).range,
      vehiclePrivate: vehicleHasPrivateRoom(this.vehicle),
      questsCompleted: Object.values(this.quests).filter((q) => q.completed).length,
      questsTotal: QUESTS.length,
      defenseTier: this.defenseLevel().tier,
      defenseSafety: this.defenseLevel().safety,
      reputation: this.defense.reputation,
      blood: this.defense.blood,
      wallDamage: this.defense.wallDamage,
      capturedCount: this.defense.captured.length
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
      // 成长数据（供剧本条件判断）
      v[`${c.id}_growth`] = growthLevel(c.growth);
      v[`${c.id}_acts`] = c.growth.totalActs;
      v[`${c.id}_births`] = c.growth.births;
      v[`${c.id}_perks`] = c.growth.perks.length;
      v[`${c.id}_prof_mouth`] = partLevel(c.growth.proficiency, "mouth");
      v[`${c.id}_prof_vagina`] = partLevel(c.growth.proficiency, "vagina");
      v[`${c.id}_prof_anus`] = partLevel(c.growth.proficiency, "anus");
      v[`${c.id}_prof_toy`] = partLevel(c.growth.proficiency, "toy");
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
  private apply(out: TickOutput, elapsedHours = 0): TickOutput {
    this.time = out.time;

    // 建造推进（建造效率受工坊与机械师岗位加成）
    if (elapsedHours > 0 && this.base.building) {
      const craftRate = this.baseBonuses()["craftRate"] ?? 0;
      const crew = this.companions
        .filter((c) => c.joined && (c.job.id === "craft" || c.job.id === "logistics"))
        .reduce((s, c) => s + c.job.bonus, 0);
      const rate = 1 + craftRate + crew;
      const bt = tickBuild(this.base, elapsedHours, rate);
      this.base = bt.base;
      if (bt.completed) {
        const def = facilityDef(bt.completed);
        out.warnings.push(`建成：${def?.name ?? bt.completed} Lv${bt.completedTier}`);
      }
    }
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
    return this.apply(out, hours);
  }

  /** 快进若干天（睡眠） */
  sleep(days = 1): TickOutput {
    const out = fastForward(this.tickInput("sleep"), days);
    const result = this.apply(out, days * 24);
    // 睡觉期间逐夜判定遇袭（夜间遭遇自动转入战斗）
    for (let d = 0; d < days; d++) {
      const ev = this.rollTonightRaid();
      if (ev) {
        const r = this.resolveRaidEvent(ev, ev.canNegotiate ? "negotiate" : "fight", true);
        result.warnings.push(`夜袭：${RAID_LABEL[ev.kind]}（${OUTCOME_LABEL[r.outcome]}）`);
        // 若转入战斗则中断睡眠，把控制权交给玩家
        if (this.inCombat()) {
          result.warnings.push("遭遇战已开始，请前往战斗界面");
          break;
        }
      }
    }
    return result;
  }

  /** 同伴的欲情按天累积（独立于主角），并累计岗位经验 */
  tickCompanionLust(days: number, perDay = 5): void {
    for (const c of this.companions) {
      if (!c.joined) continue;

      // 被动增益影响欲情增速
      const mult = perkMultipliers(c.growth).lustRate;
      const r = tickLust(c.lust, days, perDay * mult);
      c.lust = r.lust;

      // 在岗的累计岗位经验（每天 1 点）
      if (c.job.id) {
        c.growth = recordJobDay(c.growth, c.job.id);
      }
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

  // ---------- 基地建造 ----------

  /** 建造可用性检查 */
  buildCheck(facilityId: string): BuildCheck | null {
    const def = facilityDef(facilityId);
    if (!def) return null;
    return checkBuild(
      this.base, def, [...this.tech.unlocked], this.resources,
      (cost) => missingFor(this.mergedStorage(), cost)
    );
  }

  /** 开工建造（扣除材料） */
  beginBuild(facilityId: string): { ok: boolean; reason?: string; missing?: Record<string, number> } {
    const check = this.buildCheck(facilityId);
    if (!check) return { ok: false, reason: "unknown-facility" };
    if (!check.ok) return { ok: false, reason: check.reason, missing: check.missingResource };

    if (!this.spendMerged(check.cost)) {
      return { ok: false, reason: "missing-resource", missing: missingFor(this.mergedStorage(), check.cost) };
    }
    this.base = startBuild(this.base, facilityId);
    return { ok: true };
  }

  /** 立即完工（作弊器） */
  finishBuild(facilityId: string): void {
    this.base = instantBuild(this.base, facilityId);
  }

  /** 一键建成整层（作弊器） */
  finishAllBuilds(level?: BaseLevel): void {
    this.base = instantBuildAll(this.base, level);
  }

  /** 拆除设施 */
  demolishFacility(facilityId: string): void {
    this.base = demolish(this.base, facilityId);
  }

  /** 某设施当前等级 */
  tierOf(facilityId: string): number {
    return tierOf(this.base, facilityId);
  }

  /** 基地加成 */
  baseBonuses(): Record<string, number> {
    return aggregateFacilityBonuses(this.base);
  }

  /** 设施当前效果文本 */
  facilityEffect(facilityId: string): string {
    const def = facilityDef(facilityId);
    if (!def) return "";
    return effectText(this.base, def);
  }

  /** 基地概览 */
  baseSummary() {
    return summarize(this.base);
  }

  /** 居住容量（同伴上限） */
  housingCapacity(): number {
    return livingCapacity(this.base);
  }

  /** 是否已解锁私密场景设施 */
  privateUnlocked(): boolean {
    return hSceneUnlocked(this.base);
  }

  /** 已建成设施清单 */
  builtFacilities(): Array<{ def: FacilityDef; tier: number }> {
    const out: Array<{ def: FacilityDef; tier: number }> = [];
    for (const fac of this.base.facilities) {
      if (fac.tier <= 0) continue;
      const def = facilityDef(fac.id);
      if (def) out.push({ def, tier: fac.tier });
    }
    return out;
  }

  // ---------- 探索 ----------

  /** 当前位置定义 */
  here(): RegionDef | undefined {
    return currentRegion(this.world);
  }

  /** 设置交通方式 */
  setTravelMode(mode: TravelMode["id"]): void {
    this.travelMode = mode;
  }

  /** 是否拥有车辆（车库已建成） */
  vehicleAvailable(): boolean {
    return this.tierOf("garage") > 0;
  }

  /** 装甲房车是否可用（房车装甲科技） */
  armoredAvailable(): boolean {
    return this.has("vehicle_armor_b") || this.tierOf("garage") >= 2;
  }

  /** 当前燃料储备 */
  fuel(): number {
    return countOf(this.storage, "gunpowder") * 10 + countOf(this.backpack, "gunpowder") * 10;
  }

  /** 规划旅行 */
  planTravelTo(regionId: string, mode?: TravelMode["id"]): TravelPlan {
    const m = mode ?? this.travelMode;
    const available: TravelMode["id"] = this.vehicleAvailable() ? m : (m === "car" || m === "apc" ? "walk" : m);
    // 车辆模式读房车油箱；步行/自行车不需要燃料
    const usesVehicle = available === "car" || available === "apc";
    return planTravel(this.world, regionId, available, {
      fuel: usesVehicle ? this.vehicle.fuel : this.fuel(),
      stamina: this.hero.survival.stamina,
      vehicleAvailable: this.vehicleAvailable(),
      armored: this.armoredAvailable()
    });
  }

  /** 执行旅行 */
  travelTo(regionId: string, mode?: TravelMode["id"]): { ok: boolean; plan: TravelPlan; encounters: number; discovered: string[]; reason?: string } {
    const plan = this.planTravelTo(regionId, mode);
    if (!plan.reachable) {
      return { ok: false, plan, encounters: 0, discovered: [], reason: plan.reason };
    }

    // 房车出行消耗燃料
    if (plan.mode.id === "car" || plan.mode.id === "apc") {
      const dr = driveVehicle(this.vehicle, plan.km, 0);
      this.vehicle = dr.vehicle;
    }

    // 消耗体力与时间
    const seed = this.time.day * 10000 + this.time.minute;
    const rng = mulberry32(seed);
    const r = travel(this.world, plan, seed, rng);
    this.world = r.map;

    this.hero.survival = {
      ...this.hero.survival,
      stamina: Math.max(0, this.hero.survival.stamina - plan.staminaCost)
    };

    // 推进时间
    const out = tick(this.tickInput("expedition"), plan.hours);
    this.apply(out, plan.hours);

    return { ok: true, plan, encounters: r.encounters, discovered: r.discovered };
  }

  /** 在当前区域搜刮一次，产出到背包 */
  lootCurrent(): { tableId: string | null; got: Array<{ id: string; n: number; quality: string }>; exhausted: boolean } {
    const seed = this.time.day * 10000 + this.time.minute + this.world.totalKm;
    const rng = mulberry32(seed);
    const r = lootRegion(this.world, rng);
    this.world = r.map;
    if (!r.tableId) return { tableId: null, got: [], exhausted: true };

    const loot = this.loot(r.tableId, r.seed);
    return { tableId: r.tableId, got: loot.got.map((g) => ({ id: g.id, n: g.n, quality: g.quality })), exhausted: false };
  }

  /** 清理当前区域（降低危险度） */
  clearCurrent(): number {
    const before = effectiveDanger(this.world, this.world.current);
    this.world = clearRegion(this.world, this.world.current);
    const after = effectiveDanger(this.world, this.world.current);
    return before - after;
  }

  /** 探索进度 */
  exploration(): { discovered: number; total: number; percent: number } {
    return explorationProgress(this.world);
  }

  /** 地图概览文本 */
  mapText(): string {
    return describeMap(this.world);
  }

  // ---------- 房车 ----------

  /** 房车当前数值 */
  vehicleStats(): VehicleStats {
    return vehicleStats(this.vehicle);
  }

  /** 改装可用性检查 */
  vehicleModCheck(modId: string): ModCheck | null {
    const def = modDef(modId);
    if (!def) return null;
    return checkMod(this.vehicle, def, [...this.tech.unlocked],
      (cost) => missingFor(this.mergedStorage(), cost));
  }

  /** 安装改装（扣材料） */
  installVehicleMod(modId: string): { ok: boolean; reason?: string; missing?: Record<string, number> } {
    const check = this.vehicleModCheck(modId);
    if (!check) return { ok: false, reason: "unknown-mod" };
    if (!check.ok) return { ok: false, reason: check.reason, missing: check.missingResource };

    const def = modDef(modId)!;
    if (!this.spendMerged(def.cost)) {
      return { ok: false, reason: "missing-resource" };
    }
    this.vehicle = installMod(this.vehicle, modId);
    return { ok: true };
  }

  /** 卸载改装 */
  uninstallVehicleMod(modId: string): void {
    this.vehicle = removeMod(this.vehicle, modId);
  }

  /** 一键装齐（作弊器） */
  installAllVehicleMods(): void {
    this.vehicle = installAll(this.vehicle);
  }

  /** 加油 */
  refuelVehicle(liters: number): void {
    this.vehicle = refuel(this.vehicle, liters);
  }

  /** 充电 */
  chargeVehicle(kwh: number): void {
    this.vehicle = chargeVehicle(this.vehicle, kwh);
  }

  /** 修理车身 */
  repairVehicle(amount = 100): void {
    this.vehicle = repairVehicle(this.vehicle, amount);
  }

  /** 行驶（供旅行调用） */
  driveVehicle(km: number, offroad = 0) {
    const r = driveVehicle(this.vehicle, km, offroad);
    this.vehicle = r.vehicle;
    return r;
  }

  /** 房车改装进度 */
  vehicleProgress() {
    return modProgress(this.vehicle);
  }

  /** 房车是否有私室（远征亲密场景） */
  vehiclePrivateRoom(): boolean {
    return vehicleHasPrivateRoom(this.vehicle);
  }

  /** 房车乘员容量 */
  vehicleCrew(): number {
    return crewCapacity(this.vehicle);
  }

  /** 房车摘要 */
  vehicleText(): string {
    return describeVehicle(this.vehicle);
  }

  // ---------- 主线 ----------

  /** 主线上下文 */
  private questContext(companionId: string): QuestContext {
    const c = this.companion(companionId);
    const countAny = (itemId: string) =>
      countOf(this.storage, itemId) + countOf(this.backpack, itemId);
    return {
      flags: this.flags,
      region: this.world.current,
      countOf: countAny,
      affection: c?.relationship.affection ?? 0,
      paused: false
    };
  }

  /** 检查某条主线的下一步 */
  questCheck(questId: string): QuestCheck | null {
    const def = questDef(questId);
    const st = this.quests[questId];
    if (!def || !st) return null;
    const ctx = this.questContext(def.companionId);
    ctx.paused = st.paused;
    return checkStep(def, st, ctx);
  }

  /** 推进主线一步 */
  advanceQuest(questId: string): {
    ok: boolean;
    reason?: string;
    step?: string;
    questCompleted?: boolean;
    rewardItems?: Record<string, number>;
    rewardAffection?: number;
    granted?: Array<{ id: string; name: string; title: string }>;
    rewards?: string[];
  } {
    const def = questDef(questId);
    const st = this.quests[questId];
    if (!def || !st) return { ok: false, reason: "unknown-quest" };

    const ctx = this.questContext(def.companionId);
    ctx.paused = st.paused;
    const check = checkStep(def, st, ctx);
    if (!check.ok) return { ok: false, reason: check.reason };

    const r = advanceQuestPure(this.quests, def, ctx);
    this.quests = r.states;

    if (r.step?.requiresItems) this.spendMerged(r.step.requiresItems);
    for (const [id, n] of Object.entries(r.rewardItems)) this.addToStorage(id, n);

    // 好感：同伴已在队则直接给，否则保留在 pendingAffection 待加入时补发
    if (r.rewardAffection > 0) {
      const c = this.companion(def.companionId);
      if (c) {
        c.relationship = gain(c.relationship, r.rewardAffection, 0);
        this.quests[questId] = {
          ...this.quests[questId],
          pendingAffection: Math.max(0, (this.quests[questId].pendingAffection ?? 0) - r.rewardAffection)
        };
      }
    }

    if (r.setFlag) this.flags[r.setFlag] = true;

    // 同步主线阶段变量，供剧本条件 mainline_<companion>_stage >= N 使用
    const stageNow = this.quests[questId]?.stage ?? 0;
    this.flags[`mainline_${def.companionId}_stage`] = stageNow;

    if (r.questCompleted) {
      this.flags[def.companionId + "_joined"] = true;
      this.flags[questId + "_done"] = true;
    }

    // 附带后宫加入
    const granted: Array<{ id: string; name: string; title: string }> = [];
    for (const g of r.grantsCompanions) {
      if (this.companion(g.id)) continue;
      const def = companionDef(g.id);
      if (def) {
        this.companions.push(makeCompanion(def, true));
      } else {
        // 数据缺失时退化为最小构造
        this.companions.push({
          id: g.id,
          growth: newCompanionGrowth(),
          identity: { name: g.name, title: g.title, age: 18, heightCm: 160, tags: ["side"] },
          physiology: { sex: "female", virgin: true, pregnant: false, pregnancyProgress: 0, fertileWindow: false },
          relationship: { ...DEFAULT_RELATIONSHIP, affection: 25, loyalty: 15, bond: 1, role: "side" },
          lust: { ...DEFAULT_LUST, value: 20 },
          job: { id: null, bonus: 0, daysOnJob: 0 },
          wardrobe: presetWardrobe("sister2"),
          joined: true,
          hadPartner: false,
          sexStats: newSexStats()
        });
      }
      granted.push(g);
    }

    // 主线目标同伴在完成时加入，并补发暂存好感
    if (r.questCompleted && !this.companion(def.companionId)) {
      const pending = this.quests[questId]?.pendingAffection ?? 0;
      const cdef = companionDef(def.companionId);
      if (cdef) {
        const c = makeCompanion(cdef, true);
        c.relationship = {
          ...c.relationship,
          affection: Math.min(100, c.relationship.affection + pending)
        };
        this.companions.push(c);
      }
      this.quests[questId] = { ...this.quests[questId], pendingAffection: 0 };
    }

    // 附带后宫补发暂存好感
    if (granted.length > 0) {
      const pending = this.quests[questId]?.pendingAffection ?? 0;
      if (pending > 0) {
        for (const g of granted) {
          const nc = this.companion(g.id);
          if (nc) nc.relationship = gain(nc.relationship, pending, 0);
        }
        this.quests[questId] = { ...this.quests[questId], pendingAffection: 0 };
      }
    }

    return {
      ok: true,
      step: r.step?.name,
      questCompleted: r.questCompleted,
      rewardItems: r.rewardItems,
      rewardAffection: r.rewardAffection,
      granted,
      rewards: r.rewards
    };
  }

  pauseQuest(questId: string): void {
    this.quests = pauseQuestPure(this.quests, questId);
  }

  resumeQuest(questId: string): void {
    this.quests = resumeQuestPure(this.quests, questId);
  }

  resetQuest(questId: string): void {
    this.quests = resetQuestPure(this.quests, questId);
  }

  questSummary(): QuestSummary {
    return summarizeQuests(this.quests);
  }

  questProgressFor(companionId: string): string {
    const def = questForCompanion(companionId);
    if (!def) return "（无主线）";
    const st = this.quests[def.id];
    return st ? progressText(def, st) : "（无主线）";
  }

  /** 随机遭遇招募 */
  tryRecruitHere(seed: number): RecruitResult {
    const here = currentRegion(this.world);
    if (!here) return { template: null, success: false, affection: 0 };
    const rng = mulberry32(seed);
    const r = tryRecruit([here.id, ...(here.tags ?? [])], rng);

    if (r.success && r.template) {
      const id = r.template.id + "_" + this.companions.length;
      if (!this.companion(id)) {
        // 随机招募的角色来自模板库，没有预置数据，按模板构造
        this.companions.push({
          id,
          growth: newCompanionGrowth(),
          identity: { name: r.template.name, title: r.template.title, age: 24, heightCm: 165, tags: [r.template.trait, "recruited"] },
          physiology: { sex: "female", virgin: true, pregnant: false, pregnancyProgress: 0, fertileWindow: false },
          relationship: { ...DEFAULT_RELATIONSHIP, affection: r.affection, loyalty: 10, bond: 1, role: "side" },
          lust: { ...DEFAULT_LUST, value: 15 },
          job: { id: null, bonus: 0, daysOnJob: 0 },
          wardrobe: presetWardrobe("sister2"),
          joined: true,
          hadPartner: false,
          sexStats: newSexStats()
        });
      }
    }
    return r;
  }

  // ---------- 作弊器接线 ----------

  /**
   * 一键应用作弊效果到全部系统。
   * 开启作弊即全开（对应设计：不分档）。
   */
  // ---------- 科技树双轨与科研人员 ----------

  /** 某节点的归属（共用 / 主角个人） */
  techScopeOf(nodeId: string): TechScope | null {
    const node = findTechNode(nodeId);
    if (!node) return null;
    const branch = techBranchOf(nodeId);
    if (!branch) return null;
    return nodeScope(node, branch.id);
  }

  /** 该节点是否可由后宫科研人员参与 */
  canCompanionResearchTech(nodeId: string): boolean {
    const node = findTechNode(nodeId);
    if (!node) return false;
    const branch = techBranchOf(nodeId);
    if (!branch) return false;
    return canCompanionResearch(node, branch.id);
  }

  /** 科技树双轨统计 */
  techScopeStats() {
    return globalScopeStats();
  }

  /** 全部节点的归属映射 */
  techScopeMap(): Record<string, TechScope> {
    return scopeMap();
  }

  /**
   * 科研人员的参与贡献。
   * 只有共用科技才能让科研人员参与；主角个人科技只能主角自己研究。
   */
  researchContributors(nodeId: string): Array<{
    id: string;
    name: string;
    contribution: number;
    craftLevel: number;
    medicalLevel: number;
    jobId: string | null;
    eligible: boolean;
    reason?: string;
  }> {
    const canResearch = this.canCompanionResearchTech(nodeId);

    return this.joined()
      .filter((c) => c.id !== "ai")
      .map((c) => {
        const craft = c.growth.skills.find((s) => s.id === "craft")?.level ?? 0;
        const medical = c.growth.skills.find((s) => s.id === "medical")?.level ?? 0;
        const contribution = researchContribution({
          craftLevel: craft,
          medicalLevel: medical,
          jobId: c.job.id,
          perkCount: c.growth.perks.length
        });

        if (c.growth.injuries > 0) {
          return {
            id: c.id, name: c.identity.name, contribution: 0,
            craftLevel: craft, medicalLevel: medical, jobId: c.job.id,
            eligible: false, reason: "有伤在身"
          };
        }

        if (!canResearch) {
          return {
            id: c.id, name: c.identity.name, contribution: 0,
            craftLevel: craft, medicalLevel: medical, jobId: c.job.id,
            eligible: false, reason: "该科技为主角个人专属"
          };
        }

        return {
          id: c.id, name: c.identity.name, contribution,
          craftLevel: craft, medicalLevel: medical, jobId: c.job.id,
          eligible: contribution > 0
        };
      })
      .sort((a, b) => b.contribution - a.contribution);
  }

  /** 含科研人员加成的研究速率 */
  researchRateFor(nodeId: string): {
    base: number;
    teamBonus: number;
    rate: number;
    contributors: number;
    canDelegate: boolean;
  } {
    const bonuses = this.heroBonuses();
    const base = bonuses.researchMult;
    const sharingOn = this.isSharedWithHarem("researchRate");
    const canDelegate = this.canCompanionResearchTech(nodeId);
    const contributions = canDelegate && sharingOn
      ? this.researchContributors(nodeId).filter((x) => x.eligible).map((x) => x.contribution)
      : [];

    const t = teamResearchRate(base, contributions);
    return {
      base,
      teamBonus: t.bonus,
      rate: t.rate,
      contributors: t.contributors,
      canDelegate
    };
  }

  /** 开工研究（含科研人员加成） */
  beginResearchWithTeam(nodeId: string): { ok: boolean; reason?: string; rate?: number } {
    const info = this.researchRateFor(nodeId);
    const r = this.beginResearch(nodeId);
    if (!r.ok) return { ok: false, reason: r.reason };
    return { ok: true, rate: info.rate };
  }

  // ---------- 战斗扩展 ----------

  /** 当前战斗地形（由所在区域推断） */
  combatTerrain(): CombatTerrain {
    const here = this.here();
    return terrainFromRegion(here?.terrain ?? "rural");
  }

  /** 敌方回合（技能使用后调用） */
  combatEnemyTurn(): void {
    if (!this.combat || this.combat.over) return;
    this.combat = enemyTurn(this.combat, this.combatRandom());
    if (!this.combat.over) {
      this.combat = advanceRound(this.combat);
    }
    this.applyCombatOutcome();
  }

  /** 当前战斗的技能可用性（供 UI） */
  combatSkillStatus(): Array<{
    id: string;
    name: string;
    ok: boolean;
    reason?: string;
  }> {
    if (!this.combat) return [];
    const ext = initExtended(this.combat, this.combatTerrain());
    return COMBAT_SKILLS.map((sk) => {
      const check = canUseSkill(ext, this.combat!.player.id, sk.id);
      return { id: sk.id, name: sk.name, ok: check.ok, reason: check.reason };
    });
  }

  /** 当前战斗的详细状态（供 UI 展示攻防数值） */
  combatDetail(): {
    terrain: CombatTerrain;
    terrainLabel: string;
    terrainDesc: string;
    player: { attack: number; defense: number; dodge: number; critRate: number };
    summary: ReturnType<typeof combatSummary>;
  } | null {
    if (!this.combat) return null;
    const terrain = this.combatTerrain();
    const ext = initExtended(this.combat, terrain);
    const st = effectiveStats(ext, this.combat.player.id, "player");
    return {
      terrain,
      terrainLabel: COMBAT_TERRAIN_LABEL[terrain],
      terrainDesc: COMBAT_TERRAIN_DESC[terrain],
      player: st,
      summary: combatSummary(ext)
    };
  }

  // ---------- 无人机战斗 ----------

  /** 已解锁科技的加成表（键→数值），无人机等系统按 key 查表 */
  techBonusTable(): Record<string, number> {
    const out = aggregateBonuses(this.tech);
    // 后宫授权的共用加成也计入（按共享比例）
    const shared = this.flags["shared_tech_bonuses"];
    if (shared && typeof shared === "object") {
      for (const [k, v] of Object.entries(shared as Record<string, unknown>)) {
        if (typeof v === "number") out[k] = (out[k] ?? 0) + v;
      }
    }
    return out;
  }

  /** 已解锁的无人机列表（供编队界面） */
  availableDrones(): DroneDef[] {
    return availableDrones(this.techBonusTable());
  }

  /** 编队上限 */
  droneSquadCap(): number {
    return droneSquadCap(this.techBonusTable());
  }

  /** 玩家选定的无人机编队 id（存在 flags 里） */
  droneSquadIds(): string[] {
    const raw = this.flags["drone_squad"];
    return Array.isArray(raw) ? (raw as string[]) : [];
  }

  /** 设置编队（超出上限会截断；无效 id 会被忽略） */
  setDroneSquad(ids: string[]): void {
    const avail = new Set(this.availableDrones().map((d) => d.id));
    const cap = this.droneSquadCap();
    this.flags["drone_squad"] = ids.filter((id) => avail.has(id)).slice(0, cap);
  }

  /** 当前编队的战斗单位 */
  combatDrones(): DroneUnit[] {
    const picked = this.droneSquadIds();
    const units = squadDrones(this.techBonusTable(), picked.length ? picked : undefined);
    // 战斗中的受损状态存在 flags，避免每回合重置
    const dmgRaw = this.flags["drone_damage"];
    const dmg = dmgRaw && typeof dmgRaw === "object" ? (dmgRaw as Record<string, number>) : {};
    return units.map((u) => {
      const lost = dmg[u.id] ?? 0;
      const hp = Math.max(0, u.hp - lost);
      return { ...u, hp, down: hp <= 0 };
    });
  }

  /** 持久化无人机受损 */
  private saveDroneDamage(units: DroneUnit[]): void {
    const dmg: Record<string, number> = {};
    for (const u of units) dmg[u.id] = u.maxHp - u.hp;
    this.flags["drone_damage"] = dmg;
  }

  /** 编队概览（供 UI） */
  droneSquadInfo(): {
    available: DroneDef[];
    picked: DroneUnit[];
    cap: number;
    summary: ReturnType<typeof squadSummary>;
  } {
    const picked = this.combatDrones();
    return {
      available: this.availableDrones(),
      picked,
      cap: this.droneSquadCap(),
      summary: squadSummary(picked)
    };
  }

  /**
   * 执行一轮无人机行动。
   * 在玩家行动之后、敌方回合之前调用。
   */
  combatDroneTurn(): DroneTurnResult | null {
    if (!this.combat || this.combat.over) return null;
    const units = this.combatDrones();
    if (!units.length) return null;

    const allies = [
      { id: this.combat.player.id, name: this.combat.player.name, hp: this.combat.player.hp, maxHp: this.combat.player.hpMax },
      ...this.combat.allies.map((a) => ({ id: a.id, name: a.name, hp: a.hp, maxHp: a.hpMax }))
    ];
    const enemies = this.combat.enemies.map((e) => ({
      id: e.id, name: e.name, hp: e.hp, maxHp: e.hpMax
    }));

    const res = droneTurn({
      units,
      allies,
      enemies,
      round: this.combat.round,
      accuracy: { value: 0 },
      damageReduction: { value: 0 },
      skipEnemy: { value: 0 }
    });

    const cs = this.combat;

    // 应用敌人伤害
    if (Object.keys(res.enemyDamage).length) {
      cs.enemies = cs.enemies.map((e) => {
        const d = res.enemyDamage[e.id];
        if (!d) return e;
        return { ...e, hp: Math.max(0, e.hp - d) };
      });
      // 无人机击杀也算战果
      if (cs.enemies.every((e) => e.hp <= 0)) {
        cs.over = true;
        cs.victory = true;
      }
    }

    // 应用治疗
    if (Object.keys(res.allyHeal).length) {
      const healHp = (hp: number, max: number, id: string) => {
        const h = res.allyHeal[id];
        return h ? Math.min(max, hp + h) : hp;
      };
      cs.player = { ...cs.player, hp: healHp(cs.player.hp, cs.player.hpMax, cs.player.id) };
      cs.allies = cs.allies.map((a) => ({ ...a, hp: healHp(a.hp, a.hpMax, a.id) }));
    }

    // 冷却推进
    const acted = res.actions.map((a) => a.droneId);
    const next = tickDrones(this.combatDrones(), acted);
    this.saveDroneDamage(next);

    for (const a of res.actions) cs.log.push(a.icon + " " + a.text);

    if (cs.over) this.applyCombatOutcome();
    return res;
  }

  /** 敌人攻击时，有几率打无人机而非主力 */
  droneInterceptChance(): number {
    const units = this.combatDrones();
    if (!units.some((u) => !u.down)) return 0;
    const decoys = units.filter((u) => !u.down && (u.def.role === "decoy" || u.def.role === "shield"));
    return decoys.length ? 0.45 : 0.2;
  }

  /** 战斗结束后修复全部无人机 */
  repairDronesAfterCombat(): void {
    this.flags["drone_damage"] = {};
  }

  // ---------- 分支事件（怀孕线 / 战败线） ----------

  /** 主角当前怀孕阶段（未怀孕返回 null） */
  heroPregnancyStage(): BranchPregStage | null {
    const p = this.hero.pregnancy;
    if (!p) return null;
    return branchPregStage(p.progress);
  }

  /** 某同伴当前怀孕阶段 */
  companionPregnancyStage(id: string): BranchPregStage | null {
    const c = this.companion(id);
    if (!c || !c.physiology.pregnant) return null;
    return branchPregStage(c.physiology.pregnancyProgress);
  }

  /** 当前应触发的怀孕事件（主角） */
  currentPregnancyEvent(): PregnancyEvent | null {
    const stage = this.heroPregnancyStage();
    if (!stage) return null;

    const list = pregnancyEventsForStage(stage);
    if (list.length === 0) return null;

    // 一次性事件只触发一次
    const fired = this.flags["preg_events_fired"] as string[] | undefined;
    const firedList = fired ?? [];
    const available = list.filter((e) => e.repeatable || !firedList.includes(e.id));

    return available[0] ?? null;
  }

  /** 标记怀孕事件已触发 */
  markPregnancyEventFired(id: string): void {
    const fired = (this.flags["preg_events_fired"] as string[] | undefined) ?? [];
    if (!fired.includes(id)) {
      this.flags["preg_events_fired"] = [...fired, id];
    }
  }

  /**
   * 战败结算。
   *
   * 根据是否有同伴随行、敌人是否人形，
   * 掷出一个战败结果并应用后果。
   */
  resolveDefeat(): DefeatEvent {
    const c = this.combat;
    const hasCompanion = (c?.allies.length ?? 0) > 0;
    const isHumanoid = (c?.enemies ?? []).some((e) => e.humanoid);

    const rng = this.combatRandom();
    const event = rollDefeatOutcome(hasCompanion, isHumanoid, rng);

    // 后果应用
    switch (event.outcome) {
      case "captured": {
        // 损失部分物资
        this.loseRandomStorage(0.3);
        this.defense = { ...this.defense, blood: Math.min(100, this.defense.blood + 5) };
        break;
      }
      case "escaped": {
        this.loseRandomStorage(0.5);
        this.hero.survival = {
          ...this.hero.survival,
          stamina: Math.max(5, Math.round(this.hero.survival.stamina * 0.4))
        };
        break;
      }
      case "rescued": {
        // 同伴受伤，好感提升
        for (const a of c?.allies ?? []) {
          const comp = this.companion(a.id);
          if (comp) {
            comp.growth = { ...comp.growth, injuries: comp.growth.injuries + 1 };
            this.gainAffection(comp.id, 8);
          }
        }
        this.loseRandomStorage(0.15);
        break;
      }
      case "abandoned": {
        this.loseRandomStorage(1.0);
        this.hero.survival = {
          ...this.hero.survival,
          stamina: 5,
          hunger: Math.max(5, this.hero.survival.hunger - 30),
          mood: Math.max(5, this.hero.survival.mood - 20)
        };
        this.time = { ...this.time, day: this.time.day + 3 };
        break;
      }
    }

    // 记录到独立字段（defense.history 只存夜袭记录）
    const log = (this.flags["defeat_log"] as Array<{ day: number; outcome: DefeatOutcome; label: string }> | undefined) ?? [];
    this.flags["defeat_log"] = [
      ...log,
      { day: this.time.day, outcome: event.outcome, label: DEFEAT_LABEL[event.outcome] }
    ].slice(-50);

    this.flags["last_defeat"] = event.outcome;
    this.flags["last_defeat_day"] = this.time.day;

    return event;
  }

  /** 损失一部分随机物资（从据点仓库扣除） */
  private loseRandomStorage(ratio: number): void {
    const rng = this.combatRandom();
    const stacks = this.storage.stacks.filter((s) => s.count > 0);
    if (stacks.length === 0) return;

    const count = Math.max(1, Math.round(stacks.length * ratio));
    for (let i = 0; i < count; i++) {
      const s = stacks[Math.floor(rng() * stacks.length)];
      if (!s) continue;
      const lost = Math.max(1, Math.round(s.count * ratio));
      const r = removeFrom(this.storage, s.itemId, lost);
      this.storage = r.container;
    }
  }

  /** 分支事件统计 */
  branchEventStats() {
    return branchStats();
  }

  /** 战败记录 */
  defeatLog(): Array<{ day: number; outcome: DefeatOutcome; label: string }> {
    return (this.flags["defeat_log"] as Array<{ day: number; outcome: DefeatOutcome; label: string }> | undefined) ?? [];
  }

  /** 全部战败事件（供 UI 浏览） */
  allDefeatEvents(): DefeatEvent[] {
    return DEFEAT_EVENTS;
  }

  /** 全部怀孕事件 */
  allPregnancyEvents(): PregnancyEvent[] {
    return PREGNANCY_EVENTS;
  }

  // ---------- 序章与教程 ----------

  /** 当前序章阶段 */
  prologueStage(): PrologueStage {
    const v = this.flags["prologue_stage"];
    return typeof v === "string" ? (v as PrologueStage) : "normal";
  }

  /** 设置序章阶段 */
  setPrologueStage(s: PrologueStage): void {
    this.flags["prologue_stage"] = s;
    this.flags["prologue_days_left"] = PROLOGUE_DAYS[s];
    // 末日倒计时：序章期间时间是负数（末日前）
    if (!prologueFinished(s) && s !== "outbreak" && s !== "settled") {
      this.time = { ...this.time, day: PROLOGUE_DAYS[s] };
    }
  }

  /** 序章是否已结束 */
  prologueDone(): boolean {
    return prologueFinished(this.prologueStage());
  }

  /** 序章进度 0-1 */
  prologueProgressValue(): number {
    return prologueProgress(this.prologueStage());
  }

  /** 当前应触发的序章场景 */
  currentPrologueScene(): PrologueScene | null {
    if (this.prologueDone()) return null;
    const stage = this.prologueStage();
    const list = prologueScenesForStage(stage);
    if (list.length === 0) return null;
    const fired = (this.flags["prologue_fired"] as string[] | undefined) ?? [];
    return list.find((s) => !fired.includes(s.id)) ?? null;
  }

  /** 推进序章（当前场景完成后调用） */
  advancePrologue(): PrologueStage {
    const cur = this.currentPrologueScene();
    if (cur) {
      const fired = (this.flags["prologue_fired"] as string[] | undefined) ?? [];
      if (!fired.includes(cur.id)) {
        this.flags["prologue_fired"] = [...fired, cur.id];
      }
      // 场景自身效果
      if (cur.stage === "outbreak") {
        this.flags["outbreak_happened"] = true;
        this.flags["shelter_built"] = true;
      }
      if (cur.stage === "ai_birth") {
        this.flags["ai_awakened"] = true;
      }
      if (cur.stage === "shelter") {
        this.flags["shelter_built"] = true;
      }
      if (cur.stage === "settled") {
        this.flags["shelter_built"] = true;
        this.flags["sister_knows"] = true;
      }
    }

    const next = nextPrologueStage(this.prologueStage());
    this.setPrologueStage(next);

    // 进入主游戏时归零时间
    if (next === "done") {
      this.time = { ...this.time, day: 1 };
      this.flags["game_started"] = true;
    }

    return next;
  }

  /** 序章阶段信息（供 UI） */
  prologueInfo(): {
    stage: PrologueStage;
    label: string;
    desc: string;
    daysLeft: number;
    progress: number;
    scene: PrologueScene | null;
    done: boolean;
  } {
    const stage = this.prologueStage();
    const days = PROLOGUE_DAYS[stage];
    return {
      stage,
      label: PROLOGUE_LABEL[stage],
      desc: PROLOGUE_DESC[stage],
      daysLeft: days,
      progress: prologueProgress(stage),
      scene: this.currentPrologueScene(),
      done: prologueFinished(stage)
    };
  }

  /** 全部序章场景（供 UI 浏览） */
  allPrologueScenes(): PrologueScene[] {
    return PROLOGUE_SCENES;
  }

  // ---------- 教程 ----------

  /** 已完成的教程步骤 */
  tutorialDone(): string[] {
    return (this.flags["tutorial_done"] as string[] | undefined) ?? [];
  }

  /** 当前应显示的教程步骤 */
  currentTutorial(): TutorialStep | null {
    const done = this.tutorialDone();
    return TUTORIAL_STEPS.find((t) => !done.includes(t.id)) ?? null;
  }

  /** 标记教程步骤完成 */
  completeTutorial(id: string): void {
    const done = this.tutorialDone();
    if (!done.includes(id)) {
      this.flags["tutorial_done"] = [...done, id];
    }
  }

  /** 教程进度 */
  tutorialProgressValue(): number {
    return this.tutorialDone().length / TUTORIAL_STEPS.length;
  }

  /** 房车来历 */
  vehicleOrigin() {
    return STARTING_VEHICLE;
  }

  /** 序章统计 */
  prologueStat() {
    return prologueStats();
  }

  // ---------- 作弊执行器 ----------

  /** 构建作弊宿主（把 session 能力暴露给 cheatRunner） */
  cheatHost(): CheatHost {
    const self = this;
    const ALL_PARTS: ActPart[] = ["mouth", "vagina", "anus", "hand", "breast", "thigh", "foot", "toy"];

    const maxProf = (p: Proficiency): Proficiency => {
      let out = p;
      for (const part of ALL_PARTS) {
        const act = ACTS.find((a) => a.part === part);
        if (!act) continue;
        for (let i = 0; i < 600; i++) out = recordAct(out, act.id).proficiency;
      }
      return out;
    };

    return {
      // 生存
      fillVitals() {
        self.hero.survival = {
          stamina: 100, hunger: 100, thirst: 100,
          energy: 100, mood: 100
        };
        for (const c of self.companions) {
          c.growth = { ...c.growth, stamina: c.growth.staminaMax, mood: 100 };
        }
      },
      clearLust() { self.cheatClearLust(); },
      maxLust() { self.cheatMaxLust(); },
      healAll() {
        for (const c of self.companions) c.growth = { ...c.growth, injuries: 0 };
      },

      // 主角成长
      setHeroLevel(n: number) { self.hero.growth = { ...self.hero.growth, level: n, exp: 0 }; },
      addHeroPoints(n: number) {
        self.hero.growth = { ...self.hero.growth, points: self.hero.growth.points + n };
      },
      maxHeroAttrs() {
        self.hero.growth = {
          ...self.hero.growth,
          attributes: { strength: 50, agility: 50, endurance: 50, perception: 50, willpower: 50, charisma: 50 }
        };
      },
      maxHeroSkills() {
        self.hero.growth = {
          ...self.hero.growth,
          skills: self.hero.growth.skills.map((s) => ({ ...s, level: 10, exp: 0 }))
        };
      },
      addHeroExp(n: number) {
        const r = gainExp(self.hero.growth, n);
        self.hero.growth = r.growth;
        return r.levelsGained;
      },

      // 后宫成长
      setAllCompanionLevel(n: number) {
        for (const c of self.companions) c.growth = { ...c.growth, level: n, exp: 0 };
      },
      maxAllCompanionSkills() {
        for (const c of self.companions) {
          c.growth = { ...c.growth, skills: c.growth.skills.map((s) => ({ ...s, level: 10, exp: 0 })) };
        }
      },
      maxAllCompanionMood() {
        for (const c of self.companions) c.growth = { ...c.growth, mood: 100 };
      },
      maxAllCompanionStamina() {
        for (const c of self.companions) c.growth = { ...c.growth, stamina: c.growth.staminaMax };
      },
      unlockAllCompanionPerks() {
        for (const c of self.companions) {
          let g = c.growth;
          for (let i = 0; i < 60; i++) {
            g = recordIntimacy(g, "oral_give", { bond: 5, affection: 100, loyalty: 100 }).growth;
          }
          for (let i = 0; i < 40; i++) g = recordJobDay(g, c.job.id ?? "idle");
          g = recordBirth(g, { bond: 5, affection: 100, loyalty: 100 }).growth;
          c.growth = g;
        }
      },
      maxAllIntimacyTier() {
        for (const c of self.companions) {
          c.relationship = { ...c.relationship, bond: 5 };
          // 亲密度层级由羁绊与累计亲密共同决定，需补足次数
          let g = c.growth;
          if (g.totalActs < 60) {
            for (let i = g.totalActs; i < 60; i++) {
              g = recordIntimacy(g, "oral_give", { bond: 5, affection: 100, loyalty: 100 }).growth;
            }
          }
          c.growth = refreshIntimacyTier(g, 5);
        }
      },
      healAllCompanions() {
        for (const c of self.companions) c.growth = { ...c.growth, injuries: 0 };
      },

      // 亲密
      maxHeroProficiency() { self.hero.proficiency = maxProf(self.hero.proficiency); },
      maxCompanionProficiency() {
        for (const c of self.companions) {
          c.growth = { ...c.growth, proficiency: maxProf(c.growth.proficiency) };
        }
      },
      completeAllAnalPrep() {
        for (const c of self.companions) self.analPrep[c.id] = ENEMA_STEPS.length;
      },
      clearAllAnalPrep() { self.analPrep = {}; },
      grantAllIntimateItems() {
        const items = [
          "dildo_double", "strap_on", "vibrator", "egg_vibe", "restraint_set",
          "lube", "anal_plug_set", "anal_beads", "vibrating_plug",
          "enema_kit", "enema_solution", "anal_cleanser",
          "anal_soothing_cream", "intimate_wipes", "warming_lube", "numbing_lube"
        ];
        for (const id of items) self.addToStorage(id, 99);
        return items.length;
      },

      // 基地科技
      unlockAllTech() { self.unlockEverything(); return self.tech.unlocked.size; },
      buildAllFacilities() {
        self.base = instantBuildAll(self.base);
        return self.base.facilities.filter((f) => f.tier > 0).length;
      },
      clearBuildQueue() { self.base = { ...self.base, building: null }; },
      grantMaterials() { return self.giveCheatMaterials(); },

      // 房车
      installAllMods() { self.vehicle = installAll(self.vehicle); return self.vehicle.mods.length; },
      fillVehicle() { self.vehicle = { ...self.vehicle, fuel: 200, charge: 100 }; },
      repairVehicle() { self.vehicle = { ...self.vehicle, hull: 100 }; },

      // 世界
      discoverAll() {
        for (const r of REGIONS) {
          const st = self.world.regions[r.id];
          if (st) st.discovered = true;
        }
      },
      clearAllRegions() {
        for (const r of REGIONS) {
          const st = self.world.regions[r.id];
          if (st) { st.discovered = true; st.cleared = r.lootNodes; st.nodesLeft = 0; }
        }
      },
      refillLoot() {
        for (const r of REGIONS) {
          const st = self.world.regions[r.id];
          if (st) { st.discovered = true; st.nodesLeft = r.lootNodes; }
        }
      },

      // 战斗
      winCombat() {
        if (!self.combat) return false;
        self.combat = {
          ...self.combat,
          enemies: self.combat.enemies.map((e) => ({ ...e, hp: 0 })),
          over: true, victory: true
        };
        self.applyCombatOutcome();
        return true;
      },
      endCombat() { self.endCombat(); },
      grantWeapons() {
        const w = ["knife", "axe", "bat", "pistol", "rifle", "shotgun", "machinegun",
          "ammo_762", "ammo_9mm", "ammo_shell", "gunpowder"];
        for (const id of w) self.addToStorage(id, 999);
        return w.length;
      },

      // 防御
      maxDefense() {
        self.defense = { ...self.defense, reputation: 100, blood: 0, wallDamage: 0 };
      },
      rescueCaptured() {
        const n = self.defense.captured.length;
        self.defense = { ...self.defense, captured: [] };
        return n;
      },
      cancelRaids() {
        for (const c of self.companions) {
          c.lust = { ...c.lust, forced: false, value: 0 };
        }
      },

      // 生育
      impregnateHero(t?: string) { self.cheatHeroPregnant(t ?? "sister"); },
      impregnateAll() {
        let n = 0;
        for (const c of self.companions) {
          if (c.id === "ai") continue;
          if (self.cheatImpregnate(c.id)) n++;
        }
        return n;
      },
      deliverAll() { return self.cheatDeliver(); },
      clearPregnancies() {
        for (const c of self.companions) {
          c.physiology = { ...c.physiology, pregnant: false, pregnancyProgress: 0 };
        }
        self.hero.physiology = { ...self.hero.physiology, pregnant: false, pregnancyProgress: 0 };
        self.hero.pregnancy = null;
      },

      // 主线
      unlockAllCompanions() { return self.cheatUnlockAllCompanions(); },
      completeAllQuests() {
        for (const q of Object.values(self.quests)) q.completed = true;
      },
      maxRelations() { self.cheatMaxRelations(); },
      resetRelations() {
        for (const c of self.companions) {
          c.relationship = { ...c.relationship, affection: 20, loyalty: 10, bond: 1 };
        }
      },

      // 时间
      advanceHours(h: number) { self.advance(h, "idle"); },
      setHour(h: number) { self.time = { ...self.time, minute: h * 60 }; },

      // 共享
      setAllSharing(on: boolean) {
        for (const cat of ["survival", "combat", "facility", "comfort", "special"] as BonusCategory[]) {
          self.setCategoryShare(cat, on);
        }
      },
      resetSharing() { self.share = newShareState(); },

      // 元
      stateSummary() {
        const t = self.time;
        const hh = Math.floor(t.minute / 60);
        const mm = t.minute % 60;
        return [
          "时间：第 " + t.day + " 天 " + hh + ":" + String(mm).padStart(2, "0"),
          "主角：Lv" + self.hero.growth.level + "　战力 " + self.heroPower() + "　技能 " + self.heroSkillTotal(),
          "科技：" + self.tech.unlocked.size + " 节点",
          "基地：" + self.base.facilities.filter((f) => f.tier > 0).length + " 座",
          "房车：" + self.vehicle.mods.length + " 项改装",
          "同伴：" + self.joined().length + " 位在队",
          "后代：" + self.offspring.length + " 位",
          "探索：" + self.exploration().percent + "%"
        ].join("\n");
      }
    };
  }

  /** 执行一条作弊（供 UI 调用） */
  runCheat(actionId: string, target?: string): CheatResult {
    return runCheatOp(this.cheatHost(), actionId, target);
  }

  /** 一键全开 */
  runCheatAll(): CheatResult {
    return runCheatAllOps(this.cheatHost());
  }

  applyCheatAll(): {
    techUnlocked: number;
    companionsMaxed: number;
    baseBuilt: number;
    vehicleMods: number;
    itemsGranted: number;
  } {
    // 科技全解锁
    this.tech = unlockAll(this.tech);

    // 同伴数值拉满
    for (const c of this.companions) {
      c.relationship = {
        ...c.relationship,
        affection: 100,
        loyalty: 100,
        bond: 5
      };
      c.lust = { ...c.lust, value: 0, daysSinceIntimacy: 0, forced: false };
    }

    // 基地全建成
    this.base = instantBuildAll(this.base);

    // 房车全改装
    this.vehicle = installAll(this.vehicle);

    // 资源给足（覆盖全部科技与配方所需）
    const granted = this.giveCheatMaterials();

    // 怀孕/欲情等状态类作弊由 UI 单独控制

    return {
      techUnlocked: this.tech.unlocked.size,
      companionsMaxed: this.companions.length,
      baseBuilt: this.base.facilities.filter((f) => f.tier > 0).length,
      vehicleMods: this.vehicle.mods.length,
      itemsGranted: granted
    };
  }

  /**
   * 作弊：只给材料，不改科技/基地/房车状态。
   * 供测试与「只想补材料」的场景使用。
   */
  giveCheatMaterials(): number {
    let granted = 0;
    const stock: Record<string, number> = {
      copper_wire: 999, magnet: 999, pvc_pipe: 999, filter_mesh: 999,
      activated_carbon: 999, pump: 999, fan: 999, duct: 999, glass: 999,
      led: 999, metal_shelf: 999, insulation: 999, furniture: 999,
      solar_panel: 999, battery: 999, controller: 999, electronics: 999,
      machine_part: 999, mold: 999, hydraulic: 999, armor_plate: 999,
      welding_kit: 999, rare_catalyst: 999, rare_plant: 999,
      hormone_precursor: 999, gene_sample: 999, isotope: 999,
      wood: 9999, stone: 9999, cement: 9999, steel_bar: 9999, cloth: 9999,
      canned_food: 999, dried_food: 999, bread: 999, meat: 999,
      vegetable: 999, candy: 999, coffee: 999, alcohol: 999,
      water_bottle: 999, dirty_water: 999, water_purifier: 999,
      painkiller: 999, antibiotic: 999, bandage: 999, stimulant: 999,
      surgical_kit: 99, gene_stabilizer: 99, regen_promoter: 99,
      ammo_762: 9999, ammo_9mm: 9999, ammo_shell: 9999, gunpowder: 999,
      knife: 99, axe: 99, bat: 99, pistol: 99, rifle: 99, shotgun: 99, machinegun: 99,
      toolbox: 99, crowbar: 99, flashlight: 99, rope: 99, binocular: 99,
      radio: 99, radar_module: 99, sensor: 99, drone_part: 99,
      dildo_double: 99, strap_on: 99, vibrator: 99, egg_vibe: 99,
      restraint_set: 99, lube: 99,
      futa_recreational: 99, futa_pregnant: 99, contraceptive: 99, fertility_boost: 99,
      jewelry: 99, perfume: 99, chocolate: 99, book: 99, music_player: 99,
      key_villa: 9, key_neighbor: 9, access_card: 99, data_chip: 99,
      archive: 99, formula_notes: 9, gene_data: 9, flight_coords: 9,
      medical_supply: 999
    };
    for (const [id, n] of Object.entries(stock)) {
      const got = this.addToStorage(id, n);
      if (got > 0) granted++;
    }
    return granted;
  }

  /** 作弊：全体同伴好感拉满 */
  cheatMaxRelations(): void {
    for (const c of this.companions) {
      c.relationship = { ...c.relationship, affection: 100, loyalty: 100, bond: 5 };
    }
  }

  /** 作弊：清除全部欲情 */
  cheatClearLust(): void {
    for (const c of this.companions) {
      c.lust = { ...c.lust, value: 0, daysSinceIntimacy: 0, forced: false };
    }
    this.hero.lust = { ...this.hero.lust, value: 0 };
  }

  /** 作弊：全体欲情拉满 */
  cheatMaxLust(): void {
    for (const c of this.companions) {
      c.lust = { ...c.lust, value: 100, daysSinceIntimacy: 15, forced: true };
    }
    this.hero.lust = { ...this.hero.lust, value: 100 };
  }

  /** 作弊：立即怀孕 */
  cheatImpregnate(companionId: string): boolean {
    return this.conceiveCompanion(companionId);
  }

  /** 作弊：主角立即怀孕 */
  cheatHeroPregnant(fatherId = "sister"): void {
    this.startHeroPregnancy(fatherId);
  }

  /** 作弊：立即分娩 */
  cheatDeliver(): number {
    if (!this.hero.pregnancy) return 0;
    const n = this.hero.pregnancy.multiple;
    for (let i = 0; i < n; i++) {
      const idx = this.offspring.length + 1;
      this.offspring.push(
        makeOffspring(`child_${idx}`, `女儿${idx}`, this.hero.id, this.hero.pregnancy.fatherId, this.time.day)
      );
    }
    this.hero.pregnancy = null;
    this.hero.physiology = { ...this.hero.physiology, pregnant: false, pregnancyProgress: 0 };
    return n;
  }

  /** 作弊：解锁全部后宫（21 位全部加入） */
  cheatUnlockAllCompanions(): number {
    let added = 0;
    for (const def of COMPANIONS) {
      if (this.companion(def.id)) {
        const c = this.companion(def.id)!;
        if (!c.joined) { c.joined = true; added++; }
        continue;
      }
      this.companions.push(makeCompanion(def, true));
      added++;
    }
    return added;
  }

  // ---------- 战斗 ----------

  /** 从科技加成与装备构造主角战斗数值 */
  /**
   * 由主角当前状态构造战斗单位。
   *
   * 注意：不能把 attack / hp 硬编码 —— 那会让等级、属性、武器、护甲
   * 全部失效（早期版本攻击恒为 10，打不动带防御的敌人）。
   * 这里只提供「加成」，基准值与缩放交给 playerFromBonuses。
   */
  heroCombatant(): Combatant {
    const b = this.baseBonuses();
    const g = this.hero.growth;

    // 属性加成（力量影响攻击，耐力影响 HP）
    const strength = g.attributes.strength ?? 10;
    const endurance = g.attributes.endurance ?? 10;

    const weapon = countOf(this.storage, "rifle") > 0 || countOf(this.backpack, "rifle") > 0;
    const armor = countOf(this.storage, "armor_plate") > 0 || this.tierOf("armory") > 0;

    const bonus: CombatBonus = {
      // 近战伤害加成：科技 + 训练 + 武器 + 力量属性
      meleeDmg:
        (b["meleeDmg"] ?? 0) +
        (b["trainingRate"] ?? 0) * 0.3 +
        (weapon ? 0.35 : 0) +
        (strength - 10) * 0.02,
      dodge: (b["cover"] ?? 0) / 200 + (g.attributes.agility ?? 10) * 0.004,
      critRate: (b["critRate"] ?? 0) + (b["precisionStrike"] ?? 0) * 0.1 +
        (g.attributes.perception ?? 10) * 0.003,
      critDmg: (b["critDmg"] ?? 0) > 0 ? 2 : 1.5
    };

    return playerFromBonuses(
      {
        // 护甲提升防御；体力影响战斗中的耐力储备
        defense: armor ? 10 : 5,
        stamina: Math.round(this.hero.survival.stamina),
        staminaMax: 100
      },
      bonus,
      { level: g.level, strength, endurance }
    );
  }

  /** 从同伴构造战斗单位（仅忠诚 ≥ 30 且未怀孕晚期者参战） */
  alliesCombatant(): Combatant[] {
    return this.joined()
      .filter((c) => c.id !== "ai")
      .filter((c) => c.relationship.loyalty >= 30)
      .filter((c) => !(c.physiology.pregnant && c.physiology.pregnancyProgress >= 21))
      .slice(0, 3)
      .map((c) => {
        const job = c.job.id;
        const atk = job === "patrol" || job === "training" ? 14 : 8;
        const def = job === "medical" ? 5 : 3;
        return newCombatant({
          id: c.id,
          name: c.identity.name,
          hp: 40 + c.relationship.bond * 8,
          hpMax: 40 + c.relationship.bond * 8,
          stamina: 30,
          staminaMax: 30,
          attack: atk,
          defense: def,
          dodge: 0.05 + c.relationship.bond * 0.01,
          humanoid: true
        });
      });
  }

  /** 从事件生成敌人 */
  enemiesFromRaid(kind: RaidKind, count: number): Combatant[] {
    const def = raidDef(kind);
    if (!def) return [];
    const out: Combatant[] = [];
    const n = Math.min(count, 6);
    for (let i = 0; i < n; i++) {
      const strong = def.strength / 100;
      const humanoid = kind === "bandits" || kind === "military" || kind === "wanderers";
      out.push(newCombatant({
        id: `${kind}_${i + 1}`,
        name: kind === "bandits" ? `匪徒 ${i + 1}`
          : kind === "military" ? `武装人员 ${i + 1}`
          : kind === "horde" ? `丧尸 ${i + 1}`
          : kind === "mutant" ? `变异兽 ${i + 1}`
          : kind === "wildlife" ? `野兽 ${i + 1}`
          : `敌人 ${i + 1}`,
        // 数值基准：普通遭遇（strength≈0.3）应能被 1 级主角在 4-5 回合内解决
        hp: Math.round(22 + strong * 45),
        hpMax: Math.round(22 + strong * 45),
        stamina: 30,
        staminaMax: 30,
        attack: Math.round(5 + strong * 12),
        defense: Math.round(1 + strong * 4),
        dodge: 0.03 + strong * 0.08,
        critRate: 0.05 + strong * 0.1,
        critDmg: 1.5,
        humanoid
      }));
    }
    return out;
  }

  /** 开始战斗 */
  beginCombat(kind: RaidKind, count = 3): boolean {
    if (this.combat && !this.combat.over) return false;
    const enemies = this.enemiesFromRaid(kind, count);
    if (enemies.length === 0) return false;
    this.combat = startCombat(this.heroCombatant(), enemies, this.alliesCombatant());
    this.fleeAttempts = 0;
    return true;
  }

  /** 战斗随机源（按回合数派生，保证可复现） */
  private combatRandom(): () => number {
    const seed = this.time.day * 100000 + this.time.minute * 10 + (this.combat?.round ?? 0);
    return combatRng(seed);
  }

  /** 玩家攻击 */
  combatPlayerAttack(enemyId: string): CombatState | null {
    if (!this.combat || this.combat.over) return this.combat;
    this.combat = playerAttack(this.combat, enemyId, this.combatRandom());
    if (!this.combat.over) {
      this.combat = enemyTurn(this.combat, this.combatRandom());
      if (!this.combat.over) this.combat = advanceRound(this.combat);
    }
    this.applyCombatOutcome();
    return this.combat;
  }

  /** 玩家魅惑（仅人形） */
  combatCharm(enemyId: string): CombatState | null {
    if (!this.combat || this.combat.over) return this.combat;
    this.combat = charmEnemy(this.combat, enemyId, this.combatRandom());
    if (!this.combat.over) {
      this.combat = enemyTurn(this.combat, this.combatRandom());
      if (!this.combat.over) this.combat = advanceRound(this.combat);
    }
    this.applyCombatOutcome();
    return this.combat;
  }

  /** 防御（跳过回合，恢复少量体力） */
  combatDefend(): CombatState | null {
    if (!this.combat || this.combat.over) return this.combat;
    this.combat = addLog(this.combat, "主角选择防御，稳住阵型");
    this.combat = enemyTurn(this.combat, this.combatRandom());
    if (!this.combat.over) this.combat = advanceRound(this.combat);
    this.applyCombatOutcome();
    return this.combat;
  }

  /** 逃跑 */
  combatFlee(): { ok: boolean; state: CombatState | null } {
    if (!this.combat || this.combat.over) return { ok: false, state: this.combat };
    // 逃跑尝试次数参与随机源，使同一回合的重复尝试产生不同结果
    this.fleeAttempts++;
    const rng = mulberry32(
      this.time.day * 1000003 + this.time.minute * 7919 +
      this.combat.round * 31 + this.combat.log.length + this.fleeAttempts * 7919
    );
    const lvl = this.defenseLevel();
    const chance = 0.35 + lvl.safety * 0.003;
    if (rng() < chance) {
      this.combat = { ...this.combat, over: true, victory: false, log: [...this.combat.log, "成功脱离战斗"] };
      this.combat = null;
      return { ok: true, state: null };
    }
    this.combat = addLog(this.combat, "逃跑失败");
    this.combat = enemyTurn(this.combat, this.combatRandom());
    this.applyCombatOutcome();
    return { ok: false, state: this.combat };
  }

  /** 结束战斗并结算 */
  private applyCombatOutcome(): void {
    const c = this.combat;
    if (!c || !c.over) return;

    // 战斗结束后的体力处理。
    //
    // 注意：不能直接把体力设为剩余 HP —— 那会导致「打赢了体力也只剩一点，
    // 且永不恢复」。正确做法是按胜负分别结算：
    //   胜利：脱战休整，体力恢复到 70%（至少保留战斗中的剩余量）
    //   失败：按战败分支处理，体力由分支决定
    const hpRatio = c.player.hpMax > 0 ? c.player.hp / c.player.hpMax : 0;

    if (c.victory) {
      // 胜利后脱战休整：恢复体力
      const recovered = Math.max(c.player.hp, c.player.hpMax * 0.7);
      this.hero.survival = {
        ...this.hero.survival,
        stamina: Math.min(100, Math.round(recovered))
      };
    } else {
      // 失败：体力保留剩余值（战败分支会进一步扣减）
      this.hero.survival = {
        ...this.hero.survival,
        stamina: Math.max(5, Math.round(hpRatio * 40))
      };
    }

    if (c.victory) {
      // 战利品
      const rng = this.combatRandom();
      this.addToStorage("ammo_9mm", Math.round(rng() * 20) + 5);
      if (rng() < 0.4) this.addToStorage("steel_bar", Math.round(rng() * 3) + 1);
      this.defense = {
        ...this.defense,
        reputation: Math.min(100, this.defense.reputation + 2),
        wallDamage: Math.max(0, this.defense.wallDamage - 1)
      };
    } else {
      // 失败：走战败分支（被俘/逃脱/被救/昏迷）
      this.defense = { ...this.defense, blood: Math.min(100, this.defense.blood + 10) };
      const event = this.resolveDefeat();
      this.lastDefeatEvent = event;
    }
    this.combat = null;
  }

  /** 结束战斗（放弃） */
  endCombat(): void {
    this.combat = null;
  }

  /** 战斗历史（供 UI 显示） */
  combatHistory(): Array<{ day: number; kind: string; outcome: string }> {
    return this.defense.history
      .filter((h) => h.kind !== undefined)
      .slice(-20)
      .map((h) => ({ day: h.day, kind: h.kind, outcome: h.outcome }));
  }

  /** 是否在战斗中 */
  inCombat(): boolean {
    return this.combat !== null && !this.combat.over;
  }

  // ---------- 防御 ----------

  /** 组装防御输入（从基地设施与岗位推导） */
  private defenseInput(): DefenseInput {
    const b = this.baseBonuses();
    const patrol = this.companions
      .filter((c) => c.joined && (c.job.id === "patrol" || c.job.id === "training"))
      .reduce((s, c) => s + c.job.bonus, 0);
    const defenders = this.companions.filter((c) => c.joined && c.job.id !== null).length;
    // 主角战斗属性（科技加成）
    const heroBonus = (b["defense"] ?? 0) / 100 + (b["cover"] ?? 0) / 200;

    return {
      facilityDefense: b["defense"] ?? 0,
      earlyWarning: b["earlyWarning"] ?? 0,
      cover: b["cover"] ?? 0,
      autoFire: b["autoFire"] ?? 0,
      shield: b["shield"] ?? 0,
      patrolBonus: patrol,
      defenders,
      heroBonus
    };
  }

  /** 当前防御等级 */
  defenseLevel(): DefenseLevel {
    return defenseLevel(this.defenseInput());
  }

  /** 判定今晚是否有事件 */
  rollTonightRaid(): RaidEvent | null {
    const seed = this.time.day * 7919 + this.time.minute;
    const rng = mulberry32(seed);
    const night = this.slot === "night" || this.slot === "lateNight" || this.slot === "dawn";
    return rollRaid({
      day: this.time.day,
      defense: this.defenseLevel(),
      night,
      reputation: this.defense.reputation,
      blood: this.defense.blood
    }, rng);
  }

  /**
   * 结算一次事件。
   * autoCombat 为 true 时，突破类事件会自动转入回合制战斗。
   */
  resolveRaidEvent(
    event: RaidEvent,
    choice: "fight" | "negotiate" | "hold" = "fight",
    autoCombat = true
  ): RaidResult {
    const seed = this.time.day * 7919 + this.time.minute + event.count;
    const rng = mulberry32(seed);

    // 我方战力：主角基础 + 同伴战斗岗位
    const companionPower = this.companions
      .filter((c) => c.joined && c.job.id !== null)
      .reduce((s, c) => s + c.job.bonus * 40, 0);
    const heroPower = 40 + (this.baseBonuses()["trainingRate"] ?? 0) * 100;
    const power = heroPower + companionPower;

    const ammo = countOf(this.storage, "ammo_762") + countOf(this.storage, "ammo_9mm")
      + countOf(this.backpack, "ammo_762") + countOf(this.backpack, "ammo_9mm");

    const defenders = this.companions.filter((c) => c.joined && c.job.id !== null).map((c) => c.id);

    const result = resolveRaid({
      event,
      defense: this.defenseLevel(),
      power,
      ammo,
      defenders,
      choice
    }, rng);

    // 应用后果（声望从当前状态出发）
    const rep = afterRaid(
      { reputation: this.defense.reputation, blood: this.defense.blood },
      event.kind,
      result.outcome
    );
    this.defense = {
      ...this.defense,
      reputation: rep.reputation,
      blood: rep.blood,
      wallDamage: this.defense.wallDamage + result.wallDamage,
      lastRaidDay: this.time.day,
      captured: [...new Set([...this.defense.captured, ...result.captured])],
      history: [...this.defense.history, { day: this.time.day, kind: event.kind, outcome: result.outcome }]
    };

    // 扣弹药
    if (result.ammoUsed > 0) {
      const from762 = Math.min(result.ammoUsed, countOf(this.storage, "ammo_762"));
      if (from762 > 0) this.storage = remove(this.storage, "ammo_762", from762).container;
      const rest = result.ammoUsed - from762;
      if (rest > 0) {
        const from9 = Math.min(rest, countOf(this.storage, "ammo_9mm"));
        if (from9 > 0) this.storage = remove(this.storage, "ammo_9mm", from9).container;
      }
      this.storage = prune(this.storage);
    }

    // 战利品
    for (const [id, n] of Object.entries(result.spoils)) this.addToStorage(id, n);

    // 被掳走的同伴标记为未加入（等待营救）
    for (const id of result.captured) {
      const c = this.companion(id);
      if (c) c.joined = false;
    }

    // 受伤同伴：心情下降
    if (result.casualties > 0) {
      const alive = this.companions.filter((c) => c.joined);
      for (let i = 0; i < Math.min(result.casualties, alive.length); i++) {
        alive[i].relationship = gain(alive[i].relationship, 0, 0);
        alive[i].lust = { ...alive[i].lust };
      }
    }

    // 突破或被威慑失败时转入回合制战斗
    if (autoCombat && (result.outcome === "breached" || result.outcome === "repelled")) {
      if (result.outcome === "breached") {
        // 被突破：残余敌人进入据点，必须打一场
        this.beginCombat(event.kind, Math.min(4, Math.max(2, Math.ceil(event.count / 8))));
      } else {
        // 击退：可选是否追击（这里自动开一场小规模收尾战）
        this.beginCombat(event.kind, Math.min(3, Math.max(1, Math.ceil(event.count / 12))));
      }
    }

    return result;
  }

  /** 手动触发事件（作弊器/测试） */
  triggerRaid(kind: RaidKind): RaidResult | null {
    const event = forceRaid(kind, this.time.day);
    if (!event) return null;
    return this.resolveRaidEvent(event, "fight");
  }

  /** 营救被掳走的同伴 */
  rescueCaptured(companionId: string, seed: number): boolean {
    if (!this.defense.captured.includes(companionId)) return false;
    const rng = mulberry32(seed);
    // 成功率受防御等级与名声影响
    const lvl = this.defenseLevel();
    const chance = 0.4 + lvl.safety * 0.004;
    if (rng() > chance) return false;

    this.defense = {
      ...this.defense,
      captured: this.defense.captured.filter((x) => x !== companionId)
    };
    const c = this.companion(companionId);
    if (c) c.joined = true;
    return true;
  }

  /** 修复围墙 */
  repairWall(amount = 1): number {
    const before = this.defense.wallDamage;
    this.defense = { ...this.defense, wallDamage: Math.max(0, before - amount) };
    return before - this.defense.wallDamage;
  }

  /** 防御摘要 */
  defenseText(): string {
    return describeDefense(this.defenseLevel(), this.defense);
  }

  /** 事件历史 */
  raidHistory() {
    return [...this.defense.history];
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

    // 3) 日常 H 模板场景（按当前地点/时段/道具/好感动态生成）
    for (const sc of this.templateScenes()) {
      if (!seen.has(sc.id)) seen.set(sc.id, sc);
    }

    // 4) 后宫互交场景（同伴之间，只允许娱乐型扶她药）
    for (const sc of this.haremInteractScenes()) {
      if (!seen.has(sc.id)) seen.set(sc.id, sc);
    }

    return [...seen.values()];
  }

  /** 当前地点对应的 HLocation（用于模板匹配） */
  currentHLocation(): HLocation {
    // 据点按设施映射到房间；远征按车辆/帐篷
    if (this.world.current !== "home") {
      return this.vehiclePrivateRoom() ? "vehicle_private" : "camp_tent";
    }
    // 在据点时按设施建成情况挑最合适的房间
    if (this.tierOf("private_room") > 0) return "private_room";
    if (this.tierOf("bathhouse") > 0) return "bathhouse";
    if (this.tierOf("bedroom") > 0) return "bedroom";
    if (this.tierOf("lab") > 0) return "lab";
    if (this.tierOf("greenhouse") > 0) return "greenhouse";
    if (this.tierOf("kitchen") > 0) return "kitchen";
    if (this.tierOf("living_room") > 0) return "living_room";
    if (this.tierOf("training_room") > 0) return "training_room";
    if (this.tierOf("workshop") > 0) return "workshop";
    if (this.tierOf("garage") > 0) return "garage";
    return "bedroom";
  }

  /** 当前时段对应的 HTimeSlot */
  currentHTime(): HTimeSlot {
    const s = this.slot;
    if (s === "morning") return "morning";
    if (s === "forenoon") return "forenoon";
    if (s === "noon") return "noon";
    if (s === "evening") return "evening";
    if (s === "night") return "night";
    return "lateNight";
  }

  /** 队伍中是否有性玩具 */
  hasToy(): boolean {
    const toys = ["dildo_double", "strap_on", "vibrator", "egg_vibe", "restraint_set"];
    return toys.some((t) =>
      countOf(this.storage, t) > 0 || countOf(this.backpack, t) > 0
    );
  }

  /** 娱乐型扶她药存货 */
  recreationalMedStock(): number {
    return countOf(this.storage, "futa_recreational") + countOf(this.backpack, "futa_recreational");
  }

  /** 构建模板匹配上下文 */
  hTemplateContext(): HTemplateContext {
    const joined = this.joined().filter((c) => c.id !== "ai");
    const minAff = joined.length > 0
      ? Math.min(...joined.map((c) => c.relationship.affection))
      : 0;
    return {
      location: this.currentHLocation(),
      time: this.currentHTime(),
      participants: Math.max(1, joined.length),
      hasToy: this.hasToy(),
      medStock: this.recreationalMedStock(),
      hasPrivateRoom: this.tierOf("private_room") > 0,
      minAffection: minAff
    };
  }

  /** 当前可用的日常场景模板（按匹配度排序） */
  availableTemplates(): TemplateMatch[] {
    return matchTemplates(this.hTemplateContext());
  }

  /** 把当前可用的模板转成场景（供 availableScenes 合并） */
  templateScenes(): Scene[] {
    const ctx = this.hTemplateContext();
    const locLabel = H_LOCATION_LABEL[ctx.location];
    const timeTone = H_TIME_TONE[ctx.time];
    const out: Scene[] = [];

    for (const m of matchTemplates(ctx)) {
      // 只展示无未满足项的模板（道具/好感都够）
      if (m.unmet.length > 0) continue;
      const joined = this.joined().filter((c) => c.id !== "ai");
      const maxP = Math.min(m.template.maxParticipants, Math.max(1, joined.length));
      const names = joined.slice(0, maxP).map((c) => c.identity.name);
      out.push(templateToScene(m.template, names, locLabel, timeTone));
    }
    return out;
  }

  /** 模板统计（供 UI 显示） */
  hTemplateStats() {
    return templateStats();
  }

  /** 全部模板统计（含互交） */
  allTemplateStats() {
    return allTemplateStats();
  }

  // ---------- 加成共享（后宫可享受，但低于主角） ----------

  /** 全部加成定义 */
  bonusDefs(): BonusDef[] {
    return BONUS_DEFS;
  }

  /** 按分类列出加成 */
  bonusesByCategory(c: BonusCategory): BonusDef[] {
    return bonusesByCategory(c);
  }

  /** 是否已授权给后宫 */
  isSharedWithHarem(key: string): boolean {
    return isShared(this.share, key);
  }

  /** 切换某项授权的共享 */
  toggleShare(key: string): void {
    this.share = toggleShare(this.share, key);
  }

  /** 批量设置某分类 */
  setCategoryShare(c: BonusCategory, on: boolean): void {
    this.share = setCategoryShare(this.share, c, on);
  }

  /** 已授权的键 */
  sharedKeys(): string[] {
    return sharedKeys(this.share);
  }

  /** 授权统计 */
  shareStats() {
    return shareStats(this.share);
  }

  /**
   * 后宫实际获得的加成。
   * numeric 类按 SHARE_RATIO 折算，unlock 类全额。
   */
  haremBonuses(): Record<string, number> {
    const raw = this.baseBonuses();
    return companionBonuses(raw, this.share);
  }

  /** 主角获得的加成（全额） */
  heroFullBonuses(): Record<string, number> {
    return heroBonuses(this.baseBonuses());
  }

  /** 后宫从共享加成获得的属性提升 */
  haremAttributeBonus(): Partial<HeroAttributes> {
    return companionAttributeBonus(this.haremBonuses());
  }

  /**
   * 主角与后宫的加成对比。
   * 供 UI 展示「后宫低于主角」的设计。
   */
  bonusComparison(): Array<{
    key: string;
    label: string;
    category: BonusCategory;
    raw: number;
    heroValue: number;
    haremValue: number;
    shared: boolean;
    appliesTo: string;
  }> {
    const raw = this.baseBonuses();
    const harem = this.haremBonuses();

    return BONUS_DEFS.map((def) => {
      const v = raw[def.key] ?? 0;
      const hv = harem[def.key] ?? 0;
      return {
        key: def.key,
        label: def.label,
        category: def.category,
        raw: v,
        heroValue: v * HERO_RATIO,
        haremValue: hv,
        shared: isShared(this.share, def.key),
        appliesTo: def.appliesTo
      };
    }).filter((x) => x.raw !== 0 || x.shared);
  }

  // ---------- 后庭准备流程 ----------

  /**
   * 该同伴的后庭准备状态。
   * 0 = 未准备，1 = 已灌肠清洗，2 = 已扩张（可进行后庭行为）
   */
  analPrepLevel(companionId: string): number {
    return this.analPrep[companionId] ?? 0;
  }

  /** 后庭准备步骤清单与完成状态 */
  analPrepSteps(companionId: string): Array<EnemaStep & { done: boolean; available: boolean }> {
    const level = this.analPrepLevel(companionId);
    return ENEMA_STEPS.map((s, i) => ({
      ...s,
      done: level > i,
      available: level >= i
    }));
  }

  /**
   * 执行一步后庭准备。
   *
   * 每一步消耗对应道具，累积后庭熟练度。
   * 全部完成后 analPrepLevel 达到 2，才能进行后庭行为。
   */
  performEnemaStep(
    companionId: string,
    stepId: string
  ): {
    ok: boolean;
    reason?: string;
    nextLevel?: number;
    proficiencyGain?: number;
    completed?: boolean;
  } {
    const c = this.companion(companionId);
    if (!c) return { ok: false, reason: "同伴不存在" };

    const idx = ENEMA_STEPS.findIndex((s) => s.id === stepId);
    if (idx < 0) return { ok: false, reason: "未知步骤" };

    const level = this.analPrepLevel(companionId);
    if (idx !== level) {
      return {
        ok: false,
        reason: idx < level ? "该步骤已完成" : "需要先完成前一步"
      };
    }

    const step = ENEMA_STEPS[idx];

    // 检查道具
    if (step.requiresItem) {
      const have = countOf(this.storage, step.requiresItem) + countOf(this.backpack, step.requiresItem);
      if (have <= 0) {
        const name = itemDef(step.requiresItem)?.name ?? step.requiresItem;
        return { ok: false, reason: `缺少${name}` };
      }
      // 消耗（灌肠液/清洁剂为消耗品；器具不消耗）
      const consumable = step.requiresItem === "enema_solution"
        || step.requiresItem === "anal_cleanser"
        || step.requiresItem === "warming_lube"
        || step.requiresItem === "numbing_lube";
      if (consumable) {
        const r1 = remove(this.storage, step.requiresItem, 1);
        if (r1.removed > 0) this.storage = r1.container;
        else {
          const r2 = remove(this.backpack, step.requiresItem, 1);
          this.backpack = r2.container;
        }
      }
    }

    // 累积后庭熟练度
    const rec = recordAct(c.growth.proficiency, "anal_prep");
    c.growth = { ...c.growth, proficiency: rec.proficiency };

    const nextLevel = idx + 1;
    this.analPrep[companionId] = nextLevel;

    return {
      ok: true,
      nextLevel,
      proficiencyGain: step.proficiencyGain,
      completed: nextLevel >= ENEMA_STEPS.length
    };
  }

  /** 一键完成全部准备（作弊器 / 已熟练时） */
  completeAnalPrep(companionId: string): { ok: boolean; reason?: string } {
    const c = this.companion(companionId);
    if (!c) return { ok: false, reason: "同伴不存在" };

    // 检查必需道具
    const need = enemaRequiredItems();
    for (const id of need) {
      const have = countOf(this.storage, id) + countOf(this.backpack, id);
      if (have <= 0) {
        const name = itemDef(id)?.name ?? id;
        return { ok: false, reason: `缺少${name}` };
      }
    }

    this.analPrep[companionId] = ENEMA_STEPS.length;

    // 熟练度一次性给足
    let prof = c.growth.proficiency;
    for (let i = 0; i < enemaTotalGain(); i++) {
      prof = recordAct(prof, "anal_prep").proficiency;
    }
    c.growth = { ...c.growth, proficiency: prof };

    return { ok: true };
  }

  /** 准备流程总收益（供 UI 显示） */
  enemaInfo() {
    return {
      steps: ENEMA_STEPS.length,
      totalGain: enemaTotalGain(),
      items: enemaRequiredItems()
    };
  }

  // ---------- 性爱行为的场景叙事 ----------

  /**
   * 生成某行为的场景。
   *
   * 差分判定依据：对方累计亲密次数、部位熟练度、是否怀孕、是否有旁观者。
   */
  actSceneFor(
    companionId: string,
    actId: string,
    observers = 0
  ): Scene | null {
    const c = this.companion(companionId);
    if (!c) return null;

    const spec = actScene(actId);
    if (!spec) return null;

    const def = actDef(actId);
    const prof = def ? partLevel(c.growth.proficiency, def.part) : 0;

    const variant = pickVariant({
      partnerActs: c.growth.totalActs,
      partnerProficiency: prof,
      pregnant: c.physiology.pregnant,
      observers
    });

    return actSceneToScene(spec, this.hero.identity.name, c.identity.name, variant);
  }

  /** 生成给模型的提示词骨架 */
  actScenePrompt(companionId: string, actId: string, observers = 0): string | null {
    const c = this.companion(companionId);
    if (!c) return null;
    const spec = actScene(actId);
    if (!spec) return null;

    const def = actDef(actId);
    const prof = def ? partLevel(c.growth.proficiency, def.part) : 0;
    const variant = pickVariant({
      partnerActs: c.growth.totalActs,
      partnerProficiency: prof,
      pregnant: c.physiology.pregnant,
      observers
    });

    return actSceneToPrompt(spec, c.identity.name, variant);
  }

  /** 行为场景统计 */
  actSceneStats() {
    return actSceneStats();
  }

  // ---------- 后宫成长操作 ----------

  /** 训练某位同伴（消耗时间，提升技能与等级） */
  trainCompanion(companionId: string, hours: number, skillId: string): {
    ok: boolean; reason?: string;
  } {
    const c = this.companion(companionId);
    if (!c) return { ok: false, reason: "同伴不存在" };
    if (hours <= 0) return { ok: false, reason: "训练时长无效" };
    if (c.growth.injuries > 0) return { ok: false, reason: "有伤在身，需先治疗" };

    const cost = Math.round(hours * 3);
    if (c.growth.stamina < cost) {
      return { ok: false, reason: `体力不足（需 ${cost}）` };
    }

    c.growth = trainCompanion(c.growth, hours, skillId);
    c.growth = spendStamina(c.growth, cost).growth;

    return { ok: true };
  }

  /** 让同伴休息 */
  restCompanion(companionId: string, hours: number): { ok: boolean } {
    const c = this.companion(companionId);
    if (!c) return { ok: false };
    c.growth = restCompanionGrowth(c.growth, hours);
    return { ok: true };
  }

  /** 治疗同伴的伤 */
  healCompanion(companionId: string, amount = 1): { ok: boolean; reason?: string } {
    const c = this.companion(companionId);
    if (!c) return { ok: false, reason: "同伴不存在" };
    if (c.growth.injuries <= 0) return { ok: false, reason: "没有需要治疗的伤" };

    // 需要医疗用品
    const kits = countOf(this.storage, "bandage") + countOf(this.backpack, "bandage")
      + countOf(this.storage, "surgical_kit") + countOf(this.backpack, "surgical_kit");
    if (kits <= 0) return { ok: false, reason: "缺少医疗用品" };

    c.growth = healInjury(c.growth, amount);
    c.growth = adjustMood(c.growth, 5);
    return { ok: true };
  }

  /** 刷新同伴的亲密度层级 */
  refreshIntimacyTier(companionId: string): void {
    const c = this.companion(companionId);
    if (!c) return;
    c.growth = refreshIntimacyTier(c.growth, c.relationship.bond);
  }

  /** 同伴的加成（共享后） */
  companionBonuses(companionId: string): Record<string, number> {
    const c = this.companion(companionId);
    if (!c) return {};
    // 岗位专长可提升共享比例
    const bonus = this.haremBonuses();
    const jobBonus = c.job.id ? 1 + c.job.bonus / 100 : 1;
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(bonus)) {
      out[k] = v * jobBonus;
    }
    return out;
  }

  /** 同伴战力 */
  companionPower(companionId: string): number {
    const c = this.companion(companionId);
    if (!c) return 0;
    return companionPower(c.growth);
  }

  /** 同伴技能总览 */
  companionSkills(companionId: string): Array<{
    id: string; name: string; level: number; exp: number; need: number; description: string;
  }> {
    const c = this.companion(companionId);
    if (!c) return [];
    return c.growth.skills.map((s) => ({
      id: s.id,
      name: s.name,
      level: s.level,
      exp: s.exp,
      need: s.level >= 10 ? 0 : companionSkillExp(s.level),
      description: s.description
    }));
  }

  // ---------- 性爱行为与熟练度 ----------

  /** 主角的性爱熟练度（存在主角成长里） */
  heroProficiency(): Proficiency {
    return this.hero.proficiency;
  }

  /** 某同伴的熟练度 */
  companionProficiency(id: string): Proficiency | null {
    const c = this.companion(id);
    return c ? c.growth.proficiency : null;
  }

  /** 判断主角是否扶她 */
  heroIsFutanari(): boolean {
    return this.hero.physiology.sex === "futanari";
  }

  // ---------- 临时扶她药（INV-3：一律临时）----------

  /**
   * 喂给某位同伴一份扶她药。
   *
   * 为什么把「娱乐型」和「怀孕型」分开记：娱乐型同样能插入、能内射，
   * 只是精子不具备致孕能力。统计里两者对 `shot*` 字段一样，
   * 但对 `fertilized` 字段完全不同 —— 所以必须记住用的是哪一种。
   */
  giveFutaMed(companionId: string, type: MedType, hours = 6): { ok: boolean; reason?: string } {
    const c = this.companion(companionId);
    if (!c) return { ok: false, reason: "同伴不存在" };
    if (c.id === "ai") return { ok: false, reason: "AI 无实体" };
    if (type === "none") return { ok: false, reason: "未指定药物类型" };
    const itemId = type === "pregnant" ? "futa_pregnant" : "futa_recreational";
    const have = countOf(this.backpack, itemId) + countOf(this.storage, itemId);
    if (have <= 0) return { ok: false, reason: "库存不足" };
    const used = remove(this.backpack, itemId, 1);
    this.backpack = used.container;
    if (used.removed === 0) {
      const fromStore = remove(this.storage, itemId, 1);
      this.storage = fromStore.container;
    }
    const untilDay = this.time.day + Math.ceil(hours / 24);
    this.futaMeds[companionId] = { type, untilDay };
    return { ok: true };
  }

  /** 同伴当前是否具有插入器官（天生扶她或药效未过） */
  companionFutanari(companionId: string): boolean {
    const c = this.companion(companionId);
    if (!c) return false;
    if (c.physiology.sex === "futanari") return true;
    const m = this.futaMeds[companionId];
    if (!m) return false;
    return m.untilDay >= this.time.day;
  }

  /** 同伴当前使用的扶她药类型 */
  companionMedType(companionId: string): MedType {
    const c = this.companion(companionId);
    if (c?.physiology.sex === "futanari") return "pregnant"; // 天生扶她，精子有效
    const m = this.futaMeds[companionId];
    if (!m || m.untilDay < this.time.day) return "none";
    return m.type;
  }

  /** 同伴当前的精子是否具备致孕能力（娱乐型为 false） */
  companionFertile(companionId: string): boolean {
    const c = this.companion(companionId);
    if (c?.physiology.sex === "futanari") return true;
    return medFertile(this.companionMedType(companionId));
  }

  /** 清除过期的临时扶她药（每日推进时调用） */
  expireFutaMeds(): string[] {
    const expired: string[] = [];
    for (const [id, m] of Object.entries(this.futaMeds)) {
      if (m.untilDay < this.time.day) {
        delete this.futaMeds[id];
        expired.push(id);
      }
    }
    return expired;
  }

  /** 当前所有处于药效中的同伴 */
  futaMedActive(): Array<{ id: string; type: MedType; untilDay: number }> {
    return Object.entries(this.futaMeds)
      .filter(([, m]) => m.untilDay >= this.time.day)
      .map(([id, m]) => ({ id, type: m.type, untilDay: m.untilDay }));
  }

  /** 药物能力说明（UI 直接展示） */
  medNote(type: MedType): string {
    return MED_SHOT_NOTE[type];
  }

  /** 是否有可用性玩具 */
  hasSexToy(): boolean {
    const toys = ["dildo_double", "strap_on", "vibrator", "egg_vibe", "restraint_set"];
    return toys.some((t) => countOf(this.storage, t) > 0 || countOf(this.backpack, t) > 0);
  }

  /**
   * 当前可执行的性爱行为（针对某位同伴）。
   * 返回全部行为及可用性，供 UI 展示。
   */
  availableSexActs(companionId: string): Array<{
    def: ActDef;
    usable: boolean;
    reason?: string;
    heroLevel: number;
    partnerLevel: number;
  }> {
    const c = this.companion(companionId);
    if (!c) return [];

    const heroProf = this.heroProficiency();
    const partnerFuta = c.physiology.sex === "futanari";

    const prep = this.analPrepLevel(companionId);

    return ACTS.map((def) => {
      const check = canPerform(def, {
        heroFutanari: this.heroIsFutanari(),
        partnerFutanari: partnerFuta,
        hasToy: this.hasSexToy(),
        proficiency: heroProf,
        stamina: this.hero.survival.stamina
      });

      let usable = check.ok;
      let reason = check.reason;

      // 后庭行为需要准备完成
      if (usable && def.part === "anus" && def.id !== "anal_prep") {
        if (prep < ENEMA_STEPS.length) {
          usable = false;
          reason = `需先完成准备（${prep}/${ENEMA_STEPS.length}）`;
        }
      }

      return {
        def,
        usable,
        reason,
        heroLevel: partLevel(heroProf, def.part),
        partnerLevel: partLevel(c.growth.proficiency, def.part)
      };
    });
  }

  /**
   * 执行一次性爱行为。
   *
   * 效果：
   *  - 主角与同伴各自累计该部位熟练度
   *  - 同伴欲情下降、羁绊可能提升
   *  - 主角消耗体力、获得亲密经验
   *  - 可能解锁同伴的被动增益
   */
  performSexAct(
    companionId: string,
    actId: string
  ): {
    ok: boolean;
    reason?: string;
    leveledParts?: ActPart[];
    newPerks?: CompanionPerk[];
    lustAfter?: number;
    staminaAfter?: number;
    /** 主角射精落点（用于文字表现层） */
    heroShot?: ShotTarget;
    /** 同伴射精落点（后宫服用扶她药时才会出现） */
    partnerShot?: ShotTarget;
    /** 本次插入方向 */
    penetration?: PenetrationSide;
  } {
    const c = this.companion(companionId);
    if (!c) return { ok: false, reason: "同伴不存在" };

    const def = actDef(actId);
    if (!def) return { ok: false, reason: "未知行为" };

    // 同伴是否具备器官：天生扶她，或娱乐型 / 怀孕型药效未过
    const partnerFuta = this.companionFutanari(companionId);
    const check = canPerform(def, {
      heroFutanari: this.heroIsFutanari(),
      partnerFutanari: partnerFuta,
      hasToy: this.hasSexToy(),
      proficiency: this.heroProficiency(),
      stamina: this.hero.survival.stamina
    });
    if (!check.ok) return { ok: false, reason: check.reason };

    // 后庭行为必须先完成准备流程
    if (def.part === "anus" && def.id !== "anal_prep") {
      const prep = this.analPrepLevel(companionId);
      if (prep < ENEMA_STEPS.length) {
        const done = ENEMA_STEPS[prep]?.name ?? "准备";
        return {
          ok: false,
          reason: `需先完成后庭准备（下一步：${done}）`
        };
      }
      // 准备完成后消耗清洁用品
      const cleanser = countOf(this.storage, "anal_soothing_cream")
        + countOf(this.backpack, "anal_soothing_cream");
      void cleanser;
    }

    // 体力消耗（受熟练度影响：越熟练越省力）
    const eff = 1 - proficiencyBonus(this.heroProficiency(), def.part) * 0.4;
    const cost = Math.max(1, Math.round(def.staminaCost * eff));
    this.hero.survival = {
      ...this.hero.survival,
      stamina: Math.max(0, this.hero.survival.stamina - cost)
    };

    // 主角熟练度
    const heroRec = recordAct(this.heroProficiency(), actId);
    this.hero.proficiency = heroRec.proficiency;

    // 同伴熟练度 + 增益
    const ctx: PerkContext = {
      bond: c.relationship.bond,
      affection: c.relationship.affection,
      loyalty: c.relationship.loyalty
    };
    const rec = recordIntimacy(c.growth, actId, ctx);
    c.growth = rec.growth;

    // 同伴欲情下降
    const lustDrop = def.lustGain * (1 + proficiencyBonus(rec.growth.proficiency, def.part) * 0.5);
    c.lust = {
      ...c.lust,
      value: Math.max(0, c.lust.value - lustDrop),
      daysSinceIntimacy: 0
    };

    // 羁绊经验
    c.relationship = gain(c.relationship, 1, 0);

    // 主角亲密技能经验
    this.giveHeroSkillExp("intimacy", def.intimacyExp);
    this.giveHeroExp(Math.round(def.intimacyExp * 0.5));

    // ---- 性爱统计（双边镜像记账）----
    // 为什么在这里记：这是唯一一个「行为已确认生效」的收口点，
    // 放在校验之前会统计到被拒绝的行为，放在返回之后又拿不到最终欲情值。
    const medType = this.companionMedType(companionId);
    const ev: ActEvent = {
      actId,
      day: this.time.day,
      // 单次时长由体力消耗折算：18 点体力约等于 18 分钟，
      // 比另开一个随机数更稳定，也保证存档回放一致。
      minutes: Math.max(5, Math.round(def.staminaCost)),
      heroFutanari: this.heroIsFutanari(),
      // 同伴是否「有器官」：天生扶她，或娱乐型 / 怀孕型药效未过。
      // 娱乐型同样能插入、能内射，所以这里不能用 fertile 代替。
      partnerFutanari: partnerFuta,
      partnerMedType: medType,
      heroFutanariFertile: true,
      // 精子是否具备致孕能力 —— 娱乐型为 false，这才是两者的唯一区别
      partnerFutanariFertile: this.companionFertile(companionId),
      heroCanConceive: this.hero.physiology.fertileWindow && !this.hero.physiology.pregnant,
      partnerCanConceive: c.physiology.fertileWindow && !c.physiology.pregnant,
      // 高潮判定：同伴欲情被清空（此处 < 10）即视为高潮；
      // 主角以「本次产生射精落点」为高潮标志。
      heroOrgasm: shotTargetFor(actId, this.heroIsFutanari()) !== "none",
      partnerOrgasm: c.lust.value <= 10,
      usedLube: def.part === "anus" || def.part === "toy",
      usedToy: def.part === "toy",
      usedEnema: actId === "anal_prep",
      usedContraceptive: false
    };
    const evr = applyActEvent(
      this.hero.sexStats, c.sexStats, ev, this.hero.id, c.id
    );
    this.hero.sexStats = evr.hero;
    c.sexStats = evr.companion;

    return {
      ok: true,
      leveledParts: rec.leveledParts,
      newPerks: rec.newPerks,
      lustAfter: c.lust.value,
      staminaAfter: this.hero.survival.stamina,
      heroShot: evr.heroShot,
      partnerShot: evr.partnerShot,
      penetration: evr.penetration
    };
  }

  /** 同伴成长总览 */
  companionGrowth(id: string): ReturnType<typeof growthSummary> | null {
    const c = this.companion(id);
    return c ? growthSummary(c.growth) : null;
  }

  /** 同伴的被动增益列表 */
  companionPerks(id: string): CompanionPerk[] {
    const c = this.companion(id);
    return c ? c.growth.perks : [];
  }

  /** 同伴的熟练度明细 */
  companionProficiencyDetail(id: string): ReturnType<typeof proficiencySummary> | null {
    const c = this.companion(id);
    return c ? proficiencySummary(c.growth.proficiency) : null;
  }

  /** 行为统计（供 UI 显示总量） */
  sexActStats() {
    return actStats();
  }

  // ---------- 性爱统计 ----------

  /** 主角的性爱统计（原始数据） */
  heroSexStats(): SexStats {
    return this.hero.sexStats;
  }

  /** 同伴的性爱统计（原始数据） */
  companionSexStats(id: string): SexStats | null {
    const c = this.companion(id);
    return c ? c.sexStats : null;
  }

  /** 行为 id → 显示名 */
  private actName(actId: string): string | undefined {
    return actDef(actId)?.name;
  }

  /** 角色 id → 显示名 */
  private personName(id: string): string | undefined {
    if (id === this.hero.id) return this.hero.identity.name;
    return this.companion(id)?.identity.name;
  }

  /** 主角性爱统计（UI 展示结构） */
  heroSexStatsView(): SexStatsView {
    return sexStatsView(this.hero.sexStats, {
      poseName: (id) => this.actName(id),
      partnerName: (id) => this.personName(id),
      analPrepSteps: 0,
      analPrepTotal: ENEMA_STEPS.length
    });
  }

  /** 同伴性爱统计（UI 展示结构） */
  companionSexStatsView(id: string): SexStatsView | null {
    const c = this.companion(id);
    if (!c) return null;
    return sexStatsView(c.sexStats, {
      poseName: (x) => this.actName(x),
      partnerName: (x) => this.personName(x),
      analPrepSteps: this.analPrepLevel(id),
      analPrepTotal: ENEMA_STEPS.length
    });
  }

  /**
   * 全员性爱统计一览。
   *
   * 为什么连主角和后期加入的同伴一起返回：UI 的名册是一张表，
   * 分三次取数据容易出现「有的角色有统计、有的没有」的漏洞。
   */
  sexStatsBoard(): Array<{
    id: string;
    name: string;
    role: "hero" | "companion";
    view: SexStatsView;
    summary: string;
    insideRate: number;
    avgMinutes: number;
    unlocked: number;
    /** 攻受比（插入占比，0-100） */
    topRatio: number;
    /** 后庭开发度 */
    analLevel: number;
    /** 扶她药状态说明 */
    medNote: string;
  }> {
    const hero = this.hero.sexStats;
    type Row = {
      id: string; name: string; role: "hero" | "companion";
      view: SexStatsView; summary: string;
      insideRate: number; avgMinutes: number; unlocked: number;
      topRatio: number; analLevel: number; medNote: string;
    };
    const rows: Row[] = [{
      id: this.hero.id,
      name: this.hero.identity.name,
      role: "hero",
      view: this.heroSexStatsView(),
      summary: sexStatsSummary(hero, this.hero.identity.name),
      insideRate: insideRate(hero),
      avgMinutes: avgMinutes(hero),
      unlocked: unlockedActCount(hero),
      topRatio: topRatio(hero),
      analLevel: analLevel(hero),
      medNote: "天生扶她 · 精子有效"
    }];
    for (const c of this.companions) {
      const med = this.companionMedType(c.id);
      rows.push({
        id: c.id,
        name: c.identity.name,
        role: "companion",
        view: this.companionSexStatsView(c.id)!,
        summary: sexStatsSummary(c.sexStats, c.identity.name),
        insideRate: insideRate(c.sexStats),
        avgMinutes: avgMinutes(c.sexStats),
        unlocked: unlockedActCount(c.sexStats),
        topRatio: topRatio(c.sexStats),
        analLevel: analLevel(c.sexStats),
        medNote: MED_SHOT_NOTE[med]
      });
    }
    return rows;
  }

  /** 统计某位角色的内射占比（0-100） */
  insideRateOf(id: string | null): number {
    const s = id === null ? this.hero.sexStats : this.companion(id)?.sexStats;
    return s ? insideRate(s) : 0;
  }

  /** 某位角色自己射出去时的内射率（0-100） */
  shotInsideRateOf(id: string | null): number {
    const s = id === null ? this.hero.sexStats : this.companion(id)?.sexStats;
    return s ? shotInsideRate(s) : 0;
  }

  /** 某位角色被内射占比（0-100） */
  receivedInsideRateOf(id: string | null): number {
    const s = id === null ? this.hero.sexStats : this.companion(id)?.sexStats;
    return s ? receivedInsideRate(s) : 0;
  }

  /** 某位角色的攻受比与后庭开发度 */
  sexProfile(id: string | null): { topRatio: number; analLevel: number; received: number } | null {
    const s = id === null ? this.hero.sexStats : this.companion(id)?.sexStats;
    if (!s) return null;
    return { topRatio: topRatio(s), analLevel: analLevel(s), received: receivedTotal(s) };
  }

  /** 落点标签（供文字层拼接句子） */
  shotLabel(shot: ShotTarget): string {
    return SHOT_LABEL[shot];
  }

  /**
   * 记录一次生产，同时更新性爱统计里的生育计数。
   * 与 offspring 数组一起用，保证「履历」与「子女数」永远一致。
   */
  recordBirthFor(id: string | null, children = 1): void {
    if (id === null) {
      this.hero.sexStats = recordBirthStat(this.hero.sexStats, children);
      return;
    }
    const c = this.companion(id);
    if (c) c.sexStats = recordBirthStat(c.sexStats, children);
  }

  /**
   * 记录一次成功受孕。
   * 同时更新统计与生育履历，避免两处数字打架。
   */
  recordConceptionFor(id: string | null): boolean {
    if (id === null) {
      this.hero.sexStats = recordConception(this.hero.sexStats);
      return true;
    }
    const c = this.companion(id);
    if (!c) return false;
    c.sexStats = recordConception(c.sexStats);
    return true;
  }

  // ---------- 主角成长 ----------

  /**
   * 来自科技与基地的加成。
   *
   * 这是主角强化的唯一来源（设计约束）：
   * 科技节点 + 基地设施，没有任何超自然来源。
   */
  heroBonuses(): HeroBonuses {
    const b = this.baseBonuses();
    const techCount = this.tech.unlocked.size;
    const out = emptyBonuses();

    // 科技：每 10 个节点给全属性 +1
    const techAttr = Math.floor(techCount / 10);
    if (techAttr > 0) {
      out.attributes = {
        strength: techAttr,
        agility: techAttr,
        endurance: techAttr,
        perception: techAttr,
        willpower: techAttr,
        charisma: techAttr
      };
    }

    // 设施加成映射到属性
    const attrFromBase: Partial<HeroAttributes> = {};
    const addAttr = (k: keyof HeroAttributes, v: number) => {
      attrFromBase[k] = (attrFromBase[k] ?? 0) + v;
    };

    addAttr("strength", Math.floor((b["meleeDmg"] ?? 0) / 5));
    addAttr("agility", Math.floor((b["trainingRate"] ?? 0) / 10));
    addAttr("endurance", Math.floor((b["staminaMax"] ?? 0) / 10));
    addAttr("perception", Math.floor((b["detection"] ?? 0) / 10));
    addAttr("willpower", Math.floor((b["mentalResist"] ?? 0) / 10));
    addAttr("charisma", Math.floor((b["morale"] ?? 0) / 10));

    for (const k of ATTR_KEYS) {
      const v = attrFromBase[k] ?? 0;
      if (v > 0) out.attributes[k] = (out.attributes[k] ?? 0) + v;
    }

    // 数值类加成
    out.staminaMax = b["staminaMax"] ?? 0;
    out.carryBonus = b["carry"] ?? 0;
    out.meleeBonus = b["meleeDmg"] ?? 0;
    out.dodgeBonus = (b["cover"] ?? 0) / 200;
    out.scavengeMult = 1 + (b["scavengeRate"] ?? 0) / 100;
    out.researchMult = 1 + (b["researchRate"] ?? 0) / 100;
    out.alertBonus = Math.floor((b["detection"] ?? 0) / 10);

    return out;
  }

  /** 主角最终属性（基础 + 加点 + 科技/基地） */
  heroAttributes(): HeroAttributes {
    return effectiveAttributes(this.hero.growth, this.heroBonuses());
  }

  /** 主角战力（属性总和） */
  heroPower(): number {
    return attributeTotal(this.heroAttributes());
  }

  /** 主角技能总等级 */
  heroSkillTotal(): number {
    return skillTotal(this.hero.growth);
  }

  /** 升级进度 0-1 */
  heroLevelProgress(): number {
    return levelProgress(this.hero.growth);
  }

  /** 给予主角经验（可能升级） */
  giveHeroExp(amount: number): { levelsGained: number } {
    const r = gainExp(this.hero.growth, amount);
    this.hero.growth = r.growth;
    return { levelsGained: r.levelsGained };
  }

  /** 给予技能经验 */
  giveHeroSkillExp(skillId: string, amount: number): void {
    this.hero.growth = gainSkillExp(this.hero.growth, skillId, amount);
  }

  /** 花费属性点 */
  spendHeroPoint(attr: keyof HeroAttributes): { ok: boolean; reason?: string } {
    const r = spendPoint(this.hero.growth, attr);
    if (!r.ok) return { ok: false, reason: r.reason };
    this.hero.growth = r.growth;
    return { ok: true };
  }

  /**
   * 当前可建造的设施列表（含消耗与阻塞原因）。
   * 供 UI 直接展示，不必打开建造面板。
   */
  buildableFacilities(): Array<{
    id: string;
    name: string;
    level: string;
    category: string;
    description: string;
    currentTier: number;
    nextTier: number;
    maxTier: number;
    canBuild: boolean;
    reason: string;
    cost: Record<string, number>;
    missing: Record<string, number>;
    hours: number;
  }> {
    const levelOrder: Record<string, number> = { surface: 0, bunker: 1, resource: 2 };
    const out: Array<{
      id: string; name: string; level: string; category: string; description: string;
      currentTier: number; nextTier: number; maxTier: number;
      canBuild: boolean; reason: string;
      cost: Record<string, number>; missing: Record<string, number>; hours: number;
    }> = [];

    for (const def of FACILITIES) {
      const cur = this.tierOf(def.id);
      if (cur >= def.maxTier) continue; // 已满级

      const check = this.buildCheck(def.id);
      if (!check) continue;

      out.push({
        id: def.id,
        name: def.name,
        level: def.level,
        category: def.category,
        description: def.description,
        currentTier: cur,
        nextTier: check.nextTier,
        maxTier: def.maxTier,
        canBuild: check.ok,
        reason: check.reason,
        cost: check.cost,
        missing: check.missingResource,
        hours: check.hours
      });
    }

    out.sort((a, b) => {
      if (a.canBuild !== b.canBuild) return a.canBuild ? -1 : 1;
      const la = levelOrder[a.level] ?? 9;
      const lb = levelOrder[b.level] ?? 9;
      if (la !== lb) return la - lb;
      return a.name.localeCompare(b.name);
    });

    return out;
  }

  /** 当前可改装的房车部件 */
  installableMods(): Array<{
    id: string;
    name: string;
    tier: number;
    description: string;
    installed: boolean;
    canInstall: boolean;
    reason: string;
    missing: Record<string, number>;
  }> {
    const techs = [...this.tech.unlocked];
    return MODS.map((def) => {
      const installed = this.vehicle.mods.includes(def.id);
      const check = checkMod(
        this.vehicle, def, techs,
        (cost) => missingFor(this.mergedStorage(), cost)
      );
      return {
        id: def.id,
        name: def.name,
        tier: def.tier,
        description: def.description,
        installed,
        canInstall: check.ok,
        reason: installed ? "already" : check.reason,
        missing: check.missingResource
      };
    }).sort((a, b) => {
      if (a.installed !== b.installed) return a.installed ? -1 : 1;
      if (a.canInstall !== b.canInstall) return a.canInstall ? -1 : 1;
      return a.tier - b.tier;
    });
  }

  /** 直接建造（右栏快捷操作） */
  quickBuild(facilityId: string): { ok: boolean; reason?: string } {
    const r = this.beginBuild(facilityId);
    if (r.ok) {
      // 建造给成长经验
      this.giveHeroExp(20);
      this.giveHeroSkillExp("craft", 8);
    }
    return r.ok ? { ok: true } : { ok: false, reason: r.reason };
  }

  /** 直接安装房车改装（右栏快捷操作） */
  quickInstallMod(modId: string): { ok: boolean; reason?: string } {
    const r = this.installVehicleMod(modId);
    return r.ok ? { ok: true } : { ok: false, reason: r.reason };
  }

  /** 互交模板统计 */
  haremInteractStats() {
    return haremInteractStats();
  }

  /**
   * 后宫互交场景（同伴之间）。
   *
   * 约束：
   *  - 参与者全部是同伴，主角可选加入
   *  - 至少 2 名好感 ≥ 60 的同伴
   *  - 只允许娱乐型扶她药（INV-2）
   */
  haremInteractScenes(): Scene[] {
    const ctx = this.hTemplateContext();
    const locLabel = H_LOCATION_LABEL[ctx.location];
    const joined = this.joined().filter((c) => c.id !== "ai");

    // 需要至少两位好感达标的同伴
    const eligible = joined.filter((c) => c.relationship.affection >= 60);
    if (eligible.length < 2) return [];

    const out: Scene[] = [];

    for (const t of HAREM_INTERACT_TEMPLATES) {
      // 地点与时段必须匹配
      if (!t.locations.includes(ctx.location)) continue;
      if (!t.times.includes(ctx.time)) continue;

      // 人数必须够
      const need = t.minParticipants;
      if (eligible.length < need) continue;

      // 道具检查
      const needsToy = t.props.some((p) =>
        p.includes("性玩具") || p.includes("双头龙") || p.includes("穿戴式")
      );
      if (needsToy && !ctx.hasToy) continue;

      const needsMed = t.props.some((p) => p.includes("扶她药"));
      if (needsMed && ctx.medStock <= 0) continue;

      // 取好感最高的几位作为参与者
      const names = [...eligible]
        .sort((a, b) => b.relationship.affection - a.relationship.affection)
        .slice(0, Math.min(t.maxParticipants, eligible.length))
        .map((c) => c.identity.name);

      if (names.length < t.minParticipants) continue;

      out.push(haremInteractToScene(t, names, locLabel));
    }

    return out;
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

  /** 某位同伴的主线阶段（0 表示未开始） */
  mainlineStage(companionId: string): number {
    const v = this.flags[`mainline_${companionId}_stage`];
    return typeof v === "number" ? v : 0;
  }

  /**
   * 该同伴在当前主线阶段可触发的剧情场景。
   *
   * 生成的主线场景条件是 mainline_<id>_stage >= N，
   * 因此阶段推进后旧场景仍可见（可回看）。
   */
  mainlineScenesFor(companionId: string): Array<{ id: string; title: string; stage: number }> {
    const out: Array<{ id: string; title: string; stage: number }> = [];
    const prefix = `q_${companionId}_s`;

    for (const sc of this.registry.all()) {
      if (!sc.id.startsWith(prefix)) continue;
      const stage = Number(sc.id.slice(prefix.length));
      if (!Number.isFinite(stage)) continue;
      out.push({ id: sc.id, title: sc.title, stage });
    }

    return out.sort((a, b) => a.stage - b.stage);
  }

  /** 主线进度总览（供 UI） */
  mainlineOverview(): Array<{
    questId: string;
    companionId: string;
    companionName: string;
    title: string;
    stage: number;
    totalSteps: number;
    scenes: number;
  }> {
    const out = [];
    for (const def of this.questDefs()) {
      // 阶段以标志位为准（与剧本条件 mainline_<id>_stage 同源）
      out.push({
        questId: def.id,
        companionId: def.companionId,
        companionName: def.companionName,
        title: def.title,
        stage: this.mainlineStage(def.companionId),
        totalSteps: def.steps.length,
        scenes: this.mainlineScenesFor(def.companionId).length
      });
    }
    return out;
  }

  /** 全部主线定义 */
  questDefs() {
    return QUESTS;
  }

  getFlag(key: string): number | boolean | string | undefined {
    const v = this.flags[key];
    return typeof v === "number" || typeof v === "boolean" || typeof v === "string" ? v : undefined;
  }

  // ---------- 存档 ----------

  toSave(slot = "auto"): SaveData {
    const data = newSave(VERSION, this.time);
    data.flags = {
      ...this.flags,
      slot,
      // 主角成长（等级/属性/技能）随存档保存
      __heroGrowth: JSON.stringify(growthToJSON(this.hero.growth)),
      // 主角性爱熟练度
      __heroProf: JSON.stringify(proficiencyToJSON(this.hero.proficiency)),
      // 后庭准备进度
      __analPrep: JSON.stringify(this.analPrep),
      // 加成共享授权
      __share: JSON.stringify(shareToJSON(this.share)),
      // 同伴成长（按 id 索引）
      __compGrowth: JSON.stringify(
        Object.fromEntries(
          this.companions.map((c) => [c.id, companionGrowthToJSON(c.growth)])
        )
      ),
      // 性爱统计：主角 + 全部同伴（含后期加入的），一份表存完
      __heroSex: JSON.stringify(sexStatsToJSON(this.hero.sexStats)),
      __compSex: JSON.stringify(
        Object.fromEntries(
          this.companions.map((c) => [c.id, sexStatsToJSON(c.sexStats)])
        )
      ),
      // 临时扶她药状态（INV-3：读档时过期的一律丢弃）
      __futaMeds: JSON.stringify(this.futaMeds)
    };

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

    data.flags["base"] = baseToJSON(this.base);
    data.flags["world"] = mapToJSON(this.world);
    data.flags["vehicle"] = vehicleToJSON(this.vehicle);
    data.flags["quests"] = questsToJSON(this.quests);
    data.flags["defense"] = defenseToJSON(this.defense);
    data.flags["travelMode"] = this.travelMode;
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
    // 主角成长（旧存档无此字段时用默认值）
    const growthRaw = data.flags["__heroGrowth"];
    if (typeof growthRaw === "string") {
      try {
        s.hero.growth = growthFromJSON(JSON.parse(growthRaw) as HeroGrowthJSON);
      } catch {
        s.hero.growth = newHeroGrowth();
      }
    }

    // 主角性爱熟练度
    const profRaw = data.flags["__heroProf"];
    if (typeof profRaw === "string") {
      try {
        s.hero.proficiency = proficiencyFromJSON(JSON.parse(profRaw) as ProficiencyJSON);
      } catch {
        s.hero.proficiency = newProficiency();
      }
    }

    // 加成共享授权
    const shareRaw = data.flags["__share"];
    if (typeof shareRaw === "string") {
      try {
        s.share = shareFromJSON(JSON.parse(shareRaw) as ShareJSON);
      } catch {
        s.share = newShareState();
      }
    }

    // 后庭准备进度
    const prepRaw = data.flags["__analPrep"];
    if (typeof prepRaw === "string") {
      try {
        s.analPrep = JSON.parse(prepRaw) as Record<string, number>;
      } catch {
        s.analPrep = {};
      }
    }

    // 同伴成长
    const compRaw = data.flags["__compGrowth"];
    if (typeof compRaw === "string") {
      try {
        const map = JSON.parse(compRaw) as Record<string, CompanionGrowthJSON>;
        for (const c of s.companions) {
          const j = map[c.id];
          if (j) c.growth = companionGrowthFromJSON(j);
        }
      } catch {
        // 忽略，保持默认
      }
    }

    // 性爱统计（主角 + 全部同伴）
    const heroSexRaw = data.flags["__heroSex"];
    if (typeof heroSexRaw === "string") {
      try {
        s.hero.sexStats = sexStatsFromJSON(JSON.parse(heroSexRaw) as SexStatsJSON);
      } catch {
        // 忽略，保持空统计
      }
    }
    const compSexRaw = data.flags["__compSex"];
    if (typeof compSexRaw === "string") {
      try {
        const map = JSON.parse(compSexRaw) as Record<string, SexStatsJSON>;
        for (const c of s.companions) {
          const j = map[c.id];
          if (j) c.sexStats = sexStatsFromJSON(j);
        }
      } catch {
        // 忽略，保持空统计
      }
    }
    // 临时扶她药：过期的直接丢掉，避免读档后凭空获得器官
    const medRaw = data.flags["__futaMeds"];
    if (typeof medRaw === "string") {
      try {
        const map = JSON.parse(medRaw) as Record<string, { type: MedType; untilDay: number }>;
        for (const [id, m] of Object.entries(map)) {
          if (m && m.untilDay >= s.time.day) s.futaMeds[id] = m;
        }
      } catch {
        s.futaMeds = {};
      }
    }

    s.base = baseFromJSON(data.flags["base"] as never);
    s.world = mapFromJSON(data.flags["world"] as never);
    s.vehicle = vehicleFromJSON(data.flags["vehicle"] as never);
    s.quests = questsFromJSON(data.flags["quests"] as never);
    s.defense = defenseFromJSON(data.flags["defense"] as never);
    const tm = data.flags["travelMode"];
    if (typeof tm === "string") s.travelMode = tm as TravelMode["id"];
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
          k === "backpack" || k === "storage" || k === "base" ||
          k === "world" || k === "travelMode" || k === "vehicle" ||
          k === "quests" || k === "defense") continue;
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
    baseBuilt: number; baseTotal: number; building: string | null;
    region: string; regionName: string; discovered: number;
    vehicleMods: number; vehicleArmor: number;
    questsCompleted: number; questsTotal: number;
    defenseTier: number; defenseSafety: number; captured: number;
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
      heroInsulation: insulation(this.hero.wardrobe),
      baseBuilt: this.base.facilities.filter((x) => x.tier > 0).length,
      baseTotal: FACILITIES.length,
      building: this.base.building,
      region: this.world.current,
      regionName: currentRegion(this.world)?.name ?? this.world.current,
      discovered: Object.values(this.world.regions).filter((r) => r.discovered).length,
      vehicleMods: this.vehicle.mods.length,
      vehicleArmor: vehicleStats(this.vehicle).armorLevel,
      questsCompleted: Object.values(this.quests).filter((q) => q.completed).length,
      questsTotal: QUESTS.length,
      defenseTier: this.defenseLevel().tier,
      defenseSafety: this.defenseLevel().safety,
      captured: this.defense.captured.length
    };
  }
}