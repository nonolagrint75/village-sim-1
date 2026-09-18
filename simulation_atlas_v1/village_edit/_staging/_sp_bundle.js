// src/lib/sim/types.ts
var DIRT = 12;
var WATER = 14;
var SAND = 17;

// src/lib/render/noise.ts
var F2 = 0.5 * (Math.sqrt(3) - 1);
var G2 = (3 - Math.sqrt(3)) / 6;
var PERM = new Uint8Array(512);
var GRAD2 = [
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1]
];
function buildPerm(seed) {
  const src = new Uint8Array(256);
  for (let i = 0; i < 256; i++) src[i] = i;
  let s = seed >>> 0 || 1;
  for (let i = 255; i > 0; i--) {
    s = Math.imul(s, 1664525) + 1013904223 >>> 0;
    const j = s % (i + 1);
    const t = src[i];
    src[i] = src[j];
    src[j] = t;
  }
  for (let i = 0; i < 512; i++) PERM[i] = src[i & 255];
}
function seedNoise(seed) {
  buildPerm(seed * 2654435761 >>> 0);
}
seedNoise(1);
function gradDot(hash, x, y) {
  const g = GRAD2[hash & 7];
  return g[0] * x + g[1] * y;
}
function simplex2(x, y) {
  const s = (x + y) * F2;
  const i = Math.floor(x + s);
  const j = Math.floor(y + s);
  const t = (i + j) * G2;
  const X0 = i - t;
  const Y0 = j - t;
  const x0 = x - X0;
  const y0 = y - Y0;
  let i1;
  let j1;
  if (x0 > y0) {
    i1 = 1;
    j1 = 0;
  } else {
    i1 = 0;
    j1 = 1;
  }
  const x1 = x0 - i1 + G2;
  const y1 = y0 - j1 + G2;
  const x2 = x0 - 1 + 2 * G2;
  const y2 = y0 - 1 + 2 * G2;
  const ii = i & 255;
  const jj = j & 255;
  const gi0 = PERM[ii + PERM[jj]];
  const gi1 = PERM[ii + i1 + PERM[jj + j1]];
  const gi2 = PERM[ii + 1 + PERM[jj + 1]];
  let n0 = 0;
  let n1 = 0;
  let n2 = 0;
  let t0 = 0.5 - x0 * x0 - y0 * y0;
  if (t0 >= 0) {
    t0 *= t0;
    n0 = t0 * t0 * gradDot(gi0, x0, y0);
  }
  let t1 = 0.5 - x1 * x1 - y1 * y1;
  if (t1 >= 0) {
    t1 *= t1;
    n1 = t1 * t1 * gradDot(gi1, x1, y1);
  }
  let t2 = 0.5 - x2 * x2 - y2 * y2;
  if (t2 >= 0) {
    t2 *= t2;
    n2 = t2 * t2 * gradDot(gi2, x2, y2);
  }
  return 70 * (n0 + n1 + n2);
}
function fbm2(x, y, octaves = 4, lacunarity = 2, gain = 0.5) {
  let amp = 1;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * simplex2(x * freq, y * freq);
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return norm > 0 ? sum / norm : 0;
}

