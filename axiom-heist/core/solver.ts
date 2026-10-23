import { reducer, createStateForRoom, legalMoveDirections } from "./reducer.ts";
import type { Action, CellType, GameState, Guard, Law, Room } from "./types.ts";

const SEARCH_ACTIONS: Action[] = [
  ...legalMoveDirections().map((dir): Action => ({ type: "MOVE", dir })),
  { type: "WAIT" },
];

function serializeCells(cells: CellType[][]): string {
  return cells.map((row) => row.join("")).join("|");
}

function serializeGuards(guards: Guard[]): string {
  return guards.map((guard) => `${guard.pos.x},${guard.pos.y},${guard.facing},${guard.patrolIndex},${guard.patrolDir}`).join(";");
}

function solverKey(state: GameState): string {
  return [
    state.thief.x,
    state.thief.y,
    state.hasArtifact ? 1 : 0,
    state.turn % 24,
    serializeCells(state.cells),
    serializeGuards(state.guards),
  ].join("|");
}

function trimHistory(state: GameState): GameState {
  return { ...state, history: [] };
}

export function isSolvable(room: Room, carriedLaws: Law[]): boolean {
  const start = createStateForRoom(room, 0, carriedLaws, 1);
  const queue: GameState[] = [start];
  const visited = new Set<string>([solverKey(start)]);

  for (let index = 0; index < queue.length && index < 5000; index++) {
    const state = queue[index];
    if (state.phase === "cleared") return true;
    if (state.phase !== "planning" || state.turn > 80) continue;

    for (const action of SEARCH_ACTIONS) {
      const next = trimHistory(reducer(state, action));
      if (next === state || next.phase === "caught") continue;
      if (next.phase === "cleared") return true;

      const key = solverKey(next);
      if (visited.has(key)) continue;
      visited.add(key);
      queue.push(next);
    }
  }

  return false;
}
