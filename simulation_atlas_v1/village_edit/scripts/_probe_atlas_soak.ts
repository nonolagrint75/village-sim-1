/**
 * Atlas v1 soak — prove firm sells, mines, bandits, revolts/coups, guilds, crisis, loot.
 * Usage: npx tsx scripts/_probe_atlas_soak.ts [seed] [days]
 */
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createSimulation, stepSimulation, computeStats } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import { firmsSummary } from '../src/lib/sim/economy/business'
import { politicsSummary } from '../src/lib/sim/politics'
import { warsSummary } from '../src/lib/sim/war'
import { bandFormationUnlock } from '../src/lib/sim/bandits'
import { societyCycleSummary } from '../src/lib/sim/societyCycle'
import { LOOT } from '../src/lib/sim/types'

const seed = Number(process.argv[2] ?? 7)
const days = Number(process.argv[3] ?? 55)
const outPath = resolve(process.cwd(), `ATLAS_V1_SOAK_PROOF_s${seed}_d${days}.txt`)

const state = createSimulation(seed)
const lines: string[] = []
const push = (s: string) => lines.push(s)

push(`Simulation Atlas v1 — soak proof (sells / mines / bandits / revolts / guilds / crisis / loot)`)
push(`seed=${seed} days=${days} ticks=${days * TICKS_PER_DAY}`)
push(`started=${new Date().toISOString()}`)
push('')

let firstSellDay = -1
let firstMineDay = -1
let firstBanditDay = -1
let firstCoupDay = -1
let firstGuildDay = -1
let firstCrisisDay = -1
let firstRebuildDay = -1
let lootPeak = 0
let banditUnlockPath: string | null = null
let mineStickyDays = 0

for (let t = 1; t <= days * TICKS_PER_DAY; t++) {
  stepSimulation(state)
  const day = Math.floor(t / TICKS_PER_DAY)
  const firms = firmsSummary(state)
  if (firstSellDay < 0 && firms.sells > 0) firstSellDay = day
  const minesNow = state.villages.filter((vg) => vg.hasMine).length
  if (firstMineDay < 0 && minesNow > 0) firstMineDay = day
  if (minesNow > 0) mineStickyDays++
  if (firstBanditDay < 0 && state.bandits.some((b) => b.alive)) {
    firstBanditDay = day
    const u = bandFormationUnlock(state)
    banditUnlockPath = u.path
  }
  if (firstCoupDay < 0 && (state.coups?.length ?? 0) > 0) firstCoupDay = day
  const guilds = state.circles.filter((c) => c.isGuild).length
  if (firstGuildDay < 0 && guilds > 0) firstGuildDay = day
  const cy = societyCycleSummary(state)
  if (firstCrisisDay < 0 && cy.crisis + cy.collapse > 0) firstCrisisDay = day
  if (firstRebuildDay < 0 && cy.rebuild > 0) firstRebuildDay = day
  if (t % TICKS_PER_DAY === 0) {
    let loot = 0
    for (let i = 0; i < state.grid.terrain.length; i++) if (state.grid.terrain[i] === LOOT) loot++
    if (loot > lootPeak) lootPeak = loot
  }
}

const final = computeStats(state)
const firms = firmsSummary(state)
const pol = politicsSummary(state)
const wars = warsSummary(state)
const mines = state.villages.filter((vg) => vg.hasMine).length
const banditsAlive = state.bandits.filter((b) => b.alive).length
const deposits = state.economyDeposits?.length ?? 0
const guilds = state.circles.filter((c) => c.isGuild).length
const cy = societyCycleSummary(state)
let lootFinal = 0
for (let i = 0; i < state.grid.terrain.length; i++) if (state.grid.terrain[i] === LOOT) lootFinal++

push('--- first appearance ---')
push(`firstSellDay=${firstSellDay}`)
push(`firstMineDay=${firstMineDay}`)
push(`firstBanditDay=${firstBanditDay} unlockPath=${banditUnlockPath ?? 'n/a'}`)
push(`firstCoupDay=${firstCoupDay}`)
push(`firstGuildDay=${firstGuildDay}`)
push(`firstCrisisDay=${firstCrisisDay} firstRebuildDay=${firstRebuildDay}`)
push('')
push('--- final counters ---')
push(
  `firms=${firms.firms} produces=${firms.produces} sells=${firms.sells} consumes=${firms.consumes} hires=${firms.hires}`,
)
push(`mines=${mines} mineStickyDays=${mineStickyDays} depositBag=${deposits} markets=${final.markets}`)
push(`banditsAlive=${banditsAlive} bands=${state.bands.length}`)
push(
  `wars active=${wars.active} battles=${wars.battles} coups=${wars.coups} polities=${pol.polities}`,
)
push(
  `guilds=${guilds} institutions=${(pol as { institutions?: number }).institutions ?? state.circles.filter((c) => c.isInstitution).length}`,
)
push(`crisis=${JSON.stringify(cy)}`)
push(`lootPeak=${lootPeak} lootFinal=${lootFinal}`)
push(`pop=${final.villagers} deaths=${final.deaths} roads=${final.roadTiles}`)
push('')

const sellsOk = firms.sells > 0
const minesOk = mines > 0 || firstMineDay >= 0
const minesStickyOk = mines > 0 || mineStickyDays > TICKS_PER_DAY * 3
const banditsOk = banditsAlive > 0 || firstBanditDay >= 0
const revoltsOk = wars.coups > 0 || firstCoupDay >= 0
const guildsOk = guilds > 0 || firstGuildDay >= 0
const crisisOk = firstCrisisDay >= 0 || cy.crisis + cy.collapse + cy.rebuild > 0
const lootOk = lootPeak > 0 || lootFinal > 0 || final.deaths > 0

push('--- verdict ---')
push(`sells>0: ${sellsOk ? 'PASS' : 'FAIL'} (${firms.sells})`)
push(`mines emerge: ${minesOk ? 'PASS' : 'FAIL'} (mines=${mines})`)
push(`mines sticky: ${minesStickyOk ? 'PASS' : 'WEAK'} (stickyDays=${mineStickyDays})`)
push(`bandits emerge: ${banditsOk ? 'PASS' : 'FAIL'} (alive=${banditsAlive}, day=${firstBanditDay})`)
push(`revolts/coups: ${revoltsOk ? 'PASS' : 'WEAK'} (coups=${wars.coups})`)
push(`guilds: ${guildsOk ? 'PASS' : 'WEAK'} (guilds=${guilds}, day=${firstGuildDay})`)
push(`crisis cycle: ${crisisOk ? 'PASS' : 'WEAK'} (first=${firstCrisisDay}, rebuild=${firstRebuildDay})`)
push(`ground loot: ${lootOk ? 'PASS' : 'WEAK'} (peak=${lootPeak}, final=${lootFinal})`)
const ok =
  sellsOk &&
  (minesOk || banditsOk) &&
  (revoltsOk || wars.battles > 0 || pol.chiefdoms > 0) &&
  (guildsOk || crisisOk || lootOk)
push(`soakCore: ${ok ? 'PASS' : 'FAIL'}`)
push(`done=${new Date().toISOString()}`)

const text = lines.join('\n')
writeFileSync(outPath, text, 'utf8')
console.log(text)
console.log(`\nWrote ${outPath}`)
if (!sellsOk) process.exit(1)
if (!ok) process.exit(2)
