# ANALYSIS_AGENT2_BRAIN

**Agent:** 2 — CERVEAU (analysis only)
**Workspace:** `C:\Users\kamel\village-sim-1\_wt_rhythm\village_edit`
**Date:** 2026-09-17
**Sources:** `BRAIN_CYCLE_REPORT.md`, `BRAIN_COHERENCE_REPORT.md` sections 24-27 + affect/memory rows, `cognition/*`, `behaviors.ts` decide path
**Legend:** **proven** = confirmed by prior audits/sim reports cited here · **CODE-ONLY** = inferred from static code this pass (no new soak)

---

## SYSTEMS_ANALYZED

| System | Files | Role in cycle |
|---|---|---|
| Tick / depth | `cognition/tick.ts`, `budget.ts`, `mindPool.ts` | `tickCognition` fast/deep; mind SoA; deep period LOD |
| Perceive | `sensing.ts`, `tick.perceiveLocal` | Local sense -> memory spots -> short blind; local wolves/famine/SoL/prices |
| Understand | `workingMemory.ts`, `workspace.ts`, `consciousness.ts`, `predictive.ts`, `executive.ts` | WM -> GWT broadcast -> consciousAccessBias; PE lite; S1/S2 |
| Remember | `memory.ts`, legacy `v.memories` / `social.remember` | Episodic / semantic / procedural / socialModel; mind-first spots |
| Feel | `needs.ts`, `emotions.ts` | Need pressures + discrete affect -> valence/approachAvoid |
| Evaluate | `goals.ts`, `selfModel.ts`, ambition sync in `tick.ts` | `CognitiveGoalId` + `PlanStub` (not TaskKinds) |
| Decide | `decide.ts` -> `pickTaskByPolicy` | 9-factor product x Boltzmann x 1-step imagination |
| Act / catalog | `behaviors.ts` `chooseTask` / `executeTask` / mid-tick | Authored `add(...)` menu + HARD must-fires |
| Observe / Learn | `tick.recordTaskOutcome`, `noteChosenAction`, `labor.ts`, `stubs` habits | RPE -> habits; skills; prefs; model PE; plan advance |
| Personality | `v.personality`, `needs.valuesFromPersonality`, `decide` social/T/lieu, `driftPersonality` | Traits -> values/T/factors; slow emotion->trait drift |
| Relations / ToM | `tom.ts`, `v.relations`, `social.ts` | Depth-1 impressions; `socialTomFactor` |
| Knowledge / skills | `technology.ts` via `prefsSkillFactor`; `memory.practiceSkill` | Soft teach/craft/fort priors |
| User thresholds 24-27 (`BRAIN_COHERENCE_REPORT`) | Counterfactuals / relation graphs / network science / pop dynamics | Causality and social-graph bar vs personality-memory-emotion wiring |

---

## CURRENT_ARCHITECTURE

### Soft mental cycle (closed on rethink path) — proven (`BRAIN_CYCLE_REPORT` Second pass)

```
tickVillager
  |- mid-tick interrupts (eat / chest / empty-bag / ripe leisure / cold / threat / night shelter)
  |     HARD setTask  --or--  soft fight<->flee via cognitiveTaskModifier
  |- if !task:
  |     forceBiologicalRhythm -> HARD survival / homeless freeze
  |     else tickCognition(fast|deep) + chooseTask
  |           perceiveLocal (fast+deep)
  |           needs / emotions / WM / workspace / consciousness
  |           [deep] goals + plan + selfModel + ToM + personality drift + culture
  |           catalog options (env + memory spots)
  |           [HARD] bagEmptyFoodCrisis -> tryAssignFoodSeek
  |           pickTaskByPolicy: 9 factors x softmax x imagination top-3
  |           setTask + noteChosenAction (forecast PE, whyFactors)
  +- executeTask -> recordTaskOutcome -> habits/skills/prefs/RPE/PE -> mindPool
```

### goals != TaskKinds (by design)

| Layer | Type | Examples | How it reaches action |
|---|---|---|---|
| Goal | `CognitiveGoalId` | `survive`, `wealth`, `explore`, `revenge` | `scoreGoals` -> `pickGoal` -> `planForGoal` |
| Plan | `PlanStub.steps: TaskKind[]` | HTN stub chains | Active step boosts via `goalTaskModifier` / stress floor |
| Action | `TaskKind` | `gatherFood`, `idle`, `fight` | Softmax over **authored catalog** only |

There is **no** TaskKind named `explore`; goal `explore` maps to live kinds (`idle`, `fish`, ...). Emotion bias for wander uses `idle` / `experiment`, not a dead kind.

### Nine soft factors (`FACTOR_IDS`)

0 besoins · 1 valeurs_plan · 2 emotions · 3 stress_habitude · 4 prefs_savoir · 5 social_tom · 6 politique · 7 metier_ambition · 8 lieu_memoire

