import fs from "fs";
const p = "C:/Users/kamel/village-sim-1/simulation_atlas_v1/village_edit/src/lib/render/nature/shorePaint.ts";
let t = fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n");

const newShoreField = `export function shoreField(terrain: Uint8Array, worldW: number, wx: number, wy: number): number {
  // WARP_V6_COASTAL: full meander only near rim — deep ocean/land stay stable (no false land stamps).
  const rough = roughWaterOcc(terrain, worldW, wx, wy)
  // Hard retain deep classes — never flip ocean to land or inland to water via carve/warp.
  if (rough >= 0.88) return Math.max(0.72, rough)
  if (rough <= 0.12) return Math.min(0.28, rough)
  const near = Math.max(0, 1 - Math.abs(rough - 0.5) * 2.15)
  const amp = 0.05 + near * near * 0.95
  const [odx, ody] = warpOffsets(wx, wy)
  const sx = wx + odx * amp
  const sy = wy + ody * amp
  const ix = Math.floor(sx)
  const iy = Math.floor(sy)
  const fx = sx - ix
  const fy = sy - iy
  // Hermite — linear bil locks isocontour to tile corners (Manhattan stairs).
  const ux = fx * fx * (3 - 2 * fx)
  const uy = fy * fy * (3 - 2 * fy)
  const samp = (x: number, y: number) => (isWaterCell(terrain, worldW, x, y) ? 1 : 0)
  const bil =
    samp(ix, iy) * (1 - ux) * (1 - uy) +
    samp(ix + 1, iy) * ux * (1 - uy) +
    samp(ix, iy + 1) * (1 - ux) * uy +
    samp(ix + 1, iy + 1) * ux * uy
  // Do NOT scale bil down (bil*0.55 stamped land into deep water). Jig/carve are rim-only.
  const jig =
    shoreWarp(sx * 0.85, sy * 0.85) * 0.16 * near +
    simplex2(wx * 1.15 + 2.1, wy * 1.15 - 3.4) * 0.1 * near
  const base = Math.max(0, Math.min(1, bil + jig))
  const mid = Math.max(0, 1 - Math.abs(base - 0.5) * 2.4) * near
  // Multi-scale edge carve — Stardew/Puny small jags + longer bays (rim only).
  const carve =
    mid *
    (simplex2(wx * 1.15 + 4.4, wy * 1.15 - 2.8) * 0.3 +
      simplex2(wx * 2.6 - 1.2, wy * 2.6 + 3.1) * 0.22 +
      simplex2(wx * 5.1 + 2.7, wy * 5.1 - 4.2) * 0.15 +
      simplex2(wx * 9.8 - 3.3, wy * 9.8 + 1.6) * 0.09 +
      fbm2(wx * 0.5 + 1.7, wy * 0.5 - 0.9, 3, 2.1, 0.52) * 0.12)
  return Math.max(0, Math.min(1, base + carve))
}
`;

const sfStart = t.indexOf("export function shoreField(");
const sfEnd = t.indexOf("export function shoreFieldFast");
if (sfStart < 0 || sfEnd < 0) throw new Error("bounds");
t = t.slice(0, sfStart) + newShoreField + "\n" + t.slice(sfEnd);

const newFast = `export function shoreFieldFast(terrain: Uint8Array, worldW: number, wx: number, wy: number): number {
  const rough = roughWaterOcc(terrain, worldW, wx, wy)
  if (rough >= 0.88) return Math.max(0.72, rough)
  if (rough <= 0.12) return Math.min(0.28, rough)
  const near = Math.max(0, 1 - Math.abs(rough - 0.5) * 2.15)
  const amp = 0.05 + near * near * 0.95
  const [odx, ody] = warpOffsets(wx, wy)
  const sx = wx + odx * amp
  const sy = wy + ody * amp
  const ix = Math.floor(sx)
  const iy = Math.floor(sy)
  const fx = sx - ix
  const fy = sy - iy
  const ux = fx * fx * (3 - 2 * fx)
  const uy = fy * fy * (3 - 2 * fy)
  const samp = (x: number, y: number) => (isWaterCell(terrain, worldW, x, y) ? 1 : 0)
  const bil =
    samp(ix, iy) * (1 - ux) * (1 - uy) +
    samp(ix + 1, iy) * ux * (1 - uy) +
    samp(ix, iy + 1) * (1 - ux) * uy +
    samp(ix + 1, iy + 1) * ux * uy
  const base = Math.max(0, Math.min(1, bil + shoreWarp(sx * 0.9, sy * 0.9) * 0.12 * near))
  const mid = Math.max(0, 1 - Math.abs(base - 0.5) * 2) * near
  return Math.max(0, Math.min(1, base + simplex2(wx * 1.55 + 4.4, wy * 1.55 - 2.8) * 0.2 * mid))
}
`;

const ffStart = t.indexOf("export function shoreFieldFast");
const ffEnd = t.indexOf("\nfunction dirtBlob");
t = t.slice(0, ffStart) + newFast + "\n" + t.slice(ffEnd);
t = t.replace(/SHORE_WARP_BUILD = '[^']+'/, "SHORE_WARP_BUILD = 'WARP_V6_SAFE'");

fs.writeFileSync(p, t.replace(/\n/g, "\r\n"), "utf8");
console.log("patched", t.includes("if (rough >= 0.88)"), t.includes("WARP_V6_SAFE"));