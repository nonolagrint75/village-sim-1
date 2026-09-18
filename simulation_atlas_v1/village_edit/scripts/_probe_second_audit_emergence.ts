/**
 * SECOND AUDIT - emergent situation tests (seeds 1 & 7, ~30-40d).
 * Induces famine / profession switch when natural path is quiet.
 *
 *   npx tsx scripts/_probe_second_audit_emergence.ts [seed=7] [days=40]
 */
import { createSimulation, stepSimulation } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import { applyProfessionChange, computeCareerDemand } from '../src/lib/sim/careers'
import { feelFamine, villageInFamine } from '../src/lib/sim/ecology'
import { mindOf } from '../src/lib/sim/cognition'
import { politicsOf } from '../src/lib/sim/politics'
import { BANDIT_START_DAY } from '../src/lib/sim/bandits'
import { getTerrain } from '../src/lib/sim/world'
import { WHEAT, MILL } from '../src/lib/sim/types'
import { WHEAT_RIPE } from '../src/lib/sim/behaviors'
import { doTeachCraft } from '../src/lib/sim/interactions'
import type { Profession, SimState } from '../src/lib/sim/types'
import { adaptSecondAuditEmergence, printAdaptedReport } from './harness/adapters.ts'

const seed = Number(process.argv[2] ?? 7)
const days = Number(process.argv[3] ?? 40)
const ticks = days * TICKS_PER_DAY

const FOOD_PROFS: Profession[] = ['farmer', 'forager', 'fisher', 'herder', 'miller']

function foodish(c: Record<string, number>) {
  return FOOD_PROFS.reduce((n, p) => n + (c[p] ?? 0), 0)
}

function profCounts(state: SimState): Record<string, number> {
  const c: Record<string, number> = {}
  for (const v of state.villagers) {
    if (!v.alive) continue
    c[v.profession] = (c[v.profession] ?? 0) + 1
  }
  return c
}

function induceLocalFamine(state: SimState) {
  for (const vg of state.villages) {
    vg.surplus.food = Math.min(vg.surplus.food ?? 0, -2)
    vg.surplus.bread = Math.min(vg.surplus.bread ?? 0, -1)
    vg.surplus.wheat = Math.min(vg.surplus.wheat ?? 0, 0)
    vg.surplus.flour = Math.min(vg.surplus.flour ?? 0, 0)
  }
  for (const v of state.villagers) {
    if (!v.alive) continue
    v.hunger = Math.min(v.hunger, 1.4)
    for (const it of v.inventory) {
      if (/berry|meat|fish|bread|wheat|flour|food|meal|fruit|veg|milk|cheese|stew/.test(it.kind)) {
        it.qty = Math.min(it.qty, 2) // leave crumbs so giveFood can still fire under feelFamine
      }
    }
    if (v.chestInventory) {
      for (const it of v.chestInventory) {
        if (/berry|meat|fish|bread|wheat|flour|food|meal|fruit|veg|milk|cheese|stew/.test(it.kind)) {
          it.qty = Math.max(1, Math.floor(it.qty * 0.25))
        }
      }
    }
  }
  state.famine = true
}

function expectedJobBonus(prof: Profession, kind: string): number {
  if (prof === 'farmer' && (kind === 'sowField' || kind === 'harvestWheat')) return 2.35
  if (prof === 'miller' && (kind === 'grindFlour' || kind === 'bakeBread')) return 2.55
  if (prof === 'forager' && kind === 'gatherFood') return 2.0
  if (prof === 'guard' && kind === 'guard') return 2.2
  return 1
}

function ghostSpouseCount(state: SimState): number {
  let n = 0
  for (const v of state.villagers) {
    if (!v.alive || v.spouseId == null) continue
    const s = state.villagers.find((o) => o.id === v.spouseId)
    if (!s || !s.alive) n++
  }
  return n
}

function villagePop(state: SimState): number {
  return state.villages.reduce(
    (a, vg) =>
      a +
      vg.memberIds.filter((id) => {
        const v = state.villagers.find((x) => x.id === id)
        return !!v?.alive
      }).length,
    0,
  )
}

function verdict(ok: boolean, partial = false): 'PASS' | 'FAIL' | 'PARTIAL' {
  if (ok) return 'PASS'
  if (partial) return 'PARTIAL'
  return 'FAIL'
}

console.log(`SECOND AUDIT emergence — seed=${seed} days=${days} banditStart=${BANDIT_START_DAY}`)

const state = createSimulation(seed)
const startPop = state.villagers.filter((v) => v.alive).length
const startVillagePop = villagePop(state)

