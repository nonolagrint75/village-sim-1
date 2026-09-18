import type { SuccessionCrisis, SuccessionTickContext } from './types'
import { formClaimantFactions } from './crisis'
import { tryIgniteCivilWar, resolveCivilWar } from './war'
import { clamp01, pushEvent } from './util'

export function tickSuccessionCivil(c: SuccessionCrisis, ctx: SuccessionTickContext): SuccessionCrisis {
  const next: SuccessionCrisis = {
    ...c,
    claimants: c.claimants.map((x) => ({ ...x })),
    factions: c.factions.map((f) => ({ ...f, memberIds: [...f.memberIds] })),
    merchantAllies: [...c.merchantAllies],
    rewards: [...c.rewards],
    claimMemory: [...c.claimMemory],
    events: [...c.events],
  }

  if (next.phase === 'contested' || next.phase === 'alliances') {
    if (next.claimants.length >= 2 && next.factions.length < 2) {
      formClaimantFactions(next, ctx.tick)
    }
    next.splitPressure = clamp01(
      next.splitPressure + 0.02 + (ctx.foodStress ?? 0) * 0.03 + (ctx.warHeat ?? 0) * 0.02,
    )
    if (next.splitPressure >= 0.5) {
      tryIgniteCivilWar(next, ctx.tick, ctx.roll)
    }
  }

  if (next.phase === 'civil_war') {
    pushEvent(next, {
      kind: 'battle_pulse',
      tick: ctx.tick,
      crisisId: next.id,
      amount: ctx.warHeat ?? 0.3,
    })
    if ((ctx.warHeat ?? 0) > 0.7 || ctx.roll > 0.75) {
      resolveCivilWar(next, ctx.tick, ctx.roll)
    }
  }
  return next
}

export function successionStats(c: SuccessionCrisis): {
  phase: SuccessionCrisis['phase']
  claimants: number
  factions: number
  merchants: number
  splitPressure: number
  warId: string | null
  winnerId: number | null
  rewards: number
} {
  return {
    phase: c.phase,
    claimants: c.claimants.length,
    factions: c.factions.length,
    merchants: c.merchantAllies.length,
    splitPressure: c.splitPressure,
    warId: c.warId,
    winnerId: c.winnerId,
    rewards: c.rewards.length,
  }
}