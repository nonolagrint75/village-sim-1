/**
 * Moteur génétique compact — village-sim.
 *
 * Règles dures :
 * - Pas de races / ethnies prédéfinies (génétique ≠ culture).
 * - Génétique ≠ destin : prédispositions soft, la vie domine.
 * - Génome abstrait (allèles QTL), pas de nucléotides.
 * - Optimisé pour de nombreux humains (typed array fixe).
 */

import type { FaceMorph, Genome, Personality, Phenotype } from './types'

export type { Genome, Phenotype, FaceMorph }

/** Taille fixe du génome en octets (allèles 0–255). */
export const GENOME_SIZE = 40

/**
 * Disposition des loci (indices dans Genome).
 * Polygenic = plusieurs loci additifs ; mendélien = 1 locus avec dominance.
 */
export const LOCI = {
  height: [0, 1, 2, 3] as const,
  build: [4, 5, 6] as const,
  pigmentation: [7, 8, 9, 10] as const,
  eyeTone: [11, 12] as const,
  eyeMendel: 13, // dominance légère sur l'intensité
  hairTone: [14, 15] as const,
  hairCurl: 16,
  hairMendel: 17,
  faceWidth: 18,
  faceJaw: 19,
  faceNose: 20,
  faceBrow: 21,
  faceCheek: 22,
  metabolism: [23, 24] as const,
  fertility: [25, 26] as const,
  diseaseRisk: [27, 28] as const,
  agingRate: 29,
  strength: 30,
  endurance: 31,
  agility: 32,
  // Soft biases personnalité (génétique ≠ destin — amplitudes faibles)
  courageBias: 33,
  sociabilityBias: 34,
  ambitionBias: 35,
  generosityBias: 36,
  curiosityBias: 37,
  /** Prédisposition pilosité faciale (QTL soft). */
  facialHair: 38,
  // Réserve / recombinaison noise seeds
  reserved1: 39,
} as const

export type PedigreeParents = {
  motherId: number | null
  fatherId: number | null
}

export type PedigreeLookup = (id: number) => PedigreeParents | null | undefined

const MUTATION_RATE = 0.012
const EXPRESSION_NOISE = 0.04
const PERSONALITY_GENETIC_WEIGHT = 0.12

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

function clampByte(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v | 0
}

function meanLoci(g: Genome, indices: readonly number[]): number {
  let s = 0
  for (let i = 0; i < indices.length; i++) s += g[indices[i]]!
  return s / (indices.length * 255)
}

function dominantBlend(recessiveMean: number, mendelAllele: number): number {
  // Allèle élevé → dominance qui pousse le trait vers le haut sans écraser le continuum
  const dominance = mendelAllele / 255
  if (dominance > 0.55) return clamp01(recessiveMean * 0.45 + 0.55 + (dominance - 0.55) * 0.35)
  return recessiveMean
}

function mutateAllele(v: number, rng: () => number): number {
  if (rng() >= MUTATION_RATE) return v
  const delta = Math.floor((rng() - 0.5) * 48)
  return clampByte(v + delta)
}

function pickGameteAllele(parent: Genome, locus: number, rng: () => number): number {
  // Recombinaison simplifiée : chaque locus est un allèle indépendant ;
  // pour polygenic on tire l'allèle parental tel quel (déjà un haploïde abstrait).
  return mutateAllele(parent[locus]!, rng)
}

/** Génome fondateur : diversité initiale sans lignée. */
export function createFounderGenome(rng: () => number): Genome {
  const g = new Uint8Array(GENOME_SIZE)
  for (let i = 0; i < GENOME_SIZE; i++) g[i] = (rng() * 256) | 0
  // Léger regroupement des QTL d'apparence pour des fondateurs crédibles (pas de clusters ethniques)
  const pigBase = (rng() * 256) | 0
  for (const i of LOCI.pigmentation) {
    g[i] = clampByte(pigBase + ((((rng() - 0.5) * 40) | 0)))
  }
  return g
}

/** Croisement mère + père : méiose + mutation rare. Fratrie diverge, héritage partagé. */
export function breedGenome(mother: Genome, father: Genome, rng: () => number): Genome {
  const child = new Uint8Array(GENOME_SIZE)
  for (let i = 0; i < GENOME_SIZE; i++) {
    // 50/50 contribution parentale par locus + mutation
    const fromMother = rng() < 0.5
    const src = fromMother ? mother : father
    child[i] = pickGameteAllele(src, i, rng)
  }
  // Crossing-over léger : échange d'un segment court
  if (rng() < 0.35) {
    const start = (rng() * (GENOME_SIZE - 4)) | 0
    const len = 2 + ((rng() * 4) | 0)
    for (let i = start; i < start + len && i < GENOME_SIZE; i++) {
      const other = mother[i]! ^ father[i]! ^ child[i]!
      child[i] = mutateAllele(other, rng)
    }
  }
  return child
}

function noise(rng: () => number, amp = EXPRESSION_NOISE): number {
  return (rng() - 0.5) * 2 * amp
}

