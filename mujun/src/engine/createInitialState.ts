import { calculateMetrics } from './calculateMetrics';
import type { GameState, StageData } from './types';

export function createInitialState(stage: StageData): GameState {
  const state: GameState = {
    turn: 0,
    maxTurns: stage.turnLimit,
    objects: stage.objects.map((object) => ({
      ...object,
      traits: [...object.traits]
    })),
    rules: stage.rules.map((rule) => ({ ...rule })),
    delayedEffects: [],
    usedCards: [],
    availableCards: [...stage.availableCards],
    cardUsesLeft: stage.cardUses,
    metrics: {
      stability: 0,
      tension: 0,
      life: 0,
      openness: stage.availableCards.length
    },
    status: 'playing',
    winCondition: { ...stage.winCondition }
  };

  return {
    ...state,
    metrics: calculateMetrics(state)
  };
}
