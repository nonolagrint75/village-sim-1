import { birthStyle, imitateStyle, isDistinctive, noteStyleBorn, styleDistance } from './style'
import type {
  ArtEvent,
  ArtPhase,
  ArtScene,
  ArtTickContext,
  ArtistProfile,
  BuildStyleHint,
  InheritanceHint,
  PatronProfile,
} from './types'

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function pushEvent(scene: ArtScene, ev: ArtEvent, cap = 48): void {
  scene.events.push(ev)
  while (scene.events.length > cap) scene.events.shift()
}

function setPhase(scene: ArtScene, phase: ArtPhase, tick: number, kind: ArtEvent['kind'], note?: string): void {
  scene.phase = phase
  pushEvent(scene, { kind, tick, styleId: scene.style.id, note })
}

export function trySeedArtScene(
  artist: ArtistProfile,
  tick: number,
  roll: number,
): ArtScene | null {
  if (!isDistinctive(artist)) return null
  if (artist.lifeTag !== 'Lysa' && artist.originality < 0.62) return null
  const style = birthStyle(artist, tick, roll)
  const scene: ArtScene = {
    id: `art:${artist.actorId}:${tick}`,
    villageId: artist.villageId ?? 0,
    phase: 'seed_style',
    formedTick: tick,
    founderId: artist.actorId,
    style,
    circleId: null,
    artistIds: [artist.actorId],
    imitatorIds: [],
    intellectualIds: [],
    patronIds: [],
    patronageSlow: 0,
    eliteFunding: 0,
    architectureShare: 0,
    generationDepth: 0,
    cultureComponentId: null,
    events: [],
  }
  noteStyleBorn(scene, tick)
  setPhase(scene, 'seeking_patronage', tick, 'style_born')
  return scene
}

/** Slow patronage: small increments; stalls if patrons weak. */
export function applyPatronagePulse(
  scene: ArtScene,
  patrons: PatronProfile[],
  tick: number,
  roll: number,
): void {
  if (scene.phase !== 'seeking_patronage' && scene.phase !== 'patronized' && scene.phase !== 'seed_style') return
  const willing = patrons.filter((p) => p.wealth > 0.35 && p.generosity + p.prestigeNeed > 0.55)
  if (willing.length === 0) {
    scene.patronageSlow = clamp01(scene.patronageSlow - 0.01)
    if (roll > 0.9) pushEvent(scene, { kind: 'patronage_stalled', tick, styleId: scene.style.id })
    return
  }
  // Slow: one patron drip per pulse
  const p = willing[Math.floor(roll * willing.length) % willing.length]
  const drip = 0.04 + p.generosity * 0.06 + p.prestigeNeed * 0.03
  scene.patronageSlow = clamp01(scene.patronageSlow + drip * 0.35)
  if (!scene.patronIds.includes(p.actorId)) scene.patronIds.push(p.actorId)
  pushEvent(scene, {
    kind: 'patronage_gained',
    tick,
    styleId: scene.style.id,
    actorId: p.actorId,
    amount: drip,
  })
  if (scene.patronageSlow >= 0.28) setPhase(scene, 'patronized', tick, 'patronage_gained')
}

export function tryAddImitator(
  scene: ArtScene,
  candidate: ArtistProfile,
  tick: number,
  roll: number,
): boolean {
  if (scene.phase !== 'patronized' && scene.phase !== 'imitators' && scene.phase !== 'art_circle') return false
  if (candidate.actorId === scene.founderId) return false
  if (candidate.craftSkill < 0.25) return false
  // Attracted by recognition of scene + own lower originality
  const pull = scene.patronageSlow * 0.5 + (1 - candidate.originality) * 0.3 + candidate.craftSkill * 0.2
  if (roll > pull) return false
  if (!scene.imitatorIds.includes(candidate.actorId)) scene.imitatorIds.push(candidate.actorId)
  if (!scene.artistIds.includes(candidate.actorId)) scene.artistIds.push(candidate.actorId)
  pushEvent(scene, {
    kind: 'imitator_joined',
    tick,
    styleId: scene.style.id,
    actorId: candidate.actorId,
    note: imitateStyle(scene.style, candidate.actorId, roll).label,
  })
  if (scene.imitatorIds.length >= 2) setPhase(scene, 'imitators', tick, 'imitator_joined')
  return true
}

export function tryFormArtCircle(scene: ArtScene, softCircleId: number | null, tick: number): boolean {
  if (scene.phase !== 'imitators' && scene.phase !== 'patronized') return false
  if (scene.artistIds.length < 3 || scene.patronageSlow < 0.3) return false
  scene.circleId = softCircleId
  setPhase(scene, 'art_circle', tick, 'circle_formed')
  return true
}

