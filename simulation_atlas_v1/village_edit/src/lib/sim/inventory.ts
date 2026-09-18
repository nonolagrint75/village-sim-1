import {
  CART_CARGO_KG,
  HORSE_PACK_KG,
  ITEM_MASS_KG,
  carryCapacityKg,
} from './physicsScale'
import {
  EDIBLE_PRIORITY,
  RESOURCE_NUTRITION,
  type ResourceType,
} from './resources'

export type { ResourceType } from './resources'
export {
  RESOURCE_IDS,
  RESOURCE_LABELS_UI,
  RESOURCE_LABELS_LOG,
  isEdible,
  isStoreable,
  isTradeable,
  isFuel,
  isLightSource,
  isMedicine,
  isGrain,
  EDIBLE_PRIORITY,
  STOREABLE_RESOURCES,
  TRADEABLE_RESOURCES,
  FIRE_LIGHT_IDS,
  FUEL_BURN,
  HEARTH_FUELS,
  PORTABLE_LIGHTS,
  FIXED_LIGHTS,
  fuelBurnOf,
  fuelBurnTicks,
  fuelHeatValue,
  fuelLightValue,
  isPortableLight,
  isFixedLight,
  bestPortableLightIn,
  bestHearthFuelIn,
} from './resources'

export interface Slot {
  type: ResourceType | null
  count: number
  /** 0–1 craft quality when known (sim §§58–59). */
  quality?: number
  /** Remaining durability 0–1 for crafted stacks. */
  durability?: number
  /** Maker id when stamped. */
  craftedById?: number
  /** Tick of craft / first acquisition. */
  bornTick?: number
}

export const STACK_SIZE = 10

/** Masse unitaire (kg) — source de vérité : physicsScale.ITEM_MASS_KG. */
export const ITEM_MASS: Record<ResourceType, number> = ITEM_MASS_KG

export const NUTRITION: Partial<Record<ResourceType, number>> = RESOURCE_NUTRITION

export function createInventory(size: number): Slot[] {
  return Array.from({ length: size }, () => ({ type: null, count: 0 }))
}

export function countOf(inv: Slot[], type: ResourceType): number {
  let total = 0
  for (const slot of inv) if (slot.type === type) total += slot.count
  return total
}

export function addToInventory(inv: Slot[], type: ResourceType, amount: number): number {
  let remaining = amount
  for (const slot of inv) {
    if (remaining <= 0) break
    if (slot.type === type && slot.count < STACK_SIZE) {
      const space = STACK_SIZE - slot.count
      const add = Math.min(space, remaining)
      slot.count += add
      remaining -= add
    }
  }
  for (const slot of inv) {
    if (remaining <= 0) break
    if (slot.type === null) {
      const add = Math.min(STACK_SIZE, remaining)
      slot.type = type
      slot.count = add
      remaining -= add
    }
  }
  return remaining
}

export function removeFromInventory(inv: Slot[], type: ResourceType, amount: number): number {
  let remaining = amount
  let removed = 0
  for (const slot of inv) {
    if (remaining <= 0) break
    if (slot.type === type) {
      const take = Math.min(slot.count, remaining)
      slot.count -= take
      remaining -= take
      removed += take
      if (slot.count === 0) slot.type = null
    }
  }
  return removed
}

export function findFullSlotType(inv: Slot[]): ResourceType | null {
  for (const slot of inv) {
    if (slot.type && slot.count >= STACK_SIZE) return slot.type
  }
  return null
}

export function transferAll(from: Slot[], to: Slot[], type: ResourceType) {
  const amount = countOf(from, type)
  if (amount <= 0) return
  const leftover = addToInventory(to, type, amount)
  removeFromInventory(from, type, amount - leftover)
}

/** Soft edible stock — nutrition-weighted across all edible resources. */
export function edibleValue(inv: Slot[]): number {
  let v = 0
  for (const slot of inv) {
    if (!slot.type || slot.count <= 0) continue
    const n = NUTRITION[slot.type]
    if (n) v += slot.count * n
  }
  return v
}

/** Best edible currently carried (priority list from catalog). */
export function bestEdibleIn(inv: Slot[]): ResourceType | null {
  for (const type of EDIBLE_PRIORITY) {
    if (countOf(inv, type) > 0) return type
  }
  return null
}

/** Masse totale portée (kg). */
export function carriedMass(inv: Slot[]): number {
  let mass = 0
  for (const slot of inv) {
    if (!slot.type || slot.count <= 0) continue
    mass += ITEM_MASS[slot.type] * slot.count
  }
  return mass
}

/** @deprecated Prefer carryCapacityKg via physics — kept as fallback mean adult. */
export const CARRY_BASE = 42
export const CARRY_CART_BONUS = CART_CARGO_KG

export function carryCapacityOf(opts: {
  hasCart: boolean
  mounted: boolean
  horseBonus?: number
  bodyMassKg?: number
  strength01?: number
}): number {
  if (opts.bodyMassKg != null && opts.strength01 != null) {
    return carryCapacityKg({
      bodyMassKg: opts.bodyMassKg,
      strength01: opts.strength01,
      hasCart: opts.hasCart,
      mounted: opts.mounted,
      horseBonusKg: opts.horseBonus ?? HORSE_PACK_KG,
    })
  }
  let cap = CARRY_BASE
  if (opts.hasCart) cap += CARRY_CART_BONUS
  if (opts.mounted) cap += opts.horseBonus ?? HORSE_PACK_KG
  return cap
}

export function freeSlotSpace(inv: Slot[], type: ResourceType): number {
  let space = 0
  for (const slot of inv) {
    if (slot.type === type && slot.count < STACK_SIZE) space += STACK_SIZE - slot.count
    else if (slot.type === null) space += STACK_SIZE
  }
  return space
}

export function inventoryNearlyFull(inv: Slot[]): boolean {
  let empty = 0
  for (const slot of inv) if (slot.type === null) empty++
  return empty === 0
}
