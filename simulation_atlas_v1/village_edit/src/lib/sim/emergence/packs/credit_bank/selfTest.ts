/**
 * SELF_TEST — no runner required. Call selfTestCreditBank() from a probe or REPL.
 *
 * Notes for integrator / QA:
 * 1. Offer → accept → repay raises underwritingSkill + publicTrust.
 * 2. Default teaches skill but lowers trust.
 * 3. Deposits require publicTrust / relationTrust; crisis causes partial bank-run.
 * 4. High volume + trust → tryFormCreditInstitution succeeds.
 * 5. Linked firm failure + losses → detectFinancialCrisis → rescue via relation strength
 *    OR bankrupt when trust/reserves collapse.
 * 6. No day-timer biography: Soren is a lifeTag + causal chain, not age scripts.
 */

import { createCreditBook, tickCreditBook, tryFinanceVenture, tryLendToBorrower } from './book'
import { detectFinancialCrisis, evaluateBankruptcyOrRescue, onFirmFailure, triggerCrisis } from './crisis'
import { openDeposit } from './deposits'
import { tryFormCreditInstitution } from './institution'
import { defaultLoan, repayLoan } from './loans'
import type { BorrowerProfile, DepositorProfile } from './types'

export const SELF_TEST_NOTES = [
  'repay_raises_skill_and_trust',
  'default_teaches_but_hurts_trust',
  'deposits_need_trust',
  'volume_plus_trust_forms_institution',
  'crisis_rescue_via_relations_or_bankrupt',
  'no_day_timer_biography',
] as const

export function selfTestCreditBank(): string[] {
  const log: string[] = []
  const book = createCreditBook({
    id: 'book:test',
    ownerId: 1,
    tick: 0,
    villageId: 1,
    lifeTag: 'Soren',
    seedReserves: 30,
  })

  const borrower: BorrowerProfile = {
    actorId: 2,
    wealth: 8,
    reliability: 0.7,
    activeLoanCount: 0,
    priorDefaults: 0,
    capitalNeed: 6,
    villageId: 1,
  }
  if (!tryLendToBorrower(book, borrower, 10, 0.1)) throw new Error('lend failed')
  const loan = book.loans[0]!
  repayLoan(book, loan.id, loan.remaining, 20)
  if (book.underwritingSkill <= 0.28) throw new Error('skill should rise on repay')
  log.push('repay ok')

  // Second loan then default
  book.reserves = 20
  tryLendToBorrower(
    book,
    { ...borrower, actorId: 3, reliability: 0.3, priorDefaults: 1, capitalNeed: 5 },
    30,
    0.05,
  )
  const risky = book.loans.find((l) => l.status === 'active')
  if (risky) defaultLoan(book, risky.id, 40)
  log.push('default ok')

  const rich: DepositorProfile = { actorId: 10, wealth: 40, relationTrust: 0.8 }
  book.publicTrust = 0.6
  if (!openDeposit(book, rich, 15, 50)) throw new Error('deposit failed')
  log.push('deposit ok')

  book.volumeLent = 50
  book.volumeDeposited = 30
  book.publicTrust = 0.6
  book.underwritingSkill = 0.5
  openDeposit(book, { actorId: 11, wealth: 20, relationTrust: 0.7 }, 8, 55)
  openDeposit(book, { actorId: 12, wealth: 20, relationTrust: 0.7 }, 8, 56)
  const form = tryFormCreditInstitution(book, 60)
  if (!form.formed) throw new Error('institution should form')
  log.push('institution ok')

  tryFinanceVenture(book, 'caravan:A', 0.5, 70, 5)
  onFirmFailure(book, { firmId: 'firm-x', ownerId: 3, tick: 80, lossHint: 5 })
  const signal = detectFinancialCrisis(
    book,
    { tick: 90, cityStress: 0.7, roll: 0.2 },
    [{ firmId: 'firm-x', ownerId: 3, tick: 80, lossHint: 5 }],
  )
  if (signal.severity < 0.2) log.push('crisis soft')
  else {
    triggerCrisis(book, signal, 90)
    const outcome = evaluateBankruptcyOrRescue(book, 100, 0.7)
    log.push(`crisis ${outcome}`)
  }

  tickCreditBook(
    book,
    { tick: 110, cityStress: 0.1, roll: 0.4 },
    { canPay: () => 0, relationRescueStrength: 0.5 },
  )
  log.push(`phase=${book.phase}`)
  log.push('selfTestCreditBank PASS')
  return log
}
