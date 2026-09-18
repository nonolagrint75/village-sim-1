import type { Memory, MemoryKind } from '../social'
import type {
  EpisodicMemory,
  ProceduralSkill,
  ProceduralSkills,
  SemanticFact,
  SemanticFactKind,
  SocialImpression,
} from './types'
import { MAX_EPISODIC, MAX_SEMANTIC, MAX_SOCIAL_MODEL } from './types'

const MEMORY_LABEL_FR: Partial<Record<MemoryKind, string>> = {
  helped: 'aide reçue',
  harmed: 'agression',
  robbed: 'vol subi',
  sawTheft: 'vol observé',
  sawKill: 'violence vue',
  grief: 'deuil',
  saved: 'sauvetage',
  goodSpot: 'bon endroit',
  dangerSpot: 'endroit dangereux',
  insulted: 'insulte',
  kinSlain: 'parent tué',
  wolfGrief: 'attaque de loups',
}

export function emptySkills(): ProceduralSkills {
  return { chop: 0.15, build: 0.12, trade: 0.1, fish: 0.1, mine: 0.1, craft: 0.12, farm: 0.12, fight: 0.1, social: 0.1 }
}

/** Place spots are keyed by nearby tile (same rule as upsertSemantic / remember). */
function isPlaceSpotKind(kind: MemoryKind): boolean {
  return kind === 'goodSpot' || kind === 'dangerSpot'
}

/**
 * Ingest legacy memory into episodic store.
 * `affectTag` (−1..1) = amygdala-like emotional amplification of encoding.
 */
export function ingestLegacyMemory(
  episodic: EpisodicMemory[],
  mem: Memory,
  tick: number,
  affectTag = 0,
): void {
  const emoBoost = 1 + Math.abs(affectTag) * 0.45
  // Place spots: proximity match (same rule as upsertSemantic / remember) — do not collapse all sites.
  const twin = isPlaceSpotKind(mem.kind)
    ? episodic.find((e) => e.kind === mem.kind && Math.abs(e.x - mem.x) + Math.abs(e.y - mem.y) < 8)
    : episodic.find((e) => e.kind === mem.kind && e.subjectId === mem.subjectId)
  if (twin) {
    twin.importance = Math.min(3, twin.importance + mem.weight * 0.45 * emoBoost)
    twin.confidence = Math.min(1, twin.confidence + 0.08)
    twin.tick = tick
    twin.lastRecall = tick
    twin.emotion = (twin.emotion + mem.emotion + affectTag * 0.35) * 0.5
    if (isPlaceSpotKind(mem.kind)) {
      twin.x = (twin.x + mem.x) * 0.5
      twin.y = (twin.y + mem.y) * 0.5
    }
    return
  }
  const participants = mem.subjectId !== null ? [mem.subjectId] : []
  episodic.push({
    kind: mem.kind,
    subjectId: mem.subjectId,
    participants,
    x: mem.x,
    y: mem.y,
    tick,
    importance: mem.weight * emoBoost,
    emotion: Math.max(-1, Math.min(1, mem.emotion + affectTag * 0.4)),
    confidence: 0.75,
    lastRecall: tick,
    label: MEMORY_LABEL_FR[mem.kind] ?? mem.kind,
  })
  if (episodic.length > MAX_EPISODIC) dropWeakestEpisode(episodic)
}

function dropWeakestEpisode(episodic: EpisodicMemory[]): void {
  let weakestI = 0
  let weakest = Infinity
  for (let i = 0; i < episodic.length; i++) {
    const e = episodic[i]
    const score = e.importance * (1 + Math.abs(e.emotion) * 0.8) * e.confidence
    if (score < weakest) {
      weakest = score
      weakestI = i
    }
  }
  episodic.splice(weakestI, 1)
}

export function decayEpisodic(episodic: EpisodicMemory[], tick: number): void {
  for (let i = episodic.length - 1; i >= 0; i--) {
    const e = episodic[i]
    const age = tick - e.lastRecall
    const emotionGuard = 1 - Math.min(0.55, Math.abs(e.emotion) * 0.35)
    const rate = age > 200 ? 0.96 : 0.992
    e.importance *= rate * (0.7 + 0.3 * emotionGuard)
    e.confidence *= 0.998
    if (e.importance < 0.07) episodic.splice(i, 1)
  }
}

