# PHASE5_PAUSE - checkpoint reprise

**Date pause :** 2026-09-17 (updated after STEP6–7)
**Workspace :** `village_edit`
**Motif :** STEP6 soak + STEP7 validation livres ; GLOBAL NON DECLARE
**Sim code :** aucun changement dans ce fichier

---

## Statut actuel

| Item | Etat |
|------|------|
| STEP1-2 (plan) | **DONE** |
| DP1-12 | **DONE CODE** (DP6 DESIGN_DOCUMENTED) |
| STEP6 soak 100x60x3 vs CP5 | **DONE** |
| STEP7 `PHASE5_CAUSALITY_VALIDATION.md` | **DONE** |
| GLOBAL PASS | **NON DECLARE** - ne pas chase |
| Clamp social 120 (P13) | **INCHANGE** / SKIP - ne pas relever |

### Soak STEP6 (resume)

- decisionExact=**665091** ; PASS_RATE=**5 %** (1/20 = §28) ; §33 **PARTIAL** (leaves 16<20 ; regression vs CP5)
- CF : mem1731 / emo5432 / pers2181 ; teachTrue=223 ; profMF share=1.0
- help cats=6 (defend+labor) ; creedGen2=46 ; foundCamps=3 ; missionFloorsMet=false
- Preuves : `_phase5_soak_s{1,3,7}.json`, `_phase5_soak_summary.json`, `_phase5_soak_run.txt`

---

## Reprendre (ordre seriel)

1. Lire `PHASE5_CAUSALITY_VALIDATION.md` + dumps soak.
2. Priorite : migration_camp npc UNDER + leaves volume (§33) — mesure/fix **sans** raise clamp / induce.
3. **Ne pas** chase GLOBAL PASS ; **ne pas** relever le clamp.

---

## Fichiers cles

| Fichier | Role |
|---------|------|
| `PHASE5_CAUSALITY_VALIDATION.md` | Rapport STEP6–7 vs CP5 |
| `PHASE5_CAUSALITY_MASTER.md` | Regles, scoreboard, DP1-DP12 |
| `PHASE5_NOTE.md` | Status (source de verite reprise) |
| `scripts/_probe_phase5_causality_soak.ts` | Soak Phase5 |
| `src/lib/sim/sec22Evidence.ts` | DP12 per-priority CHAIN + floors |
