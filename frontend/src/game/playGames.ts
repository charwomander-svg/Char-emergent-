import { Platform, NativeModules } from "react-native";

import { MAX_LEVELS } from "./constants";
import type { ProgressData } from "./progress";
import { storage } from "@/src/utils/storage";

const CLASSIC_AGGREGATE_LEADERBOARD_ID = "CgkI9JL9xpkeEAIQAQ0";
const SPEEDRUN_AGGREGATE_LEADERBOARD_ID = "CgkI9JL9xpkeEAIQAg";
const HARDCORE_LEADERBOARD_ID = "CgkI9JL9xpkeEAIQEw";
const ENDLESS_LEADERBOARD_ID = "CgkI9JL9xpkeEAIQFA";
const TIME_ATTACK_LEADERBOARD_ID = "CgkI9JL9xpkeEAIQFQ";
const MOST_CATCHES_LEADERBOARD_ID = "CgkI9JL9xpkeEAIQFg";
const TOTAL_GOLD_STARS_LEADERBOARD_ID = "CgkI9JL9xpkeEAIQFw";
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
// - Free hugs: reach 50 total catches
// - 25 to Life / Remember me for centuries: reach 25 / 100 total catches
// - Classic Concentration / The King of Speed: fill all 50 aggregate bests and submit
// - Pellet, Schmelle: clear a level with very few pellets left
// - Chardcore: view the credits
// - Shhh. It's a secret: trigger the level-select cheat code
// - Close Call: clear a level while on your last life

type AchievementKey = keyof typeof ACHIEVEMENT_IDS;

interface PlayGamesModuleShape {
  isConfigured?: () => Promise<boolean>;
  isSignedIn?: () => Promise<boolean>;
  signIn?: () => Promise<boolean>;
  unlockAchievement?: (achievementId: string) => Promise<boolean>;
  submitLeaderboardScore?: (leaderboardId: string, score: number) => Promise<boolean>;
  showAchievements?: () => Promise<boolean>;
}

interface PlayGamesData {
  unlockedAchievements: AchievementKey[];
  classicBestScoresByLevel: Record<string, number>;
  speedrunBestMsByLevel: Record<string, number>;
  classicAggregateSubmitted: boolean;
  speedrunAggregateSubmitted: boolean;
  mostCatchesLifetimeSubmitted: number;
  totalGoldStarsSubmitted: number;
}

const DEFAULT_DATA: PlayGamesData = {
  unlockedAchievements: [],
  classicBestScoresByLevel: {},
  speedrunBestMsByLevel: {},
  classicAggregateSubmitted: false,
  speedrunAggregateSubmitted: false,
  mostCatchesLifetimeSubmitted: 0,
  totalGoldStarsSubmitted: 0,
};

let cachedConfigured: boolean | null = null;
let signedInThisSession = false;
let signInAttemptedThisSession = false;
let signInPromise: Promise<boolean> | null = null;

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
  if (cachedConfigured != null) return cachedConfigured;
  const native = getNativeModule();
  if (!native?.isConfigured) return false;
  try {
    cachedConfigured = !!(await native.isConfigured());
    return cachedConfigured;
  } catch {
    cachedConfigured = false;
    return false;
  }
}

async function ensureSignedIn(): Promise<boolean> {
  if (signedInThisSession) return true;
  if (signInPromise) return signInPromise;
  const native = getNativeModule();
  if (!native?.signIn) return false;
  const signIn = native.signIn;
  if (!(await isConfigured())) return false;
  if (signInAttemptedThisSession) return false;

  signInAttemptedThisSession = true;
  signInPromise = (async () => {
    try {
      const signedIn = !!(await signIn());
      if (signedIn) {
        signedInThisSession = true;
      }
      return signedIn;
    } catch {
      return false;
    } finally {
      signInPromise = null;
    }
  })();

  return signInPromise;
}

