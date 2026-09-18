/**
 * Headless climate/biome play-effect audit.
 *
 *   npx tsx scripts/audit-climate-ecology.ts
 */
import {
  BiomeId,
  BIOME_COUNT,
  BIOME_PROFILES,
  applyBiomeTintRgb,
  biomeColdBias,
  biomeLabelFr,
  biomeSettlementScore,
  faunaSpawnWeight,
  livelihoodMul,
} from '../src/lib/sim/biomes'
import { coldStress01, cropTempFactor, sampleBiome, sampleTempC } from '../src/lib/sim/climate'
import { createSimulation, stepSimulation } from '../src/lib/sim/engine'
import { clothingClo, thermalBurnMultiplier } from '../src/lib/sim/physicsScale'
import type { SimState } from '../src/lib/sim/types'

const SEEDS = [1, 7, 42, 99, 256, 512, 777, 1024]

function emptyHist(): number[] {
  return new Array(BIOME_COUNT).fill(0)
}

function addHist(a: number[], b: number[]) {
  for (let i = 0; i < BIOME_COUNT; i++) a[i] += b[i]
}

function fmtHist(h: number[], total: number): string {
  return BIOME_PROFILES.map((p) => {
    const n = h[p.id] ?? 0
    const pct = total > 0 ? ((100 * n) / total).toFixed(1) : '0.0'
    return `  ${p.labelFr.padEnd(28)} ${String(n).padStart(6)}  ${pct.padStart(5)}%`
  }).join('\n')
}

function gridBiomeHist(state: SimState) {
  const hist = emptyHist()
  const biome = state.grid.biome
  let total = 0
  for (let i = 0; i < biome.length; i++) {
    const id = biome[i]
    if (id >= 0 && id < BIOME_COUNT) {
      hist[id]++
      total++
    }
  }
  return { hist, total, distinct: hist.filter((n) => n > 0).length }
}

function climateBiomeHist(state: SimState) {
  const hist = emptyHist()
  const climate = state.climate!
  let total = 0
  for (let i = 0; i < climate.biome.length; i++) {
    const id = climate.biome[i]
    if (id >= 0 && id < BIOME_COUNT) {
      hist[id]++
      total++
    }
  }
  return { hist, total, distinct: hist.filter((n) => n > 0).length }
}

function findTileOfBiome(state: SimState, want: number) {
  const climate = state.climate!
  const w = state.grid.width
  const h = state.grid.height
  for (let y = 20; y < h - 20; y += 7) {
    for (let x = 20; x < w - 20; x += 7) {
      if (sampleBiome(climate, x, y) === want) return { x, y }
    }
  }
  for (let y = 1; y < h - 1; y += 3) {
    for (let x = 1; x < w - 1; x += 3) {
      if (state.grid.biome[y * w + x] === want) return { x, y }
    }
  }
  return null
}

function outdoorBurnAt(state: SimState, x: number, y: number) {
  const climate = state.climate!
  const biome = sampleBiome(climate, x, y)
  const tempC = sampleTempC(climate, x, y)
  const cold01 = Math.min(1, coldStress01(tempC) + biomeColdBias(biome) * 0.85)
  const burn = thermalBurnMultiplier({
    cold01,
    heat01: 0,
    rain01: 0,
    night: false,
    sheltered: false,
    clo: clothingClo(false, false, 0),
    massKg: 70,
    heightM: 1.7,
  })
  const farmMul = livelihoodMul(biome).farm
  const cropFac = cropTempFactor(tempC)
  return { biome, tempC, cold01, burn, farmMul, cropFac }
}

function stripForColdTest(state: SimState) {
  for (const v of state.villagers) {
    if (!v.alive) continue
    v.hasHome = false
    v.homeX = -1
    v.homeY = -1
    v.house = null
    for (const s of [...v.inventory]) {
      if (s.type === 'clothing' || s.type === 'leather') s.amount = 0
    }
    v.inventory = v.inventory.filter((s) => s.amount > 0)
    if (v.equipment) {
      v.equipment.torso = null
      v.equipment.outer = null
      v.equipment.head = null
      v.equipment.hands = null
      v.equipment.feet = null
      v.equipment.legs = null
    }
    v.hunger = 6
    v.stamina = 4
    v.task = null
  }
}

function meanHunger(state: SimState) {
  const alive = state.villagers.filter((v) => v.alive)
  if (!alive.length) return 0
  return alive.reduce((s, v) => s + v.hunger, 0) / alive.length
}

function moveAllTo(state: SimState, x: number, y: number) {
  for (const v of state.villagers) {
    if (!v.alive) continue
    v.x = x
    v.y = y
  }
}

function hungerDrainDelta(seed: number, biomeWant: number, ticks: number) {
  const state = createSimulation(seed, { initialVillagers: 12 })
  const tile = findTileOfBiome(state, biomeWant)
  if (!tile) return null
  stripForColdTest(state)
  moveAllTo(state, tile.x, tile.y)
  for (const v of state.villagers) {
    v.nextThinkTick = state.tick + ticks + 1000
    v.task = {
      kind: 'idle',
      targetX: tile.x,
      targetY: tile.y,
      targetId: null,
      resource: null,
      stuckTicks: 0,
      ageTicks: 0,
      work: 0,
      path: null,
      pathI: 0,
      pathTx: tile.x,
      pathTy: tile.y,
      pathTick: state.tick,
    }
  }
  const h0 = meanHunger(state)
  for (let i = 0; i < ticks; i++) stepSimulation(state)
  return h0 - meanHunger(state)
}

