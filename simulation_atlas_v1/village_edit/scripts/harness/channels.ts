/**
 * Separate MECHANISM vs EMERGENCE result channels into one report.
 */

import type { EvidenceBlock, HarnessReport } from './types.ts'

export function emptyHarnessReport(hasTestSetup = false): HarnessReport {
  return {
    mechanism: [],
    emergence: [],
    hasTestSetup,
    globalClaim: 'NON_DECLARED',
  }
}

export function pushBlock(report: HarnessReport, block: EvidenceBlock): void {
  if (block.channel === 'MECHANISM') report.mechanism.push(block)
  else report.emergence.push(block)
  if (block.testSetup) report.hasTestSetup = true
}

export function summarizeChannels(report: HarnessReport): {
  mechanismSummary: string
  emergenceSummary: string
  globalClaim: 'NON_DECLARED'
} {
  const mPass = report.mechanism.filter((b) => b.result === 'PASS').length
  const mFail = report.mechanism.filter((b) => b.result === 'FAIL').length
  const ePass = report.emergence.filter((b) => b.result === 'PASS').length
  const eNt = report.emergence.filter((b) => b.result === 'NOT_TESTED').length
  return {
    mechanismSummary: `MECHANISM blocks=${report.mechanism.length} PASS=${mPass} FAIL=${mFail}`,
    emergenceSummary: `EMERGENCE blocks=${report.emergence.length} PASS=${ePass} NOT_TESTED=${eNt} (never GLOBAL PASS from harness alone)`,
    globalClaim: 'NON_DECLARED',
  }
}
