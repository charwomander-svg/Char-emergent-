import type { ProgressData } from "./progress";

export const ACHIEVEMENT_IDS = {
  flippingTheScript: "",
  oneAndDone: "",
  bonus: "",
  gottaGoFast: "",
  topTen: "",
  friends: "",
  freeHugs: "",
  twentyFiveToLife: "",
  halfwayThere: "",
  rememberMeForCenturies: "",
  classicConcentration: "",
  kingOfSpeed: "",
  pelletSchmellet: "",
  chardcore: "",
  shhhItsASecret: "",
  closeCall: "",
} as const;

type AchievementKey = keyof typeof ACHIEVEMENT_IDS;

export async function queueAchievementUnlock(_key: AchievementKey): Promise<void> {}

export async function syncPlayGames(): Promise<void> {}

export async function recordClassicLevelBest(_level: number, _score: number): Promise<void> {}

export async function recordSpeedrunLevelBest(_level: number, _runMs: number): Promise<void> {}

export async function submitHardcoreRun(_level: number): Promise<boolean> {
  return false;
}

export async function submitEndlessRun(_level: number): Promise<boolean> {
  return false;
}

export async function submitTimeAttackRun(_score: number): Promise<boolean> {
  return false;
}

export async function submitMostCatchesLifetime(_totalCatches: number): Promise<boolean> {
  return false;
}

export async function submitTotalGoldStarsLifetime(_totalGoldStars: number): Promise<boolean> {
  return false;
}

export async function syncProgressAchievements(_progress: ProgressData): Promise<void> {}
