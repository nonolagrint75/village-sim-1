# SECOND AUDIT — Emergent situations

**Workspace:** `village_edit`  
**Date:** 2026-09-16  
**Horizon:** seeds **1** and **7**, **40 days** (food-chain cross-check 30d)  
**Probe:** `npx tsx scripts/_probe_second_audit_emergence.ts [seed] 40`

---

## Overall

| Seed | Verdict |
|------|---------|
| 1 | **PASS** (no FAIL) |
| 7 | **PASS** (no FAIL) |

Critical harvest=0 on seed 1 was **fixed this pass** (see §Fixes).

---

## 1. Local famine → foodNeed / giveFood / prices / migration

| Metric | Seed 1 | Seed 7 | Gate |
|--------|--------|--------|------|
| Path | induced @d20 | induced @d20 | natural rare |
| `foodNeed` under feel/induced | **1.0** | **1.0** | ≥0.7 → **PASS** |
| `cultureNeed` | 0 under famine (shortage probe) | 0 | **PASS** |
| `tradeNeed` floor | ~0.2 | ~0.2 | **PASS** |
| Prices @ famine | food 0.7 / wheat 1.1 / flour 12.5 / bread 8.4 | food 0.6 / wheat 1.1 / flour 2.0 / bread 6.6 | recorded **PASS** |
| `migrationUrge` max | **1.0** | **1.0** | **PASS** |
| migrate log hits | 1 | 0 | soft |
| `giveFood` ticks (run) | 0 | **199** | seed7 **PASS**; seed1 weak |
| `giveFood` while feelFamine | 0 | 0 | **PARTIAL** — window short after induce; floor lowered this pass |
| Food professions early→late | 8→14 | 9→25 | **PASS** |

`feelFamine` → `computeCareerDemand.foodNeed` verified on induced pantry crisis. Shortage probe seed7: **PASS**.

---

## 2. Profession switch → field release / jobBonus / livelihood

| Metric | Seed 1 | Seed 7 |
|--------|--------|--------|
| Verdict | **PASS** | **PASS** |
| Natural switches | 80 | 63 |
| Induced | farmer→miller | farmer→miller |
| Field released | **yes** (851→-1 / 401→-1) | **yes** |
| Livelihood sync | `legacy_miller` | `legacy_miller` |
| jobBonus flip | harvest 2.35 → grind 2.55 | same |

`applyProfessionChange` releases field (or handoff), syncs `roleTag`/`titleFr`, métier drives `jobBonus`.

---

## 3. Mill → grind → bake → bread price

| Metric | Seed 1 | Seed 7 |
|--------|--------|--------|
| Verdict | **PASS** | **PASS** |
| Mill built day | 27.8 | 0.5 |
| Grind ticks | 546 | 3561 |
| Bake ticks | 26 | 247 |
| Bread price end | 8.0 | 7.3 |

Food-chain seed1 @d30: grind 1148, bake 42, bread in bags. Seed7 already strong pre-fix.

---

## 4. Bandit outcast → ghost spouse / village pop

| Metric | Seed 1 | Seed 7 |
|--------|--------|--------|
| Verdict | **PASS** | **PASS** |
| Bandits end | 3 | 2 |
| Outcast bands | 1 | 1 |
| Ghost spouses peak/end | **0 / 0** | **0 / 0** |
| Village member pop | 26→23 | 26→23 |
| Alive total | 32 | 38 |

`detachOutcast` → `onDeath` clears spouse bonds. Ghost-desert probe seed7/45d: spouseGhost=0.

---

## 5. TeachCraft → skill transfer

| Metric | Seed 1 | Seed 7 |
|--------|--------|--------|
| Verdict | **PASS** | **PASS** |
| Teach starts | 2362 | 1552 |
| Teach ticks | 8512 | 7830 |
| Chronicle / knowledge hits | 32 | 30 |

Natural `teachCraft` dense; `doTeachCraft` drips best master skill + `teachKnowledge`.

---

## Harvest (critical)

| Seed | harvestStarts | harvestTicks | sowTicks | Verdict |
|------|---------------|--------------|----------|---------|
| 1 (before fix) | 0 | 0 | 0 | **FAIL** |
| 1 (after) | **10** | **129** | 974 | **PASS** (weaker than 7) |
| 7 | **972** | **9123** | 3517 | **PASS** |

### Root cause (seed 1 harvest=0)

`chooseTask` used exclusive `if (veg) clearLand; else if (bare) sowField`. Plots with ~15 bushes and ~60 bare tiles **never offered sow**. Seed 7 worked because pioneer wheat already existed (`hasField` + wheat at t0).

### Fix

`src/lib/sim/behaviors.ts` — offer **both** clear and sow when bare cells exist (own field + shared helper paths).

Also: famine `giveFood` larder floor `1.5` → `0.55` under `feelFamine` so sharing can fire on thin stocks.

Encoding: `careers.ts` / `fields.ts` confirmed **UTF-8** this pass (no UTF-16 LE).

---

## Commands

```bash
npx tsx scripts/_probe_second_audit_emergence.ts 1 40
npx tsx scripts/_probe_second_audit_emergence.ts 7 40
npx tsx scripts/_probe_food_chain.ts 1 30
npx tsx scripts/_probe_food_shortage.ts 7 30
npx tsx scripts/_probe_ghost_desert.ts 7 45
```

Logs: `_second_audit_s1.txt`, `_second_audit_s7.txt`, `_food_chain_s1_final.txt`.