console.log('=== Climate / biome play-effect audit ===\n')

const worldHist = emptyHist()
let worldTotal = 0
let worldDistinctSum = 0
const climateHist = emptyHist()
let climateTotal = 0
let climateDistinctSum = 0
const foundingHist = emptyHist()
let foundingTotal = 0
const faunaHist = {
  sheep: emptyHist(),
  horse: emptyHist(),
  wolf: emptyHist(),
}
const faunaTotals = { sheep: 0, horse: 0, wolf: 0 }

for (const seed of SEEDS) {
  const state = createSimulation(seed)
  const g = gridBiomeHist(state)
  addHist(worldHist, g.hist)
  worldTotal += g.total
  worldDistinctSum += g.distinct
  const c = climateBiomeHist(state)
  addHist(climateHist, c.hist)
  climateTotal += c.total
  climateDistinctSum += c.distinct

  const seen = new Set<string>()
  for (const v of state.villagers) {
    if (!v.alive) continue
    const key = `${Math.round(v.x / 20)},${Math.round(v.y / 20)}`
    if (seen.has(key)) continue
    seen.add(key)
    foundingHist[sampleBiome(state.climate!, v.x, v.y)]++
    foundingTotal++
  }
  for (const s of state.sheep) {
    faunaHist.sheep[sampleBiome(state.climate!, s.x, s.y)]++
    faunaTotals.sheep++
  }
  for (const h of state.horses) {
    faunaHist.horse[sampleBiome(state.climate!, h.x, h.y)]++
    faunaTotals.horse++
  }
  for (const w of state.wolves) {
    faunaHist.wolf[sampleBiome(state.climate!, w.x, w.y)]++
    faunaTotals.wolf++
  }
}

console.log(`Worlds: ${SEEDS.length} seeds`)
console.log(`\n-- Grid biome paint --`)
console.log(`mean distinct biomes/world: ${(worldDistinctSum / SEEDS.length).toFixed(2)}`)
console.log(fmtHist(worldHist, worldTotal))
console.log(`\n-- Climate lattice biome --`)
console.log(`mean distinct biomes/world: ${(climateDistinctSum / SEEDS.length).toFixed(2)}`)
console.log(fmtHist(climateHist, climateTotal))
console.log(`\n-- Founding clusters --`)
console.log(fmtHist(foundingHist, foundingTotal))

const landWorld = worldTotal - worldHist[BiomeId.ocean]
console.log('\nFounding share − land share (positive = preferred):')
for (const id of [
  BiomeId.grassland,
  BiomeId.temperateForest,
  BiomeId.wetland,
  BiomeId.tundra,
  BiomeId.desert,
  BiomeId.alpine,
]) {
  const landShare = landWorld > 0 ? worldHist[id] / landWorld : 0
  const foundShare = foundingTotal > 0 ? foundingHist[id] / foundingTotal : 0
  console.log(
    `  ${biomeLabelFr(id).padEnd(28)} score=${biomeSettlementScore(id).toFixed(2)}  delta=${((foundShare - landShare) * 100).toFixed(1)} pp`,
  )
}

console.log(`\n-- Fauna spawn by biome --`)
for (const kind of ['sheep', 'horse', 'wolf'] as const) {
  console.log(`\n${kind} (n=${faunaTotals[kind]}):`)
  console.log(fmtHist(faunaHist[kind], faunaTotals[kind]))
  let wSum = 0
  for (let b = 0; b < BIOME_COUNT; b++) wSum += (faunaHist[kind][b] ?? 0) * faunaSpawnWeight(b as never, kind)
  console.log(`  mean faunaSpawnWeight: ${(faunaTotals[kind] > 0 ? wSum / faunaTotals[kind] : 0).toFixed(3)}`)
}

const grassRgb = BIOME_PROFILES.map((p) => applyBiomeTintRgb(72, 128, 58, p.id, 'grass'))
let minDist = Infinity
let minPair = ''
for (let i = 0; i < grassRgb.length; i++) {
  for (let j = i + 1; j < grassRgb.length; j++) {
    const a = grassRgb[i]
    const b = grassRgb[j]
    const d = Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2])
    if (d < minDist) {
      minDist = d
      minPair = `${BIOME_PROFILES[i].labelFr} vs ${BIOME_PROFILES[j].labelFr}`
    }
  }
}
console.log(`\n-- Biome grass tint min pairwise L1: ${minDist} (${minPair})`)

const probe = createSimulation(42)
const tundra = findTileOfBiome(probe, BiomeId.tundra)
const grass = findTileOfBiome(probe, BiomeId.grassland)
const forest = findTileOfBiome(probe, BiomeId.temperateForest)
const desert = findTileOfBiome(probe, BiomeId.desert)
const boreal = findTileOfBiome(probe, BiomeId.boreal)

