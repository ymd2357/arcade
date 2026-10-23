export type CardKind =
  | "strike" // deal value damage
  | "ward" // gain value block
  | "whet" // spent: both neighbours gain +value permanently
  | "surge" // spent: the right neighbour's value is doubled permanently
  | "echo" // repeat the card to your left (strike/ward)
  | "ergo" // if the card to your left is an attack, deal value, else deal 3
  | "tally"; // deal value for each OTHER card in the line

export type CardRole = "attack" | "defense" | "modifier";

export type Card = {
  uid: string;
  defId: string;
  kind: CardKind;
  role: CardRole;
  name: string;
  glyph: string;
  value: number;
  blurb: string;
  buffed: boolean; // changed by a Whet/Surge this run
};

export type Intent = {
  kind: "attack" | "block" | "debuff" | "unknown";
  attack?: number;
  times?: number;
  block?: number;
  weak?: number;
  text: string;
};

export type Enemy = {
  id: string;
  defId: string;
  name: string;
  glyph: string;
  hp: number;
  maxHp: number;
  block: number;
  scriptIndex: number;
  intent: Intent;
};

export type PlayerState = {
  hp: number;
  maxHp: number;
  block: number;
  weak: number;
};

export type Phase = "placing" | "acting" | "reward" | "victory" | "defeat";

export type CollisionMode = "none" | "resonance" | "clash" | "reactive" | "fuse" | "propagate" | "fuseprop";

export type ResolveStep =
  | { kind: "damage"; amount: number; enemyId: string; note?: string }
  | { kind: "block"; amount: number }
  | { kind: "buff"; uid: string; note: string }
  | { kind: "collision"; note: string }
  | { kind: "destroy"; uid: string }
  | { kind: "fizzle"; note: string };

export type EnemyHit = { enemyId?: string; targetsPlayer: boolean; amount: number };

export type GameState = {
  phase: Phase;
  seed: number;
  initialSeed: number;
  nextUid: number;
  fightIndex: number;
  fightCount: number;
  collisionMode: CollisionMode;
  fuseDraw: number; // cards drawn into the line when a fuse-collision happens
  fuseRipple: number; // max number of merges a single fuse-collision may chain (波及上限)
  turn: number;
  playedThisTurn: boolean;
  player: PlayerState;
  draw: Card[];
  discard: Card[];
  line: Card[]; // left -> right
  pending: Card[]; // cards drawn awaiting placement (index 0 = current)
  openingDraw: number; // how many to place this placing-phase
  enemies: Enemy[];
  rewardOptions: Card[];
  // transient, for the UI:
  resolveSteps: ResolveStep[];
  enemyHits: EnemyHit[];
};

export type Action =
  | { type: "START"; seed: number }
  | { type: "RESTART" }
  | { type: "PLACE"; side: "left" | "right" }
  | { type: "PLAY"; uid: string }
  | { type: "END_TURN" }
  | { type: "PICK_REWARD"; index: number }
  | { type: "SKIP_REWARD" };
