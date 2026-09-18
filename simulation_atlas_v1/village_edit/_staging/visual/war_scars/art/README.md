# war_scars / art

Composition recipes from **nature + block** assets. No live atlas writes.

## Source packs (existing)

- Puny World overworld (`punyworld-overworld-tileset.png`) — soft ground cues
- Block texture set — `dirt`, `gravel`, `oak_planks`, `cobblestone`, `cobblestone_mossy`, `farmland`, `hay_*`, log sides
- Nature procedural keys — `grass_*`, `wheat_1..5`, `tree_dead_*`, `farmland`

## Prop set

| propId | Footprint | Composition idea |
|--------|-----------|------------------|
| `burned_field_patch` | 2×2 ground | farmland + dark dirt tint + sparse `wheat_1` charred |
| `raid_scorch_wedge` | 1×1–2×2 | ash wedge (existing `drawRuinScar` raid look) + gravel flecks |
| `battle_ash_ring` | ~3 r | darker scorch + soft tent stubs at high intensity |
| `house_rubble` | 2×2 | plank shards + cobble pile + optional mossy cobble if ageDays>8 |
| `palisade_segment` | 1×N | oak log stakes + plank brace; stone tier → cobble bricks |
| `refugee_cart` | 2×1 | plank cart body + hay load + dark wheel discs |
| `famine_haze_flag` | soft | desaturate wheat / thin haze — **no rubble** |
| `clearing_ash` | 2×2 | dirt + gravel, no walls |

## Coherence checklist

- Complete silhouettes only (no grid-cut trees / half roofs)
- Scorch under props, props after ground
- Same world scale as houses / wheat (cart ≈ 1 villager long)
- Style: muted ash browns, not neon fire; moss on old ruins

## Game references (before ship)

Compare a crisis village shot to:

1. **Stardew Valley** — farm stress is crop state, not stamped burn tiles
2. **Factorio** — scars read as ground pollution / remnants, continuous
3. **RimWorld** — rubble + burned terrain as full cells/objects
4. **Puny World overworld** — soft props, round canopies
5. **RPG Maker overworld** — ruins as composed props, not MC cubes

Refuse: 16×16 Minecraft stamp, pond-U water, cut tree trunks, hyper-legible grid.

## Integrator

Map `propId` from `props.ts` → nature atlas compose or canvas path in `settlementView` / nature draw. Prefer tint + existing keys before new PNG.