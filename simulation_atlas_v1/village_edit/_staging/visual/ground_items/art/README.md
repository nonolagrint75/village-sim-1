# Ground items — art (§57)

Compose props from the **existing nature bank** (`src/assets/nature` + procedural atlas keys in `loader.ts`). Prefer better bank usage over new style.

## Bank keys used

| Kind | Primary keys | Files / source |
|------|--------------|----------------|
| wood_pile | `fallen_log`, `tree_stump` | `tiles/fallen_log.png`, procedural log/stump |
| food_pile | `hay`, `wheat_3`, `mushroom` | `hay.png`, `wheat_*.png`, `mushroom.png` |
| ore_pile | `rock`, `pebbles`, `ore_iron` / `ore_gold` | `rock.png`, procedural ore |
| tool_discard | thin `fallen_log` + `pebbles` / `stone_block` | compose handle+head |
| bag | `dirt_dark` + `hay` | sack silhouette |
| loot_goods | `plank_oak` + `fallen_log` | block pack planks |
| coin_spill | `pebbles` + `ore_gold` | flecks |
| trade_crate | `plank_oak`, `plank_pine`, `hay` | crate body |

## Draw hooks

- Replace / extend `drawGroundItem` in `settlementView.ts` **or** push props in nature `draw.ts` LOOT branch using `GROUND_PROP_RECIPES`.
- Snapshot: extend `ActorGroundItem` with `kind`, `resource`, `freshness` from `exportGroundActors`.
- Z: see `z-order.md` — ground layer after plants, before canopy.

## References (visual check)

Stardew floor items, Factorio ore/wood piles, RimWorld chunks, Puny World overworld props — refuse MC 16×16 stamp crates.
