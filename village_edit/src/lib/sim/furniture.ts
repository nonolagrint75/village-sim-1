/**
 * Medieval furniture — craft recipes, room placement jobs, and household utility.
 * Jobs target RoomKind zones from rooms.ts (API for AI / multi-room builders).
 */
import { countOf, createInventory, removeFromInventory, type ResourceType, type Slot } from './inventory'
import type { HouseLayout, RoomKind } from './rooms'
import { pickCellInRoom, ROOM_FURNITURE, type RoomFurnitureKind } from './rooms'
import {
  BED,
  BENCH,
  CHEST,
  CRADLE,
  CUPBOARD,
  HEARTH,
  LOOM,
  SHELF,
  STOOL,
  TABLE,
  WASHING_TUB,
  WORKBENCH,
  type TaskKind,
  type Villager,
} from './types'

export type FurnitureKind =
  | 'workbench'
  | 'chest'
  | 'bed'
  | 'table'
  | 'bench'
  | 'stool'
  | 'shelf'
  | 'cupboard'
  | 'hearth'
  | 'loom'
  | 'cradle'
  | 'tub'
  | 'sconce'
  | 'chandelier'

export type FurnitureUtility =
  | 'craft'
  | 'storage'
  | 'sleep'
  | 'dining'
  | 'social'
  | 'warmth'
  | 'textile'
  | 'childcare'
  | 'wash'
  | 'seat'

export type FurnitureJob = {
  kind: FurnitureKind
  roomKind: RoomKind
  x: number
  y: number
  done: boolean
}

export type FurniturePlacement = {
  id: Exclude<FurnitureKind, 'workbench' | 'chest' | 'bed' | 'table'>
  x: number
  y: number
}

export type FurnitureDef = {
  kind: FurnitureKind
  labelFr: string
  buildTask: TaskKind
  recipe: Partial<Record<ResourceType, number>>
  wood: number
  room: RoomKind
  terrain: number
  utilities: FurnitureUtility[]
  maxCount: number
  priority: number
  labor: number
  storageSlots?: number
  chestSlots?: number
  sleepBonus?: number
  warmthClo?: number
  dineMul?: number
  socialBonus?: number
  cradleCapacity?: number
  weaveMul?: number
  washCare?: number
}

