import { storage } from "@/src/utils/storage";

const KEY = "ghostMaze.statistics.v1";

export interface StatisticsData {
  runsStarted: number;
  runsFinished: number;
  levelsCleared: number;
  bonusClears: number;
  totalPlaytimeMs: number;
  totalCatches: number;
  totalGhostLosses: number;
  totalPowerUpsUsed: number;
  totalMinesTriggered: number;
  totalEndlessContinues: number;
  totalHardcoreRevives: number;
  totalScoreEarned: number;
  highestCombo: number;
  bestLevelClearMs: number;
}

export const DEFAULT_STATISTICS: StatisticsData = {
  runsStarted: 0,
  runsFinished: 0,
  levelsCleared: 0,
  bonusClears: 0,
  totalPlaytimeMs: 0,
  totalCatches: 0,
  totalGhostLosses: 0,
  totalPowerUpsUsed: 0,
  totalMinesTriggered: 0,
  totalEndlessContinues: 0,
  totalHardcoreRevives: 0,
  totalScoreEarned: 0,
  highestCombo: 0,
  bestLevelClearMs: 0,
};

export async function loadStatistics(): Promise<StatisticsData> {
  try {
    const raw = await storage.getItem(KEY, "");
    if (!raw) return { ...DEFAULT_STATISTICS };
    return { ...DEFAULT_STATISTICS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_STATISTICS };
  }
}

export async function saveStatistics(stats: StatisticsData): Promise<void> {
  try {
    await storage.setItem(KEY, JSON.stringify(stats));
  } catch {
    // ignore persistence failures
  }
}

export async function updateStatistics(
  mutate: (current: StatisticsData) => StatisticsData,
): Promise<StatisticsData> {
  const current = await loadStatistics();
  const next = mutate(current);
  await saveStatistics(next);
  return next;
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}
