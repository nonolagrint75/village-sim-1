/**
 * Cultural trait mixing — origin × host drift across generations.
 * Causal: contact + marriage + co-residence pull features toward host / peers.
 */

import {
  CULTURE_FEATURE_COUNT,
  CULTURE_TRAIT_Q,
  type CulturalTraitId,
  type CulturalTraitProfile,
  type CultureFeatures,
  type MixedChild,
  type MigrantPerson,
} from './types'

export function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

export function randomFeatures(rng: () => number): CultureFeatures {
  const f: number[] = []
  for (let i = 0; i < CULTURE_FEATURE_COUNT; i++) {
    f.push(Math.floor(rng() * CULTURE_TRAIT_Q))
  }
  return f
}

export function hostBaselineFeatures(settlementId: number): CultureFeatures {
  let h = ((settlementId + 1) * 2654435761) >>> 0
  const f: number[] = []
  for (let i = 0; i < CULTURE_FEATURE_COUNT; i++) {
    h ^= h << 13
    h ^= h >>> 17
    h ^= h << 5
    h >>>= 0
    f.push(h % CULTURE_TRAIT_Q)
  }
  return f
}

export function cultureSimilarity(a: CultureFeatures, b: CultureFeatures): number {
  if (!a.length || !b.length || a.length !== b.length) return 0.35
  let same = 0
  for (let i = 0; i < a.length; i++) if (a[i] === b[i]) same++
  return same / a.length
}

export function blendFeatures(
  origin: CultureFeatures,
  host: CultureFeatures,
  hostWeight: number,
  rng: () => number,
): CultureFeatures {
  const w = clamp01(hostWeight)
  const out: number[] = []
  for (let i = 0; i < CULTURE_FEATURE_COUNT; i++) {
    const o = origin[i] ?? 0
    const h = host[i] ?? o
    if (rng() < 0.04) out.push(Math.floor(rng() * CULTURE_TRAIT_Q))
    else out.push(rng() < w ? h : o)
  }
  return out
}

const TRAIT_IDS: CulturalTraitId[] = [
  'food_habit',
  'speech_cadence',
  'craft_style',
  'dress_code',
  'festivity',
  'build_motif',
]

export function traitsFromFeatures(
  features: CultureFeatures,
): Partial<Record<CulturalTraitId, number>> {
  const traits: Partial<Record<CulturalTraitId, number>> = {}
  for (let i = 0; i < TRAIT_IDS.length; i++) {
    const f = features[i % features.length] ?? 0
    traits[TRAIT_IDS[i]] = f / (CULTURE_TRAIT_Q - 1)
  }
  return traits
}

export function makeOriginCulture(
  originTag: string,
  features: CultureFeatures,
): CulturalTraitProfile {
  return {
    traits: traitsFromFeatures(features),
    features: features.slice(),
    originTag,
    hostBlend: 0,
  }
}

/** Marriage / long cohabitation → child inherits mixed vector. */
export function mixChildCulture(
  migrant: MigrantPerson,
  localFeatures: CultureFeatures,
  birthTick: number,
  childId: number,
  rng: () => number,
): MixedChild {
  const hostWeight = clamp01(
    0.35 + migrant.culture.hostBlend * 0.4 + (migrant.generation > 0 ? 0.15 : 0),
  )
  const features = blendFeatures(migrant.culture.features, localFeatures, hostWeight, rng)
  const hostBlend = clamp01(migrant.culture.hostBlend * 0.55 + hostWeight * 0.45)
  return {
    id: childId,
    parentMigrantId: migrant.id,
    parentLocalId: migrant.spouseLocalId ?? -1,
    culture: {
      traits: traitsFromFeatures(features),
      features,
      originTag: migrant.culture.originTag,
      hostBlend,
    },
    birthTick,
    generation: migrant.generation + 1,
  }
}

/** Slow drift of living migrants toward host + quarter peers. */
export function driftTowardPeers(
  person: MigrantPerson,
  peerMean: CultureFeatures,
  hostFeatures: CultureFeatures,
  contactRate: number,
  rng: () => number,
): void {
  const pull = clamp01(contactRate) * 0.12
  if (rng() > pull) return
  const toward = blendFeatures(person.culture.features, peerMean, 0.55, rng)
  const mixed = blendFeatures(
    toward,
    hostFeatures,
    0.25 + person.culture.hostBlend * 0.2,
    rng,
  )
  person.culture.features = mixed
  person.culture.traits = traitsFromFeatures(mixed)
  person.culture.hostBlend = clamp01(person.culture.hostBlend + 0.02)
}

export function meanFeatures(list: CultureFeatures[]): CultureFeatures {
  if (!list.length) return Array.from({ length: CULTURE_FEATURE_COUNT }, () => 0)
  const votes: number[][] = Array.from({ length: CULTURE_FEATURE_COUNT }, () =>
    Array.from({ length: CULTURE_TRAIT_Q }, () => 0),
  )
  for (const f of list) {
    for (let i = 0; i < CULTURE_FEATURE_COUNT; i++) {
      const v = f[i] ?? 0
      votes[i][v] = (votes[i][v] ?? 0) + 1
    }
  }
  const acc: number[] = []
  for (let i = 0; i < CULTURE_FEATURE_COUNT; i++) {
    let best = 0
    let bestN = -1
    for (let q = 0; q < CULTURE_TRAIT_Q; q++) {
      if (votes[i][q] > bestN) {
        bestN = votes[i][q]
        best = q
      }
    }
    acc.push(best)
  }
  return acc
}