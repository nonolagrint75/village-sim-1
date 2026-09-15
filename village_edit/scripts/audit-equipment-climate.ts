/**
 * Headless audit: cold deaths vs clo, tool use rates, carry / rest warmth.
 *
 *   npx tsx scripts/audit-equipment-climate.ts [seed] [days]
 */
import { createSimulation, stepSimulation } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import { coldStress01, sampleBiome, sampleTempC } from '../src/lib/sim/climate'
import { biomeColdBias, biomeLabelFr } from '../src/lib/sim/biomes'
import { equipmentEffectsOf, ensureEquipment } from '../src/lib/sim/equipment'
import { clothingClo } from '../src/lib/sim/physicsScale'
import { carriedMass, carryCapacityOf, countOf } from '../src/lib/sim/inventory'
import { bodyMassKgFromPhenotype } from '../src/lib/sim/physicsScale'
import { hasHomeFurniture } from '../src/lib/sim/furniture'

const seed = Number(process.argv[2] ?? 42)
const days = Number(process.argv[3] ?? 90)
const ticks = days * TICKS_PER_DAY
const sampleEvery = Math.max(1, Math.floor(TICKS_PER_DAY / 2))

const state = createSimulation(seed)

type CloBucket = 'naked' | 'light' | 'warm' | 'heavy'
function cloBucket(clo: number): CloBucket {
  if (clo < 0.55) return 'naked'
  if (clo < 1.0) return 'light'
  if (clo < 1.6) return 'warm'
  return 'heavy'
}

function wornClo(v: (typeof state.villagers)[0]): number {
  const gear = equipmentEffectsOf(v)
  return clothingClo(countOf(v.inventory, 'leather') > 0, countOf(v.inventory, 'clothing') > 0, gear.clo)
}

/** Logs look like: `[1·j1·2h] Elana meurt de froid` */
function villagerNameFromLog(line: string): string {
  return line
    .replace(/^\[[^\]]+\]\s*/, '')
    .replace(/\s+(meurt de froid|est mort de faim|succombe à la maladie).*$/i, '')
    .trim()
}

const coldDeathsByClo: Record<CloBucket, number> = { naked: 0, light: 0, warm: 0, heavy: 0 }
const hungerDeaths = { n: 0 }
const diseaseDeaths = { n: 0 }
const otherDeaths = { n: 0 }
let lastLog = 0

const toolSamples = { none: 0, wood: 0, stone: 0, iron: 0, n: 0 }
const laborWithTool = { with: 0, without: 0 }
const cloSamples: Record<CloBucket, number> = { naked: 0, light: 0, warm: 0, heavy: 0 }
let overloadedTicks = 0
let hearthRestTicks = 0
let outdoorColdUnderdressed = 0
let cloSum = 0
let cloN = 0
let outerWorn = 0
let toolHandWorn = 0
const biomeTicks: Record<string, number> = {}

console.log(`equipment/climate audit — seed=${seed} days=${days} (${ticks} ticks)\n`)

for (let t = 1; t <= ticks; t++) {
  stepSimulation(state)

  if (state.log.length > lastLog) {
    for (let i = lastLog; i < state.log.length; i++) {
      const line = state.log[i]
      if (/meurt de froid/i.test(line)) {
        const name = villagerNameFromLog(line)
        const corpse = state.villagers.find((v) => v.name === name)
        const clo = corpse ? wornClo(corpse) : 0.3
        coldDeathsByClo[cloBucket(clo)]++
      } else if (/est mort de faim/i.test(line)) {
        hungerDeaths.n++
      } else if (/succombe à la maladie/i.test(line)) {
        diseaseDeaths.n++
      } else if (/loup|tué|combat/i.test(line) && /est |meurt|tué/i.test(line)) {
        otherDeaths.n++
      }
    }
    lastLog = state.log.length
  }

  if (t % sampleEvery !== 0) continue

  for (const v of state.villagers) {
    if (!v.alive) continue
    const clo = wornClo(v)
    const bucket = cloBucket(clo)
    cloSamples[bucket]++
    cloSum += clo
    cloN++
    const eq = ensureEquipment(v)
    if (eq.outer) outerWorn++
    if (eq.mainHand) toolHandWorn++

    toolSamples[v.toolTier]++
    toolSamples.n++

    const task = v.task?.kind ?? ''
    const labor =
      task.startsWith('gather') ||
      task.startsWith('build') ||
      task.startsWith('craft') ||
      task === 'clearLand' ||
      task === 'mineTunnel' ||
      task === 'mineGold'
    if (labor) {
      if (v.toolTier === 'none') laborWithTool.without++
      else laborWithTool.with++
    }

    const air = sampleTempC(state.climate, v.x, v.y)
    const biome = sampleBiome(state.climate, v.x, v.y)
    const cold = Math.min(1, coldStress01(air) + biomeColdBias(biome) * 0.55)
    const label = biomeLabelFr(biome)
    biomeTicks[label] = (biomeTicks[label] ?? 0) + 1

    const sheltered = v.hasHome && Math.hypot(v.x - v.homeX, v.y - v.homeY) <= 3.2
    if (!sheltered && cold > 0.35 && clo < 0.9) outdoorColdUnderdressed++

    if (task === 'rest' && sheltered && hasHomeFurniture(v, 'hearth')) hearthRestTicks++

    const mass = carriedMass(v.inventory)
    const cap =
      carryCapacityOf({
        hasCart: v.hasCart,
        mounted: v.mounted,
        bodyMassKg: bodyMassKgFromPhenotype(v.phenotype),
        strength01: v.phenotype.strengthBias,
      }) + equipmentEffectsOf(v).carryKg
    if (mass > cap * 0.92) overloadedTicks++
  }
}

