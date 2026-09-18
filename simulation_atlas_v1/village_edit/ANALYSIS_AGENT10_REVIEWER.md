# ANALYSIS_AGENT10_REVIEWER — Adversarial review (analysis only)

**Agent:** 10 — Reviewer adversaire  
**Date:** 2026-09-17  
**Workspace:** `C:\Users\kamel\village-sim-1\_wt_rhythm\village_edit`  
**Mode:** NO CODE CHANGES  
**Law:** `EMERGENCE_MISSION_MASTER.md` + mission §§20–43 (via Agent 8 catalog); prior second-audit PASS = history, not gospel.

---

## Executive verdict

**Prior SECOND_AUDIT "OVERALL PASS / sim interconnectée PASS" does not survive the new mission bar.**

Campaign evidence is almost entirely **~26 founders x 40 days x 2 seeds (1,7)**, often with **probe-induced famine / profession switch**. Under §20 that is **below every minimum tier**. Under §21 it cannot support GLOBAL PASS: critical systems remain **CODE-ONLY or NOT TESTED**, and several "PASS" labels are **mechanism checks + soft gates**, not emergence.

**Honest global status today:** **NON DECLARE / NOT TESTED** (matches master). Many historical PASS → **NOT TESTED**, **CODE-ONLY**, or **PARTIAL (legacy scale)**.

---

## False PASS candidates

Reclassification under §§20–21 (and related §§22–43). "Legacy PASS" = true only at old toy bar.

| Prior claim | Source of claim | Scale / method | New status | Why the PASS is false |
|-------------|-----------------|----------------|------------|------------------------|
| **Sim interconnectée OVERALL PASS** | `SECOND_AUDIT_REPORT.md` | Code fixes + 2x40d dumps | **NOT TESTED** | Interconnect ≠ proven at §20; scorecard §49 still PENDING |
| **Emergence multi-seed PASS (T-B)** | Report + `_second_audit_s{1,7}.txt` | 2 seeds x 40d x pop26 | **NOT TESTED** | §20 social/rare need 10 seeds / 120–300d; §38 needs 10 seeds |
| **Famine path PASS** | Emergence dumps `path: "induced"` | Day-20 `induceLocalFamine` | **CODE-ONLY / TEST SETUP** | Not natural; `giveFoodUnderFamine=0` both seeds |
| **Profession switch PASS** | Dumps `induced: true` | Day-15 forced `applyProfessionChange(... miller)` | **CODE-ONLY / TEST SETUP** | Gate is sync after *forced* change, not emergent adaptation |
| **Harvest chain PASS** | Report + food-chain + emergence | Seed1 starts=**10**; seed7=**972** | **PARTIAL → NOT TESTED at bar** | Asymmetry extreme; seed1 end `wheatTiles=0`; no 3-seed x 60d x 100npc |
| **Mill → grind → bake PASS** | Emergence millChain | Seed7 grind@0.5d; seed1 late | **PARTIAL (legacy)** | Throughput / bake lag unproven at scale; economy Agent3 bake≪grind |
| **Careers dynamic PASS** | `_verify_careers_s7_d40.txt` + emergence | Single seed 40d | **NOT TESTED** | §28 wants ≥20 changes, ≥3 seeds, multi-factor explainability |
| **Mind life-events → politics/religion/bandits PASS** | Interconnect helpers | Code wiring | **CODE-ONLY** | No soak proving decisions attributed to mind events at §25 |
| **Soft brain CONNECTED / cycle CLOSED** | `BRAIN_CYCLE_REPORT.md` | Static + hybrid path | **CODE-ONLY (wiring)** | §21 critical systems need measured PASS; entropy/personality/counterfactuals unmet |
| **Ghost spouses PASS (0/0)** | Dumps peak/end 0 | 2x40d | **NOT TESTED** | Rare hygiene; §20 rare tier unmet; A14 longer runs not re-proven here |
| **TeachCraft PASS** | starts 2362 / 1552 | Volume only | **PARTIAL → NOT TESTED** | §27 needs progress %, receivers, future use; `skillSamples: []` |
| **Bandit outcast PASS** | banditsEnd 3/2, outcast=1 | Horizon = `BANDIT_START_DAY` | **SCRIPT + NOT TESTED** | Hard day-40 gate; desertLogs=0; pop crash unmeasured |
| **food→prix→job interconnect PASS** | Report "bidirectional PASS" | Same dumps | **PARTIAL / FAIL open** | Report itself marks trade/title PARTIAL; buyMaterial quiet |
| **Migration as decision / urge PASS** | Urge max=1.0 in dumps | Induced famine | **FAIL / NOT TESTED (§33)** | migrateLog **1+0=1** ≪ 20; destinations/families unmeasured |
| **Multi-seed divergence PASS** | EMERGENCE_NOTE / A14 | 3–5 short seeds | **NOT TESTED (§38)** | 10-seed matrix absent; A14 shows late **convergent** collapse |
| **Generations PASS / A14 "long"** | A14 @90d | gen depth ≤1 | **NOT TESTED (§20 gen)** | Need ≥500d or 2 complete generations |

