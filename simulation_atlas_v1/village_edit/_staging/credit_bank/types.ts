/**
 * Credit / bank staging types — local copies only (no core imports).
 * Life type focus: **Soren** (money → credit → investment → risk → bankruptcy → trust → institution).
 */

export type ActorId = number
export type VillageId = number
export type LoanId = string
export type DepositId = string
export type BookId = string

/** Soft life-type tag for probes — never a day-timer biography script. */
export type CreditLifeTag = 'Soren' | 'generic'

export type LoanStatus = 'offered' | 'active' | 'repaid' | 'defaulted' | 'written_off'
export type DepositStatus = 'open' | 'withdrawn' | 'frozen' | 'lost'
export type CreditEventKind =
  | 'loan_offered'
  | 'loan_accepted'
  | 'loan_repaid'
  | 'loan_defaulted'
  | 'deposit_opened'
  | 'deposit_withdrawn'
  | 'investment_made'
  | 'investment_return'
  | 'investment_loss'
  | 'crisis_triggered'
  | 'crisis_abated'
  | 'trust_shifted'
  | 'institution_formed'
  | 'book_bankrupt'
  | 'book_rescued'

export interface CreditEvent {
  kind: CreditEventKind
  tick: number
  bookId: BookId
  actorId?: ActorId
  loanId?: LoanId
  depositId?: DepositId
  amount?: number
  note?: string
}

export interface LoanTerms {
  principal: number
  /** Per-tick interest fraction (tiny; integrator may map to daily). */
  interestRate: number
  /** Ticks until next due payment. */
  termTicks: number
  /** Collateral soft score 0–1 (tools, stock, land claim). */
  collateral: number
}

export interface Loan {
  id: LoanId
  bookId: BookId
  borrowerId: ActorId
  lenderId: ActorId
  principal: number
  remaining: number
  interestRate: number
  termTicks: number
  issuedTick: number
  dueTick: number
  collateral: number
  status: LoanStatus
  /** Reliability estimate at issue time (0–1). */
  reliabilityAtIssue: number
  defaultsOnRecord: number
}

export interface DepositAccount {
  id: DepositId
  bookId: BookId
  depositorId: ActorId
  amount: number
  openedTick: number
  /** Trust depositor places in the book (0–1). */
  trust: number
  status: DepositStatus
}

export interface Investment {
  id: string
  bookId: BookId
  /** Optional caravan / firm / route id from integrator. */
  targetRef: string
  principal: number
  risk: number
  placedTick: number
  matureTick: number
  resolved: boolean
  outcome?: 'win' | 'loss' | 'flat'
  returnAmount?: number
}

export type BookPhase = 'informal' | 'ledger' | 'institution' | 'crisis' | 'bankrupt' | 'rescued'

/**
 * One credit book / proto-bank, often owned by a Soren-like actor.
 * Holds deposits, loans, and investment exposure.
 */
export interface CreditBook {
  id: BookId
  ownerId: ActorId
  villageId: VillageId | null
  lifeTag: CreditLifeTag
  phase: BookPhase
  formedTick: number
  /** Liquid coin held by the book (not in loans/investments). */
  reserves: number
  /** Cumulative principal ever lent. */
  volumeLent: number
  /** Cumulative deposits ever accepted. */
  volumeDeposited: number
  /** Public trust in this book (0–1) — drives deposits + institution. */
  publicTrust: number
  /** Owner skill at scoring borrowers (0–1), rises with repay/default experience. */
  underwritingSkill: number
  loans: Loan[]
  deposits: DepositAccount[]
  investments: Investment[]
  /** Soft institution id once crystallised (integrator maps to Circle/institution). */
  institutionId: string | null
  crisisTicks: number
  lastCrisisTick: number | null
  events: CreditEvent[]
}

/** Snapshot inputs for scoring a borrower without touching core Villager. */
export interface BorrowerProfile {
  actorId: ActorId
  wealth: number
  /** 0–1 prior repayment / relation trust. */
  reliability: number
  activeLoanCount: number
  priorDefaults: number
  /** Artisan / firm capital need signal. */
  capitalNeed: number
  villageId?: VillageId | null
}

export interface DepositorProfile {
  actorId: ActorId
  wealth: number
  /** Trust toward book owner (relation). */
  relationTrust: number
}

export interface FirmFailureHint {
  firmId: string
  ownerId: ActorId
  tick: number
  lossHint: number
}

export interface TradeSurplusHint {
  actorId: ActorId
  surplusCoin: number
  tick: number
}

export interface CreditTickContext {
  tick: number
  /** Optional famine / prosperity shock 0–1. */
  cityStress?: number
  /** Random 0–1 from integrator RNG (deterministic preferred). */
  roll: number
}