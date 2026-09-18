import { BiomeId, type BiomeId as BiomeIdT } from "./biomes"
import { BUSH, DIRT, FIELD, GOLD, GRASS, IRON, LOOT, MOUNTAIN, SAND, STONE, TREE, WATER, WHEAT } from "@/lib/sim/types"
import { getNatureAtlas, isNatureReady } from "./loader"
import { isGrassUnderlay, isNaturalTerrain } from "./kinds"
import { natureGroundKey, natureGrassKey, natureTextureKey, meadowValue, type SeasonName } from "./mapping"
import { hash2, CLIFF_SPRITE_H, PEAK_SPRITE_H, TREE_SPRITE_H, TREE_SPRITE_W } from "./textureLab"
import { drawGroundShadow, drawNorthLit, drawSouthFace } from "../fauxHeight"
import {
  dirtField,
  paintCoastalSand,
  paintDirtBleedOnGrass,
  paintLandShoreFringe,
  paintOrganicDirtPatch,
  paintOrganicShoreWater,
  paintViewportDirtStrip,
  paintViewportShoreStrip,
  cellTouchesShore,
  shoreField,
  shoreFieldFast,
  shoreLerpWeights,
  shoreRgbAt,
  shoreHardRgb,
  shoreAlpha,
  dirtAlpha,
} from "./shorePaint"
import { fbm2 } from "../noise"

/** MUST MATCH paintViewportShoreStrip / paintViewportDirtStrip (shorePaint). */
function smoothstep(e0: number, e1: number, x: number): number {
  if (e1 <= e0) return x >= e1 ? 1 : 0
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}

export function naturePixel32(
  terrain: number,
  amount: number,
  x: number,
  y: number,
  biome?: BiomeIdT,
  season: SeasonName = "spring",
  terrainGrid?: Uint8Array | null,
  worldW?: number,
): number | null {
  if (!isNatureReady()) return null
  const a = getNatureAtlas()
  if (!a) return null
  const key = natureTextureKey(terrain, amount, x, y, biome ?? BiomeId.grassland, season)
  if (!key) return null
  const base = a.color32(key)
  if (base == null) return null
  // World-buffer: same SDF fields + smoothsteps as viewport strips so mid-band/far zoom
  // don't leave a Manhattan rim under / beside the strip (Visuel 69.5).
  if (terrainGrid && worldW && worldW > 0) {
    const lerpPack = (ca: number, cb: number, t: number) => {
      const ra = ca & 255
      const ga = (ca >>> 8) & 255
      const ba = (ca >>> 16) & 255
      const rb = cb & 255
      const gb = (cb >>> 8) & 255
      const bb = (cb >>> 16) & 255
      const r = (ra + (rb - ra) * t) | 0
      const g = (ga + (gb - ga) * t) | 0
      const b = (ba + (bb - ba) * t) | 0
      return (255 << 24) | (b << 16) | (g << 8) | r
    }
    // 3×3 cell average ≈ strip sub-cell samples (one packed color per tile).
    const fieldAvg = (fn: (wx: number, wy: number) => number) => {
      let s = 0
      for (let j = 0; j < 3; j++) {
        for (let i = 0; i < 3; i++) {
          s += fn(x + (i + 0.5) / 3, y + (j + 0.5) / 3)
        }
      }
      return s * (1 / 9)
    }
    // World-buffer: HARD pick only (no cell-average cyan mid). Strip owns soft edge at closeup.
    const shoreBlend = (f: number, land: number, water: number, deep: number) => {
      if (shoreAlpha(f, x, y) < 1) return land
      const unpack = (c: number): [number, number, number] => [c & 255, (c >>> 8) & 255, (c >>> 16) & 255]
      const [r, g, b] = shoreHardRgb(f, unpack(water), unpack(deep))
      return (255 << 24) | (b << 16) | (g << 8) | r
    }
    const dirtBlend = (f: number, sf: number, land: number, cover: number, _sand: number) => {
      // Hard pick — soft edge owned by dirt strip. Never sand near shore (beige rim).
      if (dirtAlpha(f, x, y) < 1) return land
      if (sf > 0.22) return land
      return cover
    }
    if (terrain === WATER) {
      const f = fieldAvg((wx, wy) => shoreField(terrainGrid, worldW, wx, wy))
      if (f < 0.98) {
        const land = a.color32("grass") ?? base
        const water = a.color32("water") ?? base
        const deep = a.color32("water_deep") ?? water
        return shoreBlend(f, land, water, deep)
      }
    } else if (terrain === DIRT || terrain === SAND) {
      const f = fieldAvg((wx, wy) => dirtField(terrainGrid, worldW, wx, wy))
      const sf = fieldAvg((wx, wy) => shoreField(terrainGrid, worldW, wx, wy))
      const land = a.color32("grass") ?? base
      const cover = a.color32("grass_grazed") ?? base
      const sand = a.color32("sand") ?? (terrain === SAND ? base : cover)
      return dirtBlend(f, sf, land, cover, sand)
    } else if (terrain === GRASS || key.startsWith("grass")) {
      // Gate like strip AABB: only near water/dirt — field jig alone must not tint inland grass.
      const nearShore = (() => {
        const ix = x | 0
        const iy = y | 0
        for (let dy = -3; dy <= 3; dy++) {
          for (let dx = -3; dx <= 3; dx++) {
            const nx = ix + dx
            const ny = iy + dy
            if (nx < 0 || ny < 0 || nx >= worldW || ny >= worldW) continue
            if (terrainGrid[ny * worldW + nx] === WATER) return true
          }
        }
        return false
      })()
      if (nearShore) {
        const f = fieldAvg((wx, wy) => shoreField(terrainGrid, worldW, wx, wy))
        // Hard pick threshold matches shoreBlend — no soft cyan mid in world-buffer.
        if (f >= 0.48) {
          const water = a.color32("water") ?? base
          const deep = a.color32("water_deep") ?? water
          return shoreBlend(f, base, water, deep)
        }
      }
      const nearDirt = (() => {
        const ix = x | 0
        const iy = y | 0
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const nx = ix + dx
            const ny = iy + dy
            if (nx < 0 || ny < 0 || nx >= worldW || ny >= worldW) continue
            const c = terrainGrid[ny * worldW + nx]
            if (c === DIRT || c === SAND) return true
          }
        }
        return false
      })()
      if (nearDirt) {
        const df = fieldAvg((wx, wy) => dirtField(terrainGrid, worldW, wx, wy))
        if (df > 0.03) {
          const cover = a.color32("grass_grazed") ?? base
          const sand = a.color32("sand") ?? cover
          const sf = fieldAvg((wx, wy) => shoreField(terrainGrid, worldW, wx, wy))
          return dirtBlend(df, sf, base, cover, sand)
        }
      }
    }
  }
  return base
}

