import type {
  ActorDistrict,
  ActorGroupZone,
  ActorGroundItem,
  ActorCivBlob,
  ActorHouse,
  ActorKeep,
  ActorPen,
  ActorRuin,
  ActorScaffold,
  ActorVillage,
  ActorVillager,
} from './snapshot'

export function stageRingMul(stage: string | undefined): number {
  switch (stage) {
    case 'city':
      return 1.55
    case 'town':
      return 1.35
    case 'village':
      return 1.15
    case 'hamlet':
      return 1.05
    default:
      return 0.92
  }
}

/** Deterministic culture hue from tag (visual §§15–18). */
export function cultureHueFromTag(tag: string | null | undefined): number {
  if (!tag) return 38
  let h = 2166136261
  for (let i = 0; i < tag.length; i++) {
    h ^= tag.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) % 360
}

export function drawSettlementBadge(
  ctx: CanvasRenderingContext2D,
  vg: ActorVillage,
  sx: number,
  sy: number,
  zoom: number,
  badgeR: number,
) {
  if (zoom < 0.18) return
  const stage = vg.settlementStage || 'camp'
  const label =
    stage === 'city'
      ? 'cite'
      : stage === 'town'
        ? 'bourg'
        : stage === 'village'
          ? 'village'
          : stage === 'hamlet'
            ? 'hameau'
            : 'camp'
  ctx.fillStyle = 'rgba(220, 205, 170, 0.82)'
  ctx.font = `${Math.max(8, Math.round(9 * zoom))}px Georgia, serif`
  ctx.textAlign = 'center'
  ctx.fillText(label, sx, sy - badgeR - 2)
  if (vg.cultureTag && zoom >= 0.32) {
    ctx.fillStyle = `hsla(${vg.cultureHue ?? 38}, 42%, 42%, 0.75)`
    ctx.font = `${Math.max(7, Math.round(7.5 * zoom))}px Georgia, serif`
    ctx.fillText(vg.cultureTag.slice(0, 14), sx, sy - badgeR - 12)
  }
}

