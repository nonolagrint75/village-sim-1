/**
 * Village-level career demand â€” macro pressure on assignProfession scores.
 * Derived from surplus, famine, threat, and standard of living (SoL).
 * No unlock trees: jobs appear when conditions + willing capable people align.
 *
 * Wire-up: behaviors.assignProfession (see CAREER_DEMAND_NOTES.md / DYNAMIC_CAREERS.md).
 *
 * WP5 mÃ©tier writer policy (ONE policy â€” do not dual-write):
 * - Primary: computeCareerDemand â†’ applyCareerDemandToScores â†’ assignProfession â†’ applyProfessionChange
 * - Secondary (dampened): livelihood softProfession practice â†’ applyProfessionChange (foodNeed gate)
 * - laborBalance (commerce) stays attractiveness / migration / polity soft only â€” NOT folded into demand
 */
import { priceOf, villageSecurity } from './commerce'
import { noteProfessionChange } from './attributionMetrics'
import { notePriceProfessionShift } from './causalityMetrics'
import type { ProfessionFactorHit } from './professionFactors'
import { mindOf } from './cognition/mindPool'
import { feelFamine } from './ecology'
import { demandFromVillager, topDemand, type DemandTag } from './economy/needsDemand'
import { farmerLockedToField, releaseFieldClaim, shouldReleaseField, tryHandoffField } from './fields'
import { BASE_PRICES } from './resources'
import { logEvent } from './social'
import type { Profession, SimState, Village, Villager } from './types'
import { distance } from './world'

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

/** Normalized 0-1 demand buckets used to nudge profession scores. */
export interface CareerDemandVector {
  foodNeed: number
  forgeNeed: number
  tradeNeed: number
  guardNeed: number
  cultureNeed: number
  /** Cloth/wool price scarcity â†’ herders + weavers. */
  textileNeed: number
}

function villageFoodPerCapita(village: Village): number {
  const pop = Math.max(1, village.memberIds.length)
  const stores =
    (village.surplus.food ?? 0) +
    (village.surplus.bread ?? 0) +
    (village.surplus.wheat ?? 0) * 0.45 +
    (village.surplus.flour ?? 0) * 0.55
  return stores / pop
}

function nearbyThreat01(state: SimState, village: Village): number {
  let wolves = 0
  let bandits = 0
  for (const w of state.wolves) {
    if (w.alive && distance(w.x, w.y, village.centerX, village.centerY) < 40) wolves++
  }
  for (const b of state.bandits ?? []) {
    if (b.alive && distance(b.x, b.y, village.centerX, village.centerY) < 40) bandits++
  }
  return clamp01(wolves * 0.14 + bandits * 0.18)
}

