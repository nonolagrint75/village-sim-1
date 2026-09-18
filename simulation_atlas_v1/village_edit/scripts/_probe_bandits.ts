/**
 * Probe: bandits must form and act by day 40+.
 * Also checks camps stay outside villages and do not teleport mid-raid.
 *   npx tsx scripts/_probe_bandits.ts [seed] [days]
 */
import { createSimulation, stepSimulation, computeStats } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import { BANDIT_START_DAY } from '../src/lib/sim/bandits'
import { distance } from '../src/lib/sim/world'

const seed = Number(process.argv[2] ?? 1)
const days = Number(process.argv[3] ?? Math.max(55, BANDIT_START_DAY + 20))
const ticks = days * TICKS_PER_DAY

console.log(`Bandit probe — seed=${seed} days=${days} startDay=${BANDIT_START_DAY}\n`)

const state = createSimulation(seed)
let firstBandTick = -1
let firstRaidLog = -1
let peakBandits = 0
let peakBands = 0
let stealLogs = 0
let raidLogs = 0
let lastLog = 0
let campTpMoves = 0
let campInsideVillage = 0
let outcastBands = 0
let vagabondBands = 0
const campAnchor = new Map<number, { x: number; y: number }>()

for (let t = 1; t <= ticks; t++) {
  stepSimulation(state)
  const alive = state.bandits.filter((b) => b.alive).length
  if (alive > peakBandits) peakBandits = alive
  if (state.bands.length > peakBands) peakBands = state.bands.length
  if (firstBandTick < 0 && state.bands.length > 0) firstBandTick = state.tick

  for (const band of state.bands) {
    if (band.origin === 'outcasts') outcastBands = Math.max(outcastBands, 1)
    if (band.origin === 'vagabonds') vagabondBands = Math.max(vagabondBands, 1)
    const prev = campAnchor.get(band.id)
    if (!prev) {
      campAnchor.set(band.id, { x: band.campX, y: band.campY })
    } else if (prev.x !== band.campX || prev.y !== band.campY) {
      // Allow one corrective relocate if somehow inside settlement; count large jumps as TP bugs.
      const jump = distance(prev.x, prev.y, band.campX, band.campY)
      if (jump > 8) campTpMoves++
      campAnchor.set(band.id, { x: band.campX, y: band.campY })
    }
    for (const vg of state.villages) {
      if (distance(band.campX, band.campY, vg.centerX, vg.centerY) < 20) campInsideVillage++
    }
  }

  if (state.log.length > lastLog) {
    for (let i = lastLog; i < state.log.length; i++) {
      const line = state.log[i]
      const low = line.toLowerCase()
      if (/bande|brigand|hors-la-loi|coupe-jarret|vagabonds|maquis|pillard|pille|dérobe|forc[eé].*enceinte|déserte/.test(low)) {
        if (firstRaidLog < 0 && /fond sur|pille|dérobe|forc/.test(low)) firstRaidLog = state.tick
        if (/fond sur|pillard/.test(low)) raidLogs++
        if (/dérobe|pille|vivres|butin/.test(low)) stealLogs++
        const day = Math.floor(state.tick / TICKS_PER_DAY)
        console.log(`  d${day} t${state.tick}] ${line}`)
      }
    }
    lastLog = state.log.length
  }

  if (t % (TICKS_PER_DAY * 5) === 0) {
    const s = computeStats(state)
    const day = Math.floor(s.tick / TICKS_PER_DAY)
    console.log(
      `day ${day}: pop=${s.villagers} bandits=${s.bandits} bands=${s.bands} raids=${state.bands.reduce((a, b) => a + b.raids, 0)} thefts=${s.thefts} deathsBandit=${s.deathsByBandit}`,
    )
  }
}

const s = computeStats(state)
const firstBandDay = firstBandTick < 0 ? null : Math.floor(firstBandTick / TICKS_PER_DAY)
console.log('\n── Summary ──')
console.log(`  first band day: ${firstBandDay}`)
console.log(`  peak bandits: ${peakBandits}`)
console.log(`  peak bands: ${peakBands}`)
console.log(`  final bandits/bands: ${s.bandits}/${s.bands}`)
console.log(`  origins seen: outcasts=${outcastBands} vagabonds=${vagabondBands}`)
console.log(`  camp TP jumps (>8): ${campTpMoves}`)
console.log(`  camp-inside-village ticks: ${campInsideVillage}`)
console.log(`  raid chronicle hits: ${raidLogs}`)
console.log(`  steal chronicle hits: ${stealLogs}`)
console.log(`  total band raids: ${state.bands.reduce((a, b) => a + b.raids, 0)}`)
console.log(`  thefts: ${s.thefts} deathsByBandit: ${s.deathsByBandit}`)

const ok =
  firstBandDay !== null &&
  firstBandDay >= BANDIT_START_DAY &&
  firstBandDay <= BANDIT_START_DAY + 14 &&
  peakBandits >= 2 &&
  peakBands >= 1 &&
  campTpMoves === 0 &&
  campInsideVillage === 0 &&
  (state.bands.some((b) => b.raids > 0) || stealLogs > 0 || raidLogs > 0)

console.log(ok ? '\nPASS — bandits emerge outside town; camps stay put' : '\nFAIL — bandits inactive or camp bugs')
process.exit(ok ? 0 : 1)
