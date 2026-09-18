import type { FirmId, SuccessionCrisis } from './types'
import { clamp01, pushEvent } from './util'

export function tryMerchantAlliance(
  c: SuccessionCrisis,
  merchants: { actorId: number; firmId: FirmId | null; wealth: number; preferenceActorId: number }[],
  tick: number,
  roll: number,
): number {
  if (c.claimants.length < 2) return 0
  let joined = 0
  for (const m of merchants) {
    if (c.merchantAllies.some((a) => a.actorId === m.actorId)) continue
    if (m.wealth < 20) continue
    if (roll + m.wealth / 200 < 0.35) continue
    const side = c.claimants.find((x) => x.actorId === m.preferenceActorId) ?? c.claimants[0]
    const pledge = Math.min(m.wealth * 0.15, 40)
    c.merchantAllies.push({
      actorId: m.actorId,
      firmId: m.firmId,
      goldPledge: pledge,
      sideActorId: side.actorId,
    })
    side.support = clamp01(side.support + 0.08 + pledge / 200)
    const fac = c.factions.find((f) => f.claimantId === side.actorId)
    if (fac) {
      if (!fac.memberIds.includes(m.actorId)) fac.memberIds.push(m.actorId)
      fac.strength = clamp01(fac.strength + pledge / 100)
    }
    joined++
  }
  if (joined > 0) {
    if (c.phase === 'contested') c.phase = 'alliances'
    c.splitPressure = clamp01(c.splitPressure + joined * 0.05)
    pushEvent(c, {
      kind: 'merchant_alliance',
      tick,
      crisisId: c.id,
      amount: joined,
      note: 'merchants pick sides',
    })
  }
  return joined
}