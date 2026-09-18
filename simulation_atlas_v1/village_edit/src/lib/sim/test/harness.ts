/**
 * Causal / determinism harness for nono_simu_2d unit tests.
 * Thin wrappers around createSimulation / stepSimulation — no gameplay changes.
 */
import { createSimulation, stepSimulation } from '../engine'
import type { SimConfigInput } from '../simConfig'
import type { SimState } from '../types'

/** Fast default for unit tests: compact map, minimal founders/fauna. */
export const CAUSAL_SMOKE_CONFIG: SimConfigInput = {
  worldSize: 600,
  initialVillagers: 4,
  maxPopulation: 40,
  sheepCount: 0,
  horseCount: 0,
  wolfCount: 0,
  preset: 'harsh',
}

export function createSim(seed: number, config?: SimConfigInput): SimState {
  return createSimulation(seed, { ...CAUSAL_SMOKE_CONFIG, ...config, seed })
}

/** @deprecated prefer createSim */
export const createWorld = createSim

export function runTicks(state: SimState, n: number): SimState {
  for (let i = 0; i < n; i++) stepSimulation(state)
  return state
}

/** Compact fingerprint: tick + alive + professionChanges (+ light scalars). */
export function fingerprint(state: SimState): string {
  let alive = 0
  for (let i = 0; i < state.villagers.length; i++) {
    if (state.villagers[i].alive) alive++
  }
  const professionChanges = state.attributionCounters?.professionChanges ?? 0
  return [
    `tick=${state.tick}`,
    `alive=${alive}`,
    `professionChanges=${professionChanges}`,
    `births=${state.births}`,
    `deaths=${state.deaths}`,
    `nextId=${state.nextId}`,
  ].join('|')
}

/** @deprecated prefer fingerprint */
export const fingerprintState = fingerprint

export function fingerprintsEqual(a: string, b: string): boolean {
  return a === b
}