/**
 * Panel packers for life-type bags + proof rows (S4 + PARTIAL S34/S37/S40 + cleared).
 * Bags preferred; lean core synthesis when absent (no cosmetics).
 */
import type { LaborMovement } from './emergence/packs/labor_revolt/types'
import type { MigrantQuartersState } from './emergence/packs/migrant_quarters/types'
import type { WoolIndustryState } from './emergence/packs/wool_industry/types'
import type { FaithMovement } from './emergence/packs/religion_schism/types'
import type { SuccessionCrisis } from './emergence/packs/succession_civil/types'
import type { GuildPad } from './emergence/packs/guild_formation/types'
import type { MerchantNetworkState } from './emergence/packs/merchant_network/types'
import type { AgriInvention } from './emergence/packs/agri_invention'
import type { MilitaryDynasty } from './emergence/packs/military_dynasty'
import type { SimState } from './types'
import { circlesOf, politicsOf } from './politics'
import { countOf } from './inventory'

export type UiLifeRow = { id: string; title: string; phase: string; detail: string; hot: boolean }

export type UiEmergenceProof = {
  id: string
  scenario: string
  label: string
  value: string
  ready: boolean
  detail: string
}

type Soft = Omit<
  SimState,
  | 'laborMovements'
  | 'migrantQuarters'
  | 'woolIndustry'
  | 'kinGraph'
  | 'dynastyHouses'
  | 'faithMovements'
  | 'successionCrises'
  | 'guildPads'
  | 'merchantNetworks'
  | 'agriInventions'
  | 'militaryDynasties'
> & {
  laborMovements?: LaborMovement[]
  migrantQuarters?: MigrantQuartersState
  woolIndustry?: WoolIndustryState
  kinGraph?: { nodes?: Map<number, unknown> | { size?: number }; edges?: unknown[] }
  dynastyHouses?: { id: string; surnameHint?: string; phase?: string; wealth?: number; debt?: number }[]
  faithMovements?: FaithMovement[]
  successionCrises?: SuccessionCrisis[]
  guildPads?: GuildPad[]
  merchantNetworks?: MerchantNetworkState[]
  agriInventions?: AgriInvention[]
  militaryDynasties?: MilitaryDynasty[]
}

const LABOR_FR: Record<string, string> = {
  latent: 'latent',
  worker_group: 'groupe ouvrier',
  strike: 'greve',
  institution: 'institution',
  repression: 'repression',
  fork_negotiate: 'negociation',
  fork_overthrow: 'renversement',
  food_crisis: 'crise alimentaire',
  mass_protest: 'protestation',
  army_refuses: 'armee refuse',
  regime_collapse: 'effondrement',
  new_polity: 'nouveau pouvoir',
  elite_backlash: 'retour elite',
  settled: 'apaise',
  crushed: 'ecrase',
}

function soft(state: SimState): Soft {
  return state as Soft
}

function sortHot(rows: UiLifeRow[]): UiLifeRow[] {
  return [...rows].sort((a, b) => Number(b.hot) - Number(a.hot))
}

export function packLaborRows(state: SimState, limit = 6): UiLifeRow[] {
  const bag = soft(state).laborMovements
  if (Array.isArray(bag) && bag.length > 0) {
    return sortHot(
      bag.slice(0, limit).map((m) => {
        const ev = m.events?.[m.events.length - 1]
        return {
          id: m.id,
          title: 'Mouvement · village ' + m.villageId,
          phase: LABOR_FR[m.phase] ?? m.phase,
          detail:
            (ev ? ev.kind + ' · ' : '') +
            (m.wageIndex != null ? 'salaire x' + Math.round(m.wageIndex * 100) / 100 + ' · ' : '') +
            (m.memberIds?.length ?? 0) +
            ' membres',
          hot: m.phase !== 'latent' && m.phase !== 'settled' && m.phase !== 'crushed',
        }
      }),
    )
  }
  let grievanceHigh = 0
  for (const v of state.villagers) {
    if (!v.alive) continue
    try {
      if (politicsOf(v).grievance > 0.55) grievanceHigh++
    } catch {
      /* ignore */
    }
  }
  const firmFails = state.firmFailCount ?? 0
  if (grievanceHigh >= 3 || firmFails > 0) {
    return [
      {
        id: 'core-labor-pressure',
        title: 'Pression salariale',
        phase: firmFails > 0 ? 'faillites' : 'grief',
        detail:
          grievanceHigh +
          ' griefs eleves' +
          (firmFails > 0 ? ' · ' + firmFails + ' faillites' : '') +
          ' (sac encore vide)',
        hot: grievanceHigh >= 5 || firmFails >= 2,
      },
    ]
  }
  return []
}

