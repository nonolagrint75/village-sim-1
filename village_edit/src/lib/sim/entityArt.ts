/**
 * Entity sprites for SimulationCanvas — DF Premium–leaning pixel figures.
 * Base body preserved; worn gear layers over body (cloak/fur, tunic/armor,
 * hat/helm, boots, weapon, shield, bag). Simple blobs when zoomed out.
 */
import {
  APPEARANCE_CHILD_AGE,
  agedHairTone,
  type BiologicalSex,
  type HairStyle,
} from './appearance'
import { emptyWornGearVisual, type GearId, type WornGearVisual } from './equipment'
import type { ToolTier } from './types'

export type VillagerGearSprites = WornGearVisual

export type VillagerSpriteOpts = {
  hue: number
  pigmentation: number
  hairTone: number
  sex?: BiologicalSex
  age?: number
  hairStyle?: HairStyle
  beard?: boolean
  facialHair?: number
  hairCurl?: number
  toolTier: ToolTier
  cloak: boolean
  /** Worn equipment for layered gear sprites. */
  gear?: WornGearVisual | null
  mounted: boolean
  hasCart: boolean
  grudge: boolean
  selected: boolean
}

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

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

/** Ragged medieval brigand — distinct from villagers (dark cloak, no bright hue). */
export function drawBanditSprite(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  size: number,
  phase: 'camp' | 'raid' | 'flee',
  simple: boolean,
  shadows: boolean,
) {
  if (simple) {
    ctx.fillStyle = phase === 'raid' ? '#5a2820' : '#3a3430'
    ctx.fillRect(sx - 1, sy - 2, 3, 4)
    return
  }
  drawEntityShadow(ctx, sx, sy, size * 0.38, size * 0.18, shadows)
  const cloak = phase === 'raid' ? '#4a3028' : '#35302c'
  const tunic = '#2a2420'
  const skin = '#8a6a52'
  // Legs
  ctx.fillStyle = tunic
  ctx.fillRect(sx - size * 0.16, sy + size * 0.05, size * 0.12, size * 0.32)
  ctx.fillRect(sx + size * 0.04, sy + size * 0.05, size * 0.12, size * 0.32)
  // Body / cloak
  ctx.fillStyle = cloak
  ctx.beginPath()
  ctx.moveTo(sx - size * 0.28, sy + size * 0.08)
  ctx.lineTo(sx - size * 0.22, sy - size * 0.28)
  ctx.lineTo(sx + size * 0.22, sy - size * 0.28)
  ctx.lineTo(sx + size * 0.32, sy + size * 0.1)
  ctx.closePath()
  ctx.fill()
  // Head
  ctx.fillStyle = skin
  ctx.beginPath()
  ctx.ellipse(sx, sy - size * 0.38, size * 0.16, size * 0.18, 0, 0, Math.PI * 2)
  ctx.fill()
  // Hood / hair
  ctx.fillStyle = '#1a1614'
  ctx.beginPath()
  ctx.ellipse(sx, sy - size * 0.46, size * 0.18, size * 0.12, 0, Math.PI, Math.PI * 2)
  ctx.fill()
  // Staff / short blade when raiding
  if (phase === 'raid' && size >= 6) {
    ctx.fillStyle = '#5a4030'
    ctx.fillRect(sx + size * 0.22, sy - size * 0.35, size * 0.06, size * 0.55)
    ctx.fillStyle = '#6a6a70'
    ctx.fillRect(sx + size * 0.2, sy - size * 0.4, size * 0.1, size * 0.1)
  }
}

function mailWeave(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  step: number,
) {
  if (step < 1.8 || w < 2 || h < 2) return
  ctx.fillStyle = 'rgba(200, 210, 220, 0.35)'
  const s = Math.max(2, Math.floor(step))
  for (let py = y; py < y + h; py += s) {
    for (let px = x + ((py / s) & 1) * (s / 2); px < x + w; px += s) {
      ctx.fillRect(px, py, 1.1, 1.1)
    }
  }
}

