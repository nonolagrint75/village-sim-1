export const NATURE_TILE_PX = 16
export type TilePx = ImageData

export const TREE_SPRITE_W = 16
export const TREE_SPRITE_H = 32
export const TREE_CANOPY_H = 22
export const PEAK_SPRITE_H = 24
export const CLIFF_SPRITE_H = 32

export function makeTile(r = 0, g = 0, b = 0, a = 255): TilePx {
  const tile = new ImageData(NATURE_TILE_PX, NATURE_TILE_PX)
  const d = tile.data
  for (let i = 0; i < d.length; i += 4) {
    d[i] = r
    d[i + 1] = g
    d[i + 2] = b
    d[i + 3] = a
  }
  return tile
}

export function cloneTile(src: TilePx): TilePx {
  const out = new ImageData(src.width, src.height)
  out.data.set(src.data)
  return out
}

export function hash2(x: number, y: number, s = 0): number {
  let n = (x * 374761393 + y * 668265263 + s * 1274126177) | 0x5f3759df
  n = Math.imul(n ^ (n >>> 13), 1274126177)
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296
}

function clampByte(v: number) {
  return v < 0 ? 0 : v > 255 ? 255 : v | 0
}

function paint(
  d: Uint8ClampedArray,
  w: number,
  h: number,
  x: number,
  y: number,
  r: number,
  g: number,
  b: number,
  a = 255,
) {
  if (x < 0 || y < 0 || x >= w || y >= h) return
  const i = (y * w + x) * 4
  d[i] = r
  d[i + 1] = g
  d[i + 2] = b
  d[i + 3] = a
}

function sample16(src: TilePx, x: number, y: number): number {
  const n = NATURE_TILE_PX
  const sx = ((x % n) + n) % n
  const sy = ((y % n) + n) % n
  return (sy * n + sx) * 4
}

export function fillNoise(tile: TilePx, base: [number, number, number], amp: number, seed: number) {
  const d = tile.data
  const n = tile.width
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const j = (hash2(x, y, seed) - 0.5) * amp
      const i = (y * n + x) * 4
      d[i] = clampByte(base[0] + j)
      d[i + 1] = clampByte(base[1] + j)
      d[i + 2] = clampByte(base[2] + (j * 0.6) | 0)
      d[i + 3] = 255
    }
  }
  return tile
}

export function multiplyRgb(tile: TilePx, mr: number, mg: number, mb: number): TilePx {
  const out = cloneTile(tile)
  const d = out.data
  for (let i = 0; i < d.length; i += 4) {
    d[i] = clampByte(d[i] * mr)
    d[i + 1] = clampByte(d[i + 1] * mg)
    d[i + 2] = clampByte(d[i + 2] * mb)
  }
  return out
}

export function mixTiles(a: TilePx, b: TilePx, t: number): TilePx {
  const out = cloneTile(a)
  const da = out.data
  const db = b.data
  const k = t < 0 ? 0 : t > 1 ? 1 : t
  const ik = 1 - k
  for (let i = 0; i < da.length; i += 4) {
    da[i] = (da[i] * ik + db[i] * k) | 0
    da[i + 1] = (da[i + 1] * ik + db[i + 1] * k) | 0
    da[i + 2] = (da[i + 2] * ik + db[i + 2] * k) | 0
    da[i + 3] = (da[i + 3] * ik + db[i + 3] * k) | 0
  }
  return out
}

export function overlay(base: TilePx, spr: TilePx, ox = 0, oy = 0): TilePx {
  const out = cloneTile(base)
  const d = out.data
  const s = spr.data
  const w = out.width
  const sw = spr.width
  const sh = spr.height
  for (let y = 0; y < sh; y++) {
    const dy = y + oy
    if (dy < 0 || dy >= out.height) continue
    for (let x = 0; x < sw; x++) {
      const dx = x + ox
      if (dx < 0 || dx >= w) continue
      const si = (y * sw + x) * 4
      const a = s[si + 3] / 255
      if (a < 0.04) continue
      const di = (dy * w + dx) * 4
      const ia = 1 - a
      d[di] = (s[si] * a + d[di] * ia) | 0
      d[di + 1] = (s[si + 1] * a + d[di + 1] * ia) | 0
      d[di + 2] = (s[si + 2] * a + d[di + 2] * ia) | 0
      d[di + 3] = 255
    }
  }
  return out
}

export function frost(tile: TilePx, amount: number): TilePx {
  const out = cloneTile(tile)
  const d = out.data
  const a = amount < 0 ? 0 : amount > 1 ? 1 : amount
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 8) continue
    d[i] = clampByte(d[i] + (220 - d[i]) * a)
    d[i + 1] = clampByte(d[i + 1] + (226 - d[i + 1]) * a)
    d[i + 2] = clampByte(d[i + 2] + (236 - d[i + 2]) * a * 1.05)
  }
  return out
}

export function speckle(tile: TilePx, rgb: [number, number, number], chance: number, seed: number): TilePx {
  const out = cloneTile(tile)
  const d = out.data
  const n = out.width
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (hash2(x, y, seed) > chance) continue
      const i = (y * n + x) * 4
      d[i] = rgb[0]
      d[i + 1] = rgb[1]
      d[i + 2] = rgb[2]
      d[i + 3] = 255
    }
  }
  return out
}

