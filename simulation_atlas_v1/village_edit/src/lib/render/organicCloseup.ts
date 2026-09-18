/**
 * Organic close-up overlays.
 * Houses: handled by BuildChunkRenderer (chunk mesh + greedy atlas blit).
 * This pass draws vegetation / mills / props only — never per-tile mini-houses.
 */
import {
  BED,
  BENCH,
  BRIDGE,
  BUSH,
  CHEST,
  CRADLE,
  CUPBOARD,
  FENCE,
  HEARTH,
  HOUSE,
  LOOM,
  MILL,
  MOUNTAIN,
  PLANK,
  PORT,
  SHELF,
  STOOL,
  TABLE,
  TREE,
  WALL_STONE,
  WALL_WOOD,
  WASHING_TUB,
  WATER,
  WHEAT,
  WORKBENCH,
} from '@/lib/sim/types'
import { hash2 } from './noise'
import { getNatureAtlas, isNatureReady, isNaturalTerrain } from './nature'
import { drawGroundShadow, drawNorthLit, drawSouthFace } from './fauxHeight'

/** Soft codes — not exported on canon types yet (Lot 2 local). */
const WELL = 37
const PLAZA_FIRE = 38

/** Skip building cells — floors/walls/furniture come from BuildChunkRenderer. */
const BUILDING = new Set([
  HOUSE,
  PLANK,
  WALL_WOOD,
  WALL_STONE,
  BED,
  CHEST,
  WORKBENCH,
  TABLE,
  HEARTH,
  BENCH,
  STOOL,
  SHELF,
  CUPBOARD,
  CRADLE,
  LOOM,
  WASHING_TUB,
])

export function drawOrganicCloseup(
  ctx: CanvasRenderingContext2D,
  terrain: Uint8Array,
  amount: Uint16Array,
  camX: number,
  camY: number,
  zoom: number,
  visible: number,
  tilePx: number,
  timeMs: number,
) {
  const tileS = tilePx * zoom
  if (tileS < 3.5) return

  ctx.imageSmoothingEnabled = false

  const worldW = Math.sqrt(terrain.length) | 0
  const x0 = Math.max(0, Math.floor(camX / tilePx) - 1)
  const y0 = Math.max(0, Math.floor(camY / tilePx) - 1)
  const x1 = Math.min(worldW - 1, Math.ceil((camX + visible) / tilePx) + 1)
  const y1 = Math.min(worldW - 1, Math.ceil((camY + visible) / tilePx) + 1)

  const sx = (tx: number, ox = 0.5) => (tx * tilePx + ox * tilePx - camX) * zoom
  const sy = (ty: number, oy = 0.5) => (ty * tilePx + oy * tilePx - camY) * zoom

  // Buildings (floors/walls/furniture) → BuildChunkRenderer in SimulationCanvas.

  if (tileS < 5.5) return

  const flicker = 0.55 + 0.45 * Math.sin(timeMs * 0.008)

  for (let ty = y0; ty <= y1; ty++) {
    const row = ty * worldW
    for (let tx = x0; tx <= x1; tx++) {
      const id = terrain[row + tx]
      if (BUILDING.has(id)) continue

      const am = amount[row + tx]
      // Nature closeup already owns trees / bushes / mountains / wheat / water.
      if (isNatureReady() && isNaturalTerrain(id, am)) continue
      const h = hash2(tx, ty, 7)
      const h2 = hash2(tx, ty, 19)
      const jx = (h - 0.5) * 0.6
      const jy = (h2 - 0.5) * 0.6

      if (id === MILL && tileS >= 8) drawMill(ctx, sx(tx, 0.5), sy(ty, 0.5), tileS, h)
      else if (id === PORT && tileS >= 8) drawPort(ctx, sx(tx, 0.5), sy(ty, 0.5), tileS)
      else if (id === WELL && tileS >= 6) drawWell(ctx, sx(tx, 0.5), sy(ty, 0.5), tileS, h)
      else if (id === PLAZA_FIRE && tileS >= 6) drawPlazaFire(ctx, sx(tx, 0.5), sy(ty, 0.5), tileS, h, flicker)
      else if (id === FENCE && tileS >= 6) {
        const n = ty > 0 && terrain[row - worldW + tx] === FENCE
        const s = ty + 1 < worldW && terrain[row + worldW + tx] === FENCE
        const e = tx + 1 < worldW && terrain[row + tx + 1] === FENCE
        const w = tx > 0 && terrain[row + tx - 1] === FENCE
        drawFence(ctx, sx(tx, 0.5), sy(ty, 0.5), tileS, n, s, e, w)
      }
      else if (id === BRIDGE && tileS >= 7) drawBridge(ctx, sx(tx, 0.5), sy(ty, 0.5), tileS)
    }
  }
}

