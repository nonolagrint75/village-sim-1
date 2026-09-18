# Decision Audit — Agent A (Cognition / Decisions)

**Workspace:** `village_edit` (nono_simu_2d)  
**Date:** 2026-09-18  
**Scope:** cognition pipeline only; behaviors/economy/build READ-ONLY  
**Constraint:** no commit / no merge / no 3d / Bevy / Rust

---

## 1. STATUS

**Verdict:** NPCs converge because **catalogue `baseScore` in `behaviors.chooseTask` dominates** the factor product in `pickTaskByPolicy`. Cognition is rich (9 named factors, goals, ToM, habits, PE) but most identity channels are **±20–70% multipliers** fighting **shared situational bases of tens–hundreds**. Softmax + modest T cannot diversify when one kind’s base is 5–20× another.

**Cognition-local mitigations shipped this pass:** identity stretch when survival-stable, wider pref/skill bands, slightly higher safe T, stronger anti-loop damp, optional decision tracer (off by default). **Root fix still needs behaviors catalogue rebalance** (orchestrator / Agent D).

---

## 2. Decision path (real file:function)

```
WORLD
  engine tick → behaviors (updateVillagers / idle rethink)
    ↓
PERCEPTION
  cognition/tick.ts:perceiveLocal
  cognition/sensing.ts:senseResource (+ knownSpots)
  cognition/tick.ts:fillWorking → workspace.ts:competeForWorkspace
  cognition/consciousness.ts:updateConsciousness
    ↓
NEEDS
  cognition/needs.ts:updateNeeds
  cognition/tick.ts → predictive.ts:computePredictionErrors
    ↓
GOALS / OPPORTUNITIES (intention, not menu)
  cognition/goals.ts:scoreGoals → pickGoal → planForGoal
  (deep only mostly; crisis light refresh on fast)
    ↓
TASKS (option catalogue — OUTSIDE cognition)
  behaviors.ts:chooseTask → add(...) → Option{baseScore}
  HARD preempt: tryAssignFoodSeek / eat / torch / flee (setTask)
    ↓
SCORES (factor matrix)
  behaviors maps jobBonus / ambitionBonus → policyOpts
  cognition/decide.ts:pickTaskByPolicy
    fillFactorProduct × N  (FACTOR_IDS ×9)
    ablation CFs (measure)
    predictive.ts:estimateTaskOutcome (top-3)
    softmaxPick / decisionTemperature
    ↓
PERSONALITY / RELATIONS / SKILLS (inside factors)
  socialTomFactor, prefsSkillFactor, placeMemoryFactor,
  emotionTaskBias, goalTaskModifier, habitAntiLoopDamp
    ↓
DECISION
  setTask + tick.ts:noteChosenAction → ledger / attribution
  executeTask (behaviors) → recordTaskOutcome
```

| Stage | Primary symbols |
|-------|-----------------|
| Think gate | `behaviors` → `shouldDeepThink` / `tickCognition` |
| Needs | `updateNeeds` |
| Goals | `scoreGoals`, `pickGoal`, `goalTaskModifier` |
| Catalogue | `chooseTask`, `add`, `jobBonus`, `ambitionBonus` |
| Policy | `pickTaskByPolicy`, `fillFactorProduct`, `softmaxPick` |
| Enact | `setTask`, `noteChosenAction`, `recordTaskOutcome` |

---

## 3. Dominant decisions / bottlenecks

### Logs utilisateur

| Source | Finding |
|--------|---------|
| Terminal `444320` Lot3D probe seed=7 | Chains heavily `*→rest`, then `rest→flee`; at t5000 pop drops; at t10000 **alive=0**. Task switches high; build collab stalls (`npcsOnBuildTasks:0`, `homesCompleted:0`). |
| Terminal `444311` Electron on Atlas | Running elsewhere — **no Chronique/state.log** in this worktree for this audit. |
| Live Vite in `_wt_rhythm` | Recent launches **failed** (ports); no usable console decision dump. |
| Prior Phase5 soak (`ANALYSIS_PHASE6`) | 665k soft decisions; mem/emo/pers CF flips exist — channels **wired** but many are passenger vs base. |
| Verdict logs | Convergence evidenced by **probe chains → rest** + code magnitude analysis; no contradiction requiring different root cause. |

