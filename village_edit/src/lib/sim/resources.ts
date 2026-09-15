/**
 * Catalogue central des ressources médiévales / début modernité.
 * Source de vérité pour masses, nutrition, prix, étiquettes FR, récoltes et recettes.
 */

export type ResourceTag =
  | 'edible'
  | 'fuel'
  | 'ore'
  | 'metal'
  | 'textile'
  | 'fiber'
  | 'construction'
  | 'medicine'
  | 'dye'
  | 'craft'
  | 'grain'
  | 'vegetable'
  | 'fruit'
  | 'animal'
  | 'fish'
  | 'herb'
  | 'store'
  | 'currency'

export interface ResourceDef {
  id: string
  /** UI Title Case */
  labelFr: string
  /** Logs / commerce lowercase */
  labelFrLog: string
  massKg: number
  kcal?: number
  /** Legacy nutrition weight for edibleValue (bread≈2, food≈1, wheat≈0.5). */
  nutrition?: number
  basePrice?: number
  targetPerCapita?: number
  tradeable?: boolean
  /** Prefer storing in chest when surplus. */
  storeable?: boolean
  tags: ResourceTag[]
}

/** Crop sown on FIELD/WHEAT tiles — stored in WorldGrid.cropType. */
export interface CropDef {
  id: number
  resource: ResourceType
  labelFr: string
  /** Relative sow weight among farm crops. */
  weight: number
  /** Ripe yield multiplier vs base wheat yield. */
  yieldMul: number
}

export type GatherSource = 'bush' | 'tree' | 'stone' | 'fish' | 'sheep' | 'hunt'

export interface GatherYield {
  resource: ResourceType
  /** Absolute chance 0..1 when gathering once. */
  chance: number
  min?: number
  max?: number
  /** If true, replaces primary yield instead of adding. */
  primary?: boolean
}

export interface CraftRecipe {
  id: string
  labelFr: string
  inputs: Partial<Record<ResourceType, number>>
  output: ResourceType
  outputCount: number
  /** Needs workbench unless mill. */
  station: 'workbench' | 'mill' | 'any'
  urge: number
}

function def(
  id: string,
  labelFr: string,
  labelFrLog: string,
  massKg: number,
  opts: Omit<Partial<ResourceDef>, 'id' | 'labelFr' | 'labelFrLog' | 'massKg'> & { tags: ResourceTag[] },
): ResourceDef {
  return { id, labelFr, labelFrLog, massKg, ...opts }
}

/**
 * Ordre stable — nouveaux IDs à la fin pour éviter de casser des saves numériques futurs.
 * Inclut les 15 ressources historiques + ~55 collectibles / farmables / produits utiles.
 */
