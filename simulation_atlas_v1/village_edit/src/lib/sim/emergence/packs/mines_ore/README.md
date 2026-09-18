# Mines / ore - logic staging

Self-contained TypeScript for the causal mine chain used by life scenarios:

**prospect (terrain richness) -> sticky known mouth -> mining / ore stocks -> forge-smith demand nearby**

No World tick edits, no nature renderer edits, no day-timer biography scripts. Soft `MineLifeTag` (`Soare` | `generic`) only.

Path: `_staging/visual/mines_ore/logic/`

---

## Causal chain

| Step | API | Effect |
|------|-----|--------|
| 1 Discover | `tryProspectVein` / `prospectAndMaybeClaim` | `VeinKnowledge` + `vein_discovered` event from richness samples |
| 2 Sticky mouth | `claimMineMouth` -> `openMineMouth` | `KnownMineMouth` stays in bag; maps to `Village.hasMine` / `mineX` / `mineY` |
| 3 Extract | `extractAtMouth` | Rates (`dig*Yield`), vein drain, stockpile, `active_dig` / `mouth_depleted` |
| 4 Forge signal | `refreshForgeDemand` / `tickMinesOre` | `ForgeDemandSignal` + `forge_demand` when ore piles near mine without forge/smith |

---

## Public API (import from `./index`)

### Bag

- `createMinesOreBag()` / `ensureBag(bag?)` - `mouths`, `veins`, `events`, `forgeSignals`
- `MinesOreLogic` - bundled helpers for scenarios

### Discovery

- `localOreRichness(samples, cx, cy, radius?)` - same weighting idea as core `mining.localOreRichness`
- `tryProspectVein(bag, samples, opts)` - skill / profession / roll
- `prospectAndMaybeClaim(...)` - discover + sticky claim

### Mouths

- `claimMineMouth`, `openMineMouth`, `knownMouthsFor`, `villageMouth`, `findMouthNear`
- `villageMineFields(mouth)` -> `{ hasMine, mineX, mineY }`

### Extraction / stocks

- `digHpPerHit`, `digStoneYield`, `digIronYield`, `digGoldYield`, `digSideOreYield`, `digStaminaCost`, `canMineRock`
- `extractAtMouth(bag, opts)` -> `ExtractionResult` (pass `opensEntrance` when core `finalizeTunnelCell` reports entrance)
- `mouthOreStock`, `mouthVeinRemaining`, `takeFromStockpile`

### Forge demand

- `refreshForgeDemand(bag, { tick, forges?, smithCountByVillage? })`
- `forgeNeedDelta(bag, villageId)` - soft careers nudge (see core `careers.ts` forgeNeed)
- `suggestForgeSite(signal, prefer?)`

### Events (visual)

- `drainEvents(bag)` / `peekEvents(bag)` / `eventsSince(bag, tick)`
- Kinds: `mouth_opened` | `mouth_depleted` | `active_dig` | `vein_discovered` | `forge_demand` | `stock_threshold`

### Adapters

- `samplesFromGrid(gridView, opts?)` - read-only snapshot from WorldGrid-shaped buffers
- `applyVillageMineSync(village, villageMineFields(mouth))`
- Defaults: `TERRAIN_MOUNTAIN = 26`, `TERRAIN_TUNNEL = 27` (core `types.ts`); override via opts if needed

---

## Hook points - visual integrator

Do **not** edit nature renderer from this pack; wire from your visual/sim bridge:

1. **After sim tick (or dig resolution)**  
   `const ev = drainEvents(state.minesOre)`  
   Switch on `ev.kind`:
   - `mouth_opened` -> spawn / reveal mine-mouth prop at `(x,y)` (tunnel entrance / plank pad)
   - `active_dig` -> dig dust / pick VFX; `intensity` drives opacity / particles
   - `mouth_depleted` -> switch mouth sprite to spent / boarded look
   - `vein_discovered` -> optional prospect spark (subtle; not a surface ore pile)
   - `forge_demand` / `stock_threshold` -> UI ping or forge-site ghost marker near `(x,y)` within `FORGE_DEMAND_RADIUS`

2. **Sticky mouths for sprites**  
   Iterate `bag.mouths` where `status` in `claimed|open|active|depleted` - positions are stable across ticks (`MOUTH_STICKY`).

