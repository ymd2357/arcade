export type Direction = "up" | "down" | "left" | "right";
export type Pos = { x: number; y: number };

export type Law =
  | { id: "GRAVITY_DOWN" }
  | { id: "LIGHT_PUSHES_METAL" }
  | { id: "DOORS_OPEN_WHEN_UNWATCHED" }
  | { id: "GUARDS_FEAR_DARK" }
  | { id: "MIRRORS_REFLECT_VISION" }
  | { id: "THIEF_HIDDEN_WHILE_STILL" };

export type LawId = Law["id"];

export type CellType = "floor" | "wall" | "door" | "lightSource" | "mirror" | "metal" | "artifact" | "exit";

export type GuardTemplate = {
  pos: Pos;
  facing: Direction;
  patrol: Pos[];
};

export type Guard = GuardTemplate & {
  id: string;
  patrolIndex: number;
  patrolDir: 1 | -1;
};

export type Room = {
  id: string;
  name: string;
  width: number;
  height: number;
  cells: CellType[][];
  thiefStart: Pos;
  guards: GuardTemplate[];
  laws: Law[];
};

export type Phase = "planning" | "caught" | "cleared" | "won";

export type GameSnapshot = {
  roomIndex: number;
  room: Room;
  width: number;
  height: number;
  cells: CellType[][];
  thief: Pos;
  guards: Guard[];
  carriedLaws: Law[];
  hasArtifact: boolean;
  turn: number;
  phase: Phase;
  lastActionMoved: boolean;
};

export type GameState = GameSnapshot & {
  seed: number;
  history: GameSnapshot[];
};

export type Action =
  | { type: "MOVE"; dir: Direction }
  | { type: "WAIT" }
  | { type: "UNDO" }
  | { type: "RESTART" }
  | { type: "STEAL"; lawId: LawId };
