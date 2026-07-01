import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { COLORS, MAX_LEVELS } from "@/src/game/constants";
import { loadProgress, ProgressData } from "@/src/game/progress";
import { getSoundEngine } from "@/src/game/sounds";

// Fixed global seed — every player gets identical maze layouts per level
const SPEEDRUN_SEED = 20260101;

export default function SpeedrunPicker() {
  const router = useRouter();
  const [progress, setProgress] = useState<ProgressData | null>(null);

  useEffect(() => {
    loadProgress().then(setProgress);
  }, []);

  const highest = progress?.highestLevel ?? 1;
  const levels = Array.from({ length: MAX_LEVELS }, (_, i) => i + 1);

  const playLevel = (lv: number) => {
    if (lv > highest) return;
    getSoundEngine().uiClick();
    router.push(`/game?mode=speedrun&level=${lv}&seed=${SPEEDRUN_SEED}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.title}>⏱ SPEEDRUN</Text>
        <View style={{ width: 60 }} />
      </View>
      <Text style={styles.subtitle}>
        Reached Level {highest} / {MAX_LEVELS} · Global seed · Same maze for all players
      </Text>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.grid}>
          {levels.map((lv) => {
            const locked = lv > highest;
            const isBonus = lv % 5 === 0;
            return (
              <TouchableOpacity
                key={lv}
                style={[
                  styles.cell,
                  isBonus && styles.bonusCell,
                  locked && styles.lockedCell,
                ]}
                onPress={() => playLevel(lv)}
                disabled={locked}
                testID={`sr-level-${lv}`}
              >
                {locked ? (
                  <Text style={styles.lockedIcon}>🔒</Text>
                ) : (
                  <>
                    <Text style={[styles.cellNum, isBonus && styles.bonusCellNum]}>{lv}</Text>
                    {isBonus && <Text style={styles.bonusTag}>★</Text>}
                  </>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.hint}>
          ★ Bonus stages every 5 levels are ideal for speedrunning — fixed layout, no randomness.
        </Text>
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
    borderBottomColor: "#7FE8FF",
  },
  back: { color: "#7FE8FF", fontWeight: "bold", fontSize: 14, letterSpacing: 1 },
  title: { color: "#7FE8FF", fontWeight: "bold", fontSize: 18, letterSpacing: 2 },
  subtitle: {
    color: COLORS.hud,
    fontSize: 11,
    textAlign: "center",
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    opacity: 0.7,
  },
  scroll: { padding: 12, paddingBottom: 32 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 6,
  },
  cell: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: COLORS.uiPanel,
    borderWidth: 1,
    borderColor: COLORS.uiBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  bonusCell: {
    borderColor: "#7FE8FF",
    backgroundColor: "#071C24",
  },
  lockedCell: {
    opacity: 0.35,
  },
  cellNum: {
    color: COLORS.hud,
    fontWeight: "bold",
    fontSize: 16,
  },
  bonusCellNum: {
    color: "#7FE8FF",
  },
  bonusTag: {
    color: "#7FE8FF",
    fontSize: 10,
    fontWeight: "bold",
    marginTop: -2,
  },
  lockedIcon: { fontSize: 18 },
  hint: {
    color: COLORS.hud,
    fontSize: 11,
    textAlign: "center",
    marginTop: 20,
    paddingHorizontal: 16,
    opacity: 0.6,
  },
});
