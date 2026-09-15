/**
 * Conscience individuelle (Global Workspace / self phénoménal — lite).
 * Chaque esprit a son propre flux ; jamais de workspace partagé entre agents.
 * Communication uniquement via perception / parole / rumeurs du monde.
 */

import type { Villager } from '../types'
import { isNight } from '../world'
import { processModeLabelFr } from './executive'
import { goalLabelFr } from './goals'
import type {
  CognitiveState,
  ConsciousMode,
  ConsciousState,
  WorkingConcern,
  WorkingConcernKind,
} from './types'
import { WORKSPACE_CAPACITY } from './types'

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

export function emptyConsciousness(): ConsciousState {
  return {
    contents: [],
    narrativeJe: '',
    feltAffect: '',
    goalAwareness: '',
    innerSpeech: [],
    mode: 'awake',
    accessGain: 0.55,
    lastStreamTick: -1,
    focusKinds: [],
    clarity: 0.4,
  }
}

/**
 * Biais d’attention propre à l’individu (seed + personnalité).
 * Deux agents au même lieu → contenus conscients différents.
 */
export function attentionKindWeight(v: Villager, kind: WorkingConcernKind): number {
  const p = v.personality
  // Jitter déterministe id×kind — pas de RNG partagé.
  const jitter = ((v.seed * 17 + kind.length * 47 + kind.charCodeAt(0) * 13) % 1000) / 1000
  let w = 0.82 + jitter * 0.36
  switch (kind) {
    case 'threat':
    case 'grudge':
      w *= 1.05 + (1 - p.courage) * 0.5
      break
    case 'kin':
    case 'debt':
      w *= 0.88 + p.sociability * 0.45 + p.generosity * 0.15
      break
    case 'status':
      w *= 0.8 + p.ambition * 0.55
      break
    case 'resource':
    case 'need_food':
      w *= 0.92 + p.curiosity * 0.2 + (1 - p.generosity) * 0.08
      break
    case 'need_rest':
      w *= 0.95 + (1 - p.ambition) * 0.15
      break
    case 'need_shelter':
    case 'build':
      w *= 0.85 + p.ambition * 0.25 + p.curiosity * 0.2
      break
    default:
      break
  }
  return Math.max(0.55, Math.min(1.7, w))
}

function resolveConsciousMode(
  stateTick: number,
  v: Villager,
  mind: CognitiveState,
): ConsciousMode {
  const resting = v.task?.kind === 'rest'
  const night = isNight(stateTick)
  const fatigue = mind.needs.fatigue
  if (resting && night) return 'asleep'
  if (resting && fatigue > 0.55) return 'drowsy'
  if (!resting && night && fatigue > 0.72 && mind.emotions.stress < 0.35) return 'drowsy'
  if (resting && night === false && fatigue > 0.4) return 'drowsy'
  return 'awake'
}

function feltAffectFr(mind: CognitiveState): string {
  const e = mind.emotions
  const bits: string[] = []
  const val = e.valence
  if (val > 0.25) bits.push('valence positive')
  else if (val < -0.25) bits.push('valence négative')
  else bits.push('valence neutre')
  if (e.approachAvoid > 0.2) bits.push('prêt à approcher')
  else if (e.approachAvoid < -0.2) bits.push('prêt à fuir')
  if (e.fear > 0.35) bits.push(`peur ${Math.round(e.fear * 100)}%`)
  if (e.anger > 0.35) bits.push(`colère ${Math.round(e.anger * 100)}%`)
  if (e.stress > 0.4) bits.push(`stress ${Math.round(e.stress * 100)}%`)
  if (e.affection > 0.4) bits.push(`affection ${Math.round(e.affection * 100)}%`)
  if (e.pride > 0.4) bits.push(`fierté ${Math.round(e.pride * 100)}%`)
  return bits.join(' · ')
}

function narrativeJeFr(v: Villager, mind: CognitiveState): string {
  const sm = mind.selfModel
  if (sm.narrative) return `je suis ${sm.narrative}`
  const bits = [v.name]
  if (v.surname?.trim()) bits.push(`des ${v.surname.trim()}`)
  if (v.profession !== 'none') bits.push(v.profession)
  return `je suis ${bits.join(' · ')}`
}

function dreamResidual(mind: CognitiveState, tick: number): WorkingConcern[] {
  if (mind.episodic.length === 0) return []
  const ranked = [...mind.episodic].sort(
    (a, b) => Math.abs(b.emotion) * b.importance - Math.abs(a.emotion) * a.importance,
  )
  const out: WorkingConcern[] = []
  for (let i = 0; i < Math.min(2, ranked.length); i++) {
    const e = ranked[i]!
    if (Math.abs(e.emotion) < 0.15 && e.importance < 0.35) continue
    out.push({
      kind: e.kind === 'dangerSpot' || e.kind === 'sawKill' || e.kind === 'wolfGrief' ? 'threat' : 'kin',
      label: `rêve : ${e.label || 'souvenir'}`,
      urgency: clamp01(0.25 + Math.abs(e.emotion) * 0.35),
      subjectId: e.subjectId,
      x: e.x,
      y: e.y,
      tick,
    })
  }
  return out
}

