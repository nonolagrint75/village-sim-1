/**
 * Fake height for top-down 2D - north rim lit, south face darker, soft ground shadow.
 */

export type FauxOpts = {
  face?: number
  shadow?: number
  northLit?: boolean
  faceAlpha?: number
}

export function drawGroundShadow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  alpha = 0.2,
) {
  if (w < 1 || h < 1) return
  ctx.fillStyle = 'rgba(0,0,0,' + alpha + ')'
  ctx.fillRect(Math.round(x), Math.round(y + h * 0.7), Math.round(w), Math.max(1, Math.round(h * 0.28)))
}

export function drawSouthFace(
  ctx: CanvasRenderingContext2D,
  topX: number,
  topY: number,
  topW: number,
  topH: number,
  faceH: number,
  faceAlpha = 0.38,
) {
  if (faceH < 1 || topW < 1) return
  const fx = Math.round(topX)
  const fy = Math.round(topY + topH)
  const fw = Math.round(topW)
  const fh = Math.max(1, Math.round(faceH))
  ctx.fillStyle = 'rgba(20,14,10,' + faceAlpha + ')'
  ctx.fillRect(fx, fy, fw, fh)
  ctx.fillStyle = 'rgba(255,220,160,0.08)'
  ctx.fillRect(fx, fy, Math.max(1, Math.round(fw * 0.1)), fh)
  ctx.fillStyle = 'rgba(0,0,0,0.18)'
  ctx.fillRect(fx + fw - Math.max(1, Math.round(fw * 0.1)), fy, Math.max(1, Math.round(fw * 0.1)), fh)
}

export function drawNorthLit(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  strip = 2,
) {
  if (w < 1) return
  ctx.fillStyle = 'rgba(255,248,220,0.14)'
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.max(1, Math.round(strip)))
}

export function fauxBefore(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  props: FauxOpts = {},
) {
  drawGroundShadow(ctx, x, y, w, h, props.shadow ?? 0.2)
}

export function fauxAfter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  props: FauxOpts = {},
) {
  const faceFrac = props.face ?? 0.3
  drawSouthFace(ctx, x, y, w, h, h * faceFrac, props.faceAlpha ?? 0.34)
  if (props.northLit !== false) drawNorthLit(ctx, x, y, w, Math.max(1, h * 0.08))
}

