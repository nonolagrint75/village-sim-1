/**
 * Kinship graph helpers — build / query multi-city family networks.
 * Pure-ish: operates on `KinshipGraph` bags only.
 */

import type {
  EdgeId,
  FamilyId,
  KinEdge,
  KinEdgeKind,
  KinLifeTag,
  KinPersonNode,
  KinProfessionTrack,
  KinshipGraph,
  LineageId,
  PersonId,
  VillageId,
} from './types'

function edgeId(a: PersonId, b: PersonId, kind: KinEdgeKind): EdgeId {
  const lo = Math.min(a, b)
  const hi = Math.max(a, b)
  return `${kind}:${lo}-${hi}`
}

export function createEmptyKinGraph(foundedTick = 0): KinshipGraph {
  return {
    nodes: new Map(),
    edges: [],
    rootLineageIds: [],
    foundedTick,
  }
}

export function upsertPerson(graph: KinshipGraph, node: KinPersonNode): KinPersonNode {
  graph.nodes.set(node.id, node)
  if (node.lineageId != null && !graph.rootLineageIds.includes(node.lineageId)) {
    if (graph.rootLineageIds.length < 32) graph.rootLineageIds.push(node.lineageId)
  }
  return node
}

export function ensureEdge(
  graph: KinshipGraph,
  a: PersonId,
  b: PersonId,
  kind: KinEdgeKind,
  weight: number,
  tick: number,
  villageIds: VillageId[] = [],
): KinEdge {
  const id = edgeId(a, b, kind)
  const existing = graph.edges.find((e) => e.id === id)
  if (existing) {
    existing.weight = Math.max(0, Math.min(1, Math.max(existing.weight, weight)))
    existing.villageIds = uniqueVillages([...existing.villageIds, ...villageIds])
    return existing
  }
  const edge: KinEdge = {
    id,
    a,
    b,
    kind,
    weight: clamp01(weight),
    formedTick: tick,
    villageIds: uniqueVillages(villageIds),
  }
  graph.edges.push(edge)
  return edge
}

/** Register a birth: parent→child edges + sibling links among co-parents' kids. */
export function registerKinBirth(
  graph: KinshipGraph,
  child: Omit<KinPersonNode, 'generation'> & { generation?: number },
  tick: number,
): KinPersonNode {
  const parents = child.parentIds
    .map((id) => graph.nodes.get(id))
    .filter((n): n is KinPersonNode => !!n)
  const gen =
    child.generation ??
    (parents.length ? Math.max(...parents.map((p) => p.generation)) + 1 : 0)
  const node: KinPersonNode = { ...child, generation: gen }
  upsertPerson(graph, node)

  const villages = uniqueVillages([
    ...(node.villageId != null ? [node.villageId] : []),
    ...parents.flatMap((p) => (p.villageId != null ? [p.villageId] : [])),
  ])

  for (const p of parents) {
    ensureEdge(graph, p.id, node.id, 'parent', 0.9, tick, villages)
    ensureEdge(graph, node.id, p.id, 'child', 0.9, tick, villages)
  }

  const siblingIds = new Set<PersonId>()
  for (const p of parents) {
    for (const e of graph.edges) {
      if (e.kind === 'parent' && e.a === p.id && e.b !== node.id) siblingIds.add(e.b)
      if (e.kind === 'child' && e.b === p.id && e.a !== node.id) siblingIds.add(e.a)
    }
  }
  for (const sid of siblingIds) {
    ensureEdge(graph, node.id, sid, 'sibling', 0.7, tick, villages)
  }
  return node
}

/** Marriage: spouse edge + affine links to parents-in-law. */
export function registerKinMarriage(
  graph: KinshipGraph,
  aId: PersonId,
  bId: PersonId,
  tick: number,
  kinshipBoost = 0.75,
): void {
  const a = graph.nodes.get(aId)
  const b = graph.nodes.get(bId)
  if (!a || !b) return
  a.spouseId = bId
  b.spouseId = aId
  const villages = uniqueVillages([
    ...(a.villageId != null ? [a.villageId] : []),
    ...(b.villageId != null ? [b.villageId] : []),
  ])
  ensureEdge(graph, aId, bId, 'spouse', kinshipBoost, tick, villages)

  for (const pid of a.parentIds) {
    ensureEdge(graph, bId, pid, 'affine', 0.45, tick, villages)
  }
  for (const pid of b.parentIds) {
    ensureEdge(graph, aId, pid, 'affine', 0.45, tick, villages)
  }
}

