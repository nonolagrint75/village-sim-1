import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react'
import { SimPanel } from '@/components/SimPanel'
import { StartMenu } from '@/components/StartMenu'
import { SimToolbar } from '@/components/SimToolbar'
import { dayNightVisual } from '@/lib/sim/calendar'
import { TILE_PX, drawCloseupTerrain, tilePixel32 } from '@/lib/sim/tileArt'
import { drawWornWays } from '@/lib/sim/roadView'
import {
  EMPTY_STATS,
  type ActorVillager,
  type DirtyFrame,
  type DrawFrame,
  type SelectedVillager,
  type UiCountRow,
  type UiFrame,
  type UiGroupRow,
  type UiLineageRow,
} from '@/lib/sim/snapshot'
import { DEFAULT_SIM_CONFIG, type SimConfig } from '@/lib/sim/simConfig'
import { setWorldSize, type SimStats } from '@/lib/sim/types'

const DISPLAY_SIZE = 760
const MAX_ZOOM = 6
const DEFAULT_ZOOM = 2
const CLICK_MAX_DRAG_PX = 6
const CLICK_MAX_MS = 400
const SELECT_RADIUS_TILES = 3
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
  const viewRef = useRef<DrawFrame>({
    season: 'spring',
    hour: 12,
    villagers: [],
    sheep: [],
    horses: [],
    boats: [],
    wolves: [],
    villages: [],
    tradeLinks: [],
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

  const paintBuffers = useCallback((terrain: Uint8Array, amount: Uint16Array) => {
    const size = worldSizeRef.current
    const ctx = ensureWorldBuffer(size)
    const packed = worldPackedRef.current
    const image = worldPixelsRef.current
    if (!ctx || !packed || !image) return
    for (let y = 0; y < size; y++) {
      const row = y * size
      for (let x = 0; x < size; x++) {
        const i = row + x
        packed[i] = tilePixel32(terrain[i], amount[i], x, y)
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
    if (!ctx || !packed || !image || !terrain || !amount) return
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
      packed[i] = tilePixel32(terrain[i], amount[i], x, y)
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
        paintBuffers(terrainRef.current, amountRef.current)
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
        setSimTps(frame.ticksPerSec)
        // Ignore stale UI packs from before a newer local click/deselect.
        if (frame.selectedId === selectedRef.current) {
          setSelected(frame.selected)
          // Id was requested but entity is gone from state — drop local selection.
          if (frame.selected === null && frame.selectedId !== null) {
            selectedRef.current = null
            setSelectedId(null)
            setFollowing(false)
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

    const { villagers, sheep, horses, boats, wolves } = viewRef.current
    const tileS = TILE_PX * zoom
    const terrain = terrainRef.current
    const amount = amountRef.current
    if (terrain) {
      // roadView early-outs when zoomed far; close-up pass only when tiles are large enough.
      drawWornWays(ctx, terrain, camX, camY, zoom, visible, TILE_PX)
      if (amount && tileS >= 5.5) {
        drawCloseupTerrain(ctx, terrain, amount, camX, camY, zoom, visible, TILE_PX, performance.now())
      }
    }

    const size = Math.max(2.4, tileS * 1.35)
    const shadows = size >= 7
    const tx = (x: number) => (x * TILE_PX + TILE_PX / 2 - camX) * zoom
    const ty = (y: number) => (y * TILE_PX + TILE_PX / 2 - camY) * zoom
    const off = (sx: number, sy: number) => sx < -size || sy < -size || sx > DISPLAY_SIZE + size || sy > DISPLAY_SIZE + size
    const shadow = (sx: number, sy: number, rx: number, ry: number) => {
      if (!shadows) return
      ctx.fillStyle = 'rgba(0,0,0,0.28)'
      ctx.beginPath()
      ctx.ellipse(sx + rx * 0.15, sy + ry * 0.85, rx, ry * 0.45, 0, 0, Math.PI * 2)
      ctx.fill()
    }

    const simpleSprites = size < 4.5

    for (const s of sheep) {
      if (!s.alive) continue
      const sx = tx(s.x)
      const sy = ty(s.y)
      if (off(sx, sy)) continue
      if (simpleSprites) {
        ctx.fillStyle = s.captured ? '#f0ebe0' : '#d8ceb4'
        ctx.fillRect(sx - 1, sy - 1, 3, 3)
        continue
      }
      shadow(sx, sy, size * 0.42, size * 0.28)
      ctx.fillStyle = s.captured ? '#f4efe4' : '#ddd2ba'
      ctx.beginPath()
      ctx.ellipse(sx, sy, size * 0.48, size * 0.34, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = s.captured ? '#e8e0d0' : '#c8bea4'
      ctx.beginPath()
      ctx.ellipse(sx - size * 0.28, sy - size * 0.05, size * 0.22, size * 0.2, 0, 0, Math.PI * 2)
      ctx.fill()
      if (size >= 8) {
        ctx.fillStyle = '#2a2418'
        ctx.fillRect(sx - size * 0.42, sy - size * 0.12, size * 0.1, size * 0.08)
      }
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
      ctx.fillStyle = cargo ? '#4a3018' : '#b87a40'
      if (bs < 5) {
        ctx.fillRect(sx - bs * 0.75, sy - bs * 0.28, bs * 1.5, bs * 0.55)
        ctx.fillStyle = cargo ? '#6a4828' : '#d4a060'
        ctx.fillRect(sx - bs * 0.55, sy - bs * 0.18, bs * 1.1, bs * 0.28)
        continue
      }
      ctx.beginPath()
      ctx.moveTo(sx - bs * 0.95, sy)
      ctx.quadraticCurveTo(sx - bs * 0.2, sy + bs * 0.42, sx + bs * 0.95, sy)
      ctx.quadraticCurveTo(sx - bs * 0.2, sy - bs * 0.38, sx - bs * 0.95, sy)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = cargo ? '#6e4a28' : '#d4a060'
      ctx.beginPath()
      ctx.ellipse(sx, sy - bs * 0.02, bs * 0.62, bs * 0.16, 0, 0, Math.PI * 2)
      ctx.fill()
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
      }
    }

    for (const h of horses) {
      if (!h.alive || h.riderId !== null) continue
      const sx = tx(h.x)
      const sy = ty(h.y)
      if (off(sx, sy)) continue
      if (simpleSprites) {
        ctx.fillStyle = h.tamed ? '#8a6a45' : '#5e442c'
        ctx.fillRect(sx - 2, sy - 1, 4, 3)
        continue
      }
      shadow(sx, sy, size * 0.58, size * 0.28)
      ctx.fillStyle = h.tamed ? '#8a6a45' : '#5e442c'
      ctx.beginPath()
      ctx.ellipse(sx, sy, size * 0.7, size * 0.32, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillRect(sx + size * 0.42, sy - size * 0.52, size * 0.18, size * 0.48)
      ctx.fillStyle = h.tamed ? '#6e5234' : '#4a3420'
      ctx.fillRect(sx - size * 0.55, sy + size * 0.05, size * 0.18, size * 0.22)
      if (size >= 8) {
        ctx.fillStyle = '#2a2118'
        ctx.fillRect(sx + size * 0.55, sy - size * 0.35, size * 0.12, size * 0.08)
      }
    }

    for (const w of wolves) {
      if (!w.alive) continue
      const sx = tx(w.x)
      const sy = ty(w.y)
      if (off(sx, sy)) continue
      if (simpleSprites) {
        ctx.fillStyle = '#2a1e28'
        ctx.fillRect(sx - 1, sy - 1, 3, 2)
        continue
      }
      shadow(sx, sy, size * 0.48, size * 0.24)
      ctx.fillStyle = '#2e242c'
      ctx.beginPath()
      ctx.ellipse(sx, sy, size * 0.54, size * 0.28, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(sx + size * 0.28, sy - size * 0.2)
      ctx.lineTo(sx + size * 0.48, sy - size * 0.48)
      ctx.lineTo(sx + size * 0.08, sy - size * 0.24)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#1a1418'
      ctx.beginPath()
      ctx.moveTo(sx - size * 0.4, sy)
      ctx.lineTo(sx - size * 0.72, sy - size * 0.08)
      ctx.lineTo(sx - size * 0.42, sy + size * 0.12)
      ctx.closePath()
      ctx.fill()
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
        if (simpleSprites) {
          ctx.fillStyle = `hsl(${v.hue}, 50%, 48%)`
          ctx.fillRect(bx - 1, by - bs * 0.35, 2, 2)
          continue
        }
        ctx.fillStyle = `hsl(${v.hue}, 48%, 40%)`
        ctx.fillRect(bx - bs * 0.12, by - bs * 0.42, bs * 0.24, bs * 0.28)
        ctx.fillStyle = `hsl(${v.hue}, 55%, 62%)`
        ctx.beginPath()
        ctx.arc(bx, by - bs * 0.5, bs * 0.14, 0, Math.PI * 2)
        ctx.fill()
        if (v.id === sel) {
          ctx.strokeStyle = '#e8d078'
          ctx.lineWidth = 1.4
          ctx.beginPath()
          ctx.arc(bx, by - bs * 0.2, bs * 0.55, 0, Math.PI * 2)
          ctx.stroke()
        }
        continue
      }

      if (simpleSprites) {
        ctx.fillStyle = `hsl(${v.hue}, 46%, 42%)`
        ctx.fillRect(sx - 1, sy - 2, 3, 4)
        continue
      }

      if (!v.mounted) shadow(sx, sy + size * 0.15, size * 0.38, size * 0.22)

      if (v.mounted) {
        if (v.hasCart) {
          shadow(sx - size * 0.9, sy + size * 0.2, size * 0.4, size * 0.2)
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
        shadow(sx, sy + size * 0.35, size * 0.62, size * 0.26)
        ctx.fillStyle = '#8a6a45'
        ctx.beginPath()
        ctx.ellipse(sx, sy + size * 0.22, size * 0.72, size * 0.3, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#6e5234'
        ctx.fillRect(sx + size * 0.48, sy - size * 0.28, size * 0.16, size * 0.42)
      }

      const bodyW = size * 0.62
      const bodyH = size * 0.46
      const lift = v.mounted ? size * 0.28 : 0
      ctx.fillStyle = `hsl(${v.hue}, 48%, 34%)`
      ctx.fillRect(sx - bodyW / 2, sy - size * 0.02 - lift, bodyW, bodyH)
      ctx.fillStyle = `hsl(${v.hue}, 42%, 28%)`
      ctx.fillRect(sx - bodyW / 2, sy + bodyH * 0.55 - lift, bodyW, bodyH * 0.28)
      ctx.fillStyle = `hsl(${v.hue}, 55%, 62%)`
      ctx.beginPath()
      ctx.arc(sx, sy - size * 0.24 - lift, size * 0.24, 0, Math.PI * 2)
      ctx.fill()
      if (v.toolTier !== 'none') {
        ctx.strokeStyle = v.toolTier === 'iron' ? '#c87840' : v.toolTier === 'stone' ? '#d8d4c8' : '#2a2118'
        ctx.lineWidth = Math.max(0.7, size * 0.09)
        ctx.strokeRect(sx - bodyW / 2, sy - size * 0.02 - lift, bodyW, bodyH)
      }
      if (v.grudgeTarget !== null) {
        ctx.fillStyle = '#c43834'
        ctx.beginPath()
        ctx.arc(sx + size * 0.38, sy - size * 0.5 - lift, size * 0.13, 0, Math.PI * 2)
        ctx.fill()
      }
      if (v.id === sel) {
        ctx.strokeStyle = '#e8d078'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(sx, sy - lift * 0.3, size * 0.88, 0, Math.PI * 2)
        ctx.stroke()
      }
    }

    // Visual day/night only — sleep / temp / activity biases keep running in the worker.
    if (showDayNightRef.current) {
      const { night, warm } = dayNightVisual(viewRef.current.hour ?? 12)
      if (warm > 0.02) {
        ctx.fillStyle = `rgba(255, 148, 72, ${warm * 0.2})`
        ctx.fillRect(0, 0, DISPLAY_SIZE, DISPLAY_SIZE)
      }
      if (night > 0.04) {
        const prev = ctx.globalCompositeOperation
        ctx.globalCompositeOperation = 'multiply'
        const g = ctx.createRadialGradient(
          DISPLAY_SIZE * 0.5,
          DISPLAY_SIZE * 0.42,
          DISPLAY_SIZE * 0.12,
          DISPLAY_SIZE * 0.5,
          DISPLAY_SIZE * 0.5,
          DISPLAY_SIZE * 0.78,
        )
        g.addColorStop(0, `rgba(28, 36, 72, ${0.08 + night * 0.22})`)
        g.addColorStop(0.55, `rgba(10, 14, 36, ${0.22 + night * 0.42})`)
        g.addColorStop(1, `rgba(2, 4, 14, ${0.45 + night * 0.5})`)
        ctx.fillStyle = g
        ctx.fillRect(0, 0, DISPLAY_SIZE, DISPLAY_SIZE)
        ctx.globalCompositeOperation = prev
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
    const scale = canvas.width / rect.width
    return { x: (clientX - rect.left) * scale, y: (clientY - rect.top) * scale }
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
      const scale = canvas.width / rect.width
      const dxScreen = (e.clientX - lastPointerRef.current.x) * scale
      const dyScreen = (e.clientY - lastPointerRef.current.y) * scale
      lastPointerRef.current = { x: e.clientX, y: e.clientY }
      dragDistRef.current += Math.hypot(e.clientX - pointerDownRef.current.x, e.clientY - pointerDownRef.current.y)
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
      canvasRef.current?.releasePointerCapture(e.pointerId)
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
      // Update ref before React commit so a concurrent UI message can't wipe this click.
      selectedRef.current = closest ? closest.id : null
      setSelectedId(closest ? closest.id : null)
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
    setSelectedId(null)
    setSelected(null)
    setFollowing(false)
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
            onPointerLeave={handlePointerUp}
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
