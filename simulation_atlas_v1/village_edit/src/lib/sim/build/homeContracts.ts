/**
 * Lot 3A - home / build queue contracts (data only).
 * Compatible with deferred planner types; no NPC wiring.
 */
import type {
  DoorSide,
  FloorMaterial,
  HouseDesign,
  HouseShape,
  WallMaterial,
} from '../architecture'
import type { RoomKind } from '../rooms'
import type { Personality, Profession } from '../types'

export type { DoorSide, FloorMaterial, WallMaterial }

export type BuildBlockKind = 'wall' | 'floor' | 'door' | 'window' | 'partition'

export type BuildMaterial = WallMaterial | FloorMaterial | 'dirt'

export interface BuildBlock {
  kind: BuildBlockKind
  x: number
  y: number
  material: BuildMaterial
  done: boolean
}

export interface PlotClimateHint {
  tempC: number
  moisture: number
  stoneAccess: number
  timberAccess: number
  nearWater: boolean
}

export interface NeighborBuildingMemory {
  ownerId: number
  shape: HouseShape
  rx: number
  ry: number
  roomKinds: RoomKind[]
  wallMaterial: WallMaterial
  dist: number
  tick: number
}

export type HomeNeedFocus =
  | 'shelter'
  | 'sleep'
  | 'workshop'
  | 'storage'
  | 'kitchen'
  | 'prestige'
  | 'warmth'

export interface HomePlannerBrief {
  personality: Personality
  profession: Profession
  wealth: number
  household: number
  woodOnHand: number
  stoneOnHand: number
  buildSkill: number
  climate: PlotClimateHint
  neighbors: NeighborBuildingMemory[]
  existing: HouseDesign | null
  mode: 'new' | 'expand'
  needFocus: HomeNeedFocus[]
  artisan: boolean
  merchant: boolean
  stylePrior: Partial<Record<HouseShape, number>> | null
}

export interface SpatialHomePlan {
  design: HouseDesign
  doorSide: DoorSide
  wallMaterial: WallMaterial
  floorMaterial: FloorMaterial
  windowCount: number
  reasons: string[]
  mode: 'new' | 'expand'
  cultureTags: string[]
}

export interface HomeBuildState {
  plan: SpatialHomePlan
  queue: BuildBlock[]
  formedTick: number
  materialsNeeded?: Partial<Record<BuildMaterial, number>>
  materialsAvailable?: Partial<Record<BuildMaterial, number>>
}

export function emptyBuildQueue(): BuildBlock[] {
  return []
}

export function buildQueueRemaining(queue: BuildBlock[]): number {
  let n = 0
  for (const b of queue) if (!b.done) n++
  return n
}

export function buildQueueComplete(queue: BuildBlock[]): boolean {
  return queue.length > 0 && buildQueueRemaining(queue) === 0
}
