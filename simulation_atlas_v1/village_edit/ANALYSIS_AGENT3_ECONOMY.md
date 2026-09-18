# AGENT 3 — Economy analysis (read-only)

**Workspace:** `C:\\Users\\kamel\\village-sim-1\\_wt_rhythm\\village_edit`  
**Date:** 2026-09-17  
**Scope:** resources → production → jobs → goods → consumption → market → price → wealth → investment, plus **food ↔ price ↔ job ↔ production** both directions.  
**Sources:** `FOOD_CHAIN_FIX.md`, `SECOND_AUDIT_EMERGENCE.md`, `SECOND_AUDIT_REPORT.md`, `AUDIT_A6_ECON.md`, `INTERCONNECT_*`, `DYNAMIC_CAREERS.md`, `REALISTIC_FIELDS.md`, code in commerce/careers/fields/behaviors/resources/ecology/engine, probe dumps `_second_audit_s*`, `_food_chain_*`, `_verify_*`.  
**Legend:** **[PROBE]** = observed in headless probe logs · **[CODE]** = architecture / wiring only · **[STALE]** = older dump that must not override fresher evidence.

---

## SYSTEMS_ANALYZED

| System | Primary files | Role in chain |
|--------|---------------|---------------|
| Resource catalogue | `src/lib/sim/resources.ts` | Defs: mass, nutrition, basePrice, targetPerCapita, tradeable, recipes |
| Extraction | `behaviors.ts` (gather*, harvestWheat, fish), `mining.ts` | Tile depletion → inventory |
| Fields / crops | `fields.ts`, `behaviors.tickFields`, claim/sow/clear | Land ownership + wheat growth |
| Transform (food) | grindFlour / bakeBread / buildMill | wheat → flour → bread |
| Transform (craft) | craftGear, weave, iron tools, recipes | Non-food goods |
| Careers / jobs | `careers.ts`, assignProfession / jobBonus | Macro demand → métier → task bias |
| Livelihood overlay | `livelihood.ts`, mind roleTag | Soft titles; practice drift → applyProfessionChange |
| Consumption | eat / giveFood / hunger / SoL basket | Goods → satiation / sharing |
| Village surplus | `commerce.tickVillageEconomy` | Per-capita stock vs target |
| Regional soft production | `applyRegionalProduction` | Specialty + craft counts nudge surplus |
| Markets / prices | tickMarketPrices, priceOf, priceUrge | Scarcity clearing → state.prices |
| Trade (caravan) | findTradeOpportunity → tradeRun → conductTrade | Inter-village goods + coins |
| Trade (barter) | `behaviors.tickTrade` | Local hungry food-for-coin |
| Wealth / SoL | villagerSoL, prosperity, loyalty, coins | Living standards + inequality stress |
| Investment proxies | mill/port/market/mine/house/cart builds | Wealth/SoL → infra ambition |
| Famine ecology | ecology.feelFamine / villageInFamine, tickFamine | Crisis → careers/tasks/trade |
| Politics levers | politicalPriceBias, migrationUrge, creeds, guilds | Soft external multipliers |
| Engine cadence | `engine.stepSimulation` | Economy period vs per-tick fields/agents |

---

## CURRENT_ARCHITECTURE

### Tick order (economy-relevant) — **[CODE]**

`engine.stepSimulation`:

1. Climate
2. `tickFamine` every 40 ticks
3. Every `commerceEvery` (~200–300× perf mul): `tickVillageEconomy` → `tickUrbanNetwork` → `tickMarketPrices`
4. Per villager: `tickVillager` (profession review, cognition, `chooseTask` / execute)
5. `tickTrade` (local barter)
6. Marriage / reproduction
7. **`tickFields`** (grow **all** WHEAT tiles)
8. Animals / combat / bandits / politics

### Chain map (intended causal flow)

