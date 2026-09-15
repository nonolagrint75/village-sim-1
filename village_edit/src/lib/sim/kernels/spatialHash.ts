/**
 * Uniform grid spatial hash for agent neighbor queries.
 * Replaces O(N²) full villager scans with O(N + k) cell lookups.
 * Flat cell → index lists keep this ABI close to a future WASM port.
 */

import type { SimState, Villager } from '../types'

const DEFAULT_CELL = 24

export class AgentSpatialHash {
  readonly cellSize: number
  private inv: number
  private cols = 0
  private rows = 0
  /** Parallel arrays: cellHeads[cell] = first slot index or -1; next[slot] chains. */
  private cellHeads: Int32Array = new Int32Array(0)
  private next: Int32Array = new Int32Array(0)
  private villagerIndex: Int32Array = new Int32Array(0)
  private count = 0
  private stamp = 1
  private cellStamp: Int32Array = new Int32Array(0)

  constructor(cellSize = DEFAULT_CELL) {
    this.cellSize = cellSize
    this.inv = 1 / cellSize
  }

  rebuild(state: SimState): void {
    const w = state.grid.width
    const h = state.grid.height
    const cols = Math.max(1, Math.ceil(w * this.inv))
    const rows = Math.max(1, Math.ceil(h * this.inv))
    const cells = cols * rows
    if (cols !== this.cols || rows !== this.rows || this.cellHeads.length < cells) {
      this.cols = cols
      this.rows = rows
      this.cellHeads = new Int32Array(cells)
      this.cellStamp = new Int32Array(cells)
    }
    this.stamp++
    if (this.stamp > 0x7ffff000) {
      this.cellStamp.fill(0)
      this.stamp = 1
    }

    const villagers = state.villagers
    const n = villagers.length
    if (this.next.length < n) {
      this.next = new Int32Array(n)
      this.villagerIndex = new Int32Array(n)
    }

    let slot = 0
    for (let i = 0; i < n; i++) {
      const v = villagers[i]
      if (!v.alive) continue
      const cx = Math.min(cols - 1, Math.max(0, (v.x * this.inv) | 0))
      const cy = Math.min(rows - 1, Math.max(0, (v.y * this.inv) | 0))
      const cell = cy * cols + cx
      if (this.cellStamp[cell] !== this.stamp) {
        this.cellStamp[cell] = this.stamp
        this.cellHeads[cell] = -1
      }
      this.villagerIndex[slot] = i
      this.next[slot] = this.cellHeads[cell]
      this.cellHeads[cell] = slot
      slot++
    }
    this.count = slot
  }

  /**
   * Collect living villagers within Chebyshev radius into `out` (cleared first).
   * Returns number of hits written.
   */
  queryChebyshev(
    villagers: Villager[],
    x: number,
    y: number,
    radius: number,
    out: Villager[],
    selfId: number | null = null,
    maxHits = 48,
  ): number {
    out.length = 0
    if (this.cols === 0 || this.count === 0) return 0
    const cellR = Math.max(1, Math.ceil(radius * this.inv))
    const cx0 = Math.min(this.cols - 1, Math.max(0, (x * this.inv) | 0))
    const cy0 = Math.min(this.rows - 1, Math.max(0, (y * this.inv) | 0))
    const minCx = Math.max(0, cx0 - cellR)
    const maxCx = Math.min(this.cols - 1, cx0 + cellR)
    const minCy = Math.max(0, cy0 - cellR)
    const maxCy = Math.min(this.rows - 1, cy0 + cellR)
    const stamp = this.stamp
    let hits = 0
    for (let cy = minCy; cy <= maxCy; cy++) {
      const row = cy * this.cols
      for (let cx = minCx; cx <= maxCx; cx++) {
        const cell = row + cx
        if (this.cellStamp[cell] !== stamp) continue
        let s = this.cellHeads[cell]
        while (s >= 0) {
          const vi = this.villagerIndex[s]
          const o = villagers[vi]
          s = this.next[s]
          if (!o || !o.alive) continue
          if (selfId !== null && o.id === selfId) continue
          const dx = o.x - x
          const dy = o.y - y
          if (dx > radius || dx < -radius || dy > radius || dy < -radius) continue
          out.push(o)
          hits++
          if (hits >= maxHits) return hits
        }
      }
    }
    return hits
  }
}

/** Shared per-tick hash — rebuilt once in stepSimulation. */
export const agentHash = new AgentSpatialHash(24)

const NEARBY_A: Villager[] = []
const NEARBY_B: Villager[] = []
let nearbyFlip = 0

/**
 * Neighbors within Chebyshev radius.
 * Returns a scratch buffer valid until the next `nearbyVillagers` call
 * (double-buffered so one nested call is safe).
 */
export function nearbyVillagers(
  state: SimState,
  x: number,
  y: number,
  radius: number,
  selfId: number | null = null,
  maxHits = 48,
): Villager[] {
  const buf = nearbyFlip++ & 1 ? NEARBY_A : NEARBY_B
  agentHash.queryChebyshev(state.villagers, x, y, radius, buf, selfId, maxHits)
  return buf
}
