/**
 * Couche de métrologie / échelle physique — village-sim.
 *
 * Toutes les quantités « jeu » (tuiles, ticks, stacks) restent jouables, mais les
 * équations sous-jacentes sont SI-cohérentes (m, s, kg, kcal, clo).
 *
 * Échelle choisie (cartes 600–1200) :
 *   1 tuile = 5 m  →  carte 1000² ≈ 5 km × 5 km (bassin villageois / petit pays)
 *   Calendrier (`calendar.ts`) : 3 ticks = 1 h, 72 ticks = 1 jour → 86400/72 = 1200 s SI / tick
 *   (1 tick = 20 min Terre ; année agricole 360 j = 4 saisons × 90 j).
 *
 * Accélération wall-clock : le slider de vitesse fait passer plus d’heures-sim / s réelle ;
 * les équations m/s/kg restent cohérentes entre elles sous le calendrier.
 *
 * Perf : LUT précalculées ; pas de transcendental par tuile chaque tick —
 * échantillonnage par pas villageois / tick besoin.
 */

import { TICKS_PER_DAY, TICKS_PER_YEAR } from './calendar'
import { RESOURCE_KCAL, RESOURCE_MASS_KG, type ResourceType } from './resources'
import type { Phenotype } from './types'
import { WATER, ROAD, PATH, TRAIL, BRIDGE, PORT, TUNNEL, TREE, BUSH, SAND, MOUNTAIN } from './types'

// ─── Longueur ───────────────────────────────────────────────────────────────

/** Mètres par tuile — échelle village (5 m : maison rx≈3 ≈ 30 m de côté). */
export const METERS_PER_TILE = 5

/** Carte 1000 tuiles → côté réel (m). */
export function worldExtentMeters(worldSizeTiles: number): number {
  return worldSizeTiles * METERS_PER_TILE
}

export function tilesToMeters(tiles: number): number {
  return tiles * METERS_PER_TILE
}

export function metersToTiles(meters: number): number {
  return meters / METERS_PER_TILE
}

/** Arrondi tuiles pour empreintes constructives (min 1). */
export function metersToTilesRound(meters: number, min = 1, max = 12): number {
  const t = Math.round(meters / METERS_PER_TILE)
  return t < min ? min : t > max ? max : t
}

// ─── Temps (calendrier Terre via TICKS_PER_DAY) ──────────────────────────────

/** Secondes SI représentées par un tick (86400 / 72 = 1200 → 20 min). */
export const SECONDS_PER_TICK = 86400 / TICKS_PER_DAY

/** Alias explicite. */
export const SI_SECONDS_PER_TICK = SECONDS_PER_TICK

export function ticksToSeconds(ticks: number): number {
  return ticks * SECONDS_PER_TICK
}

export function secondsToTicks(seconds: number): number {
  return seconds / SECONDS_PER_TICK
}

/**
 * Dilatation voyage jouabilité : à 1.4 m/s SI purs on aurait ~336 tuiles/tick
 * (injouable). On ancre la marche à plat non chargée ≈ BASE_WALK_TILES_PER_TICK
 * tout en gardant les *ratios* SI (charge, terrain, monture, courant).
 */
export const BASE_WALK_TILES_PER_TICK = 2
export const MAX_TRAVEL_TILES_PER_TICK = 8

// ─── Masse (kg) ─────────────────────────────────────────────────────────────

/**
 * Masse unitaire inventaire (kg) — bille, pierre de chantier, sac de grain…
 * Légèrement généreux vs monde réel pour ne pas casser la logistique mid-game.
 */
export const ITEM_MASS_KG: Record<ResourceType, number> = RESOURCE_MASS_KG

/** Énergie alimentaire restaurée (kcal soft) par unité. */
export const ITEM_KCAL: Partial<Record<ResourceType, number>> = RESOURCE_KCAL

/** kcal → points de faim jeu (HUNGER_MAX≈6). */
export const KCAL_PER_HUNGER = 700

/** BMR de référence (adulte moyen) pour normaliser le drain. */
export const BMR_REF_KCAL_DAY = 1600

/** Capacité charrette / cheval (kg cargo utile). */
export const CART_CARGO_KG = 90
export const HORSE_PACK_KG = 35

/** Bonus cheval historique (unités inventaire) — dérivé de HORSE_PACK_KG / wood. */
export const HORSE_CARRY_BONUS_KG = HORSE_PACK_KG

