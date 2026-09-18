/**
 * CP3 / Phase5 — attribution + causal counters (sec24 personality / sec25 memory / sec26 emotion).
 * Attribution tags = material co-occurrence on the soft path — NEVER invent PASS.
 * Pair ring is soak infrastructure; does NOT claim sec24 PASS.
 * DP1: memoryCausalFlips = argmax with vs without place-memory spots (measure-first).
 * DP2: emotionCausalFlips = argmax with vs without emotionTaskBias (emotions factor only).
 * DP3: personalityCausalFlips = argmax with vs without trait priors / courage place pull;
 *      personalityPairDivergent = natural matched pairs with measurable behavior Δ (no trait rewrite).
 */
import { TICKS_PER_DAY } from './calendar'
import type { SimState, TaskKind } from './types'

/** Same materiality bar as topFactorWhy skip (|mult-1| < 0.08). */
export const ATTRIBUTION_MATERIAL_DELTA = 0.08

/** Mission volume floors (label honestly if under — do not auto-PASS). */
export const MEMORY_FLOOR_MEMORABLE = 50
export const MEMORY_FLOOR_RETRIEVALS = 30
export const MEMORY_FLOOR_USES = 20
export const MEMORY_FLOOR_CAUSAL_FLIPS = 10

/** DP2 emotion volume floors (honest UNDER labels; PASS gates on flips only). */
export const EMOTION_FLOOR_CHANGES = 50
export const EMOTION_FLOOR_USES = 30
export const EMOTION_FLOOR_CAUSAL_FLIPS = 15

/** DP3 personality floors (honest UNDER; no PASS without data). */
export const PERSONALITY_FLOOR_CAUSAL_FLIPS = 10
export const PERSONALITY_FLOOR_PAIR_READY = 10
export const PERSONALITY_FLOOR_USES = 20
/** Mission target: ≥50% of ready natural pairs show measurable Δ — measure only. */
export const PERSONALITY_TARGET_DIVERGENT_RATIO = 0.5

/** DP5: mission target share of changes with >=2 material factors (measure only). */
export const PROFESSION_MULTIFACTOR_TARGET_SHARE = 0.7

/** Min decisions per NPC before pair matching. */
const PAIR_MIN_DECISIONS = 4
/** L1 trait distance for "different personality". */
const PAIR_TRAIT_DIST_MIN = 0.35
/** Max L1 on avg hunger/fatigue/food bands for "similar context". */
const PAIR_CONTEXT_DIST_MAX = 0.55
/** Min L1 on task histogram (or different mode) = measurable behavioral Δ. */
const PAIR_HIST_DIST_MIN = 0.35

export type PersonalityPairSample = {
  villagerId: number
  courage: number
  sociability: number
  generosity: number
  curiosity: number
  ambition: number
  kind: string
  tick: number
  day: number
  /** Coarse needs/resources context for natural matching (0–1). */
  hungerN?: number
  fatigueN?: number
  foodN?: number
}

/** Per-NPC rolling behavior track for natural personality pairs. */
export type PersonalityBehaviorTrack = {
  villagerId: number
  courage: number
  sociability: number
  generosity: number
  curiosity: number
  ambition: number
  kindCounts: Record<string, number>
  total: number
  hungerSum: number
  fatigueSum: number
  foodSum: number
  lastTick: number
  lastDay: number
}

/** Compact TEST evidence for memory counterfactual (PHASE5_EVIDENCE_LOG). */
export type MemoryCausalSample = {
  tick: number
  day: number
  villagerId: number
  beforeKind: string
  afterKind: string
  utilBefore: number
  utilAfter: number
  runnerUpKind: string | null
  runnerUpUtilBefore: number | null
  spotKind: 'danger' | 'good' | 'mixed' | null
  flipped: boolean
}

/** Compact TEST evidence for emotion counterfactual (PHASE5_EVIDENCE_LOG). */
export type EmotionCausalSample = {
  tick: number
  day: number
  villagerId: number
  beforeKind: string
  afterKind: string
  utilBefore: number
  utilAfter: number
  runnerUpKind: string | null
  runnerUpUtilBefore: number | null
  flipped: boolean
}

/** Compact TEST evidence for personality counterfactual (PHASE5_EVIDENCE_LOG). */
export type PersonalityCausalSample = {
  tick: number
  day: number
  villagerId: number
  beforeKind: string
  afterKind: string
  utilBefore: number
  utilAfter: number
  runnerUpKind: string | null
  runnerUpUtilBefore: number | null
  flipped: boolean
}

/** Compact TEST evidence for family counterfactual (Phase6 M6.1). */
export type FamilyCausalSample = {
  tick: number
  day: number
  villagerId: number
  beforeKind: string
  afterKind: string
  utilBefore: number
  utilAfter: number
  runnerUpKind: string | null
  runnerUpUtilBefore: number | null
  kinship: number
  familyValue: number
  flipped: boolean
}

/** Compact TEST evidence for relation→help counterfactual (Phase6 M5.1). */
export type RelationCausalSample = {
  tick: number
  day: number
  villagerId: number
  beforeKind: string
  afterKind: string
  utilBefore: number
  utilAfter: number
  runnerUpKind: string | null
  runnerUpUtilBefore: number | null
  affinity: number
  trust: number
  kinship: number
  flipped: boolean
  helpMenu: boolean
}

/** Compact evidence for a natural matched personality pair. */
export type ProfessionFactorSample = {
  tick: number
  day: number
  villagerId: number
  prev: string
  next: string
  factors: Array<{ name: string; delta: number }>
  multiFactor: boolean
  foodNeed: number
  source?: string
}

