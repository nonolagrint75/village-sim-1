/**
 * Night light + hearth warmth — medieval torches, candles, fuel, âtre.
 * Calendar night drives darkness urge; cold seeks fire / cloak / hearth.
 */

import { equipmentEffectsOf } from './equipment'
import { countOf, type ResourceType, type Slot } from './inventory'
import {
  FIRE_LIGHT_IDS,
  FUEL_BURN,
  HEARTH_FUELS,
  PORTABLE_LIGHTS,
  fuelBurnTicks,
  isFuel,
  isPortableLight as isPortableLightResource,
} from './resources'
import type { SimState, Villager } from './types'
import { distance, isNight } from './world'
import { coldStress01, sampleTempC } from './climate'

/** Carried torch burn time (ticks) — catalogue FUEL_BURN × scale. */
export const TORCH_BURN_TICKS = Math.max(60, (FUEL_BURN.torch?.ticks ?? 10) * 9)
/** Indoor candle / lamp burn time. */
export const CANDLE_BURN_TICKS = Math.max(80, (FUEL_BURN.candle?.ticks ?? 12) * 12)
/** Hearth fire duration after tending (firewood baseline). */
export const HEARTH_BURN_TICKS = Math.max(100, (FUEL_BURN.firewood?.ticks ?? 14) * 11)
/** Warmth radius around a lit hearth (tiles). */
export const HEARTH_WARM_R = 5
/** Soft warmth from a carried lit torch. */
export const TORCH_WARM_R = 2.2

const FUEL_PREFERENCE: ResourceType[] = [...HEARTH_FUELS]

export function emptyLightState(): {
  torchLitUntil: number
  homeLightUntil: number
  hearthLitUntil: number
} {
  return { torchLitUntil: 0, homeLightUntil: 0, hearthLitUntil: 0 }
}

export function torchIsLit(v: Villager, tick: number): boolean {
  return v.torchLitUntil > tick
}

export function homeIsLit(v: Villager, tick: number): boolean {
  return v.homeLightUntil > tick || v.hearthLitUntil > tick
}

export function hearthIsLit(v: Villager, tick: number): boolean {
  return v.hearthLitUntil > tick
}

export function hasHearthPlaced(v: Villager): boolean {
  if (v.homeFurniture.some((f) => f.id === 'hearth')) return true
  return v.furnitureQueue.some((j) => j.kind === 'hearth' && j.done)
}

/** Owner of the house this villager sleeps in (for shared hearth / candle). */
export function homeKeeper(state: SimState, v: Villager): Villager {
  if (v.homeOwnerId !== null && v.homeOwnerId !== v.id) {
    const o = state.villagers.find((x) => x.id === v.homeOwnerId && x.alive)
    if (o) return o
  }
  return v
}

export function personalLight(v: Villager, tick: number): boolean {
  return torchIsLit(v, tick) || countOf(v.inventory, 'lantern') > 0 || countOf(v.inventory, 'oil_lamp') > 0
}

export function isOutdoorsAtNight(v: Villager, tick: number): boolean {
  if (!isNight(tick)) return false
  if (!v.hasHome) return true
  return distance(v.x, v.y, v.homeX, v.homeY) > 4
}

export function roomIsDark(state: SimState, v: Villager): boolean {
  if (!isNight(state.tick)) return false
  if (!v.hasHome) return true
  const keeper = homeKeeper(state, v)
  const sheltered = distance(v.x, v.y, v.homeX, v.homeY) <= 4
  if (!sheltered) return true
  return !homeIsLit(keeper, state.tick) && !personalLight(v, state.tick)
}

/** 0–1 urge from darkness (outdoors night / unlit home). */
export function darknessPressure(state: SimState, v: Villager): number {
  if (!isNight(state.tick)) return 0
  const courage = v.personality.courage
  if (isOutdoorsAtNight(v, state.tick)) {
    if (personalLight(v, state.tick)) return 0.08 * (1 - courage * 0.4)
    return 0.55 + (1 - courage) * 0.28 + (v.hasHome ? 0.12 : 0.05)
  }
  if (roomIsDark(state, v)) {
    return 0.38 + (1 - courage) * 0.18
  }
  return 0
}

export function nearWarmFire(state: SimState, v: Villager): boolean {
  const tick = state.tick
  if (torchIsLit(v, tick)) return true
  if (!v.hasHome) return false
  const keeper = homeKeeper(state, v)
  if (!hearthIsLit(keeper, tick)) return false
  const hx = hearthAnchor(keeper).x
  const hy = hearthAnchor(keeper).y
  return distance(v.x, v.y, hx, hy) <= HEARTH_WARM_R
}

