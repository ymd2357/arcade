export type AppElements = {
  app: HTMLElement;
  enemies: HTMLElement;
  fxLayer: HTMLElement;
  line: HTMLElement;
  dropLeft: HTMLElement;
  dropRight: HTMLElement;
  placeCount: HTMLElement;
  placeCard: HTMLElement;
  placeLeft: HTMLElement;
  placeRight: HTMLElement;
  drawCount: HTMLElement;
  discardCount: HTMLElement;
  playerHp: HTMLElement;
  playerHpFill: HTMLElement;
  playerBlock: HTMLElement;
  playerBlockChip: HTMLElement;
  playerWeak: HTMLElement;
  playerWeakChip: HTMLElement;
  actProgress: HTMLElement;
  lineHint: HTMLElement;
  btnEnd: HTMLElement;
  btnRestart: HTMLElement;
  reward: HTMLElement;
  rewardCards: HTMLElement;
  rewardSkip: HTMLElement;
  phaseOverlay: HTMLElement;
  phaseTitle: HTMLElement;
  phaseText: HTMLElement;
  btnPhase: HTMLElement;
  title: HTMLElement;
  btnStart: HTMLElement;
  toast: HTMLElement;
};

export function readAppElements(): AppElements {
  const byId = (id: string) => document.getElementById(id)!;
  return {
    app: byId("app"),
    enemies: byId("enemies"),
    fxLayer: byId("fx-layer"),
    line: byId("line"),
    dropLeft: byId("drop-left"),
    dropRight: byId("drop-right"),
    placeCount: byId("place-count"),
    placeCard: byId("place-card"),
    placeLeft: byId("place-left"),
    placeRight: byId("place-right"),
    drawCount: byId("draw-count"),
    discardCount: byId("discard-count"),
    playerHp: byId("player-hp"),
    playerHpFill: byId("player-hp-fill"),
    playerBlock: byId("player-block"),
    playerBlockChip: byId("player-block-chip"),
    playerWeak: byId("player-weak"),
    playerWeakChip: byId("player-weak-chip"),
    actProgress: byId("act-progress"),
    lineHint: byId("line-hint"),
    btnEnd: byId("btn-end"),
    btnRestart: byId("btn-restart"),
    reward: byId("reward"),
    rewardCards: byId("reward-cards"),
    rewardSkip: byId("reward-skip"),
    phaseOverlay: byId("phase-overlay"),
    phaseTitle: byId("phase-title"),
    phaseText: byId("phase-text"),
    btnPhase: byId("btn-phase"),
    title: byId("title"),
    btnStart: byId("btn-start"),
    toast: byId("toast"),
  };
}
