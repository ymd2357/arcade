// Headless balance simulation for the collision-effect designs.
// Run: npx tsx self-reference/sim/balance.ts
import { createInitialState, reducer } from "../core/combat";
import type { Action, CollisionMode, Enemy, GameState } from "../core/types";

const N = 600; // seeds per config

type Config = { label: string; mode: CollisionMode; fuseDraw: number; fuseRipple: number };
const CONFIGS: Config[] = [
  { label: "resonance", mode: "resonance", fuseDraw: 0, fuseRipple: 1 },
  { label: "fuse +2", mode: "fuse", fuseDraw: 2, fuseRipple: 1 }, // prior best
  { label: "propagate", mode: "propagate", fuseDraw: 0, fuseRipple: 1 }, // cross-propagation only
  { label: "propag +1", mode: "propagate", fuseDraw: 1, fuseRipple: 1 },
  { label: "fuseprop+1", mode: "fuseprop", fuseDraw: 1, fuseRipple: 1 }, // ← full idea: fuse + cross-propagate + draw1
  { label: "fuseprop+2", mode: "fuseprop", fuseDraw: 2, fuseRipple: 1 },
];

const sumHp = (es: Enemy[]) => es.reduce((a, e) => a + e.hp, 0);
const totalVal = (line: GameState["line"]) => line.reduce((a, c) => a + c.value, 0);
const maxVal = (line: GameState["line"]) => line.reduce((a, c) => Math.max(a, c.value), 0);
const incoming = (s: GameState) =>
  s.enemies.filter((e) => e.hp > 0).reduce((a, e) => a + (e.intent.attack ?? 0) * (e.intent.times ?? 1), 0);

function placeSide(s: GameState): "left" | "right" {
  const card = s.pending[0];
  const line = s.line;
  if (!card || line.length === 0) return "right";
  const le = line[0];
  const re = line[line.length - 1];
  if (card.role === "modifier") return re.value >= le.value ? "right" : "left";
  if (le.role === "modifier") return "left";
  if (re.role === "modifier") return "right";
  return "right";
}

function pickReward(s: GameState): number {
  let best = 0;
  let bestP = -1;
  s.rewardOptions.forEach((c, i) => {
    const p = c.role === "attack" ? c.value : c.role === "defense" ? c.value * 0.8 : 4;
    if (p > bestP) {
      bestP = p;
      best = i;
    }
  });
  return best;
}

function scoreOf(before: GameState, after: GameState, threatened: boolean): number {
  const eDmg = sumHp(before.enemies) - sumHp(after.enemies);
  const block = after.player.block - before.player.block;
  const selfDmg = before.player.hp - after.player.hp;
  const valDelta = totalVal(after.line) - totalVal(before.line);
  const extraLost = before.line.length - 1 - after.line.length;
  const bw = threatened ? 1.2 : 0.5;
  return eDmg + block * bw + valDelta * 0.3 - selfDmg * 1.5 - Math.max(0, extraLost) * 2;
}

function decideAct(s: GameState): Action {
  const threatened = incoming(s) > s.player.block;
  let bestUid: string | null = null;
  let bestScore = -1e9;
  for (const c of s.line) {
    const after = reducer(s, { type: "PLAY", uid: c.uid });
    const score = scoreOf(s, after, threatened);
    if (score > bestScore) {
      bestScore = score;
      bestUid = c.uid;
    }
  }
  if (bestUid === null) return { type: "END_TURN" };
  const L = s.line.length;
  // aggressive: only spend a turn building when the line is too small to combo
  if (threatened || bestScore >= 2 || L <= 2) return { type: "PLAY", uid: bestUid };
  return { type: "END_TURN" };
}

type RunResult = {
  win: boolean;
  fights: number;
  hp: number;
  turns: number;
  collisions: number;
  snowball: number;
  damage: number;
};

function runGame(seed: number, mode: CollisionMode, fuseDraw: number, fuseRipple: number): RunResult {
  let s = createInitialState(seed, mode, fuseDraw, fuseRipple);
  let turns = 0;
  let collisions = 0;
  let snowball = 0;
  let damage = 0;
  const MAX_TURNS = 50;
  let guard = 0;
  while (guard++ < 8000) {
    if (s.phase === "victory" || s.phase === "defeat") break;
    if (turns > MAX_TURNS) break; // stalemate counts as a loss
    if (s.phase === "placing") {
      s = reducer(s, { type: "PLACE", side: placeSide(s) });
      continue;
    }
    if (s.phase === "reward") {
      s = reducer(s, { type: "PICK_REWARD", index: pickReward(s) });
      continue;
    }
    // acting
    if (s.playedThisTurn) {
      s = reducer(s, { type: "END_TURN" });
      turns++;
      continue;
    }
    const action = decideAct(s);
    if (action.type === "PLAY") {
      const before = s;
      const after = reducer(s, action);
      damage += sumHp(before.enemies) - sumHp(after.enemies);
      collisions += after.resolveSteps.filter((st) => st.kind === "collision").length;
      s = after;
    } else {
      s = reducer(s, action);
      turns++;
    }
    snowball = Math.max(snowball, maxVal(s.line));
  }
  const win = s.phase === "victory";
  return {
    win,
    fights: win ? s.fightCount : s.fightIndex,
    hp: s.player.hp,
    turns,
    collisions,
    snowball,
    damage,
  };
}

type Agg = {
  winRate: number;
  avgFights: number;
  avgHpWin: number;
  avgTurns: number;
  avgCollisions: number;
  avgSnowball: number;
};

function aggregate(cfg: Config): Agg {
  const runs: RunResult[] = [];
  for (let seed = 1; seed <= N; seed++) runs.push(runGame(seed * 2654435761 + 1, cfg.mode, cfg.fuseDraw, cfg.fuseRipple));
  const wins = runs.filter((r) => r.win);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  return {
    winRate: wins.length / runs.length,
    avgFights: avg(runs.map((r) => r.fights)),
    avgHpWin: avg(wins.map((r) => r.hp)),
    avgTurns: avg(runs.map((r) => r.turns)),
    avgCollisions: avg(runs.map((r) => r.collisions)),
    avgSnowball: avg(runs.map((r) => r.snowball)),
  };
}

const pad = (s: string, n: number) => (s + " ".repeat(n)).slice(0, n);
console.log(`Balance simulation — ${N} seeds/mode, greedy policy, 3 fights\n`);
console.log(
  [pad("mode", 10), pad("win%", 7), pad("avgFights", 10), pad("hp(win)", 9), pad("turns", 7), pad("collis/run", 11), pad("maxCardVal", 10)].join(" ")
);
console.log("-".repeat(72));
for (const cfg of CONFIGS) {
  const a = aggregate(cfg);
  console.log(
    [
      pad(cfg.label, 10),
      pad((a.winRate * 100).toFixed(1), 7),
      pad(a.avgFights.toFixed(2), 10),
      pad(a.avgHpWin.toFixed(1), 9),
      pad(a.avgTurns.toFixed(1), 7),
      pad(a.avgCollisions.toFixed(2), 11),
      pad(a.avgSnowball.toFixed(1), 10),
    ].join(" ")
  );
}