function pickInnerSpeech(mind: CognitiveState, mode: ConsciousMode): string[] {
  if (mode === 'asleep' || mode === 'dream') {
    const dream = mind.consciousness.contents.filter((c) => c.label.startsWith('rêve'))
    return dream.slice(0, 2).map((c) => c.label)
  }
  const tokens: string[] = []
  for (const c of mind.broadcast.slice(0, 3)) {
    tokens.push(c.label)
  }
  const recent = (mind.thoughts ?? []).slice(-3)
  for (const t of recent) {
    if (tokens.length >= 4) break
    if (!tokens.includes(t.text)) tokens.push(t.text)
  }
  if (mind.laborThoughts[0] && tokens.length < 4) tokens.push(mind.laborThoughts[0])
  return tokens.slice(0, 4)
}

/**
 * Met à jour la conscience privée de cet agent.
 * fullStream : narrative + parole intérieure (deep / observation UI).
 * sinon : drapeaux compacts (mode, focusKinds, accessGain).
 */
export function updateConsciousness(
  stateTick: number,
  v: Villager,
  mind: CognitiveState,
  fullStream: boolean,
): void {
  const c = mind.consciousness
  const mode = resolveConsciousMode(stateTick, v, mind)
  c.mode = mode

  if (mode === 'asleep') {
    // Espace de travail conscient vidé ; résidu onirique privé (pas de hive mind).
    const residual = dreamResidual(mind, stateTick)
    mind.broadcast = residual
    c.contents = residual.map((x) => ({ ...x }))
    c.focusKinds = residual.map((x) => x.kind)
    c.accessGain = 0.12
    c.clarity = 0.15
    mind.processMode = 'S1'
    // Mode « rêve » si du contenu onirique existe — sinon sommeil profond.
    if (residual.length > 0) c.mode = 'dream'
  } else if (mode === 'drowsy') {
    c.contents = mind.broadcast.slice(0, Math.max(1, WORKSPACE_CAPACITY - 1)).map((x) => ({ ...x }))
    c.focusKinds = c.contents.map((x) => x.kind)
    c.accessGain = 0.35
    c.clarity = 0.4
  } else {
    c.contents = mind.broadcast.slice(0, WORKSPACE_CAPACITY).map((x) => ({ ...x }))
    c.focusKinds = c.contents.map((x) => x.kind)
    const load = c.contents.reduce((s, x) => s + x.urgency, 0) / Math.max(1, WORKSPACE_CAPACITY)
    c.accessGain = clamp01(0.45 + load * 0.4 + (mind.processMode === 'S2' ? 0.15 : 0))
    c.clarity = clamp01(0.5 + c.accessGain * 0.35 - mind.emotions.stress * 0.2)
  }

  if (!fullStream && c.lastStreamTick >= 0 && stateTick - c.lastStreamTick < 12) {
    // Compact : garder la dernière narrative, rafraîchir seulement les drapeaux.
    return
  }

  c.narrativeJe = narrativeJeFr(v, mind)
  c.feltAffect = feltAffectFr(mind)
  c.goalAwareness =
    c.mode === 'asleep'
      ? 'but endormi — habitudes seulement'
      : c.mode === 'dream'
        ? 'rêve — images sans but'
        : `je vise : ${goalLabelFr(mind.goal.id)}`
  c.innerSpeech = pickInnerSpeech(mind, c.mode)
  c.lastStreamTick = stateTick
}

/**
 * Biais d’accès conscient → chooseTask.
 * Ce qui n’est pas dans contents n’a qu’une influence faible (préconscient).
 */
export function consciousAccessBias(mind: CognitiveState, kind: WorkingConcernKind): number {
  const c = mind.consciousness
  if (!c || c.mode === 'asleep' || c.mode === 'dream') return 0
  let best = 0
  for (const item of c.contents) {
    if (item.kind === kind && item.urgency > best) best = item.urgency
  }
  return best * c.accessGain
}

export function consciousModeLabelFr(mode: ConsciousMode): string {
  switch (mode) {
    case 'awake':
      return 'éveillé'
    case 'drowsy':
      return 'assoupi'
    case 'asleep':
      return 'endormi'
    case 'dream':
      return 'rêve'
    default:
      return mode
  }
}

/** Paquet UI « Conscience » — flux unique au villageois sélectionné. */
export type ConscienceDebug = {
  mode: string
  narrativeJe: string
  feltAffect: string
  goalAwareness: string
  awareOf: string[]
  innerSpeech: string[]
  process: string
  clarity: number
  accessGain: number
}

export function packConscienceDebug(mind: CognitiveState): ConscienceDebug {
  const c = mind.consciousness
  return {
    mode: consciousModeLabelFr(c.mode),
    narrativeJe: c.narrativeJe || 'je…',
    feltAffect: c.feltAffect || 'affect indifférencié',
    goalAwareness: c.goalAwareness || `je vise : ${goalLabelFr(mind.goal.id)}`,
    awareOf: c.contents.map((x) => x.label),
    innerSpeech: c.innerSpeech.slice(0, 4),
    process: processModeLabelFr(mind.processMode),
    clarity: c.clarity,
    accessGain: c.accessGain,
  }
}
