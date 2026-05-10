import type { Enemy } from "./types";

export function moveEnemies(
  enemies: Enemy[],
  height: number
): {
  movedEnemies: Enemy[];
  reachedBottom: boolean;
} {
  const movedEnemies = enemies.map((e) => {
    const speed = e.type === "fast" ? 2 : 1;
    return { ...e, pos: { ...e.pos, y: e.pos.y + speed } };
  });
  const reachedBottom = movedEnemies.some((e) => e.pos.y >= height);
  return { movedEnemies, reachedBottom };
}
