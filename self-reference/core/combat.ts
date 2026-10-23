import type { Action, Card, CollisionMode, GameState, EnemyHit } from "./types";
import { RNG, shuffle } from "./rng";
import { STARTER_DECK, REWARD_POOL, instantiate } from "../content/cards";
import { instantiateEnemies, ENEMY_SCRIPTS, FIGHTS, intentFromStep } from "../content/enemies";
import { resolvePlay } from "./resolver";

const PLAYER_MAX_HP = 70;
const OPENING_DRAW = 5;
const TURN_DRAW = 1;

function clone(s: GameState): GameState {
  return {
    ...s,
    player: { ...s.player },
    draw: [...s.draw],
    discard: [...s.discard],
    line: [...s.line],
    pending: [...s.pending],
    enemies: s.enemies.map((e) => ({ ...e })),
    rewardOptions: [...s.rewardOptions],
    resolveSteps: [],
    enemyHits: [],
  };
}

function drawInto(s: GameState, target: Card[], n: number): void {
  for (let i = 0; i < n; i++) {
    if (s.draw.length === 0) {
      if (s.discard.length === 0) break;
      const sh = shuffle(s.discard, s.seed);
      s.draw = sh.items;
      s.seed = sh.seed;
      s.discard = [];
    }
    const card = s.draw.shift();
    if (card) target.push(card);
  }
}

function startTurn(s: GameState): void {
  s.player.block = 0;
  s.player.weak = Math.max(0, s.player.weak - 1);
  s.pending = [];
  s.openingDraw = TURN_DRAW;
  drawInto(s, s.pending, TURN_DRAW);
  s.playedThisTurn = false;
  s.turn += 1;
  s.phase = s.pending.length > 0 ? "placing" : "acting";
}

function beginFight(s: GameState, fightIndex: number): void {
  s.fightIndex = fightIndex;
  s.enemies = instantiateEnemies(fightIndex);
  s.player.block = 0;
  s.player.weak = 0;
  s.line = [];
  s.pending = [];
  s.openingDraw = OPENING_DRAW;
  drawInto(s, s.pending, OPENING_DRAW);
  s.playedThisTurn = false;
  s.turn = 1;
  s.phase = s.pending.length > 0 ? "placing" : "acting";
}

function advanceEnemyIntent(s: GameState): void {
  s.enemies = s.enemies.map((e) => {
    if (e.hp <= 0) return e;
    const script = ENEMY_SCRIPTS[e.defId] ?? [{}];
    const idx = (e.scriptIndex + 1) % script.length;
    return { ...e, scriptIndex: idx, intent: intentFromStep(script[idx] ?? {}) };
  });
}

function enemyTurn(s: GameState): void {
  const hits: EnemyHit[] = [];
  for (const enemy of s.enemies) {
    if (enemy.hp <= 0) continue;
    const intent = enemy.intent;
    if (intent.block !== undefined) enemy.block += intent.block;
    if (intent.weak !== undefined) s.player.weak += intent.weak;
    if (intent.attack !== undefined) {
      const times = intent.times ?? 1;
      for (let i = 0; i < times; i++) {
        const blocked = Math.min(s.player.block, intent.attack);
        s.player.block -= blocked;
        const dmg = Math.max(0, intent.attack - blocked);
        s.player.hp = Math.max(0, s.player.hp - dmg);
        hits.push({ enemyId: enemy.id, targetsPlayer: true, amount: dmg });
      }
    }
  }
  s.enemyHits = hits;
  advanceEnemyIntent(s);
}

function pickRewards(s: GameState, n: number): Card[] {
  const rng = new RNG(s.seed);
  const pool = [...REWARD_POOL];
  const out: Card[] = [];
  for (let i = 0; i < n && pool.length > 0; i++) {
    const idx = rng.int(0, pool.length - 1);
    const [defId] = pool.splice(idx, 1);
    out.push(instantiate(defId, `c${s.nextUid++}`));
  }
  s.seed = rng.snapshot();
  return out;
}

