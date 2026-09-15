/**
 * Compact mind storage — SoA typed arrays for hot floats (needs / emotions / skills)
 * across all villagers. Rich CognitiveState objects stay for episodic/plan/debug;
 * SoA mirrors reduce GC pressure and feed GPU batch paths.
 */

import type { Villager } from '../types'
import { emptyEmotions } from './emotions'
import { defaultGoal } from './goals'
import { emptySkills } from './memory'
import { emptyNeeds, valuesFromPersonality } from './needs'
import { seedLaborPreferences } from './labor'
import { emptyThoughts } from './thoughts'
import { emptyConsciousness } from './consciousness'
import { emptySelfModel } from './selfModel'
import { emptyLivelihood } from './types'
import type { CognitiveState, EmotionState, NeedPressures, ProceduralSkills } from './types'

/** Soft capacity — grows; prefer power-of-two-ish chunks. */
const INITIAL_CAP = 64

const NEED_KEYS: (keyof NeedPressures)[] = [
  'hunger',
  'fatigue',
  'safety',
  'social',
  'shelter',
  'status',
  'purpose',
  'belonging',
  'boredom',
  'piety',
  'creative',
  'light',
  'warmth',
]

const EMO_KEYS: (keyof EmotionState)[] = ['anger', 'fear', 'stress', 'affection', 'pride']

const SKILL_KEYS: (keyof ProceduralSkills)[] = [
  'chop',
  'build',
  'trade',
  'fish',
  'mine',
  'craft',
  'farm',
  'fight',
  'social',
]

export const NEED_DIM = NEED_KEYS.length
export const EMO_DIM = EMO_KEYS.length
export const SKILL_DIM = SKILL_KEYS.length

type MindPool = {
  cap: number
  count: number
  /** villager id → slot */
  slotById: Map<number, number>
  idBySlot: Int32Array
  needs: Float32Array
  emotions: Float32Array
  skills: Float32Array
  /** Predicted reward (0–1) for RPE — last chosen kind strength. */
  predictedReward: Float32Array
  stress: Float32Array
}

function alloc(cap: number): MindPool {
  return {
    cap,
    count: 0,
    slotById: new Map(),
    idBySlot: new Int32Array(cap).fill(-1),
    needs: new Float32Array(cap * NEED_DIM),
    emotions: new Float32Array(cap * EMO_DIM),
    skills: new Float32Array(cap * SKILL_DIM),
    predictedReward: new Float32Array(cap),
    stress: new Float32Array(cap),
  }
}

let pool = alloc(INITIAL_CAP)
const MINDS = new Map<number, CognitiveState>()

function grow(): void {
  const next = alloc(pool.cap * 2)
  next.count = pool.count
  next.slotById = pool.slotById
  next.idBySlot.set(pool.idBySlot)
  next.needs.set(pool.needs)
  next.emotions.set(pool.emotions)
  next.skills.set(pool.skills)
  next.predictedReward.set(pool.predictedReward)
  next.stress.set(pool.stress)
  pool = next
}

export function resetCognitionCaches(): void {
  MINDS.clear()
  pool = alloc(INITIAL_CAP)
}

export function mindPoolStats(): { minds: number; slots: number; cap: number; bytesApprox: number } {
  const bytes =
    pool.needs.byteLength +
    pool.emotions.byteLength +
    pool.skills.byteLength +
    pool.predictedReward.byteLength +
    pool.stress.byteLength +
    pool.idBySlot.byteLength
  return { minds: MINDS.size, slots: pool.count, cap: pool.cap, bytesApprox: bytes }
}

export function getMindPool(): MindPool {
  return pool
}

function ensureSlot(id: number): number {
  const existing = pool.slotById.get(id)
  if (existing !== undefined) return existing
  if (pool.count >= pool.cap) grow()
  const slot = pool.count++
  pool.slotById.set(id, slot)
  pool.idBySlot[slot] = id
  return slot
}

