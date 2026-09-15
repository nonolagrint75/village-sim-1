/**
 * Métiers émergents — tu es ce que tu pratiques + ce que les autres te nomment.
 * Le champ Profession reste un soft hint ressources ; le titre FR dérive du mix d’activités.
 */
import { mindOf } from './cognition/mindPool'
import type {
  ActivityBucket,
  ActivityMix,
  CognitiveState,
  LaborPreferences,
  LivelihoodProfile,
  ProceduralSkill,
  ProceduralSkills,
} from './cognition/types'
import { emptyLivelihood } from './cognition/types'
import { logEvent } from './social'
import type { Profession, SimState, TaskKind, Villager } from './types'
import { countOf, edibleValue } from './inventory'
import { hasKnowledge, type KnowledgeBit } from './technology'

export type { ActivityBucket, ActivityMix, LivelihoodProfile }
export { emptyLivelihood }

/** Aligné sur politics.CHILD_AGE — évite import circulaire. */
const CHILD_AGE_SOFT = 220

export const ACTIVITY_KEYS: ActivityBucket[] = [
  'gather',
  'farm',
  'fish',
  'craft',
  'build',
  'mine',
  'trade',
  'fight',
  'teach',
  'entertain',
  'counsel',
  'ritual',
  'smuggle',
  'care',
  'social',
]

export const ACTIVITY_LABELS_FR: Record<ActivityBucket, string> = {
  gather: 'cueillette',
  farm: 'champs',
  fish: 'pêche',
  craft: 'artisanat',
  build: 'bâtisse',
  mine: 'mine',
  trade: 'négoce',
  fight: 'défense',
  teach: 'enseignement',
  entertain: 'spectacle',
  counsel: 'conseil spirituel',
  ritual: 'rituel',
  smuggle: 'trafic soft',
  care: 'soin / aumône',
  social: 'société',
}

const EMA = 0.08
const TITLE_REVIEW = 180
const UNEMPLOYED_STRESS = 0.012
export const GUILD_MIN_PRACTITIONERS = 3

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

export function ensureLivelihood(mind: CognitiveState): LivelihoodProfile {
  if (!mind.livelihood) mind.livelihood = emptyLivelihood()
  return mind.livelihood
}

/** Mappe une tâche vers un (ou deux) buckets d’activité. */
export function bucketsForTask(kind: TaskKind): ActivityBucket[] {
  switch (kind) {
    case 'gatherFood':
    case 'gatherWood':
    case 'clearLand':
      return ['gather']
    case 'sowField':
    case 'harvestWheat':
    case 'grindFlour':
    case 'bakeBread':
    case 'captureSheep':
    case 'feedPen':
    case 'buildPen':
      return ['farm']
    case 'fish':
    case 'buildBoat':
      return ['fish']
    case 'craftSpear':
    case 'craftStoneSpear':
    case 'craftIronTool':
    case 'weaveCloth':
    case 'sewClothing':
    case 'tanHide':
    case 'buildWorkbench':
    case 'experiment':
    case 'makeCharcoal':
    case 'craftGoods':
    case 'craftGear':
      return ['craft']
    case 'useMedicine':
      return ['care']
    case 'gatherStone':
    case 'gatherIron':
    case 'mineTunnel':
    case 'mineGold':
      return ['mine']
    case 'tradeRun':
    case 'buyMaterial':
    case 'mintCoins':
    case 'buildCart':
      return ['trade']
    case 'fight':
    case 'confront':
    case 'defend':
    case 'flee':
      return ['fight']
    case 'teachCraft':
      return ['teach', 'social']
    case 'entertain':
      return ['entertain', 'social']
    case 'counsel':
      return ['counsel', 'ritual']
    case 'giveFood':
      return ['care', 'social']
    case 'steal':
      return ['smuggle']
    case 'socialise':
      return ['social']
    default:
      if (kind.startsWith('build')) return ['build']
      return []
  }
}

/** Recettes de pratique → rôles ouverts (pas un job-lock médiéval figé). */
export interface RoleRecipe {
  id: string
  titleFr: string
  /** Poids idéaux du mix (somme ~1). */
  weights: Partial<Record<ActivityBucket, number>>
  /** Seuil minimum sur le bucket dominant. */
  minDominant: number
  /** Soft skills / prefs. */
  skillNeed?: ProceduralSkill
  prefNeed?: keyof LaborPreferences
  pietyMin?: number
  curiosityMin?: number
  sociabilityMin?: number
  /** Profession legacy soft bonus si alignée. */
  softProfession?: Profession
}

