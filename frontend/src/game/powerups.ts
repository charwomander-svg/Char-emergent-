// Power-Up catalog. Effects are interpreted by the game engine
// (see useGhostMaze) when the user activates them via the in-game bar.

export type PowerUpId =
  | "speedBoost"
  | "teleport"
  | "freeze"
  | "shield"
  | "fastRespawn"
  | "pelletScatter"
  | "key"
  | "magnet"
  | "reveal"
  | "decoy"
  | "rewind";

export interface PowerUpDef {
  id: PowerUpId;
  name: string;
  icon: string; // single glyph used in HUD
  short: string; // short label for shop tile
  description: string;
  cost: number;
  durationMs?: number;
  /**
   * Activation kind:
   *  - "instant":   one-shot effect resolved immediately on activation
   *  - "buff":      ongoing effect for `durationMs`
   *  - "passive":   stays active until the level ends / lost (no timer in HUD)
   *  - "targeted":  requires a selected ghost (e.g. teleport, shield, decoy)
   */
  kind: "instant" | "buff" | "passive" | "targeted";
  color: string;
}

export const POWER_UPS: Record<PowerUpId, PowerUpDef> = {
  speedBoost: {
    id: "speedBoost",
    name: "Speed Boost",
    short: "Speed",
    icon: "⚡",
    description: "All ghosts move 60% faster for 6 seconds.",
    cost: 30,
    durationMs: 6000,
    kind: "buff",
    color: "#FFD23F",
  },
  teleport: {
    id: "teleport",
    name: "Teleport",
    short: "Tele",
    icon: "🌀",
    description: "Warp the selected ghost next to Pellet Guy.",
    cost: 60,
    kind: "targeted",
    color: "#A06DFF",
  },
  freeze: {
    id: "freeze",
    name: "Freeze",
    short: "Freeze",
    icon: "❄️",
    description: "Pellet Guy is frozen in place for 4 seconds.",
    cost: 40,
    durationMs: 4000,
    kind: "buff",
    color: "#5BC0EB",
  },
  shield: {
    id: "shield",
    name: "Shield",
    short: "Shield",
    icon: "🛡️",
    description: "Selected ghost absorbs the next spike trap.",
    cost: 25,
    kind: "targeted",
    color: "#9BC53D",
  },
  fastRespawn: {
    id: "fastRespawn",
    name: "Quick Revive",
    short: "Revive",
    icon: "⏱",
    description: "Halve ghost respawn delays for this level.",
    cost: 50,
    kind: "passive",
    color: "#FF9F1C",
  },
  pelletScatter: {
    id: "pelletScatter",
    name: "Pellet Scatter",
    short: "Scatter",
    icon: "✨",
    description: "Drop 8 fresh pellets across the maze to lure Pellet Guy.",
    cost: 35,
    kind: "instant",
    color: "#FFB897",
  },
  key: {
    id: "key",
    name: "Key",
    short: "Key",
    icon: "🗝️",
    description: "Instantly open one barricade.",
    cost: 15,
    kind: "instant",
    color: "#FFEA00",
  },
  magnet: {
    id: "magnet",
    name: "Magnet",
    short: "Magnet",
    icon: "🧲",
    description: "Pellet Guy is pulled toward the nearest ghost for 5s.",
    cost: 50,
    durationMs: 5000,
    kind: "buff",
    color: "#FF477E",
  },
  reveal: {
    id: "reveal",
    name: "Reveal",
    short: "Reveal",
    icon: "👁️",
    description: "See Pellet Guy's intended path for 8 seconds.",
    cost: 30,
    durationMs: 8000,
    kind: "buff",
    color: "#00FFFF",
  },
  decoy: {
    id: "decoy",
    name: "Decoy",
    short: "Decoy",
    icon: "👻",
    description: "Place a fake ghost. Pellet Guy avoids it for 6 seconds.",
    cost: 40,
    durationMs: 6000,
    kind: "targeted",
    color: "#C77DFF",
  },
  rewind: {
    id: "rewind",
    name: "Rewind",
    short: "Rewind",
    icon: "⏪",
    description: "Reset Pellet Guy to spawn and clear all traps.",
    cost: 75,
    kind: "instant",
    color: "#FF6B6B",
  },
};

// Purchasable first (these are the 8 shown in the HUD inventory bar),
// then non-store items at the end (still functional if earned as bonuses).
export const POWER_UP_ORDER: PowerUpId[] = [
  "speedBoost",
  "freeze",
  "teleport",
  "shield",
  "key",
  "pelletScatter",
  "magnet",
  "rewind",
  // Not sold in the store — hidden from HUD by the slice(0,8) in game.tsx:
  "fastRespawn",
  "reveal",
  "decoy",
];
