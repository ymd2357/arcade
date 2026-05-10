const key = 'mujun-progress';

export type Progress = {
  clearedStageIds: string[];
};

export function loadProgress(): Progress {
  const fallback: Progress = { clearedStageIds: [] };

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

export function saveClearedStage(stageId: string): void {
  const progress = loadProgress();
  if (progress.clearedStageIds.includes(stageId)) return;

  window.localStorage.setItem(key, JSON.stringify({
    clearedStageIds: [...progress.clearedStageIds, stageId]
  }));
}
