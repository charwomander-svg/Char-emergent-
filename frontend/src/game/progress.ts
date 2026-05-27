// Character unlock progression
// Stores total catches, highest level, perfect clears in local storage.
// Themes unlock at certain milestones.

import { storage } from "@/src/utils/storage";

const KEY = "ghostMaze.progress.v1";

export interface ProgressData {
  highestLevel: number; // highest level reached
  totalCatches: number; // cumulative catches across all games
  perfectClears: number; // levels cleared with 100% pellets remaining
  selectedThemeId: string;
  unlockedThemes: string[]; // theme IDs unlocked
  highScore: number;
}

const DEFAULT_PROGRESS: ProgressData = {
  highestLevel: 1,
  totalCatches: 0,
  perfectClears: 0,
  selectedThemeId: "classic",
  unlockedThemes: ["classic"],
  highScore: 0,
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
    unlockedAt: (p) => p.highestLevel >= 7,
  },
  {
    id: "candy",
    name: "Candy Crush",
    ghostColors: ["#FF6F61", "#FFB347", "#77DD77", "#84A9C0"],
    pelletGuyColor: "#FFD8E2",
    pelletColor: "#FF69B4",
    hidden: false,
    unlockHint: "100 Total Catches",
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
    unlockHint: "??? (Achieve a perfect clear)",
    unlockedAt: (p) => p.perfectClears >= 1,
  },
  {
    id: "rainbow",
    name: "Chroma Crew",
    ghostColors: ["#FF6B6B", "#FFD93D", "#6BCB77", "#4D96FF"],
    pelletGuyColor: "#FFFFFF",
    pelletColor: "#FFFFFF",
    hidden: true,
    unlockHint: "??? (Reach Level 10)",
    unlockedAt: (p) => p.highestLevel >= 10,
  },
];

export function getTheme(id: string): Theme {
  return THEMES.find((t) => t.id === id) || THEMES[0];
}
