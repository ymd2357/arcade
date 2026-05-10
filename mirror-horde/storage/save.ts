const HIGH_SCORE_KEY = "mirror-horde-high-score";

export function loadHighScore(): number {
  const rawValue = window.localStorage.getItem(HIGH_SCORE_KEY);
  const parsed = rawValue === null ? 0 : Number(rawValue);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function saveHighScore(score: number): void {
  window.localStorage.setItem(HIGH_SCORE_KEY, String(Math.max(0, Math.floor(score))));
}
