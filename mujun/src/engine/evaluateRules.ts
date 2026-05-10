import type { GameEvent, GameObject, GameState, Rule, Trait } from './types';

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
      }
    }
  }

  return events;
}
