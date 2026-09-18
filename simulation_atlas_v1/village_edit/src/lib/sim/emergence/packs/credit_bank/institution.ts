/**
 * Credit institution formation when volume + trust crystallise (Soren end-state).
 */

import { aggregateDepositTrust } from './deposits'
import type { CreditBook } from './types'
import { clamp, pushEventCap } from './util'

export interface InstitutionThresholds {
  minVolumeLent: number
  minVolumeDeposited: number
  minPublicTrust: number
  minDepositors: number
  minUnderwriting: number
}

export const DEFAULT_INSTITUTION_THRESHOLDS: InstitutionThresholds = {
  minVolumeLent: 40,
  minVolumeDeposited: 25,
  minPublicTrust: 0.55,
  minDepositors: 3,
  minUnderwriting: 0.4,
}

export interface InstitutionFormation {
  formed: boolean
  institutionId: string | null
  readiness: number
  reasons: string[]
}

/** Soft readiness 0–1 for probe / UI. */
export function institutionReadiness(
  book: CreditBook,
  thresholds: InstitutionThresholds = DEFAULT_INSTITUTION_THRESHOLDS,
): number {
  const depositors = book.deposits.filter((d) => d.status === 'open').length
  const parts = [
    clamp(book.volumeLent / thresholds.minVolumeLent, 0, 1),
    clamp(book.volumeDeposited / thresholds.minVolumeDeposited, 0, 1),
    clamp(book.publicTrust / thresholds.minPublicTrust, 0, 1),
    clamp(depositors / thresholds.minDepositors, 0, 1),
    clamp(book.underwritingSkill / thresholds.minUnderwriting, 0, 1),
    aggregateDepositTrust(book),
  ]
  return parts.reduce((a, b) => a + b, 0) / parts.length
}

/**
 * Crystallise informal/ledger book into a named financial institution.
 * Integrator should map institutionId → politics Circle / institution.
 */
export function tryFormCreditInstitution(
  book: CreditBook,
  tick: number,
  thresholds: InstitutionThresholds = DEFAULT_INSTITUTION_THRESHOLDS,
): InstitutionFormation {
  if (book.institutionId || book.phase === 'institution') {
    return { formed: false, institutionId: book.institutionId, readiness: 1, reasons: ['already'] }
  }
  if (book.phase === 'bankrupt' || book.phase === 'crisis') {
    return { formed: false, institutionId: null, readiness: 0, reasons: ['unstable'] }
  }
  const depositors = book.deposits.filter((d) => d.status === 'open').length
  const reasons: string[] = []
  if (book.volumeLent < thresholds.minVolumeLent) reasons.push('volume_lent')
  if (book.volumeDeposited < thresholds.minVolumeDeposited) reasons.push('volume_deposited')
  if (book.publicTrust < thresholds.minPublicTrust) reasons.push('public_trust')
  if (depositors < thresholds.minDepositors) reasons.push('depositors')
  if (book.underwritingSkill < thresholds.minUnderwriting) reasons.push('underwriting')

  const readiness = institutionReadiness(book, thresholds)
  if (reasons.length > 0) {
    return { formed: false, institutionId: null, readiness, reasons }
  }

  const institutionId = `credit_inst:${book.villageId ?? 'wild'}:${book.ownerId}`
  book.institutionId = institutionId
  book.phase = 'institution'
  book.publicTrust = clamp(book.publicTrust + 0.08, 0, 1)
  pushEventCap(book.events, {
    kind: 'institution_formed',
    tick,
    bookId: book.id,
    note: institutionId,
  })
  return { formed: true, institutionId, readiness: 1, reasons: [] }
}
