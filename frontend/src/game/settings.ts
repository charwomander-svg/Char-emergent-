// User settings (visual + haptics + sound toggle) persisted in AsyncStorage.

import { storage } from "@/src/utils/storage";

const KEY = "ghostMaze.settings.v1";

export interface SettingsData {
  scanlines: boolean;
  haptics: boolean;
  soundOn: boolean;
  musicOn: boolean;
  sfxVolume: number;
  musicVolume: number;
  gamepadInvertY: boolean;
  gamepadDeadzone: number;
  reducedMotion: boolean;
  highContrast: boolean;
  largeHud: boolean;
  controlMode: "swipe" | "tap" | "both";
  masterControlMode: boolean;
  devMode: boolean;
  devInfiniteCoins: boolean;
  devInfiniteItems: boolean;
}

export const DEFAULT_SETTINGS: SettingsData = {
  scanlines: true,
  haptics: true,
  soundOn: true,
  musicOn: true,
  sfxVolume: 0.6,
  musicVolume: 0.45,
  gamepadInvertY: false,
  gamepadDeadzone: 0.55,
  reducedMotion: false,
  highContrast: false,
  largeHud: false,
  controlMode: "swipe",
  masterControlMode: false,
  devMode: false,
  devInfiniteCoins: false,
  devInfiniteItems: false,
};

export async function loadSettings(): Promise<SettingsData> {
  try {
    const raw = await storage.getItem(KEY, "");
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(s: SettingsData): Promise<void> {
  try {
    await storage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}
