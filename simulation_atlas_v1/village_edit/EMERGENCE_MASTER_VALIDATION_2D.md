# EMERGENCE MASTER VALIDATION 2D — nono_simu_2d

**Date:** 2026-09-18  
**Canon:** `C:\Users\kamel\village-sim-1\_wt_rhythm\village_edit`  
**Forbidden:** `nono_simu_3d` / Bevy / Rust  
**Harness:** `npx tsx scripts/_probe_emergence_master.ts --horizons=1000,5000,10000 --seeds=7,42,100,999`  
**Artifacts:** `_emergence_master_validation_2d.json`, `_emergence_world_diversity_audit.json`, `_homes_chain_audit.json`, `_emergence_repro_seed7.json`  
**STOP:** no Lot 4, no commit, no merge, no new feature

---

## Logs utilisateur

| Source | Finding |
|--------|---------|
| Terminals | Long-run harness; no live Chronique GUI for this pass |
| `_lot3d_emergence_report.json` | Prior seed7@10k: WO✓=0, haul=0, wages=0, alive→0 |
| `_emergence_master_validation_2d.json` | Full 4-seed × 1k/5k/10k post-integration |
| `_homes_chain_audit.json` / world audit | Queue wood-gap stall; world tile deltas; task/prof samples |

---

## Verdict final

### `PARTIAL — BLOCKER IDENTIFIED`

Collab WorkOrder → haul → wages → WO✓ is **real** and improved vs Lot3D.  

**Blockers:**
1. `homesCompleted` stays **0** on all seeds/horizons — progressive queues never reach `rem=0`
2. Long-run **population collapse** (edible stock → 0 then extinction / near-extinction by 10k)
3. Decision **rest-convergence** despite profession flips
4. Seed7 **repro FAIL** (mild non-determinism)

Not `VALIDATED`. Not `FAILED — EMERGENCE LOOP BROKEN` (WO/haul/wage loop works).

---

## Fonctionne

### WorkOrder collaboration (real actions)

| seed | t1000 WO✓ / haul / wages | t5000 | t10000 |
|------|--------------------------|-------|--------|
| 7 | 3 / 11 / 17 | 10 / 39 / 39 | 10 / 39 / 39 |
| 42 | 6 / 10 / 22 | 8 / 13 / 33 | 8 / 13 / 33 |
| 100 | 0 / 0 / 0 | 0 / 1 / 0 | 0 / 1 / 0 |
| 999 | 0 / 5 / 15 | 0 / 12 / 21 | 0 / 12 / 21 |

vs Lot3D seed7@10k: WO✓=haul=wages=**0**.

### Profession mobility

| seed | profCh @t1000 | @t5000 | @t10000 |
|------|---------------|--------|---------|
| 7 | 38 | 88 | 91 |
| 42 | 50 | 120 | 122 |
| 100 | 21 | 61 | 61 |
| 999 | 23 | 125 | 149 |

### Seed divergence

- **7 / 42 / 999:** progressive blocks (40–89), haul/wages often > 0
- **100:** `blocksBuilt=0` all horizons; roads spike early then decay; collapses by t5000

### Partial world mutation

HOUSE tiles already exist at **t0** (~144–160 from spawn). Progressive build adds little (seed7 +2 HOUSE; seed42 +16). Wheat rises; trees slowly increase.

---

## Fonctionne partiellement

### homesStarted without homesCompleted

| seed | homeS @t10k | homeC | note |
|------|-------------|-------|------|
| 7 | 22–23 | **0** | homeless 27→0 @t5000 without homeC |
| 42 | 15–21 | **0** | |
| 100 | 5–6 | **0** | |
| 999 | 15–18 | **0** | |

`homeless→0` with `homesCompleted=0` = `hasHome` via kinship/seating/legacy, **not** progressive finalize metrics.

### Economy → behavior

Wages/haul fire on WO path. Coin falls with pop. Phase7 `economy/**` facades still not the live execute path.

### Decision diversity

Professions diverge; **tasks** at t1000 often collapse to `rest` (seed7: 36/38 rest).

---

## Bloqué

### 1. homesCompleted = 0 (PRIORITY)

