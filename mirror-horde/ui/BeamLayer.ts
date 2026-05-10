import type { BeamSegment } from "../core/types";

export function segmentPoints(
  segment: BeamSegment,
  cellW: number,
  cellH: number
): { x1: number; y1: number; x2: number; y2: number } {
  return {
    x1: (segment.from.x + 0.5) * cellW,
    y1: (segment.from.y + 0.5) * cellH,
    x2: (segment.to.x + 0.5) * cellW,
    y2: (segment.to.y + 0.5) * cellH,
  };
}