export function livingMembers(graph: KinshipGraph, lineageId: LineageId): KinPersonNode[] {
  const out: KinPersonNode[] = []
  for (const n of graph.nodes.values()) {
    if (n.alive && n.lineageId === lineageId) out.push(n)
  }
  return out
}

export function citiesForLineage(graph: KinshipGraph, lineageId: LineageId): VillageId[] {
  const set = new Set<VillageId>()
  for (const n of graph.nodes.values()) {
    if (n.lineageId === lineageId && n.villageId != null) set.add(n.villageId)
  }
  for (const e of graph.edges) {
    const na = graph.nodes.get(e.a)
    const nb = graph.nodes.get(e.b)
    if (!na || !nb) continue
    if (na.lineageId === lineageId || nb.lineageId === lineageId) {
      for (const v of e.villageIds) set.add(v)
    }
  }
  return [...set]
}

export function neighbors(
  graph: KinshipGraph,
  id: PersonId,
  kinds?: KinEdgeKind[],
): { otherId: PersonId; edge: KinEdge }[] {
  const out: { otherId: PersonId; edge: KinEdge }[] = []
  for (const e of graph.edges) {
    if (kinds && !kinds.includes(e.kind)) continue
    if (e.a === id) out.push({ otherId: e.b, edge: e })
    else if (e.b === id) out.push({ otherId: e.a, edge: e })
  }
  return out
}

/** Undirected BFS up to `maxDepth` (cousin discovery, crisis ripple). */
export function kinshipReach(
  graph: KinshipGraph,
  rootId: PersonId,
  maxDepth: number,
  kinds?: KinEdgeKind[],
): Map<PersonId, number> {
  const dist = new Map<PersonId, number>()
  dist.set(rootId, 0)
  const q: PersonId[] = [rootId]
  while (q.length) {
    const cur = q.shift()!
    const d = dist.get(cur)!
    if (d >= maxDepth) continue
    for (const { otherId } of neighbors(graph, cur, kinds)) {
      if (dist.has(otherId)) continue
      dist.set(otherId, d + 1)
      q.push(otherId)
    }
  }
  return dist
}

/**
 * Seed an ordinary multi-child household (Ayan/Nara shape).
 * Not a biography — structural stub for probes / integrator demos.
 */
export function seedOrdinaryHousehold(
  graph: KinshipGraph,
  opts: {
    parentA: PersonId
    parentB: PersonId
    childIds: PersonId[]
    lineageId: LineageId
    familyId: FamilyId
    villageId: VillageId
    tick: number
    lifeTag?: KinLifeTag
    parentTrack?: KinProfessionTrack
  },
): PersonId[] {
  const lifeTag = opts.lifeTag ?? 'generic'
  const parentTrack = opts.parentTrack ?? 'farmer'
  const base = {
    lineageId: opts.lineageId,
    familyId: opts.familyId,
    villageId: opts.villageId,
    spouseId: null as PersonId | null,
    alive: true,
    deathTick: null as number | null,
    coreProfession: null as string | null,
    firmIds: [] as string[],
    factionId: null as string | null,
    wealth: 12,
    lifeTag,
    generation: 0,
  }
  upsertPerson(graph, {
    ...base,
    id: opts.parentA,
    parentIds: [],
    birthTick: opts.tick - 8000,
    track: parentTrack,
    wealth: 18,
  })
  upsertPerson(graph, {
    ...base,
    id: opts.parentB,
    parentIds: [],
    birthTick: opts.tick - 7800,
    track: parentTrack,
    wealth: 16,
  })
  registerKinMarriage(graph, opts.parentA, opts.parentB, opts.tick)
  const kids: PersonId[] = []
  for (let i = 0; i < opts.childIds.length; i++) {
    const id = opts.childIds[i]!
    registerKinBirth(
      graph,
      {
        ...base,
        id,
        parentIds: [opts.parentA, opts.parentB],
        birthTick: opts.tick - 2000 + i * 400,
        track: 'none',
        wealth: 4,
        generation: 1,
      },
      opts.tick,
    )
    kids.push(id)
  }
  return kids
}

function uniqueVillages(ids: VillageId[]): VillageId[] {
  return [...new Set(ids)]
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n))
}