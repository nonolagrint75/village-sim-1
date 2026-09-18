import type { HouseDesign, StyleWeights } from './architecture'
import type { SimCalendar } from './calendar'
import type { ClimateState } from './climate'
import type { BuildProject } from './construction'
import type { ChunkStore } from './build/blockWorld'
import type { BuildBlock, SpatialHomePlan } from './build/homeContracts'
import type { WorkOrder } from './build/workOrders'
import type { EmergenceMetrics } from './build/emergenceMetrics'
import type { Deposit } from './economy/deposits'
import type { BusinessRecord } from './economy/business'
import type { Family, GenealogyEntry, Lineage } from './family'
import type { EquipmentLoadout } from './equipment'
import type { FurnitureJob, FurniturePlacement } from './furniture'
import type { ResourceType, Slot } from './inventory'
import type { ResourceIndex } from './resourceIndex'
import type { Circle, Polity, Rumor } from './politics'
import type { CoupRecord, PolityWar } from './war'
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
  /** Named biome codes — see biomes.ts (BIOME_*). */
  biome: Uint8Array
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
  /** Rite / recueillement au lieu sacré (autel → temple). */
  | 'ritual'
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
  /** Lot 3C — collab construction (workOrders + behaviors). */
  | 'helpBuild'
  | 'haulForBuild'
  | 'assistCraftTools'
  | 'hireBuilder'

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
  /** Lot 3C — reserved work-order id on the build board (optional). */
  workOrderId?: number | null
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

/** Biological sex for sprites / pedigree — not culture or gender identity. */
export type BiologicalSex = 'female' | 'male'

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
  /**
   * Prédisposition pilosité faciale 0–1 (expression effective gated by sex + age in packDraw).
   */
  facialHair: number
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
  /** Biological sex — sprite silhouette / hair / beard. */
  sex: BiologicalSex
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
  /**
   * Lot 3B — progressive spatial home plan (API in build/homeBuildPipeline; behaviors Lot 3C).
   * Optional so legacy villagers without the field remain valid.
   */
  homePlan?: SpatialHomePlan | null
  /**
   * Lot 3B — pending BuildBlock queue (consumed by applyNextHomeBuildBlock; behaviors Lot 3C).
   */
  buildQueue?: BuildBlock[]
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

/** Medieval brigand phase — camp in woods, raid for food, slip away. */
export type BanditPhase = 'camp' | 'raid' | 'flee'

export interface Bandit {
  id: number
  bandId: number
  name: string
  x: number
  y: number
  health: number
  hunger: number
  starveTimer: number
  healTimer: number
  courage: number
  targetVillageId: number | null
  targetVillagerId: number | null
  phase: BanditPhase
  /** Stolen rations carried back to camp. */
  loot: import('./inventory').Slot[]
  foodStolen: number
  originVillagerId: number | null
  alive: boolean
}

/** Wilds hideout: rough camp → repaired lair (repaire). */
export type BandHideoutTier = 'camp' | 'lair'

export interface Band {
  id: number
  name: string
  campX: number
  campY: number
  /** Tent → timber hideout repaired in the wilds. */
  hideoutTier: BandHideoutTier
  /** 0–12; repairs push camp → lair. */
  campHealth: number
  memberIds: number[]
  formedTick: number
  lastRaidTick: number
  raids: number
  /** Trade caravans ambushed (in addition to village razzias). */
  tradeAmbushes: number
  origin: 'outcasts' | 'vagabonds'
}

export type WallTier = 'none' | 'wood' | 'stone'

/** Sacred building progression for a village faith site. */
export type SacredTier = 'none' | 'shrine' | 'chapel' | 'temple'

