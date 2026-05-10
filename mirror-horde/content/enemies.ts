import type { EnemyType } from "../core/types";

export const ENEMY_APPEARANCE: Record<
  EnemyType,
  { fill: string; stroke: string; strokeWidth: number }
> = {
  normal: { fill: "#4f4", stroke: "#0a0", strokeWidth: 1.5 },
  fast: { fill: "#8f8", stroke: "#0a0", strokeWidth: 1.5 },
  tank: { fill: "#fa8", stroke: "#0a0", strokeWidth: 3 },
};
