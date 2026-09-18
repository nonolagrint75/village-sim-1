/**
 * Profession inheritance vs divergence across siblings.
 * Ordinary families (Ayan/Nara): kids enter different tracks → society rewrite.
 * Eren/Mira parts: apprenticeship pull + curiosity drift.
 */

import {
  ALL_TRACKS,
  TRACK_TO_CORE_PROFESSION,
  type KinProfessionTrack,
  type ProfessionDivergenceInput,
  type ProfessionDivergenceResult,
} from './types'

const PERSONALITY_BIAS: Record<
  KinProfessionTrack,
  (p: ProfessionDivergenceInput['personality']) => number
> = {
  merchant: (p) => p.ambition * 0.45 + p.sociability * 0.35 + p.curiosity * 0.2,
  guild: (p) => p.ambition * 0.3 + p.curiosity * 0.4 + (1 - p.courage) * 0.1,
  soldier: (p) => p.courage * 0.55 + p.ambition * 0.25 + (1 - p.generosity) * 0.1,
  farmer: (p) => p.generosity * 0.25 + (1 - p.ambition) * 0.35 + (1 - p.curiosity) * 0.2,
  religion: (p) => p.generosity * 0.4 + p.sociability * 0.25 + (1 - p.ambition) * 0.15,
  artisan: (p) => p.curiosity * 0.45 + p.ambition * 0.3 + p.courage * 0.1,
  none: () => 0.15,
}

/**
 * Choose a track for a child: inherit parent, fill sibling niche, or drift.
 * Deterministic given `roll` in [0,1).
 */
export function chooseProfessionTrack(
  input: ProfessionDivergenceInput,
): ProfessionDivergenceResult {
  const scores: Partial<Record<KinProfessionTrack, number>> = {}
  const siblingSet = new Set(input.siblingTracks.filter((t) => t !== 'none'))

  for (const track of ALL_TRACKS) {
    if (track === 'none') {
      scores[track] = 0.05
      continue
    }
    let s = 0.15
    const parentHits = input.parentTracks.filter((t) => t === track).length
    s += parentHits * 0.35 * clamp01(input.traditionPull)

    if (siblingSet.has(track)) s -= 0.28
    else if (siblingSet.size > 0) s += 0.18

    s += (input.opportunity[track] ?? 0.25) * 0.4
    s += PERSONALITY_BIAS[track](input.personality) * 0.35
    scores[track] = s
  }

  const driftTrack = ALL_TRACKS[Math.floor(input.roll * (ALL_TRACKS.length - 1))]!
  scores[driftTrack] = (scores[driftTrack] ?? 0) + 0.08

  let best: KinProfessionTrack = 'farmer'
  let bestScore = -Infinity
  for (const track of ALL_TRACKS) {
    if (track === 'none') continue
    const v = scores[track] ?? 0
    if (v > bestScore) {
      bestScore = v
      best = track
    }
  }

  const inherited = input.parentTracks.includes(best) && input.traditionPull >= 0.45
  let reason: ProfessionDivergenceResult['reason'] = 'opportunity'
  if (inherited) reason = 'inherited_parent'
  else if (siblingSet.size > 0 && !siblingSet.has(best)) reason = 'sibling_niche'
  else if (PERSONALITY_BIAS[best](input.personality) >= 0.55) reason = 'personality'
  else if (input.roll > 0.85) reason = 'random_drift'

  return { track: best, inherited, reason, scoreByTrack: scores }
}

/** Map abstract track → candidate core profession strings. */
export function coreProfessionCandidates(track: KinProfessionTrack): string[] {
  return TRACK_TO_CORE_PROFESSION[track] ?? ['none']
}

/**
 * Pick one core profession string from a track using roll.
 * Integrator validates against `Profession` union before apply.
 */
export function pickCoreProfession(track: KinProfessionTrack, roll: number): string {
  const list = coreProfessionCandidates(track)
  if (!list.length) return 'none'
  return list[Math.min(list.length - 1, Math.floor(clamp01(roll) * list.length))]!
}

/** Entropy of track mix among siblings (0 = all same, 1 = fully spread). */
export function siblingTrackEntropy(tracks: KinProfessionTrack[]): number {
  const active = tracks.filter((t) => t !== 'none')
  if (active.length <= 1) return 0
  const counts = new Map<KinProfessionTrack, number>()
  for (const t of active) counts.set(t, (counts.get(t) ?? 0) + 1)
  const n = active.length
  let h = 0
  for (const c of counts.values()) {
    const p = c / n
    h -= p * Math.log2(p)
  }
  const maxH = Math.log2(Math.min(active.length, ALL_TRACKS.length - 1))
  return maxH <= 0 ? 0 : h / maxH
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n))
}