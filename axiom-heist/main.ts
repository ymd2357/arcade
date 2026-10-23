import { LAW_CONTENT } from "./content/laws.ts";
import { ROOMS } from "./content/rooms.ts";
import { activeLaws, getVision, isDoorOpenWhenUnwatched } from "./core/laws.ts";
import { createInitialState, reducer } from "./core/reducer.ts";
import type { Action, Direction, GameState, Law, Phase, Pos } from "./core/types.ts";
import { samePos } from "./core/vision.ts";
import { loadBestRoom, saveBestRoom } from "./storage/save.ts";
import { readAppElements } from "./ui/App.ts";
import { cellCenter, eventToBoardPos } from "./ui/BoardView.ts";

const DIR_VEC: Record<Direction, Pos> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

let state: GameState = createInitialState(1);
let bestRoom = Math.max(loadBestRoom(), 1);
let prevThief: Pos = { ...state.thief };
let prevPhase: Phase = state.phase;

const el = readAppElements();

/* ----------------------------------------------------------------------- *
 * SVG defs: gradients, glow filters, prismatic strokes, CSS animations.
 * ----------------------------------------------------------------------- */
const DEFS = `
<defs>
  <linearGradient id="floorGrad" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#101a2c"/><stop offset="1" stop-color="#0a1018"/>
  </linearGradient>
  <linearGradient id="wallGrad" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#22344f"/><stop offset="0.5" stop-color="#152339"/><stop offset="1" stop-color="#0b1320"/>
  </linearGradient>
  <linearGradient id="metalGrad" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#46566f"/><stop offset="0.5" stop-color="#2b3850"/><stop offset="1" stop-color="#19222f"/>
  </linearGradient>
  <linearGradient id="prismStroke" x1="0" y1="1" x2="1" y2="0">
    <stop offset="0" stop-color="#ff5d8f"/><stop offset="0.3" stop-color="#ffc24d"/><stop offset="0.55" stop-color="#6ff7c9"/><stop offset="0.8" stop-color="#5fe6ff"/><stop offset="1" stop-color="#b18bff"/>
  </linearGradient>
  <radialGradient id="litGlow"><stop offset="0" stop-color="#ffd982" stop-opacity="0.55"/><stop offset="1" stop-color="#ffd982" stop-opacity="0"/></radialGradient>
  <radialGradient id="watchGlow"><stop offset="0" stop-color="#ff4d6d" stop-opacity="0.5"/><stop offset="1" stop-color="#ff4d6d" stop-opacity="0"/></radialGradient>
  <radialGradient id="lightBloom"><stop offset="0" stop-color="#fff5cf" stop-opacity="0.9"/><stop offset="0.4" stop-color="#ffce6a" stop-opacity="0.5"/><stop offset="1" stop-color="#ffce6a" stop-opacity="0"/></radialGradient>
  <radialGradient id="goldGem"><stop offset="0" stop-color="#fff4cf"/><stop offset="0.45" stop-color="#ffc24d"/><stop offset="1" stop-color="#c9781d"/></radialGradient>
  <radialGradient id="cyanCore"><stop offset="0" stop-color="#eafdff"/><stop offset="0.5" stop-color="#5fe6ff"/><stop offset="1" stop-color="#1d7d96"/></radialGradient>
  <radialGradient id="roseCore"><stop offset="0" stop-color="#ffe3e8"/><stop offset="0.5" stop-color="#ff4d6d"/><stop offset="1" stop-color="#9b142e"/></radialGradient>
  <radialGradient id="thiefAura"><stop offset="0" stop-color="#5fe6ff" stop-opacity="0.7"/><stop offset="1" stop-color="#5fe6ff" stop-opacity="0"/></radialGradient>
  <radialGradient id="lootAura"><stop offset="0" stop-color="#ffc24d" stop-opacity="0.8"/><stop offset="1" stop-color="#ffc24d" stop-opacity="0"/></radialGradient>
  <filter id="glowS" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="1.6"/></filter>
  <filter id="glowM" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="3.4"/></filter>
  <filter id="glowL" x="-120%" y="-120%" width="340%" height="340%"><feGaussianBlur stdDeviation="6.5"/></filter>
  <style>
    .pulse { animation: pulse 2.6s ease-in-out infinite; }
    @keyframes pulse { 0%,100% { opacity: 0.45; } 50% { opacity: 0.9; } }
    .spin { animation: spin 9s linear infinite; transform-box: fill-box; transform-origin: center; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .breathe { animation: breathe 3s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
    @keyframes breathe { 0%,100% { transform: scale(1); } 50% { transform: scale(1.12); } }
  </style>
</defs>`;

