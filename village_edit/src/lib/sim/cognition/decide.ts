/**
 * Decision core: factor-matrix utility (w·f) + Boltzmann / softmax selection.
 * Debuggable — top factors feed Cognition « pourquoi ». No LLM / neural net.
 */

import type { SimState, TaskKind, Villager } from '../types'
import { politicalTaskBias } from '../politics'
import { emotionTaskBias } from './emotions'
import { executiveInhibit } from './executive'
import { goalTaskModifier } from './goals'
import { preferenceTaskBias } from './labor'
import { skillBonus } from './memory'
import { peWeight } from './predictive'
import { selfModelTaskBias } from './selfModel'
import { habitTaskBias, cultureTaskBias, religionTaskBias, warTaskBias } from './stubs'
import { burrowTaskMultiplier, cautionFactor, isChild } from './tactics'
import { tomActionBias } from './tom'
import { concernBias } from './workingMemory'
import { workspaceBias } from './workspace'
import { consciousAccessBias } from './consciousness'
import { knownSpots } from './memory'
import { cultureSimilarity, homophilyBias } from '../ethnos'
import { mindOf } from './mindPool'
import type { CognitiveState } from './types'
import { distance } from '../world'
import { batchSoftmaxSelect } from '../kernels/brainGpu'

/** Named decision factors — order fixed for SoA / GPU packing. */
export const FACTOR_IDS = [
  'besoins',
  'valeurs_plan',
  'emotions',
  'stress_habitude',
  'prefs_savoir',
  'social_tom',
  'politique',
  'metier_ambition',
  'lieu_memoire',
] as const

export type FactorId = (typeof FACTOR_IDS)[number]

export const FACTOR_COUNT = FACTOR_IDS.length

const FACTOR_LABEL_FR: Record<FactorId, string> = {
  besoins: 'besoins',
  valeurs_plan: 'valeurs / plan',
  emotions: 'émotions',
  stress_habitude: 'stress → habitude',
  prefs_savoir: 'goûts / savoir-faire',
  social_tom: 'social / théorie de l’esprit',
  politique: 'politique / normes',
  metier_ambition: 'métier / ambition',
  lieu_memoire: 'lieu / mémoire',
}

export type FactorBreakdown = {
  /** Multipliers per factor (≈1 = neutral). */
  mults: Float32Array
  /** log(mult) contributions for w·f style debug. */
  logs: Float32Array
  /** Final utility = base × Π mults. */
  utility: number
  base: number
}

export type ScoredOption = {
  kind: TaskKind
  x: number
  y: number
  id: number | null
  resource: string | null
  utility: number
  factors: FactorBreakdown
}

export type SoftmaxPick = {
  index: number
  temperature: number
  /** Top factor contributions for the chosen option (French debug lines). */
  whyFactors: string[]
  utility: number
  /** Softmax backend used. */
  backend: 'cpu' | 'webgpu'
}

function logSafe(m: number): number {
  return Math.log(Math.max(1e-4, m))
}

/** Hot-path scratch — filled by fillFactorProduct; not retained across calls. */
const SCRATCH_MULTS = new Float32Array(FACTOR_COUNT)
const SCRATCH_LOGS = new Float32Array(FACTOR_COUNT)
let utilScratch = new Float32Array(64)

function ensureUtilScratch(n: number): Float32Array {
  if (utilScratch.length < n) {
    let cap = utilScratch.length
    while (cap < n) cap *= 2
    utilScratch = new Float32Array(cap)
  }
  return utilScratch
}

/** Fill SCRATCH_* and return Π mults (no heap). */
function fillFactorProduct(
  state: SimState,
  v: Villager,
  kind: TaskKind,
  x: number,
  y: number,
  targetId: number | null,
  jobMult: number,
  ambitionMult: number,
): number {
  const mind = mindOf(v)
  const mults = SCRATCH_MULTS
  mults[0] = needsFactor(mind, kind)
  mults[1] = valuesPlanFactor(mind, kind, targetId)
  mults[2] = emotionsFactor(mind, kind)
  mults[3] = stressHabitFactor(mind, kind)
  mults[4] = prefsSkillFactor(mind, kind)
  mults[5] = socialTomFactor(state, v, mind, kind, targetId)
  mults[6] = politicalFactor(state, v, kind, targetId)
  mults[7] = Math.max(0.05, jobMult) * Math.max(0.05, ambitionMult)
  mults[8] = placeMemoryFactor(state, v, mind, kind, x, y)
  let product = 1
  for (let i = 0; i < FACTOR_COUNT; i++) {
    const m = Math.max(0.02, mults[i])
    mults[i] = m
    SCRATCH_LOGS[i] = logSafe(m)
    product *= m
  }
  return product
}