const coldDeathTotal =
  coldDeathsByClo.naked + coldDeathsByClo.light + coldDeathsByClo.warm + coldDeathsByClo.heavy
const meanClo = cloN > 0 ? cloSum / cloN : 0
const toolLaborTotal = laborWithTool.with + laborWithTool.without
const toolUseRate = toolLaborTotal > 0 ? laborWithTool.with / toolLaborTotal : 0

console.log('── Clo distribution (alive samples) ──')
for (const b of ['naked', 'light', 'warm', 'heavy'] as CloBucket[]) {
  const n = cloSamples[b]
  console.log(`  ${b}: ${n} (${cloN ? ((100 * n) / cloN).toFixed(1) : 0}%)`)
}
console.log(`  mean clo: ${meanClo.toFixed(3)}`)
console.log(`  wearing outer: ${outerWorn} / ${cloN} samples`)
console.log(`  mainHand tool: ${toolHandWorn} / ${cloN} samples`)

console.log('\n── Deaths (log) ──')
console.log(`  cold total: ${coldDeathTotal}`)
for (const b of ['naked', 'light', 'warm', 'heavy'] as CloBucket[]) {
  console.log(`    cold @${b}: ${coldDeathsByClo[b]}`)
}
console.log(`  hunger: ${hungerDeaths.n}`)
console.log(`  disease: ${diseaseDeaths.n}`)
console.log(`  other matched: ${otherDeaths.n}`)
console.log(`  state.deaths: ${state.deaths}`)

console.log('\n── Tool use ──')
console.log(
  `  tiers sampled: none=${toolSamples.none} wood=${toolSamples.wood} stone=${toolSamples.stone} iron=${toolSamples.iron}`,
)
console.log(
  `  labor with tool: ${(toolUseRate * 100).toFixed(1)}% (${laborWithTool.with}/${toolLaborTotal})`,
)

console.log('\n── Exposure / load / hearth ──')
console.log(`  outdoor cold+underdressed samples: ${outdoorColdUnderdressed}`)
console.log(`  overloaded (>92% cap) samples: ${overloadedTicks}`)
console.log(`  rest@hearth samples: ${hearthRestTicks}`)

console.log('\n── Biome presence (samples) ──')
const biomeEntries = Object.entries(biomeTicks).sort((a, b) => b[1] - a[1]).slice(0, 8)
for (const [name, n] of biomeEntries) console.log(`  ${name}: ${n}`)

const alive = state.villagers.filter((v) => v.alive).length
console.log(`\n── End pop ${alive} / deaths ${state.deaths} ──`)

const pass: string[] = []
const fail: string[] = []
if (meanClo >= 0.7) pass.push('mean clo ≥ 0.7')
else fail.push(`mean clo too low (${meanClo.toFixed(3)})`)
if (toolUseRate >= 0.55) pass.push('tool labor ≥ 55%')
else fail.push(`tool labor low (${(toolUseRate * 100).toFixed(1)}%)`)
if (cloSamples.naked / Math.max(1, cloN) < 0.25) pass.push('naked share < 25%')
else fail.push(`too many naked samples (${((100 * cloSamples.naked) / Math.max(1, cloN)).toFixed(1)}%)`)
if (coldDeathTotal === 0 || coldDeathsByClo.warm + coldDeathsByClo.heavy <= coldDeathsByClo.naked + coldDeathsByClo.light)
  pass.push('cold deaths skew toward low clo')
else fail.push('cold deaths hit warm/heavy gear too often')

console.log('\n── Verdict ──')
for (const p of pass) console.log(`  OK  ${p}`)
for (const f of fail) console.log(`  !!  ${f}`)
console.log(fail.length === 0 ? '\nPASS' : '\nNEEDS ATTENTION')

