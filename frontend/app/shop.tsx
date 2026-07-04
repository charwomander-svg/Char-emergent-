import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  initConnection,
  fetchProducts,
  requestPurchase,
  finishTransaction,
  purchaseErrorListener,
  purchaseUpdatedListener,
  ErrorCode,
  type Purchase,
  type PurchaseError,
  type Product,
} from "react-native-iap";
import { COLORS } from "@/src/game/constants";
import { useEconomy } from "@/src/game/useEconomy";
import { POWER_UPS, POWER_UP_ORDER } from "@/src/game/powerups";
import { getSoundEngine } from "@/src/game/sounds";

// SKU → coins mapping (must match Play Console in-app product IDs exactly)
const COIN_SKUS: { sku: string; coins: number; label: string; price: string; badge?: string }[] = [
  { sku: "ghost_coins_100",   coins: 100,   label: "Starter Pack",  price: "$0.99" },
  { sku: "ghost_coins_250",   coins: 250,   label: "Small Pack",    price: "$1.99" },
  { sku: "ghost_coins_500",   coins: 500,   label: "Medium Pack",   price: "$3.99", badge: "POPULAR" },
  { sku: "ghost_coins_1200",  coins: 1200,  label: "Big Pack",      price: "$7.99", badge: "BEST VALUE" },
  { sku: "ghost_coins_2500",  coins: 2500,  label: "Mega Pack",     price: "$14.99" },
  { sku: "ghost_coins_6000",  coins: 6000,  label: "Ultimate Pack", price: "$29.99", badge: "MEGA DEAL" },
];

export default function Shop() {
  const router = useRouter();
  const { coins, inventory, buyPowerUp, grantCoins } = useEconomy();

  const [products, setProducts] = useState<Product[]>([]);
  const [iapReady, setIapReady] = useState(false);
  const [loadingIap, setLoadingIap] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    let purchaseUpdateSub: ReturnType<typeof purchaseUpdatedListener>;
    let purchaseErrorSub: ReturnType<typeof purchaseErrorListener>;

    const setup = async () => {
      try {
        await initConnection();
        const prods = await fetchProducts({ skus: COIN_SKUS.map((s) => s.sku) });
        setProducts((prods ?? []) as Product[]);
        setIapReady(true);

        purchaseUpdateSub = purchaseUpdatedListener(async (purchase: Purchase) => {
          const entry = COIN_SKUS.find((s) => s.sku === purchase.productId);
          if (entry) {
          grantCoins(entry.coins);
            await finishTransaction({ purchase, isConsumable: true });
            Alert.alert("Purchase complete! 🎉", `+${entry.coins.toLocaleString()} Ghost Coins added.`);
          }
          setPurchasing(null);
        });

        purchaseErrorSub = purchaseErrorListener((error: PurchaseError) => {
          if (error.code !== ErrorCode.UserCancelled) {
            Alert.alert("Purchase failed", error.message || "Something went wrong.");
          }
          setPurchasing(null);
        });
      } catch {
        setIapReady(false);
      } finally {
        setLoadingIap(false);
      }
    };

    if (Platform.OS === "android") {
      setup();
    } else {
      setLoadingIap(false);
    }

    return () => {
      purchaseUpdateSub?.remove();
      purchaseErrorSub?.remove();
    };
  }, [grantCoins]);

  const onBuyPack = async (sku: string) => {
    if (purchasing || !iapReady) return;
    getSoundEngine().uiClick();
    setPurchasing(sku);
    try {
      await (requestPurchase as any)({ skus: [sku] });
      // result handled by purchaseUpdatedListener
    } catch (e: any) {
      if (e?.code !== ErrorCode.UserCancelled) {
        Alert.alert("Purchase failed", e?.message || "Could not start purchase.");
      }
      setPurchasing(null);
    }
  };

  const onBuyPower = (id: keyof typeof POWER_UPS) => {
    getSoundEngine().uiClick();
    const ok = buyPowerUp(id);
    if (!ok) {
      Alert.alert("Not enough coins", "Earn more Ghost Coins by playing, or buy a coin pack.");
    }
  };

  // Merge Play Store prices into SKU list when available
  const packs = COIN_SKUS.map((entry) => {
    const prod = products.find((p) => (p as any).productId === entry.sku);
    return { ...entry, livePrice: (prod as any)?.localizedPrice ?? entry.price };
  });

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
        <Text style={styles.subTitle}>Buy coins to unlock more power-ups. No ads. Ever.</Text>

        {loadingIap ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#FFD23F" />
            <Text style={styles.loadingText}>Loading…</Text>
          </View>
        ) : (
          <>
            {!iapReady && Platform.OS === "android" && (
              <View style={styles.comingSoonBanner}>
                <Text style={styles.comingSoonText}>⚙️ STORE UNAVAILABLE</Text>
                <Text style={styles.comingSoonSub}>Google Play Billing could not be initialized.</Text>
              </View>
            )}
            <View style={styles.packsGrid}>
              {packs.map((p) => {
                const isLoading = purchasing === p.sku;
                const isBest = p.badge === "BEST VALUE";
                const isMega = p.badge === "MEGA DEAL";
                const border = isBest ? "#FF477E" : isMega ? "#A06DFF" : "#FFD23F";
                return (
                  <TouchableOpacity
                    key={p.sku}
                    style={[styles.packBtn, { borderColor: border }, (!iapReady || !!purchasing) && { opacity: 0.5 }]}
                    onPress={() => onBuyPack(p.sku)}
                    disabled={!iapReady || !!purchasing}
                    testID={`pack-${p.sku}`}
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
                        <Text style={styles.packPrice}>{p.livePrice}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        <Text style={styles.legalText}>
          Purchases are processed securely through Google Play.
        </Text>

        {/* Power-up grid */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>POWER-UPS</Text>
        {POWER_UP_ORDER.filter((id) => id !== "fastRespawn" && id !== "reveal" && id !== "decoy").map((id) => {
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
                style={[styles.buyBtn, !canAfford && { opacity: 0.4 }]}
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
  comingSoonBanner: {
    backgroundColor: "#1a0a00",
    borderWidth: 1,
    borderColor: "#ff8800",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    alignItems: "center",
  },
  comingSoonText: { color: "#ff8800", fontWeight: "900", fontSize: 12, letterSpacing: 1 },
  comingSoonSub: { color: "#cc6600", fontSize: 10, marginTop: 4, textAlign: "center" },
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
