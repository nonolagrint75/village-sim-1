import type { HouseDesign, StyleWeights } from './architecture'
import type { SimCalendar } from './calendar'
import type { ClimateState } from './climate'
import type { BuildProject } from './construction'
import type { Family, GenealogyEntry, Lineage } from './family'
import type { EquipmentLoadout } from './equipment'
import type { FurnitureJob, FurniturePlacement } from './furniture'
import type { ResourceType, Slot } from './inventory'
import type { ResourceIndex } from './resourceIndex'
import type { Circle, Rumor } from './politics'
import type { HouseLayout } from './rooms'
import type { Ambition, Memory, Relation } from './social'
import type { KnowledgeBit } from './technology'

/** Abstract evolving language — never a real-world tongue. */
export interface Language {
  id: number
  /** Abstract generated label (syllables from seed), never a real ethnonym. */
  name: string
  parentId: number | null
  tone: number
  rhythm: number
  cluster: number
  speakers: number
  bornTick: number
  faded: boolean
}

/** Emergent collective identity — forms only after sustained cohesion. */
export interface Ethnie {
  id: number
  name: string
  languageId: number
  cultureTags: string[]
  homeRegion: string
  villageId: number | null
  memberIds: number[]
  cohesion: number
  sharedMemory: string[]
  formedTick: number
  renamedFrom: string | null
  faded: boolean
}

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
export const TABLE = 28
/** Extra household placeables (AI room builders) — soft codes, not yet fully wired in render. */
export const HEARTH = 29
export const BENCH = 30
export const STOOL = 31
export const SHELF = 32
export const CUPBOARD = 33
export const CRADLE = 34
export const LOOM = 35
export const WASHING_TUB = 36

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
  copperDeposit: Uint16Array
  tinDeposit: Uint16Array
  leadDeposit: Uint16Array
  silverDeposit: Uint16Array
  coalDeposit: Uint16Array
  /** Crop kind on WHEAT tiles — see CROP_DEFS in resources.ts. */
  cropType: Uint8Array
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

export type TaskKind =
  | 'idle'
  | 'eat'
  | 'gatherFood'
  | 'gatherWood'
  | 'clearLand'
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
  | 'buildProject'
  | 'buildWorkbench'
  | 'buildChest'
  | 'buildBed'
  | 'buildTable'
  | 'buildHearth'
  | 'buildBench'
  | 'buildStool'
  | 'buildShelf'
  | 'buildCupboard'
  | 'buildCradle'
  | 'buildLoom'
  | 'buildWashingTub'
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
  | 'experiment'
  /** Spectacle / conte — métier émergent (troubadour…). */
  | 'entertain'
  /** Conseil spirituel / guérison soft — gourou, guérisseur. */
  | 'counsel'
  /** Transmission de savoir-faire (apprentissage). */
  | 'teachCraft'
  /** Bois → charbon (si technique connue). */
  | 'makeCharcoal'
  /** Fabrique et équipe une pièce du kit corporel (souliers, cape, dague…). */
  | 'craftGear'
  /** Recette catalogue (établi / moulin) — `task.resource` = output id. */
  | 'craftGoods'
  /** Appliquer un remède (guérit un peu). */
  | 'useMedicine'
  /** Allumer une torche portée — nuit dehors. */
  | 'lightTorch'
  /** Poser / allumer une chandelle au foyer. */
  | 'placeCandle'
  /** Nourrir l’âtre (fagots / bois / tourbe). */
  | 'tendHearth'
  /** Ramasser du combustible (bois / tourbe). */
  | 'gatherFuel'
  /** Fabriquer torche / chandelle / lampe. */
  | 'craftLight'

export interface Task {
  kind: TaskKind
  targetX: number
  targetY: number
  targetId: number | null
  resource: ResourceType | null
  stuckTicks: number
  ageTicks: number
  /** Accumulated labor toward a multi-tick craft/build/harvest action. */
  work: number
  path: number[] | null
  pathI: number
  pathTx: number
  pathTy: number
  pathTick: number
}

export type ToolTier = 'none' | 'wood' | 'stone' | 'iron'

/** How a pair-bond formed — imperfect human reasons, not genetic optimisation. */
export type MarriageKind = 'romance' | 'arranged' | 'wealth'

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

/** Génome compact (voir genetics.ts) — allèles QTL, pas de nucléotides. */
export type Genome = Uint8Array

/** Morphologie faciale continue (0–1), sans labels ethniques. */
export interface FaceMorph {
  width: number
  jaw: number
  nose: number
  brow: number
  cheek: number
}

