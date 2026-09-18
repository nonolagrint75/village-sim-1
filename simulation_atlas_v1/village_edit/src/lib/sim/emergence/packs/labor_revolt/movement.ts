import { pickOrganizers, scoreBadConditions, shouldFormWorkerGroup } from './conditions'
import type {
  FoodCrisisHint,
  LaborEvent,
  LaborForkChoice,
  LaborMovement,
  LaborPhase,
  LaborTickContext,
  MovementId,
  RepressionHint,
  WorkConditionsHint,
  WorkerProfile,
} from './types'

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function pushEvent(m: LaborMovement, ev: LaborEvent, cap = 48): void {
  m.events.push(ev)
  while (m.events.length > cap) m.events.shift()
}

function setPhase(m: LaborMovement, phase: LaborPhase, tick: number, kind: LaborEvent['kind'], note?: string): void {
  m.phase = phase
  pushEvent(m, { kind, tick, movementId: m.id, note })
}

export function createMovementId(villageId: number, tick: number): MovementId {
  return `labor:${villageId}:${tick}`
}

export function createLaborMovement(
  hint: WorkConditionsHint,
  workers: WorkerProfile[],
  polityId: number | null,
): LaborMovement | null {
  if (!shouldFormWorkerGroup(hint, workers)) return null
  const { lead, members } = pickOrganizers(workers)
  if (!lead) return null
  const id = createMovementId(hint.villageId, hint.tick)
  const m: LaborMovement = {
    id,
    villageId: hint.villageId,
    polityId,
    phase: 'worker_group',
    formedTick: hint.tick,
    circleId: null,
    institutionId: null,
    organizerIds: [lead.actorId],
    memberIds: [lead.actorId, ...members.map((x) => x.actorId)],
    leadOrganizerId: lead.actorId,
    cohesion: clamp01(0.35 + scoreBadConditions(hint) * 0.3 + lead.organizePull * 0.2),
    strikePressure: clamp01(scoreBadConditions(hint) * 0.4),
    wageIndex: hint.wageIndex,
    repressionHeat: 0,
    foodStress: 0,
    armyLoyalty: 0.65,
    eliteBacklash: 0,
    successorPolityId: null,
    events: [],
  }
  pushEvent(m, {
    kind: 'group_formed',
    tick: hint.tick,
    movementId: id,
    actorId: lead.actorId,
    note: `members=${m.memberIds.length}`,
  })
  return m
}

/** Begin strike when wage cut / pressure high enough. */
export function tryBeginStrike(m: LaborMovement, tick: number, roll: number): boolean {
  if (m.phase !== 'worker_group' && m.phase !== 'latent') return false
  const ready = m.strikePressure >= 0.38 || m.wageIndex < 0.85
  if (!ready || roll > 0.72 + m.cohesion * 0.2) return false
  setPhase(m, 'strike', tick, 'strike_begun', `pressure=${m.strikePressure.toFixed(2)}`)
  m.strikePressure = clamp01(m.strikePressure + 0.15)
  return true
}

/** Crystallize labor institution from sustained strike + cohesion. */
export function tryFormLaborInstitution(m: LaborMovement, tick: number, softCircleId: number | null): boolean {
  if (m.phase !== 'strike' && m.phase !== 'worker_group') return false
  if (m.cohesion < 0.48 || m.memberIds.length < 3) return false
  if (m.phase === 'worker_group' && m.strikePressure < 0.3) return false
  m.institutionId = softCircleId
  setPhase(m, 'institution', tick, 'institution_formed')
  m.cohesion = clamp01(m.cohesion + 0.12)
  return true
}

export function applyRepression(m: LaborMovement, hint: RepressionHint): 'obey' | 'refuse' | 'none' {
  if (m.phase !== 'institution' && m.phase !== 'strike' && m.phase !== 'fork_overthrow' && m.phase !== 'mass_protest') {
    return 'none'
  }
  m.repressionHeat = clamp01(m.repressionHeat + hint.force * 0.55)
  m.armyLoyalty = clamp01(hint.armyObedience)
  pushEvent(m, {
    kind: 'repression_applied',
    tick: hint.tick,
    movementId: m.id,
    amount: hint.force,
  })
  setPhase(m, 'repression', hint.tick, 'repression_applied')

  // Army refuses when loyalty low and repression harsh
  if (hint.armyObedience < 0.38 && hint.force >= 0.45) {
    setPhase(m, 'army_refuses', hint.tick, 'army_refused')
    return 'refuse'
  }
  if (hint.armyObedience >= 0.55 && hint.force >= 0.6 && m.cohesion < 0.4) {
    setPhase(m, 'crushed', hint.tick, 'crushed')
    pushEvent(m, { kind: 'army_obeyed', tick: hint.tick, movementId: m.id })
    return 'obey'
  }
  return 'none'
}