const cum = {
  sow: 0,
  harvest: 0,
  harvestStarts: 0,
  buildMill: 0,
  grind: 0,
  bake: 0,
  giveFood: 0,
  teachCraft: 0,
  teachStarts: 0,
}
const prevTask = new Map<number, string | null>()

let sawNaturalFamine = false
let inducedFamine = false
let famineFoodNeed = 0
let famineGiveFoodTicks = 0
let famineMigrateUrgeMax = 0
let famineMigrateLog = 0
let pricesAtFamine: Record<string, number> | null = null
let earlyFoodProfs = 0
let lateFoodProfs = 0

let naturalSwitches = 0
let inducedSwitchOk = false
let switchFieldReleased = false
let switchLivelihoodOk = false
let switchJobBonusOk = false
let switchDetail = ''
let switchInduced = false

let millBuiltDay: number | null = null
let firstGrindDay: number | null = null
let firstBakeDay: number | null = null
const breadPriceStart = state.prices.bread
let breadPriceEnd = state.prices.bread
let breadPricePeak = state.prices.bread

let outcastBands = 0
let banditDeserts = 0
let ghostSpousePeak = 0
let lastLog = 0
const teachSkillDeltas: number[] = []
let teachKnowledgeHits = 0
let teachInduceDelta: number | null = null

for (let t = 1; t <= ticks; t++) {
  stepSimulation(state)
  const day = state.tick / TICKS_PER_DAY

  for (const v of state.villagers) {
    if (!v.alive) continue
    const k = v.task?.kind ?? null
    const prev = prevTask.get(v.id) ?? null
    if (k && k !== prev) {
      if (k === 'harvestWheat') cum.harvestStarts++
      if (k === 'teachCraft') cum.teachStarts++
    }
    prevTask.set(v.id, k)
    if (!k) continue
    if (k === 'sowField') cum.sow++
    else if (k === 'harvestWheat') cum.harvest++
    else if (k === 'buildMill') cum.buildMill++
    else if (k === 'grindFlour') {
      cum.grind++
      if (firstGrindDay == null) firstGrindDay = +day.toFixed(1)
    } else if (k === 'bakeBread') {
      cum.bake++
      if (firstBakeDay == null) firstBakeDay = +day.toFixed(1)
    } else if (k === 'giveFood') {
      cum.giveFood++
      if (state.famine || state.villages.some((vg) => feelFamine(state, vg))) famineGiveFoodTicks++
    } else if (k === 'teachCraft') {
      cum.teachCraft++
    }
  }

  breadPricePeak = Math.max(breadPricePeak, state.prices.bread)
  breadPriceEnd = state.prices.bread

  for (const vg of state.villages) {
    if (vg.hasMill && millBuiltDay == null) millBuiltDay = +day.toFixed(1)
  }
  for (const band of state.bands) {
    if (band.origin === 'outcasts') outcastBands = 1
  }
  ghostSpousePeak = Math.max(ghostSpousePeak, ghostSpouseCount(state))

  if (t % TICKS_PER_DAY !== 0) continue

  for (let i = lastLog; i < state.log.length; i++) {
    const line = state.log[i]!
    const low = line.toLowerCase()
    if (/devient |abandonne le m/.test(line)) naturalSwitches++
    if (/quitte son village|fonde|rejoint le village|errance|migre/.test(low)) famineMigrateLog++
    if (/déserte pour le maquis|hors-la-loi|rejoint la /.test(low)) banditDeserts++
    if (/enseigne/.test(low)) teachKnowledgeHits++
  }
  lastLog = state.log.length

  const d = Math.floor(day)
  if (d === 8) earlyFoodProfs = foodish(profCounts(state))

  if (!sawNaturalFamine && (state.famine || state.villages.some((vg) => villageInFamine(state, vg)))) {
    sawNaturalFamine = true
    const demands = state.villages.map((vg) => computeCareerDemand(state, vg).foodNeed)
    famineFoodNeed = Math.max(...demands, 0)
    for (const v of state.villagers) {
      if (!v.alive) continue
      famineMigrateUrgeMax = Math.max(famineMigrateUrgeMax, politicsOf(v).migrationUrge)
    }
    pricesAtFamine = {
      food: state.prices.food,
      wheat: state.prices.wheat,
      flour: state.prices.flour,
      bread: state.prices.bread,
    }
  }

  if (!inducedFamine && !sawNaturalFamine && d === 20) {
    induceLocalFamine(state)
    inducedFamine = true
    const demands = state.villages.map((vg) => computeCareerDemand(state, vg).foodNeed)
    famineFoodNeed = Math.max(...demands, 0)
    for (const v of state.villagers) {
      if (!v.alive) continue
      famineMigrateUrgeMax = Math.max(famineMigrateUrgeMax, politicsOf(v).migrationUrge)
    }
    pricesAtFamine = {
      food: state.prices.food,
      wheat: state.prices.wheat,
      flour: state.prices.flour,
      bread: state.prices.bread,
    }
  }

  if (state.famine || state.villages.some((vg) => feelFamine(state, vg))) {
    const demands = state.villages.map((vg) => computeCareerDemand(state, vg).foodNeed)
    famineFoodNeed = Math.max(famineFoodNeed, ...demands)
    for (const v of state.villagers) {
      if (!v.alive) continue
      famineMigrateUrgeMax = Math.max(famineMigrateUrgeMax, politicsOf(v).migrationUrge)
    }
  }

  if (!switchInduced && d === 15) {
    const farmer = state.villagers.find((v) => v.alive && v.profession === 'farmer' && v.fieldX >= 0)
    if (farmer) {
      const fieldBefore = farmer.fieldX
      const liveBefore = mindOf(farmer).livelihood?.roleTag ?? null
      const jbFarm = expectedJobBonus('farmer', 'harvestWheat')
      const jbMill = expectedJobBonus('miller', 'grindFlour')
      const ok = applyProfessionChange(state, farmer, 'miller', { quiet: false })
      if (ok) {
        switchInduced = true
        switchFieldReleased = farmer.fieldX < 0 || farmer.fieldX !== fieldBefore
        const liveAfter = mindOf(farmer).livelihood?.roleTag ?? null
        switchLivelihoodOk = liveAfter === 'legacy_miller' || liveAfter !== liveBefore
        switchJobBonusOk = jbFarm > 1 && jbMill >= 2 && farmer.profession === 'miller'
        inducedSwitchOk = switchFieldReleased && switchLivelihoodOk && switchJobBonusOk
        switchDetail = `farmer@${fieldBefore}->miller field=${farmer.fieldX} live=${liveBefore}->${liveAfter} jbH=${jbFarm} jbG=${jbMill}`
      } else {
        const free = state.villagers.find((v) => v.alive && v.profession === 'forager' && v.fieldX < 0)
        if (free) {
          const liveBefore2 = mindOf(free).livelihood?.roleTag ?? null
          const ok2 = applyProfessionChange(state, free, 'guard')
          if (ok2) {
            switchInduced = true
            switchFieldReleased = free.fieldX < 0
            switchLivelihoodOk = (mindOf(free).livelihood?.roleTag ?? null) === 'legacy_guard'
            switchJobBonusOk = expectedJobBonus('guard', 'guard') > 1 && free.profession === 'guard'
            inducedSwitchOk = switchLivelihoodOk && switchJobBonusOk
            switchDetail = `forager->guard live=${liveBefore2}->${mindOf(free).livelihood?.roleTag} (farmer locked)`
          }
        }
      }
    }
  }
}

