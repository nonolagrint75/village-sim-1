/**
 * Phase 7 WAVE 1 — economy resource / good catalog metadata.
 *
 * Additive layer over `resources.ts`. Does not replace RESOURCE_DEFS;
 * ResourceId / GoodId alias the live ResourceType union.
 */

import {
  RESOURCE_DEFS,
  RESOURCE_IDS,
  RESOURCE_MASS_KG,
  isEdible,
  resourceDef,
  type ResourceType,
} from '../resources'

/** Alias of the live sim resource id union (WAVE 1 contract: ResourceId). */
export type ResourceId = ResourceType

/** Goods are the same id space as resources in WAVE 1 (no parallel Good catalog). */
export type GoodId = ResourceId

export type ResourceCategory = 'food' | 'raw' | 'processed' | 'tool' | 'luxury'

export interface EconomyResourceMeta {
  id: ResourceId
  category: ResourceCategory
  /** True if stocks can regrow / be re-harvested without permanent vein drain. */
  renewable: boolean
  /** Unit mass hint (kg) — mirrors RESOURCE_MASS_KG. */
  massKg: number
}

const PROCESSED = new Set<ResourceId>([
  'flour',
  'bread',
  'cloth',
  'clothing',
  'leather',
  'charcoal',
  'bronze',
  'brick',
  'mortar',
  'pitch',
  'basket',
  'cheese',
  'soap',
  'candle',
  'linen',
  'rope',
  'dye',
  'medicine',
  'ale',
  'wine',
  'preserved',
  'firewood',
  'oil',
  'torch',
  'oil_lamp',
  'lantern',
  'sconce',
  'chandelier',
])

const TOOLS = new Set<ResourceId>([
  'torch',
  'oil_lamp',
  'lantern',
  'sconce',
  'flint',
  'rope',
  'basket',
])

const LUXURY = new Set<ResourceId>([
  'gold',
  'silver',
  'fur',
  'wine',
  'honey',
  'beeswax',
  'chandelier',
  'lantern',
  'clothing',
  'dye',
  'lavender',
])

const NON_RENEWABLE = new Set<ResourceId>([
  'iron',
  'gold',
  'copper',
  'tin',
  'lead',
  'silver',
  'coal',
  'stone',
  'clay',
  'salt',
  'flint',
  'limestone',
  'sand',
  'peat',
  'coin',
])

function inferCategory(id: ResourceId): ResourceCategory {
  if (TOOLS.has(id)) return 'tool'
  if (LUXURY.has(id) && !isEdible(id)) return 'luxury'
  if (isEdible(id) || id === 'food' || id === 'wheat' || id === 'flour' || id === 'bread') {
    if (id === 'flour' || id === 'bread' || id === 'cheese' || id === 'ale' || id === 'wine' || id === 'preserved') {
      return 'processed'
    }
    return 'food'
  }
  if (PROCESSED.has(id)) return 'processed'
  if (LUXURY.has(id)) return 'luxury'
  return 'raw'
}

function inferRenewable(id: ResourceId): boolean {
  if (NON_RENEWABLE.has(id)) return false
  if (PROCESSED.has(id) || id === 'coin') return false
  return true
}

export const ECONOMY_RESOURCE_META: Record<ResourceId, EconomyResourceMeta> = Object.fromEntries(
  RESOURCE_DEFS.map((def) => {
    const id = def.id as ResourceId
    const meta: EconomyResourceMeta = {
      id,
      category: inferCategory(id),
      renewable: inferRenewable(id),
      massKg: RESOURCE_MASS_KG[id] ?? def.massKg,
    }
    return [id, meta]
  }),
) as Record<ResourceId, EconomyResourceMeta>

export const ECONOMY_RESOURCE_IDS: ResourceId[] = RESOURCE_IDS.slice()

export function economyResourceMeta(id: ResourceId): EconomyResourceMeta {
  return ECONOMY_RESOURCE_META[id] ?? {
    id,
    category: 'raw',
    renewable: false,
    massKg: resourceDef(id)?.massKg ?? 1,
  }
}

export function resourceCategory(id: ResourceId): ResourceCategory {
  return economyResourceMeta(id).category
}

export function isRenewableResource(id: ResourceId): boolean {
  return economyResourceMeta(id).renewable
}

export function massHintKg(id: ResourceId): number {
  return economyResourceMeta(id).massKg
}

export function goodsByCategory(category: ResourceCategory): ResourceId[] {
  return ECONOMY_RESOURCE_IDS.filter((id) => ECONOMY_RESOURCE_META[id]?.category === category)
}