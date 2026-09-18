import type { ActorId, FirmId, MerchantNetworkState, TraderProfile } from './types'
import { nodeOf, pushEvent } from './util'

export function tryFirmHire(
  s: MerchantNetworkState,
  employerId: ActorId,
  hireCount: number,
  tick: number,
): boolean {
  const n = nodeOf(s, employerId)
  if (!n) return false
  if (hireCount <= 0) return false
  if (
    !(
      n.phase === 'arbitrage' ||
      n.phase === 'employer' ||
      n.phase === 'married_merge' ||
      n.phase === 'guilded' ||
      n.phase === 'networked'
    )
  ) {
    return false
  }
  n.hiredCount += hireCount
  n.phase = 'employer'
  pushEvent(s, {
    kind: 'firm_hire',
    tick,
    networkId: s.id,
    actorId: employerId,
    amount: hireCount,
  })
  return true
}

export function tryMerchantMarriage(
  s: MerchantNetworkState,
  a: TraderProfile,
  b: TraderProfile,
  mergedFirmId: FirmId,
  tick: number,
): boolean {
  let na = nodeOf(s, a.actorId)
  let nb = nodeOf(s, b.actorId)
  if (!na) {
    s.nodes.push({
      actorId: a.actorId,
      lifeTag: a.lifeTag,
      phase: 'trader',
      firmId: a.firmId,
      guildCircleId: null,
      hiredCount: 0,
      marriageMerged: false,
      successionDone: false,
    })
    na = nodeOf(s, a.actorId)!
  }
  if (!nb) {
    s.nodes.push({
      actorId: b.actorId,
      lifeTag: b.lifeTag,
      phase: 'trader',
      firmId: b.firmId,
      guildCircleId: null,
      hiredCount: 0,
      marriageMerged: false,
      successionDone: false,
    })
    nb = nodeOf(s, b.actorId)!
  }
  na.marriageMerged = true
  nb.marriageMerged = true
  na.firmId = mergedFirmId
  nb.firmId = mergedFirmId
  na.phase = 'married_merge'
  nb.phase = 'married_merge'
  pushEvent(s, {
    kind: 'merchant_marriage',
    tick,
    networkId: s.id,
    actorId: a.actorId,
    note: `merge with ${b.actorId}`,
  })
  return true
}

export function tryFirmSuccession(
  s: MerchantNetworkState,
  deadOwnerId: ActorId,
  heirId: ActorId,
  firmId: FirmId,
  tick: number,
): boolean {
  const dead = nodeOf(s, deadOwnerId)
  if (!dead) return false
  dead.successionDone = true
  let heir = nodeOf(s, heirId)
  if (!heir) {
    heir = {
      actorId: heirId,
      lifeTag: 'generic',
      phase: 'succession',
      firmId,
      guildCircleId: dead.guildCircleId,
      hiredCount: dead.hiredCount,
      marriageMerged: false,
      successionDone: false,
    }
    s.nodes.push(heir)
  } else {
    heir.firmId = firmId
    heir.phase = 'succession'
    heir.hiredCount = Math.max(heir.hiredCount, dead.hiredCount)
  }
  pushEvent(s, {
    kind: 'firm_succession',
    tick,
    networkId: s.id,
    actorId: heirId,
    note: `from ${deadOwnerId}`,
  })
  return true
}