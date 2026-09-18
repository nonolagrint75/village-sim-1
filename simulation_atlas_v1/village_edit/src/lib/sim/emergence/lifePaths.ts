import type { SimState } from '../types'

export type LifeTypeId =
  | 'settler'
  | 'artisan'
  | 'trader'
  | 'warrior'
  | 'scholar'
  | 'outcast'

export type LifeTypeReport = {
  id: LifeTypeId
  count: number
  share: number
}

type LifeBag = { hits: Partial<Record<LifeTypeId, number>> }

export function ensureLifePathBag(state: SimState): LifeBag {
  const s = state as SimState & { lifePathBag?: LifeBag }
  if (!s.lifePathBag) s.lifePathBag = { hits: {} }
  return s.lifePathBag
}

export function noteLifeHit(state: SimState, id: LifeTypeId, weight = 1): void {
  const bag = ensureLifePathBag(state)
  bag.hits[id] = (bag.hits[id] ?? 0) + weight
}

export function evaluateLifeTypes(state: SimState): LifeTypeReport[] {
  const bag = ensureLifePathBag(state)
  const ids: LifeTypeId[] = ['settler', 'artisan', 'trader', 'warrior', 'scholar', 'outcast']
  let total = 0
  for (const id of ids) total += bag.hits[id] ?? 0
  const denom = Math.max(1, total)
  return ids.map((id) => ({
    id,
    count: bag.hits[id] ?? 0,
    share: (bag.hits[id] ?? 0) / denom,
  }))
}

export function lifeTypesSummary(state: SimState): { types: LifeTypeReport[]; totalHits: number } {
  const types = evaluateLifeTypes(state)
  return { types, totalHits: types.reduce((a, t) => a + t.count, 0) }
}