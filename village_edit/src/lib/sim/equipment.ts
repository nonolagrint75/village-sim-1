/**
 * Medieval on-person kit: body slots, craftable gear, utility + social signaling.
 * Equipped items are not bag stacks — they live on the body and feed warmth, work,
 * combat, carry capacity, and respect/wealth display.
 */
import { countOf, removeFromInventory, type ResourceType, type Slot } from './inventory'
import type { Profession, Season, ToolTier, Villager } from './types'

export type BodySlot =
  | 'head'
  | 'torso'
  | 'outer'
  | 'legs'
  | 'feet'
  | 'hands'
  | 'mainHand'
  | 'offHand'
  | 'belt'
  | 'jewelry'

export type GearId =
  | 'wool_hood'
  | 'leather_cap'
  | 'iron_helm'
  | 'linen_tunic'
  | 'cloth_tunic'
  | 'wool_tunic'
  | 'leather_jerkin'
  | 'iron_mail'
  | 'wool_cloak'
  | 'fur_mantle'
  | 'wool_hose'
  | 'leather_breeches'
  | 'leather_shoes'
  | 'leather_boots'
  | 'wool_mittens'
  | 'leather_gloves'
  | 'wooden_staff'
  | 'wooden_spear'
  | 'stone_spear'
  | 'iron_dagger'
  | 'iron_sword'
  | 'wood_axe'
  | 'wooden_shield'
  | 'wicker_basket'
  | 'leather_belt'
  | 'coin_purse'
  | 'leather_satchel'
  | 'bone_brooch'
  | 'iron_brooch'
  | 'gold_ring'
  | 'gold_torque'

export type EquipmentLoadout = Record<BodySlot, GearId | null>

export type GearEffects = {
  clo: number
  protect: number
  work: number
  combat: number
  carryKg: number
  prestige: number
  wealthDisplay: number
  toolTier: ToolTier | null
}

export type GearDef = {
  id: GearId
  slot: BodySlot
  labelFr: string
  /** Short flavor for UI / chronicle. */
  hintFr: string
  recipe: Partial<Record<ResourceType, number>>
  /** Relative tier within the same slot (higher replaces lower). */
  tier: number
  clo: number
  protect: number
  work: number
  combat: number
  carryKg: number
  prestige: number
  wealthDisplay: number
  /** Syncs legacy toolTier when worn in mainHand. */
  toolTier: ToolTier | null
  /** Preferred craft skill gate soft-check. */
  craft: 'sew' | 'tan' | 'iron' | 'wood' | 'jewelry'
}

export const BODY_SLOTS: BodySlot[] = [
  'head',
  'torso',
  'outer',
  'legs',
  'feet',
  'hands',
  'mainHand',
  'offHand',
  'belt',
  'jewelry',
]

export const BODY_SLOT_LABELS_FR: Record<BodySlot, string> = {
  head: 'Tête',
  torso: 'Torse',
  outer: 'Manteau',
  legs: 'Jambes',
  feet: 'Pieds',
  hands: 'Mains',
  mainHand: 'Main droite',
  offHand: 'Main gauche',
  belt: 'Ceinture',
  jewelry: 'Parure',
}

