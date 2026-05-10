import type { BeamSegment, Direction, GameState, HitEvent, Pos, Tile, TileType } from "./types";

type BeamHead = { pos: Pos; dir: Direction };

function posKey(p: Pos) {
  return `${p.x},${p.y}`;
}

function move(pos: Pos, dir: Direction): Pos {
  if (dir === "up") return { x: pos.x, y: pos.y - 1 };
  if (dir === "down") return { x: pos.x, y: pos.y + 1 };
  if (dir === "left") return { x: pos.x - 1, y: pos.y };
  return { x: pos.x + 1, y: pos.y };
}

function reflectSlash(dir: Direction): Direction {
  if (dir === "up") return "right";
  if (dir === "right") return "up";
  if (dir === "down") return "left";
  return "down";
}

function reflectBackslash(dir: Direction): Direction {
  if (dir === "up") return "left";
  if (dir === "left") return "up";
  if (dir === "down") return "right";
  return "down";
}

function turnRight(dir: Direction): Direction {
  if (dir === "up") return "right";
  if (dir === "right") return "down";
  if (dir === "down") return "left";
  return "up";
}

function turnLeft(dir: Direction): Direction {
  if (dir === "up") return "left";
  if (dir === "left") return "down";
  if (dir === "down") return "right";
  return "up";
}

function getSplitterOutputDirs(tileType: TileType, inDir: Direction): Direction[] {
  const straight = inDir;
  const right = turnRight(inDir);
  const left = turnLeft(inDir);

  switch (tileType) {
    case "splitterStraightRight":
      return [straight, right];
    case "splitterStraightLeft":
      return [straight, left];
    case "splitterLeftRight":
      return [right, left];
    case "splitterAll":
      return [straight, right, left];
    default:
      return [];
  }
}

function isOutside(pos: Pos, w: number, h: number): boolean {
  return pos.x < 0 || pos.x >= w || pos.y < 0 || pos.y >= h;
}

export type TraceResult = {
  segments: BeamSegment[];
  hitEvents: HitEvent[];
  tilesHit: Set<string>;
};

export function traceBeam(
  state: GameState,
  tileOverrides?: Record<string, Tile | null>
): TraceResult {
  const segments: BeamSegment[] = [];
  const hitEvents: HitEvent[] = [];
  const tilesHit = new Set<string>();
  const visited = new Set<string>();
  const damageTaken = new Map<string, number>();
  const killedIds = new Set<string>();
  const queue: BeamHead[] = [{ pos: { ...state.laser.pos }, dir: state.laser.dir }];

  let step = 0;
  for (let queueIndex = 0; queueIndex < queue.length && step < 500; queueIndex++) {
    const { pos, dir } = queue[queueIndex];
    const stateKey = `${pos.x},${pos.y},${dir}`;
    if (visited.has(stateKey)) continue;
    visited.add(stateKey);

    const next = move(pos, dir);
    if (isOutside(next, state.width, state.height)) continue;

    segments.push({ from: { ...pos }, to: { ...next }, dir });
    step++;

    const enemy = state.enemies.find(
      (e) => e.pos.x === next.x && e.pos.y === next.y && !killedIds.has(e.id)
    );
    if (enemy) {
      const damage = 1;
      const totalDamage = (damageTaken.get(enemy.id) ?? 0) + damage;
      damageTaken.set(enemy.id, totalDamage);

      const remainingHp = enemy.hp - totalDamage;
      hitEvents.push({ kind: "enemy_hit", enemyId: enemy.id, damage });
      if (remainingHp <= 0) {
        killedIds.add(enemy.id);
        hitEvents.push({ kind: "enemy_killed", enemyId: enemy.id, pos: { ...next } });
      }
      continue;
    }

    const key = posKey(next);
    const tileSet = tileOverrides
      ? tileOverrides[key] !== undefined
        ? tileOverrides[key]
        : state.tiles[key]
      : state.tiles[key];

    if (tileSet) {
      tilesHit.add(key);
      hitEvents.push({ kind: "tile_damaged", pos: { ...next } });

      if (tileSet.type === "absorber") {
        hitEvents.push({ kind: "beam_absorbed", pos: { ...next } });
        continue;
      }

      if (tileSet.type === "mirrorSlash") {
        queue.push({ pos: { ...next }, dir: reflectSlash(dir) });
        continue;
      } else if (tileSet.type === "mirrorBackslash") {
        queue.push({ pos: { ...next }, dir: reflectBackslash(dir) });
        continue;
      }

      const outputDirs = getSplitterOutputDirs(tileSet.type, dir);
      if (outputDirs.length > 0) {
        for (const outputDir of outputDirs) {
          queue.push({ pos: { ...next }, dir: outputDir });
        }
        continue;
      }
    }

    queue.push({ pos: { ...next }, dir });
  }

  return { segments, hitEvents, tilesHit };
}
