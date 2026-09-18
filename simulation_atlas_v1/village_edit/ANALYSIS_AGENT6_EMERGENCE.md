# ANALYSIS_AGENT6_EMERGENCE

**Agent:** 6 — Emergence (analysis only)
**Workspace:** `C:\Users\kamel\village-sim-1\_wt_rhythm\village_edit`
**Date:** 2026-09-17
**Rule:** NO CODE CHANGES this pass
**Sources:** `SECOND_AUDIT_EMERGENCE.md` / `_tmp_emergence_utf8.md`, `_second_audit_s1.txt`, `_second_audit_s7.txt`, `SECOND_AUDIT_REPORT.md`, `EMERGENCE_NOTE.md`, `AUDIT_A14_LONG.md`, `_probe_a14_gens.json`, `scripts/_probe_second_audit_emergence.ts`, `scripts/_probe_emergence_seeds.ts`, migration/generation code paths

---

## Executive verdict

**Prior SECOND_AUDIT emergence PASS does NOT meet the new Master Mission thresholds (section 20+).**

| Claim | Status under NEW rules |
|-------|------------------------|
| T-B "emergence multi-seed PASS" (seeds 1+7 x 40d, pop~26) | **NOT TESTED** at section-20 scale |
| Migration as decision (sec 16 / 33) | **CODE-ONLY -> PARTIAL at best**; urge rises, leave events almost unproven |
| Multi-seed divergence (sec 38) | **PARTIAL / NOT TESTED** (2-5 seeds short runs != 10 seeds) |
| Generations (sec 20 gen / A14) | **NOT TESTED** (need >=500d or 2 complete generations) |
| Anti-scripting (sec 39 / 42) | **WEAK** — probe induces famine + profession; bandits gated day 40; early creed/fort choreography |

**Honest label for "emergence" as a critical system (sec 21):**
`PARTIAL — architecture present, prior PASS is under-scale + partly induced`
**Not** `GLOBAL PASS` material until re-proven at sections 20-43 sample sizes.

---

## SYSTEMS_ANALYZED

1. Local famine -> career demand -> share / prices / migration urge (`ecology.ts`, `careers.ts`, `politics.ts`, probe induce)
2. Profession switch -> field release -> livelihood sync -> jobBonus (`careers.ts`, `livelihood.ts`)
3. Mill -> grind -> bake -> bread price (food chain)
4. Bandit outcast -> ghost spouse hygiene -> village pop split (`bandits.ts`)
5. TeachCraft -> skill / knowledge transfer (`interactions.ts`, `livelihood.ts`)
6. Migration decision stack (urge accumulation -> leave -> wander/found -> join radius -> destination score)
7. Reproduction / pedigree / generation depth (`behaviors.tickReproduction`, `family.ts`, genetics, marriage age)
8. Multi-seed divergence probes (`_probe_emergence_seeds.ts`, A14 civ audit, SECOND_AUDIT dumps)
9. Anti-script / calendar gates (`BANDIT_START_DAY`, creed crystallization, fort early projects, probe `induceLocalFamine` / forced `applyProfessionChange`)
10. Cognitive migrate goal (`cognition/goals.ts`, `cognition/tick.ts` wiring `migrationUrge` into goal scores)

---

## CURRENT_ARCHITECTURE

### A. Prior "emergence PASS" harness (T-B)

- Probe: `scripts/_probe_second_audit_emergence.ts`
- Evidence dumps: `_second_audit_s1.txt`, `_second_audit_s7.txt`
- Horizon: **2 seeds x 40 days**, default `createSimulation(seed)` -> **`initialVillagers: 26`** (`simConfig.ts` preset `standard`)
- Overall: both seeds `OVERALL PASS (no FAIL)`

Observed end states (dumps):

| Metric | Seed 1 | Seed 7 |
|--------|-------:|-------:|
| startPop | 26 | 26 |
| aliveEnd | 32 | 38 |
| harvestStarts / ticks | 10 / 129 | 972 / 9123 |
| famine path | induced @d20 | induced @d20 |
| foodNeed | 1.0 | 1.0 |
| migrateUrgeMax | 1.0 | 1.0 |
| migrateLog | **1** | **0** |
| giveFood ticks / under famine | 0 / 0 | 199 / 0 |
| natural profession switches | 80 | 63 |
| profession switch | **induced** farmer->miller | **induced** farmer->miller |
| mill / grind / bake | PASS | PASS (earlier) |
| banditsEnd / outcast / ghost | 3 / 1 / 0 | 2 / 1 / 0 |
| teachStarts | 2362 | 1552 |

