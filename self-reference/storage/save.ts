const KEY = "self-reference:best-fight";

export function loadBestFight(): number {
  try {
    const raw = window.localStorage.getItem(KEY);
    const value = raw ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

export function saveBestFight(fight: number): void {
  try {
    window.localStorage.setItem(KEY, String(fight));
  } catch {
    /* ignore */
  }
}
