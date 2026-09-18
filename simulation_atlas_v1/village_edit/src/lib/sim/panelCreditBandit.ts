/**
 * Panel truth for credit + bandits — pack bags when present, else core sim signals.
 * Never invents cosmetics; synthesizes UI rows only from live debt / bands / lends.
 */
import type { CreditBook } from './emergence/packs/credit_bank/types'
import type { ParallelGang } from './emergence/packs/bandit_parallel/types'
import { countOf } from './inventory'
import type { SimState } from './types'

export type UiCreditBookRow = {
  id: string
  ownerLabel: string
  phase: string
  phaseLabel: string
  publicTrust: number
  underwritingSkill: number
  reserves: number
  volumeLent: number
  volumeDeposited: number
  activeLoans: number
  defaults: number
  openDeposits: number
  investments: number
  inCrisis: boolean
  institution: boolean
  lastEvent: string | null
}

export type UiParallelGangRow = {
  id: string
  name: string
  phase: string
  phaseLabel: string
  members: number
  notoriety: number
  activeBounties: number
  bountyTotal: number
  negotiating: boolean
  deals: number
  raids: number
  parallelCoin: number
  lastEvent: string | null
}

export type SoftAtlasBags = {
  creditBooks?: CreditBook[]
  parallelGangs?: ParallelGang[]
  informalLendCount?: number
}

const BOOK_PHASE_FR: Record<string, string> = {
  informal: 'informel',
  ledger: 'registre',
  institution: 'institution',
  crisis: 'crise',
  bankrupt: 'faillite',
  rescued: 'sauve',
}

const GANG_PHASE_FR: Record<string, string> = {
  forming: 'formation',
  petty: 'petits vols',
  raiding: 'razzias',
  established: 'etablie',
  hunted: 'traquee',
  negotiating: 'negociation',
  allied: 'alliee',
  integrated: 'integree',
  scattered: 'dissoute',
  destroyed: 'detruite',
  camp: 'au camp',
  raid: 'en razzia',
  flee: 'en fuite',
}

function bagsOf(state: SimState): SoftAtlasBags {
  return state as SimState & SoftAtlasBags
}

function nameOf(state: SimState, id: number): string {
  const v = state.villagers.find((x) => x.id === id)
  if (!v) return '#' + id
  const sur = v.surname?.trim()
  return sur ? v.name + ' ' + sur : v.name || '#' + id
}

function debtStats(state: SimState): {
  creditors: { id: number; owed: number; debtors: number }[]
  totalDebtLinks: number
  defaultish: number
} {
  const owed = new Map<number, { owed: number; debtors: number }>()
  let totalDebtLinks = 0
  let defaultish = 0
  for (const v of state.villagers) {
    if (!v.alive || !v.relations) continue
    for (const [, rel] of v.relations) {
      if (!rel || typeof rel.debt !== 'number' || rel.debt < 0.4) continue
      totalDebtLinks++
      if (rel.debt >= 1.1) defaultish++
    }
  }
  for (const v of state.villagers) {
    if (!v.alive || !v.relations) continue
    for (const [oid, rel] of v.relations) {
      if (!rel || typeof rel.debt !== 'number' || rel.debt < 0.4) continue
      // v owes oid → oid is creditor
      const cur = owed.get(oid) ?? { owed: 0, debtors: 0 }
      cur.owed += rel.debt
      cur.debtors += 1
      owed.set(oid, cur)
    }
  }
  const creditors = [...owed.entries()]
    .map(([id, s]) => ({ id, owed: s.owed, debtors: s.debtors }))
    .sort((a, b) => b.owed - a.owed)
  return { creditors, totalDebtLinks, defaultish }
}

