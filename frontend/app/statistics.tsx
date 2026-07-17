import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";

import { COLORS } from "@/src/game/constants";
import {
  computeUnlockedThemeIds,
  getTotalGoldStars,
  getTotalStars,
  loadProgress,
  type ProgressData,
} from "@/src/game/progress";
import {
  DEFAULT_STATISTICS,
  formatDuration,
  loadStatistics,
  type StatisticsData,
} from "@/src/game/statistics";

function formatMs(ms: number): string {
  if (ms <= 0) return "--";
  const totalMs = Math.floor(ms);
  const totalSeconds = Math.floor(totalMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const millis = totalMs % 1000;
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

export default function StatisticsScreen() {
  const router = useRouter();
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [stats, setStats] = useState<StatisticsData>(DEFAULT_STATISTICS);

  useEffect(() => {
    loadProgress().then(setProgress);
    loadStatistics().then(setStats);
  }, []);

  const unlockedTeams = progress ? computeUnlockedThemeIds(progress).length : 0;
  const totalStars = progress ? getTotalStars(progress) : 0;
  const totalGoldStars = progress ? getTotalGoldStars(progress) : 0;

  const blocks = [
    {
      title: "PROGRESSION",
      items: [
        ["Highest Level", String(progress?.highestLevel ?? 1)],
        ["High Score", String(progress?.highScore ?? 0)],
        ["Lifetime Catches", String(progress?.totalCatches ?? 0)],
        ["Teams Unlocked", String(unlockedTeams)],
        ["Total Stars", String(totalStars)],
        ["Gold Stars", String(totalGoldStars)],
      ],
    },
    {
      title: "RUN TOTALS",
      items: [
        ["Runs Started", String(stats.runsStarted)],
        ["Runs Finished", String(stats.runsFinished)],
        ["Levels Cleared", String(stats.levelsCleared)],
        ["Bonus Clears", String(stats.bonusClears)],
        ["Total Playtime", formatDuration(stats.totalPlaytimeMs)],
        ["Total Score Earned", String(stats.totalScoreEarned)],
      ],
    },
    {
      title: "MAYHEM",
      items: [
        ["Ghosts Lost", String(stats.totalGhostLosses)],
        ["Mines Triggered", String(stats.totalMinesTriggered)],
        ["Power-Ups Used", String(stats.totalPowerUpsUsed)],
        ["Endless Continues", String(stats.totalEndlessContinues)],
        ["Hardcore Revives", String(stats.totalHardcoreRevives)],
        ["Shiny Pellet Guy Catches", String(stats.totalShinyCatches)],
      ],
    },
    {
      title: "BESTS",
      items: [
        ["Best Level Clear", formatMs(stats.bestLevelClearMs)],
        ["Best Hardcore Survival", formatMs(progress?.bestHardcoreSurvivalMs ?? 0)],
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.title}>STATISTICS</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {blocks.map((block) => (
          <View key={block.title} style={styles.card}>
            <Text style={styles.cardTitle}>{block.title}</Text>
            {block.items.map(([label, value]) => (
              <View key={label} style={styles.row}>
                <Text style={styles.label}>{label}</Text>
                <Text style={styles.value}>{value}</Text>
              </View>
            ))}
          </View>
        ))}
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
    backgroundColor: COLORS.uiPanel,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.uiBorder,
  },
  back: { color: "#FFFF00", fontWeight: "900", fontSize: 14, letterSpacing: 1 },
  title: { color: "#FFFF00", fontWeight: "900", fontSize: 20, letterSpacing: 2 },
  headerSpacer: { width: 60 },
  scroll: { padding: 14, gap: 12 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#3d4f88",
    backgroundColor: "#11192d",
    padding: 14,
    gap: 8,
  },
  cardTitle: { color: "#7fe8ff", fontWeight: "900", fontSize: 14, letterSpacing: 1.4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1d2746",
    paddingBottom: 6,
  },
  label: { flex: 1, color: "#d4ddff", fontSize: 13, fontWeight: "700" },
  value: { color: "#ffd54a", fontSize: 13, fontWeight: "900" },
});