function attrs(map: Record<string, string | number>): string {
  return Object.entries(map)
    .map(([k, v]) => `${k}="${v}"`)
    .join(" ");
}
function tag(name: string, map: Record<string, string | number>, inner = ""): string {
  return `<${name} ${attrs(map)}>${inner}</${name}>`;
}
function self(name: string, map: Record<string, string | number>): string {
  return `<${name} ${attrs(map)}/>`;
}

/* ----------------------------------------------------------------------- */

function showToast(text: string): void {
  el.toast.textContent = text;
  el.toast.classList.add("show");
  window.setTimeout(() => el.toast.classList.remove("show"), 1800);
}

function dispatch(action: Action): void {
  prevThief = { ...state.thief };
  prevPhase = state.phase;
  state = reducer(state, action);

  if (state.phase === "caught" && prevPhase !== "caught") {
    el.app.classList.remove("flash-caught");
    void el.app.offsetWidth; // restart animation
    el.app.classList.add("flash-caught");
    window.setTimeout(() => el.app.classList.remove("flash-caught"), 600);
  }

  const reached = state.phase === "won" ? ROOMS.length : state.roomIndex + 1;
  if (reached > bestRoom) {
    bestRoom = reached;
    saveBestRoom(bestRoom);
  }
  render();
}

