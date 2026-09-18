import type { Personality, SimState, Villager } from './types'
import { calendarStamp, isGatheringHourTick } from './calendar'
import {
  hasMatchingLifeEvent,
  pickBestTellableLifeEvent,
  type EpisodicMemoryPeek,
} from './cognition/memory'

export type MemoryKind =
  | 'helped'
  | 'harmed'
  | 'robbed'
  | 'sawTheft'
  | 'sawKill'
  | 'grief'
  | 'saved'
  | 'goodSpot'
  | 'dangerSpot'
  | 'insulted'
  | 'kinSlain'
  | 'wolfGrief'

export interface Memory {
  kind: MemoryKind
  subjectId: number | null
  x: number
  y: number
  tick: number
  weight: number
  emotion: number
}

/** Compact chronicle of notable beats with one person (DF-ish relationship history). */
export type RelEventKind =
  | 'met'
  | 'gift'
  | 'helped'
  | 'theft'
  | 'fight'
  | 'gossip'
  | 'grief'
  | 'forgave'
  | 'admire'
  | 'kinDeath'
  | 'wolf'

export interface RelEvent {
  kind: RelEventKind
  tick: number
}

export interface Relation {
  affinity: number
  trust: number
  lastTick: number
  /** Positive: they owe this villager (favour / food / protection). */
  debt: number
  /** Soft feud intensity beyond affinity (feeds group formation & confront). */
  grudge: number
  /** 0–1 family bond (parents, children, siblings). */
  kinship: number
  /** 0–1 admiration / respect (skill, wealth, leadership). */
  respect: number
  /** Recent shared history — capped, oldest drop first. */
  history: RelEvent[]
}

export type Ambition = 'survive' | 'wealth' | 'family' | 'protector' | 'builder' | 'explorer' | 'revenge' | 'leader'

const MAX_MEMORIES = 24
const MAX_RELATIONS = 32
const MAX_HISTORY = 8
const MEMORY_DECAY = 0.9985
/** Ticks without friend/family contact before loneliness spikes. */
export const SOCIAL_CONTACT_STALE = 180

/** Phase A budget mirrors (emergence protocol ≤32 relations / ≤32 memories). */
export const RELATION_BUDGET = MAX_RELATIONS
export const MEMORY_BUDGET = MAX_MEMORIES
export const REL_HISTORY_BUDGET = MAX_HISTORY

export function pickAmbition(p: Personality, rng: () => number): Ambition {
  const scores: Record<Ambition, number> = {
    survive: 0.3,
    wealth: (1 - p.generosity) * 0.9 + p.ambition * 0.5,
    family: p.generosity * 0.7 + p.sociability * 0.6,
    protector: p.courage * 0.9 + p.generosity * 0.4,
    builder: p.ambition * 0.9 + p.sociability * 0.3,
    explorer: p.curiosity * 1.1,
    leader: p.sociability * 0.7 + p.ambition * 0.7 + p.courage * 0.3,
    revenge: 0,
  }
  let best: Ambition = 'survive'
  let bestScore = -Infinity
  for (const key of Object.keys(scores) as Ambition[]) {
    const jittered = scores[key] * (0.7 + rng() * 0.6)
    if (jittered > bestScore) {
      bestScore = jittered
      best = key
    }
  }
  return best
}

function ensureRelationFields(rel: Relation): Relation {
  if (rel.respect === undefined) rel.respect = 0
  if (!rel.history) rel.history = []
  return rel
}

export function relationWith(v: Villager, otherId: number): Relation {
  let rel = v.relations.get(otherId)
  if (!rel) {
    rel = {
      affinity: 0,
      trust: 0.25,
      lastTick: 0,
      debt: 0,
      grudge: 0,
      kinship: 0,
      respect: 0,
      history: [],
    }
    if (v.relations.size >= MAX_RELATIONS) {
      let weakest: number | null = null
      let weakestScore = Infinity
      for (const [id, r] of v.relations) {
        const er = ensureRelationFields(r)
        const score =
          Math.abs(er.affinity) + er.trust * 0.2 + er.kinship * 0.5 + er.respect * 0.25 + er.grudge * 0.35
        if (score < weakestScore) {
          weakestScore = score
          weakest = id
        }
      }
      if (weakest !== null) v.relations.delete(weakest)
    }
    v.relations.set(otherId, rel)
  }
  return ensureRelationFields(rel)
}

