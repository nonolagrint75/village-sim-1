/**
 * Performant block-building render path — RimWorld-style top-down cutaway.
 *
 * Chunk meshes + 2D greedy meshing + face culling + atlas blit.
 * No per-block draw calls at frame time for thousands of buildings.
 *
 * Input today: terrain HOUSE / PLANK / WALL_* / furniture cells.
 * Structured so a future BuildChunkDirty API can feed the same mesher.
 */
import {
  BED,
  BENCH,
  CHEST,
  CRADLE,
  CUPBOARD,
  HEARTH,
  HOUSE,
  LOOM,
  PLANK,
  SHELF,
  STOOL,
  TABLE,
  WALL_STONE,
  WALL_WOOD,
  WASHING_TUB,
  WORKBENCH,
} from '@/lib/sim/types'
import { TILE_PX } from '@/lib/sim/tileArt'
import { hash2 } from './noise'
import { BuildAtlas, type AtlasSlot } from './buildAtlas'
import { drawGroundShadow, drawNorthLit } from './fauxHeight'

/** Tiles per chunk side — matches `sim/build` CHUNK_SIZE (16). */
export const BUILD_CHUNK_TILES = 16
/** Internal mesh pixels per sim block — world TILE_PX stays 3; construction is still 1 cell. */
const BUILD_MESH_PX = 16

/**
 * Pack chunk coords — same layout as `sim/build/buildTypes.chunkKey`
 * so a future ChunkStore dirty list can feed this mesher directly.
 */
export function buildChunkKey(cx: number, cy: number): number {
  return ((cx & 0xffff) << 16) | (cy & 0xffff)
}

export function unpackBuildChunkKey(key: number): { cx: number; cy: number } {
  return { cx: (key >>> 16) & 0xffff, cy: key & 0xffff }
}

/** Material ids packed into greedy keys (0 = empty / skip). */
const MAT_FLOOR = 1
const MAT_DIRT = 2
const MAT_TIMBER = 3
const MAT_STONE = 4

const FURNITURE = new Set([
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

export function isBuildWall(t: number): boolean {
  return t === HOUSE || t === WALL_WOOD || t === WALL_STONE
}

export function isBuildFloor(t: number): boolean {
  return t === PLANK || FURNITURE.has(t)
}

export function isBuildCell(t: number): boolean {
  return isBuildWall(t) || isBuildFloor(t)
}

/** Future chunk API — optional dense payload; else sampler reads world terrain. */
export type BuildChunkDirty = {
  chunkX: number
  chunkY: number
  /** Optional BUILD_CHUNK_TILES² terrain slice (row-major). */
  cells?: Uint8Array
}

export type GreedyQuad = {
  /** Local tile origin inside chunk. */
  x: number
  y: number
  w: number
  h: number
  mat: number
  /** Deterministic atlas variant encoded as slot index hint. */
  variant: number
}

export type FurnitureInst = {
  wx: number
  wy: number
  terrain: number
  variety: number
}

type ChunkEntry = {
  cx: number
  cy: number
  canvas: HTMLCanvasElement
  quads: GreedyQuad[]
  furniture: FurnitureInst[]
  /** Fingerprint of building occupancy — skip remesh if unchanged. */
  fingerprint: number
}

function chunkKey(cx: number, cy: number): number {
  return buildChunkKey(cx, cy)
}

function packGreedyKey(mat: number, variant: number): number {
  return (mat << 8) | (variant & 0xff)
}

function unpackMat(key: number): number {
  return key >> 8
}

/**
 * Classic 2D greedy meshing — merge collinear same-material runs into quads.
 * Face culling is implicit: empty/different neighbors never merge across.
 */
export function greedyMesh2D(
  keys: Int32Array,
  stride: number,
  w: number,
  h: number,
): GreedyQuad[] {
  const used = new Uint8Array(w * h)
  const out: GreedyQuad[] = []

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * stride + x
      const ui = y * w + x
      if (used[ui]) continue
      const key = keys[i]
      if (key === 0) continue

      let qw = 1
      while (x + qw < w && !used[y * w + x + qw] && keys[y * stride + x + qw] === key) qw++

      let qh = 1
      outer: while (y + qh < h) {
        for (let dx = 0; dx < qw; dx++) {
          const ry = y + qh
          if (used[ry * w + x + dx] || keys[ry * stride + x + dx] !== key) break outer
        }
        qh++
      }

      for (let dy = 0; dy < qh; dy++) {
        for (let dx = 0; dx < qw; dx++) used[(y + dy) * w + x + dx] = 1
      }

      out.push({
        x,
        y,
        w: qw,
        h: qh,
        mat: unpackMat(key),
        variant: key & 0xff,
      })
    }
  }
  return out
}

