// Pellet Guy AI
// MVP: pure random movement that doesn't reverse unless dead-end

import type { CellType, Direction, PelletGuy } from "./types";
import { isWalkable } from "./maze";

const OPPOSITE: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
  none: "none",
};

const DELTAS: Record<Direction, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
  none: [0, 0],
};

export function getValidDirections(
  maze: CellType[][],
  x: number,
  y: number,
  forPelletGuy = false,
): Direction[] {
  const dirs: Direction[] = ["up", "down", "left", "right"];
  return dirs.filter((d) => {
    const [dx, dy] = DELTAS[d];
    return isWalkable(maze, x + dx, y + dy, forPelletGuy);
  });
}

/**
 * Choose Pellet Guy's next direction.
 * MVP: random with no-reverse preference.
 * Future levels can add evasion + pellet seeking weighting.
 */
export function choosePelletGuyDirection(
  maze: CellType[][],
  pg: PelletGuy,
  level: number,
): Direction {
  const valid = getValidDirections(maze, pg.x, pg.y, true);
  if (valid.length === 0) return "none";

  // remove reverse direction unless it's the only option
  const reverse = OPPOSITE[pg.direction];
  let candidates = valid.filter((d) => d !== reverse);
  if (candidates.length === 0) candidates = valid;

  // For level 1: keep going straight if possible (less twitchy)
  if (level <= 1) {
    if (candidates.includes(pg.direction)) {
      // 70% chance to keep going straight
      if (Math.random() < 0.7) return pg.direction;
    }
  }

  return candidates[Math.floor(Math.random() * candidates.length)];
}

export function applyDirection(
  x: number,
  y: number,
  dir: Direction,
): { x: number; y: number } {
  const [dx, dy] = DELTAS[dir];
  return { x: x + dx, y: y + dy };
}

export function opposite(dir: Direction): Direction {
  return OPPOSITE[dir];
}
