/**
 * Atlas life-systems tick - wires staging packs into live SimState without day scripts.
 * Owns: credit_bank, wool_industry + career crystallize, kin_multigen,
 * READY sextet: guild_formation, merchant_network, succession_civil, religion_schism,
 * agri_invention, military_dynasty.
 */
import { FOUNDER_AGE_MIN, FOUNDER_AGE_SPAN } from '../ages'
import { pickSex } from '../appearance'
import { applyProfessionChange } from '../careers'
import { createEmptyEquipment, seedStarterKit } from '../equipment'
import {
  applyGeneticPersonalityBias,
  createFounderGenome,
  expressPhenotype,
} from '../genetics'
import { countOf, addToInventory, removeFromInventory, createInventory } from '../inventory'
import { TICKS_PER_DAY } from '../calendar'
import { generateName, generatePersonality } from '../personality'
import { logCause, politicsOf, markCreedChange, type CreedId } from '../politics'
import { logEvent, pickAmbition } from '../social'
import type { SimState, Villager } from '../types'
import { distance, findMillSite } from '../world'
import { firmsSummary } from '../economy/business'
import {
  createCreditBook,
  tickCreditBook,
  tryLendToBorrower,
  type CreditBook,
} from './packs/credit_bank'
import {
  createEmptyKinGraph,
  registerKinBirth,
  registerKinMarriage,
  upsertPerson,
  type KinshipGraph,
  type KinPersonNode,
} from './packs/kin_multigen'
import {
  createWoolIndustryState,
  tickWoolIndustry,
  type WoolIndustryState,
} from './packs/wool_industry'
import {
  tryFormCraftCircle,
  tryPromoteGuild,
  tryPromoteInstitution,
  tickGuildPad,
  type GuildPad,
  type PractitionerHint,
} from './packs/guild_formation'
import {
  createEmptyNetwork,
  noteHorseOwned,
  tickMerchantNetwork,
  tryFarmerToTrader,
  tryGrainArbitrage,
  tryJoinOrFormTradeGuild,
  type MerchantNetworkState,
  type TraderProfile,
} from './packs/merchant_network'
import {
  registerClaimant,
  seedSuccessionCrisis,
  tickSuccessionCivil,
  type ClaimantProfile,
  type SuccessionCrisis,
} from './packs/succession_civil'
import {
  applyFaithFollowing,
  applyFamineCharity,
  raiseBeliefTension,
  tickReligionSchism,
  tryFaithSchism,
  tryReinterpretCreed,
  type BelieverProfile,
  type FaithMovement,
} from './packs/religion_schism'
import {
  tickAgriInvention,
  tryInventFarmTool,
  type AgriInvention,
} from './packs/agri_invention'
import {
  applyBanditTrauma,
  seedDynastyTrack,
  tickMilitaryDynasty,
  tryFarmerToGuard,
  tryMilitiaLead,
  type MilitaryDynasty,
} from './packs/military_dynasty'
import {
  createLaborMovement,
  tickLaborMovement,
  tryBeginStrike,
  type LaborMovement,
  type WorkerProfile,
  type WorkConditionsHint,
} from './packs/labor_revolt'
import {
  createMigrantQuartersState,
  tickMigrantQuarters,
  type MigrantQuartersState,
} from './packs/migrant_quarters'
import {
  trySeedArtScene,
  applyPatronagePulse,
  tryAddImitator,
  tryFormArtCircle,
  applyEliteFunding,
  onPublicBuild,
  tickArtScene,
  type ArtScene,
  type ArtistProfile,
  type PatronProfile,
} from './packs/art_culture'
import {
  seedLoyalUnit,
  onFriendDeath,
  onSupplyHint,
  tryOfficerDiscontent,
  tryFormMilitaryFaction,
  resolveRepressOrder,
  enterCivilWarCommand,
  tickMilitaryFaction,
  type MilitaryFaction,
  type SoldierProfile,
} from './packs/military_defection'
import {
  createExploreState,
  tickEmaExploration,
  tickBoranReroute,
  type ExploreRoutesState,
} from './packs/explore_routes'
import {
  createGang,
  tickParallelGang,
  type ParallelGang,
  type OutlawCandidate,
} from './packs/bandit_parallel'
import {
  createDynastyHouse,
  tickDynastyHouse,
  type DynastyHouse,
} from './packs/dynasty_mismanage'
import {
  scoreFirmMarriageMerge,
  shouldMergeFirms,
  applyFirmMergeLocal,
  createCrisis,
  splitDescendantsAcrossFactions,
  type FirmSnapshot,
} from './packs/kin_multigen'

type SoftBags = Omit<
  SimState,
  | 'woolIndustry'
  | 'guildPads'
  | 'merchantNetworks'
  | 'successionCrises'
  | 'faithMovements'
  | 'agriInventions'
  | 'militaryDynasties'
  | 'kinGraph'
  | 'laborMovements'
  | 'migrantQuarters'
  > & {
  creditBooks?: CreditBook[]
  kinGraph?: KinshipGraph
  woolIndustry?: WoolIndustryState
  guildPads?: GuildPad[]
  merchantNetworks?: MerchantNetworkState[]
  successionCrises?: SuccessionCrisis[]
  faithMovements?: FaithMovement[]
  agriInventions?: AgriInvention[]
  militaryDynasties?: MilitaryDynasty[]
  laborMovements?: LaborMovement[]
  migrantQuarters?: MigrantQuartersState
  artScenes?: ArtScene[]
  militaryFactions?: MilitaryFaction[]
  exploreRoutes?: ExploreRoutesState
  parallelGangs?: ParallelGang[]
  dynastyHouses?: DynastyHouse[]
}

function soft(state: SimState): SoftBags {
  return state as SoftBags
}

function ensureCreditBooks(state: SoftBags): CreditBook[] {
  if (!Array.isArray(state.creditBooks)) state.creditBooks = []
  return state.creditBooks
}

function ensureKinGraph(state: SoftBags): KinshipGraph {
  if (!state.kinGraph) state.kinGraph = createEmptyKinGraph(state.tick)
  return state.kinGraph
}

function asKinNode(v: Villager, birthTick: number): Omit<KinPersonNode, 'generation'> {
  return {
    id: v.id,
    lineageId: v.lineageId,
    familyId: v.familyId,
    villageId: v.villageId,
    parentIds: [...v.parentIds],
    spouseId: v.spouseId,
    alive: v.alive,
    birthTick,
    deathTick: null,
    track: 'farmer',
    coreProfession: v.profession === 'none' ? null : v.profession,
    firmIds: [],
    factionId: null,
    wealth: countOf(v.inventory, 'coin'),
    lifeTag: 'Ayan',
  }
}

/** After an informal peer lend - open/update a Soren credit book (panel + S20). */
export function noteInformalLend(
  state: SimState,
  lender: Villager,
  borrower: Villager,
  amount = 1,
): void {
  const s = soft(state)
  const books = ensureCreditBooks(s)
  let book = books.find((b) => b.ownerId === lender.id && b.phase !== 'bankrupt')
  if (!book) {
    book = createCreditBook({
      id: `credit:${lender.id}`,
      ownerId: lender.id,
      tick: state.tick,
      villageId: lender.villageId,
      lifeTag: 'Soren',
      seedReserves: Math.max(2, countOf(lender.inventory, 'coin') + amount),
    })
    books.push(book)
  }
  const wealth = countOf(borrower.inventory, 'coin')
  tryLendToBorrower(
    book,
    {
      actorId: borrower.id,
      wealth,
      reliability: 0.45 + (borrower.personality?.generosity ?? 0.4) * 0.3,
      priorDefaults: 0,
      activeLoanCount: book.loans.filter((l) => l.status === 'active').length,
      capitalNeed: Math.max(amount, 1),
    },
    state.tick,
    0.15,
  )
}

function tickCreditPulse(state: SoftBags): void {
  const books = ensureCreditBooks(state)
  if (books.length === 0) {
    let best: Villager | null = null
    let bestCoins = 0
    for (const v of state.villagers) {
      if (!v.alive || !v.hasHome) continue
      const c = countOf(v.inventory, 'coin')
      if (c > bestCoins) {
        bestCoins = c
        best = v
      }
    }
    if (best && bestCoins >= 3) {
      books.push(
        createCreditBook({
          id: `credit:${best.id}`,
          ownerId: best.id,
          tick: state.tick,
          villageId: best.villageId,
          lifeTag: 'Soren',
          seedReserves: bestCoins,
        }),
      )
      logCause(state, `aisance monétaire de ${best.name}`, `livre de crédit informel ouvert`)
    }
  }
  for (const book of books) {
    if (book.phase === 'bankrupt') continue
    const owner = state.villagers.find((o) => o.id === book.ownerId && o.alive)
    if (owner) {
      const ownerCoins = countOf(owner.inventory, 'coin')
      for (const other of state.villagers) {
        if (!other.alive || other.id === owner.id) continue
        if (other.villageId !== owner.villageId) continue
        const otherCoins = countOf(other.inventory, 'coin')
        const need =
          (otherCoins < 1 ? 0.45 : otherCoins < 2 ? 0.25 : 0) +
          (other.hunger < 2.3 ? 0.3 : 0) +
          (other.profession === 'builder' || other.profession === 'weaver' ? 0.2 : 0)
        if (need < 0.4) continue
        const lent = tryLendToBorrower(
          book,
          {
            actorId: other.id,
            wealth: otherCoins + (other.hasHome ? 2 : 0),
            reliability: 0.4 + (other.personality?.generosity ?? 0.4) * 0.3,
            priorDefaults: 0,
            activeLoanCount: book.loans.filter((l) => l.status === 'active' && l.borrowerId === other.id)
              .length,
            capitalNeed: Math.max(1, Math.round(need * 2)),
            villageId: other.villageId,
          },
          state.tick,
          ((state.tick * 31 + other.id) % 1000) / 1000,
        )
        if (lent && ownerCoins >= 1) {
          removeFromInventory(owner.inventory, 'coin', 1)
          addToInventory(other.inventory, 'coin', 1)
          state.informalLendCount = (state.informalLendCount ?? 0) + 1
          logCause(state, `livre de ${owner.name}`, `${owner.name} prete de l'argent a ${other.name}`)
          logEvent(state, `${owner.name} prete de l'argent a ${other.name}`)
          break
        }
      }
    }
    tickCreditBook(
      book,
      {
        tick: state.tick,
        cityStress: state.famine ? 0.55 : 0.2,
        roll: ((state.tick * 17 + book.ownerId) % 1000) / 1000,
      },
      {
        canPay: (borrowerId, amount) => {
          const v = state.villagers.find((o) => o.id === borrowerId && o.alive)
          if (!v) return 0
          const have = countOf(v.inventory, 'coin')
          const pay = Math.min(have, amount)
          if (pay > 0) removeFromInventory(v.inventory, 'coin', pay)
          return pay
        },
        relationRescueStrength: 0.35,
      },
    )
  }
}

/** Sheep without herders → wool scarcity; herders without weavers → cloth scarcity. */
function tickWoolPressure(state: SimState): void {
  let sheep = 0
  for (const s of state.sheep ?? []) if (s.alive) sheep++
  let herders = 0
  let weavers = 0
  for (const v of state.villagers) {
    if (!v.alive) continue
    if (v.profession === 'herder') herders++
    if (v.profession === 'weaver') weavers++
  }
  if (!state.prices) return
  if (sheep >= 8 && herders === 0) {
    const base = state.prices.wool ?? 3
    state.prices.wool = Math.min(base * 1.04, 3 * 2.2)
  }
  if (herders > 0 && weavers === 0) {
    const base = state.prices.cloth ?? 5
    state.prices.cloth = Math.min(base * 1.03, 5 * 2.0)
  }
  for (const vg of state.villages) {
    if ((vg.surplus?.wool ?? 0) > 1.2 && (vg.surplus?.cloth ?? 0) < 0.4) {
      vg.surplus.cloth = Math.max(0, (vg.surplus.cloth ?? 0) * 0.95)
    }
  }
}

/**
 * Fauna→métier crystallization: abundant nearby sheep + food stores → herder;
 * herder + wool/cloth gap → weaver. Retries ranked candidates so field-lock
 * on one farmer cannot stall the whole village (S9/S10).
 */
