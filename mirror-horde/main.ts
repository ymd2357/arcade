import { reducer, createInitialState } from "./core/reducer";
import type { Action, GameState, Pos } from "./core/types";
import { ENEMY_APPEARANCE } from "./content/enemies";
import { TILE_GLYPHS, TILE_NAMES } from "./content/tiles";
import { readAppElements } from "./ui/App";
import { segmentPoints } from "./ui/BeamLayer";
import { cellCenter } from "./ui/BoardView";
import { formatHud } from "./ui/HudView";
import { eventToBoardPos } from "./ui/InputController";
import { loadHighScore, saveHighScore } from "./storage/save";

let state: GameState = createInitialState(Date.now());
let highScore = loadHighScore();

const {
  svg,
  hudTurn,
  hudScore,
  hudKills,
  btnUndo,
  btnFire,
  gameoverOverlay,
  gameoverScore,
  btnRestart,
  handCards,
} = readAppElements();

function dispatch(action: Action) {
  state = reducer(state, action);
  if (state.score > highScore) {
    highScore = state.score;
    saveHighScore(highScore);
  }
  render();
}

function createSvgElement(tag: string, attrs: Record<string, string | number>) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [key, value] of Object.entries(attrs)) {
    element.setAttribute(key, String(value));
  }
  return element;
}

function createSvgText(attrs: Record<string, string | number>, text: string) {
  const element = createSvgElement("text", attrs);
  element.textContent = text;
  return element;
}

function posKey(pos: Pos) {
  return `${pos.x},${pos.y}`;
}