function renderBoard(): void {
  const container = el.svg.parentElement as HTMLElement;
  const W = container.clientWidth;
  const H = container.clientHeight;
  const cw = W / state.width;
  const ch = H / state.height;
  const u = Math.min(cw, ch);
  const active = activeLaws(state.room, state.carriedLaws);
  const vision = getVision(state.room, state.cells, state.carriedLaws, state.guards);

  el.svg.setAttribute("viewBox", `0 0 ${W} ${H}`);

  const base: string[] = [];
  const light: string[] = [];
  const content: string[] = [];

  for (let y = 0; y < state.height; y++) {
    for (let x = 0; x < state.width; x++) {
      const cell = state.cells[y][x];
      const X = x * cw;
      const Y = y * ch;
      const cx = X + cw / 2;
      const cy = Y + ch / 2;
      const key = `${x},${y}`;
      const pad = Math.min(cw, ch) * 0.06;

      if (cell === "wall") {
        base.push(self("rect", { x: X + 1, y: Y + 1, width: cw - 2, height: ch - 2, rx: 3, fill: "url(#wallGrad)" }));
        base.push(self("line", { x1: X + 3, y1: Y + 2.5, x2: X + cw - 3, y2: Y + 2.5, stroke: "rgba(150,190,240,0.28)", "stroke-width": 1 }));
      } else {
        const isExit = cell === "exit";
        base.push(self("rect", {
          x: X + 1, y: Y + 1, width: cw - 2, height: ch - 2, rx: 3,
          fill: isExit ? "rgba(95,230,255,0.05)" : "url(#floorGrad)",
          stroke: "rgba(122,162,214,0.10)", "stroke-width": 1,
        }));
        if (cell === "floor") {
          base.push(self("circle", { cx, cy, r: 1, fill: "rgba(130,170,220,0.16)" }));
        }
      }

      // lit pools
      if (vision.lit.has(key)) {
        light.push(self("rect", { x: X, y: Y, width: cw, height: ch, fill: "url(#litGlow)", filter: "url(#glowS)" }));
      }
      // guard sight (danger) pools
      if (vision.watched.has(key)) {
        light.push(self("rect", { x: X, y: Y, width: cw, height: ch, fill: "url(#watchGlow)", filter: "url(#glowS)" }));
      }

      // ---- cell content ----
      if (cell === "lightSource") {
        content.push(self("circle", { cx, cy, r: u * 0.62, fill: "url(#lightBloom)", filter: "url(#glowL)" }));
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          content.push(self("line", { x1: cx + dx * u * 0.18, y1: cy + dy * u * 0.18, x2: cx + dx * u * 0.34, y2: cy + dy * u * 0.34, stroke: "#ffe7a0", "stroke-width": 2, "stroke-linecap": "round" }));
        }
        content.push(self("circle", { cx, cy, r: u * 0.15, fill: "#fff3c8" }));
      } else if (cell === "mirror") {
        const m = u * 0.32;
        content.push(self("line", { x1: cx - m, y1: cy + m, x2: cx + m, y2: cy - m, stroke: "url(#prismStroke)", "stroke-width": u * 0.17, "stroke-linecap": "round", filter: "url(#glowS)" }));
        content.push(self("line", { x1: cx - m, y1: cy + m, x2: cx + m, y2: cy - m, stroke: "rgba(255,255,255,0.7)", "stroke-width": 1.4, "stroke-linecap": "round" }));
      } else if (cell === "metal") {
        content.push(self("rect", { x: X + pad, y: Y + pad, width: cw - pad * 2, height: ch - pad * 2, rx: 3, fill: "url(#metalGrad)", stroke: "rgba(170,195,230,0.35)", "stroke-width": 1 }));
        content.push(self("line", { x1: X + pad + 2, y1: Y + pad + 2.5, x2: X + cw - pad - 2, y2: Y + pad + 2.5, stroke: "rgba(200,220,250,0.4)", "stroke-width": 1 }));
        content.push(self("line", { x1: cx - 3, y1: Y + pad + 4, x2: cx - 3, y2: Y + ch - pad - 4, stroke: "rgba(0,0,0,0.25)", "stroke-width": 1 }));
        content.push(self("line", { x1: cx + 3, y1: Y + pad + 4, x2: cx + 3, y2: Y + ch - pad - 4, stroke: "rgba(0,0,0,0.25)", "stroke-width": 1 }));
      } else if (cell === "door") {
        const open = isDoorOpenWhenUnwatched({ x, y }, active, vision.watched);
        if (open) {
          content.push(self("rect", { x: X + pad, y: Y + pad, width: cw - pad * 2, height: ch - pad * 2, rx: 4, fill: "rgba(95,230,255,0.07)", stroke: "#5fe6ff", "stroke-width": 1.4, "stroke-dasharray": "5 4", filter: "url(#glowS)" }));
        } else {
          content.push(self("rect", { x: X + pad, y: Y + pad, width: cw - pad * 2, height: ch - pad * 2, rx: 4, fill: "rgba(255,77,109,0.13)", stroke: "rgba(255,77,109,0.8)", "stroke-width": 1.4 }));
          content.push(self("line", { x1: cx - u * 0.13, y1: Y + pad + 3, x2: cx - u * 0.13, y2: Y + ch - pad - 3, stroke: "rgba(255,155,172,0.85)", "stroke-width": 2 }));
          content.push(self("line", { x1: cx + u * 0.13, y1: Y + pad + 3, x2: cx + u * 0.13, y2: Y + ch - pad - 3, stroke: "rgba(255,155,172,0.85)", "stroke-width": 2 }));
        }
      } else if (cell === "exit") {
        content.push(self("rect", { x: X + pad, y: Y + pad, width: cw - pad * 2, height: ch - pad * 2, rx: 6, fill: "rgba(95,230,255,0.04)", stroke: "rgba(95,230,255,0.25)", "stroke-width": 1, filter: "url(#glowS)" }));
        content.push(`<rect x="${X + pad}" y="${Y + pad}" width="${cw - pad * 2}" height="${ch - pad * 2}" rx="6" fill="none" stroke="#5fe6ff" stroke-width="1.6" stroke-dasharray="6 5" opacity="0.9" filter="url(#glowS)"><animate attributeName="stroke-dashoffset" from="0" to="22" dur="1.1s" repeatCount="indefinite"/></rect>`);
        content.push(tag("text", { x: cx, y: cy + u * 0.13, "text-anchor": "middle", "font-size": u * 0.34, fill: "#aef3ff", "font-family": "monospace" }, "&#8593;"));
      } else if (cell === "artifact" && !state.hasArtifact) {
        content.push(self("circle", { cx, cy, r: u * 0.5, fill: "url(#lootAura)", filter: "url(#glowM)", class: "pulse" }));
        const g = u * 0.26;
        content.push(`<g class="breathe"><polygon points="${cx},${cy - g} ${cx + g * 0.78},${cy} ${cx},${cy + g} ${cx - g * 0.78},${cy}" fill="url(#goldGem)" stroke="#ffe6b0" stroke-width="1.2"/><line x1="${cx}" y1="${cy - g}" x2="${cx}" y2="${cy + g}" stroke="rgba(255,255,255,0.5)" stroke-width="0.8"/></g>`);
        content.push(self("line", { x1: cx - g * 1.5, y1: cy, x2: cx + g * 1.5, y2: cy, stroke: "rgba(255,240,200,0.35)", "stroke-width": 0.7 }));
      }
    }
  }

  // ---- guards ----
  const guards: string[] = [];
  for (const guard of state.guards) {
    const c = cellCenter(guard.pos.x, guard.pos.y, cw, ch);
    const v = DIR_VEC[guard.facing];
    guards.push(self("circle", { cx: c.x, cy: c.y, r: u * 0.36, fill: "none", stroke: "rgba(255,77,109,0.45)", "stroke-width": 1.4, filter: "url(#glowM)" }));
    guards.push(self("circle", { cx: c.x, cy: c.y, r: u * 0.22, fill: "url(#roseCore)", stroke: "rgba(255,200,210,0.6)", "stroke-width": 1 }));
    // directional lens (the eye looks where it watches)
    guards.push(self("circle", { cx: c.x + v.x * u * 0.16, cy: c.y + v.y * u * 0.16, r: u * 0.07, fill: "#fff0f2" }));
  }

  // ---- thief ----
  const t = cellCenter(state.thief.x, state.thief.y, cw, ch);
  const pc = cellCenter(prevThief.x, prevThief.y, cw, ch);
  const dx = pc.x - t.x;
  const dy = pc.y - t.y;
  const slide = (dx !== 0 || dy !== 0)
    ? `<animateTransform attributeName="transform" type="translate" additive="sum" from="${dx} ${dy}" to="0 0" dur="0.14s" fill="freeze" calcMode="spline" keySplines="0.2 0.8 0.2 1" keyTimes="0;1" values="${dx} ${dy};0 0"/>`
    : "";

  let thiefBody: string;
  if (state.hasArtifact) {
    const g = u * 0.27;
    thiefBody =
      self("circle", { cx: 0, cy: 0, r: u * 0.46, fill: "url(#lootAura)", filter: "url(#glowL)", class: "pulse" }) +
      `<polygon points="0,${-g} ${g * 0.8},0 0,${g} ${-g * 0.8},0" fill="url(#goldGem)" stroke="#fff3d6" stroke-width="1.4"/>`;
  } else {
    const r = u * 0.26;
    thiefBody =
      self("circle", { cx: 0, cy: 0, r: u * 0.44, fill: "url(#thiefAura)", filter: "url(#glowL)", class: "pulse" }) +
      `<path d="M0,${-r} L${r * 0.82},0 L0,${r} L${-r * 0.82},0 Z" fill="url(#cyanCore)" stroke="#ffffff" stroke-width="1.3"/>` +
      self("circle", { cx: 0, cy: 0, r: u * 0.07, fill: "#eafdff" });
  }
  const thief = `<g transform="translate(${t.x} ${t.y})">${slide}${thiefBody}</g>`;

  el.svg.innerHTML = DEFS + base.join("") + light.join("") + content.join("") + guards.join("") + thief;
  prevThief = { ...state.thief };
}