/** Map greedy mat+variant → atlas slot (stable across the whole quad). */
function slotForMat(mat: number, variant: number): AtlasSlot {
  if (mat === MAT_FLOOR) return (`plank${variant & 3}` as AtlasSlot)
  if (mat === MAT_DIRT) return variant & 1 ? 'dirt1' : 'dirt0'
  if (mat === MAT_STONE) return (`stone${variant & 3}` as AtlasSlot)
  // Timber: 0–3 horizontal, 4–5 vertical
  if (variant >= 4) return variant === 5 ? 'timberV1' : 'timberV0'
  return (`timber${variant & 3}` as AtlasSlot)
}

/**
 * Exposed-edge face culling for wall quads — thin RimWorld outline (not fat bars).
 */
function strokeCulledEdges(
  ctx: CanvasRenderingContext2D,
  wallMask: Uint8Array,
  stride: number,
  qx: number,
  qy: number,
  qw: number,
  qh: number,
  ox: number,
  oy: number,
  ts: number,
) {
  ctx.fillStyle = 'rgba(28,18,10,0.42)'
  const line = Math.max(1, Math.round(ts * 0.045))

  for (let ly = 0; ly < qh; ly++) {
    for (let lx = 0; lx < qw; lx++) {
      const x = qx + lx
      const y = qy + ly
      const fx = ox + x * ts
      const fy = oy + y * ts
      const here = wallMask[y * stride + x]
      if (!here) continue

      const n = y <= 0 ? 0 : wallMask[(y - 1) * stride + x]
      const s = y + 1 >= stride ? 0 : wallMask[(y + 1) * stride + x]
      const w = x <= 0 ? 0 : wallMask[y * stride + x - 1]
      const e = x + 1 >= stride ? 0 : wallMask[y * stride + x + 1]

      if (!n) ctx.fillRect(fx, fy, ts, line)
      if (!s) ctx.fillRect(fx, fy + ts - line, ts, line)
      if (!w) ctx.fillRect(fx, fy, line, ts)
      if (!e) ctx.fillRect(fx + ts - line, fy, line, ts)
    }
  }
}

/**
 * Draw one wall cell as a RimWorld-style perimeter band:
 * shrink toward exterior so adjacent floor reads larger (S3).
 */
function blitWallInset(
  ctx: CanvasRenderingContext2D,
  atlas: BuildAtlas,
  slot: AtlasSlot,
  lx: number,
  ly: number,
  ts: number,
  wallMask: Uint8Array,
  floorMask: Uint8Array,
  stride: number,
) {
  const n = ly <= 0 ? 0 : wallMask[(ly - 1) * stride + lx]
  const s = ly + 1 >= stride ? 0 : wallMask[(ly + 1) * stride + lx]
  const w = lx <= 0 ? 0 : wallMask[ly * stride + lx - 1]
  const e = lx + 1 >= stride ? 0 : wallMask[ly * stride + lx + 1]
  const fn = ly > 0 && floorMask[(ly - 1) * stride + lx]
  const fs = ly + 1 < stride && floorMask[(ly + 1) * stride + lx]
  const fw = lx > 0 && floorMask[ly * stride + lx - 1]
  const fe = lx + 1 < stride && floorMask[ly * stride + lx + 1]

  // Inset from interior — thicker DF/RW walls (~70% band).
  const inset = Math.max(1, Math.round(ts * 0.22))
  let x0 = 0
  let y0 = 0
  let x1 = ts
  let y1 = ts
  if (fn && !n) y0 = inset
  if (fs && !s) y1 = ts - inset
  if (fw && !w) x0 = inset
  if (fe && !e) x1 = ts - inset
  // Corner/isolated walls: keep a readable band, not a postage stamp.
  if (x1 - x0 < ts * 0.5) {
    x0 = Math.round(ts * 0.1)
    x1 = ts - x0
  }
  if (y1 - y0 < ts * 0.5) {
    y0 = Math.round(ts * 0.1)
    y1 = ts - y0
  }

  const r = atlas.rect(slot)
  const dw = x1 - x0
  const dh = y1 - y0
  const dx = lx * ts + x0
  const dy = ly * ts + y0
  ctx.drawImage(atlas.canvas, r.u, r.v, r.w, r.h, dx, dy, dw, dh)

  // Clean cutaway: thin rim only — no hanging log/cobble south slab (looked filthy).
  if (!s) {
    ctx.fillStyle = 'rgba(0,0,0,0.28)'
    ctx.fillRect(dx, dy + dh - Math.max(1, Math.round(ts * 0.08)), dw, Math.max(1, Math.round(ts * 0.08)))
    drawGroundShadow(ctx, dx, dy + dh - 1, dw, Math.max(2, Math.round(ts * 0.12)), 0.14)
  } else {
    drawNorthLit(ctx, dx, dy, dw, Math.max(1, Math.round(ts * 0.05)))
  }
}

