import type { WorkingConcern, WorkingConcernKind } from './types'
import { MAX_WORKING } from './types'

export function pushConcern(
  list: WorkingConcern[],
  kind: WorkingConcernKind,
  label: string,
  urgency: number,
  tick: number,
  subjectId: number | null = null,
  x = 0,
  y = 0,
): void {
  const existing = list.find((c) => c.kind === kind && c.subjectId === subjectId)
  if (existing) {
    existing.urgency = Math.min(1, Math.max(existing.urgency, urgency) + 0.08)
    existing.tick = tick
    existing.label = label
    existing.x = x
    existing.y = y
    return
  }
  list.push({ kind, label, urgency, subjectId, x, y, tick })
  if (list.length > MAX_WORKING) {
    list.sort((a, b) => a.urgency - b.urgency)
    list.shift()
  }
}

export function decayWorking(list: WorkingConcern[], tick: number): void {
  for (let i = list.length - 1; i >= 0; i--) {
    const age = tick - list[i].tick
    list[i].urgency *= age > 40 ? 0.92 : 0.985
    if (list[i].urgency < 0.08) list.splice(i, 1)
  }
}

export function topConcerns(list: WorkingConcern[], n = 3): WorkingConcern[] {
  return [...list].sort((a, b) => b.urgency - a.urgency).slice(0, n)
}

export function concernBias(list: WorkingConcern[], kind: WorkingConcernKind): number {
  let best = 0
  for (const c of list) if (c.kind === kind && c.urgency > best) best = c.urgency
  return best
}
