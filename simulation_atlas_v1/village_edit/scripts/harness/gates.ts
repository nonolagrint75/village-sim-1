/**
 * Honesty gates — refuse EMERGENCE PASS under sec20 floors / TEST SETUP.
 */

import {
  SEC20_FLOORS,
  type EvidenceResult,
  type ResultChannel,
  type ScaleSnapshot,
  type SuiteId,
} from './types.ts'

export type GateReason = {
  okForPass: boolean
  forcedResult: EvidenceResult | null
  violations: string[]
}

/** Check whether scale meets suite floors. Does not award PASS. */
export function checkSec20Scale(suite: SuiteId, scale: ScaleSnapshot): GateReason {
  const floor = SEC20_FLOORS[suite]
  const violations: string[] = []
  if (floor.minPopulation > 0 && scale.population < floor.minPopulation) {
    violations.push(`pop ${scale.population} < ${floor.minPopulation}`)
  }
  if (scale.days < floor.minDays) {
    violations.push(`days ${scale.days} < ${floor.minDays}`)
  }
  if (scale.seedCount < floor.minSeeds) {
    violations.push(`seeds ${scale.seedCount} < ${floor.minSeeds}`)
  }
  if (floor.minDecisions > 0 && scale.decisionsSampled < floor.minDecisions) {
    violations.push(`decisions ${scale.decisionsSampled} < ${floor.minDecisions}`)
  }
  if (violations.length > 0) {
    return { okForPass: false, forcedResult: 'NOT_TESTED', violations }
  }
  return { okForPass: true, forcedResult: null, violations: [] }
}

/**
 * Finalize a proposed label.
 * - MECHANISM: may keep PASS/PARTIAL/FAIL (wire proof); TEST SETUP annotated upstream.
 * - EMERGENCE: NEVER PASS if under floors or if testSetupPresent.
 */
export function finalizeLabel(opts: {
  channel: ResultChannel
  proposed: EvidenceResult
  suite?: SuiteId
  scale: ScaleSnapshot
  testSetupPresent?: boolean
}): { result: EvidenceResult; gate: GateReason; note?: string } {
  const suite = opts.suite ?? 'individual'
  const gate = checkSec20Scale(suite, opts.scale)

  if (opts.channel === 'MECHANISM') {
    // Mechanism channel is allowed without sec20 soak, but refuse to upgrade FAIL→PASS.
    return { result: opts.proposed, gate, note: 'MECHANISM channel — scale floors not required for wire PASS' }
  }

  // EMERGENCE channel
  if (opts.testSetupPresent) {
    return {
      result: opts.proposed === 'FAIL' ? 'FAIL' : 'NOT_TESTED',
      gate: { okForPass: false, forcedResult: 'NOT_TESTED', violations: [...gate.violations, 'TEST SETUP present'] },
      note: 'Induced / prepared setup — label TEST SETUP; not emergent PASS',
    }
  }

  // Absolute: never award EMERGENCE PASS without exact decision floor (PROXY ignored).
  const exactFloor = SEC20_FLOORS.individual.minDecisions
  if (opts.proposed === 'PASS') {
    if (opts.scale.decisionsSampled < exactFloor) {
      return {
        result: 'NOT_TESTED',
        gate: {
          okForPass: false,
          forcedResult: 'NOT_TESTED',
          violations: [
            ...gate.violations,
            `exact decisions ${opts.scale.decisionsSampled} < ${exactFloor}`,
          ],
        },
        note: `Refused EMERGENCE PASS: decisionExactTotal/decisionsSampled < ${exactFloor} (PROXY ≠ exact)`,
      }
    }
    if (!gate.okForPass) {
      return {
        result: 'NOT_TESTED',
        gate,
        note: `Refused EMERGENCE PASS: sec20 floors failed (${gate.violations.join('; ')})`,
      }
    }
  }

  if (opts.proposed === 'PARTIAL') {
    if (!gate.okForPass) {
      return {
        result: 'NOT_TESTED',
        gate,
        note: `Refused EMERGENCE PARTIAL: sec20 undersized (${gate.violations.join('; ')})`,
      }
    }
  }

  return { result: opts.proposed, gate }
}

/** Convenience: never returns PASS when undersized on EMERGENCE. */
export function refuseUndersizedPass(
  channel: ResultChannel,
  proposed: EvidenceResult,
  scale: ScaleSnapshot,
  suite: SuiteId = 'individual',
  testSetupPresent = false,
): EvidenceResult {
  return finalizeLabel({ channel, proposed, scale, suite, testSetupPresent }).result
}
