/**
 * DF-inspired labor: soft preferences, skill→quality/speed/yield, profession drift,
 * labor satisfaction thoughts, rare masterworks.
 */
import type { Personality, Profession } from '../types'
import type {
  CraftQuality,
  LaborPref,
  LaborPreferences,
  ProceduralSkill,
  ProceduralSkills,
} from './types'

export type { CraftQuality, LaborPref, LaborPreferences }

export const LABOR_PREF_LABELS_FR: Record<LaborPref, string> = {
  woodwork: 'bois',
  fishing: 'pêche',
  farming: 'champs',
  trade: 'négoce',
  fighting: 'combat',
  crafting: 'artisanat',
  mining: 'mine',
  building: 'bâtisse',
  social: 'société',
}

export const SKILL_LABELS_FR: Record<ProceduralSkill, string> = {
  chop: 'abattre',
  build: 'bâtir',
  trade: 'marchander',
  fish: 'pêcher',
  mine: 'miner',
  craft: 'forger / coudre',
  farm: 'cultiver',
  fight: 'combattre',
  social: 'socialiser',
}

const PREF_KEYS: LaborPref[] = [
  'woodwork',
  'fishing',
  'farming',
  'trade',
  'fighting',
  'crafting',
  'mining',
  'building',
  'social',
]

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

/** Neutral-ish baseline with personality-tinted peaks (born prefs). */
export function seedLaborPreferences(p: Personality, rng: () => number): LaborPreferences {
  const noise = () => 0.22 + rng() * 0.35
  const prefs: LaborPreferences = {
    woodwork: noise(),
    fishing: noise(),
    farming: noise(),
    trade: noise(),
    fighting: noise(),
    crafting: noise(),
    mining: noise(),
    building: noise(),
    social: noise(),
  }
  // Personality tilts — soft, not destiny.
  prefs.fighting = clamp01(prefs.fighting + p.courage * 0.28 - 0.08)
  prefs.social = clamp01(prefs.social + p.sociability * 0.32 - 0.05)
  prefs.trade = clamp01(prefs.trade + (1 - p.generosity) * 0.18 + p.ambition * 0.12)
  prefs.crafting = clamp01(prefs.crafting + p.curiosity * 0.2 + p.ambition * 0.1)
  prefs.building = clamp01(prefs.building + p.ambition * 0.22)
  prefs.farming = clamp01(prefs.farming + p.generosity * 0.12 + (1 - p.curiosity) * 0.1)
  prefs.fishing = clamp01(prefs.fishing + p.curiosity * 0.15)
  prefs.woodwork = clamp01(prefs.woodwork + p.ambition * 0.1 + p.courage * 0.08)
  prefs.mining = clamp01(prefs.mining + p.courage * 0.14 + p.ambition * 0.1)
  // One strong like + one soft dislike for DF flavor.
  const liked = PREF_KEYS[Math.floor(rng() * PREF_KEYS.length)]!
  const disliked = PREF_KEYS[Math.floor(rng() * PREF_KEYS.length)]!
  prefs[liked] = clamp01(prefs[liked] + 0.28 + rng() * 0.2)
  if (disliked !== liked) prefs[disliked] = clamp01(prefs[disliked] - 0.22 - rng() * 0.15)
  return prefs
}

/** Child inherits blend of parents with mutation. */
export function inheritLaborPreferences(
  a: LaborPreferences | null,
  b: LaborPreferences | null,
  p: Personality,
  rng: () => number,
): LaborPreferences {
  if (!a && !b) return seedLaborPreferences(p, rng)
  const out = seedLaborPreferences(p, rng)
  for (const k of PREF_KEYS) {
    const va = a?.[k]
    const vb = b?.[k]
    if (va == null && vb == null) continue
    const base = va != null && vb != null ? (va + vb) * 0.5 : (va ?? vb)!
    out[k] = clamp01(base + (rng() - 0.5) * 0.18)
  }
  return out
}

