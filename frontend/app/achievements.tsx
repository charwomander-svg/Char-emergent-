import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { COLORS } from "@/src/game/constants";
import { loadAchievementProgress } from "@/src/game/playGames";

type AchievementItem = Awaited<ReturnType<typeof loadAchievementProgress>>[number];

export default function AchievementsScreen() {
  const router = useRouter();
  const [achievements, setAchievements] = useState<AchievementItem[] | null>(null);

  useEffect(() => {
    loadAchievementProgress().then(setAchievements);
  }, []);

  if (!achievements) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loading}>LOADING…</Text>
      </SafeAreaView>
    );
  }

  const unlocked = achievements.filter((achievement) => achievement.unlocked);
  const locked = achievements.filter((achievement) => !achievement.unlocked);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.title}>ACHIEVEMENTS</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>CURRENT PROGRESS</Text>
          <Text style={styles.summaryValue}>
            {unlocked.length}/{achievements.length} UNLOCKED
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>UNLOCKED</Text>
          {unlocked.length > 0 ? (
            unlocked.map((achievement) => <AchievementCard key={achievement.key} achievement={achievement} />)
          ) : (
            <Text style={styles.emptyText}>No achievements unlocked yet.</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>LOCKED</Text>
          {locked.length > 0 ? (
            locked.map((achievement) => <AchievementCard key={achievement.key} achievement={achievement} />)
          ) : (
            <Text style={styles.emptyText}>All achievements unlocked.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function AchievementCard({ achievement }: { achievement: AchievementItem }) {
  return (
    <View style={[styles.card, achievement.unlocked ? styles.cardUnlocked : styles.cardLocked]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{achievement.name}</Text>
        <View style={[styles.badge, achievement.unlocked ? styles.badgeUnlocked : styles.badgeLocked]}>
          <Text style={styles.badgeText}>{achievement.unlocked ? "UNLOCKED" : "LOCKED"}</Text>
        </View>
      </View>
      <Text style={styles.cardDescription}>{achievement.description}</Text>
      {!achievement.unlocked ? <Text style={styles.cardHint}>Hint: {achievement.hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.uiBg },
  loading: { color: "#FFFF00", textAlign: "center", marginTop: 100 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.uiBorder,
  },
  title: {
    color: "#FFFF00",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 3,
  },
  back: { color: "#FFFF00", fontWeight: "900", fontSize: 14, letterSpacing: 1 },
  headerSpacer: { width: 60 },
  scroll: { padding: 14, gap: 12 },
  summaryCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#3d4f88",
    backgroundColor: "#11192d",
    padding: 14,
    gap: 4,
  },
  summaryLabel: { color: "#7fe8ff", fontWeight: "900", fontSize: 13, letterSpacing: 1.2 },
  summaryValue: { color: "#ffd54a", fontWeight: "900", fontSize: 18, letterSpacing: 1.5 },
  section: { gap: 10 },
  sectionTitle: { color: "#c7d2fe", fontWeight: "900", fontSize: 13, letterSpacing: 1.4 },
  emptyText: { color: "#94a3b8", fontSize: 13, fontStyle: "italic" },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  cardUnlocked: {
    borderColor: "#2aa06a",
    backgroundColor: "#0f221b",
  },
  cardLocked: {
    borderColor: "#3d4f88",
    backgroundColor: "#11192d",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  cardTitle: { flex: 1, color: "#FFFFFF", fontSize: 16, fontWeight: "900", letterSpacing: 0.5 },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeUnlocked: { backgroundColor: "#2aa06a" },
  badgeLocked: { backgroundColor: "#64748b" },
  badgeText: { color: "#ffffff", fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  cardDescription: { color: "#d4ddff", fontSize: 13, lineHeight: 18 },
  cardHint: { color: "#ffb897", fontSize: 12, lineHeight: 16 },
});
