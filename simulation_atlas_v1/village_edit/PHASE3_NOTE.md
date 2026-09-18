# PHASE 3 — Note de transition (master)

**Date :** 2026-09-17  
**Statut phase :** **PHASE 3 — REAL EMERGENCE VALIDATION** (soak exécuté ; GLOBAL **NON DÉCLARÉ**)

Le fichier `EMERGENCE_MISSION_MASTER.md` n’a pas été muté automatiquement dans cette session (garde documentation partagée). Appliquer manuellement ou via commit dédié :

```text
PHASE 3 — REAL EMERGENCE VALIDATION (soak executed; GLOBAL NON DECLARED)
```

| Phase | Statut |
|-------|--------|
| 3 | **EXECUTED** — `PHASE3_EMERGENCE_VALIDATION.md` ; aucun GLOBAL/EMERGENCE PASS |
| 4 | **PARTIAL** — PASS_RATE 0 % |
| 5 | BLOCKED |

## Capacité échelle (exact)

- Individual START@100 : **READY** (clamp initialVillagers 4..120)
- Social START@300 : **BLOCKED capacité** — demandé **300** → clampe **120** (max **120**) ; ne pas relever le clamp

## Preuves soak

- `scripts/_probe_phase3_emergence_soak.ts`
- `_phase3_soak_s1.json`, `_phase3_soak_s3.json`, `_phase3_soak_s7.json`
- `_phase3_soak_summary.json`, `_phase3_soak_run.txt`
- Rapport : `PHASE3_EMERGENCE_VALIDATION.md`

## Totaux clés

- PROXY décisions : 197869 (≠ exact chooseTask)
- leaves : 13 (≪20 §33)
- PASS_RATE : **0 %**