### Dump facts that kill binary PASS

From `_second_audit_s1.txt` / `_second_audit_s7.txt`:

- `startPop: 26`, `days: 40`, seeds `{1,7}` only  
- Famine: `"path": "induced"`, `foodNeed: 1`, `giveFoodUnderFamine: 0` (both)  
- Profession: `"induced": true`, farmer→miller scripted  
- Migration: `migrateUrgeMax: 1`, `migrateLog: 1` (s1) / `0` (s7)  
- Harvest: starts **10 vs 972**; s1 `wheatTiles: 0` at end  
- Bandits: `banditStartDay: 40`, `desertLogs: 0`  
- Probe prints `OVERALL PASS (no FAIL)` if **no FAIL** — PARTIAL/induced still counts as PASS

Probe authority: `scripts/_probe_second_audit_emergence.ts` — `induceLocalFamine` at day 20; forced profession change at day 15; teach may call `doTeachCraft` if natural starts==0.

Shortage corroboration (`_food_shortage_s7_final.txt`): `sawNaturalFamine:false`, `induced:true`, ends `PASS - famine/food careers wired` — mechanism wire, not emergence.

---

## Superficial connections

Claims of "closed cycle" that are **thin, dual, or one-way**:

1. **Mind-first life events** — helpers wired; `gossip()` still **legacy-only** (report residual). Dual `v.memories` ↔ mind = superficial unity.  
2. **Famine → career demand → prices** — induced wipe raises `foodNeed`; **sharing under feelFamine is 0**; natural famine rare on these horizons.  
3. **Profession ↔ livelihood** — `applyProfessionChange` sync proven on **forced** switch; natural switch logs ≠ full demand→job→field causal chain at scale.  
4. **Migration urge → leave** — urge saturates to 1.0; **acts almost never fire** in T-B window (retention / stickiness). Architecture present, behavior missing.  
5. **Soft brain x HARD survival** — factors x softmax "closed" while mid-tick HARD **skips evaluate→decide** for eat/chest/torch/freeze/night labor. Hybrid ≠ single soft authority.  
6. **Emotions / ToM / GWT / knowledge** — multiply soft utilities on authored `add(...)` catalog; cannot invent TaskKinds; deep LOD only for rich evaluate.  
7. **Politics / religion → task bias** — creed multipliers exist; ritual **TaskKind starts ≈0** while rite logs fire elsewhere (Agent5) — influence without the claimed behavior channel.  
8. **Trade interconnect** — caravan vs `tickTrade` barter vs prices: Agent3 marks local retail / buyMaterial **quiet**; food→price→job "PASS" oversold.  
9. **TeachCraft density** — high start counts ≠ skill transmission causality (`skillSamples` empty in dumps).  
10. **Interconnect greps** (`state.famine` writer-only, etc.) — prove **absence of some bugs**, not bidirectional causal soaks.

---

## Too-small tests

| Evidence set | Pop | Days | Seeds | §20 floor | Gap |
|--------------|-----|------|-------|-----------|-----|
| Second-audit emergence | 26→32/38 | 40 | 2 | Indiv ≥100/60/3; Social ≥300/120/10 | **Fail all** |
| Food-chain harvest_fix | 26 | 30 | 1 (s7) | Same | Single-seed short |
| Food-chain s1_final | 26→34 | 30 | 1 | Same | millers=0 while grind>0 |
| Careers verify | ~26 | 40 | 1 (s7) | §28 ≥3 seeds | Incomplete |
| Shortage s7 | (induced) | short | 1 | Natural path required for emergence | Setup labeled PASS |
| EMERGENCE_NOTE | ~26 | 40 | 3 | §38 → 10 | Under-powered |
| A14 gens | world600 | 90 | 5 | Gen ≥500d / 2 gens | Depth≤1; late converge |

