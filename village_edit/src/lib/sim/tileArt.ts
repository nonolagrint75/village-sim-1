import {
  BED,
  BRIDGE,
  BUSH,
  CHEST,
  DIRT,
  FENCE,
  FIELD,
  GOLD,
  GRASS,
  HOUSE,
  IRON,
  LOOT,
  MILL,
  MOUNTAIN,
  PATH,
  PLANK,
  PORT,
  ROAD,
  SAND,
  STONE,
  TABLE,
  TRAIL,
  TREE,
  TUNNEL,
  WALL_STONE,
  WALL_WOOD,
  WATER,
  WHEAT,
  WORKBENCH,
  WORLD_SIZE,
} from '@/lib/sim/types'

export const TILE_PX = 3

type Layer = [number, number, string]

interface TileArt {
  base: string
  detail: Layer[]
  vary?: boolean
}

/**
 * Satellite-first palette: readable at 1px/tile when zoomed out,
 * with enough contrast that forests sit darker than grass and water
 * reads as deep inland seas rather than flat blue paint.
 */
export const TILE_ART: Record<number, TileArt> = {
  [GRASS]: {
    base: '#6f9a4e',
    detail: [
      [0, 2, '#628a44'],
      [2, 0, '#7eaa58'],
      [1, 1, '#769f52'],
    ],
    vary: true,
  },
  [DIRT]: {
    base: '#7a5f42',
    detail: [
      [1, 1, '#6a5138'],
      [2, 2, '#8a6d4c'],
      [0, 0, '#705638'],
    ],
    vary: true,
  },
  [SAND]: {
    base: '#d4c28a',
    detail: [
      [0, 1, '#c8b478'],
      [2, 2, '#e0d09c'],
      [1, 0, '#bba86c'],
    ],
    vary: true,
  },
  [WATER]: {
    base: '#2a6a8e',
    detail: [
      [0, 0, '#3480a4'],
      [2, 1, '#245c7c'],
      [1, 2, '#3a88ac'],
    ],
    vary: true,
  },
  [TREE]: {
    base: '#244f2c',
    detail: [
      [1, 2, '#4a3420'],
      [0, 0, '#2f6438'],
      [2, 0, '#1c4024'],
      [1, 0, '#356c3c'],
      [0, 1, '#1a3820'],
    ],
    vary: true,
  },
  [BUSH]: {
    base: '#3a6836',
    detail: [
      [0, 1, '#a83248'],
      [2, 0, '#b84050'],
      [1, 2, '#2e562c'],
      [1, 0, '#488044'],
    ],
  },
  [STONE]: {
    base: '#8a8880',
    detail: [
      [0, 0, '#9a9890'],
      [2, 1, '#74726c'],
      [1, 2, '#a4a29a'],
    ],
    vary: true,
  },
  [GOLD]: {
    base: '#7e7a72',
    detail: [
      [1, 1, '#e8c245'],
      [2, 0, '#f0d367'],
      [0, 2, '#c9a534'],
    ],
  },
  [IRON]: {
    base: '#6a635c',
    detail: [
      [1, 1, '#b56a3c'],
      [2, 0, '#c97a46'],
      [0, 2, '#8a4a28'],
    ],
  },
  [MOUNTAIN]: {
    base: '#56524c',
    detail: [
      [1, 0, '#8e887e'],
      [0, 1, '#3c3832'],
      [2, 2, '#6a645a'],
      [1, 1, '#d4cec0'],
    ],
    vary: true,
  },
  [TUNNEL]: {
    // Deep gallery — darker than mountain so corridors read from orbit.
    base: '#14110e',
    detail: [
      [0, 0, '#0a0806'],
      [2, 0, '#1c1814'],
      [0, 2, '#0c0a08'],
      [2, 2, '#1a1612'],
      [1, 1, '#2e2820'],
      [1, 0, '#3a3228'],
    ],
    vary: true,
  },
  [LOOT]: {
    base: '#6f9a4e',
    detail: [
      [1, 1, '#f2d65e'],
      [0, 1, '#d8b944'],
    ],
  },
  // Roof-forward house: warm clay ridge, dark eaves — reads as a structure from orbit.
  [HOUSE]: {
    base: '#8b4e32',
    detail: [
      [0, 0, '#6e3c26'],
      [1, 0, '#a45a38'],
      [2, 0, '#6e3c26'],
      [0, 1, '#c4a878'],
      [1, 1, '#d8bc8c'],
      [2, 1, '#c4a878'],
      [0, 2, '#5a3420'],
      [1, 2, '#7a4a2e'],
      [2, 2, '#5a3420'],
    ],
  },
  [PLANK]: {
    base: '#a88452',
    detail: [
      [0, 0, '#967444'],
      [0, 1, '#b89462'],
      [0, 2, '#967444'],
    ],
  },
  [FENCE]: {
    base: '#6a4a2c',
    detail: [
      [1, 0, '#866038'],
      [1, 2, '#866038'],
      [0, 1, '#543820'],
    ],
  },
  [WALL_WOOD]: {
    base: '#5e4024',
    detail: [
      [0, 0, '#725030'],
      [2, 2, '#4a321c'],
      [1, 1, '#684828'],
    ],
  },
  [WALL_STONE]: {
    base: '#6e6a64',
    detail: [
      [0, 1, '#7e7a72'],
      [2, 0, '#5a5650'],
      [1, 2, '#86827a'],
      [1, 0, '#4e4a44'],
    ],
  },
  [WORKBENCH]: {
    base: '#9a582c',
    detail: [
      [0, 0, '#b86a38'],
      [2, 2, '#744420'],
      [1, 1, '#a86032'],
    ],
  },
  [CHEST]: {
    base: '#a87230',
    detail: [
      [0, 1, '#865820'],
      [2, 1, '#865820'],
      [1, 0, '#d09844'],
    ],
  },
  [BED]: {
    base: '#9a3a48',
    detail: [
      [0, 0, '#e4ded0'],
      [1, 0, '#e4ded0'],
      [2, 2, '#7c2e3a'],
    ],
  },
  [TABLE]: {
    base: '#8a5a28',
    detail: [
      [0, 0, '#a46e34'],
      [2, 0, '#a46e34'],
      [0, 2, '#6e441c'],
      [2, 2, '#6e441c'],
      [1, 1, '#b87838'],
    ],
  },
  [TRAIL]: {
    base: '#a8824c',
    detail: [
      [1, 0, '#947040'],
      [1, 2, '#b89458'],
    ],
    vary: true,
  },
  [PATH]: {
    base: '#c09a5e',
    detail: [
      [0, 2, '#ac864c'],
      [2, 0, '#ccaa6e'],
    ],
    vary: true,
  },
  [ROAD]: {
    base: '#c8b898',
    detail: [
      [0, 0, '#b4a484'],
      [2, 2, '#b4a484'],
      [1, 1, '#d8c8a8'],
      [2, 0, '#a89878'],
    ],
    vary: true,
  },
  [BRIDGE]: {
    base: '#7a5834',
    detail: [
      [0, 0, '#8a6840'],
      [0, 2, '#5e4228'],
      [2, 1, '#8a6840'],
      [1, 1, '#6a4a2c'],
    ],
  },
  // Stone tower + dark roof ridge — not a yellow logo blob.
  [MILL]: {
    base: '#7a7268',
    detail: [
      [1, 0, '#4a3a28'],
      [0, 0, '#6a6258'],
      [2, 0, '#6a6258'],
      [0, 1, '#8a8278'],
      [1, 1, '#5a5248'],
      [2, 1, '#8a8278'],
      [0, 2, '#6a6258'],
      [1, 2, '#3a3024'],
      [2, 2, '#6a6258'],
    ],
  },
  // Weathered pier: dark deck, lighter planks.
  [PORT]: {
    base: '#5a3e24',
    detail: [
      [0, 0, '#6e4e30'],
      [1, 0, '#4a321c'],
      [2, 0, '#6e4e30'],
      [0, 1, '#3e2a16'],
      [1, 1, '#7a5838'],
      [2, 1, '#3e2a16'],
      [0, 2, '#6e4e30'],
      [1, 2, '#4a321c'],
      [2, 2, '#6e4e30'],
    ],
  },
  [FIELD]: {
    base: '#6a5234',
    detail: [
      [0, 1, '#5a442c'],
      [2, 1, '#7a6240'],
      [1, 0, '#624a30'],
    ],
    vary: true,
  },
}

