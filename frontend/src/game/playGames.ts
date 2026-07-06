import { Platform, NativeModules } from "react-native";

import { MAX_LEVELS } from "./constants";
import type { ProgressData, Theme } from "./progress";
import { storage } from "@/src/utils/storage";

const CLASSIC_AGGREGATE_LEADERBOARD_ID = "CgkI9JL9xpkeEAIQAQ0";
const SPEEDRUN_AGGREGATE_LEADERBOARD_ID = "CgkI9JL9xpkeEAIQAg";
const KEY = "ghostMaze.playGames.v1";

export const ACHIEVEMENT_IDS = {
  flippingTheScript: "CgkI9JL9xpkeEAIQAw",
  oneAndDone: "CgkI9JL9xpkeEAIQBA",
  bonus: "CgkI9JL9xpkeEAIQBg",
  gottaGoFast: "CgkI9JL9xpkeEAIQBQ",
  topTen: "CgkI9JL9xpkeEAIQBw",
  friends: "CgkI9JL9xpkeEAIQCA",
  freeHugs: "CgkI9JL9xpkeEAIQCQ",
  twentyFiveToLife: "CgkI9JL9xpkeEAIQCg",
  halfwayThere: "CgkI9JL9xpkeEAIQCw",
  rememberMeForCenturies: "CgkI9JL9xpkeEAIQDA",
  classicConcentration: "CgkI9JL9xpkeEAIQDQ",
  kingOfSpeed: "CgkI9JL9xpkeEAIQDg",
  pelletSchmellet: "CgkI9JL9xpkeEAIQDw",
  chardcore: "CgkI9JL9xpkeEAIQEA",
  shhhItsASecret: "CgkI9JL9xpkeEAIQEQ",
  closeCall: "CgkI9JL9xpkeEAIQEg",
} as const;

// Current gameplay-to-achievement mapping:
// - Flipping the script: first successful catch
// - One and Done!: clear level 1
// - BONUS!: fully clear a bonus stage before time expires
// - Gotta Go Fast!: finish a speedrun run
// - Top ten / We're halfway there: reach levels 10 / 25
// - Friends!: arm all four ghosts at once
// - Free hugs: land a chained combo catch
// - 25 to Life / Remember me for centuries: reach 25 / 100 total catches
// - Classic Concentration / The King of Speed: fill all 50 aggregate bests and submit
// - Pellet, Schmelle: clear a level with very few pellets left
// - Chardcore: view the credits
// - Shhh. It's a secret: reveal a hidden theme or secret credits unlock
// - Close Call: clear a level while on your last life

type AchievementKey = keyof typeof ACHIEVEMENT_IDS;

interface PlayGamesModuleShape {
  isConfigured?: () => Promise<boolean>;
  signIn?: () => Promise<boolean>;
  unlockAchievement?: (achievementId: string) => Promise<boolean>;
  submitLeaderboardScore?: (leaderboardId: string, score: number) => Promise<boolean>;
}

interface PlayGamesData {
  unlockedAchievements: AchievementKey[];
  classicBestScoresByLevel: Record<string, number>;
  speedrunBestMsByLevel: Record<string, number>;
  classicAggregateSubmitted: boolean;
  speedrunAggregateSubmitted: boolean;
}

const DEFAULT_DATA: PlayGamesData = {
  unlockedAchievements: [],
  classicBestScoresByLevel: {},
  speedrunBestMsByLevel: {},
  classicAggregateSubmitted: false,
  speedrunAggregateSubmitted: false,
};

function getNativeModule(): PlayGamesModuleShape | null {
  if (Platform.OS !== "android") return null;
  return NativeModules.GhostMazePlayGames ?? null;
}

async function loadPlayGamesData(): Promise<PlayGamesData> {
  try {
    const raw = await storage.getItem(KEY, "");
    if (!raw) return { ...DEFAULT_DATA };
    return { ...DEFAULT_DATA, ...JSON.parse(raw as string) };
  } catch {
    return { ...DEFAULT_DATA };
  }
}

async function savePlayGamesData(data: PlayGamesData): Promise<void> {
  try {
    await storage.setItem(KEY, JSON.stringify(data));
  } catch {}
}

async function isConfigured(): Promise<boolean> {
  const native = getNativeModule();
  if (!native?.isConfigured) return false;
  try {
    return !!(await native.isConfigured());
  } catch {
    return false;
  }
}

async function ensureSignedIn(): Promise<boolean> {
  const native = getNativeModule();
  if (!native?.signIn) return false;
  if (!(await isConfigured())) return false;
  try {
    return !!(await native.signIn());
  } catch {
    return false;
  }
}

async function unlockAchievementNow(key: AchievementKey): Promise<boolean> {
  const native = getNativeModule();
  if (!native?.unlockAchievement) return false;
  try {
    return !!(await native.unlockAchievement(ACHIEVEMENT_IDS[key]));
  } catch {
    return false;
  }
}