function drawTree(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tileS: number,
  h: number,
  h2: number,
) {
  const s = Math.round(tileS)
  const cx = Math.round(x)
  const cy = Math.round(y)
  ctx.fillStyle = 'rgba(0,0,0,0.2)'
  ctx.fillRect(cx - s * 0.25, cy + s * 0.15, s * 0.5, s * 0.2)
  ctx.fillStyle = `rgb(${70 + h * 20 | 0},${48},${24})`
  ctx.fillRect(cx - s * 0.08, cy - s * 0.05, Math.max(2, s * 0.16), s * 0.4)
  const leaf = `rgb(${28 + h * 28 | 0},${78 + h2 * 40 | 0},${30})`
  const leaf2 = `rgb(${40 + h2 * 24 | 0},${98 + h * 30 | 0},${38})`
  ctx.fillStyle = leaf
  ctx.fillRect(cx - s * 0.38, cy - s * 0.45, s * 0.76, s * 0.5)
  ctx.fillStyle = leaf2
  ctx.fillRect(cx - s * 0.28, cy - s * 0.58, s * 0.56, s * 0.35)
}

function drawBush(ctx: CanvasRenderingContext2D, x: number, y: number, tileS: number, h: number) {
  const cx = Math.round(x)
  const cy = Math.round(y)
  const s = Math.round(tileS)
  ctx.fillStyle = `rgb(${45 + h * 35 | 0},${95 + h * 40 | 0},${38})`
  ctx.fillRect(cx - s * 0.28, cy - s * 0.12, s * 0.56, s * 0.38)
  if (h > 0.65) {
    ctx.fillStyle = '#c04040'
    ctx.fillRect(cx + s * 0.05, cy, Math.max(2, s * 0.1), Math.max(2, s * 0.1))
  }
}

function drawWheat(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tileS: number,
  amount: number,
  h: number,
) {
  const ripe = amount >= 300
  ctx.fillStyle = ripe ? '#d4a83a' : '#6a9a48'
  const cx = Math.round(x)
  const cy = Math.round(y)
  for (let i = 0; i < 4; i++) {
    const ox = Math.round((i / 4 - 0.4) * tileS * 0.7 + (h - 0.5) * 2)
    ctx.fillRect(cx + ox, cy - tileS * 0.25, Math.max(1, tileS * 0.06), tileS * 0.45)
  }
}

function drawRock(ctx: CanvasRenderingContext2D, x: number, y: number, tileS: number, h: number) {
  const cx = Math.round(x)
  const cy = Math.round(y)
  const s = Math.round(tileS)
  ctx.fillStyle = `rgb(${95 + h * 35 | 0},${92},${86})`
  ctx.fillRect(cx - s * 0.3, cy - s * 0.15, s * 0.6, s * 0.4)
  ctx.fillStyle = `rgb(${75 + h * 20 | 0},${72},${68})`
  ctx.fillRect(cx - s * 0.18, cy - s * 0.28, s * 0.4, s * 0.25)
}

/** Static mill — cobble body + plank roof from pack. */
function drawMill(ctx: CanvasRenderingContext2D, x: number, y: number, tileS: number, h: number) {
  const cx = Math.round(x)
  const cy = Math.round(y)
  const s = Math.round(tileS)
  const atlas = isNatureReady() ? getNatureAtlas() : null
  ctx.fillStyle = 'rgba(0,0,0,0.2)'
  ctx.fillRect(cx - s * 0.22, cy + s * 0.22, s * 0.44, s * 0.14)
  if (atlas) {
    atlas.blit(ctx, 'brick_cobble', cx - s * 0.2, cy - s * 0.04, s * 0.4, s * 0.4) ||
      atlas.blit(ctx, 'cobble', cx - s * 0.2, cy - s * 0.04, s * 0.4, s * 0.4)
    atlas.blit(ctx, 'plank_oak', cx - s * 0.26, cy - s * 0.18, s * 0.52, s * 0.14)
    atlas.blit(ctx, 'plank_maple', cx - s * 0.16, cy - s * 0.28, s * 0.32, s * 0.12)
    atlas.blit(ctx, 'log_oak', cx - s * 0.06, cy + s * 0.14, s * 0.12, s * 0.2)
  } else {
    ctx.fillStyle = `rgb(${120 + ((h * 16) | 0)},${116},${108})`
    ctx.fillRect(cx - s * 0.2, cy - s * 0.04, s * 0.4, s * 0.4)
    ctx.fillStyle = '#5a3e24'
    ctx.fillRect(cx - s * 0.26, cy - s * 0.18, s * 0.52, s * 0.14)
    ctx.fillStyle = '#3a2814'
    ctx.fillRect(cx - s * 0.16, cy - s * 0.28, s * 0.32, s * 0.12)
    ctx.fillStyle = '#4a3018'
    ctx.fillRect(cx - s * 0.06, cy + s * 0.14, s * 0.12, s * 0.2)
  }
  ctx.fillStyle = '#d8c8a8'
  const arm = Math.max(2, s * 0.08)
  ctx.fillRect(cx - s * 0.34, cy - s * 0.08, s * 0.68, arm)
  ctx.fillRect(cx - arm * 0.5, cy - s * 0.38, arm, s * 0.58)
  drawSouthFace(ctx, cx - s * 0.2, cy - s * 0.04, s * 0.4, s * 0.4, s * 0.12, 0.22)
  drawNorthLit(ctx, cx - s * 0.2, cy - s * 0.04, s * 0.4, Math.max(1, s * 0.05))
}

