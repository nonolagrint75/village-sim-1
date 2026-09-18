import fs from "fs"

const p = "src/lib/render/nature/draw.ts"
let t = fs.readFileSync(p, "utf8")

// --- imports ---
const oldImp = `import {
  paintViewportDirtStrip,
  paintViewportShoreStrip,
} from "./shorePaint"`
const newImp = `import {
  paintCoastalSand,
  paintDirtBleedOnGrass,
  paintLandShoreFringe,
  paintOrganicDirtPatch,
  paintOrganicShoreWater,
  paintViewportDirtStrip,
  paintViewportShoreStrip,
} from "./shorePaint"`
if (!t.includes(oldImp)) throw new Error("import block missing")
if (!t.includes("paintOrganicShoreWater")) t = t.replace(oldImp, newImp)

// --- helper near waterKeyAt ---
if (!t.includes("function nearCode(")) {
  const marker = "function waterKeyAt("
  const i = t.indexOf(marker)
  if (i < 0) throw new Error("waterKeyAt missing")
  const helper = `/** Cheap band test — organic paint only near transitions (FPS). */
function nearCode(
  terrain: Uint8Array,
  worldW: number,
  gx: number,
  gy: number,
  code: number,
  r: number,
): boolean {
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx === 0 && dy === 0) continue
      const x = gx + dx
      const y = gy + dy
      if (x < 0 || y < 0 || x >= worldW || y >= worldW) continue
      if (terrain[y * worldW + x] === code) return true
    }
  }
  return false
}

function nearWaterOrDirt(
  terrain: Uint8Array,
  worldW: number,
  gx: number,
  gy: number,
  r: number,
): { water: boolean; dirt: boolean } {
  let water = false
  let dirt = false
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx === 0 && dy === 0) continue
      const x = gx + dx
      const y = gy + dy
      if (x < 0 || y < 0 || x >= worldW || y >= worldW) continue
      const c = terrain[y * worldW + x]!
      if (c === WATER) water = true
      if (c === DIRT || c === SAND) dirt = true
      if (water && dirt) return { water, dirt }
    }
  }
  return { water, dirt }
}

`
  t = t.slice(0, i) + helper + t.slice(i)
}

// --- DIRT/SAND ground pass ---
const dirtOld = `      if (t === DIRT || t === SAND) {
        // Grass underlay only — continuous dirt/sand via paintViewportDirtStrip after loop.
        const grassKey = natureGrassKey(biomeId, season, gx, gy)
        atlas.blit(ctx, grassKey, px, py, tileS, tileS)`

// try both dash styles
const dirtOld2 = dirtOld.replace("—", "-")
const dirtNew = `      if (t === DIRT || t === SAND) {
        // Organic dirt/sand at paint time — no Manhattan grass/dirt rect (Stardew/Puny).
        const grassKey = natureGrassKey(biomeId, season, gx, gy)
        const blitGrass = () => atlas.blit(ctx, grassKey, px, py, tileS, tileS)
        if (t === SAND && nearCode(terrain, worldW, gx, gy, WATER, 2)) {
          paintCoastalSand(ctx, atlas, terrain, worldW, gx, gy, px, py, tileS, blitGrass)
        } else {
          paintOrganicDirtPatch(
            ctx,
            atlas,
            terrain,
            worldW,
            gx,
            gy,
            px,
            py,
            tileS,
            blitGrass,
            t === SAND ? "sand" : "grass_grazed",
          )
        }`

