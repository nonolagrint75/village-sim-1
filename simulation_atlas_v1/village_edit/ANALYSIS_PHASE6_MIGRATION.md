# ANALYSIS — Phase 6 Step 1 — MIGRATION (audit only)

**Status:** AUDIT ONLY — no code changes in this step.  
**Workspace:** `C:\Users\kamel\village-sim-1\_wt_rhythm\village_edit`  
**Priority:** #1 MIGRATION  
**Date:** 2026-09-17  

---

## Logs utilisateur

| Source | What was read |
|--------|----------------|
| `_phase5_soak_summary.json` / `_phase5_soak_s{1,3,7}.json` / `_phase5_soak_run.txt` | PHASE5 60d x 3 seeds — leaves=**16**, foundCamps=**3**, migrate stages, `migration_camp` floors |
| `_phase4_soak_summary.json` / `_phase4_soak_s{1,3,7}.json` | CP5 baseline — leaves=**22**, foundCamps=**2** |
| `_phase5_migrate_stages_smoke_s3.json` | Short DP7 smoke — urge=1, leaves=0 (honest NT) |
| `PHASE5_EVIDENCE_LOG.md`, `PHASE5_CAUSALITY_VALIDATION.md`, `ANALYSIS_PHASE5_P4567.md` | Prior P7 / leave-camp design notes |
| Cursor `terminals/` | No live `npm run app` / Vite sim with migration chronicle; only prior probe/tool sessions |

**Verdict logs:** soak artifacts are the authoritative evidence. No contradictory live UI log found.

---

## Executive verdict

1. **Camp bottleneck is design-gated `hasHome`**, not a broken `foundMigrateCamp`. PHASE5: **13/16 leaves homeless** then travel/rejoin; **3/3 housed leaves then camp** (100%).
2. **Leaves 22 to 16** is a real sec33 volume regression, concentrated on seeds **1 (-2)** and **3 (-4)**; seed **7 flat at 10**. Likely prosperity / attempt funnel, **not** camp wiring.
3. **`migration_camp` npc UNDER (0/3) on all seeds** is an **instrumentation bug**: `migrationMetrics` never passes `villagerId` into `noteCausalityMigrate*` so `migrateNpcCount` stays 0. Sim behavior can be PARTIAL while mission floors fail.
4. **Do not** add `CREATE_CAMP` / `if leave: createCamp`, and **do not** buff leave rate for PASS.

---

## 1. Full stage pipeline (file:line)

```text
tickPolitics (politics.ts:3496)
  |- stagger (tick + id*13) % BELIEF_TICK
     |- tickMigration(state, v)          politics.ts:3503 -> 2419
     |- tickIndividualPolitics(...)      (urge accrual)    politics.ts:1689-1767
```

### Stage A — Urge accrual (pre-leave)

| Driver | Location | Effect |
|--------|----------|--------|
| Famine feel | `politics.ts:1691-1696` | `+0.012*(1-loyalty)` / else decay `-0.008` |
| Inequality stress | `:1701-1707` | poor then urge up |
| Low cohesion | `:1714-1716` | youth-biased up |
| Crowding / low SoL / jobless | `:1720-1743` | Vic3-lite up |
| Pull elsewhere | `:1745-1753` | soft up |
| Oppression (low-legit institution) | `:1757-1759` | `+0.015` |
| Elder damp | `:1765-1767` | `urge *= 0.92` |

Telemetry sample (every migration tick):  
`noteMigrateUrgeSample` then `migrationMetrics.ts:180-192` then band crossings 0.70 / 0.86 / 0.94 then `noteCausalityMigrateUrgeCross`.

### Stage B — Leave attempt gate

```text
tickMigration (politics.ts:2419)
  if villageId==null && urge>0.35 -> [homeless wanderer path] -> return (:2424-2501)
  if villageId==null -> return
  leaveThreshold = pop>=5 ? 0.86 : pop>=3 ? 0.78 : 0.7   (:2509)
  saturated = urge >= 0.94                                 (:2512)
  if urge < leaveThreshold -> return                       (:2514)
  noteMigrateLeaveAttempt                                 (:2515)  <- attempt
```

### Stage C — Soft blocks (attempt counted, leave aborted)

