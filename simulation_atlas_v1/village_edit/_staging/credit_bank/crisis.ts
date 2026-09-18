/**
 * Financial crisis triggers + bankruptcy / rescue via long-built trust.
 */

import { bankRunPressure, withdrawDeposit } from './deposits'
import type { CreditBook, CreditTickContext, FirmFailureHint } from './types'
import { clamp, pushEventCap } from './util'

export interface CrisisSignal {
  triggered: boolean
  severity: number
  reasons: string[]
}

/** Detect crisis from defaults, investment losses, firm failures, city stress. */
export function detectFinancialCrisis(
  book: CreditBook,
  ctx: CreditTickContext,
  recentFirmFailures: FirmFailureHint[] = [],
): CrisisSignal {
  const reasons: string[] = []
  const activeDefaults = book.loans.filter((l) => l.status === 'defaulted').length
  const recentDefaults = book.loans.filter(
    (l) => l.status === 'defaulted' && l.issuedTick >= ctx.tick - 120,
  ).length
  const openDep = book.deposits.filter((d) => d.status === 'open').reduce((s, d) => s + d.amount, 0)
  const leverage = openDep > 0 ? book.volumeLent / Math.max(1, book.reserves + openDep * 0.01) : 0
  const lossEvents = book.events.filter(
    (e) => e.kind === 'investment_loss' && e.tick >= ctx.tick - 80,
  ).length
  const firmHit = recentFirmFailures.filter((f) =>
    book.loans.some((l) => l.borrowerId === f.ownerId && l.status === 'active'),
  ).length

  let severity = 0
  if (recentDefaults >= 2) {
    severity += 0.25
    reasons.push('cluster_defaults')
  }
  if (activeDefaults >= 3) {
    severity += 0.15
    reasons.push('many_defaults')
  }
  if (book.publicTrust < 0.28) {
    severity += 0.2
    reasons.push('trust_crash')
  }
  if (book.reserves < openDep * 0.2 && openDep > 8) {
    severity += 0.25
    reasons.push('illiquid')
  }
  if (lossEvents >= 2) {
    severity += 0.15
    reasons.push('investment_losses')
  }
  if ((ctx.cityStress ?? 0) > 0.55) {
    severity += 0.12
    reasons.push('city_stress')
  }
  if (firmHit > 0) {
    severity += 0.18
    reasons.push('linked_firm_failure')
  }
  if (leverage > 2.5) {
    severity += 0.1
    reasons.push('over_levered')
  }

  severity = clamp(severity, 0, 1)
  return { triggered: severity >= 0.45 || (severity >= 0.32 && ctx.roll < severity), severity, reasons }
}

/** Enter crisis phase; optional bank-run withdrawals. */
export function triggerCrisis(book: CreditBook, signal: CrisisSignal, tick: number): void {
  if (book.phase === 'bankrupt') return
  book.phase = 'crisis'
  book.crisisTicks += 1
  book.lastCrisisTick = tick
  book.publicTrust = clamp(book.publicTrust - 0.08 - signal.severity * 0.15, 0, 1)
  pushEventCap(book.events, {
    kind: 'crisis_triggered',
    tick,
    bookId: book.id,
    amount: signal.severity,
    note: signal.reasons.join(','),
  })
}

/** Apply bank-run drain during crisis. */
export function applyBankRun(book: CreditBook, tick: number, roll: number): number {
  const pressure = bankRunPressure(book)
  if (pressure <= 0) return 0
  let drained = 0
  for (const dep of book.deposits) {
    if (dep.status !== 'open') continue
    if (roll + dep.trust * 0.2 < pressure) {
      const want = dep.amount * clamp(pressure, 0.2, 1)
      const { paid } = withdrawDeposit(book, dep.id, want, tick)
      drained += paid
    }
  }
  return drained
}

/**
 * Bankruptcy when reserves + trust collapse.
 * Rescue possible if decades of relations (publicTrust + underwriting) remain.
 */
export function evaluateBankruptcyOrRescue(
  book: CreditBook,
  tick: number,
  relationRescueStrength: number,
): 'bankrupt' | 'rescued' | 'ongoing' {
  if (book.phase !== 'crisis') return 'ongoing'
  const openDep = book.deposits.filter((d) => d.status === 'open').reduce((s, d) => s + d.amount, 0)
  const insolvent = book.reserves < 1 && openDep > 0
  const trustDead = book.publicTrust < 0.12
  if (!insolvent && !trustDead && book.crisisTicks < 3) return 'ongoing'

  const rescueScore =
    relationRescueStrength * 0.5 + book.underwritingSkill * 0.25 + book.publicTrust * 0.25
  if (rescueScore >= 0.42 && relationRescueStrength >= 0.3) {
    book.phase = 'rescued'
    book.reserves += 4 + relationRescueStrength * 12
    book.publicTrust = clamp(0.3 + relationRescueStrength * 0.25, 0, 0.7)
    pushEventCap(book.events, {
      kind: 'book_rescued',
      tick,
      bookId: book.id,
      amount: rescueScore,
      note: 'decades_of_trust',
    })
    // Soft return toward ledger/institution
    book.phase = book.institutionId ? 'institution' : 'ledger'
    pushEventCap(book.events, { kind: 'crisis_abated', tick, bookId: book.id })
    return 'rescued'
  }

  if (insolvent || trustDead || book.crisisTicks >= 5) {
    book.phase = 'bankrupt'
    for (const dep of book.deposits) {
      if (dep.status === 'open') dep.status = 'lost'
    }
    for (const loan of book.loans) {
      if (loan.status === 'active') loan.status = 'written_off'
    }
    book.reserves = 0
    book.publicTrust = clamp(book.publicTrust * 0.2, 0, 0.15)
    pushEventCap(book.events, { kind: 'book_bankrupt', tick, bookId: book.id })
    return 'bankrupt'
  }
  return 'ongoing'
}

/** Hook: firm failure linked to active loans → immediate stress. */
export function onFirmFailure(book: CreditBook, hint: FirmFailureHint): void {
  for (const loan of book.loans) {
    if (loan.status !== 'active') continue
    if (loan.borrowerId !== hint.ownerId) continue
    book.publicTrust = clamp(book.publicTrust - 0.03 - hint.lossHint * 0.01, 0, 1)
  }
}