export const RESOURCE_DEFS = [
  // ── Existantes ──────────────────────────────────────────────────────────
  def('wood', 'Bois', 'bois', 8, { basePrice: 2, targetPerCapita: 5, tradeable: true, storeable: true, tags: ['fuel', 'construction', 'store'] }),
  def('stone', 'Pierre', 'pierre', 12, { basePrice: 3, targetPerCapita: 4, tradeable: true, storeable: true, tags: ['construction', 'store'] }),
  def('iron', 'Fer', 'fer', 10, { basePrice: 6, targetPerCapita: 1.2, tradeable: true, storeable: true, tags: ['ore', 'metal', 'store'] }),
  def('gold', 'Or', 'or', 6, { basePrice: 8, targetPerCapita: 0.6, tradeable: true, storeable: true, tags: ['ore', 'metal', 'store'] }),
  def('food', 'Baies', 'baies', 2.2, { kcal: 900, nutrition: 1, basePrice: 1.5, targetPerCapita: 3, tradeable: true, tags: ['edible', 'fruit'] }),
  def('coin', 'Pièces', 'pièces', 0.08, { tags: ['currency', 'store'] }),
  def('wheat', 'Blé', 'blé', 3.5, { kcal: 450, nutrition: 0.5, basePrice: 1.5, targetPerCapita: 3, tradeable: true, tags: ['edible', 'grain'] }),
  def('flour', 'Farine', 'farine', 2.8, { basePrice: 3, targetPerCapita: 1, tradeable: true, storeable: true, tags: ['craft', 'store'] }),
  def('bread', 'Pain', 'pain', 1.6, { kcal: 1400, nutrition: 2, basePrice: 2, targetPerCapita: 2, tradeable: true, tags: ['edible', 'craft'] }),
  def('wool', 'Laine', 'laine', 2.2, { basePrice: 2, targetPerCapita: 1.5, tradeable: true, storeable: true, tags: ['fiber', 'textile', 'animal', 'store'] }),
  def('cloth', 'Tissu', 'tissu', 2.5, { basePrice: 4, targetPerCapita: 0.8, tradeable: true, storeable: true, tags: ['textile', 'craft', 'store'] }),
  def('clothing', 'Vêtements', 'vêtements', 3.2, { basePrice: 9, targetPerCapita: 0.4, tradeable: true, storeable: true, tags: ['textile', 'craft', 'store'] }),
  def('hide', 'Peau', 'peau', 5.5, { basePrice: 3, targetPerCapita: 0.8, tradeable: true, storeable: true, tags: ['animal', 'store'] }),
  def('leather', 'Cuir', 'cuir', 4.2, { basePrice: 7, targetPerCapita: 0.35, tradeable: true, storeable: true, tags: ['craft', 'textile', 'store'] }),
  def('fur', 'Fourrure', 'fourrure', 3.8, { basePrice: 8, targetPerCapita: 0.35, tradeable: true, storeable: true, tags: ['animal', 'textile', 'craft', 'store'] }),
  def('charcoal', 'Charbon', 'charbon', 3.5, { basePrice: 3.5, targetPerCapita: 0.8, tradeable: true, storeable: true, tags: ['fuel', 'craft', 'store'] }),

  // ── Métaux & minerais ───────────────────────────────────────────────────
  def('copper', 'Cuivre', 'cuivre', 9, { basePrice: 5, targetPerCapita: 1, tradeable: true, storeable: true, tags: ['ore', 'metal', 'store'] }),
  def('tin', 'Étain', 'étain', 7, { basePrice: 5.5, targetPerCapita: 0.6, tradeable: true, storeable: true, tags: ['ore', 'metal', 'store'] }),
  def('lead', 'Plomb', 'plomb', 11, { basePrice: 4, targetPerCapita: 0.5, tradeable: true, storeable: true, tags: ['ore', 'metal', 'store'] }),
  def('silver', 'Argent', 'argent', 5.5, { basePrice: 7, targetPerCapita: 0.4, tradeable: true, storeable: true, tags: ['ore', 'metal', 'store'] }),
  def('bronze', 'Bronze', 'bronze', 9.5, { basePrice: 8, targetPerCapita: 0.5, tradeable: true, storeable: true, tags: ['metal', 'craft', 'store'] }),
  def('coal', 'Houille', 'houille', 6, { basePrice: 3, targetPerCapita: 0.7, tradeable: true, storeable: true, tags: ['fuel', 'ore', 'store'] }),

  // ── Géologie / chantier ────────────────────────────────────────────────
  def('clay', 'Argile', 'argile', 10, { basePrice: 1.5, targetPerCapita: 2, tradeable: true, storeable: true, tags: ['construction', 'craft', 'store'] }),
  def('salt', 'Sel', 'sel', 2, { basePrice: 4, targetPerCapita: 0.8, tradeable: true, storeable: true, tags: ['craft', 'store'] }),
  def('flint', 'Silex', 'silex', 3, { basePrice: 2.5, targetPerCapita: 0.6, tradeable: true, storeable: true, tags: ['craft', 'store'] }),
  def('limestone', 'Calcaire', 'calcaire', 14, { basePrice: 2, targetPerCapita: 1.5, tradeable: true, storeable: true, tags: ['construction', 'store'] }),
  def('sand', 'Sable', 'sable', 8, { basePrice: 0.8, targetPerCapita: 1, tradeable: true, storeable: true, tags: ['construction', 'craft', 'store'] }),
  def('peat', 'Tourbe', 'tourbe', 5, { basePrice: 1.2, targetPerCapita: 1, tradeable: true, storeable: true, tags: ['fuel', 'store'] }),
  def('brick', 'Briques', 'briques', 9, { basePrice: 3.5, targetPerCapita: 1.2, tradeable: true, storeable: true, tags: ['construction', 'craft', 'store'] }),
  def('mortar', 'Mortier', 'mortier', 7, { basePrice: 2.5, targetPerCapita: 0.8, tradeable: true, storeable: true, tags: ['construction', 'craft', 'store'] }),

  // ── Forêt / cueillette ──────────────────────────────────────────────────
  def('mushrooms', 'Champignons', 'champignons', 1.8, { kcal: 700, nutrition: 0.9, basePrice: 1.8, targetPerCapita: 1.2, tradeable: true, tags: ['edible'] }),
  def('herbs', 'Herbes', 'herbes', 0.8, { basePrice: 2.5, targetPerCapita: 0.8, tradeable: true, storeable: true, tags: ['herb', 'medicine', 'store'] }),
  def('honey', 'Miel', 'miel', 2.5, { kcal: 1200, nutrition: 1.4, basePrice: 4, targetPerCapita: 0.5, tradeable: true, storeable: true, tags: ['edible', 'craft', 'store'] }),
  def('beeswax', 'Cire', 'cire', 1.5, { basePrice: 3.5, targetPerCapita: 0.4, tradeable: true, storeable: true, tags: ['craft', 'store'] }),
  def('resin', 'Résine', 'résine', 2, { basePrice: 2, targetPerCapita: 0.6, tradeable: true, storeable: true, tags: ['craft', 'store'] }),
  def('pitch', 'Poix', 'poix', 3, { basePrice: 3.5, targetPerCapita: 0.5, tradeable: true, storeable: true, tags: ['craft', 'construction', 'store'] }),
  def('bark', 'Écorce', 'écorce', 2.5, { basePrice: 0.8, targetPerCapita: 0.8, tradeable: true, storeable: true, tags: ['craft', 'fiber', 'store'] }),
  def('acorns', 'Glands', 'glands', 2, { kcal: 500, nutrition: 0.55, basePrice: 1, targetPerCapita: 1, tradeable: true, tags: ['edible', 'fruit'] }),
  def('chestnuts', 'Châtaignes', 'châtaignes', 2.2, { kcal: 800, nutrition: 0.9, basePrice: 1.6, targetPerCapita: 1, tradeable: true, tags: ['edible', 'fruit'] }),
  def('hazelnuts', 'Noisettes', 'noisettes', 1.5, { kcal: 950, nutrition: 1, basePrice: 2, targetPerCapita: 0.7, tradeable: true, tags: ['edible', 'fruit'] }),
  def('reeds', 'Roseaux', 'roseaux', 2, { basePrice: 1, targetPerCapita: 1, tradeable: true, storeable: true, tags: ['fiber', 'craft', 'store'] }),
  def('nettles', 'Orties', 'orties', 1.2, { basePrice: 1.2, targetPerCapita: 0.6, tradeable: true, tags: ['fiber', 'herb', 'medicine'] }),
  def('willow', 'Osier', 'osier', 3, { basePrice: 1.5, targetPerCapita: 0.7, tradeable: true, storeable: true, tags: ['fiber', 'craft', 'store'] }),
  def('basket', 'Panier', 'panier', 2, { basePrice: 3, targetPerCapita: 0.4, tradeable: true, storeable: true, tags: ['craft', 'store'] }),

  // ── Chasse / pêche / élevage ────────────────────────────────────────────
  def('fish', 'Poisson', 'poisson', 2.4, { kcal: 850, nutrition: 1.1, basePrice: 2, targetPerCapita: 2, tradeable: true, tags: ['edible', 'fish'] }),
  def('game', 'Gibier', 'gibier', 4, { kcal: 1100, nutrition: 1.3, basePrice: 3, targetPerCapita: 1, tradeable: true, tags: ['edible', 'animal'] }),
  def('milk', 'Lait', 'lait', 2.5, { kcal: 600, nutrition: 0.8, basePrice: 1.5, targetPerCapita: 1.2, tradeable: true, tags: ['edible', 'animal'] }),
  def('cheese', 'Fromage', 'fromage', 2, { kcal: 1100, nutrition: 1.5, basePrice: 3.5, targetPerCapita: 0.6, tradeable: true, storeable: true, tags: ['edible', 'craft', 'store'] }),
  def('eggs', 'Œufs', 'œufs', 1.2, { kcal: 700, nutrition: 0.9, basePrice: 1.8, targetPerCapita: 0.8, tradeable: true, tags: ['edible', 'animal'] }),
  def('tallow', 'Suif', 'suif', 2.5, { basePrice: 2, targetPerCapita: 0.5, tradeable: true, storeable: true, tags: ['craft', 'fuel', 'store'] }),
  def('soap', 'Savon', 'savon', 1.5, { basePrice: 3, targetPerCapita: 0.35, tradeable: true, storeable: true, tags: ['craft', 'store'] }),
  def('candle', 'Chandelle', 'chandelle', 0.8, { basePrice: 2.5, targetPerCapita: 0.5, tradeable: true, storeable: true, tags: ['craft', 'fuel', 'store'] }),

  // ── Céréales & cultures ─────────────────────────────────────────────────
  def('rye', 'Seigle', 'seigle', 3.4, { kcal: 420, nutrition: 0.5, basePrice: 1.4, targetPerCapita: 2, tradeable: true, tags: ['edible', 'grain'] }),
  def('barley', 'Orge', 'orge', 3.3, { kcal: 430, nutrition: 0.5, basePrice: 1.4, targetPerCapita: 2, tradeable: true, tags: ['edible', 'grain'] }),
  def('oats', 'Avoine', 'avoine', 3.2, { kcal: 400, nutrition: 0.45, basePrice: 1.3, targetPerCapita: 1.8, tradeable: true, tags: ['edible', 'grain'] }),
  def('flax', 'Lin', 'lin', 2.5, { basePrice: 2.2, targetPerCapita: 1.2, tradeable: true, storeable: true, tags: ['fiber', 'store'] }),
  def('hemp', 'Chanvre', 'chanvre', 2.8, { basePrice: 2, targetPerCapita: 1, tradeable: true, storeable: true, tags: ['fiber', 'store'] }),
  def('linen', 'Linon', 'linon', 2.3, { basePrice: 5, targetPerCapita: 0.5, tradeable: true, storeable: true, tags: ['textile', 'craft', 'store'] }),
  def('rope', 'Corde', 'corde', 2.5, { basePrice: 3.5, targetPerCapita: 0.6, tradeable: true, storeable: true, tags: ['craft', 'construction', 'store'] }),

  // ── Légumes / fruits cultivés ───────────────────────────────────────────
  def('cabbage', 'Chou', 'chou', 2.5, { kcal: 350, nutrition: 0.7, basePrice: 1.2, targetPerCapita: 1.5, tradeable: true, tags: ['edible', 'vegetable'] }),
  def('turnip', 'Navet', 'navet', 2.8, { kcal: 300, nutrition: 0.6, basePrice: 1, targetPerCapita: 1.5, tradeable: true, tags: ['edible', 'vegetable'] }),
  def('pea', 'Pois', 'pois', 2.2, { kcal: 550, nutrition: 0.85, basePrice: 1.5, targetPerCapita: 1.2, tradeable: true, tags: ['edible', 'vegetable'] }),
  def('bean', 'Fèves', 'fèves', 2.4, { kcal: 600, nutrition: 0.9, basePrice: 1.5, targetPerCapita: 1.2, tradeable: true, tags: ['edible', 'vegetable'] }),
  def('onion', 'Oignon', 'oignon', 1.8, { kcal: 280, nutrition: 0.55, basePrice: 1.3, targetPerCapita: 1, tradeable: true, tags: ['edible', 'vegetable'] }),
  def('garlic', 'Ail', 'ail', 1.2, { kcal: 320, nutrition: 0.5, basePrice: 2, targetPerCapita: 0.6, tradeable: true, tags: ['edible', 'vegetable', 'medicine'] }),
  def('leek', 'Poireau', 'poireau', 2, { kcal: 260, nutrition: 0.55, basePrice: 1.2, targetPerCapita: 0.9, tradeable: true, tags: ['edible', 'vegetable'] }),
  def('carrot', 'Carotte', 'carotte', 2.2, { kcal: 300, nutrition: 0.6, basePrice: 1.2, targetPerCapita: 1.2, tradeable: true, tags: ['edible', 'vegetable'] }),
  def('beet', 'Betterave', 'betterave', 2.6, { kcal: 320, nutrition: 0.65, basePrice: 1.1, targetPerCapita: 1, tradeable: true, tags: ['edible', 'vegetable', 'dye'] }),
  def('apple', 'Pommes', 'pommes', 2.3, { kcal: 500, nutrition: 0.8, basePrice: 1.6, targetPerCapita: 1.2, tradeable: true, tags: ['edible', 'fruit'] }),
  def('pear', 'Poires', 'poires', 2.3, { kcal: 480, nutrition: 0.75, basePrice: 1.7, targetPerCapita: 0.9, tradeable: true, tags: ['edible', 'fruit'] }),
  def('plum', 'Prunes', 'prunes', 2, { kcal: 450, nutrition: 0.7, basePrice: 1.5, targetPerCapita: 0.8, tradeable: true, tags: ['edible', 'fruit'] }),
  def('grape', 'Raisin', 'raisin', 2.1, { kcal: 550, nutrition: 0.85, basePrice: 2.2, targetPerCapita: 1, tradeable: true, tags: ['edible', 'fruit'] }),
  def('hop', 'Houblon', 'houblon', 1.5, { basePrice: 2.5, targetPerCapita: 0.5, tradeable: true, storeable: true, tags: ['craft', 'herb', 'store'] }),

  // ── Herbes médicinales / teintures ──────────────────────────────────────
  def('sage', 'Sauge', 'sauge', 0.6, { basePrice: 2.8, targetPerCapita: 0.4, tradeable: true, storeable: true, tags: ['herb', 'medicine', 'store'] }),
  def('mint', 'Menthe', 'menthe', 0.5, { basePrice: 2, targetPerCapita: 0.4, tradeable: true, tags: ['herb', 'medicine'] }),
  def('lavender', 'Lavande', 'lavande', 0.5, { basePrice: 2.5, targetPerCapita: 0.35, tradeable: true, storeable: true, tags: ['herb', 'dye', 'store'] }),
  def('woad', 'Pastel', 'pastel', 1, { basePrice: 3, targetPerCapita: 0.4, tradeable: true, storeable: true, tags: ['dye', 'herb', 'store'] }),
  def('madder', 'Garance', 'garance', 1.1, { basePrice: 3.2, targetPerCapita: 0.35, tradeable: true, storeable: true, tags: ['dye', 'herb', 'store'] }),
  def('dye', 'Teinture', 'teinture', 1.2, { basePrice: 4.5, targetPerCapita: 0.3, tradeable: true, storeable: true, tags: ['dye', 'craft', 'store'] }),
  def('medicine', 'Remède', 'remède', 0.7, { basePrice: 5, targetPerCapita: 0.4, tradeable: true, storeable: true, tags: ['medicine', 'craft', 'store'] }),
  def('ale', 'Cervoise', 'cervoise', 2.5, { kcal: 650, nutrition: 0.75, basePrice: 2.5, targetPerCapita: 0.8, tradeable: true, tags: ['edible', 'craft'] }),
  def('wine', 'Vin', 'vin', 2.8, { kcal: 700, nutrition: 0.8, basePrice: 4, targetPerCapita: 0.5, tradeable: true, storeable: true, tags: ['edible', 'craft', 'store'] }),
  def('preserved', 'Salaison', 'salaison', 2.5, { kcal: 1000, nutrition: 1.4, basePrice: 3.5, targetPerCapita: 0.7, tradeable: true, storeable: true, tags: ['edible', 'craft', 'store'] }),
] as const satisfies readonly ResourceDef[]

