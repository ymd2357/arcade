import type { CellType, Direction, Law, LawId, Pos, Room } from "./types.ts";
import { computeVision, inBounds, posKey, step } from "./vision.ts";

const LAW_ORDER: LawId[] = [
  "GRAVITY_DOWN",
  "LIGHT_PUSHES_METAL",
  "DOORS_OPEN_WHEN_UNWATCHED",
  "GUARDS_FEAR_DARK",
  "MIRRORS_REFLECT_VISION",
  "THIEF_HIDDEN_WHILE_STILL",
];

const DIRS: Direction[] = ["up", "down", "left", "right"];

export function activeLaws(room: Room, carriedLaws: Law[]): Law[] {
  const active = new Map<LawId, Law>();
  for (const law of [...room.laws, ...carriedLaws]) active.set(law.id, law);
  return LAW_ORDER.filter((id) => active.has(id)).map((id) => ({ id }));
}

export function hasLaw(laws: Law[], id: LawId): boolean {
  return laws.some((law) => law.id === id);
}

function cloneCells(cells: CellType[][]): CellType[][] {
  return cells.map((row) => [...row]);
}

function canMetalMoveInto(cells: CellType[][], pos: Pos): boolean {
  return cells[pos.y]?.[pos.x] === "floor";
}

export function applyGravityDown(cells: CellType[][], active: Law[]): CellType[][] {
  if (!hasLaw(active, "GRAVITY_DOWN")) return cells;

  const next = cloneCells(cells);
  for (let y = next.length - 2; y >= 0; y--) {
    for (let x = 0; x < next[y].length; x++) {
      if (next[y][x] !== "metal") continue;
      const below = { x, y: y + 1 };
      if (!canMetalMoveInto(next, below)) continue;
      next[y][x] = "floor";
      next[below.y][below.x] = "metal";
    }
  }
  return next;
}

export function applyLightPushesMetal(cells: CellType[][], active: Law[]): CellType[][] {
  if (!hasLaw(active, "LIGHT_PUSHES_METAL")) return cells;

  const next = cloneCells(cells);
  const height = next.length;
  const width = next[0]?.length ?? 0;
  const pushed = new Set<string>();

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (next[y][x] !== "lightSource") continue;
      const source = { x, y };

      for (const dir of DIRS) {
        let pos = source;
        for (let guard = 0; guard < width * height; guard++) {
          pos = step(pos, dir);
          if (!inBounds(pos, width, height)) break;
          const cell = next[pos.y][pos.x];
          if (cell === "wall") break;
          if (cell !== "metal") continue;

          const key = posKey(pos);
          const target = step(pos, dir);
          if (!pushed.has(key) && inBounds(target, width, height) && canMetalMoveInto(next, target)) {
            next[pos.y][pos.x] = "floor";
            next[target.y][target.x] = "metal";
            pushed.add(posKey(target));
          }
          break;
        }
      }
    }
  }

  return next;
}

export function isDoorOpenWhenUnwatched(pos: Pos, active: Law[], watched: Set<string>): boolean {
  return hasLaw(active, "DOORS_OPEN_WHEN_UNWATCHED") && !watched.has(posKey(pos));
}

export function guardsFearDark(active: Law[], lit: Set<string>, pos: Pos): boolean {
  return hasLaw(active, "GUARDS_FEAR_DARK") && !lit.has(posKey(pos));
}

export function mirrorsReflectVision(active: Law[]): boolean {
  return hasLaw(active, "MIRRORS_REFLECT_VISION");
}

export function thiefHiddenWhileStill(active: Law[], lastActionMoved: boolean): boolean {
  return hasLaw(active, "THIEF_HIDDEN_WHILE_STILL") && !lastActionMoved;
}

export function resolveWorld(room: Room, cells: CellType[][], carriedLaws: Law[]): CellType[][] {
  const active = activeLaws(room, carriedLaws);
  return applyLightPushesMetal(applyGravityDown(cells, active), active);
}

export function getVision(room: Room, cells: CellType[][], carriedLaws: Law[], guards: Parameters<typeof computeVision>[0]["guards"]) {
  const active = activeLaws(room, carriedLaws);
  return computeVision({ width: room.width, height: room.height, cells, guards }, mirrorsReflectVision(active));
}