export const WHEAT_SPROUT = 100
export const WHEAT_GREEN = 200
export const WHEAT_RIPE = 300

const WHEAT_STAGES: TileArt[] = [
  {
    base: '#6a5234',
    detail: [
      [0, 1, '#c8b888'],
      [2, 0, '#c8b888'],
      [1, 2, '#5a442c'],
    ],
  },
  {
    base: '#5a7a3e',
    detail: [
      [0, 0, '#78a04c'],
      [1, 1, '#88b056'],
      [2, 0, '#78a04c'],
      [1, 2, '#4e6c36'],
    ],
  },
  {
    base: '#c49a3c',
    detail: [
      [0, 0, '#e4c058'],
      [1, 0, '#f0d068'],
      [2, 0, '#e4c058'],
      [1, 2, '#a07a2c'],
    ],
  },
]

/** Logs left on cleared ground after a tree is felled. */
const WOOD_PILE_ART: TileArt = {
  base: '#7a5f42',
  detail: [
    [1, 1, '#c4a06a'],
    [0, 2, '#4a3420'],
    [2, 0, '#8a6238'],
  ],
}

/** Timber lintel / shaft mouth — distinguishable from deep TUNNEL. */
const TUNNEL_ENTRANCE_ART: TileArt = {
  base: '#1a1612',
  detail: [
    [0, 0, '#3d3428'],
    [1, 0, '#c4a878'],
    [2, 0, '#3d3428'],
    [0, 1, '#0a0806'],
    [1, 1, '#1e1812'],
    [2, 1, '#0a0806'],
    [0, 2, '#2a241c'],
    [1, 2, '#4a4034'],
    [2, 2, '#2a241c'],
  ],
  vary: true,
}

