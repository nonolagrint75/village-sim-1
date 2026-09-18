/**
 * Deposit trust — rich actors park coin when publicTrust is high (Soren path).
 */

import type { CreditBook, DepositAccount, DepositorProfile } from './types'
import { clamp, pushEventCap } from './util'

function nextDepId(book: CreditBook, tick: number): string {
  return `dep:${book.id}:${tick}:${book.deposits.length}`
}

/** Willingness to deposit given book trust × relation trust. */
export function depositWillingness(book: CreditBook, profile: DepositorProfile): number {
  if (book.phase === 'bankrupt' || book.phase === 'crisis') {
    return clamp(book.publicTrust * 0.15 * profile.relationTrust, 0, 0.25)
  }
  return clamp(
    book.publicTrust * 0.55 + profile.relationTrust * 0.35 + book.underwritingSkill * 0.1,
    0,
    1,
  )
}

/** Open / top-up a deposit. Returns null if trust too low or no surplus. */
export function openDeposit(
  book: CreditBook,
  profile: DepositorProfile,
  amount: number,
  tick: number,
): DepositAccount | null {
  if (amount < 1) return null
  const will = depositWillingness(book, profile)
  if (will < 0.28) return null
  const put = Math.min(amount, profile.wealth * will)
  if (put < 1) return null
  const existing = book.deposits.find((d) => d.depositorId === profile.actorId && d.status === 'open')
  if (existing) {
    existing.amount += put
    existing.trust = clamp((existing.trust + will) * 0.5, 0, 1)
    book.reserves += put
    book.volumeDeposited += put
    pushEventCap(book.events, {
      kind: 'deposit_opened',
      tick,
      bookId: book.id,
      actorId: profile.actorId,
      depositId: existing.id,
      amount: put,
      note: 'top_up',
    })
    return existing
  }
  const dep: DepositAccount = {
    id: nextDepId(book, tick),
    bookId: book.id,
    depositorId: profile.actorId,
    amount: put,
    openedTick: tick,
    trust: will,
    status: 'open',
  }
  book.deposits.push(dep)
  book.reserves += put
  book.volumeDeposited += put
  book.publicTrust = clamp(book.publicTrust + 0.015, 0, 1)
  pushEventCap(book.events, {
    kind: 'deposit_opened',
    tick,
    bookId: book.id,
    actorId: profile.actorId,
    depositId: dep.id,
    amount: put,
  })
  return dep
}

/** Withdraw — may partially fail during crisis (bank run). */
export function withdrawDeposit(
  book: CreditBook,
  depositId: string,
  amount: number,
  tick: number,
): { paid: number; closed: boolean } {
  const dep = book.deposits.find((d) => d.id === depositId && d.status === 'open')
  if (!dep || amount <= 0) return { paid: 0, closed: false }
  const want = Math.min(amount, dep.amount)
  const liquidity = book.phase === 'crisis' ? book.reserves * 0.4 : book.reserves
  const paid = Math.min(want, liquidity)
  book.reserves -= paid
  dep.amount -= paid
  let closed = false
  if (dep.amount <= 0.05) {
    dep.amount = 0
    dep.status = 'withdrawn'
    closed = true
  } else if (paid < want) {
    book.publicTrust = clamp(book.publicTrust - 0.04, 0, 1)
  }
  pushEventCap(book.events, {
    kind: 'deposit_withdrawn',
    tick,
    bookId: book.id,
    actorId: dep.depositorId,
    depositId: dep.id,
    amount: paid,
  })
  return { paid, closed }
}

/** Aggregate open deposit trust (institution / crisis signal). */
export function aggregateDepositTrust(book: CreditBook): number {
  const open = book.deposits.filter((d) => d.status === 'open')
  if (open.length === 0) return 0
  let w = 0
  let t = 0
  for (const d of open) {
    w += d.amount
    t += d.trust * d.amount
  }
  return w <= 0 ? 0 : t / w
}

/** Bank-run pressure when trust crashes. */
export function bankRunPressure(book: CreditBook): number {
  if (book.phase !== 'crisis' && book.publicTrust >= 0.35) return 0
  const openAmt = book.deposits.filter((d) => d.status === 'open').reduce((s, d) => s + d.amount, 0)
  if (openAmt <= 0) return 0
  return clamp((0.55 - book.publicTrust) * 1.4 + (book.phase === 'crisis' ? 0.25 : 0), 0, 1)
}
