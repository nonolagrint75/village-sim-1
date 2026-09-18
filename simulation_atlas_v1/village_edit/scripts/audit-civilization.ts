/**
 * Headless multi-seed civilization audit (30–90 days).
 *
 * Counts institutions, creeds/religion, castles/forts, bandit groups,
 * cleared forest, roads, halls, population growth, villages — and flags
 * systems that exist in code but never fire in-window.
 *
 *   npx tsx scripts/audit-civilization.ts
 *   npx tsx scripts/audit-civilization.ts --seeds 1,7,11,42 --days 90 --world 600
 *   npx tsx scripts/audit-civilization.ts --seed 7 --days 60
 */
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import { fortifyLabelFr } from '../src/lib/sim/construction'
import { createSimulation, stepSimulation, computeStats } from '../src/lib/sim/engine'
import { politicsOf, politicsSummary } from '../src/lib/sim/politics'
import { isReligionChronicleLine } from '../src/lib/sim/religion'
import {
  TREE,
  BUSH,
  PATH,
  ROAD,
  TRAIL,
  WALL_WOOD,
  WALL_STONE,
  type MapSizePreset,
  type SimState,
} from '../src/lib/sim/types'

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(name)
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1]!
  const pref = process.argv.find((a) => a.startsWith(`${name}=`))
  if (pref) return pref.slice(name.length + 1)
  return fallback
}

const days = Number(arg('--days', '90'))
const worldSize = Number(arg('--world', '600')) as MapSizePreset
const singleSeed = process.argv.includes('--seed') ? Number(arg('--seed', '1')) : null
const seeds = singleSeed !== null
  ? [singleSeed]
  : arg('--seeds', '1,3,7,11,42')
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n))
const checkpoints = [30, 60, 90].filter((d) => d <= days)
if (!checkpoints.includes(days)) checkpoints.push(days)

type Snap = {
  day: number
  pop: number
  births: number
  deaths: number
  villages: number
  institutions: number
  circles: number
  faithCircles: number
  creeds: number
  creedById: Record<string, number>
  shrines: number
  ritualsLogged: number
  religionLog: number
  bands: number
  bandits: number
  banditRaids: number
  deathsByBandit: number
  fortifyDone: number
  fortifyOpen: number
  fortLabels: string[]
  wallTiers: string[]
  wallTiles: number
  hallsDone: number
  hallsOpen: number
  treeTiles: number
  bushTiles: number
  treesClearedVsStart: number
  trail: number
  path: number
  road: number
  roadTilesStat: number
  polities: number
  chiefdoms: number
  kingdoms: number
  polityTiers: string[]
  guilds: number
  houses: number
  clearLandSamples: number
  buildWallSamples: number
  milestones: Record<string, boolean>
}

type SeedRun = {
  seed: number
  startPop: number
  startTrees: number
  startBush: number
  snaps: Snap[]
  end: Snap
  chronicle: {
    institution: number
    creed: number
    shrine: number
    ritual: number
    bandit: number
    fort: number
    hall: number
    road: number
    kingdom: number
    succession: number
    territory: number
    war: number
    guild: number
    clear: number
  }
  samples: string[]
  elapsedSec: number
}

function bump(map: Record<string, number>, key: string, n = 1) {
  map[key] = (map[key] ?? 0) + n
}

function countTerrain(state: SimState) {
  let tree = 0
  let bush = 0
  let trail = 0
  let path = 0
  let road = 0
  let wallW = 0
  let wallS = 0
  const t = state.grid.terrain
  for (let i = 0; i < t.length; i++) {
    const v = t[i]!
    if (v === TREE) tree++
    else if (v === BUSH) bush++
    else if (v === TRAIL) trail++
    else if (v === PATH) path++
    else if (v === ROAD) road++
    else if (v === WALL_WOOD) wallW++
    else if (v === WALL_STONE) wallS++
  }
  return { tree, bush, trail, path, road, wallTiles: wallW + wallS }
}

