/**
 * Dynasty mismanage tick + factory — Malik causal chain (staging only).
 */

import { applySuccession, defaultInheritanceModifiers } from './inheritance'
import { applyMismanagementTick } from './pressure'
import { applyCreditorSeize, applyPeasantExit, resolveFamilySchism } from './cascade'
import type {
  DynastyHouse,
  DynastyTickContext,
  FamilySchismResult,
  HeirProfile,
  HouseId,
} from './types'

export function createDynastyHouse(input: {
  id: HouseId
  headId: number
  surnameHint?: string
  villageId?: number | null
  wealth?: number
  tenantIds?: number[]
  siblingIds?: number[]
  lifeTag?: DynastyHouse['lifeTag']
  tick?: number
}): DynastyHouse {
  const tick = input.tick ?? 0
  return {
    id: input.id,
    villageId: input.villageId ?? null,
    surnameHint: input.surnameHint ?? 'House',
    lifeTag: input.lifeTag ?? 'generic',
    phase: 'stable',
    formedTick: tick,
    headId: input.headId,
    heirId: null,
    siblingIds: input.siblingIds ?? [],
    wealth: input.wealth ?? 40,
    debt: 0,
    prestigeSink: 0,
    hiredCount: 0,
    mansion: false,
    rentMultiplier: 1,
    outputLevel: 1,
    tenantIds: input.tenantIds ?? [],
    claims: [],
    branches: [],
    modifiers: defaultInheritanceModifiers(),
    mismanagementPressure: 0,
    events: [],
    collapsedTick: null,
    splitTick: null,
  }
}

/**
 * Full Malik chain step (order matters):
 * succession (optional) → mismanage → peasant exit → seize → schism.
 */
export function tickDynastyHouse(
  house: DynastyHouse,
  ctx: DynastyTickContext,
  opts?: { successionHeir?: HeirProfile },
): { house: DynastyHouse; schism: FamilySchismResult } {
  let next = house
  if (opts?.successionHeir) {
    next = applySuccession(next, opts.successionHeir, ctx.tick, ctx.roll)
  }
  next = applyMismanagementTick(next, ctx.tick, ctx.roll, ctx.cityStress ?? 0)
  next = applyPeasantExit(next, ctx.tick, ctx.roll, ctx.tenants)
  next = applyCreditorSeize(next, ctx.tick, ctx.roll)
  return resolveFamilySchism(next, ctx.tick, ctx.roll)
}
