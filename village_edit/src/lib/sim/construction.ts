/**
 * Generative construction continuum — soft intents → composed footprints → tiles.
 * No Castle / TownHall / Manor enums; stamps consume StructureIntent.
 */

import {
  freshStyle,
  furnitureSlots,
  houseFootprint,
  structureFootprint,
  structurePlotCells,
  type Cell,
  type FloorMaterial,
  type HouseFootprint,
  type HouseShape,
  type StructureFootprint,
  type StructureParams,
  type WallMaterial,
} from './architecture'
import { sampleBiome } from './climate'
import { biomeProfile } from './biomes'
import type { ResourceType } from './inventory'
import { addToInventory, countOf, createInventory } from './inventory'
import { planFurnitureJobs } from './furniture'
import { buildHouseLayout } from './rooms'
import {
  metersToTilesRound,
  structureHalfSpanMeters,
  wallHeightMeters,
} from './physicsScale'
import { stampPlaza } from './roads'
import { logEvent } from './social'
import {
  CHEST,
  CLAIM_HOUSE,
  DIRT,
  HOUSE,
  PATH,
  PLANK,
  WALL_STONE,
  WALL_WOOD,
  WORKBENCH,
  type Personality,
  type SimState,
  type TaskKind,
  type Village,
  type Villager,
  type WorldGrid,
} from './types'
import {
  claimCells,
  findBuildSite,
  getTerrain,
  inBounds,
  isBuildableGround,
  nearestResource,
  needsClearing,
  setTerrain,
  setClaim,
} from './world'
import { findMineEntranceSite, stampMiningAccess } from './mining'
import { knowsArrowSlit, knowsHighStoneKeep } from './technology'

export type StructurePurpose =
  | 'shelter'
  | 'fortify'
  | 'gather'
  | 'store'
  | 'mine'
  | 'mining_access'
  | 'prestige'
  | 'homestead'

export interface StructureIntent {
  purposes: StructurePurpose[]
  /** Soft size 0–1. */
  scale: number
  woodBias: number
  stoneBias: number
  reasons: string[]
}

export type ProjectPhase = 'clear' | 'gather' | 'build' | 'done'

export interface BuildProject {
  id: number
  label: string
  intent: StructureIntent
  phase: ProjectPhase
  cx: number
  cy: number
  params: StructureParams
  footprint: StructureFootprint
  pending: Cell[]
  ownerId: number | null
  villageId: number | null
  formedTick: number
  lastProgressTick: number
  sponsorCircleId: number | null
}

export type ConstructionStep = {
  kind: TaskKind
  x: number
  y: number
  projectId: number
  resource: ResourceType | null
}

const TILE_COST = 1
const MAX_OPEN = 12

function logCause(state: SimState, cause: string, effect: string) {
  logEvent(state, `${cause} → ${effect}`)
}

const PURPOSE_FR: Record<StructurePurpose, string> = {
  shelter: 'abri',
  fortify: 'fortification',
  gather: 'halle / place',
  store: 'grenier',
  mine: 'accès de mine',
  mining_access: 'accès de mine',
  prestige: 'grande maison',
  homestead: 'nouveau foyer',
}

export function describeIntent(intent: StructureIntent): string {
  const main = intent.purposes[0] ? PURPOSE_FR[intent.purposes[0]] : 'ouvrage'
  const why = intent.reasons[0] ? ` (${intent.reasons[0]})` : ''
  return `${main}${why}`
}

