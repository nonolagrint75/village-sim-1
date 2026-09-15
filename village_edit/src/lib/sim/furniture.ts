/**
 * Medieval home furniture — craftable placeables with real household utility.
 * Catalog + slot helpers for AI room builders; does not own house/room topology.
 */
import type { HouseFootprint } from './architecture'
import { furnitureSlots } from './architecture'
import { countOf, createInventory, removeFromInventory, type ResourceType, type Slot } from './inventory'
import {
  BED,
  CHEST,
  TABLE,
  BENCH,
  STOOL,
  SHELF,
  CUPBOARD,
  CRADLE,
  LOOM,
  HEARTH,
  WASHING_TUB,
  WORKBENCH,
  type TaskKind,
  type Villager,
} from './types'

export type FurnitureId =
  | 'workbench'
  | 'chest'
  | 'bed'
  | 'table'
  | 'bench'
  | 'stool'
  | 'shelf'
  | 'cupboard'
  | 'cradle'
  | 'loom'
  | 'hearth'
  | 'washingTub'

/** Soft room roles for multi-room / AI placement — topology lives elsewhere. */
export type FurnitureRoomHint =
  | 'workshop'
  | 'storage'
  | 'bedroom'
  | 'kitchen'
  | 'common'
  | 'nursery'
  | 'hearth'

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

export type FurniturePlacement = {
  id: Exclude<FurnitureId, 'workbench' | 'chest' | 'bed'>
  x: number
  y: number
}

export type FurnitureDef = {
  id: FurnitureId
  terrain: number
  labelFr: string
  labelFrLog: string
  /** Build task kind (legacy three + new builds). */
  buildTask: TaskKind
  recipe: Partial<Record<ResourceType, number>>
  labor: number
  roomHint: FurnitureRoomHint
  utilities: FurnitureUtility[]
  /** Max instances per home owner. */
  maxCount: number
  /** Fill order after house stands (lower first). */
  priority: number
  /** Own inventory size when placed (cupboard). */
  storageSlots?: number
  /** Extra chest slots when iron-bound chest is built. */
  chestSlots?: number
  /** Additive stamina recover on rest when sheltered. */
  sleepBonus?: number
  /** Clothing clo equivalent while at home with hearth. */
  warmthClo?: number
  /** Nutrition multiplier when eating at home with a table. */
  dineMul?: number
  /** Affinity warmth bonus while socialising near home furniture. */
  socialBonus?: number
  /** Extra household “bed” capacity for infants (cradle). */
  cradleCapacity?: number
  /** Weave labor / yield multiplier at loom. */
  weaveMul?: number
  /** Soft belonging / care when washing at tub. */
  washCare?: number
}

type Cell = { x: number; y: number }