function drawPort(ctx: CanvasRenderingContext2D, x: number, y: number, tileS: number) {
  const cx = Math.round(x)
  const cy = Math.round(y)
  const s = Math.round(tileS)
  ctx.fillStyle = '#4a321c'
  ctx.fillRect(cx - s * 0.45, cy - s * 0.1, s * 0.9, s * 0.4)
  ctx.fillStyle = '#7a5838'
  const plank = Math.max(1, Math.round(s * 0.08))
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(cx - s * 0.4, cy - s * 0.02 + i * plank * 1.35, s * 0.8, plank)
  }
}

/** Stone ring + water + wood posts — DF/RW icon, grass underlay from WorldGl. */
function drawWell(ctx: CanvasRenderingContext2D, x: number, y: number, tileS: number, _h: number) {
  const cx = Math.round(x)
  const cy = Math.round(y)
  const s = Math.round(tileS)
  drawGroundShadow(ctx, cx - s * 0.28, cy + s * 0.12, s * 0.56, s * 0.22, 0.2)

  // Outer stone ring (dark outline + grey face)
  const rw = Math.round(s * 0.52)
  const rh = Math.round(s * 0.34)
  const rx = cx - Math.round(rw * 0.5)
  const ry = cy - Math.round(s * 0.02)
  ctx.fillStyle = '#1a1814'
  ctx.fillRect(rx - 1, ry - 1, rw + 2, rh + 2)
  ctx.fillStyle = '#7a7670'
  ctx.fillRect(rx, ry, rw, rh)
  ctx.fillStyle = '#5a5650'
  ctx.fillRect(rx + 2, ry + Math.round(rh * 0.55), rw - 4, Math.round(rh * 0.35))
  // Water hole
  ctx.fillStyle = '#1e4058'
  ctx.fillRect(rx + Math.round(rw * 0.22), ry + Math.round(rh * 0.18), Math.round(rw * 0.56), Math.round(rh * 0.42))
  ctx.fillStyle = '#3a6a88'
  ctx.fillRect(rx + Math.round(rw * 0.3), ry + Math.round(rh * 0.24), Math.round(rw * 0.4), Math.round(rh * 0.22))
  // Posts + crossbeam
  ctx.fillStyle = '#3a2410'
  const postW = Math.max(2, Math.round(s * 0.08))
  ctx.fillRect(cx - Math.round(s * 0.22), cy - Math.round(s * 0.32), postW, Math.round(s * 0.34))
  ctx.fillRect(cx + Math.round(s * 0.14), cy - Math.round(s * 0.32), postW, Math.round(s * 0.34))
  ctx.fillStyle = '#6a4828'
  ctx.fillRect(cx - Math.round(s * 0.24), cy - Math.round(s * 0.34), Math.round(s * 0.48), Math.max(2, Math.round(s * 0.08)))
  // Roof highlight
  ctx.fillStyle = 'rgba(220,200,160,0.18)'
  ctx.fillRect(cx - Math.round(s * 0.24), cy - Math.round(s * 0.34), Math.round(s * 0.48), 1)
}

