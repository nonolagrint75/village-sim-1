/**
 * Earth-like environmental substrate (coarse climate grid).
 *
 * Not a GCM: equation-based temperature, soft ocean currents, prevailing wind + storms.
 * All fields live on a CLIMATE_RES² lattice (~15×15 world tiles per cell) with bilinear sample.
 *
 * Temperature (°C) at cell center, then bilinear to world (x,y):
 *
 *   φ = (y - equatorY) / (H/2) ∈ [-1, 1]     // geographic latitude proxy (0 = equator)
 *   elev_km ≈ elev01 * ELEV_KM_SCALE         // 0..1 relief → km
 *
 *   T = T0
 *     + A_LAT * cos(φ * π/2)                 // warmer at equator
 *     - LAPSE_RATE * elev_km                 // environmental lapse ~6.5 K/km
 *     + A_SEASON * sin(2π · yearFrac) * φ    // orbital-tilt proxy (hemispheres opposite)
 *     + A_DIURNAL * cos(2π · dayFrac) * (1 - 0.55·coast)
 *     + A_COAST * coast * (T_maritime - T_raw)  // coastal moderation (applied as blend)
 *     + stormCool                            // storm cold/wet anomaly
 *
 * Ocean current (water cells): gyre from stream function ψ = sin(π X) sin(π Y)
 *   u =  ∂ψ/∂Y ,  v = -∂ψ/∂X   + equatorial westward drift (trade-driven).
 *
 * Wind: trades (|φ|<0.35), westerlies mid-lat, easterlies high-lat + storm swirl.
 */

import { logCause } from './politics'
import { getSimPerfBudget } from './perfBudget'
import { TICKS_PER_YEAR } from './calendar'
import {
  MOUNTAIN,
  SAND,
  WATER,
  WORLD_SIZE,
  type Season,
  type SimState,
  type WorldGrid,
} from './types'
import { TICKS_PER_DAY, getTerrain, inBounds } from './world'

/** Coarse lattice resolution (64×64 on a 1000 map ≈ 15.6 tiles/cell). */
export const CLIMATE_RES = 64
/** Refresh dynamic T / rain every N ticks. */
export const CLIMATE_TEMP_PERIOD = 6
/** Refresh winds, currents, storms every N ticks. */
export const CLIMATE_FLOW_PERIOD = 24

// ── Documented physical-ish constants ────────────────────────────────────────

/** Mean temperature at equator, sea level (°C) — bande agricole jouable (~15–30 °C). */
export const T0 = 15
/** Latitude amplitude: T drops toward poles via cos(φ·π/2). */
export const A_LAT = 14
/** Environmental lapse rate (°C / km). */
export const LAPSE_RATE = 6.5
/** Map elev01 → kilometres of relief. */
export const ELEV_KM_SCALE = 3.8
/** Seasonal amplitude (°C) scaled by latitude φ (tilt proxy). */
export const A_SEASON = 14
/** Day/night swing (°C) at inland sites. */
export const A_DIURNAL = 6.5
/** How strongly coast damps extremes (0–1 blend toward maritime mean). */
export const A_COAST = 0.42
/** Maritime reference for coastal blend (°C). */
export const T_MARITIME = 16
/** Equator band half-width in world Y (tiles) around map mid-line. */
export const EQUATOR_BAND = 40

export type WeatherKind = 'clear' | 'rain' | 'storm'

export interface ClimateState {
  res: number
  cell: number
  /** Static 0..1 elevation proxy per cell. */
  elev: Float32Array
  /** Static 0..1 moisture / humidity proxy. */
  moisture: Float32Array
  /** Fraction of water tiles in cell. */
  waterFrac: Float32Array
  /** 0..1 coastal influence (near WATER). */
  coast: Float32Array
  /** Dynamic air temperature °C. */
  tempC: Float32Array
  /** Soft precipitation intensity 0..1. */
  rain: Float32Array
  /** Wind components (world tiles / tick scale, small). */
  windU: Float32Array
  windV: Float32Array
  /** Ocean current on water (same units). */
  currentU: Float32Array
  currentV: Float32Array
  /** Cached season index for base insolation. */
  seasonCache: Season
  yearFracCache: number
  dayFracCache: number
  weather: WeatherKind
  stormX: number
  stormY: number
  stormR: number
  stormStrength: number
  lastFlowTick: number
  lastTempTick: number
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v
}

