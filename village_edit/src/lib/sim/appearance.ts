/**
 * Visual appearance helpers — sex silhouette, hair style, beard gate.
 * Drawn by entityArt; packed into ActorVillager by snapshot.
 */
import type { BiologicalSex, Phenotype, Villager } from './types'

export type { BiologicalSex }

/** Aligné sur politics.CHILD_AGE / marriage.MARRY_MIN_AGE. */
export const APPEARANCE_CHILD_AGE = 220
/** Aligné sur politics.ELDER_AGE. */
export const APPEARANCE_ELDER_AGE = 800

export type HairStyle = 'cropped' | 'short' | 'shoulder' | 'long'

export function pickSex(rng: () => number): BiologicalSex {
  return rng() < 0.5 ? 'female' : 'male'
}

/** Fallback when older saves / partial objects lack `sex`. */
export function sexOf(v: Pick<Villager, 'seed'> & { sex?: BiologicalSex | null }): BiologicalSex {
  if (v.sex === 'female' || v.sex === 'male') return v.sex
  return (v.seed >>> 0) & 1 ? 'male' : 'female'
}

export function resolveHairStyle(
  sex: BiologicalSex,
  age: number,
  hairCurl: number,
  seed: number,
): HairStyle {
  const child = age < APPEARANCE_CHILD_AGE
  const roll = ((seed >>> 0) % 1000) / 1000
  if (child) {
    if (sex === 'female') return roll < 0.5 ? 'short' : 'shoulder'
    return roll < 0.72 ? 'cropped' : 'short'
  }
  if (sex === 'female') {
    if (hairCurl > 0.7 && roll < 0.3) return 'shoulder'
    if (roll < 0.18) return 'short'
    if (roll < 0.52) return 'shoulder'
    return 'long'
  }
  if (roll < 0.42) return 'cropped'
  if (roll < 0.88) return 'short'
  return 'shoulder'
}

/** Adult males with facial-hair predisposition grow a beard (stronger past youth). */
export function resolveBeard(sex: BiologicalSex, age: number, facialHair: number): boolean {
  if (sex !== 'male' || age < APPEARANCE_CHILD_AGE) return false
  const fh = facialHair < 0 ? 0 : facialHair > 1 ? 1 : facialHair
  const thresh = age >= APPEARANCE_ELDER_AGE ? 0.26 : age >= APPEARANCE_CHILD_AGE * 1.6 ? 0.36 : 0.48
  return fh >= thresh
}

/** Pack-ready appearance slice from a live villager. */
export function packVillagerAppearance(v: Villager): {
  sex: BiologicalSex
  age: number
  hairStyle: HairStyle
  beard: boolean
  facialHair: number
  hairCurl: number
} {
  const sex = sexOf(v)
  const age = Number.isFinite(v.age) ? v.age : 0
  const ph: Phenotype | undefined = v.phenotype
  const hairCurl = ph?.hairCurl ?? 0.45
  const facialHair = ph?.facialHair ?? 0.35
  return {
    sex,
    age,
    hairStyle: resolveHairStyle(sex, age, hairCurl, v.seed),
    beard: resolveBeard(sex, age, facialHair),
    facialHair,
    hairCurl,
  }
}

/** Elder hair drifts toward silver (visual only). */
export function agedHairTone(hairTone: number, age: number): number {
  const t = hairTone < 0 ? 0 : hairTone > 1 ? 1 : hairTone
  if (age < APPEARANCE_ELDER_AGE) return t
  const gray = Math.min(1, (age - APPEARANCE_ELDER_AGE) / 600)
  return t * (1 - gray * 0.72) + 0.12 * gray
}