export function fromImage(img: CanvasImageSource, sx: number, sy: number, size = NATURE_TILE_PX): TilePx {
  return fromImageRect(img, sx, sy, size, size)
}

export function fromImageRect(img: CanvasImageSource, sx: number, sy: number, w: number, h: number): TilePx {
  const c = document.createElement("canvas")
  c.width = w
  c.height = h
  const ctx = c.getContext("2d", { willReadFrequently: true })!
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, w, h)
  ctx.drawImage(img, sx, sy, w, h, 0, 0, w, h)
  return ctx.getImageData(0, 0, w, h)
}

export function avgPacked(tile: TilePx): number {
  const d = tile.data
  let r = 0, g = 0, b = 0, n = 0
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 16) continue
    r += d[i]
    g += d[i + 1]
    b += d[i + 2]
    n++
  }
  if (!n) return (255 << 24) | (40 << 16) | (90 << 8) | 80
  r = (r / n) | 0
  g = (g / n) | 0
  b = (b / n) | 0
  return (255 << 24) | (b << 16) | (g << 8) | r
}

/** Meadow grass — soft multi-scale mottling (Stardew/RW), not flat neon slabs. */
export function proceduralGrass(seed = 11): TilePx {
  const baseR = 58 + (seed % 11)
  const baseG = 90 + (seed % 13)
  const baseB = 38 + (seed % 7)
  const tile = makeTile(baseR, baseG, baseB)
  const d = tile.data
  const n = NATURE_TILE_PX
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = (y * n + x) * 4
      const patch = hash2((x / 3) | 0, (y / 3) | 0, seed)
      const mid = hash2((x / 2) | 0, (y / 2) | 0, seed + 3)
      const fine = hash2(x, y, seed + 7)
      const blade = hash2(x, (y * 2 + x) | 0, seed + 11)
      const vein = hash2((x + y) >> 1, y >> 2, seed + 19)
      let j = (patch - 0.5) * 26 + (mid - 0.5) * 14 + (fine - 0.5) * 9
      if (blade > 0.74) j += 12
      if (blade < 0.14) j -= 16
      if (fine > 0.91) j += 8
      if (patch < 0.2) j -= 12
      if (vein > 0.82) j += 5 // soft warm flecks — meadow variety without stamp grid
      if (vein < 0.12) j -= 6
      d[i] = clampByte(baseR + j * 0.58)
      d[i + 1] = clampByte(baseG + j)
      d[i + 2] = clampByte(baseB + j * 0.3)
    }
  }
  // Soft rim toward mean — hides 16x16 seams (anti MC stamp grid).
  let mr = 0, mg = 0, mb = 0
  for (let i = 0; i < d.length; i += 4) {
    mr += d[i]; mg += d[i + 1]; mb += d[i + 2]
  }
  const np = n * n
  mr = (mr / np) | 0
  mg = (mg / np) | 0
  mb = (mb / np) | 0
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const rim = Math.min(x, y, n - 1 - x, n - 1 - y)
      if (rim > 2) continue
      const i = (y * n + x) * 4
      const k = rim === 0 ? 0.48 : rim === 1 ? 0.28 : 0.12
      const ik = 1 - k
      d[i] = (d[i] * ik + mr * k) | 0
      d[i + 1] = (d[i + 1] * ik + mg * k) | 0
      d[i + 2] = (d[i + 2] * ik + mb * k) | 0
    }
  }
  return tile
}

/** Distinct meadow variant for neighboring cells (breaks stamp look). */
export function proceduralGrassVariant(variant: number): TilePx {
  return proceduralGrass(11 + variant * 17)
}

export function proceduralDirt(): TilePx {
  return fillNoise(makeTile(), [138, 98, 58], 14, 23)
}

export function proceduralSand(): TilePx {
  return fillNoise(makeTile(), [210, 186, 118], 12, 29)
}

export function proceduralWater(): TilePx {
  const tile = makeTile(36, 88, 104)
  const d = tile.data
  const n = NATURE_TILE_PX
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = (y * n + x) * 4
      // Soft diagonal flow - continuous body, not pond rings / U shores.
      const wave = Math.sin((x * 0.55 + y * 0.85) * 0.95) * 7 + Math.sin((x * 0.2 - y * 0.4) * 1.4) * 3.5 + Math.sin((x - y) * 0.35) * 2
      const v = hash2(x, y, 13)
      const sparkle = v > 0.94 ? 10 : v < 0.06 ? -6 : 0
      const j = wave + sparkle
      d[i] = clampByte(34 + j * 0.28)
      d[i + 1] = clampByte(86 + j * 0.48)
      d[i + 2] = clampByte(108 + j * 0.32)
    }
  }
  // Soft rim toward mean - hides 16x16 water seams on river bends (Factorio continuous).
  // Keep rim very mild — strong rim reads as pond rings.
  let mr = 0, mg = 0, mb = 0
  for (let i = 0; i < d.length; i += 4) {
    mr += d[i]; mg += d[i + 1]; mb += d[i + 2]
  }
  const np = n * n
  mr = (mr / np) | 0
  mg = (mg / np) | 0
  mb = (mb / np) | 0
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const rim = Math.min(x, y, n - 1 - x, n - 1 - y)
      if (rim > 0) continue
      const i = (y * n + x) * 4
      const k = 0.22
      const ik = 1 - k
      d[i] = (d[i] * ik + mr * k) | 0
      d[i + 1] = (d[i + 1] * ik + mg * k) | 0
      d[i + 2] = (d[i + 2] * ik + mb * k) | 0
    }
  }
  return tile
}

