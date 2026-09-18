# EMERGENCE_NOTE

**Workspace:** village_edit
**Date:** 2026-09-16
**Rule:** PROGRAM MECHANISMS only — no CREATE_X, no food cheats. Survival hard floors kept.

## Multi-seed short compare (seeds 1, 3, 7 x 40d)

| Seed | Pop | Villages | Creeds (labels) | Teach starts | Guilds | Faith circles | Top ambitions |
|------|-----|----------|-----------------|--------------|--------|---------------|---------------|
| 1 | 35 | 4 | changement, tradition, commerce_libre, partage | 49 | 0 | 6 | explorer, wealth, builder |
| 3 | 26 | 5 | commerce_libre only | 30 | 1 | 6 | leader, wealth, builder |
| 7 | 33 | 4 | changement, commerce_libre | 6 | 3 | 4 | wealth, explorer, survive |

**Divergence metrics**
- creedJaccardMean ~ **0.42** (not monoculture across seeds)
- **4** unique creed labels across seeds — **not** locked to piete
- Village counts **4-5** (anyMultiVillage: true)
- Teach starts range **6-49** (anyTeach: true)
- Guilds appear on seeds 3 and 7
- Verdict: **SEEDS_DIVERGE**

## What enables emergence now

1. **Safe softmax temperature** (decide.ts) — when fed/calm, T rises slightly so uncommon tasks can win; hunger/fear still pull toward greedy survival (hard floors untouched).
2. **Teach / imitation** (livelihood.ts, interactions.ts) — teach urge no longer dies under mild hunger; socialise drips craft skills + knowledge bits.
3. **Creed diversification** (religion.ts, politics.ts) — lower piety crystallise threshold; competitive axes; second-place breaks piete lock; non-piete creeds spread at least as easily.
4. **Faith schism** (religion.ts) — minority creed (>=2) can peel off a new faith circle under grievance/low cohesion.
5. **Migration to second camps** (politics.ts, behaviors.ts) — slightly lower leave thresholds; slower urge decay; migrant house-build uses small join radius (~24-58) instead of ~70-140 so new villages can form.
6. **Circle to guild** — existing early path (2 practitioners) left intact; observed guild logs on seeds 3/7.
7. **Profession / ambition from practice** (livelihood.ts, cognition/tick.ts) — strong activity mix can retitle profession; ambition drifts from craft/teach/trade/migrate (not birth-only).
8. **Outlaw redemption** (bandits.ts) — rare return from maquis to civilian wanderer (high-variance, not scripted amnesty).

## What still blocks / limits emergence

1. **Survival hard assigns** still dominate under empty-bag / starve / freeze — softmax exploration only when not in crisis (by design).
2. **Profession still skews lumberjack** early (wood urgency) — drift helps later but first weeks look similar across seeds.
3. **Schism log = 0** at 40d — mechanism exists but needs longer runs / denser multi-creed faith circles to fire often.
4. **Ritual starts rare** (0-1) — sacred sites / surplus gates still tight.
5. **Outlaw redemption untested** in 40d window (bandits start ~day 40).
6. **Institution thresholds** (age/problems) still rate-limit circle to guild to polity; soft, but slow.
7. **No full counterfactual brain** — catalogued add() options in behaviors.ts still bound the possibility space (softmax rearranges, does not invent acts).

## Causal patches (files)

- src/lib/sim/cognition/decide.ts — safe exploration temperature
- src/lib/sim/livelihood.ts — teach fire-rate; profession experience drift
- src/lib/sim/religion.ts — creed crystallise diversity + schism
- src/lib/sim/politics.ts — creed axes, spread bias, migration leave/decay
- src/lib/sim/behaviors.ts — migrant join radius for new camps
- src/lib/sim/interactions.ts — craft imitation on socialise
- src/lib/sim/cognition/tick.ts — ambition drift from practice
- src/lib/sim/bandits.ts — rare outlaw to civilian conversion
- scripts/_probe_emergence_seeds.ts — multi-seed divergence probe

## Bottom line

Seeds **do diverge more**: multi-village, multi-creed (non-piete), teach fires, guilds on some seeds, ambition mixes differ. Emergence is **possible** via mechanisms; not forced by CREATE_X. Longer runs (>=90d) still needed for schism / outlaw redeem / polity tiers to show regularly.
