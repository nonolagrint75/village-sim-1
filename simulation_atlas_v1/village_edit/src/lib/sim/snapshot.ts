import { packVillagerAppearance, resolveBeard, sexOf, type BiologicalSex, type HairStyle } from './appearance'
import { packCognitionDebug, type CognitionDebug } from './cognition'
import { mindOf } from './cognition/tick'
import { computeStats } from './engine'
import type { HouseDesign } from './architecture'
import { packEthnosSummary } from './ethnos'
import { packFamilySummary, type FamilySummary } from './family'
import { HORSE_CARRY_BONUS } from './horses'
import { carriedMass, carryCapacityOf, countOf, type ResourceType, type Slot } from './inventory'
import {
  equipmentEffectsOf,
  packEquipmentForUi,
  packWornGearForDraw,
  emptyWornGearVisual,
  type PackedEquipmentSlot,
  type GearEffects,
  type GearId,
  type WornGearVisual,
} from './equipment'
import { bodyMassKgFromPhenotype } from './physicsScale'
import { takeUiLightGate } from './perfBudget'
import {
  circleKindLabel,
  circlesOf,
  creedLabel,
  politicsOf,
  NORM_FR,
  type CircleKind,
  type CreedId,
  type NormId,
} from './politics'
import { religionPortraitFr } from './religion'
import type { Ambition, Memory, Relation } from './social'
import { knowledgeCount, knowledgeLabelsFr } from './technology'
import { ensureLivelihood, topActivitiesFr, livelihoodLabelForUi } from './livelihood'
import { getCalendar, TICKS_PER_DAY } from './calendar'
import { biomeLabelFr } from './biomes'
import { sampleBiome } from './climate'
import { cultureHueFromTag } from './settlementView'
import { carriedLightKind, type ActorLight } from './lighting'
import { hearthAnchor, hearthIsLit, homeIsLit, torchIsLit } from './lightWarmth'
import type {
  BoatKind,
  Phenotype,
  Profession,
  Season,
  SimState,
  SimStats,
  Task,
  ToolTier,
  Villager,
  WallTier,
} from './types'
import { DIRT, GOLD, GRASS, IRON, LOOT, TUNNEL } from './types'
import { isWoodPile } from './world'
import { TUNNEL_ENTRANCE_AMOUNT } from './mining'
import { feelFamine } from './ecology'
import { laborWorkNeeded } from './behaviors'

/** Worn gear ids for sprite layering (lean draw payload). */
export type ActorGearSlots = WornGearVisual

export type ActorVillager = {
  id: number
  name: string
  x: number
  y: number
  hue: number
  /** Melanin 0–1 for skin sprite. */
  pigmentation: number
  /** Hair darkness 0–1. */
  hairTone: number
  /** Biological sex for silhouette / hair length. */
  sex: BiologicalSex
  /** Age in ticks — child / adult / elder sprite scale. */
  age: number
  /** Pixel hair silhouette. */
  hairStyle: HairStyle
  /** Adult male beard when phenotype supports it. */
  beard: boolean
  /** Facial-hair density 0–1 (beard fullness). */
  facialHair: number
  /** Curl continuum — soft hair mass / fringe. */
  hairCurl: number
  /** Outerwear present (cloak / mantle). */
  cloak: boolean
  /** Worn equipment item ids (head/torso/outer/feet/mainHand/offHand/belt). */
  equipment: ActorGearSlots
  /** Alias of equipment for gear-overlay sprites. */
  gear: ActorGearSlots
  mounted: boolean
  embarked: boolean
  hasCart: boolean
  toolTier: ToolTier
  grudgeTarget: number | null
  alive: boolean
  /** Carried candle/torch — local night glow on the canvas (optional lighting pack). */
  holdingLight?: 'torch' | 'candle' | null
  /** Profession for map-readable cloth / tools (visual §40). */
  profession: Profession
  /** Current task kind — held tool / activity cue without UI. */
  taskKind: string | null
  /** Work progress 0..1 for §20 activity arcs (staging activity_tools). */
  workProgress: number
  /** Sim labor threshold for this task (laborWorkNeeded). */
  workNeeded: number
  /** Accumulated task.work. */
  workDone: number
  /** Work family for tool silhouette / arc color. */
  workFamily: string | null
  /** Task target cell for ground cue. */
  taskTx: number
  taskTy: number
  /** High migration urge / founding travel — dashed wave on map (visual §51). */
  migrating: boolean
  migrateTx: number
  migrateTy: number
}

export type ActorSheep = { x: number; y: number; captured: boolean; alive: boolean }
export type ActorHorse = { x: number; y: number; tamed: boolean; riderId: number | null; alive: boolean }
export type ActorBoat = { x: number; y: number; kind: BoatKind; alive: boolean }
export type ActorWolf = { x: number; y: number; alive: boolean }
export type ActorBandit = { x: number; y: number; phase: 'camp' | 'raid' | 'flee'; alive: boolean }
/** Visible brigand hideout in the wilds. */
export type ActorBandCamp = { x: number; y: number; tier: 'camp' | 'lair' }
export type ActorVillage = {
  centerX: number
  centerY: number
  hasPort: boolean
  portX: number
  portY: number
  hasMill: boolean
  millX: number
  millY: number
  hasMine: boolean
  mineX: number
  mineY: number
  /** Open market plaza — drawn as stalls when founded by caravans. */
  hasMarket: boolean
  marketX: number
  marketY: number
  /** 0–100 prosperity — rich/poor wash on the map. */
  prosperity: number
  settlementStage: string
  /** Sacred site for map markers (autel → chapelle → temple). */
  hasShrine: boolean
  shrineX: number
  shrineY: number
  sacredTier: 'none' | 'shrine' | 'chapel' | 'temple'
  wallTier: WallTier
  perimeter: { x: number; y: number }[]
  gates: { x: number; y: number }[]
  /** Soft creed id for sacred/culture analysis overlay. */
  shrineCreed: string | null
  /** Soft development index for analysis wash. */
  development: number
  /** Dominant culture tag among members (visual §§15–18 / 34–37). */
  cultureTag: string | null
  cultureHue: number
  /** 0–1 wool / textile heat for Analyse « laine ». */
  woolHeat: number
  /** 0–1 faith tension for Analyse « schisme ». */
  schismHeat: number
  /** 0–1 succession crisis for Analyse « succession ». */
  successionHeat: number
}

/** Culture-shaped house accent over cutaway mesh (visual §§15–18). */
export type ActorHouse = {
  x: number
  y: number
  shape: string
  wall: 'wood' | 'timber' | 'stone'
  cultureHue: number
  cultureTag: string | null
}

/** Emergent district wash from facilities / craft clusters (visual §§44–47). */
export type ActorDistrict = {
  x: number
  y: number
  r: number
  kind: 'market' | 'craft' | 'harbor' | 'mine' | 'sacred' | 'residential'
}

/** Soft group / guild / council zone on the map (visual §41). */
export type ActorGroupZone = {
  x: number
  y: number
  r: number
  name: string
  kind: string
  memberCount: number
  institutional: boolean
}

/** Livestock pen fence (sim pens — visual §26). */
export type ActorPen = {
  x: number
  y: number
  radius: number
}

/** Abandoned / raided scar markers (visual §§23/48/50/73). */
export type ActorRuin = {
  x: number
  y: number
  kind: 'ruin' | 'raid' | 'clearing' | 'battle'
  /** Soft age in days for time scars (visual §73). */
  ageDays?: number
  /** War intensity 0–1 when kind is battle/raid. */
  intensity?: number
}

/** Soft war/crisis overlays beyond ActorRuin (war_scars pack §§48–50). */
export type ActorScarOverlay = {
  x: number
  y: number
  kind: 'field_burned' | 'fortify_raised' | 'refugee_depart' | 'famine_stress'
  intensity: number
  ageDays?: number
}

/** Blacksmith / workbench workplace for forge_demand distance (mines_ore). */
export type ActorForgeSite = {
  x: number
  y: number
  villageId: number | null
  kind: 'forge' | 'workbench' | 'smith'
}

/** Live mine mouth for nature mine visuals (mines_ore pack §28). */
export type ActorMineMouth = {
  x: number
  y: number
  ore: 'gold' | 'iron' | 'stone'
  active: boolean
  pileCount: number
}

/** Ground goods from LOOT / wood piles / ore / raid drops (visual §57) — sim-backed only. */
export type ActorGroundItemKind =
  | 'loot_goods'
  | 'wood_pile'
  | 'ore_pile'
  | 'trade_crate'
  | 'bag'
  | 'tool_discard'

export type ActorGroundItem = {
  x: number
  y: number
  amount: number
  /** Visual recipe from staging ground_items pack. */
  kind?: ActorGroundItemKind
}

/** Far-zoom civilization blob (visual §§72/74/76) — derived from settlementStage. */
export type ActorCivBlob = {
  x: number
  y: number
  r: number
  stage: string
  crisis?: string
}

/** Non-keep construction scaffolds (houses, halls, markets…). */
export type ActorScaffold = {
  x: number
  y: number
  label: string
  progress: number
}

/** Territory claim ring for map overlay (emergent polities). */
export type ActorPolity = {
  id: number
  cx: number
  cy: number
  claimRadius: number
  tier: string
  name: string
  hasKeep: boolean
}

/** Keep / donjon marker for map overlay. */
export type ActorKeep = {
  x: number
  y: number
  label: string
  done: boolean
  isCastle: boolean
  /** 0–1 build progress (scaffolds / walls / shell). */
  progress: number
}

/** Home roof wash for rich/poor (visual §§30–31). */
export type ActorHome = {
  x: number
  y: number
  wealth: number
  prosperity: number
}

export type InventoryLine = { type: ResourceType; count: number }

/** Continous appearance phrases — never race / ethnicity labels. */
export type PhenotypeSummary = {
  teint: string
  taille: string
  corpulence: string
  yeux: string
  cheveux: string
  sexe: string | null
  barbe: string | null
  lines: string[]
} | null

export type IdentitySummary = {
  cultureTag: string | null
  cultureWeight: number
  creedLabel: string
  birthPlace: string | null
  migrationUrge: number
  diasporaNote: string | null
} | null

