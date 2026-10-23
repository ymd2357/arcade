import { ROOMS } from "../content/rooms.ts";
import { activeLaws, getVision, guardsFearDark, isDoorOpenWhenUnwatched, resolveWorld, thiefHiddenWhileStill } from "./laws.ts";
import type { Action, CellType, Direction, GameSnapshot, GameState, Guard, Law, Pos, Room } from "./types.ts";
import { inBounds, posKey, samePos, step } from "./vision.ts";

const MOVE_DIRS: Direction[] = ["up", "down", "left", "right"];

function cloneCells(cells: CellType[][]): CellType[][] {
  return cells.map((row) => [...row]);
}

function cloneLaws(laws: Law[]): Law[] {
  return laws.map((law) => ({ id: law.id }));
}

function cloneGuards(guards: Guard[]): Guard[] {
  return guards.map((guard) => ({
    ...guard,
    pos: { ...guard.pos },
    patrol: guard.patrol.map((pos) => ({ ...pos })),
  }));
}

function toSnapshot(state: GameState): GameSnapshot {
  return {
    roomIndex: state.roomIndex,
    room: state.room,
    width: state.width,
    height: state.height,
    cells: cloneCells(state.cells),
    thief: { ...state.thief },
    guards: cloneGuards(state.guards),
    carriedLaws: cloneLaws(state.carriedLaws),
    hasArtifact: state.hasArtifact,
    turn: state.turn,
    phase: state.phase,
    lastActionMoved: state.lastActionMoved,
  };
}

function fromSnapshot(snapshot: GameSnapshot, seed: number, history: GameSnapshot[]): GameState {
  return {
    ...snapshot,
    cells: cloneCells(snapshot.cells),
    thief: { ...snapshot.thief },
    guards: cloneGuards(snapshot.guards),
    carriedLaws: cloneLaws(snapshot.carriedLaws),
    seed,
    history,
  };
}

function directionBetween(from: Pos, to: Pos, fallback: Direction): Direction {
  if (to.x > from.x) return "right";
  if (to.x < from.x) return "left";
  if (to.y > from.y) return "down";
  if (to.y < from.y) return "up";
  return fallback;
}

function isGuardAt(guards: Guard[], pos: Pos): boolean {
  return guards.some((guard) => samePos(guard.pos, pos));
}

function isPassableCell(state: GameState, pos: Pos, watched: Set<string>): boolean {
  if (!inBounds(pos, state.width, state.height)) return false;
  if (isGuardAt(state.guards, pos)) return false;

  const cell = state.cells[pos.y][pos.x];
  if (cell === "floor" || cell === "artifact" || cell === "exit") return true;
  if (cell === "door") return isDoorOpenWhenUnwatched(pos, activeLaws(state.room, state.carriedLaws), watched);
  return false;
}

function moveGuardAlongPatrol(state: GameState, guard: Guard, lit: Set<string>): Guard {
  if (guard.patrol.length <= 1) return guard;

  let patrolDir = guard.patrolDir;
  let nextIndex = guard.patrolIndex + patrolDir;
  if (nextIndex < 0 || nextIndex >= guard.patrol.length) {
    patrolDir = patrolDir === 1 ? -1 : 1;
    nextIndex = guard.patrolIndex + patrolDir;
  }

  const target = guard.patrol[nextIndex] ?? guard.pos;
  const facing = directionBetween(guard.pos, target, guard.facing);
  const cell = state.cells[target.y]?.[target.x];
  const active = activeLaws(state.room, state.carriedLaws);
  const blocked =
    cell === undefined ||
    cell === "wall" ||
    cell === "door" ||
    cell === "metal" ||
    cell === "mirror" ||
    cell === "lightSource" ||
    guardsFearDark(active, lit, target);

  if (blocked) {
    return { ...guard, facing, patrolDir };
  }

  return { ...guard, pos: { ...target }, facing, patrolIndex: nextIndex, patrolDir };
}

function stepGuards(state: GameState): Guard[] {
  const vision = getVision(state.room, state.cells, state.carriedLaws, state.guards);
  return state.guards.map((guard) => moveGuardAlongPatrol(state, guard, vision.lit));
}

