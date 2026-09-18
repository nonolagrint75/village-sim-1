/**
 * Lot 3D / nono_simu_2d -- multi-seed long-run emergence harness.
 *
 * Measures real-action counters only (emergenceMetrics note* hooks).
 * Prior baseline: `_lot3d_emergence_report.json` (seed 7 x 10k).
 *
 * Usage:
 *   npx tsx scripts/_probe_emergence_master.ts
 *   npx tsx scripts/_probe_emergence_master.ts --horizons=200,500 --seeds=7,42
 *   npx tsx scripts/_probe_emergence_master.ts --repro --seed=7 --horizons=500
 *   npx tsx scripts/_probe_emergence_master.ts --diverge --horizons=500 --seeds=7
 *
 * See emergence_protocol.md
 */
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { createSimulation, stepSimulation, computeStats } from '../src/lib/sim/engine'
import {
  snapshotEmergence,
  baselineRowFromSnap,
  formatEmergenceBaselineTable,
  compareEmergenceRepro,
  fingerprintEmergence,
  type EmergenceBaselineRow,
  type EmergenceSnapshot,
} from '../src/lib/sim/build/emergenceMetrics'
import type { SimState } from '../src/lib/sim/types'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, '_emergence_master_report.json')
const PRIOR_BASELINE = path.join(ROOT, '_lot3d_emergence_report.json')
const SELF = fileURLToPath(import.meta.url)

/** Same footprint as `_probe_lot3d_emergence.ts` so seed-7 rows stay comparable. */
const BASE_CONFIG = {
  initialVillagers: 36,
  maxPopulation: 80,
  worldSize: 600 as const,
  preset: 'standard' as const,
  wolfCount: 3,
}

/**
 * Divergence causal knob (documented in emergence_protocol.md):
 * wolfCount -- predator pressure only; no gameplay rewrite.
 * Baseline lot3d / standard uses 3; diverge mode uses 7 (harsh-like).
 */
const DIVERGE_WOLF_COUNT = 7

const DEFAULT_SEEDS = [7, 42, 100, 999]
const DEFAULT_HORIZONS = [1000, 5000, 10000]

type Cli = {
  seeds: number[]
  horizons: number[]
  repro: boolean
  diverge: boolean
  dumpOnce: boolean
  seed: number
  out: string
}

function parseCli(argv: string[]): Cli {
  const flags = new Map<string, string>()
  const positionals: string[] = []
  for (const a of argv) {
    if (a.startsWith('--')) {
      const eq = a.indexOf('=')
      if (eq >= 0) flags.set(a.slice(2, eq), a.slice(eq + 1))
      else flags.set(a.slice(2), 'true')
    } else positionals.push(a)
  }
  const parseList = (raw: string | undefined, fallback: number[]) => {
    if (!raw) return fallback
    return raw
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0)
  }
  const repro = flags.get('repro') === 'true'
  const diverge = flags.get('diverge') === 'true'
  const dumpOnce = flags.get('dump-once') === 'true'
  const seeds = parseList(flags.get('seeds'), DEFAULT_SEEDS)
  const horizons = parseList(flags.get('horizons'), DEFAULT_HORIZONS).sort((a, b) => a - b)
  const seed = Number(flags.get('seed') ?? positionals[0] ?? seeds[0] ?? 7)
  return {
    seeds: repro || dumpOnce ? [seed] : seeds,
    horizons,
    repro,
    diverge,
    dumpOnce,
    seed,
    out: flags.get('out') ?? OUT,
  }
}

type HorizonSnap = EmergenceSnapshot & {
  label: string
  villages: number
  deaths: number
  fingerprint: string
}

function snapAt(state: SimState, label: string): HorizonSnap {
  const e = snapshotEmergence(state)
  const s = computeStats(state)
  const deaths = state.deaths ?? 0
  const villages = s.villages
  return {
    label,
    ...e,
    villages,
    deaths,
    fingerprint: fingerprintEmergence({ ...e, deaths, villages }),
  }
}

type RunResult = {
  seed: number
  config: typeof BASE_CONFIG
  elapsedMs: number
  series: HorizonSnap[]
  final: HorizonSnap
}

function runOne(seed: number, horizons: number[], config: typeof BASE_CONFIG): RunResult {
  const t0 = Date.now()
  const state = createSimulation(seed, { ...config })
  const series: HorizonSnap[] = []
  let nextH = 0
  const maxTick = horizons[horizons.length - 1]!

  while (state.tick < maxTick) {
    stepSimulation(state)
    if (nextH < horizons.length && state.tick >= horizons[nextH]!) {
      const row = snapAt(state, `t${horizons[nextH]}`)
      series.push(row)
      if (!process.env.EMERGENCE_DUMP_QUIET) {
        console.log(
          `  seed=${seed} ${row.label} alive=${row.npcsAlive} blocks=${row.blocksBuilt} WO_ok=${row.completedWorkOrders} fp=${row.fingerprint}`,
        )
      }
      nextH++
    }
  }
  const final = series[series.length - 1]!
  return { seed, config, elapsedMs: Date.now() - t0, series, final }
}

