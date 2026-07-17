/* eslint-disable no-console */
const MAZE_COLS = 15;
const MAZE_ROWS = 19;

function inBounds(x, y) {
  return x >= 0 && y >= 0 && x < MAZE_COLS && y < MAZE_ROWS;
}

function createWalledGrid() {
  return Array.from({ length: MAZE_ROWS }, (_, y) =>
    Array.from({ length: MAZE_COLS }, (_, x) => (x === 0 || y === 0 || x === MAZE_COLS - 1 || y === MAZE_ROWS - 1 ? 1 : 0)),
  );
}

function carveLine(grid, x1, y1, x2, y2) {
  const minX = Math.max(1, Math.min(x1, x2));
  const maxX = Math.min(MAZE_COLS - 2, Math.max(x1, x2));
  const minY = Math.max(1, Math.min(y1, y2));
  const maxY = Math.min(MAZE_ROWS - 2, Math.max(y1, y2));
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) grid[y][x] = 1;
  }
}

function makeStaticBase(level) {
  const grid = createWalledGrid();
  const template = (level - 1) % 35;
  if (template >= 15) {
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
      carveLine(grid, 3, 2, 3, 7); carveLine(grid, 11, 2, 11, 7); carveLine(grid, 3, 11, 3, 16); carveLine(grid, 11, 11, 11, 16); carveLine(grid, 5, 4, 9, 4); carveLine(grid, 5, 14, 9, 14);
      break;
    case 2:
      for (let y = 2; y <= 16; y += 2) {
        const left = y % 4 === 0 ? 2 : 5;
        const right = y % 4 === 0 ? 9 : 12;
        carveLine(grid, left, y, right, y);
      }
      break;
    case 3:
      carveLine(grid, 2, 2, 5, 5); carveLine(grid, 9, 2, 12, 5); carveLine(grid, 2, 13, 5, 16); carveLine(grid, 9, 13, 12, 16); carveLine(grid, 6, 3, 8, 15);
      break;
    case 4:
      for (let y = 2; y <= 16; y++) {
        if (y !== 5 && y !== 9 && y !== 13) { carveLine(grid, 4, y, 4, y); carveLine(grid, 10, y, 10, y); }
      }
      for (let x = 2; x <= 12; x++) {
        if (x !== 4 && x !== 7 && x !== 10) { carveLine(grid, x, 6, x, 6); carveLine(grid, x, 12, x, 12); }
      }
      break;
    case 5:
      carveLine(grid, 2, 6, 12, 6); carveLine(grid, 2, 10, 12, 10); carveLine(grid, 6, 2, 6, 16); carveLine(grid, 8, 2, 8, 16);
      break;
    case 6:
      for (let y = 2; y <= 16; y += 2) for (let x = 2; x <= 12; x += 3) carveLine(grid, x, y, x + 1, y);
      break;
    case 7:
      carveLine(grid, 2, 2, 7, 2); carveLine(grid, 2, 4, 7, 4); carveLine(grid, 2, 6, 7, 6); carveLine(grid, 9, 9, 12, 9); carveLine(grid, 9, 11, 12, 11); carveLine(grid, 5, 12, 9, 12);
      break;
    case 8:
      for (let i = 0; i < 5; i++) { const y = 2 + i * 3; carveLine(grid, 2 + i, y, 6 + i, y + 2); }
      break;
    case 9:
      carveLine(grid, 3, 3, 11, 3); carveLine(grid, 3, 13, 11, 13); carveLine(grid, 3, 3, 3, 13); carveLine(grid, 11, 3, 11, 13); carveLine(grid, 7, 3, 7, 13); carveLine(grid, 3, 8, 11, 8);
      break;
    case 10:
      carveLine(grid, 2, 2, 4, 4); carveLine(grid, 6, 2, 8, 4); carveLine(grid, 10, 2, 12, 4); carveLine(grid, 2, 10, 4, 12); carveLine(grid, 6, 10, 8, 12); carveLine(grid, 10, 10, 12, 12);
      break;
    case 11:
      for (let x = 2; x <= 12; x++) if (x % 2 === 0) carveLine(grid, x, 2, x, 14);
      carveLine(grid, 2, 14, 12, 14);
      break;
    case 12:
      carveLine(grid, 5, 5, 9, 5); carveLine(grid, 5, 11, 9, 11); carveLine(grid, 5, 5, 5, 11); carveLine(grid, 9, 5, 9, 11);
      break;
    case 13:
      carveLine(grid, 2, 3, 12, 3); carveLine(grid, 2, 15, 12, 15); carveLine(grid, 2, 3, 2, 15); carveLine(grid, 12, 3, 12, 15); carveLine(grid, 4, 6, 8, 6); carveLine(grid, 6, 8, 6, 12);
      break;
    default:
      carveLine(grid, 2, 3, 12, 3); carveLine(grid, 2, 15, 12, 15); carveLine(grid, 2, 3, 2, 15); carveLine(grid, 12, 3, 12, 15); carveLine(grid, 5, 6, 9, 6); carveLine(grid, 5, 12, 9, 12);
  }
  return grid;
}

