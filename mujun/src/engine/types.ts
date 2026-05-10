export type ObjectId = string;

export type Trait =
  | "wet" | "dry" | "alive" | "hidden"
  | "observed" | "mirror" | "gate" | "shadow"
  | "flower" | "stone" | "bird" | "water";

export type GameObject = {
  id: ObjectId;
  x: number;
  y: number;
  traits: Trait[];
  energy: number;
  stability: number;
};

export type Condition =
  | { near: [Trait, Trait] }
  | { hasTraits: Trait[] }
  | { adjacent: { subject: Trait; object: Trait } };

export type Effect = {
  targetTrait: Trait;
  energyDelta?: number;
  stabilityDelta?: number;
  addTrait?: Trait;
  removeTrait?: Trait;
};

export type Rule = {
  id: string;
  title: string;
  description: string;
  condition: Condition;
  effect: Effect;
  priority: number;
  visibleFromTurn?: number;
};

export type ThoughtCard =
  | { type: "split"; target: ObjectId }
  | { type: "invert"; ruleId: string }
  | { type: "delay"; ruleId: string; turns: number }
  | { type: "exception"; ruleId: string; target: ObjectId }
  | { type: "name"; target: ObjectId; trait: Trait }
  | { type: "sacrifice"; target: ObjectId; trait: Trait };

export type DelayedEffect = {
  effect: Effect;
  targetId: ObjectId;
  remainingTurns: number;
};

export type Metrics = {
  stability: number;
  tension: number;
  life: number;
  openness: number;
};

export type GameEvent = {
  ruleId: string;
  targetId: ObjectId;
  severity: "good" | "bad" | "neutral";
  text: string;
};

export type PredictedEvent = {
  ruleId: string;
  targetId: ObjectId;
  severity: "good" | "bad" | "neutral";
  text: string;
};

export type SimulationResult = {
  nextState: GameState;
  events: GameEvent[];
  predictionsBeforeAction: PredictedEvent[];
};

export type WinCondition = {
  afterTurns: number;
  minStability: number;
  minTension: number;
  minLife: number;
};

export type StageData = {
  id: string;
  title: string;
  goal: string;
  turnLimit: number;
  cardUses: number;
  objects: Array<{
    id: string;
    x: number;
    y: number;
    traits: Trait[];
    energy: number;
    stability: number;
  }>;
  rules: Rule[];
  availableCards: ThoughtCard["type"][];
  winCondition: WinCondition;
};

export type GameState = {
  turn: number;
  maxTurns: number;
  objects: GameObject[];
  rules: Rule[];
  delayedEffects: DelayedEffect[];
  usedCards: ThoughtCard[];
  availableCards: ThoughtCard["type"][];
  cardUsesLeft: number;
  metrics: Metrics;
  status: "playing" | "win" | "lose_collapse" | "lose_empty";
  winCondition: WinCondition;
};
