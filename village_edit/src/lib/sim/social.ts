import type { Personality, SimState, Villager } from './types'

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

export interface Memory {
  kind: MemoryKind
  subjectId: number | null
  x: number
  y: number
  tick: number
  weight: number
  emotion: number
}

export interface Relation {
  affinity: number
  trust: number
  lastTick: number
}

export type Ambition = 'survive' | 'wealth' | 'family' | 'protector' | 'builder' | 'explorer' | 'revenge' | 'leader'

const MAX_MEMORIES = 12
const MAX_RELATIONS = 20
const MEMORY_DECAY = 0.9985

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

export function relationWith(v: Villager, otherId: number): Relation {
  let rel = v.relations.get(otherId)
  if (!rel) {
    rel = { affinity: 0, trust: 0.25, lastTick: 0 }
    if (v.relations.size >= MAX_RELATIONS) {
      let weakest: number | null = null
      let weakestScore = Infinity
      for (const [id, r] of v.relations) {
        const score = Math.abs(r.affinity) + r.trust * 0.2
        if (score < weakestScore) {
          weakestScore = score
          weakest = id
        }
      }
      if (weakest !== null) v.relations.delete(weakest)
    }
    v.relations.set(otherId, rel)
  }
  return rel
}

export function adjustRelation(v: Villager, otherId: number, dAffinity: number, dTrust: number, tick: number) {
  const rel = relationWith(v, otherId)
  rel.affinity = Math.max(-1, Math.min(1, rel.affinity + dAffinity))
  rel.trust = Math.max(0, Math.min(1, rel.trust + dTrust))
  rel.lastTick = tick
}

export function remember(v: Villager, mem: Memory) {
  const twin = v.memories.find((m) => m.kind === mem.kind && m.subjectId === mem.subjectId)
  if (twin) {
    twin.weight = Math.min(3, twin.weight + mem.weight * 0.6)
    twin.tick = mem.tick
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
}

export function decayMemories(v: Villager) {
  for (let i = v.memories.length - 1; i >= 0; i--) {
    v.memories[i].weight *= MEMORY_DECAY
    if (v.memories[i].weight < 0.08) v.memories.splice(i, 1)
  }
}

export function strongestGrudge(v: Villager): { id: number; intensity: number } | null {
  let worstId: number | null = null
  let worst = -0.35
  for (const [id, rel] of v.relations) {
    if (rel.affinity < worst) {
      worst = rel.affinity
      worstId = id
    }
  }
  return worstId === null ? null : { id: worstId, intensity: -worst }
}

export function gossip(a: Villager, b: Villager, tick: number): Memory | null {
  const tellable = a.memories.filter(
    (m) => m.subjectId !== null && m.subjectId !== b.id && (m.kind === 'sawTheft' || m.kind === 'sawKill' || m.kind === 'robbed' || m.kind === 'helped'),
  )
  if (tellable.length === 0) return null
  const story = tellable.reduce((best, m) => (m.weight > best.weight ? m : best), tellable[0])
  const already = b.memories.some((m) => m.kind === story.kind && m.subjectId === story.subjectId)
  if (already) return null

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
  }
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

export function logEvent(state: SimState, text: string) {
  state.log.push(`[${state.year}·${state.season}] ${text}`)
  if (state.log.length > 120) state.log.shift()
}
