import type { GameState, Metrics } from './types';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function calculateMetrics(state: GameState): Metrics {
  const averageStability = state.objects.length === 0
    ? 0
    : state.objects.reduce((sum, object) => sum + object.stability, 0) / state.objects.length;
  const stability = clamp(averageStability, 0, 10);
  const tension = clamp(Math.round((10 - stability) / 2), 0, state.objects.length);
  const hasLife = state.objects.some((object) =>
    object.traits.includes('flower') || object.traits.includes('alive')
  );

  return {
    stability,
    tension,
    life: hasLife ? 5 : 0,
    openness: state.availableCards.length
  };
}
