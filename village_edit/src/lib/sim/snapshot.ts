import { packVillagerAppearance, resolveBeard, sexOf, type BiologicalSex, type HairStyle } from './appearance'
import { packCognitionDebug, type CognitionDebug } from './cognition'
import { mindOf } from './cognition/tick'
import { computeStats } from './engine'
import type { HouseDesign } from './architecture'
import { packEthnosSummary } from './ethnos'
import { packFamilySummary, type FamilySummary } from './family'
import { HORSE_CARRY_BONUS } from './horses'
import { carriedMass, carryCapacityOf, type ResourceType, type Slot } from './inventory'
import {
  equipmentEffectsOf,
  packEquipmentForUi,
  packWornGearForDraw,
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
import type { Ambition, Memory, Relation } from './social'
import { knowledgeCount, knowledgeLabelsFr } from './technology'
import { ensureLivelihood, topActivitiesFr, livelihoodLabelForUi } from './livelihood'
import { getCalendar } from './calendar'
import { biomeLabelFr } from './biomes'
import { sampleBiome } from './climate'
import { carriedLightKind, type ActorLight } from './lighting'
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
}

export type ActorSheep = { x: number; y: number; captured: boolean; alive: boolean }
export type ActorHorse = { x: number; y: number; tamed: boolean; riderId: number | null; alive: boolean }
export type ActorBoat = { x: number; y: number; kind: BoatKind; alive: boolean }
export type ActorWolf = { x: number; y: number; alive: boolean }
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
  wallTier: WallTier
  perimeter: { x: number; y: number }[]
  gates: { x: number; y: number }[]
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

export type DrawFrame = {
  season: Season
  /** Calendar hour-of-day (0–23) for visual day/night overlay. */
  hour: number
  villagers: ActorVillager[]
  sheep: ActorSheep[]
  horses: ActorHorse[]
  boats: ActorBoat[]
  wolves: ActorWolf[]
  villages: ActorVillage[]
  tradeLinks: { ax: number; ay: number; bx: number; by: number }[]
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
    rows[i] = {
      id: c.id,
      name: c.name,
      kind: c.kind,
      kindLabel: c.isGuild ? 'guilde' : circleKindLabel(c.kind),
      memberCount: aliveCount,
      memberNames: names,
      moreMembers: Math.max(0, aliveCount - names.length),
      leaderName,
      isInstitution: c.isInstitution || !!c.isGuild,
      legitimacy: c.legitimacy,
      reputation: c.reputation,
      villageLabel,
      summary: c.isGuild
        ? `guilde · ${groupSummaryText(c.norms, c.originStory, c.creed, c.memory)}`
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
  tradeRunsTotal: 0,
  wolves: 0,
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
  circles: 0,
  institutions: 0,
  rumors: 0,
  leadingCircle: null,
  leadingLegitimacy: 0,
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
export function packChronicle(log: string[], limit = 14): string[] {
  if (log.length === 0) return []
  const window = log.slice(-40)
  const causal: string[] = []
  const notable: string[] = []
  const rest: string[] = []
  const notableRe =
    /famine|moulin|port|bateau|barque|chaland|institution|cercle|guilde|creed|naissance|né de|naît|mariage|unissent|adopte|adoption|enceinte|rempart|pont|sentier|chemin|route|mort|loup|légitimité|norme|creed|fortification|halle|grenier|projet|chantier|gisement|surpeuplement|tempête|orage|front froid|pénurie|migration|errance|découvert|enseigne|savoir|mélange explosif|donjon|meurtrière|charbon|nitrate|souffle de mine|métier|troubadour|gourou|réputation|forme |enseigne|apprenti|oisiveté|divertit|console/i

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
      holdingLight: held,
    })
    const furn = v.homeFurniture
    if (furn) {
      for (let f = 0; f < furn.length; f++) {
        const p = furn[f]
        if (p.id === 'hearth') pushLight(p.x, p.y, 'hearth')
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
  const villages: ActorVillage[] = new Array(state.villages.length)
  const byId = new Map<number, (typeof state.villages)[0]>()
  for (let i = 0; i < state.villages.length; i++) {
    const vg = state.villages[i]
    byId.set(vg.id, vg)
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
      wallTier: vg.wallTier,
      perimeter: vg.perimeter,
      gates: vg.gates,
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
  return {
    season: state.season,
    hour: getCalendar(state.tick).hour,
    villagers,
    sheep,
    horses,
    boats,
    wolves,
    villages,
    tradeLinks,
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
