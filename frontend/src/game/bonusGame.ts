// ============================================================================
// Bonus Games — Ghost Maze
// ----------------------------------------------------------------------------
// Every 5 levels (5, 10, 15 …) triggers a carefree bonus stage instead of
// a boss fight. Three types rotate in order:
//   1. RALLY ROUND   (Rally-X)  — collect flags before time runs out
//   2. GALAGA BLITZ  (Galaga)   — destroy target formations
//   3. DIG DUG DASH  (Dig Dug)  — squash roaming Pookas
//
// Bonus rounds have NO lives at risk. Pellet Guy is frozen. Ghosts are fully
// player-controlled. A countdown timer drives tension; collecting items adds
// score. The level is won when all items are collected OR the timer expires.
// ============================================================================

import type { CellType } from "./types";

export const BONUS_LEVEL_INTERVAL = 5;

export type BonusGameType = "rallyRound" | "galagaBlitz" | "digDugDash";
export type BonusDir = "up" | "down" | "left" | "right";

export interface BonusItem {
  x: number;
  y: number;
  collected: boolean;
  /** For digDugDash: Pooka moves each tick; direction changes randomly. */
  dir?: BonusDir;
  /** Next tick timestamp when this Pooka moves (digDugDash only). */
  nextMoveAt?: number;
}

export interface BonusProjectile {
  x: number;
  y: number;
  dir: BonusDir;
}

export interface BonusGameState {
  type: BonusGameType;
  label: string;       // "RALLY ROUND" / "GALAGA BLITZ" / "DIG DUG DASH"
  subtitle: string;    // one-line flavor text shown at round start
  endsAt: number;      // performance.now() when the timer expires
  durationMs: number;  // original duration for display purposes
  items: BonusItem[];
  totalItems: number;
  collectedItems: number;
  bonusScore: number;
  complete: boolean;
  /** Active projectile for galagaBlitz (null = none in flight). */
  projectile?: BonusProjectile | null;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export const BONUS_CONFIG = {
  rallyRound: {
    label: "RALLY ROUND",
    subtitle: "COLLECT ALL FLAGS!",
    durationMs: 30_000,
    itemCount: 12,
    scorePerItem: 200,
    scorePerSecondRemaining: 75,
    emoji: "🚩",
  },
  galagaBlitz: {
    label: "GALAGA BLITZ",
    subtitle: "DESTROY ALL TARGETS!",
    durationMs: 25_000,
    itemCount: 10,
    scorePerItem: 300,
    scorePerSecondRemaining: 100,
    emoji: "🎯",
  },
  digDugDash: {
    label: "DIG DUG DASH",
    subtitle: "SQUASH THE POOKAS!",
    durationMs: 20_000,
    itemCount: 6,
    scorePerItem: 500,
    scorePerSecondRemaining: 50,
    emoji: "👾",
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function isBonusLevel(level: number): boolean {
  return level > 0 && level % BONUS_LEVEL_INTERVAL === 0;
}

/**
 * Rotate through three types as bonus encounters accumulate.
 * Encounter 1 → rallyRound, 2 → galagaBlitz, 3 → digDugDash, 4 → rallyRound …
 */
export function getBonusGameType(level: number): BonusGameType {
  const encounterIndex = Math.floor(level / BONUS_LEVEL_INTERVAL); // 1-based
  const order: BonusGameType[] = ["rallyRound", "galagaBlitz", "digDugDash"];
  return order[(encounterIndex - 1) % order.length];
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
  const moving = type === "digDugDash";
  const items = pickItemPositions(maze, config.itemCount, now, moving);
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
  };
}

// ---------------------------------------------------------------------------
// Per-tick update
// ---------------------------------------------------------------------------

const POOKA_INTERVAL_MS = 550; // how often a Pooka moves one cell

function isWalkableCell(maze: CellType[][], x: number, y: number): boolean {
  if (y < 0 || y >= maze.length || x < 0 || x >= maze[0].length) return false;
  const c = maze[y][x];
  return c !== 1 && c !== 7; // not a wall or barricade
}

function movePookaItem(
  item: BonusItem,
  maze: CellType[][],
  now: number,
): BonusItem {
  if (item.collected || item.nextMoveAt == null || now < item.nextMoveAt) {
    return item;
  }

  const DELTA: Record<string, [number, number]> = {
    up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0],
  };

  let dir = item.dir ?? "right";

  // Try current direction; if blocked pick a random valid direction.
  const [dx, dy] = DELTA[dir];
  let nx = item.x + dx;
  let ny = item.y + dy;

  if (!isWalkableCell(maze, nx, ny)) {
    const validDirs = DIRS.filter((d) => {
      const [vdx, vdy] = DELTA[d];
      return isWalkableCell(maze, item.x + vdx, item.y + vdy);
    });
    if (validDirs.length === 0) {
      return {
        ...item,
        nextMoveAt: now + POOKA_INTERVAL_MS,
      };
    }
    dir = validDirs[Math.floor(Math.random() * validDirs.length)];
    const [ndx, ndy] = DELTA[dir];
    nx = item.x + ndx;
    ny = item.y + ndy;
  }

  // Randomly change direction ~25% of the time even when straight is valid.
  if (Math.random() < 0.25) {
    const validDirs = DIRS.filter((d) => {
      const [vdx, vdy] = DELTA[d];
      return isWalkableCell(maze, item.x + vdx, item.y + vdy);
    });
    if (validDirs.length > 0) {
      dir = validDirs[Math.floor(Math.random() * validDirs.length)];
      const [rdx, rdy] = DELTA[dir];
      nx = item.x + rdx;
      ny = item.y + rdy;
    }
  }

  return {
    ...item,
    x: nx,
    y: ny,
    dir,
    nextMoveAt: now + POOKA_INTERVAL_MS + Math.floor(Math.random() * 150),
  };
}

// ---------------------------------------------------------------------------
// Player action: FIRE (galagaBlitz) or PUMP (digDugDash)
// ---------------------------------------------------------------------------

const DELTA: Record<BonusDir, [number, number]> = {
  up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0],
};

