import { createSimulation, stepSimulation } from './src/lib/sim/engine'
import { BED, CHEST, TABLE, WORKBENCH, HEARTH, BENCH } from './src/lib/sim/types'
import { getTerrain } from './src/lib/sim/world'

const seed = Number(process.argv[2] ?? 1)
const ticks = Number(process.argv[3] ?? 12000)
const logEvery = Number(process.argv[4] ?? 4000)

type C = {
  homes: number; multiRoom: number; WB: number; chest: number; table: number; beds: number; hearth: number
  terrain: Record<string, number>
  done: Record<string, number>; pending: Record<string, number>; rooms: Record<string, number>
  restBed: number; restHome: number; restElse: number
  eatTable: number; eatElse: number; store: number; take: number; craftWB: number
  builds: Record<string, number>; houses: number; expand: number
}

function empty(): C {
  return { homes:0, multiRoom:0, WB:0, chest:0, table:0, beds:0, hearth:0, terrain:{}, done:{}, pending:{}, rooms:{},
    restBed:0, restHome:0, restElse:0, eatTable:0, eatElse:0, store:0, take:0, craftWB:0, builds:{}, houses:0, expand:0 }
}

function near(ax:number,ay:number,bx:number,by:number,r=1.6){ const dx=ax-bx, dy=ay-by; return dx*dx+dy*dy<=r*r }

function snap(state: ReturnType<typeof createSimulation>, c: C) {
  c.homes=0; c.multiRoom=0; c.WB=0; c.chest=0; c.table=0; c.beds=0; c.hearth=0
  c.done={}; c.pending={}; c.rooms={}; c.terrain={ bed:0,chest:0,table:0,workbench:0,hearth:0,bench:0 }
  for (const v of state.villagers) {
    if (!v.alive || !v.hasHome || v.homeOwnerId !== v.id) continue
    c.homes++
    if (v.hasWorkbench) c.WB++
    if (v.hasChest) c.chest++
    if (v.hasTable) c.table++
    c.beds += v.bedCount
    c.hearth += v.homeFurniture?.filter(p=>p.id==='hearth').length ?? 0
    const kinds = v.house?.roomKinds ?? []
    if (kinds.length >= 2 || (v.homeLayout?.rooms.length ?? 0) >= 2) c.multiRoom++
    for (const k of kinds) c.rooms[k]=(c.rooms[k]??0)+1
    for (const j of v.furnitureQueue) {
      const bag = j.done ? c.done : c.pending
      bag[j.kind]=(bag[j.kind]??0)+1
    }
  }
  const g=state.grid
  for (let i=0;i<g.terrain.length;i++) {
    const t=g.terrain[i]
    if (t===BED) c.terrain.bed!++
    else if (t===CHEST) c.terrain.chest!++
    else if (t===TABLE) c.terrain.table!++
    else if (t===WORKBENCH) c.terrain.workbench!++
    else if (t===HEARTH) c.terrain.hearth!++
    else if (t===BENCH) c.terrain.bench!++
  }
}

function sample(state: ReturnType<typeof createSimulation>, c: C) {
  for (const v of state.villagers) {
    if (!v.alive || !v.task) continue
    const t=v.task
    if (t.kind==='rest') {
      const owner = v.homeOwnerId!=null ? state.villagers.find(o=>o.id===v.homeOwnerId)??v : v
      const targetingBed = getTerrain(state.grid,t.targetX,t.targetY)===BED || !!owner.furnitureQueue?.some(j=>j.kind==='bed' && near(t.targetX,t.targetY,j.x,j.y,0.5))
      const atBed = getTerrain(state.grid,v.x,v.y)===BED || (near(v.x,v.y,t.targetX,t.targetY) && targetingBed)
      if (atBed) c.restBed++
      else if (v.hasHome && near(v.x,v.y,v.homeX,v.homeY,4)) c.restHome++
      else c.restElse++
    } else if (t.kind==='eat') {
      const owner = v.homeOwnerId!=null ? state.villagers.find(o=>o.id===v.homeOwnerId)??v : v
      const atTable = (owner.hasTable && near(v.x,v.y,owner.tableX,owner.tableY)) || getTerrain(state.grid,v.x,v.y)===TABLE
      if (atTable) c.eatTable++; else c.eatElse++
    } else if (t.kind==='storeChest' && near(v.x,v.y,t.targetX,t.targetY)) c.store++
    else if (t.kind==='takeFromChest' && near(v.x,v.y,t.targetX,t.targetY)) c.take++
    else if ((t.kind==='craftSpear'||t.kind==='craftStoneSpear'||t.kind==='craftIronTool'||t.kind==='experiment') && v.hasWorkbench && near(v.x,v.y,v.workbenchX,v.workbenchY,2)) c.craftWB++
  }
}

