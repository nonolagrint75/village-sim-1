/**
 * Ambush skill + caravan/traveler attacks — Daren specialty.
 */

import type { AmbushTarget, GangMember, LootPile, ParallelGang } from './types'
import { aliveMembers, clamp, hash01, pushEventCap } from './util'

export function gangAmbushPower(gang: ParallelGang): number {
  const alive = aliveMembers(gang) as GangMember[]
  if (alive.length === 0) return 0
  const skill =
    alive.reduce((s, m) => s + m.ambushSkill * (m.role === 'ambusher' || m.role === 'lieutenant' || m.role === 'chief' ? 1.25 : 1), 0) /
    alive.length
  return clamp(skill * 0.6 + Math.min(1, alive.length / 8) * 0.25 + gang.zoneControl * 0.15, 0, 1)
}

/** Practice: successful ambushes raise organizer ambushSkill. */
export function trainAmbushSkill(member: GangMember, success: boolean, amount = 0.03): void {
  if (!member.alive) return
  member.ambushSkill = clamp(member.ambushSkill + (success ? amount : amount * 0.35), 0, 1)
}

export interface AmbushResult {
  success: boolean
  loot: LootPile
  notorietyGain: number
  organizerId: number | null
}

export function attemptAmbush(
  gang: ParallelGang,
  target: AmbushTarget,
  tick: number,
  roll: number,
): AmbushResult {
  if (gang.phase === 'destroyed' || gang.phase === 'integrated') {
    return { success: false, loot: { food: 0, coin: 0, goods: 0 }, notorietyGain: 0, organizerId: null }
  }
  const power = gangAmbushPower(gang)
  const difficulty =
    target.escortStrength * 0.55 +
    (target.kind === 'caravan' ? 0.2 : target.kind === 'village_edge' ? 0.1 : 0.05)
  const success = roll < clamp(power - difficulty + 0.35, 0.08, 0.92)
  const alive = aliveMembers(gang) as GangMember[]
  const organizer = [...alive].sort((a, b) => b.ambushSkill - a.ambushSkill)[0] ?? null

  let loot: LootPile = { food: 0, coin: 0, goods: 0 }
  let notorietyGain = 0.02
  if (success) {
    const take = target.wealth * (0.35 + power * 0.4)
    if (target.kind === 'traveler') {
      loot = { food: take * 0.5, coin: take * 0.35, goods: take * 0.15 }
    } else if (target.kind === 'caravan') {
      loot = { food: take * 0.25, coin: take * 0.4, goods: take * 0.35 }
      notorietyGain = 0.08
    } else {
      loot = { food: take * 0.6, coin: take * 0.25, goods: take * 0.15 }
      notorietyGain = 0.05
    }
    gang.loot.food += loot.food
    gang.loot.coin += loot.coin
    gang.loot.goods += loot.goods
    gang.raids += 1
    gang.lastAmbushTick = tick
    gang.notoriety = clamp(gang.notoriety + notorietyGain, 0, 1)
    if (gang.phase === 'petty' || gang.phase === 'forming') gang.phase = 'raiding'
    if (gang.raids >= 5 && gang.phase === 'raiding') gang.phase = 'established'
    if (organizer) trainAmbushSkill(organizer, true, 0.04 + (organizer.lifeTag === 'Daren' ? 0.02 : 0))
    pushEventCap(gang.events, {
      kind: 'ambush',
      tick,
      gangId: gang.id,
      actorId: organizer?.actorId,
      amount: take,
      note: target.kind,
    })
    pushEventCap(gang.events, {
      kind: 'loot',
      tick,
      gangId: gang.id,
      amount: loot.coin + loot.food + loot.goods,
    })
  } else {
    gang.notoriety = clamp(gang.notoriety + 0.01, 0, 1)
    if (organizer) trainAmbushSkill(organizer, false, 0.015)
    // Failed ambush may still alert authorities
    pushEventCap(gang.events, {
      kind: 'ambush',
      tick,
      gangId: gang.id,
      actorId: organizer?.actorId,
      amount: 0,
      note: `fail:${target.kind}`,
    })
  }
  // Tiny deterministic jitter for probes
  void hash01(gang.formedTick, tick)
  return { success, loot, notorietyGain, organizerId: organizer?.actorId ?? null }
}

/** Petty food theft before full ambushes. */
export function pettyTheft(gang: ParallelGang, tick: number, foodAmount: number): void {
  gang.loot.food += foodAmount
  gang.notoriety = clamp(gang.notoriety + 0.01, 0, 1)
  if (gang.phase === 'forming') gang.phase = 'petty'
  pushEventCap(gang.events, {
    kind: 'theft',
    tick,
    gangId: gang.id,
    amount: foodAmount,
  })
}
