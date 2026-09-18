# Staging: `military_dynasty`

**Life type:** Arvid (farmer->guard -> bandit trauma -> militia lead -> war faction -> land inherit -> military dynasty)
**Status:** isolated pack — integrator wires; no core imports.
**Scenario:** S36 Military dynasty
**Cross-links:** `military_defection`, `bandit_parallel`, `succession_civil`

## Causal chain

farmer to guard -> bandit trauma -> militia leadership -> war faction loyalty -> land inherit after victory -> children enter military -> dynasty prestige

## Exports

| Symbol | Role |
|--------|------|
| `tryFarmerToGuard` | Career pivot after threat |
| `applyBanditTrauma` | Raid trauma -> militia pull |
| `tryMilitiaLead` | Form/lead militia circle |
| `noteWarFaction` | Link to war / defection faction |
| `tryLandInherit` | Victory land grant |
| `tryMilitaryHeir` | Child inherits military track |
| `tickMilitaryDynasty` | Prestige maintenance |
| `militaryDynastyStats` | Probe snapshot |

## Integrator hook points

1. **Career** — threat / raid response: `tryFarmerToGuard`.
2. **Trauma** — bandit victim (`bandits.ts`): `applyBanditTrauma`.
3. **Militia** — threat circle leadership: `tryMilitiaLead`.
4. **War** — war participants / `military_defection`: `noteWarFaction`.
5. **Land** — polity reward after war: `tryLandInherit`.
6. **Heir** — birth/coming of age with parent military: `tryMilitaryHeir`.
7. Tick beside politics / war.

## Name map (peek-only)

- `bandits.ts`, `war.ts`, `politics.ts` threat circles
- `military_defection` faction phases
- family / lineage inheritance

## Out of scope

No `src/` edits, no day scripts, no UI.