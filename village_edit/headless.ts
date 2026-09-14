/**
 * Fait tourner la simulation sans aucun rendu (pas de canvas, pas de throttling à 130ms/tick).
 * C'est de loin le moyen le plus rapide de "pousser à fond" : la version dans le navigateur est
 * plafonnée par le rythme réel + le coût de dessin, alors qu'ici seule la logique tourne.
 *
 * Utilisation :
 *   npm run sim -- <graine> <nombre_de_ticks> <log_tous_les_x_ticks>
 *   npm run sim -- 1 100000 3600
 */
import { createSimulation, stepSimulation, computeStats } from './src/lib/sim/engine'

const seed = Number(process.argv[2] ?? 1)
const ticks = Number(process.argv[3] ?? 36000)
const logEvery = Number(process.argv[4] ?? 3600)

console.log(`Simulation — graine=${seed}, ${ticks} ticks, un point tous les ${logEvery} ticks\n`)

const state = createSimulation(seed)
const t0 = Date.now()

for (let t = 1; t <= ticks; t++) {
  stepSimulation(state)
  if (t % logEvery === 0) {
    const s = computeStats(state)
    console.log(
      `an ${s.year} (tick ${s.tick}) — pop ${s.villagers} | naissances ${s.births} morts ${s.deaths} | villages ${s.villages} maisons ${s.houses} | ` +
        `tisserands ${s.professions.weaver} forgerons ${s.professions.blacksmith} | famine ${s.famine ? 'oui' : 'non'}`,
    )
  }
}

const elapsed = (Date.now() - t0) / 1000
console.log(`\nTerminé : ${ticks} ticks en ${elapsed.toFixed(1)}s (${Math.round(ticks / elapsed)} ticks/s)`)
