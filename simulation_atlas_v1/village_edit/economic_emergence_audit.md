# Economic emergence audit — nono_simu_2d (TypeScript sim)

**STATUS:** PARTIAL — live causal loop exists in `commerce` + `behaviors` + `careers`/`livelihood`; Phase 7 `economy/**` is mostly **additive facades** (decorative / probe-ready). No second currency invented. Dual wealth APIs now documented and bridged.

## Logs utilisateur

| Source | Finding |
|--------|---------|
| `sim_logs/` | Empty (README only) — no GUI `latest.json` / `run_*.json` archives |
| Terminals | Electron on Atlas + Lot3D emergence probe (`444320`): at t1000 **`wagesPaidCoins: 0`**, `coinTotal: 146`, food chain tasks active (sow/harvest/grind), professionNone=6 |
| `scripts/_civ_audit_run_log.txt` | Civ audit seeds — pop/infra only, no wage/trade detail |

**Verdict from logs:** production/trade tasks fire; **payroll emergence does not** (wages gate / flat 1-coin pay path). Hunger previously *raised* reservation wage (anti-causal) — fixed in `economy/wages.ts` this pass.

---

## Causal chain map (resources to production)

| Link | Live causal? | Where | Decorative / facade? |
|------|--------------|-------|------------------------|
| **Resources (world)** | YES | `world` grid ore/bush/tree + `behaviors` gather/mine | `economy/deposits` mirrors grid into `state.economyDeposits` but **nothing harvests via `harvestDeposit`** — dig paths stay in behaviors |
| **Production** | YES | `behaviors` tasks (harvestWheat to grindFlour to bakeBread, craft*, mine*) | `economy/productionRecipes` documents ratios + `applyCraft` — **unused by execute path** |
| **Inventory** | YES | `inventory.ts` Slot[] on villager/chest | `economy/inventoryBridge` wrap — unused outside economy |
| **Transform** | YES | same behaviors craft/food chain | `applyCraft` / `applyCraftPreview` unused |
| **Trade** | YES | `commerce.conductTrade`, `findTradeOpportunity`, `behaviors` tradeRun / buyMaterial / mintCoins | `economy/marketView` (`localPrice`/`scarcitySignal`) thin wrappers over `priceOf` — unused by decisions |
| **Income** | YES (caravan coins) | `conductTrade` adds coins priced by `state.prices` | Wage payroll: score gate in `build/npcBuildBehaviors.payHelper` then **flat 1 coin** — not wage-score to coin amount |
| **Wealth** | SPLIT | **Causal:** `ecology.estimateWealth` (family, build hire, inheritance) | **Decorative:** `economy/wealthLedger.estimateWealth` market snapshot. Now: `estimateDecisionWealth` to ecology facade |
| **Consumption** | YES | hunger/eat in behaviors + nutrition | `consumeNeedBasket` / `applyConsumeFood` unused (preview/helpers only) |
| **Demand** | PARTIAL | Village: `careers.computeCareerDemand` (surplus/famine/SoL/price scarcity) to profession scores. Personal: `mind.needs` in cognition | `demandFromVillager` used by wages + (new) livelihood soft gate / careers nudge helper — **not yet in `professionFactors` score stack** |
| **Demand to profession** | PARTIAL | Village demand in `professionFactors` / `assignProfession`; soft practice in `livelihood.tickLivelihood` to `applyProfessionChange` | `suggestOccupationShift` / `topOccupationShift` DATA only; `applyPersonalDemandNudge` ready but **not called** from professionFactors (read-only for this agent) |
| **Business / deposits bags** | NO | — | `economyBusinesses` / `economyDeposits` registry only |

---

## Decorative vs causal (wealth / wages / trade)

### Wealth
- **Causal today:** `ecology.estimateWealth` (coins x 1.2, metals, edibles, home/field/pen/mount/boat).
- **Decorative:** `economy/wealthLedger` market-priced inventory + home proxy (now also capitalProxy). Callers outside economy still import ecology.
- **Bridge added:** `estimateDecisionWealth(v)` re-exports ecology — prefer from economy package; do not invent a third money unit.

### Wages
- **Causal gate:** `reservationWage` / `employerOffer` / `wageWouldClear` in `build/npcBuildBehaviors` hire+pay.
- **Not causal:** score magnitude is not coins paid (always 1 coin). No payroll ledger, no `BusinessRecord.workerIds` hire loop.
- **Fix this pass:** desperation (food/shelter/medicine) **lowers** reservation; status pride raises it (was inverted — helps explain `wagesPaidCoins: 0`).
- **Helper added:** `employerOfferFromDecisionWealth(owner, productivity)`.

### Trade
- **Causal:** surplus to opportunity to tradeRun to `conductTrade` to coins + prosperity + prices via `tickVillageEconomy` / market clear.
- **Decorative:** `expectedMargin` / `demandPressure*` / `marketSnapshot` unused by findTradeOpportunity.

---

## Profession mobility gaps

1. **Primary path** (`assignProfession` to `computeProfessionChoice`): village `CareerDemandVector` + skills/personality/location — **no personal `DemandTag`**, no wealth, no wage clearing.
2. **Secondary path** (`livelihood` softProfession): practice mix to recipe to `applyProfessionChange`, dampened by foodNeed/famine.
3. **Gap:** `suggestOccupationShift` never applied; economy occupation bridge is explainability-only.
4. **Gap:** `applyPersonalDemandNudge` exists in `careers.ts` but professionFactors duplicates demand scoring inline and does not import it yet.
5. **Mitigation this pass:** softProfession elevated-foodNeed threshold eases when soft metier **matches** `topDemand(demandFromVillager)` (tools to smith/miner, shelter to builder, etc.). Famine hard-block on non-food unchanged.

