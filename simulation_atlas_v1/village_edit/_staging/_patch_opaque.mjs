import fs from "fs"

// shorePaint: opaque hard water (alpha 255), soft only via SDF carve — no alpha-over-grass cyan
{
  const path = "src/lib/render/nature/shorePaint.ts"
  let t = fs.readFileSync(path, "utf8")

  // Narrow/hard alpha — essentially binary with tiny AA that still prefers water
  t = t.replace(
    /export function shoreAlpha\(f: number\): number \{[\s\S]*?\n\}/,
    `export function shoreAlpha(f: number): number {
  // Near-hard gate. Soft cyan came from blue@alpha over green grass — ban that path.
  return f >= 0.5 ? 1 : 0
}`,
  )

  // Strip loop: skip land side entirely; opaque water on water side
  t = t.replace(
    /const a = shoreAlpha\(f\)\n\s*if \(a <= 0\.02\) continue\n\s*const \[r, g, b\] = shoreHardRgb\(f, water, deep\)\n\s*const o = \(j \* pw \+ i\) \* 4\n\s*data\[o\] = r\n\s*data\[o \+ 1\] = g\n\s*data\[o \+ 2\] = b\n\s*data\[o \+ 3\] = \(a \* 255\) \| 0/,
    `if (f < 0.5) continue
          const [r, g, b] = shoreHardRgb(f, water, deep)
          const o = (j * pw + i) * 4
          data[o] = r
          data[o + 1] = g
          data[o + 2] = b
          data[o + 3] = 255`,
  )

  // Dirt: hard opaque cover when f>=0.5, skip soft beige mid
  t = t.replace(
    /const a = smoothstep\(0\.22, 0\.42, f\)\n\s*if \(a <= 0\.02\) continue\n\s*const sf = shoreField\(terrain, worldW, wx, wy\)\n\s*const c1 = sf > 0\.18 && f > 0\.15 \? sand : cover\n\s*const o = \(j \* pw \+ i\) \* 4\n\s*data\[o\] = c1\[0\]\n\s*data\[o \+ 1\] = c1\[1\]\n\s*data\[o \+ 2\] = c1\[2\]\n\s*data\[o \+ 3\] = \(a \* 255\) \| 0/,
    `if (f < 0.5) continue
          const sf = shoreField(terrain, worldW, wx, wy)
          const c1 = sf > 0.18 && f > 0.15 ? sand : cover
          const o = (j * pw + i) * 4
          data[o] = c1[0]
          data[o + 1] = c1[1]
          data[o + 2] = c1[2]
          data[o + 3] = 255`,
  )

  fs.writeFileSync(path, t, "utf8")
  console.log("opaque SDF", t.includes("f < 0.5) continue") && t.includes("f >= 0.5 ? 1 : 0"))
}

// draw.ts: coast underlay = water (dark), not grass — so holes aren't cyan-prone
{
  const path = "src/lib/render/nature/draw.ts"
  let t = fs.readFileSync(path, "utf8")
  // Replace grass underlay on coast water with dark water
  const re = /if \(t === WATER\) \{[\s\S]*?continue\n      \}/
  const m = t.match(re)
  if (!m) { console.error("WATER block missing"); process.exit(1) }
  const next = `if (t === WATER) {
        const distLand = chebyshevDistToLand(terrain, worldW, gx, gy, 4)
        // Dark water underlay always — grass underlay + any water alpha = cyan stair rim.
        const wKey = waterKeyAt(terrain, worldW, gx, gy)
        atlas.blit(ctx, wKey === "water_deep" || distLand > 2 ? "water_deep" : "water", px, py, tileS, tileS)
        continue
      }`
  t = t.replace(m[0], next)

  // naturePixel32 shoreBlend already hard pick — tighten threshold to 0.5
  t = t.replace(
    /if \(f < 0\.48\) return land/,
    "if (f < 0.5) return land",
  )
  t = t.replace(
    /if \(f < 0\.32\) return land/,
    "if (f < 0.5) return land",
  )

  fs.writeFileSync(path, t, "utf8")
  console.log("underlay dark water")
}