function scan(state: ReturnType<typeof createSimulation>, c: C, from: number) {
  const log = state.log ?? []
  for (let i=from;i<log.length;i++) {
    const text = String(log[i])
    if (/bati une maison|referme les murs|bâti une maison/.test(text)) c.houses++
    if (/agrandit|aménage de nouvelles|amenage de nouvelles/.test(text)) c.expand++
    if (/installe|fabrique|place un|dresse|maconne|maçonne/.test(text)) {
      const kind = /etabli|établi|workbench/i.test(text) ? 'workbench'
        : /coffre/i.test(text) ? 'chest'
        : /lit/i.test(text) ? 'bed'
        : /table/i.test(text) ? 'table'
        : /atre|âtre|hearth/i.test(text) ? 'hearth'
        : /banc/i.test(text) ? 'bench' : 'other'
      c.builds[kind]=(c.builds[kind]??0)+1
    }
  }
  return log.length
}

console.log(`Construction audit seed=${seed} ticks=${ticks}`)
const state = createSimulation(seed)
const usage = empty()
let logIdx = 0
const t0 = Date.now()
for (let t=1;t<=ticks;t++) {
  stepSimulation(state)
  if (t>200) sample(state, usage)
  logIdx = scan(state, usage, logIdx)
  if (t%logEvery===0 || t===ticks) {
    const s=empty(); snap(state,s)
    Object.assign(s, { restBed:usage.restBed, restHome:usage.restHome, restElse:usage.restElse, eatTable:usage.eatTable, eatElse:usage.eatElse, store:usage.store, take:usage.take, craftWB:usage.craftWB, builds:{...usage.builds}, houses:usage.houses, expand:usage.expand })
    console.log(`\n=== tick ${t} ===`)
    console.log(`homes=${s.homes} multiRoom=${s.multiRoom} WB=${s.WB} chest=${s.chest} table=${s.table} beds=${s.beds} hearth=${s.hearth}`)
    console.log('terrain', JSON.stringify(s.terrain))
    console.log('done', JSON.stringify(s.done), 'pending', JSON.stringify(s.pending))
    console.log('rooms', JSON.stringify(s.rooms))
    console.log(`usage rest@bed=${s.restBed} rest@home=${s.restHome} eat@table=${s.eatTable} eatElse=${s.eatElse} store=${s.store} take=${s.take} craft@WB=${s.craftWB}`)
    console.log('builds', JSON.stringify(s.builds), 'houses', s.houses, 'expand', s.expand)
  }
}
console.log(`\nDone ${(Date.now()-t0)/1000}s`)
const f=empty(); snap(state,f)
console.log('VERDICT', {
  multiRoom: f.multiRoom>0,
  furniturePlaced: (f.terrain.bed!+f.terrain.table!+f.beds+f.table)>0,
  useBeds: usage.restBed>0,
  useTables: usage.eatTable>0,
  useChests: usage.store+usage.take>0,
  useWorkbenches: usage.craftWB>0,
  useHearths: f.hearth>0 || (f.terrain.hearth??0)>0,
})
