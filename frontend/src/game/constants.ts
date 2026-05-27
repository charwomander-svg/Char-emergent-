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

export const SUPER_PELLET_DURATION_MS = 6000;
export const COMBO_WINDOW_MS = 1500;
export const RESPAWN_MS = 1500;
export const READY_DURATION_MS = 1500;
export const CATCH_TO_WIN = 3;
export const STARTING_LIVES = 3;

// Scoring
export const SCORE_PELLET = 10;
export const SCORE_SUPER_PELLET = 50;
export const SCORE_CATCH = 200;
export const SCORE_COMBO_BONUS = 300; // per extra ghost in combo
export const SCORE_PER_PERCENT_REMAINING = 20; // level-end bonus
