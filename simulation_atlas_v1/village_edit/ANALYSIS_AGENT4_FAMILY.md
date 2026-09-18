# ANALYSIS_AGENT4_FAMILY — Familles / Social

**Agent:** 4 (analyse only — aucune modification de code de simulation)
**Workspace:** C:\Users\kamel\village-sim-1\_wt_rhythm\village_edit
**Date:** 2026-09-17
**Referentiel utilisateur:** MASTER MISSION §§9–10 (vision) + §§29–30 (seuils de preuve)

---

## Verdict vs §§9–10 / 29–30

| Attendu utilisateur | Etat code | Preuve comportementale |
|---------------------|-----------|------------------------|
| **§9 Familles actives** (ressources, besoins, maison, patrimoine, metiers, enfants, savoirs, objectifs ; specialisation des membres) | **PARTIAL / CODE-ONLY** sur plusieurs axes | Demographie + maison + heritage **LIVE** (A45). Economie / objectifs / specialisation **familiaux** absents ou decoratifs. |
| **§10 Entraide** (partage, construire ensemble, transporter, apprendre, services, proteger, maison collective) | **PARTIAL** | giveFood, defense kin, teachCraft, cercles famine — **LIVE**. Co-construction maison / travail pour autrui / transport kin — **manquants**. |
| **§29 Familles** (30 familles, 20 naissances, 10 chgt eco familiaux, 10 decisions collectives) | **NOT TESTED** aux seuils | A45 compte familles/naissances ; **zero** metrique changement economique familial ni decision collective. |
| **§30 Entraide** (50 aides, 20/20, 10 situations, >=3 categories) | **PARTIAL / NOT TESTED** | seed7 : giveFoodTicks=199 (PASS volume) ; giveFoodUnderFamine=0 (PARTIAL) ; categories d'aide non instrumentees. |

**Synthese :** tuyauterie de parente solide (naissance -> foyer -> lignee -> heritage -> grief), mais **pas encore de famille-comme-systeme**. Decisions individuelles ; Family / wealthAggregate surtout UI / refresh.

---

## SYSTEMS_ANALYZED

| Systeme | Fichiers principaux | Role |
|---------|---------------------|------|
| Household / Family record | family.ts, types.ts (familyId, state.families) | Foyer co-resident vs lignee historique |
| Lineage / genealogy / surnames | family.ts, naming personality | Memoire longue, traditions craft, split/merge/fade |
| Marriage / adoption / mate choice | marriage.ts | Romance / arranged / wealth ; adoption orphelins |
| Genetics / consanguinity | genetics.ts | Genome, kinshipCoefficient, taboo |
| Ethnos / culture transmission | ethnos.ts, cognition culture seed | Homophilie mariage / socialise / giveFood |
| Birth / housing / multi-gen | behaviors.ts tickReproduction, shelterHomelessKin | Siege nouveau-ne, overcrowding soft |
| House build / rooms / furniture | behaviors.ts planHouse / buildHouse, rooms, furniture | Maison personnelle + expansion hh |
| Inheritance | family.inheritOnDeath, interactions.onDeath | Biens + maison/champ/enclos/animaux |
| Mutual aid — food | behaviors giveFood option, interactions.doGiveFood | Partage bag -> bag |
| Mutual aid — famine circles | politics share_famine, tickPooledResources | Quota soft cercle hunger |
| Mutual aid — teach / patronage | doTeachCraft, payForService, doEntertain | Apprentissage + paiement soft |
| Mutual aid — protect | defend vs loups (kin/affinity) | Sauvetage local |
| Kin circles | politics CircleKind=kin | Groupe social parente |
| Shared civic projects | construction.ts BuildProject | ownerId + sponsorCircleId (pas familyId) |
| Cognition family drive | goals.ts, tick.ts concerns kin/mate/family | Objectifs individuels family/mate |
| Power / politics kin | politics.computePower kinCount ; succession soft | Legitimite / leadership |
| Social trauma / grief | social.shareFamilyTrauma, onDeath | Memoire kin + vengeance |
| Bandits / ghost spouse | bandits.detachOutcast, onDeath | Clear spouse (A13) |
| UI / snapshot | snapshot.packFamilySummary, SimPanel | Affichage genealogie |

