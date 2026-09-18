/**
 * Mismanagement pressure: overspend / overhire / mansion / prestige → debt → rents.
 */

import type {
  DynastyEvent,
  DynastyHouse,
  MismanagementPressureInput,
  MismanagementPressureResult,
  TenantSnapshot,
} from './types'
import { modifierSpendMultiplier } from './inheritance'

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

/** Pure scorer — no mutation. */
export function scoreMismanagementPressure(input: MismanagementPressureInput): MismanagementPressureResult {
  const m = input.modifiers
  const spendMul = modifierSpendMultiplier(m)
  const debtRatio = input.wealth > 1 ? input.debt / Math.max(input.wealth, 1) : input.debt > 0 ? 1 : 0
  const hireLoad = clamp01(input.hiredCount / 12)
  const prestigeLoad = clamp01(input.prestigeSink / Math.max(input.wealth + input.prestigeSink, 1))
  const stress = clamp01(input.cityStress ?? 0)

  const overspendDrive = clamp01(m.arrogance * 0.4 + m.vanity * 0.35 + (1 - m.thrift) * 0.35 + spendMul * 0.1)
  const overhireDrive = clamp01(m.vanity * 0.45 + m.arrogance * 0.3 + hireLoad * 0.2)
  const mansionDrive = clamp01(m.vanity * 0.55 + m.arrogance * 0.25 + (input.mansion ? 0.15 : 0.35))
  const rentRaiseDrive = clamp01(debtRatio * 0.55 + m.hardness * 0.35 + stress * 0.15)
  const seizeRisk = clamp01(debtRatio * 0.5 + (input.debt > input.wealth * 0.8 ? 0.35 : 0) + stress * 0.1)
  const contestRisk = clamp01(m.rivalry * 0.55 + debtRatio * 0.25 + (1 - input.outputLevel) * 0.25)

  const pressure = clamp(
    overspendDrive * 0.22 +
      overhireDrive * 0.14 +
      mansionDrive * 0.12 +
      prestigeLoad * 0.12 +
      debtRatio * 0.2 +
      rentRaiseDrive * 0.1 +
      (1 - input.outputLevel) * 0.1,
    0,
    1.5,
  )

  return {
    pressure,
    overspendDrive,
    overhireDrive,
    mansionDrive,
    rentRaiseDrive,
    seizeRisk,
    contestRisk,
  }
}

function pushEvent(house: DynastyHouse, ev: DynastyEvent): DynastyHouse {
  return { ...house, events: [...house.events, ev] }
}

/**
 * One mismanagement tick: spend / hire / mansion / debt / rent.
 * Peasant exit + output drop handled in cascade.ts.
 */
export function applyMismanagementTick(
  house: DynastyHouse,
  tick: number,
  roll: number,
  cityStress = 0,
): DynastyHouse {
  if (house.phase === 'collapsed') return house

  let next: DynastyHouse = { ...house, claims: [...house.claims], events: [...house.events] }
  const scored = scoreMismanagementPressure({
    wealth: next.wealth,
    debt: next.debt,
    prestigeSink: next.prestigeSink,
    hiredCount: next.hiredCount,
    mansion: next.mansion,
    rentMultiplier: next.rentMultiplier,
    outputLevel: next.outputLevel,
    modifiers: next.modifiers,
    cityStress,
  })
  next.mismanagementPressure = scored.pressure

  const spendMul = modifierSpendMultiplier(next.modifiers)

  if (scored.overspendDrive > 0.45 && roll < scored.overspendDrive) {
    const burn = Math.max(2, next.wealth * 0.04 * spendMul)
    next.wealth = Math.max(0, next.wealth - burn)
    next.prestigeSink += burn * 0.7
    next = pushEvent(next, {
      kind: 'overspend',
      tick,
      houseId: next.id,
      actorId: next.headId,
      amount: burn,
      note: 'prestige / lifestyle overspend',
    })
    next = pushEvent(next, {
      kind: 'prestige_push',
      tick,
      houseId: next.id,
      actorId: next.headId,
      amount: burn * 0.7,
    })
    if (next.phase === 'heir_ascendant' || next.phase === 'stable') next.phase = 'overspending'
  }

  if (scored.overhireDrive > 0.5 && roll > 0.35 && roll < scored.overhireDrive + 0.15) {
    const add = 1 + Math.floor(next.modifiers.vanity * 2)
    const wage = add * 1.5 * spendMul
    next.hiredCount += add
    next.wealth = Math.max(0, next.wealth - wage)
    next = pushEvent(next, {
      kind: 'overhire',
      tick,
      houseId: next.id,
      actorId: next.headId,
      amount: add,
      note: 'retinue / staff swell',
    })
    if (next.phase === 'stable' || next.phase === 'heir_ascendant') next.phase = 'overspending'
  }

  if (!next.mansion && scored.mansionDrive > 0.55 && roll > 0.55) {
    const cost = Math.max(12, 18 * spendMul)
    next.wealth = Math.max(0, next.wealth - cost)
    next.mansion = true
    next.prestigeSink += cost * 0.5
    next = pushEvent(next, {
      kind: 'mansion_built',
      tick,
      houseId: next.id,
      actorId: next.headId,
      amount: cost,
      note: 'vanity mansion / manor expansion',
    })
  }

  const wageDrag = next.hiredCount * 0.35
  const interest = next.debt * 0.02
  if (next.wealth < wageDrag + 4 || next.prestigeSink > next.wealth * 0.6) {
    const borrow = Math.max(3, wageDrag + interest + scored.pressure * 4)
    next.debt += borrow
    next.wealth += borrow * 0.85
    next = pushEvent(next, {
      kind: 'debt_accrued',
      tick,
      houseId: next.id,
      amount: borrow,
      note: 'creditor advance to cover lifestyle',
    })
    next.phase = 'indebted'
  } else {
    next.debt = Math.max(0, next.debt + interest - Math.min(next.wealth * 0.02, next.debt * 0.05))
  }

  if (scored.rentRaiseDrive > 0.5 && next.debt > 5) {
    const bump = 0.08 + next.modifiers.hardness * 0.12 + scored.rentRaiseDrive * 0.06
    next.rentMultiplier = clamp(next.rentMultiplier + bump, 1, 3.2)
    next = pushEvent(next, {
      kind: 'rent_raised',
      tick,
      houseId: next.id,
      actorId: next.headId,
      amount: next.rentMultiplier,
      note: 'debt squeeze on tenants',
    })
    next.phase = 'squeezing'
  }

  next = pushEvent(next, {
    kind: 'pressure_shifted',
    tick,
    houseId: next.id,
    amount: next.mismanagementPressure,
  })

  return next
}

/** Estimate exit pressure for tenants given rent multiplier. */
export function tenantExitPressure(
  rentMultiplier: number,
  tenant: TenantSnapshot,
  hardness: number,
): number {
  return clamp01(
    tenant.rentBurden * 0.45 + (rentMultiplier - 1) * 0.35 + hardness * 0.1 + tenant.exitPressure * 0.25,
  )
}
