# Audit partagé village-sim (nolan-work)

Les deux agents écrivent ici. Ne pas corriger le code tant que la synthèse n’est pas faite.

## Convention
- Ajouter sous `## Findings` des blocs :
```
### [ID] titre court
- Agent: A|B
- Domaine: visuel|fonctionnel|lesdeux
- Sévérité: critique|majeur|mineur
- Preuve: …
- Attendu (idée Nolan): …
- Observé: …
```

## Findings

### [B1] Close-up DF mort au zoom défaut
- Agent: B
- Domaine: visuel
- Sévérité: majeur
- Preuve: `SimulationCanvas` appelle `drawCloseupTerrain` si `tileS >= 5.5` ; or `drawCloseupTerrain` fait `if (tileS < 7) return`. `DEFAULT_ZOOM = 2`, `TILE_PX = 3` → `tileS = 6`. Détail structures/meubles exige encore `tileS >= 10` (`detail`).
- Attendu (idée Nolan): terrains/bâtiments/meubles lisibles style DF Premium en vue de jeu normale.
- Observé: au zoom par défaut, le pass close-up est invité puis no-op ; maisons/meubles/arbres riches n’apparaissent qu’après zoom manuel (~≥2.33, détail ≥~3.33).

### [B2] Bitmap orbite ignore les glyphs 3×3 de TILE_ART
- Agent: B
- Domaine: visuel
- Sévérité: majeur
- Preuve: `tilePixel32` / `PACKED_BASE` n’utilisent que la couleur `base` (+ bruit) ; les tableaux `detail` de `TILE_ART` ne sont peints que dans `drawGroundMaterial` / close-up meubles.
- Attendu (idée Nolan): silhouettes de tuiles riches même depuis l’orbite (commentaire tileArt « crisp tile silhouettes »).
- Observé: monde distant = aplats teintés ; lit, coffre, mur, foyer, etc. perdent leur motif jusqu’au close-up (lui-même rare, cf. B1).

### [B3] Portrait clic = pastille HSL, pas le sprite équipé
- Agent: B
- Domaine: visuel
- Sévérité: majeur
- Preuve: `SimPanel` `Portrait` → `.sim-avatar` avec `background: hsl(hue…)` seulement ; stats/équipement/cognition en texte OK (`equipment`, `cognition`).
- Attendu (idée Nolan): clic villageois → portrait montrant aussi sexe/barbe/équipement visibles (comme sur la carte).
- Observé: le panneau est informatif, mais l’avatar ne reprend ni silhouette, ni barbe, ni layers gear de `entityArt`.

### [B4] Villageois embarqués : sexe / barbe / coiffure non transmis
- Agent: B
- Domaine: visuel
- Sévérité: majeur
- Preuve: `SimulationCanvas` → `drawEmbarkedVillagerSprite({ hue, pigmentation, hairTone, selected })` seulement ; `drawVillagerSprite` reçoit bien `sex`, `beard`, `hairStyle`, `gear`.
- Attendu (idée Nolan): équipement/sexe/barbe visibles sur les sprites.
- Observé: à bord, traits d’apparence et gear disparaissent du rendu (régression visuelle vs villageois à pied).

### [B5] Anneaux « défrichement » fixes + texte panneau trompeur
- Agent: B
- Domaine: lesdeux
- Sévérité: majeur
- Preuve: canvas `r = Math.max(8, 18 * TILE_PX * zoom)` autour de `vg.centerX/Y` (rayon fixe 18 tuiles) ; `SimPanel` section « Défrichement » affirme que ces anneaux marquent la frontière de défrichement. `perimeter` est packé dans le draw frame mais non utilisé pour l’anneau.
- Attendu (idée Nolan): civilisation qui transforme la nature — clairières/champs lisibles, anneaux clairs fidèles à l’emprise réelle.
- Observé: halo cosmétique constant ; peut ne pas coller aux champs/routes/murs réels ; la UI vend une sémantique fausse.

### [B6] tradeLinks packés mais jamais dessinés
- Agent: B
- Domaine: lesdeux
- Sévérité: majeur
- Preuve: `packDraw` remplit `tradeLinks` depuis `state.tradeRoutes` ; `DrawFrame` / `viewRef` les déclarent ; `SimulationCanvas` ne lit/n’utilise jamais `tradeLinks` (seul init `[]`).
- Attendu (idée Nolan): marqueurs / lecture civ (commerce) sur la carte.
- Observé: réseau caravanes invisible ; seul le compteur « Voyages marchands » côté panneau.

