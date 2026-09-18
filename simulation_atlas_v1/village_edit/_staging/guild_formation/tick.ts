import type { GuildPad, GuildTickContext, PractitionerHint } from './types'
import { noteInterestThreat, tryDefendInterests } from './form'
import { clamp01, pushEvent } from './util'

export function tickGuildPad(
  pad: GuildPad,
  practitioners: PractitionerHint[],
  ctx: GuildTickContext,
): GuildPad {
  const next: GuildPad = {
    ...pad,
    memberIds: [...pad.memberIds],
    apprenticeIds: [...pad.apprenticeIds],
    norms: [...pad.norms],
    events: [...pad.events],
  }

  if (ctx.threat) {
    noteInterestThreat(next, ctx.threat, ctx.tick)
    if (next.phase === 'threatened' || next.interestDefense >= 0.3) {
      tryDefendInterests(next, ctx.tick, ctx.roll)
    }
  }

  for (const p of practitioners) {
    if (!next.memberIds.includes(p.actorId)) next.memberIds.push(p.actorId)
    if (p.isApprentice && !next.apprenticeIds.includes(p.actorId)) {
      next.apprenticeIds.push(p.actorId)
      pushEvent(next, {
        kind: 'apprentice_added',
        tick: ctx.tick,
        padId: next.id,
        actorId: p.actorId,
      })
    }
  }

  const master =
    ctx.masterSkillHint ?? Math.max(0, ...practitioners.map((p) => p.craftSkill), 0)
  next.masterPrestige = clamp01(next.masterPrestige * 0.98 + master * 0.05)

  if (next.phase === 'guild' || next.phase === 'mature' || next.phase === 'institution') {
    const raised = clamp01(next.qualityBar + master * 0.02)
    if (raised > next.qualityBar + 0.001) {
      next.qualityBar = raised
      pushEvent(next, {
        kind: 'quality_raised',
        tick: ctx.tick,
        padId: next.id,
        amount: raised,
      })
    }
    if (next.masterPrestige >= 0.55) {
      pushEvent(next, {
        kind: 'master_prestige',
        tick: ctx.tick,
        padId: next.id,
        actorId: next.leaderId ?? undefined,
        amount: next.masterPrestige,
      })
    }
    const shirkers = practitioners.filter((p) => p.shirking > 0.55)
    if (shirkers.length && next.norms.includes('exclude_shirkers') && ctx.roll > 0.5) {
      for (const s of shirkers) {
        next.memberIds = next.memberIds.filter((id) => id !== s.actorId)
      }
      pushEvent(next, {
        kind: 'shirkers_excluded',
        tick: ctx.tick,
        padId: next.id,
        amount: shirkers.length,
      })
    }
    if (next.phase === 'guild' && next.qualityBar >= 0.6 && next.apprenticeIds.length >= 1) {
      next.phase = 'mature'
    }
  }

  return next
}

export function guildStats(pad: GuildPad): {
  phase: GuildPad['phase']
  kind: GuildPad['kind']
  members: number
  apprentices: number
  qualityBar: number
  interestDefense: number
  masterPrestige: number
  norms: number
  events: number
} {
  return {
    phase: pad.phase,
    kind: pad.kind,
    members: pad.memberIds.length,
    apprentices: pad.apprenticeIds.length,
    qualityBar: pad.qualityBar,
    interestDefense: pad.interestDefense,
    masterPrestige: pad.masterPrestige,
    norms: pad.norms.length,
    events: pad.events.length,
  }
}