/** Minimal demand vector from village economy + safety + SoL. */
export function computeCareerDemand(state: SimState, village: Village | null | undefined): CareerDemandVector {
  if (!village || village.memberIds.length === 0) {
    return { foodNeed: 0.45, forgeNeed: 0.3, tradeNeed: 0.2, guardNeed: 0.35, cultureNeed: 0.15, textileNeed: 0.12 }
  }

  const perCapFood = villageFoodPerCapita(village)
  const famine = feelFamine(state, village)
  const sol = village.standardOfLiving ?? 0.35
  const security = village.security ?? villageSecurity(state, village)

  let foodNeed = clamp01(0.62 - perCapFood * 0.42)
  if (perCapFood < 0) foodNeed = clamp01(foodNeed + Math.min(0.35, -perCapFood * 0.25))
  if (famine) foodNeed = clamp01(Math.max(foodNeed, 0.75))
  // WP7 causal wire: live food-basket scarcity â†’ food careers (foodâ†’priceâ†’job).
  // Soft nudge only â€” does not bypass farmer lock / handoff / WP5 foodNeed damp.
  {
    const ratio = (res: 'wheat' | 'flour' | 'bread' | 'food') => {
      const base = BASE_PRICES[res] ?? 3
      const live = priceOf(res, state)
      return base > 0 && live > 0 ? live / base : 1
    }
    const scarcity = (ratio('wheat') + ratio('flour') + ratio('bread') + ratio('food')) / 4
    const pricePull = clamp01((scarcity - 1) * 0.55)
    foodNeed = clamp01(foodNeed + pricePull * 0.22)
  }

  const iron = village.surplus.iron ?? 0
  const wood = village.surplus.wood ?? 0
  const stone = village.surplus.stone ?? 0
  const pop = Math.max(1, village.memberIds.length)
  const dev = (village.development ?? 0) / 18
  let forgeNeed = clamp01(0.35 - iron * 0.18 - wood * 0.06 + dev * 0.35)
  if (village.hasMine && iron < 0.6) forgeNeed = clamp01(forgeNeed + 0.22)
  // mines_ore forge_demand: sticky mouths near village also pull smiths
  if (!village.hasMine && (state.knownMineMouths ?? []).some((m) => Math.abs(m.x - village.centerX) + Math.abs(m.y - village.centerY) <= 14)) {
    forgeNeed = clamp01(forgeNeed + 0.14)
  }
  if (stone < 0 && pop >= 6) forgeNeed = clamp01(forgeNeed + 0.12)

  let tradeNeed =
    0.12 +
    (village.hasPort ? 0.22 : 0) +
    (village.hasMarket ? 0.18 : 0) +
    Math.min(0.2, (village.tradeRuns ?? 0) * 0.04) +
    Math.max(0, (village.prosperity ?? 0) - 40) * 0.004 +
    Math.max(0, sol - 0.42) * 0.35
  // Famine kills luxury caravans, but keep a floor so food-relief traders can crystallize.
  if (famine) tradeNeed = Math.max(tradeNeed * 0.35, 0.2)
  tradeNeed = clamp01(tradeNeed)

  let guardNeed = clamp01(1 - security + nearbyThreat01(state, village) * 0.55)
  if ((village.recentDeaths ?? 0) > 0) guardNeed = clamp01(guardNeed + 0.12)
  if ((village.recentThefts ?? 0) > 0) guardNeed = clamp01(guardNeed + 0.1)

  let cultureNeed = clamp01((sol - 0.38) * 1.35)
  if (village.hasShrine || (village.shrineRiteCount ?? 0) > 0) cultureNeed = clamp01(cultureNeed + 0.14)
  if ((village.peaceTicks ?? 0) > 8) cultureNeed = clamp01(cultureNeed + 0.08)
  // Food surplus (not famine) opens specialization / culture pressure.
  if (!famine && perCapFood > 0.9) {
    cultureNeed = clamp01(cultureNeed + Math.min(0.22, (perCapFood - 0.9) * 0.28))
  }
  if (famine || sol < 0.28) cultureNeed = 0

  // Cloth / wool scarcity â†’ herders + weavers (textile demand, not a day script).
  let textileNeed = 0.08
  {
    const clothBase = BASE_PRICES.cloth ?? 5
    const woolBase = BASE_PRICES.wool ?? 3
    const clothLive = priceOf('cloth', state)
    const woolLive = priceOf('wool', state)
    const clothPull = clothBase > 0 ? clamp01((clothLive / clothBase - 1) * 0.7) : 0
    const woolPull = woolBase > 0 ? clamp01((woolLive / woolBase - 1) * 0.7) : 0
    textileNeed = clamp01(0.08 + Math.max(clothPull, woolPull) * 0.85)
    const woolSurplus = village.surplus.wool ?? 0
    const clothSurplus = village.surplus.cloth ?? 0
    if (woolSurplus < 0.3 && clothSurplus < 0.4) textileNeed = clamp01(textileNeed + 0.12)
    if ((village.surplus.cloth ?? 0) > 2) textileNeed = clamp01(textileNeed * 0.7)
    // Live sheep near village â†’ herding opportunity (faunaâ†’mÃ©tier).
    let sheepNear = 0
    for (const s of state.sheep ?? []) {
      if (!s.alive) continue
      if (distance(s.x, s.y, village.centerX, village.centerY) < 48) sheepNear++
    }
    if (sheepNear >= 4) textileNeed = clamp01(textileNeed + 0.22 + Math.min(0.2, sheepNear * 0.015))
    // Causal S9: many sheep + zero herders â†’ strong herding pressure (faunaâ†’mÃ©tier).
    let herdersHere = 0
    let weaversHere = 0
    for (const o of state.villagers) {
      if (!o.alive || o.villageId !== village.id) continue
      if (o.profession === 'herder') herdersHere++
      if (o.profession === 'weaver') weaversHere++
    }
    if (sheepNear >= 6 && herdersHere === 0) textileNeed = clamp01(textileNeed + 0.38)
    if (sheepNear >= 10 && herdersHere <= 1) textileNeed = clamp01(textileNeed + 0.18)
    // Causal S10: wool/cloth opportunity without weavers.
    if ((woolSurplus >= 0.5 || sheepNear >= 8) && weaversHere === 0) {
      textileNeed = clamp01(textileNeed + 0.32)
    }
  }

  // Mine without smiths â†’ forge career pressure.
  if (village.hasMine) {
    forgeNeed = clamp01(forgeNeed + 0.18)
  }

  return { foodNeed, forgeNeed, tradeNeed, guardNeed, cultureNeed, textileNeed }
}

