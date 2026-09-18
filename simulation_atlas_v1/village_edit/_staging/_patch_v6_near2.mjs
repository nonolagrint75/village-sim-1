import fs from "fs";
const p = "C:/Users/kamel/village-sim-1/simulation_atlas_v1/village_edit/src/lib/render/nature/shorePaint.ts";
let t = fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n");

// Insert coastalNear after roughWaterOcc
const nearFn = `
/** Max near-shore factor in a small neighborhood — expands meander across stair steps. */
function coastalNear(terrain: Uint8Array, worldW: number, wx: number, wy: number): number {
  let best = 0
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const r = roughWaterOcc(terrain, worldW, wx + dx * 0.55, wy + dy * 0.55)
      const n = Math.max(0, 1 - Math.abs(r - 0.5) * 1.45)
      if (n > best) best = n
    }
  }
  return best
}
`;

if (!t.includes("function coastalNear")) {
  const anchor = t.indexOf("function roughWaterOcc");
  const end = t.indexOf("\n/** Scalar residual", anchor);
  // roughWaterOcc ends before Scalar residual - find closing brace of roughWaterOcc
  const afterRough = t.indexOf("\n}\n", t.indexOf("samp(ix + 1, iy + 1)", anchor));
  if (afterRough < 0) throw new Error("rough end");
  const insertAt = afterRough + 3;
  t = t.slice(0, insertAt) + nearFn + t.slice(insertAt);
}

const newShoreField = `export function shoreField(terrain: Uint8Array, worldW: number, wx: number, wy: number): number {
  // WARP_V6_NEAR2: neighborhood coastalNear so meander spans multi-cell stairs (Stardew/Puny).
  const rough = roughWaterOcc(terrain, worldW, wx, wy)
  const near = coastalNear(terrain, worldW, wx, wy)
  const amp = 0.35 + near * 0.65
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
    shoreWarp(sx * 0.8, sy * 0.8) * 0.22 * near +
    simplex2(wx * 1.2 + 2.1, wy * 1.2 - 3.4) * 0.14 * near
  let f = Math.max(0, Math.min(1, bil + jig))
  const mid = Math.max(0, 1 - Math.abs(f - 0.5) * 2.1) * Math.max(near, 0.4)
  f +=
    mid *
    (simplex2(wx * 1.05 + 4.4, wy * 1.05 - 2.8) * 0.36 +
      simplex2(wx * 2.4 - 1.2, wy * 2.4 + 3.1) * 0.28 +
      simplex2(wx * 4.8 + 2.7, wy * 4.8 - 4.2) * 0.2 +
      simplex2(wx * 9.2 - 3.3, wy * 9.2 + 1.6) * 0.12 +
      fbm2(wx * 0.45 + 1.7, wy * 0.45 - 0.9, 3, 2.1, 0.52) * 0.18)
  f = Math.max(0, Math.min(1, f))
  // Soft deep clamps only — keep false land/ocean stamps out without re-Manhattanizing rim.
  if (rough > 0.82 && near < 0.25) f = Math.max(f, 0.62)
  if (rough < 0.18 && near < 0.25) f = Math.min(f, 0.38)
  return Math.max(0, Math.min(1, f))
}
`;

const sfStart = t.indexOf("export function shoreField(");
const sfEnd = t.indexOf("export function shoreFieldFast");
t = t.slice(0, sfStart) + newShoreField + "\n" + t.slice(sfEnd);

const newFast = `export function shoreFieldFast(terrain: Uint8Array, worldW: number, wx: number, wy: number): number {
  const rough = roughWaterOcc(terrain, worldW, wx, wy)
  const near = coastalNear(terrain, worldW, wx, wy)
  const amp = 0.35 + near * 0.65
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
  let f = Math.max(0, Math.min(1, bil + shoreWarp(sx * 0.9, sy * 0.9) * 0.16 * near))
  const mid = Math.max(0, 1 - Math.abs(f - 0.5) * 2) * Math.max(near, 0.4)
  f += simplex2(wx * 1.55 + 4.4, wy * 1.55 - 2.8) * 0.24 * mid
  f = Math.max(0, Math.min(1, f))
  if (rough > 0.82 && near < 0.25) f = Math.max(f, 0.62)
  if (rough < 0.18 && near < 0.25) f = Math.min(f, 0.38)
  return Math.max(0, Math.min(1, f))
}
`;

const ffStart = t.indexOf("export function shoreFieldFast");
const ffEnd = t.indexOf("\nfunction dirtBlob");
t = t.slice(0, ffStart) + newFast + "\n" + t.slice(ffEnd);
t = t.replace(/SHORE_WARP_BUILD = '[^']+'/, "SHORE_WARP_BUILD = 'WARP_V6_NEAR2'");

fs.writeFileSync(p, t.replace(/\n/g, "\r\n"), "utf8");
console.log({
  coastalNear: t.includes("function coastalNear"),
  near2: t.includes("WARP_V6_NEAR2"),
  uses: t.includes("coastalNear(terrain"),
});