---

## CURRENT_ARCHITECTURE

### Couches d'identite (source of truth)

```text
Villager
  parentIds / motherId / fatherId / adoptiveParentIds   -> pedigree
  spouseId / marriageKind                                -> couple
  familyId -> state.families[id]                          -> foyer (co-residence)
  lineageId -> state.lineages[id]                         -> lignee historique
  homeOwnerId / hasHome / house / chest                  -> abri + stock perso
  relations[].kinship                                    -> graphe social
```

**Autorite reelle pour les decisions d'aide :** spouseId + parentIds + relations.kinship / affinity / trust.
**familyId est rarement lu** hors attach/refresh/UI/trauma (shareFamilyTrauma).

### Pipeline runtime (engine)

```text
tickVillager (chooseTask -> execute)
  -> giveFood / socialise / buildHouse / teachCraft / defend ...
tickMarriage -> tickReproduction -> tickAdoption
tickPolitics (cercles kin / hunger / pooledFood)
tickBuildProjects (civic / deep-think intents)
tickLineages (+ refreshHouseholds + shelterHomelessKin)
tickAncestorMemory
```

### Maison

- Plan : planHouse estime household via enfants + affinite, place pres de homes kin.
- Build : proprietaire seul (homeOwnerId = self a completion) ; residents via siege naissance / mariage / shelter.
- Stock « household » : householdStock(v) = inventaire + coffre du meme Villager — pas un panier Family.
- Expansion : maybeExpandHouse / furniture queue selon taille foyer.

### Heritage

1. inheritOnDeath — biens inventaire, legitimite soft, fame lignee, break spouse apres partage.
2. onDeath — transfert maison / champ / enclos / cheval / bateau / coins ; heirs : spouse -> residents -> enfants.

### Entraide actuelle (categories code)

| Categorie §10 | Mecanisme | Cible kin? |
|---------------|-----------|------------|
| Partager | giveFood + pooled circle | Oui (score) / cercle |
| Construire ensemble | buildProject multi-workers civic | Circle/village, pas famille |
| Transporter | haul / cart individuel | Non kin-specifique |
| Apprendre ensemble | teachCraft / imitation socialise | Proximite craft gap, pas familyId |
| Aider | giveFood, shelterHomelessKin | Kin / parents |
| Services | payForService (food/coin) | Patron <-> performer |
| Proteger | defend wolf rescue | Affinity/kinship |
| Travailler pour quelqu'un | absent | — |
| Maison projet collectif | absent (buildHouse solo) | — |

### Specialisation familiale

- Individuelle : careers / livelihood — grep family/spouse = 0 dans careers.ts.
- Lignee : traditions tags craft:profession si >=2 membres meme metier — affichage, pas assignation.
- Naissance : inheritKnowledge, inheritLaborPreferences — transmission personnelle.

### Objectifs / decisions collectives

- Cognition : goals family / mate biaisent tasks individuels.
- Cercles : normes + pooledFood = quasi decision collective village/hunger, pas vote/foyer.
- Aucune API familyDecide / consensus / migration familiale unitaire.

---

## PROBLEMS

### P0 — Famille n'est pas un systeme economique (§9)

- Family.wealthAggregate recalcule dans refreshHouseholds puis jamais consomme par chooseTask / careers / politics power.
- Pas de besoins / objectifs / stock au niveau Family.
- Impossible de demontrer « 10 changements economiques familiaux » (§29).

### P0 — familyId hors boucle decision (§9 / interconnect #8)

- Naissance / mariage / adoption / refresh attachent familyId.
- chooseTask giveFood / socialise / teach n'interrogent pas familyId.
- Interconnect audit l'avait deja classe PARTIAL.

### P1 — Pas de specialisation coordonnee des membres (§9)

- Metiers evoluent par demande village + perso ; aucun bias « foyer a deja 2 farmers -> diversifier ».
- Traditions lignee n'influencent pas assignProfession.

