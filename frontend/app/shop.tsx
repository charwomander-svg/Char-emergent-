import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { COLORS } from "@/src/game/constants";
import { useEconomy } from "@/src/game/useEconomy";
import { POWER_UPS, POWER_UP_ORDER } from "@/src/game/powerups";
import { getSoundEngine } from "@/src/game/sounds";

export default function Shop() {
  const router = useRouter();
  const { economy, coins, inventory, buyPowerUp, grantCoins } = useEconomy();

  const onBuy = (id: keyof typeof POWER_UPS) => {
    getSoundEngine().uiClick();
    const ok = buyPowerUp(id);
    if (!ok) {
      Alert.alert("Not enough coins", "Earn more Ghost Coins by playing, or get a coin pack.");
    }
  };

  const onCoinPack = (pack: "small" | "medium" | "large") => {
    getSoundEngine().uiClick();
    // Stripe IAP is wired in the next phase. For now, grant coins as a stub
    // so the loop is testable end-to-end. The button shows the real-world
    // price next to it.
    const grant = pack === "small" ? 100 : pack === "medium" ? 400 : 1000;
    grantCoins(grant);
    Alert.alert(
      "Coin Pack (preview)",
      `Granted ${grant} Ghost Coins.\n\nReal-money purchase via Stripe is coming next.`,
    );
  };

  // Render shop even while economy is still loading (use defaults).

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
        <View style={styles.packsRow}>
          <TouchableOpacity
            style={[styles.packBtn, { borderColor: "#FFD23F" }]}
            onPress={() => onCoinPack("small")}
            testID="pack-small"
          >
            <Text style={styles.packCoins}>🪙 100</Text>
            <Text style={styles.packPrice}>$0.99</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.packBtn, { borderColor: "#FF9F1C" }]}
            onPress={() => onCoinPack("medium")}
            testID="pack-medium"
          >
            <Text style={styles.packCoins}>🪙 400</Text>
            <Text style={styles.packPrice}>$2.99</Text>
            <View style={styles.bestValueTag}><Text style={styles.bestValueText}>BEST VALUE</Text></View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.packBtn, { borderColor: "#FF477E" }]}
            onPress={() => onCoinPack("large")}
            testID="pack-large"
          >
            <Text style={styles.packCoins}>🪙 1000</Text>
            <Text style={styles.packPrice}>$4.99</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.disclaimer}>Coin packs preview only — real Stripe purchase wires up in the next update.</Text>

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
                onPress={() => onBuy(id)}
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
  loading: { color: "#FFFF00", padding: 24 },
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
    marginBottom: 12,
  },
  packsRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  packBtn: {
    flex: 1,
    backgroundColor: COLORS.uiPanel,
    borderRadius: 10,
    padding: 14,
    borderWidth: 2,
    alignItems: "center",
    minHeight: 80,
    position: "relative",
  },
  packCoins: { color: "#FFD23F", fontWeight: "900", fontSize: 18 },
  packPrice: { color: "#FFFFFF", fontWeight: "bold", fontSize: 14, marginTop: 4 },
  bestValueTag: {
    position: "absolute",
    top: -10,
    backgroundColor: "#FF9F1C",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bestValueText: { color: "#000", fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  disclaimer: { color: "#666688", fontSize: 10, marginTop: 8, fontStyle: "italic" },
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
