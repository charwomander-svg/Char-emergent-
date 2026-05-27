// Game type definitions

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
  respawnAt: number;
  spawnX: number;
  spawnY: number;
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
}