### Measured / strongly evidenced from code

1. **`baseScore` magnitude >> factor deltas**  
   Harvest / rest / forage `add()` often score **40–400+**; factor mults typically **0.5–3** each; product rarely flips a 10× base gap.

2. **Shared world → shared menu**  
   Same night / famine / ripe-field / priceUrge / granaryPush hit all NPCs → same high-base kinds (`rest`, `harvestWheat`, `gatherFood`).

3. **Survival / harvest urgency in decide** (`survivalUrgency`, `harvestUrgency`) further amplifies food/harvest and damps leisure — correct for crisis, **homogenizing when mild**.

4. **HARD paths bypass softmax**  
   Empty-bag crisis, eat-with-food, outdoor freeze, threat fight/flee — identical scripts across agents.

5. **Profession × goal (factor 7)** is causal when options exist (`jobBonus` up to ~2.6) but **catalogue must propose** craft/mine/trade first; early game menus are survival-heavy.

6. **Softmax T** defaults ~0.5–1.0; crisis lowers T → near-greedy → more convergence.

---

## 4. Decorative vs causal variables

| Variable | Role | Verdict |
|----------|------|---------|
| **Needs (hunger/fatigue/shelter/light)** | Factor 0 + HARD gates | **Causal (dominant)** |
| **Catalogue baseScore** (season, reach, prices, field ripe) | Pre-factor | **Causal (dominant)** — lives in behaviors |
| **jobBonus / profession** | Factor 7 | **Causal** when matching options on menu (~1–2.6) |
| **mind.goal / ambitionBonus** | Factor 7 + `goalTaskModifier` | **Causal soft** — sticky commitment; survive/rest often win scoring |
| **Labor preferences** | Factor 4 (`preferenceTaskBias`) | **Weak→moderate causal** (was ~0.72–1.55; widened this pass) |
| **Skills** | Factor 4 (`skillBonus`) + execution speed/yield | **Decision: weak–moderate**; **execution: causal** |
| **Personality (courage/curiosity/sociability/…)** | T, socialTom priors, place pull, needs tint | **Partial causal** — CF flips exist (Phase5); often drowned by base |
| **Emotions** | Factor 2 | **Partial causal** — largest CF volume; many passenger tags |
| **Relations / kinship / ToM** | Factor 5 + catalogue kinship in `add()` | **Split-brain**: help bases often **in behaviors**; decide ablation under-measures |
| **Wealth / coins** | `needs.status`, trade/build motives | **Weak for task pick**; stronger for status need / ambition drift |
| **Consciousness / GWT / selfModel** | accessBias, goal bias, UI | **Lite causal** on needsFactor; mostly narrative unless broadcast aligns |
| **Culture / religion / war stubs** | prefs / place / social | **Weak / situational** |
| **v.ambition label** | Mirror of goal (WP3) | **Decorative for scoring** (SoT = `mind.goal`) |

---

## 5. Convergence causes (ranked)

1. **Homogeneous high `baseScore`** for survival/rest/harvest across agents.  
2. **Factor product cannot overturn** large base gaps (math bottleneck).  
3. **Shared environmental triggers** (night, famine feel, ripe fields, prices).  
4. **HARD survival / combat scripts** identical.  
5. **Habit + S1** reinforce whatever won first under stress.  
6. **Deep think LOD** → many agents stay on stale goals / thin secondary motives.  
7. **Identity factors previously too narrow** (prefs/skills/T) — mitigated locally this pass.

---

## 6. Minimal fix proposals

### Implemented (cognition-local, this agent)

| Fix | File:function | Effect |
|-----|---------------|--------|
| Identity stretch when stable | `decide.ts:fillFactorProduct` / `identityStable` | Amplify factors 1,4,7 away from 1 when fed/calm |
| Wider pref band | `labor.ts:preferenceTaskBias` | ~0.62–1.72 |
| Wider skill band | `memory.ts:skillBonus` | ~0.74–1.59 |
| Higher safe T | `decide.ts:decisionTemperature` | More softmax diversity when safe |
| Stronger anti-loop | `decide.ts:habitAntiLoopDamp` | Damp idle/social/teach loops |
| Optional tracer | `decisionTrace.ts` + hook in `pickTaskByPolicy` | Off by default |

