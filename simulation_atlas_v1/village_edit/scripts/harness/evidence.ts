/**
 * sec43 EvidenceBlock builder / printer.
 */

import type { EvidenceBlock, EvidenceResult, ResultChannel, ScaleSnapshot } from './types.ts'
import { SEC20_FLOORS, type SuiteId } from './types.ts'

export type EvidenceInput = {
  test: string
  channel: ResultChannel
  scale: ScaleSnapshot
  seeds?: number[]
  events?: number
  expected: string
  threshold?: Record<string, number>
  observed?: Record<string, number | string>
  actual?: Record<string, number | string>
  result: EvidenceResult
  evidence?: string[]
  testSetup?: string
  suite?: SuiteId
}

export function makeEvidenceBlock(input: EvidenceInput): EvidenceBlock {
  const suite = input.suite ?? 'individual'
  const floor = SEC20_FLOORS[suite]
  const threshold = {
    minPopulation: floor.minPopulation,
    minDays: floor.minDays,
    minSeeds: floor.minSeeds,
    minDecisions: floor.minDecisions,
    ...(input.threshold ?? {}),
  }
  return {
    test: input.test,
    channel: input.channel,
    population: input.scale.population,
    days: input.scale.days,
    seeds: input.seeds ?? [],
    events: input.events ?? 0,
    decisionsSampled: input.scale.decisionsSampled,
    expected: input.expected,
    threshold,
    observed: input.observed ?? {},
    actual: {
      population: input.scale.population,
      days: input.scale.days,
      seedCount: input.scale.seedCount,
      decisionsSampled: input.scale.decisionsSampled,
      ...(input.actual ?? {}),
    },
    result: input.result,
    evidence: input.evidence ?? [],
    ...(input.testSetup ? { testSetup: input.testSetup } : {}),
  }
}

/** Compact sec43 template dump for console / JSONL. */
export function formatEvidenceBlock(block: EvidenceBlock): string {
  const lines = [
    `TEST: ${block.test} [${block.channel}]`,
    `Population / Days / Seeds / Events / Expected / Threshold`,
    `${block.population} / ${block.days} / [${block.seeds.join(',')}] / ${block.events} / ${block.expected} / ${JSON.stringify(block.threshold)}`,
    `Observed / Actual / Result / Evidence`,
    `${JSON.stringify(block.observed)} / ${JSON.stringify(block.actual)} / ${block.result} / ${block.evidence.join(' | ')}`,
  ]
  if (block.testSetup) lines.push(`TEST SETUP: ${block.testSetup}`)
  return lines.join('\n')
}
