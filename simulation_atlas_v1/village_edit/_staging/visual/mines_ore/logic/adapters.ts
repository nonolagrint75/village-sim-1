/**
 * Adapters — map core WorldGrid / Village shapes onto staging types.
 * Self-contained copies of field names; no imports from src/lib.
 */

import type { DepositSample, OreAmounts } from './types'
import { emptyOreAmounts } from './types'

/** Minimal grid slice the sim integrator can pass without importing this pack into core. */
export interface GridOreView {
  width: number
  height: number
  /** terrain codes — adapter treats mountainCode / tunnelCode specially. */
  terrain: ArrayLike<number>
  amount: ArrayLike<number>
  ironDeposit: ArrayLike<number>
  goldDeposit: ArrayLike<number>
  copperDeposit: ArrayLike<number>
  tinDeposit: ArrayLike<number>
  leadDeposit: ArrayLike<number>
  silverDeposit: ArrayLike<number>
  coalDeposit: ArrayLike<number>
}

/** Core terrain constants (duplicated from types.ts MOUNTAIN=26 TUNNEL=27). */
export const TERRAIN_MOUNTAIN = 26
export const TERRAIN_TUNNEL = 27

/** Soft override if integrator uses different terrain enums. */
export interface SampleGridOpts {
  mountainCode?: number
  tunnelCode?: number
  /** Only include diggable / ore-bearing cells. */
  oreOnly?: boolean
  /** Optional bbox clip. */
  minX?: number
  minY?: number
  maxX?: number
  maxY?: number
  /** Entrance amount threshold (core TUNNEL_ENTRANCE_AMOUNT = 1). */
  entranceAmount?: number
  /**
   * Optional diggable predicate — if omitted, mountain cells are diggable.
   * Integrator should pass isMountainFace / isTunnelTip from mining.ts.
   */
  isDiggable?: (x: number, y: number, terrain: number) => boolean
}

function amountsAt(grid: GridOreView, i: number): OreAmounts {
  const a = emptyOreAmounts()
  a.iron = grid.ironDeposit[i] ?? 0
  a.gold = grid.goldDeposit[i] ?? 0
  a.copper = grid.copperDeposit[i] ?? 0
  a.tin = grid.tinDeposit[i] ?? 0
  a.lead = grid.leadDeposit[i] ?? 0
  a.silver = grid.silverDeposit[i] ?? 0
  a.coal = grid.coalDeposit[i] ?? 0
  return a
}

function hasOre(a: OreAmounts): boolean {
  return a.iron + a.gold + a.copper + a.tin + a.lead + a.silver + a.coal > 0
}

/**
 * Snapshot deposit samples from a WorldGrid-shaped view.
 * Does not allocate surface piles — underground data only.
 */
export function samplesFromGrid(grid: GridOreView, opts: SampleGridOpts = {}): DepositSample[] {
  const mountain = opts.mountainCode ?? TERRAIN_MOUNTAIN
  const tunnel = opts.tunnelCode ?? TERRAIN_TUNNEL
  const entranceAmt = opts.entranceAmount ?? 1
  const minX = opts.minX ?? 0
  const minY = opts.minY ?? 0
  const maxX = opts.maxX ?? grid.width - 1
  const maxY = opts.maxY ?? grid.height - 1
  const out: DepositSample[] = []

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const i = y * grid.width + x
      const t = grid.terrain[i] ?? 0
      if (t !== mountain && t !== tunnel) continue
      const amounts = amountsAt(grid, i)
      if (opts.oreOnly && !hasOre(amounts)) continue
      const diggable =
        opts.isDiggable?.(x, y, t) ?? t === mountain
      const isEntrance = t === tunnel && (grid.amount[i] ?? 0) >= entranceAmt
      out.push({
        x,
        y,
        amounts,
        digHp: t === mountain ? grid.amount[i] ?? 0 : 0,
        diggable,
        isEntrance,
      })
    }
  }
  return out
}

/** Village mouth sync shape — matches Village.hasMine / mineX / mineY. */
export interface VillageMineSync {
  hasMine: boolean
  mineX: number
  mineY: number
  id: number
}

export function applyVillageMineSync(
  village: VillageMineSync,
  fields: { hasMine: boolean; mineX: number; mineY: number },
): void {
  village.hasMine = fields.hasMine
  village.mineX = fields.mineX
  village.mineY = fields.mineY
}