export const OPEN_ROLE_RECIPES: RoleRecipe[] = [
  {
    id: 'troubadour',
    titleFr: 'troubadour',
    weights: { entertain: 0.5, social: 0.25, trade: 0.1, care: 0.05 },
    minDominant: 0.22,
    skillNeed: 'social',
    sociabilityMin: 0.45,
  },
  {
    id: 'conteur',
    titleFr: 'conteur',
    weights: { entertain: 0.4, social: 0.35, teach: 0.15 },
    minDominant: 0.2,
    skillNeed: 'social',
    sociabilityMin: 0.4,
  },
  {
    id: 'gourou',
    titleFr: 'gourou',
    weights: { counsel: 0.4, ritual: 0.3, teach: 0.15, care: 0.1 },
    minDominant: 0.2,
    skillNeed: 'social',
    pietyMin: 0.55,
  },
  {
    id: 'guerisseur',
    titleFr: 'guérisseur',
    weights: { counsel: 0.35, care: 0.35, ritual: 0.15, gather: 0.1 },
    minDominant: 0.18,
    skillNeed: 'social',
    pietyMin: 0.4,
  },
  {
    id: 'guide',
    titleFr: 'guide',
    weights: { teach: 0.35, social: 0.25, gather: 0.15, trade: 0.1 },
    minDominant: 0.18,
    skillNeed: 'social',
    curiosityMin: 0.45,
  },
  {
    id: 'precepteur',
    titleFr: 'précepteur',
    weights: { teach: 0.55, social: 0.2, craft: 0.1 },
    minDominant: 0.25,
    skillNeed: 'social',
  },
  {
    id: 'contrebandier',
    titleFr: 'contrebandier',
    weights: { smuggle: 0.35, trade: 0.3, social: 0.1 },
    minDominant: 0.18,
    skillNeed: 'trade',
  },
  {
    id: 'forgeron_emerge',
    titleFr: 'forgeron',
    weights: { craft: 0.45, mine: 0.25, build: 0.1 },
    minDominant: 0.28,
    skillNeed: 'craft',
    softProfession: 'blacksmith',
  },
  {
    id: 'tisserand_emerge',
    titleFr: 'tisserand',
    weights: { craft: 0.5, farm: 0.15, trade: 0.1 },
    minDominant: 0.28,
    skillNeed: 'craft',
    softProfession: 'weaver',
  },
  {
    id: 'pecheur_emerge',
    titleFr: 'pêcheur',
    weights: { fish: 0.55, trade: 0.1, gather: 0.1 },
    minDominant: 0.3,
    skillNeed: 'fish',
    softProfession: 'fisher',
  },
  {
    id: 'fermier_emerge',
    titleFr: 'fermier',
    weights: { farm: 0.5, gather: 0.15, care: 0.05 },
    minDominant: 0.3,
    skillNeed: 'farm',
    softProfession: 'farmer',
  },
  {
    id: 'mineur_emerge',
    titleFr: 'mineur',
    weights: { mine: 0.55, craft: 0.1, build: 0.1 },
    minDominant: 0.3,
    skillNeed: 'mine',
    softProfession: 'miner',
  },
  {
    id: 'marchand_emerge',
    titleFr: 'marchand',
    weights: { trade: 0.5, social: 0.2, smuggle: 0.05 },
    minDominant: 0.28,
    skillNeed: 'trade',
    softProfession: 'trader',
  },
  {
    id: 'batisseur_emerge',
    titleFr: 'bâtisseur',
    weights: { build: 0.5, craft: 0.15, mine: 0.1 },
    minDominant: 0.28,
    skillNeed: 'build',
    softProfession: 'builder',
  },
  {
    id: 'garde_emerge',
    titleFr: 'garde',
    weights: { fight: 0.5, build: 0.1, social: 0.1 },
    minDominant: 0.28,
    skillNeed: 'fight',
    softProfession: 'guard',
  },
  {
    id: 'bucheron_emerge',
    titleFr: 'bûcheron',
    weights: { gather: 0.45, build: 0.2, craft: 0.1 },
    minDominant: 0.28,
    skillNeed: 'chop',
    softProfession: 'lumberjack',
  },
]

const PROFESSION_FALLBACK_FR: Record<Profession, string> = {
  none: 'sans métier clair',
  forager: 'cueilleur',
  farmer: 'fermier',
  fisher: 'pêcheur',
  miller: 'meunier',
  lumberjack: 'bûcheron',
  mason: 'tailleur de pierre',
  guard: 'garde',
  builder: 'bâtisseur',
  herder: 'éleveur',
  trader: 'marchand',
  weaver: 'tisserand',
  blacksmith: 'forgeron',
  miner: 'mineur',
}

