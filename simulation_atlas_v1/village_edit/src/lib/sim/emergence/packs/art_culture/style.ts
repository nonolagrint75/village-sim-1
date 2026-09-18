import type { ArtEvent, ArtScene, ArtistProfile, StyleSignature } from './types'

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function pushEvent(scene: ArtScene, ev: ArtEvent, cap = 48): void {
  scene.events.push(ev)
  while (scene.events.length > cap) scene.events.shift()
}

const MOTIF_Q = 8

/** Create a distinctive style from an artist's originality. */
export function birthStyle(
  artist: ArtistProfile,
  tick: number,
  roll: number,
  motifCount = 5,
): StyleSignature {
  const motifs: number[] = []
  const seed = Math.floor(roll * 997) ^ (artist.actorId * 13) ^ tick
  let s = seed >>> 0
  const next = () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
  for (let i = 0; i < motifCount; i++) {
    motifs.push(Math.floor(next() * MOTIF_Q))
  }
  // Bias ornament/massing by originality so Lysa-like stands out from vernacular (mid values)
  const ornament = clamp01(0.55 + artist.originality * 0.4 - 0.15 + next() * 0.1)
  const massing = clamp01(0.35 + artist.originality * 0.45 + next() * 0.1)
  const label = artist.lifeTag === 'Lysa' ? `lysa-${artist.actorId}` : `style-${artist.actorId}`
  return {
    id: `style:${artist.actorId}:${tick}`,
    motifs,
    ornament,
    massing,
    label,
  }
}

export function styleDistance(a: StyleSignature, b: StyleSignature): number {
  const n = Math.min(a.motifs.length, b.motifs.length)
  if (n === 0) return 1
  let diff = 0
  for (let i = 0; i < n; i++) if (a.motifs[i] !== b.motifs[i]) diff++
  const motifD = diff / n
  const orn = Math.abs(a.ornament - b.ornament)
  const mass = Math.abs(a.massing - b.massing)
  return clamp01(motifD * 0.7 + orn * 0.15 + mass * 0.15)
}

/** Soft imitation: copy most motifs with rare mutations. */
export function imitateStyle(source: StyleSignature, imitatorId: number, roll: number): StyleSignature {
  const motifs = source.motifs.map((m, i) => {
    const r = (roll * 17 + i * 0.13 + imitatorId * 0.01) % 1
    if (r < 0.18) return (m + 1) % MOTIF_Q
    return m
  })
  return {
    id: `style:imit:${imitatorId}:${source.id}`,
    motifs,
    ornament: clamp01(source.ornament + (roll - 0.5) * 0.08),
    massing: clamp01(source.massing + (roll - 0.5) * 0.08),
    label: `${source.label}-echo`,
  }
}

export function isDistinctive(artist: ArtistProfile, vernacularTypical = 0.35): boolean {
  return artist.originality >= 0.55 && artist.craftSkill >= 0.4 && artist.originality - vernacularTypical >= 0.15
}

export function noteStyleBorn(scene: ArtScene, tick: number): void {
  pushEvent(scene, {
    kind: 'style_born',
    tick,
    styleId: scene.style.id,
    actorId: scene.founderId,
    note: scene.style.label,
  })
}