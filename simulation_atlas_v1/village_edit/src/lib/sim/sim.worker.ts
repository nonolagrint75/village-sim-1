import { createSimulation, stepSimulation } from './engine'
import { applySimConfig, type SimConfigInput } from './simConfig'
import {
  EMPTY_STATS,
  findSelectedVillager,
  packDraw,
  packSelectedMinimal,
  packUi,
  takeDirty,
} from './snapshot'
import type { SimState } from './types'
import type { WorkerInMsg } from './workerMessages'
import { getSimPerfBudget, noteSimTps } from './perfBudget'
import { tryInitBrainGpu, resetBrainGpu } from './kernels/brainGpu'

/**
 * Calendar pacing at ×1: one sim tick every ~130ms ≈ 7.7 ticks/s (readable day/night).
 * Max (speed<=0) ignores this and targets TARGET_TPS with adaptive CPU slices.
 */
const TICK_INTERVAL_MS = 130
/** Final-version target for Max / high-speed path (NONO §§76–77: real agents, LOD OK). */
const TARGET_TPS = 100
const SLICE_MS_NORMAL = 22
const SLICE_MS_MAX = 48
/** Cap ticks per pump so a heavy world cannot freeze the worker forever. */
const MAX_TICKS_PER_SLICE = 64
const DRAW_MS_NORMAL = 16
const DRAW_MS_FAST = 32
const DRAW_MS_MAX = 72

let state: SimState | null = null
let playing = true
let speed = 1
let selectedId: number | null = null
let acc = 0
let last = 0
let lastUi = 0
let lastDraw = 0
let lastDirty = 0
let ticksThisSecond = 0
let tickClock = 0
let tps = 0
let running = false
let adaptiveSliceMs = SLICE_MS_NORMAL
/** Soft dirty cadence at Max — terrain still updates, just less often. */
let dirtyEveryMs = 16

void tryInitBrainGpu()

function drawIntervalMs(): number {
  const perfDraw = getSimPerfBudget().drawIntervalMs
  if (speed <= 0) return Math.max(DRAW_MS_MAX, perfDraw)
  if (speed >= 4) return Math.max(DRAW_MS_FAST, perfDraw)
  return Math.max(DRAW_MS_NORMAL, perfDraw)
}

/** Always echo selectedId; never let pack/post failures swallow a select reply. */
function postUiFrame(opts?: { priority?: boolean }) {
  if (!state) return
  const priority = !!opts?.priority
  try {
    const frame = packUi(state, selectedId, tps, { priority })
    self.postMessage({ type: 'ui', frame })
    if (priority) lastUi = performance.now()
    return
  } catch {
    /* fall through to minimal echo */
  }
  try {
    const entity = findSelectedVillager(state, selectedId)
    const selected = entity ? packSelectedMinimal(entity) : null
    self.postMessage({
      type: 'ui',
      frame: {
        stats: EMPTY_STATS,
        chronicle: [],
        selectedId,
        selected,
        groups: [],
        lineages: [],
        cultures: [],
        creeds: [],
        projects: [],
        bands: [],
        religionSites: [],
        ticksPerSec: tps,
      },
    })
    if (priority) lastUi = performance.now()
  } catch {
    try {
      self.postMessage({
        type: 'ui',
        frame: {
          stats: EMPTY_STATS,
          chronicle: [],
          selectedId,
          selected: null,
          groups: [],
          lineages: [],
          cultures: [],
          creeds: [],
          projects: [],
          bands: [],
          religionSites: [],
          ticksPerSec: tps,
        },
      })
    } catch {
      /* DataClone / closed worker */
    }
  }
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
  lastDirty = 0
  ticksThisSecond = 0
  tickClock = last
  tps = 0
  adaptiveSliceMs = speed <= 0 ? SLICE_MS_MAX : SLICE_MS_NORMAL
  dirtyEveryMs = 16
  const grid = state.grid
  grid.dirty.length = 0
  self.postMessage({
    type: 'world',
    width: grid.width,
    height: grid.height,
    terrain: grid.terrain,
    amount: grid.amount,
    biome: grid.biome,
    config: cfg,
    playing,
  })
  self.postMessage({ type: 'draw', frame: packDraw(state, 0) })
  postUiFrame({ priority: true })
}

