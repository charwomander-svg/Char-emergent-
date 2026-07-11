// Pellet Guy AI
// MVP: pure random movement that doesn't reverse unless dead-end
// Level 2+: avoids nearby ghosts (evasion weighting)
// Level 4+: actively flees from closest ghost

import type { CellType, Direction, Ghost, PelletGuy } from "./types";
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
 * - Level 1: mostly random, prefers continuing straight
 * - Level 2-3: weighted to avoid ghost-adjacent cells
 * - Level 4+: actively flees nearest threat (Manhattan-distance maximization)
 */
export interface PgAiOpts {
  magnetActive?: boolean;
  decoy?: { x: number; y: number } | null;
}

export interface PelletDifficultyProfile {
  tier: "intro" | "standard" | "advanced" | "expert" | "nightmare";
  senseRadius: number;
  continueChance: number;
  weightedRandom: boolean;
}

export function getPelletDifficultyProfile(level: number): PelletDifficultyProfile {
  if (level <= 2) {
    return { tier: "intro", senseRadius: 4, continueChance: 0.75, weightedRandom: true };
  }
  if (level <= 5) {
    return { tier: "standard", senseRadius: 6, continueChance: 0.65, weightedRandom: true };
  }
  if (level <= 8) {
    return { tier: "advanced", senseRadius: 8, continueChance: 0.55, weightedRandom: false };
  }
  if (level <= 12) {
    return { tier: "expert", senseRadius: 10, continueChance: 0.45, weightedRandom: false };
  }
  // Nightmare tier (levels 13+): continue scaling through level 50.
  // senseRadius: 12 → 15 (full-map awareness by ~level 43)
  // continueChance: 0.35 → 0.18 (more unpredictable, harder to predict path)
  const extra = Math.min(level - 13, 37); // 0 at lvl 13, 37 at lvl 50
  return {
    tier: "nightmare",
    senseRadius: Math.min(15, 12 + Math.floor(extra / 13)),
    continueChance: Math.max(0.18, 0.35 - extra * 0.0046),
    weightedRandom: false,
  };
}

export function choosePelletGuyDirection(
  maze: CellType[][],
  pg: PelletGuy,
  level: number,
  ghosts: Ghost[] = [],
  opts: PgAiOpts = {},
): Direction {
  const valid = getValidDirections(maze, pg.x, pg.y, true);
  if (valid.length === 0) return "none";

  // remove reverse direction unless it's the only option
  const reverse = OPPOSITE[pg.direction];
  let candidates = valid.filter((d) => d !== reverse);
  if (candidates.length === 0) candidates = valid;

  const magnetActive = !!opts.magnetActive;
  const profile = getPelletDifficultyProfile(level);

  // Level 1: random with straight preference, no AI threat awareness
  // ...unless magnet is active, in which case PG is yanked toward nearest ghost
  if (level <= 1 && !magnetActive) {
    if (candidates.includes(pg.direction) && Math.random() < profile.continueChance) {
      return pg.direction;
    }
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  // Threats: alive non-vulnerable ghosts within sense radius
  // Magnet treats ALL alive ghosts as attractors (even vulnerable, full map).
  const senseRadius = magnetActive ? 9999 : profile.senseRadius;
  const threats = ghosts.filter(
    (g) =>
      g.alive &&
      (magnetActive || !g.vulnerable) &&
      Math.abs(g.x - pg.x) + Math.abs(g.y - pg.y) <= senseRadius,
  );

  // Decoy acts as an additional "threat" the AI tries to flee.
  // Even during magnet, decoy still repels.
  const decoy = opts.decoy ?? null;

  if (threats.length === 0 && !decoy) {
    // No threats - prefer continuing straight, else pick from candidates
    if (candidates.includes(pg.direction) && Math.random() < profile.continueChance) {
      return pg.direction;
    }
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  // Score each candidate direction by sum of distances to threats
  // Higher score = farther from threats = safer
  // When magnet is active: scoring inverted so PG moves TOWARDS ghosts.
  const scored = candidates.map((d) => {
    const [dx, dy] = DELTAS[d];
    const nx = pg.x + dx;
    const ny = pg.y + dy;
    let score = 0;
    for (const t of threats) {
      const dist = Math.abs(t.x - nx) + Math.abs(t.y - ny);
      if (magnetActive) {
        // Closer is better -> larger score for smaller distance
        score += (50 - dist);
      } else {
        score += dist;
        if (t.x === nx && t.y === ny) score -= 1000;
      }
    }
    if (decoy) {
      const dDist = Math.abs(decoy.x - nx) + Math.abs(decoy.y - ny);
      // Decoy always repels (treated like a non-magnet threat)
      score += dDist;
      if (decoy.x === nx && decoy.y === ny) score -= 1000;
    }
    return { dir: d, score };
  });

  scored.sort((a, b) => b.score - a.score);

  if (!profile.weightedRandom || magnetActive) {
    // Greedy evasion - always pick highest score (with tiny randomization for ties)
    const best = scored[0].score;
    const tied = scored.filter((s) => s.score === best);
    return tied[Math.floor(Math.random() * tied.length)].dir;
  }

  // Level 2-3: weighted random favoring safer directions
  const minScore = Math.min(...scored.map((s) => s.score));
  const weights = scored.map((s) => Math.max(1, s.score - minScore + 1));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < scored.length; i++) {
    r -= weights[i];
    if (r <= 0) return scored[i].dir;
  }
  return scored[0].dir;
}

export function applyDirection(
  x: number,
  y: number,
  dir: Direction,
): { x: number; y: number } {
  const [dx, dy] = DELTAS[dir];
  const nx = x + dx;
  const ny = y + dy;
  return { x: nx, y: ny };
}

export function opposite(dir: Direction): Direction {
  return OPPOSITE[dir];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function chooseWeighted<T>(items: { value: T; weight: number }[]): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item.value;
  }
  return items[items.length - 1].value;
}

