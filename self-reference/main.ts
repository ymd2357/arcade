import type { Action, Card, Enemy, GameState } from "./core/types";
import { createInitialState, reducer } from "./core/combat";
import { FIGHTS } from "./content/enemies";
import { readAppElements } from "./ui/App";
import { loadBestFight, saveBestFight } from "./storage/save";

const el = readAppElements();
let state: GameState = createInitialState((Date.now() >>> 0) || 1);
let bestFight = loadBestFight();
let animating = false;

const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

function valLabel(card: Card): string {
  switch (card.kind) {
    case "strike":
    case "ward":
    case "ergo":
      return String(card.value);
    case "whet":
      return `+${card.value}`;
    case "surge":
      return "×2";
    case "echo":
      return "↺";
    case "tally":
      return `${card.value}×`;
  }
}

function describe(card: Card): string {
  switch (card.kind) {
    case "strike": return `Deal ${card.value}.`;
    case "ward": return `Gain ${card.value} Block.`;
    case "whet": return `Spent: cards on both sides gain +${card.value}.`;
    case "surge": return "Spent: the card to the right is doubled.";
    case "echo": return "Repeat the card to your left.";
    case "ergo": return `If the card to your left is an Attack, deal ${card.value} (else 3).`;
    case "tally": return `Deal ${card.value} for each other card in the line.`;
  }
}

function lcardHtml(card: Card, playable: boolean): string {
  return (
    `<div class="lcard" data-kind="${card.kind}" data-uid="${card.uid}" data-buffed="${card.buffed}" data-playable="${playable}" title="${card.name} — ${describe(card)}">` +
    `<div class="lcard-glyph">${card.glyph}</div>` +
    `<div class="lcard-name">${card.name}</div>` +
    `<div class="lcard-val">${valLabel(card)}</div>` +
    `</div>`
  );
}

function enemyHtml(e: Enemy): string {
  const pct = Math.max(0, Math.round((e.hp / e.maxHp) * 100));
  const block = e.block > 0 ? `<span class="enemy-block">&#9114;${e.block}</span>` : "";
  return (
    `<div class="enemy" data-id="${e.id}">` +
    `<div class="enemy-intent" data-kind="${e.intent.kind}">${e.intent.text}</div>` +
    `<div class="enemy-body"><span class="enemy-glyph">${e.glyph}</span></div>` +
    `<div class="enemy-name">${e.name}</div>` +
    `<div class="enemy-hpbar"><div class="enemy-hpfill" style="width:${pct}%"></div></div>` +
    `<div class="enemy-stats">HP ${e.hp}/${e.maxHp} ${block}</div>` +
    `</div>`
  );
}

function renderEnemies(): void {
  el.enemies.innerHTML = state.enemies.filter((e) => e.hp > 0).map(enemyHtml).join("");
}

function render(): void {
  el.app.dataset.phase = state.phase;
  renderEnemies();

  const playable = state.phase === "acting" && !state.playedThisTurn;
  el.line.innerHTML = state.line.length
    ? state.line.map((c) => lcardHtml(c, playable)).join("")
    : `<div id="line-empty">your spell line is empty</div>`;

  if (state.phase === "placing") {
    el.lineHint.innerHTML = "place the drawn card &#10092; left or right &#10093;";
  } else if (state.phase === "acting" && !state.playedThisTurn) {
    el.lineHint.innerHTML = "tap a card to cast it &mdash; <b>one per turn</b>";
  } else {
    el.lineHint.innerHTML = "card cast &mdash; end your turn";
  }

  if (state.phase === "placing" && state.pending.length > 0) {
    const card = state.pending[0];
    const placed = state.openingDraw - state.pending.length;
    el.placeCount.textContent =
      state.openingDraw > 1 ? `opening hand — place ${placed + 1} of ${state.openingDraw}` : "draw — place left or right";
    el.placeCard.innerHTML =
      `<div class="pc-glyph">${card.glyph}</div><div class="pc-name">${card.name}</div><div class="pc-blurb">${describe(card)}</div>`;
  }

  el.playerHp.textContent = `${state.player.hp}/${state.player.maxHp}`;
  el.playerHpFill.style.width = `${Math.max(0, (state.player.hp / state.player.maxHp) * 100)}%`;
  el.playerBlock.textContent = String(state.player.block);
  el.playerBlockChip.dataset.zero = String(state.player.block === 0);
  el.playerWeak.textContent = String(state.player.weak);
  el.playerWeakChip.dataset.zero = String(state.player.weak === 0);
  el.drawCount.textContent = String(state.draw.length);
  el.discardCount.textContent = String(state.discard.length);
  el.actProgress.textContent = `FIGHT ${Math.min(state.fightIndex + 1, FIGHTS.length)} / ${FIGHTS.length}`;

  if (state.phase === "reward") {
    el.rewardCards.innerHTML = state.rewardOptions.map((c) => lcardHtml(c, false)).join("");
    el.reward.classList.add("show");
  } else {
    el.reward.classList.remove("show");
  }

  if (state.phase === "defeat" || state.phase === "victory") {
    el.phaseOverlay.dataset.kind = state.phase;
    if (state.phase === "defeat") {
      el.phaseTitle.textContent = "UNWRITTEN";
      el.phaseText.textContent = "The page tears mid-sentence. This draft is lost — but ink is cheap.";
      el.btnPhase.textContent = "BEGIN ANEW";
    } else {
      el.phaseTitle.textContent = "AUTHORED";
      el.phaseText.textContent = "You out-wrote The Author with their own grammar. The margins are yours.";
      el.btnPhase.textContent = "WRITE AGAIN";
    }
    el.phaseOverlay.classList.add("show");
  } else {
    el.phaseOverlay.classList.remove("show");
  }
}

