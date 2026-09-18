import fs from "fs";
const p = "C:/Users/kamel/village-sim-1/simulation_atlas_v1/village_edit/src/lib/render/nature/shorePaint.ts";
let t = fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n");

const newHelpers = `/** Raw multi-octave warp offsets (cells). Scaled by coastal proximity in shoreField. */
function warpOffsets(wx: number, wy: number): [number, number] {
  // WARP_V6_COASTAL: strong rim meander; amp gated so deep water/land stay stable.
  const lx =
    fbm2(wx * 0.065, wy * 0.065, 5, 2.05, 0.52) * 3.4 +
    fbm2(wx * 0.15 + 19.7, wy * 0.15 - 8.3, 4, 2.1, 0.52) * 1.7 +
    simplex2(wx * 0.34 + 11.3, wy * 0.34 - 4.7) * 1.15
  const ly =
    fbm2(wx * 0.065 + 37.1, wy * 0.065 - 19.4, 5, 2.05, 0.52) * 3.4 +
    fbm2(wx * 0.15 - 22.4, wy * 0.15 + 14.6, 4, 2.1, 0.52) * 1.7 +
    simplex2(wx * 0.34 - 8.2, wy * 0.34 + 15.6) * 1.15
  const mx =
    simplex2(wx * 0.52 + 3.1, wy * 0.52) * 1.7 +
    simplex2(wx * 1.1 - 6.4, wy * 1.1 + 2.8) * 0.95
  const my =
    simplex2(wx * 0.52 - 12.5, wy * 0.52 + 9.1) * 1.7 +
    simplex2(wx * 1.1 + 4.2, wy * 1.1 - 7.7) * 0.95
  const hx =
    simplex2(wx * 2.4 + 1.7, wy * 2.4) * 0.75 +
    simplex2(wx * 5.2 - 4.1, wy * 5.2 + 2.2) * 0.4 +
    simplex2(wx * 10.5 + 8.8, wy * 10.5 - 3.3) * 0.22
  const hy =
    simplex2(wx * 2.4 - 2.9, wy * 2.4 + 5.4) * 0.75 +
    simplex2(wx * 5.2 + 9.0, wy * 5.2 - 1.6) * 0.4 +
    simplex2(wx * 10.5 - 5.5, wy * 10.5 + 6.1) * 0.22
  return [lx + mx + hx, ly + my + hy]
}

/** Full warp (dirt / SDF helpers). */
function domainWarp(wx: number, wy: number): [number, number] {
  const [dx, dy] = warpOffsets(wx, wy)
  return [wx + dx, wy + dy]
}

/** Unwarped water occupancy for coastal amp gating (no land stamps in deep ocean). */
function roughWaterOcc(terrain: Uint8Array, worldW: number, wx: number, wy: number): number {
  const ix = Math.floor(wx)
  const iy = Math.floor(wy)
  const fx = wx - ix
  const fy = wy - iy
  const samp = (x: number, y: number) => (isWaterCell(terrain, worldW, x, y) ? 1 : 0)
  return (
    samp(ix, iy) * (1 - fx) * (1 - fy) +
    samp(ix + 1, iy) * fx * (1 - fy) +
    samp(ix, iy + 1) * (1 - fx) * fy +
    samp(ix + 1, iy + 1) * fx * fy
  )
}
`;

const dwStart = t.indexOf("function domainWarp");
if (dwStart < 0) throw new Error("domainWarp missing");
let replaceStart = t.lastIndexOf("/** Multi-octave", dwStart);
if (replaceStart < 0) replaceStart = dwStart;
const after = t.indexOf("\n/** Scalar residual", replaceStart);
if (after < 0) throw new Error("anchor after domainWarp missing");
t = t.slice(0, replaceStart) + newHelpers + "\n" + t.slice(after);

const newShoreField = `export function shoreField(terrain: Uint8Array, worldW: number, wx: number, wy: number): number {
  // WARP_V6_COASTAL: full meander only near rim — deep ocean/land stay stable (no false land stamps).
  const rough = roughWaterOcc(terrain, worldW, wx, wy)
  const near = Math.max(0, 1 - Math.abs(rough - 0.5) * 2.15)
  const amp = 0.1 + near * near * 0.9
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
  const jig =
    shoreWarp(sx * 0.85, sy * 0.85) * 0.18 * near +
    simplex2(wx * 1.15 + 2.1, wy * 1.15 - 3.4) * 0.12 * near
  const base = Math.max(0, Math.min(1, bil * 0.55 + jig))
  const mid = Math.max(0, 1 - Math.abs(base - 0.5) * 2.4)
  // Multi-scale edge carve — Stardew/Puny small jags + longer bays (rim only).
  const carve =
    mid *
    (simplex2(wx * 1.15 + 4.4, wy * 1.15 - 2.8) * 0.32 +
      simplex2(wx * 2.6 - 1.2, wy * 2.6 + 3.1) * 0.24 +
      simplex2(wx * 5.1 + 2.7, wy * 5.1 - 4.2) * 0.16 +
      simplex2(wx * 9.8 - 3.3, wy * 9.8 + 1.6) * 0.1 +
      fbm2(wx * 0.5 + 1.7, wy * 0.5 - 0.9, 3, 2.1, 0.52) * 0.14)
  return Math.max(0, Math.min(1, base + carve))
}
`;

const sfStart = t.indexOf("export function shoreField(");
const sfEnd = t.indexOf("export function shoreFieldFast");
if (sfStart < 0 || sfEnd < 0) throw new Error("shoreField bounds");
t = t.slice(0, sfStart) + newShoreField + "\n" + t.slice(sfEnd);

const newFast = `export function shoreFieldFast(terrain: Uint8Array, worldW: number, wx: number, wy: number): number {
  const rough = roughWaterOcc(terrain, worldW, wx, wy)
  const near = Math.max(0, 1 - Math.abs(rough - 0.5) * 2.15)
  const amp = 0.1 + near * near * 0.9
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
  const base = Math.max(0, Math.min(1, bil + shoreWarp(sx * 0.9, sy * 0.9) * 0.14 * near))
  const mid = Math.max(0, 1 - Math.abs(base - 0.5) * 2)
  return Math.max(0, Math.min(1, base + simplex2(wx * 1.55 + 4.4, wy * 1.55 - 2.8) * 0.22 * mid))
}
`;

const ffStart = t.indexOf("export function shoreFieldFast");
const ffEnd = t.indexOf("\nfunction dirtBlob");
if (ffStart < 0 || ffEnd < 0) throw new Error("shoreFieldFast bounds " + ffStart + " " + ffEnd);
t = t.slice(0, ffStart) + newFast + "\n" + t.slice(ffEnd);

t = t.replace(/SHORE_WARP_BUILD = '[^']+'/, "SHORE_WARP_BUILD = 'WARP_V6_COASTAL'");
t = t.replace(/HARD f>=0\.5 \+ WARP_V[0-9A-Z_]+/, "HARD f>=0.5 + WARP_V6_COASTAL");

fs.writeFileSync(p, t.replace(/\n/g, "\r\n"), "utf8");
console.log({
  warpOffsets: t.includes("function warpOffsets"),
  rough: t.includes("function roughWaterOcc"),
  coastal: t.includes("WARP_V6_COASTAL"),
  hermite: t.includes("3 - 2 * fx"),
});