export const FURNITURE_DEFS: Record<FurnitureKind, FurnitureDef> = {
  workbench: {
    kind: 'workbench',
    labelFr: 'établi',
    buildTask: 'buildWorkbench',
    recipe: { wood: 4, stone: 1 },
    wood: 4,
    room: 'atelier',
    terrain: WORKBENCH,
    utilities: ['craft'],
    maxCount: 1,
    priority: 10,
    labor: 2.2,
  },
  chest: {
    kind: 'chest',
    labelFr: 'coffre',
    buildTask: 'buildChest',
    recipe: { wood: 4, iron: 1 },
    wood: 4,
    room: 'reserve',
    terrain: CHEST,
    utilities: ['storage'],
    maxCount: 1,
    priority: 20,
    labor: 2.2,
    chestSlots: 28,
  },
  bed: {
    kind: 'bed',
    labelFr: 'lit',
    buildTask: 'buildBed',
    recipe: { wood: 3, linen: 1 },
    wood: 3,
    room: 'chambre',
    terrain: BED,
    utilities: ['sleep'],
    maxCount: 6,
    priority: 30,
    labor: 2.2,
    sleepBonus: 0.14,
  },
  hearth: {
    kind: 'hearth',
    labelFr: 'âtre',
    buildTask: 'buildHearth',
    recipe: { stone: 4, clay: 2, tallow: 1 },
    wood: 0,
    room: 'cuisine',
    terrain: HEARTH,
    utilities: ['warmth'],
    maxCount: 1,
    priority: 35,
    labor: 2.8,
    warmthClo: 0.55,
    sleepBonus: 0.03,
  },
  table: {
    kind: 'table',
    labelFr: 'table',
    buildTask: 'buildTable',
    recipe: { wood: 4 },
    wood: 4,
    room: 'salle_a_manger',
    terrain: TABLE,
    utilities: ['dining', 'social'],
    maxCount: 1,
    priority: 40,
    labor: 2.0,
    dineMul: 1.18,
    socialBonus: 0.02,
  },
  bench: {
    kind: 'bench',
    labelFr: 'banc',
    buildTask: 'buildBench',
    recipe: { wood: 3 },
    wood: 3,
    room: 'salle_a_manger',
    terrain: BENCH,
    utilities: ['social', 'seat'],
    maxCount: 1,
    priority: 50,
    labor: 1.8,
    socialBonus: 0.035,
  },
  cupboard: {
    kind: 'cupboard',
    labelFr: 'armoire',
    buildTask: 'buildCupboard',
    recipe: { wood: 5, iron: 1 },
    wood: 5,
    room: 'reserve',
    terrain: CUPBOARD,
    utilities: ['storage'],
    maxCount: 1,
    priority: 55,
    labor: 2.6,
    storageSlots: 24,
  },
  shelf: {
    kind: 'shelf',
    labelFr: 'étagère',
    buildTask: 'buildShelf',
    recipe: { wood: 2 },
    wood: 2,
    room: 'reserve',
    terrain: SHELF,
    utilities: ['storage'],
    maxCount: 1,
    priority: 60,
    labor: 1.5,
  },
  loom: {
    kind: 'loom',
    labelFr: 'métier à tisser',
    buildTask: 'buildLoom',
    recipe: { wood: 5, rope: 2, iron: 1 },
    wood: 5,
    room: 'atelier',
    terrain: LOOM,
    utilities: ['textile', 'craft'],
    maxCount: 1,
    priority: 65,
    labor: 3.0,
    weaveMul: 1.45,
  },
  cradle: {
    kind: 'cradle',
    labelFr: 'berceau',
    buildTask: 'buildCradle',
    recipe: { wood: 2, linen: 1, wool: 1 },
    wood: 2,
    room: 'chambre',
    terrain: CRADLE,
    utilities: ['childcare', 'sleep'],
    maxCount: 1,
    priority: 70,
    labor: 2.0,
    cradleCapacity: 1,
    sleepBonus: 0.02,
  },
  stool: {
    kind: 'stool',
    labelFr: 'tabouret',
    buildTask: 'buildStool',
    recipe: { wood: 1 },
    wood: 1,
    room: 'hall',
    terrain: STOOL,
    utilities: ['seat'],
    maxCount: 2,
    priority: 80,
    labor: 1.2,
    sleepBonus: 0.015,
  },
  tub: {
    kind: 'tub',
    labelFr: 'cuve à lessive',
    buildTask: 'buildWashingTub',
    recipe: { wood: 3, clay: 2, rope: 1 },
    wood: 3,
    room: 'cuisine',
    terrain: WASHING_TUB,
    utilities: ['wash'],
    maxCount: 1,
    priority: 90,
    labor: 2.2,
    washCare: 0.04,
  },
  sconce: {
    kind: 'sconce',
    labelFr: 'applique',
    buildTask: 'buildWorkbench',
    wood: 1,
    room: 'hall',
    terrain: null,
  },
  chandelier: {
    kind: 'chandelier',
    labelFr: 'lustre',
    buildTask: 'buildWorkbench',
    wood: 4,
    room: 'hall',
    terrain: null,
  },
}

export const FURNITURE_KINDS = (Object.keys(FURNITURE_DEFS) as FurnitureKind[]).sort(
  (a, b) => FURNITURE_DEFS[a].priority - FURNITURE_DEFS[b].priority,
)

export const FURNITURE_TERRAIN = new Set(FURNITURE_KINDS.map((k) => FURNITURE_DEFS[k].terrain))

export function furnitureLabelFr(kind: FurnitureKind): string {
  return FURNITURE_DEFS[kind].labelFr
}