| Block | Condition | Line | Telemetry |
|-------|-----------|------|-----------|
| `home_loyalty` | hasHome AND loyalty>0.48 AND urge < thr+0.05 AND !saturated | `:2517-2519` | `noteMigrateBlocked` |
| `elder` | elder AND urge < (sat?0.97:0.9) | `:2521-2523` | same |
| `low_curiosity` | !sat AND curiosity<0.38 AND loyalty>0.52 | `:2526-2528` | same |
| `job_field` | !sat AND hasField AND farmer/miller AND urge < thr+0.08 | `:2531-2538` | same |

### Stage D — Leave enactment + path split

```text
cause = inferMigrateLeaveCause(...)          politics.ts:2385-2416, :2541
housed = hasHome && (homeX>=0 || homeY>=0)     :2542
detach from village (villageId=null)         :2543-2544
urge = housed ? 0.62 : 0.55                  :2547
noteMigrateLeave(cause, { housed })          :2549
  -> migrationMetrics.ts:205-221
  -> migrateHousedLeave | migrateHomelessLeave

if housed:                                   :2551-2561
  noteMigrateSettlementAttempt('hasHome')    migrationMetrics.ts:251-258
  foundMigrateCamp(state, v, rng)            construction.ts:826-836
  noteMigrateFound(camp.id)                  migrationMetrics.ts:274-278
  log "fonde un camp"

else:                                        :2562-2570
  noteMigrateTravelStart()                   migrationMetrics.ts:225-228
  noteMigrateSettleBlocked('no_home')        :262-265  (design, not bug)
  log "quitte son village"
```

`foundMigrateCamp` (`construction.ts:826-836`): camps at hearth (`homeX/Y`), `emptyFoundingVillage`, assigns `v.villageId = camp.id`. **No RNG reject** once called — housed leave implies camp.

### Stage E — Homeless travel then dest then rejoin|fail

On later ticks while `villageId==null` and `urge>0.35` (`politics.ts:2424-2501`):

1. Score nearby villages (d<=90): relations, group, distance, colony, needs, resources, space, safety.
2. `best.score > 0.35` then join then `noteMigrateDestEval(rejoin)` + `noteMigrateRejoin`.
3. Else then `noteMigrateDestEval(fail)` + `noteMigrateFail` (`score_low` | `no_candidate`).

Design contract (`migrationMetrics.ts:1-7`, INC-04):  
**camp = hearth secession only**; homeless = travel then dest then rejoin|fail; **never** `if leave: createCamp`.

### Causality / sec22 label wiring

| Counter | Writer | Consumer |
|---------|--------|----------|
| Stage counters | `migrationMetrics.ts` dual-write | soak `migrateStages` |
| Chain label | `causalityMetrics.ts:migrateChainLabel:851-866` | urge AND attempt AND leave AND (found OR rejoin); **allows npcs===0 as legacy PARTIAL** |
| Priority `migration_camp` | `sec22Evidence.ts` `buildMigrate` | **events=`migrateLeaves`**, floor 5; **npcs=`migrateNpcCount`**, floor 3 |

---

## 2. Exact bottleneck(s) — urge to camp

### PHASE5 soak funnel (totals, 60d x seeds 1+3+7)

| Stage | Count | Conversion from prior |
|-------|------:|----------------------|
| urgeCrosses | **92** | — |
| leaveAttempts | **49** | 49/92 ~ **53%** reach thr |
| leaves | **16** | 16/49 ~ **33%** enact |
| - homelessLeave | **13** | 13/16 = **81%** |
| - housedLeave | **3** | 3/16 = **19%** |
| travelStarts | **13** | = homeless (OK) |
| destEvals | **50** | multi-tick wander evals |
| settlementAttempts | **3** | = housed only |
| foundCamps | **3** | **3/3 housed settle** |
| rejoins | **14** | |
| fails | **36** | mostly seed 3 `no_candidate` |

### Per-seed stage table

| Seed | urge | att | leave | homeless | housed | travel | dest | settle | camp | rejoin | fail |
|-----:|-----:|----:|------:|---------:|-------:|-------:|-----:|-------:|-----:|-------:|-----:|
| 1 | 11 | 2 | 2 | 2 | **0** | 2 | 3 | 0 | **0** | 3 | 0 |
| 3 | 41 | 19 | 4 | 4 | **0** | 4 | 40 | 0 | **0** | 4 | **36** |
| 7 | 40 | 28 | 10 | 7 | **3** | 7 | 7 | 3 | **3** | 7 | 0 |
| Sum | 92 | 49 | 16 | 13 | 3 | 13 | 50 | 3 | 3 | 14 | 36 |

