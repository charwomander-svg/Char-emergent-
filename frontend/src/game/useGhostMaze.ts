// Main game state hook - manages the entire game logic
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  SCORE_CATCH,
  SCORE_COMBO_BONUS,
  SCORE_PELLET,
  SCORE_PER_PERCENT_REMAINING,
  SCORE_SUPER_PELLET,
  SPEED,
  STARTING_LIVES,
  SUPER_PELLET_DURATION_MS,
} from "./constants";
import { generateMaze, isWalkable } from "./maze";
import { applyDirection, choosePelletGuyDirection, opposite } from "./ai";

function createInitialGhosts(
  spawns: { x: number; y: number }[],
): Ghost[] {
  return [0, 1, 2, 3].map((id) => ({
    id: id as GhostId,
    color: COLORS.ghosts[id],
    name: COLORS.ghostNames[id],
    x: spawns[id].x,
    y: spawns[id].y,
    spawnX: spawns[id].x,
    spawnY: spawns[id].y,
    direction: "up",
    nextDirection: "up",
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

function buildInitialState(level: number, lives: number, score: number): GameState {
  const { maze, ghostSpawns, pelletGuySpawn, totalPellets } = generateMaze(level);
  return {
    status: "ready",
    level,
    lives,
    score,
    catches: 0,
    totalPellets,
    pelletsRemaining: totalPellets,
    maze,
    ghosts: createInitialGhosts(ghostSpawns),
    pelletGuy: createInitialPelletGuy(pelletGuySpawn),
    lastComboTime: 0,
    comboCount: 0,
    message: `LEVEL ${level}`,
    selectedGhostId: 0,
  };
}

// Speed scaling per level
function speedScale(level: number): number {
  // 1.0 at level 1, decreasing toward ~0.55 by level 10 (faster)
  return Math.max(0.55, 1 - (level - 1) * 0.05);
}

export function useGhostMaze() {
  const [state, setState] = useState<GameState>(() =>
    buildInitialState(1, STARTING_LIVES, 0),
  );

  // entity tick timers stored in refs (don't trigger rerenders)
  const lastGhostMoveRef = useRef<number[]>([0, 0, 0, 0]);
  const lastPelletGuyMoveRef = useRef<number>(0);
  const readyStartRef = useRef<number>(performance.now());
  const lastFrameRef = useRef<number>(performance.now());
  const rafRef = useRef<number | null>(null);
  const stateRef = useRef<GameState>(state);
  stateRef.current = state;

  const startLevel = useCallback((level: number, lives: number, score: number) => {
    const fresh = buildInitialState(level, lives, score);
    readyStartRef.current = performance.now();
    lastGhostMoveRef.current = [0, 0, 0, 0];
    lastPelletGuyMoveRef.current = 0;
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
      if (prev.status === "playing") return { ...prev, status: "paused" };
      if (prev.status === "paused") return { ...prev, status: "playing" };
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
      }
      return;
    }

    if (prev.status !== "playing") return;

    const scale = speedScale(prev.level);
    const ghostInterval = SPEED.ghost * scale;
    const ghostVulnInterval = SPEED.ghostVulnerable * scale;
    const pgInterval = SPEED.pelletGuy * scale;

    let nextState: GameState = prev;
    let mutated = false;

    // --- move ghosts ---
    const newGhosts = [...prev.ghosts];
    for (let i = 0; i < 4; i++) {
      const g = newGhosts[i];
      // handle respawn
      if (!g.alive) {
        if (now >= g.respawnAt) {
          newGhosts[i] = {
            ...g,
            alive: true,
            x: g.spawnX,
            y: g.spawnY,
            direction: "up",
            nextDirection: "up",
            vulnerable: false,
            vulnerableUntil: 0,
          };
          lastGhostMoveRef.current[i] = now;
          mutated = true;
        }
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
        const choice = (nonReverse.length > 0 ? nonReverse : validDirs)[
          Math.floor(Math.random() * (nonReverse.length > 0 ? nonReverse.length : validDirs.length))
        ];
        dir = choice;
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
    } else if (now - lastPelletGuyMoveRef.current >= pgInterval) {
      lastPelletGuyMoveRef.current = now;

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
      if (atIntersection) {
        dir = choosePelletGuyDirection(prev.maze, pg, prev.level);
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
          score += SCORE_PELLET;
        } else if (cell === 3) {
          maze = maze.map((row, ry) =>
            ry === next.y
              ? row.map((c, cx) => (cx === next.x ? (0 as CellType) : c))
              : row,
          );
          score += SCORE_SUPER_PELLET;
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
      }
    }

    // --- collision detection ---
    let catches = prev.catches;
    let lastComboTime = prev.lastComboTime;
    let comboCount = prev.comboCount;
    let lives = prev.lives;
    let status: GameState["status"] = prev.status;
    let message = prev.message;

    if (pg.alive) {
      for (let i = 0; i < newGhosts.length; i++) {
        const g = newGhosts[i];
        if (!g.alive) continue;
        if (g.x === pg.x && g.y === pg.y) {
          if (g.vulnerable) {
            // Pellet guy eats ghost
            newGhosts[i] = {
              ...g,
              alive: false,
              respawnAt: now + RESPAWN_MS,
              vulnerable: false,
              vulnerableUntil: 0,
            };
            score += 100;
            mutated = true;
          } else {
            // Ghost catches pellet guy!
            catches++;
            if (now - lastComboTime < COMBO_WINDOW_MS) {
              comboCount++;
              score += SCORE_COMBO_BONUS * comboCount;
            } else {
              comboCount = 0;
            }
            lastComboTime = now;
            score += SCORE_CATCH;

            // Pellet Guy temporarily down
            pg = {
              ...pg,
              alive: false,
              respawnAt: now + RESPAWN_MS,
            };
            mutated = true;

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
        } else {
          status = "levelLost";
          message = "PELLET GUY WINS!\nHe ate all the pellets!";
        }
      } else {
        const aliveGhosts = newGhosts.filter((g) => g.alive).length;
        if (aliveGhosts === 0) {
          lives--;
          if (lives <= 0) {
            status = "gameOver";
            message = "GAME OVER\nAll ghosts devoured!";
          } else {
            status = "levelLost";
            message = "PELLET GUY WINS!\nHe ate all your ghosts!";
          }
        }
      }
    }

    if (mutated || status !== prev.status) {
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
      };
      setState(nextState);
    }
  }, []);

  // Game loop
  useEffect(() => {
    const loop = () => {
      const now = performance.now();
      lastFrameRef.current = now;
      tick(now);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [tick]);

  // Auto-advance from levelWon -> next level after a short delay
  const advanceLevel = useCallback(() => {
    startLevel(state.level + 1, state.lives, state.score);
  }, [state.level, state.lives, state.score, startLevel]);

  const retryLevel = useCallback(() => {
    startLevel(state.level, state.lives, state.score);
  }, [state.level, state.lives, state.score, startLevel]);

  return {
    state,
    setGhostDirection,
    selectGhost,
    togglePause,
    startNewGame,
    advanceLevel,
    retryLevel,
  };
}