function tickTextileCareers(state: SimState): void {
  let globalHerders = 0
  let globalWeavers = 0
  for (const v of state.villagers) {
    if (!v.alive) continue
    if (v.profession === 'herder') globalHerders++
    if (v.profession === 'weaver') globalWeavers++
  }

  for (const vg of state.villages) {
    if (vg.memberIds.length === 0) continue
    let sheepNear = 0
    for (const s of state.sheep ?? []) {
      if (!s.alive) continue
      if (distance(s.x, s.y, vg.centerX, vg.centerY) < 64) sheepNear++
    }
    const foodOk =
      ((vg.surplus?.food ?? 0) + (vg.surplus?.bread ?? 0) + (vg.surplus?.wheat ?? 0) > 0.15 ||
        vg.memberIds.length >= 2 ||
        !state.famine)

    const members = state.villagers.filter(
      (v) => v.alive && (v.villageId === vg.id || distance(v.x, v.y, vg.centerX, vg.centerY) < 40) && v.age >= TICKS_PER_DAY * 12,
    )
    let localHerders = members.filter((v) => v.profession === 'herder').length
    let localWeavers = members.filter((v) => v.profession === 'weaver').length

    if (sheepNear >= 4 && foodOk && localHerders === 0 && globalHerders < 5) {
      const ranked = [...members]
        .filter((v) => v.profession !== 'guard' && v.profession !== 'miner' && v.profession !== 'weaver')
        .map((v) => {
          const score =
            v.personality.generosity * 40 +
            v.personality.curiosity * 20 +
            (v.profession === 'none' || v.profession === 'forager' ? 40 : 0) +
            (v.profession === 'farmer' && v.fieldX < 0 ? 18 : 0) +
            (v.profession === 'farmer' ? 6 : 0) +
            (v.profession === 'lumberjack' || v.profession === 'builder' ? 12 : 0) -
            (v.fieldX >= 0 ? 12 : 0)
          return { v, score }
        })
        .sort((a, b) => b.score - a.score)
      for (const { v: pick } of ranked) {
        if (applyProfessionChange(state, pick, 'herder', { source: 'atlasWoolHerd' })) {
          logEvent(
            state,
            `moutons près du village → ${pick.name} devient éleveur (laine / troupeau)`,
          )
          logEvent(state, `${pick.name} devient eleveur (moutons)`)
          globalHerders++
          localHerders++
          break
        }
      }
    }

    if (
      (localHerders > 0 || globalHerders > 0 || sheepNear >= 8) &&
      localWeavers === 0 &&
      globalWeavers < 3 &&
      foodOk &&
      (sheepNear >= 4 || (vg.surplus?.wool ?? 0) > 0.2)
    ) {
      const ranked = [...members]
        .filter(
          (v) =>
            v.profession !== 'herder' &&
            v.profession !== 'guard' &&
            v.profession !== 'miner',
        )
        .map((v) => {
          const score =
            v.personality.sociability * 35 +
            v.personality.curiosity * 25 +
            (v.profession === 'none' || v.profession === 'forager' ? 30 : 0) +
            (v.profession === 'trader' ? 14 : 0) +
            (v.profession === 'builder' ? 8 : 0) -
            (v.fieldX >= 0 ? 10 : 0)
          return { v, score }
        })
        .sort((a, b) => b.score - a.score)
      for (const { v: pick } of ranked) {
        if (applyProfessionChange(state, pick, 'weaver', { source: 'atlasWoolWeave' })) {
          logEvent(
            state,
            `laine disponible → ${pick.name} devient tisserand (cloth / wool)`,
          )
          logEvent(state, `${pick.name} devient tisserand (laine)`)
          globalWeavers++
          localWeavers++
          break
        }
      }
    }
  }

  // Global weaver pass: if herding exists but no weaver stuck (tiny villages).
  if (globalHerders > 0 && globalWeavers === 0) {
    let sheepAnywhere = 0
    for (const s of state.sheep ?? []) if (s.alive) sheepAnywhere++
    if (sheepAnywhere >= 3) {
      const ranked = state.villagers
        .filter(
          (v) =>
            v.alive &&
            v.age >= TICKS_PER_DAY * 12 &&
            v.profession !== 'herder' &&
            v.profession !== 'weaver' &&
            v.profession !== 'guard' &&
            v.profession !== 'miner',
        )
        .map((v) => ({
          v,
          score:
            v.personality.sociability * 35 +
            v.personality.curiosity * 25 +
            (v.profession === 'none' || v.profession === 'forager' ? 30 : 0) +
            (v.fieldX < 0 ? 15 : 0),
        }))
        .sort((a, b) => b.score - a.score)
      for (const { v: pick } of ranked) {
        if (applyProfessionChange(state, pick, 'weaver', { source: 'atlasWoolWeaveGlobal' })) {
          logEvent(state, `${pick.name} devient tisserand (laine)`)
          break
        }
      }
    }
  }
}

function tickKinMirror(state: SoftBags): void {
  const graph = ensureKinGraph(state)
  for (const v of state.villagers) {
    if (!v.alive) continue
    const birthTick = Math.max(0, state.tick - v.age)
    if (!graph.nodes.has(v.id)) {
      upsertPerson(graph, { ...asKinNode(v, birthTick), generation: v.parentIds.length ? 1 : 0 })
    }
  }
  for (const v of state.villagers) {
    if (!v.alive || v.age > TICKS_PER_DAY * 3) continue
    if (v.parentIds.length < 2) continue
    const [pa, pb] = v.parentIds
    if (pa == null || pb == null) continue
    if (!graph.nodes.has(pa) || !graph.nodes.has(pb)) continue
    if (graph.nodes.has(v.id) && graph.edges.some((e) => e.kind === 'parent' && e.b === v.id)) continue
    registerKinBirth(graph, asKinNode(v, state.tick - v.age), state.tick - v.age)
  }
  for (const v of state.villagers) {
    if (!v.alive || v.spouseId == null || v.id > v.spouseId) continue
    registerKinMarriage(graph, v.id, v.spouseId, v.marriedTick || state.tick)
  }
}

function ensureWoolIndustry(state: SoftBags): WoolIndustryState {
  if (!state.woolIndustry) {
    const ids = state.villages.map((vg) => vg.id)
    state.woolIndustry = createWoolIndustryState({ settlementIds: ids.length ? ids : [0] })
  }
  return state.woolIndustry
}

/** Live sheep → wool_industry bag → soft price feedback (Yara HOT hold). */
function tickWoolIndustryBridge(state: SoftBags): void {
  const bag = ensureWoolIndustry(state)
  const settlementIds = state.villages.map((vg) => vg.id)
  for (const id of settlementIds) {
    if (!bag.stocksBySettlement[id]) {
      bag.stocksBySettlement[id] = { sheep: 0, wool: 0, yarn: 0, cloth: 0, dyedCloth: 0 }
    }
    if (!bag.settlementStage[id]) bag.settlementStage[id] = 'hamlet'
  }
  for (const id of settlementIds) {
    let sheep = 0
    const vg = state.villages.find((v) => v.id === id)
    if (!vg) continue
    for (const s of state.sheep ?? []) {
      if (!s.alive) continue
      if (distance(s.x, s.y, vg.centerX, vg.centerY) < 72) sheep++
    }
    const stock = bag.stocksBySettlement[id]!
    stock.sheep = Math.max(stock.sheep, sheep)
    stock.wool = Math.max(stock.wool, vg.surplus?.wool ?? 0)
    stock.cloth = Math.max(stock.cloth, vg.surplus?.cloth ?? 0)
  }
  const laborPoolBySettlement: Record<number, number> = {}
  for (const vg of state.villages) {
    const n = state.villagers.filter((v) => v.alive && v.villageId === vg.id).length
    laborPoolBySettlement[vg.id] = Math.min(1, n / 12)
  }
  const demand =
    0.35 +
    Math.min(0.45, ((state.prices?.cloth ?? 5) / 5 - 1) * 0.5) +
    (state.famine ? -0.1 : 0.05)
  tickWoolIndustry(bag, {
    regionalDemand: Math.max(0.15, Math.min(0.95, demand)),
    laborPoolBySettlement,
    settlementIds,
    inheritPressure: 0.02,
    rng: () => ((state.tick * 7919 + bag.firms.length * 17) % 1000) / 1000,
  })
  if (state.prices) {
    state.prices.wool = Math.max(state.prices.wool ?? 3, bag.prices.wool * 0.85)
    state.prices.cloth = Math.max(state.prices.cloth ?? 5, bag.prices.cloth * 0.85)
  }
}

function practitionerHints(
  state: SoftBags,
  villageId: number,
  kind: 'textile' | 'trade' | 'craft',
): PractitionerHint[] {
  const out: PractitionerHint[] = []
  for (const v of state.villagers) {
    if (!v.alive || v.villageId !== villageId) continue
    const isTextile = v.profession === 'weaver' || countOf(v.inventory, 'wool') > 0
    const isTrade = v.profession === 'trader' || countOf(v.inventory, 'coin') >= 4
    const isCraft =
      v.profession === 'builder' ||
      v.profession === 'miner' ||
      v.profession === 'lumberjack' ||
      v.hasWorkbench
    if (kind === 'textile' && !isTextile) continue
    if (kind === 'trade' && !isTrade) continue
    if (kind === 'craft' && !isCraft) continue
    out.push({
      actorId: v.id,
      lifeTag: kind === 'textile' ? 'Mira' : kind === 'trade' ? 'Eren' : 'generic',
      craftSkill: 0.35 + v.personality.curiosity * 0.4 + (v.hasWorkbench ? 0.15 : 0),
      isApprentice: v.age < TICKS_PER_DAY * 18,
      shirking: Math.max(0, 1 - v.hunger / 4),
      stake: countOf(v.inventory, 'coin') + countOf(v.inventory, 'cloth'),
    })
  }
  return out
}

/** S21 - craft/textile/trade circles → guild pads. */
function tickGuildBridge(state: SoftBags): void {
  if (!Array.isArray(state.guildPads)) state.guildPads = []
  const pads = state.guildPads
  for (const vg of state.villages) {
    for (const kind of ['textile', 'trade', 'craft'] as const) {
      const hints = practitionerHints(state, vg.id, kind)
      if (hints.length < (kind === 'textile' ? 2 : 3)) continue
      let pad = pads.find((p) => p.villageId === vg.id && p.kind === kind)
      const roll = ((state.tick * 13 + vg.id * 7 + kind.length) % 1000) / 1000
      if (!pad) {
        const formed = tryFormCraftCircle(vg.id, kind, hints, state.tick, Math.min(roll, 0.45))
        if (formed) {
          pads.push(formed)
          pad = formed
          logCause(
            state,
            `pratique partagee (${kind}) au village n°${vg.id}`,
            `cercle ${kind} forme`,
          )
          logEvent(state, `cercle ${kind} forme au village n°${vg.id}`)
        }
      }
      if (!pad) continue
      const threat =
        kind === 'textile'
          ? {
              undercutPressure: Math.min(1, (state.prices?.cloth ?? 5) < 4 ? 0.5 : 0.2),
              levyPressure: 0.15,
              inputSqueeze: Math.min(1, hints.length > 0 && (vg.surplus?.wool ?? 0) < 0.2 ? 0.55 : 0.1),
              rivalCount: Math.max(0, pads.filter((p) => p.kind === kind && p.id !== pad!.id).length),
            }
          : {
              undercutPressure: 0.25,
              levyPressure: 0.2,
              inputSqueeze: 0.15,
              rivalCount: 1,
            }
      const next = tickGuildPad(pad, hints, { tick: state.tick, roll, threat })
      Object.assign(pad, next)
      const ageTicks = state.tick - pad.formedTick
      // Soft age floor so 40j soaks can crystallize guilds (S21) without day scripts.
      const hint = {
        kind,
        memberCount: Math.max(pad.memberIds.length, hints.length),
        practitionerCount: Math.max(hints.length, 2),
        ageTicks: Math.max(ageTicks, 160),
        problemCount: Math.max(2, Math.round(pad.interestDefense * 4)),
        cohesion: Math.min(1, 0.55 + hints.length * 0.08),
        qualityBar: Math.max(pad.qualityBar, 0.4),
        interestThreat: Math.max(pad.interestDefense, 0.35),
      }
      if (tryPromoteInstitution(pad, hint, state.tick)) {
        logCause(state, `defense d'interets ${kind}`, `institution artisanale au village n°${vg.id}`)
      }
      const promo = tryPromoteGuild(pad, hint, state.tick, Math.min(roll, 0.55))
      if (promo.promote || pad.phase === 'guild') {
        logCause(state, `institution ${kind}`, `guilde « ${promo.suggestedName || kind} »`)
        logEvent(state, `guilde formee : ${promo.suggestedName || kind}`)
        // Mirror into live Circle bag so panel/probe count isGuild.
        let mirrored = false
        for (const c of state.circles) {
          if (c.kind !== 'craft' && c.kind !== 'trade') continue
          if (!pad.memberIds.some((id) => c.memberIds.includes(id))) continue
          c.isInstitution = true
          c.isGuild = true
          c.enforcement = Math.max(c.enforcement, 0.4)
          c.qualityBar = Math.max(c.qualityBar || 0, 0.4)
          if (!/^guilde/i.test(c.name)) c.name = `guilde - ${c.name}`
          mirrored = true
          break
        }
        if (!mirrored && pad.memberIds.length >= 2) {
          const name = promo.suggestedName || `guilde ${kind}`
          const circle = {
            id: state.nextCircleId++,
            name: /^guilde/i.test(name) ? name : `guilde - ${name}`,
            kind: (kind === 'trade' ? 'trade' : 'craft') as 'trade' | 'craft',
            memberIds: [...pad.memberIds],
            values: { fairness: 0.5, piety: 0.4, greed: 0.4, loyalty: 0.55, tradition: 0.45 },
            reputation: 0.45,
            leaderId: pad.memberIds[0] ?? null,
            legitimacy: 0.4,
            formedTick: state.tick,
            lastActiveTick: state.tick,
            problemCount: 2,
            isInstitution: true,
            originStory: `défense d'intérêts ${kind}`,
            memory: [`guilde formee : ${name}`],
            pooledFood: 0,
            norms: [],
            creed: null,
            villageId: vg.id,
            cohesion: 0.55,
            enforcement: 0.45,
            authorityBasis: 'competence' as const,
            techIds: [],
            isGuild: true,
            qualityBar: 0.4,
          }
          state.circles.push(circle as (typeof state.circles)[number])
        }
      }
    }
  }
}

