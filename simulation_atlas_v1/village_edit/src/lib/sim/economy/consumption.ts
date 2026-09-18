/**
 * Phase 7 WAVE 2 - consumption / need-basket helpers over InventoryView + resource tags.
 * Preview is pure; applyConsumeFood only mutates inventory slots (no behaviors).
 *
 * INTEGRATION NOTE (orchestrator): re-export from economy/index.ts once via
 *   export ... from './wave2Consumption'
 * Do not dual-edit index while production WAVE2 also touches it.
 */
import {
  bestEdibleIn,
  edibleValue,
  NUTRITION,
  type ResourceType,
} from '../inventory'
import {
  isEdible,
  isFuel,
  isMedicine,
  resourceDef,
  type ResourceTag,
} from '../resources'
import type { InventoryView } from './inventoryBridge'
import { DEMAND_TAGS, type DemandTag, type DemandUrgency } from './needsDemand'
import { resourceCategory } from './resourcesCatalog'

/** One inventory line that can satisfy one or more DemandTags. */
export interface BasketLine {
  resource: ResourceType
  count: number
  demandTags: DemandTag[]
  nutrition: number
  /** Urgency-weighted fit (sum of matching demand[tag] * count weight). */
  satisfyScore: number
}

/** Preview of which carried goods cover the given demand vector. */
export interface NeedBasketPreview {
  lines: BasketLine[]
  byTag: Partial<Record<DemandTag, BasketLine[]>>
  totalNutrition: number
  /** Demand tags with urgency >= 0.05 that have zero matching stock. */
  unmetTags: DemandTag[]
}

/** ResourceTag mapping for each DemandTag (luxury/social use catalog category). */
const DEMAND_RESOURCE_TAGS: Record<DemandTag, readonly ResourceTag[]> = {
  food: ['edible', 'grain', 'fruit', 'vegetable', 'fish', 'animal'],
  shelter: ['construction'],
  tools: ['craft', 'metal', 'ore'],
  clothing: ['textile', 'fiber'],
  fuel: ['fuel'],
  medicine: ['medicine', 'herb'],
  social: [],
  luxury: [],
}

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0
  return Math.max(0, Math.min(1, v))
}

function tagsForDemand(tag: DemandTag, id: ResourceType): boolean {
  const def = resourceDef(id)
  const resTags = def?.tags ?? []

  if (tag === 'food') {
    return (
      isEdible(id) ||
      (def?.nutrition != null && def.nutrition > 0) ||
      resTags.some((t) => DEMAND_RESOURCE_TAGS.food.includes(t))
    )
  }
  if (tag === 'fuel') return isFuel(id) || resTags.includes('fuel')
  if (tag === 'medicine') return isMedicine(id) || resTags.includes('medicine') || resTags.includes('herb')
  if (tag === 'clothing') {
    return (
      id === 'clothing' ||
      id === 'cloth' ||
      id === 'wool' ||
      id === 'leather' ||
      id === 'fur' ||
      resTags.includes('textile')
    )
  }
  if (tag === 'shelter') return resTags.includes('construction')
  if (tag === 'tools') {
    return resTags.includes('craft') || resTags.includes('metal') || resourceCategory(id) === 'tool'
  }
  if (tag === 'luxury') {
    return resourceCategory(id) === 'luxury'
  }
  if (tag === 'social') {
    // Soft proxy: luxury / wine / honey as hospitality goods (no dedicated social tag).
    return resourceCategory(id) === 'luxury' || id === 'wine' || id === 'honey'
  }
  return false
}

function demandTagsForResource(id: ResourceType): DemandTag[] {
  return DEMAND_TAGS.filter((tag) => tagsForDemand(tag, id))
}

/**
 * Pure preview: which goods in view satisfy DemandTags, using resource
 * nutrition / tags (and economy catalog category for tools / luxury).
 * Does not mutate inventory.
 */
