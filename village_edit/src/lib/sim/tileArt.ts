import {
  applyBiomeTintRgb,
  BiomeId,
  type BiomeId as BiomeIdT,
  type BiomeTintKind,
} from '@/lib/sim/biomeVisual'
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

/** Map terrain to biome tint channel (null = leave structures / furniture alone). */
export function terrainBiomeTintKind(terrain: number): BiomeTintKind | null {
  switch (terrain) {
    case GRASS:
    case FIELD:
    case LOOT:
    case WHEAT:
      return 'grass'
    case TREE:
      return 'tree'
    case BUSH:
      return 'bush'
    case WATER:
      return 'water'
    case SAND:
      return 'sand'
    case DIRT:
    case PATH:
    case TRAIL:
    case ROAD:
      return 'dirt'
    case MOUNTAIN:
      return 'mountain'
    case STONE:
    case GOLD:
    case IRON:
      return 'stone'
    default:
      return null
  }
}

export const TILE_PX = 3

type Layer = [number, number, string]

interface TileArt {
  base: string
  detail: Layer[]
  vary?: boolean
}

/**
 * DF Premium?inspired ground materials: crisp tile silhouettes from orbit,
 * richer soil / grass / rock / sand / snow mottling (not flat cartoon fills).
 */
export const TILE_ART: Record<number, TileArt> = {
  [GRASS]: {
    base: '#5f8a42',
    detail: [
      [0, 0, '#4a7234'],
      [1, 0, '#6e9a4c'],
      [2, 0, '#547e38'],
      [0, 1, '#6a9448'],
      [1, 1, '#3e6230'],
      [2, 1, '#72a050'],
      [0, 2, '#56823c'],
      [1, 2, '#7aac56'],
      [2, 2, '#4c7636'],
    ],
    vary: true,
  },
  [DIRT]: {
    base: '#6e5236',
    detail: [
      [0, 0, '#5a422c'],
      [1, 0, '#7a5e40'],
      [2, 0, '#4e3824'],
      [0, 1, '#826448'],
      [1, 1, '#3e2c1c'],
      [2, 1, '#6a4e32'],
      [0, 2, '#584028'],
      [1, 2, '#8a6c4c'],
      [2, 2, '#624830'],
    ],
    vary: true,
  },
  [SAND]: {
    base: '#cbb888',
    detail: [
      [0, 0, '#b8a474'],
      [1, 0, '#d8c898'],
      [2, 0, '#a89468'],
      [0, 1, '#d4c090'],
      [1, 1, '#c0ac7c'],
      [2, 1, '#e0d0a4'],
      [0, 2, '#b49e70'],
      [1, 2, '#cfc094'],
      [2, 2, '#a08860'],
    ],
    vary: true,
  },
  [WATER]: {
    base: '#255a76',
    detail: [
      [0, 0, '#2f6e8c'],
      [2, 1, '#1e4a64'],
      [1, 2, '#347898'],
    ],
    vary: true,
  },
  [TREE]: {
    base: '#1e4a28',
    detail: [
      [0, 0, '#163820'],
      [1, 0, '#2a5e34'],
      [2, 0, '#142c1a'],
      [0, 1, '#245830'],
      [1, 1, '#3a2818'],
      [2, 1, '#1a4024'],
      [0, 2, '#18341c'],
      [1, 2, '#2e6438'],
      [2, 2, '#122818'],
    ],
    vary: true,
  },
  [BUSH]: {
    base: '#356834',
    detail: [
      [0, 0, '#2a5428'],
      [1, 0, '#428040'],
      [2, 0, '#a83848'],
      [0, 1, '#b84454'],
      [1, 1, '#2e5a2c'],
      [2, 1, '#3e743c'],
      [0, 2, '#3a6c38'],
      [1, 2, '#264c24'],
      [2, 2, '#4a8848'],
    ],
    vary: true,
  },
  [STONE]: {
    base: '#7a7872',
    detail: [
      [0, 0, '#8e8c84'],
      [1, 0, '#686660'],
      [2, 0, '#9a9890'],
      [0, 1, '#5e5c56'],
      [1, 1, '#84827a'],
      [2, 1, '#706e68'],
      [0, 2, '#949288'],
      [1, 2, '#626058'],
      [2, 2, '#86847c'],
    ],
    vary: true,
  },
  [GOLD]: {
    base: '#6e6a62',
    detail: [
      [0, 0, '#7a766e'],
      [1, 0, '#e8c245'],
      [2, 0, '#5a564e'],
      [0, 1, '#c9a534'],
      [1, 1, '#8a8680'],
      [2, 1, '#f0d367'],
      [0, 2, '#646058'],
      [1, 2, '#d4b040'],
      [2, 2, '#747068'],
    ],
    vary: true,
  },
  [IRON]: {
    base: '#5e5852',
    detail: [
      [0, 0, '#6a645c'],
      [1, 0, '#b56a3c'],
      [2, 0, '#4a443e'],
      [0, 1, '#8a4a28'],
      [1, 1, '#726a62'],
      [2, 1, '#c97a46'],
      [0, 2, '#54504a'],
      [1, 2, '#a45a32'],
      [2, 2, '#68625a'],
    ],
    vary: true,
  },
  [MOUNTAIN]: {
    base: '#4e4a44',
    detail: [
      [0, 0, '#3a3630'],
      [1, 0, '#8a847a'],
      [2, 0, '#5a564e'],
      [0, 1, '#6a645c'],
      [1, 1, '#d8d2c6'],
      [2, 1, '#2e2a26'],
      [0, 2, '#58544c'],
      [1, 2, '#e8e4dc'],
      [2, 2, '#424038'],
    ],
    vary: true,
  },
  [TUNNEL]: {
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
    base: '#5f8a42',
    detail: [
      [1, 1, '#f2d65e'],
      [0, 1, '#d8b944'],
      [2, 0, '#4a7234'],
    ],
    vary: true,
  },
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
    base: '#8a6438',
    detail: [
      [0, 0, '#6e4e28'],
      [1, 0, '#9a7448'],
      [2, 0, '#7a5a30'],
      [0, 1, '#a88250'],
      [1, 1, '#5a4020'],
      [2, 1, '#8e6a40'],
      [0, 2, '#7a5a32'],
      [1, 2, '#b08a54'],
      [2, 2, '#684828'],
    ],
    vary: true,
  },
  [PATH]: {
    base: '#b08a52',
    detail: [
      [0, 0, '#9a7440'],
      [1, 0, '#c49a62'],
      [2, 0, '#8a6438'],
      [0, 1, '#c8a66c'],
      [1, 1, '#7a5430'],
      [2, 1, '#b89458'],
      [0, 2, '#a07a48'],
      [1, 2, '#d0b074'],
      [2, 2, '#8e6a3c'],
    ],
    vary: true,
  },
  [ROAD]: {
    base: '#b8a888',
    detail: [
      [0, 0, '#a49474'],
      [1, 0, '#c8b898'],
      [2, 0, '#8e7a58'],
      [0, 1, '#d0c0a0'],
      [1, 1, '#6e5a3e'],
      [2, 1, '#b4a484'],
      [0, 2, '#9a8a6a'],
      [1, 2, '#c4b494'],
      [2, 2, '#84745a'],
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
    base: '#5c4630',
    detail: [
      [0, 0, '#4a3824'],
      [1, 0, '#6e563c'],
      [2, 0, '#3e2e1c'],
      [0, 1, '#7a6244'],
      [1, 1, '#342416'],
      [2, 1, '#624a32'],
      [0, 2, '#544028'],
      [1, 2, '#8a6e4c'],
      [2, 2, '#46341e'],
    ],
    vary: true,
  },
}

