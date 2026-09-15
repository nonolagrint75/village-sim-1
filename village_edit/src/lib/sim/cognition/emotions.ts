import type { EmotionState } from './types'

export function emptyEmotions(): EmotionState {
  return {
    anger: 0,
    fear: 0,
    stress: 0.1,
    affection: 0.15,
    pride: 0.1,
    valence: 0.05,
    approachAvoid: 0.05,
  }
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

export function decayEmotions(e: EmotionState, rate = 0.012): void {
  e.anger = clamp01(e.anger - rate)
  e.fear = clamp01(e.fear - rate * 0.9)
  e.stress = clamp01(e.stress - rate * 0.7)
  e.affection = clamp01(e.affection - rate * 0.4)
  e.pride = clamp01(e.pride - rate * 0.5)
  syncAffectAxes(e)
}

/**
 * Affective neuroscience lite: map discrete affects → valence + approach/avoid readiness.
 * Amygdala-like tagging uses emotion intensity on episodic elsewhere.
 */
export function syncAffectAxes(e: EmotionState): void {
  const approach = e.affection * 0.55 + e.pride * 0.35 - e.fear * 0.45 - e.anger * 0.15
  const avoid = e.fear * 0.6 + e.stress * 0.35 + e.anger * 0.25 - e.affection * 0.2
  e.approachAvoid = Math.max(-1, Math.min(1, approach - avoid * 0.5))
  e.valence = Math.max(
    -1,
    Math.min(1, e.affection * 0.4 + e.pride * 0.35 - e.fear * 0.4 - e.anger * 0.35 - e.stress * 0.25),
  )
}

export type EmotionEvent =
  | 'theft_victim'
  | 'theft_witness'
  | 'wolf'
  | 'gift'
  | 'death_kin'
  | 'death_seen'
  | 'famine'
  | 'fight_win'
  | 'fight_hurt'
  | 'social'
  | 'build_success'
  | 'trade_success'
  | 'betrayal'
  | 'shame'
  | 'ritual'
  | 'good_meal'
  | 'new_home'
  | 'road_pride'
  | 'wolf_survived'
  | 'craft_joy'
  | 'belonging_warm'
  | 'piety_calm'
  | 'rest_ease'
  | 'labor_liked'
  | 'labor_forced'
  | 'masterwork'

export function applyEmotionEvent(e: EmotionState, event: EmotionEvent, intensity = 1): void {
  const k = Math.max(0.2, Math.min(1.5, intensity))
  switch (event) {
    case 'theft_victim':
      e.anger = clamp01(e.anger + 0.35 * k)
      e.stress = clamp01(e.stress + 0.2 * k)
      break
    case 'theft_witness':
      e.anger = clamp01(e.anger + 0.12 * k)
      e.fear = clamp01(e.fear + 0.08 * k)
      break
    case 'wolf':
      e.fear = clamp01(e.fear + 0.4 * k)
      e.stress = clamp01(e.stress + 0.25 * k)
      break
    case 'gift':
      e.affection = clamp01(e.affection + 0.28 * k)
      e.pride = clamp01(e.pride + 0.05 * k)
      break
    case 'death_kin':
      e.stress = clamp01(e.stress + 0.35 * k)
      e.anger = clamp01(e.anger + 0.2 * k)
      e.affection = clamp01(e.affection - 0.1 * k)
      break
    case 'death_seen':
      e.fear = clamp01(e.fear + 0.15 * k)
      e.stress = clamp01(e.stress + 0.12 * k)
      break
    case 'famine':
      e.stress = clamp01(e.stress + 0.18 * k)
      e.fear = clamp01(e.fear + 0.1 * k)
      break
    case 'fight_win':
      e.pride = clamp01(e.pride + 0.22 * k)
      e.fear = clamp01(e.fear - 0.1 * k)
      break
    case 'fight_hurt':
      e.anger = clamp01(e.anger + 0.2 * k)
      e.fear = clamp01(e.fear + 0.15 * k)
      break
    case 'social':
      e.affection = clamp01(e.affection + 0.08 * k)
      e.stress = clamp01(e.stress - 0.06 * k)
      break
    case 'build_success':
    case 'trade_success':
      e.pride = clamp01(e.pride + 0.14 * k)
      break
    case 'betrayal':
      e.anger = clamp01(e.anger + 0.4 * k)
      e.stress = clamp01(e.stress + 0.15 * k)
      break
    case 'shame':
      e.stress = clamp01(e.stress + 0.28 * k)
      e.pride = clamp01(e.pride - 0.2 * k)
      e.fear = clamp01(e.fear + 0.08 * k)
      break
    case 'ritual':
      e.affection = clamp01(e.affection + 0.18 * k)
      e.stress = clamp01(e.stress - 0.12 * k)
      e.pride = clamp01(e.pride + 0.06 * k)
      break
    case 'good_meal':
      e.affection = clamp01(e.affection + 0.12 * k)
      e.stress = clamp01(e.stress - 0.1 * k)
      break
    case 'new_home':
      e.pride = clamp01(e.pride + 0.2 * k)
      e.stress = clamp01(e.stress - 0.12 * k)
      break
    case 'road_pride':
    case 'craft_joy':
      e.pride = clamp01(e.pride + 0.16 * k)
      break
    case 'wolf_survived':
      e.pride = clamp01(e.pride + 0.14 * k)
      e.fear = clamp01(e.fear - 0.12 * k)
      break
    case 'belonging_warm':
      e.affection = clamp01(e.affection + 0.14 * k)
      e.stress = clamp01(e.stress - 0.08 * k)
      break
    case 'piety_calm':
    case 'rest_ease':
      e.stress = clamp01(e.stress - 0.11 * k)
      break
    case 'labor_liked':
      e.pride = clamp01(e.pride + 0.12 * k)
      e.stress = clamp01(e.stress - 0.08 * k)
      e.affection = clamp01(e.affection + 0.04 * k)
      break
    case 'labor_forced':
      e.stress = clamp01(e.stress + 0.14 * k)
      e.anger = clamp01(e.anger + 0.1 * k)
      e.pride = clamp01(e.pride - 0.06 * k)
      break
    case 'masterwork':
      e.pride = clamp01(e.pride + 0.35 * k)
      e.stress = clamp01(e.stress - 0.1 * k)
      break
  }
  syncAffectAxes(e)
}

/** Bias multipliers for decision kinds from current mood + approach/avoid readiness. */
export function emotionTaskBias(e: EmotionState, kind: string): number {
  let m = 1
  if (kind === 'confront' || kind === 'steal') m *= 1 + e.anger * 0.7
  if (kind === 'flee') m *= 1 + e.fear * 0.9 - Math.max(0, e.approachAvoid) * 0.15
  if (kind === 'fight' || kind === 'defend') m *= 1 + e.anger * 0.25 - e.fear * 0.35
  if (kind === 'giveFood' || kind === 'socialise') {
    m *= 1 + e.affection * 0.55 - e.anger * 0.25 + Math.max(0, e.approachAvoid) * 0.2
  }
  if (kind === 'rest') m *= 1 + e.stress * 0.4 + Math.max(0, -e.valence) * 0.15
  if (kind === 'eat') m *= 1 + Math.max(0, -e.valence) * 0.1
  if (kind === 'entertain') m *= 1 + e.affection * 0.25 + e.pride * 0.15 - e.stress * 0.2
  if (kind === 'buildHouse' || kind === 'tradeRun' || kind === 'craftIronTool') m *= 1 + e.pride * 0.25
  if (e.stress > 0.65 && (kind === 'idle' || kind === 'explore' || kind === 'tameHorse')) m *= 0.55
  // Valence: low mood dampens exploratory / social novelty
  if (e.valence < -0.35 && (kind === 'idle' || kind === 'explore' || kind === 'tameHorse')) m *= 0.75
  if (e.approachAvoid < -0.4 && (kind === 'socialise' || kind === 'tradeRun')) m *= 0.7
  return m
}

/** Amygdala-like emotional tag intensity for episodic encoding (−1..1). */
export function amygdalaTag(e: EmotionState): number {
  const mag = Math.max(e.anger, e.fear, e.stress * 0.8, e.affection * 0.6, e.pride * 0.5)
  const sign = e.valence >= 0 ? 1 : -1
  return Math.max(-1, Math.min(1, sign * mag))
}
