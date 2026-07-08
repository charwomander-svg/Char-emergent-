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

function createWalledGrid(): CellType[][] {
  return Array.from({ length: MAZE_ROWS }, (_, y) =>
    Array.from({ length: MAZE_COLS }, (_, x) =>
      x === 0 || y === 0 || x === MAZE_COLS - 1 || y === MAZE_ROWS - 1
        ? (1 as CellType)
        : (0 as CellType),
    ),
  );
}

function carveLine(grid: CellType[][], x1: number, y1: number, x2: number, y2: number) {
  const minX = Math.max(1, Math.min(x1, x2));
  const maxX = Math.min(MAZE_COLS - 2, Math.max(x1, x2));
  const minY = Math.max(1, Math.min(y1, y2));
  const maxY = Math.min(MAZE_ROWS - 2, Math.max(y1, y2));
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      grid[y][x] = 1;
    }
  }
}

function makeStaticBase(level: number): CellType[][] {
  const grid = createWalledGrid();
  const template = (level - 1) % 15;

  switch (template) {
    case 0:
      for (let y = 3; y <= 15; y += 4) carveLine(grid, 2, y, 12, y);
      for (let x = 4; x <= 10; x += 6) carveLine(grid, x, 2, x, 16);
      break;
    case 1:
      carveLine(grid, 3, 2, 3, 7);
      carveLine(grid, 11, 2, 11, 7);
      carveLine(grid, 3, 11, 3, 16);
      carveLine(grid, 11, 11, 11, 16);
      carveLine(grid, 5, 4, 9, 4);
      carveLine(grid, 5, 14, 9, 14);
      break;
    case 2:
      for (let y = 2; y <= 16; y += 2) {
        const left = y % 4 === 0 ? 2 : 5;
        const right = y % 4 === 0 ? 9 : 12;
        carveLine(grid, left, y, right, y);
      }
      break;
    case 3:
      carveLine(grid, 2, 2, 5, 5);
      carveLine(grid, 9, 2, 12, 5);
      carveLine(grid, 2, 13, 5, 16);
      carveLine(grid, 9, 13, 12, 16);
      carveLine(grid, 6, 3, 8, 15);
      break;
    case 4:
      for (let y = 2; y <= 16; y++) {
        if (y !== 5 && y !== 9 && y !== 13) {
          carveLine(grid, 4, y, 4, y);
          carveLine(grid, 10, y, 10, y);
        }
      }
      for (let x = 2; x <= 12; x++) {
        if (x !== 4 && x !== 7 && x !== 10) {
          carveLine(grid, x, 6, x, 6);
          carveLine(grid, x, 12, x, 12);
        }
      }
      break;
    case 5:
      // Open plaza style: large central open area with sparse corridors
      carveLine(grid, 2, 6, 12, 6);
      carveLine(grid, 2, 10, 12, 10);
      carveLine(grid, 6, 2, 6, 16);
      carveLine(grid, 8, 2, 8, 16);
      break;
    case 6:
      // Tight maze: many short walls to create narrow corridors
      for (let y = 2; y <= 16; y += 2) {
        for (let x = 2; x <= 12; x += 3) {
          carveLine(grid, x, y, x + 1, y);
        }
      }
      break;
    case 7:
      // Asymmetric: heavy left-side carving, sparse right side
      carveLine(grid, 2, 2, 7, 2);
      carveLine(grid, 2, 4, 7, 4);
      carveLine(grid, 2, 6, 7, 6);
      carveLine(grid, 9, 9, 12, 9);
      carveLine(grid, 9, 11, 12, 11);
      carveLine(grid, 5, 12, 9, 12);
      break;
    case 8:
      // Diagonal-ish corridors (stair-step) for varied flow
      for (let i = 0; i < 5; i++) {
        const y = 2 + i * 3;
        carveLine(grid, 2 + i, y, 6 + i, y + 2);
      }
      break;
    case 9:
      // Ring and spokes: concentric rings connected by spokes
      carveLine(grid, 3, 3, 11, 3);
      carveLine(grid, 3, 13, 11, 13);
      carveLine(grid, 3, 3, 3, 13);
      carveLine(grid, 11, 3, 11, 13);
      carveLine(grid, 7, 3, 7, 13);
      carveLine(grid, 3, 8, 11, 8);
      break;
    case 10:
      // Scattered pockets: small enclosed rooms interconnected
      carveLine(grid, 2, 2, 4, 4);
      carveLine(grid, 6, 2, 8, 4);
      carveLine(grid, 10, 2, 12, 4);
      carveLine(grid, 2, 10, 4, 12);
      carveLine(grid, 6, 10, 8, 12);
      carveLine(grid, 10, 10, 12, 12);
      break;
    case 11:
      // Narrow winding corridor across the map
      for (let x = 2; x <= 12; x++) {
        if (x % 2 === 0) carveLine(grid, x, 2, x, 14);
      }
      carveLine(grid, 2, 14, 12, 14);
      break;
    case 12:
      // Large empty with a few obstacles (good for open play)
      carveLine(grid, 5, 5, 9, 5);
      carveLine(grid, 5, 11, 9, 11);
      carveLine(grid, 5, 5, 5, 11);
      carveLine(grid, 9, 5, 9, 11);
      break;
    case 13:
      // Maze with central mazelet and corner mazes
      carveLine(grid, 2, 3, 12, 3);
      carveLine(grid, 2, 15, 12, 15);
      carveLine(grid, 2, 3, 2, 15);
      carveLine(grid, 12, 3, 12, 15);
      carveLine(grid, 4, 6, 8, 6);
      carveLine(grid, 6, 8, 6, 12);
      break;
    default:
      carveLine(grid, 2, 3, 12, 3);
      carveLine(grid, 2, 15, 12, 15);
      carveLine(grid, 2, 3, 2, 15);
      carveLine(grid, 12, 3, 12, 15);
      carveLine(grid, 5, 6, 9, 6);
      carveLine(grid, 5, 12, 9, 12);
      break;
  }

  return grid;
}

