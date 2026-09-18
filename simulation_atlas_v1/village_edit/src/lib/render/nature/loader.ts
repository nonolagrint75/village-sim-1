import { NatureAtlas } from "./atlas"
import {
  cloneTile,
  fillNoise,
  fromImage,
  frost,
  makeTile,
  mixTiles,
  multiplyRgb,
  NATURE_TILE_PX,
  proceduralBerryBush,
  proceduralBoulder,
  proceduralDirt,
  proceduralFarmland,
  proceduralFarmlandEdge,
  proceduralFarmlandMoist,
  proceduralFarmlandSoft,
  proceduralFlower,
  proceduralGrass,
  proceduralGrassVariant,
  proceduralGrassTuft,
  proceduralGrazedGrass,
  proceduralLog,
  proceduralMountainCliff,
  proceduralMountainFace,
  proceduralMountainLit,
  proceduralMountainPeak,
  proceduralMountainPlateau,
  proceduralMountainShade,
  proceduralMountainSnow,
  proceduralMushroom,
  proceduralOre,
  proceduralRock,
  proceduralSand,
  proceduralSnow,
  proceduralStump,
  proceduralTree,
  proceduralWater,
  proceduralWheat,
  ROCK_VARIANT_COUNT,
  speckle,
  TREE_DEAD_VARIANTS,
  TREE_OAK_VARIANTS,
  TREE_PINE_VARIANTS,
  type TilePx,
} from "./textureLab"

function putRockAndTreeVariants(a: NatureAtlas, leaves: TilePx, pine: TilePx, bark: TilePx, rock: TilePx) {
  for (let i = 0; i < ROCK_VARIANT_COUNT; i++) a.put(`boulder_${i}`, proceduralBoulder(rock, i))
  a.put("boulder", proceduralBoulder(rock, 0))
  a.put("boulder_b", proceduralBoulder(rock, 1))
  a.put("boulder_c", proceduralBoulder(rock, 2))
  for (let i = 0; i < TREE_OAK_VARIANTS; i++) a.put(`tree_oak_${i}`, proceduralTree(leaves, bark, "oak", i))
  const autumnLeaves = multiplyRgb(leaves, 1.38, 0.78, 0.32)
  for (let i = 0; i < TREE_OAK_VARIANTS; i++) a.put(`tree_oak_autumn_${i}`, proceduralTree(autumnLeaves, bark, "oak", i))
  a.put("tree_oak_autumn", proceduralTree(autumnLeaves, bark, "oak", 0))
  for (let i = 0; i < TREE_PINE_VARIANTS; i++) a.put(`tree_pine_${i}`, proceduralTree(pine, bark, "pine", i))
  const deadLeaves = multiplyRgb(leaves, 0.88, 0.72, 0.48)
  for (let i = 0; i < TREE_DEAD_VARIANTS; i++) a.put(`tree_dead_${i}`, proceduralTree(deadLeaves, bark, "dead", i))
  a.put("tree_oak", proceduralTree(leaves, bark, "oak", 0))
  a.put("tree_oak_b", proceduralTree(multiplyRgb(leaves, 1.08, 1.05, 0.95), bark, "oak", 1))
  a.put("tree_pine", proceduralTree(pine, bark, "pine", 0))
  a.put("tree_dead", proceduralTree(deadLeaves, bark, "dead", 0))
}

const namedTiles = import.meta.glob("../../../assets/nature/tiles/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>

const blockTiles = import.meta.glob(
  "../../../assets/nature/source/block-texture-set/blocks/*.png",
  {
    eager: true,
    import: "default",
  },
) as Record<string, string>

/** Skip junk / biome clutter — keep planks, bricks, logs, gravel for builds + paths. */
const SKIP = /TILEMAP|coral_|sand_ugly|obsidian|hell_|spiderweb|glass|amethyst|basalt_flow|ice_icicles|carved/i

let atlas: NatureAtlas | null = null
let ready = false
let loadPromise: Promise<NatureAtlas> | null = null
const readyCbs: Array<() => void> = []

export function isNatureReady() {
  return ready && !!atlas
}

export function getNatureAtlas() {
  return atlas
}

export function onNatureAtlasReady(cb: () => void) {
  if (ready) cb()
  else readyCbs.push(cb)
}

function basename(path: string) {
  const n = path.split("/").pop() || path
  return n.replace(/\.png$/i, "").toLowerCase()
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.decoding = "async"
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("nature image failed: " + url))
    img.src = url
  })
}

