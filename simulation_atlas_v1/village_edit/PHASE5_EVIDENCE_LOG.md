# PHASE5_EVIDENCE_LOG

**Owner :** AGENT 1 — ORCHESTRATEUR
**Workspace :** `village_edit`
**Date ouverture :** 2026-09-17
**Statut :** STEP6–7 DONE — soak + validation livres ; GLOBAL NON DECLARE
**Regle :** attribution != causalite ; canal MECHANISM vs EMERGENCE separe ; aucun PASS sans seuil + preuve.

---

## Mode d emploi

Chaque preuve STEP3 ajoute un bloc :

```
TEST: <id-court>
CHAIN: <A -> B -> C>
CANAL: EMERGENCE | MECHANISM
SEED/JOURS: ...
AVANT: ...
APRES: ...
DELTA: ...
VERDICT_BLOC: PARTIAL | CONNECTION_NOT_PROVEN | NOT_TESTED | (PASS seulement si seuils mission)
NOTES: ...
```

Ne pas convertir PARTIAL -> PASS sans formats mission.

---

## Index prevu (vide jusqu a STEP3)

| TEST id | DP | Statut |
|---------|----|--------|
| P1-mem-cf | DP1 | WIRED (smoke flips>0 ; acceptance PENDING) |
| P2-emo-cf | DP2 | WIRED (smoke flips>0 ; acceptance PENDING) |
| P3-pers-pairs-natural | DP3 | WIRED (pairs 0.933; flips 0 UNDER; acceptance PENDING) |
| P4-teach-skill-reuse | DP4 | WIRED (true chain counters; short smoke teach=0; acceptance PENDING) |
| P5-prof-explain | DP5 | WIRED (multi-factor counters; acceptance PENDING) |
| P6-miller-coherence | DP6 | DESIGN_DOCUMENTED (GRIND_OPEN_TASK / WONTFIX_DESIGN) |
| P7-leave-camp-stages | DP7 | WIRED (stages+housed/homeless; short smoke leaves=0; acceptance PENDING) |
| P8-help-defend-labor | DP8 | WIRED (labor>0; defend opp/taken measured; acceptance PENDING) |
| P9-eco-shock-controlled | DP9 | WIRED (MECHANISM TEST SETUP; acceptance natural §32 PENDING) |
| P10-antiloop | DP10 | WIRED (seq counters; short smoke; acceptance PENDING) |
| P11-creed-2gen-instrument | DP11 | WIRED (peer npc fix PARTIAL; culture gen=0 NOT_TESTED short smoke; acceptance PENDING) |
| P12-sec22-formats | DP12 | WIRED (per-priority CHAIN+floors; short smoke; acceptance PENDING) |
| soak-compare-cp5 | Soak | PENDING |

---

## Blocs (a remplir)

<!-- STEP3 append below -->


```
TEST: P12-sec22-formats
CHAIN: per-priority A->B (mem|emo|pers|learn|family|price|belief|help|migrate) + floors >=20/>=15/>=5 / >=3 NPC / >=3 seeds
CANAL: EMERGENCE
SEED/JOURS: seed=7 / days=8 (short smoke)
AVANT: sec22Status=PARTIAL global counters only ; mission floors not labeled ; help/family/migrate NPC under-measured
APRES: priorityLabels mem/emo/pers/price/belief/help=PARTIAL ; learning/family/migrate=NOT_TESTED ; underFloors listed ; helpNpc=11 ; family=0 ; missionFloorsMet=false ; decisionExact=6509 ; chainBlocks x9
DELTA: DP12 evidence upgrade LIVE ; no fake events ; no PASS ; single-seed floors UNDER honest
VERDICT_BLOC: PARTIAL (instrumentation + floors labeled ; never PASS ; STEP6 soak required)
NOTES: DONE CODE; acceptance PENDING; next STEP6 soak compare CP5
```


```
TEST: P11-creed-2gen-instrument
CHAIN: parent_belief -> spread|crystallize|shrine -> child_creed_match -> child_task_followup (-> later gen)
CANAL: EMERGENCE
SEED/JOURS: seed=7 / days=12 (short smoke)
AVANT: creed peer npcs hardcoded 0 → CNP; generational chains unmeasured
APRES: peer changes=71 followups=14 npcCount=44 chain=PARTIAL; culture transmissions=0 childBehavior=0 genDepthMax=0 gen2/3=0 chain=NOT_TESTED; births=0; decisionExact=10814
DELTA: instrumentation LIVE; no CREATE_CREED; no birth creed force; short smoke honest 0 gens
VERDICT_BLOC: NOT_TESTED (culture 2-gen) / PARTIAL (peer followup label fix only — never PASS)
NOTES: DONE CODE; acceptance PENDING; long soak required for gen>0
```


