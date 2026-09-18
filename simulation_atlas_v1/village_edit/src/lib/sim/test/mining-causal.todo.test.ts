import { describe, expect, it } from 'vitest'
import { FENCE, TUNNEL } from '../types'
import { createSim, runTicks } from './harness'

const SEED = 7
const HORIZON = 3000
/** Generous: ~3k ticks on compact harsh map can take tens of seconds. */
const TIMEOUT_MS = 120_000

function countTerrain(terrain: Uint8Array, code: number): number {
  let n = 0
  for (let i = 0; i < terrain.length; i++) {
    if (terrain[i] === code) n++
  }
  return n
}

describe('mining causal chain', () => {
  it(
    'seed 7 / 3000 ticks: stone tool OR fence tile OR tunnel appears',
    () => {
      const state = createSim(SEED)
      runTicks(state, HORIZON)

      const stoneTools = state.villagers.filter((v) => v.alive && v.toolTier === 'stone').length
      const fenceTiles = countTerrain(state.grid.terrain, FENCE)
      const tunnelTiles = countTerrain(state.grid.terrain, TUNNEL)
      // eslint-disable-next-line no-console -- QA observability for Master report
      console.info(
        `[mining-causal] seed=${SEED} horizon=${HORIZON} stoneTools=${stoneTools} fenceTiles=${fenceTiles} tunnelTiles=${tunnelTiles}`,
      )

      expect(
        stoneTools > 0 || fenceTiles > 0 || tunnelTiles > 0,
        `expected stone tool / fence / tunnel after ${HORIZON} ticks; ` +
          `got stoneTools=${stoneTools} fenceTiles=${fenceTiles} tunnelTiles=${tunnelTiles}`,
      ).toBe(true)
    },
    TIMEOUT_MS,
  )
})
