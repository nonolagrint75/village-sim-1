/**
 * Elian life-type tick — causal phase transitions, not biography day scripts.
 *
 * Chain: orphan/leave → city labor → trade apprentice → marry local →
 * cultural drift kids → workshop → co-region cluster → quarter habits →
 * welcome/suspicion → association → institution → multi-decade pop share.
 */

import { tickAssociations } from './association'
import {
  driftTowardPeers,
  hostBaselineFeatures,
  makeOriginCulture,
  meanFeatures,
  mixChildCulture,
  randomFeatures,
} from './cultureMix'
import {
  assignCoRegionCluster,
  exportSettlementMigrantView,
  refreshQuarterIdentity,
  updateHostAttitudes,
} from './quarterIdentity'
import type { MigrantPerson, MigrantQuartersState, SettlementMigrantView } from './types'
import { ELIAN_LIFE_TYPE } from './types'

export interface TickSignals {
  /** Soft labor scarcity in destination settlements (0..1). */
  laborDemandBySettlement?: Record<number, number>
  /** Optional crime / unrest pressure (0..1). */
  crimePressureBySettlement?: Record<number, number>
  /** Chance per tick to spawn a new orphan leaver into a city. */
  arrivalPressure?: number
  /** Destination settlement ids that accept arrivals. */
  citySettlementIds?: number[]
  /** Origin region pool. */
  originRegionIds?: number[]
  rng?: () => number
}

