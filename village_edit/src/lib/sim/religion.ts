/**
 * Religions / cultes émergents — mécanismes soft uniquement.
 * Branche politics (creeds, cercles pieux), cognition (lieux sacrés),
 * livelihood (gourou / prêtre), ethnos (identité creed) et construction
 * (autel → chapelle → temple). Pas de religion prédéfinie.
 */

import { mindOf, peekMind } from './cognition/mindPool'
import type { CognitiveState } from './cognition/types'
import { ethnosOf } from './ethnos'
import { noteActivityPractice } from './livelihood'
import {
  CREED_FR,
  creedLabel,
  circlesOf,
  logCause,
  politicsOf,
  trySpreadCreed,
  type CreedId,
  villageOf,
} from './politics'
import { logEvent } from './social'
import type { SacredTier, SimState, Village, Villager } from './types'
import { distance } from './world'
import { enqueueBuildProject, intentFromReasons, type StructurePurpose } from './construction'

const SHRINE_RITE_COOLDOWN = 140
const CREED_FROM_PIETY = 0.48
const CHAPEL_RITES = 3
const TEMPLE_RITES = 7

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

/** Lignes de chronique liées à la foi / creed / rite (preuve headless). */
export const RELIGION_CHRONICLE_RE =
  /creed|foi|rite|rituel|autel|chapelle|temple|sanctuaire|sacré|recueillement|gourou|prêtre|conversion|convertit|voie |culte|honorer le sacré|cercle pieux|enseigne la voie|se répand|piété|pieux/i

export function isReligionChronicleLine(line: string): boolean {
  return RELIGION_CHRONICLE_RE.test(line)
}

export function sacredTierLabelFr(tier: SacredTier | undefined | null): string {
  if (tier === 'temple') return 'temple'
  if (tier === 'chapel') return 'chapelle'
  if (tier === 'shrine') return 'autel'
  return 'lieu de foi'
}

export function ensureVillageShrine(vg: Village): void {
  if (vg.hasShrine === undefined) vg.hasShrine = false
  if (vg.shrineX === undefined) vg.shrineX = -1
  if (vg.shrineY === undefined) vg.shrineY = -1
  if (vg.shrineLabel === undefined) vg.shrineLabel = null
  if (vg.shrineCreed === undefined) vg.shrineCreed = null
  if (vg.lastShrineRiteTick === undefined) vg.lastShrineRiteTick = 0
  if (vg.sacredTier === undefined) vg.sacredTier = vg.hasShrine ? 'shrine' : 'none'
  if (vg.shrineRiteCount === undefined) vg.shrineRiteCount = 0
}

function siteNameFr(
  tier: SacredTier,
  creed: CreedId | null,
  cultureTag: string | null,
): string {
  const voie = creed ? CREED_FR[creed] : 'le recueillement'
  const tag = cultureTag && cultureTag.length > 1 ? cultureTag : 'pierre'
  if (tier === 'temple') return `temple de ${tag} (« ${voie} »)`
  if (tier === 'chapel') return `chapelle de ${tag} (« ${voie} »)`
  return `autel de ${tag} (« ${voie} »)`
}

function bumpEthnosCreed(v: Villager, amount: number): void {
  const eth = ethnosOf(v)
  eth.identity.creed = clamp01(eth.identity.creed + amount)
}

/** Soft: piété monte par deuil, âge, cercle pieux — sans script de religion. */
function tickPietyDrift(state: SimState, v: Villager): void {
  const pol = politicsOf(v)
  let bump = 0
  for (const m of v.memories) {
    if (state.tick - m.tick > 500) continue
    if (m.kind === 'grief' || m.kind === 'harmed' || m.kind === 'saved') bump += 0.008
  }
  if (v.age > 700) bump += 0.005
  const faith = circlesOf(state, v).some((c) => c.kind === 'faith' || c.creed === 'piete')
  if (faith) bump += 0.01
  const mind = peekMind(v.id)
  if (mind && mind.sacredConf > 0.25) bump += 0.006
  // Soft culture/ethnos: traditional tags lean toward piety.
  if (mind?.cultureTag === 'pierre' || mind?.cultureTag === 'blé') bump += 0.004
  if (bump > 0) {
    pol.beliefs.piety = clamp01(pol.beliefs.piety + bump)
    if (pol.beliefs.piety > 0.4) {
      pol.creedWeight = clamp01(pol.creedWeight + 0.014 + pol.beliefs.piety * 0.012)
    }
  }
}

