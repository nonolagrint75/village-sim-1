/**
 * Block texture atlas for house cutaways — NEAREST.
 * Prefer CC0 block-pack planks / logs / bricks from NatureAtlas when ready.
 * Construction stays 1 sim cell = 1 block.
 */
import { hash2 } from './noise'
import { getNatureAtlas, isNatureReady } from './nature'

export type AtlasSlot =
  | 'plank0'
  | 'plank1'
  | 'plank2'
  | 'plank3'
  | 'timber0'
  | 'timber1'
  | 'timber2'
  | 'timber3'
  | 'timberV0'
  | 'timberV1'
  | 'stone0'
  | 'stone1'
  | 'stone2'
  | 'stone3'
  | 'dirt0'
  | 'dirt1'

const SLOT_ORDER: AtlasSlot[] = [
  'plank0',
  'plank1',
  'plank2',
  'plank3',
  'timber0',
  'timber1',
  'timber2',
  'timber3',
  'timberV0',
  'timberV1',
  'stone0',
  'stone1',
  'stone2',
  'stone3',
  'dirt0',
  'dirt1',
]

/** Pack keys per build slot — walls use plank boards (top-down), not log sides. */
const PACK_KEYS: Record<AtlasSlot, string[]> = {
  plank0: ['plank_oak', 'plank_beech'],
  plank1: ['plank_pine', 'plank_oak'],
  plank2: ['plank_maple', 'plank_oak'],
  plank3: ['plank_beech', 'plank_pine'],
  // Timber walls = board faces (readable cutaway), logs only as vertical posts.
  timber0: ['plank_oak', 'plank_beech'],
  timber1: ['plank_pine', 'plank_oak'],
  timber2: ['plank_maple', 'plank_oak'],
  timber3: ['plank_beech', 'plank_pine'],
  timberV0: ['log_oak', 'log_pine'],
  timberV1: ['log_pine', 'log_beech'],
  stone0: ['brick_cobble', 'cobblestone', 'cobble'],
  stone1: ['brick_limestone', 'brick_cobble', 'cobble'],
  stone2: ['brick_cobble_moss', 'brick_cobble', 'cobble'],
  stone3: ['brick_mud', 'brick_cobble', 'cobble'],
  dirt0: ['dirt', 'mud', 'path_dirt'],
  dirt1: ['dirt_dark', 'mud', 'dirt'],
}

export const ATLAS_SIZES = [32, 64, 128, 256] as const
export type AtlasSize = (typeof ATLAS_SIZES)[number]

/** Bump when PACK_KEYS / paint style changes so live sessions re-stamp. */
const PACK_SYNC_REV = 6

/** Darken a stamped slot in-place (DF/RW timber walls). */
function darkenRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  alpha: number,
) {
  ctx.fillStyle = `rgba(8,5,2,${alpha})`
  ctx.fillRect(x, y, w, h)
}

function pickAtlasSize(tilePx: number, slots: number): AtlasSize {
  const cols = Math.ceil(Math.sqrt(slots))
  const need = cols * tilePx
  for (const s of ATLAS_SIZES) {
    if (s >= need && s % 4 === 0) return s
  }
  return 256
}

export type AtlasRect = { u: number; v: number; w: number; h: number }

export class BuildAtlas {
  readonly canvas: HTMLCanvasElement
  readonly size: AtlasSize
  readonly tilePx: number
  readonly cols: number
  private readonly rects = new Map<AtlasSlot, AtlasRect>()
  private syncedRev = 0

  constructor(tilePx: number = 16) {
    this.tilePx = tilePx
    const slots = SLOT_ORDER.length
    this.size = pickAtlasSize(tilePx, slots)
    this.cols = Math.floor(this.size / tilePx)
    this.canvas = document.createElement('canvas')
    this.canvas.width = this.size
    this.canvas.height = this.size
    const ctx = this.canvas.getContext('2d', { alpha: true })!
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, this.size, this.size)

