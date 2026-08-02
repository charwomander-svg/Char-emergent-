// API client for Ghost Maze backend (leaderboards, promo codes, news)

const DEFAULT_BACKEND_URL = "https://ghost-maze-backend.onrender.com";
const envBase = process.env.EXPO_PUBLIC_BACKEND_URL?.trim();
const BASE = (envBase && envBase.length > 0 ? envBase : DEFAULT_BACKEND_URL).replace(/\/+$/, "");

export interface ScoreEntry {
  id: string;
  player_name: string;
  score: number;
  level: number;
  catches: number;
  theme_id: string;
  mode: "classic" | "speedrun" | "timeattack";
  run_time_ms?: number | null;
  timestamp: string;
}

export interface ScoreSubmission {
  player_name: string;
  score: number;
  level: number;
  catches: number;
  theme_id?: string;
  mode: "classic" | "speedrun" | "timeattack";
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

export interface ApiVersionInfo {
  build: string;
  built_in_promo_codes?: string[];
}

export interface NewsItem {
  title: string;
  date: string;
  body: string;
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

export async function submitScore(s: ScoreSubmission): Promise<ScoreEntry> {
  return http<ScoreEntry>("/scores", {
    method: "POST",
    body: JSON.stringify(s),
  });
}

export async function fetchLeaderboard(
  mode: "classic" | "speedrun" | "timeattack" | "all" = "classic",
  options?: { limit?: number },
): Promise<ScoreEntry[]> {
  const params = new URLSearchParams({ mode });
  if (options?.limit) params.set("limit", String(options.limit));
  return http<ScoreEntry[]>(`/leaderboard?${params.toString()}`);
}

export async function fetchLeaderboardSummary(
  mode: "classic" | "speedrun" | "timeattack",
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

export async function fetchApiVersion(): Promise<ApiVersionInfo> {
  return http<ApiVersionInfo>("/version");
}

export async function fetchNewsItems(): Promise<NewsItem[]> {
  return http<NewsItem[]>("/news");
}
