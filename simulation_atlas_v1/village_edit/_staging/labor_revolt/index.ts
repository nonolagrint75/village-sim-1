/**
 * Staging pack: labor_revolt (Rami / Tomas)
 * Isolated — integrator wires into politics / circles / war / economy.
 */

export type {
  ActorId,
  VillageId,
  PolityId,
  CircleId,
  MovementId,
  LaborLifeTag,
  LaborPhase,
  LaborEventKind,
  LaborEvent,
  WorkConditionsHint,
  WorkerProfile,
  LaborMovement,
  RepressionHint,
  FoodCrisisHint,
  LaborTickContext,
  LaborForkChoice,
} from './types'

export {
  scoreBadConditions,
  shouldFormWorkerGroup,
  pickOrganizers,
  applyWageCut,
  noteConditionsWorsened,
} from './conditions'

export {
  createMovementId,
  createLaborMovement,
  tryBeginStrike,
  tryFormLaborInstitution,
  applyRepression,
  resolveLaborFork,
  applyFoodCrisis,
  tryMassProtest,
  tryRegimeCollapse,
  formSuccessorPolity,
  applyEliteBacklash,
  tickLaborMovement,
} from './movement'