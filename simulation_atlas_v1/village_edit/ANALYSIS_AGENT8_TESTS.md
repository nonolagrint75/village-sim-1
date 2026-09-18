# AGENT 8 — Tests analysis + harness design

**Workspace:** `C:\Users\kamel\village-sim-1\_wt_rhythm\village_edit`  
**Date:** 2026-09-17  
**Mode:** ANALYSIS + HARNESS DESIGN ONLY — no gameplay rule changes, no PASS claims from new runs  
**Source of thresholds:** MASTER MISSION §§20–43 (orchestrator brief)  
**Constraint:** CODE-ONLY ≠ PASS; no temporary rule cheats to force outcomes (§42)

---

## 1. Scope

Validate that the sim can be *measured* against mission §§20–43. This document maps:

| Layer | Question |
|---|---|
| **Metrics** | What counters / distributions each § needs |
| **Reuse** | Which existing probes already collect partial evidence |
| **Harness** | How a unified runner should batch seeds, days, and reports |
| **Gaps** | What the engine does not expose yet |

§§44–49 (levels of proof, agent coherence, integration, regression, score, final report) are **out of implement scope** here but shape harness output format.

---

## 2. SYSTEMS_ANALYZED

| Area | Primary modules | Test relevance |
|---|---|---|
| Engine loop | `engine.ts`, `headless.ts` | seed/days runner |
| Config / scale | `simConfig.ts` | pop floors §20 |
| Decisions | `cognition/decide.ts`, `behaviors.ts` | §23 entropy, §24 personality, §41 causality |
| Memory / affect | `cognition/memory.ts`, `emotions.ts`, `social.ts` | §25–26 |
| Learning / teach | `interactions.ts`, `livelihood.ts`, skills | §27 |
| Careers | `careers.ts` | §28 |
| Family / demo | `family.ts`, `marriage.ts`, `genetics.ts` | §29 |
| Help / social | `giveFood`, social tasks | §30 |
| Build | `construction.ts`, furniture | §31 |
| Economy | `commerce.ts`, mills/trade | §32 |
| Migration / groups / institutions | `politics.ts`, `behaviors.ts` | §33–35 |
| Culture / religion / conflict | `religion.ts`, `bandits.ts`, `ethnos.ts` | §36–37 |
| Multi-seed / anti-script | probes + log archaeology | §38–39 |
| Anti-loop | task sequences | §40 |
| Causality chains | whyFactors + world deltas | §41 |
| Test honesty | probe setup flags | §42–43 |

---

## 3. METRICS_CATALOG (§§20–43)

### §20 — Minimum test sizes (gate before any PASS)

| Tier | Population | Days | Seeds | Extra |
|---|---:|---:|---:|---|
| Individual behavior | ≥100 NPC | ≥60 | ≥3 | ≥10 000 decisions |
| Social systems | ≥300 NPC | ≥120 | ≥10 | — |
| Rare phenomena | — | ≥300 / seed | ≥10 | — |
| Generations | — | ≥500 **or** ≥2 full generations | — | pedigree depth |

**Harness implication:** default `standard` (26 founders) and even `anthill` (55) **fail §20** until growth or explicit `TEST SETUP` with higher `initialVillagers` / longer runs. `maxPopulation` caps (220–400) make **300 living NPC** a stress case — must be tracked as achievable vs BLOCKED by capacity, not faked.

### §21 — Global PASS threshold

| Metric | Threshold |
|---|---|
| `PASS_RATE` on required tests | ≥90 % |
| Critical systems FAIL | 0 |
| Critical systems CODE-ONLY only | 0 |
| Seeds showing expected behavior | ≥8/10 |
| Complete causal chains observed | ≥10 |
| Artificial generation of outcomes | forbidden |

Critical systems list (mission): brain, memory, goals, decision, professions, economy, families, learning, consequences, emergence.

### §22 — Connectivity A→B

| Counter | Min |
|---:|---:|
| A produces relevant data | ≥20 |
| B consumes that data | ≥15 |
| Observable consequences | ≥5 |
| Distinct NPCs | ≥3 |
| Seeds | ≥3 |

### §23 — Decision diversity

```text
unique_task_types
task_entropy                    # Shannon over TaskKind starts or tick-occupancy
average_tasks_per_npc
task_switches_per_npc
behavioral_trajectory_clusters  # sequence fingerprints
```