/** Sync hot floats from object mind → SoA (call after needs/emotion updates). */
export function syncMindToPool(id: number, mind: CognitiveState): void {
  const slot = ensureSlot(id)
  const nBase = slot * NEED_DIM
  for (let i = 0; i < NEED_DIM; i++) pool.needs[nBase + i] = mind.needs[NEED_KEYS[i]]
  const eBase = slot * EMO_DIM
  for (let i = 0; i < EMO_DIM; i++) pool.emotions[eBase + i] = mind.emotions[EMO_KEYS[i]]
  const sBase = slot * SKILL_DIM
  for (let i = 0; i < SKILL_DIM; i++) pool.skills[sBase + i] = mind.skills[SKILL_KEYS[i]]
  pool.stress[slot] = mind.emotions.stress
}

export function setPredictedReward(id: number, value: number): void {
  const slot = pool.slotById.get(id)
  if (slot === undefined) return
  pool.predictedReward[slot] = Math.max(0, Math.min(1, value))
}

export function getPredictedReward(id: number): number {
  const slot = pool.slotById.get(id)
  if (slot === undefined) return 0.4
  return pool.predictedReward[slot]
}

export function mindOf(v: Villager): CognitiveState {
  const existing = MINDS.get(v.id)
  if (existing) return existing
  const m: CognitiveState = {
    values: valuesFromPersonality(v),
    needs: emptyNeeds(),
    emotions: emptyEmotions(),
    working: [],
    broadcast: [],
    predictionErrors: [],
    processMode: 'S1',
    selfModel: emptySelfModel(),
    consciousness: emptyConsciousness(),
    episodic: [],
    semantic: [],
    skills: emptySkills(),
    preferences: seedLaborPreferences(v.personality, () => (v.seed % 1000) / 1000),
    socialModel: [],
    goal: defaultGoal(v),
    plan: null,
    lastReasons: ['esprit naissant'],
    lastFactorWhy: [],
    lastKind: null,
    lastPracticedSkill: null,
    laborThoughts: [],
    masterworkCount: 0,
    thoughts: emptyThoughts(),
    lastDeepTick: -999,
    failures: 0,
    successes: 0,
    habitIds: [],
    habits: {},
    recentActs: [],
    cultureTag: null,
    cultureWeight: 0,
    cultureFeatures: [],
    cultureTolerance: 0,
    sacredX: v.x,
    sacredY: v.y,
    sacredConf: 0,
    rivalId: null,
    buildProjectId: null,
    livelihood: emptyLivelihood(),
  }
  MINDS.set(v.id, m)
  syncMindToPool(v.id, m)
  return m
}

export function dropMind(id: number): void {
  MINDS.delete(id)
  const slot = pool.slotById.get(id)
  if (slot === undefined) return
  // Swap-remove from SoA
  const last = pool.count - 1
  if (slot !== last) {
    const movedId = pool.idBySlot[last]
    pool.idBySlot[slot] = movedId
    pool.slotById.set(movedId, slot)
    const n0 = slot * NEED_DIM
    const n1 = last * NEED_DIM
    for (let i = 0; i < NEED_DIM; i++) pool.needs[n0 + i] = pool.needs[n1 + i]
    const e0 = slot * EMO_DIM
    const e1 = last * EMO_DIM
    for (let i = 0; i < EMO_DIM; i++) pool.emotions[e0 + i] = pool.emotions[e1 + i]
    const s0 = slot * SKILL_DIM
    const s1 = last * SKILL_DIM
    for (let i = 0; i < SKILL_DIM; i++) pool.skills[s0 + i] = pool.skills[s1 + i]
    pool.predictedReward[slot] = pool.predictedReward[last]
    pool.stress[slot] = pool.stress[last]
  }
  pool.idBySlot[last] = -1
  pool.slotById.delete(id)
  pool.count = last
}

/** Internal map access for peer culture lookups without allocating. */
export function peekMind(id: number): CognitiveState | undefined {
  return MINDS.get(id)
}