const FOOD_SCALE = 46
const FORGE_SCALE = 40
const TRADE_SCALE = 36
const GUARD_SCALE = 42
const CULTURE_SCALE = 30

export function applyCareerDemandToScores(scores: Record<Profession, number>, demand: CareerDemandVector): void {
  const food = demand.foodNeed * FOOD_SCALE
  scores.farmer += food
  scores.forager += food * 0.42
  scores.fisher += food * 0.32
  scores.herder += food * 0.38
  scores.miller += food * 0.52

  const forge = demand.forgeNeed * FORGE_SCALE
  scores.blacksmith += forge
  scores.miner += forge * 0.72
  scores.lumberjack += forge * 0.38
  scores.mason += forge * 0.32

  scores.trader += demand.tradeNeed * TRADE_SCALE
  scores.guard += demand.guardNeed * GUARD_SCALE

  const culture = demand.cultureNeed * CULTURE_SCALE
  scores.weaver += culture * 0.68
  scores.builder += culture * 0.5
  scores.mason += culture * 0.22

  const textile = demand.textileNeed * 52
  scores.herder += textile * 1.15
  scores.weaver += textile * 1.25
  // Sheep present + thin wool stores â†’ stronger herder pull (causal faunaâ†’job).
  if (demand.textileNeed > 0.2) {
    scores.herder += 28
    scores.weaver += 22
  }
  if (demand.textileNeed > 0.45) {
    scores.herder += 36
    scores.weaver += 40
  }
}

/** Soft scale for personal mind/body demand â†’ mÃ©tier nudge (below village FOOD_SCALE). */
const PERSONAL_DEMAND_SCALE = 18

/**
 * Personal demand â†’ profession score nudge (demandâ†’mÃ©tier mobility link).
 * Uses economy.demandFromVillager / topDemand â€” DATA already exists; this only
 * mutates the score map. Does NOT call applyProfessionChange.
 *
 * INTEGRATION: call after applyCareerDemandToScores inside professionFactors /
 * behaviors.assignProfession stack (same place village demand is applied).
 * Until wired there, softProfession (livelihood) remains the only personal path.
 */