export type ResourceType = (typeof RESOURCE_DEFS)[number]['id']

export const RESOURCE_IDS: ResourceType[] = RESOURCE_DEFS.map((r) => r.id)

const BY_ID = Object.fromEntries(RESOURCE_DEFS.map((r) => [r.id, r])) as Record<ResourceType, ResourceDef>

export function resourceDef(id: ResourceType): ResourceDef {
  return BY_ID[id]
}

export function isEdible(id: ResourceType): boolean {
  return BY_ID[id]?.tags.includes('edible') ?? false
}

export function isStoreable(id: ResourceType): boolean {
  const d = BY_ID[id]
  if (!d) return false
  if (d.storeable) return true
  return d.tags.includes('store') || d.tags.includes('edible')
}

export function isTradeable(id: ResourceType): boolean {
  return BY_ID[id]?.tradeable === true
}

export function isFuel(id: ResourceType): boolean {
  return BY_ID[id]?.tags.includes('fuel') ?? false
}

export function isMedicine(id: ResourceType): boolean {
  return BY_ID[id]?.tags.includes('medicine') ?? false
}

export function isGrain(id: ResourceType): boolean {
  return BY_ID[id]?.tags.includes('grain') ?? false
}

/** Masse unitaire (kg). */
export const RESOURCE_MASS_KG: Record<ResourceType, number> = Object.fromEntries(
  RESOURCE_DEFS.map((r) => [r.id, r.massKg]),
) as Record<ResourceType, number>

