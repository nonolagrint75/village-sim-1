# bandit_parallel (staging) — life types **Daren**, **Kael**

Isolated causal pack: **poverty → migration → unemployment → crime → gang → hierarchy → loot → bounty → authority hunt → faction deal → branching outcomes**.

Do not import World / engine / SimulationCanvas from this pack. Integrator merges + syncs with existing `bandits.ts` / `Band` / `Bandit` if desired.

## Public API

- `createGang` / `recruitToGang` / `promoteMember` / `ensureOrganizerHierarchy`
- `outlawAttraction` / `combinePressure` / `shouldAttemptCrime`
- `pettyTheft` / `attemptAmbush` / `gangAmbushPower` / `trainAmbushSkill`
- `fenceLoot` / `parallelEconomySnapshot`
- `postBounty` / `startAuthorityHunt` / `huntPressure`
- `chooseEncounterAction` / `resolveEncounter` / `applyFactionDeal` / `tryPoliticalIntegration` / `destroyGang`
- `tickParallelGang` (optional orchestrator)
- `selfTestBanditParallel`

## Causal chain

| Stage | Mechanism |
|-------|-----------|
| Poverty / debt / bad harvest | `OutlawPressure` + `outlawAttraction` |
| Migration / unemployment | Integrator fills pressure fields from migration + jobs |
| Petty crime | `pettyTheft` / recruit |
| Gang + hierarchy | `createGang` → roles recruit→thief→ambusher→lieutenant→chief |
| Ambush skill | `attemptAmbush` trains best organizer (**Daren**) |
| Loot + parallel economy | `fenceLoot` → localSupport / localHate / zoneControl (**Kael**) |
| Bounty | `postBounty` when notoriety/raids high |
| Authority hunt | `startAuthorityHunt` + `resolveEncounter` |
| Faction deal | `applyFactionDeal` / negotiate branch |
| Outcomes | flee / fight win-lose / truce / military_force / political_integration |

## Hook points

| When | Call |
|------|------|
| **Villager desertion / outcast** (existing bandit convert) | Build `OutlawCandidate` from wealth, famine, unemployment, debt; `createGang` or `recruitToGang` |
| **Each day / tick** | `tickParallelGang(gang, { tick, roll, candidates, ambushTarget, authorityId, authorityStrength, factionOffer })` **or** call modules piecemeal |
| **Trade caravan on route** | `attemptAmbush(gang, { kind:'caravan', wealth, escortStrength, ref }, tick, roll)` — wire near `tradeAmbushes` in core |
| **After successful loot** | `fenceLoot` then bump village theft counters / black market |
| **Village security / polity response** | If `shouldPostBounty`, `postBounty` + `startAuthorityHunt` using council/guard strength |
| **Rival polity / coup faction** | Pass `factionOffer` into `resolveEncounter` or `applyFactionDeal` |
| **Politics tick** | On `political_integration` / `integrated` phase → create Circle / absorb members as irregular militia |
| **Deaths** | On `fight_lose_dead` / `member_dead` call core `onDeath` / bandit kill credits |

### Sync with core `bandits.ts`

Suggested (integrator):

1. Keep `ParallelGang` as extension bag `state.parallelGangs`
2. Mirror `memberIds` ↔ `state.bandits` positions/phases
3. Prefer this pack for hierarchy, bounty, faction deals; keep core for pathfinding/raid movement

## Branch outcomes (`BranchOutcome`)

- `flee_success` / `flee_caught`
- `fight_win` / `fight_lose_dead` / `fight_lose_captured`
- `negotiate_truce` / `negotiate_faction_deal`
- `military_force` / `political_integration`
- `ongoing`

## SELF_TEST

```ts
import { selfTestBanditParallel, BANDIT_PARALLEL_SELF_TEST_NOTES } from './index'
console.log(selfTestBanditParallel())
```

## Non-goals

- No age/day biography scripts for Daren/Kael  
- No edits to `world.ts` / `engine.ts` / canvas from this pack  
