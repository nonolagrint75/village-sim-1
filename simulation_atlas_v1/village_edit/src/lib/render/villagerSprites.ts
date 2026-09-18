/**
 * DF Premium / RimWorld villagers — crisp fillRect silhouettes.
 * Profession colors + held tools always readable at tile scale.
 * // @ts-nocheck — ActorVillager fields differ between Atlas (profession/ageBand) and worktree (gear).
 */
// @ts-nocheck
import type { ActorVillager } from '@/lib/sim/snapshot'

export type VillagerDrawOpts = {
  selected: boolean
  size: number
  simple: boolean
  timeMs: number
}

function px(n: number): number {
  return Math.round(n)
}

function clothColor(v: ActorVillager): string {
  switch (v.profession ?? 'none') {
    case 'blacksmith':
      return '#3a383c'
    case 'miner':
      return '#4a4034'
    case 'farmer':
    case 'forager':
      return '#3a5a30'
    case 'lumberjack':
      return '#2e4a28'
    case 'builder':
    case 'mason':
      return '#6a4e32'
    case 'fisher':
      return '#2a4e62'
    case 'weaver':
      return '#5a3450'
    case 'trader':
      return '#6a421c'
    case 'guard':
      return '#2e3440'
    case 'miller':
      return '#524c40'
    case 'herder':
      return '#425a38'
    default: {
      const h = Number.isFinite(v.hue) ? v.hue : 40
      return `hsl(${h}, 42%, 30%)`
    }
  }
}

function clothDeep(v: ActorVillager): string {
  switch (v.profession ?? 'none') {
    case 'blacksmith':
      return '#242228'
    case 'builder':
    case 'mason':
      return '#4a3420'
    case 'guard':
      return '#1c2028'
    case 'farmer':
    case 'forager':
    case 'herder':
      return '#2a4020'
    default:
      return '#2a2218'
  }
}

function skinColor(v: ActorVillager): string {
  const base = Number.isFinite(v.hue) ? v.hue : 40
  const h = 16 + (base % 22)
  const light = v.ageBand === 'elder' ? 56 : v.ageBand === 'child' ? 66 : 62
  return `hsl(${h}, 38%, ${light}%)`
}

function hairColor(v: ActorVillager): string {
  if (v.ageBand === 'elder') return '#c4bcb0'
  const h = ((v.id * 17) >>> 0) % 100
  if (h < 22) return '#1a120c'
  if (h < 48) return '#3a2414'
  if (h < 72) return '#6a3e18'
  return '#8a5a28'
}

/** Profession / task tool — always drawn when working or craft job. */
function drawHeldTool(
  ctx: CanvasRenderingContext2D,
  v: ActorVillager,
  x: number,
  y: number,
  s: number,
) {
  const task = v.taskKind ?? ''
  const working = /gather|mine|build|chop|harvest|fish|haul|craft|smith/.test(task)
  const prof = v.profession ?? 'none'
  const tier = v.toolTier ?? 'none'
  if (!working && prof === 'none' && tier === 'none') return

  const tip =
    tier === 'iron' ? '#c0c8d0' : tier === 'stone' ? '#d0ccc0' : '#8a6840'
  const shaft = tier === 'iron' ? '#6a7078' : '#5a4028'
  const hx = x + s * 0.34
  const hy = y - s * 0.02

  // Builder / mason: hammer + optional plank
  if (prof === 'builder' || prof === 'mason' || /build/.test(task)) {
    ctx.fillStyle = shaft
    ctx.fillRect(px(hx), px(hy - s * 0.28), px(Math.max(2, s * 0.1)), px(s * 0.55))
    ctx.fillStyle = tip
    ctx.fillRect(px(hx - s * 0.1), px(hy - s * 0.32), px(s * 0.3), px(s * 0.16))
    if (s >= 5) {
      ctx.fillStyle = '#a88858'
      ctx.fillRect(px(x - s * 0.48), px(y + s * 0.08), px(s * 0.22), px(s * 0.1))
    }
    return
  }
  // Lumberjack / chop: axe
  if (prof === 'lumberjack' || /chop/.test(task)) {
    ctx.fillStyle = shaft
    ctx.fillRect(px(hx), px(hy - s * 0.3), px(Math.max(2, s * 0.09)), px(s * 0.58))
    ctx.fillStyle = tip
    ctx.fillRect(px(hx - s * 0.04), px(hy - s * 0.34), px(s * 0.22), px(s * 0.14))
    ctx.fillRect(px(hx + s * 0.08), px(hy - s * 0.28), px(s * 0.12), px(Math.max(2, s * 0.08)))
    return
  }
  // Miner: pick
  if (prof === 'miner' || /mine/.test(task)) {
    ctx.fillStyle = shaft
    ctx.fillRect(px(hx), px(hy - s * 0.32), px(Math.max(2, s * 0.09)), px(s * 0.6))
    ctx.fillStyle = tip
    ctx.fillRect(px(hx - s * 0.08), px(hy - s * 0.38), px(s * 0.26), px(s * 0.12))
    return
  }
  // Farmer / harvest: sickle / hoe
  if (prof === 'farmer' || /harvest|gather/.test(task)) {
    ctx.fillStyle = shaft
    ctx.fillRect(px(hx), px(hy - s * 0.2), px(Math.max(2, s * 0.08)), px(s * 0.45))
    ctx.fillStyle = tip
    ctx.fillRect(px(hx - s * 0.02), px(hy - s * 0.28), px(s * 0.22), px(s * 0.1))
    return
  }
  // Fisher: pole
  if (prof === 'fisher' || /fish/.test(task)) {
    ctx.fillStyle = '#6a5238'
    ctx.fillRect(px(hx), px(hy - s * 0.45), px(Math.max(1, s * 0.07)), px(s * 0.75))
    ctx.fillStyle = '#c8c8d0'
    ctx.fillRect(px(hx + s * 0.02), px(hy - s * 0.48), px(s * 0.16), px(Math.max(1, s * 0.05)))
    return
  }
  // Guard / combat: spear or sword
  if (prof === 'guard') {
    ctx.fillStyle = tip
    ctx.fillRect(px(hx), px(hy - s * 0.42), px(Math.max(2, s * 0.08)), px(s * 0.7))
    ctx.fillStyle = '#8a6840'
    ctx.fillRect(px(hx - s * 0.04), px(hy + s * 0.12), px(s * 0.16), px(Math.max(2, s * 0.07)))
    return
  }
  // Blacksmith: hammer
  if (prof === 'blacksmith' || /smith|craft/.test(task)) {
    ctx.fillStyle = shaft
    ctx.fillRect(px(hx), px(hy - s * 0.22), px(Math.max(2, s * 0.09)), px(s * 0.48))
    ctx.fillStyle = '#a0a8b0'
    ctx.fillRect(px(hx - s * 0.1), px(hy - s * 0.28), px(s * 0.28), px(s * 0.14))
    return
  }
  // Default tool fleck from tier
  if (tier !== 'none' || working) {
    ctx.fillStyle = shaft
    ctx.fillRect(px(hx), px(hy - s * 0.25), px(Math.max(2, s * 0.09)), px(s * 0.5))
    ctx.fillStyle = tip
    ctx.fillRect(px(hx - s * 0.04), px(hy - s * 0.3), px(s * 0.2), px(s * 0.12))
  }
}