function snapshot(state: SimState, day: number, startTrees: number, startBush: number, samples: {
  clearLand: number
  buildWall: number
  ritualsLogged: number
  religionLog: number
}): Snap {
  const s = computeStats(state)
  const pol = politicsSummary(state)
  const terr = countTerrain(state)
  const creedById: Record<string, number> = {}
  let creeds = 0
  for (const v of state.villagers) {
    if (!v.alive) continue
    const c = politicsOf(v).creed
    if (c) {
      creeds++
      bump(creedById, c)
    }
  }
  const fortDone = state.projects.filter(
    (p) => p.phase === 'done' && p.intent.purposes.includes('fortify'),
  )
  const fortOpen = state.projects.filter(
    (p) => p.phase !== 'done' && p.intent.purposes.includes('fortify'),
  )
  const hallsDone = state.projects.filter(
    (p) => p.phase === 'done' && p.intent.purposes.includes('gather'),
  ).length
  const hallsOpen = state.projects.filter(
    (p) => p.phase !== 'done' && p.intent.purposes.includes('gather'),
  ).length
  const fortLabels = fortDone.map((p) => fortifyLabelFr(p.intent))
  const raids = (state.bands ?? []).reduce((a, b) => a + (b.raids ?? 0), 0)

  return {
    day,
    pop: s.villagers,
    births: s.births,
    deaths: s.deaths,
    villages: s.villages,
    institutions: pol.institutions,
    circles: pol.circles,
    faithCircles: state.circles.filter((c) => c.kind === 'faith').length,
    creeds,
    creedById,
    shrines: state.villages.filter((g) => g.hasShrine).length,
    ritualsLogged: samples.ritualsLogged,
    religionLog: samples.religionLog,
    bands: state.bands?.length ?? 0,
    bandits: s.bandits,
    banditRaids: raids,
    deathsByBandit: s.deathsByBandit,
    fortifyDone: fortDone.length,
    fortifyOpen: fortOpen.length,
    fortLabels,
    wallTiers: state.villages.map((v) => `${v.id}:${v.wallTier}`),
    wallTiles: terr.wallTiles || s.wallTiles,
    hallsDone,
    hallsOpen,
    treeTiles: terr.tree,
    bushTiles: terr.bush,
    treesClearedVsStart: Math.max(0, startTrees - terr.tree),
    trail: terr.trail,
    path: terr.path,
    road: terr.road,
    roadTilesStat: s.roadTiles,
    polities: pol.polities,
    chiefdoms: pol.chiefdoms,
    kingdoms: pol.kingdoms,
    polityTiers: pol.polityRows.map((r) => r.tier),
    guilds: state.circles.filter((c) => c.isGuild).length,
    houses: s.houses,
    clearLandSamples: samples.clearLand,
    buildWallSamples: samples.buildWall,
    milestones: { ...(state.milestones as unknown as Record<string, boolean>) },
  }
}

