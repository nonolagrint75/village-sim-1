export type ResourceType = 'wood' | 'stone' | 'gold' | 'food' | 'coin' | 'wheat' | 'flour' | 'bread' | 'wool' | 'cloth' | 'clothing' | 'hide' | 'leather' | 'iron'

export interface Slot {
  type: ResourceType | null
  count: number
}

export const STACK_SIZE = 10

export const NUTRITION: Partial<Record<ResourceType, number>> = {
  food: 1,
  wheat: 0.5,
  bread: 2,
}

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

export function edibleValue(inv: Slot[]): number {
  return countOf(inv, 'bread') * 2 + countOf(inv, 'food') + countOf(inv, 'wheat') * 0.5
}