export function packMigrantRows(state: SimState, limit = 6): UiLifeRow[] {
  const mq = soft(state).migrantQuarters
  if (mq && Array.isArray(mq.quarters) && mq.quarters.length > 0) {
    return sortHot(
      mq.quarters.slice(0, limit).map((q) => ({
        id: q.id,
        title: q.name || q.id,
        phase: q.associationStage || q.hostStance || 'quartier',
        detail:
          'part ' +
          Math.round((q.popShare ?? 0) * 100) +
          '% · stance ' +
          (q.hostStance ?? '?') +
          ' · assoc ' +
          (q.associationStage ?? 'none'),
        hot:
          q.hostStance === 'hostile' ||
          q.hostStance === 'wary' ||
          q.associationStage === 'recognized_institution',
      })),
    )
  }
  let migrating = 0
  for (const v of state.villagers) {
    if (!v.alive) continue
    try {
      if (politicsOf(v).migrationUrge > 0.7) migrating++
    } catch {
      /* ignore */
    }
  }
  const leave = state.migrationCounters?.leaves ?? 0
  if (migrating > 0 || leave > 0) {
    return [
      {
        id: 'core-migrant-pressure',
        title: 'Pression migratoire',
        phase: 'errance',
        detail:
          migrating +
          ' forte envie' +
          (leave > 0 ? ' · ' + leave + ' departs' : '') +
          ' (quartiers non cristallises)',
        hot: migrating >= 3 || leave >= 2,
      },
    ]
  }
  return []
}

export function packWoolRows(state: SimState, limit = 6): UiLifeRow[] {
  const wool = soft(state).woolIndustry
  if (wool) {
    const rows: UiLifeRow[] = []
    const bb = wool.boomBust
    if (bb?.phase) {
      rows.push({
        id: 'wool-phase',
        title: 'Cycle laine',
        phase: String(bb.phase),
        detail:
          'demande ' +
          Math.round((bb.demand ?? 0) * 100) +
          '% · offre ' +
          Math.round((bb.supply ?? 0) * 100) +
          '% · firmes ' +
          (wool.firms?.length ?? 0),
        hot: bb.phase === 'boom' || bb.phase === 'crash' || bb.phase === 'glut',
      })
    }
    for (const f of (wool.firms ?? []).slice(0, Math.max(0, limit - rows.length))) {
      rows.push({
        id: f.id,
        title: f.ownerName || f.id,
        phase: f.role,
        detail:
          'troupeau ' +
          (f.herdSize ?? 0) +
          ' · ouvriers ' +
          (f.workers ?? 0) +
          (f.specialized ? ' · specialise' : ''),
        hot: !!f.specialized || (f.herdSize ?? 0) > 8,
      })
    }
    return sortHot(rows.slice(0, limit))
  }
  let herders = 0
  let weavers = 0
  let sheep = 0
  for (const v of state.villagers) {
    if (!v.alive) continue
    if (v.profession === 'herder') herders++
    if (v.profession === 'weaver') weavers++
  }
  for (const s of state.sheep ?? []) if (s.alive) sheep++
  const woolPrice = state.prices?.wool
  if (sheep >= 4 || herders > 0 || weavers > 0 || woolPrice != null) {
    return [
      {
        id: 'core-wool',
        title: 'Filiere laine',
        phase:
          herders === 0 && sheep >= 8
            ? 'penurie bergers'
            : weavers === 0 && herders > 0
              ? 'penurie tisserands'
              : 'naissante',
        detail:
          sheep +
          ' moutons · ' +
          herders +
          ' bergers · ' +
          weavers +
          ' tisserands' +
          (woolPrice != null ? ' · cours ' + woolPrice : ''),
        hot: (sheep >= 8 && herders === 0) || (herders > 0 && weavers === 0),
      },
    ]
  }
  return []
}

