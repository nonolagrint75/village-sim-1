/**
 * Cascade: peasant exit → output drop → creditor seize → sibling contest / schism.
 */

import { scoreMismanagementPressure } from './pressure'
import type {
  CreditorClaim,
  DynastyBranch,
  DynastyEvent,
  DynastyHouse,
  FamilySchismResult,
  TenantSnapshot,
} from './types'

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function pushEvent(house: DynastyHouse, ev: DynastyEvent): DynastyHouse {
  return { ...house, events: [...house.events, ev] }
}

function synthTenants(house: DynastyHouse): TenantSnapshot[] {
  return house.tenantIds.map((actorId, i) => ({
    actorId,
    rentBurden: clamp01(0.35 + (house.rentMultiplier - 1) * 0.4 + (i % 3) * 0.05),
    exitPressure: clamp01(0.2 + (house.rentMultiplier - 1) * 0.3),
    outputShare: 1 / Math.max(house.tenantIds.length, 1),
  }))
}

/** Peasants leave under rent squeeze; output falls. */
export function applyPeasantExit(
  house: DynastyHouse,
  tick: number,
  roll: number,
  tenants?: TenantSnapshot[],
): DynastyHouse {
  if (house.phase === 'collapsed' || house.tenantIds.length === 0) return house
  if (house.rentMultiplier < 1.15 && house.phase !== 'squeezing') return house

  const snaps = tenants ?? synthTenants(house)
  const hardness = house.modifiers.hardness
  const leavers: number[] = []
  let lostOutput = 0

  for (const t of snaps) {
    const pressure = clamp01(
      t.rentBurden * 0.4 + (house.rentMultiplier - 1) * 0.4 + hardness * 0.1 + t.exitPressure * 0.25,
    )
    if (pressure > 0.55 && roll + pressure * 0.35 > 0.85) {
      leavers.push(t.actorId)
      lostOutput += t.outputShare
    }
  }

  if (leavers.length === 0) return house

  let next: DynastyHouse = {
    ...house,
    tenantIds: house.tenantIds.filter((id) => !leavers.includes(id)),
    claims: [...house.claims],
    events: [...house.events],
  }
  next.outputLevel = clamp01(next.outputLevel - lostOutput * 0.9 - leavers.length * 0.04)
  next.phase = 'peasant_exit'
  for (const id of leavers) {
    next = pushEvent(next, {
      kind: 'peasant_left',
      tick,
      houseId: next.id,
      actorId: id,
      note: 'rent squeeze exit',
    })
  }
  next = pushEvent(next, {
    kind: 'output_dropped',
    tick,
    houseId: next.id,
    amount: next.outputLevel,
    note: `output now ${next.outputLevel.toFixed(2)}`,
  })
  if (next.outputLevel < 0.45) next.phase = 'output_collapse'
  next.debt += leavers.length * 1.2
  return next
}

/** Creditors seize when debt outruns estate + output. */
export function applyCreditorSeize(
  house: DynastyHouse,
  tick: number,
  roll: number,
): DynastyHouse {
  const scored = scoreMismanagementPressure({
    wealth: house.wealth,
    debt: house.debt,
    prestigeSink: house.prestigeSink,
    hiredCount: house.hiredCount,
    mansion: house.mansion,
    rentMultiplier: house.rentMultiplier,
    outputLevel: house.outputLevel,
    modifiers: house.modifiers,
  })
  if (scored.seizeRisk < 0.45 && house.debt < house.wealth * 0.9) return house

  let next: DynastyHouse = {
    ...house,
    claims: house.claims.map((c) => ({ ...c })),
    events: [...house.events],
  }

  if (next.claims.length === 0 && next.debt > 8) {
    const claim: CreditorClaim = {
      id: `claim_${next.id}_${tick}`,
      creditorId: `cred_${next.id}`,
      houseId: next.id,
      principal: next.debt,
      remaining: next.debt,
      issuedTick: tick,
      seizePressure: scored.seizeRisk,
      seized: false,
    }
    next.claims.push(claim)
    next = pushEvent(next, {
      kind: 'creditor_claim',
      tick,
      houseId: next.id,
      amount: claim.principal,
    })
  }

  let seizedTotal = 0
  for (const claim of next.claims) {
    if (claim.seized) continue
    claim.seizePressure = clamp01(
      claim.seizePressure + scored.seizeRisk * 0.2 + (1 - next.outputLevel) * 0.15,
    )
    if (claim.seizePressure > 0.6 && roll > 0.4) {
      const take = Math.min(
        claim.remaining,
        next.wealth * 0.5 + next.prestigeSink * 0.3 + (next.mansion ? 10 : 0),
      )
      claim.remaining = Math.max(0, claim.remaining - take)
      claim.seized = claim.remaining < 1
      next.wealth = Math.max(0, next.wealth - take * 0.7)
      next.prestigeSink = Math.max(0, next.prestigeSink - take * 0.2)
      if (next.mansion && take > 8) next.mansion = false
      seizedTotal += take
      next = pushEvent(next, {
        kind: 'asset_seized',
        tick,
        houseId: next.id,
        amount: take,
        note: claim.id,
      })
    }
  }

  if (seizedTotal > 0) {
    next.phase = 'creditor_seize'
    next.debt = Math.max(0, next.debt - seizedTotal * 0.5)
  }
  return next
}

/**
 * Sibling contest / branch split / dynasty collapse.
 * Export surface: family schism.
 */
