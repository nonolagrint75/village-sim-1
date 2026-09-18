# WAVE_A_STATUS

**PM :** Agent 6  
**Date :** 2026-09-15  
**Worktree :** `village_edit`  
**Réf. :** `BRAIN_COHERENCE_REPORT.md` §6–8 · `AGENT7_SIM_REPORT.md`

## Verdict PM (post Agent 7)

**PASS** — Wave A **CLOSED**.  
**Wave B = COMPLETE** (voir `WAVE_B_STATUS.md`).

### HOTFIX bandits — COMPLETE

- Camp no longer TPs into village (`endRaidToCamp` was recentering camp on raiders)
- Prefer villager→outlaw conversion ; wilderness spawn rare + far
- Raids smaller / steal-focused ; probe seed7 **PASS**
- Source : `BANDIT_FIX_NOTE.md`

Aucun autre hotfix Wave A requis (Agent 7 PASS inchangé).

### Chiffres clés (medium diagnose 40j)

| Metric | Seed 1 | Seed 7 |
|---|---|---|
| Deaths | **0** | **0** |
| Alive final | 27 | 32 |
| harvestWheat starts | 11 | 342 |
| teachCraft starts | 100 | 317 |
| teachCount (log) | 8 | 18 |
| whyRate (softmax whyFactors) | **1.0** | **1.0** |
| Famine | false | false |

Source : `AGENT7_SIM_REPORT.md` — diagnose-survival + tech + whyFactors samples.

### Observations non-bloquantes (pas hotfix A)

- flour/bread unused d40 · storeChest quiet · seed-1 harvest plus faible que seed-7 · lightTorch peu vu

## Wave A Done (A1–A9)

| Item | Preuve |
|---|---|
| **A1–A2, A6–A9** | Orphelins, teach, schema |
| **A3** | survival/harvest factors ; hard biologie résiduelle documentée |
| **A4** | mind-first memory |
| **A5** | ambition↔goal / profession↔livelihood sync |

## Agent 7

| Mode | Verdict |
|---|---|
| Medium diagnose seeds 1/7 | **PASS** |
| Wave B | **COMPLETE** (B1–B3) — voir `WAVE_B_STATUS.md` |
| Full 90j civ | Optionnel / parallèle soak |

## PM sign-off

Wave A + Wave B + hotfix bandits **CLOSED**. Pas de nouvelle priorité ouverte ici.