/** DF Premium / RimWorld furniture icons — crisp fillRect + black outline. */
function drawFurnitureSprite(
  ctx: CanvasRenderingContext2D,
  t: number,
  fx: number,
  fy: number,
  tileS: number,
  variety: number,
) {
  const pad = Math.max(2, Math.round(tileS * 0.14))
  const inner = tileS - pad * 2
  const x = fx + pad
  const y = fy + pad
  // Ground contact shadow
  ctx.fillStyle = 'rgba(0,0,0,0.28)'
  ctx.fillRect(x + 1, y + inner - Math.max(1, Math.round(inner * 0.08)), inner - 2, Math.max(2, Math.round(inner * 0.14)))

  const outline = (ox: number, oy: number, ow: number, oh: number) => {
    ctx.fillStyle = '#0a0806'
    ctx.fillRect(ox - 1, oy - 1, ow + 2, oh + 2)
  }

  if (t === BED) {
    outline(x, y, inner, inner)
    ctx.fillStyle = '#3a2410'
    ctx.fillRect(x, y, inner, inner)
    const blanket = variety > 0.55 ? '#2a4a7a' : variety > 0.3 ? '#c02828' : '#4a2860'
    ctx.fillStyle = blanket
    ctx.fillRect(x + 1, y + Math.round(inner * 0.28), inner - 2, Math.round(inner * 0.58))
    ctx.fillStyle = '#f0e8d8'
    ctx.fillRect(x + 1, y + 1, inner - 2, Math.round(inner * 0.22))
  } else if (t === CHEST) {
    const cx = x + Math.round(inner * 0.08)
    const cy = y + Math.round(inner * 0.18)
    const cw = Math.round(inner * 0.84)
    const ch = Math.round(inner * 0.64)
    outline(cx, cy, cw, ch)
    ctx.fillStyle = '#6a4218'
    ctx.fillRect(cx, cy, cw, ch)
    ctx.fillStyle = '#1a1006'
    ctx.fillRect(cx, cy + Math.round(ch * 0.78), cw, Math.max(2, Math.round(ch * 0.12)))
    ctx.fillStyle = '#e8c84a'
    ctx.fillRect(cx + Math.round(cw * 0.38), cy + Math.round(ch * 0.38), Math.round(cw * 0.24), Math.round(ch * 0.18))
  } else if (t === WORKBENCH) {
    outline(x, y + Math.round(inner * 0.12), inner, Math.round(inner * 0.76))
    ctx.fillStyle = '#8a5428'
    ctx.fillRect(x, y + Math.round(inner * 0.22), inner, Math.round(inner * 0.58))
    ctx.fillStyle = '#c8a868'
    ctx.fillRect(x + Math.round(inner * 0.06), y + Math.round(inner * 0.1), Math.round(inner * 0.88), Math.round(inner * 0.22))
    ctx.fillStyle = '#2a1808'
    ctx.fillRect(x + Math.round(inner * 0.1), y + Math.round(inner * 0.72), Math.max(2, Math.round(inner * 0.12)), Math.round(inner * 0.2))
    ctx.fillRect(x + Math.round(inner * 0.76), y + Math.round(inner * 0.72), Math.max(2, Math.round(inner * 0.12)), Math.round(inner * 0.2))
  } else if (t === TABLE) {
    const tw = Math.round(inner * 0.9)
    const th = Math.round(inner * 0.42)
    const tx = x + Math.round(inner * 0.05)
    const ty = y + Math.round(inner * 0.2)
    outline(tx, ty, tw, th + Math.round(inner * 0.28))
    ctx.fillStyle = '#8a6238'
    ctx.fillRect(tx, ty, tw, th)
    ctx.fillStyle = '#2a1808'
    const leg = Math.max(2, Math.round(inner * 0.12))
    ctx.fillRect(tx + Math.round(tw * 0.1), ty + th, leg, Math.round(inner * 0.28))
    ctx.fillRect(tx + tw - leg - Math.round(tw * 0.1), ty + th, leg, Math.round(inner * 0.28))
  } else if (t === HEARTH) {
    const hx = x + Math.round(inner * 0.06)
    const hy = y + Math.round(inner * 0.1)
    const hw = Math.round(inner * 0.88)
    const hh = Math.round(inner * 0.78)
    outline(hx, hy, hw, hh)
    ctx.fillStyle = '#4a4844'
    ctx.fillRect(hx, hy, hw, hh)
    ctx.fillStyle = '#ff5020'
    ctx.fillRect(hx + Math.round(hw * 0.22), hy + Math.round(hh * 0.32), Math.round(hw * 0.56), Math.round(hh * 0.4))
    ctx.fillStyle = '#ffe060'
    ctx.fillRect(hx + Math.round(hw * 0.34), hy + Math.round(hh * 0.38), Math.round(hw * 0.32), Math.round(hh * 0.22))
  } else if (t === LOOM) {
    outline(x + Math.round(inner * 0.08), y + Math.round(inner * 0.08), Math.round(inner * 0.84), Math.round(inner * 0.84))
    ctx.fillStyle = '#5a3820'
    ctx.fillRect(x + Math.round(inner * 0.1), y + Math.round(inner * 0.1), Math.round(inner * 0.8), Math.round(inner * 0.8))
    ctx.fillStyle = '#e8d8b8'
    ctx.fillRect(x + Math.round(inner * 0.16), y + Math.round(inner * 0.34), Math.round(inner * 0.68), Math.max(2, Math.round(inner * 0.1)))
    ctx.fillRect(x + Math.round(inner * 0.16), y + Math.round(inner * 0.52), Math.round(inner * 0.68), Math.max(2, Math.round(inner * 0.1)))
  } else if (t === CRADLE) {
    outline(x + Math.round(inner * 0.1), y + Math.round(inner * 0.18), Math.round(inner * 0.8), Math.round(inner * 0.64))
    ctx.fillStyle = '#d4b080'
    ctx.fillRect(x + Math.round(inner * 0.12), y + Math.round(inner * 0.2), Math.round(inner * 0.76), Math.round(inner * 0.6))
    ctx.fillStyle = '#f0e8d8'
    ctx.fillRect(x + Math.round(inner * 0.2), y + Math.round(inner * 0.32), Math.round(inner * 0.6), Math.round(inner * 0.28))
  } else if (t === CUPBOARD || t === SHELF) {
    outline(x + Math.round(inner * 0.1), y + Math.round(inner * 0.06), Math.round(inner * 0.8), Math.round(inner * 0.88))
    ctx.fillStyle = '#5a3820'
    ctx.fillRect(x + Math.round(inner * 0.12), y + Math.round(inner * 0.08), Math.round(inner * 0.76), Math.round(inner * 0.84))
    ctx.fillStyle = 'rgba(0,0,0,0.4)'
    ctx.fillRect(x + Math.round(inner * 0.18), y + Math.round(inner * 0.28), Math.round(inner * 0.64), 2)
    ctx.fillRect(x + Math.round(inner * 0.18), y + Math.round(inner * 0.52), Math.round(inner * 0.64), 2)
    ctx.fillStyle = '#e8c84a'
    ctx.fillRect(x + Math.round(inner * 0.6), y + Math.round(inner * 0.38), Math.max(2, Math.round(inner * 0.12)), Math.max(2, Math.round(inner * 0.12)))
  } else if (t === BENCH || t === STOOL) {
    const seatY = y + Math.round(inner * (t === STOOL ? 0.36 : 0.4))
    const seatH = Math.round(inner * (t === STOOL ? 0.28 : 0.32))
    const seatX = x + Math.round(inner * (t === STOOL ? 0.22 : 0.08))
    const seatW = Math.round(inner * (t === STOOL ? 0.56 : 0.84))
    outline(seatX, seatY, seatW, seatH + Math.round(inner * 0.22))
    ctx.fillStyle = '#7a6848'
    ctx.fillRect(seatX, seatY, seatW, seatH)
    ctx.fillStyle = '#2a1808'
    const leg = Math.max(2, Math.round(inner * 0.1))
    ctx.fillRect(seatX + 1, seatY + seatH, leg, Math.round(inner * 0.22))
    ctx.fillRect(seatX + seatW - leg - 1, seatY + seatH, leg, Math.round(inner * 0.22))
  } else if (t === WASHING_TUB) {
    outline(x + Math.round(inner * 0.1), y + Math.round(inner * 0.2), Math.round(inner * 0.8), Math.round(inner * 0.6))
    ctx.fillStyle = '#5a6870'
    ctx.fillRect(x + Math.round(inner * 0.12), y + Math.round(inner * 0.22), Math.round(inner * 0.76), Math.round(inner * 0.56))
    ctx.fillStyle = 'rgba(60,140,190,0.7)'
    ctx.fillRect(x + Math.round(inner * 0.2), y + Math.round(inner * 0.3), Math.round(inner * 0.6), Math.round(inner * 0.28))
  } else {
    outline(x + Math.round(inner * 0.08), y + Math.round(inner * 0.08), Math.round(inner * 0.84), Math.round(inner * 0.84))
    ctx.fillStyle = '#6a5840'
    ctx.fillRect(x + Math.round(inner * 0.1), y + Math.round(inner * 0.1), Math.round(inner * 0.8), Math.round(inner * 0.8))
  }
  ctx.fillStyle = 'rgba(255,248,220,0.14)'
  ctx.fillRect(x, y, inner, Math.max(1, Math.round(inner * 0.06)))
}
/**
 * Fort style: light coping on exterior stone only — no loud merlon teeth on cottages.
 */
