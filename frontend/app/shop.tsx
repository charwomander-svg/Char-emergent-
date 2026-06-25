import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { COLORS } from "@/src/game/constants";
import { useEconomy } from "@/src/game/useEconomy";
import { POWER_UPS, POWER_UP_ORDER } from "@/src/game/powerups";
import { getSoundEngine } from "@/src/game/sounds";
import {
  fetchPacks,
  createCheckoutSession,
  getPlayerBalance,
  type CoinPack,
} from "@/src/game/payments";
import { getPlayerId } from "@/src/game/playerId";

function getWebOrigin(): string {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return window.location.origin;
  }
  return (
    (typeof process !== "undefined" && (process as any).env?.EXPO_PUBLIC_BACKEND_URL) ||
    ""
  );
}

export default function Shop() {
  const router = useRouter();
  const { coins, inventory, buyPowerUp, syncServerBalance } = useEconomy();

  const [packs, setPacks] = useState<CoinPack[]>([]);
  const [loadingPacks, setLoadingPacks] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string>("");

  // Load coin packs from backend on mount
  useEffect(() => {
    let cancelled = false;
    setLoadingPacks(true);
    fetchPacks()
      .then((p) => {
        if (!cancelled) setPacks(p);
      })
      .catch((e) => {
        console.warn("Failed to fetch coin packs", e);
        if (!cancelled) setPacks([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingPacks(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const restoreBalance = useCallback(async () => {
    try {
      const playerId = await getPlayerId();
      const serverBalance = await getPlayerBalance(playerId);
      const delta = syncServerBalance(serverBalance);
      if (delta > 0) {
        setSyncMessage(`Synced +${delta.toLocaleString()} coins from your account.`);
      } else {
        setSyncMessage("Balance already up to date.");
      }
    } catch {
      setSyncMessage("Could not sync your balance right now.");
    }
  }, [syncServerBalance]);

  useEffect(() => {
    restoreBalance();
  }, [restoreBalance]);

  const onBuyPower = (id: keyof typeof POWER_UPS) => {
    getSoundEngine().uiClick();
    const ok = buyPowerUp(id);
    if (!ok) {
      Alert.alert("Not enough coins", "Earn more Ghost Coins by playing, or get a coin pack.");
    }
  };

  const onBuyPack = async (pack: CoinPack) => {
    if (purchasing) return;
    getSoundEngine().uiClick();
    setPurchasing(pack.id);
    try {
      const playerId = await getPlayerId();
      const origin = getWebOrigin();
      if (!origin) {
        Alert.alert("Setup error", "Could not determine app origin for payment redirect.");
        return;
      }
      const session = await createCheckoutSession(pack.id, playerId, origin);
      // Open Stripe Checkout
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.location.assign(session.checkout_url);
      } else {
        await Linking.openURL(session.checkout_url);
        // On native, send user to the in-app pending screen so we can poll
        router.push({
          pathname: "/checkout/success",
          params: { session_id: session.session_id },
        });
      }
    } catch (e: any) {
      console.error("Stripe checkout failed", e);
      Alert.alert("Purchase failed", e?.message || "Could not start checkout. Try again.");
    } finally {
      setPurchasing(null);
    }
  };

  const formatPrice = (p: CoinPack) =>
    `$${(p.price_cents / 100).toFixed(2)}`;

  return (
    <SafeAreaView style={styles.container} testID="shop-screen">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} testID="back-btn">
          <Text style={styles.back}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.title}>SHOP</Text>
        <View style={styles.coinBadge} testID="coin-balance">
          <Text style={styles.coinText}>🪙 {coins}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Coin packs */}
        <Text style={styles.sectionTitle}>GHOST COIN PACKS</Text>
        <Text style={styles.subTitle}>
          Buy coins to unlock more power-ups. No ads. Ever.
        </Text>

        {loadingPacks ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#FFD23F" />
            <Text style={styles.loadingText}>Loading packs…</Text>
          </View>
        ) : packs.length === 0 ? (
          <Text style={styles.emptyText}>
            Coin packs are temporarily unavailable. Please try again later.
          </Text>
        ) : (
          <View style={styles.packsGrid}>
            {packs.map((p) => {
              const isLoading = purchasing === p.id;
              const isBest = p.badge === "BEST VALUE";
              const isMega = p.badge === "MEGA DEAL";
              const border = isBest ? "#FF477E" : isMega ? "#A06DFF" : "#FFD23F";
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.packBtn, { borderColor: border }, isLoading && { opacity: 0.5 }]}
                  onPress={() => onBuyPack(p)}
                  disabled={!!purchasing}
                  testID={`pack-${p.id}`}
                  activeOpacity={0.8}
                >
                  {p.badge && (
                    <View style={[styles.badge, { backgroundColor: border }]}>
                      <Text style={styles.badgeText}>{p.badge}</Text>
                    </View>
                  )}
                  <Text style={styles.packCoins}>🪙 {p.coins.toLocaleString()}</Text>
                  <Text style={styles.packLabel}>GHOST COINS</Text>
                  <View style={styles.packPriceWrap}>
                    {isLoading ? (
                      <ActivityIndicator color="#FFFF00" size="small" />
                    ) : (
                      <Text style={styles.packPrice}>{formatPrice(p)}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <Text style={styles.legalText}>
          Secure checkout by Stripe. Payments are processed in test mode in this preview.
        </Text>
        <TouchableOpacity style={styles.restoreBtn} onPress={restoreBalance} testID="restore-balance-btn">
          <Text style={styles.restoreBtnText}>↻ RESTORE / SYNC BALANCE</Text>
        </TouchableOpacity>
        {!!syncMessage && <Text style={styles.syncText}>{syncMessage}</Text>}

        {/* Power-up grid */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>POWER-UPS</Text>
        {POWER_UP_ORDER.map((id) => {
          const def = POWER_UPS[id];
          const owned = inventory[id] ?? 0;
          const canAfford = coins >= def.cost;
          return (
            <View key={id} style={[styles.row, { borderColor: def.color }]} testID={`shop-row-${id}`}>
              <View style={[styles.iconWrap, { backgroundColor: def.color + "22" }]}>
                <Text style={styles.icon}>{def.icon}</Text>
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.rowName, { color: def.color }]}>{def.name}</Text>
                <Text style={styles.rowDesc}>{def.description}</Text>
                <Text style={styles.rowOwned}>OWNED: {owned}</Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.buyBtn,
                  !canAfford && { opacity: 0.4 },
                ]}
                onPress={() => onBuyPower(id)}
                disabled={!canAfford}
                testID={`buy-${id}`}
              >
                <Text style={styles.buyText}>🪙 {def.cost}</Text>
                <Text style={styles.buyLabel}>BUY</Text>
              </TouchableOpacity>
            </View>
          );
        })}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.uiBg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.uiBorder,
    backgroundColor: COLORS.uiPanel,
  },
  back: { color: "#FFFF00", fontWeight: "bold", fontSize: 14, letterSpacing: 1 },
  title: { color: "#FFFF00", fontWeight: "900", fontSize: 22, letterSpacing: 3 },
  coinBadge: {
    backgroundColor: "#1f1f3a",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#FFD23F",
  },
  coinText: { color: "#FFD23F", fontWeight: "900", fontSize: 14 },
  scroll: { padding: 16 },
  sectionTitle: {
    color: "#FFB897",
    fontWeight: "900",
    letterSpacing: 2,
    fontSize: 13,
    marginBottom: 6,
  },
  subTitle: {
    color: "#888899",
    fontSize: 11,
    fontStyle: "italic",
    marginBottom: 12,
  },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  loadingText: { color: "#FFD23F", fontSize: 13 },
  emptyText: { color: "#888899", fontSize: 12, padding: 16, textAlign: "center" },
  packsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  packBtn: {
    width: "48%",
    backgroundColor: COLORS.uiPanel,
    borderRadius: 12,
    padding: 14,
    borderWidth: 2,
    alignItems: "center",
    minHeight: 110,
    position: "relative",
    justifyContent: "center",
  },
  packCoins: { color: "#FFD23F", fontWeight: "900", fontSize: 22 },
  packLabel: { color: "#FFFFFF", fontSize: 9, fontWeight: "bold", letterSpacing: 1, marginTop: 2 },
  packPriceWrap: {
    marginTop: 10,
    backgroundColor: "#0a0a18",
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#FFD23F44",
    minHeight: 28,
    justifyContent: "center",
  },
  packPrice: { color: "#FFFF00", fontWeight: "bold", fontSize: 16 },
  badge: {
    position: "absolute",
    top: -10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: { color: "#000", fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  legalText: { color: "#666688", fontSize: 10, marginTop: 12, fontStyle: "italic", textAlign: "center" },
  restoreBtn: {
    marginTop: 10,
    alignSelf: "center",
    borderWidth: 1,
    borderColor: COLORS.uiBorder,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#121224",
  },
  restoreBtnText: { color: "#FFB897", fontSize: 11, letterSpacing: 1, fontWeight: "bold" },
  syncText: { color: "#8ad28f", fontSize: 11, marginTop: 8, textAlign: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.uiPanel,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: { fontSize: 22 },
  rowText: { flex: 1, paddingHorizontal: 10 },
  rowName: { fontWeight: "900", fontSize: 14, letterSpacing: 1 },
  rowDesc: { color: "#CCCCDD", fontSize: 11, marginTop: 2 },
  rowOwned: { color: "#666688", fontSize: 10, marginTop: 4, fontWeight: "bold" },
  buyBtn: {
    backgroundColor: "#0a0a18",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#FFD23F",
    alignItems: "center",
    minWidth: 70,
  },
  buyText: { color: "#FFD23F", fontWeight: "900", fontSize: 13 },
  buyLabel: { color: "#FFFFFF", fontSize: 9, fontWeight: "bold", letterSpacing: 1 },
});