### [B7] Sites sacrés = overlays flottants, pas tuiles monde
- Agent: B
- Domaine: visuel
- Sévérité: mineur
- Preuve: `maybeFoundShrine` pose `shrineX/Y` + flags sans changer le terrain ; rendu via `drawSacredSite` (sprite) + label FR.
- Attendu (idée Nolan): bâtiments / lieux sacrés lisibles comme le reste du bâti (transformant le sol).
- Observé: autel/chapelle/temple flottent au-dessus du biome ; pas le même langage visuel que HOUSE/WALL/PLANK.

### [B8] Keeps/châteaux : silhouettes rect basiques
- Agent: B
- Domaine: visuel
- Sévérité: mineur
- Preuve: boucle `keeps` dans `SimulationCanvas` — deux `fillRect` gris/beige ; contraste avec close-up maisons (chaume, joints pierre) dans `tileArt`.
- Attendu (idée Nolan): keeps lisibles, DF-ish / réalistes.
- Observé: marqueurs « Lego » distincts du style tuile Premium ; utiles mais peu immersifs.

### [B9] Feu de camp brigand sans glow nocturne
- Agent: B
- Domaine: visuel
- Sévérité: mineur
- Preuve: `drawBanditCampSprite` peint un feu décoratif ; `drawLocalLightGlows` ne consomme que `lights` packés, `HEARTH` terrain, et `holdingLight` villageois.
- Attendu (idée Nolan): night fire glow pour les feux.
- Observé: camps de bandits n’éclairent pas la nuit (foyers intérieurs / torches oui si day-night ON).

### [B10] Fuites EN dans le portrait FR
- Agent: B
- Domaine: visuel
- Sévérité: mineur
- Preuve: `SimPanel` — `Creed : …` / `Sans creed` ; ligne métier avec préfixe littéral `hint ` ; `legacy_` → `hint·`.
- Attendu (idée Nolan): UI en français.
- Observé: jargon anglais visible dans le portrait.

### [B11] Anneaux polity vs clairière : même langage cercle
- Agent: B
- Domaine: visuel
- Sévérité: mineur
- Preuve: villages = dash ring beige ; polities = fill+stroke or/brun ; les deux centrés sur capital/village.
- Attendu (idée Nolan): marqueurs camps/keeps/sites/clairières distincts et clairs.
- Observé: chevauchement possible de plusieurs cercles concentriques → lecture « qui est quoi » confuse au zoom moyen.

### [B12] Plafonds markers : keeps≤12, polities≤16
- Agent: B
- Domaine: fonctionnel
- Sévérité: mineur
- Preuve: `packDraw` — `keeps: keeps.slice(0, 12)`, `polities: polities.slice(0, 16)`.
- Attendu (idée Nolan): panels + carte montrent royaumes/châteaux émergents.
- Observé: mondes denses peuvent omettre des keeps/claims sur la carte alors que les stats panneau les comptent encore.

### [A1] Moisson jamais déclenchée malgré champs mûrs
- Agent: A
- Domaine: fonctionnel
- Sévérité: critique
- Preuve: `npx tsx scripts/diagnose-survival.ts 7 60 15` → `harvestWheat starts=0` ; `npx tsx scripts/_probe_food_economy.ts 7 50` → dès ~j9 `ripe` monte (19→120+) et `wheatTiles`~110–135, mais `harvest=0` chaque jour jusqu’à j50 ; stocks `wheat` baissent (126→53) sans moisson.
- Attendu (idée Nolan): les humains cultivent et récoltent (farm loop).
- Observé: semis (`sowField` USED) et blé mûr sur la carte, mais la tâche `harvestWheat` ne part jamais ; la boucle ferme→récolte→farine/pain est cassée côté comportement.

### [A2] Chaîne farine / pain / moulin absente en run
- Agent: A
- Domaine: fonctionnel
- Sévérité: majeur
- Preuve: même diagnose seed=7 j60 — `grindFlour`, `bakeBread`, `harvestWheat` UNUSED ; final `flour=0 bread=0` ; meat/fish=0.
- Attendu (idée Nolan): craft alimentaire médiéval (meunerie, pain) et diversification nourriture.
- Observé: économie alimentaire reste baies + blé starter consommé ; pas de transformation.