/**
 * Rehearsal on decision/sense recall — strengthens matching episodes.
 * Optional `near` scopes reinforcement to the place actually used (not every spot of that kind).
 */
export function reinforceRecall(
  episodic: EpisodicMemory[],
  kind: MemoryKind,
  subjectId: number | null,
  tick: number,
  near?: { x: number; y: number; r?: number },
): void {
  const r = near?.r ?? 16
  const r2 = r * r
  for (const e of episodic) {
    if (e.kind !== kind) continue
    if (subjectId !== null && e.subjectId !== subjectId) continue
    if (near) {
      const dx = e.x - near.x
      const dy = e.y - near.y
      if (dx * dx + dy * dy > r2) continue
    }
    e.lastRecall = tick
    e.importance = Math.min(3, e.importance + 0.12)
    e.confidence = Math.min(1, e.confidence + 0.04)
  }
}

export function upsertSemantic(
  facts: SemanticFact[],
  kind: SemanticFactKind,
  label: string,
  confidence: number,
  tick: number,
  x: number,
  y: number,
  subjectId: number | null = null,
): void {
  const twin = facts.find(
    (f) => f.kind === kind && f.subjectId === subjectId && Math.abs(f.x - x) + Math.abs(f.y - y) < 12,
  )
  if (twin) {
    twin.confidence = Math.min(1, twin.confidence * 0.7 + confidence * 0.5)
    twin.tick = tick
    twin.label = label
    twin.x = (twin.x + x) * 0.5
    twin.y = (twin.y + y) * 0.5
    return
  }
  facts.push({ kind, subjectId, x, y, confidence, tick, label })
  if (facts.length > MAX_SEMANTIC) {
    facts.sort((a, b) => a.confidence - b.confidence)
    facts.shift()
  }
}

export function decaySemantic(facts: SemanticFact[]): void {
  for (let i = facts.length - 1; i >= 0; i--) {
    facts[i].confidence *= 0.997
    if (facts[i].confidence < 0.06) facts.splice(i, 1)
  }
}

export function skillForTask(kind: string): ProceduralSkill | null {
  if (kind === 'gatherWood' || kind === 'clearLand') return 'chop'
  if (kind === 'gatherStone' || kind === 'gatherIron' || kind === 'mineTunnel' || kind === 'mineGold') return 'mine'
  if (kind === 'fish') return 'fish'
  if (kind === 'tradeRun' || kind === 'buyMaterial' || kind === 'mintCoins') return 'trade'
  if (
    kind === 'sowField' ||
    kind === 'harvestWheat' ||
    kind === 'grindFlour' ||
    kind === 'bakeBread' ||
    kind === 'gatherFood' ||
    kind === 'captureSheep' ||
    kind === 'feedPen'
  ) {
    return 'farm'
  }
  if (
    kind === 'craftSpear' ||
    kind === 'craftStoneSpear' ||
    kind === 'craftIronTool' ||
    kind === 'craftGear' ||
    kind === 'craftGoods' ||
    kind === 'craftLight' ||
    kind === 'weaveCloth' ||
    kind === 'sewClothing' ||
    kind === 'tanHide' ||
    kind === 'buildWorkbench' ||
    kind === 'experiment' ||
    kind === 'makeCharcoal'
  ) {
    return 'craft'
  }
  if (kind === 'gatherFuel' || kind === 'tendHearth' || kind === 'lightTorch' || kind === 'placeCandle') {
    return kind === 'gatherFuel' ? 'chop' : 'craft'
  }
  if (kind.startsWith('build')) return 'build'
  if (kind === 'fight' || kind === 'confront' || kind === 'defend') return 'fight'
  if (kind === 'socialise' || kind === 'giveFood' || kind === 'entertain' || kind === 'counsel' || kind === 'ritual' || kind === 'teachCraft') {
    return 'social'
  }
  return null
}