```
RESOURCES (RESOURCE_DEFS)
  → extract (gather / harvest / fish / mine)
  → personal fields (claim → clear/sow → grow → harvest)
  → transform (mill: wheat→flour; hearth/bench: flour→bread; craft)
  → village.surplus (tickVillageEconomy + specialty boost)
  → state.prices (tickMarketPrices scarcity)
  → priceUrge / grainPriceUrge / decide market_high
  → chooseTask scores + jobBonus(profession)
  → goods in bags/chests → eat / giveFood / trade
  → coins + SoL + prosperity
  → infra urge (mill/port/market) + career cultureNeed / tradeNeed
  → soft investment: houses, carts, mills, ports, markets
```

**Reverse food loop:**

```
feelFamine / low perCapFood
  → computeCareerDemand.foodNeed ≥ 0.75
  → assignProfession favors farmer/forager/fisher/herder/miller
  → cultureNeed=0; tradeNeed floored ~0.2
  → giveFood↑ leisure↓; tradeRun food→hungry dest
  → priceUrge/grainPriceUrge → sow/harvest/grind/bake
  → production restores stocks → prices ease → demand relaxes
```

### Module responsibilities

| Module | Owns |
|--------|------|
| `resources.ts` | Catalogue; TRADEABLE → TRACKED_RESOURCES |
| `commerce.ts` | Prices, surplus, SoL, development, laborBalance, prosperity, trade, markets/ports |
| `careers.ts` | Demand vector + applyProfessionChange (field lock/handoff + livelihood sync) |
| `fields.ts` | Cap, claim gates, farmer lock, orphan wheat search, farmer pressure |
| `behaviors.ts` | Production/consumption tasks, priceUrge, mill/grind/bake |
| `ecology.ts` | Famine feel; wealth estimate; landscape pressure |
| `cognition/decide.ts` | market_high / survival factors on grind/bake/mill/trade |
| `livelihood.ts` | Practice mix → soft profession via applyProfessionChange |
| `politics.ts` | Price bias, migration, guild skill drip, creed task bias |

### Authority rules — **[CODE]** + **[PROBE]**

- `v.profession` drives jobBonus, field claim/sow/release, career switches.
- `applyProfessionChange` is the only safe métier apply path (syncs livelihood unless cultural overlay pretre/gourou).
- `buildHouse` now calls `applyProfessionChange` (interconnect fix).
- Farmers with farmable plots are **locked** unless `tryHandoffField` succeeds.


---

## PROBLEMS

Ordered by economy-chain impact. Tagged **[PROBE]** / **[CODE]** / **[STALE]**.

### P1 — Bake lag vs grind (throughput asymmetry) — **[PROBE]**
- Seed7 harvest_fix 30d: `cum.grind` 2919 vs `cum.bake` **29** (stuck after early bake); flour rises, bread often 0 mid/late.
- Emergence seed7: grind 3561 / bake 247. Seed1 food-chain: grind 1148 / bake 42.
- Cause class: task selection / hearth reach / flour on wrong agents (`FOOD_CHAIN_FIX.md` remaining risks).

### P2 — Local coin market (`buyMaterial`) quiet — **[PROBE]**
- `_verify_econ_s7_d40.txt`: buyMaterial starts **0**; iron/cloth stocks 0; iron price ~18→24.
- A6 residual R3. Caravans move goods; villager↔chest coin purchases do not close local retail.

### P3 — Textile / iron production not price-pulled early — **[PROBE]**
- Same dump: wool/leather/iron/cloth = 0; weave/sew/gatherIron starts = 0; craftGear = 0.
- Prices rise without matching extract/transform → broken feedback for non-food basket.

### P4 — `giveFood` under live `feelFamine` PARTIAL — **[PROBE]**
- Emergence: s7 giveFoodTicks=199 but giveFoodUnderFamine=0; s1 giveFood=0.
- Floor lowered to 0.55 under famine **[CODE]**; induce@d20 window still too short.

### P5 — Seed fragility on farm half — **[PROBE]**
- Seed1 after sow/clear fix: harvestStarts=10, ticks=129, wheatTiles=0 end vs s7 wheatTiles=67.
- Seed1 mill late (~d20–28); pioneer wheat missing unlike seed7.
- Pre-fix harvest=0: exclusive clear vs sow blocked bare-cell sow (emergence §Fixes).