export const GEAR_DEFS: Record<GearId, GearDef> = {
  wool_hood: {
    id: 'wool_hood',
    slot: 'head',
    labelFr: 'Capuche de laine',
    hintFr: 'Chaude, modeste',
    recipe: { wool: 1 },
    tier: 1,
    clo: 0.18,
    protect: 0.02,
    work: 0,
    combat: 0,
    carryKg: 0,
    prestige: 0.02,
    wealthDisplay: 0,
    toolTier: null,
    craft: 'sew',
  },
  leather_cap: {
    id: 'leather_cap',
    slot: 'head',
    labelFr: 'Calotte de cuir',
    hintFr: 'Protège des coups légers',
    recipe: { leather: 1 },
    tier: 2,
    clo: 0.15,
    protect: 0.08,
    work: 0,
    combat: 0.02,
    carryKg: 0,
    prestige: 0.04,
    wealthDisplay: 0,
    toolTier: null,
    craft: 'tan',
  },
  iron_helm: {
    id: 'iron_helm',
    slot: 'head',
    labelFr: 'Heaume de fer',
    hintFr: 'Casque de garde / seigneur',
    recipe: { iron: 2 },
    tier: 3,
    clo: 0.08,
    protect: 0.22,
    work: 0,
    combat: 0.08,
    carryKg: 0,
    prestige: 0.18,
    wealthDisplay: 0.08,
    toolTier: null,
    craft: 'iron',
  },
  linen_tunic: {
    id: 'linen_tunic',
    slot: 'torso',
    labelFr: 'Tunique de lin',
    hintFr: 'Vêtement de base, propre',
    recipe: { linen: 1 },
    tier: 1,
    clo: 0.28,
    protect: 0.02,
    work: 0,
    combat: 0,
    carryKg: 0,
    prestige: 0.06,
    wealthDisplay: 0.02,
    toolTier: null,
    craft: 'sew',
  },
  cloth_tunic: {
    id: 'cloth_tunic',
    slot: 'torso',
    labelFr: 'Tunique de tissu',
    hintFr: 'Tunique simple en toile',
    recipe: { cloth: 1 },
    tier: 1,
    clo: 0.26,
    protect: 0.02,
    work: 0,
    combat: 0,
    carryKg: 0,
    prestige: 0.05,
    wealthDisplay: 0.02,
    toolTier: null,
    craft: 'sew',
  },
  wool_tunic: {
    id: 'wool_tunic',
    slot: 'torso',
    labelFr: 'Tunique de laine',
    hintFr: 'Chaude pour l’hiver',
    recipe: { wool: 2 },
    tier: 2,
    clo: 0.42,
    protect: 0.04,
    work: 0,
    combat: 0,
    carryKg: 0,
    prestige: 0.05,
    wealthDisplay: 0,
    toolTier: null,
    craft: 'sew',
  },
  leather_jerkin: {
    id: 'leather_jerkin',
    slot: 'torso',
    labelFr: 'Pourpoint de cuir',
    hintFr: 'Travail et bagarres',
    recipe: { leather: 2 },
    tier: 3,
    clo: 0.32,
    protect: 0.14,
    work: 0.04,
    combat: 0.04,
    carryKg: 0,
    prestige: 0.08,
    wealthDisplay: 0.03,
    toolTier: null,
    craft: 'tan',
  },
  iron_mail: {
    id: 'iron_mail',
    slot: 'torso',
    labelFr: 'Cotte de mailles',
    hintFr: 'Armure de prestige militaire',
    recipe: { iron: 3, leather: 1 },
    tier: 4,
    clo: 0.2,
    protect: 0.38,
    work: -0.05,
    combat: 0.12,
    carryKg: 0,
    prestige: 0.28,
    wealthDisplay: 0.15,
    toolTier: null,
    craft: 'iron',
  },
  wool_cloak: {
    id: 'wool_cloak',
    slot: 'outer',
    labelFr: 'Cape de laine',
    hintFr: 'Coupe le vent',
    recipe: { wool: 2, cloth: 1 },
    tier: 1,
    clo: 0.38,
    protect: 0.02,
    work: 0,
    combat: 0,
    carryKg: 0,
    prestige: 0.1,
    wealthDisplay: 0.04,
    toolTier: null,
    craft: 'sew',
  },
  fur_mantle: {
    id: 'fur_mantle',
    slot: 'outer',
    labelFr: 'Manteau de fourrure',
    hintFr: 'Luxe d’hiver — attire les regards',
    recipe: { fur: 2, leather: 1 },
    tier: 2,
    clo: 0.72,
    protect: 0.06,
    work: 0,
    combat: 0,
    carryKg: 0,
    prestige: 0.22,
    wealthDisplay: 0.28,
    toolTier: null,
    craft: 'tan',
  },
  wool_hose: {
    id: 'wool_hose',
    slot: 'legs',
    labelFr: 'Chausses de laine',
    hintFr: 'Jambes au chaud',
    recipe: { wool: 1 },
    tier: 1,
    clo: 0.22,
    protect: 0.02,
    work: 0,
    combat: 0,
    carryKg: 0,
    prestige: 0.02,
    wealthDisplay: 0,
    toolTier: null,
    craft: 'sew',
  },
  leather_breeches: {
    id: 'leather_breeches',
    slot: 'legs',
    labelFr: 'Braies de cuir',
    hintFr: 'Solides pour le travail',
    recipe: { leather: 1 },
    tier: 2,
    clo: 0.2,
    protect: 0.08,
    work: 0.05,
    combat: 0.02,
    carryKg: 0,
    prestige: 0.04,
    wealthDisplay: 0,
    toolTier: null,
    craft: 'tan',
  },
  leather_shoes: {
    id: 'leather_shoes',
    slot: 'feet',
    labelFr: 'Souliers de cuir',
    hintFr: 'Pieds secs, marche plus sûre',
    recipe: { leather: 1 },
    tier: 1,
    clo: 0.14,
    protect: 0.03,
    work: 0.06,
    combat: 0,
    carryKg: 0,
    prestige: 0.04,
    wealthDisplay: 0.02,
    toolTier: null,
    craft: 'tan',
  },
  leather_boots: {
    id: 'leather_boots',
    slot: 'feet',
    labelFr: 'Bottes de cuir',
    hintFr: 'Voyage et prestige de marchand',
    recipe: { leather: 2 },
    tier: 2,
    clo: 0.24,
    protect: 0.06,
    work: 0.1,
    combat: 0.02,
    carryKg: 0,
    prestige: 0.08,
    wealthDisplay: 0.06,
    toolTier: null,
    craft: 'tan',
  },
  wool_mittens: {
    id: 'wool_mittens',
    slot: 'hands',
    labelFr: 'Mitaines de laine',
    hintFr: 'Doigts au chaud',
    recipe: { wool: 1 },
    tier: 1,
    clo: 0.16,
    protect: 0.02,
    work: 0.02,
    combat: 0,
    carryKg: 0,
    prestige: 0.01,
    wealthDisplay: 0,
    toolTier: null,
    craft: 'sew',
  },
  leather_gloves: {
    id: 'leather_gloves',
    slot: 'hands',
    labelFr: 'Gants de cuir',
    hintFr: 'Prise ferme à l’outil',
    recipe: { leather: 1 },
    tier: 2,
    clo: 0.1,
    protect: 0.05,
    work: 0.1,
    combat: 0.02,
    carryKg: 0,
    prestige: 0.05,
    wealthDisplay: 0.02,
    toolTier: null,
    craft: 'tan',
  },
  wooden_staff: {
    id: 'wooden_staff',
    slot: 'mainHand',
    labelFr: 'Bâton de bois',
    hintFr: 'Appui et défense sommaire',
    recipe: { wood: 2 },
    tier: 1,
    clo: 0,
    protect: 0.04,
    work: 0.04,
    combat: 0.08,
    carryKg: 0,
    prestige: 0.02,
    wealthDisplay: 0,
    toolTier: 'wood',
    craft: 'wood',
  },
  wooden_spear: {
    id: 'wooden_spear',
    slot: 'mainHand',
    labelFr: 'Lance de bois',
    hintFr: 'Arme de villageois',
    recipe: { wood: 3 },
    tier: 2,
    clo: 0,
    protect: 0.02,
    work: 0.06,
    combat: 0.14,
    carryKg: 0,
    prestige: 0.04,
    wealthDisplay: 0,
    toolTier: 'wood',
    craft: 'wood',
  },
  stone_spear: {
    id: 'stone_spear',
    slot: 'mainHand',
    labelFr: 'Lance de pierre',
    hintFr: 'Pointe tranchante',
    recipe: { stone: 3 },
    tier: 3,
    clo: 0,
    protect: 0.02,
    work: 0.1,
    combat: 0.22,
    carryKg: 0,
    prestige: 0.06,
    wealthDisplay: 0,
    toolTier: 'stone',
    craft: 'wood',
  },
  iron_dagger: {
    id: 'iron_dagger',
    slot: 'mainHand',
    labelFr: 'Dague de fer',
    hintFr: 'Arme de ceinture, signe d’aisance',
    recipe: { iron: 1, wood: 1 },
    tier: 4,
    clo: 0,
    protect: 0.02,
    work: 0.08,
    combat: 0.28,
    carryKg: 0,
    prestige: 0.12,
    wealthDisplay: 0.08,
    toolTier: 'iron',
    craft: 'iron',
  },
  iron_sword: {
    id: 'iron_sword',
    slot: 'mainHand',
    labelFr: 'Épée de fer',
    hintFr: 'Arme noble — respect et crainte',
    recipe: { iron: 2, wood: 1 },
    tier: 5,
    clo: 0,
    protect: 0.04,
    work: 0.05,
    combat: 0.4,
    carryKg: 0,
    prestige: 0.25,
    wealthDisplay: 0.15,
    toolTier: 'iron',
    craft: 'iron',
  },
  wood_axe: {
    id: 'wood_axe',
    slot: 'mainHand',
    labelFr: 'Hache de bois',
    hintFr: 'Outil de bûcheron',
    recipe: { wood: 2, stone: 1 },
    tier: 2,
    clo: 0,
    protect: 0.02,
    work: 0.18,
    combat: 0.12,
    carryKg: 0,
    prestige: 0.03,
    wealthDisplay: 0,
    toolTier: 'wood',
    craft: 'wood',
  },
  wooden_shield: {
    id: 'wooden_shield',
    slot: 'offHand',
    labelFr: 'Bouclier de bois',
    hintFr: 'Parade contre les loups',
    recipe: { wood: 2 },
    tier: 1,
    clo: 0,
    protect: 0.18,
    work: 0,
    combat: 0.06,
    carryKg: 0,
    prestige: 0.06,
    wealthDisplay: 0,
    toolTier: null,
    craft: 'wood',
  },
  wicker_basket: {
    id: 'wicker_basket',
    slot: 'offHand',
    labelFr: 'Panier d’osier',
    hintFr: 'Charge utile au marché',
    recipe: { willow: 1, reeds: 1 },
    tier: 1,
    clo: 0,
    protect: 0,
    work: 0.04,
    combat: 0,
    carryKg: 10,
    prestige: 0.02,
    wealthDisplay: 0,
    toolTier: null,
    craft: 'wood',
  },
  leather_belt: {
    id: 'leather_belt',
    slot: 'belt',
    labelFr: 'Ceinture de cuir',
    hintFr: 'Porte outils et bourse',
    recipe: { leather: 1 },
    tier: 1,
    clo: 0.02,
    protect: 0.02,
    work: 0.02,
    combat: 0,
    carryKg: 2,
    prestige: 0.04,
    wealthDisplay: 0.02,
    toolTier: null,
    craft: 'tan',
  },
  coin_purse: {
    id: 'coin_purse',
    slot: 'belt',
    labelFr: 'Bourse',
    hintFr: 'Montre la fortune (ou la cache)',
    recipe: { leather: 1, cloth: 1 },
    tier: 2,
    clo: 0,
    protect: 0,
    work: 0,
    combat: 0,
    carryKg: 1,
    prestige: 0.06,
    wealthDisplay: 0.12,
    toolTier: null,
    craft: 'sew',
  },
  leather_satchel: {
    id: 'leather_satchel',
    slot: 'belt',
    labelFr: 'Sacoche de cuir',
    hintFr: 'Voyage et commerce',
    recipe: { leather: 2 },
    tier: 3,
    clo: 0.04,
    protect: 0.02,
    work: 0.04,
    combat: 0,
    carryKg: 14,
    prestige: 0.08,
    wealthDisplay: 0.1,
    toolTier: null,
    craft: 'tan',
  },
  bone_brooch: {
    id: 'bone_brooch',
    slot: 'jewelry',
    labelFr: 'Fibule d’os',
    hintFr: 'Ornement populaire',
    recipe: { hide: 1 },
    tier: 1,
    clo: 0,
    protect: 0,
    work: 0,
    combat: 0,
    carryKg: 0,
    prestige: 0.08,
    wealthDisplay: 0.04,
    toolTier: null,
    craft: 'jewelry',
  },
  iron_brooch: {
    id: 'iron_brooch',
    slot: 'jewelry',
    labelFr: 'Fibule de cuivre',
    hintFr: 'Ornement de forgeron',
    recipe: { copper: 1 },
    tier: 2,
    clo: 0,
    protect: 0,
    work: 0,
    combat: 0,
    carryKg: 0,
    prestige: 0.12,
    wealthDisplay: 0.08,
    toolTier: null,
    craft: 'jewelry',
  },
  gold_ring: {
    id: 'gold_ring',
    slot: 'jewelry',
    labelFr: 'Anneau d’argent',
    hintFr: 'Signe d’aisance et d’alliance',
    recipe: { silver: 1 },
    tier: 3,
    clo: 0,
    protect: 0,
    work: 0,
    combat: 0,
    carryKg: 0,
    prestige: 0.28,
    wealthDisplay: 0.32,
    toolTier: null,
    craft: 'jewelry',
  },
  gold_torque: {
    id: 'gold_torque',
    slot: 'jewelry',
    labelFr: 'Torque d’or',
    hintFr: 'Parure de chef — admiration',
    recipe: { gold: 2 },
    tier: 4,
    clo: 0.02,
    protect: 0,
    work: 0,
    combat: 0,
    carryKg: 0,
    prestige: 0.45,
    wealthDisplay: 0.5,
    toolTier: null,
    craft: 'jewelry',
  },
}

