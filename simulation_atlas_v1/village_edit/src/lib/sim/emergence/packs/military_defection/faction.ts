import { applyFriendDeath, applySupplyFailure, meanLoyalty, noteLoyalBaseline, raiseOfficerDiscontent } from './loyalty'
import type {
  DefectionEvent,
  DefectionPhase,
  DefectionTickContext,
  FactionId,
  FriendDeathHint,
  MilitaryFaction,
  PoliticalOffer,
  RepressOrderHint,
  SoldierProfile,
  SupplyHint,
} from './types'

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function pushEvent(f: MilitaryFaction, ev: DefectionEvent, cap = 48): void {
  f.events.push(ev)
  while (f.events.length > cap) f.events.shift()
}

function setPhase(f: MilitaryFaction, phase: DefectionPhase, tick: number, kind: DefectionEvent['kind'], note?: string): void {
  f.phase = phase
  pushEvent(f, { kind, tick, factionId: f.id, note })
}

export function createFactionId(polityId: number, tick: number): FactionId {
  return `milfac:${polityId}:${tick}`
}

/**
 * Seed a loyal unit track (Jonas core). Does not defect yet.
 */
export function seedLoyalUnit(
  polityId: number,
  soldiers: SoldierProfile[],
  tick: number,
): MilitaryFaction | null {
  const pool = soldiers.filter((s) => s.polityId === polityId && s.loyalty >= 0.4)
  if (pool.length < 2) return null
  const jonas: SoldierProfile | undefined =
    pool.find((s) => s.lifeTag === 'Jonas') ??
    pool.filter((s) => !s.isOfficer).sort((a, b) => b.loyalty - a.loyalty)[0] ??
    pool.slice().sort((a, b) => b.loyalty - a.loyalty)[0]
  if (!jonas || typeof jonas.actorId !== 'number') return null
  const coreId = jonas.actorId
  const arvid =
    pool.find((s) => s.lifeTag === 'Arvid' && s.isOfficer) ??
    pool.find((s) => s.isOfficer) ??
    null
  const members = pool.slice(0, 12).map((s) => s.actorId)
  if (!members.includes(coreId)) members.unshift(coreId)
  if (arvid && !members.includes(arvid.actorId)) members.push(arvid.actorId)

  const f: MilitaryFaction = {
    id: createFactionId(polityId, tick),
    polityId,
    phase: 'loyal',
    formedTick: tick,
    leaderId: arvid?.actorId ?? coreId,
    coreSoldierId: coreId,
    officerId: arvid?.actorId ?? null,
    memberIds: members,
    loyaltyMean: meanLoyalty(pool),
    supplyStress: 0,
    griefHeat: 0,
    discontent: 0,
    warId: null,
    pendingOffer: null,
    events: [],
  }
  noteLoyalBaseline(f, pool, tick)
  return f
}

export function onFriendDeath(f: MilitaryFaction, soldiers: SoldierProfile[], hint: FriendDeathHint): void {
  applyFriendDeath(f, soldiers, hint)
}

export function onSupplyHint(f: MilitaryFaction, soldiers: SoldierProfile[], hint: SupplyHint): void {
  applySupplyFailure(f, hint, soldiers)
}

export function tryOfficerDiscontent(f: MilitaryFaction, soldiers: SoldierProfile[], tick: number): boolean {
  return raiseOfficerDiscontent(f, soldiers, tick)
}

/** Crystallize military faction from officer discontent + grief/supply. */
export function tryFormMilitaryFaction(f: MilitaryFaction, tick: number): boolean {
  if (f.phase !== 'officer_discontent' && f.phase !== 'supply_stress' && f.phase !== 'grieving') return false
  if (f.discontent < 0.35 && f.supplyStress < 0.45) return false
  if (f.memberIds.length < 3) return false
  setPhase(f, 'military_faction', tick, 'faction_formed', `n=${f.memberIds.length}`)
  f.discontent = clamp01(f.discontent + 0.1)
  return true
}

/**
 * Refuse vs obey repression order — key Jonas/Arvid beat.
 * Returns 'refuse' | 'obey' | 'skip'.
 */