export function packKinDynastyRows(state: SimState, limit = 6): UiLifeRow[] {
  const rows: UiLifeRow[] = []
  const kin = soft(state).kinGraph
  const nodes = kin?.nodes
  const nSize = nodes instanceof Map ? nodes.size : ((nodes as { size?: number } | undefined)?.size ?? 0)
  if (nSize > 0) {
    rows.push({
      id: 'kin-graph',
      title: 'Graphe de parente',
      phase: 'multigen',
      detail: nSize + ' noeuds · ' + (kin?.edges?.length ?? 0) + ' liens',
      hot: nSize >= 12,
    })
  }
  const houses = soft(state).dynastyHouses
  if (Array.isArray(houses)) {
    for (const h of houses.slice(0, Math.max(0, limit - rows.length))) {
      rows.push({
        id: h.id,
        title: h.surnameHint || h.id,
        phase: h.phase || 'maison',
        detail: 'fortune ~' + Math.round(h.wealth ?? 0) + ' · dette ~' + Math.round(h.debt ?? 0),
        hot: (h.phase ?? '') === 'collapsed' || (h.phase ?? '') === 'seized' || (h.debt ?? 0) > (h.wealth ?? 0),
      })
    }
  }
  return sortHot(rows.slice(0, limit))
}

export function packFaithSchismRows(state: SimState, limit = 6): UiLifeRow[] {
  const bag = soft(state).faithMovements
  if (Array.isArray(bag) && bag.length > 0) {
    return sortHot(
      bag.slice(0, limit).map((m) => ({
        id: m.id,
        title: m.reformCreedId || m.parentCreedId || m.id,
        phase: m.phase,
        detail:
          'parent ' +
          (m.parentCreedId ?? '?') +
          ' · ' +
          (m.followerIds?.length ?? 0) +
          ' fideles' +
          (m.schismCircleId ? ' · cercle ' + m.schismCircleId : ''),
        hot: m.phase === 'schism' || m.phase === 'tension' || m.phase === 'regional' ,
      })),
    )
  }
  const creeds = new Map<string, number>()
  for (const v of state.villagers) {
    if (!v.alive) continue
    try {
      const c = politicsOf(v).creed
      if (c) creeds.set(c, (creeds.get(c) ?? 0) + 1)
    } catch {
      /* ignore */
    }
  }
  if (creeds.size >= 2) {
    const bits = [...creeds.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([k, n]) => k + ' ' + n)
    return [
      {
        id: 'core-creed-plural',
        title: 'Pluralite de foi',
        phase: 'tension possible',
        detail: bits.join(' · ') + ' (sac faithMovements vide)',
        hot: creeds.size >= 3,
      },
    ]
  }
  return []
}

export function packSuccessionRows(state: SimState, limit = 6): UiLifeRow[] {
  const bag = soft(state).successionCrises
  if (Array.isArray(bag) && bag.length > 0) {
    return sortHot(
      bag.slice(0, limit).map((c) => ({
        id: c.id,
        title: 'Succession · pouvoir ' + c.polityId,
        phase: c.phase,
        detail:
          (c.claimants?.length ?? 0) +
          ' pretendants' +
          (c.warId ? ' · guerre ' + c.warId : '') +
          (c.winnerId != null ? ' · vainqueur #' + c.winnerId : ''),
        hot: c.phase !== 'resolved' && c.phase !== 'latent' && c.phase !== 'collapsed',
      })),
    )
  }
  const rows: UiLifeRow[] = []
  for (const w of state.wars ?? []) {
    if (w.status === 'ended') continue
    if (w.cause === 'succession_spill') {
      rows.push({
        id: 'war-succ-' + w.id,
        title: 'Guerre de succession',
        phase: w.status,
        detail: 'intensite ' + Math.round((w.intensity ?? 0) * 100) + '% · ' + (w.battles ?? 0) + ' batailles',
        hot: true,
      })
    }
  }
  const coups = state.societyCounters?.conflictsByCause?.succession ?? 0
  if (coups > 0 && rows.length === 0) {
    rows.push({
      id: 'core-succ-rumor',
      title: 'Tensions de succession',
      phase: 'conteste',
      detail: coups + ' conflits classes succession',
      hot: coups >= 2,
    })
  }
  return sortHot(rows.slice(0, limit))
}

