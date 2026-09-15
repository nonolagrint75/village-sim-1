import type { MemoryKind } from '../social'
import type { TaskKind } from '../types'
import type { EmotionEvent } from './emotions'

/** Soft value weights — conflict and bias option scores. Not decorative. */
export interface ValueWeights {
  family: number
  freedom: number
  honor: number
  wealth: number
  security: number
  status: number
}

/** Soft drives that feed goal generation (0–1 pressure). */
export interface NeedPressures {
  hunger: number
  fatigue: number
  safety: number
  social: number
  shelter: number
  status: number
  purpose: number
  /** Extended drives used by thoughts / religion stubs. */
  belonging: number
  boredom: number
  piety: number
  creative: number
}

export interface EmotionState {
  anger: number
  fear: number
  stress: number
  affection: number
  pride: number
  /** Net affective valence (−1..1) — approach/avoid readiness axis. */
  valence: number
  /** Action readiness: >0 approach, <0 avoid (−1..1). */
  approachAvoid: number
}

/** Dual-process mode (Kahneman / PFC vs habit). */
export type ProcessMode = 'S1' | 'S2'

/** Mode phénoménal — conscience d’accès individuelle (GWT-lite). */
export type ConsciousMode = 'awake' | 'drowsy' | 'asleep' | 'dream'

/**
 * État conscient privé d’un esprit.
 * Jamais partagé entre agents — pas d’âme-monde / hive mind.
 */
export interface ConsciousState {
  /** Contenu broadcast gagnant (copie privée). */
  contents: WorkingConcern[]
  /** Narratif « je » (soi phénoménal). */
  narrativeJe: string
  /** Affect ressenti (résumé FR). */
  feltAffect: string
  /** Conscience du but présent. */
  goalAwareness: string
  /** Parole intérieure sparse (jetons FR). */
  innerSpeech: string[]
  mode: ConsciousMode
  /** Force du biais d’accès sur chooseTask (0–1). */
  accessGain: number
  lastStreamTick: number
  /** Kinds conscients (compact / perf). */
  focusKinds: WorkingConcernKind[]
  /** Clarté du flux (0–1) — baisse en sommeil. */
  clarity: number
}

/** Interoceptive prediction-error channels (active-inference lite). */
export type PredictionErrorKind =
  | 'hunger'
  | 'fatigue'
  | 'cold_threat'
  | 'shelter'
  | 'social'
  | 'belonging'
  | 'status'

export interface PredictionError {
  kind: PredictionErrorKind
  /** Unsigned error magnitude 0–1. */
  magnitude: number
  /** Precision / attention weight 0–1. */
  precision: number
  /** magnitude × precision — competes for workspace. */
  weighted: number
  label: string
}

/** Soft identity narrative — biases long-horizon goals. */
export interface SelfModel {
  name: string
  lineage: string | null
  creed: string | null
  livelihood: string | null
  /** Short French phrase for debug. */
  narrative: string
  /** How strongly identity biases goals (0–1). */
  strength: number
}

export type WorkingConcernKind =
  | 'need_food'
  | 'need_rest'
  | 'need_shelter'
  | 'threat'
  | 'debt'
  | 'grudge'
  | 'resource'
  | 'kin'
  | 'status'
  | 'build'

export interface WorkingConcern {
  kind: WorkingConcernKind
  label: string
  urgency: number
  subjectId: number | null
  x: number
  y: number
  tick: number
}

export interface EpisodicMemory {
  kind: MemoryKind | 'event'
  subjectId: number | null
  participants: number[]
  x: number
  y: number
  tick: number
  importance: number
  emotion: number
  confidence: number
  lastRecall: number
  label: string
}

export type SemanticFactKind =
  | 'wolves_near'
  | 'good_forage'
  | 'danger_spot'
  | 'market_high'
  | 'market_low'
  | 'person_trait'
  | 'resource_scarce'
  | 'mine_spot'

export interface SemanticFact {
  kind: SemanticFactKind
  subjectId: number | null
  x: number
  y: number
  confidence: number
  tick: number
  label: string
}

export type ProceduralSkill =
  | 'chop'
  | 'build'
  | 'trade'
  | 'fish'
  | 'mine'
  | 'craft'
  | 'farm'
  | 'fight'
  | 'social'

export type ProceduralSkills = Record<ProceduralSkill, number>

/** Soft labor likes (DF-inspired) — born + life, bias tasks and thoughts. */
export type LaborPref =
  | 'woodwork'
  | 'fishing'
  | 'farming'
  | 'trade'
  | 'fighting'
  | 'crafting'
  | 'mining'
  | 'building'
  | 'social'

export type LaborPreferences = Record<LaborPref, number>

export type CraftQuality = 'crude' | 'normal' | 'fine' | 'masterwork'

/** Buckets de temps pour métiers émergents (EMA). */
export type ActivityBucket =
  | 'gather'
  | 'farm'
  | 'fish'
  | 'craft'
  | 'build'
  | 'mine'
  | 'trade'
  | 'fight'
  | 'teach'
  | 'entertain'
  | 'counsel'
  | 'ritual'
  | 'smuggle'
  | 'care'
  | 'social'

export type ActivityMix = Record<ActivityBucket, number>

/** Profil de subsistance — pratique + reconnaissance → titre FR. */
export interface LivelihoodProfile {
  mix: ActivityMix
  titleFr: string
  roleTag: string | null
  recognition: number
  patronage: number
  unemployedStreak: number
  lastTitleTick: number
  guildCircleId: number | null
}