export function preferenceForTask(kind: string): LaborPref | null {
  if (kind === 'gatherWood' || kind === 'clearLand') return 'woodwork'
  if (kind === 'fish' || kind === 'buildBoat') return 'fishing'
  if (kind === 'sowField' || kind === 'harvestWheat' || kind === 'grindFlour' || kind === 'bakeBread') return 'farming'
  if (kind === 'tradeRun' || kind === 'buyMaterial' || kind === 'mintCoins' || kind === 'mineGold' || kind === 'buildCart') {
    return 'trade'
  }
  if (kind === 'fight' || kind === 'confront' || kind === 'defend' || kind === 'craftSpear' || kind === 'craftStoneSpear') {
    return kind.startsWith('craft') ? 'crafting' : 'fighting'
  }
  if (
    kind === 'craftIronTool' ||
    kind === 'weaveCloth' ||
    kind === 'sewClothing' ||
    kind === 'tanHide' ||
    kind === 'buildWorkbench' ||
    kind === 'makeCharcoal'
  ) {
    return 'crafting'
  }
  if (kind === 'gatherStone' || kind === 'gatherIron' || kind === 'mineTunnel') return 'mining'
  if (kind.startsWith('build') || kind === 'clearLand') return 'building'
  if (kind === 'socialise' || kind === 'giveFood' || kind === 'entertain' || kind === 'counsel' || kind === 'teachCraft') {
    return 'social'
  }
  if (kind === 'gatherFood' || kind === 'captureSheep' || kind === 'feedPen' || kind === 'buildPen') return 'farming'
  return null
}

/** Score multiplier from labor preference (−0.35 disliked … +0.55 loved). */
export function preferenceTaskBias(prefs: LaborPreferences, kind: string): number {
  const pref = preferenceForTask(kind)
  if (!pref) return 1
  const like = prefs[pref]
  // 0 → 0.72, 0.35 → 1.0, 1 → 1.55
  return 0.72 + like * 0.83
}

/** How well current task matches preference (−1 hated … +1 loved). */
export function laborMatch(prefs: LaborPreferences, kind: string): number {
  const pref = preferenceForTask(kind)
  if (!pref) return 0
  return prefs[pref] * 2 - 1
}

/** Life drift: doing liked work reinforces; disliked work slowly hardens dislike or adapts slightly. */
export function reinforcePreference(prefs: LaborPreferences, kind: string, success: boolean): void {
  const pref = preferenceForTask(kind)
  if (!pref) return
  const like = prefs[pref]
  if (success) {
    if (like >= 0.45) prefs[pref] = clamp01(like + 0.006)
    else if (like <= 0.28) prefs[pref] = clamp01(like - 0.004) // forced labor deepens dislike
    else prefs[pref] = clamp01(like + 0.002) // mild adaptation
  }
}