/**
 * Crystallise un creed depuis la piété / le lieu sacré (pas seulement grief).
 * Retourne true si un nouveau creed apparaît.
 */
export function maybeCrystallizeFaithCreed(state: SimState, v: Villager): boolean {
  const pol = politicsOf(v)
  const mind = peekMind(v.id)
  const sacred = mind?.sacredConf ?? 0
  const ready =
    pol.beliefs.piety >= CREED_FROM_PIETY &&
    (pol.creedWeight >= 0.24 || sacred >= 0.28 || circlesOf(state, v).some((c) => c.kind === 'faith'))
  if (!ready) return false

  let next: CreedId | null = null
  if (pol.beliefs.piety >= 0.52 || sacred >= 0.38) next = 'piete'
  else if (pol.beliefs.tradition > 0.6) next = 'tradition'
  else if (pol.beliefs.fairness > 0.6) next = 'partage'
  else if (pol.grievance > 0.45) next = 'ordre'
  else if (pol.beliefs.piety >= CREED_FROM_PIETY) next = 'piete'

  if (!next || next === pol.creed) {
    if (pol.creed) pol.creedWeight = clamp01(pol.creedWeight + 0.015)
    return false
  }

  const prev = pol.creed
  pol.creed = next
  pol.creedWeight = Math.max(pol.creedWeight, 0.42)
  bumpEthnosCreed(v, 0.08)
  const label = CREED_FR[next]
  if (!prev) {
    logCause(state, `piété croissante de ${v.name}`, `creed : « ${label} »`)
    if (!state.milestones.firstCreed) {
      state.milestones.firstCreed = true
      logEvent(state, `Première voie de foi : « ${label} » (portée par ${v.name})`)
    }
  } else {
    logCause(state, `${v.name} change de conviction`, `creed : « ${label} »`)
  }
  return true
}

function livingMembers(state: SimState, ids: number[]): Villager[] {
  const out: Villager[] = []
  for (const id of ids) {
    const v = state.villagers.find((o) => o.id === id && o.alive)
    if (v) out.push(v)
  }
  return out
}

function villageMembers(state: SimState, villageId: number): Villager[] {
  const out: Villager[] = []
  for (const v of state.villagers) {
    if (v.alive && v.villageId === villageId) out.push(v)
  }
  return out
}

function faithCirclesFor(state: SimState, villageId: number) {
  return state.circles.filter(
    (c) => c.villageId === villageId && (c.kind === 'faith' || c.creed === 'piete') && c.memberIds.length >= 2,
  )
}

function hasSacredProject(state: SimState, villageId: number): boolean {
  return state.projects.some(
    (p) =>
      p.villageId === villageId &&
      p.phase !== 'done' &&
      (p.intent.purposes.includes('shrine') ||
        p.intent.purposes.includes('chapel') ||
        p.intent.purposes.includes('temple')),
  )
}

