import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { HouseShape } from '@/lib/sim/architecture'
import { countOf } from '@/lib/sim/inventory'
import { computeStats, createSimulation, stepSimulation } from '@/lib/sim/engine'
import { TILE_PX, tilePixel32 } from '@/lib/sim/tileArt'
import type { Ambition, MemoryKind } from '@/lib/sim/social'
import { WORLD_SIZE, type Profession, type Season, type SimStats, type TaskKind, type Villager } from '@/lib/sim/types'

const TASK_LABELS: Record<TaskKind, string> = {
  idle: 'Explore les environs',
  eat: 'Mange',
  gatherFood: 'Cueille des baies',
  gatherWood: 'Coupe du bois',
  gatherStone: 'Extrait de la pierre',
  gatherIron: 'Extrait du fer',
  mineTunnel: 'Creuse un tunnel dans la montagne',
  buyMaterial: 'Achète une matière première',
  mineGold: "Mine de l'or",
  mintCoins: 'Frappe des pièces',
  craftSpear: 'Taille une lance',
  craftStoneSpear: 'Affûte une lance en pierre',
  craftIronTool: 'Forge un outil en fer',
  weaveCloth: 'Tisse du tissu',
  sewClothing: 'Coud des vêtements',
  tanHide: 'Tanne une peau',
  buildHouse: 'Bâtit sa maison',
  buildWorkbench: 'Installe son établi',
  buildChest: 'Fabrique un coffre',
  buildBed: 'Fabrique un lit',
  buildPen: 'Monte un enclos',
  buildWall: "Élève l'enceinte",
  buildBridge: 'Construit un pont',
  buildMill: 'Bâtit le moulin',
  buildCart: 'Construit une charrette',
  buildBoat: 'Met un bateau à l’eau',
  buildPort: 'Bâtit le port',
  sowField: 'Sème son champ',
  harvestWheat: 'Moissonne le blé',
  grindFlour: 'Moud la farine',
  bakeBread: 'Cuit du pain',
  captureSheep: 'Attrape un mouton',
  feedPen: 'Nourrit le bétail',
  storeChest: 'Range ses réserves',
  takeFromChest: 'Puise dans son coffre',
  flee: 'Fuit un loup',
  fight: 'Affronte un loup',
  rest: 'Se repose chez lui',
  socialise: 'Discute avec quelqu’un',
  steal: 'Se sert chez un autre',
  giveFood: 'Partage sa nourriture',
  confront: 'Règle ses comptes',
  defend: 'Vole au secours de quelqu’un',
  fish: 'Pêche au bord de l’eau',
  tameHorse: 'Approche un cheval sauvage',
  mount: 'Se met en selle',
  feedHorse: 'Nourrit son cheval',
  tradeRun: 'Part commercer dans un autre village',
}

const PROFESSION_LABELS: Record<Profession, string> = {
  none: 'sans métier',
  forager: 'cueilleur',
  farmer: 'fermier',
  fisher: 'pêcheur',
  miller: 'meunier',
  lumberjack: 'bûcheron',
  mason: 'tailleur de pierre',
  guard: 'garde',
  builder: 'bâtisseur',
  herder: 'éleveur',
  trader: 'marchand',
  weaver: 'tisserand',
  blacksmith: 'forgeron',
  miner: 'mineur',
}

const AMBITION_LABELS: Record<Ambition, string> = {
  survive: 'survivre',
  wealth: 'amasser une fortune',
  family: 'fonder une famille',
  protector: 'protéger les siens',
  builder: 'bâtir quelque chose',
  explorer: 'voir le monde',
  revenge: 'se venger',
  leader: 'mener le village',
}

const SHAPE_LABELS: Record<HouseShape, string> = {
  square: 'carrée',
  rect: 'rectangulaire',
  round: 'ronde',
  ell: 'en L',
  courtyard: 'à cour',
  longhouse: 'longue',
}