function packCreditFromBooks(state: SimState, books: CreditBook[], limit: number): UiCreditBookRow[] {
  return books.slice(0, limit).map((b) => {
    const ev = b.events?.[b.events.length - 1]
    return {
      id: b.id,
      ownerLabel: nameOf(state, b.ownerId),
      phase: b.phase,
      phaseLabel: BOOK_PHASE_FR[b.phase] ?? b.phase,
      publicTrust: b.publicTrust ?? 0,
      underwritingSkill: b.underwritingSkill ?? 0,
      reserves: Math.round((b.reserves ?? 0) * 10) / 10,
      volumeLent: Math.round((b.volumeLent ?? 0) * 10) / 10,
      volumeDeposited: Math.round((b.volumeDeposited ?? 0) * 10) / 10,
      activeLoans: (b.loans ?? []).filter((l) => l.status === 'active' || l.status === 'offered').length,
      defaults: (b.loans ?? []).filter((l) => l.status === 'defaulted' || l.status === 'written_off').length,
      openDeposits: (b.deposits ?? []).filter((d) => d.status === 'open').length,
      investments: (b.investments ?? []).filter((i) => !i.resolved).length,
      inCrisis: b.phase === 'crisis' || b.phase === 'bankrupt' || (b.crisisTicks ?? 0) > 0,
      institution: !!b.institutionId || b.phase === 'institution',
      lastEvent: ev ? ev.kind + (ev.note ? ' - ' + ev.note : '') : null,
    }
  })
}

/** Core peer-credit synthesis when credit_bank bag empty. */
function packCreditFromCore(state: SimState, limit: number): UiCreditBookRow[] {
  const soft = bagsOf(state)
  const lends = soft.informalLendCount ?? 0
  const { creditors, defaultish } = debtStats(state)
  if (lends <= 0 && creditors.length === 0) return []
  const rows: UiCreditBookRow[] = []
  const top = creditors.slice(0, Math.max(1, limit - (lends > 0 ? 0 : 0)))
  for (const c of top.slice(0, limit)) {
    const v = state.villagers.find((x) => x.id === c.id && x.alive)
    const coins = v ? countOf(v.inventory, 'coin') : 0
    const trust = Math.max(0.15, Math.min(0.85, 0.35 + c.debtors * 0.06 - defaultish * 0.02))
    rows.push({
      id: 'core-credit-' + c.id,
      ownerLabel: nameOf(state, c.id),
      phase: defaultish > 2 ? 'crisis' : lends > 8 ? 'ledger' : 'informal',
      phaseLabel: defaultish > 2 ? 'crise (retards)' : lends > 8 ? 'registre' : 'informel',
      publicTrust: trust,
      underwritingSkill: Math.min(0.7, 0.2 + c.debtors * 0.05),
      reserves: coins,
      volumeLent: Math.round(c.owed * 10) / 10,
      volumeDeposited: 0,
      activeLoans: c.debtors,
      defaults: 0,
      openDeposits: 0,
      investments: 0,
      inCrisis: defaultish > 2,
      institution: false,
      lastEvent: c.debtors + ' creance(s) · dette totale ~' + (Math.round(c.owed * 10) / 10),
    })
  }
  if (rows.length === 0 && lends > 0) {
    rows.push({
      id: 'core-informal-pool',
      ownerLabel: 'Prets entre villageois',
      phase: 'informal',
      phaseLabel: 'informel',
      publicTrust: 0.4,
      underwritingSkill: 0.25,
      reserves: 0,
      volumeLent: lends,
      volumeDeposited: 0,
      activeLoans: lends,
      defaults: defaultish,
      openDeposits: 0,
      investments: 0,
      inCrisis: defaultish > 3,
      institution: false,
      lastEvent: lends + ' prets informels (aisance -> piece pretee)',
    })
  }
  return rows.slice(0, limit)
}

export function packCreditBookRows(state: SimState, limit = 8): UiCreditBookRow[] {
  const books = bagsOf(state).creditBooks
  if (books && books.length > 0) return packCreditFromBooks(state, books, limit)
  return packCreditFromCore(state, limit)
}

