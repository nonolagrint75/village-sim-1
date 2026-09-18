/**
 * Visual-layer events — drain each frame / tick from bag.events.
 */

import { MAX_PENDING_EVENTS } from './constants'
import type { MineVisualEvent, MinesOreBag } from './types'

export function pushEvent(bag: MinesOreBag, ev: MineVisualEvent): void {
  bag.events.push(ev)
  while (bag.events.length > MAX_PENDING_EVENTS) bag.events.shift()
}

/** Drain and return pending events (visual integrator consumes). */
export function drainEvents(bag: MinesOreBag): MineVisualEvent[] {
  if (bag.events.length === 0) return []
  const out = bag.events.slice()
  bag.events.length = 0
  return out
}

export function peekEvents(bag: MinesOreBag): readonly MineVisualEvent[] {
  return bag.events
}

export function eventsSince(bag: MinesOreBag, tick: number): MineVisualEvent[] {
  return bag.events.filter((e) => e.tick >= tick)
}