function drawStoneBattlements(
  ctx: CanvasRenderingContext2D,
  wallMask: Uint8Array,
  wallKeys: Int32Array,
  stride: number,
  ts: number,
) {
  if (ts < 5) return
  const isStone = (i: number) => wallMask[i] !== 0 && unpackMat(wallKeys[i]!) === MAT_STONE
  const has = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < stride && y < stride && wallMask[y * stride + x] !== 0

  let stoneCells = 0
  for (let i = 0; i < stride * stride; i++) if (isStone(i)) stoneCells++
  // Tiny stone sheds stay plain; only larger stone rings get coping.
  if (stoneCells < 8) return

  for (let y = 0; y < stride; y++) {
    for (let x = 0; x < stride; x++) {
      const i = y * stride + x
      if (!isStone(i)) continue
      const n = has(x, y - 1)
      const s = has(x, y + 1)
      const w = has(x - 1, y)
      const e = has(x + 1, y)
      if (n && s && w && e) continue

      const px = x * ts
      const py = y * ts
      if (!n) {
        ctx.fillStyle = 'rgba(210,205,195,0.28)'
        ctx.fillRect(px, py, ts, Math.max(1, Math.round(ts * 0.12)))
      }
      if (!s) {
        ctx.fillStyle = 'rgba(0,0,0,0.22)'
        ctx.fillRect(px, py + ts - Math.max(1, Math.round(ts * 0.1)), ts, Math.max(1, Math.round(ts * 0.1)))
      }
      if (!w) {
        ctx.fillStyle = 'rgba(255,255,255,0.08)'
        ctx.fillRect(px, py, Math.max(1, Math.round(ts * 0.08)), ts)
      }
      if (!e) {
        ctx.fillStyle = 'rgba(0,0,0,0.16)'
        ctx.fillRect(px + ts - Math.max(1, Math.round(ts * 0.08)), py, Math.max(1, Math.round(ts * 0.08)), ts)
      }
    }
  }
}

