/**
 * Agents 4+5 demography / genetics / families probe.
 *
 *   npx tsx scripts/_probe_demo_a45.ts [days] [seeds...]
 */
import { TICKS_PER_DAY, TICKS_PER_YEAR } from '../src/lib/sim/calendar'
import { createSimulation, stepSimulation, computeStats } from '../src/lib/sim/engine'
import { reconstructPedigree, fullNameOf, findGenealogy } from '../src/lib/sim/family'
import { kinshipCoefficient } from '../src/lib/sim/genetics'
import { edibleValue } from '../src/lib/sim/inventory'
import { MARRY_MIN_AGE, pedigreeLookup } from '../src/lib/sim/marriage'
import type { SimState, Villager } from '../src/lib/sim/types'

const days = Number(process.argv[2] ?? 180)
const seedArgs = process.argv.slice(3).map(Number).filter((n) => Number.isFinite(n))
const seeds = seedArgs.length > 0 ? seedArgs : [1, 3, 7, 11, 42]

type GateSnap = {
  day: number
  alive: number
  married: number
  ready: number
  readyPairsNear: number
  homes: number
  famine: boolean
  births: number
  deaths: number
}

function stock(v: Villager): number {
  return edibleValue(v.inventory) + (v.chestInventory ? edibleValue(v.chestInventory) : 0)
}

function isReady(v: Villager): boolean {
  return (
    v.alive &&
    v.hasHome &&
    v.age >= MARRY_MIN_AGE &&
    v.reproCooldown <= 0 &&
    v.hunger >= 2.0 &&
    stock(v) >= 0.5
  )
}

function dist(a: Villager, b: Villager): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

function sampleGates(state: SimState): GateSnap {
  const alive = state.villagers.filter((v) => v.alive)
  const ready = alive.filter(isReady)
  let readyPairsNear = 0
  for (let i = 0; i < ready.length; i++) {
    for (let j = i + 1; j < ready.length; j++) {
      const a = ready[i]!
      const b = ready[j]!
      if (dist(a, b) > 5.5) continue
      const bonded =
        (a.spouseId === b.id && b.spouseId === a.id) || (a.spouseId === null && b.spouseId === null)
      if (!bonded) continue
      readyPairsNear++
    }
  }
  return {
    day: Math.floor(state.tick / TICKS_PER_DAY),
    alive: alive.length,
    married: alive.filter((v) => v.spouseId !== null).length,
    ready: ready.length,
    readyPairsNear,
    homes: alive.filter((v) => v.hasHome).length,
    famine: state.famine,
    births: state.births,
    deaths: state.deaths,
  }
}

function generationDepth(state: SimState, v: Villager, memo = new Map<number, number>()): number {
  if (memo.has(v.id)) return memo.get(v.id)!
  if (!v.parentIds.length) {
    memo.set(v.id, 0)
    return 0
  }
  let d = 0
  for (const pid of v.parentIds) {
    const p = state.villagers.find((o) => o.id === pid)
    if (p) d = Math.max(d, 1 + generationDepth(state, p, memo))
    else d = Math.max(d, 1)
  }
  memo.set(v.id, d)
  return d
}

function analyzeLineage(state: SimState) {
  const withParents = state.villagers.filter((v) => v.parentIds.length > 0)
  let linkedOk = 0
  let brokenLink = 0
  let motherFatherMismatch = 0
  let noSurname = 0
  let hasSurname = 0
  let genomeOk = 0
  let maxGen = 0
  let multiGen = 0
  const samples: string[] = []
  const lookup = pedigreeLookup(state)

  for (const v of withParents) {
    const a = v.parentIds[0]
    const b = v.parentIds[1]
    const pa = a !== undefined ? state.villagers.find((o) => o.id === a) ?? null : null
    const pb = b !== undefined ? state.villagers.find((o) => o.id === b) ?? null : null
    const ga = a !== undefined ? findGenealogy(state, a) : undefined
    const gb = b !== undefined ? findGenealogy(state, b) : undefined
    if ((pa || ga) && (pb || gb)) linkedOk++
    else brokenLink++
    if (v.motherId !== a || v.fatherId !== b) motherFatherMismatch++
    if (v.surname) hasSurname++
    else noSurname++
    if (v.genome && v.genome.length === 40) genomeOk++
    const gen = generationDepth(state, v)
    maxGen = Math.max(maxGen, gen)
    if (gen >= 2) multiGen++
    if (samples.length < 8 && a !== undefined && b !== undefined) {
      const pNames = [
        pa ? fullNameOf(pa) : ga ? `${ga.givenName} ${ga.surname}` : `#${a}`,
        pb ? fullNameOf(pb) : gb ? `${gb.givenName} ${gb.surname}` : `#${b}`,
      ]
      const F = kinshipCoefficient(a, b, lookup)
      samples.push(
        `${fullNameOf(v)} age=${v.age} gen=${gen} parents=[${pNames.join(' x ')}] F=${F.toFixed(3)} lin=${v.lineageId} fam=${v.familyId}`,
      )
    }
  }

  let marriedKinBlocked = 0
  let marriedKinSoft = 0
  let marriedPairs = 0
  for (const v of state.villagers) {
    if (!v.alive || v.spouseId === null || v.id > v.spouseId) continue
    const s = state.villagers.find((o) => o.id === v.spouseId)
    if (!s || !s.alive) continue
    marriedPairs++
    const F = kinshipCoefficient(v.id, s.id, lookup)
    if (F >= 0.2) marriedKinBlocked++
    else if (F >= 0.08) marriedKinSoft++
  }

  const inheritLogs = state.log.filter((l) => l.includes('herite') || l.includes('heritage') || l.includes('hérite') || l.includes('héritage')).length
  const birthLogs = state.log.filter((l) => l.includes('est ne') || l.includes('est né') || l.includes('nait') || l.includes('naît')).length
  const deathLogs = state.log.filter((l) => l.includes('mort') || l.includes('succombe') || l.includes('meurt')).length

  const ages = state.villagers.filter((v) => v.alive).map((v) => v.age)
  ages.sort((a, b) => a - b)
  const ageYears = (t: number) => t / TICKS_PER_YEAR
  const medianAge = ages.length ? ages[Math.floor(ages.length / 2)]! : 0

  return {
    withParents: withParents.length,
    linkedOk,
    brokenLink,
    motherFatherMismatch,
    noSurname,
    hasSurname,
    genomeOk,
    maxGen,
    multiGen,
    marriedPairs,
    marriedKinBlocked,
    marriedKinSoft,
    inheritLogs,
    birthLogs,
    deathLogs,
    medianAgeTicks: medianAge,
    medianAgeYears: ageYears(medianAge),
    maxAgeYears: ages.length ? ageYears(ages[ages.length - 1]!) : 0,
    samples,
    lineages: state.lineages.length,
    families: state.families.length,
    genealogy: state.genealogy.length,
  }
}

