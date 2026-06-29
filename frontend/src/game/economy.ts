// Ghost Maze Economy - Ghost Coins + Power-Up Inventory
// Persisted via AsyncStorage. Real-money coin packs (Stripe) deferred.

import { storage } from "@/src/utils/storage";
import type { PowerUpId } from "./powerups";

const KEY = "ghostMaze.economy.v1";

export interface EconomyData {
  coins: number;
  inventory: Partial<Record<PowerUpId, number>>;
  lifetimeCoinsEarned: number;
  lifetimeCoinsSpent: number;
}

const DEFAULT: EconomyData = {
  coins: 50, // starter bonus so users can try a power-up immediately
  inventory: {
    key: 2,
    shield: 1,
  },
  lifetimeCoinsEarned: 0,
  lifetimeCoinsSpent: 0,
};

export async function loadEconomy(): Promise<EconomyData> {
  try {
    const raw = await storage.getItem(KEY, "");
    if (!raw) return { ...DEFAULT };
    const parsed = JSON.parse(raw);
    return {
      coins: typeof parsed.coins === "number" ? parsed.coins : DEFAULT.coins,
      inventory: parsed.inventory ?? { ...DEFAULT.inventory },
      lifetimeCoinsEarned: parsed.lifetimeCoinsEarned ?? 0,
      lifetimeCoinsSpent: parsed.lifetimeCoinsSpent ?? 0,
    };
  } catch {
    return { ...DEFAULT };
  }
}

export async function saveEconomy(e: EconomyData): Promise<void> {
  try {
    await storage.setItem(KEY, JSON.stringify(e));
  } catch {
    /* ignore */
  }
}

export function addCoins(e: EconomyData, amount: number): EconomyData {
  if (amount <= 0) return e;
  return {
    ...e,
    coins: e.coins + amount,
    lifetimeCoinsEarned: e.lifetimeCoinsEarned + amount,
  };
}

export function spendCoins(e: EconomyData, amount: number): EconomyData | null {
  if (e.coins < amount) return null;
  return {
    ...e,
    coins: e.coins - amount,
    lifetimeCoinsSpent: e.lifetimeCoinsSpent + amount,
  };
}

export function addInventory(
  e: EconomyData,
  id: PowerUpId,
  qty = 1,
): EconomyData {
  const cur = e.inventory[id] ?? 0;
  return { ...e, inventory: { ...e.inventory, [id]: cur + qty } };
}

export function consumeInventory(
  e: EconomyData,
  id: PowerUpId,
): EconomyData | null {
  const cur = e.inventory[id] ?? 0;
  if (cur <= 0) return null;
  return { ...e, inventory: { ...e.inventory, [id]: cur - 1 } };
}

// Coin reward formulas used by the engine
export const COIN_REWARD = {
  pellet: 1,
  superPellet: 5,
  catch: 25,
  levelClear: 50,
  perPercentRemaining: 1,
  perfectBonus: 100,
  bossDefeatFirst: 150,
  bossDefeatRepeat: 50,
} as const;
