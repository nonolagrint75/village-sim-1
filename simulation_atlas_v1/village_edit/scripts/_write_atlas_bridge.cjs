const fs = require('fs')
const out = String.raw`/**
 * Atlas life-systems tick — wires staging packs into live SimState without day scripts.
 * HOT: wool_industry → herder/weaver (S9/S10). Hold: credit_bank (S20), kin_multigen (S50).
 * READY bridges: guild_formation, merchant_network, succession_civil, religion_schism,
 * agri_invention, military_dynasty.
 */
import { applyProfessionChange } from '../careers'
import { countOf, addToInventory, removeFromInventory } from '../inventory'
import { TICKS_PER_DAY, TICKS_PER_YEAR } from '../calendar'
import { logCause, politicsOf } from '../politics'
import { logEvent } from '../social'
import type { SimState, Villager } from '../types'
import { distance } from '../world'
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
  tickGuildPad,
  type GuildPad,
  type PractitionerHint,
} from './packs/guild_formation'
import {
  createEmptyNetwork,
  tickMerchantNetwork,
  tryFarmerToTrader,
  type MerchantNetworkState,
  type TraderProfile,
} from './packs/merchant_network'
import {
  seedSuccessionCrisis,
  registerClaimant,
  formClaimantFactions,
  tickSuccessionCivil,
  type SuccessionCrisis,
  type ClaimantProfile,
} from './packs/succession_civil'
import {
  tryReinterpretCreed,
  applyFaithFollowing,
  tickReligionSchism,
  type FaithMovement,
  type BelieverProfile,
} from './packs/religion_schism'
import {
  tryInventFarmTool,
  tickAgriInvention,
  type AgriInvention,
} from './packs/agri_invention'
import {
  seedDynastyTrack,
  tryFarmerToGuard,
  applyBanditTrauma,
  tickMilitaryDynasty,
  type MilitaryDynasty,
} from './packs/military_dynasty'

type SoftBags = SimState & {
  creditBooks?: CreditBook[]
  kinGraph?: KinshipGraph
  woolIndustry?: WoolIndustryState
  guildPads?: GuildPad[]
  merchantNetworks?: MerchantNetworkState[]
  successionCrises?: SuccessionCrisis[]
  faithMovements?: FaithMovement[]
  agriInventions?: AgriInvention[]
  militaryDynasties?: MilitaryDynasty[]
  atlasLastTick?: number
}

function soft(state: SimState): SoftBags {
  return state as SoftBags
}

function rngAt(tick: number, salt: number): number {
  const x = Math.sin(tick * 12.9898 + salt * 78.233) * 43758.5453
  return x - Math.floor(x)
}

function ensureCreditBooks(state: SoftBags): CreditBook[] {
  if (!Array.isArray(state.creditBooks)) state.creditBooks = []
  return state.creditBooks
}

function ensureKinGraph(state: SoftBags): KinshipGraph {
  if (!state.kinGraph) state.kinGraph = createEmptyKinGraph(state.tick)
  return state.kinGraph
}

function ensureWool(state: SoftBags): WoolIndustryState {
  if (!state.woolIndustry) {
    state.woolIndustry = createWoolIndustryState({
      settlementIds: state.villages.map((v) => v.id),
    })
  }
  return state.woolIndustry
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

/** After an informal peer lend — open/update a Soren credit book (panel + S20). */
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
  tryLendToBorrower(
    book,
    {
      actorId: borrower.id,
      wealth: countOf(borrower.inventory, 'coin'),
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
      logCause(state, 'aisance monetaire de ' + best.name, 'livre de credit informel ouvert')
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
            activeLoanCount: book.loans.filter((l) => l.status === 'active' && l.borrowerId === other.id).length,
            capitalNeed: Math.max(1, Math.round(need * 2)),
            villageId: other.villageId,
          },
          state.tick,
          rngAt(state.tick, other.id),
        )
        if (lent && ownerCoins >= 1) {
          removeFromInventory(owner.inventory, 'coin', 1)
          addToInventory(other.inventory, 'coin', 1)
          state.informalLendCount = (state.informalLendCount ?? 0) + 1
          logCause(state, 'livre de ' + owner.name, owner.name + " prete de l'argent a " + other.name)
          logEvent(state, owner.name + " prete de l'argent a " + other.name)
          break
        }
      }
    }
    tickCreditBook(
      book,
      {
        tick: state.tick,
        cityStress: state.famine ? 0.55 : 0.2,
        roll: rngAt(state.tick, book.ownerId),
      },
      {
        canPay: (borrowerId, amount) => {
          const v = state.villagers.find((o) => o.id === borrowerId && o.alive)
          if (!v) return 0
          return Math.min(amount, countOf(v.inventory, 'coin'))
        },
        relationRescueStrength: 0.35,
      },
    )
  }
}

function tickWoolBag(state: SoftBags): void {
  const wool = ensureWool(state)
  wool.tick = state.tick
  for (const vg of state.villages) {
    if (!wool.stocksBySettlement[vg.id]) {
      wool.stocksBySettlement[vg.id] = { sheep: 0, wool: 0, yarn: 0, cloth: 0, dyedCloth: 0 }
      wool.settlementStage[vg.id] = 'hamlet'
    }
    let sheepNear = 0
    for (const s of state.sheep ?? []) {
      if (s.alive && distance(s.x, s.y, vg.centerX, vg.centerY) < 64) sheepNear++
    }
    const stock = wool.stocksBySettlement[vg.id]!
    stock.sheep = sheepNear
    stock.wool = Math.max(stock.wool, (vg.surplus.wool ?? 0) + sheepNear * 0.15)
    if (sheepNear >= 4) vg.surplus.wool = Math.max(vg.surplus.wool ?? 0, sheepNear * 0.1)
  }
  tickWoolIndustry(wool, {
    regionalDemand: 0.55,
    settlementIds: state.villages.map((v) => v.id),
    inheritPressure: 0.2,
    rng: () => rngAt(state.tick, wool.firms.length + 3),
  })
  // Feed live prices from pack stocks when sheep without herders.
  let herders = 0
  let weavers = 0
  for (const v of state.villagers) {
    if (!v.alive) continue
    if (v.profession === 'herder') herders++
    if (v.profession === 'weaver') weavers++
  }
  let sheep = 0
  for (const s of state.sheep ?? []) if (s.alive) sheep++
  if (state.prices) {
    if (sheep >= 6 && herders === 0) {
      const base = state.prices.wool ?? 3
      state.prices.wool = Math.min(Math.max(base * 1.08, base + 0.2), 3 * 2.4)
    }
    if ((herders > 0 || sheep >= 8) && weavers === 0) {
      const base = state.prices.cloth ?? 5
      state.prices.cloth = Math.min(Math.max(base * 1.06, base + 0.25), 5 * 2.2)
    }
  }
}

/**
 * Fauna→métier: sheep → herder → weaver (S9/S10). Soft food gate; ranked retries.
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
      if (distance(s.x, s.y, vg.centerX, vg.centerY) < 72) sheepNear++
    }
    const foodOk =
      !state.famine ||
      (vg.surplus?.food ?? 0) + (vg.surplus?.bread ?? 0) + (vg.surplus?.wheat ?? 0) > 0.2 ||
      vg.memberIds.length >= 3

    const members = state.villagers.filter(
      (v) => v.alive && v.villageId === vg.id && v.age >= TICKS_PER_DAY * 12,
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
            (v.profession === 'none' || v.profession === 'forager' ? 45 : 0) +
            (v.profession === 'farmer' && v.fieldX < 0 ? 22 : 0) +
            (v.profession === 'farmer' ? 10 : 0) +
            (v.profession === 'lumberjack' || v.profession === 'builder' ? 14 : 0) +
            (!v.hasHome ? 8 : 0) -
            (v.fieldX >= 0 ? 8 : 0)
          return { v, score }
        })
        .sort((a, b) => b.score - a.score)
      for (const { v: pick } of ranked) {
        if (applyProfessionChange(state, pick, 'herder', { source: 'atlasWoolHerd' })) {
          logEvent(state, 'moutons pres du village -> ' + pick.name + ' devient eleveur (laine / troupeau)')
          logEvent(state, pick.name + ' devient eleveur (moutons)')
          globalHerders++
          localHerders++
          break
        }
      }
    }

    if (
      (localHerders > 0 || globalHerders > 0 || sheepNear >= 6) &&
      localWeavers === 0 &&
      globalWeavers < 4 &&
      foodOk &&
      (sheepNear >= 3 || (vg.surplus?.wool ?? 0) > 0.15)
    ) {
      const ranked = [...members]
        .filter((v) => v.profession !== 'herder' && v.profession !== 'guard' && v.profession !== 'miner')
        .map((v) => {
          const score =
            v.personality.sociability * 35 +
            v.personality.curiosity * 25 +
            (v.profession === 'none' || v.profession === 'forager' ? 35 : 0) +
            (v.profession === 'trader' ? 16 : 0) +
            (v.profession === 'builder' ? 10 : 0) -
            (v.fieldX >= 0 ? 8 : 0)
          return { v, score }
        })
        .sort((a, b) => b.score - a.score)
      for (const { v: pick } of ranked) {
        if (applyProfessionChange(state, pick, 'weaver', { source: 'atlasWoolWeave' })) {
          logEvent(state, 'laine disponible -> ' + pick.name + ' devient tisserand (cloth / wool)')
          logEvent(state, pick.name + ' devient tisserand (laine)')
          globalWeavers++
          localWeavers++
          break
        }
      }
    }
  }

  if (globalHerders > 0 && globalWeavers === 0 && !state.famine) {
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
            (v.profession === 'none' || v.profession === 'forager' ? 35 : 0) +
            (v.fieldX < 0 ? 18 : 0),
        }))
        .sort((a, b) => b.score - a.score)
      for (const { v: pick } of ranked) {
        if (applyProfessionChange(state, pick, 'weaver', { source: 'atlasWoolWeaveGlobal' })) {
          logEvent(state, pick.name + ' devient tisserand (laine)')
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

function tickGuildBridge(state: SoftBags): void {
  if (!Array.isArray(state.guildPads)) state.guildPads = []
  const pads = state.guildPads
  for (const vg of state.villages) {
    if (vg.memberIds.length < 3) continue
    const weavers = state.villagers.filter(
      (v) => v.alive && v.villageId === vg.id && (v.profession === 'weaver' || v.profession === 'builder'),
    )
    const traders = state.villagers.filter(
      (v) => v.alive && v.villageId === vg.id && v.profession === 'trader',
    )
    const tryKind = (
      kind: 'textile' | 'trade' | 'craft',
      pool: Villager[],
      tag: PractitionerHint['lifeTag'],
    ) => {
      if (pads.some((p) => p.villageId === vg.id && p.kind === kind)) return
      if (pool.length < (kind === 'art' ? 2 : 3)) return
      const practitioners: PractitionerHint[] = pool.slice(0, 6).map((v, i) => ({
        actorId: v.id,
        lifeTag: tag,
        craftSkill: 0.35 + v.personality.curiosity * 0.4,
        isApprentice: i > 2,
        shirking: 0.1,
        stake: countOf(v.inventory, 'coin') * 0.05,
      }))
      const pad = tryFormCraftCircle(vg.id, kind, practitioners, state.tick, rngAt(state.tick, vg.id + kind.length))
      if (pad) {
        pads.push(pad)
        logEvent(state, 'cercle ' + kind + ' forme au foyer #' + vg.id)
      }
    }
    tryKind('textile', weavers, 'Mira')
    tryKind('trade', traders, 'Eren')
    const crafts = state.villagers.filter(
      (v) =>
        v.alive &&
        v.villageId === vg.id &&
        (v.profession === 'blacksmith' || v.profession === 'mason' || v.profession === 'miller'),
    )
    tryKind('craft', crafts, 'generic')
  }
  for (let i = 0; i < pads.length; i++) {
    const pad = pads[i]!
    const practitioners: PractitionerHint[] = state.villagers
      .filter((v) => v.alive && pad.memberIds.includes(v.id))
      .map((v) => ({
        actorId: v.id,
        lifeTag: pad.kind === 'textile' ? 'Mira' : pad.kind === 'trade' ? 'Eren' : 'generic',
        craftSkill: 0.4,
        isApprentice: pad.apprenticeIds.includes(v.id),
        shirking: 0.1,
      }))
    pads[i] = tickGuildPad(pad, practitioners, {
      tick: state.tick,
      roll: rngAt(state.tick, i + 9),
      threat:
        pad.kind === 'textile'
          ? { undercutPressure: 0.3, levyPressure: 0.1, inputSqueeze: 0.25, rivalCount: 1 }
          : undefined,
    })
  }
}

function tickMerchantBridge(state: SoftBags): void {
  if (!Array.isArray(state.merchantNetworks)) state.merchantNetworks = []
  const nets = state.merchantNetworks
  for (const v of state.villagers) {
    if (!v.alive || v.villageId == null) continue
    if (v.profession !== 'farmer' && v.profession !== 'trader') continue
    if (nets.some((n) => n.nodes.some((node) => node.actorId === v.id))) continue
    if (nets.length >= 8) break
    const surplusGrain = (state.villages.find((g) => g.id === v.villageId)?.surplus.wheat ?? 0) * 10
    const profile: TraderProfile = {
      actorId: v.id,
      villageId: v.villageId,
      lifeTag: v.personality.curiosity > 0.55 ? 'Eren' : 'generic',
      professionHint: v.profession === 'trader' ? 'trader' : 'farmer',
      surplusGrain: Math.max(0, surplusGrain) + countOf(v.inventory, 'wheat'),
      wealth: countOf(v.inventory, 'coin'),
      curiosity: v.personality.curiosity,
      hasHorse: v.horseId != null,
      firmId: null,
      spouseId: v.spouseId,
      childIds: [],
      ageYears: Math.floor(v.age / TICKS_PER_YEAR),
    }
    if (profile.surplusGrain < 4 && profile.curiosity < 0.5 && profile.professionHint !== 'trader') continue
    const net = createEmptyNetwork(profile, state.tick)
    if (profile.professionHint === 'farmer') {
      tryFarmerToTrader(net, profile, state.tick, rngAt(state.tick, v.id))
      const node = net.nodes.find((n) => n.actorId === v.id)
      if (node?.phase === 'trader' && v.profession === 'farmer') {
        applyProfessionChange(state, v, 'trader', { source: 'atlasMerchantPivot' })
        logEvent(state, v.name + ' devient marchand (surplus / curiosite)')
      }
    }
    nets.push(net)
  }
  for (let i = 0; i < nets.length; i++) {
    nets[i] = tickMerchantNetwork(nets[i]!, {
      tick: state.tick,
      roll: rngAt(state.tick, i + 21),
      priceGapHint: Math.abs((state.prices.wheat ?? 2) - 2) / 2,
    })
  }
}

function tickSuccessionBridge(state: SoftBags): void {
  if (!Array.isArray(state.successionCrises)) state.successionCrises = []
  const crises = state.successionCrises
  for (const pol of state.polities ?? []) {
    if (pol.rulerId == null) continue
    const ruler = state.villagers.find((v) => v.id === pol.rulerId)
    if (ruler && ruler.alive) continue
    if (crises.some((c) => c.polityId === pol.id && c.phase !== 'resolved' && c.phase !== 'collapsed')) continue
    const heirs = state.villagers
      .filter((v) => v.alive && pol.villageIds.includes(v.villageId ?? -1) && v.personality.ambition > 0.4)
      .slice(0, 3)
    if (heirs.length === 0) continue
    const designated: ClaimantProfile = {
      actorId: heirs[0]!.id,
      lifeTag: heirs[0]!.personality.ambition > 0.6 ? 'Alena' : 'generic',
      kinshipToRuler: 0.4,
      ambition: heirs[0]!.personality.ambition,
      militaryPull: heirs[0]!.profession === 'guard' ? 0.5 : 0.2,
      wealth: countOf(heirs[0]!.inventory, 'coin'),
      support: 0.35,
    }
    const crisis = seedSuccessionCrisis(pol.id, pol.capitalVillageId, pol.rulerId, designated, state.tick)
    for (let i = 1; i < heirs.length; i++) {
      registerClaimant(
        crisis,
        {
          actorId: heirs[i]!.id,
          lifeTag: 'generic',
          kinshipToRuler: 0.2,
          ambition: heirs[i]!.personality.ambition,
          militaryPull: 0.25,
          wealth: countOf(heirs[i]!.inventory, 'coin'),
          support: 0.25,
        },
        state.tick,
      )
    }
    formClaimantFactions(crisis, state.tick)
    crises.push(crisis)
    logEvent(state, 'succession contestee — polity #' + pol.id)
  }
  for (let i = 0; i < crises.length; i++) {
    crises[i] = tickSuccessionCivil(crises[i]!, {
      tick: state.tick,
      roll: rngAt(state.tick, i + 44),
      warPressure: (state.wars ?? []).some((w) => w.status !== 'ended') ? 0.5 : 0.15,
    })
  }
}

function tickReligionBridge(state: SoftBags): void {
  if (!Array.isArray(state.faithMovements)) state.faithMovements = []
  const moves = state.faithMovements
  if (moves.length < 4) {
    for (const v of state.villagers) {
      if (!v.alive || moves.length >= 4) break
      const pol = politicsOf(v)
      if (!pol.creed || pol.creedWeight < 0.3) continue
      if (pol.beliefs.piety < 0.35) continue
      if (moves.some((m) => m.reformerId === v.id)) continue
      const profile: BelieverProfile = {
        actorId: v.id,
        villageId: v.villageId,
        lifeTag: pol.beliefs.piety > 0.55 ? 'Samir' : 'generic',
        creedId: pol.creed,
        creedWeight: pol.creedWeight,
        piety: pol.beliefs.piety,
        tradition: pol.beliefs.tradition,
        grievance: pol.grievance,
        charityGiven: 0,
      }
      const m = tryReinterpretCreed(profile, pol.creed, state.tick, rngAt(state.tick, v.id))
      if (m) {
        const peers: BelieverProfile[] = state.villagers
          .filter((o) => o.alive && o.villageId === v.villageId && o.id !== v.id)
          .slice(0, 8)
          .map((o) => {
            const op = politicsOf(o)
            return {
              actorId: o.id,
              villageId: o.villageId,
              lifeTag: 'generic' as const,
              creedId: op.creed,
              creedWeight: op.creedWeight,
              piety: op.beliefs.piety,
              tradition: op.beliefs.tradition,
              grievance: op.grievance,
              charityGiven: 0,
            }
          })
        applyFaithFollowing(m, peers, state.tick, rngAt(state.tick, v.id + 7))
        moves.push(m)
        logEvent(state, v.name + ' reinterpret creed ' + pol.creed)
      }
    }
  }
  for (let i = 0; i < moves.length; i++) {
    moves[i] = tickReligionSchism(moves[i]!, {
      tick: state.tick,
      roll: rngAt(state.tick, i + 55),
      hungerHint: state.famine ? 0.6 : 0.2,
    })
  }
}

function tickAgriBridge(state: SoftBags): void {
  if (!Array.isArray(state.agriInventions)) state.agriInventions = []
  const invs = state.agriInventions
  if (invs.length < 3) {
    for (const v of state.villagers) {
      if (!v.alive || v.villageId == null) continue
      if (v.profession !== 'farmer' && v.profession !== 'miller') continue
      if (v.personality.curiosity < 0.45) continue
      if (invs.some((x) => x.inventorId === v.id)) continue
      const made = tryInventFarmTool(
        {
          actorId: v.id,
          villageId: v.villageId,
          lifeTag: v.personality.curiosity > 0.6 ? 'Lio' : 'generic',
          curiosity: v.personality.curiosity,
          farmSkill: 0.4 + (v.profession === 'farmer' ? 0.2 : 0.1),
          toolPractice: v.toolTier === 'iron' ? 0.5 : v.toolTier === 'stone' ? 0.3 : 0.15,
        },
        state.tick,
        rngAt(state.tick, v.id),
      )
      if (made) {
        invs.push(made)
        logEvent(state, v.name + ' invente un outil agricole (' + made.toolTag + ')')
        const vg = state.villages.find((g) => g.id === v.villageId)
        if (vg) vg.surplus.wheat = (vg.surplus.wheat ?? 0) + 0.15
      }
      if (invs.length >= 3) break
    }
  }
  const neighborIds = state.villages.map((v) => v.id)
  for (let i = 0; i < invs.length; i++) {
    invs[i] = tickAgriInvention(invs[i]!, {
      tick: state.tick,
      roll: rngAt(state.tick, i + 66),
      neighborVillageIds: neighborIds,
    })
  }
}

function tickMilitaryDynastyBridge(state: SoftBags): void {
  if (!Array.isArray(state.militaryDynasties)) state.militaryDynasties = []
  const dyns = state.militaryDynasties
  const threat = Math.min(1, (state.bandits?.filter((b) => b.alive).length ?? 0) * 0.08 + (state.wars?.length ?? 0) * 0.15)
  for (const v of state.villagers) {
    if (!v.alive || v.villageId == null) continue
    if (dyns.some((d) => d.founderId === v.id || d.memberIds.includes(v.id))) continue
    if (dyns.length >= 6) break
    if (v.profession !== 'farmer' && v.profession !== 'guard' && v.personality.courage < 0.45) continue
    const polity = (state.polities ?? []).find((p) => p.villageIds.includes(v.villageId!))
    const track = seedDynastyTrack(
      {
        actorId: v.id,
        villageId: v.villageId,
        polityId: polity?.id ?? null,
        lifeTag: v.personality.courage > 0.55 ? 'Arvid' : 'generic',
        courage: v.personality.courage,
        loyalty: politicsOf(v).beliefs.loyalty,
        trauma: 0,
        isGuard: v.profession === 'guard',
      },
      state.tick,
    )
    if (v.profession === 'farmer' && threat > 0.2) {
      if (tryFarmerToGuard(
        track,
        {
          actorId: v.id,
          villageId: v.villageId,
          polityId: polity?.id ?? null,
          lifeTag: 'Arvid',
          courage: v.personality.courage,
          loyalty: politicsOf(v).beliefs.loyalty,
          trauma: 0,
          isGuard: false,
        },
        threat,
        state.tick,
        rngAt(state.tick, v.id),
      )) {
        applyProfessionChange(state, v, 'guard', { source: 'atlasMilDynasty' })
        logEvent(state, v.name + ' devient garde (menace / courage)')
      }
    }
    if (threat > 0.35) applyBanditTrauma(track, Math.min(0.4, threat * 0.5), state.tick)
    dyns.push(track)
  }
  for (let i = 0; i < dyns.length; i++) {
    dyns[i] = tickMilitaryDynasty(dyns[i]!, {
      tick: state.tick,
      roll: rngAt(state.tick, i + 77),
      warHeat: threat,
    })
  }
}

/** Soft atlas life-systems tick — pack-driven emergence (no dayGate biographies). */
export function tickAtlasLifeSystems(state: SimState): void {
  const s = soft(state)
  s.atlasLastTick = state.tick
  // S9/S10 HOT — textile first every 12 ticks
  if (state.tick % 12 === 0) tickTextileCareers(state)
  if (state.tick % 36 === 0) tickWoolBag(s)
  if (state.tick % 36 === 0) tickCreditPulse(s)
  if (state.tick % 72 === 0) tickKinMirror(s)
  if (state.tick % 96 === 0) tickGuildBridge(s)
  if (state.tick % 96 === 0) tickMerchantBridge(s)
  if (state.tick % 120 === 0) tickSuccessionBridge(s)
  if (state.tick % 120 === 0) tickReligionBridge(s)
  if (state.tick % 108 === 0) tickAgriBridge(s)
  if (state.tick % 108 === 0) tickMilitaryDynastyBridge(s)
}

export function atlasLifeSystemsSummary(state: SimState) {
  const s = soft(state)
  return {
    creditBooks: s.creditBooks?.length ?? 0,
    kinNodes: s.kinGraph?.nodes?.size ?? 0,
    woolFirms: s.woolIndustry?.firms?.length ?? 0,
    guildPads: s.guildPads?.length ?? 0,
    merchantNetworks: s.merchantNetworks?.length ?? 0,
    successionCrises: s.successionCrises?.length ?? 0,
    faithMovements: s.faithMovements?.length ?? 0,
    agriInventions: s.agriInventions?.length ?? 0,
    militaryDynasties: s.militaryDynasties?.length ?? 0,
    informalLends: state.informalLendCount ?? 0,
  }
}
`
fs.writeFileSync('src/lib/sim/emergence/atlasLifeSystems.ts', out, 'utf8')
console.log('wrote', out.length, 'chars', out.split(/\n/).length, 'lines')
