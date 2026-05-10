import type { GameState } from './types';

export function checkWin(state: GameState): GameState {
  if (!state.objects.some((object) => object.traits.includes('flower'))) {
    return { ...state, status: 'lose_empty' };
  }

  if (state.metrics.stability <= 0) {
    return { ...state, status: 'lose_collapse' };
  }

  const winConditionMet =
    state.turn >= state.maxTurns &&
    state.turn >= state.winCondition.afterTurns &&
    state.metrics.stability >= state.winCondition.minStability &&
    state.metrics.tension >= state.winCondition.minTension &&
    state.metrics.life >= state.winCondition.minLife;

  return { ...state, status: winConditionMet ? 'win' : state.status };
}