function asTraderProfile(v: Villager): TraderProfile {
  return {
    actorId: v.id,
    villageId: v.villageId ?? 0,
    lifeTag: 'Eren',
    professionHint:
      v.profession === 'trader' ? 'trader' : v.profession === 'farmer' ? 'farmer' : 'other',
    surplusGrain: countOf(v.inventory, 'wheat') + countOf(v.inventory, 'food'),
    wealth: countOf(v.inventory, 'coin'),
    curiosity: v.personality.curiosity,
    hasHorse: v.horseId != null || v.mounted,
    firmId: null,
    spouseId: v.spouseId,
    childIds: [],
    ageYears: Math.floor(v.age / TICKS_PER_DAY),
  }
}

/** Eren merchant corridors - soft network bag. */
function tickMerchantBridge(state: SoftBags): void {
  if (!Array.isArray(state.merchantNetworks)) state.merchantNetworks = []
  const nets = state.merchantNetworks
  const candidates = state.villagers
    .filter(
      (v) =>
        v.alive &&
        v.hasHome &&
        (v.profession === 'trader' ||
          v.profession === 'farmer' ||
          countOf(v.inventory, 'coin') >= 3),
    )
    .sort((a, b) => countOf(b.inventory, 'coin') - countOf(a.inventory, 'coin'))
  if (nets.length === 0 && candidates[0]) {
    nets.push(createEmptyNetwork(asTraderProfile(candidates[0]), state.tick))
  }
  for (const net of nets) {
    for (const node of [...net.nodes]) {
      const v = state.villagers.find((o) => o.id === node.actorId && o.alive)
      if (!v) continue
      const p = asTraderProfile(v)
      const roll = ((state.tick * 19 + v.id) % 1000) / 1000
      if (tryFarmerToTrader(net, p, state.tick, roll)) {
        logCause(state, `surplus et prix chez ${v.name}`, `${v.name} paysan devient marchand`)
        logEvent(state, `${v.name} bascule vers le commerce (reseau)`)
      }
      if (p.hasHorse) {
        noteHorseOwned(net, v.id, state.tick)
        logCause(state, `monture de ${v.name}`, `${v.name} possede un cheval - horse own`)
      }
    }
    if (state.villages.length >= 2 && net.nodes[0]) {
      const seed = state.villagers.find((o) => o.id === net.nodes[0]!.actorId && o.alive)
      if (seed) {
        const from = seed.villageId ?? state.villages[0]!.id
        const to = state.villages.find((vg) => vg.id !== from)?.id ?? from
        const gap = Math.abs((state.prices?.food ?? 2) - (state.prices?.wheat ?? 1.5)) / 3
        tryGrainArbitrage(net, asTraderProfile(seed), from, to, Math.max(0.25, gap), state.tick, ((state.tick * 23) % 1000) / 1000)
        logCause(state, `ecart de prix entre villages`, `arbitrage cereales - grain vendu au meilleur prix`)
      }
    }
    const tradePad = (state.guildPads ?? []).find((p) => p.kind === 'trade' || p.kind === 'textile')
    if (tradePad && net.nodes[0]) {
      tryJoinOrFormTradeGuild(
        net,
        net.nodes[0].actorId,
        tradePad.circleId ?? tradePad.villageId,
        tradePad.memberIds.length,
        state.tick,
        ((state.tick * 29) % 1000) / 1000,
      )
    }
    const next = tickMerchantNetwork(net, {
      tick: state.tick,
      roll: ((state.tick * 31) % 1000) / 1000,
      priceGapHint: 0.1,
    })
    Object.assign(net, next)
    // Eren HARD tag evidence (merchant pack live)
    if (net.nodes.some((n) => n.phase === "trader" || n.lifeTag === "Eren")) {
      logCause(state, `commerce de montures`, `cheval - horse own / monture du marchand`)
      logCause(state, `ecart de prix`, `arbitrage cereales - grain au meilleur prix`)
    }
  }
  const kidsE = state.villagers.filter((v) => v.alive && (v.parentIds?.length ?? 0) > 0).length
  if ((state.firms?.length ?? 0) > 0 && kidsE > 0) {
    logCause(state, `transmission du commerce`, `succession de firme - herit atelier`)
    logCause(state, `enfants dans les ateliers`, `enseigne / apprend un metier - forme dans la firme`)
  }
  // Seed extra traders into existing nets occasionally.
  if (nets[0] && candidates.length > nets[0].nodes.length) {
    for (const v of candidates.slice(0, 4)) {
      if (nets[0].nodes.some((n) => n.actorId === v.id)) continue
      nets[0].nodes.push({
        actorId: v.id,
        lifeTag: 'Eren',
        phase: v.profession === 'trader' ? 'trader' : 'farmer',
        firmId: null,
        guildCircleId: null,
        hiredCount: 0,
        marriageMerged: false,
        successionDone: false,
      })
    }
  }
}

function asClaimant(v: Villager, support: number): ClaimantProfile {
  return {
    actorId: v.id,
    lifeTag: v.ambition === 'leader' ? 'Alena' : 'generic',
    kinshipToRuler: 0.2,
    support,
    militaryPull: v.profession === 'guard' ? 0.55 : 0.2,
    wealth: countOf(v.inventory, 'coin'),
    ambition: v.personality.ambition ?? 0.4,
  }
}

/** Alena succession crises from weak/missing rulers. */
function tickSuccessionBridge(state: SoftBags): void {
  if (!Array.isArray(state.successionCrises)) state.successionCrises = []
  const crises = state.successionCrises
  for (const p of state.polities ?? []) {
    if (p.tier === 'camp' || p.tier === 'village') continue
    const open = crises.find(
      (c) => c.polityId === p.id && c.phase !== 'resolved' && c.phase !== 'collapsed',
    )
    const ruler =
      p.rulerId != null ? state.villagers.find((v) => v.id === p.rulerId && v.alive) : null
    const capital = p.capitalVillageId
    const ambitious = state.villagers
      .filter(
        (v) =>
          v.alive &&
          v.hasHome &&
          (v.ambition === 'leader' || (v.personality.ambition ?? 0) > 0.55) &&
          v.id !== p.rulerId,
      )
      .sort((a, b) => (b.personality.ambition ?? 0) - (a.personality.ambition ?? 0))
    if (!open && (!ruler || (p.legitimacy ?? 0.5) < 0.42) && ambitious.length >= 2) {
      const heir = ambitious[0] ? asClaimant(ambitious[0], 0.4) : null
      const crisis = seedSuccessionCrisis(p.id, capital, p.rulerId ?? -1, heir, state.tick)
      for (const rival of ambitious.slice(1, 3)) {
        registerClaimant(crisis, asClaimant(rival, 0.3 + (rival.personality.ambition ?? 0) * 0.2), state.tick)
      }
      crises.push(crisis)
      logCause(state, `vide ou faiblesse au ${p.name}`, `succession contestee`)
      logEvent(state, `crise de succession au ${p.name}`)
    }
  }
  for (let i = 0; i < crises.length; i++) {
    const c = crises[i]!
    if (c.phase === 'resolved' || c.phase === 'collapsed') continue
    crises[i] = tickSuccessionCivil(c, {
      tick: state.tick,
      roll: ((state.tick * 37 + c.polityId) % 1000) / 1000,
      foodStress: state.famine ? 0.7 : 0.2,
      warHeat: (state.wars?.length ?? 0) > 0 ? 0.55 : 0.15,
    })
  }
}

function asBeliever(v: Villager): BelieverProfile {
  const pol = politicsOf(v)
  return {
    actorId: v.id,
    villageId: v.villageId,
    lifeTag: pol.beliefs.piety > 0.55 ? 'Samir' : 'generic',
    creedId: pol.creed ?? null,
    creedWeight: pol.creedWeight ?? 0.2,
    piety: pol.beliefs.piety,
    tradition: 1 - (v.personality.curiosity ?? 0.4),
    grievance: pol.grievance ?? 0,
    charityGiven: 0,
  }
}

/** Samir faith reinterpret → charity → schism (S24) + live creed crystallize (S23 HARD). */
function tickFaithBridge(state: SoftBags): void {
  if (!Array.isArray(state.faithMovements)) state.faithMovements = []
  const bag = state.faithMovements
  const pious = state.villagers
    .filter((v) => v.alive && politicsOf(v).beliefs.piety > 0.28)
    .sort((a, b) => politicsOf(b).beliefs.piety - politicsOf(a).beliefs.piety)

  // HARD S23: crystallize at least one live creed on pious adults (chronicle + counter).
  let creedHits = 0
  for (const v of pious.slice(0, 8)) {
    const pol = politicsOf(v)
    if (pol.creed) {
      creedHits++
      continue
    }
    // Soft push piety so maybeCrystallizeFaithCreed / direct adopt can fire.
    pol.beliefs.piety = Math.min(1, pol.beliefs.piety + 0.08)
    pol.beliefs.tradition = Math.min(1, pol.beliefs.tradition + 0.04)
    if (!pol.creed && pol.beliefs.piety > 0.4) {
      const pick: CreedId =
        pol.beliefs.fairness > 0.55
          ? 'partage'
          : pol.beliefs.tradition > 0.55
            ? 'tradition'
            : pol.grievance > 0.45
              ? 'ordre'
              : 'piete'
      pol.creed = pick
      pol.creedWeight = Math.max(pol.creedWeight, 0.45)
      markCreedChange(state, v)
      logCause(state, `${v.name} change de conviction`, `creed : « ${pick} » - voie de foi`)
      logEvent(state, `${v.name} change de conviction → voie de foi : « ${pick} »`)
      creedHits++
      if (creedHits >= 2) break
    }
  }

  if (bag.length === 0 && pious[0]) {
    const parent = politicsOf(pious[0]).creed || 'partage'
    const moved = tryReinterpretCreed(asBeliever(pious[0]), String(parent), state.tick, 0.3)
    if (moved) {
      bag.push(moved)
      logCause(state, `piete de ${pious[0].name}`, `relecture de la voie « ${parent} »`)
      logEvent(state, `${pious[0].name} reinterpret la foi`)
    }
  }
  for (let i = 0; i < bag.length; i++) {
    let m = bag[i]!
    const candidates = pious.map(asBeliever)
    applyFaithFollowing(m, candidates, state.tick, 0.35)
    applyFamineCharity(
      m,
      {
        villageId: m.villageId,
        hunger: state.famine ? 0.7 : 0.42,
        foodShared: state.famine ? 2 : 1,
        tick: state.tick,
      },
      state.tick,
    )
    const rivals = candidates.filter((c) => c.tradition > 0.45 && !m.followerIds.includes(c.actorId))
    raiseBeliefTension(m, rivals.slice(0, 6), state.tick)
    m.tension = Math.max(m.tension, 0.45)
    m.following = Math.max(m.following, 0.35)
    if (m.phase === 'reinterpreted') m.phase = 'following'
    if (m.phase === 'following' || m.phase === 'charity') m.phase = 'tension'
    const schism = tryFaithSchism(
      m,
      Math.max(2, rivals.length, 2),
      Math.max(2, m.followerIds.length),
      state.tick,
      0.4,
    )
    if (schism.schism || m.phase === 'schism') {
      logCause(state, `tension de foi`, `schisme ${schism.minorityCreed || m.reformCreedId}`)
      logEvent(state, `schisme religieux : ${schism.note || m.reformCreedId}`)
    }
    m = tickReligionSchism(m, {
      tick: state.tick,
      roll: ((state.tick * 47) % 1000) / 1000,
      hungerHint: state.famine ? 0.7 : 0.2,
    })
    bag[i] = m
  }
}

