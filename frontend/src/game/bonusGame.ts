// ============================================================================
// Bonus Games — Ghost Maze
// ----------------------------------------------------------------------------
// Every 5 levels (5, 10, 15 …) triggers a carefree bonus stage.
// Hunt appears every 10th level; others rotate on the 5s:
//   - 5, 15, 25, 35, 45   => Rally, Cherry, Timer, Rally, Cherry...
//   - 10, 20, 30, 40, 50  => Power Hunt
//
// Bonus rounds have NO lives at risk. Pellet Guy is frozen. Ghosts are fully
// player-controlled. A countdown timer drives tension; collecting items adds
// score. The level is won when all items are collected OR the timer expires.
// ============================================================================

import type { CellType } from "./types";

export const BONUS_LEVEL_INTERVAL = 5;

export type BonusGameType = "rallyRound" | "cherryChase" | "timeAttack" | "powerHunt";
export type BonusDir = "up" | "down" | "left" | "right";

export interface BonusItem {
  x: number;
  y: number;
  collected: boolean;
  /** Timestamp when a collected item should respawn (powerHunt only). */
  respawnAt?: number;
  /** For digDugDash: Pooka moves each tick; direction changes randomly. */
  dir?: BonusDir;
  /** Next tick timestamp when this Pooka moves (digDugDash only). */
  nextMoveAt?: number;
  /** digDugDash: number of pump hits received (pops at 2). */
  pumpCount?: number;
  /** digDugDash: timestamp after which pumpCount deflates back to 0. */
  deflateAt?: number;
}

