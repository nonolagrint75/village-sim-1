/**
 * Tiny helpers — pure, deterministic.
 */

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

/** Mix tick + ids into a stable 0–1 float (no Math.random). */
export function hash01(a: number, b = 0, c = 0): number {
  let x = (a * 374761393 + b * 668265263 + c * 2147483647) >>> 0
  x = Math.imul(x ^ (x >>> 15), 2246822507) >>> 0
  x = Math.imul(x ^ (x >>> 13), 3266489909) >>> 0
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296
}

export function pushEventCap<T>(arr: T[], ev: T, cap = 48): void {
  arr.push(ev)
  if (arr.length > cap) arr.splice(0, arr.length - cap)
}