/** Cross-discipline intellectuals join → salon. */
export function tryOpenSalon(
  scene: ArtScene,
  intellectuals: ArtistProfile[],
  tick: number,
  roll: number,
): boolean {
  if (scene.phase !== 'art_circle') return false
  const pool = intellectuals.filter(
    (i) => i.intellectPull >= 0.45 && i.actorId !== scene.founderId && !scene.imitatorIds.includes(i.actorId),
  )
  if (pool.length < 2) return false
  for (const i of pool.slice(0, 4)) {
    if (roll + i.intellectPull < 0.7) continue
    if (!scene.intellectualIds.includes(i.actorId)) scene.intellectualIds.push(i.actorId)
  }
  if (scene.intellectualIds.length < 2) return false
  setPhase(scene, 'salon', tick, 'salon_opened', `n=${scene.intellectualIds.length}`)
  return true
}

export function applyEliteFunding(scene: ArtScene, elitePatrons: PatronProfile[], tick: number): void {
  if (scene.phase !== 'salon' && scene.phase !== 'art_circle') return
  const elites = elitePatrons.filter((p) => p.wealth >= 0.6)
  if (elites.length === 0) return
  let fund = 0
  for (const e of elites) {
    fund += 0.08 + e.prestigeNeed * 0.1
    if (!scene.patronIds.includes(e.actorId)) scene.patronIds.push(e.actorId)
  }
  scene.eliteFunding = clamp01(scene.eliteFunding + fund * 0.25)
  pushEvent(scene, {
    kind: 'elite_funded',
    tick,
    styleId: scene.style.id,
    amount: scene.eliteFunding,
  })
  if (scene.eliteFunding >= 0.4) setPhase(scene, 'elite_funding', tick, 'elite_funded')
}

/** Public architecture adopts style when elite funding + salon exist. */
export function onPublicBuild(scene: ArtScene, hint: BuildStyleHint, roll: number): void {
  if (hint.villageId !== scene.villageId) return
  if (scene.phase !== 'elite_funding' && scene.phase !== 'public_architecture' && scene.phase !== 'multi_gen') return
  if (!hint.isPublic && scene.eliteFunding < 0.5) return
  const gain = hint.isPublic ? 0.08 : 0.03
  const bias = scene.eliteFunding * 0.5 + scene.patronageSlow * 0.2
  if (roll > 0.35 + bias) return
  scene.architectureShare = clamp01(scene.architectureShare + gain)
  pushEvent(scene, {
    kind: 'architecture_marked',
    tick: hint.tick,
    styleId: scene.style.id,
    actorId: hint.builderId ?? undefined,
    amount: scene.architectureShare,
  })
  if (scene.architectureShare >= 0.22) setPhase(scene, 'public_architecture', hint.tick, 'architecture_marked')
}

/** Multi-gen: child inherits style → culture component. */
export function applyInheritance(scene: ArtScene, hint: InheritanceHint): void {
  if (!scene.artistIds.includes(hint.parentId) && hint.parentId !== scene.founderId) return
  if (hint.absorb < 0.25) return
  if (!scene.artistIds.includes(hint.childId)) scene.artistIds.push(hint.childId)
  scene.generationDepth = Math.max(scene.generationDepth, 1 + Math.floor(hint.absorb * 3))
  if (!scene.cultureComponentId) {
    scene.cultureComponentId = `cult:${scene.style.label}`
  }
  pushEvent(scene, {
    kind: 'culture_inherited',
    tick: hint.tick,
    styleId: scene.style.id,
    actorId: hint.childId,
    amount: hint.absorb,
  })
  if (scene.architectureShare >= 0.2 || scene.generationDepth >= 2) {
    setPhase(scene, 'multi_gen', hint.tick, 'culture_inherited')
  }
}

/** Style blend weight for architecture planner / ethnos. */
export function architectureStyleWeights(scene: ArtScene): {
  ornament: number
  massing: number
  share: number
  motifs: number[]
} {
  return {
    ornament: scene.style.ornament,
    massing: scene.style.massing,
    share: scene.architectureShare,
    motifs: scene.style.motifs.slice(),
  }
}

export function tickArtScene(scene: ArtScene, ctx: ArtTickContext): ArtScene {
  // Slow decay without patronage
  if (scene.patronageSlow < 0.15 && scene.phase !== 'multi_gen') {
    scene.patronageSlow = clamp01(scene.patronageSlow - 0.002)
  }
  if (scene.phase !== 'multi_gen' && scene.patronageSlow < 0.05 && scene.architectureShare < 0.1 && ctx.roll > 0.97) {
    setPhase(scene, 'faded', ctx.tick, 'style_faded')
  }
  // Prosperity helps elite funding linger
  if ((ctx.villageProsperity ?? 0) > 0.5 && scene.phase === 'elite_funding') {
    scene.eliteFunding = clamp01(scene.eliteFunding + 0.005)
  }
  return scene
}

export function sceneStyleDrift(scene: ArtScene, other: ArtScene): number {
  return styleDistance(scene.style, other.style)
}