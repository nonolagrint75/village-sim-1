import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react'
import { SimPanel } from '@/components/SimPanel'
import { StartMenu } from '@/components/StartMenu'
import { SimToolbar } from '@/components/SimToolbar'
import { dayNightVisual } from '@/lib/sim/calendar'
import {
  collectTerrainHearths,
  drawLocalLightGlows,
  type ActorLight,
} from '@/lib/sim/lighting'
import { TILE_PX, drawCloseupTerrain, tilePixel32 } from '@/lib/sim/tileArt'
import { type BiomeId } from '@/lib/sim/biomeVisual'
import {
  drawBanditCampSprite,
  drawBanditSprite,
  drawEmbarkedVillagerSprite,
  drawHorseSprite,
  drawSacredSite,
  drawSheepSprite,
  drawVillagerSprite,
  drawWolfSprite,
} from '@/lib/sim/entityArt'
import { drawWornWays } from '@/lib/sim/roadView'
import {
  EMPTY_STATS,
  type ActorVillager,
  type DirtyFrame,
  type DrawFrame,
  type SelectedVillager,
  type UiBandRow,
  type UiCountRow,
  type UiFrame,
  type UiGroupRow,
  type UiLineageRow,
  type UiProjectRow,
  type UiReligionSiteRow,
} from '@/lib/sim/snapshot'
import { DEFAULT_SIM_CONFIG, type SimConfig } from '@/lib/sim/simConfig'
import { setWorldSize, type SimStats } from '@/lib/sim/types'

const DISPLAY_SIZE = 760
const MAX_ZOOM = 6
const DEFAULT_ZOOM = 2
const CLICK_MAX_DRAG_PX = 6
const CLICK_MAX_MS = 400
const SELECT_RADIUS_TILES = 4.5
const DRAW_INTERVAL_MS = 16
const DRAW_INTERVAL_SLOW_MS = 33
const DIRTY_FULL_FLUSH = 600
const DAY_NIGHT_STORAGE_KEY = 'village-sim-show-day-night'

function readShowDayNight(): boolean {
  try {
    const raw = localStorage.getItem(DAY_NIGHT_STORAGE_KEY)
    if (raw === null) return true
    return raw !== '0' && raw !== 'false'
  } catch {
    return true
  }
}

function worldPxOf(size: number) {
  return size * TILE_PX
}

function minZoomOf(size: number) {
  return DISPLAY_SIZE / worldPxOf(size)
}