function lawTone(law: Law): "room" | "carried" {
  return state.carriedLaws.some((c) => c.id === law.id) ? "carried" : "room";
}

function renderActiveLaws(): void {
  const laws = activeLaws(state.room, state.carriedLaws);
  el.activeLaws.innerHTML = "";
  for (const law of laws) {
    const content = LAW_CONTENT[law.id];
    const button = document.createElement("button");
    button.type = "button";
    button.className = `law-chip ${lawTone(law)}`;
    button.innerHTML = `<span class="g">${content.glyph}</span>${content.name}`;
    button.addEventListener("click", () => showToast(content.description));
    el.activeLaws.appendChild(button);
  }
}

function renderStealCards(): void {
  el.stealCards.innerHTML = "";
  for (const law of state.room.laws) {
    const content = LAW_CONTENT[law.id];
    const owned = state.carriedLaws.some((c) => c.id === law.id);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "steal-card";
    button.disabled = owned;
    button.innerHTML = `<span class="g">${content.glyph}</span><strong>${content.name}</strong><small>${owned ? "Already carried" : content.description}</small>`;
    button.addEventListener("click", () => dispatch({ type: "STEAL", lawId: law.id }));
    el.stealCards.appendChild(button);
  }
}

function updateOverlays(): void {
  const showPhase = state.phase === "caught" || state.phase === "won";
  el.phaseOverlay.classList.toggle("show", showPhase);
  el.stealPanel.classList.toggle("show", state.phase === "cleared");

  if (state.phase === "caught") {
    el.phaseOverlay.dataset.kind = "caught";
    el.phaseTitle.textContent = "CAUGHT";
    el.phaseText.textContent = "A guard's sightline crossed the thief. The run collapses.";
    el.btnPhase.textContent = "RETRY";
  } else if (state.phase === "won") {
    el.phaseOverlay.dataset.kind = "won";
    el.phaseTitle.textContent = "CLEAN GETAWAY";
    el.phaseText.textContent = "Every vault breached, every law stolen. The contradiction held.";
    el.btnPhase.textContent = "RUN AGAIN";
  }
}

