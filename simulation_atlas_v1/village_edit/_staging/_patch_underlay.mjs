import fs from "fs"
const path = "src/lib/render/nature/draw.ts"
let t = fs.readFileSync(path, "utf8")
const old = `      if (t === WATER) {
        // Coast: opaque land/water underlay then organic SDF (no world-buffer stairs through holes).
        const distLand = chebyshevDistToLand(terrain, worldW, gx, gy, 4)
        if (distLand >= 0 && distLand <= 4) {
          // Land underlay — organic shore paints water; holes = land (no Manhattan water rect).
          // Neutral underlay — shared shore strip owns the continuous silhouette.
          const wKey = waterKeyAt(terrain, worldW, gx, gy)
          atlas.blit(ctx, wKey === "water_deep" ? "water_deep" : "water", px, py, tileS, tileS)
        } else {
          const wKey = waterKeyAt(terrain, worldW, gx, gy)
          atlas.blit(ctx, wKey === "water_deep" ? "water_deep" : "water", px, py, tileS, tileS)
        }
        continue
      }`
const next = `      if (t === WATER) {
        const distLand = chebyshevDistToLand(terrain, worldW, gx, gy, 4)
        if (distLand >= 0 && distLand <= 2) {
          // Grass underlay on coast — if strip chunks miss, no light-blue Manhattan water tile rim.
          atlas.blit(ctx, natureGrassKey(biomeId, season, gx, gy), px, py, tileS, tileS)
        } else {
          const wKey = waterKeyAt(terrain, worldW, gx, gy)
          atlas.blit(ctx, wKey === "water_deep" ? "water_deep" : "water", px, py, tileS, tileS)
        }
        continue
      }`
if (!t.includes(old)) {
  const i = t.indexOf("if (t === WATER)")
  console.log(t.slice(i, i+600))
  process.exit(1)
}
t = t.replace(old, next)
fs.writeFileSync(path, t, "utf8")
console.log("coast underlay = grass")