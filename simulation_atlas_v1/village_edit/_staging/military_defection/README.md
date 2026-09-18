# Staging: `military_defection`

**Life types:** Jonas (loyal soldier → grief/defection core), Arvid (officer / faction lead)  
**Status:** isolated pack — integrator wires; no core imports.

## Causal chain

loyalty → friend death → supply failure → officer discontent → military faction → refuse repress → civil war command → political offer choice

## Exports

| Module | Role |
|--------|------|
| `types.ts` | Faction, offers, hints, events |
| `loyalty.ts` | Loyalty, grief, supply, officer discontent |
| `faction.ts` | Phase machine + repress/war/offer |
| `index.ts` | Public surface |

## Integrator hook points

### 1. Seed loyal unit (Jonas)

- **Where:** threat circles / garrison / soldiers assigned to polity (`politics` threat kind, war participants).
- Tag `lifeTag: 'Jonas'` for high-loyalty ranker; `'Arvid'` for officer.
- `seedLoyalUnit(polityId, soldiers, tick)` once per polity garrison track.

### 2. Friend death

- **Where:** `handlePoliticalDeath` / battle casualties in `war.ts` / bandit victim with witness in same unit.
- Build `FriendDeathHint` (bond from relation); `onFriendDeath(faction, soldiers, hint)`.

### 3. Supply failure

- **Where:** village food stress, firm pay failure, polity treasury empty, missing weapons.
- `onSupplyHint` with low `supplyLevel` → phase `supply_stress`.

### 4. Officer discontent → faction

- On polity / war tick: `tryOfficerDiscontent` then `tryFormMilitaryFaction`.
- Optional: map faction members to a `Circle` kind `threat` with low legitimacy toward ruler.

### 5. Refuse repression (link to labor_revolt)

- **Where:** same call site as labor `applyRepression` — when authority orders soldiers to crush protest.
- `resolveRepressOrder(faction, hint, roll)`.
  - `'refuse'` → labor pack army_refuses; skip soldier repress tasks; maybe `state.deserters++` path.
  - `'obey'` → labor crushed path / legitimacy bump.

### 6. Civil war command

- On refuse + rival polity or succession: create `PolityWar` via war module; `enterCivilWarCommand(faction, warId, tick)`.
- Bias war cause toward `'succession_spill'` / `'rivalry'`.

### 7. Political offer choice

- Challenger or incumbent sends `PoliticalOffer` (`amnesty` | `promotion` | `land` | `rival_command` | `exile`).
- `makePoliticalOffer` → `resolvePoliticalOffer` (auto from attractiveness vs loyalty, or UI/agent bias later).
- Outcomes: `defected` / `stayed_loyal` / `broken` — update polity membership, desertion counters, chronicle via `logCause`.

### 8. Tick

- `tickMilitaryFaction(f, { tick, roll, warHeat })` alongside `tickPolityWars`.

## Cross-pack note

`labor_revolt.applyRepression` army obedience should read from this pack’s faction phase (`refuse_repress` ⇒ low armyObedience). Integrator owns the glue; packs stay import-free of each other for now (or soft-duplicate the obedience number).

## Probe tips

- Loyal baseline event before any grief.
- No `defected` without offer or explicit phase path.
- Deterministic: same hints + rolls → same refuse/accept.

## Out of scope

- No `src/` edits, no day scripts, no UI.