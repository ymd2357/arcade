import type { GameEvent } from '../engine/types';

export function describeEvent(event: GameEvent): string {
  return event.text;
}