function checkWin(s: GameState): void {
  if (s.enemies.every((e) => e.hp <= 0)) {
    s.rewardOptions = pickRewards(s, 3);
    s.phase = "reward";
  }
}

function advanceFight(s: GameState): void {
  const next = s.fightIndex + 1;
  if (next >= s.fightCount) {
    s.phase = "victory";
    return;
  }
  const all = [...s.draw, ...s.discard, ...s.line, ...s.pending];
  const sh = shuffle(all, s.seed);
  s.draw = sh.items;
  s.seed = sh.seed;
  s.discard = [];
  s.rewardOptions = [];
  beginFight(s, next);
}

export function createInitialState(seed: number, collisionMode: CollisionMode = "none", fuseDraw = 0, fuseRipple = 1): GameState {
  const safeSeed = seed >>> 0 || 1;
  const state: GameState = {
    phase: "placing",
    seed: safeSeed,
    initialSeed: safeSeed,
    nextUid: 0,
    fightIndex: 0,
    fightCount: FIGHTS.length,
    collisionMode,
    fuseDraw,
    fuseRipple,
    turn: 1,
    playedThisTurn: false,
    player: { hp: PLAYER_MAX_HP, maxHp: PLAYER_MAX_HP, block: 0, weak: 0 },
    draw: [],
    discard: [],
    line: [],
    pending: [],
    openingDraw: OPENING_DRAW,
    enemies: [],
    rewardOptions: [],
    resolveSteps: [],
    enemyHits: [],
  };
  state.draw = STARTER_DECK.map((defId) => instantiate(defId, `c${state.nextUid++}`));
  const sh = shuffle(state.draw, state.seed);
  state.draw = sh.items;
  state.seed = sh.seed;
  beginFight(state, 0);
  return state;
}

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "START":
      return createInitialState(action.seed, state.collisionMode, state.fuseDraw, state.fuseRipple);
    case "RESTART":
      return createInitialState(state.seed, state.collisionMode, state.fuseDraw, state.fuseRipple);

    case "PLACE": {
      if (state.phase !== "placing" || state.pending.length === 0) return state;
      const s = clone(state);
      const card = s.pending.shift();
      if (card) {
        if (action.side === "left") s.line.unshift(card);
        else s.line.push(card);
      }
      if (s.pending.length === 0) s.phase = "acting";
      return s;
    }

    case "PLAY": {
      if (state.phase !== "acting" || state.playedThisTurn) return state;
      const index = state.line.findIndex((c) => c.uid === action.uid);
      if (index < 0) return state;
      const s = clone(state);
      const played = s.line[index];
      const result = resolvePlay(s.line, index, s.enemies, s.player, s.collisionMode, s.fuseRipple);
      s.line = result.line;
      s.enemies = result.enemies;
      s.player = result.player;
      s.resolveSteps = result.steps;
      s.discard.push(played);
      if (s.fuseDraw > 0 && (s.collisionMode === "fuse" || s.collisionMode === "fuseprop" || s.collisionMode === "propagate")) {
        const collisions = result.steps.filter((st) => st.kind === "collision").length;
        if (collisions > 0) drawInto(s, s.line, collisions * s.fuseDraw);
      }
      s.playedThisTurn = true;
      checkWin(s);
      return s;
    }

    case "END_TURN": {
      if (state.phase !== "acting") return state;
      const s = clone(state);
      enemyTurn(s);
      if (s.player.hp <= 0) {
        s.phase = "defeat";
        return s;
      }
      startTurn(s);
      return s;
    }

    case "PICK_REWARD": {
      if (state.phase !== "reward") return state;
      const s = clone(state);
      const chosen = s.rewardOptions[action.index];
      if (chosen) s.discard.push(chosen);
      advanceFight(s);
      return s;
    }

    case "SKIP_REWARD": {
      if (state.phase !== "reward") return state;
      const s = clone(state);
      advanceFight(s);
      return s;
    }
  }
}