| Threshold | Value |
|---|---|
| Distinct TaskKinds used | ≥5 |
| Behavioral trajectories | ≥3 |
| NPCs that change when a key variable changes | ≥30 % |
| Non-urgent task monopoly without justification | <70 % of actions |
| Exact same sequence >7 days for ≥80 % NPC | FAIL/PARTIAL |

### §24 — Personality

| Metric | Min |
|---|---:|
| Matched pairs (similar needs/env/resources, different personality) | 30 |
| Pairs with measurable behavior delta | ≥50 % of pairs |

Suggested delta features: fight vs flee rate, teach/socialise share, migrate starts, rest vs labor, craft vs forage.

### §25 — Memory causality

| Metric | Min |
|---:|---:|
| Events memorized | 50 |
| Retrievable (still in episodic/legacy) | 30 |
| Used in a decision (`reinforceRecall` / spot bias / whyFactors mem) | 20 |
| Distinct decisions attributable to memory | 10 |

### §26 — Emotions

| Metric | Min |
|---:|---:|
| Emotion state changes | 50 |
| Decisions after change | 30 |
| Decisions with emotion in whyFactors / score path | 15 |

Variable-only emotion (never in decide path) → FAIL.

### §27 — Learning

| Metric | Min |
|---:|---:|
| Practice events (`practiceSkill` / task outcomes) | 50 |
| NPCs | 30 |
| Seeds | 3 |
| Exposed NPCs who progress | ≥70 % |
| Teach events | 30 |
| Receivers | 20 |
| Future uses of transmitted knowledge | 10 |

### §28 — Profession changes

| Metric | Min |
|---:|---:|
| Changes | 20 |
| NPCs | 10 |
| Distinct professions involved | 4 |
| Seeds | 3 |
| Multi-factor explainable | ≥70 % |

### §29 — Families

| Metric | Min |
|---:|---:|
| Families | 30 |
| Births | 20 |
| Family economic shifts | 10 |
| Collective decisions | 10 |

### §30 — Mutual aid

| Metric | Min |
|---:|---:|
| Help events (`giveFood` + kin/guard/share categories) | 50 |
| Helpers | 20 |
| Helped | 20 |
| Situation kinds | 10 |
| Aid categories | ≥3 |

### §31 — Construction

| Metric | Min |
|---:|---:|
| Builds / upgrades | 30 |
| Families | 10 |
| Seeds | 3 |
| ≥2-factor explainable | ≥70 % |

### §32 — Economy

| Metric | Min |
|---:|---:|
| Transactions | 100 |
| Price changes | 50 |
| Production changes | 20 |
| Economic decisions | 20 |
| Activity/profession shifts | 10 |
| Full shock→…→price chains | ≥5 |

### §33 — Migration

| Metric | Min |
|---:|---:|
| Migrations | 20 |
| Families/groups | 10 |
| Destinations | 3 |
| Seeds | 3 |
| Identifiable cause | ≥70 % |

### §34 — Groups

| Metric | Min |
|---:|---:|
| Groups formed | 20 |
| Surviving ≥20 days | 10 |
| Size changes | 5 |
| Activity changes | 5 |
| Seeds | 3 |
| Emergent cause identifiable | ≥50 % |

### §35 — Institutions

| Metric | Min |
|---:|---:|
| Institutions | 10 |
| Surviving ≥30 days | 5 |
| Types | 3 |
| Full chain origin→members→activity→resources→evolution | required per type |

### §36 — Culture / religion

| Metric | Min |
|---:|---:|
| Transmissions | 20 |
| Belief changes | 10 |
| Influenced behaviors | 10 |
| Generations spanned | 2 |
| Seeds | 3 |
| Full belief→…→behavior chains | ≥10 |

### §37 — Conflicts

| Metric | Min |
|---:|---:|
| Conflicts | 20 |
| Participants | 10 |
| Distinct causes | 5 |
| Seeds | 3 |
| Identifiable cause | ≥70 % |
| Essentially random share | <20 % else FAIL |

### §38 — Multi-seed

| Metric | Min |
|---|---|
| Seeds | 10 |
| Seeds with emergence | ≥8/10 |
| Identical histories | 0 |
| Varying categories | ≥5 of {pop, wealth, professions, buildings, groups, migration, conflicts, food, technology} |
| Major events in some-but-not-all seeds | ≥3 |