export function drawPerimeterWalls(
  ctx: CanvasRenderingContext2D,
  vg: ActorVillage,
  tx: (x: number) => number,
  ty: (y: number) => number,
  zoom: number,
  tilePx: number,
) {
  const perim = vg.perimeter
  if (!perim || perim.length < 3 || zoom < 0.28) return
  const stone = vg.wallTier === 'stone'
  ctx.beginPath()
  for (let i = 0; i < perim.length; i++) {
    const p = perim[i]
    const x = tx(p.x)
    const y = ty(p.y)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.strokeStyle = stone ? 'rgba(80, 85, 95, 0.5)' : 'rgba(100, 75, 40, 0.4)'
  ctx.lineWidth = Math.max(1, (stone ? 2.2 : 1.5) * Math.min(1.4, zoom))
  ctx.stroke()
  void tilePx
}

export function drawFunctionMarkers(
  ctx: CanvasRenderingContext2D,
  vg: ActorVillage,
  tx: (x: number) => number,
  ty: (y: number) => number,
  off: (sx: number, sy: number) => boolean,
  size: number,
  zoom: number,
  prosper: number,
) {
  if (vg.hasMill && vg.millX >= 0) {
    const mx = tx(vg.millX)
    const my = ty(vg.millY)
    if (!off(mx, my)) {
      const s = Math.max(2.5, size * 0.7)
      ctx.fillStyle = '#6a5a48'
      ctx.fillRect(mx - s * 0.35, my - s * 0.2, s * 0.7, s * 0.55)
      ctx.fillStyle = '#8a7a60'
      ctx.beginPath()
      ctx.moveTo(mx, my - s * 0.55)
      ctx.lineTo(mx + s * 0.4, my - s * 0.1)
      ctx.lineTo(mx - s * 0.4, my - s * 0.1)
      ctx.fill()
      if (zoom >= 0.5) {
        ctx.fillStyle = 'rgba(220, 210, 190, 0.85)'
        ctx.font = `${Math.max(7, Math.round(8 * zoom))}px Georgia, serif`
        ctx.textAlign = 'center'
        ctx.fillText('moulin', mx, my + s * 0.7)
      }
    }
  }
  if (vg.hasPort && vg.portX >= 0) {
    const px = tx(vg.portX)
    const py = ty(vg.portY)
    if (!off(px, py)) {
      const s = Math.max(2.5, size * 0.65)
      ctx.fillStyle = '#3a4a58'
      ctx.fillRect(px - s * 0.5, py - s * 0.1, s, s * 0.25)
      ctx.fillStyle = prosper > 0.5 ? '#c9b070' : '#8a7850'
      ctx.fillRect(px - s * 0.15, py - s * 0.45, s * 0.12, s * 0.4)
      if (zoom >= 0.5) {
        ctx.fillStyle = 'rgba(200, 215, 230, 0.85)'
        ctx.font = `${Math.max(7, Math.round(8 * zoom))}px Georgia, serif`
        ctx.textAlign = 'center'
        ctx.fillText('port', px, py + s * 0.55)
      }
    }
  }
}

/** Culture-tinted roof / wall accents over homes (visual §§15–18). */
export function drawCultureHouse(
  ctx: CanvasRenderingContext2D,
  h: ActorHouse,
  sx: number,
  sy: number,
  size: number,
  zoom: number,
) {
  if (zoom < 0.28) return
  const s = Math.max(3, size * 0.85)
  const hue = h.cultureHue
  const wall =
    h.wall === 'stone'
      ? `hsla(${hue}, 18%, 38%, 0.72)`
      : h.wall === 'timber'
        ? `hsla(${hue}, 28%, 32%, 0.7)`
        : `hsla(${hue}, 36%, 40%, 0.68)`
  const roof = `hsla(${(hue + 18) % 360}, 42%, 36%, 0.82)`
  ctx.fillStyle = wall
  const shape = h.shape
  if (shape === 'round') {
    ctx.beginPath()
    ctx.ellipse(sx, sy + s * 0.08, s * 0.42, s * 0.32, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = roof
    ctx.beginPath()
    ctx.ellipse(sx, sy - s * 0.12, s * 0.48, s * 0.28, 0, 0, Math.PI * 2)
    ctx.fill()
  } else if (shape === 'longhouse' || shape === 'rect') {
    ctx.fillRect(sx - s * 0.55, sy - s * 0.18, s * 1.1, s * 0.42)
    ctx.fillStyle = roof
    ctx.beginPath()
    ctx.moveTo(sx - s * 0.6, sy - s * 0.12)
    ctx.lineTo(sx, sy - s * 0.48)
    ctx.lineTo(sx + s * 0.6, sy - s * 0.12)
    ctx.closePath()
    ctx.fill()
  } else if (shape === 'ell' || shape === 'courtyard') {
    ctx.fillRect(sx - s * 0.45, sy - s * 0.15, s * 0.9, s * 0.38)
    ctx.fillRect(sx - s * 0.45, sy - s * 0.35, s * 0.35, s * 0.55)
    ctx.fillStyle = roof
    ctx.fillRect(sx - s * 0.48, sy - s * 0.42, s * 0.95, s * 0.14)
    ctx.fillRect(sx - s * 0.48, sy - s * 0.42, s * 0.16, s * 0.55)
  } else {
    ctx.fillRect(sx - s * 0.4, sy - s * 0.12, s * 0.8, s * 0.4)
    ctx.fillStyle = roof
    ctx.beginPath()
    ctx.moveTo(sx - s * 0.48, sy - s * 0.08)
    ctx.lineTo(sx, sy - s * 0.45)
    ctx.lineTo(sx + s * 0.48, sy - s * 0.08)
    ctx.closePath()
    ctx.fill()
  }
  // Chimney / ridge accent — culture readable without UI.
  ctx.fillStyle = `hsla(${hue}, 55%, 48%, 0.9)`
  ctx.fillRect(sx + s * 0.18, sy - s * 0.52, Math.max(1.2, s * 0.1), s * 0.22)
}

export function drawDistrictWash(
  ctx: CanvasRenderingContext2D,
  d: ActorDistrict,
  sx: number,
  sy: number,
  zoom: number,
  tilePx: number,
) {
  if (zoom < 0.16) return
  const r = Math.max(6, d.r * tilePx * zoom)
  const colors: Record<ActorDistrict['kind'], string> = {
    market: '200,160,60',
    craft: '140,110,80',
    harbor: '70,120,150',
    mine: '90,85,75',
    sacred: '150,110,160',
    residential: '120,140,90',
  }
  const rgb = colors[d.kind] ?? '120,120,100'
  const alpha = zoom < 0.28 ? 0.18 : 0.14
  ctx.beginPath()
  ctx.ellipse(sx, sy, r, r * 0.72, 0, 0, Math.PI * 2)
  ctx.fillStyle = `rgba(${rgb}, ${alpha})`
  ctx.fill()
  ctx.strokeStyle = `rgba(${rgb}, ${zoom < 0.28 ? 0.45 : 0.35})`
  ctx.lineWidth = zoom < 0.28 ? 1.4 : 1
  ctx.setLineDash([3, 3])
  ctx.stroke()
  ctx.setLineDash([])
  if (zoom >= 0.4) {
    const labels: Record<ActorDistrict['kind'], string> = {
      market: 'quartier marche',
      craft: 'quartier craft',
      harbor: 'quartier port',
      mine: 'quartier mine',
      sacred: 'quartier sacre',
      residential: 'quartier',
    }
    ctx.fillStyle = `rgba(${rgb}, 0.75)`
    ctx.font = `${Math.max(7, Math.round(7.5 * zoom))}px Georgia, serif`
    ctx.textAlign = 'center'
    ctx.fillText(labels[d.kind], sx, sy + r * 0.85)
  }
}

export function drawGroupZone(
  ctx: CanvasRenderingContext2D,
  g: ActorGroupZone,
  sx: number,
  sy: number,
  zoom: number,
  tilePx: number,
) {
  if (zoom < 0.18 || g.memberCount < 2) return
  const r = Math.max(8, g.r * tilePx * zoom)
  const inst = g.institutional
  ctx.beginPath()
  ctx.ellipse(sx, sy, r, r * 0.78, 0, 0, Math.PI * 2)
  ctx.fillStyle = inst ? 'rgba(90, 120, 150, 0.14)' : 'rgba(160, 130, 70, 0.12)'
  ctx.fill()
  ctx.strokeStyle = inst ? 'rgba(80, 110, 140, 0.45)' : 'rgba(150, 120, 60, 0.38)'
  ctx.lineWidth = inst ? 1.4 : 1
  ctx.setLineDash(inst ? [] : [4, 3])
  ctx.stroke()
  ctx.setLineDash([])
  if (zoom >= 0.35) {
    ctx.fillStyle = inst ? 'rgba(180, 200, 220, 0.8)' : 'rgba(210, 190, 140, 0.75)'
    ctx.font = `${Math.max(7, Math.round(8 * zoom))}px Georgia, serif`
    ctx.textAlign = 'center'
    ctx.fillText(g.name.slice(0, 16), sx, sy - r * 0.7)
  }
}

export function drawMigrationWave(
  ctx: CanvasRenderingContext2D,
  v: ActorVillager,
  sx: number,
  sy: number,
  tx: (x: number) => number,
  ty: (y: number) => number,
  size: number,
  zoom: number,
) {
  if (!v.migrating || zoom < 0.28) return
  const dx = tx(v.migrateTx)
  const dy = ty(v.migrateTy)
  ctx.save()
  ctx.strokeStyle = 'rgba(180, 140, 70, 0.45)'
  ctx.lineWidth = Math.max(1, 1.2 * zoom)
  ctx.setLineDash([5, 4])
  ctx.beginPath()
  ctx.moveTo(sx, sy)
  ctx.lineTo(dx, dy)
  ctx.stroke()
  ctx.setLineDash([])
  const s = Math.max(2, size * 0.4)
  ctx.fillStyle = 'rgba(200, 170, 90, 0.22)'
  for (let i = 1; i <= 3; i++) {
    const t = i / 4
    ctx.beginPath()
    ctx.ellipse(
      sx + (dx - sx) * t * 0.35,
      sy + (dy - sy) * t * 0.35,
      s * (1.2 - t * 0.3),
      s * 0.35,
      0,
      0,
      Math.PI * 2,
    )
    ctx.fill()
  }
  ctx.restore()
}

export function drawPenFence(
  ctx: CanvasRenderingContext2D,
  pen: ActorPen,
  sx: number,
  sy: number,
  size: number,
  zoom: number,
) {
  if (zoom < 0.3) return
  const s = Math.max(4, size * (1.1 + pen.radius * 0.08))
  ctx.strokeStyle = 'rgba(110, 90, 50, 0.55)'
  ctx.lineWidth = Math.max(1, 1.3 * zoom)
  ctx.strokeRect(sx - s * 0.5, sy - s * 0.5, s, s)
  ctx.fillStyle = 'rgba(140, 160, 80, 0.08)'
  ctx.fillRect(sx - s * 0.5, sy - s * 0.5, s, s)
  if (zoom >= 0.55) {
    ctx.fillStyle = 'rgba(180, 170, 130, 0.7)'
    ctx.font = `${Math.max(7, Math.round(7.5 * zoom))}px Georgia, serif`
    ctx.textAlign = 'center'
    ctx.fillText('enclos', sx, sy + s * 0.65)
  }
}

/** Rich/poor roof wash — concurrent Spec B path (visual §§30–31). */
export function drawHomeProsperity(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  size: number,
  wealth: number,
  prosperity: number,
) {
  const s = Math.max(2.5, size * 0.7)
  const rich = Math.max(0, Math.min(1, wealth * 0.65 + prosperity * 0.35))
  ctx.fillStyle = `rgba(${Math.round(90 + rich * 110)}, ${Math.round(70 + rich * 50)}, ${Math.round(40 + (1 - rich) * 30)}, 0.55)`
  ctx.beginPath()
  ctx.moveTo(sx - s * 0.45, sy)
  ctx.lineTo(sx, sy - s * 0.4)
  ctx.lineTo(sx + s * 0.45, sy)
  ctx.closePath()
  ctx.fill()
  if (rich > 0.55) {
    ctx.fillStyle = `rgba(210, 180, 90, ${0.25 + rich * 0.35})`
    ctx.fillRect(sx - s * 0.08, sy - s * 0.48, s * 0.16, s * 0.2)
  }
}

/** Keep / donjon staged silhouette (visual §§32–33). */
export function drawKeepStages(
  ctx: CanvasRenderingContext2D,
  k: ActorKeep,
  sx: number,
  sy: number,
  tileS: number,
  zoom: number,
) {
  const s = Math.max(4, tileS * (k.isCastle ? 1.35 : 1.05))
  const prog = Math.max(0.15, Math.min(1, k.progress ?? (k.done ? 1 : 0.45)))
  ctx.fillStyle = k.isCastle ? 'rgba(70, 75, 85, 0.75)' : 'rgba(90, 80, 60, 0.7)'
  ctx.fillRect(sx - s * 0.35, sy - s * 0.55 * prog, s * 0.7, s * 0.7 * prog)
  if (k.isCastle && prog > 0.5) {
    ctx.fillRect(sx - s * 0.48, sy - s * 0.7 * prog, s * 0.22, s * 0.35 * prog)
    ctx.fillRect(sx + s * 0.26, sy - s * 0.7 * prog, s * 0.22, s * 0.35 * prog)
  }
  ctx.fillStyle = 'rgba(50, 45, 40, 0.55)'
  ctx.fillRect(sx - s * 0.12, sy - s * 0.15, s * 0.24, s * 0.28)
  if (zoom >= 0.45 && k.label) {
    ctx.fillStyle = 'rgba(200, 195, 180, 0.85)'
    ctx.font = `${Math.max(7, Math.round(8 * zoom))}px Georgia, serif`
    ctx.textAlign = 'center'
    ctx.fillText(k.label.slice(0, 12), sx, sy + s * 0.55)
  }
}

export function drawRuinScar(
  ctx: CanvasRenderingContext2D,
  _r: ActorRuin,
  sx: number,
  sy: number,
  size: number,
  zoom: number,
) {
  const rs = Math.max(2.5, size * 0.7)
  const intens = Math.max(0.25, Math.min(1, _r.intensity ?? 0.5))
  const raid = _r.kind === 'raid' || _r.kind === 'battle'
  if (raid) {
    // War / raid / battle scar — scorched wedge + ash (visual §§48–50).
    ctx.fillStyle =
      _r.kind === 'battle'
        ? `rgba(50, 22, 18, ${0.4 + intens * 0.25})`
        : `rgba(40, 28, 22, ${0.35 + intens * 0.2})`
    ctx.beginPath()
    ctx.moveTo(sx - rs * 0.7, sy + rs * 0.35)
    ctx.lineTo(sx, sy - rs * 0.55)
    ctx.lineTo(sx + rs * 0.65, sy + rs * 0.3)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = 'rgba(120, 70, 40, 0.35)'
    ctx.fillRect(sx - rs * 0.25, sy - rs * 0.1, rs * 0.5, rs * 0.35)
    if (_r.kind === 'battle') {
      ctx.strokeStyle = `rgba(180, 60, 40, ${0.4 + intens * 0.3})`
      ctx.lineWidth = Math.max(1, 1.2 * intens)
      ctx.beginPath()
      ctx.arc(sx, sy, rs * (0.7 + intens * 0.35), 0, Math.PI * 2)
      ctx.stroke()
      // Soft camp tents around battle (visual §50).
      if (zoom >= 0.35 && intens > 0.35) {
        ctx.fillStyle = 'rgba(90, 70, 50, 0.55)'
        ctx.fillRect(sx - rs * 1.1, sy + rs * 0.2, rs * 0.35, rs * 0.25)
        ctx.fillRect(sx + rs * 0.7, sy + rs * 0.15, rs * 0.3, rs * 0.22)
      }
    }
    if (zoom >= 0.45) {
      ctx.fillStyle = 'rgba(210, 140, 90, 0.75)'
      ctx.font = `${Math.max(7, Math.round(8 * zoom))}px Georgia, serif`
      ctx.textAlign = 'center'
      const age = _r.ageDays != null && _r.ageDays > 0 ? ` · ${Math.min(99, _r.ageDays)}j` : ''
      ctx.fillText((_r.kind === 'battle' ? 'bataille' : 'combat') + age, sx, sy + rs * 0.75)
    }
    return
  }
  ctx.fillStyle = 'rgba(70, 60, 50, 0.55)'
  ctx.fillRect(sx - rs * 0.5, sy - rs * 0.2, rs, rs * 0.45)
  ctx.fillStyle = 'rgba(90, 75, 55, 0.4)'
  ctx.fillRect(sx - rs * 0.35, sy - rs * 0.55, rs * 0.25, rs * 0.4)
  ctx.fillRect(sx + rs * 0.1, sy - rs * 0.4, rs * 0.3, rs * 0.25)
  // Time scar moss (visual §73) — older ruins greener.
  if ((_r.ageDays ?? 0) > 8) {
    ctx.fillStyle = `rgba(60, 90, 50, ${Math.min(0.45, (_r.ageDays ?? 0) / 80)})`
    ctx.fillRect(sx - rs * 0.4, sy - rs * 0.15, rs * 0.8, rs * 0.2)
  }
  if (zoom >= 0.55) {
    ctx.fillStyle = 'rgba(180, 160, 140, 0.7)'
    ctx.font = `${Math.max(7, Math.round(8 * zoom))}px Georgia, serif`
    ctx.textAlign = 'center'
    ctx.fillText('ruine', sx, sy + rs * 0.7)
  }
}

/** Ground goods (visual 57 / staging ground_items) — kind-specific complete props, not flowers. */
export function drawGroundItem(
  ctx: CanvasRenderingContext2D,
  g: ActorGroundItem,
  sx: number,
  sy: number,
  size: number,
  zoom: number,
) {
  if (zoom < 0.28) return
  const kind = g.kind ?? (g.amount >= 8 ? 'trade_crate' : g.amount >= 3 ? 'bag' : 'loot_goods')
  const amtScale = 0.75 + 0.45 * Math.min(1, g.amount / 12)
  const s = Math.max(2.2, size * 0.42 * amtScale)

  ctx.fillStyle = 'rgba(40, 32, 20, 0.28)'
  ctx.beginPath()
  ctx.ellipse(sx, sy + s * 0.28, s * 0.55, s * 0.22, 0, 0, Math.PI * 2)
  ctx.fill()

  if (kind === 'wood_pile') {
    ctx.fillStyle = 'rgba(92, 62, 34, 0.92)'
    ctx.fillRect(sx - s * 0.55, sy - s * 0.08, s * 1.1, s * 0.28)
    ctx.fillStyle = 'rgba(72, 48, 26, 0.9)'
    ctx.fillRect(sx - s * 0.4, sy - s * 0.28, s * 0.95, s * 0.24)
    if (g.amount > 8) {
      ctx.fillStyle = 'rgba(110, 78, 42, 0.85)'
      ctx.fillRect(sx - s * 0.25, sy - s * 0.42, s * 0.7, s * 0.18)
    }
    ctx.fillStyle = 'rgba(60, 70, 40, 0.55)'
    ctx.fillRect(sx + s * 0.2, sy + s * 0.05, s * 0.22, s * 0.2)
  } else if (kind === 'ore_pile') {
    ctx.fillStyle = 'rgba(120, 118, 110, 0.9)'
    ctx.beginPath()
    ctx.arc(sx - s * 0.15, sy, s * 0.28, 0, Math.PI * 2)
    ctx.arc(sx + s * 0.18, sy - s * 0.05, s * 0.22, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(90, 110, 130, 0.75)'
    ctx.fillRect(sx - s * 0.1, sy - s * 0.22, s * 0.28, s * 0.18)
  } else if (kind === 'trade_crate') {
    ctx.fillStyle = 'rgba(110, 78, 38, 0.92)'
    ctx.fillRect(sx - s * 0.5, sy - s * 0.22, s, s * 0.58)
    ctx.fillStyle = 'rgba(168, 130, 62, 0.92)'
    ctx.fillRect(sx - s * 0.42, sy - s * 0.4, s * 0.84, s * 0.22)
    ctx.fillStyle = 'rgba(70, 50, 28, 0.8)'
    ctx.fillRect(sx - s * 0.08, sy - s * 0.18, s * 0.16, s * 0.48)
    if (g.amount >= 4) {
      ctx.fillStyle = 'rgba(180, 160, 70, 0.65)'
      ctx.fillRect(sx + s * 0.22, sy - s * 0.08, s * 0.32, s * 0.28)
    }
  } else if (kind === 'bag') {
    ctx.fillStyle = 'rgba(95, 72, 42, 0.9)'
    ctx.beginPath()
    ctx.ellipse(sx, sy + s * 0.05, s * 0.42, s * 0.38, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(150, 120, 60, 0.85)'
    ctx.fillRect(sx - s * 0.28, sy - s * 0.32, s * 0.56, s * 0.14)
  } else if (kind === 'tool_discard') {
    ctx.fillStyle = 'rgba(90, 70, 45, 0.9)'
    ctx.fillRect(sx - s * 0.05, sy - s * 0.35, s * 0.1, s * 0.55)
    ctx.fillStyle = 'rgba(160, 160, 150, 0.9)'
    ctx.fillRect(sx - s * 0.22, sy - s * 0.42, s * 0.4, s * 0.14)
  } else {
    ctx.fillStyle = 'rgba(110, 78, 38, 0.88)'
    ctx.fillRect(sx - s * 0.48, sy - s * 0.22, s * 0.96, s * 0.55)
    ctx.fillStyle = 'rgba(168, 130, 62, 0.88)'
    ctx.fillRect(sx - s * 0.35, sy - s * 0.35, s * 0.7, s * 0.2)
    ctx.fillStyle = 'rgba(70, 50, 28, 0.7)'
    ctx.fillRect(sx + s * 0.1, sy - s * 0.1, s * 0.28, s * 0.28)
  }

  if (zoom >= 0.5) {
    const label =
      kind === 'wood_pile'
        ? 'bois'
        : kind === 'ore_pile'
          ? 'minerai'
          : kind === 'trade_crate'
            ? 'caisse'
            : kind === 'bag'
              ? 'sac'
              : kind === 'tool_discard'
                ? 'outil'
                : g.amount > 2
                  ? 'biens'
                  : 'sac'
    ctx.fillStyle = 'rgba(230, 210, 160, 0.85)'
    ctx.font = `${Math.max(6, Math.round(7 * zoom))}px Georgia, serif`
    ctx.textAlign = 'center'
    ctx.fillText(label, sx, sy + s * 0.72)
  }
}


/** Far-zoom civilization stage wash (visual §§72/74/76). */
export function drawCivBlob(
  ctx: CanvasRenderingContext2D,
  b: ActorCivBlob,
  sx: number,
  sy: number,
  tileS: number,
  zoom: number,
) {
  if (zoom > 0.42) return
  const r = Math.max(4, b.r * tileS * 0.55)
  const alpha = zoom < 0.18 ? 0.28 : 0.16
  const colors: Record<string, string> = {
    city: `rgba(160, 120, 70, ${alpha})`,
    town: `rgba(140, 110, 65, ${alpha})`,
    village: `rgba(110, 130, 70, ${alpha * 0.9})`,
    hamlet: `rgba(90, 120, 70, ${alpha * 0.8})`,
    camp: `rgba(80, 100, 60, ${alpha * 0.7})`,
  }
  ctx.fillStyle = colors[b.stage] ?? colors.camp
  ctx.beginPath()
  ctx.ellipse(sx, sy, r, r * 0.72, 0, 0, Math.PI * 2)
  ctx.fill()
  if (b.crisis) {
    ctx.strokeStyle = b.crisis === 'collapse' ? 'rgba(140, 40, 30, 0.45)' : 'rgba(180, 100, 40, 0.35)'
    ctx.lineWidth = 1.5
    ctx.stroke()
  }
  if (zoom >= 0.12 && zoom < 0.35) {
    ctx.fillStyle = 'rgba(220, 205, 170, 0.7)'
    ctx.font = `${Math.max(7, Math.round(8 * zoom * 1.2))}px Georgia, serif`
    ctx.textAlign = 'center'
    ctx.fillText(b.stage, sx, sy + r * 0.15)
  }
}

export function drawScaffoldStages(
  ctx: CanvasRenderingContext2D,
  sc: ActorScaffold,
  sx: number,
  sy: number,
  tileS: number,
  zoom: number,
) {
  const hs = Math.max(2.8, tileS * 0.7)
  ctx.fillStyle = '#5a4024'
  ctx.fillRect(sx - hs * 0.45, sy - hs * 0.55, Math.max(1.5, hs * 0.08), hs * 0.9)
  ctx.fillRect(sx + hs * 0.35, sy - hs * 0.55, Math.max(1.5, hs * 0.08), hs * 0.9)
  ctx.fillStyle = '#8a6840'
  ctx.fillRect(sx - hs * 0.48, sy - hs * 0.2, hs * 0.96, Math.max(1.5, hs * 0.08))
  ctx.fillStyle = `rgba(200,180,120,${0.2 + sc.progress * 0.35})`
  ctx.fillRect(sx - hs * 0.3, sy - hs * 0.4, hs * 0.6, hs * 0.35)
  if (zoom >= 0.5 && sc.label) {
    ctx.fillStyle = 'rgba(210, 195, 160, 0.8)'
    ctx.font = `${Math.max(7, Math.round(8 * zoom))}px Georgia, serif`
    ctx.textAlign = 'center'
    ctx.fillText(sc.label, sx, sy + hs * 0.65)
  }
}

export function drawCaravanTrail(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  size: number,
  strength = 1,
) {
  const s = Math.max(2, size * 0.55)
  ctx.fillStyle = `rgba(160, 120, 60, ${0.25 + 0.25 * strength})`
  ctx.beginPath()
  ctx.ellipse(sx, sy + s * 0.15, s * 0.7, s * 0.22, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#6a4a28'
  ctx.fillRect(sx - s * 0.35, sy - s * 0.25, s * 0.7, s * 0.35)
  ctx.fillStyle = '#8a6840'
  ctx.fillRect(sx - s * 0.4, sy - s * 0.35, s * 0.8, s * 0.12)
}

/** Extra wagons for convoy density when several traders cluster (visual §42). */
export function drawCaravanFormation(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  size: number,
  companions: number,
) {
  const n = Math.min(3, Math.max(0, companions))
  for (let i = 0; i < n; i++) {
    const ox = -size * (0.55 + i * 0.48)
    const oy = size * (0.12 + (i % 2) * 0.18)
    drawCaravanTrail(ctx, sx + ox, sy + oy, size * (0.78 - i * 0.08), 0.7 - i * 0.15)
  }
}