function scanLog(
  lines: string[],
  from: number,
  chron: SeedRun['chronicle'],
  samples: string[],
): { rituals: number; religion: number } {
  let rituals = 0
  let religion = 0
  for (let i = from; i < lines.length; i++) {
    const line = lines[i]!
    const low = line.toLowerCase()
    if (/devient une institution/.test(low)) chron.institution++
    if (isReligionChronicleLine(line)) {
      religion++
      chron.creed++
    }
    if (/autel|sanctuaire|shrine/.test(low)) chron.shrine++
    if (/rituel|rite |recueillement/.test(low)) {
      chron.ritual++
      rituals++
    }
    if (/bandit|brigand|hors-la-loi|pillard|razzia|bande /.test(low)) chron.bandit++
    if (/fort |forteresse|donjon|palissade|enceinte|citadelle|keep|rempart/.test(low)) chron.fort++
    if (/halle|place d'assemblée/.test(low)) chron.hall++
    if (/sentier|chemin|route|premier sentier|première route/.test(low)) chron.road++
    if (/royaume|chefferie|souverain|couronne/.test(low)) chron.kingdom++
    if (/succède|vide de pouvoir|contestation|rivalité entre/.test(low)) chron.succession++
    if (/territoire|frontière|conquête|absorbe/.test(low)) chron.territory++
    if (/guerre|belligér|civil.?war/.test(low)) chron.war++
    if (/guilde/.test(low) && /forme|émerge|naissance/.test(low)) chron.guild++
    if (/défrich|abatt|lisière|clairière/.test(low)) chron.clear++
    if (
      samples.length < 24 &&
      (/institution|creed|foi|brigand|fort|halle|chefferie|royaume|défrich|route|autel/.test(low))
    ) {
      samples.push(line)
    }
  }
  return { rituals, religion }
}

function runSeed(seed: number): SeedRun {
  const t0 = Date.now()
  const state = createSimulation(seed, { worldSize, seed })
  const startTerr = countTerrain(state)
  const startPop = state.villagers.filter((v) => v.alive).length
  const chron: SeedRun['chronicle'] = {
    institution: 0,
    creed: 0,
    shrine: 0,
    ritual: 0,
    bandit: 0,
    fort: 0,
    hall: 0,
    road: 0,
    kingdom: 0,
    succession: 0,
    territory: 0,
    war: 0,
    guild: 0,
    clear: 0,
  }
  const samples: string[] = []
  let lastLog = 0
  let clearLand = 0
  let buildWall = 0
  let ritualsLogged = 0
  let religionLog = 0
  const snaps: Snap[] = []
  const ticks = days * TICKS_PER_DAY
  const checkSet = new Set(checkpoints)

  for (let t = 1; t <= ticks; t++) {
    stepSimulation(state)
    if (t % 6 === 0) {
      for (const v of state.villagers) {
        if (!v.alive) continue
        const k = v.task?.kind
        if (k === 'clearLand') clearLand++
        if (k === 'buildWall') buildWall++
      }
    }
    if (t % TICKS_PER_DAY === 0) {
      const scanned = scanLog(state.log, lastLog, chron, samples)
      lastLog = state.log.length
      ritualsLogged += scanned.rituals
      religionLog += scanned.religion
      const day = t / TICKS_PER_DAY
      if (checkSet.has(day)) {
        snaps.push(
          snapshot(state, day, startTerr.tree, startTerr.bush, {
            clearLand,
            buildWall,
            ritualsLogged,
            religionLog,
          }),
        )
      }
    }
  }
  scanLog(state.log, lastLog, chron, samples)
  const end = snapshot(state, days, startTerr.tree, startTerr.bush, {
    clearLand,
    buildWall,
    ritualsLogged,
    religionLog,
  })
  if (!snaps.some((s) => s.day === days)) snaps.push(end)

  return {
    seed,
    startPop,
    startTrees: startTerr.tree,
    startBush: startTerr.bush,
    snaps,
    end,
    chronicle: chron,
    samples,
    elapsedSec: (Date.now() - t0) / 1000,
  }
}

/** Systems known to exist in code — evidence of "fire" comes from counts. */
const SYSTEM_CATALOG: { id: string; existsIn: string; fire: (r: SeedRun) => number; note?: string }[] = [
  {
    id: 'institutions',
    existsIn: 'politics.ts maybeInstitutionalize',
    fire: (r) => r.end.institutions + r.chronicle.institution,
  },
  {
    id: 'circles (politics)',
    existsIn: 'politics.ts tickCircles',
    fire: (r) => r.end.circles,
  },
  {
    id: 'creeds / religion',
    existsIn: 'religion.ts + politics crystallizeCreed',
    fire: (r) => r.end.creeds + r.chronicle.creed + (r.end.milestones.firstCreed ? 1 : 0),
  },
  {
    id: 'faith circles',
    existsIn: 'politics.ts faith circle spawn',
    fire: (r) => r.end.faithCircles,
  },
  {
    id: 'shrines / autels',
    existsIn: 'religion.ts ensureVillageShrine / build shrine',
    fire: (r) => r.end.shrines + (r.end.milestones.firstShrine ? 1 : 0),
  },
  {
    id: 'rituals',
    existsIn: 'religion.ts shrine rites',
    fire: (r) => r.chronicle.ritual + (r.end.milestones.firstRitual ? 1 : 0),
  },
  {
    id: 'bandit groups',
    existsIn: 'bandits.ts tryForm* (gate day 40)',
    fire: (r) => r.end.bands + r.end.bandits + (r.end.milestones.firstBandits ? 1 : 0),
  },
  {
    id: 'bandit raids',
    existsIn: 'bandits.ts startRaid',
    fire: (r) => r.end.banditRaids + r.chronicle.bandit,
  },
  {
    id: 'fortify / castles',
    existsIn: 'construction fortify + politics enqueue',
    fire: (r) => r.end.fortifyDone + r.end.fortifyOpen + r.chronicle.fort,
  },
  {
    id: 'village wallTier wood/stone',
    existsIn: 'construction applyFortifyCompletion',
    fire: (r) => r.end.wallTiers.filter((t) => !t.endsWith(':none')).length,
  },
  {
    id: 'halls (gather purpose)',
    existsIn: 'politics / buildHooks gather→halle',
    fire: (r) => r.end.hallsDone + r.end.hallsOpen + r.chronicle.hall,
  },
  {
    id: 'forest clearing (TREE loss / clearLand)',
    existsIn: 'construction clear phase + clearLand task',
    fire: (r) => r.end.treesClearedVsStart + r.end.clearLandSamples,
  },
  {
    id: 'roads (trail/path/road)',
    existsIn: 'roads.ts + behaviors wear',
    fire: (r) => r.end.trail + r.end.path + r.end.road + r.end.roadTilesStat,
  },
  {
    id: 'polities substrate',
    existsIn: 'politics.ts tickPolities',
    fire: (r) => r.end.polities,
  },
  {
    id: 'chiefdoms',
    existsIn: 'politics.ts desiredTier→chiefdom',
    fire: (r) => r.end.chiefdoms,
  },
  {
    id: 'kingdoms',
    existsIn: 'politics.ts desiredTier→kingdom',
    fire: (r) => r.end.kingdoms,
  },
  {
    id: 'succession / authority contest',
    existsIn: 'politics.ts setPolityRuler / challengers',
    fire: (r) => r.chronicle.succession,
  },
  {
    id: 'territory / absorption',
    existsIn: 'politics.ts claimRadius / absorb',
    fire: (r) => r.chronicle.territory,
  },
  {
    id: 'civil war (deferred soft)',
    existsIn: 'politics.ts comment: deferred',
    fire: (r) => r.chronicle.war,
    note: 'explicitly soft/deferred — confront bias only',
  },
  {
    id: 'guilds',
    existsIn: 'politics.ts promoteToGuild',
    fire: (r) => r.end.guilds + r.chronicle.guild,
  },
  {
    id: 'population growth (births)',
    existsIn: 'family / marriage births',
    fire: (r) => r.end.births,
  },
  {
    id: 'multi-village founding',
    existsIn: 'engine village spawn',
    fire: (r) => Math.max(0, r.end.villages - 1),
  },
]

function status(n: number): 'FIRES' | 'RARE' | 'NEVER' {
  if (n >= 5) return 'FIRES'
  if (n > 0) return 'RARE'
  return 'NEVER'
}

function fmtSnap(s: Snap): string {
  return [
    `d${s.day}`,
    `pop ${s.pop}(+${s.births}/-${s.deaths})`,
    `vg ${s.villages}`,
    `inst ${s.institutions}`,
    `creed ${s.creeds}`,
    `faith ${s.faithCircles}`,
    `shrine ${s.shrines}`,
    `bands ${s.bands}/${s.bandits}`,
    `fort ${s.fortifyDone}o${s.fortifyOpen}`,
    `hall ${s.hallsDone}`,
    `Δtree -${s.treesClearedVsStart}`,
    `way t${s.trail}/p${s.path}/r${s.road}`,
    `pol ${s.polities} ch${s.chiefdoms} k${s.kingdoms}`,
  ].join(' | ')
}

console.log(
  `Civilization audit — seeds=[${seeds.join(',')}] days=${days} world=${worldSize} checkpoints=[${checkpoints.join(',')}]\n`,
)

const runs: SeedRun[] = []
for (const seed of seeds) {
  process.stdout.write(`… seed ${seed} `)
  const r = runSeed(seed)
  runs.push(r)
  console.log(
    `done ${r.elapsedSec.toFixed(0)}s | end pop ${r.end.pop} inst ${r.end.institutions} creed ${r.end.creeds} bands ${r.end.bands} fort ${r.end.fortifyDone} Δtree ${r.end.treesClearedVsStart} roads ${r.end.path + r.end.road}`,
  )
}

// Aggregate
const agg = {
  seeds: runs.length,
  days,
  worldSize,
  popGrowth: runs.map((r) => r.end.pop - r.startPop),
  institutionsEnd: runs.map((r) => r.end.institutions),
  creedsEnd: runs.map((r) => r.end.creeds),
  faithEnd: runs.map((r) => r.end.faithCircles),
  shrinesEnd: runs.map((r) => r.end.shrines),
  bandsEnd: runs.map((r) => r.end.bands),
  banditsEnd: runs.map((r) => r.end.bandits),
  fortDone: runs.map((r) => r.end.fortifyDone),
  hallsDone: runs.map((r) => r.end.hallsDone),
  treesCleared: runs.map((r) => r.end.treesClearedVsStart),
  pathRoad: runs.map((r) => r.end.path + r.end.road),
  villages: runs.map((r) => r.end.villages),
  chiefdoms: runs.map((r) => r.end.chiefdoms),
  kingdoms: runs.map((r) => r.end.kingdoms),
  births: runs.map((r) => r.end.births),
}

function mean(xs: number[]) {
  return xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length)
}

