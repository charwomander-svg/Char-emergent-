// Main game state hook - manages the entire game logic
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ActiveEffects,
  CellType,
  Direction,
  GameState,
  Ghost,
  GhostAiRole,
  GhostId,
  PelletGuy,
} from "./types";
import {
  CATCH_TO_WIN,
  COLORS,
  COMBO_WINDOW_MS,
  READY_DURATION_MS,
  RESPAWN_MS,
  RESPAWN_DEATH_STEP,
  RESPAWN_MAX_MULTIPLIER,
  SCORE_CATCH,
  SCORE_COMBO_BONUS,
  SCORE_PER_PERCENT_REMAINING,
  SCORE_GHOST_EAT,
  SCORE_SHINY_CATCH,
  SUPER_PELLET_RESPAWN_MS,
  SHINY_DURATION_MS,
  SHINY_PELLET_GUY_SPEED_MULTIPLIER,
  SHINY_ROLL_INTERVAL_MS,
  SHINY_SPAWN_CHANCE,
  SPEED,
  STARTING_LIVES,
  SUPER_PELLET_DURATION_MS,
  TRAP_DROP_BASE_CHANCE,
  TRAP_DROP_LEVEL_BOOST,
  TRAP_DROP_MAX_CHANCE,
  MAX_ACTIVE_TRAPS,
  BARRICADE_DURATION_MS,
  SPIKE_PROBABILITY,
  SCORE_SPIKED_GHOST_PENALTY,
  MAX_LEVELS,
} from "./constants";
import { generateMaze, isWalkable } from "./maze";
import { applyDirection, chooseGhostHuntDirection, choosePelletGuyDirection, opposite } from "./ai";
import { getMusicTrackForLevel, getSoundEngine } from "./sounds";
import {
  loadProgress,
  saveProgress,
  getTheme,
  ProgressData,
  withUnlockedThemes,
  mergeLevelStarRecord,
  getTotalGoldStars,
} from "./progress";
import type { PowerUpId } from "./powerups";
import { COIN_REWARD } from "./economy";
import { loadSettings } from "./settings";
import {
  isBonusLevel,
  getBonusGameType,
  createBonusGame,
  tickBonusGame,
  BONUS_CONFIG,
} from "./bonusGame";
import {
  queueAchievementUnlock,
  recordClassicLevelBest,
  submitTotalGoldStarsLifetime,
  syncProgressAchievements,
} from "./playGames";
import { updateStatistics } from "./statistics";

export type EndlessBlessingId =
  | "hunterInstinct"
  | "slowArena"
  | "ghostOverdrive"
  | "extraLife"
  | "continueDiscount"
  | "quickClear";
export interface EndlessBlessingsState {
  hunterInstinct: number;
  slowArena: number;
  ghostOverdrive: number;
  secondWind: boolean;
  continueDiscount: boolean;
  quickClear: boolean;
}
export interface RunHazardStats {
  spikeTriggers: number;
}
const EMPTY_EFFECTS: ActiveEffects = {
  speedBoostUntil: 0,
  freezeUntil: 0,
  magnetUntil: 0,
  revealUntil: 0,
  shieldGhostId: null,
  fastRespawn: false,
  decoy: null,
  teamPhaseUntil: 0,
  spikeArmUntilByCell: {},
};
const MARATHON_PELLET_DROP_CHANCE = 0.015;

function createInitialGhosts(
  spawns: { x: number; y: number }[],
  themeId: string,
  eliminatedGhostIds: GhostId[] = [],
): Ghost[] {
  const theme = getTheme(themeId);
  const defaultRoles: GhostAiRole[] = ["hunter", "ambusher", "patrol", "cautious"];
  return [0, 1, 2, 3].map((id) => {
    const ghostId = id as GhostId;
    const eliminated = eliminatedGhostIds.includes(ghostId);
    return {
      id: ghostId,
      color: theme.ghostColors[id],
      name: COLORS.ghostNames[id],
      x: spawns[id].x,
      y: spawns[id].y,
      spawnX: spawns[id].x,
      spawnY: spawns[id].y,
      direction: (["left", "right", "up", "down"] as Direction[])[id],
      nextDirection: (["left", "right", "up", "down"] as Direction[])[id],
      vulnerable: false,
      vulnerableUntil: 0,
      alive: !eliminated,
      permaDead: eliminated,
      respawnAt: eliminated ? Number.POSITIVE_INFINITY : 0,
      aiRole: defaultRoles[id],
    };
  });
}

function createInitialPelletGuy(spawn: { x: number; y: number }): PelletGuy {
  return {
    x: spawn.x,
    y: spawn.y,
    spawnX: spawn.x,
    spawnY: spawn.y,
    direction: "left",
    alive: true,
    respawnAt: 0,
  };
}

function buildInitialState(
  level: number,
  lives: number,
  score: number,
  themeId: string,
  daily?: { seed: number; seedDate: string } | null,
  eliminatedGhostIds: GhostId[] = [],
): GameState {
  let { maze, ghostSpawns, pelletGuySpawn, totalPellets } = generateMaze(
    level,
    daily?.seed,
  );
  const bonusActive = isBonusLevel(level);
  if (bonusActive) {
    let convertedSuperPellets = 0;
    maze = maze.map((row) =>
      row.map((cell) => {
        if (cell === 3) {
          convertedSuperPellets++;
          return 2;
        }
        return cell;
      }),
    );
    totalPellets += convertedSuperPellets;
  }
  const now = performance.now();
  const bonusGame = bonusActive
    ? createBonusGame(getBonusGameType(level), maze, now)
    : null;
  const adjustedBonusGame = bonusGame && themeId === "royal-haunts"
    ? {
        ...bonusGame,
        durationMs: bonusGame.durationMs + 1000,
        endsAt: bonusGame.endsAt + 1000,
      }
    : bonusGame;
  const initialEffects: ActiveEffects = {
    ...EMPTY_EFFECTS,
    speedBoostUntil: themeId === "rainbow" ? now + 3000 : 0,
  };
  return {
    status: "ready",
    level,
    lives,
    score,
    catches: 0,
    totalPellets,
    pelletsRemaining: totalPellets,
    maze,
    ghosts: createInitialGhosts(ghostSpawns, themeId, eliminatedGhostIds),
    pelletGuy: createInitialPelletGuy(pelletGuySpawn),
    lastComboTime: 0,
    comboCount: 0,
    message: bonusActive
      ? `🎮 BONUS STAGE! 🎮\n${BONUS_CONFIG[getBonusGameType(level)].label}`
      : `LEVEL ${level}`,
    selectedGhostId: ([0, 1, 2, 3] as GhostId[]).find((id) => !eliminatedGhostIds.includes(id)) ?? 0,
    barricades: [],
    ghostDeathsThisLevel: 0,
    effects: initialEffects,
    bonusGame: adjustedBonusGame,
  };
}

function computeRespawnDelay(priorDeaths: number, fastRespawn = false): number {
  const mult = Math.min(
    RESPAWN_MAX_MULTIPLIER,
    1 + priorDeaths * RESPAWN_DEATH_STEP,
  );
  const base = fastRespawn ? RESPAWN_MS * 0.5 : RESPAWN_MS;
  return base * mult;
}

// Speed scaling per level
function speedScale(level: number): number {
  // Levels 1–10: steep ramp  (1.0 → 0.55)
  // Levels 11–50: gentler ramp (0.55 → 0.31)
  if (level <= 10) return Math.max(0.55, 1 - (level - 1) * 0.05);
  return Math.max(0.31, 0.55 - (level - 10) * 0.006);
}