export type SelectedVillager = {
  id: number
  name: string
  surname: string
  fullName: string
  hue: number
  /** False when inspecting a corpse / recently deceased. */
  alive: boolean
  profession: Profession
  /** Métier émergent (pratique + reconnaissance). */
  livelihoodTitle: string
  livelihoodRole: string | null
  livelihoodActivities: string[]
  guildName: string | null
  unemployed: boolean
  ambition: Ambition
  grudgeTarget: number | null
  task: Task | null
  /** Map position — for contextual rest labels. */
  x: number
  y: number
  hasHome: boolean
  homeX: number
  homeY: number
  mounted: boolean
  embarked: boolean
  health: number
  hunger: number
  stamina: number
  staminaMax: number
  loadMass: number
  loadCap: number
  personality: Villager['personality']
  house: HouseDesign | null
  /** Non-empty stacks only — lean for UI transfer. */
  inventory: InventoryLine[]
  horseId: number | null
  hasCart: boolean
  boatId: number | null
  boatKind: BoatKind | null
  toolTier: ToolTier
  /** On-person medieval kit (body slots). */
  equipment: PackedEquipmentSlot[]
  equipmentEffects: Pick<GearEffects, 'clo' | 'protect' | 'prestige' | 'wealthDisplay' | 'carryKg'>
  gearPrestige01: number
  purseCoins: number
  relations: [number, Relation][]
  memories: Memory[]
  creed: CreedId | null
  creedLabel: string
  /** Soft faith / shrine / gourou blurb for the portrait. */
  religionNote: string | null
  legitimacy: number
  grievance: number
  circleNames: string[]
  /**
   * Mind / cognition summary for the portrait « Cognition » block.
   * Null when cognition pack fails — portrait must still render.
   */
  cognition: CognitionDebug | null
  /** Null if family module not ready. */
  family: FamilySummary | null
  /** Null if genetics not expressed yet. */
  phenotype: PhenotypeSummary
  identity: IdentitySummary
  lineageWealth: number | null
  descendantCount: number
  /** Generative techniques known by this villager. */
  knowledgeCount: number
  knowledgeLabels: string[]
  /** Shared village technique library size (0 if no village). */
  villageKnowledgeCount: number
  /** Local biome French label (climate lattice). */
  biomeLabel: string | null
  /** Sprite appearance for portrait avatar (same fields as map draw). */
  sex: BiologicalSex
  age: number
  hairStyle: HairStyle
  beard: boolean
  facialHair: number
  hairCurl: number
  pigmentation: number
  hairTone: number
  cloak: boolean
  gear: WornGearVisual
}

/** Alias — mind summary shipped inside `SelectedVillager.cognition`. */
export type MindSummary = CognitionDebug

/** Lean lineage row for Société « Généalogie ». */
export type UiLineageRow = {
  id: number
  surname: string
  livingCount: number
  deadCount: number
  reputation: number
  wealthEstimate: number
  traditions: string[]
  faded: boolean
  renamedFrom: string | null
  memberNames: string[]
  moreMembers: number
  summary: string
}

export type UiCountRow = { label: string; count: number }

/** Lean project / fort / shrine row for Royaume. */
export type UiProjectRow = {
  id: number
  label: string
  phase: string
  phaseLabel: string
  purposes: string[]
  isFort: boolean
  /** Stone keep / donjon (scale / towers / stone walls). */
  isKeep: boolean
  isShrine: boolean
  villageLabel: string | null
  progressNote: string
}

/** Brigand band row for Royaume. */
export type UiBandRow = {
  id: number
  name: string
  members: number
  raids: number
  tradeAmbushes: number
  originLabel: string
  phaseHint: string
  campLabel: string
}

/** Shrine / religion site row. */
export type UiReligionSiteRow = {
  villageId: number
  label: string
  creedLabel: string | null
  hasShrine: boolean
  sacredTier: 'none' | 'shrine' | 'chapel' | 'temple'
  tierLabel: string
}

export type DrawFrame = {
  season: Season
  /** Calendar hour-of-day (0–23) for visual day/night overlay. */
  hour: number
  villagers: ActorVillager[]
  sheep: ActorSheep[]
  horses: ActorHorse[]
  boats: ActorBoat[]
  wolves: ActorWolf[]
  bandits: ActorBandit[]
  /** Brigand camps / repaires in the wilds. */
  bandCamps: ActorBandCamp[]
  villages: ActorVillage[]
  /** Emergent polity claim rings (chefferies / royaumes). */
  polities: ActorPolity[]
  /** Keep / donjon markers from fortify projects. */
  keeps: ActorKeep[]
  /** Non-keep construction scaffolds (halls, markets, houses…). */
  scaffolds: ActorScaffold[]
  /** History scars — abandoned / raided sites. */
  ruins: ActorRuin[]
  /** Soft war overlays: burned fields, palisade, refugees, famine haze. */
  scarOverlays: ActorScarOverlay[]
  /** Mine mouths (village.hasMine + knownMineMouths). */
  mineMouths: ActorMineMouth[]
  /** Smith workplaces for forge_demand distance. */
  forgeSites: ActorForgeSite[]
  /** Ground loot piles (sim LOOT tiles — visual §57). */
  groundItems: ActorGroundItem[]
  /** Far-zoom civilization stage blobs (visual §§72/74/76). */
  civBlobs: ActorCivBlob[]
  tradeLinks: { ax: number; ay: number; bx: number; by: number }[]
  /** Owned homes for rich/poor roof wash. */
  homes: ActorHome[]
  /** Culture house accents (shape + hue). */
  houses: ActorHouse[]
  /** Emergent district cues inside settlements. */
  districts: ActorDistrict[]
  /** Group / guild / council map zones. */
  groupZones: ActorGroupZone[]
  /** Livestock pens. */
  pens: ActorPen[]
  /** Static fire sources (hearths from homeFurniture); terrain hearths scanned on canvas. */
  lights: ActorLight[]
  ticksPerSec: number
}

/** Lean group row for the Société « Groupes » view — members capped. */
export type UiGroupRow = {
  id: number
  name: string
  kind: CircleKind
  kindLabel: string
  memberCount: number
  /** Up to MAX_UI_GROUP_MEMBERS living member names. */
  memberNames: string[]
  moreMembers: number
  leaderName: string | null
  isInstitution: boolean
  isGuild: boolean
  isCouncil: boolean
  legitimacy: number
  reputation: number
  villageLabel: string | null
  /** Short goal / norm / origin blurb. */
  summary: string
}

export type UiFrame = {
  stats: SimStats
  chronicle: string[]
  /**
   * Echo of the worker's current selection id (alive or dead entity).
   * Main thread ignores frames where this ≠ local selectedRef.
   */
  selectedId: number | null
  /**
   * Packed villager for the portrait — equipment + mind summary included.
   * Null only when `selectedId` is null or the entity was purged from state.
   */
  selected: SelectedVillager | null
  groups: UiGroupRow[]
  lineages: UiLineageRow[]
  /** Emergent culture-tag histogram (not languages unless ethnos lands). */
  cultures: UiCountRow[]
  creeds: UiCountRow[]
  /** Active / recent build projects (forts, shrines, halls…). */
  projects: UiProjectRow[]
  /** Brigand bands camping outside villages. */
  bands: UiBandRow[]
  /** Village shrines / sacred sites. */
  religionSites: UiReligionSiteRow[]
  ticksPerSec: number
}

export type PackUiOptions = {
  /**
   * Select-reply / priority pack: still echoes selectedId + full selected payload,
   * but skips heavy lineage/culture tallies so the reply is never starved.
   */
  priority?: boolean
}

const MAX_UI_GROUP_MEMBERS = 8
const MAX_UI_LINEAGE_MEMBERS = 8

function continuumBand(v: number, low: string, mid: string, high: string): string {
  if (v < 0.34) return low
  if (v < 0.67) return mid
  return high
}

/** French continuous-trait summary — genetics ≠ race labels. */
export function packPhenotypeSummary(
  ph: Phenotype | null | undefined,
  v?: Pick<Villager, 'sex' | 'age' | 'seed'> | null,
): PhenotypeSummary {
  if (!ph) return null
  const teint = continuumBand(ph.pigmentation, 'teint clair', 'teint moyen', 'teint foncé')
  const taille = continuumBand(ph.height, 'petite stature', 'taille moyenne', 'grande stature')
  const corpulence = continuumBand(ph.build, 'silhouette fine', 'silhouette moyenne', 'silhouette robuste')
  const yeux = continuumBand(ph.eyeTone, 'yeux clairs', 'yeux mixtes', 'yeux sombres')
  const hairTone = continuumBand(ph.hairTone, 'cheveux clairs', 'cheveux mixtes', 'cheveux sombres')
  const hairCurl = continuumBand(ph.hairCurl, 'lisses', 'ondulés', 'crépus')
  const cheveux = `${hairTone}, ${hairCurl}`
  let sexe: string | null = null
  let barbe: string | null = null
  if (v) {
    const sex = sexOf(v)
    const age = Number.isFinite(v.age) ? v.age : 0
    const facialHair = ph.facialHair ?? 0.35
    sexe = sex === 'female' ? 'femme' : 'homme'
    if (resolveBeard(sex, age, facialHair)) {
      barbe = facialHair > 0.72 ? 'barbe fournie' : facialHair > 0.5 ? 'barbe' : 'barbe naissante'
    }
  }
  const lines = [sexe, teint, taille, corpulence, yeux, cheveux, barbe].filter(
    (x): x is string => !!x,
  )
  return { teint, taille, corpulence, yeux, cheveux, sexe, barbe, lines }
}

function packIdentitySummary(state: SimState, v: Villager): IdentitySummary {
  try {
    const mind = mindOf(v)
    const pol = politicsOf(v)
    const eth = packEthnosSummary(state, v)
    let birthPlace: string | null = eth.birthRegion ? `région ${eth.birthRegion}` : null
    if (v.villageId !== null) {
      const vg = state.villages.find((g) => g.id === v.villageId)
      birthPlace = vg
        ? `village n°${vg.id} (${Math.round(vg.centerX)}, ${Math.round(vg.centerY)})`
        : `village n°${v.villageId}`
    } else if (v.hasHome) {
      birthPlace = `foyer (${Math.round(v.homeX)}, ${Math.round(v.homeY)})`
    }
    let diasporaNote: string | null = null
    if (eth.diaspora) diasporaNote = 'diaspora (garde langue / culture avec adaptation)'
    else if (pol.migrationUrge > 0.55) diasporaNote = 'envie de partir forte'
    else if (pol.migrationUrge > 0.3) diasporaNote = 'inquiétude migratoire'
    const bits: string[] = []
    if (eth.language) bits.push(`langue ${eth.language}`)
    if (eth.ethnie) bits.push(`peuple ${eth.ethnie}`)
    else if (eth.hybrid) bits.push('identité métissée')
    return {
      cultureTag: mind.cultureTag ?? eth.selfTags[0] ?? null,
      cultureWeight: mind.cultureWeight,
      creedLabel: creedLabel(pol.creed),
      birthPlace,
      migrationUrge: pol.migrationUrge,
      diasporaNote: bits.length ? `${diasporaNote ? diasporaNote + ' · ' : ''}${bits.join(' · ')}` : diasporaNote,
    }
  } catch {
    return null
  }
}

function countDescendants(state: SimState, rootId: number, maxDepth = 4): number {
  let n = 0
  const visit = (id: number, depth: number) => {
    if (depth > maxDepth) return
    for (const o of state.villagers) {
      if (!o.alive) continue
      if (o.parentIds.includes(id) || o.motherId === id || o.fatherId === id) {
        n++
        visit(o.id, depth + 1)
      }
    }
  }
  visit(rootId, 0)
  return n
}

function groupSummaryText(norms: NormId[], originStory: string | null, creed: string | null, memory: string[]): string {
  if (norms.length > 0) {
    return norms.map((n) => NORM_FR[n] ?? n).join(' · ')
  }
  if (originStory) return originStory
  if (creed) return creed
  if (memory.length > 0) return memory[memory.length - 1]
  return 'Pas de norme affichée'
}