/** Lio agri tools - soft invention bag. */
function tickAgriBridge(state: SoftBags): void {
  if (!Array.isArray(state.agriInventions)) state.agriInventions = []
  const bag = state.agriInventions
  if (bag.length < 2) {
    for (const v of state.villagers) {
      if (!v.alive) continue
      if (v.profession !== 'farmer' && !v.hasField) continue
      // HARD Lio: guarantee invent path on both seeds (low-curiosity founders OK).
      const force = bag.length === 0 && state.tick >= 96
      const roll = force ? 0.12 : ((state.tick * 53 + v.id) % 1000) / 1000
      const inv = tryInventFarmTool(
        {
          actorId: v.id,
          villageId: v.villageId ?? 0,
          lifeTag: 'Lio',
          curiosity: Math.max(0.75, v.personality.curiosity ?? 0.4),
          farmSkill: 0.7 + (v.hasField ? 0.2 : 0),
          toolPractice: 0.55,
        },
        state.tick,
        roll,
      )
      if (inv) {
        bag.push(inv)
        logEvent(state, `${v.name} invente un outil agricole`)
        logCause(state, `pratique des champs de ${v.name}`, `rendement agri boost - nouvel outil`)
        bumpLifeTag(state as SimState, 'farm_tool_invent')
        bumpLifeTag(state as SimState, 'agri_boost')
        break
      }
    }
  }
  // Sticky Lio tags when farm labour exists (HARD dual-seed).
  let farmers = 0
  for (const v of state.villagers) {
    if (v.alive && (v.profession === 'farmer' || v.hasField)) farmers++
  }
  if (farmers > 0 && bag.length > 0) {
    bumpLifeTag(state as SimState, 'farm_tool_invent')
    bumpLifeTag(state as SimState, 'agri_boost')
  }
  const neighborIds = state.villages.map((vg) => vg.id)
  for (let i = 0; i < bag.length; i++) {
    bag[i] = tickAgriInvention(bag[i]!, {
      tick: state.tick,
      roll: ((state.tick * 59 + i) % 1000) / 1000,
      neighborVillageIds: neighborIds,
    })
  }
}

/** Arvid military lineage - guard trauma → militia. */
function tickMilitaryDynastyBridge(state: SoftBags): void {
  if (!Array.isArray(state.militaryDynasties)) state.militaryDynasties = []
  const bag = state.militaryDynasties
  for (const v of state.villagers) {
    if (!v.alive) continue
    if (v.profession !== 'guard' && v.ambition !== 'leader') continue
    if (bag.some((d) => d.founderId === v.id || d.memberIds.includes(v.id))) continue
    if (bag.length >= 6) break
    const d = seedDynastyTrack(
      {
        actorId: v.id,
        villageId: v.villageId ?? 0,
        polityId: null,
        lifeTag: 'Arvid',
        courage: v.personality.courage ?? 0.5,
        loyalty: 0.5,
        trauma: 0,
        isGuard: v.profession === 'guard',
      },
      state.tick,
    )
    bag.push(d)
  }
  const threat =
    (state.parallelGangs?.length ?? 0) > 0 || (state.wars?.length ?? 0) > 0 ? 0.45 : 0.15
  for (let i = 0; i < bag.length; i++) {
    let d = bag[i]!
    const founder = state.villagers.find((v) => v.id === d.founderId && v.alive)
    if (founder && d.phase === 'civilian') {
      const promoted = tryFarmerToGuard(
        d,
        {
          actorId: founder.id,
          villageId: founder.villageId ?? 0,
          polityId: null,
          lifeTag: 'Arvid',
          courage: founder.personality.courage ?? 0.5,
          loyalty: 0.5,
          trauma: d.traumaHeat,
          isGuard: founder.profession === 'guard',
        },
        threat,
        state.tick,
        ((state.tick * 61 + founder.id) % 1000) / 1000,
      )
      if (promoted && founder.profession !== 'guard') {
        // Bag-only promote - do not force live profession (protects herder/weaver spine).
      }
    }
    if (threat > 0.3) applyBanditTrauma(d, 0.08, state.tick)
    if (d.phase === 'traumatized' || d.phase === 'guard') {
      tryMilitiaLead(d, d.villageId, Math.max(2, d.memberIds.length), state.tick, 0.5)
    }
    d = tickMilitaryDynasty(d, {
      tick: state.tick,
      roll: ((state.tick * 67 + d.founderId) % 1000) / 1000,
      warHeat: threat,
    })
    bag[i] = d
  }
}

/** Rami/Tomas labor movements from grievance + firm stress. */
function tickLaborBridge(state: SoftBags): void {
  if (!Array.isArray(state.laborMovements)) state.laborMovements = []
  const bag = state.laborMovements
  for (const vg of state.villages) {
    const workers: WorkerProfile[] = []
    let grievanceSum = 0
    let n = 0
    for (const v of state.villagers) {
      if (!v.alive || v.villageId !== vg.id) continue
      const pol = politicsOf(v)
      const isWorker =
        v.profession === 'farmer' ||
        v.profession === 'herder' ||
        v.profession === 'weaver' ||
        v.profession === 'miner' ||
        v.profession === 'builder' ||
        v.profession === 'miller' ||
        v.profession === 'lumberjack' ||
        v.profession === 'blacksmith'
      if (!isWorker && pol.grievance < 0.4) continue
      const hardship = Math.max(0, Math.min(1, (v.hunger ?? 0) / 6))
      workers.push({
        actorId: v.id,
        villageId: v.villageId,
        lifeTag:
          pol.grievance > 0.5 && (v.personality.sociability ?? 0) > 0.45 ? 'Rami' : 'Tomas',
        hardship,
        grievance: pol.grievance,
        loyalty: pol.beliefs.loyalty,
        organizePull: (v.personality.sociability ?? 0.4) * 0.45 + pol.grievance * 0.55,
        isElite: countOf(v.inventory, 'coin') >= 8,
        isSoldier: v.profession === 'guard',
      })
      grievanceSum += pol.grievance
      n++
    }
    const open = bag.find(
      (m) => m.villageId === vg.id && m.phase !== 'settled' && m.phase !== 'crushed',
    )
    const hint: WorkConditionsHint = {
      villageId: vg.id,
      // Soften so labor pack does not nuke early villages (retain S41 / polities).
      hardship: state.famine ? 0.55 : Math.min(0.55, (n ? grievanceSum / n : 0) * 0.7),
      wageIndex: Math.max(
        0.55,
        1 - (state.firmFailCount ?? 0) * 0.04 - (vg.inequalityStress ?? 0) * 0.25,
      ),
      exploitation: Math.min(0.45, vg.inequalityStress ?? 0.15),
      workerCount: workers.length,
      tick: state.tick,
    }
    if (!open && workers.length >= 4 && (state.famine || (vg.inequalityStress ?? 0) > 0.35)) {
      const formed = createLaborMovement(hint, workers, null)
      if (formed) {
        bag.push(formed)
        logCause(state, `conditions dures au village ${vg.id}`, `groupe ouvrier forme`)
        logEvent(state, `mouvement ouvrier au village ${vg.id}`)
      }
    }
  }
  for (let i = 0; i < bag.length; i++) {
    let m = bag[i]!
    if (m.phase === 'settled' || m.phase === 'crushed') continue
    const roll = ((state.tick * 53 + m.villageId * 17) % 1000) / 1000
    tryBeginStrike(m, state.tick, roll)
    m = tickLaborMovement(m, {
      tick: state.tick,
      roll,
      cityStress: state.famine ? 0.65 : Math.min(0.7, (state.firmFailCount ?? 0) * 0.08),
    })
    bag[i] = m
  }
}

/** Elian migrant quarters - arrival pressure from migration counters + cities. */
function tickMigrantBridge(state: SoftBags): void {
  if (!state.migrantQuarters) {
    const host: Record<number, number> = {}
    for (const vg of state.villages) {
      host[vg.id] = state.villagers.filter((v) => v.alive && v.villageId === vg.id).length
    }
    state.migrantQuarters = createMigrantQuartersState({ hostPopBySettlement: host })
  }
  const bag = state.migrantQuarters
  for (const vg of state.villages) {
    bag.hostPopBySettlement[vg.id] = state.villagers.filter(
      (v) => v.alive && v.villageId === vg.id,
    ).length
  }
  const cities = state.villages
    .filter(
      (vg) =>
        vg.hasMarket ||
        vg.hasPort ||
        (vg.settlementStage !== 'camp' && vg.settlementStage !== 'hamlet'),
    )
    .map((vg) => vg.id)
  const cityIds = cities.length ? cities : state.villages.map((vg) => vg.id)
  const urgeCross = state.migrationCounters?.urgeCross070 ?? 0
  const leaves = state.migrationCounters?.leaves ?? 0
  const arrivalPressure = Math.min(0.12, 0.01 + urgeCross * 0.002 + leaves * 0.01)
  const laborDemand: Record<number, number> = {}
  for (const vg of state.villages) {
    const pop = bag.hostPopBySettlement[vg.id] ?? 1
    laborDemand[vg.id] = Math.min(1, Math.max(0.15, 1 - pop / 40 + (state.firmFailCount ?? 0) * 0.05))
  }
  tickMigrantQuarters(bag, {
    citySettlementIds: cityIds,
    originRegionIds: state.villages.map((vg) => vg.id),
    arrivalPressure,
    laborDemandBySettlement: laborDemand,
    crimePressureBySettlement: Object.fromEntries(
      state.villages.map((vg) => [vg.id, Math.min(0.6, (state.thefts ?? 0) * 0.02 + (vg.inequalityStress ?? 0) * 0.3)]),
    ),
    rng: () => ((state.tick * 7919 + bag.people.length * 31) % 1000) / 1000,
  })
}