export function consumeNeedBasket(view: InventoryView, demand: DemandUrgency): NeedBasketPreview {
  const lines: BasketLine[] = []
  const byTag: Partial<Record<DemandTag, BasketLine[]>> = {}

  for (const slot of view.slots) {
    if (!slot.type || slot.count <= 0) continue
    const resource = slot.type
    const matched = demandTagsForResource(resource).filter((tag) => (demand[tag] ?? 0) > 0.01)
    if (matched.length === 0) {
      // Still list edible stock under food even if food urgency is ~0 (nutrition visibility).
      if (isEdible(resource) || (NUTRITION[resource] ?? 0) > 0) {
        const nutrition = (NUTRITION[resource] ?? resourceDef(resource)?.nutrition ?? 0) * slot.count
        const line: BasketLine = {
          resource,
          count: slot.count,
          demandTags: ['food'],
          nutrition,
          satisfyScore: 0,
        }
        lines.push(line)
        ;(byTag.food ??= []).push(line)
      }
      continue
    }

    const nutrition = (NUTRITION[resource] ?? resourceDef(resource)?.nutrition ?? 0) * slot.count
    let satisfyScore = 0
    for (const tag of matched) {
      const urg = clamp01(demand[tag] ?? 0)
      const nutrBoost = tag === 'food' ? 1 + (NUTRITION[resource] ?? 0) * 0.25 : 1
      satisfyScore += urg * slot.count * nutrBoost
    }

    const line: BasketLine = {
      resource,
      count: slot.count,
      demandTags: matched,
      nutrition,
      satisfyScore,
    }
    lines.push(line)
    for (const tag of matched) {
      ;(byTag[tag] ??= []).push(line)
    }
  }

  lines.sort((a, b) => b.satisfyScore - a.satisfyScore || b.nutrition - a.nutrition)

  const unmetTags: DemandTag[] = []
  for (const tag of DEMAND_TAGS) {
    if ((demand[tag] ?? 0) < 0.05) continue
    if (!(byTag[tag]?.length)) unmetTags.push(tag)
  }

  const totalNutrition = edibleValue(view.slots)

  return { lines, byTag, totalNutrition, unmetTags }
}

export interface ConsumeFoodResult {
  /** Units removed per resource type (EDIBLE_PRIORITY order via bestEdibleIn). */
  removed: Array<{ type: ResourceType; count: number; nutrition: number }>
  /** Nutrition-weighted amount actually consumed (same units as edibleValue). */
  nutritionTaken: number
  /** Remaining nutrition request not satisfied. */
  remainingNeed: number
  /** edibleValue after mutation. */
  edibleLeft: number
}

/**
 * Optional inventory-only eat helper: remove edibles until amount nutrition
 * (edibleValue units) is taken, using bestEdibleIn / NUTRITION.
 * Does not touch hunger, behaviors, or world state.
 */
export function applyConsumeFood(view: InventoryView, amount: number): ConsumeFoodResult {
  const need = Number.isFinite(amount) && amount > 0 ? amount : 0
  const removed: ConsumeFoodResult['removed'] = []
  let nutritionTaken = 0
  let remaining = need

  while (remaining > 1e-9) {
    const type = bestEdibleIn(view.slots)
    if (!type) break
    const unitN = NUTRITION[type] ?? resourceDef(type)?.nutrition ?? 0
    if (unitN <= 0) {
      const got = view.remove(type, 1)
      if (got <= 0) break
      removed.push({ type, count: got, nutrition: 0 })
      continue
    }
    const unitsWanted = Math.max(1, Math.ceil(remaining / unitN))
    const got = view.remove(type, unitsWanted)
    if (got <= 0) break
    const nutr = got * unitN
    removed.push({ type, count: got, nutrition: nutr })
    nutritionTaken += nutr
    remaining -= nutr
  }

  return {
    removed,
    nutritionTaken,
    remainingNeed: Math.max(0, remaining),
    edibleLeft: edibleValue(view.slots),
  }
}

export type ConsumeGoodsResult = {
  removed: { type: ResourceType; count: number; tag: DemandTag }[]
  warmed: boolean
  healed: boolean
  fueled: boolean
  socialized: boolean
}

/**
 * Spend crafted goods against demand — closes craft→consume (clothing/medicine/fuel/luxury).
 * Inventory-only; caller applies warmth/health/mood effects.
 */
export function applyConsumeGoods(
  view: InventoryView,
  demand: DemandUrgency,
): ConsumeGoodsResult {
  const removed: ConsumeGoodsResult['removed'] = []
  let warmed = false
  let healed = false
  let fueled = false
  let socialized = false

  const trySpend = (tag: DemandTag, prefer: ResourceType[], minUrgency: number): boolean => {
    if ((demand[tag] ?? 0) < minUrgency) return false
    for (const type of prefer) {
      if (view.count(type) < 1) continue
      if (view.remove(type, 1) < 1) continue
      removed.push({ type, count: 1, tag })
      return true
    }
    // Fallback: any matching basket line.
    const basket = consumeNeedBasket(view, { ...demand, [tag]: Math.max(demand[tag] ?? 0, 0.2) })
    const line = basket.byTag[tag]?.[0]
    if (!line || line.count < 1) return false
    if (view.remove(line.resource, 1) < 1) return false
    removed.push({ type: line.resource, count: 1, tag })
    return true
  }

  warmed = trySpend('clothing', ['clothing', 'cloth', 'leather', 'fur', 'wool'], 0.35)
  healed = trySpend('medicine', ['medicine', 'herbs', 'honey', 'sage', 'mint'], 0.4)
  fueled = trySpend('fuel', ['wood', 'charcoal', 'coal'], 0.3)
  socialized =
    trySpend('social', ['ale', 'wine', 'honey'], 0.45) || trySpend('luxury', ['gold', 'silver'], 0.55)

  return { removed, warmed, healed, fueled, socialized }
}