function manhattan(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function findSafePelletGuyRespawn(
  maze: CellType[][],
  pelletGuy: PelletGuy,
  ghosts: Ghost[],
): { x: number; y: number } {
  const livingGhosts = ghosts.filter((ghost) => ghost.alive);
  const candidates: { x: number; y: number; nearestGhost: number; spawnDistance: number }[] = [];

  for (let y = 0; y < maze.length; y++) {
    for (let x = 0; x < maze[0].length; x++) {
      if (!isWalkable(maze, x, y, true)) continue;
      const pos = { x, y };
      const nearestGhost = livingGhosts.length > 0
        ? Math.min(...livingGhosts.map((ghost) => manhattan(pos, ghost)))
        : Infinity;
      candidates.push({
        x,
        y,
        nearestGhost,
        spawnDistance: manhattan(pos, { x: pelletGuy.spawnX, y: pelletGuy.spawnY }),
      });
    }
  }

  candidates.sort((a, b) =>
    b.nearestGhost - a.nearestGhost ||
    a.spawnDistance - b.spawnDistance,
  );

  const best = candidates[0];
  return best ? { x: best.x, y: best.y } : { x: pelletGuy.spawnX, y: pelletGuy.spawnY };
}

export function useGhostMaze(opts?: {
  mode?: "classic" | "daily" | "custom" | "speedrun" | "hardcore" | "endless" | "timeattack";
  dailySeed?: number;
  dailySeedDate?: string;
  startingLevel?: number;
  onCoinsEarned?: (n: number, reason: "levelClear") => void;
}) {
  const themeIdRef = useRef<string>("classic");
  const progressRef = useRef<ProgressData | null>(null);
  const modeRef = useRef<"classic" | "daily" | "custom" | "speedrun" | "hardcore" | "endless" | "timeattack">(opts?.mode ?? "classic");
  const musicEnabledRef = useRef<boolean>(true);
  const hardcoreEliminatedRef = useRef<GhostId[]>([]);
  const oathShieldAvailableRef = useRef(false);
  const firstBarricadeSkippedRef = useRef(false);
  const firstFastRespawnUsedRef = useRef(false);
  const firstFreezeBoostUsedRef = useRef(false);
  const lastSpectreRollRef = useRef(0);
  const lastMonoRollRef = useRef(0);
  const lastCatchAtRef = useRef(performance.now());
  const dailyRef = useRef<{ seed: number; seedDate: string } | null>(
    opts?.dailySeed != null
      ? { seed: opts.dailySeed, seedDate: opts.dailySeedDate ?? "" }
      : null,
  );
  const onCoinsEarnedRef = useRef(opts?.onCoinsEarned);
  onCoinsEarnedRef.current = opts?.onCoinsEarned;
  const controlledGhostIdsRef = useRef<GhostId[]>([0]);
  const initialLevel = Math.max(1, opts?.startingLevel ?? 1);

  const [state, setState] = useState<GameState>(() =>
    buildInitialState(initialLevel, STARTING_LIVES, 0, "classic", dailyRef.current),
  );

  // Load saved progress (theme + stats) on mount
  useEffect(() => {
    loadProgress().then((p) => {
      progressRef.current = p;
      void submitTotalGoldStarsLifetime(getTotalGoldStars(p));
      themeIdRef.current = p.selectedThemeId;
      oathShieldAvailableRef.current = p.selectedThemeId === "dark-knights";
      setState((cur) => {
        if (cur.status !== "ready" || cur.level !== initialLevel || cur.score !== 0) return cur;
        return buildInitialState(
          initialLevel,
          STARTING_LIVES,
          0,
          p.selectedThemeId,
          dailyRef.current,
          [],
        );
      });
    });
  }, [initialLevel]);

  useEffect(() => {
    loadSettings().then((s) => {
      getSoundEngine().setEnabled(!!s.soundOn);
      getSoundEngine().setVolumes({ sfx: s.sfxVolume, music: s.musicVolume });
      musicEnabledRef.current = !!s.musicOn && !!s.soundOn;
    });
  }, [startLevel]);

  // entity tick timers stored in refs (don't trigger rerenders)
  const lastGhostMoveRef = useRef<number[]>([0, 0, 0, 0]);
  const lastPelletGuyMoveRef = useRef<number>(0);
  const lastBonusTickRef = useRef<number>(0);
  const shinyPelletUntilRef = useRef<number>(0);
  const nextShinyRollAtRef = useRef<number>(0);
  const superPelletRespawnAtRef = useRef<Record<string, number>>({});
  const readyStartRef = useRef<number>(performance.now());
  const rafRef = useRef<number | null>(null);
  const stateRef = useRef<GameState>(state);
  stateRef.current = state;
  // Ghost-house exit stagger
  const ghostReleaseAtRef = useRef<number[]>([0, 0, 0, 0]);
  const levelStartScoreRef = useRef<number>(0);
  const runHazardStatsRef = useRef<RunHazardStats>({ spikeTriggers: 0 });
  const endlessBlessingsRef = useRef<EndlessBlessingsState>({
    hunterInstinct: 0,
    slowArena: 0,
    ghostOverdrive: 0,
    secondWind: false,
    continueDiscount: false,
    quickClear: false,
  });

  const startLevel = useCallback((level: number, lives: number, score: number) => {
    const fresh = buildInitialState(
      level,
      lives,
      score,
      themeIdRef.current,
      dailyRef.current,
      modeRef.current === "hardcore" ? hardcoreEliminatedRef.current : [],
    );
    readyStartRef.current = performance.now();
    lastGhostMoveRef.current = [0, 0, 0, 0];
    lastPelletGuyMoveRef.current = 0;
    lastBonusTickRef.current = 0;
    shinyPelletUntilRef.current = 0;
    nextShinyRollAtRef.current = performance.now() + 8000;
    superPelletRespawnAtRef.current = {};
    ghostReleaseAtRef.current = [0, 0, 0, 0];
    levelStartScoreRef.current = score;
    firstBarricadeSkippedRef.current = false;
    firstFastRespawnUsedRef.current = false;
    firstFreezeBoostUsedRef.current = false;
    lastSpectreRollRef.current = 0;
    lastMonoRollRef.current = 0;
    lastCatchAtRef.current = performance.now();
    setState(fresh);
  }, []);

  const startNewGame = useCallback(() => {
    hardcoreEliminatedRef.current = [];
    oathShieldAvailableRef.current = themeIdRef.current === "dark-knights";
    endlessBlessingsRef.current = {
      hunterInstinct: 0,
      slowArena: 0,
      ghostOverdrive: 0,
      secondWind: false,
      continueDiscount: false,
      quickClear: false,
    };
    runHazardStatsRef.current = { spikeTriggers: 0 };
    startLevel(1, STARTING_LIVES, 0);
  }, [startLevel]);

  // Set ghost direction (queued for next intersection)
  const setGhostDirection = useCallback(
    (ghostId: GhostId, dir: Direction) => {
      setState((prev) => {
        if (prev.status !== "playing") return prev;
        const ghost = prev.ghosts[ghostId];
        if (!ghost.alive) return prev;
        // Try to apply immediately if possible (instant reverse / change)
        const next = applyDirection(ghost.x, ghost.y, dir);
        const phased = prev.effects.teamPhaseUntil > performance.now();
        const canApply = phased
          ? next.y >= 0 && next.y < prev.maze.length && next.x >= 0 && next.x < prev.maze[0].length && prev.maze[next.y][next.x] !== 1
          : isWalkable(prev.maze, next.x, next.y, false);
        const ghosts = prev.ghosts.map((g, i) =>
          i === ghostId
            ? {
                ...g,
                nextDirection: dir,
                direction: canApply ? dir : g.direction,
              }
            : g,
        );
        return { ...prev, ghosts, selectedGhostId: ghostId };
      });
    },
    [],
  );

  const selectGhost = useCallback((ghostId: GhostId) => {
    // Selecting a ghost should not reset its position or trigger spawns.
    // Ignore selection requests for dead ghosts.
    setState((prev) => {
      if (prev.bonusGame) return prev;
      if (!prev.ghosts[ghostId]?.alive) return prev;
      return { ...prev, selectedGhostId: ghostId };
    });
  }, []);

  const togglePause = useCallback(() => {
    setState((prev) => {
      if (prev.status === "playing") {
        getSoundEngine().fadeMusicTo(0, 160);
        setTimeout(() => getSoundEngine().stopMusic(), 180);
        return { ...prev, status: "paused" };
      }
      if (prev.status === "paused") {
        if (musicEnabledRef.current) {
          getSoundEngine().startMusic(getMusicTrackForLevel(prev.level, prev.bonusGame?.type));
        }
        return { ...prev, status: "playing" };
      }
      return prev;
    });
  }, []);

  // Game tick - runs each frame, advances entities when their move-timer elapses
  const tick = useCallback((now: number) => {
    const prev = stateRef.current;

    if (prev.status === "ready") {
      if (now - readyStartRef.current >= READY_DURATION_MS) {
        setState((s) => ({ ...s, status: "playing", message: "" }));
        lastGhostMoveRef.current = [now, now, now, now];
        lastPelletGuyMoveRef.current = now;
        // Stagger ghost releases: 0, 500, 1000, 1500ms
        ghostReleaseAtRef.current = [now, now + 500, now + 1000, now + 1500];
        if (musicEnabledRef.current) {
          getSoundEngine().startMusic(getMusicTrackForLevel(prev.level, prev.bonusGame?.type));
        }
      }
      return;
    }

    if (prev.status !== "playing") return;

    const scale = speedScale(prev.level);
    const effects = prev.effects;
    const speedBoostActive = effects.speedBoostUntil > now;
    const freezeActive = effects.freezeUntil > now;
    const magnetActive = effects.magnetUntil > now;
    const teamPhaseActive = effects.teamPhaseUntil > now;
    const ghostSpeedMult = speedBoostActive ? 0.6 : 1.0;
    const modeSpeedMult =
      modeRef.current === "hardcore" ? 0.92
      : modeRef.current === "speedrun" ? 0.95
      : modeRef.current === "endless"
        ? Math.max(0.7, 0.97 - Math.min(0.24, endlessBlessingsRef.current.ghostOverdrive * 0.08))
      : 1.0;
    const ghostInterval = SPEED.ghost * scale * ghostSpeedMult * modeSpeedMult;
    const ghostVulnInterval = SPEED.ghostVulnerable * scale * ghostSpeedMult * modeSpeedMult;
    const idleMs = now - lastCatchAtRef.current;
    const idlePressure = modeRef.current !== "hardcore" && !prev.bonusGame && idleMs > 18000 ? 0.9 : 1;
    const pelletGuyPanicMultiplier = (prev.catches >= 2 ? 0.7 : prev.catches >= 1 ? 0.85 : 1) * idlePressure;
    const shinyActive = shinyPelletUntilRef.current > now;
    const pgInterval =
      SPEED.pelletGuy *
      scale *
      pelletGuyPanicMultiplier *
      (1 / modeSpeedMult) *
      (modeRef.current === "endless" ? 1 + endlessBlessingsRef.current.slowArena * 0.15 : 1) *
      (shinyActive ? SHINY_PELLET_GUY_SPEED_MULTIPLIER : 1);

    let nextState: GameState = prev;
    let mutated = false;

    // --- move ghosts ---
    const newGhosts = [...prev.ghosts];
    const marathonPelletDrops: { x: number; y: number }[] = [];
    for (let i = 0; i < 4; i++) {
      // During bonus rounds only the selected ghost moves.
      if (prev.bonusGame && i !== prev.selectedGhostId) continue;

      const g = newGhosts[i];
      // handle respawn
      if (!g.alive) {
        if (g.permaDead) continue;
        if (now >= g.respawnAt) {
          newGhosts[i] = {
            ...g,
            alive: true,
            permaDead: false,
            x: g.spawnX,
            y: g.spawnY,
            direction: (["left", "right", "up", "down"] as Direction[])[i],
            nextDirection: (["left", "right", "up", "down"] as Direction[])[i],
            vulnerable: false,
            vulnerableUntil: 0,
          };
          lastGhostMoveRef.current[i] = now;
          mutated = true;
        }
        continue;
      }

      // Ghost-house exit stagger: hold ghost in place until release time
      if (now < ghostReleaseAtRef.current[i]) {
        continue;
      }

      // clear vulnerable if expired
      let ghost = g;
      if (ghost.vulnerable && now >= ghost.vulnerableUntil) {
        ghost = { ...ghost, vulnerable: false, vulnerableUntil: 0 };
        newGhosts[i] = ghost;
        mutated = true;
      }

      const interval = ghost.vulnerable ? ghostVulnInterval : ghostInterval;
      if (now - lastGhostMoveRef.current[i] < interval) continue;
      lastGhostMoveRef.current[i] = now;

      // try queued direction first
      const ghostCanWalk = (x: number, y: number) =>
        teamPhaseActive
          ? y >= 0 && y < prev.maze.length && x >= 0 && x < prev.maze[0].length && prev.maze[y][x] !== 1
          : isWalkable(prev.maze, x, y, false);
      const isControlled = controlledGhostIdsRef.current.includes(ghost.id);
      let dir = isControlled
        ? ghost.nextDirection
        : chooseGhostHuntDirection(prev.maze, ghost, prev.pelletGuy, prev.level, newGhosts);
      let next = applyDirection(ghost.x, ghost.y, dir);
      if (!ghostCanWalk(next.x, next.y)) {
        dir = isControlled
          ? ghost.direction
          : chooseGhostHuntDirection(prev.maze, { ...ghost, direction: ghost.direction }, prev.pelletGuy, prev.level, newGhosts);
        next = applyDirection(ghost.x, ghost.y, dir);
      }
      if (!ghostCanWalk(next.x, next.y)) {
        const fallbackDirs: Direction[] = ["up", "down", "left", "right"];
        const firstOpenDir = fallbackDirs.find((candidate) => {
          const probe = applyDirection(ghost.x, ghost.y, candidate);
          return ghostCanWalk(probe.x, probe.y);
        });
        if (firstOpenDir) {
          dir = firstOpenDir;
          next = applyDirection(ghost.x, ghost.y, dir);
        }
      }
      if (!ghostCanWalk(next.x, next.y)) continue;
      newGhosts[i] = {
        ...ghost,
        x: next.x,
        y: next.y,
        direction: dir,
        nextDirection: isControlled ? ghost.nextDirection : dir,
      };
      if (
        themeIdRef.current === "marathon-squad" &&
        !prev.bonusGame &&
        Math.random() < MARATHON_PELLET_DROP_CHANCE
      ) {
        marathonPelletDrops.push({ x: ghost.x, y: ghost.y });
      }
      mutated = true;
    }

    // --- move pellet guy ---
    let pg = prev.pelletGuy;
    const pgStartX = pg.x;
    const pgStartY = pg.y;
    let maze = prev.maze;
    let pelletsRemaining = prev.pelletsRemaining;
    let score = prev.score;
    let barricades = prev.barricades;
    let ghostDeathsThisLevel = prev.ghostDeathsThisLevel;
    const hardcoreMode = modeRef.current === "hardcore";
    const timeAttackMode = modeRef.current === "timeattack";
    // Bonus game state evolves each tick.
    let bonusGame = prev.bonusGame;

    if (!bonusGame && Object.keys(superPelletRespawnAtRef.current).length > 0) {
      const remainingRespawns: Record<string, number> = {};
      let respawnedAny = false;
      for (const [cellKey, respawnAt] of Object.entries(superPelletRespawnAtRef.current)) {
        if (now < respawnAt) {
          remainingRespawns[cellKey] = respawnAt;
          continue;
        }
        const [xText, yText] = cellKey.split(",");
        const x = Number(xText);
        const y = Number(yText);
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        if (maze[y]?.[x] === 0) {
          maze = maze.map((row, ry) =>
            ry === y
              ? row.map((c, cx) => (cx === x ? (3 as CellType) : c))
              : row,
          );
          respawnedAny = true;
        }
      }
      superPelletRespawnAtRef.current = remainingRespawns;
      if (respawnedAny) mutated = true;
    }
    let status: GameState["status"] = prev.status;
    let message = prev.message;
    let effectsNext: ActiveEffects = effects;

    if (marathonPelletDrops.length > 0) {
      const dropKeys = new Set(marathonPelletDrops.map((spot) => `${spot.x},${spot.y}`));
      for (const key of dropKeys) {
        const [xRaw, yRaw] = key.split(",");
        const x = Number(xRaw);
        const y = Number(yRaw);
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        if (maze[y]?.[x] === 0) {
          maze = maze.map((row, ry) =>
            ry === y
              ? row.map((cell, cx) => (cx === x ? (2 as CellType) : cell))
              : row,
          );
          pelletsRemaining++;
          mutated = true;
        }
      }
    }

    if (
      themeIdRef.current === "spectre" &&
      !bonusGame &&
      effects.teamPhaseUntil <= now &&
      now - lastSpectreRollRef.current >= 10000
    ) {
      lastSpectreRollRef.current = now;
      if (Math.random() < 0.07) {
        effectsNext = { ...effectsNext, teamPhaseUntil: now + 2000 };
        message = "GHOST PHASE";
        mutated = true;
      }
    }

    if (
      themeIdRef.current === "mono" &&
      !bonusGame &&
      pg.alive &&
      now - lastMonoRollRef.current >= 6000
    ) {
      lastMonoRollRef.current = now;
      if (Math.random() < 0.03) {
        const reverse = opposite(pg.direction);
        const reversePos = applyDirection(pg.x, pg.y, reverse);
        if (isWalkable(maze, reversePos.x, reversePos.y, true)) {
          pg = { ...pg, direction: reverse };
          message = "POLARITY FLIP";
          mutated = true;
        }
      }
    }

    if (!bonusGame && pg.alive && now >= nextShinyRollAtRef.current) {
      nextShinyRollAtRef.current = now + SHINY_ROLL_INTERVAL_MS;
      if (Math.random() < SHINY_SPAWN_CHANCE) {
        shinyPelletUntilRef.current = now + SHINY_DURATION_MS;
        message = "✨ SHINY PELLET GUY!";
        mutated = true;
      }
    }

    if (bonusGame && !bonusGame.complete && prev.status === "playing") {
      if (lastBonusTickRef.current === 0 || now - lastBonusTickRef.current >= 110) {
        lastBonusTickRef.current = now;
        const activeGhost = newGhosts[prev.selectedGhostId];
        const prevGhost = prev.ghosts[prev.selectedGhostId];
        const ghostPos = activeGhost?.alive
          ? [
              { x: activeGhost.x, y: activeGhost.y },
              { x: prevGhost.x, y: prevGhost.y },
            ]
          : [];
        const { next, collectedNow, bonusPointsEarned } = tickBonusGame(
          bonusGame,
          maze,
          ghostPos,
          now,
        );
        if (collectedNow > 0 || next.complete !== bonusGame.complete) {
          score += bonusPointsEarned;
          mutated = true;
          if (collectedNow > 0) getSoundEngine().catchHit();
        }
        bonusGame = next;
        if (bonusGame.complete) {
          const allClear = bonusGame.collectedItems >= bonusGame.totalItems;
          status = "levelWon";
          message = allClear
            ? `🎉 BONUS CLEAR!\n+${bonusGame.bonusScore} BONUS POINTS`
            : `⏱ TIME UP!\n+${bonusGame.bonusScore} BONUS POINTS`;
          if (allClear) void queueAchievementUnlock("bonus");
          getSoundEngine().levelWin();
          if (progressRef.current) {
            const p = { ...progressRef.current };
            p.highestLevel = Math.max(p.highestLevel, prev.level + 1);
            p.highScore = Math.max(p.highScore, score);
            const normalized = withUnlockedThemes(p);
            progressRef.current = normalized;
            saveProgress(normalized);
            void submitTotalGoldStarsLifetime(getTotalGoldStars(normalized));
            void syncProgressAchievements(normalized);
          }
          if (prev.lives <= 1) void queueAchievementUnlock("closeCall");
          onCoinsEarnedRef.current?.(COIN_REWARD.bonusGame, "levelClear");
          mutated = true;
        }
      }
    }

    if (!pg.alive) {
      if (now >= pg.respawnAt) {
        const respawn = findSafePelletGuyRespawn(maze, pg, newGhosts);
        pg = {
          ...pg,
          alive: true,
          x: respawn.x,
          y: respawn.y,
          direction: "left",
        };
        lastPelletGuyMoveRef.current = now;
        mutated = true;
      }
    } else if (!freezeActive && now - lastPelletGuyMoveRef.current >= pgInterval) {
      // -----------------------------------------------------------------
      // Bonus game tick: runs regardless of whether PG moves this frame.
      // Pookas (digDugDash) move on their own timers inside tickBonusGame.
      // -----------------------------------------------------------------
      // During a bonus level Pellet Guy is frozen — skip movement entirely.
      if (!bonusGame) {
      lastPelletGuyMoveRef.current = now;

      const pgPrevX = pg.x;
      const pgPrevY = pg.y;

      // choose direction: continue if valid, else pick new
      let dir = pg.direction;
      let next = applyDirection(pg.x, pg.y, dir);
      // chance to change direction at intersections
      const atIntersection = (() => {
        // count valid directions other than current and reverse
        const choices = (["up", "down", "left", "right"] as Direction[]).filter(
          (d) => {
            const n = applyDirection(pg.x, pg.y, d);
            return isWalkable(prev.maze, n.x, n.y, true);
          },
        );
        return choices.length >= 3 || !isWalkable(prev.maze, next.x, next.y, true);
      })();
      const decoyAlive =
        effects.decoy && effects.decoy.until > now ? effects.decoy : null;
      if (atIntersection) {
        dir = choosePelletGuyDirection(prev.maze, pg, prev.level, newGhosts, {
          magnetActive,
          decoy: decoyAlive ? { x: decoyAlive.x, y: decoyAlive.y } : null,
        });
        next = applyDirection(pg.x, pg.y, dir);
      }
      if (isWalkable(prev.maze, next.x, next.y, true)) {
        pg = { ...pg, x: next.x, y: next.y, direction: dir };
        mutated = true;

        // eat pellet?
        const cell = maze[next.y][next.x];
        if (cell === 2) {
          maze = maze.map((row, ry) =>
            ry === next.y
              ? row.map((c, cx) => (cx === next.x ? (0 as CellType) : c))
              : row,
          );
          pelletsRemaining--;
          getSoundEngine().pellet();
        } else if (cell === 3) {
          if (!bonusGame) {
            superPelletRespawnAtRef.current[`${next.x},${next.y}`] = now + SUPER_PELLET_RESPAWN_MS;
          }
          maze = maze.map((row, ry) =>
            ry === next.y
              ? row.map((c, cx) => (cx === next.x ? (0 as CellType) : c))
              : row,
          );
          getSoundEngine().superPellet();
          // make all alive ghosts vulnerable
          const vulnerabilityMs = themeIdRef.current === "neon"
            ? SUPER_PELLET_DURATION_MS * 0.8
            : SUPER_PELLET_DURATION_MS;
          for (let i = 0; i < newGhosts.length; i++) {
            if (newGhosts[i].alive) {
              newGhosts[i] = {
                ...newGhosts[i],
                vulnerable: true,
                vulnerableUntil: now + vulnerabilityMs,
              };
            }
          }
          if (themeIdRef.current === "solar-flare") {
            effectsNext = { ...effectsNext, revealUntil: now + 2000 };
          }
        }

        // --- Trap drop: Pellet Guy may leave a trap at his previous cell ---
        // Only drop on empty (non-special) cells, away from ghost house & spawn
        const prevCellType = maze[pgPrevY][pgPrevX];
        if (prevCellType === 0) {
          // Count active traps (spikes + barricades)
          let activeTraps = barricades.length;
          for (let yy = 0; yy < maze.length; yy++) {
            for (let xx = 0; xx < maze[0].length; xx++) {
              if (maze[yy][xx] === 6) activeTraps++;
            }
          }
          if (activeTraps < MAX_ACTIVE_TRAPS) {
            const dropChance = Math.min(
              TRAP_DROP_MAX_CHANCE,
              TRAP_DROP_BASE_CHANCE +
                (prev.level - 1) * TRAP_DROP_LEVEL_BOOST +
              prev.catches * 0.025 +
              (modeRef.current !== "hardcore" && idleMs > 18000 ? 0.03 : 0),
            );
            if (Math.random() < dropChance) {
              const isSpike = Math.random() < SPIKE_PROBABILITY;
              const tx = pgPrevX;
              const ty = pgPrevY;
              if (isSpike) {
                maze = maze.map((row, ry) =>
                  ry === ty
                    ? row.map((c, cx) => (cx === tx ? (6 as CellType) : c))
                    : row,
                );
                if (themeIdRef.current === "ironworks") {
                  effectsNext = {
                    ...effectsNext,
                    spikeArmUntilByCell: {
                      ...effectsNext.spikeArmUntilByCell,
                      [`${tx},${ty}`]: now + 1000,
                    },
                  };
                }
              } else {
                if (themeIdRef.current === "static-squad" && !firstBarricadeSkippedRef.current) {
                  firstBarricadeSkippedRef.current = true;
                } else {
                  maze = maze.map((row, ry) =>
                    ry === ty
                      ? row.map((c, cx) => (cx === tx ? (7 as CellType) : c))
                      : row,
                  );
                  barricades = [
                    ...barricades,
                    { x: tx, y: ty, expiresAt: now + BARRICADE_DURATION_MS },
                  ];
                }
              }
              getSoundEngine().uiClick();
            }
          }
        }
      }
      } // end if (!bonusGame) — PG movement skipped during bonus levels
    } // end else if (pg movement tick)

    // --- Expire barricades ---
    if (barricades.length > 0) {
      const stillActive: typeof barricades = [];
      let expiredAny = false;
      for (const b of barricades) {
        if (b.expiresAt <= now) {
          // remove from maze (set back to 0)
          if (maze[b.y][b.x] === 7) {
            maze = maze.map((row, ry) =>
              ry === b.y
                ? row.map((c, cx) => (cx === b.x ? (0 as CellType) : c))
                : row,
            );
          }
          expiredAny = true;
        } else {
          stillActive.push(b);
        }
      }
      if (expiredAny) {
        barricades = stillActive;
        mutated = true;
      }
    }

    // --- Ghost-on-spike collision (after ghost moves) ---
    for (let i = 0; i < newGhosts.length; i++) {
      const g = newGhosts[i];
      if (!g.alive) continue;
      if (maze[g.y][g.x] === 6) {
        const spikeArmUntil = effectsNext.spikeArmUntilByCell[`${g.x},${g.y}`] ?? 0;
        if (effectsNext.teamPhaseUntil > now || spikeArmUntil > now) continue;
        // Spike triggered. Consume the spike either way.
        runHazardStatsRef.current = {
          ...runHazardStatsRef.current,
          spikeTriggers: runHazardStatsRef.current.spikeTriggers + 1,
        };
        maze = maze.map((row, ry) =>
          ry === g.y
            ? row.map((c, cx) => (cx === g.x ? (0 as CellType) : c))
            : row,
        );

        // Shield absorbs this trap without death/penalty.
        if (effectsNext.shieldGhostId === g.id) {
          effectsNext = { ...effectsNext, shieldGhostId: null };
          getSoundEngine().uiClick();
          mutated = true;
          continue;
        }

        if (oathShieldAvailableRef.current) {
          oathShieldAvailableRef.current = false;
          getSoundEngine().uiClick();
          mutated = true;
          continue;
        }

        let delay = computeRespawnDelay(ghostDeathsThisLevel, effects.fastRespawn);
        if (themeIdRef.current === "graveyard-shift" && !firstFastRespawnUsedRef.current) {
          delay *= 0.75;
          firstFastRespawnUsedRef.current = true;
        }
        if (!hardcoreMode && !timeAttackMode) ghostDeathsThisLevel++;
        newGhosts[i] = {
          ...g,
          alive: false,
          permaDead: hardcoreMode,
          respawnAt: hardcoreMode ? Number.POSITIVE_INFINITY : now + (timeAttackMode ? 0 : delay),
          vulnerable: false,
          vulnerableUntil: 0,
        };
        score += SCORE_SPIKED_GHOST_PENALTY;
        getSoundEngine().ghostEaten();
        mutated = true;
      }
    }

    // --- collision detection ---
    let catches = prev.catches;
    let lastComboTime = prev.lastComboTime;
    let comboCount = prev.comboCount;
    let lives = prev.lives;

    if (pg.alive) {
      for (let i = 0; i < newGhosts.length; i++) {
        const g = newGhosts[i];
        if (!g.alive) continue;
        const ghostPrev = prev.ghosts[i];
        const crossedPaths =
          ghostPrev.x === pg.x &&
          ghostPrev.y === pg.y &&
          g.x === pgStartX &&
          g.y === pgStartY;
        if ((g.x === pg.x && g.y === pg.y) || crossedPaths) {
          // -------------------------------------------------------------
          // BONUS LEVELS: ghost-on-PG collision is disabled (PG frozen,
          // bonus items handle scoring). Only normal catch/vulnerable logic
          // applies on non-bonus levels.
          // -------------------------------------------------------------
          if (bonusGame) {
            // No collision during bonus rounds.
            continue;
          }

          if (g.vulnerable) {
            if (effectsNext.teamPhaseUntil > now) continue;
            // Shield blocks one chomp
            if (effectsNext.shieldGhostId === g.id) {
              effectsNext = { ...effectsNext, shieldGhostId: null };
              newGhosts[i] = { ...g, vulnerable: false, vulnerableUntil: 0 };
              getSoundEngine().uiClick();
              mutated = true;
              continue;
            }
            if (oathShieldAvailableRef.current) {
              oathShieldAvailableRef.current = false;
              newGhosts[i] = { ...g, vulnerable: false, vulnerableUntil: 0 };
              getSoundEngine().uiClick();
              mutated = true;
              continue;
            }
            // Pellet guy eats ghost
            let delay = computeRespawnDelay(ghostDeathsThisLevel, effects.fastRespawn);
            if (themeIdRef.current === "graveyard-shift" && !firstFastRespawnUsedRef.current) {
              delay *= 0.75;
              firstFastRespawnUsedRef.current = true;
            }
            if (!hardcoreMode && !timeAttackMode) ghostDeathsThisLevel++;
            newGhosts[i] = {
              ...g,
              alive: false,
              permaDead: hardcoreMode,
              respawnAt: hardcoreMode ? Number.POSITIVE_INFINITY : now + (timeAttackMode ? 0 : delay),
              vulnerable: false,
              vulnerableUntil: 0,
            };
            mutated = true;
            getSoundEngine().ghostEaten();
            // Award points when Pellet Guy eats a vulnerable ghost
            score += SCORE_GHOST_EAT;
          } else {
            if (effectsNext.teamPhaseUntil > now) continue;
            // ------------------------------------------------------------
            // Ghost catches Pellet Guy. On boss levels each catch deals
            // 1 HP — third catch (HP=0) is treated as a level win with a
            // big bonus.
            // ------------------------------------------------------------
            catches++;
            lastCatchAtRef.current = now;
            let triggeredCombo = false;
            if (now - lastComboTime < COMBO_WINDOW_MS) {
              comboCount++;
              score += SCORE_COMBO_BONUS * comboCount;
              triggeredCombo = true;
            } else {
              comboCount = 0;
            }
            lastComboTime = now;
            score += SCORE_CATCH + (modeRef.current === "endless" ? endlessBlessingsRef.current.hunterInstinct * 50 : 0);
            if (shinyPelletUntilRef.current > now) {
              score += SCORE_SHINY_CATCH;
              shinyPelletUntilRef.current = 0;
              message = `✨ SHINY CATCH!\n+${SCORE_SHINY_CATCH}`;
              void updateStatistics((current) => ({
                ...current,
                totalShinyCatches: current.totalShinyCatches + 1,
              }));
            }
            if (triggeredCombo) {
              getSoundEngine().comboHit(comboCount);
            } else {
              getSoundEngine().catchHit();
            }

            // Pellet Guy temporarily down
            const goldenGirlsRespawnBoost =
              themeIdRef.current === "golden-girls" && Math.random() < 0.25;
            pg = {
              ...pg,
              alive: false,
              respawnAt:
                now +
                (timeAttackMode ? 0 : goldenGirlsRespawnBoost ? Math.floor(RESPAWN_MS * 0.25) : RESPAWN_MS),
            };
            mutated = true;

            // ---- Non-bonus level: classic 3-catch win. ----
            const catchesToWin =
              modeRef.current === "endless" && endlessBlessingsRef.current.quickClear
                ? 2
                : CATCH_TO_WIN;
            if (catches >= catchesToWin) {
              if (catches === 1) {
                void queueAchievementUnlock("flippingTheScript");
              }
              // Level won!
              const pctRemaining = Math.round(
                (pelletsRemaining / Math.max(1, prev.totalPellets)) * 100,
              );
              score += pctRemaining * SCORE_PER_PERCENT_REMAINING;
              status = "levelWon";
              message = `LEVEL ${prev.level} CLEARED!\n${pctRemaining}% PELLETS LEFT\n+${
                pctRemaining * SCORE_PER_PERCENT_REMAINING
              } BONUS`;
              getSoundEngine().levelWin();

              // Award level coins (base + 1 coin per 5% pellets remaining)
              let lvlCoins = COIN_REWARD.levelClear + Math.floor(pctRemaining * COIN_REWARD.perPercentRemaining);
              if (themeIdRef.current === "sweet-chaos") {
                lvlCoins = Math.ceil(lvlCoins * 1.05);
              }
              if (themeIdRef.current === "jackpot-crew" && Math.random() < 0.05) {
                lvlCoins *= 2;
              }
              onCoinsEarnedRef.current?.(lvlCoins, "levelClear");

              // Persist progress
              if (progressRef.current) {
                const p = { ...progressRef.current };
                p.highestLevel = Math.max(p.highestLevel, prev.level + 1);
                p.totalCatches = p.totalCatches + catchesToWin;
                p.highScore = Math.max(p.highScore, score);
                const starEligible = modeRef.current === "classic" && !prev.bonusGame;
                const noGhostLoss = prev.ghostDeathsThisLevel === 0;
                const highPellets = pelletsRemaining / Math.max(1, prev.totalPellets) >= 0.75;
                const gold = starEligible && noGhostLoss && highPellets;
                // Auto-unlock theme entries by re-scanning
                const normalized = withUnlockedThemes(
                  starEligible
                    ? mergeLevelStarRecord(p, prev.level, {
                        cleared: true,
                        noGhostLoss,
                        highPellets,
                        gold,
                      })
                    : p,
                );
                progressRef.current = normalized;
                saveProgress(normalized);
                void submitTotalGoldStarsLifetime(getTotalGoldStars(normalized));
                void syncProgressAchievements(normalized);
              }
              if (modeRef.current === "classic") {
                void recordClassicLevelBest(
                  prev.level,
                  Math.max(0, score - levelStartScoreRef.current),
                );
              }
              if (prev.level === 1) void queueAchievementUnlock("oneAndDone");
              if (comboCount >= 2) void queueAchievementUnlock("freeHugs");
              if (prev.lives <= 1) void queueAchievementUnlock("closeCall");
              if (pelletsRemaining <= Math.max(1, Math.floor(prev.totalPellets * 0.15))) {
                void queueAchievementUnlock("pelletSchmellet");
              }
            }
            break; // only one catch per tick
          }
        }
      }
    }

    // --- loss conditions ---
    if (status === "playing") {
      const ghostDeathCap =
        modeRef.current === "endless" && endlessBlessingsRef.current.secondWind ? 25 : 20;
      if (ghostDeathsThisLevel >= ghostDeathCap) {
        if (timeAttackMode) {
          startLevel(prev.level, STARTING_LIVES, score);
          return;
        }
        if (modeRef.current === "endless") {
          status = "gameOver";
          message = `GAME OVER\nToo many ghost losses (${ghostDeathCap})!`;
          getSoundEngine().levelLose();
          getSoundEngine().fadeMusicTo(0, 240);
          setTimeout(() => getSoundEngine().stopMusic(), 260);
          if (progressRef.current) {
            const p = { ...progressRef.current };
            p.highScore = Math.max(p.highScore, score);
            const normalized = withUnlockedThemes(p);
            progressRef.current = normalized;
            saveProgress(normalized);
          }
        } else {
        if (!hardcoreMode) {
          lives--;
        }
        if (lives <= 0) {
          status = "gameOver";
          message = `GAME OVER\nToo many ghost losses (${ghostDeathCap})!`;
          getSoundEngine().levelLose();
          getSoundEngine().fadeMusicTo(0, 240);
          setTimeout(() => getSoundEngine().stopMusic(), 260);
          if (progressRef.current) {
            const p = { ...progressRef.current };
            p.highScore = Math.max(p.highScore, score);
            const normalized = withUnlockedThemes(p);
            progressRef.current = normalized;
            saveProgress(normalized);
          }
        } else {
          status = "levelLost";
          message = hardcoreMode
            ? `LEVEL FAILED\nToo many ghost losses (${ghostDeathCap})!`
            : `ROUND FAILED\nToo many ghost losses (${ghostDeathCap})!`;
          getSoundEngine().levelLose();
        }
        }
      } else if (pelletsRemaining <= 0) {
        if (timeAttackMode) {
          startLevel(prev.level, STARTING_LIVES, score);
          return;
        }
        if (modeRef.current === "endless") {
          status = "gameOver";
          message = "GAME OVER\nPellet Guy ate everything!";
          getSoundEngine().levelLose();
          getSoundEngine().fadeMusicTo(0, 240);
          setTimeout(() => getSoundEngine().stopMusic(), 260);
          if (progressRef.current) {
            const p = { ...progressRef.current };
            p.highScore = Math.max(p.highScore, score);
            const normalized = withUnlockedThemes(p);
            progressRef.current = normalized;
            saveProgress(normalized);
          }
        } else {
        // Pellet guy ate all pellets - lose life
        if (!hardcoreMode) {
          lives--;
        }
        if (lives <= 0) {
          status = "gameOver";
          message = "GAME OVER\nPellet Guy ate everything!";
          getSoundEngine().levelLose();
          getSoundEngine().fadeMusicTo(0, 240);
          setTimeout(() => getSoundEngine().stopMusic(), 260);
          // Save high score
          if (progressRef.current) {
            const p = { ...progressRef.current };
            p.highScore = Math.max(p.highScore, score);
            const normalized = withUnlockedThemes(p);
            progressRef.current = normalized;
            saveProgress(normalized);
          }
        } else {
          status = "levelLost";
          message = hardcoreMode
            ? "LEVEL FAILED\nPellet Guy ate all the pellets!"
            : "PELLET GUY WINS!\nHe ate all the pellets!";
          getSoundEngine().levelLose();
        }
        }
      } else {
        const aliveGhosts = newGhosts.filter((g) => g.alive).length;
        if (hardcoreMode) {
          lives = aliveGhosts;
          hardcoreEliminatedRef.current = newGhosts
            .filter((g) => g.permaDead)
            .map((g) => g.id);
        }
        if (aliveGhosts === 0) {
          if (timeAttackMode) {
            startLevel(prev.level, STARTING_LIVES, score);
            return;
          }
          if (modeRef.current === "endless") {
            status = "gameOver";
            message = "GAME OVER\nAll ghosts devoured!";
            getSoundEngine().levelLose();
            getSoundEngine().fadeMusicTo(0, 240);
            setTimeout(() => getSoundEngine().stopMusic(), 260);
            if (progressRef.current) {
              const p = { ...progressRef.current };
              p.highScore = Math.max(p.highScore, score);
              const normalized = withUnlockedThemes(p);
              progressRef.current = normalized;
              saveProgress(normalized);
            }
          } else {
          if (!hardcoreMode) {
            lives--;
          }
          if (lives <= 0) {
            status = "gameOver";
            message = hardcoreMode
              ? "GAME OVER\nYour squad was wiped out!"
              : "GAME OVER\nAll ghosts devoured!";
            getSoundEngine().levelLose();
            getSoundEngine().fadeMusicTo(0, 240);
            setTimeout(() => getSoundEngine().stopMusic(), 260);
            if (progressRef.current) {
              const p = { ...progressRef.current };
              p.highScore = Math.max(p.highScore, score);
              const normalized = withUnlockedThemes(p);
              progressRef.current = normalized;
              saveProgress(normalized);
            }
          } else {
            status = "levelLost";
            message = hardcoreMode
              ? "LEVEL FAILED\nYour squad is down!"
              : "PELLET GUY WINS!\nHe ate all your ghosts!";
            getSoundEngine().levelLose();
          }
          }
        }
      }
    }

    // Expire decoy
    if (effectsNext.decoy && effectsNext.decoy.until <= now) {
      effectsNext = { ...effectsNext, decoy: null };
      mutated = true;
    }

    if (mutated || status !== prev.status || effectsNext !== effects || bonusGame !== prev.bonusGame) {
      const selectedGhostId = newGhosts[prev.selectedGhostId]?.alive
        ? prev.selectedGhostId
        : (newGhosts.find((ghost) => ghost.alive)?.id ?? prev.selectedGhostId);
      nextState = {
        ...prev,
        ghosts: newGhosts,
        pelletGuy: pg,
        maze,
        pelletsRemaining,
        score,
        catches,
        lastComboTime,
        comboCount,
        lives,
        status,
        message,
        selectedGhostId,
        barricades,
        ghostDeathsThisLevel,
        effects: effectsNext,
        bonusGame,
      };
      setState(nextState);
    }
  }, [startLevel]);
 // --- Main Game Animation Loop ---
 useEffect(() => {
   const loop = (now: number) => {
     tick(now);
     rafRef.current = requestAnimationFrame(loop);
   };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [tick]);

  const advanceLevel = useCallback(() => {
    if (modeRef.current !== "endless" && state.level >= MAX_LEVELS) {
      // All 50 levels cleared — game complete!
      setState((prev) => ({
        ...prev,
        status: "gameOver",
        message: `🏆 YOU BEAT ALL ${MAX_LEVELS} LEVELS!\nFINAL SCORE: ${prev.score}`,
      }));
      if (progressRef.current) {
        const p = { ...progressRef.current };
        p.highScore = Math.max(p.highScore, state.score);
        p.highestLevel = Math.max(p.highestLevel, MAX_LEVELS);
        const normalized = withUnlockedThemes(p);
        progressRef.current = normalized;
        saveProgress(normalized);
        void syncProgressAchievements(normalized);
      }
      void queueAchievementUnlock("chardcore");
      getSoundEngine().levelWin();
      return;
    }
    startLevel(state.level + 1, state.lives, state.score);
  }, [state.level, state.lives, state.score, startLevel]);

  const retryLevel = useCallback(() => {
    startLevel(state.level, state.lives, state.score);
  }, [state.level, state.lives, state.score, startLevel]);

  const continueEndlessRun = useCallback((): boolean => {
    const cur = stateRef.current;
    if (modeRef.current !== "endless" || cur.status !== "gameOver") return false;
    startLevel(cur.level, Math.max(1, cur.lives), cur.score);
    return true;
  }, [startLevel]);

  const endRun = useCallback((message = "GAME OVER"): boolean => {
    const cur = stateRef.current;
    if (cur.status === "gameOver") return false;
    setState({
      ...cur,
      status: "gameOver",
      message,
    });
    if (progressRef.current) {
      const normalized = withUnlockedThemes({
        ...progressRef.current,
        highScore: Math.max(progressRef.current.highScore, cur.score),
      });
      progressRef.current = normalized;
      saveProgress(normalized);
    }
    getSoundEngine().levelLose();
    getSoundEngine().fadeMusicTo(0, 240);
    setTimeout(() => getSoundEngine().stopMusic(), 260);
    return true;
  }, []);

  const submitFinalScore = useCallback(
    async (playerName: string, runTimeMs?: number) => {
      const { submitScore } = await import("./api");
      const isDaily = modeRef.current === "daily" && dailyRef.current?.seedDate;
      const isSpeedrun = modeRef.current === "speedrun";
      const isEndless = modeRef.current === "endless";
      const isTimeAttack = modeRef.current === "timeattack";
      return submitScore({
        player_name: playerName,
        score: state.score,
        level: state.level,
        catches: state.catches,
        theme_id: themeIdRef.current,
        // Custom challenges score against classic leaderboard (no daily date)
        mode: isDaily ? "daily" : isSpeedrun ? "speedrun" : isTimeAttack ? "timeattack" : isEndless ? "classic" : "classic",
        daily_seed_date: isDaily ? dailyRef.current?.seedDate : undefined,
        run_time_ms: isSpeedrun ? Math.max(0, Math.floor(runTimeMs ?? 0)) : undefined,
      });
    },
    [state.score, state.level, state.catches],
  );

  // Apply a power-up effect to the game state.
  // Returns true if the activation succeeded (false = ignored, e.g. not playing).
  const applyPowerUp = useCallback((id: PowerUpId): boolean => {
    const cur = stateRef.current;
    if (cur.status !== "playing") return false;
    const now = performance.now();

    let nextState: GameState | null = null;
    switch (id) {
      case "speedBoost": {
        nextState = {
          ...cur,
          effects: { ...cur.effects, speedBoostUntil: now + 6000 },
        };
        break;
      }
      case "freeze": {
        const duration = themeIdRef.current === "frostbyte" && !firstFreezeBoostUsedRef.current
          ? 5000
          : 4000;
        if (themeIdRef.current === "frostbyte") firstFreezeBoostUsedRef.current = true;
        nextState = {
          ...cur,
          effects: { ...cur.effects, freezeUntil: now + duration },
        };
        break;
      }
      case "magnet": {
        nextState = {
          ...cur,
          effects: { ...cur.effects, magnetUntil: now + 5000 },
        };
        break;
      }
      case "reveal": {
        nextState = {
          ...cur,
          effects: { ...cur.effects, revealUntil: now + 8000 },
        };
        break;
      }
      case "fastRespawn": {
        nextState = {
          ...cur,
          effects: { ...cur.effects, fastRespawn: true },
        };
        break;
      }
      case "shield": {
        const ghost = cur.ghosts[cur.selectedGhostId];
        if (!ghost || !ghost.alive) return false;
        nextState = {
          ...cur,
          effects: { ...cur.effects, shieldGhostId: cur.selectedGhostId },
        };
        break;
      }
      case "teleport": {
        const ghost = cur.ghosts[cur.selectedGhostId];
        if (!ghost || !ghost.alive) return false;
        // Find an adjacent walkable tile next to PG
        const pg = cur.pelletGuy;
        if (!pg.alive) return false;
        const targets = (
          [
            [pg.x, pg.y - 1],
            [pg.x, pg.y + 1],
            [pg.x - 1, pg.y],
            [pg.x + 1, pg.y],
            [pg.x, pg.y],
          ] as [number, number][]
        ).filter(([x, y]) => isWalkable(cur.maze, x, y, false));
        if (targets.length === 0) return false;
        const [tx, ty] = targets[0];
        const ghosts = cur.ghosts.map((g, i) =>
          i === cur.selectedGhostId
            ? { ...g, x: tx, y: ty }
            : g,
        );
        nextState = { ...cur, ghosts };
        break;
      }
      case "key": {
        // Open the closest active barricade
        if (cur.barricades.length === 0) return false;
        const ghost = cur.ghosts[cur.selectedGhostId];
        const ref = ghost && ghost.alive ? ghost : null;
        // pick nearest to selected ghost, else first
        const sorted = [...cur.barricades].sort((a, b) => {
          if (!ref) return 0;
          return (
            Math.abs(a.x - ref.x) + Math.abs(a.y - ref.y) -
            (Math.abs(b.x - ref.x) + Math.abs(b.y - ref.y))
          );
        });
        const target = sorted[0];
        const maze = cur.maze.map((row, ry) =>
          ry === target.y
            ? row.map((c, cx) => (cx === target.x && c === 7 ? (0 as CellType) : c))
            : row,
        );
        const barricades = cur.barricades.filter(
          (b) => !(b.x === target.x && b.y === target.y),
        );
        nextState = { ...cur, maze, barricades };
        break;
      }
      case "pelletScatter": {
        // Drop 8 fresh pellets on random empty walkable tiles
        const empties: { x: number; y: number }[] = [];
        for (let y = 0; y < cur.maze.length; y++) {
          for (let x = 0; x < cur.maze[0].length; x++) {
            if (cur.maze[y][x] === 0) empties.push({ x, y });
          }
        }
        // shuffle and pick 8
        for (let i = empties.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [empties[i], empties[j]] = [empties[j], empties[i]];
        }
        const picks = empties.slice(0, 8);
        if (picks.length === 0) return false;
        const set = new Set(picks.map((p) => `${p.x},${p.y}`));
        const maze = cur.maze.map((row, ry) =>
          row.map((c, cx) =>
            set.has(`${cx},${ry}`) ? (2 as CellType) : c,
          ),
        );
        nextState = {
          ...cur,
          maze,
          totalPellets: cur.totalPellets + picks.length,
          pelletsRemaining: cur.pelletsRemaining + picks.length,
        };
        break;
      }
      case "decoy": {
        const ghost = cur.ghosts[cur.selectedGhostId];
        if (!ghost || !ghost.alive) return false;
        nextState = {
          ...cur,
          effects: {
            ...cur.effects,
            decoy: {
              x: ghost.x,
              y: ghost.y,
              until: now + 6000,
              ghostId: cur.selectedGhostId,
            },
          },
        };
        break;
      }
      case "rewind": {
        // Reset Pellet Guy to spawn and clear all traps
        let maze = cur.maze;
        // remove spikes (6) and barricades (7)
        maze = maze.map((row) =>
          row.map((c) => ((c === 6 || c === 7) ? (0 as CellType) : c)),
        );
        nextState = {
          ...cur,
          maze,
          barricades: [],
          pelletGuy: {
            ...cur.pelletGuy,
            x: cur.pelletGuy.spawnX,
            y: cur.pelletGuy.spawnY,
            direction: "left",
            alive: true,
            respawnAt: 0,
          },
        };
        break;
      }
      case "hardcoreRevive": {
        if (modeRef.current !== "hardcore") return false;
        const deadGhost = cur.ghosts.find((ghost) => ghost.permaDead);
        if (!deadGhost) return false;
        const ghosts = cur.ghosts.map((ghost) =>
          ghost.id === deadGhost.id
            ? {
                ...ghost,
                alive: true,
                permaDead: false,
                x: ghost.spawnX,
                y: ghost.spawnY,
                respawnAt: 0,
                vulnerable: false,
                vulnerableUntil: 0,
              }
            : ghost,
        );
        hardcoreEliminatedRef.current = ghosts
          .filter((ghost) => ghost.permaDead)
          .map((ghost) => ghost.id);
        nextState = {
          ...cur,
          ghosts,
          lives: ghosts.filter((ghost) => ghost.alive).length,
          selectedGhostId: deadGhost.id,
          message: `${deadGhost.name.toUpperCase()} RETURNS!`,
        };
        break;
      }
      default:
        return false;
    }

    if (nextState) {
      setState(nextState);
      getSoundEngine().uiClick();
      return true;
    }
    return false;
  }, []);

  const bonusAction = useCallback(() => {
    // Bonus stages are walk-over collection only.
    return;
  }, []);

  const grantEndlessBlessing = useCallback((id: EndlessBlessingId): boolean => {
    const cur = stateRef.current;
    if (modeRef.current !== "endless") return false;
    if (cur.status !== "levelWon" && cur.status !== "playing" && cur.status !== "ready") return false;

    if (id === "hunterInstinct") {
      endlessBlessingsRef.current = {
        ...endlessBlessingsRef.current,
        hunterInstinct: Math.min(4, endlessBlessingsRef.current.hunterInstinct + 1),
      };
      setState((prev) => ({ ...prev, message: "BLESSING: HUNTER INSTINCT (+CATCH SCORE)" }));
      return true;
    }
    if (id === "slowArena") {
      endlessBlessingsRef.current = {
        ...endlessBlessingsRef.current,
        slowArena: Math.min(3, endlessBlessingsRef.current.slowArena + 1),
      };
      setState((prev) => ({ ...prev, message: "BLESSING: SLOW ARENA (PELLET GUY SLOWED)" }));
      return true;
    }
    if (id === "ghostOverdrive") {
      endlessBlessingsRef.current = {
        ...endlessBlessingsRef.current,
        ghostOverdrive: Math.min(3, endlessBlessingsRef.current.ghostOverdrive + 1),
      };
      setState((prev) => ({ ...prev, message: "BLESSING: GHOST OVERDRIVE (TEAM SPEED UP)" }));
      return true;
    }
    if (id === "extraLife") {
      endlessBlessingsRef.current = {
        ...endlessBlessingsRef.current,
        secondWind: true,
      };
      setState((prev) => ({ ...prev, message: "BLESSING: SECOND WIND (GHOST LOSS CAP 25)" }));
      return true;
    }
    if (id === "continueDiscount") {
      endlessBlessingsRef.current = {
        ...endlessBlessingsRef.current,
        continueDiscount: true,
      };
      setState((prev) => ({ ...prev, message: "BLESSING: BARGAIN LIVES (CONTINUES -50%)" }));
      return true;
    }
    if (id === "quickClear") {
      endlessBlessingsRef.current = {
        ...endlessBlessingsRef.current,
        quickClear: true,
      };
      setState((prev) => ({ ...prev, message: "BLESSING: RELENTLESS HUNT (2 CATCH CLEAR)" }));
      return true;
    }
    return false;
  }, []);

  const setControlledGhosts = useCallback((ghostIds: GhostId[]) => {
    controlledGhostIdsRef.current = ghostIds.length > 0 ? [...ghostIds] : [stateRef.current.selectedGhostId];
  }, []);

  const cycleGhostAiRole = useCallback((ghostId: GhostId): GhostAiRole | null => {
    const roles: GhostAiRole[] = ["free", "hunter", "patrol", "cautious", "coward", "ambusher"];
    const cur = stateRef.current;
    const ghost = cur.ghosts.find((entry) => entry.id === ghostId);
    if (!ghost) return null;
    const currentIndex = roles.indexOf(ghost.aiRole);
    const nextRole = roles[(currentIndex + 1 + roles.length) % roles.length];
    setState({
      ...cur,
      ghosts: cur.ghosts.map((entry) =>
        entry.id === ghostId ? { ...entry, aiRole: nextRole } : entry,
      ),
      message: `${ghost.name.toUpperCase()} AI: ${nextRole.toUpperCase()}`,
    });
    return nextRole;
  }, []);

  const devDefeatGhost = useCallback((ghostId?: GhostId): boolean => {
    const cur = stateRef.current;
    const targetId = ghostId ?? cur.selectedGhostId;
    const ghost = cur.ghosts.find((entry) => entry.id === targetId);
    if (!ghost || !ghost.alive) return false;
    const now = performance.now();
    const delay = computeRespawnDelay(cur.ghostDeathsThisLevel, cur.effects.fastRespawn);
    const ghosts = cur.ghosts.map((entry) =>
      entry.id === targetId
        ? {
            ...entry,
            alive: false,
            vulnerable: false,
            vulnerableUntil: 0,
            respawnAt: now + delay,
          }
        : entry,
    );
    setState({
      ...cur,
      ghosts,
      ghostDeathsThisLevel: cur.ghostDeathsThisLevel + 1,
      message: `${ghost.name.toUpperCase()} DEV KO`,
    });
    return true;
  }, []);

  const devDefeatPelletGuy = useCallback((): boolean => {
    const cur = stateRef.current;
    if (!cur.pelletGuy.alive) return false;
    const scoreGain = SCORE_CATCH + (modeRef.current === "endless" ? endlessBlessingsRef.current.hunterInstinct * 50 : 0);
    setState({
      ...cur,
      score: cur.score + scoreGain,
      catches: cur.catches + 1,
      pelletGuy: {
        ...cur.pelletGuy,
        alive: false,
        respawnAt: performance.now() + RESPAWN_MS,
      },
      message: "PELLET GUY DEV KO",
    });
    return true;
  }, []);

  return {
    state,
    mode: modeRef.current,
    seed: dailyRef.current?.seed,
    dailySeedDate: dailyRef.current?.seedDate,
    setGhostDirection,
    selectGhost,
    togglePause,
    startNewGame,
    advanceLevel,
    retryLevel,
    continueEndlessRun,
    endRun,
    submitFinalScore,
    applyPowerUp,
    bonusAction,
    grantEndlessBlessing,
    setControlledGhosts,
    cycleGhostAiRole,
    devDefeatGhost,
    devDefeatPelletGuy,
    getEndlessBlessings: () => endlessBlessingsRef.current,
    getRunHazardStats: () => runHazardStatsRef.current,
  };
}