export const RESOURCE_KCAL: Partial<Record<ResourceType, number>> = Object.fromEntries(
  RESOURCE_DEFS.filter((r) => r.kcal != null).map((r) => [r.id, r.kcal!]),
)

export const RESOURCE_NUTRITION: Partial<Record<ResourceType, number>> = Object.fromEntries(
  RESOURCE_DEFS.filter((r) => r.nutrition != null).map((r) => [r.id, r.nutrition!]),
)

export const RESOURCE_LABELS_UI: Record<ResourceType, string> = Object.fromEntries(
  RESOURCE_DEFS.map((r) => [r.id, r.labelFr]),
) as Record<ResourceType, string>

export const RESOURCE_LABELS_LOG: Record<ResourceType, string> = Object.fromEntries(
  RESOURCE_DEFS.map((r) => [r.id, r.labelFrLog]),
) as Record<ResourceType, string>

export const TRADEABLE_RESOURCES: ResourceType[] = RESOURCE_DEFS.filter((r) => r.tradeable).map((r) => r.id)

export const BASE_PRICES: Partial<Record<ResourceType, number>> = Object.fromEntries(
  RESOURCE_DEFS.filter((r) => r.basePrice != null).map((r) => [r.id, r.basePrice!]),
)

export const TARGET_PER_CAPITA: Partial<Record<ResourceType, number>> = Object.fromEntries(
  RESOURCE_DEFS.filter((r) => r.targetPerCapita != null).map((r) => [r.id, r.targetPerCapita!]),
)