export function proceduralRock(): TilePx {
  return fillNoise(makeTile(), [168, 158, 146], 16, 41)
}

export function proceduralSnow(): TilePx {
  return fillNoise(makeTile(), [228, 234, 240], 10, 43)
}

/**
 * Dark tilled soil — RimWorld / DF field: rich brown, readable furrows.
 * Must contrast hard against muted grass (not grass-washed).
 */
export function proceduralFarmland(seed = 19): TilePx {
  const tile = makeTile(72, 46, 26)
  const d = tile.data
  const n = NATURE_TILE_PX
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = (y * n + x) * 4
      const v = hash2(x, y, seed)
      const v2 = hash2(x + 3, y + 7, seed + 5)
      const furrow = Math.sin((y + v * 0.8) * 1.15) * 16
      const pebble = v > 0.94 ? 10 : v < 0.06 ? -14 : 0
      const j = ((v2 - 0.5) * 8) | 0
      d[i] = clampByte(72 + furrow * 0.55 + pebble + j)
      d[i + 1] = clampByte(46 + furrow * 0.28 + pebble * 0.55 + j * 0.65)
      d[i + 2] = clampByte(26 + furrow * 0.12 + pebble * 0.3 + j * 0.3)
    }
  }
  return tile
}

/** Moister / freshly turned — slightly cooler and darker. */
export function proceduralFarmlandMoist(): TilePx {
  return multiplyRgb(proceduralFarmland(27), 0.88, 0.9, 0.92)
}

/**
 * Grazed / worn grass — mostly meadow with soft soil mottling.
 * Avoids solid dirt slabs (the "grosse tache" look).
 */
export function proceduralGrazedGrass(grass: TilePx, dirt: TilePx, wear = 0.3): TilePx {
  const out = cloneTile(grass)
  const d = out.data
  const dd = dirt.data
  const n = NATURE_TILE_PX
  const w = wear < 0 ? 0 : wear > 1 ? 1 : wear
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = (y * n + x) * 4
      const v = hash2(x, y, 71)
      const patch = hash2((x / 2) | 0, (y / 2) | 0, 73)
      const rim = Math.min(x, y, n - 1 - x, n - 1 - y)
      // Keep tile edges grassier so neighbors blend (no hard rectangle).
      const edgeSoft = rim <= 1 ? 0.35 : rim <= 2 ? 0.65 : 1
      let t = 0
      if (patch > 0.58 && v > 0.28) t = w * (0.28 + v * 0.5) * edgeSoft
      else if (v > 0.9) t = w * 0.22 * edgeSoft
      if (t < 0.04) continue
      const di = sample16(dirt, x + 2, y + 1)
      const ik = 1 - t
      d[i] = (d[i] * ik + dd[di] * t) | 0
      d[i + 1] = (d[i + 1] * ik + dd[di + 1] * t) | 0
      d[i + 2] = (d[i + 2] * ik + dd[di + 2] * t) | 0
    }
  }
  return out
}

/** Field soil slightly laced with grass — interior (kept readable as tilled). */
export function proceduralFarmlandSoft(farm: TilePx, grass: TilePx): TilePx {
  return mixTiles(farm, grass, 0.06)
}

/** Field border — tiny grass fringe only (fields stay dark brown). */
export function proceduralFarmlandEdge(farm: TilePx, grass: TilePx): TilePx {
  const out = cloneTile(farm)
  const d = out.data
  const gd = grass.data
  const n = NATURE_TILE_PX
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const rim = Math.min(x, y, n - 1 - x, n - 1 - y)
      if (rim > 0) continue
      const i = (y * n + x) * 4
      const t = 0.18
      const gi = sample16(grass, x, y)
      const ik = 1 - t
      d[i] = (d[i] * ik + gd[gi] * t) | 0
      d[i + 1] = (d[i + 1] * ik + gd[gi + 1] * t) | 0
      d[i + 2] = (d[i + 2] * ik + gd[gi + 2] * t) | 0
    }
  }
  return out
}

/** Tiny grass blades — transparent BG (never a black square stain). */
export function proceduralGrassTuft(leaves: TilePx): TilePx {
  const n = NATURE_TILE_PX
  const out = makeTile(0, 0, 0, 0)
  const d = out.data
  const ld = leaves.data
  const blades: Array<[number, number, number]> = [
    [6, 11, 4],
    [8, 10, 5],
    [10, 11, 4],
    [7, 12, 3],
    [9, 12, 3],
  ]
  for (const [bx, by, h] of blades) {
    for (let k = 0; k < h; k++) {
      const x = bx + ((k & 1) === 0 ? 0 : k > 2 ? 1 : -1)
      const y = by - k
      if (x < 0 || y < 0 || x >= n || y >= n) continue
      const si = sample16(leaves, x, y)
      const shade = 0.85 + hash2(x, y, 41) * 0.2
      paint(
        d,
        n,
        n,
        x,
        y,
        clampByte(ld[si] * shade),
        clampByte(ld[si + 1] * shade),
        clampByte(ld[si + 2] * shade),
      )
    }
  }
  return out
}