### §39 — Anti-scripting

| Metric | Rule |
|---|---|
| Directly coded triggers among “emergent” phenomena | ≤20 % |
| From normal system interaction | ≥80 % |
| Forbidden pattern | hard `if pop>N createGuild()` style |

**Measurement:** static code audit + runtime ratio of scripted entry points vs organic (log + call-site tags). Not fully automatable without instrumentation tags.

### §40 — Anti-loop

```text
repeated_sequence_count
longest_repeated_sequence
unique_behavior_sequences
```

| Threshold | Value |
|---|---|
| NPCs with variation over 30 days | ≥30 % |
| Stuck in same loop >14 days | <50 % |
| Secondary goal when survival stable | ≥20 % |

### §41 — Causality

Per critical system: ≥10 complete chains:

```text
INITIAL STATE → PERCEPTION → INTERPRETATION → DECISION → ACTION
→ WORLD CHANGE → NEW PERCEPTION → NEW DECISION
```

Chains that never alter the world do not count.

### §42 — No cheating tests

Allowed: explicit `TEST SETUP:` initial conditions (e.g. wheat −70 %).  
Forbidden: temporary rule edits, forced CREATE_X, artificial migrations/professions/groups/conflicts/families/shortages/prices/emergent events to manufacture PASS.

### §43 — Mandatory evidence block

Every test report must emit:

```text
TEST / Population / Days / Seeds / Events / Expected / Threshold /
Observed / Actual / Result / Evidence
```

---

## 4. EXISTING_PROBES (reuse map)

### Core runners

| Artifact | What it already measures | §§ covered (partial) |
|---|---|---|
| `headless.ts` (`npm run sim`) | pop curve, births/deaths, professions snapshot, optional `--social` tallies | §20 size (weak), §29/30 via log |
| `scripts/_probe_emergence_seeds.ts` | seeds 1/3/7 @ ~40d: pop, creeds, ambitions, professions, teach/ritual, guilds/faith/institutions, schism/migrate/guild logs, Jaccard | §35–36, §38 (3 seeds only) |
| `scripts/_probe_second_audit_emergence.ts` | famine path, profession switch, mill chain, teachCraft, bandit/ghost spouse; **may induce famine/teach** | §28, §32, §27 (induced = §42 SETUP) |
| `scripts/audit-civ-emerge.ts` | peak pop/creeds/faith/institutions/polities/bandits/forts/inventions/trade | §34–37, §38 peaks |
| `scripts/audit-civilization.ts` | broader civ audit JSON reports | §38 companion |
| `scripts/_probe_a14_gens.ts` | 5 seeds × 90d: pop curve, death spikes, gen depth | §20 gens, §29, collapse |
| `scripts/_probe_demo_multigen.ts` | pedigree depth, housed kids, grown wed | §29 / generations |
| `scripts/_probe_careers.ts` | profession histograms + log switches | §28 |
| `scripts/_probe_econ_chain.ts` | resources, grind/bake/trade, prices over days | §32 |
| `scripts/_probe_food_chain.ts` / `_probe_food_shortage.ts` | mill→flour→bread, shortage response | §32 chains |
| `scripts/_probe_society.ts` | creeds, teach/ritual, guild log, ethnos/lang, political bias samples | §34–36 |
| `scripts/_probe_bandits.ts` / `_probe_ghost_desert.ts` | outcasts, ghosts | §37 |
| `scripts/_probe_deaths.ts` | death causes by log | consequences |
| `scripts/_task_hist_d5_15.ts` | TaskKind start/tick histograms | §23 precursor |
| `scripts/follow-villagers-rhythm.ts` | per-NPC task/hunger/stamina samples | §23/40 qualitative |
| `scripts/audit-work-life.ts` | livelihood plausibility flags | anti-nonsense |
| `scripts/_probe_tech.ts` / progression / fort / trade | tech & build adjacent | §31, §38 tech category |
| A3 probes (`a3_survival_probe.ts`, autopsy) | survival / death | baseline critical |

### Already-good patterns to copy