const ACTIVITY_BUCKETS: ActivityBucket[] = [
  'gather',
  'farm',
  'fish',
  'craft',
  'build',
  'mine',
  'trade',
  'fight',
  'teach',
  'entertain',
  'counsel',
  'ritual',
  'smuggle',
  'care',
  'social',
]

export function emptyLivelihood(): LivelihoodProfile {
  const mix = {} as ActivityMix
  for (const k of ACTIVITY_BUCKETS) mix[k] = 0
  return {
    mix,
    titleFr: 'sans métier clair',
    roleTag: null,
    recognition: 0,
    patronage: 0,
    unemployedStreak: 0,
    lastTitleTick: -999,
    guildCircleId: null,
  }
}

/** Subjective model of another person — asymmetric from their view of us. */
export interface SocialImpression {
  id: number
  trust: number
  fear: number
  affection: number
  lastTick: number
  /** Theory-of-mind: inferred goal of this other. */
  inferredGoal: CognitiveGoalId | null
  goalConf: number
}

export type CognitiveGoalId =
  | 'survive'
  | 'rest'
  | 'home'
  | 'wealth'
  | 'family'
  | 'mate'
  | 'status'
  | 'community'
  | 'explore'
  | 'security'
  | 'craft'
  | 'revenge'
  | 'migrate'

export interface CognitiveGoal {
  id: CognitiveGoalId
  score: number
  commitment: number
  targetId: number | null
  targetX: number
  targetY: number
}

/** Lightweight hierarchical stub: goal → 2–3 existing TaskKinds. */
export interface PlanStub {
  goalId: CognitiveGoalId
  steps: TaskKind[]
  stepI: number
  /** When set, plan tracks a soft BuildProject from construction.ts. */
  buildProjectId?: number
}

export type CognitionDepth = 'fast' | 'deep'

export type ThoughtSource = EmotionEvent | `need_${keyof NeedPressures}` | 'labor' | 'masterwork'

export interface Thought {
  text: string
  valence: number
  stressDelta: number
  tick: number
  source: ThoughtSource
}

export interface CognitiveState {
  values: ValueWeights
  needs: NeedPressures
  emotions: EmotionState
  working: WorkingConcern[]
  /** Global workspace (conscious broadcast) — winners of concern competition. */
  broadcast: WorkingConcern[]
  /** Ranked interoceptive prediction errors (active-inference lite). */
  predictionErrors: PredictionError[]
  /** Dual-process mode this tick. */
  processMode: ProcessMode
  /** Soft identity narrative. */
  selfModel: SelfModel
  /** Conscience individuelle privée (GWT / self phénoménal). */
  consciousness: ConsciousState
  episodic: EpisodicMemory[]
  semantic: SemanticFact[]
  skills: ProceduralSkills
  /** Born + life labor preferences (woodwork, fishing, …). */
  preferences: LaborPreferences
  socialModel: SocialImpression[]
  goal: CognitiveGoal
  plan: PlanStub | null
  /** Structured French reasons for the last chosen action. */
  lastReasons: string[]
  /** Last factor-breakdown lines (scientist debug). */
  lastFactorWhy: string[]
  lastKind: TaskKind | null
  /** Last skill practiced — rust spares this one. */
  lastPracticedSkill: ProceduralSkill | null
  /** Recent DF-style labor thoughts (liked / forced / masterwork). */
  laborThoughts: string[]
  /** Count of rare masterwork crafts for prestige / chronicle. */
  masterworkCount: number
  lastDeepTick: number
  failures: number
  successes: number
  /** Encoded top habit keys (debug / snapshot). */
  habitIds: number[]
  /** Sparse habit strengths from repeated successful acts. */
  habits: Partial<Record<TaskKind, number>>
  /** Recent successful task kinds for sequence habits. */
  recentActs: TaskKind[]
  /** Soft cultural label — mutates by imitation, not scripts. Generated tags only. */
  cultureTag: string | null
  cultureWeight: number
  /**
   * Vecteur de traits culturels (Axelrod) — indépendant de la génétique / du phénotype.
   * length = CULTURE_FEATURE_COUNT ; valeurs discrètes 0..q-1.
   */
  cultureFeatures: number[]
  /** Tolérance Schelling (0–1) : seuil de voisins « similaires » souhaités. */
  cultureTolerance: number
  /** Emergent sacred meeting point (faith circles / piety). */
  sacredX: number
  sacredY: number
  sacredConf: number
  /** Soft rival from inter-circle tension (not scripted war). */
  rivalId: number | null
  /** Active soft BuildProject this mind is pursuing (construction.ts). */
  buildProjectId: number | null
  /** DF-style inner monologue — capped, affects stress. */
  thoughts: Thought[]
  /**
   * Profil de subsistance émergent — mix d’activités → titre FR.
   * Profession legacy reste un soft hint ressources.
   */
  livelihood: LivelihoodProfile
}

export const MAX_THOUGHTS = 12
/** Working-memory capacity (Cowan-lite) — competitors for broadcast. */
export const MAX_WORKING = 4
/** Items that win competition into conscious broadcast. */
export const WORKSPACE_CAPACITY = 3
export const MAX_EPISODIC = 16
export const MAX_SEMANTIC = 14
export const MAX_SOCIAL_MODEL = 18
/** Deep cognition every Nth agent-tick batch — keep Speed Max stable. */
export const DEEP_PERIOD = 9
export const NOTABLE_DEEP_BONUS = true