function enqueueSacredBuild(
  state: SimState,
  vg: Village,
  tier: 'shrine' | 'chapel' | 'temple',
  leader: Villager,
  circleId: number | null,
  reasons: string[],
): void {
  const purpose: StructurePurpose = tier
  const scale =
    tier === 'temple' ? 0.72 : tier === 'chapel' ? 0.55 : 0.38
  const project = enqueueBuildProject(
    state,
    intentFromReasons(reasons, {
      purposes: [purpose],
      scale,
      wood: tier === 'temple' ? 0.5 : 0.55,
      stone: tier === 'temple' ? 0.85 : tier === 'chapel' ? 0.72 : 0.62,
    }),
    {
      ownerId: leader.id,
      villageId: vg.id,
      nearX: vg.shrineX >= 0 ? vg.shrineX : leader.x,
      nearY: vg.shrineY >= 0 ? vg.shrineY : leader.y,
      laborHint: tier === 'temple' ? 1.6 : tier === 'chapel' ? 1.35 : 1.1,
      sponsorCircleId: circleId,
    },
  )
  if (project && circleId !== null) {
    const circle = state.circles.find((c) => c.id === circleId)
    if (circle) {
      for (const m of livingMembers(state, circle.memberIds).slice(0, 4)) {
        if (m.activeProjectId === null) m.activeProjectId = project.id
      }
    }
  }
}

/** Autel villageois : point de rencontre sacré émergent. */
function maybeFoundShrine(state: SimState, vg: Village): void {
  ensureVillageShrine(vg)
  if (vg.hasShrine || vg.sacredTier !== 'none') return

  const faith = faithCirclesFor(state, vg.id)
  if (faith.length === 0) return

  const members = villageMembers(state, vg.id)
  let best: Villager | null = null
  let bestScore = 0
  for (const v of members) {
    const pol = politicsOf(v)
    const mind = peekMind(v.id)
    const score =
      pol.beliefs.piety * 0.5 +
      (mind?.sacredConf ?? 0) * 0.5 +
      (pol.creed === 'piete' ? 0.2 : 0) +
      (pol.creedWeight > 0.3 ? 0.1 : 0)
    if (score > bestScore) {
      bestScore = score
      best = v
    }
  }
  if (!best || bestScore < 0.36) return

  const mind = mindOf(best)
  const sx = mind.sacredConf > 0.2 ? mind.sacredX : Math.round(vg.centerX + (best.x - vg.centerX) * 0.3)
  const sy = mind.sacredConf > 0.2 ? mind.sacredY : Math.round(vg.centerY + (best.y - vg.centerY) * 0.3)
  const creed = (politicsOf(best).creed ?? faith[0]!.creed ?? 'piete') as CreedId | null
  const label = siteNameFr('shrine', creed === 'piete' || creed ? creed : 'piete', mind.cultureTag)

  vg.hasShrine = true
  vg.sacredTier = 'shrine'
  vg.shrineX = sx
  vg.shrineY = sy
  vg.shrineLabel = label
  vg.shrineCreed = creed ?? 'piete'
  vg.lastShrineRiteTick = state.tick
  vg.shrineRiteCount = 0

  for (const v of members) {
    const m = peekMind(v.id)
    if (!m) continue
    m.sacredX = sx
    m.sacredY = sy
    m.sacredConf = clamp01(m.sacredConf + 0.12)
  }

  logCause(state, `recueillement partagé au village n°${vg.id}`, `${label} s'élève`)
  if (!state.milestones.firstShrine) {
    state.milestones.firstShrine = true
    logEvent(state, `Premier sanctuaire : ${label}`)
  }

  const leader = faith[0]!.leaderId !== null
    ? members.find((m) => m.id === faith[0]!.leaderId) ?? best
    : best
  if (!hasSacredProject(state, vg.id)) {
    enqueueSacredBuild(
      state,
      vg,
      'shrine',
      leader,
      faith[0]!.id,
      [`foi du ${faith[0]!.name}`, 'autel', 'sanctuaire', 'recueillement'],
    )
  }
}