/** Settlement scale from pop/infra — not a level-cap spawn. */
export type SettlementStage = 'camp' | 'hamlet' | 'village' | 'town' | 'city'

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
  /**
   * Once wall segments are placed, freeze the ring so expansion doesn't
   * orphan built cells and leave wallTier stuck at `none`.
   */
  perimeterFrozen: boolean
  hasMill: boolean
  millX: number
  millY: number
  hasPort: boolean
  portX: number
  portY: number
  /** Open market plaza founded after real trade + road connectivity. */
  hasMarket: boolean
  marketX: number
  marketY: number
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
  /** Emergent sacred meeting place (faith circles / creeds) — not a canned temple type. */
  hasShrine: boolean
  shrineX: number
  shrineY: number
  /** French label, e.g. « autel de pierre ». */
  shrineLabel: string | null
  /** Soft creed id anchored at the shrine. */
  shrineCreed: string | null
  /** Last rite held at the shrine. */
  lastShrineRiteTick: number
  /** Building progression: none → shrine → chapel → temple. */
  sacredTier: SacredTier
  /** camp → hamlet → village → town → city (people + infra). */
  settlementStage: SettlementStage
  /**
   * Historical stress loop (sim §§62–64): stable → crisis → collapse → rebuild.
   * Causal (famine/war/prosperity), never a calendar script.
   */
  crisisPhase?: 'stable' | 'crisis' | 'collapse' | 'rebuild'
  lastCrisisTick?: number
  /** 0–1 progress while rebuilding after collapse/crisis. */
  rebuildProgress?: number
  /** Cumulative rites at the village sacred site (drives upgrades). */
  shrineRiteCount: number
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
  markets: number
  tradeRunsTotal: number
  wolves: number
  /** Living brigands on the map. */
  bandits: number
  /** Active brigand bands. */
  bands: number
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
  /** Villager deaths caused by wolves (hunt or fight). */
  deathsByWolf: number
  /** Villager deaths caused by brigands. */
  deathsByBandit: number
  /** Villagers who left as outcasts/bandits (alive=false, not a death). */
  deserters: number
  thefts: number
  brawls: number
  friendships: number
  feuds: number
  professions: Record<Profession, number>
  shapes: Record<string, number>
  prices: Partial<Record<ResourceType, number>>
  /** Village surplus aggregates (market stocks), not prices. */
  marketStocks: Partial<Record<ResourceType, number>>
  circles: number
  institutions: number
  guilds: number
  councils: number
  laws: { id: string; label: string; count: number }[]
  rumors: number
  leadingCircle: string | null
  leadingLegitimacy: number
  /** Emergent polities (campements → chefferies → royaumes). */
  polities: number
  chiefdoms: number
  kingdoms: number
  /** Polities still at camp tier (loose settlement). */
  camps: number
  /** Finished keeps / donjons (fortify projects stamped on the map). */
  castles: number
  /** Compact rows for Royaume panel (rulers / claims). */
  polityRows: {
    id: number
    name: string
    tier: string
    tierLabel: string
    titleLabel: string
    rulerName: string | null
    legitimacy: number
    villages: number
    rivals: number
    claimRadius: number
    claimStrength: number
  }[]
  /** Distinct generative techniques known across villages. */
  techKnown: number
  /** Top technique labels (FR) for Royaume. */
  techLabels: string[]
  activeWars: number
  openWars: number
  warBattles: number
  coups: number
  warRows: Array<{
    id: number
    aName: string
    bName: string
    cause: string
    status: string
    intensity: number
    battles: number
  }>
  settlementStages: Record<string, number>
  firms: number
  firmHires: number
  firmFailures: number
  /** Active trade route keys (village pair links). */
  tradeRoutes: number
  /** Villages with crystallized mines. */
  mines: number
  /** Sparse economy deposit bag size (0 if not synced). */
  depositsKnown: number
  /** Villagers with high migration urge. */
  migrating: number
  /** Settlement crisis phase histogram. */
  crisisCounts: Record<string, number>
  /** Lean firm cards for Marché. */
  firmRows: {
    id: string
    kind: string
    kindLabel: string
    ownerName: string
    workers: number
    failed: boolean
  }[]
  /** Lean settlement cards for Habitats. */
  settlementRows: {
    id: number
    label: string
    stage: string
    prosperity: number
    specialty: string
    specialtyLabel: string
    crisisPhase: string
    crisisLabel: string
    rebuildProgress: number
    laborBalance: number
    laborHint: string
    hasMine: boolean
    hasMill: boolean
    hasMarket: boolean
    hasPort: boolean
    population: number
  }[]
  /** Player-facing causal chains (proven counters / live state only). */
  causalReadouts: { id: string; chain: string; detail: string }[]
  /** credit_bank pack — optional bag on state. */
  creditBooks: number
  creditTrustAvg: number
  creditCrises: number
  creditInstitutions: number
  informalLends: number
  creditWired: boolean
  creditRows: {
    id: string
    ownerLabel: string
    phase: string
    phaseLabel: string
    publicTrust: number
    underwritingSkill: number
    reserves: number
    volumeLent: number
    volumeDeposited: number
    activeLoans: number
    defaults: number
    openDeposits: number
    investments: number
    inCrisis: boolean
    institution: boolean
    lastEvent: string | null
  }[]
  /** bandit_parallel pack — optional bag on state. */
  parallelGangs: number
  parallelBounties: number
  parallelNegotiating: number
  parallelWired: boolean
  parallelGangRows: {
    id: string
    name: string
    phase: string
    phaseLabel: string
    members: number
    notoriety: number
    activeBounties: number
    bountyTotal: number
    negotiating: boolean
    deals: number
    raids: number
    parallelCoin: number
    lastEvent: string | null
  }[]
  /** Ring of recent prices — Economie sparklines. */
  priceHistoryRows: {
    res: string
    price: number
    delta: number
    deltaPct: number
    spark: number[]
  }[]
  /** Life packs / core synthesis rows for Analyse panels. */
  laborRows: { id: string; title: string; phase: string; detail: string; hot: boolean }[]
  migrantRows: { id: string; title: string; phase: string; detail: string; hot: boolean }[]
  woolRows: { id: string; title: string; phase: string; detail: string; hot: boolean }[]
  kinDynastyRows: { id: string; title: string; phase: string; detail: string; hot: boolean }[]
  faithSchismRows: { id: string; title: string; phase: string; detail: string; hot: boolean }[]
  successionRows: { id: string; title: string; phase: string; detail: string; hot: boolean }[]
  guildEmergenceRows: { id: string; title: string; phase: string; detail: string; hot: boolean }[]
  merchantRows: { id: string; title: string; phase: string; detail: string; hot: boolean }[]
  agriRows: { id: string; title: string; phase: string; detail: string; hot: boolean }[]
  militaryDynastyRows: { id: string; title: string; phase: string; detail: string; hot: boolean }[]
  /** Marriage → family alliance rows (S4). */
  marriageAllianceRows: { id: string; title: string; phase: string; detail: string; hot: boolean }[]
  /** War / diplomacy rows (S34 alliance vs 3e, S37 war deaths, S40 costly peace). */
  warDiplomacyRows: { id: string; title: string; phase: string; detail: string; hot: boolean }[]
  /** PARTIAL proof counters for player-visible emergence. */
  emergenceProofs: {
    id: string
    scenario: string
    label: string
    value: string
    ready: boolean
    detail: string
  }[]
}