// src/lib/render/nature/shorePaint.ts
function smoothstep(e0, e1, x) {
  if (e1 <= e0) return x >= e1 ? 1 : 0;
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}
function rgbFromPacked(c, fallback) {
  if (c == null) return fallback;
  return [c & 255, c >>> 8 & 255, c >>> 16 & 255];
}
function domainWarp(wx, wy) {
  const lx = fbm2(wx * 0.1, wy * 0.1, 5, 2.05, 0.52) * 1.25 + simplex2(wx * 0.28 + 11.3, wy * 0.28 - 4.7) * 0.55;
  const ly = fbm2(wx * 0.1 + 37.1, wy * 0.1 - 19.4, 5, 2.05, 0.52) * 1.25 + simplex2(wx * 0.28 - 8.2, wy * 0.28 + 15.6) * 0.55;
  const mx = simplex2(wx * 0.72 + 3.1, wy * 0.72) * 0.72 + simplex2(wx * 1.35 - 6.4, wy * 1.35 + 2.8) * 0.38;
  const my = simplex2(wx * 0.72 - 12.5, wy * 0.72 + 9.1) * 0.72 + simplex2(wx * 1.35 + 4.2, wy * 1.35 - 7.7) * 0.38;
  const hx = simplex2(wx * 3.1 + 1.7, wy * 3.1) * 0.42 + simplex2(wx * 7.4 - 4.1, wy * 7.4 + 2.2) * 0.22 + simplex2(wx * 13.2 + 8.8, wy * 13.2 - 3.3) * 0.11;
  const hy = simplex2(wx * 3.1 - 2.9, wy * 3.1 + 5.4) * 0.42 + simplex2(wx * 7.4 + 9, wy * 7.4 - 1.6) * 0.22 + simplex2(wx * 13.2 - 5.5, wy * 13.2 + 6.1) * 0.11;
  return [wx + lx + mx + hx, wy + ly + my + hy];
}
function shoreWarp(wx, wy) {
  return fbm2(wx * 0.22, wy * 0.22, 5, 2.1, 0.55) * 1.1 + simplex2(wx * 0.85 + 8.3, wy * 0.85) * 0.65 + simplex2(wx * 1.9 - 3.1, wy * 1.9 + 1.7) * 0.35 + simplex2(wx * 3.4 + 2.2, wy * 3.4 - 1.1) * 0.18 + simplex2(wx * 8.2 - 1.4, wy * 8.2 + 4.7) * 0.1;
}
function isWaterCell(terrain, worldW, x, y) {
  if (x < 0 || y < 0 || x >= worldW || y >= worldW) return true;
  return terrain[y * worldW + x] === WATER;
}
function isDirtOrSand(c) {
  return c === DIRT || c === SAND;
}
function shoreSdf(terrain, worldW, wx, wy) {
  const [sx, sy] = domainWarp(wx, wy);
  const ix = Math.floor(sx);
  const iy = Math.floor(sy);
  const fx = sx - ix;
  const fy = sy - iy;
  const hereWater = isWaterCell(terrain, worldW, ix, iy);
  let best = 6;
  for (let dy = -5; dy <= 5; dy++) {
    for (let dx = -5; dx <= 5; dx++) {
      const ox = ix + dx;
      const oy = iy + dy;
      if (isWaterCell(terrain, worldW, ox, oy) === hereWater) continue;
      const d = Math.hypot(sx - (ox + 0.5), sy - (oy + 0.5)) - 0.5;
      if (d < best) best = d;
    }
  }
  const samp = (x, y) => isWaterCell(terrain, worldW, x, y) ? 1 : 0;
  const bil = samp(ix, iy) * (1 - fx) * (1 - fy) + samp(ix + 1, iy) * fx * (1 - fy) + samp(ix, iy + 1) * (1 - fx) * fy + samp(ix + 1, iy + 1) * fx * fy;
  const fine = (bil - 0.5) * 1.25;
  const signed = hereWater ? Math.max(0.02, best) : -Math.max(0.02, best);
  return signed * 0.68 + fine * 0.5 + shoreWarp(sx * 0.9, sy * 0.9) * 0.55;
}
function shoreLerpWeights(f) {
  return { w: smoothstep(0.08, 0.42, f), deepW: smoothstep(0.58, 0.94, f) };
}
function shoreHardRgb(f, water, deep) {
  const deepW = smoothstep(0.5, 0.72, f);
  return [
    Math.max(0, Math.min(255, water[0] * (1 - deepW) + deep[0] * deepW | 0)),
    Math.max(0, Math.min(255, water[1] * (1 - deepW) + deep[1] * deepW | 0)),
    Math.max(0, Math.min(255, water[2] * (1 - deepW) + deep[2] * deepW | 0))
  ];
}
function shoreAlpha(f) {
  return f >= 0.5 ? 1 : 0;
}
function shoreRgbAt(f, _land, water, deep) {
  return shoreHardRgb(f, water, deep);
}
function shoreField(terrain, worldW, wx, wy) {
  const base = smoothstep(-1.55, 1.45, shoreSdf(terrain, worldW, wx, wy));
  const mid = Math.max(0, 1 - Math.abs(base - 0.5) * 2);
  const carve = simplex2(wx * 1.85 + 4.4, wy * 1.85 - 2.8) * 0.55 * mid + simplex2(wx * 4.2 - 1.2, wy * 4.2 + 3.1) * 0.4 * mid + fbm2(wx * 0.75 + 1.7, wy * 0.75 - 0.9, 4, 2.1, 0.5) * 0.35 * mid + simplex2(wx * 9.5 + 2.2, wy * 9.5 - 6.1) * 0.18 * mid;
  const jig = simplex2(wx * 3.4 + 2.2, wy * 3.4 - 1.7) * 0.2 + simplex2(wx * 7.1, wy * 7.1) * 0.12 + simplex2(wx * 14.3 - 5.5, wy * 14.3 + 2.4) * 0.08 * mid;
  return Math.max(0, Math.min(1, base + carve + jig));
}
function shoreFieldFast(terrain, worldW, wx, wy) {
  const [sx, sy] = domainWarp(wx, wy);
  const ix = Math.floor(sx);
  const iy = Math.floor(sy);
  const fx = sx - ix;
  const fy = sy - iy;
  const samp = (x, y) => isWaterCell(terrain, worldW, x, y) ? 1 : 0;
  const bil = samp(ix, iy) * (1 - fx) * (1 - fy) + samp(ix + 1, iy) * fx * (1 - fy) + samp(ix, iy + 1) * (1 - fx) * fy + samp(ix + 1, iy + 1) * fx * fy;
  const base = smoothstep(-0.25, 1.2, bil + shoreWarp(sx * 0.9, sy * 0.9) * 0.5);
  const mid = Math.max(0, 1 - Math.abs(base - 0.5) * 2);
  const carve = simplex2(wx * 1.85 + 4.4, wy * 1.85 - 2.8) * 0.4 * mid + simplex2(wx * 4.2 - 1.2, wy * 4.2 + 3.1) * 0.28 * mid;
  return Math.max(0, Math.min(1, base + carve));
}
function dirtBlob(wx, wy) {
  return 0.5 + fbm2(wx * 0.18 + 41.2, wy * 0.18 + 17.8, 6, 2.05, 0.52) * 0.58 + simplex2(wx * 0.55 + 3.7, wy * 0.55 + 11.2) * 0.34 + simplex2(wx * 1.35 - 2.4, wy * 1.35 + 8.1) * 0.18;
}
function dirtSdf(terrain, worldW, wx, wy) {
  const [sx0, sy0] = domainWarp(wx + 17.3, wy + 9.1);
  const sx = sx0 - 17.3;
  const sy = sy0 - 9.1;
  const ix = Math.floor(sx);
  const iy = Math.floor(sy);
  const fx = sx - ix;
  const fy = sy - iy;
  const samp = (x, y) => {
    if (x < 0 || y < 0 || x >= worldW || y >= worldW) return 0;
    return isDirtOrSand(terrain[y * worldW + x]) ? 1 : 0;
  };
  const here = samp(ix, iy) > 0;
  let best = 6;
  for (let dy = -5; dy <= 5; dy++) {
    for (let dx = -5; dx <= 5; dx++) {
      const ox = ix + dx;
      const oy = iy + dy;
      if (samp(ox, oy) > 0 === here) continue;
      const d = Math.hypot(sx - (ox + 0.5), sy - (oy + 0.5)) - 0.5;
      if (d < best) best = d;
    }
  }
  const bil = samp(ix, iy) * (1 - fx) * (1 - fy) + samp(ix + 1, iy) * fx * (1 - fy) + samp(ix, iy + 1) * (1 - fx) * fy + samp(ix + 1, iy + 1) * fx * fy;
  const blob = dirtBlob(wx, wy);
  const signed = here ? Math.max(0.015, best) : -Math.max(0.015, best);
  const edge = Math.max(0, 1 - Math.abs(signed) * 1.2);
  return signed * 0.5 + (bil - 0.5) * 0.28 + (blob - 0.5) * 0.42 * edge + shoreWarp(sx + 2.4, sy + 1.1) * 0.95 * edge;
}
function dirtField(terrain, worldW, wx, wy) {
  const base = smoothstep(-1.25, 0.75, dirtSdf(terrain, worldW, wx, wy));
  const mid = Math.max(0, 1 - Math.abs(base - 0.5) * 2);
  const carve = simplex2(wx * 1.95 + 3.3, wy * 1.95 - 1.8) * 0.5 * mid + simplex2(wx * 4.6 - 2.4, wy * 4.6 + 4.2) * 0.35 * mid + fbm2(wx * 0.8 + 2.1, wy * 0.8 - 1.4, 4, 2.05, 0.5) * 0.28 * mid + simplex2(wx * 10.2 + 1.1, wy * 10.2 - 2.6) * 0.14 * mid;
  const jig = simplex2(wx * 2.9 + 5.1, wy * 2.9 - 3.3) * 0.16 + simplex2(wx * 6.4, wy * 6.4) * 0.1;
  return Math.max(0, Math.min(1, base + carve + jig));
}
function paintOpaqueLerpStrip(ctx, fieldAt, gx, gy, px, py, tileS, land, cover, lo, hi, pad, tintFn, maskLo, maskHi, densityScale = 1) {
  const span = 1 + pad * 2;
  const n = Math.max(10, Math.min(22, Math.round(tileS * span * 0.55 * densityScale)));
  const cell = tileS * span / n;
  const ox = px - pad * tileS;
  const oy = py - pad * tileS;
  ctx.globalAlpha = 1;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n;
      const v = (j + 0.5) / n;
      const wx = gx - pad + u * span;
      const wy = gy - pad + v * span;
      const f = fieldAt(wx, wy);
      if (maskLo != null && f < maskLo) continue;
      if (maskHi != null && f > maskHi) continue;
      const w = smoothstep(lo, hi, f);
      const tint = tintFn ? tintFn(wx, wy) : 0;
      const r = Math.max(0, Math.min(255, land[0] * (1 - w) + cover[0] * w + tint | 0));
      const g = Math.max(0, Math.min(255, land[1] * (1 - w) + cover[1] * w + tint * 0.7 | 0));
      const b = Math.max(0, Math.min(255, land[2] * (1 - w) + cover[2] * w + tint * 0.45 | 0));
      ctx.fillStyle = "rgb(" + r + "," + g + "," + b + ")";
      ctx.fillRect(ox + i * cell - 0.35, oy + j * cell - 0.35, cell + 0.75, cell + 0.75);
    }
  }
}
var SHORE_PAD = 0.42;
var DIRT_PAD = 0.4;
function paintOrganicShoreWater(ctx, atlas, terrain, worldW, gx, gy, px, py, tileS, blitLand) {
  void blitLand;
  const land = rgbFromPacked(atlas.color32("grass"), [58, 90, 38]);
  const water = rgbFromPacked(atlas.color32("water"), [36, 88, 104]);
  const deep = rgbFromPacked(atlas.color32("water_deep"), [28, 68, 92]);
  const field = (wx, wy) => shoreField(terrain, worldW, wx, wy);
  paintOpaqueLerpStrip(ctx, field, gx, gy, px, py, tileS, land, water, 0.02, 0.58, SHORE_PAD, (wx, wy) => simplex2(wx * 2.2, wy * 2.2) * 5, void 0, void 0, 1.15);
  paintOpaqueLerpStrip(ctx, field, gx, gy, px, py, tileS, water, deep, 0.38, 0.92, SHORE_PAD, void 0, void 0, void 0, 1);
}
function paintLandShoreFringe(ctx, atlas, terrain, worldW, gx, gy, px, py, tileS) {
  const land = rgbFromPacked(atlas.color32("grass"), [58, 90, 38]);
  const water = rgbFromPacked(atlas.color32("water"), [36, 88, 104]);
  paintOpaqueLerpStrip(
    ctx,
    (wx, wy) => shoreField(terrain, worldW, wx, wy),
    gx,
    gy,
    px,
    py,
    tileS,
    land,
    water,
    0.02,
    0.62,
    SHORE_PAD,
    void 0,
    void 0,
    void 0,
    1.15
  );
}
function paintOrganicDirtPatch(ctx, atlas, terrain, worldW, gx, gy, px, py, tileS, blitGrass, coverKey) {
  void blitGrass;
  const land = rgbFromPacked(atlas.color32("grass"), [58, 90, 38]);
  const cover = rgbFromPacked(
    atlas.color32(coverKey) ?? atlas.color32("grass_grazed"),
    coverKey === "sand" ? [210, 186, 118] : [118, 92, 52]
  );
  paintOpaqueLerpStrip(
    ctx,
    (wx, wy) => dirtField(terrain, worldW, wx, wy),
    gx,
    gy,
    px,
    py,
    tileS,
    land,
    cover,
    0.02,
    0.42,
    DIRT_PAD,
    (wx, wy) => simplex2(wx * 2.4, wy * 2.4) * 6,
    void 0,
    void 0,
    1.35
  );
}
function paintDirtBleedOnGrass(ctx, atlas, terrain, worldW, gx, gy, px, py, tileS) {
  const land = rgbFromPacked(atlas.color32("grass"), [58, 90, 38]);
  const grazed = rgbFromPacked(atlas.color32("grass_grazed"), [118, 92, 52]);
  paintOpaqueLerpStrip(
    ctx,
    (wx, wy) => dirtField(terrain, worldW, wx, wy),
    gx,
    gy,
    px,
    py,
    tileS,
    land,
    grazed,
    0.08,
    0.55,
    DIRT_PAD,
    void 0,
    0.06,
    0.92,
    1.2
  );
}
function paintCoastalSand(ctx, atlas, terrain, worldW, gx, gy, px, py, tileS, blitGrass) {
  void blitGrass;
  const land = rgbFromPacked(atlas.color32("grass"), [58, 90, 38]);
  const sand = rgbFromPacked(atlas.color32("sand"), [210, 186, 118]);
  const water = rgbFromPacked(atlas.color32("water"), [36, 88, 104]);
  const field = (wx, wy) => shoreFieldFast(terrain, worldW, wx, wy);
  paintOpaqueLerpStrip(ctx, field, gx, gy, px, py, tileS, land, sand, 0.08, 0.42, SHORE_PAD);
  paintOpaqueLerpStrip(ctx, field, gx, gy, px, py, tileS, sand, water, 0.28, 0.75, SHORE_PAD);
}
var _stripTmp = null;
function stripCanvas(w, h) {
  const ww = Math.max(1, w | 0);
  const hh = Math.max(1, h | 0);
  if (!_stripTmp || _stripTmp.width !== ww || _stripTmp.height !== hh) {
    _stripTmp = document.createElement("canvas");
    _stripTmp.width = ww;
    _stripTmp.height = hh;
  }
  return _stripTmp.getContext("2d");
}
function cellTouchesDirt(terrain, worldW, gx, gy, r = 2) {
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const x = gx + dx;
      const y = gy + dy;
      if (x < 0 || y < 0 || x >= worldW || y >= worldW) continue;
      if (isDirtOrSand(terrain[y * worldW + x])) return true;
    }
  }
  return false;
}
function cellTouchesShore(terrain, worldW, gx, gy, r = 3) {
  const here = isWaterCell(terrain, worldW, gx, gy);
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx === 0 && dy === 0) continue;
      if (isWaterCell(terrain, worldW, gx + dx, gy + dy) !== here) return true;
    }
  }
  return false;
}
function paintViewportShoreStrip(ctx, atlas, terrain, worldW, x0, y0, x1, y1, camX, camY, zoom, tilePx) {
  const tileS = tilePx * zoom;
  if (tileS < 5.5) return;
  const cells = [];
  for (let gy = y0; gy <= y1; gy++) {
    for (let gx = x0; gx <= x1; gx++) {
      if (cellTouchesShore(terrain, worldW, gx, gy, 2)) cells.push({ gx, gy });
    }
  }
  if (!cells.length) return;
  let minX = cells[0].gx, maxX = minX, minY = cells[0].gy, maxY = minY;
  for (const c of cells) {
    if (c.gx < minX) minX = c.gx;
    if (c.gy < minY) minY = c.gy;
    if (c.gx > maxX) maxX = c.gx;
    if (c.gy > maxY) maxY = c.gy;
  }
  minX = Math.max(x0, minX - 1);
  minY = Math.max(y0, minY - 1);
  maxX = Math.min(x1, maxX + 1);
  maxY = Math.min(y1, maxY + 1);
  const land = rgbFromPacked(atlas.color32("grass"), [58, 90, 38]);
  const water = rgbFromPacked(atlas.color32("water"), [36, 88, 104]);
  const deep = rgbFromPacked(atlas.color32("water_deep"), [28, 68, 92]);
  const BUDGET = 16e4;
  const step = tileS >= 48 ? 2 : 1;
  const maxCells = Math.max(4, Math.floor(Math.sqrt(BUDGET) / (tileS / step)));
  const CHUNK = Math.min(24, maxCells);
  const prevSmooth = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = true;
  for (let cy0 = minY; cy0 <= maxY; cy0 += CHUNK) {
    for (let cx0 = minX; cx0 <= maxX; cx0 += CHUNK) {
      const cx1 = Math.min(maxX, cx0 + CHUNK - 1);
      const cy1 = Math.min(maxY, cy0 + CHUNK - 1);
      let hit = false;
      for (const c of cells) {
        if (c.gx >= cx0 - 1 && c.gx <= cx1 + 1 && c.gy >= cy0 - 1 && c.gy <= cy1 + 1) {
          hit = true;
          break;
        }
      }
      if (!hit) continue;
      const cellsW = cx1 - cx0 + 1;
      const cellsH = cy1 - cy0 + 1;
      const pw = Math.max(1, Math.ceil(cellsW * tileS / step));
      const ph = Math.max(1, Math.ceil(cellsH * tileS / step));
      if (pw * ph > BUDGET) continue;
      const img = stripCanvas(pw, ph).createImageData(pw, ph);
      const data = img.data;
      const inv = step / tileS;
      for (let j = 0; j < ph; j++) {
        for (let i = 0; i < pw; i++) {
          const wx = cx0 + (i + 0.5) * inv;
          const wy = cy0 + (j + 0.5) * inv;
          const f = shoreField(terrain, worldW, wx, wy);
          const a = shoreAlpha(f);
          if (a <= 0.02) continue;
          const [r, g, b] = shoreHardRgb(f, water, deep);
          const o = (j * pw + i) * 4;
          data[o] = r;
          data[o + 1] = g;
          data[o + 2] = b;
          data[o + 3] = a * 255 | 0;
        }
      }
      const sctx = stripCanvas(pw, ph);
      sctx.putImageData(img, 0, 0);
      const dx = (cx0 * tilePx - camX) * zoom;
      const dy = (cy0 * tilePx - camY) * zoom;
      ctx.drawImage(sctx.canvas, 0, 0, pw, ph, dx, dy, cellsW * tileS, cellsH * tileS);
    }
  }
  ctx.imageSmoothingEnabled = prevSmooth;
}
function paintViewportDirtStrip(ctx, atlas, terrain, worldW, x0, y0, x1, y1, camX, camY, zoom, tilePx) {
  const tileS = tilePx * zoom;
  if (tileS < 5.5) return;
  const cells = [];
  for (let gy = y0; gy <= y1; gy++) {
    for (let gx = x0; gx <= x1; gx++) {
      if (cellTouchesDirt(terrain, worldW, gx, gy, 2)) cells.push({ gx, gy });
    }
  }
  if (!cells.length) return;
  let minX = cells[0].gx, maxX = minX, minY = cells[0].gy, maxY = minY;
  for (const c of cells) {
    if (c.gx < minX) minX = c.gx;
    if (c.gy < minY) minY = c.gy;
    if (c.gx > maxX) maxX = c.gx;
    if (c.gy > maxY) maxY = c.gy;
  }
  minX = Math.max(x0, minX - 1);
  minY = Math.max(y0, minY - 1);
  maxX = Math.min(x1, maxX + 1);
  maxY = Math.min(y1, maxY + 1);
  const cover = rgbFromPacked(atlas.color32("grass_grazed"), [118, 92, 52]);
  const sand = rgbFromPacked(atlas.color32("sand"), [210, 186, 118]);
  const BUDGET = 16e4;
  const step = tileS >= 48 ? 2 : 1;
  const maxCells = Math.max(4, Math.floor(Math.sqrt(BUDGET) / (tileS / step)));
  const CHUNK = Math.min(24, maxCells);
  const prevSmooth = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = true;
  for (let cy0 = minY; cy0 <= maxY; cy0 += CHUNK) {
    for (let cx0 = minX; cx0 <= maxX; cx0 += CHUNK) {
      const cx1 = Math.min(maxX, cx0 + CHUNK - 1);
      const cy1 = Math.min(maxY, cy0 + CHUNK - 1);
      let hit = false;
      for (const c of cells) {
        if (c.gx >= cx0 - 1 && c.gx <= cx1 + 1 && c.gy >= cy0 - 1 && c.gy <= cy1 + 1) {
          hit = true;
          break;
        }
      }
      if (!hit) continue;
      const cellsW = cx1 - cx0 + 1;
      const cellsH = cy1 - cy0 + 1;
      const pw = Math.max(1, Math.ceil(cellsW * tileS / step));
      const ph = Math.max(1, Math.ceil(cellsH * tileS / step));
      if (pw * ph > BUDGET) continue;
      const img = stripCanvas(pw, ph).createImageData(pw, ph);
      const data = img.data;
      const inv = step / tileS;
      for (let j = 0; j < ph; j++) {
        for (let i = 0; i < pw; i++) {
          const wx = cx0 + (i + 0.5) * inv;
          const wy = cy0 + (j + 0.5) * inv;
          const f = dirtField(terrain, worldW, wx, wy);
          if (f < 0.5) continue;
          const sf = shoreField(terrain, worldW, wx, wy);
          if (sf > 0.22) continue;
          const o = (j * pw + i) * 4;
          data[o] = cover[0];
          data[o + 1] = cover[1];
          data[o + 2] = cover[2];
          data[o + 3] = 255;
        }
      }
      const sctx = stripCanvas(pw, ph);
      sctx.putImageData(img, 0, 0);
      const dx = (cx0 * tilePx - camX) * zoom;
      const dy = (cy0 * tilePx - camY) * zoom;
      ctx.drawImage(sctx.canvas, 0, 0, pw, ph, dx, dy, cellsW * tileS, cellsH * tileS);
    }
  }
  ctx.imageSmoothingEnabled = prevSmooth;
}
export {
  dirtField,
  dirtSdf,
  paintCoastalSand,
  paintDirtBleedOnGrass,
  paintLandShoreFringe,
  paintOrganicDirtPatch,
  paintOrganicShoreWater,
  paintViewportDirtStrip,
  paintViewportShoreStrip,
  rgbFromPacked,
  shoreAlpha,
  shoreField,
  shoreFieldFast,
  shoreHardRgb,
  shoreLerpWeights,
  shoreRgbAt,
  shoreSdf
};