export interface BonusGameState {
  type: BonusGameType;
  label: string;       // "SPEED RALLY" / "CHERRY CHASE" / "TIME ATTACK"
  subtitle: string;    // one-line flavor text shown at round start
  endsAt: number;      // performance.now() when the timer expires
  durationMs: number;  // original duration for display purposes
  items: BonusItem[];
  totalItems: number;
  collectedItems: number;
  bonusScore: number;
  complete: boolean;
  /** Power Hunt only: one trigger pellet starts hunt mode for a short window. */
  huntPellet?: {
    x: number;
    y: number;
    active: boolean;
  };
  /** Power Hunt only: while now < huntActiveUntil, pellet guys are catchable. */
  huntActiveUntil?: number;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export const BONUS_CONFIG = {
  rallyRound: {
    label: "SPEED RALLY",
    subtitle: "COLLECT ALL FLAGS!",
    durationMs: 30_000,
    itemCount: 12,
    scorePerItem: 200,
    scorePerSecondRemaining: 75,
    emoji: "🚩",
  },
  cherryChase: {
    label: "CHERRY CHASE",
    subtitle: "COLLECT ALL CHERRIES!",
    durationMs: 24_000,
    itemCount: 10,
    scorePerItem: 350,
    scorePerSecondRemaining: 80,
    emoji: "🍒",
  },
  timeAttack: {
    label: "TIME ATTACK",
    subtitle: "GRAB CLOCKS TO EXTEND TIME!",
    durationMs: 18_000,
    itemCount: 12,
    scorePerItem: 260,
    scorePerSecondRemaining: 65,
    emoji: "⏰",
  },
  powerHunt: {
    label: "POWER HUNT",
    subtitle: "HUNT 10 VULNERABLE PELLET GUYS!",
    durationMs: 18_000,
    itemCount: 10,
    scorePerItem: 260,
    scorePerSecondRemaining: 65,
    emoji: "⚡",
  },
} as const satisfies Record<
  BonusGameType,
  {
    label: string;
    subtitle: string;
    durationMs: number;
    itemCount: number;
    scorePerItem: number;
    scorePerSecondRemaining: number;
    emoji: string;
  }
>;

const POWER_HUNT_TRIGGER_WINDOW_MS = 6_000;
const POWER_HUNT_MOVE_MIN_MS = 220;
const POWER_HUNT_MOVE_JITTER_MS = 140;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function isBonusLevel(level: number): boolean {
  return level > 0 && level % BONUS_LEVEL_INTERVAL === 0;
}

/**
 * Hunt appears every 10th level.
 * Non-hunt bonus levels (5,15,25,35,45,...) cycle:
 * rallyRound -> cherryChase -> timeAttack -> rallyRound -> ...
 */
export function getBonusGameType(level: number): BonusGameType {
  if (level % 10 === 0) return "powerHunt";
  const nonHuntIndex = Math.floor((level - BONUS_LEVEL_INTERVAL) / 10);
  const order: BonusGameType[] = ["rallyRound", "cherryChase", "timeAttack"];
  return order[nonHuntIndex % order.length];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const DIRS: BonusDir[] = ["up", "down", "left", "right"];

/** Pick `count` positions from walkable pellet cells, spread across the maze. */
function pickItemPositions(
  maze: CellType[][],
  count: number,
  now: number,
  moving: boolean,
): BonusItem[] {
  const candidates: { x: number; y: number }[] = [];
  for (let y = 0; y < maze.length; y++) {
    for (let x = 0; x < maze[0].length; x++) {
      const c = maze[y][x];
      if (c === 2 || c === 3 || c === 0) {
        candidates.push({ x, y });
      }
    }
  }
  const picked = shuffle(candidates).slice(0, Math.min(count, candidates.length));
  return picked.map((p) => ({
    x: p.x,
    y: p.y,
    collected: false,
    dir: moving ? DIRS[Math.floor(Math.random() * DIRS.length)] : undefined,
    nextMoveAt: moving ? now + 600 + Math.floor(Math.random() * 400) : undefined,
  }));
}

export function createBonusGame(
  type: BonusGameType,
  maze: CellType[][],
  now: number,
): BonusGameState {
  const config = BONUS_CONFIG[type];
  const moving = type === "powerHunt";
  const items = pickItemPositions(maze, config.itemCount, now, moving);
  const occupied = new Set(items.map((i) => `${i.x},${i.y}`));
  const walkableCells: { x: number; y: number }[] = [];
  if (type === "powerHunt") {
    for (let y = 0; y < maze.length; y++) {
      for (let x = 0; x < maze[0].length; x++) {
        const c = maze[y][x];
        if (c === 0 || c === 2 || c === 3) walkableCells.push({ x, y });
      }
    }
  }
  let huntPellet: BonusGameState["huntPellet"] = undefined;
  if (type === "powerHunt") {
    const candidates = walkableCells.filter((cell) => !occupied.has(`${cell.x},${cell.y}`));
    const chosen =
      candidates[Math.floor(Math.random() * Math.max(1, candidates.length))] ??
      { x: items[0]?.x ?? 1, y: items[0]?.y ?? 1 };
    huntPellet = { x: chosen.x, y: chosen.y, active: true };
  }
  return {
    type,
    label: config.label,
    subtitle: config.subtitle,
    endsAt: now + config.durationMs,
    durationMs: config.durationMs,
    items,
    totalItems: items.length,
    collectedItems: 0,
    bonusScore: 0,
    complete: false,
    huntPellet,
    huntActiveUntil: 0,
  };
}

// ---------------------------------------------------------------------------
// Per-tick update
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Player action hook retained for compatibility; bonus stages are walk-over only.
// ---------------------------------------------------------------------------

export function fireBonusAction(
  bonus: BonusGameState,
  _ghostX: number,
  _ghostY: number,
  _ghostDir: string,
): BonusGameState {
  return bonus;
}

export function tickBonusGame(
  bonus: BonusGameState,
  maze: CellType[][],
  ghostPositions: { x: number; y: number }[],
  now: number,
): { next: BonusGameState; collectedNow: number; bonusPointsEarned: number } {
  if (bonus.complete) {
    return { next: bonus, collectedNow: 0, bonusPointsEarned: 0 };
  }

  const config = BONUS_CONFIG[bonus.type];
  const timedOut = now >= bonus.endsAt;

  let items = bonus.items;
  let huntPellet = bonus.huntPellet;
  let huntActiveUntil = bonus.huntActiveUntil ?? 0;

  let collectedNow = 0;
  let bonusPointsEarned = 0;

  const walkableCells: { x: number; y: number }[] = [];
  if (bonus.type === "powerHunt") {
    for (let y = 0; y < maze.length; y++) {
      for (let x = 0; x < maze[0].length; x++) {
        const c = maze[y][x];
        if (c === 0 || c === 2 || c === 3) walkableCells.push({ x, y });
      }
    }
  }
  const occupied = new Set<string>(items.map((i) => `${i.x},${i.y}`));

  if (bonus.type === "powerHunt") {
    const ghost = ghostPositions[0];
    const deltas: Record<BonusDir, [number, number]> = {
      up: [0, -1],
      down: [0, 1],
      left: [-1, 0],
      right: [1, 0],
    };
    const isWalkable = (x: number, y: number) => {
      const c = maze[y]?.[x];
      return c === 0 || c === 2 || c === 3;
    };
    const manhattan = (x1: number, y1: number, x2: number, y2: number) =>
      Math.abs(x1 - x2) + Math.abs(y1 - y2);

    items = items.map((item) => {
      if (!ghost || (item.nextMoveAt ?? 0) > now) return item;
      const currentDist = manhattan(item.x, item.y, ghost.x, ghost.y);
      const dirs = DIRS.map((dir) => {
        const [dx, dy] = deltas[dir];
        const nx = item.x + dx;
        const ny = item.y + dy;
        return { dir, nx, ny };
      }).filter((d) => isWalkable(d.nx, d.ny));
      if (dirs.length === 0) {
        return {
          ...item,
          nextMoveAt: now + POWER_HUNT_MOVE_MIN_MS + Math.floor(Math.random() * POWER_HUNT_MOVE_JITTER_MS),
        };
      }
      const scored = dirs.map((d) => ({
        ...d,
        score: manhattan(d.nx, d.ny, ghost.x, ghost.y),
      }));
      scored.sort((a, b) => b.score - a.score);
      const best = scored.filter((s) => s.score === scored[0].score);
      const move = best[Math.floor(Math.random() * best.length)];
      const shouldMove = move.score >= currentDist || Math.random() < 0.5;
      return {
        ...item,
        x: shouldMove ? move.nx : item.x,
        y: shouldMove ? move.ny : item.y,
        dir: move.dir,
        nextMoveAt: now + POWER_HUNT_MOVE_MIN_MS + Math.floor(Math.random() * POWER_HUNT_MOVE_JITTER_MS),
      };
    });
  }

  items = items.map((item) => {
    if (bonus.type === "powerHunt") {
      const huntActive = now < huntActiveUntil;
      if (!huntActive) return { ...item, collected: false };
      const touched = ghostPositions.some((g) => g.x === item.x && g.y === item.y);
      if (!touched) return { ...item, collected: false };
      collectedNow++;
      bonusPointsEarned += config.scorePerItem;
      const openCells = walkableCells.filter((cell) => !occupied.has(`${cell.x},${cell.y}`));
      if (openCells.length > 0) {
        const chosen = openCells[Math.floor(Math.random() * openCells.length)];
        occupied.add(`${chosen.x},${chosen.y}`);
        return {
          ...item,
          x: chosen.x,
          y: chosen.y,
          collected: false,
          nextMoveAt: now + POWER_HUNT_MOVE_MIN_MS + Math.floor(Math.random() * POWER_HUNT_MOVE_JITTER_MS),
        };
      }
      return { ...item, collected: false };
    }

    const touched = ghostPositions.some((g) => g.x === item.x && g.y === item.y);
    if (!touched) return item;
    collectedNow++;
    bonusPointsEarned += config.scorePerItem;
    return { ...item, collected: true };
  });

  if (bonus.type === "powerHunt") {
    if (huntPellet?.active) {
      const touched = ghostPositions.some((g) => g.x === huntPellet?.x && g.y === huntPellet?.y);
      if (touched) {
        huntActiveUntil = now + POWER_HUNT_TRIGGER_WINDOW_MS;
        huntPellet = { ...huntPellet, active: false };
      }
    } else if (now >= huntActiveUntil) {
      const openCells = walkableCells.filter((cell) => !occupied.has(`${cell.x},${cell.y}`));
      if (openCells.length > 0) {
        const chosen = openCells[Math.floor(Math.random() * openCells.length)];
        huntPellet = { x: chosen.x, y: chosen.y, active: true };
      }
    }
  }

  const collectedItems = bonus.collectedItems + collectedNow;
  const allCollected = collectedItems >= bonus.totalItems;

  // Time bonus awarded only when completing by collecting all items.
  if (allCollected && collectedNow > 0) {
    const secsLeft = Math.max(0, Math.floor((bonus.endsAt - now) / 1000));
    bonusPointsEarned += secsLeft * config.scorePerSecondRemaining;
  }

  let endsAt = bonus.endsAt;
  // Time Attack extends timer on pickup for "chase the clock" gameplay.
  if (bonus.type === "timeAttack" && collectedNow > 0 && !timedOut) {
    endsAt = Math.min(bonus.endsAt + collectedNow * 1000, now + 8000);
  }
  const complete = bonus.type === "powerHunt" ? now >= endsAt : allCollected || now >= endsAt;

  return {
    next: {
      ...bonus,
      items,
      huntPellet,
      huntActiveUntil,
      endsAt,
      collectedItems,
      bonusScore: bonus.bonusScore + bonusPointsEarned,
      complete,
    },
    collectedNow,
    bonusPointsEarned,
  };
}

export function bonusTimeRemainingMs(bonus: BonusGameState, now: number): number {
  return Math.max(0, bonus.endsAt - now);
}
