/**
 * Decision core: factor-matrix utility (w·f) + Boltzmann / softmax selection.
 * Debuggable — top factors feed Cognition « pourquoi ». No LLM / neural net.
 */

import type { SimState, TaskKind, Villager } from '../types'
import { edibleValue } from '../inventory'
import { villagerFeelsFamine } from '../ecology'
import { politicalTaskBias } from '../politics'
import { emotionTaskBias } from './emotions'
import { executiveInhibit } from './executive'
import { goalTaskModifier } from './goals'
import { preferenceTaskBias } from './labor'
import { skillBonus } from './memory'
import { estimateTaskOutcome, outcomeUtilityMult, peWeight, storePredictedOutcome } from './predictive'
import { selfModelTaskBias } from './selfModel'
import { habitTaskBias, cultureTaskBias, religionTaskBias, warTaskBias } from './stubs'
import { burrowTaskMultiplier, cautionFactor, isChild } from './tactics'
import { tomActionBias } from './tom'
import { concernBias } from './workingMemory'
import { workspaceBias } from './workspace'
import { consciousAccessBias } from './consciousness'
import { knownSpots, reinforceRecall } from './memory'
import { cultureSimilarity, homophilyBias } from '../ethnos'
import { hasKnowledge, knowledgeCount } from '../technology'
import { mindOf } from './mindPool'
import type { CognitiveState } from './types'
import { distance, isNight } from '../world'
import { batchSoftmaxSelect } from '../kernels/brainGpu'
import { noteSeqDampBound } from '../behaviorSequenceMetrics'
import { noteFamilyDecisionUse } from '../causalityMetrics'
import { isDecisionTraceEnabled, noteDecisionTrace } from './decisionTrace'
import {
  ATTRIBUTION_MATERIAL_DELTA,
  noteEmotionCounterfactualBound,
  noteFamilyCounterfactualBound,
  noteMemoryCounterfactualBound,
  notePersonalityCounterfactualBound,
  noteRelationCounterfactualBound,
} from '../attributionMetrics'

/** Shared DP1–DP3 + P6 family/relation counterfactual scaffold — wired in pickTaskByPolicy. */
export type AblationChannel = 'none' | 'memory' | 'emotion' | 'personality' | 'family' | 'relation'

export type FactorScoreOpts = {
  ablating?: AblationChannel
}

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
  metier_ambition: 'métier / intention (goal)',
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
/** CP3: material factor attribution flags for last fillFactorProduct call. */
const SCRATCH_ATTR = {
  memory: false,
  emotion: false,
  personality: false,
  family: false,
  relation: false,
}
/** Last material family sample while scoring (chosen path only notes). */
const SCRATCH_FAMILY = { kinship: 0, familyValue: 0 }
/** Last material relation sample (affinity/trust/kin) for help CF. */
const SCRATCH_RELATION = { affinity: 0, trust: 0, kinship: 0 }

const HELP_RELATION_KINDS = new Set<TaskKind>(['giveFood', 'defend', 'teachCraft', 'socialise'])
/** DP1: place-spot retrieval during last placeMemoryFactor (live pass). */
const SCRATCH_MEM = {
  retrieved: false,
  danger: false,
  good: false,
}
let utilScratch = new Float32Array(64)
let utilScratchAblated = new Float32Array(64)

function ensureUtilScratch(n: number): Float32Array {
  if (utilScratch.length < n) {
    let cap = utilScratch.length
    while (cap < n) cap *= 2
    utilScratch = new Float32Array(cap)
  }
  return utilScratch
}

function ensureUtilScratchAblated(n: number): Float32Array {
  if (utilScratchAblated.length < n) {
    let cap = utilScratchAblated.length
    while (cap < n) cap *= 2
    utilScratchAblated = new Float32Array(cap)
  }
  return utilScratchAblated
}

function argmaxUtil(utils: Float32Array, n: number): number {
  let bestI = 0
  let bestU = -Infinity
  for (let i = 0; i < n; i++) {
    const u = utils[i]!
    if (u > bestU) {
      bestU = u
      bestI = i
    }
  }
  return bestI
}

function runnerUpUtil(
  utils: Float32Array,
  n: number,
  skip: number,
): { index: number; util: number } {
  let bestI = -1
  let bestU = -Infinity
  for (let i = 0; i < n; i++) {
    if (i === skip) continue
    const u = utils[i]!
    if (u > bestU) {
      bestU = u
      bestI = i
    }
  }
  return { index: bestI, util: bestI < 0 ? 0 : bestU }
}

/** Talk / spectacle / counsel are surplus-only — hard zero under hunger or famine. Teach softer. */
function leisureBlockedBySurvival(state: SimState, v: Villager, kind: TaskKind): boolean {
  const famine = villagerFeelsFamine(state, v)
  if (kind === 'teachCraft') return famine || v.hunger < 2.05
  if (kind !== 'socialise' && kind !== 'entertain' && kind !== 'counsel' && kind !== 'ritual') {
    return false
  }
  return famine || v.hunger < 2.35
}

/**
 * Soft survival through softmax (records whyFactors).
 * HARD must-fires stay in behaviors: eat-with-food, empty-bag crisis forage, outdoor freeze/torch.
 * Mild empty-bag / chest hunger is meant to win here — not via silent setTask.
 */
function survivalUrgency(mind: CognitiveState, v: Villager, kind: TaskKind): number {
  const emptyBag = edibleValue(v.inventory) < 1
  const crisis = emptyBag && (v.hunger < 2.5 || v.starveTimer > 0)
  const mildEmpty = emptyBag && v.hunger < 3.2 && !crisis
  if (kind !== 'eat' && kind !== 'gatherFood' && kind !== 'fish' && kind !== 'harvestWheat' && kind !== 'takeFromChest' && kind !== 'sowField' && kind !== 'grindFlour' && kind !== 'bakeBread') {
    // Soft damp leisure/idle under pantry cliff so food options win without silent setTask.
    if (crisis && (kind === 'idle' || kind === 'rest' || kind === 'socialise' || kind === 'entertain')) {
      return 0.06
    }
    if (mildEmpty && (kind === 'idle' || kind === 'socialise' || kind === 'entertain')) {
      return 0.35
    }
    return 1
  }
  const h = mind.needs.hunger
  let u = 1 + h * 1.4
  if (v.starveTimer > 0) u *= 2.1
  if (v.hunger < 1.2) u *= 1.8
  else if (v.hunger < 2.0) u *= 1.35
  else if (v.hunger < 2.6) u *= 1.2
  if (emptyBag && v.hunger < 2.5) u *= 1.7
  else if (mildEmpty) u *= 1.35
  // Mild chest path (HARD only when deep hunger) — boost takeFromChest in factor space.
  if (kind === 'takeFromChest' && emptyBag && v.hunger < 2.35) u *= 1.25
  return u
}

