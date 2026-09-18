/**
 * Migrant association formation — mutual aid → named body → institution.
 */

import { clamp01 } from './cultureMix'
import { setAssociationStage } from './quarterIdentity'
import type {
  AssociationStage,
  MigrantAssociation,
  MigrantPerson,
  MigrantQuartersState,
  QuarterIdentity,
} from './types'

const STAGE_RANK: Record<AssociationStage, number> = {
  none: 0,
  informal_cluster: 1,
  mutual_aid: 2,
  named_association: 3,
  recognized_institution: 4,
}

function pushEvent(
  state: MigrantQuartersState,
  kind: MigrantQuartersState['events'][number]['kind'],
  extra: Partial<MigrantQuartersState['events'][number]> = {},
): void {
  state.events.push({ tick: state.tick, kind, ...extra })
  if (state.events.length > 200) state.events.splice(0, state.events.length - 200)
}

export function findAssociationForQuarter(
  state: MigrantQuartersState,
  quarterId: string,
): MigrantAssociation | null {
  return state.associations.find((a) => a.quarterId === quarterId) ?? null
}

export function desiredAssociationStage(
  quarter: QuarterIdentity,
  members: MigrantPerson[],
): AssociationStage {
  const n = members.length
  const workshops = members.filter((m) => m.workshopId).length
  const married = members.filter((m) => m.spouseLocalId != null).length
  const wealth = members.reduce((s, m) => s + m.wealth, 0)
  const welcomeOk = quarter.welcome >= 0.35 && quarter.suspicion <= 0.55
  if (n >= 10 && workshops >= 2 && wealth >= 40 && welcomeOk && quarter.popShare >= 0.08) {
    return 'recognized_institution'
  }
  if (n >= 6 && workshops >= 1 && married >= 2) return 'named_association'
  if (n >= 4 && (workshops >= 1 || married >= 1)) return 'mutual_aid'
  if (n >= 2) return 'informal_cluster'
  return 'none'
}

export function ensureAssociation(
  state: MigrantQuartersState,
  quarter: QuarterIdentity,
): MigrantAssociation | null {
  const members = state.people.filter((p) => p.quarterId === quarter.id)
  const desired = desiredAssociationStage(quarter, members)
  if (desired === 'none') return findAssociationForQuarter(state, quarter.id)

  let assoc = findAssociationForQuarter(state, quarter.id)
  if (!assoc) {
    const id = state.nextAssociationId++
    assoc = {
      id,
      quarterId: quarter.id,
      name: `Assoc-${quarter.originRegionId}`,
      stage: 'informal_cluster',
      memberIds: members.map((m) => m.id),
      cohesion: 0.35,
      treasury: 0,
      norms: ['mutual_aid', 'co_region_welcome'],
      formedTick: state.tick,
      isInstitution: false,
    }
    state.associations.push(assoc)
    for (const m of members) {
      m.associationId = id
      if (m.phase === 'quarter_resident') m.phase = 'association_member'
    }
    setAssociationStage(quarter, 'informal_cluster')
    pushEvent(state, 'association_formed', {
      associationId: id,
      quarterId: quarter.id,
      detail: 'informal_cluster',
    })
  }

  // Advance at most one stage per call — emergence, not jump.
  const cur = STAGE_RANK[assoc.stage]
  const want = STAGE_RANK[desired]
  if (want > cur) {
    const order: AssociationStage[] = [
      'none',
      'informal_cluster',
      'mutual_aid',
      'named_association',
      'recognized_institution',
    ]
    const next = order[Math.min(order.length - 1, cur + 1)]!
    assoc.stage = next
    setAssociationStage(quarter, next)
    if (next === 'recognized_institution') {
      assoc.isInstitution = true
      assoc.norms = [...new Set([...assoc.norms, 'dues', 'dispute_mediation', 'craft_standard'])]
      for (const m of members) {
        if (m.generation >= 1 || m.wealth > 8) m.phase = 'institution_elder'
      }
      pushEvent(state, 'association_instituted', {
        associationId: assoc.id,
        quarterId: quarter.id,
      })
    } else {
      pushEvent(state, 'association_formed', {
        associationId: assoc.id,
        quarterId: quarter.id,
        detail: next,
      })
    }
  }

  assoc.memberIds = members.map((m) => m.id)
  assoc.cohesion = clamp01(
    0.25 +
      members.length * 0.04 +
      quarter.welcome * 0.2 -
      quarter.suspicion * 0.15 +
      (assoc.isInstitution ? 0.15 : 0),
  )
  assoc.treasury = Math.max(
    0,
    assoc.treasury + members.reduce((s, m) => s + Math.min(0.4, m.wealth * 0.02), 0),
  )
  return assoc
}

export function tickAssociations(state: MigrantQuartersState): void {
  for (const q of state.quarters) {
    ensureAssociation(state, q)
  }
}