Config reality (`simConfig.ts`): `standard` **26**, `anthill` **55**, `initialVillagers` clamp **4–120** → **cannot even start at 300 NPC** without clamp/policy change. `maxPopulation` 220–400 makes 300 living a stress case, not a default.

**Decisions:** §20 wants ≥10k decision samples; T-B probe **does not count** chooseTask / HARD assigns. Entropy, personality pairs, memory-causal counts: **absent** → any §23–27 PASS is fiction.

---

## Scripted emergents

| Pattern | Evidence | §39 / §42 risk |
|---------|----------|----------------|
| **Induced famine @d20** | Probe `induceLocalFamine`; dumps `path: "induced"` | Allowed only as TEST SETUP — **must not** set OVERALL emergence PASS |
| **Forced farmer→miller @d15** | Probe `applyProfessionChange`; dumps `induced: true` | Mechanism test disguised as emergence subtest PASS |
| **`BANDIT_START_DAY = 40`** | `bandits.ts`; dumps `banditStartDay: 40`; note "full bandit window" | Calendar unlock shared by all seeds — **scripted onset** |
| **Early creed / fort choreography** | A14 long audit (Agent6) | Opening sequence too similar across seeds |
| **Late creed monoculture `piete`** | A14 end-states | Divergence fails; convergence script-like |
| **Teach fallback inject** | Probe may `doTeachCraft` if starts==0 | Artificial volume if natural path cold |
| **Harvest mid-tick ripe HARD** | Brain report §4 | Scripted priority vs leisure — acceptable survival, not "emergence" |

**Harsh rule:** Any OVERALL PASS that folds induced rows into the same PASS bit as harvest/teach is **category error**. Split MECHANISM vs EMERGENCE or fail §42 honesty.

---

## Decorative systems

"Present in code / report PRESENT" but **not load-bearing for mission PASS**:

| System | Why decorative at current evidence |
|--------|-------------------------------------|
| **Consciousness / GWT** | Deep-only stream; asleep → bias 0; no §22 consequence chain measured |
| **Counterfactual / SCM (user §24)** | ABSENT — 1-step PE lite only (`BRAIN_CYCLE` / Agent2) |
| **WebGPU softmax label** | CPU `batchSoftmaxSelect` path |
| **Explore / imagination** | 1-step lite; catalog ceiling |
| **Belief-as-Bayes / network centrality** | Marketing vs decide |
| **`careerDemandForProfession` export** | Dead / unused (report) |
| **Ritual TaskKind** | Starts≈0; parallel rite path |
| **Institution "resources / evolution"** | Soft pooled food; longevity uninstrumented (Agent5) |
| **Full civil war / army war** | Deferred stubs |
| **Barter `tickTrade` vs priced caravans** | Dual economies; agents feel two markets |
| **Legacy memory gossip** | Social theater without mind authority |
| **UI "why" / reasons** | Reflection PARTIAL — garnish unless whyFactors sampled in soaks |

Decorative ≠ delete. Decorative = **do not cite as critical PASS** toward §21.

---

## Regression risks

1. **Sow||clear fix** — seed1 harvest fragile (10 starts); future `chooseTask` exclusivity regressions → silent harvest=0 again.  
2. **giveFood floor 0.55 under famine** — may inflate sharing in longer soaks or starve natural scarcity stories.  
3. **buildHouse → `applyProfessionChange`** — quiet profession churn / field lock races with careers agent.  
4. **Mind-first helpers** — politics/religion/bandits now dual-source; gossip left behind → inconsistent "cause" logs.  
5. **Night HARD rest residual** — softening (brain residual) can kill outdoor harvest/guard at scale.  
6. **Probe inductions in CI** — if reused as regression gates, green builds ≠ mission PASS (Agent8 warning).  
7. **A14 convergent collapse** — post-harvest-fix food abundance may **hide** or **shift** famine cliffs; need re-soak ≥90–500d before claiming stability.  
8. **Population / LOD** — pushing toward 100–300 NPC without collector sampling → false "mind cold" / decision undercount.  
9. **Parallel agent edits** on `behaviors.ts` / `decide.ts` / `careers.ts` — merge thrash on soft vs HARD boundaries.  
10. **Encoding-corrupt `SECOND_AUDIT_EMERGENCE.md`** — human/agent may mis-cite; prefer dumps + UTF-8 twin.

