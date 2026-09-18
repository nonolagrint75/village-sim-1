/**
 * Classic pixel terrain palette — Minecraft / tileArt colors.
 * Indices MUST match types.ts terrain codes.
 */

export type Rgb = [number, number, number]

export const TERRAIN_RGB: Rgb[] = Array.from({ length: 64 }, () => [0.42, 0.58, 0.30] as Rgb)

function set(id: number, hex: string) {
  const n = parseInt(hex.slice(1), 16)
  TERRAIN_RGB[id] = [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

set(0, '#5a7a42') // GRASS
set(1, '#8a8880') // STONE
set(2, '#2a4a28') // TREE — readable canopy at distance
set(3, '#356834') // BUSH
set(4, '#c4a060') // GOLD
set(5, '#8a5a30') // FENCE
set(6, '#4a2e14') // HOUSE — dark timber, still visible zoomed out
set(7, '#c4a060') // LOOT
set(8, '#6a4818') // CHEST
set(9, '#8a5828') // WORKBENCH
set(10, '#4a2e14') // WALL_WOOD
set(11, '#6a6660') // WALL_STONE
set(12, '#6a5238') // DIRT
set(13, '#c43a3a') // BED
set(14, '#245868') // WATER
set(15, '#9a7848') // PATH
set(16, '#7a5834') // BRIDGE
set(17, '#d4c28a') // SAND
set(18, '#c9a56a') // PLANK
set(19, '#4a3220') // FIELD
set(20, '#5a7a3a') // WHEAT
set(21, '#7a7268') // MILL
set(22, '#a8824c') // TRAIL
set(23, '#c8b898') // ROAD
set(24, '#5a3e24') // PORT
set(25, '#4a4640') // IRON
set(26, '#5a5248') // MOUNTAIN
set(27, '#1a1612') // TUNNEL
set(28, '#5a3e20') // TABLE
set(29, '#4a4a4a') // HEARTH
set(30, '#6a5840') // BENCH
set(31, '#6a5840') // STOOL
set(32, '#5a4028') // SHELF
set(33, '#5a4028') // CUPBOARD
set(34, '#c8a878') // CRADLE
set(35, '#d0c0a0') // LOOM
set(36, '#5a7a8a') // WASHING_TUB
set(37, '#5a9abc') // WELL — cool stone+water pop at distance
set(38, '#ff6a20') // PLAZA_FIRE — hot ember, not mud brown

export function paletteFloat32(): Float32Array {
  const out = new Float32Array(64 * 3)
  for (let i = 0; i < 64; i++) {
    const c = TERRAIN_RGB[i] ?? TERRAIN_RGB[0]
    out[i * 3] = c[0]
    out[i * 3 + 1] = c[1]
    out[i * 3 + 2] = c[2]
  }
  return out
}
