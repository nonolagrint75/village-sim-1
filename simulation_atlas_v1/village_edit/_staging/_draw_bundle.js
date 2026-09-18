// src/lib/render/nature/biomes.ts
var BiomeId = {
  ocean: 0,
  coastal: 1,
  desert: 2,
  scrub: 3,
  grassland: 4,
  savanna: 5,
  temperateForest: 6,
  boreal: 7,
  tundra: 8,
  alpine: 9,
  wetland: 10
};

// src/lib/sim/types.ts
var GRASS = 0;
var STONE = 1;
var TREE = 2;
var BUSH = 3;
var GOLD = 4;
var FENCE = 5;
var LOOT = 7;
var DIRT = 12;
var WATER = 14;
var PATH = 15;
var SAND = 17;
var FIELD = 19;
var WHEAT = 20;
var MILL = 21;
var TRAIL = 22;
var ROAD = 23;
var IRON = 25;
var MOUNTAIN = 26;

// src/lib/render/nature/textureLab.ts
var TREE_SPRITE_W = 16;
var TREE_SPRITE_H = 32;
var PEAK_SPRITE_H = 24;
var CLIFF_SPRITE_H = 32;
function hash2(x, y, s = 0) {
  let n = x * 374761393 + y * 668265263 + s * 1274126177 | 1597463007;
  n = Math.imul(n ^ n >>> 13, 1274126177);
  return ((n ^ n >>> 16) >>> 0) / 4294967296;
}
var TREE_OAK_VARIANTS = 8;
var TREE_PINE_VARIANTS = 8;
var TREE_DEAD_VARIANTS = 8;

// src/lib/render/nature/loader.ts
var namedTiles = import.meta.glob("../../../assets/nature/tiles/*.png", {
  eager: true,
  import: "default"
});
var blockTiles = import.meta.glob(
  "../../../assets/nature/source/block-texture-set/blocks/*.png",
  {
    eager: true,
    import: "default"
  }
);
var atlas = null;
var ready = false;
function isNatureReady() {
  return ready && !!atlas;
}
function getNatureAtlas() {
  return atlas;
}

// src/lib/render/nature/kinds.ts
var SOFT_WELL = 37;
var SOFT_PLAZA_FIRE = 38;
var NATURAL = /* @__PURE__ */ new Set([
  GRASS,
  STONE,
  TREE,
  BUSH,
  GOLD,
  LOOT,
  DIRT,
  WATER,
  SAND,
  IRON,
  MOUNTAIN,
  FIELD,
  WHEAT
]);
function isNaturalTerrain(terrain, amount = 0) {
  if (terrain === DIRT && amount > 0) return false;
  return NATURAL.has(terrain);
}
function isWornWay(terrain) {
  return terrain === TRAIL || terrain === PATH || terrain === ROAD;
}
function isGrassUnderlay(terrain) {
  return isWornWay(terrain) || terrain === FENCE || terrain === MILL || terrain === SOFT_WELL || terrain === SOFT_PLAZA_FIRE;
}

// src/lib/render/nature/mapping.ts
var TREE_AUTUMN_VARIANTS = TREE_OAK_VARIANTS;
function natureGrassKey(biome, season, x = 0, y = 0) {
  if (season === "winter" || biome === BiomeId.tundra || biome === BiomeId.alpine) return "grass_frost";
  if (biome === BiomeId.desert || biome === BiomeId.savanna || biome === BiomeId.scrub) return "grass_dry";
  if (biome === BiomeId.wetland) return "grass_wet";
  const v = hash2(x, y, 23) * 0.42 + hash2(x * 3 + 1 >> 1, y * 3 + 2 >> 1, 21) * 0.33 + hash2(x + 5 >> 2, y + 3 >> 2, 19) * 0.25;
  const slot = v < 0.14 ? "grass_b" : v < 0.28 ? "grass_c" : v < 0.42 ? "grass_d" : v < 0.56 ? "grass_e" : v < 0.7 ? "grass_f" : v < 0.84 ? "grass_g" : v < 0.93 ? "grass_h" : "grass";
  if (season === "autumn") return v > 0.62 ? "grass_autumn" : slot === "grass" ? "grass_autumn" : slot;
  if (season === "summer" && v > 0.88) return "grass_summer";
  return slot;
}
function meadowValue(x, y) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const discrete = hash2(ix, iy, 23) * 0.32 + hash2(ix * 3 + 1 >> 1, iy * 3 + 2 >> 1, 21) * 0.22 + hash2(ix + 5 >> 2, iy + 3 >> 2, 19) * 0.16;
  const fx = x - ix;
  const fy = y - iy;
  const h00 = hash2(ix, iy, 47);
  const h10 = hash2(ix + 1, iy, 47);
  const h01 = hash2(ix, iy + 1, 47);
  const h11 = hash2(ix + 1, iy + 1, 47);
  const cont = h00 * (1 - fx) * (1 - fy) + h10 * fx * (1 - fy) + h01 * (1 - fx) * fy + h11 * fx * fy;
  return discrete * 0.55 + cont * 0.45;
}
function treeKey(biome, season, x, y) {
  const pick = hash2(x, y, 21);
  const pine = `tree_pine_${Math.floor(hash2(x, y, 22) * TREE_PINE_VARIANTS)}`;
  if (biome === BiomeId.boreal || biome === BiomeId.alpine) return pine;
  if (season === "winter" || biome === BiomeId.tundra) {
    if (pick > 0.62) return pine;
    return `tree_dead_${Math.floor(pick * TREE_DEAD_VARIANTS)}`;
  }
  if (pick > 0.9) return pine;
  if (pick < 0.04) return `tree_dead_${Math.floor(hash2(x, y, 22) * TREE_DEAD_VARIANTS)}`;
  if (season === "autumn") return `tree_oak_autumn_${Math.floor(pick * TREE_AUTUMN_VARIANTS)}`;
  return `tree_oak_${Math.floor(pick * TREE_OAK_VARIANTS)}`;
}
function wheatKey(amount) {
  if (amount >= 200) return "wheat_5";
  if (amount >= 135) return "wheat_4";
  if (amount >= 100) return "wheat_3";
  if (amount >= 70) return "wheat_2";
  if (amount > 0) return "wheat_1";
  return "farmland";
}
function mountainKey(_x, _y, season, biome) {
  if (season === "winter" || biome === BiomeId.alpine || biome === BiomeId.tundra) return "mountain_plateau_2";
  return "mountain_plateau";
}
function natureGroundKey(terrain, amount, x, y, biome = BiomeId.grassland, season = "spring") {
  if (!isNaturalTerrain(terrain, amount)) return null;
  if (terrain === TREE || terrain === BUSH || terrain === LOOT) {
    return natureGrassKey(biome, season, x, y);
  }
  return natureTextureKey(terrain, amount, x, y, biome, season);
}
function natureTextureKey(terrain, amount, x, y, biome = BiomeId.grassland, season = "spring") {
  if (!isNaturalTerrain(terrain, amount)) return null;
  if (terrain === GRASS) return natureGrassKey(biome, season, x, y);
  if (terrain === DIRT) return "grass_grazed";
  if (terrain === SAND) return "sand";
  if (terrain === FIELD) return "farmland";
  if (terrain === WHEAT) return wheatKey(amount);
  if (terrain === WATER) {
    if (biome === BiomeId.ocean) return "water_deep";
    if (biome === BiomeId.wetland || biome === BiomeId.coastal) return "water_shallow";
    return "water";
  }
  if (terrain === STONE) return "mountain_plateau";
  if (terrain === MOUNTAIN) return mountainKey(x, y, season, biome);
  if (terrain === TREE) return treeKey(biome, season, x, y);
  if (terrain === BUSH) return "berry_bush";
  if (terrain === GOLD) return "ore_gold";
  if (terrain === IRON) return "ore_iron";
  if (terrain === LOOT) return hash2(x, y, 11) > 0.5 ? "fallen_log" : "rock";
  return "grass";
}