### [A3] Mortalité mid-run (pas de wipe j1) — pop qui s’effondre après ~j45–60
- Agent: A
- Domaine: fonctionnel
- Sévérité: majeur
- Preuve: `diagnose-instant-death` 8 graines × 10j → 0 morts j1 ; diagnose seed7 : j45 alive=31 deaths=0, j60 alive=24 deaths=7 ; `audit-civilization --seeds 1,7 --days 60` : seed7 d60 pop 17 (+11/−15), seed1 pop 22 (+9/−5) ; rapport d90 antérieur seed7 fin pop~8.
- Attendu (idée Nolan): survie & développement ; pas de wipe day-1 ; famine mid-run si encore cassée à noter.
- Observé: fondation OK ; mortalité nette mid-run encore nette (coïncide avec pression nourriture / brigands ~j40+).

### [A4] Mobilier planifié mais quasi jamais construit (tables)
- Agent: A
- Domaine: lesdeux
- Sévérité: majeur
- Preuve: probe seed=7 j40 — `homes=9` multi-pièces OK (`avgRooms`~4.56, roomKinds hall/chambre/atelier/cuisine…), mais `tables=0`, `furnitureQueueLeft=96`, `buildBed/buildTable/buildFur starts=0` ; `eatWithTableTicks=0`.
- Attendu (idée Nolan): maisons multi-pièces **et** mobilier utilisé (manger à table, etc.).
- Observé: layout multi-pièces OK ; file de jobs mobilier s’accumule sans `buildTable` effectifs ; lits/coffres de base partiels (beds=8 chests=8) mais pas de vraie vie intérieure (table).

### [A5] Craft d’équipement médiéval (`craftGear`) jamais choisi
- Agent: A
- Domaine: fonctionnel
- Sévérité: majeur
- Preuve: diagnose seed7 j60 `craftGear starts=0` ; probe j40 `craftGear starts=0` ; `craftIronTool`/`gatherIron`/`mineTunnel` UNUSED ; tools wood→déclin (20→7), iron=0.
- Attendu (idée Nolan): gear médiéval crafté (slots + sprites).
- Observé: portraits peuvent montrer du gear porté (worn~26, prestige moyen bas ~0.14 — vêtements de base), mais la filière craft/forge/minerai ne s’enclenche pas.

### [A6] Forts / donjons ouverts rarement achevés
- Agent: A
- Domaine: fonctionnel
- Sévérité: majeur
- Preuve: `audit-civilization` seed1 d60 `fort 0o2`, seed7 `fort 1o1` ; `_probe_fort.ts 7 60` → `fortBuilt=0`, `fortOpen=1`, `buildProjectTicks=166`, `fortDoneLog=0` ; murs village `wallTier` stone/wood **FIRES**.
- Attendu (idée Nolan): châteaux/murs visibles et aboutis.
- Observé: enceintes villageoises progressent ; projets fort/keep restent souvent bloqués en phase ouverte.

### [A7] Inventions techniques sans enseignement + absentes du panneau Royaume
- Agent: A
- Domaine: lesdeux
- Sévérité: majeur
- Preuve: `_probe_tech.ts 7 45` → `inventCount=10`, knowledge villager/village peuplée, mais `teachCount=0` ; `SimPanel.tsx` — section « Techniques » uniquement dans le portrait sélectionné, pas de section Royaume/Société agrégée inventions/savoirs village.
- Attendu (idée Nolan): tech inventions visibles dans l’émergence civilisationnelle (panels).
- Observé: émergence privée OK ; diffusion sociale (enseigner) morte ; UI civ ne surfait pas les inventions au niveau village/royaume.

### [A8] Creeds monoculture — seule voie « piété / honorer le sacré »
- Agent: A
- Domaine: fonctionnel
- Sévérité: mineur
- Preuve: civ audit seed1/7 `creedIds {"piete":…}` ; `_civ_audit_v6` note d’autres creedIds jamais vus ; labels toujours « honorer le sacré ».
- Attendu (idée Nolan): religions émergentes diversifiées.
- Observé: autels→chapelles/temples **firing**, mais contenu creed unique.