export function intentFromReasons(
  reasons: string[],
  opts: {
    purposes?: StructurePurpose[]
    scale?: number
    wood?: number
    stone?: number
  } = {},
): StructureIntent {
  const text = reasons.join(' ').toLowerCase()
  const purposes: StructurePurpose[] = opts.purposes ? [...opts.purposes] : []

  const push = (p: StructurePurpose) => {
    if (!purposes.includes(p)) purposes.push(p)
  }

  if (/loup|attaque|mort|menace|enceinte|rempart|fortif|mur/.test(text)) push('fortify')
  if (/famine|grenier|réserve|vivres|stock|faim/.test(text)) push('store')
  if (/surpeupl|migr|satellite|errance|nouveau village|foyer ailleurs/.test(text)) push('homestead')
  if (/mine|fer|or|montagne|tunnel|gisement|mining_access/.test(text)) {
    push('mining_access')
    push('mine')
  }
  if (/halle|place|assemblée|ancien|commerce|marché|cercle/.test(text)) push('gather')
  if (/prestige|richesse|ambition|statut|annexe|manoir|grande maison/.test(text)) push('prestige')
  if (/abri|toit|maison|foyer/.test(text)) push('shelter')

  if (purposes.length === 0) push('shelter')

  const wood = opts.wood ?? (/pierre|stone|rempart/.test(text) ? 0.35 : 0.65)
  const stone = opts.stone ?? (/pierre|stone|rempart|fort/.test(text) ? 0.7 : 0.35)

  return {
    purposes,
    scale: Math.max(0.15, Math.min(1, opts.scale ?? 0.4)),
    woodBias: wood,
    stoneBias: stone,
    reasons: reasons.slice(0, 4),
  }
}

function isMinePurpose(intent: StructureIntent): boolean {
  return intent.purposes.includes('mine') || intent.purposes.includes('mining_access')
}

function wallMaterialFor(intent: StructureIntent): WallMaterial {
  if (intent.stoneBias > intent.woodBias + 0.15) return 'stone'
  if (intent.purposes.includes('fortify') && intent.stoneBias >= 0.45) return 'stone'
  if (intent.woodBias >= intent.stoneBias) return 'timber'
  return 'wood'
}

function floorMaterialFor(intent: StructureIntent): FloorMaterial {
  if (isMinePurpose(intent)) return 'plank'
  if (intent.purposes.includes('gather') || intent.purposes.includes('prestige')) return 'plank'
  if (intent.purposes.includes('store')) return 'dirt'
  return intent.scale > 0.55 ? 'plank' : 'none'
}

function shapeFor(intent: StructureIntent): HouseShape {
  if (intent.purposes.includes('gather')) return 'courtyard'
  if (intent.purposes.includes('prestige')) return intent.scale > 0.6 ? 'courtyard' : 'ell'
  if (intent.purposes.includes('fortify')) return 'square'
  if (intent.purposes.includes('store')) return 'rect'
  if (intent.purposes.includes('homestead')) return 'square'
  if (isMinePurpose(intent)) return 'rect'
  return 'square'
}

function paramsFromIntent(
  intent: StructureIntent,
  tech?: { highKeep?: boolean; arrowSlit?: boolean },
): StructureParams {
  const scale = intent.scale
  const primary =
    intent.purposes.includes('fortify')
      ? 'fortify'
      : intent.purposes.includes('gather')
        ? 'gather'
        : intent.purposes.includes('store')
          ? 'store'
          : isMinePurpose(intent)
            ? 'mine'
            : intent.purposes.includes('prestige')
              ? 'prestige'
              : intent.purposes.includes('homestead')
                ? 'homestead'
                : 'shelter'

  const halfM = structureHalfSpanMeters(primary, scale, !!tech?.highKeep)
  let rx = metersToTilesRound(halfM, 2, tech?.highKeep ? 11 : 9)
  let ry = rx

  if (primary === 'store' || primary === 'mine') {
    ry = Math.max(2, rx - 1)
  } else if (primary === 'prestige') {
    ry = Math.max(2, rx - 1)
  }

  const canTower =
    intent.purposes.includes('fortify') &&
    ((tech?.highKeep && scale > 0.35) || (!tech?.highKeep && scale > 0.72))

  const stone = intent.stoneBias >= intent.woodBias
  const wallHeightM = wallHeightMeters(scale, primary === 'fortify', stone)

  return {
    shape: shapeFor(intent),
    rx,
    ry,
    wallMaterial: wallMaterialFor(intent),
    floorMaterial: floorMaterialFor(intent),
    towers: canTower,
    courtyard: intent.purposes.includes('gather') || (intent.purposes.includes('prestige') && scale > 0.6),
    door: !intent.purposes.includes('fortify') || scale < 0.7 || !!tech?.arrowSlit,
    wallHeightM,
  }
}

