// @ts-nocheck
/**
 * Negotiate / fight / flee + faction deal + branching outcomes (Daren / Kael).
 */

import { huntPressure } from './bounty'
import type {
  BranchOutcome,
  EncounterChoice,
  EncounterContext,
  EncounterResult,
  FactionDeal,
  ParallelGang,
} from './types'
import { aliveMembers, clamp, pushEventCap } from './util'

/** Soft AI: pick negotiate/fight/flee from pressure + traits of chief. */
export function chooseEncounterAction(ctx: EncounterContext): EncounterChoice {
  const chief = ctx.gang.members.find((m) => m.actorId === ctx.gang.chiefId && m.alive)
  const pressure = huntPressure(ctx.gang, ctx.hunt)
  const strength = clamp(aliveMembers(ctx.gang).length / 8 + ctx.gang.zoneControl * 0.4, 0, 1)
  const hasOffer = ctx.factionOffer != null

  // Kael bias: prefer negotiate/faction when zone control high
  const kael = chief?.lifeTag === 'Kael' || ctx.gang.members.some((m) => m.lifeTag === 'Kael' && m.alive)
  const daren = chief?.lifeTag === 'Daren' || ctx.gang.members.some((m) => m.lifeTag === 'Daren' && m.alive)

  if (hasOffer && (kael || pressure > 0.55) && ctx.roll < 0.55 + (kael ? 0.15 : 0)) {
    return 'negotiate'
  }
  if (pressure > 0.7 && strength < 0.35) return 'flee'
  if (daren && strength >= 0.4 && ctx.roll > 0.45) return 'fight'
  if (pressure < 0.35) return strength > 0.5 ? 'fight' : 'flee'
  if (ctx.roll < 0.33) return 'negotiate'
  if (ctx.roll < 0.66) return 'fight'
  return 'flee'
}

export function applyFactionDeal(
  gang: ParallelGang,
  offer: { factionId: string; coin: number; protection: number },
  tick: number,
): FactionDeal {
  const deal: FactionDeal = {
    factionId: offer.factionId,
    gangId: gang.id,
    tick,
    protection: offer.protection,
    intel: 0.4 + offer.protection * 0.3,
    coinPaid: offer.coin,
    hostileToAuthority: true,
  }
  gang.deals.push(deal)
  gang.loot.coin += offer.coin
  gang.phase = 'allied'
  gang.zoneControl = clamp(gang.zoneControl + 0.1 + offer.protection * 0.15, 0, 1)
  pushEventCap(gang.events, {
    kind: 'faction_deal',
    tick,
    gangId: gang.id,
    amount: offer.coin,
    note: offer.factionId,
  })
  return deal
}

/**
 * Resolve encounter → branching outcomes.
 * Integrator applies deaths / polity integration from outcome.
 */
export function resolveEncounter(ctx: EncounterContext, choice?: EncounterChoice): EncounterResult {
  const pick = choice ?? chooseEncounterAction(ctx)
  const pressure = huntPressure(ctx.gang, ctx.hunt)
  const strength = clamp(
    aliveMembers(ctx.gang).length / 8 + ctx.gang.zoneControl * 0.35 + gangDealBoost(ctx.gang),
    0,
    1,
  )
  let outcome: BranchOutcome = 'ongoing'
  let note = ''

  if (pick === 'negotiate') {
    ctx.gang.phase = 'negotiating'
    if (ctx.factionOffer) {
      applyFactionDeal(ctx.gang, ctx.factionOffer, ctx.tick)
      // Strong allied gangs may become military force or integrate
      if (ctx.gang.zoneControl >= 0.55 && ctx.roll > 0.5) {
        outcome = 'military_force'
        note = 'allied_military'
      } else if (ctx.roll > 0.75 && ctx.gang.parallel.localSupport > 0.45) {
        outcome = 'political_integration'
        ctx.gang.phase = 'integrated'
        pushEventCap(ctx.gang.events, {
          kind: 'integrated',
          tick: ctx.tick,
          gangId: ctx.gang.id,
          note: ctx.factionOffer.factionId,
        })
      } else {
        outcome = 'negotiate_faction_deal'
      }
    } else if (ctx.roll < 0.4 + (1 - pressure) * 0.3) {
      outcome = 'negotiate_truce'
      note = 'truce'
      for (const b of ctx.gang.bounties) b.active = false
      if (ctx.gang.phase === 'hunted' || ctx.gang.phase === 'negotiating') ctx.gang.phase = 'established'
    } else {
      outcome = 'fight_lose_captured'
      note = 'talks_failed'
    }
  } else if (pick === 'flee') {
    if (ctx.roll > pressure * 0.8) {
      outcome = 'flee_success'
      ctx.gang.phase = 'scattered'
      note = 'escaped'
    } else {
      outcome = 'flee_caught'
      note = 'hunted_down'
      killWeakest(ctx.gang, ctx.tick)
    }
  } else {
    // fight
    const winChance = clamp(strength - (ctx.hunt?.strength ?? 0.4) * 0.7 + 0.35, 0.1, 0.85)
    if (ctx.roll < winChance) {
      outcome = 'fight_win'
      ctx.gang.notoriety = clamp(ctx.gang.notoriety + 0.05, 0, 1)
      ctx.gang.zoneControl = clamp(ctx.gang.zoneControl + 0.08, 0, 1)
      note = 'repelled_authority'
      if (ctx.gang.zoneControl >= 0.6) outcome = 'military_force'
    } else if (ctx.roll > winChance + 0.25) {
      outcome = 'fight_lose_dead'
      note = 'chief_or_many_dead'
      destroyGang(ctx.gang, ctx.tick)
    } else {
      outcome = 'fight_lose_captured'
      note = 'captured'
      killWeakest(ctx.gang, ctx.tick)
    }
  }

  pushEventCap(ctx.gang.events, {
    kind: 'encounter',
    tick: ctx.tick,
    gangId: ctx.gang.id,
    note: `${pick}:${outcome}`,
  })
  return { choice: pick, outcome, note }
}

function gangDealBoost(gang: ParallelGang): number {
  if (gang.deals.length === 0) return 0
  const last = gang.deals[gang.deals.length - 1]!
  return last.protection * 0.2
}

function killWeakest(gang: ParallelGang, tick: number): void {
  const alive = aliveMembers(gang)
  const victim = [...alive].sort((a, b) => a.loyalty - b.loyalty)[0]
  if (!victim) return
  victim.alive = false
  pushEventCap(gang.events, {
    kind: 'member_dead',
    tick,
    gangId: gang.id,
    actorId: victim.actorId,
  })
  if (aliveMembers(gang).length === 0) destroyGang(gang, tick)
}

export function destroyGang(gang: ParallelGang, tick: number): void {
  gang.phase = 'destroyed'
  for (const m of gang.members) m.alive = false
  for (const b of gang.bounties) b.active = false
  pushEventCap(gang.events, { kind: 'gang_destroyed', tick, gangId: gang.id })
}

/** Explicit political integration hook (after deal + support). */
export function tryPoliticalIntegration(
  gang: ParallelGang,
  tick: number,
  polityFactionId: string,
  roll: number,
): boolean {
  if (gang.phase !== 'allied' && gang.phase !== 'negotiating') return false
  if (gang.zoneControl < 0.4 || gang.parallel.localSupport < 0.35) return false
  if (roll < 0.45) return false
  gang.phase = 'integrated'
  pushEventCap(gang.events, {
    kind: 'integrated',
    tick,
    gangId: gang.id,
    note: polityFactionId,
  })
  return true
}
