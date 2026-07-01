// Main game state hook - manages the entire game logic
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  CellType,
  Direction,
  GameState,
  Ghost,
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
import { applyDirection, choosePelletGuyDirection, opposite } from "./ai";
import { getSoundEngine } from "./sounds";
import { loadProgress, saveProgress, getTheme, ProgressData } from "./progress";
import type { PowerUpId } from "./powerups";
import { COIN_REWARD } from "./economy";
import type { ActiveEffects } from "./types";
import { loadSettings } from "./settings";
import {
  isBonusLevel,
  getBonusGameType,
  createBonusGame,
  tickBonusGame,
  fireBonusAction,
  BONUS_CONFIG,
} from "./bonusGame";
const EMPTY_EFFECTS: ActiveEffects = {
  speedBoostUntil: 0,
  freezeUntil: 0,
  magnetUntil: 0,
  revealUntil: 0,
  shieldGhostId: null,
  fastRespawn: false,
  decoy: null,
};

function createInitialGhosts(
  spawns: { x: number; y: number }[],
  themeId: string,
): Ghost[] {
  const theme = getTheme(themeId);
  return [0, 1, 2, 3].map((id) => ({
    id: id as GhostId,
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
    alive: true,
    respawnAt: 0,
  }));
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
): GameState {
  const { maze, ghostSpawns, pelletGuySpawn, totalPellets } = generateMaze(
    level,
    daily?.seed,
  );
  const bonusActive = isBonusLevel(level);
  const now = performance.now();
  return {
    status: "ready",
    level,
    lives,
    score,
    catches: 0,
    totalPellets,
    pelletsRemaining: totalPellets,
    maze,
    ghosts: createInitialGhosts(ghostSpawns, themeId),
    pelletGuy: createInitialPelletGuy(pelletGuySpawn),
    lastComboTime: 0,
    comboCount: 0,
    message: bonusActive
      ? `🎮 BONUS STAGE! 🎮\n${BONUS_CONFIG[getBonusGameType(level)].label}`
      : daily
        ? `DAILY ${daily.seedDate}`
        : `LEVEL ${level}`,
    selectedGhostId: 0,
    barricades: [],
    ghostDeathsThisLevel: 0,
    effects: { ...EMPTY_EFFECTS },
    bonusGame: bonusActive
      ? createBonusGame(getBonusGameType(level), maze, now)
      : null,
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

export function useGhostMaze(opts?: {
  mode?: "classic" | "daily" | "custom" | "speedrun";
  dailySeed?: number;
  dailySeedDate?: string;
  startingLevel?: number;
  onCoinsEarned?: (n: number, reason: "pellet" | "superPellet" | "catch" | "levelClear" | "perfect") => void;
}) {
  const themeIdRef = useRef<string>("classic");
  const progressRef = useRef<ProgressData | null>(null);
  const modeRef = useRef<"classic" | "daily" | "custom" | "speedrun">(opts?.mode ?? "classic");
  const musicEnabledRef = useRef<boolean>(true);
  const dailyRef = useRef<{ seed: number; seedDate: string } | null>(
    opts?.dailySeed != null
      ? { seed: opts.dailySeed, seedDate: opts.dailySeedDate ?? "" }
      : null,
  );
  const onCoinsEarnedRef = useRef(opts?.onCoinsEarned);
  onCoinsEarnedRef.current = opts?.onCoinsEarned;
  const initialLevel = Math.max(1, opts?.startingLevel ?? 1);

  const [state, setState] = useState<GameState>(() =>
    buildInitialState(initialLevel, STARTING_LIVES, 0, "classic", dailyRef.current),
  );

  // Load saved progress (theme + stats) on mount
  useEffect(() => {
    loadProgress().then((p) => {
      progressRef.current = p;
      themeIdRef.current = p.selectedThemeId;
      setState((cur) => {
        if (cur.status !== "ready" || cur.level !== initialLevel || cur.score !== 0) return cur;
        return buildInitialState(
          initialLevel,
          STARTING_LIVES,
          0,
          p.selectedThemeId,
          dailyRef.current,
        );
      });
    });
  }, [initialLevel]);

  useEffect(() => {
    loadSettings().then((s) => {
      musicEnabledRef.current = !!s.musicOn && !!s.soundOn;
    });
  }, []);

  // entity tick timers stored in refs (don't trigger rerenders)
  const lastGhostMoveRef = useRef<number[]>([0, 0, 0, 0]);
  const lastPelletGuyMoveRef = useRef<number>(0);
  const readyStartRef = useRef<number>(performance.now());
  const lastFrameRef = useRef<number>(performance.now());
  const rafRef = useRef<number | null>(null);
  const stateRef = useRef<GameState>(state);
  stateRef.current = state;
  // Ghost-house exit stagger
  const ghostReleaseAtRef = useRef<number[]>([0, 0, 0, 0]);

  const startLevel = useCallback((level: number, lives: number, score: number) => {
    const fresh = buildInitialState(
      level,
      lives,
      score,
      themeIdRef.current,
      dailyRef.current,
    );
    readyStartRef.current = performance.now();
    lastGhostMoveRef.current = [0, 0, 0, 0];
    lastPelletGuyMoveRef.current = 0;
    ghostReleaseAtRef.current = [0, 0, 0, 0];
    setState(fresh);
  }, []);

  const startNewGame = useCallback(() => {
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
        const canApply = isWalkable(prev.maze, next.x, next.y, false);
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
    setState((prev) => ({ ...prev, selectedGhostId: ghostId }));
  }, []);

  const togglePause = useCallback(() => {
    setState((prev) => {
      if (prev.status === "playing") {
        getSoundEngine().stopMusic();
        return { ...prev, status: "paused" };
      }
      if (prev.status === "paused") {
        if (musicEnabledRef.current) getSoundEngine().startMusic();
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
        if (musicEnabledRef.current) getSoundEngine().startMusic();
      }
      return;
    }

    if (prev.status !== "playing") return;

    const scale = speedScale(prev.level);
    const effects = prev.effects;
    const speedBoostActive = effects.speedBoostUntil > now;
    const freezeActive = effects.freezeUntil > now;
    const magnetActive = effects.magnetUntil > now;
    const ghostSpeedMult = speedBoostActive ? 0.6 : 1.0;
    const ghostInterval = SPEED.ghost * scale * ghostSpeedMult;
    const ghostVulnInterval = SPEED.ghostVulnerable * scale * ghostSpeedMult;
    // Boss makes Pellet Guy faster (smaller interval) in later phases.
    const pgInterval = SPEED.pelletGuy * scale;

    let nextState: GameState = prev;
    let mutated = false;

    // --- move ghosts ---
    const newGhosts = [...prev.ghosts];
    for (let i = 0; i < 4; i++) {
      // During bonus rounds only the selected ghost moves.
      if (prev.bonusGame && i !== prev.selectedGhostId) continue;

      const g = newGhosts[i];
      // handle respawn
      if (!g.alive) {
        if (now >= g.respawnAt) {
          newGhosts[i] = {
            ...g,
            alive: true,
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
      let dir = ghost.nextDirection;
      let next = applyDirection(ghost.x, ghost.y, dir);
      if (!isWalkable(prev.maze, next.x, next.y, false)) {
        dir = ghost.direction;
        next = applyDirection(ghost.x, ghost.y, dir);
      }
      if (!isWalkable(prev.maze, next.x, next.y, false)) {
        // Both queued and current direction blocked - pick any valid direction
        // (so ghost doesn't sit forever if user-set direction hits a wall)
        const validDirs = (["up", "down", "left", "right"] as Direction[]).filter(
          (d) => {
            const n = applyDirection(ghost.x, ghost.y, d);
            return isWalkable(prev.maze, n.x, n.y, false);
          },
        );
        if (validDirs.length === 0) continue; // truly stuck
        // Prefer non-reverse if possible
        const reverse = opposite(ghost.direction);
        const nonReverse = validDirs.filter((d) => d !== reverse);
        const candidates = nonReverse.length > 0 ? nonReverse : validDirs;
        // Chase PelletGuy: sort by Manhattan distance to PG, prefer closer
        const pgX = prev.pelletGuy.x;
        const pgY = prev.pelletGuy.y;
        const scored = candidates.map((d) => {
          const n = applyDirection(ghost.x, ghost.y, d);
          return { d, dist: Math.abs(n.x - pgX) + Math.abs(n.y - pgY) };
        });
        scored.sort((a, b) => a.dist - b.dist);
        // Pick best or second-best (slight randomness so ghosts don't all take exact same path)
        const topK = scored.slice(0, Math.min(2, scored.length));
        dir = topK[Math.floor(Math.random() * topK.length)].d;
        next = applyDirection(ghost.x, ghost.y, dir);
      }
      newGhosts[i] = { ...ghost, x: next.x, y: next.y, direction: dir };
      mutated = true;
    }

    // --- move pellet guy ---
    let pg = prev.pelletGuy;
    let maze = prev.maze;
    let pelletsRemaining = prev.pelletsRemaining;
    let score = prev.score;
    let barricades = prev.barricades;
    let ghostDeathsThisLevel = prev.ghostDeathsThisLevel;
    // Bonus game state evolves each tick.
    let bonusGame = prev.bonusGame;
    let status: GameState["status"] = prev.status;
    let message = prev.message;

    if (!pg.alive) {
      if (now >= pg.respawnAt) {
        pg = {
          ...pg,
          alive: true,
          x: pg.spawnX,
          y: pg.spawnY,
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
      if (bonusGame && !bonusGame.complete) {
        // Only the selected ghost participates in bonus stages.
        const activeGhost = newGhosts[prev.selectedGhostId];
        const ghostPos = activeGhost?.alive
          ? [{ x: activeGhost.x, y: activeGhost.y }]
          : [];
        const { next, collectedNow, bonusPointsEarned } = tickBonusGame(
          bonusGame,
          maze,
          ghostPos,
          now,
        );
        if (collectedNow > 0 || next.complete !== bonusGame.complete) {
          bonusGame = next;
          score += bonusPointsEarned;
          mutated = true;
          if (collectedNow > 0) getSoundEngine().catchHit();
        } else {
          bonusGame = next;
        }

        if (bonusGame.complete) {
          const allClear = bonusGame.collectedItems >= bonusGame.totalItems;
          status = "levelWon";
          const config = BONUS_CONFIG[bonusGame.type];
          if (allClear) {
            message = `🎉 BONUS CLEAR!\n+${bonusGame.bonusScore} BONUS POINTS`;
          } else {
            message = `⏱ TIME UP!\n+${bonusGame.bonusScore} BONUS POINTS`;
          }
          getSoundEngine().levelWin();
          if (progressRef.current) {
            const p = { ...progressRef.current };
            p.highestLevel = Math.max(p.highestLevel, prev.level + 1);
            p.highScore = Math.max(p.highScore, score);
            progressRef.current = p;
            saveProgress(p);
          }
          const lvlCoins = COIN_REWARD.levelClear + Math.floor(bonusGame.bonusScore / 100);
          onCoinsEarnedRef.current?.(lvlCoins, "levelClear");
          mutated = true;
        }
      }

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
          onCoinsEarnedRef.current?.(COIN_REWARD.pellet, "pellet");
        } else if (cell === 3) {
          maze = maze.map((row, ry) =>
            ry === next.y
              ? row.map((c, cx) => (cx === next.x ? (0 as CellType) : c))
              : row,
          );
          getSoundEngine().superPellet();
          onCoinsEarnedRef.current?.(COIN_REWARD.superPellet, "superPellet");
          // make all alive ghosts vulnerable
          for (let i = 0; i < newGhosts.length; i++) {
            if (newGhosts[i].alive) {
              newGhosts[i] = {
                ...newGhosts[i],
                vulnerable: true,
                vulnerableUntil: now + SUPER_PELLET_DURATION_MS,
              };
            }
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
              TRAP_DROP_BASE_CHANCE + (prev.level - 1) * TRAP_DROP_LEVEL_BOOST,
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
    let effectsNext: ActiveEffects = effects;
    for (let i = 0; i < newGhosts.length; i++) {
      const g = newGhosts[i];
      if (!g.alive) continue;
      if (maze[g.y][g.x] === 6) {
        // Spike triggered. Consume the spike either way.
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

        const delay = computeRespawnDelay(ghostDeathsThisLevel, effects.fastRespawn);
        ghostDeathsThisLevel++;
        newGhosts[i] = {
          ...g,
          alive: false,
          respawnAt: now + delay,
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
        if (g.x === pg.x && g.y === pg.y) {
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
            // Shield blocks one chomp
            if (effectsNext.shieldGhostId === g.id) {
              effectsNext = { ...effectsNext, shieldGhostId: null };
              newGhosts[i] = { ...g, vulnerable: false, vulnerableUntil: 0 };
              getSoundEngine().uiClick();
              mutated = true;
              continue;
            }
            // Pellet guy eats ghost
            const delay = computeRespawnDelay(ghostDeathsThisLevel, effects.fastRespawn);
            ghostDeathsThisLevel++;
            newGhosts[i] = {
              ...g,
              alive: false,
              respawnAt: now + delay,
              vulnerable: false,
              vulnerableUntil: 0,
            };
            mutated = true;
            getSoundEngine().ghostEaten();
          } else {
            // ------------------------------------------------------------
            // Ghost catches Pellet Guy. On boss levels each catch deals
            // 1 HP — third catch (HP=0) is treated as a level win with a
            // big bonus.
            // ------------------------------------------------------------
            catches++;
            let triggeredCombo = false;
            if (now - lastComboTime < COMBO_WINDOW_MS) {
              comboCount++;
              score += SCORE_COMBO_BONUS * comboCount;
              triggeredCombo = true;
            } else {
              comboCount = 0;
            }
            lastComboTime = now;
            score += SCORE_CATCH;
            onCoinsEarnedRef.current?.(COIN_REWARD.catch, "catch");
            if (triggeredCombo) {
              getSoundEngine().comboHit(comboCount);
            } else {
              getSoundEngine().catchHit();
            }

            // Pellet Guy temporarily down
            pg = {
              ...pg,
              alive: false,
              respawnAt: now + RESPAWN_MS,
            };
            mutated = true;

            // ---- Non-bonus level: classic 3-catch win. ----
            if (catches >= CATCH_TO_WIN) {
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

              // Award level coins
              const lvlCoins = COIN_REWARD.levelClear + Math.floor(pctRemaining * COIN_REWARD.perPercentRemaining);
              onCoinsEarnedRef.current?.(lvlCoins, "levelClear");
              if (pctRemaining === 100) {
                onCoinsEarnedRef.current?.(COIN_REWARD.perfectBonus, "perfect");
              }

              // Persist progress
              if (progressRef.current) {
                const p = { ...progressRef.current };
                p.highestLevel = Math.max(p.highestLevel, prev.level + 1);
                p.totalCatches = p.totalCatches + CATCH_TO_WIN;
                if (pctRemaining === 100) p.perfectClears = p.perfectClears + 1;
                p.highScore = Math.max(p.highScore, score);
                // Auto-unlock theme entries by re-scanning
                progressRef.current = p;
                saveProgress(p);
              }
            }
            break; // only one catch per tick
          }
        }
      }
    }

    // --- loss conditions ---
    if (status === "playing") {
      if (pelletsRemaining <= 0) {
        // Pellet guy ate all pellets - lose life
        lives--;
        if (lives <= 0) {
          status = "gameOver";
          message = "GAME OVER\nPellet Guy ate everything!";
          getSoundEngine().levelLose();
          getSoundEngine().stopMusic();
          // Save high score
          if (progressRef.current) {
            const p = { ...progressRef.current };
            p.highScore = Math.max(p.highScore, score);
            progressRef.current = p;
            saveProgress(p);
          }
        } else {
          status = "levelLost";
          message = "PELLET GUY WINS!\nHe ate all the pellets!";
          getSoundEngine().levelLose();
        }
      } else {
        const aliveGhosts = newGhosts.filter((g) => g.alive).length;
        if (aliveGhosts === 0) {
          lives--;
          if (lives <= 0) {
            status = "gameOver";
            message = "GAME OVER\nAll ghosts devoured!";
            getSoundEngine().levelLose();
            getSoundEngine().stopMusic();
            if (progressRef.current) {
              const p = { ...progressRef.current };
              p.highScore = Math.max(p.highScore, score);
              progressRef.current = p;
              saveProgress(p);
            }
          } else {
            status = "levelLost";
            message = "PELLET GUY WINS!\nHe ate all your ghosts!";
            getSoundEngine().levelLose();
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
        barricades,
        ghostDeathsThisLevel,
        effects: effectsNext,
        bonusGame,
      };
      setState(nextState);
    }
  }, []);
// --- Input Management ---
  const inputRef = useRef<{
    ghostId: GhostId;
    dir: Direction;
  } | null>(null);

  const setInput = useCallback((ghostId: GhostId, dir: Direction) => {
    inputRef.current = { ghostId, dir };
  }, []);

  const applyInput = useCallback(() => {
    if (!inputRef.current) return;
    const { ghostId, dir } = inputRef.current;
    setGhostDirection(ghostId, dir);
    inputRef.current = null;
  }, [setGhostDirection]);

  // --- Main Game Animation Loop ---
  useEffect(() => {
    const loop = (now: number) => {
      tick(now);
      applyInput();
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [tick, applyInput]); const advanceLevel = useCallback(() => {
    if (state.level >= MAX_LEVELS) {
      // All 50 levels cleared — game complete!
      setState((prev) => ({
        ...prev,
        status: "gameOver",
        message: `🏆 YOU BEAT ALL ${MAX_LEVELS} LEVELS!\nFINAL SCORE: ${prev.score}`,
      }));
      if (progressRef.current) {
        const p = { ...progressRef.current };
        p.highScore = Math.max(p.highScore, state.score);
        progressRef.current = p;
        saveProgress(p);
      }
      getSoundEngine().levelWin();
      return;
    }
    startLevel(state.level + 1, state.lives, state.score);
  }, [state.level, state.lives, state.score, startLevel]);

  const retryLevel = useCallback(() => {
    startLevel(state.level, state.lives, state.score);
  }, [state.level, state.lives, state.score, startLevel]);

  const submitFinalScore = useCallback(
    async (playerName: string, runTimeMs?: number) => {
      const { submitScore } = await import("./api");
      const isDaily = modeRef.current === "daily" && dailyRef.current?.seedDate;
      const isSpeedrun = modeRef.current === "speedrun";
      return submitScore({
        player_name: playerName,
        score: state.score,
        level: state.level,
        catches: state.catches,
        theme_id: themeIdRef.current,
        // Custom challenges score against classic leaderboard (no daily date)
        mode: isDaily ? "daily" : isSpeedrun ? "speedrun" : "classic",
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
        nextState = {
          ...cur,
          effects: { ...cur.effects, freezeUntil: now + 4000 },
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
    setState((prev) => {
      const bonus = prev.bonusGame;
      if (!bonus || bonus.complete) return prev;
      if (bonus.type !== "galagaBlitz" && bonus.type !== "digDugDash") return prev;
      const ghost = prev.ghosts[prev.selectedGhostId];
      if (!ghost?.alive) return prev;
      const nextBonus = fireBonusAction(bonus, ghost.x, ghost.y, ghost.direction);
      if (nextBonus === bonus) return prev;
      return { ...prev, bonusGame: nextBonus };
    });
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
    submitFinalScore,
    applyPowerUp,
    bonusAction,
  };
}