### Bottleneck ranking (exact)

| Rank | Cut | Evidence | Class |
|-----:|-----|----------|--------|
| **#1 CAMP** | **leave then settle/camp** via **`hasHome`** | settleBlock `no_home`: 2+4+7=**13**; housed then camp **3/3** | **DESIGN GATE** (INC-04) |
| **#2 VOLUME** | **attempt then leave** | elder blocks s3:13 / s7:13; low_curiosity s3:2 / s7:5; convert 33% | soft retention |
| **#3 VOLUME** | **urge then attempt** | 53%; thr 0.86 for pop>=5; prosperous s1 only **2** attempts | threshold + prosperity |
| — | travel | travel=homelessLeave | **not** bottleneck |
| — | dest (healthy seeds) | s1/s7 rejoin works | OK |
| — | dest (s3) | 36 fails / `no_candidate` | secondary wander noise |
| — | settle then camp | 100% once housed | **not** broken |
| **#INSTR** | npc floor | `migrateNpcCount=0` always | **wiring bug** (below) |

**One-liner:** Camp volume is limited by **who leaves with a house**, not by founding code. Leave volume for sec33 is limited by **threshold + elder/curiosity blocks + healthier runs**.

---

## 3. Why leaves dropped 22 to 16 (regression hypothesis)

### Observed delta (same harness: 60d, seeds 1/3/7, START@100)

| | CP5 (P4) | PHASE5 | Delta |
|--|----------:|--------:|------:|
| leaves | **22** | **16** | **-6** |
| foundCamps | 2 | **3** | +1 |
| leaveAttempts | 58 | 49 | -9 |
| urgeCrosses | 83 | 92 | +9 |
| s1 / s3 / s7 leaves | 4 / 8 / 10 | **2 / 4 / 10** | -2 / -4 / 0 |
| s1 houses end | 65 | **79** | +14 |
| s3 houses end | 16 | **7** | -9 |
| s7 houses end | 18 | **30** | +12 |
| s1 alive end | 118 | **139** | +21 |
| s3 deaths | 11 | **22** | +11 |

sec33 harness: `expected: leaves>=20` then PHASE5 **PARTIAL** (`_phase5_soak_run.txt` ~853-865).  
Documented in `PHASE5_EVIDENCE_LOG.md`: "regression leaves volume loses sec33 PASS".

### Hypothesis (code + evidence) — ranked

**H1 — Prosperous seed 1: fewer leaveAttempts (primary -2 leaves)**  
- CP5 s1: attempts **6** then leaves 4; P5 s1: attempts **2** then leaves 2.  
- P5 s1: high edible (1119), houses 79, deaths 1 then famine/SoL drivers rarely push past thr 0.86.  
- Urge decay when not famine (`politics.ts:1695-1696`) + SoL>0.65 damp (`:1731-1732`) then **healthy village suppresses leave**.  
- Phase5 survival/food-chain work raises living standards then **organic** leave drop, not a leave-gate bug.

**H2 — Seed 3: attempt then leave conversion worsens (primary -4 leaves)**  
- CP5: 8/23 ~ 35%; P5: **4/19 ~ 21%**.  
- Blocks still dominated by **elder** (12 to 13) + **low_curiosity** (3 to 2).  
- Higher mid-run mortality (deaths 22) shrinks the adult leaver pool after d40 (`_phase5_soak_run.txt` timeline: leaves stall at 4 from d40-d60).

**H3 — Seed 7 unchanged**  
- Leaves 10 to 10; camps 0 to **3** (more housed leavers when houses 18 to 30). Shows camp path **improved** when housing exists — opposite of a camp regression.

**H4 — Not caused by**  
- Disabling leave / raising threshold (thresholds unchanged at `:2509`).  
- `foundMigrateCamp` failing (0 rejects when called).  
- NPC telemetry (measure-only).

**Camps rose while leaves fell** then regression is **leave volume**, not camp enactment. Do not "fix" camps by buffing leave.

