// Frontend API client for the backend's /api/checkout/* endpoints.

const BACKEND_URL =
  (typeof process !== "undefined" && (process as any).env?.EXPO_PUBLIC_BACKEND_URL) ||
  "";

const API_BASE = BACKEND_URL ? `${BACKEND_URL}/api` : "/api";

export interface CoinPack {
  id: string;
  name: string;
  price_cents: number;
  currency: string;
  coins: number;
  description: string;
  badge?: string | null;
}

export interface CreateCheckoutResponse {
  session_id: string;
  checkout_url: string;
  pack_id: string;
  coins: number;
  amount_cents: number;
  currency: string;
}

export interface CheckoutStatus {
  session_id: string;
  status: "pending" | "complete" | "expired" | "failed";
  payment_status?: string | null;
  coins_granted: boolean;
  coins?: number | null;
  pack_id?: string | null;
  player_id?: string | null;
  player_total_coins?: number | null;
}

export async function fetchPacks(): Promise<CoinPack[]> {
  const res = await fetch(`${API_BASE}/checkout/packs`);
  if (!res.ok) throw new Error(`Failed to load packs (${res.status})`);
  return res.json();
}

export async function createCheckoutSession(
  packId: string,
  playerId: string,
  successOrigin: string,
): Promise<CreateCheckoutResponse> {
  const res = await fetch(`${API_BASE}/checkout/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pack_id: packId,
      player_id: playerId,
      success_origin: successOrigin,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Checkout failed (${res.status}): ${text}`);
  }
  return res.json();
}

export async function getCheckoutStatus(sessionId: string): Promise<CheckoutStatus> {
  const res = await fetch(`${API_BASE}/checkout/session/${encodeURIComponent(sessionId)}`);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Status fetch failed (${res.status}): ${text}`);
  }
  return res.json();
}

export async function getPlayerBalance(playerId: string): Promise<number> {
  try {
    const res = await fetch(
      `${API_BASE}/checkout/player/${encodeURIComponent(playerId)}/balance`,
    );
    if (!res.ok) return 0;
    const data = await res.json();
    return typeof data.coins === "number" ? data.coins : 0;
  } catch {
    return 0;
  }
}