/**
 * Soft harvest through softmax (demoted from chooseTask hard assign).
 * Own-field pressure must still beat plaza chat under pickTaskByPolicy.
 */
function harvestUrgency(v: Villager, kind: TaskKind): number {
  if (kind !== 'harvestWheat') {
    if (v.fieldX !== -1 && (kind === 'socialise' || kind === 'entertain' || kind === 'idle' || kind === 'rest')) return 0.45
    return 1
  }
  if (v.fieldX === -1) return 1.2
  let u = 3.0 + (v.hunger < 2.5 ? 0.85 : 0.25)
  if (v.starveTimer > 0 || v.hunger < 1.5) u *= 1.35
  return u
}

/**
 * Soft daytime damp of universal rest/idle attractor (Agent 9 / Phase B follow-up).
 * Night rest and starve/exhaust interrupts stay untouched — only productive daytime
 * when hunger + stamina are clearly OK.
 *
 * Thresholds (documented):
 * - night (`isNight`): no damp
 * - starveTimer > 0 OR v.hunger < 2.0 OR needs.hunger > 0.48: no damp (food crisis)
 * - v.stamina < 2.0 (≈ STAMINA_TIRED) OR needs.fatigue > 0.55: no damp (need rest)
 * - else daytime: rest ×0.55, idle ×0.72
 */
function daytimeRestIdleDamp(state: SimState, v: Villager, mind: CognitiveState, kind: TaskKind): number {
  if (kind !== 'rest' && kind !== 'idle') return 1
  if (isNight(state.tick)) return 1
  if (v.starveTimer > 0 || v.hunger < 2.0 || mind.needs.hunger > 0.48) return 1
  if (v.stamina < 2.0 || mind.needs.fatigue > 0.55) return 1
  return kind === 'rest' ? 0.55 : 0.72
}

/** Fill SCRATCH_* and return Π mults (no heap). Optional ablation for DP1–DP3 measure. */
function fillFactorProduct(
  state: SimState,
  v: Villager,
  kind: TaskKind,
  x: number,
  y: number,
  targetId: number | null,
  jobMult: number,
  ambitionMult: number,
  opts?: FactorScoreOpts,
): number {
  const mind = mindOf(v)
  const mults = SCRATCH_MULTS
  const ablating = opts?.ablating ?? 'none'
  SCRATCH_ATTR.memory = false
  SCRATCH_ATTR.emotion = false
  SCRATCH_ATTR.personality = false
  SCRATCH_ATTR.family = false
  SCRATCH_ATTR.relation = false
  SCRATCH_FAMILY.kinship = 0
  SCRATCH_FAMILY.familyValue = 0
  SCRATCH_RELATION.affinity = 0
  SCRATCH_RELATION.trust = 0
  SCRATCH_RELATION.kinship = 0
  // Bypass the 0.02 floor — otherwise leisure still wins softmax on huge base scores.
  if (leisureBlockedBySurvival(state, v, kind)) {
    for (let i = 0; i < FACTOR_COUNT; i++) {
      mults[i] = 0
      SCRATCH_LOGS[i] = logSafe(1e-4)
    }
    return 0
  }
  mults[0] =
    needsFactor(mind, kind) *
    survivalUrgency(mind, v, kind) *
    harvestUrgency(v, kind) *
    daytimeRestIdleDamp(state, v, mind, kind)
  mults[1] = valuesPlanFactor(mind, kind, targetId)
  if (ablating === 'emotion') {
    mults[2] = 1
  } else {
    mults[2] = emotionsFactor(mind, kind)
    if (Math.abs(mults[2] - 1) >= ATTRIBUTION_MATERIAL_DELTA) SCRATCH_ATTR.emotion = true
  }
  mults[3] = stressHabitFactor(mind, kind)
  mults[4] = prefsSkillFactor(mind, kind, v)
  mults[5] = socialTomFactor(state, v, mind, kind, targetId, {
    ablatePersonality: ablating === 'personality',
    ablateFamily: ablating === 'family',
    ablateRelation: ablating === 'relation',
  })
  mults[6] = politicalFactor(state, v, kind, targetId)
  // Factor 7: job affinity × goal-aliased intention (WP3: ambitionMult from mind.goal, not v.ambition).
  mults[7] = Math.max(0.05, jobMult) * Math.max(0.05, ambitionMult)
  mults[8] = placeMemoryFactor(state, v, mind, kind, x, y, {
    ablateMemorySpots: ablating === 'memory',
    ablatePersonality: ablating === 'personality',
  })
  // When survival is stable, stretch identity channels away from 1 so prefs/skills/goals
  // can compete with shared catalogue baseScores (main convergence driver). No new entropy.
  if (identityStable(mind)) {
    mults[1] = stretchAwayFromOne(mults[1], 1.45)
    mults[4] = stretchAwayFromOne(mults[4], 1.65)
    mults[7] = stretchAwayFromOne(mults[7], 1.35)
  }
  let product = 1
  for (let i = 0; i < FACTOR_COUNT; i++) {
    const m = Math.max(0.02, mults[i])
    mults[i] = m
    SCRATCH_LOGS[i] = logSafe(m)
    product *= m
  }
  return product
}

/** Fed / calm / low fear — safe to let identity outweigh communal survival bases. */
function identityStable(mind: CognitiveState): boolean {
  return (
    mind.needs.hunger < 0.38 &&
    mind.needs.safety < 0.45 &&
    mind.needs.fatigue < 0.62 &&
    mind.emotions.fear < 0.5 &&
    mind.emotions.stress < 0.55
  )
}

/** Stretch multiplier away from neutral 1 (1.2→1.3 at k=1.5; 0.8→0.7). */
function stretchAwayFromOne(m: number, k: number): number {
  return 1 + (m - 1) * k
}

/**
 * Shared scoring helper for DP1–DP3 counterfactuals.
 * `memory` ablate spots; `emotion` forces emotionsFactor→1;
 * `personality` neutralizes social_tom trait priors + courage/curiosity place pull.
 */
export function scoreOptionProduct(
  state: SimState,
  v: Villager,
  kind: TaskKind,
  x: number,
  y: number,
  targetId: number | null,
  jobMult: number,
  ambitionMult: number,
  ablating: AblationChannel = 'none',
): number {
  return fillFactorProduct(state, v, kind, x, y, targetId, jobMult, ambitionMult, { ablating })
}

/**
 * Temperature from needs + personality.
 * Safe (fed, calm) → slightly higher T so uncommon crafts/ambitions can win softmax.
 * Crisis hunger/fear → lower T (near-greedy); survival hard floors still apply separately.
 * S1 raises T a little (fast heuristic thrash).
 */
