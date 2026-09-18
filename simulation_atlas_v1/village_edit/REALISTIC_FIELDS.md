# Realistic fields

Profession-gated farming: blacksmiths, miners, guards, traders, millers, etc. do **not** claim personal plots. They eat via forage, trade, chest, and optional hungry harvest of ripe village wheat.

## Who can farm

- **farmer** — claims and sows
- **herder** — light claim while village fields are under half the cap
- **livelihood farm mix >= 0.32** — may claim
- **early generalists** (none / forager / builder, first 28 days) — may claim if village has 0 fields or 0 farmers (then usually become farmer)

## Field cap

- `FIELD_RADIUS = 4`
- Cap: ~1 per farmer household, floor 1, ceiling `min(members/6, 6)`
- Pioneer seed: one starter field per founding village (first cabin = farmer)

## Profession pressure

`farmerProfessionPressure` pushes farmer assignment when climate allows and the village lacks farmers, so forage/builder-heavy starts still grow wheat for mill -> flour -> bread.

## Files

- `src/lib/sim/fields.ts`
- `src/lib/sim/behaviors.ts`
- `src/lib/sim/construction.ts`
- `src/lib/sim/interactions.ts`