function leafAt(leaves: TilePx, x: number, y: number, shade: number): [number, number, number] {
  const si = sample16(leaves, x, y)
  const ld = leaves.data
  return [
    clampByte(ld[si] * shade),
    clampByte(ld[si + 1] * shade),
    clampByte(ld[si + 2] * shade),
  ]
}

function barkAt(bark: TilePx, x: number, y: number): [number, number, number] {
  const si = sample16(bark, x, y)
  const bd = bark.data
  return [bd[si], bd[si + 1], bd[si + 2]]
}

/** One complete tree: round oak / stacked pine, trunk to the foot, shadow, not a chopped tile. */
export function proceduralTree(
  leaves: TilePx,
  bark: TilePx,
  kind: "oak" | "pine" | "dead" = "oak",
  variant = 0,
): TilePx {
  const w = TREE_SPRITE_W
  const h = TREE_SPRITE_H
  const out = new ImageData(w, h)
  const d = out.data
  const pine = kind === "pine"
  const dead = kind === "dead"
  const v = ((variant % 8) + 8) % 8
  const lean = v === 1 ? -1.2 : v === 2 ? 1.3 : v === 5 ? -0.6 : 0
  const trunkX = 7.5 + lean * 0.35

  for (let x = 4; x <= 11; x++) {
    for (let y = 28; y <= 31; y++) {
      const e = ((x - 7.5) / 4.2) ** 2 + ((y - 30) / 1.6) ** 2
      if (e > 1) continue
      paint(d, w, h, x, y, 48, 72, 32, 110)
    }
  }

  // Shorter trunk / lower canopy start so round foliage fills the sprite (Stardew oak).
  const trunkTop = dead ? (v === 3 ? 14 : 16) : pine ? (v === 3 ? 16 : 18) : v === 4 ? 16 : 17
  const trunkW = pine || v === 3 ? 0 : v === 4 ? 1 : 0
  for (let y = trunkTop; y < h; y++) {
    const flare = y >= h - 2 ? 1 : 0
    const x0 = Math.round(trunkX) - (1 + flare + trunkW) + (lean > 0 && y > 24 ? 1 : 0)
    const x1 = Math.round(trunkX) + flare + trunkW + (lean < 0 && y > 24 ? 1 : 0)
    for (let x = x0; x <= x1; x++) {
      const [br, bg, bb] = barkAt(bark, x, y)
      const edge = x === x0 || x === x1
      paint(d, w, h, x, y, clampByte(br * (edge ? 0.72 : 1)), clampByte(bg * (edge ? 0.72 : 1)), clampByte(bb * (edge ? 0.72 : 1)))
    }
  }

  // Bare winter / dead crown — forks of bark, never a solid leaf slab (horizontal "slice").
  if (dead) {
    const forks: Array<[number, number, number, number]> =
      v === 1
        ? [[trunkX, trunkTop, trunkX - 4, 6], [trunkX, trunkTop + 1, trunkX + 4, 5], [trunkX, trunkTop - 1, trunkX - 1, 3]]
        : v === 2
          ? [[trunkX, trunkTop, trunkX + 5, 7], [trunkX, trunkTop + 2, trunkX - 3, 5], [trunkX, trunkTop, trunkX + 1, 4]]
          : v === 3
            ? [[trunkX, trunkTop, trunkX - 3, 5], [trunkX, trunkTop, trunkX + 3, 5], [trunkX, trunkTop - 2, trunkX, 2]]
            : v === 4
              ? [[trunkX, trunkTop, trunkX - 5, 8], [trunkX, trunkTop + 1, trunkX + 3, 6], [trunkX - 2, 8, trunkX - 4, 4]]
              : v === 5
                ? [[trunkX, trunkTop, trunkX + 4, 6], [trunkX, trunkTop + 2, trunkX - 4, 7], [trunkX, trunkTop, trunkX - 1, 3]]
                : [[trunkX, trunkTop, trunkX - 4, 7], [trunkX, trunkTop, trunkX + 4, 6], [trunkX, trunkTop - 1, trunkX + 1, 4]]
    for (const [x0, y0, x1, y1] of forks) {
      const steps = Math.max(4, Math.abs(x1 - x0) + Math.abs(y1 - y0))
      for (let s = 0; s <= steps; s++) {
        const t = s / steps
        const x = Math.round(x0 + (x1 - x0) * t)
        const y = Math.round(y0 + (y1 - y0) * t)
        const [br, bg, bb] = barkAt(bark, x, y)
        paint(d, w, h, x, y, clampByte(br * 0.95), clampByte(bg * 0.95), clampByte(bb * 0.95))
        if (s % 3 === 0) paint(d, w, h, x + 1, y, clampByte(br * 0.7), clampByte(bg * 0.7), clampByte(bb * 0.7))
      }
    }
    return out
  }

  if (pine) {
    const layers: Array<[number, number, number]> =
      v === 1
        ? [[6, 3, 2.4], [9, 8, 4.2], [12, 13, 5.4], [15, 18, 6.4]]
        : v === 2
          ? [[9, 6, 4.6], [14, 16, 6.8]]
          : v === 3
            ? [[7, 2, 2.2], [10, 7, 3.4], [13, 12, 4.4]]
            : v === 4
              ? [[8, 5, 3.8], [11, 10, 5.6], [15, 17, 7.0]]
              : v === 5
                ? [[8, 4, 3.0], [11, 9, 4.6], [14, 15, 5.8]]
                : [[8, 4, 3.2], [10, 9, 5.0], [13, 15, 6.2]]
    for (const [cy, by, rx] of layers) {
      for (let y = cy - 1; y <= by; y++) {
        const t = (y - cy) / Math.max(1, by - cy)
        const half = 1.2 + rx * t
        for (let x = 0; x < w; x++) {
          if (Math.abs(x - (7.5 + lean)) > half) continue
          const edge = Math.abs(x - (7.5 + lean)) > half - 0.85
          const shade = edge ? 0.72 : y === cy ? 1.12 : 0.92 + hash2(x, y, 17 + v) * 0.12
          const [lr, lg, lb] = leafAt(leaves, x, y, shade)
          paint(d, w, h, x, y, lr, lg, lb)
        }
      }
    }
  } else {
    const blobs: Array<[number, number, number, number]> =
      v === 1
        ? [[6.2, 9.4, 7.4, 8.6]]
        : v === 2
          ? [[9.2, 9.8, 7.2, 8.4]]
          : v === 3
            ? [[7.4, 8.6, 6.2, 7.2], [10.4, 12.2, 5.2, 5.8]]
            : v === 4
              ? [[7.6, 11.0, 8.2, 8.6]]
              : v === 5
                ? [[6.0, 10.0, 6.0, 7.8], [9.8, 9.6, 6.0, 7.2]]
                : v === 6
                  ? [[7.8, 9.2, 8.0, 8.0]]
                  : v === 7
                    ? [[5.8, 9.6, 6.4, 7.6], [10.0, 10.4, 5.8, 6.8], [8.0, 8.0, 4.6, 5.0]]
                    : [[7.6, 8.8, dead ? 5.4 : 9.4, dead ? 6.2 : 9.8]]
    for (const [cx, cy, rx, ry] of blobs) {
      for (let y = 1; y < 26; y++) {
        for (let x = 0; x < w; x++) {
          const e = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
          if (e > 1.0) continue
          const wobble = (hash2(x, y, 17 + v) - 0.5) * 0.1
          if (e + wobble > 0.98) continue
          const edge = e > 0.76
          const hi = e < 0.26 && x + y < 18
          const shade = edge ? 0.62 : hi ? 1.2 : y > cy ? 0.82 + hash2(x, y, 19 + v) * 0.08 : 0.98 + hash2(x, y, 19 + v) * 0.1
          const [lr, lg, lb] = leafAt(leaves, x, y, shade)
          paint(d, w, h, x, y, lr, lg, lb)
        }
      }
    }
  }
  return out
}