export const FURNITURE_DEFS: Record<FurnitureId, FurnitureDef> = {
  workbench: {
    id: 'workbench',
    terrain: WORKBENCH,
    labelFr: 'Établi',
    labelFrLog: 'établi',
    buildTask: 'buildWorkbench',
    recipe: { wood: 4, stone: 1 },
    labor: 2.2,
    roomHint: 'workshop',
    utilities: ['craft'],
    maxCount: 1,
    priority: 10,
  },
  chest: {
    id: 'chest',
    terrain: CHEST,
    labelFr: 'Coffre',
    labelFrLog: 'coffre',
    buildTask: 'buildChest',
    recipe: { wood: 4, iron: 1 },
    labor: 2.2,
    roomHint: 'storage',
    utilities: ['storage'],
    maxCount: 1,
    priority: 20,
    chestSlots: 28,
  },
  bed: {
    id: 'bed',
    terrain: BED,
    labelFr: 'Lit',
    labelFrLog: 'lit',
    buildTask: 'buildBed',
    recipe: { wood: 3, linen: 1 },
    labor: 2.2,
    roomHint: 'bedroom',
    utilities: ['sleep'],
    maxCount: 6,
    priority: 30,
    sleepBonus: 0.14,
  },
  hearth: {
    id: 'hearth',
    terrain: HEARTH,
    labelFr: 'Âtre',
    labelFrLog: 'âtre',
    buildTask: 'buildHearth',
    recipe: { stone: 4, clay: 2, tallow: 1 },
    labor: 2.8,
    roomHint: 'hearth',
    utilities: ['warmth'],
    maxCount: 1,
    priority: 35,
    warmthClo: 0.55,
    sleepBonus: 0.03,
  },
  table: {
    id: 'table',
    terrain: TABLE,
    labelFr: 'Table',
    labelFrLog: 'table',
    buildTask: 'buildTable',
    recipe: { wood: 4 },
    labor: 2.0,
    roomHint: 'kitchen',
    utilities: ['dining', 'social'],
    maxCount: 1,
    priority: 40,
    dineMul: 1.18,
    socialBonus: 0.02,
  },
  bench: {
    id: 'bench',
    terrain: BENCH,
    labelFr: 'Banc',
    labelFrLog: 'banc',
    buildTask: 'buildBench',
    recipe: { wood: 3 },
    labor: 1.8,
    roomHint: 'common',
    utilities: ['social', 'seat'],
    maxCount: 1,
    priority: 50,
    socialBonus: 0.035,
  },
  cupboard: {
    id: 'cupboard',
    terrain: CUPBOARD,
    labelFr: 'Armoire',
    labelFrLog: 'armoire',
    buildTask: 'buildCupboard',
    recipe: { wood: 5, iron: 1 },
    labor: 2.6,
    roomHint: 'storage',
    utilities: ['storage'],
    maxCount: 1,
    priority: 55,
    storageSlots: 24,
  },
  shelf: {
    id: 'shelf',
    terrain: SHELF,
    labelFr: 'Étagère',
    labelFrLog: 'étagère',
    buildTask: 'buildShelf',
    recipe: { wood: 2 },
    labor: 1.5,
    roomHint: 'storage',
    utilities: ['storage'],
    maxCount: 1,
    priority: 60,
  },
  loom: {
    id: 'loom',
    terrain: LOOM,
    labelFr: 'Métier à tisser',
    labelFrLog: 'métier à tisser',
    buildTask: 'buildLoom',
    recipe: { wood: 5, rope: 2, iron: 1 },
    labor: 3.0,
    roomHint: 'workshop',
    utilities: ['textile', 'craft'],
    maxCount: 1,
    priority: 65,
    weaveMul: 1.45,
  },
  cradle: {
    id: 'cradle',
    terrain: CRADLE,
    labelFr: 'Berceau',
    labelFrLog: 'berceau',
    buildTask: 'buildCradle',
    recipe: { wood: 2, linen: 1, wool: 1 },
    labor: 2.0,
    roomHint: 'nursery',
    utilities: ['childcare', 'sleep'],
    maxCount: 1,
    priority: 70,
    cradleCapacity: 1,
    sleepBonus: 0.02,
  },
  stool: {
    id: 'stool',
    terrain: STOOL,
    labelFr: 'Tabouret',
    labelFrLog: 'tabouret',
    buildTask: 'buildStool',
    recipe: { wood: 1 },
    labor: 1.2,
    roomHint: 'common',
    utilities: ['seat'],
    maxCount: 2,
    priority: 80,
    sleepBonus: 0.015,
  },
  washingTub: {
    id: 'washingTub',
    terrain: WASHING_TUB,
    labelFr: 'Cuve à lessive',
    labelFrLog: 'cuve à lessive',
    buildTask: 'buildWashingTub',
    recipe: { wood: 3, clay: 2, rope: 1 },
    labor: 2.2,
    roomHint: 'kitchen',
    utilities: ['wash'],
    maxCount: 1,
    priority: 90,
    washCare: 0.04,
  },
}

/** Ordered catalog for AI / UI enumeration. */
export const FURNITURE_IDS: FurnitureId[] = (
  Object.keys(FURNITURE_DEFS) as FurnitureId[]
).sort((a, b) => FURNITURE_DEFS[a].priority - FURNITURE_DEFS[b].priority)

export const FURNITURE_TERRAIN = new Set(
  FURNITURE_IDS.map((id) => FURNITURE_DEFS[id].terrain),
)

export const FURNITURE_BUILD_TASKS: TaskKind[] = FURNITURE_IDS.map((id) => FURNITURE_DEFS[id].buildTask)

const BUILD_TASK_TO_ID = new Map<TaskKind, FurnitureId>(
  FURNITURE_IDS.map((id) => [FURNITURE_DEFS[id].buildTask, id]),
)

export function furnitureIdFromBuildTask(kind: TaskKind): FurnitureId | null {
  return BUILD_TASK_TO_ID.get(kind) ?? null
}

export function furnitureDef(id: FurnitureId): FurnitureDef {
  return FURNITURE_DEFS[id]
}

export function canAffordFurniture(inv: Slot[], id: FurnitureId): boolean {
  const recipe = FURNITURE_DEFS[id].recipe
  for (const key of Object.keys(recipe) as ResourceType[]) {
    const need = recipe[key] ?? 0
    if (need > 0 && countOf(inv, key) < need) return false
  }
  return true
}

/** Prefer linen bed; allow cloth as substitute so craft can proceed. */
export function canAffordBedFlexible(inv: Slot[]): boolean {
  if (countOf(inv, 'wood') < 3) return false
  return countOf(inv, 'linen') >= 1 || countOf(inv, 'cloth') >= 1 || countOf(inv, 'wool') >= 2
}

