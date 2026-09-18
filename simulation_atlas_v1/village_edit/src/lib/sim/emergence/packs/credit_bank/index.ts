/**
 * Public API — credit_bank staging pack (life type Soren).
 * Integrator wires these; do not import from World / SimulationCanvas here.
 */

export type {
  ActorId,
  BookId,
  BookPhase,
  BorrowerProfile,
  CreditBook,
  CreditEvent,
  CreditEventKind,
  CreditLifeTag,
  CreditTickContext,
  DepositAccount,
  DepositId,
  DepositStatus,
  DepositorProfile,
  FirmFailureHint,
  Investment,
  Loan,
  LoanId,
  LoanStatus,
  LoanTerms,
  TradeSurplusHint,
  VillageId,
} from './types'

export { clamp, hash01, pushEventCap } from './util'

export {
  acceptLoan,
  defaultLoan,
  offerLoan,
  processDueLoans,
  repayLoan,
  scoreBorrower,
  type LoanOffer,
} from './loans'

export {
  aggregateDepositTrust,
  bankRunPressure,
  depositWillingness,
  openDeposit,
  withdrawDeposit,
} from './deposits'

export { placeInvestment, resolveInvestments, scoreInvestmentRisk } from './investment'

export {
  applyBankRun,
  detectFinancialCrisis,
  evaluateBankruptcyOrRescue,
  onFirmFailure,
  triggerCrisis,
  type CrisisSignal,
} from './crisis'

export {
  DEFAULT_INSTITUTION_THRESHOLDS,
  institutionReadiness,
  tryFormCreditInstitution,
  type InstitutionFormation,
  type InstitutionThresholds,
} from './institution'

export {
  createCreditBook,
  onTradeSurplus,
  shiftPublicTrust,
  tickCreditBook,
  tryFinanceVenture,
  tryLendToBorrower,
  type TickCreditResult,
} from './book'

export { selfTestCreditBank, SELF_TEST_NOTES as CREDIT_BANK_SELF_TEST_NOTES } from './selfTest'
