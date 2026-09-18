# dynasty_mismanage (Malik)

Isolated staging pad — **no core World wiring**. Soft life-type **Malik**: rich heir arrogance → overspend / overhire / mansion / prestige → debt → raise rents → peasant exit → output drop → creditors seize → sibling contest → dynasty collapse / branch split.

Not a day-timer biography script.

## Causal chain

1. **Succession** — `applySuccession` / `resolveInheritanceModifiers` stamp arrogance, low thrift, vanity, rivalry.
2. **Mismanagement** — `applyMismanagementTick` / `scoreMismanagementPressure` drive spend, hire, mansion, debt, rent raise.
3. **Exit + output** — `applyPeasantExit` when rent multiplier squeezes tenants.
4. **Seize** — `applyCreditorSeize` when debt / seizeRisk high.
5. **Schism** — `resolveFamilySchism` → contest, branch split, or collapse.

## Public exports

| Export | Role |
|--------|------|
| `InheritancePersonalityModifiers` + `resolveInheritanceModifiers` / `malikInheritanceModifiers` / `personalityHookHints` | Inheritance personality modifiers |
| `scoreMismanagementPressure` / `applyMismanagementTick` / `mismanagementPressure` on house | Mismanagement pressure |
| `resolveFamilySchism` / `FamilySchismResult` / `DynastyBranch` | Family schism |
| `tickDynastyHouse` / `createDynastyHouse` | Full chain stepper |

## Integrator hooks (suggested)

- **Personality** — map `personalityHookHints(modifiers)` onto core `Personality` / ambition at succession (`inheritPersonality` call site). Do not hardcode Malik as a scripted NPC.
- **Wealth / ledger** — sync `DynastyHouse.wealth` / `debt` with lineage or village treasury; feed `credit_bank` claims when present.
- **Rents / labor** — apply `rentMultiplier` to tenant obligations; on `peasant_left`, mark deserters / migrants.
- **Output** — scale manor / farm yield by `outputLevel`.
- **Creditors** — on `asset_seized`, transfer inventory / buildings; optional link to Soren credit books.
- **Lineage** — on `branch_split`, spawn cadet lineage + split tenants; on `house_collapsed`, clear dynasty flag (`societyCycle` / lineage).
- **Probe tag** — `lifeTag: 'Malik'` for audits only.

## Files

- `types.ts` — shapes + events
- `inheritance.ts` — personality modifiers
- `pressure.ts` — mismanagement pressure
- `cascade.ts` — exit, seize, schism
- `tick.ts` — factory + ordered tick
- `index.ts` — barrel

## Out of scope

No imports from `src/lib/sim/*`. No edits to engine / World. No commit from PRODUCER.