```
TEST: P10-antiloop
CHAIN: kind_run_length->break_or_persist (>7j / >14j stuck; variation 30d; secondary goal when survival stable)
CANAL: EMERGENCE
SEED/JOURS: seed=7 / days=12 (short smoke)
AVANT: sequences NOT_TESTED (WP8 damp only; no day-seq counters)
APRES: seqNpcTracked=100; variationPct=0.97; stuckLoop14dPct=0; longestSameLoopDays=12; uniqueDaySequences=96; secondaryGoalStablePct=0.693 (588/849); dayOcc teach/social/rest=481/15/985; dampApps=8; decisionExact=10892
DELTA: instrumentation LIVE; farm multi-day excluded from stuck; light teach/social damp max ~32%
VERDICT_BLOC: PARTIAL (instrumentation + short smoke; never PASS; 30d soak required for §40 targets)
NOTES: DONE CODE; acceptance PENDING; no fake entropy; no softmax rewrite
```


```
TEST: P9-eco-shock-controlled
CHAIN: shock->decision->supply/demand->price (->taskShift|professionShift)
CANAL: MECHANISM
SEED/JOURS: seed=7 / warmDays=4 / daysAfter=8 (short smoke)
SETUP: TEST SETUP wheat stock cut only (surplus+inventories); beginPriceShock(P9-wheat-stock-cut)
DELTA: shock wheat 415->0; decisionsAfter=9354; shockDeltas=178 task=34 prof=44; priceNpc=51; priceΔ wheat/flour/bread +1.8/+4.1/+1.4
VERDICT_BLOC: PARTIAL (MECHANISM only; never EMERGENCE PASS)
NOTES: natural soak untouched; harness sec32_natural_price vs sec32_controlled_shock; acceptance natural §32 PENDING
```


```
TEST: P1-mem-cf-s1-t18
CHAIN: goodSpot -> placeMemoryFactor DeltaU -> kind_flip gatherFood|buildProject
CANAL: MECHANISM
SEED/JOURS: seed=1 / day=0 tick=18
AVANT: ChosenActionBefore=gatherFood utilBefore=18.79 (memory live) ; runnerUp=buildProject
APRES: ChosenActionAfter=buildProject utilAfter=16.41 (place-memory spots ablated)
DELTA: argmax flip ; spotKind=good ; memoryCausalFlips++
VERDICT_BLOC: PARTIAL
NOTES: measure-first dual score in pickTaskByPolicy ; no scripting ; acceptance PENDING (short smoke, memorable 3/50 UNDER)
```

```
TEST: P1-mem-cf-s1-t20
CHAIN: goodSpot -> placeMemoryFactor DeltaU -> kind_flip gatherFood|gatherWood
CANAL: MECHANISM
SEED/JOURS: seed=1 / day=0 tick=20
AVANT: ChosenActionBefore=gatherFood utilBefore=24.79
APRES: ChosenActionAfter=gatherWood utilAfter=17.12
DELTA: argmax flip ; spotKind=good
VERDICT_BLOC: PARTIAL
NOTES: same NPC 50 ; natural path ; smoke totals flips=16 uses=358 retrievals=358
```

```
TEST: P1-mem-cf-smoke-summary
CHAIN: mem_encode -> retrieve -> material_use -> causal_flip|stable
CANAL: MECHANISM
SEED/JOURS: seed=1 / 6 days / decisionExact=5095
AVANT: n/a (aggregate)
APRES: memoryCausalFlips=16 ; memoryMaterialNoFlip=342 ; memoryUses=358 ; memoryRetrievals=358 ; memoryMemorableEvents=3 ; memoryAttributedDebug=348
DELTA: floors retrievals/uses/flips OK ; memorable UNDER (3/50)
VERDICT_BLOC: PARTIAL
NOTES: CODE DONE ; PASS not claimed ; harness sec25 gated on memoryCausalFlips not attributed volume
```

---

```
TEST: P2-emo-cf-s1-t272
CHAIN: emotionTaskBias -> emotionsFactor DeltaU -> kind_flip rest|buildProject
CANAL: MECHANISM
SEED/JOURS: seed=1 / day=3 tick=272
AVANT: ChosenActionBefore=rest utilBefore=358.48 (emotion live) ; runnerUp=buildProject
APRES: ChosenActionAfter=buildProject utilAfter=289.60 (emotionTaskBias ablated)
DELTA: argmax flip ; emotionCausalFlips++
VERDICT_BLOC: PARTIAL
NOTES: measure-first dual score in pickTaskByPolicy ; emotions factor only ; no fear:flee scripting ; acceptance PENDING
```

