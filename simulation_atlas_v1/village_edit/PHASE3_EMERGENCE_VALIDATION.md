# PHASE 3 — Validation émergence réelle (naturelle)

**Workspace :** `village_edit`  
**Date :** 2026-09-17  
**Canal :** EMERGENCE (naturel — aucune famine / profession / CREATE_* induite)  
**Verdict global :** **NON DÉCLARÉ** — **aucun GLOBAL PASS / aucun EMERGENCE PASS**

Preuves : `_phase3_soak_s{1,3,7}.json`, `_phase3_soak_summary.json`, `_phase3_soak_run.txt`, script `scripts/_probe_phase3_emergence_soak.ts`.

---

## 1. Paramètres exacts

| Paramètre | Valeur |
|-----------|--------|
| Commande | `npx tsx scripts/_probe_phase3_emergence_soak.ts 60 1,3,7` |
| Seeds | **1, 3, 7** (≥3) |
| Jours | **60** (≥60) |
| Config | `createSimulation(seed, { initialVillagers: 100, maxPopulation: 250, preset: 'standard', worldSize: 1000 })` |
| Pop départ (mesurée) | **100** / seed |
| Peak pop | **119** (seed 1) |
| Systèmes | `stepSimulation` seul — path naturel |
| Décisions | **PROXY** = changements de `task.kind` chaque tick (+ présence `lastFactorWhy`) — **pas** un ledger exact `chooseTask`/`setTask` |
| Durée run | ~6,1 min (seed1 156s, seed3 92s, seed7 109s) ; NODE `--max-old-space-size=8192` |
| Crashes / OOM | **aucun** (3/3 ok) |

### scalePolicy (confirmé avant soak)

| Tier | Statut | Chiffres |
|------|--------|----------|
| Individuel START@100 | **READY** | floor 100 ; resolved initial=100 maxPop=250 ; clamp `initialVillagers` **4..120** |
| Social START@300 | **BLOCKED capacité** | demandé **300** → clampe **120** ; clamp max=**120** ; maxPop grow 400≥300 OK mais organique **UNPROVEN** ; **≠ FAIL émergence** ; **ne pas relever le clamp** |

---

## 2. Résultats par système (seuils mission §§23–38)

Légende : **PASS** seulement avec preuve aux seuils ; sinon PARTIAL / NOT_TESTED / FAIL / BLOCKED / CODE-ONLY. **Aucun CODE-ONLY → PASS.**

| Système | Seuil clé | Observé (3 seeds) | Verdict |
|---------|-----------|-------------------|---------|
| §20 échelle indiv. | 100 / 60j / 3 seeds / **10k décisions exactes** | 100 / 60 / 3 ; **PROXY=197 869** (exact=0) | **NOT_TESTED** pour PASS (PROXY ≠ exact) |
| Survie | pop vivante fin | aliveEnd 106 / 59 / 52 ; deaths 10 / 17 / 22 | **PARTIAL** (tous vivants ; attrition forte s3/s7) |
| §22 connexions A→B | ≥20/15/5/3 NPC/3 seeds | non instrumenté causalité A→B | **NOT_TESTED** |
| §23 diversité | ≥5 TaskKinds | 31 / 30 / 31 kinds ; entropy starts ~2.78–2.90 | **PARTIAL** (kinds OK ; trajectoires/A-B variables **NOT_TESTED**) |
| §24 personnalité | 30 paires | 0 paires mesurées | **NOT_TESTED** |
| §25 mémoire | ≥20 décisions causales | non mesuré | **NOT_TESTED** |
| §26 émotions | ≥15 attributions | non mesuré | **NOT_TESTED** |
| §27 apprentissage | teach≥30 + progrès/usage | teachCraft starts **40 025** ; progrès%/usage futur **absent** | **PARTIAL** (volume) / usage **NOT_TESTED** |
| §28 métiers | ≥20 chgt, ≥10 NPC, ≥4 métiers, 3 seeds | **603** chgt ; métiers none/farmer/forager/lumberjack/miner/builder(+fisher) | **PARTIAL** (volume OK ; explainabilité multi-facteur ≥70% **NOT_TESTED**) |
| §29 familles | ≥30 fam, ≥20 naissances | fam 33/28/22 ; births **47+0+3=50** | **PARTIAL** (s1 atteint fam+births ; s3 births=0) |
| §30 entraide | ≥50 aides, ≥3 catégories | helpTotal **31 361** mais cats max **1–2** (surtout `teach`) | **PARTIAL** / cats **sous seuil** |
| §31 construction | ≥30 builds | houses 57+9+10 ; mills 2+3+4 | **PARTIAL** (proxy houses+mills) |
| §32 économie | tx/prix/chaînes choc | harvest **2420**, grind **921**, bake **222** ; prix LIVE ; chaînes choc **non prouvées** ; stock fin mesuré **0** | **PARTIAL** / chaînes **NOT_TESTED** |
| §33 migration | ≥20 leaves | leaves **13** (3+2+8) ; rejoins 14 ; foundCamps **0** | **NOT_TESTED** (≪20) |
| §34 groupes | ≥20 formés | circlesFormed **160** ; living ~48/seed | **PARTIAL** (cause émergente ≥50% **NOT_TESTED**) |
| §35 institutions | ≥10 / ≥5 @30j | institutionsFormed ~156 ; living age≥30j 46/43/41 | **PARTIAL** (chaînes type complètes **NOT_TESTED**) |
| §36 creed/culture | Δcroyances≥10 ; 2 gen | creedChanges **618** ; followups ~155 ; **0 preuve 2 gen** | **PARTIAL** / gen **NOT_TESTED** |
| §37 conflits | ≥20 ; ≥5 causes | conflicts **880** ; causes raid/succession/rivalry/(territory_absorb/confront) | **PARTIAL** (participants non comptés) |
| §38 multi-seed | ≥10 seeds | **3** seeds | **NOT_TESTED** |
| Social §20 | 300×120×10 | **BLOCKED capacité** 300→120 | **BLOCKED** (≠ FAIL) |

