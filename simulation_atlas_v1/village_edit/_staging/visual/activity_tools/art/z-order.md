# Activity tools — z-order

1. **terrain / farmland / mountain face** (target underlay)
2. **ground_cue** — harvest sheaf, dig scar, stump chips (at target cell)
3. **ground_item** — related piles (see ground_items pack)
4. **agent body** — existing villager sprite
5. **agent_tool** — held axe/pick/hoe/hammer overlay (swing offset by lastSwingTick)
6. **progress_arc** — arc above head filled by progress 0..1
7. **far_pip** — when zoom < ~0.35, replace arc with 2px pip

## Pose hints (no new sprite sheet required)

- **approach**: tool down, arc dim
- **active**: tool angled toward target (±12° pulse on tool_swung)
- **recover**: tool upright brief
- **complete**: arc full flash one tick then clear

Reuse `entityArt.drawTaskActivity` / `drawGearWeapon` — extend, do not fork a second character renderer.