export const GEAR_LABELS_FR: Record<GearId, string> = Object.fromEntries(
  (Object.keys(GEAR_DEFS) as GearId[]).map((id) => [id, GEAR_DEFS[id].labelFr]),
) as Record<GearId, string>

const EMPTY_EFFECTS: GearEffects = {
  clo: 0.3,
  protect: 0,
  work: 0,
  combat: 0,
  carryKg: 0,
  prestige: 0,
  wealthDisplay: 0,
  toolTier: null,
}

export function createEmptyEquipment(): EquipmentLoadout {
  return {
    head: null,
    torso: null,
    outer: null,
    legs: null,
    feet: null,
    hands: null,
    mainHand: null,
    offHand: null,
    belt: null,
    jewelry: null,
  }
}

export function ensureEquipment(v: Villager): EquipmentLoadout {
  if (!v.equipment) v.equipment = createEmptyEquipment()
  return v.equipment
}

export function gearOf(id: GearId | null | undefined): GearDef | null {
  if (!id) return null
  return GEAR_DEFS[id] ?? null
}

export function sumEquipmentEffects(eq: EquipmentLoadout | null | undefined): GearEffects {
  if (!eq) return { ...EMPTY_EFFECTS }
  let clo = 0.28
  let protect = 0
  let work = 0
  let combat = 0
  let carryKg = 0
  let prestige = 0
  let wealthDisplay = 0
  let toolTier: ToolTier | null = null
  let toolRank = -1
  const rank = (t: ToolTier) => (t === 'iron' ? 3 : t === 'stone' ? 2 : t === 'wood' ? 1 : 0)

  for (const slot of BODY_SLOTS) {
    const def = gearOf(eq[slot])
    if (!def) continue
    clo += def.clo
    protect += def.protect
    work += def.work
    combat += def.combat
    carryKg += def.carryKg
    prestige += def.prestige
    wealthDisplay += def.wealthDisplay
    if (def.toolTier) {
      const r = rank(def.toolTier)
      if (r > toolRank) {
        toolRank = r
        toolTier = def.toolTier
      }
    }
  }
  return {
    clo: Math.min(2.4, clo),
    protect: Math.min(0.9, protect),
    work: Math.max(-0.15, Math.min(0.45, work)),
    combat: Math.min(0.7, combat),
    carryKg,
    prestige: Math.min(1.2, prestige),
    wealthDisplay: Math.min(1.2, wealthDisplay),
    toolTier,
  }
}