/** Autel → chapelle → temple selon rites, fidèles et légitimité. */
function maybeUpgradeSacredSite(state: SimState, vg: Village): void {
  ensureVillageShrine(vg)
  if (!vg.hasShrine || vg.shrineX < 0) return
  if (vg.sacredTier === 'temple') return
  if (hasSacredProject(state, vg.id)) return

  const faith = faithCirclesFor(state, vg.id)
  if (faith.length === 0) return
  const circle = faith[0]!
  const members = villageMembers(state, vg.id)
  const faithful = members.filter((m) => {
    const pol = politicsOf(m)
    return pol.creed !== null || pol.beliefs.piety > 0.5 || pol.creedWeight > 0.3
  }).length
  const hasGuide = members.some((m) => {
    const tag = peekMind(m.id)?.livelihood?.roleTag
    return tag === 'gourou' || tag === 'pretre'
  })
  const cultureTag =
    members.map((m) => peekMind(m.id)?.cultureTag).find((t) => t && t.length > 1) ?? null
  const creed = (vg.shrineCreed as CreedId | null) ?? 'piete'

  const leader =
    circle.leaderId !== null
      ? members.find((m) => m.id === circle.leaderId) ?? members[0]!
      : members[0]!

  if (vg.sacredTier === 'shrine' && vg.shrineRiteCount >= CHAPEL_RITES && faithful >= 2) {
    vg.sacredTier = 'chapel'
    vg.shrineLabel = siteNameFr('chapel', creed, cultureTag)
    logCause(state, `rites répétés au village n°${vg.id}`, `${vg.shrineLabel} remplace l'autel`)
    if (!state.milestones.firstChapel) {
      state.milestones.firstChapel = true
      logEvent(state, `Première chapelle : ${vg.shrineLabel}`)
    }
    enqueueSacredBuild(
      state,
      vg,
      'chapel',
      leader,
      circle.id,
      [`foi du ${circle.name}`, 'chapelle', 'sanctuaire', 'recueillement'],
    )
    return
  }

  if (
    vg.sacredTier === 'chapel' &&
    vg.shrineRiteCount >= TEMPLE_RITES &&
    faithful >= 3 &&
    (hasGuide || circle.legitimacy > 0.4)
  ) {
    vg.sacredTier = 'temple'
    vg.shrineLabel = siteNameFr('temple', creed, cultureTag)
    logCause(state, `culte affermi au village n°${vg.id}`, `${vg.shrineLabel} s'élève`)
    if (!state.milestones.firstTemple) {
      state.milestones.firstTemple = true
      logEvent(state, `Premier temple : ${vg.shrineLabel}`)
    }
    enqueueSacredBuild(
      state,
      vg,
      'temple',
      leader,
      circle.id,
      [`foi du ${circle.name}`, 'temple', 'sanctuaire', 'culte'],
    )
  }
}