export function natureHandlesTerrain(terrain: number, amount = 0): boolean {
  return isNatureReady() && (isNaturalTerrain(terrain, amount) || isGrassUnderlay(terrain))
}

function waterKeyAt(
  terrain: Uint8Array,
  worldW: number,
  gx: number,
  gy: number,
): string {
  let landCard = 0
  let landDiag = 0
  let water = 0
  const n = (x: number, y: number, diag: boolean) => {
    if (x < 0 || y < 0 || x >= worldW || y >= worldW) return
    if (terrain[y * worldW + x] === WATER) water++
    else if (diag) landDiag++
    else landCard++
  }
  n(gx - 1, gy, false)
  n(gx + 1, gy, false)
  n(gx, gy - 1, false)
  n(gx, gy + 1, false)
  n(gx - 1, gy - 1, true)
  n(gx + 1, gy - 1, true)
  n(gx - 1, gy + 1, true)
  n(gx + 1, gy + 1, true)
  if (landCard >= 3 || (landCard >= 2 && landDiag >= 3)) return "water_shallow"
  if (water >= 8) return "water_deep"
  if (water >= 5) return "water"
  if (landCard >= 2) return "water"
  return "water"
}

function unpackRgb(c32: number): [number, number, number] {
  return [c32 & 0xff, (c32 >>> 8) & 0xff, (c32 >>> 16) & 0xff]
}

/** Meadow dither helper — soft color wash, not atlas mosaic. */
function fillTint(
  ctx: CanvasRenderingContext2D,
  c32: number | null,
  fallback: [number, number, number],
  x: number,
  y: number,
  w: number,
  h: number,
  alpha: number,
  tint = 0,
) {
  if (alpha <= 0.02) return
  const base = c32 != null ? unpackRgb(c32) : fallback
  const r = Math.max(0, Math.min(255, (base[0] + tint) | 0))
  const g = Math.max(0, Math.min(255, (base[1] + tint * 0.7) | 0))
  const b = Math.max(0, Math.min(255, (base[2] + tint * 0.45) | 0))
  ctx.globalAlpha = Math.min(1, alpha)
  ctx.fillStyle = `rgb(${r},${g},${b})`
  ctx.fillRect(x, y, w, h)
  ctx.globalAlpha = 1
}

function isTerrain(terrain: Uint8Array, worldW: number, x: number, y: number, code: number): boolean {
  if (x < 0 || y < 0 || x >= worldW || y >= worldW) return false
  return terrain[y * worldW + x] === code
}

function treeCountCardinal(terrain: Uint8Array, worldW: number, gx: number, gy: number): number {
  let n = 1
  if (isTerrain(terrain, worldW, gx - 1, gy, TREE)) n++
  if (isTerrain(terrain, worldW, gx + 1, gy, TREE)) n++
  if (isTerrain(terrain, worldW, gx, gy - 1, TREE)) n++
  if (isTerrain(terrain, worldW, gx, gy + 1, TREE)) n++
  return n
}

function chebyshevDist(
  terrain: Uint8Array,
  worldW: number,
  gx: number,
  gy: number,
  code: number,
  maxR: number,
): number {
  if (!isTerrain(terrain, worldW, gx, gy, code)) return -1
  for (let r = 1; r <= maxR; r++) {
    for (let dx = -r; dx <= r; dx++) {
      if (!isTerrain(terrain, worldW, gx + dx, gy - r, code)) return r - 1
      if (!isTerrain(terrain, worldW, gx + dx, gy + r, code)) return r - 1
    }
    for (let dy = -r + 1; dy <= r - 1; dy++) {
      if (!isTerrain(terrain, worldW, gx - r, gy + dy, code)) return r - 1
      if (!isTerrain(terrain, worldW, gx + r, gy + dy, code)) return r - 1
    }
  }
  return maxR
}