export function packGroups(state: SimState): UiGroupRow[] {
  const byId = new Map<number, string>()
  for (const v of state.villagers) {
    if (v.alive) byId.set(v.id, v.name)
  }
  const rows: UiGroupRow[] = new Array(state.circles.length)
  for (let i = 0; i < state.circles.length; i++) {
    const c = state.circles[i]
    const names: string[] = []
    for (const mid of c.memberIds) {
      const n = byId.get(mid)
      if (!n) continue
      if (names.length < MAX_UI_GROUP_MEMBERS) names.push(n)
    }
    const aliveCount = c.memberIds.reduce((acc, mid) => acc + (byId.has(mid) ? 1 : 0), 0)
    const leaderName = c.leaderId !== null ? (byId.get(c.leaderId) ?? null) : null
    let villageLabel: string | null = null
    if (c.villageId !== null) {
      const vg = state.villages.find((v) => v.id === c.villageId)
      villageLabel = vg
        ? `Village n°${vg.id} (${Math.round(vg.centerX)}, ${Math.round(vg.centerY)})`
        : `Village n°${c.villageId}`
    }
    const isGuild = !!c.isGuild
    const isCouncil =
      c.isInstitution && (c.kind === 'elder' || c.kind === 'village' || c.name.startsWith('conseil'))
    rows[i] = {
      id: c.id,
      name: c.name,
      kind: c.kind,
      kindLabel: isGuild ? 'guilde' : isCouncil ? 'conseil' : circleKindLabel(c.kind),
      memberCount: aliveCount,
      memberNames: names,
      moreMembers: Math.max(0, aliveCount - names.length),
      leaderName,
      isInstitution: c.isInstitution || isGuild,
      isGuild,
      isCouncil,
      legitimacy: c.legitimacy,
      reputation: c.reputation,
      villageLabel,
      summary: isGuild
        ? `guilde · ${groupSummaryText(c.norms, c.originStory, c.creed, c.memory)}`
        : isCouncil
          ? `conseil · ${groupSummaryText(c.norms, c.originStory, c.creed, c.memory)}`
          : groupSummaryText(c.norms, c.originStory, c.creed, c.memory),
    }
  }
  rows.sort((a, b) => {
    if (a.isInstitution !== b.isInstitution) return a.isInstitution ? -1 : 1
    if (a.name.startsWith('guilde') !== b.name.startsWith('guilde')) return a.name.startsWith('guilde') ? -1 : 1
    if (b.legitimacy !== a.legitimacy) return b.legitimacy - a.legitimacy
    return a.name.localeCompare(b.name, 'fr')
  })
  return rows
}

export function packLineages(state: SimState): UiLineageRow[] {
  if (!state.lineages || state.lineages.length === 0) return []
  const byId = new Map<number, string>()
  for (const v of state.villagers) {
    if (v.alive) byId.set(v.id, v.surname ? `${v.name} ${v.surname}` : v.name)
  }
  const rows: UiLineageRow[] = []
  for (const L of state.lineages) {
    if (L.faded && L.livingCount === 0) continue
    const names: string[] = []
    let alive = 0
    for (const mid of L.memberIds) {
      const n = byId.get(mid)
      if (!n) continue
      alive++
      if (names.length < MAX_UI_LINEAGE_MEMBERS) names.push(n)
    }
    const living = Math.max(alive, L.livingCount)
    rows.push({
      id: L.id,
      surname: L.surname || 'sans nom',
      livingCount: living,
      deadCount: L.deadCount,
      reputation: L.reputation,
      wealthEstimate: L.wealthEstimate,
      traditions: L.traditions.slice(-4),
      faded: L.faded,
      renamedFrom: L.renamedFrom,
      memberNames: names,
      moreMembers: Math.max(0, living - names.length),
      summary:
        L.traditions.length > 0
          ? L.traditions.slice(-3).join(' · ')
          : L.renamedFrom
            ? `ex-${L.renamedFrom}`
            : living > 0
              ? 'lignée vivante'
              : 'mémoire seule',
    })
  }
  rows.sort((a, b) => {
    if (b.livingCount !== a.livingCount) return b.livingCount - a.livingCount
    if (b.reputation !== a.reputation) return b.reputation - a.reputation
    return a.surname.localeCompare(b.surname, 'fr')
  })
  return rows
}

export function packCultureCounts(state: SimState): UiCountRow[] {
  const map = new Map<string, number>()
  for (const v of state.villagers) {
    if (!v.alive) continue
    try {
      const tag = mindOf(v).cultureTag
      if (!tag) continue
      map.set(tag, (map.get(tag) ?? 0) + 1)
    } catch {
      /* mind not ready */
    }
  }
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'fr'))
    .slice(0, 12)
}

export function packCreedCounts(state: SimState): UiCountRow[] {
  const map = new Map<string, number>()
  for (const v of state.villagers) {
    if (!v.alive) continue
    const label = creedLabel(politicsOf(v).creed)
    if (!label || label === 'aucune') continue
    map.set(label, (map.get(label) ?? 0) + 1)
  }
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
}

const PROJECT_PHASE_FR: Record<string, string> = {
  clear: 'défrichement',
  gather: 'collecte',
  build: 'construction',
  done: 'achevé',
}

const PURPOSE_UI_FR: Record<string, string> = {
  shelter: 'abri',
  fortify: 'fortification',
  gather: 'halle',
  store: 'grenier',
  mine: 'mine',
  mining_access: 'mine',
  prestige: 'prestige',
  homestead: 'foyer',
  shrine: 'autel',
  chapel: 'chapelle',
  temple: 'temple',
}

/** Active + recent civic works (forts, autels, halles…). */
export function packProjects(state: SimState): UiProjectRow[] {
  const projects = state.projects ?? []
  if (projects.length === 0) return []
  const rows: UiProjectRow[] = []
  for (const p of projects) {
    const purposes = p.intent?.purposes ?? []
    const isFort = purposes.includes('fortify')
    const isShrine =
      purposes.includes('shrine') || purposes.includes('chapel') || purposes.includes('temple')
    const isKeep =
      isFort &&
      (p.params?.towers ||
        p.params?.wallMaterial === 'stone' ||
        (p.intent?.scale ?? 0) >= 0.5)
    let villageLabel: string | null = null
    if (p.villageId !== null) {
      const vg = state.villages.find((v) => v.id === p.villageId)
      villageLabel = vg
        ? `Village n°${vg.id}`
        : `Village n°${p.villageId}`
    }
    const pending = p.pending?.length ?? 0
    const phase = String(p.phase)
    let progressNote = PROJECT_PHASE_FR[phase] ?? phase
    if (phase === 'build' && pending > 0) progressNote = `${pending} segment${pending > 1 ? 's' : ''} restant${pending > 1 ? 's' : ''}`
    else if (phase === 'done') progressNote = 'achevé'
    rows.push({
      id: p.id,
      label: p.label || 'ouvrage',
      phase,
      phaseLabel: PROJECT_PHASE_FR[phase] ?? phase,
      purposes: purposes.map((u) => PURPOSE_UI_FR[u] ?? u),
      isFort,
      isKeep,
      isShrine,
      villageLabel,
      progressNote,
    })
  }
  rows.sort((a, b) => {
    if (a.phase === 'done' !== (b.phase === 'done')) return a.phase === 'done' ? 1 : -1
    if (a.isKeep !== b.isKeep) return a.isKeep ? -1 : 1
    if (a.isFort !== b.isFort) return a.isFort ? -1 : 1
    if (a.isShrine !== b.isShrine) return a.isShrine ? -1 : 1
    return b.id - a.id
  })
  return rows.slice(0, 12)
}

/** Brigand bands for Royaume. */
export function packBands(state: SimState): UiBandRow[] {
  const bands = state.bands ?? []
  if (bands.length === 0) return []
  const alive = new Set((state.bandits ?? []).filter((b) => b.alive).map((b) => b.id))
  const rows: UiBandRow[] = []
  for (const band of bands) {
    const members = band.memberIds.filter((id) => alive.has(id)).length
    if (members === 0 && band.raids === 0) continue
    const phases = (state.bandits ?? [])
      .filter((b) => b.alive && b.bandId === band.id)
      .map((b) => b.phase)
    const raiding = phases.filter((p) => p === 'raid').length
    const fleeing = phases.filter((p) => p === 'flee').length
    let phaseHint = 'au camp'
    if (raiding > 0) phaseHint = `en razzia (${raiding})`
    else if (fleeing > 0) phaseHint = 'en fuite'
    const tier = band.hideoutTier === 'lair' ? 'repaire' : 'camp'
    rows.push({
      id: band.id,
      name: band.name,
      members,
      raids: band.raids,
      tradeAmbushes: band.tradeAmbushes ?? 0,
      originLabel: band.origin === 'outcasts' ? 'bannis' : 'vagabonds',
      phaseHint,
      campLabel: `${tier} (${Math.round(band.campX)}, ${Math.round(band.campY)})`,
    })
  }
  rows.sort((a, b) => b.raids - a.raids || b.members - a.members)
  return rows.slice(0, 8)
}

/** Village shrines / sacred sites. */
export function packReligionSites(state: SimState): UiReligionSiteRow[] {
  const rows: UiReligionSiteRow[] = []
  for (const vg of state.villages) {
    const hasShrine = !!vg.hasShrine
    const sacredTier = vg.sacredTier ?? (hasShrine ? 'shrine' : 'none')
    const creed = vg.shrineCreed ? creedLabel(vg.shrineCreed as CreedId) : null
    if (!hasShrine && !creed && sacredTier === 'none') continue
    const tierLabel =
      sacredTier === 'temple'
        ? 'Temple'
        : sacredTier === 'chapel'
          ? 'Chapelle'
          : sacredTier === 'shrine'
            ? 'Autel'
            : 'Lieu de foi'
    rows.push({
      villageId: vg.id,
      label: vg.shrineLabel || (hasShrine ? tierLabel.toLowerCase() : 'lieu de foi'),
      creedLabel: creed && creed !== 'aucune' ? creed : null,
      hasShrine,
      sacredTier,
      tierLabel,
    })
  }
  return rows.slice(0, 10)
}