export function tileArtFor(terrain: number, amount = 0): TileArt {
  if (terrain === WHEAT) {
    if (amount >= WHEAT_RIPE) return WHEAT_STAGES[2]
    if (amount >= WHEAT_SPROUT) return WHEAT_STAGES[1]
    return WHEAT_STAGES[0]
  }
  if (terrain === DIRT && amount > 0) return WOOD_PILE_ART
  if (terrain === TUNNEL && amount >= 1) return TUNNEL_ENTRANCE_ART
  return TILE_ART[terrain] ?? TILE_ART[GRASS]
}

export function tileNoise(x: number, y: number): number {
  const n = (x * 374761393 + y * 668265263) ^ 0x5f3759df
  const m = (n ^ (n >>> 13)) * 1274126177
  return ((m ^ (m >>> 16)) >>> 0) / 4294967296
}

function hexToRgba32(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return (255 << 24) | (b << 16) | (g << 8) | r
}

const PACKED_BASE = new Uint32Array(64)
const PACKED_VARY = new Uint8Array(64)
for (const key of Object.keys(TILE_ART)) {
  const t = Number(key)
  const art = TILE_ART[t]
  PACKED_BASE[t] = hexToRgba32(art.base)
  PACKED_VARY[t] = art.vary ? 1 : 0
}
const PACKED_WHEAT = WHEAT_STAGES.map((art) => hexToRgba32(art.base))
const PACKED_WOOD_PILE = hexToRgba32('#8a6a40')
const PACKED_TUNNEL_ENTRANCE = hexToRgba32('#1a1612')

