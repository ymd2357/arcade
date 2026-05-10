export type AppElements = {
  svg: SVGSVGElement;
  hudTurn: HTMLElement;
  hudScore: HTMLElement;
  hudKills: HTMLElement;
  btnUndo: HTMLElement;
  btnFire: HTMLElement;
  gameoverOverlay: HTMLElement;
  gameoverScore: HTMLElement;
  btnRestart: HTMLElement;
  handCards: HTMLElement[];
};

export function readAppElements(): AppElements {
  return {
    svg: document.getElementById("board-svg") as unknown as SVGSVGElement,
    hudTurn: document.getElementById("hud-turn")!,
    hudScore: document.getElementById("hud-score")!,
    hudKills: document.getElementById("hud-kills")!,
    btnUndo: document.getElementById("btn-undo")!,
    btnFire: document.getElementById("btn-fire")!,
    gameoverOverlay: document.getElementById("gameover-overlay")!,
    gameoverScore: document.getElementById("gameover-score")!,
    btnRestart: document.getElementById("btn-restart")!,
    handCards: Array.from(document.querySelectorAll<HTMLElement>(".hand-card")),
  };
}