/** Rite près du lieu sacré — cohésion, piété, chronicle FR. */
function tickShrineRitual(state: SimState, vg: Village): void {
  ensureVillageShrine(vg)
  if (!vg.hasShrine || vg.shrineX < 0) return
  if (state.tick - vg.lastShrineRiteTick < SHRINE_RITE_COOLDOWN) return

  const members = villageMembers(state, vg.id)
  const radius = vg.sacredTier === 'temple' ? 18 : vg.sacredTier === 'chapel' ? 16 : 14
  let near = 0
  const attendees: Villager[] = []
  for (const m of members) {
    if (distance(m.x, m.y, vg.shrineX, vg.shrineY) < radius) {
      near++
      attendees.push(m)
    }
  }
  if (near < 2) return

  vg.lastShrineRiteTick = state.tick
  vg.lastRitualTick = state.tick
  vg.shrineRiteCount = (vg.shrineRiteCount ?? 0) + 1
  vg.cohesion = clamp01(vg.cohesion + 0.04 + (vg.sacredTier === 'temple' ? 0.02 : 0))

  let guide: Villager | null = null
  let guideScore = 0
  for (const m of attendees) {
    const pol = politicsOf(m)
    const live = peekMind(m.id)?.livelihood
    const score =
      pol.beliefs.piety +
      (live?.roleTag === 'gourou' || live?.roleTag === 'pretre' || live?.roleTag === 'guerisseur'
        ? 0.35
        : 0) +
      (pol.creed ? 0.15 : 0)
    if (score > guideScore) {
      guideScore = score
      guide = m
    }
  }

  for (const m of attendees) {
    const pol = politicsOf(m)
    pol.beliefs.piety = clamp01(pol.beliefs.piety + 0.025)
    pol.beliefs.loyalty = clamp01(pol.beliefs.loyalty + 0.012)
    pol.normInternalization = clamp01(pol.normInternalization + 0.01)
    pol.grievance = clamp01(pol.grievance - 0.025)
    bumpEthnosCreed(m, 0.03)
    if (vg.shrineCreed && (!pol.creed || pol.creedWeight < 0.35)) {
      if (!pol.creed) {
        pol.creed = vg.shrineCreed as CreedId
        pol.creedWeight = 0.3
      } else {
        pol.creedWeight = clamp01(pol.creedWeight + 0.04)
      }
    }
    const mind = peekMind(m.id)
    if (mind) {
      mind.sacredX = vg.shrineX
      mind.sacredY = vg.shrineY
      mind.sacredConf = clamp01(mind.sacredConf + 0.05)
      mind.emotions.stress = clamp01(mind.emotions.stress - 0.05)
      mind.needs.piety = clamp01(mind.needs.piety - 0.12)
      mind.needs.belonging = clamp01(mind.needs.belonging - 0.08)
    }
  }

  if (guide) {
    for (const m of attendees) {
      if (m.id === guide.id) continue
      trySpreadCreed(state, guide, m)
    }
    noteActivityPractice(guide, 'ritual', 0.9)
    noteActivityPractice(guide, 'counsel', 0.4)
    const live = mindOf(guide).livelihood
    if (live && (live.roleTag === null || live.mix.ritual + live.mix.counsel > 0.12)) {
      live.mix.ritual = clamp01(live.mix.ritual + 0.05)
      live.mix.counsel = clamp01(live.mix.counsel + 0.03)
      live.recognition = clamp01(live.recognition + 0.03)
    }
  }

  const place = vg.shrineLabel ?? sacredTierLabelFr(vg.sacredTier)
  const who = guide ? `sous la conduite de ${guide.name}` : `avec ${near} fidèles`
  logCause(state, `rite au ${place}`, `le recueillement renforce la foi ${who}`)
  if (!state.milestones.firstRitual) {
    state.milestones.firstRitual = true
    logEvent(state, `Premier rituel : ${place}`)
  }
  const guideRole = guide ? peekMind(guide.id)?.livelihood.roleTag : null
  if (
    guide &&
    (guideRole === 'gourou' ||
      guideRole === 'pretre' ||
      politicsOf(guide).beliefs.piety > 0.65)
  ) {
    if ((state.tick + guide.id) % 200 < 24) {
      const title =
        guideRole === 'pretre' || vg.sacredTier === 'chapel' || vg.sacredTier === 'temple'
          ? 'prêtre'
          : 'gourou'
      logEvent(state, `${guide.name} guide le rite comme ${title} près de ${place}`)
    }
  }
}

/** Gourou / prêtre émergent parmi les pieux. */
function maybeRecognizePriest(state: SimState, v: Villager): void {
  const pol = politicsOf(v)
  const mind = peekMind(v.id)
  if (!mind) return
  const live = mind.livelihood
  if (!live) return
  if (live.roleTag === 'gourou' || live.roleTag === 'pretre') {
    // Promote title with village sacred tier.
    const vg = villageOf(state, v.villageId)
    if (vg && (vg.sacredTier === 'chapel' || vg.sacredTier === 'temple') && live.roleTag === 'gourou') {
      live.roleTag = 'pretre'
      live.titleFr = vg.sacredTier === 'temple' ? 'grand prêtre' : 'prêtre'
      live.lastTitleTick = state.tick
      logCause(state, `culte du village n°${vg.id}`, `${v.name} est reconnu comme ${live.titleFr}`)
    }
    return
  }
  const faithMember = circlesOf(state, v).some((c) => c.kind === 'faith')
  const ready =
    (pol.beliefs.piety > 0.52 && mind.sacredConf > 0.3 && (pol.creed !== null || faithMember)) ||
    (faithMember && pol.beliefs.piety > 0.48 && live.mix.counsel + live.mix.ritual > 0.18)
  if (!ready) return
  if ((state.tick + v.id * 11) % 160 !== 0) return

  live.mix.counsel = clamp01(Math.max(live.mix.counsel, 0.28))
  live.mix.ritual = clamp01(Math.max(live.mix.ritual, 0.22))
  const vg = villageOf(state, v.villageId)
  const elevated = vg && (vg.sacredTier === 'chapel' || vg.sacredTier === 'temple')
  live.roleTag = elevated ? 'pretre' : 'gourou'
  live.titleFr =
    elevated && vg!.sacredTier === 'temple' ? 'grand prêtre' : elevated ? 'prêtre' : 'gourou'
  live.recognition = clamp01(live.recognition + 0.08)
  live.lastTitleTick = state.tick
  bumpEthnosCreed(v, 0.06)
  logCause(state, `piété et écoute autour de ${v.name}`, `${v.name} est reconnu comme ${live.titleFr}`)
}