### P1 — Maison non collective (§10)

- buildHouse = un agent. Conjoints / kin ne contribuent pas.
- BuildProject multi-agent existe pour civic/fort/shrine, pas pour homestead familial.

### P1 — Entraide etroite vs §10 / §30

- Categories fortes : food share, teach, defend (+ pooled circle).
- Manquent : co-build, transport-for-kin, labor-for-other.
- giveFood sous feelFamine : fenetre PARTIAL (floor 0.55 ; ticks famine~0 sur soak induit).

### P2 — Double heritage / double household stock

- Biens : inheritOnDeath + coins dans onDeath.
- Stock : « household » = pack+chest individuel ; co-residents ne voient pas le coffre sibling sauf via owner eat path.

### P2 — Family.traditions mort

- Champ cree vide ; seules Lineage.traditions sont peuplees.

### P2 — Decisions collectives non definies / non mesurees (§29)

- Aucun compteur « family collective decision ».

### P3 — Seuils §29–30 non instrumentes

- Probes A45 / second_audit emergence ne couvrent pas les metriques master mission.

---

## ISOLATED_SYSTEMS

| Isolat | Severite | Detail |
|--------|----------|--------|
| Family record / wealthAggregate | HIGH | Refresh + UI ; pas de consumers decisionnels |
| Family.traditions | HIGH | Jamais ecrit |
| Lineage traditions craft tags | MED | Log / UI — pas careers |
| packFamilySummary | LOW | Snapshot only |
| Kin Circle | MED | Peu de biais task specifiques kin |
| Ancestor fame -> legitimacy | SOFT LIVE | Tiny clamp politics |
| mateSeekPressure | SOFT | Helper cognition |

---

## MISSING_CONNECTIONS

| Connexion attendue (§§9–10) | Etat |
|-----------------------------|------|
| Famille -> panier ressources partage | MISSING |
| Famille -> besoins agreges | MISSING |
| Famille -> objectifs communs | MISSING |
| Famille -> specialisation roles | MISSING |
| Famille -> patrimoine -> power / careers | THIN |
| Famille -> decision collective | MISSING |
| Kin -> co-buildHouse | MISSING |
| Kin -> haul / gather for household owner | MISSING |
| familyId -> giveFood / share_famine | MISSING |
| familyId -> teachCraft pupil bias | MISSING |
| Careers <- heritage / tradition / sibling roles | MISSING |
| Migration <- inquietude familiale | THIN (hasHome damp leave) |
| BuildProject.sponsorFamilyId | MISSING |
| Mesures §29–30 -> probes | MISSING |

---

## DUPLICATES

| Dual | Ou | Risque |
|------|-----|--------|
| Kinship graph | parentIds/spouse vs relations.kinship vs familyId vs Circle kin | 4 vues ; decisions n'utilisent qu'un sous-ensemble |
| Household size | householdSize() vs planHouse vs Family.livingCount vs beds | Estimations divergentes |
| Wealth | estimateWealth / wealthProxy / SoL / wealthAggregate / gear | Agregat famille orphelin |
| Food share | doGiveFood task vs tickPooledResources | Deux chemins ; metriques separees |
| Heritage | inheritOnDeath goods vs onDeath house+coins | Coins partiellement double |
| householdStock naming | perso pack+chest vs concept foyer | Confusion architecture |
| Memory dual | legacy memories vs mind episodic | Note interconnect |

---

## EVIDENCE

### Code (chemins)

- src/lib/sim/family.ts — Family / Lineage / registerBirth / inheritOnDeath / refreshHouseholds / shelterHomelessKin / tickLineages
- src/lib/sim/marriage.ts — formBond, tickMarriage, tickAdoption, scoreMate
- src/lib/sim/behaviors.ts — householdStock (~L1266), giveFood options (~L2733), planHouse (~L2048), tickReproduction, teachCraft pupil (~L2909)
- src/lib/sim/interactions.ts — doGiveFood, onDeath house heirs, doTeachCraft
- src/lib/sim/politics.ts — createCircle kin, tickPooledResources, share_famine
- src/lib/sim/construction.ts — BuildProject.ownerId / sponsorCircleId (pas family)
- src/lib/sim/careers.ts — aucun lien family/spouse
- src/lib/sim/engine.ts — ordre ticks mariage -> repro -> politics -> lineages

