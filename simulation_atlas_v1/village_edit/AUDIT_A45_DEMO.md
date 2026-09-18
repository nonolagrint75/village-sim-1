# AUDIT A45 — Demography & genetics / families

**Workspace:** `village_edit`  
**Scope:** births, deaths, aging, `parentIds`, inheritance, names, consanguinity, multi-generation lineage  
**Probes:** `scripts/_probe_demo_a45.ts`, `scripts/_probe_demo_multigen.ts`, `scripts/_probe_deaths.ts`  
**Seeds:** 1, 3, 7, 11, 42 (subset per run) · **Horizon:** 90–180 sim days

---

## Verdict

Lineage plumbing works after causal gate fixes: children link to parents, surnames/genomes attach, inheritance logs fire, consanguinity blocks close kin, and **multi-generation pedigrees appear** (depth ≥ 2) within ~120–180 days. Pre-fix runs produced births but **zero multi-gen** because offspring were left homeless and could not pass `ready()` / marry.

---

## Probe evidence

### Baseline (pre-fix, 90d × seeds 1/7/42)

| Seed | Births | Deaths | Children linked | Max gen | Grown kids home/spouse |
|------|--------|--------|-----------------|---------|------------------------|
| 1 | 4 | 4 | OK (0 broken) | 1 | all homeless, unmarried |
| 7 | 11 | 16 | OK | 1 | all homeless, unmarried |
| 42 | 16 | 4 | OK | 1 | all homeless, unmarried |

- `motherId`/`fatherId` matched `parentIds`; genomes length 40; surnames present on all children sampled.
- `readyPairsNear` almost always **0** after day 5 despite married/ready adults (spouses working apart).
- Gate dump (seed 42, 120d): **24 grown offspring, `home=false`, `spouse=none`** — reproduction hard-gated on `hasHome`.

### After fixes (multigen probe)

| Seed | Days | Births | Max gen | Housed kids | Grown housed | Grown married |
|------|------|--------|---------|-------------|--------------|---------------|
| 7 | 180 | 17 | **2** | 15/15 | 15 | 6 |
| 1 | 180 | 4 | **2** | 1/1 | 1 | 1 |
| 42 | 120 | 22 | **2** | 18/18 | 18 | 1 |

Example pedigree (seed 42): `Bralin#160 ← Wylora#22 × Drodric#100 ← Belmir#6 × Ivos#15` (gen 2).

Post-fix A45 150d run: births ↑ (mean ~17 vs ~10), `readyPairsNear` spikes (e.g. seed 7 d60: **31** near pairs), inheritance log lines present, `marriedKinBlocked=0`.

---

## Systems checked

| Topic | Status | Notes |
|-------|--------|-------|
| Births | OK | `tickReproduction` every 4 ticks; fertility soft gate; famine/winter dampers (not hard zero) |
| Deaths / aging | OK | Age++ each tick; famine/disease/cold paths; death probe causes logged |
| `parentIds` / pedigree | OK | Set at birth; genealogy upsert; `reconstructPedigree` multi-depth |
| motherId/fatherId | Fixed | Now sex-aware when parents differ by sex |
| Names / surnames | OK | `generateName` + `formChildSurname` / lineages |
| Inheritance | OK | `inheritOnDeath` goods + house transfer; child heirs if no resident |
| Consanguinity | OK | `kinshipCoefficient` ≥ 0.2 blocks; close-kin parentId taboo |
| Multi-generation | Fixed | Blocked by homeless newborns; now housed → marry → gen2 |

---

## Bugs fixed (causal, not birth-rate cheats)

### 1. Newborns orphaned by bed capacity — **critical lineage gate**
- **Was:** child got `hasHome` only if `residents < householdSleepCapacity`; else permanent homelessness → never `ready()` for repro.
- **Fix:** always seat newborn in a parent nest when any parent has a home; prefer spare beds but **allow overcrowding** so pedigree is not orphaned (`behaviors.ts` `tickReproduction`).

### 2. Bonded spouses never co-located for birth — **critical**
- **Was:** hard `distance ≤ 5.5` while work kept couples apart → `readyPairsNear≈0`.
- **Fix:** for married pairs, also allow birth when **both are within ~9 of the shared homestead** (`nearHome`).

### 3. Homeless kin never re-seated — **major**
- **Fix:** `shelterHomelessKin` in `family.ts` (periodic): soft-seat minors/adults into living parents’ households when capacity allows mild overcrowd.

### 4. House inheritance skipped genetic children — **major**
- **Was:** heirs = spouse, then `homeOwnerId` residents only; unseated kids got nothing and lost the home on owner death.
- **Fix:** fall back to genetic/adoptive children (`interactions.ts`).

### 5. motherId/fatherId ignored biological sex — **minor pedigree**
- **Fix:** `birthGenetics` assigns mother/father by sex when unambiguous (`genetics.ts`).

---

## Remaining risks (not patched here)

- Mid/late-run **population cliffs** (famine/attrition) still wipe cohorts; lineage works but demography can collapse after boom (seed 1 at 150d: few survivors).
- Opportunistic unmarried births still need proximity + affinity; intentional, not cheated.
- Probe `maxGen` must walk **genealogy** for dead ancestors (living-only depth undercounts).

---

## Files touched

- `src/lib/sim/behaviors.ts` — birth housing + homestead proximity
- `src/lib/sim/family.ts` — `shelterHomelessKin`
- `src/lib/sim/interactions.ts` — child heirs
- `src/lib/sim/genetics.ts` — sex-aware parental slots
- `scripts/_probe_demo_a45.ts`, `_probe_demo_multigen.ts` — audit probes

---

## How to re-run

```bash
npx tsx scripts/_probe_demo_a45.ts 150 1 7 42
npx tsx scripts/_probe_demo_multigen.ts 7 180
npx tsx scripts/_probe_deaths.ts
```