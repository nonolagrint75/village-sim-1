import { scoreGuildReadiness, scoreInterestThreat } from './readiness'
import type {
  GuildKind,
  GuildPad,
  GuildReadinessHint,
  InterestThreatHint,
  PractitionerHint,
  VillageId,
} from './types'
import { clamp01, pushEvent, suggestedGuildName } from './util'

export function createGuildPadId(villageId: VillageId, kind: GuildKind, tick: number): string {
  return `guildpad:${kind}:${villageId}:${tick}`
}

export function tryFormCraftCircle(
  villageId: VillageId,
  kind: GuildKind,
  practitioners: PractitionerHint[],
  tick: number,
  roll: number,
): GuildPad | null {
  const need = kind === 'art' ? 2 : 3
  if (practitioners.length < need) return null
  if (roll > 0.7) return null
  const leader =
    practitioners.slice().sort((a, b) => {
      const stakeA = (a.stake ?? 0) * (a.lifeTag === 'Eren' || a.lifeTag === 'Mira' ? 1.2 : 1)
      const stakeB = (b.stake ?? 0) * (b.lifeTag === 'Eren' || b.lifeTag === 'Mira' ? 1.2 : 1)
      return b.craftSkill + stakeB - (a.craftSkill + stakeA)
    })[0] ?? null
  const pad: GuildPad = {
    id: createGuildPadId(villageId, kind, tick),
    villageId,
    kind,
    phase: 'circle',
    formedTick: tick,
    leaderId: leader?.actorId ?? null,
    memberIds: practitioners.map((p) => p.actorId),
    apprenticeIds: practitioners.filter((p) => p.isApprentice).map((p) => p.actorId),
    circleId: null,
    norms: [],
    qualityBar: kind === 'textile' ? 0.35 : 0.3,
    enforcement: 0.1,
    interestDefense: 0,
    masterPrestige: leader?.craftSkill ?? 0,
    events: [],
  }
  pushEvent(pad, {
    kind: 'circle_formed',
    tick,
    padId: pad.id,
    actorId: leader?.actorId,
    note: `${kind} circle (${leader?.lifeTag ?? 'generic'})`,
  })
  return pad
}

export function noteInterestThreat(
  pad: GuildPad,
  threat: InterestThreatHint,
  tick: number,
): number {
  const score = scoreInterestThreat(threat)
  if (score < 0.2) return pad.interestDefense
  pad.interestDefense = clamp01(pad.interestDefense + score * 0.25)
  if (pad.phase === 'circle') pad.phase = 'threatened'
  pushEvent(pad, {
    kind: 'interest_threat',
    tick,
    padId: pad.id,
    amount: score,
    note:
      pad.kind === 'textile'
        ? 'weaver input / cloth undercut'
        : pad.kind === 'trade'
          ? 'commercial undercut / tolls'
          : 'artisan interest pressure',
  })
  return pad.interestDefense
}

export function tryDefendInterests(
  pad: GuildPad,
  tick: number,
  roll: number,
): { defended: boolean; norms: string[] } {
  if (pad.interestDefense < 0.25 && pad.phase !== 'threatened') {
    return { defended: false, norms: pad.norms }
  }
  if (roll > 0.65) return { defended: false, norms: pad.norms }
  for (const n of ['price_floor', 'member_exclusive_sales', 'apprentice_quota']) {
    if (!pad.norms.includes(n)) pad.norms.push(n)
  }
  pad.enforcement = clamp01(pad.enforcement + 0.15)
  pad.interestDefense = clamp01(pad.interestDefense + 0.1)
  pushEvent(pad, {
    kind: 'interest_defense',
    tick,
    padId: pad.id,
    amount: pad.interestDefense,
    note: 'guild interest norms',
  })
  pushEvent(pad, { kind: 'norm_adopted', tick, padId: pad.id, note: 'price_floor' })
  return { defended: true, norms: [...pad.norms] }
}

export function tryPromoteInstitution(
  pad: GuildPad,
  hint: GuildReadinessHint,
  tick: number,
): boolean {
  if (pad.phase !== 'circle' && pad.phase !== 'threatened') return false
  const withThreat: GuildReadinessHint = {
    ...hint,
    interestThreat: Math.max(hint.interestThreat ?? 0, pad.interestDefense),
  }
  const score = scoreGuildReadiness(withThreat)
  if (score < 0.45 || hint.ageTicks < 80) return false
  pad.phase = 'institution'
  pad.enforcement = clamp01(pad.enforcement + 0.25)
  if (!pad.norms.includes('craft_quality')) pad.norms.push('craft_quality')
  pushEvent(pad, { kind: 'institution', tick, padId: pad.id, amount: score })
  pushEvent(pad, { kind: 'norm_adopted', tick, padId: pad.id, note: 'craft_quality' })
  return true
}

export function tryPromoteGuild(
  pad: GuildPad,
  hint: GuildReadinessHint,
  tick: number,
  roll: number,
): { promote: boolean; suggestedName: string; norms: string[] } {
  if (pad.phase !== 'institution' && pad.phase !== 'threatened' && pad.phase !== 'circle') {
    return { promote: false, suggestedName: '', norms: pad.norms }
  }
  const score = scoreGuildReadiness({
    ...hint,
    ageTicks: Math.max(hint.ageTicks, 120),
    interestThreat: Math.max(hint.interestThreat ?? 0, pad.interestDefense),
  })
  if (score < 0.55 || hint.practitionerCount < 2) {
    return { promote: false, suggestedName: '', norms: pad.norms }
  }
  if (roll > 0.75) return { promote: false, suggestedName: '', norms: pad.norms }
  pad.phase = 'guild'
  pad.enforcement = clamp01(pad.enforcement + 0.2)
  pad.qualityBar = Math.max(pad.qualityBar, 0.4)
  for (const n of ['craft_quality', 'teach_apprentice', 'exclude_shirkers', 'defend_interests']) {
    if (!pad.norms.includes(n)) pad.norms.push(n)
  }
  const label = suggestedGuildName(pad.kind)
  pushEvent(pad, {
    kind: 'guild_formed',
    tick,
    padId: pad.id,
    amount: score,
    note: label,
  })
  return { promote: true, suggestedName: label, norms: [...pad.norms] }
}