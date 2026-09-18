/**
 * Mines / ore — draw pseudo-API for the visual integrator.
 * Live mine visuals — wired from staging mines_ore/art.
 *
 * Mirrors patterns in `src/lib/render/nature/draw.ts` + `NatureAtlas` + `fauxHeight`.
 */

import {
  DIG_SCAR,
  MINE_BANK,
  MINE_MOUTH,
  MINE_SMOKE,
  MINE_Z,
  ORE_PILE,
  expandMineSite,
  oreTintKey,
  type MinePropInstance,
  type MineVisualSite,
  type OreKind,
} from "./minesComposition"

/** Minimal atlas surface the integrator already has. */
export type MineAtlas = {
  blit(
    ctx: CanvasRenderingContext2D,
    key: string,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
  ): boolean
  blitRect(
    ctx: CanvasRenderingContext2D,
    key: string,
    srcX: number,
    srcY: number,
    srcW: number,
    srcH: number,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
  ): boolean
}

export type MineFaux = {
  drawGroundShadow: (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    alpha?: number,
  ) => void
  drawSouthFace: (
    ctx: CanvasRenderingContext2D,
    topX: number,
    topY: number,
    topW: number,
    topH: number,
    faceH: number,
    faceAlpha?: number,
  ) => void
  drawNorthLit: (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    strip?: number,
  ) => void
}

export type MineDrawOpts = {
  /** When false, skip smoke even if site.active. Default true. */
  smoke?: boolean
  /** Skip ore piles (mouth + scar only). */
  piles?: boolean
}

function cellPx(gx: number, gy: number, camX: number, camY: number, zoom: number, tilePx: number) {
  const tileS = tilePx * zoom
  return {
    tileS,
    px: (gx * tilePx - camX) * zoom,
    py: (gy * tilePx - camY) * zoom,
  }
}

/** Soft dig scar across ~3x2 cells — never a solid dirt block. */
export function drawDigScar(
  ctx: CanvasRenderingContext2D,
  atlas: MineAtlas,
  gx: number,
  gy: number,
  camX: number,
  camY: number,
  zoom: number,
  tilePx: number,
  hash: (x: number, y: number, s: number) => number,
) {
  const { tileS } = cellPx(gx, gy, camX, camY, zoom, tilePx)
  const prev = ctx.globalAlpha
  for (let dy = 0; dy < DIG_SCAR.footprintH; dy++) {
    for (let dx = 0; dx < DIG_SCAR.footprintW; dx++) {
      const cx = gx + dx
      const cy = gy + dy
      const { px, py } = cellPx(cx, cy, camX, camY, zoom, tilePx)
      const center = dx === 1 && dy === 0
      const fringe = dx === 0 || dx === DIG_SCAR.footprintW - 1 || dy === DIG_SCAR.footprintH - 1
      const baseA = center ? DIG_SCAR.centerAlpha : fringe ? DIG_SCAR.fringeAlpha : 0.6
      for (const layer of DIG_SCAR.layers) {
        if ('centerOnly' in layer && layer.centerOnly && !center) continue
        ctx.globalAlpha = baseA * layer.alpha
        atlas.blit(ctx, layer.key, px, py, tileS, tileS)
      }
      if (hash(cx, cy, 41) < DIG_SCAR.chipChance) {
        const sc = DIG_SCAR.chipScale[0] + hash(cx, cy, 42) * (DIG_SCAR.chipScale[1] - DIG_SCAR.chipScale[0])
        const s = tileS * sc
        ctx.globalAlpha = 0.85
        atlas.blit(
          ctx,
          MINE_BANK.boulderN((hash(cx, cy, 43) * 12) | 0),
          px + (tileS - s) * 0.5,
          py + tileS - s * 0.85,
          s,
          s * 0.7,
        )
      }
    }
  }
  ctx.globalAlpha = prev
}

/**
 * Complete mine mouth prop (2x2 overflow).
 * Replaces SimulationCanvas crude ellipse/posts/label when wired.
 */