### Audits / dumps

| Source | Observation |
|--------|-------------|
| AUDIT_A45_DEMO.md | Multi-gen PASS apres shelter ; births + inheritance logs |
| INTERCONNECT_AUDIT.md | Repair #8 Family household economy loop encore ouvert |
| SECOND_AUDIT_EMERGENCE.md / _second_audit_s7.txt | giveFoodTicks=199 ; giveFoodUnderFamine=0 ; ghost spouses 0 |
| SECOND_AUDIT_REPORT.md | giveFood-under-famine PARTIAL |
| AUDIT_A810_SOC.md | Cercles / teach / creeds — entraide village-scale |
| Probes §29–30 | Aucun dump family economic change / collective decision / help categories |

### Niveau de validation (echelle master §44)

| Chaine | Niveau max prouve |
|--------|-------------------|
| Birth -> parentIds -> housing -> marry -> gen2 | 5–6 (A45) |
| Death -> inherit goods/house | 5 (logs A45) |
| Hunger -> giveFood -> relation/debt | 4–5 |
| Family wealth -> decisions | 1–2 CODE EXISTS / unused |
| Family specialization roles | 1 |
| Collective family decision | 0–1 |
| Co-build house | 0 |

---

## PROPOSED_FIXES

Propositions pour l'orchestrateur — ne pas implementer en parallele sans plan global.

### F1 — Source of truth foyer (P0)

1. Definir Family comme agregat vivant : memberIds, homeOwnerId, pantry (coffre du homeOwnerId lisible par residents).
2. Helpers : familyOf(v), familyMembers, familyEdible, familyWealth.
3. Brancher giveFood / eat / mill costs sur stock foyer quand home partage.
4. Faire lire wealthAggregate (ou helper) par computePower / careers soft bias.

### F2 — familyId dans l'entraide (P0/P1)

- Scoring giveFood / socialise / teachCraft / defend : bonus si same familyId.
- Option : hunger circle + familyId -> priorites redistribution.

### F3 — Specialisation soft du foyer (§9) (P1)

- Avant softProfession : si >=2 co-foyer meme profession, penaliser 3e copie ; booster complementary.
- Lineage.traditions comme prior faible, pas lock.

### F4 — Maison comme projet collectif (§10) (P1)

- Permettre buildHouse / gatherWood ciblant spouse/family plot (contribuer wood + work).
- Ou : BuildProject purpose homestead avec sponsorFamilyId.

### F5 — Categories d'entraide instrumentees (§30) (P1)

Compteurs : help_food, help_teach, help_defend, help_build, help_haul, help_labor (+ giver/receiver ids).

### F6 — Decisions collectives minimales (§29) (P1)

- Migration : head migrationUrge + spouse/enfants -> move groupe (ou damp leave si patrimoine).
- Expansion maison : moyenne ambition/wealth foyer.
- Logger familyCollective:*.

### F7 — Nettoyage duplicates (P2)

- Documenter : pedigree = parentIds ; foyer = familyId+homeOwner ; social = kinship.
- Unifier inheritance coins path.
- Renommer householdStock -> personalStock vs familyStock.

### F8 — Tests (§29–30) (P1)

Probe dedie >=120j x 3–10 seeds. Sans ca : statut reste NOT TESTED.

---

## FILES_TO_MODIFY

