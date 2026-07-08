// Character unlock progression
// Stores total catches, highest level, and high score in local storage.
// Themes unlock at certain milestones.

import { storage } from "@/src/utils/storage";

const KEY = "ghostMaze.progress.v1";

export interface ProgressData {
  highestLevel: number; // highest level reached
  totalCatches: number; // cumulative catches across all games
  perfectClears?: number; // legacy field — kept for migration compatibility, no longer tracked
  selectedThemeId: string;
  unlockedThemes: string[]; // theme IDs unlocked
  highScore: number;
  bestHardcoreSurvivalMs?: number;
}

const DEFAULT_PROGRESS: ProgressData = {
  highestLevel: 1,
  totalCatches: 0,
  perfectClears: 0, // legacy — no longer incremented
  selectedThemeId: "classic",
  unlockedThemes: ["classic"],
  highScore: 0,
  bestHardcoreSurvivalMs: 0,
};

export async function loadProgress(): Promise<ProgressData> {
  try {
    const raw = await storage.getItem(KEY, "");
    if (!raw) return DEFAULT_PROGRESS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PROGRESS, ...parsed };
  } catch {
    return DEFAULT_PROGRESS;
  }
}

export async function saveProgress(p: ProgressData): Promise<void> {
  try {
    await storage.setItem(KEY, JSON.stringify(p));
  } catch {
    // ignore
  }
}

// Theme definitions
export interface Theme {
  id: string;
  name: string;
  ghostColors: [string, string, string, string]; // 4 colors
  pelletGuyColor: string;
  pelletColor: string;
  hidden: boolean;
  unlockHint: string;
  passive?: string;
  unlockedAt: (p: ProgressData) => boolean;
}