function torsoColors(id: GearId | null | undefined, hue: number): { fill: string; deep: string; mail: boolean } {
  switch (id) {
    case 'iron_mail':
      return { fill: '#6a737c', deep: '#3e464e', mail: true }
    case 'leather_jerkin':
      return { fill: '#6a4a30', deep: '#3e2a18', mail: false }
    case 'wool_tunic':
      return { fill: clothRgb((hue + 12) % 360, 42, 32), deep: clothRgb((hue + 12) % 360, 38, 22), mail: false }
    case 'linen_tunic':
      return { fill: clothRgb((hue + 40) % 360, 28, 52), deep: clothRgb((hue + 40) % 360, 22, 38), mail: false }
    case 'cloth_tunic':
      return { fill: clothRgb(hue, 36, 44), deep: clothRgb(hue, 32, 30), mail: false }
    default:
      return { fill: clothRgb(hue, 48, 36), deep: clothRgb(hue, 42, 26), mail: false }
  }
}

function drawCloakLayer(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  bodyW: number,
  bodyH: number,
  size: number,
  lift: number,
  hue: number,
  outer: GearId | null | undefined,
  cloakFallback: boolean,
) {
  if (size < 6) return
  const id = outer ?? (cloakFallback ? 'wool_cloak' : null)
  if (!id) return
  const fur = id === 'fur_mantle'
  const col = fur ? '#5a3e28' : clothRgb((hue + 28) % 360, 36, 28)
  const deep = fur ? '#3a2818' : clothRgb((hue + 28) % 360, 32, 22)
  ctx.fillStyle = col
  ctx.beginPath()
  ctx.moveTo(sx - bodyW * 0.55, sy + size * 0.02 - lift)
  ctx.lineTo(sx - bodyW * 0.88, sy + bodyH * 1.05 - lift)
  ctx.lineTo(sx + bodyW * 0.2, sy + bodyH * 0.98 - lift)
  ctx.lineTo(sx + bodyW * 0.48, sy + size * 0.05 - lift)
  ctx.closePath()
  ctx.fill()
  if (fur) {
    furDapple(ctx, sx - bodyW * 0.15, sy + bodyH * 0.45 - lift, bodyW * 0.55, bodyH * 0.5, deep, 1.4)
    ctx.fillStyle = '#c8b090'
    ctx.fillRect(sx - bodyW * 0.08, sy + size * 0.04 - lift, bodyW * 0.22, Math.max(1, size * 0.06))
  } else {
    weave(ctx, sx - bodyW * 0.7, sy + size * 0.08 - lift, bodyW * 0.95, bodyH * 0.75, deep, size * 0.22)
  }
}

function drawBoots(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  bodyW: number,
  bodyH: number,
  size: number,
  lift: number,
  feet: GearId | null | undefined,
) {
  if (!feet || size < 5.5) return
  const tall = feet === 'leather_boots'
  const col = '#3a2818'
  const cuff = '#5a4030'
  const h = tall ? bodyH * 0.28 : bodyH * 0.16
  const y0 = sy + bodyH * 0.88 - lift
  ctx.fillStyle = col
  ctx.fillRect(sx - bodyW * 0.42, y0, bodyW * 0.32, h)
  ctx.fillRect(sx + bodyW * 0.08, y0, bodyW * 0.32, h)
  if (tall && size >= 7) {
    ctx.fillStyle = cuff
    ctx.fillRect(sx - bodyW * 0.42, y0, bodyW * 0.32, Math.max(1, size * 0.05))
    ctx.fillRect(sx + bodyW * 0.08, y0, bodyW * 0.32, Math.max(1, size * 0.05))
  }
}