export function decisionTemperature(mind: CognitiveState, courage: number, curiosity = 0.4): number {
  const stress = mind.emotions.stress
  const fear = mind.emotions.fear
  const hunger = mind.needs.hunger
  const s1 = mind.processMode === 'S1' ? 0.28 : 0
  const safe = hunger < 0.38 && mind.needs.fatigue < 0.55 && stress < 0.55 && fear < 0.5
  // Safe agents explore more so uncommon craft/ambition options can win softmax.
  const explore = safe ? 0.42 + curiosity * 0.28 + (1 - courage) * 0.1 : 0
  const crisis = hunger > 0.62 || fear > 0.72 ? -0.38 : hunger > 0.48 ? -0.18 : 0
  // Mild stress still adds a little noise; not the main exploration driver.
  const t = 0.52 + stress * 0.55 + fear * 0.22 - courage * 0.18 + s1 + explore + crisis
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
  if (kind === 'eat' || kind === 'gatherFood' || kind === 'fish' || kind === 'harvestWheat' || kind === 'takeFromChest' || kind === 'grindFlour' || kind === 'bakeBread') {
    m *=
      1 +
      n.hunger * 1.1 +
      concernBias(mind.working, 'need_food') * 0.18 +
      workspaceBias(mind.broadcast, 'need_food') * 0.45 +
      consciousAccessBias(mind, 'need_food') * 0.75 +
      peWeight(pe, 'hunger') * 0.35
    // market_high semantic (expensive bread) must pull the mill→flour→bread chain.
    if (kind === 'grindFlour' || kind === 'bakeBread') {
      const dear = mind.semantic.find((s) => s.kind === 'market_high' && s.confidence > 0.28)
      if (dear) m *= 1.25 + dear.confidence * 0.55
    }
  }
  // Note: survivalUrgency / harvestUrgency applied after needsFactor via fillFactorProduct.
  if (kind === 'rest') {
    m *=
      1 +
      n.fatigue * 0.95 +
      n.shelter * 0.55 +
      n.warmth * 0.55 +
      concernBias(mind.working, 'need_rest') * 0.18 +
      workspaceBias(mind.broadcast, 'need_rest') * 0.4 +
      consciousAccessBias(mind, 'need_rest') * 0.7 +
      peWeight(pe, 'fatigue') * 0.3 +
      peWeight(pe, 'shelter') * 0.2 +
      peWeight(pe, 'cold_comfort') * 0.2
    // Comfort nap gate: low fatigue/warmth/shelter → rest loses to livelihood (state-driven).
    if (n.fatigue < 0.32 && n.warmth < 0.38 && n.shelter < 0.35) m *= 0.18
    else if (n.fatigue < 0.45 && n.hunger > 0.35) m *= 0.45
  }
  if (
    kind === 'lightTorch' ||
    kind === 'placeCandle' ||
    kind === 'tendHearth' ||
    kind === 'gatherFuel' ||
    kind === 'craftLight'
  ) {
    m *=
      1 +
      n.light * 1.15 +
      n.warmth * 0.75 +
      n.safety * 0.25 +
      concernBias(mind.working, 'need_light') * 0.22 +
      concernBias(mind.working, 'need_warmth') * 0.18 +
      workspaceBias(mind.broadcast, 'need_light') * 0.4 +
      workspaceBias(mind.broadcast, 'need_warmth') * 0.35 +
      consciousAccessBias(mind, 'need_light') * 0.7 +
      consciousAccessBias(mind, 'need_warmth') * 0.55 +
      peWeight(pe, 'darkness') * 0.4 +
      peWeight(pe, 'cold_comfort') * 0.3
  }
  if (kind === 'craftGear') {
    m *= 1 + n.warmth * 0.45 + peWeight(pe, 'cold_comfort') * 0.15
    const dearCloth = mind.semantic.find((s) => s.kind === 'market_high' && s.confidence > 0.28)
    if (dearCloth) m *= 1.12
  }
  if (kind === 'tradeRun' || kind === 'buyMaterial') {
    const dear = mind.semantic.find((s) => s.kind === 'market_high' && s.confidence > 0.28)
    if (dear) m *= 1.2 + dear.confidence * 0.35
    m *= 1 + mind.values.wealth * 0.35 + mind.needs.purpose * 0.15
  }
  if (kind === 'buildMill') {
    const dear = mind.semantic.find((s) => s.kind === 'market_high' && s.confidence > 0.28)
    if (dear) m *= 1.35 + dear.confidence * 0.4
  }
  if (kind === 'flee' || kind === 'fight' || kind === 'defend' || kind === 'buildWall' || kind === 'craftSpear') {
    m *=
      1 +
      n.safety * 0.85 +
      workspaceBias(mind.broadcast, 'threat') * 0.3 +
      consciousAccessBias(mind, 'threat') * 0.65 +
      peWeight(pe, 'cold_threat') * 0.25
  }
  if (kind === 'buildHouse' || kind === 'buildBed' || kind === 'buildChest' || kind === 'buildTable' || kind === 'helpBuild' || kind === 'haulForBuild' || kind === 'hireBuilder' || kind === 'assistCraftTools') {
    m *=
      1 +
      n.shelter * 0.9 +
      workspaceBias(mind.broadcast, 'need_shelter') * 0.35 +
      consciousAccessBias(mind, 'need_shelter') * 0.7 +
      peWeight(pe, 'shelter') * 0.3
  }
  if (kind === 'socialise' || kind === 'giveFood' || kind === 'entertain' || kind === 'counsel' || kind === 'ritual' || kind === 'teachCraft') {
    m *=
      1 +
      n.social * 0.55 +
      n.belonging * 0.4 +
      n.boredom * 0.12 +
      workspaceBias(mind.broadcast, 'kin') * 0.25 +
      consciousAccessBias(mind, 'kin') * 0.55 +
      peWeight(pe, 'social') * 0.2 +
      peWeight(pe, 'belonging') * 0.15
    // Hard gate: socialise/spectacle/counsel wipe under hunger (giveFood still soft-yields).
    // teachCraft: softer — masters teach when fed enough to add() (need≈0.55 at hunger 2.7).
    if (kind === 'teachCraft') {
      if (n.hunger > 0.62) return 0
      if (n.hunger > 0.42) m *= 0.55
      else m *= 1 + n.purpose * 0.45 + n.status * 0.2
      if (n.shelter > 0.55 || n.fatigue > 0.65) m *= 0.5
    } else if (kind === 'socialise' || kind === 'entertain' || kind === 'counsel' || kind === 'ritual') {
      if (n.hunger > 0.38) return 0
      if (n.shelter > 0.4 || n.fatigue > 0.55 || n.light > 0.55 || n.warmth > 0.55) m *= 0.35
      else if (n.purpose > 0.3) m *= 0.55
    } else if (n.hunger > 0.55) {
      m *= 0.55
    } else if (n.hunger > 0.4 || n.shelter > 0.45 || n.purpose > 0.3) {
      m *= 0.78
    } else if (n.fatigue > 0.55 || n.light > 0.55 || n.warmth > 0.55) {
      m *= 0.55
    }
  }
  if (kind === 'entertain') {
    m *= n.hunger > 0.25 ? 0 : 1 + n.boredom * 0.45 + n.status * 0.2
  }
  if (kind === 'counsel') m *= 1 + n.piety * 0.5
  if (kind === 'ritual') m *= 1 + n.piety * 0.7 + mind.sacredConf * 0.45
  if (kind === 'teachCraft') m *= 1.35 + n.purpose * 0.4 + n.status * 0.2
  if (kind === 'makeCharcoal') m *= 1 + n.creative * 0.25 + n.purpose * 0.15
  if (kind === 'experiment') {
    m *=
      1 +
      n.creative * 0.85 +
      n.boredom * 0.55 +
      n.purpose * 0.35 +
      concernBias(mind.working, 'build') * 0.18 +
      workspaceBias(mind.broadcast, 'build') * 0.28 +
      consciousAccessBias(mind, 'build') * 0.55
    if (n.hunger > 0.42 || n.fatigue > 0.55) m *= 0.25
  }
  if (kind === 'tradeRun' || kind === 'mintCoins' || kind === 'mineGold' || kind === 'buildProject') {
    m *=
      1 +
      n.status * 0.45 +
      n.purpose * 0.25 +
      workspaceBias(mind.broadcast, 'status') * 0.22 +
      consciousAccessBias(mind, 'status') * 0.5 +
      peWeight(pe, 'status') * 0.2
  }
  // Wander / idle: live TaskKind (no `explore`) — boredom + conscious build/curiosity broadcast.
  if (kind === 'idle') {
    m *= 0.55 + n.boredom * 0.35 - n.fatigue * 0.35 - n.hunger * 0.4 - n.purpose * 0.25
    m *=
      1 +
      concernBias(mind.working, 'build') * 0.12 +
      workspaceBias(mind.broadcast, 'build') * 0.22 +
      consciousAccessBias(mind, 'build') * 0.35
  }
  if (kind.startsWith('craft') || kind.startsWith('build') || kind === 'weaveCloth' || kind === 'sewClothing' || kind === 'experiment') {
    m *=
      1 +
      n.creative * 0.35 +
      n.purpose * 0.2 +
      workspaceBias(mind.broadcast, 'build') * 0.25 +
      consciousAccessBias(mind, 'build') * 0.55
  }
  return m
}