Documented audit (`_tmp_emergence_utf8.md` = readable twin of `SECOND_AUDIT_EMERGENCE.md`) matches these dumps.

### B. Migration as a decision (code path — mechanism exists)

Intended chain (sec 16):

```text
stressors (famine, SoL, crowding, cohesion, inequality, jobless, oppression)
  -> migrationUrge (politics tick)
  -> cognitive goal `migrate` (scoreGoals)
  -> soft steer idle / leave village / buildHouse with small join radius
  -> findOrCreateVillage / rejoin scored destination
```

Concrete wiring:

| Stage | Location | Behavior |
|-------|----------|----------|
| Urge up | `politics.ts` ~1638-1707 | famine, inequality, low cohesion, carrying pressure, low SoL, unemployment, better SoL elsewhere, low-legitimacy institution |
| Urge down | same | no famine decay -0.008; high SoL; elder x0.92 |
| Leave | `politics.ts` ~2317-2331 | threshold **0.70-0.86** by village size; home+loyalty sticky; elder needs urge>=0.9; curiosity gate |
| Soft move | `behaviors.ts` chooseTask ~3772-3848 | migrate>0.4 steers away toward foundable+food biomes; unaffiliated migrate>0.5 seeks empty ground |
| Found camp | `behaviors.ts` buildHouse ~4864-4871 | migrateUrge>0.4 -> joinRadius **24-58** (else ~70-140) so second villages can form |
| Rejoin | `politics.ts` ~2280-2312 | multi-factor destination score (kin affinity, distance, loyalty, hub, SoL, labor, biome, food, -crowding -famine) |
| Cognition | `goals.ts` `migrate` goal; `tick.ts` feeds `migrateUrge` (+ stress bump) into `scoreGoals` | goal bias -> task weights (`idle`, `buildHouse`, `tradeRun`...) |

**Architecture quality:** multi-factor, retention vs leave, destination comparison — this is a **decision stack**, not a single `if famine then teleport`.
**Proof quality:** leave events barely observed in T-B dumps.

### C. Generations / demography

| Piece | Fact |
|-------|------|
| Calendar | 360 days/year (`calendar.ts`) |
| Age | `v.age++` every `tickVillager` (`behaviors.ts`) |
| Child / marry | `CHILD_AGE` / `MARRY_MIN_AGE` = **220** age-ticks ~= **~3.06 sim days** to adulthood gate |
| Elder | `ELDER_AGE` = 800 |
| Founders | age 280-700 at spawn (`engine.ts`) — start adult, `parentIds: []` |
| Birth | `tickReproduction`: food+home+hunger+proximity+kinship taboo+genetics; budget 4 births/pass |
| Cap | `maxPopulation` default 250; config clamp <=500 |
| Culture/ethnos inheritance | `seedCultureFromParents`, `seedEthnosFromParents`, `inheritKnowledge` on birth |

**Implication:** biological adulthood is compressed in tick-age, but **meaningful multi-generation society** still needs long horizons (homes, food, survival past famine cliffs, institutions surviving). A14 @ **90d** already concluded max gen depth <=1 and recommended **>=360-720d**.

### D. Multi-seed divergence (older evidence)

- `EMERGENCE_NOTE.md`: seeds **1,3,7 x 40d** — villages 4-5, creed Jaccard mean ~0.48, teach range, guilds on some seeds -> **SEEDS_DIVERGE**
- `AUDIT_A14_LONG.md`: seeds **1,3,5,7,9 x 90d x world 600** — mid-run fork, **late convergent collapse** (pop 6-10), creed monoculture `piete`, bandits appear on schedule, early fort/creed choreography

### E. Scale config reality check

`simConfig.ts`: default **26** villagers; presets up to **55** (`anthill`); clamp `initialVillagers` **4-120**.
Section 20 asks **100 NPC** for individual-behavior tests — **above default**, inside clamp only if explicitly configured. Social tier asks **300 NPC** — **above initialVillagers clamp (120)** -> needs config policy change before social-scale soaks, or growth-only from births (slow).

