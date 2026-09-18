/**
 * Configuration de lancement — presets + options joueur.
 * Appliquée avant createSimulation (worker) ; mirroir optionnel côté UI.
 *
 * WP12 / §20 scale policy (honesty — see scripts/harness/scalePolicy.ts):
 * - Default play unchanged (standard = 26 founders).
 * - Individual §20 (≥100) can START within INITIAL_VILLAGERS_MAX (120).
 * - Social §20 (300) cannot START — clamp max 120; grow needs maxPopulation ≥300.
 * - BLOCKED capacité ≠ FAIL émergence; never invent EMERGENCE PASS from config alone.
 */

/** Documented clamps — keep UI (StartMenu) + harness scalePolicy in sync. */
export const INITIAL_VILLAGERS_MIN = 4
export const INITIAL_VILLAGERS_MAX = 120
export const MAX_POPULATION_HARD_CAP = 500

export type SimPresetId = 'standard' | 'vast' | 'anthill' | 'harsh' | 'observe'

export type MapSizePreset = 600 | 800 | 1000 | 1200

export type SimConfig = {
  seed: number
  worldSize: MapSizePreset
  initialVillagers: number
  maxPopulation: number
  sheepCount: number
  horseCount: number
  wolfCount: number
  preset: SimPresetId
  /** Si vrai, la sim démarre en pause (observation). */
  startPaused: boolean
}

export type SimConfigInput = Partial<SimConfig> & { seed?: number }

export const MAP_SIZE_OPTIONS: { value: MapSizePreset; label: string; hint: string }[] = [
  { value: 600, label: 'Compacte', hint: '600×600 — dense, rapide' },
  { value: 800, label: 'Moyenne', hint: '800×800' },
  { value: 1000, label: 'Standard', hint: '1000×1000' },
  { value: 1200, label: 'Vaste', hint: '1200×1200 — plus lent' },
]

export const SIM_PRESETS: Record<
  SimPresetId,
  { label: string; blurb: string; config: Omit<SimConfig, 'seed'> }
> = {
  standard: {
    label: 'Standard',
    blurb: 'Équilibre classique — exploration et société à rythme humain.',
    config: {
      worldSize: 1000,
      initialVillagers: 26,
      maxPopulation: 250,
      sheepCount: 40,
      horseCount: 14,
      wolfCount: 3,
      preset: 'standard',
      startPaused: false,
    },
  },
  vast: {
    label: 'Monde vaste',
    blurb: 'Grande carte, plus de fondateurs — migrations et villages dispersés.',
    config: {
      worldSize: 1200,
      initialVillagers: 40,
      maxPopulation: 400,
      sheepCount: 55,
      horseCount: 22,
      wolfCount: 4,
      preset: 'vast',
      startPaused: false,
    },
  },
  anthill: {
    label: 'Fourmilière',
    blurb: 'Petite carte, population dense — interactions sociales intensives.',
    config: {
      worldSize: 600,
      initialVillagers: 55,
      maxPopulation: 220,
      sheepCount: 35,
      horseCount: 10,
      wolfCount: 2,
      preset: 'anthill',
      startPaused: false,
    },
  },
  harsh: {
    label: 'Survie rude',
    blurb: 'Peu de gens, plus de loups, plafond bas — chaque mort compte.',
    config: {
      worldSize: 800,
      initialVillagers: 12,
      maxPopulation: 80,
      sheepCount: 18,
      horseCount: 6,
      wolfCount: 7,
      preset: 'harsh',
      startPaused: false,
    },
  },
  observe: {
    label: 'Observation',
    blurb: 'Démarre en pause — idéal pour lire le panneau et l’évolution au ralenti.',
    config: {
      worldSize: 1000,
      initialVillagers: 22,
      maxPopulation: 160,
      sheepCount: 36,
      horseCount: 12,
      wolfCount: 3,
      preset: 'observe',
      startPaused: true,
    },
  },
}

export const DEFAULT_SIM_CONFIG: SimConfig = {
  seed: 1,
  ...SIM_PRESETS.standard.config,
}

let active: SimConfig = { ...DEFAULT_SIM_CONFIG }

export function getSimConfig(): SimConfig {
  return active
}

export function resolveSimConfig(input?: SimConfigInput): SimConfig {
  const presetId = input?.preset ?? active.preset
  const base = SIM_PRESETS[presetId]?.config ?? SIM_PRESETS.standard.config
  const merged: SimConfig = {
    ...base,
    ...input,
    seed: input?.seed ?? active.seed ?? 1,
    preset: presetId,
  }
  merged.worldSize = clampMapSize(merged.worldSize)
  merged.initialVillagers = clampInt(
    merged.initialVillagers,
    INITIAL_VILLAGERS_MIN,
    INITIAL_VILLAGERS_MAX,
  )
  merged.maxPopulation = clampInt(
    merged.maxPopulation,
    merged.initialVillagers,
    MAX_POPULATION_HARD_CAP,
  )
  merged.sheepCount = clampInt(merged.sheepCount, 0, 120)
  merged.horseCount = clampInt(merged.horseCount, 0, 60)
  merged.wolfCount = clampInt(merged.wolfCount, 0, 20)
  merged.seed = merged.seed >>> 0 || 1
  return merged
}

export function applySimConfig(input?: SimConfigInput): SimConfig {
  active = resolveSimConfig(input)
  return active
}

function clampInt(v: number, lo: number, hi: number): number {
  const n = Math.floor(Number(v))
  if (!Number.isFinite(n)) return lo
  return Math.max(lo, Math.min(hi, n))
}

function clampMapSize(n: number): MapSizePreset {
  const allowed: MapSizePreset[] = [600, 800, 1000, 1200]
  let best: MapSizePreset = 1000
  let bestDist = Infinity
  for (const a of allowed) {
    const d = Math.abs(a - n)
    if (d < bestDist) {
      bestDist = d
      best = a
    }
  }
  return best
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 100000) || 1
}