function wallTerrain(mat: WallMaterial): number {
  if (mat === 'stone') return WALL_STONE
  if (mat === 'timber') return HOUSE
  return WALL_WOOD
}

function neededResource(mat: WallMaterial): ResourceType {
  return mat === 'stone' ? 'stone' : 'wood'
}

export function firstVegetationInCells(grid: WorldGrid, cells: Cell[]): { x: number; y: number } | null {
  for (const c of cells) {
    if (needsClearing(grid, c.x, c.y)) return c
  }
  return null
}

export function stampHouseFloors(grid: WorldGrid, fp: HouseFootprint): void {
  for (const c of fp.interior) {
    if (!inBounds(grid, c.x, c.y)) continue
    const t = getTerrain(grid, c.x, c.y)
    if (t === HOUSE || t === WALL_WOOD || t === WALL_STONE) continue
    setTerrain(grid, c.x, c.y, PLANK)
  }
  for (const c of fp.open) {
    if (!inBounds(grid, c.x, c.y)) continue
    const t = getTerrain(grid, c.x, c.y)
    if (t === HOUSE || t === WALL_WOOD || t === WALL_STONE) continue
    setTerrain(grid, c.x, c.y, DIRT)
  }
}

function stampProjectFloors(grid: WorldGrid, project: BuildProject): void {
  const { footprint, params } = project
  if (isMinePurpose(project.intent)) {
    const site = findMineEntranceSite(grid, project.cx, project.cy, 18)
    if (site) {
      stampMiningAccess(grid, site.mountainX, site.mountainY)
      const pad = getTerrain(grid, site.x, site.y)
      if (isBuildableGround(grid, site.x, site.y) || pad === PATH) {
        setTerrain(grid, site.x, site.y, PLANK)
      }
    } else {
      stampMiningAccess(grid, project.cx, project.cy)
    }
  }
  if (params.floorMaterial === 'plank') {
    for (const c of footprint.interior) {
      const t = getTerrain(grid, c.x, c.y)
      if (t === WALL_WOOD || t === WALL_STONE || t === HOUSE) continue
      setTerrain(grid, c.x, c.y, PLANK)
    }
  }
  if (project.intent.purposes.includes('gather')) {
    for (const c of footprint.open) {
      if (isBuildableGround(grid, c.x, c.y)) setTerrain(grid, c.x, c.y, PATH)
    }
  }
  if (project.intent.purposes.includes('store')) {
    // Soft granary footprint: a few plank cells as storage pads (chests built via normal tasks).
    let n = 0
    for (const c of footprint.interior) {
      if (n >= 3) break
      const t = getTerrain(grid, c.x, c.y)
      if (t === WALL_WOOD || t === WALL_STONE) continue
      setTerrain(grid, c.x, c.y, PLANK)
      n++
    }
  }
}

function pendingWallCells(fp: StructureFootprint, grid: WorldGrid, mat: WallMaterial): Cell[] {
  const want = wallTerrain(mat)
  const out: Cell[] = []
  for (const c of [...fp.walls, ...fp.towers]) {
    if (!inBounds(grid, c.x, c.y)) continue
    if (getTerrain(grid, c.x, c.y) !== want) out.push(c)
  }
  return out
}

export function findProject(state: SimState, id: number): BuildProject | null {
  return state.projects.find((p) => p.id === id) ?? null
}