/** Conversion soft lors d'un conseil spirituel. */
export function noteSpiritualCounsel(state: SimState, guide: Villager, seeker: Villager): void {
  const gp = politicsOf(guide)
  const sp = politicsOf(seeker)
  sp.beliefs.piety = clamp01(sp.beliefs.piety + 0.02)
  bumpEthnosCreed(seeker, 0.02)
  bumpEthnosCreed(guide, 0.01)
  const gm = peekMind(guide.id)
  if (gm) {
    gm.sacredConf = clamp01(gm.sacredConf + 0.02)
  }
  noteActivityPractice(guide, 'counsel', 1)
  const sm = peekMind(seeker.id)
  if (sm && gm) {
    sm.sacredX = gm.sacredX
    sm.sacredY = gm.sacredY
    sm.sacredConf = clamp01(sm.sacredConf + 0.03)
  }

  if (gp.creed && gp.creedWeight >= 0.3) {
    const before = sp.creed
    trySpreadCreed(state, guide, seeker)
    if (sp.creed === gp.creed && before !== gp.creed) {
      logCause(
        state,
        `${guide.name} enseigne la voie à ${seeker.name}`,
        `conversion : « ${CREED_FR[gp.creed]} »`,
      )
    } else if (sp.creed === gp.creed) {
      sp.creedWeight = clamp01(sp.creedWeight + 0.06)
    }
  } else if (gp.beliefs.piety > 0.55 && !gp.creed) {
    gp.creedWeight = clamp01(gp.creedWeight + 0.04)
  }
}

/** Effet d'une tâche ritual près du lieu sacré. */
export function noteRitualPractice(state: SimState, v: Villager): void {
  const pol = politicsOf(v)
  const mind = peekMind(v.id)
  pol.beliefs.piety = clamp01(pol.beliefs.piety + 0.02)
  pol.creedWeight = clamp01(pol.creedWeight + 0.025)
  bumpEthnosCreed(v, 0.025)
  noteActivityPractice(v, 'ritual', 1)
  if (mind) {
    mind.sacredConf = clamp01(mind.sacredConf + 0.04)
    mind.needs.piety = clamp01(mind.needs.piety - 0.14)
    mind.needs.belonging = clamp01(mind.needs.belonging - 0.06)
    mind.emotions.stress = clamp01(mind.emotions.stress - 0.04)
  }
  const vg = villageOf(state, v.villageId)
  if (vg) {
    ensureVillageShrine(vg)
    if (vg.hasShrine && vg.shrineX >= 0 && distance(v.x, v.y, vg.shrineX, vg.shrineY) < 16) {
      if (mind) {
        mind.sacredX = vg.shrineX
        mind.sacredY = vg.shrineY
      }
    }
  }
}

