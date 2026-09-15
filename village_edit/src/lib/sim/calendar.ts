import { SEASONS, type Season } from './types'

/**
 * Earth-like sim calendar (compressed year, accelerated by the speed slider).
 *
 * Structure (not 1:1 real-time — that would be unplayable):
 *   3 ticks  = 1 hour
 *   24 h     = 1 day  → 72 ticks/day
 *   30 days  = 1 month
 *   12 months = 1 year → 360 days (4 seasons × 90 days)
 *
 * Seasons are derived from day-of-year (agricultural year starts in spring / mars).
 * UI speed (×1…×8 / Max) only changes how fast ticks run → how many
 * Earth-hours pass per real second. Needs, climate, and seasons all follow ticks.
 *
 * At ×1 (~7.7 ticks/s with the 130 ms tick interval):
 *   ≈ 2.6 sim-hours / real second · ≈ 1 sim-day / 9.4 s · ≈ 1 sim-year / 56 min
 */

export const TICKS_PER_HOUR = 3
export const HOURS_PER_DAY = 24
export const TICKS_PER_DAY = TICKS_PER_HOUR * HOURS_PER_DAY // 72

export const DAYS_PER_MONTH = 30
export const MONTHS_PER_YEAR = 12
export const DAYS_PER_YEAR = DAYS_PER_MONTH * MONTHS_PER_YEAR // 360
export const DAYS_PER_SEASON = DAYS_PER_YEAR / SEASONS.length // 90

export const TICKS_PER_SEASON = DAYS_PER_SEASON * TICKS_PER_DAY // 6480
export const TICKS_PER_YEAR = DAYS_PER_YEAR * TICKS_PER_DAY // 25920

/** Night ≈ 20h–6h (10 hours). */
export const NIGHT_START_HOUR = 20
export const NIGHT_END_HOUR = 6

/** Soft evening gathering window (inclusive start, exclusive end). */
export const GATHERING_START_HOUR = 16
export const GATHERING_END_HOUR = 21

/**
 * Month names for the agricultural year (day 1 = 1er mars, printemps).
 * Index 0 = mars … 11 = février.
 */
export const MONTH_LABELS_FR = [
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
  'janvier',
  'février',
] as const

export interface SimCalendar {
  year: number
  /** 1…360 within the year */
  dayOfYear: number
  /** 0…23 */
  hour: number
  season: Season
  /** e.g. "An 1 · Printemps · 15 avril · 14 h" */
  dateLabel: string
  monthIndex: number
  dayOfMonth: number
}

const SEASON_LABELS_FR: Record<Season, string> = {
  spring: 'Printemps',
  summer: 'Été',
  autumn: 'Automne',
  winter: 'Hiver',
}

export function hourOfDay(tick: number): number {
  const phase = ((tick % TICKS_PER_DAY) + TICKS_PER_DAY) % TICKS_PER_DAY
  return Math.floor(phase / TICKS_PER_HOUR)
}

/** 0-based day within the year (0…359). */
export function dayOfYearIndex(tick: number): number {
  const within = ((tick % TICKS_PER_YEAR) + TICKS_PER_YEAR) % TICKS_PER_YEAR
  return Math.floor(within / TICKS_PER_DAY)
}

export function seasonFromDayOfYear(dayIndex: number): Season {
  const clamped = ((dayIndex % DAYS_PER_YEAR) + DAYS_PER_YEAR) % DAYS_PER_YEAR
  return SEASONS[Math.floor(clamped / DAYS_PER_SEASON)]!
}

export function seasonFromTick(tick: number): Season {
  return seasonFromDayOfYear(dayOfYearIndex(tick))
}

export function yearFromTick(tick: number): number {
  return 1 + Math.floor(Math.max(0, tick) / TICKS_PER_YEAR)
}

export function seasonProgressFromTick(tick: number): number {
  const day = dayOfYearIndex(tick)
  const inSeason = day % DAYS_PER_SEASON
  const hourFrac = hourOfDay(tick) / HOURS_PER_DAY
  return (inSeason + hourFrac) / DAYS_PER_SEASON
}

export function isNightHour(hour: number): boolean {
  return hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR
}

export function isNightTick(tick: number): boolean {
  return isNightHour(hourOfDay(tick))
}

/**
 * Canvas lighting from calendar hour (visual only — sim night always runs).
 * `night` 0..1 darkens; `warm` 0..1 soft dawn/dusk amber (not neon).
 * Curves stay gentle so the map remains readable at midnight.
 */
export function dayNightVisual(hour: number): { night: number; warm: number } {
  const h = ((hour % HOURS_PER_DAY) + HOURS_PER_DAY) % HOURS_PER_DAY
  // Peak light ~13h, peak dark ~1h — matches 20h–6h night window softly.
  const dayness = (Math.cos(((h - 13) / HOURS_PER_DAY) * Math.PI * 2) + 1) * 0.5
  // Cap night intensity — soft slate multiply, not crushed blacks.
  const night = Math.max(0, Math.min(1, (1 - dayness) * 0.78))
  const dawn = Math.exp(-((h - 6.2) * (h - 6.2)) / 6.5)
  const dusk = Math.exp(-((h - 18.8) * (h - 18.8)) / 6.5)
  const warm = Math.max(dawn, dusk) * 0.55 * (0.4 + night * 0.55)
  return { night, warm }
}

export function isGatheringHourTick(tick: number): boolean {
  const h = hourOfDay(tick)
  return h >= GATHERING_START_HOUR && h < GATHERING_END_HOUR
}

export function getCalendar(tick: number): SimCalendar {
  const dayIndex = dayOfYearIndex(tick)
  const dayOfYear = dayIndex + 1
  const hour = hourOfDay(tick)
  const season = seasonFromDayOfYear(dayIndex)
  const monthIndex = Math.floor(dayIndex / DAYS_PER_MONTH)
  const dayOfMonth = (dayIndex % DAYS_PER_MONTH) + 1
  const month = MONTH_LABELS_FR[monthIndex] ?? 'mars'
  const year = yearFromTick(tick)
  const dateLabel = `An ${year} · ${SEASON_LABELS_FR[season]} · ${dayOfMonth} ${month} · ${hour} h`
  return {
    year,
    dayOfYear,
    hour,
    season,
    dateLabel,
    monthIndex,
    dayOfMonth,
  }
}

/** Compact stamp for chronicle lines. */
export function calendarStamp(tick: number): string {
  const c = getCalendar(tick)
  return `${c.year}·j${c.dayOfYear}·${c.hour}h`
}
