/**
 * Soft resource ecology (Sugarscape / Anasazi-inspired ABM hooks).
 * Mechanisms only: local pressure, carrying capacity, wealth rank — no scripts.
 */

import { countOf, edibleValue } from './inventory'
import type { SimState, Village, Villager, WorldGrid } from './types'
import { FIELD, WHEAT } from './types'
import { getTerrain, inBounds, resourceDensity } from './world'

const PRESSURE_R = 18
/** Soft food units one person needs from the local landscape per “capita slot”. */
const FOOD_PER_CAPITA = 2.4

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

/** Personal wealth proxy (coins, stores, capital goods) — shared with family inheritance metrics. */
export function estimateWealth(v: Villager): number {
  let w = countOf(v.inventory, 'coin') * 1.2
  w += countOf(v.inventory, 'bread') * 0.4
  w += countOf(v.inventory, 'gold') * 2
  w += countOf(v.inventory, 'silver') * 1.6
  w += countOf(v.inventory, 'iron') * 0.8
  w += countOf(v.inventory, 'bronze') * 1.0
  w += countOf(v.inventory, 'copper') * 0.5
  w += edibleValue(v.inventory) * 0.15
  if (v.chestInventory) {
    w += countOf(v.chestInventory, 'coin') * 1.2
    w += countOf(v.chestInventory, 'gold') * 2
    w += countOf(v.chestInventory, 'silver') * 1.5
    w += edibleValue(v.chestInventory) * 0.1
  }
  if (v.hasHome) w += 3
  if (v.hasField) w += 2
  if (v.hasPen) w += 2
  if (v.horseId !== null) w += 2
  if (v.boatId !== null) w += 2
  return w
}

/**
 * Local resource pressure 0..1 (1 = depleted / scarce).
 * Combines bush + tree stocks and ripe wheat within radius (vision-scale).
 */
export function localResourcePressure(grid: WorldGrid, x: number, y: number, radius = PRESSURE_R): number {
  const bushes = resourceDensity(grid, x, y, 'bush', radius)
  const trees = resourceDensity(grid, x, y, 'tree', radius)
  // Wheat/fields: cheap ring sample (not in resource index as a gather kind).
  let wheat = 0
  let fields = 0
  const r = Math.min(radius, 14)
  for (let dy = -r; dy <= r; dy += 2) {
    for (let dx = -r; dx <= r; dx += 2) {
      const tx = x + dx
      const ty = y + dy
      if (!inBounds(grid, tx, ty)) continue
      const t = getTerrain(grid, tx, ty)
      if (t === WHEAT) wheat++
      else if (t === FIELD) fields++
    }
  }
  // Expected “healthy” local stocks for a foraging radius (soft Sugarscape capacity).
  const expectedBush = 10
  const expectedTree = 8
  const expectedCrop = 6
  const foodScore = bushes / expectedBush + wheat / expectedCrop + fields * 0.08
  const woodScore = trees / expectedTree
  const supply = foodScore * 0.72 + woodScore * 0.28
  return clamp01(1 - supply / 1.35)
}

/** Estimated local food production / stock supporting residents near a point. */
export function localFoodSupply(grid: WorldGrid, x: number, y: number, radius = 28): number {
  const bushes = resourceDensity(grid, x, y, 'bush', radius)
  const trees = resourceDensity(grid, x, y, 'tree', Math.round(radius * 0.7))
  let wheat = 0
  const r = Math.min(radius, 22)
  for (let dy = -r; dy <= r; dy += 3) {
    for (let dx = -r; dx <= r; dx += 3) {
      const tx = x + dx
      const ty = y + dy
      if (!inBounds(grid, tx, ty)) continue
      if (getTerrain(grid, tx, ty) === WHEAT) wheat++
    }
  }
  return bushes * 0.85 + wheat * 1.1 + trees * 0.12
}

/**
 * Soft carrying-capacity pressure for a village: pop vs local food landscape.
 * 0 = under capacity, 1 = heavily overcrowded relative to forage/fields.
 */
export function villageCarryingPressure(state: SimState, village: Village): number {
  // memberIds are pruned on death elsewhere — length is a cheap pop proxy (avoid O(N) finds).
  const pop = village.memberIds.length
  if (pop <= 1) return 0
  const supply = localFoodSupply(state.grid, village.centerX, village.centerY, 32)
  const capacity = Math.max(2, supply / FOOD_PER_CAPITA)
  return clamp01((pop / capacity - 0.85) / 1.4)
}

/**
 * Relative wealth vs co-villagers: -1 (poorest) … 0 (median) … +1 (richest).
 * Unaffiliated agents compare against a local sample.
 */
export function relativeWealth(state: SimState, v: Villager): number {
  const self = estimateWealth(v)
  const peers: number[] = []
  if (v.villageId !== null) {
    const vg = state.villages.find((g) => g.id === v.villageId)
    if (vg) {
      for (const id of vg.memberIds) {
        const o = state.villagers.find((x) => x.id === id && x.alive)
        if (o) peers.push(estimateWealth(o))
      }
    }
  }
  if (peers.length < 3) {
    for (const o of state.villagers) {
      if (!o.alive || o.id === v.id) continue
      const dx = o.x - v.x
      const dy = o.y - v.y
      if (dx * dx + dy * dy > 55 * 55) continue
      peers.push(estimateWealth(o))
      if (peers.length >= 12) break
    }
  }
  if (peers.length === 0) return 0
  peers.sort((a, b) => a - b)
  const median = peers[Math.floor(peers.length / 2)]
  const spread = Math.max(2, peers[peers.length - 1] - peers[0], Math.abs(median) * 0.5)
  return clamp01((self - median) / spread + 0.5) * 2 - 1
}

/** Multiplier for gather scores on a tile: depleted neighbourhoods are less attractive. */
export function gatherPressurePenalty(grid: WorldGrid, x: number, y: number): number {
  const p = localResourcePressure(grid, x, y, 10)
  return 1 - p * 0.58
}