---

## 3. Connexions A→B

Aucune chaîne instrumentée « A produit → B consomme → conséquence » au sens §22 (compteurs dédiés absents).

Indices **mécaniques** seulement (pas PASS §22) :

- harvest → grind → bake (starts >0 sur les 3 seeds)
- creedChanges → creedBehaviorFollowups (>0)
- migration urgeSamples élevés → leaves faibles (urge ≠ enactment)
- helpCounters.teach corrélé à teachCraft starts (même canal, pas preuve d’usage futur)

**Verdict §22 : NOT_TESTED.**

---

## 4. Chaînes causales réelles observées

**Moins de 10** chaînes émergentes documentées au bar mission. Observés (courts, non complets §41) :

1. Moisson → mouture → cuisson (proxy starts, 3 seeds).
2. Naissances nettes seed1 (47) → peak 119 → fin 106.
3. Urge migration max=1.0 → leaveAttempts → leaves (volume insuffisant).
4. Rivalry/succession → conflictsTotal élevé.
5. Profession churn (603) entre none/farmer/forager/lumberjack/miner/builder.

**Pas** de chaîne choc→décision→offre/demande→prix multi-seed prouvée.  
**Pas** de leave→foundCamp (foundCamps=0).

---

## 5. Comportements émergents observés

- **Dominance teachCraft + socialise** dans les histogrammes de starts (boucle sociale dense).
- **Divergence démographique** : seed1 croît ; seeds 3 et 7 s’effondrent (alive 59 / 52).
- **Institutions/cercles** nombreux et longévité peak ~58,75 j (4230 ticks).
- **Creeds** distincts par seed (ex. s1 partage+commerce ; s3 changement ; s7 commerce_libre).
- **Food chain** active malgré stocks fin de run mesurés à 0 (voir bugs).
- **Miller profession = 0** en fin alors que grindStarts >0 (mouture sans métier miller stable).

---

## 6. Différences entre seeds

| Métrique | Seed 1 | Seed 3 | Seed 7 |
|----------|--------|--------|--------|
| aliveEnd | **106** | 59 | 52 |
| peak | **119** | 100 | 100 |
| births / deaths | 47 / 10 | 0 / 17 | 3 / 22 |
| leaves | 3 | 2 | **8** |
| houses / mills | **57** / 2 | 9 / 3 | 10 / 4 |
| harvest / grind / bake | 831/202/42 | 565/364/95 | **1024**/355/85 |
| creed dominant | partage+commerce | changement | commerce_libre |
| leaveAttempts | 4 | 3 | **26** |

Seed1 = trajectoire « fertile » ; 3/7 = attrition + peu de naissances. Divergence réelle, mais **§38 exige 10 seeds**.

---

## 7. Boucles comportementales

- **teachCraft ↔ socialise ↔ rest** monopolisent les starts (risque monocorde §23/§40).
- **flee/fight** élevés sur s3/s7 (pression menace) sans preuve de résolution durable.
- **buildProject** présent mais second plan derrière social/teach.
- Anti-loop / séquences >7j / objectifs secondaires : **NOT_TESTED** (pas d’instrument séquence).

---

## 8. Encore isolé

- Décisions exactes / entropy collectors prod
- Personnalité appariée (§24)
- Mémoire→décision (§25) et émotion→décision (§26)
- Usage futur post-teach (§27)
- Explainabilité métiers multi-facteur (§28)
- Décisions collectives familiales / shifts éco famille (§29)
- Catégories d’entraide hors teach (§30)
- Chaînes éco choc→prix→job (§32)
- foundCamps / leaves≥20 (§33)
- Tier social 300 (§20 social) — **BLOCKED capacité**
- Matrix 10 seeds (§38)