/** Paint intentional door aperture on any perimeter gap next to floor (not south-only). */
function drawDoorApertures(
  ctx: CanvasRenderingContext2D,
  wallMask: Uint8Array,
  floorMask: Uint8Array,
  stride: number,
  ox: number,
  oy: number,
  ts: number,
  originX: number,
  originY: number,
) {
  const painted = new Set<string>()
  for (let y = 0; y < stride; y++) {
    for (let x = 0; x < stride; x++) {
      if (wallMask[y * stride + x]) continue
      const floorHere = floorMask[y * stride + x]
      const floorN = y > 0 && floorMask[(y - 1) * stride + x]
      if (!floorHere && !floorN) continue

      const left = x > 0 && wallMask[y * stride + x - 1]
      const right = x + 1 < stride && wallMask[y * stride + x + 1]
      const up = y > 0 && wallMask[(y - 1) * stride + x]
      const down = y + 1 < stride && wallMask[(y + 1) * stride + x]
      // Door = gap flanked by walls on a perimeter axis.
      const ew = left && right
      const ns = up && down
      const cornerish = (left || right) && (up || down) && !(ew || ns)
      if (!ew && !ns && !cornerish) continue
      // Prefer classic door: walls on both sides of one axis.
      if (!ew && !ns) continue

      const key = `${x},${y}`
      if (painted.has(key)) continue
      painted.add(key)

      const fx = ox + x * ts
      const fy = oy + y * ts
      const style = (hash2(originX + x, originY + y, 29) * 3) | 0
      const inset = Math.max(2, ts * 0.1)

      ctx.fillStyle = style === 2 ? '#7a5a34' : '#8a6840'
      ctx.fillRect(fx + 1, fy + ts * 0.72, ts - 2, Math.max(2, ts * 0.28))

      if (style === 1) {
        ctx.fillStyle = '#2a1808'
        ctx.fillRect(fx + inset * 0.4, fy + inset * 0.25, ts - inset * 0.8, ts - inset * 0.4)
        ctx.fillStyle = '#5a3818'
        ctx.fillRect(fx + inset, fy + inset * 0.5, ts - inset * 2, ts - inset)
      } else {
        ctx.fillStyle = '#3a2410'
        ctx.fillRect(fx + inset * 0.5, fy + inset * 0.3, ts - inset, ts - inset * 0.5)
        ctx.fillStyle = style === 2 ? '#7a5230' : '#6b4424'
        ctx.fillRect(fx + inset, fy + inset * 0.55, ts - inset * 2, ts - inset * 1.1)
      }
      ctx.fillStyle = '#d4b44a'
      ctx.fillRect(fx + ts * 0.68, fy + ts * 0.48, Math.max(2, ts * 0.1), Math.max(2, ts * 0.1))
    }
  }
}

