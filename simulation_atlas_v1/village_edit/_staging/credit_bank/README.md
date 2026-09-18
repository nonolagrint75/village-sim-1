# credit_bank (staging) — life type **Soren**

Isolated causal pack: **money → credit → loans → deposits → investment → risk → bankruptcy → trust → institution**.

Integrator merges into `src/lib/sim`; this folder must not import World / engine / SimulationCanvas.

## Public API

Import from `_staging/credit_bank` (or copied path after merge):

- `createCreditBook` / `tickCreditBook`
- `offerLoan` / `acceptLoan` / `repayLoan` / `defaultLoan` / `processDueLoans`
- `openDeposit` / `withdrawDeposit` / `depositWillingness` / `aggregateDepositTrust`
- `placeInvestment` / `resolveInvestments`
- `detectFinancialCrisis` / `triggerCrisis` / `evaluateBankruptcyOrRescue` / `onFirmFailure`
- `tryFormCreditInstitution` / `institutionReadiness`
- `onTradeSurplus` / `tryLendToBorrower` / `tryFinanceVenture` / `shiftPublicTrust`
- `selfTestCreditBank`

## Suggested state bag

Attach `CreditBook[]` (or `Map`) on sim state, e.g. `state.creditBooks`, without editing this pack.

Map `institutionId` → politics `Circle` with `isInstitution` when `tryFormCreditInstitution` returns `formed: true`.

## Hook points

| When | Call | Notes |
|------|------|--------|
| **World init / first capital** | `createCreditBook({ lifeTag: 'Soren', seedReserves })` | Spawn when a villager starts informal lending (wealth + ambition + merchant apprentice signal). |
| **Each sim tick** (or daily) | `tickCreditBook(book, { tick, cityStress, roll }, { canPay, relationRescueStrength, firmFailures })` | Collect dues, resolve investments, crisis, institution attempt. |
| **On trade profit** | `onTradeSurplus(book, hint, relationTrust)` | Rich depositors park coin when trust high. |
| **Artisan capital need / firm hire** | `tryLendToBorrower(book, profile, tick, roll)` | Profile from wealth, relation trust, prior defaults, `capitalNeed`. |
| **Caravan / venture finance** | `tryFinanceVenture(book, targetRef, risk, tick)` | After ledger/institution volume. |
| **On firm failure** (`economy/business` fail) | `onFirmFailure(book, hint)` then include hint in next `tickCreditBook` `firmFailures` | Links bankruptcy cascade. |
| **Relation updates** | `shiftPublicTrust(book, delta, tick)` | Decades of Soren relations → rescue strength. |
| **Politics tick** | If `book.institutionId` set, ensure Circle/institution exists | Monitoring capacity / guild-like finance norm. |

### `canPay(borrowerId, amount)`

Integrator reads villager/firm coin (inventory + chest) and returns how much can be paid this tick; may also `removeFromInventory`.

### `relationRescueStrength`

Average trust/affinity toward book owner among depositors + elders (0–1). High → `evaluateBankruptcyOrRescue` → rescued instead of bankrupt.

## Causal chain (probe labels)

1. `loan_accepted` small loans from personal reserves  
2. `loan_repaid` / `loan_defaulted` → `underwritingSkill` rises  
3. `deposit_opened` when `publicTrust` high  
4. `investment_made` / `investment_return` / `investment_loss`  
5. `crisis_triggered` → `book_rescued` **or** `book_bankrupt`  
6. `institution_formed` when volume + trust thresholds met  

## SELF_TEST

```ts
import { selfTestCreditBank, CREDIT_BANK_SELF_TEST_NOTES } from './index'
console.log(selfTestCreditBank())
```

See `selfTest.ts` for expected behaviours. No npm install required for the pack itself.

## Non-goals

- No day-timer age biography scripts  
- No edits to `world.ts` / `engine.ts` / canvas from this pack  
- Ore `economy/deposits.ts` is unrelated (natural deposits); this pack is **financial** deposits  