/** Temperature from stress + personality — high stress → noisier (more habit-like thrash). S1 raises T. */
export function decisionTemperature(mind: CognitiveState, courage: number): number {
  const stress = mind.emotions.stress
  const fear = mind.emotions.fear
  const s1 = mind.processMode === 'S1' ? 0.35 : 0
  // Low T → near-greedy; high T → exploratory / chaotic under stress / S1.
  const t = 0.55 + stress * 1.35 + fear * 0.45 - courage * 0.25 + s1
  return Math.max(0.22, Math.min(2.8, t))
}

/**
 * Need alignment: how well this task addresses current need pressures.
 * Returns multiplier centered on 1.
 */
function needsFactor(mind: CognitiveState, kind: TaskKind): number {
  const n = mind.needs
  const pe = mind.predictionErrors
  let m = 1
  if (kind === 'eat' || kind === 'gatherFood' || kind === 'fish' || kind === 'harvestWheat' || kind === 'takeFromChest') {
    m *=
      1 +
      n.hunger * 1.1 +
      concernBias(mind.working, 'need_food') * 0.18 +
      workspaceBias(mind.broadcast, 'need_food') * 0.45 +
      consciousAccessBias(mind, 'need_food') * 0.75 +
      peWeight(pe, 'hunger') * 0.35
  }
  if (kind === 'rest') {
    m *=
      1 +
      n.fatigue * 0.95 +
      n.shelter * 0.55 +
      concernBias(mind.working, 'need_rest') * 0.18 +
      workspaceBias(mind.broadcast, 'need_rest') * 0.4 +
      consciousAccessBias(mind, 'need_rest') * 0.7 +
      peWeight(pe, 'fatigue') * 0.3 +
      peWeight(pe, 'shelter') * 0.2
  }
  if (kind === 'flee' || kind === 'fight' || kind === 'defend' || kind === 'buildWall' || kind === 'craftSpear') {
    m *=
      1 +
      n.safety * 0.85 +
      workspaceBias(mind.broadcast, 'threat') * 0.3 +
      consciousAccessBias(mind, 'threat') * 0.65 +
      peWeight(pe, 'cold_threat') * 0.25
  }
  if (kind === 'buildHouse' || kind === 'buildBed' || kind === 'buildChest') {
    m *=
      1 +
      n.shelter * 0.9 +
      workspaceBias(mind.broadcast, 'need_shelter') * 0.35 +
      consciousAccessBias(mind, 'need_shelter') * 0.7 +
      peWeight(pe, 'shelter') * 0.3
  }
  if (kind === 'socialise' || kind === 'giveFood' || kind === 'entertain' || kind === 'counsel' || kind === 'teachCraft') {
    m *=
      1 +
      n.social * 0.55 +
      n.belonging * 0.4 +
      n.boredom * 0.12 +
      workspaceBias(mind.broadcast, 'kin') * 0.25 +
      consciousAccessBias(mind, 'kin') * 0.55 +
      peWeight(pe, 'social') * 0.2 +
      peWeight(pe, 'belonging') * 0.15
    // Micro-social must yield when survival / shelter / livelihood pressure is on.
    if (n.hunger > 0.4 || n.shelter > 0.45 || n.purpose > 0.3) m *= 0.7
  }
  if (kind === 'entertain') m *= 1 + n.boredom * 0.45 + n.status * 0.2
  if (kind === 'counsel') m *= 1 + n.piety * 0.5
  if (kind === 'teachCraft') m *= 1 + n.purpose * 0.35 + n.status * 0.15
  if (kind === 'makeCharcoal') m *= 1 + n.creative * 0.25 + n.purpose * 0.15
  if (kind === 'tradeRun' || kind === 'mintCoins' || kind === 'mineGold' || kind === 'buildProject') {
    m *=
      1 +
      n.status * 0.45 +
      n.purpose * 0.25 +
      workspaceBias(mind.broadcast, 'status') * 0.22 +
      consciousAccessBias(mind, 'status') * 0.5 +
      peWeight(pe, 'status') * 0.2
  }
  if (kind === 'idle') m *= 0.55 + n.boredom * 0.35 - n.fatigue * 0.35 - n.hunger * 0.4 - n.purpose * 0.25
  if (kind.startsWith('craft') || kind.startsWith('build') || kind === 'weaveCloth' || kind === 'sewClothing') {
    m *=
      1 +
      n.creative * 0.35 +
      n.purpose * 0.2 +
      workspaceBias(mind.broadcast, 'build') * 0.25 +
      consciousAccessBias(mind, 'build') * 0.55
  }
  return m
}

/** Values + goal/plan gate — strong prior, not cosmetic. */
function valuesPlanFactor(mind: CognitiveState, kind: TaskKind, targetId: number | null): number {
  return goalTaskModifier(mind, kind, targetId)
}

