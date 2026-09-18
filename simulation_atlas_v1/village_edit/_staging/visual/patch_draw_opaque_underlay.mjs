import fs from "fs"

const p = "src/lib/render/nature/draw.ts"
let t = fs.readFileSync(p, "utf8")

// Ensure dirtField is imported (naturePixel32 uses it)
if (!t.includes("dirtField") || !/import \{[\s\S]*dirtField[\s\S]*\} from \"\.\/shorePaint\"/.test(t)) {
  if (t.includes("shoreFieldFast,\n} from")) {
    t = t.replace("shoreFieldFast,\n} from", "shoreFieldFast,\n  dirtField,\n} from")
  } else if (t.includes("shoreFieldFast,\r\n} from")) {
    t = t.replace("shoreFieldFast,\r\n} from", "shoreFieldFast,\r\n  dirtField,\r\n} from")
  } else if (!t.includes("dirtField,")) {
    t = t.replace(
      "paintViewportShoreStrip,\n  shoreFieldFast,",
      "paintViewportShoreStrip,\n  dirtField,\n  shoreFieldFast,",
    )
  }
}

// Fix DIRT/SAND: opaque underlay BEFORE organic (painters void blit callbacks → holes leaked world-buffer stairs)
const dirtBlockRe =
  /if \(t === DIRT \|\| t === SAND\) \{\r?\n\s*\/\/ Organic dirt\/sand[\s\S]*?continue\r?\n\s*\}/

const dirtNew = `if (t === DIRT || t === SAND) {
        // Opaque underlay first — organic painters void blit callbacks, so holes otherwise
        // leak Manhattan world-buffer stairs. Then SDF lerp softens the parcel edge.
        const grassKey = natureGrassKey(biomeId, season, gx, gy)
        atlas.blit(ctx, grassKey, px, py, tileS, tileS)
        const coverKey = t === SAND ? "sand" : "grass_grazed"
        const coverC = atlas.color32(coverKey)
        fillTint(ctx, coverC, t === SAND ? [210, 186, 118] : [118, 92, 52], px, py, tileS, tileS, 0.92)
        const waterNear =
          countCardinalOf(terrain, worldW, gx, gy, (c) => c === WATER) >= 1 ||
          shoreFieldFast(terrain, worldW, gx + 0.5, gy + 0.5) > 0.28
        if (t === SAND && waterNear) {
          paintCoastalSand(ctx, atlas, terrain, worldW, gx, gy, px, py, tileS, () => {})
        } else {
          paintOrganicDirtPatch(ctx, atlas, terrain, worldW, gx, gy, px, py, tileS, () => {}, coverKey)
          if (waterNear) {
            paintLandShoreFringe(ctx, atlas, terrain, worldW, gx, gy, px, py, tileS)
          }
        }
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
      }`

if (!dirtBlockRe.test(t)) {
  console.error("dirt block miss", t.includes("Organic dirt/sand"))
  throw new Error("dirt block miss")
}
t = t.replace(dirtBlockRe, dirtNew)

// Fix WATER: grass+water opaque base then organic coast
const waterBlockRe =
  /if \(t === WATER\) \{\r?\n\s*\/\/ Organic coast[\s\S]*?continue\r?\n\s*\}/

const waterNew = `if (t === WATER) {
        // Coast: opaque land/water underlay then organic SDF (no world-buffer stairs through holes).
        const distLand = chebyshevDistToLand(terrain, worldW, gx, gy, 4)
        if (distLand >= 0 && distLand <= 3) {
          const landKey = natureGrassKey(biomeId, season, gx, gy)
          atlas.blit(ctx, landKey, px, py, tileS, tileS)
          const wKey = waterKeyAt(terrain, worldW, gx, gy)
          fillTint(
            ctx,
            atlas.color32(wKey === "water_deep" ? "water_deep" : "water"),
            wKey === "water_deep" ? [28, 68, 92] : [36, 88, 104],
            px,
            py,
            tileS,
            tileS,
            Math.max(0.35, 1 - distLand * 0.22),
          )
          paintOrganicShoreWater(ctx, atlas, terrain, worldW, gx, gy, px, py, tileS, () => {})
        } else {
          const wKey = waterKeyAt(terrain, worldW, gx, gy)
          atlas.blit(ctx, wKey === "water_deep" ? "water_deep" : "water", px, py, tileS, tileS)
        }
        continue
      }`

if (!waterBlockRe.test(t)) {
  console.error("water miss")
  throw new Error("water block miss")
}
t = t.replace(waterBlockRe, waterNew)

// Strengthen naturePixel32: sample 4 corners for band cells so world-buffer edge cells aren't single-center Manhattan
const pixOld = `    if (terrain === WATER) {
      const f = shoreFieldFast(terrainGrid, worldW, x + 0.5, y + 0.5)
      if (f < 0.92) {
        const land = a.color32("grass") ?? base
        const water = a.color32("water") ?? base
        const deep = a.color32("water_deep") ?? water
        const w1 = Math.max(0, Math.min(1, (f - 0.05) / 0.45))
        const w2 = Math.max(0, Math.min(1, (f - 0.48) / 0.4))
        return lerpPack(lerpPack(land, water, w1), deep, w2)
      }
    } else if (terrain === DIRT || terrain === SAND) {
      const f = dirtField(terrainGrid, worldW, x + 0.5, y + 0.5)
      const land = a.color32("grass") ?? base
      const cover =
        a.color32(terrain === SAND ? "sand" : "grass_grazed") ?? base
      const w = Math.max(0, Math.min(1, (f - 0.08) / 0.45))
      return lerpPack(land, cover, w)
    } else if (terrain === GRASS || key.startsWith("grass")) {
      const f = shoreFieldFast(terrainGrid, worldW, x + 0.5, y + 0.5)
      if (f > 0.12) {
        const water = a.color32("water") ?? base
        const w = Math.max(0, Math.min(1, (f - 0.12) / 0.4))
        return lerpPack(base, water, w * 0.85)
      }
    }`

const pixNew = `    // Average field at 4 corners — softens world-buffer cell colors vs center-only Manhattan.
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
    }`

if (!t.includes(pixOld)) {
  if (t.includes("fieldAvg")) console.warn("naturePixel32 already corner-sampled")
  else {
    console.error("pix block miss")
    const i = t.indexOf("if (terrain === WATER)")
    console.error(JSON.stringify(t.slice(i, i + 400)))
    throw new Error("pix miss")
  }
} else {
  t = t.replace(pixOld, pixNew)
}

fs.writeFileSync(p, t, "utf8")
console.log({
  dirtUnderlay: t.includes("Opaque underlay first"),
  waterUnderlay: t.includes("opaque land/water underlay"),
  fieldAvg: t.includes("fieldAvg"),
  dirtFieldImp: /dirtField/.test(t.slice(0, 500)),
  size: fs.statSync(p).size,
})