function cellIndex(res: number, cx: number, cy: number): number {
  return cy * res + cx
}

/** Latitude proxy φ ∈ [-1,1], 0 on equator (map mid Y). */
export function latitudePhi(y: number, height = WORLD_SIZE): number {
  const mid = (height - 1) * 0.5
  return clamp((y - mid) / mid, -1, 1)
}

export function equatorY(height = WORLD_SIZE): number {
  return (height - 1) * 0.5
}

function terrainElevProxy(t: number): number {
  if (t === WATER) return 0.02
  if (t === MOUNTAIN) return 0.92
  if (t === SAND) return 0.12
  return 0.38
}

function terrainMoistureProxy(t: number, waterNear: number): number {
  if (t === WATER) return 1
  if (t === SAND) return 0.12 + waterNear * 0.25
  if (t === MOUNTAIN) return 0.35
  return 0.45 + waterNear * 0.35
}

/** Build static coarse fields from the finished world grid (O(world) once at init). */
export function createClimate(grid: WorldGrid, _seed = 1): ClimateState {
  const res = CLIMATE_RES
  const cell = Math.max(1, Math.floor(grid.width / res))
  const n = res * res
  const elev = new Float32Array(n)
  const moisture = new Float32Array(n)
  const waterFrac = new Float32Array(n)
  const coast = new Float32Array(n)
  const tempC = new Float32Array(n)
  const rain = new Float32Array(n)
  const windU = new Float32Array(n)
  const windV = new Float32Array(n)
  const currentU = new Float32Array(n)
  const currentV = new Float32Array(n)

  for (let cy = 0; cy < res; cy++) {
    for (let cx = 0; cx < res; cx++) {
      const x0 = cx * cell
      const y0 = cy * cell
      const x1 = Math.min(grid.width, x0 + cell)
      const y1 = Math.min(grid.height, y0 + cell)
      let eSum = 0
      let mSum = 0
      let wCount = 0
      let coastHits = 0
      let samples = 0
      // Stride sample inside the cell for O(res² · (cell/stride)²) ≈ cheap.
      const stride = Math.max(2, Math.floor(cell / 4))
      for (let y = y0; y < y1; y += stride) {
        for (let x = x0; x < x1; x += stride) {
          const t = getTerrain(grid, x, y)
          let waterNear = 0
          if (t !== WATER) {
            for (let dy = -2; dy <= 2 && waterNear === 0; dy++) {
              for (let dx = -2; dx <= 2; dx++) {
                if (inBounds(grid, x + dx, y + dy) && getTerrain(grid, x + dx, y + dy) === WATER) {
                  waterNear = 1
                  break
                }
              }
            }
          } else waterNear = 1
          eSum += terrainElevProxy(t)
          mSum += terrainMoistureProxy(t, waterNear)
          if (t === WATER) wCount++
          if (waterNear) coastHits++
          samples++
        }
      }
      const i = cellIndex(res, cx, cy)
      const inv = samples > 0 ? 1 / samples : 0
      elev[i] = eSum * inv
      moisture[i] = clamp(mSum * inv, 0, 1)
      waterFrac[i] = wCount * inv
      coast[i] = clamp(coastHits * inv, 0, 1)
    }
  }

  const climate: ClimateState = {
    res,
    cell,
    elev,
    moisture,
    waterFrac,
    coast,
    tempC,
    rain,
    windU,
    windV,
    currentU,
    currentV,
    seasonCache: 'spring',
    yearFracCache: 0,
    dayFracCache: 0,
    weather: 'clear',
    stormX: -1,
    stormY: -1,
    stormR: 0,
    stormStrength: 0,
    lastFlowTick: -999,
    lastTempTick: -999,
  }
  refreshTemperatureField(climate, 0, 'spring')
  refreshFlowField(climate, 0)
  return climate
}

function yearFraction(tick: number): number {
  return (tick % TICKS_PER_YEAR) / TICKS_PER_YEAR
}

