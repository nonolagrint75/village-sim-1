/**
 * Entity sprites for SimulationCanvas — DF Premium–leaning pixel figures.
 * Cloth / skin / fur texture at mid zoom; simple blobs when zoomed out.
 * Does not touch ground/tile painting.
 */
import type { ToolTier } from './types'

export type VillagerSpriteOpts = {
  hue: number
  /** Continuous melanin 0–1. */
  pigmentation: number
  /** Continuous hair darkness 0–1. */
  hairTone: number
  toolTier: ToolTier
  /** Outerwear (cloak / mantle) present. */
  cloak: boolean
  mounted: boolean
  hasCart: boolean
  grudge: boolean
  selected: boolean
}

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

/** Warm skin from pigmentation; slight hue drift for variety. */
export function skinRgb(pigmentation: number, hue: number): string {
  const p = clamp01(pigmentation)
  const warm = ((hue % 360) / 360 - 0.5) * 8
  const r = Math.round(242 - p * 168 + warm)
  const g = Math.round(196 - p * 150 + warm * 0.4)
  const b = Math.round(162 - p * 128 - warm * 0.3)
  return `rgb(${r},${g},${b})`
}

export function hairRgb(hairTone: number, hue: number): string {
  const t = clamp01(hairTone)
  const warm = ((hue % 360) / 360) * 12
  const r = Math.round(210 - t * 185 + warm * 0.4)
  const g = Math.round(170 - t * 155 + warm * 0.15)
  const b = Math.round(110 - t * 95)
  return `rgb(${r},${g},${b})`
}

function clothRgb(hue: number, sat: number, lit: number): string {
  return `hsl(${hue % 360}, ${sat}%, ${lit}%)`
}

/** Soft weave dots on a filled rect (cloth / wool). */
function weave(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  step: number,
) {
  if (step < 1.6 || w < 2 || h < 2) return
  ctx.fillStyle = color
  const s = Math.max(2, Math.floor(step))
  for (let py = y; py < y + h; py += s) {
    for (let px = x + ((py / s) & 1); px < x + w; px += s * 2) {
      ctx.fillRect(px, py, 1, 1)
    }
  }
}

function furDapple(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: string,
  density: number,
) {
  if (rx < 3) return
  ctx.fillStyle = color
  const n = Math.min(14, Math.floor(density * rx))
  for (let i = 0; i < n; i++) {
    const a = (i * 2.4 + density) % (Math.PI * 2)
    const u = ((i * 7) % 10) / 10
    const px = cx + Math.cos(a) * rx * (0.25 + u * 0.55)
    const py = cy + Math.sin(a) * ry * (0.2 + u * 0.5)
    ctx.fillRect(px, py, 1.2, 1.2)
  }
}

export function drawEntityShadow(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  rx: number,
  ry: number,
  enabled: boolean,
) {
  if (!enabled) return
  ctx.fillStyle = 'rgba(0,0,0,0.28)'
  ctx.beginPath()
  ctx.ellipse(sx + rx * 0.15, sy + ry * 0.85, rx, ry * 0.45, 0, 0, Math.PI * 2)
  ctx.fill()
}

