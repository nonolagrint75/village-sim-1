/**
 * Realistic field ownership — fewer larger plots, profession-gated claims.
 * Wheat feeds mill -> flour -> bread; non-farmers do not own mini-fields.
 */
import { cropTempFactor, sampleTempC } from './climate'
import { mindOf } from './cognition/mindPool'
import { TICKS_PER_DAY } from './calendar'
import { CLAIM_FIELD, WHEAT, type Profession, type SimState, type Villager } from './types'
import { claimArea, getTerrain, inBounds } from './world'

export const FIELD_RADIUS = 4
export const MAX_VILLAGE_FIELDS = 3

const CRAFT_NO_FIELD: ReadonlySet<Profession> = new Set([
  'blacksmith', 'miner', 'guard', 'trader', 'mason', 'lumberjack',
  'weaver', 'fisher', 'miller', 'builder', 'herder',
])

export function countVillageFields(state: SimState, villageId: number | null): number {
  if (villageId === null) return 0
  let n = 0
  for (const o of state.villagers) {
    if (!o.alive || o.villageId !== villageId) continue
    if (o.hasField || o.fieldX >= 0) n++
  }
  return n
}

export function countVillageFarmers(state: SimState, villageId: number | null): number {
  if (villageId === null) return 0
  let n = 0
  for (const o of state.villagers) {
    if (!o.alive || o.villageId !== villageId) continue
    if (o.profession === 'farmer') n++
  }
  return n
}

export function countVillageMembers(state: SimState, villageId: number | null): number {
  if (villageId === null) return 0
  let n = 0
  for (const o of state.villagers) {
    if (!o.alive || o.villageId !== villageId) continue
    n++
  }
  return n
}

export function villageFieldCap(state: SimState, villageId: number | null): number {
  const members = countVillageMembers(state, villageId)
  const farmers = countVillageFarmers(state, villageId)
  let farmerHouseholds = 0
  if (villageId !== null) {
    for (const o of state.villagers) {
      if (!o.alive || o.villageId !== villageId) continue
      if (o.profession === 'farmer' && (o.homeOwnerId === o.id || o.homeOwnerId === null)) farmerHouseholds++
    }
  }
  const byFarmers = Math.max(farmers, farmerHouseholds)
  const bySize = Math.max(1, Math.ceil(Math.max(1, members) / 8))
  const base = byFarmers > 0 ? byFarmers : 1
  return Math.max(1, Math.min(base, bySize, MAX_VILLAGE_FIELDS))
}

export function farmLivelihoodWeight(v: Villager): number {
  try {
    return mindOf(v).livelihood?.mix?.farm ?? 0
  } catch {
    return 0
  }
}

function earlyGenerationalWindow(state: SimState): boolean {
  return state.tick < TICKS_PER_DAY * 28
}

/** True when this villager's plot sits in farmable climate (must not career-churn away). */
export function fieldPlotIsFarmable(state: SimState, v: Villager): boolean {
  if (v.fieldX < 0 || v.fieldY < 0) return false
  return cropTempFactor(sampleTempC(state.climate, v.fieldX, v.fieldY)) >= 0.28
}

/**
 * Farmers holding a farmable plot must not abandon métier mid-season —
 * career churn was orphaning wheat (tickFields only grew owned radii).
 */
export function farmerLockedToField(state: SimState, v: Villager): boolean {
  if (v.profession !== 'farmer') return false
  if (v.fieldX < 0 && !v.hasField) return false
  return fieldPlotIsFarmable(state, v)
}

export function canClaimNewField(state: SimState, v: Villager): boolean {
  if (!v.hasHome) return false
  if (v.profession !== 'farmer' && v.homeOwnerId !== null && v.homeOwnerId !== v.id) return false
  if (v.fieldX >= 0) return false
  if (CRAFT_NO_FIELD.has(v.profession)) return false

  const ax = v.homeX >= 0 ? v.homeX : v.x
  const ay = v.homeY >= 0 ? v.homeY : v.y
  if (cropTempFactor(sampleTempC(state.climate, ax, ay)) < 0.22) return false

  const fields = countVillageFields(state, v.villageId)
  const cap = villageFieldCap(state, v.villageId)
  if (fields >= cap) return false

  if (v.profession === 'farmer') return true

  const farmers = countVillageFarmers(state, v.villageId)
  if ((v.profession === 'none' || v.profession === 'forager') && farmers === 0 && fields < cap) return true
  if (earlyGenerationalWindow(state) && (v.profession === 'none' || v.profession === 'forager') && fields === 0) return true
  return false
}