function imageToTile(img: HTMLImageElement): TilePx {
  return fromImage(img, 0, 0, NATURE_TILE_PX)
}

const BUILT_SKIP = SKIP

export async function loadNatureAtlas(): Promise<NatureAtlas> {
  if (atlas && ready) return atlas
  if (loadPromise) return loadPromise
  loadPromise = buildAtlas()
  try {
    atlas = await loadPromise
    ready = true
    for (const cb of readyCbs.splice(0)) cb()
    return atlas
  } catch (err) {
    loadPromise = null
    atlas = buildProceduralAtlas()
    ready = true
    for (const cb of readyCbs.splice(0)) cb()
    return atlas
  }
}

function buildProceduralAtlas() {
  const a = new NatureAtlas()
  seedProcedural(a)
  return a
}

function seedProcedural(a: NatureAtlas) {
  const grass = proceduralGrass()
  const grassB = proceduralGrassVariant(1)
  const grassC = proceduralGrassVariant(2)
  const grassD = proceduralGrassVariant(3)
  const dirt = proceduralDirt()
  const sand = proceduralSand()
  const water = proceduralWater()
  const rock = proceduralRock()
  const snow = proceduralSnow()
  a.put("grass", grass)
  a.put("grass_b", grassB)
  a.put("grass_c", grassC)
  a.put("grass_d", grassD)
  a.put("grass_e", proceduralGrassVariant(4))
  a.put("grass_f", proceduralGrassVariant(5))
  a.put("grass_g", proceduralGrassVariant(6))
  a.put("grass_h", proceduralGrassVariant(7))
  a.put("grass_dark", multiplyRgb(grass, 0.78, 0.85, 0.72))
  a.put("grass_light", multiplyRgb(grassB, 1.04, 1.03, 0.97))
  a.put("grass_forest", multiplyRgb(grassC, 0.88, 0.94, 0.82))
  a.put("forest_floor", multiplyRgb(grassD, 0.85, 0.9, 0.78))
  a.put("grass_dry", multiplyRgb(grass, 1.28, 1.08, 0.55))
  a.put("grass_wet", multiplyRgb(grass, 0.72, 0.96, 0.74))
  a.put("grass_frost", frost(grass, 0.42))
  a.put("grass_summer", multiplyRgb(grassB, 1.04, 1.03, 0.92))
  a.put("grass_autumn", multiplyRgb(grassC, 1.2, 0.9, 0.48))
  a.put("dirt", dirt)
  a.put("dirt_dark", multiplyRgb(dirt, 0.78, 0.75, 0.7))
  a.put("grass_grazed", proceduralGrazedGrass(grass, dirt, 0.28))
  a.put("grass_grazed_heavy", proceduralGrazedGrass(grass, dirt, 0.42))
  a.put("sand", sand)
  a.put("sand_dark", multiplyRgb(sand, 0.88, 0.84, 0.72))
  a.put("water", water)
  a.put("water_deep", multiplyRgb(water, 0.7, 0.78, 0.95))
  a.put("water_shallow", multiplyRgb(water, 1.15, 1.18, 1.05))
  a.put("rock", rock)
  a.put("pebbles", speckle(rock, [150, 146, 138], 0.14, 51))
  a.put("mountain_rock", proceduralMountainPlateau(0))
  a.put("mountain_plateau", proceduralMountainPlateau(0))
  a.put("mountain_plateau_2", proceduralMountainPlateau(1))
  a.put("mountain_plateau_3", proceduralMountainPlateau(2))
  a.put("mountain_cliff", proceduralMountainCliff())
  a.put("mountain_lit", proceduralMountainLit())
  a.put("mountain_shade", proceduralMountainShade())
  a.put("mountain_snow", proceduralMountainSnow())
  a.put("mountain_peak", proceduralMountainPeak(false))
  a.put("mountain_peak_snow", proceduralMountainPeak(true))
  a.put("mountain_face", proceduralMountainFace(false))
  a.put("mountain_face_snow", proceduralMountainFace(true))
  a.put("cliff", proceduralMountainCliff())
  a.put("cliff_dark", proceduralMountainShade())
  a.put("snow", snow)
  const leaves = fillNoise(makeTile(), [52, 110, 46], 18, 61)
  const pine = fillNoise(makeTile(), [36, 88, 48], 16, 67)
  const bark = fillNoise(makeTile(), [92, 62, 34], 12, 71)
  a.put("leaves_oak", leaves)
  a.put("leaves_pine", pine)
  a.put("fallen_log", proceduralLog(bark))
  a.put("tree_stump", proceduralStump(bark))
  putRockAndTreeVariants(a, leaves, pine, bark, rock)
  a.put("bush", proceduralBerryBush(leaves, "red"))
  a.put("berry_bush", proceduralBerryBush(leaves, "red"))
  a.put("berry_bush_blue", proceduralBerryBush(leaves, "blue"))
  a.put("farmland", proceduralFarmland())
  a.put("farmland_soft", proceduralFarmlandSoft(proceduralFarmland(), grass))
  a.put("farmland_edge", proceduralFarmlandEdge(proceduralFarmland(), grass))
  a.put("wheat_1", proceduralWheat(1))
  a.put("wheat_2", proceduralWheat(2))
  a.put("wheat_3", proceduralWheat(3))
  a.put("wheat_4", proceduralWheat(4))
  a.put("wheat_5", proceduralWheat(5))
  a.put("flower", proceduralFlower())
  a.put("mushroom", proceduralMushroom())
  a.put("grass_tuft", proceduralGrassTuft(leaves))
  a.put("ore_gold", proceduralOre(proceduralMountainPlateau(0), [236, 196, 52], 91))
  a.put("ore_iron", proceduralOre(proceduralMountainPlateau(0), [214, 164, 124], 93))
}