export function proceduralBush(leaves: TilePx): TilePx {
  const n = NATURE_TILE_PX
  const out = makeTile(0, 0, 0, 0)
  const d = out.data
  const ld = leaves.data
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const cx = x - 7.5
      const cy = y - 9.4
      const e = (cx * cx) / (6.2 * 6.2) + (cy * cy) / (5.0 * 5.0)
      if (e > 1.02 || y < 6) continue
      const i = (y * n + x) * 4
      d[i] = ld[i]
      d[i + 1] = ld[i + 1]
      d[i + 2] = ld[i + 2]
      d[i + 3] = 255
    }
  }
  return out
}

export function proceduralFlower(): TilePx {
  const n = NATURE_TILE_PX
  const out = makeTile(0, 0, 0, 0)
  const d = out.data
  const paintPx = (x: number, y: number, r: number, g: number, b: number) => paint(d, n, n, x, y, r, g, b)
  paintPx(7, 13, 46, 96, 44)
  paintPx(8, 13, 46, 96, 44)
  paintPx(7, 14, 46, 96, 44)
  paintPx(8, 14, 46, 96, 44)
  paintPx(7, 15, 46, 96, 44)
  paintPx(8, 15, 46, 96, 44)
  paintPx(7, 10, 232, 228, 80)
  paintPx(8, 10, 232, 228, 80)
  paintPx(6, 11, 232, 228, 80)
  paintPx(9, 11, 232, 228, 80)
  paintPx(7, 12, 232, 228, 80)
  paintPx(8, 12, 232, 228, 80)
  paintPx(7, 11, 214, 76, 62)
  paintPx(8, 11, 214, 76, 62)
  return out
}

export function proceduralMushroom(): TilePx {
  const n = NATURE_TILE_PX
  const out = makeTile(0, 0, 0, 0)
  const d = out.data
  for (let y = 12; y < 15; y++) {
    paint(d, n, n, 7, y, 214, 204, 176)
    paint(d, n, n, 8, y, 214, 204, 176)
  }
  for (let y = 9; y < 12; y++) {
    for (let x = 5; x <= 10; x++) paint(d, n, n, x, y, 176, 52, 48)
  }
  return out
}

