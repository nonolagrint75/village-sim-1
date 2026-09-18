/**
 * Bounty posting + authority hunt pressure.
 */

import type { AuthorityHunt, Bounty, ParallelGang } from './types'
import { clamp, pushEventCap } from './util'

export function shouldPostBounty(gang: ParallelGang): boolean {
  return (
    gang.notoriety >= 0.35 ||
    gang.raids >= 4 ||
    (gang.loot.coin + gang.loot.goods > 20 && gang.parallel.localHate > 0.4)
  )
}

export function postBounty(
  gang: ParallelGang,
  tick: number,
  authorityId: string,
  targetActorId: number | null = null,
): Bounty | null {
  if (!shouldPostBounty(gang)) return null
  if (gang.bounties.some((b) => b.active)) return null
  const amount = Math.round(5 + gang.notoriety * 25 + gang.raids * 1.5)
  const bounty: Bounty = {
    id: `bounty:${gang.id}:${tick}`,
    gangId: gang.id,
    targetActorId: targetActorId ?? gang.chiefId,
    amount,
    postedTick: tick,
    active: true,
    hunterAuthorityId: authorityId,
  }
  gang.bounties.push(bounty)
  gang.phase = gang.phase === 'established' || gang.phase === 'raiding' ? 'hunted' : gang.phase
  pushEventCap(gang.events, {
    kind: 'bounty_posted',
    tick,
    gangId: gang.id,
    actorId: bounty.targetActorId ?? undefined,
    amount,
    note: authorityId,
  })
  return bounty
}

export function startAuthorityHunt(
  gang: ParallelGang,
  authorityId: string,
  strength: number,
  tick: number,
): AuthorityHunt {
  const hunt: AuthorityHunt = { authorityId, strength: clamp(strength, 0, 1), tick }
  gang.phase = 'hunted'
  pushEventCap(gang.events, {
    kind: 'hunt_started',
    tick,
    gangId: gang.id,
    amount: strength,
    note: authorityId,
  })
  return hunt
}

export function clearBounty(gang: ParallelGang, bountyId: string): void {
  const b = gang.bounties.find((x) => x.id === bountyId)
  if (b) b.active = false
}

export function huntPressure(gang: ParallelGang, hunt: AuthorityHunt | null): number {
  if (!hunt) return 0
  const activeBounty = gang.bounties.some((b) => b.active) ? 0.2 : 0
  return clamp(hunt.strength * 0.7 + gang.notoriety * 0.15 + activeBounty - gang.zoneControl * 0.25, 0, 1)
}
