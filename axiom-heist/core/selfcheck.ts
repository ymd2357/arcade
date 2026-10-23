import { ROOMS } from "../content/rooms.ts";
import { isSolvable } from "./solver.ts";
import type { Law } from "./types.ts";

export const SOLVABLE_ROOMS = ROOMS.map((room, index) => {
  const carriedLaws: Law[] = ROOMS.slice(0, index).map((previousRoom) => previousRoom.laws[0]);
  return { roomId: room.id, solvable: isSolvable(room, carriedLaws) };
});

if (SOLVABLE_ROOMS.some((entry) => !entry.solvable)) {
  throw new Error(`Axiom Heist selfcheck failed: ${SOLVABLE_ROOMS.map((entry) => `${entry.roomId}=${entry.solvable}`).join(", ")}`);
}