/**
 * Phénotype exprimé — apparence / prédispositions continues.
 * Génétique ≠ culture ; génétique ≠ destin. Pas de races.
 */
export interface Phenotype {
  height: number
  build: number
  /** Mélanine / teinte cutanée continue 0–1, sans labels. */
  pigmentation: number
  eyeTone: number
  hairTone: number
  hairCurl: number
  face: FaceMorph
  metabolism: number
  fertilityPredisposition: number
  /** Prédisposition maladie (≠ certitude). */
  diseaseRisk: number
  agingRateBias: number
  strengthBias: number
  enduranceBias: number
  agilityBias: number
  /** Teinte de rendu dérivée du continuum (compat canvas). */
  hue: number
}

export interface Villager {
  id: number
  seed: number
  /** Given name (prénom). */
  name: string
  /** Emergent family name — ancestor / craft / place / nickname. */
  surname: string
  /** Historical lineage (may rename, split, merge, fade). */
  lineageId: number | null
  /** Current household / co-resident family. */
  familyId: number | null
  /** Soft pair bond (reproduction) — inheritance priority. */
  spouseId: number | null
  /** Pathway that formed the bond (null if unmarried). */
  marriageKind: MarriageKind | null
  /** Tick of marriage / pair-bond; 0 if never bonded. */
  marriedTick: number
  /**
   * Soft stance: ambition / freedom / explorer → may refuse marriage.
   * Crystallised once, not re-rolled every tick.
   */
  refusesMarriage: boolean
  /**
   * Social / adoptive parents — genetic motherId/fatherId/parentIds stay intact.
   */
  adoptiveParentIds: number[]
  personality: Personality
  profession: Profession
  ambition: Ambition
  grudgeTarget: number | null
  /** Legacy kinship list — keep in sync with motherId/fatherId when known. */
  parentIds: number[]
  /** Slots parentaux pour pedigree / consanguinité (module famille). */
  motherId: number | null
  fatherId: number | null
  genome: Genome
  phenotype: Phenotype
  x: number
  y: number
  health: number
  hunger: number
  /** 0–4: walking / labor deplete; rest at home recovers. Low → slow / abandon hard work. */
  stamina: number
  starveTimer: number
  healTimer: number
  inventory: Slot[]
  task: Task | null
  /** Interrupted non-critical job to resume after flee/fight (DF-style). */
  savedTask: Task | null
  nextThinkTick: number
  toolTier: ToolTier
  /** Hits remaining on current tool before it degrades one tier. */
  toolWear: number
  /** Worn / carried on-person medieval kit (body slots). */
  equipment: EquipmentLoadout
  memories: Memory[]
  relations: Map<number, Relation>
  house: HouseDesign | null
  /** Multi-room layout after walls; drives furniture placement & need pathing. */
  homeLayout: HouseLayout | null
  /** Pending / done furniture crafts for this household. */
  furnitureQueue: FurnitureJob[]
  horseId: number | null
  mounted: boolean
  hasCart: boolean
  boatId: number | null
  embarked: boolean
  tradeCooldown: number
  hasWorkbench: boolean
  workbenchX: number
  workbenchY: number
  hasHome: boolean
  homeX: number
  homeY: number
  homeOwnerId: number | null
  bedCount: number
  hasTable: boolean
  tableX: number
  tableY: number
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
  /** Extra medieval furniture (table, hearth, loom…) — not bed/chest/workbench. */
  homeFurniture: FurniturePlacement[]
  /** Armoire stores — textiles / tools overflow beside the chest. */
  cupboardInventory: Slot[] | null
  /** Carried torch remains lit until this tick (0 = out). */
  torchLitUntil: number
  /** Indoor candle / lamp light until this tick (shared via home keeper). */
  homeLightUntil: number
  /** Hearth fire remains warm/lit until this tick. */
  hearthLitUntil: number
  villageId: number | null
  hue: number
  alive: boolean
  age: number
  reproCooldown: number
  /** Active generative BuildProject id, if any (see construction.ts). */
  activeProjectId: number | null
  /** Discovered techniques / recipes — generative tech, not a fixed tree. */
  knowledge: KnowledgeBit[]
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
  /** Mine shaft mouth (TUNNEL entrance) claimed by the village. */
  hasMine: boolean
  mineX: number
  mineY: number
  tradeRuns: number
  /** Per-capita surplus of every tradeable resource, refreshed by tickVillageEconomy. */
  surplus: Partial<Record<ResourceType, number>>
  /**
   * Soft central-place score (food surplus, infra, roads, pop, safety).
   * Refreshed with the urban/economy tick — drives migrant preference and hub emergence.
   */
  attractiveness: number
  /** Chronicled once as a regional trade hub (primate / central-place soft emergence). */
  isRegionalHub: boolean
  /**
   * Bannerlord-like settlement prosperity (0–100): food, trade, roads, walls, pop, security.
   * Drives migration pull and soft birth bias — no player taxes.
   */
  prosperity: number
  /** Soft loyalty/happiness (0–1) from food stock + safety. */
  loyalty: number
  /** Soft security (0–1): walls vs wolves/theft/recent deaths. */
  security: number
  /** Decaying counters for prosperity pressure (bandit/wolf / crime). */
  recentDeaths: number
  recentThefts: number
  /** Manor Lords–style regional specialty from local comparative advantage. */
  specialty: 'forest' | 'grain' | 'shore' | 'mine' | 'mixed'
  /** Last tick a rare prosperity chronicle fired (throttle). */
  lastProsperLogTick: number
  /**
   * Soft asabiya / group cohesion (0–1): rises with external threat, decays in long peace + inequality.
   * Mechanism only — no scripted collapse dates.
   */
  cohesion: number
  /** Consecutive CIRCLE_TICK windows without external wolf/raid pressure. */
  peaceTicks: number
  /** Wealth-variance stress (elite overproduction soft proxy). */
  inequalityStress: number
  /** Last communal gathering / ritual tick (belonging reinforcement). */
  lastRitualTick: number
  /**
   * Soft EU-style development index (pop + infra + production) — drives construction / trade weight.
   * Not a player budget or map-painter score.
   */
  development: number
  /** Soft Vic3-style average standard of living (0–1). */
  standardOfLiving: number
  /**
   * Labor balance: >0 worker shortage (attracts migrants), <0 unemployment pressure.
   */
  laborBalance: number
  /** Last chronicled SoL band for boom / crash detection. */
  solBand: 'crash' | 'poor' | 'fair' | 'good' | 'boom' | null
  style: StyleWeights
  /** Shared village technique library (trade + local inventors). */
  knowledge: KnowledgeBit[]
}

