/**
 * Phase 7 WAVE 1 - InventoryView bridge over existing Slot[] APIs.
 * Stack / capacity logic lives only in inventory.ts - this module does not duplicate it.
 */
import {
  addToInventory,
  countOf,
  removeFromInventory,
  transferAll,
  type ResourceType,
  type Slot,
} from '../inventory'

/** Read/write facade over an existing Slot[] inventory. */
export interface InventoryView {
  /** Underlying slots (same array reference - mutations are in-place). */
  readonly slots: Slot[]
  /** Alias of count - units of type currently held. */
  get(type: ResourceType): number
  count(type: ResourceType): number
  /**
   * Add up to amount of type.
   * @returns leftover that did not fit (same contract as addToInventory).
   */
  add(type: ResourceType, amount: number): number
  /**
   * Remove up to amount of type.
   * @returns units actually removed (same contract as removeFromInventory).
   */
  remove(type: ResourceType, amount: number): number
  /** Move all units of type from this view into to (uses transferAll). */
  transfer(to: InventoryView, type: ResourceType): void
}

/** Wrap an existing Slot[] without copying or reimplementing stacks. */
export function wrapInventory(slots: Slot[]): InventoryView {
  return {
    slots,
    get(type) {
      return countOf(slots, type)
    },
    count(type) {
      return countOf(slots, type)
    },
    add(type, amount) {
      return addToInventory(slots, type, amount)
    },
    remove(type, amount) {
      return removeFromInventory(slots, type, amount)
    },
    transfer(to, type) {
      transferAll(slots, to.slots, type)
    },
  }
}

/** Convenience: wrap a villager's carried inventory. */
export function wrapVillagerInventory(inventory: Slot[]): InventoryView {
  return wrapInventory(inventory)
}
