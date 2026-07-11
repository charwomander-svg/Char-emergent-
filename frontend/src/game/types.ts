// Game type definitions

import type { BonusGameState } from "./bonusGame";

export type CellType = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
// 0 = empty path (no pellet)
// 1 = wall
// 2 = pellet
// 3 = super pellet
// 4 = ghost house (ghosts spawn here)
// 5 = pellet guy spawn
// 6 = spike trap (eats any ghost that touches it; one-shot)
// 7 = barricade (blocks ghosts for limited time)

export type Direction = "up" | "down" | "left" | "right" | "none";

export type GhostId = 0 | 1 | 2 | 3;
export type GhostAiRole = "free" | "hunter" | "patrol" | "cautious" | "coward" | "ambusher";

export interface Ghost {
  id: GhostId;
  color: string;
  name: string;
  x: number; // grid x
  y: number; // grid y
  direction: Direction;
  nextDirection: Direction;
  vulnerable: boolean;
  vulnerableUntil: number; // timestamp
  alive: boolean;
  permaDead?: boolean;
  respawnAt: number;
  spawnX: number;
  spawnY: number;
  aiRole: GhostAiRole;
}

export interface PelletGuy {
  x: number;
  y: number;
  direction: Direction;
  spawnX: number;
  spawnY: number;
  alive: boolean;
  respawnAt: number;
}

export type GameStatus =
  | "menu"
  | "ready"
  | "playing"
  | "paused"
  | "levelWon"
  | "levelLost"
  | "gameOver";

export interface ActiveEffects {
  // timestamps (performance.now) when each buff expires; 0 = inactive
  speedBoostUntil: number;
  freezeUntil: number;
  magnetUntil: number;
  revealUntil: number;
  // selected ghost has shield against next spike (or pellet-guy chomp)
  shieldGhostId: GhostId | null;
  // halve ghost respawn delays for current level
  fastRespawn: boolean;
  // optional decoy ghost the AI treats as a threat to evade
  decoy: { x: number; y: number; until: number; ghostId: GhostId } | null;
  teamPhaseUntil: number;
  spikeArmUntilByCell: Record<string, number>;
}

export interface GameState {
  status: GameStatus;
  level: number;
  lives: number;
  score: number;
  catches: number; // catches in current level
  totalPellets: number;
  pelletsRemaining: number;
  maze: CellType[][];
  ghosts: Ghost[];
  pelletGuy: PelletGuy;
  lastComboTime: number;
  comboCount: number;
  message: string;
  selectedGhostId: GhostId;
  // Active barricades: track expiry per position
  barricades: { x: number; y: number; expiresAt: number }[];
  // Cumulative ghost deaths (eaten + spiked) on the current level.
  // Each successive death increases the respawn cooldown.
  ghostDeathsThisLevel: number;
  effects: ActiveEffects;
  // Bonus game state — non-null only on bonus levels (every 5 levels).
  // Drives the timer-based bonus round mechanic (Rally Round, Galaga Blitz,
  // Dig Dug Dash) instead of the old boss fight system.
  bonusGame: BonusGameState | null;
}