---

## SYSTEMS_ANALYZED

1. Second-audit emergence harness + dumps (`_second_audit_s1/s7`)  
2. Food-chain / harvest / mill / bake dumps (`_food_chain_*`, harvest_fix)  
3. Famine/shortage induced wire (`_food_shortage_s7_final`)  
4. Careers verify (`_verify_careers_s7_d40`)  
5. Soft brain cycle + HARD bypasses (`BRAIN_CYCLE_REPORT`, Agent2)  
6. Economy food↔price↔job / trade dual (`ANALYSIS_AGENT3`)  
7. Society / creed / bandits / institutions (`ANALYSIS_AGENT5`)  
8. Emergence / migration / gens / anti-script (`ANALYSIS_AGENT6`)  
9. Test law §§20–43 + harness gaps (`ANALYSIS_AGENT8`, master)  
10. Config scale clamps (`simConfig.ts`) + `BANDIT_START_DAY`  
11. Interconnect residuals (gossip, giveFood-under-famine, LOD cold)

---

## CURRENT_ARCHITECTURE

Observed pipeline (master + reports):

```text
engine.stepSimulation
  → tickClimate / tickFamine
  → tickVillager (needs, livelihood, threats, HARD interrupts,
       tickCognition, chooseTask / pickTaskByPolicy x9 factors,
       executeTask)
  → tickTrade / tickMarriage / reproduction / adoption
  → tickFields / fauna / combat / bandits
  → tickPolitics / build / technology
  → lineages / ancestor / ethnos
  → commerce cadence (village economy, urban network, market prices)
```

**Authority rules (claimed):** mind-first memory on hot paths; profession→livelihood via `applyProfessionChange`; famine via `feelFamine` / `tickFamine`; soft decide unless HARD survival.

**Reality check:** soft path is real; HARD list is long; probes **mutate** state mid-run; default pop is toy-scale.

---

## PROBLEMS

1. **PASS inflation** — `OVERALL PASS (no FAIL)` with induced subtests and PARTIAL semantics collapsed.  
2. **Scale illegality** — 26/40/2 used as if §20 satisfied.  
3. **Migration theater** — urge without volume of leaves (§33 fail).  
4. **Seed asymmetry masked** — harvest 10 vs 972 both labeled PASS.  
5. **Calendar bandits** — shared unlock day.  
6. **No decision / entropy instrumentation** — cannot score §23–24, §40.  
7. **Social tier unreachable** without config policy (clamp 120).  
8. **Critical §21 systems** (brain completeness, memory causality, emergence) still CODE-ONLY / NOT TESTED.  
9. **Dual memory / dual trade / dual religion stacks** — coherence debt.  
10. **Documentation drift** — French report PASS vs master NON DECLARE vs corrupt emergence MD.

---

## ISOLATED_SYSTEMS

| Isolate | Severity |
|---------|----------|
| `gossip()` legacy-only | PARTIAL |
| `careerDemandForProfession` dead export | Low |
| LOD / mind cold agents | PARTIAL |
| `tickTrade` barter vs caravan prices | PARTIAL |
| Migration urge vs leave enactment | HIGH for §33 |
| Ritual TaskKind vs rite logs | PARTIAL |
| Counterfactuals / SCM | ABSENT |
| Institution treasury / evolution metrics | PARTIAL |
| HARD survival without whyFactors | Documented gap |
| giveFood-under-feelFamine window | PARTIAL (0 in T-B) |

---

## MISSING_CONNECTIONS

1. Natural famine → family debate → leave → new camp → lasting polity (≥20 events)  
2. Memory episode → measurable decide attribution (≥20 memory-causal decisions)  
3. Emotion delta → whyFactors → different TaskKind (≥15)  
4. Personality-matched pairs → ≥50% behavior split (§24)  
5. Teach → receiver progress → later craft/build use (§27)  
6. Price shock → profession mix → production → price ease full loop at 3+ seeds  
7. Creed change → counted behavior chain across 2 generations (§36)  
8. Conflict cause taxonomy histogram at ≥20 events x 3 seeds (§37)  
9. Generation-2 adults acting on inherited world (§20 gen)  
10. Unified §43 evidence blocks + §21 PASS_RATE aggregator