/** Campfire: cobble ring + crossed logs + flame — compact RW plaza prop. */
function drawPlazaFire(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tileS: number,
  _h: number,
  flicker: number,
) {
  const cx = Math.round(x)
  const cy = Math.round(y)
  const s = Math.round(tileS)
  ctx.fillStyle = 'rgba(0,0,0,0.22)'
  ctx.fillRect(cx - s * 0.26, cy + s * 0.18, s * 0.52, s * 0.14)

  // Stone ring
  const rw = Math.round(s * 0.48)
  const rh = Math.round(s * 0.28)
  const rx = cx - Math.round(rw * 0.5)
  const ry = cy + Math.round(s * 0.02)
  ctx.fillStyle = '#1a1814'
  ctx.fillRect(rx - 1, ry - 1, rw + 2, rh + 2)
  ctx.fillStyle = '#6a6660'
  ctx.fillRect(rx, ry, rw, rh)
  ctx.fillStyle = '#4a4640'
  ctx.fillRect(rx + 2, ry + 2, rw - 4, rh - 4)

  // Crossed logs
  ctx.fillStyle = '#4a3018'
  ctx.fillRect(cx - Math.round(s * 0.18), cy + Math.round(s * 0.08), Math.round(s * 0.36), Math.max(2, Math.round(s * 0.08)))
  ctx.fillStyle = '#5a3c20'
  ctx.fillRect(cx - Math.round(s * 0.06), cy + Math.round(s * 0.02), Math.max(2, Math.round(s * 0.08)), Math.round(s * 0.2))

  // Flame (fillRect only — no soft arc glow lag)
  const fr = (230 + flicker * 25) | 0
  const fg = (100 + flicker * 70) | 0
  ctx.fillStyle = `rgb(${fr},${fg},28)`
  ctx.fillRect(cx - Math.round(s * 0.1), cy - Math.round(s * 0.22), Math.round(s * 0.2), Math.round(s * 0.28))
  ctx.fillStyle = `rgb(255,${(200 + flicker * 40) | 0},80)`
  ctx.fillRect(cx - Math.round(s * 0.05), cy - Math.round(s * 0.3), Math.round(s * 0.1), Math.round(s * 0.18))
  ctx.fillStyle = `rgba(255,250,200,${0.45 + flicker * 0.35})`
  ctx.fillRect(cx - Math.round(s * 0.03), cy - Math.round(s * 0.34), Math.round(s * 0.06), Math.round(s * 0.1))
}

function drawFence(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tileS: number,
  n: boolean,
  s: boolean,
  e: boolean,
  w: boolean,
) {
  const cx = Math.round(x)
  const cy = Math.round(y)
  const sz = Math.round(tileS)
  const post = Math.max(2, Math.round(sz * 0.12))
  const railH = Math.max(1, Math.round(sz * 0.08))
  const linked = n || s || e || w
  const atlas = isNatureReady() ? getNatureAtlas() : null
  ctx.fillStyle = 'rgba(0,0,0,0.18)'
  ctx.fillRect(cx - post, cy + sz * 0.18, post * 2, Math.max(1, sz * 0.1))
  if (atlas) atlas.blit(ctx, 'log_oak', cx - post * 0.5, cy - sz * 0.22, post, sz * 0.48)
  else {
    ctx.fillStyle = '#5a3c20'
    ctx.fillRect(cx - post * 0.5, cy - sz * 0.22, post, sz * 0.48)
  }
  const railY = cy - sz * 0.04
  const railY2 = cy + sz * 0.1
  const reach = linked ? sz * 0.5 : sz * 0.22
  const paintRail = (dx: number, dy: number, dw: number, dh: number) => {
    if (atlas) atlas.blit(ctx, 'plank_pine', dx, dy, dw, dh)
    else {
      ctx.fillStyle = '#6a4a2c'
      ctx.fillRect(dx, dy, dw, dh)
    }
  }
  if (w || !linked) paintRail(cx - reach, railY, reach, railH)
  if (e || !linked) paintRail(cx, railY, reach, railH)
  if (n) paintRail(cx - railH * 0.5, cy - sz * 0.5, railH, sz * 0.5)
  if (s) paintRail(cx - railH * 0.5, cy, railH, sz * 0.32)
  if (w || e || !linked) {
    paintRail(
      cx - (w || !linked ? reach : 0),
      railY2,
      (w || !linked ? reach : 0) + (e || !linked ? reach : 0),
      Math.max(1, railH * 0.7),
    )
  }
  drawSouthFace(ctx, cx - post, cy - sz * 0.22, post * 2, sz * 0.48, sz * 0.08, 0.2)
}

function drawBridge(ctx: CanvasRenderingContext2D, x: number, y: number, tileS: number) {
  const cx = Math.round(x)
  const cy = Math.round(y)
  const s = Math.round(tileS)
  ctx.fillStyle = '#4a3420'
  ctx.fillRect(cx - s * 0.38, cy - s * 0.08, s * 0.76, s * 0.32)
  ctx.fillStyle = '#8a6840'
  const plank = Math.max(1, Math.round(s * 0.1))
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(cx - s * 0.32 + i * plank * 1.35, cy - s * 0.02, plank, s * 0.2)
  }
  ctx.fillStyle = '#5a3e24'
  ctx.fillRect(cx - s * 0.4, cy - s * 0.1, Math.max(1, s * 0.06), s * 0.36)
  ctx.fillRect(cx + s * 0.34, cy - s * 0.1, Math.max(1, s * 0.06), s * 0.36)
}
