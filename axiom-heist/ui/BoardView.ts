import type { Pos } from "../core/types.ts";

export function cellCenter(x: number, y: number, cellW: number, cellH: number): { x: number; y: number } {
  return { x: (x + 0.5) * cellW, y: (y + 0.5) * cellH };
}

export function eventToBoardPos(event: MouseEvent, svg: SVGSVGElement, width: number, height: number): Pos | null {
  const rect = svg.getBoundingClientRect();
  const cellW = rect.width / width;
  const cellH = rect.height / height;
  const x = Math.floor((event.clientX - rect.left) / cellW);
  const y = Math.floor((event.clientY - rect.top) / cellH);
  if (x < 0 || x >= width || y < 0 || y >= height) return null;
  return { x, y };
}
