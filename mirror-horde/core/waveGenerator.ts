import type { Enemy, EnemyType } from "./types";
import { RNG } from "./rng";

let enemyIdCounter = 0;

function makeEnemy(type: EnemyType, x: number): Enemy {
  const hp = type === "tank" ? 2 : 1;
  return { id: `e${++enemyIdCounter}`, type, pos: { x, y: 0 }, hp };
}

export function generateWave(turn: number, rng: RNG, width: number): Enemy[] {
  const count = Math.min(1 + Math.floor(turn / 5), 3);
  const enemies: Enemy[] = [];
  const usedX = new Set<number>();

  for (let i = 0; i < count; i++) {
    let x: number;
    let attempts = 0;
    do {
      x = rng.int(0, width - 1);
      attempts++;
    } while (usedX.has(x) && attempts < 20);
    usedX.add(x);

    let type: EnemyType = "normal";
    if (turn >= 10 && rng.next() < 0.3) type = "fast";
    if (turn >= 15 && rng.next() < 0.2) type = "tank";

    enemies.push(makeEnemy(type, x));
  }

  return enemies;
}