function mixScore(mix: ActivityMix, weights: Partial<Record<ActivityBucket, number>>): number {
  let s = 0
  let wsum = 0
  for (const k of ACTIVITY_KEYS) {
    const w = weights[k] ?? 0
    if (w <= 0) continue
    s += mix[k] * w
    wsum += w
  }
  return wsum > 0 ? s / wsum : 0
}

function dominantBucket(mix: ActivityMix): { key: ActivityBucket; value: number } {
  let best: ActivityBucket = 'gather'
  let bestV = -1
  for (const k of ACTIVITY_KEYS) {
    if (mix[k] > bestV) {
      bestV = mix[k]
      best = k
    }
  }
  return { key: best, value: bestV }
}

function generativeTitle(mix: ActivityMix, recognition: number): string {
  const d = dominantBucket(mix)
  if (d.value < 0.12) return 'sans métier clair'
  const base = ACTIVITY_LABELS_FR[d.key]
  if (recognition > 0.55) return `maître de ${base}`
  if (d.value > 0.4) return `praticien de ${base}`
  return `amateur de ${base}`
}

function scoreRecipe(
  recipe: RoleRecipe,
  mix: ActivityMix,
  skills: ProceduralSkills,
  prefs: LaborPreferences,
  v: Villager,
  polPiety: number,
): number {
  const fit = mixScore(mix, recipe.weights)
  const domKey = (Object.entries(recipe.weights).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0]?.[0] ??
    'social') as ActivityBucket
  if (mix[domKey] < recipe.minDominant) return -1
  let s = fit * 100
  if (recipe.skillNeed) s += skills[recipe.skillNeed] * 28
  if (recipe.prefNeed) s += prefs[recipe.prefNeed] * 18
  if (recipe.pietyMin !== undefined) {
    if (polPiety < recipe.pietyMin) return -1
    s += polPiety * 20
  }
  if (recipe.curiosityMin !== undefined && v.personality.curiosity < recipe.curiosityMin) return -1
  if (recipe.sociabilityMin !== undefined && v.personality.sociability < recipe.sociabilityMin) return -1
  if (recipe.softProfession && v.profession === recipe.softProfession) s += 12
  return s
}

/** Dérive titre + roleTag depuis le mix (catalogue ouvert + fallback génératif). */
export function deriveLivelihoodTitle(
  v: Villager,
  mind: CognitiveState,
  piety = 0.4,
): { titleFr: string; roleTag: string | null } {
  const live = ensureLivelihood(mind)
  let best: RoleRecipe | null = null
  let bestScore = 12
  for (const r of OPEN_ROLE_RECIPES) {
    const s = scoreRecipe(r, live.mix, mind.skills, mind.preferences, v, piety)
    if (s > bestScore) {
      bestScore = s
      best = r
    }
  }
  if (best) return { titleFr: best.titleFr, roleTag: best.id }
  const gen = generativeTitle(live.mix, live.recognition)
  if (gen !== 'sans métier clair') return { titleFr: gen, roleTag: `gen_${dominantBucket(live.mix).key}` }
  // Soft legacy hint only when practice is thin.
  if (v.profession !== 'none') return { titleFr: PROFESSION_FALLBACK_FR[v.profession], roleTag: `legacy_${v.profession}` }
  return { titleFr: 'sans métier clair', roleTag: null }
}

/** Enregistre la pratique d’une tâche dans le mix (EMA). */
export function noteActivityPractice(v: Villager, kind: TaskKind, intensity = 1): void {
  const mind = mindOf(v)
  const live = ensureLivelihood(mind)
  const buckets = bucketsForTask(kind)
  if (buckets.length === 0) return
  const share = intensity / buckets.length
  for (const k of ACTIVITY_KEYS) {
    const target = buckets.includes(k) ? share : 0
    live.mix[k] = clamp01(live.mix[k] * (1 - EMA) + target * EMA + live.mix[k] * EMA * 0.15)
  }
  // Renormalize lightly so mix stays a soft distribution.
  let sum = 0
  for (const k of ACTIVITY_KEYS) sum += live.mix[k]
  if (sum > 1.35) {
    for (const k of ACTIVITY_KEYS) live.mix[k] /= sum
  }
}

export function notePatronage(v: Villager, amount: number): void {
  const live = ensureLivelihood(mindOf(v))
  live.patronage = clamp01(live.patronage + amount * 0.08)
  live.recognition = clamp01(live.recognition + amount * 0.05)
}

