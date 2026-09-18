/**
 * Settlement / quarter identity — co-region clustering → habits / food / architecture.
 */

import { clamp01, meanFeatures } from './cultureMix'
import type {
  AssociationStage,
  CultureFeatures,
  HostStance,
  MigrantPerson,
  MigrantQuartersState,
  QuarterHabitSet,
  QuarterIdentity,
  SettlementMigrantView,
} from './types'

const FOOD_POOL = [
  'spiced_stew',
  'flatbread',
  'smoked_fish',
  'fermented_grain',
  'herb_broth',
  'honey_cake',
]
const ARCH_POOL = [
  'courtyard_cluster',
  'painted_lintels',
  'narrow_alleys',
  'shared_well_yard',
  'tiled_eaves',
  'workshop_front',
]
const PLACE_POOL = ['well', 'shrine_corner', 'cloth_yard', 'baker_lane', 'gate_steps']

function pickN(pool: string[], n: number, seed: number): string[] {
  const out: string[] = []
  let h = seed >>> 0
  const bag = pool.slice()
  for (let i = 0; i < n && bag.length; i++) {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0
    const idx = h % bag.length
    out.push(bag.splice(idx, 1)[0]!)
  }
  return out
}

export function stanceFromScores(welcome: number, suspicion: number): HostStance {
  const net = welcome - suspicion
  if (net >= 0.35) return 'welcome'
  if (net >= 0.05) return 'neutral'
  if (net >= -0.25) return 'wary'
  return 'hostile'
}

export function buildHabits(
  originRegionId: number,
  culturalMean: CultureFeatures,
): QuarterHabitSet {
  const seed =
    originRegionId * 997 + culturalMean.reduce((a, b, i) => a + b * (i + 3), 0)
  return {
    foodPrefs: pickN(FOOD_POOL, 2 + (seed % 2), seed),
    architectureMotifs: pickN(ARCH_POOL, 2, seed ^ 0x9e3779b9),
    gatheringPlaces: pickN(PLACE_POOL, 2, seed ^ 0x85ebca6b),
    festivityWeight: clamp01(0.25 + ((culturalMean[4] ?? 0) / 7) * 0.6),
  }
}

export function quarterIdFor(settlementId: number, originRegionId: number): string {
  return `q:${settlementId}:r${originRegionId}`
}

export function ensureQuarter(
  state: MigrantQuartersState,
  settlementId: number,
  originRegionId: number,
  culturalMean: CultureFeatures,
): QuarterIdentity {
  const id = quarterIdFor(settlementId, originRegionId)
  let q = state.quarters.find((x) => x.id === id)
  if (q) return q
  q = {
    id,
    settlementId,
    name: `Quarter-r${originRegionId}`,
    originRegionId,
    coRegionShare: 0,
    habits: buildHabits(originRegionId, culturalMean),
    culturalMean: culturalMean.slice(),
    hostStance: 'neutral',
    suspicion: 0.25,
    welcome: 0.3,
    popShare: 0,
    formedTick: state.tick,
    associationStage: 'none',
  }
  state.quarters.push(q)
  return q
}

export function refreshQuarterIdentity(
  state: MigrantQuartersState,
  quarter: QuarterIdentity,
): void {
  const members = state.people.filter((p) => p.quarterId === quarter.id)
  if (!members.length) return
  const mean = meanFeatures(members.map((m) => m.culture.features))
  quarter.culturalMean = mean
  if (members.length >= 3) {
    quarter.habits = buildHabits(quarter.originRegionId, mean)
  }
  const host = state.hostPopBySettlement[quarter.settlementId] ?? 20
  const migrantHere = state.people.filter((p) => p.settlementId === quarter.settlementId).length
  const sameRegion = members.length
  quarter.coRegionShare = migrantHere > 0 ? sameRegion / migrantHere : 0
  quarter.popShare = host + migrantHere > 0 ? sameRegion / (host + migrantHere) : 0
  quarter.hostStance = stanceFromScores(quarter.welcome, quarter.suspicion)
}

/** Labor scarcity + workshops raise welcome; crowding + distance raise suspicion. */
export function updateHostAttitudes(
  state: MigrantQuartersState,
  quarter: QuarterIdentity,
  laborDemand: number,
  crimePressure: number,
): void {
  const members = state.people.filter((p) => p.quarterId === quarter.id)
  const workshops = members.filter((m) => m.workshopId).length
  const avgBlend =
    members.reduce((s, m) => s + m.culture.hostBlend, 0) / Math.max(1, members.length)
  const crowding = clamp01(quarter.popShare * 2.2)
  quarter.welcome = clamp01(
    quarter.welcome + laborDemand * 0.04 + workshops * 0.015 + avgBlend * 0.01 - crowding * 0.02,
  )
  quarter.suspicion = clamp01(
    quarter.suspicion +
      crowding * 0.03 +
      crimePressure * 0.05 -
      avgBlend * 0.02 -
      laborDemand * 0.015,
  )
  quarter.hostStance = stanceFromScores(quarter.welcome, quarter.suspicion)
}

export function assignCoRegionCluster(
  state: MigrantQuartersState,
  person: MigrantPerson,
): QuarterIdentity {
  const peers = state.people.filter(
    (p) =>
      p.settlementId === person.settlementId &&
      p.originRegionId === person.originRegionId &&
      p.id !== person.id,
  )
  const quarter = ensureQuarter(
    state,
    person.settlementId,
    person.originRegionId,
    meanFeatures([person.culture.features, ...peers.map((p) => p.culture.features)]),
  )
  person.quarterId = quarter.id
  if (person.phase === 'workshop_anchor' || person.phase === 'married_local') {
    person.phase = 'quarter_resident'
  }
  refreshQuarterIdentity(state, quarter)
  return quarter
}

export function setAssociationStage(quarter: QuarterIdentity, stage: AssociationStage): void {
  quarter.associationStage = stage
}

export function exportSettlementMigrantView(
  state: MigrantQuartersState,
  settlementId: number,
): SettlementMigrantView {
  const host = state.hostPopBySettlement[settlementId] ?? 0
  const migrants = state.people.filter((p) => p.settlementId === settlementId)
  const quarters = state.quarters.filter((q) => q.settlementId === settlementId)
  const associations = state.associations.filter((a) =>
    quarters.some((q) => q.id === a.quarterId),
  )
  const migrantPop = migrants.length
  const totalPop = host + migrantPop
  const hostStanceMean =
    quarters.length === 0
      ? 0.5
      : quarters.reduce((s, q) => s + (q.welcome - q.suspicion), 0) / quarters.length
  return {
    settlementId,
    totalPop,
    migrantPop,
    migrantShare: totalPop > 0 ? migrantPop / totalPop : 0,
    quarters: quarters.map((q) => ({
      ...q,
      habits: { ...q.habits },
      culturalMean: q.culturalMean.slice(),
    })),
    associations: associations.map((a) => ({
      ...a,
      memberIds: a.memberIds.slice(),
      norms: a.norms.slice(),
    })),
    hostStanceMean,
  }
}