---

## Gap vs NEW thresholds (sec 20-43 relevant to Agent 6)

### Section 20 — Minimum test size

| Tier | Required | Prior emergence PASS | Verdict |
|------|----------|----------------------|---------|
| Individual behavior | **100 NPC · 60d · 3 seeds · 10k decisions** | **26 · 40d · 2 seeds · decisions not counted** | **NOT TESTED** |
| Social systems | **300 · 120d · 10 seeds** | nowhere near | **NOT TESTED** |
| Rare phenomena | **10 seeds · 300d** | no | **NOT TESTED** |
| Generations | **500d or 2 complete generations** | 40d / 90d max gen<=1 | **NOT TESTED** |

**Rule from mission:** below these floors -> status must be **NOT TESTED**, not PASS.

### Section 33 — Migration minima

| Threshold | Required | Observed in T-B dumps | Verdict |
|-----------|----------|----------------------|---------|
| Migrations | >=20 | migrateLog **1 + 0 = 1** | **FAIL / NOT TESTED** |
| Families/groups migrating | >=10 | not measured | **NOT TESTED** |
| Destinations | >=3 | not measured | **NOT TESTED** |
| Seeds | >=3 | **2** | **NOT TESTED** |
| >=70% identifiable cause | — | urge max=1.0 under **induced** famine only | **CODE-ONLY / PARTIAL** |

### Section 38 — Multi-seed

| Threshold | Required | Prior | Verdict |
|-----------|----------|-------|---------|
| Seeds | **10** | 2 (T-B) / 3 (note) / 5 (A14) | **NOT TESTED** |
| >=8/10 show emergence | — | n/a | **NOT TESTED** |
| No identical histories | soft | A14 early phase too similar; late converge | **PARTIAL** historically |
| >=5 varying categories | soft | pop/forts/roads/guilds mid-run vary | **PARTIAL** at old scale |
| >=3 major events not-all-seeds | soft | halls rare; stone forts seed-specific | **PARTIAL** at old scale |

### Sections 39 / 42 — Anti-scripting and no test cheating

| Pattern | Evidence | Risk |
|---------|----------|------|
| Probe `induceLocalFamine` @ day 20 | empties surplus, raises hunger, sets `state.famine=true` | Allowed only if labeled **TEST SETUP** — audit treated path as famine PASS without always stressing "not emergent" |
| Probe forced `applyProfessionChange(... miller)` @ day 15 | profession switch PASS depends on induction | Same — mechanism check != emergence |
| `BANDIT_START_DAY = 40` hard gate | all seeds unlock together | Calendar script |
| Early fort projects + day-3 creed | A14 | Opening choreography |
| Creed monoculture `piete` | A14 end-state all seeds | Weak religious divergence |

TeachCraft / harvest (post sow-fix) / mill chain look **more interaction-driven**. Those pieces are stronger anti-script candidates **at the old scale only**.

### Section 16 migration narrative vs observation

Desired:

```text
famine -> perception -> family worry -> compare places -> decide -> move
```

Observed T-B:

```text
induced pantry wipe -> foodNeed=1 -> migrateUrgeMax=1.0
-> leave/rejoin log: 1 event (seed1) / 0 (seed7)
-> giveFood-under-famine: 0/0
```

Urge saturates; **enacted migration decision is not demonstrated** at volume. Retention thresholds (0.7-0.86) + home/loyalty sticky likely dominate 40d windows after short induce.

---

## PROBLEMS

### P1 — False confidence: old PASS reused as new PASS
`SECOND_AUDIT_REPORT.md` still says emergence multi-seed **PASS**. Under sections 19-20 that is a **category error**: old PASS != new PASS.

### P2 — Migration urge without migration acts
`migrateUrgeMax=1.0` both seeds, almost no leave logs. Architecture can inflate urge while leave gates / short horizon prevent the section-33 event count.

### P3 — Generational story unproven
A14: births fire, survivors after cliff are thin; depth <=1; parents pruned -> under-count. Section-20 gen floor unmet. Compressed marry age does **not** substitute for 500d / 2-gen proof.

### P4 — Scale mismatch
100 NPC / 300 NPC / 10 seeds never run for emergence. Default 26. `initialVillagers` clamp max 120 blocks "start at 300".