/** Déplacement / cargo bateau (kg). */
export const BOAT_FISHING_CARGO_KG = 180
export const BOAT_CARGO_HOLD_KG = 750
/** Masse coque approx. (déplacement total soft). */
export const BOAT_FISHING_DISPLACEMENT_KG = 400
export const BOAT_CARGO_DISPLACEMENT_KG = 1600

// ─── Vitesse SI ─────────────────────────────────────────────────────────────

/** Marche plate à vide ~1.4 m/s (adulte). */
export const WALK_MPS = 1.4
/** Trot monté léger. */
export const MOUNT_MPS = 3.2
/** Barque / cargo à la rame / voile douce. */
export const BOAT_FISHING_MPS = 2.2
export const BOAT_CARGO_MPS = 1.8

/** Exposant charge : v = v0 * (1 - load/cap)^k  (Pandolf soft). */
export const LOAD_SPEED_EXPONENT = 1.35

// ─── LUT précalculées (pas de pow par tuile) ─────────────────────────────────

const LOAD_LUT_N = 101
/** loadRatio ∈ [0,1] → facteur vitesse (index = round(ratio*100)). */
export const LOAD_SPEED_LUT = new Float32Array(LOAD_LUT_N)
/** loadRatio → facteur coût stamina / travail. */
export const LOAD_WORK_LUT = new Float32Array(LOAD_LUT_N)

;(function buildLoadLuts() {
  for (let i = 0; i < LOAD_LUT_N; i++) {
    const r = i / 100
    const remain = Math.max(0, 1 - r)
    LOAD_SPEED_LUT[i] = Math.pow(remain, LOAD_SPEED_EXPONENT)
    // Travail ∝ 1 + charge² (effort musculaire croissant)
    LOAD_WORK_LUT[i] = 1 + r * r * 1.8
  }
})()

export function loadSpeedFactor(loadRatio: number): number {
  const i = loadRatio <= 0 ? 0 : loadRatio >= 1 ? 100 : (loadRatio * 100 + 0.5) | 0
  return LOAD_SPEED_LUT[i]!
}

export function loadWorkFactor(loadRatio: number): number {
  const i = loadRatio <= 0 ? 0 : loadRatio >= 1 ? 100 : (loadRatio * 100 + 0.5) | 0
  return LOAD_WORK_LUT[i]!
}

/**
 * Multiplicateurs terrain (vitesse relative à plat / herbe).
 * Index = code terrain (0–255 sparse) — table dense pour O(1).
 */
export const TERRAIN_SPEED_MUL = new Float32Array(256)
export const TERRAIN_TIME_COST = new Float32Array(256)
export const TERRAIN_WORK_MUL = new Float32Array(256)

;(function buildTerrainTables() {
  TERRAIN_SPEED_MUL.fill(1)
  TERRAIN_TIME_COST.fill(22)
  TERRAIN_WORK_MUL.fill(1)
  const set = (t: number, speed: number, timeCost: number, work: number) => {
    TERRAIN_SPEED_MUL[t] = speed
    TERRAIN_TIME_COST[t] = timeCost
    TERRAIN_WORK_MUL[t] = work
  }
  set(ROAD, 1.55, 4, 0.75)
  set(PATH, 1.35, 6, 0.85)
  set(TRAIL, 1.15, 9, 0.95)
  set(BRIDGE, 1.25, 6, 0.9)
  set(PORT, 1.1, 7, 1)
  set(TUNNEL, 0.75, 14, 1.25)
  set(TREE, 0.55, 38, 1.45)
  set(BUSH, 0.65, 30, 1.3)
  set(SAND, 0.8, 28, 1.2)
  set(WATER, 0.45, 10, 1.1)
  set(MOUNTAIN, 0.35, 60, 1.8)
})()

export function terrainSpeedMul(terrain: number): number {
  return TERRAIN_SPEED_MUL[terrain & 255] ?? 1
}

export function terrainTimeCost(terrain: number): number {
  return TERRAIN_TIME_COST[terrain & 255] ?? 22
}

export function terrainWorkMul(terrain: number): number {
  return TERRAIN_WORK_MUL[terrain & 255] ?? 1
}

// ─── Masse corporelle / capacité ────────────────────────────────────────────

/**
 * Taille (m) depuis phénotype.height 0–1 → ~1.48–1.92 m.
 * Corpulence (build) → BMI ~18.5–28.
 */
export function heightMetersFromPhenotype(ph: Phenotype): number {
  return 1.48 + ph.height * 0.44
}