export const ROCK_VARIANT_COUNT = 12
export const TREE_OAK_VARIANTS = 8
export const TREE_PINE_VARIANTS = 8
export const TREE_DEAD_VARIANTS = 8

const BOULDER_LUMPS: Array<Array<[number, number, number, number]>> = [
  [[8.0, 10.6, 5.2, 3.6], [5.2, 12.0, 3.0, 2.0]],
  [[8.0, 9.0, 3.4, 4.6]],
  [[6.0, 11.2, 3.2, 2.6], [10.2, 11.0, 3.4, 2.8]],
  [[7.6, 10.2, 4.0, 3.0], [10.8, 11.6, 2.4, 2.0], [5.0, 12.0, 2.2, 1.8]],
  [[8.2, 11.6, 6.4, 2.8]],
  [[7.2, 10.8, 2.6, 2.2], [10.4, 11.4, 2.4, 2.0]],
  [[8.0, 9.6, 4.6, 4.0], [5.4, 12.2, 2.8, 1.8]],
  [[5.8, 10.4, 3.6, 3.4], [9.8, 11.2, 4.0, 2.6]],
  [[8.0, 12.0, 2.4, 2.0]],
  [[7.4, 10.0, 5.6, 4.2], [11.2, 12.0, 2.6, 1.8], [4.4, 12.2, 2.4, 1.6]],
  [[9.2, 10.4, 3.8, 3.2], [6.2, 11.8, 3.0, 2.2]],
  [[8.0, 10.8, 3.2, 2.6], [5.4, 11.6, 2.4, 2.2], [10.8, 11.4, 2.6, 2.4], [8.2, 8.4, 2.0, 1.8]],
]

export function proceduralBoulder(rock: TilePx, variant = 0): TilePx {
  const n = NATURE_TILE_PX
  const out = makeTile(0, 0, 0, 0)
  const d = out.data
  const rd = rock.data
  const v = ((variant % ROCK_VARIANT_COUNT) + ROCK_VARIANT_COUNT) % ROCK_VARIANT_COUNT
  const lumps = BOULDER_LUMPS[v]

  let minY = n
  let maxY = 0
  let minX = n
  let maxX = 0
  for (const [lx, ly, rx, ry] of lumps) {
    minY = Math.min(minY, ly - ry)
    maxY = Math.max(maxY, ly + ry)
    minX = Math.min(minX, lx - rx)
    maxX = Math.max(maxX, lx + rx)
  }
  const shadowCx = (minX + maxX) * 0.5
  const shadowRx = Math.max(2.4, (maxX - minX) * 0.42)

  for (let x = Math.floor(shadowCx - shadowRx); x <= Math.ceil(shadowCx + shadowRx); x++) {
    for (let y = Math.floor(maxY); y <= Math.min(n - 1, Math.floor(maxY) + 2); y++) {
      const e = ((x - shadowCx) / shadowRx) ** 2 + ((y - (maxY + 0.6)) / 1.4) ** 2
      if (e > 1) continue
      paint(d, n, n, x, y, 42, 64, 28, 90)
    }
  }

  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      let inside = false
      let top = false
      let dark = false
      for (const [lx, ly, rx, ry] of lumps) {
        const ax = Math.abs(x - lx) / rx
        const ay = Math.abs(y - ly) / ry
        const m = ax + ay * 0.85
        if (m > 1.05) continue
        inside = true
        if (y < ly - ry * 0.15 && x < lx + 0.4) top = true
        if (x > lx + rx * 0.35 || y > ly + ry * 0.35) dark = true
      }
      if (!inside) continue
      const i = (y * n + x) * 4
      const si = sample16(rock, x + v * 3, y + v)
      let shade = dark ? 0.58 : top ? 1.18 : 0.88
      if (hash2(x, y, 31 + v) > 0.92) shade *= 0.78
      d[i] = clampByte(rd[si] * shade + (top ? 18 : 0))
      d[i + 1] = clampByte(rd[si + 1] * shade + (top ? 14 : 0))
      d[i + 2] = clampByte(rd[si + 2] * shade + (top ? 8 : 0))
      d[i + 3] = 255
    }
  }

  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = (y * n + x) * 4
      if (d[i + 3] < 16) continue
      const edge =
        (x > 0 && d[i - 1] < 16) ||
        (x < n - 1 && d[i + 7] < 16) ||
        (y > 0 && d[i - n * 4 + 3] < 16) ||
        (y < n - 1 && d[i + n * 4 + 3] < 16)
      if (!edge) continue
      d[i] = clampByte(d[i] * 0.52)
      d[i + 1] = clampByte(d[i + 1] * 0.52)
      d[i + 2] = clampByte(d[i + 2] * 0.52)
    }
  }
  return out
}

export function proceduralStump(bark: TilePx): TilePx {
  const n = NATURE_TILE_PX
  const out = makeTile(0, 0, 0, 0)
  const d = out.data
  for (let y = 10; y < 15; y++) {
    for (let x = 5; x <= 10; x++) {
      const [br, bg, bb] = barkAt(bark, x, y)
      const top = y === 10
      paint(d, n, n, x, y, top ? clampByte(br + 28) : br, top ? clampByte(bg + 18) : bg, bb)
    }
  }
  return out
}