export const STOREABLE_RESOURCES: ResourceType[] = RESOURCE_DEFS.filter((r) => r.storeable || r.tags.includes('store')).map(
  (r) => r.id,
)

/** Edibles sorted best-first for eating priority (nutrition desc, then kcal). */
export const EDIBLE_PRIORITY: ResourceType[] = RESOURCE_DEFS.filter((r) => r.tags.includes('edible'))
  .slice()
  .sort((a, b) => (b.nutrition ?? 0) - (a.nutrition ?? 0) || (b.kcal ?? 0) - (a.kcal ?? 0))
  .map((r) => r.id)

/** Crop type codes stored on WorldGrid.cropType (0 = wheat). */
export const CROP_WHEAT = 0
export const CROP_DEFS: CropDef[] = [
  { id: 0, resource: 'wheat', labelFr: 'blé', weight: 22, yieldMul: 1 },
  { id: 1, resource: 'rye', labelFr: 'seigle', weight: 10, yieldMul: 0.95 },
  { id: 2, resource: 'barley', labelFr: 'orge', weight: 10, yieldMul: 0.95 },
  { id: 3, resource: 'oats', labelFr: 'avoine', weight: 8, yieldMul: 0.9 },
  { id: 4, resource: 'flax', labelFr: 'lin', weight: 7, yieldMul: 0.85 },
  { id: 5, resource: 'hemp', labelFr: 'chanvre', weight: 5, yieldMul: 0.85 },
  { id: 6, resource: 'cabbage', labelFr: 'chou', weight: 6, yieldMul: 1.1 },
  { id: 7, resource: 'turnip', labelFr: 'navet', weight: 6, yieldMul: 1.15 },
  { id: 8, resource: 'pea', labelFr: 'pois', weight: 5, yieldMul: 0.9 },
  { id: 9, resource: 'bean', labelFr: 'fèves', weight: 5, yieldMul: 0.9 },
  { id: 10, resource: 'onion', labelFr: 'oignon', weight: 4, yieldMul: 1 },
  { id: 11, resource: 'garlic', labelFr: 'ail', weight: 3, yieldMul: 0.8 },
  { id: 12, resource: 'leek', labelFr: 'poireau', weight: 3, yieldMul: 1 },
  { id: 13, resource: 'carrot', labelFr: 'carotte', weight: 4, yieldMul: 1.05 },
  { id: 14, resource: 'beet', labelFr: 'betterave', weight: 3, yieldMul: 1 },
  { id: 15, resource: 'hop', labelFr: 'houblon', weight: 3, yieldMul: 0.75 },
  { id: 16, resource: 'grape', labelFr: 'raisin', weight: 4, yieldMul: 0.85 },
  { id: 17, resource: 'apple', labelFr: 'pommes', weight: 3, yieldMul: 0.9 },
  { id: 18, resource: 'woad', labelFr: 'pastel', weight: 2, yieldMul: 0.7 },
  { id: 19, resource: 'madder', labelFr: 'garance', weight: 2, yieldMul: 0.7 },
  { id: 20, resource: 'lavender', labelFr: 'lavande', weight: 2, yieldMul: 0.65 },
  { id: 21, resource: 'sage', labelFr: 'sauge', weight: 2, yieldMul: 0.6 },
  { id: 22, resource: 'pear', labelFr: 'poires', weight: 2, yieldMul: 0.85 },
  { id: 23, resource: 'plum', labelFr: 'prunes', weight: 2, yieldMul: 0.8 },
  { id: 24, resource: 'mint', labelFr: 'menthe', weight: 2, yieldMul: 0.6 },
]