export function adjustRelation(v: Villager, otherId: number, dAffinity: number, dTrust: number, tick: number) {
  const rel = relationWith(v, otherId)
  rel.affinity = Math.max(-1, Math.min(1, rel.affinity + dAffinity))
  rel.trust = Math.max(0, Math.min(1, rel.trust + dTrust))
  rel.lastTick = tick
}

export function recordRelHistory(v: Villager, otherId: number, kind: RelEventKind, tick: number) {
  const rel = relationWith(v, otherId)
  const last = rel.history[rel.history.length - 1]
  if (last && last.kind === kind && tick - last.tick < 40) {
    last.tick = tick
    return
  }
  rel.history.push({ kind, tick })
  if (rel.history.length > MAX_HISTORY) rel.history.shift()
  rel.lastTick = tick
}

export function bumpRespect(v: Villager, otherId: number, delta: number, tick: number) {
  const rel = relationWith(v, otherId)
  const before = rel.respect
  rel.respect = Math.max(0, Math.min(1, rel.respect + delta))
  rel.lastTick = tick
  if (rel.respect > 0.55 && before <= 0.55) recordRelHistory(v, otherId, 'admire', tick)
}

/** Soft forgiveness: gifts / socialising slowly melt grudges and debt. */
export function softenGrudge(v: Villager, otherId: number, amount: number, tick: number) {
  const rel = relationWith(v, otherId)
  if (rel.grudge <= 0 && rel.debt <= 0) return
  const prev = rel.grudge
  rel.grudge = Math.max(0, rel.grudge - amount)
  rel.debt = Math.max(0, rel.debt - amount * 0.6)
  rel.lastTick = tick
  if (prev > 0.25 && rel.grudge < 0.15) recordRelHistory(v, otherId, 'forgave', tick)
  if (v.grudgeTarget === otherId && rel.grudge < 0.2 && rel.affinity > -0.25) {
    v.grudgeTarget = null
    if (v.ambition === 'revenge') v.ambition = 'survive'
  }
}

export function escalateGrudge(v: Villager, otherId: number, amount: number, tick: number) {
  const rel = relationWith(v, otherId)
  rel.grudge = Math.min(1, rel.grudge + amount)
  rel.lastTick = tick
}

/** How stale social contact with friends / family is (0 = fresh, 1 = isolated). */
export function lonelinessPressure(v: Villager, tick: number): number {
  let bestFriendAge = SOCIAL_CONTACT_STALE * 2
  let bestKinAge = SOCIAL_CONTACT_STALE * 2
  let hasFriend = false
  let hasKin = false
  for (const [, rel] of v.relations) {
    const er = ensureRelationFields(rel)
    const age = tick - (er.lastTick || 0)
    if (er.affinity > 0.35 || er.respect > 0.5) {
      hasFriend = true
      if (age < bestFriendAge) bestFriendAge = age
    }
    if (er.kinship > 0.4) {
      hasKin = true
      if (age < bestKinAge) bestKinAge = age
    }
  }
  if (v.spouseId !== null) {
    const sp = v.relations.get(v.spouseId)
    if (sp) {
      hasKin = true
      const age = tick - (ensureRelationFields(sp).lastTick || 0)
      if (age < bestKinAge) bestKinAge = age
    }
  }
  if (!hasFriend && !hasKin) return 0.55 + v.personality.sociability * 0.35
  const friendLone = hasFriend ? Math.min(1, bestFriendAge / SOCIAL_CONTACT_STALE) : 0.7
  const kinLone = hasKin ? Math.min(1, bestKinAge / SOCIAL_CONTACT_STALE) : 0.4
  return Math.max(friendLone, kinLone * 0.85) * (0.55 + v.personality.sociability * 0.45)
}

