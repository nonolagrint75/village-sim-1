/**
 * Soft society cycle: social status / dynasty / crisis rebuild (Sim 58-64).
 */
import { TICKS_PER_DAY } from './calendar'
import { feelFamine } from './ecology'
import { countOf } from './inventory'
import { logCause, politicsOf } from './politics'
import type { SimState, Village, Villager } from './types'

export type CrisisPhase = 'stable' | 'crisis' | 'collapse' | 'rebuild'
type CrisisFields = { crisisPhase?: CrisisPhase; lastCrisisTick?: number; rebuildProgress?: number }

function clamp01(v: number) { return Math.max(0, Math.min(1, v)) }
function crisisOf(vg: Village): CrisisFields { return vg as Village & CrisisFields }

export function socialStatusOf(state: SimState, v: Villager): number {
  const coin = countOf(v.inventory, 'coin') + (v.chestInventory ? countOf(v.chestInventory, 'coin') : 0)
  const wealth = clamp01(coin / 40 + (v.hasWorkbench ? 0.08 : 0) + (v.hasCart ? 0.05 : 0))
  const pol = politicsOf(v)
  const lineage = v.lineageId != null ? state.lineages?.find((L) => L.id === v.lineageId && !L.faded) : null
  const lineageBoost = lineage
    ? clamp01(lineage.reputation * 0.35 + (lineage.isDynasty ? 0.15 : 0) + Math.min(0.15, (lineage.wealthEstimate ?? 0) / 80))
    : 0
  const profBoost = v.profession === 'none' ? 0 : v.profession === 'trader' || v.profession === 'blacksmith' ? 0.12 : 0.06
  const power = clamp01(pol.legitimacy * 0.25 + (1 - pol.grievance) * 0.1 + pol.reliability * 0.1)
  return clamp01(wealth * 0.35 + lineageBoost * 0.3 + profBoost + power * 0.25 + (v.hasHome ? 0.05 : 0))
}

export function tickDynasties(state: SimState) {
  if (state.tick % 180 !== 0) return
  for (const L of state.lineages ?? []) {
    if (L.faded) continue
    const elite =
      L.livingCount >= 2 &&
      L.reputation >= 0.48 &&
      (L.wealthEstimate ?? 0) >= 18 &&
      (L.deadCount >= 1 || L.knownAncestors.length >= 1)
    if (elite) {
      L.isDynasty = true
      L.generations = Math.max(L.generations ?? 1, 2)
      if (state.tick % 540 === 0) {
        logCause(state, 'richesse et prestige de ' + L.surname, 'lignee ' + L.surname + ' dynastie soft')
      }
    } else if (L.isDynasty && (L.livingCount === 0 || (L.reputation < 0.2 && (L.wealthEstimate ?? 0) < 8))) {
      L.isDynasty = false
      logCause(state, 'perte de fortune', 'dynastie ' + L.surname + ' decline')
    }
  }
}

export function tickSocietyCycle(state: SimState) {
  if (state.tick % 48 !== 0) return
  tickDynasties(state)
  const warHit = new Set<number>()
  for (const w of state.wars ?? []) {
    if (w.status === 'ended' && state.tick - w.lastBattleTick > TICKS_PER_DAY * 12) continue
    if (w.battles < 1 && w.intensity < 0.2) continue
    for (const pid of [w.aId, w.bId]) {
      const pol = state.polities?.find((p) => p.id === pid)
      if (pol) warHit.add(pol.capitalVillageId)
    }
  }
  for (const vg of state.villages) {
    const cf = crisisOf(vg)
    if (!cf.crisisPhase) cf.crisisPhase = 'stable'
    if (cf.lastCrisisTick == null) cf.lastCrisisTick = -9999
    if (cf.rebuildProgress == null) cf.rebuildProgress = 0
    const pop = vg.memberIds.filter((id) => state.villagers.some((x) => x.id === id && x.alive)).length
    const famine = feelFamine(state, vg) || !!state.famine
    const war = warHit.has(vg.id)
    const prosp = vg.prosperity ?? 40
    const sol = vg.standardOfLiving ?? 0.4
    const stress =
      (famine ? 0.45 : 0) +
      (war ? 0.35 : 0) +
      (prosp < 14 ? 0.25 : prosp < 22 ? 0.12 : 0) +
      (sol < 0.22 ? 0.15 : 0)
    const prev = cf.crisisPhase
    if (prev === 'stable' && stress >= 0.55) {
      cf.crisisPhase = 'crisis'
      cf.lastCrisisTick = state.tick
      cf.rebuildProgress = 0
      logCause(state, famine ? 'famine' : war ? 'guerre' : 'penurie', 'crise a foyer #' + vg.id)
    } else if (prev === 'crisis') {
      if (stress >= 0.85 && prosp < 22 && pop <= 4) {
        cf.crisisPhase = 'collapse'
        cf.lastCrisisTick = state.tick
        vg.prosperity = Math.max(4, prosp - 8)
        vg.security = clamp01((vg.security ?? 0.5) - 0.12)
        logCause(state, 'stress ' + ((stress * 100) | 0) + '%', 'effondrement a foyer #' + vg.id)
      } else if (stress < 0.35 && prosp >= 30) {
        cf.crisisPhase = 'rebuild'
        cf.rebuildProgress = 0.15
      }
    } else if (prev === 'collapse' && !famine && !war && prosp >= 20 && pop >= 3) {
      cf.crisisPhase = 'rebuild'
      cf.rebuildProgress = 0.1
    } else if (prev === 'rebuild') {
      const heal =
        (!famine ? 0.04 : 0) + (!war ? 0.03 : 0) + (prosp > 35 ? 0.05 : 0.02) + (pop >= 6 ? 0.03 : 0)
      cf.rebuildProgress = clamp01((cf.rebuildProgress ?? 0) + heal)
      vg.prosperity = Math.min(70, (vg.prosperity ?? 25) + heal * 8)
      if ((cf.rebuildProgress ?? 0) >= 0.85 && prosp >= 32 && !famine) {
        cf.crisisPhase = 'stable'
        cf.rebuildProgress = 1
        vg.cohesion = clamp01((vg.cohesion ?? 0.4) + 0.06)
      } else if (stress > 0.75) {
        cf.crisisPhase = 'crisis'
      }
    }
  }
  if (state.tick % 96 === 0) {
    for (const vv of state.villagers) {
      if (!vv.alive) continue
      const st = socialStatusOf(state, vv)
      const pol = politicsOf(vv)
      if (st < 0.2) pol.grievance = clamp01(pol.grievance + 0.015)
      else if (st > 0.7) pol.legitimacy = clamp01(pol.legitimacy + 0.01)
    }
  }
}

export function societyCycleSummary(state: SimState) {
  const out = { stable: 0, crisis: 0, collapse: 0, rebuild: 0, dynasties: 0 }
  for (const vg of state.villages) out[crisisOf(vg).crisisPhase ?? 'stable']++
  for (const L of state.lineages ?? []) if (!L.faded && L.isDynasty) out.dynasties++
  return out
}