    for (let i = 0; i < SLOT_ORDER.length; i++) {
      const slot = SLOT_ORDER[i]!
      const col = i % this.cols
      const row = (i / this.cols) | 0
      const x = col * tilePx
      const y = row * tilePx
      this.rects.set(slot, { u: x, v: y, w: tilePx, h: tilePx })
      paintSlot(ctx, slot, x, y, tilePx)
    }
    this.syncFromNature()
  }

  /** True once pack textures have been stamped into slots. */
  get packReady() {
    return this.syncedRev >= PACK_SYNC_REV
  }

  /** Stamp real pack textures over procedural fallbacks when nature atlas is ready. */
  syncFromNature(): boolean {
    if (this.syncedRev >= PACK_SYNC_REV) return false
    if (!isNatureReady()) return false
    const nature = getNatureAtlas()
    if (!nature) return false
    const ctx = this.canvas.getContext('2d', { alpha: true })!
    ctx.imageSmoothingEnabled = false
    let hit = 0
    for (const slot of SLOT_ORDER) {
      const rect = this.rects.get(slot)!
      const keys = PACK_KEYS[slot]
      let ok = false
      for (const k of keys) {
        if (!nature.has(k)) continue
        ok = nature.blit(ctx, k, rect.u, rect.v, rect.w, rect.h)
        if (ok) break
      }
      if (ok) hit++
      else paintSlot(ctx, slot, rect.u, rect.v, rect.w)

      // DF/RW cutaway: walls near-black mass; floors warm readable boards.
      if (slot.startsWith('timber') && !slot.startsWith('timberV')) {
        darkenRect(ctx, rect.u, rect.v, rect.w, rect.h, 0.58)
        ctx.fillStyle = 'rgba(0,0,0,0.45)'
        ctx.fillRect(rect.u, rect.v + Math.round(rect.h * 0.33), rect.w, 1)
        ctx.fillRect(rect.u, rect.v + Math.round(rect.h * 0.66), rect.w, 1)
        // Thin top highlight so wall reads as a block edge
        ctx.fillStyle = 'rgba(180,140,90,0.12)'
        ctx.fillRect(rect.u, rect.v, rect.w, 1)
      } else if (slot.startsWith('timberV')) {
        darkenRect(ctx, rect.u, rect.v, rect.w, rect.h, 0.52)
      } else if (slot.startsWith('stone')) {
        darkenRect(ctx, rect.u, rect.v, rect.w, rect.h, 0.38)
        ctx.fillStyle = 'rgba(0,0,0,0.5)'
        ctx.fillRect(rect.u, rect.v + Math.round(rect.h * 0.5), rect.w, 1)
        ctx.fillRect(rect.u + Math.round(rect.w * 0.5), rect.v, 1, rect.h)
      } else if (slot.startsWith('plank')) {
        // Warm floor boards — RimWorld interior (bright vs dark walls)
        ctx.fillStyle = 'rgba(255,220,150,0.12)'
        ctx.fillRect(rect.u, rect.v, rect.w, rect.h)
        ctx.fillStyle = 'rgba(40,24,10,0.32)'
        const rowH = Math.max(2, Math.round(rect.h / 4))
        for (let i = 1; i < 4; i++) {
          ctx.fillRect(rect.u, rect.v + i * rowH - 1, rect.w, 1)
        }
      }
    }
    if (hit > 0) {
      this.syncedRev = PACK_SYNC_REV
      return true
    }
    return false
  }

  rect(slot: AtlasSlot): AtlasRect {
    return this.rects.get(slot)!
  }

  plankSlot(wx: number, wy: number): AtlasSlot {
    const v = (hash2(wx, wy, 41) * 4) | 0
    return SLOT_ORDER[Math.min(3, v)] as AtlasSlot
  }

  timberSlot(wx: number, wy: number, vertical: boolean): AtlasSlot {
    if (vertical) return hash2(wx, wy, 13) > 0.5 ? 'timberV1' : 'timberV0'
    const v = (hash2(wx, wy, 13) * 4) | 0
    return (`timber${Math.min(3, v)}` as AtlasSlot)
  }

  stoneSlot(wx: number, wy: number): AtlasSlot {
    const v = (hash2(wx, wy, 21) * 4) | 0
    return (`stone${Math.min(3, v)}` as AtlasSlot)
  }

  dirtSlot(wx: number, wy: number): AtlasSlot {
    return hash2(wx, wy, 9) > 0.5 ? 'dirt1' : 'dirt0'
  }
}