export function equipmentEffectsOf(v: Villager): GearEffects {
  return sumEquipmentEffects(ensureEquipment(v))
}

/** Display prestige 0–1 for admiration / politics. */
export function gearPrestige01(v: Villager): number {
  const e = equipmentEffectsOf(v)
  const coins = countOf(v.inventory, 'coin')
  const purseBoost =
    ensureEquipment(v).belt === 'coin_purse' || ensureEquipment(v).belt === 'leather_satchel'
      ? Math.min(0.35, coins * 0.04)
      : Math.min(0.12, coins * 0.015)
  return Math.min(1, e.prestige * 0.55 + e.wealthDisplay * 0.35 + purseBoost)
}

export function canAffordGear(inv: Slot[], id: GearId): boolean {
  const def = GEAR_DEFS[id]
  for (const [res, need] of Object.entries(def.recipe) as [ResourceType, number][]) {
    if (countOf(inv, res) < need) return false
  }
  return true
}

export function isUpgrade(eq: EquipmentLoadout, id: GearId): boolean {
  const def = GEAR_DEFS[id]
  const current = gearOf(eq[def.slot])
  if (!current) return true
  return def.tier > current.tier
}

/**
 * Equip gear into its slot. Returns displaced piece (caller may ignore — kit is worn, not bagged).
 * Syncs toolTier when main-hand changes.
 */
