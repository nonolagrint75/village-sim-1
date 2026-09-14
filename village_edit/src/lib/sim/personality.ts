import type { Personality } from './types'

function seededValue(seed: number, salt: number): number {
  let s = (seed ^ salt) >>> 0
  s ^= s << 13
  s ^= s >>> 17
  s ^= s << 5
  s >>>= 0
  return s / 4294967296
}

export function generatePersonality(seed: number): Personality {
  return {
    courage: seededValue(seed, 0x9e3779b1),
    sociability: seededValue(seed, 0x85ebca6b),
    ambition: seededValue(seed, 0xc2b2ae35),
    generosity: seededValue(seed, 0x27d4eb2f),
    curiosity: seededValue(seed, 0x165667b1),
  }
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

export function inheritPersonality(a: Personality, b: Personality, rng: () => number): Personality {
  const inheritTrait = (ta: number, tb: number): number => {
    if (rng() < 0.15) return rng()
    const blend = (ta + tb) / 2
    const drift = (rng() - 0.5) * 0.1
    return clamp01(blend + drift)
  }
  return {
    courage: inheritTrait(a.courage, b.courage),
    sociability: inheritTrait(a.sociability, b.sociability),
    ambition: inheritTrait(a.ambition, b.ambition),
    generosity: inheritTrait(a.generosity, b.generosity),
    curiosity: inheritTrait(a.curiosity, b.curiosity),
  }
}

const SYL_A = ['Ka', 'Mo', 'Ri', 'Ta', 'Bel', 'Or', 'Fen', 'Wyl', 'Sa', 'Dro', 'El', 'Bra', 'Ny', 'Us', 'Gar', 'Iv']
const SYL_B = ['ren', 'dan', 'lya', 'vic', 'mir', 'tho', 'sen', 'ora', 'wen', 'dric', 'ana', 'lin', 'gor', 'eth', 'ild', 'os']

export function generateName(seed: number): string {
  const a = SYL_A[Math.floor(seededValue(seed, 0x1) * SYL_A.length)]
  const b = SYL_B[Math.floor(seededValue(seed, 0x2) * SYL_B.length)]
  return a + b
}
