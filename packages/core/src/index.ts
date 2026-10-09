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
export * from "./script/condition.ts";
export * from "./script/parser.ts";
export * from "./save/serialize.ts";
export * from "./save/store.ts";
export * from "./render/pixel.ts";
export * from "./registry/scene.ts";
export * from "./tech/branches.ts";
export * from "./tech/tree.ts";
export * from "./runtime/loop.ts";
export * from "./runtime/session.ts";
export * from "./generated/scripts.ts";