# war_scars — z-order contract

Stable painter order (bottom → top). Matches nature coherence: terrain → plants → ground objects → trunks → canopy → high props.

| Layer | z | Contents |
|-------|---|----------|
| 0 terrain | ground | meadow / farmland underlay (`grass_*`, `farmland`) |
| 1 scar ground | ground+ | scorched dirt tint, ash stipple, burned field patch |
| 2 soft plants | low | wilted wheat stubs, ash weeds (famine stress) — never full tree sprites cut by cell |
| 3 rubble base | mid | house rubble footprint, stone scatter, charred beams on ground |
| 4 fortify low | mid+ | palisade stakes / low wood wall segments (`wallTier: wood`) |
| 5 carts / goods | mid+ | refugee cart, spilled crates (`ActorGroundItem` if used) |
| 6 fortify high | high | stone wall tops, keep / donjon shell (`ActorKeep`) |
| 7 labels | overlay | optional FR labels at high zoom only (`bataille`, `ruine`) |
| 8 canopy | top | intact trees nearby — **full multi-cell canopy**, never half-tiles |

## Rules

- Scorch is a **ground tint**, not a second terrain cell stamp.
- Rubble is one **complete prop** (2×2 footprint OK) with silhouette + base shadow.
- Palisade segments face outward; posts sit on layer 4, any spike tips may bleed into 6.
- Refugee cart: wheels on layer 5, load cloth above wheels, no NPC body required.
- Do not draw ruined house as two grid-halves; if footprint >1 cell, use multi-cell prop like trees.