function findNearestSpikeDistance(maze: CellType[][], x: number, y: number): number {
  let best = Number.POSITIVE_INFINITY;
  for (let yy = 0; yy < maze.length; yy++) {
    for (let xx = 0; xx < maze[0].length; xx++) {
      if (maze[yy][xx] !== 6) continue;
      best = Math.min(best, Math.abs(xx - x) + Math.abs(yy - y));
    }
  }
  return best;
}

function getCornerTargets(maze: CellType[][]): { x: number; y: number }[] {
  const width = maze[0]?.length ?? 0;
  const height = maze.length;
  const rawCorners = [
    { x: 1, y: 1 },
    { x: Math.max(1, width - 2), y: 1 },
    { x: 1, y: Math.max(1, height - 2) },
    { x: Math.max(1, width - 2), y: Math.max(1, height - 2) },
  ];
  return rawCorners.filter((corner, index, arr) =>
    arr.findIndex((candidate) => candidate.x === corner.x && candidate.y === corner.y) === index &&
    isWalkable(maze, corner.x, corner.y, false),
  );
}

function projectPelletGuyTarget(
  maze: CellType[][],
  pelletGuy: PelletGuy,
  predictionSteps: number,
): { x: number; y: number } {
  let target = { x: pelletGuy.x, y: pelletGuy.y };
  for (let step = 0; step < predictionSteps; step++) {
    const next = applyDirection(target.x, target.y, pelletGuy.direction);
    if (!isWalkable(maze, next.x, next.y, true)) break;
    target = next;
  }
  return target;
}

/**
 * Autonomous ghost hunting AI.
 * When no player direction is queued, ghosts use this to chase Pellet Guy.
 * Aggression (how greedily they home in) scales from ~40% at level 1 to 85% at level 10+.
 * Below that threshold the ghost picks a random valid non-reverse direction.
 */
