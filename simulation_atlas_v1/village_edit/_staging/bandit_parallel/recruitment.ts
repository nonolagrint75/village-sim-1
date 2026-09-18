/**
 * Recruitment into petty theft circles → gang membership.
 */

import { outlawAttraction } from './pressure'
import type { GangMember, GangRole, OutlawCandidate, ParallelGang } from './types'
import { aliveMembers, clamp, pushEventCap } from './util'

const ROLE_ORDER: GangRole[] = ['recruit', 'thief', 'ambusher', 'lieutenant', 'chief']

export function createGang(opts: {
  id: string
  name: string
  tick: number
  campX: number
  campY: number
  villageOriginId?: number | null
  founder: OutlawCandidate
}): ParallelGang {
  const ambush0 =
    opts.founder.lifeTag === 'Daren' || opts.founder.lifeTag === 'Kael'
      ? 0.35 + opts.founder.robustness * 0.2
      : 0.15
  const founder: GangMember = {
    actorId: opts.founder.actorId,
    lifeTag: opts.founder.lifeTag,
    role: 'chief',
    ambushSkill: ambush0,
    loyalty: 0.7,
    joinedTick: opts.tick,
    alive: true,
  }
  return {
    id: opts.id,
    name: opts.name,
    phase: 'forming',
    villageOriginId: opts.villageOriginId ?? opts.founder.villageId,
    campX: opts.campX,
    campY: opts.campY,
    formedTick: opts.tick,
    members: [founder],
    chiefId: founder.actorId,
    loot: { food: 0, coin: 0, goods: 0 },
    notoriety: 0.05,
    zoneControl: 0,
    parallel: { foodMoved: 0, coinMoved: 0, localSupport: 0.2, localHate: 0.1 },
    bounties: [],
    deals: [],
    lastAmbushTick: -999,
    raids: 0,
    events: [
      {
        kind: 'recruited',
        tick: opts.tick,
        gangId: opts.id,
        actorId: founder.actorId,
        note: 'founder',
      },
    ],
  }
}

/** Join existing gang if attraction high and gang not destroyed. */
export function recruitToGang(
  gang: ParallelGang,
  candidate: OutlawCandidate,
  tick: number,
  roll: number,
): GangMember | null {
  if (gang.phase === 'destroyed' || gang.phase === 'integrated') return null
  if (gang.members.some((m) => m.actorId === candidate.actorId && m.alive)) return null
  const alive = aliveMembers(gang).length
  if (alive >= 12) return null
  const attr = outlawAttraction(candidate)
  const gangPull = 0.15 + gang.notoriety * 0.2 + gang.parallel.localSupport * 0.15
  if (roll > clamp(attr + gangPull, 0, 0.95)) return null

  const ambushSkill =
    (candidate.lifeTag === 'Daren' || candidate.lifeTag === 'Kael' ? 0.3 : 0.1) +
    candidate.robustness * 0.15
  const member: GangMember = {
    actorId: candidate.actorId,
    lifeTag: candidate.lifeTag,
    role: 'recruit',
    ambushSkill: clamp(ambushSkill, 0, 1),
    loyalty: 0.4 + (1 - candidate.distrust) * 0.2,
    joinedTick: tick,
    alive: true,
  }
  gang.members.push(member)
  if (gang.phase === 'forming' && aliveMembers(gang).length >= 3) gang.phase = 'petty'
  pushEventCap(gang.events, {
    kind: 'recruited',
    tick,
    gangId: gang.id,
    actorId: candidate.actorId,
  })
  pushEventCap(gang.events, {
    kind: 'gang_grew',
    tick,
    gangId: gang.id,
    amount: aliveMembers(gang).length,
  })
  return member
}

export function promoteMember(gang: ParallelGang, actorId: number, tick: number): GangRole | null {
  const m = gang.members.find((x) => x.actorId === actorId && x.alive)
  if (!m || m.role === 'chief') return null
  const idx = ROLE_ORDER.indexOf(m.role)
  if (idx < 0 || idx >= ROLE_ORDER.length - 2) {
    // lieutenant max unless chief dies
    if (m.role === 'lieutenant') return null
  }
  const next = ROLE_ORDER[Math.min(idx + 1, ROLE_ORDER.length - 2)]!
  m.role = next
  pushEventCap(gang.events, {
    kind: 'promoted',
    tick,
    gangId: gang.id,
    actorId,
    note: next,
  })
  return next
}

/** Best ambusher (Daren/Kael path) becomes lieutenant / de facto organizer. */
export function ensureOrganizerHierarchy(gang: ParallelGang, tick: number): void {
  const alive = aliveMembers(gang) as import('./types').GangMember[]
  if (alive.length < 2) return
  const best = [...alive].sort((a, b) => b.ambushSkill - a.ambushSkill)[0]!
  if (best.role === 'recruit' || best.role === 'thief') {
    best.role = 'ambusher'
    pushEventCap(gang.events, {
      kind: 'promoted',
      tick,
      gangId: gang.id,
      actorId: best.actorId,
      note: 'ambusher',
    })
  }
  if (best.ambushSkill >= 0.55 && best.role === 'ambusher' && alive.length >= 4) {
    best.role = 'lieutenant'
    pushEventCap(gang.events, {
      kind: 'promoted',
      tick,
      gangId: gang.id,
      actorId: best.actorId,
      note: 'lieutenant',
    })
  }
}
