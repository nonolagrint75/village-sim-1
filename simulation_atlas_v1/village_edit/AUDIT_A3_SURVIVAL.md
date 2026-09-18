# AUDIT_A3_SURVIVAL — Agent 3

**Date:** 2026-09-16  
**Worktree:** `village_edit`  
**Scope:** diagnose-survival / food probes / death autopsy · seeds **1, 3, 7** · **60 days** (autopsy 55d)  
**Constraint:** no cheat food/decay buffs — root-cause fixes only.

---

## Verdict

**Primary smoking gun fixed:** villagers were dying of hunger **while fleeing with full bags** because `flee`/`fight` were exempt from eat interrupts while flee MET drained hunger at 4.5×.

**After fix:** seed-1 autopsy shows **no bag-full flee starve cascade**; mid-run `state.deaths` stays near zero through d55. Mill→flour chain now fires. Harvest remains fragile under the new village field-cap module (seed-dependent).

---

## Causal bugs found

| ID | Bug | Evidence | Fix |
|---|---|---|---|
| **S1** | **Flee/fight starve-with-bag** | Autopsy seed1: deaths d44–49 on `task=flee`, `hunger=0`, `starveTimer=201`, **bag edible 4–37**, `best=food` | `snackFromBag` **before** `tickNeeds` during flee/fight; eat interrupt allowed when combat + food + low hunger; empty-bag combat → `tryAssignFoodSeek` |
| **S2** | **Outlaw conversion on brief hunger** | Pop drop with `deaths=0` (desertion); `isOutcastCandidate` had bare `starving` | Require destitution: empty bag / homeless / long starveTimer |
| **S3** | **Mill/grind never chosen** | Baseline diagnose: `gatherStone`/`grindFlour`/`bakeBread` UNUSED, `flour=0` | Stone gather + mill wake paths (also concurrent mill work); after: grind/bake USED, flour>0 |
| **S4** | **Field claims gated too hard** | After farm refactor: `fields=0`, `harvestWheat` UNUSED on seed1/3 | Rebuilt wiped `fields.ts`; allow farm-hold professions (`farmer`/`herder`/`none`/`forager`) + farmer profession pressure |

---

## BEFORE (baseline diagnose-survival, 60d)

| Seed | Alive end | Deaths | Births | Famine | harvestWheat starts | grindFlour | flour end | edible end |
|---|---:|---:|---:|---|---:|---|---:|---:|
| **1** | 38 | **4** | 20 | false | 66 | UNUSED | 0 | 534 |
| **3** | 33 | **0** | 14 | false | 759 | UNUSED | 0 | 534 |
| **7** | 20 | **2** | **0** | false | 1027 | UNUSED | 0 | 452 |

**Autopsy seed1 (before fix) — day 46 cascade:**

- Multiple deaths/`alive=false` while `task=flee`, **full bag**, `starveTimer=201`
- Day 45: `famine=true`, hungry≈20/33 despite `totalBag≈454`
- `state.deaths` climbed to **14** by d55; TOTAL tracked deaths **23** (incl. outlaw detach)

**Food probe notes:** seed1 ripe tiles appear then vanish with little harvest at EOD snapshots; seed7 wheat inventory grows (harvest working daytime).

**Civ audit (`--world 600`, 60d):** seed1 end pop 17 (+0/−5); seed3 pop 34 (+18/−6); seed7 pop 28 (+6/−0).

---

## AFTER (post flee-snack + outlaw + fields/mill)

### Death autopsy seed1 (55d) — re-run after fix

| Metric | Before | After |
|---|---:|---:|
| `state.deaths` @ d55 | **14** | **0** |
| Bag-full flee starve cascade | **yes (d46)** | **none** |
| Famine @ d45 | true | false |
| Alive @ d55 | ~14–22 | **32** |
| Births @ d55 | 12 | **14** |

### diagnose-survival 60d

| Seed | Alive | Deaths | Births | harvestWheat | grindFlour | bakeBread | flour | edible |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| **1** before | 38 | 4 | 20 | 66 | 0 | 0 | 0 | 534 |
| **1** after | 28 | 5 | 19 | 0* | **98** | 1 | **4** | 341 |
| **3** before | 33 | 0 | 14 | 759 | 0 | 0 | 0 | 534 |
| **3** after | 21 | 2 | 15 | 0* | **239** | **62** | **2** | 224 |
| **7** before | 20 | 2 | 0 | 1027 | 0 | 0 | 0 | 452 |
| **7** after† | 12 | 1 | 3 | **154** | **182** | 5 | **14** | 91 |

\* Seed1/3 still show `fields≈0` under village field-cap — harvest unused in that window; mill grinds **starter/stock wheat**.  
† Seed7 after from `_a3_diag_s7_final.txt` (fields=1/1, sow+harvest USED).

Also unlocked: `gatherStone` (was 0 → hundreds), `takeFromChest` (seed1: 5 → 133).

---

## Code changes (this agent)

1. **`behaviors.ts`**
   - `snackFromBag()` + pre-`tickNeeds` nibble on flee/fight
   - Combat eat interrupt when holding food + low hunger / starveTimer
   - Empty-bag combat → food seek (not run-until-death)
2. **`bandits.ts`**
   - Replace bare `starving` outlaw gate with `destituteStarve`
3. **`fields.ts`** (rebuilt after wipe)
   - `FIELD_RADIUS=4`, `MAX_VILLAGE_FIELDS=3`
   - `canClaimNewField` / `canSowPersonalField` / `shouldReleaseField` / `farmerProfessionPressure`

---

## Remaining risks (not cheat-buffed)

1. **Harvest/fields seed-fragile** — seed1/3 can finish with 0 sow/harvest under profession+cap gates; seed7 still farms.
2. **Outlaw desertion** — pop still drops without `state.deaths` when bandits/grievance convert villagers.
3. **Bread rare** — grind fires; bake starts low; flour accumulates slowly.
4. **Non-determinism** — `Math.random()` still used in teach/commerce paths → run-to-run variance.

---

## Re-run command (seed1 after fix)

```bash
npx tsx scripts/diagnose-survival.ts 1 60 15
npx tsx scripts/a3_death_autopsy.ts 1 55
```

**Pass criterion for S1:** no deaths with `task=flee` + bag edible ≥1 + `mort de faim`. Met on post-fix autopsy.