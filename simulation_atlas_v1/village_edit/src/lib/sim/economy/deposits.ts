/**
 * Economy deposits — sparse bag synced from grid ore channels.
 * Never materialize every ore cell (that was ~80k objects and killed Max TPS).
 * sampleNearby scans the grid locally; harvest updates grid + sparse bag.
 */

import type { ResourceType } from '../resources'
import type { SimState, WorldGrid } from '../types'
import type { ResourceId } from './resourcesCatalog'

export interface Deposit {
  id: string
  resource: ResourceId
  qty: number
  quality: number
  x: number
  y: number
  regenPerDay?: number
  underground: boolean
}

export type EconomyDepositsBag = Deposit[]

const ORE_CHANNELS: ReadonlyArray<{
  key: keyof Pick<
    WorldGrid,
    | 'ironDeposit'
    | 'goldDeposit'
    | 'copperDeposit'
    | 'tinDeposit'
    | 'leadDeposit'
    | 'silverDeposit'
    | 'coalDeposit'
  >
  resource: ResourceId
}> = [
  { key: 'ironDeposit', resource: 'iron' },
  { key: 'goldDeposit', resource: 'gold' },
  { key: 'copperDeposit', resource: 'copper' },
  { key: 'tinDeposit', resource: 'tin' },
  { key: 'leadDeposit', resource: 'lead' },
  { key: 'silverDeposit', resource: 'silver' },
  { key: 'coalDeposit', resource: 'coal' },
]

function depositId(resource: ResourceId, x: number, y: number): string {
  return `dep:${resource}:${x},${y}`
}

function qualityFromQty(qty: number): number {
  return Math.max(0.15, Math.min(1, 0.2 + Math.log2(1 + qty) / 8))
}

/** Sparse sample: only rich veins (avoids 80k-object bags). */
export function depositsFromGrid(grid: WorldGrid, minQty = 4): Deposit[] {
  const out: Deposit[] = []
  const n = grid.width * grid.height
  const step = Math.max(1, Math.floor(Math.min(grid.width, grid.height) / 80))
  for (const { key, resource } of ORE_CHANNELS) {
    const arr = grid[key]
    for (let y = 0; y < grid.height; y += step) {
      for (let x = 0; x < grid.width; x += step) {
        const i = y * grid.width + x
        if (i >= n) continue
        const qty = arr[i] ?? 0
        if (qty < minQty) continue
        out.push({
          id: depositId(resource, x, y),
          resource,
          qty,
          quality: qualityFromQty(qty),
          x,
          y,
          underground: true,
        })
      }
    }
  }
  return out
}

/** Idempotent: sparse rich-vein seed (capped) — harvest still materializes more on demand. */
export function ensureEconomyDeposits(state: SimState): Deposit[] {
  if (state.economyDeposits) return state.economyDeposits
  // Slightly denser sparse sample so mid-run prospectors find veins without 80k bags.
  const seeded = depositsFromGrid(state.grid, 3)
  // Hard cap — full-world bags kill Max TPS; sample/harvest fills gaps locally.
  state.economyDeposits = seeded.length > 48 ? seeded.slice(0, 48) : seeded
  return state.economyDeposits
}

export interface SampleDepositsOpts {
  radius: number
  resource?: ResourceId
  underground?: boolean
  chebyshev?: boolean
  limit?: number
}

function dist2(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx
  const dy = ay - by
  return dx * dx + dy * dy
}

function channelFor(resource: ResourceId): (typeof ORE_CHANNELS)[number] | undefined {
  return ORE_CHANNELS.find((c) => c.resource === resource)
}