### [A9] Chronique UI tronquée (120 lignes) — brigands / jalons civ disparaissent
- Agent: A
- Domaine: lesdeux
- Sévérité: majeur
- Preuve: `social.ts` `if (state.log.length > 120) state.log.shift()` ; civ audit seed1/7 `chronicle bandit=0` alors que `bands 2` et `_probe_bandits` raids=3/thefts=10 ; formation logue (`hors-la-loi` / `bande`) mais le buffer Chronique ne conserve que ~120 lignes.
- Attendu (idée Nolan): Chronique montre religions, bandits, royaumes, etc.
- Observé: panneaux Royaume/Société packent bien stats bandes/foi ; la Chronique perd l’historique mid-run — sensation « rien ne s’est passé » pour les brigands.

### [A10] Guildes rares / souvent invisibles dans la fenêtre 30–60j
- Agent: A
- Domaine: fonctionnel
- Sévérité: mineur
- Preuve: `audit-civilization` d60 — guilds RARE (1/2 seeds, total=3) ; Société affiche compteur `Guildes` (`SimPanel`).
- Attendu (idée Nolan): guildes émergentes visibles.
- Observé: code `promoteToGuild` existe ; peu de runs atteignent des guildes stables avant la baisse de pop.

### [A11] Absorption territoriale / guerre civile soft jamais observées
- Agent: A
- Domaine: fonctionnel
- Sévérité: mineur
- Preuve: civ audit d60 — NEVER `territory / absorption`, NEVER `civil war (deferred soft)` ; kingdoms/chiefdoms RARE mais présents (seed7 k2 à j60).
- Attendu (idée Nolan): royaumes/polities qui s’étendent et s’affrontent.
- Observé: polities/kingdoms peuvent émerger ; pas d’absorption ni guerre civile dans la fenêtre testée.

### [A12] Budget tâches dominé par socialise/rest vs travail productif
- Agent: A
- Domaine: fonctionnel
- Sévérité: mineur
- Preuve: diagnose seed7 top starts `socialise:4744, rest:2908, gatherFood:1640, gatherWood:722, clearLand:520` — harvest/craftGear/mining à 0.
- Attendu (idée Nolan): rythme de vie (manger, dormir, farm, craft, défricher) avec travail utile.
- Observé: social/repos écrasent ; contribue aux boucles cassées (moisson, mobilier, gear).

### [A13] Commerce fonctionne mais métier « trader » souvent à 0
- Agent: A
- Domaine: fonctionnel
- Sévérité: mineur
- Preuve: `_probe_trade.ts 7 45` — `tradeRunsTotal` 2→12, markets 2→4, routes 1→3, coins↑ ; mais `traders:0` à chaque checkpoint.
- Attendu (idée Nolan): trade + métiers marchands visibles.
- Observé: caravanes/routes émergent sans profession trader affichée (livelihood vs profession désalignés).

### [C1] Torche / chandelle allumées ≠ glow nocturne
- Agent: C
- Domaine: lesdeux
- Sévérité: critique
- Preuve: `behaviors.ts` `lightTorch` consomme `torch` + pose `torchLitUntil` ; `placeCandle` consomme candle/lampe + `homeLightUntil`. `snapshot.packDraw` → `holdingLight: carriedLightKind(inventory)` (`lighting.ts` : seulement items `torch`/`candle` en sac). Canvas glow (`SimulationCanvas` ~755) utilise `holdingLight` + `lights` packés + tuiles `HEARTH`, pas `torchLitUntil` / `homeLightUntil`. `carriedLightKind` ignore `lantern` / `oil_lamp` alors que `personalLight` (`lightWarmth.ts`) les compte.
- Attendu (idée Nolan): feu/lumière (torches, foyers) lisibles la nuit, alignés sur l’état sim.
- Observé: allumer une torche **éteint** le glow (item disparu) ; porter une torche non allumée peut briller ; chandelle foyer sans glow dédié ; lanterne gameplay sans rendu.

