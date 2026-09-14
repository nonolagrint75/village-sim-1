import type { HouseDesign, StyleWeights } from './architecture'
import type { ResourceType, Slot } from './inventory'
import type { ResourceIndex } from './resourceIndex'
import type { Ambition, Memory, Relation } from './social'

export const GRASS = 0
export const STONE = 1
export const TREE = 2
export const BUSH = 3
export const GOLD = 4
export const FENCE = 5
export const HOUSE = 6
export const LOOT = 7
export const CHEST = 8
export const WORKBENCH = 9
export const WALL_WOOD = 10
export const WALL_STONE = 11
export const DIRT = 12
export const BED = 13
export const WATER = 14
export const PATH = 15
export const BRIDGE = 16
export const SAND = 17
export const PLANK = 18
export const FIELD = 19
export const WHEAT = 20
export const MILL = 21
export const TRAIL = 22
export const ROAD = 23
export const PORT = 24
export const IRON = 25
export const MOUNTAIN = 26
export const TUNNEL = 27

export type TerrainCode = number

export const CLAIM_NONE = 0
export const CLAIM_HOUSE = 1
export const CLAIM_PEN = 2
export const CLAIM_FIELD = 3
export const CLAIM_PATH = 4
export const CLAIM_MILL = 5

export interface WorldGrid {
  width: number
  height: number
  terrain: Uint8Array
  amount: Uint16Array
  /** Hidden ore deposits inside mountain rock; never rendered on the surface. */
  ironDeposit: Uint16Array
  goldDeposit: Uint16Array
  claim: Uint8Array
  traffic: Float32Array
  walked: Set<number>
  walkedList: number[]
  walkedCursor: number
  crossing: Map<number, number>
  dirty: number[]
  roadTiles: number
  index: ResourceIndex
}

export type Season = 'spring' | 'summer' | 'autumn' | 'winter'
export const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter']
export const TICKS_PER_SEASON = 900

export type TaskKind =
  | 'idle'
  | 'eat'
  | 'gatherFood'
  | 'gatherWood'
  | 'gatherStone'
  | 'gatherIron'
  | 'mineTunnel'
  | 'mineGold'
  | 'mintCoins'
  | 'craftSpear'
  | 'craftStoneSpear'
  | 'craftIronTool'
  | 'weaveCloth'
  | 'sewClothing'
  | 'tanHide'
  | 'buildHouse'
  | 'buildWorkbench'
  | 'buildChest'
  | 'buildBed'
  | 'buildPen'
  | 'buildWall'
  | 'buildBridge'
  | 'buildMill'
  | 'buildCart'
  | 'buildBoat'
  | 'buildPort'
  | 'sowField'
  | 'harvestWheat'
  | 'grindFlour'
  | 'bakeBread'
  | 'captureSheep'
  | 'feedPen'
  | 'storeChest'
  | 'takeFromChest'
  | 'flee'
  | 'fight'
  | 'rest'
  | 'socialise'
  | 'steal'
  | 'giveFood'
  | 'confront'
  | 'defend'
  | 'fish'
  | 'tameHorse'
  | 'mount'
  | 'feedHorse'
  | 'tradeRun'
  | 'buyMaterial'

export interface Task {
  kind: TaskKind
  targetX: number
  targetY: number
  targetId: number | null
  resource: ResourceType | null
  stuckTicks: number
  ageTicks: number
}

export type ToolTier = 'none' | 'wood' | 'stone' | 'iron'

export type Profession =
  | 'none'
  | 'forager'
  | 'farmer'
  | 'miller'
  | 'lumberjack'
  | 'mason'
  | 'guard'
  | 'builder'
  | 'herder'
  | 'trader'
  | 'fisher'
  | 'weaver'
  | 'blacksmith'
  | 'miner'

export interface Personality {
  courage: number
  sociability: number
  ambition: number
  generosity: number
  curiosity: number
}