export function equipGear(v: Villager, id: GearId): GearId | null {
  const eq = ensureEquipment(v)
  const def = GEAR_DEFS[id]
  const prev = eq[def.slot]
  eq[def.slot] = id
  syncToolTierFromEquipment(v)
  return prev
}

export function syncToolTierFromEquipment(v: Villager) {
  const e = equipmentEffectsOf(v)
  if (e.toolTier) {
    const order: ToolTier[] = ['none', 'wood', 'stone', 'iron']
    if (order.indexOf(e.toolTier) >= order.indexOf(v.toolTier)) {
      v.toolTier = e.toolTier
      if (v.toolWear < 0) v.toolWear = 0
    }
  }
}

/** Map legacy tool crafts onto body slots. */
export function equipFromToolTier(v: Villager, tier: ToolTier) {
  ensureEquipment(v)
  if (tier === 'wood') equipGear(v, 'wooden_spear')
  else if (tier === 'stone') equipGear(v, 'stone_spear')
  else if (tier === 'iron') {
    const eq = ensureEquipment(v)
    const cur = gearOf(eq.mainHand)
    if (!cur || cur.tier < GEAR_DEFS.iron_dagger.tier) equipGear(v, 'iron_dagger')
  }
}

export function tryEquipFromClothingCraft(v: Villager, source: 'cloth' | 'leather') {
  ensureEquipment(v)
  if (source === 'cloth') {
    if (isUpgrade(v.equipment, 'linen_tunic') || isUpgrade(v.equipment, 'cloth_tunic')) {
      if (countOf(v.inventory, 'linen') > 0 && isUpgrade(v.equipment, 'linen_tunic')) equipGear(v, 'linen_tunic')
      else if (isUpgrade(v.equipment, 'cloth_tunic')) equipGear(v, 'cloth_tunic')
      else if (isUpgrade(v.equipment, 'linen_tunic')) equipGear(v, 'linen_tunic')
    } else if (isUpgrade(v.equipment, 'wool_hose')) equipGear(v, 'wool_hose')
  } else {
    if (isUpgrade(v.equipment, 'leather_jerkin')) equipGear(v, 'leather_jerkin')
    else if (isUpgrade(v.equipment, 'leather_shoes')) equipGear(v, 'leather_shoes')
  }
}

