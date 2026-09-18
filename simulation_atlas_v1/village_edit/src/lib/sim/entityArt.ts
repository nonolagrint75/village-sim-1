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
  /** Profession tint when no torso gear (map-readable jobs). */
  profession?: string | null
  /** Active task for held-tool cue. */
  taskKind?: string | null
  /** Work progress 0..1 (activity_tools §20). */
  workProgress?: number
  /** Work family for arc color / tool shape. */
  workFamily?: string | null
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
  const s = Math.max(3, size)
  // Shadow
  if (shadows) {
    ctx.fillStyle = 'rgba(0,0,0,0.28)'
    ctx.fillRect(sx - s * 0.38, sy + s * 0.28, s * 0.76, s * 0.14)
  }
  const wool = captured ? '#f2ece0' : '#ddd4c0'
  const woolDeep = captured ? '#d8cebc' : '#b8ae98'
  const face = captured ? '#e0d4c0' : '#a89878'
  // Legs
  ctx.fillStyle = '#3a3228'
  ctx.fillRect(sx - s * 0.28, sy + s * 0.16, Math.max(2, s * 0.1), s * 0.28)
  ctx.fillRect(sx + s * 0.14, sy + s * 0.16, Math.max(2, s * 0.1), s * 0.28)
  // Body (blocky wool — DF/RW readable)
  ctx.fillStyle = woolDeep
  ctx.fillRect(sx - s * 0.36, sy - s * 0.08, s * 0.78, s * 0.42)
  ctx.fillStyle = wool
  ctx.fillRect(sx - s * 0.32, sy - s * 0.14, s * 0.7, s * 0.36)
  // Head tufts
  ctx.fillStyle = wool
  ctx.fillRect(sx - s * 0.42, sy - s * 0.18, s * 0.22, s * 0.22)
  ctx.fillRect(sx - s * 0.18, sy - s * 0.22, s * 0.18, s * 0.16)
  // Face
  ctx.fillStyle = face
  ctx.fillRect(sx - s * 0.48, sy - s * 0.1, s * 0.22, s * 0.2)
  // Ear + eye
  if (s >= 5) {
    ctx.fillStyle = wool
    ctx.fillRect(sx - s * 0.5, sy - s * 0.22, s * 0.08, s * 0.1)
    ctx.fillStyle = '#2a2418'
    ctx.fillRect(sx - s * 0.46, sy - s * 0.06, Math.max(1, s * 0.06), Math.max(1, s * 0.06))
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
  const s = Math.max(3.5, size)
  if (shadows) {
    ctx.fillStyle = 'rgba(0,0,0,0.28)'
    ctx.fillRect(sx - s * 0.55, sy + s * 0.28, s * 1.1, s * 0.14)
  }
  const coat = tamed ? '#8a6a45' : '#5e442c'
  const shade = tamed ? '#6e5234' : '#3e2c1c'
  const mane = tamed ? '#4a3424' : '#2a1c14'
  // Legs
  ctx.fillStyle = shade
  ctx.fillRect(sx - s * 0.4, sy + s * 0.1, Math.max(2, s * 0.1), s * 0.36)
  ctx.fillRect(sx - s * 0.12, sy + s * 0.12, Math.max(2, s * 0.1), s * 0.34)
  ctx.fillRect(sx + s * 0.16, sy + s * 0.1, Math.max(2, s * 0.1), s * 0.36)
  ctx.fillRect(sx + s * 0.4, sy + s * 0.12, Math.max(2, s * 0.09), s * 0.32)
  // Body
  ctx.fillStyle = coat
  ctx.fillRect(sx - s * 0.52, sy - s * 0.12, s * 1.05, s * 0.4)
  ctx.fillStyle = shade
  ctx.fillRect(sx - s * 0.48, sy + s * 0.14, s * 0.95, Math.max(1, s * 0.08))
  // Neck + head
  ctx.fillStyle = coat
  ctx.fillRect(sx + s * 0.36, sy - s * 0.48, s * 0.18, s * 0.48)
  ctx.fillRect(sx + s * 0.48, sy - s * 0.52, s * 0.28, s * 0.2)
  // Mane + tail
  ctx.fillStyle = mane
  ctx.fillRect(sx + s * 0.3, sy - s * 0.5, s * 0.1, s * 0.4)
  ctx.fillRect(sx - s * 0.68, sy - s * 0.02, s * 0.2, s * 0.12)
  // Snout
  if (s >= 6) {
    ctx.fillStyle = '#1a1410'
    ctx.fillRect(sx + s * 0.7, sy - s * 0.46, s * 0.1, s * 0.08)
  }
  // Saddle if tamed
  if (tamed && s >= 5) {
    ctx.fillStyle = '#5a4030'
    ctx.fillRect(sx - s * 0.18, sy - s * 0.1, s * 0.4, s * 0.12)
    ctx.fillStyle = '#3a2818'
    ctx.fillRect(sx - s * 0.14, sy - s * 0.02, s * 0.32, Math.max(1, s * 0.05))
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
  const s = Math.max(3, size)
  if (shadows) {
    ctx.fillStyle = 'rgba(0,0,0,0.28)'
    ctx.fillRect(sx - s * 0.42, sy + s * 0.24, s * 0.84, s * 0.12)
  }
  const fur = '#3a343c'
  const deep = '#242028'
  // Legs
  ctx.fillStyle = deep
  ctx.fillRect(sx - s * 0.28, sy + s * 0.08, Math.max(2, s * 0.09), s * 0.28)
  ctx.fillRect(sx + s * 0.06, sy + s * 0.1, Math.max(2, s * 0.09), s * 0.26)
  ctx.fillRect(sx + s * 0.26, sy + s * 0.08, Math.max(2, s * 0.08), s * 0.26)
  // Body
  ctx.fillStyle = fur
  ctx.fillRect(sx - s * 0.4, sy - s * 0.1, s * 0.82, s * 0.34)
  ctx.fillStyle = deep
  ctx.fillRect(sx - s * 0.36, sy + s * 0.12, s * 0.72, Math.max(1, s * 0.06))
  // Ears (pointed blocks)
  ctx.fillStyle = fur
  ctx.fillRect(sx + s * 0.18, sy - s * 0.42, s * 0.12, s * 0.28)
  ctx.fillRect(sx + s * 0.36, sy - s * 0.38, s * 0.1, s * 0.24)
  ctx.fillStyle = deep
  ctx.fillRect(sx + s * 0.2, sy - s * 0.4, s * 0.06, s * 0.12)
  // Head + snout
  ctx.fillStyle = fur
  ctx.fillRect(sx + s * 0.28, sy - s * 0.16, s * 0.32, s * 0.22)
  ctx.fillStyle = '#1a1418'
  ctx.fillRect(sx + s * 0.52, sy - s * 0.1, s * 0.18, s * 0.12)
  // Tail
  ctx.fillStyle = deep
  ctx.fillRect(sx - s * 0.58, sy - s * 0.04, s * 0.22, s * 0.1)
  // Eye
  if (s >= 6) {
    ctx.fillStyle = '#c8b090'
    ctx.fillRect(sx + s * 0.34, sy - s * 0.1, Math.max(1, s * 0.06), Math.max(1, s * 0.05))
  }
}

/**
 * Sacred site marker — autel (stone slab) → chapelle (small roof) → temple (larger facade).
 * Drawn on top of the world map at village shrine coords.
 */
export function drawSacredSite(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  size: number,
  tier: 'shrine' | 'chapel' | 'temple',
  simple: boolean,
  shadows: boolean,
) {
  const s = Math.max(3, size * (tier === 'temple' ? 1.35 : tier === 'chapel' ? 1.1 : 0.85))
  if (simple) {
    ctx.fillStyle = tier === 'temple' ? '#c4b896' : tier === 'chapel' ? '#b0a888' : '#9a9080'
    ctx.fillRect(sx - 2, sy - 3, 4, 5)
    return
  }
  drawEntityShadow(ctx, sx, sy + s * 0.15, s * 0.55, s * 0.22, shadows)
  if (tier === 'shrine') {
    // Low stone altar + upright slab
    ctx.fillStyle = '#8a8478'
    ctx.fillRect(sx - s * 0.45, sy - s * 0.05, s * 0.9, s * 0.28)
    ctx.fillStyle = '#a39e92'
    ctx.fillRect(sx - s * 0.12, sy - s * 0.55, s * 0.24, s * 0.55)
    ctx.fillStyle = 'rgba(220, 200, 140, 0.35)'
    ctx.beginPath()
    ctx.arc(sx, sy - s * 0.62, s * 0.12, 0, Math.PI * 2)
    ctx.fill()
    return
  }
  // Chapel / temple body
  const w = tier === 'temple' ? s * 1.1 : s * 0.85
  const h = tier === 'temple' ? s * 0.95 : s * 0.7
  ctx.fillStyle = '#c8bea8'
  ctx.fillRect(sx - w * 0.5, sy - h * 0.35, w, h * 0.7)
  // Roof
  ctx.fillStyle = tier === 'temple' ? '#6a5040' : '#7a6048'
  ctx.beginPath()
  ctx.moveTo(sx - w * 0.58, sy - h * 0.28)
  ctx.lineTo(sx, sy - h * 0.85)
  ctx.lineTo(sx + w * 0.58, sy - h * 0.28)
  ctx.closePath()
  ctx.fill()
  // Door
  ctx.fillStyle = '#3a3028'
  ctx.fillRect(sx - w * 0.12, sy + h * 0.05, w * 0.24, h * 0.28)
  if (tier === 'temple') {
    // Twin columns
    ctx.fillStyle = '#ddd4c0'
    ctx.fillRect(sx - w * 0.42, sy - h * 0.2, w * 0.1, h * 0.5)
    ctx.fillRect(sx + w * 0.32, sy - h * 0.2, w * 0.1, h * 0.5)
    ctx.fillStyle = 'rgba(240, 220, 160, 0.25)'
    ctx.beginPath()
    ctx.arc(sx, sy - h * 0.9, s * 0.14, 0, Math.PI * 2)
    ctx.fill()
  } else {
    // Small bell / cross stub
    ctx.fillStyle = '#5a5040'
    ctx.fillRect(sx - 1, sy - h * 0.95, 2, h * 0.2)
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

/** Wilds camp / repaired hideout (repaire) — tents then timber lean-to. */
export function drawBanditCampSprite(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  size: number,
  tier: 'camp' | 'lair',
  simple: boolean,
  shadows: boolean,
) {
  if (simple) {
    ctx.fillStyle = tier === 'lair' ? '#4a3828' : '#3a3228'
    ctx.fillRect(sx - 2, sy - 2, 5, 4)
    if (tier === 'camp') {
      ctx.fillStyle = '#c06030'
      ctx.fillRect(sx, sy - 3, 1, 1)
    }
    return
  }
  drawEntityShadow(ctx, sx, sy, size * 0.7, size * 0.28, shadows)
  if (tier === 'lair') {
    // Timber lean-to / rough hut
    ctx.fillStyle = '#3a2e24'
    ctx.beginPath()
    ctx.moveTo(sx - size * 0.55, sy + size * 0.15)
    ctx.lineTo(sx - size * 0.35, sy - size * 0.45)
    ctx.lineTo(sx + size * 0.55, sy - size * 0.35)
    ctx.lineTo(sx + size * 0.45, sy + size * 0.2)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#2a2218'
    ctx.fillRect(sx - size * 0.12, sy - size * 0.05, size * 0.22, size * 0.28)
    ctx.fillStyle = '#5a4838'
    ctx.fillRect(sx - size * 0.5, sy + size * 0.12, size * 0.95, size * 0.08)
  } else {
    // Canvas tent + campfire
    ctx.fillStyle = '#4a4034'
    ctx.beginPath()
    ctx.moveTo(sx - size * 0.5, sy + size * 0.2)
    ctx.lineTo(sx, sy - size * 0.55)
    ctx.lineTo(sx + size * 0.5, sy + size * 0.2)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = '#2a241c'
    ctx.lineWidth = Math.max(1, size * 0.06)
    ctx.beginPath()
    ctx.moveTo(sx, sy - size * 0.55)
    ctx.lineTo(sx, sy + size * 0.2)
    ctx.stroke()
    // Fire
    ctx.fillStyle = '#c86828'
    ctx.beginPath()
    ctx.ellipse(sx + size * 0.55, sy + size * 0.1, size * 0.12, size * 0.1, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#e8a040'
    ctx.beginPath()
    ctx.ellipse(sx + size * 0.55, sy + size * 0.05, size * 0.06, size * 0.08, 0, 0, Math.PI * 2)
    ctx.fill()
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

function professionCloth(profession: string | null | undefined, hue: number): { fill: string; deep: string } {
  switch (profession) {
    case 'blacksmith':
      return { fill: '#3a383c', deep: '#242228' }
    case 'miner':
      return { fill: '#4a4034', deep: '#2e281c' }
    case 'farmer':
    case 'forager':
      return { fill: '#3a5a30', deep: '#2a4020' }
    case 'lumberjack':
      return { fill: '#2e4a28', deep: '#1e3220' }
    case 'builder':
    case 'mason':
      return { fill: '#6a4e32', deep: '#4a3420' }
    case 'fisher':
      return { fill: '#2a4e62', deep: '#1a3444' }
    case 'weaver':
      return { fill: '#5a3450', deep: '#3a2038' }
    case 'trader':
      return { fill: '#6a421c', deep: '#4a2e10' }
    case 'guard':
      return { fill: '#2e3440', deep: '#1c2028' }
    case 'miller':
      return { fill: '#524c40', deep: '#38342c' }
    case 'herder':
      return { fill: '#425a38', deep: '#2a3a24' }
    default:
      return { fill: clothRgb(hue, 48, 36), deep: clothRgb(hue, 42, 26) }
  }
}

function torsoColors(
  id: GearId | null | undefined,
  hue: number,
  profession?: string | null,
): { fill: string; deep: string; mail: boolean } {
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
    default: {
      const pc = professionCloth(profession, hue)
      return { fill: pc.fill, deep: pc.deep, mail: false }
    }
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
  if (size < 3.5) return
  const id = outer ?? (cloakFallback ? 'wool_cloak' : null)
  if (!id) return
  const fur = id === 'fur_mantle'
  const col = fur ? '#5a3e28' : clothRgb((hue + 28) % 360, 36, 28)
  const deep = fur ? '#3a2818' : clothRgb((hue + 28) % 360, 32, 22)
  // DF/RW: block cape (fillRect) — cheaper + clearer than bezier cloaks at tile scale.
  const x = sx - bodyW * 0.72
  const y = sy + size * 0.02 - lift
  const w = bodyW * 1.05
  const h = bodyH * 0.95
  ctx.fillStyle = col
  ctx.fillRect(x, y, w, h)
  ctx.fillStyle = deep
  ctx.fillRect(x, y + h - Math.max(1, size * 0.08), w, Math.max(1, size * 0.08))
  if (fur) {
    ctx.fillStyle = '#c8b090'
    ctx.fillRect(sx - bodyW * 0.08, sy + size * 0.04 - lift, bodyW * 0.22, Math.max(1, size * 0.06))
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
  if (!feet || size < 3.5) return
  const tall = feet === 'leather_boots'
  const col = '#3a2818'
  const cuff = '#5a4030'
  const h = tall ? bodyH * 0.28 : bodyH * 0.16
  const y0 = sy + bodyH * 0.88 - lift
  ctx.fillStyle = col
  ctx.fillRect(sx - bodyW * 0.42, y0, bodyW * 0.32, h)
  ctx.fillRect(sx + bodyW * 0.08, y0, bodyW * 0.32, h)
  if (tall && size >= 5) {
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
  if (offHand !== 'wooden_shield' || size < 3.5) return
  const x = sx - size * 0.55
  const y = sy + size * 0.05 - lift
  const rw = Math.max(2, size * 0.28)
  const rh = Math.max(3, size * 0.36)
  ctx.fillStyle = '#6a4828'
  ctx.fillRect(x - rw * 0.5, y - rh * 0.5, rw, rh)
  ctx.fillStyle = '#8a6840'
  ctx.fillRect(x - rw * 0.28, y - rh * 0.28, rw * 0.56, rh * 0.56)
  ctx.fillStyle = '#c0a060'
  ctx.fillRect(x - Math.max(1, size * 0.05), y - Math.max(1, size * 0.05), Math.max(2, size * 0.1), Math.max(2, size * 0.1))
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
  if (size < 3.5) return
  if (belt === 'leather_satchel' || belt === 'coin_purse') {
    const x = sx - size * 0.48
    const y = sy + size * 0.28 - lift
    ctx.fillStyle = belt === 'leather_satchel' ? '#5a3c24' : '#4a3420'
    ctx.fillRect(x, y, size * 0.28, size * 0.22)
    ctx.fillStyle = '#3a2818'
    ctx.fillRect(x + size * 0.04, y - size * 0.04, size * 0.2, Math.max(1, size * 0.05))
    if (belt === 'leather_satchel' && size >= 5) {
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
  if (!head || size < 3.5) return
  if (head === 'iron_helm') {
    ctx.fillStyle = '#7a848c'
    ctx.fillRect(hx - hr * 1.0, hy - hr * 0.95, hr * 2.0, hr * 0.85)
    ctx.fillStyle = '#9aa4ac'
    ctx.fillRect(hx - hr * 0.95, hy - hr * 0.05, hr * 1.9, hr * 0.35)
    ctx.fillStyle = '#2a3038'
    ctx.fillRect(hx - hr * 0.55, hy + hr * 0.05, hr * 1.1, Math.max(1, size * 0.05))
    return
  }
  if (head === 'leather_cap') {
    ctx.fillStyle = '#5a3c24'
    ctx.fillRect(hx - hr * 0.95, hy - hr * 0.85, hr * 1.9, hr * 0.7)
    ctx.fillStyle = '#3e2a18'
    ctx.fillRect(hx - hr * 0.9, hy - hr * 0.05, hr * 1.8, hr * 0.22)
    return
  }
  if (head === 'wool_hood') {
    const col = clothRgb((hue + 18) % 360, 34, 30)
    ctx.fillStyle = col
    ctx.fillRect(hx - hr * 1.1, hy - hr * 1.15, hr * 2.2, hr * 1.35)
    ctx.fillStyle = clothRgb((hue + 18) % 360, 30, 22)
    ctx.fillRect(hx - hr * 0.7, hy - hr * 0.15, hr * 1.4, hr * 0.7)
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
  if (toolTier === 'none' || size < 2.6) return
  const x0 = sx + size * 0.34
  const y0 = sy - size * 0.08 - lift
  const shaft = toolTier === 'iron' ? '#8a9098' : toolTier === 'stone' ? '#9a9488' : '#6a5238'
  const tip = toolTier === 'iron' ? '#c0c8d0' : toolTier === 'stone' ? '#d8d4c8' : '#8a6840'
  const sw = Math.max(2, Math.round(size * 0.1))
  ctx.fillStyle = shaft
  ctx.fillRect(x0, y0 - size * 0.35, sw, size * 0.72)
  ctx.fillStyle = tip
  if (toolTier === 'wood') {
    ctx.fillRect(x0 - size * 0.02, y0 - size * 0.32, size * 0.28, size * 0.16)
  } else if (toolTier === 'stone') {
    ctx.fillRect(x0 - size * 0.06, y0 - size * 0.38, size * 0.22, size * 0.14)
    ctx.fillRect(x0 + sw, y0 - size * 0.28, size * 0.14, Math.max(2, size * 0.08))
  } else {
    ctx.fillRect(x0 - size * 0.04, y0 - size * 0.42, size * 0.18, size * 0.28)
    ctx.fillStyle = '#5a4030'
    ctx.fillRect(x0 - size * 0.06, y0 + size * 0.05, size * 0.22, Math.max(2, size * 0.07))
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
  if (size < 3.2) return
  const x0 = sx + size * 0.34
  const y0 = sy - size * 0.08 - lift
  const id = mainHand
  if (!id && toolTier === 'none') return
  const sw = Math.max(2, Math.round(size * 0.1))

  if (id === 'iron_sword' || id === 'iron_dagger') {
    const short = id === 'iron_dagger'
    ctx.fillStyle = '#8a9098'
    ctx.fillRect(x0, y0 - size * (short ? 0.18 : 0.36), sw, size * (short ? 0.42 : 0.62))
    ctx.fillStyle = '#c8d0d8'
    ctx.fillRect(x0 - size * 0.04, y0 - size * (short ? 0.22 : 0.42), size * 0.18, size * (short ? 0.16 : 0.26))
    ctx.fillStyle = '#5a4030'
    ctx.fillRect(x0 - size * 0.05, y0 + size * 0.08, size * 0.2, Math.max(2, size * 0.07))
    return
  }
  if (id === 'wood_axe') {
    ctx.fillStyle = '#6a5238'
    ctx.fillRect(x0, y0 - size * 0.28, sw, size * 0.62)
    ctx.fillStyle = '#8a9098'
    ctx.fillRect(x0 - size * 0.02, y0 - size * 0.26, size * 0.3, size * 0.16)
    return
  }
  if (id === 'wooden_staff') {
    ctx.fillStyle = '#6a5238'
    ctx.fillRect(x0, y0 - size * 0.48, Math.max(2, sw), size * 0.95)
    return
  }
  if (id === 'wooden_spear' || id === 'stone_spear') {
    const tip = id === 'stone_spear' ? '#d8d4c8' : '#8a6840'
    ctx.fillStyle = '#6a5238'
    ctx.fillRect(x0, y0 - size * 0.45, sw, size * 0.9)
    ctx.fillStyle = tip
    ctx.fillRect(x0 - size * 0.04, y0 - size * 0.5, size * 0.18, size * 0.16)
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
    profession = null,
    taskKind = null,
    workProgress = 0,
    workFamily = null,
  } = opts
  const gear = opts.gear ?? emptyWornGearVisual()
  const child = age < APPEARANCE_CHILD_AGE
  const female = sex === 'female'

  if (simple) {
    const tc = torsoColors(gear.torso, hue, profession)
    ctx.fillStyle = gear.outer ? (gear.outer === 'fur_mantle' ? '#5a3e28' : tc.fill) : tc.fill
    ctx.fillRect(sx - 1, sy - 2, 3, 4)
    if (gear.head === 'iron_helm') {
      ctx.fillStyle = '#8a9098'
      ctx.fillRect(sx - 1, sy - 3, 3, 1)
    } else if (gear.head === 'leather_cap' || gear.head === 'wool_hood') {
      ctx.fillStyle = '#5a3c24'
      ctx.fillRect(sx - 1, sy - 3, 3, 1)
    }
    // Tiny held tool fleck — visible even in far zoom (DF/RW readability).
    if (gear.mainHand || toolTier !== 'none' || (taskKind && /gather|mine|build|craft|harvest|chop|fish|haul|trade/.test(taskKind))) {
      ctx.fillStyle = toolTier === 'iron' || gear.mainHand?.startsWith('iron') ? '#b0b8c0' : '#6a5238'
      ctx.fillRect(sx + 2, sy - 2, 1, 4)
    }
    // Far-zoom activity pip (§20 / §§1+69)
    if (taskKind && /gather|mine|build|craft|harvest|chop|fish|haul|trade|sow/.test(taskKind)) {
      ctx.fillStyle = '#e8d090'
      ctx.fillRect(sx - 1, sy - 4, 2, 2)
    }
    if (gear.offHand === 'wooden_shield') {
      ctx.fillStyle = '#6a4828'
      ctx.fillRect(sx - 3, sy - 1, 1, 2)
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
    // Mounted horse — blocky DF/RW fillRect (no soft ellipse blob)
    ctx.fillStyle = '#5e442c'
    ctx.fillRect(sx - size * 0.55, sy + size * 0.08, size * 1.1, size * 0.36)
    ctx.fillStyle = '#8a6a45'
    ctx.fillRect(sx - size * 0.5, sy + size * 0.02, size * 1.0, size * 0.28)
    ctx.fillStyle = '#6e5234'
    ctx.fillRect(sx + size * 0.42, sy - size * 0.28, size * 0.16, size * 0.42)
    ctx.fillRect(sx + size * 0.52, sy - size * 0.32, size * 0.22, size * 0.14)
    ctx.fillStyle = '#4a3424'
    ctx.fillRect(sx + size * 0.36, sy - size * 0.3, size * 0.1, size * 0.32)
    // Legs
    ctx.fillStyle = '#3e2c1c'
    ctx.fillRect(sx - size * 0.4, sy + size * 0.32, size * 0.1, size * 0.22)
    ctx.fillRect(sx - size * 0.1, sy + size * 0.34, size * 0.1, size * 0.2)
    ctx.fillRect(sx + size * 0.18, sy + size * 0.32, size * 0.1, size * 0.22)
    ctx.fillRect(sx + size * 0.4, sy + size * 0.34, size * 0.09, size * 0.2)
    // Saddle
    ctx.fillStyle = '#5a4030'
    ctx.fillRect(sx - size * 0.18, sy + size * 0.05, size * 0.36, size * 0.1)
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
  const tc = torsoColors(gear.torso, hue, profession)
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
  ctx.fillRect(sx - shoulderW / 2, torsoTop, shoulderW, bodyH)
  // Hip flare for silhouette (female wider hips)
  if (Math.abs(hipW - shoulderW) > s * 0.04) {
    ctx.fillRect(sx - hipW / 2, torsoTop + bodyH * 0.45, hipW, bodyH * 0.55)
  }
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
  ctx.fillRect(hx - hr * 0.85, hy - hr * 0.9, hr * 1.7, hr * 1.75)

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

  // Spec B §20 — activity readable without panel: task glyph + progress work arc.
  drawTaskActivity(
    ctx,
    sx,
    sy - lift,
    s,
    taskKind,
    profession,
    toolTier,
    !!(gear.mainHand || toolTier !== 'none'),
    workProgress,
    workFamily,
  )

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

/** Tiny French activity cue above head — map-readable work without opening UI (§20 / activity_tools). */
function drawTaskActivity(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  s: number,
  taskKind: string | null | undefined,
  profession: string | null | undefined,
  toolTier: ToolTier,
  hasHeldWeapon: boolean,
  workProgress = 0,
  workFamily: string | null = null,
) {
  const task = taskKind ?? ''
  const tNow = typeof performance !== 'undefined' ? performance.now() : Date.now()
  const pulse = tNow / 1000
  const progress = Math.max(0, Math.min(1, workProgress))
  const family = workFamily ?? ''

  if (!task || task === 'idle' || task === 'sleep' || task === 'rest') {
    if (toolTier === 'none' && (!profession || profession === 'none')) return
    if (s < 4 || hasHeldWeapon) return
    ctx.fillStyle = toolTier === 'iron' ? '#b0b8c0' : '#6a5238'
    ctx.fillRect(sx + s * 0.32, sy - s * 0.15, Math.max(1.5, s * 0.08), s * 0.35)
    return
  }
  const working =
    /gather|mine|build|chop|harvest|fish|haul|craft|smith|trade|sow|tend|cook|weave|clear|dig|grind|bake/.test(
      task,
    )
  if (!working && s < 5) return

  // Progress arc (staging progressArcAngles) + pulse — tool + target + progress readable.
  const ay = sy - s * 0.72
  const arcA = 0.5 + 0.35 * (0.5 + 0.5 * Math.sin(pulse * 6.2))
  let col = '#c9a86a'
  let arcCol = `rgba(240, 220, 160, ${arcA})`
  if (family === 'mine' || /mine|dig|stone|iron/.test(task)) {
    col = '#a8a090'
    arcCol = `rgba(168, 160, 144, ${arcA})`
  } else if (family === 'build' || /build|wall|house|scaffold/.test(task)) {
    col = '#8a6840'
    arcCol = `rgba(138, 104, 64, ${arcA})`
  } else if (family === 'chop' || /gather|chop|clear|wood/.test(task)) {
    col = '#4a7a38'
    arcCol = `rgba(74, 122, 56, ${arcA})`
  } else if (family === 'farm' || /harvest|sow|tend|farm/.test(task)) {
    col = '#c8b050'
    arcCol = `rgba(200, 176, 80, ${arcA})`
  } else if (/fish/.test(task)) {
    col = '#5a90a8'
    arcCol = `rgba(90, 144, 168, ${arcA})`
  } else if (/trade|cart|buy|sell/.test(task)) {
    col = '#c89040'
    arcCol = `rgba(200, 144, 64, ${arcA})`
  } else if (family === 'smith' || family === 'craft' || /craft|smith|weave|cook|grind|bake/.test(task)) {
    col = '#906848'
    arcCol = `rgba(144, 104, 72, ${arcA})`
  } else if (family === 'haul' || /haul|carry/.test(task)) {
    col = '#7a6040'
  }

  const start = Math.PI * 1.15
  const span = Math.PI * 0.7 * Math.max(0.12, progress > 0.02 ? progress : 0.35 + 0.2 * Math.sin(pulse * 7))
  ctx.strokeStyle = arcCol
  ctx.lineWidth = Math.max(1, s * 0.07)
  ctx.beginPath()
  ctx.arc(sx, ay, Math.max(2.5, s * 0.24), start, start + span)
  ctx.stroke()

  ctx.fillStyle = col
  ctx.beginPath()
  ctx.arc(sx, ay - s * 0.08, Math.max(1.6, s * 0.1), 0, Math.PI * 2)
  ctx.fill()

  if (s >= 7) {
    const label =
      family === 'mine' || /mine|dig/.test(task)
        ? 'mine'
        : family === 'build' || /build|wall|house/.test(task)
          ? 'batit'
          : family === 'chop' || /gather|chop|clear/.test(task)
            ? 'coupe'
            : family === 'farm' || /harvest|sow|tend/.test(task)
              ? 'champs'
              : /fish/.test(task)
                ? 'peche'
                : /trade|cart/.test(task)
                  ? 'trade'
                  : family === 'craft' || family === 'smith' || /craft|smith|weave|grind|bake/.test(task)
                    ? 'craft'
                    : family === 'haul' || /haul/.test(task)
                      ? 'porte'
                      : 'travail'
    ctx.fillStyle = 'rgba(235, 220, 180, 0.88)'
    ctx.font = `${Math.max(7, Math.round(s * 0.55))}px Georgia, serif`
    ctx.textAlign = 'center'
    ctx.fillText(label, sx, ay - s * 0.28)
  }

  // Swinging held tool when gear empty but task is labor (high-freq dig/harvest/build/chop)
  if (!hasHeldWeapon && working && s >= 3.5) {
    const swing = Math.sin(pulse * 9) * s * 0.14
    const x0 = sx + s * 0.34 + swing
    const y0 = sy - s * 0.05 + Math.abs(swing) * 0.35
    const ironish = toolTier === 'iron' || family === 'mine' || family === 'smith' || /mine|stone|iron|smith/.test(task)
    ctx.fillStyle = ironish ? '#a0a090' : '#6a5238'
    ctx.fillRect(x0, y0 - s * 0.35, Math.max(1.5, s * 0.09), s * 0.55)
    ctx.fillStyle =
      family === 'mine' || /mine|dig|smith/.test(task)
        ? '#d0ccc0'
        : family === 'chop' || /chop|gather/.test(task)
          ? '#8a6840'
          : '#c8b050'
    ctx.fillRect(x0 - s * 0.06, y0 - s * 0.42, s * 0.22, s * 0.14)
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