### P6 — Soft surplus injection can desync stocks from trade — **[CODE]**
- `applyRegionalProduction` adds fractional surplus without moving inventories.
- Trade scores surplus; `conductTrade` pulls chests → phantom surplus risk.

### P7 — Dual trade systems weakly coupled — **[CODE]**
- Caravans: price-weighted, surplus-based, coin rewards.
- `tickTrade`: proximity food barter; ignores `state.prices`. Agents feel two economies.

### P8 — Stale / contradictory docs & dumps — **[CODE]** meta
- `CAREER_DEMAND_NOTES.md` says helpers “not wired” / REVIEW×5 — **false** (wired; ×2).
- `_verify_econ_s7_d40.txt` harvestWheat:0 is **[STALE]** pre-orphan-fix; do not override harvest_fix.
- `REALISTIC_FIELDS.md` herder light-claim vs `CRAFT_NO_FIELD` includes herder.
- Emergence claimed fields.ts UTF-8; on-disk `fields.ts` was **UTF-16 LE** this pass.

### P9 — food→price→job full close still PARTIAL — **[PROBE]** + audit
- Farm/mill/career PASS on seeds 1+7; trade/title + buyMaterial open.
- Millers=0 in harvest_fix while grind runs via farmer jobBonus.

### P10 — Wealth → investment soft/incomplete — **[CODE]**
- Coins/SoL gate houses/carts/mill-port urge; no dedicated capital ledger.
- inequalityStress rises on fat trade rewards; weak recycle into productive investment.

---

## ISOLATED_SYSTEMS

| Isolate | Evidence |
|---------|----------|
| `careerDemandForProfession` | Exported helper; not on hot path **[CODE]** |
| `tickTrade` local barter | Separate from caravan/price clearing **[CODE]** |
| Cultural livelihood overlays | Title may diverge; jobBonus stays on métier |
| `computeLaborBalance` | Attractiveness/migration only; not assignProfession **[CODE]** |
| Deep craft basket (copper/tin/salt/…) | In RESOURCE_DEFS + priced; early probes quiet **[PROBE]** |
| Gossip dual memory | Society isolate; can starve trust signals **[CODE]** |
| Deep institutions beyond guild teach | Soft; not T-B economy soak criteria |

---

## MISSING_CONNECTIONS

| Desired link | Status | Notes |
|--------------|--------|-------|
| resources → production | **LIVE** food; **PARTIAL** metals/textiles | |
| production → jobs | **LIVE** | wheatStock/fields/hasMill + demand |
| jobs → goods | **LIVE** food; **PARTIAL** gear | jobBonus |
| goods → consumption | **LIVE** | eat, edibleValue, SoL |
| consumption → market/price | **PARTIAL** | prices from stocks vs target, not eat events |
| market/price → production | **LIVE** food; **WEAK** iron/cloth | priceUrge |
| price → jobs | **LIVE** via surplus/famine; weak via raw price alone | |
| wealth → investment | **PARTIAL** | infra/house/cart |
| food → price | **LIVE** | tickMarketPrices + famineFood mul |
| price → food jobs/production | **LIVE** | demand + grainPriceUrge |
| jobs ↔ field production | **LIVE** after orphan+sow fixes | |
| production → price ease | **PARTIAL** | bake lag keeps flour/bread high **[PROBE]** |
| trade → local retail | **MISSING** | buyMaterial≈0 |
| surplus ↔ physical goods | **LEAK** | applyRegionalProduction phantom |

---

## DUPLICATES

| Pair | Overlap |
|------|---------|
| farmerProfessionPressure vs foodNeed | Both bump farmer scores |
| applyRegionalProduction vs real harvest/grind | Double-count in surplus space |
| tickTrade vs giveFood vs tradeRun | Three food redistribution paths |
| Global famine vs villageInFamine | Unified via feelFamine (good) |
| Livelihood mix vs career demand vs resource density | Triple profession scoring |
| villagerSoL food basket vs famine stock crisis | Related, different thresholds |
| CAREER_DEMAND_NOTES vs DYNAMIC_CAREERS | Stale duplicate guidance |
| _verify_econ harvest=0 vs harvest_fix | Contradictory dumps |


