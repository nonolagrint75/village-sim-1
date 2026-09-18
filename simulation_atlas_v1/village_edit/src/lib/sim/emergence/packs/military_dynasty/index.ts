/**
 * Staging pack: military_dynasty (Arvid)
 * Isolated — integrator wires into guard careers, bandit trauma, war land, heirs.
 */

export type ActorId = number
export type VillageId = number
export type PolityId = number
export type CircleId = number
export type DynastyId = string

export type MilDynLifeTag = 'Arvid' | 'Jonas' | 'generic'

export type MilDynPhase =
  | 'civilian'
  | 'guard'
  | 'traumatized'
  | 'militia_lead'
  | 'war_faction'
  | 'landed'
  | 'dynasty'

export type MilDynEventKind =
  | 'farmer_to_guard'
  | 'bandit_trauma'
  | 'militia_lead'
  | 'war_faction'
  | 'land_inherit'
  | 'military_heir'
  | 'dynasty_prestige'

export interface MilDynEvent {
  kind: MilDynEventKind
  tick: number
  dynastyId: DynastyId
  actorId?: ActorId
  amount?: number
  note?: string
}

export interface SoldierCareerHint {
  actorId: ActorId
  villageId: VillageId
  polityId: PolityId | null
  lifeTag: MilDynLifeTag
  courage: number
  loyalty: number
  trauma: number
  isGuard: boolean
}

export interface MilitaryDynasty {
  id: DynastyId
  phase: MilDynPhase
  founderId: ActorId
  polityId: PolityId | null
  villageId: VillageId
  militiaCircleId: CircleId | null
  factionRef: string | null
  landPlots: number
  memberIds: ActorId[]
  heirIds: ActorId[]
  prestige: number
  traumaHeat: number
  events: MilDynEvent[]
  formedTick: number
}

export interface MilDynTickContext {
  tick: number
  roll: number
  warHeat?: number
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function pushEvent(d: MilitaryDynasty, ev: MilDynEvent, cap = 48): void {
  d.events.push(ev)
  while (d.events.length > cap) d.events.shift()
}

export function createDynastyId(actorId: ActorId, tick: number): DynastyId {
  return `mildyn:${actorId}:${tick}`
}

export function seedDynastyTrack(p: SoldierCareerHint, tick: number): MilitaryDynasty {
  return {
    id: createDynastyId(p.actorId, tick),
    phase: p.isGuard ? 'guard' : 'civilian',
    founderId: p.actorId,
    polityId: p.polityId,
    villageId: p.villageId,
    militiaCircleId: null,
    factionRef: null,
    landPlots: 0,
    memberIds: [p.actorId],
    heirIds: [],
    prestige: 0.1,
    traumaHeat: p.trauma,
    events: [],
    formedTick: tick,
  }
}

export function tryFarmerToGuard(
  d: MilitaryDynasty,
  p: SoldierCareerHint,
  threatHint: number,
  tick: number,
  roll: number,
): boolean {
  if (d.phase !== 'civilian') return false
  if (threatHint < 0.25 && p.courage < 0.4) return false
  if (roll > 0.55 + p.courage * 0.3 + threatHint * 0.2) return false
  d.phase = 'guard'
  pushEvent(d, {
    kind: 'farmer_to_guard',
    tick,
    dynastyId: d.id,
    actorId: p.actorId,
  })
  return true
}

export function applyBanditTrauma(d: MilitaryDynasty, severity: number, tick: number): void {
  d.traumaHeat = clamp01(d.traumaHeat + severity)
  if (d.phase === 'guard' || d.phase === 'civilian') d.phase = 'traumatized'
  d.prestige = clamp01(d.prestige + severity * 0.05)
  pushEvent(d, {
    kind: 'bandit_trauma',
    tick,
    dynastyId: d.id,
    actorId: d.founderId,
    amount: severity,
  })
}

export function tryMilitiaLead(
  d: MilitaryDynasty,
  circleId: CircleId,
  followerCount: number,
  tick: number,
  roll: number,
): boolean {
  if (!(d.phase === 'traumatized' || d.phase === 'guard' || d.phase === 'militia_lead')) return false
  if (followerCount < 2 || roll > 0.7) return false
  d.militiaCircleId = circleId
  d.phase = 'militia_lead'
  d.prestige = clamp01(d.prestige + 0.1 + followerCount * 0.02)
  pushEvent(d, {
    kind: 'militia_lead',
    tick,
    dynastyId: d.id,
    amount: followerCount,
    note: `circle ${circleId}`,
  })
  return true
}

export function noteWarFaction(d: MilitaryDynasty, factionRef: string, tick: number): void {
  d.factionRef = factionRef
  d.phase = 'war_faction'
  d.prestige = clamp01(d.prestige + 0.08)
  pushEvent(d, {
    kind: 'war_faction',
    tick,
    dynastyId: d.id,
    note: factionRef,
  })
}

export function tryLandInherit(
  d: MilitaryDynasty,
  plots: number,
  tick: number,
): boolean {
  if (plots <= 0) return false
  if (!(d.phase === 'war_faction' || d.phase === 'militia_lead' || d.phase === 'landed' || d.phase === 'dynasty')) {
    return false
  }
  d.landPlots += plots
  d.phase = 'landed'
  d.prestige = clamp01(d.prestige + plots * 0.05)
  pushEvent(d, {
    kind: 'land_inherit',
    tick,
    dynastyId: d.id,
    amount: plots,
  })
  return true
}

export function tryMilitaryHeir(
  d: MilitaryDynasty,
  childId: ActorId,
  tick: number,
  roll: number,
): boolean {
  if (d.landPlots < 1 && d.prestige < 0.35) return false
  if (roll > 0.75) return false
  if (!d.memberIds.includes(childId)) d.memberIds.push(childId)
  if (!d.heirIds.includes(childId)) d.heirIds.push(childId)
  d.phase = 'dynasty'
  d.prestige = clamp01(d.prestige + 0.1)
  pushEvent(d, {
    kind: 'military_heir',
    tick,
    dynastyId: d.id,
    actorId: childId,
  })
  pushEvent(d, {
    kind: 'dynasty_prestige',
    tick,
    dynastyId: d.id,
    amount: d.prestige,
  })
  return true
}

export function tickMilitaryDynasty(d: MilitaryDynasty, ctx: MilDynTickContext): MilitaryDynasty {
  const next: MilitaryDynasty = {
    ...d,
    memberIds: [...d.memberIds],
    heirIds: [...d.heirIds],
    events: [...d.events],
  }
  if (ctx.warHeat != null && ctx.warHeat > 0.4 && next.phase === 'militia_lead') {
    next.prestige = clamp01(next.prestige + 0.02)
  }
  if (next.heirIds.length > 0 && next.landPlots > 0) next.phase = 'dynasty'
  return next
}

export function militaryDynastyStats(d: MilitaryDynasty): {
  phase: MilDynPhase
  prestige: number
  landPlots: number
  heirs: number
  traumaHeat: number
  events: number
} {
  return {
    phase: d.phase,
    prestige: d.prestige,
    landPlots: d.landPlots,
    heirs: d.heirIds.length,
    traumaHeat: d.traumaHeat,
    events: d.events.length,
  }
}