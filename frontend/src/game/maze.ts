// Maze generation using recursive backtracking + loop carving
// Produces a symmetric, randomized Pac-Man style maze
// Optional seed for deterministic custom challenge mazes

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

function makeStaticBase(level: number, rand: () => number): CellType[][] {
  const grid = createWalledGrid();
  const templateJitter = Math.floor(rand() * 75);
  const template = (level - 1 + templateJitter) % 75;

  if (template >= 15 && template < 35) {
    const variant = template - 15;
    const offset = variant % 4;
    const spread = 2 + (variant % 3);

    if (variant % 5 === 0) {
      for (let y = 2 + offset; y <= 16; y += spread) carveLine(grid, 2, y, 12, y);
      for (let x = 3 + (offset % 2); x <= 11; x += 4) carveLine(grid, x, 2, x, 16);
    } else if (variant % 5 === 1) {
      carveLine(grid, 2, 2 + offset, 12, 2 + offset);
      carveLine(grid, 2, 16 - offset, 12, 16 - offset);
      carveLine(grid, 2 + offset, 2, 2 + offset, 16);
      carveLine(grid, 12 - offset, 2, 12 - offset, 16);
      carveLine(grid, 5, 8, 9, 8);
      carveLine(grid, 5, 10, 9, 10);
    } else if (variant % 5 === 2) {
      for (let i = 0; i < 5; i++) {
        const y = 2 + i * 3;
        carveLine(grid, 2 + ((i + offset) % 3), y, 6 + ((i + offset) % 4), y + 1);
        carveLine(grid, 8 - ((i + offset) % 2), y + 1, 12 - ((i + offset) % 3), y + 2);
      }
    } else if (variant % 5 === 3) {
      carveLine(grid, 3, 3, 11, 3);
      carveLine(grid, 3, 15, 11, 15);
      carveLine(grid, 3, 3, 3, 15);
      carveLine(grid, 11, 3, 11, 15);
      carveLine(grid, 5 + (offset % 2), 5, 9 - (offset % 2), 5);
      carveLine(grid, 5 + (offset % 2), 13, 9 - (offset % 2), 13);
      carveLine(grid, 7, 6 + offset, 7, 12 - offset);
    } else {
      for (let y = 2; y <= 16; y += 2) {
        for (let x = 2; x <= 12; x += 2) {
          if (((x + y + variant) % 3) !== 0) carveLine(grid, x, y, x + 1, y);
        }
      }
      carveLine(grid, 2, 9, 12, 9);
      carveLine(grid, 7, 2, 7, 16);
    }

    return grid;
  }

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
    // --- tight / narrow layouts (35-49) ---
    case 35:
      // Dense horizontal comb: horizontal walls every 2 rows + central vertical divider
      for (let y = 2; y <= 16; y += 2) carveLine(grid, 2, y, 12, y);
      carveLine(grid, 7, 2, 7, 16);
      break;
    case 36:
      // Tight grid: walls spaced 3 apart in both axes
      for (let y = 3; y <= 15; y += 3) carveLine(grid, 2, y, 12, y);
      for (let x = 4; x <= 11; x += 3) carveLine(grid, x, 2, x, 16);
      break;
    case 37:
      // Comb teeth from top and bottom with central horizontal band
      for (let x = 2; x <= 12; x += 2) {
        carveLine(grid, x, 2, x, 7);
        carveLine(grid, x, 11, x, 16);
      }
      carveLine(grid, 2, 8, 12, 10);
      break;
    case 38:
      // Staircase: short horizontal rungs stepping across the grid + side rails
      for (let i = 0; i < 5; i++) {
        carveLine(grid, 2 + i * 2, 2 + i * 3, 4 + i * 2, 2 + i * 3);
      }
      carveLine(grid, 2, 2, 2, 16);
      carveLine(grid, 12, 2, 12, 16);
      break;
    case 39:
      // Vertical slots with alternating gaps creating a weave
      for (let x = 2; x <= 12; x += 2) {
        const gapA = 5 + ((x / 2) % 3);
        const gapB = 11 + ((x / 2) % 3);
        for (let y = 2; y <= 16; y++) {
          if (y !== gapA && y !== gapB) carveLine(grid, x, y, x, y);
        }
      }
      break;
    case 40:
      // Slot maze: evenly spaced vertical walls bisected by a central horizontal
      for (let x = 3; x <= 11; x += 2) carveLine(grid, x, 2, x, 16);
      carveLine(grid, 2, 9, 12, 9);
      break;
    case 41:
      // Small square pocket rooms tiling the grid
      for (let cy = 3; cy <= 13; cy += 5) {
        for (let cx = 2; cx <= 9; cx += 5) {
          carveLine(grid, cx, cy, cx + 3, cy);
          carveLine(grid, cx, cy, cx, cy + 3);
          carveLine(grid, cx, cy + 3, cx + 3, cy + 3);
          carveLine(grid, cx + 3, cy, cx + 3, cy + 3);
        }
      }
      break;
    case 42:
      // Alternating zigzag: short segments that force direction changes
      for (let y = 2; y <= 14; y += 4) {
        carveLine(grid, 2, y, 7, y);
        carveLine(grid, 7, y + 2, 12, y + 2);
        carveLine(grid, 7, y, 7, y + 2);
      }
      break;
    case 43:
      // Pinwheel: four diagonal-ish blocks + small centre barrier
      carveLine(grid, 2, 2, 6, 6);
      carveLine(grid, 8, 2, 12, 6);
      carveLine(grid, 2, 12, 6, 16);
      carveLine(grid, 8, 12, 12, 16);
      carveLine(grid, 6, 8, 8, 10);
      break;
    case 44:
      // Maximally tight: every other row is a wall; centre column links them
      for (let y = 2; y <= 16; y += 2) carveLine(grid, 2, y, 12, y);
      carveLine(grid, 7, 2, 7, 16);
      carveLine(grid, 3, 2, 3, 16);
      carveLine(grid, 11, 2, 11, 16);
      break;
    case 45:
      // Window-pane: small square outlines tiling the interior
      for (let y = 2; y <= 13; y += 4) {
        for (let x = 2; x <= 9; x += 4) {
          carveLine(grid, x, y, x + 2, y);
          carveLine(grid, x, y, x, y + 2);
          carveLine(grid, x + 2, y, x + 2, y + 2);
          carveLine(grid, x, y + 2, x + 2, y + 2);
        }
      }
      break;
    case 46:
      // Parallel verticals with two horizontal crossbars
      for (let x = 2; x <= 12; x += 3) carveLine(grid, x, 2, x, 16);
      carveLine(grid, 2, 4, 12, 4);
      carveLine(grid, 2, 13, 12, 13);
      break;
    case 47:
      // Nested rings: outer rectangle + inner rectangle
      carveLine(grid, 4, 4, 10, 4);
      carveLine(grid, 4, 14, 10, 14);
      carveLine(grid, 4, 4, 4, 14);
      carveLine(grid, 10, 4, 10, 14);
      carveLine(grid, 6, 6, 8, 6);
      carveLine(grid, 6, 12, 8, 12);
      carveLine(grid, 6, 6, 6, 12);
      carveLine(grid, 8, 6, 8, 12);
      break;
    case 48:
      // Scattered 2×2 wall blocks on a coarse grid + cross dividers
      for (let y = 3; y <= 14; y += 4) {
        for (let x = 3; x <= 10; x += 4) {
          carveLine(grid, x, y, x + 1, y + 1);
        }
      }
      carveLine(grid, 2, 9, 12, 9);
      carveLine(grid, 7, 2, 7, 16);
      break;
    case 49:
      // T-junction grid: horizontal rails + two vertical spines + side rails
      carveLine(grid, 2, 2, 12, 2);
      carveLine(grid, 2, 6, 12, 6);
      carveLine(grid, 2, 10, 12, 10);
      carveLine(grid, 2, 14, 12, 14);
      carveLine(grid, 2, 2, 2, 14);
      carveLine(grid, 5, 4, 5, 12);
      carveLine(grid, 9, 4, 9, 12);
      carveLine(grid, 12, 2, 12, 14);
      break;
    // --- open / wide layouts (50-64) ---
    case 50:
      // Border track: walls form a perimeter path, centre open
      carveLine(grid, 2, 2, 12, 2);
      carveLine(grid, 2, 16, 12, 16);
      carveLine(grid, 2, 2, 2, 16);
      carveLine(grid, 12, 2, 12, 16);
      break;
    case 51:
      // Two rooms separated by a thin cross wall with doorways
      carveLine(grid, 7, 2, 7, 8);
      carveLine(grid, 7, 10, 7, 16);
      carveLine(grid, 2, 9, 6, 9);
      carveLine(grid, 8, 9, 12, 9);
      break;
    case 52:
      // Wide highway: only two long horizontal wall strips
      carveLine(grid, 2, 5, 12, 5);
      carveLine(grid, 2, 13, 12, 13);
      break;
    case 53:
      // Near-empty: just small corner blocks, vast open centre
      carveLine(grid, 2, 2, 4, 3);
      carveLine(grid, 10, 2, 12, 3);
      carveLine(grid, 2, 15, 4, 16);
      carveLine(grid, 10, 15, 12, 16);
      break;
    case 54:
      // Split arena: single vertical wall with two gap doors
      carveLine(grid, 7, 2, 7, 8);
      carveLine(grid, 7, 10, 7, 16);
      break;
    case 55:
      // Open field with one large central island obstacle
      carveLine(grid, 5, 7, 9, 11);
      break;
    case 56:
      // Arena with four cardinal pillars
      carveLine(grid, 6, 3, 8, 4);
      carveLine(grid, 6, 14, 8, 15);
      carveLine(grid, 2, 8, 4, 10);
      carveLine(grid, 10, 8, 12, 10);
      break;
    case 57:
      // Open field with four diagonal corner obstacles
      carveLine(grid, 3, 3, 5, 5);
      carveLine(grid, 9, 3, 11, 5);
      carveLine(grid, 3, 13, 5, 15);
      carveLine(grid, 9, 13, 11, 15);
      break;
    case 58:
      // Racetrack: open rectangular loop
      carveLine(grid, 3, 3, 11, 3);
      carveLine(grid, 3, 15, 11, 15);
      carveLine(grid, 3, 3, 3, 15);
      carveLine(grid, 11, 3, 11, 15);
      break;
    case 59:
      // Dividing spine: single central vertical wall
      carveLine(grid, 7, 4, 7, 14);
      break;
    case 60:
      // T-barrier: horizontal + one vertical arm dividing the space
      carveLine(grid, 3, 9, 11, 9);
      carveLine(grid, 7, 3, 7, 9);
      break;
    case 61:
      // L-wall: vertical + attached horizontal, two large open zones
      carveLine(grid, 4, 2, 4, 12);
      carveLine(grid, 4, 12, 12, 12);
      break;
    case 62:
      // U-shape obstacle in the upper half, open lower half
      carveLine(grid, 5, 4, 9, 4);
      carveLine(grid, 5, 4, 5, 12);
      carveLine(grid, 9, 4, 9, 12);
      break;
    case 63:
      // Minimal cross: two short perpendicular walls at centre
      carveLine(grid, 5, 9, 9, 9);
      carveLine(grid, 7, 4, 7, 14);
      break;
    case 64:
      // Open field with a tiny inner box obstacle
      carveLine(grid, 6, 7, 8, 7);
      carveLine(grid, 6, 11, 8, 11);
      carveLine(grid, 6, 7, 6, 11);
      carveLine(grid, 8, 7, 8, 11);
      break;
    // --- mixed tight+open layouts (65-74) ---
    case 65:
      // Inward spiral: partial concentric rectangles unwinding inward
      carveLine(grid, 2, 2, 12, 2);
      carveLine(grid, 12, 2, 12, 12);
      carveLine(grid, 4, 4, 10, 4);
      carveLine(grid, 4, 4, 4, 12);
      carveLine(grid, 6, 6, 8, 6);
      carveLine(grid, 6, 6, 6, 10);
      carveLine(grid, 2, 16, 12, 16);
      break;
    case 66:
      // Rooms + bridges: four corner rooms linked by single-row wall bridges
      carveLine(grid, 2, 2, 5, 5);
      carveLine(grid, 9, 2, 12, 5);
      carveLine(grid, 2, 12, 5, 15);
      carveLine(grid, 9, 12, 12, 15);
      carveLine(grid, 6, 2, 8, 2);
      carveLine(grid, 6, 16, 8, 16);
      carveLine(grid, 2, 7, 2, 10);
      carveLine(grid, 12, 7, 12, 10);
      break;
    case 67:
      // Alternating wide / narrow zones: open strips separated by narrow barriers
      carveLine(grid, 2, 4, 12, 4);
      carveLine(grid, 2, 5, 5, 8);
      carveLine(grid, 9, 5, 12, 8);
      carveLine(grid, 2, 9, 12, 9);
      carveLine(grid, 2, 10, 5, 13);
      carveLine(grid, 9, 10, 12, 13);
      carveLine(grid, 2, 14, 12, 14);
      break;
    case 68:
      // Courtyard: outer rectangle enclosing a separate inner rectangle
      carveLine(grid, 2, 2, 12, 2);
      carveLine(grid, 2, 16, 12, 16);
      carveLine(grid, 2, 2, 2, 16);
      carveLine(grid, 12, 2, 12, 16);
      carveLine(grid, 4, 5, 10, 5);
      carveLine(grid, 4, 13, 10, 13);
      carveLine(grid, 4, 5, 4, 13);
      carveLine(grid, 10, 5, 10, 13);
      break;
    case 69:
      // Alleys: central horizontal highway + vertical alley walls top and bottom
      carveLine(grid, 2, 9, 12, 9);
      carveLine(grid, 2, 2, 2, 7);
      carveLine(grid, 2, 11, 2, 16);
      carveLine(grid, 12, 2, 12, 7);
      carveLine(grid, 12, 11, 12, 16);
      carveLine(grid, 5, 2, 5, 7);
      carveLine(grid, 9, 2, 9, 7);
      carveLine(grid, 5, 11, 5, 16);
      carveLine(grid, 9, 11, 9, 16);
      break;
    case 70:
      // Open middle + tight top section with horizontal crossbar
      carveLine(grid, 2, 2, 12, 2);
      carveLine(grid, 2, 3, 2, 8);
      carveLine(grid, 12, 3, 12, 8);
      carveLine(grid, 5, 3, 5, 7);
      carveLine(grid, 9, 3, 9, 7);
      carveLine(grid, 2, 5, 4, 5);
      carveLine(grid, 10, 5, 12, 5);
      carveLine(grid, 2, 14, 12, 14);
      break;
    case 71:
      // Double rectangle: large border + inner offset rectangle
      carveLine(grid, 2, 2, 12, 2);
      carveLine(grid, 2, 16, 12, 16);
      carveLine(grid, 2, 2, 2, 16);
      carveLine(grid, 12, 2, 12, 16);
      carveLine(grid, 4, 5, 10, 5);
      carveLine(grid, 4, 13, 10, 13);
      carveLine(grid, 4, 5, 4, 13);
      carveLine(grid, 10, 5, 10, 13);
      break;
    case 72:
      // Hub and spoke: open centre, diagonal and cardinal spokes radiate outward
      carveLine(grid, 7, 2, 7, 7);
      carveLine(grid, 7, 11, 7, 16);
      carveLine(grid, 2, 9, 6, 9);
      carveLine(grid, 8, 9, 12, 9);
      carveLine(grid, 3, 3, 5, 5);
      carveLine(grid, 9, 3, 11, 5);
      carveLine(grid, 3, 13, 5, 15);
      carveLine(grid, 9, 13, 11, 15);
      break;
    case 73:
      // Z-path: diagonal-ish wide wall bands shifting left-to-right
      carveLine(grid, 2, 2, 10, 5);
      carveLine(grid, 4, 5, 12, 8);
      carveLine(grid, 2, 8, 10, 11);
      carveLine(grid, 4, 11, 12, 14);
      carveLine(grid, 2, 14, 10, 16);
      break;
    case 74:
      // Scattered rooms + open centre: four corner blocks, large central obstacle
      carveLine(grid, 2, 2, 4, 4);
      carveLine(grid, 10, 2, 12, 4);
      carveLine(grid, 2, 13, 4, 15);
      carveLine(grid, 10, 13, 12, 15);
      carveLine(grid, 5, 6, 9, 12);
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

function repairConnectivity(
  grid: CellType[][],
  start: { x: number; y: number },
  forPelletGuy = false,
) {
  for (let attempt = 0; attempt < MAZE_COLS * MAZE_ROWS; attempt++) {
    const reachable = reachableFrom(grid, start, forPelletGuy);
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

  repairConnectivity(grid, { x: ghostHouseX, y: ghostHouseY - 2 }, true);

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
 * @param seed  Optional 32-bit seed for deterministic custom challenge generation
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
    return decorateMaze(makeStaticBase(level, rand), level, rand);
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
  if (inBounds(ghostHouseX, ghostHouseY + 2)) {
    grid[ghostHouseY + 2][ghostHouseX] = 0;
  }

  // Ensure all walkable corridors are connected for pellet-guy pathing.
  repairConnectivity(grid, { x: ghostHouseX, y: ghostHouseY - 2 }, true);

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
