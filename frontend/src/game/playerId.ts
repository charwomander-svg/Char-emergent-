// Stable per-installation Player ID (UUID v4 derived from crypto-random bytes).
// Used to identify this local save for promo redemption and lightweight backend calls.

import { storage } from "@/src/utils/storage";

const KEY = "ghostMaze.playerId.v1";

function uuidv4(): string {
  // Prefer Web Crypto / RN's crypto.getRandomValues if available (Hermes 0.74+ ships
  // it). Fall back to Math.random() — not cryptographically secure, but a stable
  // UUID-shaped identifier is all we need for the game's local economy.
  const bytes = new Uint8Array(16);
  const cryptoObj: any =
    (typeof globalThis !== "undefined" && (globalThis as any).crypto) || null;
  if (cryptoObj && typeof cryptoObj.getRandomValues === "function") {
    cryptoObj.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  // Per RFC 4122 §4.4 — set version (4) and variant (10xx).
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

let cachedId: string | null = null;

export async function getPlayerId(): Promise<string> {
  if (cachedId) return cachedId;
  const stored = await storage.getItem<string>(KEY, "");
  if (typeof stored === "string" && stored.length > 0) {
    cachedId = stored;
    return stored;
  }
  const fresh = uuidv4();
  await storage.setItem(KEY, fresh);
  cachedId = fresh;
  return fresh;
}