function reachableFrom(
  grid: CellType[][],
  start: { x: number; y: number },
  forPelletGuy = false,
): Set<string> {
  const seen = new Set<string>();
  const stack = [start];
  while (stack.length > 0) {
    const cur = stack.pop()!;
    const key = `${cur.x},${cur.y}`;
    if (seen.has(key) || !inBounds(cur.x, cur.y)) continue;
    const cell = grid[cur.y][cur.x];
    if (cell === 1 || (forPelletGuy && cell === 4)) continue;
    seen.add(key);
    stack.push(
      { x: cur.x + 1, y: cur.y },
      { x: cur.x - 1, y: cur.y },
      { x: cur.x, y: cur.y + 1 },
      { x: cur.x, y: cur.y - 1 },
    );
  }
  return seen;
}

function repairConnectivity(grid: CellType[][], start: { x: number; y: number }) {
  for (let attempt = 0; attempt < MAZE_COLS * MAZE_ROWS; attempt++) {
    const reachable = reachableFrom(grid, start);
    let target: { x: number; y: number } | null = null;
    let best = Infinity;

    for (let y = 1; y < MAZE_ROWS - 1; y++) {
      for (let x = 1; x < MAZE_COLS - 1; x++) {
        if (grid[y][x] === 1 || reachable.has(`${x},${y}`)) continue;
        const dist = Math.abs(x - start.x) + Math.abs(y - start.y);
        if (dist < best) {
          best = dist;
          target = { x, y };
        }
      }
    }

    if (!target) return;

    let x = target.x;
    let y = target.y;
    while (!reachable.has(`${x},${y}`)) {
      grid[y][x] = 0;
      if (x !== start.x) x += x < start.x ? 1 : -1;
      else if (y !== start.y) y += y < start.y ? 1 : -1;
    }
  }
}

function decorateMaze(
  grid: CellType[][],
  level: number,
  rand: () => number,
): {
  maze: CellType[][];
  ghostSpawns: { x: number; y: number }[];
  pelletGuySpawn: { x: number; y: number };
  totalPellets: number;
} {
  const cols = MAZE_COLS;
  const rows = MAZE_ROWS;
  const ghostHouseX = Math.floor(cols / 2);
  const ghostHouseY = Math.floor(rows / 2);

  for (let y = 1; y < rows - 1; y++) {
    grid[y][ghostHouseX] = 0;
  }
  for (let x = 1; x < cols - 1; x++) {
    grid[ghostHouseY][x] = 0;
  }

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const x = ghostHouseX + dx;
      const y = ghostHouseY + dy;
      if (inBounds(x, y)) grid[y][x] = 4 as CellType;
    }
  }

  for (const [x, y] of [
    [ghostHouseX, ghostHouseY - 2],
    [ghostHouseX - 1, ghostHouseY - 2],
    [ghostHouseX + 1, ghostHouseY - 2],
    [ghostHouseX, ghostHouseY + 2],
  ] as [number, number][]) {
    if (inBounds(x, y)) grid[y][x] = 0;
  }

  repairConnectivity(grid, { x: ghostHouseX, y: ghostHouseY - 2 });

  let totalPellets = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (grid[y][x] === 0) {
        grid[y][x] = 2 as CellType;
        totalPellets++;
      }
    }
  }

  const superPelletCount = Math.min(2 + Math.floor(level / 2), 6);
  const cornerPositions: [number, number][] = [
    [1, 1],
    [cols - 2, 1],
  ];
  if (level >= 3) cornerPositions.push([1, rows - 2]);
  if (level >= 4) cornerPositions.push([cols - 2, rows - 2]);
  for (const [cx, cy] of cornerPositions) {
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
      totalPellets--;
    }
  }

  for (let i = 4; i < superPelletCount; i++) {
    const pelletCells: [number, number][] = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (grid[y][x] === 2) pelletCells.push([x, y]);
      }
    }
    if (pelletCells.length === 0) break;
    const [px, py] = pelletCells[Math.floor(rand() * pelletCells.length)];
    grid[py][px] = 3 as CellType;
    totalPellets--;
  }

  const ghostSpawns = [
    { x: ghostHouseX - 1, y: ghostHouseY },
    { x: ghostHouseX + 1, y: ghostHouseY },
    { x: ghostHouseX, y: ghostHouseY - 1 },
    { x: ghostHouseX, y: ghostHouseY + 1 },
  ];

  const findWalkable = (sx: number, sy: number) => {
    for (let r = 0; r < Math.max(cols, rows); r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const x = sx + dx;
          const y = sy + dy;
          if (inBounds(x, y) && (grid[y][x] === 2 || grid[y][x] === 3 || grid[y][x] === 0)) {
            return { x, y };
          }
        }
      }
    }
    return { x: sx, y: sy };
  };

  return {
    maze: grid,
    ghostSpawns,
    pelletGuySpawn: findWalkable(Math.floor(cols / 2), rows - 2),
    totalPellets,
  };
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

  if (level % 5 !== 0) {
    return decorateMaze(makeStaticBase(level), level, rand);
  }

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
