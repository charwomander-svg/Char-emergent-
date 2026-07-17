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

export async function fetchPacks(): Promise<{ packs: CoinPack[]; live: boolean }> {
  try {
    const res = await fetch(`${API_BASE}/checkout/packs`);
    if (res.status === 503) return { packs: FALLBACK_PACKS, live: false };
    if (!res.ok) throw new Error(`Failed to load packs (${res.status})`);
    return { packs: await res.json(), live: true };
  } catch {
    return { packs: FALLBACK_PACKS, live: false };
  }
}

// Mirrors backend COIN_PACKS — shown in the shop even when the backend is
// offline or Stripe is not yet configured, so the layout is always visible.
export const FALLBACK_PACKS: CoinPack[] = [
  { id: "pack_small",  name: "Starter Coin Pack",  price_cents: 99,  currency: "usd", coins: 100,  description: "100 Ghost Coins" },
  { id: "pack_medium", name: "Booster Coin Pack",  price_cents: 299, currency: "usd", coins: 400,  description: "400 Ghost Coins", badge: "POPULAR" },
  { id: "pack_large",  name: "Big Coin Pack",       price_cents: 499, currency: "usd", coins: 1000, description: "1000 Ghost Coins", badge: "BEST VALUE" },
  { id: "pack_xl",     name: "Mega Coin Pack",      price_cents: 999, currency: "usd", coins: 2500, description: "2500 Ghost Coins", badge: "MEGA DEAL" },
];

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
