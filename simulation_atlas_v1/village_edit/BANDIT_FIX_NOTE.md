# Bandit fix note

## What was wrong

1. **Camp teleport** — `endRaidToCamp` recentered `campX/campY` on the average position of raiders still in/near the village. The hideout jumped into the settlement; bandits then pathfind to that new camp (appear to teleport with it) and keep slaughtering in town.
2. **Magic plaza pressure** — Early unlock strongly preferred wilderness vagabond spawns; outcasts needed misery first, so bands often appeared as spawned war parties rather than deserters.
3. **Aggression** — Full band raids, long hunt radius, frequent cooldowns, and high fight hit rates made raids feel like spawn-and-wipe.

## What changed (`src/lib/sim/bandits.ts`)

- **Stable camp anchor** — Raid end only sets raiders to `flee` toward the existing camp; camp coordinates no longer follow members. Legacy camps inside the clear radius get one corrective wilderness relocate.
- **Emergence** — Prefer converting villagers (grievance, poverty, exile/migration urge, political outcast, failed ambition, crime memories, hunger without kin, famine). Deserters keep their tile and walk to camp (`phase: 'flee'`). Lone outcasts can join an existing band. Wilderness vagabonds are a rare fallback, always beyond `SETTLEMENT_CLEAR` (28).
- **Raids toned down** — Longer cooldown, partial raiding parties, shorter raids, steal-and-retreat bias, wounded flee, smaller early bands, reduced fight lethality.

French chronicle strings preserved.

## Verify

```bash
npx tsx scripts/_probe_bandits.ts 7 55
```

Manual: Nouveau monde → mid-game hors-la-loi as deserters/outlaws outside town; camp sprites stay put while brigands walk.
