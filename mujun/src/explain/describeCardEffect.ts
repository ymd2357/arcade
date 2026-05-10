import type { ThoughtCard } from '../engine/types';

export function describeCardEffect(type: ThoughtCard['type']): string {
  if (type === 'delay') {
    return '1ターン待たせる：選んだルールの発生を1ターン遅らせます';
  }

  if (type === 'exception') {
    return '今だけ無視する：選んだ対象だけ、このルールを受けません';
  }

  if (type === 'sacrifice') {
    return '性質を消す：対象の性質を1つ消します';
  }

  return '';
}