function drawShield(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  size: number,
  lift: number,
  offHand: GearId | null | undefined,
) {
  if (offHand !== 'wooden_shield' || size < 6) return
  const x = sx - size * 0.52
  const y = sy + size * 0.08 - lift
  ctx.fillStyle = '#6a4828'
  ctx.beginPath()
  ctx.ellipse(x, y, size * 0.22, size * 0.28, -0.15, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#8a6840'
  ctx.beginPath()
  ctx.ellipse(x, y, size * 0.14, size * 0.18, -0.15, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#c0a060'
  ctx.beginPath()
  ctx.arc(x, y, size * 0.05, 0, Math.PI * 2)
  ctx.fill()
}

function drawBag(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  size: number,
  lift: number,
  belt: GearId | null | undefined,
  offHand: GearId | null | undefined,
) {
  if (size < 6) return
  if (belt === 'leather_satchel' || belt === 'coin_purse') {
    const x = sx - size * 0.48
    const y = sy + size * 0.28 - lift
    ctx.fillStyle = belt === 'leather_satchel' ? '#5a3c24' : '#4a3420'
    ctx.fillRect(x, y, size * 0.28, size * 0.22)
    ctx.fillStyle = '#3a2818'
    ctx.fillRect(x + size * 0.04, y - size * 0.04, size * 0.2, Math.max(1, size * 0.05))
    if (belt === 'leather_satchel' && size >= 7) {
      ctx.fillStyle = '#8a6848'
      ctx.fillRect(x + size * 0.08, y + size * 0.06, size * 0.12, size * 0.08)
    }
  }
  if (offHand === 'wicker_basket') {
    const x = sx - size * 0.58
    const y = sy + size * 0.18 - lift
    ctx.fillStyle = '#c4a060'
    ctx.fillRect(x, y, size * 0.26, size * 0.22)
    ctx.fillStyle = '#8a6840'
    ctx.fillRect(x + size * 0.02, y + size * 0.04, size * 0.22, Math.max(1, size * 0.04))
    ctx.fillRect(x + size * 0.02, y + size * 0.12, size * 0.22, Math.max(1, size * 0.04))
  }
}

function drawHeadgear(
  ctx: CanvasRenderingContext2D,
  hx: number,
  hy: number,
  hr: number,
  size: number,
  head: GearId | null | undefined,
  hue: number,
) {
  if (!head || size < 6) return
  if (head === 'iron_helm') {
    ctx.fillStyle = '#7a848c'
    ctx.beginPath()
    ctx.ellipse(hx, hy - hr * 0.15, hr * 1.05, hr * 0.85, 0, Math.PI, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#9aa4ac'
    ctx.fillRect(hx - hr * 0.95, hy - hr * 0.05, hr * 1.9, hr * 0.35)
    ctx.fillStyle = '#2a3038'
    ctx.fillRect(hx - hr * 0.55, hy + hr * 0.05, hr * 1.1, Math.max(1, size * 0.05))
    return
  }
  if (head === 'leather_cap') {
    ctx.fillStyle = '#5a3c24'
    ctx.beginPath()
    ctx.ellipse(hx, hy - hr * 0.25, hr * 0.98, hr * 0.65, 0, Math.PI, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#3e2a18'
    ctx.fillRect(hx - hr * 0.9, hy - hr * 0.05, hr * 1.8, hr * 0.22)
    return
  }
  if (head === 'wool_hood') {
    const col = clothRgb((hue + 18) % 360, 34, 30)
    ctx.fillStyle = col
    ctx.beginPath()
    ctx.moveTo(hx - hr * 1.15, hy + hr * 0.35)
    ctx.quadraticCurveTo(hx - hr * 1.2, hy - hr * 1.1, hx, hy - hr * 1.25)
    ctx.quadraticCurveTo(hx + hr * 1.2, hy - hr * 1.1, hx + hr * 1.15, hy + hr * 0.35)
    ctx.lineTo(hx + hr * 0.55, hy + hr * 0.55)
    ctx.quadraticCurveTo(hx, hy + hr * 0.15, hx - hr * 0.55, hy + hr * 0.55)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = clothRgb((hue + 18) % 360, 30, 22)
    ctx.beginPath()
    ctx.ellipse(hx, hy + hr * 0.05, hr * 0.72, hr * 0.55, 0, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawWeaponTier(
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

function drawGearWeapon(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  size: number,
  lift: number,
  mainHand: GearId | null | undefined,
  toolTier: ToolTier,
) {
  if (size < 6) return
  const x0 = sx + size * 0.38
  const y0 = sy - size * 0.05 - lift
  const id = mainHand
  if (!id && toolTier === 'none') return

  if (id === 'iron_sword' || id === 'iron_dagger') {
    const short = id === 'iron_dagger'
    ctx.strokeStyle = '#8a9098'
    ctx.lineWidth = Math.max(1, size * (short ? 0.07 : 0.09))
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(x0, y0 + size * 0.2)
    ctx.lineTo(x0 + size * 0.06, y0 - size * (short ? 0.22 : 0.42))
    ctx.stroke()
    ctx.fillStyle = '#c8d0d8'
    ctx.beginPath()
    ctx.moveTo(x0 + size * 0.04, y0 - size * (short ? 0.18 : 0.38))
    ctx.lineTo(x0 + size * 0.16, y0 - size * (short ? 0.08 : 0.22))
    ctx.lineTo(x0 - size * 0.02, y0 - size * (short ? 0.02 : 0.12))
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#5a4030'
    ctx.fillRect(x0 - size * 0.04, y0 + size * 0.08, size * 0.14, Math.max(1, size * 0.06))
    return
  }
  if (id === 'wood_axe') {
    ctx.strokeStyle = '#6a5238'
    ctx.lineWidth = Math.max(1, size * 0.09)
    ctx.beginPath()
    ctx.moveTo(x0, y0 + size * 0.35)
    ctx.lineTo(x0 + size * 0.05, y0 - size * 0.28)
    ctx.stroke()
    ctx.fillStyle = '#8a9098'
    ctx.beginPath()
    ctx.moveTo(x0 + size * 0.02, y0 - size * 0.22)
    ctx.lineTo(x0 + size * 0.32, y0 - size * 0.18)
    ctx.lineTo(x0 + size * 0.28, y0 - size * 0.02)
    ctx.lineTo(x0, y0 - size * 0.08)
    ctx.closePath()
    ctx.fill()
    return
  }
  if (id === 'wooden_staff') {
    ctx.strokeStyle = '#6a5238'
    ctx.lineWidth = Math.max(1.2, size * 0.1)
    ctx.beginPath()
    ctx.moveTo(x0, y0 + size * 0.48)
    ctx.lineTo(x0 + size * 0.04, y0 - size * 0.48)
    ctx.stroke()
    return
  }
  if (id === 'wooden_spear' || id === 'stone_spear') {
    const tip = id === 'stone_spear' ? '#d8d4c8' : '#8a6840'
    ctx.strokeStyle = '#6a5238'
    ctx.lineWidth = Math.max(1, size * 0.07)
    ctx.beginPath()
    ctx.moveTo(x0, y0 + size * 0.45)
    ctx.lineTo(x0 + size * 0.08, y0 - size * 0.48)
    ctx.stroke()
    ctx.fillStyle = tip
    ctx.beginPath()
    ctx.moveTo(x0 + size * 0.06, y0 - size * 0.5)
    ctx.lineTo(x0 + size * 0.18, y0 - size * 0.32)
    ctx.lineTo(x0 - size * 0.02, y0 - size * 0.28)
    ctx.closePath()
    ctx.fill()
    return
  }
  drawWeaponTier(ctx, sx, sy, size, lift, toolTier)
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
  const {
    hue,
    pigmentation,
    hairTone,
    toolTier,
    cloak,
    mounted,
    hasCart,
    grudge,
    selected,
    sex,
    age = 400,
    hairStyle = 'short',
    beard = false,
    facialHair = 0.4,
  } = opts
  const gear = opts.gear ?? emptyWornGearVisual()
  const child = age < APPEARANCE_CHILD_AGE
  const female = sex === 'female'

  if (simple) {
    const tc = torsoColors(gear.torso, hue)
    ctx.fillStyle = gear.outer ? (gear.outer === 'fur_mantle' ? '#5a3e28' : tc.fill) : tc.fill
    ctx.fillRect(sx - 1, sy - 2, 3, 4)
    if (gear.head === 'iron_helm') {
      ctx.fillStyle = '#8a9098'
      ctx.fillRect(sx - 1, sy - 3, 3, 1)
    }
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

  const scale = child ? 0.7 : 1
  const s = size * scale
  // Sex silhouette: broader male shoulders; female narrower shoulders / wider hips.
  const shoulderW = s * (female ? 0.52 : 0.68)
  const hipW = s * (female ? 0.64 : 0.54)
  const bodyW = Math.max(shoulderW, hipW)
  const bodyH = s * (female ? 0.46 : 0.5)
  const lift = mounted ? size * 0.28 : 0
  const torsoTop = sy - s * 0.02 - lift
  const tc = torsoColors(gear.torso, hue)
  const legs = clothRgb(hue, 38, 22)
  const skin = skinRgb(pigmentation, hue)
  const tone = agedHairTone(hairTone, age)
  const hair = hairRgb(tone, hue)
  const hairDeep = hairRgb(clamp01(tone + 0.18), hue)
  const curl = opts.hairCurl ?? 0.45

  drawCloakLayer(ctx, sx, sy, bodyW, bodyH, s, lift, hue, gear.outer, cloak)

  const legW = s * (female ? 0.16 : 0.18)
  ctx.fillStyle = legs
  ctx.fillRect(sx - hipW * 0.42, torsoTop + bodyH * 0.58, legW, bodyH * 0.48)
  ctx.fillRect(sx + hipW * 0.18, torsoTop + bodyH * 0.58, legW, bodyH * 0.48)
  drawBoots(ctx, sx, sy, hipW, bodyH, s, lift, gear.feet)

  ctx.fillStyle = tc.fill
  ctx.beginPath()
  ctx.moveTo(sx - shoulderW / 2, torsoTop)
  ctx.lineTo(sx + shoulderW / 2, torsoTop)
  ctx.lineTo(sx + hipW / 2, torsoTop + bodyH)
  ctx.lineTo(sx - hipW / 2, torsoTop + bodyH)
  ctx.closePath()
  ctx.fill()
  if (tc.mail) mailWeave(ctx, sx - bodyW / 2, torsoTop, bodyW, bodyH, s * 0.16)
  else weave(ctx, sx - bodyW / 2, torsoTop, bodyW, bodyH, tc.deep, s * 0.2)
  if (s >= 7) {
    ctx.fillStyle = gear.torso === 'iron_mail' ? '#4a5058' : '#4a3828'
    ctx.fillRect(sx - hipW * 0.48, torsoTop + bodyH * 0.42, hipW * 0.96, Math.max(1, s * 0.06))
  }

  const armW = s * 0.12
  ctx.fillStyle = tc.deep
  ctx.fillRect(sx - shoulderW * 0.72, torsoTop + s * 0.04, armW, bodyH * 0.55)
  ctx.fillRect(sx + shoulderW * 0.52, torsoTop + s * 0.04, armW, bodyH * 0.55)
  ctx.fillStyle = skin
  ctx.fillRect(sx - shoulderW * 0.7, torsoTop + bodyH * 0.52, armW * 0.85, s * 0.1)
  ctx.fillRect(sx + shoulderW * 0.54, torsoTop + bodyH * 0.52, armW * 0.85, s * 0.1)

  drawShield(ctx, sx, sy, s, lift, gear.offHand)
  drawBag(ctx, sx, sy, s, lift, gear.belt, gear.offHand)
  drawGearWeapon(ctx, sx, sy, s, lift, gear.mainHand, toolTier)

  const hx = sx
  const hy = sy - s * 0.28 - lift
  const hr = s * (female ? 0.22 : 0.24)
  ctx.fillStyle = skin
  ctx.beginPath()
  ctx.arc(hx, hy, hr, 0, Math.PI * 2)
  ctx.fill()

  if (s >= 5) {
    const style = hairStyle ?? (female ? 'shoulder' : 'short')
    // Long hair behind, then face plate, then fringe / short styles.
    if (style === 'long' || style === 'shoulder') {
      ctx.fillStyle = hairDeep
      const len = style === 'long' ? hr * 1.55 : hr * 1.1
      ctx.fillRect(hx - hr * 1.2, hy - hr * 0.05, hr * 0.45, len)
      ctx.fillRect(hx + hr * 0.75, hy - hr * 0.05, hr * 0.45, len)
      ctx.fillStyle = hair
      ctx.fillRect(hx - hr * 1.12, hy + hr * 0.55, hr * 0.38, len * 0.65)
      ctx.fillRect(hx + hr * 0.74, hy + hr * 0.55, hr * 0.38, len * 0.65)
      ctx.fillStyle = skin
      ctx.beginPath()
      ctx.arc(hx, hy, hr * 0.92, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = hair
    if (style === 'cropped') {
      ctx.beginPath()
      ctx.ellipse(hx, hy - hr * 0.42, hr * 0.88, hr * 0.48, 0, Math.PI, Math.PI * 2)
      ctx.fill()
      ctx.fillRect(hx - hr * 0.72, hy - hr * 0.2, hr * 1.44, hr * 0.28)
    } else {
      const fringe = 0.55 + clamp01(curl) * 0.25
      ctx.beginPath()
      ctx.ellipse(hx, hy - hr * 0.32, hr * 0.98, hr * (style === 'short' ? 0.68 : 0.78), 0, Math.PI, Math.PI * 2)
      ctx.fill()
      ctx.fillRect(hx - hr * 0.98, hy - hr * 0.12, hr * 1.96, hr * 0.38 * fringe)
      if (style === 'short') {
        ctx.fillStyle = hairDeep
        ctx.fillRect(hx - hr * 1.02, hy - hr * 0.05, hr * 0.26, hr * 0.5)
        ctx.fillRect(hx + hr * 0.76, hy - hr * 0.05, hr * 0.26, hr * 0.5)
      }
    }
    if (beard && !child) {
      const fullness = clamp01(facialHair)
      ctx.fillStyle = hair
      ctx.beginPath()
      ctx.ellipse(hx, hy + hr * 0.55, hr * (0.55 + fullness * 0.35), hr * (0.42 + fullness * 0.35), 0, 0, Math.PI)
      ctx.fill()
      if (fullness > 0.45) {
        ctx.fillStyle = hairDeep
        ctx.fillRect(hx - hr * 0.72, hy + hr * 0.15, hr * 0.28, hr * 0.55)
        ctx.fillRect(hx + hr * 0.44, hy + hr * 0.15, hr * 0.28, hr * 0.55)
      }
      if (fullness > 0.68 && s >= 7) {
        ctx.fillStyle = hair
        ctx.fillRect(hx - hr * 0.35, hy + hr * 0.85, hr * 0.7, hr * 0.45)
      }
      if (fullness > 0.38 && s >= 7) {
        ctx.fillStyle = hairDeep
        ctx.fillRect(hx - hr * 0.42, hy + hr * 0.22, hr * 0.84, Math.max(1, hr * 0.18))
      }
    }
  }

  drawHeadgear(ctx, hx, hy, hr, s, gear.head, hue)

  if ((gear.mainHand || toolTier !== 'none') && s < 6) {
    ctx.strokeStyle = gear.torso === 'iron_mail' ? '#a0a8b0' : toolTier === 'iron' ? '#c87840' : '#2a2118'
    ctx.lineWidth = Math.max(0.7, s * 0.09)
    ctx.strokeRect(sx - shoulderW / 2, torsoTop, shoulderW, bodyH)
  }

  if (grudge) {
    ctx.fillStyle = '#c43834'
    ctx.beginPath()
    ctx.arc(sx + s * 0.38, sy - s * 0.5 - lift, s * 0.13, 0, Math.PI * 2)
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
  opts: Pick<
    VillagerSpriteOpts,
    | 'hue'
    | 'pigmentation'
    | 'hairTone'
    | 'sex'
    | 'age'
    | 'hairStyle'
    | 'beard'
    | 'facialHair'
    | 'hairCurl'
    | 'selected'
  >,
  simple: boolean,
) {
  if (simple) {
    ctx.fillStyle = clothRgb(opts.hue, 50, 48)
    ctx.fillRect(bx - 1, by - bs * 0.35, 2, 2)
    return
  }
  const female = opts.sex === 'female'
  const age = opts.age ?? 400
  const skin = skinRgb(opts.pigmentation, opts.hue)
  const tone = agedHairTone(opts.hairTone, age)
  const hair = hairRgb(tone, opts.hue)
  const hairDeep = hairRgb(clamp01(tone + 0.18), opts.hue)
  const bw = bs * (female ? 0.2 : 0.24)
  ctx.fillStyle = clothRgb(opts.hue, 48, 40)
  ctx.fillRect(bx - bw / 2, by - bs * 0.42, bw, bs * 0.28)
  ctx.fillStyle = skin
  const hr = bs * (female ? 0.12 : 0.14)
  const hx = bx
  const hy = by - bs * 0.5
  ctx.beginPath()
  ctx.arc(hx, hy, hr, 0, Math.PI * 2)
  ctx.fill()
  if (bs >= 5) {
    const style = opts.hairStyle ?? (female ? 'shoulder' : 'short')
    ctx.fillStyle = hair
    if (style === 'cropped') {
      ctx.beginPath()
      ctx.ellipse(hx, hy - hr * 0.4, hr * 0.9, hr * 0.45, 0, Math.PI, Math.PI * 2)
      ctx.fill()
    } else {
      ctx.beginPath()
      ctx.ellipse(hx, hy - hr * 0.35, hr * 0.95, hr * 0.65, 0, Math.PI, Math.PI * 2)
      ctx.fill()
      if (style === 'shoulder' || style === 'long') {
        ctx.fillStyle = hairDeep
        ctx.fillRect(hx - hr * 1.05, hy, hr * 0.35, hr * (style === 'long' ? 1.0 : 0.7))
        ctx.fillRect(hx + hr * 0.7, hy, hr * 0.35, hr * (style === 'long' ? 1.0 : 0.7))
      }
    }
    if (opts.beard) {
      const fullness = clamp01(opts.facialHair ?? 0.5)
      ctx.fillStyle = hair
      ctx.beginPath()
      ctx.ellipse(hx, hy + hr * 0.5, hr * (0.5 + fullness * 0.3), hr * 0.4, 0, 0, Math.PI)
      ctx.fill()
    }
  }
  if (opts.selected) {
    ctx.strokeStyle = '#e8d078'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.arc(bx, by - bs * 0.2, bs * 0.55, 0, Math.PI * 2)
    ctx.stroke()
  }
}