// src/lib/render/fauxHeight.ts
function drawGroundShadow(ctx, x, y, w, h, alpha = 0.2) {
  if (w < 1 || h < 1) return;
  ctx.fillStyle = "rgba(0,0,0," + alpha + ")";
  ctx.fillRect(Math.round(x), Math.round(y + h * 0.7), Math.round(w), Math.max(1, Math.round(h * 0.28)));
}
function drawSouthFace(ctx, topX, topY, topW, topH, faceH, faceAlpha = 0.38) {
  if (faceH < 1 || topW < 1) return;
  const fx = Math.round(topX);
  const fy = Math.round(topY + topH);
  const fw = Math.round(topW);
  const fh = Math.max(1, Math.round(faceH));
  ctx.fillStyle = "rgba(20,14,10," + faceAlpha + ")";
  ctx.fillRect(fx, fy, fw, fh);
  ctx.fillStyle = "rgba(255,220,160,0.08)";
  ctx.fillRect(fx, fy, Math.max(1, Math.round(fw * 0.1)), fh);
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.fillRect(fx + fw - Math.max(1, Math.round(fw * 0.1)), fy, Math.max(1, Math.round(fw * 0.1)), fh);
}
function drawNorthLit(ctx, x, y, w, strip = 2) {
  if (w < 1) return;
  ctx.fillStyle = "rgba(255,248,220,0.14)";
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.max(1, Math.round(strip)));
}

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
function paintLandShoreFringe(ctx, atlas2, terrain, worldW, gx, gy, px, py, tileS) {
  const land = rgbFromPacked(atlas2.color32("grass"), [58, 90, 38]);
  const water = rgbFromPacked(atlas2.color32("water"), [36, 88, 104]);
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
function paintOrganicDirtPatch(ctx, atlas2, terrain, worldW, gx, gy, px, py, tileS, blitGrass, coverKey) {
  void blitGrass;
  const land = rgbFromPacked(atlas2.color32("grass"), [58, 90, 38]);
  const cover = rgbFromPacked(
    atlas2.color32(coverKey) ?? atlas2.color32("grass_grazed"),
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
function paintCoastalSand(ctx, atlas2, terrain, worldW, gx, gy, px, py, tileS, blitGrass) {
  void blitGrass;
  const land = rgbFromPacked(atlas2.color32("grass"), [58, 90, 38]);
  const sand = rgbFromPacked(atlas2.color32("sand"), [210, 186, 118]);
  const water = rgbFromPacked(atlas2.color32("water"), [36, 88, 104]);
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
function paintViewportShoreStrip(ctx, atlas2, terrain, worldW, x0, y0, x1, y1, camX, camY, zoom, tilePx) {
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
  const land = rgbFromPacked(atlas2.color32("grass"), [58, 90, 38]);
  const water = rgbFromPacked(atlas2.color32("water"), [36, 88, 104]);
  const deep = rgbFromPacked(atlas2.color32("water_deep"), [28, 68, 92]);
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
function paintViewportDirtStrip(ctx, atlas2, terrain, worldW, x0, y0, x1, y1, camX, camY, zoom, tilePx) {
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
  const cover = rgbFromPacked(atlas2.color32("grass_grazed"), [118, 92, 52]);
  const sand = rgbFromPacked(atlas2.color32("sand"), [210, 186, 118]);
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

// src/lib/render/nature/draw.ts
function naturePixel32(terrain, amount, x, y, biome, season = "spring", terrainGrid, worldW) {
  if (!isNatureReady()) return null;
  const a = getNatureAtlas();
  if (!a) return null;
  const key = natureTextureKey(terrain, amount, x, y, biome ?? BiomeId.grassland, season);
  if (!key) return null;
  const base = a.color32(key);
  if (base == null) return null;
  if (terrainGrid && worldW && worldW > 0) {
    const lerpPack = (ca, cb, t) => {
      const ra = ca & 255;
      const ga = ca >>> 8 & 255;
      const ba = ca >>> 16 & 255;
      const rb = cb & 255;
      const gb = cb >>> 8 & 255;
      const bb = cb >>> 16 & 255;
      const r = ra + (rb - ra) * t | 0;
      const g = ga + (gb - ga) * t | 0;
      const b = ba + (bb - ba) * t | 0;
      return 255 << 24 | b << 16 | g << 8 | r;
    };
    const fieldAvg = (fn) => {
      let s = 0;
      for (let j = 0; j < 3; j++) {
        for (let i = 0; i < 3; i++) {
          s += fn(x + (i + 0.5) / 3, y + (j + 0.5) / 3);
        }
      }
      return s * (1 / 9);
    };
    const shoreBlend = (f, land, water, deep) => {
      if (f < 0.5) return land;
      const unpack = (c) => [c & 255, c >>> 8 & 255, c >>> 16 & 255];
      const [r, g, b] = shoreHardRgb(f, unpack(water), unpack(deep));
      return 255 << 24 | b << 16 | g << 8 | r;
    };
    const dirtBlend = (f, sf, land, cover, _sand) => {
      if (f < 0.5) return land;
      if (sf > 0.22) return land;
      return cover;
    };
    if (terrain === WATER) {
      const f = fieldAvg((wx, wy) => shoreField(terrainGrid, worldW, wx, wy));
      if (f < 0.98) {
        const land = a.color32("grass") ?? base;
        const water = a.color32("water") ?? base;
        const deep = a.color32("water_deep") ?? water;
        return shoreBlend(f, land, water, deep);
      }
    } else if (terrain === DIRT || terrain === SAND) {
      const f = fieldAvg((wx, wy) => dirtField(terrainGrid, worldW, wx, wy));
      const sf = fieldAvg((wx, wy) => shoreField(terrainGrid, worldW, wx, wy));
      const land = a.color32("grass") ?? base;
      const cover = a.color32("grass_grazed") ?? base;
      const sand = a.color32("sand") ?? (terrain === SAND ? base : cover);
      return dirtBlend(f, sf, land, cover, sand);
    } else if (terrain === GRASS || key.startsWith("grass")) {
      const nearShore = (() => {
        const ix = x | 0;
        const iy = y | 0;
        for (let dy = -3; dy <= 3; dy++) {
          for (let dx = -3; dx <= 3; dx++) {
            const nx = ix + dx;
            const ny = iy + dy;
            if (nx < 0 || ny < 0 || nx >= worldW || ny >= worldW) continue;
            if (terrainGrid[ny * worldW + nx] === WATER) return true;
          }
        }
        return false;
      })();
      if (nearShore) {
        const f = fieldAvg((wx, wy) => shoreField(terrainGrid, worldW, wx, wy));
        if (f >= 0.48) {
          const water = a.color32("water") ?? base;
          const deep = a.color32("water_deep") ?? water;
          return shoreBlend(f, base, water, deep);
        }
      }
      const nearDirt = (() => {
        const ix = x | 0;
        const iy = y | 0;
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const nx = ix + dx;
            const ny = iy + dy;
            if (nx < 0 || ny < 0 || nx >= worldW || ny >= worldW) continue;
            const c = terrainGrid[ny * worldW + nx];
            if (c === DIRT || c === SAND) return true;
          }
        }
        return false;
      })();
      if (nearDirt) {
        const df = fieldAvg((wx, wy) => dirtField(terrainGrid, worldW, wx, wy));
        if (df > 0.03) {
          const cover = a.color32("grass_grazed") ?? base;
          const sand = a.color32("sand") ?? cover;
          const sf = fieldAvg((wx, wy) => shoreField(terrainGrid, worldW, wx, wy));
          return dirtBlend(df, sf, base, cover, sand);
        }
      }
    }
  }
  return base;
}
function natureHandlesTerrain(terrain, amount = 0) {
  return isNatureReady() && (isNaturalTerrain(terrain, amount) || isGrassUnderlay(terrain));
}
function waterKeyAt(terrain, worldW, gx, gy) {
  let landCard = 0;
  let landDiag = 0;
  let water = 0;
  const n = (x, y, diag) => {
    if (x < 0 || y < 0 || x >= worldW || y >= worldW) return;
    if (terrain[y * worldW + x] === WATER) water++;
    else if (diag) landDiag++;
    else landCard++;
  };
  n(gx - 1, gy, false);
  n(gx + 1, gy, false);
  n(gx, gy - 1, false);
  n(gx, gy + 1, false);
  n(gx - 1, gy - 1, true);
  n(gx + 1, gy - 1, true);
  n(gx - 1, gy + 1, true);
  n(gx + 1, gy + 1, true);
  if (landCard >= 3 || landCard >= 2 && landDiag >= 3) return "water_shallow";
  if (water >= 8) return "water_deep";
  if (water >= 5) return "water";
  if (landCard >= 2) return "water";
  return "water";
}
function unpackRgb(c32) {
  return [c32 & 255, c32 >>> 8 & 255, c32 >>> 16 & 255];
}
function fillTint(ctx, c32, fallback, x, y, w, h, alpha, tint = 0) {
  if (alpha <= 0.02) return;
  const base = c32 != null ? unpackRgb(c32) : fallback;
  const r = Math.max(0, Math.min(255, base[0] + tint | 0));
  const g = Math.max(0, Math.min(255, base[1] + tint * 0.7 | 0));
  const b = Math.max(0, Math.min(255, base[2] + tint * 0.45 | 0));
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = 1;
}
function isTerrain(terrain, worldW, x, y, code) {
  if (x < 0 || y < 0 || x >= worldW || y >= worldW) return false;
  return terrain[y * worldW + x] === code;
}
function treeCountCardinal(terrain, worldW, gx, gy) {
  let n = 1;
  if (isTerrain(terrain, worldW, gx - 1, gy, TREE)) n++;
  if (isTerrain(terrain, worldW, gx + 1, gy, TREE)) n++;
  if (isTerrain(terrain, worldW, gx, gy - 1, TREE)) n++;
  if (isTerrain(terrain, worldW, gx, gy + 1, TREE)) n++;
  return n;
}
function chebyshevDist(terrain, worldW, gx, gy, code, maxR) {
  if (!isTerrain(terrain, worldW, gx, gy, code)) return -1;
  for (let r = 1; r <= maxR; r++) {
    for (let dx = -r; dx <= r; dx++) {
      if (!isTerrain(terrain, worldW, gx + dx, gy - r, code)) return r - 1;
      if (!isTerrain(terrain, worldW, gx + dx, gy + r, code)) return r - 1;
    }
    for (let dy = -r + 1; dy <= r - 1; dy++) {
      if (!isTerrain(terrain, worldW, gx - r, gy + dy, code)) return r - 1;
      if (!isTerrain(terrain, worldW, gx + r, gy + dy, code)) return r - 1;
    }
  }
  return maxR;
}
function chebyshevDistToLand(terrain, worldW, gx, gy, maxR) {
  if (!isTerrain(terrain, worldW, gx, gy, WATER)) return -1;
  for (let r = 1; r <= maxR; r++) {
    for (let dx = -r; dx <= r; dx++) {
      if (!isTerrain(terrain, worldW, gx + dx, gy - r, WATER) && gy - r >= 0 && gy - r < worldW && gx + dx >= 0 && gx + dx < worldW)
        return r - 1;
      if (!isTerrain(terrain, worldW, gx + dx, gy + r, WATER) && gy + r >= 0 && gy + r < worldW && gx + dx >= 0 && gx + dx < worldW)
        return r - 1;
    }
    for (let dy = -r + 1; dy <= r - 1; dy++) {
      if (!isTerrain(terrain, worldW, gx - r, gy + dy, WATER) && gy + dy >= 0 && gy + dy < worldW && gx - r >= 0)
        return r - 1;
      if (!isTerrain(terrain, worldW, gx + r, gy + dy, WATER) && gy + dy >= 0 && gy + dy < worldW && gx + r < worldW)
        return r - 1;
    }
  }
  return maxR;
}
function terraceLevel(dist, step, maxT) {
  if (dist < 0) return -1;
  const t = dist / step | 0;
  return t > maxT ? maxT : t;
}
function underCliffOverhang(terrain, worldW, gx, gy) {
  return isTerrain(terrain, worldW, gx, gy - 1, MOUNTAIN) || isTerrain(terrain, worldW, gx, gy - 1, STONE);
}
function mountainShelfKey(level, snowCap) {
  if (snowCap) return "mountain_snow";
  if (level >= 2) return "mountain_plateau_3";
  if (level >= 1) return "mountain_plateau_2";
  return "mountain_plateau";
}
function snowOnLevel(level, season, biome) {
  if (level < 2) return false;
  if (season === "winter") return true;
  if ((biome === BiomeId.alpine || biome === BiomeId.tundra) && level >= 3) return true;
  return false;
}
function countCardinalOf(terrain, worldW, gx, gy, pred) {
  let n = 0;
  if (gx > 0 && pred(terrain[gy * worldW + gx - 1])) n++;
  if (gx + 1 < worldW && pred(terrain[gy * worldW + gx + 1])) n++;
  if (gy > 0 && pred(terrain[(gy - 1) * worldW + gx])) n++;
  if (gy + 1 < worldW && pred(terrain[(gy + 1) * worldW + gx])) n++;
  return n;
}
function isMeadowish(t) {
  return t === GRASS || t === TREE || t === BUSH || t === LOOT || t === DIRT;
}
function isFieldish(t) {
  return t === FIELD || t === WHEAT;
}
function forestTreeSlots(terrain, worldW, gx, gy) {
  const n = treeCountCardinal(terrain, worldW, gx, gy);
  const h = hash2(gx, gy, 17);
  if (n >= 4) return h > 0.55 ? 2 : 2;
  if (n >= 3) return h > 0.65 ? 2 : 1;
  if (n >= 2) return h > 0.7 ? 2 : 1;
  if (h > 0.82) return 2;
  return 1;
}
function wheatOverlay(amount) {
  if (amount >= 200) return "wheat_5";
  if (amount >= 135) return "wheat_4";
  if (amount >= 100) return "wheat_3";
  if (amount >= 70) return "wheat_2";
  if (amount > 0) return "wheat_1";
  return null;
}
function drawNatureCloseup(ctx, terrain, amount, camX, camY, zoom, viewSize, tilePx, biome, season = "spring") {
  const atlas2 = getNatureAtlas();
  if (!atlas2 || !isNatureReady()) return;
  const tileS = tilePx * zoom;
  if (tileS < 5.5) return;
  const worldW = Math.sqrt(terrain.length) | 0;
  const x0 = Math.max(0, Math.floor(camX / tilePx) - 1);
  const y0 = Math.max(0, Math.floor(camY / tilePx) - 2);
  const x1 = Math.min(worldW, Math.ceil((camX + viewSize) / tilePx) + 1);
  const y1 = Math.min(worldW, Math.ceil((camY + viewSize) / tilePx) + 3);
  if ((x1 - x0) * (y1 - y0) > 12e3) return;
  const detail = tileS >= 7.5;
  const prevSmooth = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  const props = [];
  const mtnDist = /* @__PURE__ */ new Map();
  const moundDist = /* @__PURE__ */ new Map();
  const distOf = (code, gx, gy, maxR, cache) => {
    const k = gy * worldW + gx;
    const hit = cache.get(k);
    if (hit !== void 0) return hit;
    const d = chebyshevDist(terrain, worldW, gx, gy, code, maxR);
    cache.set(k, d);
    return d;
  };
  const isSharpPeak = (code, gx, gy, maxR, cache) => {
    const d = distOf(code, gx, gy, maxR, cache);
    if (d < 2) return false;
    let lower = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        if (!isTerrain(terrain, worldW, gx + dx, gy + dy, code)) {
          lower++;
          continue;
        }
        const nd = distOf(code, gx + dx, gy + dy, maxR, cache);
        if (nd > d) return false;
        if (nd < d) lower++;
      }
    }
    return lower >= 2 && hash2(gx, gy, 29) > 0.88;
  };
  for (let gy = y0; gy < y1; gy++) {
    const row = gy * worldW;
    for (let gx = x0; gx < x1; gx++) {
      const t = terrain[row + gx];
      const am = amount[row + gx];
      if (!isNaturalTerrain(t, am) && !isGrassUnderlay(t)) continue;
      const px = (gx * tilePx - camX) * zoom;
      const py = (gy * tilePx - camY) * zoom;
      const biomeId = biome?.[row + gx] ?? BiomeId.grassland;
      if (isGrassUnderlay(t)) {
        const g0 = natureGrassKey(biomeId, season, gx, gy);
        atlas2.blit(ctx, g0, px, py, tileS, tileS);
        if (detail && hash2(gx, gy, 27) > 0.55) {
          const g1 = natureGrassKey(biomeId, season, gx + 1, gy + 1);
          if (g1 !== g0) {
            ctx.globalAlpha = 0.28;
            atlas2.blit(ctx, g1, px, py, tileS, tileS);
            ctx.globalAlpha = 1;
          }
        }
        continue;
      }
      if (t === FIELD || t === WHEAT) {
        const meadowN = countCardinalOf(terrain, worldW, gx, gy, isMeadowish);
        const fieldN = countCardinalOf(terrain, worldW, gx, gy, isFieldish);
        const edge = meadowN >= 1 && fieldN <= 2;
        atlas2.blit(ctx, edge ? "farmland_edge" : "farmland", px, py, tileS, tileS);
        if (t === WHEAT) {
          const crop = wheatOverlay(am);
          if (crop) atlas2.blit(ctx, crop, px, py - tileS * 0.08, tileS, tileS);
        }
        continue;
      }
      if (t === DIRT || t === SAND) {
        const grassKey = natureGrassKey(biomeId, season, gx, gy);
        atlas2.blit(ctx, grassKey, px, py, tileS, tileS);
        const coverKey = t === SAND ? "sand" : "grass_grazed";
        const waterNear = countCardinalOf(terrain, worldW, gx, gy, (c) => c === WATER) >= 1 || shoreFieldFast(terrain, worldW, gx + 0.5, gy + 0.5) > 0.28;
        void waterNear;
        void coverKey;
        void paintCoastalSand;
        void paintOrganicDirtPatch;
        void paintLandShoreFringe;
        if (detail && !underCliffOverhang(terrain, worldW, gx, gy) && hash2(gx, gy, 81) > 0.68) {
          const edgeish = countCardinalOf(terrain, worldW, gx, gy, (c) => c === GRASS || c === TREE || c === BUSH) >= 1;
          if (edgeish || hash2(gx, gy, 82) > 0.82) {
            const kindRoll = hash2(gx, gy, 83);
            props.push({
              gx,
              gy,
              px,
              py,
              key: kindRoll > 0.78 ? "boulder_" + (hash2(gx, gy, 84) * 12 | 0) % 12 : kindRoll > 0.45 ? "grass_tuft" : "flower",
              kind: kindRoll > 0.78 ? "rock" : "flower",
              ox: (hash2(gx, gy, 85) - 0.5) * 0.85,
              oy: (hash2(gx, gy, 86) - 0.5) * 0.55,
              scale: 0.55 + hash2(gx, gy, 87) * 0.55
            });
          }
        }
        continue;
      }
      if (t === WATER) {
        const distLand = chebyshevDistToLand(terrain, worldW, gx, gy, 4);
        if (distLand >= 0 && distLand <= 3) {
          ctx.fillStyle = "rgb(28,68,92)";
          ctx.fillRect(px, py, tileS + 0.5, tileS + 0.5);
        } else {
          const wKey = waterKeyAt(terrain, worldW, gx, gy);
          atlas2.blit(ctx, wKey === "water_deep" ? "water_deep" : "water", px, py, tileS, tileS);
        }
        continue;
      }
      if (t === MOUNTAIN) {
        const dist = distOf(MOUNTAIN, gx, gy, 18, mtnDist);
        const level = terraceLevel(dist, 6, 3);
        const snowCap = snowOnLevel(level, season, biomeId);
        atlas2.blit(ctx, mountainShelfKey(level, snowCap), px, py, tileS, tileS);
        const southMtn = isTerrain(terrain, worldW, gx, gy + 1, MOUNTAIN);
        const southLevel = southMtn ? terraceLevel(distOf(MOUNTAIN, gx, gy + 1, 18, mtnDist), 6, 3) : -1;
        const sharp = isSharpPeak(MOUNTAIN, gx, gy, 18, mtnDist);
        if (southLevel < level && !sharp) {
          const drop = southMtn ? Math.max(1, level - southLevel) : 1 + level;
          const westMtn = isTerrain(terrain, worldW, gx - 1, gy, MOUNTAIN);
          const eastMtn = isTerrain(terrain, worldW, gx + 1, gy, MOUNTAIN);
          const westLevel = westMtn ? terraceLevel(distOf(MOUNTAIN, gx - 1, gy, 18, mtnDist), 6, 3) : -1;
          const eastLevel = eastMtn ? terraceLevel(distOf(MOUNTAIN, gx + 1, gy, 18, mtnDist), 6, 3) : -1;
          const outerWall = !southMtn;
          const nearEdge = dist < 6;
          const longSouthRim = westLevel === level && eastLevel === level;
          if (outerWall || nearEdge || longSouthRim) {
            props.push({
              gx,
              gy,
              px,
              py,
              key: snowCap ? "mountain_face_snow" : "mountain_face",
              kind: "cliff",
              depth: southMtn ? drop : 2 + level
            });
          }
        }
        if (sharp) {
          props.push({
            gx,
            gy,
            px,
            py,
            key: snowCap ? "mountain_peak_snow" : "mountain_peak",
            kind: "peak",
            scale: 0.72 + level * 0.12
          });
        }
        continue;
      }
      if (t === TREE) {
        atlas2.blit(ctx, natureGrassKey(biomeId, season, gx, gy), px, py, tileS, tileS);
        if (underCliffOverhang(terrain, worldW, gx, gy)) continue;
        const slots = forestTreeSlots(terrain, worldW, gx, gy);
        if (slots === 0) {
          const deco = hash2(gx, gy, 23);
          if (deco > 0.55) props.push({ gx, gy, px, py, key: "mushroom", kind: "flower" });
          else if (deco > 0.28) props.push({ gx, gy, px, py, key: "tree_stump", kind: "rock" });
          else props.push({ gx, gy, px, py, key: "fallen_log", kind: "rock" });
        } else {
          const offsets = slots >= 3 ? [
            [-0.22, 0.08, 0.72],
            [0.2, 0.02, 0.88],
            [0.02, -0.06, 1.05]
          ] : slots === 2 ? [
            [-0.18, 0.06, 0.82],
            [0.16, -0.04, 1]
          ] : [[0, 0, 1]];
          for (let i = 0; i < slots; i++) {
            const [ox, oy, sc] = offsets[i];
            const key = natureTextureKey(t, am, gx + i * 3, gy + i * 5, biomeId, season) || natureTextureKey(t, am, gx, gy, biomeId, season);
            if (!key) continue;
            const jitterX = (hash2(gx, gy, 40 + i) - 0.5) * 0.12;
            const jitterY = (hash2(gx, gy, 50 + i) - 0.5) * 0.08;
            props.push({
              gx,
              gy,
              px,
              py,
              key,
              kind: "tree",
              ox: ox + jitterX,
              oy: oy + jitterY,
              scale: sc * (0.92 + hash2(gx, gy, 60 + i) * 0.16),
              depth: oy + jitterY
            });
          }
          if (slots >= 2 && hash2(gx, gy, 71) > 0.88) {
            props.push({
              gx,
              gy,
              px,
              py,
              key: "grass_tuft",
              kind: "flower",
              ox: (hash2(gx, gy, 73) - 0.5) * 0.4,
              oy: 0.12,
              scale: 0.45
            });
          }
        }
        continue;
      }
      if (t === BUSH) {
        atlas2.blit(ctx, natureGrassKey(biomeId, season, gx, gy), px, py, tileS, tileS);
        if (underCliffOverhang(terrain, worldW, gx, gy)) continue;
        if (hash2(gx, gy, 31) < 0.78) {
          if (hash2(gx, gy, 32) > 0.55) {
            props.push({
              gx,
              gy,
              px,
              py,
              key: "grass_tuft",
              kind: "flower",
              ox: (hash2(gx, gy, 33) - 0.5) * 0.55,
              oy: (hash2(gx, gy, 34) - 0.5) * 0.3,
              scale: 0.55 + hash2(gx, gy, 35) * 0.35
            });
          }
          continue;
        }
        const bush = hash2(gx, gy, 36) > 0.5 ? "berry_bush" : "berry_bush_blue";
        props.push({
          gx,
          gy,
          px,
          py,
          key: bush,
          kind: "bush",
          ox: (hash2(gx, gy, 37) - 0.5) * 0.5,
          oy: (hash2(gx, gy, 38) - 0.5) * 0.25,
          scale: 0.7 + hash2(gx, gy, 39) * 0.45
        });
        continue;
      }
      if (t === LOOT) {
        atlas2.blit(ctx, natureGroundKey(t, am, gx, gy, biomeId, season) || "grass", px, py, tileS, tileS);
        continue;
      }
      if (t === STONE || t === GOLD || t === IRON) {
        const dist = distOf(t, gx, gy, 4, moundDist);
        const level = terraceLevel(dist, 2, 1);
        const shelf = level >= 1 ? "mountain_plateau_2" : "mountain_plateau";
        atlas2.blit(ctx, shelf, px, py, tileS, tileS);
        if (t === GOLD || t === IRON) {
          const oreKey = t === GOLD ? "ore_gold" : "ore_iron";
          props.push({
            gx,
            gy,
            px,
            py,
            key: oreKey,
            kind: "rock",
            scale: 1.05 + hash2(gx, gy, 16) * 0.7,
            ox: (hash2(gx, gy, 17) - 0.5) * 0.22,
            oy: (hash2(gx, gy, 18) - 0.5) * 0.12
          });
          if (hash2(gx, gy, 14) > 0.55) {
            props.push({
              gx,
              gy,
              px,
              py,
              key: "boulder_" + (hash2(gx, gy, 15) * 12 | 0) % 12,
              kind: "rock",
              scale: 0.4 + hash2(gx, gy, 19) * 0.28,
              ox: (hash2(gx, gy, 20) - 0.5) * 0.4,
              oy: 0.12 + hash2(gx, gy, 21) * 0.1
            });
          }
        }
        const southSame = isTerrain(terrain, worldW, gx, gy + 1, t);
        const southLevel = southSame ? terraceLevel(distOf(t, gx, gy + 1, 4, moundDist), 2, 1) : -1;
        if (southLevel < level) {
          props.push({
            gx,
            gy,
            px,
            py,
            key: "mountain_face",
            kind: "rock",
            scale: southSame ? 0.32 : 0.4 + level * 0.1
          });
        } else if (t === STONE && isSharpPeak(t, gx, gy, 4, moundDist) && hash2(gx, gy, 31) > 0.88) {
          props.push({
            gx,
            gy,
            px,
            py,
            key: "mountain_peak",
            kind: "peak",
            scale: 0.55
          });
        }
        continue;
      }
      const ground = natureTextureKey(t, am, gx, gy, biomeId, season);
      if (!ground) continue;
      atlas2.blit(ctx, ground.startsWith("grass") ? natureGrassKey(biomeId, season, gx, gy) : ground, px, py, tileS, tileS);
      if (ground.startsWith("grass")) {
        const waterN = countCardinalOf(terrain, worldW, gx, gy, (c) => c === WATER);
        let waterDiag = 0;
        if (isTerrain(terrain, worldW, gx - 1, gy - 1, WATER)) waterDiag++;
        if (isTerrain(terrain, worldW, gx + 1, gy - 1, WATER)) waterDiag++;
        if (isTerrain(terrain, worldW, gx - 1, gy + 1, WATER)) waterDiag++;
        if (isTerrain(terrain, worldW, gx + 1, gy + 1, WATER)) waterDiag++;
      }
      if (ground.startsWith("grass")) {
        const n = Math.max(8, Math.min(16, Math.round(tileS * 0.55)));
        const cell = tileS / n;
        const baseKey = natureGrassKey(biomeId, season, gx, gy);
        const baseC = atlas2.color32(baseKey);
        const baseMv = meadowValue(gx, gy);
        for (let j = 0; j < n; j++) {
          for (let i = 0; i < n; i++) {
            const u = (i + 0.5) / n;
            const v = (j + 0.5) / n;
            const mv = meadowValue(gx + u, gy + v) + fbm2((gx + u) * 0.6, (gy + v) * 0.6, 2) * 0.08;
            if (shoreFieldFast(terrain, worldW, gx + u, gy + v) > 0.12) continue;
            if (dirtField(terrain, worldW, gx + u, gy + v) > 0.14) continue;
            if (Math.abs(mv - baseMv) < 0.07) continue;
            const alt = natureGrassKey(
              biomeId,
              season,
              gx + ((u - 0.5) * 2 | 0),
              gy + ((v - 0.5) * 2 | 0)
            );
            if (alt === baseKey) continue;
            const a = 0.18 + Math.min(0.32, Math.abs(mv - baseMv) * 1.4);
            fillTint(
              ctx,
              atlas2.color32(alt) ?? baseC,
              [58, 90, 38],
              px + i * cell,
              py + j * cell,
              cell + 0.45,
              cell + 0.45,
              a
            );
          }
        }
      }
      if (detail && ground.startsWith("grass") && !underCliffOverhang(terrain, worldW, gx, gy)) {
        let nearTree = 0;
        if (isTerrain(terrain, worldW, gx - 1, gy, TREE)) nearTree++;
        if (isTerrain(terrain, worldW, gx + 1, gy, TREE)) nearTree++;
        if (isTerrain(terrain, worldW, gx, gy - 1, TREE)) nearTree++;
        if (isTerrain(terrain, worldW, gx, gy + 1, TREE)) nearTree++;
        if (nearTree >= 1 && hash2(gx, gy, 61) > 0.82) {
          const oak = `tree_oak_${Math.floor(hash2(gx, gy, 65) * 8)}`;
          props.push({
            gx,
            gy,
            px,
            py,
            key: oak,
            kind: "tree",
            ox: (hash2(gx, gy, 62) - 0.5) * 0.45,
            oy: -0.12 + (hash2(gx, gy, 63) - 0.5) * 0.1,
            scale: 0.85 + hash2(gx, gy, 64) * 0.25
          });
        }
      }
      if (detail && (ground.startsWith("grass") || ground === "grass_summer" || ground === "grass_autumn") && !underCliffOverhang(terrain, worldW, gx, gy) && hash2(gx, gy, 21) > 0.78) {
        props.push({
          gx,
          gy,
          px,
          py,
          key: hash2(gx, gy, 24) > 0.88 ? "flower" : "grass_tuft",
          kind: "flower",
          ox: (hash2(gx, gy, 22) - 0.5) * 0.7,
          oy: (hash2(gx, gy, 23) - 0.5) * 0.45
        });
      }
    }
  }
  paintViewportShoreStrip(ctx, atlas2, terrain, worldW, x0, y0, x1, y1, camX, camY, zoom, tilePx);
  paintViewportDirtStrip(ctx, atlas2, terrain, worldW, x0, y0, x1, y1, camX, camY, zoom, tilePx);
  const kindZ = (k) => k === "flower" ? 0 : k === "bush" ? 1 : k === "rock" ? 2 : k === "tree" ? 3 : k === "cliff" ? 4 : 5;
  props.sort((a, b) => {
    const fa = a.gy + (a.oy ?? 0) + (a.kind === "tree" ? 0.15 : a.kind === "peak" ? 0.35 : 0);
    const fb = b.gy + (b.oy ?? 0) + (b.kind === "tree" ? 0.15 : b.kind === "peak" ? 0.35 : 0);
    return fa - fb || kindZ(a.kind) - kindZ(b.kind) || a.gx - b.gx;
  });
  for (const p of props) {
    const h = hash2(p.gx, p.gy, 13);
    if (p.kind === "tree") {
      const sc = p.scale ?? 1;
      const pineish = p.key.includes("pine");
      const deadish = p.key.includes("dead");
      const tw = tileS * (pineish ? 2.55 + h * 0.6 : deadish ? 2.35 + h * 0.45 : 4.15 + h * 0.95) * sc;
      const th = tileS * (pineish ? 3.55 + h * 0.9 : deadish ? 2.9 + h * 0.55 : 3.15 + h * 0.6) * sc;
      const ox = (p.ox ?? 0) * tileS;
      const oy = (p.oy ?? 0) * tileS;
      const dx = p.px + (tileS - tw) * 0.5 + ox;
      const dy = p.py + tileS - th + oy;
      drawGroundShadow(ctx, dx + tw * 0.12, dy + th * 0.78, tw * 0.76, th * 0.14, 0.22);
      atlas2.blitRect(ctx, p.key, 0, 0, TREE_SPRITE_W, TREE_SPRITE_H, dx, dy, tw, th);
    } else if (p.kind === "cliff") {
      const drop = p.depth ?? 1;
      const outer = drop >= 2;
      const th = tileS * (outer ? 1.28 + Math.min(0.75, (drop - 2) * 0.22) : 0.55);
      atlas2.blitRect(ctx, p.key, 0, 6, TREE_SPRITE_W, CLIFF_SPRITE_H - 6, p.px, p.py + tileS * 0.72, tileS, th);
    } else if (p.kind === "peak") {
      const s = p.scale ?? 0.8;
      const tw = tileS * (0.7 + s * 0.25);
      const th = tileS * (0.85 + s * 0.35);
      atlas2.blitRect(
        ctx,
        p.key,
        0,
        0,
        TREE_SPRITE_W,
        PEAK_SPRITE_H,
        p.px + (tileS - tw) * 0.5,
        p.py + tileS - th,
        tw,
        th
      );
    } else if (p.kind === "rock") {
      const ox = (p.ox ?? 0) * tileS;
      const oy = (p.oy ?? 0) * tileS;
      if (p.key.startsWith("mountain_face") || p.key.startsWith("cliff")) {
        const th = tileS * (p.scale ?? 0.36);
        atlas2.blitRect(ctx, p.key, 0, 6, TREE_SPRITE_W, CLIFF_SPRITE_H - 6, p.px + ox, p.py + tileS * 0.72 + oy, tileS, th);
      } else {
        const sc = p.scale ?? 0.55;
        const dw = tileS * (0.9 + sc * 0.55);
        const dh = tileS * (0.55 + sc * 0.35);
        const bx = p.px + (tileS - dw) * 0.5 + ox;
        const by = p.py + tileS - dh * 0.85 + oy;
        drawGroundShadow(ctx, bx + dw * 0.1, by + dh * 0.7, dw * 0.8, dh * 0.22, 0.16);
        atlas2.blit(ctx, p.key, bx, by, dw, dh);
      }
    } else if (p.kind === "bush") {
      const sc = p.scale ?? 1;
      const dw = tileS * 1.35 * sc;
      const dh = tileS * 1.2 * sc;
      const ox = (p.ox ?? 0) * tileS;
      const oy = (p.oy ?? 0) * tileS;
      const bx = p.px + (tileS - dw) * 0.5 + ox;
      const by = p.py + tileS - dh - tileS * 0.08 + oy;
      drawGroundShadow(ctx, bx, by, dw, dh + tileS * 0.2, 0.18);
      atlas2.blit(ctx, p.key, bx, by, dw, dh);
      drawSouthFace(ctx, bx, by, dw, dh, tileS * 0.22, 0.32);
      drawNorthLit(ctx, bx, by, dw, Math.max(1, dh * 0.1));
    } else if (p.key === "grass_tuft") {
      const s = tileS * 0.72;
      const ox = (p.ox ?? 0) * tileS;
      const oy = (p.oy ?? 0) * tileS;
      const bx = p.px + (tileS - s) * 0.5 + ox;
      const by = p.py + tileS - s - tileS * 0.04 + oy;
      atlas2.blit(ctx, p.key, bx, by, s, s);
    } else {
      const s = tileS * 0.85;
      const bx = p.px + (tileS - s) * 0.5 + (hash2(p.gx, p.gy, 33) - 0.5) * tileS * 0.35;
      const by = p.py + tileS - s - tileS * 0.06 + (hash2(p.gx, p.gy, 34) - 0.5) * tileS * 0.15;
      drawGroundShadow(ctx, bx, by, s, s + tileS * 0.15, 0.16);
      atlas2.blit(ctx, p.key, bx, by, s, s);
      drawSouthFace(ctx, bx, by, s, s, tileS * 0.16, 0.3);
    }
  }
  ctx.imageSmoothingEnabled = prevSmooth;
}
export {
  drawNatureCloseup,
  natureHandlesTerrain,
  naturePixel32
};
