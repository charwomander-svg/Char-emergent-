import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";

import { COLORS } from "@/src/game/constants";
import { loadProgress, type ProgressData } from "@/src/game/progress";
import { loadStatistics, type StatisticsData, DEFAULT_STATISTICS } from "@/src/game/statistics";

interface Achievement {
  id: string;
  icon: string;
  title: string;
  description: string;
  isUnlocked: (stats: StatisticsData, progress: ProgressData) => boolean;
}

const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first-hunt",
    icon: "🎯",
    title: "First Hunt",
    description: "Catch Pellet Guy for the first time.",
    isUnlocked: (stats) => stats.totalCatches >= 1,
  },
  {
    id: "ghost-hunter",
    icon: "👻",
    title: "Ghost Hunter",
    description: "Catch 100 Pellet Guys.",
    isUnlocked: (stats) => stats.totalCatches >= 100,
  },
  {
    id: "ghost-master",
    icon: "🏆",
    title: "Ghost Master",
    description: "Catch 1,000 Pellet Guys.",
    isUnlocked: (stats) => stats.totalCatches >= 1000,
  },
  {
    id: "no-escape",
    icon: "💎",
    title: "No Escape",
    description: "Complete a full game without losing a ghost.",
    isUnlocked: (stats) => stats.levelsCleared >= 1 && stats.totalGhostLosses === 0,
  },
  {
    id: "mine-sweeper",
    icon: "💣",
    title: "Mine Sweeper",
    description: "Survive a mine encounter.",
    isUnlocked: (stats) => stats.totalMinesTriggered >= 1,
  },
  {
    id: "power-hungry",
    icon: "⚡",
    title: "Power Hungry",
    description: "Collect 100 power-ups.",
    isUnlocked: (stats) => stats.totalPowerUpsUsed >= 100,
  },
  {
    id: "hardcore",
    icon: "🔥",
    title: "Hardcore",
    description: "Complete a Hardcore run.",
    isUnlocked: (progress) => (progress.bestHardcoreSurvivalMs ?? 0) > 0,
  },
  {
    id: "endless",
    icon: "♾️",
    title: "Endless",
    description: "Reach level 10 in Endless Mode.",
    isUnlocked: (stats, progress) => progress.highestLevel >= 10,
  },
];

export default function AchievementsScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<StatisticsData>(DEFAULT_STATISTICS);
  const [progress, setProgress] = useState<ProgressData | null>(null);

  useEffect(() => {
    loadStatistics().then(setStats);
    loadProgress().then(setProgress);
  }, []);

  return (
    <SafeAreaView style={styles.container} testID="achievements-screen">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} testID="back-btn">
          <Text style={styles.back}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🏆 ACHIEVEMENTS</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={true}
      >
        {ACHIEVEMENTS.map((achievement) => {
          const unlocked = progress ? achievement.isUnlocked(stats, progress) : false;
          return (
            <View
              key={achievement.id}
              style={[styles.card, unlocked && styles.cardUnlocked]}
              testID={`achievement-${achievement.id}`}
            >
              <View style={styles.cardIcon}>
                <Text style={styles.iconText}>{achievement.icon}</Text>
              </View>
              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, unlocked && styles.cardTitleUnlocked]}>
                    {achievement.title}
                  </Text>
                  {unlocked && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>✓</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.cardDesc, unlocked && styles.cardDescUnlocked]}>
                  {achievement.description}
                </Text>
                {!unlocked && (
                  <View style={styles.lockedOverlay}>
                    <Text style={styles.lockedText}>🔒 LOCKED</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.uiBg,
  },
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
  back: {
    color: "#FFFF00",
    fontWeight: "900",
    fontSize: 14,
    letterSpacing: 1,
  },
  title: {
    color: "#FFFF00",
    fontWeight: "900",
    fontSize: 20,
    letterSpacing: 2,
  },
  headerSpacer: {
    width: 60,
  },
  scroll: {
    padding: 14,
    gap: 12,
  },
  card: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#2a3556",
    backgroundColor: "#0d1120",
    padding: 14,
    gap: 12,
    opacity: 0.6,
  },
  cardUnlocked: {
    borderColor: "#4d6bcc",
    backgroundColor: "#11192d",
    opacity: 1,
  },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1a2440",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#2a3556",
  },
  iconText: {
    fontSize: 28,
  },
  cardContent: {
    flex: 1,
    gap: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  cardTitle: {
    color: "#8895c0",
    fontWeight: "900",
    fontSize: 16,
    letterSpacing: 0.5,
    flex: 1,
  },
  cardTitleUnlocked: {
    color: "#ffffff",
  },
  cardDesc: {
    color: "#5a6382",
    fontSize: 13,
    lineHeight: 18,
  },
  cardDescUnlocked: {
    color: "#b8c2eb",
  },
  badge: {
    backgroundColor: "#2d7d40",
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  lockedOverlay: {
    marginTop: 4,
  },
  lockedText: {
    color: "#6b7398",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
});