if (t.includes(dirtOld)) t = t.replace(dirtOld, dirtNew)
else if (t.includes(dirtOld2)) t = t.replace(dirtOld2, dirtNew)
else {
  // fuzzy: find block
  const m = t.match(/if \(t === DIRT \|\| t === SAND\) \{\r?\n[\s\S]*?const grassKey = natureGrassKey\([\s\S]*?atlas\.blit\(ctx, grassKey, px, py, tileS, tileS\)/)
  if (!m) throw new Error("DIRT block not found")
  t = t.replace(m[0], dirtNew.replace(/^      /, "").replace(/\n      /g, "\n").split("\n").map((l,i)=> i===0?m[0].match(/^ */)?.[0]+l.trimStart():"        "+l.trim()).join("\n") )
  // simpler fallback below if needed
}

// Re-do dirt more carefully if organic not present
if (!t.includes("paintOrganicDirtPatch(")) {
  const re = /if \(t === DIRT \|\| t === SAND\) \{\r?\n\s*\/\/[^\n]*\r?\n\s*const grassKey = natureGrassKey\(biomeId, season, gx, gy\)\r?\n\s*atlas\.blit\(ctx, grassKey, px, py, tileS, tileS\)/
  if (!re.test(t)) throw new Error("DIRT regex miss: " + JSON.stringify(t.slice(t.indexOf("t === DIRT"), t.indexOf("t === DIRT")+200)))
  t = t.replace(
    re,
    `if (t === DIRT || t === SAND) {
        // Organic dirt/sand at paint time - no Manhattan grass/dirt rect (Stardew/Puny).
        const grassKey = natureGrassKey(biomeId, season, gx, gy)
        const blitGrass = () => atlas.blit(ctx, grassKey, px, py, tileS, tileS)
        if (t === SAND && nearCode(terrain, worldW, gx, gy, WATER, 2)) {
          paintCoastalSand(ctx, atlas, terrain, worldW, gx, gy, px, py, tileS, blitGrass)
        } else {
          paintOrganicDirtPatch(
            ctx, atlas, terrain, worldW, gx, gy, px, py, tileS, blitGrass,
            t === SAND ? "sand" : "grass_grazed",
          )
        }`,
  )
}

// --- WATER ground pass ---
const waterRe = /if \(t === WATER\) \{\r?\n\s*\/\/[^\n]*\r?\n\s*const wKey = waterKeyAt\(terrain, worldW, gx, gy\)\r?\n\s*atlas\.blit\(ctx, wKey === "water_deep" \? "water_deep" : "water", px, py, tileS, tileS\)\r?\n\s*continue\r?\n\s*\}/
if (!waterRe.test(t)) {
  console.error("WATER miss", JSON.stringify(t.slice(t.indexOf("t === WATER"), t.indexOf("t === WATER")+250)))
  throw new Error("WATER block miss")
}
t = t.replace(
  waterRe,
  `if (t === WATER) {
        // Coast: organic SDF fill (no rect stairs). Deep interior: cheap atlas blit.
        const coast = nearCode(terrain, worldW, gx, gy, GRASS, 3)
          || nearCode(terrain, worldW, gx, gy, DIRT, 3)
          || nearCode(terrain, worldW, gx, gy, SAND, 3)
          || nearCode(terrain, worldW, gx, gy, TREE, 3)
          || nearCode(terrain, worldW, gx, gy, BUSH, 3)
          || nearCode(terrain, worldW, gx, gy, FIELD, 2)
        if (coast) {
          paintOrganicShoreWater(ctx, atlas, terrain, worldW, gx, gy, px, py, tileS, () => {})
        } else {
          const wKey = waterKeyAt(terrain, worldW, gx, gy)
          atlas.blit(ctx, wKey === "water_deep" ? "water_deep" : "water", px, py, tileS, tileS)
        }
        continue
      }`,
)

// --- grass fringe after default grass blit ---
const grassBlit = `atlas.blit(ctx, ground.startsWith("grass") ? natureGrassKey(biomeId, season, gx, gy) : ground, px, py, tileS, tileS)
      // Shore + dirt continuous strips run after the ground loop (shared SDF).
      if (ground.startsWith("grass")) {`

const grassBlitNew = `atlas.blit(ctx, ground.startsWith("grass") ? natureGrassKey(biomeId, season, gx, gy) : ground, px, py, tileS, tileS)
      // Organic fringe on meadow cells that touch water/dirt — kills stairs redrawn over shore overspill.
      if (ground.startsWith("grass")) {
        const nb = nearWaterOrDirt(terrain, worldW, gx, gy, 2)
        if (nb.water) paintLandShoreFringe(ctx, atlas, terrain, worldW, gx, gy, px, py, tileS)
        if (nb.dirt) paintDirtBleedOnGrass(ctx, atlas, terrain, worldW, gx, gy, px, py, tileS)
      }
      // Shore + dirt continuous strips run after the ground loop (shared SDF).
      if (ground.startsWith("grass")) {`

if (!t.includes("paintLandShoreFringe(ctx, atlas")) {
  if (!t.includes(grassBlit)) {
    // try with different dash
    const alt = grassBlit.replace("—", "-")
    if (t.includes(alt)) t = t.replace(alt, grassBlitNew.replace("—", "-"))
    else {
      console.error("grass blit miss")
      const i = t.indexOf('ground.startsWith("grass") ? natureGrassKey')
      console.error(JSON.stringify(t.slice(i, i+220)))
      throw new Error("grass blit miss")
    }
  } else {
    t = t.replace(grassBlit, grassBlitNew)
  }
}

// TREE/BUSH grass underlay fringe — after their grass blit
if (!t.includes("paintLandShoreFringe(ctx, atlas, terrain, worldW, gx, gy, px, py, tileS)\n        if (underCliffOverhang")) {
  // BUSH path
  const bush = `atlas.blit(ctx, natureGrassKey(biomeId, season, gx, gy), px, py, tileS, tileS)
        if (underCliffOverhang(terrain, worldW, gx, gy)) continue`
  if (t.includes(bush) && !t.includes("// bush fringe")) {
    t = t.replace(
      bush,
      `atlas.blit(ctx, natureGrassKey(biomeId, season, gx, gy), px, py, tileS, tileS)
        // bush fringe
        {
          const nb = nearWaterOrDirt(terrain, worldW, gx, gy, 2)
          if (nb.water) paintLandShoreFringe(ctx, atlas, terrain, worldW, gx, gy, px, py, tileS)
          if (nb.dirt) paintDirtBleedOnGrass(ctx, atlas, terrain, worldW, gx, gy, px, py, tileS)
        }
        if (underCliffOverhang(terrain, worldW, gx, gy)) continue`,
    )
  }
}

fs.writeFileSync(p, t, "utf8")
console.log({
  organicWater: t.includes("paintOrganicShoreWater(ctx"),
  organicDirt: t.includes("paintOrganicDirtPatch("),
  fringe: (t.match(/paintLandShoreFringe/g) || []).length,
  nearCode: t.includes("function nearCode("),
  size: fs.statSync(p).size,
})