export type PersonalityPairMatchSample = {
  aId: number
  bId: number
  traitDist: number
  contextDist: number
  histDist: number
  modeA: string
  modeB: string
  divergent: boolean
  totalA: number
  totalB: number
}

export type AttributionCounters = {
  memoryAttributedDecisions: number
  memoryAttributedNpcs: number
  emotionAttributedDecisions: number
  emotionAttributedNpcs: number
  personalityAttributedDecisions: number
  personalityAttributedNpcs: number
  personalityPairSamples: number
  personalityPairReady: number
  /** Natural pairs with measurable task-histogram / mode Δ. */
  personalityPairDivergent: number
  memoryMemorableEvents: number
  memoryRetrievals: number
  memoryUses: number
  memoryCausalFlips: number
  memoryMaterialNoFlip: number
  memoryCausalSamples: MemoryCausalSample[]
  emotionChanges: number
  emotionUses: number
  emotionCausalFlips: number
  emotionMaterialNoFlip: number
  emotionCausalSamples: EmotionCausalSample[]
  personalityUses: number
  personalityCausalFlips: number
  personalityMaterialNoFlip: number
  personalityCausalSamples: PersonalityCausalSample[]
  personalityPairMatchSamples: PersonalityPairMatchSample[]
  /** P6 M6.1: family kinship/values.family ablate → argmax flip. */
  familyUses: number
  familyCausalFlips: number
  familyMaterialNoFlip: number
  familyCausalSamples: FamilyCausalSample[]
  /** P6 M5.1: relation affinity/trust/kin ablate → help menu flip. */
  relationUses: number
  relationCausalFlips: number
  relationMaterialNoFlip: number
  relationCausalSamples: RelationCausalSample[]
  /** DP5 natural profession changes (accepted applyProfessionChange). */
  professionChanges: number
  /** Changes with >=2 material factor tags. */
  professionChangesMultiFactor: number
  professionFactorSamples: ProfessionFactorSample[]
  _memoryNpcIds?: Set<number>
  _emotionNpcIds?: Set<number>
  _personalityNpcIds?: Set<number>
  _familyNpcIds?: Set<number>
  _relationNpcIds?: Set<number>
  _pairRing?: PersonalityPairSample[]
  _behaviorTracks?: Map<number, PersonalityBehaviorTrack>
}

const PAIR_RING_MAX = 64
const MEMORY_CF_RING_MAX = 48
const EMOTION_CF_RING_MAX = 48
const PERSONALITY_CF_RING_MAX = 48
const FAMILY_CF_RING_MAX = 48
const RELATION_CF_RING_MAX = 48
const BEHAVIOR_TRACK_MAX = 96
const PAIR_MATCH_SAMPLE_MAX = 24

export function emptyAttributionCounters(): AttributionCounters {
  return {
    memoryAttributedDecisions: 0,
    memoryAttributedNpcs: 0,
    emotionAttributedDecisions: 0,
    emotionAttributedNpcs: 0,
    personalityAttributedDecisions: 0,
    personalityAttributedNpcs: 0,
    personalityPairSamples: 0,
    personalityPairReady: 0,
    personalityPairDivergent: 0,
    memoryMemorableEvents: 0,
    memoryRetrievals: 0,
    memoryUses: 0,
    memoryCausalFlips: 0,
    memoryMaterialNoFlip: 0,
    memoryCausalSamples: [],
    emotionChanges: 0,
    emotionUses: 0,
    emotionCausalFlips: 0,
    emotionMaterialNoFlip: 0,
    emotionCausalSamples: [],
    personalityUses: 0,
    personalityCausalFlips: 0,
    personalityMaterialNoFlip: 0,
    personalityCausalSamples: [],
    personalityPairMatchSamples: [],
    familyUses: 0,
    familyCausalFlips: 0,
    familyMaterialNoFlip: 0,
    familyCausalSamples: [],
    relationUses: 0,
    relationCausalFlips: 0,
    relationMaterialNoFlip: 0,
    relationCausalSamples: [],
    professionChanges: 0,
    professionChangesMultiFactor: 0,
    professionFactorSamples: [],
  }
}

export function ensureAttributionCounters(state: SimState): AttributionCounters {
  if (!state.attributionCounters) {
    state.attributionCounters = emptyAttributionCounters()
  }
  const c = state.attributionCounters as AttributionCounters
  if (typeof c.memoryMemorableEvents !== 'number') c.memoryMemorableEvents = 0
  if (typeof c.memoryRetrievals !== 'number') c.memoryRetrievals = 0
  if (typeof c.memoryUses !== 'number') c.memoryUses = 0
  if (typeof c.memoryCausalFlips !== 'number') c.memoryCausalFlips = 0
  if (typeof c.memoryMaterialNoFlip !== 'number') c.memoryMaterialNoFlip = 0
  if (!Array.isArray(c.memoryCausalSamples)) c.memoryCausalSamples = []
  if (typeof c.emotionChanges !== 'number') c.emotionChanges = 0
  if (typeof c.emotionUses !== 'number') c.emotionUses = 0
  if (typeof c.emotionCausalFlips !== 'number') c.emotionCausalFlips = 0
  if (typeof c.emotionMaterialNoFlip !== 'number') c.emotionMaterialNoFlip = 0
  if (!Array.isArray(c.emotionCausalSamples)) c.emotionCausalSamples = []
  if (typeof c.personalityUses !== 'number') c.personalityUses = 0
  if (typeof c.personalityCausalFlips !== 'number') c.personalityCausalFlips = 0
  if (typeof c.personalityMaterialNoFlip !== 'number') c.personalityMaterialNoFlip = 0
  if (!Array.isArray(c.personalityCausalSamples)) c.personalityCausalSamples = []
  if (typeof c.personalityPairDivergent !== 'number') c.personalityPairDivergent = 0
  if (!Array.isArray(c.personalityPairMatchSamples)) c.personalityPairMatchSamples = []
  if (typeof c.familyUses !== 'number') c.familyUses = 0
  if (typeof c.familyCausalFlips !== 'number') c.familyCausalFlips = 0
  if (typeof c.familyMaterialNoFlip !== 'number') c.familyMaterialNoFlip = 0
  if (!Array.isArray(c.familyCausalSamples)) c.familyCausalSamples = []
  if (typeof c.relationUses !== 'number') c.relationUses = 0
  if (typeof c.relationCausalFlips !== 'number') c.relationCausalFlips = 0
  if (typeof c.relationMaterialNoFlip !== 'number') c.relationMaterialNoFlip = 0
  if (!Array.isArray(c.relationCausalSamples)) c.relationCausalSamples = []
  if (typeof c.professionChanges !== 'number') c.professionChanges = 0
  if (typeof c.professionChangesMultiFactor !== 'number') c.professionChangesMultiFactor = 0
  if (!Array.isArray(c.professionFactorSamples)) c.professionFactorSamples = []
  return c
}

