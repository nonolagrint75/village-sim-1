/**
 * Phase 7 WAVE 2 - production / craft recipe facade.
 * Additive catalog over CRAFT_RECIPES + documented food-chain entries.
 * Does NOT rewrite behaviors grindFlour / bakeBread / harvestWheat.
 */
import type { CraftRecipe, CraftStation } from '../resources'
import { CRAFT_RECIPES } from '../resources'
import type { InventoryView } from './inventoryBridge'
import type { ResourceId } from './resourcesCatalog'

/** One input or output line of a production recipe. */
export interface RecipeIO {
  resource: ResourceId
  amount: number
}

/** Optional quality model for preview / future craft outcomes. */
export interface QualityFactors {
  /** Procedural skill key or task kind (e.g. craft, farm). */
  skillKey?: string
  /** Quality at skillLevel 0 (clamped to [0, 1] in preview). */
  baseQuality?: number
  /** Added quality contribution at skillLevel 1. */
  skillWeight?: number
}

/**
 * Generic economy production recipe (WAVE 2 contract).
 * inputs/outputs are explicit arrays (unlike legacy CraftRecipe Partial Record).
 */
export interface ProductionRecipe {
  id: string
  labelFr?: string
  inputs: RecipeIO[]
  outputs: RecipeIO[]
  requiredSkills?: string[]
  requiredTools?: string[]
  /** Station / workplace hint (mill, workbench, hearth, field, oven, ...). */
  workplaceHint?: CraftStation | 'field' | 'oven' | string
  /** Nominal labor duration in sim ticks (documentation / future scheduler). */
  laborTicks?: number
  qualityFactors?: QualityFactors
  /** Where this entry came from — craft facade vs documented food chain. */
  source: 'craft' | 'food_chain'
  /** Legacy urge mirrored from CraftRecipe when source === craft. */
  urge?: number
}

/** Alias used for food-chain documentation entries and Phase 7 docs. */
export type EconomyRecipe = ProductionRecipe

export interface CraftPreview {
  outputs: RecipeIO[]
  /** Expected craft quality in [0, 1]. */
  quality: number
}

export interface ApplyCraftResult extends CraftPreview {
  ok: true
}

/** Documented ratios matching behaviors.ts grindFlour / bakeBread (do not diverge). */
export const FOOD_CHAIN_WHEAT_PER_FLOUR = 2
export const FOOD_CHAIN_BREAD_PER_FLOUR = 2

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0
  return Math.max(0, Math.min(1, v))
}

function inputsFromCraft(recipe: CraftRecipe): RecipeIO[] {
  const out: RecipeIO[] = []
  for (const [resource, amount] of Object.entries(recipe.inputs) as [ResourceId, number | undefined][]) {
    if (amount == null || amount <= 0) continue
    out.push({ resource, amount })
  }
  return out
}

/** Map a live CraftRecipe into the generic ProductionRecipe shape (facade only). */
export function productionRecipeFromCraft(recipe: CraftRecipe): ProductionRecipe {
  return {
    id: recipe.id,
    labelFr: recipe.labelFr,
    inputs: inputsFromCraft(recipe),
    outputs: [{ resource: recipe.output as ResourceId, amount: recipe.outputCount }],
    requiredSkills: ['craft'],
    workplaceHint: recipe.station,
    laborTicks: Math.max(1, Math.round(24 - recipe.urge * 0.25)),
    qualityFactors: {
      skillKey: 'craft',
      baseQuality: 0.45,
      skillWeight: 0.55,
    },
    source: 'craft',
    urge: recipe.urge,
  }
}

/**
 * Food chain as EconomyRecipe documentation ONLY.
 * Runtime remains behaviors harvestWheat → grindFlour → bakeBread.
 */
export const FOOD_CHAIN_RECIPES: readonly EconomyRecipe[] = [
  {
    id: 'food_chain_grind_wheat',
    labelFr: 'farine',
    inputs: [{ resource: 'wheat', amount: FOOD_CHAIN_WHEAT_PER_FLOUR }],
    outputs: [{ resource: 'flour', amount: 1 }],
    requiredSkills: ['craft', 'farm'],
    workplaceHint: 'mill',
    laborTicks: 8,
    qualityFactors: {
      skillKey: 'craft',
      baseQuality: 0.5,
      skillWeight: 0.4,
    },
    source: 'food_chain',
  },
  {
    id: 'food_chain_bake_bread',
    labelFr: 'pain',
    inputs: [{ resource: 'flour', amount: 1 }],
    outputs: [{ resource: 'bread', amount: FOOD_CHAIN_BREAD_PER_FLOUR }],
    requiredSkills: ['craft'],
    workplaceHint: 'oven',
    laborTicks: 10,
    qualityFactors: {
      skillKey: 'craft',
      baseQuality: 0.5,
      skillWeight: 0.45,
    },
    source: 'food_chain',
  },
]

/** Facade of every CRAFT_RECIPES entry as ProductionRecipe. */
export const CRAFT_PRODUCTION_RECIPES: readonly ProductionRecipe[] =
  CRAFT_RECIPES.map(productionRecipeFromCraft)

/**
 * Full WAVE 2 catalog: craft facades + food-chain docs.
 * Food-chain entries are listed first so wheat→flour→bread is discoverable.
 */
export const PRODUCTION_RECIPES: readonly ProductionRecipe[] = [
  ...FOOD_CHAIN_RECIPES,
  ...CRAFT_PRODUCTION_RECIPES,
]

/** Same catalog under the EconomyRecipe alias. */
export const ECONOMY_RECIPES: readonly EconomyRecipe[] = PRODUCTION_RECIPES

export function findProductionRecipe(id: string): ProductionRecipe | undefined {
  return PRODUCTION_RECIPES.find((r) => r.id === id)
}

/** True if inventory holds every input amount. */
export function canCraft(recipe: ProductionRecipe, inventoryView: InventoryView): boolean {
  for (const line of recipe.inputs) {
    if (inventoryView.count(line.resource) < line.amount) return false
  }
  return true
}

/**
 * Pure preview: expected outputs + quality from skillLevel (0-1).
 * Does not mutate inventory or world state.
 */
export function applyCraftPreview(recipe: ProductionRecipe, skillLevel: number): CraftPreview {
  const qf = recipe.qualityFactors
  const base = qf?.baseQuality ?? 0.5
  const weight = qf?.skillWeight ?? 0.5
  const quality = clamp01(base + weight * clamp01(skillLevel))
  return {
    outputs: recipe.outputs.map((o) => ({ resource: o.resource, amount: o.amount })),
    quality,
  }
}

/**
 * Optional inventory-only craft apply via InventoryView.
 * Safe: checks canCraft, spends inputs, then adds preview outputs.
 * Does not touch workplaces, skills practice, or behaviors food chain.
 * @returns null if inputs are insufficient.
 */
export function applyCraft(
  recipe: ProductionRecipe,
  inventoryView: InventoryView,
  skillLevel = 0.5,
): ApplyCraftResult | null {
  if (!canCraft(recipe, inventoryView)) return null
  const preview = applyCraftPreview(recipe, skillLevel)
  for (const line of recipe.inputs) {
    const removed = inventoryView.remove(line.resource, line.amount)
    if (removed < line.amount) {
      // Should not happen after canCraft; restore what we took and abort.
      if (removed > 0) inventoryView.add(line.resource, removed)
      return null
    }
  }
  for (const line of preview.outputs) {
    inventoryView.add(line.resource, line.amount)
  }
  return { ok: true, outputs: preview.outputs, quality: preview.quality }
}
