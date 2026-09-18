import fs from "fs"
const p = "src/lib/render/nature/shorePaint.ts"
let t = fs.readFileSync(p, "utf8")

t = t.replace(
  `function cellTouchesDirt(terrain: Uint8Array, worldW: number, gx: number, gy: number): boolean {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const x = gx + dx
      const y = gy + dy
      if (x < 0 || y < 0 || x >= worldW || y >= worldW) continue
      if (isDirtOrSand(terrain[y * worldW + x]!)) return true
    }
  }
  return false
}

function cellTouchesShore(terrain: Uint8Array, worldW: number, gx: number, gy: number): boolean {
  const here = isWaterCell(terrain, worldW, gx, gy)
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue
      if (isWaterCell(terrain, worldW, gx + dx, gy + dy) !== here) return true
    }
  }
  return false
}`,
  `function cellTouchesDirt(terrain: Uint8Array, worldW: number, gx: number, gy: number, r = 2): boolean {
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const x = gx + dx
      const y = gy + dy
      if (x < 0 || y < 0 || x >= worldW || y >= worldW) continue
      if (isDirtOrSand(terrain[y * worldW + x]!)) return true
    }
  }
  return false
}

function cellTouchesShore(terrain: Uint8Array, worldW: number, gx: number, gy: number, r = 3): boolean {
  const here = isWaterCell(terrain, worldW, gx, gy)
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx === 0 && dy === 0) continue
      if (isWaterCell(terrain, worldW, gx + dx, gy + dy) !== here) return true
    }
  }
  return false
}`,
)

t = t.replace(
  /const ppc = Math\.max\(8, Math\.min\(14, Math\.round\(tileS \/ 6\)\)\)/g,
  "const ppc = Math.max(10, Math.min(16, Math.round(tileS / 3.5)))",
)

// Water underlay for coast cells in draw — solid water not grass (strip blends edge)
const drawPath = "src/lib/render/nature/draw.ts"
let d = fs.readFileSync(drawPath, "utf8")
d = d.replace(
  `          const landKey = natureGrassKey(biomeId, season, gx, gy)
          atlas.blit(ctx, landKey, px, py, tileS, tileS)
          // Shore strip paints continuous water; skip per-cell organic.`,
  `          // Neutral underlay — shared shore strip owns the continuous silhouette.
          const wKey = waterKeyAt(terrain, worldW, gx, gy)
          atlas.blit(ctx, wKey === "water_deep" ? "water_deep" : "water", px, py, tileS, tileS)`,
)

fs.writeFileSync(p, t, "utf8")
fs.writeFileSync(drawPath, d, "utf8")
console.log({
  r3: t.includes("r = 3"),
  ppc: t.includes("tileS / 3.5"),
  waterUnder: d.includes("Neutral underlay"),
})