export const EMPTY_STATS: SimStats = {
  tick: 0,
  season: 'spring',
  seasonProgress: 0,
  year: 1,
  calendar: getCalendar(0),
  famine: false,
  villagers: 0,
  sheep: 0,
  horsesWild: 0,
  horsesTamed: 0,
  riders: 0,
  carts: 0,
  boats: 0,
  ports: 0,
  markets: 0,
  tradeRunsTotal: 0,
  wolves: 0,
  bandits: 0,
  bands: 0,
  totalCoins: 0,
  totalBread: 0,
  houses: 0,
  pens: 0,
  fields: 0,
  mills: 0,
  villages: 0,
  bridges: 0,
  roadTiles: 0,
  wallTiles: 0,
  naturalCover: 0,
  births: 0,
  deaths: 0,
  deathsByWolf: 0,
  deathsByBandit: 0,
  deserters: 0,
  thefts: 0,
  brawls: 0,
  friendships: 0,
  feuds: 0,
  professions: {
    none: 0,
    forager: 0,
    farmer: 0,
    fisher: 0,
    miller: 0,
    lumberjack: 0,
    mason: 0,
    guard: 0,
    builder: 0,
    herder: 0,
    trader: 0,
    weaver: 0,
    blacksmith: 0,
    miner: 0,
  },
  shapes: {},
  prices: {},
  marketStocks: {},
  circles: 0,
  institutions: 0,
  guilds: 0,
  councils: 0,
  laws: [],
  rumors: 0,
  leadingCircle: null,
  leadingLegitimacy: 0,
  polities: 0,
  chiefdoms: 0,
  kingdoms: 0,
  camps: 0,
  castles: 0,
  polityRows: [],
  techKnown: 0,
  techLabels: [],
  activeWars: 0,
  openWars: 0,
  warBattles: 0,
  coups: 0,
  warRows: [],
  settlementStages: {},
  firms: 0,
  firmHires: 0,
  firmFailures: 0,
  tradeRoutes: 0,
  mines: 0,
  depositsKnown: 0,
  migrating: 0,
  crisisCounts: { stable: 0, crisis: 0, collapse: 0, rebuild: 0 },
  firmRows: [],
  settlementRows: [],
  causalReadouts: [],
  creditBooks: 0,
  creditTrustAvg: 0,
  creditCrises: 0,
  creditInstitutions: 0,
  informalLends: 0,
  creditWired: false,
  creditRows: [],
  parallelGangs: 0,
  parallelBounties: 0,
  parallelNegotiating: 0,
  parallelWired: false,
  parallelGangRows: [],
  priceHistoryRows: [],
  laborRows: [],
  migrantRows: [],
  woolRows: [],
  kinDynastyRows: [],
  faithSchismRows: [],
  successionRows: [],
  guildEmergenceRows: [],
  merchantRows: [],
  agriRows: [],
  militaryDynastyRows: [],
  marriageAllianceRows: [],
  warDiplomacyRows: [],
  emergenceProofs: [],
}

export type WorldFrame = {
  width: number
  height: number
  terrain: Uint8Array
  amount: Uint16Array
}

export type DirtyFrame = {
  indices: Uint32Array
  terrain: Uint8Array
  amount: Uint16Array
}

