# PHASE 4 - Journal d'incoherences (doc-before-fix)

**Owner :** AGENT 1 - ORCHESTRATEUR / CP4 integrator
**Workspace :** `village_edit`
**Date ouverture :** 2026-09-17
**Regle :** toute anomalie qui casse la causalite ou la mesure doit etre **documentee ici AVANT** tout correctif gameplay.
**Lien master :** `PHASE4_CAUSALITY_MASTER.md` (CP4)

**Statut global :** aucun GLOBAL PASS / EMERGENCE PASS - ce journal != preuve de PASS.
**CP4 :** **PARTIAL** (INC-01/02/03/04 traites ; INC-05/06/07 doc ; soak CP5 reste)

---

## Mode d'emploi

Pour chaque entree :

1. **ID** stable (`INC-XX`)
2. **Observe** (seed, jours, metrique, dump)
3. **Attendu** (seuil ou invariant causal)
4. **Hypotheses** (ordonnees)
5. **Impact** (quel systeme / quelle chaine A->B)
6. **Statut** : `OPEN` -> `REPRODUCED` -> `DOCUMENTED` -> `FIX_PLANNED` -> `FIXED` -> `REMEASURED` / `WONTFIX_DOC` / `DEFERRED`
7. **Fix** : lien commit / fichiers - **seulement apres** DOCUMENTED
8. **Re-mesure** : resultat post-fix (jamais baisser seuil ; ne pas effacer compteurs)

---

## Backlog initial (depuis Phase 3)

### INC-01 - foodStock fin de run = 0

| Champ | Valeur |
|-------|--------|
| Observe | Seeds 1/3/7 @60j : food/wheat/flour/bread/meat stock fin = **0** alors que harvest/grind/bake starts >0 |
| Attendu | Stock >0 quelque part (bags/pantry/chests) OU preuve consommation totale |
| Hypotheses | **(a) CONFIRME** probe lisait `it.kind`/`it.qty` alors que Slot = `{ type, count }` -> toujours 0 ; (b) tout consomme ; (c) mauvais agregat |
| Impact | Sec32 ; **faux signal famine** |
| Statut | **FIXED** (mesure) |
| Fix | `scripts/_probe_phase3_emergence_soak.ts` countFoodStock -> type/count + chest + cupboard + edibleTotal |
| Remesure | CP4 smoke seed7@12d: edible=1897 food=1320 wheat=417 bread=110 (plus zero artefact) |

### INC-02 - miller = 0 malgre grindStarts eleves

| Champ | Valeur |
|-------|--------|
| Observe | grindStarts total **921** ; profession miller fin = **0** sur 3 seeds |
| Attendu | Alignement metier<->tache OU explication explicite "grind sans miller" |
| Hypotheses | **(a) CONFIRME** grindFlour accessible hors metier miller ; (b) miller rarement assigne ; (c) flip avant snapshot fin |
| Impact | Sec28 opaque si on lit seulement professionsEnd.miller |
| Statut | **WONTFIX_DESIGN** (Phase5 DP6) - grind = tache ouverte ; **pas** de force-spawn miller |
| Fix | Probe : foodChain.grindByProfession + millerAlivePeak + grindLabel=GRIND_OPEN_TASK ; doc WONTFIX_DESIGN |
| Remesure | seed7@12d grind=178 by farmer:15 none:128 forager:28 lumberjack:7 ; millersEnd=0 |

### INC-03 - categories d'entraide mono-teach

| Champ | Valeur |
|-------|--------|
| Observe | helpTotal **31361** ; cats max 1-2 (surtout teach) ; seed7 : food=6, defend/build/haul/labor=0 |
| Attendu | Sec30 >=3 categories avec volume non trivial |
| Hypotheses | food/teach/defend deja branches ; **defend score existait sans recordHelp** ; build/haul/labor non branches sur projets |
| Impact | Sec30 PASS structurellement bloque |
| Statut | **FIXED** (wiring) |
| Fix | behaviors.ts : recordHelp(defend) au start defend ; build/labor sur buildProject aide tiers ; haul sur gather pour projet tiers |
| Remesure | seed7@12d helpCatsActive=3 (teach:319 build:85 haul:1) |

### INC-04 - migration : leaves sous seuil + foundCamps = 0

| Champ | Valeur |
|-------|--------|
| Observe | leaves **13** <<20 ; foundCamps **0** ; rejoins~leaves ; urgeMax=1.0 |
| Attendu | Sec33 >=20 leaves ; leave->camp si design le prevoit |
| Hypotheses | **(a) CONFIRME** leave gardait hasHome -> rejoin immediat ; foundCamp seulement sur nouvelle maison ; (b) volume leave sous seuil |
| Impact | Sec22 migrate ; Sec33 chaine leave->foundCamp cassee |
| Statut | **FIXED** (causal minimal) - volume leaves>=20 **DEFERRED CP5** |
| Fix | politics leave + construction.foundMigrateCamp : leavers loges secedent foyer -> camp + noteMigrateFound |
| Remesure | wiring leave->foundMigrateCamp en place ; short smokes 12-25d leaves=0 (volume DEFERRED CP5 100x60) |

### INC-05 - dominance teachCraft / socialise

| Champ | Valeur |
|-------|--------|
| Observe | teachCraftStarts **40025** ; histogrammes monopolises social/teach |
| Attendu | Diversite Sec23 mesurable (sans cheat) |
| Hypotheses | (a) scores catalogue ; (b) anti-loop faible ; (c) artefact comptage starts |
| Impact | Masque diversite reelle |
| Statut | **WONTFIX_DOC** (mesure only - **pas** de nerf teach pour PASS) |
| Fix | Aucun gameplay CP4 |
| Remesure | N/A CP4 |

### INC-06 - Social START@300 BLOCKED capacite

| Champ | Valeur |
|-------|--------|
| Observe | demande 300 -> clampe **120** (max clamp **120**) |
| Attendu | Tier social Sec20 inatteignable au start |
| Hypotheses | Capacite config volontaire (WP12) |
| Impact | Suite social **BLOCKED** != FAIL emergence |
| Statut | **DOCUMENTED** - **ne pas relever le clamp** en Phase 4 |
| Fix | Interdit (politique) |
| Remesure | N/A |

---

## Entrees Phase 4

### INC-07 - teach/help silencieux @5d (smoke CP2)

| Champ | Valeur |
|-------|--------|
| Observe | causality smoke days=5 : teachEvents=0, helpEvents=0 ; food LIVE ; @60j teach/help massifs |
| Attendu | Wiring mort OU fenetre probe trop courte |
| Hypotheses | **(a) CONFIRME fenetre** : teach/giveFood emergent apres fondation (>>5j) ; wiring OK (preuve P3 60j) |
| Impact | Faux negatif si on juge Sec22/Sec30 sur smoke 5j seul |
| Statut | **WONTFIX_DOC** - allonger probe (>=15-30j) en CP5 ; pas de fake teach |
| Fix | Doc only |
| Remesure | CP5 soak / smoke days>=15 |

---

*Fin PHASE4_INCOHERENCE_LOG.md*
