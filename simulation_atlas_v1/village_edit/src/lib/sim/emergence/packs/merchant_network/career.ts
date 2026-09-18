import type { ActorId, MerchantNetworkState, NetworkId, TraderProfile } from './types'
import { nodeOf, pushEvent } from './util'

export function createNetworkId(seedActorId: ActorId, tick: number): NetworkId {
  return `merchnet:${seedActorId}:${tick}`
}

export function createEmptyNetwork(seed: TraderProfile, tick: number): MerchantNetworkState {
  return {
    id: createNetworkId(seed.actorId, tick),
    nodes: [
      {
        actorId: seed.actorId,
        lifeTag: seed.lifeTag,
        phase: seed.professionHint === 'trader' ? 'trader' : 'farmer',
        firmId: seed.firmId,
        guildCircleId: null,
        hiredCount: 0,
        marriageMerged: false,
        successionDone: false,
      },
    ],
    edges: [],
    events: [],
    formedTick: tick,
  }
}

/** Livelihood pivot when surplus + curiosity (Eren farmer->trader). */
export function tryFarmerToTrader(
  s: MerchantNetworkState,
  p: TraderProfile,
  tick: number,
  roll: number,
): boolean {
  const n = nodeOf(s, p.actorId)
  if (!n || n.phase !== 'farmer') return false
  if (p.surplusGrain < 8 && p.curiosity < 0.45) return false
  const ageBias = p.lifeTag === 'Eren' && (p.ageYears ?? 30) >= 30 ? 0.08 : 0
  if (roll > 0.5 + p.curiosity * 0.4 + ageBias) return false
  n.phase = 'trader'
  pushEvent(s, {
    kind: 'farmer_to_trader',
    tick,
    networkId: s.id,
    actorId: p.actorId,
    note: `${p.lifeTag} pivots to trade`,
  })
  return true
}

export function noteHorseOwned(s: MerchantNetworkState, actorId: ActorId, tick: number): boolean {
  const n = nodeOf(s, actorId)
  if (!n) return false
  if (n.phase === 'farmer') return false
  if (n.phase === 'trader') n.phase = 'mobile'
  pushEvent(s, { kind: 'horse_owned', tick, networkId: s.id, actorId })
  return true
}