### HARD residual (intentional short-circuit of evaluate->decide)

Eat-with-food · deep chest · empty-bag `tryAssignFoodSeek` · outdoor torch · freeze/homeless storm · threat fight|flee assign (choice soft-biased) · soft-AFK streak >=3 · post-chest eat · night/storm/cold/exhaust shelter for labor · night HARD rest for non-leisure outdoor labor.

Learning still runs on HARD via `noteChosenAction` + later `recordTaskOutcome` when the task ends — **CODE-ONLY** for completeness; soft whyFactors on survival HARD remain missing (**proven** gap in report section 7).

### Sections 24-27 user thresholds (coherence table) vs personality / memory / emotion causality

| # | User threshold (coherence) | Status vs brain | Causality note |
|---|---|---|---|
| **24 Counterfactuals** | ABSENT — no what-if / counterfactual policy | Still **ABSENT** | Emotions/goals do not simulate alternate outcomes beyond 1-step `estimateTaskOutcome` |
| **25 Relation graphs** | PRESENT ego-maps | **PRESENT** into decide | `v.relations` + ToM -> `socialTomFactor`; personality sociability/generosity/courage gate social/confront |
| **26 Network science** | PARTIAL — no centrality/PageRank | **PARTIAL** | Circles/gossip exist; gossip **legacy-only** weakens memory->social causality |
| **27 Pop dynamics** | PARTIAL ABM != SIR/LV | Out of soft brain spine | Births/ecology live; not driven by counterfactual or network metrics |

Personality / memory / emotion **do** multiply TaskKinds on the soft path; they **do not** meet section 24 (counterfactual causality) and only partially meet section 26 (network-mediated memory spread).

---

## PROBLEMS

1. **HARD survival still skips factor why** — eat/chest/torch/food-seek setTask without `whyFactors` / factor product (**proven** residual).
2. **Catalog authorship ceiling** — brain ranks `add(...)` options; cannot invent TaskKinds (**CODE-ONLY** architecture limit; report section 7.8).
3. **Dual memory authority** — mind epi/sem authoritative for spots; `v.memories` still written/read; **gossip()** reads only legacy (**proven** interconnect residual).
4. **Goals vs ambition vs livelihood** — sync exists but dual intent remains (**PARTIAL**, CODE-ONLY residual after Wave A5).
5. **Personality drift too weak for lived causality** — delta ~0.002/deep tick under extreme affect; traits mostly birth-static (**CODE-ONLY** vs user every-field-affects-decisions / life arcs).
6. **Section 24 Counterfactuals ABSENT** — no alternate-history / undo-policy layer; PE is 1-step heuristic (**proven** coherence + Wave B scope).
7. **Crisis omniscience** — empty-bag forage `findNearest` radii 48-100 exceed sense LOD (**CODE-ONLY**; noted in reports).
8. **Night HARD rest blanket** — non-leisure outdoor labor aborted by script, not softmax (**proven** residual risk).
9. **Deep LOD** — goals/personality/ToM/culture only on deep; fast agents decide with stale goals (**CODE-ONLY** + budget design).
10. **WebGPU label** — `backend` can say GPU in UI strings path but `batchSoftmaxSelect` always CPU (**CODE-ONLY** / honesty).
11. **Teach fire-rate** — wired; volume historically fragile (**proven** earlier; SECOND_AUDIT teachCraft starts high on emergence — mixed: wiring proven, fragility CODE-ONLY residual).
12. **Emotion->action under HARD** — mid-tick eat/flee assign ignores emotion factor product except fight/flee mult comparison (**CODE-ONLY**).

---

## ISOLATED_SYSTEMS

| Isolate | Severity | Notes |
|---|---|---|
| `gossip()` legacy-only memory | PARTIAL | Does not read mind episodic; import-cycle constraint (**proven** interconnect) |
| Counterfactual / SCM (sections 23-24) | ABSENT | Not built; chronicle arrow != SCM |
| Network centrality (section 26) | ABSENT as metric | Circles exist without graph algorithms |
| Unified `BrainState` | ABSENT | Villager body + mindPool + politics fragmented (**PARTIAL** master) |
| WebGPU softmax kernel | Garnish | Probe/label only; CPU path real |
| `careerDemandForProfession` | Dead export | Interconnect note; not brain cycle |
| Beliefs-as-Bayes | Marketing | Confidence scalars, not P(H|E) |

Not isolates (wired on soft path): GWT, emotionTaskBias live kinds, reinforceRecall local, knowledge->prefs, personality->social_tom, plan floor under stress.

---

## MISSING_CONNECTIONS

