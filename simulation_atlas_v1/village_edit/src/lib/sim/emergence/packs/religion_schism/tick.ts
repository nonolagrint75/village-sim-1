import type { FaithMovement, FaithTickContext } from './types'
import { clamp01, pushEvent } from './util'

export function tickReligionSchism(m: FaithMovement, ctx: FaithTickContext): FaithMovement {
  const next: FaithMovement = {
    ...m,
    followerIds: [...m.followerIds],
    rivalIds: [...m.rivalIds],
    regionVillageIds: [...m.regionVillageIds],
    wings: m.wings.map((w) => ({ ...w, memberIds: [...w.memberIds] })),
    events: [...m.events],
  }

  if (ctx.hungerHint != null && ctx.hungerHint > 0.35 && next.phase !== 'schism') {
    next.tension = clamp01(next.tension + ctx.hungerHint * 0.05)
  }

  if (next.phase === 'regional' && next.regionalLock) {
    next.phase = 'settled'
    pushEvent(next, {
      kind: 'settled',
      tick: ctx.tick,
      movementId: next.id,
    })
  }

  // Wing heat drift after schism
  for (const w of next.wings) {
    if (w.wing === 'radical') w.heat = clamp01(w.heat + 0.01 * (ctx.roll - 0.4))
    if (w.wing === 'moderate') w.heat = clamp01(w.heat - 0.005 + next.charityHeat * 0.01)
  }

  return next
}

export function schismStats(m: FaithMovement): {
  phase: FaithMovement['phase']
  following: number
  tension: number
  charityHeat: number
  regionalLock: boolean
  followers: number
  radicals: number
  moderates: number
  events: number
} {
  const radicals = m.wings.find((w) => w.wing === 'radical')?.memberIds.length ?? 0
  const moderates = m.wings.find((w) => w.wing === 'moderate')?.memberIds.length ?? 0
  return {
    phase: m.phase,
    following: m.following,
    tension: m.tension,
    charityHeat: m.charityHeat,
    regionalLock: m.regionalLock,
    followers: m.followerIds.length,
    radicals,
    moderates,
    events: m.events.length,
  }
}