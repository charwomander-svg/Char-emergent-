import { storage } from "@/src/utils/storage";

const KEY = "ghostMaze.speedrun.v1";

export interface SpeedrunData {
  bestRunMs: number;
}

const DEFAULT_DATA: SpeedrunData = {
  bestRunMs: 0,
};

export async function loadSpeedrunData(): Promise<SpeedrunData> {
  try {
    const raw = await storage.getItem(KEY, "");
    if (!raw) return { ...DEFAULT_DATA };
    return { ...DEFAULT_DATA, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_DATA };
  }
}

export async function saveBestRunMs(runMs: number): Promise<number> {
  const current = await loadSpeedrunData();
  if (current.bestRunMs > 0 && current.bestRunMs <= runMs) return current.bestRunMs;
  const next = { bestRunMs: runMs };
  try {
    await storage.setItem(KEY, JSON.stringify(next));
  } catch {}
  return next.bestRunMs;
}
