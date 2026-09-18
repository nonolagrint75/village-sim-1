/**
 * Phase 5 DP10 - TaskKind sequence / anti-loop instrumentation (measure-first).
 *
 * Tracks per-NPC daytime-dominant kinds over a rolling 30d window:
 *   - longest same-loop stretch (non-farm leisure)
 *   - unique day sequences
 *   - variation vs stuck exact loop >14d
 *   - secondary goal share when survival is stable
 *
 * Rational multi-day farm (harvest/sow/grind/bake) is NOT treated as a stuck bug.
 * Night rest is excluded from day-dominant sequences.
 * Never claims PASS - probes report counters; soak acceptance stays PENDING.
 */
import { TICKS_PER_DAY } from './calendar'
import { isNight } from './world'
import type { SimState } from './types'

const WINDOW_DAYS = 30
const STUCK_LOOP_DAYS = 14
const TRACK_MAX = 280

/** Productive / survival kinds - multi-day runs are legitimate, not anti-loop bugs. */
const FARM_OR_SURVIVAL = new Set<string>([
  'harvestWheat',
  'sowField',
  'clearLand',
  'grindFlour',
  'bakeBread',
  'eat',
  'gatherFood',
  'fish',
  'takeFromChest',
  'tendHearth',
  'lightTorch',
  'flee',
  'fight',
  'defend',
  'buildMill',
  'buildHouse',
  'buildBridge',
  'buildChest',
  'buildWall',
  'buildTower',
  'buildRoad',
  'haul',
  'giveFood',
])

export type BehaviorSeqTrack = {
  villagerId: number
  curDay: number
  dayKindCounts: Record<string, number>
  dayKinds: string[]
  loopKind: string | null
  loopDays: number
  maxLoopDays: number
  lastTick: number
}

export type BehaviorSeqCounters = {
  seqNpcTracked: number
  seqNpcWithVariation30d: number
  seqNpcStuckLoop14d: number
  seqLongestSameLoopDays: number
  seqUniqueDaySequences: number
  seqSecondaryGoalStableSamples: number
  seqSecondaryGoalStableHits: number
  seqDayOccupancyTeach: number
  seqDayOccupancySocial: number
  seqDayOccupancyRest: number
  seqDampApplications: number
  _seqTracks?: Map<number, BehaviorSeqTrack>
}

let bound: SimState | null = null

export function bindBehaviorSeqMetrics(state: SimState): void {
  bound = state
}

export function unbindBehaviorSeqMetrics(): void {
  bound = null
}

export function emptyBehaviorSeqCounters(): BehaviorSeqCounters {
  return {
    seqNpcTracked: 0,
    seqNpcWithVariation30d: 0,
    seqNpcStuckLoop14d: 0,
    seqLongestSameLoopDays: 0,
    seqUniqueDaySequences: 0,
    seqSecondaryGoalStableSamples: 0,
    seqSecondaryGoalStableHits: 0,
    seqDayOccupancyTeach: 0,
    seqDayOccupancySocial: 0,
    seqDayOccupancyRest: 0,
    seqDampApplications: 0,
  }
}

export function ensureBehaviorSeqCounters(state: SimState): BehaviorSeqCounters {
  if (!state.behaviorSeqCounters) {
    state.behaviorSeqCounters = emptyBehaviorSeqCounters()
  } else {
    const c = state.behaviorSeqCounters
    if (typeof c.seqNpcTracked !== 'number') c.seqNpcTracked = 0
    if (typeof c.seqNpcWithVariation30d !== 'number') c.seqNpcWithVariation30d = 0
    if (typeof c.seqNpcStuckLoop14d !== 'number') c.seqNpcStuckLoop14d = 0
    if (typeof c.seqLongestSameLoopDays !== 'number') c.seqLongestSameLoopDays = 0
    if (typeof c.seqUniqueDaySequences !== 'number') c.seqUniqueDaySequences = 0
    if (typeof c.seqSecondaryGoalStableSamples !== 'number') c.seqSecondaryGoalStableSamples = 0
    if (typeof c.seqSecondaryGoalStableHits !== 'number') c.seqSecondaryGoalStableHits = 0
    if (typeof c.seqDayOccupancyTeach !== 'number') c.seqDayOccupancyTeach = 0
    if (typeof c.seqDayOccupancySocial !== 'number') c.seqDayOccupancySocial = 0
    if (typeof c.seqDayOccupancyRest !== 'number') c.seqDayOccupancyRest = 0
    if (typeof c.seqDampApplications !== 'number') c.seqDampApplications = 0
  }
  return state.behaviorSeqCounters
}

