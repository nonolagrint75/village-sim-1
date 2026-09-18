# Staging: `guild_formation`

**Life types:** **Eren** (commercial / trade guild), **Mira** (weavers / textile guild), bits of **Lysa** (art). Soft tags — not day-timer biographies.
**Status:** isolated pack — integrator wires; no core imports.
**Scenario soak:** S21 / S39 guildes / artisans create guild to defend interests.

## Causal chain

shared craft/trade practice → circle cohesion → apprentices → **interest threat** (undercut / levy / input squeeze) → defense norms → institution age → guild rename → exclude shirkers → master prestige

## Exports

| Symbol | Role |
|--------|------|
| `scoreGuildReadiness` / `scoreInterestThreat` | Pure readiness / threat 0–1 |
| `preferredKindFromTags` | Mira→textile, Eren→trade, Lysa→art |
| `tryFormCraftCircle` | Seed pad before core Circle create |
| `noteInterestThreat` / `tryDefendInterests` | Organize to defend commercial / weaver interests |
| `tryPromoteInstitution` | Soft institution gate |
| `tryPromoteGuild` | Guild harden decision + suggested name |
| `tickGuildPad` | Quality / apprentice / threat pulse |
| `guildStats` | Probe snapshot |

## Integrator hook points

1. **Circle birth** — craft/trade peers cluster in `politics.ts`: pick kind via `preferredKindFromTags`, then `tryFormCraftCircle` → `createCircle`.
2. **Interest pressure** — outsider merchants, tolls, wool/cloth squeeze: `noteInterestThreat` / pass `threat` into `tickGuildPad`.
3. **Institution** — beside existing institution age gate: `tryPromoteInstitution`.
4. **Guild** — wrap `promoteToGuild`: `tryPromoteGuild`; if true set `isGuild`, rename, norms.
5. **Life** — guild cadence: `tickGuildPad` for qualityBar / apprentices / prestige.
6. Cross-pack: `merchant_network.tryJoinOrFormTradeGuild` (Eren) and `wool_industry` weaver counts (Mira) feed practitioner hints; `art_culture.tryFormArtCircle` for Lysa.

## Files

- `types.ts` — shapes + events
- `util.ts` — clamp / event cap / names
- `readiness.ts` — readiness + threat scores
- `form.ts` — form / defend / promote
- `tick.ts` — pulse + stats
- `index.ts` — barrel

## Name map (peek-only)

- `politics.ts` — `isGuild`, `promoteToGuild`, `tickGuildLife`, craft/trade circles
- `wool_industry` — Mira textile practitioners
- `merchant_network` — Eren trade guild node

## Out of scope

No `src/` edits, no day scripts, no UI, no commit.