```
TEST: P2-emo-cf-s1-t272-b
CHAIN: emotionTaskBias -> emotionsFactor DeltaU -> kind_flip rest|harvestWheat
CANAL: MECHANISM
SEED/JOURS: seed=1 / day=3 tick=272
AVANT: ChosenActionBefore=rest utilBefore=2387.48
APRES: ChosenActionAfter=harvestWheat utilAfter=1904.83
DELTA: argmax flip ; NPC 30
VERDICT_BLOC: PARTIAL
NOTES: natural path ; farm harvest still reachable under emotion ablation (no farm/mill break)
```

```
TEST: P2-emo-cf-smoke-summary
CHAIN: emotion_event -> emotionTaskBias material -> causal_flip|stable
CANAL: MECHANISM
SEED/JOURS: seed=1 / 6 days / decisionExact=5095
AVANT: n/a (aggregate)
APRES: emotionCausalFlips=63 ; emotionMaterialNoFlip=2368 ; emotionUses=2431 ; emotionChanges=3373 ; emotionAttributedDebug=1422 ; memoryCausalFlips=15 (DP1 intact)
DELTA: floors changes/uses/flips OK
VERDICT_BLOC: PARTIAL
NOTES: CODE DONE ; PASS not claimed ; harness sec26 gated on emotionCausalFlips not attributed volume
```

---

```
TEST: P3-pers-cf-s1-pair-4-5
CHAIN: natural_traits_distant + similar_context -> task_histogram_delta
CANAL: EMERGENCE
SEED/JOURS: seed=1 / 6 days
AVANT: NPC4 mode=rest hist (n=21)
APRES: NPC5 mode=buildHouse hist (n=13) ; traitDist=2.73 contextDist=0.147 histDist=1.136
DELTA: personalityPairDivergent++
VERDICT_BLOC: PARTIAL
NOTES: natural matched pair; no trait rewrite
```

```
TEST: P3-pers-cf-smoke-summary
CHAIN: trait_prior|courage_place -> CF_argmax ; natural_pairs -> hist_delta
CANAL: MECHANISM
SEED/JOURS: seed=1 / 6 days / decisionExact=5095
AVANT: n/a
APRES: personalityCausalFlips=0 ; personalityMaterialNoFlip=783 ; personalityUses=783 ; pairSamples=78 ; pairReady=2347 ; pairDivergent=2190 (ratio 0.933) ; attributedDebug=148 ; memFlips=15 emoFlips=63
DELTA: divergent ratio OK (>=0.5) ; causalFlips UNDER (0/10) — honest measure
VERDICT_BLOC: PARTIAL
NOTES: CODE DONE ; PASS not claimed ; no artificial trait rewrite
```

---

```
TEST: P4-teach-skill-reuse-smoke-summary
CHAIN: teachCraft -> skillDelta(skillBefore/After) -> pendingReceipt -> laterUse(kind) / teachTrueLaterUses
CANAL: MECHANISM
SEED/JOURS: seed=1 / 6 days / decisionExact=5095
AVANT: n/a (aggregate)
APRES: teachEvents=0 ; teachSkillChanges=0 ; teachLaterUsesProxyDebug=0 ; teachTrueLaterUses=0 ; teachNpcCount=0 ; teachChain=NOT_TESTED
DELTA: instrumentation wired (pending ring + decisionExactId samples) ; short smoke insufficient for organic teach volume
VERDICT_BLOC: NOT_TESTED
NOTES: CODE DONE ; acceptance PENDING ; no teach spam / become-skilled scripting ; social-as-default excluded from true chain unless productive skill really dripped
```

```
TEST: P5-prof-explain-smoke-summary
CHAIN: assignProfession layers -> applyProfessionChange -> factor tags -> professionChangesMultiFactor
CANAL: MECHANISM
SEED/JOURS: seed=1 / 6 days / decisionExact=5095
AVANT: n/a (aggregate)
APRES: professionChanges=48 ; professionChangesMultiFactor=48 ; explainableShare=1.0
DELTA: instrumentation wired (foodNeed/demand/skills/personality/location/previousExperience); materiality=8 score pts; target share 0.7 measure-only
VERDICT_BLOC: PARTIAL
NOTES: CODE DONE ; acceptance PENDING ; short smoke mostly buildHouse/firstAssign farmer crystallize; no hungry->farmer scripting ; decision path unchanged ; soak later for >=70% bar
```