export interface Villager {
  id: number
  seed: number
  name: string
  personality: Personality
  profession: Profession
  ambition: Ambition
  grudgeTarget: number | null
  parentIds: number[]
  x: number
  y: number
  health: number
  hunger: number
  starveTimer: number
  healTimer: number
  inventory: Slot[]
  task: Task | null
  nextThinkTick: number
  toolTier: ToolTier
  memories: Memory[]
  relations: Map<number, Relation>
  house: HouseDesign | null
  horseId: number | null
  mounted: boolean
  hasCart: boolean
  boatId: number | null
  tradeCooldown: number
  hasWorkbench: boolean
  workbenchX: number
  workbenchY: number
  hasHome: boolean
  homeX: number
  homeY: number
  homeOwnerId: number | null
  bedCount: number
  hasPen: boolean
  penX: number
  penY: number
  penFeed: number
  hasField: boolean
  fieldX: number
  fieldY: number
  hasChest: boolean
  chestX: number
  chestY: number
  chestInventory: Slot[] | null
  villageId: number | null
  hue: number
  alive: boolean
  age: number
  reproCooldown: number
}

export interface Sheep {
  id: number
  x: number
  y: number
  health: number
  hunger: number
  starveTimer: number
  healTimer: number
  captured: boolean
  ownerId: number | null
  breedCooldown: number
  woolCooldown: number
  alive: boolean
}

export interface Horse {
  id: number
  x: number
  y: number
  health: number
  hunger: number
  starveTimer: number
  healTimer: number
  tamed: boolean
  ownerId: number | null
  riderId: number | null
  breedCooldown: number
  alive: boolean
}

export type BoatKind = 'fishing' | 'cargo'

export interface Boat {
  id: number
  x: number
  y: number
  kind: BoatKind
  ownerId: number | null
  villageId: number | null
  alive: boolean
}

export type WolfTargetKind = 'villager' | 'sheep' | 'horse' | null

export interface Wolf {
  id: number
  x: number
  y: number
  health: number
  hunger: number
  starveTimer: number
  healTimer: number
  breedCooldown: number
  targetId: number | null
  targetKind: WolfTargetKind
  alive: boolean
}

export type WallTier = 'none' | 'wood' | 'stone'

export interface Village {
  id: number
  centerX: number
  centerY: number
  memberIds: number[]
  wallTier: WallTier
  wallHealth: number
  perimeter: { x: number; y: number }[]
  gates: { x: number; y: number }[]
  naturalCover: number
  perimeterTick: number
  hasMill: boolean
  millX: number
  millY: number
  hasPort: boolean
  portX: number
  portY: number
  tradeRuns: number
  /** Per-capita surplus of every tradeable resource, refreshed by tickVillageEconomy. */
  surplus: Partial<Record<ResourceType, number>>
  style: StyleWeights
}

export interface SimStats {
  tick: number
  season: Season
  seasonProgress: number
  year: number
  famine: boolean
  villagers: number
  sheep: number
  horsesWild: number
  horsesTamed: number
  riders: number
  carts: number
  boats: number
  ports: number
  tradeRunsTotal: number
  wolves: number
  totalCoins: number
  totalBread: number
  houses: number
  pens: number
  fields: number
  mills: number
  villages: number
  bridges: number
  roadTiles: number
  wallTiles: number
  naturalCover: number
  births: number
  deaths: number
  thefts: number
  brawls: number
  friendships: number
  feuds: number
  professions: Record<Profession, number>
  shapes: Record<string, number>
  prices: Partial<Record<ResourceType, number>>
}

export interface SimState {
  tick: number
  season: Season
  year: number
  famine: boolean
  grid: WorldGrid
  villagers: Villager[]
  sheep: Sheep[]
  horses: Horse[]
  boats: Boat[]
  wolves: Wolf[]
  villages: Village[]
  nextId: number
  nextVillageId: number
  births: number
  deaths: number
  bridges: number
  thefts: number
  brawls: number
  compactCursor: number
  tradeRoutes: Set<string>
  log: string[]
  prices: Partial<Record<ResourceType, number>>
}

export const WORLD_SIZE = 1000
