const BEST_ROOM_KEY = "axiom-heist-best-room";

export function loadBestRoom(): number {
  const rawValue = window.localStorage.getItem(BEST_ROOM_KEY);
  const parsed = rawValue === null ? 0 : Number(rawValue);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
}

export function saveBestRoom(roomNumber: number): void {
  window.localStorage.setItem(BEST_ROOM_KEY, String(Math.max(0, Math.floor(roomNumber))));
}
