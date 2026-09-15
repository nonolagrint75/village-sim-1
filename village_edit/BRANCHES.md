# Branches de travail (Nolan)

Schéma : préfixe **`nolan/`**.  
Base commune : **`nolan-work`** (ne pas committer le sim directement sur `master`).

Chaque branche ci-dessous pointe le même tip que `nolan-work` au moment de la création — ce sont des **étiquettes de focus / futurs workstreams**. Pour une mise à jour, checkout la branche concernée (ou dis à l’agent laquelle utiliser).

| Branche | Contenu | Fichiers / dossiers clés |
|--------|---------|---------------------------|
| `nolan-work` | Intégration quotidienne, WIP transversal | toute la sim |
| `nolan/cognition` | Conscience, besoins, décisions, mémoire, émotions | `src/lib/sim/cognition/`, `personality.ts` |
| `nolan/equipment-inventory` | Équipement, inventaire, charge | `equipment.ts`, `inventory.ts` |
| `nolan/resources-crafting` | Ressources, mines, craft, tech, métiers | `resources.ts`, `resourceIndex.ts`, `mining.ts`, `technology.ts`, `livelihood.ts` |
| `nolan/construction` | Construction, pièces, meubles, architecture | `construction.ts`, `rooms.ts`, `furniture.ts`, `architecture.ts` |
| `nolan/economy` | Commerce, prix, routes marchandes | `commerce.ts` |
| `nolan/politics-social` | Politique, guildes, liens sociaux, interactions | `politics.ts`, `social.ts`, `interactions.ts` |
| `nolan/family-genetics` | Famille, mariage, génétique, ethnos | `family.ts`, `marriage.ts`, `genetics.ts`, `ethnos.ts` |
| `nolan/climate-ecology` | Climat, calendrier, écologie | `climate.ts`, `calendar.ts`, `ecology.ts` |
| `nolan/mobility` | Pathfinding, routes, chevaux, bateaux | `pathfinding.ts`, `roads.ts`, `roadView.ts`, `horses.ts` (+ bateaux dans `behaviors.ts`) |
| `nolan/combat-defence` | Combat, défense, faune agressive | `defence.ts` (+ combat dans `behaviors.ts`) |
| `nolan/ui` | Panneaux, canvas, toolbar, styles | `src/components/`, `src/styles.css` |
| `nolan/performance` | Kernels WASM/GPU, worker, budgets perf | `kernels/`, `sim-core/`, `perfBudget.ts`, `sim.worker.ts`, `workerMessages.ts`, `physicsScale.ts` |
| `nolan/world-engine` | Moteur, monde, types, orchestration tick | `engine.ts`, `world.ts`, `types.ts`, `behaviors.ts`, `snapshot.ts`, `simConfig.ts`, `labels.ts`, `tileArt.ts` |

## Règle Cursor (suggestion)

Toujours travailler sur **`nolan-work`** ou une branche `nolan/*` listée ici ; ouvrir des PR vers `master` depuis `nolan-work` seulement quand on merge. Ne jamais pousser le sim directement sur `master`.

## Repo

https://github.com/nonolagrint75/village-sim-1
