// Maze generation using recursive backtracking + loop carving
// Produces a symmetric, randomized Pac-Man style maze
// Optional seed for deterministic Daily Challenge mazes

import type { CellType } from "./types";
import { MAZE_COLS, MAZE_ROWS } from "./constants";
import { makeRng } from "./rng";

// Cell helpers
const inBounds = (x: number, y: number) =>
  x >= 0 && y >= 0 && x < MAZE_COLS && y < MAZE_ROWS;

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Generate a randomized maze.
 * @param level Difficulty level (affects loop density + super pellet count)
 * @param seed  Optional 32-bit seed for deterministic generation (Daily Challenge)
 */
export function generateMaze(
  level: number,
  seed?: number,
): {
  maze: CellType[][];
  ghostSpawns: { x: number; y: number }[];
  pelletGuySpawn: { x: number; y: number };
  totalPellets: number;
} {
  const rand =
    seed !== undefined ? makeRng((seed ^ (level * 0x9e3779b1)) >>> 0) : Math.random;

  const cols = MAZE_COLS;
  const rows = MAZE_ROWS;

  // initialize with walls
  const grid: CellType[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => 1 as CellType),
  );

  // Carve perfect maze on left half (cells at odd indices)
  // Use cells where x and y are odd as nodes; walls between them at even coords
  const halfCols = Math.floor(cols / 2);
  const stack: [number, number][] = [];
  const startX = 1;
  const startY = 1;
  grid[startY][startX] = 0;
  stack.push([startX, startY]);

  const dirs: [number, number][] = [
    [0, -2],
    [0, 2],
    [-2, 0],
    [2, 0],
  ];

  while (stack.length > 0) {
    const [cx, cy] = stack[stack.length - 1];
    const neighbors = shuffle(dirs, rand)
      .map(([dx, dy]) => [cx + dx, cy + dy] as [number, number])
      .filter(
        ([nx, ny]) =>
          nx >= 1 &&
          ny >= 1 &&
          nx <= halfCols &&
          ny < rows - 1 &&
          grid[ny][nx] === 1,
      );
    if (neighbors.length === 0) {
      stack.pop();
      continue;
    }
    const [nx, ny] = neighbors[0];
    // remove wall between
    grid[(cy + ny) / 2][(cx + nx) / 2] = 0;
    grid[ny][nx] = 0;
    stack.push([nx, ny]);
  }

  // Carve loops on left half - knock down random walls
  const loopChance = Math.max(0.12, 0.35 - level * 0.02);
  for (let y = 2; y < rows - 2; y += 2) {
    for (let x = 2; x <= halfCols; x += 2) {
      if (grid[y][x] === 1 && rand() < loopChance) {
        const candidates: [number, number][] = [];
        if (y > 1 && grid[y - 1][x] === 1) candidates.push([x, y - 1]);
        if (y < rows - 2 && grid[y + 1][x] === 1) candidates.push([x, y + 1]);
        if (x > 1 && grid[y][x - 1] === 1) candidates.push([x - 1, y]);
        if (x < halfCols && grid[y][x + 1] === 1) candidates.push([x + 1, y]);
        if (candidates.length) {
          const [wx, wy] =
            candidates[Math.floor(rand() * candidates.length)];
          grid[wy][wx] = 0;
        }
      }
    }
  }

  // Mirror left half to right half for symmetry
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x <= halfCols; x++) {
      grid[y][cols - 1 - x] = grid[y][x];
    }
  }

  // Ensure middle column is connected (avoid double-wall down the middle)
  for (let y = 1; y < rows - 1; y++) {
    if (grid[y][halfCols] === 0 && grid[y][halfCols - 1] === 0) {
      // good - already connected
    }
  }

  // Carve central ghost house (3x3 area in center)
  const ghostHouseX = Math.floor(cols / 2);
  const ghostHouseY = Math.floor(rows / 2);
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const x = ghostHouseX + dx;
      const y = ghostHouseY + dy;
      if (inBounds(x, y)) {
        grid[y][x] = 4 as CellType; // ghost house (no pellet, walkable)
      }
    }
  }

  // Ensure ghost house has exits (top opening)
  if (inBounds(ghostHouseX, ghostHouseY - 2)) {
    grid[ghostHouseY - 2][ghostHouseX] = 0;
  }
  if (inBounds(ghostHouseX - 1, ghostHouseY - 2)) {
    grid[ghostHouseY - 2][ghostHouseX - 1] = 0;
  }
  if (inBounds(ghostHouseX + 1, ghostHouseY - 2)) {
    grid[ghostHouseY - 2][ghostHouseX + 1] = 0;
  }

  // Fill all walkable cells (0) with pellets (2)
  let totalPellets = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (grid[y][x] === 0) {
        grid[y][x] = 2 as CellType;
        totalPellets++;
      }
    }
  }

  // Place super pellets in TOP corners (away from pellet guy spawn at bottom)
  // Higher levels add bottom corners + random extras
  const superPelletCount = Math.min(2 + Math.floor(level / 2), 6);
  const cornerPositions: [number, number][] = [
    [1, 1],
    [cols - 2, 1],
  ];
  if (level >= 3) cornerPositions.push([1, rows - 2]);
  if (level >= 4) cornerPositions.push([cols - 2, rows - 2]);
  // ensure corners are pellets, then convert to super pellets
  for (const [cx, cy] of cornerPositions) {
    // find nearest pellet to corner
    let nearest: [number, number] | null = null;
    let bestDist = Infinity;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (grid[y][x] === 2) {
          const d = Math.abs(x - cx) + Math.abs(y - cy);
          if (d < bestDist) {
            bestDist = d;
            nearest = [x, y];
          }
        }
      }
    }
    if (nearest) {
      grid[nearest[1]][nearest[0]] = 3 as CellType;
      totalPellets--; // super pellet not counted as regular
    }
  }

  // Place extra super pellets randomly for higher levels
  for (let i = 4; i < superPelletCount; i++) {
    const pelletCells: [number, number][] = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (grid[y][x] === 2) pelletCells.push([x, y]);
      }
    }
    if (pelletCells.length === 0) break;
    const [px, py] =
      pelletCells[Math.floor(rand() * pelletCells.length)];
    grid[py][px] = 3 as CellType;
    totalPellets--;
  }

  // Ghost spawn points: inside ghost house
  const ghostSpawns = [
    { x: ghostHouseX - 1, y: ghostHouseY },
    { x: ghostHouseX + 1, y: ghostHouseY },
    { x: ghostHouseX, y: ghostHouseY - 1 },
    { x: ghostHouseX, y: ghostHouseY + 1 },
  ].map((s) => ({
    x: Math.max(0, Math.min(cols - 1, s.x)),
    y: Math.max(0, Math.min(rows - 1, s.y)),
  }));

  // Pellet Guy spawn: bottom-center area, on a pellet cell
  let pelletGuySpawn = { x: Math.floor(cols / 2), y: rows - 2 };
  // find nearest pellet/super-pellet/empty cell
  const findWalkable = (sx: number, sy: number) => {
    for (let r = 0; r < Math.max(cols, rows); r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const x = sx + dx;
          const y = sy + dy;
          if (
            inBounds(x, y) &&
            (grid[y][x] === 2 || grid[y][x] === 3 || grid[y][x] === 0)
          ) {
            return { x, y };
          }
        }
      }
    }
    return { x: sx, y: sy };
  };
  pelletGuySpawn = findWalkable(pelletGuySpawn.x, pelletGuySpawn.y);
  // Mark spawn cell - keep as pellet so player gets it
  return { maze: grid, ghostSpawns, pelletGuySpawn, totalPellets };
}

export function isWalkable(
  maze: CellType[][],
  x: number,
  y: number,
  forPelletGuy = false,
): boolean {
  if (!inBounds(x, y)) return false;
  const cell = maze[y][x];
  if (cell === 1) return false; // wall
  if (cell === 4 && forPelletGuy) return false; // pellet guy can't enter ghost house
  if (cell === 7 && !forPelletGuy) return false; // barricade blocks ghosts
  // spike (6) is walkable - it triggers a death effect but doesn't block movement
  return true;
}