/** Success / decision multiplier — skilled hands succeed more often. */
export function skillBonus(skills: ProceduralSkills, kind: string): number {
  const sk = skillForTask(kind)
  if (!sk) return 1
  // Slightly wider band so practiced crafts compete with shared survival baseScores.
  // Was 0.82 + s*0.62 (≈0.82…1.44); now ≈0.74…1.59.
  return 0.74 + skills[sk] * 0.85
}

/** Work progress per successful labor tick (speed). */
export function skillSpeedBonus(skills: ProceduralSkills, kind: string): number {
  const sk = skillForTask(kind)
  if (!sk) return 1
  return 0.72 + skills[sk] * 0.65
}

/** Yield / catch multiplier from skill. */
export function skillYieldBonus(skills: ProceduralSkills, kind: string): number {
  const sk = skillForTask(kind)
  if (!sk) return 1
  return 0.8 + skills[sk] * 0.6
}

export function practiceSkill(skills: ProceduralSkills, kind: string, success: boolean): ProceduralSkill | null {
  const sk = skillForTask(kind)
  if (!sk) return null
  const delta = success ? 0.02 : 0.006
  skills[sk] = Math.min(1, skills[sk] + delta)
  return sk
}

export function impressionOf(model: SocialImpression[], id: number): SocialImpression {
  let found = model.find((s) => s.id === id)
  if (!found) {
    found = { id, trust: 0.25, fear: 0, affection: 0, lastTick: 0, inferredGoal: null, goalConf: 0 }
    model.push(found)
    if (model.length > MAX_SOCIAL_MODEL) {
      model.sort((a, b) => Math.abs(a.trust) + Math.abs(a.affection) + a.fear - (Math.abs(b.trust) + Math.abs(b.affection) + b.fear))
      model.shift()
    }
  }
  return found
}