export function bodyMassKgFromPhenotype(ph: Phenotype): number {
  const h = heightMetersFromPhenotype(ph)
  const bmi = 18.5 + ph.build * 9.5
  // Surface / masse soft : métabolisme module ±4 %
  const meta = 0.96 + ph.metabolism * 0.08
  return bmi * h * h * meta
}

/** Surface corporelle soft (Mosteller) m² — thermo. Height arg is metres; Mosteller needs cm. */
export function bodySurfaceM2(massKg: number, heightM: number): number {
  const heightCm = Math.max(50, heightM * 100)
  return Math.sqrt((massKg * heightCm) / 3600)
}

/**
 * Capacité de portage (kg) :
 *   base soft + fraction masse × force + charrette + cheval.
 * force01 = strengthBias phénotype (0–1).
 */
export function carryCapacityKg(opts: {
  bodyMassKg: number
  strength01: number
  hasCart: boolean
  mounted: boolean
  horseBonusKg?: number
}): number {
  const strength = 0.85 + opts.strength01 * 0.35
  let cap = 12 + opts.bodyMassKg * 0.42 * strength
  if (opts.hasCart) cap += CART_CARGO_KG
  if (opts.mounted) cap += opts.horseBonusKg ?? HORSE_PACK_KG
  return cap
}

export function boatCargoCapacityKg(kind: 'fishing' | 'cargo'): number {
  return kind === 'cargo' ? BOAT_CARGO_HOLD_KG : BOAT_FISHING_CARGO_KG
}

export function boatDisplacementKg(kind: 'fishing' | 'cargo'): number {
  return kind === 'cargo' ? BOAT_CARGO_DISPLACEMENT_KG : BOAT_FISHING_DISPLACEMENT_KG
}

// ─── Vitesse / temps de trajet ──────────────────────────────────────────────

export type SpeedContext = {
  embarked: boolean
  boatKind?: 'fishing' | 'cargo'
  currentMul?: number
  hasCart: boolean
  mounted: boolean
  terrain: number
  loadRatio: number
  stamina01: number
  night: boolean
  cold01: number
  heat01: number
  storm: boolean
  sheltered: boolean
  endurance01?: number
}

/**
 * Vitesse SI (m/s) — Pandolf soft + terrain + monture / bateau + fatigue.
 */
export function walkSpeedMps(ctx: SpeedContext): number {
  if (ctx.embarked) {
    const base = ctx.boatKind === 'cargo' ? BOAT_CARGO_MPS : BOAT_FISHING_MPS
    return Math.max(0.4, base * (ctx.currentMul ?? 1))
  }
  let v0 = WALK_MPS
  if (ctx.mounted && !ctx.hasCart) v0 = MOUNT_MPS
  else if (ctx.mounted && ctx.hasCart) v0 = WALK_MPS * 1.15 + (MOUNT_MPS - WALK_MPS) * 0.25

  let mul = terrainSpeedMul(ctx.terrain)
  if (ctx.hasCart) {
    // Charrette : bonus routes, pénalité hors-piste (déjà dans table ; accentue)
    if (ctx.terrain === ROAD || ctx.terrain === PATH || ctx.terrain === TRAIL || ctx.terrain === BRIDGE) {
      mul *= 1.12
    } else {
      mul *= 0.62
    }
  }

  mul *= loadSpeedFactor(Math.min(1.15, ctx.loadRatio))
  if (ctx.stamina01 < 0.25) mul *= 0.55
  else if (ctx.stamina01 < 0.5) mul *= 0.78

  if (ctx.night && !ctx.mounted && !ctx.embarked) mul *= 0.88
  if (!ctx.sheltered) {
    mul *= 1 - ctx.cold01 * 0.22
    mul *= 1 - ctx.heat01 * 0.14
    if (ctx.storm) mul *= 0.85
  }

  const end = ctx.endurance01 ?? 0.5
  mul *= 0.94 + end * 0.12

  return Math.max(0.25, v0 * mul)
}

/**
 * Convertit m/s → tuiles/tick jouables (ratios SI, ancre marche = BASE_WALK…).
 */
export function tilesPerTickFromMps(mps: number): number {
  const tiles = (mps / WALK_MPS) * BASE_WALK_TILES_PER_TICK
  const rounded = Math.round(tiles)
  if (rounded < 1) return 1
  if (rounded > MAX_TRAVEL_TILES_PER_TICK) return MAX_TRAVEL_TILES_PER_TICK
  return rounded
}