/** Expression phénotypique : génome + bruit léger. Apparence continue, sans labels. */
export function expressPhenotype(genome: Genome, rng: () => number): Phenotype {
  const height = clamp01(meanLoci(genome, LOCI.height) + noise(rng))
  const build = clamp01(meanLoci(genome, LOCI.build) + noise(rng))
  const pigmentation = clamp01(meanLoci(genome, LOCI.pigmentation) + noise(rng))
  const eyeBase = meanLoci(genome, LOCI.eyeTone)
  const eyeTone = clamp01(dominantBlend(eyeBase, genome[LOCI.eyeMendel]!) + noise(rng))
  const hairBase = meanLoci(genome, LOCI.hairTone)
  const hairTone = clamp01(dominantBlend(hairBase, genome[LOCI.hairMendel]!) + noise(rng))
  const hairCurl = clamp01(genome[LOCI.hairCurl]! / 255 + noise(rng))
  const facialHair = clamp01(genome[LOCI.facialHair]! / 255 + noise(rng))

  const face: FaceMorph = {
    width: clamp01(genome[LOCI.faceWidth]! / 255 + noise(rng)),
    jaw: clamp01(genome[LOCI.faceJaw]! / 255 + noise(rng)),
    nose: clamp01(genome[LOCI.faceNose]! / 255 + noise(rng)),
    brow: clamp01(genome[LOCI.faceBrow]! / 255 + noise(rng)),
    cheek: clamp01(genome[LOCI.faceCheek]! / 255 + noise(rng)),
  }

  const metabolism = clamp01(meanLoci(genome, LOCI.metabolism) + noise(rng))
  const fertilityPredisposition = clamp01(meanLoci(genome, LOCI.fertility) + noise(rng))
  const diseaseRisk = clamp01(meanLoci(genome, LOCI.diseaseRisk) + noise(rng, 0.03))
  const agingRateBias = clamp01(genome[LOCI.agingRate]! / 255 + noise(rng))
  const strengthBias = clamp01(genome[LOCI.strength]! / 255 + noise(rng))
  const enduranceBias = clamp01(genome[LOCI.endurance]! / 255 + noise(rng))
  const agilityBias = clamp01(genome[LOCI.agility]! / 255 + noise(rng))

  // Hue de rendu dérivé des traits continus (pas d'étiquette)
  const hue = Math.floor(
    clamp01(pigmentation * 0.35 + hairTone * 0.4 + eyeTone * 0.15 + face.brow * 0.1) * 360,
  ) % 360

  return {
    height,
    build,
    pigmentation,
    eyeTone,
    hairTone,
    hairCurl,
    facialHair,
    face,
    metabolism,
    fertilityPredisposition,
    diseaseRisk,
    agingRateBias,
    strengthBias,
    enduranceBias,
    agilityBias,
    hue,
  }
}

/** Biais personnalité issus du génome — amplitudes faibles (génétique ≠ destin). */
export function geneticPersonalityBias(genome: Genome): Personality {
  const toBias = (allele: number) => (allele / 255 - 0.5) * 2 * PERSONALITY_GENETIC_WEIGHT
  return {
    courage: toBias(genome[LOCI.courageBias]!),
    sociability: toBias(genome[LOCI.sociabilityBias]!),
    ambition: toBias(genome[LOCI.ambitionBias]!),
    generosity: toBias(genome[LOCI.generosityBias]!),
    curiosity: toBias(genome[LOCI.curiosityBias]!),
  }
}

/** Applique un soft bias génétique sur une personnalité déjà formée (vie / héritage social). */
export function applyGeneticPersonalityBias(base: Personality, genome: Genome, rng: () => number): Personality {
  const bias = geneticPersonalityBias(genome)
  const jitter = () => (rng() - 0.5) * 0.02
  return {
    courage: clamp01(base.courage + bias.courage + jitter()),
    sociability: clamp01(base.sociability + bias.sociability + jitter()),
    ambition: clamp01(base.ambition + bias.ambition + jitter()),
    generosity: clamp01(base.generosity + bias.generosity + jitter()),
    curiosity: clamp01(base.curiosity + bias.curiosity + jitter()),
  }
}

/**
 * Risque maladie effectif : prédisposition × âge × famine.
 * Hook pour le moteur — jamais une certitude binaire.
 */
export function diseasePressure(
  phenotype: Phenotype,
  ageNorm: number,
  famine: boolean,
  biomeDiseaseMul = 1,
): number {
  const ageFactor = 0.35 + clamp01(ageNorm) * 0.65
  const famineFactor = famine ? 1.35 : 1
  const biomeFactor = Math.max(0.5, Math.min(1.6, biomeDiseaseMul))
  return clamp01(
    phenotype.diseaseRisk * ageFactor * famineFactor * biomeFactor * (0.55 + phenotype.agingRateBias * 0.45),
  )
}