### P5 — Induced tests mixed into emergence verdict
Famine + profession switch were **induced** then folded into OVERALL PASS. Violates spirit of section 42 unless strictly labeled and scored separately from natural emergence.

### P6 — Synchronized scripted beats (A14, still relevant)
Bandit day-40 gate; early fort/creed rhyme; late hunger-cliff convergence historically. Post-harvest-fix may soften the cliff — **not re-proven** at 60-90d x >=3 seeds in this analysis pass.

### P7 — Seed1 vs seed7 asymmetry hidden by binary PASS
Harvest 10 vs 972 starts; giveFood 0 vs 199; mill day 27.8 vs 0.5. Divergence is real, but also shows **fragility**: a binary PASS mask over uneven emergence quality.

### P8 — Decision counters missing
Section 20 wants **10,000 decisions**; section 23 entropy / task diversity; section 40 anti-loop. T-B probe does not instrument decision counts, entropy, or repeated sequences.

---

## ISOLATED_SYSTEMS

| System | Isolation note |
|--------|----------------|
| `migrationUrge` vs enacted leave | Urge updates densely; leave/found rarely logged in short soaks |
| Cognitive goal `migrate` | Scored and biases tasks; no dump proves goal->leave causal chains at volume |
| Genealogy depth metrics | Broken/weak when dead parents pruned from `state.villagers` |
| Schism / polity longevity | EMERGENCE_NOTE: schismLog=0 at 40d — mechanism exists, rare window |
| Social-scale pop (300) | Config cannot start there; growth-only untested for section-20 social tier |

---

## MISSING_CONNECTIONS (for emergence proof)

1. **Natural famine -> leave -> new camp -> lasting second polity** (full sec-16 chain with >=20 events)
2. **Family-level migrate decision** (household moves together — not only individual urge)
3. **Destination comparison telemetry** (why village A vs B scored)
4. **Generation 2 adulthood acting on inherited world** (culture/creed/wealth/skills)
5. **10-seed matrix** for pop/wealth/professions/buildings/groups/migration/conflicts/food/tech (sec 38 compare list)
6. **Decision / entropy instrumentation** tying personality -> divergent trajectories under same shock

---

## DUPLICATES

| Topic | Duplicate / parallel | Risk |
|-------|----------------------|------|
| Famine feel | `state.famine` vs `feelFamine(village)` vs `villagerFeelsFamine` | Probe sets global flag; local feel is the real consumer — OK if disciplined, easy to mis-test |
| Child age constants | `politics.CHILD_AGE=220` vs `cognition/tactics.CHILD_AGE=180` | Soft inconsistency for "child" gating |
| Emergence probes | `_probe_second_audit_emergence`, `_probe_emergence_seeds`, `audit-civilization`, A14 gens | Different horizons/metrics; easy to cite wrong PASS |
| Memory dual | legacy `v.memories` vs mind events (noted elsewhere) | Migration/politics now use helpers; still a coherence risk for "cause" logs |

---

## EVIDENCE

### E1 — Prior PASS dumps (authoritative for old T-B)

- `_second_audit_s1.txt`
- `_second_audit_s7.txt`
- Readable report: `_tmp_emergence_utf8.md` / `SECOND_AUDIT_EMERGENCE.md`

### E2 — Scale facts from dumps

- startPop **26**, days **40**, seeds **{1,7}** only
- migrateLog **1 / 0** despite migrateUrgeMax **1.0**
- famine path field: **`"induced"`** both seeds
- professionSwitch.induced: **true** both seeds

### E3 — Code citations (architecture)

- Leave + destination: `src/lib/sim/politics.ts` (urge tick ~1638+, leave ~2317+, rejoin scoring ~2280+)
- Soft migrate steer + join radius: `src/lib/sim/behaviors.ts` ~3772-3848, ~4864-4871
- Birth/genetics: `src/lib/sim/behaviors.ts` `tickReproduction` ~6266+
- Bandit calendar gate: `src/lib/sim/bandits.ts` `BANDIT_START_DAY = 40`
- Default pop: `src/lib/sim/simConfig.ts` `initialVillagers: 26`
- Probe induction: `scripts/_probe_second_audit_emergence.ts` (`induceLocalFamine`, day-15 profession force)

### E4 — Longer / multi-seed history (not section-20-valid PASS)