function loadPriorSeed7Hint(): unknown {
  if (!fs.existsSync(PRIOR_BASELINE)) return null
  try {
    const j = JSON.parse(fs.readFileSync(PRIOR_BASELINE, 'utf8')) as {
      seed: number
      final?: {
        blocksBuilt?: number
        homesCompleted?: number
        completedWorkOrders?: number
        taskSwitches?: number
      }
      ticks?: number
    }
    return {
      path: '_lot3d_emergence_report.json',
      seed: j.seed,
      ticks: j.ticks,
      finalBlocksBuilt: j.final?.blocksBuilt ?? null,
      finalHomesCompleted: j.final?.homesCompleted ?? null,
      finalWoCompleted: j.final?.completedWorkOrders ?? null,
      finalTaskSwitches: j.final?.taskSwitches ?? null,
      note: 'Prior single-seed baseline (seed 7 @ 10k). Master rows use the same createSimulation footprint.',
    }
  } catch {
    return { path: '_lot3d_emergence_report.json', error: 'parse_failed' }
  }
}

function rowsAtHorizon(runs: RunResult[], tick: number): EmergenceBaselineRow[] {
  const rows: EmergenceBaselineRow[] = []
  for (const run of runs) {
    const h = run.series.find((s) => s.tick === tick) ?? run.final
    rows.push(baselineRowFromSnap(run.seed, h, { deaths: h.deaths, villages: h.villages }))
  }
  return rows
}

/** Fresh process per trial so module globals cannot bleed across runs. */
function runIsolatedDump(seed: number, horizons: number[], config: typeof BASE_CONFIG): RunResult {
  const dumpPath = path.join(
    ROOT,
    `_emergence_dump_${process.pid}_${Date.now()}_${Math.random().toString(16).slice(2)}.json`,
  )
  const args = [
    SELF,
    '--dump-once',
    `--seed=${seed}`,
    `--horizons=${horizons.join(',')}`,
    `--out=${dumpPath}`,
  ]
  if (config.wolfCount !== BASE_CONFIG.wolfCount) {
    args.push(`--wolf-count=${config.wolfCount}`)
  }
  const r = spawnSync(process.execPath, ['--import', 'tsx', ...args], {
    cwd: ROOT,
    env: { ...process.env, EMERGENCE_DUMP_QUIET: '1' },
    encoding: 'utf8',
  })
  if (r.status !== 0) {
    throw new Error(`isolated dump failed status=${r.status}\n${r.stderr || r.stdout}`)
  }
  const parsed = JSON.parse(fs.readFileSync(dumpPath, 'utf8')) as RunResult
  try {
    fs.unlinkSync(dumpPath)
  } catch {
    /* ignore */
  }
  return parsed
}

type Report = {
  mode: 'multi' | 'repro' | 'diverge' | 'dump'
  horizons: number[]
  baseConfig: typeof BASE_CONFIG
  divergeKnob?: { name: string; baseline: number; alternate: number; rationale: string }
  priorBaseline: unknown
  runs: RunResult[]
  tables: Record<string, string>
  repro?: ReturnType<typeof compareEmergenceRepro> & {
    seed: number
    tick: number
    isolatedProcesses: boolean
  }
  divergeCompare?: {
    seed: number
    tick: number
    baseline: EmergenceBaselineRow
    alternate: EmergenceBaselineRow
    sameFingerprint: boolean
  }[]
}

const cli = parseCli(process.argv.slice(2))
const wolfOverride = (() => {
  const raw = process.argv.find((a) => a.startsWith('--wolf-count='))
  if (!raw) return null
  const n = Number(raw.slice('--wolf-count='.length))
  return Number.isFinite(n) ? n : null
})()
const activeConfig = wolfOverride == null ? BASE_CONFIG : { ...BASE_CONFIG, wolfCount: wolfOverride }

if (!cli.dumpOnce) {
  console.log(
    `Emergence master seeds=${cli.seeds.join(',')} horizons=${cli.horizons.join(',')} repro=${cli.repro} diverge=${cli.diverge}`,
  )
}

const priorHint = cli.dumpOnce ? null : loadPriorSeed7Hint()
if (priorHint) console.log('Prior baseline:', JSON.stringify(priorHint))

if (cli.dumpOnce) {
  const run = runOne(cli.seed, cli.horizons, activeConfig)
  fs.writeFileSync(cli.out, JSON.stringify(run, null, 2), 'utf8')
  process.exit(0)
}