export function noteRecognition(v: Villager, amount: number): void {
  const live = ensureLivelihood(mindOf(v))
  live.recognition = clamp01(live.recognition + amount)
}

/** Soft bonus de tâche depuis le mix (overlay sur jobBonus métier). */
export function livelihoodTaskBonus(v: Villager, kind: TaskKind): number {
  const live = ensureLivelihood(mindOf(v))
  const buckets = bucketsForTask(kind)
  if (buckets.length === 0) return 1
  let m = 0
  for (const b of buckets) m += live.mix[b]
  m /= buckets.length
  // Practiced path → up to ×1.55; neglected → ~0.85
  return 0.85 + m * 1.4 + live.recognition * 0.15
}

/** Artisanat viable sans profession lock — skill / mix / soft métier. */
export function canPracticeCraft(
  v: Villager,
  craft: 'weave' | 'sew' | 'tan' | 'iron' | 'charcoal' | 'wood' | 'jewelry',
): boolean {
  const mind = mindOf(v)
  const live = ensureLivelihood(mind)
  const craftMix = live.mix.craft
  const skill = mind.skills.craft
  switch (craft) {
    case 'weave':
      return v.profession === 'weaver' || skill > 0.28 || craftMix > 0.18 || mind.preferences.crafting > 0.55
    case 'sew':
      return (
        v.profession === 'weaver' ||
        skill > 0.25 ||
        craftMix > 0.15 ||
        mind.preferences.crafting > 0.5 ||
        countOf(v.inventory, 'leather') > 0
      )
    case 'tan':
      return v.profession === 'herder' || skill > 0.22 || craftMix > 0.12 || live.mix.farm > 0.2
    case 'iron':
      return (
        v.profession === 'blacksmith' ||
        skill > 0.35 ||
        craftMix > 0.22 ||
        (hasKnowledge(v.knowledge, 'temper_iron', 0.25) && skill > 0.2)
      )
    case 'charcoal':
      return (
        hasKnowledge(v.knowledge, 'charcoal_burn', 0.22) ||
        hasKnowledge(v.knowledge, 'heat_wood', 0.35) ||
        (craftMix > 0.2 && mind.skills.craft > 0.3)
      )
    case 'wood':
      return (
        v.profession === 'lumberjack' ||
        v.profession === 'builder' ||
        skill > 0.15 ||
        craftMix > 0.1 ||
        mind.preferences.crafting > 0.4 ||
        v.toolTier === 'none'
      )
    case 'jewelry':
      return (
        v.profession === 'blacksmith' ||
        v.ambition === 'wealth' ||
        v.ambition === 'leader' ||
        skill > 0.32 ||
        countOf(v.inventory, 'gold') > 0 ||
        countOf(v.inventory, 'silver') > 0 ||
        countOf(v.inventory, 'copper') > 0
      )
  }
}

/** Coût fer réduit si charbon / trempe connus (perso ou village). */
export function ironToolCostFor(v: Villager, base: number, villageKnowledge?: KnowledgeBit[]): number {
  let c = base
  if (hasKnowledge(v.knowledge, 'charcoal_burn', 0.28) || hasKnowledge(villageKnowledge, 'charcoal_burn', 0.32)) c -= 1
  if (hasKnowledge(v.knowledge, 'temper_iron', 0.3) || hasKnowledge(villageKnowledge, 'temper_iron', 0.35)) c -= 1
  return Math.max(2, c)
}

export function isServiceLivelihood(roleTag: string | null): boolean {
  if (!roleTag) return false
  return (
    roleTag === 'troubadour' ||
    roleTag === 'conteur' ||
    roleTag === 'gourou' ||
    roleTag === 'guerisseur' ||
    roleTag === 'guide' ||
    roleTag === 'precepteur'
  )
}

/**
 * Revue périodique du titre + chômage soft + stress SoL.
 * LOD : stagger par id.
 */
