import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { COLORS } from "@/src/game/constants";
import { loadProgress, ProgressData } from "@/src/game/progress";
import { getSoundEngine } from "@/src/game/sounds";
import { SPEEDRUN_SEEDS } from "@/src/game/speedrun";

export default function Levels() {
  const router = useRouter();
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [speedrunMode, setSpeedrunMode] = useState(false);

  useEffect(() => {
    loadProgress().then(setProgress);
  }, []);

  const highest = progress?.highestLevel ?? 1;
  const maxShown = Math.max(20, highest + 4);
  const levels = Array.from({ length: maxShown }, (_, i) => i + 1);

  const playLevel = (lv: number) => {
    if (lv > highest && !speedrunMode) return;
    getSoundEngine().uiClick();
    if (speedrunMode) {
      const seed = SPEEDRUN_SEEDS[lv - 1] ?? SPEEDRUN_SEEDS[0];
      router.push(`/game?mode=speedrun&level=${lv}&seed=${seed}`);
    } else {
      router.push(`/game?mode=classic&level=${lv}`);
    }
  };

  return (
    <SafeAreaView style={styles.container} testID="levels-screen">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} testID="back-btn">
          <Text style={styles.back}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.title}>LEVELS</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Speedrun toggle */}
      <TouchableOpacity
        style={[styles.speedrunToggle, speedrunMode && styles.speedrunToggleActive]}
        onPress={() => { getSoundEngine().uiClick(); setSpeedrunMode((v) => !v); }}
        testID="speedrun-toggle"
      >
        <Text style={[styles.speedrunToggleText, speedrunMode && styles.speedrunToggleTextActive]}>
          ⏱ SPEEDRUN MODE {speedrunMode ? "ON" : "OFF"}
        </Text>
        {speedrunMode && (
          <Text style={styles.speedrunSubtext}>Static seeds · All levels unlocked · Frame timer</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.subtitle}>
        {speedrunMode ? "SPEEDRUN — All levels open" : `Reached Level ${highest}`}
      </Text>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.grid}>
          {levels.map((lv) => {
            const locked = lv > highest && !speedrunMode;
            const isBoss = lv % 5 === 0;
            return (
              <TouchableOpacity
                key={lv}
                style={[
                  styles.cell,
                  isBoss && styles.bossCell,
                  locked && styles.lockedCell,
                  speedrunMode && styles.speedrunCell,
                ]}
                onPress={() => playLevel(lv)}
                disabled={locked}
                testID={`level-${lv}`}
              >
                {locked ? (
                  <Text style={styles.lockedIcon}>🔒</Text>
                ) : (
                  <>
                    <Text style={styles.cellNum}>{lv}</Text>
                    {isBoss && <Text style={styles.bossTag}>BOSS</Text>}
                    {speedrunMode && <Text style={styles.srTag}>SR</Text>}
                  </>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.hint}>Boss levels every 5 levels — the boss mechanics arrive in the next update.</Text>
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
  speedrunToggle: {
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#444466",
    backgroundColor: COLORS.uiPanel,
    alignItems: "center",
  },
  speedrunToggleActive: {
    borderColor: "#7FE8FF",
    backgroundColor: "#0d1a2e",
  },
  speedrunToggleText: {
    color: "#888899",
    fontWeight: "bold",
    fontSize: 13,
    letterSpacing: 2,
  },
  speedrunToggleTextActive: { color: "#7FE8FF" },
  speedrunSubtext: { color: "#7FE8FF", opacity: 0.7, fontSize: 10, marginTop: 2, letterSpacing: 1 },
  subtitle: { color: "#FFB897", textAlign: "center", paddingVertical: 10, fontSize: 12, letterSpacing: 1 },
  scroll: { padding: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-start", gap: 10 },
  cell: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: COLORS.uiPanel,
    borderWidth: 2,
    borderColor: "#FFFF00",
    alignItems: "center",
    justifyContent: "center",
  },
  bossCell: { borderColor: "#FF1744", backgroundColor: "#22000a" },
  lockedCell: { borderColor: "#222244", opacity: 0.5 },
  speedrunCell: { borderColor: "#7FE8FF" },
  cellNum: { color: "#FFFFFF", fontWeight: "900", fontSize: 22, letterSpacing: 1 },
  lockedIcon: { fontSize: 20 },
  bossTag: { color: "#FF1744", fontSize: 9, fontWeight: "900", letterSpacing: 1, marginTop: 2 },
  srTag: { color: "#7FE8FF", fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  hint: { color: "#666688", fontSize: 11, marginTop: 16, fontStyle: "italic", textAlign: "center" },
});