export const THEMES: Theme[] = [
  {
    id: "classic",
    name: "Classic Arcade",
    ghostColors: ["#FF0000", "#FFB8FF", "#00FFFF", "#FFB852"],
    pelletGuyColor: "#FFFF00",
    pelletColor: "#FFB897",
    hidden: false,
    unlockHint: "Default",
    unlockedAt: () => true,
  },
  {
    id: "neon",
    name: "Neon Rave",
    ghostColors: ["#FF00FF", "#00FF88", "#00BBFF", "#FFEA00"],
    pelletGuyColor: "#FFFFFF",
    pelletColor: "#00FF88",
    hidden: false,
    unlockHint: "Reach Level 3",
    passive: "Afterglow: super pellet vulnerability is 20% shorter.",
    unlockedAt: (p) => p.highestLevel >= 3,
  },
  {
    id: "spectre",
    name: "Spectre Squad",
    ghostColors: ["#9D4EDD", "#FF6B9D", "#5DADE2", "#F39C12"],
    pelletGuyColor: "#F1C40F",
    pelletColor: "#ECF0F1",
    hidden: false,
    unlockHint: "Reach Level 5",
    passive: "Ghost Phase: rarely phase through danger but cannot catch during phase.",
    unlockedAt: (p) => p.highestLevel >= 5,
  },
  {
    id: "mono",
    name: "Mono Inverse",
    ghostColors: ["#FFFFFF", "#CCCCCC", "#888888", "#444444"],
    pelletGuyColor: "#FF1744",
    pelletColor: "#FFFFFF",
    hidden: false,
    unlockHint: "Reach Level 7",
    passive: "Polarity Flip: rarely reverses Pellet Guy's direction.",
    unlockedAt: (p) => p.highestLevel >= 7,
  },
  {
    id: "dark-knights",
    name: "Dark Knights",
    ghostColors: ["#111827", "#374151", "#6B7280", "#9CA3AF"],
    pelletGuyColor: "#FBBF24",
    pelletColor: "#D1D5DB",
    hidden: false,
    unlockHint: "Reach Level 12",
    passive: "Oath Shield: one teamwide mistake shield per run.",
    unlockedAt: (p) => p.highestLevel >= 12,
  },
  {
    id: "static-squad",
    name: "Static Squad",
    ghostColors: ["#F8FAFC", "#38BDF8", "#A78BFA", "#F472B6"],
    pelletGuyColor: "#FDE047",
    pelletColor: "#BAE6FD",
    hidden: false,
    unlockHint: "Reach Level 15",
    passive: "Short Circuit: first barricade each level fizzles instantly.",
    unlockedAt: (p) => p.highestLevel >= 15,
  },
  {
    id: "graveyard-shift",
    name: "Graveyard Shift",
    ghostColors: ["#4B5563", "#14532D", "#581C87", "#7F1D1D"],
    pelletGuyColor: "#D9F99D",
    pelletColor: "#A7F3D0",
    hidden: false,
    unlockHint: "Reach Level 18",
    passive: "Last Call: first ghost death each level respawns 25% faster.",
    unlockedAt: (p) => p.highestLevel >= 18,
  },
  {
    id: "solar-flare",
    name: "Solar Flare",
    ghostColors: ["#F97316", "#FACC15", "#FB7185", "#FDE68A"],
    pelletGuyColor: "#FFFFFF",
    pelletColor: "#FDBA74",
    hidden: false,
    unlockHint: "Reach Level 20",
    passive: "Sunburst: super pellets briefly reveal Pellet Guy.",
    unlockedAt: (p) => p.highestLevel >= 20,
  },
  {
    id: "frostbyte",
    name: "Frostbyte",
    ghostColors: ["#67E8F9", "#0EA5E9", "#E0F2FE", "#38BDF8"],
    pelletGuyColor: "#F0FDFA",
    pelletColor: "#CFFAFE",
    hidden: false,
    unlockHint: "Reach Level 22",
    passive: "Deep Freeze: first Freeze each level lasts +1s.",
    unlockedAt: (p) => p.highestLevel >= 22,
  },
  {
    id: "ironworks",
    name: "Ironworks",
    ghostColors: ["#78716C", "#A16207", "#44403C", "#D6D3D1"],
    pelletGuyColor: "#FCD34D",
    pelletColor: "#FDBA74",
    hidden: false,
    unlockHint: "Reach Level 24",
    passive: "Safety Latch: spikes take 1s to arm after appearing.",
    unlockedAt: (p) => p.highestLevel >= 24,
  },
  {
    id: "void-choir",
    name: "Void Choir",
    ghostColors: ["#312E81", "#581C87", "#1E1B4B", "#7C3AED"],
    pelletGuyColor: "#E0E7FF",
    pelletColor: "#C4B5FD",
    hidden: false,
    unlockHint: "Reach Level 28",
    passive: "Distant Echo: Pellet Guy respawns farther from ghosts.",
    unlockedAt: (p) => p.highestLevel >= 28,
  },
  {
    id: "royal-haunts",
    name: "Royal Haunts",
    ghostColors: ["#7E22CE", "#FBBF24", "#BE123C", "#0F766E"],
    pelletGuyColor: "#FDE68A",
    pelletColor: "#DDD6FE",
    hidden: false,
    unlockHint: "Reach Level 30",
    passive: "Crown Time: bonus stages last +1s.",
    unlockedAt: (p) => p.highestLevel >= 30,
  },
  {
    id: "jackpot-crew",
    name: "Jackpot Crew",
    ghostColors: ["#22C55E", "#FACC15", "#EF4444", "#3B82F6"],
    pelletGuyColor: "#FDE047",
    pelletColor: "#BBF7D0",
    hidden: false,
    unlockHint: "Earn 500 total catches",
    passive: "Lucky Break: 5% chance level-clear coins double.",
    unlockedAt: (p) => p.totalCatches >= 500,
  },
  {
    id: "sweet-chaos",
    name: "Sweet Chaos",
    ghostColors: ["#FF6F61", "#FFB347", "#77DD77", "#84A9C0"],
    pelletGuyColor: "#FFD8E2",
    pelletColor: "#FF69B4",
    hidden: false,
    unlockHint: "100 Total Catches",
    passive: "Candy Tax: +5% Ghost Coins from level clears.",
    unlockedAt: (p) => p.totalCatches >= 100,
  },
  // Hidden / secret
  {
    id: "blood-moon",
    name: "Blood Moon",
    ghostColors: ["#8B0000", "#B71C1C", "#D32F2F", "#F44336"],
    pelletGuyColor: "#000000",
    pelletColor: "#FF1744",
    hidden: true,
    unlockHint: "??? (Reach Level 25)",
    passive: "Blood Pact: 10% chance not to consume normal power-ups.",
    unlockedAt: (p) => p.highestLevel >= 25,
  },
  {
    id: "rainbow",
    name: "Chroma Crew",
    ghostColors: ["#FF6B6B", "#FFD93D", "#6BCB77", "#4D96FF"],
    pelletGuyColor: "#FFFFFF",
    pelletColor: "#FFFFFF",
    hidden: true,
    unlockHint: "??? (Reach Level 10)",
    passive: "Prism Start: short speed boost at level start.",
    unlockedAt: (p) => p.highestLevel >= 10,
  },
];

export function getTheme(id: string): Theme {
  return THEMES.find((t) => t.id === id) || THEMES[0];
}

export function computeUnlockedThemeIds(progress: ProgressData): string[] {
  return THEMES.filter((theme) => theme.unlockedAt(progress)).map((theme) => theme.id);
}

export function withUnlockedThemes(progress: ProgressData): ProgressData {
  return {
    ...progress,
    unlockedThemes: computeUnlockedThemeIds(progress),
  };
}
