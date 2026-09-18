import type { MerchantNetworkState, MerchantTickContext } from './types'

export function tickMerchantNetwork(
  s: MerchantNetworkState,
  ctx: MerchantTickContext,
): MerchantNetworkState {
  const next: MerchantNetworkState = {
    ...s,
    nodes: s.nodes.map((n) => ({ ...n })),
    edges: s.edges.map((e) => ({ ...e })),
    events: [...s.events],
  }
  for (const e of next.edges) {
    e.volume = Math.max(
      0,
      e.volume * (0.98 - (ctx.priceGapHint != null && ctx.priceGapHint < 0.05 ? 0.05 : 0)),
    )
  }
  for (const n of next.nodes) {
    if (n.phase === 'guilded' && next.edges.length >= 2) n.phase = 'networked'
  }
  return next
}

export function merchantNetworkStats(s: MerchantNetworkState): {
  nodes: number
  edges: number
  guilded: number
  networked: number
  hires: number
  marriages: number
  events: number
} {
  return {
    nodes: s.nodes.length,
    edges: s.edges.length,
    guilded: s.nodes.filter((n) => n.phase === 'guilded' || n.phase === 'networked').length,
    networked: s.nodes.filter((n) => n.phase === 'networked').length,
    hires: s.nodes.reduce((a, n) => a + n.hiredCount, 0),
    marriages: s.nodes.filter((n) => n.marriageMerged).length,
    events: s.events.length,
  }
}