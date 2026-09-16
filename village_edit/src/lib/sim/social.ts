import type { Personality, SimState, Villager } from './types'
import { CHILD_AGE, ELDER_AGE } from './ages'
import { calendarStamp, isGatheringHourTick, TICKS_PER_YEAR } from './calendar'

export type MemoryKind =
  | 'helped'
  | 'harmed'
  | 'robbed'
  | 'sawTheft'
  | 'sawKill'
  | 'sawAssault'
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
  | 'talk'
  | 'grief'
  | 'forgave'
  | 'admire'
  | 'kinDeath'
  | 'wolf'

export interface RelEvent {
  kind: RelEventKind
  tick: number
  /** Micro-sujet FR (parole / rumeur / besoin) — optionnel. */
  topic?: string
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

const MAX_MEMORIES = 12
const MAX_RELATIONS = 20
const MAX_HISTORY = 6
const MEMORY_DECAY = 0.9985
/** Ticks without friend/family contact before loneliness spikes. */
export const SOCIAL_CONTACT_STALE = 180
/** ~1 mois sim — re-évalue l’ambition (plus figée au spawn). */
export const AMBITION_REEVAL_PERIOD = Math.max(180, Math.round(TICKS_PER_YEAR / 12))

const AMBITION_FR: Record<Ambition, string> = {
  survive: 'la survie',
  wealth: 'la fortune',
  family: 'la famille',
  protector: 'protéger les siens',
  builder: 'bâtir',
  explorer: 'l’horizon',
  revenge: 'la vengeance',
  leader: 'mener les autres',
}

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

/** Scores de vie (personnalité + situation) — sans import politics/inventory. */
export function scoreAmbitionLife(state: SimState, v: Villager): Record<Ambition, number> {
  const p = v.personality
  const scores: Record<Ambition, number> = {
    survive: 0.28,
    wealth: (1 - p.generosity) * 0.85 + p.ambition * 0.5,
    family: p.generosity * 0.7 + p.sociability * 0.55,
    protector: p.courage * 0.85 + p.generosity * 0.35,
    builder: p.ambition * 0.85 + p.sociability * 0.25,
    explorer: p.curiosity * 1.05,
    leader: p.sociability * 0.65 + p.ambition * 0.65 + p.courage * 0.3,
    revenge: 0,
  }

  if (v.hunger < 1.6 || v.health < 3) scores.survive += 0.85
  if (!v.hasHome) {
    scores.builder += 0.5
    scores.survive += 0.25
  } else if (v.homeOwnerId === v.id) {
    scores.builder += 0.2
    scores.family += 0.1
  }
  if (v.hasCart || v.profession === 'trader') scores.wealth += 0.4
  if (v.profession === 'guard' || v.toolTier !== 'none') scores.protector += 0.3
  if (v.profession === 'builder' || v.profession === 'mason' || v.profession === 'lumberjack') {
    scores.builder += 0.35
  }
  if (v.profession === 'forager' || v.boatId !== null) scores.explorer += 0.2

  let kids = 0
  for (const o of state.villagers) {
    if (!o.alive) continue
    if (o.parentIds.includes(v.id)) kids++
  }
  if (v.spouseId !== null) scores.family += 0.4
  if (kids > 0) scores.family += 0.25 + Math.min(3, kids) * 0.12
  if (v.age < CHILD_AGE) scores.explorer += 0.15
  if (v.age > ELDER_AGE) {
    scores.family += 0.2
    scores.leader += 0.15
    scores.explorer *= 0.7
  }

  if (v.grudgeTarget !== null) scores.revenge += 1.35
  else {
    for (const [, rel] of v.relations) {
      if ((rel.grudge ?? 0) > 0.6) {
        scores.revenge += 0.35
        scores.protector += 0.1
        break
      }
    }
  }

  // Sticky bias toward current ambition (hysteresis).
  scores[v.ambition] = (scores[v.ambition] ?? 0) + 0.42
  return scores
}

/**
 * Re-évalue périodiquement l’ambition. Garde `revenge` tant que la cible existe.
 * Retourne la nouvelle ambition si changement, sinon null.
 */
export function reevaluateAmbition(state: SimState, v: Villager, rng: () => number): Ambition | null {
  if (!v.alive) return null
  if (v.ambition === 'revenge' && v.grudgeTarget !== null) {
    const target = state.villagers.find((o) => o.id === v.grudgeTarget && o.alive)
    if (target) return null
  }

  const scores = scoreAmbitionLife(state, v)
  let best: Ambition = v.ambition
  let bestScore = -Infinity
  for (const key of Object.keys(scores) as Ambition[]) {
    const jittered = scores[key] * (0.72 + rng() * 0.56)
    if (jittered > bestScore) {
      bestScore = jittered
      best = key
    }
  }

  const currentScore = scores[v.ambition] * 1.05
  if (best === v.ambition || bestScore < currentScore * 1.12) return null

  const prev = v.ambition
  v.ambition = best
  if (rng() < 0.45) {
    logEvent(state, `${v.name} aspire désormais à ${AMBITION_FR[best]} (loin de ${AMBITION_FR[prev]})`)
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

export function recordRelHistory(
  v: Villager,
  otherId: number,
  kind: RelEventKind,
  tick: number,
  topic?: string,
) {
  const rel = relationWith(v, otherId)
  const last = rel.history[rel.history.length - 1]
  if (last && last.kind === kind && tick - last.tick < 40) {
    last.tick = tick
    if (topic) last.topic = topic
    return
  }
  rel.history.push(topic ? { kind, tick, topic } : { kind, tick })
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

export function remember(v: Villager, mem: Memory) {
  const twin = v.memories.find((m) => m.kind === mem.kind && m.subjectId === mem.subjectId)
  if (twin) {
    twin.weight = Math.min(3, twin.weight + mem.weight * 0.6)
    twin.tick = mem.tick
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

const MEMORY_TOPIC_FR: Record<MemoryKind, string> = {
  helped: 'une aide reçue',
  harmed: 'un affront',
  robbed: 'un vol',
  sawTheft: 'un larcin aperçu',
  sawKill: 'un meurtre vu',
  sawAssault: 'une agression vue',
  grief: 'un deuil',
  saved: 'un sauvetage',
  goodSpot: 'un bon coin',
  dangerSpot: 'un lieu dangereux',
  insulted: 'une injure',
  kinSlain: 'un parent tué',
  wolfGrief: 'les loups',
}

type NeedBag = {
  hunger?: number
  thirst?: number
  safety?: number
  social?: number
  belonging?: number
  piety?: number
  warmth?: number
  boredom?: number
  fatigue?: number
  shelter?: number
}

const NEED_TOPIC_FR: { key: keyof NeedBag; label: string }[] = [
  { key: 'hunger', label: 'la faim' },
  { key: 'thirst', label: 'la soif' },
  { key: 'safety', label: 'les dangers' },
  { key: 'social', label: 'la solitude' },
  { key: 'belonging', label: 'le village' },
  { key: 'piety', label: 'le sacré' },
  { key: 'warmth', label: 'le froid' },
  { key: 'boredom', label: 'l’ennui' },
  { key: 'fatigue', label: 'la fatigue' },
  { key: 'shelter', label: 'un toit' },
]

function villagerName(state: SimState, id: number | null | undefined): string | null {
  if (id == null) return null
  return state.villagers.find((o) => o.id === id)?.name ?? null
}

/** Micro-sujet FR dérivé d’un souvenir (pour parole / RelEvent). */
export function topicFromMemory(state: SimState, m: Memory): string {
  const base = MEMORY_TOPIC_FR[m.kind] ?? 'un souvenir'
  const name = villagerName(state, m.subjectId)
  return name ? `${name} — ${base}` : base
}

/**
 * Choisit un micro-sujet de conversation depuis mémoire, rumeur locale, ou besoin.
 * Toujours retourne une courte phrase FR.
 */
export function pickConversationTopic(
  state: SimState,
  speaker: Villager,
  listener: Villager,
  rng: () => number,
  needs?: NeedBag,
): string {
  const candidates: { text: string; w: number }[] = []

  for (const m of speaker.memories) {
    if (m.weight < 0.35) continue
    if (m.subjectId === listener.id) continue
    candidates.push({
      text: topicFromMemory(state, m),
      w: 0.45 + m.weight * 0.55 + Math.abs(m.emotion) * 0.3,
    })
  }

  for (const r of state.rumors) {
    if (r.intensity < 0.2) continue
    const known = r.knownBy.includes(speaker.id)
    const dx = r.x - speaker.x
    const dy = r.y - speaker.y
    const near = dx * dx + dy * dy < 22 * 22
    if (!known && !near) continue
    const about = villagerName(state, r.aboutId) ?? villagerName(state, r.subjectId)
    const raw = (r.text || '').trim()
    const short = raw.length > 42 ? `${raw.slice(0, 40)}…` : raw
    const text = short || (about ? `rumeur sur ${about}` : 'une rumeur')
    candidates.push({ text, w: 0.35 + r.intensity * 0.7 + (known ? 0.25 : 0) })
  }

  if (needs) {
    for (const spec of NEED_TOPIC_FR) {
      const v = needs[spec.key] ?? 0
      if (v < 0.48) continue
      candidates.push({ text: spec.label, w: 0.25 + v * 0.9 })
    }
  }

  candidates.push({ text: 'le temps qu’il fait', w: 0.12 })
  candidates.push({ text: 'les récoltes', w: 0.1 + (speaker.profession === 'farmer' ? 0.2 : 0) })
  if (speaker.spouseId === listener.id) candidates.push({ text: 'le foyer', w: 0.35 })
  if (relationWith(speaker, listener.id).kinship > 0.4) candidates.push({ text: 'la famille', w: 0.3 })

  let total = 0
  for (const c of candidates) total += c.w
  let roll = rng() * Math.max(0.001, total)
  for (const c of candidates) {
    roll -= c.w
    if (roll <= 0) return c.text
  }
  return candidates[candidates.length - 1]?.text ?? 'la vie au village'
}

export function gossip(a: Villager, b: Villager, tick: number, state?: SimState): Memory | null {
  const tellable = a.memories.filter(
    (m) =>
      m.subjectId !== null &&
      m.subjectId !== b.id &&
      (m.kind === 'sawTheft' ||
        m.kind === 'sawKill' ||
        m.kind === 'sawAssault' ||
        m.kind === 'robbed' ||
        m.kind === 'helped' ||
        m.kind === 'kinSlain' ||
        m.kind === 'wolfGrief' ||
        m.kind === 'insulted'),
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
    if (story.kind === 'kinSlain' || story.kind === 'sawKill') {
      escalateGrudge(b, story.subjectId, 0.08 * credibility, tick)
      recordRelHistory(b, story.subjectId, 'kinDeath', tick)
    }
  }
  const topic = state ? topicFromMemory(state, story) : MEMORY_TOPIC_FR[story.kind]
  recordRelHistory(a, b.id, 'gossip', tick, topic)
  recordRelHistory(b, a.id, 'gossip', tick, topic)
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
  if (state.log.length > 400) state.log.shift()
}

/** Evening window for soft plaza gatherings (not a scripted festival). */
export function isGatheringHour(tick: number): boolean {
  return isGatheringHourTick(tick)
}
