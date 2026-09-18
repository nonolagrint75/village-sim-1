/**
 * WP1 harness types — sec20 floors, sec43 EvidenceBlock, MECHANISM vs EMERGENCE channels.
 * Scripts-only; no gameplay imports.
 */

export type SuiteId = 'individual' | 'social' | 'rare' | 'gens'

/** Result channel: mechanism wire-tests vs mission-scale emergence. */
export type ResultChannel = 'MECHANISM' | 'EMERGENCE'

export type EvidenceResult =
  | 'PASS'
  | 'PARTIAL'
  | 'FAIL'
  | 'NOT_TESTED'
  | 'CODE_ONLY'
  | 'CONNECTION_NOT_PROVEN'
  | 'BLOCKED'

/** sec43 mandatory evidence shape */
export type EvidenceBlock = {
  test: string
  channel: ResultChannel
  population: number
  days: number
  seeds: number[]
  events: number
  decisionsSampled: number
  expected: string
  threshold: Record<string, number>
  observed: Record<string, number | string>
  actual: Record<string, number | string>
  result: EvidenceResult
  evidence: string[]
  /** sec42 — required if initial conditions were prepared / induced */
  testSetup?: string
}

/** sec20 scale snapshot used by honesty gates */
export type ScaleSnapshot = {
  population: number
  days: number
  seedCount: number
  decisionsSampled: number
}

/**
 * sec20 floors (mission binding).
 * Social / rare / gens documented for honesty; individual is the WP1 default gate.
 */
export const SEC20_FLOORS = {
  individual: {
    minPopulation: 100,
    minDays: 60,
    minSeeds: 3,
    minDecisions: 10_000,
    note: 'Individual behavior soak before any EMERGENCE PASS',
  },
  social: {
    minPopulation: 300,
    minDays: 120,
    minSeeds: 10,
    minDecisions: 0,
    note: 'Social systems; 300 living NPC may be BLOCKED by maxPopulation — report honestly',
  },
  rare: {
    minPopulation: 0,
    minDays: 300,
    minSeeds: 10,
    minDecisions: 0,
    note: 'Rare phenomena + multi-seed',
  },
  gens: {
    minPopulation: 0,
    minDays: 500,
    minSeeds: 3,
    minDecisions: 0,
    note: 'Or >=2 full generations (pedigree depth)',
  },
} as const satisfies Record<
  SuiteId,
  {
    minPopulation: number
    minDays: number
    minSeeds: number
    minDecisions: number
    note: string
  }
>

export type HarnessReport = {
  mechanism: EvidenceBlock[]
  emergence: EvidenceBlock[]
  /** True if any induced / raised-founder path was used */
  hasTestSetup: boolean
  /** Never claim GLOBAL / EMERGENCE PASS from WP1 smoke alone */
  globalClaim: 'NON_DECLARED'
}