async function submitLeaderboardNow(leaderboardId: string, score: number): Promise<boolean> {
  const native = getNativeModule();
  if (!native?.submitLeaderboardScore) return false;
  try {
    return !!(await native.submitLeaderboardScore(leaderboardId, score));
  } catch {
    return false;
  }
}

function sumMapValues(values: Record<string, number>): number {
  return Object.values(values).reduce((sum, value) => sum + value, 0);
}

function hasAllLevels(values: Record<string, number>): boolean {
  for (let level = 1; level <= MAX_LEVELS; level += 1) {
    if (!values[String(level)] || values[String(level)] <= 0) return false;
  }
  return true;
}

async function syncUnlockedAchievements(data: PlayGamesData): Promise<PlayGamesData> {
  if (!(await ensureSignedIn())) return data;

  const remaining: AchievementKey[] = [];
  for (const key of data.unlockedAchievements) {
    const unlocked = await unlockAchievementNow(key);
    if (!unlocked) remaining.push(key);
  }

  let next = { ...data, unlockedAchievements: remaining };

  if (!next.classicAggregateSubmitted && hasAllLevels(next.classicBestScoresByLevel)) {
    const submitted = await submitLeaderboardNow(
      CLASSIC_AGGREGATE_LEADERBOARD_ID,
      sumMapValues(next.classicBestScoresByLevel),
    );
    if (submitted) {
      next = {
        ...next,
        classicAggregateSubmitted: true,
        unlockedAchievements: next.unlockedAchievements.includes("classicConcentration")
          ? next.unlockedAchievements
          : [...next.unlockedAchievements, "classicConcentration"],
      };
    }
  }

  if (!next.speedrunAggregateSubmitted && hasAllLevels(next.speedrunBestMsByLevel)) {
    const submitted = await submitLeaderboardNow(
      SPEEDRUN_AGGREGATE_LEADERBOARD_ID,
      sumMapValues(next.speedrunBestMsByLevel),
    );
    if (submitted) {
      next = {
        ...next,
        speedrunAggregateSubmitted: true,
        unlockedAchievements: next.unlockedAchievements.includes("kingOfSpeed")
          ? next.unlockedAchievements
          : [...next.unlockedAchievements, "kingOfSpeed"],
      };
    }
  }

  if (next !== data) {
    await savePlayGamesData(next);
  }

  if (next.unlockedAchievements.length > 0 && next !== data) {
    return syncUnlockedAchievements(next);
  }

  return next;
}

export async function queueAchievementUnlock(key: AchievementKey): Promise<void> {
  const data = await loadPlayGamesData();
  if (!data.unlockedAchievements.includes(key)) {
    data.unlockedAchievements = [...data.unlockedAchievements, key];
    await savePlayGamesData(data);
  }
  await syncUnlockedAchievements(data);
}

export async function syncPlayGames(): Promise<void> {
  const data = await loadPlayGamesData();
  await syncUnlockedAchievements(data);
}

export async function recordClassicLevelBest(level: number, score: number): Promise<void> {
  if (level < 1 || score <= 0) return;
  const data = await loadPlayGamesData();
  const key = String(level);
  const previous = data.classicBestScoresByLevel[key] ?? 0;
  if (score > previous) {
    data.classicBestScoresByLevel = {
      ...data.classicBestScoresByLevel,
      [key]: score,
    };
    data.classicAggregateSubmitted = false;
    await savePlayGamesData(data);
  }
  await syncUnlockedAchievements(data);
}

export async function recordSpeedrunLevelBest(level: number, runMs: number): Promise<void> {
  if (level < 1 || runMs <= 0) return;
  const data = await loadPlayGamesData();
  const key = String(level);
  const previous = data.speedrunBestMsByLevel[key] ?? 0;
  if (previous === 0 || runMs < previous) {
    data.speedrunBestMsByLevel = {
      ...data.speedrunBestMsByLevel,
      [key]: Math.floor(runMs),
    };
    data.speedrunAggregateSubmitted = false;
    await savePlayGamesData(data);
  }
  await syncUnlockedAchievements(data);
}

export async function syncProgressAchievements(progress: ProgressData): Promise<void> {
  if (progress.highestLevel >= 10) await queueAchievementUnlock("topTen");
  if (progress.highestLevel >= 25) await queueAchievementUnlock("halfwayThere");
  if (progress.totalCatches >= 25) await queueAchievementUnlock("twentyFiveToLife");
  if (progress.totalCatches >= 100) await queueAchievementUnlock("rememberMeForCenturies");
}

export async function syncThemeAchievement(theme: Theme): Promise<void> {
  if (theme.hidden) {
    await queueAchievementUnlock("shhhItsASecret");
  }
}