```
home need → plan → buildQueue (~28–70 blocks)
  → buildHouse / helpBuild / haul
  → WOOD GAP ≈ rem (stone≈0)
  → some blocks place (homesStarted↑)
  → rem never 0
  → finalizeHomeCompletion never for metric
  → homesCompleted = 0
```

Evidence seed7@500: queueLen≈38, rem≈34, woodGap≈rem, stalled_for_mats=all sites, rem0=0, rest=34/36.

### 2. Survival (alive → 0)

| seed | t1000 | t5000 | t10000 |
|------|-------|-------|--------|
| 7 | 38 | 26 | **0** |
| 42 | 37 | 14 | **3** |
| 100 | 37 | 3→0 | **0** |
| 999 | 36 | 20 | **1** |

Edible inventory ~150–215 @t1000 → often ~0–23 @t5000 → extinction.  
Break: stock/production → sustained edible inventory under stress. No artificial food buff applied.

### 3. Decision loops

Dominant: `*→rest`, `harvestWheat→rest`, `rest→eat`. Catalogue + fatigue still homogenize acts; B1/B2 compress insufficient for farmer≠miner≠trader task divergence at scale.

### 4. Reproducibility

```
--repro --seed=7 --horizons=1000
A: ...|42|11|17|19|0|1080|162|...
B: ...|43|12|18|20|0|1092|148|...
REPRO FAIL (blocks / WO✓ / haul / wages / switches)
```

---

## Preuves — master tables

### t1000

| seed | alive | deaths | blocks | homes✓ | WO✓ | haul | wages |
|------|-------|--------|--------|--------|-----|------|-------|
| 7 | 38 | 0 | 42 | 0 | 3 | 11 | 17 |
| 42 | 37 | 0 | 64 | 0 | 6 | 10 | 22 |
| 100 | 37 | 0 | 0 | 0 | 0 | 0 | 0 |
| 999 | 36 | 0 | 61 | 0 | 0 | 5 | 15 |

### t5000

| seed | alive | deaths | blocks | homes✓ | WO✓ | haul | wages | cancelled |
|------|-------|--------|--------|--------|-----|------|-------|-----------|
| 7 | 26 | 6 | 80 | 0 | 10 | 39 | 39 | 43 |
| 42 | 14 | 5 | 81 | 0 | 8 | 13 | 33 | 23 |
| 100 | 3 | 9 | 0 | 0 | 0 | 1 | 0 | 10 |
| 999 | 20 | 0 | 89 | 0 | 0 | 12 | 21 | 19 |

### t10000

| seed | alive | deaths | blocks | homes✓ | WO✓ | haul | wages |
|------|-------|--------|--------|--------|-----|------|-------|
| 7 | 0 | 18 | 80 | 0 | 10 | 39 | 39 |
| 42 | 3 | 5 | 81 | 0 | 8 | 13 | 33 |
| 100 | 0 | 9 | 0 | 0 | 0 | 1 | 0 |
| 999 | 1 | 1 | 89 | 0 | 0 | 12 | 21 |

---

## Corrections appliquées

| Change | File | Why |
|--------|------|-----|
| Replace raw `hasHome=true` with `finalizeHomeCompletion` on progressive/help rem=0 / next=null | `npcBuildBehaviors.ts` | Integration gap — metrics/family seat skipped |

Does **not** raise `homesCompleted` until a queue finishes (none did).  
**Not done:** shrink queues, inject wood, force finish, buff food.

Post-fix smoke seed7 @500/1000: WO✓/haul/wages still live; homeC still 0.

---

## Validation technique

| Check | Result |
|-------|--------|
| Long harness 1k/5k/10k × 4 seeds | Ran; JSON written |
| Repro seed7@1000 | **FAIL** fingerprints |
| `npx tsc --noEmit` | **FAIL** — pre-existing UTF-16 in `src/lib/assets/catalog.ts` (unrelated) |
| `npm run build` | **PASS** |
| git commit --trailer "Co-authored-by: Cursor <cursoragent@cursor.com>" / merge | **none** |

---

## INDIVIDU → MONDE (honest)

Observed: `NPC → haul/help WO → counters + few HOUSE tiles + wages`  

Missing: `queue complete → finalize → densify → sustained food → next generation`

---

## STOP

No Lot 4. No 3D. No commit. No merge. No new mechanics.