---

## Minimal fixes implemented (economy / careers / livelihood only)

| Change | File | Why safe |
|--------|------|----------|
| Reservation wage polarity (desperation lowers ask) | `economy/wages.ts` | Fixes anti-causal hire gate; no new resources |
| `employerOfferFromDecisionWealth` | `economy/wages.ts` | Aligns offer helper with ecology wealth |
| `estimateDecisionWealth` + capitalProxy on ledger | `economy/wealthLedger.ts` | Facade over existing ecology wealth |
| `applyPersonalDemandNudge` | `careers.ts` | Ready for professionFactors wiring; no dual apply |
| Demand-aligned softProfession threshold | `livelihood.ts` | Uses existing demand facade; keeps famine lock |
| `topOccupationShift` | `economy/occupationBridge.ts` | DATA convenience only |

**Not done (would need behaviors / professionFactors / build):** wire nudge into score stack; pay coins = f(wage score); harvestDeposit / applyCraft / consumeNeedBasket into execute; registerBusiness from workplaces.

---

## FILES

### Modified
- `src/lib/sim/economy/wages.ts`
- `src/lib/sim/economy/wealthLedger.ts`
- `src/lib/sim/economy/wave3Wealth.ts`
- `src/lib/sim/economy/wave3Wages.ts`
- `src/lib/sim/economy/occupationBridge.ts`
- `src/lib/sim/economy/wave2Occupations.ts`
- `src/lib/sim/economy/index.ts`
- `src/lib/sim/careers.ts`
- `src/lib/sim/livelihood.ts`
- `economic_emergence_audit.md` (this file)

### Read-only consulted
- `inventory.ts`, `behaviors.ts` (assignProfession / trade / jobBonus), `types.ts`, `commerce.ts`, `ecology.ts`, `professionFactors.ts`, `build/npcBuildBehaviors.ts`, terminals / sim_logs README

---

## Interfaces (public contracts)

```ts
// Wealth
estimateDecisionWealth(v): number           // causal (= ecology)
estimateWealth(v, state?): number           // market ledger snapshot
estimateWealthBreakdown(...): WealthBreakdown // + capitalProxy

// Wages (unitless scores != coins)
reservationWage(v): number
employerOffer(productivity, profitProxy): number
employerOfferFromDecisionWealth(owner, productivity): number
wageWouldClear(reservation, offer): boolean

// Demand to career (village + personal)
computeCareerDemand(state, village): CareerDemandVector
applyCareerDemandToScores(scores, demand): void
applyPersonalDemandNudge(scores, v): DemandTag | null  // NEW — wire in professionFactors

// Occupation (DATA)
suggestOccupationShift(v, state): OccupationShiftSuggestion[]
topOccupationShift(v, state, minDelta?): OccupationShiftSuggestion | null

// Consumption / production facades (unused by execute)
consumeNeedBasket(view, demand): NeedBasketPreview
applyConsumeFood(view, amount): ConsumeFoodResult
applyCraft(recipe, skillLevel): ApplyCraftResult
```

---

## Limitations

- Phase 7 economy does **not** replace commerce pricing, inventory capacity, or metier writers.
- Two wealth formulas remain until family/build switch imports to `estimateDecisionWealth` (same numbers) or ledger replaces ecology intentionally.
- Wage scores do not set coin amounts; telemetry `wagesPaidCoins` stays 0 until hire+pay succeeds more often **and** `noteWagesPaid` fires.
- `economyDeposits` / `economyBusinesses` are empty bags until callers register/harvest.
- Food-chain recipes in economy must stay documentation-synced with behaviors ratios (`FOOD_CHAIN_*`).

---

## Integration points (wire into decisions — propose only)

1. **`professionFactors.computeProfessionChoice`:** after village demand layers, `applyPersonalDemandNudge(scores, v)`; optionally factor-tag `personalDemand`.
2. **`behaviors` eat path:** optional `consumeNeedBasket(wrapInventory(v.inventory), demandFromVillager(v))` for unmetTags to task urge (clothing/fuel), without inventing goods.
3. **`build/npcBuildBehaviors.payHelper`:** use `employerOfferFromDecisionWealth`; consider `Math.max(1, round(offer))` coins when clearing (still single currency).
4. **Trade urge:** `expectedMargin(localPrice(home), localPrice(dest), transport)` inside `findTradeOpportunity` (commerce) — read-only prices already live.
5. **Deposit dig:** after successful gatherIron/mine, optionally `harvestDeposit` to keep bag qty in sync — do not grant extra ore.
6. **Occupation:** if `topOccupationShift` delta clears sticky threshold and foodNeed gate ok to `applyProfessionChange` (same writer as today).

---

## Chain closure summary

```
world resources --> behaviors gather/produce --> inventory Slot[]
        |                                            |
        |                                            v
        |                              commerce prices / surplus
        |                                            |
        v                                            v
  deposits facade (unused)              tradeRun / buyMaterial / mintCoins
                                                     |
                                                     v
                                              coins (= income)
                                                     |
                          +--------------------------+--------------------------+
                          v                          v                          v
                 ecology wealth (causal)    wage score gate (build)    SoL / prosperity
                          |                          |                          |
                          +------------ demand <-----+-- careers village demand +
                                            |
                              livelihood soft + (new) personal demand nudge helper
                                            |
                                            v
                                   applyProfessionChange --> jobBonus --> production
```

**Bottom line:** emergence is real on food/craft/trade/coins/village career demand; Phase 7 economy layer is mostly observation API. This pass fixes wage polarity, bridges decision wealth, and tightens demand to metier on the soft path + ready nudge for the primary score stack.
