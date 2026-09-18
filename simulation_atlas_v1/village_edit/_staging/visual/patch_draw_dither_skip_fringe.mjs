import fs from "fs"
const p = "src/lib/render/nature/draw.ts"
let t = fs.readFileSync(p, "utf8")

const old = `            const mv = meadowValue(gx + u, gy + v) + fbm2((gx + u) * 0.6, (gy + v) * 0.6, 2) * 0.08
            if (Math.abs(mv - baseMv) < 0.07) continue`

const neu = `            const mv = meadowValue(gx + u, gy + v) + fbm2((gx + u) * 0.6, (gy + v) * 0.6, 2) * 0.08
            // Do not dither over organic shore/dirt fringe (would redraw Manhattan stairs).
            if (shoreFieldFast(terrain, worldW, gx + u, gy + v) > 0.12) continue
            if (dirtField(terrain, worldW, gx + u, gy + v) > 0.14) continue
            if (Math.abs(mv - baseMv) < 0.07) continue`

if (!t.includes(old)) throw new Error("dither skip miss")
if (t.includes("Do not dither over organic")) {
  console.log("already patched")
} else {
  t = t.replace(old, neu)
  fs.writeFileSync(p, t, "utf8")
  console.log("dither skip ok")
}