function dominantKind(counts: Record<string, number>): string | null {
  let best: string | null = null
  let bestN = 0
  for (const [k, n] of Object.entries(counts)) {
    if (n > bestN) {
      bestN = n
      best = k
    }
  }
  return bestN > 0 ? best : null
}

function finalizeDay(track: BehaviorSeqTrack): void {
  const dom = dominantKind(track.dayKindCounts)
  track.dayKindCounts = {}
  if (!dom) return
  track.dayKinds.push(dom)
  if (track.dayKinds.length > WINDOW_DAYS) track.dayKinds.shift()
  if (FARM_OR_SURVIVAL.has(dom)) {
    track.loopKind = null
    track.loopDays = 0
    return
  }
  if (dom === track.loopKind) track.loopDays += 1
  else {
    track.loopKind = dom
    track.loopDays = 1
  }
  track.maxLoopDays = Math.max(track.maxLoopDays, track.loopDays)
}

function recountAggregates(c: BehaviorSeqCounters): void {
  const tracks = c._seqTracks
  if (!tracks || tracks.size === 0) {
    c.seqNpcTracked = 0
    c.seqNpcWithVariation30d = 0
    c.seqNpcStuckLoop14d = 0
    c.seqLongestSameLoopDays = 0
    c.seqUniqueDaySequences = 0
    return
  }
  let varN = 0
  let stuckN = 0
  let longest = 0
  const seqSet = new Set<string>()
  for (const t of tracks.values()) {
    longest = Math.max(longest, t.maxLoopDays)
    if (t.maxLoopDays > STUCK_LOOP_DAYS) stuckN += 1
    const window = t.dayKinds.slice(-WINDOW_DAYS)
    if (window.length >= 2) {
      const uniq = new Set(window)
      if (uniq.size >= 2) varN += 1
    }
    if (window.length >= 7) seqSet.add(window.join('>'))
  }
  c.seqNpcTracked = tracks.size
  c.seqNpcWithVariation30d = varN
  c.seqNpcStuckLoop14d = stuckN
  c.seqLongestSameLoopDays = longest
  c.seqUniqueDaySequences = seqSet.size
}

export function noteBehaviorSequence(
  state: SimState,
  sample: {
    villagerId: number
    kind: string
    goalId: string
    hungerN: number
    fatigueN: number
    safetyN: number
    stress: number
    foodN: number
    health: number
    hungerAbs: number
  },
): void {
  const c = ensureBehaviorSeqCounters(state)
  if (!c._seqTracks) c._seqTracks = new Map()
  const tracks = c._seqTracks
  const day = Math.floor(state.tick / TICKS_PER_DAY)
  const night = isNight(state.tick)

  const survivalStable =
    sample.hungerN < 0.38 &&
    sample.fatigueN < 0.55 &&
    sample.safetyN < 0.45 &&
    sample.stress < 0.48 &&
    sample.foodN >= 0.25 &&
    sample.hungerAbs >= 2.6 &&
    sample.health >= 2.4
  if (survivalStable) {
    c.seqSecondaryGoalStableSamples += 1
    if (sample.goalId !== 'survive' && sample.goalId !== 'rest') {
      c.seqSecondaryGoalStableHits += 1
    }
  }

  if (!night) {
    if (sample.kind === 'teachCraft') c.seqDayOccupancyTeach += 1
    else if (sample.kind === 'socialise') c.seqDayOccupancySocial += 1
    else if (sample.kind === 'rest') c.seqDayOccupancyRest += 1
  }

  let track = tracks.get(sample.villagerId)
  if (!track) {
    track = {
      villagerId: sample.villagerId,
      curDay: day,
      dayKindCounts: {},
      dayKinds: [],
      loopKind: null,
      loopDays: 0,
      maxLoopDays: 0,
      lastTick: state.tick,
    }
    tracks.set(sample.villagerId, track)
    while (tracks.size > TRACK_MAX) {
      let oldestId = -1
      let oldestTick = Infinity
      for (const [id, tr] of tracks) {
        if (tr.lastTick < oldestTick) {
          oldestTick = tr.lastTick
          oldestId = id
        }
      }
      if (oldestId >= 0) tracks.delete(oldestId)
      else break
    }
  }

  if (track.curDay !== day) {
    finalizeDay(track)
    track.curDay = day
  }

  if (!night) {
    track.dayKindCounts[sample.kind] = (track.dayKindCounts[sample.kind] ?? 0) + 1
  }
  track.lastTick = state.tick

  if (track.dayKinds.length % 2 === 0 || tracks.size < 16) {
    recountAggregates(c)
  }
}