function render() {
  const container = svg.parentElement!;
  const widthPx = container.clientWidth;
  const heightPx = container.clientHeight;
  const cellW = widthPx / state.width;
  const cellH = heightPx / state.height;

  svg.setAttribute("viewBox", `0 0 ${widthPx} ${heightPx}`);
  svg.innerHTML = "";

  for (let x = 0; x <= state.width; x++) {
    svg.appendChild(
      createSvgElement("line", {
        x1: x * cellW,
        y1: 0,
        x2: x * cellW,
        y2: heightPx,
        stroke: "#333",
        "stroke-width": 0.5,
      })
    );
  }

  for (let y = 0; y <= state.height; y++) {
    svg.appendChild(
      createSvgElement("line", {
        x1: 0,
        y1: y * cellH,
        x2: widthPx,
        y2: y * cellH,
        stroke: "#333",
        "stroke-width": 0.5,
      })
    );
  }

  const pendingPlaceKey = state.pendingAction?.type === "place" ? posKey(state.pendingAction.pos) : null;
  const pendingRotateKey = state.pendingAction?.type === "rotate" ? posKey(state.pendingAction.pos) : null;

  for (const seg of state.previewBeamSegments) {
    const points = segmentPoints(seg, cellW, cellH);
    svg.appendChild(
      createSvgElement("line", {
        ...points,
        stroke: "#4af",
        "stroke-width": 2,
        opacity: 0.3,
        "stroke-dasharray": "4 4",
      })
    );
  }

  for (const seg of state.lastBeamSegments) {
    const points = segmentPoints(seg, cellW, cellH);
    svg.appendChild(
      createSvgElement("line", {
        ...points,
        stroke: "#ff0",
        "stroke-width": 3,
        opacity: 0.7,
      })
    );
  }

  for (const [key, tile] of Object.entries(state.tiles)) {
    const [tileX, tileY] = key.split(",").map(Number);
    const cellX = tileX * cellW;
    const cellY = tileY * cellH;
    const alpha = 0.4 + 0.2 * tile.durability;

    if (pendingRotateKey === key) {
      svg.appendChild(
        createSvgElement("rect", {
          x: cellX + 2,
          y: cellY + 2,
          width: cellW - 4,
          height: cellH - 4,
          fill: "rgba(255,170,0,0.12)",
          stroke: "#fa0",
          "stroke-width": 1.5,
        })
      );
    }

    if (tile.type === "mirrorSlash") {
      svg.appendChild(
        createSvgElement("line", {
          x1: cellX + 4,
          y1: cellY + cellH - 4,
          x2: cellX + cellW - 4,
          y2: cellY + 4,
          stroke: `rgba(100,200,255,${alpha})`,
          "stroke-width": 3,
          "stroke-linecap": "round",
        })
      );
    } else if (tile.type === "mirrorBackslash") {
      svg.appendChild(
        createSvgElement("line", {
          x1: cellX + 4,
          y1: cellY + 4,
          x2: cellX + cellW - 4,
          y2: cellY + cellH - 4,
          stroke: `rgba(100,200,255,${alpha})`,
          "stroke-width": 3,
          "stroke-linecap": "round",
        })
      );
    } else if (tile.type === "absorber") {
      svg.appendChild(
        createSvgElement("rect", {
          x: cellX + 6,
          y: cellY + 6,
          width: cellW - 12,
          height: cellH - 12,
          fill: `rgba(80,40,40,${alpha})`,
          stroke: "#844",
          "stroke-width": 2,
          rx: 4,
        })
      );
      svg.appendChild(
        createSvgText(
          {
            x: cellX + cellW / 2,
            y: cellY + cellH / 2 + 5,
            "text-anchor": "middle",
            "font-size": 18,
            fill: `rgba(200,100,100,${alpha})`,
          },
          TILE_GLYPHS.absorber
        )
      );
    } else {
      svg.appendChild(
        createSvgText(
          {
            x: cellX + cellW / 2,
            y: cellY + cellH / 2 + 7,
            "text-anchor": "middle",
            "font-size": 24,
            fill: `rgba(100,200,255,${alpha})`,
            "font-weight": "bold",
          },
          TILE_GLYPHS[tile.type]
        )
      );
    }

    for (let d = 0; d < tile.durability; d++) {
      svg.appendChild(
        createSvgElement("circle", {
          cx: cellX + 6 + d * 8,
          cy: cellY + cellH - 6,
          r: 3,
          fill: "#4af",
        })
      );
    }
  }

  if (state.pendingAction?.type === "place") {
    const { pos, tileType } = state.pendingAction;
    const cellX = pos.x * cellW;
    const cellY = pos.y * cellH;
    svg.appendChild(
      createSvgElement("rect", {
        x: cellX + 2,
        y: cellY + 2,
        width: cellW - 4,
        height: cellH - 4,
        fill: "rgba(68,170,255,0.12)",
        stroke: "#4af",
        "stroke-width": 1.5,
      })
    );
    svg.appendChild(
      createSvgText(
        {
          x: cellX + cellW / 2,
          y: cellY + cellH / 2 + 7,
          "text-anchor": "middle",
          "font-size": 24,
          fill: pendingPlaceKey ? "#9df" : "#4af",
        },
        TILE_GLYPHS[tileType]
      )
    );
  }

  const laserCenter = cellCenter(state.laser.pos.x, state.laser.pos.y, cellW, cellH);
  svg.appendChild(
    createSvgElement("polygon", {
      points: `${laserCenter.x},${laserCenter.y - 14} ${laserCenter.x - 10},${laserCenter.y + 10} ${laserCenter.x + 10},${laserCenter.y + 10}`,
      fill: "#f80",
      stroke: "#fa0",
      "stroke-width": 1.5,
    })
  );

  for (const enemy of state.enemies) {
    const center = cellCenter(enemy.pos.x, enemy.pos.y, cellW, cellH);
    const radius = Math.min(cellW, cellH) * 0.35;
    const appearance = ENEMY_APPEARANCE[enemy.type];
    svg.appendChild(
      createSvgElement("circle", {
        cx: center.x,
        cy: center.y,
        r: radius,
        fill: appearance.fill,
        stroke: appearance.stroke,
        "stroke-width": appearance.strokeWidth,
      })
    );

    if (enemy.hp > 1) {
      svg.appendChild(
        createSvgText(
          {
            x: center.x,
            y: center.y + 5,
            "text-anchor": "middle",
            "font-size": 13,
            fill: "#111",
            "font-weight": "bold",
          },
          String(enemy.hp)
        )
      );
    }

    if (enemy.type === "fast") {
      svg.appendChild(
        createSvgText(
          {
            x: center.x,
            y: center.y - radius - 2,
            "text-anchor": "middle",
            "font-size": 10,
            fill: "#8f8",
          },
          "»"
        )
      );
    }
  }

  const hud = formatHud(state);
  hudTurn.textContent = hud.turn;
  hudScore.textContent = highScore > 0 ? `${hud.score} / Best ${highScore}` : hud.score;
  hudKills.textContent = hud.kills;

  handCards.forEach((card, index) => {
    const tileType = state.hand[index];
    card.textContent = TILE_GLYPHS[tileType];
    card.title = TILE_NAMES[tileType];
    card.classList.toggle("selected", state.selectedHandIndex === index);
  });

  if (state.phase === "gameover") {
    gameoverOverlay.classList.add("show");
    gameoverScore.textContent = `Score: ${state.score}  Kills: ${state.killCount}`;
  } else {
    gameoverOverlay.classList.remove("show");
  }
}

handCards.forEach((card, index) => {
  card.addEventListener("click", () => dispatch({ type: "SELECT_HAND", index }));
});

svg.addEventListener("click", (event) => {
  if (state.phase === "gameover") return;
  const pos = eventToBoardPos(event, svg, state.width, state.height);
  if (pos) dispatch({ type: "TAP_CELL", pos });
});

btnUndo.addEventListener("click", () => dispatch({ type: "UNDO_ACTION" }));
btnFire.addEventListener("click", () => dispatch({ type: "COMMIT_TURN" }));
btnRestart.addEventListener("click", () => dispatch({ type: "RESTART" }));
window.addEventListener("resize", render);

render();
