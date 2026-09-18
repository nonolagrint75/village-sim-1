import type { GuildKind, GuildReadinessHint, InterestThreatHint } from './types'
import { clamp01 } from './util'

export function scoreInterestThreat(t: InterestThreatHint): number {
  const rivals = clamp01(t.rivalCount / 4) * 0.25
  return clamp01(
    t.undercutPressure * 0.35 + t.levyPressure * 0.25 + t.inputSqueeze * 0.25 + rivals,
  )
}

export function scoreGuildReadiness(h: GuildReadinessHint): number {
  const needMembers = h.kind === 'art' ? 2 : 3
  const needPract = h.kind === 'trade' ? 3 : 2
  const ageScore = clamp01(h.ageTicks / 200)
  const people =
    clamp01(h.memberCount / needMembers) * 0.22 + clamp01(h.practitionerCount / needPract) * 0.28
  const cohesion = h.cohesion * 0.18
  const problems = clamp01(h.problemCount / 3) * 0.12
  const quality = h.qualityBar * 0.1
  const threat = (h.interestThreat ?? 0) * 0.12
  return clamp01(people + cohesion + problems + quality + ageScore * 0.18 + threat)
}

export function preferredKindFromTags(
  tags: Array<'Eren' | 'Mira' | 'Lysa' | 'generic'>,
): GuildKind {
  if (tags.includes('Mira')) return 'textile'
  if (tags.includes('Eren')) return 'trade'
  if (tags.includes('Lysa')) return 'art'
  return 'craft'
}