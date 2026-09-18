/**
 * Mines / ore — composition constants for the visual integrator.
 * Staging only: do not import from live renderer yet.
 *
 * Footprints are in sim cells. Props must draw as complete silhouettes
 * that overflow the grid (same spirit as TREE_SPRITE_H canopy overflow).
 */

export type OreKind = "gold" | "iron" | "stone"

export type MinePropKind = "dig_scar" | "mine_mouth" | "ore_pile" | "mine_smoke"

/** Draw layers within the mine visual pass (after terrain, before NPCs). */
export const MINE_Z = {
  digScar: 1,
  smallPlantSkip: 2,
  mouth: 3,
  orePile: 4,
  smoke: 5,
} as const

/** Preferred NatureAtlas keys — prefer bank over new PNGs. */
export const MINE_BANK = {
  scarSoft: "grass_grazed",
  scarHeavy: "grass_grazed_heavy",
  scarDirt: "dirt_dark",
  scarPebbles: "pebbles",
  scarGravel: "gravel",
  scarPath: "path_gravel",
  rockFace: "mountain_face",
  rockShelf: "mountain_plateau",
  boulder: "boulder",
  boulderN: (i: number) => `boulder_${((i % 12) + 12) % 12}`,
  rockChip: "rock",
  oreGold: "ore_gold",
  oreIron: "ore_iron",
  timberPost: "log_oak",
  timberLintel: "plank_oak",
  timberAlt: "fallen_log",
  stumpAccent: "tree_stump",
  cliffDark: "cliff_dark",
} as const

export function oreTintKey(kind: OreKind): string {
  if (kind === "gold") return MINE_BANK.oreGold
  if (kind === "iron") return MINE_BANK.oreIron
  return MINE_BANK.rockShelf
}

/** Dig scar: soft multi-cell ground disturbance (not a dirt stamp). */
export const DIG_SCAR = {
  kind: "dig_scar" as const,
  /** Cells covered relative to anchor (inclusive). */
  footprintW: 3,
  footprintH: 2,
  /** Origin offset so scar sits mostly south/west of mouth. */
  originOx: -1,
  originOy: 0,
  centerAlpha: 0.72,
  fringeAlpha: 0.45,
  chipChance: 0.35,
  chipScale: [0.22, 0.35] as const,
  layers: [
    { key: MINE_BANK.scarSoft, alpha: 0.55 },
    { key: MINE_BANK.scarHeavy, alpha: 0.4, centerOnly: true },
    { key: MINE_BANK.scarPebbles, alpha: 0.35 },
    { key: MINE_BANK.scarGravel, alpha: 0.28 },
  ],
} as const

/** Mine mouth: complete 2x2 prop (void + timber + rock cheeks). */
export const MINE_MOUTH = {
  kind: "mine_mouth" as const,
  footprintW: 2,
  footprintH: 2,
  /** Drawn width/height in tile multiples (overflow intentional). */
  drawW: 1.85,
  drawH: 1.55,
  voidRx: 0.55,
  voidRy: 0.38,
  voidColor: "rgba(12,10,8,0.92)",
  postW: 0.14,
  postH: 0.72,
  lintelH: 0.16,
  cheekSrc: { key: MINE_BANK.rockFace, srcX: 0, srcY: 6, srcW: 16, srcH: 26 },
  cheekScale: 0.55,
  shadowAlpha: 0.2,
  preferFacing: "south" as const,
} as const

/** Ore pile: one soft mound, not a per-cell ore tile fill. */
export const ORE_PILE = {
  kind: "ore_pile" as const,
  footprintW: 2,
  footprintH: 1,
  moundScale: [0.85, 1.35] as const,
  tintScale: 0.55,
  tintAlpha: 0.55,
  shadowAlpha: 0.18,
  southFace: 0.28,
  jitterCell: 0.2,
  /** Place relative to mouth when clustering. */
  defaultOffset: { ox: 1.1, oy: 0.35 },
} as const

/** Optional smoke puff above the void (draw last among mine props). */
export const MINE_SMOKE = {
  kind: "mine_smoke" as const,
  alpha: [0.12, 0.22] as const,
  rise: 0.55,
  width: 0.45,
  height: 0.7,
  color: "rgba(180,175,165,1)",
} as const

export type MineVisualSite = {
  /** Anchor cell = TUNNEL entrance or village.mineX/Y. */
  gx: number
  gy: number
  /** Primary ore identity for nearby piles. */
  ore?: OreKind
  /** How many ore piles to scatter (1–3 typical). */
  pileCount?: number
  /** Fresh dig / active miners → stronger scar + optional smoke. */
  active?: boolean
  /** Hide mouth posts if opening faces a different cardinal (future). */
  facing?: "south" | "north" | "east" | "west"
}

/** Full prop recipe for one site (integrator expands to draw calls). */
export type MinePropInstance = {
  kind: MinePropKind
  gx: number
  gy: number
  ox?: number
  oy?: number
  scale?: number
  ore?: OreKind
  z: number
}

/**
 * Expand a site into sorted prop instances.
 * Deterministic if `hash` is the nature `hash2(gx,gy,seed)`.
 */
export function expandMineSite(
  site: MineVisualSite,
  hash: (x: number, y: number, s: number) => number,
): MinePropInstance[] {
  const out: MinePropInstance[] = []
  const piles = Math.max(1, Math.min(3, site.pileCount ?? (site.ore ? 2 : 1)))

  out.push({
    kind: "dig_scar",
    gx: site.gx + DIG_SCAR.originOx,
    gy: site.gy + DIG_SCAR.originOy,
    z: MINE_Z.digScar,
  })

  out.push({
    kind: "mine_mouth",
    gx: site.gx,
    gy: site.gy,
    scale: 1,
    z: MINE_Z.mouth,
  })

  for (let i = 0; i < piles; i++) {
    const h = hash(site.gx, site.gy, 80 + i)
    const side = h > 0.5 ? 1 : -1
    out.push({
      kind: "ore_pile",
      gx: site.gx,
      gy: site.gy,
      ox: side * (ORE_PILE.defaultOffset.ox + (h - 0.5) * ORE_PILE.jitterCell),
      oy: ORE_PILE.defaultOffset.oy + (hash(site.gx, site.gy, 90 + i) - 0.5) * ORE_PILE.jitterCell,
      scale: ORE_PILE.moundScale[0] + h * (ORE_PILE.moundScale[1] - ORE_PILE.moundScale[0]),
      ore: site.ore ?? "stone",
      z: MINE_Z.orePile,
    })
  }

  if (site.active) {
    out.push({
      kind: "mine_smoke",
      gx: site.gx,
      gy: site.gy,
      oy: -MINE_SMOKE.rise,
      z: MINE_Z.smoke,
    })
  }

  out.sort((a, b) => a.z - b.z || a.gy + (a.oy ?? 0) - (b.gy + (b.oy ?? 0)) || a.gx - b.gx)
  return out
}
