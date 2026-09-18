# war_scars / logic

Causal scar signals for the visual integrator. Local types only (no core imports).

## Causal chains (emergent)

```
PolityWar battle (applyBattleConsequences)
  → field trampling / surplus wheat shock
  → ScarEvent field_burned + battle_scar on capital
  → prosperity drop → crisisPhase crisis|collapse
  → house_ruined / famine_stress
  → declareWar already queues fortify → fortify_raised

Band raid (startRaid / lastRaidTick)
  → raid_scar at camp + target village
  → stolen food → local famine_stress
  → survivors migrationUrge → refugee_depart

Coup / revolt (CoupRecord, legitimacy shock)
  → raid_scar or house_ruined near capital
  → optional fortify_raised if wallTier still none

crisisPhase rebuild
  → scars age (ageDays↑), intensity↓
  → rubble stays until rebuildProgress high; moss via age
```

## Export for renderer

`ScarEvent` is the unit of work. Integrator folds into snapshot:

- spatial: `x`, `y`, optional `villageId` / `polityId` / `warId` / `bandId`
- visual: `kind`, `intensity` 0–1, `ageDays`
- provenance: `source` (`war` \| `bandit` \| `revolt` \| `famine` \| `rebuild`)

See `events.ts` for catalog + pure helpers (`scarFromWarBattle`, `scarFromBandRaid`, …).

## Do not

- Spawn scars on calendar day thresholds
- Mutate live `SimState` from this folder
- Draw pixels here — that is `art/`