function packGangsFromBag(state: SimState, gangs: ParallelGang[], limit: number): UiParallelGangRow[] {
  return gangs.slice(0, limit).map((g) => {
    const activeB = (g.bounties ?? []).filter((b) => b.active)
    const ev = g.events?.[g.events.length - 1]
    const alive = (g.members ?? []).filter((m) => m.alive).length
    return {
      id: g.id,
      name: g.name || g.id,
      phase: g.phase,
      phaseLabel: GANG_PHASE_FR[g.phase] ?? g.phase,
      members: alive || (g.members?.length ?? 0),
      notoriety: Math.round((g.notoriety ?? 0) * 100) / 100,
      activeBounties: activeB.length,
      bountyTotal: Math.round(activeB.reduce((s, b) => s + (b.amount ?? 0), 0) * 10) / 10,
      negotiating: g.phase === 'negotiating' || g.phase === 'allied',
      deals: g.deals?.length ?? 0,
      raids: g.raids ?? 0,
      parallelCoin: Math.round((g.parallel?.coinMoved ?? 0) * 10) / 10,
      lastEvent: ev ? ev.kind + (ev.note ? ' - ' + ev.note : '') : null,
    }
  })
}

/** Core Band/Bandit synthesis when parallel bag empty. */
function packGangsFromCore(state: SimState, limit: number): UiParallelGangRow[] {
  const bands = state.bands ?? []
  if (bands.length === 0) return []
  const alive = new Set((state.bandits ?? []).filter((b) => b.alive).map((b) => b.id))
  const rows: UiParallelGangRow[] = []
  for (const band of bands) {
    const members = (band.memberIds ?? []).filter((id) => alive.has(id)).length
    const phases = (state.bandits ?? [])
      .filter((b) => b.alive && b.bandId === band.id)
      .map((b) => b.phase)
    const raiding = phases.filter((p) => p === 'raid').length
    const fleeing = phases.filter((p) => p === 'flee').length
    let phase = 'established'
    let phaseLabel = 'etablie'
    if (raiding > 0) {
      phase = 'raiding'
      phaseLabel = 'razzias'
    } else if (fleeing > 0) {
      phase = 'hunted'
      phaseLabel = 'traquee'
    } else if ((band.raids ?? 0) === 0) {
      phase = 'forming'
      phaseLabel = 'formation'
    }
    const ambush = band.tradeAmbushes ?? 0
    const raids = band.raids ?? 0
    const notoriety = Math.min(1, raids * 0.12 + ambush * 0.18 + members * 0.05)
    const bounty = notoriety >= 0.45 || raids >= 3 || ambush >= 2
    const negotiating = fleeing > 0 && notoriety > 0.35
    rows.push({
      id: 'core-band-' + band.id,
      name: band.name || 'Bande n' + String.fromCharCode(176) + band.id,
      phase,
      phaseLabel: negotiating ? 'negociation' : phaseLabel,
      members,
      notoriety: Math.round(notoriety * 100) / 100,
      activeBounties: bounty ? 1 : 0,
      bountyTotal: bounty ? Math.round(8 + notoriety * 40) : 0,
      negotiating,
      deals: 0,
      raids,
      parallelCoin: ambush,
      lastEvent:
        (ambush > 0 ? ambush + ' embuscade(s) route' : raids > 0 ? raids + ' razzia(s)' : 'camp hors village') +
        ((state.deathsByBandit ?? 0) > 0 ? ' · morts brigands ' + state.deathsByBandit : ''),
    })
    if (rows.length >= limit) break
  }
  return rows
}

export function packParallelGangRows(state: SimState, limit = 8): UiParallelGangRow[] {
  const gangs = bagsOf(state).parallelGangs
  if (gangs && gangs.length > 0) return packGangsFromBag(state, gangs, limit)
  return packGangsFromCore(state, limit)
}

export function creditSummary(state: SimState): {
  books: number
  trustAvg: number
  crises: number
  institutions: number
  informalLends: number
  wired: boolean
  debtLinks: number
} {
  const soft = bagsOf(state)
  const rows = packCreditBookRows(state, 40)
  const { totalDebtLinks } = debtStats(state)
  const packWired = Array.isArray(soft.creditBooks)
  const coreLive = (soft.informalLendCount ?? 0) > 0 || totalDebtLinks > 0 || rows.length > 0
  const trustAvg = rows.length === 0 ? 0 : rows.reduce((s, r) => s + r.publicTrust, 0) / rows.length
  return {
    books: rows.length,
    trustAvg: Math.round(trustAvg * 100) / 100,
    crises: rows.filter((r) => r.inCrisis).length,
    institutions: rows.filter((r) => r.institution).length,
    informalLends: soft.informalLendCount ?? 0,
    wired: packWired || coreLive,
    debtLinks: totalDebtLinks,
  }
}