3. **Never invent surface ore piles** from `veinRemaining` - deposits stay underground (same rule as core `economy/deposits.ts`).

4. **Z-order** (nature coherence): terrain -> spoil/dirt -> mouth prop -> dig VFX -> canopy/buildings.

---

## Hook points - sim integrator

Wire into engine / behaviors **without** changing this staging folder's ownership of World tick:

1. **State**  
   Attach `minesOre: MinesOreBag` on sim state (or scenario bag). Seed with `createMinesOreBag()`.

2. **Sample deposits** (once per tick or when actors prospect)  
   ```ts
   const samples = samplesFromGrid(state.grid, {
     isDiggable: (x, y, t) => /* core isMountainFace / tunnel */,
     mountainCode: MOUNTAIN,
     tunnelCode: TUNNEL,
   })
   ```

3. **Prospect / claim** (replace or wrap soft claim near `findMineEntranceSite` in behaviors)  
   - On prospect / miner explore: `tryProspectVein` or `prospectAndMaybeClaim`  
   - On claim: `claimMineMouth` then `applyVillageMineSync(village, villageMineFields(mouth))`  
   - Prefer sticky `knownMouthsFor(actor)` as dig anchors (`anchorX/Y` like core `pickDigTarget`)

4. **Dig** (beside `mineTunnel` case in behaviors)  
   After a successful rock hit / around `finalizeTunnelCell`:  
   `extractAtMouth(bag, { tick, actorId, mouthId, toolTier, x, y, digHp, blastMining, opensEntrance })`  
   Apply `result.dug` to inventory; apply HP / tunnel open via **existing** `mining.ts`.  
   Set `opensEntrance: isEntrance` from `finalizeTunnelCell` so `mouth_opened` fires once.

5. **Economy / careers tick**  
   `tickMinesOre(bag, { tick, samples, forge: { forges, smithCountByVillage } })`  
   Fold `forgeNeedDelta(bag, villageId)` into forgeNeed (core already boosts when `hasMine && iron < 0.6`).

6. **Naming compatibility (core)**  

   | Staging | Core |
   |---------|------|
   | `hasMine` `mineX` `mineY` | `Village` |
   | `localOreRichness` | `mining.localOreRichness` |
   | `canMineRock` / `dig*Yield` / `digStaminaCost` | `mining.ts` |
   | `TUNNEL_ENTRANCE_AMOUNT` | `mining.ts` |
   | tasks `mineTunnel` / professions `miner` `blacksmith` | `types.ts` / `behaviors.ts` |

Staging keeps **copies** of rates/weights so the pack stays import-free from `src/lib`.

---

## Life scenario sketch (no biography timer)

```ts
const bag = createMinesOreBag()
const samples = samplesFromGrid(grid, { oreOnly: true /* + diggable pred */ })

const { vein, mouth } = prospectAndMaybeClaim(bag, samples, {
  tick, actorId, villageId, x: actor.x, y: actor.y,
  skill: 0.5, profession: 'miner', roll: rng(),
  claimOnDiscover: true,
})

if (mouth) {
  extractAtMouth(bag, {
    tick, actorId, mouthId: mouth.id, toolTier: 'stone',
    x: mouth.mountainX, y: mouth.mountainY, digHp: 8, opensEntrance: true,
  })
}

tickMinesOre(bag, { tick, samples, forge: { forges: [], smithCountByVillage: {} } })
const visual = drainEvents(bag) // -> visual layer
```

---

## Files

| File | Role |
|------|------|
| `types.ts` | OreAmounts, mouth, vein, events, bag |
| `constants.ts` | Rates / thresholds (core-compatible names) |
| `richness.ts` | Prospecting discovery |
| `mouths.ts` | Sticky mouths |
| `extraction.ts` | Dig yields + stocks |
| `forgeSignal.ts` | Nearby forge/smith demand |
| `events.ts` | Visual event queue |
| `adapters.ts` | Grid / village field bridges |
| `tick.ts` | Scenario-facing tick helpers |
| `index.ts` | Public exports |

## Out of scope

- World tick / `engine.ts` / nature `draw.ts` (integrator owns)
- Day-timer biography scripts
- Commits