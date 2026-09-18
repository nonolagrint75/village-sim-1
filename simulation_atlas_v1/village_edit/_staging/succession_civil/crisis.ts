import type {
  ActorId,
  ClaimantProfile,
  CrisisId,
  PolityId,
  SuccessionCrisis,
  VillageId,
} from './types'
import { clamp01, pushEvent } from './util'

export function createCrisisId(polityId: PolityId, tick: number): CrisisId {
  return `succ:${polityId}:${tick}`
}

export function seedSuccessionCrisis(
  polityId: PolityId,
  villageId: VillageId,
  deadRulerId: ActorId,
  designatedHeir: ClaimantProfile | null,
  tick: number,
): SuccessionCrisis {
  const claimants: ClaimantProfile[] = []
  if (designatedHeir) claimants.push({ ...designatedHeir, support: Math.max(0.2, designatedHeir.support) })
  const c: SuccessionCrisis = {
    id: createCrisisId(polityId, tick),
    polityId,
    villageId,
    phase: 'contested',
    openedTick: tick,
    deadRulerId,
    designatedHeirId: designatedHeir?.actorId ?? null,
    claimants,
    factions: [],
    merchantAllies: [],
    warId: null,
    winnerId: null,
    rewards: [],
    claimMemory: [`ruler ${deadRulerId} died tick ${tick}`],
    splitPressure: designatedHeir ? 0.25 : 0.45,
    events: [],
  }
  pushEvent(c, {
    kind: 'crisis_opened',
    tick,
    crisisId: c.id,
    actorId: designatedHeir?.actorId,
    note: designatedHeir?.lifeTag === 'Alena' ? 'Alena contested heir' : 'succession open',
  })
  return c
}

export function registerClaimant(c: SuccessionCrisis, claimant: ClaimantProfile, tick: number): void {
  if (c.phase === 'resolved' || c.phase === 'collapsed') return
  if (c.claimants.some((x) => x.actorId === claimant.actorId)) return
  c.claimants.push({ ...claimant })
  c.splitPressure = clamp01(c.splitPressure + 0.12 + claimant.ambition * 0.1)
  if (c.phase === 'contested' && c.claimants.length >= 2) c.phase = 'alliances'
  pushEvent(c, {
    kind: 'claimant_joined',
    tick,
    crisisId: c.id,
    actorId: claimant.actorId,
    amount: claimant.support,
    note: `${claimant.lifeTag} claims`,
  })
}

/** Crystallize claimants into rival factions (Alena contested succession). */
export function formClaimantFactions(c: SuccessionCrisis, tick: number): number {
  if (c.claimants.length < 2) return 0
  let formed = 0
  for (const cl of c.claimants) {
    if (c.factions.some((f) => f.claimantId === cl.actorId)) continue
    const faction = {
      id: `succfac:${c.id}:${cl.actorId}`,
      label: cl.lifeTag === 'Alena' ? 'Alena claim' : `claim ${cl.actorId}`,
      claimantId: cl.actorId,
      memberIds: [cl.actorId],
      strength: clamp01(cl.support + cl.militaryPull * 0.3),
    }
    c.factions.push(faction)
    formed++
    pushEvent(c, {
      kind: 'faction_formed',
      tick,
      crisisId: c.id,
      actorId: cl.actorId,
      amount: faction.strength,
      note: faction.label,
    })
  }
  if (formed > 0 && c.phase === 'contested') c.phase = 'alliances'
  return formed
}