function emotionsFactor(mind: CognitiveState, kind: TaskKind): number {
  return emotionTaskBias(mind.emotions, kind)
}

/**
 * Under high stress / S1: habit-directed behavior dominates goal-directed (dual-process).
 * Returns combined stress×habit multiplier.
 */
function stressHabitFactor(mind: CognitiveState, kind: TaskKind): number {
  const stress = mind.emotions.stress
  const habit = habitTaskBias(mind, kind)
  const s1Boost = mind.processMode === 'S1' ? 0.25 : 0
  // Stress / S1 amplifies habits, suppresses off-habit goal novelty.
  if (stress < 0.35 && mind.processMode === 'S2') return habit
  const habitPull = mind.habits[kind] ?? 0
  const amplify = 1 + (stress + s1Boost) * 0.9 * habitPull
  const offHabit = habitPull < 0.12 ? 1 - (stress + s1Boost) * 0.28 : 1
  return habit * amplify * offHabit
}

function prefsSkillFactor(mind: CognitiveState, kind: TaskKind): number {
  return (
    preferenceTaskBias(mind.preferences, kind) *
    skillBonus(mind.skills, kind) *
    cultureTaskBias(mind, kind) *
    selfModelTaskBias(mind, kind)
  )
}

/** Theory-of-mind lite + social impressions. */
function socialTomFactor(
  state: SimState,
  v: Villager,
  mind: CognitiveState,
  kind: TaskKind,
  targetId: number | null,
): number {
  let m = 1
  if (targetId === null) {
    if (kind === 'socialise') m *= 1 + mind.needs.social * 0.35
    return m
  }
  const imp = mind.socialModel.find((s) => s.id === targetId)
  const rel = v.relations.get(targetId)
  m *= tomActionBias(imp, kind)
  if (kind === 'socialise') {
    if (imp) m *= 1 + imp.affection * 0.2 + imp.trust * 0.15 - imp.fear * 0.25
    if (rel) m *= 1 + (rel.respect ?? 0) * 0.25 + Math.max(0, rel.affinity) * 0.2 + (rel.kinship ?? 0) * 0.2
    const other = state.villagers.find((o) => o.id === targetId)
    if (other) {
      const om = mindOf(other)
      m *= homophilyBias(cultureSimilarity(mind.cultureFeatures, om.cultureFeatures), 'socialise')
    }
  }
  if (kind === 'giveFood') {
    if (imp) m *= 1 + imp.affection * 0.2 + imp.trust * 0.15
    if (rel) m *= 1 + (rel.kinship ?? 0) * 0.3 + (rel.debt ?? 0) * 0.15
    m *= 1 + mind.values.family * 0.25 + mind.emotions.affection * 0.2
  }
  if (kind === 'confront' || kind === 'steal') {
    if (imp) m *= 1 + (1 - imp.trust) * 0.25 + imp.fear * 0.1 + mind.emotions.anger * 0.2
    if (rel) m *= 1 + (rel.grudge ?? 0) * 0.35
  }
  if (kind === 'defend' && rel) {
    m *= 1 + Math.max(0, rel.affinity) * 0.3 + (rel.kinship ?? 0) * 0.25
  }
  m *= warTaskBias(mind, kind, targetId)
  return m
}

function politicalFactor(state: SimState, v: Villager, kind: TaskKind, targetId: number | null): number {
  // Norms + executive inhibition (PFC-like) — stress can overwhelm control.
  return politicalTaskBias(state, v, kind, targetId) * executiveInhibit(v, mindOf(v), kind)
}

function placeMemoryFactor(
  state: SimState,
  v: Villager,
  mind: CognitiveState,
  kind: TaskKind,
  x: number,
  y: number,
): number {
  let m = burrowTaskMultiplier(state, v, mind, kind, x, y)
  m *= religionTaskBias(mind, kind, x, y)
  const d = distance(v.x, v.y, x, y)
  if (d > 40) m *= 0.88 - v.personality.courage * 0.06
  if (isChild(v) && d > 28) m *= 0.72
  const caution = cautionFactor(v)
  for (const spot of knownSpots(mind.semantic, mind.episodic, v.memories, 'danger')) {
    if (distance(x, y, spot.x, spot.y) > 14 * caution) continue
    m *= 1 - Math.min(0.78, spot.weight * 0.3 * caution * (1.05 - v.personality.courage * 0.5))
  }
  for (const spot of knownSpots(mind.semantic, mind.episodic, v.memories, 'good')) {
    if (distance(x, y, spot.x, spot.y) > 14) continue
    if (kind === 'gatherFood' || kind === 'gatherWood' || kind === 'fish' || kind === 'clearLand') {
      m *= 1 + Math.min(0.48, spot.weight * 0.22 * (0.5 + v.personality.curiosity))
    }
  }
  const i = y * state.grid.width + x
  const traffic = state.grid.traffic[i] ?? 0
  if (kind === 'buildBridge' || kind === 'buildPort' || kind === 'tradeRun') m *= 1 + Math.min(1.2, traffic * 0.04)
  return m
}

