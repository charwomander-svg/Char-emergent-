// Game constants

export const MAZE_COLS = 15;
export const MAZE_ROWS = 19;

// Visual constants (cell size computed at runtime based on screen)
export const COLORS = {
  background: "#000000",
  wall: "#2121DE", // classic pac-man blue
  wallInner: "#4242FF",
  pellet: "#FFB897",
  superPellet: "#FFB897",
  pelletGuy: "#FFFF00",
  pelletGuyMouth: "#000000",
  ghosts: ["#FF0000", "#FFB8FF", "#00FFFF", "#FFB852"], // red, pink, cyan, orange
  ghostNames: ["Blinky", "Pinky", "Inky", "Clyde"],
  ghostEyes: "#FFFFFF",
  ghostPupil: "#0000FF",
  ghostVulnerable: "#2121DE",
  ghostVulnerableEnd: "#FFFFFF",
  hud: "#FFFFFF",
  accent: "#FFFF00",
  danger: "#FF0044",
  uiBg: "#0c0c0c",
  uiPanel: "#111122",
  uiBorder: "#2121DE",
} as const;

// Speeds: lower = faster (ms per tile move)
export const SPEED = {
  ghost: 220, // base ghost speed
  pelletGuy: 180, // faster than ghosts
  ghostVulnerable: 320, // slower when vulnerable
};

// Power-up balance
// Power-up balance
export const SUPER_PELLET_DURATION_MS = 6000;
export const COMBO_WINDOW_MS = 1500;
export const RESPAWN_MS = 1500;
export const READY_DURATION_MS = 1500;
export const CATCH_TO_WIN = 3;
export const STARTING_LIVES = 3;

// Respawn cooldown scaling: each prior death on the current level adds this
// multiplier of the base. Formula: base * (1 + prior_deaths * STEP), capped.
//   1st death → 1.0× (1.5s)
//   2nd death → 1.6× (2.4s)
//   3rd death → 2.2× (3.3s)
//   4th death → 2.8× (4.2s)
//   5th death → 3.4× (5.1s)  ... and so on, capped at 5×
export const RESPAWN_DEATH_STEP = 0.6;
export const RESPAWN_MAX_MULTIPLIER = 5.0;

// Pellet Guy traps
export const TRAP_DROP_BASE_CHANCE = 0.025; // per-move chance at level 1
export const TRAP_DROP_LEVEL_BOOST = 0.012; // added per level
export const TRAP_DROP_MAX_CHANCE = 0.12;
export const MAX_ACTIVE_TRAPS = 3;
export const BARRICADE_DURATION_MS = 8000;
export const SPIKE_PROBABILITY = 0.65; // vs barricade
export const SCORE_SPIKED_GHOST_PENALTY = -150;

// Scoring
export const SCORE_PELLET = 10;
export const SCORE_SUPER_PELLET = 50;
export const SCORE_CATCH = 200;
export const SCORE_COMBO_BONUS = 300; // per extra ghost in combo
export const SCORE_PER_PERCENT_REMAINING = 20; // level-end bonus
