/**
 * Worn ways = grass cell + thin dirt/gravel ribbon (Puny / pack), never a full yellow slab.
 */
import { BRIDGE, HOUSE, MILL, PATH, PLANK, PORT, ROAD, TRAIL, WALL_STONE, WALL_WOOD, WORLD_SIZE } from './types'
import { getNatureAtlas, isNatureReady } from '@/lib/render/nature'
import { tileNoise } from './tileArt'

function isDirt(t: number) {
  return t === TRAIL || t === PATH || t === ROAD
}

function isAnchor(t: number) {
  return (
    isDirt(t) ||
    t === BRIDGE ||
    t === PORT ||
    t === HOUSE ||
    t === MILL ||
    t === PLANK ||
    t === WALL_WOOD ||
    t === WALL_STONE
  )
}

/** Ribbon width as fraction of tile — trail thin, path mid, road wider but never full. */
function ribbonFrac(t: number): number {
  if (t === ROAD) return 0.48
  if (t === PATH) return 0.34
  return 0.2
}

function ribbonColor(t: number): { base: string; edge: string; joint: string } {
  if (t === ROAD) {
    return {
      base: 'rgba(118,92,58,0.86)',
      edge: 'rgba(168,140,96,0.32)',
      joint: 'rgba(110,88,58,0.78)',
    }
  }
  if (t === PATH) {
    return {
      base: 'rgba(108,84,54,0.76)',
      edge: 'rgba(155,128,88,0.26)',
      joint: 'rgba(100,78,50,0.62)',
    }
  }
  return {
    base: 'rgba(92,72,46,0.58)',
    edge: 'rgba(140,115,80,0.18)',
    joint: 'rgba(90,70,46,0.5)',
  }
}

export function drawWornWays(
  ctx: CanvasRenderingContext2D,
  terrain: Uint8Array,
  camX: number,
  camY: number,
  zoom: number,
  viewSize: number,
  tilePx: number,
) {
  const tileS = tilePx * zoom
  if (tileS < 3.0) return

  const x0 = Math.max(0, Math.floor(camX / tilePx) - 1)
  const y0 = Math.max(0, Math.floor(camY / tilePx) - 1)
  const x1 = Math.min(WORLD_SIZE - 1, Math.ceil((camX + viewSize) / tilePx) + 1)
  const y1 = Math.min(WORLD_SIZE - 1, Math.ceil((camY + viewSize) / tilePx) + 1)
  if ((x1 - x0) * (y1 - y0) > 12000) return

  const sample = (gx: number, gy: number) => {
    if (gx < 0 || gy < 0 || gx >= WORLD_SIZE || gy >= WORLD_SIZE) return 0
    return terrain[gy * WORLD_SIZE + gx]!
  }

  const atlas = isNatureReady() ? getNatureAtlas() : null
  const prevSmooth = ctx.imageSmoothingEnabled
  ctx.imageSmoothingEnabled = false
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  for (let gy = y0; gy <= y1; gy++) {
    for (let gx = x0; gx <= x1; gx++) {
      const t = sample(gx, gy)
      if (!isDirt(t)) continue
      const px = (gx * tilePx - camX) * zoom
      const py = (gy * tilePx - camY) * zoom
      const frac = ribbonFrac(t)
      const thick = Math.max(1.2, frac * tileS)
      const wobble = (tileNoise(gx, gy) - 0.5) * tileS * 0.06
      const cx = px + tileS * 0.5 + wobble
      const cy = py + tileS * 0.5 + wobble * 0.5

      const n = isAnchor(sample(gx, gy - 1))
      const s = isAnchor(sample(gx, gy + 1))
      const e = isAnchor(sample(gx + 1, gy))
      const w = isAnchor(sample(gx - 1, gy))
      const deg = (n ? 1 : 0) + (s ? 1 : 0) + (e ? 1 : 0) + (w ? 1 : 0)

      const strokeSeg = (ex: number, ey: number) => {
        // Soft dirt ribbon stroke (RW/Stardew path) — grade-distinct trail/path/road.
        const col = ribbonColor(t)
        ctx.strokeStyle = col.base
        ctx.lineWidth = thick
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(ex, ey)
        ctx.stroke()
        // Subtle highlight edge
        ctx.strokeStyle = col.edge
        ctx.lineWidth = Math.max(1, thick * 0.35)
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(ex, ey)
        ctx.stroke()
      }

      // Joint only at ends / forks — not a fat pad every cell.
      if (deg !== 2 && tileS >= 5) {
        ctx.fillStyle = ribbonColor(t).joint
        ctx.beginPath()
        ctx.arc(cx, cy, thick * 0.38, 0, Math.PI * 2)
        ctx.fill()
      }

      if (e && gx <= x1) {
        const ex = ((gx + 1) * tilePx + tilePx * 0.5 - camX) * zoom
        const ey = (gy * tilePx + tilePx * 0.5 - camY) * zoom
        strokeSeg(ex, ey)
      }
      if (s && gy <= y1) {
        const ex = (gx * tilePx + tilePx * 0.5 - camX) * zoom
        const ey = ((gy + 1) * tilePx + tilePx * 0.5 - camY) * zoom
        strokeSeg(ex, ey)
      }

      // Road: sparse cobble flecks; path: rare gravel flecks — grade readable at mid-zoom.
      if (atlas && tileS >= 9) {
        if (t === ROAD && tileNoise(gx, gy) > 0.55) {
          const inset = tileS * (0.5 - frac * 0.35)
          ctx.globalAlpha = 0.45
          atlas.blit(ctx, 'path_cobble', px + inset, py + inset, tileS - inset * 2, tileS - inset * 2)
          ctx.globalAlpha = 1
        } else if (t === PATH && tileNoise(gx, gy) > 0.78) {
          const inset = tileS * (0.5 - frac * 0.28)
          ctx.globalAlpha = 0.28
          atlas.blit(ctx, 'path_cobble', px + inset, py + inset, tileS - inset * 2, tileS - inset * 2)
          ctx.globalAlpha = 1
        }
      }
    }
  }

  for (let gy = y0; gy <= y1; gy++) {
    const row = gy * WORLD_SIZE
    for (let gx = x0; gx <= x1; gx++) {
      const t = terrain[row + gx]
      if (t !== BRIDGE && t !== PORT) continue
      const px = (gx * tilePx - camX) * zoom
      const py = (gy * tilePx - camY) * zoom
      const inset = tileS * 0.14
      if (atlas) {
        atlas.blit(ctx, 'plank_oak', px + inset, py + inset, tileS - inset * 2, tileS - inset * 2)
      } else {
        ctx.fillStyle = t === PORT ? '#5a3e24' : '#6e4e2e'
        ctx.fillRect(px + inset, py + inset, tileS - inset * 2, tileS - inset * 2)
      }
    }
  }

  ctx.imageSmoothingEnabled = prevSmooth
}