function summarizeInventory(inv: Slot[]): InventoryLine[] {
  const map = new Map<ResourceType, number>()
  for (const slot of inv) {
    if (!slot.type || slot.count <= 0) continue
    map.set(slot.type, (map.get(slot.type) ?? 0) + slot.count)
  }
  return [...map.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
}

/** Prefer causal / milestone lines; keep a short readable chronicle. */
export function packChronicle(log: string[], limit = 18): string[] {
  if (log.length === 0) return []
  const window = log.slice(-60)
  const causal: string[] = []
  const notable: string[] = []
  const rest: string[] = []
  const notableRe =
    /famine|moulin|port|bateau|barque|chaland|institution|cercle|guilde|conseil|loi|lois|creed|naissance|né de|naît|mariage|unissent|adopte|adoption|enceinte|rempart|pont|sentier|chemin|route|mort|loup|légitimité|norme|fortification|halle|grenier|projet|chantier|gisement|surpeuplement|tempête|orage|front froid|pénurie|migration|errance|découvert|invente|enseigne|savoir|mélange explosif|donjon|meurtrière|charbon|nitrate|souffle de mine|métier|troubadour|gourou|prêtre|réputation|forme |enseigne|apprenti|oisiveté|divertit|console|chefferie|royaume|campement|succède|succession|prétention|rivalité|souverain|territoire|absorbe|contestation|rite|rituel|autel|chapelle|temple|sanctuaire|foi|conversion|convertit|recueillement|sacré|voie de foi|cercle pieux|brigand|bande |razzia|pill|bannis|vagabond|embuscade|repaire|camp |hors-la-loi|keep|fort de|palissade|marché|guerre|bataille|coup |faillite|firme|embauch|hameau|bourg/i

  for (let i = window.length - 1; i >= 0; i--) {
    const entry = window[i]
    if (entry.includes(' → ')) causal.push(entry)
    else if (notableRe.test(entry)) notable.push(entry)
    else rest.push(entry)
  }

  const out: string[] = []
  const seen = new Set<string>()
  const push = (list: string[]) => {
    for (const e of list) {
      if (out.length >= limit) return
      if (seen.has(e)) continue
      seen.add(e)
      out.push(e)
    }
  }
  push(causal)
  push(notable)
  push(rest)
  return out
}

const TIER_RANK_DRAW: Record<string, number> = {
  camp: 0,
  village: 1,
  chiefdom: 2,
  kingdom: 3,
}

export function packDraw(state: SimState, ticksPerSec: number): DrawFrame {
  const villagers: ActorVillager[] = []
  const lights: ActorLight[] = []
  const lightKeys = new Set<string>()
  const pushLight = (x: number, y: number, kind: ActorLight['kind']) => {
    const key = `${x | 0},${y | 0},${kind}`
    if (lightKeys.has(key)) return
    lightKeys.add(key)
    lights.push({ x, y, kind })
  }
  const vv = state.villagers
  for (let i = 0; i < vv.length; i++) {
    const v = vv[i]
    if (!v.alive) continue
    const ph = v.phenotype
    const eq = v.equipment
    const app = packVillagerAppearance(v)
    const held = carriedLightKind(v.inventory)
    const worn = packWornGearForDraw(v)
    const pol = politicsOf(v)
    const urge = pol.migrationUrge
    const taskKind = v.task?.kind ?? null
    const workNeeded =
      !taskKind
        ? 1
        : /buildPort|buildMill/.test(taskKind)
          ? 4
          : /buildCart|craftIron|craftGear/.test(taskKind)
            ? 2.8
            : /build|craft|makeCharcoal|experiment/.test(taskKind)
              ? 2.2
              : 1
    const workProgress = taskKind
      ? Math.max(0, Math.min(1, (v.task?.work ?? 0) / Math.max(0.001, workNeeded)))
      : 0
    const workDone = v.task?.work ?? 0
    const workFamily = !taskKind
      ? null
      : /sow|harvest|tend|field|wheat|farm/.test(taskKind)
        ? 'farm'
        : /smith|craftIron|mint|makeCharcoal|forge/.test(taskKind)
          ? 'smith'
          : /gatherWood|clearLand|chop|gatherFuel/.test(taskKind)
            ? 'chop'
            : /mine|gatherStone|gatherIron|mineGold|mineTunnel|dig/.test(taskKind)
              ? 'mine'
              : /craft|weave|cook|craftGoods|craftSpear|craftGear/.test(taskKind)
                ? 'craft'
                : /build|scaffold|helpBuild/.test(taskKind)
                  ? 'build'
                  : /haul|storeChest|tradeRun|buyMaterial/.test(taskKind)
                    ? 'haul'
                    : 'other'
    const migrating =
      urge > 0.42 ||
      (typeof taskKind === 'string' && taskKind.includes('migrat')) ||
      (urge > 0.28 && !v.hasHome && v.villageId === null)
    let migrateTx = v.x
    let migrateTy = v.y
    if (migrating) {
      if (v.task && (v.task.targetX !== v.x || v.task.targetY !== v.y)) {
        migrateTx = v.task.targetX
        migrateTy = v.task.targetY
      } else if (v.villageId !== null) {
        const homeVg = state.villages.find((x) => x.id === v.villageId)
        if (homeVg) {
          // Steer outward from overcrowded center — wave readable on map.
          const ang = ((v.id * 47) % 360) * (Math.PI / 180)
          migrateTx = homeVg.centerX + Math.cos(ang) * (36 + urge * 40)
          migrateTy = homeVg.centerY + Math.sin(ang) * (36 + urge * 40)
        }
      } else {
        migrateTx = v.x + ((v.id % 7) - 3) * 8
        migrateTy = v.y + (((v.id * 3) % 7) - 3) * 8
      }
    }
    villagers.push({
      id: v.id,
      name: v.name,
      x: v.x,
      y: v.y,
      hue: v.hue,
      pigmentation: ph?.pigmentation ?? 0.45,
      hairTone: ph?.hairTone ?? 0.5,
      sex: app.sex,
      age: app.age,
      hairStyle: app.hairStyle,
      beard: app.beard,
      facialHair: app.facialHair,
      hairCurl: app.hairCurl,
      cloak: !!(eq && eq.outer),
      equipment: worn,
      gear: worn,
      mounted: v.mounted,
      embarked: v.embarked,
      hasCart: v.hasCart,
      toolTier: v.toolTier,
      grudgeTarget: v.grudgeTarget,
      alive: true,
      holdingLight: torchIsLit(v, state.tick) && held === 'torch' ? 'torch' : null,
      profession: v.profession ?? 'none',
      taskKind,
      workProgress,
      workNeeded,
      workDone,
      workFamily,
      taskTx: v.task?.targetX ?? v.x,
      taskTy: v.task?.targetY ?? v.y,
      migrating,
      migrateTx,
      migrateTy,
    })
    const keeper = v.homeOwnerId !== null && v.homeOwnerId !== v.id
      ? (vv.find((o) => o.id === v.homeOwnerId && o.alive) ?? v)
      : v
    const furn = v.homeFurniture
    if (furn && v.hasHome && v.homeOwnerId === v.id) {
      let hearthLit = false
      for (let f = 0; f < furn.length; f++) {
        const p = furn[f]
        if (p.id === 'hearth' && hearthIsLit(keeper, state.tick)) {
          pushLight(p.x, p.y, 'hearth')
          hearthLit = true
        }
      }
      // Candle / lamp at home when lit and hearth isn't already the glow source.
      if (!hearthLit && homeIsLit(keeper, state.tick) && keeper.homeLightUntil > state.tick) {
        const ha = hearthAnchor(keeper)
        pushLight(ha.x, ha.y, 'candle')
      }
    }
  }
  const sheep: ActorSheep[] = []
  const ss = state.sheep
  for (let i = 0; i < ss.length; i++) {
    const s = ss[i]
    if (!s.alive) continue
    sheep.push({ x: s.x, y: s.y, captured: s.captured, alive: true })
  }
  const horses: ActorHorse[] = []
  const hh = state.horses
  for (let i = 0; i < hh.length; i++) {
    const h = hh[i]
    if (!h.alive) continue
    horses.push({ x: h.x, y: h.y, tamed: h.tamed, riderId: h.riderId, alive: true })
  }
  const boats: ActorBoat[] = []
  const bb = state.boats
  for (let i = 0; i < bb.length; i++) {
    const b = bb[i]
    if (!b.alive) continue
    boats.push({ x: b.x, y: b.y, kind: b.kind, alive: true })
  }
  const wolves: ActorWolf[] = []
  const ww = state.wolves
  for (let i = 0; i < ww.length; i++) {
    const w = ww[i]
    if (!w.alive) continue
    wolves.push({ x: w.x, y: w.y, alive: true })
  }
  const bandits: ActorBandit[] = []
  const bbands = state.bandits
  for (let i = 0; i < bbands.length; i++) {
    const b = bbands[i]
    if (!b.alive) continue
    bandits.push({ x: b.x, y: b.y, phase: b.phase, alive: true })
  }
  const bandCamps: ActorBandCamp[] = []
  for (const band of state.bands ?? []) {
    if (band.memberIds.length === 0) continue
    bandCamps.push({
      x: band.campX,
      y: band.campY,
      tier: band.hideoutTier === 'lair' ? 'lair' : 'camp',
    })
  }
  const villages: ActorVillage[] = new Array(state.villages.length)
  const byId = new Map<number, (typeof state.villages)[0]>()
  const districts: ActorDistrict[] = []
  const softBags = state as typeof state & {
    woolIndustry?: { boomBust?: { phase?: string; priceIndex?: number }; firms?: { settlementId?: number; herdSize?: number }[] }
    faithMovements?: { villageId: number; phase: string }[]
    successionCrises?: { villageId: number; phase: string; polityId: number }[]
  }
  const woolPhase = softBags.woolIndustry?.boomBust?.phase
  const woolPhaseBoost =
    woolPhase === 'boom' ? 0.35 : woolPhase === 'crash' || woolPhase === 'glut' ? 0.25 : 0.1
  const schismByVillage = new Map<number, number>()
  for (const m of softBags.faithMovements ?? []) {
    const heat =
      m.phase === 'schism' || m.phase === 'tension' || m.phase === 'regional'
        ? 0.9
        : m.phase === 'latent'
          ? 0.15
          : 0.45
    schismByVillage.set(m.villageId, Math.max(schismByVillage.get(m.villageId) ?? 0, heat))
  }
  const succByVillage = new Map<number, number>()
  for (const c of softBags.successionCrises ?? []) {
    if (c.phase === 'resolved' || c.phase === 'collapsed' || c.phase === 'latent') continue
    succByVillage.set(c.villageId, 0.85)
  }
  for (const w of state.wars ?? []) {
    if (w.status === 'ended' || w.cause !== 'succession_spill') continue
    for (const p of state.polities ?? []) {
      if (p.id !== w.aId && p.id !== w.bId) continue
      for (const vid of p.villageIds ?? []) succByVillage.set(vid, Math.max(succByVillage.get(vid) ?? 0, 0.7))
    }
  }
  for (let i = 0; i < state.villages.length; i++) {
    const vg = state.villages[i]
    byId.set(vg.id, vg)
    // Dominant culture among living members.
    const cultCounts = new Map<string, number>()
    let craftN = 0
    let craftX = 0
    let craftY = 0
    let resN = 0
    let resX = 0
    let resY = 0
    for (const mid of vg.memberIds ?? []) {
      const m = state.villagers.find((x) => x.id === mid && x.alive)
      if (!m) continue
      const tag = mindOf(m).cultureTag
      if (tag) cultCounts.set(tag, (cultCounts.get(tag) ?? 0) + 1)
      const prof = m.profession ?? 'none'
      if (
        prof === 'mason' ||
        prof === 'blacksmith' ||
        prof === 'weaver' ||
        prof === 'miller' ||
        prof === 'builder'
      ) {
        craftN++
        craftX += m.homeX >= 0 ? m.homeX : m.x
        craftY += m.homeY >= 0 ? m.homeY : m.y
      }
      if (m.hasHome && m.homeOwnerId === m.id && m.homeX >= 0) {
        resN++
        resX += m.homeX
        resY += m.homeY
      }
    }
    let cultureTag: string | null = null
    let best = 0
    for (const [t, n] of cultCounts) {
      if (n > best) {
        best = n
        cultureTag = t
      }
    }
    let cultureHue = 38
    if (cultureTag) {
      let h = 2166136261
      for (let ci = 0; ci < cultureTag.length; ci++) {
        h ^= cultureTag.charCodeAt(ci)
        h = Math.imul(h, 16777619)
      }
      cultureHue = (h >>> 0) % 360
    }
    villages[i] = {
      centerX: vg.centerX,
      centerY: vg.centerY,
      hasPort: vg.hasPort,
      portX: vg.portX,
      portY: vg.portY,
      hasMill: vg.hasMill,
      millX: vg.millX,
      millY: vg.millY,
      hasMine: vg.hasMine,
      mineX: vg.mineX,
      mineY: vg.mineY,
      hasMarket: !!vg.hasMarket,
      marketX: vg.marketX ?? vg.centerX,
      marketY: vg.marketY ?? vg.centerY,
      prosperity: Number.isFinite(vg.prosperity) ? vg.prosperity : 40,
      settlementStage: vg.settlementStage ?? 'village',
      hasShrine: !!vg.hasShrine,
      shrineX: vg.shrineX ?? -1,
      shrineY: vg.shrineY ?? -1,
      sacredTier: vg.sacredTier ?? (vg.hasShrine ? 'shrine' : 'none'),
      wallTier: vg.wallTier,
      perimeter: vg.perimeter,
      gates: vg.gates,
      shrineCreed: vg.shrineCreed ?? null,
      development: Number.isFinite(vg.development) ? vg.development : 0,
      cultureTag,
      cultureHue,
      woolHeat: Math.max(
        0,
        Math.min(
          1,
          woolPhaseBoost +
            Math.min(0.5, ((vg.surplus?.wool ?? 0) + (vg.surplus?.cloth ?? 0)) * 0.12) +
            (state.prices?.wool != null ? Math.min(0.25, (state.prices.wool / 8) * 0.2) : 0),
        ),
      ),
      schismHeat: Math.max(
        schismByVillage.get(vg.id) ?? 0,
        vg.hasShrine && vg.shrineCreed ? 0.2 : 0,
      ),
      successionHeat: succByVillage.get(vg.id) ?? 0,
    }
    // Emergent district cues from facilities + craft/home clusters (visual §§44–47).
    if (vg.hasMarket) {
      districts.push({
        x: vg.marketX ?? vg.centerX,
        y: vg.marketY ?? vg.centerY,
        r: 7 + Math.min(8, (vg.prosperity ?? 40) / 20),
        kind: 'market',
      })
    }
    if (vg.hasPort) {
      districts.push({ x: vg.portX, y: vg.portY, r: 6, kind: 'harbor' })
    }
    if (vg.hasMine) {
      districts.push({ x: vg.mineX, y: vg.mineY, r: 5.5, kind: 'mine' })
    }
    if (vg.hasShrine && (vg.shrineX ?? -1) >= 0) {
      districts.push({ x: vg.shrineX!, y: vg.shrineY!, r: 5, kind: 'sacred' })
    }
    if (craftN >= 2) {
      districts.push({
        x: craftX / craftN,
        y: craftY / craftN,
        r: 5 + Math.min(6, craftN),
        kind: 'craft',
      })
    }
    if (resN >= 4) {
      districts.push({
        x: resX / resN,
        y: resY / resN,
        r: 8 + Math.min(10, resN * 0.4),
        kind: 'residential',
      })
    }
  }
  const tradeLinks: { ax: number; ay: number; bx: number; by: number }[] = []
  for (const key of state.tradeRoutes) {
    const dash = key.indexOf('-')
    if (dash < 0) continue
    const a = Number(key.slice(0, dash))
    const b = Number(key.slice(dash + 1))
    const va = byId.get(a)
    const vb = byId.get(b)
    if (va && vb) tradeLinks.push({ ax: va.centerX, ay: va.centerY, bx: vb.centerX, by: vb.centerY })
  }

  const polities: ActorPolity[] = []
  for (const p of state.polities ?? []) {
    if (TIER_RANK_DRAW[p.tier] < 1 && p.claimRadius < 18) continue
    const cap = byId.get(p.capitalVillageId) ?? byId.get(p.villageIds[0] ?? -1)
    if (!cap) continue
    let hasKeep = false
    for (const pr of state.projects ?? []) {
      if (pr.villageId === null || !p.villageIds.includes(pr.villageId)) continue
      if (pr.phase !== 'done' || !pr.intent.purposes.includes('fortify')) continue
      if (pr.params.towers || pr.params.wallMaterial === 'stone' || pr.intent.scale >= 0.5) {
        hasKeep = true
        break
      }
    }
    polities.push({
      id: p.id,
      cx: cap.centerX,
      cy: cap.centerY,
      claimRadius: Math.max(8, Math.round(p.claimRadius)),
      tier: p.tier,
      name: p.name,
      hasKeep,
    })
  }
  polities.sort((a, b) => (TIER_RANK_DRAW[b.tier] ?? 0) - (TIER_RANK_DRAW[a.tier] ?? 0))

  const keeps: ActorKeep[] = []
  const scaffolds: ActorScaffold[] = []
  for (const pr of state.projects ?? []) {
    const purposes = pr.intent?.purposes ?? []
    const isFort = purposes.includes('fortify')
    if (isFort) {
      if ((pr.intent.scale ?? 0) < 0.25 && pr.phase === 'done') continue
      const isCastle =
        !!pr.params?.towers || pr.params?.wallMaterial === 'stone' || (pr.intent?.scale ?? 0) >= 0.5
      if (!isCastle && pr.phase === 'done') continue
      keeps.push({
        x: pr.cx,
        y: pr.cy,
        label: pr.label || 'fort',
        done: pr.phase === 'done',
        isCastle,
        progress:
          pr.phase === 'done'
            ? 1
            : (() => {
                const pending = pr.pending?.length ?? 0
                return pending <= 0 ? 0.85 : Math.max(0.08, Math.min(0.9, 1 - pending / (pending + 10)))
              })(),
      })
      continue
    }
    if (pr.phase === 'done') continue
    const pending = pr.pending?.length ?? 0
    // Soft progress: fewer pending wall cells ⇒ closer to done (no fake completion).
    const progress = pending <= 0 ? 0.85 : Math.max(0.05, Math.min(0.9, 1 - pending / (pending + 8)))
    scaffolds.push({
      x: pr.cx,
      y: pr.cy,
      label: pr.label || purposes[0] || 'chantier',
      progress,
    })
  }

  // History scars: low-prosperity, recent band raids, empty homes, crises (visual §§23/48/50/73).
  const ruins: ActorRuin[] = []
  const raidWindow = 240 * 8
  for (const vg of state.villages) {
    const pop = vg.memberIds?.length ?? 0
    const ageDays = Math.max(0, Math.floor((state.tick - (vg.lastCrisisTick ?? 0)) / TICKS_PER_DAY))
    if ((vg.prosperity ?? 50) < 18 && pop <= 2) {
      ruins.push({ x: vg.centerX, y: vg.centerY, kind: 'ruin', ageDays })
    }
    if (vg.crisisPhase === 'collapse' || vg.crisisPhase === 'crisis') {
      ruins.push({
        x: vg.centerX + 1.5,
        y: vg.centerY - 1,
        kind: vg.crisisPhase === 'collapse' ? 'ruin' : 'raid',
        ageDays,
        intensity: vg.crisisPhase === 'collapse' ? 0.7 : 0.4,
      })
    }
  }
  for (const band of state.bands ?? []) {
    if ((band.lastRaidTick ?? 0) > 0 && state.tick - band.lastRaidTick < raidWindow) {
      if (ruins.length >= 28) break
      ruins.push({
        x: band.campX,
        y: band.campY,
        kind: 'raid',
        ageDays: Math.floor((state.tick - band.lastRaidTick) / TICKS_PER_DAY),
        intensity: 0.45,
      })
    }
  }
  for (const war of state.wars ?? []) {
    // Active or recent battles leave combat scars on capitals + front (visual §50 / war_scars pack).
    const recent =
      war.status !== 'ended' ||
      (war.lastBattleTick > 0 && state.tick - war.lastBattleTick < raidWindow)
    if (!recent && war.battles < 1) continue
    if (war.intensity < 0.15 && war.battles < 1) continue
    const caps: { x: number; y: number }[] = []
    for (const pid of [war.aId, war.bId]) {
      const pol = state.polities?.find((p) => p.id === pid)
      if (!pol) continue
      const cap = state.villages.find((v) => v.id === pol.capitalVillageId)
      if (!cap || ruins.length >= 28) continue
      caps.push({ x: cap.centerX, y: cap.centerY })
      ruins.push({
        x: cap.centerX,
        y: cap.centerY,
        kind: war.battles >= 1 ? 'battle' : 'raid',
        ageDays: Math.floor((state.tick - (war.lastBattleTick || war.startedTick)) / TICKS_PER_DAY),
        intensity: war.intensity,
      })
      // Secondary village scars when war is hot (not capital-only).
      if (war.battles >= 2 && war.intensity > 0.35) {
        for (const vid of pol.villageIds ?? []) {
          if (vid === pol.capitalVillageId) continue
          const vg = state.villages.find((v) => v.id === vid)
          if (!vg || ruins.length >= 28) break
          ruins.push({
            x: vg.centerX + 0.8,
            y: vg.centerY - 0.6,
            kind: 'battle',
            ageDays: Math.floor((state.tick - (war.lastBattleTick || war.startedTick)) / TICKS_PER_DAY),
            intensity: war.intensity * 0.65,
          })
        }
      }
    }
    if (caps.length >= 2 && ruins.length < 28) {
      ruins.push({
        x: (caps[0]!.x + caps[1]!.x) * 0.5,
        y: (caps[0]!.y + caps[1]!.y) * 0.5,
        kind: 'battle',
        ageDays: Math.floor((state.tick - (war.lastBattleTick || war.startedTick)) / TICKS_PER_DAY),
        intensity: Math.min(1, war.intensity * 1.05),
      })
    }
  }
  for (const v of state.villagers) {
    if (v.alive) continue
    if (!v.hasHome || v.homeOwnerId !== v.id) continue
    if (v.homeX < 0 || v.homeY < 0) continue
    if (ruins.length >= 24) break
    ruins.push({ x: v.homeX, y: v.homeY, kind: 'ruin' })
  }

  const homes: ActorHome[] = []
  const houses: ActorHouse[] = []
  const pens: ActorPen[] = []
  for (const v of state.villagers) {
    if (!v.alive || !v.hasHome || v.homeOwnerId !== v.id) continue
    if (v.homeX < 0 || v.homeY < 0) continue
    const coin = countOf(v.inventory, 'coin') + (v.chestInventory ? countOf(v.chestInventory, 'coin') : 0)
    const vg = v.villageId != null ? state.villages.find((x) => x.id === v.villageId) : null
    const wealth = Math.max(0, Math.min(1, coin / 28 + (v.hasWorkbench ? 0.12 : 0) + (v.hasCart ? 0.08 : 0)))
    homes.push({
      x: v.homeX,
      y: v.homeY,
      wealth,
      prosperity: Math.max(0, Math.min(1, (vg?.prosperity ?? 40) / 100)),
    })
    const tag = mindOf(v).cultureTag
    let hue = 38
    if (tag) {
      let h = 2166136261
      for (let ci = 0; ci < tag.length; ci++) {
        h ^= tag.charCodeAt(ci)
        h = Math.imul(h, 16777619)
      }
      hue = (h >>> 0) % 360
    }
    const wallRaw = v.house?.wallMaterial ?? 'wood'
    const wall: ActorHouse['wall'] =
      wallRaw === 'stone' ? 'stone' : wallRaw === 'timber' ? 'timber' : 'wood'
    houses.push({
      x: v.homeX,
      y: v.homeY,
      shape: v.house?.shape ?? 'square',
      wall,
      cultureHue: hue,
      cultureTag: tag,
    })
    if (v.hasPen && v.penX >= 0) {
      pens.push({ x: v.penX, y: v.penY, radius: 3 })
    }
    if (homes.length >= 48) break
  }

  const groupZones: ActorGroupZone[] = []
  for (const c of state.circles ?? []) {
    let sx = 0
    let sy = 0
    let n = 0
    for (const mid of c.memberIds) {
      const m = state.villagers.find((x) => x.id === mid && x.alive)
      if (!m) continue
      sx += m.x
      sy += m.y
      n++
    }
    if (n < 2) continue
    sx /= n
    sy /= n
    let maxD = 4
    for (const mid of c.memberIds) {
      const m = state.villagers.find((x) => x.id === mid && x.alive)
      if (!m) continue
      maxD = Math.max(maxD, Math.hypot(m.x - sx, m.y - sy))
    }
    groupZones.push({
      x: sx,
      y: sy,
      r: Math.min(28, Math.max(5, maxD * 0.85 + 2)),
      name: c.name,
      kind: c.kind,
      memberCount: n,
      institutional: !!(c.isInstitution || c.isGuild),
    })
    if (groupZones.length >= 20) break
  }

  // Ground piles from sim terrain (visual §57 / ground_items pack): LOOT, wood piles, ore tipples.
  const groundItems: ActorGroundItem[] = []
  {
    const g = state.grid
    const w = g.width
    const h = g.height
    const cellHash = (x: number, y: number) => {
      let n = (x * 374761393 + y * 668265263) | 0
      n = Math.imul(n ^ (n >>> 13), 1274126177)
      return ((n ^ (n >>> 16)) >>> 0) / 4294967296
    }
    const push = (x: number, y: number, amount: number, kind: ActorGroundItemKind) => {
      if (groundItems.length >= 96) return
      groundItems.push({ x, y, amount: Math.max(1, amount), kind })
    }
    // Dense LOOT scan so death/raid drops near settlements are never skipped.
    for (let y = 0; y < h && groundItems.length < 96; y++) {
      for (let x = 0; x < w && groundItems.length < 96; x++) {
        const i = y * w + x
        const t = g.terrain[i]
        const am = g.amount[i] ?? 0
        if (t === LOOT) {
          push(x, y, am, am >= 8 ? 'trade_crate' : am >= 3 ? 'bag' : 'loot_goods')
          continue
        }
        if (isWoodPile(g, x, y) && am >= 1 && cellHash(x, y) > 0.35) {
          push(x, y, am, 'wood_pile')
          continue
        }
        if ((t === GOLD || t === IRON) && am > 0 && cellHash(x, y) > 0.55) {
          push(x, y, Math.max(1, am), 'ore_pile')
        }
      }
    }
    // Ore tipples beside live mine mouths (mines_ore pack).
    for (const vg of state.villages) {
      if (!vg.hasMine || vg.mineX < 0) continue
      const mx = vg.mineX | 0
      const my = vg.mineY | 0
      let oreNear = 0
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const x = mx + dx
          const y = my + dy
          if (x < 0 || y < 0 || x >= w || y >= h) continue
          const t = g.terrain[y * w + x]
          if (t === GOLD || t === IRON || (t === TUNNEL && (g.amount[y * w + x] ?? 0) >= TUNNEL_ENTRANCE_AMOUNT)) {
            oreNear++
          }
        }
      }
      push(mx + 1.15, my + 0.35, Math.max(2, 1 + oreNear * 2), 'ore_pile')
    }
  }

  
  // War/crisis soft overlays (war_scars pack — field burn, palisade, refugees, famine).
  const scarOverlays: ActorScarOverlay[] = []
  {
    const pushScar = (x: number, y: number, kind: ActorScarOverlay['kind'], intensity: number, ageDays = 0) => {
      if (scarOverlays.length >= 36) return
      scarOverlays.push({ x, y, kind, intensity: Math.max(0.15, Math.min(1, intensity)), ageDays })
    }
    for (const war of state.wars ?? []) {
      if (war.battles < 1 && war.intensity < 0.35) continue
      const recent =
        war.status !== 'ended' ||
        (war.lastBattleTick > 0 && state.tick - war.lastBattleTick < TICKS_PER_DAY * 8)
      if (!recent) continue
      for (const pid of [war.aId, war.bId]) {
        const pol = state.polities?.find((p) => p.id === pid)
        const cap = pol ? state.villages.find((v) => v.id === pol.capitalVillageId) : null
        if (!cap) continue
        pushScar(
          cap.centerX + 2,
          cap.centerY + 1,
          'field_burned',
          war.intensity * 0.85,
          Math.floor((state.tick - (war.lastBattleTick || war.startedTick)) / TICKS_PER_DAY),
        )
      }
    }
    for (const vg of state.villages) {
      const famine = feelFamine(state, vg)
      if (famine || vg.crisisPhase === 'crisis' || vg.crisisPhase === 'collapse') {
        pushScar(
          vg.centerX,
          vg.centerY,
          'famine_stress',
          (famine ? 0.55 : 0.3) + ((vg.prosperity ?? 50) < 20 ? 0.15 : 0),
          Math.max(0, Math.floor((state.tick - (vg.lastCrisisTick ?? state.tick)) / TICKS_PER_DAY)),
        )
      }
      if (vg.wallTier === 'wood' || vg.wallTier === 'stone') {
        const underAttack = (state.wars ?? []).some(
          (w) =>
            w.status !== 'ended' &&
            state.polities?.some(
              (p) =>
                (p.id === w.aId || p.id === w.bId) &&
                (p.capitalVillageId === vg.id || (p.villageIds ?? []).includes(vg.id)),
            ),
        )
        if (underAttack || (vg.crisisPhase && vg.crisisPhase !== 'stable')) {
          pushScar(vg.centerX - 2, vg.centerY + 1.5, 'fortify_raised', vg.wallTier === 'stone' ? 0.9 : 0.55)
        }
      }
    }
    for (const vv of state.villagers ?? []) {
      if (!vv.alive) continue
      const urge = politicsOf(vv).migrationUrge
      if (urge < 0.48) continue
      pushScar(vv.x, vv.y, 'refugee_depart', Math.min(1, urge))
      if (scarOverlays.length >= 28) break
    }
  }

  // Mine mouths from village.hasMine + sticky knownMineMouths (mines_ore pack).
  const mineMouths: ActorMineMouth[] = []
  {
    const seen = new Set<string>()
    const pushMouth = (x: number, y: number, active: boolean) => {
      const k = `${x|0},${y|0}`
      if (seen.has(k) || mineMouths.length >= 32) return
      seen.add(k)
      const g = state.grid
      let ore: ActorMineMouth['ore'] = 'stone'
      let piles = 1
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const xx = (x | 0) + dx
          const yy = (y | 0) + dy
          if (xx < 0 || yy < 0 || xx >= g.width || yy >= g.height) continue
          const t = g.terrain[yy * g.width + xx]
          if (t === GOLD) {
            ore = 'gold'
            piles++
          } else if (t === IRON) {
            if (ore !== 'gold') ore = 'iron'
            piles++
          }
        }
      }
      const miners = state.villagers.some(
        (v) =>
          v.alive &&
          v.task &&
          /mine|dig/.test(v.task.kind ?? '') &&
          Math.abs(v.x - x) + Math.abs(v.y - y) <= 4,
      )
      mineMouths.push({
        x,
        y,
        ore,
        active: active || miners,
        pileCount: Math.max(1, Math.min(3, piles)),
      })
    }
    for (const vg of state.villages) {
      if (vg.hasMine && vg.mineX >= 0) pushMouth(vg.mineX, vg.mineY, true)
    }
    for (const m of state.knownMineMouths ?? []) pushMouth(m.x, m.y, false)
  }

  // Forge / workbench sites for mine→forge visual distance (§12 / mines_ore).
  const forgeSites: ActorForgeSite[] = []
  {
    for (const vg of state.villages) {
      if (forgeSites.length >= 24) break
      if (vg.hasMarket || vg.hasMine) {
        // Soft workplace near centre when smiths/workbenches exist
        const smith = state.villagers.find(
          (v) => v.alive && v.villageId === vg.id && (v.profession === 'blacksmith' || v.hasWorkbench),
        )
        if (smith) {
          forgeSites.push({
            x: smith.homeX >= 0 ? smith.homeX : vg.centerX,
            y: smith.homeY >= 0 ? smith.homeY : vg.centerY,
            villageId: vg.id,
            kind: smith.profession === 'blacksmith' ? 'forge' : 'workbench',
          })
        }
      }
    }
    for (const v of state.villagers) {
      if (forgeSites.length >= 24) break
      if (!v.alive || !v.hasWorkbench) continue
      const k = `${v.homeX|0},${v.homeY|0}`
      if (forgeSites.some((f) => `${f.x|0},${f.y|0}` === k)) continue
      forgeSites.push({
        x: v.homeX >= 0 ? v.homeX : v.x,
        y: v.homeY >= 0 ? v.homeY : v.y,
        villageId: v.villageId,
        kind: v.profession === 'blacksmith' ? 'smith' : 'workbench',
      })
    }
  }

