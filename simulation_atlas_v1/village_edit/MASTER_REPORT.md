# Rapport Master — nono_simu_2D

**Date :** 18 sept 2026  
**Workspace :** `C:\Users\kamel\village-sim-1\_wt_rhythm\village_edit`  
**Branche :** `nolan-work`  
**Objectif :** première version cohérente / jouable (infrastructure + recovery + émergence).

---

## Comment tester maintenant

L'app tourne déjà sur le port **5174** (un `npm run app` était déjà actif). Si Electron est ouvert : **Nouveau monde** (ou relance `npm run app` après avoir fermé l'ancienne instance).

Sinon :
```powershell
cd C:\Users\kamel\village-sim-1\_wt_rhythm\village_edit
npm run app
```

Vérifier dans le panneau :
- **Stocks visibles** → labels `(surplus)` (pas `(cours)`)
- **Désertions** à côté de Morts / Morts loups / Morts brigands
- Chaînes : outils pierre → pierres/fer ; clôtures ; maisons ; marchés

Checks machine :
- `npx tsc --noEmit` : OK
- `npm test` : 2/2 OK (déterminisme + mining causal)

---

## Équipe (14 agents)

| # | Rôle | Statut |
|---|------|--------|
| 1 | Master Orchestrator | Fait (ce rapport) |
| 2–3 | Coordinators Infra / Émergence | Pliés dans le Master |
| 4 | World / mining + livestock | PARTIEL validé |
| 5 | Economy facade + UI | Validé (+ QA-C stocks) |
| 6 | Housing / planner | Validé |
| 7 | Culture → architecture | Validé |
| 8 | Politics scarcity × rivalry | Validé |
| 9 | Cognition rest balance | Validé |
| 10 | Vitest harness | Validé |
| 11 | Perf baseline | ~21 ms@36, ~33 ms@100 |
| 12 | QA-A causal mining/pens | PASS |
| 13 | QA-B multi-seed @1k | PASS (harness 4 NPC) |
| 14 | QA-C playable / observabilité | PASS |

---

## Ce qui a été fait

### A4 — Mining + livestock (PARTIEL)
- Assignation causale : `tryAssignStoneToolUpgrade` / `tryAssignPenProgress`
- `craftStoneSpear` sans établi obligatoire (pont outil → mine)
- Test mining-causal : stoneTools + fenceTiles OK ; tunnels encore rares

### A5 — Economy facade
- `getPrice` / `getMarketState` → prix local + stock = surplus villages

### A6 — Housing / planner
- Clamp / escape forme pioneer pour maisons bloquées

### A7 — Culture → architecture
- Ethnos / culture influencent formes archi

### A8 — Politics
- Famine × rivalité (~×1.65) sur grief / rivals

### A9 — Cognition
- Damp rest/idle **de jour seulement**

### A10 — Tests
- Déterminisme seed 7 / 150 ticks
- Mining causal seed 7 / 3000 ticks

### A11 — Perf
- Baseline mesurée (pas de rewrite perf)

### QA-C (terminé aujourd’hui)
1. **Stocks UI** : `marketStocks` = somme `village.surplus` ; panneau `(surplus)` au lieu de recycler les prix
2. **Désertions** : `state.deserters++` dans `detachOutcast` ; ligne UI dédiée
3. Compile clean : `trader.id` optionnel + retrait compare `eat` morte

---

## Verdict Master

| Domaine | État |
|---------|------|
| Mining / outils pierre | PARTIEL (outils + clôtures ; tunnels rares) |
| Livestock / pens | PARTIEL (clôtures > hasPen complet) |
| Économie / UI stocks | OK |
| Housing / culture / politics / cognition | Validés |
| Tests / perf | PASS / acceptable démo |
| Version cohérente jouable | **OUI early civ** — mid-game logistics encore partiel |

---

## Limites connues
- Tunnels rares sur horizons courts
- Enclos complets moins fréquents que clôtures
- Harness QA-B 4 NPC ≠ run UI ~36
- Nombreux vieux `AUDIT_*.md` / probes = bruit historique

## Fichiers QA-C
`types.ts`, `engine.ts`, `bandits.ts`, `SimPanel.tsx`, `snapshot.ts`, `commerce.ts`, `behaviors.ts`

## Suite possible
1. Soak long tunnels / pens
2. QA-D multi-seed 36 NPC
3. Commit git **seulement si tu le demandes**