export function topPreferences(prefs: LaborPreferences, n = 3): { key: LaborPref; value: number }[] {
  return PREF_KEYS.map((key) => ({ key, value: prefs[key] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, n)
}

export function bottomPreferences(prefs: LaborPreferences, n = 1): { key: LaborPref; value: number }[] {
  return PREF_KEYS.map((key) => ({ key, value: prefs[key] }))
    .sort((a, b) => a.value - b.value)
    .slice(0, n)
}

/** Profession ← skill + preference affinity (added to resource/personality scores). */
export function professionSkillPrefScore(
  skills: ProceduralSkills,
  prefs: LaborPreferences,
  job: Profession,
): number {
  const s = (sk: ProceduralSkill, w = 28) => skills[sk] * w
  const p = (pr: LaborPref, w = 22) => prefs[pr] * w
  switch (job) {
    case 'lumberjack':
      return s('chop') + p('woodwork')
    case 'fisher':
      return s('fish') + p('fishing')
    case 'farmer':
    case 'miller':
      return s('farm') + p('farming') * (job === 'miller' ? 0.7 : 1)
    case 'trader':
      return s('trade') + p('trade') + s('social', 10)
    case 'guard':
      return s('fight') + p('fighting')
    case 'builder':
      return s('build') + p('building')
    case 'mason':
      return s('mine', 18) + s('build', 14) + p('building', 12) + p('mining', 10)
    case 'miner':
      return s('mine') + p('mining')
    case 'blacksmith':
      return s('craft') + p('crafting') + s('mine', 8)
    case 'weaver':
      return s('craft', 22) + p('crafting', 18) + p('farming', 8)
    case 'herder':
      return s('farm', 12) + p('farming', 14) + p('social', 10)
    case 'forager':
      return s('farm', 10) + p('farming', 12) + p('woodwork', 8) + s('social', 6)
    default:
      return 0
  }
}

/** Best profession by skill+pref alone (for soft drift / UI). */
export function emergentProfession(skills: ProceduralSkills, prefs: LaborPreferences): Profession {
  const jobs: Profession[] = [
    'forager',
    'farmer',
    'fisher',
    'miller',
    'lumberjack',
    'mason',
    'guard',
    'builder',
    'herder',
    'trader',
    'weaver',
    'blacksmith',
    'miner',
  ]
  let best: Profession = 'forager'
  let bestScore = -Infinity
  for (const job of jobs) {
    const score = professionSkillPrefScore(skills, prefs, job)
    if (score > bestScore) {
      bestScore = score
      best = job
    }
  }
  return best
}

/** Work progress per successful labor tick — skilled hands finish faster. */
export function skillWorkDelta(skills: ProceduralSkills, kind: string, skillForTask: (k: string) => ProceduralSkill | null): number {
  const sk = skillForTask(kind)
  if (!sk) return 1
  return 0.72 + skills[sk] * 0.65
}

/** Extra yield multiplier from skill (gather/fish/farm/mine). */
export function skillYieldFactor(skills: ProceduralSkills, kind: string, skillForTask: (k: string) => ProceduralSkill | null): number {
  const sk = skillForTask(kind)
  if (!sk) return 1
  return 0.82 + skills[sk] * 0.55
}

/** Rare craft quality roll — masterwork only at high craft skill. */
export function rollCraftQuality(craftSkill: number, rng: () => number): CraftQuality {
  const s = clamp01(craftSkill)
  const roll = rng()
  // Masterwork ~2–8% above skill 0.72; fine more common.
  if (s >= 0.72 && roll < 0.02 + (s - 0.72) * 0.22) return 'masterwork'
  if (s >= 0.45 && roll < 0.08 + s * 0.18) return 'fine'
  if (s < 0.22 && roll < 0.35) return 'crude'
  return 'normal'
}

export const QUALITY_LABELS_FR: Record<CraftQuality, string> = {
  crude: 'grossier',
  normal: 'correct',
  fine: 'fin',
  masterwork: 'chef-d’œuvre',
}

/** Light rust on unused skills (optional DF flavor). */
export function rustUnusedSkills(
  skills: ProceduralSkills,
  lastSkill: ProceduralSkill | null,
  rate = 0.0012,
): void {
  const keys = Object.keys(skills) as ProceduralSkill[]
  for (const k of keys) {
    if (k === lastSkill) continue
    if (skills[k] <= 0.18) continue
    skills[k] = Math.max(0.12, skills[k] - rate)
  }
}

/** French labor thought for UI / reasons. */
export function laborThoughtFr(prefs: LaborPreferences, kind: string, success: boolean): string | null {
  const pref = preferenceForTask(kind)
  if (!pref) return null
  const like = prefs[pref]
  const label = LABOR_PREF_LABELS_FR[pref]
  if (like >= 0.62 && success) return `travail aimé (${label}) — contentement`
  if (like >= 0.55) return `œuvre préférée : ${label}`
  if (like <= 0.28 && success) return `corvée subie (${label}) — rancœur`
  if (like <= 0.32) return `travail mal aimé : ${label}`
  return null
}
