import fs from "fs"
const p = "src/lib/render/nature/draw.ts"
let t = fs.readFileSync(p, "utf8")

const start = t.indexOf('const ground = natureTextureKey(t, am, gx, gy, biomeId, season)')
if (start < 0) throw new Error("ground start miss")
const fringeStart = t.indexOf('if (ground.startsWith("grass")) {\n        const waterN = countCardinalOf', start)
if (fringeStart < 0) throw new Error("fringe start miss")
const fringeEnd = t.indexOf('paintDirtBleedOnGrass(ctx, atlas, terrain, worldW, gx, gy, px, py, tileS)\n      }\n', fringeStart)
if (fringeEnd < 0) throw new Error("fringe end miss")
const fringeEndFull = fringeEnd + 'paintDirtBleedOnGrass(ctx, atlas, terrain, worldW, gx, gy, px, py, tileS)\n      }\n'.length

const fringeBlock = t.slice(fringeStart, fringeEndFull)
// remove early fringe
t = t.slice(0, fringeStart) + t.slice(fringeEndFull)

// Find end of meadow dither: after first grass dither block, before detail flower props
const det = t.indexOf('if (\n        detail &&\n        (ground.startsWith("grass") || ground === "grass_summer"', fringeStart - 50)
if (det < 0) {
  // try with \r\n
  const det2 = t.indexOf('ground === "grass_summer"', fringeStart)
  console.log("near", JSON.stringify(t.slice(det2 - 80, det2 + 40)))
  throw new Error("detail block miss")
}
// Walk back to find the closing of dither - look for "ctx.globalAlpha = 1" before detail
const alpha = t.lastIndexOf("ctx.globalAlpha = 1", det)
if (alpha < 0 || alpha < fringeStart) throw new Error("alpha miss")
const insertAt = t.indexOf("\n", alpha) + 1
// find the closing brace of grass dither if after alpha
let pos = insertAt
// skip whitespace and closing braces of for-loops / if ground.startsWith grass dither
// Safer: insert right before `if (\n        detail &&`
const fringeLate = `      // Organic fringe AFTER meadow dither so soft dirt/water edges are not wiped.
      if (ground.startsWith("grass")) {
        const waterN = countCardinalOf(terrain, worldW, gx, gy, (c) => c === WATER)
        let waterDiag = 0
        if (isTerrain(terrain, worldW, gx - 1, gy - 1, WATER)) waterDiag++
        if (isTerrain(terrain, worldW, gx + 1, gy - 1, WATER)) waterDiag++
        if (isTerrain(terrain, worldW, gx - 1, gy + 1, WATER)) waterDiag++
        if (isTerrain(terrain, worldW, gx + 1, gy + 1, WATER)) waterDiag++
        if (waterN >= 1 || waterDiag >= 1 || shoreFieldFast(terrain, worldW, gx + 0.5, gy + 0.5) > 0.14) {
          paintLandShoreFringe(ctx, atlas, terrain, worldW, gx, gy, px, py, tileS)
        }
        const dirtN = countCardinalOf(terrain, worldW, gx, gy, (c) => c === DIRT || c === SAND)
        if (dirtN >= 1 || dirtField(terrain, worldW, gx + 0.5, gy + 0.5) > 0.12) {
          paintDirtBleedOnGrass(ctx, atlas, terrain, worldW, gx, gy, px, py, tileS)
        }
      }
`
t = t.slice(0, det) + fringeLate + t.slice(det)
fs.writeFileSync(p, t, "utf8")
console.log({
  after: t.includes("Organic fringe AFTER meadow dither"),
  earlyGone: !t.includes(fringeBlock.slice(0, 60)),
  bleed: (t.match(/paintDirtBleedOnGrass/g) || []).length,
})