export function woodCostOf(kind: FurnitureKind): number {
  return FURNITURE_DEFS[kind].wood
}

export function canAffordFurniture(inv: Slot[], kind: FurnitureKind): boolean {
  if (kind === 'bed') {
    if (countOf(inv, 'wood') < 3) return false
    return countOf(inv, 'linen') >= 1 || countOf(inv, 'cloth') >= 1 || countOf(inv, 'wool') >= 2
  }
  const recipe = FURNITURE_DEFS[kind].recipe
  for (const key of Object.keys(recipe) as ResourceType[]) {
    const need = recipe[key] ?? 0
    if (need > 0 && countOf(inv, key) < need) return false
  }
  return true
}

export function missingFurnitureResource(inv: Slot[], kind: FurnitureKind): ResourceType | null {
  if (kind === 'bed') {
    if (countOf(inv, 'wood') < 3) return 'wood'
    if (countOf(inv, 'linen') < 1 && countOf(inv, 'cloth') < 1 && countOf(inv, 'wool') < 2) return 'linen'
    return null
  }
  const recipe = FURNITURE_DEFS[kind].recipe
  for (const key of Object.keys(recipe) as ResourceType[]) {
    const need = recipe[key] ?? 0
    if (need > 0 && countOf(inv, key) < need) return key
  }
  return null
}

export function spendFurnitureRecipe(inv: Slot[], kind: FurnitureKind): boolean {
  if (kind === 'bed') {
    if (countOf(inv, 'wood') < 3) return false
    if (countOf(inv, 'linen') >= 1) {
      removeFromInventory(inv, 'wood', 3)
      removeFromInventory(inv, 'linen', 1)
      return true
    }
    if (countOf(inv, 'cloth') >= 1) {
      removeFromInventory(inv, 'wood', 3)
      removeFromInventory(inv, 'cloth', 1)
      return true
    }
    if (countOf(inv, 'wool') >= 2) {
      removeFromInventory(inv, 'wood', 3)
      removeFromInventory(inv, 'wool', 2)
      return true
    }
    return false
  }
  if (!canAffordFurniture(inv, kind)) return false
  const recipe = FURNITURE_DEFS[kind].recipe
  for (const key of Object.keys(recipe) as ResourceType[]) {
    const need = recipe[key] ?? 0
    if (need > 0) removeFromInventory(inv, key, need)
  }
  return true
}

function preferredRoom(
  kind: FurnitureKind,
  layout: HouseLayout,
  opts: { wantWorkshop: boolean; wantStore: boolean },
): RoomKind {
  const def = FURNITURE_DEFS[kind]
  if (layout.rooms.some((r) => r.kind === def.room)) return def.room
  if (kind === 'workbench' && opts.wantWorkshop && layout.rooms.some((r) => r.kind === 'atelier')) return 'atelier'
  if (kind === 'chest' && opts.wantStore && layout.rooms.some((r) => r.kind === 'reserve')) return 'reserve'
  if (kind === 'bed' && layout.rooms.some((r) => r.kind === 'chambre')) return 'chambre'
  if (kind === 'table' || kind === 'bench') {
    if (layout.rooms.some((r) => r.kind === 'salle_a_manger')) return 'salle_a_manger'
    if (layout.rooms.some((r) => r.kind === 'cuisine')) return 'cuisine'
  }
  if ((kind === 'hearth' || kind === 'tub') && layout.rooms.some((r) => r.kind === 'cuisine')) return 'cuisine'
  if (kind === 'loom' && layout.rooms.some((r) => r.kind === 'atelier')) return 'atelier'
  return layout.rooms[0]?.kind ?? def.room
}