---

```
TEST: P6-miller-coherence-smoke-summary
CHAIN: mill_present -> grind_by_prof -> miller_alive?
CANAL: EMERGENCE
SEED/JOURS: seed=7 / 12 days
AVANT: millerPeakAlive=0 misread as grind bug
APRES: grindLabel=GRIND_OPEN_TASK ; harvestStarts=370 grindStarts=172 bakeStarts=81 ; grindByProfession farmer:15 none:125 forager:25 lumberjack:7 ; millerAlivePeak=0 ; nonFarmFields=0 ; foodChainLive=true
DELTA: design confirmed intentional open task (no profession===miller gate; farmer jobBonus 2.15x; no softProfession miller)
VERDICT_BLOC: CONNECTION_NOT_PROVEN (miller profession) / food chain LIVE
NOTES: acceptance DESIGN_DOCUMENTED / WONTFIX_DESIGN ; food_chain@d10 cum harvest=523 grind=1305 bake=159 nonFarmFields=0 ; no createProfession miller ; farmer lock preserved ; never PASS on millerPeak
```

```
TEST: P7-leave-camp-stages-smoke-summary
CHAIN: urge -> leaveAttempt -> leave -> travel -> destEval -> settlementAttempt -> camp|rejoin|fail
CANAL: EMERGENCE
SEED/JOURS: seed=3 / 12 days
AVANT: foundCamp only if hasHome; ~20/22 leavers homeless -> rejoin (INC-04); camps 2/22 soak
APRES: migrateHomelessLeave=0 migrateHousedLeave=0 migrateTravelStarts=0 migrateDestEvals=0 migrateSettlementAttempts=0 migrateFoundCamps=0 migrateRejoins=0 migrateFails=0 ; urgeCrosses=1 ; blockedBy zeros ; settleBlockReasons ready (no_home design)
DELTA: stage counters WIRED; design documented homeless leave->rejoin intended; no auto createCamp; no leave-rate buff
VERDICT_BLOC: CONNECTION_NOT_PROVEN (short window leaves=0)
NOTES: DONE CODE ; acceptance PENDING ; never PASS from smoke ; decisionExact=65446 ; camp=hearth secession only
```

```
TEST: P8-help-defend-labor
CHAIN: situation(ward+threat) -> perception -> relation/willingness -> help_defend|labor|build -> action -> outcome
CANAL: MECHANISM
SEED/JOURS: seed=7 / 12 days (also seed=1 / 20d)
AVANT: labor=0 (dead ternary inside buildProject); defend=0 starts (fight/flee hard monopolize)
APRES: helpEvents labor=10 build=91 haul=3 teach=403 defend=0 ; defendHelpOpportunities=0 defendHelpTaken=0 ; farm harvest=199 grind=121 bake=105
DELTA: labor=clear/sow assist for others; build=buildProject wall phase for others; hard engage may set defend+recordHelp when willing ward; opp/taken counters wired
VERDICT_BLOC: PARTIAL (labor LIVE; defend situations rare in short smoke — fight/flee dominate without ward)
NOTES: DONE CODE ; acceptance PENDING ; never PASS ; no CREATE_RAID ; farm intact ; seed1/20d labor=3 build=30 defend still 0/0
```

```
TEST: STEP6-natural-soak-100x60x3
CHAIN: multi-system Phase5 counters vs CP5 (no induce)
CANAL: EMERGENCE
SEED/JOURS: seeds=1,3,7 / 60 days / pop=100
AVANT: CP5 exact=650960 PASS_RATE=10% (sec28+sec33) ; CF flips=0 ; teachTrue n/a ; help cats=4 ; creed gen NT ; leaves=22
APRES: exact=665091 ; memCF=1731 emoCF=5432 persCF=2181 ; teachTrue=223 ; profMF share=1.0 ; leaves=16 foundCamps=3 ; help cats=6 (defend=18 labor=17) ; creedGen2=46 ; sec22 PARTIAL x3 missionFloorsMet=false (migration_camp npc UNDER) ; PASS_RATE=5% (1/20=sec28) ; sec33 PARTIAL
DELTA: causal instrumentation LIVE ; regression leaves volume loses sec33 PASS ; food_chain s7/20j harvest/grind/bake LIVE
VERDICT_BLOC: PARTIAL (GLOBAL NON DECLARE)
NOTES: STEP6 DONE ; STEP7 PHASE5_CAUSALITY_VALIDATION.md ; clamp 120 unchanged ; never invent GLOBAL PASS
```

*Fin PHASE5_EVIDENCE_LOG.md — STEP6–7 soak*

