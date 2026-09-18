/**
 * Seuils d’âge unifiés — fractions d’années biologiques × TICKS_PER_YEAR.
 * Une seule source de vérité pour enfant / mariage / elder / fondateurs.
 */
import { TICKS_PER_YEAR } from './calendar'

/** Années biologiques-sim (1 année-sim ≈ 1 année corporelle). */
export const YEARS_CHILD = 14
export const YEARS_DEPENDENT = 8
export const YEARS_MARRY = 16
export const YEARS_ADOPT_MAX = 12
export const YEARS_ELDER = 55
/** Soft ceiling for disease / aging curves (not hard death). */
export const YEARS_LIFESPAN_SOFT = 80
/** Fondateurs : adultes jeunes–matures. */
export const YEARS_FOUNDER_MIN = 20
export const YEARS_FOUNDER_SPAN = 20

export const CHILD_AGE = Math.round(TICKS_PER_YEAR * YEARS_CHILD)
/** Enfance dépendante (soins parentaux obligatoires / presque pas de labeur). */
export const DEPENDENT_AGE = Math.round(TICKS_PER_YEAR * YEARS_DEPENDENT)
export const MARRY_MIN_AGE = Math.round(TICKS_PER_YEAR * YEARS_MARRY)
export const ADOPT_MAX_AGE = Math.round(TICKS_PER_YEAR * YEARS_ADOPT_MAX)
export const ELDER_AGE = Math.round(TICKS_PER_YEAR * YEARS_ELDER)
export const LIFESPAN_SOFT = Math.round(TICKS_PER_YEAR * YEARS_LIFESPAN_SOFT)
export const FOUNDER_AGE_MIN = Math.round(TICKS_PER_YEAR * YEARS_FOUNDER_MIN)
export const FOUNDER_AGE_SPAN = Math.round(TICKS_PER_YEAR * YEARS_FOUNDER_SPAN)
/** Deuil avant remariage ≈ 1 saison (¼ année-sim). */
export const MOURNING_TICKS = Math.round(TICKS_PER_YEAR / 4)

export function ageYearsFromAgeTicks(ageTicks: number): number {
  return Math.max(0, ageTicks) / TICKS_PER_YEAR
}

export function isChildAge(ageTicks: number): boolean {
  return ageTicks < CHILD_AGE
}

export function isDependentAge(ageTicks: number): boolean {
  return ageTicks < DEPENDENT_AGE
}

export function isMarriageAgeTicks(ageTicks: number): boolean {
  return ageTicks >= MARRY_MIN_AGE
}

export function isElderAge(ageTicks: number): boolean {
  return ageTicks >= ELDER_AGE
}

export function isInMourningTicks(mourningUntilTick: number, tick: number): boolean {
  return mourningUntilTick > tick
}
