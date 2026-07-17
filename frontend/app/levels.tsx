import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { COLORS, MAX_LEVELS } from "@/src/game/constants";
import {
  countLevelStars,
  getLevelStarRecord,
  loadProgress,
  ProgressData,
} from "@/src/game/progress";
import { getSoundEngine } from "@/src/game/sounds";

export default function Levels() {
  const router = useRouter();
  const [progress, setProgress] = useState<ProgressData | null>(null);

  useEffect(() => {
    loadProgress().then(setProgress);
  }, []);

  const highest = progress?.highestLevel ?? 1;
  const maxShown = MAX_LEVELS;
  const levels = Array.from({ length: maxShown }, (_, i) => i + 1);

  const playLevel = (lv: number) => {
    if (lv > highest) return;
    getSoundEngine().uiClick();
    router.push(`/game?mode=classic&level=${lv}`);
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
      <Text style={styles.subtitle}>Reached Level {highest} / {MAX_LEVELS}</Text>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.grid}>
          {levels.map((lv) => {
            const locked = lv > highest;
            const isBonus = lv % 5 === 0;
            const stars = progress ? getLevelStarRecord(progress, lv) : null;
            const starCount = stars ? countLevelStars(stars) : 0;
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
                testID={`level-${lv}`}
              >
                {locked ? (
                  <Text style={styles.lockedIcon}>🔒</Text>
                ) : (
                  <>
                    <Text style={styles.cellNum}>{lv}</Text>
                    {isBonus && <Text style={styles.bonusTag}>BONUS</Text>}
                    {!isBonus && (
                      <View style={styles.starRow}>
                        {Array.from({ length: 3 }, (_, index) => {
                          const filled = index < starCount;
                          const glyph = stars?.gold ? "★" : filled ? "★" : "☆";
                          return (
                            <Text
                              key={`${lv}-star-${index}`}
                              style={[
                                styles.star,
                                filled && styles.starFilled,
                                stars?.gold && styles.goldStar,
                              ]}
                            >
                              {glyph}
                            </Text>
                          );
                        })}
                      </View>
                    )}
                  </>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.hint}>Bonus stages every 5 levels — Speed Rally, Star Blitz, and Inflator.</Text>
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
  bonusCell: { borderColor: "#A06DFF", backgroundColor: "#130a22" },
  lockedCell: { borderColor: "#222244", opacity: 0.5 },
  cellNum: { color: "#FFFFFF", fontWeight: "900", fontSize: 22, letterSpacing: 1 },
  lockedIcon: { fontSize: 20 },
  bonusTag: { color: "#A06DFF", fontSize: 9, fontWeight: "900", letterSpacing: 1, marginTop: 2 },
  starRow: { flexDirection: "row", gap: 2, marginTop: 4 },
  star: { color: "#485075", fontSize: 11, fontWeight: "900" },
  starFilled: { color: "#9fb4ff" },
  goldStar: { color: "#ffd54a" },
  hint: { color: "#666688", fontSize: 11, marginTop: 16, fontStyle: "italic", textAlign: "center" },
});