/** Distance from a WATER cell to nearest land (non-water). */
function chebyshevDistToLand(
  terrain: Uint8Array,
  worldW: number,
  gx: number,
  gy: number,
  maxR: number,
): number {
  if (!isTerrain(terrain, worldW, gx, gy, WATER)) return -1
  for (let r = 1; r <= maxR; r++) {
    for (let dx = -r; dx <= r; dx++) {
      if (!isTerrain(terrain, worldW, gx + dx, gy - r, WATER) && gy - r >= 0 && gy - r < worldW && gx + dx >= 0 && gx + dx < worldW)
        return r - 1
      if (!isTerrain(terrain, worldW, gx + dx, gy + r, WATER) && gy + r >= 0 && gy + r < worldW && gx + dx >= 0 && gx + dx < worldW)
        return r - 1
    }
    for (let dy = -r + 1; dy <= r - 1; dy++) {
      if (!isTerrain(terrain, worldW, gx - r, gy + dy, WATER) && gy + dy >= 0 && gy + dy < worldW && gx - r >= 0)
        return r - 1
      if (!isTerrain(terrain, worldW, gx + r, gy + dy, WATER) && gy + dy >= 0 && gy + dy < worldW && gx + r < worldW)
        return r - 1
    }
  }
  return maxR
}

function terraceLevel(dist: number, step: number, maxT: number): number {
  if (dist < 0) return -1
  const t = (dist / step) | 0
  return t > maxT ? maxT : t
}

function underCliffOverhang(terrain: Uint8Array, worldW: number, gx: number, gy: number): boolean {
  return isTerrain(terrain, worldW, gx, gy - 1, MOUNTAIN) || isTerrain(terrain, worldW, gx, gy - 1, STONE)
}

function mountainShelfKey(level: number, snowCap: boolean): string {
  if (snowCap) return "mountain_snow"
  if (level >= 2) return "mountain_plateau_3"
  if (level >= 1) return "mountain_plateau_2"
  return "mountain_plateau"
}

function snowOnLevel(level: number, season: SeasonName, biome: BiomeIdT): boolean {
  if (level < 2) return false
  if (season === "winter") return true
  if ((biome === BiomeId.alpine || biome === BiomeId.tundra) && level >= 3) return true
  return false
}

function countCardinalOf(
  terrain: Uint8Array,
  worldW: number,
  gx: number,
  gy: number,
  pred: (t: number) => boolean,
): number {
  let n = 0
  if (gx > 0 && pred(terrain[gy * worldW + gx - 1])) n++
  if (gx + 1 < worldW && pred(terrain[gy * worldW + gx + 1])) n++
  if (gy > 0 && pred(terrain[(gy - 1) * worldW + gx])) n++
  if (gy + 1 < worldW && pred(terrain[(gy + 1) * worldW + gx])) n++
  return n
}

function isMeadowish(t: number): boolean {
  return t === GRASS || t === TREE || t === BUSH || t === LOOT || t === DIRT
}

function isFieldish(t: number): boolean {
  return t === FIELD || t === WHEAT
}

/**
 * Forest density: dense stands draw MORE canopy (often 2â€“3 sprites / cell),
 * not fewer. Isolated trees stay single. Rare litter only on edges.
 */
function forestTreeSlots(terrain: Uint8Array, worldW: number, gx: number, gy: number): number {
  const n = treeCountCardinal(terrain, worldW, gx, gy)
  const h = hash2(gx, gy, 17)
  // Cap overlap — readable round crowns (Stardew/Puny), not trunk soup.
  if (n >= 4) return h > 0.55 ? 2 : 2
  if (n >= 3) return h > 0.65 ? 2 : 1
  if (n >= 2) return h > 0.7 ? 2 : 1
  // Forest border / isolated: ALWAYS a full crown overflowing into meadow (RimWorld/Stardew).
  // Stumps only in dense interior gaps (handled when n>=2 rare).
  if (h > 0.82) return 2
  return 1
}

function wheatOverlay(amount: number): string | null {
  if (amount >= 200) return "wheat_5"
  if (amount >= 135) return "wheat_4"
  if (amount >= 100) return "wheat_3"
  if (amount >= 70) return "wheat_2"
  if (amount > 0) return "wheat_1"
  return null
}

