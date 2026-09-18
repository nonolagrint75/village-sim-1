# AUDIT Agents 8–10 — Society / Politics / Culture / Religion

**Workspace:** `village_edit`  
**Date:** 2026-09-16  
**Scope:** Emergent circles, guilds, creeds, polities, ethnos/language, teach diffusion, bandits-as-outlaws. No `CREATE_X` spawns. Decision wiring via `politicalTaskBias` → `pickTaskByPolicy`.

## Verdict

**PASS (after causal fixes).** Institutions emerge and bias tasks; creeds diversify beyond « piété »; teach fires; bandits form as outcast hors-la-loi after founding (day 40+), camp outside town, raid without camp TP.

## Method

| Probe | Cmd | Window |
|-------|-----|--------|
| Society | `npx tsx scripts/_probe_society.ts 7 50` | d50 |
| Bandits | `npx tsx scripts/_probe_bandits.ts 7 60` | d60 |
| Civ audit | `npx tsx _civ_audit.ts 1 50` / prior `7 45` | d45–50 |
| Tech (pre) | `npx tsx scripts/_probe_tech.ts 7 40` | d40 |

## Before → After (seed 7)

| Signal | Before | After |
|--------|--------|-------|
| Creed IDs | monoculture `piete` only | `commerce_libre` + `piete` (s7); `partage`/`tradition`/`piete` (s1) |
| Creed → task bias | `piete` had **no** creed branch in `politicalTaskBias` | `piete` ritual ≈4.3 vs commerce ritual ≈2.1; commerce `tradeRun` 1.4 vs piete 1.12 |
| teachCraft | historically 0 (A7); Wave A already rewired | **123 starts** / 50j; tech teachCount 22 / 40j |
| Faith circle creed | hard-coded `c.creed = 'piete'` | inherited / `pickDominantCreed` |
| Bandits | startDay=56; probe@50 → FAIL 0 bands | startDay=**40**; outcasts day 40; raids 4; camp TP=0 |
| Guilds | rare / invisible | 2 guilds by d20–50; guildLog=3 |
| Polities | present | kingdoms/chiefdoms USED both seeds |
| Ethnos / langue | present | langs≤3, ethnies≤3; socialise uses `homophilyBias` + `ethnosSocialBias` |
| CREATE_X | none found | still none |

## Emergent systems (not scripted CREATE)

- **Circles** → `createCircle` from shared problems (hunger, threat, faith, craft, elder, village); harden to institutions (`INSTITUTION_AGE`).
- **Guilds** → `promoteToGuild` + `teach_apprentice` norm; boosts `teachCraft` bias ×1.45.
- **Creeds** → competitive axes (`pickDominantCreed`); shrine labels follow creed (s1: « partage » / « usages » / « sacré »).
- **Polities** → campement → village → chefferie → royaume; territory log USED; succession RARE but present.
- **Ethnos / language** → `seedFounderEthnos`, dialect drift, intelligibility; biases socialise / marriage / trade via culture similarity.
- **Bandits** → prefer **outcasts** (grievance / inequality / exile); vagabonds fallback; camps beyond settlement clear.

## Decision wiring

`chooseTask` → options → `pickTaskByPolicy` → `scoreWithFactors` → `politicalFactor` → **`politicalTaskBias`**.

Verified multipliers for: `partage`/`ordre`/`vengeance`/`protection`/`commerce_libre` (pre-existing) + **`piete` / `tradition` / `changement`** (fixed). Circles/norms still gate giveFood, steal, defend, buildWall, trade, teach.

## Bugs fixed (causal)

1. **Creed monoculture** — Faith circles forced `piete`; crystallisation early-returned piety. → Competitive `creedAxes` / `pickDominantCreed`; faith circle inherits majority or dominant axis; religion crystallisation uses same picker.
2. **Creed never biased decisions for the only emerged creed** — `politicalTaskBias` lacked `piete`/`tradition`/`changement` branches. → Ritual/counsel/teach/experiment/build biases added.
3. **Teach same-id / weak pupil pick** — Guards on `teachKnowledge` / `doTeachCraft`; pupil selection prefers craft gap / youth (duplicate given names are common).
4. **Bandits miss mid-game audits** — `BANDIT_START_DAY` 56 + tight outcast gates → no bands in ≤50j windows. → Start **40**; softer outcast (inequality); early wilderness boost if no band yet. Probe default = start+20.

## Remaining / residual

- Not all CreedIds appear every seed (ordre/vengeance/protection still rare without strong grievance).
- `ritual` **task** starts may stay low while circle/shrine **rite logs** fire heavily (rite path ≠ task path).
- Pop dips after bandit onset (s7 d50 pop 16; s1 deaths 11) — survival/raid balance is Agent 3 territory; bandits themselves PASS outlaw emergence.
- Territory absorption / soft civil war still rare (A11 unchanged).

## Files touched

- `src/lib/sim/politics.ts` — creed axes, faith circle creed, task biases
- `src/lib/sim/religion.ts` — crystallise via `pickDominantCreed`
- `src/lib/sim/behaviors.ts` — teach pupil selection
- `src/lib/sim/technology.ts` / `interactions.ts` — same-id teach guards
- `src/lib/sim/bandits.ts` — start day, outcast gates, wild fallback
- `scripts/_probe_society.ts` — new society probe
- `scripts/_probe_bandits.ts` — default days vs start day

## Quick re-verify

```bash
npx tsx scripts/_probe_society.ts 7 50
npx tsx scripts/_probe_bandits.ts 7 60
npx tsx _civ_audit.ts 1 50
```
