import { applyThoughtCard } from './applyThoughtCard';
import { calculateMetrics } from './calculateMetrics';
import { checkWin } from './checkWin';
import { evaluateRules } from './evaluateRules';
import type { GameState, SimulationResult, ThoughtCard } from './types';

function cloneState(state: GameState): GameState {
  return {
    ...state,
    objects: state.objects.map((object) => ({
      ...object,
      traits: [...object.traits]
    })),
    rules: state.rules.map((rule) => ({ ...rule })),
    delayedEffects: state.delayedEffects.map((delayed) => ({ ...delayed })),
    usedCards: [...state.usedCards]
  };
}

function removeTemporaryHidden(state: GameState, original: GameState, card: ThoughtCard | null): GameState {
  if (card?.type !== 'exception') return state;

  return {
    ...state,
    objects: state.objects.map((object) => {
      if (object.id !== card.target) return object;
      const originallyHidden = original.objects
        .find((before) => before.id === object.id)
        ?.traits.includes('hidden');

      if (originallyHidden) return object;

      return {
        ...object,
        traits: object.traits.filter((trait) => trait !== 'hidden')
      };
    })
  };
}

export function simulateTurn(
  state: GameState,
  card: ThoughtCard | null
): SimulationResult {
  const predictionsBeforeAction = evaluateRules(cloneState(state), { dryRun: true });
  const originalRules = state.rules.map((rule) => ({ ...rule }));
  const originalState = cloneState(state);
  const workingState = card ? applyThoughtCard(cloneState(state), card) : cloneState(state);
  const events = evaluateRules(workingState);
  const restoredState = {
    ...workingState,
    rules: originalRules,
    turn: workingState.turn + 1
  };
  const clearedState = removeTemporaryHidden(restoredState, originalState, card);
  const metricState = {
    ...clearedState,
    metrics: calculateMetrics(clearedState)
  };
  const nextState = checkWin(metricState);

  return {
    nextState,
    events,
    predictionsBeforeAction
  };
}
