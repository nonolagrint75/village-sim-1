# Simulation Atlas v1

**Date :** 18 sept 2026
**Arbre jouable :** C:\Users\kamel\village-sim-1\simulation_atlas_v1\village_edit
**Nom produit :** Simulation Atlas v1
**HARD RUBRIC :** ATLAS_V1_HARD_RUBRIC.md - cible absolue **100/100**
**Scorecard :** SIMULATION_ATLAS_V1_SCORECARD.md - checklist != bulletin (**77.1**/100 HARD honesty; soft refuse 90+)
**Bulletin :** NONO_SIMU_2D_BULLETIN.md - **77.1 HARD** (Perf **90.0** from stable dual 94/82.5; Visuel 69.5 HOLD; life HARD LIVE **20/20**)

Ce document est le **tableau de bord LIVE / PARTIAL / FAIL** contre NONO_SIMU_2D
(visuel §§1-76 + sim §§0-93). Soft PARTIAL->LIVE **demoted** without dual-seed soak. **Pas une finale.**
---

## Performance â€” cible 100 ticks/s

| Ã‰lÃ©ment | Ã‰tat HARD |
|---------|-----------|
| Worker Max (speed â‰¤ 0) | **PARTIAL** â€” pace toward 100 ; soak@500 unproven |
| perfBudget | **PARTIAL** â€” thresholds exist ; not absolute LIVE bar |
| Mesure | 
px tsx scripts/_probe_atlas_tps.ts â€” seed proofs in ATLAS_V1_TPS_PROOF.txt |

Acceptation Max headless : **â‰¥ 80 tps** (cible 100). Scale 500 = still open.

---

## Lancer

```powershell
cd C:\Users\kamel\village-sim-1\simulation_atlas_v1\village_edit
npm install
npm run app
```

Port **5174** Â· titre **Simulation Atlas v1** Â· Max â‰ˆ 100 ticks/s.

---

## Checklist VISUEL Â§Â§1â€“76 (synthÃ¨se HARD)

| Â§Â§ | ThÃ¨me | Statut HARD | Note |
|----|-------|-------------|------|
| 1â€“3 | Lisible / zoom / terrain | **PARTIAL** | Soft LIVE demoted â€” map QA incomplete |
| 4â€“8 | Relief / forÃªts / eau | **PARTIAL** | Houppiers/eau composition vs Stardew/RW gap |
| 9â€“10 | Routes | **PARTIAL** | markTraffic exists ; dual-seed map proof thin |
| 11â€“19 | Villages / bÃ¢timents | **PARTIAL** | Stages+markers ; not 100 eye-QA |
| 20 | ActivitÃ© PNJ | **PARTIAL** | Tool fleck/pip â€” not dual-seed map LIVE |
| 21â€“29 | Chantiers / ruines / champs / mines / marchÃ©s | **PARTIAL** | Mines crystallize ; ports/forge flaky |
| 30â€“47 | Richesse / forts / culture / groupes / quartiers | **PARTIAL** | Map actors ; soft LIVE refused |
| 48â€“52 | Scars / guerre / migration | **PARTIAL** | Battle scars code ; dual-seed map thin |
| 53â€“63 | Saisons / UI / chronique | **PARTIAL** | UI truth panels ; not final |
| 64â€“76 | Assets / vision | **PARTIAL** | 569 PNG bank ; composition = main Visuel lever |

---

## Checklist SIM Â§Â§0â€“93 (synthÃ¨se HARD)

| Domaine | Statut HARD | Note |
|---------|-------------|------|
| Ã‰mergence / bandits | **PARTIAL** | Soak bandits often ; parallel pack phases soft |
| Butterfly multi-seed | **PARTIAL** | Proof file exists â€” re-verify under HARD |
| Cognition / familles / mÃ©tiers | **PARTIAL** | S4 marriage one-seed demotions happen |
| Ã‰co / firms / sells | **PARTIAL** | Sells soak ; full chains soft |
| Mines subsurface | **PARTIAL** | Dig+crystallize ; forge S12 not dual-seed LIVE yet |
| Politique / guerre / coups | **PARTIAL** | Coups live ; S37/S39/S40 gaps |
| Migration / tech / chronique | **PARTIAL** | |
| Environnement pens sim | **PARTIAL** | |
| Interconnexion | **PARTIAL** | craftâ†’sellâ†’market often ; not absolute |
| Perf â‰¥80 | **PARTIAL** | Often â‰¥93 on small ; 500 unproven |

---

## Preuves

- ATLAS_V1_HARD_RUBRIC.md
- ATLAS_V1_SCENARIO_MATRIX.md
- ATLAS_V1_LIFE_TYPES_MATRIX.md
- ATLAS_V1_SOAK_PROOF_s7_d35.txt / _s1_d35.txt
- ATLAS_V1_TPS_PROOF.txt
- ATLAS_V1_BUTTERFLY_PROOF.txt

---

## Interdits

Ne **pas** dÃ©clarer **100/100** tant que HARD matrix + bulletin < 100.  
Refuse soft LIVE, inflation, aligning bulletin to checklist ~80.