/**
 * Soft modifier de fertilité (prédisposition ≠ destin).
 * Le module famille / reproduction peut multiplier sa chance de base.
 */
export function fertilityModifier(phenotype: Phenotype): number {
  // ~0.85–1.15
  return 0.85 + phenotype.fertilityPredisposition * 0.3
}

/**
 * Soft biases aptitudes physiques (travail, combat, marche) — jamais déterministes.
 */
export function physicalAptitudeModifiers(phenotype: Phenotype): {
  strength: number
  endurance: number
  agility: number
} {
  return {
    strength: 0.9 + phenotype.strengthBias * 0.2,
    endurance: 0.9 + phenotype.enduranceBias * 0.2,
    agility: 0.9 + phenotype.agilityBias * 0.2,
  }
}

/**
 * Coefficient de consanguinité de Wright (F) pour un individu,
 * à partir des ancêtres partagés via mère/père.
 * API prévue pour le module famille / lignées.
 *
 * F ≈ Σ (1/2)^L * (1 + F_A) sur ancêtres communs des deux parents
 * (approximation profondeur limitée, O(2^depth) borné).
 */
export function consanguinityCoefficient(
  motherId: number | null,
  fatherId: number | null,
  lookup: PedigreeLookup,
  maxDepth = 6,
): number {
  if (motherId === null || fatherId === null || motherId === fatherId) return 0

  type PathMap = Map<number, { len: number; fA: number }>

  function ancestorPaths(startId: number, depthLeft: number, pathLen: number, acc: PathMap, visited: Set<number>) {
    if (depthLeft <= 0 || visited.has(startId)) return
    visited.add(startId)
    const prev = acc.get(startId)
    if (!prev || pathLen < prev.len) {
      acc.set(startId, { len: pathLen, fA: 0 })
    }
    const p = lookup(startId)
    if (!p) return
    if (p.motherId !== null) ancestorPaths(p.motherId, depthLeft - 1, pathLen + 1, acc, visited)
    if (p.fatherId !== null) ancestorPaths(p.fatherId, depthLeft - 1, pathLen + 1, acc, visited)
  }

  const mat = new Map<number, { len: number; fA: number }>()
  const pat = new Map<number, { len: number; fA: number }>()
  ancestorPaths(motherId, maxDepth, 1, mat, new Set())
  ancestorPaths(fatherId, maxDepth, 1, pat, new Set())

  let f = 0
  for (const [ancId, m] of mat) {
    const p = pat.get(ancId)
    if (!p) continue
    // (1/2)^(n_m + n_p) * (1 + F_A) ; F_A≈0 à profondeur limitée
    const L = m.len + p.len
    f += Math.pow(0.5, L)
  }
  return clamp01(f)
}

/** Consanguinité entre deux individus (parenté r/2 ≈ F des enfants hypothétiques). */
export function kinshipCoefficient(idA: number, idB: number, lookup: PedigreeLookup, maxDepth = 6): number {
  if (idA === idB) return 0.5
  const a = lookup(idA)
  const b = lookup(idB)
  if (!a || !b) return 0
  // Enfant hypothétique de A×B : F = consanguinité si A et B sont les parents
  return consanguinityCoefficient(idA, idB, lookup, maxDepth)
}

/** Clone défensif du génome (évite le partage accidentel de buffer). */
export function cloneGenome(g: Genome): Genome {
  return new Uint8Array(g)
}

/** Sérialisation compacte (save / worker transfer). */
export function genomeToArray(g: Genome): number[] {
  return Array.from(g)
}

export function genomeFromArray(arr: ArrayLike<number>): Genome {
  const g = new Uint8Array(GENOME_SIZE)
  const n = Math.min(arr.length, GENOME_SIZE)
  for (let i = 0; i < n; i++) g[i] = clampByte(arr[i]!)
  return g
}

/**
 * Helper naissance : génome enfant + phénotype + parents typés.
 * motherId/fatherId follow biological sex when known; otherwise call-order slots
 * (compat parentIds legacy [a,b]). Villager.sex remains the child's phenotype sex.
 */
export function birthGenetics(
  parentA: { id: number; genome: Genome; sex?: 'female' | 'male' },
  parentB: { id: number; genome: Genome; sex?: 'female' | 'male' },
  rng: () => number,
): {
  genome: Genome
  phenotype: Phenotype
  motherId: number
  fatherId: number
  sex: 'female' | 'male'
} {
  let mother = parentA
  let father = parentB
  if (parentA.sex === 'female' && parentB.sex !== 'female') {
    mother = parentA
    father = parentB
  } else if (parentB.sex === 'female' && parentA.sex !== 'female') {
    mother = parentB
    father = parentA
  }
  const motherId = mother.id
  const fatherId = father.id
  const genome = breedGenome(mother.genome, father.genome, rng)
  const phenotype = expressPhenotype(genome, rng)
  const sex: 'female' | 'male' = rng() < 0.5 ? 'female' : 'male'
  return { genome, phenotype, motherId, fatherId, sex }
}