export function resolveRepressOrder(
  f: MilitaryFaction,
  hint: RepressOrderHint,
  roll: number,
): 'refuse' | 'obey' | 'skip' {
  if (hint.polityId !== f.polityId) return 'skip'
  if (f.phase !== 'military_faction' && f.phase !== 'officer_discontent' && f.phase !== 'refuse_repress') {
    return 'skip'
  }
  const refuseScore =
    f.discontent * 0.35 +
    f.griefHeat * 0.25 +
    f.supplyStress * 0.2 +
    (1 - f.loyaltyMean) * 0.25 +
    (1 - hint.issuerLegitimacy) * 0.3 +
    hint.force * 0.1

  if (refuseScore + roll * 0.2 >= 0.55) {
    setPhase(f, 'refuse_repress', hint.tick, 'refused_repress', hint.targetRef)
    f.loyaltyMean = clamp01(f.loyaltyMean - 0.12)
    return 'refuse'
  }
  pushEvent(f, {
    kind: 'obeyed_repress',
    tick: hint.tick,
    factionId: f.id,
    amount: hint.force,
    note: hint.targetRef,
  })
  f.loyaltyMean = clamp01(f.loyaltyMean + 0.04)
  if (f.griefHeat > 0.6 && roll > 0.85) {
    // Obeying traumatic order still cracks unit
    f.discontent = clamp01(f.discontent + 0.15)
  }
  return 'obey'
}

/** Enter civil war command — integrator supplies war id from war.ts. */
export function enterCivilWarCommand(f: MilitaryFaction, warId: number, tick: number): void {
  if (f.phase !== 'refuse_repress' && f.phase !== 'military_faction') return
  f.warId = warId
  setPhase(f, 'civil_war_command', tick, 'civil_war_joined', `war=${warId}`)
}

export function makePoliticalOffer(f: MilitaryFaction, offer: PoliticalOffer): void {
  if (f.phase !== 'civil_war_command' && f.phase !== 'refuse_repress' && f.phase !== 'offer_pending') return
  f.pendingOffer = offer
  setPhase(f, 'offer_pending', offer.tick, 'offer_made', offer.kind)
}

/**
 * Choice: accept political offer (defect / settle) vs reject (stay in civil war / remain loyal path).
 */
export function resolvePoliticalOffer(
  f: MilitaryFaction,
  tick: number,
  roll: number,
  bias: 'accept' | 'reject' | 'auto' = 'auto',
): 'accepted' | 'rejected' | 'none' {
  if (f.phase !== 'offer_pending' || !f.pendingOffer) return 'none'
  const offer = f.pendingOffer
  let accept = bias === 'accept'
  if (bias === 'auto') {
    const score = offer.attractiveness * 0.55 + f.discontent * 0.25 + f.supplyStress * 0.15 - f.loyaltyMean * 0.2
    accept = score + roll * 0.25 >= 0.5
  } else if (bias === 'reject') {
    accept = false
  }
  if (accept) {
    pushEvent(f, {
      kind: 'offer_accepted',
      tick,
      factionId: f.id,
      note: offer.kind,
      amount: offer.attractiveness,
    })
    if (offer.kind === 'rival_command' || offer.kind === 'amnesty' || offer.kind === 'land') {
      setPhase(f, 'defected', tick, 'defected', offer.kind)
    } else if (offer.kind === 'promotion') {
      setPhase(f, 'stayed_loyal', tick, 'remained', 'bought back')
    } else {
      setPhase(f, 'broken', tick, 'defected', 'exile')
    }
    f.pendingOffer = null
    return 'accepted'
  }
  pushEvent(f, { kind: 'offer_rejected', tick, factionId: f.id, note: offer.kind })
  // Back to civil war pressure
  setPhase(f, 'civil_war_command', tick, 'offer_rejected')
  f.pendingOffer = null
  f.discontent = clamp01(f.discontent + 0.08)
  return 'rejected'
}

export function tickMilitaryFaction(f: MilitaryFaction, ctx: DefectionTickContext): MilitaryFaction {
  if (f.phase === 'loyal') return f
  // Slow heal if supplies recover externally (integrator should call onSupplyHint with high supply)
  f.griefHeat = clamp01(f.griefHeat - 0.001)
  if ((ctx.warHeat ?? 0) > 0.4 && f.phase === 'military_faction') {
    f.discontent = clamp01(f.discontent + 0.01)
  }
  if (f.phase === 'refuse_repress' && ctx.roll > 0.9 && f.warId == null) {
    // Soft nudge: integrator should open war; we only mark readiness via discontent
    f.discontent = clamp01(f.discontent + 0.05)
  }
  return f
}