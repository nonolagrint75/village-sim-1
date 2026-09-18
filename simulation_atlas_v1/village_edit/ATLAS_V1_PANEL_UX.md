# ATLAS v1 - Panel UX (player window)

**Brand:** Simulation Atlas v1 - nono_simu_2d  
**Tree:** `simulation_atlas_v1/village_edit`  
**Updated:** 2026-09-18 (panel - HARD gaps S12/S23/S39/S47 + S34/S37/S40)

Panels = **sim truth**. Proof strip prioritizes **not-ready** gaps (HARD toward 100). Cap 10.

---

## Proof strip priority

1. S39 Guerre -> famine (**FAIL** matrix)  
2. S34 Alliance vs 3e · S37 Guerre tue pop · S40 Paix couteuse  
3. S12 Mine -> forge · S23 Nouvelle croyance · S47 Densification  
4. S4 Mariage alliance  
5. Cleared: S7 / S21 / S24 / S41  

Filter **Actifs** = unresolved gaps (+ 2 ready). Gap cards use red border; ready = green.

## Causal (priority front)

Mariage / Menace / Guerre->morts / Guerre->paix / Guerre->famine / Mine->forge / Conviction->creed / Routes->densite

## Guerre · diplomatie

S34/S37/S39/S40 rows + `warFamineCount` / `allianceVsThirdCount` / `costlyPeaceCount`

## Still open

- Sim dual-seed harden remaining PARTIAL/FAIL  
- Visuel composition / bulletin -> 100  
- No commit