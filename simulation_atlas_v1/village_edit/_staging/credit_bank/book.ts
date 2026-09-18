/**
 * CreditBook factory + per-tick orchestration (pure; integrator calls).
 */

import { applyBankRun, detectFinancialCrisis, evaluateBankruptcyOrRescue, triggerCrisis } from './crisis'
import { openDeposit } from './deposits'
import { tryFormCreditInstitution } from './institution'
import { placeInvestment, resolveInvestments } from './investment'
import { acceptLoan, offerLoan, processDueLoans } from './loans'
import type {
  BorrowerProfile,
  CreditBook,
  CreditLifeTag,
  CreditTickContext,
  DepositorProfile,
  FirmFailureHint,
  TradeSurplusHint,
  VillageId,
} from './types'
import { clamp } from './util'

export function createCreditBook(opts: {
  id: string
  ownerId: number
  tick: number
  villageId?: VillageId | null
  lifeTag?: CreditLifeTag
  seedReserves?: number
}): CreditBook {
  return {
    id: opts.id,
    ownerId: opts.ownerId,
    villageId: opts.villageId ?? null,
    lifeTag: opts.lifeTag ?? 'generic',
    phase: 'informal',
    formedTick: opts.tick,
    reserves: opts.seedReserves ?? 3,
    volumeLent: 0,
    volumeDeposited: 0,
    publicTrust: 0.35,
    underwritingSkill: opts.lifeTag === 'Soren' ? 0.28 : 0.15,
    loans: [],
    deposits: [],
    investments: [],
    institutionId: null,
    crisisTicks: 0,
    lastCrisisTick: null,
    events: [],
  }
}

export interface TickCreditResult {
  loansProcessed: number
  investmentsResolved: number
  crisis: boolean
  institutionFormed: boolean
  phase: CreditBook['phase']
}

/**
 * Main tick: collect dues → resolve investments → crisis check → institution attempt.
 * Does NOT auto-lend; integrator should call tryLendToArtisans / onTradeSurplus separately.
 */
export function tickCreditBook(
  book: CreditBook,
  ctx: CreditTickContext,
  opts: {
    canPay: (borrowerId: number, amount: number) => number
    relationRescueStrength?: number
    firmFailures?: FirmFailureHint[]
  },
): TickCreditResult {
  if (book.phase === 'bankrupt') {
    return {
      loansProcessed: 0,
      investmentsResolved: 0,
      crisis: false,
      institutionFormed: false,
      phase: book.phase,
    }
  }

  const due = processDueLoans(book, ctx.tick, opts.canPay)
  const inv = resolveInvestments(book, ctx.tick, ctx.cityStress ?? 0, ctx.roll)
  const signal = detectFinancialCrisis(book, ctx, opts.firmFailures ?? [])
  let crisis = false
  if (signal.triggered && book.phase !== 'crisis') {
    triggerCrisis(book, signal, ctx.tick)
    crisis = true
  }
  if (book.phase === 'crisis') {
    book.crisisTicks += 1
    applyBankRun(book, ctx.tick, ctx.roll)
    evaluateBankruptcyOrRescue(book, ctx.tick, opts.relationRescueStrength ?? 0)
  }

  let institutionFormed = false
  if (book.phase === 'ledger' || book.phase === 'informal' || book.phase === 'rescued') {
    const form = tryFormCreditInstitution(book, ctx.tick)
    institutionFormed = form.formed
  }

  return {
    loansProcessed: due.length,
    investmentsResolved: inv.length,
    crisis,
    institutionFormed,
    phase: book.phase,
  }
}

/** On profitable trade: maybe deposit surplus into trusted book. */
export function onTradeSurplus(
  book: CreditBook,
  hint: TradeSurplusHint,
  relationTrust: number,
): void {
  if (hint.surplusCoin < 2) return
  const profile: DepositorProfile = {
    actorId: hint.actorId,
    wealth: hint.surplusCoin,
    relationTrust,
  }
  openDeposit(book, profile, hint.surplusCoin * 0.4, hint.tick)
}

/** Try to lend to an artisan/firm with capital need. */
export function tryLendToBorrower(
  book: CreditBook,
  profile: BorrowerProfile,
  tick: number,
  roll: number,
): boolean {
  const offer = offerLoan(book, profile, tick)
  if (!offer) return false
  if (roll > offer.acceptChance) return false
  return acceptLoan(book, profile, offer, tick) != null
}

/** Finance a caravan / firm from reserves when institution/ledger mature. */
export function tryFinanceVenture(
  book: CreditBook,
  targetRef: string,
  risk: number,
  tick: number,
  amount?: number,
): boolean {
  if (book.phase === 'informal' && book.volumeLent < 10) return false
  const principal = amount ?? clamp(book.reserves * 0.3, 2, 15)
  return placeInvestment(book, targetRef, principal, risk, tick) != null
}

/** Nudge trust from external relation updates (integrator). */
export function shiftPublicTrust(book: CreditBook, delta: number, tick: number): void {
  book.publicTrust = clamp(book.publicTrust + delta, 0, 1)
  book.events.push({
    kind: 'trust_shifted',
    tick,
    bookId: book.id,
    amount: delta,
  })
  if (book.events.length > 48) book.events.splice(0, book.events.length - 48)
}