### [C2] Âtres meubles toujours « en feu » visuellement
- Agent: C
- Domaine: visuel
- Sévérité: majeur
- Preuve: `packDraw` pousse `pushLight(…, 'hearth')` pour tout `homeFurniture` id `hearth` sans lire `hearthLitUntil` ; `collectTerrainHearths` scanne toute tuile `HEARTH`. Gameplay : `hearthIsLit` / `tendHearth` gèrent `hearthLitUntil`.
- Attendu (idée Nolan): night fire glow pour les feux **allumés**.
- Observé: âtres placés / tuiles foyer illuminent même éteints ; l’attisage n’a pas de signature visuelle.

### [C3] Effets mobilier définis mais jamais branchés (tub / social)
- Agent: C
- Domaine: code
- Sévérité: majeur
- Preuve: `furniture.ts` `homeWashCare` (tub) et `homeSocialBonus` (table/banc) exportés ; `behaviors.ts` importe `homeWashCare` sans aucun appel ; `homeSocialBonus` zéro référence hors définition. (Lits/âtre/métier à tisser/dîner : `restSleepBonus` / `homeWarmthClo` / `homeWeaveMul` / `homeDineMul` OK.)
- Attendu (idée Nolan): mobilier utile (wash / social).
- Observé: `buildWashingTub` / bancs peuvent s’installer ; bonus gameplay morts. Étend A4 (file mobilier + utilité incomplète).

### [C4] API `placeableFurnitureTypes` orpheline
- Agent: C
- Domaine: code
- Sévérité: mineur
- Preuve: `furniture.ts` `placeableFurnitureTypes()` — seule occurrence dans le repo (aucune UI / editor / worker).
- Attendu (idée Nolan): catalogue mobilier branché au jeu ou à un outil.
- Observé: surface d’intent never-called.

### [C5] `proposeStructureFromReasons` jamais appelée
- Agent: C
- Domaine: code
- Sévérité: mineur
- Preuve: symbole exporté `cognition/buildHooks.ts` + re-export `cognition/index.ts` ; aucun call site. Construction réelle via `maybeProposeConstruction` / `enqueueBuildProject` (politics, religion).
- Attendu (idée Nolan): intent libre raisons → projet.
- Observé: API morte ; chemin deep-think / institutions OK à côté.

### [C6] `cognitiveTaskModifier` exporté, jamais utilisé
- Agent: C
- Domaine: code
- Sévérité: mineur
- Preuve: défini `cognition/tick.ts` (~444) ; commentaire « flee/etc. still need a mult » ; seul export `cognition/index.ts`. `chooseTask` passe par `pickTaskByPolicy` / `cognitiveFactorProduct` directement.
- Attendu (idée Nolan): modifiers cognition sur toutes les décisions critiques.
- Observé: wrapper mort ; softmax principal branché, pas ce helper.

### [C7] Brigands : seuil j48 vs vision ~j40
- Agent: C
- Domaine: fonctionnel
- Sévérité: mineur
- Preuve: `bandits.ts` `BANDIT_START_DAY = 48` ; brief Nolan « bandits ~j40 ».
- Attendu (idée Nolan): pression hors-la-loi ~j40.
- Observé: soft gate +6 jours ; câblage `tickBandits` dans `engine.ts` OK. Lié A3 (pression mid-run).

### [C8] Ethnies / langues absentes des onglets civ agrégés
- Agent: C
- Domaine: fonctionnel
- Sévérité: mineur
- Preuve: `state.ethnies` / `languages` + `tickEthnosWorld` ; `packEthnosSummary` digéré dans `identity.diasporaNote` (portrait). `SimPanel` Société : cultures tags / creeds / lignées — pas de liste ethnies/langues. `packUi` ne packe pas `ethnies`.
- Attendu (idée Nolan): ethnogenèse lisible dans les panels civilisation.
- Observé: système vivant ; UI civ ne le surfait qu’en note portrait.

