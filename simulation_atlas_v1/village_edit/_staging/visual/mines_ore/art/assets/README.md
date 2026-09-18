# Assets — mines / ore (bank first)

**Do not ship new PNGs unless a bank key fails QA.** Prefer NatureAtlas slots already built in
`src/lib/render/nature/loader.ts` from:

- `src/assets/nature/tiles/*.png` (Puny World / named tiles)
- `src/assets/nature/source/block-texture-set/blocks/*.png` (CC0 block pack)
- Procedural fallbacks in `textureLab.ts` (`proceduralOre`, `proceduralBoulder`, `proceduralMountainFace`, ...)

See parent `../README.md` for the preferred key table and composition rules.

## Optional improved variants (only if needed)

If live QA shows ore as flat Minecraft stamps, drop **transparent** multi-cell sprites here and
register them as staging-only keys (integrator loads separately — **not** into live `loader.ts` yet):

| Suggested filename | Size | Purpose |
|---|---|---|
| `mine_mouth_2x2.png` | 32x32 | Full mouth silhouette (void + timber + rock cheeks) |
| `ore_pile_gold_2x1.png` | 32x20 | Soft mound with gold flecks |
| `ore_pile_iron_2x1.png` | 32x20 | Soft mound with iron flecks |
| `dig_scar_3x2.png` | 48x32 | Soft scar alpha matte (no hard tile edges) |

Until those exist, compose from atlas keys listed in the parent README.