export function religionPortraitFr(state: SimState, v: Villager, mind: CognitiveState | null): string | null {
  const pol = politicsOf(v)
  const bits: string[] = []
  if (pol.creed) bits.push(`voie « ${creedLabel(pol.creed)} »`)
  if (mind && mind.sacredConf > 0.2) {
    bits.push(`lieu sacré ${Math.round(mind.sacredConf * 100)} %`)
  }
  const vg = villageOf(state, v.villageId)
  if (vg) {
    ensureVillageShrine(vg)
    if (vg.hasShrine && vg.shrineLabel) bits.push(vg.shrineLabel)
    else if (vg.sacredTier && vg.sacredTier !== 'none') bits.push(sacredTierLabelFr(vg.sacredTier))
  }
  const role = mind?.livelihood?.roleTag
  if (role === 'pretre') bits.push(mind?.livelihood?.titleFr ?? 'prêtre')
  else if (role === 'gourou' || role === 'guerisseur') bits.push(role === 'gourou' ? 'gourou' : 'guérisseur')
  return bits.length ? bits.join(' · ') : null
}

/**
 * Tick monde — appelé depuis tickPolitics (cadence cercles).
 * Forme creeds, autels/chapelles/temples, rites et gourous de façon visible.
 */
export function tickReligionWorld(state: SimState): void {
  for (const v of state.villagers) {
    if (!v.alive) continue
    if ((state.tick + v.id * 7) % 32 !== 0) continue
    tickPietyDrift(state, v)
    maybeCrystallizeFaithCreed(state, v)
    maybeRecognizePriest(state, v)
  }

  for (const vg of state.villages) {
    ensureVillageShrine(vg)
    maybeFoundShrine(state, vg)
    maybeUpgradeSacredSite(state, vg)
    tickShrineRitual(state, vg)
  }

  // Soft persistence so cult life stays visible mid-run (jours 30–60+).
  // Cadence must align with BELIEF_TICK (48): 48*8 = 384 ≈ 5,3 jours.
  if (state.tick > 0 && state.tick % 384 === 0) {
    for (const vg of state.villages) {
      ensureVillageShrine(vg)
      if (!vg.hasShrine || !vg.shrineLabel) continue
      const faithful = villageMembers(state, vg.id).filter((v) => {
        const pol = politicsOf(v)
        return pol.creed !== null || pol.beliefs.piety > 0.5
      })
      if (faithful.length < 2) continue
      logCause(
        state,
        `foi vivante au village n°${vg.id}`,
        `${faithful.length} villageois honorent encore ${vg.shrineLabel}`,
      )
    }
    for (const c of state.circles) {
      if (c.kind !== 'faith') continue
      const members = livingMembers(state, c.memberIds)
      if (members.length < 2) continue
      if ((Math.floor(state.tick / 384) + c.id) % 2 !== 0) continue
      const leader = c.leaderId !== null ? members.find((m) => m.id === c.leaderId) : members[0]
      logCause(
        state,
        `persistance du ${c.name}`,
        leader
          ? `${leader.name} entretient le rite parmi ${members.length} fidèles`
          : `le culte pieux rassemble ${members.length} fidèles`,
      )
    }
  }

  for (const c of state.circles) {
    if (c.kind !== 'faith' && c.creed !== 'piete') continue
    const members = livingMembers(state, c.memberIds)
    if (members.length < 2) continue
    const vg = villageOf(state, c.villageId)
    if (vg) ensureVillageShrine(vg)
    let sx = 0
    let sy = 0
    if (vg?.hasShrine && vg.shrineX >= 0) {
      sx = vg.shrineX
      sy = vg.shrineY
    } else {
      for (const m of members) {
        sx += m.x
        sy += m.y
      }
      sx = Math.round(sx / members.length)
      sy = Math.round(sy / members.length)
    }
    for (const m of members) {
      const mind = peekMind(m.id)
      if (!mind) continue
      mind.sacredX = sx
      mind.sacredY = sy
      if (distance(m.x, m.y, sx, sy) < 16) {
        mind.sacredConf = clamp01(mind.sacredConf + 0.02)
      }
    }
  }
}