const CROP_BY_ID = new Map(CROP_DEFS.map((c) => [c.id, c]))

export function cropDef(id: number): CropDef {
  return CROP_BY_ID.get(id) ?? CROP_DEFS[0]!
}

export function pickCropId(rng: () => number): number {
  let total = 0
  for (const c of CROP_DEFS) total += c.weight
  let roll = rng() * total
  for (const c of CROP_DEFS) {
    roll -= c.weight
    if (roll <= 0) return c.id
  }
  return CROP_WHEAT
}

/** Extra / alternate yields when gathering from a terrain source. */
export const GATHER_TABLE: Record<GatherSource, GatherYield[]> = {
  bush: [
    { resource: 'food', chance: 1, min: 1, max: 2, primary: true },
    { resource: 'mushrooms', chance: 0.18, min: 1, max: 1 },
    { resource: 'herbs', chance: 0.14, min: 1, max: 1 },
    { resource: 'nettles', chance: 0.1, min: 1, max: 1 },
    { resource: 'mint', chance: 0.08, min: 1, max: 1 },
    { resource: 'sage', chance: 0.06, min: 1, max: 1 },
    { resource: 'lavender', chance: 0.05, min: 1, max: 1 },
    { resource: 'honey', chance: 0.04, min: 1, max: 1 },
    { resource: 'beeswax', chance: 0.02, min: 1, max: 1 },
    { resource: 'hazelnuts', chance: 0.07, min: 1, max: 1 },
    { resource: 'eggs', chance: 0.03, min: 1, max: 1 },
  ],
  tree: [
    { resource: 'wood', chance: 1, min: 1, max: 1, primary: true },
    { resource: 'resin', chance: 0.12, min: 1, max: 1 },
    { resource: 'bark', chance: 0.15, min: 1, max: 1 },
    { resource: 'acorns', chance: 0.1, min: 1, max: 2 },
    { resource: 'chestnuts', chance: 0.08, min: 1, max: 2 },
    { resource: 'honey', chance: 0.05, min: 1, max: 1 },
    { resource: 'beeswax', chance: 0.03, min: 1, max: 1 },
    { resource: 'willow', chance: 0.06, min: 1, max: 1 },
  ],
  stone: [
    { resource: 'stone', chance: 1, min: 1, max: 1, primary: true },
    { resource: 'clay', chance: 0.2, min: 1, max: 2 },
    { resource: 'flint', chance: 0.12, min: 1, max: 1 },
    { resource: 'limestone', chance: 0.15, min: 1, max: 1 },
    { resource: 'salt', chance: 0.06, min: 1, max: 1 },
    { resource: 'sand', chance: 0.1, min: 1, max: 1 },
    { resource: 'peat', chance: 0.05, min: 1, max: 1 },
  ],
  fish: [
    { resource: 'fish', chance: 0.85, min: 1, max: 2, primary: true },
    { resource: 'food', chance: 0.15, min: 1, max: 1, primary: true },
    { resource: 'reeds', chance: 0.12, min: 1, max: 1 },
    { resource: 'salt', chance: 0.04, min: 1, max: 1 },
  ],
  sheep: [
    { resource: 'wool', chance: 1, min: 1, max: 1, primary: true },
    { resource: 'milk', chance: 0.35, min: 1, max: 1 },
    { resource: 'hide', chance: 0.08, min: 1, max: 1 },
  ],
  hunt: [
    { resource: 'game', chance: 0.7, min: 1, max: 2, primary: true },
    { resource: 'hide', chance: 0.55, min: 1, max: 1 },
    { resource: 'fur', chance: 0.4, min: 1, max: 2 },
    { resource: 'tallow', chance: 0.35, min: 1, max: 1 },
    { resource: 'food', chance: 0.2, min: 1, max: 1 },
  ],
}

