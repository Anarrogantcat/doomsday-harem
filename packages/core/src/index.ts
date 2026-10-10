export * from "./types.ts";
export * from "./version.ts";
export * from "./ecs.ts";
export * from "./components.ts";
export * from "./time.ts";
export * from "./systems/survival.ts";
export * from "./systems/relationship.ts";
export * from "./systems/jobs.ts";
export * from "./systems/clothing.ts";
export * from "./systems/base.ts";
export * from "./systems/world.ts";
export * from "./systems/vehicle.ts";
export * from "./systems/quest.ts";
export * from "./systems/defense.ts";
// companions 的 Personality 与 harem 同名，显式重导出避免歧义
export {
  type CompanionDef, type Specialty, type PersonalityTraits,
  type Personality as CompanionPersonality,
  PERSONALITY_LABEL, PERSONALITY_TRAITS, COMPANIONS,
  companionDef, companionsByOrigin, companionsByPersonality, companionsByQuest,
  startingCompanions, companionStats, traitsOf, lustGrowthFor,
  shouldInvite, shouldRaid, approachLine, raidLine,
  specialtyBonus, bestJobFor, describeCompanion
} from "./systems/companions.ts";
// inventory 与 clothing 有同名导出（itemsByTag），显式重导出
export {
  type ItemCategory, type Quality, type ItemDef, type Stack, type Container,
  type AddResult, type RemoveResult, type UseOutcome, type LootTable, type LootTableEntry, type Recipe, type CraftCheck,
  CATEGORY_LABEL, QUALITY_LABEL, QUALITY_MULT, ITEMS, itemDef, itemsByCategory,
  itemsByTag as itemsByTagInventory,
  resolveItemId, normalizeCost,
  newContainer, newStorage, weightOf, countOf, totalCount, has as hasItem, freeWeight, freeSlots, isFull,
  add as addItem, addMany, remove as removeItem, canAfford, missingFor, spend,
  transfer, consolidate, prune as pruneContainer,
  use as useItemDef, rollLoot, LOOT_TABLES, lootTable, mulberry32 as inventoryRng,
  RECIPES, recipeById, canCraft, craft as craftRecipe,
  containerToJSON, containerFromJSON, describeContainer, groupByCategory
} from "./systems/inventory.ts";
export * from "./systems/cheat.ts";
export * from "./systems/pregnancy.ts";
export * from "./systems/harem.ts";
export * from "./systems/combat.ts";
export * from "./text/engine.ts";
export * from "./text/view.ts";
export * from "./text/stock.ts";
export * from "./script/condition.ts";
export * from "./script/parser.ts";
export * from "./save/serialize.ts";
export * from "./save/store.ts";
export * from "./save/slots.ts";
export * from "./render/pixel.ts";
export * from "./render/rig.ts";
export * from "./registry/scene.ts";
export * from "./tech/branches.ts";
export * from "./tech/tree.ts";
export * from "./tech/scope.ts";
export * from "./runtime/loop.ts";
export * from "./runtime/session.ts";
export * from "./generated/scripts.ts";
export * from "./i18n/index.ts";
export * from "./audio/index.ts";
export * from "./systems/sceneTier.ts";
export * from "./systems/hTemplates.ts";
export * from "./systems/settings.ts";
export * from "./systems/heroGrowth.ts";
export * from "./systems/sexActs.ts";
export * from "./systems/haremGrowth.ts";
export * from "./systems/actScenes.ts";
export * from "./systems/bonusSharing.ts";
export * from "./systems/cheatRunner.ts";
export * from "./systems/combatExt.ts";
export * from "./systems/achievements.ts";
export * from "./systems/branchEvents.ts";
export * from "./systems/plugins.ts";
export * from "./systems/prologue.ts";
export * from "./systems/sexStats.ts";