export function applyPersonalDemandNudge(
  scores: Record<Profession, number>,
  v: Villager,
): DemandTag | null {
  const urgency = demandFromVillager(v)
  const tag = topDemand(urgency, 0.32)
  if (!tag) return null
  const u = urgency[tag]
  const s = PERSONAL_DEMAND_SCALE * u
  switch (tag) {
    case 'food':
      scores.farmer += s
      scores.forager += s * 0.4
      scores.fisher += s * 0.3
      scores.herder += s * 0.35
      scores.miller += s * 0.45
      break
    case 'tools':
      scores.blacksmith += s
      scores.miner += s * 0.65
      scores.mason += s * 0.35
      break
    case 'clothing':
      scores.weaver += s
      scores.herder += s * 0.25
      break
    case 'shelter':
      scores.builder += s
      scores.mason += s * 0.45
      scores.lumberjack += s * 0.3
      break
    case 'fuel':
      scores.lumberjack += s
      scores.forager += s * 0.2
      break
    case 'medicine':
      // No dedicated healer mÃ©tier â€” light care/craft pull only.
      scores.weaver += s * 0.25
      scores.forager += s * 0.35
      break
    case 'social':
    case 'luxury':
      scores.trader += s * 0.55
      scores.weaver += s * 0.35
      break
    default:
      break
  }
  return tag
}

export function careerDemandForProfession(demand: CareerDemandVector, profession: Profession): number {
  switch (profession) {
    case 'farmer':
    case 'forager':
    case 'fisher':
    case 'miller':
      return demand.foodNeed
    case 'herder':
      return Math.max(demand.foodNeed, demand.textileNeed * 0.9)
    case 'blacksmith':
    case 'miner':
    case 'lumberjack':
      return demand.forgeNeed
    case 'weaver':
      return Math.max(demand.cultureNeed, demand.textileNeed)
    case 'trader':
      return demand.tradeNeed
    case 'guard':
      return demand.guardNeed
    case 'builder':
    case 'mason':
      return demand.cultureNeed
    default:
      return 0
  }
}

export const PROFESSION_LABEL_FR: Record<Profession, string> = {
  none: 'sans mÃ©tier',
  forager: 'cueilleur',
  farmer: 'fermier',
  miller: 'meunier',
  lumberjack: 'bÃ»cheron',
  mason: 'tailleur de pierre',
  guard: 'garde',
  builder: 'bÃ¢tisseur',
  herder: 'Ã©leveur',
  trader: 'marchand',
  fisher: 'pÃªcheur',
  weaver: 'tisserand',
  blacksmith: 'forgeron',
  miner: 'mineur',
}

/**
 * Sacred cultural overlays â€” livelihood title may diverge from mÃ©tier (pretre/gourou).
 * Profession still owns jobBonus / field claim; UI may show the sacred title.
 */
export function isCulturalTitleOverlay(roleTag: string | null | undefined): boolean {
  return roleTag === 'pretre' || roleTag === 'gourou'
}

/** Sync livelihood soft title/roleTag from authoritative profession (skip cultural overlay). */
function syncLivelihoodFromProfession(v: Villager, next: Profession, tick: number): void {
  try {
    const live = mindOf(v).livelihood
    if (!live) return
    live.lastCareerChangeTick = tick
    if (isCulturalTitleOverlay(live.roleTag)) return
    if (next === 'none') {
      if (!live.roleTag || live.roleTag.startsWith('legacy_') || live.titleFr === 'sans mÃ©tier clair') {
        live.titleFr = 'sans mÃ©tier clair'
        live.roleTag = null
      }
      return
    }
    live.titleFr = PROFESSION_LABEL_FR[next] ?? next
    live.roleTag = `legacy_${next}`
  } catch {
    /* mind cold */
  }
}

/**
 * Apply a mÃ©tier change: French log + release personal field when leaving farmer
 * (fields.ts shouldReleaseField â€” only farmers keep plots) + sync livelihood soft title.
 */