function trackNpc(
  c: AttributionCounters,
  which: 'memory' | 'emotion' | 'personality',
  id: number,
): void {
  if (which === 'memory') {
    if (!c._memoryNpcIds) c._memoryNpcIds = new Set()
    c._memoryNpcIds.add(id)
    c.memoryAttributedNpcs = c._memoryNpcIds.size
  } else if (which === 'emotion') {
    if (!c._emotionNpcIds) c._emotionNpcIds = new Set()
    c._emotionNpcIds.add(id)
    c.emotionAttributedNpcs = c._emotionNpcIds.size
  } else {
    if (!c._personalityNpcIds) c._personalityNpcIds = new Set()
    c._personalityNpcIds.add(id)
    c.personalityAttributedNpcs = c._personalityNpcIds.size
  }
}

export type AttributionFlags = {
  memory: boolean
  emotion: boolean
  personality: boolean
}

export function attributionFlagsFromWhy(why?: string[] | null): AttributionFlags {
  const flags: AttributionFlags = { memory: false, emotion: false, personality: false }
  if (!why || why.length === 0) return flags
  for (const t of why) {
    if (t.startsWith('mem:')) flags.memory = true
    else if (t.startsWith('emo:')) flags.emotion = true
    else if (t.startsWith('pers:')) flags.personality = true
  }
  return flags
}

export function noteAttributedDecision(
  state: SimState,
  villagerId: number,
  flags: AttributionFlags,
  sample?: Omit<PersonalityPairSample, 'tick' | 'day'> & { kind: TaskKind | string },
): void {
  if (!flags.memory && !flags.emotion && !flags.personality) return
  const c = ensureAttributionCounters(state)
  if (flags.memory) {
    c.memoryAttributedDecisions += 1
    trackNpc(c, 'memory', villagerId)
  }
  if (flags.emotion) {
    c.emotionAttributedDecisions += 1
    trackNpc(c, 'emotion', villagerId)
  }
  if (flags.personality) {
    c.personalityAttributedDecisions += 1
    trackNpc(c, 'personality', villagerId)
    if (sample && (flags.personality || isPairKind(sample.kind))) {
      pushPairSample(c, {
        ...sample,
        tick: state.tick,
        day: Math.floor(state.tick / TICKS_PER_DAY),
      })
    }
  }
}

export function isPairKind(kind: string): boolean {
  return (
    kind === 'socialise' ||
    kind === 'entertain' ||
    kind === 'counsel' ||
    kind === 'giveFood' ||
    kind === 'teachCraft' ||
    kind === 'confront' ||
    kind === 'steal' ||
    kind === 'flee' ||
    kind === 'fight' ||
    kind === 'defend'
  )
}

function pushPairSample(c: AttributionCounters, sample: PersonalityPairSample): void {
  if (!c._pairRing) c._pairRing = []
  const ring = c._pairRing
  const prev = ring.findIndex((s) => s.villagerId === sample.villagerId)
  if (prev >= 0) ring.splice(prev, 1)
  ring.push(sample)
  while (ring.length > PAIR_RING_MAX) ring.shift()
  // Samples = tracked NPCs with enough decisions (natural tracks preferred).
  if (c._behaviorTracks && c._behaviorTracks.size > 0) {
    c.personalityPairSamples = [...c._behaviorTracks.values()].filter(
      (t) => t.total >= PAIR_MIN_DECISIONS,
    ).length
  } else {
    c.personalityPairSamples = ring.length
  }
}

function traitL1(a: PersonalityBehaviorTrack, b: PersonalityBehaviorTrack): number {
  return (
    Math.abs(a.courage - b.courage) +
    Math.abs(a.sociability - b.sociability) +
    Math.abs(a.generosity - b.generosity) +
    Math.abs(a.curiosity - b.curiosity) +
    Math.abs(a.ambition - b.ambition)
  )
}

function contextL1(a: PersonalityBehaviorTrack, b: PersonalityBehaviorTrack): number {
  const ah = a.hungerSum / Math.max(1, a.total)
  const bh = b.hungerSum / Math.max(1, b.total)
  const af = a.fatigueSum / Math.max(1, a.total)
  const bf = b.fatigueSum / Math.max(1, b.total)
  const ao = a.foodSum / Math.max(1, a.total)
  const bo = b.foodSum / Math.max(1, b.total)
  return Math.abs(ah - bh) + Math.abs(af - bf) + Math.abs(ao - bo)
}