function collectArtifact(state: GameState): boolean {
  return state.hasArtifact || state.cells[state.thief.y][state.thief.x] === "artifact";
}

function resolveTurn(state: GameState, thief: Pos, lastActionMoved: boolean): GameState {
  const cells = resolveWorld(state.room, state.cells, state.carriedLaws);
  const afterWorld: GameState = { ...state, cells, thief, hasArtifact: state.hasArtifact, lastActionMoved };
  const guards = stepGuards(afterWorld);
  const afterGuards: GameState = {
    ...afterWorld,
    guards,
    hasArtifact: collectArtifact(afterWorld),
    turn: state.turn + 1,
  };
  const active = activeLaws(afterGuards.room, afterGuards.carriedLaws);
  const vision = getVision(afterGuards.room, afterGuards.cells, afterGuards.carriedLaws, afterGuards.guards);
  const seen = vision.watched.has(posKey(afterGuards.thief));
  const touchedByGuard = isGuardAt(afterGuards.guards, afterGuards.thief);
  const hidden = thiefHiddenWhileStill(active, afterGuards.lastActionMoved);

  if ((seen && !hidden) || touchedByGuard) {
    return { ...afterGuards, phase: "caught" };
  }

  if (afterGuards.hasArtifact && afterGuards.cells[afterGuards.thief.y][afterGuards.thief.x] === "exit") {
    return { ...afterGuards, phase: "cleared" };
  }

  return afterGuards;
}

function withHistory(state: GameState): GameSnapshot[] {
  return [...state.history, toSnapshot(state)].slice(-80);
}

export function createStateForRoom(room: Room, roomIndex: number, carriedLaws: Law[], seed: number): GameState {
  const guards = room.guards.map((guard, index): Guard => ({
    ...guard,
    id: `${room.id}-g${index}`,
    pos: { ...guard.pos },
    patrol: guard.patrol.map((pos) => ({ ...pos })),
    patrolIndex: Math.max(0, guard.patrol.findIndex((pos) => samePos(pos, guard.pos))),
    patrolDir: 1,
  }));

  return {
    roomIndex,
    room,
    width: room.width,
    height: room.height,
    cells: cloneCells(room.cells),
    thief: { ...room.thiefStart },
    guards,
    carriedLaws: cloneLaws(carriedLaws),
    hasArtifact: false,
    turn: 0,
    phase: "planning",
    lastActionMoved: false,
    seed,
    history: [],
  };
}

export function createInitialState(seed: number): GameState {
  return createStateForRoom(ROOMS[0], 0, [], seed);
}

export function legalMoveDirections(): Direction[] {
  return MOVE_DIRS;
}

export function reducer(state: GameState, action: Action): GameState {
  if (action.type === "RESTART") return createInitialState(state.seed);

  if (action.type === "UNDO") {
    const previous = state.history[state.history.length - 1];
    if (!previous) return state;
    return fromSnapshot(previous, state.seed, state.history.slice(0, -1));
  }

  if (action.type === "STEAL") {
    if (state.phase !== "cleared") return state;
    if (!state.room.laws.some((law) => law.id === action.lawId)) return state;
    if (state.carriedLaws.some((law) => law.id === action.lawId)) return state;

    const carriedLaws = [...state.carriedLaws, { id: action.lawId }];
    const nextRoomIndex = state.roomIndex + 1;
    if (nextRoomIndex >= ROOMS.length) {
      return { ...state, carriedLaws, phase: "won" };
    }
    return createStateForRoom(ROOMS[nextRoomIndex], nextRoomIndex, carriedLaws, state.seed);
  }

  if (state.phase !== "planning") return state;

  if (action.type === "WAIT") {
    return { ...resolveTurn(state, state.thief, false), history: withHistory(state) };
  }

  const vision = getVision(state.room, state.cells, state.carriedLaws, state.guards);
  const target = step(state.thief, action.dir);
  if (!isPassableCell(state, target, vision.watched)) return state;

  return { ...resolveTurn(state, target, true), history: withHistory(state) };
}