// Far-zoom civilization blobs from settlement stages (visual §§72/74/76).
  const civBlobs: ActorCivBlob[] = state.villages.slice(0, 24).map((vg) => ({
    x: vg.centerX,
    y: vg.centerY,
    r: Math.max(
      4,
      (vg.settlementStage === 'city'
        ? 18
        : vg.settlementStage === 'town'
          ? 14
          : vg.settlementStage === 'village'
            ? 10
            : vg.settlementStage === 'hamlet'
              ? 7
              : 5) *
        (1 + Math.min(0.4, (vg.memberIds?.length ?? 0) / 40)),
    ),
    stage: vg.settlementStage ?? 'camp',
    crisis: vg.crisisPhase && vg.crisisPhase !== 'stable' ? vg.crisisPhase : undefined,
  }))

  return {
    season: state.season,
    hour: getCalendar(state.tick).hour,
    villagers,
    sheep,
    horses,
    boats,
    wolves,
    bandits,
    bandCamps,
    villages,
    polities: polities.slice(0, 16),
    keeps: keeps.slice(0, 12),
    scaffolds: scaffolds.slice(0, 20),
    ruins: ruins.slice(0, 28),
    scarOverlays,
    mineMouths,
    forgeSites,
    groundItems,
    civBlobs,
    tradeLinks,
    homes,
    houses: houses.slice(0, 48),
    districts: districts.slice(0, 36),
    groupZones,
    pens: pens.slice(0, 24),
    lights,
    ticksPerSec,
  }
}