function dayFraction(tick: number): number {
  return (tick % TICKS_PER_DAY) / TICKS_PER_DAY
}

/**
 * Core temperature equation (cell centers). See file header for symbols.
 */
export function temperatureAtCell(climate: ClimateState, cx: number, cy: number, yearFrac: number, dayFrac: number): number {
  const i = cellIndex(climate.res, cx, cy)
  const wy = (cy + 0.5) * climate.cell
  const phi = latitudePhi(wy)
  const elevKm = climate.elev[i] * ELEV_KM_SCALE
  const coast = climate.coast[i]

  const tLat = T0 + A_LAT * Math.cos(phi * (Math.PI / 2))
  const tElev = -LAPSE_RATE * elevKm
  // Orbital tilt proxy: opposite sign across equator.
  const tSeason = A_SEASON * Math.sin(2 * Math.PI * yearFrac) * phi
  const tDiurnal = A_DIURNAL * Math.cos(2 * Math.PI * dayFrac) * (1 - 0.55 * coast)

  let t = tLat + tElev + tSeason + tDiurnal
  // Coastal moderation toward maritime mean.
  t = t + A_COAST * coast * (T_MARITIME - t)

  if (climate.stormStrength > 0.05 && climate.stormR > 0) {
    const wx = (cx + 0.5) * climate.cell
    const dx = wx - climate.stormX
    const dy = wy - climate.stormY
    const d = Math.sqrt(dx * dx + dy * dy)
    if (d < climate.stormR) {
      const w = 1 - d / climate.stormR
      t -= climate.stormStrength * 8 * w * w
    }
  }
  return t
}

function refreshTemperatureField(climate: ClimateState, tick: number, season: Season) {
  const yf = yearFraction(tick)
  const df = dayFraction(tick)
  climate.yearFracCache = yf
  climate.dayFracCache = df
  climate.seasonCache = season
  const res = climate.res
  for (let cy = 0; cy < res; cy++) {
    for (let cx = 0; cx < res; cx++) {
      const i = cellIndex(res, cx, cy)
      climate.tempC[i] = temperatureAtCell(climate, cx, cy, yf, df)
      // Rain: moisture × (storm|weather) × cooled air soft factor
      let r = climate.moisture[i] * 0.15
      if (climate.weather === 'rain') r += 0.35 * climate.moisture[i]
      if (climate.weather === 'storm') {
        const wx = (cx + 0.5) * climate.cell
        const wy = (cy + 0.5) * climate.cell
        const dx = wx - climate.stormX
        const dy = wy - climate.stormY
        const d = Math.sqrt(dx * dx + dy * dy)
        if (d < climate.stormR) r += climate.stormStrength * (1 - d / climate.stormR)
      }
      climate.rain[i] = clamp(r, 0, 1)
    }
  }
  climate.lastTempTick = tick
}

/**
 * Soft non-divergent gyre + equatorial westward drift on waterFrac cells.
 * ψ = sin(π X̂) sin(π Ŷ),  u=∂ψ/∂Ŷ, v=-∂ψ/∂X̂  (scaled).
 */
function refreshFlowField(climate: ClimateState, tick: number) {
  const res = climate.res
  const gyre = 0.55
  for (let cy = 0; cy < res; cy++) {
    for (let cx = 0; cx < res; cx++) {
      const i = cellIndex(res, cx, cy)
      const X = (cx + 0.5) / res
      const Y = (cy + 0.5) / res
      const phi = latitudePhi((cy + 0.5) * climate.cell)
      // Stream-function gradients (analytic).
      const dPsi_dY = Math.sin(Math.PI * X) * Math.PI * Math.cos(Math.PI * Y)
      const dPsi_dX = Math.PI * Math.cos(Math.PI * X) * Math.sin(Math.PI * Y)
      let cu = gyre * dPsi_dY
      let cv = -gyre * dPsi_dX
      // Trade-driven equatorial westward current.
      cu += -0.45 * Math.exp(-phi * phi * 8)
      const wet = climate.waterFrac[i]
      climate.currentU[i] = cu * wet
      climate.currentV[i] = cv * wet

      // Prevailing winds by latitude belt.
      let wu = 0
      let wv = 0
      const ap = Math.abs(phi)
      if (ap < 0.35) {
        wu = -0.7 // trades
        wv = 0.05 * Math.sin(X * Math.PI * 2)
      } else if (ap < 0.72) {
        wu = 0.85 // westerlies
        wv = 0.1 * Math.sin(Y * Math.PI * 2)
      } else {
        wu = -0.4
        wv = 0.15
      }
      // Storm cyclonic swirl (2D).
      if (climate.stormStrength > 0.1) {
        const wx = (cx + 0.5) * climate.cell
        const wy = (cy + 0.5) * climate.cell
        const dx = wx - climate.stormX
        const dy = wy - climate.stormY
        const d = Math.sqrt(dx * dx + dy * dy) + 1
        if (d < climate.stormR * 1.2) {
          const s = climate.stormStrength * (1 - d / (climate.stormR * 1.2))
          wu += (-dy / d) * s * 1.2
          wv += (dx / d) * s * 1.2
        }
      }
      climate.windU[i] = wu
      climate.windV[i] = wv
    }
  }
  climate.lastFlowTick = tick
}