export function enqueueBuildProject(
  state: SimState,
  intent: StructureIntent,
  opts: {
    ownerId: number | null
    villageId: number | null
    nearX: number
    nearY: number
    laborHint?: number
    sponsorCircleId?: number | null
  },
): BuildProject | null {
  const open = state.projects.filter((p) => p.phase !== 'done').length
  if (open >= MAX_OPEN) return null

  // Soft dedupe: same primary purpose near same village / owner.
  const primary = intent.purposes[0]
  for (const p of state.projects) {
    if (p.phase === 'done') continue
    if (p.intent.purposes[0] !== primary) continue
    if (opts.villageId !== null && p.villageId === opts.villageId) return null
    if (opts.ownerId !== null && p.ownerId === opts.ownerId) return null
  }

  const inventor =
    opts.ownerId !== null ? state.villagers.find((v) => v.id === opts.ownerId && v.alive) : null
  const village = opts.villageId !== null ? state.villages.find((g) => g.id === opts.villageId) : null
  const tech = {
    highKeep: knowsHighStoneKeep(inventor, village),
    arrowSlit: knowsArrowSlit(inventor, village),
  }
  // Surplus stone soft-raises fort scale when keep technique known.
  if (intent.purposes.includes('fortify') && tech.highKeep && village) {
    const stoneSurplus = village.surplus.stone ?? 0
    if (stoneSurplus > 1.2) intent.scale = Math.min(1, intent.scale + 0.12)
    if (tech.arrowSlit) intent.scale = Math.min(1, intent.scale + 0.08)
  }

  // Local biome nudges timber vs stone (tundra/alpine → stone; forest → wood).
  const biome = biomeProfile(sampleBiome(state.climate, opts.nearX, opts.nearY))
  intent.woodBias = Math.max(0.05, Math.min(0.95, intent.woodBias * 0.55 + biome.woodBias * 0.45))
  intent.stoneBias = Math.max(0.05, Math.min(0.95, intent.stoneBias * 0.55 + biome.stoneBias * 0.45))

  const params = paramsFromIntent(intent, tech)
  const span = Math.max(params.rx, params.ry)
  const site = findBuildSite(state.grid, opts.nearX, opts.nearY, span, 48 + Math.round(intent.scale * 20))
  if (!site) return null

  // Prestige annex: never overwrite existing HOUSE shell at home.
  if (intent.purposes.includes('prestige')) {
    const homeHit = structurePlotCells(structureFootprint(params, site.x, site.y)).some(
      (c) => getTerrain(state.grid, c.x, c.y) === HOUSE,
    )
    if (homeHit) {
      const alt = findBuildSite(state.grid, opts.nearX + 10, opts.nearY + 8, span, 36)
      if (!alt) return null
      site.x = alt.x
      site.y = alt.y
    }
  }

  const footprint = structureFootprint(params, site.x, site.y)
  const plot = structurePlotCells(footprint)
  claimCells(state.grid, plot, CLAIM_HOUSE)

  const label = describeIntent(intent)
  const project: BuildProject = {
    id: state.nextProjectId++,
    label,
    intent,
    phase: 'clear',
    cx: site.x,
    cy: site.y,
    params,
    footprint,
    pending: pendingWallCells(footprint, state.grid, params.wallMaterial),
    ownerId: opts.ownerId,
    villageId: opts.villageId,
    formedTick: state.tick,
    lastProgressTick: state.tick,
    sponsorCircleId: opts.sponsorCircleId ?? null,
  }
  state.projects.push(project)

  const cause = intent.reasons[0] ?? 'dessein collectif'
  logCause(state, cause, `projet de ${label} (#${project.id})`)
  void opts.laborHint
  return project
}

