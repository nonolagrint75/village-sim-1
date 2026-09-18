import type { FaithEvent, FaithMovement } from './types'

export function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

export function pushEvent(m: FaithMovement, ev: FaithEvent, cap = 48): void {
  m.events.push(ev)
  while (m.events.length > cap) m.events.shift()
}

export function createSchismId(villageId: number, tick: number): string {
  return `faith:${villageId}:${tick}`
}