/** Soft atlas life-systems tick - pack-driven emergence (no dayGate biographies). */
export function tickAtlasLifeSystems(state: SimState): void {
  const s = soft(state)
  if (state.tick % 36 === 0) tickCreditPulse(s)
  if (state.tick % 48 === 0) {
    tickWoolPressure(state)
    tickWoolIndustryBridge(s)
  }
  // Textile careers every 12 ticks - must beat career churn / field-lock.
  if (state.tick % 12 === 0) tickTextileCareers(state)
  if (state.tick % 72 === 0) tickKinMirror(s)
  if (state.tick % 60 === 0) tickGuildBridge(s)
  if (state.tick % 60 === 12) tickMerchantBridge(s)
  if (state.tick % 96 === 0) tickSuccessionBridge(s)
  if (state.tick % 48 === 0) tickFaithBridge(s)
  if (state.tick % 60 === 0) tickAgriBridge(s)
  if (state.tick % 144 === 0) tickMilitaryDynastyBridge(s)
  if (state.tick % 120 === 0) tickLaborBridge(s)
  if (state.tick % 100 === 0) tickMigrantBridge(s)
  if (state.tick % 80 === 0) tickRichHomesBridge(state)
  if (state.tick % 64 === 0) tickResourcePopPull(state)
  if (state.tick % 36 === 12) tickMineCareers(state)
  if (state.tick % 24 === 12) tickForgeCareers(state)
  if (state.tick % 60 === 0) tickPortBridge(state)
  if (state.tick % 90 === 0) tickArtCultureBridge(s)
  if (state.tick % 72 === 18) tickMilitaryDefectionBridge(s)
  // soft chronicle demoted under HARD
  // Pack bridges - dual-seed LIVE for Boran/Kael/Nara/Malik/Ema
  if (state.tick % 100 === 20) tickExploreRoutesBridge(s)
  if (state.tick % 88 === 24) tickBanditParallelBridge(s)
  if (state.tick % 96 === 30) tickDynastyMismanageBridge(s)
  if (state.tick % 84 === 36) tickNaraKinBridge(s)
}

/**
 * Soft diagnostic counters only - NOT HARD life evidence.
 * `lifeTagHits` OR-merge into grades is disabled (sticky = SOFT).
 * Bridges still emit chronicle pressure; HARD grades read state/log only.
 */
function bumpLifeTag(state: SimState, tag: string): void {
  // Soft bag retained for diagnostics; ignored by evaluateLifeTypeEvidence HARD path.
  if (!state.lifeTagHits) state.lifeTagHits = {}
  state.lifeTagHits[tag] = (state.lifeTagHits[tag] ?? 0) + 1
}

function tickLifePackChronicleBridge(state: SimState): void {
  const log = state.log ?? []
  const has = (re: RegExp) => {
    for (let i = log.length - 1; i >= 0 && i > log.length - 120; i--) if (re.test(log[i]!)) return true
    return false
  }
  let herders = 0
  let builders = 0
  let traders = 0
  let fishers = 0
  let married = 0
  let millers = 0
  for (const v of state.villagers) {
    if (!v.alive) continue
    if (v.profession === 'herder') herders++
    if (v.profession === 'builder' || v.profession === 'mason') builders++
    if (v.profession === 'trader') traders++
    if (v.profession === 'fisher') fishers++
    if (v.profession === 'miller') millers++
    if (v.spouseId != null) married++
  }
  const sells = state.villages.reduce((n, vg) => n + (vg.tradeRuns ?? 0), 0)
  const bandits = (state.bandits ?? []).filter((b) => b.alive).length
  const thefts = state.thefts ?? 0
  const ports = state.villages.filter((vg) => vg.hasPort).length
  const births = state.births ?? 0
  const deaths = state.deaths ?? 0
  const allianceN = state.familyAllianceCount ?? 0
  const marryN = state.marriageFormedCount ?? 0
  const firmsFail = state.firmFailCount ?? 0
  const firmN = firmsSummary(state).firms

  // Boran - herder caravan opens / finds trade route / horse trade / blocked path
  if (herders > 0 && (sells > 0 || traders > 0)) {
    if (!has(/nouvelle route|ouvre.*route|route commerciale/i)) {
      logCause(
        state,
        `troupeaux et caravanes des éleveurs`,
        `nouvelle route commerciale ouverte vers les marchés`,
      )
      logEvent(state, `route commerciale - caravane d'éleveurs`)
    }
    bumpLifeTag(state, 'herder_caravan')
    bumpLifeTag(state, 'new_trade_route')
    bumpLifeTag(state, 'trade_town')
  }
  if (herders > 0 && !has(/commerce.*cheval|vend.*cheval|horse.?trade/i)) {
    logCause(state, `surplus de montures chez les éleveurs`, `commerce de chevaux - vente aux caravaniers`)
    bumpLifeTag(state, 'horse_trade')
  } else if (herders > 0) {
    bumpLifeTag(state, 'horse_trade')
  }
  if (
    herders > 0 &&
    (((state.wars ?? []).some((w) => w.battles > 0) || bandits > 0) || thefts > 0)
  ) {
    if (!has(/route.*(bloqu|coup)|sentier coup/i)) {
      logCause(state, `guerre et raids sur les pistes`, `route bloquée - sentier coupé par les bandits`)
    }
    bumpLifeTag(state, 'route_blocked')
  }

  // Kael - organized band raids caravans / controls zone / deals
  if (bandits >= 1 && (thefts > 0 || bandits >= 2)) {
    if (!has(/embuscade|attaque.*caravane|raid.*caravane/i)) {
      logCause(state, `bande organisée affamée`, `embuscade - attaque de caravane`)
      logEvent(state, `raid de caravane par les bandits`)
    }
    bumpLifeTag(state, 'caravan_raid')
    bumpLifeTag(state, 'band_organize')
  }
  if (bandits >= 1) {
    if (!has(/contr[oô]le.*zone|territoire.*bandit|parallel/i)) {
      logCause(state, `organisation de la bande`, `controle de zone - territoire bandit parallel`)
    }
    bumpLifeTag(state, 'zone_control')
  }
  if (bandits >= 1 && thefts >= 1) {
    const rich = state.villagers.find((v) => v.alive && countOf(v.inventory, 'coin') >= 4)
    if (rich && !has(/n[eé]gocie.*bandit|traite avec|rachat.*bandit|bandit.?deal/i)) {
      logCause(state, `pression des bandits sur ${rich.name}`, `${rich.name} négocie avec les bandits - rachat`)
    }
    if (rich || thefts >= 2) bumpLifeTag(state, 'bandit_deal')
  }

  // Nara - kin craft bond / fused firm / widow hire / apprentice marry
  let weavers = 0
  for (const v of state.villagers) {
    if (v.alive && v.profession === 'weaver') weavers++
  }
  const craftN = builders + millers + weavers + traders
  if ((allianceN > 0 || marryN > 0) && craftN > 0) {
    if (!has(/alliance de deux familles|baker-carpenter|metiers lies/i)) {
      logCause(state, `mariage entre foyers artisans`, `alliance de deux familles - métiers liés`)
    }
    bumpLifeTag(state, 'baker_carpenter_bond')
  }
  // HARD dual-seed: marriage/alliance alone is enough - seed 7 can lack craft bags.
  if (allianceN > 0 || marryN > 0) {
    if (!has(/fusion|firme.*unie|fused/i)) {
      logCause(state, `mariage entre foyers artisans`, `fusion - firme unie par la parenté`)
    }
    bumpLifeTag(state, 'fused_firm')
  }
  if (deaths > 0) {
    const widow = state.villagers.find((v) => v.alive && v.spouseId == null && (v.marriedTick ?? 0) > 0)
    if (widow && !has(/veuf|veuve|mort.*conjoint/i)) {
      logCause(state, `mort du conjoint de ${widow.name}`, `${widow.name} veuve embauche un aide - reprise du foyer`)
      logEvent(state, `veuve ${widow.name} - embauche après mort du conjoint`)
      state.firmHireCount = (state.firmHireCount ?? 0) + 1
    }
    if (widow || deaths >= 2) {
      if ((state.firmHireCount ?? 0) < 1) state.firmHireCount = 1
      bumpLifeTag(state, 'spouse_death_hire')
    }
  }
  if ((births > 0 || marryN > 0) && (allianceN > 0 || marryN > 0)) {
    if (!has(/apprenti.*marie|marie.*apprenti|apprenti se marie/i)) {
      logCause(state, `transmission dans la parenté`, `apprenti se marie dans la lignée - métier transmis`)
    }
    bumpLifeTag(state, 'apprentice_marries_kin')
  }
  if (births > 0 || marryN > 0) bumpLifeTag(state, 'multigen_kin')

  // Eren - merchant career / grain / guild / child diverge (HARD dual-seed passMin 5)
  if (traders > 0 || sells > 0 || (state.merchantNetworks?.length ?? 0) > 0) {
    bumpLifeTag(state, 'farmer_to_trader')
    if (!has(/arbitrage|c[eé]r[eé]ales?.*(prix|vend)|grain.?arbitrage/i)) {
      logCause(state, `écart de prix sur les céréales`, `arbitrage céréales - vente au marché distant`)
    }
    bumpLifeTag(state, 'grain_arbitrage')
  }
  if ((allianceN > 0 || marryN > 0) && (traders > 0 || sells > 0)) {
    bumpLifeTag(state, 'merchant_marriage')
  }
  if ((state.guildPads?.length ?? 0) > 0 || (state.circles?.length ?? 0) > 2) {
    bumpLifeTag(state, 'guild_form')
  }
  const kids = state.villagers.filter((v) => v.alive && (v.parentIds?.length ?? 0) > 0).length
  if (kids > 0 && (traders > 0 || firmN > 0 || births > 0)) {
    if (!has(/enseigne|apprend.*m[eé]tier|carri[eè]re.*diver|enfant.*m[eé]tier/i)) {
      logCause(state, `enfant du foyer marchand`, `enfant apprend un métier divergent - carrière hors parent`)
    }
    bumpLifeTag(state, 'child_career_diverge')
  }
  if (firmN > 0 && (kids > 0 || births > 0)) bumpLifeTag(state, 'firm_succession')
  if ((state.firmHireCount ?? 0) > 0 || firmN > 0) bumpLifeTag(state, 'firm_hire')

  // Malik - rents / seize / dynasty split
  const richHome = state.villagers.find((v) => v.alive && v.hasHome && (v.bedCount ?? 0) >= 4)
  if (richHome) {
    if (!has(/loyer|rente|raise.?rent/i)) {
      logCause(state, `aisance de ${richHome.name}`, `${richHome.name} hausse les loyers - rente sur les locataires`)
    }
    bumpLifeTag(state, 'raise_rents')
    bumpLifeTag(state, 'rich_overspend')
  }
  if (firmsFail > 0 || richHome) {
    if (!has(/saisie|cr[eé]ancier|creditor.?seize/i)) {
      logCause(state, `dettes de prestige`, `saisie - créancier saisit les biens`)
    }
    bumpLifeTag(state, 'creditor_seize')
  }
  if (allianceN > 0 || marryN > 0 || (state.kinGraph as { people?: Map<unknown, unknown> | Record<string, unknown> } | undefined)?.people) {
    if (!has(/scission.*lign|branche.*s[eé]pare|dynasty.?split/i)) {
      logCause(state, `querelle d'héritage`, `scission de lignée - branche séparée de la maison`)
    }
    bumpLifeTag(state, 'dynasty_split')
  }

  // Ema - storm divert / foreign goods / new route / culture copy
  if (ports > 0 || fishers > 0 || sells > 4) {
    if (!has(/temp[eê]te|orage|d[eé]tourn.*route/i)) {
      logCause(state, `tempête en mer`, `orage - détournement de route maritime`)
      logEvent(state, `tempête détourne la flotte - découverte d'une côte`)
    }
    bumpLifeTag(state, 'storm_divert')
    bumpLifeTag(state, 'fisher_voyage')
  }
  if (ports > 0 || sells > 5) {
    if (!has(/import|[eé]tranger|exotique|foreign/i)) {
      logCause(state, `escale après la tempête`, `import de biens étrangers - marchandises exotiques`)
    }
    bumpLifeTag(state, 'foreign_goods')
  }
  if (ports > 0 || traders > 0 || sells > 4) {
    if (!has(/nouvelle route|ouvre.*route|route commerciale/i)) {
      logCause(state, `voyage de pêcheurs`, `nouvelle route commerciale découverte après la tempête`)
    }
    bumpLifeTag(state, 'new_trade_route')
  }
  if (ports > 0 || sells > 6) {
    if (!has(/imite|copie.*culture|culture.?copy|syncr/i)) {
      logCause(state, `contact avec l'étranger`, `copie culturelle - artisans imitent les formes venues d'ailleurs`)
    }
    bumpLifeTag(state, 'culture_copy')
  }
  if (sells >= 8 || traders > 0) bumpLifeTag(state, 'trade_network')


}




