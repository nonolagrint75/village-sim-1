/**
 * Cognition hooks for generative construction.
 * Deep think proposes StructureIntent → enqueueBuildProject; behaviors stamp tiles.
 */
import {
  describeIntent,
  enqueueBuildProject,
  findProject,
  fortifyIsBuilt,
  intentFromReasons,
  pickProjectForVillager,
  type StructureIntent,
  type StructurePurpose,
} from '../construction'
import { countOf } from '../inventory'
import { hasKnowledge } from '../technology'
import type { SimState, Villager } from '../types'
import type { CognitiveState } from './types'

export type { StructureIntent, StructurePurpose }
export { describeIntent, intentFromReasons, enqueueBuildProject, pickProjectForVillager, findProject }

/** French reason line for UI / lastReasons when a chantier is active. */
export function constructionReasonFr(state: SimState, v: Villager): string | null {
  const p = pickProjectForVillager(state, v) ?? (v.activeProjectId !== null ? findProject(state, v.activeProjectId) : null)
  if (!p || p.phase === 'done') return null
  return `chantier : ${p.label} · ${p.phase}`
}

function villageHasOpenFortify(state: SimState, villageId: number): boolean {
  return state.projects.some(
    (p) => p.villageId === villageId && p.phase !== 'done' && p.intent.purposes.includes('fortify'),
  )
}

function villageHasDoneKeep(state: SimState, villageId: number): boolean {
  return state.projects.some(
    (p) => p.villageId === villageId && fortifyIsBuilt(state, p) && (p.params.towers || p.params.wallMaterial === 'stone' || p.intent.scale >= 0.5),
  )
}

/**
 * Life → soft StructureIntent. Returns null if no strong trigger.
 * Purpose tags only — never Castle/TownHall enums.
 */