export function packGuildEmergenceRows(state: SimState, limit = 6): UiLifeRow[] {
  const pads = soft(state).guildPads
  if (Array.isArray(pads) && pads.length > 0) {
    return sortHot(
      pads.slice(0, limit).map((p) => ({
        id: p.id,
        title: 'Guilde ' + p.kind + ' · v' + p.villageId,
        phase: p.phase,
        detail:
          (p.memberIds?.length ?? 0) +
          ' membres · ' +
          (p.apprenticeIds?.length ?? 0) +
          ' apprentis · qualite ' +
          Math.round((p.qualityBar ?? 0) * 100) +
          '%' +
          (p.circleId != null ? ' · cercle ' + p.circleId : ''),
        hot: p.phase === 'guild' || p.phase === 'institution' || (p.memberIds?.length ?? 0) >= 4,
      })),
    )
  }
  const rows: UiLifeRow[] = []
  const seen = new Set<number>()
  try {
    for (const v of state.villagers) {
      if (!v.alive || seen.size >= limit) break
      for (const c of circlesOf(state, v)) {
        if (seen.has(c.id)) continue
        if (!(c.isGuild || (c.kind === 'craft' && c.isInstitution))) continue
        seen.add(c.id)
        rows.push({
          id: 'guild-' + c.id,
          title: c.name,
          phase: c.isInstitution ? 'institution' : 'cercle',
          detail:
            (c.memberIds?.length ?? 0) +
            ' membres · legitimite ' +
            Math.round((c.legitimacy ?? 0) * 100) +
            '%',
          hot: !!c.isInstitution || !!c.isGuild,
        })
      }
    }
  } catch {
    /* politics optional */
  }
  return sortHot(rows.slice(0, limit))
}

export function packMerchantRows(state: SimState, limit = 6): UiLifeRow[] {
  const nets = soft(state).merchantNetworks
  if (Array.isArray(nets) && nets.length > 0) {
    return sortHot(
      nets.slice(0, limit).map((n) => ({
        id: n.id,
        title: 'Reseau marchand ' + n.id,
        phase: (n.nodes?.length ?? 0) >= 3 ? 'reseau' : 'naissant',
        detail:
          (n.nodes?.length ?? 0) +
          ' noeuds · ' +
          (n.edges?.length ?? 0) +
          ' liens · ' +
          (n.events?.length ?? 0) +
          ' evenements',
        hot: (n.nodes?.length ?? 0) >= 3 || (n.edges?.length ?? 0) >= 2,
      })),
    )
  }
  let traders = 0
  for (const v of state.villagers) if (v.alive && v.profession === 'trader') traders++
  if (traders > 0 || (state.tradeRoutes?.size ?? 0) > 0) {
    return [
      {
        id: 'core-merchant',
        title: 'Commerce emergent',
        phase: 'routes',
        detail:
          traders +
          ' marchands · ' +
          (state.tradeRoutes?.size ?? 0) +
          ' routes (sac merchantNetworks vide)',
        hot: traders >= 2,
      },
    ]
  }
  return []
}

export function packAgriRows(state: SimState, limit = 6): UiLifeRow[] {
  const bag = soft(state).agriInventions
  if (Array.isArray(bag) && bag.length > 0) {
    return sortHot(
      bag.slice(0, limit).map((a) => ({
        id: a.id,
        title: a.toolTag || a.id,
        phase: a.phase,
        detail:
          'village ' +
          a.originVillageId +
          ' · adopte ' +
          (a.adoptedVillageIds?.length ?? 0) +
          ' · boost ' +
          Math.round((a.localBoost ?? 0) * 100) +
          '%',
        hot: a.phase !== 'latent' && (a.adoptedVillageIds?.length ?? 0) > 0,
      })),
    )
  }
  return []
}

export function packMilitaryDynastyRows(state: SimState, limit = 6): UiLifeRow[] {
  const bag = soft(state).militaryDynasties
  if (Array.isArray(bag) && bag.length > 0) {
    return sortHot(
      bag.slice(0, limit).map((d) => ({
        id: d.id,
        title: 'Dynastie mil. · v' + d.villageId,
        phase: d.phase,
        detail:
          (d.memberIds?.length ?? 0) +
          ' membres · prestige ' +
          Math.round((d.prestige ?? 0) * 100) +
          '% · terres ' +
          (d.landPlots ?? 0),
        hot: d.phase !== 'civilian',
      })),
    )
  }
  return []
}