/**
 * Values + goal/plan gate — strong prior, not cosmetic.
 * Under S1/stress, active plan step keeps a residual pull so goals are soft-factored, not erased.
 * Outside crisis, stretch goal/plan away from 1 so they aren't drowned by needs noise.
 */
function valuesPlanFactor(mind: CognitiveState, kind: TaskKind, targetId: number | null): number {
  let m = goalTaskModifier(mind, kind, targetId)
  const plan = mind.plan
  const onStep = !!plan && plan.goalId === mind.goal.id && plan.steps[plan.stepI] === kind
  if (onStep && (mind.emotions.stress > 0.45 || mind.processMode === 'S1') && mind.goal.commitment >= 10) {
    m *= 1.12 + Math.min(0.18, mind.goal.commitment / 220)
  }
  const crisis =
    mind.needs.hunger > 0.55 || mind.needs.safety > 0.55 || mind.needs.fatigue > 0.72 || mind.emotions.fear > 0.7
  if (!crisis && mind.goal.commitment > 6) {
    m = 1 + (m - 1) * 1.35
  }
  return Math.max(0.05, m)
}

function emotionsFactor(mind: CognitiveState, kind: TaskKind): number {
  return emotionTaskBias(mind.emotions, kind)
}

/**
 * Under high stress / S1: habit-directed behavior dominates goal-directed (dual-process).
 * Active plan step resists off-habit damp so committed goals still reach softmax.
 */
function stressHabitFactor(mind: CognitiveState, kind: TaskKind): number {
  const stress = mind.emotions.stress
  const habit = habitTaskBias(mind, kind)
  const s1Boost = mind.processMode === 'S1' ? 0.25 : 0
  // Stress / S1 amplifies habits, suppresses off-habit goal novelty.
  if (stress < 0.35 && mind.processMode === 'S2') {
    return habit * habitAntiLoopDamp(mind, kind)
  }
  const habitPull = mind.habits[kind] ?? 0
  const amplify = 1 + (stress + s1Boost) * 0.9 * habitPull
  let offHabit = habitPull < 0.12 ? 1 - (stress + s1Boost) * 0.28 : 1
  const plan = mind.plan
  const onPlanStep = !!plan && plan.goalId === mind.goal.id && plan.steps[plan.stepI] === kind
  if (onPlanStep && mind.goal.commitment >= 10) {
    // Soft floor: habits still amplify, but the current goal step is not wiped.
    offHabit = Math.max(offHabit, 0.9 - stress * 0.06)
  }
  return habit * amplify * offHabit * habitAntiLoopDamp(mind, kind)
}

/**
 * WP8/DP10 light anti-loop: when one non-urgent TaskKind dominates recentActs + habit,
 * soft-damp that habit pull. Never touches harvest / rest / food / survival floors.
 * Does not rewrite softmax — only scales stress_habitude factor.
 * DP10: teachCraft/socialise get a slightly stronger haircut (max ~32%) when clearly looping;
 * other leisure stays at ~18%. No fake entropy / random task injection.
 */
function habitAntiLoopDamp(mind: CognitiveState, kind: TaskKind): number {
  // Protect farm chain, shelter, and survival-adjacent kinds (night rest / harvest OK).
  if (
    kind === 'harvestWheat' ||
    kind === 'sowField' ||
    kind === 'clearLand' ||
    kind === 'grindFlour' ||
    kind === 'bakeBread' ||
    kind === 'eat' ||
    kind === 'gatherFood' ||
    kind === 'fish' ||
    kind === 'takeFromChest' ||
    kind === 'rest' ||
    kind === 'tendHearth' ||
    kind === 'lightTorch' ||
    kind === 'flee' ||
    kind === 'fight' ||
    kind === 'defend'
  ) {
    return 1
  }
  // Urgent needs → no damp (let habits help under pressure).
  if (
    mind.needs.hunger > 0.5 ||
    mind.needs.safety > 0.5 ||
    mind.needs.fatigue > 0.7 ||
    mind.needs.warmth > 0.55 ||
    mind.emotions.fear > 0.65
  ) {
    return 1
  }
  const acts = mind.recentActs
  if (acts.length < 5) return 1
  const same = acts.reduce((n, k) => n + (k === kind ? 1 : 0), 0)
  const ratio = same / acts.length
  if (ratio < 0.5) return 1
  const h = mind.habits[kind] ?? 0
  if (h < 0.32) return 1
  // Light only: teach/social leisure loops get a modest stronger damp (still <40%).
  // Idle/rest loops also damp slightly when clearly habit-locked (survival kinds protected above).
  const maxDamp =
    kind === 'teachCraft' || kind === 'socialise'
      ? 0.36
      : kind === 'idle' || kind === 'entertain'
        ? 0.28
        : 0.2
  const damp = Math.min(maxDamp, (ratio - 0.5) * 0.32 + (h - 0.32) * 0.14)
  if (damp > 0.001) noteSeqDampBound()
  return 1 - damp
}

