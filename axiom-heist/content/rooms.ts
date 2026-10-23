import type { CellType, Law, Room } from "../core/types.ts";

const WIDTH = 7;
const HEIGHT = 10;

const CHAR_TO_CELL: Record<string, CellType> = {
  "#": "wall",
  ".": "floor",
  "D": "door",
  "L": "lightSource",
  "/": "mirror",
  "B": "metal",
  "A": "artifact",
  "E": "exit",
  "T": "floor",
};

function law(id: Law["id"]): Law {
  return { id };
}

function cells(rows: string[]): CellType[][] {
  if (rows.length !== HEIGHT || rows.some((row) => row.length !== WIDTH)) {
    throw new Error("Axiom room maps must be 7x10.");
  }
  return rows.map((row) => [...row].map((char) => CHAR_TO_CELL[char] ?? "floor"));
}

export const ROOMS: Room[] = [
  {
    id: "quiet-crossing",
    name: "Quiet Crossing",
    width: WIDTH,
    height: HEIGHT,
    cells: cells([
      "#######",
      "#..E..#",
      "#..D..#",
      "#.....#",
      "#..A..#",
      "#.....#",
      "#.....#",
      "#.....#",
      "#..T..#",
      "#######",
    ]),
    thiefStart: { x: 3, y: 8 },
    guards: [
      {
        pos: { x: 1, y: 3 },
        facing: "right",
        patrol: [
          { x: 1, y: 3 },
          { x: 2, y: 3 },
          { x: 3, y: 3 },
          { x: 4, y: 3 },
          { x: 5, y: 3 },
        ],
      },
    ],
    laws: [law("THIEF_HIDDEN_WHILE_STILL"), law("DOORS_OPEN_WHEN_UNWATCHED")],
  },
  {
    id: "bright-forge",
    name: "Bright Forge",
    width: WIDTH,
    height: HEIGHT,
    cells: cells([
      "#######",
      "#..E..#",
      "#.....#",
      "#..A.B#",
      "#.....#",
      "#L.B.##",
      "#..#..#",
      "#.....#",
      "#..T..#",
      "#######",
    ]),
    thiefStart: { x: 3, y: 8 },
    guards: [
      {
        pos: { x: 5, y: 7 },
        facing: "up",
        patrol: [
          { x: 5, y: 6 },
          { x: 5, y: 7 },
        ],
      },
    ],
    laws: [law("LIGHT_PUSHES_METAL"), law("GUARDS_FEAR_DARK"), law("GRAVITY_DOWN")],
  },
  {
    id: "bent-sight",
    name: "Bent Sight",
    width: WIDTH,
    height: HEIGHT,
    cells: cells([
      "#######",
      "#..E..#",
      "#.....#",
      "#.###.#",
      "#.../.#",
      "#..A..#",
      "#.....#",
      "#.....#",
      "#..T..#",
      "#######",
    ]),
    thiefStart: { x: 3, y: 8 },
    guards: [
      {
        pos: { x: 1, y: 4 },
        facing: "right",
        patrol: [{ x: 1, y: 4 }],
      },
    ],
    laws: [law("MIRRORS_REFLECT_VISION")],
  },
];
