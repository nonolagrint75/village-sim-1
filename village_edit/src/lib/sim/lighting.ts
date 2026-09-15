/**
 * Visual-only local lighting for the DF-style canvas.
 * Hearths / candles / torches punch warm pools into the night overlay.
 */

import { HEARTH } from './types'

export type LightKind = 'hearth' | 'torch' | 'candle'

/** World-space light for the draw frame (static sources). */
export type ActorLight = {
  x: number
  y: number
  kind: LightKind
}

/** Tile radii — hearths dominate rooms; carried lights stay intimate. */
export const LIGHT_RADIUS_TILES: Record<LightKind, number> = {
  hearth: 5.2,
  torch: 3.1,
  candle: 1.85,
}

const MAX_TERRAIN_LIGHTS = 96
const MAX_GLOW_DRAWS = 120

/** Soft 0..1 flicker from time + cell hash (visual only). */
export function lightFlicker(x: number, y: number, nowMs: number): number {
  const phase = ((x * 12.9898 + y * 78.233) % 1) * 6.2832
  const t = nowMs * 0.0042
  const w = 0.5 + 0.5 * Math.sin(t + phase) * Math.sin(t * 1.7 + phase * 0.6)
  return 0.82 + w * 0.18
}

/**
 * Scan visible terrain for HEARTH tiles (and packed lights already known).
 * Stride grows when zoomed out so far views stay cheap.
 */
export function collectTerrainHearths(
  terrain: Uint8Array,
  worldSize: number,
  camX: number,
  camY: number,
  visible: number,
  tilePx: number,
  out: ActorLight[],
): void {
  const pad = 6
  const x0 = Math.max(0, Math.floor(camX / tilePx) - pad)
  const y0 = Math.max(0, Math.floor(camY / tilePx) - pad)
  const x1 = Math.min(worldSize - 1, Math.ceil((camX + visible) / tilePx) + pad)
  const y1 = Math.min(worldSize - 1, Math.ceil((camY + visible) / tilePx) + pad)
  const tilesAcross = Math.max(1, (x1 - x0 + 1) * (y1 - y0 + 1))
  const stride = tilesAcross > 12_000 ? 2 : 1
  let n = 0
  for (let y = y0; y <= y1; y += stride) {
    const row = y * worldSize
    for (let x = x0; x <= x1; x += stride) {
      if (terrain[row + x] !== HEARTH) continue
      out.push({ x, y, kind: 'hearth' })
      n++
      if (n >= MAX_TERRAIN_LIGHTS) return
    }
  }
}

function glowColors(kind: LightKind): { core: string; mid: string; rim: string } {
  if (kind === 'hearth') {
    return {
      core: 'rgba(255, 186, 96, 0.55)',
      mid: 'rgba(232, 120, 48, 0.28)',
      rim: 'rgba(120, 48, 16, 0)',
    }
  }
  if (kind === 'torch') {
    return {
      core: 'rgba(255, 200, 110, 0.48)',
      mid: 'rgba(240, 140, 50, 0.22)',
      rim: 'rgba(90, 36, 10, 0)',
    }
  }
  return {
    core: 'rgba(255, 220, 150, 0.38)',
    mid: 'rgba(255, 170, 80, 0.14)',
    rim: 'rgba(80, 40, 12, 0)',
  }
}

/**
 * After the night multiply pass: warm radial lifts so lit tiles read clearly.
 * Uses `lighter` so dark areas stay dark while fire pools bloom.
 */
export function drawLocalLightGlows(
  ctx: CanvasRenderingContext2D,
  lights: readonly ActorLight[],
  night: number,
  worldToScreen: (x: number, y: number) => { sx: number; sy: number },
  tilePxScreen: number,
  nowMs: number,
  displaySize: number,
): void {
  if (night < 0.04 || lights.length === 0) return
  const prev = ctx.globalCompositeOperation
  ctx.globalCompositeOperation = 'lighter'
  const nightBoost = 0.55 + night * 0.9
  let drawn = 0
  for (let i = 0; i < lights.length; i++) {
    if (drawn >= MAX_GLOW_DRAWS) break
    const L = lights[i]
    const { sx, sy } = worldToScreen(L.x, L.y)
    const radiusTiles = LIGHT_RADIUS_TILES[L.kind]
    const r = radiusTiles * tilePxScreen
    if (r < 1.5) continue
    if (sx < -r || sy < -r || sx > displaySize + r || sy > displaySize + r) continue
    const flick = lightFlicker(L.x, L.y, nowMs)
    const colors = glowColors(L.kind)
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r)
    const a = nightBoost * flick
    g.addColorStop(0, scaleAlpha(colors.core, a))
    g.addColorStop(0.35, scaleAlpha(colors.mid, a))
    g.addColorStop(1, colors.rim)
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(sx, sy, r, 0, Math.PI * 2)
    ctx.fill()
    // Hot core speck so the fire tile itself reads as emission.
    if (L.kind === 'hearth' || L.kind === 'torch') {
      const coreR = Math.max(1.2, tilePxScreen * (L.kind === 'hearth' ? 0.55 : 0.35))
      const cg = ctx.createRadialGradient(sx, sy, 0, sx, sy, coreR)
      cg.addColorStop(0, `rgba(255, 240, 180, ${(0.35 * a).toFixed(3)})`)
      cg.addColorStop(1, 'rgba(255, 160, 60, 0)')
      ctx.fillStyle = cg
      ctx.beginPath()
      ctx.arc(sx, sy, coreR, 0, Math.PI * 2)
      ctx.fill()
    }
    drawn++
  }
  ctx.globalCompositeOperation = prev
}

function scaleAlpha(rgba: string, mul: number): string {
  const m = rgba.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/)
  if (!m) return rgba
  const a = Math.max(0, Math.min(1, Number(m[4]) * mul))
  return `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${a.toFixed(3)})`
}

/** Inventory item → carried light kind (torch wins over candle). */
export function carriedLightKind(inv: { type: string | null; count: number }[] | null | undefined): 'torch' | 'candle' | null {
  if (!inv) return null
  let candle = false
  for (let i = 0; i < inv.length; i++) {
    const s = inv[i]
    if (!s.type || s.count <= 0) continue
    if (s.type === 'torch') return 'torch'
    if (s.type === 'candle') candle = true
  }
  return candle ? 'candle' : null
}
