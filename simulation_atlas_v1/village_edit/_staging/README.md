# `_staging/` - producer packs -> integrator

Isolated modules only. Producers write here; the **integrator** wires into `src/lib/sim` (and panels/probes). Do **not** edit World tick, canvas, or index hubs from producer agents.

## Packs this swarm should produce

| Pack | Life types (criteria) | Role |
|------|----------------------|------|
| `credit_bank/` | Soren | Credit -> loans -> deposits -> investment -> risk -> bankruptcy -> trust -> bank institution |
| `bandit_parallel/` | Daren, Kael | Poverty -> migration -> unemployment -> crime -> gang -> bounty -> authority / faction deal |
| `migrant_quarters/` | Elian | Orphan/migrant -> city labor -> marry local -> cultural drift -> quarter -> association -> institution |
| `wool_industry/` | Yara | Sheep -> wool commodity chain -> town growth -> overproduction crash -> quality specialization |
| `dynasty_mismanage/` | Malik | Rich heir mismanagement -> debt -> peasant exit -> creditors -> sibling schism / collapse |
| `explore_routes/` | Ema, Boran | Route discovery / war-blocked reroute -> price shock -> migrants -> new trade town |
| `labor_revolt/` | Rami, Tomas | Bad conditions -> strike -> labor institution -> repression -> army refuses -> polity change |
| `art_culture/` | Lysa | Style -> patronage -> imitators -> art circle -> public architecture -> multi-gen culture |
| `military_defection/` | Jonas, Arvid | Loyalty -> grief/supply failure -> refuse repress -> civil war command -> political offer |
| `kin_multigen/` | Ayan, Nara (+ Eren/Mira parts) | Multi-child families -> profession divergence -> firm marriage -> 50-100y multi-city kin -> crisis split -> secret aid / enmity -> branch outcomes |

Producers may land packs out of order. Integrator polls for `README.md` + typed exports before wiring.

## Integrator contract

1. **Boundary** - Packs live under `_staging/<pack>/`. No imports from pack code into core until the integrator copies or re-exports intentionally.
2. **Purity** - Exports must be **pure-ish**: deterministic given inputs + `rng`, no DOM, no engine globals, no day-timer biographies. Stateful bags are OK if the pack owns them and exposes create/tick helpers.
3. **Typed** - Public surfaces use explicit TypeScript types/interfaces; avoid `any`. Prefer branded ids (`PersonId`, `LineageId`, ...) or plain `number`/`string` documented against core ids.
4. **Documented** - Each pack `README.md` lists:
   - Life-type coverage
   - Export table (symbol -> purpose)
   - Hook points (which core tick / event should call what)
   - Name map to existing `src/lib` symbols (peek-only; producers do not edit core)
5. **Barrel** - Each pack exposes `index.ts` re-exporting the public API.
6. **Probes** - Prefer stats/snapshot helpers that probes can call headless without UI.
7. **No commits** from producer agents unless the user explicitly asks.

### Suggested core hook regions (names only)

- Family / lineage: `family.ts` - `registerBirth`, `tickLineages`, `createLineage`, `packFamilySummary`, `Lineage`, `Family`
- Marriage: `marriage.ts` - `tickMarriage`, `formBond`, `bondedPartner`
- Relations: `social.ts` - `Relation.kinship`, `relationWith`, `adjustRelation`, `shareFamilyTrauma`
- Professions: `professionFactors.ts` / careers - `computeProfessionChoice`; villager `profession: Profession`
- Firms: `economy/business.ts` - `BusinessRecord`, `tickFirms`, `findBusinessesByOwner`
- Politics / guilds: `politics.ts` - circles, `isGuild`, `ensureKinship`
- Engine cadence: `engine.ts` - after marriage / lineages / firms pulses

### Acceptance for a pack

- [ ] `README.md` present with hooks + life-type note
- [ ] `index.ts` exports stable public API
- [ ] No imports of app/React/engine
- [ ] Probe-facing stats or scenario descriptors (not scripted day biographies)

## Gap packs (wave 2 — life types previously uncovered)

| Pack | Life types (criteria) | Role |
|------|----------------------|------|
| `religion_schism/` | Samir | Creed reinterpret → charity → faith schism → regional creed |
| `succession_civil/` | Alena | Contested heir → merchant alliance → civil war → political reward |
| `merchant_network/` | Eren | Farmer→trader→arbitrage→hire→marriage→guild→network |
| `guild_formation/` | Eren, Lysa, Mira | Craft/trade circle → institution → guild |
| `agri_invention/` | Lio | Farm tool invent → agri boost → regional enrich → firm hire |
| `military_dynasty/` | Arvid | Guard → trauma → militia → land inherit → military dynasty |

`explore_routes/` deepened (was types-only).
