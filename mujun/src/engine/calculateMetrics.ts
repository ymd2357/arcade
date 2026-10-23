import type { GameState, Metrics } from './types';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function calculateMetrics(state: GameState): Metrics {
  const flowers = state.objects.filter((o) => o.traits.includes('flower'));
  const averageStability = flowers.length === 0
    ? 0
    : flowers.reduce((sum, o) => sum + o.stability, 0) / flowers.length;
  const stability = clamp(averageStability, 0, 10);
  const tension = clamp(Math.round((10 - stability) / 2), 0, flowers.length);
  const hasLife = flowers.length > 0;

  return {
    stability,
    tension,
    life: hasLife ? 5 : 0,
    openness: state.availableCards.length
  };
}
