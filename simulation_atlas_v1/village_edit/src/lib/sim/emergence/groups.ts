/**
 * Phase B — social / professional groups facade over live politics Circles.
 * Circles remain the source of truth; this layer only queries and shapes.
 */
import { circlesOf, type Circle, type CircleKind } from '../politics'
import type { SimState, Villager } from '../types'

export interface GroupRef {
  id: number
  kind: CircleKind | string
  name: string
  isGuild: boolean
  cohesion: number
  memberCount: number
}

export interface GroupState {
  id: number
  name: string
  kind: CircleKind | string
  members: number[]
  origin: string | null
  interests: string[]
  sharedActivities: string[]
  territory: number | null
  cohesion: number
  reputation: number
  wealthInfluence: number
  createdAt: number
  isGuild: boolean
  isInstitution: boolean
}

function circleToRef(c: Circle): GroupRef {
  return {
    id: c.id,
    kind: c.kind,
    name: c.name,
    isGuild: c.isGuild,
    cohesion: c.cohesion,
    memberCount: c.memberIds.length,
  }
}

function circleToState(c: Circle): GroupState {
  const interests: string[] = []
  if (c.kind === 'craft' || c.isGuild) interests.push('craft')
  if (c.kind === 'trade') interests.push('trade')
  if (c.kind === 'threat') interests.push('security')
  if (c.kind === 'kin') interests.push('kin')
  if (c.kind === 'hunger') interests.push('food')
  if (c.creed) interests.push(`creed:${c.creed}`)
  for (const n of c.norms.slice(0, 4)) interests.push(`norm:${n}`)

  const sharedActivities: string[] = []
  if (c.kind === 'craft' || c.isGuild) sharedActivities.push('practice')
  if (c.kind === 'trade') sharedActivities.push('exchange')
  if (c.kind === 'threat') sharedActivities.push('patrol')
  if (c.pooledFood > 0) sharedActivities.push('food_pool')
  if (c.techIds.length > 0) sharedActivities.push('tech_share')

  return {
    id: c.id,
    name: c.name,
    kind: c.kind,
    members: c.memberIds.slice(),
    origin: c.originStory,
    interests,
    sharedActivities,
    territory: c.villageId,
    cohesion: c.cohesion,
    reputation: c.reputation,
    wealthInfluence: Math.min(1, c.pooledFood * 0.08 + (c.isInstitution ? 0.25 : 0) + (c.isGuild ? 0.2 : 0)),
    createdAt: c.formedTick,
    isGuild: c.isGuild,
    isInstitution: c.isInstitution,
  }
}

/** Circles the NPC belongs to (professional + social). */
export function getGroups(state: SimState, npc: Villager): GroupRef[] {
  return circlesOf(state, npc).map(circleToRef)
}

export function getGroupState(state: SimState, groupId: number): GroupState | null {
  const c = state.circles.find((x) => x.id === groupId)
  return c ? circleToState(c) : null
}

/** Cheap observability snapshot — does not mutate simulation. */
export function groupMetricsSnapshot(state: SimState): {
  group_created: number
  group_join: number
  group_leave: number
  average_group_size: number
  circle_count: number
  guild_count: number
} {
  const circles = state.circles ?? []
  let sizeSum = 0
  let guilds = 0
  for (const c of circles) {
    sizeSum += c.memberIds.length
    if (c.isGuild) guilds++
  }
  const sc = state.societyCounters
  return {
    group_created: sc?.circlesFormed ?? 0,
    group_join: sc?.circleJoins ?? 0,
    group_leave: sc?.circleDrops ?? 0,
    average_group_size: circles.length > 0 ? sizeSum / circles.length : 0,
    circle_count: circles.length,
    guild_count: guilds,
  }
}