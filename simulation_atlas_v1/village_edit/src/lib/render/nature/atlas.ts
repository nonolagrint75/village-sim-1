import { avgPacked, NATURE_TILE_PX, type TilePx } from "./textureLab"

export type AtlasSlot = { sx: number; sy: number; w: number; h: number }

export class NatureAtlas {
  readonly canvas: HTMLCanvasElement
  readonly ctx: CanvasRenderingContext2D
  readonly size: number
  readonly tile: number
  private cx = 0
  private cy = 0
  private rowH = 0
  readonly slots = new Map<string, AtlasSlot>()
  readonly packed = new Map<string, number>()

  constructor(size = 2048) {
    this.size = size
    this.tile = NATURE_TILE_PX
    this.canvas = document.createElement("canvas")
    this.canvas.width = size
    this.canvas.height = size
    const ctx = this.canvas.getContext("2d", { alpha: true })
    if (!ctx) throw new Error("nature atlas: no 2d context")
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, size, size)
    this.ctx = ctx
  }

  has(key: string) {
    return this.slots.has(key)
  }

  slot(key: string) {
    return this.slots.get(key)
  }

  private slotOrFallback(key: string): AtlasSlot | undefined {
    const hit = this.slots.get(key)
    if (hit) return hit
    const cut = key.lastIndexOf("_")
    if (cut > 0) {
      const base = this.slots.get(key.slice(0, cut))
      if (base) return base
    }
    if (key.startsWith("tree_")) return this.slots.get("tree_oak") ?? this.slots.get("tree_pine")
    if (key.startsWith("boulder")) return this.slots.get("boulder")
    if (key.startsWith("grass")) return this.slots.get("grass")
    if (key.startsWith("mountain")) return this.slots.get("mountain_plateau")
    return this.slots.get("grass")
  }

  put(key: string, tile: TilePx) {
    const w = tile.width
    const h = tile.height
    const existing = this.slots.get(key)
    if (existing && existing.w === w && existing.h === h) {
      this.ctx.putImageData(tile, existing.sx, existing.sy)
      this.packed.set(key, avgPacked(tile))
      return
    }
    if (this.cx + w > this.size) {
      this.cx = 0
      this.cy += this.rowH
      this.rowH = 0
    }
    if (this.cy + h > this.size) return
    this.ctx.putImageData(tile, this.cx, this.cy)
    this.slots.set(key, { sx: this.cx, sy: this.cy, w, h })
    this.packed.set(key, avgPacked(tile))
    this.cx += w
    if (h > this.rowH) this.rowH = h
  }

  blit(ctx: CanvasRenderingContext2D, key: string, dx: number, dy: number, dw: number, dh: number) {
    const s = this.slotOrFallback(key)
    if (!s) return false
    ctx.drawImage(this.canvas, s.sx, s.sy, s.w, s.h, dx, dy, dw, dh)
    return true
  }

  blitRect(
    ctx: CanvasRenderingContext2D,
    key: string,
    srcX: number,
    srcY: number,
    srcW: number,
    srcH: number,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
  ) {
    const s = this.slotOrFallback(key)
    if (!s) return false
    const sx = Math.max(0, srcX)
    const sy = Math.max(0, srcY)
    const sw = Math.min(srcW, s.w - sx)
    const sh = Math.min(srcH, s.h - sy)
    if (sw <= 0 || sh <= 0) return false
    ctx.drawImage(this.canvas, s.sx + sx, s.sy + sy, sw, sh, dx, dy, dw, dh)
    return true
  }

  color32(key: string): number | null {
    const direct = this.packed.get(key)
    if (direct != null) return direct
    const cut = key.lastIndexOf("_")
    if (cut > 0) {
      const base = this.packed.get(key.slice(0, cut))
      if (base != null) return base
    }
    if (key.startsWith("tree_")) return this.packed.get("tree_oak") ?? this.packed.get("tree_pine") ?? null
    if (key.startsWith("grass")) return this.packed.get("grass") ?? null
    if (key.startsWith("mountain")) return this.packed.get("mountain_plateau") ?? null
    if (key.startsWith("boulder")) return this.packed.get("boulder") ?? null
    return this.packed.get("grass") ?? null
  }
}