function adaptToMeasuredTps(measured: number) {
  noteSimTps(measured)
  if (speed <= 0) {
    // Chase TARGET_TPS: grow slice when under target, shrink only if packing starves.
    if (measured < TARGET_TPS * 0.75) {
      adaptiveSliceMs = Math.min(SLICE_MS_MAX + 12, adaptiveSliceMs + 3)
      dirtyEveryMs = Math.min(48, dirtyEveryMs + 4)
    } else if (measured > TARGET_TPS * 1.05) {
      adaptiveSliceMs = Math.max(SLICE_MS_MAX - 8, adaptiveSliceMs - 1)
      dirtyEveryMs = Math.max(20, dirtyEveryMs - 2)
    } else {
      adaptiveSliceMs = SLICE_MS_MAX
      dirtyEveryMs = 28
    }
    return
  }
  if (measured < 4) adaptiveSliceMs = Math.max(12, adaptiveSliceMs - 2)
  else if (measured > 12) adaptiveSliceMs = Math.min(SLICE_MS_NORMAL + 8, adaptiveSliceMs + 1)
  else adaptiveSliceMs = SLICE_MS_NORMAL
  dirtyEveryMs = 16
}

function slice() {
  if (!state) return
  const now = performance.now()
  if (last === 0) last = now
  const dt = Math.min(250, now - last)
  last = now

  if (now - tickClock >= 1000) {
    tps = Math.round((ticksThisSecond * 1000) / (now - tickClock))
    ticksThisSecond = 0
    tickClock = now
    adaptToMeasuredTps(tps)
  }

  if (playing) {
    const start = performance.now()
    const budget = speed <= 0 ? adaptiveSliceMs : Math.min(adaptiveSliceMs, SLICE_MS_NORMAL + 4)
    let stepped = 0
    if (speed <= 0) {
      // Pace toward TARGET_TPS using wall-clock debt, not unbounded busy-loop.
      const want = Math.max(1, Math.round((dt / 1000) * TARGET_TPS))
      const cap = Math.min(MAX_TICKS_PER_SLICE, Math.max(want, 8))
      while (stepped < cap && performance.now() - start < budget) {
        stepSimulation(state)
        ticksThisSecond++
        stepped++
      }
    } else {
      acc = Math.min(acc + dt * speed, TICK_INTERVAL_MS * 400)
      while (
        acc >= TICK_INTERVAL_MS &&
        stepped < MAX_TICKS_PER_SLICE &&
        performance.now() - start < budget
      ) {
        stepSimulation(state)
        acc -= TICK_INTERVAL_MS
        ticksThisSecond++
        stepped++
      }
    }
  }

  if (now - lastDirty >= dirtyEveryMs) {
    lastDirty = now
    const dirty = takeDirty(state)
    if (dirty) {
      const transfer: Transferable[] = [
        dirty.indices.buffer as ArrayBuffer,
        dirty.terrain.buffer as ArrayBuffer,
        dirty.amount.buffer as ArrayBuffer,
      ]
      self.postMessage({ type: 'dirty', dirty }, { transfer })
    }
  }

  if (now - lastDraw >= drawIntervalMs()) {
    lastDraw = now
    self.postMessage({ type: 'draw', frame: packDraw(state, tps) })
  }

  const uiMs =
    speed <= 0
      ? Math.max(getSimPerfBudget().uiIntervalMs, 520)
      : getSimPerfBudget().uiIntervalMs
  if (now - lastUi >= uiMs) {
    lastUi = now
    postUiFrame()
  }
}

function pump() {
  if (!running) return
  slice()
  // Max: yield 0–1ms when healthy; slightly longer only if far under target.
  let wait: number
  if (playing && speed <= 0) {
    wait = tps > 0 && tps < TARGET_TPS * 0.5 ? 2 : 0
  } else if (tps > 0 && tps < 4) {
    wait = 12
  } else {
    wait = 8
  }
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
    adaptiveSliceMs = speed <= 0 ? SLICE_MS_MAX : SLICE_MS_NORMAL
    return
  }
  if (msg.type === 'select') {
    selectedId = msg.id
    postUiFrame({ priority: true })
  }
}
