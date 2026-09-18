import fs from "fs"

const path = "src/lib/render/nature/draw.ts"
let t = fs.readFileSync(path, "utf8")

const oldImport = `import {
  dirtField,
  paintCoastalSand,
  paintDirtBleedOnGrass,
  paintLandShoreFringe,
  paintOrganicDirtPatch,
  paintOrganicShoreWater,
  paintViewportDirtStrip,
  paintViewportShoreStrip,
  shoreFieldFast,
} from "./shorePaint"`

const newImport = `import {
  dirtField,
  paintCoastalSand,
  paintDirtBleedOnGrass,
  paintLandShoreFringe,
  paintOrganicDirtPatch,
  paintOrganicShoreWater,
  paintViewportDirtStrip,
  paintViewportShoreStrip,
  shoreField,
  shoreFieldFast,
} from "./shorePaint"`

if (!t.includes(oldImport)) {
  console.error("import block not found")
  process.exit(1)
}
t = t.replace(oldImport, newImport)

const oldPixel = `export function naturePixel32(
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
  // World-buffer organic shore/dirt: blend at pack time so scaled buffer isn't pure Manhattan.
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
    // Average field at 4 corners — softens world-buffer cell colors vs center-only Manhattan.
    const fieldAvg = (fn: (wx: number, wy: number) => number) =>
      (fn(x + 0.2, y + 0.2) + fn(x + 0.8, y + 0.2) + fn(x + 0.2, y + 0.8) + fn(x + 0.8, y + 0.8)) * 0.25
    if (terrain === WATER) {
      const f = fieldAvg((wx, wy) => shoreFieldFast(terrainGrid, worldW, wx, wy))
      if (f < 0.92) {
        const land = a.color32("grass") ?? base
        const water = a.color32("water") ?? base
        const deep = a.color32("water_deep") ?? water
        const w1 = Math.max(0, Math.min(1, (f - 0.05) / 0.45))
        const w2 = Math.max(0, Math.min(1, (f - 0.48) / 0.4))
        return lerpPack(lerpPack(land, water, w1), deep, w2)
      }
    } else if (terrain === DIRT || terrain === SAND) {
      const f = fieldAvg((wx, wy) => dirtField(terrainGrid, worldW, wx, wy))
      const land = a.color32("grass") ?? base
      const cover =
        a.color32(terrain === SAND ? "sand" : "grass_grazed") ?? base
      const w = Math.max(0, Math.min(1, (f - 0.08) / 0.45))
      return lerpPack(land, cover, w)
    } else if (terrain === GRASS || key.startsWith("grass")) {
      const f = fieldAvg((wx, wy) => shoreFieldFast(terrainGrid, worldW, wx, wy))
      if (f > 0.12) {
        const water = a.color32("water") ?? base
        const w = Math.max(0, Math.min(1, (f - 0.12) / 0.4))
        return lerpPack(base, water, w * 0.85)
      }
      const df = fieldAvg((wx, wy) => dirtField(terrainGrid, worldW, wx, wy))
      if (df > 0.15) {
        const cover = a.color32("grass_grazed") ?? base
        const w = Math.max(0, Math.min(1, (df - 0.15) / 0.4))
        return lerpPack(base, cover, w * 0.9)
      }
    }
  }
  return base
}`

const newPixel = `export function naturePixel32(
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
  // World-buffer must match viewport strip fields (same shoreField/dirtField + band edges).
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
    const ss = (e0: number, e1: number, v: number) => {
      if (e1 <= e0) return v >= e1 ? 1 : 0
      const u = Math.max(0, Math.min(1, (v - e0) / (e1 - e0)))
      return u * u * (3 - 2 * u)
    }
    // Same 4-corner avg as a soft cell sample of the continuous strip field.
    const fieldAvg = (fn: (wx: number, wy: number) => number) =>
      (fn(x + 0.2, y + 0.2) + fn(x + 0.8, y + 0.2) + fn(x + 0.2, y + 0.8) + fn(x + 0.8, y + 0.8)) * 0.25
    if (terrain === WATER) {
      const f = fieldAvg((wx, wy) => shoreField(terrainGrid, worldW, wx, wy))
      const land = a.color32("grass") ?? base
      const water = a.color32("water") ?? base
      const deep = a.color32("water_deep") ?? water
      // Match paintViewportShoreStrip bands exactly.
      const w = ss(0.12, 0.48, f)
      const deepW = ss(0.52, 0.94, f)
      return lerpPack(lerpPack(land, water, w), deep, deepW)
    } else if (terrain === DIRT || terrain === SAND) {
      const f = fieldAvg((wx, wy) => dirtField(terrainGrid, worldW, wx, wy))
      const land = a.color32("grass") ?? base
      const cover =
        a.color32(terrain === SAND ? "sand" : "grass_grazed") ?? base
      // Match paintViewportDirtStrip smoothstep(0.03, 0.36, f).
      const w = ss(0.03, 0.36, f)
      return lerpPack(land, cover, w)
    } else if (terrain === GRASS || key.startsWith("grass")) {
      const f = fieldAvg((wx, wy) => shoreField(terrainGrid, worldW, wx, wy))
      if (f > 0.12) {
        const water = a.color32("water") ?? base
        const w = ss(0.12, 0.48, f)
        return lerpPack(base, water, w * 0.85)
      }
      const df = fieldAvg((wx, wy) => dirtField(terrainGrid, worldW, wx, wy))
      if (df > 0.03) {
        const cover = a.color32("grass_grazed") ?? base
        const w = ss(0.03, 0.36, df)
        return lerpPack(base, cover, w * 0.9)
      }
    }
  }
  return base
}`

if (!t.includes(oldPixel)) {
  console.error("naturePixel32 block not found")
  // debug: show start
  const i = t.indexOf("export function naturePixel32")
  console.log("idx", i, t.slice(i, i + 200))
  process.exit(1)
}
t = t.replace(oldPixel, newPixel)
fs.writeFileSync(path, t, "utf8")
console.log("draw.ts naturePixel32 aligned", fs.statSync(path).size)