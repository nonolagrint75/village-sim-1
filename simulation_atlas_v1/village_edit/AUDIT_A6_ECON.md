# AUDIT A6 — Economy

**Agent:** A6 · **Workspace:** `village_edit` · **Date:** 2026-09-16  
**Scope:** RESOURCES → extract → transform → trade → prices → wealth → decisions  
**Probes:** `scripts/_probe_food_economy.ts`, `_probe_trade.ts`, `_probe_econ_chain.ts` (seed=7)

---

## Chain map (causal)

| Stage | Live? | Mechanism |
|-------|-------|-----------|
| RESOURCES catalogue | YES | `resources.ts` RESOURCE_DEFS → mass, nutrition, basePrice, tradeable, recipes |
| Extract | YES | gatherFood/Wood/Stone/Iron, harvestWheat, fish, hunt extras |
| Transform | YES (was broken) | mill: wheat→flour (`grindFlour`); flour→bread (`bakeBread`); gear (`craftGear`); weave/tan/iron |
| Trade | YES (was dead early) | `findTradeOpportunity` → `tradeRun` → `conductTrade` (chest surplus, market price reward) |
| Prices | YES | `tickMarketPrices` scarcity clearing → `state.prices` |
| Wealth | PARTIAL | coins from trade; SoL / prosperity / inequalityStress |
| Decisions | FIXED link | `priceUrge` + `market_high` semantic now bias chooseTask / factors |

---

## Baseline (pre-fix, seed=7 d35)

| Metric | Value |
|--------|------:|
| mills | 0 |
| flour / bread | 0 / 0 |
| buildMill / grindFlour / bakeBread starts | 0 / 0 / 0 |
| craftGear starts | 0 (gearEligible≈8 — score-starved) |
| tradeRunsTotal | 0 |
| traders profession | 0 |
| bread / flour / iron prices | ~9 / ~13.6 / ~26 (scarcity with no production response) |

**Verdict:** Prices moved; production and caravans did not. Classic broken feedback.

---

## Broken links found (causal)

### E1 — Prices did not affect `chooseTask` (critique)
- **Proof:** `priceOf` only gated `buyMaterial` affordability; grind/bake/mill/trade scores ignored live prices. `market_high` semantic written in `cognition/tick.ts` but unused in `decide.ts` needsFactor.
- **Effect:** Flour/bread at 3–4× base while wheat piled up; no mill pull.

### E2 — Mill never completed (critique)
- **Gates:** water site (r=45 missed inland villages), bag-only wood/stone (not household), stone cost 4 while bags held ≤1, far sites timed out at TASK_MAX_AGE=600, vegetation abort on execute.
- **Proof:** diag day12 millX set + canMill on some owners; probe buildMill starts=0 then later starts without hasMill; stone stock≈1.

### E3 — `craftGear` eligible but never chosen (majeur)
- **Proof:** gearEligible=8, starts=0. Softmax lost to harvest/rest; cold interrupt only on leisure.
- **Materials:** bag-only `canAffordGear`; chest stock ignored.

### E4 — `tradeRun` deals exist, starts=0 (majeur)
- **Proof:** `findTradeOpportunity` returned food/wood deals (gain>3, d<50) for wealth/homeowners; tradeRunsTotal stayed 0 to d30. Score lost to rest/harvest; trader profession never assigned.

### E5 — Miller profession jobBonus missing (majeur)
- `assignProfession` could pick `miller`, but `jobBonus` fell through to default×1 — no grind/bake/mill amplify.

### E6 — No infinite free resources (OK)
- Tile takes deplete `grid.amount`; trade pulls chest surplus above targetPerCapita; grind/bake consume inputs; mill build spends wood/stone. No free spawn loops found in the economy path.

---

## Fixes applied

1. **`priceUrge(res)`** in `behaviors.ts` — live/base price multiplies mill / grind / bake / trade / craftGear scores.
2. **`market_high` → decisions** — `decide.ts` needsFactor/survivalUrgency boost grind/bake/buildMill/tradeRun; tick also tags high flour.
3. **Mill pipeline** — site search 28→45→80; householdStock/consumeHousehold; cost wood4/stone1; clear-in-place on execute; maxAge 2400; rest-wake soft-assign sites mill + gather stone/wood + buildMill before craftGear; wide stone seek.
4. **jobBonus** — `miller` case; farmer gets buildMill/grind/bake; trader gets buyMaterial.
5. **craftGear** — household `stockOf`; higher base urge; daytime productive boost; rest-wake assign when eligible.
6. **Trade** — higher base score + pricePush; easier MIN_TRADE_GAIN; absolute-glut gain; price-weighted opportunity; trader profession boosted by tradeRuns/market/prosperity.
7. **Bugfix** — removed broken `nearestResource` call (furniture tallow path) that could throw mid-chooseTask.

---

## Post-fix probe (seed=7)

| Day | mills | flour | bread | grind starts | bake starts | craftGear | tradeRunsTotal | traders | bread price |
|----:|------:|------:|------:|-------------:|------------:|----------:|---------------:|--------:|------------:|
| 10 | 2 | 12 | 23 | 33 | 16 | 0 | 4 | 0 | 5.3 |
| 20 | 2 | 13 | 19 | 100 | 19 | 2 | 8 | 2 | 4.7 |
| 40 | 2 | 8 | 13 | 178 | 25 | 2 | 36 | 1 | 5.9 |

**Closed loops:** wheat→mill→flour→bread; prices fall when mills run; tradeRuns/markets/routes grow; profession trader appears.

---

## Residual / open

| ID | Issue | Sev |
|----|-------|-----|
| R1 | `harvestWheat` start counter sometimes 0 while stocks still mill — verify field re-sow vs soft-assign crowding | mineur |
| R2 | Iron/cloth/wool still ~0 in early window — mining/textile chain not yet price-pulled | mineur |
| R3 | `buyMaterial` starts still 0 — local coin↔chest market quiet | mineur |
| R4 | Only ~2/4 villages get mills by d40 (water-site distance) | mineur |

---

## Files touched

- `src/lib/sim/behaviors.ts` — priceUrge, mill/grind/bake/trade/craft, jobBonus, rest-wake
- `src/lib/sim/cognition/decide.ts` — market_high / grind-bake survival factors
- `src/lib/sim/cognition/tick.ts` — flour in market_high
- `src/lib/sim/commerce.ts` — trade gain / price-weighted opportunity
- `src/lib/sim/equipment.ts` — household stockOf for gear pick
- `scripts/_probe_econ_chain.ts` — chain probe

---

## Bottom line

**Before:** prices floated while mill/flour/bread/craftGear/tradeRuns stayed dead — decisions ignored markets.  
**After:** prices pull mill build and grind/bake; flour & bread appear; tradeRuns and traders fire; craftGear starts. Top broken links E1–E5 fixed causally; no infinite free resources introduced.