1. **Day-aligned sampling** (`t % TICKS_PER_DAY === 0`) — A14, emergence, society.  
2. **Task-edge detection** (`prevKind !== kind`) — `_task_hist_d5_15.ts`, second-audit.  
3. **Log regex archaeology** — schism/migrate/guild/religion — cheap but brittle (§22 “used by B” not proven).  
4. **Multi-seed JSON rows** — emergence / A14.  
5. **Explicit induce + label** — second-audit famine/teach (must be flagged `TEST SETUP` under §42).

### Weak / do-not-trust-as-PASS alone

- Single-seed short runs (<60d or <3 seeds).  
- Log-only “emergence” without world delta.  
- Induced teach/famine **without** SETUP banner when claiming organic §27/§32.  
- Pop ~26–55 when §20 requires 100/300.

---

## 5. HARNESS_ARCHITECTURE (proposed)

```text
                    ┌─────────────────────────────┐
                    │  harness.config.json         │
                    │  suites: individual|social|  │
                    │  rare|gens + seed list       │
                    └──────────────┬──────────────┘
                                   ▼
┌──────────────┐    ┌──────────────────────────────┐    ┌─────────────────┐
│ Probe adapters│───▶│  Runner (Node/tsx)            │───▶│ Evidence store  │
│ (reuse scripts│    │  - createSimulation(cfg)      │    │ JSONL + summary │
│  as collectors│    │  - stepSimulation             │    │ §43 blocks      │
│  OR shared    │    │  - TelemetryCollector.onTick  │    └────────┬────────┘
│  collector)   │    │  - no rule mutation           │             ▼
└──────────────┘    └──────────────────────────────┘    ┌─────────────────┐
                                                         │ Scorecard       │
                                                         │ PASS/PARTIAL/   │
                                                         │ FAIL/NOT_TESTED │
                                                         │ /CODE_ONLY      │
                                                         └─────────────────┘
```

### Layers

1. **`TelemetryCollector` (new, read-only)**  
   Hooked each tick or on task-edge / day-edge. Accumulates metrics from §3 without changing sim rules. Prefer external observation first; engine counters only if observation is impossible (§ INSTRUMENTATION_GAPS).

2. **`Suite profiles`** (map to §20)

| Suite id | Config intent | Min days | Min seeds | Pop target |
|---|---|---:|---:|---|
| `individual` | `initialVillagers≥100` or grow-to-100 | 60 | 3 | 100 |
| `social` | dense + long | 120 | 10 | 300 (or BLOCKED) |
| `rare` | standard/vast | 300 | 10 | natural |
| `gens` | 500d or depth≥2 | — | ≥3 | natural |

3. **`Adapters`** wrap existing probes as collectors that emit a common `MetricBag` instead of free-form console only.

4. **`EvidenceWriter`** emits §43 blocks + machine JSON:

```ts
type EvidenceBlock = {
  test: string
  population: number
  days: number
  seeds: number[]
  events: number
  expected: string
  threshold: Record<string, number>
  observed: Record<string, number | string>
  actual: Record<string, number | string>
  result: 'PASS' | 'PARTIAL' | 'FAIL' | 'NOT_TESTED' | 'CODE_ONLY' | 'CONNECTION_NOT_PROVEN'
  evidence: string[]  // log excerpts, chain ids, file paths
  testSetup?: string  // §42
}
```

5. **`CausalityTracer` (§41)**  
   On soft decisions, sample `whyFactors` + task kind + before/after world snapshot keys (inventory delta, price, profession, circle membership). Link consecutive samples into chains. Cap sampling for perf (e.g. 1/N villagers or deep-think only).

6. **Honesty gate (§42)**  
   Runner refuses to call `applyProfessionChange` / pantry wipe / `doTeachCraft` injectors unless `testSetup` string is set and result cannot claim “emergent” for that event class.

### Suggested file layout (not all implemented this pass)

```text
scripts/
  _harness_agent8_scaffold.ts     # scaffolding only (this pass)
  harness/                        # future
    config.ts
    collector.ts
    suites.ts
    evidence.ts
    adapters/*.ts
```

### Execution model

```bash
# Future (not claimed run):
npx tsx scripts/_harness_agent8_scaffold.ts --suite individual --dry-config
npx tsx scripts/harness/run.ts --suite social --seeds 1,3,5,7,9,11,13,17,19,23
```

