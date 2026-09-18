/**
 * Loan offers, acceptance, repayment, default — Soren credit core.
 */

import type {
  BorrowerProfile,
  CreditBook,
  CreditEvent,
  Loan,
  LoanTerms,
} from './types'
import { clamp, hash01, pushEventCap } from './util'

export interface LoanOffer {
  terms: LoanTerms
  score: number
  acceptChance: number
  reason: string
}

function nextLoanId(book: CreditBook, tick: number): string {
  return `loan:${book.id}:${tick}:${book.loans.length}`
}

/** Score borrower reliability using book underwriting skill (learns over time). */
export function scoreBorrower(book: CreditBook, profile: BorrowerProfile): number {
  const skill = book.underwritingSkill
  const base =
    profile.reliability * 0.45 +
    clamp(profile.wealth / 40, 0, 1) * 0.2 +
    (1 - clamp(profile.priorDefaults / 3, 0, 1)) * 0.2 +
    (1 - clamp(profile.activeLoanCount / 2, 0, 1)) * 0.15
  const noise = (hash01(book.ownerId, profile.actorId, book.loans.length) - 0.5) * (1 - skill) * 0.35
  return clamp(base * (0.55 + skill * 0.45) + noise, 0, 1)
}

/**
 * Build a loan offer from capital need + reserves.
 * Returns null if book cannot lend or borrower looks too weak.
 */
export function offerLoan(
  book: CreditBook,
  profile: BorrowerProfile,
  tick: number,
  opts?: { maxPrincipal?: number },
): LoanOffer | null {
  void tick
  if (book.phase === 'bankrupt') return null
  if (book.reserves < 1) return null
  const score = scoreBorrower(book, profile)
  if (score < 0.22 && book.underwritingSkill > 0.35) return null
  const need = Math.max(1, profile.capitalNeed)
  const maxP = opts?.maxPrincipal ?? Math.min(book.reserves * 0.45, 12 + book.underwritingSkill * 20)
  const principal = clamp(Math.min(need, maxP), 1, book.reserves)
  const interestRate = clamp(0.002 + (1 - score) * 0.006 - book.underwritingSkill * 0.001, 0.001, 0.012)
  const termTicks = Math.round(40 + (1 - score) * 80)
  const collateral = clamp(profile.wealth / 50 + score * 0.2, 0, 1)
  const acceptChance = clamp((profile.capitalNeed / (principal + 1)) * (0.4 + score * 0.5), 0.05, 0.95)
  const reason =
    score >= 0.55 ? 'reliable_borrower' : score >= 0.35 ? 'marginal_ok' : 'high_risk_trial'
  return {
    terms: { principal, interestRate, termTicks, collateral },
    score,
    acceptChance,
    reason,
  }
}

/** Materialise an accepted offer into an active loan; drains reserves. */
export function acceptLoan(
  book: CreditBook,
  profile: BorrowerProfile,
  offer: LoanOffer,
  tick: number,
): Loan | null {
  if (book.reserves < offer.terms.principal) return null
  const loan: Loan = {
    id: nextLoanId(book, tick),
    bookId: book.id,
    borrowerId: profile.actorId,
    lenderId: book.ownerId,
    principal: offer.terms.principal,
    remaining: offer.terms.principal * (1 + offer.terms.interestRate * 8),
    interestRate: offer.terms.interestRate,
    termTicks: offer.terms.termTicks,
    issuedTick: tick,
    dueTick: tick + offer.terms.termTicks,
    collateral: offer.terms.collateral,
    status: 'active',
    reliabilityAtIssue: offer.score,
    defaultsOnRecord: profile.priorDefaults,
  }
  book.reserves -= offer.terms.principal
  book.volumeLent += offer.terms.principal
  book.loans.push(loan)
  if (book.phase === 'informal' && book.volumeLent >= 8) book.phase = 'ledger'
  pushEventCap(book.events, {
    kind: 'loan_accepted',
    tick,
    bookId: book.id,
    actorId: profile.actorId,
    loanId: loan.id,
    amount: offer.terms.principal,
    note: offer.reason,
  } satisfies CreditEvent)
  return loan
}

/** Partial or full repayment — boosts trust + underwriting skill. */
export function repayLoan(
  book: CreditBook,
  loanId: string,
  payment: number,
  tick: number,
): { repaid: number; closed: boolean } {
  const loan = book.loans.find((l) => l.id === loanId && l.status === 'active')
  if (!loan || payment <= 0) return { repaid: 0, closed: false }
  const paid = Math.min(payment, loan.remaining)
  loan.remaining -= paid
  book.reserves += paid
  book.publicTrust = clamp(book.publicTrust + 0.01 + paid * 0.002, 0, 1)
  book.underwritingSkill = clamp(book.underwritingSkill + 0.008, 0, 1)
  let closed = false
  if (loan.remaining <= 0.05) {
    loan.remaining = 0
    loan.status = 'repaid'
    closed = true
    book.underwritingSkill = clamp(book.underwritingSkill + 0.02, 0, 1)
  }
  pushEventCap(book.events, {
    kind: 'loan_repaid',
    tick,
    bookId: book.id,
    actorId: loan.borrowerId,
    loanId: loan.id,
    amount: paid,
  })
  return { repaid: paid, closed }
}

/** Mark default — damages trust, teaches underwriting. */
export function defaultLoan(
  book: CreditBook,
  loanId: string,
  tick: number,
  recoverFraction = 0.15,
): Loan | null {
  const loan = book.loans.find((l) => l.id === loanId && l.status === 'active')
  if (!loan) return null
  const recover = loan.remaining * clamp(recoverFraction + loan.collateral * 0.35, 0, 0.7)
  book.reserves += recover
  const loss = loan.remaining - recover
  loan.remaining = 0
  loan.status = 'defaulted'
  book.publicTrust = clamp(book.publicTrust - 0.06 - loss * 0.01, 0, 1)
  book.underwritingSkill = clamp(book.underwritingSkill + 0.025, 0, 1)
  pushEventCap(book.events, {
    kind: 'loan_defaulted',
    tick,
    bookId: book.id,
    actorId: loan.borrowerId,
    loanId: loan.id,
    amount: loss,
  })
  return loan
}

/** Auto-default / collect loans past due (integrator supplies canPay). */
export function processDueLoans(
  book: CreditBook,
  tick: number,
  canPay: (borrowerId: number, amount: number) => number,
): CreditEvent[] {
  const out: CreditEvent[] = []
  for (const loan of book.loans) {
    if (loan.status !== 'active') continue
    if (tick < loan.dueTick) continue
    const due = Math.min(loan.remaining, Math.max(1, loan.principal * 0.25))
    const available = canPay(loan.borrowerId, due)
    if (available >= due * 0.85) {
      const r = repayLoan(book, loan.id, available, tick)
      if (r.repaid > 0) {
        const last = book.events[book.events.length - 1]
        if (last) out.push(last)
      }
      if (!r.closed && loan.status === 'active') loan.dueTick = tick + loan.termTicks
    } else if (available > 0) {
      repayLoan(book, loan.id, available, tick)
      defaultLoan(book, loan.id, tick, 0.1)
      const last = book.events[book.events.length - 1]
      if (last) out.push(last)
    } else {
      defaultLoan(book, loan.id, tick, 0.05)
      const last = book.events[book.events.length - 1]
      if (last) out.push(last)
    }
  }
  return out
}