/** Sparse chronicle flags — each fires at most once per world. */
export interface SimMilestones {
  firstHouse: boolean
  firstPath: boolean
  firstRoad: boolean
  firstMill: boolean
  firstPort: boolean
  firstMarket: boolean
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
  /** First crystallized creed / voie de foi. */
  firstCreed: boolean
  /** First emergent shrine / autel. */
  firstShrine: boolean
  /** First communal rite at a shrine or faith circle. */
  firstRitual: boolean
  /** First chapel upgrade from a shrine. */
  firstChapel: boolean
  /** First temple upgrade from a chapel. */
  firstTemple: boolean
  /** First brigand band chronicled. */
  firstBandits: boolean
  /** First stone keep / donjon chronicled. */
  firstKeep: boolean
  /** First chiefdom / kingdom tier crystallised. */
  firstRealm: boolean
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
  /** Hostile human brigands (not villagers). */
  bandits: Bandit[]
  /** Brigand bands camping outside villages. */
  bands: Band[]
  villages: Village[]
  nextId: number
  nextVillageId: number
  nextBandId: number
  births: number
  deaths: number
  /** Villager deaths caused by wolves (hunt or fight). */
  deathsByWolf: number
  /** Villager deaths caused by brigands. */
  deathsByBandit: number
  /** Villagers detached as outcasts/bandits (not counted in deaths). */
  deserters: number
  bridges: number
  thefts: number
  brawls: number
  /**
   * Mutual-aid category counters (§30 / WP6) — incremented on successful help acts.
   * Keys: food, teach, defend, build, haul, labor.
   */
  helpCounters: {
    food: number
    teach: number
    defend: number
    build: number
    haul: number
    labor: number
  }
  /**
   * Society instrumentation (§§34–37 / WP10) — longevity, creed followups, conflict taxonomy.
   * Writers live in societyMetrics.ts; probes/harness snapshot only.
   */
  societyCounters: {
    circlesFormed: number
    circlesDissolved: number
    circlePeakAgeTicks: number
    institutionsFormed: number
    institutionsDissolved: number
    institutionPeakAgeTicks: number
    institutionsLived30d: number
    circleJoins: number
    circleDrops: number
    creedChanges: number
    creedBehaviorFollowups: number
    conflictsTotal: number
    conflictsByCause: Record<string, number>
    banditUnlockCalendar: number
    banditUnlockPressure: number
  }
  /**
   * Migration instrumentation (§33 / WP11) — urge bands vs leave/found/rejoin.
   * Writers live in migrationMetrics.ts; probes/harness snapshot only.
   */
  migrationCounters: {
    urgeSamples: number
    urgeMax: number
    urgeCross070: number
    urgeCross086: number
    urgeCross094: number
    leaveAttempts: number
    leaves: number
    leavesByCause: Record<string, number>
    blockedBy: Record<string, number>
    rejoins: number
    foundCamps: number
    distinctDestinations: number
    migrateHomelessLeave: number
    migrateHousedLeave: number
    migrateTravelStarts: number
    migrateDestEvals: number
    migrateSettlementAttempts: number
    migrateFails: number
    destReasons: Record<string, number>
    settleBlockReasons: Record<string, number>
  }
  /**
   * DP10 anti-loop / TaskKind day-sequences (measure-first).
   * Writers: behaviorSequenceMetrics.ts; farm multi-day runs excluded from stuck.
   */
  behaviorSeqCounters: {
    seqNpcTracked: number
    seqNpcWithVariation30d: number
    seqNpcStuckLoop14d: number
    seqLongestSameLoopDays: number
    seqUniqueDaySequences: number
    seqSecondaryGoalStableSamples: number
    seqSecondaryGoalStableHits: number
    seqDayOccupancyTeach: number
    seqDayOccupancySocial: number
    seqDayOccupancyRest: number
    seqDampApplications: number
  }
  /**
   * CP2 A→B causality counters (§22). Writers: causalityMetrics.ts.
   * Incomplete chains = CONNECTION_NOT_PROVEN / NOT_TESTED — never PASS.
   */
  causalityCounters: {
    foodHarvestProduces: number
    foodGrindConsumes: number
    foodBakeConsumes: number
    foodEatConsequences: number
    foodStockConsequences: number
    foodNpcCount: number
    teachEvents: number
    teachSkillChanges: number
    /** DEBUG/proxy laterUses (any skill match incl. social). */
    teachLaterUses: number
    /** True chain productive skill reuse after real teach drip. */
    teachTrueLaterUses: number
    teachNpcCount: number
    teachTrueLaterSamples?: Array<{
      tick: number
      day: number
      teacherId: number
      receiverId: number
      skill: string
      skillBefore: number
      skillAfter: number
      learningEventId: number
      futureAction: string
      futureSkillUse: string
      decisionExactId: number
    }>
    creedChanges: number
    creedFollowups: number
    creedNpcCount: number
    creedParentChildTransmissions: number
    creedChildBehaviorInfluenced: number
    creedGenDepthMax: number
    creedGen2Events: number
    creedGen3Events: number
    migrateUrgeCrosses: number
    migrateLeaveAttempts: number
    migrateLeaves: number
    migrateFoundCamps: number
    migrateHomelessLeave: number
    migrateHousedLeave: number
    migrateTravelStarts: number
    migrateDestEvals: number
    migrateSettlementAttempts: number
    migrateRejoins: number
    migrateFails: number
    migrateDestReasons: Record<string, number>
    migrateSettleReasons: Record<string, number>
    priceDeltaEvents: number
    priceTaskShifts: number
    priceProfessionShifts: number
    priceNpcCount: number
    priceChainSamples?: Array<{
      tick: number
      day: number
      stage: 'priceDelta' | 'taskShift' | 'professionShift'
      resource?: string
      npcId?: number
      taskKind?: string
      prevProfession?: string
      nextProfession?: string
      priceBefore?: number
      priceAfter?: number
      shockId?: string | null
    }>
    priceActiveShockId?: string | null
    priceShockTaggedDeltas: number
    priceShockLinkedTaskShifts: number
    priceShockLinkedProfessionShifts: number
    helpEvents: number
    helpOutcomes: number
    helpEventsByKind: Record<string, number>
    helpOutcomesByKind: Record<string, number>
    defendHelpOpportunities: number
    defendHelpTaken: number
    helpNpcCount: number
    helpChainSamples?: Array<{
      tick: number
      day: number
      kind: 'food' | 'teach' | 'defend' | 'build' | 'haul' | 'labor'
      helperId: number
      outcome: boolean
    }>
    familyDecisionUses: number
    familyDecisionNpcCount: number
    familyDecisionSamples?: Array<{
      tick: number
      day: number
      npcId: number
      kind: string
      kinship?: number
      familyValue?: number
    }>
    migrateNpcCount: number
    migrateChainSamples?: Array<{
      tick: number
      day: number
      stage: string
      npcId?: number
      reason?: string
    }>
  }
  /**
   * CP3 attribution counters (§24–26). Writers: attributionMetrics.ts via soft why tags.
   * Incomplete = NOT_TESTED — never auto-PASS.
   */
  attributionCounters: {
    /** DEBUG legacy — not a PASS gate. */
    memoryAttributedDecisions: number
    memoryAttributedNpcs: number
    emotionAttributedDecisions: number
    emotionAttributedNpcs: number
    personalityAttributedDecisions: number
    personalityAttributedNpcs: number
    personalityPairSamples: number
    personalityPairReady: number
    /** DP1 memory causal floors: >=50 / >=30 / >=20 / >=10. */
    memoryMemorableEvents: number
    memoryRetrievals: number
    memoryUses: number
    memoryCausalFlips: number
    memoryMaterialNoFlip: number
    memoryCausalSamples: Array<{
      tick: number
      day: number
      villagerId: number
      beforeKind: string
      afterKind: string
      utilBefore: number
      utilAfter: number
      runnerUpKind: string | null
      runnerUpUtilBefore: number | null
      spotKind: 'danger' | 'good' | 'mixed' | null
      flipped: boolean
    }>
    /** DP2 emotion causal floors: changes>=50 / uses>=30 / flips>=15. */
    emotionChanges: number
    emotionUses: number
    emotionCausalFlips: number
    emotionMaterialNoFlip: number
    emotionCausalSamples: Array<{
      tick: number
      day: number
      villagerId: number
      beforeKind: string
      afterKind: string
      utilBefore: number
      utilAfter: number
      runnerUpKind: string | null
      runnerUpUtilBefore: number | null
      flipped: boolean
    }>
    /** DP3 personality: flips + natural pair divergence (attributed* = DEBUG). */
    personalityUses: number
    personalityCausalFlips: number
    personalityMaterialNoFlip: number
    personalityPairDivergent: number
    personalityCausalSamples: Array<{
      tick: number
      day: number
      villagerId: number
      beforeKind: string
      afterKind: string
      utilBefore: number
      utilAfter: number
      runnerUpKind: string | null
      runnerUpUtilBefore: number | null
      flipped: boolean
    }>
    /** P6 M6.1 family kinship/values.family CF. */
    familyUses: number
    familyCausalFlips: number
    familyMaterialNoFlip: number
    familyCausalSamples: Array<{
      tick: number
      day: number
      villagerId: number
      beforeKind: string
      afterKind: string
      utilBefore: number
      utilAfter: number
      runnerUpKind: string | null
      runnerUpUtilBefore: number | null
      kinship: number
      familyValue: number
      flipped: boolean
    }>
    personalityPairMatchSamples: Array<{
      aId: number
      bId: number
      traitDist: number
      contextDist: number
      histDist: number
      modeA: string
      modeB: string
      divergent: boolean
      totalA: number
      totalB: number
    }>
    /** DP5 profession multi-factor explainability. */
    professionChanges: number
    professionChangesMultiFactor: number
    professionFactorSamples: Array<{
      tick: number
      day: number
      villagerId: number
      prev: string
      next: string
      factors: Array<{ name: string; delta: number }>
      multiFactor: boolean
      foodNeed: number
      source?: string
    }>
  }
  /**
   * CP1 exact decision ledger — noteChosenAction + orphan setTask.
   * PROXY task.kind deltas must NEVER write here. Writers: decisionLedger.ts.
   */
  decisionExact: {
    decisionExactTotal: number
    decisionExactBySource: {
      chooseTask: number
      HARD: number
      setTask: number
      other: number
    }
    decisionSetTaskAssigns: number
    decisionNoteChosenActions: number
    decisionOrphanSetTask: number
    sampleRing: Array<{
      seed: number
      tick: number
      day: number
      villagerId: number
      kind: string
      source: 'chooseTask' | 'HARD' | 'setTask' | 'other'
      whyTag: string
      prevKind?: string | null
    }>
  }
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
  /** Emergent polities (village → chiefdom → kingdom) — never preset kingdoms. */
  polities: Polity[]
  nextPolityId: number
  wars?: PolityWar[]
  nextWarId?: number
  coups?: CoupRecord[]
  firmHireCount?: number
  firmFailCount?: number
  /** Cumulative firm craft pulses via economy applyCraft. */
  firmProduceCount?: number
  /** Local firm plaza sales that feed market founding. */
  firmSellCount?: number
  /** Crafted-goods consumption pulses (clothing/medicine/fuel). */
  firmConsumeCount?: number
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
  /**
   * Phase 7 WAVE 1 — optional economy deposit bag (underground ore mirrors).
   * Lazily seeded by `ensureEconomyDeposits` in economy/deposits.ts; not required
   * at createSimulation. Do not CREATE fake surface ore piles from this field.
   */
  economyDeposits?: Deposit[]
  /** Persistent tunnel mouths — survives village churn for mine crystallize/map. */
  knownMineMouths?: { x: number; y: number }[]
  /** Phase7 WAVE3 business registry — empty until registerBusiness. */
  economyBusinesses?: BusinessRecord[]
  /**
   * credit_bank pack bag — integrator attaches CreditBook[]; panel reads only.
   * Soft type to avoid hard coupling; shape matches emergence/packs/credit_bank.
   */
  creditBooks?: unknown[]
  /**
   * bandit_parallel pack bag — integrator attaches ParallelGang[]; panel reads only.
   */
  parallelGangs?: unknown[]
  /** Informal peer lending count (politics wealth→trust→coin). */
  informalLendCount?: number
  /** Successful formBond calls (S4 / panel). */
  marriageFormedCount?: number
  /** Cross-family / cross-lineage marriages that logged alliance (S4). */
  familyAllianceCount?: number
  /** Soft alliances vs a shared third threat (S34). */
  allianceVsThirdCount?: number
  /** Wars ended because peace was too costly (S40). */
  costlyPeaceCount?: number
  /** War trampling fields → famine risk chronicle (S39). */
  warFamineCount?: number
  /** Soft diagnostic life-type tag hits (survive log rotate). NOT HARD evidence - OR-merge disabled. */
  lifeTagHits?: Partial<Record<string, number>>
  /** Ring buffer of recent market prices (commerce tickMarketPrices). */
  priceHistory?: Partial<Record<string, number[]>>
  /** labor_revolt pack bag — integrator attaches LaborMovement[]. */
  laborMovements?: unknown[]
  /** migrant_quarters pack bag — integrator attaches MigrantQuartersState. */
  migrantQuarters?: unknown
  /** wool_industry pack bag. */
  woolIndustry?: unknown
  /** kin_multigen pack bag. */
  kinGraph?: unknown
  /** dynasty houses bag (optional). */
  dynastyHouses?: unknown[]
  /** religion_schism pack bag. */
  faithMovements?: unknown[]
  /** succession_civil pack bag. */
  successionCrises?: unknown[]
  /** guild_formation pack bag. */
  guildPads?: unknown[]
  /** merchant_network pack bag. */
  merchantNetworks?: unknown[]
  /** agri_invention pack bag. */
  agriInventions?: unknown[]
  /** military_dynasty pack bag. */
  militaryDynasties?: unknown[]
  /**
   * Lot 3A — voxel ChunkStore (Lot 2 build layer).
   * Lazily ensured by ensureBlockWorld when mirroring a BuildBlock place; never rebuilt each tick.
   */
  blocks?: ChunkStore
  /** Lot 3C — construction / collab work-order board. */
  workOrders?: WorkOrder[]
  nextWorkOrderId?: number
  /** Lot 3D — real-action emergence counters. */
  emergence?: EmergenceMetrics
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