### Propose only (behaviors / economy — DO NOT EDIT here)

| ID | Proposal | File:function |
|----|----------|---------------|
| B1 | Normalize catalogue: `baseScore = situational * identityPrior` with identity prior from prefs/skills **before** policy, or log-compress bases (`log1p(base)`) | `behaviors.ts:chooseTask` `add` / policyOpts map |
| B2 | Cap rest/harvest base relative to craft/build when `identityStable` equivalent (stamina ok, hunger high) | `behaviors.ts` rest/harvest `add` sites |
| B3 | Inject profession-skewed option slots even when survival mild (ensure craft/mine on menu) | `chooseTask` |
| E1 | Wealth → tradeRun/buyMaterial base via economy motives | economy + behaviors bridge |
| D1 | Wire `setDecisionTraceEnabled` from debug UI / probe | UI or Agent E probe |

---

## 7. FILES MODIFIED / ADDED / NOT TOUCHED

**Modified**
- `src/lib/sim/cognition/decide.ts`
- `src/lib/sim/cognition/labor.ts`
- `src/lib/sim/cognition/memory.ts`
- `src/lib/sim/cognition/index.ts`

**Added**
- `src/lib/sim/cognition/decisionTrace.ts`
- `decision_audit.md` (this file)

**Not touched**
- `behaviors.ts`, `types.ts`, `engine.ts`, `economy/**`, `build/**`, anything under `nono_simu_3d`

---

## 8. INTERFACES CHANGED

**Additive exports only** (from `cognition/index.ts`):

- `setDecisionTraceEnabled(on: boolean)`
- `isDecisionTraceEnabled()`
- `noteDecisionTrace(sample)`
- `drainDecisionTrace()` / `peekDecisionTrace()` / `clearDecisionTrace()`
- `summarizeDecisionTrace(samples?)`
- type `DecisionTraceSample`

No breaking changes to `pickTaskByPolicy` / `SoftmaxPick` shape.

**Internal:** `fillFactorProduct` stretches factors 1/4/7 when `identityStable`; pref/skill numeric ranges widened.

---

## 9. TESTS

- Full-project `tsc` currently fails on unrelated UTF-16 `build/homeBuildPipeline.ts` (out of scope).
- Isolated smoke (tsx): `decisionTrace` toggle off→on→off OK; `preferenceTaskBias` woodwork@1 ≈ **1.72**; farm@0.35 ≈ **1.00**; `skillBonus` chop@0.8 ≈ **1.42**.
- `decide.ts` / `decisionTrace.ts` compile under project tsconfig aside from pre-existing build binary errors.

## 10. KNOWN LIMITATIONS

- Cognition cannot fix catalogue omission (no craft option → no craft pick).  
- HARD paths still bypass factor diversity.  
- Identity stretch only when needs/emotions stable — crisis remains homogenized (intentional).  
- Relation/help causality still split with behaviors `add()` kinship.  
- Tracer does not record HARD `setTask` unless behaviors later call it.  
- No live Chronique log in this session for NPC-level whyFactors.

---

## 11. EXPECTED INTEGRATION POINTS (orchestrator)

1. **Agent D / behaviors:** B1–B3 catalogue rebalance — highest leverage.  
2. **Agent E / probes:** enable tracer in headless soak; report `summarizeDecisionTrace().byKind` entropy vs baseline.  
3. **Agent C / economy:** wealth/motive → baseScore bridges (E1).  
4. **UI:** debug toggle → `setDecisionTraceEnabled(true)`.  
5. **Do not** merge cognition stretch with economy cheats; keep survival floors intact.  
6. Re-run Lot3D / civ audit after B1 to confirm fewer `*→rest` chains when fed.

---

## Appendix — Factor IDs (`decide.ts`)

0 `besoins` · 1 `valeurs_plan` · 2 `emotions` · 3 `stress_habitude` · 4 `prefs_savoir` · 5 `social_tom` · 6 `politique` · 7 `metier_ambition` · 8 `lieu_memoire`

Utility: `U = baseScore × Π mult_k` then softmax at `decisionTemperature`.