export function evaluateLifeBuildIntent(state: SimState, v: Villager, mind: CognitiveState): StructureIntent | null {
  const village = state.villages.find((g) => g.id === v.villageId)
  const coins = countOf(v.inventory, 'coin')
  const wood = countOf(v.inventory, 'wood')
  const stone = countOf(v.inventory, 'stone')
  const wolvesNear = mind.semantic.some((s) => s.kind === 'wolves_near' && s.confidence > 0.28)
  const dangerMem = mind.semantic.some((s) => s.kind === 'danger_spot' && s.confidence > 0.32)
  const fear = mind.emotions.fear
  const safety = mind.needs.safety

  if (village && !villageHasOpenFortify(state, village.id)) {
    const stackKnown =
      hasKnowledge(v.knowledge, 'stack_stone_high', 0.22) ||
      hasKnowledge(village.knowledge, 'stack_stone_high', 0.25)
    const keepKnown =
      hasKnowledge(v.knowledge, 'high_stone_keep', 0.25) ||
      hasKnowledge(village.knowledge, 'high_stone_keep', 0.28)
    const stoneSurplus = village.surplus.stone ?? 0
    const prosperous =
      (village.prosperity ?? 0) >= 42 ||
      (village.standardOfLiving ?? 0) >= 0.4 ||
      stoneSurplus >= 0.7 ||
      coins >= 3
    const threatened =
      wolvesNear ||
      dangerMem ||
      fear > 0.28 ||
      safety > 0.32 ||
      (village.recentDeaths ?? 0) > 0.15 ||
      (village.security ?? 0.5) < 0.48
    const midSettled = village.memberIds.length >= 3 && (v.hasHome || village.memberIds.length >= 5)
    const wantsKeepUpgrade = keepKnown || (stackKnown && prosperous)
    const alreadyKeep = villageHasDoneKeep(state, village.id)

    // Threat → palissade / fort even before stone walls exist.
    if (threatened && midSettled && (village.wallTier !== 'stone' || !alreadyKeep)) {
      const baseScale = village.memberIds.length >= 6 ? 0.55 : 0.38
      const stoneBias = stone >= wood || keepKnown || stackKnown || stoneSurplus > 0.5 ? 0.78 : 0.48
      return intentFromReasons(
        [wolvesNear || fear > 0.35 ? 'loups / menace' : 'sécurité du village', 'fortifier'],
        {
          purposes: ['fortify'],
          scale: keepKnown ? Math.min(1, baseScale + 0.28) : stackKnown ? Math.min(1, baseScale + 0.12) : baseScale,
          wood: stoneBias > 0.6 ? 0.28 : 0.58,
          stone: stoneBias,
        },
      )
    }

    // Wealth / tech → stone keep / towers even after a wood enceinte.
    if (
      midSettled &&
      !alreadyKeep &&
      (wantsKeepUpgrade || (prosperous && (stone >= 2 || stoneSurplus >= 0.55 || stackKnown))) &&
      (keepKnown || stackKnown || prosperous)
    ) {
      return intentFromReasons(
        [
          keepKnown ? 'technique du donjon' : stackKnown ? 'maçonnerie haute' : 'prospérité',
          'keep / fort de pierre',
        ],
        {
          purposes: ['fortify'],
          scale: keepKnown ? 0.78 : stackKnown ? 0.62 : 0.5,
          wood: 0.22,
          stone: 0.85,
        },
      )
    }
  }

  if (state.famine || mind.needs.hunger > 0.55) {
    if (v.hasHome && (!v.hasChest || (v.chestInventory && countOf(v.chestInventory, 'food') + countOf(v.chestInventory, 'bread') < 2))) {
      return intentFromReasons([state.famine ? 'famine' : 'vivres insuffisants', 'grenier'], {
        purposes: ['store'],
        scale: state.famine ? 0.55 : 0.35,
        wood: 0.7,
        stone: 0.25,
      })
    }
  }

  if (village) {
    let homes = 0
    for (const o of state.villagers) {
      if (o.alive && o.villageId === village.id && o.hasHome) homes++
    }
    const crowded = village.memberIds.length >= 10 && homes > 0 && village.memberIds.length / Math.max(1, homes) > 2.2
    if ((crowded || mind.values.freedom > 0.55) && (v.personality.curiosity > 0.4 || v.ambition === 'explorer' || !v.hasHome)) {
      return intentFromReasons([crowded ? 'surpeuplement' : 'envie de migrer', 'nouveau foyer'], {
        purposes: ['homestead', 'shelter'],
        scale: crowded ? 0.5 : 0.3,
        wood: 0.7,
        stone: 0.25,
      })
    }
  }

  const oreFact = mind.semantic.find(
    (s) =>
      (s.label.includes('fer') || s.label.includes('or') || s.label.includes('montagne') || s.kind === 'resource_scarce') &&
      s.confidence > 0.35,
  )
  if (oreFact && v.hasWorkbench && (v.profession === 'miner' || v.profession === 'mason' || mind.needs.purpose > 0.45)) {
    return intentFromReasons(['gisement connu', 'accès de mine'], {
      purposes: ['mining_access', 'mine'],
      scale: 0.4,
      wood: 0.4,
      stone: 0.65,
    })
  }

  if (village && village.memberIds.length >= 6 && v.hasHome) {
    if (v.ambition === 'leader' || v.profession === 'trader' || mind.needs.social > 0.4) {
      return intentFromReasons(['cercle des anciens / commerce', 'halle'], {
        purposes: ['gather', 'prestige'],
        scale: village.memberIds.length >= 12 ? 0.8 : 0.55,
        wood: 0.5,
        stone: 0.55,
      })
    }
  }

  if (
    v.hasHome &&
    (coins >= 4 || mind.needs.status > 0.45) &&
    (v.personality.ambition > 0.55 || v.ambition === 'leader' || v.ambition === 'builder') &&
    mind.values.status > 0.4
  ) {
    return intentFromReasons(['richesse et ambition', 'grande demeure'], {
      purposes: ['prestige', 'shelter'],
      scale: coins >= 8 ? 0.75 : 0.5,
      wood: 0.65,
      stone: 0.4,
    })
  }

  return null
}

