import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  PanResponder,
  useWindowDimensions,
  Animated,
  Alert,
  BackHandler,
  type GestureResponderEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { useGhostMaze, type EndlessBlessingId } from "@/src/game/useGhostMaze";
import MazeRenderer from "@/src/game/MazeRenderer";
import { CATCH_TO_WIN, MAX_LEVELS, TIME_ATTACK_DURATION_MS } from "@/src/game/constants";
import type { CellType, Direction, GhostAiRole, GhostId } from "@/src/game/types";
import { useGamepad } from "@/src/game/useGamepad";
import { useEconomy } from "@/src/game/useEconomy";
import { loadProgress, computeUnlockedThemeIds, THEMES, withUnlockedThemes, saveProgress } from "@/src/game/progress";
import { POWER_UPS, POWER_UP_ORDER, type PowerUpId } from "@/src/game/powerups";
import { loadSpeedrunData, saveBestRunMs } from "@/src/game/speedrun";
import { bonusTimeRemainingMs, BONUS_CONFIG } from "@/src/game/bonusGame";
import { recordDailyMissionProgress } from "@/src/game/dailyMissions";
import { DEFAULT_SETTINGS, loadSettings, type SettingsData } from "@/src/game/settings";
import { isWalkable } from "@/src/game/maze";
import { updateStatistics } from "@/src/game/statistics";
import { getSoundEngine } from "@/src/game/sounds";
import {
  queueAchievementUnlock,
  recordSpeedrunLevelBest,
  submitEndlessRun,
  submitHardcoreRun,
  submitMostCatchesLifetime,
  submitTimeAttackRun,
  syncPlayGames,
} from "@/src/game/playGames";


function fmtMs(ms: number): string {
  const totalMs = Math.max(0, Math.floor(ms));
  const totalSeconds = Math.floor(totalMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const millis = totalMs % 1000;
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

function fmtDeltaMs(ms: number): string {
  const sign = ms >= 0 ? "+" : "-";
  return `${sign}${fmtMs(Math.abs(ms))}`;
}

function nowMs(): number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

interface RunStats {
  catches: number;
  longestCombo: number;
  ghostLosses: number;
  powerUpsUsed: number;
  bonusClears: number;
  hardcoreRevivesUsed: number;
}

interface EndlessBlessingChoice {
  id: EndlessBlessingId;
  label: string;
  description: string;
}

interface RunTitle {
  emoji: string;
  label: string;
}
interface HiddenMedal {
  emoji: string;
  label: string;
}

type LeaderboardSubmissionState = "pending" | "submitted" | "offline" | "ineligible" | null;
type PracticeStep = "arm" | "direction" | "catch" | "done";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getGameMode(rawMode?: string) {
  return rawMode === "custom" ||
    rawMode === "speedrun" ||
    rawMode === "hardcore" ||
    rawMode === "endless" ||
    rawMode === "timeattack"
    ? rawMode
    : "classic";
}

const GHOST_BY_NUMBER_KEY: Record<string, GhostId> = {
  "1": 0,
  "2": 1,
  "3": 2,
  "4": 3,
};

const STANDARD_DIRECTION_BY_KEY: Record<string, Direction> = {
  arrowup: "up",
  w: "up",
  arrowdown: "down",
  s: "down",
  arrowleft: "left",
  a: "left",
  arrowright: "right",
  d: "right",
};

class GameplayErrorBoundary extends React.Component<
  { children: React.ReactNode; label?: string },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("[GhostMaze] Gameplay boundary caught:", error);
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.errorPanel}>
          <Text style={styles.errorTitle}>GAMEPLAY CRASH</Text>
          {this.props.label ? <Text style={styles.errorSubtitle}>{this.props.label}</Text> : null}
          <Text style={styles.errorBody} selectable>
            {String(this.state.error.message || this.state.error)}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function GameScreen() {
  const [webMounted, setWebMounted] = useState(false);

  useEffect(() => {
    setWebMounted(true);
  }, []);

  if (typeof window === "undefined" || !webMounted) {
    return <View style={styles.container} />;
  }

  return (
    <GameplayErrorBoundary label="game route">
      <FullGameScreen />
    </GameplayErrorBoundary>
  );
}

function getDirectionalStepTowardTarget(
  maze: CellType[][],
  start: { x: number; y: number },
  target: { x: number; y: number },
): Direction | null {
  const dirs: { dir: Direction; dx: number; dy: number }[] = [
    { dir: "up", dx: 0, dy: -1 },
    { dir: "down", dx: 0, dy: 1 },
    { dir: "left", dx: -1, dy: 0 },
    { dir: "right", dx: 1, dy: 0 },
  ];
  const inBounds = (x: number, y: number) => y >= 0 && y < maze.length && x >= 0 && x < maze[0].length;
  if (!inBounds(target.x, target.y) || !isWalkable(maze, target.x, target.y, false)) return null;
  if (start.x === target.x && start.y === target.y) return null;

  const queue: { x: number; y: number }[] = [{ x: start.x, y: start.y }];
  const visited = new Set<string>([`${start.x},${start.y}`]);
  const firstStepByCell = new Map<string, Direction>();

  for (let idx = 0; idx < queue.length; idx++) {
    const current = queue[idx];
    if (current.x === target.x && current.y === target.y) {
      return firstStepByCell.get(`${current.x},${current.y}`) ?? null;
    }
    for (const { dir, dx, dy } of dirs) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      const key = `${nx},${ny}`;
      if (!inBounds(nx, ny) || visited.has(key) || !isWalkable(maze, nx, ny, false)) continue;
      visited.add(key);
      queue.push({ x: nx, y: ny });
      firstStepByCell.set(key, firstStepByCell.get(`${current.x},${current.y}`) ?? dir);
    }
  }
  return null;
}

const GHOST_ROLE_LABELS: Record<GhostAiRole, string> = {
  free: "FREE",
  hunter: "HUNTER",
  patrol: "PATROL",
  cautious: "CAUTIOUS",
  coward: "COWARD",
  ambusher: "AMBUSHER",
  social: "SOCIAL",
};

const RUN_MEDAL_THRESHOLDS = {
  silver: 10000,
  gold: 25000,
} as const;

function FullGameScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    mode?: string;
    seed?: string;
    level?: string;
    practice?: string;
    ispracticemode?: string;
    isPracticeMode?: string;
  }>();
  const mode = getGameMode(params.mode);
  const platformServicesEnabled = true;
  const isPracticeMode =
    params.practice === "1" || params.ispracticemode === "1" || params.isPracticeMode === "1";
  const seed = params.seed != null ? Number(params.seed) : undefined;
  const startLevel = params.level != null ? Number(params.level) : undefined;
  const [runtimeSettings, setRuntimeSettings] = useState<SettingsData>(DEFAULT_SETTINGS);
  const { earnCoins, spendCoins, inventory, coins, useInventory: consumeInventory } = useEconomy(runtimeSettings);
  const {
    state,
    setGhostDirection,
    selectGhost,
    togglePause,
    advanceLevel,
    retryLevel,
    continueEndlessRun,
    endRun,
    startNewGame,
    submitFinalScore,
    applyPowerUp,
    grantEndlessBlessing,
    setControlledGhosts,
    cycleGhostAiRole,
    devDefeatGhost,
    devDefeatPelletGuy,
    getEndlessBlessings,
    getRunHazardStats,
  } = useGhostMaze({
    mode,
    seed: Number.isFinite(seed) ? seed : undefined,
    startingLevel: Number.isFinite(startLevel) ? Math.max(1, Math.floor(startLevel!)) : 1,
    practiceMode: isPracticeMode,
    onCoinsEarned: isPracticeMode ? undefined : (n) => earnCoins(n),
  });
  const { width, height } = useWindowDimensions();
  const [mazeAreaSize, setMazeAreaSize] = useState({ width: 0, height: 0 });
  const mazeCols = state.maze[0]?.length ?? 15;
  const mazeRows = state.maze.length || 19;
  const cellSize = Math.max(
    12,
    Math.floor(Math.min(
      (mazeAreaSize.width > 0 ? mazeAreaSize.width : width) / mazeCols,
      (mazeAreaSize.height > 0 ? mazeAreaSize.height : height) / mazeRows,
    )),
  );
  const [armedGhosts, setArmedGhosts] = useState<GhostId[]>([0]);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [bestRunMs, setBestRunMs] = useState(0);
  const [themeId, setThemeId] = useState("classic");
  const [gamepadDeadzone, setGamepadDeadzone] = useState(DEFAULT_SETTINGS.gamepadDeadzone);
  const [gamepadInvertY, setGamepadInvertY] = useState(DEFAULT_SETTINGS.gamepadInvertY);
  const [highContrast, setHighContrast] = useState(DEFAULT_SETTINGS.highContrast);
  const [largeHud, setLargeHud] = useState(DEFAULT_SETTINGS.largeHud);
  const [reducedMotion, setReducedMotion] = useState(DEFAULT_SETTINGS.reducedMotion);
  const [controlMode, setControlMode] = useState<SettingsData["controlMode"]>(DEFAULT_SETTINGS.controlMode);
  const [unlockToast, setUnlockToast] = useState<string | null>(null);
  const [runStats, setRunStats] = useState<RunStats>({
    catches: 0,
    longestCombo: 0,
    ghostLosses: 0,
    powerUpsUsed: 0,
    bonusClears: 0,
    hardcoreRevivesUsed: 0,
  });
  const [devPanelOpen, setDevPanelOpen] = useState(false);
  const timerAccumulatedRef = useRef(0);
  const timerRunningFromRef = useRef<number | null>(null);
  const submittedSpeedrunRef = useRef(false);
  const submittedModeLeaderboardRef = useRef(false);
  const recordedSpeedrunLevelsRef = useRef<Record<number, true>>({});
  const previousLevelRef = useRef(state.level);
  const previousStatusRef = useRef(state.status);
  const levelStartElapsedRef = useRef(0);
  const previousCatchesRef = useRef(state.catches);
  const previousComboRef = useRef(state.comboCount);
  const previousAliveCountRef = useRef(state.ghosts.filter((ghost) => ghost.alive).length);
  const previousUnlockedThemesRef = useRef<string[]>([]);
  const hardcoreStartAtRef = useRef<number | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const runStatsAnim = useRef(new Animated.Value(0)).current;
  const runMedalAnim = useRef(new Animated.Value(0)).current;
  const [hardcoreSurvivalMs, setHardcoreSurvivalMs] = useState(0);
  const [bestHardcoreSurvivalMs, setBestHardcoreSurvivalMs] = useState(0);
  const [hardcoreDeltaMs, setHardcoreDeltaMs] = useState<number | null>(null);
  const [statusToast, setStatusToast] = useState<string | null>(null);
  const [submissionState, setSubmissionState] = useState<LeaderboardSubmissionState>(null);
  const [practiceStep, setPracticeStep] = useState<PracticeStep>(isPracticeMode ? "arm" : "done");
  const [endlessContinueCount, setEndlessContinueCount] = useState(0);
  const [bonusTutorialText, setBonusTutorialText] = useState<string | null>(null);
  const [endlessBlessingChoices, setEndlessBlessingChoices] = useState<EndlessBlessingChoice[]>([]);
  const [endlessBlessingSummary, setEndlessBlessingSummary] = useState("");
  const seenBonusTutorialsRef = useRef<Set<string>>(new Set());
  const criticalPelletPingedLevelRef = useRef<number>(0);
  const previousPelletsRef = useRef(state.pelletsRemaining);
  const levelStartAtRef = useRef<number>(nowMs());
  const bestLevelClearMsRef = useRef<number | null>(null);
  const hardcoreTimerAccumulatedRef = useRef(0);
  const hardcoreTimerRunningFromRef = useRef<number | null>(null);
  const hardcoreSummaryCapturedRef = useRef(false);
  const runSessionStartedRef = useRef(false);
  const runSessionStartAtRef = useRef<number | null>(null);
  const runSessionRecordedRef = useRef(false);
  const practiceInitRef = useRef(false);

  useEffect(() => {
    loadSpeedrunData().then((d) => setBestRunMs(d.bestRunMs));
    loadProgress().then((p) => {
      const normalized = withUnlockedThemes(p);
      previousUnlockedThemesRef.current = normalized.unlockedThemes;
      setThemeId(normalized.selectedThemeId);
      setBestHardcoreSurvivalMs(normalized.bestHardcoreSurvivalMs ?? 0);
      void saveProgress(normalized);
    });
    loadSettings().then((s) => {
      setRuntimeSettings(s);
      setGamepadDeadzone(s.gamepadDeadzone);
      setGamepadInvertY(s.gamepadInvertY);
      setHighContrast(!!s.highContrast);
      setLargeHud(!!s.largeHud);
      setReducedMotion(!!s.reducedMotion);
      setControlMode(s.controlMode ?? DEFAULT_SETTINGS.controlMode);
    });
    if (platformServicesEnabled) {
      void syncPlayGames();
    }
  }, [platformServicesEnabled]);

  useEffect(() => {
    loadSettings().then((s) => {
      setRuntimeSettings(s);
      const audioEnabled = !!s.soundOn;
      getSoundEngine().setEnabled(audioEnabled);
      getSoundEngine().setVolumes({
        sfx: audioEnabled ? s.sfxVolume : 0,
        music: audioEnabled ? s.musicVolume : 0,
      });
    });
  }, []);

  useEffect(() => {
    setControlledGhosts(armedGhosts);
  }, [armedGhosts, setControlledGhosts]);

  useEffect(() => {
    if (!isPracticeMode || practiceInitRef.current) return;
    if (state.status !== "ready" || state.level !== 1 || state.score !== 0) return;
    practiceInitRef.current = true;
    setArmedGhosts([]);
    setStatusToast("PRACTICE 1/3: ARM ONE GHOST");
  }, [isPracticeMode, state.level, state.score, state.status]);

  useEffect(() => {
    if (state.status === "paused") {
      getSoundEngine().fadeMusicTo(0.08, 180);
      return;
    }
    if (state.status === "gameOver") {
      getSoundEngine().fadeMusicTo(0.05, 240);
      return;
    }
    if (state.status === "playing" || state.status === "ready") {
      loadSettings().then((s) => {
        setRuntimeSettings(s);
        if (!!s.soundOn) {
          getSoundEngine().fadeMusicTo(s.musicVolume, 180);
        }
      });
    }
  }, [state.status]);

  const computeTimerMs = useCallback(() => {
    if (timerRunningFromRef.current == null) return timerAccumulatedRef.current;
    return timerAccumulatedRef.current + (nowMs() - timerRunningFromRef.current);
  }, []);

  useEffect(() => {
    if (mode !== "speedrun" && mode !== "timeattack") return;
    if (state.status === "playing" && timerRunningFromRef.current == null) {
      timerRunningFromRef.current = nowMs();
    }
    if (state.status !== "playing" && timerRunningFromRef.current != null) {
      timerAccumulatedRef.current += nowMs() - timerRunningFromRef.current;
      timerRunningFromRef.current = null;
    }
    if (mode === "speedrun" && state.status === "gameOver" && !submittedSpeedrunRef.current) {
      submittedSpeedrunRef.current = true;
      const finalMs = computeTimerMs();
      setElapsedMs(finalMs);
      saveBestRunMs(finalMs).then(setBestRunMs);
      setSubmissionState("pending");
      void submitFinalScore("SPEEDRUN", finalMs)
        .then(() => setSubmissionState("submitted"))
        .catch(() => setSubmissionState("offline"));
      void queueAchievementUnlock("gottaGoFast");
      if (state.level >= MAX_LEVELS) {
        const finalLevel = previousLevelRef.current;
        if (platformServicesEnabled && !recordedSpeedrunLevelsRef.current[finalLevel]) {
          recordedSpeedrunLevelsRef.current[finalLevel] = true;
          void recordSpeedrunLevelBest(finalLevel, finalMs - levelStartElapsedRef.current);
        }
      }
    }
    if (mode === "timeattack" && state.status === "gameOver" && !submittedSpeedrunRef.current) {
      submittedSpeedrunRef.current = true;
      const finalMs = Math.min(computeTimerMs(), TIME_ATTACK_DURATION_MS);
      setElapsedMs(finalMs);
      setSubmissionState("pending");
      void submitFinalScore("TIME ATTACK")
        .then(() => setSubmissionState("submitted"))
        .catch(() => setSubmissionState("offline"));
    }
  }, [computeTimerMs, mode, platformServicesEnabled, state.level, state.status, submitFinalScore]);

  useEffect(() => {
    if (state.status !== "gameOver") return;
    if (submissionState != null) return;
    if (mode === "speedrun" || mode === "timeattack") return;
    setSubmissionState("ineligible");
  }, [mode, state.status, submissionState]);

  useEffect(() => {
    if (mode !== "speedrun" && mode !== "timeattack") return;
    let raf = 0;
    const frame = () => {
      if (stateRef.current.status === "playing") {
        setElapsedMs(computeTimerMs());
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [mode, computeTimerMs]);

  useEffect(() => {
    if (mode !== "timeattack") return;
    if (state.status !== "playing") return;
    if (elapsedMs < TIME_ATTACK_DURATION_MS) return;
    endRun(`TIME ATTACK OVER\nFINAL SCORE: ${state.score}`);
  }, [elapsedMs, endRun, mode, state.score, state.status]);

  useEffect(() => {
    if (state.status === "ready" && state.score === 0) {
      timerAccumulatedRef.current = 0;
      timerRunningFromRef.current = null;
      setElapsedMs(0);
      submittedSpeedrunRef.current = false;
      submittedModeLeaderboardRef.current = false;
      recordedSpeedrunLevelsRef.current = {};
      previousLevelRef.current = state.level;
      levelStartElapsedRef.current = 0;
      previousComboRef.current = 0;
      levelStartAtRef.current = nowMs();
      bestLevelClearMsRef.current = null;
      previousAliveCountRef.current = state.ghosts.filter((ghost) => ghost.alive).length;
      hardcoreStartAtRef.current = null;
      setHardcoreSurvivalMs(0);
      setHardcoreDeltaMs(null);
      hardcoreTimerAccumulatedRef.current = 0;
      hardcoreTimerRunningFromRef.current = null;
      hardcoreSummaryCapturedRef.current = false;
      setEndlessContinueCount(0);
      seenBonusTutorialsRef.current.clear();
      setBonusTutorialText(null);
      setEndlessBlessingChoices([]);
      setEndlessBlessingSummary("");
      criticalPelletPingedLevelRef.current = 0;
      setSubmissionState(null);
      setPracticeStep(isPracticeMode ? "arm" : "done");
      practiceInitRef.current = false;
      setRunStats({
        catches: 0,
        longestCombo: 0,
        ghostLosses: 0,
        powerUpsUsed: 0,
        bonusClears: 0,
        hardcoreRevivesUsed: 0,
      });
      setUnlockToast(null);
      setStatusToast(null);
      runSessionStartedRef.current = false;
      runSessionStartAtRef.current = null;
      runSessionRecordedRef.current = false;
    }
  }, [state.status, state.level, state.score, state.ghosts]);

  useEffect(() => {
    const activeRun = state.status === "ready" || state.status === "playing" || state.status === "paused";
    if (activeRun && !runSessionStartedRef.current) {
      runSessionStartedRef.current = true;
      runSessionStartAtRef.current = nowMs();
      void updateStatistics((current) => ({
        ...current,
        runsStarted: current.runsStarted + 1,
      }));
    }
  }, [state.status]);

  const recordRunSessionTotals = useCallback((countAsFinished: boolean) => {
    if (!runSessionStartedRef.current || runSessionRecordedRef.current) return;
    runSessionRecordedRef.current = true;
    const elapsed = runSessionStartAtRef.current == null
      ? 0
      : Math.max(0, nowMs() - runSessionStartAtRef.current);
    const hazardStats = getRunHazardStats();
    void (async () => {
      const nextStats = await updateStatistics((current) => ({
        ...current,
        runsFinished: current.runsFinished + (countAsFinished ? 1 : 0),
        totalPlaytimeMs: current.totalPlaytimeMs + elapsed,
        totalCatches: current.totalCatches + runStats.catches,
        totalGhostLosses: current.totalGhostLosses + runStats.ghostLosses,
        totalPowerUpsUsed: current.totalPowerUpsUsed + runStats.powerUpsUsed,
        totalMinesTriggered: current.totalMinesTriggered + hazardStats.spikeTriggers,
        totalEndlessContinues: current.totalEndlessContinues + endlessContinueCount,
        totalHardcoreRevives: current.totalHardcoreRevives + runStats.hardcoreRevivesUsed,
        totalScoreEarned: current.totalScoreEarned + state.score,
        highestCombo: Math.max(current.highestCombo, runStats.longestCombo),
      }));
      if (platformServicesEnabled) {
        await submitMostCatchesLifetime(nextStats.totalCatches);
      }
    })();
  }, [
    endlessContinueCount,
    getRunHazardStats,
    runStats.catches,
    runStats.ghostLosses,
    runStats.hardcoreRevivesUsed,
    runStats.longestCombo,
    runStats.powerUpsUsed,
    platformServicesEnabled,
    state.level,
    state.score,
    state.status,
  ]);

  useEffect(() => {
    const runFinished =
      state.status === "gameOver" ||
      (state.status === "levelWon" && mode !== "endless" && state.level >= MAX_LEVELS);
    if (runFinished) {
      recordRunSessionTotals(true);
    }
  }, [mode, recordRunSessionTotals, state.level, state.status]);

  const abandonRunToMenu = useCallback(() => {
    const status = stateRef.current.status;
    const activeRun =
      status === "ready" ||
      status === "playing" ||
      status === "paused" ||
      status === "levelWon" ||
      status === "levelLost";
    if (activeRun) {
      recordRunSessionTotals(false);
    }
    startNewGame();
    router.replace("/");
  }, [recordRunSessionTotals, router, startNewGame]);

  useEffect(() => {
    if (mode !== "hardcore") return;
    if (state.status === "playing") {
      if (hardcoreStartAtRef.current == null) {
        hardcoreStartAtRef.current = nowMs();
      }
      if (hardcoreTimerRunningFromRef.current == null) {
        hardcoreTimerRunningFromRef.current = nowMs();
      }
      return;
    }
    if (hardcoreTimerRunningFromRef.current != null) {
      hardcoreTimerAccumulatedRef.current += nowMs() - hardcoreTimerRunningFromRef.current;
      hardcoreTimerRunningFromRef.current = null;
      setHardcoreSurvivalMs(hardcoreTimerAccumulatedRef.current);
    }
    if (state.status === "gameOver" && !hardcoreSummaryCapturedRef.current) {
      hardcoreSummaryCapturedRef.current = true;
      const survivalMs = Math.max(0, hardcoreTimerAccumulatedRef.current);
      const previousBest = bestHardcoreSurvivalMs;
      setHardcoreSurvivalMs(survivalMs);
      setHardcoreDeltaMs(previousBest > 0 ? survivalMs - previousBest : null);
      if (survivalMs > previousBest) {
        setBestHardcoreSurvivalMs(survivalMs);
        loadProgress().then((progress) => {
          const normalized = withUnlockedThemes(progress);
          void saveProgress({ ...normalized, bestHardcoreSurvivalMs: survivalMs });
        });
      }
    }
  }, [bestHardcoreSurvivalMs, mode, state.status]);

  useEffect(() => {
    if (!state.message) {
      setStatusToast(null);
      return;
    }
    if (state.status === "playing") {
      setStatusToast(state.message);
      const timer = setTimeout(() => {
        setStatusToast((current) => (current === state.message ? null : current));
      }, 1400);
      return () => clearTimeout(timer);
    }
    setStatusToast(state.message);
  }, [state.message, state.status]);

  useEffect(() => {
    const type = state.bonusGame?.type;
    if (!type || seenBonusTutorialsRef.current.has(type)) return;
    seenBonusTutorialsRef.current.add(type);
    const hintByType: Record<string, string> = {
      rallyRound: "TIP: Sweep flags fast with your lead ghost.",
      cherryChase: "TIP: Cut corners and chain cherries.",
      timeAttack: "TIP: Prioritize clocks to extend time.",
      powerHunt: "TIP: Grab the yellow pellet, then hunt fleeing pellet guys.",
    };
    setBonusTutorialText(hintByType[type] ?? "TIP: Collect bonus items before time runs out.");
    const timer = setTimeout(() => setBonusTutorialText(null), 2600);
    return () => clearTimeout(timer);
  }, [state.bonusGame?.type]);

  useEffect(() => {
    if (mode !== "endless") return;
    const shouldOffer = state.status === "levelWon" && state.level > 0 && state.level % 5 === 0;
    if (!shouldOffer || endlessBlessingChoices.length > 0) return;
    const commonPool: EndlessBlessingChoice[] = [
      { id: "hunterInstinct", label: "HUNTER INSTINCT", description: "+50 catch score (stacking)." },
      { id: "slowArena", label: "SLOW ARENA", description: "Pellet Guy speed reduced (stacking)." },
      { id: "ghostOverdrive", label: "GHOST OVERDRIVE", description: "Your ghost team speed increases (stacking)." },
      { id: "extraLife", label: "SECOND WIND", description: "Raises ghost-loss cap to 25 this run." },
    ];
    const pool = [...commonPool];
    if (Math.random() < 0.35) {
      pool.push({
        id: "continueDiscount",
        label: "BARGAIN LIVES (RARE)",
        description: "All continue costs are halved for this run.",
      });
    }
    if (Math.random() < 0.12) {
      pool.push({
        id: "quickClear",
        label: "RELENTLESS HUNT (SUPER RARE)",
        description: "Only 2 catches are needed to clear levels.",
      });
    }
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setEndlessBlessingChoices(shuffled.slice(0, 3));
  }, [endlessBlessingChoices.length, mode, state.level, state.status]);

  useEffect(() => {
    if (state.status !== "playing" || state.bonusGame) {
      previousPelletsRef.current = state.pelletsRemaining;
      return;
    }
    const crossedCritical =
      previousPelletsRef.current > 10 &&
      state.pelletsRemaining <= 10 &&
      criticalPelletPingedLevelRef.current !== state.level;
    if (crossedCritical) {
      criticalPelletPingedLevelRef.current = state.level;
      setBonusTutorialText(`⚠ ${state.pelletsRemaining} PELLETS LEFT`);
      getSoundEngine().uiClick();
      setTimeout(() => {
        setBonusTutorialText((current) =>
          current?.includes("PELLETS LEFT") ? null : current,
        );
      }, 1800);
    }
    previousPelletsRef.current = state.pelletsRemaining;
  }, [state.bonusGame, state.level, state.pelletsRemaining, state.status]);

  useEffect(() => {
    if (mode !== "endless") return;
    const buffs = getEndlessBlessings();
    const parts: string[] = [];
    if (buffs.hunterInstinct > 0) parts.push(`HUNT x${buffs.hunterInstinct}`);
    if (buffs.slowArena > 0) parts.push(`SLOW x${buffs.slowArena}`);
    if (buffs.ghostOverdrive > 0) parts.push(`SPD x${buffs.ghostOverdrive}`);
    if (buffs.secondWind) parts.push("2ND WIND");
    if (buffs.continueDiscount) parts.push("HALF CONTINUE");
    if (buffs.quickClear) parts.push("2 CATCH CLEAR");
    setEndlessBlessingSummary(parts.join(" · "));
  }, [getEndlessBlessings, mode, state.level, state.status]);

  useEffect(() => {
    if (mode !== "speedrun") return;
    const previousLevel = previousLevelRef.current;
    if (state.level > previousLevel) {
      const elapsed = computeTimerMs();
      if (!recordedSpeedrunLevelsRef.current[previousLevel]) {
        recordedSpeedrunLevelsRef.current[previousLevel] = true;
        if (platformServicesEnabled) {
          void recordSpeedrunLevelBest(previousLevel, elapsed - levelStartElapsedRef.current);
        }
      }
      levelStartElapsedRef.current = elapsed;
    }
    previousLevelRef.current = state.level;
  }, [computeTimerMs, mode, platformServicesEnabled, state.level]);

  useEffect(() => {
    if (state.status !== "gameOver" || submittedModeLeaderboardRef.current) return;
    if (mode === "hardcore") {
      submittedModeLeaderboardRef.current = true;
      if (platformServicesEnabled) void submitHardcoreRun(state.level);
      return;
    }
    if (mode === "endless") {
      submittedModeLeaderboardRef.current = true;
      if (platformServicesEnabled) void submitEndlessRun(state.level);
      return;
    }
    if (mode === "timeattack") {
      submittedModeLeaderboardRef.current = true;
      if (platformServicesEnabled) void submitTimeAttackRun(state.score);
    }
  }, [mode, platformServicesEnabled, state.level, state.score, state.status]);

  useEffect(() => {
    if (armedGhosts.length === 4) {
      void queueAchievementUnlock("friends");
      void recordDailyMissionProgress({ armAllEvents: 1 });
    }
  }, [armedGhosts, platformServicesEnabled]);

  useEffect(() => {
    const livingGhosts = state.ghosts.filter((ghost) => ghost.alive).map((ghost) => ghost.id);
    setArmedGhosts((prev) => {
      const filtered = prev.filter((id) => livingGhosts.includes(id));
      if (filtered.length > 0) return filtered;
      return livingGhosts.length > 0 ? [livingGhosts[0]] : prev;
    });
  }, [state.ghosts]);

  useEffect(() => {
    const previousCatches = previousCatchesRef.current;
    if (state.catches > previousCatches) {
      void recordDailyMissionProgress({ catches: state.catches - previousCatches });
      setRunStats((stats) => ({ ...stats, catches: stats.catches + (state.catches - previousCatches) }));
      if (isPracticeMode && practiceStep === "catch") {
        setPracticeStep("done");
        setStatusToast("PRACTICE COMPLETE ✓");
      }
    }
    previousCatchesRef.current = state.catches;
  }, [isPracticeMode, practiceStep, state.catches]);

  useEffect(() => {
    if (state.comboCount > previousComboRef.current) {
      setRunStats((stats) => ({
        ...stats,
        longestCombo: Math.max(stats.longestCombo, state.comboCount),
      }));
    }
    previousComboRef.current = state.comboCount;
  }, [state.comboCount]);

  useEffect(() => {
    const alive = state.ghosts.filter((ghost) => ghost.alive).length;
    const prevAlive = previousAliveCountRef.current;
    if (alive < prevAlive) {
      setRunStats((stats) => ({ ...stats, ghostLosses: stats.ghostLosses + (prevAlive - alive) }));
    }
    previousAliveCountRef.current = alive;
  }, [state.ghosts]);

  useEffect(() => {
    if (state.status !== "gameOver") return;
    if (reducedMotion) {
      runStatsAnim.setValue(1);
      runMedalAnim.setValue(1);
      getSoundEngine().uiClick();
      return;
    }
    runStatsAnim.setValue(0);
    runMedalAnim.setValue(0);
    Animated.parallel([
      Animated.timing(runStatsAnim, {
        toValue: 1,
        duration: 240,
        useNativeDriver: true,
      }),
      Animated.spring(runMedalAnim, {
        toValue: 1,
        friction: 6,
        tension: 120,
        useNativeDriver: true,
      }),
    ]).start(() => {
      getSoundEngine().uiClick();
    });
  }, [state.status, reducedMotion, runStatsAnim, runMedalAnim]);

  useEffect(() => {
    if (state.status === "levelWon") {
      const catchDelta = state.catches - previousCatchesRef.current;
      if (catchDelta > 0) {
        void recordDailyMissionProgress({ catches: catchDelta });
        setRunStats((stats) => ({ ...stats, catches: stats.catches + catchDelta }));
        previousCatchesRef.current = state.catches;
      }
    }
    const previousStatus = previousStatusRef.current;
    if (state.status === "levelWon" && previousStatus !== "levelWon") {
      const clearMs = Math.max(0, nowMs() - levelStartAtRef.current);
      bestLevelClearMsRef.current = bestLevelClearMsRef.current == null
        ? clearMs
        : Math.min(bestLevelClearMsRef.current, clearMs);
      const progress: Parameters<typeof recordDailyMissionProgress>[0] = { levelsCleared: 1 };
      if (
        state.bonusGame &&
        state.bonusGame.collectedItems >= state.bonusGame.totalItems
      ) {
        progress.bonusPerfectClears = 1;
      }
      void recordDailyMissionProgress(progress);
      if (state.bonusGame) {
        setRunStats((stats) => ({ ...stats, bonusClears: stats.bonusClears + 1 }));
      }
      void updateStatistics((current) => ({
        ...current,
        levelsCleared: current.levelsCleared + 1,
        bonusClears: current.bonusClears + (state.bonusGame ? 1 : 0),
        bestLevelClearMs: current.bestLevelClearMs > 0
          ? Math.min(current.bestLevelClearMs, clearMs)
          : clearMs,
      }));
      loadProgress().then((p) => {
        const unlockedNow = computeUnlockedThemeIds(p);
        const newThemeIds = unlockedNow.filter((id) => !previousUnlockedThemesRef.current.includes(id));
        if (newThemeIds.length > 0) {
          const firstName = THEMES.find((theme) => theme.id === newThemeIds[0])?.name ?? "NEW TEAM";
          setUnlockToast(`UNLOCKED: ${firstName.toUpperCase()}`);
          previousUnlockedThemesRef.current = unlockedNow;
          const normalized = { ...p, unlockedThemes: unlockedNow };
          void saveProgress(normalized);
          setTimeout(() => setUnlockToast(null), 2400);
        }
      });
    }
    if ((state.status === "ready" || state.status === "playing") && previousStatus === "levelWon") {
      levelStartAtRef.current = nowMs();
    }
    previousStatusRef.current = state.status;
  }, [state.bonusGame, state.catches, state.status]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      const status = stateRef.current.status;
      const activeRun =
        status === "ready" ||
        status === "playing" ||
        status === "paused" ||
        status === "levelWon" ||
        status === "levelLost";
      if (!activeRun) return false;
      Alert.alert(
        "Leave run?",
        "Leave this run and return to the main menu?",
        [
          { text: "Resume", style: "cancel" },
          { text: "Leave", style: "destructive", onPress: abandonRunToMenu },
        ],
      );
      return true;
    });
    return () => subscription.remove();
  }, [abandonRunToMenu]);

  const syncSelection = useCallback((next: GhostId[]) => {
    if (next.length > 0) selectGhost(next[0]);
    setArmedGhosts(next);
  }, [selectGhost]);

  const toggleGhostArm = useCallback((ghostId: GhostId) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    selectGhost(ghostId);
    setArmedGhosts((prev) => {
      let next: GhostId[];
      if (prev.includes(ghostId)) {
        if (prev.length === 1) {
          next = prev;
        } else {
          next = prev.filter((id) => id !== ghostId);
        }
      } else {
        next = [...prev, ghostId].sort((a, b) => a - b) as GhostId[];
      }
      if (isPracticeMode && practiceStep === "arm" && next.length > 0) {
        setPracticeStep("direction");
        setStatusToast("PRACTICE 2/3: SWIPE OR PRESS A DIRECTION");
      }
      return next;
    });
  }, [isPracticeMode, practiceStep, selectGhost]);

  const applyDirectionToArmed = useCallback((dir: Direction) => {
    if (isPracticeMode && practiceStep === "direction" && stateRef.current.status === "playing") {
      setPracticeStep("catch");
      setStatusToast("PRACTICE 3/3: CATCH PELLET GUY ONCE");
    }
    const targets = armedGhosts.length > 0 ? armedGhosts : [stateRef.current.selectedGhostId];
    const selectedGhostId = stateRef.current.selectedGhostId;
    targets.forEach((id) => setGhostDirection(id, dir));
    if (targets.length > 1) selectGhost(selectedGhostId);
  }, [armedGhosts, isPracticeMode, practiceStep, selectGhost, setGhostDirection]);

  const moveArmedGhostsTowardCell = useCallback((targetX: number, targetY: number) => {
    const current = stateRef.current;
    if (current.status !== "playing") return;
    const targets = armedGhosts.length > 0 ? armedGhosts : [current.selectedGhostId];
    const selectedGhostId = current.selectedGhostId;
    targets.forEach((id) => {
      const ghost = current.ghosts[id];
      if (!ghost?.alive) return;
      const dir = getDirectionalStepTowardTarget(
        current.maze,
        { x: ghost.x, y: ghost.y },
        { x: targetX, y: targetY },
      );
      if (dir) setGhostDirection(id, dir);
    });
    if (targets.length > 1) selectGhost(selectedGhostId);
  }, [armedGhosts, selectGhost, setGhostDirection]);

  // Keep a stable ref so the frozen panResponder closure always calls the latest version.
  const applyDirectionToArmedRef = useRef(applyDirectionToArmed);
  applyDirectionToArmedRef.current = applyDirectionToArmed;

  const inventoryItems = useMemo(
    () => POWER_UP_ORDER.filter((id) => id !== "hardcoreRevive").slice(0, 8).map((id) => ({
      id,
      def: POWER_UPS[id],
      count: inventory[id] ?? 0,
    })),
    [inventory],
  );
  const activatePowerUp = useCallback((id: PowerUpId) => {
    const applied = applyPowerUp(id);
    if (!applied) return;
    setRunStats((stats) => ({
      ...stats,
      powerUpsUsed: stats.powerUpsUsed + 1,
      hardcoreRevivesUsed: stats.hardcoreRevivesUsed + (id === "hardcoreRevive" ? 1 : 0),
    }));
    if (themeId === "blood-moon" && id !== "hardcoreRevive" && Math.random() < 0.1) return;
    consumeInventory(id);
  }, [applyPowerUp, consumeInventory, themeId]);
  const powerUpIdsForHotkeys = useMemo(
    () => inventoryItems.map((item) => item.id),
    [inventoryItems],
  );

  useGamepad({
    onDirection: (_id, dir) => {
      applyDirectionToArmedRef.current(dir);
    },
    onSelect: (id) => {
      syncSelection([id]);
    },
    onPause: () => {
      const current = stateRef.current.status;
      if (current === "playing" || current === "paused") togglePause();
    },
    onAction: () => {
      const current = stateRef.current;
      if (
        mode === "hardcore" &&
        current.status === "playing" &&
        (inventory.hardcoreRevive ?? 0) > 0 &&
        current.ghosts.some((ghost) => ghost.permaDead)
      ) {
        activatePowerUp("hardcoreRevive");
      }
    },
    getSelectedGhostId: () => stateRef.current.selectedGhostId,
    isGhostSelectable: (id) => stateRef.current.ghosts[id]?.alive ?? false,
    deadzone: gamepadDeadzone,
    invertY: gamepadInvertY,
    enabled: true,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const holdTimers = new Map<GhostId, ReturnType<typeof setTimeout>>();
    const holdTriggered = new Set<GhostId>();

    const confirmExitToMenu = () => window.confirm("Leave this run and return to the main menu?");

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName.toLowerCase();
        if (tag === "input" || tag === "textarea" || target.isContentEditable) return;
      }

      const key = event.key.toLowerCase();
      const dir = STANDARD_DIRECTION_BY_KEY[key];
      if (dir) {
        event.preventDefault();
        if (stateRef.current.status !== "playing") return;
        applyDirectionToArmedRef.current(dir);
        return;
      }

      if (key === "backspace") {
        event.preventDefault();
        if (!confirmExitToMenu()) return;
        abandonRunToMenu();
        return;
      }

      if (key.startsWith("f")) {
        const slot = Number(key.slice(1));
        if (Number.isNaN(slot) || slot < 1 || slot > 8) return;
        event.preventDefault();
        if (stateRef.current.status !== "playing") return;
        const powerUpId = powerUpIdsForHotkeys[slot - 1];
        if (!powerUpId) return;
        activatePowerUp(powerUpId);
        return;
      }

      const ghostId = GHOST_BY_NUMBER_KEY[key];
      if (ghostId == null) return;
      event.preventDefault();
      if (!(stateRef.current.ghosts[ghostId]?.alive ?? false)) return;
      syncSelection([ghostId]);
      if (event.repeat || holdTimers.has(ghostId)) return;
      const timer = setTimeout(() => {
        holdTriggered.add(ghostId);
        selectGhost(ghostId);
        cycleGhostAiRole(ghostId);
      }, 350);
      holdTimers.set(ghostId, timer);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const ghostId = GHOST_BY_NUMBER_KEY[event.key.toLowerCase()];
      if (ghostId == null) return;
      const timer = holdTimers.get(ghostId);
      if (timer) {
        clearTimeout(timer);
        holdTimers.delete(ghostId);
      }
      if (holdTriggered.has(ghostId)) {
        holdTriggered.delete(ghostId);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      holdTimers.forEach((timer) => clearTimeout(timer));
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [
    abandonRunToMenu,
    activatePowerUp,
    cycleGhostAiRole,
    powerUpIdsForHotkeys,
    selectGhost,
    syncSelection,
    setGhostDirection,
  ]);

  const SWIPE_THRESHOLD = 25;
  const isSwipeEnabled = controlMode === "swipe" || controlMode === "both";
  const isTapEnabled = controlMode === "tap" || controlMode === "both";
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) =>
          isSwipeEnabled && (Math.abs(g.dx) > 5 || Math.abs(g.dy) > 5),
        onPanResponderRelease: (_, g) => {
          if (!isSwipeEnabled) return;
          const dx = g.dx;
          const dy = g.dy;
          if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) return;
          const dir: Direction =
            Math.abs(dx) > Math.abs(dy)
              ? dx > 0 ? "right" : "left"
              : dy > 0 ? "down" : "up";
          try {
            Haptics.selectionAsync();
          } catch {}
          applyDirectionToArmedRef.current(dir);
        },
      }),
    [isSwipeEnabled],
  );

  const handleMazeTap = useCallback((event: GestureResponderEvent) => {
    if (!isTapEnabled) return;
    const mazePixelWidth = cellSize * mazeCols;
    const mazePixelHeight = cellSize * mazeRows;
    const xOffset = Math.max(0, (mazeAreaSize.width - mazePixelWidth) / 2);
    const yOffset = Math.max(0, mazeAreaSize.height - mazePixelHeight);
    const localX = event.nativeEvent.locationX - xOffset;
    const localY = event.nativeEvent.locationY - yOffset;
    if (localX < 0 || localY < 0 || localX >= mazePixelWidth || localY >= mazePixelHeight) return;
    const targetX = Math.floor(localX / cellSize);
    const targetY = Math.floor(localY / cellSize);
    if (!isWalkable(stateRef.current.maze, targetX, targetY, false)) return;
    try {
      Haptics.selectionAsync();
    } catch {}
    moveArmedGhostsTowardCell(targetX, targetY);
  }, [cellSize, isTapEnabled, mazeAreaSize.height, mazeAreaSize.width, mazeCols, mazeRows, moveArmedGhostsTowardCell]);

  const activeEffects = useMemo(() => {
    const now = nowMs();
    const list: { key: string; label: string; color: string }[] = [];
    if (state.effects.speedBoostUntil > now) {
      list.push({
        key: "speed",
        label: `SPD ${Math.ceil((state.effects.speedBoostUntil - now) / 1000)}s`,
        color: "#ffd84d",
      });
    }
    if (state.effects.freezeUntil > now) {
      list.push({
        key: "freeze",
        label: `FRZ ${Math.ceil((state.effects.freezeUntil - now) / 1000)}s`,
        color: "#5bc0eb",
      });
    }
    if (state.effects.magnetUntil > now) {
      list.push({
        key: "magnet",
        label: `MAG ${Math.ceil((state.effects.magnetUntil - now) / 1000)}s`,
        color: "#ff477e",
      });
    }
    if (state.effects.revealUntil > now) {
      list.push({
        key: "reveal",
        label: `REV ${Math.ceil((state.effects.revealUntil - now) / 1000)}s`,
        color: "#00ffff",
      });
    }
    if (state.effects.teamPhaseUntil > now) {
      list.push({
        key: "phase",
        label: `PHASE ${Math.ceil((state.effects.teamPhaseUntil - now) / 1000)}s`,
        color: "#c084fc",
      });
    }
    if (state.effects.shieldGhostId != null) {
      list.push({
        key: "shield",
        label: `SH G${state.effects.shieldGhostId + 1}`,
        color: "#9bc53d",
      });
    }
    if (state.effects.fastRespawn) {
      list.push({
        key: "fastRespawn",
        label: "FAST",
        color: "#ff9f1c",
      });
    }
    if (themeId === "dark-knights") {
      list.push({
        key: "oath",
        label: "OATH",
        color: "#facc15",
      });
    }
    return list;
  }, [state.effects, themeId]);
  const ghostToggleItems = useMemo(
    () => state.ghosts.map((ghost) => ({
      ghost,
      armed: armedGhosts.includes(ghost.id),
      selected: state.selectedGhostId === ghost.id,
    })),
    [armedGhosts, state.ghosts, state.selectedGhostId],
  );

  const reviveToken = POWER_UPS.hardcoreRevive;
  const reviveTokenCount = inventory.hardcoreRevive ?? 0;
  const canUseReviveToken =
    mode === "hardcore" &&
    state.status === "playing" &&
    reviveTokenCount > 0 &&
    state.ghosts.some((ghost) => ghost.permaDead);
  const endlessBlessings = getEndlessBlessings();
  const endlessContinueCost = useMemo(() => {
    const tier = endlessContinueCount + 1;
    const base = tier <= 4 ? tier * 25 : 100 + (tier - 4) * 100;
    return endlessBlessings.continueDiscount ? Math.max(1, Math.floor(base * 0.5)) : base;
  }, [endlessBlessings.continueDiscount, endlessContinueCount]);
  const canAffordEndlessContinue = coins >= endlessContinueCost;

  const bonusTimeLeft = state.bonusGame ? bonusTimeRemainingMs(state.bonusGame, nowMs()) : 0;
  const bonusItemsLeft = state.bonusGame ? state.bonusGame.items.filter((i) => !i.collected).length : 0;
  const timeAttackRemainingMs = Math.max(0, TIME_ATTACK_DURATION_MS - elapsedMs);
  const isCompactHud = width < 390;
  const catchesToWin = mode === "endless" && endlessBlessings.quickClear ? 2 : CATCH_TO_WIN;
  const pelletGuyLivesRemaining = Math.max(0, catchesToWin - state.catches);
  const pelletPercentRemaining = Math.round((state.pelletsRemaining / Math.max(1, state.totalPellets)) * 100);
  const modeLabel = mode === "timeattack" ? "TIME ATTACK" : mode.toUpperCase();
  const ghostDeathCap = endlessBlessings.secondWind ? 25 : 20;
  const ghostLivesRemaining = Math.max(0, ghostDeathCap - state.ghostDeathsThisLevel);
  const runTitle: RunTitle = useMemo(() => {
    const perfectRun =
      state.status === "gameOver" &&
      state.message?.includes("YOU BEAT ALL") &&
      runStats.ghostLosses === 0;
    if (perfectRun) return { emoji: "👑", label: "Ghost King" };
    if (state.score >= RUN_MEDAL_THRESHOLDS.gold) return { emoji: "🥇", label: "Nightmare Incarnate" };
    if (state.score >= RUN_MEDAL_THRESHOLDS.silver) return { emoji: "🥈", label: "Master Haunter" };
    return { emoji: "🥉", label: "Restless Spirit" };
  }, [runStats.ghostLosses, state.message, state.score, state.status]);
  const hiddenMedals: HiddenMedal[] = useMemo(() => {
    if (state.status !== "gameOver") return [];
    const medals: HiddenMedal[] = [];
    if (getRunHazardStats().spikeTriggers === 0) medals.push({ emoji: "🧨", label: "Mine Sweeper" });
    if (runStats.ghostLosses === 0) medals.push({ emoji: "👻", label: "Untouchable" });
    if ((bestLevelClearMsRef.current ?? Number.POSITIVE_INFINITY) <= 45000) {
      medals.push({ emoji: "⚡", label: "Speed Haunt" });
    }
    if (runStats.catches > 0 && runStats.powerUpsUsed === 0) medals.push({ emoji: "🎯", label: "Efficient Evil" });
    if (state.lives === 1 && state.message?.includes("YOU BEAT ALL")) medals.push({ emoji: "💀", label: "Last Stand" });
    return medals;
  }, [getRunHazardStats, runStats.catches, runStats.ghostLosses, runStats.powerUpsUsed, state.lives, state.message, state.status]);
  const classicStarSummary = useMemo(() => {
    if (mode !== "classic" || state.status !== "levelWon" || state.bonusGame) return null;
    const noGhostLoss = state.ghostDeathsThisLevel === 0;
    const highPellets = state.pelletsRemaining / Math.max(1, state.totalPellets) >= 0.75;
    return {
      gold: noGhostLoss && highPellets,
      criteria: [
        { label: "Finish the level", earned: true },
        { label: "No ghost losses", earned: noGhostLoss },
        { label: "75%+ pellets left", earned: highPellets },
      ],
    };
  }, [mode, state.bonusGame, state.ghostDeathsThisLevel, state.pelletsRemaining, state.status, state.totalPellets]);
  const submissionStatusText = useMemo(() => {
    if (state.status !== "gameOver" || !submissionState) return null;
    if (submissionState === "pending") return "LEADERBOARD: PENDING SUBMISSION";
    if (submissionState === "submitted") return "LEADERBOARD: SUBMITTED";
    if (submissionState === "offline") return "LEADERBOARD: OFFLINE (WILL NEED RETRY)";
    return mode === "speedrun" || mode === "timeattack"
      ? "LEADERBOARD: INELIGIBLE FOR THIS RUN"
      : "LEADERBOARD: INELIGIBLE FOR THIS MODE";
  }, [mode, state.status, submissionState]);

  return (
    <SafeAreaView style={styles.container}>
      <GameplayErrorBoundary label="gameplay route">
      <View style={styles.gameWrapper} {...panResponder.panHandlers}>
        <View
          style={styles.mazeArea}
          onStartShouldSetResponder={() => isTapEnabled}
          onResponderRelease={handleMazeTap}
          onLayout={(e) =>
            setMazeAreaSize({
              width: e.nativeEvent.layout.width,
              height: e.nativeEvent.layout.height,
            })
          }
        >
          <MazeRenderer
            maze={state.maze}
            ghosts={state.ghosts}
            pelletGuy={state.pelletGuy}
            cellSize={cellSize}
            selectedGhostId={state.selectedGhostId}
            ready={state.status === "ready"}
            level={state.level}
            bonusGame={state.bonusGame}
            highContrast={highContrast}
          />
        </View>
        <View
          style={[styles.footerHud, isCompactHud && styles.footerHudCompact]}
          testID="hud-bottom"
        >
          <View style={styles.miniInfoRow}>
            <View style={styles.miniChip}>
              <Text style={styles.miniChipText}>LEVEL {state.level}</Text>
            </View>
            <View style={styles.miniChip}>
              <Text style={styles.miniChipText}>{modeLabel}</Text>
            </View>
            <View style={styles.miniChip}>
              <Text style={styles.miniChipText}>SPRITEFIX2</Text>
            </View>
            {bonusTutorialText && (
              <View style={[styles.miniChip, styles.miniChipHighlight]}>
                <Text style={styles.miniChipText}>{bonusTutorialText}</Text>
              </View>
            )}
            {mode === "endless" && !!endlessBlessingSummary && (
              <View style={styles.miniChip}>
                <Text style={styles.miniChipText}>BUILD {endlessBlessingSummary}</Text>
              </View>
            )}
            {mode === "speedrun" && (
              <View style={styles.miniChip}>
                <Text style={styles.miniChipText}>
                  TIME {fmtMs(elapsedMs)}{bestRunMs > 0 ? ` · BEST ${fmtMs(bestRunMs)}` : ""}
                </Text>
              </View>
            )}
            {mode === "timeattack" && (
              <View style={styles.miniChip}>
                <Text style={styles.miniChipText}>TIME LEFT {fmtMs(timeAttackRemainingMs)}</Text>
              </View>
            )}
            {state.bonusGame && (
              <View style={styles.miniChip}>
                <Text style={styles.miniChipText}>
                  {BONUS_CONFIG[state.bonusGame.type].label} {bonusItemsLeft} ·{" "}
                  {state.bonusGame.type === "powerHunt"
                    ? (state.bonusGame.huntActiveUntil ?? 0) > nowMs()
                      ? `HUNT ${Math.ceil(((state.bonusGame.huntActiveUntil ?? 0) - nowMs()) / 1000)}s`
                      : "GRAB YELLOW PELLET"
                    : `${Math.ceil(bonusTimeLeft / 1000)}s`}
                </Text>
              </View>
            )}
            {activeEffects.map((effect) => (
              <View key={effect.key} style={[styles.miniChip, { borderColor: effect.color }]}>
                <Text style={[styles.miniChipText, { color: effect.color }]}>{effect.label}</Text>
              </View>
            ))}
          </View>
          <View style={styles.ghostTogglePanel} testID="ghost-toggles">
            <View style={styles.panelHeader}>
              <View style={styles.panelHeaderActionsLeft}>
                <TouchableOpacity
                  onPress={() => { setArmedGhosts([0, 1, 2, 3]); selectGhost(0); }}
                  style={styles.panelActionBtn}
                  testID="ghost-arm-all"
                >
                  <Text style={styles.panelActionText}>ALL</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { setArmedGhosts([0]); selectGhost(0); }}
                  style={styles.panelActionBtn}
                  testID="ghost-arm-reset"
                >
                  <Text style={styles.panelActionText}>RESET</Text>
                </TouchableOpacity>
                {mode === "hardcore" && (
                  <TouchableOpacity
                    onPress={() => activatePowerUp("hardcoreRevive")}
                    style={[
                      styles.panelActionBtn,
                      styles.panelActionBtnRevive,
                      !canUseReviveToken && styles.slotDim,
                    ]}
                    disabled={!canUseReviveToken}
                    testID="hardcore-revive-btn"
                  >
                    <Text style={styles.panelActionTextRevive}>
                      {reviveToken.icon} REVIVE {reviveTokenCount}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.lifePills} testID="hud-lives">
                {mode !== "hardcore" && (
                  <View style={[styles.lifePill, ghostLivesRemaining <= 5 && styles.lowLivesWarning]} testID="hud-ghost-lives">
                    <Text style={styles.lifeCountText}>GHOST {ghostLivesRemaining}/{ghostDeathCap}</Text>
                  </View>
                )}
                <View style={[styles.lifePill, pelletGuyLivesRemaining <= 1 && styles.lowLivesWarning]} testID="hud-pellet-lives">
                  <Text style={styles.lifeCountText}>PELLET GUY {pelletGuyLivesRemaining}/{catchesToWin}</Text>
                </View>
              </View>
            </View>
            <View style={styles.ghostToggleRow}>
              {ghostToggleItems.map(({ ghost, armed, selected }) => (
                <TouchableOpacity
                  key={ghost.id}
                  onPress={() => toggleGhostArm(ghost.id)}
                  onLongPress={() => {
                    selectGhost(ghost.id);
                    cycleGhostAiRole(ghost.id);
                  }}
                  style={[
                    styles.ghostToggle,
                    { borderColor: ghost.color },
                    armed && styles.ghostToggleArmed,
                    selected && styles.ghostToggleSelected,
                  ]}
                  testID={`ghost-toggle-${ghost.id}`}
                >
                  <Text style={[styles.ghostToggleIndex, { color: armed ? ghost.color : "#7d88a8" }]}>
                    G{ghost.id + 1}
                  </Text>
                  <Text style={[styles.ghostToggleRole, selected && styles.ghostToggleRoleSelected]}>
                    {GHOST_ROLE_LABELS[ghost.aiRole]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={[styles.slotRow, isCompactHud && styles.slotRowCompact]} testID="hud-items">
            {inventoryItems.map(({ id, def, count }) => {
              const playable = state.status === "playing" && count > 0;
              return (
                <TouchableOpacity
                  key={id}
                  onPress={() => activatePowerUp(id)}
                  style={[
                    styles.slot,
                    { borderColor: def.color },
                    count === 0 && styles.slotDim,
                  ]}
                  disabled={!playable}
                  testID={`inventory-${id}`}
                >
                  <Text style={styles.slotIcon}>{def.icon}</Text>
                  <Text style={[styles.slotCount, { color: count > 0 ? def.color : "#7d88a8" }]}>
                    {count}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={[styles.controlRow, isCompactHud && styles.controlRowCompact]} testID="hud-controls">
            <View style={[styles.scorePill, isCompactHud && styles.scorePillCompact]} testID="hud-score">
              <Text style={[styles.scorePillLabel, largeHud && styles.scorePillLabelLarge]}>SCORE</Text>
              <Text style={[styles.scorePillValue, largeHud && styles.scorePillValueLarge]}>{state.score}</Text>
            </View>
            <View style={styles.pelletPill}>
              <Text style={styles.scorePillLabel}>PELLETS</Text>
              <Text style={styles.pelletPillValue}>
                {state.pelletsRemaining}/{state.totalPellets}/{pelletPercentRemaining}%
              </Text>
            </View>
            {(state.status === "playing" || state.status === "paused" || state.status === "ready") && (
              <TouchableOpacity
                onPress={togglePause}
                style={[styles.pauseBtn, isCompactHud && styles.compactBtn]}
                testID="pause-btn"
              >
                <Text style={styles.pauseText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.9}>
                  {state.status === "paused" ? "RESUME" : "PAUSE"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {(state.status === "levelWon" || state.status === "levelLost" || state.status === "gameOver") && (
            <View style={styles.stateActions}>
              {classicStarSummary && (
                <View style={styles.starSummaryCard}>
                  <Text style={styles.starSummaryTitle}>
                    {classicStarSummary.gold ? "GOLD STAR RUN" : "LEVEL STARS"}
                  </Text>
                  {classicStarSummary.criteria.map((criterion) => (
                    <Text key={criterion.label} style={styles.starSummaryText}>
                      {criterion.earned ? "★" : "☆"} {criterion.label}
                    </Text>
                  ))}
                </View>
              )}
              {state.status === "levelWon" && (
                <TouchableOpacity
                  onPress={() => {
                    if (mode === "endless" && endlessBlessingChoices.length > 0) return;
                    advanceLevel();
                  }}
                  style={styles.stateBtn}
                  testID="next-level-btn"
                >
                  <Text style={styles.stateBtnText}>
                    {mode === "endless" && endlessBlessingChoices.length > 0
                      ? "CHOOSE BLESSING"
                      : mode !== "endless" && state.level >= MAX_LEVELS
                        ? "FINISH!"
                        : "NEXT LEVEL"}
                  </Text>
                </TouchableOpacity>
              )}
              {state.status === "levelLost" && (
                <TouchableOpacity onPress={retryLevel} style={styles.stateBtn} testID="retry-level-btn">
                  <Text style={styles.stateBtnText}>RETRY LEVEL</Text>
                </TouchableOpacity>
              )}
              {state.status === "gameOver" && (
                <>
                  {submissionStatusText && (
                    <View style={styles.submissionStateCard} testID="leaderboard-submission-state">
                      <Text style={styles.submissionStateText}>{submissionStatusText}</Text>
                    </View>
                  )}
                  <TouchableOpacity onPress={startNewGame} style={styles.stateBtn} testID="new-game-btn">
                    <Text style={styles.stateBtnText}>NEW GAME</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => router.replace("/")} style={styles.stateBtn} testID="exit-btn">
                    <Text style={styles.stateBtnText}>EXIT</Text>
                  </TouchableOpacity>
                  {mode === "endless" && (
                    <TouchableOpacity
                      onPress={() => {
                        const paid = spendCoins(endlessContinueCost, { ignoreInfiniteCoins: true });
                        if (!paid) {
                          setStatusToast(`NEED ${endlessContinueCost} COINS`);
                          setTimeout(() => setStatusToast((current) => (current?.startsWith("NEED ") ? null : current)), 1400);
                          return;
                        }
                        const continued = continueEndlessRun();
                        if (!continued) return;
                        setEndlessContinueCount((count) => count + 1);
                        setStatusToast(`CONTINUE -${endlessContinueCost} COINS`);
                        setTimeout(() => setStatusToast((current) => (current?.startsWith("CONTINUE ") ? null : current)), 1400);
                      }}
                      style={[styles.stateBtn, !canAffordEndlessContinue && styles.slotDim]}
                      disabled={!canAffordEndlessContinue}
                      testID="endless-continue-btn"
                    >
                      <Text style={styles.stateBtnText}>CONTINUE ({endlessContinueCost} COINS)</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          )}
          {mode === "endless" && state.status === "levelWon" && endlessBlessingChoices.length > 0 && (
            <View style={styles.blessingPanel}>
              <Text style={styles.blessingTitle}>MILESTONE BLESSING — PICK ONE</Text>
              {endlessBlessingChoices.map((choice) => (
                <TouchableOpacity
                  key={choice.id}
                  style={styles.blessingBtn}
                  onPress={() => {
                    const ok = grantEndlessBlessing(choice.id);
                    if (!ok) return;
                    setEndlessBlessingChoices([]);
                    advanceLevel();
                  }}
                  testID={`endless-blessing-${choice.id}`}
                >
                  <Text style={styles.blessingBtnLabel}>{choice.label}</Text>
                  <Text style={styles.blessingBtnSub}>{choice.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {state.status === "gameOver" && (state.pelletsRemaining <= 12 || state.catches >= 2) && (
            <View style={styles.almostCard}>
              <Text style={styles.almostText}>
                {state.pelletsRemaining <= 12
                  ? `ALMOST HAD IT — ${state.pelletsRemaining} PELLETS LEFT`
                  : `${Math.max(0, 3 - state.catches)} CATCH FROM CLEAR`}
              </Text>
            </View>
          )}
        </View>
      </View>

      {runtimeSettings.devMode && (
        <>
          <TouchableOpacity
            onPress={() => setDevPanelOpen((value) => !value)}
            style={styles.devFab}
            testID="dev-panel-toggle"
          >
            <Text style={styles.devFabText}>{devPanelOpen ? "HIDE DEV" : "DEV"}</Text>
          </TouchableOpacity>
          {devPanelOpen && (
            <View style={styles.devPanel} testID="dev-panel">
              <Text style={styles.devPanelTitle}>DEV MODE</Text>
              <View style={styles.devPanelRow}>
                <TouchableOpacity
                  onPress={() => {
                    earnCoins(1000);
                    setStatusToast("DEV: +1000 COINS");
                  }}
                  style={styles.devBtn}
                >
                  <Text style={styles.devBtnText}>+1000 COINS</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    devDefeatPelletGuy();
                  }}
                  style={styles.devBtn}
                >
                  <Text style={styles.devBtnText}>KILL PELLET GUY</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    devDefeatGhost();
                  }}
                  style={styles.devBtn}
                >
                  <Text style={styles.devBtnText}>KILL SELECTED GHOST</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </>
      )}

      {unlockToast && (
        <View style={styles.unlockToast} pointerEvents="none">
          <Text style={styles.unlockToastText}>{unlockToast}</Text>
        </View>
      )}
      {(statusToast || state.status === "paused") && (
        <View style={styles.messageOverlay} pointerEvents="none" testID="status-message">
          <Text style={styles.messageText}>{state.status === "paused" ? "PAUSED" : statusToast}</Text>
        </View>
      )}

      {/* Run-stats HUD: shown inline on game-over toast */}
      {state.status === "gameOver" && (
        <Animated.View
          style={[
            styles.unlockToast,
            {
              top: 80,
              opacity: runStatsAnim,
              transform: [{ translateY: runStatsAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
            },
          ]}
          pointerEvents="none"
        >
          <View style={[styles.runStatsCard, mode === "hardcore" && styles.runStatsCardHardcore]} testID="hud-run-stats">
            <Animated.View
              style={{
                transform: [
                  { scale: runMedalAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
                  { rotate: runMedalAnim.interpolate({ inputRange: [0, 1], outputRange: ["-240deg", "0deg"] }) },
                ],
              }}
            >
              <Text style={styles.runStatsMedal}>{runTitle.emoji} {runTitle.label}</Text>
            </Animated.View>
            {mode === "hardcore" ? (
              <>
                <Text style={styles.runStatsTitle}>HARDCORE RUN</Text>
                <Text style={styles.runStatsText}>Level Reached: {state.level}</Text>
                <Text style={styles.runStatsText}>Final Score: {state.score}</Text>
                <Text style={styles.runStatsText}>Time Survived: {fmtMs(hardcoreSurvivalMs)}</Text>
                <Text style={styles.runStatsText}>Best Survival: {fmtMs(bestHardcoreSurvivalMs)}</Text>
                <Text style={styles.runStatsText}>
                  PB Delta: {hardcoreDeltaMs == null ? "NEW RUN" : fmtDeltaMs(hardcoreDeltaMs)}
                </Text>
                <Text style={styles.runStatsText}>Revives Used: {runStats.hardcoreRevivesUsed}</Text>
                <Text style={styles.runStatsText}>Catches: {runStats.catches}</Text>
                <Text style={styles.runStatsText}>Bonus Clears: {runStats.bonusClears}</Text>
              </>
            ) : (
              <>
                <Text style={styles.runStatsTitle}>{mode === "timeattack" ? "TIME ATTACK" : "RUN STATS"}</Text>
                <Text style={styles.runStatsText}>Catches: {runStats.catches}</Text>
                <Text style={styles.runStatsText}>Longest Combo: {runStats.longestCombo}</Text>
                <Text style={styles.runStatsText}>Ghost Losses: {runStats.ghostLosses}</Text>
                <Text style={styles.runStatsText}>Power-Ups: {runStats.powerUpsUsed}</Text>
                <Text style={styles.runStatsText}>Bonus Clears: {runStats.bonusClears}</Text>
                {mode === "timeattack" && <Text style={styles.runStatsText}>Final Score: {state.score}</Text>}
              </>
            )}
            {hiddenMedals.length > 0 && (
              <>
                <Text style={styles.hiddenMedalTitle}>HIDDEN MEDALS</Text>
                <Text style={styles.hiddenMedalText}>
                  {hiddenMedals.map((medal) => `${medal.emoji} ${medal.label}`).join("  ·  ")}
                </Text>
              </>
            )}
          </View>
        </Animated.View>
      )}
      </GameplayErrorBoundary>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a12" },
  errorPanel: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    gap: 10,
    backgroundColor: "#120b16",
  },
  errorTitle: {
    color: "#ffd6f5",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 1,
  },
  errorSubtitle: {
    color: "#f0abfc",
    fontSize: 12,
    fontWeight: "700",
  },
  errorBody: {
    color: "#fff1fb",
    fontSize: 12,
    textAlign: "center",
  },
  gameWrapper: { flex: 1, flexDirection: "column" },
  mazeArea: { flex: 1, alignItems: "center", justifyContent: "flex-end", paddingBottom: 2 },
  footerHud: {
    paddingHorizontal: 8,
    paddingBottom: 8,
    paddingTop: 2,
    gap: 4,
  },
  footerHudCompact: {
    paddingHorizontal: 6,
    gap: 4,
  },
  miniInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
    paddingHorizontal: 8,
  },
  miniChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#303a60",
    backgroundColor: "#171d31",
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  miniChipHighlight: {
    borderColor: "#f0abfc",
    backgroundColor: "#2b1a40",
  },
  miniChipText: { color: "#e6ebff", fontSize: 8, fontWeight: "900", letterSpacing: 0.3 },
  ghostTogglePanel: {
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#101426dd",
    borderWidth: 1,
    borderColor: "#2b3357",
  },
  panelHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  panelHeaderActionsLeft: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "nowrap" },
  panelHeaderActions: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "flex-end", flex: 1 },
  panelActionBtn: {
    borderWidth: 1,
    borderColor: "#4a5580",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    backgroundColor: "#12172d",
  },
  panelActionText: { color: "#c8d0f0", fontSize: 9, fontWeight: "900", letterSpacing: 0.5 },
  panelActionBtnRevive: { borderColor: "#ff7dc4", backgroundColor: "#2a1023" },
  panelActionTextRevive: { color: "#ffb7de", fontSize: 9, fontWeight: "900", letterSpacing: 0.4 },
  panelLabel: { color: "#95a2c8", fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  lifePills: { flexDirection: "row", alignItems: "center", gap: 4, marginLeft: 2, paddingRight: 2, flexWrap: "wrap" },
  lifePill: {
    backgroundColor: "#171d31",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#303a60",
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  lowLivesWarning: { backgroundColor: "#4a1020", borderRadius: 999, paddingHorizontal: 4, paddingVertical: 1 },
  lifeHeart: { color: "#ff6b9a", fontSize: 13, fontWeight: "900" },
  lifeHeartEmpty: { color: "#5d3550" },
  lifeCountText: { color: "#f7fbff", fontSize: 10, fontWeight: "900", letterSpacing: 0.6 },
  ghostToggleRow: { flexDirection: "row", flexWrap: "nowrap", justifyContent: "space-between", gap: 4 },
  ghostToggle: {
    width: "24%",
    borderRadius: 7,
    borderWidth: 1.2,
    backgroundColor: "#12172d",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 34,
    paddingVertical: 4,
    opacity: 0.6,
  },
  ghostToggleArmed: {
    backgroundColor: "#18213d",
    opacity: 1,
  },
  ghostToggleSelected: {
    borderWidth: 2,
    transform: [{ translateY: -1 }],
  },
  ghostToggleIndex: { fontSize: 9, fontWeight: "900", letterSpacing: 0.4 },
  ghostToggleName: { fontSize: 9, fontWeight: "800", marginTop: 2 },
  ghostToggleRole: { fontSize: 7, fontWeight: "900", color: "#7d88a8", marginTop: 1, letterSpacing: 0.2 },
  ghostToggleRoleSelected: { color: "#ffe082" },
  slotRow: {
    flexDirection: "row",
    flexWrap: "nowrap",
    justifyContent: "space-between",
    gap: 4,
  },
  slotRowCompact: {
    gap: 4,
  },
  slot: {
    flexBasis: "12%",
    maxWidth: "12%",
    minWidth: 34,
    height: 38,
    borderRadius: 8,
    borderWidth: 1.2,
    backgroundColor: "#12172d",
    alignItems: "center",
    justifyContent: "center",
  },
  slotDim: { opacity: 0.4 },
  slotIcon: { fontSize: 14, lineHeight: 14 },
  slotCount: { fontSize: 9, fontWeight: "900", marginTop: 1 },
  controlRow: { flexDirection: "row", alignItems: "stretch", justifyContent: "space-between", flexWrap: "nowrap", gap: 6 },
  controlRowCompact: { gap: 4 },
  scorePill: {
    minWidth: 100,
    borderWidth: 1,
    borderColor: "#FFD23F",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#1d1d2f",
    justifyContent: "center",
  },
  scorePillCompact: { minWidth: 92, paddingHorizontal: 8, paddingVertical: 5 },
  scorePillLabel: { color: "#95a2c8", fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  scorePillLabelLarge: { fontSize: 11 },
  scorePillValue: {
    color: "#FFD23F",
    fontSize: 15,
    fontWeight: "900",
    marginTop: 1,
    fontVariant: ["tabular-nums"],
  },
  scorePillValueLarge: { fontSize: 21 },
  pelletPill: {
    minWidth: 98,
    borderWidth: 1,
    borderColor: "#4a5580",
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 6,
    backgroundColor: "#1d1d2f",
    justifyContent: "center",
  },
  pelletPillValue: {
    color: "#f7fbff",
    fontSize: 11,
    fontWeight: "900",
    marginTop: 1,
    fontVariant: ["tabular-nums"],
    letterSpacing: 0.2,
  },
  pauseBtn: {
    borderWidth: 1,
    borderColor: "#ffff66",
    borderRadius: 8,
    minWidth: 104,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#1d1d2f",
    alignItems: "center",
    justifyContent: "center",
  },
  compactBtn: { paddingHorizontal: 12, paddingVertical: 7 },
  actionBtn: {
    borderWidth: 2,
    borderColor: "#ff4466",
    borderRadius: 8,
    minWidth: 108,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#2a0010",
    alignItems: "center",
    justifyContent: "center",
  },
  pauseText: { color: "#FFFF66", fontWeight: "900", letterSpacing: 1 },
  stateActions: { flexDirection: "row", gap: 8, flexWrap: "wrap", alignItems: "stretch" },
  submissionStateCard: {
    minWidth: 210,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#4f9cff",
    backgroundColor: "#102040",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  submissionStateText: { color: "#cbe2ff", fontWeight: "900", fontSize: 10, letterSpacing: 0.6 },
  starSummaryCard: {
    minWidth: 180,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ffd54a",
    backgroundColor: "#2c2411",
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  starSummaryTitle: { color: "#ffe082", fontWeight: "900", fontSize: 10, letterSpacing: 1 },
  starSummaryText: { color: "#fff7dc", fontWeight: "800", fontSize: 10, lineHeight: 15 },
  runStatsCard: {
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#3e4b79",
    backgroundColor: "#11162a",
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 180,
  },
  runStatsCardHardcore: {
    minWidth: 240,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  runStatsTitle: { color: "#9fc4ff", fontWeight: "900", fontSize: 11, marginBottom: 4, letterSpacing: 0.8 },
  runStatsMedal: { color: "#ffe08a", fontWeight: "900", fontSize: 11, marginBottom: 6, letterSpacing: 0.6 },
  runStatsText: { color: "#d7def3", fontWeight: "800", fontSize: 10, lineHeight: 15 },
  hiddenMedalTitle: { color: "#d9c7ff", fontWeight: "900", fontSize: 9, marginTop: 6, marginBottom: 2, letterSpacing: 0.7 },
  hiddenMedalText: { color: "#f3e8ff", fontWeight: "800", fontSize: 9, lineHeight: 14 },
  blessingPanel: {
    marginTop: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#4c5fb8",
    backgroundColor: "#121a34",
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  blessingTitle: { color: "#d8e2ff", fontWeight: "900", fontSize: 10, letterSpacing: 0.8 },
  blessingBtn: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#6f86ff",
    backgroundColor: "#1a2550",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  blessingBtnLabel: { color: "#f0f4ff", fontWeight: "900", fontSize: 10, letterSpacing: 0.6 },
  blessingBtnSub: { color: "#b7c4ea", fontWeight: "700", fontSize: 9, marginTop: 1 },
  almostCard: {
    marginTop: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#8a6d28",
    backgroundColor: "#2a220f",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  almostText: { color: "#ffe7a4", fontWeight: "900", fontSize: 10, letterSpacing: 0.4 },
  stateBtn: {
    borderWidth: 1,
    borderColor: "#FFD23F",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#1a1a2a",
  },
  stateBtnText: { color: "#FFD23F", fontWeight: "900", letterSpacing: 1 },
  messageOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "44%",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  devFab: {
    position: "absolute",
    left: 10,
    top: 18,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#ff8fab",
    backgroundColor: "#4a1020f2",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  devFabText: {
    color: "#fff1f4",
    fontWeight: "900",
    fontSize: 10,
    letterSpacing: 0.8,
  },
  devPanel: {
    position: "absolute",
    left: 10,
    top: 54,
    backgroundColor: "#3a0718f2",
    borderColor: "#ff8fab",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
    width: 180,
  },
  devPanelTitle: {
    color: "#ffd6de",
    fontWeight: "900",
    fontSize: 11,
    letterSpacing: 1.2,
  },
  devPanelRow: {
    flexDirection: "column",
    gap: 8,
  },
  devBtn: {
    borderWidth: 1,
    borderColor: "#ffb3c7",
    borderRadius: 8,
    paddingVertical: 8,
    backgroundColor: "#62122af0",
    alignItems: "center",
  },
  devBtnText: {
    color: "#fff1f4",
    fontWeight: "900",
    fontSize: 10,
    letterSpacing: 0.6,
    textAlign: "center",
  },
  unlockToast: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 18,
    alignItems: "center",
  },
  unlockToastText: {
    color: "#fef9c3",
    fontWeight: "900",
    fontSize: 13,
    letterSpacing: 1.1,
    backgroundColor: "#2b1a40f0",
    borderColor: "#f0abfc",
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  messageText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 20,
    letterSpacing: 2,
    textAlign: "center",
    backgroundColor: "#060816f0",
    borderWidth: 1,
    borderColor: "#6b7cff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
});