Parallelism: one process per seed (memory isolation); merge JSONL. Respect A12 perf: anthill @55 already ~21 TPS — 300 NPC will need longer wall-clock and possibly LOD-aware sampling (observe, don’t gut).

---

## 6. MEASURABLE_VS_MISSING

### Currently measurable (no engine change)

| Capability | How |
|---|---|
| Pop, births, deaths, professions, prices, circles, polities, mills, tradeRuns | `computeStats` / state fields |
| TaskKind histograms, switches | edge detect on `v.task.kind` |
| Teach/ritual starts | ageTicks===0 sampling |
| Profession switches (logged) | FR log regex |
| Creed / guild / migrate / schism mentions | log regex |
| Gen depth / multi-gen | pedigree walk |
| Bandits, ghost spouses | state + probes |
| Personality traits on villagers | `v.personality` |
| Mind episodic/semantic size | `mindOf(v)` |
| Skills levels | `mind.skills` |
| whyFactors on last soft pick | present on decision result — **only if captured at choose time** (see gaps) |
| Seed divergence (coarse) | multi-seed row compare |

### Missing or weak instrumentation

| Need | Gap |
|---|---|
| Decision count ≥10k | No global counter; must sample every chooseTask/HARD assign |
| `task_entropy` | Must compute offline from histograms |
| Trajectory clusters | No sequence store per NPC |
| Personality pairs | No pairing helper; must build matched sets |
| Memory “used in decision” | `reinforceRecall` exists but no counter of causal uses |
| Emotion → decision | `onCognitiveEvent` / emotions mutate state; no “influenced decision” flag |
| Learning exposure % | No “exposed vs progressed” cohort tracker |
| Teach receivers + future use | Teach starts counted; reception/use under-counted unless skill delta tracked |
| Multi-factor profession explain | Log line ≠ factors; need demand + livelihood + field release fields |
| Family economic shifts / collective decisions | No dedicated counters |
| Aid categories | `giveFood` visible; category taxonomy not standardized |
| Construction “≥2 factors” | Builds observable; factor attribution missing |
| Transactions / price-change events | Prices readable; change events not event-sourced |
| Migration cause | `migrationUrge` readable; destination taxonomy weak |
| Group lifetime ≥20d | Circles exist; birth/death timestamps partial |
| Institution chain | Peaks only; origin→evolution not structured |
| Belief transmission chains | Chronicle lines ≠ chain objects |
| Conflict cause classification | Log/bandit; random vs causal share unmeasured |
| Anti-scripting ratio | Needs code tags or audit, not runtime |
| Anti-loop sequences | Need rolling task n-grams |
| Full §41 chains | No tracer linking perc→…→world |
| §43 uniform evidence | Each probe invents its own print format |
| Pop 100 / 300 | Config can raise founders; organic growth to 300 may hit `maxPopulation` / famine cliff (A14) |

---

## 7. TEST_PLAN

Phased — **analysis-complete; execution deferred**. No result below is a PASS claim.

### Phase T0 — Harness bootstrap (scaffolding)

- [ ] Land `scripts/_harness_agent8_scaffold.ts` (config echo + metric schema + dry run of collector stubs).  
- [ ] Adopt §43 `EvidenceBlock` as sole report contract.  
- [ ] Document every induced setup with `TEST SETUP:`.

### Phase T1 — Scale gate (§20)

| Test id | Action | Gate |
|---|---|---|
| T1-ind-size | Run `individual` suite cfg; record peak/live pop, days, seeds, decision samples | If pop<100 or days<60 or seeds<3 → **NOT_TESTED** for §23–27 claims |
| T1-soc-size | Attempt social suite; if maxPop blocks 300 → **BLOCKED** with causal note (capacity/famine), not FAIL-of-emergence |
| T1-gens | Reuse `_probe_a14_gens` / `_probe_demo_multigen` at ≥150–500d | depth≥2 or 500d |

### Phase T2 — Decision / mind (§23–27, §40–41)

| Test id | Reuse | New metrics |
|---|---|---|
| T2-entropy | `_task_hist_*` extended to 60d×3 seeds×100 pop | entropy, unique kinds, switches/NPC |
| T2-personality | new collector | 30 matched pairs |
| T2-memory | mind episodic + reinforce path sampling | §25 counts |
| T2-emotion | emotion deltas + whyFactors intersect | §26 |
| T2-learn | skill practice + teach deltas | §27 (no forced teach unless SETUP) |
| T2-antiloop | sequence n-grams 30d | §40 |
| T2-chains | causality tracer pilot on 1 critical system | ≥10 chains or CODE_ONLY |