export function planFurnitureJobs(
  layout: HouseLayout,
  opts: { beds: number; wantWorkshop: boolean; wantStore: boolean; household: number },
): FurnitureJob[] {
  const used = new Set<string>()
  const jobs: FurnitureJob[] = []

  const push = (kind: FurnitureKind, prefer: 'first' | 'last' | 'center' = 'first', times = 1) => {
    for (let n = 0; n < times; n++) {
      const roomKind = preferredRoom(kind, layout, opts)
      const cell = pickCellInRoom(layout, roomKind, used, prefer)
      if (!cell) return
      jobs.push({ kind, roomKind, x: cell.x, y: cell.y, done: false })
    }
  }

  push('workbench', 'first')
  push('chest', 'last')
  push('bed', 'center', Math.max(1, Math.min(6, opts.beds)))
  push('hearth', 'first')
  if (layout.rooms.some((r) => r.kind === 'salle_a_manger' || r.kind === 'cuisine') || opts.household >= 2) {
    push('table', 'center')
  }
  if (opts.household >= 2) push('bench', 'center')
  if (opts.wantStore || opts.household >= 3) push('cupboard', 'last')
  push('shelf', 'first')
  if (opts.wantWorkshop || layout.rooms.some((r) => r.kind === 'atelier')) push('loom', 'first')
  if (opts.household >= 2) push('cradle', 'center')
  push('stool', 'first', Math.min(2, Math.max(1, opts.household - 1)))
  if (opts.household >= 2) push('tub', 'last')

  return jobs.sort((a, b) => FURNITURE_DEFS[a.kind].priority - FURNITURE_DEFS[b.kind].priority)
}

export function nextFurnitureJob(queue: FurnitureJob[]): FurnitureJob | null {
  return queue.find((j) => !j.done) ?? null
}

export function markFurnitureDone(queue: FurnitureJob[], x: number, y: number): FurnitureJob | null {
  const job = queue.find((j) => !j.done && j.x === x && j.y === y)
  if (job) {
    job.done = true
    return job
  }
  const any = queue.find((j) => !j.done)
  if (any) {
    any.done = true
    any.x = x
    any.y = y
    return any
  }
  return null
}

function spotFromQueue(
  queue: FurnitureJob[],
  layout: HouseLayout | null,
  kind: FurnitureKind,
  fallbackRoom: RoomKind,
): { x: number; y: number } | null {
  const job = queue.find((j) => j.kind === kind)
  if (job) return { x: job.x, y: job.y }
  if (!layout) return null
  const used = new Set<string>()
  return pickCellInRoom(layout, fallbackRoom, used, 'center')
}

export function sleepSpot(queue: FurnitureJob[], layout: HouseLayout | null): { x: number; y: number } | null {
  return spotFromQueue(queue, layout, 'bed', 'chambre')
}

export function hearthSpot(queue: FurnitureJob[], layout: HouseLayout | null): { x: number; y: number } | null {
  return spotFromQueue(queue, layout, 'hearth', 'cuisine')
}

export function eatSpot(queue: FurnitureJob[], layout: HouseLayout | null): { x: number; y: number } | null {
  return spotFromQueue(queue, layout, 'table', 'salle_a_manger')
}

export function craftSpot(queue: FurnitureJob[], layout: HouseLayout | null): { x: number; y: number } | null {
  return spotFromQueue(queue, layout, 'workbench', 'atelier')
}

export function storeSpot(queue: FurnitureJob[], layout: HouseLayout | null): { x: number; y: number } | null {
  return spotFromQueue(queue, layout, 'chest', 'reserve')
}

export function warmthSpot(queue: FurnitureJob[], layout: HouseLayout | null): { x: number; y: number } | null {
  return spotFromQueue(queue, layout, 'hearth', 'cuisine')
}

export function furnitureOwnedCount(v: Villager, kind: FurnitureKind): number {
  if (kind === 'workbench') return v.hasWorkbench ? 1 : 0
  if (kind === 'chest') return v.hasChest ? 1 : 0
  if (kind === 'bed') return v.bedCount
  if (kind === 'table') return v.hasTable ? 1 : 0
  return v.homeFurniture.filter((p) => p.id === kind).length
}