export class BuildChunkRenderer {
  private atlas: BuildAtlas | null = null
  private chunks = new Map<number, ChunkEntry>()
  private dirty = new Set<number>()
  private worldSize = 0
  private terrain: Uint8Array | null = null
  private chunksPerAxis = 0
  private remeshBudget = 8

  private ensureAtlas() {
    if (!this.atlas) this.atlas = new BuildAtlas(BUILD_MESH_PX)
    if (this.atlas.syncFromNature()) {
      for (const key of this.chunks.keys()) this.dirty.add(key)
    }
    return this.atlas
  }

  /** Full world boot / reset — accept terrain as build source (no chunk module yet). */
  setWorld(terrain: Uint8Array, size: number) {
    this.terrain = terrain
    this.worldSize = size
    this.chunksPerAxis = Math.ceil(size / BUILD_CHUNK_TILES)
    this.chunks.clear()
    this.dirty.clear()
    this.ensureAtlas()

    // Mark only chunks that contain building cells.
    for (let y = 0; y < size; y++) {
      const row = y * size
      for (let x = 0; x < size; x++) {
        if (!isBuildCell(terrain[row + x])) continue
        const cx = (x / BUILD_CHUNK_TILES) | 0
        const cy = (y / BUILD_CHUNK_TILES) | 0
        this.dirty.add(chunkKey(cx, cy))
      }
    }
  }

  /** Incremental dirty from sim worker terrain patches. */
  markDirtyIndices(indices: Uint32Array, size = this.worldSize) {
    if (size <= 0) return
    for (let k = 0; k < indices.length; k++) {
      const i = indices[k]
      const x = i % size
      const y = (i / size) | 0
      this.dirty.add(chunkKey((x / BUILD_CHUNK_TILES) | 0, (y / BUILD_CHUNK_TILES) | 0))
    }
  }

  /** Future API: explicit build-chunk dirty list. */
  markDirtyChunks(list: BuildChunkDirty[]) {
    for (const d of list) this.dirty.add(chunkKey(d.chunkX, d.chunkY))
  }

  private sample(x: number, y: number): number {
    const t = this.terrain
    const s = this.worldSize
    if (!t || x < 0 || y < 0 || x >= s || y >= s) return 0
    return t[y * s + x]
  }

  private fingerprintChunk(cx: number, cy: number): number {
    const t = this.terrain
    if (!t) return 0
    const s = this.worldSize
    const x0 = cx * BUILD_CHUNK_TILES
    const y0 = cy * BUILD_CHUNK_TILES
    let h = 2166136261 >>> 0
    for (let ly = 0; ly < BUILD_CHUNK_TILES; ly++) {
      const wy = y0 + ly
      if (wy >= s) break
      const row = wy * s
      for (let lx = 0; lx < BUILD_CHUNK_TILES; lx++) {
        const wx = x0 + lx
        if (wx >= s) break
        const cell = t[row + wx]
        if (!isBuildCell(cell)) continue
        h ^= Math.imul(cell + 1, Math.imul(wx + 1, 374761393) ^ Math.imul(wy + 1, 668265263))
        h = Math.imul(h, 16777619) >>> 0
      }
    }
    return h >>> 0
  }