// ── Cold stress probe: strip half the living, park on coldest sampled tile, run 5 days ──
{
  console.log('\n── Cold stress probe (strip clo → expose) ──')
  let coldest = { x: 0, y: 0, t: 99, cold: 0 }
  for (let y = 0; y < state.grid.height; y += 20) {
    for (let x = 0; x < state.grid.width; x += 20) {
      const t = sampleTempC(state.climate, x, y)
      const c = Math.min(1, coldStress01(t) + biomeColdBias(sampleBiome(state.climate, x, y)))
      if (c > coldest.cold || (c === coldest.cold && t < coldest.t)) coldest = { x, y, t, cold: c }
    }
  }
  console.log(`  coldest probe tile (${coldest.x},${coldest.y}) T=${coldest.t.toFixed(1)}°C cold01=${coldest.cold.toFixed(2)}`)

  const living = state.villagers.filter((v) => v.alive)
  let stripped = 0
  let cloaked = 0
  for (let i = 0; i < living.length; i++) {
    const v = living[i]
    v.x = coldest.x + (i % 3)
    v.y = coldest.y + Math.floor(i / 3)
    // Stay exposed: no home pull, no embark.
    v.hasHome = false
    v.homeX = v.x
    v.homeY = v.y
    v.homeOwnerId = null
    v.embarked = false
    v.task = null
    v.savedTask = null
    v.hunger = 4
    v.starveTimer = 0
    v.health = 4
    const eq = ensureEquipment(v)
    if (i % 2 === 0) {
      eq.head = null
      eq.torso = null
      eq.outer = null
      eq.legs = null
      eq.feet = null
      eq.hands = null
      // Bag leather/clothing still counts as clo — strip those too.
      for (const slot of v.inventory) {
        if (slot.type === 'leather' || slot.type === 'clothing' || slot.type === 'wool' || slot.type === 'fur') {
          slot.type = null
          slot.count = 0
        }
      }
      stripped++
    } else {
      if (!eq.torso) eq.torso = 'wool_tunic'
      if (!eq.outer) eq.outer = 'fur_mantle'
      if (!eq.legs) eq.legs = 'wool_hose'
      if (!eq.feet) eq.feet = 'leather_boots'
      if (!eq.hands) eq.hands = 'wool_mittens'
      cloaked++
    }
  }

  // Neutralize local wolves so the probe measures cold, not predation.
  for (const w of state.wolves) {
    if (Math.hypot(w.x - coldest.x, w.y - coldest.y) < 40) {
      w.alive = false
      w.x = 0
      w.y = 0
    }
  }

  const beforeAlive = living.length
  const probeDays = 3
  const probeTicks = probeDays * TICKS_PER_DAY
  const deathsStripped = { n: 0 }
  const deathsCloaked = { n: 0 }
  const strippedIds = new Set(living.filter((_, i) => i % 2 === 0).map((v) => v.id))
  const pin = new Map(living.map((v, i) => [v.id, { x: coldest.x + (i % 3), y: coldest.y + Math.floor(i / 3) }]))
  // Log is a 120-line ring — clear so probe deaths aren't dropped before we read them.
  state.log.length = 0
  const probeLogs: string[] = []
  for (let t = 0; t < probeTicks; t++) {
    // Keep bags fed so the probe isolates hypothermia vs clo, not starve-from-burn.
    for (const v of state.villagers) {
      if (!v.alive) continue
      const p = pin.get(v.id)
      if (p) {
        v.x = p.x
        v.y = p.y
        v.hasHome = false
        v.homeX = p.x
        v.homeY = p.y
        v.embarked = false
      }
      v.hunger = Math.max(v.hunger, 3.5)
      v.starveTimer = 0
      v.stamina = Math.max(v.stamina, 2)
    }
    const logAt = state.log.length
    stepSimulation(state)
    for (let i = logAt; i < state.log.length; i++) {
      probeLogs.push(state.log[i])
      if (!/meurt de froid/i.test(state.log[i])) continue
      const name = villagerNameFromLog(state.log[i])
      const v = state.villagers.find((o) => o.name === name)
      if (v && strippedIds.has(v.id)) deathsStripped.n++
      else deathsCloaked.n++
    }
  }
  const afterAlive = state.villagers.filter((v) => v.alive).length
  console.log(`  stripped=${stripped} cloaked=${cloaked}`)
  console.log(`  cold deaths stripped=${deathsStripped.n} cloaked=${deathsCloaked.n}`)
  console.log(`  alive ${beforeAlive} → ${afterAlive}`)
  const coldLines = probeLogs.filter((l) => /froid|faim|maladie|loup|meurt|mort/i.test(l)).slice(0, 16)
  for (const l of coldLines) console.log(`    log] ${l}`)
  if (coldLines.length === 0 && probeLogs.length > 0) {
    console.log(`    (no death keywords; ${probeLogs.length} other log lines)`)
    for (const l of probeLogs.slice(0, 6)) console.log(`    log] ${l}`)
  }
  if (deathsStripped.n > deathsCloaked.n) console.log('  OK  stripped die of cold more than cloaked')
  else if (deathsStripped.n >= deathsCloaked.n && deathsStripped.n > 0)
    console.log('  OK  stripped die of cold at least as often as cloaked')
  else if (afterAlive < beforeAlive && deathsStripped.n === 0)
    console.log('  !!  deaths occurred but not logged as cold — check hunger/wolves')
  else console.log('  !!  cloaked died of cold more than stripped — clo insulation weak?')
}