/** S4 — living marriages + cross-family/lineage alliances. */
export function packMarriageAllianceRows(state: SimState, limit = 8): UiLifeRow[] {
  const rows: UiLifeRow[] = []
  const seen = new Set<string>()
  let marriedPairs = 0
  let crossFamily = 0
  let crossLineage = 0
  const samples: UiLifeRow[] = []
  for (const v of state.villagers) {
    if (!v.alive || v.spouseId == null || v.id > v.spouseId) continue
    const sp = state.villagers.find((o) => o.id === v.spouseId && o.alive)
    if (!sp) continue
    marriedPairs++
    const key = v.id + '-' + sp.id
    if (seen.has(key)) continue
    seen.add(key)
    const famCross = v.familyId != null && sp.familyId != null && v.familyId !== sp.familyId
    const linCross = v.lineageId != null && sp.lineageId != null && v.lineageId !== sp.lineageId
    // After household merge familyId may match — still count if surnames/lineages differ or counter says so
    const kind = v.marriageKind ?? sp.marriageKind ?? 'romance'
    const allied =
      famCross ||
      linCross ||
      (v.surname && sp.surname && v.surname !== sp.surname)
    if (allied) {
      if (famCross) crossFamily++
      if (linCross) crossLineage++
      samples.push({
        id: 'pair-' + key,
        title: (v.name || '#' + v.id) + ' × ' + (sp.name || '#' + sp.id),
        phase: kind,
        detail:
          (allied ? 'alliance de foyers/lignées' : 'union') +
          (v.surname || sp.surname
            ? ' · ' + (v.surname || '?') + ' / ' + (sp.surname || '?')
            : ''),
        hot: true,
      })
    } else {
      samples.push({
        id: 'pair-' + key,
        title: (v.name || '#' + v.id) + ' × ' + (sp.name || '#' + sp.id),
        phase: kind,
        detail: 'couple vivant' + (v.surname ? ' · ' + v.surname : ''),
        hot: false,
      })
    }
  }
  const alliancesLogged = state.familyAllianceCount ?? 0
  const formed = state.marriageFormedCount ?? 0
  if (marriedPairs === 0 && formed === 0 && alliancesLogged === 0 && !state.milestones?.firstMarriage) {
    return []
  }
  rows.push({
    id: 'marriage-summary',
    title: 'Mariages & alliances',
    phase: alliancesLogged > 0 || crossFamily > 0 || crossLineage > 0 ? 'alliance' : marriedPairs > 0 ? 'unions' : 'latent',
    detail:
      marriedPairs +
      ' couples vivants · ' +
      formed +
      ' unions formees · ' +
      alliancesLogged +
      ' alliances loggees' +
      (crossLineage > 0 ? ' · ' + crossLineage + ' inter-lignees' : ''),
    hot: marriedPairs > 0 || alliancesLogged > 0 || !!state.milestones?.firstMarriage,
  })
  for (const s of sortHot(samples).slice(0, Math.max(0, limit - rows.length))) rows.push(s)
  return sortHot(rows.slice(0, limit))
}

/** S34 / S37 / S40 — alliance vs third, war deaths, costly peace. */
export function packWarDiplomacyRows(state: SimState, limit = 8): UiLifeRow[] {
  const rows: UiLifeRow[] = []
  const byCause = state.societyCounters?.conflictsByCause ?? {}
  const allianceN = Math.max(state.allianceVsThirdCount ?? 0, byCause.alliance_vs_third ?? 0)
  const polities = state.polities?.length ?? 0
  const wars = state.wars ?? []
  const openWars = wars.filter((w) => w.status === 'open' || w.status === 'skirmish')
  const battles = wars.reduce((n, w) => n + (w.battles ?? 0), 0)
  const casualties = wars.reduce((n, w) => n + (w.casualties ?? 0), 0)
  const deaths = state.deaths ?? 0
  const costly =
    (state.costlyPeaceCount ?? 0) +
    wars.filter((w) => w.status === 'ended' && /trop couteuse|epuisement/i.test(String(w.endReason ?? ''))).length

  if (allianceN > 0 || polities >= 2) {
    rows.push({
      id: 's34-alliance-third',
      title: 'Alliance vs menace',
      phase: allianceN > 0 ? 'alliee' : 'latente',
      detail:
        allianceN +
        ' alliances vs 3e · ' +
        polities +
        ' pouvoirs · ' +
        openWars.length +
        ' guerres ouvertes',
      hot: allianceN > 0,
    })
  }
  if (battles > 0 || deaths > 0 || casualties > 0) {
    rows.push({
      id: 's37-war-deaths',
      title: 'Guerre et morts',
      phase: deaths >= 3 && battles > 0 ? 'sang' : battles > 0 ? 'batailles' : 'latent',
      detail:
        deaths +
        ' morts · ' +
        battles +
        ' batailles · ' +
        casualties +
        ' pertes de guerre',
      hot: deaths >= 3 && battles > 0,
    })
  }
  const warFamine = state.warFamineCount ?? 0
  if (warFamine > 0 || (battles > 0 && state.famine)) {
    rows.push({
      id: 's39-war-famine',
      title: 'Guerre ravage champs',
      phase: state.famine ? 'famine' : warFamine > 0 ? 'recoltes' : 'latent',
      detail:
        warFamine +
        ' ravages chroniques · famine=' +
        (!!state.famine) +
        ' · batailles ' +
        battles,
      hot: warFamine > 0 || (!!state.famine && battles > 0),
    })
  }
  if (costly > 0 || battles > 0) {
    rows.push({
      id: 's40-costly-peace',
      title: 'Paix trop couteuse',
      phase: costly > 0 ? 'epuisement' : 'en guerre',
      detail:
        costly +
        ' paix couteuses · ' +
        wars.filter((w) => w.status === 'ended').length +
        ' guerres terminees',
      hot: costly > 0,
    })
  }
  for (const w of openWars.slice(0, 3)) {
    rows.push({
      id: 'war-live-' + w.id,
      title: 'Guerre #' + w.id,
      phase: w.status,
      detail:
        (w.cause || '?') +
        ' · intensite ' +
        Math.round((w.intensity ?? 0) * 100) +
        '% · ' +
        (w.battles ?? 0) +
        ' batailles',
      hot: true,
    })
  }
  return sortHot(rows.slice(0, limit))
}