function clampByte(v: number) {
  return v < 0 ? 0 : v > 255 ? 255 : v
}

/**
 * Optional cheap cold tint for grass/water base colors (no per-frame climate sample in hot path —
 * call only from debug/LOD overlays with a pre-sampled tempC).
 */
export function applyColdTintPacked(packed: number, tempC: number): number {
  if (tempC > 4) return packed
  const frost = tempC > -2 ? 0.18 : 0.32
  let r = packed & 255
  let g = (packed >> 8) & 255
  let b = (packed >> 16) & 255
  r = clampByte(r + ((180 - r) * frost) | 0)
  g = clampByte(g + ((200 - g) * frost) | 0)
  b = clampByte(b + ((220 - b) * frost * 1.1) | 0)
  return (255 << 24) | (b << 16) | (g << 8) | r
}

/** Packed little-endian RGBA for ImageData (one pixel per tile). */
export function tilePixel32(terrain: number, amount: number, x: number, y: number): number {
  let packed: number
  let vary = 0
  let kind = terrain
  if (terrain === WHEAT) {
    packed = amount >= WHEAT_RIPE ? PACKED_WHEAT[2] : amount >= WHEAT_SPROUT ? PACKED_WHEAT[1] : PACKED_WHEAT[0]
    vary = 1
    kind = WHEAT
  } else if (terrain === DIRT && amount > 0) {
    packed = PACKED_WOOD_PILE
    vary = 1
    kind = DIRT
  } else if (terrain === TUNNEL && amount >= 1) {
    packed = PACKED_TUNNEL_ENTRANCE
    vary = 1
    kind = TUNNEL
  } else {
    packed = PACKED_BASE[terrain] || PACKED_BASE[GRASS]
    vary = PACKED_VARY[terrain]
  }
  if (!vary) return packed

  const n = tileNoise(x, y)
  const n2 = tileNoise(x + 91, y + 47)
  let r = packed & 255
  let g = (packed >> 8) & 255
  let b = (packed >> 16) & 255

  // Organic mottling: channel-biased so biomes stay readable from orbit.
  if (kind === GRASS) {
    const j = ((n - 0.5) * 28) | 0
    r = clampByte(r + j - 4)
    g = clampByte(g + j + ((n2 * 10) | 0))
    b = clampByte(b + ((j * 0.4) | 0) - 2)
  } else if (kind === TREE) {
    const j = ((n - 0.45) * 22) | 0
    r = clampByte(r + ((j * 0.5) | 0))
    g = clampByte(g + j)
    b = clampByte(b + ((j * 0.35) | 0) - 3)
  } else if (kind === WATER) {
    const j = ((n - 0.5) * 24) | 0
    r = clampByte(r + ((j * 0.25) | 0))
    g = clampByte(g + ((j * 0.55) | 0) + ((n2 * 8) | 0) - 4)
    b = clampByte(b + j + 2)
  } else if (kind === MOUNTAIN) {
    const j = ((n - 0.4) * 30) | 0
    const snow = n2 > 0.78 ? 28 : 0
    r = clampByte(r + j + snow)
    g = clampByte(g + j + snow)
    b = clampByte(b + ((j * 0.85) | 0) + snow)
  } else if (kind === TUNNEL) {
    const j = ((n - 0.55) * 18) | 0
    const mouth = amount >= 1 ? 10 : 0
    r = clampByte(r + j + mouth)
    g = clampByte(g + ((j * 0.7) | 0) + (amount >= 1 ? 6 : 0))
    b = clampByte(b + ((j * 0.5) | 0))
  } else if (kind === SAND) {
    const j = ((n - 0.5) * 20) | 0
    r = clampByte(r + j + 2)
    g = clampByte(g + j)
    b = clampByte(b + ((j * 0.6) | 0) - 2)
  } else if (kind === FIELD || kind === WHEAT) {
    const j = ((n - 0.5) * 18) | 0
    r = clampByte(r + j)
    g = clampByte(g + j + ((n2 * 6) | 0))
    b = clampByte(b + ((j * 0.5) | 0))
  } else {
    const j = (n * 16) | 0
    r = clampByte(r + j)
    g = clampByte(g + j)
    b = clampByte(b + j)
  }

  return (255 << 24) | (b << 16) | (g << 8) | r
}