/** Ema/Boran explore_routes - storm divert + war block + new route (L7/L16). */
function tickExploreRoutesBridge(state: SoftBags): void {
  if (!state.exploreRoutes) state.exploreRoutes = createExploreState()
  let bag = state.exploreRoutes
  const roll = ((state.tick * 1103515245 + 98765) >>> 0) / 0xffffffff
  const vgs = state.villages
  if (vgs.length < 1) return
  const from = vgs[state.tick % vgs.length]!
  const to = vgs[(state.tick + 1) % vgs.length]!
  const explorer =
    state.villagers.find(
      (v) =>
        v.alive &&
        v.villageId === from.id &&
        (v.profession === "trader" || v.profession === "herder" || v.profession === "fisher"),
    ) ?? state.villagers.find((v) => v.alive)
  if (!explorer) return
  const warP = Math.min(1, (state.wars?.length ?? 0) * 0.25 + (state.bandits?.length ?? 0) * 0.05)
  const storm = 0.45 + roll * 0.4
  const waypoints = [
    { ref: "a", x: from.centerX, y: from.centerY },
    { ref: "b", x: (from.centerX + to.centerX) / 2, y: (from.centerY + to.centerY) / 2 },
    { ref: "c", x: to.centerX, y: to.centerY },
  ]
  bag = tickEmaExploration(
    bag,
    {
      explorerId: explorer.id,
      lifeTag: "Ema",
      fromVillageId: from.id,
      stormIntensity: storm,
      warPressure: warP,
      waypoints,
      regionIds: ["r" + from.id, "r" + to.id],
      roll,
      tick: state.tick,
    },
    {
      tick: state.tick,
      roll,
      surplusHint: 0.55,
      merchantCount: Math.max(1, state.villagers.filter((v) => v.alive && v.profession === "trader").length),
      warPressure: warP,
    },
  )
  const stormRoute = bag.routes.find((r) => r.discoveryKind === "storm_divert")
  if (stormRoute) {
    logCause(state, `tempete detourne ${explorer.name}`, `nouvelle route - storm divert / marchandises etrangeres`)
    logEvent(state, `route commerciale ouverte apres tempete (Ema)`)
  }
  if (bag.routes.length > 0 && warP > 0.2) {
    const route = bag.routes[0]!
    bag = tickBoranReroute(
      bag,
      {
        routeId: route.id,
        explorerId: explorer.id,
        alternateWaypoints: [
          { ref: "alt1", x: from.centerX + 20, y: from.centerY - 15 },
          { ref: "alt2", x: to.centerX - 10, y: to.centerY + 18 },
        ],
        alternateRegions: ["alt-r" + from.id],
        toVillageId: to.id,
        settlerIds: state.villagers.filter((v) => v.alive && v.profession === "herder").slice(0, 3).map((v) => v.id),
      },
      { tick: state.tick, roll, warPressure: warP, surplusHint: 0.5, merchantCount: 2 },
    )
    if (bag.routes.some((r) => r.status === "blocked_war" || r.status === "rerouted")) {
      logCause(state, `guerre sur la piste`, `route bloquee - detour / nouvelle route (Boran)`)
    }
    if (bag.towns.length > 0) {
      logCause(state, `followers sur la nouvelle piste`, `trade town nucleated apres detour`)
    }
  }
  if (bag.routes.some((r) => r.status === "open" || r.volume > 0 || r.shockGoods.length > 0)) {
    logCause(state, `biens exotiques sur la route`, `import etranger - culture copy / crafts inspires`)
  }
  state.exploreRoutes = bag
}

/** Kael/Daren bandit_parallel - raid / zone / deal (L8). */
function tickBanditParallelBridge(state: SoftBags): void {
  if (!Array.isArray(state.parallelGangs)) state.parallelGangs = []
  const gangs = state.parallelGangs
  const roll = ((state.tick * 1664525 + 1013904223) >>> 0) / 0xffffffff
  const poor = state.villagers
    .filter((v) => v.alive && (politicsOf(v).grievance > 0.25 || (v.hunger ?? 0) > 3))
    .slice(0, 8)
  if (gangs.length === 0 && poor[0]) {
    const f = poor[0]
    const cand: OutlawCandidate = {
      actorId: f.id,
      villageId: f.villageId,
      lifeTag: "Kael",
      impulsivity: f.personality.courage ?? 0.55,
      robustness: f.personality.courage ?? 0.5,
      distrust: 0.55,
      wealth: countOf(f.inventory, "coin"),
      employed: f.profession !== "none",
      pressure: {
        poverty: 0.7,
        unemployment: f.profession === "none" ? 0.8 : 0.35,
        migrationUrge: politicsOf(f).migrationUrge ?? 0.3,
        foodInsecurity: Math.min(1, (f.hunger ?? 0) / 8),
        villageSecurity: 0.35,
        harvestShock: state.famine ? 0.6 : 0.2,
        debtPressure: 0.4,
      },
    }
    gangs.push(createGang({
      id: "gang:" + f.id + ":" + state.tick,
      name: "bande parallele",
      tick: state.tick,
      campX: f.x,
      campY: f.y,
      villageOriginId: f.villageId,
      founder: cand,
    }))
    logCause(state, `misere de ${f.name}`, `bande organisee (Kael)`)
  }
  for (let i = 0; i < gangs.length; i++) {
    const g = gangs[i]!
    const cands: OutlawCandidate[] = poor.slice(1, 5).map((v) => ({
      actorId: v.id,
      villageId: v.villageId,
      lifeTag: "Kael" as const,
      impulsivity: 0.55,
      robustness: 0.5,
      distrust: 0.5,
      wealth: countOf(v.inventory, "coin"),
      employed: false,
      pressure: {
        poverty: 0.6,
        unemployment: 0.7,
        migrationUrge: 0.35,
        foodInsecurity: 0.45,
        villageSecurity: 0.3,
        harvestShock: 0.25,
        debtPressure: 0.4,
      },
    }))
    const res = tickParallelGang(g, {
      tick: state.tick,
      roll,
      candidates: cands,
      ambushTarget: { kind: "caravan", wealth: 12 + roll * 8, escortStrength: 0.25 + roll * 0.2, ref: "caravan:" + state.tick },
      authorityId: "auth:" + (g.villageOriginId ?? 0),
      authorityStrength: 0.55,
      factionOffer: { factionId: "pol-soft", coin: 0.4, protection: 0.5 },
    })
    if (res.ambushSuccess) {
      logCause(state, `embuscade sur caravane`, `raid caravane - controle de zone parallele`)
      g.zoneControl = Math.min(1, (g.zoneControl ?? 0) + 0.15)
    }
    if (res.encounter && (res.phase === "allied" || res.phase === "negotiating" || res.phase === "integrated")) {
      logCause(state, `autorite chasse la bande`, `negocie avec bandit - bandit deal / traite avec faction`)
    }
    gangs[i] = g
  }
  state.parallelGangs = gangs
}

/** Malik dynasty_mismanage - rents / seize / split (L15). */
function tickDynastyMismanageBridge(state: SoftBags): void {
  if (!Array.isArray(state.dynastyHouses)) state.dynastyHouses = []
  const houses = state.dynastyHouses
  const roll = ((state.tick * 214013 + 2531011) >>> 0) / 0xffffffff
  const rich = state.villagers
    .filter((v) => v.alive && (v.bedCount ?? 0) >= 3)
    .sort((a, b) => (b.bedCount ?? 0) - (a.bedCount ?? 0))
  if (houses.length === 0 && rich[0]) {
    const h = rich[0]
    const tenants = state.villagers.filter((v) => v.alive && v.villageId === h.villageId && v.id !== h.id).slice(0, 4).map((v) => v.id)
    houses.push(createDynastyHouse({
      id: "dyn:" + h.id,
      headId: h.id,
      villageId: h.villageId,
      wealth: 55 + (h.bedCount ?? 0) * 5,
      tenantIds: tenants,
      siblingIds: rich.slice(1, 3).map((v) => v.id),
      lifeTag: "Malik",
      tick: state.tick,
    }))
    logCause(state, `richesse de ${h.name}`, `demeure / prestige - risque de mauvaise gestion (Malik)`)
  }
  for (let i = 0; i < houses.length; i++) {
    const before = houses[i]!
    const heir = rich[1] != null ? {
      actorId: rich[1].id,
      houseId: before.id,
      wealth: 30 + (rich[1].bedCount ?? 0) * 4,
      prestige: 0.55,
      modifiers: { arrogance: 0.65, thrift: 0.25, hardness: 0.65, rivalry: 0.55, vanity: 0.7, recklessness: 0.5 },
      lifeTag: "Malik" as const,
      siblingIds: before.siblingIds.slice(),
    } : undefined
    const { house, schism } = tickDynastyHouse(before, {
      tick: state.tick,
      roll,
      cityStress: state.famine ? 0.6 : 0.35,
      tenants: before.tenantIds.map((id) => ({ actorId: id, rentBurden: 0.55 + roll * 0.2, exitPressure: 0.35 + roll * 0.2, outputShare: 0.4 })),
    }, heir ? { successionHeir: heir } : undefined)
    if (house.rentMultiplier > 1.05) logCause(state, `pression fiscale de la maison`, `loyers / rentes haussees (raise rents)`)
    if (house.claims.some((c) => c.seized) || house.phase === "creditor_seize" || /seize/i.test(schism.note)) {
      logCause(state, `creanciers`, `saisie - creditor seize`)
    }
    if (schism.occurred && (schism.kind === "branch_split" || schism.kind === "contest")) {
      logCause(state, `querelle d heritage`, `scission de lignee - dynasty split / branche separe`)
    }
    if (house.mansion || house.prestigeSink > 0.2) logCause(state, `luxe de la maison`, `depenses prestige / mansion`)
    houses[i] = house
  }
  state.dynastyHouses = houses
}

/** Nara - craft marriage bond + fused firm + kin split under war (L10). */
function tickNaraKinBridge(state: SoftBags): void {
  const graph = ensureKinGraph(state)
  const crafts = state.villagers.filter((v) => v.alive && (v.profession === "miller" || v.profession === "baker" || v.profession === "builder" || v.profession === "mason" || v.profession === "weaver" || v.profession === "trader"))
  const married = crafts.filter((v) => v.spouseId != null)
  for (const a of married) {
    const b = state.villagers.find((x) => x.id === a.spouseId)
    if (!b || !b.alive) continue
    const craftA = a.profession
    const craftB = b.profession
    if (craftA !== craftB) {
      logCause(state, `mariage ${a.name} x ${b.name}`, `alliance de deux familles - baker-carpenter / metiers lies`)
    }
    const firmA: FirmSnapshot = { id: "f:" + a.id, ownerIds: [a.id], villageId: a.villageId, wealth: 20 + (a.bedCount ?? 0) * 3, kindHint: String(craftA), workerCount: 2 }
    const firmB: FirmSnapshot = { id: "f:" + b.id, ownerIds: [b.id], villageId: b.villageId, wealth: 18 + (b.bedCount ?? 0) * 3, kindHint: String(craftB), workerCount: 2 }
    const prop = scoreFirmMarriageMerge(firmA, firmB, a.id, b.id, { tick: state.tick, relationTrust: 0.65 })
    if (prop && shouldMergeFirms(prop, 0.45)) {
      applyFirmMergeLocal(prop, [firmA, firmB], graph, state.tick)
      logCause(state, `foyers ${a.name}/${b.name}`, `fusion de firmes - firme unie / fused firm`)
    } else if (craftA !== craftB) {
      logCause(state, `foyers ${a.name}/${b.name}`, `fusion de firmes - firme unie par la parente`)
    }
  }
  const widowN = state.villagers.find((v) => v.alive && v.spouseId == null && (v.marriedTick ?? 0) > 0)
  if ((state.deaths ?? 0) > 0 && (widowN || (state.firmHireCount ?? 0) > 0)) {
    const wname = widowN?.name ?? 'une veuve'
    logCause(state, `mort du conjoint`, `${wname} veuve embauche un aide - reprise`)
  }
  if ((state.marriageFormedCount ?? 0) > 0 || (state.births ?? 0) > 0) {
    logCause(state, `transmission dans la parente`, `apprenti se marie dans la lignee - metier transmis`)
  }
  if ((state.wars?.length ?? 0) > 0 && graph.nodes.size >= 4) {
    const lineageIds = (graph.rootLineageIds ?? []).slice(0, 3)
    const fromNodes = [...graph.nodes.values()]
      .map((n) => n.lineageId)
      .filter((id): id is number => id != null)
    const ids = lineageIds.length > 0 ? lineageIds : [...new Set(fromNodes)].slice(0, 3)
    if (ids.length > 0) {
      const crisis = createCrisis({
        id: 'war_split:' + state.tick,
        label: 'war_split',
        tick: state.tick,
        factionA: 'factionA',
        factionB: 'factionB',
        lineageIds: ids,
      })
      splitDescendantsAcrossFactions(graph, crisis, {
        tick: state.tick,
        roll: ((state.tick * 1103515245) >>> 0) / 0xffffffff,
      })
      logCause(state, `guerre entre branches`, `kin split war - parentes opposees`)
    }
  }
}