export function flushBehaviorSeqDays(state: SimState): void {
  const c = ensureBehaviorSeqCounters(state)
  const tracks = c._seqTracks
  if (!tracks) return
  for (const t of tracks.values()) {
    if (Object.keys(t.dayKindCounts).length > 0) finalizeDay(t)
  }
  recountAggregates(c)
}

export function noteBehaviorSequenceBound(sample: {
  villagerId: number
  kind: string
  goalId: string
  hungerN: number
  fatigueN: number
  safetyN: number
  stress: number
  foodN: number
  health: number
  hungerAbs: number
}): void {
  if (!bound) return
  noteBehaviorSequence(bound, sample)
}

export function noteSeqDampBound(): void {
  if (!bound) return
  ensureBehaviorSeqCounters(bound).seqDampApplications += 1
}

export type BehaviorSeqSnapshot = {
  counters: Omit<BehaviorSeqCounters, '_seqTracks'>
  variationPct: number
  stuckLoop14dPct: number
  secondaryGoalStablePct: number
  acceptanceTargets: {
    variationPctMin: number
    stuckLoop14dPctMax: number
    secondaryGoalStablePctMin: number
  }
  note: string
}

export function snapshotBehaviorSeqMetrics(state: SimState): BehaviorSeqSnapshot {
  flushBehaviorSeqDays(state)
  const raw = ensureBehaviorSeqCounters(state)
  let eligibleVar = 0
  const tracks = raw._seqTracks
  if (tracks) {
    for (const t of tracks.values()) {
      if (t.dayKinds.length >= 2) eligibleVar += 1
    }
  }
  const tracked = raw.seqNpcTracked
  const variationPct = eligibleVar > 0 ? raw.seqNpcWithVariation30d / eligibleVar : 0
  const stuckLoop14dPct = tracked > 0 ? raw.seqNpcStuckLoop14d / tracked : 0
  const secondaryGoalStablePct =
    raw.seqSecondaryGoalStableSamples > 0
      ? raw.seqSecondaryGoalStableHits / raw.seqSecondaryGoalStableSamples
      : 0

  return {
    counters: {
      seqNpcTracked: raw.seqNpcTracked,
      seqNpcWithVariation30d: raw.seqNpcWithVariation30d,
      seqNpcStuckLoop14d: raw.seqNpcStuckLoop14d,
      seqLongestSameLoopDays: raw.seqLongestSameLoopDays,
      seqUniqueDaySequences: raw.seqUniqueDaySequences,
      seqSecondaryGoalStableSamples: raw.seqSecondaryGoalStableSamples,
      seqSecondaryGoalStableHits: raw.seqSecondaryGoalStableHits,
      seqDayOccupancyTeach: raw.seqDayOccupancyTeach,
      seqDayOccupancySocial: raw.seqDayOccupancySocial,
      seqDayOccupancyRest: raw.seqDayOccupancyRest,
      seqDampApplications: raw.seqDampApplications,
    },
    variationPct,
    stuckLoop14dPct,
    secondaryGoalStablePct,
    acceptanceTargets: {
      variationPctMin: 0.3,
      stuckLoop14dPctMax: 0.5,
      secondaryGoalStablePctMin: 0.2,
    },
    note:
      'Measure-first DP10 - farm multi-day runs excluded from stuck; night rest excluded from day-dominant; never PASS from short smoke',
  }
}