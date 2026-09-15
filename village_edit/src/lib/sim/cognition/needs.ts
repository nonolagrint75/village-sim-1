import { countOf, edibleValue } from '../inventory'
import { politicsOf } from '../politics'
import { findRoomAt, applyRoomNeedRelief } from '../rooms'
import { lonelinessPressure } from '../social'
import type { SimState, Villager } from '../types'
import { distance, isNight } from '../world'
import { coldStress01, heatStress01, sampleTempC } from '../climate'
import { cloakWarmth01, darknessPressure, nearWarmFire, warmthPressure } from '../lightWarmth'
import type { NeedPressures, ValueWeights } from './types'

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

export function valuesFromPersonality(v: Villager): ValueWeights {
  const p = v.personality
  const bel = politicsOf(v).beliefs
  return {
    family: clamp01(p.generosity * 0.55 + p.sociability * 0.35 + bel.loyalty * 0.2),
    freedom: clamp01(p.curiosity * 0.7 + (1 - bel.tradition) * 0.35),
    honor: clamp01(p.courage * 0.45 + bel.fairness * 0.35 + (1 - bel.greed) * 0.2),
    wealth: clamp01(bel.greed * 0.55 + p.ambition * 0.45 + (1 - p.generosity) * 0.2),
    security: clamp01((1 - p.courage) * 0.35 + bel.loyalty * 0.3 + 0.25),
    status: clamp01(p.ambition * 0.6 + p.sociability * 0.25 + bel.tradition * 0.15),
  }
}

export function emptyNeeds(): NeedPressures {
  return {
    hunger: 0,
    fatigue: 0,
    safety: 0,
    social: 0,
    shelter: 0,
    status: 0,
    purpose: 0,
    belonging: 0,
    boredom: 0,
    piety: 0,
    creative: 0,
    light: 0,
    warmth: 0,
  }
}

const SOCIAL_SIGHT = 18
const HUNGER_MAX = 4

export function updateNeeds(state: SimState, v: Villager, needs: NeedPressures): void {
  const food = edibleValue(v.inventory)
  const air = sampleTempC(state.climate, v.x, v.y)
  const cold = coldStress01(air)
  const heat = heatStress01(air)
  const night = isNight(state.tick)
  const sheltered = v.hasHome && distance(v.x, v.y, v.homeX, v.homeY) < 4

  needs.hunger = clamp01(1 - v.hunger / HUNGER_MAX + (food < 1 ? 0.25 : 0) + (state.famine ? 0.15 : 0))
  // Night pulls toward sleep even when housed — stronger if still outdoors.
  const nightFatigue = night ? (sheltered ? 0.22 : v.hasHome ? 0.42 : 0.28) : 0
  needs.fatigue = clamp01((4 - v.stamina) / 4 + nightFatigue + heat * 0.25 + cold * 0.12)

  let wolfNear = false
  for (const w of state.wolves) {
    if (!w.alive) continue
    if (distance(v.x, v.y, w.x, w.y) < 16) {
      wolfNear = true
      break
    }
  }
  const village = state.villages.find((g) => g.id === v.villageId)
  const wallSafe = village && village.wallTier !== 'none'
  needs.safety = clamp01(
    (wolfNear ? 0.7 : 0) +
      (wallSafe ? -0.15 : 0.1) +
      (v.health < 2 ? 0.25 : 0) +
      cold * (sheltered ? 0.12 : 0.4) +
      heat * (sheltered ? 0.08 : 0.28) +
      darknessPressure(state, v) * 0.45,
  )

  needs.light = clamp01(darknessPressure(state, v))
  needs.warmth = clamp01(
    warmthPressure(state, v) +
      (cold > 0.35 && !nearWarmFire(state, v) && cloakWarmth01(v) < 0.25 ? cold * 0.25 : 0),
  )

  let nearby = 0
  let friends = 0
  let kinNear = 0
  const step = state.villagers.length > 40 ? 2 : 1
  for (let i = (v.id + state.tick) % step; i < state.villagers.length; i += step) {
    const o = state.villagers[i]
    if (!o.alive || o.id === v.id) continue
    if (distance(v.x, v.y, o.x, o.y) > SOCIAL_SIGHT) continue
    nearby++
    const r = v.relations.get(o.id)
    if (r && r.affinity > 0.4) friends++
    if (r && (r.kinship > 0.4 || v.spouseId === o.id)) kinNear++
    if (nearby >= 8) break
  }
  const lone = lonelinessPressure(v, state.tick)
  const pol = politicsOf(v)
  needs.social = clamp01(
    (nearby === 0 ? 0.55 : 0.12) +
      (friends === 0 ? 0.28 : -0.12) +
      (kinNear === 0 ? 0.12 : -0.08) +
      lone * 0.45 +
      (0.5 + v.personality.sociability) * 0.08,
  )
  needs.belonging = clamp01(lone * 0.55 + (friends === 0 ? 0.3 : -0.08) + (kinNear === 0 ? 0.18 : -0.12) + (v.villageId === null ? 0.15 : 0))
  needs.boredom = clamp01(
    (nearby === 0 ? 0.25 : 0.04) +
      (!v.task || v.task.kind === 'idle' ? 0.22 : 0.04) * (0.4 + v.personality.curiosity),
  )
  needs.piety = clamp01(pol.beliefs.piety * 0.4 + pol.beliefs.tradition * 0.15)
  needs.creative = clamp01(
    v.personality.curiosity * 0.22 + v.personality.ambition * 0.12 + (v.ambition === 'builder' ? 0.18 : 0),
  )

  needs.shelter = clamp01(
    (!v.hasHome ? 0.65 : 0) +
      (night && !v.hasHome ? 0.35 : 0) +
      // Housed but away from hearth at night → return-home pressure (not rebuild).
      (night && v.hasHome && !sheltered ? 0.55 : 0) +
      (state.season === 'winter' && !v.hasHome ? 0.3 : 0) +
      (state.season === 'winter' && v.hasHome && !sheltered ? 0.2 : 0) +
      cold * (sheltered ? 0.08 : v.hasHome ? 0.22 : 0.38) +
      heat * (sheltered ? 0.04 : v.hasHome ? 0.1 : 0.18),
  )

  const coins = countOf(v.inventory, 'coin')
  needs.status = clamp01(
    (v.ambition === 'leader' || v.ambition === 'builder' ? 0.35 : 0.1) +
      (coins < 2 ? 0.2 : -0.05) +
      pol.grievance * 0.25,
  )

  const idleLife = v.profession === 'none' && v.hasHome ? 0.25 : 0
  needs.purpose = clamp01(idleLife + v.personality.ambition * 0.2 + (v.ambition === 'explorer' ? 0.15 : 0))

  // Soft need relief when occupying a named room (chambre → fatigue, atelier → créativité, …).
  if (v.hasHome && v.homeLayout) {
    applyRoomNeedRelief(needs, findRoomAt(v.homeLayout, v.x, v.y))
  }
}

export function topNeeds(needs: NeedPressures, n = 4): { key: keyof NeedPressures; value: number }[] {
  const keys = Object.keys(needs) as (keyof NeedPressures)[]
  return keys
    .map((key) => ({ key, value: needs[key] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, n)
}

export const NEED_LABELS_FR: Record<keyof NeedPressures, string> = {
  hunger: 'faim',
  fatigue: 'fatigue',
  safety: 'sécurité',
  social: 'lien social',
  shelter: 'abri',
  status: 'statut',
  purpose: 'dessein',
  belonging: 'appartenance',
  boredom: 'ennui',
  piety: 'piété',
  creative: 'créativité',
  light: 'lumière',
  warmth: 'chaleur',
}