export function applyProfessionChange(
  state: SimState,
  v: Villager,
  next: Profession,
  opts?: {
    quiet?: boolean
    factors?: ProfessionFactorHit[]
    foodNeed?: number
    source?: string
  },
): boolean {
  const prev = v.profession
  if (next === prev) return false
  // Causal: career churn orphaned sown wheat (tickFields only grew owned field radii).
  // Stay farmer while holding a farmable plot unless another villager takes it â€”
  // except sheep/textile pressure with food stores (herder/weaver emergence).
  if (prev === 'farmer' && next !== 'farmer' && farmerLockedToField(state, v)) {
    const textileExit =
      (next === 'herder' || next === 'weaver') &&
      (() => {
        let sheepNear = 0
        const ox = v.homeX >= 0 ? v.homeX : v.x
        const oy = v.homeY >= 0 ? v.homeY : v.y
        const vg = v.villageId != null ? state.villages.find((g) => g.id === v.villageId) : undefined
        const cx = vg?.centerX ?? ox
        const cy = vg?.centerY ?? oy
        for (const s of state.sheep ?? []) {
          if (!s.alive) continue
          if (distance(s.x, s.y, ox, oy) < 56 || distance(s.x, s.y, cx, cy) < 56) sheepNear++
        }
        const foodOk =
          (vg?.surplus?.food ?? 0) + (vg?.surplus?.bread ?? 0) + (vg?.surplus?.wheat ?? 0) > 0.15 ||
          (vg?.memberIds.length ?? 0) >= 2 ||
          !state.famine
        return sheepNear >= 3 && foodOk
      })()
    const mineExit =
      next === 'miner' &&
      (() => {
        const vg = v.villageId != null ? state.villages.find((g) => g.id === v.villageId) : undefined
        return !!(vg?.hasMine || (state.knownMineMouths ?? []).some((m) => {
          const ox = v.homeX >= 0 ? v.homeX : v.x
          const oy = v.homeY >= 0 ? v.homeY : v.y
          return Math.abs(m.x - (vg?.centerX ?? ox)) + Math.abs(m.y - (vg?.centerY ?? oy)) <= 18
        }))
      })()
    const forgeExit =
      next === 'blacksmith' &&
      (() => {
        const vg = v.villageId != null ? state.villages.find((g) => g.id === v.villageId) : undefined
        const nearMine =
          !!(vg?.hasMine ||
            (state.knownMineMouths ?? []).some((m) => {
              const ox = v.homeX >= 0 ? v.homeX : v.x
              const oy = v.homeY >= 0 ? v.homeY : v.y
              return Math.abs(m.x - (vg?.centerX ?? ox)) + Math.abs(m.y - (vg?.centerY ?? oy)) <= 28
            }))
        let minersNear = 0
        for (const o of state.villagers) {
          if (!o.alive || o.profession !== 'miner') continue
          if (vg && o.villageId === vg.id) minersNear++
        }
        return nearMine || minersNear > 0 || (vg?.surplus?.iron ?? 0) > 0.2 || (vg?.surplus?.ore ?? 0) > 0.2
      })()
    if (!textileExit && !mineExit && !forgeExit && !tryHandoffField(state, v)) return false
  }
  v.profession = next
  {
    const scarce = (['wheat', 'flour', 'bread', 'food'] as const).some((res) => {
      const base = BASE_PRICES[res] ?? 3
      const live = priceOf(res, state)
      return base > 0 && live / base > 1.15
    })
    if (scarce) notePriceProfessionShift(state, v.id, prev, next)
  }
  // DP5: explainability telemetry only ? does not alter scores / locks / handoff.
  noteProfessionChange(state, {
    villagerId: v.id,
    prev,
    next,
    factors: opts?.factors ?? [],
    foodNeed: opts?.foodNeed,
    source: opts?.source,
  })
  syncLivelihoodFromProfession(v, next, state.tick)
  if (shouldReleaseField(v)) {
    releaseFieldClaim(state, v)
  }
  if (!opts?.quiet) {
    if (next === 'none' && prev !== 'none') {
      logEvent(state, `${v.name} abandonne le mÃ©tier de ${PROFESSION_LABEL_FR[prev] ?? prev}`)
    } else if (next !== 'none') {
      logEvent(state, `${v.name} devient ${PROFESSION_LABEL_FR[next] ?? next}`)
    }
  }
  return true
}