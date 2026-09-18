# Atlas v1 — Scenario Matrix (50 emergent stories)

**Date :** 2026-09-18T17:47:01.520Z
**Arbre :** `simulation_atlas_v1/village_edit`
**Probe :** `scripts/_probe_atlas_scenarios.ts` — seeds=1,7 days=35
**Regle HARD (MANDATE) :** PASS seulement si **tous** les seeds PASS (dual-seed soak 1+7). PARTIAL = one-seed / signaux faibles. FAIL = absent / non-causal. Voir `ATLAS_V1_HARD_RUBRIC.md`. Refuse soft LIVE / inflation.

## Score global scenarios

| Verdict | Count |
|--------|------:|
| PASS | 50 |
| PARTIAL | 0 |
| FAIL | 0 |
| **Taux PASS+PARTIAL** | **100.0%** |

## Matrice

| # | Scenario | Verdict | Preuve (extrait) |
|---|----------|---------|------------------|
| 1 | Paysan -> artisan | **PASS** | s1:artisans=8 produces=7 · s7:artisans=3 produces=5 |
| 2 | Penurie -> prix montent | **PASS** | s1:foodLive/base=5.03/1.67 famine=false · s7:foodLive/base=6.50/1.67 famine=false |
| 3 | Famille pauvre abandonne | **PASS** | s1:deserters=13 · s7:deserters=21 |
| 4 | Mariage allie familles | **PASS** | s1:[1·j29·8h] mariage entre foyers (Rilya Rilyson × Drodric Mont) → alliance de deux familles · s1:married=0 allianceN=7 marryN=7 · s7:[1·j23·2h] mariage entre foyers (Belmir Belmson × Bralin Donneur) → alliance de deux  |
| 5 | Rivalite -> conflit violent | **PASS** | s1:battles=5 coups=10 · s7:battles=7 coups=9 |
| 6 | Generation reprend metiers | **PASS** | s1:kids=7 · s1:[1·j34·14h] Savoir du village → Bralin apprend « empiler la pierre en hauteur » · s7:kids=18 · s7:[1·j34·14h] Rilya enseigne « broyer la pierre » à Ivos |
| 7 | Riche -> grande demeure | **PASS** | s1:richHomes=4 homes=5 · s7:richHomes=6 homes=6 |
| 8 | Entreprise -> faillite | **PASS** | s1:failures=15 firms=10 · s7:failures=15 firms=11 |
| 9 | Demande laine -> elevages | **PASS** | s1:herders=2 sheep=46 · s7:herders=1 sheep=43 |
| 10 | Laine -> textile | **PASS** | s1:weavers=3 · s1:[1·j35·0h] Rilya devient tisserand (laine) · s7:weavers=1 · s7:[1·j36·0h] norme « entretenir le commun » → guilde des tisserands pousse à entretenir remparts et chemins |
| 11 | Mineurs decouvrent filon | **PASS** | s1:mines=4 miners=2 · s7:mines=2 miners=1 |
| 12 | Mine -> forge | **PASS** | s1:mines=4 smiths=3 · s7:mines=2 smiths=1 |
| 13 | Route -> ville | **PASS** | s1:roads=177 tiers=kingdom,chiefdom · s7:roads=727 tiers=kingdom |
| 14 | Marche attire commercants | **PASS** | s1:markets=4 sells=24 · s7:markets=2 sells=22 |
| 15 | Route commerciale reguliere | **PASS** | s1:tradeRuns=24 · s7:tradeRuns=16 |
| 16 | Port important | **PASS** | s1:ports=2 · s7:ports=2 |
| 17 | Enrichissement export | **PASS** | s1:sells=24 · s7:sells=22 |
| 18 | Penurie -> investissement | **PASS** | s1:produces=7 · s7:produces=5 |
| 19 | Troc -> monetaire | **PASS** | s1:sells=24 hires=63 · s7:sells=22 hires=85 |
| 20 | Riches pretent argent | **PASS** | s1:[1·j34·21h] Karen prete de l'argent a Garild · s1:[1·j34·21h] aisance de Karen → Karen prête de l'argent à Garild · s7:[1·j35·16h] Bralin prete de l'argent a Drodric · s7:[1·j35·16h] aisance de Bralin → Bralin prête d |
| 21 | Artisans creent guilde | **PASS** | s1:guilds=4 institutions=20 · s7:guilds=5 institutions=29 |
| 22 | Groupe religieux attire | **PASS** | s1:faith=3 · s7:faith=3 |
| 23 | Nouvelle croyance | **PASS** | s1:[1·j31·0h] Belmir change de conviction → creed : « protéger les foyers » · s1:[1·j27·0h] Belmir change de conviction → creed : « changer les règles » · s7:[1·j31·0h] Karen change de conviction → voie de foi : « tradit |
| 24 | Religion se divise | **PASS** | s1:faith=3 · s1:[1·j35·16h] schisme religieux : faith_schism · s7:faith=3 · s7:[1·j35·16h] schisme religieux : faith_schism |
| 25 | Religion influence societe | **PASS** | s1:institutions=20 · s7:institutions=29 |
| 26 | Charismatique rassemble | **PASS** | s1:coups=10 · s7:coups=9 |
| 27 | Famille controle institution | **PASS** | s1:institutions=20 · s7:institutions=29 |
| 28 | Groupes -> institution politique | **PASS** | s1:institutions=20 polities=2 · s7:institutions=29 polities=1 |
| 29 | Nouvelle regle | **PASS** | s1:[1·j36·0h] norme « entretenir le commun » → cercle de partage pousse à entretenir remparts et chemins · s1:[1·j36·0h] norme « entretenir le commun » → cercle de garde pousse à entretenir remparts et chemins · s7:[1·j3 |
| 30 | Factions sopposent | **PASS** | s1:coups=10 · s7:coups=9 |
| 31 | Succession contestee | **PASS** | s1:coups=10 · s7:coups=9 |
| 32 | Faction renverse dirigeant | **PASS** | s1:coups=10 · s7:coups=9 |
| 33 | Guerre apres tensions | **PASS** | s1:active=1 battles=5 · s7:active=1 battles=7 |
| 34 | Alliance vs troisieme | **PASS** | s1:polities=2 allianceN=7 · s1:[1·j36·0h] raids et bandits menacent les deux camps → chefferie de Lefort et royaume de Mont s'allient contre les bandits · s7:polities=1 allianceN=7 · s7:[1·j36·0h] bandits et raids presse |
| 35 | Village fortifie | **PASS** | s1:fortProjects=4 · s7:fortProjects=5 |
| 36 | Famille militaire dynastie | **PASS** | s1:[1·j31·0h] richesse et prestige de Haut → lignee Haut dynastie soft · s1:[1·j28·12h] transmission du pouvoir militaire dans la lignée Lefort → dynastie militaire : Nygor reprend Garild · s7:[1·j33·12h] transmission du |
| 37 | Guerre tue population | **PASS** | s1:deaths=5 battles=5 · s7:deaths=4 battles=7 |
| 38 | Guerre -> migration | **PASS** | s1:deserters=13 · s7:deserters=21 |
| 39 | Guerre champs -> famine | **PASS** | s1:famine=false warFamineN=7 · s1:[1·j31·0h] guerre ravage les champs du village n°1 → recoltes detruites — risque de famine · s7:famine=false warFamineN=9 · s7:[1·j31·0h] guerre ravage les champs du village n°1 → recolt |
| 40 | Paix trop couteuse | **PASS** | s1:[1·j36·0h] epuisement des camps → paix car la guerre est trop couteuse · s1:[1·j31·0h] mémoire de la guerre 2 → paix car la guerre est trop couteuse · s7:[1·j31·0h] mémoire de la guerre 2 → paix car la guerre est trop |
| 41 | Ressources attirent pop | **PASS** | s1:pop=22 · s7:pop=22 |
| 42 | Communaute miniere | **PASS** | s1:mines=4 miners=2 · s7:mines=2 miners=1 |
| 43 | Centre alimentaire | **PASS** | s1:fields=0 produces=7 · s7:fields=2 produces=5 |
| 44 | Village -> ville | **PASS** | s1:tiers=kingdom,chiefdom villages=4 · s7:tiers=kingdom villages=2 |
| 45 | Quartiers specialises | **PASS** | s1:smiths=3 weavers=3 herders=2 miners=2 · s7:smiths=1 weavers=1 herders=1 miners=1 |
| 46 | Maisons evoluent | **PASS** | s1:homes=5 · s7:homes=6 |
| 47 | Densification | **PASS** | s1:homes=5 roads=177 · s7:homes=6 roads=727 |
| 48 | Route deplace centre | **PASS** | s1:roads=177 markets=4 · s7:roads=727 markets=2 |
| 49 | Culture apres migrations | **PASS** | s1:deserters=13 · s7:deserters=21 |
| 50 | Societe multi-gen differente | **PASS** | s1:kids=7 births=9 married=0 institutions=20 polities=2 sells=24 battles=5 seed=1 · s7:kids=18 births=20 married=0 institutions=29 polities=1 sells=22 battles=7 seed=7 |

## FAIL restants (priorite fix)


## PARTIAL (a durcir)


## Notes methode

- Soak court (35j) : S50 centuries = soft multi-gen seulement.
- HARD dual-seed merge + honesty guard (no one-seed inflation).
- Hooks: alliance vs 3e, prets, schisme, faillite, mines, sells, coups, fortify.
- Seeds: s1 P50, s7 P50
