# Simulation 2D — à héberger en local

Projet minimal et autonome (Vite + React + TypeScript), extrait du projet Macaly, pour tourner
directement sur ta machine sans les limites de l'environnement de dev en ligne.

## Installation

Prérequis : [Node.js](https://nodejs.org/) 18 ou plus récent.

```bash
npm install
```

## Appli Windows (plein CPU)

La sim tourne dans un worker dédié (un cœur à fond, l’affichage à part). Bouton **CPU** = vitesse max.

```bash
npm install
npm run app
```

Pour un .exe portable (dossier `release/`) :

```bash
npm run dist
```

## Lancer dans le navigateur

```bash
npm run dev
```
## Lancer la simulation SANS interface — pour vraiment pousser à fond

L'interface est volontairement bridée à ~130ms par tick + le coût de dessin du canvas. Si tu veux
juste faire tourner la simulation le plus vite possible (des années entières en quelques secondes),
utilise le runner headless, sans aucun rendu :

```bash
npm run sim -- 1 100000 3600
```

Les trois paramètres (tous optionnels) : graine du monde, nombre de ticks, fréquence d'affichage
des stats. C'est exactement la méthode que j'ai utilisée pour tous les tests d'équilibrage pendant
qu'on développait ensemble — largement plus rapide que de regarder l'écran tourner.

## Où toucher pour que les villageois utilisent mieux leur mémoire

- **`src/lib/sim/social.ts`** — le système de mémoire lui-même :
  - `MAX_MEMORIES = 12` : combien de souvenirs un villageois garde en tête. Augmenter cette valeur
    leur donne plus de contexte, mais chaque souvenir en plus coûte un peu de calcul à chaque
    décision (voir `memoryBias` dans `behaviors.ts`, qui boucle sur `v.memories`).
  - `MEMORY_DECAY = 0.9985` : vitesse à laquelle un souvenir s'estompe. Plus proche de 1 = mémoire
    plus longue.
  - `MAX_RELATIONS = 20` : combien de personnes un villageois peut suivre en mémoire relationnelle.
  - `remember()` : comment un nouveau souvenir est ajouté (et lequel est oublié si la mémoire est pleine).
  - `gossip()` : comment un souvenir se transmet de bouche à oreille — c'est ce qui fait qu'un
    villageois peut savoir des choses qu'il n'a jamais vues lui-même.

- **`src/lib/sim/behaviors.ts`** — `memoryBias()` dans `chooseTask` : c'est ici que les souvenirs
  (`goodSpot` / `dangerSpot`) influencent réellement les décisions. Pour que les villageois
  "utilisent mieux" leur mémoire, c'est probablement ici qu'il faut élargir les types de souvenirs
  pris en compte (aujourd'hui seuls `goodSpot`/`dangerSpot` pèsent sur le choix de tâche — les
  souvenirs sociaux comme `helped`/`harmed`/`robbed` influencent uniquement les relations, pas
  directement le choix de tâche).

- **`MAX_POPULATION = 250`** dans `behaviors.ts` — le plafond de population, si tu veux pousser
  plus loin en profitant de la vitesse du mode headless.

## Structure du projet

```
src/
  lib/sim/           toute la logique de simulation (aucune dépendance à React)
    types.ts         définitions de base (terrain, villageois, tâches...)
    engine.ts         création du monde + boucle de simulation + stats
    behaviors.ts      l'IA des villageois (chooseTask / executeTask / métiers)
    social.ts         mémoire, relations, ambitions
    commerce.ts       marché, commerce inter-villages
    world.ts          génération du monde (biomes, ressources)
    ... (architecture, defence, horses, interactions, inventory,
         personality, resourceIndex, roads, tileArt)
  components/
    SimulationCanvas.tsx   toute l'interface (canvas + panneaux)
    ui/                    les 3 composants d'interface utilisés (bouton, carte, séparateur)
```

Aucune dépendance à Convex, à l'authentification ou au routeur qu'utilisait le projet Macaly
complet — ce sous-ensemble est entièrement autonome.

## Pour me renvoyer tes modifications

Colle-moi simplement le contenu du ou des fichiers modifiés (le plus souvent `behaviors.ts` et/ou
`social.ts`), je les réintègre dans le projet Macaly.

## Performance

The simulation has a headless Node.js runner (`npm run sim`) which executes the simulation without React, Canvas, animation frames or UI updates. This is the fastest way to run very long simulations and uses the computer's CPU directly through Node.js.

The browser version also avoids redrawing the complete world every animation frame; the static world is cached and only dirty terrain cells are repainted.