const MEMORY_LABELS: Record<MemoryKind, string> = {
  helped: 'm’a aidé',
  harmed: 'm’a frappé',
  robbed: 'm’a volé',
  sawTheft: 'je l’ai vu voler',
  sawKill: 'je l’ai vu tuer',
  grief: 'je l’ai perdu',
  saved: 'm’a sauvé la vie',
  goodSpot: 'endroit nourricier',
  dangerSpot: 'endroit dangereux',
}

const RESOURCE_LABELS_FR: Record<string, string> = {
  wood: 'Bois',
  stone: 'Pierre',
  iron: 'Fer',
  wool: 'Laine',
  cloth: 'Tissu',
  clothing: 'Vêtements',
  hide: 'Peau',
  leather: 'Cuir',
  bread: 'Pain',
}

const SEASON_LABELS: Record<Season, string> = { spring: 'Printemps', summer: 'Été', autumn: 'Automne', winter: 'Hiver' }
const SEASON_COLORS: Record<Season, string> = { spring: '#7fb356', summer: '#e0b93f', autumn: '#c9793a', winter: '#8fb7cf' }

const DISPLAY_SIZE = 760
const WORLD_PX = WORLD_SIZE * TILE_PX
const MIN_ZOOM = DISPLAY_SIZE / WORLD_PX
const MAX_ZOOM = 6
const DEFAULT_ZOOM = 2
const SPEED_OPTIONS = [1, 2, 4, 8]
const TICK_INTERVAL_MS = 130
const MAX_TICKS_PER_FRAME = 3
const FRAME_CPU_MS = 8
const CLICK_MAX_DRAG_PX = 6
const CLICK_MAX_MS = 400
const SELECT_RADIUS_TILES = 3
const UI_REFRESH_MS = 400
const DRAW_INTERVAL_MS = 33
const WORLD_TILES = WORLD_SIZE
const DIRTY_FULL_FLUSH = 600

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
  const stateRef = useRef(createSimulation(1))
  const playingRef = useRef(true)
  const speedRef = useRef(1)
  const frameRef = useRef<number>(0)
  const lastTimeRef = useRef<number | null>(null)
  const accumulatorRef = useRef(0)
  const lastUiRef = useRef(0)

  const camRef = useRef({ x: 0, y: 0 })
  const zoomRef = useRef(DEFAULT_ZOOM)
  const draggingRef = useRef(false)
  const lastPointerRef = useRef({ x: 0, y: 0 })
  const pointerDownRef = useRef({ x: 0, y: 0, t: 0 })
  const dragDistRef = useRef(0)
  const followRef = useRef(false)
  const selectedRef = useRef<number | null>(null)

  const [playing, setPlaying] = useState(true)
  const [speed, setSpeed] = useState(1)
  const [zoomLabel, setZoomLabel] = useState(DEFAULT_ZOOM)
  const [stats, setStats] = useState<SimStats>(() => computeStats(stateRef.current))
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [following, setFollowing] = useState(false)
  const [chronicle, setChronicle] = useState<string[]>([])
  const [fps, setFps] = useState(0)

  useEffect(() => {
    playingRef.current = playing
  }, [playing])
  useEffect(() => {
    speedRef.current = speed
  }, [speed])
  useEffect(() => {
    followRef.current = following
  }, [following])
  useEffect(() => {
    selectedRef.current = selectedId
  }, [selectedId])

  const ensureWorldBuffer = useCallback(() => {
    let canvas = worldCanvasRef.current
    if (!canvas) {
      canvas = document.createElement('canvas')
      canvas.width = WORLD_TILES
      canvas.height = WORLD_TILES
      worldCanvasRef.current = canvas
      worldCtxRef.current = canvas.getContext('2d', { alpha: false, desynchronized: true })
    }
    const ctx = worldCtxRef.current
    if (!ctx) return null
    if (!worldPixelsRef.current) {
      const image = ctx.createImageData(WORLD_TILES, WORLD_TILES)
      worldPixelsRef.current = image
      worldPackedRef.current = new Uint32Array(image.data.buffer)
    }
    return ctx
  }, [])

  const paintWorld = useCallback(() => {
    const ctx = ensureWorldBuffer()
    const packed = worldPackedRef.current
    const image = worldPixelsRef.current
    if (!ctx || !packed || !image) return
    const grid = stateRef.current.grid
    const terrain = grid.terrain
    const amount = grid.amount
    const w = grid.width
    const h = grid.height
    for (let y = 0; y < h; y++) {
      const row = y * w
      for (let x = 0; x < w; x++) {
        const i = row + x
        packed[i] = tilePixel32(terrain[i], amount[i], x, y)
      }
    }
    ctx.putImageData(image, 0, 0)
    grid.dirty.length = 0
  }, [ensureWorldBuffer])

  const flushDirty = useCallback(() => {
    const grid = stateRef.current.grid
    const ctx = worldCtxRef.current
    const packed = worldPackedRef.current
    const image = worldPixelsRef.current
    const dirty = grid.dirty
    if (!ctx || !packed || !image || dirty.length === 0) return
    const w = grid.width
    const n = dirty.length
    for (let k = 0; k < n; k++) {
      const i = dirty[k]
      const x = i % w
      const y = (i / w) | 0
      packed[i] = tilePixel32(grid.terrain[i], grid.amount[i], x, y)
    }
    if (n >= DIRTY_FULL_FLUSH) {
      ctx.putImageData(image, 0, 0)
    } else {
      for (let k = 0; k < n; k++) {
        const i = dirty[k]
        const p = packed[i]
        ctx.fillStyle = `rgb(${p & 255},${(p >> 8) & 255},${(p >> 16) & 255})`
        ctx.fillRect(i % w, (i / w) | 0, 1, 1)
      }
    }
    dirty.length = 0
  }, [])

  useEffect(() => {
    paintWorld()
    const visible = DISPLAY_SIZE / zoomRef.current
    camRef.current = { x: WORLD_PX / 2 - visible / 2, y: WORLD_PX / 2 - visible / 2 }
  }, [paintWorld])

  const clampCamera = useCallback(() => {
    const visible = DISPLAY_SIZE / zoomRef.current
    camRef.current.x = clampNum(camRef.current.x, 0, Math.max(0, WORLD_PX - visible))
    camRef.current.y = clampNum(camRef.current.y, 0, Math.max(0, WORLD_PX - visible))
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
      const v = stateRef.current.villagers.find((x) => x.id === sel && x.alive)
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

    const season = stateRef.current.season
    if (season === 'winter') {
      ctx.fillStyle = 'rgba(190, 214, 232, 0.18)'
      ctx.fillRect(0, 0, DISPLAY_SIZE, DISPLAY_SIZE)
    } else if (season === 'autumn') {
      ctx.fillStyle = 'rgba(206, 140, 62, 0.09)'
      ctx.fillRect(0, 0, DISPLAY_SIZE, DISPLAY_SIZE)
    }

    const { villagers, sheep, horses, boats, wolves, villages } = stateRef.current
    const size = Math.max(3, TILE_PX * zoom * 1.4)
    const tx = (x: number) => (x * TILE_PX + TILE_PX / 2 - camX) * zoom
    const ty = (y: number) => (y * TILE_PX + TILE_PX / 2 - camY) * zoom
    const off = (sx: number, sy: number) => sx < -size || sy < -size || sx > DISPLAY_SIZE + size || sy > DISPLAY_SIZE + size

    for (const vg of villages) {
      if (vg.wallTier !== 'none' || vg.perimeter.length === 0) continue
      ctx.fillStyle = 'rgba(255, 224, 102, 0.26)'
      for (const c of vg.perimeter) {
        const sx = tx(c.x)
        const sy = ty(c.y)
        if (off(sx, sy)) continue
        ctx.fillRect(sx - zoom, sy - zoom, TILE_PX * zoom, TILE_PX * zoom)
      }
      ctx.fillStyle = 'rgba(120, 220, 255, 0.5)'
      for (const g of vg.gates) {
        const sx = tx(g.x)
        const sy = ty(g.y)
        if (off(sx, sy)) continue
        ctx.fillRect(sx - zoom, sy - zoom, TILE_PX * zoom, TILE_PX * zoom)
      }
    }

    const simpleSprites = size < 5
    for (const s of sheep) {
      if (!s.alive) continue
      const sx = tx(s.x)
      const sy = ty(s.y)
      if (off(sx, sy)) continue
      ctx.fillStyle = s.captured ? '#f6f1e4' : '#e2d6b4'
      if (simpleSprites) {
        ctx.fillRect(sx - 1, sy - 1, 3, 3)
        continue
      }
      ctx.beginPath()
      ctx.ellipse(sx, sy, size * 0.5, size * 0.38, 0, 0, Math.PI * 2)
      ctx.fill()
    }

    for (const b of boats) {
      if (!b.alive) continue
      const sx = tx(b.x)
      const sy = ty(b.y)
      if (off(sx, sy)) continue
      const w = b.kind === 'cargo' ? size * 0.95 : size * 0.65
      ctx.fillStyle = b.kind === 'cargo' ? '#7a5a38' : '#9c7a4e'
      ctx.beginPath()
      ctx.ellipse(sx, sy, w * 0.5, size * 0.24, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#e8e2d4'
      ctx.fillRect(sx - 0.5, sy - size * 0.4, 1, size * 0.4)
    }

    for (const h of horses) {
      if (!h.alive || h.riderId !== null) continue
      const sx = tx(h.x)
      const sy = ty(h.y)
      if (off(sx, sy)) continue
      ctx.fillStyle = h.tamed ? '#8a6a45' : '#6b4f33'
      ctx.beginPath()
      ctx.ellipse(sx, sy, size * 0.72, size * 0.34, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillRect(sx + size * 0.45, sy - size * 0.55, size * 0.2, size * 0.5)
    }

    for (const w of wolves) {
      if (!w.alive) continue
      const sx = tx(w.x)
      const sy = ty(w.y)
      if (off(sx, sy)) continue
      ctx.fillStyle = '#332531'
      ctx.beginPath()
      ctx.ellipse(sx, sy, size * 0.56, size * 0.3, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(sx + size * 0.26, sy - size * 0.22)
      ctx.lineTo(sx + size * 0.44, sy - size * 0.46)
      ctx.lineTo(sx + size * 0.1, sy - size * 0.26)
      ctx.closePath()
      ctx.fill()
    }

    for (const v of villagers) {
      if (!v.alive) continue
      const sx = tx(v.x)
      const sy = ty(v.y)
      if (off(sx, sy)) continue
      if (v.mounted) {
        if (v.hasCart) {
          ctx.fillStyle = '#5c4630'
          ctx.fillRect(sx - size * 1.15, sy, size * 0.5, size * 0.32)
        }
        ctx.fillStyle = '#8a6a45'
        ctx.beginPath()
        ctx.ellipse(sx, sy + size * 0.25, size * 0.75, size * 0.32, 0, 0, Math.PI * 2)
        ctx.fill()
      }
      const bodyW = size * 0.66
      const bodyH = size * 0.48
      const lift = v.mounted ? size * 0.3 : 0
      ctx.fillStyle = `hsl(${v.hue}, 46%, 36%)`
      ctx.fillRect(sx - bodyW / 2, sy - size * 0.02 - lift, bodyW, bodyH)
      ctx.fillStyle = `hsl(${v.hue}, 56%, 64%)`
      ctx.beginPath()
      ctx.arc(sx, sy - size * 0.26 - lift, size * 0.26, 0, Math.PI * 2)
      ctx.fill()
      if (v.toolTier !== 'none') {
        ctx.strokeStyle = v.toolTier === 'iron' ? '#d68a52' : v.toolTier === 'stone' ? '#e6e1d3' : '#2a2118'
        ctx.lineWidth = Math.max(0.6, size * 0.1)
        ctx.strokeRect(sx - bodyW / 2, sy - size * 0.02 - lift, bodyW, bodyH)
      }
      if (v.grudgeTarget !== null) {
        ctx.fillStyle = '#d4443f'
        ctx.beginPath()
        ctx.arc(sx + size * 0.4, sy - size * 0.55 - lift, size * 0.15, 0, Math.PI * 2)
        ctx.fill()
      }
      if (v.id === sel) {
        ctx.strokeStyle = '#ffe066'
        ctx.lineWidth = 1.6
        ctx.beginPath()
        ctx.arc(sx, sy, size * 0.9, 0, Math.PI * 2)
        ctx.stroke()
      }
    }
  }, [clampCamera])

  useEffect(() => {
    let cancelled = false
    let frames = 0
    let fpsClock = performance.now()
    let lastDraw = 0

    const loop = (now: number) => {
      if (cancelled) return
      if (lastTimeRef.current === null) lastTimeRef.current = now
      const dt = now - lastTimeRef.current
      lastTimeRef.current = now

      if (playingRef.current) {
        accumulatorRef.current = Math.min(
          accumulatorRef.current + dt * speedRef.current,
          TICK_INTERVAL_MS * MAX_TICKS_PER_FRAME,
        )
        let ticked = false
        const cpuStart = performance.now()
        let steps = 0
        while (accumulatorRef.current >= TICK_INTERVAL_MS && steps < MAX_TICKS_PER_FRAME) {
          stepSimulation(stateRef.current)
          accumulatorRef.current -= TICK_INTERVAL_MS
          ticked = true
          steps++
          if (performance.now() - cpuStart > FRAME_CPU_MS) break
        }
        if (ticked) flushDirty()
      }
      if (now - lastDraw >= DRAW_INTERVAL_MS || lastDraw === 0) {
        draw()
        lastDraw = now
      }

      frames++
      if (now - fpsClock >= 1000) {
        setFps(Math.round((frames * 1000) / (now - fpsClock)))
        frames = 0
        fpsClock = now
      }
      if (now - lastUiRef.current >= UI_REFRESH_MS) {
        lastUiRef.current = now
        setStats(computeStats(stateRef.current))
        setChronicle(stateRef.current.log.slice(-12).reverse())
      }

      frameRef.current = requestAnimationFrame(loop)
    }
    frameRef.current = requestAnimationFrame(loop)
    return () => {
      cancelled = true
      cancelAnimationFrame(frameRef.current)
    }
  }, [draw, flushDirty])

  const handleReset = useCallback(() => {
    stateRef.current = createSimulation(Math.floor(Math.random() * 100000))
    accumulatorRef.current = 0
    setSelectedId(null)
    setFollowing(false)
    setChronicle([])
    paintWorld()
    setStats(computeStats(stateRef.current))
  }, [paintWorld])

  const applyZoom = useCallback(
    (factor: number, screenX: number, screenY: number) => {
      const zoom = zoomRef.current
      const beforeX = camRef.current.x + screenX / zoom
      const beforeY = camRef.current.y + screenY / zoom
      const newZoom = clampNum(zoom * factor, MIN_ZOOM, MAX_ZOOM)
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
      const worldX = (camRef.current.x + point.x / zoomRef.current) / TILE_PX
      const worldY = (camRef.current.y + point.y / zoomRef.current) / TILE_PX

      let closest: Villager | null = null
      let bestD = SELECT_RADIUS_TILES
      for (const v of stateRef.current.villagers) {
        if (!v.alive) continue
        const d = Math.hypot(v.x - worldX, v.y - worldY)
        if (d <= bestD) {
          bestD = d
          closest = v
        }
      }
      setSelectedId(closest ? closest.id : null)
      if (!closest) setFollowing(false)
    },
    [getScaledPoint],
  )

  const handleZoomButton = useCallback((factor: number) => applyZoom(factor, DISPLAY_SIZE / 2, DISPLAY_SIZE / 2), [applyZoom])

  const handleRecenter = useCallback(() => {
    setFollowing(false)
    zoomRef.current = DEFAULT_ZOOM
    const visible = DISPLAY_SIZE / DEFAULT_ZOOM
    camRef.current = { x: WORLD_PX / 2 - visible / 2, y: WORLD_PX / 2 - visible / 2 }
    setZoomLabel(DEFAULT_ZOOM)
  }, [])

  const selected = selectedId !== null ? stateRef.current.villagers.find((v) => v.id === selectedId && v.alive) : undefined
  const nameOf = (id: number) => stateRef.current.villagers.find((v) => v.id === id)?.name ?? `#${id}`
  const bonds = selected ? [...selected.relations.entries()].sort((a, b) => Math.abs(b[1].affinity) - Math.abs(a[1].affinity)).slice(0, 4) : []
  const recalled = selected ? [...selected.memories].sort((a, b) => b.weight - a.weight).slice(0, 4) : []
  const topShapes = Object.entries(stats.shapes)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
  const marketRows = Object.entries(stats.prices).filter(([, p]) => typeof p === 'number') as [string, number][]

  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
      <div className="flex flex-col gap-3">
        <div
          className="touch-none select-none overflow-hidden rounded-md border border-border bg-black/80"
          style={{ width: 'min(92vw, 760px)', aspectRatio: '1 / 1' }}
        >
          <canvas
            ref={canvasRef}
            width={DISPLAY_SIZE}
            height={DISPLAY_SIZE}
            style={{ width: '100%', height: '100%', imageRendering: 'pixelated', cursor: 'grab' }}
            onWheel={handleWheel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => setPlaying((p) => !p)}>
            {playing ? 'Pause' : 'Lecture'}
          </Button>
          <div className="flex items-center gap-1">
            {SPEED_OPTIONS.map((opt) => (
              <Button key={opt} size="sm" variant={speed === opt ? 'default' : 'outline'} onClick={() => setSpeed(opt)}>
                {opt}x
              </Button>
            ))}
          </div>
          <Separator orientation="vertical" className="h-6" />
          <Button size="sm" variant="outline" onClick={() => handleZoomButton(1.5)}>
            Zoom +
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleZoomButton(1 / 1.5)}>
            Zoom −
          </Button>
          <Button size="sm" variant="outline" onClick={handleRecenter}>
            Recentrer
          </Button>
          {selected && (
            <Button size="sm" variant={following ? 'default' : 'outline'} onClick={() => setFollowing((f) => !f)}>
              {following ? 'Ne plus suivre' : `Suivre ${selected.name}`}
            </Button>
          )}
          <span className="text-xs text-muted-foreground">×{zoomLabel.toFixed(1)} · {fps} i/s</span>
          <Separator orientation="vertical" className="h-6" />
          <Button size="sm" variant="outline" onClick={handleReset}>
            Nouveau monde
          </Button>
        </div>

        {selected && (
          <Card className="w-full max-w-xl p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-foreground">
                {selected.name} <span className="text-muted-foreground">· {PROFESSION_LABELS[selected.profession]}</span>
              </h2>
              <Button size="sm" variant="outline" onClick={() => setSelectedId(null)}>
                Fermer
              </Button>
            </div>
            <p className="mt-1 text-sm text-foreground">
              {selected.task ? TASK_LABELS[selected.task.kind] : 'Réfléchit'}
              {selected.mounted ? ' — à cheval' : ''}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Veut {AMBITION_LABELS[selected.ambition]}
              {selected.grudgeTarget !== null ? ` · en veut à ${nameOf(selected.grudgeTarget)}` : ''}
            </p>
            <Separator className="my-3" />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <MeterRow label="Santé" value={selected.health} max={4} color="var(--text-danger)" />
                <MeterRow label="Faim" value={selected.hunger} max={4} color="var(--text-accent)" />
                <div className="pt-1 text-xs text-muted-foreground">
                  {selected.house ? (
                    <p>
                      Maison {SHAPE_LABELS[selected.house.shape]} {selected.house.rx * 2 + 1}×{selected.house.ry * 2 + 1}
                      {selected.house.hasWorkshop ? ', atelier' : ''}
                      {selected.house.hasStoreroom ? ', réserve' : ''}
                    </p>
                  ) : (
                    <p>Maison : pas encore conçue</p>
                  )}
                  <p>
                    {countOf(selected.inventory, 'coin')} pièces
                    {selected.horseId !== null ? ' · a un cheval' : ''}
                    {selected.hasCart ? ' + charrette' : ''}
                    {selected.boatId !== null ? ' · possède un bateau' : ''}
                  </p>
                  <p>
                    Outils : {selected.toolTier === 'none' ? 'aucun' : selected.toolTier === 'wood' ? 'bois' : selected.toolTier === 'stone' ? 'pierre' : 'fer'}
                    {countOf(selected.inventory, 'clothing') > 0 ? ' · vêtu' : ''}
                    {countOf(selected.inventory, 'leather') > 0 ? ' · en cuir' : ''}
                  </p>
                </div>
              </div>
              <div className="space-y-1.5">
                <TraitBar label="Courage" value={selected.personality.courage} />
                <TraitBar label="Sociabilité" value={selected.personality.sociability} />
                <TraitBar label="Ambition" value={selected.personality.ambition} />
                <TraitBar label="Générosité" value={selected.personality.generosity} />
                <TraitBar label="Curiosité" value={selected.personality.curiosity} />
              </div>
            </div>

            <Separator className="my-3" />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-xs font-medium text-foreground">Relations</h3>
                {bonds.length === 0 ? (
                  <p className="mt-1 text-xs text-muted-foreground">Personne encore.</p>
                ) : (
                  <ul className="mt-1 space-y-1 text-xs">
                    {bonds.map(([id, rel]) => (
                      <li key={id} className="flex items-center justify-between">
                        <span className="text-muted-foreground">{nameOf(id)}</span>
                        <span style={{ color: rel.affinity >= 0 ? '#7fb356' : '#d4443f' }}>
                          {rel.affinity > 0.6 ? 'très proche' : rel.affinity > 0.2 ? 'ami' : rel.affinity > -0.2 ? 'neutre' : rel.affinity > -0.6 ? 'hostile' : 'ennemi'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3 className="text-xs font-medium text-foreground">Souvenirs</h3>
                {recalled.length === 0 ? (
                  <p className="mt-1 text-xs text-muted-foreground">Rien de marquant.</p>
                ) : (
                  <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                    {recalled.map((m, i) => (
                      <li key={i}>
                        {m.subjectId !== null ? `${nameOf(m.subjectId)} — ` : ''}
                        {MEMORY_LABELS[m.kind]}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </Card>
        )}
      </div>

      <div className="flex w-full max-w-xs flex-col gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">An {stats.year}</h2>
            <span className="text-sm font-medium" style={{ color: SEASON_COLORS[stats.season] }}>
              {SEASON_LABELS[stats.season]}
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.round(stats.seasonProgress * 100)}%`, backgroundColor: SEASON_COLORS[stats.season] }}
            />
          </div>
          {stats.famine && <p className="mt-2 text-xs font-medium text-[var(--text-danger)]">Famine</p>}
          <Separator className="my-3" />
          <dl className="grid grid-cols-2 gap-y-1.5 text-sm">
            <dt className="text-muted-foreground">Bonhommes</dt>
            <dd className="text-right text-foreground">{stats.villagers}</dd>
            <dt className="text-muted-foreground">Naissances</dt>
            <dd className="text-right text-foreground">{stats.births}</dd>
            <dt className="text-muted-foreground">Morts</dt>
            <dd className="text-right text-foreground">{stats.deaths}</dd>
            <dt className="text-muted-foreground">Maisons</dt>
            <dd className="text-right text-foreground">{stats.houses}</dd>
            <dt className="text-muted-foreground">Villages</dt>
            <dd className="text-right text-foreground">{stats.villages}</dd>
            <dt className="text-muted-foreground">Chevaux dressés</dt>
            <dd className="text-right text-foreground">{stats.horsesTamed}</dd>
            <dt className="text-muted-foreground">Cavaliers</dt>
            <dd className="text-right text-foreground">{stats.riders}</dd>
            <dt className="text-muted-foreground">Charrettes</dt>
            <dd className="text-right text-foreground">{stats.carts}</dd>
            <dt className="text-muted-foreground">Bateaux</dt>
            <dd className="text-right text-foreground">{stats.boats}</dd>
            <dt className="text-muted-foreground">Ports</dt>
            <dd className="text-right text-foreground">{stats.ports}</dd>
            <dt className="text-muted-foreground">Voyages commerciaux</dt>
            <dd className="text-right text-foreground">{stats.tradeRunsTotal}</dd>
            <dt className="text-muted-foreground">Voies tracées</dt>
            <dd className="text-right text-foreground">{stats.roadTiles}</dd>
            <dt className="text-muted-foreground">Enceinte bâtie</dt>
            <dd className="text-right text-foreground">{stats.wallTiles}</dd>
            <dt className="text-muted-foreground">Couvert par l'eau</dt>
            <dd className="text-right text-foreground">{stats.naturalCover}</dd>
            <dt className="text-muted-foreground">Ponts</dt>
            <dd className="text-right text-foreground">{stats.bridges}</dd>
            <dt className="text-muted-foreground">Amitiés</dt>
            <dd className="text-right text-foreground">{stats.friendships}</dd>
            <dt className="text-muted-foreground">Inimitiés</dt>
            <dd className="text-right text-foreground">{stats.feuds}</dd>
            <dt className="text-muted-foreground">Loups</dt>
            <dd className="text-right text-foreground">{stats.wolves}</dd>
            <dt className="text-muted-foreground">Tisserands</dt>
            <dd className="text-right text-foreground">{stats.professions.weaver}</dd>
            <dt className="text-muted-foreground">Forgerons</dt>
            <dd className="text-right text-foreground">{stats.professions.blacksmith}</dd>
          </dl>
          {topShapes.length > 0 && (
            <>
              <Separator className="my-3" />
              <h3 className="text-xs font-medium text-foreground">Architecture</h3>
              <dl className="mt-2 grid grid-cols-2 gap-y-1 text-xs">
                {topShapes.map(([shape, n]) => (
                  <div key={shape} className="contents">
                    <dt className="text-muted-foreground">{SHAPE_LABELS[shape as HouseShape]}</dt>
                    <dd className="text-right text-foreground">{n}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}
        </Card>

        {marketRows.length > 0 && (
          <Card className="p-4">
            <h2 className="text-sm font-medium text-foreground">Marché</h2>
            <Separator className="my-3" />
            <dl className="grid grid-cols-2 gap-y-1.5 text-sm">
              {marketRows.map(([res, price]) => (
                <div key={res} className="contents">
                  <dt className="text-muted-foreground">{RESOURCE_LABELS_FR[res] ?? res}</dt>
                  <dd className="text-right text-foreground">{price.toFixed(1)} 🪙</dd>
                </div>
              ))}
            </dl>
          </Card>
        )}

        <Card className="p-4">
          <h2 className="text-sm font-medium text-foreground">Chronique</h2>
          <Separator className="my-3" />
          {chronicle.length === 0 ? (
            <p className="text-xs text-muted-foreground">Rien ne s’est encore produit.</p>
          ) : (
            <ul className="space-y-1.5 text-xs text-foreground">
              {chronicle.map((entry, i) => (
                <li key={i} className={i === 0 ? 'font-medium' : 'text-muted-foreground'}>
                  {entry}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}

function TraitBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100)
  return (
    <div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function MeterRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>
          {value.toFixed(1)}/{max}
        </span>
      </div>
      <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}