function decorate(grid) {
  const ghostHouseX = Math.floor(MAZE_COLS / 2);
  const ghostHouseY = Math.floor(MAZE_ROWS / 2);
  for (let y = 1; y < MAZE_ROWS - 1; y++) grid[y][ghostHouseX] = 0;
  for (let x = 1; x < MAZE_COLS - 1; x++) grid[ghostHouseY][x] = 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -2; dx <= 2; dx++) grid[ghostHouseY + dy][ghostHouseX + dx] = 4;
  grid[ghostHouseY - 2][ghostHouseX] = 0;
  grid[ghostHouseY + 2][ghostHouseX] = 0;
  repairConnectivity(grid, [ghostHouseX, ghostHouseY - 2]);
  for (let y = 0; y < MAZE_ROWS; y++) for (let x = 0; x < MAZE_COLS; x++) if (grid[y][x] === 0) grid[y][x] = 2;
  return grid;
}

function reachableFrom(grid, start) {
  const q = [start];
  const seen = new Set();
  while (q.length) {
    const [x, y] = q.shift();
    const key = `${x},${y}`;
    if (seen.has(key) || !inBounds(x, y)) continue;
    if (grid[y][x] === 1 || grid[y][x] === 4) continue;
    seen.add(key);
    q.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return seen;
}

function repairConnectivity(grid, start) {
  for (let attempt = 0; attempt < MAZE_COLS * MAZE_ROWS; attempt++) {
    const reachable = reachableFrom(grid, start);
    let target = null;
    let best = Infinity;
    for (let y = 1; y < MAZE_ROWS - 1; y++) {
      for (let x = 1; x < MAZE_COLS - 1; x++) {
        if (grid[y][x] === 1 || grid[y][x] === 4 || reachable.has(`${x},${y}`)) continue;
        const dist = Math.abs(x - start[0]) + Math.abs(y - start[1]);
        if (dist < best) {
          best = dist;
          target = [x, y];
        }
      }
    }
    if (!target) return;
    let [x, y] = target;
    while (!reachable.has(`${x},${y}`)) {
      if (grid[y][x] !== 4) grid[y][x] = 0;
      if (x !== start[0]) x += x < start[0] ? 1 : -1;
      else if (y !== start[1]) y += y < start[1] ? 1 : -1;
    }
  }
}

function neighbors(maze, x, y) {
  return [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].filter(([nx, ny]) => inBounds(nx, ny) && maze[ny][nx] !== 1 && maze[ny][nx] !== 4);
}

function bfs(maze, start) {
  const q = [start];
  const seen = new Set();
  while (q.length) {
    const [x, y] = q.shift();
    const key = `${x},${y}`;
    if (seen.has(key)) continue;
    if (!inBounds(x, y) || maze[y][x] === 1 || maze[y][x] === 4) continue;
    seen.add(key);
    q.push(...neighbors(maze, x, y));
  }
  return seen;
}

function quality(maze) {
  let walkable = 0;
  let deadEnds = 0;
  let chokepoints = 0;
  for (let y = 1; y < MAZE_ROWS - 1; y++) {
    for (let x = 1; x < MAZE_COLS - 1; x++) {
      if (maze[y][x] === 1 || maze[y][x] === 4) continue;
      walkable++;
      const deg = neighbors(maze, x, y).length;
      if (deg === 1) deadEnds++;
      if (deg === 2) chokepoints++;
    }
  }
  return { walkable, deadEnds, chokepoints };
}

let failed = false;
for (let level = 1; level <= 35; level++) {
  const maze = decorate(makeStaticBase(level));
  const start = [Math.floor(MAZE_COLS / 2), MAZE_ROWS - 2];
  const seen = bfs(maze, start);
  let unreachable = 0;
  for (let y = 0; y < MAZE_ROWS; y++) {
    for (let x = 0; x < MAZE_COLS; x++) {
      if ((maze[y][x] === 2 || maze[y][x] === 3) && !seen.has(`${x},${y}`)) unreachable++;
    }
  }
  const q = quality(maze);
  const badDensity = q.deadEnds > q.walkable * 0.45;
  const badChoke = q.chokepoints < q.walkable * 0.05;
  const bad = unreachable > 0;
  if (bad) failed = true;
  const qualityWarn = badDensity || badChoke;
  console.log(
    `L${level} walkable=${q.walkable} deadEnds=${q.deadEnds} chokepoints=${q.chokepoints} unreachable=${unreachable} ${bad ? "FAIL" : qualityWarn ? "WARN" : "OK"}`,
  );
}

if (failed) process.exit(1);
console.log("Maze playability and quality checks passed.");