export function drawSheepSprite(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  size: number,
  captured: boolean,
  simple: boolean,
  shadows: boolean,
) {
  if (simple) {
    ctx.fillStyle = captured ? '#f0ebe0' : '#d8ceb4'
    ctx.fillRect(sx - 1, sy - 1, 3, 3)
    return
  }
  drawEntityShadow(ctx, sx, sy, size * 0.42, size * 0.28, shadows)
  const wool = captured ? '#f2ece0' : '#ddd4c0'
  const woolDeep = captured ? '#e0d6c4' : '#c4b898'
  const face = captured ? '#e8dcc8' : '#b8a888'
  if (size >= 6) {
    ctx.fillStyle = '#3a3228'
    ctx.fillRect(sx - size * 0.28, sy + size * 0.18, size * 0.1, size * 0.28)
    ctx.fillRect(sx + size * 0.12, sy + size * 0.18, size * 0.1, size * 0.28)
  }
  ctx.fillStyle = woolDeep
  ctx.beginPath()
  ctx.ellipse(sx + size * 0.08, sy + size * 0.04, size * 0.42, size * 0.3, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = wool
  ctx.beginPath()
  ctx.ellipse(sx - size * 0.06, sy - size * 0.02, size * 0.4, size * 0.3, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(sx + size * 0.18, sy - size * 0.1, size * 0.22, size * 0.2, 0, 0, Math.PI * 2)
  ctx.fill()
  furDapple(ctx, sx, sy, size * 0.4, size * 0.28, woolDeep, 1.2)
  ctx.fillStyle = face
  ctx.beginPath()
  ctx.ellipse(sx - size * 0.34, sy - size * 0.06, size * 0.2, size * 0.18, 0, 0, Math.PI * 2)
  ctx.fill()
  if (size >= 7) {
    ctx.fillStyle = wool
    ctx.beginPath()
    ctx.ellipse(sx - size * 0.42, sy - size * 0.22, size * 0.08, size * 0.1, -0.4, 0, Math.PI * 2)
    ctx.ellipse(sx - size * 0.22, sy - size * 0.24, size * 0.08, size * 0.1, 0.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#2a2418'
    ctx.fillRect(sx - size * 0.48, sy - size * 0.08, size * 0.08, size * 0.06)
  }
}

export function drawHorseSprite(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  size: number,
  tamed: boolean,
  simple: boolean,
  shadows: boolean,
) {
  if (simple) {
    ctx.fillStyle = tamed ? '#8a6a45' : '#5e442c'
    ctx.fillRect(sx - 2, sy - 1, 4, 3)
    return
  }
  drawEntityShadow(ctx, sx, sy, size * 0.58, size * 0.28, shadows)
  const coat = tamed ? '#8a6a45' : '#5e442c'
  const shade = tamed ? '#6e5234' : '#3e2c1c'
  const mane = tamed ? '#4a3424' : '#2a1c14'
  if (size >= 6) {
    ctx.fillStyle = shade
    ctx.fillRect(sx - size * 0.42, sy + size * 0.12, size * 0.1, size * 0.38)
    ctx.fillRect(sx - size * 0.12, sy + size * 0.14, size * 0.1, size * 0.36)
    ctx.fillRect(sx + size * 0.18, sy + size * 0.12, size * 0.1, size * 0.38)
    ctx.fillRect(sx + size * 0.42, sy + size * 0.14, size * 0.09, size * 0.34)
  }
  ctx.fillStyle = coat
  ctx.beginPath()
  ctx.ellipse(sx, sy, size * 0.68, size * 0.3, 0, 0, Math.PI * 2)
  ctx.fill()
  furDapple(ctx, sx, sy - size * 0.02, size * 0.55, size * 0.22, shade, 0.9)
  ctx.fillStyle = coat
  ctx.fillRect(sx + size * 0.38, sy - size * 0.48, size * 0.2, size * 0.5)
  ctx.beginPath()
  ctx.ellipse(sx + size * 0.58, sy - size * 0.42, size * 0.22, size * 0.14, 0.15, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = mane
  ctx.fillRect(sx + size * 0.32, sy - size * 0.52, size * 0.1, size * 0.42)
  ctx.fillRect(sx - size * 0.72, sy - size * 0.05, size * 0.22, size * 0.12)
  if (size >= 8) {
    ctx.fillStyle = '#1a1410'
    ctx.fillRect(sx + size * 0.72, sy - size * 0.44, size * 0.1, size * 0.06)
  }
  if (tamed && size >= 7) {
    ctx.fillStyle = '#5a4030'
    ctx.fillRect(sx - size * 0.2, sy - size * 0.08, size * 0.42, size * 0.1)
  }
}

export function drawWolfSprite(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  size: number,
  simple: boolean,
  shadows: boolean,
) {
  if (simple) {
    ctx.fillStyle = '#2a1e28'
    ctx.fillRect(sx - 1, sy - 1, 3, 2)
    return
  }
  drawEntityShadow(ctx, sx, sy, size * 0.48, size * 0.24, shadows)
  const fur = '#3a343c'
  const deep = '#242028'
  const snout = '#1a1418'
  if (size >= 6) {
    ctx.fillStyle = deep
    ctx.fillRect(sx - size * 0.28, sy + size * 0.1, size * 0.09, size * 0.3)
    ctx.fillRect(sx + size * 0.08, sy + size * 0.12, size * 0.09, size * 0.28)
    ctx.fillRect(sx + size * 0.28, sy + size * 0.1, size * 0.08, size * 0.28)
  }
  ctx.fillStyle = fur
  ctx.beginPath()
  ctx.ellipse(sx, sy, size * 0.52, size * 0.26, 0, 0, Math.PI * 2)
  ctx.fill()
  furDapple(ctx, sx, sy, size * 0.42, size * 0.2, deep, 1.1)
  ctx.beginPath()
  ctx.moveTo(sx + size * 0.18, sy - size * 0.18)
  ctx.lineTo(sx + size * 0.32, sy - size * 0.52)
  ctx.lineTo(sx + size * 0.02, sy - size * 0.22)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(sx + size * 0.38, sy - size * 0.14)
  ctx.lineTo(sx + size * 0.52, sy - size * 0.46)
  ctx.lineTo(sx + size * 0.22, sy - size * 0.18)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = fur
  ctx.beginPath()
  ctx.ellipse(sx + size * 0.38, sy - size * 0.06, size * 0.22, size * 0.16, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = snout
  ctx.beginPath()
  ctx.ellipse(sx + size * 0.58, sy - size * 0.02, size * 0.16, size * 0.1, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = deep
  ctx.beginPath()
  ctx.moveTo(sx - size * 0.4, sy)
  ctx.lineTo(sx - size * 0.78, sy - size * 0.12)
  ctx.lineTo(sx - size * 0.42, sy + size * 0.14)
  ctx.closePath()
  ctx.fill()
  if (size >= 8) {
    ctx.fillStyle = '#c8b090'
    ctx.fillRect(sx + size * 0.22, sy - size * 0.1, size * 0.06, size * 0.05)
  }
}

function drawWeapon(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  size: number,
  lift: number,
  toolTier: ToolTier,
) {
  if (toolTier === 'none' || size < 6) return
  const x0 = sx + size * 0.38
  const y0 = sy - size * 0.05 - lift
  const shaft = toolTier === 'iron' ? '#8a9098' : toolTier === 'stone' ? '#9a9488' : '#6a5238'
  const tip = toolTier === 'iron' ? '#c0c8d0' : toolTier === 'stone' ? '#d8d4c8' : '#8a6840'
  ctx.strokeStyle = shaft
  ctx.lineWidth = Math.max(1, size * 0.08)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x0, y0 + size * 0.42)
  ctx.lineTo(x0 + size * 0.08, y0 - size * 0.38)
  ctx.stroke()
  ctx.fillStyle = tip
  if (toolTier === 'wood') {
    ctx.beginPath()
    ctx.moveTo(x0 + size * 0.02, y0 - size * 0.28)
    ctx.lineTo(x0 + size * 0.28, y0 - size * 0.22)
    ctx.lineTo(x0 + size * 0.04, y0 - size * 0.08)
    ctx.closePath()
    ctx.fill()
  } else {
    ctx.beginPath()
    ctx.moveTo(x0 + size * 0.02, y0 - size * 0.42)
    ctx.lineTo(x0 + size * 0.18, y0 - size * 0.28)
    ctx.lineTo(x0 - size * 0.02, y0 - size * 0.22)
    ctx.closePath()
    ctx.fill()
  }
}

export function drawVillagerSprite(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  size: number,
  opts: VillagerSpriteOpts,
  simple: boolean,
  shadows: boolean,
) {
  const { hue, pigmentation, hairTone, toolTier, cloak, mounted, hasCart, grudge, selected } = opts

  if (simple) {
    ctx.fillStyle = clothRgb(hue, 46, 42)
    ctx.fillRect(sx - 1, sy - 2, 3, 4)
    return
  }

  if (!mounted) drawEntityShadow(ctx, sx, sy + size * 0.15, size * 0.38, size * 0.22, shadows)

  if (mounted) {
    if (hasCart) {
      drawEntityShadow(ctx, sx - size * 0.9, sy + size * 0.2, size * 0.4, size * 0.2, shadows)
      ctx.fillStyle = '#6e4a28'
      ctx.fillRect(sx - size * 1.4, sy + size * 0.02, size * 0.75, size * 0.44)
      ctx.fillStyle = '#a88858'
      ctx.fillRect(sx - size * 1.32, sy + size * 0.08, size * 0.58, size * 0.18)
      ctx.fillStyle = '#2a2118'
      ctx.beginPath()
      ctx.arc(sx - size * 1.25, sy + size * 0.52, size * 0.15, 0, Math.PI * 2)
      ctx.arc(sx - size * 0.82, sy + size * 0.52, size * 0.15, 0, Math.PI * 2)
      ctx.fill()
    }
    drawEntityShadow(ctx, sx, sy + size * 0.35, size * 0.62, size * 0.26, shadows)
    ctx.fillStyle = '#8a6a45'
    ctx.beginPath()
    ctx.ellipse(sx, sy + size * 0.22, size * 0.72, size * 0.3, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#6e5234'
    ctx.fillRect(sx + size * 0.48, sy - size * 0.28, size * 0.16, size * 0.42)
  }

  const bodyW = size * 0.62
  const bodyH = size * 0.48
  const lift = mounted ? size * 0.28 : 0
  const tunic = clothRgb(hue, 48, 36)
  const tunicDeep = clothRgb(hue, 42, 26)
  const legs = clothRgb(hue, 38, 22)
  const skin = skinRgb(pigmentation, hue)
  const hair = hairRgb(hairTone, hue)

  if (cloak && size >= 6) {
    const cloakCol = clothRgb((hue + 28) % 360, 36, 28)
    ctx.fillStyle = cloakCol
    ctx.beginPath()
    ctx.moveTo(sx - bodyW * 0.55, sy + size * 0.02 - lift)
    ctx.lineTo(sx - bodyW * 0.85, sy + bodyH * 0.95 - lift)
    ctx.lineTo(sx + bodyW * 0.15, sy + bodyH * 0.88 - lift)
    ctx.lineTo(sx + bodyW * 0.45, sy + size * 0.05 - lift)
    ctx.closePath()
    ctx.fill()
    weave(
      ctx,
      sx - bodyW * 0.7,
      sy + size * 0.08 - lift,
      bodyW * 0.9,
      bodyH * 0.7,
      clothRgb((hue + 28) % 360, 32, 22),
      size * 0.22,
    )
  }

  ctx.fillStyle = legs
  ctx.fillRect(sx - bodyW * 0.42, sy + bodyH * 0.55 - lift, bodyW * 0.32, bodyH * 0.42)
  ctx.fillRect(sx + bodyW * 0.08, sy + bodyH * 0.55 - lift, bodyW * 0.32, bodyH * 0.42)

  ctx.fillStyle = tunic
  ctx.fillRect(sx - bodyW / 2, sy - size * 0.02 - lift, bodyW, bodyH)
  weave(ctx, sx - bodyW / 2, sy - size * 0.02 - lift, bodyW, bodyH, tunicDeep, size * 0.2)
  if (size >= 7) {
    ctx.fillStyle = '#4a3828'
    ctx.fillRect(sx - bodyW * 0.48, sy + bodyH * 0.42 - lift, bodyW * 0.96, Math.max(1, size * 0.06))
  }

  ctx.fillStyle = tunicDeep
  ctx.fillRect(sx - bodyW * 0.72, sy + size * 0.02 - lift, bodyW * 0.22, bodyH * 0.55)
  ctx.fillRect(sx + bodyW * 0.5, sy + size * 0.02 - lift, bodyW * 0.22, bodyH * 0.55)
  ctx.fillStyle = skin
  ctx.fillRect(sx - bodyW * 0.7, sy + bodyH * 0.5 - lift, bodyW * 0.16, size * 0.1)
  ctx.fillRect(sx + bodyW * 0.54, sy + bodyH * 0.5 - lift, bodyW * 0.16, size * 0.1)

  drawWeapon(ctx, sx, sy, size, lift, toolTier)

  const hx = sx
  const hy = sy - size * 0.26 - lift
  const hr = size * 0.24
  ctx.fillStyle = skin
  ctx.beginPath()
  ctx.arc(hx, hy, hr, 0, Math.PI * 2)
  ctx.fill()
  if (size >= 6) {
    ctx.fillStyle = hair
    ctx.beginPath()
    ctx.ellipse(hx, hy - hr * 0.35, hr * 0.95, hr * 0.7, 0, Math.PI, Math.PI * 2)
    ctx.fill()
    ctx.fillRect(hx - hr * 0.95, hy - hr * 0.15, hr * 1.9, hr * 0.35)
  }

  if (toolTier !== 'none' && size < 6) {
    ctx.strokeStyle = toolTier === 'iron' ? '#c87840' : toolTier === 'stone' ? '#d8d4c8' : '#2a2118'
    ctx.lineWidth = Math.max(0.7, size * 0.09)
    ctx.strokeRect(sx - bodyW / 2, sy - size * 0.02 - lift, bodyW, bodyH)
  }

  if (grudge) {
    ctx.fillStyle = '#c43834'
    ctx.beginPath()
    ctx.arc(sx + size * 0.38, sy - size * 0.5 - lift, size * 0.13, 0, Math.PI * 2)
    ctx.fill()
  }
  if (selected) {
    ctx.strokeStyle = '#e8d078'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(sx, sy - lift * 0.3, size * 0.88, 0, Math.PI * 2)
    ctx.stroke()
  }
}

export function drawEmbarkedVillagerSprite(
  ctx: CanvasRenderingContext2D,
  bx: number,
  by: number,
  bs: number,
  opts: Pick<VillagerSpriteOpts, 'hue' | 'pigmentation' | 'hairTone' | 'selected'>,
  simple: boolean,
) {
  if (simple) {
    ctx.fillStyle = clothRgb(opts.hue, 50, 48)
    ctx.fillRect(bx - 1, by - bs * 0.35, 2, 2)
    return
  }
  const skin = skinRgb(opts.pigmentation, opts.hue)
  const hair = hairRgb(opts.hairTone, opts.hue)
  ctx.fillStyle = clothRgb(opts.hue, 48, 40)
  ctx.fillRect(bx - bs * 0.12, by - bs * 0.42, bs * 0.24, bs * 0.28)
  ctx.fillStyle = skin
  ctx.beginPath()
  ctx.arc(bx, by - bs * 0.5, bs * 0.14, 0, Math.PI * 2)
  ctx.fill()
  if (bs >= 5) {
    ctx.fillStyle = hair
    ctx.beginPath()
    ctx.ellipse(bx, by - bs * 0.56, bs * 0.13, bs * 0.08, 0, Math.PI, Math.PI * 2)
    ctx.fill()
  }
  if (opts.selected) {
    ctx.strokeStyle = '#e8d078'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.arc(bx, by - bs * 0.2, bs * 0.55, 0, Math.PI * 2)
    ctx.stroke()
  }
}