- `AUDIT_A14_LONG.md` + `_probe_a14_gens.json`: 5x90d, gen depth weak, late convergence
- `EMERGENCE_NOTE.md`: 3x40d divergence claim (pre-section-20 floors)

### E5 — What WAS solid at old scale (keep; do not over-claim)

- Harvest causal fix (sow parallel clear) — seed1 harvestStarts 0->10
- Field release + livelihood sync on profession change (even if induced in probe)
- Ghost spouse = 0
- TeachCraft naturally dense
- Mill->grind->bake fires (esp. seed7)
- Natural profession log switches 63-80 (separate from induced miller test)

---

## Scorecard (Agent 6 scope only)

| Topic | Old label | Under sec 20-43 | Notes |
|-------|-----------|-----------------|-------|
| Situational micro-emergence (famine demand, mill, teach, bandit hygiene) | PASS @26/40d/2seeds | **NOT TESTED** at new floor | Mechanisms look real; sample too small |
| Migration as decision | soft PASS via urge | **NOT TESTED / CODE-ONLY** | Acts << urge |
| Generations | provisional / A14 weak | **NOT TESTED** | Need 500d or 2 gens |
| Multi-seed divergence | PASS / SEEDS_DIVERGE | **NOT TESTED** (sec 38 wants 10) | Old evidence PARTIAL quality |
| Anti-scripting | not scored | **PARTIAL / WEAK** | Inductions + day-40 bandits + early creed |
| Adaptation (profession/food profs) | PASS | **PARTIAL** | Natural switches exist; induced switch used for gate |
| Overall emergence (critical) | PASS in report | **PARTIAL** | Must not feed GLOBAL PASS |

---

## PROPOSED_FIXES (analysis proposals only — do not implement in this pass)

1. **Reclassify documentation**
   - Mark T-B / `SECOND_AUDIT_REPORT` emergence as **PASS (legacy scale)** / **NOT TESTED (sec 20)**.
   - Split probe results: `MECHANISM` (may induce) vs `EMERGENCE` (natural only).

2. **New soak matrix (Agent 8 harness)**
   - Tier A: `initialVillagers>=100`, **60d**, seeds **>=3**, count decisions >=10k.
   - Tier B social: grow or raise caps toward **300**, **120d**, **10 seeds**.
   - Tier gen: **>=500d** or until **2 adult generations** with living parent+child adults.
   - Tier migration: no induce; require >=20 leave/found/rejoin with cause tags.

3. **Migration telemetry**
   - Counters: urge crossings, leave attempts, blocked-by-retention, found camp, rejoin, family co-migrate.
   - Log destination score breakdown once per leave.

4. **Anti-script hardening (design, orchestrator-owned)**
   - Soften or diversify `BANDIT_START_DAY` hard cliff (pressure-triggered with calendar floor).
   - Diversify early creed crystallization beyond `piete`.
   - Keep probe induces but **never** let them set OVERALL emergence PASS.

5. **Generation measurement fix**
   - Depth via `state.genealogy` / persistent parent stubs, not only live `villagers[]`.
   - Define "complete generation" = born -> marry-age -> own child born.

6. **Config policy for section 20**
   - Allow `initialVillagers` up to >=100 (already <=120) in a dedicated audit preset; document that 300 must be **growth** or raise clamp.

---

## FILES_TO_MODIFY (future — not this pass)

| File | Why |
|------|-----|
| `SECOND_AUDIT_REPORT.md` / `SECOND_AUDIT_EMERGENCE.md` | Relabel statuses vs section 20 |
| `scripts/_probe_second_audit_emergence.ts` | Split mechanism vs natural; add pop/days/seeds/decision metrics |
| New: `scripts/_probe_emergence_scale.ts` (proposed) | sec 20/33/38 harness |
| `src/lib/sim/politics.ts` | Optional: retention tuning **only after** natural soaks prove starvation of leaves |
| `src/lib/sim/bandits.ts` | Optional: less calendar-scripted onset |
| `src/lib/sim/simConfig.ts` | Audit preset 100 NPC; consider social-tier caps |
| `src/lib/sim/family.ts` / gens probes | Stable generation depth |

**This analysis pass modifies none of the above.**

---

## DEPENDENCIES

