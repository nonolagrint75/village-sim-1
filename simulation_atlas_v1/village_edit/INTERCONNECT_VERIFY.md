# INTERCONNECT_VERIFY

**Workspace:** `village_edit`  
**Date:** 2026-09-16  
**Seed / horizon:** 7 / 40 days (harvest re-probe 30d)  
**Verdict:** **PASS** (farm half) — survival + grind/bake + careers + **harvestWheat** live on seed 7. Trade/title nuance still PARTIAL for full food→price→job close. **Réaudit live DONE** (buildHouse sync + mind life-event helpers).

---

## Logs utilisateur

- Terminals: probe scripts (`_probe_food_chain.ts 7 30`, careers/econ verify) — **no live Vite/Electron** at merge.
- Freshest harvest evidence: `_food_chain_s7_harvest_fix.txt` (terminal 158265).

---

## Patch readiness

| Artifact | Present at verify |
|----------|-------------------|
| `FOOD_CHAIN_FIX.md` | yes |
| `DYNAMIC_CAREERS.md` / `CAREER_DEMAND_NOTES.md` | yes |
| `scripts/diagnose-survival.ts` | yes |
| `scripts/_probe_food_chain.ts` | yes |
| `scripts/_probe_careers.ts` | yes |
| `scripts/_probe_econ_chain.ts` | yes |
| Merge conflict markers in source | none found |

**Encoding note:** `fields.ts` / `careers.ts` must stay UTF-8 (no UTF-16 LE).

---

## 1. diagnose-survival seed=7 days=40

| Metric | Before harvest fix | After |
|--------|--------------------|-------|
| `sowField` | USED | USED (live) |
| `harvestWheat` | UNUSED starts=0 | **USED** (food probe harvest > 0 by d5) |
| `grindFlour` | USED | USED |
| `bakeBread` | USED | USED |

---

## 2. Food-chain probe (seed 7, 30d) — AFTER

Command: `npx tsx scripts/_probe_food_chain.ts 7 30`  
Log: `_food_chain_s7_harvest_fix.txt`

| Day | wheatTiles | ripe | cum.harvest | cum.sow | notes |
|-----|------------|------|-------------|---------|-------|
| 1 | 12 | 0 | 0 | 8 | pioneer sow |
| 5 | 10 | 0 | **306** | 160 | **harvest live** |
| 10 | 42 | 0 | 1098 | 412 | growing |
| 15 | 42 | **12** | 1866 | 633 | **ripe mid-run** |
| 20 | 56 | 0 | 2661 | 1029 | harvest cycling |
| 30 | 77 | 0 | **4665** | 1742 | fields persist; flour=87 |

**Before:** harvest=0 all days; wheatTiles~0 after day 1 (orphaned).

**Stale caution:** `_verify_econ_s7_d40.txt` (earlier same evening) still shows `starts.harvestWheat:0` — pre-fix; do not use for harvest PASS.

---

## Root cause (harvest)

Career switch released field ownership → sown wheat orphaned outside owner radii → never reached `WHEAT_RIPE` → `harvestWheat` never selected. Mill/grind worked on chest/starter wheat.

See `FOOD_CHAIN_FIX.md` § Harvest orphan fix (farmer lock, handoff, orphan reclaim, global wheat growth).

---

## Overall gates

| Gate | Result |
|------|--------|
| Patches land / sim loads | PASS |
| Survival seed 7 | PASS |
| Careers dynamic | PASS (`_verify_careers_s7_d40.txt`) |
| grindFlour / bakeBread | PASS |
| harvestWheat | **PASS** (after orphan/lock fix) |
| Profession switches | PASS (farmer locked while holding farmable plot) |
| food→price→job→behavior fully closed | PARTIAL (trade/title nuance) |
| Réaudit mind/profession sync | **PASS** (2 fixes) |

Farm half of food chain closed on seed 7. Safe to treat interconnect verify blocker as cleared.

**Réaudit live (T-A):** DONE — `applyProfessionChange` on `buildHouse`; `forEachLifeEvent` / `hasLifeEventKind` on politics/religion/bandits/interactions. See `SECOND_AUDIT_INTERCONNECT.md`.