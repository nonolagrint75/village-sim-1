// @ts-nocheck
/**
 * Optional orchestrator — integrator may call pieces separately.
 */

import { attemptAmbush, pettyTheft } from './ambush'
import { postBounty, startAuthorityHunt } from './bounty'
import { resolveEncounter } from './encounter'
import { fenceLoot } from './parallelEconomy'
import { shouldAttemptCrime } from './pressure'
import {
  createGang,
  ensureOrganizerHierarchy,
  promoteMember,
  recruitToGang,
} from './recruitment'
import type {
  AmbushTarget,
  EncounterResult,
  OutlawCandidate,
  ParallelGang,
} from './types'
import { aliveMembers } from './util'

export interface BanditTickInput {
  tick: number
  roll: number
  candidates?: OutlawCandidate[]
  ambushTarget?: AmbushTarget | null
  authorityId?: string
  authorityStrength?: number
  factionOffer?: { factionId: string; coin: number; protection: number } | null
}

export interface BanditTickResult {
  recruited: number
  ambushSuccess: boolean | null
  bountyPosted: boolean
  encounter: EncounterResult | null
  phase: ParallelGang['phase']
}

export function tickParallelGang(gang: ParallelGang, input: BanditTickInput): BanditTickResult {
  let recruited = 0
  for (const c of input.candidates ?? []) {
    if (!shouldAttemptCrime(c, input.roll)) continue
    if (recruitToGang(gang, c, input.tick, input.roll)) recruited += 1
  }

  ensureOrganizerHierarchy(gang, input.tick)

  // Early food theft
  if (gang.phase === 'forming' || gang.phase === 'petty') {
    if (input.roll < 0.4) pettyTheft(gang, input.tick, 1 + input.roll * 2)
  }

  let ambushSuccess: boolean | null = null
  if (input.ambushTarget && (gang.phase === 'petty' || gang.phase === 'raiding' || gang.phase === 'established' || gang.phase === 'hunted' || gang.phase === 'allied')) {
    const r = attemptAmbush(gang, input.ambushTarget, input.tick, input.roll)
    ambushSuccess = r.success
    if (r.success) fenceLoot(gang, input.tick, 0.35)
  }

  let bountyPosted = false
  if (input.authorityId && postBounty(gang, input.tick, input.authorityId, gang.chiefId)) {
    bountyPosted = true
    startAuthorityHunt(gang, input.authorityId, input.authorityStrength ?? 0.5, input.tick)
  }

  let encounter: EncounterResult | null = null
  if (gang.phase === 'hunted' || (bountyPosted && (input.authorityStrength ?? 0) > 0.4)) {
    encounter = resolveEncounter({
      tick: input.tick,
      gang,
      hunt: input.authorityId
        ? { authorityId: input.authorityId, strength: input.authorityStrength ?? 0.5, tick: input.tick }
        : null,
      factionOffer: input.factionOffer ?? null,
      roll: input.roll,
    })
  }

  // Promote seasoned ambushers
  for (const m of aliveMembers(gang)) {
    if (m.ambushSkill > 0.5 && m.role === 'thief') promoteMember(gang, m.actorId, input.tick)
  }

  return {
    recruited,
    ambushSuccess,
    bountyPosted,
    encounter,
    phase: gang.phase,
  }
}

export { createGang }
