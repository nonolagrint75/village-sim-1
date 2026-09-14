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
  TRAIL,
  TREE,
  TUNNEL,
  WALL_STONE,
  WALL_WOOD,
  WATER,
  WHEAT,
  WORKBENCH,
} from '@/lib/sim/types'

export const TILE_PX = 3

type Layer = [number, number, string]

interface TileArt {
  base: string
  detail: Layer[]
  vary?: boolean
}

export const TILE_ART: Record<number, TileArt> = {
  [GRASS]: { base: '#79a35a', detail: [[0, 2, '#6b9550'], [2, 0, '#84ad63']], vary: true },
  [DIRT]: { base: '#7d6446', detail: [[1, 1, '#6d573d'], [2, 2, '#8a6f4e']], vary: true },
  [SAND]: { base: '#d8c893', detail: [[0, 1, '#cfbd85'], [2, 2, '#e2d3a2']], vary: true },
  [WATER]: { base: '#2f6d9e', detail: [[0, 0, '#3b7fb3'], [2, 1, '#27618e']], vary: true },
  [TREE]: {
    base: '#2c5f34',
    detail: [
      [1, 2, '#5a4023'],
      [0, 0, '#357040'],
      [2, 0, '#24502c'],
      [1, 0, '#3d7a45'],
    ],
  },
  [BUSH]: {
    base: '#3f6b3a',
    detail: [
      [0, 1, '#b0384f'],
      [2, 0, '#c04358'],
      [1, 2, '#356032'],
    ],
  },
  [STONE]: {
    base: '#8e8c86',
    detail: [
      [0, 0, '#9d9b94'],
      [2, 1, '#7c7a75'],
      [1, 2, '#a4a29b'],
    ],
  },
  [GOLD]: {
    base: '#8e8c86',
    detail: [
      [1, 1, '#e8c245'],
      [2, 0, '#f0d367'],
      [0, 2, '#c9a534'],
    ],
  },
  // Rust-orange flecks in dark stone — reads clearly apart from grey stone and yellow gold.
  [IRON]: {
    base: '#726b64',
    detail: [
      [1, 1, '#b56a3c'],
      [2, 0, '#c97a46'],
      [0, 2, '#8a4a28'],
    ],
  },
  // A tall rocky ridge — darker and cooler than plain stone, with a pale snow-cap fleck.
  [MOUNTAIN]: {
    base: '#5f5a52',
    detail: [
      [1, 0, '#8a847a'],
      [0, 1, '#453f38'],
      [2, 2, '#726b60'],
      [1, 1, '#d8d2c4'],
    ],
  },
  // Dark hollowed-out rock where a mountain tile has been fully mined through.
  [TUNNEL]: {
    base: '#332d27',
    detail: [
      [0, 0, '#241f1a'],
      [2, 1, '#463e34'],
      [1, 2, '#241f1a'],
    ],
  },
  [LOOT]: { base: '#79a35a', detail: [[1, 1, '#f2d65e'], [0, 1, '#d8b944']] },
  [HOUSE]: {
    base: '#8a6238',
    detail: [
      [0, 0, '#7a5530'],
      [2, 1, '#9a6f40'],
      [1, 2, '#6d4b2a'],
    ],
  },
  [PLANK]: {
    base: '#b08c5a',
    detail: [
      [0, 0, '#a07e4f'],
      [0, 1, '#bd986a'],
      [0, 2, '#a07e4f'],
    ],
  },
  [FENCE]: {
    base: '#6f4f2e',
    detail: [
      [1, 0, '#8a6640'],
      [1, 2, '#8a6640'],
      [0, 1, '#5c4126'],
    ],
  },
  [WALL_WOOD]: {
    base: '#6a4c2c',
    detail: [
      [0, 0, '#7c5a36'],
      [2, 2, '#563d23'],
      [1, 1, '#734f2f'],
    ],
  },
  [WALL_STONE]: {
    base: '#77746f',
    detail: [
      [0, 1, '#868279'],
      [2, 0, '#63605c'],
      [1, 2, '#8d8980'],
    ],
  },
  [WORKBENCH]: {
    base: '#a35c2e',
    detail: [
      [0, 0, '#c07038'],
      [2, 2, '#7e4522'],
      [1, 1, '#b26635'],
    ],
  },
  [CHEST]: {
    base: '#b07a34',
    detail: [
      [0, 1, '#8d5f27'],
      [2, 1, '#8d5f27'],
      [1, 0, '#d9a04a'],
    ],
  },
  [BED]: {
    base: '#a83f4e',
    detail: [
      [0, 0, '#e8e2d4'],
      [1, 0, '#e8e2d4'],
      [2, 2, '#8c3240'],
    ],
  },
  [TRAIL]: { base: '#88a05c', detail: [[1, 0, '#9a9163'], [1, 2, '#9a9163']], vary: true },
  [PATH]: { base: '#9c8560', detail: [[0, 2, '#8c7654'], [2, 0, '#a9926c']], vary: true },
  [ROAD]: {
    base: '#a99578',
    detail: [
      [0, 0, '#8e7c62'],
      [2, 2, '#8e7c62'],
      [1, 1, '#bdaa8c'],
      [2, 0, '#b5a382'],
    ],
  },
  [BRIDGE]: {
    base: '#8a6a42',
    detail: [
      [0, 0, '#a07d4f'],
      [0, 2, '#a07d4f'],
      [2, 1, '#6f5434'],
    ],
  },
  [MILL]: {
    base: '#9a9188',
    detail: [
      [1, 0, '#efe6d4'],
      [0, 1, '#efe6d4'],
      [2, 1, '#efe6d4'],
      [1, 2, '#efe6d4'],
      [1, 1, '#6b5a45'],
    ],
  },
  // A dock of dark timber piles over pale planking — reads distinctly from an ordinary house.
  [PORT]: {
    base: '#5c4a34',
    detail: [
      [0, 0, '#c9ac7e'],
      [2, 0, '#c9ac7e'],
      [1, 1, '#8a6f4e'],
      [0, 2, '#402f20'],
      [2, 2, '#402f20'],
    ],
  },
  [FIELD]: { base: '#6b563a', detail: [[0, 1, '#5d4a31'], [2, 1, '#77613f']] },
}