function histL1(a: PersonalityBehaviorTrack, b: PersonalityBehaviorTrack): number {
  const keys = new Set([...Object.keys(a.kindCounts), ...Object.keys(b.kindCounts)])
  let d = 0
  for (const k of keys) {
    const pa = (a.kindCounts[k] ?? 0) / Math.max(1, a.total)
    const pb = (b.kindCounts[k] ?? 0) / Math.max(1, b.total)
    d += Math.abs(pa - pb)
  }
  return d
}

function modeKind(t: PersonalityBehaviorTrack): string {
  let best = '?'
  let n = -1
  for (const [k, v] of Object.entries(t.kindCounts)) {
    if (v > n) {
      n = v
      best = k
    }
  }
  return best
}

/** Recount natural matched pairs (similar context, distant traits) + divergent behavior. */
export function recountPersonalityPairs(c: AttributionCounters): void {
  const tracks = c._behaviorTracks
  if (!tracks || tracks.size === 0) {
    // Legacy fallback: trait-distant same-kind ring pairs (no behavior Δ proof).
    const ring = c._pairRing ?? []
    c.personalityPairReady = countPairReadyLegacy(ring)
    c.personalityPairDivergent = 0
    return
  }
  const list = [...tracks.values()].filter((t) => t.total >= PAIR_MIN_DECISIONS)
  c.personalityPairSamples = list.length
  let ready = 0
  let divergent = 0
  const matchSamples: PersonalityPairMatchSample[] = []
  for (let i = 0; i < list.length; i++) {
    const a = list[i]!
    for (let j = i + 1; j < list.length; j++) {
      const b = list[j]!
      const td = traitL1(a, b)
      if (td <= PAIR_TRAIT_DIST_MIN) continue
      const cd = contextL1(a, b)
      if (cd > PAIR_CONTEXT_DIST_MAX) continue
      ready += 1
      const hd = histL1(a, b)
      const modeA = modeKind(a)
      const modeB = modeKind(b)
      const isDiv = hd >= PAIR_HIST_DIST_MIN || modeA !== modeB
      if (isDiv) divergent += 1
      if (matchSamples.length < PAIR_MATCH_SAMPLE_MAX && (isDiv || matchSamples.length < 6)) {
        matchSamples.push({
          aId: a.villagerId,
          bId: b.villagerId,
          traitDist: Math.round(td * 1000) / 1000,
          contextDist: Math.round(cd * 1000) / 1000,
          histDist: Math.round(hd * 1000) / 1000,
          modeA,
          modeB,
          divergent: isDiv,
          totalA: a.total,
          totalB: b.total,
        })
      }
    }
  }
  c.personalityPairReady = ready
  c.personalityPairDivergent = divergent
  c.personalityPairMatchSamples = matchSamples
}

/** Legacy: same-kind + trait-distant pairs in attribution ring (no behavior proof). */
export function countPairReady(samples: PersonalityPairSample[]): number {
  return countPairReadyLegacy(samples)
}

function countPairReadyLegacy(samples: PersonalityPairSample[]): number {
  let pairs = 0
  const n = samples.length
  for (let i = 0; i < n; i++) {
    const a = samples[i]!
    for (let j = i + 1; j < n; j++) {
      const b = samples[j]!
      if (a.villagerId === b.villagerId) continue
      if (a.kind !== b.kind) continue
      const dist =
        Math.abs(a.courage - b.courage) +
        Math.abs(a.sociability - b.sociability) +
        Math.abs(a.generosity - b.generosity) +
        Math.abs(a.curiosity - b.curiosity) +
        Math.abs(a.ambition - b.ambition)
      if (dist > 0.35) pairs += 1
    }
  }
  return pairs
}

/**
 * DP3 natural path: record every soft chosen action into per-NPC histograms.
 * Does NOT rewrite personalities — only observes natural trait variance.
 */