export function pickProjectForVillager(state: SimState, v: Villager): BuildProject | null {
  if (v.activeProjectId !== null) {
    const cur = findProject(state, v.activeProjectId)
    if (cur && cur.phase !== 'done') return cur
    v.activeProjectId = null
  }

  let best: BuildProject | null = null
  let bestScore = -Infinity
  for (const p of state.projects) {
    if (p.phase === 'done') continue
    let score = 1
    if (p.ownerId === v.id) score += 5
    if (p.villageId !== null && p.villageId === v.villageId) score += 3
    if (p.sponsorCircleId !== null) {
      const c = state.circles.find((x) => x.id === p.sponsorCircleId)
      if (c?.memberIds.includes(v.id)) score += 2.5
    }
    if (p.intent.purposes.includes('fortify') && (v.profession === 'guard' || v.ambition === 'protector')) score += 2
    if (p.intent.purposes.includes('gather') && (v.profession === 'trader' || v.ambition === 'leader')) score += 1.5
    if (isMinePurpose(p.intent) && (v.profession === 'miner' || v.profession === 'mason')) score += 2
    const dist = Math.hypot(v.x - p.cx, v.y - p.cy)
    score -= dist * 0.02
    if (score > bestScore) {
      bestScore = score
      best = p
    }
  }
  return bestScore > 0.5 ? best : null
}

export function projectTaskUrge(project: BuildProject, p: Personality): number {
  let urge = 42 + project.intent.scale * 35 + p.ambition * 20 + p.sociability * 12
  if (project.intent.purposes.includes('fortify')) urge += 18 + (1 - p.courage) * 20
  if (project.intent.purposes.includes('prestige')) urge += p.ambition * 25
  if (project.intent.purposes.includes('gather')) urge += p.sociability * 22
  if (project.phase === 'build') urge += 12
  if (project.sponsorCircleId !== null) urge += 10
  return urge
}

export function nextWallTarget(grid: WorldGrid, project: BuildProject): { x: number; y: number } | null {
  project.pending = pendingWallCells(project.footprint, grid, project.params.wallMaterial)
  return project.pending[0] ?? null
}

export function nextConstructionStep(
  grid: WorldGrid,
  project: BuildProject,
  wood: number,
  stone: number,
): ConstructionStep | null {
  if (project.phase === 'done') return null

  const cells = structurePlotCells(project.footprint)
  const veg = firstVegetationInCells(grid, cells)
  if (veg) {
    project.phase = 'clear'
    return { kind: 'clearLand', x: veg.x, y: veg.y, projectId: project.id, resource: null }
  }

  const res = neededResource(project.params.wallMaterial)
  const have = res === 'stone' ? stone : wood
  if (have < TILE_COST) {
    // Explicit gather step so projects pull wood/stone instead of stalling as idle.
    project.phase = 'gather'
    const kind = res === 'stone' ? 'gatherStone' : 'gatherWood'
    const near = nearestResource(grid, project.cx, project.cy, res === 'stone' ? 'stone' : 'tree', 52)
    if (near) {
      return { kind, x: near.x, y: near.y, projectId: project.id, resource: res }
    }
    return null
  }

  const wall = nextWallTarget(grid, project)
  if (!wall) {
    stampProjectFloors(grid, project)
    project.phase = 'done'
    return null
  }

  project.phase = 'build'
  return {
    kind: 'buildProject',
    x: wall.x,
    y: wall.y,
    projectId: project.id,
    resource: res,
  }
}