/** Temps SI (s) pour parcourir distance_m à vitesse mps. */
export function travelTimeSeconds(distanceM: number, speedMps: number): number {
  const v = speedMps > 0.05 ? speedMps : 0.05
  return distanceM / v
}

/** Temps en ticks (calendrier). */
export function travelTimeTicks(distanceTiles: number, speedMps: number): number {
  const seconds = travelTimeSeconds(tilesToMeters(distanceTiles), speedMps)
  return secondsToTicks(seconds)
}

/**
 * Coût A* relatif au temps (précalculé) — carts pénalisés hors route.
 * Remplace les constantes magiques pathfinding tout en restant entier.
 */
export function pathTerrainTimeCost(terrain: number, cart: boolean, cargoBoat: boolean): number {
  let c = terrainTimeCost(terrain)
  if (cart) {
    if (terrain === ROAD) c = 3
    else if (terrain === PATH) c = 5
    else if (terrain === TRAIL) c = 8
    else if (terrain === BRIDGE) c = 6
    else if (terrain === TUNNEL) c = 22
    else if (terrain === TREE) c = 52
    else if (terrain === BUSH) c = 42
    else if (terrain === WATER) c = 40
    else c = Math.max(c, 40)
  } else if (terrain === WATER) {
    c = cargoBoat ? 7 : 10
  }
  return c < 3 ? 3 : c
}

// ─── Stamina ∝ travail ──────────────────────────────────────────────────────

/** Coût stamina de base par pas (unité jeu STAMINA_MAX≈4). */
export const STAMINA_STEP_BASE = 0.012
export const STAMINA_MOUNT_STEP = 0.005
export const STAMINA_BOAT_STEP = 0.003

/**
 * Travail de déplacement soft : force×distance ≈ (masse corps+charge) × effort terrain.
 * Normalisé pour rester proche des anciens STAMINA_WALK.
 */
export function staminaCostForStep(opts: {
  embarked: boolean
  mounted: boolean
  hasCart: boolean
  loadRatio: number
  terrain: number
  bodyMassKg: number
  onRoad: boolean
}): number {
  if (opts.embarked) return STAMINA_BOAT_STEP
  let base = opts.mounted ? STAMINA_MOUNT_STEP : STAMINA_STEP_BASE
  const work = loadWorkFactor(Math.min(1, opts.loadRatio))
  const terr = terrainWorkMul(opts.terrain)
  // Masse relative vs 70 kg
  const massMul = 0.85 + (opts.bodyMassKg / 70) * 0.15
  let cost = base * work * terr * massMul
  if (opts.hasCart && !opts.onRoad) cost *= 1.35
  return cost
}

// ─── Énergie alimentaire (BMR Harris–Benedict soft) ─────────────────────────

/**
 * BMR kcal/jour — Harris–Benedict révisé (Mifflin soft sans sexe biologique
 * simulé : moyenne homme/femme + biais métabolisme phénotype).
 * ageYears : âge calendaire approx. (ticks / TICKS_PER_DAY / 365 soft → on passe âge ticks).
 */
export function bmrKcalPerDay(massKg: number, heightM: number, ageYears: number, metabolism01: number): number {
  // Mifflin–St Jeor moyenne H/F : 10m + 6.25h_cm - 5age + offset
  const hCm = heightM * 100
  const age = ageYears < 12 ? 12 : ageYears > 80 ? 80 : ageYears
  const base = 10 * massKg + 6.25 * hCm - 5 * age + 5 // offset neutre
  return base * (0.92 + metabolism01 * 0.16)
}

/**
 * Âge biologique soft pour BMR : 1 année-sim (`TICKS_PER_YEAR`) ≈ 1 année corporelle.
 * Nouveau-né ~0, adulte après quelques années-sim.
 */
export function ageYearsFromTicks(ageTicks: number): number {
  return Math.max(0, ageTicks) / TICKS_PER_YEAR
}

/**
 * Ancre jouabilité : estomac plein → vide en ~3 jours-sim (voir behaviors HUNGER_DECAY).
 * Le BMR / MET / thermique *modulent* autour de cette base — ils ne la multiplient
 * pas en pile (sinon labour + chaleur ≈ vide en ~1 jour → wipe de départ).
 */
export const HUNGER_DECAY_PLAY = 4 / (TICKS_PER_DAY * 3)

/**
 * MET déjà « cuit » dans HUNGER_DECAY_PLAY (journée moyenne : marche / tâches légères).
 * activityMet est ramené à un ratio doux autour de cette référence.
 */