export function tickLivelihood(state: SimState, v: Villager, piety = 0.4, guildCircleId: number | null = null): void {
  if (v.age < CHILD_AGE_SOFT * 0.6) return
  if ((state.tick + v.id * 13) % 11 !== 0) return

  const mind = mindOf(v)
  const live = ensureLivelihood(mind)
  live.guildCircleId = guildCircleId

  const productive =
    dominantBucket(live.mix).value >= 0.14 ||
    live.patronage > 0.2 ||
    (v.task !== null && bucketsForTask(v.task.kind).length > 0)

  if (!productive && (v.task === null || v.task.kind === 'idle' || v.task.kind === 'rest')) {
    live.unemployedStreak++
  } else {
    live.unemployedStreak = Math.max(0, live.unemployedStreak - 2)
  }

  // Unemployment → stress émotionnel + besoin de purpose.
  if (live.unemployedStreak > 40) {
    mind.emotions.stress = clamp01(mind.emotions.stress + UNEMPLOYED_STRESS)
    mind.needs.purpose = clamp01(mind.needs.purpose + 0.02)
    mind.needs.status = clamp01(mind.needs.status + 0.015)
    live.recognition *= 0.995
    live.patronage *= 0.99
  }

  // Drift: abandonner le label métier legacy si la pratique dit autre chose.
  if ((state.tick + v.id * 17) % TITLE_REVIEW === 0) {
    const prev = live.titleFr
    const next = deriveLivelihoodTitle(v, mind, Math.max(piety, mind.needs.piety))
    live.titleFr = next.titleFr
    live.roleTag = next.roleTag
    live.lastTitleTick = state.tick

    // Soft: si rôle service fort, profession devient hint faible (none) pour ne pas verrouiller.
    if (isServiceLivelihood(next.roleTag) && live.mix.entertain + live.mix.counsel + live.mix.teach > 0.35) {
      if (v.profession !== 'none' && v.personality.curiosity > 0.4) {
        const old = v.profession
        v.profession = 'none'
        logEvent(state, `${v.name} quitte le métier de ${PROFESSION_FALLBACK_FR[old]} pour vivre en ${next.titleFr}`)
      }
    }

    if (prev !== next.titleFr && prev !== 'sans métier clair') {
      logEvent(state, `${v.name} est désormais connu comme ${next.titleFr}`)
    } else if (prev !== next.titleFr && next.titleFr !== 'sans métier clair') {
      logEvent(state, `${v.name} se forge une réputation de ${next.titleFr}`)
    }
  }
}

/** Top activités pour l’UI. */
export function topActivitiesFr(live: LivelihoodProfile, n = 3): string[] {
  return ACTIVITY_KEYS.map((k) => ({ k, v: live.mix[k] }))
    .filter((x) => x.v > 0.08)
    .sort((a, b) => b.v - a.v)
    .slice(0, n)
    .map((x) => `${ACTIVITY_LABELS_FR[x.k]} ${Math.round(x.v * 100)}%`)
}

/** Urge de services (spectacle / conseil / enseignement) si temps + skill + demande sociale. */
export function serviceUrge(
  state: SimState,
  v: Villager,
  piety = 0.4,
  creedPiete = false,
  isElder = false,
): { entertain: number; counsel: number; teach: number } {
  const mind = mindOf(v)
  const live = ensureLivelihood(mind)
  const fed = v.hunger > 1.4 || edibleValue(v.inventory) > 1 || live.patronage > 0.25
  const surplusTime = fed && v.stamina > 2 ? 1 : 0.35
  const socialSkill = mind.skills.social
  const bored = mind.needs.boredom
  const pietyNeed = piety + mind.needs.piety

  let audience = 0
  for (const o of state.villagers) {
    if (!o.alive || o.id === v.id) continue
    const dx = o.x - v.x
    const dy = o.y - v.y
    if (dx * dx + dy * dy > 100) continue
    audience++
    if (audience >= 6) break
  }

  const entertain =
    (18 +
      v.personality.sociability * 40 +
      socialSkill * 35 +
      bored * 25 +
      live.mix.entertain * 40 +
      audience * 8 +
      live.recognition * 20) *
    surplusTime *
    (v.ambition === 'leader' || v.ambition === 'explorer' ? 1.2 : 1)

  const counsel =
    (12 +
      pietyNeed * 45 +
      socialSkill * 25 +
      live.mix.counsel * 45 +
      live.mix.ritual * 20 +
      v.personality.generosity * 20 +
      audience * 5) *
    surplusTime *
    (creedPiete ? 1.35 : 1)

  const youthNear = audience > 0
  const teach =
    (10 +
      socialSkill * 30 +
      mind.skills.craft * 15 +
      live.mix.teach * 50 +
      v.personality.curiosity * 20 +
      (youthNear ? 15 : 0) +
      (isElder ? 20 : 0)) *
    surplusTime

  return { entertain, counsel, teach }
}

export function livelihoodLabelForUi(v: Villager): string {
  const live = ensureLivelihood(mindOf(v))
  if (live.titleFr && live.titleFr !== 'sans métier clair') return live.titleFr
  return PROFESSION_FALLBACK_FR[v.profession] ?? 'sans métier'
}
