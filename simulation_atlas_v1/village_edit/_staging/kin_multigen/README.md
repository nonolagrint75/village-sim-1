# `kin_multigen` - ordinary kinship rewrites society

**Life types:** **Ayan**, **Nara**, parts of **Eren** / **Mira**  
**Not:** day-timer biographies. Structural causal helpers only.

## Thesis

Ordinary multi-child households -> kids enter different professions (merchant / guild / soldier / farmer / religion / artisan) -> marriage merges firms -> 50-100y multi-city kin graph -> political crisis splits descendants -> secret aid vs enmity -> branch outcomes (ruin / rich / dead / institution control). Boring lives still reshape polities via kinship networks.

## Layout

| File | Role |
|------|------|
| `types.ts` | Ids, tracks, graph, crisis, outcomes, horizon constants |
| `kinshipGraph.ts` | Graph create / birth / marriage / reach / household seed |
| `professionDivergence.ts` | Inheritance vs sibling niche divergence |
| `firmMarriage.ts` | Score + apply firm merge on spouse bond |
| `crisisKin.ts` | Faction split, cross-faction kin, secret aid / enmity |
| `branchOutcomes.ts` | Branch residue after long horizons |
| `lineageStats.ts` | Probe stats + `meetsMultigenHorizon` / `societyRewriteSignal` |
| `index.ts` | Public barrel |

## Export table (integrator)

| Symbol | When to call |
|--------|----------------|
| `createEmptyKinGraph` | Once per world / probe bag |
| `registerKinBirth` / `seedOrdinaryHousehold` | After core `registerBirth` / household form |
| `registerKinMarriage` | After `formBond` / `tickMarriage` success |
| `chooseProfessionTrack` + `pickCoreProfession` | Youth career pick; bias or post-`computeProfessionChoice` |
| `scoreFirmMarriageMerge` / `applyFirmMergeLocal` | After marriage if both own `BusinessRecord` |
| `createCrisis` -> `splitDescendantsAcrossFactions` | Political shock (war, coup, creed schism) |
| `collectCrossFactionKin` -> `resolveCrossFactionStances` | Same pulse; then `adjustRelation` / aid transfers |
| `secretAidTransferHint` | When executing covert kin support |
| `evaluateBranchOutcome` / `computeLineageHorizonStats` | Chronicle / probe / dynasty panel |
| `meetsMultigenHorizon` / `societyRewriteSignal` | Emergence honesty gates (50-100y, multi-city) |

## Hooks into existing core (names only - do not edit from this pack)

| Core module | Symbols | Wire idea |
|-------------|---------|-----------|
| `src/lib/sim/family.ts` | `registerBirth`, `tickLineages`, `Lineage`, `Family`, `packFamilySummary`, `createLineage` | Mirror births into graph; use `lineageId` / `familyId` as pack ids |
| `src/lib/sim/marriage.ts` | `tickMarriage`, `formBond`, `bondedPartner` | On bond: `registerKinMarriage` + firm merge score |
| `src/lib/sim/social.ts` | `Relation.kinship`, `relationWith`, `adjustRelation`, `shareFamilyTrauma` | Map edge weights <-> kinship; secret_aid / enmity -> trust/grudge |
| `src/lib/sim/politics.ts` | `ensureKinship`, circles, `isGuild` | Crisis factions; institution_control <-> guild/council |
| `src/lib/sim/professionFactors.ts` | `computeProfessionChoice`, `Profession` | Map `KinProfessionTrack` via `TRACK_TO_CORE_PROFESSION` |
| `src/lib/sim/economy/business.ts` | `BusinessRecord`, `findBusinessesByOwner`, `tickFirms` | Firm merge retire/create records |
| `src/lib/sim/engine.ts` | lineage / marriage / firm pulses | Cadence for graph maintenance + crisis ticks |
| `src/lib/sim/societyCycle.ts` | lineage reputation / dynasties | Feed horizon stats into dynasty counters |

### Id mapping

- `PersonId` <-> `Villager.id`
- `LineageId` <-> `Villager.lineageId` / `Lineage.id`
- `FamilyId` <-> `Villager.familyId` / `Family.id`
- `VillageId` <-> `Villager.villageId`
- `FirmId` <-> `BusinessRecord.id`
- `FactionId` <-> integrator string (circle id, polity id, or war side)

## Probe checklist (Ayan / Nara)

1. Seed ordinary household with >=3 children (`seedOrdinaryHousehold`).
2. Diverge tracks (`chooseProfessionTrack`) - `siblingTrackEntropy` > 0.
3. Marry across tracks; optional firm merge.
4. Spread members across >=2 `villageId`s over long soak.
5. Fire crisis; observe split + secret_aid/enmity edges.
6. `meetsMultigenHorizon` true around 50y+; `societyRewriteSignal.ok` when entropy + multi-city + residue.

## Contract

Pure-ish, typed, no core imports, no React/engine, no day-timer bios. Integrator owns wiring.