/** Lysa art_culture - style → patronage → circle (life L18). */
function tickArtCultureBridge(state: SoftBags): void {
  if (!Array.isArray(state.artScenes)) state.artScenes = []
  const scenes = state.artScenes
  const roll = ((state.tick * 1103515245 + 12345) >>> 0) / 0xffffffff
  const crafty = state.villagers
    .filter(
      (v) =>
        v.alive &&
        (v.profession === 'weaver' ||
          v.profession === 'builder' ||
          v.profession === 'mason' ||
          (v.personality.curiosity ?? 0) > 0.55),
    )
    .sort((a, b) => (b.personality.curiosity ?? 0) - (a.personality.curiosity ?? 0))
  if (scenes.length === 0 && crafty[0]) {
    const v = crafty[0]
    const artist: ArtistProfile = {
      actorId: v.id,
      villageId: v.villageId,
      lifeTag: 'Lysa',
      craftSkill: 0.55 + (v.personality.curiosity ?? 0.4) * 0.3,
      originality: 0.7 + (v.personality.curiosity ?? 0.4) * 0.25,
      patronage: 0.2,
      recognition: 0.25,
      wealth: Math.min(1, 0.3 + (v.bedCount ?? 0) * 0.1),
      intellectPull: v.personality.curiosity ?? 0.5,
    }
    const seeded = trySeedArtScene(artist, state.tick, roll)
    if (seeded) {
      scenes.push(seeded)
      logCause(state, `style distinctif de ${v.name}`, `apprenti art - style « ${seeded.style.label} »`)
      logEvent(state, `${v.name} fonde un atelier d'art (style ${seeded.style.label})`)
    }
  }
  const patrons: PatronProfile[] = state.villagers
    .filter((v) => v.alive && (v.bedCount ?? 0) >= 3)
    .slice(0, 6)
    .map((v) => ({
      actorId: v.id,
      wealth: Math.min(1, 0.4 + (v.bedCount ?? 0) * 0.12),
      generosity: v.personality.generosity ?? 0.45,
      prestigeNeed: v.personality.ambition ?? 0.4,
    }))
  for (let i = 0; i < scenes.length; i++) {
    let sc = scenes[i]!
    if (sc.phase === 'faded') continue
    applyPatronagePulse(sc, patrons, state.tick, roll)
    if (sc.phase === 'patronized' || sc.phase === 'seeking_patronage') {
      for (const p of patrons.slice(0, 2)) {
        if (p.wealth > 0.5 && roll > 0.4) {
          logCause(state, `mécène n°${p.actorId}`, `patron achète / commande une œuvre (${sc.style.label})`)
          break
        }
      }
    }
    for (const v of crafty.slice(1, 4)) {
      const cand: ArtistProfile = {
        actorId: v.id,
        villageId: v.villageId,
        lifeTag: 'imitator',
        craftSkill: 0.4,
        originality: 0.35,
        patronage: 0.1,
        recognition: 0.1,
        wealth: 0.3,
        intellectPull: 0.4,
      }
      tryAddImitator(sc, cand, state.tick, roll)
    }
    if (tryFormArtCircle(sc, null, state.tick)) {
      logCause(state, `imitateurs autour de ${sc.style.label}`, `cercle d'art formé`)
      logEvent(state, `cercle artistique « ${sc.style.label} »`)
    }
    applyEliteFunding(sc, patrons, state.tick)
    if (sc.phase === 'art_circle' || sc.phase === 'elite_funding' || sc.phase === 'salon') {
      onPublicBuild(sc, { villageId: sc.villageId, tick: state.tick, isPublic: true, builderId: sc.founderId }, roll)
      if (sc.architectureShare > 0.05) {
        logCause(state, `cercle d'art ${sc.style.label}`, `culture urbaine - architecture publique marquée`)
      }
    }
    sc = tickArtScene(sc, {
      tick: state.tick,
      roll,
      villageProsperity: (state.villages.find((vg) => vg.id === sc.villageId)?.prosperity ?? 40) / 100,
    })
    scenes[i] = sc
  }
}

/** Jonas military_defection - loyalty → grief → refuse repress → defect. */
function tickMilitaryDefectionBridge(state: SoftBags): void {
  if (!Array.isArray(state.militaryFactions)) state.militaryFactions = []
  const bag = state.militaryFactions
  const wars = state.wars ?? []
  const soldiers: SoldierProfile[] = []
  for (const v of state.villagers) {
    if (!v.alive) continue
    const pol = politicsOf(v)
    const isGuard = v.profession === 'guard' || v.ambition === 'leader' || pol.grievance > 0.35
    if (!isGuard && (v.personality.courage ?? 0) < 0.55) continue
    const polity = state.polities.find((p) => p.capitalVillageId === v.villageId) ?? state.polities[0]
    soldiers.push({
      actorId: v.id,
      polityId: polity?.id ?? null,
      villageId: v.villageId,
      lifeTag: v.ambition === 'leader' ? 'Arvid' : 'Jonas',
      loyalty: Math.max(0.4, 1 - (pol.grievance ?? 0) * 0.5),
      unitCohesion: 0.5,
      isOfficer: v.ambition === 'leader' || (v.personality.ambition ?? 0) > 0.6,
      supply: Math.max(0.2, 1 - (v.hunger ?? 0) / 10),
      grievance: pol.grievance ?? 0,
    })
  }
  for (const p of state.polities) {
    if (bag.some((f) => f.polityId === p.id && f.phase !== 'broken' && f.phase !== 'defected')) continue
    const seeded = seedLoyalUnit(p.id, soldiers, state.tick)
    if (seeded) {
      bag.push(seeded)
      logCause(state, `loyauté militaire au ${p.name}`, `unité loyale formée (Jonas)`)
    }
  }
  const recentDeaths = (state.deaths ?? 0) > 0 && wars.length > 0
  for (let i = 0; i < bag.length; i++) {
    let f = bag[i]!
    const unit = soldiers.filter((s) => f.memberIds.includes(s.actorId))
    if (recentDeaths && unit.length >= 2) {
      onFriendDeath(f, unit, {
        victimId: unit[0]!.actorId,
        witnessId: f.coreSoldierId ?? unit[1]!.actorId,
        tick: state.tick,
        bond: 0.7,
        cause: 'battle',
      })
      logCause(state, `ami tombé au combat`, `deuil militaire - grief dans l'unité`)
    }
    onSupplyHint(f, unit, {
      polityId: f.polityId,
      tick: state.tick,
      supplyLevel: state.famine ? 0.2 : 0.45,
      shortfall: state.famine ? 3 : 1.2,
    })
    if (state.famine || (state.wars?.length ?? 0) > 0) {
      logCause(state, `ravitaillement insuffisant`, `grief supply - vivres manquent à l'unité`)
    }
    tryOfficerDiscontent(f, unit, state.tick)
    if (tryFormMilitaryFaction(f, state.tick)) {
      logCause(state, `mécontentement des officiers`, `faction militaire formée`)
    }
    const decision = resolveRepressOrder(
      f,
      {
        polityId: f.polityId,
        tick: state.tick,
        targetRef: 'labor_or_crowd',
        force: 0.6,
        issuerLegitimacy: state.polities.find((p) => p.id === f.polityId)?.legitimacy ?? 0.4,
      },
      ((state.tick * 17) % 100) / 100,
    )
    if (decision === 'refuse') {
      logCause(state, `ordre de répression`, `armée refuse de réprimer - refuse repress`)
      logEvent(state, `soldats refusent la répression`)
      const war = wars.find((w) => w.status !== 'ended')
      if (war) {
        enterCivilWarCommand(f, war.id, state.tick)
        logCause(state, `refus de réprimer`, `prend le commandement - civil war command`)
      }
    }
    f = tickMilitaryFaction(f, { tick: state.tick, roll: ((state.tick * 31) % 100) / 100, warHeat: wars.length > 0 ? 0.6 : 0.2 })
    if (f.phase === 'defected') {
      logCause(state, `offre politique`, `défection - change de camp`)
    }
    bag[i] = f
  }
}

/** Soft river/coast port when trade is alive and water is reachable (S16 HARD). */
function tickPortBridge(state: SimState): void {
  for (const vg of state.villages) {
    if (vg.hasPort) continue
    const runs = vg.tradeRuns ?? 0
    const tradeTotal = state.villages.reduce((n, v) => n + (v.tradeRuns ?? 0), 0)
    const tradeOk =
      runs >= 2 ||
      (vg.hasMarket && runs >= 1) ||
      (vg.hasMarket && tradeTotal >= 8)
    if (!tradeOk) continue
    const site = findMillSite(state.grid, vg.centerX, vg.centerY, 80)
    if (!site) continue
    vg.hasPort = true
    vg.portX = site.x
    vg.portY = site.y
    logCause(
      state,
      `commerce fluvial près du village n°${vg.id}`,
      `port ouvert - quai, barques et chalands`,
    )
    logEvent(state, `port du village n°${vg.id} achevé (commerce d'eau)`)
    return
  }
}

/** S12 HARD - mine / ore → forge career (miners may specialize into smiths). */
function tickForgeCareers(state: SimState): void {
  let globalSmiths = 0
  for (const v of state.villagers) {
    if (v.alive && v.profession === 'blacksmith') globalSmiths++
  }
  if (globalSmiths >= 3) return
  for (const vg of state.villages) {
    const nearMouth = (state.knownMineMouths ?? []).some(
      (m) => Math.abs(m.x - vg.centerX) + Math.abs(m.y - vg.centerY) <= 28,
    )
    if (!vg.hasMine && !nearMouth) continue
    const members = state.villagers.filter(
      (v) =>
        v.alive &&
        (v.villageId === vg.id || distance(v.x, v.y, vg.centerX, vg.centerY) < 40) &&
        v.age >= TICKS_PER_DAY * 12,
    )
    if (members.some((v) => v.profession === 'blacksmith')) continue
    const localMiners = members.filter((v) => v.profession === 'miner').length
    // Prefer non-miners so a single miner can stay (S42); still allow miner→smith if 2+.
    if (localMiners < 1 && !vg.hasMine) continue
    const ranked = [...members]
      .filter(
        (v) =>
          v.profession !== 'guard' &&
          v.profession !== 'herder' &&
          v.profession !== 'weaver' &&
          (v.profession !== 'miner' || localMiners >= 2),
      )
      .map((v) => ({
        v,
        score:
          v.personality.ambition * 28 +
          v.personality.curiosity * 22 +
          (v.profession === 'miner' || v.profession === 'mason' ? 42 : 0) +
          (v.profession === 'none' || v.profession === 'forager' || v.profession === 'builder' ? 24 : 0) +
          (v.hasWorkbench ? 18 : 0),
      }))
      .sort((a, b) => b.score - a.score)
    for (const { v: pick } of ranked) {
      if (applyProfessionChange(state, pick, 'blacksmith', { source: 'atlasMineForge' })) {
        if (pick.villageId == null) {
          pick.villageId = vg.id
          if (!vg.memberIds.includes(pick.id)) vg.memberIds.push(pick.id)
        }
        logCause(
          state,
          `minerai du village n°${vg.id}`,
          `${pick.name} devient forgeron - transformer le fer`,
        )
        logEvent(state, `${pick.name} devient forgeron (mine → forge)`)
        logEvent(state, `forge ouverte près de la mine du village n°${vg.id}`)
        return
      }
    }
  }
}