### [C9] Confirmations / croisements A·B (audit code)
- Agent: C
- Domaine: lesdeux
- Sévérité: mineur
- Preuve: relecture `behaviors` / `snapshot` / `SimPanel` / `SimulationCanvas` / `engine`.
- Attendu (idée Nolan): cohérence audits.
- Observé:
  - Confirme A1 : `harvestWheat` câblé (`chooseTask` ~2252+, `tryAssignFoodSeek`) — pas un import mort ; échec runtime / priorité (voir A12).
  - Confirme A4 : layouts `buildHouseLayout` OK ; file `planFurnitureJobs` ; effets tub/social morts (C3).
  - Confirme A5 : `add('craftGear')` + `craftAndEquipGear` présents — non dead-code ; non choisi en run.
  - Confirme A7 : section Techniques portrait-only (`SimPanel` ~1035) ; `teachCraft`→`doTeachCraft`→`teachKnowledge` câblé mais teachCount runtime 0.
  - Confirme A13 : `tradeRuns` / `tryFoundMarket` / `tradeRoutes` OK ; profession `trader` distincte du livelihood.
  - Confirme B1 (close-up `tileS>=5.5` vs `drawCloseup` `<7` no-op ; `DEFAULT_ZOOM=2`).
  - Confirme B3 (avatar HSL `sim-avatar`, pas `entityArt`).
  - Confirme B5 (texte « Défrichement » `SimPanel` ~470–472 ; anneau rayon fixe canvas).
  - Confirme B6 (`tradeLinks` packés, canvas init `[]` seulement).
  - Confirme B9 (feu camp bandit décoratif hors `lights`) ; Étend B9 via C1/C2 (pipeline lumière globale).
  - Confirme B10 (`Creed` / `hint` EN dans portrait FR).
  - Pas de findings A à invalider ; aucun A* dupliqué comme nouveau bug isolé.

### [C10] WebGPU softmax = stub CPU permanent
- Agent: C
- Domaine: code
- Sévérité: mineur
- Preuve: `kernels/brainGpu.ts` `batchSoftmaxSelect` retourne toujours `backend: 'cpu'` ; `decide.ts` type `'cpu' | 'webgpu'`.
- Attendu (idée Nolan): cognition CPU aujourd’hui (OK) sans fausse promesse runtime.
- Observé: chemin unique CPU ; label webgpu jamais atteint (documenté dans commentaires, surface type encore duale).

## Synthèse (parent — A+B+C croisés)

Sources: [Audit A](f6345822) · [Audit B](18bfbeed) · [Audit C](992c0ac1). Aucun finding A invalidé par C.

### Critiques (à corriger en premier)
1. **A1** — `harvestWheat` ne part jamais (champs mûrs) → boucle ferme cassée
2. **C1** — torche/chandelle allumées ≠ glow nuit (`torchLitUntil` / `homeLightUntil` ignorés)

### Majeurs
3. **A2** — farine/pain/moulin absents en run  
4. **A3** — mortalité mid-run (~j45–60)  
5. **A4** + **C3** — file mobilier bloquée + bonus tub/social morts  
6. **A5** — `craftGear` jamais choisi  
7. **A6** — forts/keeps rarement achevés  
8. **A7** — inventions sans teach + absentes Royaume  
9. **A9** — Chronique tronquée à 120 lignes  
10. **B1** — close-up DF mort au zoom défaut  
11. **B2** — orbite ignore glyphs 3×3  
12. **B3** — avatar portrait ≠ sprite  
13. **B4** — embarqués sans sexe/barbe/gear  
14. **B5** — anneaux défrichement trompeurs  
15. **B6** — `tradeLinks` jamais dessinés  
16. **C2** — âtres toujours allumés visuellement  

### Mineurs
17. A8 creed monoculture · A10 guildes rares · A11 pas d’absorption/guerre · A12 social>travail · A13 trader=0  
18. B7–B12 sites sacrés overlay, keeps Lego, feu bandit, EN portrait, cercles confus, caps markers  
19. C4–C8 APIs mortes, bandits j48, ethnies UI · C10 webgpu stub  

### Ordre de correction proposé
A1 → C1/C2 → A4/C3 → A5 → A2 → A9 → B1/B2 → B6/B5 → B3/B4 → A6/A7 → mineurs

### [A2-BRAIN] Mild-cold wantShelter forced daytime rest AFK
- Agent: A
- Domaine: fonctionnel
- Severite: critique (fixe)
- Preuve: `wantShelter` + `tryAssignSurvivalTask` used `cold > 0.4` / `coldStress01 > 0.5` to HARD-assign rest and abort outdoor labor; probe-afk seed7 day rest~26%; post-fix fresh day rest 0.4%.
- Attendu (idee Nolan): decisions state+env via factors; rest when tired/exposed.
- Observe: script override on mild chill; fixed to coldDanger/freezeRisk + clo deficit; comfort naps gated in chooseTask/needsFactor.
