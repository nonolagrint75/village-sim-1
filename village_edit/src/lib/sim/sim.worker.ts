import { createSimulation, stepSimulation } from './engine'
import { applySimConfig, type SimConfigInput } from './simConfig'
import { packDraw, packUi, takeDirty } from './snapshot'
import type { SimState } from './types'
import type { WorkerInMsg } from './workerMessages'
import { getSimPerfBudget, noteSimTps } from './perfBudget'
import { tryInitBrainGpu, resetBrainGpu } from './kernels/brainGpu'

const TICK_INTERVAL_MS = 130
const SLICE_MS = 24
/** At max speed, post fewer draw frames so the main thread / GC can keep up. */
const DRAW_MS_NORMAL = 16
const DRAW_MS_FAST = 28
const DRAW_MS_MAX = 48

let state: SimState | null = null
let playing = true
let speed = 1
let selectedId: number | null = null
let acc = 0
let last = 0
let lastUi = 0
let lastDraw = 0
let ticksThisSecond = 0
let tickClock = 0
let tps = 0
let running = false
/** Adaptive slice: shrink when TPS low to keep UI responsive. */
let adaptiveSliceMs = SLICE_MS

void tryInitBrainGpu()

function drawIntervalMs(): number {
  const perfDraw = getSimPerfBudget().drawIntervalMs
  if (speed <= 0) return Math.max(DRAW_MS_MAX, perfDraw)
  if (speed >= 4) return Math.max(DRAW_MS_FAST, perfDraw)
  return Math.max(DRAW_MS_NORMAL, perfDraw)
}

function boot(seed: number, config?: SimConfigInput) {
  resetBrainGpu()
  void tryInitBrainGpu()
  const cfg = applySimConfig({ ...config, seed })
  state = createSimulation(cfg.seed, cfg)
  playing = !cfg.startPaused
  acc = 0
  last = performance.now()
  lastUi = 0
  lastDraw = 0
  ticksThisSecond = 0
  tickClock = last
  tps = 0
  adaptiveSliceMs = SLICE_MS
  const grid = state.grid
  grid.dirty.length = 0
  self.postMessage({
    type: 'world',
    width: grid.width,
    height: grid.height,
    terrain: grid.terrain,
    amount: grid.amount,
    config: cfg,
    playing,
  })
  self.postMessage({ type: 'draw', frame: packDraw(state, 0) })
  self.postMessage({ type: 'ui', frame: packUi(state, selectedId, 0) })
}

function slice() {
  if (!state) return
  const now = performance.now()
  if (last === 0) last = now
  const dt = now - last
  last = now

  if (now - tickClock >= 1000) {
    tps = Math.round((ticksThisSecond * 1000) / (now - tickClock))
    ticksThisSecond = 0
    tickClock = now
    noteSimTps(tps)
    // Adaptive CPU budget: protect frame pump when lagging.
    if (tps < 4) adaptiveSliceMs = Math.max(12, adaptiveSliceMs - 2)
    else if (tps > 10) adaptiveSliceMs = Math.min(SLICE_MS + 8, adaptiveSliceMs + 1)
    else adaptiveSliceMs = SLICE_MS
  }

  if (playing) {
    const start = performance.now()
    const budget = adaptiveSliceMs
    if (speed <= 0) {
      while (performance.now() - start < budget) {
        stepSimulation(state)
        ticksThisSecond++
      }
    } else {
      acc = Math.min(acc + dt * speed, TICK_INTERVAL_MS * 400)
      while (acc >= TICK_INTERVAL_MS && performance.now() - start < budget) {
        stepSimulation(state)
        acc -= TICK_INTERVAL_MS
        ticksThisSecond++
      }
    }
  }

  const dirty = takeDirty(state)
  if (dirty) {
    // Transfer typed buffers — zero-copy to main thread.
    const transfer: Transferable[] = [
      dirty.indices.buffer as ArrayBuffer,
      dirty.terrain.buffer as ArrayBuffer,
      dirty.amount.buffer as ArrayBuffer,
    ]
    self.postMessage({ type: 'dirty', dirty }, { transfer })
  }

  if (now - lastDraw >= drawIntervalMs()) {
    lastDraw = now
    self.postMessage({ type: 'draw', frame: packDraw(state, tps) })
  }

  const uiMs = getSimPerfBudget().uiIntervalMs
  if (now - lastUi >= uiMs) {
    lastUi = now
    self.postMessage({ type: 'ui', frame: packUi(state, selectedId, tps) })
  }
}

function pump() {
  if (!running) return
  slice()
  // Yield slightly longer when lagging so main thread can paint.
  const wait = playing && speed <= 0 ? (tps < 4 ? 4 : 0) : tps < 4 ? 12 : 8
  setTimeout(pump, wait)
}

self.onmessage = (ev: MessageEvent<WorkerInMsg>) => {
  const msg = ev.data
  if (msg.type === 'start' || msg.type === 'reset') {
    selectedId = msg.type === 'reset' ? null : selectedId
    boot(msg.seed, msg.config)
    if (!running) {
      running = true
      pump()
    }
    return
  }
  if (msg.type === 'play') {
    playing = msg.playing
    return
  }
  if (msg.type === 'speed') {
    speed = msg.speed
    return
  }
  if (msg.type === 'select') {
    selectedId = msg.id
    if (state) self.postMessage({ type: 'ui', frame: packUi(state, selectedId, tps) })
  }
}