const STRUCTURE = new Set([
  HOUSE,
  MILL,
  PORT,
  WALL_WOOD,
  WALL_STONE,
  FENCE,
  BRIDGE,
  WORKBENCH,
  CHEST,
  BED,
  TABLE,
  BUSH,
  TREE,
])

function isWater(t: number) {
  return t === WATER
}

/**
 * Close-up structure / canopy / shore pass. Only call when tileS is large
 * and the viewport is small enough — gated by the caller.
 */
export function drawCloseupTerrain(
  ctx: CanvasRenderingContext2D,
  terrain: Uint8Array,
  amount: Uint16Array,
  camX: number,
  camY: number,
  zoom: number,
  viewSize: number,
  tilePx: number,
  nowMs: number,
) {
  const tileS = tilePx * zoom
  if (tileS < 7) return

  const x0 = Math.max(0, Math.floor(camX / tilePx) - 1)
  const y0 = Math.max(0, Math.floor(camY / tilePx) - 1)
  const x1 = Math.min(WORLD_SIZE, Math.ceil((camX + viewSize) / tilePx) + 1)
  const y1 = Math.min(WORLD_SIZE, Math.ceil((camY + viewSize) / tilePx) + 1)
  const tiles = (x1 - x0) * (y1 - y0)
  if (tiles > 14000) return

  const detail = tileS >= 10
  const shimmer = tileS >= 11 && tiles <= 9000
  const foam = tileS >= 12 && tiles <= 7000
  const phase = (nowMs * 0.0018) % (Math.PI * 2)

  for (let gy = y0; gy < y1; gy++) {
    const row = gy * WORLD_SIZE
    for (let gx = x0; gx < x1; gx++) {
      const t = terrain[row + gx]
      const px = (gx * tilePx - camX) * zoom
      const py = (gy * tilePx - camY) * zoom

      if (t === WATER) {
        if (shimmer) {
          const n = tileNoise(gx, gy)
          if (n > 0.62) {
            const a = 0.07 + Math.sin(phase + n * 12 + gx * 0.3) * 0.05
            ctx.fillStyle = `rgba(180, 220, 240, ${a.toFixed(3)})`
            const hx = px + tileS * (0.15 + n * 0.5)
            const hy = py + tileS * (0.2 + tileNoise(gx + 3, gy) * 0.45)
            ctx.fillRect(hx, hy, Math.max(1, tileS * 0.28), Math.max(1, tileS * 0.1))
          }
        }
        if (foam) {
          const n = gy > 0 && !isWater(terrain[row - WORLD_SIZE + gx])
          const s = gy < WORLD_SIZE - 1 && !isWater(terrain[row + WORLD_SIZE + gx])
          const e = gx < WORLD_SIZE - 1 && !isWater(terrain[row + gx + 1])
          const w = gx > 0 && !isWater(terrain[row + gx - 1])
          if (n || s || e || w) {
            ctx.fillStyle = 'rgba(220, 236, 244, 0.22)'
            const f = Math.max(1, tileS * 0.12)
            if (n) ctx.fillRect(px, py, tileS, f)
            if (s) ctx.fillRect(px, py + tileS - f, tileS, f)
            if (w) ctx.fillRect(px, py, f, tileS)
            if (e) ctx.fillRect(px + tileS - f, py, f, tileS)
          }
        }
        continue
      }

      if (t === TREE && detail) {
        // Canopy blob darker than grass base, with a trunk fleck.
        ctx.fillStyle = 'rgba(20, 48, 26, 0.35)'
        ctx.fillRect(px + tileS * 0.08, py + tileS * 0.08, tileS * 0.84, tileS * 0.84)
        if (tileS >= 14) {
          ctx.fillStyle = '#3a2818'
          ctx.fillRect(px + tileS * 0.42, py + tileS * 0.55, tileS * 0.16, tileS * 0.35)
          ctx.fillStyle = '#2e6a38'
          ctx.beginPath()
          ctx.ellipse(px + tileS * 0.5, py + tileS * 0.38, tileS * 0.38, tileS * 0.32, 0, 0, Math.PI * 2)
          ctx.fill()
        }
        continue
      }

      if (!STRUCTURE.has(t) && t !== WHEAT && !(t === DIRT && amount[row + gx] > 0)) continue

      if (t === HOUSE) {
        // Shadow
        if (detail) {
          ctx.fillStyle = 'rgba(0,0,0,0.22)'
          ctx.fillRect(px + tileS * 0.12, py + tileS * 0.55, tileS * 0.78, tileS * 0.38)
        }
        // Walls
        ctx.fillStyle = '#c8b48a'
        ctx.fillRect(px + tileS * 0.12, py + tileS * 0.38, tileS * 0.76, tileS * 0.48)
        // Roof ridge
        ctx.fillStyle = '#8a4428'
        ctx.beginPath()
        ctx.moveTo(px + tileS * 0.08, py + tileS * 0.42)
        ctx.lineTo(px + tileS * 0.5, py + tileS * 0.08)
        ctx.lineTo(px + tileS * 0.92, py + tileS * 0.42)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = '#6e3420'
        ctx.fillRect(px + tileS * 0.18, py + tileS * 0.42, tileS * 0.64, tileS * 0.1)
        if (tileS >= 14) {
          ctx.fillStyle = '#3a2818'
          ctx.fillRect(px + tileS * 0.42, py + tileS * 0.58, tileS * 0.16, tileS * 0.28)
          ctx.fillStyle = '#6ab0c8'
          ctx.fillRect(px + tileS * 0.22, py + tileS * 0.52, tileS * 0.14, tileS * 0.14)
        }
        continue
      }

      if (t === MILL) {
        if (detail) {
          ctx.fillStyle = 'rgba(0,0,0,0.2)'
          ctx.fillRect(px + tileS * 0.2, py + tileS * 0.62, tileS * 0.62, tileS * 0.28)
        }
        ctx.fillStyle = '#8a8478'
        ctx.fillRect(px + tileS * 0.28, py + tileS * 0.28, tileS * 0.44, tileS * 0.58)
        ctx.fillStyle = '#4a3a28'
        ctx.fillRect(px + tileS * 0.24, py + tileS * 0.2, tileS * 0.52, tileS * 0.14)
        if (tileS >= 12) {
          // Windmill arms — cheap cross
          ctx.strokeStyle = '#d8c8a8'
          ctx.lineWidth = Math.max(1, tileS * 0.07)
          const cx = px + tileS * 0.5
          const cy = py + tileS * 0.32
          ctx.beginPath()
          ctx.moveTo(cx - tileS * 0.32, cy)
          ctx.lineTo(cx + tileS * 0.32, cy)
          ctx.moveTo(cx, cy - tileS * 0.32)
          ctx.lineTo(cx, cy + tileS * 0.32)
          ctx.stroke()
        }
        continue
      }

      if (t === PORT) {
        ctx.fillStyle = '#4a321c'
        ctx.fillRect(px + tileS * 0.05, py + tileS * 0.35, tileS * 0.9, tileS * 0.45)
        ctx.fillStyle = '#7a5838'
        const plank = Math.max(1, tileS * 0.08)
        for (let i = 0; i < 4; i++) {
          ctx.fillRect(px + tileS * 0.1, py + tileS * 0.4 + i * plank * 1.35, tileS * 0.8, plank)
        }
        if (detail) {
          ctx.fillStyle = '#3a2818'
          ctx.fillRect(px + tileS * 0.72, py + tileS * 0.18, tileS * 0.1, tileS * 0.28)
        }
        continue
      }

      if (t === WALL_STONE || t === WALL_WOOD) {
        ctx.fillStyle = t === WALL_STONE ? '#7a7670' : '#6a4a2c'
        ctx.fillRect(px + tileS * 0.15, py + tileS * 0.15, tileS * 0.7, tileS * 0.7)
        if (detail) {
          ctx.fillStyle = t === WALL_STONE ? '#5a5650' : '#4a321c'
          ctx.fillRect(px + tileS * 0.15, py + tileS * 0.15, tileS * 0.7, tileS * 0.12)
        }
        continue
      }

      if (t === FENCE) {
        ctx.fillStyle = '#6a4a2c'
        ctx.fillRect(px + tileS * 0.15, py + tileS * 0.35, tileS * 0.7, tileS * 0.12)
        ctx.fillRect(px + tileS * 0.22, py + tileS * 0.25, tileS * 0.1, tileS * 0.45)
        ctx.fillRect(px + tileS * 0.68, py + tileS * 0.25, tileS * 0.1, tileS * 0.45)
        continue
      }

      if (t === BRIDGE) {
        ctx.fillStyle = '#6a4a2c'
        ctx.fillRect(px + tileS * 0.08, py + tileS * 0.28, tileS * 0.84, tileS * 0.44)
        ctx.fillStyle = '#8a6840'
        const plank = Math.max(1, tileS * 0.1)
        for (let i = 0; i < 3; i++) {
          ctx.fillRect(px + tileS * 0.12 + i * plank * 1.4, py + tileS * 0.32, plank, tileS * 0.36)
        }
        continue
      }

      if (t === BUSH) {
        ctx.fillStyle = '#3a6836'
        ctx.beginPath()
        ctx.ellipse(px + tileS * 0.5, py + tileS * 0.55, tileS * 0.38, tileS * 0.28, 0, 0, Math.PI * 2)
        ctx.fill()
        if (detail) {
          ctx.fillStyle = '#b03848'
          ctx.fillRect(px + tileS * 0.28, py + tileS * 0.4, tileS * 0.1, tileS * 0.1)
          ctx.fillRect(px + tileS * 0.58, py + tileS * 0.48, tileS * 0.1, tileS * 0.1)
        }
        continue
      }

      if (t === WHEAT) {
        const ripe = amount[row + gx] >= WHEAT_RIPE
        const green = amount[row + gx] >= WHEAT_SPROUT
        ctx.fillStyle = ripe ? '#d4a844' : green ? '#6a9a48' : '#7a6240'
        if (detail) {
          for (let i = 0; i < 3; i++) {
            ctx.fillRect(px + tileS * (0.22 + i * 0.22), py + tileS * 0.25, tileS * 0.08, tileS * 0.55)
          }
        } else {
          ctx.fillRect(px + tileS * 0.2, py + tileS * 0.3, tileS * 0.6, tileS * 0.45)
        }
        continue
      }

      if (t === DIRT && amount[row + gx] > 0) {
        ctx.fillStyle = '#5a4028'
        ctx.fillRect(px + tileS * 0.2, py + tileS * 0.45, tileS * 0.6, tileS * 0.22)
        ctx.fillStyle = '#c4a06a'
        ctx.fillRect(px + tileS * 0.25, py + tileS * 0.4, tileS * 0.5, tileS * 0.12)
        continue
      }

      if (t === WORKBENCH || t === CHEST || t === BED) {
        const art = tileArtFor(t)
        ctx.fillStyle = art.base
        ctx.fillRect(px + tileS * 0.2, py + tileS * 0.3, tileS * 0.6, tileS * 0.45)
        if (detail && art.detail.length) {
          const s = tileS / 3
          for (const [dx, dy, col] of art.detail) {
            ctx.fillStyle = col
            ctx.fillRect(px + dx * s, py + dy * s, s, s)
          }
        }
      }
    }
  }
}
