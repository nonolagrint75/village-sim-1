import type { DefectionEvent, FriendDeathHint, MilitaryFaction, SoldierProfile, SupplyHint } from './types'

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function pushEvent(f: MilitaryFaction, ev: DefectionEvent, cap = 48): void {
  f.events.push(ev)
  while (f.events.length > cap) f.events.shift()
}

export function meanLoyalty(soldiers: SoldierProfile[]): number {
  if (soldiers.length === 0) return 0.5
  return soldiers.reduce((s, x) => s + x.loyalty, 0) / soldiers.length
}

export function noteLoyalBaseline(faction: MilitaryFaction, soldiers: SoldierProfile[], tick: number): void {
  faction.loyaltyMean = meanLoyalty(soldiers)
  pushEvent(faction, {
    kind: 'loyalty_noted',
    tick,
    factionId: faction.id,
    amount: faction.loyaltyMean,
  })
}

/** Friend death shocks Jonas-like loyalty; officers (Arvid) gain discontent slower. */
export function applyFriendDeath(
  faction: MilitaryFaction,
  soldiers: SoldierProfile[],
  hint: FriendDeathHint,
): SoldierProfile | null {
  const witness = soldiers.find((s) => s.actorId === hint.witnessId)
  if (!witness) return null
  if (!faction.memberIds.includes(hint.witnessId) && faction.coreSoldierId !== hint.witnessId) {
    // Allow grief to pull witness into faction tracking
    if (!faction.memberIds.includes(hint.witnessId)) faction.memberIds.push(hint.witnessId)
  }
  const shock = hint.bond * (hint.cause === 'repression' ? 1.15 : hint.cause === 'battle' ? 0.9 : 0.7)
  witness.loyalty = clamp01(witness.loyalty - shock * 0.35)
  witness.grievance = clamp01(witness.grievance + shock * 0.4)
  faction.griefHeat = clamp01(faction.griefHeat + shock * 0.45)
  faction.loyaltyMean = meanLoyalty(soldiers)
  if (faction.phase === 'loyal') faction.phase = 'grieving'
  pushEvent(faction, {
    kind: 'friend_died',
    tick: hint.tick,
    factionId: faction.id,
    actorId: hint.witnessId,
    amount: shock,
    note: hint.cause,
  })
  return witness
}

export function applySupplyFailure(faction: MilitaryFaction, hint: SupplyHint, soldiers: SoldierProfile[]): void {
  if (hint.polityId !== faction.polityId) return
  const fail = clamp01(1 - hint.supplyLevel) + hint.shortfall * 0.15
  if (fail < 0.25) return
  faction.supplyStress = clamp01(faction.supplyStress + fail * 0.4)
  for (const s of soldiers) {
    if (!faction.memberIds.includes(s.actorId)) continue
    s.supply = clamp01(Math.min(s.supply, hint.supplyLevel))
    s.loyalty = clamp01(s.loyalty - fail * 0.12)
    s.grievance = clamp01(s.grievance + fail * 0.15)
  }
  faction.loyaltyMean = meanLoyalty(soldiers)
  pushEvent(faction, {
    kind: 'supply_failed',
    tick: hint.tick,
    factionId: faction.id,
    amount: fail,
  })
  if (faction.phase === 'loyal' || faction.phase === 'grieving') {
    faction.phase = 'supply_stress'
  }
}

export function raiseOfficerDiscontent(
  faction: MilitaryFaction,
  officers: SoldierProfile[],
  tick: number,
): boolean {
  const offs = officers.filter((o) => o.isOfficer && faction.memberIds.includes(o.actorId))
  if (offs.length === 0) return false
  const pressure = faction.supplyStress * 0.45 + faction.griefHeat * 0.35 + (1 - faction.loyaltyMean) * 0.3
  if (pressure < 0.4) return false
  faction.discontent = clamp01(faction.discontent + pressure * 0.35)
  for (const o of offs) {
    o.grievance = clamp01(o.grievance + 0.12)
    o.loyalty = clamp01(o.loyalty - 0.08)
  }
  // Prefer Arvid-tagged officer as leader
  const arvid = offs.find((o) => o.lifeTag === 'Arvid') ?? offs.sort((a, b) => b.grievance - a.grievance)[0]
  faction.officerId = arvid.actorId
  faction.leaderId = arvid.actorId
  faction.phase = 'officer_discontent'
  pushEvent(faction, {
    kind: 'officer_discontent',
    tick,
    factionId: faction.id,
    actorId: arvid.actorId,
    amount: faction.discontent,
  })
  return true
}