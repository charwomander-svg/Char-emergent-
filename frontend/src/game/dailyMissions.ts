import { useCallback, useEffect, useState } from "react";

import { storage } from "@/src/utils/storage";

const KEY = "ghostMaze.dailyMissions.v1";
const DAILY_MISSION_REWARD = 60;

type MissionKind = "catches" | "levelsCleared" | "bonusPerfectClears" | "armAllEvents";

interface MissionTemplate {
  kind: MissionKind;
  title: (target: number) => string;
  targetOptions: number[];
}

interface DailyMissionStore {
  dateKey: string;
  stats: MissionStats;
  rewardClaimed: boolean;
}

type DailyMissionListener = () => void;
const dailyMissionListeners = new Set<DailyMissionListener>();

function notifyDailyMissionListeners(): void {
  for (const listener of dailyMissionListeners) listener();
}

export interface MissionStats {
  catches: number;
  levelsCleared: number;
  bonusPerfectClears: number;
  armAllEvents: number;
}

export interface DailyMission {
  id: string;
  kind: MissionKind;
  title: string;
  target: number;
  progress: number;
  completed: boolean;
}

export interface DailyMissionSnapshot {
  dateKey: string;
  missions: DailyMission[];
  completedCount: number;
  rewardClaimed: boolean;
  rewardCoins: number;
}

const EMPTY_STATS: MissionStats = {
  catches: 0,
  levelsCleared: 0,
  bonusPerfectClears: 0,
  armAllEvents: 0,
};

const MISSION_TEMPLATES: MissionTemplate[] = [
  {
    kind: "catches",
    title: (target) => `Catch Pellet Guy ${target} times`,
    targetOptions: [5, 7, 9],
  },
  {
    kind: "levelsCleared",
    title: (target) => `Clear ${target} levels`,
    targetOptions: [2, 3, 4],
  },
  {
    kind: "bonusPerfectClears",
    title: () => "Perfect-clear a bonus stage",
    targetOptions: [1],
  },
  {
    kind: "armAllEvents",
    title: (target) =>
      target === 1 ? "Arm all four ghosts once" : `Arm all four ghosts ${target} times`,
    targetOptions: [1, 2],
  },
];

function getTodayKey(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function buildMissionSelection(dateKey: string): Omit<DailyMission, "progress" | "completed">[] {
  const templates = [...MISSION_TEMPLATES];
  const missions: Omit<DailyMission, "progress" | "completed">[] = [];
  let seed = hashString(dateKey);

  while (templates.length > 0 && missions.length < 3) {
    const templateIndex = seed % templates.length;
    const template = templates.splice(templateIndex, 1)[0];
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const target = template.targetOptions[seed % template.targetOptions.length];
    missions.push({
      id: `${template.kind}-${target}`,
      kind: template.kind,
      title: template.title(target),
      target,
    });
    seed = (seed * 1664525 + 1013904223) >>> 0;
  }

  return missions;
}

function clampStat(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function normalizeStats(stats: Partial<MissionStats> | null | undefined): MissionStats {
  return {
    catches: clampStat(stats?.catches),
    levelsCleared: clampStat(stats?.levelsCleared),
    bonusPerfectClears: clampStat(stats?.bonusPerfectClears),
    armAllEvents: clampStat(stats?.armAllEvents),
  };
}

async function loadStore(): Promise<DailyMissionStore> {
  const dateKey = getTodayKey();
  const raw = await storage.getItem(KEY, "");
  if (!raw) {
    return { dateKey, stats: { ...EMPTY_STATS }, rewardClaimed: false };
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed?.dateKey !== dateKey) {
      return { dateKey, stats: { ...EMPTY_STATS }, rewardClaimed: false };
    }
    return {
      dateKey,
      stats: normalizeStats(parsed?.stats),
      rewardClaimed: Boolean(parsed?.rewardClaimed),
    };
  } catch {
    return { dateKey, stats: { ...EMPTY_STATS }, rewardClaimed: false };
  }
}

async function saveStore(store: DailyMissionStore): Promise<void> {
  await storage.setItem(KEY, JSON.stringify(store));
}

function buildSnapshot(store: DailyMissionStore): DailyMissionSnapshot {
  const missions = buildMissionSelection(store.dateKey).map((mission) => {
    const progress = Math.min(store.stats[mission.kind], mission.target);
    return {
      ...mission,
      progress,
      completed: progress >= mission.target,
    };
  });
  return {
    dateKey: store.dateKey,
    missions,
    completedCount: missions.filter((mission) => mission.completed).length,
    rewardClaimed: store.rewardClaimed,
    rewardCoins: DAILY_MISSION_REWARD,
  };
}

function mergeStats(
  current: MissionStats,
  delta: Partial<MissionStats>,
): MissionStats {
  return {
    catches: current.catches + clampStat(delta.catches),
    levelsCleared: current.levelsCleared + clampStat(delta.levelsCleared),
    bonusPerfectClears: current.bonusPerfectClears + clampStat(delta.bonusPerfectClears),
    armAllEvents: current.armAllEvents + clampStat(delta.armAllEvents),
  };
}

export async function getDailyMissionSnapshot(): Promise<DailyMissionSnapshot> {
  return buildSnapshot(await loadStore());
}

export async function recordDailyMissionProgress(
  delta: Partial<MissionStats>,
): Promise<DailyMissionSnapshot> {
  const store = await loadStore();
  const next = {
    ...store,
    stats: mergeStats(store.stats, delta),
  };
  await saveStore(next);
  notifyDailyMissionListeners();
  return buildSnapshot(next);
}

export async function grantDailyMissionReward(
  grantCoins: (amount: number) => void,
): Promise<DailyMissionSnapshot> {
  const store = await loadStore();
  const snapshot = buildSnapshot(store);
  if (snapshot.completedCount < snapshot.missions.length || store.rewardClaimed) {
    return snapshot;
  }
  grantCoins(snapshot.rewardCoins);
  const next = { ...store, rewardClaimed: true };
  await saveStore(next);
  notifyDailyMissionListeners();
  return buildSnapshot(next);
}

export function useDailyMissions(grantCoins?: (amount: number) => void) {
  const [snapshot, setSnapshot] = useState<DailyMissionSnapshot | null>(null);

  const refresh = useCallback(async () => {
    if (grantCoins) {
      setSnapshot(await grantDailyMissionReward(grantCoins));
      return;
    }
    setSnapshot(await getDailyMissionSnapshot());
  }, [grantCoins]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const listener = () => {
      void refresh();
    };
    dailyMissionListeners.add(listener);
    return () => {
      dailyMissionListeners.delete(listener);
    };
  }, [refresh]);

  return {
    missions: snapshot?.missions ?? [],
    completedCount: snapshot?.completedCount ?? 0,
    rewardClaimed: snapshot?.rewardClaimed ?? false,
    rewardCoins: snapshot?.rewardCoins ?? DAILY_MISSION_REWARD,
    dateKey: snapshot?.dateKey ?? getTodayKey(),
    refresh,
  };
}