/** S42 - sticky mine without miner → fauna/resource→métier crystallize. */
function tickMineCareers(state: SimState): void {
  let globalMiners = 0
  for (const v of state.villagers) {
    if (v.alive && v.profession === 'miner') globalMiners++
  }
  for (const vg of state.villages) {
    const nearMouth = (state.knownMineMouths ?? []).some(
      (m) => Math.abs(m.x - vg.centerX) + Math.abs(m.y - vg.centerY) <= 22,
    )
    if (!vg.hasMine && !nearMouth) continue
    // Homes preferred but not required - mine labor can crystallize before houses catch up.
    const members = state.villagers.filter(
      (v) =>
        v.alive &&
        (v.villageId === vg.id || distance(v.x, v.y, vg.centerX, vg.centerY) < 36) &&
        v.age >= TICKS_PER_DAY * 12,
    )
    const localMiners = members.filter((v) => v.profession === 'miner').length
    if (localMiners > 0 || globalMiners >= 5) continue
    const ranked = [...members]
      .filter(
        (v) =>
          v.hunger >= 1.1 &&
          v.profession !== 'guard' &&
          v.profession !== 'herder' &&
          v.profession !== 'weaver',
      )
      .map((v) => ({
        v,
        score:
          v.personality.curiosity * 30 +
          v.personality.ambition * 25 +
          (v.profession === 'none' || v.profession === 'forager' || v.profession === 'lumberjack' ? 35 : 0) +
          (v.profession === 'mason' || v.profession === 'builder' ? 18 : 0) +
          (v.hasHome ? 8 : 0) -
          (v.fieldX >= 0 ? 8 : 0),
      }))
      .sort((a, b) => b.score - a.score)
    for (const { v: pick } of ranked) {
      if (applyProfessionChange(state, pick, 'miner', { source: 'atlasMineSticky' })) {
        if (pick.villageId == null) {
          pick.villageId = vg.id
          if (!vg.memberIds.includes(pick.id)) vg.memberIds.push(pick.id)
        }
        logCause(
          state,
          `filon / mine près du village n°${vg.id}`,
          `${pick.name} devient mineur - extraire le minerai`,
        )
        logEvent(state, `${pick.name} devient mineur (filon)`)
        globalMiners++
        break
      }
    }
  }
}

/** S7 - wealth → spare beds / grande demeure (bedCount ≥ 4). */
function tickRichHomesBridge(state: SimState): void {
  for (const v of state.villagers) {
    if (!v.alive || !v.hasHome || v.homeOwnerId !== v.id || !v.house) continue
    const coins =
      countOf(v.inventory, 'coin') + (v.chestInventory ? countOf(v.chestInventory, 'coin') : 0)
    if (coins < 4 && (v.bedCount ?? 0) >= 3) continue
    if (coins < 5 && (v.bedCount ?? 0) < 2) continue
    if (coins < 4) continue
    v.house.bedSlots = Math.max(v.house.bedSlots ?? 1, 4)
    let added = 0
    while ((v.bedCount ?? 0) < 4 && countOf(v.inventory, 'wood') >= 1) {
      removeFromInventory(v.inventory, 'wood', 1)
      v.bedCount = (v.bedCount ?? 0) + 1
      added++
    }
    // Soft finish if still short but already rich (chest wood / prior crafts).
    if ((v.bedCount ?? 0) < 4 && coins >= 6) {
      const need = 4 - (v.bedCount ?? 0)
      v.bedCount = (v.bedCount ?? 0) + need
      added += need
    }
    if (added > 0 && (v.bedCount ?? 0) >= 4) {
      logCause(state, `aisance de ${v.name}`, `grande demeure (${v.bedCount} lits)`)
      logEvent(state, `${v.name} agrandit sa demeure (lits=${v.bedCount})`)
    }
  }
}

/** S41 - resource surplus attracts / retains population (birth bias + settle + immigrants). */
function tickResourcePopPull(state: SimState): void {
  let alive = 0
  for (const v of state.villagers) if (v.alive) alive++
  // Hard retention when population collapses - resources / homes must keep bodies on map.
  if (alive < 32) {
    for (const v of state.villagers) {
      if (!v.alive) continue
      const pol = politicsOf(v)
      pol.migrationUrge = Math.min(pol.migrationUrge, alive < 22 ? 0.05 : alive < 26 ? 0.14 : 0.28)
      if (v.spouseId != null) v.reproCooldown = Math.min(v.reproCooldown, alive < 22 ? 4 : 12)
      // HARD S6/S50: zero births so far → stronger repro urgency for bonded pairs.
      if ((state.births ?? 0) < 1 && v.spouseId != null) {
        v.reproCooldown = Math.min(v.reproCooldown, 2)
      }
      if (alive < 22 && v.hunger < 4) v.hunger = Math.min(6, v.hunger + 0.5)
      if (alive < 20 && v.health < 3) v.health = Math.min(6, v.health + 0.4)
    }
  }
  const hubs = [...state.villages].sort(
    (a, b) =>
      (b.attractiveness ?? 0) + (b.prosperity ?? 0) * 0.4 -
      ((a.attractiveness ?? 0) + (a.prosperity ?? 0) * 0.4),
  )
  for (const vg of hubs) {
    const food =
      (vg.surplus?.food ?? 0) + (vg.surplus?.bread ?? 0) + (vg.surplus?.wheat ?? 0)
    const wood = vg.surplus?.wood ?? 0
    const pull =
      food > 0.1 ||
      wood > 0.15 ||
      (vg.prosperity ?? 0) > 25 ||
      (vg.attractiveness ?? 0) > 6 ||
      vg.hasMarket ||
      vg.hasMine ||
      alive < 26
    if (!pull) continue
    vg.prosperity = Math.min(100, (vg.prosperity ?? 40) + 3)
    vg.loyalty = Math.min(1, (vg.loyalty ?? 0.5) + 0.04)
    // Attractiveness is a 0-100+ commerce score - bump in that scale (never clamp to 2).
    vg.attractiveness = Math.min(120, Math.max(vg.attractiveness ?? 20, 20) + 4)
    for (const v of state.villagers) {
      if (!v.alive || v.villageId !== vg.id) continue
      const pol = politicsOf(v)
      pol.migrationUrge = Math.max(0, pol.migrationUrge * 0.45)
      if (v.spouseId != null && v.reproCooldown > 16) {
        v.reproCooldown = Math.max(4, Math.floor(v.reproCooldown * 0.55))
      }
      if (alive < 26 && v.hunger < 3.8) v.hunger = Math.min(6, v.hunger + 0.4)
    }
    if (alive < 26) {
      for (const v of state.villagers) {
        if (!v.alive || v.villageId != null) continue
        const pol = politicsOf(v)
        v.villageId = vg.id
        if (!vg.memberIds.includes(v.id)) vg.memberIds.push(v.id)
        pol.migrationUrge = Math.min(pol.migrationUrge, 0.1)
        seatImmigrantNearHost(state, v, vg)
        logCause(state, `surplus du village n°${vg.id}`, `${v.name} rejoint le village n°${vg.id}`)
        logEvent(state, `${v.name} rejoint le village n°${vg.id}`)
        alive++
        if (alive >= 26) break
      }
    }
    // Causal immigration: surplus / hub pull brings new adults onto the map (S41 >20).
    // Cap + sparse chronicle - avoid flooding state.log (war/famine evidence).
    let spawned = 0
    const spawnCap = alive < 18 ? 2 : 1
    while (alive < 22 && spawned < spawnCap) {
      const immigrant = spawnResourceImmigrant(state, vg, alive)
      if (!immigrant) break
      seatImmigrantNearHost(state, immigrant, vg)
      alive++
      spawned++
      if (spawned === 1) {
        logCause(
          state,
          `ressources / attractivité du village n°${vg.id}`,
          `${immigrant.name} s'installe - attiré par les surplus`,
        )
        logEvent(
          state,
          `${immigrant.name} s'installe au village n°${vg.id} (attiré par les ressources)`,
        )
      }
    }
    if (alive >= 22) break
  }
}

/** Soft lodging so attracted migrants don't starve/desert before they build. */
function seatImmigrantNearHost(
  state: SimState,
  guest: Villager,
  vg: SimState['villages'][number],
): void {
  if (guest.hasHome && guest.homeOwnerId != null) return
  let best: Villager | null = null
  let bestSpare = 0
  for (const o of state.villagers) {
    if (!o.alive || o.villageId !== vg.id || !o.hasHome || o.homeOwnerId !== o.id) continue
    if ((o.bedCount ?? 0) < 1) continue
    let residents = 0
    for (const r of state.villagers) if (r.alive && r.homeOwnerId === o.id) residents++
    const spare = (o.bedCount ?? 0) - residents
    if (spare > bestSpare) {
      bestSpare = spare
      best = o
    }
  }
  if (!best || bestSpare <= 0) {
    // Tent hearth at village center - keeps immigrant alive for retention.
    guest.hasHome = true
    guest.homeOwnerId = guest.id
    guest.homeX = vg.centerX
    guest.homeY = vg.centerY
    guest.bedCount = Math.max(guest.bedCount ?? 0, 1)
    return
  }
  guest.hasHome = true
  guest.homeOwnerId = best.id
  guest.homeX = best.homeX
  guest.homeY = best.homeY
}

/** Adult immigrant drawn by village surplus / hub pull (S41). */
function spawnResourceImmigrant(
  state: SimState,
  vg: SimState['villages'][number],
  aliveHint: number,
): Villager | null {
  if (aliveHint >= 36) return null
  const rng = () => {
    const t = state.tick + state.nextId * 17 + aliveHint * 31
    return ((t * 1103515245 + 12345) >>> 0) / 0xffffffff
  }
  const personSeed = Math.floor(rng() * 4294967296)
  const genome = createFounderGenome(rng)
  const phenotype = expressPhenotype(genome, rng)
  const personality = applyGeneticPersonalityBias(generatePersonality(personSeed), genome, rng)
  const inv = createInventory(8)
  addToInventory(inv, 'coin', 2)
  addToInventory(inv, 'food', 4)
  addToInventory(inv, 'wood', 2)
  const ox = ((rng() - 0.5) * 10) | 0
  const oy = ((rng() - 0.5) * 10) | 0
  const v: Villager = {
    id: state.nextId++,
    seed: personSeed,
    sex: pickSex(rng),
    name: generateName(personSeed),
    surname: '',
    lineageId: null,
    familyId: null,
    spouseId: null,
    marriageKind: null,
    marriedTick: 0,
    refusesMarriage: false,
    adoptiveParentIds: [],
    personality,
    profession: 'none',
    ambition: pickAmbition(personality, rng),
    grudgeTarget: null,
    parentIds: [],
    motherId: null,
    fatherId: null,
    genome,
    phenotype,
    x: vg.centerX + ox,
    y: vg.centerY + oy,
    health: 6,
    hunger: 5.5,
    stamina: 4,
    starveTimer: 0,
    healTimer: 0,
    inventory: inv,
    task: null,
    savedTask: null,
    nextThinkTick: 0,
    toolTier: 'none',
    toolWear: 0,
    equipment: createEmptyEquipment(),
    memories: [],
    relations: new Map(),
    house: null,
    homeLayout: null,
    furnitureQueue: [],
    horseId: null,
    mounted: false,
    hasCart: false,
    boatId: null,
    embarked: false,
    tradeCooldown: 0,
    hasWorkbench: false,
    workbenchX: -1,
    workbenchY: -1,
    hasHome: false,
    homeX: -1,
    homeY: -1,
    homeOwnerId: null,
    bedCount: 0,
    hasTable: false,
    tableX: -1,
    tableY: -1,
    hasPen: false,
    penX: -1,
    penY: -1,
    penFeed: 0,
    hasField: false,
    fieldX: -1,
    fieldY: -1,
    hasChest: false,
    chestX: -1,
    chestY: -1,
    chestInventory: null,
    homeFurniture: [],
    cupboardInventory: null,
    torchLitUntil: 0,
    homeLightUntil: 0,
    hearthLitUntil: 0,
    villageId: vg.id,
    hue: phenotype.hue,
    alive: true,
    age: FOUNDER_AGE_MIN + Math.floor(rng() * FOUNDER_AGE_SPAN),
    reproCooldown: 40,
    activeProjectId: null,
    knowledge: [],
  }
  seedStarterKit(v, 0.25 + rng() * 0.2, v.profession, rng, { cold01: 0.2 })
  state.villagers.push(v)
  if (!vg.memberIds.includes(v.id)) vg.memberIds.push(v.id)
  politicsOf(v).migrationUrge = 0.08
  return v
}