/** Optional bridge into cognition episodic/semantic (avoids circular imports). */
let rememberBridge: ((v: Villager, mem: Memory) => void) | null = null

export function setRememberBridge(fn: ((v: Villager, mem: Memory) => void) | null) {
  rememberBridge = fn
}

/**
 * Optional peek into mind episodic without importing mindPool (avoids social ↔ mindPool cycle).
 * Wired from engine via peekMind(id)?.episodic.
 */
let episodicPeek: EpisodicMemoryPeek | null = null

export function setEpisodicPeekBridge(fn: EpisodicMemoryPeek | null) {
  episodicPeek = fn
}

/** Place spots are keyed by location; social memories by kind+subject. */
function isPlaceSpot(kind: MemoryKind): boolean {
  return kind === 'goodSpot' || kind === 'dangerSpot'
}

export function remember(v: Villager, mem: Memory) {
  // Spots: match nearby tile so multiple forage/danger sites don't collapse to one twin.
  const twin = isPlaceSpot(mem.kind)
    ? v.memories.find((m) => m.kind === mem.kind && Math.abs(m.x - mem.x) + Math.abs(m.y - mem.y) < 8)
    : v.memories.find((m) => m.kind === mem.kind && m.subjectId === mem.subjectId)
  if (twin) {
    twin.weight = Math.min(3, twin.weight + mem.weight * 0.6)
    twin.tick = mem.tick
    twin.emotion = (twin.emotion + mem.emotion) * 0.5
    if (isPlaceSpot(mem.kind)) {
      twin.x = (twin.x + mem.x) * 0.5
      twin.y = (twin.y + mem.y) * 0.5
    }
    rememberBridge?.(v, twin)
    return
  }
  v.memories.push(mem)
  if (v.memories.length > MAX_MEMORIES) {
    let weakestIndex = 0
    let weakest = Infinity
    for (let i = 0; i < v.memories.length; i++) {
      const m = v.memories[i]
      const score = m.weight * (1 + Math.abs(m.emotion))
      if (score < weakest) {
        weakest = score
        weakestIndex = i
      }
    }
    v.memories.splice(weakestIndex, 1)
  }
  rememberBridge?.(v, mem)
}

export function decayMemories(v: Villager) {
  for (let i = v.memories.length - 1; i >= 0; i--) {
    v.memories[i].weight *= MEMORY_DECAY
    if (v.memories[i].weight < 0.08) v.memories.splice(i, 1)
  }
}

export function strongestGrudge(v: Villager): { id: number; intensity: number } | null {
  let worstId: number | null = null
  let worstIntensity = 0.35
  for (const [id, rel] of v.relations) {
    const er = ensureRelationFields(rel)
    const intensity = Math.max(0, -er.affinity) + er.grudge * 0.55
    if (intensity > worstIntensity) {
      worstIntensity = intensity
      worstId = id
    }
  }
  return worstId === null ? null : { id: worstId, intensity: worstIntensity }
}

export function strongestAdmiration(v: Villager): { id: number; respect: number } | null {
  let bestId: number | null = null
  let best = 0.4
  for (const [id, rel] of v.relations) {
    const er = ensureRelationFields(rel)
    if (er.respect > best) {
      best = er.respect
      bestId = id
    }
  }
  return bestId === null ? null : { id: bestId, respect: best }
}

