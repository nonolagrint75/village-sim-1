/**
 * Deterministic procedural noise for the render layer only.
 * Simulation never imports this — visual variation only.
 */

const F2 = 0.5 * (Math.sqrt(3) - 1)
const G2 = (3 - Math.sqrt(3)) / 6

const PERM = new Uint8Array(512)
const GRAD2 = [
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]

function buildPerm(seed: number) {
  const src = new Uint8Array(256)
  for (let i = 0; i < 256; i++) src[i] = i
  let s = (seed >>> 0) || 1
  for (let i = 255; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    const j = s % (i + 1)
    const t = src[i]
    src[i] = src[j]
    src[j] = t
  }
  for (let i = 0; i < 512; i++) PERM[i] = src[i & 255]
}

/** Call once when a world boots (seed from SimConfig). */
export function seedNoise(seed: number) {
  buildPerm((seed * 2654435761) >>> 0)
}

seedNoise(1)

function gradDot(hash: number, x: number, y: number) {
  const g = GRAD2[hash & 7]
  return g[0] * x + g[1] * y
}

/** Simplex 2D — returns roughly [-1, 1]. */
export function simplex2(x: number, y: number): number {
  const s = (x + y) * F2
  const i = Math.floor(x + s)
  const j = Math.floor(y + s)
  const t = (i + j) * G2
  const X0 = i - t
  const Y0 = j - t
  const x0 = x - X0
  const y0 = y - Y0

  let i1: number
  let j1: number
  if (x0 > y0) {
    i1 = 1
    j1 = 0
  } else {
    i1 = 0
    j1 = 1
  }

  const x1 = x0 - i1 + G2
  const y1 = y0 - j1 + G2
  const x2 = x0 - 1 + 2 * G2
  const y2 = y0 - 1 + 2 * G2

  const ii = i & 255
  const jj = j & 255
  const gi0 = PERM[ii + PERM[jj]]
  const gi1 = PERM[ii + i1 + PERM[jj + j1]]
  const gi2 = PERM[ii + 1 + PERM[jj + 1]]

  let n0 = 0
  let n1 = 0
  let n2 = 0

  let t0 = 0.5 - x0 * x0 - y0 * y0
  if (t0 >= 0) {
    t0 *= t0
    n0 = t0 * t0 * gradDot(gi0, x0, y0)
  }
  let t1 = 0.5 - x1 * x1 - y1 * y1
  if (t1 >= 0) {
    t1 *= t1
    n1 = t1 * t1 * gradDot(gi1, x1, y1)
  }
  let t2 = 0.5 - x2 * x2 - y2 * y2
  if (t2 >= 0) {
    t2 *= t2
    n2 = t2 * t2 * gradDot(gi2, x2, y2)
  }

  return 70 * (n0 + n1 + n2)
}

/** Fractal Brownian motion — roughly [-1, 1]. */
export function fbm2(x: number, y: number, octaves = 4, lacunarity = 2, gain = 0.5): number {
  let amp = 1
  let freq = 1
  let sum = 0
  let norm = 0
  for (let o = 0; o < octaves; o++) {
    sum += amp * simplex2(x * freq, y * freq)
    norm += amp
    amp *= gain
    freq *= lacunarity
  }
  return norm > 0 ? sum / norm : 0
}

/** Cheap hash in [0,1) — for discrete variants (tree shape, etc.). */
export function hash2(x: number, y: number, salt = 0): number {
  let n = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + salt * 0x9e3779b9) | 0
  n = Math.imul(n ^ (n >>> 13), 1274126177)
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296
}