export function hearthAnchor(v: Villager): { x: number; y: number } {
  const job = v.furnitureQueue.find((j) => j.kind === 'hearth')
  if (job) return { x: job.x, y: job.y }
  const place = v.homeFurniture.find((f) => f.id === 'hearth')
  if (place) return { x: place.x, y: place.y }
  if (v.hasHome) return { x: v.homeX, y: v.homeY }
  return { x: Math.round(v.x), y: Math.round(v.y) }
}

export function cloakWarmth01(v: Villager): number {
  const clo = equipmentEffectsOf(v).clo
  return Math.max(0, Math.min(1, (clo - 0.35) / 0.7))
}

/** 0–1 urge from cold without fire / cloak. */
export function warmthPressure(state: SimState, v: Villager): number {
  const air = sampleTempC(state.climate, v.x, v.y)
  const cold = coldStress01(air)
  if (cold < 0.08) return 0
  const fire = nearWarmFire(state, v) ? 0.72 : 0
  const cloak = cloakWarmth01(v) * 0.55
  const shelter = v.hasHome && distance(v.x, v.y, v.homeX, v.homeY) <= 4 ? 0.18 : 0
  const night = isNight(state.tick) ? 0.12 : 0
  return Math.max(0, Math.min(1, cold * 0.95 + night - fire - cloak - shelter))
}

export function fuelCount(inv: Slot[]): number {
  let n = 0
  for (const id of FUEL_PREFERENCE) n += countOf(inv, id)
  return n
}

export function bestFuelIn(inv: Slot[]): ResourceType | null {
  for (const id of FUEL_PREFERENCE) {
    if (countOf(inv, id) > 0) return id
  }
  for (const slot of inv) {
    if (slot.type && slot.count > 0 && isFuel(slot.type)) return slot.type
  }
  return null
}

export function bestCraftableLight(inv: Slot[]): ResourceType | null {
  // Prefer portable torch for night travel; candle for indoor.
  if (countOf(inv, 'wood') >= 1 && (countOf(inv, 'cloth') >= 1 || countOf(inv, 'bark') >= 1 || countOf(inv, 'resin') >= 1 || countOf(inv, 'pitch') >= 1)) {
    return 'torch'
  }
  if (countOf(inv, 'tallow') >= 2 || countOf(inv, 'beeswax') >= 2) return 'candle'
  return null
}

export function hasUnlitLightItem(v: Villager): boolean {
  return (
    countOf(v.inventory, 'torch') > 0 ||
    countOf(v.inventory, 'candle') > 0 ||
    countOf(v.inventory, 'oil_lamp') > 0 ||
    countOf(v.inventory, 'lantern') > 0
  )
}

/** Night outdoor labor / travel multiplier (1 = day). Lit torch softens the dark. */
export function nightActivityMul(state: SimState, v: Villager, outdoor: boolean): number {
  if (!isNight(state.tick)) return 1
  const lit = personalLight(v, state.tick)
  if (!outdoor) return lit || homeIsLit(homeKeeper(state, v), state.tick) ? 0.92 : 0.55
  return lit ? 0.82 : 0.38
}

/** Extra clo from a warm lit hearth while sheltered. */
export function hearthWarmthClo(state: SimState, v: Villager): number {
  if (!nearWarmFire(state, v)) return 0
  if (torchIsLit(v, state.tick) && !hearthIsLit(homeKeeper(state, v), state.tick)) return 0.18
  return 0.45
}

/** Rest recover bonus when sleeping by a warm lit hearth. */
export function hearthSleepBonus(state: SimState, v: Villager): number {
  if (!v.hasHome || distance(v.x, v.y, v.homeX, v.homeY) > 4) return 0
  const keeper = homeKeeper(state, v)
  if (!hearthIsLit(keeper, state.tick)) return 0
  return 0.045
}

/** Portable light item ids — shared catalogue with resources. */
export const LIGHT_ITEM_IDS: ResourceType[] = [
  FIRE_LIGHT_IDS.portable.torch,
  FIRE_LIGHT_IDS.portable.candle,
  FIRE_LIGHT_IDS.portable.oil_lamp,
  FIRE_LIGHT_IDS.portable.lantern,
]

export function isPortableLight(id: ResourceType): boolean {
  return isPortableLightResource(id) || PORTABLE_LIGHTS.includes(id)
}

/** Burn duration for a fuel/light item when lit (hearth tending / torch). */
export function burnDurationTicks(id: ResourceType, kind: 'torch' | 'candle' | 'hearth' = 'hearth'): number {
  const base = fuelBurnTicks(id)
  if (kind === 'torch') return Math.max(TORCH_BURN_TICKS, base * 9)
  if (kind === 'candle') return Math.max(CANDLE_BURN_TICKS, base * 12)
  return Math.max(HEARTH_BURN_TICKS, base * 11)
}