/**
 * Called when the player presses the action button during a bonus stage.
 * - galagaBlitz: spawns a projectile at the ghost's position facing its direction.
 * - digDugDash:  pops any Pooka on the same cell or adjacent to the ghost.
 * - rallyRound:  no-op (collection is by walking).
 */
export function fireBonusAction(
  bonus: BonusGameState,
  ghostX: number,
  ghostY: number,
  ghostDir: string,
): BonusGameState {
  if (bonus.complete) return bonus;

  if (bonus.type === "galagaBlitz") {
    const dir = (["up", "down", "left", "right"] as BonusDir[]).includes(ghostDir as BonusDir)
      ? (ghostDir as BonusDir)
      : "up";
    return {
      ...bonus,
      projectile: { x: ghostX, y: ghostY, dir },
    };
  }

  if (bonus.type === "digDugDash") {
    // Pop any uncollected Pooka on the same cell or in any adjacent cell.
    let popped = 0;
    const items = bonus.items.map((item) => {
      if (item.collected) return item;
      const adjacent =
        (item.x === ghostX && item.y === ghostY) ||
        (Math.abs(item.x - ghostX) + Math.abs(item.y - ghostY) === 1);
      if (adjacent) {
        popped++;
        return { ...item, collected: true };
      }
      return item;
    });
    if (popped === 0) return bonus;
    const config = BONUS_CONFIG[bonus.type];
    const collectedItems = bonus.collectedItems + popped;
    const bonusScore = bonus.bonusScore + popped * config.scorePerItem;
    const allCollected = collectedItems >= bonus.totalItems;
    return {
      ...bonus,
      items,
      collectedItems,
      bonusScore,
      complete: allCollected,
    };
  }

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

  // Move Pookas first (digDugDash only), then check collection.
  let items = bonus.type === "digDugDash"
    ? bonus.items.map((item) => movePookaItem(item, maze, now))
    : bonus.items;

  let collectedNow = 0;
  let bonusPointsEarned = 0;

  // --- Advance Galaga projectile one cell; collect any target it lands on ---
  let projectile = bonus.projectile ?? null;
  if (bonus.type === "galagaBlitz" && projectile) {
    const [dx, dy] = DELTA[projectile.dir];
    const nx = projectile.x + dx;
    const ny = projectile.y + dy;
    if (!isWalkableCell(maze, nx, ny)) {
      // Hit a wall — deactivate.
      projectile = null;
    } else {
      projectile = { ...projectile, x: nx, y: ny };
      // Check if it hit any uncollected target.
      items = items.map((item) => {
        if (item.collected || item.x !== nx || item.y !== ny) return item;
        collectedNow++;
        bonusPointsEarned += config.scorePerItem;
        projectile = null; // projectile consumed
        return { ...item, collected: true };
      });
    }
  }

  // --- Rally Round / remaining Galaga walk-over collection ---
  // (Dig Dug collection is handled via fireBonusAction; walk-over disabled there)
  if (bonus.type !== "digDugDash") {
    items = items.map((item) => {
      if (item.collected) return item;
      const touched = ghostPositions.some((g) => g.x === item.x && g.y === item.y);
      if (touched) {
        collectedNow++;
        bonusPointsEarned += config.scorePerItem;
        return { ...item, collected: true };
      }
      return item;
    });
  }

  const collectedItems = bonus.collectedItems + collectedNow;
  const allCollected = collectedItems >= bonus.totalItems;

  // Time bonus awarded only when completing by collecting all items.
  if (allCollected && collectedNow > 0) {
    const secsLeft = Math.max(0, Math.floor((bonus.endsAt - now) / 1000));
    bonusPointsEarned += secsLeft * config.scorePerSecondRemaining;
  }

  const complete = allCollected || timedOut;

  return {
    next: {
      ...bonus,
      items,
      collectedItems,
      bonusScore: bonus.bonusScore + bonusPointsEarned,
      complete,
      projectile,
    },
    collectedNow,
    bonusPointsEarned,
  };
}

export function bonusTimeRemainingMs(bonus: BonusGameState, now: number): number {
  return Math.max(0, bonus.endsAt - now);
}
