/**
 * Pensées DF-like : événement → pensée courte (FR) + valence + Δstress.
 * Types canoniques dans ./types — ce module n’en définit pas de doublons.
 */

import type { EmotionEvent } from './emotions'
import type { CognitiveState, NeedPressures, Thought, ThoughtSource } from './types'
import { MAX_THOUGHTS } from './types'

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

export function emptyThoughts(): Thought[] {
  return []
}

/** Push with cap — drop oldest when full (LOD-friendly). */
export function pushThought(
  mind: CognitiveState,
  text: string,
  valence: number,
  stressDelta: number,
  tick: number,
  source: ThoughtSource,
): void {
  if (!mind.thoughts) mind.thoughts = []
  mind.thoughts.push({
    text,
    valence: Math.max(-1, Math.min(1, valence)),
    stressDelta,
    tick,
    source,
  })
  mind.emotions.stress = clamp01(mind.emotions.stress + stressDelta)
  if (mind.thoughts.length > MAX_THOUGHTS) mind.thoughts.shift()
}

const NEED_THOUGHT: Partial<Record<keyof NeedPressures, { bad: string; valence: number; stress: number }>> = {
  hunger: { bad: 'le ventre crie', valence: -0.45, stress: 0.06 },
  fatigue: { bad: 'les membres lourds', valence: -0.3, stress: 0.04 },
  safety: { bad: 'peur dans le dos', valence: -0.5, stress: 0.08 },
  social: { bad: 'seul au monde', valence: -0.25, stress: 0.03 },
  belonging: { bad: 'exclu du cercle', valence: -0.35, stress: 0.04 },
  shelter: { bad: 'sans toit', valence: -0.4, stress: 0.05 },
  status: { bad: 'rang trop bas', valence: -0.2, stress: 0.02 },
  purpose: { bad: 'à quoi bon', valence: -0.25, stress: 0.03 },
  creative: { bad: 'mains sans ouvrage', valence: -0.2, stress: 0.02 },
  piety: { bad: 'loin du sacré', valence: -0.2, stress: 0.025 },
  boredom: { bad: 'l’ennui ronge', valence: -0.22, stress: 0.03 },
  light: { bad: 'trop sombre pour voir', valence: -0.4, stress: 0.07 },
  warmth: { bad: 'les membres gèlent', valence: -0.45, stress: 0.08 },
}

/** Unmet needs → negative thoughts (LOD: only above threshold). */
export function thoughtsFromNeeds(mind: CognitiveState, tick: number, sparse = false): void {
  const keys = Object.keys(NEED_THOUGHT) as (keyof NeedPressures)[]
  const step = sparse ? 2 : 1
  const start = sparse ? tick % step : 0
  for (let i = start; i < keys.length; i += step) {
    const key = keys[i]
    const v = mind.needs[key]
    const spec = NEED_THOUGHT[key]
    if (!spec || v < 0.55) continue
    const recent = mind.thoughts?.some((t) => t.source === `need_${key}` && tick - t.tick < 20)
    if (recent) continue
    pushThought(mind, spec.bad, spec.valence, spec.stress, tick, `need_${key}`)
  }
}

const EVENT_THOUGHT: Partial<Record<EmotionEvent, { text: string; valence: number; stress: number }>> = {
  wolf: { text: 'des loups rôdent', valence: -0.55, stress: 0.1 },
  bandit: { text: 'des brigands rôdent', valence: -0.5, stress: 0.1 },
  famine: { text: 'la famine mord', valence: -0.55, stress: 0.12 },
  build_success: { text: 'l’ouvrage tient', valence: 0.4, stress: -0.05 },
  trade_success: { text: 'bon marché conclu', valence: 0.35, stress: -0.03 },
  death_kin: { text: 'deuil proche', valence: -0.75, stress: 0.15 },
  death_seen: { text: 'la mort a passé', valence: -0.4, stress: 0.08 },
  social: { text: 'bonne conversation', valence: 0.4, stress: -0.06 },
  gift: { text: 'un don réchauffe', valence: 0.5, stress: -0.07 },
  good_meal: { text: 'repas savoureux', valence: 0.55, stress: -0.08 },
  new_home: { text: 'enfin un foyer', valence: 0.7, stress: -0.1 },
  wolf_survived: { text: 'échappé au loup', valence: 0.5, stress: -0.07 },
  belonging_warm: { text: 'parmi les miens', valence: 0.45, stress: -0.06 },
  rest_ease: { text: 'le repos apaise', valence: 0.3, stress: -0.09 },
  hearth_warm: { text: 'l’âtre réchauffe', valence: 0.45, stress: -0.1 },
  dark_fear: { text: 'la nuit trop noire', valence: -0.5, stress: 0.09 },
  labor_liked: { text: 'travail qui plaît', valence: 0.4, stress: -0.04 },
  labor_forced: { text: 'corvée subie', valence: -0.35, stress: 0.05 },
  masterwork: { text: 'chef-d’œuvre accompli', valence: 0.75, stress: -0.08 },
  road_pride: { text: 'le chemin s’ouvre', valence: 0.35, stress: -0.03 },
  craft_joy: { text: 'fierté artisanale', valence: 0.5, stress: -0.05 },
  ritual: { text: 'paix du rituel', valence: 0.35, stress: -0.07 },
}

export function thoughtFromEmotionEvent(
  mind: CognitiveState,
  event: EmotionEvent,
  tick: number,
  intensity = 1,
): void {
  const spec = EVENT_THOUGHT[event]
  if (!spec) return
  const k = Math.max(0.3, Math.min(1.3, intensity))
  pushThought(mind, spec.text, spec.valence * k, spec.stress * k, tick, event)
}

/** Aggregate stress pull from unmet needs + lingering negative thoughts. */
export function thoughtStressBias(mind: CognitiveState): number {
  let s = 0
  if (mind.needs.hunger > 0.5) s += 0.08
  if (mind.needs.safety > 0.5) s += 0.1
  if (mind.needs.fatigue > 0.55) s += 0.05
  if (mind.needs.belonging > 0.55) s += 0.04
  if (mind.needs.light > 0.5) s += 0.07
  if (mind.needs.warmth > 0.5) s += 0.06
  if (mind.thoughts) {
    for (const t of mind.thoughts) {
      if (t.valence < -0.2) s += Math.abs(t.stressDelta) * 0.5
    }
  }
  return Math.min(0.45, s)
}

export function formatThoughtFr(t: Thought): string {
  const sign = t.valence >= 0 ? '+' : '−'
  return `${t.text} (${sign}${Math.round(Math.abs(t.valence) * 100)}%)`
}

export function topThoughts(list: Thought[], n = 4): Thought[] {
  return [...list]
    .sort((a, b) => Math.abs(b.valence) + Math.abs(b.stressDelta) - (Math.abs(a.valence) + Math.abs(a.stressDelta)))
    .slice(0, n)
}
