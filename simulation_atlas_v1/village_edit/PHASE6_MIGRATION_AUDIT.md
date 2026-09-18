# PHASE6_MIGRATION_AUDIT — template (Agent D / A)

**Status :** STUB — a remplir (STEP1 audit only ; **no gameplay code** in this file)  
**Workspace :** `village_edit`  
**Owner cible :** Agent D (migration) + Agent A (instrumentation)  
**Baseline :** P5 leaves=**16** ; foundCamps=**3** ; CP5 leaves=**22** ; `migration_camp` npc **0/3 UNDER**  
**Master :** `PHASE6_CAUSALITY_MASTER.md` WP1

---

## Logs utilisateur

- [ ] Terminaux Cursor / app live consultes ?  
- [ ] Dumps lus : `_phase5_soak_s{1,3,7}.json`, `_phase5_soak_summary.json`  
- Notes :

---

## 1. Pipeline stages (file:line)

Tracer et citer :

| Stage | Compteur P5 (3 seeds) | Fichier / symbole | Notes |
|-------|----------------------|-------------------|-------|
| urge cross | 92 | | |
| leaveAttempt | 49 | | |
| leave | 16 | | |
| housed leave | 3 | | |
| homeless leave | 13 | | |
| travel | 13 | | |
| destEval | 50 | | |
| settlementAttempt | 3 | | |
| foundCamp | 3 | | |
| rejoin | 14 | | |
| fail | 36 | | |

Sources a lire : `politics.ts` (`tickMigration` / leave / foundCamp), `construction.ts` `foundMigrateCamp`, `migrationMetrics.ts`, `causalityMetrics.ts` migrate*, `sec22Evidence.ts` `migrateNpcCount`.

---

## 2. Bottleneck exact

**Hypothese primaire :** (urge | attempt | leave | travel | dest | settle | camp)

**Preuve :**

**Hypotheses secondaires :**

---

## 3. Regression leaves 22 → 16

| Item | CP5 | P5 | Delta |
|------|-----|----|-------|
| leaves | 22 | 16 | -6 |
| foundCamps | 2 | 3 | +1 |
| PASS §33 | PASS | PARTIAL | perte |

**ROOT CAUSE candidate :**

**Evidence (code + soak) :**

**Ce qui N'EST PAS la cause :** (ex. seuil harness baisse — interdit)

---

## 4. Pourquoi `migration_camp` npc UNDER (0/3)

- Floor : events >=5, NPC >=3, seeds >=3 (`sec22Evidence.ts`)
- P5 s7 : events OK (10/5) mais **npcs=0**
- Hypothese samples : `migrateNpcCount` non rempli / leave sans id NPC / path homeless sans camp sample

**ROOT CAUSE candidate :**

**FIX shape (mesure d'abord) :**

---

## 5. hasHome vs homeless (INC-04)

| Path | Comportement design | Compteurs P5 |
|------|---------------------|--------------|
| housed | secession foyer → `foundMigrateCamp` | housedLeave=3 ; camps=3 |
| homeless | travel → dest → rejoin|fail ; **pas** auto createCamp | homelessLeave=13 |

**Design intentionnel ?** OUI / NON / PARTIEL — justification :

**Si pioneer homeless souhaite :** contraintes (caps, pas CREATE_CAMP mass) :

---

## 6. Fiche ROOT CAUSE | FIX | FILES | REGRESSION | TEST

| Champ | Contenu |
|-------|---------|
| ROOT CAUSE | |
| FIX shape | (connexion emergente ; **interdit** `if leave: createCamp` systematique) |
| FILES | `politics.ts`, `construction.ts`, `migrationMetrics.ts`, … |
| REGRESSION risk | rejoin explosion ; camps spam ; food/prof ; polity stickiness |
| TEST | `TEST: P6-migrate-stages` / `CHAIN: urge→…→camp|rejoin` — EMERGENCE soak |

---

## 7. What NOT to do

- [ ] `CREATE_CAMP` / `CREATE_MIGRATE` pour floors
- [ ] Leave buff / threshold lower pour forcer PASS §33
- [ ] Raise clamp 120
- [ ] Harness tweak pour masquer npc UNDER
- [ ] Claim PASS sans soak naturel multi-seed

---

## 8. Verdict audit (a remplir)

| Question | Reponse |
|----------|---------|
| Bottleneck confirme ? | PENDING |
| Regression 22→16 expliquee ? | PENDING |
| npc UNDER explique ? | PENDING |
| Ready for WP2 instrument / WP3 fix ? | NO jusqu'a sections 2–5 completes |

---

*Stub PHASE6_MIGRATION_AUDIT.md — remplir avant tout fix gameplay migrate.*