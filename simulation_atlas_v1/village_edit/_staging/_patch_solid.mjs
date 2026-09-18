import fs from "fs"

// 1) shore strip: hard f>=0.5 opaque, no alpha path
{
  const path = "src/lib/render/nature/shorePaint.ts"
  let t = fs.readFileSync(path, "utf8")
  t = t.replace(
    /const f = shoreField\(terrain, worldW, wx, wy\)\n\s*const a = shoreAlpha\(f\)\n\s*if \(a <= 0\.02\) continue\n\s*const \[r, g, b\] = shoreHardRgb\(f, water, deep\)\n\s*const o = \(j \* pw \+ i\) \* 4\n\s*data\[o\] = r\n\s*data\[o \+ 1\] = g\n\s*data\[o \+ 2\] = b\n\s*data\[o \+ 3\] = \(a \* 255\) \| 0/,
    `const f = shoreField(terrain, worldW, wx, wy)
          if (f < 0.5) continue
          const [r, g, b] = shoreHardRgb(f, water, deep)
          const o = (j * pw + i) * 4
          data[o] = r
          data[o + 1] = g
          data[o + 2] = b
          data[o + 3] = 255`,
  )

  // Strengthen dirtField mid carve
  const dirtOld = t.match(/export function dirtField\([\s\S]*?\n\}/)
  if (dirtOld) {
    t = t.replace(
      dirtOld[0],
      `export function dirtField(terrain: Uint8Array, worldW: number, wx: number, wy: number): number {
  const base = smoothstep(-1.15, 0.65, dirtSdf(terrain, worldW, wx, wy))
  const mid = Math.max(0, 1 - Math.abs(base - 0.5) * 2)
  const carve =
    simplex2(wx * 2.15 + 3.3, wy * 2.15 - 1.8) * 0.4 * mid +
    simplex2(wx * 5.1 - 2.4, wy * 5.1 + 4.2) * 0.28 * mid +
    fbm2(wx * 0.9 + 2.1, wy * 0.9 - 1.4, 3, 2.0, 0.5) * 0.2 * mid
  const jig =
    simplex2(wx * 2.9 + 5.1, wy * 2.9 - 3.3) * 0.14 +
    simplex2(wx * 6.4, wy * 6.4) * 0.08
  return Math.max(0, Math.min(1, base + carve + jig))
}`,
    )
    console.log("dirtField carved")
  }

  // Prefer deeper water rgb in shoreHardRgb (less "light blue" reading)
  t = t.replace(
    /export function shoreHardRgb\([\s\S]*?\n\}/,
    `export function shoreHardRgb(
  f: number,
  water: [number, number, number],
  deep: [number, number, number],
): [number, number, number] {
  // Bias hard to deep — atlas "water" reads light-blue vs grass (Visuel rim).
  const deepW = smoothstep(0.5, 0.72, f)
  return [
    Math.max(0, Math.min(255, (water[0] * (1 - deepW) + deep[0] * deepW) | 0)),
    Math.max(0, Math.min(255, (water[1] * (1 - deepW) + deep[1] * deepW) | 0)),
    Math.max(0, Math.min(255, (water[2] * (1 - deepW) + deep[2] * deepW) | 0)),
  ]
}`,
  )

  fs.writeFileSync(path, t, "utf8")
  console.log("shore strip hard", t.includes("if (f < 0.5) continue"))
}

// 2) draw.ts: solid deep fill underlay for coast water (no atlas water light rim)
{
  const path = "src/lib/render/nature/draw.ts"
  let t = fs.readFileSync(path, "utf8")
  const re = /if \(t === WATER\) \{[\s\S]*?continue\n      \}/
  const m = t.match(re)
  if (!m) { console.error("no WATER"); process.exit(1) }
  t = t.replace(
    m[0],
    `if (t === WATER) {
        const distLand = chebyshevDistToLand(terrain, worldW, gx, gy, 4)
        if (distLand >= 0 && distLand <= 3) {
          // Solid deep fill — atlas water blit has a light rim that stairs on the grid.
          ctx.fillStyle = "rgb(28,68,92)"
          ctx.fillRect(px, py, tileS + 0.5, tileS + 0.5)
        } else {
          const wKey = waterKeyAt(terrain, worldW, gx, gy)
          atlas.blit(ctx, wKey === "water_deep" ? "water_deep" : "water", px, py, tileS, tileS)
        }
        continue
      }`,
  )
  fs.writeFileSync(path, t, "utf8")
  console.log("solid deep underlay")
}