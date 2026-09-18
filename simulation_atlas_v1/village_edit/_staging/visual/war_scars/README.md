# war_scars — visual integrator hooks

Staging pack for **war / bandit / revolt scars**: burned fields, ruined houses, post-attack fortification, famine stress flags, rubble / palisades / refugee carts.

Producers only. **Do not edit live `src/`.** Integrator merges into nature engine + snapshot actors.

## Live name map (peek only)

| Live module / symbol | Role for scars |
|----------------------|----------------|
| `warTypes.PolityWar` | Open / skirmish war intensity + battles |
| `WarStatus` | `skirmish` \| `open` \| `ended` |
| `WarCause` | `territory` \| `scarcity` \| `raid_revenge` \| `rivalry` \| `succession_spill` |
| `CoupRecord` / `tryRecordCoup` | Revolt / legitimacy shock → ruin / stress |
| `bandits.Band` / `BanditPhase` | `camp` \| `raid` \| `flee`; `lastRaidTick` |
| `Village.crisisPhase` | `stable` \| `crisis` \| `collapse` \| `rebuild` |
| `Village.wallTier` | `none` \| `wood` \| `stone` (palisade → stone) |
| `BuildPurpose` `fortify` | Emergency keep after declareWar |
| `snapshot.ActorRuin` | Existing kinds: `ruin` \| `raid` \| `clearing` \| `battle` |
| `snapshot.ActorKeep` | Fortify scaffolds / donjon |
| `state.famine` / `feelFamine` | Famine stress flag source |
| `SettlementStage` | camp → city (ruin density scales down as stage rises) |
| `migrationUrge` / `deserters` | Refugee cart spawn cue |

## Event → renderer handoff

Logic exports `ScarEvent[]` (`logic/types.ts`). Art binds each `ScarEventKind` to a prop recipe (`art/props.ts`). Integrator should:

1. Emit / collect scars from war battles, band raids, crisisPhase, fortify projects, famine feel.
2. Prefer extending `ActorRuin` (+ optional new overlay list) rather than inventing a parallel world layer.
3. Draw via nature ground tint + complete props (see `art/z-order.md`).
4. Age scars with `ageDays` / intensity fade (moss on old ruin already in `drawRuinScar`).

### Suggested ActorRuin mapping

| ScarEventKind | ActorRuin.kind (or new overlay) |
|---------------|----------------------------------|
| `battle_scar` | `battle` |
| `raid_scar` | `raid` |
| `house_ruined` | `ruin` |
| `field_burned` | overlay `scorch` (new) or tint under `raid` |
| `clearing_scar` | `clearing` |
| `fortify_raised` | drive `ActorKeep` / wall cells, not ruin |
| `famine_stress` | soft flag on civ blob / village (not rubble) |
| `refugee_depart` | prop `refugee_cart` near road / edge |

## Files

| Path | Owner |
|------|--------|
| [`logic/README.md`](./logic/README.md) | Causal chains |
| [`logic/types.ts`](./logic/types.ts) | Local types + export shape |
| [`logic/events.ts`](./logic/events.ts) | Catalog + staging emit helpers |
| [`art/README.md`](./art/README.md) | Composition + game refs |
| [`art/props.ts`](./art/props.ts) | Prop recipes from nature/build tiles |
| [`art/z-order.md`](./art/z-order.md) | Layer contract |

## Out of scope (this pack)

- Combat AI, new polity rules, day-scripted disasters
- Editing `src/lib/sim/war.ts` / `bandits.ts` / nature atlas
- Committing — leave unstaged for human review