/** S7 rich homes + S41 pop pull — panel proof counters. */
export function packEmergenceProofs(state: SimState): UiEmergenceProof[] {
  let richHomes = 0
  let poorHomes = 0
  let homes = 0
  for (const v of state.villagers) {
    if (!v.alive || !v.hasHome || v.homeOwnerId !== v.id) continue
    homes++
    const coins = countOf(v.inventory, 'coin') + (v.chestInventory ? countOf(v.chestInventory, 'coin') : 0)
    if (coins >= 6 || (v.house && (v.house.shape === 'courtyard' || v.house.shape === 'longhouse'))) richHomes++
    else if (coins <= 1) poorHomes++
  }
  const pads = soft(state).guildPads ?? []
  const guildLive = pads.filter((p) => p.phase === 'guild' || p.phase === 'institution' || (p.memberIds?.length ?? 0) >= 3)
  let guildCircles = 0
  try {
    for (const c of state.circles ?? []) {
      if (c.isGuild || (c.kind === 'craft' && c.isInstitution)) guildCircles++
    }
  } catch {
    /* ignore */
  }
  const faith = soft(state).faithMovements ?? []
  const schismHot = faith.filter((m) => m.phase === 'schism' || m.phase === 'tension' || m.phase === 'regional')
  const attract = [...state.villages]
    .map((vg) => ({ id: vg.id, a: vg.attractiveness ?? 0, p: vg.prosperity ?? 0, pop: vg.memberIds?.length ?? 0 }))
    .sort((x, y) => y.a - x.a || y.p - x.p)
  const top = attract[0]
  const migrating = state.migrationCounters?.leaves ?? 0
  const urge = state.migrationCounters?.urgeCross070 ?? 0

  const marriageRows = packMarriageAllianceRows(state, 4)
  const marriedLive = marriageRows.filter((r) => r.id.startsWith('pair-')).length
  const alliances = state.familyAllianceCount ?? 0
  const formed = state.marriageFormedCount ?? 0
  const s4Ready =
    alliances > 0 ||
    (marriedLive > 0 && (!!state.milestones?.firstMarriage || formed > 0)) ||
    marriageRows.some((r) => r.id.startsWith('pair-') && r.hot)

  return [
    {
      id: 's4',
      scenario: 'S4',
      label: 'Mariage alliance',
      value: alliances > 0 ? String(alliances) + ' all.' : String(marriedLive || formed) + ' unions',
      ready: s4Ready,
      detail:
        (marriedLive || formed) +
        ' unions · ' +
        alliances +
        ' alliances familles' +
        (state.milestones?.firstMarriage ? ' · premier mariage OK' : ' · en attente'),
    },

    {
      id: 's34',
      scenario: 'S34',
      label: 'Alliance vs 3e',
      value: String(Math.max(state.allianceVsThirdCount ?? 0, state.societyCounters?.conflictsByCause?.alliance_vs_third ?? 0)),
      ready:
        (state.allianceVsThirdCount ?? 0) > 0 ||
        (state.societyCounters?.conflictsByCause?.alliance_vs_third ?? 0) > 0,
      detail:
        (state.polities?.length ?? 0) +
        ' pouvoirs · ' +
        (state.wars?.filter((w) => w.status !== 'ended').length ?? 0) +
        ' guerres actives',
    },
    {
      id: 's37',
      scenario: 'S37',
      label: 'Guerre tue pop',
      value:
        String(state.deaths ?? 0) +
        'd/' +
        String((state.wars ?? []).reduce((n, w) => n + (w.battles ?? 0), 0)) +
        'b',
      ready: (state.deaths ?? 0) >= 3 && (state.wars ?? []).some((w) => (w.battles ?? 0) > 0),
      detail:
        (state.deaths ?? 0) +
        ' morts · ' +
        (state.wars ?? []).reduce((n, w) => n + (w.battles ?? 0), 0) +
        ' batailles · pertes ' +
        (state.wars ?? []).reduce((n, w) => n + (w.casualties ?? 0), 0),
    },
    {
      id: 's40',
      scenario: 'S40',
      label: 'Paix couteuse',
      value: String(
        (state.costlyPeaceCount ?? 0) +
          (state.wars ?? []).filter((w) =>
            w.status === 'ended' && /trop couteuse|epuisement/i.test(String(w.endReason ?? '')),
          ).length,
      ),
      ready:
        (state.costlyPeaceCount ?? 0) > 0 ||
        (state.wars ?? []).some(
          (w) => w.status === 'ended' && /trop couteuse|epuisement/i.test(String(w.endReason ?? '')),
        ),
      detail:
        (state.wars ?? []).filter((w) => w.status === 'ended').length +
        ' guerres finies · compteur ' +
        (state.costlyPeaceCount ?? 0),
    },

    {
      id: 's12',
      scenario: 'S12',
      label: 'Mine -> forge',
      value: (() => {
        const mines = (state.villages ?? []).filter((vg) => vg.hasMine).length
        let smiths = 0
        for (const v of state.villagers) if (v.alive && v.profession === 'blacksmith') smiths++
        return mines + 'm/' + smiths + 'f'
      })(),
      ready: (() => {
        const mines = (state.villages ?? []).filter((vg) => vg.hasMine).length
        let smiths = 0
        for (const v of state.villagers) if (v.alive && v.profession === 'blacksmith') smiths++
        return mines > 0 && smiths > 0
      })(),
      detail: (() => {
        const mines = (state.villages ?? []).filter((vg) => vg.hasMine).length
        let smiths = 0
        let miners = 0
        for (const v of state.villagers) {
          if (!v.alive) continue
          if (v.profession === 'blacksmith') smiths++
          if (v.profession === 'miner') miners++
        }
        return mines + ' mines · ' + miners + ' mineurs · ' + smiths + ' forgerons'
      })(),
    },
    {
      id: 's23',
      scenario: 'S23',
      label: 'Nouvelle croyance',
      value: String(state.societyCounters?.creedChanges ?? 0),
      ready: (state.societyCounters?.creedChanges ?? 0) > 0,
      detail:
        (state.societyCounters?.creedChanges ?? 0) +
        ' conversions · ' +
        (state.societyCounters?.creedBehaviorFollowups ?? 0) +
        ' suivis',
    },
    {
      id: 's39',
      scenario: 'S39',
      label: 'Guerre -> famine',
      value: String(state.warFamineCount ?? 0),
      ready:
        (state.warFamineCount ?? 0) > 0 ||
        (!!state.famine && (state.wars ?? []).some((w) => (w.battles ?? 0) > 0)),
      detail:
        (state.warFamineCount ?? 0) +
        ' ravages · famine=' +
        (!!state.famine) +
        ' · batailles ' +
        (state.wars ?? []).reduce((n, w) => n + (w.battles ?? 0), 0),
    },
    {
      id: 's47',
      scenario: 'S47',
      label: 'Densification',
      value: (() => {
        let houses = 0
        for (const v of state.villagers) if (v.alive && v.hasHome && v.homeOwnerId === v.id) houses++
        const roads = state.grid?.roadTiles ?? 0
        return houses + 'h/' + roads + 'r'
      })(),
      ready: (() => {
        let houses = 0
        for (const v of state.villagers) if (v.alive && v.hasHome && v.homeOwnerId === v.id) houses++
        const roads = state.grid?.roadTiles ?? 0
        return roads > 10 && houses > 3
      })(),
      detail: (() => {
        let houses = 0
        for (const v of state.villagers) if (v.alive && v.hasHome && v.homeOwnerId === v.id) houses++
        return houses + ' maisons · ' + (state.grid?.roadTiles ?? 0) + ' tuiles route'
      })(),
    },
    {
      id: 's7',
      scenario: 'S7',
      label: 'Maisons riches',
      value: richHomes + '/' + homes,
      ready: richHomes >= 1 && poorHomes >= 1,
      detail: richHomes + ' riches · ' + poorHomes + ' pauvres (toit/fortune)',
    },
    {
      id: 's21',
      scenario: 'S21',
      label: 'Guildes',
      value: String(Math.max(guildLive.length, guildCircles)),
      ready: guildLive.length > 0 || guildCircles > 0,
      detail:
        guildLive.length +
        ' pads actifs · ' +
        guildCircles +
        ' cercles guildes/institutions',
    },
    {
      id: 's24',
      scenario: 'S24',
      label: 'Schisme',
      value: String(schismHot.length || faith.length),
      ready: schismHot.length > 0 || faith.some((m) => m.phase !== 'latent'),
      detail: faith.length + ' mouvements · ' + schismHot.length + ' en tension/schisme',
    },
    {
      id: 's41',
      scenario: 'S41',
      label: 'Attraction pop',
      value: top ? 'v' + top.id + ' · ' + Math.round(top.a) : '—',
      ready: !!top && top.a >= 40 && (migrating > 0 || urge > 0),
      detail:
        (top ? 'prosperite ' + Math.round(top.p) + ' · pop ' + top.pop + ' · ' : '') +
        urge +
        ' envies · ' +
        migrating +
        ' departs',
    },
  ]
}

