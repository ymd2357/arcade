export function calcTurnScore(params: {
  killed: number;
  multiKill: boolean;
  highReflectKill: boolean;
}): number {
  let score = params.killed * 20;
  if (params.multiKill) score += 30;
  if (params.highReflectKill) score += 20;
  return score;
}