/** Nearby deposits: prefer sparse bag, fall back to local grid scan. */
export function sampleNearbyDeposits(
  state: SimState,
  x: number,
  y: number,
  opts: SampleDepositsOpts,
): Deposit[] {
  const bag = ensureEconomyDeposits(state)
  const r = Math.max(0, opts.radius)
  const r2 = r * r
  const out: Deposit[] = []
  for (const d of bag) {
    if (d.qty <= 0) continue
    if (opts.resource != null && d.resource !== opts.resource) continue
    if (opts.underground != null && d.underground !== opts.underground) continue
    if (opts.chebyshev) {
      if (Math.max(Math.abs(d.x - x), Math.abs(d.y - y)) > r) continue
    } else if (dist2(d.x, d.y, x, y) > r2) {
      continue
    }
    out.push(d)
    if (opts.limit != null && out.length >= opts.limit) return out
  }
  if (out.length > 0 || opts.resource == null) return out

  // Local grid probe for the requested ore (no full-world materialization).
  const ch = channelFor(opts.resource)
  if (!ch) return out
  const arr = state.grid[ch.key]
  const w = state.grid.width
  const h = state.grid.height
  const R = Math.min(24, Math.max(1, r | 0))
  for (let dy = -R; dy <= R; dy++) {
    for (let dx = -R; dx <= R; dx++) {
      if (opts.chebyshev) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) > R) continue
      } else if (dx * dx + dy * dy > r2) continue
      const nx = x + dx
      const ny = y + dy
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
      const qty = arr[ny * w + nx] ?? 0
      if (qty <= 0) continue
      out.push({
        id: depositId(opts.resource, nx, ny),
        resource: opts.resource,
        qty,
        quality: qualityFromQty(qty),
        x: nx,
        y: ny,
        underground: true,
      })
      if (opts.limit != null && out.length >= opts.limit) return out
    }
  }
  return out
}

export interface HarvestDepositResult {
  depositId: string
  resource: ResourceId
  taken: number
  remaining: number
}

function syncGridOre(grid: WorldGrid, resource: ResourceType, x: number, y: number, remaining: number): void {
  if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) return
  const i = y * grid.width + x
  switch (resource) {
    case 'iron':
      grid.ironDeposit[i] = remaining
      break
    case 'gold':
      grid.goldDeposit[i] = remaining
      break
    case 'copper':
      grid.copperDeposit[i] = remaining
      break
    case 'tin':
      grid.tinDeposit[i] = remaining
      break
    case 'lead':
      grid.leadDeposit[i] = remaining
      break
    case 'silver':
      grid.silverDeposit[i] = remaining
      break
    case 'coal':
      grid.coalDeposit[i] = remaining
      break
    default:
      break
  }
}

export function harvestDeposit(
  state: SimState,
  depositId: string,
  amount: number,
): HarvestDepositResult | null {
  if (!(amount > 0)) return null
  const bag = ensureEconomyDeposits(state)
  let dep = bag.find((d) => d.id === depositId)
  if (!dep) {
    // Materialize one sparse entry from id `dep:resource:x,y`.
    const m = /^dep:([^:]+):(-?\d+),(-?\d+)$/.exec(depositId)
    if (!m) return null
    const resource = m[1] as ResourceId
    const x = Number(m[2])
    const y = Number(m[3])
    const ch = channelFor(resource)
    if (!ch || x < 0 || y < 0 || x >= state.grid.width || y >= state.grid.height) return null
    const qty = state.grid[ch.key][y * state.grid.width + x] ?? 0
    if (qty <= 0) return null
    dep = {
      id: depositId,
      resource,
      qty,
      quality: qualityFromQty(qty),
      x,
      y,
      underground: true,
    }
    bag.push(dep)
  }
  if (dep.qty <= 0) return null
  const taken = Math.min(dep.qty, Math.floor(amount))
  if (taken <= 0) return null
  dep.qty -= taken
  if (dep.underground) {
    syncGridOre(state.grid, dep.resource, dep.x, dep.y, dep.qty)
  }
  return {
    depositId: dep.id,
    resource: dep.resource,
    taken,
    remaining: dep.qty,
  }
}

export function findDeposit(state: SimState, depositId: string): Deposit | undefined {
  return ensureEconomyDeposits(state).find((d) => d.id === depositId)
}
