import { BRIDGE, PATH, PORT, ROAD, TRAIL, WORLD_SIZE } from './types'
import { tileNoise } from './tileArt'

const TRAIL_COL = '#a87842'
const TRAIL_EDGE = '#6e4e28'
const PATH_COL = '#c09858'
const PATH_EDGE = '#8a6840'
const ROAD_COL = '#d0bc98'
const ROAD_MID = '#c4ae86'
const ROAD_EDGE = '#8e7a58'
const ROAD_RUT = '#6e5a3e'
const BRIDGE_COL = '#6e4e2e'
const BRIDGE_PLANK = '#8a6840'
const PORT_COL = '#5a3e24'
const PORT_PLANK = '#7a5838'
const SHOULDER = 'rgba(50, 38, 22, 0.16)'

function wayColor(t: number): string | null {
  if (t === TRAIL) return TRAIL_COL
  if (t === PATH) return PATH_COL
  if (t === ROAD) return ROAD_COL
  if (t === BRIDGE) return BRIDGE_COL
  if (t === PORT) return PORT_COL
  return null
}

function isWay(t: number) {
  return t === TRAIL || t === PATH || t === ROAD || t === BRIDGE || t === PORT
}

function widthFor(t: number, zoomedOut: boolean) {
  if (zoomedOut) {
    if (t === ROAD) return 0.94
    if (t === PATH) return 0.8
    if (t === TRAIL) return 0.58
    if (t === BRIDGE) return 0.86
    return 0.82
  }
  if (t === ROAD) return 0.76
  if (t === PATH) return 0.58
  if (t === TRAIL) return 0.4
  if (t === BRIDGE) return 0.7
  return 0.64
}