export const WHEAT_SPROUT = 100
export const WHEAT_GREEN = 200
export const WHEAT_RIPE = 300

const WHEAT_STAGES: TileArt[] = [
  {
    base: '#6b563a',
    detail: [
      [0, 1, '#cdbb8e'],
      [2, 0, '#cdbb8e'],
      [1, 2, '#5d4a31'],
    ],
  },
  {
    base: '#5f7a42',
    detail: [
      [0, 0, '#7fa14e'],
      [1, 1, '#8cae57'],
      [2, 0, '#7fa14e'],
      [1, 2, '#55703c'],
    ],
  },
  {
    base: '#c9a444',
    detail: [
      [0, 0, '#e9c95f'],
      [1, 0, '#f2d570'],
      [2, 0, '#e9c95f'],
      [1, 2, '#a8862f'],
    ],
  },
]

export function tileArtFor(terrain: number, amount = 0): TileArt {
  if (terrain === WHEAT) {
    if (amount >= WHEAT_RIPE) return WHEAT_STAGES[2]
    if (amount >= WHEAT_SPROUT) return WHEAT_STAGES[1]
    return WHEAT_STAGES[0]
  }
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

/** Packed little-endian RGBA for ImageData (one pixel per tile). */
export function tilePixel32(terrain: number, amount: number, x: number, y: number): number {
  let packed: number
  let vary = 0
  if (terrain === WHEAT) {
    packed = amount >= WHEAT_RIPE ? PACKED_WHEAT[2] : amount >= WHEAT_SPROUT ? PACKED_WHEAT[1] : PACKED_WHEAT[0]
  } else {
    packed = PACKED_BASE[terrain] || PACKED_BASE[GRASS]
    vary = PACKED_VARY[terrain]
  }
  if (!vary) return packed
  const j = (tileNoise(x, y) * 18) | 0
  let r = packed & 255
  let g = (packed >> 8) & 255
  let b = (packed >> 16) & 255
  r = r + j > 255 ? 255 : r + j
  g = g + j > 255 ? 255 : g + j
  b = b + j > 255 ? 255 : b + j
  return (255 << 24) | (b << 16) | (g << 8) | r
}