export function proceduralLog(bark: TilePx): TilePx {
  const n = NATURE_TILE_PX
  const out = makeTile(0, 0, 0, 0)
  const d = out.data
  for (let y = 11; y <= 13; y++) {
    for (let x = 2; x <= 13; x++) {
      const [br, bg, bb] = barkAt(bark, x, y)
      paint(d, n, n, x, y, y === 11 ? clampByte(br + 18) : br, y === 11 ? clampByte(bg + 10) : bg, bb)
    }
  }
  return out
}

/** Round mound + obvious berries (mood-board shrub, not a terrain tile). */
export function proceduralBerryBush(leaves: TilePx, berries: "red" | "blue" = "red"): TilePx {
  const n = NATURE_TILE_PX
  const out = makeTile(0, 0, 0, 0)
  const d = out.data
  const ld = leaves.data

  for (let x = 3; x <= 12; x++) {
    for (let y = 13; y <= 15; y++) {
      const e = ((x - 7.5) / 5.2) ** 2 + ((y - 14.5) / 1.4) ** 2
      if (e > 1) continue
      paint(d, n, n, x, y, 64, 108, 42, 160)
    }
  }

  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const cx = x - 7.5
      const cy = y - 8.2
      const e = (cx * cx) / (6.6 * 6.6) + (cy * cy) / (6.0 * 6.0)
      if (e > 1.02 || y < 2) continue
      const i = (y * n + x) * 4
      const edge = e > 0.78
      const hi = e < 0.28 && x + y < 15
      const shade = edge ? 0.7 : hi ? 1.12 : 0.88
      d[i] = clampByte(ld[i] * shade * 0.78)
      d[i + 1] = clampByte(ld[i + 1] * shade * 0.92)
      d[i + 2] = clampByte(ld[i + 2] * shade * 0.7)
      d[i + 3] = 255
    }
  }

  const dots: Array<[number, number]> = [
    [5, 7], [9, 6], [7, 9], [4, 10], [11, 9], [8, 11], [6, 6], [10, 8],
  ]
  const col = berries === "blue" ? [56, 140, 210] : [196, 40, 42]
  const hi = berries === "blue" ? [140, 200, 240] : [236, 120, 90]
  for (const [bx, by] of dots) {
    paint(d, n, n, bx, by, col[0], col[1], col[2])
    paint(d, n, n, bx + 1, by, col[0], col[1], col[2])
    paint(d, n, n, bx, by + 1, col[0], col[1], col[2])
    paint(d, n, n, bx + 1, by + 1, hi[0], hi[1], hi[2])
  }
  return out
}

export function proceduralOre(stone: TilePx, rgb: [number, number, number], seed: number): TilePx {
  // Soft elliptical mound (Factorio/RW ore piles) - not a full-cell tint stamp.
  const out = makeTile(0, 0, 0, 0)
  const d = out.data
  const n = NATURE_TILE_PX
  const cx = (n - 1) * 0.5
  const cy = (n - 1) * 0.58
  const rx = 6.2 + hash2(seed, 1, 3) * 1.4
  const ry = 4.4 + hash2(seed, 2, 5) * 1.1
  const hi = [clampByte(rgb[0] + 40), clampByte(rgb[1] + 28), clampByte(rgb[2] + 12)]
  const stoneD = stone.data
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const nx = (x - cx) / rx
      const ny = (y - cy) / ry
      const e = nx * nx + ny * ny
      if (e > 1.0) continue
      const i = (y * n + x) * 4
      const edge = Math.max(0, 1 - e)
      const a = edge > 0.85 ? 1 : edge * 1.15
      if (a < 0.08) continue
      const shade = 0.72 + edge * 0.35 + (hash2(x, y, seed) - 0.5) * 0.08
      const fleck = hash2(x, y, seed + 7) > 0.78
      const shine = fleck && edge > 0.45
      d[i] = clampByte((shine ? hi[0] : rgb[0] * 0.55 + stoneD[i] * 0.45) * shade)
      d[i + 1] = clampByte((shine ? hi[1] : rgb[1] * 0.55 + stoneD[i + 1] * 0.45) * shade)
      d[i + 2] = clampByte((shine ? hi[2] : rgb[2] * 0.55 + stoneD[i + 2] * 0.45) * shade)
      d[i + 3] = clampByte(255 * Math.min(1, a))
    }
  }
  return out
}

export function proceduralWheat(stage: 1 | 2 | 3 | 4 | 5): TilePx {
  const out = makeTile(0, 0, 0, 0)
  const d = out.data
  const n = NATURE_TILE_PX
  const h = stage === 1 ? 5 : stage === 2 ? 8 : stage === 3 ? 10 : stage === 4 ? 12 : 14
  const head = stage >= 3
  const ripe = stage === 5
  const greenHead = stage === 3
  for (let col = 2; col <= 13; col += 2) {
    const jitter = (hash2(col, 3, 61) * 2) | 0
    const x = col + (jitter % 2)
    for (let y = n - h; y < n; y++) {
      paint(d, n, n, x, y, ripe ? 168 : 62, ripe ? 148 : 132, ripe ? 42 : 48)
    }
    if (head) {
      paint(
        d,
        n,
        n,
        x,
        n - h,
        ripe ? 210 : greenHead ? 92 : 88,
        ripe ? 176 : greenHead ? 158 : 150,
        ripe ? 58 : greenHead ? 48 : 52,
      )
      paint(
        d,
        n,
        n,
        x,
        n - h + 1,
        ripe ? 196 : greenHead ? 78 : 72,
        ripe ? 160 : greenHead ? 148 : 140,
        ripe ? 48 : greenHead ? 42 : 46,
      )
    }
  }
  return out
}

