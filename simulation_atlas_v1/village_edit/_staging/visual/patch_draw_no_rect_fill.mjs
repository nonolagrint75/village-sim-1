import fs from "fs"
const p = "src/lib/render/nature/draw.ts"
let t = fs.readFileSync(p, "utf8")

const dirtBad = `        const grassKey = natureGrassKey(biomeId, season, gx, gy)
        atlas.blit(ctx, grassKey, px, py, tileS, tileS)
        const coverKey = t === SAND ? "sand" : "grass_grazed"
        const coverC = atlas.color32(coverKey)
        fillTint(ctx, coverC, t === SAND ? [210, 186, 118] : [118, 92, 52], px, py, tileS, tileS, 0.92)
        const waterNear =`

const dirtGood = `        // Grass underlay only — organic SDF paints dirt/sand; holes show grass (soft blob, no rect).
        const grassKey = natureGrassKey(biomeId, season, gx, gy)
        atlas.blit(ctx, grassKey, px, py, tileS, tileS)
        const coverKey = t === SAND ? "sand" : "grass_grazed"
        const waterNear =`

if (t.includes("fillTint(ctx, coverC")) {
  t = t.replace(dirtBad, dirtGood)
  console.log("dirt fillTint removed")
} else console.log("dirt fillTint already absent")

const waterBad = `          const landKey = natureGrassKey(biomeId, season, gx, gy)
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
          paintOrganicShoreWater(ctx, atlas, terrain, worldW, gx, gy, px, py, tileS, () => {})`

const waterGood = `          // Land underlay — organic shore paints water; holes = land (no Manhattan water rect).
          const landKey = natureGrassKey(biomeId, season, gx, gy)
          atlas.blit(ctx, landKey, px, py, tileS, tileS)
          paintOrganicShoreWater(ctx, atlas, terrain, worldW, gx, gy, px, py, tileS, () => {})`

if (t.includes("1 - distLand * 0.22")) {
  t = t.replace(waterBad, waterGood)
  console.log("water fillTint removed")
} else console.log("water fillTint already absent")

fs.writeFileSync(p, t, "utf8")
console.log({
  noDirtFill: !t.includes("fillTint(ctx, coverC"),
  noWaterFill: !t.includes("1 - distLand"),
})