export function canSowPersonalField(v: Villager): boolean {
  if (v.fieldX < 0) return false
  return v.profession === 'farmer'
}

export function shouldReleaseField(v: Villager): boolean {
  if (v.fieldX < 0 && !v.hasField) return false
  return v.profession !== 'farmer'
}

function plotOwnedBySomeone(state: SimState, fx: number, fy: number, exceptId: number): boolean {
  for (const o of state.villagers) {
    if (!o.alive || o.id === exceptId || o.fieldX < 0) continue
    if (Math.abs(o.fieldX - fx) <= FIELD_RADIUS && Math.abs(o.fieldY - fy) <= FIELD_RADIUS) return true
  }
  return false
}

export function tryHandoffField(state: SimState, v: Villager): boolean {
  if (v.fieldX < 0 || v.fieldY < 0) return false
  let heir: Villager | null = null
  for (const o of state.villagers) {
    if (!o.alive || o.id === v.id) continue
    if (v.villageId !== null && o.villageId !== v.villageId) continue
    if (o.fieldX >= 0) continue
    if (o.profession === 'farmer') {
      heir = o
      break
    }
    if (!heir && (o.profession === 'none' || o.profession === 'forager') && o.hasHome) heir = o
  }
  if (!heir) return false
  heir.fieldX = v.fieldX
  heir.fieldY = v.fieldY
  heir.hasField = v.hasField
  claimArea(state.grid, heir.fieldX, heir.fieldY, FIELD_RADIUS, CLAIM_FIELD)
  if (heir.profession !== 'farmer') heir.profession = 'farmer'
  v.fieldX = -1
  v.fieldY = -1
  v.hasField = false
  return true
}

export function releaseFieldClaim(state: SimState, v: Villager): void {
  if (tryHandoffField(state, v)) return
  if (v.fieldX >= 0 && v.fieldY >= 0) {
    claimArea(state.grid, v.fieldX, v.fieldY, FIELD_RADIUS, CLAIM_FIELD)
  }
  v.fieldX = -1
  v.fieldY = -1
  v.hasField = false
}

export function findOrphanWheatPlot(
  state: SimState,
  nearX: number,
  nearY: number,
  maxDist = 55,
): { x: number; y: number } | null {
  const grid = state.grid
  const r = FIELD_RADIUS
  let best: { x: number; y: number; d: number; wheat: number } | null = null
  const x0 = Math.max(r, nearX - maxDist)
  const y0 = Math.max(r, nearY - maxDist)
  const x1 = Math.min(grid.width - 1 - r, nearX + maxDist)
  const y1 = Math.min(grid.height - 1 - r, nearY + maxDist)
  for (let y = y0; y <= y1; y += 2) {
    for (let x = x0; x <= x1; x += 2) {
      if (getTerrain(grid, x, y) !== WHEAT) continue
      if (plotOwnedBySomeone(state, x, y, -1)) continue
      let wheat = 0
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const tx = x + dx
          const ty = y + dy
          if (!inBounds(grid, tx, ty)) continue
          if (getTerrain(grid, tx, ty) === WHEAT) wheat++
        }
      }
      if (wheat < 3) continue
      const d = Math.abs(x - nearX) + Math.abs(y - nearY)
      if (!best || wheat > best.wheat || (wheat === best.wheat && d < best.d)) {
        best = { x, y, d, wheat }
      }
    }
  }
  return best ? { x: best.x, y: best.y } : null
}

export function tileInOwnField(v: Villager, x: number, y: number): boolean {
  if (v.fieldX < 0 || v.fieldY < 0) return false
  return Math.abs(x - v.fieldX) <= FIELD_RADIUS && Math.abs(y - v.fieldY) <= FIELD_RADIUS
}

export function farmerProfessionPressure(state: SimState, villageId: number | null, farmClimate: number): number {
  if (farmClimate < 0.28) return 0
  const farmers = countVillageFarmers(state, villageId)
  const members = countVillageMembers(state, villageId)
  const fields = countVillageFields(state, villageId)
  const wanted = Math.max(1, Math.ceil(Math.max(1, members) / 8))
  const gap = Math.max(0, wanted - farmers)
  let pressure = gap * 28
  if (farmers === 0) pressure += 70
  if (fields === 0) pressure += 45
  if (fields > 0 && farmers === 0) pressure += 30
  return pressure
}