export const WHEAT_SPROUT = 100
export const WHEAT_GREEN = 200
export const WHEAT_RIPE = 300

const WHEAT_STAGES: TileArt[] = [
  {
    base: '#5c4630',
    detail: [
      [0, 1, '#c8b888'],
      [2, 0, '#c8b888'],
      [1, 2, '#4a3824'],
    ],
  },
  {
    base: '#4e7238',
    detail: [
      [0, 0, '#6a9448'],
      [1, 1, '#7aa854'],
      [2, 0, '#5a843c'],
      [1, 2, '#3e5e2c'],
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

const WOOD_PILE_ART: TileArt = {
  base: '#6e5236',
  detail: [
    [1, 1, '#c4a06a'],
    [0, 2, '#4a3420'],
    [2, 0, '#8a6238'],
  ],
}

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

export function approxBiomeAt(x: number, y: number, terrain: number): BiomeIdT {
  const lat = Math.abs((y / Math.max(1, WORLD_SIZE - 1)) * 2 - 1)
  const n = tileNoise(x, y)
  if (terrain === WATER) return lat > 0.72 ? BiomeId.tundra : BiomeId.ocean
  if (terrain === SAND) return lat < 0.35 ? BiomeId.desert : BiomeId.coastal
  if (terrain === MOUNTAIN) return lat > 0.55 || n > 0.62 ? BiomeId.alpine : BiomeId.boreal
  if (terrain === STONE || terrain === GOLD || terrain === IRON) {
    return lat > 0.65 ? BiomeId.alpine : BiomeId.temperateForest
  }
  if (lat > 0.82) return BiomeId.tundra
  if (lat > 0.68) return n > 0.45 ? BiomeId.boreal : BiomeId.tundra
  if (lat > 0.48) return n > 0.55 ? BiomeId.temperateForest : BiomeId.boreal
  if (lat < 0.22) return n > 0.5 ? BiomeId.desert : BiomeId.savanna
  if (lat < 0.38) return n > 0.6 ? BiomeId.scrub : BiomeId.savanna
  if (terrain === TREE || terrain === BUSH) return BiomeId.temperateForest
  if (n > 0.78) return BiomeId.wetland
  return BiomeId.grassland
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

export function tilePixel32(
  terrain: number,
  amount: number,
  x: number,
  y: number,
  biomeId?: BiomeIdT,
): number {
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

  let r = packed & 255
  let g = (packed >> 8) & 255
  let b = (packed >> 16) & 255

  if (vary) {
    const n = tileNoise(x, y)
    const n2 = tileNoise(x + 91, y + 47)
    const n3 = tileNoise(x + 17, y + 133)

    if (kind === GRASS) {
      const j = ((n - 0.5) * 34) | 0
      const dry = n2 > 0.72 ? 10 : n2 < 0.22 ? -8 : 0
      r = clampByte(r + j - 6 + dry)
      g = clampByte(g + j + ((n3 * 12) | 0) + (dry >> 1))
      b = clampByte(b + ((j * 0.35) | 0) - 4)
    } else if (kind === DIRT || kind === TRAIL || kind === PATH || kind === ROAD) {
      const j = ((n - 0.5) * 26) | 0
      const mud = n2 > 0.7 ? -14 : n2 < 0.2 ? 12 : 0
      r = clampByte(r + j + mud + 2)
      g = clampByte(g + ((j * 0.85) | 0) + mud)
      b = clampByte(b + ((j * 0.55) | 0) + ((mud * 0.6) | 0) - 2)
    } else if (kind === TREE) {
      const j = ((n - 0.45) * 24) | 0
      r = clampByte(r + ((j * 0.45) | 0))
      g = clampByte(g + j)
      b = clampByte(b + ((j * 0.3) | 0) - 4)
    } else if (kind === BUSH) {
      const j = ((n - 0.5) * 20) | 0
      r = clampByte(r + j + (n2 > 0.75 ? 18 : 0))
      g = clampByte(g + j)
      b = clampByte(b + ((j * 0.4) | 0))
    } else if (kind === WATER) {
      const deep = tileNoise(x >> 2, y >> 2)
      const j = ((n - 0.5) * 18) | 0
      const depthPush = ((deep - 0.42) * 34) | 0
      r = clampByte(r + ((j * 0.2) | 0) - Math.max(0, depthPush) - 2)
      g = clampByte(g + ((j * 0.45) | 0) + ((n2 * 6) | 0) - 4 - ((depthPush * 0.7) | 0))
      b = clampByte(b + j + 4 - ((depthPush * 0.35) | 0))
      if (deep < 0.36) {
        r = clampByte(r + 5)
        g = clampByte(g + 9)
        b = clampByte(b + 3)
      }
    } else if (kind === MOUNTAIN) {
      const j = ((n - 0.4) * 32) | 0
      const snow = n2 > 0.62 ? 22 + ((n3 * 28) | 0) : n2 > 0.48 ? 10 : 0
      const shade = n3 < 0.28 ? -12 : 0
      r = clampByte(r + j + snow + shade)
      g = clampByte(g + j + snow + shade)
      b = clampByte(b + ((j * 0.85) | 0) + snow + 2 + shade)
    } else if (kind === STONE || kind === GOLD || kind === IRON) {
      const j = ((n - 0.5) * 28) | 0
      const facet = n2 > 0.65 ? 14 : n2 < 0.3 ? -12 : 0
      r = clampByte(r + j + facet)
      g = clampByte(g + j + facet)
      b = clampByte(b + ((j * 0.9) | 0) + facet)
    } else if (kind === TUNNEL) {
      const j = ((n - 0.55) * 18) | 0
      const mouth = amount >= 1 ? 10 : 0
      r = clampByte(r + j + mouth)
      g = clampByte(g + ((j * 0.7) | 0) + (amount >= 1 ? 6 : 0))
      b = clampByte(b + ((j * 0.5) | 0))
    } else if (kind === SAND) {
      const j = ((n - 0.5) * 22) | 0
      const dune = ((n2 - 0.5) * 16) | 0
      r = clampByte(r + j + dune + 3)
      g = clampByte(g + j + ((dune * 0.8) | 0))
      b = clampByte(b + ((j * 0.55) | 0) + ((dune * 0.4) | 0) - 3)
    } else if (kind === FIELD || kind === WHEAT) {
      const j = ((n - 0.5) * 22) | 0
      const furrow = (x + y) & 1 ? -6 : 4
      r = clampByte(r + j + furrow)
      g = clampByte(g + j + ((n2 * 6) | 0) + (furrow >> 1))
      b = clampByte(b + ((j * 0.45) | 0))
    } else {
      const j = (n * 16) | 0
      r = clampByte(r + j)
      g = clampByte(g + j)
      b = clampByte(b + j)
    }
  }

  const tintKind = terrainBiomeTintKind(kind)
  if (tintKind) {
    const id = biomeId ?? approxBiomeAt(x, y, kind)
    ;[r, g, b] = applyBiomeTintRgb(r, g, b, id, tintKind)
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

const GROUND_CLOSEUP = new Set([GRASS, DIRT, SAND, STONE, MOUNTAIN, FIELD, GOLD, IRON])

function isWater(t: number) {
  return t === WATER
}

/** Cheap height proxy for north-lit slope shade (no stored elevation). */
function terrainRelief(t: number): number {
  if (t === WATER) return 0
  if (t === SAND || t === BRIDGE || t === PORT || t === PATH || t === ROAD || t === TRAIL) return 1.1
  if (t === DIRT || t === FIELD || t === WHEAT || t === GRASS || t === BUSH) return 2
  if (t === TREE || t === PLANK) return 2.6
  if (t === HOUSE || t === MILL || t === FENCE || t === WALL_WOOD || t === WALL_STONE) return 3.2
  if (t === STONE || t === GOLD || t === IRON || t === TUNNEL) return 4.2
  if (t === MOUNTAIN) return 5
  return 2
}

function drawGroundMaterial(
  ctx: CanvasRenderingContext2D,
  t: number,
  px: number,
  py: number,
  tileS: number,
  gx: number,
  gy: number,
  biomeId: BiomeIdT,
) {
  const cell = Math.max(1, (tileS / 3) | 0)
  const art = tileArtFor(t)
  const kind = terrainBiomeTintKind(t) ?? 'dirt'

  for (let dy = 0; dy < 3; dy++) {
    for (let dx = 0; dx < 3; dx++) {
      let hex = art.base
      for (const [lx, ly, col] of art.detail) {
        if (lx === dx && ly === dy) {
          hex = col
          break
        }
      }
      const n = parseInt(hex.slice(1), 16)
      let r = (n >> 16) & 255
      let g = (n >> 8) & 255
      let b = n & 255
      ;[r, g, b] = applyBiomeTintRgb(r, g, b, biomeId, kind)
      const jitter = ((tileNoise(gx + dx * 3, gy + dy * 5) - 0.5) * 18) | 0
      r = clampByte(r + jitter)
      g = clampByte(g + jitter)
      b = clampByte(b + ((jitter * 0.7) | 0))
      ctx.fillStyle = `rgb(${r},${g},${b})`
      ctx.fillRect(px + dx * cell, py + dy * cell, cell + 0.5, cell + 0.5)
    }
  }

  if (tileS < 12) return

  if (t === GRASS) {
    for (let i = 0; i < 4; i++) {
      const n = tileNoise(gx + i * 11, gy + i * 7)
      if (n < 0.35) continue
      const [rr, gg, bb] = applyBiomeTintRgb(70, 110, 48, biomeId, 'grass')
      ctx.fillStyle = `rgba(${rr},${gg},${bb},0.55)`
      ctx.fillRect(px + n * tileS * 0.7, py + tileNoise(gx, gy + i) * tileS * 0.7, Math.max(1, tileS * 0.06), Math.max(1, tileS * 0.18))
    }
  } else if (t === DIRT || t === FIELD) {
    const mud = tileNoise(gx, gy) > 0.55
    const [rr, gg, bb] = applyBiomeTintRgb(mud ? 48 : 110, mud ? 34 : 88, mud ? 22 : 58, biomeId, 'dirt')
    ctx.fillStyle = `rgba(${rr},${gg},${bb},0.4)`
    ctx.fillRect(px + tileS * 0.2, py + tileS * 0.35, tileS * 0.45, tileS * 0.2)
  } else if (t === SAND) {
    for (let i = 0; i < 5; i++) {
      const n = tileNoise(gx + i * 3, gy + 9)
      const [rr, gg, bb] = applyBiomeTintRgb(200, 180, 130, biomeId, 'sand')
      ctx.fillStyle = `rgba(${rr},${gg},${bb},0.35)`
      ctx.fillRect(px + n * tileS * 0.8, py + tileNoise(gx + 2, gy + i) * tileS * 0.8, Math.max(1, tileS * 0.08), Math.max(1, tileS * 0.06))
    }
  } else if (t === STONE || t === GOLD || t === IRON) {
    const [rr, gg, bb] = applyBiomeTintRgb(55, 54, 50, biomeId, 'stone')
    ctx.fillStyle = `rgba(${rr},${gg},${bb},0.45)`
    ctx.fillRect(px + tileS * 0.15, py + tileS * 0.2, tileS * 0.35, tileS * 0.12)
    ctx.fillRect(px + tileS * 0.5, py + tileS * 0.55, tileS * 0.3, tileS * 0.15)
    if (t === GOLD || t === IRON) {
      ctx.fillStyle = t === GOLD ? 'rgba(232,194,69,0.7)' : 'rgba(181,106,60,0.7)'
      ctx.fillRect(px + tileS * 0.4, py + tileS * 0.4, tileS * 0.18, tileS * 0.14)
    }
  } else if (t === MOUNTAIN) {
    if (tileNoise(gx, gy) > 0.42) {
      const [rr, gg, bb] = applyBiomeTintRgb(220, 226, 232, biomeId, 'mountain')
      ctx.fillStyle = `rgba(${rr},${gg},${bb},0.55)`
      ctx.fillRect(px + tileS * 0.1, py + tileS * 0.08, tileS * 0.55, tileS * 0.22)
      ctx.fillRect(px + tileS * 0.45, py + tileS * 0.28, tileS * 0.35, tileS * 0.14)
    }
    const [sr, sg, sb] = applyBiomeTintRgb(40, 38, 34, biomeId, 'mountain')
    ctx.fillStyle = `rgba(${sr},${sg},${sb},0.4)`
    ctx.fillRect(px + tileS * 0.2, py + tileS * 0.55, tileS * 0.5, tileS * 0.2)
  }
}

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
  biome?: Uint8Array | null,
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
  const groundDetail = tileS >= 8 && tiles <= 11000
  const elevShade = tileS >= 8.5 && tiles <= 11000
  const shimmer = tileS >= 11 && tiles <= 9000
  const foam = tileS >= 12 && tiles <= 7000
  const phase = (nowMs * 0.00115) % (Math.PI * 2)
  const foamPulse = 0.5 + 0.5 * Math.sin(nowMs * 0.0024)

  for (let gy = y0; gy < y1; gy++) {
    const row = gy * WORLD_SIZE
    for (let gx = x0; gx < x1; gx++) {
      const t = terrain[row + gx]
      const px = (gx * tilePx - camX) * zoom
      const py = (gy * tilePx - camY) * zoom
      const biomeId = (biome?.[row + gx] as BiomeIdT | undefined) ?? approxBiomeAt(gx, gy, t)

      if (t === WATER) {
        // Open-water depth vs shore shallows from 4-neighbour openness.
        let open = 0
        if (gx > 0 && isWater(terrain[row + gx - 1])) open++
        if (gx < WORLD_SIZE - 1 && isWater(terrain[row + gx + 1])) open++
        if (gy > 0 && isWater(terrain[row - WORLD_SIZE + gx])) open++
        if (gy < WORLD_SIZE - 1 && isWater(terrain[row + WORLD_SIZE + gx])) open++
        if (open >= 4) {
          ctx.fillStyle = 'rgba(10, 32, 52, 0.18)'
          ctx.fillRect(px, py, tileS, tileS)
        } else if (open >= 3) {
          ctx.fillStyle = 'rgba(14, 40, 60, 0.1)'
          ctx.fillRect(px, py, tileS, tileS)
        } else if (open <= 1) {
          ctx.fillStyle = 'rgba(150, 198, 210, 0.11)'
          ctx.fillRect(px, py, tileS, tileS)
        }

        if (shimmer) {
          const n = tileNoise(gx, gy)
          const n2 = tileNoise(gx + 3, gy + 1)
          if (n > 0.55) {
            const a = 0.045 + Math.sin(phase + n * 9 + gx * 0.22 + gy * 0.08) * 0.035
            if (a > 0.012) {
              ctx.fillStyle = `rgba(190, 226, 238, ${a.toFixed(3)})`
              const hx = px + tileS * (0.08 + n * 0.55)
              const hy = py + tileS * (0.18 + n2 * 0.5)
              ctx.fillRect(hx, hy, Math.max(1.2, tileS * (0.22 + n * 0.18)), Math.max(1, tileS * 0.07))
            }
          }
          if (n2 > 0.72 && tileS >= 13) {
            const a2 = 0.03 + Math.sin(phase * 1.3 + n2 * 14) * 0.025
            if (a2 > 0.01) {
              ctx.fillStyle = `rgba(210, 236, 246, ${a2.toFixed(3)})`
              ctx.fillRect(
                px + tileS * (0.2 + n2 * 0.4),
                py + tileS * (0.35 + n * 0.3),
                Math.max(1, tileS * 0.16),
                Math.max(1, tileS * 0.05),
              )
            }
          }
        }
        if (foam) {
          const nEdge = gy > 0 && !isWater(terrain[row - WORLD_SIZE + gx])
          const sEdge = gy < WORLD_SIZE - 1 && !isWater(terrain[row + WORLD_SIZE + gx])
          const eEdge = gx < WORLD_SIZE - 1 && !isWater(terrain[row + gx + 1])
          const wEdge = gx > 0 && !isWater(terrain[row + gx - 1])
          if (nEdge || sEdge || eEdge || wEdge) {
            const breath = 0.14 + foamPulse * 0.1
            const f = Math.max(1, tileS * (0.1 + foamPulse * 0.04))
            const drawFoam = (fx: number, fy: number, fw: number, fh: number, seed: number) => {
              const speck = tileNoise(gx + seed, gy + seed * 3)
              const a = breath * (0.7 + speck * 0.5)
              ctx.fillStyle = `rgba(228, 240, 246, ${a.toFixed(3)})`
              ctx.fillRect(fx, fy, fw, fh)
              if (tileS >= 14 && speck > 0.55) {
                ctx.fillStyle = `rgba(245, 250, 252, ${(a * 0.55).toFixed(3)})`
                ctx.fillRect(fx + fw * speck * 0.4, fy + fh * 0.15, Math.max(1, fw * 0.35), Math.max(1, fh * 0.7))
              }
            }
            if (nEdge) drawFoam(px, py, tileS, f, 1)
            if (sEdge) drawFoam(px, py + tileS - f, tileS, f, 2)
            if (wEdge) drawFoam(px, py, f, tileS, 3)
            if (eEdge) drawFoam(px + tileS - f, py, f, tileS, 4)
          }
        }
        continue
      }

      // Soft north-lit relief (fake elevation) on top of ground materials.
      if (elevShade && !GROUND_CLOSEUP.has(t)) {
        const hHere = terrainRelief(t)
        const hN = gy > 0 ? terrainRelief(terrain[row - WORLD_SIZE + gx]) : hHere
        const slope = hHere - hN
        if (slope > 0.35) {
          ctx.fillStyle = `rgba(255, 248, 232, ${Math.min(0.09, slope * 0.028).toFixed(3)})`
          ctx.fillRect(px, py, tileS, tileS)
        } else if (slope < -0.35) {
          ctx.fillStyle = `rgba(18, 26, 34, ${Math.min(0.13, -slope * 0.032).toFixed(3)})`
          ctx.fillRect(px, py, tileS, tileS)
        }
      }

      if (groundDetail && GROUND_CLOSEUP.has(t) && !(t === DIRT && amount[row + gx] > 0)) {
        drawGroundMaterial(ctx, t, px, py, tileS, gx, gy, biomeId)
        if (elevShade) {
          const hHere = terrainRelief(t)
          const hN = gy > 0 ? terrainRelief(terrain[row - WORLD_SIZE + gx]) : hHere
          const slope = hHere - hN
          if (slope > 0.35) {
            ctx.fillStyle = `rgba(255, 248, 232, ${Math.min(0.08, slope * 0.024).toFixed(3)})`
            ctx.fillRect(px, py, tileS, tileS)
          } else if (slope < -0.35) {
            ctx.fillStyle = `rgba(18, 26, 34, ${Math.min(0.11, -slope * 0.028).toFixed(3)})`
            ctx.fillRect(px, py, tileS, tileS)
          }
        }
        continue
      }

      if (t === TREE && detail) {
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
        if (detail) {
          ctx.fillStyle = 'rgba(0,0,0,0.22)'
          ctx.fillRect(px + tileS * 0.12, py + tileS * 0.55, tileS * 0.78, tileS * 0.38)
        }
        ctx.fillStyle = '#c8b48a'
        ctx.fillRect(px + tileS * 0.12, py + tileS * 0.38, tileS * 0.76, tileS * 0.48)
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

      if (t === WORKBENCH || t === CHEST || t === BED || t === TABLE) {
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
