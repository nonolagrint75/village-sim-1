import type { MerchantEvent, MerchantNetworkState } from './types'

export function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

export function pushEvent(s: MerchantNetworkState, ev: MerchantEvent, cap = 64): void {
  s.events.push(ev)
  while (s.events.length > cap) s.events.shift()
}

export function nodeOf(s: MerchantNetworkState, actorId: number) {
  return s.nodes.find((n) => n.actorId === actorId) ?? null
}