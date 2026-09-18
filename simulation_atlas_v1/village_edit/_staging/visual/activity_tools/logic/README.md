# Activity tools — logic (§20)

Staging work arcs: every working agent exposes **tool + target + progress** so activity is map-readable without the panel.

## Live name map

| Staging | Live |
|---------|------|
| `WorkArc.work` / `workNeeded` | `Task.work` + `laborWorkNeeded(kind)` in `behaviors.ts` |
| `toolTier` / `mainHand` | `Villager.toolTier`, `equipment.mainHand` |
| `taskKind` | `Task.kind` (`types.ts` TaskKind) |
| `targetX/Y` | `Task.targetX/Y` |
| far-zoom pip / arc | `entityArt.ts` `drawTaskActivity` (static arc today) |

## Public API

- `createActivityToolsBag()`
- `familyFromTaskKind` / `isWorkingTask`
- `syncWorkArcs(bag, tick, samples)` — upsert + cancel
- `exportActivityActors` — canvas / entityArt input

## Sample builder (integrator)

Per working villager each tick:

```
{
  actorId, villageId, taskKind: v.task.kind,
  toolTier: v.toolTier, mainHand: v.equipment?.mainHand ?? null,
  x: v.x, y: v.y,
  targetX: v.task.targetX, targetY: v.task.targetY, targetId: v.task.targetId,
  work: v.task.work, workNeeded: laborWorkNeeded(v.task.kind)
}
```

## Families → scorecard §20

farm / smith / chop / mine / craft (+ build / haul helpers)

## Events

`arc_started | arc_progress | tool_swung | target_hit | arc_complete | arc_cancelled`
