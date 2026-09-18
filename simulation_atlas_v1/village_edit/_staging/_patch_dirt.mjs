import fs from "fs"
const path = "src/lib/render/nature/shorePaint.ts"
let t = fs.readFileSync(path, "utf8")

const old = `export function dirtField(terrain: Uint8Array, worldW: number, wx: number, wy: number): number {
  const base = smoothstep(-1.05, 0.55, dirtSdf(terrain, worldW, wx, wy))
  const jig = simplex2(wx * 2.9 + 5.1, wy * 2.9 - 3.3) * 0.12 + simplex2(wx * 6.4, wy * 6.4) * 0.06
  return Math.max(0, Math.min(1, base + jig))
}`

const next = `export function dirtField(terrain: Uint8Array, worldW: number, wx: number, wy: number): number {
  // Mid-band carve so dirt silhouette leaves tile grid (beige Manhattan rim).
  const base = smoothstep(-1.15, 0.65, dirtSdf(terrain, worldW, wx, wy))
  const mid = Math.max(0, 1 - Math.abs(base - 0.5) * 2)
  const carve =
    simplex2(wx * 2.15 + 3.3, wy * 2.15 - 1.8) * 0.22 * mid +
    simplex2(wx * 5.1 - 2.4, wy * 5.1 + 4.2) * 0.14 * mid
  const jig =
    simplex2(wx * 2.9 + 5.1, wy * 2.9 - 3.3) * 0.14 +
    simplex2(wx * 6.4, wy * 6.4) * 0.08 +
    simplex2(wx * 9.7 + 1.1, wy * 9.7 - 2.6) * 0.05 * mid
  return Math.max(0, Math.min(1, base + carve + jig))
}`

if (!t.includes(old)) {
  console.error("dirtField not found")
  process.exit(1)
}
t = t.replace(old, next)
fs.writeFileSync(path, t, "utf8")
console.log("dirtField carved")