import stage001 from './stage_001.json';
import stage002 from './stage_002.json';
import stage003 from './stage_003.json';
import stage004 from './stage_004.json';
import stage005 from './stage_005.json';
import stage006 from './stage_006.json';
import type { StageData } from '../engine/types';

export const stages: StageData[] = [
  stage001,
  stage002,
  stage003,
  stage004,
  stage005,
  stage006
] as StageData[];

export function getStage(index: number): StageData {
  return stages[index] ?? stages[0];
}