---

## 4. Why `migration_camp` npc UNDER (0/3 seeds)

### Floor definition

`sec22Evidence.ts` `buildMigrate`:

- **events** = `migrateLeaves` (floor **5** = `SEC22_FLOOR_EVENTS_LOW`)
- **npcs** = `migrateNpcCount` (floor **3**)
- Path label can still be PARTIAL from stage linkage

Observed:

| Seed | evt (leaves) | npc | Label |
|-----:|-------------:|----:|-------|
| 1 | 2/5 UNDER | **0/3 UNDER** | PARTIAL |
| 3 | 4/5 UNDER | **0/3 UNDER** | PARTIAL |
| 7 | 10/5 OK | **0/3 UNDER** | PARTIAL |

Samples literally print `migrate urge npc=?` — ids never attached.

### ROOT CAUSE (instrumentation)

`trackMigrateNpc` (`causalityMetrics.ts:622-626`) **no-ops** when `npcId == null`.

All dual-writes from `migrationMetrics.ts` omit the id:

```text
noteCausalityMigrateUrgeCross(state)           // :190 — has villagerId in scope, not passed
noteCausalityMigrateLeaveAttempt(state)        // :197
noteCausalityMigrateLeave(state)               // :213
noteCausalityMigrateTravel / Dest / Found / …  // :228-278
```

API already accepts `npcId?: number` (`causalityMetrics.ts:543-617`) but callers never supply it.

**Consequently:** `migrateNpcCount` stays **0** even with 16 leaves / 3 camps.  
`migrateChainLabel` explicitly **waives** npc when `npcs===0` (`:861-863` "legacy"), so chain stays PARTIAL while **mission floors** (`missionFloorsMet`) stay false.

This is **not** "zero villagers migrated." It is **id not plumbed**.

---

## 5. hasHome vs homeless path

```text
                    |- hasHome AND home coords -------------------------------|
 leave enacted -----|                                                         |
                    |  settlementAttempt(hasHome)                              |
                    |  foundMigrateCamp @ hearth                              |
                    |  noteMigrateFound  ->  NEW VILLAGE                      |
                    |---------------------------------------------------------|
                    |- else (homeless / no hearth) ---------------------------|
                    |  travelStart + settleBlocked(no_home)                   |
                    |  later ticks: destEval then rejoin | fail               |
                    |  NEVER foundMigrateCamp                                 |
                    |---------------------------------------------------------|
```

| Path | PHASE5 count | Intended outcome |
|------|-------------:|------------------|
| Homeless leave | **13** | travel then rejoin/fail |
| Housed leave | **3** | settle then camp |
| settleBlocked `no_home` | **13** | design marker |
| Camps | **3** | = housed leaves |

CP5 inferred ~20/22 homeless (camps 2/22); PHASE5 **measured** 13/16 homeless — same design dominance, better telemetry.

---

## 6. ROOT CAUSE | FIX shape | FILES | REGRESSION | TEST

### A. NPC floor = 0 (blocks `missionFloorsMet`)

| | |
|--|--|
| **ROOT CAUSE** | `migrationMetrics` dual-write drops `villagerId` then `migrateNpcCount` never increments |
| **FIX shape** | Pass `villagerId` / `v.id` through every `noteMigrate*` then `noteCausalityMigrate*(state, …, npcId)`. Ensure leave/found/rejoin samples carry id. **Measure-only**; no behavior change |
| **FILES** | `src/lib/sim/migrationMetrics.ts`, call sites in `politics.ts` if signatures need `v.id`; verify `sec22Evidence.ts` / soak dump |
| **REGRESSION risk** | **Low** (telemetry). Watch: Set serialization / snapshot size; do not change chain semantics except honest npc>=3 |
| **TEST** | Re-run PHASE5 soak seeds 1/3/7; expect `migrateNpcCount>=3` on seeds with >=3 distinct leavers; `migration_camp` npc OK when leaves>=5; samples show `npc=<id>` |

### B. Leave volume 16 < 20 (sec33)

