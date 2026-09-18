import { createSimulation, stepSimulation, computeStats } from "../src/lib/sim/engine"
import { TICKS_PER_DAY } from "../src/lib/sim/calendar"

const seed = 5
const state = createSimulation(seed, { worldSize: 600, seed })
const ticks = 50 * TICKS_PER_DAY
let lastLog = 0
for (let t = 1; t <= ticks; t++) {
  stepSimulation(state)
  if (t % TICKS_PER_DAY !== 0) continue
  const day = t / TICKS_PER_DAY
  if (day < 40) { lastLog = state.log.length; continue }
  const s = computeStats(state)
  let foodInv = 0
  let foodChest = 0
  let hungry = 0
  let starving = 0
  for (const v of state.villagers) {
    if (!v.alive) continue
    for (const it of v.inventory) {
      if (/berry|meat|fish|bread|grain|wheat|food|meal|fruit|veg|milk|cheese|stew/i.test(it.kind)) foodInv += it.qty
    }
    if (v.hunger < 1.5) hungry++
    if (v.starveTimer > 0) starving++
  }
  for (const c of state.chests ?? []) {
    for (const it of c.items ?? []) {
      if (/berry|meat|fish|bread|grain|wheat|food|meal|fruit|veg|milk|cheese|stew/i.test(String(it.kind))) foodChest += it.qty
    }
  }
  // also sum village stores if present
  let vgFood = 0
  for (const vg of state.villages) {
    const st = (vg as any).stores || (vg as any).stock || (vg as any).food
    if (typeof st === "number") vgFood += st
    else if (st && typeof st === "object") {
      for (const [k,v] of Object.entries(st)) if (/food|berry|meat|grain|wheat|fish/i.test(k)) vgFood += Number(v)||0
    }
  }
  const newLogs = state.log.slice(lastLog).filter(l => /famine|faim|mort|berry|récolte|stock/i.test(l))
  lastLog = state.log.length
  console.log(JSON.stringify({
    day, pop: s.villagers, famine: state.famine, season: state.season,
    foodInv, foodChest, vgFood, hungry, starving, deaths: s.deaths,
    logs: newLogs.slice(0, 8),
  }))
}