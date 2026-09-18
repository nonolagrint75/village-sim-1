/**
 * AGENT 8 — harness scaffolding ONLY.
 *
 * Does NOT step the simulation as proof of PASS.
 * Does NOT mutate gameplay rules or inject emergent events.
 *
 * Purpose:
 *   - Echo suite configs mapped to MASTER MISSION §§20–43
 *   - Declare metric + EvidenceBlock schemas
 *   - Register existing probe adapters (paths only)
 *
 * Run:
 *   npx tsx scripts/_harness_agent8_scaffold.ts
 *   npx tsx scripts/_harness_agent8_scaffold.ts --suite individual
 *
 * See: ANALYSIS_AGENT8_TESTS.md
 */

export type SuiteId = 'individual' | 'social' | 'rare' | 'gens'

export type EvidenceResult =
  | 'PASS'
  | 'PARTIAL'
  | 'FAIL'
  | 'NOT_TESTED'
  | 'CODE_ONLY'
  | 'CONNECTION_NOT_PROVEN'
  | 'BLOCKED'

/** §43 mandatory evidence shape */
export type EvidenceBlock = {
  test: string
  population: number
  days: number
  seeds: number[]
  events: number
  expected: string
  threshold: Record<string, number>
  observed: Record<string, number | string>
  actual: Record<string, number | string>
  result: EvidenceResult
  evidence: string[]
  /** §42 — required if initial conditions were prepared */
  testSetup?: string
}

/** Metrics collectors must eventually fill (see ANALYSIS §3) */
export type MetricBag = {
  suite: SuiteId
  seed: number
  day: number
  populationAlive: number
  decisionsSampled: number
  uniqueTaskTypes: number
  taskEntropy: number | null
  taskSwitchesPerNpc: number | null
  teachStarts: number
  professionChanges: number
  births: number
  migrations: number
  helpEvents: number
  priceChanges: number
  causalChainsComplete: number
  notes: string[]
}

export type SuiteProfile = {
  id: SuiteId
  missionRef: string
  minPopulation: number
  minDays: number
  minSeeds: number
  extra?: string
  /** Suggested createSimulation config — TEST SETUP when raising founders */
  suggestedConfig: {
    initialVillagers?: number
    worldSize?: 600 | 800 | 1000 | 1200
    maxPopulation?: number
    preset?: 'standard' | 'vast' | 'anthill' | 'harsh' | 'observe'
  }
  defaultSeeds: number[]
}

export const SUITES: Record<SuiteId, SuiteProfile> = {
  individual: {
    id: 'individual',
    missionRef: '§20 individual + §§23–27',
    minPopulation: 100,
    minDays: 60,
    minSeeds: 3,
    extra: '≥10000 decisions',
    suggestedConfig: {
      initialVillagers: 100,
      worldSize: 1000,
      maxPopulation: 250,
      preset: 'standard',
    },
    defaultSeeds: [1, 3, 7],
  },
  social: {
    id: 'social',
    missionRef: '§20 social + §§28–37',
    minPopulation: 300,
    minDays: 120,
    minSeeds: 10,
    suggestedConfig: {
      initialVillagers: 120,
      worldSize: 1200,
      maxPopulation: 400,
      preset: 'vast',
    },
    defaultSeeds: [1, 3, 5, 7, 9, 11, 13, 17, 19, 23],
  },
  rare: {
    id: 'rare',
    missionRef: '§20 rare phenomena + §38',
    minPopulation: 0,
    minDays: 300,
    minSeeds: 10,
    suggestedConfig: { preset: 'standard', worldSize: 1000 },
    defaultSeeds: [1, 3, 5, 7, 9, 11, 13, 17, 19, 23],
  },
  gens: {
    id: 'gens',
    missionRef: '§20 generations + §29',
    minPopulation: 0,
    minDays: 500,
    minSeeds: 3,
    extra: 'or ≥2 full generations (pedigree depth)',
    suggestedConfig: { preset: 'standard', worldSize: 1000 },
    defaultSeeds: [1, 3, 7],
  },
}