export const REF_ACTIVITY_MET = 1.45

/**
 * Drain faim (unités jeu) pour un tick.
 * activityMet : MET-like (1 repos, 1.5 marche, 3 labour…).
 */
export function hungerDrainFromBmr(opts: {
  massKg: number
  heightM: number
  ageTicks: number
  metabolism01: number
  activityMet: number
  warmthMul: number
}): number {
  const bmr = bmrKcalPerDay(
    opts.massKg,
    opts.heightM,
    ageYearsFromTicks(opts.ageTicks),
    opts.metabolism01,
  )
  const body = bmr / BMR_REF_KCAL_DAY
  const met = Math.max(0.85, opts.activityMet)
  // Interpolation douce : marche moyenne ≈ ancre 3 jours ; labour un peu plus coûteux.
  const activity = 0.88 + 0.12 * (met / REF_ACTIVITY_MET)
  const warmth = opts.warmthMul < 0.75 ? 0.75 : opts.warmthMul > 1.25 ? 1.25 : opts.warmthMul
  return HUNGER_DECAY_PLAY * body * activity * warmth
}

/** Restauration faim depuis kcal item (cap jeu inchangé côté caller). */
export function hungerRestoreFromFood(type: ResourceType): number {
  const kcal = ITEM_KCAL[type]
  if (!kcal) return 0
  return kcal / KCAL_PER_HUNGER
}

// ─── Thermique (clo / surface) ──────────────────────────────────────────────

/** clo vestimentaire soft (sac + équipement porté). */
export function clothingClo(hasLeather: boolean, hasClothing: boolean, equipmentClo = 0): number {
  const bag = hasLeather ? 1.2 : hasClothing ? 0.8 : 0.3
  if (equipmentClo > 0.35) return Math.max(bag, Math.min(2.4, equipmentClo))
  return Math.max(bag, equipmentClo)
}

/**
 * Multiplicateur combustion faim / froid :
 * surface relative ↑ → plus de pertes au froid ; clo et abri réduisent le froid.
 * Par temps doux, clo ne doit PAS augmenter le drain (sinon tout le monde brûle +12–20 % à 20 °C).
 */
export function thermalBurnMultiplier(opts: {
  cold01: number
  heat01: number
  rain01: number
  night: boolean
  sheltered: boolean
  clo: number
  massKg: number
  heightM: number
}): number {
  const sa = bodySurfaceM2(opts.massKg, opts.heightM)
  const saNorm = sa / 1.8
  const clo = opts.clo < 0.15 ? 0.15 : opts.clo
  // Isolation : ne module que la part froid (et un peu la pluie froide).
  const cloInsul = 1 / (0.55 + clo * 0.55)
  let burn = 1
  burn += opts.cold01 * 0.55 * saNorm * cloInsul
  // Chaleur : habits lourds coûtent un peu ; habits légers n'aident pas la combustion.
  burn += opts.heat01 * 0.16 * (0.85 + Math.min(clo, 1.2) * 0.2)
  if (opts.sheltered) burn *= 0.72
  else if (opts.night) burn *= 1 + opts.cold01 * 0.18
  if (!opts.sheltered) burn *= 1 + opts.rain01 * 0.18 * (0.35 + opts.cold01)
  return burn < 0.85 ? 0.85 : burn > 1.55 ? 1.55 : burn
}

// ─── Bâtiments (m → tuiles) ─────────────────────────────────────────────────

/** Demi-portée (rx) en mètres selon usage / scale 0–1. */
export function structureHalfSpanMeters(
  purpose: 'shelter' | 'fortify' | 'gather' | 'store' | 'prestige' | 'homestead' | 'mine',
  scale01: number,
  highKeep = false,
): number {
  const s = scale01 < 0 ? 0 : scale01 > 1 ? 1 : scale01
  switch (purpose) {
    case 'fortify':
      return highKeep ? 25 + s * 30 : 20 + s * 25
    case 'gather':
      return 15 + s * 20
    case 'store':
    case 'mine':
      return 10 + s * 10
    case 'prestige':
      return 15 + s * 15
    case 'homestead':
      return 10 + s * 10
    default:
      return 10 + s * 20
  }
}

/** Hauteur mur soft (m) — rendu / lore ; pas de collision 3D. */
export function wallHeightMeters(scale01: number, fortify: boolean, stone: boolean): number {
  const base = fortify ? 3.5 + scale01 * 4 : 2.2 + scale01 * 1.8
  return stone ? base * 1.15 : base
}
