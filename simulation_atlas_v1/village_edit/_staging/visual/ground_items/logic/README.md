# Ground items — logic (§57)

Staging only. Causal drop / pickup / decay for objects on the ground tied to **work, combat, trade** — not decorative toys.

## Live name map (peek only)

| Staging | Live (`src/lib/sim`) |
|---------|----------------------|
| `wood_pile` | `isWoodPile` — DIRT/GRASS + `grid.amount` (`world.ts`) |
| `loot_goods` / coin | terrain `LOOT` (=7) + amount; `dropCarriedGold` in `behaviors.ts` |
| `ActorGroundItem` | `snapshot.ts` — today `{x,y,amount}` only |
| `drawGroundItem` | `settlementView.ts` — brown crate rect (to replace) |
| nature LOOT prop | `draw.ts` — `fallen_log` / `rock` |

## Public API

- `createGroundItemsBag()`
- `dropGroundItem` / `dropFromWorkChop` / `dropFromCombatDeath` / `dropFromTradeSpill` / `dropFromRaid`
- `pickupGroundItem`
- `tickGroundDecay`
- `exportGroundActors` → typed overlay for snapshot

## Causal emit sites (integrator)

1. **Work chop/clear** — leftover wood after `gatherWood` / `clearLand` / `relocateWoodPile` → `dropFromWorkChop`
2. **Mine haul abandon** — ore left at mouth when carry full → `ore_pile` + `work_mine`
3. **Harvest overflow** — wheat/food can't fit inventory → `food_pile` + `work_harvest`
4. **Combat death / raid** — inventory + tool on corpse tile → `dropFromCombatDeath` / `dropFromRaid`
5. **Trade spill** — failed haul / cart break / market overflow → `dropFromTradeSpill`
6. **Pickup** — gather/haul tasks at cell with pile → `pickupGroundItem` then add inventory
7. **Decay** — once per tick (or every N): `tickGroundDecay`

## Events for renderer

`item_dropped | tool_left | pile_grew | item_picked | item_decayed | item_merged`

Each event: `tick, x, y, itemKind, resource, amount, intensity`.

## Anti-toy rules

- No spawn without a causal source enum.
- Merge same cell+kind+resource up to `GROUND_MERGE_CAP`.
- Perishables lose amount; wood/ore/tools fade but linger.
