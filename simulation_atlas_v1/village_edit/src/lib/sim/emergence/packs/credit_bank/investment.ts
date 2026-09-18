/**
 * Investment of pooled deposits / reserves into caravans & firms (Soren growth).
 */

import type { CreditBook, Investment } from './types'
import { clamp, hash01, pushEventCap } from './util'

export function scoreInvestmentRisk(
  book: CreditBook,
  targetRisk: number,
  cityStress: number,
): number {
  return clamp(targetRisk * 0.6 + cityStress * 0.25 + (1 - book.underwritingSkill) * 0.15, 0, 1)
}

/**
 * Place an investment from liquid reserves (financing caravans / workshops).
 */
export function placeInvestment(
  book: CreditBook,
  targetRef: string,
  principal: number,
  targetRisk: number,
  tick: number,
  matureTicks = 60,
): Investment | null {
  if (book.phase === 'bankrupt') return null
  const amt = Math.min(principal, book.reserves * 0.5)
  if (amt < 1) return null
  const risk = scoreInvestmentRisk(book, targetRisk, 0)
  const inv: Investment = {
    id: `inv:${book.id}:${tick}:${book.investments.length}`,
    bookId: book.id,
    targetRef,
    principal: amt,
    risk,
    placedTick: tick,
    matureTick: tick + matureTicks,
    resolved: false,
  }
  book.reserves -= amt
  book.investments.push(inv)
  pushEventCap(book.events, {
    kind: 'investment_made',
    tick,
    bookId: book.id,
    amount: amt,
    note: targetRef,
  })
  return inv
}

/** Resolve matured investments — wins fund growth, losses can trigger crisis path. */
export function resolveInvestments(
  book: CreditBook,
  tick: number,
  cityStress: number,
  roll: number,
): Investment[] {
  const resolved: Investment[] = []
  for (const inv of book.investments) {
    if (inv.resolved || tick < inv.matureTick) continue
    const risk = scoreInvestmentRisk(book, inv.risk, cityStress)
    const edge = book.underwritingSkill * 0.2 - risk * 0.55
    const r = (roll + hash01(book.ownerId, inv.placedTick)) % 1
    let outcome: 'win' | 'loss' | 'flat' = 'flat'
    let ret = inv.principal
    if (r < 0.35 + edge) {
      outcome = 'win'
      ret = inv.principal * (1.15 + book.underwritingSkill * 0.35)
    } else if (r > 0.72 - risk * 0.25) {
      outcome = 'loss'
      ret = inv.principal * clamp(0.15 + (1 - risk) * 0.4, 0.05, 0.7)
    }
    inv.resolved = true
    inv.outcome = outcome
    inv.returnAmount = ret
    book.reserves += ret
    if (outcome === 'win') {
      book.publicTrust = clamp(book.publicTrust + 0.03, 0, 1)
      pushEventCap(book.events, {
        kind: 'investment_return',
        tick,
        bookId: book.id,
        amount: ret,
        note: inv.targetRef,
      })
    } else if (outcome === 'loss') {
      book.publicTrust = clamp(book.publicTrust - 0.05 - (inv.principal - ret) * 0.008, 0, 1)
      pushEventCap(book.events, {
        kind: 'investment_loss',
        tick,
        bookId: book.id,
        amount: inv.principal - ret,
        note: inv.targetRef,
      })
    }
    resolved.push(inv)
  }
  return resolved
}
