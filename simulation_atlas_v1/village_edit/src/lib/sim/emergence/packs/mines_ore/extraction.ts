/**
 * Extraction rates + ore stocks (causal step 3).
 * Mirrors dig*Yield / digHpPerHit / digStaminaCost from core mining.ts.
 * Does not mutate WorldGrid — returns amounts for integrator to apply.
 */

import { DIG_STAMINA_MULT, FORGE_STOCK_THRESHOLD } from './constants'
import { pushEvent } from './events'
import { findMouthById, markMouthActive, openMineMouth, refreshDepletion } from './mouths'
import type {
  ExtractionResult,
  MinesOreBag,
  OreAmounts,
  OreKind,
  ToolTier,
} from './types'
import { addOreAmounts, canMineRock, emptyOreAmounts, sumOre } from './types'

export function digHpPerHit(tier: ToolTier): number {
  if (tier === 'iron') return 3
  if (tier === 'stone') return 2
  return 0
}

export function digStoneYield(tier: ToolTier): number {
  if (tier === 'iron') return 3
  if (tier === 'stone') return 2
  return 0
}

export function digIronYield(tier: ToolTier): number {
  if (tier === 'iron') return 3
  if (tier === 'stone') return 2
  return 0
}

export function digGoldYield(tier: ToolTier): number {
  if (tier === 'iron') return 2
  if (tier === 'stone') return 1
  return 0
}

export function digSideOreYield(tier: ToolTier): number {
  return tier === 'iron' ? 2 : tier === 'stone' ? 1 : 0
}

export function digStaminaCost(tier: ToolTier): number {
  const base = 0.09 * DIG_STAMINA_MULT
  if (tier === 'iron') return base * 0.85
  if (tier === 'stone') return base
  return base * 1.15
}

function takeFromVein(vein: OreAmounts, kind: OreKind, want: number): number {
  const have = vein[kind] ?? 0
  const got = Math.min(want, Math.max(0, have))
  vein[kind] = Math.max(0, have - got)
  return got
}

export interface DigAtMouthOpts {
  tick: number
  actorId: number
  mouthId: string
  toolTier: ToolTier
  /** Dig cell (mountain / corridor tip). */
  x: number
  y: number
  /** Current dig HP on cell (from grid.amount); staging does not write it. */
  digHp: number
  /** Soft blast-mining knowledge boost (technology.knowsBlastMining). */
  blastMining?: boolean
  /** If dig opens an entrance this hit. */
  opensEntrance?: boolean
}

/**
 * One dig hit against a sticky mouth vein bag + stockpile accounting.
 * Integrator still applies WorldGrid deposit drains / TUNNEL finalize.
 */
export function extractAtMouth(bag: MinesOreBag, opts: DigAtMouthOpts): ExtractionResult | null {
  if (!canMineRock(opts.toolTier)) return null
  const mouth = findMouthById(bag, opts.mouthId)
  if (!mouth) return null

  const blast = opts.blastMining ? 1 : 0
  const hit = digHpPerHit(opts.toolTier) + (blast ? 2 : 0)
  const dug = emptyOreAmounts()

  dug.stone = takeFromVein(mouth.veinRemaining, 'stone', digStoneYield(opts.toolTier) + blast)
  dug.iron = takeFromVein(mouth.veinRemaining, 'iron', digIronYield(opts.toolTier))
  dug.gold = takeFromVein(mouth.veinRemaining, 'gold', digGoldYield(opts.toolTier))
  const side = digSideOreYield(opts.toolTier)
  dug.copper = takeFromVein(mouth.veinRemaining, 'copper', side)
  dug.tin = takeFromVein(mouth.veinRemaining, 'tin', side)
  dug.lead = takeFromVein(mouth.veinRemaining, 'lead', side)
  dug.silver = takeFromVein(mouth.veinRemaining, 'silver', Math.min(1, side))
  dug.coal = takeFromVein(mouth.veinRemaining, 'coal', side)

  addOreAmounts(mouth.stockpile, dug)
  addOreAmounts(mouth.lifetimeExtracted, dug)

  const digHpRemaining = Math.max(0, opts.digHp - hit)
  let openedMouth = false
  // Only open when integrator confirms an entrance (core finalizeTunnelCell.isEntrance).
  if (opts.opensEntrance) {
    openMineMouth(bag, mouth.id, {
      tick: opts.tick,
      actorId: opts.actorId,
      x: opts.x,
      y: opts.y,
    })
    openedMouth = mouth.openedTick === opts.tick
  }

  markMouthActive(bag, mouth.id, opts.tick)
  refreshDepletion(bag, mouth, opts.tick)

  const metalGot = sumOre(dug, true)
  pushEvent(bag, {
    kind: 'active_dig',
    tick: opts.tick,
    mouthId: mouth.id,
    actorId: opts.actorId,
    villageId: mouth.villageId,
    x: opts.x,
    y: opts.y,
    ore: mouth.primaryOre,
    amount: metalGot + dug.stone,
    intensity: Math.min(1, 0.35 + hit * 0.12 + (blast ? 0.15 : 0)),
    note: blast ? 'blast' : 'pick',
  })

  const stockMetal = sumOre(mouth.stockpile, true)
  if (stockMetal >= FORGE_STOCK_THRESHOLD && stockMetal - metalGot < FORGE_STOCK_THRESHOLD) {
    pushEvent(bag, {
      kind: 'stock_threshold',
      tick: opts.tick,
      mouthId: mouth.id,
      villageId: mouth.villageId,
      x: mouth.x,
      y: mouth.y,
      ore: mouth.primaryOre,
      amount: stockMetal,
      intensity: 0.55,
      note: 'forge_feed',
    })
  }

  return {
    mouthId: mouth.id,
    actorId: opts.actorId,
    x: opts.x,
    y: opts.y,
    dug,
    spoil: 0,
    openedMouth,
    depleted: mouth.status === 'depleted',
    digHpRemaining,
    staminaCost: digStaminaCost(opts.toolTier),
  }
}

/** Haul from mouth stockpile into actor inventory (integrator applies capacity). */
export function takeFromStockpile(
  bag: MinesOreBag,
  mouthId: string,
  kind: OreKind,
  amount: number,
): number {
  const mouth = findMouthById(bag, mouthId)
  if (!mouth || amount <= 0) return 0
  const got = Math.min(amount, mouth.stockpile[kind] ?? 0)
  mouth.stockpile[kind] = Math.max(0, (mouth.stockpile[kind] ?? 0) - got)
  return got
}

export function mouthOreStock(bag: MinesOreBag, mouthId: string): OreAmounts {
  const mouth = findMouthById(bag, mouthId)
  return mouth ? { ...mouth.stockpile } : emptyOreAmounts()
}

export function mouthVeinRemaining(bag: MinesOreBag, mouthId: string): OreAmounts {
  const mouth = findMouthById(bag, mouthId)
  return mouth ? { ...mouth.veinRemaining } : emptyOreAmounts()
}