export class RNG {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed >>> 0 || 1;
  }

  next(): number {
    this.seed ^= this.seed << 13;
    this.seed ^= this.seed >> 17;
    this.seed ^= this.seed << 5;
    return (this.seed >>> 0) / 0xffffffff;
  }

  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick<T>(arr: T[]): T {
    return arr[this.int(0, arr.length - 1)];
  }

  snapshot(): number {
    return this.seed >>> 0 || 1;
  }
}

export function shuffle<T>(items: T[], seed: number): { items: T[]; seed: number } {
  const rng = new RNG(seed);
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return { items: result, seed: rng.snapshot() };
}
