// Power-Up catalog. Effects are interpreted by the game engine
// (see useGhostMaze) when the user activates them via the in-game bar.

export type PowerUpId =
  | "speedBoost"
  | "teleport"
  | "freeze"
  | "shield"
  | "pelletScatter"
  | "key"
  | "magnet"
  | "rewind"
  | "hardcoreRevive";

export interface PowerUpDef {
  id: PowerUpId;
  name: string;
  icon: string; // single glyph used in HUD
  short: string; // short label for shop tile
  description: string;
  cost: number;
  maxOwned?: number;
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
    cost: 60,
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
    cost: 150,
    kind: "targeted",
    color: "#A06DFF",
  },
  freeze: {
    id: "freeze",
    name: "Freeze",
    short: "Freeze",
    icon: "❄️",
    description: "Pellet Guy is frozen in place for 4 seconds.",
    cost: 200,
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
    cost: 10,
    kind: "targeted",
    color: "#9BC53D",
  },
  pelletScatter: {
    id: "pelletScatter",
    name: "Pellet Scatter",
    short: "Scatter",
    icon: "✨",
    description: "Drop 8 fresh pellets across the maze to lure Pellet Guy.",
    cost: 25,
    kind: "instant",
    color: "#FFB897",
  },
  key: {
    id: "key",
    name: "Key",
    short: "Key",
    icon: "🗝️",
    description: "Instantly open one barricade.",
    cost: 10,
    kind: "instant",
    color: "#FFEA00",
  },
  magnet: {
    id: "magnet",
    name: "Magnet",
    short: "Magnet",
    icon: "🧲",
    description: "Pellet Guy is pulled toward the nearest ghost for 5s.",
    cost: 125,
    durationMs: 5000,
    kind: "buff",
    color: "#FF477E",
  },
  rewind: {
    id: "rewind",
    name: "Rewind",
    short: "Rewind",
    icon: "⏪",
    description: "Reset Pellet Guy to spawn and clear all traps.",
    cost: 200,
    kind: "instant",
    color: "#FF6B6B",
  },
  hardcoreRevive: {
    id: "hardcoreRevive",
    name: "Revive Token",
    short: "Revive",
    icon: "💀",
    description: "Hardcore only: revive one permanently dead ghost. Limit 1.",
    cost: 500,
    maxOwned: 1,
    kind: "instant",
    color: "#FF477E",
  },
};

// Purchasable first (these are the 8 shown in the HUD inventory bar).
// Remaining items stay functional but are not sold in the shop.
export const POWER_UP_ORDER: PowerUpId[] = [
  "speedBoost",
  "freeze",
  "teleport",
  "shield",
  "key",
  "magnet",
  "rewind",
  "pelletScatter",
  "hardcoreRevive",
];
