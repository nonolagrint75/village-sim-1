import type { SuccessionCrisis, SuccessionEvent } from './types'

export function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

export function pushEvent(c: SuccessionCrisis, ev: SuccessionEvent, cap = 48): void {
  c.events.push(ev)
  while (c.events.length > cap) c.events.shift()
}