if (cli.repro) {
  const seed = cli.seed
  console.log(`\n[repro] running seed=${seed} twice in isolated processes...`)
  const a = runIsolatedDump(seed, cli.horizons, BASE_CONFIG)
  const b = runIsolatedDump(seed, cli.horizons, BASE_CONFIG)
  const tick = cli.horizons[cli.horizons.length - 1]!
  console.log(`  A fp=${a.final.fingerprint}`)
  console.log(`  B fp=${b.final.fingerprint}`)
  const rowA = baselineRowFromSnap(seed, a.final, { deaths: a.final.deaths, villages: a.final.villages })
  const rowB = baselineRowFromSnap(seed, b.final, { deaths: b.final.deaths, villages: b.final.villages })
  const cmp = compareEmergenceRepro(rowA, rowB)
  console.log(cmp.match ? 'REPRO PASS - fingerprints match' : 'REPRO FAIL - divergence (possible non-determinism)')
  if (!cmp.match) console.log(cmp.diffs.join('\n'))
  console.log('\nRun A:\n' + formatEmergenceBaselineTable([rowA]))
  console.log('\nRun B:\n' + formatEmergenceBaselineTable([rowB]))

  const report: Report = {
    mode: 'repro',
    horizons: cli.horizons,
    baseConfig: BASE_CONFIG,
    priorBaseline: priorHint,
    runs: [a, b],
    tables: { final: formatEmergenceBaselineTable([rowA, rowB]) },
    repro: { ...cmp, seed, tick, isolatedProcesses: true },
  }
  fs.writeFileSync(cli.out, JSON.stringify(report, null, 2), 'utf8')
  console.log(`\nWrote ${cli.out}`)
  process.exit(cmp.match ? 0 : 1)
}

if (cli.diverge) {
  console.log(
    `\n[diverge] knob=wolfCount baseline=${BASE_CONFIG.wolfCount} alternate=${DIVERGE_WOLF_COUNT}`,
  )
  const baseRuns = cli.seeds.map((s) => runOne(s, cli.horizons, BASE_CONFIG))
  const altConfig = { ...BASE_CONFIG, wolfCount: DIVERGE_WOLF_COUNT }
  const altRuns = cli.seeds.map((s) => runOne(s, cli.horizons, altConfig))
  const tick = cli.horizons[cli.horizons.length - 1]!
  const divergeCompare = cli.seeds.map((seed, i) => {
    const baseline = baselineRowFromSnap(seed, baseRuns[i]!.final, {
      deaths: baseRuns[i]!.final.deaths,
      villages: baseRuns[i]!.final.villages,
    })
    const alternate = baselineRowFromSnap(seed, altRuns[i]!.final, {
      deaths: altRuns[i]!.final.deaths,
      villages: altRuns[i]!.final.villages,
    })
    return {
      seed,
      tick,
      baseline,
      alternate,
      sameFingerprint: baseline.fingerprint === alternate.fingerprint,
    }
  })
  const baseTable = formatEmergenceBaselineTable(rowsAtHorizon(baseRuns, tick))
  const altTable = formatEmergenceBaselineTable(rowsAtHorizon(altRuns, tick))
  console.log('\n=== BASELINE wolfCount=3 ===\n' + baseTable)
  console.log('\n=== DIVERGE wolfCount=7 ===\n' + altTable)
  for (const d of divergeCompare) {
    console.log(
      `seed=${d.seed} sameFp=${d.sameFingerprint} alive ${d.baseline.npcsAlive}->${d.alternate.npcsAlive} blocks ${d.baseline.blocksBuilt}->${d.alternate.blocksBuilt}`,
    )
  }

  const report: Report = {
    mode: 'diverge',
    horizons: cli.horizons,
    baseConfig: BASE_CONFIG,
    divergeKnob: {
      name: 'wolfCount',
      baseline: BASE_CONFIG.wolfCount,
      alternate: DIVERGE_WOLF_COUNT,
      rationale:
        'Predator pressure is a single SimConfig field; higher wolves raise flee/death risk and starve build cycles without rewriting behaviors.',
    },
    priorBaseline: priorHint,
    runs: [...baseRuns, ...altRuns],
    tables: { baseline: baseTable, diverge: altTable },
    divergeCompare,
  }
  fs.writeFileSync(cli.out, JSON.stringify(report, null, 2), 'utf8')
  console.log(`\nWrote ${cli.out}`)
  process.exit(0)
}

const runs = cli.seeds.map((s) => {
  console.log(`\n[run] seed=${s}`)
  return runOne(s, cli.horizons, BASE_CONFIG)
})

const tables: Record<string, string> = {}
for (const h of cli.horizons) {
  const table = formatEmergenceBaselineTable(rowsAtHorizon(runs, h))
  tables[`t${h}`] = table
  console.log(`\n=== BASELINE @ t${h} ===\n` + table)
}

const report: Report = {
  mode: 'multi',
  horizons: cli.horizons,
  baseConfig: BASE_CONFIG,
  priorBaseline: priorHint,
  runs,
  tables,
}
fs.writeFileSync(cli.out, JSON.stringify(report, null, 2), 'utf8')
console.log(`\nWrote ${cli.out}`)
console.log('EMERGENCE MASTER DONE')
