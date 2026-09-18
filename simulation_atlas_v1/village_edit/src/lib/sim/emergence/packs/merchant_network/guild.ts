import type { ActorId, CircleId, MerchantNetworkState } from './types'
import { nodeOf, pushEvent } from './util'

/**
 * Link to guild_formation: harden trade circle into merchant guild node.
 * Integrator should also call guild_formation.tryPromoteGuild when ready.
 */
export function tryJoinOrFormTradeGuild(
  s: MerchantNetworkState,
  actorId: ActorId,
  circleId: CircleId,
  practitionerCount: number,
  tick: number,
  roll: number,
): boolean {
  const n = nodeOf(s, actorId)
  if (!n) return false
  if (practitionerCount < 3) return false
  if (roll > 0.7) return false
  n.guildCircleId = circleId
  n.phase = s.edges.length >= 2 ? 'networked' : 'guilded'
  pushEvent(s, {
    kind: 'guild_form',
    tick,
    networkId: s.id,
    actorId,
    amount: practitionerCount,
    note: `circle ${circleId}`,
  })
  return true
}

export function noteChildCareerDiverge(
  s: MerchantNetworkState,
  parentId: ActorId,
  childId: ActorId,
  childTrack: string,
  tick: number,
): void {
  pushEvent(s, {
    kind: 'child_career_diverge',
    tick,
    networkId: s.id,
    actorId: childId,
    note: `parent ${parentId} -> ${childTrack}`,
  })
}