export function spendFurnitureRecipe(inv: Slot[], id: FurnitureId): boolean {
  if (id === 'bed') {
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
  if (!canAffordFurniture(inv, id)) return false
  const recipe = FURNITURE_DEFS[id].recipe
  for (const key of Object.keys(recipe) as ResourceType[]) {
    const need = recipe[key] ?? 0
    if (need > 0) removeFromInventory(inv, key, need)
  }
  return true
}

export function missingFurnitureResource(inv: Slot[], id: FurnitureId): ResourceType | null {
  if (id === 'bed') {
    if (countOf(inv, 'wood') < 3) return 'wood'
    if (countOf(inv, 'linen') < 1 && countOf(inv, 'cloth') < 1 && countOf(inv, 'wool') < 2) {
      return countOf(inv, 'linen') < 1 ? 'linen' : 'wool'
    }
    return null
  }
  const recipe = FURNITURE_DEFS[id].recipe
  for (const key of Object.keys(recipe) as ResourceType[]) {
    const need = recipe[key] ?? 0
    if (need > 0 && countOf(inv, key) < need) return key
  }
  return null
}

export function furnitureOwnedCount(v: Villager, id: FurnitureId): number {
  if (id === 'workbench') return v.hasWorkbench ? 1 : 0
  if (id === 'chest') return v.hasChest ? 1 : 0
  if (id === 'bed') return v.bedCount
  return v.homeFurniture.filter((p) => p.id === id).length
}

export function hasHomeFurniture(v: Villager, id: FurnitureId): boolean {
  return furnitureOwnedCount(v, id) > 0
}

export function homeFurnitureCell(v: Villager, id: FurnitureId): Cell | null {
  if (id === 'workbench' && v.hasWorkbench) return { x: v.workbenchX, y: v.workbenchY }
  if (id === 'chest' && v.hasChest) return { x: v.chestX, y: v.chestY }
  if (id === 'bed') return null
  const hit = v.homeFurniture.find((p) => p.id === id)
  return hit ? { x: hit.x, y: hit.y } : null
}

export function placeHomeFurniture(v: Villager, id: FurniturePlacement['id'], x: number, y: number): void {
  const def = FURNITURE_DEFS[id]
  const count = furnitureOwnedCount(v, id)
  if (count >= def.maxCount) return
  v.homeFurniture.push({ id, x, y })
  if (id === 'cupboard' && !v.cupboardInventory) {
    v.cupboardInventory = createInventory(def.storageSlots ?? 24)
  }
}

export function householdSleepCapacity(owner: Villager): number {
  const cradle = hasHomeFurniture(owner, 'cradle') ? FURNITURE_DEFS.cradle.cradleCapacity ?? 0 : 0
  return owner.bedCount + cradle
}

export function restSleepBonus(v: Villager, homeOwner: Villager | null): number {
  const owner = homeOwner ?? v
  let bonus = 0
  if (owner.bedCount > 0) bonus += FURNITURE_DEFS.bed.sleepBonus ?? 0.12
  if (hasHomeFurniture(owner, 'hearth')) bonus += FURNITURE_DEFS.hearth.sleepBonus ?? 0
  if (hasHomeFurniture(owner, 'cradle') && v.age < 200) bonus += FURNITURE_DEFS.cradle.sleepBonus ?? 0
  if (hasHomeFurniture(owner, 'stool') && owner.bedCount <= 0) bonus += FURNITURE_DEFS.stool.sleepBonus ?? 0
  return bonus
}

export function homeWarmthClo(owner: Villager): number {
  return hasHomeFurniture(owner, 'hearth') ? FURNITURE_DEFS.hearth.warmthClo ?? 0 : 0
}

export function homeDineMul(owner: Villager): number {
  return hasHomeFurniture(owner, 'table') ? FURNITURE_DEFS.table.dineMul ?? 1 : 1
}

export function homeSocialBonus(owner: Villager): number {
  let b = 0
  if (hasHomeFurniture(owner, 'table')) b += FURNITURE_DEFS.table.socialBonus ?? 0
  if (hasHomeFurniture(owner, 'bench')) b += FURNITURE_DEFS.bench.socialBonus ?? 0
  return b
}

export function homeWeaveMul(owner: Villager): number {
  return hasHomeFurniture(owner, 'loom') ? FURNITURE_DEFS.loom.weaveMul ?? 1 : 1
}

export function homeWashCare(owner: Villager): number {
  return hasHomeFurniture(owner, 'washingTub') ? FURNITURE_DEFS.washingTub.washCare ?? 0 : 0
}

export function chestInventorySize(): number {
  return FURNITURE_DEFS.chest.chestSlots ?? 28
}

export function cupboardInventorySize(): number {
  return FURNITURE_DEFS.cupboard.storageSlots ?? 24
}

/** Effective storage inventory: prefer cupboard when present for overflow. */
export function primaryStoreInventory(v: Villager): { inv: Slot[]; x: number; y: number } | null {
  if (v.hasChest && v.chestInventory) return { inv: v.chestInventory, x: v.chestX, y: v.chestY }
  if (hasHomeFurniture(v, 'cupboard') && v.cupboardInventory) {
    const cell = homeFurnitureCell(v, 'cupboard')
    if (cell) return { inv: v.cupboardInventory, x: cell.x, y: cell.y }
  }
  return null
}

export type FurnitureSlotPlan = {
  workbench: Cell
  chest: Cell
  beds: Cell[]
  byId: Partial<Record<FurnitureId, Cell[]>>
}

/**
 * Geometric placement plan from house interior cells.
 * Uses architecture.furnitureSlots for legacy three; fills remaining cells for new pieces.
 * Room agents can replace `byId` later without changing recipes/utilities.
 */
export function planFurnitureSlots(footprint: HouseFootprint): FurnitureSlotPlan {
  const base = furnitureSlots(footprint)
  const sorted = [...footprint.interior].sort((a, b) => a.y - b.y || a.x - b.x)
  const used = new Set<string>()
  const mark = (c: Cell) => used.add(`${c.x},${c.y}`)
  mark(base.workbench)
  mark(base.chest)
  for (const b of base.beds) mark(b)

  const free: Cell[] = []
  for (const c of sorted) {
    if (!used.has(`${c.x},${c.y}`)) free.push(c)
  }

  const byId: Partial<Record<FurnitureId, Cell[]>> = {
    workbench: [base.workbench],
    chest: [base.chest],
    bed: [...base.beds],
  }

  let fi = 0
  const take = (n: number): Cell[] => {
    const out: Cell[] = []
    while (out.length < n && fi < free.length) {
      out.push(free[fi++]!)
    }
    return out
  }

  for (const id of FURNITURE_IDS) {
    if (id === 'workbench' || id === 'chest' || id === 'bed') continue
    const def = FURNITURE_DEFS[id]
    byId[id] = take(def.maxCount)
  }

  return { workbench: base.workbench, chest: base.chest, beds: base.beds, byId }
}

export function nextFurnitureDesire(
  v: Villager,
  plan: FurnitureSlotPlan,
  maxBeds: number,
): { id: FurnitureId; cell: Cell; driveMul: number } | null {
  for (const id of FURNITURE_IDS) {
    const def = FURNITURE_DEFS[id]
    const owned = furnitureOwnedCount(v, id)
    const cap = id === 'bed' ? maxBeds : def.maxCount
    if (owned >= cap) continue
    const cells = plan.byId[id] ?? (id === 'bed' ? plan.beds : id === 'workbench' ? [plan.workbench] : id === 'chest' ? [plan.chest] : [])
    const cell = cells[owned]
    if (!cell) continue
    const driveMul =
      id === 'workbench'
        ? 1
        : id === 'chest'
          ? 0.9
          : id === 'bed'
            ? owned === 0
              ? 1
              : 0.55
            : id === 'hearth'
              ? 0.85
              : id === 'table'
                ? 0.7
                : id === 'cradle'
                  ? 0.65
                  : id === 'loom'
                    ? 0.55
                    : 0.45
    return { id, cell, driveMul }
  }
  return null
}

/** Transfer furniture ownership on death/heir (new pieces + cupboard stores). */
export function transferHomeFurniture(from: Villager, to: Villager): void {
  to.homeFurniture = from.homeFurniture.map((p) => ({ ...p }))
  to.cupboardInventory = from.cupboardInventory
  from.homeFurniture = []
  from.cupboardInventory = null
}

export function emptyHomeFurniture(): FurniturePlacement[] {
  return []
}

/** Placeable types exposed for AI room builders / multi-room agents. */
export type PlaceableFurnitureType = {
  id: FurnitureId
  terrain: number
  labelFr: string
  roomHint: FurnitureRoomHint
  utilities: FurnitureUtility[]
  recipe: Partial<Record<ResourceType, number>>
  buildTask: TaskKind
  maxCount: number
}

export function placeableFurnitureTypes(): PlaceableFurnitureType[] {
  return FURNITURE_IDS.map((id) => {
    const d = FURNITURE_DEFS[id]
    return {
      id: d.id,
      terrain: d.terrain,
      labelFr: d.labelFr,
      roomHint: d.roomHint,
      utilities: d.utilities,
      recipe: d.recipe,
      buildTask: d.buildTask,
      maxCount: d.maxCount,
    }
  })
}
