import fs from "fs";
const p = "C:/Users/kamel/village-sim-1/simulation_atlas_v1/village_edit/src/lib/render/nature/shorePaint.ts";
let t = fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n");

const newShoreField = `export function shoreField(terrain: Uint8Array, worldW: number, wx: number, wy: number): number {
  // WARP_V6_WIDE: wide coastal meander + soft deep/land clamps (no hard retain stairs).
  const rough = roughWaterOcc(terrain, worldW, wx, wy)
  // Wider rim than |r-0.5|*2.15 — need multi-cell amp across stair steps.
  const near = Math.pow(Math.max(0, 1 - Math.abs(rough - 0.5) * 1.35), 0.65)
  const amp = 0.25 + near * 0.75
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
  const jig =
    shoreWarp(sx * 0.8, sy * 0.8) * 0.2 * near +
    simplex2(wx * 1.2 + 2.1, wy * 1.2 - 3.4) * 0.12 * near
  let f = Math.max(0, Math.min(1, bil + jig))
  const mid = Math.max(0, 1 - Math.abs(f - 0.5) * 2.2) * Math.max(near, 0.35)
  f +=
    mid *
    (simplex2(wx * 1.05 + 4.4, wy * 1.05 - 2.8) * 0.34 +
      simplex2(wx * 2.4 - 1.2, wy * 2.4 + 3.1) * 0.26 +
      simplex2(wx * 4.8 + 2.7, wy * 4.8 - 4.2) * 0.18 +
      simplex2(wx * 9.2 - 3.3, wy * 9.2 + 1.6) * 0.11 +
      fbm2(wx * 0.45 + 1.7, wy * 0.45 - 0.9, 3, 2.1, 0.52) * 0.16)
  f = Math.max(0, Math.min(1, f))
  // Soft safety — keep deep ocean water / deep land land without killing rim meander.
  if (rough > 0.72) f = Math.max(f, 0.52 + (rough - 0.72) * 1.1)
  if (rough < 0.28) f = Math.min(f, 0.48 - (0.28 - rough) * 1.1)
  return Math.max(0, Math.min(1, f))
}
`;

const sfStart = t.indexOf("export function shoreField(");
const sfEnd = t.indexOf("export function shoreFieldFast");
t = t.slice(0, sfStart) + newShoreField + "\n" + t.slice(sfEnd);

const newFast = `export function shoreFieldFast(terrain: Uint8Array, worldW: number, wx: number, wy: number): number {
  const rough = roughWaterOcc(terrain, worldW, wx, wy)
  const near = Math.pow(Math.max(0, 1 - Math.abs(rough - 0.5) * 1.35), 0.65)
  const amp = 0.25 + near * 0.75
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
  let f = Math.max(0, Math.min(1, bil + shoreWarp(sx * 0.9, sy * 0.9) * 0.14 * near))
  const mid = Math.max(0, 1 - Math.abs(f - 0.5) * 2) * Math.max(near, 0.35)
  f += simplex2(wx * 1.55 + 4.4, wy * 1.55 - 2.8) * 0.22 * mid
  f = Math.max(0, Math.min(1, f))
  if (rough > 0.72) f = Math.max(f, 0.52 + (rough - 0.72) * 1.1)
  if (rough < 0.28) f = Math.min(f, 0.48 - (0.28 - rough) * 1.1)
  return Math.max(0, Math.min(1, f))
}
`;

const ffStart = t.indexOf("export function shoreFieldFast");
const ffEnd = t.indexOf("\nfunction dirtBlob");
t = t.slice(0, ffStart) + newFast + "\n" + t.slice(ffEnd);
t = t.replace(/SHORE_WARP_BUILD = '[^']+'/, "SHORE_WARP_BUILD = 'WARP_V6_WIDE'");
t = t.replace(/HARD f>=0\\.5 \\+ WARP_V[0-9A-Z_]+/, "HARD f>=0.5 + WARP_V6_WIDE");

fs.writeFileSync(p, t.replace(/\n/g, "\r\n"), "utf8");
console.log("ok", t.includes("WARP_V6_WIDE"), t.includes("0.25 + near"));