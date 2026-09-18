const fs = require("fs");
const path = "C:/Users/kamel/village-sim-1/_wt_rhythm/village_edit/src/lib/sim/economy/index.ts";
const lines = [
"/**",
" * Phase 7 - public economy API (TypeScript sim only).",
" * Additive facades; does not replace resources/inventory/careers/commerce.",
" */",
"export type { ResourceId, GoodId, ResourceCategory, EconomyResourceMeta } from './resourcesCatalog'",
"export { ECONOMY_RESOURCE_META, ECONOMY_RESOURCE_IDS, economyResourceMeta, resourceCategory, isRenewableResource, massHintKg, goodsByCategory } from './resourcesCatalog'",
"export type { Deposit, EconomyDepositsBag, SampleDepositsOpts, HarvestDepositResult } from './deposits'",
"export { depositsFromGrid, ensureEconomyDeposits, sampleNearbyDeposits, harvestDeposit, findDeposit } from './deposits'",
"export type { InventoryView } from './inventoryBridge'",
"export { wrapInventory, wrapVillagerInventory } from './inventoryBridge'",
"export { practiceSkill, practiceSkillFromTask, resolveSkillKey, skillLevel } from './skillsPractice'",
"export type { DemandTag, NeedId, DemandUrgency } from './needsDemand'",
"export { DEMAND_TAGS, demandFromNeeds, demandFromVillager, topDemand, noteDemandState } from './needsDemand'",
"export type { RecipeIO, QualityFactors, ProductionRecipe, EconomyRecipe, CraftPreview, ApplyCraftResult } from './productionRecipes'",
"export { FOOD_CHAIN_WHEAT_PER_FLOUR, FOOD_CHAIN_BREAD_PER_FLOUR, FOOD_CHAIN_RECIPES, CRAFT_PRODUCTION_RECIPES, PRODUCTION_RECIPES, ECONOMY_RECIPES, productionRecipeFromCraft, findProductionRecipe, canCraft, applyCraftPreview, applyCraft } from './productionRecipes'",
"export type { OccupationId, EconomicMotiveTag, EconomicMotives, OccupationShiftSuggestion } from './wave2Occupations'",
"export { occupationOf, economicMotiveTags, suggestOccupationShift } from './wave2Occupations'",
"export type { BasketLine, NeedBasketPreview, ConsumeFoodResult } from './wave2Consumption'",
"export { consumeNeedBasket, applyConsumeFood } from './wave2Consumption'",
"export type { MarketPriceRow } from './wave3Market'",
"export { localPrice, scarcitySignal, marketSnapshot, expectedMargin, demandPressure, demandPressureForTag } from './wave3Market'",
"export type { WealthBreakdown } from './wave3Wealth'",
"export { HOME_PROPERTY_PROXY, estimateWealth, estimateWealthBreakdown } from './wave3Wealth'",
"export type { BusinessKind, BusinessWorkplace, BusinessRecord, EconomyBusinessesBag } from './wave3Business'",
"export { ensureBusinessBag, registerBusiness, findBusinessesByOwner, findBusiness } from './wave3Business'",
"export { reservationWage, employerOffer, wageWouldClear } from './wave3Wages'",
""
];
fs.writeFileSync(path, lines.join("\n"), "utf8");
console.log("ok", fs.statSync(path).size);