import { evaluateRules } from '../engine/evaluateRules';
import type { GameState, PredictedEvent } from '../engine/types';

export function predictNextEvents(state: GameState): PredictedEvent[] {
  return evaluateRules(state, { dryRun: true });
}