const systemRows = SYSTEM_CATALOG.map((sys) => {
  const perSeed = runs.map((r) => sys.fire(r))
  const total = perSeed.reduce((a, b) => a + b, 0)
  const seedsFiring = perSeed.filter((n) => n > 0).length
  return {
    id: sys.id,
    existsIn: sys.existsIn,
    note: sys.note ?? '',
    total,
    seedsFiring,
    perSeed,
    status: status(total),
  }
})

const never = systemRows.filter((r) => r.status === 'NEVER')
const rare = systemRows.filter((r) => r.status === 'RARE')
const fires = systemRows.filter((r) => r.status === 'FIRES')

const lines: string[] = []
const out = (s = '') => {
  lines.push(s)
  console.log(s)
}

out('=== CIVILIZATION AUDIT REPORT ===')
out(`seeds ${seeds.join(',')} | ${days} days | world ${worldSize}×${worldSize}`)
out(`mean elapsed ${(mean(runs.map((r) => r.elapsedSec))).toFixed(0)}s/seed`)
out('')
out('── Per-seed checkpoints ──')
for (const r of runs) {
  out(`\n[seed ${r.seed}] startPop=${r.startPop} startTrees=${r.startTrees}`)
  for (const s of r.snaps) out(`  ${fmtSnap(s)}`)
  out(
    `  walls ${r.end.wallTiers.join(' ')} | forts [${r.end.fortLabels.join(', ') || '—'}] | creedIds ${JSON.stringify(r.end.creedById)}`,
  )
  out(
    `  chronicle inst=${r.chronicle.institution} creed=${r.chronicle.creed} bandit=${r.chronicle.bandit} fort=${r.chronicle.fort} hall=${r.chronicle.hall} kingdom=${r.chronicle.kingdom} succession=${r.chronicle.succession} territory=${r.chronicle.territory} road=${r.chronicle.road} clear=${r.chronicle.clear}`,
  )
  if (r.samples.length) {
    out('  samples:')
    for (const s of r.samples.slice(0, 8)) out(`    · ${s}`)
  }
}

