import type { LaborEvent, LaborMovement, WorkConditionsHint, WorkerProfile } from './types'

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function pushEvent(m: LaborMovement, ev: LaborEvent, cap = 48): void {
  m.events.push(ev)
  while (m.events.length > cap) m.events.shift()
}

/** Aggregate hardship signal from village conditions. */
export function scoreBadConditions(hint: WorkConditionsHint): number {
  const wagePain = hint.wageIndex < 1 ? (1 - hint.wageIndex) : 0
  return clamp01(hint.hardship * 0.45 + hint.exploitation * 0.35 + wagePain * 0.4)
}

/** True when conditions are bad enough to nucleate a worker group. */
export function shouldFormWorkerGroup(hint: WorkConditionsHint, workers: WorkerProfile[]): boolean {
  if (hint.workerCount < 3 && workers.length < 3) return false
  const score = scoreBadConditions(hint)
  const organizers = workers.filter((w) => !w.isElite && w.organizePull >= 0.45)
  const aggrieved = workers.filter((w) => w.grievance >= 0.35 || w.hardship >= 0.4)
  return score >= 0.42 && organizers.length >= 1 && aggrieved.length >= 2
}

/** Pick Rami-like lead + Tomas-like members. */
export function pickOrganizers(workers: WorkerProfile[]): {
  lead: WorkerProfile | null
  members: WorkerProfile[]
} {
  const pool = workers
    .filter((w) => !w.isElite && !w.isSoldier)
    .sort((a, b) => b.organizePull + b.grievance - (a.organizePull + a.grievance))
  const lead =
    pool.find((w) => w.lifeTag === 'Rami') ??
    pool.find((w) => w.organizePull >= 0.55) ??
    pool[0] ??
    null
  const members = pool.filter((w) => !lead || w.actorId !== lead.actorId).slice(0, 10)
  // Prefer at least one Tomas-tagged rank-and-file if present
  const tomas = pool.find((w) => w.lifeTag === 'Tomas' && w.actorId !== lead?.actorId)
  if (tomas && !members.some((m) => m.actorId === tomas.actorId)) {
    members.unshift(tomas)
    if (members.length > 10) members.pop()
  }
  return { lead, members }
}

export function applyWageCut(movement: LaborMovement, newIndex: number, tick: number): LaborMovement {
  const cut = movement.wageIndex - newIndex
  movement.wageIndex = Math.max(0.05, newIndex)
  if (cut > 0.02) {
    movement.strikePressure = clamp01(movement.strikePressure + cut * 0.9)
    movement.cohesion = clamp01(movement.cohesion + cut * 0.35)
    pushEvent(movement, {
      kind: 'wage_cut',
      tick,
      movementId: movement.id,
      amount: cut,
      note: `wageIndex→${movement.wageIndex.toFixed(2)}`,
    })
  }
  return movement
}

export function noteConditionsWorsened(
  movement: LaborMovement,
  hint: WorkConditionsHint,
): LaborMovement {
  const score = scoreBadConditions(hint)
  if (score < 0.35) return movement
  movement.cohesion = clamp01(movement.cohesion + score * 0.08)
  movement.strikePressure = clamp01(movement.strikePressure + score * 0.06)
  pushEvent(movement, {
    kind: 'conditions_worsened',
    tick: hint.tick,
    movementId: movement.id,
    amount: score,
  })
  return movement
}