function paintSlot(ctx: CanvasRenderingContext2D, slot: AtlasSlot, fx: number, fy: number, ts: number) {
  if (slot.startsWith('plank')) {
    // RimWorld floor — warm light boards (must pop vs near-black walls)
    const vi = Number(slot.slice(5))
    const warm = Math.max(148, Math.min(198, 168 + vi * 6))
    ctx.fillStyle = `rgb(${warm},${warm - 48},${warm - 96})`
    ctx.fillRect(fx, fy, ts, ts)
    const rows = 4
    const rowH = ts / rows
    for (let i = 0; i < rows; i++) {
      const y = fy + i * rowH
      ctx.fillStyle = (i + vi) & 1 ? 'rgba(40,24,10,0.12)' : 'rgba(255,230,170,0.1)'
      ctx.fillRect(fx, Math.round(y), ts, Math.max(1, Math.round(rowH) - 1))
      ctx.fillStyle = 'rgba(30,18,8,0.45)'
      ctx.fillRect(fx, Math.round(y + rowH) - 1, ts, 1)
    }
    return
  }

  if (slot.startsWith('dirt')) {
    const g = slot === 'dirt1' ? 78 : 92
    ctx.fillStyle = `rgb(${g},${g - 22},${g - 44})`
    ctx.fillRect(fx, fy, ts, ts)
    return
  }

  if (slot.startsWith('stone')) {
    // DF Premium dark stone mass
    const vi = Number(slot.slice(5))
    const base = 68 + vi * 4
    ctx.fillStyle = `rgb(${base},${base - 2},${base - 6})`
    ctx.fillRect(fx, fy, ts, ts)
    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    ctx.fillRect(fx, fy + Math.round(ts * 0.48), ts, 1)
    ctx.fillRect(fx + Math.round(ts * 0.5), fy, 1, ts)
    ctx.fillStyle = 'rgba(200,195,185,0.12)'
    ctx.fillRect(fx + 1, fy + 1, Math.max(1, ts - 2), 1)
    return
  }

  // Near-black timber walls — DF/RW cutaway silhouette
  const vertical = slot.startsWith('timberV')
  const vi = Number(slot.replace(/\D/g, '')) || 0
  const baseR = 36 + vi * 2
  const baseG = 24 + vi
  ctx.fillStyle = `rgb(${baseR},${baseG},14)`
  ctx.fillRect(fx, fy, ts, ts)
  if (vertical) {
    const cols = 3
    const cw = ts / cols
    for (let i = 0; i < cols; i++) {
      const x = fx + i * cw
      ctx.fillStyle = i % 2 === 0 ? 'rgba(200,150,90,0.05)' : 'rgba(0,0,0,0.28)'
      ctx.fillRect(Math.round(x), fy, Math.max(1, Math.round(cw * 0.55)), ts)
    }
  } else {
    const bands = 3
    const bh = ts / bands
    for (let i = 0; i < bands; i++) {
      const y = fy + i * bh
      ctx.fillStyle = i % 2 === 0 ? 'rgba(200,150,90,0.05)' : 'rgba(0,0,0,0.28)'
      ctx.fillRect(fx, Math.round(y), ts, Math.max(1, Math.round(bh * 0.55)))
    }
  }
  ctx.fillStyle = 'rgba(0,0,0,0.5)'
  ctx.fillRect(fx, fy, ts, 1)
  ctx.fillRect(fx, fy + ts - 1, ts, 1)
}