async function buildAtlas(): Promise<NatureAtlas> {
  const a = new NatureAtlas()
  seedProcedural(a)

  const images = new Map<string, HTMLImageElement>()
  const jobs: Array<Promise<void>> = []

  const take = (record: Record<string, string>, prefix: string) => {
    for (const [path, url] of Object.entries(record)) {
      const name = basename(path)
      if (BUILT_SKIP.test(name) || BUILT_SKIP.test(path)) continue
      jobs.push(
        loadImage(url)
          .then((img) => { images.set(prefix + name, img) })
          .catch(() => {}),
      )
    }
  }

  take(namedTiles, "tile:")
  take(blockTiles, "block:")
  await Promise.all(jobs)

  const asTile = (key: string): TilePx | null => {
    const img = images.get(key)
    return img ? imageToTile(img) : null
  }

  const prefer = (keys: string[]): TilePx | null => {
    for (const k of keys) {
      const t = asTile(k)
      if (t) return t
    }
    return null
  }

  const putIf = (slot: string, tile: TilePx | null) => {
    if (tile) a.put(slot, tile)
  }

  const grass = prefer(["tile:grass", "block:grass_top"])
  const dirt = prefer(["tile:dirt", "block:dirt"])
  const sand = prefer(["tile:sand"])
  const rock = prefer(["tile:rock", "block:stone_generic"])
  const snow = prefer(["tile:snow", "block:snow"])
  const pebbles = prefer(["tile:pebbles"])
  const dirtDark = prefer(["tile:dirt_dark", "block:mud"])
  const leavesOak = prefer(["tile:leaves_oak", "block:oak_leaves"])
  const leavesPine = prefer(["tile:leaves_pine", "block:pine_leaves"])
  const bark = prefer(["tile:fallen_log", "block:oak_log_side"])
  const farmland = prefer(["tile:farmland", "block:farmland"])
  const hay = prefer(["tile:hay", "block:hay_top"])
  const granite = prefer(["tile:granite", "block:granite"])
  const gravel = prefer(["tile:gravel", "block:gravel"])
  const cobble = prefer(["tile:cobble", "block:cobblestone"])
  const stoneBlock = prefer(["tile:stone_block", "tile:stone", "block:stone_generic"])
  const wheat1 = prefer(["tile:wheat_1"])
  const wheat2 = prefer(["tile:wheat_2"])
  const wheat3 = prefer(["tile:wheat_3"])
  const wheat4 = prefer(["tile:wheat_4"])
  const wheat5 = prefer(["tile:wheat_5"])

  putIf("dirt", dirt)
  putIf("sand", sand)
  putIf("rock", rock)
  putIf("snow", snow)
  putIf("pebbles", pebbles)
  putIf("dirt_dark", dirtDark)
  putIf("leaves_oak", leavesOak)
  putIf("leaves_pine", leavesPine)
  putIf("farmland", farmland)
  putIf("hay", hay)
  putIf("granite", granite)
  putIf("gravel", gravel)
  putIf("cobble", cobble)
  putIf("stone_block", stoneBlock)
  putIf("wheat_1", wheat1)
  putIf("wheat_2", wheat2)
  putIf("wheat_3", wheat3)
  putIf("wheat_4", wheat4)
  putIf("wheat_5", wheat5)

  // Building materials from CC0 block pack (still 1 sim cell = 1 block).
  putIf("plank_oak", prefer(["block:oak_planks"]))
  putIf("plank_pine", prefer(["block:pine_planks"]))
  putIf("plank_beech", prefer(["block:beech_planks"]))
  putIf("plank_maple", prefer(["block:maple_planks"]))
  putIf("log_oak", prefer(["block:oak_log_side"]))
  putIf("log_pine", prefer(["block:pine_log_side"]))
  putIf("log_beech", prefer(["block:beech_log_side"]))
  putIf("log_oak_top", prefer(["block:oak_log_top"]))
  putIf("brick_cobble", prefer(["block:cobblestone_bricks", "block:cobblestone"]))
  putIf("brick_cobble_moss", prefer(["block:cobblestone_bricks_mossy", "block:cobblestone_mossy"]))
  putIf("brick_limestone", prefer(["block:limestone_bricks", "block:limestone"]))
  putIf("brick_mud", prefer(["block:mud_bricks", "block:mud"]))
  putIf("brick_sandstone", prefer(["block:sandstone_bricks", "block:sandstone"]))
  putIf("mud", prefer(["block:mud", "tile:dirt_dark"]))
  putIf("cobblestone", prefer(["block:cobblestone", "tile:cobble"]))
  putIf("gravel_pack", prefer(["block:gravel", "tile:gravel"]))

  // Soft path ribbons: pack dirt/gravel keyed for worn ways.
  const dirtTile = fromAtlasTile(a, "dirt") || dirt || proceduralDirt()
  const gravelTile = fromAtlasTile(a, "gravel") || gravel || speckle(cloneTile(dirtTile), [150, 146, 138], 0.14, 51)
  const cobbleTile = fromAtlasTile(a, "cobble") || cobble || fromAtlasTile(a, "cobblestone") || proceduralRock()
  a.put("path_trail", multiplyRgb(dirtTile, 0.92, 0.88, 0.78))
  a.put("path_dirt", dirtTile)
  a.put("path_gravel", gravelTile)
  a.put("path_cobble", cobbleTile)

  const r = rock || proceduralRock()
  const wProc = proceduralWater()
  const oakL = leavesOak || fillNoise(makeTile(), [52, 110, 46], 18, 61)
  const pineL = leavesPine || fillNoise(makeTile(), [36, 88, 48], 16, 67)
  const bk = bark || fillNoise(makeTile(), [92, 62, 34], 12, 71)

  // Mute pack grass toward procedural meadow — pack greens are often too neon.
  const gRaw = fromAtlasTile(a, "grass") || grass || proceduralGrass()
  const gMuted = proceduralGrass()
  const g = mixTiles(gRaw, gMuted, 0.82)
  const gB = mixTiles(g, proceduralGrassVariant(1), 0.45)
  const gC = mixTiles(g, proceduralGrassVariant(2), 0.45)
  const gD = mixTiles(g, proceduralGrassVariant(3), 0.45)
  a.put("grass", g)
  a.put("grass_b", gB)
  a.put("grass_c", gC)
  a.put("grass_d", gD)
  a.put("grass_dark", multiplyRgb(g, 0.78, 0.85, 0.72))
  a.put("grass_light", multiplyRgb(gB, 1.04, 1.03, 0.97))
  a.put("grass_forest", multiplyRgb(gC, 0.88, 0.94, 0.82))
  a.put("forest_floor", multiplyRgb(gD, 0.85, 0.9, 0.78))
  a.put("grass_dry", multiplyRgb(g, 1.28, 1.08, 0.55))
  a.put("grass_wet", multiplyRgb(g, 0.72, 0.96, 0.74))
  a.put("grass_frost", frost(g, 0.4))
  a.put("grass_summer", multiplyRgb(gB, 1.03, 1.02, 0.92))
  a.put("grass_autumn", multiplyRgb(gC, 1.18, 0.9, 0.48))
  a.put("sand_dark", multiplyRgb(sand || proceduralSand(), 0.88, 0.84, 0.72))
  a.put("grass_grazed", proceduralGrazedGrass(g, dirtTile, 0.28))
  a.put("grass_grazed_heavy", proceduralGrazedGrass(g, dirtTile, 0.42))
  // Prefer dark procedural field; pack farmland often too light vs muted grass.
  const farmPack = fromAtlasTile(a, "farmland") || farmland
  const farmBase = farmPack
    ? mixTiles(multiplyRgb(farmPack, 0.58, 0.54, 0.48), proceduralFarmland(), 0.65)
    : proceduralFarmland()
  a.put("farmland", farmBase)
  a.put("farmland_soft", farmBase)
  a.put("farmland_edge", proceduralFarmlandEdge(farmBase, g))
  putRockAndTreeVariants(a, oakL, pineL, bk, r)
  a.put("berry_bush", proceduralBerryBush(oakL, "red"))
  a.put("berry_bush_blue", proceduralBerryBush(oakL, "blue"))
  a.put("bush", proceduralBerryBush(oakL, "red"))
  a.put("fallen_log", proceduralLog(bk))
  a.put("tree_stump", proceduralStump(bk))
  a.put("flower", proceduralFlower())
  a.put("mushroom", proceduralMushroom())
  // Never use pack grass_tuft (black square BG) — transparent procedural blades only.
  a.put("grass_tuft", proceduralGrassTuft(oakL))
  a.put("mountain_plateau", proceduralMountainPlateau(0))
  a.put("mountain_plateau_2", proceduralMountainPlateau(1))
  a.put("mountain_plateau_3", proceduralMountainPlateau(2))
  a.put("mountain_cliff", proceduralMountainCliff())
  a.put("mountain_lit", proceduralMountainLit())
  a.put("mountain_shade", proceduralMountainShade())
  a.put("mountain_snow", proceduralMountainSnow())
  a.put("mountain_peak", proceduralMountainPeak(false))
  a.put("mountain_peak_snow", proceduralMountainPeak(true))
  a.put("mountain_face", proceduralMountainFace(false))
  a.put("mountain_face_snow", proceduralMountainFace(true))
  a.put("mountain_rock", fromAtlasTile(a, "mountain_plateau") || proceduralMountainPlateau())
  a.put("cliff", fromAtlasTile(a, "mountain_cliff") || proceduralMountainCliff())
  a.put("cliff_dark", fromAtlasTile(a, "mountain_shade") || proceduralMountainShade())
  const oreStone = fromAtlasTile(a, "mountain_plateau") || proceduralMountainPlateau(0)
  a.put("ore_gold", proceduralOre(oreStone, [236, 196, 52], 91))
  a.put("ore_iron", proceduralOre(oreStone, [214, 164, 124], 93))
  if (!a.has("farmland")) a.put("farmland", proceduralFarmland())
  if (!a.has("wheat_1")) a.put("wheat_1", proceduralWheat(1))
  if (!a.has("wheat_2")) a.put("wheat_2", proceduralWheat(2))
  if (!a.has("wheat_3")) a.put("wheat_3", proceduralWheat(3))
  if (!a.has("wheat_4")) a.put("wheat_4", proceduralWheat(4))
  if (!a.has("wheat_5")) a.put("wheat_5", proceduralWheat(5))
  if (!a.has("granite")) a.put("granite", r)
  if (!a.has("stone_block")) a.put("stone_block", r)
  if (!a.has("gravel")) a.put("gravel", speckle(cloneTile(r), [150, 146, 138], 0.14, 51))
  if (!a.has("cobble")) a.put("cobble", r)
  if (!a.has("cobblestone")) a.put("cobblestone", fromAtlasTile(a, "cobble") || r)
  if (!a.has("plank_oak")) a.put("plank_oak", fillNoise(makeTile(), [168, 118, 62], 12, 81))
  if (!a.has("plank_pine")) a.put("plank_pine", fillNoise(makeTile(), [148, 108, 58], 12, 83))
  if (!a.has("plank_beech")) a.put("plank_beech", fillNoise(makeTile(), [178, 128, 72], 12, 85))
  if (!a.has("plank_maple")) a.put("plank_maple", fillNoise(makeTile(), [158, 98, 52], 12, 87))
  if (!a.has("log_oak")) a.put("log_oak", bk)
  if (!a.has("log_pine")) a.put("log_pine", multiplyRgb(bk, 0.88, 0.9, 0.85))
  if (!a.has("log_beech")) a.put("log_beech", multiplyRgb(bk, 1.05, 0.95, 0.9))
  if (!a.has("log_oak_top")) a.put("log_oak_top", fillNoise(makeTile(), [120, 86, 48], 10, 89))
  if (!a.has("brick_cobble")) a.put("brick_cobble", fromAtlasTile(a, "cobble") || r)
  if (!a.has("brick_cobble_moss")) a.put("brick_cobble_moss", multiplyRgb(fromAtlasTile(a, "brick_cobble") || r, 0.85, 1.05, 0.8))
  if (!a.has("brick_limestone")) a.put("brick_limestone", fillNoise(makeTile(), [168, 162, 148], 10, 91))
  if (!a.has("brick_mud")) a.put("brick_mud", fillNoise(makeTile(), [128, 92, 58], 10, 93))
  if (!a.has("path_trail")) a.put("path_trail", multiplyRgb(fromAtlasTile(a, "dirt") || proceduralDirt(), 0.92, 0.88, 0.78))
  if (!a.has("path_dirt")) a.put("path_dirt", fromAtlasTile(a, "dirt") || proceduralDirt())
  if (!a.has("path_gravel")) a.put("path_gravel", fromAtlasTile(a, "gravel") || proceduralRock())
  if (!a.has("path_cobble")) a.put("path_cobble", fromAtlasTile(a, "cobble") || r)

  // Puny World: dirt ribbons already painted into grass (top row of overworld sheet).
  await cropPunyPaths(a)

  if (!a.has("water")) a.put("water", wProc)
  if (!a.has("water_deep")) a.put("water_deep", multiplyRgb(fromAtlasTile(a, "water") || wProc, 0.72, 0.82, 0.98))
  if (!a.has("water_shallow")) a.put("water_shallow", multiplyRgb(fromAtlasTile(a, "water") || wProc, 1.18, 1.14, 1.06))

  return a
}

