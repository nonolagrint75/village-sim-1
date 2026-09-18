import type { MerchantNetworkState, NetworkEdge, TraderProfile, VillageId } from './types'
import { clamp01, nodeOf, pushEvent } from './util'

/** Price gap -> profit + network edge (regular trade corridor). */
export function tryGrainArbitrage(
  s: MerchantNetworkState,
  p: TraderProfile,
  fromVillageId: VillageId,
  toVillageId: VillageId,
  priceGap: number,
  tick: number,
  roll: number,
): NetworkEdge | null {
  const n = nodeOf(s, p.actorId)
  if (!n) return null
  if (
    !(
      n.phase === 'mobile' ||
      n.phase === 'arbitrage' ||
      n.phase === 'employer' ||
      n.phase === 'guilded' ||
      n.phase === 'networked'
    )
  ) {
    if (n.phase === 'trader' && p.hasHorse) n.phase = 'mobile'
    else return null
  }
  if (priceGap < 0.08 || roll > 0.65 + priceGap) return null
  const edge: NetworkEdge = {
    id: `edge:${fromVillageId}:${toVillageId}:${tick}`,
    fromVillageId,
    toVillageId,
    goodId: 'grain',
    volume: Math.max(1, Math.floor(p.surplusGrain * 0.3 + priceGap * 20)),
    profitIndex: clamp01(priceGap * 2),
    formedTick: tick,
  }
  s.edges.push(edge)
  n.phase = 'arbitrage'
  pushEvent(s, {
    kind: 'grain_arbitrage',
    tick,
    networkId: s.id,
    actorId: p.actorId,
    amount: edge.profitIndex,
    note: `${fromVillageId}->${toVillageId}`,
  })
  pushEvent(s, {
    kind: 'network_edge',
    tick,
    networkId: s.id,
    actorId: p.actorId,
    note: edge.id,
  })
  return edge
}

/** Reinforce a recurring corridor (regular trade network, not one-off). */
export function reinforceEdge(
  s: MerchantNetworkState,
  fromVillageId: VillageId,
  toVillageId: VillageId,
  volumeAdd: number,
  tick: number,
): NetworkEdge | null {
  const existing = s.edges.find(
    (e) => e.fromVillageId === fromVillageId && e.toVillageId === toVillageId,
  )
  if (!existing) return null
  existing.volume += Math.max(0, volumeAdd)
  existing.profitIndex = clamp01(existing.profitIndex + 0.02)
  pushEvent(s, {
    kind: 'network_edge',
    tick,
    networkId: s.id,
    note: `reinforce ${existing.id}`,
    amount: existing.volume,
  })
  return existing
}