function prefsSkillFactor(mind: CognitiveState, kind: TaskKind, v: Villager): number {
  let m =
    preferenceTaskBias(mind.preferences, kind) *
    skillBonus(mind.skills, kind) *
    cultureTaskBias(mind, kind) *
    selfModelTaskBias(mind, kind)
  // Declarative knowledge → soft prior on teach / craft / fortification (feeds next chooseTask).
  const kc = knowledgeCount(v.knowledge)
  if (kc > 0) {
    if (kind === 'teachCraft') m *= 1 + Math.min(0.55, kc * 0.08)
    if (kind === 'experiment' || kind.startsWith('craft') || kind === 'makeCharcoal') {
      m *= 1 + Math.min(0.28, kc * 0.04)
    }
    if (
      (kind === 'buildWall' || kind === 'buildMill' || kind === 'buildProject') &&
      (hasKnowledge(v.knowledge, 'stack_stone_high') || hasKnowledge(v.knowledge, 'high_stone_keep'))
    ) {
      m *= 1.18
    }
    if ((kind === 'mineTunnel' || kind === 'gatherIron') && hasKnowledge(v.knowledge, 'blast_mining', 0.2)) {
      m *= 1.15
    }
  }
  // Wave B3: model PE bleeds into same-kind confidence (worse-than-expected → damp).
  const surprise = peWeight(mind.predictionErrors, 'task_model')
  if (surprise > 0.12 && mind.predictedOutcome.kind === kind) {
    if (mind.modelPredictionError < -0.12) m *= 1 - Math.min(0.28, surprise * 0.35)
    else if (mind.modelPredictionError > 0.12) m *= 1 + Math.min(0.18, surprise * 0.22)
  }
  return m
}

/** Theory-of-mind lite + social impressions — live on decide (relations + tomActionBias). */
function socialTomFactor(
  state: SimState,
  v: Villager,
  mind: CognitiveState,
  kind: TaskKind,
  targetId: number | null,
  opts?: { ablatePersonality?: boolean; ablateFamily?: boolean; ablateRelation?: boolean },
): number {
  let m = 1
  const p = v.personality
  const ablatePers = opts?.ablatePersonality === true
  const ablateFam = opts?.ablateFamily === true
  const ablateRel = opts?.ablateRelation === true
  // Trait priors even without a target (plaza talk / open share).
  if (kind === 'socialise' || kind === 'entertain' || kind === 'counsel') {
    const persDelta = ablatePers ? 0 : p.sociability * 0.35
    m *= 1 + persDelta + mind.needs.social * 0.2 + mind.emotions.affection * 0.08
    if (!ablatePers && Math.abs(persDelta) >= ATTRIBUTION_MATERIAL_DELTA) SCRATCH_ATTR.personality = true
  }
  if (kind === 'giveFood') {
    const persDelta = ablatePers ? 0 : p.generosity * 0.4
    m *= 1 + persDelta
    if (!ablatePers && Math.abs(persDelta) >= ATTRIBUTION_MATERIAL_DELTA) SCRATCH_ATTR.personality = true
  }
  if (kind === 'teachCraft') {
    const persDelta = ablatePers ? 0 : p.sociability * 0.28 + p.ambition * 0.12
    m *= 1 + persDelta
    if (!ablatePers && Math.abs(persDelta) >= ATTRIBUTION_MATERIAL_DELTA) SCRATCH_ATTR.personality = true
  }
  if (targetId === null) {
    return m
  }
  const imp = mind.socialModel.find((s) => s.id === targetId)
  const rel = v.relations.get(targetId)
  m *= tomActionBias(imp, kind)

  const markRelation = (affinity: number, trust: number, kinship: number, part: number) => {
    if (ablateRel) return
    if (part < ATTRIBUTION_MATERIAL_DELTA) return
    SCRATCH_ATTR.relation = true
    SCRATCH_RELATION.affinity = affinity
    SCRATCH_RELATION.trust = trust
    SCRATCH_RELATION.kinship = kinship
  }

  if (kind === 'socialise' || kind === 'entertain' || kind === 'counsel') {
    if (imp) m *= 1 + imp.affection * 0.22 + imp.trust * 0.18 - imp.fear * 0.25
    if (rel) {
      const kinship = rel.kinship ?? 0
      const affinity = Math.max(0, rel.affinity)
      const trust = rel.trust ?? 0
      const respect = rel.respect ?? 0
      const kinPart = ablateFam || ablateRel ? 0 : kinship * 0.22
      const affPart = ablateRel ? 0 : affinity * 0.22
      const trustPart = ablateRel ? 0 : trust * 0.12
      const respectPart = ablateRel ? 0 : respect * 0.28
      m *= 1 + respectPart + affPart + kinPart + trustPart
      if (!ablateFam && kinPart >= ATTRIBUTION_MATERIAL_DELTA) {
        SCRATCH_ATTR.family = true
        SCRATCH_FAMILY.kinship = kinship
        SCRATCH_FAMILY.familyValue = mind.values.family
      }
      markRelation(affinity, trust, kinship, affPart + trustPart + respectPart + kinPart)
    }
    const other = state.villagers.find((o) => o.id === targetId)
    if (other) {
      const om = mindOf(other)
      m *= homophilyBias(cultureSimilarity(mind.cultureFeatures, om.cultureFeatures), 'socialise')
    }
  }
  if (kind === 'giveFood') {
    if (imp) m *= 1 + imp.affection * 0.22 + imp.trust * 0.18
    let kinPart = 0
    let trustPart = 0
    let debtPart = 0
    const kinship = rel?.kinship ?? 0
    const affinity = Math.max(0, rel?.affinity ?? 0)
    const trust = rel?.trust ?? 0
    if (rel) {
      kinPart = ablateFam || ablateRel ? 0 : kinship * 0.32
      trustPart = ablateRel ? 0 : trust * 0.42
      debtPart = ablateRel ? 0 : (rel.debt ?? 0) * 0.15
      m *= 1 + kinPart + debtPart + trustPart
    }
    const famVal = ablateFam ? 0 : mind.values.family * 0.25
    m *= 1 + famVal + mind.emotions.affection * 0.2
    if (
      !ablateFam &&
      (kinPart >= ATTRIBUTION_MATERIAL_DELTA || famVal >= ATTRIBUTION_MATERIAL_DELTA)
    ) {
      SCRATCH_ATTR.family = true
      SCRATCH_FAMILY.kinship = kinship
      SCRATCH_FAMILY.familyValue = mind.values.family
    }
    markRelation(affinity, trust, kinship, kinPart + trustPart + debtPart)
  }
  if (kind === 'teachCraft') {
    if (imp) m *= 1 + imp.trust * 0.25 + imp.affection * 0.1
    if (rel) {
      const kinship = rel.kinship ?? 0
      const affinity = Math.max(0, rel.affinity)
      const trust = rel.trust ?? 0
      const respect = rel.respect ?? 0
      const kinPart = ablateFam || ablateRel ? 0 : kinship * 0.22
      const affPart = ablateRel ? 0 : affinity * 0.15
      const respectPart = ablateRel ? 0 : respect * 0.2
      m *= 1 + respectPart + affPart + kinPart
      if (!ablateFam && kinPart >= ATTRIBUTION_MATERIAL_DELTA) {
        SCRATCH_ATTR.family = true
        SCRATCH_FAMILY.kinship = kinship
        SCRATCH_FAMILY.familyValue = mind.values.family
      }
      markRelation(affinity, trust, kinship, kinPart + affPart + respectPart)
    }
  }
  if (kind === 'confront' || kind === 'steal') {
    if (imp) m *= 1 + (1 - imp.trust) * 0.25 + imp.fear * 0.1 + mind.emotions.anger * 0.2
    if (rel) m *= 1 + (rel.grudge ?? 0) * 0.35
    const persDelta = ablatePers ? 0 : p.courage * 0.15 - p.generosity * 0.12
    m *= 1 + persDelta
    if (!ablatePers && Math.abs(persDelta) >= ATTRIBUTION_MATERIAL_DELTA) SCRATCH_ATTR.personality = true
  }
  if (kind === 'defend' && rel) {
    const kinship = rel.kinship ?? 0
    const affinity = Math.max(0, rel.affinity)
    const trust = rel.trust ?? 0
    const kinPart = ablateFam || ablateRel ? 0 : kinship * 0.25
    const affPart = ablateRel ? 0 : affinity * 0.3
    m *= 1 + affPart + kinPart
    if (!ablateFam && kinPart >= ATTRIBUTION_MATERIAL_DELTA) {
      SCRATCH_ATTR.family = true
      SCRATCH_FAMILY.kinship = kinship
      SCRATCH_FAMILY.familyValue = mind.values.family
    }
    markRelation(affinity, trust, kinship, kinPart + affPart)
  }
  if ((kind === 'tradeRun' || kind === 'buyMaterial') && (imp || rel)) {
    if (imp) m *= 1 + imp.trust * 0.12 - imp.fear * 0.08
    if (rel && !ablateRel) {
      m *= 1 + (rel.trust ?? 0) * 0.1 + Math.max(0, rel.affinity) * 0.08
    }
  }
  m *= warTaskBias(mind, kind, targetId)
  return m
}