function maybeSpawnWeather(state: SimState, climate: ClimateState, rng: () => number) {
  // Sparse transitions — Earth-like weather regimes, not every tick.
  if (rng() > 0.08) return
  const roll = rng()
  const prev = climate.weather
  if (roll < 0.55) {
    climate.weather = 'clear'
    climate.stormStrength = 0
  } else if (roll < 0.88) {
    climate.weather = 'rain'
    climate.stormStrength = 0.15 + rng() * 0.25
    climate.stormX = rng() * WORLD_SIZE
    climate.stormY = rng() * WORLD_SIZE
    climate.stormR = 80 + rng() * 140
  } else {
    climate.weather = 'storm'
    climate.stormStrength = 0.55 + rng() * 0.4
    climate.stormX = rng() * WORLD_SIZE
    climate.stormY = rng() * WORLD_SIZE
    climate.stormR = 100 + rng() * 180
    if (prev !== 'storm' && !state.milestones.firstStorm) {
      state.milestones.firstStorm = true
      logCause(state, 'basse pression et cisaillement de vent', 'tempête violente sur le continent')
    } else if (prev !== 'storm' && rng() < 0.35) {
      logCause(state, 'front froid océanique', 'orage et rafales balayent les côtes')
    }
  }
}

/** Main climate tick — cheap; full fields only on periods (TPS-adaptive). */
export function tickClimate(state: SimState, rng: () => number = Math.random) {
  const climate = state.climate
  if (!climate) return
  const tick = state.tick
  const mul = getSimPerfBudget().climatePeriodMul
  const flowPeriod = Math.round(CLIMATE_FLOW_PERIOD * mul)
  const tempPeriod = Math.round(CLIMATE_TEMP_PERIOD * mul)

  if (tick - climate.lastFlowTick >= flowPeriod) {
    maybeSpawnWeather(state, climate, rng)
    refreshFlowField(climate, tick)
  }
  if (tick - climate.lastTempTick >= tempPeriod || climate.seasonCache !== state.season) {
    refreshTemperatureField(climate, tick, state.season)
  }
}