export function applyConstructionStep(
  state: SimState,
  v: Villager,
  project: BuildProject,
  x: number,
  y: number,
  spend: (res: ResourceType, n: number) => boolean,
): boolean {
  if (project.phase === 'done') return false
  const grid = state.grid
  if (!inBounds(grid, x, y)) return false

  const mat = project.params.wallMaterial
  const res = neededResource(mat)
  const want = wallTerrain(mat)
  const isWall = project.footprint.walls.some((c) => c.x === x && c.y === y)
  const isTower = project.footprint.towers.some((c) => c.x === x && c.y === y)

  if (isWall || isTower) {
    if (getTerrain(grid, x, y) === want) {
      project.pending = pendingWallCells(project.footprint, grid, mat)
      return project.pending.length > 0
    }
    if (needsClearing(grid, x, y)) return false
    // Briques + mortier peuvent remplacer la pierre de taille.
    if (mat === 'stone' && countOf(v.inventory, 'brick') >= TILE_COST) {
      if (!spend('brick', TILE_COST)) return false
      if (countOf(v.inventory, 'mortar') > 0) spend('mortar', 1)
    } else if (!spend(res, TILE_COST)) {
      return false
    }
    setTerrain(grid, x, y, want)
    setClaim(grid, x, y, CLAIM_HOUSE)
    project.lastProgressTick = state.tick
    project.pending = pendingWallCells(project.footprint, grid, mat)
    if (project.pending.length === 0) {
      stampProjectFloors(grid, project)
      project.phase = 'done'
      logCause(state, project.intent.reasons[0] ?? project.label, `${project.label} achevé (#${project.id})`)
      if (v.activeProjectId === project.id) v.activeProjectId = null
      return false
    }
    return true
  }

  // Floor / open cell soft place
  if (project.params.floorMaterial === 'plank' && project.footprint.interior.some((c) => c.x === x && c.y === y)) {
    if (!spend('wood', TILE_COST)) return false
    setTerrain(grid, x, y, PLANK)
    project.lastProgressTick = state.tick
    return true
  }

  return false
}

export function tickBuildProjects(state: SimState): void {
  if (state.tick % 90 !== 0) return
  for (const p of state.projects) {
    if (p.phase === 'done') continue
    if (state.tick - p.lastProgressTick > 2400) {
      p.phase = 'done'
      logCause(state, `projet #${p.id} sans progrès`, `abandon de ${p.label}`)
    }
  }
  if (state.projects.length > 48) {
    const active = state.projects.filter((p) => p.phase !== 'done')
    const done = state.projects.filter((p) => p.phase === 'done').slice(-16)
    state.projects = [...active, ...done]
  }
}

/** Small square cabin used as Nouveau monde pioneer shelter. */
const PIONEER_DESIGN = {
  shape: 'square' as const,
  rx: 2,
  ry: 2,
  bedSlots: 2,
  hasWorkshop: true,
  hasStoreroom: false,
  roomKinds: ['hall', 'chambre', 'atelier'] as import('./rooms').RoomKind[],
}

function clearPlotVegetation(grid: WorldGrid, cells: Cell[]): void {
  for (const c of cells) {
    if (!inBounds(grid, c.x, c.y)) continue
    if (needsClearing(grid, c.x, c.y)) setTerrain(grid, c.x, c.y, DIRT, 0)
  }
}

function emptyFoundingVillage(state: SimState, x: number, y: number, rng: () => number): Village {
  const village: Village = {
    id: state.nextVillageId++,
    centerX: x,
    centerY: y,
    memberIds: [],
    wallTier: 'none',
    wallHealth: 0,
    perimeter: [],
    gates: [],
    naturalCover: 0,
    perimeterTick: -1200,
    hasMill: false,
    millX: -1,
    millY: -1,
    hasPort: false,
    portX: -1,
    portY: -1,
    hasMine: false,
    mineX: -1,
    mineY: -1,
    tradeRuns: 0,
    surplus: {},
    attractiveness: 12,
    isRegionalHub: false,
    prosperity: 38,
    loyalty: 0.55,
    security: 0.45,
    recentDeaths: 0,
    recentThefts: 0,
    specialty: 'mixed',
    lastProsperLogTick: -9999,
    cohesion: 0.45,
    peaceTicks: 0,
    inequalityStress: 0,
    lastRitualTick: 0,
    development: 0.22,
    standardOfLiving: 0.38,
    laborBalance: 0,
    solBand: null,
    style: freshStyle(rng),
    knowledge: [],
  }
  state.villages.push(village)
  return village
}

