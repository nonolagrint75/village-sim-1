import type { HouseShape } from '@/lib/sim/architecture'
import { BIOME_PROFILES, type BiomeId } from '@/lib/sim/biomes'
import type { Ambition, MemoryKind } from '@/lib/sim/social'
import { RESOURCE_LABELS_UI } from '@/lib/sim/resources'
import type { BoatKind, Profession, Season, TaskKind, ToolTier } from '@/lib/sim/types'

export const TASK_LABELS: Record<TaskKind, string> = {
  idle: 'Explore les environs',
  eat: 'Mange',
  gatherFood: 'Cueille baies et plantes',
  gatherWood: 'Coupe du bois',
  clearLand: 'Défriche le terrain',
  gatherStone: 'Extrait de la pierre',
  gatherIron: 'Extrait du fer',
  mineTunnel: 'Creuse un tunnel dans la montagne',
  buyMaterial: 'Achète une matière première',
  mineGold: "Mine de l'or",
  mintCoins: 'Frappe des pièces',
  craftSpear: 'Taille une lance',
  craftStoneSpear: 'Affûte une lance en pierre',
  craftIronTool: 'Forge un outil en fer',
  weaveCloth: 'Tisse du tissu',
  sewClothing: 'Coud des vêtements',
  tanHide: 'Tanne une peau',
  buildHouse: 'Bâtit sa maison',
  buildProject: 'Avance une construction',
  buildWorkbench: 'Installe son établi',
  buildChest: 'Fabrique un coffre',
  buildBed: 'Fabrique un lit',
  buildTable: 'Dresse une table',
  buildHearth: 'Maçonne un âtre',
  buildBench: 'Fabrique un banc',
  buildStool: 'Fabrique un tabouret',
  buildShelf: 'Pose une étagère',
  buildCupboard: 'Monte une armoire',
  buildCradle: 'Fabrique un berceau',
  buildLoom: 'Monte un métier à tisser',
  buildWashingTub: 'Fabrique une cuve à lessive',
  buildPen: 'Monte un enclos',
  buildWall: "Élève l'enceinte",
  buildBridge: 'Construit un pont',
  buildMill: 'Bâtit le moulin',
  buildCart: 'Construit une charrette',
  buildBoat: 'Met un bateau à l’eau',
  buildPort: 'Bâtit le port',
  sowField: 'Sème son champ',
  harvestWheat: 'Moissonne les cultures',
  grindFlour: 'Moud la farine',
  bakeBread: 'Cuit du pain',
  captureSheep: 'Attrape un mouton',
  feedPen: 'Nourrit le bétail',
  storeChest: 'Range ses réserves',
  takeFromChest: 'Puise dans son coffre',
  flee: 'Fuit un loup',
  fight: 'Affronte un loup',
  rest: 'Se repose chez lui',
  socialise: 'Discute avec quelqu’un',
  steal: 'Se sert chez un autre',
  giveFood: 'Partage sa nourriture',
  confront: 'Règle ses comptes',
  defend: 'Vole au secours de quelqu’un',
  fish: 'Pêche',
  tameHorse: 'Approche un cheval sauvage',
  mount: 'Se met en selle',
  feedHorse: 'Nourrit son cheval',
  tradeRun: 'Part commercer dans un autre village',
  experiment: 'Expérimente près de l’établi',
  entertain: 'Conte, chante ou divertit',
  counsel: 'Offre un conseil spirituel',
  ritual: 'Honore le lieu sacré',
  teachCraft: 'Enseigne un savoir-faire',
  makeCharcoal: 'Fait du charbon de bois',
  craftGear: 'Fabrique une pièce d’équipement',
  craftGoods: 'Travaille une matière',
  useMedicine: 'Applique un remède',
  lightTorch: 'Allume une torche',
  placeCandle: 'Pose une chandelle',
  tendHearth: 'Attise le foyer',
  gatherFuel: 'Ramasse du combustible',
  craftLight: 'Fabrique une source de lumière',
}

export const PROFESSION_LABELS: Record<Profession, string> = {
  none: 'sans métier',
  forager: 'cueilleur',
  farmer: 'fermier',
  fisher: 'pêcheur',
  miller: 'meunier',
  lumberjack: 'bûcheron',
  mason: 'tailleur de pierre',
  guard: 'garde',
  builder: 'bâtisseur',
  herder: 'éleveur',
  trader: 'marchand',
  weaver: 'tisserand',
  blacksmith: 'forgeron',
  miner: 'mineur',
}

export const AMBITION_LABELS: Record<Ambition, string> = {
  survive: 'survivre',
  wealth: 'amasser une fortune',
  family: 'fonder une famille',
  protector: 'protéger les siens',
  builder: 'bâtir quelque chose',
  explorer: 'voir le monde',
  revenge: 'se venger',
  leader: 'mener le village',
}

export const SHAPE_LABELS: Record<HouseShape, string> = {
  square: 'carrée',
  rect: 'rectangulaire',
  round: 'ronde',
  ell: 'en L',
  courtyard: 'à cour',
  longhouse: 'longue',
}

export { ROOM_LABEL_FR, ROOM_LABELS_FR } from '@/lib/sim/rooms'
export type { RoomKind } from '@/lib/sim/rooms'

export const MEMORY_LABELS: Record<MemoryKind, string> = {
  helped: 'm’a aidé',
  harmed: 'm’a frappé',
  robbed: 'm’a volé',
  sawTheft: 'je l’ai vu voler',
  sawKill: 'je l’ai vu tuer',
  grief: 'je l’ai perdu',
  saved: 'm’a sauvé la vie',
  goodSpot: 'endroit nourricier',
  dangerSpot: 'endroit dangereux',
  insulted: 'm’a insulté',
  kinSlain: 'a tué mon parent',
  wolfGrief: 'deuil d’un loup',
}

export const TOOL_LABELS: Record<ToolTier, string> = {
  none: 'aucun',
  wood: 'bois',
  stone: 'pierre',
  iron: 'fer',
}

export const BOAT_LABELS: Record<BoatKind, string> = {
  fishing: 'barque de pêche',
  cargo: 'chaland',
}

export const RESOURCE_LABELS_FR: Record<string, string> = { ...RESOURCE_LABELS_UI }

export const SEASON_LABELS: Record<Season, string> = {
  spring: 'Printemps',
  summer: 'Été',
  autumn: 'Automne',
  winter: 'Hiver',
}

export const SEASON_COLORS: Record<Season, string> = {
  spring: '#8ecf6a',
  summer: '#e8c14a',
  autumn: '#d4843c',
  winter: '#9ec5dc',
}

/** French biome names for UI (climate lattice / portrait). */
export const BIOME_LABELS: Record<BiomeId, string> = Object.fromEntries(
  BIOME_PROFILES.map((p) => [p.id, p.labelFr]),
) as Record<BiomeId, string>