function render(): void {
  renderBoard();
  renderActiveLaws();
  renderStealCards();
  updateOverlays();

  el.hudRoom.innerHTML = `<span class="rno">R${state.roomIndex + 1}</span>${state.room.name}`;
  el.hudTurn.textContent = String(state.turn);
  el.hudLaws.textContent = String(state.carriedLaws.length);
  el.hudBest.textContent = `BEST · R${bestRoom}`;
  el.btnUndo.toggleAttribute("disabled", state.history.length === 0);
}

function dirFromDelta(from: Pos, to: Pos): Direction | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx === 1 && dy === 0) return "right";
  if (dx === -1 && dy === 0) return "left";
  if (dx === 0 && dy === 1) return "down";
  if (dx === 0 && dy === -1) return "up";
  return null;
}

el.svg.addEventListener("click", (event) => {
  if (state.phase !== "planning") return;
  const pos = eventToBoardPos(event, el.svg, state.width, state.height);
  if (!pos || samePos(pos, state.thief)) return;
  const dir = dirFromDelta(state.thief, pos);
  if (dir) dispatch({ type: "MOVE", dir });
});

window.addEventListener("keydown", (event) => {
  const keyToDir: Record<string, Direction | undefined> = {
    ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
    w: "up", s: "down", a: "left", d: "right",
  };
  const dir = keyToDir[event.key];
  if (dir && state.phase === "planning") {
    event.preventDefault();
    dispatch({ type: "MOVE", dir });
  } else if (event.key === " " && state.phase === "planning") {
    event.preventDefault();
    dispatch({ type: "WAIT" });
  }
});

el.btnWait.addEventListener("click", () => dispatch({ type: "WAIT" }));
el.btnUndo.addEventListener("click", () => dispatch({ type: "UNDO" }));
el.btnRestart.addEventListener("click", () => dispatch({ type: "RESTART" }));
el.btnPhase.addEventListener("click", () => dispatch({ type: "RESTART" }));
el.btnStart.addEventListener("click", () => {
  el.title.classList.add("hide");
  window.setTimeout(() => { el.title.style.display = "none"; }, 520);
});
window.addEventListener("resize", render);

render();