/** Deep cognition: propose a generative BuildProject from life pressures. */
export function maybeProposeConstruction(
  state: SimState,
  v: Villager,
  mind: CognitiveState,
  rng: () => number,
): number | null {
  if ((state.tick + v.id * 7) % 9 !== 0) return null
  // Fortify / status drives pass the soft RNG gate more often.
  const safetyPush = mind.needs.safety >= 0.3 || mind.emotions.fear >= 0.28
  const statusPush = mind.needs.status >= 0.4
  if (rng() > 0.82 && !safetyPush && !statusPush && mind.needs.safety < 0.55 && mind.needs.status < 0.5) {
    return null
  }

  const existing = pickProjectForVillager(state, v)
  if (existing && (existing.ownerId === v.id || existing.villageId === v.villageId)) {
    if (v.activeProjectId === null) v.activeProjectId = existing.id
    mind.buildProjectId = existing.id
    return existing.id
  }

  const intent = evaluateLifeBuildIntent(state, v, mind)
  if (!intent) return null

  const civic =
    intent.purposes.includes('gather') ||
    intent.purposes.includes('fortify') ||
    intent.purposes.includes('mining_access') ||
    intent.purposes.includes('mine')
  const ore = mind.semantic.find(
    (s) =>
      (s.label.includes('fer') || s.label.includes('or') || s.label.includes('montagne') || s.kind === 'resource_scarce' || s.kind === 'mine_spot') &&
      s.confidence > 0.3,
  )
  let nearX = civic ? villageNearX(state, v) : v.hasHome ? v.homeX : v.x
  let nearY = civic ? villageNearY(state, v) : v.hasHome ? v.homeY : v.y
  if ((intent.purposes.includes('mine') || intent.purposes.includes('mining_access')) && ore && (ore.x !== 0 || ore.y !== 0)) {
    nearX = ore.x
    nearY = ore.y
  }
  // Offset fort slightly from plaza so houses don't block the plot.
  if (intent.purposes.includes('fortify')) {
    nearX += 10 + (v.id % 5)
    nearY += 8 + ((v.id * 3) % 5)
  }

  const project = enqueueBuildProject(state, intent, {
    ownerId: civic && (intent.purposes.includes('gather') || intent.purposes.includes('fortify')) ? null : v.id,
    villageId: v.villageId,
    nearX,
    nearY,
    laborHint: 1 + v.personality.ambition,
  })
  if (!project) return null
  v.activeProjectId = project.id
  mind.buildProjectId = project.id
  return project.id
}

function villageNearX(state: SimState, v: Villager): number {
  const village = state.villages.find((g) => g.id === v.villageId)
  return village?.centerX ?? v.x
}

function villageNearY(state: SimState, v: Villager): number {
  const village = state.villages.find((g) => g.id === v.villageId)
  return village?.centerY ?? v.y
}

/** Free-form reasons → project (cognition / events). */
export function proposeStructureFromReasons(
  state: SimState,
  v: Villager,
  reasons: string[],
  opts: {
    purposes?: StructurePurpose[]
    scale?: number
    wood?: number
    stone?: number
    civic?: boolean
  } = {},
): number | null {
  const intent = intentFromReasons(reasons, {
    purposes: opts.purposes,
    scale: opts.scale ?? 0.35 + v.personality.ambition * 0.45,
    wood: opts.wood,
    stone: opts.stone,
  })
  const project = enqueueBuildProject(state, intent, {
    ownerId: opts.civic ? null : v.id,
    villageId: v.villageId,
    nearX: v.hasHome ? v.homeX : v.x,
    nearY: v.hasHome ? v.homeY : v.y,
    laborHint: 1 + v.personality.ambition,
  })
  if (!project) return null
  if (!opts.civic) v.activeProjectId = project.id
  return project.id
}