out('\n── Aggregate (end of run) ──')
out(
  `popΔ mean ${mean(agg.popGrowth).toFixed(1)} [${agg.popGrowth.join(',')}] | births mean ${mean(agg.births).toFixed(1)}`,
)
out(
  `institutions mean ${mean(agg.institutionsEnd).toFixed(1)} | creeds ${mean(agg.creedsEnd).toFixed(1)} | faith ${mean(agg.faithEnd).toFixed(1)} | shrines ${mean(agg.shrinesEnd).toFixed(1)}`,
)
out(
  `bands mean ${mean(agg.bandsEnd).toFixed(1)} (bandits ${mean(agg.banditsEnd).toFixed(1)}) | forts done ${mean(agg.fortDone).toFixed(1)} | halls ${mean(agg.hallsDone).toFixed(1)}`,
)
out(
  `trees cleared mean ${mean(agg.treesCleared).toFixed(0)} | path+road mean ${mean(agg.pathRoad).toFixed(0)} | villages mean ${mean(agg.villages).toFixed(1)}`,
)
out(`chiefdoms mean ${mean(agg.chiefdoms).toFixed(1)} | kingdoms mean ${mean(agg.kingdoms).toFixed(1)}`)

out('\n── Systems: EXIST in code vs FIRE in 30–90d window ──')
out(`${'STATUS'.padEnd(7)} | ${'SYSTEM'.padEnd(42)} | seedsHit | evidence`)
for (const row of systemRows) {
  out(
    `${row.status.padEnd(7)} | ${row.id.padEnd(42)} | ${String(row.seedsFiring).padStart(2)}/${runs.length} | total=${row.total}${row.note ? ` (${row.note})` : ''}`,
  )
}