---

## EVIDENCE

### Probe-proven **[PROBE]**

| Claim | Source |
|-------|--------|
| Harvest live seed7 (cum.harvest 306@d5 → 4665@d30; ripe=12@d15) | `_food_chain_s7_harvest_fix.txt` |
| Emergence OVERALL PASS seeds 1 & 7 × 40d | `_second_audit_s1.txt`, `_second_audit_s7.txt`, `SECOND_AUDIT_EMERGENCE.md` |
| Seed1 harvest was 0; after clear∥sow: starts=10, ticks=129 | Emergence harvest table + food_chain s1 |
| Induced famine → foodNeed=1.0 both seeds | Emergence dumps |
| Profession switch releases field + livelihood sync + jobBonus flip | Emergence `professionSwitch` (farmer→miller) |
| Mill→grind→bake live (seed-dependent timing) | Emergence millChain; food-chain dumps |
| Careers dynamic / craftWithField=0 / midlife switches | `_verify_careers_s7_d40.txt` |
| TradeRuns grow; markets stamp; coins rise | `_verify_econ_s7_d40.txt` (trade/prices still valid) |
| buyMaterial / weave / iron extract dead in that window | `_verify_econ_s7_d40.txt` |
| giveFoodUnderFamine=0 after induce | Emergence famine block |
| Shortage demand vector flips when induced | `INTERCONNECT_FIXES.md` day20–30 notes |

### Code-only **[CODE]** (read this pass)

| Claim | Location |
|-------|----------|
| Economy tick triad order | `engine.ts` ~533–538 |
| Global wheat growth (orphan fix) | `behaviors.tickFields` |
| Farmer lock / handoff / orphan claim | `fields.ts` + `careers.applyProfessionChange` |
| priceUrge clamp 0.55–2.6 | `behaviors.ts` |
| grainPriceUrge on sow/harvest | `behaviors` chooseTask |
| Mill bootstrap ignores flour price chicken-egg | FOOD_CHAIN_FIX + mill urge comments |
| Food relief trade scoring | `commerce.findTradeOpportunity` |
| Demand axes → scores | `careers.computeCareerDemand` / applyCareerDemandToScores |
| assignProfession calls demand | `behaviors.assignProfession` |
| SoL / prosperity / attractiveness formulas | `commerce.ts` |
| conductTrade reserve + coin = f(price) | `commerce.conductTrade` |

### Stale — do not use as current harvest truth **[STALE]**

- `_verify_econ_s7_d40.txt` / `_verify_food_s7_d40.txt` harvest starts=0 (pre-orphan-fix). Prefer `_food_chain_s7_harvest_fix.txt`.

---

## PROPOSED_FIXES

Causal, minimal — analysis only (no implementation this pass).

1. **Bake throughput** — Prefer agents holding flour≥2 wake/choose bake near hearth; chest flour pull like ensureBagGrain; avoid grind monopolizing when bread priceUrge high and flour glut.
2. **Re-probe econ chain** after harvest/sow fixes — refresh `_probe_econ_chain.ts` so starts.harvestWheat / craftGear / buyMaterial baselines are current.
3. **buyMaterial / local market** — Raise score when priceUrge(need) high and seller chest surplus above targetPerCapita; trader jobBonus path already present.
4. **Iron/cloth price pull** — Mirror grainPriceUrge for forge/textile extract+craft (A6 R2).
5. **Phantom surplus** — Cap or remove applyRegionalProduction food boosts, or require matching inventory before trade scoring uses surplus.
6. **giveFood under famine** — Slightly longer post-induce observation or share from chest (not only bag); no free food.
7. **Unify barter** — Make tickTrade use priceOf or retire it in favor of giveFood + buyMaterial.
8. **Docs/encoding hygiene** — Rewrite CAREER_DEMAND_NOTES to match live wiring; keep fields.ts/careers.ts UTF-8; align REALISTIC_FIELDS herder claim with CRAFT_NO_FIELD.
9. **Wealth→investment** — Explicitly spend coins on mill/port/cart/house expand so the loop is probe-visible.

