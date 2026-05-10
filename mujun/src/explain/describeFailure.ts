import type { GameState } from '../engine/types';

export function describeFailure(state: GameState): string {
  if (!state.objects.some((object) => object.traits.includes('flower'))) {
    return '花が消えました。花を濡れたままにすると消えます。';
  }

  if (state.metrics.stability <= 0) {
    return '庭が壊れました。悪い効果が同じターンに重なりすぎました。';
  }

  return '勝利条件を満たしていません。';
}