| | |
|--|--|
| **ROOT CAUSE** | Organic: healthier s1 fewer attempts; s3 elder/curiosity + mortality; **not** a single broken gate |
| **FIX shape** | (1) Confirm after NPC fix that volume is still the only sec33 gap. (2) Optional **soft** natural levers only if design wants more churn — e.g. review elder gate at saturation, or identifiable-cause tagging — **without** global leave-rate buff. Prefer longer soak / extra seed before tuning. |
| **FILES** | `politics.ts` (`tickMigration` blocks `:2517-2538`, urge drivers `:1689-1767`) — only if explicitly approved |
| **REGRESSION risk** | **High** if leave threshold/curiosity/elder softened globally then mass exodus / camp spam |
| **TEST** | Same 60d x 3 soak; gate `leaves>=20` without induced migrate; watch deaths, village count, foundCamps/leaves ratio |

### C. Camp rare vs leaves (expected under INC-04)

| | |
|--|--|
| **ROOT CAUSE** | Camp requires housed leave; ~80% leavers homeless by design |
| **FIX shape** | **Prefer:** accept design; score **`housedLeave then camp`** separately (already 3/3). **Alt (design change):** capped homeless pioneer site search — **not** `CREATE_CAMP` mass path |
| **FILES** | `politics.ts:2550-2565`, `construction.ts:826-836`, metrics labels |
| **REGRESSION risk** | Homeless auto-camp then settlement sprawl / sec33 false PASS |
| **TEST** | Assert housedLeave == foundCamps (current); if pioneer alt, hard cap camps/seed |

### D. Secondary: leave causes mostly `mixed`

| | |
|--|--|
| **ROOT CAUSE** | `inferMigrateLeaveCause` tie then `mixed` (`:2414-2415`) |
| **FIX shape** | Sharpen dominant-tag margins (telemetry/story); not a volume fix |
| **FILES** | `politics.ts:2385-2416` |
| **REGRESSION risk** | Low |
| **TEST** | `leavesByCause` diversity in soak |

---

## 7. What NOT to do

| Forbidden | Why |
|-----------|-----|
| **`CREATE_CAMP` / `CREATE_MIGRATE` / scripted exodus** | Fakes sec22/sec33; banned in metrics header (`migrationMetrics.ts:3-4`) |
| **`if (leave) createCamp`** for homeless | Violates INC-04; collapses travel/rejoin causality |
| **Leave-rate buff "for PASS"** | Explicitly rejected in P7/DP7 and PHASE5 pause notes; would mask prosperity signal |
| Raise `initialVillagers` clamp / induce migration | Scale/induction cheating |
| Claiming GLOBAL / mission PASS from short smoke | DP7 smoke leaves=0 is honest NT |
| "Fixing" npc UNDER by lowering floor to 0 | Hides wiring bug; `npcs===0` legacy waiver already softens chain label |

---

## 8. Comparison snapshot (CP5 vs PHASE5)

| Metric | CP5 | PHASE5 | Note |
|--------|----:|-------:|------|
| leaves | 22 | 16 | sec33 loses PASS |
| foundCamps | 2 | 3 | Camp path healthier when housed |
| migrate chain | CNP/PARTIAL mix | PARTIAL x3 | Rejoin counts for chain |
| migration_camp npc | (pre-floor / n/a) | **0/3 UNDER x3** | Wiring |
| housed/homeless split | inferred | **3 / 13** | Telemetry live |

---

## 9. Recommended Phase 6 order (proposals only — no impl here)

1. **Wire npc ids** (A) — cheapest, unblocks honest `migration_camp` floors.  
2. **Re-soak** — confirm leaves still <20 and housed then camp still ~100%.  
3. **Decide design:** keep hearth-only camps **or** capped homeless pioneer (not CREATE_CAMP).  
4. **Leave volume** only after (1)-(3), with natural constraints — never buff-for-PASS.

---

## 10. Acceptance checklist (for a future implement step)

- [ ] `migrateNpcCount >= 3` on >=1 seed with >=3 leavers  
- [ ] Samples show real `npcId` (not `?`)  
- [ ] `housedLeave === foundCamps` (or documented pioneer exceptions)  
- [ ] `settleBlockReasons.no_home === homelessLeave`  
- [ ] leaves>=20 **without** leave buff / CREATE_CAMP  
- [ ] No PASS claim from <60d smoke  

---

*End of ANALYSIS_PHASE6_MIGRATION.md — audit only.*
