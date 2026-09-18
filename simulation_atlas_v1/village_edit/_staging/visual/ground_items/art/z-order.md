# Ground items — z-order

Stable stack (nature engine):

1. **terrain** — grass / dirt / LOOT underlay
2. **ground_scar** — dig scuff / spill stain (optional, soft)
3. **small_plant** — grass_tuft / flower (never replace piles)
4. **ground_item** ← this pack (wood, bags, food, ore, tools, crates)
5. **prop_mid** — bushes, stumps taller than piles
6. **trunk / foliage** — trees overflow above
7. **buildings / NPCs**

## Rules

- Piles are **complete objects** (silhouette + base on ground). Never half a crate cut by cell edge — use footprint scale ≥1 when amount high.
- Do **not** draw piles as flowers (`draw.ts` LOOT currently uses rock/log — keep rock/log family, add plank/hay composition).
- Amount text label only at zoom ≥ 0.55 (optional); silhouette must read without text.
