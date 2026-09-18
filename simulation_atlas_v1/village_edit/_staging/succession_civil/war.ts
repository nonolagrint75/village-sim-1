import type { ActorId, PoliticalReward, SuccessionCrisis, WarId } from './types'
import { pushEvent } from './util'

export function tryIgniteCivilWar(
  c: SuccessionCrisis,
  tick: number,
  roll: number,
): { ignite: boolean; warId: WarId | null; note: string } {
  if (c.phase === 'civil_war' || c.phase === 'resolved') {
    return { ignite: false, warId: c.warId, note: 'already' }
  }
  if (c.claimants.length < 2) return { ignite: false, warId: null, note: 'need rivals' }
  const supports = c.claimants.map((x) => x.support).sort((a, b) => b - a)
  const top = supports[0] ?? 0
  const second = supports[1] ?? 0
  const split = top > 0 ? second / top : 0
  const ready =
    c.splitPressure >= 0.45 &&
    split >= 0.45 &&
    (c.merchantAllies.length > 0 || c.factions.length >= 2 || roll > 0.4)
  if (!ready) return { ignite: false, warId: null, note: 'pressure low' }
  const warId = `war:succ:${c.polityId}:${tick}`
  c.warId = warId
  c.phase = 'civil_war'
  pushEvent(c, {
    kind: 'civil_war_ignited',
    tick,
    crisisId: c.id,
    note: 'succession_spill',
  })
  return { ignite: true, warId, note: 'succession_spill' }
}

export function resolveCivilWar(
  c: SuccessionCrisis,
  tick: number,
  roll: number,
): { winnerId: ActorId | null; rewards: PoliticalReward[] } {
  if (c.phase !== 'civil_war' || c.claimants.length === 0) {
    return { winnerId: c.winnerId, rewards: c.rewards }
  }
  const ranked = [...c.claimants].sort((a, b) => {
    const facA = c.factions.find((f) => f.claimantId === a.actorId)?.strength ?? 0
    const facB = c.factions.find((f) => f.claimantId === b.actorId)?.strength ?? 0
    const aa = a.support + a.militaryPull * 0.3 + a.wealth / 500 + facA * 0.2
    const bb = b.support + b.militaryPull * 0.3 + b.wealth / 500 + facB * 0.2
    return bb - aa
  })
  let winner = ranked[0]
  if (ranked.length > 1 && roll > 0.85) winner = ranked[1]
  c.winnerId = winner.actorId
  c.phase = 'resolved'
  const rewards: PoliticalReward[] = [
    {
      actorId: winner.actorId,
      kind: 'title',
      amount: 1,
      note: winner.lifeTag === 'Alena' ? 'Alena succession winner' : 'succession winner',
    },
  ]
  for (const ally of c.merchantAllies.filter((m) => m.sideActorId === winner.actorId)) {
    rewards.push({
      actorId: ally.actorId,
      kind: 'land',
      amount: Math.max(1, Math.floor(ally.goldPledge / 10)),
      note: 'merchant political reward',
    })
  }
  for (const loser of ranked.slice(1)) {
    rewards.push({
      actorId: loser.actorId,
      kind: roll > 0.5 ? 'amnesty' : 'none',
      amount: 0,
      note: 'defeated claimant',
    })
  }
  c.rewards = rewards
  c.claimMemory.push(`winner ${winner.actorId} tick ${tick}`)
  pushEvent(c, { kind: 'war_resolved', tick, crisisId: c.id, actorId: winner.actorId })
  for (const r of rewards) {
    if (r.kind === 'none') continue
    pushEvent(c, {
      kind: 'political_reward',
      tick,
      crisisId: c.id,
      actorId: r.actorId,
      note: r.kind,
    })
  }
  pushEvent(c, {
    kind: 'claim_memory',
    tick,
    crisisId: c.id,
    note: c.claimMemory[c.claimMemory.length - 1],
  })
  return { winnerId: c.winnerId, rewards }
}