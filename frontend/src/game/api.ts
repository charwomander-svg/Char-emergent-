// API client for Ghost Maze backend (leaderboard + daily seed)

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL ?? "";

export interface DailySeed {
  seed_date: string;
  seed: number;
}

export interface ScoreEntry {
  id: string;
  player_name: string;
  score: number;
  level: number;
  catches: number;
  theme_id: string;
  mode: "classic" | "daily" | "speedrun";
  daily_seed_date?: string | null;
  run_time_ms?: number | null;
  timestamp: string;
}

export interface ScoreSubmission {
  player_name: string;
  score: number;
  level: number;
  catches: number;
  theme_id?: string;
  mode: "classic" | "daily" | "speedrun";
  daily_seed_date?: string;
  run_time_ms?: number;
}

export interface LeaderboardSummary {
  overall_best: ScoreEntry | null;
  level_bests: ScoreEntry[];
  aggregate_bests: ScoreEntry[];
}

export interface PromoRewards {
  coins: number;
  powerUps: Record<string, number>;
}

export interface PromoRedeemResponse {
  code: string;
  message: string;
  rewards: PromoRewards;
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchDailySeed(): Promise<DailySeed> {
  return http<DailySeed>("/daily-seed");
}

export async function submitScore(s: ScoreSubmission): Promise<ScoreEntry> {
  return http<ScoreEntry>("/scores", {
    method: "POST",
    body: JSON.stringify(s),
  });
}

export async function fetchLeaderboard(
  mode: "classic" | "daily" | "speedrun" | "all" = "classic",
  options?: { daily_seed_date?: string; limit?: number },
): Promise<ScoreEntry[]> {
  const params = new URLSearchParams({ mode });
  if (options?.daily_seed_date) params.set("daily_seed_date", options.daily_seed_date);
  if (options?.limit) params.set("limit", String(options.limit));
  return http<ScoreEntry[]>(`/leaderboard?${params.toString()}`);
}

export async function fetchLeaderboardSummary(
  mode: "classic" | "speedrun",
): Promise<LeaderboardSummary> {
  const params = new URLSearchParams({ mode });
  return http<LeaderboardSummary>(`/leaderboard-summary?${params.toString()}`);
}

export async function redeemPromoCode(code: string, playerId: string): Promise<PromoRedeemResponse> {
  return http<PromoRedeemResponse>("/promo/redeem", {
    method: "POST",
    body: JSON.stringify({
      code,
      player_id: playerId,
    }),
  });
}
