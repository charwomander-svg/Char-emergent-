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
  return { x: x + dx, y: y + dy };
}

export function opposite(dir: Direction): Direction {
  return OPPOSITE[dir];
}