function clampNum(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

export function SimulationCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const viewCtxRef = useRef<CanvasRenderingContext2D | null>(null)
  const worldCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const worldCtxRef = useRef<CanvasRenderingContext2D | null>(null)
  const worldPixelsRef = useRef<ImageData | null>(null)
  const worldPackedRef = useRef<Uint32Array | null>(null)
  const terrainRef = useRef<Uint8Array | null>(null)
  const amountRef = useRef<Uint16Array | null>(null)
  const biomeRef = useRef<Uint8Array | null>(null)
  const viewRef = useRef<DrawFrame>({
    season: 'spring',
    hour: 12,
    villagers: [],
    sheep: [],
    horses: [],
    boats: [],
    wolves: [],
    bandits: [],
    bandCamps: [],
    villages: [],
    polities: [],
    keeps: [],
    tradeLinks: [],
    lights: [],
    ticksPerSec: 0,
  })
  const workerRef = useRef<Worker | null>(null)
  const frameRef = useRef<number>(0)

  const camRef = useRef({ x: 0, y: 0 })
  const zoomRef = useRef(DEFAULT_ZOOM)
  const draggingRef = useRef(false)
  const lastPointerRef = useRef({ x: 0, y: 0 })
  const pointerDownRef = useRef({ x: 0, y: 0, t: 0 })
  const dragDistRef = useRef(0)
  const followRef = useRef(false)
  const selectedRef = useRef<number | null>(null)
  const worldSizeRef = useRef(1000)
  const startedRef = useRef(false)
  const showDayNightRef = useRef(readShowDayNight())

  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [zoomLabel, setZoomLabel] = useState(DEFAULT_ZOOM)
  const [stats, setStats] = useState<SimStats>(EMPTY_STATS)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selected, setSelected] = useState<SelectedVillager | null>(null)
  const [following, setFollowing] = useState(false)
  const [chronicle, setChronicle] = useState<string[]>([])
  const [groups, setGroups] = useState<UiGroupRow[]>([])
  const [lineages, setLineages] = useState<UiLineageRow[]>([])
  const [cultures, setCultures] = useState<UiCountRow[]>([])
  const [creeds, setCreeds] = useState<UiCountRow[]>([])
  const [projects, setProjects] = useState<UiProjectRow[]>([])
  const [bands, setBands] = useState<UiBandRow[]>([])
  const [religionSites, setReligionSites] = useState<UiReligionSiteRow[]>([])
  const [fps, setFps] = useState(0)
  const [simTps, setSimTps] = useState(0)
  const [worldReady, setWorldReady] = useState(false)
  const [menuOpen, setMenuOpen] = useState(true)
  const [launching, setLaunching] = useState(false)
  const [lastConfig, setLastConfig] = useState<SimConfig>(DEFAULT_SIM_CONFIG)
  const [showDayNight, setShowDayNight] = useState(readShowDayNight)

  useEffect(() => {
    showDayNightRef.current = showDayNight
    try {
      localStorage.setItem(DAY_NIGHT_STORAGE_KEY, showDayNight ? '1' : '0')
    } catch {
      /* ignore quota / private mode */
    }
  }, [showDayNight])

  useEffect(() => {
    followRef.current = following
  }, [following])

  const ensureWorldBuffer = useCallback((size = worldSizeRef.current) => {
    let canvas = worldCanvasRef.current
    if (!canvas) {
      canvas = document.createElement('canvas')
      worldCanvasRef.current = canvas
      worldCtxRef.current = canvas.getContext('2d', { alpha: false, desynchronized: true })
    }
    if (canvas.width !== size || canvas.height !== size) {
      canvas.width = size
      canvas.height = size
      worldPixelsRef.current = null
      worldPackedRef.current = null
    }
    const ctx = worldCtxRef.current
    if (!ctx) return null
    if (!worldPixelsRef.current || worldPixelsRef.current.width !== size) {
      const image = ctx.createImageData(size, size)
      worldPixelsRef.current = image
      worldPackedRef.current = new Uint32Array(image.data.buffer)
    }
    return ctx
  }, [])

  useEffect(() => {
    // Keep ref in sync immediately so in-flight worker UI can't race the next paint.
    selectedRef.current = selectedId
    workerRef.current?.postMessage({ type: 'select', id: selectedId })
  }, [selectedId])

  const paintBuffers = useCallback((terrain: Uint8Array, amount: Uint16Array, biome: Uint8Array) => {
    const size = worldSizeRef.current
    const ctx = ensureWorldBuffer(size)
    const packed = worldPackedRef.current
    const image = worldPixelsRef.current
    if (!ctx || !packed || !image) return
    for (let y = 0; y < size; y++) {
      const row = y * size
      for (let x = 0; x < size; x++) {
        const i = row + x
        packed[i] = tilePixel32(terrain[i], amount[i], x, y, biome[i] as BiomeId)
      }
    }
    ctx.putImageData(image, 0, 0)
  }, [ensureWorldBuffer])

  const flushDirty = useCallback((dirty: DirtyFrame) => {
    const ctx = worldCtxRef.current
    const packed = worldPackedRef.current
    const image = worldPixelsRef.current
    const terrain = terrainRef.current
    const amount = amountRef.current
    const biome = biomeRef.current
    if (!ctx || !packed || !image || !terrain || !amount || !biome) return
    const w = worldSizeRef.current
    const n = dirty.indices.length
    let minX = w
    let minY = w
    let maxX = 0
    let maxY = 0
    for (let k = 0; k < n; k++) {
      const i = dirty.indices[k]
      terrain[i] = dirty.terrain[k]
      amount[i] = dirty.amount[k]
      const x = i % w
      const y = (i / w) | 0
      packed[i] = tilePixel32(terrain[i], amount[i], x, y, biome[i] as BiomeId)
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
    if (n === 0) return
    if (n >= DIRTY_FULL_FLUSH || maxX - minX > 80 || maxY - minY > 80) {
      ctx.putImageData(image, 0, 0)
    } else {
      const bw = maxX - minX + 1
      const bh = maxY - minY + 1
      ctx.putImageData(image, 0, 0, minX, minY, bw, bh)
    }
  }, [])

  useEffect(() => {
    const size = worldSizeRef.current
    const visible = DISPLAY_SIZE / zoomRef.current
    camRef.current = { x: worldPxOf(size) / 2 - visible / 2, y: worldPxOf(size) / 2 - visible / 2 }
  }, [])

  useEffect(() => {
    if (!startedRef.current) return
    workerRef.current?.postMessage({ type: 'play', playing })
  }, [playing])

  useEffect(() => {
    if (!startedRef.current) return
    workerRef.current?.postMessage({ type: 'speed', speed })
  }, [speed])

  useEffect(() => {
    const worker = new Worker(new URL('../lib/sim/sim.worker.ts', import.meta.url), { type: 'module' })
    workerRef.current = worker
    worker.onmessage = (ev: MessageEvent<{
      type: string
      width?: number
      height?: number
      terrain?: Uint8Array
      amount?: Uint16Array
      biome?: Uint8Array
      dirty?: DirtyFrame
      frame?: DrawFrame | UiFrame
      playing?: boolean
      config?: SimConfig
    }>) => {
      const msg = ev.data
      if (msg.type === 'world' && msg.terrain && msg.amount && msg.width) {
        const size = msg.width
        worldSizeRef.current = size
        setWorldSize(size)
        ensureWorldBuffer(size)
        terrainRef.current = new Uint8Array(msg.terrain)
        amountRef.current = new Uint16Array(msg.amount)
        biomeRef.current = msg.biome ? new Uint8Array(msg.biome) : new Uint8Array(size * size)
        paintBuffers(terrainRef.current, amountRef.current, biomeRef.current)
        const visible = DISPLAY_SIZE / zoomRef.current
        camRef.current = { x: worldPxOf(size) / 2 - visible / 2, y: worldPxOf(size) / 2 - visible / 2 }
        if (typeof msg.playing === 'boolean') setPlaying(msg.playing)
        if (msg.config) setLastConfig(msg.config)
        setWorldReady(true)
        setLaunching(false)
        setMenuOpen(false)
        startedRef.current = true
        return
      }
      if (msg.type === 'dirty' && msg.dirty) {
        flushDirty(msg.dirty)
        return
      }
      if (msg.type === 'draw' && msg.frame && 'villagers' in msg.frame) {
        viewRef.current = msg.frame
        return
      }
      if (msg.type === 'ui' && msg.frame && 'stats' in msg.frame) {
        const frame = msg.frame as UiFrame
        setStats(frame.stats)
        setChronicle(frame.chronicle)
        setGroups(frame.groups ?? [])
        // Light UI packs omit lineages/cultures/creeds — keep last full snapshot.
        if (frame.lineages && frame.lineages.length > 0) setLineages(frame.lineages)
        if (frame.cultures && frame.cultures.length > 0) setCultures(frame.cultures)
        if (frame.creeds && frame.creeds.length > 0) setCreeds(frame.creeds)
        if (frame.projects) setProjects(frame.projects)
        if (frame.bands) setBands(frame.bands)
        if (frame.religionSites) setReligionSites(frame.religionSites)
        setSimTps(frame.ticksPerSec)
        // Ignore stale UI packs from before a newer local click/deselect.
        // Do not clear local selection when selected is null — packSelected can fail
        // transiently while selectedId still matches; wiping would look like a dead click.
        if (frame.selectedId === selectedRef.current) {
          if (frame.selected !== null || frame.selectedId === null) {
            setSelected(frame.selected)
          }
        }
      }
    }
    // Pas de démarrage auto — le menu d'accueil lance la sim.
    return () => {
      worker.terminate()
      workerRef.current = null
    }
  }, [ensureWorldBuffer, flushDirty, paintBuffers])

  const clampCamera = useCallback(() => {
    const visible = DISPLAY_SIZE / zoomRef.current
    const worldPx = worldPxOf(worldSizeRef.current)
    camRef.current.x = clampNum(camRef.current.x, 0, Math.max(0, worldPx - visible))
    camRef.current.y = clampNum(camRef.current.y, 0, Math.max(0, worldPx - visible))
  }, [])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const world = worldCanvasRef.current
    if (!canvas || !world) return
    let ctx = viewCtxRef.current
    if (!ctx) {
      ctx =
        canvas.getContext('2d', { alpha: false, desynchronized: true }) ??
        canvas.getContext('2d', { alpha: false })
      viewCtxRef.current = ctx
    }
    if (!ctx) return

    const sel = selectedRef.current
    if (followRef.current && sel !== null) {
      const v = viewRef.current.villagers.find((x) => x.id === sel && x.alive)
      if (v) {
        const visible = DISPLAY_SIZE / zoomRef.current
        camRef.current.x = v.x * TILE_PX - visible / 2
        camRef.current.y = v.y * TILE_PX - visible / 2
        clampCamera()
      }
    }

    const zoom = zoomRef.current
    const camX = camRef.current.x
    const camY = camRef.current.y
    const visible = DISPLAY_SIZE / zoom

    ctx.imageSmoothingEnabled = false
    ctx.drawImage(
      world,
      camX / TILE_PX,
      camY / TILE_PX,
      visible / TILE_PX,
      visible / TILE_PX,
      0,
      0,
      DISPLAY_SIZE,
      DISPLAY_SIZE,
    )

    const season = viewRef.current.season
    if (season === 'winter') {
      ctx.fillStyle = 'rgba(186, 210, 228, 0.16)'
      ctx.fillRect(0, 0, DISPLAY_SIZE, DISPLAY_SIZE)
    } else if (season === 'autumn') {
      ctx.fillStyle = 'rgba(198, 128, 52, 0.08)'
      ctx.fillRect(0, 0, DISPLAY_SIZE, DISPLAY_SIZE)
    } else if (season === 'spring') {
      ctx.fillStyle = 'rgba(140, 190, 110, 0.045)'
      ctx.fillRect(0, 0, DISPLAY_SIZE, DISPLAY_SIZE)
    } else if (season === 'summer') {
      ctx.fillStyle = 'rgba(255, 220, 140, 0.035)'
      ctx.fillRect(0, 0, DISPLAY_SIZE, DISPLAY_SIZE)
    }

    const { villagers, sheep, horses, boats, wolves, bandits, bandCamps, polities, keeps, villages } =
      viewRef.current
    const tileS = TILE_PX * zoom
    const terrain = terrainRef.current
    const amount = amountRef.current
    if (terrain) {
      // roadView early-outs when zoomed far; close-up pass only when tiles are large enough.
      drawWornWays(ctx, terrain, camX, camY, zoom, visible, TILE_PX)
      if (amount && tileS >= 5.5) {
        drawCloseupTerrain(
          ctx,
          terrain,
          amount,
          camX,
          camY,
          zoom,
          visible,
          TILE_PX,
          performance.now(),
          biomeRef.current,
        )
      }
    }

    const size = Math.max(2.4, tileS * 1.35)
    const shadows = size >= 7
    const tx = (x: number) => (x * TILE_PX + TILE_PX / 2 - camX) * zoom
    const ty = (y: number) => (y * TILE_PX + TILE_PX / 2 - camY) * zoom
    const off = (sx: number, sy: number) => sx < -size || sy < -size || sx > DISPLAY_SIZE + size || sy > DISPLAY_SIZE + size

    const simpleSprites = size < 4.5

    // Soft clear-ring around villages — défrichement frontier at a glance.
    for (const vg of villages ?? []) {
      const sx = tx(vg.centerX)
      const sy = ty(vg.centerY)
      const r = Math.max(8, 18 * TILE_PX * zoom)
      if (sx + r < -4 || sy + r < -4 || sx - r > DISPLAY_SIZE + 4 || sy - r > DISPLAY_SIZE + 4) continue
      ctx.beginPath()
      ctx.arc(sx, sy, r, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(170, 150, 90, 0.06)'
      ctx.fill()
      ctx.strokeStyle = 'rgba(140, 120, 70, 0.18)'
      ctx.lineWidth = 0.7
      ctx.setLineDash([3, 4])
      ctx.stroke()
      ctx.setLineDash([])
    }

    // Sacred buildings (autel → chapelle → temple) under actors.
    for (const vg of villages ?? []) {
      if (!vg.hasShrine || vg.shrineX < 0 || vg.sacredTier === 'none') continue
      const sx = tx(vg.shrineX)
      const sy = ty(vg.shrineY)
      if (off(sx, sy)) continue
      const tier =
        vg.sacredTier === 'temple' || vg.sacredTier === 'chapel' ? vg.sacredTier : 'shrine'
      drawSacredSite(ctx, sx, sy, size, tier, simpleSprites, shadows)
      if (zoom >= 0.4) {
        ctx.fillStyle = 'rgba(230, 210, 160, 0.85)'
        ctx.font = `${Math.max(8, Math.round(9 * zoom))}px Georgia, serif`
        ctx.textAlign = 'center'
        const label = tier === 'temple' ? 'temple' : tier === 'chapel' ? 'chapelle' : 'autel'
        ctx.fillText(label, sx, sy + size * 0.95)
      }
    }

    // Territory claims (chefferies / royaumes) — soft rings under actors.
    for (const p of polities ?? []) {
      const sx = tx(p.cx)
      const sy = ty(p.cy)
      const r = Math.max(6, p.claimRadius * TILE_PX * zoom)
      if (sx + r < -4 || sy + r < -4 || sx - r > DISPLAY_SIZE + 4 || sy - r > DISPLAY_SIZE + 4) continue
      const kingdom = p.tier === 'kingdom'
      const chief = p.tier === 'chiefdom'
      ctx.beginPath()
      ctx.arc(sx, sy, r, 0, Math.PI * 2)
      ctx.fillStyle = kingdom
        ? 'rgba(180, 140, 55, 0.10)'
        : chief
          ? 'rgba(150, 110, 50, 0.08)'
          : 'rgba(120, 100, 70, 0.05)'
      ctx.fill()
      ctx.strokeStyle = kingdom
        ? 'rgba(210, 170, 70, 0.45)'
        : chief
          ? 'rgba(180, 140, 70, 0.35)'
          : 'rgba(140, 120, 80, 0.22)'
      ctx.lineWidth = kingdom ? 1.6 : chief ? 1.2 : 0.8
      ctx.stroke()
      if ((kingdom || chief) && zoom >= 0.35) {
        ctx.fillStyle = kingdom ? 'rgba(230, 200, 120, 0.75)' : 'rgba(200, 170, 110, 0.65)'
        ctx.font = `${Math.max(9, Math.round(10 * zoom))}px Georgia, serif`
        ctx.textAlign = 'center'
        ctx.fillText(p.name, sx, sy - r - 4)
      }
    }

    // Keep / donjon markers.
    for (const k of keeps ?? []) {
      const sx = tx(k.x)
      const sy = ty(k.y)
      if (off(sx, sy)) continue
      const hs = Math.max(3.5, tileS * (k.isCastle ? 1.15 : 0.85))
      ctx.fillStyle = k.done
        ? k.isCastle
          ? '#6a6e78'
          : '#7a6850'
        : 'rgba(120, 100, 70, 0.55)'
      // Keep silhouette: base + tower.
      ctx.fillRect(sx - hs * 0.55, sy - hs * 0.15, hs * 1.1, hs * 0.7)
      ctx.fillRect(sx - hs * 0.22, sy - hs * 0.95, hs * 0.44, hs * 0.9)
      if (k.isCastle && hs >= 5) {
        ctx.fillStyle = k.done ? '#8a909a' : 'rgba(150, 130, 90, 0.6)'
        ctx.fillRect(sx - hs * 0.28, sy - hs * 1.05, hs * 0.16, hs * 0.18)
        ctx.fillRect(sx + hs * 0.12, sy - hs * 1.05, hs * 0.16, hs * 0.18)
      }
      if (zoom >= 0.45 && k.isCastle) {
        ctx.fillStyle = 'rgba(210, 205, 195, 0.8)'
        ctx.font = `${Math.max(8, Math.round(9 * zoom))}px Georgia, serif`
        ctx.textAlign = 'center'
        ctx.fillText(k.done ? 'donjon' : 'chantier', sx, sy + hs * 0.95)
      }
    }

    for (const s of sheep) {
      if (!s.alive) continue
      const sx = tx(s.x)
      const sy = ty(s.y)
      if (off(sx, sy)) continue
      drawSheepSprite(ctx, sx, sy, size, s.captured, simpleSprites, shadows)
    }

    const boatPos = new Map<string, { sx: number; sy: number; bs: number }>()
    for (const b of boats) {
      if (!b.alive) continue
      const sx = tx(b.x)
      const sy = ty(b.y)
      if (sx < -14 || sy < -14 || sx > DISPLAY_SIZE + 14 || sy > DISPLAY_SIZE + 14) continue
      const cargo = b.kind === 'cargo'
      const bs = Math.max(2.4, tileS * (cargo ? 1.05 : 0.9))
      boatPos.set(`${b.x | 0},${b.y | 0}`, { sx, sy, bs })
      if (shadows) {
        ctx.fillStyle = 'rgba(0,0,0,0.25)'
        ctx.beginPath()
        ctx.ellipse(sx, sy + bs * 0.2, bs * 0.9, bs * 0.22, 0, 0, Math.PI * 2)
        ctx.fill()
      }
      // Fixed craft timber colors — never biome-washed.
      const hull = cargo ? '#4a3018' : '#a86a34'
      const deck = cargo ? '#6e4a28' : '#c89050'
      const gunwale = cargo ? '#3a2410' : '#7a4a22'
      if (bs < 5) {
        ctx.fillStyle = hull
        ctx.fillRect(sx - bs * 0.75, sy - bs * 0.28, bs * 1.5, bs * 0.55)
        ctx.fillStyle = deck
        ctx.fillRect(sx - bs * 0.55, sy - bs * 0.18, bs * 1.1, bs * 0.28)
        continue
      }
      // Hull silhouette
      ctx.fillStyle = hull
      ctx.beginPath()
      ctx.moveTo(sx - bs * 0.95, sy)
      ctx.quadraticCurveTo(sx - bs * 0.2, sy + bs * 0.42, sx + bs * 0.95, sy)
      ctx.quadraticCurveTo(sx - bs * 0.2, sy - bs * 0.38, sx - bs * 0.95, sy)
      ctx.closePath()
      ctx.fill()
      // Plank strakes along the hull
      if (bs >= 7) {
        ctx.strokeStyle = 'rgba(30, 18, 8, 0.35)'
        ctx.lineWidth = Math.max(0.6, bs * 0.04)
        for (let i = 0; i < 3; i++) {
          const yy = sy - bs * 0.18 + i * bs * 0.14
          ctx.beginPath()
          ctx.moveTo(sx - bs * 0.72, yy)
          ctx.quadraticCurveTo(sx, yy + bs * 0.08, sx + bs * 0.72, yy)
          ctx.stroke()
        }
        ctx.strokeStyle = 'rgba(210, 180, 120, 0.18)'
        ctx.beginPath()
        ctx.moveTo(sx - bs * 0.7, sy - bs * 0.12)
        ctx.quadraticCurveTo(sx, sy - bs * 0.06, sx + bs * 0.7, sy - bs * 0.12)
        ctx.stroke()
      }
      // Deck / thwart
      ctx.fillStyle = deck
      ctx.beginPath()
      ctx.ellipse(sx, sy - bs * 0.02, bs * 0.62, bs * 0.16, 0, 0, Math.PI * 2)
      ctx.fill()
      if (bs >= 8) {
        ctx.fillStyle = gunwale
        ctx.fillRect(sx - bs * 0.55, sy - bs * 0.1, bs * 1.1, Math.max(0.8, bs * 0.05))
        ctx.fillStyle = 'rgba(200, 168, 110, 0.22)'
        ctx.fillRect(sx - bs * 0.4, sy - bs * 0.08, bs * 0.8, Math.max(0.6, bs * 0.035))
      }
      // Mast + sail
      ctx.fillStyle = '#2e2214'
      ctx.fillRect(sx - 1, sy - bs * 0.78, Math.max(1.4, bs * 0.12), bs * 0.62)
      ctx.fillStyle = cargo ? '#d0c4a8' : '#f0e8d8'
      ctx.beginPath()
      ctx.moveTo(sx + 0.4, sy - bs * 0.72)
      ctx.lineTo(sx + bs * 0.42, sy - bs * 0.22)
      ctx.lineTo(sx + 0.4, sy - bs * 0.14)
      ctx.closePath()
      ctx.fill()
      if (cargo && bs >= 8) {
        ctx.fillStyle = '#8a6840'
        ctx.fillRect(sx - bs * 0.35, sy - bs * 0.12, bs * 0.5, bs * 0.18)
        ctx.fillStyle = 'rgba(40, 26, 12, 0.3)'
        ctx.fillRect(sx - bs * 0.32, sy - bs * 0.02, bs * 0.44, Math.max(0.6, bs * 0.04))
      }
    }

    for (const h of horses) {
      if (!h.alive || h.riderId !== null) continue
      const sx = tx(h.x)
      const sy = ty(h.y)
      if (off(sx, sy)) continue
      drawHorseSprite(ctx, sx, sy, size, h.tamed, simpleSprites, shadows)
    }

    for (const w of wolves) {
      if (!w.alive) continue
      const sx = tx(w.x)
      const sy = ty(w.y)
      if (off(sx, sy)) continue
      drawWolfSprite(ctx, sx, sy, size, simpleSprites, shadows)
    }

    for (const camp of bandCamps ?? []) {
      const sx = tx(camp.x)
      const sy = ty(camp.y)
      if (off(sx, sy)) continue
      drawBanditCampSprite(ctx, sx, sy, size * 1.15, camp.tier, simpleSprites, shadows)
    }

    for (const b of bandits ?? []) {
      if (!b.alive) continue
      const sx = tx(b.x)
      const sy = ty(b.y)
      if (off(sx, sy)) continue
      drawBanditSprite(ctx, sx, sy, size, b.phase, simpleSprites, shadows)
    }

    for (const v of villagers) {
      if (!v.alive) continue
      const sx = tx(v.x)
      const sy = ty(v.y)
      if (off(sx, sy)) continue

      if (v.embarked) {
        const boat = boatPos.get(`${v.x | 0},${v.y | 0}`)
        const bx = boat?.sx ?? sx
        const by = boat?.sy ?? sy
        const bs = boat?.bs ?? size
        drawEmbarkedVillagerSprite(
          ctx,
          bx,
          by,
          bs,
          {
            hue: v.hue,
            pigmentation: v.pigmentation,
            hairTone: v.hairTone,
            selected: v.id === sel,
          },
          simpleSprites,
        )
        continue
      }

      drawVillagerSprite(
        ctx,
        sx,
        sy,
        size,
        {
          hue: v.hue,
          pigmentation: v.pigmentation,
          hairTone: v.hairTone,
          sex: v.sex,
          age: v.age,
          hairStyle: v.hairStyle,
          beard: v.beard,
          facialHair: v.facialHair,
          hairCurl: v.hairCurl,
          toolTier: v.toolTier,
          cloak: v.cloak,
          gear: v.gear,
          mounted: v.mounted,
          hasCart: v.hasCart,
          grudge: v.grudgeTarget !== null,
          selected: v.id === sel,
        },
        simpleSprites,
        shadows,
      )
    }

    // Visual day/night only — sleep / temp / activity biases keep running in the worker.
    if (showDayNightRef.current) {
      const { night, warm } = dayNightVisual(viewRef.current.hour ?? 12)
      const prev = ctx.globalCompositeOperation

      // Soft atmospheric vignette for depth (day and night) — cool slate, not purple.
      {
        ctx.globalCompositeOperation = 'multiply'
        const vg = ctx.createRadialGradient(
          DISPLAY_SIZE * 0.5,
          DISPLAY_SIZE * 0.46,
          DISPLAY_SIZE * 0.2,
          DISPLAY_SIZE * 0.5,
          DISPLAY_SIZE * 0.5,
          DISPLAY_SIZE * 0.92,
        )
        const edgeA = 0.03 + night * 0.1
        vg.addColorStop(0, 'rgba(255, 255, 255, 0)')
        vg.addColorStop(0.55, `rgba(200, 205, 210, ${0.02 + night * 0.03})`)
        vg.addColorStop(1, `rgba(36, 42, 52, ${edgeA.toFixed(3)})`)
        ctx.fillStyle = vg
        ctx.fillRect(0, 0, DISPLAY_SIZE, DISPLAY_SIZE)
        ctx.globalCompositeOperation = prev
      }

      if (warm > 0.015) {
        // Amber wash — soft dawn/dusk, not neon orange.
        ctx.fillStyle = `rgba(232, 168, 110, ${(warm * 0.13).toFixed(3)})`
        ctx.fillRect(0, 0, DISPLAY_SIZE, DISPLAY_SIZE)
      }
      if (night > 0.03) {
        ctx.globalCompositeOperation = 'multiply'
        const g = ctx.createRadialGradient(
          DISPLAY_SIZE * 0.5,
          DISPLAY_SIZE * 0.4,
          DISPLAY_SIZE * 0.14,
          DISPLAY_SIZE * 0.5,
          DISPLAY_SIZE * 0.52,
          DISPLAY_SIZE * 0.82,
        )
        g.addColorStop(0, `rgba(52, 60, 74, ${(0.06 + night * 0.14).toFixed(3)})`)
        g.addColorStop(0.5, `rgba(28, 34, 46, ${(0.16 + night * 0.32).toFixed(3)})`)
        g.addColorStop(1, `rgba(10, 14, 24, ${(0.32 + night * 0.42).toFixed(3)})`)
        ctx.fillStyle = g
        ctx.fillRect(0, 0, DISPLAY_SIZE, DISPLAY_SIZE)
        ctx.globalCompositeOperation = 'source-over'
        // Thin cool lift so sprites stay readable under multiply.
        ctx.fillStyle = `rgba(78, 96, 122, ${(night * 0.045).toFixed(3)})`
        ctx.fillRect(0, 0, DISPLAY_SIZE, DISPLAY_SIZE)
        ctx.globalCompositeOperation = prev

        // Local fire / carried lights — warm pools over the dark overlay.
        const nightLights: ActorLight[] = []
        const packed = viewRef.current.lights
        if (packed) {
          for (let i = 0; i < packed.length; i++) nightLights.push(packed[i])
        }
        if (terrain) {
          collectTerrainHearths(
            terrain,
            worldSizeRef.current,
            camX,
            camY,
            visible,
            TILE_PX,
            nightLights,
          )
        }
        for (const v of villagers) {
          if (!v.alive || !v.holdingLight) continue
          nightLights.push({ x: v.x, y: v.y, kind: v.holdingLight })
        }
        drawLocalLightGlows(
          ctx,
          nightLights,
          night,
          (wx, wy) => ({ sx: tx(wx), sy: ty(wy) }),
          tileS,
          performance.now(),
          DISPLAY_SIZE,
        )
      }
    }
  }, [clampCamera])

  useEffect(() => {
    let cancelled = false
    let frames = 0
    let fpsClock = performance.now()
    let lastDraw = 0
    let drawInterval = DRAW_INTERVAL_MS

    const loop = (now: number) => {
      if (cancelled) return
      if (typeof document !== 'undefined' && document.hidden) {
        frameRef.current = requestAnimationFrame(loop)
        return
      }
      if (now - lastDraw >= drawInterval || lastDraw === 0) {
        draw()
        lastDraw = now
      }

      frames++
      if (now - fpsClock >= 1000) {
        const fpsNow = Math.round((frames * 1000) / (now - fpsClock))
        setFps(fpsNow)
        frames = 0
        fpsClock = now
        // Adaptive paint rate — protect main thread when FPS dips.
        drawInterval = fpsNow < 28 ? DRAW_INTERVAL_SLOW_MS : DRAW_INTERVAL_MS
      }

      frameRef.current = requestAnimationFrame(loop)
    }
    frameRef.current = requestAnimationFrame(loop)
    return () => {
      cancelled = true
      cancelAnimationFrame(frameRef.current)
    }
  }, [draw])

  const handleReset = useCallback(() => {
    setPlaying(false)
    workerRef.current?.postMessage({ type: 'play', playing: false })
    selectedRef.current = null
    setSelectedId(null)
    setSelected(null)
    setFollowing(false)
    setMenuOpen(true)
    setLaunching(false)
  }, [])

  const handleLaunch = useCallback((config: SimConfig) => {
    setLastConfig(config)
    setLaunching(true)
    setWorldReady(false)
    selectedRef.current = null
    setSelectedId(null)
    setSelected(null)
    setFollowing(false)
    setChronicle([])
    setGroups([])
    setLineages([])
    setCultures([])
    setCreeds([])
    setProjects([])
    setBands([])
    setReligionSites([])
    setStats(EMPTY_STATS)
    setPlaying(!config.startPaused)
    workerRef.current?.postMessage({ type: 'select', id: null })
    const kind = startedRef.current ? 'reset' : 'start'
    workerRef.current?.postMessage({ type: kind, seed: config.seed, config })
    workerRef.current?.postMessage({ type: 'speed', speed })
  }, [speed])

  const applyZoom = useCallback(
    (factor: number, screenX: number, screenY: number) => {
      const zoom = zoomRef.current
      const beforeX = camRef.current.x + screenX / zoom
      const beforeY = camRef.current.y + screenY / zoom
      const newZoom = clampNum(zoom * factor, minZoomOf(worldSizeRef.current), MAX_ZOOM)
      zoomRef.current = newZoom
      camRef.current.x = beforeX - screenX / newZoom
      camRef.current.y = beforeY - screenY / newZoom
      clampCamera()
      setZoomLabel(newZoom)
    },
    [clampCamera],
  )

  const getScaledPoint = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    // Canvas CSS stretches to a non-square .sim-map — use independent axes.
    const scaleX = canvas.width / Math.max(1, rect.width)
    const scaleY = canvas.height / Math.max(1, rect.height)
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    }
  }, [])

  const handleWheel = useCallback(
    (e: ReactWheelEvent<HTMLCanvasElement>) => {
      e.preventDefault()
      const point = getScaledPoint(e.clientX, e.clientY)
      applyZoom(Math.exp(-e.deltaY * 0.0015), point.x, point.y)
    },
    [applyZoom, getScaledPoint],
  )

  const handlePointerDown = useCallback((e: ReactPointerEvent<HTMLCanvasElement>) => {
    draggingRef.current = true
    lastPointerRef.current = { x: e.clientX, y: e.clientY }
    pointerDownRef.current = { x: e.clientX, y: e.clientY, t: performance.now() }
    dragDistRef.current = 0
    canvasRef.current?.setPointerCapture(e.pointerId)
  }, [])

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      if (!draggingRef.current) return
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / Math.max(1, rect.width)
      const scaleY = canvas.height / Math.max(1, rect.height)
      const dxScreen = (e.clientX - lastPointerRef.current.x) * scaleX
      const dyScreen = (e.clientY - lastPointerRef.current.y) * scaleY
      lastPointerRef.current = { x: e.clientX, y: e.clientY }
      // Peak displacement from down — never accumulate full range each move event.
      const dist = Math.hypot(e.clientX - pointerDownRef.current.x, e.clientY - pointerDownRef.current.y)
      if (dist > dragDistRef.current) dragDistRef.current = dist
      if (dragDistRef.current > CLICK_MAX_DRAG_PX && followRef.current) setFollowing(false)
      camRef.current.x -= dxScreen / zoomRef.current
      camRef.current.y -= dyScreen / zoomRef.current
      clampCamera()
    },
    [clampCamera],
  )

  const handlePointerUp = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      draggingRef.current = false
      try {
        canvasRef.current?.releasePointerCapture(e.pointerId)
      } catch {
        /* already released on leave */
      }
      const elapsed = performance.now() - pointerDownRef.current.t
      if (dragDistRef.current > CLICK_MAX_DRAG_PX || elapsed > CLICK_MAX_MS) return

      const point = getScaledPoint(e.clientX, e.clientY)
      // Match sprite centers: draw uses (x * TILE_PX + TILE_PX / 2).
      const worldX = (camRef.current.x + point.x / zoomRef.current) / TILE_PX - 0.5
      const worldY = (camRef.current.y + point.y / zoomRef.current) / TILE_PX - 0.5

      let closest: ActorVillager | null = null
      let bestD = SELECT_RADIUS_TILES
      for (const v of viewRef.current.villagers) {
        if (!v.alive) continue
        const d = Math.hypot(v.x - worldX, v.y - worldY)
        if (d <= bestD) {
          bestD = d
          closest = v
        }
      }
      const id = closest ? closest.id : null
      // Update ref + post select before React commit so UI frames can't race the click,
      // and re-clicking the same id still refreshes the worker reply.
      selectedRef.current = id
      workerRef.current?.postMessage({ type: 'select', id })
      setSelectedId(id)
      if (!closest) {
        setSelected(null)
        setFollowing(false)
      }
    },
    [getScaledPoint],
  )

  const handleZoomButton = useCallback((factor: number) => applyZoom(factor, DISPLAY_SIZE / 2, DISPLAY_SIZE / 2), [applyZoom])

  const handleRecenter = useCallback(() => {
    setFollowing(false)
    zoomRef.current = DEFAULT_ZOOM
    const visible = DISPLAY_SIZE / DEFAULT_ZOOM
    const mid = worldPxOf(worldSizeRef.current) / 2
    camRef.current = { x: mid - visible / 2, y: mid - visible / 2 }
    setZoomLabel(DEFAULT_ZOOM)
  }, [])

  const nameOf = useCallback((id: number) => viewRef.current.villagers.find((v) => v.id === id)?.name ?? `#${id}`, [])
  const handlePlay = useCallback(() => setPlaying((p) => !p), [])
  const handleFollow = useCallback(() => setFollowing((f) => !f), [])
  const handleCloseSelected = useCallback(() => {
    selectedRef.current = null
    workerRef.current?.postMessage({ type: 'select', id: null })
    setSelectedId(null)
    setSelected(null)
    setFollowing(false)
  }, [])
  const handlePointerCancel = useCallback((e: ReactPointerEvent<HTMLCanvasElement>) => {
    draggingRef.current = false
    try {
      canvasRef.current?.releasePointerCapture(e.pointerId)
    } catch {
      /* already released */
    }
  }, [])
  const handleZoomIn = useCallback(() => handleZoomButton(1.5), [handleZoomButton])
  const handleZoomOut = useCallback(() => handleZoomButton(1 / 1.5), [handleZoomButton])

  return (
    <div className="sim-app">
      {menuOpen && (
        <StartMenu initial={lastConfig} busy={launching} onLaunch={handleLaunch} />
      )}
      <div className={menuOpen ? 'sim-stage is-dimmed' : 'sim-stage'}>
        <div className="sim-map">
          <canvas
            ref={canvasRef}
            width={DISPLAY_SIZE}
            height={DISPLAY_SIZE}
            onWheel={handleWheel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
          />
          {launching && <div className="sim-boot">Génération du monde…</div>}
          {!menuOpen && !worldReady && !launching && (
            <div className="sim-boot">En attente du menu…</div>
          )}
        </div>
        <SimToolbar
          playing={playing}
          speed={speed}
          zoomLabel={zoomLabel}
          fps={fps}
          simTps={simTps}
          showDayNight={showDayNight}
          onShowDayNight={setShowDayNight}
          onPlay={handlePlay}
          onSpeed={setSpeed}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onRecenter={handleRecenter}
          onReset={handleReset}
        />
      </div>
      {!menuOpen && (
        <SimPanel
          stats={stats}
          chronicle={chronicle}
          groups={groups}
          lineages={lineages}
          cultures={cultures}
          creeds={creeds}
          projects={projects}
          bands={bands}
          religionSites={religionSites}
          selectedId={selectedId}
          selected={selected}
          nameOf={nameOf}
          following={following}
          onFollow={handleFollow}
          onCloseSelected={handleCloseSelected}
        />
      )}
    </div>
  )
}