export function resolveFamilySchism(
  house: DynastyHouse,
  tick: number,
  roll: number,
): { house: DynastyHouse; schism: FamilySchismResult } {
  const empty: FamilySchismResult = {
    occurred: false,
    kind: 'none',
    winnerId: null,
    loserIds: [],
    newBranch: null,
    estateTakenByCreditors: 0,
    note: 'no schism',
  }

  if (house.phase === 'collapsed') {
    return { house, schism: { ...empty, note: 'already collapsed' } }
  }

  const scored = scoreMismanagementPressure({
    wealth: house.wealth,
    debt: house.debt,
    prestigeSink: house.prestigeSink,
    hiredCount: house.hiredCount,
    mansion: house.mansion,
    rentMultiplier: house.rentMultiplier,
    outputLevel: house.outputLevel,
    modifiers: house.modifiers,
  })

  const rivals = house.siblingIds.filter((id) => id !== house.headId)
  const estateHollow =
    house.wealth < 5 && house.debt > 10 && house.outputLevel < 0.35 && house.phase === 'creditor_seize'
  const contestReady =
    rivals.length > 0 &&
    (scored.contestRisk > 0.55 || house.phase === 'creditor_seize' || house.phase === 'output_collapse')

  let next: DynastyHouse = {
    ...house,
    branches: [...house.branches],
    claims: house.claims.map((c) => ({ ...c })),
    events: [...house.events],
    siblingIds: [...house.siblingIds],
  }

  if (estateHollow && roll > 0.35) {
    const seized = next.claims.reduce((s, c) => s + (c.seized ? c.principal - c.remaining : 0), 0)
    next.phase = 'collapsed'
    next.collapsedTick = tick
    next.wealth = 0
    next = pushEvent(next, {
      kind: 'house_collapsed',
      tick,
      houseId: next.id,
      amount: seized,
      note: 'dynasty collapse after seize + output failure',
    })
    return {
      house: next,
      schism: {
        occurred: true,
        kind: 'collapse',
        winnerId: null,
        loserIds: [next.headId, ...rivals],
        newBranch: null,
        estateTakenByCreditors: seized,
        note: 'house collapsed',
      },
    }
  }

  if (!contestReady) return { house: next, schism: empty }

  const challenger = rivals[Math.floor(roll * rivals.length) % rivals.length]!
  next.phase = 'sibling_contest'
  next = pushEvent(next, {
    kind: 'sibling_challenged',
    tick,
    houseId: next.id,
    actorId: challenger,
    note: 'sibling contest for remnant estate',
  })

  const headStrength = 0.45 + next.modifiers.arrogance * 0.2 - next.mismanagementPressure * 0.25
  const challengerStrength = 0.4 + next.modifiers.rivalry * 0.35 + (1 - next.outputLevel) * 0.15
  const headWins = roll * headStrength >= (1 - roll) * challengerStrength

  if (headWins && next.wealth > 8 && next.outputLevel > 0.4) {
    next = pushEvent(next, {
      kind: 'contest_resolved',
      tick,
      houseId: next.id,
      actorId: next.headId,
      note: 'head retains house',
    })
    next.siblingIds = next.siblingIds.filter((id) => id !== challenger)
    return {
      house: next,
      schism: {
        occurred: true,
        kind: 'contest',
        winnerId: next.headId,
        loserIds: [challenger],
        newBranch: null,
        estateTakenByCreditors: 0,
        note: 'contest won by sitting head',
      },
    }
  }

  const share = clamp01(0.25 + next.modifiers.rivalry * 0.25 + (1 - headStrength) * 0.2)
  const loyalCount = Math.max(1, Math.floor(next.tenantIds.length * share))
  const loyalTenantIds = next.tenantIds.slice(0, loyalCount)
  const branch: DynastyBranch = {
    id: `branch_${next.id}_${challenger}_${tick}`,
    houseId: next.id,
    headId: challenger,
    formedTick: tick,
    estateShare: share,
    loyalTenantIds,
  }
  next.branches = [...next.branches, branch]
  next.tenantIds = next.tenantIds.filter((id) => !loyalTenantIds.includes(id))
  next.wealth = next.wealth * (1 - share)
  next.outputLevel = clamp01(next.outputLevel * (1 - share * 0.8))
  next.siblingIds = next.siblingIds.filter((id) => id !== challenger)
  next.phase = 'branch_split'
  next.splitTick = tick
  next = pushEvent(next, {
    kind: 'branch_split',
    tick,
    houseId: next.id,
    actorId: challenger,
    amount: share,
    note: branch.id,
  })
  next = pushEvent(next, {
    kind: 'contest_resolved',
    tick,
    houseId: next.id,
    actorId: challenger,
    note: 'cadet branch formed',
  })

  if (next.wealth < 4 && next.outputLevel < 0.3) {
    next.phase = 'collapsed'
    next.collapsedTick = tick
    next = pushEvent(next, {
      kind: 'house_collapsed',
      tick,
      houseId: next.id,
      note: 'main stem collapsed after split',
    })
    return {
      house: next,
      schism: {
        occurred: true,
        kind: 'collapse',
        winnerId: challenger,
        loserIds: [house.headId],
        newBranch: branch,
        estateTakenByCreditors: 0,
        note: 'split then main collapse',
      },
    }
  }

  return {
    house: next,
    schism: {
      occurred: true,
      kind: 'branch_split',
      winnerId: challenger,
      loserIds: [house.headId],
      newBranch: branch,
      estateTakenByCreditors: 0,
      note: 'cadet branch split',
    },
  }
}
