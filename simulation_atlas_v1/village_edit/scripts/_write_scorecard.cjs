const fs = require('fs')
const p = 'C:/Users/kamel/village-sim-1/simulation_atlas_v1/village_edit/SIMULATION_ATLAS_V1_SCORECARD.md'
const md = `# Simulation Atlas v1 ? Scorecard

**Date :** 18 sept 2026 (bulletin + scenarios 50)  
**Arbre :** \`C:\\\\Users\\\\kamel\\\\village-sim-1\\\\simulation_atlas_v1\\\\village_edit\`  
**Bulletin :** \`NONO_SIMU_2D_BULLETIN.md\` ? **moyenne generale honnete 75.1 / 100** (cible 100 non atteinte)  
**Scenarios :** \`ATLAS_V1_SCENARIO_MATRIX.md\` ? **42 PASS / 4 PARTIAL / 4 FAIL** (seeds 1+7 ? 35j)

---

## Scoring NONO (Visuel / Sim)

| Statut | Points | Compte comme PASS ? |
|--------|--------|---------------------|
| **LIVE** | 1.0 | Oui |
| **PARTIAL?LIVE** | 0.75 | Non |
| **PARTIAL** | 0.5 | Non |
| **MISSING** | 0.0 | Non |

---

## Preuves runtime

| Probe | Resultat |
|-------|----------|
| Scenario matrix 50 | **42 PASS / 4 PARTIAL / 4 FAIL** (92% PASS+PARTIAL) |
| Soak sells/mines/bandits/coups | PASS (preuves anterieures + re-probes) |
| TPS | **82.8?100.9** ?80 |
| Butterfly | same-seed + multi-seed diverge PASS |
| Fixes cette passe | alliance vs 3e, paix couteuse, champs guerre?famine, pret (code), textileNeed, mariage-alliance, dynastie militaire, societyCycle crises |

---

## Scores courants (honnetes)

| Piste | **Moyenne** | Notes |
|-------|-------------|-------|
| **Visuel (NONO ??)** | **~81 / 100** | assets ??64?76 + activite encore levier |
| **Sim (NONO ??)** | **~89 / 100** | mines/sells/wars/coups LIVE ; textile/credit/multi-gen gaps |
| **Bulletin 15 matieres** | **75.1 / 100** | bareme severe ? ? 100 |
| **Global combine** | **~82 / 100** | continuer |

---

## FAIL scenarios restants

| # | Scenario | Action |
|---|----------|--------|
| 9 | Demande laine ? elevages | herder still 0 ; boost location sheep fait ? re-probe |
| 10 | Laine ? textile | weaver still 0 |
| 20 | Riches pretent argent | code pret + fallback village ; pas encore chronique en soak |
| 50 | Societe multi-gen (centuries) | kids=0 sur 35j ? besoin soak long / natalite |

## PARTIAL

S7 grandes demeures ? S24 schisme ? S41 attract pop ? S45 quartiers

---

## Reponse courte parent

- **Bulletin moyenne generale : 75.1 / 100** (severe, honnete ? pas 100)
- **Scenarios : 42/50 PASS** (+4 PARTIAL)
- **Visuel ~81 ? Sim ~89 ? Global ~82**
- Wins : guerres/alliances/paix couteuse/marches/mines/coups/institutions
- Suite : herder/weaver, credit observe, demographie, assets nature

*Ne pas declarer 100/100.*
`
fs.writeFileSync(p, md, 'utf8')
console.log('scorecard updated')