### Phase T3 — Society / economy (§28–37)

| Test id | Reuse | Notes |
|---|---|---|
| T3-careers | `_probe_careers` | multi-seed, factor fields |
| T3-family | demo multigen + births | family economic stub |
| T3-aid | headless `--social` + giveFood edges | categorize |
| T3-build | fort/progression + house counts | factor attribution later |
| T3-econ | `_probe_econ_chain`, food_chain | price event stream |
| T3-migrate | emergence migrateLog + politics | causes |
| T3-groups-inst | society + civ-emerge | lifetimes |
| T3-culture | religion verify + society | transmission chains |
| T3-conflict | bandits + brawls/thefts stats | cause taxonomy |

### Phase T4 — Multi-seed / honesty (§38–39, §42–43)

| Test id | Action |
|---|---|
| T4-10seed | Extend emergence probe to 10 seeds × ≥40–120d; category variance matrix |
| T4-antiscript | Static review of CREATE_/hard thresholds + runtime share estimate |
| T4-evidence | Every suite emits §43 blocks; reject reports missing fields |

### Phase T5 — Global score (§21; report only)

- Aggregate required tests → `PASS_RATE`.  
- Any critical FAIL or critical CODE-ONLY → no GLOBAL PASS.  
- Integration / regression (§46–47) listed as orchestrator follow-up, not Agent 8 execution.

### Priority order (causal risk)

1. §20 scale honesty (everything else NOT_TESTED without it)  
2. §23 + §41 (decision realness)  
3. §28 + §32 (known campaign strengths — revalidate under harness)  
4. §27 teach fire-rate (known residual)  
5. §38 10-seed matrix  
6. Social §34–36 lifetimes  
7. §39 anti-script audit  

---

## 8. INSTRUMENTATION_GAPS

Ordered by blocking power for §§20–43.

### P0 — Required for honest PASS

| Gap | Proposal (observe-first) | Touches gameplay? |
|---|---|---|
| No decision counter | Collector increments on each `chooseTask` result + HARD assign path (wrapper in probe, or optional debug hook) | Hook only if exported; else monkey-patch in probe via tick sampling undercount |
| whyFactors not retained | Copy `pick.whyFactors` into a ring buffer on Villager or collector at assign time | Soft debug field OK if unused by AI |
| Memory-use counter | Increment when `reinforceRecall` returns true / spot bias applied | Counter in mind debug |
| Emotion-influence flag | When emotion modifier changes score materially, push factor `emo:*` (already partial in decide) + count | Prefer counting existing whyFactors |
| Task sequence buffer | Per-NPC last K TaskKinds (collector-side Map) | No |
| Price/transaction events | Diff `state.prices` + detect trade/give/buy edges | No |
| Profession change record | Structured event `{from,to,tick,demand,fieldReleased}` beside FR log | Optional careers debug push |
| §43 schema | Shared writer | No |

### P1 — Needed for social / rare suites

| Gap | Proposal |
|---|---|
| Circle/institution birth tick + member churn | Stamp `foundedTick` if missing; collector tracks membership deltas |
| Migration event struct | `{who,fromVg,toVg,urge,tick}` |
| Conflict cause enum | Classify outlaw/brawl/raid/feud |
| Teach reception | Pupil skill delta within T ticks after teachCraft |
| Family economic ledger | Household coin/food variance |
| Aid category tags | food / defense / build / counsel |
| Matched personality pair finder | Offline from snapshot |

### P2 — Nice / audit

| Gap | Proposal |
|---|---|
| Anti-script site registry | Comment/tag `EMERGENT_ENTRY` vs `SCRIPTED_ENTRY` |
| Causal chain IDs | Tracer assigns `chainId` |
| Perf budget for collectors | Sample 10–20 % NPCs at anthill+ |
| Population 300 feasibility study | Separate note: raise `maxPopulation` vs organic BLOCKED |

### Explicit non-goals for instrumentation

- Do not add free food, forced guilds, or CREATE_X to hit thresholds.  
- Do not lower §20 minima in code to match current pop.  
- Do not treat UI `snapshot.ts` packs as proof of causality.

