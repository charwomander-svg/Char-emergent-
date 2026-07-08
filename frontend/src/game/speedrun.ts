import { storage } from "@/src/utils/storage";

const KEY = "ghostMaze.speedrun.v1";

// Fixed seeds per level — same for every player worldwide (speedrun.com fairness).
// Generated once; never change these after public release.
export const SPEEDRUN_SEEDS: number[] = [
  0x4d5a0001, 0x7f3b0002, 0x1a9c0003, 0x6e2f0004, 0x33a10005,
  0x8d740006, 0x2b5e0007, 0x91c30008, 0x47800009, 0xc6de000a,
  0x5f12000b, 0xa3bc000c, 0x78e4000d, 0x0d97000e, 0xb8410010,
  0x3c7f0011, 0xe9050012, 0x62ab0013, 0x1d530014, 0x8827001e,
];

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
