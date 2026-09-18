# Activity tools — art (§20)

Make work readable: **held tool + target cue + progress arc**, using nature bank keys + existing character draw.

## Bank / draw sources

| Cue | Atlas / module |
|-----|----------------|
| farmland / wheat stages | `farmland_*`, `wheat_1..5`, `hay` |
| chop stump / logs | `tree_stump`, `fallen_log` |
| mine face / ore | `mountain_face`, `ore_iron`, `ore_gold`, `pebbles` |
| craft / crate | `plank_oak`, `plank_pine` |
| agent + tool | `entityArt.ts` (fleck, `drawTaskActivity`, `drawGearWeapon`) |

## Integrator draw path

1. From `exportActivityActors`, find villager sprite draw.
2. Replace static head arc with `progressArcAngles(progress)`.
3. Color by `ACTIVITY_OVERLAYS[family].arcColor`.
4. Blit one target cue at (`targetX`,`targetY`) on ground_cue layer when zoom ≥ 0.45 and phase is active.
5. Keep far-zoom pip (§20 LIVE soft) — do not remove.

## Visual refs

RimWorld work icons, Factorio miner arm, Stardew tool swing — refuse floating emoji-only activity.