```text
ecology.feelFamine --> careers.foodNeed --> profession pressure
        |
        +--> politics.migrationUrge --> goals.migrate --> behaviors idle/buildHouse
                                |
                                +--> leave / rejoin / ethnos migrate hooks

reproduction --> genetics/family/ethnos/culture inherit --> long-run divergence

bandits (day>=40) --> outcast detach --> village pop / ghost hygiene

food chain (sow/harvest/mill) --> whether mid-run cliff still synchronizes seeds
```

Orchestrator must not let Agent 3 (econ) or Agent 5 (society) "fix" emergence by buffing food or scripting guilds — that would fake sections 39/42.

---

## POSSIBLE_CONFLICTS

| Conflict | Agents | Notes |
|----------|--------|-------|
| Raising leave rates vs village stability | 6 vs 5 / 4 | Lower thresholds -> more camps but fragile polities |
| 100-300 NPC vs perf LOD | 6 vs 9 | Cognition LOD may freeze minds -> false uniformity |
| Harvest buffs vs honest scarcity | 6 vs 3 | Needed for non-broken cliff; must not become food cheat |
| Creed diversity vs religion systems | 6 vs 5 | Content change vs mechanism |
| Induced probes vs Agent 8 "no cheat" | 6 vs 8 / 10 | Reviewer will correctly reject induced OVERALL PASS |
| `initialVillagers` 300 vs clamp 120 | 6 vs 1 | Needs explicit config architecture decision |

---

## Causal chains — observed vs missing

### Observed (old scale, partial)

1. **Sow blocked -> harvest=0 (seed1) -> fix parallel clear/sow -> harvestStarts=10** (causal engineering win)
2. **Induced famine -> foodNeed=1 -> food profs rise (8->14 / 9->25)**
3. **Induced farmer->miller -> fieldX released -> livelihood `legacy_miller` -> jobBonus flip**
4. **Natural teachCraft high volume -> knowledge/chronicle hits**
5. **Outcast bandits with ghostSpouse 0** (hygiene)

### Missing for true emergence PASS

1. Natural famine -> family debate -> leave -> new camp persists >=20d -> different institutions
2. Child born -> inherits skills/creed -> as adult chooses differently than founders because of inherited world
3. Same shock, 30 personality pairs, >=50% measurable behavior split (sec 24)
4. 10-seed histories with >=3 major events non-universal (sec 38)

---

## Anti-scripting assessment (sec 39)

| Phenomenon | Est. scripted share | Comment |
|------------|--------------------:|---------|
| Bandit **onset** | High | Hard day-40 gate |
| Bandit **composition / outcast** | Medium-low | Pressure/exile heuristics exist |
| First creed label | High | A14 monoculture opening |
| Guild appearance | Medium | Threshold/rate-limited; some seed variance |
| TeachCraft | Low | Dense natural starts |
| Harvest after fix | Low-medium | Environment+seed sensitive (1 vs 7) |
| Famine in T-B PASS | **Test-induced** | Does not count as emergent |
| Profession switch gate in T-B | **Test-induced** | Natural switches also exist (good) |
| Migration leaves | Unknown / rare | Cannot claim 80% interaction-driven acts |

**Section 39 PASS not earned.**

---

## Recommended status lines for Orchestrator

```text
EMERGENCE_MICRO_MECHANISMS @26npc/40d/2seeds: PASS (legacy)
EMERGENCE_SEC20_INDIVIDUAL: NOT TESTED
MIGRATION_SEC33: NOT TESTED (CODE-ONLY urge path)
GENERATIONS_SEC20: NOT TESTED
MULTI_SEED_SEC38: NOT TESTED (old PARTIAL evidence only)
ANTI_SCRIPT_SEC39: PARTIAL/WEAK
EMERGENCE_CRITICAL (sec 21): PARTIAL — do not count as PASS toward GLOBAL PASS
```

---

## Bottom line for Agent 1

Prior work proved **several emergent-adjacent mechanisms at toy scale**, with real seed asymmetry and a real harvest bugfix. It did **not** prove emergence under the mission's own acceptance tests.

Treat "emergence PASS" in `SECOND_AUDIT_REPORT.md` as **historical / under-threshold**. Next proof bar:

**>=100 NPC x >=60 days x >=3 seeds**, natural (non-induced) scoring for migration/adaptation, plus a separate generation soak — before any Agent 6 code changes aimed at "making PASS."
