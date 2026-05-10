import type { GameState } from "../core/types";

export function formatHud(state: GameState): { turn: string; score: string; kills: string } {
  return {
    turn: `Turn ${state.turn}`,
    score: `Score ${state.score}`,
    kills: `Kills ${state.killCount}`,
  };
}
