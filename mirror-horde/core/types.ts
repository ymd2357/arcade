export type Direction = "up" | "down" | "left" | "right";
export type Pos = { x: number; y: number };

export type TileType =
  | "mirrorSlash"
  | "mirrorBackslash"
  | "absorber"
  | "splitterStraightRight"
  | "splitterStraightLeft"
  | "splitterLeftRight"
  | "splitterAll";

export type Tile = {
  type: TileType;
  durability: number;
};

export type EnemyType = "normal" | "fast" | "tank";

export type Enemy = {
  id: string;
  type: EnemyType;
  pos: Pos;
  hp: number;
};

export type BeamSegment = {
  from: Pos;
  to: Pos;
  dir: Direction;
};

export type HitEvent =
  | { kind: "enemy_hit"; enemyId: string; damage: number }
  | { kind: "enemy_killed"; enemyId: string; pos: Pos }
  | { kind: "tile_damaged"; pos: Pos }
  | { kind: "tile_destroyed"; pos: Pos }
  | { kind: "beam_absorbed"; pos: Pos };

export type GameState = {
  width: number;
  height: number;
  turn: number;
  tiles: Record<string, Tile>;
  enemies: Enemy[];
  laser: { pos: Pos; dir: Direction };
  hand: TileType[];
  selectedHandIndex: number | null;
  pendingAction: PendingAction | null;
  score: number;
  killCount: number;
  rngSeed: number;
  phase: "planning" | "gameover";
  lastBeamSegments: BeamSegment[];
  lastHitEvents: HitEvent[];
  previewBeamSegments: BeamSegment[];
};

export type PendingAction =
  | { type: "place"; tileType: TileType; pos: Pos }
  | { type: "rotate"; pos: Pos }
  | { type: "remove"; pos: Pos };

export type Action =
  | { type: "SELECT_HAND"; index: number }
  | { type: "TAP_CELL"; pos: Pos }
  | { type: "COMMIT_TURN" }
  | { type: "UNDO_ACTION" }
  | { type: "RESTART" };