---

## DUPLICATES

| Duplicate | Risk |
|-----------|------|
| Multiple emergence probes (second-audit, seeds, A14, civ) | Cite wrong PASS |
| Famine: `state.famine` vs `feelFamine` vs village feel | Mis-test global flag |
| Memory: `v.memories` vs mind episodic | Double-count / miss |
| Creed crystallize: religion.ts vs stubs vs politics | Double-assign |
| Food redistribute: giveFood vs tradeRun vs barter | Three paths, one metric |
| Career demand docs vs live `computeCareerDemand` | Stale guidance |
| Child age constants across modules | Soft inconsistency |
| Scorecards: SECOND_AUDIT vs master §49 vs Agent6/8 | Status wars |

---

## EVIDENCE

| ID | Artifact | What it proves / disproves |
|----|----------|----------------------------|
| E1 | `_second_audit_s1.txt` | Pop26, 40d, induced famine/switch, harvestStarts=10, migrateLog=1, teach volume, OVERALL PASS print |
| E2 | `_second_audit_s7.txt` | Same shape; harvestStarts=972; migrateLog=0; giveFoodUnderFamine=0; mill early |
| E3 | `scripts/_probe_second_audit_emergence.ts` | Inductions + PASS aggregation logic |
| E4 | `_food_chain_s7_harvest_fix.txt` | d30 harvest cum=4665, alive=26, millers=0 |
| E5 | `_food_chain_s1_final.txt` | Post-sowfix chain; grind/bake appear; still toy pop |
| E6 | `_food_shortage_s7_final.txt` | Induced shortage wire labeled PASS historically |
| E7 | `_verify_careers_s7_d40.txt` | Single-seed careers snapshot |
| E8 | `SECOND_AUDIT_REPORT.md` | Inflated executive PASS + honest PARTIAL residuals |
| E9 | `BRAIN_CYCLE_REPORT.md` | Hybrid CONNECTED + long HARD list |
| E10 | `ANALYSIS_AGENT6_EMERGENCE.md` | Already reclassifies T-B → NOT TESTED |
| E11 | `ANALYSIS_AGENT8_TESTS.md` | §20–21 tables; harness missing |
| E12 | `EMERGENCE_MISSION_MASTER.md` | NON DECLARE; old PASS = sous-bar |
| E13 | `simConfig.ts` | 26/55 founders; clamp initial≤120 |
| E14 | `bandits.ts` `BANDIT_START_DAY = 40` | Scripted unlock |
| E15 | Agent2/3/5 analyses | Brain gaps; bake lag; society NOT TESTED at §34–37 |

---

## PROPOSED_FIXES

Analysis-only proposals (orchestrator / later phases):

1. **Relabel all SECOND_AUDIT PASS** as `PASS (legacy ≤26/40/2)` or `NOT TESTED (mission §20)`.  
2. **Split probe output:** `MECHANISM` (induced OK) vs `EMERGENCE` (natural only); never one OVERALL bit.  
3. **Scale gate T1** (Agent8): refuse PASS printing unless pop/days/seeds/decisions meet tier.  
4. **Migration soak:** no induce; require ≥20 leaves with cause tags before any §33 PASS.  
5. **Anti-script:** soften or diversify `BANDIT_START_DAY`; document as founding heuristic if kept.  
6. **Instrument** decision counts, entropy, whyFactors retention, teach deltas, gen depth via genealogy.  
7. **Config policy** for social tier (grow-to-300 vs raise clamp) — explicit BLOCKED if capacity forbids.  
8. **Unify** gossip to mind-safe; keep HARD whyFactors optional but count HARD as decisions.  
9. **Re-soak A14-class** after farm fixes before claiming no convergent collapse.  
10. **Do not** buff food/yields to chase PASS (§42).

---

## FILES_TO_MODIFY

*(Future implementation — not this pass.)*