export function drawMineMouth(
  ctx: CanvasRenderingContext2D,
  atlas: MineAtlas,
  faux: MineFaux,
  gx: number,
  gy: number,
  camX: number,
  camY: number,
  zoom: number,
  tilePx: number,
) {
  const { px, py, tileS } = cellPx(gx, gy, camX, camY, zoom, tilePx)
  const tw = tileS * MINE_MOUTH.drawW
  const th = tileS * MINE_MOUTH.drawH
  const dx = px + (tileS - tw) * 0.5
  const dy = py + tileS - th * 0.85

  faux.drawGroundShadow(ctx, dx + tw * 0.1, dy + th * 0.75, tw * 0.8, th * 0.18, MINE_MOUTH.shadowAlpha)

  // Rock cheeks (left / right) — mountain_face strip, not a full-cell stamp.
  const cheekW = tileS * MINE_MOUTH.cheekScale
  const cheekH = tileS * 0.85
  const c = MINE_MOUTH.cheekSrc
  atlas.blitRect(ctx, c.key, c.srcX, c.srcY, c.srcW, c.srcH, dx, dy + th * 0.2, cheekW, cheekH)
  atlas.blitRect(
    ctx,
    c.key,
    c.srcX,
    c.srcY,
    c.srcW,
    c.srcH,
    dx + tw - cheekW,
    dy + th * 0.2,
    cheekW,
    cheekH,
  )

  // Void
  ctx.fillStyle = MINE_MOUTH.voidColor
  ctx.beginPath()
  ctx.ellipse(
    dx + tw * 0.5,
    dy + th * 0.55,
    tileS * MINE_MOUTH.voidRx,
    tileS * MINE_MOUTH.voidRy,
    0,
    0,
    Math.PI * 2,
  )
  ctx.fill()

  // Timber posts + lintel
  const postW = tileS * MINE_MOUTH.postW
  const postH = tileS * MINE_MOUTH.postH
  const postY = dy + th * 0.22
  atlas.blit(ctx, MINE_BANK.timberPost, dx + tw * 0.18, postY, postW, postH)
  atlas.blit(ctx, MINE_BANK.timberPost, dx + tw * 0.82 - postW, postY, postW, postH)
  const lintelH = tileS * MINE_MOUTH.lintelH
  atlas.blit(ctx, MINE_BANK.timberLintel, dx + tw * 0.12, postY - lintelH * 0.4, tw * 0.76, lintelH)
  faux.drawNorthLit(ctx, dx + tw * 0.12, postY - lintelH * 0.4, tw * 0.76, Math.max(1, lintelH * 0.35))
}

/** Soft ore mound — boulder silhouette + ore fleck tint (never full-cell ore fill). */
export function drawOrePile(
  ctx: CanvasRenderingContext2D,
  atlas: MineAtlas,
  faux: MineFaux,
  gx: number,
  gy: number,
  camX: number,
  camY: number,
  zoom: number,
  tilePx: number,
  ore: OreKind,
  ox = 0,
  oy = 0,
  scale = 1,
  hash: (x: number, y: number, s: number) => number,
) {
  const { px, py, tileS } = cellPx(gx, gy, camX, camY, zoom, tilePx)
  const sc = scale
  const mw = tileS * 1.55 * sc
  const mh = tileS * 0.95 * sc
  const bx = px + ox * tileS + (tileS - mw) * 0.5
  const by = py + oy * tileS + tileS - mh * 0.9

  faux.drawGroundShadow(ctx, bx + mw * 0.08, by + mh * 0.7, mw * 0.84, mh * 0.22, ORE_PILE.shadowAlpha)

  const bKey = MINE_BANK.boulderN((hash(gx, gy, 17) * 12) | 0)
  atlas.blit(ctx, bKey, bx, by, mw, mh)

  const prev = ctx.globalAlpha
  ctx.globalAlpha = ORE_PILE.tintAlpha
  const tw = mw * ORE_PILE.tintScale
  const th = mh * ORE_PILE.tintScale
  atlas.blit(ctx, oreTintKey(ore), bx + (mw - tw) * 0.5, by + mh * 0.15, tw, th)
  ctx.globalAlpha = prev

  faux.drawSouthFace(ctx, bx, by, mw, mh * 0.85, tileS * ORE_PILE.southFace, 0.3)
}

