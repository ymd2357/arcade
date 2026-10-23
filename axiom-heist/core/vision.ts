import type { CellType, Direction, Guard, Pos } from "./types.ts";

export type VisionInput = {
  width: number;
  height: number;
  cells: CellType[][];
  guards: Guard[];
};

export type VisionResult = {
  lit: Set<string>;
  watched: Set<string>;
};

const DIRECTIONS: Direction[] = ["up", "down", "left", "right"];

export function posKey(pos: Pos): string {
  return `${pos.x},${pos.y}`;
}

export function samePos(a: Pos, b: Pos): boolean {
  return a.x === b.x && a.y === b.y;
}

export function step(pos: Pos, dir: Direction): Pos {
  if (dir === "up") return { x: pos.x, y: pos.y - 1 };
  if (dir === "down") return { x: pos.x, y: pos.y + 1 };
  if (dir === "left") return { x: pos.x - 1, y: pos.y };
  return { x: pos.x + 1, y: pos.y };
}

export function inBounds(pos: Pos, width: number, height: number): boolean {
  return pos.x >= 0 && pos.x < width && pos.y >= 0 && pos.y < height;
}

export function reflectSlash(dir: Direction): Direction {
  if (dir === "up") return "right";
  if (dir === "right") return "up";
  if (dir === "down") return "left";
  return "down";
}

function addLightRays(input: VisionInput, lit: Set<string>): void {
  for (let y = 0; y < input.height; y++) {
    for (let x = 0; x < input.width; x++) {
      if (input.cells[y][x] !== "lightSource") continue;
      const source = { x, y };
      lit.add(posKey(source));

      for (const dir of DIRECTIONS) {
        let pos = source;
        for (let guard = 0; guard < input.width * input.height; guard++) {
          pos = step(pos, dir);
          if (!inBounds(pos, input.width, input.height)) break;
          if (input.cells[pos.y][pos.x] === "wall") break;
          lit.add(posKey(pos));
        }
      }
    }
  }
}

function addGuardRay(input: VisionInput, watched: Set<string>, start: Pos, startDir: Direction, reflectVision: boolean): void {
  let pos = start;
  let dir = startDir;
  const visited = new Set<string>();

  for (let guard = 0; guard < input.width * input.height * 4; guard++) {
    const stateKey = `${pos.x},${pos.y},${dir}`;
    if (visited.has(stateKey)) break;
    visited.add(stateKey);

    pos = step(pos, dir);
    if (!inBounds(pos, input.width, input.height)) break;

    const cell = input.cells[pos.y][pos.x];
    if (cell === "wall") break;

    watched.add(posKey(pos));

    if (cell === "mirror") {
      if (!reflectVision) break;
      dir = reflectSlash(dir);
    }
  }
}

export function computeVision(input: VisionInput, reflectVision: boolean): VisionResult {
  const lit = new Set<string>();
  const watched = new Set<string>();

  addLightRays(input, lit);

  for (const guard of input.guards) {
    addGuardRay(input, watched, guard.pos, guard.facing, reflectVision);
  }

  return { lit, watched };
}