---

## FILES_TO_MODIFY

| File | Why |
|------|-----|
| `src/lib/sim/behaviors.ts` | Bake scores/wake; buyMaterial urge; non-food price pulls; optional tickTrade; merge hotspot |
| `src/lib/sim/commerce.ts` | Surplus authenticity; trade↔retail |
| `src/lib/sim/careers.ts` | Only if demand axes need price inputs (optional) |
| `src/lib/sim/fields.ts` | Encoding UTF-8; herder policy if intentional |
| `src/lib/sim/cognition/decide.ts` | market_high coverage for iron/cloth/bake |
| `src/lib/sim/ecology.ts` | Only if famine share needs stock defs |
| `scripts/_probe_econ_chain.ts` | Refresh evidence (normalize encoding if UTF-16) |
| `scripts/_probe_food_shortage.ts` / `_probe_second_audit_emergence.ts` | giveFood-under-famine gate |
| Docs: `CAREER_DEMAND_NOTES.md`, `REALISTIC_FIELDS.md` | Sync with code |

**Usually leave alone:** `resources.ts` catalogue (stable).

---

## DEPENDENCIES

```
resources.ts
    ↑ used by commerce (BASE_PRICES, TARGET, TRADEABLE), inventory, behaviors
fields.ts ←→ careers.applyProfessionChange ←→ behaviors.assignProfession / claim / sow
ecology.feelFamine → careers.demand + behaviors.chooseTask + commerce.trade + politics.migration
commerce.prices ← tickMarketPrices ← surplus ← tickVillageEconomy ← physical stocks (+ specialty boost)
behaviors.priceUrge ← priceOf(state.prices)
decide.ts market_high ← cognition/tick semantics ← prices
livelihood.softProfession → applyProfessionChange (same as careers)
engine cadence gates how often prices/surplus update vs per-tick production
politics.politicalPriceBias / creeds / guilds → soft multipliers on prices & tasks
```

**Probe dependency:** food_chain / careers / econ_chain / food_shortage / second_audit_emergence share createSimulation + stepSimulation; emergence additionally induces famine and profession switches.

---

## POSSIBLE_CONFLICTS

| Conflict | Risk |
|----------|------|
| Agent farm fixes vs career churn | Farmer lock must stay when leaving farm jobs |
| Softmax task competition | Raising bake/buyMaterial can starve harvest or rest |
| Removing applyRegionalProduction | May break early specialty/trade until real stocks catch up |
| UTF-16 fields.ts / probe scripts | Edits silently corrupt or break tooling |
| Parallel agents (brain / interconnect / economy) | behaviors.ts is a merge hotspot |
| Famine induce in probes vs natural path | Demand PASS can be induce-only; seed7 natural famine rare |
| PROFESSION_REVIEW stickiness | High foodNeed may not flip locked crafts in short probes |
| Performance commercePeriodMul | Slower price updates → weaker price→task feedback |
| Title overlay vs métier | UI/title nuance already PARTIAL — don’t clear overlays to fake sync |

---

## Chain scorecard (summary)

| Link | Direction | Verdict | Proof class |
|------|-----------|---------|-------------|
| resources → production | → | PASS (food); PARTIAL (metals/textiles) | PROBE+CODE |
| production → jobs | → | PASS | PROBE+CODE |
| jobs → goods | → | PASS (food); PARTIAL (gear) | PROBE |
| goods → consumption | → | PASS | CODE |
| consumption → market | → | PARTIAL | CODE |
| market → price | → | PASS | PROBE+CODE |
| price → wealth | → | PASS (trade coins); PARTIAL (retail) | PROBE |
| wealth → investment | → | PARTIAL | CODE |
| food → price | ↔ | PASS | PROBE |
| price → food jobs/production | ↔ | PASS | PROBE+CODE |
| jobs ↔ production (fields) | ↔ | PASS after orphan+sow fixes | PROBE |
| Full one-economy | — | **PARTIAL** (farm closed; retail/textile/investment open) | SECOND_AUDIT |

---

*Analysis only — no simulation code changed.*