function pushEvent(
  state: MigrantQuartersState,
  kind: MigrantQuartersState['events'][number]['kind'],
  extra: Partial<MigrantQuartersState['events'][number]> = {},
): void {
  state.events.push({ tick: state.tick, kind, ...extra })
  if (state.events.length > 200) state.events.splice(0, state.events.length - 200)
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function createMigrantQuartersState(opts?: {
  hostPopBySettlement?: Record<number, number>
}): MigrantQuartersState {
  return {
    tick: 0,
    nextPersonId: 1,
    nextAssociationId: 1,
    nextChildId: 1,
    people: [],
    children: [],
    quarters: [],
    associations: [],
    hostPopBySettlement: { ...(opts?.hostPopBySettlement ?? { 1: 40 }) },
    events: [],
  }
}

export function spawnOrphanLeaver(
  state: MigrantQuartersState,
  settlementId: number,
  originRegionId: number,
  rng: () => number,
  name = 'Elian',
): MigrantPerson {
  const person: MigrantPerson = {
    id: state.nextPersonId++,
    name: `${name}-${state.nextPersonId}`,
    originRegionId,
    settlementId,
    quarterId: null,
    phase: 'orphan_leave',
    culture: makeOriginCulture(`r${originRegionId}`, randomFeatures(rng)),
    spouseLocalId: null,
    workshopId: null,
    associationId: null,
    laborSkill: 0.15 + rng() * 0.2,
    tradeSkill: 0.05 + rng() * 0.1,
    wealth: 1 + rng() * 2,
    arrivalTick: state.tick,
    generation: 0,
  }
  state.people.push(person)
  pushEvent(state, 'left_village', {
    personId: person.id,
    detail: `origin=${originRegionId}→settlement=${settlementId}`,
  })
  return person
}

function advancePerson(
  state: MigrantQuartersState,
  p: MigrantPerson,
  laborDemand: number,
  rng: () => number,
): void {
  const yearsInCity = (state.tick - p.arrivalTick) / 360
  const host = hostBaselineFeatures(p.settlementId)

  if (p.phase === 'orphan_leave' && (laborDemand > 0.2 || rng() < 0.08)) {
    p.phase = 'city_labor'
    p.laborSkill = Math.min(1, p.laborSkill + 0.05)
    p.wealth += 0.5 + laborDemand
    pushEvent(state, 'took_city_labor', { personId: p.id })
    return
  }

  if (p.phase === 'city_labor') {
    p.laborSkill = Math.min(1, p.laborSkill + 0.012 + laborDemand * 0.01)
    p.wealth += 0.08 + laborDemand * 0.1
    driftTowardPeers(p, host, host, 0.25 + laborDemand * 0.2, rng)
    if (p.laborSkill > 0.35 && yearsInCity > 0.25) {
      p.phase = 'trade_apprentice'
      p.tradeSkill = Math.min(1, p.tradeSkill + 0.12)
      pushEvent(state, 'began_apprenticeship', { personId: p.id })
    }
    return
  }

  if (p.phase === 'trade_apprentice') {
    p.tradeSkill = Math.min(1, p.tradeSkill + 0.02)
    p.wealth += 0.15 + p.tradeSkill * 0.2
    if (p.tradeSkill > 0.45 && p.culture.hostBlend > 0.15 && rng() < 0.04) {
      p.phase = 'married_local'
      p.spouseLocalId = 10_000 + p.settlementId * 100 + (p.id % 97)
      pushEvent(state, 'married_local', { personId: p.id })
      const child = mixChildCulture(p, host, state.tick, state.nextChildId++, rng)
      state.children.push(child)
      pushEvent(state, 'child_cultural_drift', {
        personId: p.id,
        detail: `child=${child.id} blend=${child.culture.hostBlend.toFixed(2)}`,
      })
    }
    // Soft host contact while apprenticed.
    driftTowardPeers(p, host, host, 0.4 + laborDemand * 0.3, rng)
    return
  }

  if (p.phase === 'married_local') {
    driftTowardPeers(p, host, host, 0.55, rng)
    if (p.wealth > 6 && p.tradeSkill > 0.5 && rng() < 0.05) {
      p.phase = 'workshop_anchor'
      p.workshopId = `ws:${p.settlementId}:${p.id}`
      pushEvent(state, 'founded_workshop', { personId: p.id, detail: p.workshopId })
    }
    return
  }

  if (p.phase === 'workshop_anchor' || p.phase === 'quarter_resident') {
    p.wealth += 0.2 + p.tradeSkill * 0.25
    const q = assignCoRegionCluster(state, p)
    pushEvent(state, 'clustered_co_region', { personId: p.id, quarterId: q.id })
    if (q.habits.foodPrefs.length) {
      pushEvent(state, 'quarter_habits_formed', { quarterId: q.id })
    }
  }
}

export function tickMigrantQuarters(
  state: MigrantQuartersState,
  signals: TickSignals = {},
): SettlementMigrantView[] {
  state.tick += 1
  const rng = signals.rng ?? mulberry32(state.tick * 9973 + state.people.length * 13)
  const cities = signals.citySettlementIds ?? Object.keys(state.hostPopBySettlement).map(Number)
  const origins = signals.originRegionIds ?? [1, 2, 3]
  const arrivalPressure = signals.arrivalPressure ?? 0.02

  if (cities.length && rng() < arrivalPressure) {
    const settlementId = cities[Math.floor(rng() * cities.length)]!
    const originRegionId = origins[Math.floor(rng() * origins.length)]!
    spawnOrphanLeaver(state, settlementId, originRegionId, rng, 'Elian')
  }

  for (const p of state.people) {
    const labor = signals.laborDemandBySettlement?.[p.settlementId] ?? 0.35
    advancePerson(state, p, labor, rng)
  }

  for (const q of state.quarters) {
    refreshQuarterIdentity(state, q)
    const labor = signals.laborDemandBySettlement?.[q.settlementId] ?? 0.35
    const crime = signals.crimePressureBySettlement?.[q.settlementId] ?? 0.1
    const prevStance = q.hostStance
    updateHostAttitudes(state, q, labor, crime)
    if (q.hostStance !== prevStance) {
      pushEvent(state, 'host_stance_shift', {
        quarterId: q.id,
        detail: `${prevStance}→${q.hostStance}`,
      })
    }
  }

  tickAssociations(state)

  // Decade-scale pop share observability (tick≈day; 3600≈10y soft).
  if (state.tick % 360 === 0) {
    pushEvent(state, 'pop_share_updated', {
      detail: `migrants=${state.people.length} quarters=${state.quarters.length}`,
    })
  }

  const settlementIds = new Set<number>([
    ...Object.keys(state.hostPopBySettlement).map(Number),
    ...state.people.map((p) => p.settlementId),
  ])
  return [...settlementIds].map((id) => exportSettlementMigrantView(state, id))
}

export function culturalTraitsSnapshot(state: MigrantQuartersState) {
  return state.people.map((p) => ({
    id: p.id,
    lifeType: ELIAN_LIFE_TYPE,
    phase: p.phase,
    originTag: p.culture.originTag,
    hostBlend: p.culture.hostBlend,
    features: p.culture.features.slice(),
    traits: { ...p.culture.traits },
    quarterId: p.quarterId,
  }))
}

export function meanPeerFeaturesForQuarter(
  state: MigrantQuartersState,
  quarterId: string,
) {
  const members = state.people.filter((p) => p.quarterId === quarterId)
  return meanFeatures(members.map((m) => m.culture.features))
}