| File | Why |
|------|-----|
| `SECOND_AUDIT_REPORT.md` / `SECOND_AUDIT_EMERGENCE.md` | Status relabel vs §20 |
| `scripts/_probe_second_audit_emergence.ts` | Split MECHANISM/EMERGENCE; stop OVERALL PASS on induce |
| `scripts/harness/**` (proposed) | §20 gate + §43 writer |
| `src/lib/sim/simConfig.ts` | Document / policy for ≥100 start or growth |
| `src/lib/sim/bandits.ts` | Optional anti-calendar-script |
| `src/lib/sim/politics.ts` | Migration telemetry |
| `src/lib/sim/social.ts` | Gossip mind-safe |
| `src/lib/sim/behaviors.ts` / `cognition/decide.ts` | Optional counters / whyFactors on HARD |
| `EMERGENCE_MISSION_MASTER.md` scorecard §49 | Fill with NOT_TESTED rows |

---

## DEPENDENCIES

- Agent8 harness / evidence contract before any new PASS claims  
- Agent6 emergence natural-path soaks (migration, multi-seed, gens)  
- Agent3 economy re-probe after harvest (bake throughput, buyMaterial)  
- Agent5 society metrics (group longevity, conflict taxonomy)  
- Agent2 brain: decision sampling under HARD+soft for §20 counts  
- Survival/farm stability (Agent3/food-chain) — prerequisite for pop≥100  
- Orchestrator arbitration on `behaviors.ts` merge conflicts  
- Perf (Agent9): 100–300 NPC wall-clock before social suite

---

## POSSIBLE_CONFLICTS

| Conflict | Parties | Note |
|----------|---------|------|
| Raise leave rate vs village stickiness | Emergence vs politics balance | Fragile polities |
| Soften bandit day gate vs content schedule | Society vs narrative design | |
| Soften night HARD vs freeze deaths | Brain vs survival | |
| 100–300 pop vs LOD cold minds | Scale vs "brain PASS" | False cognition if cold |
| Induced probes in CI vs §42 | Tests vs honesty | |
| Clamp 120 vs social §20 300 | Config vs mission | BLOCKED ≠ FAIL-emergence |
| Mind-unify gossip vs import cycles | Brain vs social | |
| Parallel edits `behaviors.ts` | Agents 2/3/6/7 | Orchestrator serialize |
| Claiming PASS while master NON DECLARE | Docs vs process | Reviewer reject |

---

## Scorecard (Agent 10 adversarial — mission bar)

| System | Prior | Agent10 |
|--------|-------|---------|
| Agriculture / harvest | PASS | **PARTIAL (legacy) / NOT TESTED (§20)** |
| Mill chain | PASS | **PARTIAL (legacy)** |
| Careers / livelihood sync | PASS | **CODE-ONLY + tiny sample → NOT TESTED** |
| Soft brain cycle | CONNECTED | **CODE-ONLY (critical ≠ PASS)** |
| HARD survival | ACCEPTED | **ACCEPTED mechanism; not emergence credit** |
| Famine response | PASS | **TEST SETUP / CODE-ONLY** |
| TeachCraft | PASS | **PARTIAL volume / NOT TESTED (§27)** |
| Bandits / ghosts | PASS | **SCRIPT + NOT TESTED** |
| Migration | soft PASS via urge | **FAIL / NOT TESTED (§33)** |
| Multi-seed emergence | PASS | **NOT TESTED (§38)** |
| Generations | weak | **NOT TESTED** |
| Society §§34–37 | old PASS-ish | **NOT TESTED** (Agent5 concur) |
| Economy full loop | PARTIAL | **PARTIAL (agree; do not upgrade)** |
| **GLOBAL (§21)** | implied by report | **FAIL gate / NON DECLARE** |

---

## Bottom line for orchestrator

Prior work **fixed real bugs** (sow/clear, buildHouse sync, mind helpers) and produced **useful mechanism dumps**. That is **not** mission PASS. Treat SECOND_AUDIT OVERALL PASS as **campaign memorabilia**. Next honest status line:

```text
EMERGENCE_MICRO_MECHANISMS @26npc/40d/2seeds: PASS (legacy)
EMERGENCE_SEC20_INDIVIDUAL: NOT TESTED
MIGRATION_SEC33: NOT TESTED / FAIL (n_leave≈1)
MULTI_SEED_SEC38: NOT TESTED
ANTI_SCRIPT_SEC39: WEAK / PARTIAL
GLOBAL_PASS: NON DECLARE
```

*Fin ANALYSIS_AGENT10_REVIEWER — analysis only, no code changes.*
