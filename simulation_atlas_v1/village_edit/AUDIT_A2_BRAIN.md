# AUDIT A2 - Human brain / AI decision path

**Agent:** A2 (TOTAL AUDIT)  
**Workspace:** `village_edit`  
**Date:** 2026-09-16  
**Scripts:** `scripts/probe-afk.ts`, `scripts/diagnose-survival.ts`  
**Scope:** `chooseTask` / `pickTaskByPolicy` / cognition (perception, needs, goals, memory, emotions, AFK, script overrides)

---

## Verdict

Decisions are **hybrid**: a real state x environment factor matrix + Boltzmann pick (`cognition/decide.ts`), wrapped by **HARD biological must-fires** and mid-tick interrupts in `behaviors.ts`. Soft cognition is not garnish on the scored path — but it is **bypassed** whenever survival/shelter scripts `setTask` directly.

**Critical AFK finding (fixed causally):** daytime shelter logic treated mild ambient cold (`cold > 0.4`) as must-rest and aborted outdoor labor. That is a script override, not need-driven policy. Tightened to real exposure (`coldDanger` / `freezeRisk` + clothing deficit). Comfort-nap scoring also gated on fatigue/env.

**Re-verify:** fresh (non-tired) daytime rest ~ **0.4%** (seed 7) / **0.1%** (seed 42). Remaining day rest is almost all **stamina recovery** (tired), not idle AFK.

---

## Architecture map (real vs garnish)

| Layer | Status | Role |
|---|---|---|
| Perception `senseResource` / `perceiveLocal` | **REAL** | Local then memory spots then short blind search; reinforces episodic on recall |
| Needs `updateNeeds` then `needsFactor` | **REAL** | Drives food/rest/light/social utilities every think |
| Goals `scoreGoals` / `goalTaskModifier` | **REAL (soft)** | Multipliers on kinds; plan stubs, not HTN search |
| Emotions `emotionTaskBias` + T(stress,fear) | **REAL** | Biases fight/flee/social/rest; raises softmax temperature |
| Memory place/spot bias / `reinforceRecall` | **REAL (thin)** | Danger/good spots + reach; dual with legacy `v.memories` |
| Softmax `pickTaskByPolicy` (9 factors) | **REAL** | Main soft authority when no HARD assign |
| Imagination 1-step top-3 | **REAL (lite)** | Rescores utilities; not MCTS |
| WebGPU `brainGpu` | **GARNISH label** | Always CPU; backend tag must not claim GPU |
| GWT / workspace / consciousness | **REAL soft** | Biases via workspace/conscious access |
| HARD must-fires (eat / empty-bag / freeze / torch) | **SCRIPT bypass** | Correct for death cliffs; skips factor why |
| Soft-AFK streak then food/harvest / re-pick | **SCRIPT safety net** | Band-aid if softmax loops idle/rest |
| Mid-tick `wantShelter` / cold interrupt | **SCRIPT** (now tighter) | Can still override active work |

---

## Decision path (what actually runs)

```
tickVillager
  mid-tick interrupts (eat, chest, empty-bag, ripe harvest, cold, wantShelter)
  if !task:
    forceBiologicalRhythm  -> HARD survival / homeless freeze
    else tickCognition + chooseTask
          catalog options (env scores + memoryBias)
          bagEmptyFoodCrisis -> tryAssignFoodSeek (HARD)
          pickTaskByPolicy (factors x softmax)
          soft-AFK streak >= 3 -> crisis hard OR daytime re-pick without idle/rest
  executeTask
```

Cognition tick (fast): needs, emotion decay, working memory, PE, consciousness flags.  
Deep: perception, goals, memory decay, ToM, livelihood sync.

---

## Probe evidence

### probe-afk (5 days)

| Seed | Day rest | Day idle | Day work | Night rest |
|---|---|---|---|---|
| 7 (baseline pre-fix) | 25.8% | 3.4% | 64.5% | 93.4% |
| 7 (after causal shelter/nap gates) | 27.8% | 3.7% | 60.8% | 93.7% |
| 42 (after fix) | 5.5-5.8% | 0% | ~89% | 95.6% |

Seed 7 day rest stays high because of labor then fatigue then nap (heavy `buildProject`), not comfort AFK:

| Seed | Day rest while tired | Day rest while fresh (AFK) | Idle |
|---|---|---|---|
| 7 | **27.4%** | **0.4%** | 3.7% |
| 42 | 9.5% | 0.1% | 0.0% |

### diagnose-survival (seed 42, 90 days)

- Alive 27 then 10 by day 90 (10 deaths); edible stocks remain -> not pure "no food in world".
- `storeChest` / `bakeBread` / `grindFlour` / mining / many crafts **UNUSED**.
- `takeFromChest` ~ 1 start / 90d — pantry loop weak (store never fires).
- Top starts: `rest`, `teachCraft`, `gatherFood`, `socialise` — leisure/teach thrash under surplus is a separate causal gap (not fixed this pass).

---

## Causal gaps / blocked behaviors

1. **Authority split** — HARD `setTask` paths leave no factor why; UI cognition under-explains survival acts.
2. **Pantry causality broken** — no `storeChest` usage -> chests empty -> `takeFromChest` never learns; deaths lean on bag forage + other mortality.
3. **TeachCraft thrash** — diagnose shows huge start count; survival gates exist but fire rate still high when fed.
4. **Dual memory** — mind episodic/semantic + legacy `v.memories`; mostly bridged, still dual.
5. **Omniscience leaks** — crisis `findNearest` radii (food seek) can exceed normal sense LOD.
6. **Soft-AFK net remains** — still a script after 3 idle/rest picks; needed less after nap gates but kept for crisis.

---

## Fix applied this audit (causal, not food cheat)

**Files:** `src/lib/sim/behaviors.ts`, `src/lib/sim/cognition/decide.ts`

1. **wantShelter** — drop mild `coldNow > 0.4` labor abort; require `coldDanger` (outdoor cold + clo deficit). Hard labor alone no longer satisfies daytime shelter if.
2. **tryAssignSurvivalTask freeze** — HARD home rest only on `freezeRisk` (cold + deficit / night / exhausted), not bare `coldStress01 > 0.5`.
3. **Daytime rest catalog** — no comfort nap when not tired unless real env pressure; stronger dampers.
4. **needsFactor(rest)** — low fatigue/warmth/shelter -> strong damp (state-driven).
5. **Soft-AFK** — daytime not-tired: re-softmax excluding idle/rest (no free food).
6. **Wake / commute** — indoor day wake even in cool air; walk-home rest aborts unless real exposure.

---

## Checklist (requested)

| Question | Answer |
|---|---|
| State+env driven vs pure scripts? | **Mostly state+env via factors**; scripts on survival/shelter edges |
| Perception wired? | **Yes** — sensing + deep perceiveLocal |
| Needs affect action? | **Yes** — factor 0 + gates |
| Goals affect action? | **Yes** — soft multipliers |
| Memory used in choice? | **Yes** — place/spot bias + sense recall |
| Emotions affect action? | **Yes** — bias + temperature; not cosmetic |
| Blocked AFK? | **Fresh day AFK ~0%;** tired day rest remains (stamina economy) |
| Script overrides? | **Yes** — HARD must-fires + mid-tick; tightened cold/shelter |

---

## Follow-ups (not in this fix)

- Wire **storeChest** so pantry / takeFromChest become causal.
- Investigate **teachCraft** start storm under surplus.
- Seed-7 stamina economy vs buildProject duration (legit fatigue vs over-costly labor).
- Honesty: never claim WebGPU softmax until a real kernel ships.