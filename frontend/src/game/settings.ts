// User settings (visual + haptics + sound toggle) persisted in AsyncStorage.

import { storage } from "@/src/utils/storage";

const KEY = "ghostMaze.settings.v1";

export interface SettingsData {
  scanlines: boolean;
  haptics: boolean;
  soundOn: boolean;
  musicOn: boolean;
  reducedMotion: boolean;
}

export const DEFAULT_SETTINGS: SettingsData = {
  scanlines: true,
  haptics: true,
  soundOn: true,
  musicOn: true,
  reducedMotion: false,
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