function emptyEquipmentPack(): {
  slots: PackedEquipmentSlot[]
  effects: GearEffects
  prestige01: number
  purseCoins: number
} {
  return {
    slots: [],
    effects: { clo: 0, protect: 0, prestige: 0, wealthDisplay: 0, carryKg: 0, work: 0, combat: 0, toolTier: null },
    prestige01: 0,
    purseCoins: 0,
  }
}

function cloneableRelation(r: Relation): Relation {
  return {
    affinity: r.affinity ?? 0,
    trust: r.trust ?? 0,
    lastTick: r.lastTick ?? 0,
    debt: r.debt ?? 0,
    grudge: r.grudge ?? 0,
    kinship: r.kinship ?? 0,
    respect: r.respect ?? 0,
    history: Array.isArray(r.history)
      ? r.history.slice(-4).map((h) => ({ kind: h.kind, tick: h.tick }))
      : [],
  }
}

function cloneableMemory(m: Memory): Memory {
  return {
    kind: m.kind,
    subjectId: m.subjectId ?? null,
    x: m.x ?? 0,
    y: m.y ?? 0,
    tick: m.tick ?? 0,
    weight: m.weight ?? 0,
    emotion: m.emotion ?? 0,
  }
}

/** Bare portrait payload — always structured-cloneable; used when full pack throws. */
export function packSelectedMinimal(v: Villager): SelectedVillager {
  const personality = v.personality ?? {
    courage: 0.5,
    sociability: 0.5,
    ambition: 0.5,
    generosity: 0.5,
    curiosity: 0.5,
  }
  let equipment: PackedEquipmentSlot[] = []
  let equipmentEffects: SelectedVillager['equipmentEffects'] = {
    clo: 0,
    protect: 0,
    prestige: 0,
    wealthDisplay: 0,
    carryKg: 0,
  }
  let gearPrestige01 = 0
  let purseCoins = 0
  try {
    const packed = packEquipmentForUi(v)
    equipment = packed.slots.filter(Boolean)
    equipmentEffects = {
      clo: packed.effects.clo,
      protect: packed.effects.protect,
      prestige: packed.effects.prestige,
      wealthDisplay: packed.effects.wealthDisplay,
      carryKg: packed.effects.carryKg,
    }
    gearPrestige01 = packed.prestige01
    purseCoins = packed.purseCoins
  } catch {
    /* keep empty kit */
  }
  let cognition: CognitionDebug | null = null
  try {
    cognition = packCognitionDebug(v)
  } catch {
    cognition = null
  }
  return {
    id: v.id,
    name: v.name ?? `#${v.id}`,
    surname: v.surname ?? '',
    fullName: v.surname ? `${v.name} ${v.surname}` : (v.name ?? `#${v.id}`),
    hue: Number.isFinite(v.hue) ? v.hue : 40,
    alive: !!v.alive,
    profession: v.profession ?? 'none',
    livelihoodTitle: PROFESSION_FALLBACK(v.profession),
    livelihoodRole: null,
    livelihoodActivities: [],
    guildName: null,
    unemployed: false,
    ambition: v.ambition ?? 'survive',
    grudgeTarget: v.grudgeTarget ?? null,
    task: null,
    x: Number.isFinite(v.x) ? v.x : 0,
    y: Number.isFinite(v.y) ? v.y : 0,
    hasHome: !!v.hasHome,
    homeX: Number.isFinite(v.homeX) ? v.homeX : 0,
    homeY: Number.isFinite(v.homeY) ? v.homeY : 0,
    mounted: !!v.mounted,
    embarked: !!v.embarked,
    health: Number.isFinite(v.health) ? v.health : 0,
    hunger: Number.isFinite(v.hunger) ? v.hunger : 0,
    stamina: Number.isFinite(v.stamina) ? v.stamina : 4,
    staminaMax: 4,
    loadMass: 0,
    loadCap: 1,
    personality,
    house: v.house ?? null,
    inventory: [],
    horseId: v.horseId ?? null,
    hasCart: !!v.hasCart,
    boatId: v.boatId ?? null,
    boatKind: null,
    toolTier: v.toolTier ?? 'none',
    equipment,
    equipmentEffects,
    gearPrestige01,
    purseCoins,
    relations: [],
    memories: [],
    creed: null,
    creedLabel: 'aucune',
    religionNote: null,
    legitimacy: 0,
    grievance: 0,
    circleNames: [],
    cognition,
    family: null,
    phenotype: packPhenotypeSummary(v.phenotype, v),
    identity: null,
    lineageWealth: null,
    descendantCount: 0,
    knowledgeCount: 0,
    knowledgeLabels: [],
    villageKnowledgeCount: 0,
    biomeLabel: null,
    sex: (() => {
      try {
        return packVillagerAppearance(v).sex
      } catch {
        return sexOf(v)
      }
    })(),
    age: Number.isFinite(v.age) ? v.age : 400,
    hairStyle: (() => {
      try {
        return packVillagerAppearance(v).hairStyle
      } catch {
        return 'short'
      }
    })(),
    beard: (() => {
      try {
        return packVillagerAppearance(v).beard
      } catch {
        return false
      }
    })(),
    facialHair: (() => {
      try {
        return packVillagerAppearance(v).facialHair
      } catch {
        return 0
      }
    })(),
    hairCurl: (() => {
      try {
        return packVillagerAppearance(v).hairCurl
      } catch {
        return 0.35
      }
    })(),
    pigmentation: v.phenotype?.pigmentation ?? 0.45,
    hairTone: v.phenotype?.hairTone ?? 0.5,
    cloak: !!(v.equipment && v.equipment.outer),
    gear: (() => {
      try {
        return packWornGearForDraw(v)
      } catch {
        return emptyWornGearVisual()
      }
    })(),
  }
}

