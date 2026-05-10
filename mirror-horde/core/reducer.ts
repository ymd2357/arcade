import type { Action, GameState, Pos, Tile, TileType } from "./types";
import { traceBeam } from "./beamTrace";
import { moveEnemies } from "./enemyMove";
import { generateWave } from "./waveGenerator";
import { calcTurnScore } from "./scoring";
import { RNG } from "./rng";

function posKey(p: Pos) {
  return `${p.x},${p.y}`;
}

export function createInitialState(seed: number): GameState {
  return {
    width: 7,
    height: 10,
    turn: 0,
    tiles: {},
    enemies: [],
    laser: { pos: { x: 3, y: 9 }, dir: "up" },
    hand: [
      "mirrorSlash",
      "mirrorBackslash",
      "splitterStraightRight",
      "splitterStraightLeft",
      "splitterLeftRight",
      "splitterAll",
    ],
    selectedHandIndex: null,
    pendingAction: null,
    score: 0,
    killCount: 0,
    rngSeed: seed,
    phase: "planning",
    lastBeamSegments: [],
    lastHitEvents: [],
    previewBeamSegments: [],
  };
}

function rotatedTileType(type: TileType): TileType {
  if (type === "mirrorSlash") return "mirrorBackslash";
  if (type === "mirrorBackslash") return "mirrorSlash";
  return type;
}

function calcPreviewBeam(state: GameState): GameState {
  if (state.phase !== "planning") return { ...state, previewBeamSegments: [] };

  let tileOverrides: Record<string, Tile | null> | undefined;
  if (state.pendingAction) {
    tileOverrides = {};
    const pendingAction = state.pendingAction;
    const key = posKey(pendingAction.pos);

    if (pendingAction.type === "place") {
      tileOverrides[key] = { type: pendingAction.tileType, durability: 3 };
    } else if (pendingAction.type === "remove") {
      tileOverrides[key] = null;
    } else {
      const existing = state.tiles[key];
      if (existing) {
        tileOverrides[key] = { ...existing, type: rotatedTileType(existing.type) };
      }
    }
  }

  const { segments } = traceBeam(state, tileOverrides);
  return { ...state, previewBeamSegments: segments };
}

export function reducer(state: GameState, action: Action): GameState {
  if (state.phase === "gameover" && action.type !== "RESTART") return state;

  switch (action.type) {
    case "SELECT_HAND": {
      const selectedHandIndex =
        action.index >= 0 && action.index < state.hand.length && state.selectedHandIndex !== action.index
          ? action.index
          : null;
      return calcPreviewBeam({ ...state, selectedHandIndex, pendingAction: null });
    }

    case "TAP_CELL": {
      const key = posKey(action.pos);
      if (action.pos.x === state.laser.pos.x && action.pos.y === state.laser.pos.y) return state;

      if (state.selectedHandIndex !== null) {
        const tileType = state.hand[state.selectedHandIndex];
        return calcPreviewBeam({
          ...state,
          pendingAction: { type: "place", tileType, pos: action.pos },
        });
      }

      if (state.tiles[key]) {
        return calcPreviewBeam({
          ...state,
          pendingAction: { type: "rotate", pos: action.pos },
        });
      }

      return state;
    }

    case "UNDO_ACTION": {
      return calcPreviewBeam({ ...state, pendingAction: null, selectedHandIndex: null });
    }

    case "COMMIT_TURN": {
      const tiles = { ...state.tiles };
      const hand = [...state.hand];

      if (state.pendingAction) {
        const pendingAction = state.pendingAction;
        const key = posKey(pendingAction.pos);

        if (pendingAction.type === "place") {
          tiles[key] = { type: pendingAction.tileType, durability: 3 };
        } else if (pendingAction.type === "rotate") {
          const existing = tiles[key];
          if (existing) {
            tiles[key] = { ...existing, type: rotatedTileType(existing.type) };
          }
        } else if (pendingAction.type === "remove") {
          delete tiles[key];
        }
      }

      const stateAfterAction: GameState = { ...state, tiles, hand };
      const { segments, hitEvents, tilesHit } = traceBeam(stateAfterAction);

      const damageMap = new Map<string, number>();
      const killedPositions: Pos[] = [];
      const killedIds = new Set<string>();

      for (const event of hitEvents) {
        if (event.kind === "enemy_hit") {
          damageMap.set(event.enemyId, (damageMap.get(event.enemyId) ?? 0) + event.damage);
        } else if (event.kind === "enemy_killed") {
          killedPositions.push(event.pos);
          killedIds.add(event.enemyId);
        }
      }

      let enemies = stateAfterAction.enemies
        .map((enemy) => {
          const damage = damageMap.get(enemy.id) ?? 0;
          return damage > 0 ? { ...enemy, hp: enemy.hp - damage } : enemy;
        })
        .filter((enemy) => enemy.hp > 0 && !killedIds.has(enemy.id));

      for (const key of tilesHit) {
        if (tiles[key]) {
          const durability = tiles[key].durability - 1;
          if (durability <= 0) {
            delete tiles[key];
          } else {
            tiles[key] = { ...tiles[key], durability };
          }
        }
      }

      const { movedEnemies, reachedBottom } = moveEnemies(enemies, state.height);
      enemies = movedEnemies;

      if (reachedBottom) {
        return {
          ...stateAfterAction,
          tiles,
          enemies,
          lastBeamSegments: segments,
          lastHitEvents: hitEvents,
          previewBeamSegments: [],
          pendingAction: null,
          selectedHandIndex: null,
          phase: "gameover",
        };
      }

      const rng = new RNG(state.rngSeed + state.turn);
      const newEnemies = generateWave(state.turn + 1, rng, state.width);
      const allEnemies = [...enemies, ...newEnemies];
      const killed = killedIds.size;
      const highReflectKill =
        segments.filter((segment) =>
          killedPositions.some((pos) => pos.x === segment.to.x && pos.y === segment.to.y)
        ).length >= 3;
      const turnScore = calcTurnScore({
        killed,
        multiKill: killed >= 2,
        highReflectKill,
      });

      return calcPreviewBeam({
        ...stateAfterAction,
        tiles,
        enemies: allEnemies,
        turn: state.turn + 1,
        score: state.score + turnScore + 10,
        killCount: state.killCount + killed,
        lastBeamSegments: segments,
        lastHitEvents: hitEvents,
        previewBeamSegments: [],
        pendingAction: null,
        selectedHandIndex: null,
      });
    }

    case "RESTART": {
      return createInitialState(Date.now());
    }
  }
}