export function chooseGhostHuntDirection(
  maze: CellType[][],
  ghost: Ghost,
  pelletGuy: PelletGuy,
  level: number,
  ghosts: Ghost[] = [],
): Direction {
  const validDirs = getValidDirections(maze, ghost.x, ghost.y, false);
  if (validDirs.length === 0) return ghost.direction;

  const rev = OPPOSITE[ghost.direction];
  let candidates = validDirs.filter((d) => d !== rev);
  if (candidates.length === 0) candidates = validDirs;

  const aggression = clamp(0.4 + (level - 1) * 0.05, 0.4, 0.9);
  const predictionSteps = level >= 20 ? 3 : level >= 10 ? 2 : 1;
  const predictedTarget = projectPelletGuyTarget(maze, pelletGuy, predictionSteps);
  const nearestSpikeCurrent = findNearestSpikeDistance(maze, ghost.x, ghost.y);
  const nearbyGhosts = ghosts.filter((entry) => entry.id !== ghost.id && entry.alive);
  const corners = getCornerTargets(maze);
  const nearestCorner = corners.length === 0
    ? { x: ghost.spawnX, y: ghost.spawnY }
    : corners.reduce((best, corner) => {
        const bestDist = Math.abs(best.x - ghost.x) + Math.abs(best.y - ghost.y);
        const cornerDist = Math.abs(corner.x - ghost.x) + Math.abs(corner.y - ghost.y);
        return cornerDist < bestDist ? corner : best;
      }, corners[0]);
  const role = ghost.aiRole;
  const trapThreatBias = clamp((6 - nearestSpikeCurrent) * 0.6, 0, 3);

  const scored = candidates.map((dir) => {
    const [dx, dy] = DELTAS[dir];
    const nx = ghost.x + dx;
    const ny = ghost.y + dy;
    const distToPg = Math.abs(nx - pelletGuy.x) + Math.abs(ny - pelletGuy.y);
    const distToPredictedPg = Math.abs(nx - predictedTarget.x) + Math.abs(ny - predictedTarget.y);
    const distToSpawn = Math.abs(nx - ghost.spawnX) + Math.abs(ny - ghost.spawnY);
    const distToCorner = Math.abs(nx - nearestCorner.x) + Math.abs(ny - nearestCorner.y);
    const spikeDistance = findNearestSpikeDistance(maze, nx, ny);
    const nearestOtherGhost = nearbyGhosts.length === 0
      ? 6
      : Math.min(...nearbyGhosts.map((entry) => Math.abs(entry.x - nx) + Math.abs(entry.y - ny)));
    const continueBonus = dir === ghost.direction ? 1 : 0;
    const interceptGain =
      (Math.abs(ghost.x - predictedTarget.x) + Math.abs(ghost.y - predictedTarget.y)) - distToPredictedPg;

    let score = (6 - distToPg) * aggression;
    score += continueBonus * 0.4;

    switch (role) {
      case "hunter":
        score += (8 - distToPg) * 1.45;
        score += interceptGain * 0.5;
        break;
      case "ambusher":
        score += (10 - distToPredictedPg) * 1.85;
        score += interceptGain * 1.2;
        score += continueBonus * 0.2;
        break;
      case "patrol":
        score += continueBonus * 1.6;
        score += (6 - distToSpawn) * 1.1;
        score += (5 - distToPg) * 0.35;
        break;
      case "cautious":
        score += distToPg * 0.85;
        score += Math.min(spikeDistance, 6) * (0.75 + trapThreatBias * 0.15);
        score += nearestOtherGhost * 0.15;
        break;
      case "coward":
        score += distToPg * 1.25;
        score += (10 - distToCorner) * 1.4;
        score += Math.min(spikeDistance, 6) * 0.8;
        break;
      case "free":
      default:
        score += (5 - distToPg) * 0.4;
        score += continueBonus * 0.3;
        break;
    }

    if (spikeDistance <= 1) score -= 3.5;
    if (distToPg === 0) score += role === "cautious" || role === "coward" ? -4 : 3;

    return { dir, score };
  });

  scored.sort((a, b) => b.score - a.score);

  let topCount = 3;
  if (role === "ambusher" || role === "hunter") topCount = 2;
  if (role === "coward") topCount = Math.min(2, scored.length);
  const topChoices = scored.slice(0, Math.min(topCount, scored.length));

  const randomness = role === "free"
    ? clamp(0.5 - level * 0.015, 0.2, 0.5)
    : role === "coward"
      ? 0.28
      : clamp(0.32 - level * 0.01, 0.08, 0.32);

  if (Math.random() < randomness) {
    return topChoices[Math.floor(Math.random() * topChoices.length)].dir;
  }

  const bestScore = topChoices[0].score;
  const weights = topChoices.map((choice) => ({
    value: choice.dir,
    weight: Math.max(1, Math.round((choice.score - bestScore + 4) * 100)),
  }));
  return chooseWeighted(weights);
}