/** Dirt tracks in camera space so they pan/zoom with the map (Banished / Manor Lords). */
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
  const x0 = Math.max(0, Math.floor(camX / tilePx) - 1)
  const y0 = Math.max(0, Math.floor(camY / tilePx) - 1)
  const x1 = Math.min(WORLD_SIZE, Math.ceil((camX + viewSize) / tilePx) + 1)
  const y1 = Math.min(WORLD_SIZE, Math.ceil((camY + viewSize) / tilePx) + 1)
  if ((x1 - x0) * (y1 - y0) > 10000) return
  // Zoomed far out: roads already in the world bitmap — skip overlay pass.
  if (tileS < 3.2) return

  const zoomedOut = tileS < 5
  const detail = tileS >= 9
  const rich = tileS >= 13

  for (let gy = y0; gy < y1; gy++) {
    const row = gy * WORLD_SIZE
    for (let gx = x0; gx < x1; gx++) {
      const t = terrain[row + gx]
      if (t !== TRAIL && t !== PATH && t !== ROAD && t !== BRIDGE && t !== PORT) continue
      const col = wayColor(t)
      if (!col) continue
      const px = (gx * tilePx - camX) * zoom
      const py = (gy * tilePx - camY) * zoom
      const w = widthFor(t, zoomedOut)
      const inset = (1 - w) * 0.5
      const ix = px + inset * tileS
      const iy = py + inset * tileS
      const iw = w * tileS

      // Far zoom: single fill only (no neighbor bridges / detail).
      if (zoomedOut) {
        ctx.fillStyle = col
        ctx.fillRect(ix, iy, iw, iw)
        continue
      }

      const n = gy > 0 && isWay(terrain[row - WORLD_SIZE + gx])
      const s = gy < WORLD_SIZE - 1 && isWay(terrain[row + WORLD_SIZE + gx])
      const e = gx < WORLD_SIZE - 1 && isWay(terrain[row + gx + 1])
      const west = gx > 0 && isWay(terrain[row + gx - 1])

      // Soft shoulder — worn ground bleeding into grass.
      if (detail && t !== BRIDGE && t !== PORT) {
        ctx.fillStyle = SHOULDER
        const sh = tileS * 0.12
        ctx.fillRect(ix - sh, iy - sh * 0.4, iw + sh * 2, iw + sh * 0.8)
      }

      ctx.fillStyle = col
      ctx.fillRect(ix, iy, iw, iw)
      if (n) ctx.fillRect(ix, py, iw, tileS * 0.5 + iw * 0.5)
      if (s) ctx.fillRect(ix, iy, iw, tileS - inset * tileS)
      if (west) ctx.fillRect(px, iy, tileS * 0.5 + iw * 0.5, iw)
      if (e) ctx.fillRect(ix, iy, tileS - inset * tileS, iw)

      if (detail && t === ROAD) {
        // Mid-pack lighter dust
        ctx.fillStyle = ROAD_MID
        ctx.fillRect(ix + iw * 0.12, iy + iw * 0.12, iw * 0.76, iw * 0.76)
        // Twin cart ruts
        ctx.fillStyle = ROAD_RUT
        const rut = Math.max(0.9, tileS * 0.09)
        const vertical = n || s
        const horizontal = west || e
        if (vertical && !horizontal) {
          ctx.fillRect(ix + iw * 0.28, iy + 1, rut, iw - 2)
          ctx.fillRect(ix + iw * 0.62, iy + 1, rut, iw - 2)
        } else if (horizontal && !vertical) {
          ctx.fillRect(ix + 1, iy + iw * 0.28, iw - 2, rut)
          ctx.fillRect(ix + 1, iy + iw * 0.62, iw - 2, rut)
        } else {
          ctx.fillRect(ix + iw * 0.28, iy + 1, rut, iw - 2)
          ctx.fillRect(ix + iw * 0.62, iy + 1, rut, iw - 2)
        }
        // Edge wear
        ctx.fillStyle = ROAD_EDGE
        const edge = Math.max(0.7, tileS * 0.05)
        ctx.fillRect(ix, iy, edge, iw)
        ctx.fillRect(ix + iw - edge, iy, edge, iw)
        if (rich) {
          const speck = tileNoise(gx, gy)
          if (speck > 0.55) {
            ctx.fillStyle = 'rgba(90, 72, 48, 0.28)'
            ctx.fillRect(ix + iw * speck * 0.7, iy + iw * tileNoise(gx + 2, gy) * 0.7, Math.max(1, tileS * 0.08), Math.max(1, tileS * 0.06))
          }
        }
      } else if (detail && t === PATH) {
        ctx.fillStyle = PATH_EDGE
        const edge = Math.max(0.6, tileS * 0.045)
        ctx.fillRect(ix, iy, edge, iw)
        ctx.fillRect(ix + iw - edge, iy, edge, iw)
        if (rich) {
          ctx.fillStyle = 'rgba(70, 52, 28, 0.2)'
          ctx.fillRect(ix + iw * 0.35, iy + 1, Math.max(0.8, tileS * 0.06), iw - 2)
        }
      } else if (detail && t === TRAIL) {
        ctx.fillStyle = TRAIL_EDGE
        ctx.fillRect(ix, iy + iw * 0.32, iw, Math.max(1, iw * 0.16))
        if (rich) {
          ctx.fillStyle = 'rgba(60, 44, 24, 0.22)'
          const wobble = (tileNoise(gx, gy) - 0.5) * iw * 0.15
          ctx.fillRect(ix + wobble, iy + iw * 0.4, iw, Math.max(1, iw * 0.1))
        }
      } else if (detail && t === BRIDGE) {
        ctx.fillStyle = BRIDGE_PLANK
        const plank = Math.max(1.2, tileS * 0.14)
        const across = (west || e) && !(n || s)
        if (across) {
          for (let i = 0; i < 4; i++) {
            ctx.fillRect(ix + 1, iy + i * plank * 1.15, iw - 2, plank * 0.7)
          }
        } else {
          for (let i = 0; i < 4; i++) {
            ctx.fillRect(ix + i * plank * 1.15, iy + 1, plank * 0.7, iw - 2)
          }
        }
        ctx.fillStyle = '#4a3420'
        ctx.fillRect(ix, iy, Math.max(1, tileS * 0.06), iw)
        ctx.fillRect(ix + iw - Math.max(1, tileS * 0.06), iy, Math.max(1, tileS * 0.06), iw)
      } else if (detail && t === PORT) {
        ctx.fillStyle = PORT_PLANK
        const plank = Math.max(1, tileS * 0.1)
        for (let i = 0; i < 3; i++) {
          ctx.fillRect(ix + 2, iy + 2 + i * plank * 1.3, iw - 4, plank * 0.75)
        }
        if (rich) {
          ctx.fillStyle = '#3a2818'
          ctx.fillRect(ix + iw * 0.75, iy - tileS * 0.15, Math.max(1, tileS * 0.08), tileS * 0.35)
        }
      }
    }
  }
}