out('\n── NEVER FIRE (coded but invisible in this window) ──')
if (never.length === 0) out('(none)')
else for (const n of never) out(`  • ${n.id} — ${n.existsIn}${n.note ? ` — ${n.note}` : ''}`)

out('\n── RARE (fires on ≤ few events) ──')
if (rare.length === 0) out('(none)')
else for (const n of rare) out(`  • ${n.id} — perSeed=[${n.perSeed.join(',')}]`)

out('\n── Verdict ──')
const feelBlockers = never.map((n) => n.id)
const weak = [
  ...never.map((n) => n.id),
  ...rare.filter((r) => r.seedsFiring < runs.length / 2).map((r) => r.id),
]
out(
  `Civilization feel gaps: ${weak.length ? weak.join('; ') : 'none flagged'}.`,
)
out(
  `FIRES=${fires.length} RARE=${rare.length} NEVER=${never.length}. Bandits gated to day ${40}+; creeds need piety/sacred thresholds.`,
)

const reportPath = resolve(
  process.cwd(),
  `scripts/_civ_audit_report_d${days}_w${worldSize}.txt`,
)
const jsonPath = resolve(
  process.cwd(),
  `scripts/_civ_audit_report_d${days}_w${worldSize}.json`,
)
writeFileSync(reportPath, lines.join('\n'), 'utf8')
writeFileSync(
  jsonPath,
  JSON.stringify({ agg, systemRows, runs: runs.map((r) => ({ ...r, samples: r.samples.slice(0, 12) })) }, null, 2),
  'utf8',
)
out(`\nWrote ${reportPath}`)
out(`Wrote ${jsonPath}`)
