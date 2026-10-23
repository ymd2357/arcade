export type AppElements = {
  app: HTMLElement;
  svg: SVGSVGElement;
  hudRoom: HTMLElement;
  hudTurn: HTMLElement;
  hudLaws: HTMLElement;
  hudBest: HTMLElement;
  activeLaws: HTMLElement;
  btnWait: HTMLElement;
  btnUndo: HTMLElement;
  btnRestart: HTMLElement;
  phaseOverlay: HTMLElement;
  phaseTitle: HTMLElement;
  phaseText: HTMLElement;
  btnPhase: HTMLElement;
  stealPanel: HTMLElement;
  stealCards: HTMLElement;
  toast: HTMLElement;
  title: HTMLElement;
  btnStart: HTMLElement;
};

export function readAppElements(): AppElements {
  return {
    app: document.getElementById("app")!,
    svg: document.getElementById("board-svg") as unknown as SVGSVGElement,
    hudRoom: document.getElementById("hud-room")!,
    hudTurn: document.querySelector("#hud-turn .v")!,
    hudLaws: document.querySelector("#hud-laws .v")!,
    hudBest: document.getElementById("hud-best")!,
    activeLaws: document.getElementById("active-laws")!,
    btnWait: document.getElementById("btn-wait")!,
    btnUndo: document.getElementById("btn-undo")!,
    btnRestart: document.getElementById("btn-restart")!,
    phaseOverlay: document.getElementById("phase-overlay")!,
    phaseTitle: document.getElementById("phase-title")!,
    phaseText: document.getElementById("phase-text")!,
    btnPhase: document.getElementById("btn-phase")!,
    stealPanel: document.getElementById("steal-panel")!,
    stealCards: document.getElementById("steal-cards")!,
    toast: document.getElementById("toast")!,
    title: document.getElementById("title")!,
    btnStart: document.getElementById("btn-start")!,
  };
}