function mountainBase(kind: "plateau" | "cliff" | "lit" | "shade" | "snow", tier = 0): TilePx {
  const pal =
    kind === "snow"
      ? [214, 220, 228]
      : kind === "cliff" || kind === "shade"
        ? [92, 82, 72]
        : kind === "lit"
          ? [198, 168, 128]
          : tier >= 2
            ? [118, 106, 94]
            : tier === 1
              ? [156, 128, 98]
              : [194, 158, 112]
  const tile = makeTile(pal[0], pal[1], pal[2])
  const d = tile.data
  const n = NATURE_TILE_PX
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = (y * n + x) * 4
      const patch = (hash2(x >> 1, y >> 1, 71) - 0.5) * 22
      const grain = (hash2(x, y, 73) - 0.5) * 14
      const speck = hash2(x, y, 91) > 0.91 ? -22 : hash2(x, y, 97) > 0.94 ? 16 : 0
      let r = pal[0] + patch + grain + speck
      let g = pal[1] + patch * 0.88 + grain * 0.9 + speck
      let b = pal[2] + patch * 0.7 + grain * 0.65 + speck * 0.8
      if (kind === "cliff") {
        const vein = x % 4 === 1 ? -14 : 0
        r = 78 + grain + vein
        g = 70 + grain + vein
        b = 62 + grain * 0.8 + vein
      } else if (kind === "shade") {
        r = 64 + grain
        g = 58 + grain
        b = 52 + grain
      } else if (kind === "snow") {
        r = 214 + grain * 0.45 + patch * 0.3
        g = 220 + grain * 0.45 + patch * 0.3
        b = 228 + grain * 0.35
      }
      d[i] = clampByte(r)
      d[i + 1] = clampByte(g)
      d[i + 2] = clampByte(b)
      d[i + 3] = 255
    }
  }
  return tile
}

export function proceduralMountainPlateau(tier = 0): TilePx {
  return mountainBase("plateau", tier)
}

export function proceduralMountainCliff(): TilePx {
  return mountainBase("cliff")
}

export function proceduralMountainLit(): TilePx {
  return mountainBase("lit")
}

export function proceduralMountainShade(): TilePx {
  return mountainBase("shade")
}

export function proceduralMountainSnow(): TilePx {
  return mountainBase("snow")
}

export function proceduralMountainPeak(snow = false): TilePx {
  const w = NATURE_TILE_PX
  const h = PEAK_SPRITE_H
  const out = new ImageData(w, h)
  const d = out.data
  for (let y = 2; y < h; y++) {
    const t = (y - 2) / (h - 3)
    const half = 1.2 + t * 6.4
    for (let x = 0; x < w; x++) {
      if (Math.abs(x - 7.5) > half) continue
      const edge = Math.abs(x - 7.5) > half - 1
      const lit = x < 7
      let r = snow ? 228 : 188
      let g = snow ? 232 : 176
      let b = snow ? 236 : 152
      if (edge) {
        r *= 0.62
        g *= 0.62
        b *= 0.62
      } else if (!lit) {
        r *= 0.72
        g *= 0.7
        b *= 0.68
      } else if (y < 8) {
        r = snow ? 242 : 214
        g = snow ? 244 : 202
        b = snow ? 246 : 176
      }
      const grain = (hash2(x, y, 81) - 0.5) * 12
      paint(d, w, h, x, y, clampByte(r + grain), clampByte(g + grain), clampByte(b + grain))
    }
  }
  return out
}

/** South face that hangs off the rim — tiles in X so a massif reads as one wall. */
export function proceduralMountainFace(snow = false): TilePx {
  const w = NATURE_TILE_PX
  const h = CLIFF_SPRITE_H
  const out = new ImageData(w, h)
  const d = out.data
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const grain = (hash2(x, y, 77) - 0.5) * 18
      const vein = x % 5 === 2 ? -20 : x % 5 === 3 ? -8 : 0
      let r: number
      let g: number
      let b: number
      if (y < 5) {
        r = (snow ? 210 : 168) + grain
        g = (snow ? 216 : 140) + grain
        b = (snow ? 224 : 108) + grain * 0.7
      } else {
        const t = (y - 5) / (h - 6)
        const lit = x < 5 ? 1.18 : x > 11 ? 0.62 : 0.9
        const deep = 1 - t * 0.5
        const baseR = snow ? 72 : 108
        const baseG = snow ? 68 : 96
        const baseB = snow ? 64 : 84
        r = baseR * lit * deep + grain + vein
        g = baseG * lit * deep + grain + vein
        b = baseB * lit * deep + grain * 0.75 + vein
      }
      if (y === 5) {
        r *= 0.42
        g *= 0.42
        b *= 0.42
      }
      paint(d, w, h, x, y, clampByte(r), clampByte(g), clampByte(b))
    }
  }
  return out
}