export function notePersonalityBehavior(
  state: SimState,
  sample: {
    villagerId: number
    courage: number
    sociability: number
    generosity: number
    curiosity: number
    ambition: number
    kind: string
    hungerN: number
    fatigueN: number
    foodN: number
  },
): void {
  const c = ensureAttributionCounters(state)
  if (!c._behaviorTracks) c._behaviorTracks = new Map()
  const tracks = c._behaviorTracks
  let t = tracks.get(sample.villagerId)
  if (!t) {
    t = {
      villagerId: sample.villagerId,
      courage: sample.courage,
      sociability: sample.sociability,
      generosity: sample.generosity,
      curiosity: sample.curiosity,
      ambition: sample.ambition,
      kindCounts: {},
      total: 0,
      hungerSum: 0,
      fatigueSum: 0,
      foodSum: 0,
      lastTick: state.tick,
      lastDay: Math.floor(state.tick / TICKS_PER_DAY),
    }
    tracks.set(sample.villagerId, t)
    while (tracks.size > BEHAVIOR_TRACK_MAX) {
      // Drop oldest by lastTick.
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
  t.courage = sample.courage
  t.sociability = sample.sociability
  t.generosity = sample.generosity
  t.curiosity = sample.curiosity
  t.ambition = sample.ambition
  t.kindCounts[sample.kind] = (t.kindCounts[sample.kind] ?? 0) + 1
  t.total += 1
  t.hungerSum += sample.hungerN
  t.fatigueSum += sample.fatigueN
  t.foodSum += sample.foodN
  t.lastTick = state.tick
  t.lastDay = Math.floor(state.tick / TICKS_PER_DAY)
  // Recount periodically to keep counters fresh without O(n^2) every tick.
  if (t.total % 3 === 0 || tracks.size < 12) recountPersonalityPairs(c)
}

/** Encoding path — memorable events toward floor >=50. */
export function noteMemorableEvent(state: SimState): void {
  const c = ensureAttributionCounters(state)
  c.memoryMemorableEvents += 1
}

/** Emotion state mutation path — changes toward floor >=50. */
export function noteEmotionChange(state: SimState): void {
  const c = ensureAttributionCounters(state)
  c.emotionChanges += 1
}

export type MemoryCfRecord = {
  villagerId: number
  beforeKind: string
  afterKind: string
  utilBefore: number
  utilAfter: number
  runnerUpKind: string | null
  runnerUpUtilBefore: number | null
  spotKind: 'danger' | 'good' | 'mixed' | null
  retrieved: boolean
  material: boolean
  flipped: boolean
}

/**
 * DP1: record one soft-policy memory counterfactual measurement.
 * Pass gates must use memoryCausalFlips — not memoryAttributed*.
 */
export function noteMemoryCounterfactual(state: SimState, rec: MemoryCfRecord): void {
  const c = ensureAttributionCounters(state)
  if (rec.retrieved) c.memoryRetrievals += 1
  if (rec.material) c.memoryUses += 1
  if (rec.flipped) c.memoryCausalFlips += 1
  else if (rec.material) c.memoryMaterialNoFlip += 1

  const keep =
    rec.flipped ||
    (rec.material && c.memoryCausalSamples.length < 8) ||
    (c.memoryCausalFlips + c.memoryMaterialNoFlip) % 17 === 0
  if (!keep) return
  if (c.memoryCausalSamples.length >= MEMORY_CF_RING_MAX && !rec.flipped) return

  c.memoryCausalSamples.push({
    tick: state.tick,
    day: Math.floor(state.tick / TICKS_PER_DAY),
    villagerId: rec.villagerId,
    beforeKind: rec.beforeKind,
    afterKind: rec.afterKind,
    utilBefore: rec.utilBefore,
    utilAfter: rec.utilAfter,
    runnerUpKind: rec.runnerUpKind,
    runnerUpUtilBefore: rec.runnerUpUtilBefore,
    spotKind: rec.spotKind,
    flipped: rec.flipped,
  })
  while (c.memoryCausalSamples.length > MEMORY_CF_RING_MAX) {
    const i = c.memoryCausalSamples.findIndex((s) => !s.flipped)
    if (i >= 0) c.memoryCausalSamples.splice(i, 1)
    else c.memoryCausalSamples.shift()
  }
}

export type EmotionCfRecord = {
  villagerId: number
  beforeKind: string
  afterKind: string
  utilBefore: number
  utilAfter: number
  runnerUpKind: string | null
  runnerUpUtilBefore: number | null
  material: boolean
  flipped: boolean
}

/**
 * DP2: record one soft-policy emotion counterfactual measurement.
 * Pass gates must use emotionCausalFlips — not emotionAttributed*.
 */
export function noteEmotionCounterfactual(state: SimState, rec: EmotionCfRecord): void {
  const c = ensureAttributionCounters(state)
  if (rec.material) c.emotionUses += 1
  if (rec.flipped) c.emotionCausalFlips += 1
  else if (rec.material) c.emotionMaterialNoFlip += 1

  const keep =
    rec.flipped ||
    (rec.material && c.emotionCausalSamples.length < 8) ||
    (c.emotionCausalFlips + c.emotionMaterialNoFlip) % 17 === 0
  if (!keep) return
  if (c.emotionCausalSamples.length >= EMOTION_CF_RING_MAX && !rec.flipped) return

  c.emotionCausalSamples.push({
    tick: state.tick,
    day: Math.floor(state.tick / TICKS_PER_DAY),
    villagerId: rec.villagerId,
    beforeKind: rec.beforeKind,
    afterKind: rec.afterKind,
    utilBefore: rec.utilBefore,
    utilAfter: rec.utilAfter,
    runnerUpKind: rec.runnerUpKind,
    runnerUpUtilBefore: rec.runnerUpUtilBefore,
    flipped: rec.flipped,
  })
  while (c.emotionCausalSamples.length > EMOTION_CF_RING_MAX) {
    const i = c.emotionCausalSamples.findIndex((s) => !s.flipped)
    if (i >= 0) c.emotionCausalSamples.splice(i, 1)
    else c.emotionCausalSamples.shift()
  }
}

export type PersonalityCfRecord = {
  villagerId: number
  beforeKind: string
  afterKind: string
  utilBefore: number
  utilAfter: number
  runnerUpKind: string | null
  runnerUpUtilBefore: number | null
  material: boolean
  flipped: boolean
}

/**
 * DP3: record one soft-policy personality counterfactual measurement.
 * Pass gates must use personalityCausalFlips / pairDivergent — not personalityAttributed*.
 */
export function notePersonalityCounterfactual(state: SimState, rec: PersonalityCfRecord): void {
  const c = ensureAttributionCounters(state)
  if (rec.material) c.personalityUses += 1
  if (rec.flipped) c.personalityCausalFlips += 1
  else if (rec.material) c.personalityMaterialNoFlip += 1

  const keep =
    rec.flipped ||
    (rec.material && c.personalityCausalSamples.length < 8) ||
    (c.personalityCausalFlips + c.personalityMaterialNoFlip) % 17 === 0
  if (!keep) return
  if (c.personalityCausalSamples.length >= PERSONALITY_CF_RING_MAX && !rec.flipped) return

  c.personalityCausalSamples.push({
    tick: state.tick,
    day: Math.floor(state.tick / TICKS_PER_DAY),
    villagerId: rec.villagerId,
    beforeKind: rec.beforeKind,
    afterKind: rec.afterKind,
    utilBefore: rec.utilBefore,
    utilAfter: rec.utilAfter,
    runnerUpKind: rec.runnerUpKind,
    runnerUpUtilBefore: rec.runnerUpUtilBefore,
    flipped: rec.flipped,
  })
  while (c.personalityCausalSamples.length > PERSONALITY_CF_RING_MAX) {
    const i = c.personalityCausalSamples.findIndex((s) => !s.flipped)
    if (i >= 0) c.personalityCausalSamples.splice(i, 1)
    else c.personalityCausalSamples.shift()
  }
}

export type FamilyCfRecord = {
  villagerId: number
  beforeKind: string
  afterKind: string
  utilBefore: number
  utilAfter: number
  runnerUpKind: string | null
  runnerUpUtilBefore: number | null
  kinship: number
  familyValue: number
  material: boolean
  flipped: boolean
}

/**
 * P6 M6.1: record soft-policy family counterfactual (kinship / values.family ablated).
 * Pass gates must use familyCausalFlips — not familyDecisionUses alone.
 */
export function noteFamilyCounterfactual(state: SimState, rec: FamilyCfRecord): void {
  const c = ensureAttributionCounters(state)
  if (rec.material) {
    c.familyUses += 1
    if (!c._familyNpcIds) c._familyNpcIds = new Set()
    c._familyNpcIds.add(rec.villagerId)
  }
  if (rec.flipped) c.familyCausalFlips += 1
  else if (rec.material) c.familyMaterialNoFlip += 1

  const keep =
    rec.flipped ||
    (rec.material && c.familyCausalSamples.length < 8) ||
    (c.familyCausalFlips + c.familyMaterialNoFlip) % 17 === 0
  if (!keep) return
  if (c.familyCausalSamples.length >= FAMILY_CF_RING_MAX && !rec.flipped) return

  c.familyCausalSamples.push({
    tick: state.tick,
    day: Math.floor(state.tick / TICKS_PER_DAY),
    villagerId: rec.villagerId,
    beforeKind: rec.beforeKind,
    afterKind: rec.afterKind,
    utilBefore: rec.utilBefore,
    utilAfter: rec.utilAfter,
    runnerUpKind: rec.runnerUpKind,
    runnerUpUtilBefore: rec.runnerUpUtilBefore,
    kinship: rec.kinship,
    familyValue: rec.familyValue,
    flipped: rec.flipped,
  })
  while (c.familyCausalSamples.length > FAMILY_CF_RING_MAX) {
    const i = c.familyCausalSamples.findIndex((s) => !s.flipped)
    if (i >= 0) c.familyCausalSamples.splice(i, 1)
    else c.familyCausalSamples.shift()
  }
}

export type RelationCfRecord = {
  villagerId: number
  beforeKind: string
  afterKind: string
  utilBefore: number
  utilAfter: number
  runnerUpKind: string | null
  runnerUpUtilBefore: number | null
  affinity: number
  trust: number
  kinship: number
  material: boolean
  flipped: boolean
  helpMenu: boolean
}

/**
 * P6 M5.1: relation affinity/trust/kin ablate on help menu → argmax flip.
 * Pass gates must use relationCausalFlips — not helpEvents volume alone.
 */
export function noteRelationCounterfactual(state: SimState, rec: RelationCfRecord): void {
  const c = ensureAttributionCounters(state)
  if (rec.material) {
    c.relationUses += 1
    if (!c._relationNpcIds) c._relationNpcIds = new Set()
    c._relationNpcIds.add(rec.villagerId)
  }
  if (rec.flipped) c.relationCausalFlips += 1
  else if (rec.material) c.relationMaterialNoFlip += 1

  const keep =
    rec.flipped ||
    (rec.material && c.relationCausalSamples.length < 8) ||
    (c.relationCausalFlips + c.relationMaterialNoFlip) % 17 === 0
  if (!keep) return
  if (c.relationCausalSamples.length >= RELATION_CF_RING_MAX && !rec.flipped) return

  c.relationCausalSamples.push({
    tick: state.tick,
    day: Math.floor(state.tick / TICKS_PER_DAY),
    villagerId: rec.villagerId,
    beforeKind: rec.beforeKind,
    afterKind: rec.afterKind,
    utilBefore: rec.utilBefore,
    utilAfter: rec.utilAfter,
    runnerUpKind: rec.runnerUpKind,
    runnerUpUtilBefore: rec.runnerUpUtilBefore,
    affinity: rec.affinity,
    trust: rec.trust,
    kinship: rec.kinship,
    flipped: rec.flipped,
    helpMenu: rec.helpMenu,
  })
  while (c.relationCausalSamples.length > RELATION_CF_RING_MAX) {
    const i = c.relationCausalSamples.findIndex((s) => !s.flipped)
    if (i >= 0) c.relationCausalSamples.splice(i, 1)
    else c.relationCausalSamples.shift()
  }
}

const PROFESSION_SAMPLE_MAX = 48

export function noteProfessionChange(
  state: SimState,
  rec: {
    villagerId: number
    prev: string
    next: string
    factors: Array<{ name: string; delta: number }>
    foodNeed?: number
    source?: string
  },
): void {
  const c = ensureAttributionCounters(state)
  c.professionChanges += 1
  const multi = rec.factors.length >= 2
  if (multi) c.professionChangesMultiFactor += 1
  const sample: ProfessionFactorSample = {
    tick: state.tick,
    day: Math.floor(state.tick / TICKS_PER_DAY),
    villagerId: rec.villagerId,
    prev: rec.prev,
    next: rec.next,
    factors: rec.factors.slice(0, 6).map((f) => ({ name: f.name, delta: Math.round(f.delta * 100) / 100 })),
    multiFactor: multi,
    foodNeed: rec.foodNeed ?? 0,
    source: rec.source,
  }
  if (!c.professionFactorSamples) c.professionFactorSamples = []
  c.professionFactorSamples.push(sample)
  while (c.professionFactorSamples.length > PROFESSION_SAMPLE_MAX) c.professionFactorSamples.shift()
}

export type AttributionSnapshot = {
  memoryAttributedDecisions: number
  memoryAttributedNpcs: number
  emotionAttributedDecisions: number
  emotionAttributedNpcs: number
  personalityAttributedDecisions: number
  personalityAttributedNpcs: number
  personalityPairSamples: number
  personalityPairReady: number
  personalityPairDivergent: number
  memoryMemorableEvents: number
  memoryRetrievals: number
  memoryUses: number
  memoryCausalFlips: number
  memoryMaterialNoFlip: number
  memoryCausalSamples: MemoryCausalSample[]
  emotionChanges: number
  emotionUses: number
  emotionCausalFlips: number
  emotionMaterialNoFlip: number
  emotionCausalSamples: EmotionCausalSample[]
  personalityUses: number
  personalityCausalFlips: number
  personalityMaterialNoFlip: number
  personalityCausalSamples: PersonalityCausalSample[]
  personalityPairMatchSamples: PersonalityPairMatchSample[]
  familyUses: number
  familyCausalFlips: number
  familyMaterialNoFlip: number
  familyCausalSamples: FamilyCausalSample[]
  familyAttributedNpcs: number
  relationUses: number
  relationCausalFlips: number
  relationMaterialNoFlip: number
  relationCausalSamples: RelationCausalSample[]
  relationAttributedNpcs: number
  professionChanges: number
  professionChangesMultiFactor: number
  professionExplainableShare: number
  professionFactorSamples: ProfessionFactorSample[]
  floors: {
    memorable: { value: number; floor: number; ok: boolean }
    retrievals: { value: number; floor: number; ok: boolean }
    uses: { value: number; floor: number; ok: boolean }
    causalFlips: { value: number; floor: number; ok: boolean }
    emotionChanges: { value: number; floor: number; ok: boolean }
    emotionUses: { value: number; floor: number; ok: boolean }
    emotionCausalFlips: { value: number; floor: number; ok: boolean }
    personalityUses: { value: number; floor: number; ok: boolean }
    personalityCausalFlips: { value: number; floor: number; ok: boolean }
    personalityPairReady: { value: number; floor: number; ok: boolean }
    personalityDivergentRatio: {
      value: number
      floor: number
      ok: boolean
      ready: number
      divergent: number
    }
    professionMultiFactorShare: {
      value: number
      floor: number
      ok: boolean
      changes: number
      multi: number
    }
  }
  status: 'NOT_TESTED' | 'PARTIAL' | 'WIRED'
}

export function snapshotAttribution(state: SimState): AttributionSnapshot {
  const c = ensureAttributionCounters(state)
  recountPersonalityPairs(c)
  const ready = c.personalityPairReady
  const divergent = c.personalityPairDivergent
  const divRatio = ready > 0 ? divergent / ready : 0
  const floors = {
    memorable: {
      value: c.memoryMemorableEvents,
      floor: MEMORY_FLOOR_MEMORABLE,
      ok: c.memoryMemorableEvents >= MEMORY_FLOOR_MEMORABLE,
    },
    retrievals: {
      value: c.memoryRetrievals,
      floor: MEMORY_FLOOR_RETRIEVALS,
      ok: c.memoryRetrievals >= MEMORY_FLOOR_RETRIEVALS,
    },
    uses: {
      value: c.memoryUses,
      floor: MEMORY_FLOOR_USES,
      ok: c.memoryUses >= MEMORY_FLOOR_USES,
    },
    causalFlips: {
      value: c.memoryCausalFlips,
      floor: MEMORY_FLOOR_CAUSAL_FLIPS,
      ok: c.memoryCausalFlips >= MEMORY_FLOOR_CAUSAL_FLIPS,
    },
    emotionChanges: {
      value: c.emotionChanges,
      floor: EMOTION_FLOOR_CHANGES,
      ok: c.emotionChanges >= EMOTION_FLOOR_CHANGES,
    },
    emotionUses: {
      value: c.emotionUses,
      floor: EMOTION_FLOOR_USES,
      ok: c.emotionUses >= EMOTION_FLOOR_USES,
    },
    emotionCausalFlips: {
      value: c.emotionCausalFlips,
      floor: EMOTION_FLOOR_CAUSAL_FLIPS,
      ok: c.emotionCausalFlips >= EMOTION_FLOOR_CAUSAL_FLIPS,
    },
    personalityUses: {
      value: c.personalityUses,
      floor: PERSONALITY_FLOOR_USES,
      ok: c.personalityUses >= PERSONALITY_FLOOR_USES,
    },
    personalityCausalFlips: {
      value: c.personalityCausalFlips,
      floor: PERSONALITY_FLOOR_CAUSAL_FLIPS,
      ok: c.personalityCausalFlips >= PERSONALITY_FLOOR_CAUSAL_FLIPS,
    },
    personalityPairReady: {
      value: ready,
      floor: PERSONALITY_FLOOR_PAIR_READY,
      ok: ready >= PERSONALITY_FLOOR_PAIR_READY,
    },
    personalityDivergentRatio: {
      value: Math.round(divRatio * 1000) / 1000,
      floor: PERSONALITY_TARGET_DIVERGENT_RATIO,
      ok: ready > 0 && divRatio >= PERSONALITY_TARGET_DIVERGENT_RATIO,
      ready,
      divergent,
    },
    professionMultiFactorShare: {
      value: c.professionChanges > 0 ? Math.round((c.professionChangesMultiFactor / c.professionChanges) * 1000) / 1000 : 0,
      floor: PROFESSION_MULTIFACTOR_TARGET_SHARE,
      ok: c.professionChanges > 0 && c.professionChangesMultiFactor / c.professionChanges >= PROFESSION_MULTIFACTOR_TARGET_SHARE,
      changes: c.professionChanges,
      multi: c.professionChangesMultiFactor,
    },
  }
  const anyAttr =
    c.memoryAttributedDecisions + c.emotionAttributedDecisions + c.personalityAttributedDecisions > 0
  const status: AttributionSnapshot['status'] =
    c.memoryCausalFlips > 0 ||
    c.emotionCausalFlips > 0 ||
    c.personalityCausalFlips > 0 ||
    c.familyCausalFlips > 0 ||
    c.relationCausalFlips > 0 ||
    c.personalityPairDivergent > 0 ||
    c.professionChanges > 0
      ? 'WIRED'
      : anyAttr ||
          c.memoryUses > 0 ||
          c.emotionUses > 0 ||
          c.personalityUses > 0 ||
          c.familyUses > 0 ||
          c.relationUses > 0 ||
          ready > 0 ||
          c.professionChanges > 0
        ? 'PARTIAL'
        : 'NOT_TESTED'
  return {
    memoryAttributedDecisions: c.memoryAttributedDecisions,
    memoryAttributedNpcs: c.memoryAttributedNpcs,
    emotionAttributedDecisions: c.emotionAttributedDecisions,
    emotionAttributedNpcs: c.emotionAttributedNpcs,
    personalityAttributedDecisions: c.personalityAttributedDecisions,
    personalityAttributedNpcs: c.personalityAttributedNpcs,
    personalityPairSamples: c.personalityPairSamples,
    personalityPairReady: c.personalityPairReady,
    personalityPairDivergent: c.personalityPairDivergent,
    memoryMemorableEvents: c.memoryMemorableEvents,
    memoryRetrievals: c.memoryRetrievals,
    memoryUses: c.memoryUses,
    memoryCausalFlips: c.memoryCausalFlips,
    memoryMaterialNoFlip: c.memoryMaterialNoFlip,
    memoryCausalSamples: c.memoryCausalSamples.slice(),
    emotionChanges: c.emotionChanges,
    emotionUses: c.emotionUses,
    emotionCausalFlips: c.emotionCausalFlips,
    emotionMaterialNoFlip: c.emotionMaterialNoFlip,
    emotionCausalSamples: c.emotionCausalSamples.slice(),
    personalityUses: c.personalityUses,
    personalityCausalFlips: c.personalityCausalFlips,
    personalityMaterialNoFlip: c.personalityMaterialNoFlip,
    personalityCausalSamples: c.personalityCausalSamples.slice(),
    personalityPairMatchSamples: c.personalityPairMatchSamples.slice(),
    familyUses: c.familyUses,
    familyCausalFlips: c.familyCausalFlips,
    familyMaterialNoFlip: c.familyMaterialNoFlip,
    familyCausalSamples: c.familyCausalSamples.slice(),
    familyAttributedNpcs: c._familyNpcIds?.size ?? 0,
    relationUses: c.relationUses,
    relationCausalFlips: c.relationCausalFlips,
    relationMaterialNoFlip: c.relationMaterialNoFlip,
    relationCausalSamples: c.relationCausalSamples.slice(),
    relationAttributedNpcs: c._relationNpcIds?.size ?? 0,
    professionChanges: c.professionChanges,
    professionChangesMultiFactor: c.professionChangesMultiFactor,
    professionExplainableShare: c.professionChanges > 0 ? c.professionChangesMultiFactor / c.professionChanges : 0,
    professionFactorSamples: (c.professionFactorSamples ?? []).slice(),
    floors,
    status,
  }
}

let bound: SimState | null = null

export function bindAttributionMetrics(state: SimState): void {
  bound = state
  ensureAttributionCounters(state)
}

export function unbindAttributionMetrics(): void {
  bound = null
}

export function noteAttributedDecisionBound(
  villagerId: number,
  flags: AttributionFlags,
  sample?: Omit<PersonalityPairSample, 'tick' | 'day'> & { kind: TaskKind | string },
): void {
  if (!bound) return
  noteAttributedDecision(bound, villagerId, flags, sample)
}

export function noteMemorableEventBound(): void {
  if (!bound) return
  noteMemorableEvent(bound)
}

export function noteEmotionChangeBound(): void {
  if (!bound) return
  noteEmotionChange(bound)
}

export function noteMemoryCounterfactualBound(rec: MemoryCfRecord): void {
  if (!bound) return
  noteMemoryCounterfactual(bound, rec)
}

export function noteEmotionCounterfactualBound(rec: EmotionCfRecord): void {
  if (!bound) return
  noteEmotionCounterfactual(bound, rec)
}

export function notePersonalityCounterfactualBound(rec: PersonalityCfRecord): void {
  if (!bound) return
  notePersonalityCounterfactual(bound, rec)
}

export function noteFamilyCounterfactualBound(rec: FamilyCfRecord): void {
  if (!bound) return
  noteFamilyCounterfactual(bound, rec)
}

export function noteRelationCounterfactualBound(rec: RelationCfRecord): void {
  if (!bound) return
  noteRelationCounterfactual(bound, rec)
}

export function notePersonalityBehaviorBound(sample: {
  villagerId: number
  courage: number
  sociability: number
  generosity: number
  curiosity: number
  ambition: number
  kind: string
  hungerN: number
  fatigueN: number
  foodN: number
}): void {
  if (!bound) return
  notePersonalityBehavior(bound, sample)
}