---

## 9. Bugs trouvés (documentés — **non corrigés** cette phase)

1. **Mesure `foodStock` fin de run = 0** sur food/wheat/flour/bread/meat alors que harvest/grind/bake >0 — soit inventaires ailleurs (coffres village / terrain), soit bug de snapshot probe ; à investiguer avant de conclure famine totale.
2. **`miller` = 0** en fin sur les 3 seeds malgré grindStarts élevés — désalignement métier / tâche.
3. **`helpCounters` quasi mono-catégorie `teach`** — food/defend/build/haul/labor quasi morts ; §30 catégories ≥3 non atteignable en pratique actuelle.
4. **`foundCamps = 0`** malgré leaves>0 — leave sans fondation de camp.
5. **Dominance teachCraft** (volume énorme) peut masquer le reste du scorecard diversité réelle (tick-share non égal entropy starts).
6. Harness : décisions PROXY correctement **exclues** du plancher 10k exact → tous les PASS émergence refusés (comportement voulu).

---

## 10. Régressions

- **Aucune régression farm/mill évidente** vs campagnes courtes : harvest/grind/bake LIVE sur 3 seeds à échelle 100.
- Survie **pire** sur seeds 3/7 (alive ~50–60) qu’historiques ~26/40j — à surveiller, pas forcément régression code (échelle + seed).
- Migration leaves **13** > anciens soaks courts (1) mais toujours **sous §33**.
- Pas de crash/OOM — stabilité OK à 100×60×3.

---

## 11. Scorecard complet

| Système | Statut Phase 3 | Preuve |
|---------|----------------|--------|
| Survie | PARTIAL | dumps s1/s3/s7 |
| Besoins | CODE-ONLY / NOT_TESTED | non mesuré soak |
| Mémoire | NOT_TESTED | §25 |
| Émotions | NOT_TESTED | §26 |
| Personnalité | NOT_TESTED | §24 |
| Objectifs / décision | PARTIAL kinds / NOT_TESTED exact | PROXY 197k |
| Métiers | PARTIAL | 603 chgt |
| Apprentissage | PARTIAL volume | teach 40k |
| Familles | PARTIAL | fam/births inégaux |
| Entraide | PARTIAL | help 31k ; cats <3 |
| Construction | PARTIAL | houses+mills |
| Économie / commerce | PARTIAL | food chain ; chaînes choc NT |
| Migration | NOT_TESTED | leaves 13≪20 |
| Groupes | PARTIAL | circlesFormed 160 |
| Institutions | PARTIAL | living ≥30j élevés |
| Religion / creed | PARTIAL | 618 Δ ; gen NT |
| Culture | NOT_TESTED | 2 gen absent |
| Politique | NOT_TESTED | non isolé |
| Conflits | PARTIAL | 880 |
| Transmission | PARTIAL | = teach volume |
| Émergence | PARTIAL / NOT_TESTED | soak exécuté ; PASS refusé |
| Multi-seed §38 | NOT_TESTED | 3≪10 |
| Social §20 | **BLOCKED capacité** | 300→**120** (clamp max **120**) |
| **GLOBAL (§21)** | **NON DÉCLARÉ** | voir §12 |

---

## 12. Verdict honnête + PASS_RATE

**GLOBAL PASS : NON.**  
**EMERGENCE PASS : NON.**

- Plancher pop/jours/seeds **atteint** (100 / 60 / 3).
- Plancher **décisions exactes ≥10 000 : NON atteint** (PROXY seulement) → harness refuse tout PASS émergence.
- Systèmes critiques (mémoire, personnalité, décisions exactes, chaînes éco, migration volume, multi-seed 10) restent **NOT_TESTED** ou **PARTIAL sans PASS**.
- Tier social **300×120j×10 seeds** : **BLOCKED capacité** — `initialVillagers` demandé 300 clampe à **120** (max clamp **120**) ; **ne pas relever le clamp**.

### PASS_RATE

Parmi les lignes scorecard émergence scorables (§§23–38 + survie + social) :

- **PASS = 0**
- **PASS_RATE = 0 %**
- PARTIAL observés ≠ PASS ; CODE-ONLY / NOT_TESTED / BLOCKED inchangés en PASS.

**Conclusion :** Phase 3 a **exécuté** le premier soak naturel §20 individuel avec preuves JSON. L’autonomie émergente au bar mission reste **non prouvée**. Prochaine priorité mesure : ledger décisions exactes, §33 leaves≥20, catégories entraide, stocks alimentaires, matrix ≥10 seeds — **sans** fake PASS et **sans** relever le clamp 120.

---

*Fin PHASE3_EMERGENCE_VALIDATION.md — lien master : `EMERGENCE_MISSION_MASTER.md`.*