/**
 * Stamp 1–2 pioneer cabins + workbench per founding cluster so craft / stone / farm
 * loops unlock within the first sim days instead of a naked wander-only boot.
 */
export function seedPioneerCamps(
  state: SimState,
  groupCenters: { x: number; y: number }[],
  villagers: Villager[],
  foundingGroups: number,
  rng: () => number,
): void {
  const grid = state.grid
  for (let g = 0; g < foundingGroups; g++) {
    const center = groupCenters[g]
    if (!center) continue
    const members = villagers.filter((_, i) => i % foundingGroups === g)
    members.sort((a, b) => {
      const da = Math.abs(a.x - center.x) + Math.abs(a.y - center.y)
      const db = Math.abs(b.x - center.x) + Math.abs(b.y - center.y)
      return da - db
    })
    const pioneerCount = Math.min(2, Math.max(1, Math.floor(members.length * 0.35)))
    const pioneers = members.slice(0, pioneerCount)
    if (pioneers.length === 0) continue

    const village = emptyFoundingVillage(state, center.x, center.y, rng)
    let placed = 0
    for (const v of pioneers) {
      const plot =
        findBuildSite(grid, center.x + (placed % 2 === 0 ? -6 : 6), center.y + (placed < 1 ? -4 : 5), 2, 28, 6) ??
        findBuildSite(grid, v.x, v.y, 2, 22, 8)
      if (!plot) continue
      const design = { ...PIONEER_DESIGN }
      const fp = houseFootprint(design, plot.x, plot.y)
      clearPlotVegetation(grid, [...fp.walls, ...fp.interior, ...fp.open, fp.door])
      for (const c of fp.walls) {
        if (inBounds(grid, c.x, c.y)) setTerrain(grid, c.x, c.y, HOUSE)
      }
      stampHouseFloors(grid, fp)
      claimCells(grid, fp.walls, CLAIM_HOUSE)
      claimCells(grid, fp.interior, CLAIM_HOUSE)
      claimCells(grid, fp.open, CLAIM_HOUSE)

      const slots = furnitureSlots(fp)
      setTerrain(grid, slots.workbench.x, slots.workbench.y, WORKBENCH)
      setTerrain(grid, slots.chest.x, slots.chest.y, CHEST)

      v.house = design
      v.hasHome = true
      v.homeX = plot.x
      v.homeY = plot.y
      v.homeOwnerId = v.id
      v.hasWorkbench = true
      v.workbenchX = slots.workbench.x
      v.workbenchY = slots.workbench.y
      v.hasChest = true
      v.chestX = slots.chest.x
      v.chestY = slots.chest.y
      v.chestInventory = createInventory(20)
      v.homeLayout = buildHouseLayout(design, fp)
      const jobs = planFurnitureJobs(v.homeLayout, {
        beds: design.bedSlots,
        wantWorkshop: true,
        wantStore: true,
        household: 2,
      })
      v.furnitureQueue = jobs.map((j) => {
        if (j.kind === 'workbench') return { ...j, done: true, x: slots.workbench.x, y: slots.workbench.y }
        if (j.kind === 'chest') return { ...j, done: true, x: slots.chest.x, y: slots.chest.y }
        return j
      })
      addToInventory(v.inventory, 'stone', 3)
      v.x = fp.door.x
      v.y = fp.door.y
      v.villageId = village.id
      village.memberIds.push(v.id)
      placed++
    }
    if (village.memberIds.length > 0) {
      stampPlaza(grid, village.centerX, village.centerY)
      logCause(state, 'fondation', `${placed} cabane${placed > 1 ? 's' : ''} pioneer près de (${village.centerX},${village.centerY})`)
    } else {
      state.villages = state.villages.filter((vg) => vg.id !== village.id)
    }
  }
}
