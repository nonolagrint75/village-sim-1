import type { BelieverProfile, CreedId, FaithMovement } from './types'
import { clamp01, createSchismId, pushEvent } from './util'

/** Samir soft reinterpret of parent creed into a reform label. */
export function tryReinterpretCreed(
  reformer: BelieverProfile,
  parentCreedId: CreedId,
  tick: number,
  roll: number,
): FaithMovement | null {
  if (!reformer.creedId && reformer.piety < 0.35) return null
  if (reformer.piety + reformer.creedWeight < 0.55) return null
  if (roll > 0.55 + reformer.piety * 0.3) return null
  const reformCreedId = `${parentCreedId}:reform:${reformer.actorId % 97}`
  const m: FaithMovement = {
    id: createSchismId(reformer.villageId ?? 0, tick),
    villageId: reformer.villageId ?? 0,
    phase: 'reinterpreted',
    formedTick: tick,
    reformerId: reformer.actorId,
    parentCreedId,
    reformCreedId,
    parentCircleId: null,
    schismCircleId: null,
    followerIds: [reformer.actorId],
    rivalIds: [],
    following: 0.15 + reformer.piety * 0.2,
    tension: 0.05,
    charityHeat: 0,
    wings: [],
    regionalLock: false,
    regionVillageIds: reformer.villageId != null ? [reformer.villageId] : [],
    events: [],
  }
  pushEvent(m, {
    kind: 'creed_reinterpreted',
    tick,
    movementId: m.id,
    actorId: reformer.actorId,
    creedId: reformCreedId,
    note: `${reformer.lifeTag} reinterprets ${parentCreedId}`,
  })
  return m
}

export function applyFaithFollowing(
  m: FaithMovement,
  candidates: BelieverProfile[],
  tick: number,
  roll: number,
): number {
  let gained = 0
  for (const c of candidates) {
    if (m.followerIds.includes(c.actorId)) continue
    if (c.actorId === m.reformerId) continue
    const open = c.piety * 0.4 + (1 - c.tradition) * 0.35 + c.creedWeight * 0.1
    if (open + roll * 0.2 < 0.42) continue
    m.followerIds.push(c.actorId)
    gained++
  }
  if (gained > 0) {
    m.following = clamp01(m.following + gained * 0.08)
    if (m.phase === 'reinterpreted') m.phase = 'following'
    pushEvent(m, {
      kind: 'faith_following',
      tick,
      movementId: m.id,
      amount: gained,
      note: `+${gained} followers`,
    })
  }
  return gained
}