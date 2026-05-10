export function cellCenter(x: number, y: number, cellW: number, cellH: number): { x: number; y: number } {
  return { x: (x + 0.5) * cellW, y: (y + 0.5) * cellH };
}