export function hasHomeFurniture(v: Villager, kind: FurnitureKind): boolean {
  return furnitureOwnedCount(v, kind) > 0
}

export function applyFurnitureBuilt(v: Villager, kind: FurnitureKind, x: number, y: number): FurnitureJob | null {
  const def = FURNITURE_DEFS[kind]
  if (kind === 'workbench') {
    v.hasWorkbench = true
    v.workbenchX = x
    v.workbenchY = y
  } else if (kind === 'chest') {
    v.hasChest = true
    v.chestX = x
    v.chestY = y
    if (!v.chestInventory) v.chestInventory = createInventory(def.chestSlots ?? 28)
  } else if (kind === 'bed') {
    v.bedCount += 1
  } else if (kind === 'table') {
    v.hasTable = true
    v.tableX = x
    v.tableY = y
  } else if (furnitureOwnedCount(v, kind) < def.maxCount) {
    v.homeFurniture.push({ id: kind, x, y })
    if (kind === 'cupboard' && !v.cupboardInventory) {
      v.cupboardInventory = createInventory(def.storageSlots ?? 24)
    }
  }
  return markFurnitureDone(v.furnitureQueue, x, y)
}

export function householdSleepCapacity(owner: Villager): number {
  const cradle = hasHomeFurniture(owner, 'cradle') ? FURNITURE_DEFS.cradle.cradleCapacity ?? 0 : 0
  return owner.bedCount + cradle
}

export function restSleepBonus(owner: Villager, sleeperAge = 999): number {
  let bonus = 0
  if (owner.bedCount > 0) bonus += FURNITURE_DEFS.bed.sleepBonus ?? 0.12
  if (hasHomeFurniture(owner, 'hearth')) bonus += FURNITURE_DEFS.hearth.sleepBonus ?? 0
  if (hasHomeFurniture(owner, 'cradle') && sleeperAge < 200) bonus += FURNITURE_DEFS.cradle.sleepBonus ?? 0
  if (hasHomeFurniture(owner, 'stool') && owner.bedCount <= 0) bonus += FURNITURE_DEFS.stool.sleepBonus ?? 0
  return bonus
}

export function homeWarmthClo(owner: Villager): number {
  return hasHomeFurniture(owner, 'hearth') ? FURNITURE_DEFS.hearth.warmthClo ?? 0 : 0
}

export function homeDineMul(owner: Villager): number {
  return owner.hasTable ? FURNITURE_DEFS.table.dineMul ?? 1 : 1
}

export function homeSocialBonus(owner: Villager): number {
  let b = 0
  if (owner.hasTable) b += FURNITURE_DEFS.table.socialBonus ?? 0
  if (hasHomeFurniture(owner, 'bench')) b += FURNITURE_DEFS.bench.socialBonus ?? 0
  return b
}

export function homeWeaveMul(owner: Villager): number {
  return hasHomeFurniture(owner, 'loom') ? FURNITURE_DEFS.loom.weaveMul ?? 1 : 1
}

export function homeWashCare(owner: Villager): number {
  return hasHomeFurniture(owner, 'tub') ? FURNITURE_DEFS.tub.washCare ?? 0 : 0
}

export type PlaceableFurnitureType = {
  kind: FurnitureKind
  labelFr: string
  room: RoomKind
  buildTask: TaskKind
  recipe: Partial<Record<ResourceType, number>>
  wood: number
  utilities: FurnitureUtility[]
  terrain: number
  allowedIn: RoomFurnitureKind[]
}

export function placeableFurnitureTypes(): PlaceableFurnitureType[] {
  return FURNITURE_KINDS.map((kind) => {
    const d = FURNITURE_DEFS[kind]
    return {
      kind,
      labelFr: d.labelFr,
      room: d.room,
      buildTask: d.buildTask,
      recipe: d.recipe,
      wood: d.wood,
      utilities: d.utilities,
      terrain: d.terrain,
      allowedIn: ROOM_FURNITURE[d.room] ?? [],
    }
  })
}