function runSeed(seed: number) {
  const state = createSimulation(seed)
  const ticks = days * TICKS_PER_DAY
  const gates: GateSnap[] = []
  const wanted = [5, 15, 30, 60, 90, 120, 150, 180].filter((d) => d <= days)
  const remaining = new Set(wanted)

  for (let t = 1; t <= ticks; t++) {
    stepSimulation(state)
    const day = Math.floor(state.tick / TICKS_PER_DAY)
    if (remaining.has(day) && state.tick % TICKS_PER_DAY === 0) {
      gates.push(sampleGates(state))
      remaining.delete(day)
    }
  }

  const stats = computeStats(state)
  const lineage = analyzeLineage(state)
  const alive = state.villagers.filter((v) => v.alive)
  const children = alive.filter((v) => v.parentIds.length > 0)

  let bestPed: ReturnType<typeof reconstructPedigree> = []
  for (const v of children) {
    const ped = reconstructPedigree(state, v.id, 6)
    if (ped.length > bestPed.length) bestPed = ped
  }

  return {
    seed,
    days,
    pop: stats.villagers,
    births: stats.births,
    deaths: stats.deaths,
    famine: stats.famine,
    gates,
    lineage,
    childrenAlive: children.length,
    deepestPedigree: bestPed
      .map((n) => `d${n.depth}:${n.givenName} ${n.surname}#${n.id} p=[${n.parentIds}]`)
      .slice(0, 12),
  }
}

console.log(`A45 demography probe — days=${days} seeds=${seeds.join(',')}`)
const results = []
for (const seed of seeds) {
  const r = runSeed(seed)
  results.push(r)
  console.log(
    JSON.stringify({
      seed: r.seed,
      pop: r.pop,
      births: r.births,
      deaths: r.deaths,
      childrenAlive: r.childrenAlive,
      maxGen: r.lineage.maxGen,
      multiGen: r.lineage.multiGen,
      linkedOk: r.lineage.linkedOk,
      broken: r.lineage.brokenLink,
      mismatchMF: r.lineage.motherFatherMismatch,
      surnames: r.lineage.hasSurname,
      noSurname: r.lineage.noSurname,
      genomeOk: r.lineage.genomeOk,
      inheritLogs: r.lineage.inheritLogs,
      marriedKinBlocked: r.lineage.marriedKinBlocked,
      lineages: r.lineage.lineages,
      families: r.lineage.families,
      lastGate: r.gates[r.gates.length - 1],
      gate30: r.gates.find((g) => g.day === 30) ?? r.gates.find((g) => g.day >= 15),
    }),
  )
  if (r.lineage.samples.length) {
    console.log('  samples:')
    for (const s of r.lineage.samples) console.log('   ', s)
  }
  if (r.deepestPedigree.length) {
    console.log('  pedigree:', r.deepestPedigree.join(' | '))
  }
  console.log(
    '  gates:',
    r.gates
      .map((g) => `d${g.day}:a=${g.alive}/r=${g.ready}/p=${g.readyPairsNear}/b=${g.births}/f=${g.famine}`)
      .join(' ; '),
  )
}

const totalBirths = results.reduce((s, r) => s + r.births, 0)
console.log(
  JSON.stringify(
    {
      summary: {
        seeds: results.length,
        totalBirths,
        meanBirths: totalBirths / results.length,
        zeroBirthSeeds: results.filter((r) => r.births === 0).map((r) => r.seed),
        brokenAny: results.filter((r) => r.lineage.brokenLink > 0).map((r) => r.seed),
        multiGenAny: results.filter((r) => r.lineage.maxGen >= 2).map((r) => r.seed),
        meanPop: results.reduce((s, r) => s + r.pop, 0) / results.length,
      },
    },
    null,
    2,
  ),
)