export function drawMineSmoke(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  camX: number,
  camY: number,
  zoom: number,
  tilePx: number,
  hash: (x: number, y: number, s: number) => number,
) {
  const { px, py, tileS } = cellPx(gx, gy, camX, camY, zoom, tilePx)
  const a = MINE_SMOKE.alpha[0] + hash(gx, gy, 55) * (MINE_SMOKE.alpha[1] - MINE_SMOKE.alpha[0])
  const prev = ctx.globalAlpha
  ctx.globalAlpha = a
  ctx.fillStyle = MINE_SMOKE.color
  const cx = px + tileS * 0.5
  const cy = py + tileS * (0.15 - MINE_SMOKE.rise * 0.3)
  ctx.beginPath()
  ctx.ellipse(cx, cy, tileS * MINE_SMOKE.width, tileS * MINE_SMOKE.height * 0.35, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(
    cx + tileS * 0.08,
    cy - tileS * 0.22,
    tileS * MINE_SMOKE.width * 0.65,
    tileS * MINE_SMOKE.height * 0.25,
    0,
    0,
    Math.PI * 2,
  )
  ctx.fill()
  ctx.globalAlpha = prev
}

function drawProp(
  ctx: CanvasRenderingContext2D,
  atlas: MineAtlas,
  faux: MineFaux,
  p: MinePropInstance,
  camX: number,
  camY: number,
  zoom: number,
  tilePx: number,
  hash: (x: number, y: number, s: number) => number,
  opts: MineDrawOpts,
) {
  if (p.kind === "dig_scar") {
    drawDigScar(ctx, atlas, p.gx, p.gy, camX, camY, zoom, tilePx, hash)
    return
  }
  if (p.kind === "mine_mouth") {
    drawMineMouth(ctx, atlas, faux, p.gx, p.gy, camX, camY, zoom, tilePx)
    return
  }
  if (p.kind === "ore_pile") {
    if (opts.piles === false) return
    drawOrePile(
      ctx,
      atlas,
      faux,
      p.gx,
      p.gy,
      camX,
      camY,
      zoom,
      tilePx,
      p.ore ?? "stone",
      p.ox ?? 0,
      p.oy ?? 0,
      p.scale ?? 1,
      hash,
    )
    return
  }
  if (p.kind === "mine_smoke") {
    if (opts.smoke === false) return
    drawMineSmoke(ctx, p.gx, p.gy, camX, camY, zoom, tilePx, hash)
  }
}

/**
 * Entry point for the integrator.
 *
 * Call AFTER nature ground pass (and preferably merged into the nature prop
 * sort for ore piles), BEFORE NPC / building overlays.
 *
 * Z-order guaranteed by expandMineSite: scar -> mouth -> piles -> smoke.
 */
export function drawMineVisuals(
  ctx: CanvasRenderingContext2D,
  atlas: MineAtlas,
  faux: MineFaux,
  sites: MineVisualSite[],
  camX: number,
  camY: number,
  zoom: number,
  tilePx: number,
  hash: (x: number, y: number, s: number) => number,
  opts: MineDrawOpts = {},
) {
  if (tilePx * zoom < 5.5) return
  const prevSmooth = ctx.imageSmoothingEnabled
  ctx.imageSmoothingEnabled = false

  const props: MinePropInstance[] = []
  for (const site of sites) props.push(...expandMineSite(site, hash))
  props.sort((a, b) => a.z - b.z || a.gy + (a.oy ?? 0) - (b.gy + (b.oy ?? 0)) || a.gx - b.gx)

  for (const p of props) drawProp(ctx, atlas, faux, p, camX, camY, zoom, tilePx, hash, opts)

  ctx.imageSmoothingEnabled = prevSmooth
}

export { MINE_Z, expandMineSite }