| From | To | Gap |
|---|---|---|
| HARD survival `setTask` | `fillFactorProduct` / whyFactors | No soft audit trail |
| Mind episodic (life events) | `gossip` tellable set | Gossip ignores mind store |
| Personality drift | Observable life arcs | Rates too small vs deep period |
| Goal `explore` | Rich TaskKind set | Maps mainly to `idle`/`fish` — thin vs explorer ambition |
| Counterfactual (section 24) | Decide / replan | Missing entirely |
| Relation graph (section 25) | Network metrics (section 26) | Ego edges not aggregated to influence/centrality for decide |
| Fast cognition | Goals / plan / ToM | Stale evaluate layer between deep ticks |
| Model PE | HARD assigns | Forecast often estimated late in `noteChosenAction` only |
| Legacy-only writers | Mind authority | Divergence if something writes `v.memories` without `onRemember` |

---

## DUPLICATES

| Dual | Authority (claimed) | Risk |
|---|---|---|
| `v.memories` <-> mind episodic/semantic | Mind-first (`knownSpots`, helpers) | Cap-12 legacy truncation; gossip dual |
| `v.ambition` <-> `mind.goal` | Bidirectional sync deep | Mid-commitment / revenge sticky races |
| `v.profession` <-> `mind.livelihood` | Profession -> livelihood overlay | Sacred roleTag may diverge |
| Survival urgency in factors <-> HARD must-fires | HARD wins on cliff | Same hunger signal scored twice on soft, then bypassed |
| `emotionTaskBias` x `socialTomFactor` affection | Both multiply socialise/giveFood | Intentional stack; can over-dampen under stress |
| Comfort rest damp in `needsFactor` x AFK streak HARD | Dual anti-nap | Soft then script |

---

## EVIDENCE (file:line)

### Cycle spine
- Soft path entry: `behaviors.ts:6077-6098` (`tickCognition` + `chooseTask` when idle).
- `perceiveLocal` every think: `tick.ts:357-359`.
- Fast vs deep split: `tick.ts:361-376` / `377-465`.
- Learn: `tick.ts:480-547` (`recordTaskOutcome`), `549-564` (`noteChosenAction`).
- Softmax decide: `decide.ts:632-709` (`pickTaskByPolicy`).
- Factor product: `decide.ts:166-203`, IDs `decide.ts:32-42`.

### goals != TaskKinds
- Goal IDs: `types.ts:297-310`.
- Plan maps goals->TaskKinds: `goals.ts:37-56`.
- Modifier table goal->TaskKind: `goals.ts:233-307` (`explore` -> `idle`/`fish`/...).
- Emotion live kinds (no `explore` TaskKind): `emotions.ts:212-216`.

### HARD bypasses
- `bagEmptyFoodCrisis`: `behaviors.ts:528-530`.
- `forceBiologicalRhythm`: `behaviors.ts:1517-1534`.
- `tryAssignSurvivalTask` HARD eat/chest/torch/freeze: `behaviors.ts:1963-2017`.
- Empty-bag before softmax: `behaviors.ts:3921-3926`.
- Soft-AFK HARD after 3: `behaviors.ts:532-533`, `3932-3961`.
- Threat HARD assign + soft mults: `behaviors.ts:5652-5691`.
- Night shelter HARD vs soft leisure: `behaviors.ts:6030-6073`.
- Post-chest eat HARD: `behaviors.ts:6160-6163`.

### Personality / memory / emotion causality
- Personality -> values: `needs.ts:19-27`.
- Personality -> T: `decide.ts:211-221`.
- Personality -> social_tom: `decide.ts:477-518`.
- Personality -> place memory: `decide.ts:547-559`.
- Emotion -> TaskKinds: `emotions.ts:192-221`.
- Drift rates: `tick.ts:117-133` (`0.002` / `0.0025`).
- Localized `reinforceRecall`: `memory.ts:110-116`, used `decide.ts:553-559`.
- Dual ingest bridge: `tick.ts:95-108` (`onRemember`).
- Gossip legacy-only: `social.ts:292-329`.
- Sense LOD vs crisis leak: `sensing.ts:14-16` vs `behaviors.ts:626-654`, `2405`.

### Sections 24-27
- Coherence table: `BRAIN_COHERENCE_REPORT.md:105-108` (24 ABSENT ... 27 PARTIAL).
- Wave B 1-step only (not counterfactual): `decide.ts:657-688`, `BRAIN_COHERENCE_REPORT.md:204-213`.

### Proven vs CODE-ONLY markers
- Soft loop CLOSED / HARD list: **proven** — `BRAIN_CYCLE_REPORT.md:183-223`, `SECOND_AUDIT_BRAIN.md`.
- Personality in social_tom / localized recall / emotions->live kinds: **proven** — report section 6 + Second pass verification table.
- Drift too slow / section 24 still absent / gossip dual: **CODE-ONLY** this pass (static) + prior PARTIAL interconnect notes.

---

## PROPOSED_FIXES (proposals only)

