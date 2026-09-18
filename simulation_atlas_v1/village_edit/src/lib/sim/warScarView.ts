/**
 * War / crisis scar overlays (visual §§48-50 / war_scars pack).
 * Canvas recipes mapped from staging art/props.ts — sim-backed positions only.
 */

export type ScarOverlayKind =
  | 'field_burned'
  | 'fortify_raised'
  | 'refugee_depart'
  | 'famine_stress'

export type ActorScarOverlay = {
  x: number
  y: number
  kind: ScarOverlayKind
  intensity: number
  ageDays?: number
}

export function drawFieldBurn(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  size: number,
  intensity: number,
  zoom: number,
) {
  if (zoom < 0.22) return
  const s = Math.max(4, size * (1.4 + intensity * 0.6))
  const a = 0.35 + intensity * 0.35
  ctx.fillStyle = `rgba(42, 28, 18, ${a})`
  ctx.beginPath()
  ctx.ellipse(sx, sy, s * 0.85, s * 0.55, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = `rgba(70, 48, 28, ${a * 0.7})`
  ctx.fillRect(sx - s * 0.55, sy - s * 0.15, s * 1.1, s * 0.35)
  ctx.fillStyle = `rgba(90, 70, 40, ${0.25 + intensity * 0.25})`
  ctx.fillRect(sx - s * 0.2, sy - s * 0.35, s * 0.15, s * 0.4)
  ctx.fillRect(sx + s * 0.15, sy - s * 0.28, s * 0.12, s * 0.32)
  if (zoom >= 0.5) {
    ctx.fillStyle = 'rgba(180, 140, 90, 0.65)'
    ctx.font = `${Math.max(6, Math.round(7 * zoom))}px Georgia, serif`
    ctx.textAlign = 'center'
    ctx.fillText('champs brules', sx, sy + s * 0.7)
  }
}

export function drawFortifyPalisade(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  size: number,
  intensity: number,
  zoom: number,
) {
  if (zoom < 0.28) return
  const s = Math.max(3, size * 0.9)
  const h = s * (0.9 + intensity * 0.35)
  ctx.fillStyle = `rgba(70, 48, 28, ${0.55 + intensity * 0.3})`
  ctx.fillRect(sx - s * 0.35, sy - h * 0.85, Math.max(1.5, s * 0.14), h)
  ctx.fillRect(sx + s * 0.18, sy - h * 0.8, Math.max(1.5, s * 0.14), h * 0.95)
  ctx.fillStyle = `rgba(110, 85, 50, ${0.5 + intensity * 0.25})`
  ctx.fillRect(sx - s * 0.38, sy - h * 0.35, s * 0.76, Math.max(1.5, s * 0.12))
  if (zoom >= 0.5) {
    ctx.fillStyle = 'rgba(200, 180, 140, 0.7)'
    ctx.font = `${Math.max(6, Math.round(7 * zoom))}px Georgia, serif`
    ctx.textAlign = 'center'
    ctx.fillText('palissade', sx, sy + s * 0.45)
  }
}

export function drawRefugeeCart(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  size: number,
  zoom: number,
) {
  if (zoom < 0.3) return
  const s = Math.max(3, size * 0.85)
  ctx.fillStyle = 'rgba(0,0,0,0.18)'
  ctx.fillRect(sx - s * 0.7, sy + s * 0.28, s * 1.4, s * 0.12)
  ctx.fillStyle = '#6a4828'
  ctx.fillRect(sx - s * 0.75, sy - s * 0.15, s * 1.5, s * 0.42)
  ctx.fillStyle = '#a88850'
  ctx.fillRect(sx - s * 0.65, sy - s * 0.35, s * 1.3, s * 0.22)
  ctx.fillStyle = '#2a2118'
  ctx.beginPath()
  ctx.arc(sx - s * 0.45, sy + s * 0.32, s * 0.16, 0, Math.PI * 2)
  ctx.arc(sx + s * 0.45, sy + s * 0.32, s * 0.16, 0, Math.PI * 2)
  ctx.fill()
  if (zoom >= 0.48) {
    ctx.fillStyle = 'rgba(210, 180, 120, 0.75)'
    ctx.font = `${Math.max(6, Math.round(7 * zoom))}px Georgia, serif`
    ctx.textAlign = 'center'
    ctx.fillText('fuite', sx, sy + s * 0.7)
  }
}

export function drawFamineHaze(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  size: number,
  intensity: number,
  zoom: number,
) {
  if (zoom < 0.18) return
  const r = Math.max(6, size * (2.2 + intensity * 1.5))
  const a = zoom < 0.35 ? 0.22 + intensity * 0.18 : 0.12 + intensity * 0.12
  ctx.fillStyle = `rgba(160, 140, 70, ${a})`
  ctx.beginPath()
  ctx.ellipse(sx, sy, r, r * 0.7, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = `rgba(140, 110, 50, ${a + 0.1})`
  ctx.lineWidth = 1.2
  ctx.setLineDash([3, 3])
  ctx.stroke()
  ctx.setLineDash([])
  if (zoom >= 0.4 && zoom < 0.85) {
    ctx.fillStyle = 'rgba(200, 175, 110, 0.7)'
    ctx.font = `${Math.max(7, Math.round(8 * zoom))}px Georgia, serif`
    ctx.textAlign = 'center'
    ctx.fillText('famine', sx, sy + r * 0.15)
  }
}

export function drawScarOverlay(
  ctx: CanvasRenderingContext2D,
  scar: ActorScarOverlay,
  sx: number,
  sy: number,
  size: number,
  zoom: number,
) {
  const intens = Math.max(0.2, Math.min(1, scar.intensity ?? 0.5))
  switch (scar.kind) {
    case 'field_burned':
      drawFieldBurn(ctx, sx, sy, size, intens, zoom)
      break
    case 'fortify_raised':
      drawFortifyPalisade(ctx, sx, sy, size, intens, zoom)
      break
    case 'refugee_depart':
      drawRefugeeCart(ctx, sx, sy, size, zoom)
      break
    case 'famine_stress':
      drawFamineHaze(ctx, sx, sy, size, intens, zoom)
      break
  }
}