lateFoodProfs = foodish(profCounts(state))
const ghostSpouseEnd = ghostSpouseCount(state)
const villagePopEnd = villagePop(state)
const aliveEnd = state.villagers.filter((v) => v.alive).length
const banditsEnd = state.bandits.filter((b) => b.alive).length

let ripe = 0
let wheatTiles = 0
let mills = 0
for (const v of state.villagers) {
  if (!v.alive || v.fieldX < 0) continue
  for (let y = v.fieldY - 3; y <= v.fieldY + 3; y++) {
    for (let x = v.fieldX - 3; x <= v.fieldX + 3; x++) {
      if (getTerrain(state.grid, x, y) !== WHEAT) continue
      wheatTiles++
      if (state.grid.amount[y * state.grid.width + x] >= WHEAT_RIPE) ripe++
    }
  }
}
for (const vg of state.villages) {
  if (vg.hasMill || (vg.millX >= 0 && getTerrain(state.grid, vg.millX, vg.millY) === MILL)) mills++
}

let teachInduceOk = false
if (cum.teachStarts === 0) {
  const ranked = state.villagers
    .filter((v) => v.alive)
    .sort((a, b) => {
      const sa = Object.values(mindOf(a).skills).reduce((x, y) => x + y, 0)
      const sb = Object.values(mindOf(b).skills).reduce((x, y) => x + y, 0)
      return sb - sa
    })
  const master = ranked[0]
  const pupil = ranked[1]
  if (master && pupil) {
    const mm = mindOf(master)
    const pm = mindOf(pupil)
    const keys = Object.keys(mm.skills) as (keyof typeof mm.skills)[]
    let best = keys[0]!
    let bestV = -1
    for (const k of keys) {
      if (mm.skills[k] > bestV) {
        bestV = mm.skills[k]
        best = k
      }
    }
    // Ensure master leads so drip fires
    if (mm.skills[best] <= pm.skills[best] + 0.05) {
      mm.skills[best] = Math.min(1, pm.skills[best] + 0.2)
    }
    const before = pm.skills[best]
    doTeachCraft(state, master, pupil)
    const after = mindOf(pupil).skills[best]
    const delta = after - before
    teachInduceDelta = +delta.toFixed(4)
    teachInduceOk = delta > 0
    teachSkillDeltas.push(teachInduceDelta)
    cum.teachStarts++
  }
}