export function gossip(a: Villager, b: Villager, tick: number): Memory | null {
  // Mind-first tellables (episodic via peek bridge); legacy `v.memories` fills cold-mind gaps.
  const story = pickBestTellableLifeEvent(episodicPeek?.(a.id), a.memories, {
    tick,
    excludeSubjectId: b.id,
  })
  if (!story) return null
  if (hasMatchingLifeEvent(episodicPeek?.(b.id), b.memories, story.kind, story.subjectId)) return null

  const credibility = 0.35 + relationWith(b, a.id).trust * 0.5
  remember(b, {
    kind: story.kind,
    subjectId: story.subjectId,
    x: story.x,
    y: story.y,
    tick,
    weight: story.weight * credibility * 0.7,
    emotion: story.emotion,
  })
  if (story.subjectId !== null) {
    adjustRelation(b, story.subjectId, story.emotion * 0.25 * credibility, story.emotion * 0.2 * credibility, tick)
    if (story.kind === 'kinSlain' || story.kind === 'sawKill') {
      escalateGrudge(b, story.subjectId, 0.08 * credibility, tick)
      recordRelHistory(b, story.subjectId, 'kinDeath', tick)
    }
  }
  recordRelHistory(a, b.id, 'gossip', tick)
  recordRelHistory(b, a.id, 'gossip', tick)
  return story
}

export function broadcastWitness(
  state: SimState,
  actor: Villager,
  kind: MemoryKind,
  emotion: number,
  weight: number,
  radius: number,
  exceptId?: number,
) {
  for (const w of state.villagers) {
    if (!w.alive || w.id === actor.id || w.id === exceptId) continue
    const dx = w.x - actor.x
    const dy = w.y - actor.y
    if (dx * dx + dy * dy > radius * radius) continue
    remember(w, { kind, subjectId: actor.id, x: actor.x, y: actor.y, tick: state.tick, weight, emotion })
    adjustRelation(w, actor.id, emotion * 0.3, emotion * 0.25, state.tick)
  }
}

/** Share a traumatic death memory across spouse / parents / children / household. */
export function shareFamilyTrauma(
  state: SimState,
  victim: Villager,
  kind: 'kinSlain' | 'wolfGrief',
  subjectId: number | null,
  weight: number,
) {
  const kinIds = new Set<number>()
  if (victim.spouseId !== null) kinIds.add(victim.spouseId)
  for (const id of victim.parentIds) kinIds.add(id)
  for (const o of state.villagers) {
    if (!o.alive || o.id === victim.id) continue
    if (o.parentIds.includes(victim.id) || victim.parentIds.includes(o.id)) kinIds.add(o.id)
    if (o.spouseId === victim.id) kinIds.add(o.id)
    if (victim.familyId !== null && o.familyId === victim.familyId) kinIds.add(o.id)
    if (victim.lineageId !== null && o.lineageId === victim.lineageId && o.surname === victim.surname) {
      kinIds.add(o.id)
    }
  }
  for (const id of kinIds) {
    const kin = state.villagers.find((o) => o.id === id && o.alive)
    if (!kin) continue
    remember(kin, {
      kind,
      subjectId,
      x: victim.x,
      y: victim.y,
      tick: state.tick,
      weight,
      emotion: -1,
    })
    if (subjectId !== null) {
      adjustRelation(kin, subjectId, -0.55, -0.45, state.tick)
      escalateGrudge(kin, subjectId, 0.35, state.tick)
      recordRelHistory(kin, subjectId, kind === 'wolfGrief' ? 'wolf' : 'kinDeath', state.tick)
      const willing = 0.45 + kin.personality.courage * 0.4 + (relationWith(kin, victim.id).kinship || 0.5) * 0.3
      if (willing > 0.7 && kin.grudgeTarget === null && kind === 'kinSlain') {
        kin.grudgeTarget = subjectId
        kin.ambition = 'revenge'
        logEvent(state, `${kin.name} hérite de la rancune de ${victim.name}`)
      }
    }
  }
}

export function logEvent(state: SimState, text: string) {
  state.log.push(`[${calendarStamp(state.tick)}] ${text}`)
  if (state.log.length > 900) state.log.shift()
}

/** Evening window for soft plaza gatherings (not a scripted festival). */
export function isGatheringHour(tick: number): boolean {
  return isGatheringHourTick(tick)
}