/** Existing probes to wrap later — no execution here */
export const PROBE_ADAPTERS: { id: string; path: string; covers: string[] }[] = [
  { id: 'emergence_seeds', path: 'scripts/_probe_emergence_seeds.ts', covers: ['§35', '§36', '§38'] },
  { id: 'second_audit_emergence', path: 'scripts/_probe_second_audit_emergence.ts', covers: ['§27', '§28', '§32', '§42-SETUP'] },
  { id: 'civ_emerge', path: 'scripts/audit-civ-emerge.ts', covers: ['§34', '§35', '§37', '§38'] },
  { id: 'a14_gens', path: 'scripts/_probe_a14_gens.ts', covers: ['§20-gens', '§29'] },
  { id: 'demo_multigen', path: 'scripts/_probe_demo_multigen.ts', covers: ['§29'] },
  { id: 'careers', path: 'scripts/_probe_careers.ts', covers: ['§28'] },
  { id: 'econ_chain', path: 'scripts/_probe_econ_chain.ts', covers: ['§32'] },
  { id: 'food_chain', path: 'scripts/_probe_food_chain.ts', covers: ['§32'] },
  { id: 'society', path: 'scripts/_probe_society.ts', covers: ['§34', '§35', '§36'] },
  { id: 'task_hist', path: 'scripts/_task_hist_d5_15.ts', covers: ['§23'] },
  { id: 'bandits', path: 'scripts/_probe_bandits.ts', covers: ['§37'] },
  { id: 'headless_social', path: 'headless.ts', covers: ['§29', '§30'] },
]

export function emptyMetricBag(suite: SuiteId, seed: number): MetricBag {
  return {
    suite,
    seed,
    day: 0,
    populationAlive: 0,
    decisionsSampled: 0,
    uniqueTaskTypes: 0,
    taskEntropy: null,
    taskSwitchesPerNpc: null,
    teachStarts: 0,
    professionChanges: 0,
    births: 0,
    migrations: 0,
    helpEvents: 0,
    priceChanges: 0,
    causalChainsComplete: 0,
    notes: ['scaffold — collector not wired; do not treat as PASS evidence'],
  }
}

export function scaleGate(suite: SuiteId, pop: number, days: number, seedCount: number): EvidenceResult {
  const s = SUITES[suite]
  if (days < s.minDays || seedCount < s.minSeeds) return 'NOT_TESTED'
  if (s.minPopulation > 0 && pop < s.minPopulation) return 'NOT_TESTED'
  return 'BLOCKED' // suite eligible but not executed in scaffold
}

function parseSuiteArg(): SuiteId | 'all' {
  const i = process.argv.indexOf('--suite')
  const v = i >= 0 ? process.argv[i + 1] : 'all'
  if (v === 'all' || v === 'individual' || v === 'social' || v === 'rare' || v === 'gens') return v
  console.error('Unknown suite. Use: individual|social|rare|gens|all')
  process.exit(2)
}

function main() {
  const which = parseSuiteArg()
  const ids = which === 'all' ? (Object.keys(SUITES) as SuiteId[]) : [which]

  console.log('=== AGENT 8 harness scaffold (NO SIM RUN / NO PASS) ===\n')
  console.log('Analysis: ANALYSIS_AGENT8_TESTS.md')
  console.log('Honesty: §42 — no rule cheats; label TEST SETUP if founders raised.\n')

  for (const id of ids) {
    const s = SUITES[id]
    console.log('── Suite ' + s.id + ' (' + s.missionRef + ')')
    console.log(
      JSON.stringify(
        {
          minima: {
            population: s.minPopulation || 'n/a',
            days: s.minDays,
            seeds: s.minSeeds,
            extra: s.extra ?? null,
          },
          suggestedConfig: s.suggestedConfig,
          defaultSeeds: s.defaultSeeds,
          scaleGateIfRunNow: scaleGate(id, 55, 40, 3),
          note:
            id === 'social'
              ? '300 living NPC may be BLOCKED by maxPopulation / famine cliff — report honestly'
              : 'default presets (26–55 founders) fail §20 until growth or TEST SETUP',
        },
        null,
        2,
      ),
    )
    console.log()
  }

  console.log('── Probe adapter registry (reuse, not executed)')
  for (const a of PROBE_ADAPTERS) {
    console.log('  ' + a.id.padEnd(24) + ' ' + a.path + '  [' + a.covers.join(', ') + ']')
  }

  console.log('\n── Sample EvidenceBlock (§43) — empty / NOT_TESTED')
  const sample: EvidenceBlock = {
    test: 'scaffold_smoke',
    population: 0,
    days: 0,
    seeds: [],
    events: 0,
    expected: 'Harness wiring only',
    threshold: {},
    observed: {},
    actual: emptyMetricBag('individual', 1) as unknown as Record<string, number | string>,
    result: 'NOT_TESTED',
    evidence: ['scripts/_harness_agent8_scaffold.ts — no stepSimulation'],
  }
  console.log(JSON.stringify(sample, null, 2))

  console.log('\nScaffold OK. Next: wire TelemetryCollector (see ANALYSIS §5) without gameplay edits.')
}

main()