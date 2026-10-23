import type { GameEvent, GameObject, GameState, Rule, Trait } from './types';

const GRID_COLS = 4;
const GRID_ROWS = 4;

function hasTrait(object: GameObject, trait: Trait): boolean {
  return object.traits.includes(trait);
}

function isAdjacent(a: GameObject, b: GameObject): boolean {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
}

function visibleObjects(state: GameState): GameObject[] {
  return state.objects.filter((object) => !hasTrait(object, 'hidden'));
}

function conditionMatches(rule: Rule, objects: GameObject[]): boolean {
  const condition = rule.condition;

  if ('near' in condition) {
    const [firstTrait, secondTrait] = condition.near;
    return objects.some((a) =>
      hasTrait(a, firstTrait) &&
      objects.some((b) => a.id !== b.id && hasTrait(b, secondTrait) && isAdjacent(a, b))
    );
  }

  if ('hasTraits' in condition) {
    return objects.some((object) =>
      condition.hasTraits.every((trait) => hasTrait(object, trait))
    );
  }

  return objects.some((subject) =>
    hasTrait(subject, condition.adjacent.subject) &&
    objects.some((object) =>
      subject.id !== object.id &&
      hasTrait(object, condition.adjacent.object) &&
      isAdjacent(subject, object)
    )
  );
}

function severityFor(rule: Rule): GameEvent['severity'] {
  if ((rule.effect.energyDelta ?? 0) > 0) return 'good';
  if ((rule.effect.stabilityDelta ?? 0) < 0) return 'bad';
  return 'neutral';
}

function applyEffect(object: GameObject, rule: Rule): void {
  object.energy += rule.effect.energyDelta ?? 0;
  object.stability += rule.effect.stabilityDelta ?? 0;

  if (rule.effect.removeTrait) {
    object.traits = object.traits.filter((trait) => trait !== rule.effect.removeTrait);
  }

  if (rule.effect.addTrait && !object.traits.includes(rule.effect.addTrait)) {
    object.traits = [...object.traits, rule.effect.addTrait];
  }
}

export function evaluateRules(
  state: GameState,
  options?: { dryRun?: boolean }
): GameEvent[] {
  const events: GameEvent[] = [];
  const objects = visibleObjects(state);
  const rules = [...state.rules].sort((a, b) => a.priority - b.priority);

  for (const rule of rules) {
    if (!conditionMatches(rule, objects)) continue;

    const targets = objects.filter((object) => hasTrait(object, rule.effect.targetTrait));
    for (const target of targets) {
      events.push({
        ruleId: rule.id,
        targetId: target.id,
        severity: severityFor(rule),
        text: `${rule.id}: ${target.id} に効果適用`
      });

      if (!options?.dryRun) {
        applyEffect(target, rule);

        if (rule.effect.spread) {
          const { withTraits, dy = 0, dx = 0 } = rule.effect.spread;
          const candidates = (dy !== 0 || dx !== 0)
            ? [{ x: target.x + dx, y: target.y + dy }]
            : [
                { x: target.x - 1, y: target.y },
                { x: target.x + 1, y: target.y },
                { x: target.x, y: target.y - 1 },
                { x: target.x, y: target.y + 1 },
              ];
          for (const pos of candidates) {
            if (pos.x < 0 || pos.x >= GRID_COLS || pos.y < 0 || pos.y >= GRID_ROWS) continue;
            if (state.objects.some((o) => o.x === pos.x && o.y === pos.y)) continue;
            state.objects.push({
              id: `water_${pos.x}_${pos.y}`,
              x: pos.x,
              y: pos.y,
              traits: [...withTraits] as Trait[],
              energy: 5,
              stability: 5,
            });
          }
        }
      }
    }
  }

  return events;
}
