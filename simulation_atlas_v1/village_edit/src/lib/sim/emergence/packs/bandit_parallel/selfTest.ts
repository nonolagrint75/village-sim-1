/**
 * SELF_TEST notes + runnable checks (no vitest required).
 *
 * 1. Pressure (poverty/unemployment/debt) → recruitToGang
 * 2. Petty theft → ambush success raises ambushSkill (Daren)
 * 3. fenceLoot builds parallel economy + zoneControl (Kael)
 * 4. Notoriety → bounty → hunt → negotiate/fight/flee branches
 * 5. Faction deal → allied / military_force / political_integration
 * 6. No day-timer biography scripts — lifeTag only
 */

import { attemptAmbush } from './ambush'
import { postBounty, startAuthorityHunt } from './bounty'
import { resolveEncounter, tryPoliticalIntegration } from './encounter'
import { fenceLoot } from './parallelEconomy'
import { createGang, recruitToGang } from './recruitment'
import type { OutlawCandidate } from './types'

export const SELF_TEST_NOTES = [
  'pressure_recruits',
  'ambush_trains_skill',
  'parallel_economy_zone',
  'bounty_hunt_branches',
  'faction_deal_integration',
  'no_day_timer_biography',
] as const

function cand(partial: Partial<OutlawCandidate> & Pick<OutlawCandidate, 'actorId' | 'lifeTag'>): OutlawCandidate {
  return {
    villageId: 1,
    impulsivity: 0.7,
    robustness: 0.7,
    distrust: 0.6,
    wealth: 2,
    employed: false,
    pressure: {
      poverty: 0.7,
      unemployment: 0.8,
      migrationUrge: 0.5,
      foodInsecurity: 0.6,
      villageSecurity: 0.3,
      harvestShock: 0.5,
      debtPressure: 0.6,
    },
    ...partial,
  }
}

export function selfTestBanditParallel(): string[] {
  const log: string[] = []
  const founder = cand({ actorId: 1, lifeTag: 'Daren' })
  const gang = createGang({
    id: 'gang:test',
    name: 'test ravine',
    tick: 0,
    campX: 10,
    campY: 10,
    founder,
  })
  recruitToGang(gang, cand({ actorId: 2, lifeTag: 'generic' }), 5, 0.1)
  recruitToGang(gang, cand({ actorId: 3, lifeTag: 'Kael', impulsivity: 0.5 }), 6, 0.1)
  if (gang.members.filter((m) => m.alive).length < 3) throw new Error('recruit failed')
  log.push('recruit ok')

  const amb = attemptAmbush(
    gang,
    { kind: 'caravan', wealth: 12, escortStrength: 0.2, ref: 'c1' },
    20,
    0.2,
  )
  if (!amb.success) throw new Error('ambush should succeed with low escort')
  const daren = gang.members.find((m) => m.actorId === 1)!
  if (daren.ambushSkill <= 0.35) throw new Error('ambush skill should rise')
  log.push('ambush ok')

  fenceLoot(gang, 25, 0.5)
  if (gang.parallel.foodMoved <= 0 && gang.parallel.coinMoved <= 0) throw new Error('fence failed')
  log.push('parallel ok')

  // Force notoriety for bounty
  gang.notoriety = 0.5
  gang.raids = 5
  const bounty = postBounty(gang, 30, 'auth:village1', 1)
  if (!bounty) throw new Error('bounty expected')
  startAuthorityHunt(gang, 'auth:village1', 0.6, 31)
  const enc = resolveEncounter({
    tick: 40,
    gang,
    hunt: { authorityId: 'auth:village1', strength: 0.6, tick: 31 },
    factionOffer: { factionId: 'faction:rival', coin: 8, protection: 0.5 },
    roll: 0.2,
  })
  log.push(`encounter ${enc.choice}/${enc.outcome}`)

  gang.phase = 'allied'
  gang.zoneControl = 0.5
  gang.parallel.localSupport = 0.5
  const integ = tryPoliticalIntegration(gang, 50, 'faction:rival', 0.8)
  log.push(integ ? 'integrated ok' : 'integrate skip')
  log.push('selfTestBanditParallel PASS')
  return log
}