export function rollGatherExtras(
  source: GatherSource,
  rng: () => number,
  opts?: { skipPrimary?: boolean },
): { resource: ResourceType; amount: number }[] {
  const out: { resource: ResourceType; amount: number }[] = []
  for (const row of GATHER_TABLE[source]) {
    if (opts?.skipPrimary && row.primary) continue
    if (!row.primary && rng() >= row.chance) continue
    if (row.primary && rng() >= row.chance) continue
    const min = row.min ?? 1
    const max = row.max ?? min
    const amount = min >= max ? min : min + Math.floor(rng() * (max - min + 1))
    if (amount > 0) out.push({ resource: row.resource, amount })
  }
  return out
}

/** Recettes d'atelier / moulin — consomment les ressources collectées. */
export const CRAFT_RECIPES: CraftRecipe[] = [
  {
    id: 'pitch_from_resin',
    labelFr: 'poix',
    inputs: { resin: 2 },
    output: 'pitch',
    outputCount: 1,
    station: 'workbench',
    urge: 28,
  },
  {
    id: 'linen_from_flax',
    labelFr: 'linon',
    inputs: { flax: 3 },
    output: 'linen',
    outputCount: 1,
    station: 'workbench',
    urge: 32,
  },
  {
    id: 'rope_from_hemp',
    labelFr: 'corde',
    inputs: { hemp: 2 },
    output: 'rope',
    outputCount: 1,
    station: 'workbench',
    urge: 30,
  },
  {
    id: 'rope_from_nettles',
    labelFr: 'corde',
    inputs: { nettles: 3 },
    output: 'rope',
    outputCount: 1,
    station: 'workbench',
    urge: 22,
  },
  {
    id: 'cloth_from_linen',
    labelFr: 'tissu',
    inputs: { linen: 2 },
    output: 'cloth',
    outputCount: 1,
    station: 'workbench',
    urge: 34,
  },
  {
    id: 'brick_from_clay',
    labelFr: 'briques',
    inputs: { clay: 3, wood: 1 },
    output: 'brick',
    outputCount: 2,
    station: 'workbench',
    urge: 26,
  },
  {
    id: 'mortar_mix',
    labelFr: 'mortier',
    inputs: { limestone: 2, sand: 1 },
    output: 'mortar',
    outputCount: 2,
    station: 'workbench',
    urge: 24,
  },
  {
    id: 'bronze_alloy',
    labelFr: 'bronze',
    inputs: { copper: 2, tin: 1, charcoal: 1 },
    output: 'bronze',
    outputCount: 2,
    station: 'workbench',
    urge: 40,
  },
  {
    id: 'cheese_from_milk',
    labelFr: 'fromage',
    inputs: { milk: 2, salt: 1 },
    output: 'cheese',
    outputCount: 1,
    station: 'workbench',
    urge: 28,
  },
  {
    id: 'medicine_herbs',
    labelFr: 'remède',
    inputs: { herbs: 2 },
    output: 'medicine',
    outputCount: 1,
    station: 'workbench',
    urge: 35,
  },
  {
    id: 'medicine_sage',
    labelFr: 'remède',
    inputs: { sage: 1, mint: 1 },
    output: 'medicine',
    outputCount: 1,
    station: 'workbench',
    urge: 33,
  },
  {
    id: 'medicine_garlic',
    labelFr: 'remède',
    inputs: { garlic: 2, herbs: 1 },
    output: 'medicine',
    outputCount: 1,
    station: 'workbench',
    urge: 30,
  },
  {
    id: 'dye_woad',
    labelFr: 'teinture',
    inputs: { woad: 2 },
    output: 'dye',
    outputCount: 1,
    station: 'workbench',
    urge: 26,
  },
  {
    id: 'dye_madder',
    labelFr: 'teinture',
    inputs: { madder: 2 },
    output: 'dye',
    outputCount: 1,
    station: 'workbench',
    urge: 26,
  },
  {
    id: 'dye_beet',
    labelFr: 'teinture',
    inputs: { beet: 3 },
    output: 'dye',
    outputCount: 1,
    station: 'workbench',
    urge: 20,
  },
  {
    id: 'dyed_cloth',
    labelFr: 'tissu',
    inputs: { cloth: 1, dye: 1 },
    output: 'cloth',
    outputCount: 1,
    station: 'workbench',
    urge: 18,
  },
  {
    id: 'ale_brew',
    labelFr: 'cervoise',
    inputs: { barley: 2, hop: 1 },
    output: 'ale',
    outputCount: 2,
    station: 'workbench',
    urge: 30,
  },
  {
    id: 'wine_press',
    labelFr: 'vin',
    inputs: { grape: 3 },
    output: 'wine',
    outputCount: 2,
    station: 'workbench',
    urge: 28,
  },
  {
    id: 'preserve_fish',
    labelFr: 'salaison',
    inputs: { fish: 2, salt: 1 },
    output: 'preserved',
    outputCount: 2,
    station: 'workbench',
    urge: 32,
  },
  {
    id: 'preserve_game',
    labelFr: 'salaison',
    inputs: { game: 2, salt: 1 },
    output: 'preserved',
    outputCount: 2,
    station: 'workbench',
    urge: 32,
  },
  {
    id: 'soap_tallow',
    labelFr: 'savon',
    inputs: { tallow: 2, charcoal: 1 },
    output: 'soap',
    outputCount: 1,
    station: 'workbench',
    urge: 22,
  },
  {
    id: 'candle_wax',
    labelFr: 'chandelle',
    inputs: { beeswax: 2 },
    output: 'candle',
    outputCount: 2,
    station: 'workbench',
    urge: 24,
  },
  {
    id: 'candle_tallow',
    labelFr: 'chandelle',
    inputs: { tallow: 2 },
    output: 'candle',
    outputCount: 1,
    station: 'workbench',
    urge: 20,
  },
  {
    id: 'basket_reed',
    labelFr: 'panier',
    inputs: { reeds: 3 },
    output: 'basket',
    outputCount: 1,
    station: 'workbench',
    urge: 22,
  },
  {
    id: 'basket_willow',
    labelFr: 'panier',
    inputs: { willow: 2, bark: 1 },
    output: 'basket',
    outputCount: 1,
    station: 'workbench',
    urge: 24,
  },
  {
    id: 'flour_rye',
    labelFr: 'farine',
    inputs: { rye: 2 },
    output: 'flour',
    outputCount: 1,
    station: 'mill',
    urge: 40,
  },
  {
    id: 'flour_barley',
    labelFr: 'farine',
    inputs: { barley: 2 },
    output: 'flour',
    outputCount: 1,
    station: 'mill',
    urge: 38,
  },
  {
    id: 'flour_oats',
    labelFr: 'farine',
    inputs: { oats: 2 },
    output: 'flour',
    outputCount: 1,
    station: 'mill',
    urge: 36,
  },
]