function packSelected(state: SimState, v: Villager): SelectedVillager {
  let polCreed: ReturnType<typeof politicsOf>['creed'] = null
  let polLegitimacy = 0
  let polGrievance = 0
  let creedLbl = 'aucune'
  try {
    const pol = politicsOf(v)
    polCreed = pol.creed
    polLegitimacy = pol.legitimacy ?? 0
    polGrievance = pol.grievance ?? 0
    creedLbl = creedLabel(pol.creed)
  } catch {
    /* bare politics */
  }

  const boat = v.boatId !== null ? state.boats.find((b) => b.id === v.boatId && b.alive) : undefined
  let family: FamilySummary | null = null
  try {
    family = packFamilySummary(state, v)
  } catch {
    family = null
  }
  const lineage =
    v.lineageId !== null && state.lineages
      ? state.lineages.find((L) => L.id === v.lineageId) ?? null
      : null

  let livelihoodTitle = 'sans métier'
  let livelihoodRole: string | null = null
  let livelihoodActivities: string[] = []
  let guildName: string | null = null
  let unemployed = false
  try {
    const mind = mindOf(v)
    const live = ensureLivelihood(mind)
    livelihoodTitle = livelihoodLabelForUi(v)
    livelihoodRole = live.roleTag
    livelihoodActivities = topActivitiesFr(live, 3)
    unemployed = live.unemployedStreak > 40
    guildName = circlesOf(state, v).find((c) => c.isGuild || (c.kind === 'craft' && c.isInstitution))?.name ?? null
  } catch {
    livelihoodTitle = PROFESSION_FALLBACK(v.profession)
  }

  let packedEq = emptyEquipmentPack()
  try {
    packedEq = packEquipmentForUi(v)
  } catch {
    packedEq = emptyEquipmentPack()
  }

  let gearFx = packedEq.effects
  try {
    gearFx = equipmentEffectsOf(v)
  } catch {
    gearFx = packedEq.effects
  }

  let loadMass = 0
  let loadCap = 1
  try {
    loadMass = carriedMass(v.inventory ?? [])
    loadCap =
      carryCapacityOf({
        hasCart: !!v.hasCart,
        mounted: !!v.mounted,
        horseBonus: HORSE_CARRY_BONUS,
        bodyMassKg: bodyMassKgFromPhenotype(v.phenotype),
        strength01: v.phenotype?.strengthBias ?? 0.5,
      }) + (gearFx.carryKg ?? 0)
  } catch {
    loadMass = 0
    loadCap = 1
  }

  let inventory: InventoryLine[] = []
  try {
    inventory = summarizeInventory(v.inventory ?? [])
  } catch {
    inventory = []
  }

  let relations: [number, Relation][] = []
  try {
    const entries = v.relations instanceof Map ? [...v.relations.entries()] : []
    entries.sort((a, b) => {
      const sa =
        Math.abs(a[1]?.affinity ?? 0) * 1.2 +
        (a[1]?.respect ?? 0) * 0.9 +
        (a[1]?.grudge ?? 0) * 0.8 +
        (a[1]?.kinship ?? 0) * 0.5 +
        (a[1]?.trust ?? 0) * 0.2
      const sb =
        Math.abs(b[1]?.affinity ?? 0) * 1.2 +
        (b[1]?.respect ?? 0) * 0.9 +
        (b[1]?.grudge ?? 0) * 0.8 +
        (b[1]?.kinship ?? 0) * 0.5 +
        (b[1]?.trust ?? 0) * 0.2
      return sb - sa
    })
    relations = entries.slice(0, 12).map(([id, rel]) => [id, cloneableRelation(rel)])
  } catch {
    relations = []
  }

  let cognition: CognitionDebug | null = null
  try {
    cognition = packCognitionDebug(v)
  } catch {
    cognition = null
  }

  let circleNames: string[] = []
  try {
    circleNames = circlesOf(state, v).map((c) =>
      c.isGuild ? `${c.name} (guilde)` : c.isInstitution ? `${c.name} (institution)` : c.name,
    )
  } catch {
    circleNames = []
  }

  const personality = v.personality ?? {
    courage: 0.5,
    sociability: 0.5,
    ambition: 0.5,
    generosity: 0.5,
    curiosity: 0.5,
  }

  let memories: Memory[] = []
  try {
    const raw = Array.isArray(v.memories) ? (v.memories.length <= 8 ? v.memories : v.memories.slice(-8)) : []
    memories = raw.map(cloneableMemory)
  } catch {
    memories = []
  }

  return {
    id: v.id,
    name: v.name ?? `#${v.id}`,
    surname: v.surname ?? '',
    fullName: v.surname ? `${v.name} ${v.surname}` : (v.name ?? `#${v.id}`),
    hue: v.hue ?? 40,
    // Keep false for corpses — do not coerce dead → alive.
    alive: !!v.alive,
    profession: v.profession ?? 'none',
    livelihoodTitle,
    livelihoodRole,
    livelihoodActivities,
    guildName,
    unemployed,
    ambition: v.ambition ?? 'survive',
    grudgeTarget: v.grudgeTarget ?? null,
    task: v.task
      ? {
          kind: v.task.kind,
          targetX: v.task.targetX,
          targetY: v.task.targetY,
          targetId: v.task.targetId,
          resource: v.task.resource,
          stuckTicks: v.task.stuckTicks,
          ageTicks: v.task.ageTicks,
          work: v.task.work,
          path: null,
          pathI: 0,
          pathTx: v.task.targetX,
          pathTy: v.task.targetY,
          pathTick: 0,
        }
      : null,
    x: Number.isFinite(v.x) ? v.x : 0,
    y: Number.isFinite(v.y) ? v.y : 0,
    hasHome: !!v.hasHome,
    homeX: Number.isFinite(v.homeX) ? v.homeX : 0,
    homeY: Number.isFinite(v.homeY) ? v.homeY : 0,
    mounted: !!v.mounted,
    embarked: !!v.embarked,
    health: Number.isFinite(v.health) ? v.health : 0,
    hunger: Number.isFinite(v.hunger) ? v.hunger : 0,
    stamina: Number.isFinite(v.stamina) ? v.stamina : 4,
    staminaMax: 4,
    loadMass,
    loadCap,
    personality,
    house: v.house ?? null,
    inventory,
    horseId: v.horseId ?? null,
    hasCart: !!v.hasCart,
    boatId: v.boatId ?? null,
    boatKind: boat?.kind ?? null,
    toolTier: v.toolTier ?? 'none',
    equipment: Array.isArray(packedEq.slots) ? packedEq.slots.filter(Boolean) : [],
    equipmentEffects: {
      clo: gearFx.clo ?? 0,
      protect: gearFx.protect ?? 0,
      prestige: gearFx.prestige ?? 0,
      wealthDisplay: gearFx.wealthDisplay ?? 0,
      carryKg: gearFx.carryKg ?? 0,
    },
    gearPrestige01: packedEq.prestige01 ?? 0,
    purseCoins: packedEq.purseCoins ?? 0,
    relations,
    memories,
    creed: polCreed,
    creedLabel: creedLbl,
    religionNote: (() => {
      try {
        return religionPortraitFr(state, v, mindOf(v))
      } catch {
        return null
      }
    })(),
    legitimacy: polLegitimacy,
    grievance: polGrievance,
    circleNames,
    cognition,
    family,
    phenotype: packPhenotypeSummary(v.phenotype, v),
    identity: packIdentitySummary(state, v),
    lineageWealth: lineage ? lineage.wealthEstimate : null,
    descendantCount: (() => {
      try {
        return countDescendants(state, v.id)
      } catch {
        return 0
      }
    })(),
    knowledgeCount: (() => {
      try {
        return knowledgeCount(v.knowledge)
      } catch {
        return 0
      }
    })(),
    knowledgeLabels: (() => {
      try {
        return knowledgeLabelsFr(v.knowledge, 5)
      } catch {
        return []
      }
    })(),
    villageKnowledgeCount: (() => {
      try {
        return v.villageId !== null
          ? knowledgeCount(state.villages.find((g) => g.id === v.villageId)?.knowledge)
          : 0
      } catch {
        return 0
      }
    })(),
    biomeLabel: (() => {
      try {
        return state.climate ? biomeLabelFr(sampleBiome(state.climate, v.x, v.y)) : null
      } catch {
        return null
      }
    })(),
    sex: (() => {
      try {
        return packVillagerAppearance(v).sex
      } catch {
        return sexOf(v)
      }
    })(),
    age: Number.isFinite(v.age) ? v.age : 400,
    hairStyle: (() => {
      try {
        return packVillagerAppearance(v).hairStyle
      } catch {
        return 'short'
      }
    })(),
    beard: (() => {
      try {
        return packVillagerAppearance(v).beard
      } catch {
        return false
      }
    })(),
    facialHair: (() => {
      try {
        return packVillagerAppearance(v).facialHair
      } catch {
        return 0
      }
    })(),
    hairCurl: (() => {
      try {
        return packVillagerAppearance(v).hairCurl
      } catch {
        return 0.35
      }
    })(),
    pigmentation: v.phenotype?.pigmentation ?? 0.45,
    hairTone: v.phenotype?.hairTone ?? 0.5,
    cloak: !!(v.equipment && v.equipment.outer),
    gear: (() => {
      try {
        return packWornGearForDraw(v)
      } catch {
        return emptyWornGearVisual()
      }
    })(),
  }
}

function PROFESSION_FALLBACK(p: Profession | undefined): string {
  if (!p || p === 'none') return 'sans métier'
  return p
}

/** Resolve selected villager by id — alive or dead (until purge). */
export function findSelectedVillager(state: SimState, selectedId: number | null): Villager | null {
  if (selectedId === null) return null
  const list = state.villagers
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === selectedId) return list[i]
  }
  return null
}

/** Pack selected entity; never returns null when the villager is still in state. */
export function packSelectedSafe(state: SimState, v: Villager): SelectedVillager {
  try {
    return packSelected(state, v)
  } catch {
    return packSelectedMinimal(v)
  }
}

export function packUi(
  state: SimState,
  selectedId: number | null,
  ticksPerSec: number,
  opts?: PackUiOptions,
): UiFrame {
  const entity = findSelectedVillager(state, selectedId)
  const selected = entity ? packSelectedSafe(state, entity) : null
  // Under load / select priority: still pack groups; stagger heavier tallies.
  const light = opts?.priority ? true : takeUiLightGate()
  let stats = EMPTY_STATS
  let chronicle: string[] = []
  let groups: UiGroupRow[] = []
  try {
    stats = computeStats(state)
  } catch {
    stats = EMPTY_STATS
  }
  try {
    chronicle = packChronicle(state.log)
  } catch {
    chronicle = []
  }
  try {
    groups = packGroups(state)
  } catch {
    groups = []
  }
  return {
    stats,
    chronicle,
    selectedId,
    selected,
    groups,
    lineages: light
      ? []
      : (() => {
          try {
            return packLineages(state)
          } catch {
            return []
          }
        })(),
    cultures: light
      ? []
      : (() => {
          try {
            return packCultureCounts(state)
          } catch {
            return []
          }
        })(),
    creeds: light
      ? []
      : (() => {
          try {
            return packCreedCounts(state)
          } catch {
            return []
          }
        })(),
    projects: (() => {
      try {
        return packProjects(state)
      } catch {
        return []
      }
    })(),
    bands: (() => {
      try {
        return packBands(state)
      } catch {
        return []
      }
    })(),
    religionSites: (() => {
      try {
        return packReligionSites(state)
      } catch {
        return []
      }
    })(),
    ticksPerSec,
  }
}

export function takeDirty(state: SimState): DirtyFrame | null {
  const dirty = state.grid.dirty
  const n = dirty.length
  if (n === 0) return null
  // TypedArrays transfer cheaper across worker boundary than number[].
  const indices = new Uint32Array(n)
  const terrain = new Uint8Array(n)
  const amount = new Uint16Array(n)
  const terr = state.grid.terrain
  const amt = state.grid.amount
  for (let i = 0; i < n; i++) {
    const idx = dirty[i]
    indices[i] = idx
    terrain[i] = terr[idx]
    amount[i] = amt[idx]
  }
  dirty.length = 0
  return { indices, terrain, amount }
}