export function drawNatureCloseup(
  ctx: CanvasRenderingContext2D,
  terrain: Uint8Array,
  amount: Uint16Array,
  camX: number,
  camY: number,
  zoom: number,
  viewSize: number,
  tilePx: number,
  biome?: Uint8Array | null,
  season: SeasonName = "spring",
) {
  const atlas = getNatureAtlas()
  if (!atlas || !isNatureReady()) return
  const tileS = tilePx * zoom
  if (tileS < 5.5) return

  const worldW = Math.sqrt(terrain.length) | 0
  const x0 = Math.max(0, Math.floor(camX / tilePx) - 1)
  const y0 = Math.max(0, Math.floor(camY / tilePx) - 2)
  const x1 = Math.min(worldW, Math.ceil((camX + viewSize) / tilePx) + 1)
  const y1 = Math.min(worldW, Math.ceil((camY + viewSize) / tilePx) + 3)
  if ((x1 - x0) * (y1 - y0) > 12000) return
  const detail = tileS >= 7.5

  const prevSmooth = ctx.imageSmoothingEnabled
  ctx.imageSmoothingEnabled = false

  type Prop = {
    gx: number
    gy: number
    px: number
    py: number
    key: string
    kind: "bush" | "tree" | "rock" | "flower" | "peak" | "cliff"
    depth?: number
    scale?: number
    ox?: number
    oy?: number
  }
  const props: Prop[] = []

  const mtnDist = new Map<number, number>()
  const moundDist = new Map<number, number>()
  const distOf = (code: number, gx: number, gy: number, maxR: number, cache: Map<number, number>) => {
    const k = gy * worldW + gx
    const hit = cache.get(k)
    if (hit !== undefined) return hit
    const d = chebyshevDist(terrain, worldW, gx, gy, code, maxR)
    cache.set(k, d)
    return d
  }

  const isSharpPeak = (code: number, gx: number, gy: number, maxR: number, cache: Map<number, number>) => {
    const d = distOf(code, gx, gy, maxR, cache)
    if (d < 2) return false
    let lower = 0
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue
        if (!isTerrain(terrain, worldW, gx + dx, gy + dy, code)) {
          lower++
          continue
        }
        const nd = distOf(code, gx + dx, gy + dy, maxR, cache)
        if (nd > d) return false
        if (nd < d) lower++
      }
    }
    return lower >= 2 && hash2(gx, gy, 29) > 0.88
  }

  for (let gy = y0; gy < y1; gy++) {
    const row = gy * worldW
    for (let gx = x0; gx < x1; gx++) {
      const t = terrain[row + gx]
      const am = amount[row + gx]
      if (!isNaturalTerrain(t, am) && !isGrassUnderlay(t)) continue
      const px = (gx * tilePx - camX) * zoom
      const py = (gy * tilePx - camY) * zoom
      const biomeId = (biome?.[row + gx] as BiomeIdT | undefined) ?? BiomeId.grassland
      // WARP_V9: strip owns shore-adjacent cells — skip Manhattan atlas/fill at rim.
      const stripOwnsRim = cellTouchesShore(terrain, worldW, gx, gy, 2)

      if (isGrassUnderlay(t)) {
        if (stripOwnsRim) continue
        const g0 = natureGrassKey(biomeId, season, gx, gy)
        atlas.blit(ctx, g0, px, py, tileS, tileS)
        // Soft neighbor tint — kills visible 16x16 grid (Puny/Stardew meadow).
        if (detail && hash2(gx, gy, 27) > 0.55) {
          const g1 = natureGrassKey(biomeId, season, gx + 1, gy + 1)
          if (g1 !== g0) {
            ctx.globalAlpha = 0.28
            atlas.blit(ctx, g1, px, py, tileS, tileS)
            ctx.globalAlpha = 1
          }
        }
        continue
      }

      if (t === FIELD || t === WHEAT) {
        // Clear tilled soil â€” readable field, not grass-washed. Thin fringe only on true edges.
        const meadowN = countCardinalOf(terrain, worldW, gx, gy, isMeadowish)
        const fieldN = countCardinalOf(terrain, worldW, gx, gy, isFieldish)
        const edge = meadowN >= 1 && fieldN <= 2
        atlas.blit(ctx, edge ? "farmland_edge" : "farmland", px, py, tileS, tileS)
        if (t === WHEAT) {
          const crop = wheatOverlay(am)
          if (crop) atlas.blit(ctx, crop, px, py - tileS * 0.08, tileS, tileS)
        }
        continue
      }

      if (t === DIRT || t === SAND) {
        // Opaque underlay first — organic painters void blit callbacks, so holes otherwise
        // leak Manhattan world-buffer stairs. Then SDF lerp softens the parcel edge.
        // Grass underlay only — organic SDF paints dirt/sand; holes show grass (soft blob, no rect).
        if (!stripOwnsRim) {
          const grassKey = natureGrassKey(biomeId, season, gx, gy)
          atlas.blit(ctx, grassKey, px, py, tileS, tileS)
        }
        const coverKey = t === SAND ? "sand" : "grass_grazed"
        const waterNear =
          countCardinalOf(terrain, worldW, gx, gy, (c) => c === WATER) >= 1 ||
          shoreFieldFast(terrain, worldW, gx + 0.5, gy + 0.5) > 0.28
        // Shared viewport dirt/shore strips own continuous edges (per-cell organic = stairs + FPS).
        void waterNear
        void coverKey
        void paintCoastalSand
        void paintOrganicDirtPatch
        void paintLandShoreFringe
        if (detail && !underCliffOverhang(terrain, worldW, gx, gy) && hash2(gx, gy, 81) > 0.68) {
          const edgeish =
            countCardinalOf(terrain, worldW, gx, gy, (c) => c === GRASS || c === TREE || c === BUSH) >= 1
          if (edgeish || hash2(gx, gy, 82) > 0.82) {
            const kindRoll = hash2(gx, gy, 83)
            props.push({
              gx,
              gy,
              px,
              py,
              key:
                kindRoll > 0.78
                  ? "boulder_" + (((hash2(gx, gy, 84) * 12) | 0) % 12)
                  : kindRoll > 0.45
                    ? "grass_tuft"
                    : "flower",
              kind: kindRoll > 0.78 ? "rock" : "flower",
              ox: (hash2(gx, gy, 85) - 0.5) * 0.85,
              oy: (hash2(gx, gy, 86) - 0.5) * 0.55,
              scale: 0.55 + hash2(gx, gy, 87) * 0.55,
            })
          }
        }
        continue
      }

      if (t === WATER) {
        // Near-shore water: strip owns continuous silhouette (no Manhattan fillRect/atlas).
        if (stripOwnsRim) continue
        const distLand = chebyshevDistToLand(terrain, worldW, gx, gy, 4)
        if (distLand >= 0 && distLand <= 3) {
          ctx.fillStyle = "rgb(28,68,92)"
          ctx.fillRect(px, py, tileS + 0.5, tileS + 0.5)
        } else {
          const wKey = waterKeyAt(terrain, worldW, gx, gy)
          atlas.blit(ctx, wKey === "water_deep" ? "water_deep" : "water", px, py, tileS, tileS)
        }
        continue
      }

      if (t === MOUNTAIN) {
        const dist = distOf(MOUNTAIN, gx, gy, 18, mtnDist)
        const level = terraceLevel(dist, 6, 3)
        const snowCap = snowOnLevel(level, season, biomeId)
        atlas.blit(ctx, mountainShelfKey(level, snowCap), px, py, tileS, tileS)
        const southMtn = isTerrain(terrain, worldW, gx, gy + 1, MOUNTAIN)
        const southLevel = southMtn ? terraceLevel(distOf(MOUNTAIN, gx, gy + 1, 18, mtnDist), 6, 3) : -1
        const sharp = isSharpPeak(MOUNTAIN, gx, gy, 18, mtnDist)
        if (southLevel < level && !sharp) {
          const drop = southMtn ? Math.max(1, level - southLevel) : 1 + level
          const westMtn = isTerrain(terrain, worldW, gx - 1, gy, MOUNTAIN)
          const eastMtn = isTerrain(terrain, worldW, gx + 1, gy, MOUNTAIN)
          const westLevel = westMtn ? terraceLevel(distOf(MOUNTAIN, gx - 1, gy, 18, mtnDist), 6, 3) : -1
          const eastLevel = eastMtn ? terraceLevel(distOf(MOUNTAIN, gx + 1, gy, 18, mtnDist), 6, 3) : -1
          const outerWall = !southMtn
          const nearEdge = dist < 6
          const longSouthRim = westLevel === level && eastLevel === level
          if (outerWall || nearEdge || longSouthRim) {
            props.push({
              gx,
              gy,
              px,
              py,
              key: snowCap ? "mountain_face_snow" : "mountain_face",
              kind: "cliff",
              depth: southMtn ? drop : 2 + level,
            })
          }
        }
        if (sharp) {
          props.push({
            gx,
            gy,
            px,
            py,
            key: snowCap ? "mountain_peak_snow" : "mountain_peak",
            kind: "peak",
            scale: 0.72 + level * 0.12,
          })
        }
        continue
      }

      if (t === TREE) {
        // Same meadow grass as neighbors â€” continuous soil under canopy
        atlas.blit(ctx, natureGrassKey(biomeId, season, gx, gy), px, py, tileS, tileS)
        if (underCliffOverhang(terrain, worldW, gx, gy)) continue
        const slots = forestTreeSlots(terrain, worldW, gx, gy)
        if (slots === 0) {
          const deco = hash2(gx, gy, 23)
          if (deco > 0.55) props.push({ gx, gy, px, py, key: "mushroom", kind: "flower" })
          else if (deco > 0.28) props.push({ gx, gy, px, py, key: "tree_stump", kind: "rock" })
          else props.push({ gx, gy, px, py, key: "fallen_log", kind: "rock" })
        } else {
          // Dense forest: several canopy sprites per cell with jittered anchors
          const offsets: Array<[number, number, number]> =
            slots >= 3
              ? [
                  [-0.22, 0.08, 0.72],
                  [0.2, 0.02, 0.88],
                  [0.02, -0.06, 1.05],
                ]
              : slots === 2
                ? [
                    [-0.18, 0.06, 0.82],
                    [0.16, -0.04, 1.0],
                  ]
                : [[0, 0, 1]]
          for (let i = 0; i < slots; i++) {
            const [ox, oy, sc] = offsets[i]!
            const key =
              natureTextureKey(t, am, gx + i * 3, gy + i * 5, biomeId, season) ||
              natureTextureKey(t, am, gx, gy, biomeId, season)
            if (!key) continue
            const jitterX = (hash2(gx, gy, 40 + i) - 0.5) * 0.12
            const jitterY = (hash2(gx, gy, 50 + i) - 0.5) * 0.08
            props.push({
              gx,
              gy,
              px,
              py,
              key,
              kind: "tree",
              ox: ox + jitterX,
              oy: oy + jitterY,
              scale: sc * (0.92 + hash2(gx, gy, 60 + i) * 0.16),
              depth: oy + jitterY,
            })
          }
          // Understory: bush on dense stands + forest borders into meadow (readable edge).
          if (slots >= 2 && hash2(gx, gy, 71) > 0.88) {
            props.push({
              gx, gy, px, py,
              key: "grass_tuft",
              kind: "flower",
              ox: (hash2(gx, gy, 73) - 0.5) * 0.4,
              oy: 0.12,
              scale: 0.45,
            })
          }
        }
        continue
      }

      if (t === BUSH) {
        // Meadow underlay always — never a full-cell berry stamp field (anti-MC / Stardew).
        atlas.blit(ctx, natureGrassKey(biomeId, season, gx, gy), px, py, tileS, tileS)
        if (underCliffOverhang(terrain, worldW, gx, gy)) continue
        // Sparse shrubs only: ~1 in 5 cells, strong jitter, soft scale (RimWorld clutter).
        if (hash2(gx, gy, 31) < 0.78) {
          if (hash2(gx, gy, 32) > 0.55) {
            props.push({
              gx, gy, px, py,
              key: "grass_tuft",
              kind: "flower",
              ox: (hash2(gx, gy, 33) - 0.5) * 0.55,
              oy: (hash2(gx, gy, 34) - 0.5) * 0.3,
              scale: 0.55 + hash2(gx, gy, 35) * 0.35,
            })
          }
          continue
        }
        const bush = hash2(gx, gy, 36) > 0.5 ? "berry_bush" : "berry_bush_blue"
        props.push({
          gx, gy, px, py,
          key: bush,
          kind: "bush",
          ox: (hash2(gx, gy, 37) - 0.5) * 0.5,
          oy: (hash2(gx, gy, 38) - 0.5) * 0.25,
          scale: 0.7 + hash2(gx, gy, 39) * 0.45,
        })
        continue
      }

      if (t === LOOT) {
        // Ground underlay only — crate/bag drawn by settlementView (visual §57), not rock stamp.
        atlas.blit(ctx, natureGroundKey(t, am, gx, gy, biomeId, season) || "grass", px, py, tileS, tileS)
        continue
      }

      if (t === STONE || t === GOLD || t === IRON) {
        const dist = distOf(t, gx, gy, 4, moundDist)
        const level = terraceLevel(dist, 2, 1)
        // Ground shelf only — ore flecks as overflow props (RimWorld/Factorio mounds, not MC tint stamps).
        const shelf = level >= 1 ? "mountain_plateau_2" : "mountain_plateau"
        atlas.blit(ctx, shelf, px, py, tileS, tileS)
        if (t === GOLD || t === IRON) {
          const oreKey = t === GOLD ? "ore_gold" : "ore_iron"
          // Always a readable ore mound near deposit (mines_ore eye-QA); boulder is companion only.
          props.push({
            gx,
            gy,
            px,
            py,
            key: oreKey,
            kind: "rock",
            scale: 1.05 + hash2(gx, gy, 16) * 0.7,
            ox: (hash2(gx, gy, 17) - 0.5) * 0.22,
            oy: (hash2(gx, gy, 18) - 0.5) * 0.12,
          })
          if (hash2(gx, gy, 14) > 0.55) {
            props.push({
              gx,
              gy,
              px,
              py,
              key: "boulder_" + (((hash2(gx, gy, 15) * 12) | 0) % 12),
              kind: "rock",
              scale: 0.4 + hash2(gx, gy, 19) * 0.28,
              ox: (hash2(gx, gy, 20) - 0.5) * 0.4,
              oy: 0.12 + hash2(gx, gy, 21) * 0.1,
            })
          }
        }
        const southSame = isTerrain(terrain, worldW, gx, gy + 1, t)
        const southLevel = southSame ? terraceLevel(distOf(t, gx, gy + 1, 4, moundDist), 2, 1) : -1
        if (southLevel < level) {
          props.push({
            gx,
            gy,
            px,
            py,
            key: "mountain_face",
            kind: "rock",
            scale: southSame ? 0.32 : 0.4 + level * 0.1,
          })
        } else if (t === STONE && isSharpPeak(t, gx, gy, 4, moundDist) && hash2(gx, gy, 31) > 0.88) {
          props.push({
            gx,
            gy,
            px,
            py,
            key: "mountain_peak",
            kind: "peak",
            scale: 0.55,
          })
        }
        continue
      }

      const ground = natureTextureKey(t, am, gx, gy, biomeId, season)
      if (!ground) continue
      if (!(stripOwnsRim && (ground.startsWith("grass") || t === GRASS))) {
        atlas.blit(ctx, ground.startsWith("grass") ? natureGrassKey(biomeId, season, gx, gy) : ground, px, py, tileS, tileS)
      }
      if (ground.startsWith("grass")) {
        const waterN = countCardinalOf(terrain, worldW, gx, gy, (c) => c === WATER)
        let waterDiag = 0
        if (isTerrain(terrain, worldW, gx - 1, gy - 1, WATER)) waterDiag++
        if (isTerrain(terrain, worldW, gx + 1, gy - 1, WATER)) waterDiag++
        if (isTerrain(terrain, worldW, gx - 1, gy + 1, WATER)) waterDiag++
        if (isTerrain(terrain, worldW, gx + 1, gy + 1, WATER)) waterDiag++
        // Fringe/bleed owned by shared viewport strips.
      }
      if (ground.startsWith("grass") && !stripOwnsRim) {
        // Continuous meadow tint dither — soft fill, not mosaic grass-tile stairs.
        const n = Math.max(8, Math.min(16, Math.round(tileS * 0.55)))
        const cell = tileS / n
        const baseKey = natureGrassKey(biomeId, season, gx, gy)
        const baseC = atlas.color32(baseKey)
        const baseMv = meadowValue(gx, gy)
        for (let j = 0; j < n; j++) {
          for (let i = 0; i < n; i++) {
            const u = (i + 0.5) / n
            const v = (j + 0.5) / n
            const mv = meadowValue(gx + u, gy + v) + fbm2((gx + u) * 0.6, (gy + v) * 0.6, 2) * 0.08
            // Do not dither over organic shore/dirt fringe (would redraw Manhattan stairs).
            if (shoreFieldFast(terrain, worldW, gx + u, gy + v) > 0.12) continue
            if (dirtField(terrain, worldW, gx + u, gy + v) > 0.14) continue
            if (Math.abs(mv - baseMv) < 0.07) continue
            const alt = natureGrassKey(
              biomeId,
              season,
              gx + (((u - 0.5) * 2) | 0),
              gy + (((v - 0.5) * 2) | 0),
            )
            if (alt === baseKey) continue
            const a = 0.18 + Math.min(0.32, Math.abs(mv - baseMv) * 1.4)
            fillTint(
              ctx,
              atlas.color32(alt) ?? baseC,
              [58, 90, 38],
              px + i * cell,
              py + j * cell,
              cell + 0.45,
              cell + 0.45,
              a,
            )
          }
        }
      }
      if (detail && ground.startsWith("grass") && !underCliffOverhang(terrain, worldW, gx, gy)) {
        let nearTree = 0
        if (isTerrain(terrain, worldW, gx - 1, gy, TREE)) nearTree++
        if (isTerrain(terrain, worldW, gx + 1, gy, TREE)) nearTree++
        if (isTerrain(terrain, worldW, gx, gy - 1, TREE)) nearTree++
        if (isTerrain(terrain, worldW, gx, gy + 1, TREE)) nearTree++
        // Dense forest border into meadow: overhanging crown on grass cell (RimWorld/Stardew edge).
        // Sparse overhang only — dense fringe reads as trunk soup (eye-QA fail vs Stardew).
        if (nearTree >= 1 && hash2(gx, gy, 61) > 0.82) {
          const oak = `tree_oak_${Math.floor(hash2(gx, gy, 65) * 8)}`
          props.push({
            gx, gy, px, py,
            key: oak,
            kind: "tree",
            ox: (hash2(gx, gy, 62) - 0.5) * 0.45,
            oy: -0.12 + (hash2(gx, gy, 63) - 0.5) * 0.1,
            scale: 0.85 + hash2(gx, gy, 64) * 0.25,
          })
        }
      }
      if (
        detail &&
        (ground.startsWith("grass") || ground === "grass_summer" || ground === "grass_autumn") &&
        !underCliffOverhang(terrain, worldW, gx, gy) &&
        hash2(gx, gy, 21) > 0.78
      ) {
        // Sparse scatter (Stardew meadow) — avoid 2x2 berry/flower stamps.
        props.push({
          gx,
          gy,
          px,
          py,
          key: hash2(gx, gy, 24) > 0.88 ? "flower" : "grass_tuft",
          kind: "flower",
          ox: (hash2(gx, gy, 22) - 0.5) * 0.7,
          oy: (hash2(gx, gy, 23) - 0.5) * 0.45,
        })
      }
    }
  }

  // Shared continuous strips (opaque SDF) — kill per-cell Manhattan stairs.
  // Dirt FIRST, shore LAST — dirt AABB was flattening warped coast to Manhattan.
  paintViewportDirtStrip(ctx, atlas, terrain, worldW, x0, y0, x1, y1, camX, camY, zoom, tilePx)
  paintViewportShoreStrip(ctx, atlas, terrain, worldW, x0, y0, x1, y1, camX, camY, zoom, tilePx)

  // Foot-Y first (RimWorld), then layer: plants → ground props → trunks/crowns → cliffs → peaks.
  const kindZ = (k: Prop["kind"]) =>
    k === "flower" ? 0 : k === "bush" ? 1 : k === "rock" ? 2 : k === "tree" ? 3 : k === "cliff" ? 4 : 5
  props.sort((a, b) => {
    const fa = a.gy + (a.oy ?? 0) + (a.kind === "tree" ? 0.15 : a.kind === "peak" ? 0.35 : 0)
    const fb = b.gy + (b.oy ?? 0) + (b.kind === "tree" ? 0.15 : b.kind === "peak" ? 0.35 : 0)
    return fa - fb || kindZ(a.kind) - kindZ(b.kind) || a.gx - b.gx
  })

  for (const p of props) {
    const h = hash2(p.gx, p.gy, 13)
    if (p.kind === "tree") {
      const sc = p.scale ?? 1
      // Round crowns overflow cell (Stardew/Puny/RimWorld) — never MC 16x16 stamp.
      // Spec §§64–71 LIVE: TILE_PX=3 play zoom needs large multipliers so crowns read.
      const pineish = p.key.includes("pine")
      const deadish = p.key.includes("dead")
      // Round green canopy must dominate silhouette (Stardew/Puny) — not brown trunk stack.
      const tw = tileS * (pineish ? 2.55 + h * 0.6 : deadish ? 2.35 + h * 0.45 : 4.15 + h * 0.95) * sc
      const th = tileS * (pineish ? 3.55 + h * 0.9 : deadish ? 2.9 + h * 0.55 : 3.15 + h * 0.6) * sc
      const ox = (p.ox ?? 0) * tileS
      const oy = (p.oy ?? 0) * tileS
      const dx = p.px + (tileS - tw) * 0.5 + ox
      const dy = p.py + tileS - th + oy
      drawGroundShadow(ctx, dx + tw * 0.12, dy + th * 0.78, tw * 0.76, th * 0.14, 0.22)
      // Solid round crown sprite only — no face overlays (they scanned as horizontal slivers).
      atlas.blitRect(ctx, p.key, 0, 0, TREE_SPRITE_W, TREE_SPRITE_H, dx, dy, tw, th)
    } else if (p.kind === "cliff") {
      const drop = p.depth ?? 1
      const outer = drop >= 2
      const th = tileS * (outer ? 1.28 + Math.min(0.75, (drop - 2) * 0.22) : 0.55)
      atlas.blitRect(ctx, p.key, 0, 6, TREE_SPRITE_W, CLIFF_SPRITE_H - 6, p.px, p.py + tileS * 0.72, tileS, th)
    } else if (p.kind === "peak") {
      const s = p.scale ?? 0.8
      const tw = tileS * (0.7 + s * 0.25)
      const th = tileS * (0.85 + s * 0.35)
      atlas.blitRect(
        ctx,
        p.key,
        0,
        0,
        TREE_SPRITE_W,
        PEAK_SPRITE_H,
        p.px + (tileS - tw) * 0.5,
        p.py + tileS - th,
        tw,
        th,
      )
    } else if (p.kind === "rock") {
      const ox = (p.ox ?? 0) * tileS
      const oy = (p.oy ?? 0) * tileS
      if (p.key.startsWith("mountain_face") || p.key.startsWith("cliff")) {
        const th = tileS * (p.scale ?? 0.36)
        atlas.blitRect(ctx, p.key, 0, 6, TREE_SPRITE_W, CLIFF_SPRITE_H - 6, p.px + ox, p.py + tileS * 0.72 + oy, tileS, th)
      } else {
        // Ore mound / boulder / log — complete 16² prop overflow (not cliff strip).
        const sc = p.scale ?? 0.55
        const dw = tileS * (0.9 + sc * 0.55)
        const dh = tileS * (0.55 + sc * 0.35)
        const bx = p.px + (tileS - dw) * 0.5 + ox
        const by = p.py + tileS - dh * 0.85 + oy
        drawGroundShadow(ctx, bx + dw * 0.1, by + dh * 0.7, dw * 0.8, dh * 0.22, 0.16)
        atlas.blit(ctx, p.key, bx, by, dw, dh)
      }
    } else if (p.kind === "bush") {
      const sc = p.scale ?? 1
      const dw = tileS * 1.35 * sc
      const dh = tileS * 1.2 * sc
      const ox = (p.ox ?? 0) * tileS
      const oy = (p.oy ?? 0) * tileS
      const bx = p.px + (tileS - dw) * 0.5 + ox
      const by = p.py + tileS - dh - tileS * 0.08 + oy
      drawGroundShadow(ctx, bx, by, dw, dh + tileS * 0.2, 0.18)
      atlas.blit(ctx, p.key, bx, by, dw, dh)
      drawSouthFace(ctx, bx, by, dw, dh, tileS * 0.22, 0.32)
      drawNorthLit(ctx, bx, by, dw, Math.max(1, dh * 0.1))
    } else if (p.key === "grass_tuft") {
      const s = tileS * 0.72
      const ox = (p.ox ?? 0) * tileS
      const oy = (p.oy ?? 0) * tileS
      const bx = p.px + (tileS - s) * 0.5 + ox
      const by = p.py + tileS - s - tileS * 0.04 + oy
      atlas.blit(ctx, p.key, bx, by, s, s)
    } else {
      const s = tileS * 0.85
      const bx = p.px + (tileS - s) * 0.5 + ((hash2(p.gx, p.gy, 33) - 0.5) * tileS * 0.35)
      const by = p.py + tileS - s - tileS * 0.06 + ((hash2(p.gx, p.gy, 34) - 0.5) * tileS * 0.15)
      drawGroundShadow(ctx, bx, by, s, s + tileS * 0.15, 0.16)
      atlas.blit(ctx, p.key, bx, by, s, s)
      drawSouthFace(ctx, bx, by, s, s, tileS * 0.16, 0.3)
    }
  }

  ctx.imageSmoothingEnabled = prevSmooth
}
