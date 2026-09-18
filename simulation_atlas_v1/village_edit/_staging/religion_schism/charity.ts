import type { BelieverProfile, FaithMovement, FamineCharityHint } from './types'
import { clamp01, pushEvent } from './util'

/** Charity during famine raises following + tension with traditionalists. */
export function applyFamineCharity(
  m: FaithMovement,
  hint: FamineCharityHint,
  tick: number,
): void {
  if (hint.hunger < 0.25 && hint.foodShared <= 0) return
  const pulse = clamp01(hint.hunger * 0.4 + hint.foodShared * 0.05)
  m.charityHeat = clamp01(m.charityHeat + pulse)
  m.following = clamp01(m.following + pulse * 0.2)
  m.tension = clamp01(m.tension + hint.hunger * 0.08)
  if (m.phase === 'following' || m.phase === 'reinterpreted') m.phase = 'charity'
  pushEvent(m, {
    kind: 'famine_charity',
    tick,
    movementId: m.id,
    amount: hint.foodShared,
    note: 'charity under famine',
  })
}

export function raiseBeliefTension(
  m: FaithMovement,
  rivals: BelieverProfile[],
  tick: number,
): void {
  const traditionGap =
    rivals.length === 0
      ? 0
      : rivals.reduce((s, r) => s + Math.abs(r.tradition - 0.5), 0) / rivals.length
  m.rivalIds = rivals.map((r) => r.actorId)
  m.tension = clamp01(m.tension + 0.1 + traditionGap * 0.2 + (1 - m.following) * 0.05)
  if (m.tension >= 0.35) m.phase = 'tension'
  pushEvent(m, {
    kind: 'belief_tension',
    tick,
    movementId: m.id,
    amount: m.tension,
  })
}