console.log('\n-- Cold / crop modifiers (seed 42) --')
for (const [name, tile] of [
  ['tundra', tundra],
  ['boreal', boreal],
  ['grassland', grass],
  ['temperateForest', forest],
  ['desert', desert],
] as const) {
  if (!tile) {
    console.log(`  ${name}: NOT FOUND`)
    continue
  }
  const m = outdoorBurnAt(probe, tile.x, tile.y)
  console.log(
    `  ${name} @(${tile.x},${tile.y}) ${biomeLabelFr(m.biome as never)} T=${m.tempC.toFixed(1)}°C cold01=${m.cold01.toFixed(3)} burn=${m.burn.toFixed(3)} farmMul=${m.farmMul.toFixed(2)} cropFac=${m.cropFac.toFixed(2)} growth≈${(m.farmMul * m.cropFac).toFixed(3)}`,
  )
}

const coldTile = tundra ?? boreal
const coldWant = tundra ? BiomeId.tundra : BiomeId.boreal
const DRAIN_TICKS = 72
const coldDrain = coldTile ? hungerDrainDelta(42, coldWant, DRAIN_TICKS) : null
const mildDrain = grass ? hungerDrainDelta(42, BiomeId.grassland, DRAIN_TICKS) : null
console.log(`\n-- Runtime hunger drop over ${DRAIN_TICKS} ticks --`)
console.log(`  cold (${biomeLabelFr(coldWant)}): ${coldDrain == null ? 'n/a' : coldDrain.toFixed(4)}`)
console.log(`  grassland: ${mildDrain == null ? 'n/a' : mildDrain.toFixed(4)}`)
if (coldDrain != null && mildDrain != null) {
  console.log(`  ratio: ${(coldDrain / Math.max(1e-6, mildDrain)).toFixed(2)}`)
}

const distinctOk = worldDistinctSum / SEEDS.length >= 5
const foundingPrefers =
  (foundingHist[BiomeId.grassland] + foundingHist[BiomeId.temperateForest] + foundingHist[BiomeId.wetland]) /
    Math.max(1, foundingTotal) >
  (foundingHist[BiomeId.tundra] + foundingHist[BiomeId.desert] + foundingHist[BiomeId.alpine]) /
    Math.max(1, foundingTotal)
const sheepPreferOpen =
  faunaTotals.sheep > 0 &&
  (faunaHist.sheep[BiomeId.grassland] + faunaHist.sheep[BiomeId.savanna]) / faunaTotals.sheep >
    faunaHist.sheep[BiomeId.desert] / faunaTotals.sheep
const noOceanFauna =
  faunaHist.sheep[BiomeId.ocean] + faunaHist.horse[BiomeId.ocean] + faunaHist.wolf[BiomeId.ocean] === 0
const tintOk = minDist >= 8
const coldProbe = coldTile && grass ? outdoorBurnAt(probe, coldTile.x, coldTile.y) : null
const mildProbe = grass ? outdoorBurnAt(probe, grass.x, grass.y) : null
const coldOk = !!(coldProbe && mildProbe && coldProbe.burn > mildProbe.burn * 1.08)
const cropOk = !!(
  coldProbe &&
  mildProbe &&
  coldProbe.farmMul < mildProbe.farmMul * 0.7
)
const runtimeColdOk = coldDrain != null && mildDrain != null && coldDrain > mildDrain * 1.08
const desertOrSavannaOk = worldHist[BiomeId.desert] + worldHist[BiomeId.savanna] > 0
const tundraOrBorealOk = worldHist[BiomeId.tundra] + worldHist[BiomeId.boreal] > 0
const alpineNotDominant = landWorld > 0 && worldHist[BiomeId.alpine] / landWorld < 0.22

console.log('\n=== SUMMARY ===')
console.log(`  distinct biome cells painted: ${distinctOk ? 'PASS' : 'FAIL'}`)
console.log(`  desert/savanna present:       ${desertOrSavannaOk ? 'PASS' : 'FAIL'}`)
console.log(`  tundra/boreal present:        ${tundraOrBorealOk ? 'PASS' : 'FAIL'}`)
console.log(`  alpine not land-dominant:     ${alpineNotDominant ? 'PASS' : 'FAIL'}`)
console.log(`  founding prefers hospitable:  ${foundingPrefers ? 'PASS' : 'FAIL'}`)
console.log(`  sheep prefer open land:       ${sheepPreferOpen ? 'PASS' : 'FAIL'}`)
console.log(`  no ocean fauna spawns:        ${noOceanFauna ? 'PASS' : 'FAIL'}`)
console.log(`  biome tint distinct:          ${tintOk ? 'PASS' : 'FAIL'} (minL1=${minDist})`)
console.log(`  cold burn > temperate:        ${coldOk ? 'PASS' : 'FAIL'}`)
console.log(`  cold farmMul << temperate:    ${cropOk ? 'PASS' : 'FAIL'}`)
console.log(`  runtime cold hunger drain:    ${runtimeColdOk ? 'PASS' : 'FAIL'}`)
