/**
 * Parallel (black) economy — loot sold locally; mixed support/hate (Daren/Kael).
 */

import type { ParallelGang } from './types'
import { clamp, pushEventCap } from './util'

/**
 * Fence loot into nearby settlements.
 * High foodMoved + moderate coin can raise localSupport (protection money / cheap food)
 * while notoriety raises localHate.
 */
export function fenceLoot(
  gang: ParallelGang,
  tick: number,
  fraction = 0.4,
): { foodSold: number; coinGained: number } {
  const foodSold = gang.loot.food * fraction
  const goodsSold = gang.loot.goods * fraction
  const coinFromGoods = goodsSold * 1.2
  const coinKeep = gang.loot.coin * (1 - fraction * 0.5)
  const coinGained = coinFromGoods + gang.loot.coin * fraction * 0.5

  gang.loot.food -= foodSold
  gang.loot.goods -= goodsSold
  gang.loot.coin = coinKeep + coinGained * 0.3

  gang.parallel.foodMoved += foodSold
  gang.parallel.coinMoved += coinGained

  // Cheap food → soft support; violence → hate
  gang.parallel.localSupport = clamp(
    gang.parallel.localSupport + foodSold * 0.01 - gang.notoriety * 0.01,
    0,
    1,
  )
  gang.parallel.localHate = clamp(
    gang.parallel.localHate + gang.notoriety * 0.02 + goodsSold * 0.005,
    0,
    1,
  )

  // Zone control emerges when support + raids high (Kael path)
  gang.zoneControl = clamp(
    gang.zoneControl * 0.9 +
      gang.parallel.localSupport * 0.15 +
      Math.min(1, gang.raids / 10) * 0.1 -
      gang.parallel.localHate * 0.05,
    0,
    1,
  )

  pushEventCap(gang.events, {
    kind: 'parallel_sale',
    tick,
    gangId: gang.id,
    amount: coinGained,
  })
  return { foodSold, coinGained }
}

export function parallelEconomySnapshot(gang: ParallelGang) {
  return {
    ...gang.parallel,
    zoneControl: gang.zoneControl,
    notoriety: gang.notoriety,
    netSentiment: gang.parallel.localSupport - gang.parallel.localHate,
  }
}
