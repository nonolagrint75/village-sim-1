# Pack: ground_items (scorecard §57)

**Goal:** objects on the ground from work / combat / trade — drop, pickup, decay — drawn as complete nature props.

| Side | Path | Role |
|------|------|------|
| Logic | `logic/` | bag + events + decay |
| Art | `art/` | atlas composition recipes |

## Integrator hooks (nature engine target)

1. **Sim** — call `drop*` / `pickupGroundItem` / `tickGroundDecay` from behaviors (chop leftover, death, raid, trade spill). Keep wood piles synced with `isWoodPile` grid amount.
2. **Snapshot** — upgrade `ActorGroundItem` beyond `{x,y,amount}` using `exportGroundActors`.
3. **Draw** — nature prop pass or `drawGroundItem`: blit `GROUND_PROP_RECIPES` layers; z = ground_item.
4. **Do not** spawn decorative piles without `GroundSource`.

## Live files to touch later (integrator only)

- `src/lib/sim/behaviors.ts` — emit sites
- `src/lib/sim/snapshot.ts` — `ActorGroundItem`
- `src/lib/sim/settlementView.ts` — `drawGroundItem`
- `src/lib/render/nature/draw.ts` — LOOT prop branch
- `src/lib/render/nature/loader.ts` — keys already exist; compose only

Producers do **not** edit live `src/`.