/**
 * M5.1 catalogue shadow: damp help baseScore by estimated kinship/affinity share
 * (measure-only — does not change live catalogue scoring).
 */
function helpCatalogueRelationDamp(
  v: Villager,
  kind: TaskKind,
  targetId: number | null,
): number {
  if (!HELP_RELATION_KINDS.has(kind) || targetId == null) return 1
  const rel = v.relations.get(targetId)
  if (!rel) return 1
  const kin = rel.kinship ?? 0
  const aff = Math.max(0, rel.affinity)
  const trust = rel.trust ?? 0
  const respect = rel.respect ?? 0
  // Approximate relation weight baked into behaviors.ts add() scores.
  const relWeight =
    kind === 'giveFood'
      ? kin * 0.35 + aff * 0.45 + trust * 0.25 + respect * 0.2
      : kind === 'defend'
        ? kin * 0.35 + aff * 0.5 + respect * 0.25
        : kind === 'teachCraft'
          ? kin * 0.25 + aff * 0.2 + respect * 0.2 + trust * 0.15
          : kin * 0.3 + aff * 0.35 + trust * 0.15 + respect * 0.2
  if (relWeight < ATTRIBUTION_MATERIAL_DELTA) return 1
  return 1 / (1 + relWeight)
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
  opts?: { ablateMemorySpots?: boolean; ablatePersonality?: boolean },
): number {
  let m = burrowTaskMultiplier(state, v, mind, kind, x, y)
  m *= religionTaskBias(mind, kind, x, y)
  const d = distance(v.x, v.y, x, y)
  const ablatePers = opts?.ablatePersonality === true
  // Neutral courage/curiosity when ablating personality channel (pers:* / place pull).
  const courage = ablatePers ? 0.5 : v.personality.courage
  const curiosity = ablatePers ? 0.5 : v.personality.curiosity
  if (d > 40) {
    const beforePers = m
    m *= 0.88 - courage * 0.06
    if (!ablatePers && Math.abs(m - beforePers) >= ATTRIBUTION_MATERIAL_DELTA) {
      SCRATCH_ATTR.personality = true
    }
  }
  if (isChild(v) && d > 28) m *= 0.72
  const caution = cautionFactor(v)
  const beforeMem = m
  let recalled = false
  const ablate = opts?.ablateMemorySpots === true
  if (!ablate) {
    for (const spot of knownSpots(mind.semantic, mind.episodic, v.memories, 'danger')) {
      if (distance(x, y, spot.x, spot.y) > 14 * caution) continue
      m *= 1 - Math.min(0.78, spot.weight * 0.3 * caution * (1.05 - courage * 0.5))
      if (!ablatePers) {
        reinforceRecall(mind.episodic, 'dangerSpot', null, state.tick, { x: spot.x, y: spot.y, r: 14 })
      }
      recalled = true
      SCRATCH_MEM.retrieved = true
      SCRATCH_MEM.danger = true
    }
    for (const spot of knownSpots(mind.semantic, mind.episodic, v.memories, 'good')) {
      if (distance(x, y, spot.x, spot.y) > 14) continue
      if (kind === 'gatherFood' || kind === 'gatherWood' || kind === 'fish' || kind === 'clearLand') {
        m *= 1 + Math.min(0.48, spot.weight * 0.22 * (0.5 + curiosity))
        if (!ablatePers) {
          reinforceRecall(mind.episodic, 'goodSpot', null, state.tick, { x: spot.x, y: spot.y, r: 14 })
        }
        recalled = true
        SCRATCH_MEM.retrieved = true
        SCRATCH_MEM.good = true
      }
    }
  }
  if (recalled || Math.abs(m - beforeMem) >= ATTRIBUTION_MATERIAL_DELTA) SCRATCH_ATTR.memory = true
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

/**
 * End-to-end: score options with factors, softmax select, return debug why.
 * Soft path for catalog options (incl. ripe harvest / mild food seek via survivalUrgency /
 * harvestUrgency). Callers may still HARD-assign biological must-fires before this:
 * dying hunger eat, empty-bag crisis forage, outdoor freeze shelter.
 */
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
  const n = options.length
  const utils = ensureUtilScratch(n)
  const utilsAblated = ensureUtilScratchAblated(n)

  // DP1 measure-first: ablate place-memory spots FIRST (no reinforce), then live score.
  SCRATCH_MEM.retrieved = false
  SCRATCH_MEM.danger = false
  SCRATCH_MEM.good = false
  for (let i = 0; i < n; i++) {
    const o = options[i]!
    const productAbl = fillFactorProduct(
      state,
      v,
      o.kind,
      o.x,
      o.y,
      o.id,
      o.jobMult,
      o.ambitionMult,
      { ablating: 'memory' },
    )
    utilsAblated[i] = Math.max(0, o.baseScore) * productAbl
  }

  let materialAny = false
  let emotionMaterialAny = false
  let personalityMaterialAny = false
  let familyMaterialAny = false
  let relationMaterialAny = false
  let familyKinshipSample = 0
  let familyValueSample = 0
  let relationAffinitySample = 0
  let relationTrustSample = 0
  let relationKinshipSample = 0
  let helpKindOnMenu = false
  for (let i = 0; i < n; i++) {
    const o = options[i]!
    if (HELP_RELATION_KINDS.has(o.kind)) helpKindOnMenu = true
    const product = fillFactorProduct(
      state,
      v,
      o.kind,
      o.x,
      o.y,
      o.id,
      o.jobMult,
      o.ambitionMult,
      { ablating: 'none' },
    )
    if (SCRATCH_ATTR.memory) materialAny = true
    if (SCRATCH_ATTR.emotion) emotionMaterialAny = true
    if (SCRATCH_ATTR.personality) personalityMaterialAny = true
    if (SCRATCH_ATTR.family) {
      familyMaterialAny = true
      familyKinshipSample = SCRATCH_FAMILY.kinship
      familyValueSample = SCRATCH_FAMILY.familyValue
    }
    if (SCRATCH_ATTR.relation) {
      relationMaterialAny = true
      relationAffinitySample = SCRATCH_RELATION.affinity
      relationTrustSample = SCRATCH_RELATION.trust
      relationKinshipSample = SCRATCH_RELATION.kinship
    }
    utils[i] = Math.max(0, o.baseScore) * product
  }

  // Causal flip = deterministic argmax with mem vs without (pre-imagination; place-memory only).
  if (n >= 2 && (materialAny || SCRATCH_MEM.retrieved)) {
    const idxBefore = argmaxUtil(utils, n)
    const idxAfter = argmaxUtil(utilsAblated, n)
    const before = options[idxBefore]!
    const after = options[idxAfter]!
    const runner = runnerUpUtil(utils, n, idxBefore)
    const spotKind =
      SCRATCH_MEM.danger && SCRATCH_MEM.good
        ? 'mixed'
        : SCRATCH_MEM.danger
          ? 'danger'
          : SCRATCH_MEM.good
            ? 'good'
            : null
    noteMemoryCounterfactualBound({
      villagerId: v.id,
      beforeKind: before.kind,
      afterKind: after.kind,
      utilBefore: utils[idxBefore]!,
      utilAfter: utilsAblated[idxAfter]!,
      runnerUpKind: runner.index >= 0 ? options[runner.index]!.kind : null,
      runnerUpUtilBefore: runner.index >= 0 ? runner.util : null,
      spotKind,
      retrieved: SCRATCH_MEM.retrieved,
      material: materialAny,
      flipped: idxBefore !== idxAfter,
    })
  }

  // DP2 measure-first: ablate emotionTaskBias (emotions factor → 1), reuse utilsAblated after mem CF.
  if (n >= 2 && emotionMaterialAny) {
    for (let i = 0; i < n; i++) {
      const o = options[i]!
      const productAbl = fillFactorProduct(
        state,
        v,
        o.kind,
        o.x,
        o.y,
        o.id,
        o.jobMult,
        o.ambitionMult,
        { ablating: 'emotion' },
      )
      utilsAblated[i] = Math.max(0, o.baseScore) * productAbl
    }
    const idxBefore = argmaxUtil(utils, n)
    const idxAfter = argmaxUtil(utilsAblated, n)
    const before = options[idxBefore]!
    const after = options[idxAfter]!
    const runner = runnerUpUtil(utils, n, idxBefore)
    noteEmotionCounterfactualBound({
      villagerId: v.id,
      beforeKind: before.kind,
      afterKind: after.kind,
      utilBefore: utils[idxBefore]!,
      utilAfter: utilsAblated[idxAfter]!,
      runnerUpKind: runner.index >= 0 ? options[runner.index]!.kind : null,
      runnerUpUtilBefore: runner.index >= 0 ? runner.util : null,
      material: emotionMaterialAny,
      flipped: idxBefore !== idxAfter,
    })
  }

  // DP3 measure-first: ablate social_tom trait priors + courage/curiosity place pull.
  if (n >= 2 && personalityMaterialAny) {
    for (let i = 0; i < n; i++) {
      const o = options[i]!
      const productAbl = fillFactorProduct(
        state,
        v,
        o.kind,
        o.x,
        o.y,
        o.id,
        o.jobMult,
        o.ambitionMult,
        { ablating: 'personality' },
      )
      utilsAblated[i] = Math.max(0, o.baseScore) * productAbl
    }
    const idxBefore = argmaxUtil(utils, n)
    const idxAfter = argmaxUtil(utilsAblated, n)
    const before = options[idxBefore]!
    const after = options[idxAfter]!
    const runner = runnerUpUtil(utils, n, idxBefore)
    notePersonalityCounterfactualBound({
      villagerId: v.id,
      beforeKind: before.kind,
      afterKind: after.kind,
      utilBefore: utils[idxBefore]!,
      utilAfter: utilsAblated[idxAfter]!,
      runnerUpKind: runner.index >= 0 ? options[runner.index]!.kind : null,
      runnerUpUtilBefore: runner.index >= 0 ? runner.util : null,
      material: personalityMaterialAny,
      flipped: idxBefore !== idxAfter,
    })
  }

  // P6 M6.1 measure-first: ablate kinship / values.family in socialTom (leave other rel terms).
  if (n >= 2 && familyMaterialAny) {
    for (let i = 0; i < n; i++) {
      const o = options[i]!
      const productAbl = fillFactorProduct(
        state,
        v,
        o.kind,
        o.x,
        o.y,
        o.id,
        o.jobMult,
        o.ambitionMult,
        { ablating: 'family' },
      )
      utilsAblated[i] = Math.max(0, o.baseScore) * productAbl
    }
    const idxBefore = argmaxUtil(utils, n)
    const idxAfter = argmaxUtil(utilsAblated, n)
    const before = options[idxBefore]!
    const after = options[idxAfter]!
    const runner = runnerUpUtil(utils, n, idxBefore)
    noteFamilyCounterfactualBound({
      villagerId: v.id,
      beforeKind: before.kind,
      afterKind: after.kind,
      utilBefore: utils[idxBefore]!,
      utilAfter: utilsAblated[idxAfter]!,
      runnerUpKind: runner.index >= 0 ? options[runner.index]!.kind : null,
      runnerUpUtilBefore: runner.index >= 0 ? runner.util : null,
      kinship: familyKinshipSample,
      familyValue: familyValueSample,
      material: familyMaterialAny,
      flipped: idxBefore !== idxAfter,
    })
  }

  // P6 M5.1: ablate relation terms (+ catalogue help base damp) → help/social argmax flip.
  if (n >= 2 && relationMaterialAny && helpKindOnMenu) {
    for (let i = 0; i < n; i++) {
      const o = options[i]!
      const productAbl = fillFactorProduct(
        state,
        v,
        o.kind,
        o.x,
        o.y,
        o.id,
        o.jobMult,
        o.ambitionMult,
        { ablating: 'relation' },
      )
      const damp = helpCatalogueRelationDamp(v, o.kind, o.id)
      utilsAblated[i] = Math.max(0, o.baseScore) * damp * productAbl
    }
    const idxBefore = argmaxUtil(utils, n)
    const idxAfter = argmaxUtil(utilsAblated, n)
    const before = options[idxBefore]!
    const after = options[idxAfter]!
    const runner = runnerUpUtil(utils, n, idxBefore)
    noteRelationCounterfactualBound({
      villagerId: v.id,
      beforeKind: before.kind,
      afterKind: after.kind,
      utilBefore: utils[idxBefore]!,
      utilAfter: utilsAblated[idxAfter]!,
      runnerUpKind: runner.index >= 0 ? options[runner.index]!.kind : null,
      runnerUpUtilBefore: runner.index >= 0 ? runner.util : null,
      affinity: relationAffinitySample,
      trust: relationTrustSample,
      kinship: relationKinshipSample,
      material: relationMaterialAny,
      flipped: idxBefore !== idxAfter,
      helpMenu: true,
    })
  }

  // Wave B2 — imagination 1-step: re-score top 2–3 via lite world model (not MCTS).
  const topK = Math.min(3, n)
  const topIdx = [0, 1, 2]
  for (let k = 0; k < topK; k++) {
    let bestI = -1
    let bestU = -1
    for (let i = 0; i < n; i++) {
      if (k > 0 && (i === topIdx[0] || (k > 1 && i === topIdx[1]))) continue
      if (utils[i]! > bestU) {
        bestU = utils[i]!
        bestI = i
      }
    }
    topIdx[k] = bestI
  }
  for (let k = 0; k < topK; k++) {
    const i = topIdx[k]!
    if (i < 0) continue
    const o = options[i]!
    const est = estimateTaskOutcome(mind, o.kind, o.x, o.y, v.memories)
    utils[i] = utils[i]! * outcomeUtilityMult(est)
  }

  const T = decisionTemperature(mind, v.personality.courage, v.personality.curiosity)
  const utilView = utils.subarray(0, n)
  const { index, backend } = softmaxPick(utilView, T, rng)
  if (index < 0) return null
  const chosen = options[index]!
  // B1: store forecast for the act about to run (feeds PE on outcome).
  const forecast = estimateTaskOutcome(mind, chosen.kind, chosen.x, chosen.y, v.memories)
  storePredictedOutcome(mind, forecast)
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
  const why = topFactorWhy(breakdown)
  const imagPct = Math.round((outcomeUtilityMult(forecast) - 1) * 100)
  if (Math.abs(imagPct) >= 4) why.unshift(`imagination ${imagPct >= 0 ? '+' : ''}${imagPct}%`)
  // CP3: tag whyFactors when fillFactorProduct saw material mem/emo/pers contribution.
  if (SCRATCH_ATTR.memory) why.unshift('mem:place')
  if (SCRATCH_ATTR.emotion) why.unshift('emo:bias')
  if (SCRATCH_ATTR.personality) why.unshift('pers:social_tom')
  if (SCRATCH_ATTR.family) {
    why.unshift('fam:kin')
    noteFamilyDecisionUse(
      state,
      v.id,
      chosen.kind,
      SCRATCH_FAMILY.kinship,
      SCRATCH_FAMILY.familyValue,
    )
  }
  const whyOut = why.slice(0, 5)
  const finalUtil = breakdown.utility * outcomeUtilityMult(forecast)
  // Optional tracer (off by default) — no behaviors dependency.
  if (isDecisionTraceEnabled()) {
    const ranked: { kind: TaskKind; utility: number; i: number }[] = []
    for (let i = 0; i < n; i++) ranked.push({ kind: options[i]!.kind, utility: utils[i]!, i })
    ranked.sort((a, b) => b.utility - a.utility)
    noteDecisionTrace({
      tick: state.tick,
      villagerId: v.id,
      chosen: chosen.kind,
      utility: finalUtil,
      temperature: T,
      optionCount: n,
      top: ranked.slice(0, 5).map((r) => ({ kind: r.kind, utility: r.utility })),
      whyFactors: whyOut,
      backend,
    })
  }
  return {
    index,
    temperature: T,
    whyFactors: whyOut,
    utility: finalUtil,
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

/** Canonical single-mult entry (Wave A) — alias used by flee soft bias & external callers. */
export function cognitiveTaskModifier(
  state: SimState,
  v: Villager,
  kind: TaskKind,
  x: number,
  y: number,
  id: number | null,
): number {
  return cognitiveFactorProduct(state, v, kind, x, y, id)
}

/**
 * Phase A — stable query for relation→decision bias (economy/groups should use this,
 * not fork kinship/affinity math). Wraps scoreWithFactors for a known other.
 */
export function relationDecisionBias(
  state: SimState,
  v: Villager,
  otherId: number | null,
  kind: TaskKind,
): number {
  if (otherId == null) return 1
  let x = v.x
  let y = v.y
  for (let i = 0; i < state.villagers.length; i++) {
    const o = state.villagers[i]
    if (o && o.id === otherId) {
      x = o.x
      y = o.y
      break
    }
  }
  return cognitiveFactorProduct(state, v, kind, x, y, otherId)
}