async function isSignedInSilently(): Promise<boolean> {
  if (signedInThisSession) return true;
  const native = getNativeModule();
  if (!native?.isSignedIn) return false;
  if (!(await isConfigured())) return false;
  try {
    const signedIn = !!(await native.isSignedIn());
    if (signedIn) {
      signedInThisSession = true;
    }
    return signedIn;
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

async function syncUnlockedAchievements(
  data: PlayGamesData,
  allowInteractiveSignIn = false,
): Promise<PlayGamesData> {
  const signedIn = allowInteractiveSignIn
    ? await ensureSignedIn()
    : await isSignedInSilently();
  if (!signedIn) return data;

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
    return syncUnlockedAchievements(next, false);
  }

  return next;
}

export async function queueAchievementUnlock(key: AchievementKey): Promise<void> {
  const data = await loadPlayGamesData();
  if (!data.unlockedAchievements.includes(key)) {
    data.unlockedAchievements = [...data.unlockedAchievements, key];
    await savePlayGamesData(data);
  }
  await syncUnlockedAchievements(data, false);
}

export async function syncPlayGames(): Promise<void> {
  const data = await loadPlayGamesData();
  await syncUnlockedAchievements(data, true);
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
  await syncUnlockedAchievements(data, false);
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
  await syncUnlockedAchievements(data, false);
}

export async function submitHardcoreRun(level: number): Promise<boolean> {
  if (level < 1) return false;
  if (!(await ensureSignedIn())) return false;
  return submitLeaderboardNow(HARDCORE_LEADERBOARD_ID, Math.floor(level));
}

export async function submitEndlessRun(level: number): Promise<boolean> {
  if (level < 1) return false;
  if (!(await ensureSignedIn())) return false;
  return submitLeaderboardNow(ENDLESS_LEADERBOARD_ID, Math.floor(level));
}

export async function submitTimeAttackRun(score: number): Promise<boolean> {
  if (score <= 0) return false;
  if (!(await ensureSignedIn())) return false;
  return submitLeaderboardNow(TIME_ATTACK_LEADERBOARD_ID, Math.floor(score));
}

export async function submitMostCatchesLifetime(totalCatches: number): Promise<boolean> {
  if (totalCatches <= 0) return false;
  const data = await loadPlayGamesData();
  const nextTotal = Math.floor(totalCatches);
  if (nextTotal <= data.mostCatchesLifetimeSubmitted) return false;
  if (!(await ensureSignedIn())) return false;
  const submitted = await submitLeaderboardNow(MOST_CATCHES_LEADERBOARD_ID, nextTotal);
  if (!submitted) return false;
  await savePlayGamesData({
    ...data,
    mostCatchesLifetimeSubmitted: nextTotal,
  });
  return true;
}

export async function submitTotalGoldStarsLifetime(totalGoldStars: number): Promise<boolean> {
  if (totalGoldStars <= 0) return false;
  const data = await loadPlayGamesData();
  const nextTotal = Math.floor(totalGoldStars);
  if (nextTotal <= data.totalGoldStarsSubmitted) return false;
  if (!(await ensureSignedIn())) return false;
  const submitted = await submitLeaderboardNow(TOTAL_GOLD_STARS_LEADERBOARD_ID, nextTotal);
  if (!submitted) return false;
  await savePlayGamesData({
    ...data,
    totalGoldStarsSubmitted: nextTotal,
  });
  return true;
}

export async function syncProgressAchievements(progress: ProgressData): Promise<void> {
  if (progress.highestLevel >= 10) await queueAchievementUnlock("topTen");
  if (progress.highestLevel >= 25) await queueAchievementUnlock("halfwayThere");
  if (progress.totalCatches >= 25) await queueAchievementUnlock("twentyFiveToLife");
  if (progress.totalCatches >= 50) await queueAchievementUnlock("freeHugs");
  if (progress.totalCatches >= 100) await queueAchievementUnlock("rememberMeForCenturies");
}

export async function showPlayGamesAchievements(): Promise<boolean> {
  const native = getNativeModule();
  if (!native?.showAchievements) return false;
  if (!(await isConfigured())) return false;
  if (!(await ensureSignedIn())) return false;
  try {
    return !!(await native.showAchievements());
  } catch {
    return false;
  }
}