type CraftGate = (craft: GearDef['craft']) => boolean

/**
 * Pick the best craftable upgrade for this villager given climate, role, wealth, ambition.
 */
export function pickGearCraftTarget(
  v: Villager,
  opts: {
    season: Season
    cold01: number
    canCraft: CraftGate
  },
): GearId | null {
  const eq = ensureEquipment(v)
  const coins = countOf(v.inventory, 'coin')
  const gold = countOf(v.inventory, 'gold')
  const ambitionWealth = v.ambition === 'wealth' || v.ambition === 'leader'
  const guardLike = v.profession === 'guard' || v.ambition === 'protector'
  const traderLike = v.profession === 'trader'
  const weaverLike = v.profession === 'weaver'
  const smithLike = v.profession === 'blacksmith'
  const lumber = v.profession === 'lumberjack'
  const winter = opts.season === 'winter' || opts.season === 'autumn' || opts.cold01 > 0.35

  let best: GearId | null = null
  let bestScore = 0

  for (const id of Object.keys(GEAR_DEFS) as GearId[]) {
    const def = GEAR_DEFS[id]
    if (!opts.canCraft(def.craft)) continue
    if (!canAffordGear(v.inventory, id)) continue
    if (!isUpgrade(eq, id)) continue

    let score = def.tier * 4 + def.prestige * 20 + def.wealthDisplay * 12
    score += def.clo * (winter ? 55 : 12)
    score += def.protect * (guardLike ? 40 : 15)
    score += def.combat * (guardLike ? 35 : 10)
    score += def.work * 25
    score += def.carryKg * (traderLike ? 1.2 : 0.4)

    if (def.slot === 'jewelry') {
      if (!ambitionWealth && coins < 4 && gold < 1) score *= 0.35
      else score += ambitionWealth ? 18 : 6
    }
    if (def.id === 'fur_mantle' && winter) score += 30
    if (def.id === 'iron_mail' || def.id === 'iron_helm' || def.id === 'iron_sword') {
      score += guardLike ? 25 : smithLike ? 12 : 0
      if (coins < 3 && !guardLike) score *= 0.5
    }
    if (def.id === 'wood_axe' && lumber) score += 28
    if ((def.id === 'coin_purse' || def.id === 'leather_satchel') && (traderLike || ambitionWealth)) score += 22
    if ((def.id === 'linen_tunic' || def.id === 'wool_cloak') && weaverLike) score += 14
    if (def.slot === 'feet' && !eq.feet) score += 20
    if (def.slot === 'torso' && !eq.torso) score += 18
    if (def.slot === 'outer' && winter && !eq.outer) score += 24
    if (def.slot === 'mainHand' && !eq.mainHand) score += 16

    if (score > bestScore) {
      bestScore = score
      best = id
    }
  }
  return best
}

