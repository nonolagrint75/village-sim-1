# SECOND AUDIT — BRAIN CYCLE

## Verdict
**CONNECTED (hybride)** — soft loop **CLOSED**; HARD survival **intentional**.

## Method
- Primary: `BRAIN_CYCLE_REPORT.md` (audit + Second pass), re-encoded UTF-8 this follow-up
- Code claims verified in report against `behaviors.ts` / `cognition/*`
- Do not re-paste full report — link it

## Executive summary
Soft path `perceive → memory → feel → evaluate → decide → act → learn` is closed via `tickCognition` + `pickTaskByPolicy` + `recordTaskOutcome`. Nine decision factors feed softmax. HARD must-fires (eat, empty-bag, freeze, torch, threat fight|flee, AFK streak, post-chest eat) skip evaluate→decide by design; learning still via `noteChosenAction` / `recordTaskOutcome`. Second pass: `perceiveLocal` on fast+deep; idle cooldown forces rethink; calm night leisure soft.

## Cycle step audit

| Step | Wired? | Bypass? | Interconnects with | Evidence |
|------|--------|---------|-------------------|----------|
| Perception | LIVE | crisis global find | ENV, grid | Report §2 PERCEIVE; 2nd pass fast+deep |
| Attention / GWT | LIVE | deep stream | workspace | Report §2 Consciousness |
| Memory (epi/sem/proc) | LIVE | dual `v.memories` | legacy mirror | Report §2 REMEMBER |
| Emotion + needs | LIVE | — | famine feel, decide | Report §2 FEEL |
| Prediction / PE | PARTIAL | lite 1-step | needs remap | Wave B verified |
| Goals + PlanStub | LIVE | ambition mirror | métier | plan floor under stress |
| Decision (softmax) | LIVE | HARD before/after | politics bias | 9 factors |
| Hard overrides | BYPASS intentional | — | survival | Report §4 + 2nd pass list |
| Action / executeTask | LIVE | mid-tick | economy, build | Report §2 ACT |
| Experience / RPE | LIVE | — | learn | `recordTaskOutcome` |
| Learning / habits | LIVE | teach fire-rate | teach | Report §2 LEARN |

## Dual authority recheck
| Dual | Status | Evidence |
|------|--------|----------|
| `v.memories` vs mind | PARTIAL (mind-first) | Report §7 |
| ambition vs goals | PARTIAL (mirror) | Report §2 EVALUATE |
| profession / livelihood | PASS after interconnect sync | applyProfessionChange + prior SECOND_AUDIT_REPORT |

## Orphan recheck
| Symbol | Prior | Second | Evidence |
|--------|-------|--------|----------|
| `cognitiveTaskModifier` | orphan risk | WIRED | fight/flee + lastFactorWhy |
| `reinforceRecall` | weak | WIRED local | near x/y/r |
| explore bias | dead | WIRED | idle/experiment |

## Omniscience leaks
Residual crisis `findNearest` large radius — noted in report, not closed this pass.

## Wave status (honest)
- Wave A (wire/orphans/authority): **CLOSED**
- Wave B (world model lite): **CLOSED** (1-step)
- Vanity maths (defer): N/A

## Logs utilisateur
Pas de Vite/app live au moment du merge (derniers terminaux = probes node/tsx). Evidence cerveau = relecture code + `BRAIN_CYCLE_REPORT.md` Second pass.