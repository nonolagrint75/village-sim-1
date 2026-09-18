import type { CreedId, FaithMovement, FaithWingState } from './types'
import { clamp01, pushEvent } from './util'

/**
 * Pure decision: should integrator spawn a schism faith circle?
 * Returns wing split hints: moderates (charity/tradition compromise) vs radicals (strict reform).
 */
export function tryFaithSchism(
  m: FaithMovement,
  parentMemberCount: number,
  reformMemberCount: number,
  tick: number,
  roll: number,
): {
  schism: boolean
  minorityCreed: CreedId
  majorityCreed: CreedId
  moderateIds: number[]
  radicalIds: number[]
  note: string
} {
  const ready =
    m.tension >= 0.4 &&
    m.following >= 0.3 &&
    reformMemberCount >= 2 &&
    parentMemberCount >= 2 &&
    (m.phase === 'tension' || m.phase === 'charity' || m.phase === 'following')
  if (!ready || roll > 0.7) {
    return {
      schism: false,
      minorityCreed: m.reformCreedId,
      majorityCreed: m.parentCreedId,
      moderateIds: [],
      radicalIds: [],
      note: 'not ready',
    }
  }

  m.phase = 'schism'
  const followers = [...m.followerIds]
  const radicalIds: number[] = []
  const moderateIds: number[] = []
  for (let i = 0; i < followers.length; i++) {
    // Higher index / reformer lean radical; charity-heavy lean moderate.
    const leanRadical = i === 0 || (i % 3 !== 0 && m.charityHeat < 0.55)
    if (leanRadical) radicalIds.push(followers[i])
    else moderateIds.push(followers[i])
  }
  if (moderateIds.length === 0 && radicalIds.length > 1) {
    moderateIds.push(radicalIds.pop()!)
  }
  if (radicalIds.length === 0 && moderateIds.length > 1) {
    radicalIds.push(moderateIds.pop()!)
  }

  const wings: FaithWingState[] = [
    {
      wing: 'radical',
      memberIds: radicalIds,
      creedId: m.reformCreedId,
      heat: clamp01(m.tension + 0.15),
    },
    {
      wing: 'moderate',
      memberIds: moderateIds,
      creedId: `${m.reformCreedId}:mod`,
      heat: clamp01(m.charityHeat * 0.5 + 0.2),
    },
  ]
  m.wings = wings

  pushEvent(m, {
    kind: 'faith_schism',
    tick,
    movementId: m.id,
    creedId: m.reformCreedId,
    note: `schism ${m.reformCreedId} from ${m.parentCreedId}`,
  })
  pushEvent(m, {
    kind: 'wing_split',
    tick,
    movementId: m.id,
    amount: radicalIds.length,
    note: `radicals=${radicalIds.length} moderates=${moderateIds.length}`,
  })

  return {
    schism: true,
    minorityCreed: m.reformCreedId,
    majorityCreed: m.parentCreedId,
    moderateIds,
    radicalIds,
    note: 'faith_schism',
  }
}

export function tryRegionalCreed(
  m: FaithMovement,
  villageIds: number[],
  shareByVillage: number[],
  tick: number,
): boolean {
  if (m.phase !== 'schism' && m.phase !== 'regional') return false
  if (villageIds.length < 2) return false
  const avg =
    shareByVillage.reduce((a, b) => a + b, 0) / Math.max(1, shareByVillage.length)
  if (avg < 0.45) return false
  m.regionalLock = true
  m.regionVillageIds = [...villageIds]
  m.phase = 'regional'
  pushEvent(m, {
    kind: 'regional_creed',
    tick,
    movementId: m.id,
    creedId: m.reformCreedId,
    amount: avg,
    note: 'regional creed lock',
  })
  return true
}