/* --------------------------- juice --------------------------- */

function spawnFloat(left: number, top: number, text: string, cls: string): void {
  const node = document.createElement("div");
  node.className = `dmg-float${cls ? " " + cls : ""}`;
  node.style.left = `${left}px`;
  node.style.top = `${top}px`;
  node.textContent = text;
  el.fxLayer.appendChild(node);
  window.setTimeout(() => node.remove(), 900);
}

function floatOverEl(target: Element, text: string, cls: string): void {
  const fx = el.fxLayer.getBoundingClientRect();
  const r = target.getBoundingClientRect();
  spawnFloat(r.left + r.width / 2 - fx.left - 14, r.top - fx.top + 4, text, cls);
}

function floatAtBottom(text: string, cls: string): void {
  const fx = el.fxLayer.getBoundingClientRect();
  spawnFloat(fx.width / 2 - 14, fx.height - 30, text, cls);
}

function playResolveFloats(): void {
  for (const step of state.resolveSteps) {
    if (step.kind === "damage") {
      const enEl = el.enemies.querySelector(`.enemy[data-id="${step.enemyId}"]`);
      if (enEl) {
        enEl.classList.add("hit");
        window.setTimeout(() => enEl.classList.remove("hit"), 360);
        floatOverEl(enEl, `-${step.amount}`, "");
      } else {
        floatAtBottom(`-${step.amount}`, "");
      }
    } else if (step.kind === "block") {
      floatAtBottom(`+${step.amount}`, "block");
    } else if (step.kind === "buff") {
      const cardEl = el.line.querySelector(`.lcard[data-uid="${step.uid}"]`);
      if (cardEl) floatOverEl(cardEl, step.note, "mod");
    }
  }
}

function playEnemyHits(): void {
  for (const hit of state.enemyHits) {
    if (hit.targetsPlayer && hit.amount > 0) floatAtBottom(`-${hit.amount}`, "");
  }
}

/* --------------------------- dispatch --------------------------- */

function persist(): void {
  const reached = state.phase === "victory" ? FIGHTS.length : state.fightIndex;
  if (reached > bestFight) {
    bestFight = reached;
    saveBestFight(bestFight);
  }
}

function dispatch(action: Action): void {
  if (animating) return;
  state = reducer(state, action);
  render();
  if (action.type === "END_TURN") playEnemyHits();
  persist();
}

async function runPlay(uid: string): Promise<void> {
  if (animating || state.phase !== "acting" || state.playedThisTurn) return;
  const cardEl = el.line.querySelector(`.lcard[data-uid="${uid}"]`);
  animating = true;
  if (cardEl) cardEl.classList.add("resolving");
  await sleep(220);
  state = reducer(state, { type: "PLAY", uid });
  render();
  playResolveFloats();
  animating = false;
  persist();
}

/* --------------------------- input --------------------------- */

el.placeLeft.addEventListener("click", () => dispatch({ type: "PLACE", side: "left" }));
el.dropLeft.addEventListener("click", () => dispatch({ type: "PLACE", side: "left" }));
el.placeRight.addEventListener("click", () => dispatch({ type: "PLACE", side: "right" }));
el.dropRight.addEventListener("click", () => dispatch({ type: "PLACE", side: "right" }));

el.line.addEventListener("click", (e) => {
  const cardEl = (e.target as HTMLElement).closest(".lcard") as HTMLElement | null;
  if (!cardEl || !cardEl.dataset.uid) return;
  const uid = cardEl.dataset.uid;
  if (state.phase === "acting" && !state.playedThisTurn) {
    void runPlay(uid);
    return;
  }
  const card = state.line.find((c) => c.uid === uid);
  if (card) {
    el.toast.textContent = `${card.name} — ${describe(card)}`;
    el.toast.classList.add("show");
    window.setTimeout(() => el.toast.classList.remove("show"), 1600);
  }
});

el.btnEnd.addEventListener("click", () => dispatch({ type: "END_TURN" }));
el.btnRestart.addEventListener("click", () => dispatch({ type: "RESTART" }));
el.btnPhase.addEventListener("click", () => dispatch({ type: "RESTART" }));

el.rewardCards.addEventListener("click", (e) => {
  const cardEl = (e.target as HTMLElement).closest(".lcard") as HTMLElement | null;
  if (!cardEl || !cardEl.dataset.uid) return;
  const index = state.rewardOptions.findIndex((c) => c.uid === cardEl.dataset.uid);
  if (index >= 0) dispatch({ type: "PICK_REWARD", index });
});
el.rewardSkip.addEventListener("click", () => dispatch({ type: "SKIP_REWARD" }));

window.addEventListener("keydown", (e) => {
  if (state.phase === "placing") {
    if (e.key === "ArrowLeft") { e.preventDefault(); dispatch({ type: "PLACE", side: "left" }); }
    else if (e.key === "ArrowRight") { e.preventDefault(); dispatch({ type: "PLACE", side: "right" }); }
  } else if (state.phase === "acting") {
    if (e.key === "Enter") { e.preventDefault(); dispatch({ type: "END_TURN" }); }
  }
});

el.btnStart.addEventListener("click", () => {
  el.title.classList.add("hide");
  window.setTimeout(() => { el.title.style.display = "none"; }, 540);
  dispatch({ type: "START", seed: (Date.now() >>> 0) || 1 });
});

render();
