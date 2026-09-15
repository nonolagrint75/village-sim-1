import type { Personality, Profession, SimState, Villager } from './types'

export type SurnameOrigin = 'ancestor' | 'craft' | 'place' | 'nickname' | 'merged' | 'founder'
export type TraditionTag = string

function seededValue(seed: number, salt: number): number {
  let s = (seed ^ salt) >>> 0
  s ^= s << 13
  s ^= s >>> 17
  s ^= s << 5
  s >>>= 0
  return s / 4294967296
}

export function generatePersonality(seed: number): Personality {
  return {
    courage: seededValue(seed, 0x9e3779b1),
    sociability: seededValue(seed, 0x85ebca6b),
    ambition: seededValue(seed, 0xc2b2ae35),
    generosity: seededValue(seed, 0x27d4eb2f),
    curiosity: seededValue(seed, 0x165667b1),
  }
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

export function inheritPersonality(a: Personality, b: Personality, rng: () => number): Personality {
  const inheritTrait = (ta: number, tb: number): number => {
    if (rng() < 0.15) return rng()
    const blend = (ta + tb) / 2
    const drift = (rng() - 0.5) * 0.1
    return clamp01(blend + drift)
  }
  return {
    courage: inheritTrait(a.courage, b.courage),
    sociability: inheritTrait(a.sociability, b.sociability),
    ambition: inheritTrait(a.ambition, b.ambition),
    generosity: inheritTrait(a.generosity, b.generosity),
    curiosity: inheritTrait(a.curiosity, b.curiosity),
  }
}

const SYL_A = ['Ka', 'Mo', 'Ri', 'Ta', 'Bel', 'Or', 'Fen', 'Wyl', 'Sa', 'Dro', 'El', 'Bra', 'Ny', 'Us', 'Gar', 'Iv']
const SYL_B = ['ren', 'dan', 'lya', 'vic', 'mir', 'tho', 'sen', 'ora', 'wen', 'dric', 'ana', 'lin', 'gor', 'eth', 'ild', 'os']

/** Given name (prénom) — kept as `Villager.name` for UI compatibility. */
export function generateGivenName(seed: number): string {
  const a = SYL_A[Math.floor(seededValue(seed, 0x1) * SYL_A.length)]
  const b = SYL_B[Math.floor(seededValue(seed, 0x2) * SYL_B.length)]
  return a + b
}

/** @deprecated Prefer generateGivenName — same syllables, given name only. */
export function generateName(seed: number): string {
  return generateGivenName(seed)
}

const CRAFT_SURNAMES: Partial<Record<Profession, string[]>> = {
  forager: ['Cueille', 'Buisson'],
  farmer: ['Champel', 'Terrien'],
  fisher: ['Rivage', 'Pecheur'],
  miller: ['Meunier', 'Farine'],
  lumberjack: ['Buisson', 'Chene'],
  mason: ['Pierre', 'Carreau'],
  guard: ['Garde', 'Haubert'],
  builder: ['Charpent', 'Muraille'],
  herder: ['Berger', 'Troupeau'],
  trader: ['Marche', 'Colport'],
  weaver: ['Toile', 'Filasse'],
  blacksmith: ['Forgeron', 'Marteau'],
  miner: ['Minerai', 'Galerie'],
}

const PLACE_SUFFIX = ['val', 'mont', 'bois', 'clair', 'ford', 'beck']
const NICK_SUFFIX = ['lepreux', 'lefort', 'lebrun', 'clair', 'roux', 'hardy']

function capitalize(s: string): string {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

function fromAncestorName(given: string, rng: () => number): string {
  const stem = given.length > 4 ? given.slice(0, 4) : given
  const modes = [`${stem}son`, `${stem}eau`, `de${stem}`, `${stem}el`]
  return capitalize(modes[Math.floor(rng() * modes.length)])
}

function fromCraft(profession: Profession, rng: () => number): string | null {
  const list = CRAFT_SURNAMES[profession]
  if (!list || list.length === 0) return null
  return list[Math.floor(rng() * list.length)]
}

function fromPlace(villageId: number | null, x: number, y: number, rng: () => number): string {
  const sector =
    villageId !== null
      ? `V${villageId}`
      : `${Math.floor(x / 40)}${Math.floor(y / 40)}`
  const suf = PLACE_SUFFIX[Math.floor(rng() * PLACE_SUFFIX.length)]
  return capitalize(`${suf}${sector}`.replace(/[^a-zA-Z]/g, '').slice(0, 10) || `Val${suf}`)
}

function fromNickname(p: Personality, rng: () => number): { surname: string; tag: TraditionTag } {
  let trait: keyof Personality = 'courage'
  let best = -1
  for (const k of Object.keys(p) as (keyof Personality)[]) {
    if (p[k] > best) {
      best = p[k]
      trait = k
    }
  }
  const nick =
    trait === 'courage'
      ? 'lefort'
      : trait === 'sociability'
        ? 'lebon'
        : trait === 'ambition'
          ? 'haut'
          : trait === 'generosity'
            ? 'donneur'
            : 'errant'
  const suf = NICK_SUFFIX[Math.floor(rng() * NICK_SUFFIX.length)]
  return { surname: capitalize(rng() < 0.5 ? nick : suf), tag: `nick:${trait}` }
}

/** Founding surnames: emergent from given name / soft place / nickname — not a fixed noble list. */
export function generateFounderSurname(seed: number, givenName: string, rng: () => number): string {
  const roll = seededValue(seed, 0x51)
  if (roll < 0.45) return fromAncestorName(givenName, rng)
  if (roll < 0.7) return fromPlace(null, seededValue(seed, 0x11) * 1000, seededValue(seed, 0x22) * 1000, rng)
  return fromNickname(
    {
      courage: seededValue(seed, 0x31),
      sociability: seededValue(seed, 0x32),
      ambition: seededValue(seed, 0x33),
      generosity: seededValue(seed, 0x34),
      curiosity: seededValue(seed, 0x35),
    },
    rng,
  ).surname
}

export type ChildSurnameResult = {
  surname: string
  origin: SurnameOrigin
  evolved: boolean
  tradition?: TraditionTag
}

/**
 * Child surname: usually a parent line; sometimes craft / place / nickname evolution
 * (migration or time pressure via rng + parent village mismatch).
 */
export function formChildSurname(
  parentA: Villager,
  parentB: Villager | null,
  state: SimState,
  rng: () => number,
): ChildSurnameResult {
  const migrated =
    parentB !== null &&
    parentA.villageId !== null &&
    parentB.villageId !== null &&
    parentA.villageId !== parentB.villageId

  const roll = rng()
  // Rare emergent renaming
  if (roll < 0.08 || (migrated && roll < 0.22)) {
    const craftParent =
      parentA.profession !== 'none' ? parentA : parentB && parentB.profession !== 'none' ? parentB : null
    if (craftParent && rng() < 0.45) {
      const s = fromCraft(craftParent.profession, rng)
      if (s) return { surname: s, origin: 'craft', evolved: true, tradition: `craft:${craftParent.profession}` }
    }
    if (migrated || rng() < 0.4) {
      const anchor = parentA
      const s = fromPlace(anchor.villageId, anchor.x, anchor.y, rng)
      return { surname: s, origin: 'place', evolved: true, tradition: `place:${anchor.villageId ?? 'errance'}` }
    }
    const nick = fromNickname(parentA.personality, rng)
    return { surname: nick.surname, origin: 'nickname', evolved: true, tradition: nick.tag }
  }

  // Inherit: prefer shared surname, else higher-rep / random parent
  if (parentB && parentA.surname && parentA.surname === parentB.surname) {
    return { surname: parentA.surname, origin: 'ancestor', evolved: false }
  }
  if (parentB && parentA.surname && parentB.surname) {
    const pick = rng() < 0.5 ? parentA.surname : parentB.surname
    return { surname: pick, origin: 'ancestor', evolved: false }
  }
  if (parentA.surname) return { surname: parentA.surname, origin: 'ancestor', evolved: false }
  if (parentB?.surname) return { surname: parentB.surname, origin: 'ancestor', evolved: false }

  // Fallback: derive from ancestor given name
  const stem = fromAncestorName(parentA.name, rng)
  return { surname: stem, origin: 'ancestor', evolved: true }
}