export function craftAndEquipGear(v: Villager, id: GearId): boolean {
  if (!canAffordGear(v.inventory, id)) return false
  if (!isUpgrade(ensureEquipment(v), id) && ensureEquipment(v)[GEAR_DEFS[id].slot] === id) return false
  const def = GEAR_DEFS[id]
  for (const [res, need] of Object.entries(def.recipe) as [ResourceType, number][]) {
    removeFromInventory(v.inventory, res, need)
  }
  equipGear(v, id)
  return true
}

/** Founders / wealthy roles get a minimal starter kit. */
export function seedStarterKit(v: Villager, wealth01: number, role: Profession, rng: () => number) {
  const eq = ensureEquipment(v)
  if (wealth01 > 0.15 || role !== 'none') {
    if (!eq.torso) eq.torso = wealth01 > 0.45 ? 'wool_tunic' : 'linen_tunic'
  }
  if (wealth01 > 0.25 && !eq.feet) eq.feet = 'leather_shoes'
  if (wealth01 > 0.4 && rng() < 0.55 && !eq.belt) eq.belt = 'coin_purse'
  if ((role === 'guard' || role === 'blacksmith') && wealth01 > 0.3 && !eq.mainHand) {
    eq.mainHand = role === 'guard' ? 'iron_dagger' : 'wood_axe'
  }
  if (role === 'trader' && !eq.belt) eq.belt = 'leather_satchel'
  if (role === 'weaver' && !eq.outer && wealth01 > 0.2) eq.outer = 'wool_cloak'
  syncToolTierFromEquipment(v)
}

export type PackedEquipmentSlot = {
  slot: BodySlot
  slotLabel: string
  gearId: GearId | null
  label: string | null
  hint: string | null
}

export function packEquipmentForUi(v: Villager): {
  slots: PackedEquipmentSlot[]
  effects: GearEffects
  prestige01: number
  purseCoins: number
} {
  const eq = ensureEquipment(v)
  const slots: PackedEquipmentSlot[] = BODY_SLOTS.map((slot) => {
    const id = eq[slot]
    const def = gearOf(id)
    return {
      slot,
      slotLabel: BODY_SLOT_LABELS_FR[slot],
      gearId: id,
      label: def?.labelFr ?? null,
      hint: def?.hintFr ?? null,
    }
  })
  const effects = sumEquipmentEffects(eq)
  const purseCoins =
    eq.belt === 'coin_purse' || eq.belt === 'leather_satchel' || eq.belt === 'leather_belt'
      ? countOf(v.inventory, 'coin')
      : 0
  return {
    slots,
    effects,
    prestige01: gearPrestige01(v),
    purseCoins,
  }
}