  private remeshOne(cx: number, cy: number) {
    const atlas = this.ensureAtlas()
    const ts = BUILD_MESH_PX
    const n = BUILD_CHUNK_TILES
    const x0 = cx * n
    const y0 = cy * n
    const fp = this.fingerprintChunk(cx, cy)
    const key = chunkKey(cx, cy)
    const prev = this.chunks.get(key)
    if (prev && prev.fingerprint === fp) return

    // Dense local grids for greedy + face cull (same size = stride).
    const floorKeys = new Int32Array(n * n)
    const wallKeys = new Int32Array(n * n)
    const wallMask = new Uint8Array(n * n)
    const floorMask = new Uint8Array(n * n)
    const furniture: FurnitureInst[] = []
    let any = false

    for (let ly = 0; ly < n; ly++) {
      for (let lx = 0; lx < n; lx++) {
        const wx = x0 + lx
        const wy = y0 + ly
        const t = this.sample(wx, wy)
        const i = ly * n + lx

        if (FURNITURE.has(t)) {
          furniture.push({ wx, wy, terrain: t, variety: hash2(wx, wy, 7) })
          // Floor under furniture
          floorKeys[i] = packGreedyKey(MAT_FLOOR, (hash2(wx, wy, 41) * 4) | 0)
          floorMask[i] = 1
          any = true
          continue
        }
        if (t === PLANK) {
          floorKeys[i] = packGreedyKey(MAT_FLOOR, (hash2(wx, wy, 41) * 4) | 0)
          floorMask[i] = 1
          any = true
          continue
        }
        if (isBuildWall(t)) {
          // Only WALL_STONE is stone — don't hash-flip HOUSE timber into mixed masonry.
          const stone = t === WALL_STONE
          if (stone) {
            wallKeys[i] = packGreedyKey(MAT_STONE, (hash2(wx, wy, 21) * 4) | 0)
          } else {
            // Mostly horizontal board walls; rare vertical post for corners/variety.
            const h = hash2(wx, wy, 13)
            const vertical = h > 0.92
            const variant = vertical ? 4 + ((h * 2) | 0) : (h * 4) | 0
            wallKeys[i] = packGreedyKey(MAT_TIMBER, variant)
          }
          wallMask[i] = 1
          any = true
        }
      }
    }

    if (!any) {
      this.chunks.delete(key)
      return
    }

    const floorQuads = greedyMesh2D(floorKeys, n, n, n)
    const wallQuads = greedyMesh2D(wallKeys, n, n, n)
    const quads = floorQuads.concat(wallQuads)

    const canvas = prev?.canvas ?? document.createElement('canvas')
    // Chunk atlas blit buffer — multiple of 4.
    const side = n * ts
    if (canvas.width !== side || canvas.height !== side) {
      canvas.width = side
      canvas.height = side
    }
    const ctx = canvas.getContext('2d', { alpha: true })!
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, side, side)

    // Soft footprint shadow (one rect per chunk occupancy bbox)
    let minX = n
    let minY = n
    let maxX = 0
    let maxY = 0
    for (let i = 0; i < n * n; i++) {
      if (!floorMask[i] && !wallMask[i]) continue
      const lx = i % n
      const ly = (i / n) | 0
      if (lx < minX) minX = lx
      if (ly < minY) minY = ly
      if (lx > maxX) maxX = lx
      if (ly > maxY) maxY = ly
    }
    if (maxX >= minX) {
      // Soft contact shadow — keep silhouette readable (DF cutaway, not brown noise).
      ctx.fillStyle = 'rgba(0,0,0,0.18)'
      const ox = minX * ts
      const oy = minY * ts
      const bw = (maxX - minX + 1) * ts
      const bh = (maxY - minY + 1) * ts
      ctx.fillRect(ox + 2, oy + bh - Math.max(2, ts * 0.14), bw - 2, Math.max(2, ts * 0.14))
    }

    // Floors first (full tile), then walls inset toward exterior (S3 RW interiors).
    const blitFloorQuad = (q: GreedyQuad) => {
      const r = atlas.rect(slotForMat(q.mat, q.variant))
      for (let dy = 0; dy < q.h; dy++) {
        for (let dx = 0; dx < q.w; dx++) {
          ctx.drawImage(
            atlas.canvas,
            r.u,
            r.v,
            r.w,
            r.h,
            (q.x + dx) * ts,
            (q.y + dy) * ts,
            ts,
            ts,
          )
        }
      }
    }

    for (const q of floorQuads) blitFloorQuad(q)
    // Soft north lit on floors only — no black south skirt on every plank (that looked filthy).
    for (let ly = 0; ly < n; ly++) {
      for (let lx = 0; lx < n; lx++) {
        const i = ly * n + lx
        if (!floorMask[i] || wallMask[i]) continue
        drawNorthLit(ctx, lx * ts, ly * ts, ts, Math.max(1, Math.round(ts * 0.05)))
      }
    }
    for (const q of wallQuads) {
      const slot = slotForMat(q.mat, q.variant)
      for (let dy = 0; dy < q.h; dy++) {
        for (let dx = 0; dx < q.w; dx++) {
          blitWallInset(ctx, atlas, slot, q.x + dx, q.y + dy, ts, wallMask, floorMask, n)
        }
      }
    }

    for (const q of wallQuads) {
      strokeCulledEdges(ctx, wallMask, n, q.x, q.y, q.w, q.h, 0, 0, ts)
    }

    drawStoneBattlements(ctx, wallMask, wallKeys, n, ts)
    drawDoorApertures(ctx, wallMask, floorMask, n, 0, 0, ts, x0, y0)