export function updateImpression(
  model: SocialImpression[],
  id: number,
  dTrust: number,
  dFear: number,
  dAffection: number,
  tick: number,
): void {
  const s = impressionOf(model, id)
  s.trust = clamp01(s.trust + dTrust)
  s.fear = clamp01(s.fear + dFear)
  s.affection = clamp01(s.affection + dAffection)
  s.lastTick = tick
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

export function topEpisodes(episodic: EpisodicMemory[], n = 4): EpisodicMemory[] {
  return [...episodic].sort((a, b) => b.importance * (1 + Math.abs(b.emotion)) - a.importance * (1 + Math.abs(a.emotion))).slice(0, n)
}

export function topSemantics(facts: SemanticFact[], n = 3): SemanticFact[] {
  return [...facts].sort((a, b) => b.confidence - a.confidence).slice(0, n)
}

export type KnownSpotKind = 'good' | 'danger' | 'poor'

/** Unified spot knowledge — mind semantic+episodic is authority; legacy optional fallback if mind empty. */
export function knownSpots(
  semantic: SemanticFact[],
  episodic: EpisodicMemory[],
  legacy: Memory[] | null,
  kind: KnownSpotKind,
): { x: number; y: number; weight: number; emotion: number }[] {
  const out: { x: number; y: number; weight: number; emotion: number }[] = []
  if (kind === 'good') {
    for (const f of semantic) {
      if (f.kind !== 'good_forage') continue
      out.push({ x: f.x, y: f.y, weight: f.confidence * 1.4, emotion: 0.35 })
    }
    for (const e of episodic) {
      if (e.kind !== 'goodSpot') continue
      out.push({ x: e.x, y: e.y, weight: e.importance * e.confidence, emotion: e.emotion })
    }
  } else if (kind === 'poor') {
    for (const f of semantic) {
      if (f.kind !== 'resource_scarce') continue
      out.push({ x: f.x, y: f.y, weight: f.confidence * 1.35, emotion: -0.4 })
    }
  } else {
    for (const f of semantic) {
      if (f.kind !== 'danger_spot' && f.kind !== 'wolves_near') continue
      out.push({ x: f.x, y: f.y, weight: f.confidence * 1.5, emotion: -0.55 })
    }
    for (const e of episodic) {
      if (e.kind !== 'dangerSpot' && e.kind !== 'sawKill') continue
      out.push({ x: e.x, y: e.y, weight: e.importance * e.confidence, emotion: e.emotion })
    }
  }
  if (legacy) {
    // A4: mind (semantic+episodic) is authority — legacy v.memories only if mind empty for this kind.
    const mindHad = out.length > 0
    if (!mindHad) {
      for (const m of legacy) {
        if (kind === 'good' && m.kind === 'goodSpot') {
          out.push({ x: m.x, y: m.y, weight: m.weight * 0.85, emotion: m.emotion })
        }
        if (kind === 'danger' && (m.kind === 'dangerSpot' || m.kind === 'sawKill')) {
          out.push({ x: m.x, y: m.y, weight: m.weight * 0.85, emotion: m.emotion })
        }
      }
    }
  }
  // Dedup nearby duplicates — keep strongest.
  const merged: typeof out = []
  for (const s of out) {
    const twin = merged.find((m) => Math.abs(m.x - s.x) + Math.abs(m.y - s.y) < 8)
    if (twin) {
      if (s.weight > twin.weight) {
        twin.x = s.x
        twin.y = s.y
        twin.weight = s.weight
        twin.emotion = s.emotion
      }
    } else merged.push({ ...s })
  }
  return merged
}

/**
 * A4: one-direction mirror mind → legacy `v.memories` for place spots.
 * Keeps politics/UI readers aligned without making legacy the decision authority.
 * Writes directly (no remember bridge) to avoid double-encoding episodic.
 */
export function mirrorMindSpotsToLegacy(v: { memories: Memory[] }, semantic: SemanticFact[], episodic: EpisodicMemory[], tick: number): void {
  const goods = knownSpots(semantic, episodic, null, 'good')
  const dangers = knownSpots(semantic, episodic, null, 'danger')
  const upsert = (kind: 'goodSpot' | 'dangerSpot', x: number, y: number, weight: number, emotion: number) => {
    const twin = v.memories.find((m) => m.kind === kind && Math.abs(m.x - x) + Math.abs(m.y - y) < 8)
    if (twin) {
      twin.weight = Math.max(twin.weight, Math.min(2.5, weight))
      twin.tick = tick
      twin.emotion = emotion
      return
    }
    v.memories.push({
      kind,
      subjectId: null,
      x,
      y,
      tick,
      weight: Math.min(2, weight),
      emotion,
    })
  }
  goods.sort((a, b) => b.weight - a.weight)
  dangers.sort((a, b) => b.weight - a.weight)
  for (let i = 0; i < Math.min(3, goods.length); i++) {
    const s = goods[i]!
    upsert('goodSpot', s.x, s.y, s.weight, s.emotion)
  }
  for (let i = 0; i < Math.min(3, dangers.length); i++) {
    const s = dangers[i]!
    upsert('dangerSpot', s.x, s.y, s.weight, s.emotion)
  }
  // Cap legacy list (same budget as social.remember).
  while (v.memories.length > 12) {
    let weakestI = 0
    let weakest = Infinity
    for (let i = 0; i < v.memories.length; i++) {
      const m = v.memories[i]!
      const score = m.weight * (1 + Math.abs(m.emotion))
      if (score < weakest) {
        weakest = score
        weakestI = i
      }
    }
    v.memories.splice(weakestI, 1)
  }
}

/**
 * Merge mind episodic + legacy `v.memories` for social/life events.
 * Mind is authority when both hold the same kind; legacy fills cold-mind gaps.
 * Used by politics / religion / bandits so they do not ignore cognition.
 */
export function forEachLifeEvent(
  episodic: EpisodicMemory[] | null | undefined,
  legacy: Memory[] | null | undefined,
  opts: { tick: number; maxAge?: number },
  visit: (kind: MemoryKind, eventTick: number) => void,
): void {
  const maxAge = opts.maxAge ?? 500
  const seen = new Set<string>()
  const emit = (kind: string, eventTick: number, subjectId: number | null) => {
    if (opts.tick - eventTick > maxAge) return
    const key = `${kind}|${subjectId ?? 'x'}|${Math.floor(eventTick / 8)}`
    if (seen.has(key)) return
    seen.add(key)
    visit(kind as MemoryKind, eventTick)
  }
  if (episodic) {
    for (const e of episodic) emit(e.kind, e.tick, e.subjectId)
  }
  if (legacy) {
    for (const m of legacy) emit(m.kind, m.tick, m.subjectId)
  }
}

export function hasLifeEventKind(
  episodic: EpisodicMemory[] | null | undefined,
  legacy: Memory[] | null | undefined,
  kinds: readonly MemoryKind[],
  opts: { tick: number; maxAge?: number },
): boolean {
  const want = new Set(kinds)
  let hit = false
  forEachLifeEvent(episodic, legacy, opts, (kind) => {
    if (want.has(kind)) hit = true
  })
  return hit
}

export function countLifeEventKinds(
  episodic: EpisodicMemory[] | null | undefined,
  legacy: Memory[] | null | undefined,
  kinds: readonly MemoryKind[],
  opts: { tick: number; maxAge?: number },
): number {
  const want = new Set(kinds)
  let n = 0
  forEachLifeEvent(episodic, legacy, opts, (kind) => {
    if (want.has(kind)) n++
  })
  return n
}

/** Social gossip tellables — mind episodic is authority; legacy fills cold-mind gaps. */
export const GOSSIP_TELLABLE_KINDS: readonly MemoryKind[] = [
  'sawTheft',
  'sawKill',
  'robbed',
  'helped',
  'kinSlain',
  'wolfGrief',
  'insulted',
]

const GOSSIP_TELLABLE_SET: ReadonlySet<MemoryKind> = new Set(GOSSIP_TELLABLE_KINDS)

/** Bridge signature: peek mind episodic by villager id (wired from engine, not mindPool import). */
export type EpisodicMemoryPeek = (villagerId: number) => EpisodicMemory[] | null | undefined

function isGossipTellableKind(kind: string): kind is MemoryKind {
  return GOSSIP_TELLABLE_SET.has(kind as MemoryKind)
}

/**
 * Mind-first tellable for gossip: scan episodic then legacy (dedupe kind|subject).
 * Returns a legacy-shaped Memory so callers can keep using `remember()`.
 */
export function pickBestTellableLifeEvent(
  episodic: EpisodicMemory[] | null | undefined,
  legacy: Memory[] | null | undefined,
  opts: { tick: number; excludeSubjectId: number; maxAge?: number },
): Memory | null {
  const maxAge = opts.maxAge ?? 800
  const seen = new Set<string>()
  let best: Memory | null = null

  const consider = (
    kind: MemoryKind,
    subjectId: number | null,
    x: number,
    y: number,
    eventTick: number,
    weight: number,
    emotion: number,
  ) => {
    if (subjectId === null || subjectId === opts.excludeSubjectId) return
    if (opts.tick - eventTick > maxAge) return
    if (!isGossipTellableKind(kind)) return
    const key = `${kind}|${subjectId}`
    if (seen.has(key)) return
    seen.add(key)
    if (!best || weight > best.weight) {
      best = { kind, subjectId, x, y, tick: eventTick, weight, emotion }
    }
  }

  if (episodic) {
    for (const e of episodic) {
      if (!isGossipTellableKind(e.kind)) continue
      consider(e.kind, e.subjectId, e.x, e.y, e.tick, e.importance, e.emotion)
    }
  }
  if (legacy) {
    for (const m of legacy) {
      consider(m.kind, m.subjectId, m.x, m.y, m.tick, m.weight, m.emotion)
    }
  }
  return best
}

/** True if listener already holds the same tellable (mind or legacy). */
export function hasMatchingLifeEvent(
  episodic: EpisodicMemory[] | null | undefined,
  legacy: Memory[] | null | undefined,
  kind: MemoryKind,
  subjectId: number | null,
): boolean {
  if (episodic) {
    for (const e of episodic) {
      if (e.kind === kind && e.subjectId === subjectId) return true
    }
  }
  if (legacy) {
    for (const m of legacy) {
      if (m.kind === kind && m.subjectId === subjectId) return true
    }
  }
  return false
}