function bilinear(grid: Float32Array, res: number, x: number, y: number, cell: number): number {
  const fx = clamp(x / cell - 0.5, 0, res - 1.001)
  const fy = clamp(y / cell - 0.5, 0, res - 1.001)
  const x0 = Math.floor(fx)
  const y0 = Math.floor(fy)
  const x1 = Math.min(res - 1, x0 + 1)
  const y1 = Math.min(res - 1, y0 + 1)
  const tx = fx - x0
  const ty = fy - y0
  const a = grid[y0 * res + x0]
  const b = grid[y0 * res + x1]
  const c = grid[y1 * res + x0]
  const d = grid[y1 * res + x1]
  return (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty
}

export function sampleTempC(climate: ClimateState, x: number, y: number): number {
  return bilinear(climate.tempC, climate.res, x, y, climate.cell)
}

export function sampleRain(climate: ClimateState, x: number, y: number): number {
  return bilinear(climate.rain, climate.res, x, y, climate.cell)
}

export function sampleMoisture(climate: ClimateState, x: number, y: number): number {
  return bilinear(climate.moisture, climate.res, x, y, climate.cell)
}

export function sampleCurrent(climate: ClimateState, x: number, y: number): { u: number; v: number } {
  return {
    u: bilinear(climate.currentU, climate.res, x, y, climate.cell),
    v: bilinear(climate.currentV, climate.res, x, y, climate.cell),
  }
}

export function sampleWind(climate: ClimateState, x: number, y: number): { u: number; v: number } {
  return {
    u: bilinear(climate.windU, climate.res, x, y, climate.cell),
    v: bilinear(climate.windV, climate.res, x, y, climate.cell),
  }
}

/** Comfort band for humans outdoors without gear (°C). */
export const COMFORT_LOW = 8
export const COMFORT_HIGH = 32
/** Wheat likes ~6–32 °C (soft band; extremes still grow slowly). */
export const CROP_T_MIN = 5
export const CROP_T_MAX = 32
export const CROP_T_OPT = 17

export function coldStress01(tempC: number): number {
  if (tempC >= COMFORT_LOW) return 0
  return clamp((COMFORT_LOW - tempC) / 22, 0, 1)
}

export function heatStress01(tempC: number): number {
  if (tempC <= COMFORT_HIGH) return 0
  return clamp((tempC - COMFORT_HIGH) / 18, 0, 1)
}

/** Crop growth multiplier from local temperature (Gaussian-ish around optimum). */
export function cropTempFactor(tempC: number): number {
  if (tempC < CROP_T_MIN || tempC > CROP_T_MAX) return 0.05
  const d = (tempC - CROP_T_OPT) / 9
  return clamp(Math.exp(-0.5 * d * d), 0.08, 1.35)
}

/** Biome suitability for tree / grass / sand from T + moisture (regrowth). */
export function biomeSuitability(
  tempC: number,
  moisture: number,
): { tree: number; grass: number; bush: number; sand: number } {
  const t01 = clamp((tempC + 5) / 40, 0, 1)
  const tree = clamp(moisture * 1.1 * (0.35 + t01 * 0.7) - (tempC < 0 ? 0.5 : 0), 0, 1)
  const bush = clamp(moisture * 0.9 * (0.4 + (1 - Math.abs(t01 - 0.55)) * 0.8), 0, 1)
  const grass = clamp((0.35 + moisture * 0.5) * (0.4 + t01 * 0.6), 0, 1)
  const sand = clamp((1 - moisture) * (0.5 + t01 * 0.5) - tree * 0.3, 0, 1)
  return { tree, grass, bush, sand }
}

/**
 * Boat speed multiplier from current alignment with travel direction.
 * heading = unit vector toward destination; current dotted → with/against.
 */
export function boatCurrentSpeedMul(
  climate: ClimateState,
  x: number,
  y: number,
  destX: number,
  destY: number,
): number {
  const c = sampleCurrent(climate, x, y)
  const wind = sampleWind(climate, x, y)
  const dx = destX - x
  const dy = destY - y
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  const hx = dx / len
  const hy = dy / len
  const align = c.u * hx + c.v * hy
  const windAlign = wind.u * hx + wind.v * hy
  // Current dominates; soft wind assist/oppose for sail-ish boats.
  return clamp(1 + align * 0.45 + windAlign * 0.14, 0.6, 1.45)
}

/** Soft fishing bonus near current shear / coast nutrient edges. */
export function fishingCurrentBonus(climate: ClimateState, x: number, y: number): number {
  const c = sampleCurrent(climate, x, y)
  const speed = Math.sqrt(c.u * c.u + c.v * c.v)
  const coast = bilinear(climate.coast, climate.res, x, y, climate.cell)
  // Nutrient edge: moderate current × coast.
  return clamp(speed * 0.55 + coast * 0.35 * Math.min(1, speed * 2), 0, 1.2)
}

/** Optional cheap grass tint shift from cold (returns CSS-ish hex or null). */
export function coldTintForTemp(tempC: number): string | null {
  if (tempC > 4) return null
  if (tempC > -2) return '#8aa4a0'
  return '#c8d4dc'
}
