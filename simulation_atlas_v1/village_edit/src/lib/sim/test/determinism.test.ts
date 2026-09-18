import { describe, expect, it } from 'vitest'
import { createSim, fingerprint, runTicks } from './harness'

const SEED = 7
const TICKS = 150

describe('sim determinism', () => {
  it('seed 7 / 150 ticks: two runs share identical fingerprint', () => {
    const a = createSim(SEED)
    const b = createSim(SEED)
    runTicks(a, TICKS)
    runTicks(b, TICKS)
    expect(fingerprint(a)).toBe(fingerprint(b))
    expect(a.tick).toBe(TICKS)
    expect(b.tick).toBe(TICKS)
  })
})