export function parallelBanditSummary(state: SimState): {
  gangs: number
  bounties: number
  negotiating: number
  wired: boolean
  coreBands: number
} {
  const soft = bagsOf(state)
  const rows = packParallelGangRows(state, 40)
  const coreBands = state.bands?.length ?? 0
  return {
    gangs: rows.length,
    bounties: rows.reduce((s, r) => s + r.activeBounties, 0),
    negotiating: rows.filter((r) => r.negotiating).length,
    wired: Array.isArray(soft.parallelGangs) || coreBands > 0 || (state.bandits?.some((b) => b.alive) ?? false),
    coreBands,
  }
}

/** Causal blurbs — pack bags OR core peer-credit / brigand signals. */
export function packCreditBanditCausal(state: SimState): { id: string; chain: string; detail: string }[] {
  const out: { id: string; chain: string; detail: string }[] = []
  const c = creditSummary(state)
  const p = parallelBanditSummary(state)

  if (c.informalLends > 0) {
    out.push({
      id: 'informal-credit',
      chain: 'Confiance -> pret',
      detail: c.informalLends + ' prets informels (richesse + confiance -> piece pretee).',
    })
  }
  if (c.debtLinks > 0) {
    out.push({
      id: 'debt-links',
      chain: 'Pret -> dette',
      detail: c.debtLinks + ' lien(s) de dette actifs entre villageois.',
    })
  }
  for (const row of packCreditBookRows(state, 4)) {
    if (row.inCrisis) {
      out.push({
        id: 'credit-crisis-' + row.id,
        chain: 'Credit -> crise',
        detail: row.ownerLabel + ' (' + row.phaseLabel + ') · confiance ' + Math.round(row.publicTrust * 100) + ' % · defauts ' + row.defaults,
      })
    } else if (row.institution) {
      out.push({
        id: 'credit-inst-' + row.id,
        chain: 'Confiance -> institution',
        detail: row.ownerLabel + ' · livre institutionnalise · prete ' + row.volumeLent,
      })
    } else if (row.volumeLent > 0 || row.activeLoans > 0) {
      out.push({
        id: 'credit-lend-' + row.id,
        chain: 'Argent -> credit',
        detail: row.ownerLabel + ' · ' + row.activeLoans + ' creance(s) · confiance ' + Math.round(row.publicTrust * 100) + ' %',
      })
    }
  }

  if ((state.deathsByBandit ?? 0) > 0) {
    out.push({
      id: 'bandit-deaths',
      chain: 'Razzia -> mort',
      detail: (state.deathsByBandit ?? 0) + ' mort(s) causee(s) par des brigands.',
    })
  }
  for (const g of packParallelGangRows(state, 4)) {
    if (g.activeBounties > 0) {
      out.push({
        id: 'bounty-' + g.id,
        chain: 'Notoriete -> prime',
        detail: g.name + ' · ' + g.activeBounties + ' prime(s) · total ' + g.bountyTotal,
      })
    }
    if (g.negotiating) {
      out.push({
        id: 'nego-' + g.id,
        chain: 'Chasse -> negociation',
        detail: g.name + ' · phase ' + g.phaseLabel + (g.deals > 0 ? ' · ' + g.deals + ' accord(s)' : ''),
      })
    } else if (g.raids > 0 || g.parallelCoin > 0) {
      out.push({
        id: 'raid-' + g.id,
        chain: 'Bande -> razzia',
        detail:
          g.name +
          ' · ' +
          g.raids +
          ' raids' +
          (g.parallelCoin > 0 ? ' · ' + g.parallelCoin + ' embuscade(s)' : '') +
          ' · notoriete ' +
          Math.round(g.notoriety * 100) +
          ' %',
      })
    }
  }
  if (p.gangs === 0 && (state.bandits?.filter((b) => b.alive).length ?? 0) > 0) {
    out.push({
      id: 'bandits-alive',
      chain: 'Misere -> brigand',
      detail: (state.bandits?.filter((b) => b.alive).length ?? 0) + ' brigand(s) vivants hors des villages.',
    })
  }

  return out.slice(0, 10)
}