export function recipeCraftable(
  recipe: CraftRecipe,
  countOf: (type: ResourceType) => number,
): boolean {
  for (const [res, need] of Object.entries(recipe.inputs) as [ResourceType, number][]) {
    if (need == null || need <= 0) continue
    if (countOf(res) < need) return false
  }
  return true
}

export function spendRecipeInputs(
  recipe: CraftRecipe,
  remove: (type: ResourceType, n: number) => void,
): void {
  for (const [res, need] of Object.entries(recipe.inputs) as [ResourceType, number][]) {
    if (need == null || need <= 0) continue
    remove(res, need)
  }
}

/** Grains that the mill can grind (besides wheat handled by grindFlour). */
export const MILL_GRAINS: ResourceType[] = ['rye', 'barley', 'oats']

/** Construction materials usable instead of / alongside stone for walls. */
export function constructionBonus(invCount: (t: ResourceType) => number): {
  preferBrick: boolean
  preferMortar: boolean
} {
  return {
    preferBrick: invCount('brick') >= 2,
    preferMortar: invCount('mortar') >= 1,
  }
}

/** Harvestable / farmable resource count (excludes pure craft intermediates & currency). */
export function countHarvestableFarmable(): number {
  const harvestable = new Set<ResourceType>()
  for (const rows of Object.values(GATHER_TABLE)) {
    for (const r of rows) harvestable.add(r.resource)
  }
  for (const c of CROP_DEFS) harvestable.add(c.resource)
  // Ores mined from mountains
  for (const ore of ['iron', 'gold', 'copper', 'tin', 'lead', 'silver', 'coal'] as ResourceType[]) {
    harvestable.add(ore)
  }
  harvestable.add('stone')
  harvestable.add('wood')
  return harvestable.size
}