---

## 9. CURRENT_ARCHITECTURE (test surface)

```text
createSimulation(seed, SimConfigInput?)
  → foundingVillagers (simConfig.initialVillagers)
  → stepSimulation(state)  // single tick
computeStats(state)        // aggregate snapshot
state.log[]                // FR chronicle (lossy)
mindOf(v)                  // cognition authority
v.task / v.profession / politicsOf(v) / circles / polities / prices
```

Probes are **standalone tsx scripts**, not a suite. No shared evidence schema. No CI gate on emergence thresholds.

---

## 10. PROBLEMS (testing posture)

1. **Scale mismatch:** mission §20 vs presets (26–55 founders).  
2. **PASS inflation risk:** short single-seed probes print PASS (e.g. careers) without §20/§43.  
3. **Log archaeology ≠ connectivity (§22).**  
4. **Induced scenarios** in second-audit can violate §42 if mislabeled as emergence.  
5. **Hunger cliff (A14)** collapses pop — social/rare suites may never reach 300 without confronting survival first.  
6. **whyFactors / memory / emotion causality** mostly invisible after the tick.  
7. **Fragmented probes** → cannot compute §21 PASS_RATE.

---

## 11. EVIDENCE (repo facts used)

- Mission §§20–43 text from orchestrator MASTER MISSION (2026-09-17).  
- `simConfig.ts`: standard 26 / anthill 55 / maxPopulation 220–400.  
- `AUDIT_A12_PERF.md`: ~60 TPS @30 pop; ~21 TPS anthill 55.  
- Existing probes listed in §4 (paths under `scripts/`).  
- `decide.ts` exposes `whyFactors` at choose time only.  
- `computeStats` fields in `types.ts` (`SimStats`).  
- TOTAL_AUDIT Phase 19 criteria 20–25 overlap thematically but **mission §§20–43 are the binding test law** for this agent.

---

## 12. PROPOSED_FIXES (harness-only; no sim rule edits)

1. Implement collector + §43 writer (scaffold started).  
2. Adapter-wrap top probes (emergence, careers, econ, gens, society, task hist).  
3. Add optional debug ring buffers only if collectors cannot observe (P0 gaps).  
4. Mark scale-inadequate runs `NOT_TESTED`, never PASS.  
5. Keep induced famine/teach behind `TEST SETUP` and exclude from §39 organic ratio.

---

## 13. FILES_TO_MODIFY (future; none required for analysis)

| File | Role |
|---|---|
| `scripts/_harness_agent8_scaffold.ts` | Scaffold (this pass) |
| `scripts/harness/*` | Future runner |
| Optional: `cognition/decide.ts` / `memory.ts` debug counters | P0 only if approved |
| **Not:** gameplay thresholds, CREATE_X, free resources |

---

## 14. DEPENDENCIES

- Orchestrator / other agents must not change task/profession/econ rules mid-harness without regression suite (§47).  
- Food-chain / careers stability affects whether §20 pop targets are reachable.  
- A12 perf limits wall-clock of social suite.

---

## 15. POSSIBLE_CONFLICTS

| Conflict | Mitigation |
|---|---|
| Agent adds scripted emergence to “pass” §38 | §39 + §42 harness rejects |
| Raising `initialVillagers` to 100 accused of cheat | Allowed as **TEST SETUP**, documented; not an emergent event |
| Raising `maxPopulation` to hit 300 | Config change only; still need organic survival — separate from rule cheats |
| Dual memory (legacy vs mind) double-counts §25 | Count mind authority first (`mindOf`) |
| HARD survival bypasses lack whyFactors | Document as non-soft path; still count as decisions for §20 |

---

## 16. Scaffold script

See `scripts/_harness_agent8_scaffold.ts` — **scaffolding only**: prints suite configs, metric schema, and adapter registry. Does **not** step the sim as proof of PASS.

---

## Verdict (Agent 8)

**Analysis complete.** The repo has many useful probes but no unified harness, no §43 evidence contract, and critical metric holes (decisions, entropy, personality pairs, memory/emotion causality, chain tracer). Default populations **do not meet §20**; claiming GLOBAL PASS today would violate mission law. Next implementation step is collector + adapters under explicit NOT_TESTED/BLOCKED semantics — without changing gameplay rules.