export function packLifeCausal(state: SimState): { id: string; chain: string; detail: string }[] {
  const out: { id: string; chain: string; detail: string }[] = []
  for (const r of packMarriageAllianceRows(state, 3)) {
    if (r.hot || r.id === 'marriage-summary') {
      out.push({
        id: 'marry-' + r.id,
        chain: 'Mariage -> alliance',
        detail: r.title + ' · ' + r.detail,
      })
    }
  }
  for (const r of packWarDiplomacyRows(state, 3)) {
    if (r.hot || r.id.startsWith('s3')) {
      const chain =
        r.id.includes('s34') || r.id.includes('alliance')
          ? 'Menace -> alliance'
          : r.id.includes('s37') || r.id.includes('deaths')
            ? 'Guerre -> morts'
            : r.id.includes('s40') || r.id.includes('costly')
              ? 'Guerre -> paix couteuse'
              : 'Guerre -> diplomatie'
      out.push({ id: 'wardip-' + r.id, chain, detail: r.title + ' · ' + r.detail })
    }
  }
  for (const r of packLaborRows(state, 2)) {
    if (r.hot || r.phase !== 'latent') {
      out.push({ id: 'labor-' + r.id, chain: 'Conditions → grève', detail: r.title + ' · ' + r.detail })
    }
  }
  for (const r of packMigrantRows(state, 2)) {
    out.push({ id: 'mig-' + r.id, chain: 'Migration → quartier', detail: r.title + ' · ' + r.detail })
  }
  for (const r of packWoolRows(state, 2)) {
    if (r.hot || r.id === 'wool-phase' || r.id === 'core-wool') {
      out.push({ id: 'wool-' + r.id, chain: 'Moutons → textile', detail: r.detail })
    }
  }
  for (const r of packFaithSchismRows(state, 2)) {
    if (r.hot) out.push({ id: 'faith-' + r.id, chain: 'Foi → schisme', detail: r.detail })
  }
  for (const r of packSuccessionRows(state, 2)) {
    out.push({ id: 'succ-' + r.id, chain: 'Succession → conflit', detail: r.detail })
  }
  for (const r of packGuildEmergenceRows(state, 2)) {
    if (r.hot) out.push({ id: 'guild-' + r.id, chain: 'Métier → guilde', detail: r.detail })
  }
  for (const r of packMerchantRows(state, 2)) {
    if (r.hot) out.push({ id: 'merch-' + r.id, chain: 'Négoce → réseau', detail: r.detail })
  }
  for (const r of packKinDynastyRows(state, 2)) {
    if (r.hot || r.id === 'kin-graph') {
      out.push({ id: 'kin-' + r.id, chain: 'Parenté → maison', detail: r.detail })
    }
  }
  for (const r of packAgriRows(state, 2)) {
    if (r.hot) out.push({ id: 'agri-' + r.id, chain: 'Savoir → outil', detail: r.detail })
  }
  for (const r of packMilitaryDynastyRows(state, 2)) {
    if (r.hot) out.push({ id: 'mildyn-' + r.id, chain: 'Traumatisme → milice', detail: r.detail })
  }
  return out.slice(0, 10)
}