export function drawVillagerSprite(
  ctx: CanvasRenderingContext2D,
  v: ActorVillager,
  sx: number,
  sy: number,
  opts: VillagerDrawOpts,
) {
  const { selected } = opts
  const size = Math.max(opts.size, opts.simple ? 2.4 : 3.0)
  const child = v.ageBand === 'child'
  const elder = v.ageBand === 'elder'
  const s = size * (child ? 0.72 : elder ? 0.9 : 1)
  const x = px(sx)
  const y = px(sy - (v.mounted ? s * 0.18 : 0))

  if (opts.simple) {
    ctx.fillStyle = clothColor(v)
    ctx.fillRect(x - 1, y - 2, 3, 4)
    if (v.toolTier !== 'none' || (v.taskKind && /build|mine|chop|harvest/.test(v.taskKind))) {
      ctx.fillStyle = v.toolTier === 'iron' ? '#b0b8c0' : '#6a5238'
      ctx.fillRect(x + 2, y - 2, 1, 4)
    }
    if (selected) {
      ctx.strokeStyle = '#f0d878'
      ctx.lineWidth = 1
      ctx.strokeRect(x - 3, y - 4, 7, 8)
    }
    return
  }

  // Contact shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  ctx.fillRect(px(x - s * 0.32), px(y + s * 0.38), px(s * 0.64), px(s * 0.16))

  // Mounted horse stub
  if (v.mounted) {
    ctx.fillStyle = '#1a1008'
    ctx.fillRect(px(x - s * 0.58), px(y + s * 0.28), px(s * 1.16), px(s * 0.14))
    ctx.fillStyle = '#7a5a38'
    ctx.fillRect(px(x - s * 0.55), px(y + s * 0.12), px(s * 1.1), px(s * 0.32))
    ctx.fillStyle = '#5a4024'
    ctx.fillRect(px(x - s * 0.5), px(y + s * 0.2), px(s * 1.0), px(s * 0.1))
    ctx.fillStyle = '#4a3218'
    ctx.fillRect(px(x + s * 0.42), px(y - s * 0.2), px(s * 0.14), px(s * 0.4))
  }

  // Legs
  ctx.fillStyle = '#2a2218'
  ctx.fillRect(px(x - s * 0.2), px(y + s * 0.2), px(s * 0.14), px(s * 0.32))
  ctx.fillRect(px(x + s * 0.06), px(y + s * 0.2), px(s * 0.14), px(s * 0.32))
  // Boots
  ctx.fillStyle = '#1a1410'
  ctx.fillRect(px(x - s * 0.22), px(y + s * 0.44), px(s * 0.16), px(s * 0.08))
  ctx.fillRect(px(x + s * 0.04), px(y + s * 0.44), px(s * 0.16), px(s * 0.08))

  // Torso
  const body = clothColor(v)
  const deep = clothDeep(v)
  ctx.fillStyle = body
  ctx.fillRect(px(x - s * 0.26), px(y - s * 0.06), px(s * 0.52), px(s * 0.38))
  ctx.fillStyle = deep
  ctx.fillRect(px(x - s * 0.26), px(y + s * 0.2), px(s * 0.52), px(Math.max(1, s * 0.06)))

  // Belt accent
  ctx.fillStyle = `hsl(${Number.isFinite(v.hue) ? v.hue : 40}, 48%, 36%)`
  ctx.fillRect(px(x - s * 0.26), px(y + s * 0.16), px(s * 0.52), px(Math.max(1, s * 0.07)))

  // Arms
  ctx.fillStyle = deep
  ctx.fillRect(px(x - s * 0.38), px(y - s * 0.02), px(s * 0.12), px(s * 0.28))
  ctx.fillRect(px(x + s * 0.26), px(y - s * 0.02), px(s * 0.12), px(s * 0.28))
  ctx.fillStyle = skinColor(v)
  ctx.fillRect(px(x - s * 0.38), px(y + s * 0.22), px(s * 0.12), px(s * 0.09))
  ctx.fillRect(px(x + s * 0.26), px(y + s * 0.22), px(s * 0.12), px(s * 0.09))

  // Head
  const skin = skinColor(v)
  ctx.fillStyle = skin
  ctx.fillRect(px(x - s * 0.18), px(y - s * 0.4), px(s * 0.36), px(s * 0.34))

  // Hair
  const hair = hairColor(v)
  ctx.fillStyle = hair
  ctx.fillRect(px(x - s * 0.2), px(y - s * 0.48), px(s * 0.4), px(s * 0.16))
  if (!child) {
    ctx.fillRect(px(x - s * 0.22), px(y - s * 0.38), px(s * 0.08), px(s * 0.2))
    ctx.fillRect(px(x + s * 0.14), px(y - s * 0.38), px(s * 0.08), px(s * 0.2))
  }

  // Eyes
  if (s >= 4.5) {
    ctx.fillStyle = '#1a1410'
    ctx.fillRect(px(x - s * 0.08), px(y - s * 0.28), px(Math.max(1, s * 0.07)), px(Math.max(1, s * 0.07)))
    ctx.fillRect(px(x + s * 0.04), px(y - s * 0.28), px(Math.max(1, s * 0.07)), px(Math.max(1, s * 0.07)))
  }

  // Elder beard stub
  if (elder && s >= 5) {
    ctx.fillStyle = '#c4bcb0'
    ctx.fillRect(px(x - s * 0.1), px(y - s * 0.12), px(s * 0.2), px(s * 0.1))
  }

  // Profession headgear
  const prof = v.profession ?? 'none'
  if (prof === 'miner' && s >= 5) {
    ctx.fillStyle = '#6a5a40'
    ctx.fillRect(px(x - s * 0.2), px(y - s * 0.5), px(s * 0.4), px(s * 0.12))
    ctx.fillStyle = '#c8a040'
    ctx.fillRect(px(x - s * 0.04), px(y - s * 0.52), px(s * 0.08), px(s * 0.06))
  } else if (prof === 'guard' && s >= 5) {
    ctx.fillStyle = '#6a7078'
    ctx.fillRect(px(x - s * 0.2), px(y - s * 0.52), px(s * 0.4), px(s * 0.14))
  } else if ((prof === 'builder' || prof === 'mason') && s >= 5) {
    ctx.fillStyle = '#c4a878'
    ctx.fillRect(px(x - s * 0.18), px(y - s * 0.5), px(s * 0.36), px(s * 0.1))
  }

  drawHeldTool(ctx, v, x, y, s)

  // Cart stub
  if (v.hasCart && !v.mounted && s >= 4) {
    ctx.fillStyle = '#5a3c20'
    ctx.fillRect(px(x - s * 0.95), px(y + s * 0.05), px(s * 0.5), px(s * 0.32))
    ctx.fillStyle = '#8a6840'
    ctx.fillRect(px(x - s * 0.9), px(y + s * 0.1), px(s * 0.4), px(s * 0.12))
    ctx.fillStyle = '#2a1810'
    ctx.fillRect(px(x - s * 0.88), px(y + s * 0.36), px(s * 0.1), px(s * 0.1))
    ctx.fillRect(px(x - s * 0.62), px(y + s * 0.36), px(s * 0.1), px(s * 0.1))
  }

  if (selected) {
    ctx.strokeStyle = '#f0d878'
    ctx.lineWidth = 1.5
    ctx.strokeRect(px(x - s * 0.48), px(y - s * 0.55), px(s * 0.96), px(s * 1.15))
  }
}