/** After repression: negotiate vs overthrow fork. */
export function resolveLaborFork(m: LaborMovement, choice: LaborForkChoice, tick: number, roll: number): LaborPhase {
  if (m.phase !== 'repression' && m.phase !== 'institution') return m.phase
  let prefer = choice.prefer
  if (prefer === 'auto') {
    // Harsh repression + high cohesion → overthrow; else negotiate
    prefer = m.repressionHeat >= 0.5 && m.cohesion >= 0.45 && roll > 0.4 ? 'overthrow' : 'negotiate'
  }
  if (prefer === 'negotiate') {
    setPhase(m, 'fork_negotiate', tick, 'negotiation_opened')
  } else {
    setPhase(m, 'fork_overthrow', tick, 'overthrow_pushed')
    m.strikePressure = clamp01(m.strikePressure + 0.2)
  }
  return m.phase
}

export function applyFoodCrisis(m: LaborMovement, hint: FoodCrisisHint): void {
  if (hint.villageId !== m.villageId) return
  m.foodStress = clamp01(Math.max(m.foodStress, hint.shortage))
  if (hint.shortage < 0.4) return
  pushEvent(m, {
    kind: 'food_crisis',
    tick: hint.tick,
    movementId: m.id,
    amount: hint.shortage,
  })
  if (
    m.phase === 'fork_negotiate' ||
    m.phase === 'fork_overthrow' ||
    m.phase === 'repression' ||
    m.phase === 'institution' ||
    m.phase === 'strike'
  ) {
    setPhase(m, 'food_crisis', hint.tick, 'food_crisis')
  }
}

export function tryMassProtest(m: LaborMovement, tick: number, roll: number): boolean {
  if (m.phase !== 'food_crisis' && m.phase !== 'fork_overthrow') return false
  if (m.foodStress < 0.35 && m.strikePressure < 0.55) return false
  if (roll > 0.55 + m.cohesion * 0.25) return false
  setPhase(m, 'mass_protest', tick, 'mass_protest')
  m.strikePressure = clamp01(m.strikePressure + 0.18)
  return true
}

/** Regime collapse when army refuses during mass protest / overthrow. */
export function tryRegimeCollapse(m: LaborMovement, tick: number): boolean {
  if (m.phase !== 'army_refuses' && !(m.phase === 'mass_protest' && m.armyLoyalty < 0.4)) return false
  setPhase(m, 'regime_collapse', tick, 'regime_collapsed')
  return true
}

export function formSuccessorPolity(m: LaborMovement, newPolityId: number, tick: number): void {
  if (m.phase !== 'regime_collapse' && m.phase !== 'army_refuses') return
  m.successorPolityId = newPolityId
  setPhase(m, 'new_polity', tick, 'polity_formed', `polity=${newPolityId}`)
}

export function applyEliteBacklash(m: LaborMovement, tick: number, elitePressure: number): void {
  if (m.phase !== 'new_polity' && m.phase !== 'regime_collapse') return
  m.eliteBacklash = clamp01(elitePressure)
  setPhase(m, 'elite_backlash', tick, 'elite_backlash', `pressure=${elitePressure.toFixed(2)}`)
  if (elitePressure >= 0.7 && m.cohesion < 0.35) {
    setPhase(m, 'crushed', tick, 'crushed', 'elite restored')
  } else if (elitePressure < 0.55 || m.cohesion >= 0.5) {
    setPhase(m, 'settled', tick, 'settled', 'new order holds')
  }
}

/**
 * Advance one movement one tick — pure phase machine.
 * Integrator supplies RNG roll + optional hints already applied.
 */
export function tickLaborMovement(m: LaborMovement, ctx: LaborTickContext): LaborMovement {
  const decay = 0.002
  m.cohesion = clamp01(m.cohesion - decay + (ctx.cityStress ?? 0) * 0.01)
  if (m.phase === 'strike') m.strikePressure = clamp01(m.strikePressure + 0.01)
  if (m.phase === 'fork_negotiate' && ctx.roll > 0.85) {
    // Soft settlement without overthrow
    m.wageIndex = clamp01(m.wageIndex + 0.08)
    setPhase(m, 'settled', ctx.tick, 'settled', 'negotiated wage floor')
  }
  if (m.phase === 'mass_protest' && m.armyLoyalty < 0.38 && ctx.roll > 0.5) {
    setPhase(m, 'army_refuses', ctx.tick, 'army_refused')
  }
  if (m.phase === 'army_refuses') tryRegimeCollapse(m, ctx.tick)
  return m
}