/**
 * Build factor vector and utility U = base × Π mult_k  (equiv. exp(w·log f) with w=1).
 * jobMult / ambitionMult passed from behaviors to avoid circular imports.
 */
export function scoreWithFactors(
  state: SimState,
  v: Villager,
  kind: TaskKind,
  x: number,
  y: number,
  targetId: number | null,
  baseScore: number,
  jobMult: number,
  ambitionMult: number,
): FactorBreakdown {
  const product = fillFactorProduct(state, v, kind, x, y, targetId, jobMult, ambitionMult)
  const mults = new Float32Array(FACTOR_COUNT)
  const logs = new Float32Array(FACTOR_COUNT)
  mults.set(SCRATCH_MULTS)
  logs.set(SCRATCH_LOGS)
  const base = Math.max(0, baseScore)
  return { mults, logs, utility: base * product, base }
}

/** French lines: top |log contrib| factors for debug « pourquoi ». */
export function topFactorWhy(breakdown: FactorBreakdown, max = 4): string[] {
  const scored: { id: FactorId; log: number; mult: number }[] = []
  for (let i = 0; i < FACTOR_COUNT; i++) {
    scored.push({ id: FACTOR_IDS[i], log: breakdown.logs[i], mult: breakdown.mults[i] })
  }
  scored.sort((a, b) => Math.abs(b.log) - Math.abs(a.log))
  const lines: string[] = []
  for (let i = 0; i < Math.min(max, scored.length); i++) {
    const s = scored[i]
    if (Math.abs(s.log) < 0.04 && Math.abs(s.mult - 1) < 0.08) continue
    const pct = Math.round((s.mult - 1) * 100)
    const sign = pct >= 0 ? '+' : ''
    lines.push(`${FACTOR_LABEL_FR[s.id]} ${sign}${pct}%`)
  }
  return lines
}

/**
 * Softmax / Boltzmann pick over utilities.
 * CPU path (WebGPU probe exists for future kernels — never falsely claimed here).
 */
export function softmaxPick(
  utilities: Float32Array,
  temperature: number,
  rng: () => number,
): { index: number; backend: 'cpu' | 'webgpu' } {
  const n = utilities.length
  if (n === 0) return { index: -1, backend: 'cpu' }
  if (n === 1) return { index: 0, backend: 'cpu' }
  const result = batchSoftmaxSelect(utilities, temperature, rng)
  return { index: result.index, backend: result.backend }
}

/** End-to-end: score options with factors, softmax select, return debug why. */
export function pickTaskByPolicy(
  state: SimState,
  v: Villager,
  options: {
    kind: TaskKind
    x: number
    y: number
    id: number | null
    resource: string | null
    baseScore: number
    jobMult: number
    ambitionMult: number
  }[],
  rng: () => number,
): SoftmaxPick | null {
  if (options.length === 0) return null
  const mind = mindOf(v)
  const utils = ensureUtilScratch(options.length)
  for (let i = 0; i < options.length; i++) {
    const o = options[i]!
    const product = fillFactorProduct(state, v, o.kind, o.x, o.y, o.id, o.jobMult, o.ambitionMult)
    utils[i] = Math.max(0, o.baseScore) * product
  }
  const T = decisionTemperature(mind, v.personality.courage)
  // Slice view so softmax sees exact length (scratch may be larger).
  const utilView = utils.subarray(0, options.length)
  const { index, backend } = softmaxPick(utilView, T, rng)
  if (index < 0) return null
  const chosen = options[index]!
  // One alloc pass for debug « pourquoi » on the selected option only.
  const breakdown = scoreWithFactors(
    state,
    v,
    chosen.kind,
    chosen.x,
    chosen.y,
    chosen.id,
    chosen.baseScore,
    chosen.jobMult,
    chosen.ambitionMult,
  )
  return {
    index,
    temperature: T,
    whyFactors: topFactorWhy(breakdown),
    utility: breakdown.utility,
    backend,
  }
}

/**
 * Legacy-compatible multiplier for callers that still need a single mult
 * (flee paths etc.) — prefers factor product without base.
 */
export function cognitiveFactorProduct(
  state: SimState,
  v: Villager,
  kind: TaskKind,
  x: number,
  y: number,
  id: number | null,
): number {
  const fb = scoreWithFactors(state, v, kind, x, y, id, 1, 1, 1)
  return fb.utility
}