1. **HARD survival whyFactors** — When assigning eat/chest/torch/food-seek, call `scoreWithFactors` (or a survival-factor stub) and pass `whyFactors` into `noteChosenAction` so UI/audit match soft path.
2. **Mind-safe gossip** — Feed tellable from `forEachLifeEvent` / episodic (or thin mirror) without import cycle (extract memory-read helper to `cognition/memory` or `socialMemory.ts`).
3. **Personality plasticity band** — Raise deep-tick drift under sustained high affect, or accumulate trait stress so courage/sociability move on multi-day arcs without birth re-roll.
4. **Section 24 lite (optional)** — One counterfactual compare: if flee instead of fight using existing `estimateTaskOutcome` on the non-chosen threat option; store as PE/thought — still not SCM.
5. **Crisis sense budget** — Cap empty-bag `findNearest` to `SHORT_SEARCH_R` + memory seek before global 80-100, or tag as documented omniscience exception.
6. **Night labor** — Offer soft factor boost for `rest`/`tendHearth` at night and demote HARD abort to freezeRisk/storm only (gameplay call).
7. **Fast-path goal freshness** — On fast ticks under high hunger/stress, run cheap `scoreGoals` top-1 commit clamp (already partial at `tick.ts:363-368`); extend to safety.
8. **Explore goal richness** — Widen `planForGoal('explore')` / modifier table to trade/mine/tame without inventing TaskKinds.
9. **Honesty** — Force `backend: 'cpu'` in player-facing strings until a real kernel exists.
10. **Do not** add Bayes/MCTS/SIR vanity silos (sections 24-27 user math) unless they feed decide.

---

## FILES_TO_MODIFY

| Priority | File | Why |
|---|---|---|
| P0 | `src/lib/sim/behaviors.ts` | HARD whyFactors; optional night soft; crisis search radii |
| P0 | `src/lib/sim/social.ts` (+ maybe `cognition/memory.ts`) | Gossip mind-safe |
| P1 | `src/lib/sim/cognition/tick.ts` | Personality drift rates; fast goal refresh |
| P1 | `src/lib/sim/cognition/decide.ts` | Optional counterfactual lite / threat compare reuse |
| P1 | `src/lib/sim/cognition/goals.ts` | Richer explore/migrate plan <-> TaskKind maps |
| P2 | `src/lib/sim/kernels/brainGpu.ts` / UI consumers | CPU honesty |
| Docs only | `BRAIN_CYCLE_REPORT.md` | Refresh after any wiring (orchestrator) |

No code changes in this analysis pass.

---

## DEPENDENCIES

| Depends on | For |
|---|---|
| `mindPool` / `mindOf` | All cognition reads/writes |
| `behaviors.chooseTask` catalog | Softmax has nothing to pick without `add` |
| `inventory` / hunger / climate | HARD gates + needs |
| `politics` / `ethnos` / `technology` | Factors 6/4/5 extras |
| `ecology.villagerFeelsFamine` | Perceive + leisure block |
| Interconnect memory helpers | Politics/religion/bandits already mind-first; gossip still blocked |
| Cognition budget / alive count | Deep think fairness |
| Agent orchestrator | Avoid parallel edits to `behaviors.ts` / `decide.ts` with farm/econ agents |

---

## POSSIBLE_CONFLICTS

| Conflict | With whom / what | Risk |
|---|---|---|
| Softening night HARD rest | Survival / freeze gameplay; Agent farm harvest night | Starvation or cold deaths if too soft |
| Raising personality drift | Genetic inheritance / ethnos stability | Trait noise vs lineage identity |
| Gossip mind-safe | Import cycle `social` <-> `mindPool` | Build break if careless |
| Cap crisis `findNearest` | Empty-bag mortality | Deaths if search too blind |
| whyFactors on HARD | Mid-tick performance | Extra scoring cost x agents |
| Parallel Agent edits | Same files (`behaviors.ts`, `memory.ts`) | Merge thrash — orchestrator serialize |
| Counterfactual lite (section 24) | Wave B no MCTS/Bayes vanity rule | Scope creep if overbuilt |
| Dual ambition<->goal sync changes | Career / livelihood interconnect track | Title/profession desync |

---

## Verdict (analysis)

**Soft cycle PERCEIVE->LEARN is CONNECTED (hybrid)** — **proven**.
**goals != TaskKinds** — intentional HTN stub bridge — **CODE-ONLY confirmed in types/goals**.
**HARD bypasses** — documented, intentional, still skip evaluate->decide why — **proven**.
**Personality / memory / emotion** — causally multiply live TaskKinds on soft path (**proven** wiring); gaps vs user sections 24-27 are **counterfactuals ABSENT**, **network-mediated memory PARTIAL (gossip)**, and **trait plasticity too weak** (**CODE-ONLY** severity for drift).