| Fichier | Pourquoi (si plan unifie) |
|---------|---------------------------|
| src/lib/sim/family.ts | Pantry/wealth helpers ; traditions foyer ; collective hooks |
| src/lib/sim/behaviors.ts | giveFood/familyId ; co-build ; householdStock family-aware |
| src/lib/sim/interactions.ts | doGiveFood family pantry ; help telemetry |
| src/lib/sim/marriage.ts | Sync homeOwner pantry si besoin |
| src/lib/sim/politics.ts | kin circle <-> familyId ; pooledFood priority ; power |
| src/lib/sim/careers.ts / livelihood.ts | Soft anti-mono-metier foyer |
| src/lib/sim/construction.ts | sponsorFamilyId / homestead multi-worker |
| src/lib/sim/cognition/goals.ts / decide.ts | Goals support_household |
| src/lib/sim/engine.ts | Tick order si refresh foyer avant chooseTask |
| src/lib/sim/snapshot.ts / SimPanel.tsx | Exposer metriques foyer |
| scripts/_probe_family_aid.ts (nouveau) | §§29–30 instrumentation |

---

## DEPENDENCIES

| Depend de | Impact |
|-----------|--------|
| Survie / food chain | Partage famine inutile si larder vide |
| Careers dynamiques | Specialisation foyer -> applyProfessionChange only |
| Cognition goals / HARD survival | Family goals ne doivent pas bypass hunger HARD |
| Politics circles | Ne pas dupliquer pooledFood en 3e stock |
| Construction projects | Cohabiter sans double-claim tiles |
| Inheritance / onDeath | Ordre heirs fragile |
| Ethnos / marriage taboos | familyId != licence consanguinite |
| Bandits detachOutcast | Garder clear spouse |
| Interconnect famine feel API | giveFood famine sur feelFamine |

---

## POSSIBLE_CONFLICTS

| Conflit | Avec qui | Mitigation |
|---------|----------|------------|
| Agent 3 economie — 3e stock nourriture | surplus / chest / pantry | Une SoT : chest owner = pantry |
| Agent 2 cerveau — goals family vs HARD eat | Soft bias only | Ne pas hard-gate survival |
| Agent 5 societe — Circle kin vs Family | Deux groupes | familyId structurel ; Circle normatif |
| Agent 7 interconnect — dual kinship | Deja liste | Unifier readers avant nouveaux writers |
| Co-buildHouse vs claimCells solo | Double builders | Progress partage sur owner house |
| Specialisation foyer vs career demand | Anti-mono vs famine->farmer | Demand famine override famille |
| Metriques §29 trop scriptees | Anti-scripting §39 | Logger decisions emergentes deja causees |
| Patches paralleles behaviors.ts | Tous agents | Orchestrateur serialise |

---

## Mapping explicite §§9–10

### §9 Familles actives — checklist

| Attribut | Present? | Note |
|----------|----------|------|
| ressources | PARTIAL | Perso + chest owner ; pas Family |
| besoins | NO (foyer) | Individuels only |
| maison | YES | Owner + residents |
| patrimoine | PARTIAL | Heritage mort ; wealthAggregate decoratif |
| relations | YES | kinship / spouse / trauma |
| metiers | YES indiv. | Pas coordination foyer |
| enfants | YES | A45 multi-gen |
| connaissances | YES | inherit + teach |
| objectifs | PARTIAL | mind goals family/mate, pas Family.goal |
| specialisation membres | NO | Exemple pere/mere/enfant non supporté |
| entraide temporaire | PARTIAL | giveFood / defend / teach |

### §10 Entraide — checklist

| Action | Present? |
|--------|----------|
| partager | YES (giveFood, pooled) |
| construire ensemble | PARTIAL (civic projects only) |
| transporter | NO (kin-specific) |
| apprendre ensemble | YES (teachCraft) |
| aider | PARTIAL |
| echanger services | PARTIAL (payForService) |
| proteger | YES (defend) |
| travailler temporairement pour quelqu'un | NO |
| maison = projet collectif | NO |

---

## Recommandation a l'orchestrateur

1. Traiter F1+F2 comme le coeur du repair interconnect #8 (household economy), avant features.
2. Ajouter F5+F8 tot pour ne plus confondre CODE-ONLY et PASS.
3. F3/F4/F6 ensuite — ecarts visibles vs vision §9–10.
4. Ne pas reecrire marriage / pedigree / A45 housing (deja PASS) ; etendre consumers.

**Statut Agent 4 :** analyse complete — aucune modification de code de simulation. Livrable : ce fichier.