export interface SimStats {
  tick: number
  season: Season
  seasonProgress: number
  year: number
  /** Earth-like calendar derived from tick (hours / days / seasons / years). */
  calendar: SimCalendar
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
  circles: number
  institutions: number
  rumors: number
  leadingCircle: string | null
  leadingLegitimacy: number
}

/** Sparse chronicle flags — each fires at most once per world. */
export interface SimMilestones {
  firstHouse: boolean
  firstPath: boolean
  firstRoad: boolean
  firstMill: boolean
  firstPort: boolean
  firstBoatVoyage: boolean
  firstBirth: boolean
  firstMarriage: boolean
  firstAdoption: boolean
  firstFamine: boolean
  firstRegionalHub: boolean
  /** First severe storm chronicled (Earth-like weather). */
  firstStorm: boolean
  /** First rare masterwork craft chronicled. */
  firstMasterwork: boolean
}

export interface SimState {
  tick: number
  season: Season
  year: number
  famine: boolean
  /** Coarse Earth-like climate / ocean / weather substrate. */
  climate: ClimateState
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
  milestones: SimMilestones
  /** Emergent social circles — never preset factions. */
  circles: Circle[]
  nextCircleId: number
  rumors: Rumor[]
  nextRumorId: number
  /** Generative build projects (composed footprints — see construction.ts). */
  projects: BuildProject[]
  nextProjectId: number
  /** Current households (co-residence). */
  families: Family[]
  nextFamilyId: number
  /** Historical lineages — surnames, fame, traditions. */
  lineages: Lineage[]
  nextLineageId: number
  /** Depth-capped pedigree stubs (survives dead-villager compaction). */
  genealogy: GenealogyEntry[]
  /** Abstract evolving languages — not real-world tongues. */
  languages: Language[]
  nextLanguageId: number
  /** Emergent peoples (ethnogenesis) — never a preset ethnicity list. */
  ethnies: Ethnie[]
  nextEthnieId: number
}

export const WORLD_SIZE_MAX = 1200
/** Mutable — set via setWorldSize before createSimulation / after world message on UI. */
export let WORLD_SIZE = 1000

export function setWorldSize(n: number): number {
  const allowed = [600, 800, 1000, 1200]
  let best = 1000
  let bestDist = Infinity
  for (const a of allowed) {
    const d = Math.abs(a - n)
    if (d < bestDist) {
      bestDist = d
      best = a
    }
  }
  WORLD_SIZE = best
  return WORLD_SIZE
}