/** Shade Puny World 16px — path tiles are grass + centered dirt (not full dirt blocks). */
async function cropPunyPaths(a: NatureAtlas) {
  const url = new URL("../../../assets/nature/source/punyworld-overworld-tileset.png", import.meta.url).href
  try {
    const img = await loadImage(url)
    // Row 0: solid grass, mottled, then path-in-grass autotile strip (cols 3..6, 8, 10..14).
    const put = (key: string, col: number, row = 0) => {
      a.put(key, fromImage(img, col * NATURE_TILE_PX, row * NATURE_TILE_PX, NATURE_TILE_PX))
    }
    put("puny_path_corner_nw", 3)
    put("puny_path_edge_n", 4)
    put("puny_path_fill", 5)
    put("puny_path_corner_ne", 6)
    put("puny_path_edge_w", 10)
    put("puny_path_cross", 11)
    put("puny_path_edge_e", 12)
    put("puny_path_solid", 13)
    put("puny_path_end", 8)
    // Alias used by roadView / mapping.
    if (!a.has("path_puny")) a.put("path_puny", fromImage(img, 5 * NATURE_TILE_PX, 0, NATURE_TILE_PX))
    if (!a.has("path_puny_thin")) a.put("path_puny_thin", fromImage(img, 4 * NATURE_TILE_PX, 0, NATURE_TILE_PX))
    if (!a.has("path_puny_wide")) a.put("path_puny_wide", fromImage(img, 13 * NATURE_TILE_PX, 0, NATURE_TILE_PX))
  } catch {
    /* pack optional at build time */
  }
}

function fromAtlasTile(a: NatureAtlas, key: string): TilePx | null {
  const s = a.slots.get(key)
  if (!s) return null
  return a.ctx.getImageData(s.sx, s.sy, s.w, s.h)
}