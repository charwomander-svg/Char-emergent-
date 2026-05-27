// ============================================================================
// Boss Encounters — Ghost Maze
// ----------------------------------------------------------------------------
// Boss fights are a special level type triggered every 5 levels (5, 10, 15…).
// Pellet Guy gains HP and goes through 3 phases. The player wins the level by
// catching him 3 times (one HP per catch). Boss data lives in its OWN module
// to keep useGhostMaze.ts focused on the core arcade loop.
// ============================================================================

import type { CellType, GhostId } from "./types";
import { isWalkable } from "./maze";

export const BOSS_LEVEL_INTERVAL = 5;

export type BossPhase = 1 | 2 | 3;

export interface BossState {
  // Total HP the boss starts with (3 for the standard encounter).
  maxHp: number;
  // Current HP. Each successful catch decrements by 1.
  hp: number;
  // Which "phase" he's in. Derived from hp but cached for cheap renders.
  phase: BossPhase;
  // performance.now() timestamp after which the boss may teleport again.
  nextTeleportAt: number;
  // performance.now() timestamp when the current "lunge" (phase 3 attack)
  // ends. While inside this window any ghost touching the boss is destroyed
  // even if vulnerable.
  lungeUntil: number;
  // performance.now() timestamp after which a new lunge may be triggered.
  nextLungeAt: number;
  // Display name for HUD ("AWAKENED" / "FURIOUS" / "FINAL FORM").
  title: string;
  // Total catches required = maxHp.
}

export function isBossLevel(level: number): boolean {
  return level > 0 && level % BOSS_LEVEL_INTERVAL === 0;
}

export function bossTitle(phase: BossPhase): string {
  switch (phase) {
    case 1: return "AWAKENED";
    case 2: return "FURIOUS";
    case 3: return "FINAL FORM";
  }
}

export function createBoss(now: number): BossState {
  return {
    maxHp: 3,
    hp: 3,
    phase: 1,
    nextTeleportAt: now + 12000,
    lungeUntil: 0,
    nextLungeAt: now + 8000,
    title: bossTitle(1),
  };
}

/**
 * Apply one hit to the boss. Returns the new state and whether the boss
 * has been defeated by this hit.
 */
export function applyBossHit(
  boss: BossState,
  now: number,
): { next: BossState; defeated: boolean } {
  const hp = Math.max(0, boss.hp - 1);
  const defeated = hp <= 0;
  // phase = 1 when hp 3, 2 when hp 2, 3 when hp 1, 3 when defeated (irrelevant).
  const phase = (hp >= 3 ? 1 : hp === 2 ? 2 : 3) as BossPhase;
  return {
    next: {
      ...boss,
      hp,
      phase,
      title: bossTitle(phase),
      // After a hit, defer next teleport so phase transitions feel readable.
      nextTeleportAt: now + (phase === 2 ? 6000 : 9000),
      lungeUntil: 0,
      nextLungeAt: now + (phase === 3 ? 4000 : 999_999_999),
    },
    defeated,
  };
}

/**
 * Phase-based speed scale that's MULTIPLIED into Pellet Guy's tick interval.
 * Smaller = faster movement (interval = base * scale).
 *  - Phase 1: 0.95×  slight buff
 *  - Phase 2: 0.85×  meaningful buff
 *  - Phase 3: 0.75×  furious
 */
export function bossSpeedScale(boss: BossState): number {
  switch (boss.phase) {
    case 1: return 0.95;
    case 2: return 0.85;
    case 3: return 0.75;
  }
}

/**
 * Visual scale factor for the Pellet Guy sprite when in a boss fight.
 * Phase 3 swells to 1.6× — clearly menacing without overlapping adjacent cells
 * on most mazes.
 */
export function bossVisualScale(boss: BossState | null): number {
  if (!boss) return 1.0;
  switch (boss.phase) {
    case 1: return 1.15;
    case 2: return 1.3;
    case 3: return 1.6;
  }
}

/**
 * Returns a teleport target (a random PELLET tile) if the boss is due to
 * teleport. Used by the game loop in phases ≥ 2.
 */
export function maybeBossTeleport(
  boss: BossState,
  maze: CellType[][],
  now: number,
  pgX: number,
  pgY: number,
): { x: number; y: number; nextTeleportAt: number } | null {
  if (boss.phase < 2) return null;
  if (now < boss.nextTeleportAt) return null;

  // Collect pellet cells (cell == 2 means pellet; 3 means super-pellet).
  const candidates: { x: number; y: number }[] = [];
  for (let y = 0; y < maze.length; y++) {
    for (let x = 0; x < maze[0].length; x++) {
      const c = maze[y][x];
      if ((c === 2 || c === 3) && (x !== pgX || y !== pgY)) {
        // Avoid teleporting next to current location — feel of "warp".
        const d = Math.abs(x - pgX) + Math.abs(y - pgY);
        if (d >= 4) candidates.push({ x, y });
      }
    }
  }
  if (candidates.length === 0) return null;
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  const cooldown = boss.phase === 3 ? 6000 : 9000;
  return { x: pick.x, y: pick.y, nextTeleportAt: now + cooldown };
}

/**
 * Phase-3 only: maybe enter a "lunge" — a 1.2-second window during which
 * touching ghosts are instantly destroyed (regardless of vulnerable state).
 * Lunges happen on an irregular cadence to feel dangerous.
 */
export function maybeBossLunge(
  boss: BossState,
  now: number,
): { lungeUntil: number; nextLungeAt: number } | null {
  if (boss.phase !== 3) return null;
  if (boss.lungeUntil > 0 && now < boss.lungeUntil) return null;
  if (now < boss.nextLungeAt) return null;
  const LUNGE_MS = 1200;
  const cooldown = 4500 + Math.floor(Math.random() * 1500);
  return {
    lungeUntil: now + LUNGE_MS,
    nextLungeAt: now + LUNGE_MS + cooldown,
  };
}

/**
 * Returns true if a ghost stepping onto Pellet Guy during this tick should
 * be destroyed by an active lunge (phase 3 only).
 */
export function bossIsLunging(boss: BossState | null, now: number): boolean {
  return !!boss && boss.phase === 3 && now < boss.lungeUntil;
}

export const BOSS_REWARDS = {
  perPhaseHitCoins: 50,        // each successful catch
  finalDefeatCoins: 500,       // bonus on top of perPhase × maxHp
  finalDefeatScore: 2000,      // score added on top of normal catch score
} as const;

/**
 * Hex tint used to render an aura behind the Pellet Guy. Returns null when no
 * boss is active. Brighter and more red as phases progress.
 */
export function bossAuraColor(boss: BossState | null): string | null {
  if (!boss) return null;
  switch (boss.phase) {
    case 1: return "#FF9D6A";  // warm orange
    case 2: return "#FF477E";  // hot pink-red
    case 3: return "#FF2233";  // furious red
  }
}

/**
 * Used by ai.ts to bias the boss towards aggressive behavior: in phase 3 the
 * boss prefers moving TOWARDS a ghost rather than away (a partial hunter
 * mode). Returns -1 for "hunt nearest ghost", +1 for "flee", or 0 if neutral.
 */
export function bossDirectionPolarity(boss: BossState | null): number {
  if (!boss) return 1; // normal pellet guy flees
  switch (boss.phase) {
    case 1: return 1;
    case 2: return 1;
    case 3: return -0.4; // mostly flees but occasionally hunts
  }
}
