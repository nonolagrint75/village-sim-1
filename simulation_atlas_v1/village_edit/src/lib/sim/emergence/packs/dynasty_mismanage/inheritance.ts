/**
 * Inheritance personality modifiers for Malik-style heirs.
 * Soft causal pads — not a day-timer biography.
 */

import type {
  DynastyEvent,
  DynastyHouse,
  HeirProfile,
  InheritancePersonalityModifiers,
} from './types'

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

/** Baseline modifiers for a generic successor (no Malik bias). */
export function defaultInheritanceModifiers(): InheritancePersonalityModifiers {
  return {
    arrogance: 0.35,
    thrift: 0.5,
    hardness: 0.4,
    rivalry: 0.35,
    vanity: 0.35,
    recklessness: 0.3,
  }
}

/**
 * Malik heir bias: rich succession amplifies arrogance / vanity / recklessness,
 * suppresses thrift. Wealth and sibling count push rivalry.
 */
export function malikInheritanceModifiers(input: {
  inheritedWealth: number
  siblingCount: number
  parentPrestige?: number
  roll: number
}): InheritancePersonalityModifiers {
  const wealthBias = clamp01(input.inheritedWealth / 80)
  const siblingBias = clamp01(input.siblingCount / 4)
  const prestige = clamp01(input.parentPrestige ?? wealthBias)
  const jitter = (input.roll - 0.5) * 0.12

  return {
    arrogance: clamp01(0.55 + wealthBias * 0.35 + prestige * 0.15 + jitter),
    thrift: clamp01(0.28 - wealthBias * 0.22 + (1 - input.roll) * 0.08),
    hardness: clamp01(0.42 + wealthBias * 0.18 + siblingBias * 0.1),
    rivalry: clamp01(0.4 + siblingBias * 0.45 + wealthBias * 0.1),
    vanity: clamp01(0.5 + prestige * 0.3 + wealthBias * 0.2 + jitter * 0.5),
    recklessness: clamp01(0.45 + wealthBias * 0.25 + (1 - 0.28 + wealthBias * 0.22) * 0.1),
  }
}

/** Blend parent/house baseline with life-tag bias (Malik or generic). */
export function resolveInheritanceModifiers(
  heir: Pick<HeirProfile, 'lifeTag' | 'wealth' | 'prestige' | 'siblingIds'>,
  roll: number,
  prior?: InheritancePersonalityModifiers,
): InheritancePersonalityModifiers {
  const base = prior ?? defaultInheritanceModifiers()
  if (heir.lifeTag !== 'Malik') {
    return {
      arrogance: clamp01(base.arrogance * 0.85 + 0.05),
      thrift: clamp01(base.thrift * 0.9 + 0.1),
      hardness: clamp01(base.hardness),
      rivalry: clamp01(base.rivalry * 0.8 + (heir.siblingIds?.length ?? 0) * 0.05),
      vanity: clamp01(base.vanity * 0.85),
      recklessness: clamp01(base.recklessness * 0.8),
    }
  }
  const malik = malikInheritanceModifiers({
    inheritedWealth: heir.wealth,
    siblingCount: heir.siblingIds?.length ?? 0,
    parentPrestige: heir.prestige,
    roll,
  })
  return {
    arrogance: clamp01(base.arrogance * 0.25 + malik.arrogance * 0.75),
    thrift: clamp01(base.thrift * 0.25 + malik.thrift * 0.75),
    hardness: clamp01(base.hardness * 0.3 + malik.hardness * 0.7),
    rivalry: clamp01(base.rivalry * 0.25 + malik.rivalry * 0.75),
    vanity: clamp01(base.vanity * 0.25 + malik.vanity * 0.75),
    recklessness: clamp01(base.recklessness * 0.3 + malik.recklessness * 0.7),
  }
}

/**
 * Apply succession: set heir as head, stamp modifiers, emit events.
 * Does not touch core World — mutates the staging DynastyHouse only.
 */
export function applySuccession(
  house: DynastyHouse,
  heir: HeirProfile,
  tick: number,
  roll: number,
): DynastyHouse {
  const modifiers = resolveInheritanceModifiers(heir, roll, house.modifiers)
  const events: DynastyEvent[] = [
    ...house.events,
    {
      kind: 'succession',
      tick,
      houseId: house.id,
      actorId: heir.actorId,
      note: `${heir.lifeTag} succession`,
    },
    {
      kind: 'personality_biased',
      tick,
      houseId: house.id,
      actorId: heir.actorId,
      amount: modifiers.arrogance,
      note: 'inheritance personality modifiers applied',
    },
  ]
  return {
    ...house,
    headId: heir.actorId,
    heirId: null,
    siblingIds: heir.siblingIds.filter((id) => id !== heir.actorId),
    wealth: Math.max(house.wealth, heir.wealth),
    modifiers,
    lifeTag: heir.lifeTag,
    phase: heir.lifeTag === 'Malik' ? 'heir_ascendant' : house.phase === 'collapsed' ? 'collapsed' : 'stable',
    events,
  }
}

/** Soft mapping hints for integrator → core Personality keys. */
export function personalityHookHints(m: InheritancePersonalityModifiers): Record<string, number> {
  return {
    ambition: clamp01(m.arrogance * 0.55 + m.vanity * 0.35),
    courage: clamp01(m.recklessness * 0.4 + m.rivalry * 0.2),
    sociability: clamp01(0.45 + m.vanity * 0.25 - m.hardness * 0.15),
    curiosity: clamp01(0.35 + m.recklessness * 0.2),
    frugality: clamp01(m.thrift),
    harshness: clamp01(m.hardness),
    rivalry: clamp01(m.rivalry),
  }
}

export function modifierSpendMultiplier(m: InheritancePersonalityModifiers): number {
  return clamp(1.15 + m.arrogance * 0.55 + m.vanity * 0.45 - m.thrift * 0.5, 0.6, 2.4)
}