    this.chunks.set(key, {
      cx,
      cy,
      canvas,
      quads,
      furniture,
      fingerprint: fp,
    })
  }

  /** Remesh a budget of dirty chunks (amortized across frames). */
  remeshDirty(budget = this.remeshBudget) {
    if (this.dirty.size === 0) return
    let n = 0
    for (const key of this.dirty) {
      if (n >= budget) break
      const { cx, cy } = unpackBuildChunkKey(key)
      this.remeshOne(cx, cy)
      this.dirty.delete(key)
      n++
    }
  }

  /**
   * Draw cutaway buildings: blit chunk canvases + furniture on top.
   * Does not touch WorldGl terrain — overlay only.
   */
  draw(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
    zoom: number,
    visible: number,
    tilePx: number = TILE_PX,
  ) {
    if (!this.terrain || this.worldSize <= 0) return
    const tileS = tilePx * zoom
    // Keep cutaway readable when zoomed out (was 3.5 → vanished at world view).
    if (tileS < 2.0) return

    // Prefer remeshing visible dirty chunks first.
    this.prioritizeVisibleDirty(camX, camY, visible, tilePx)
    this.remeshDirty()

    ctx.imageSmoothingEnabled = false

    const x0 = Math.max(0, Math.floor(camX / tilePx) - 1)
    const y0 = Math.max(0, Math.floor(camY / tilePx) - 1)
    const x1 = Math.min(this.worldSize - 1, Math.ceil((camX + visible) / tilePx) + 1)
    const y1 = Math.min(this.worldSize - 1, Math.ceil((camY + visible) / tilePx) + 1)

    const cx0 = Math.max(0, (x0 / BUILD_CHUNK_TILES) | 0)
    const cy0 = Math.max(0, (y0 / BUILD_CHUNK_TILES) | 0)
    const cx1 = Math.min(this.chunksPerAxis - 1, (x1 / BUILD_CHUNK_TILES) | 0)
    const cy1 = Math.min(this.chunksPerAxis - 1, (y1 / BUILD_CHUNK_TILES) | 0)

    const furnitureBatch: FurnitureInst[] = []

    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const entry = this.chunks.get(chunkKey(cx, cy))
        if (!entry) continue

        const worldPxX = cx * BUILD_CHUNK_TILES * tilePx
        const worldPxY = cy * BUILD_CHUNK_TILES * tilePx
        const dx = Math.round((worldPxX - camX) * zoom)
        const dy = Math.round((worldPxY - camY) * zoom)
        const dw = Math.round(BUILD_CHUNK_TILES * tileS)
        const dh = dw

        // One blit per chunk — not per block.
        ctx.drawImage(entry.canvas, dx, dy, dw, dh)

        for (const f of entry.furniture) {
          if (f.wx < x0 || f.wx > x1 || f.wy < y0 || f.wy > y1) continue
          furnitureBatch.push(f)
        }
      }
    }

    // Furniture always after floors/walls mesh.
    const ts = Math.max(1, Math.round(tileS))
    for (const f of furnitureBatch) {
      const fx = Math.round((f.wx * tilePx - camX) * zoom)
      const fy = Math.round((f.wy * tilePx - camY) * zoom)
      drawFurnitureSprite(ctx, f.terrain, fx, fy, ts, f.variety)
    }
  }

  private prioritizeVisibleDirty(camX: number, camY: number, visible: number, tilePx: number) {
    if (this.dirty.size === 0) return
    const cx0 = Math.max(0, (Math.floor(camX / tilePx) / BUILD_CHUNK_TILES) | 0)
    const cy0 = Math.max(0, (Math.floor(camY / tilePx) / BUILD_CHUNK_TILES) | 0)
    const cx1 = Math.min(
      this.chunksPerAxis - 1,
      (Math.ceil((camX + visible) / tilePx) / BUILD_CHUNK_TILES) | 0,
    )
    const cy1 = Math.min(
      this.chunksPerAxis - 1,
      (Math.ceil((camY + visible) / tilePx) / BUILD_CHUNK_TILES) | 0,
    )

    const ordered: number[] = []
    const rest: number[] = []
    for (const key of this.dirty) {
      const { cx, cy } = unpackBuildChunkKey(key)
      if (cx >= cx0 && cx <= cx1 && cy >= cy0 && cy <= cy1) ordered.push(key)
      else rest.push(key)
    }
    if (ordered.length === 0) return
    this.dirty.clear()
    for (const k of ordered) this.dirty.add(k)
    for (const k of rest) this.dirty.add(k)
  }

  destroy() {
    this.chunks.clear()
    this.dirty.clear()
    this.terrain = null
    this.atlas = null
  }
}