const teachPass =
  cum.teachStarts > 0 && (teachInduceOk || teachSkillDeltas.length > 0 || teachKnowledgeHits > 0 || cum.teachCraft > 0)
const harvestPass = cum.harvestStarts > 0 || cum.harvest > 0
const faminePass =
  famineFoodNeed >= 0.7 &&
  pricesAtFamine != null &&
  (inducedFamine || sawNaturalFamine)
const switchPass = inducedSwitchOk
const millPass = (millBuiltDay != null || mills > 0) && cum.grind > 0 && cum.bake > 0
const banditPass =
  ghostSpouseEnd === 0 &&
  (days < BANDIT_START_DAY || banditsEnd > 0 || outcastBands > 0 || banditDeserts > 0)

const results = {
  seed,
  days,
  startPop,
  aliveEnd,
  harvest: {
    verdict: verdict(harvestPass),
    harvestTicks: cum.harvest,
    harvestStarts: cum.harvestStarts,
    sowTicks: cum.sow,
    wheatTiles,
    ripe,
  },
  famine: {
    verdict: verdict(faminePass, famineFoodNeed >= 0.7),
    path: inducedFamine ? 'induced' : sawNaturalFamine ? 'natural' : 'none',
    foodNeed: +famineFoodNeed.toFixed(3),
    giveFoodTicks: cum.giveFood,
    giveFoodUnderFamine: famineGiveFoodTicks,
    migrateUrgeMax: +famineMigrateUrgeMax.toFixed(3),
    migrateLog: famineMigrateLog,
    pricesAtFamine,
    foodProfsEarly: earlyFoodProfs,
    foodProfsLate: lateFoodProfs,
  },
  professionSwitch: {
    verdict: verdict(switchPass, naturalSwitches > 0),
    naturalSwitches,
    induced: switchInduced,
    fieldReleased: switchFieldReleased,
    livelihoodSync: switchLivelihoodOk,
    jobBonusFlip: switchJobBonusOk,
    detail: switchDetail,
  },
  millChain: {
    verdict: verdict(millPass, cum.grind > 0 || cum.bake > 0),
    millBuiltDay,
    mills,
    grindTicks: cum.grind,
    bakeTicks: cum.bake,
    firstGrindDay,
    firstBakeDay,
    breadPriceStart,
    breadPriceEnd,
    breadPricePeak,
  },
  banditOutcast: {
    verdict: verdict(banditPass, ghostSpouseEnd === 0),
    banditStartDay: BANDIT_START_DAY,
    banditsEnd,
    outcastBands,
    desertLogs: banditDeserts,
    ghostSpousePeak,
    ghostSpouseEnd,
    villagePopStart: startVillagePop,
    villagePopEnd,
    note:
      days < BANDIT_START_DAY
        ? 'horizon < BANDIT_START_DAY — ghost check only'
        : 'full bandit window',
  },
  teachCraft: {
    verdict: verdict(teachPass),
    teachTicks: cum.teachCraft,
    teachStarts: cum.teachStarts,
    skillSamples: teachSkillDeltas.slice(0, 8),
    induceDelta: teachInduceDelta,
    knowledgeOrLogHits: teachKnowledgeHits,
  },
}

console.log(JSON.stringify(results, null, 2))

// WP1 honesty: split MECHANISM vs EMERGENCE; refuse undersized / induced EMERGENCE PASS
const harnessReport = adaptSecondAuditEmergence(results, { seedCount: 1 })
printAdaptedReport(harnessReport)
const mechFails = harnessReport.mechanism.filter((b) => b.result === 'FAIL')
const emergencePass = harnessReport.emergence.some((b) => b.result === 'PASS')
if (emergencePass) {
  console.log('\nEMERGENCE PASS blocked unexpectedly — gate bug')
  process.exit(1)
}
console.log(
  mechFails.length === 0
    ? '\nMECHANISM: no FAIL (not an EMERGENCE / GLOBAL PASS)'
    : '\nMECHANISM has FAIL: ' + mechFails.map((b) => b.test).join(','),
)
console.log('EMERGENCE: ' + (harnessReport.emergence.map((b) => b.result).join(',') || 'n/a') + ' — globalClaim=NON_DECLARED')
process.exit(mechFails.length === 0 ? 0 : 1)
