/**
 * Dynamic construction AI types — spatial plans & block tasks.
 * No House01/House02 templates: footprints emerge from needs + RNG.
 */

import type { FloorMaterial, HouseDesign, HouseShape, WallMaterial, DoorSide } from '../architecture'
import type { RoomKind } from '../rooms'
import type { Personality, Profession } from '../types'

export type { DoorSide }

export type BuildBlockKind = 'wall' | 'floor' | 'door' | 'window' | 'partition'

export type BuildMaterial = WallMaterial | FloorMaterial | 'dirt'

export interface BuildBlock {
  kind: BuildBlockKind
  x: number
  y: number
  material: BuildMaterial
  done: boolean
}

/** Soft climate / terrain read near a candidate plot. */
export interface PlotClimateHint {
  tempC: number
  moisture: number
  /** Share of nearby stone / rock tiles 0–1. */
  stoneAccess: number
  /** Share of trees / bushes 0–1. */
  timberAccess: number
  /** Water within sample radius. */
  nearWater: boolean
}

/** Observed neighbor building — imitation learning hook (stub depth OK). */
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
  /** Existing design when expanding; null for a new home. */
  existing: HouseDesign | null
  mode: 'new' | 'expand'
  needFocus: HomeNeedFocus[]
  artisan: boolean
  merchant: boolean
  /** Village cultural style weights — soft prior, not a template id. */
  stylePrior: Partial<Record<HouseShape, number>> | null
}

/**
 * Generative spatial plan — unique per call (rng + personality).
 * Rasterizes to HouseDesign + ordered block queue; never a named house model.
 */
export interface SpatialHomePlan {
  design: HouseDesign
  doorSide: DoorSide
  wallMaterial: WallMaterial
  floorMaterial: FloorMaterial
  windowCount: number
  reasons: string[]
  mode: 'new' | 'expand'
  /** Soft culture tags (imitation stubs). */
  cultureTags: string[]
}

/** Pending progressive construction for one household. */
export interface HomeBuildState {
  plan: SpatialHomePlan
  queue: BuildBlock[]
  formedTick: number
}
