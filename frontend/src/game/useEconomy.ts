// Hook wrapping the Ghost Coin economy + inventory.
// Provides reactive state so the UI re-renders when coins/inventory change.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  EconomyData,
  loadEconomy,
  saveEconomy,
  addCoins as _addCoins,
  spendCoins as _spendCoins,
  addInventory as _addInventory,
  consumeInventory as _consumeInventory,
} from "./economy";
import type { PowerUpId } from "./powerups";
import { POWER_UPS } from "./powerups";

export function useEconomy() {
  const [economy, setEconomy] = useState<EconomyData | null>(null);
  const econRef = useRef<EconomyData | null>(null);
  econRef.current = economy;

  useEffect(() => {
    let cancelled = false;
    loadEconomy().then((e) => {
      if (!cancelled) setEconomy(e);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback((next: EconomyData) => {
    setEconomy(next);
    saveEconomy(next);
  }, []);

  const earnCoins = useCallback(
    (amount: number) => {
      const cur = econRef.current;
      if (!cur) return;
      persist(_addCoins(cur, amount));
    },
    [persist],
  );

  const buyPowerUp = useCallback(
    (id: PowerUpId, qty = 1): boolean => {
      const cur = econRef.current;
      if (!cur) return false;
      const def = POWER_UPS[id];
      const cost = def.cost * qty;
      const spent = _spendCoins(cur, cost);
      if (!spent) return false;
      persist(_addInventory(spent, id, qty));
      return true;
    },
    [persist],
  );

  const useInventory = useCallback(
    (id: PowerUpId): boolean => {
      const cur = econRef.current;
      if (!cur) return false;
      const next = _consumeInventory(cur, id);
      if (!next) return false;
      persist(next);
      return true;
    },
    [persist],
  );

  const grantCoins = useCallback(
    (amount: number) => {
      const cur = econRef.current;
      if (!cur) return;
      persist(_addCoins(cur, amount));
    },
    [persist],
  );

  const syncServerBalance = useCallback(
    (serverCoins: number) => {
      const cur = econRef.current;
      if (!cur) return 0;
      const nextCoins = Math.max(cur.coins, Math.max(0, Math.floor(serverCoins)));
      if (nextCoins === cur.coins) return 0;
      const delta = nextCoins - cur.coins;
      persist({ ...cur, coins: nextCoins });
      return delta;
    },
    [persist],
  );

  return {
    economy,
    earnCoins,
    grantCoins,
    buyPowerUp,
    useInventory,
    syncServerBalance,
    inventory: economy?.inventory ?? {},
    coins: economy?.coins ?? 0,
  };
}
