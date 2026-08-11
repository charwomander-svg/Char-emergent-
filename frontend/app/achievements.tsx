import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";

import { COLORS } from "@/src/game/constants";
import { storage } from "@/src/utils/storage";

interface PlayGamesData {
  unlockedAchievements: string[];
  classicBestScoresByLevel: Record<string, number>;
  speedrunBestMsByLevel: Record<string, number>;
  classicAggregateSubmitted: boolean;
  speedrunAggregateSubmitted: boolean;
  mostCatchesLifetimeSubmitted: number;
  totalGoldStarsSubmitted: number;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
}

const ACHIEVEMENTS: Achievement[] = [
  {
    id: "flippingTheScript",
    title: "Flipping the Script",
    description: "Catch your first Pellet Guy",
    icon: "🎯",
  },
  {
    id: "oneAndDone",
    title: "One and Done!",
    description: "Clear level 1",
    icon: "✨",
  },
  {
    id: "bonus",
    title: "BONUS!",
    description: "Fully clear a bonus stage before time expires",
    icon: "🌟",
  },
  {
    id: "gottaGoFast",
    title: "Gotta Go Fast!",
    description: "Complete a speedrun",
    icon: "⚡",
  },
  {
    id: "topTen",
    title: "Top Ten",
    description: "Reach level 10",
    icon: "🔟",
  },
  {
    id: "friends",
    title: "Friends!",
    description: "Arm all four ghosts at once",
    icon: "👻",
  },
  {
    id: "freeHugs",
    title: "Free Hugs",
    description: "Reach 50 total catches",
    icon: "🤗",
  },
  {
    id: "twentyFiveToLife",
    title: "25 to Life",
    description: "Reach 25 total catches",
    icon: "🎪",
  },
  {
    id: "halfwayThere",
    title: "We're Halfway There",
    description: "Reach level 25",
    icon: "🎵",
  },
  {
    id: "rememberMeForCenturies",
    title: "Remember Me for Centuries",
    description: "Reach 100 total catches",
    icon: "💯",
  },
  {
    id: "classicConcentration",
    title: "Classic Concentration",
    description: "Fill all 50 classic aggregate bests and submit",
    icon: "🎓",
  },
  {
    id: "kingOfSpeed",
    title: "The King of Speed",
    description: "Fill all 50 speedrun aggregate bests and submit",
    icon: "👑",
  },
  {
    id: "pelletSchmellet",
    title: "Pellet, Schmellet",
    description: "Clear a level with very few pellets left",
    icon: "🔥",
  },
  {
    id: "chardcore",
    title: "Chardcore",
    description: "View the credits",
    icon: "🎬",
  },
  {
    id: "shhhItsASecret",
    title: "Shhh. It's a Secret",
    description: "Trigger the level-select cheat code",
    icon: "🤫",
  },
  {
    id: "closeCall",
    title: "Close Call",
    description: "Clear a level while on your last life",
    icon: "❤️",
  },
];

const KEY = "ghostMaze.playGames.v1";

export default function AchievementsScreen() {
  const router = useRouter();
  const [unlockedAchievements, setUnlockedAchievements] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function loadAchievements() {
      try {
        const raw = await storage.getItem(KEY, "");
        if (raw) {
          const data = JSON.parse(raw as string) as PlayGamesData;
          setUnlockedAchievements(new Set(data.unlockedAchievements || []));
        }
      } catch {
        // Ignore errors and show all achievements as locked
      }
    }
    loadAchievements();
  }, []);

  const unlockedCount = unlockedAchievements.size;
  const totalCount = ACHIEVEMENTS.length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.title}>ACHIEVEMENTS</Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.progressCard}>
        <Text style={styles.progressText}>
          {unlockedCount} / {totalCount} Unlocked
        </Text>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${(unlockedCount / totalCount) * 100}%` },
            ]}
          />
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {ACHIEVEMENTS.map((achievement) => {
          const isUnlocked = unlockedAchievements.has(achievement.id);
          return (
            <View
              key={achievement.id}
              style={[styles.achievementCard, isUnlocked && styles.achievementCardUnlocked]}
            >
              <Text style={styles.achievementIcon}>{achievement.icon}</Text>
              <View style={styles.achievementContent}>
                <Text style={[styles.achievementTitle, isUnlocked && styles.achievementTitleUnlocked]}>
                  {achievement.title}
                </Text>
                <Text style={styles.achievementDescription}>{achievement.description}</Text>
              </View>
              {isUnlocked ? (
                <Text style={styles.achievementBadge}>✓</Text>
              ) : (
                <Text style={styles.achievementLocked}>🔒</Text>
              )}
            </View>
          );
        })}
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
  progressCard: {
    margin: 14,
    marginBottom: 0,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#3d4f88",
    backgroundColor: "#11192d",
  },
  progressText: {
    color: "#7fe8ff",
    fontWeight: "900",
    fontSize: 16,
    letterSpacing: 1.4,
    marginBottom: 12,
    textAlign: "center",
  },
  progressBar: {
    height: 8,
    backgroundColor: "#1d2746",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#7fe8ff",
    borderRadius: 4,
  },
  scroll: { padding: 14, gap: 12 },
  achievementCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#3d4f88",
    backgroundColor: "#11192d",
    padding: 14,
    gap: 12,
    opacity: 0.6,
  },
  achievementCardUnlocked: {
    opacity: 1,
    borderColor: "#7fe8ff",
  },
  achievementIcon: {
    fontSize: 32,
  },
  achievementContent: {
    flex: 1,
  },
  achievementTitle: {
    color: "#9ca3af",
    fontWeight: "900",
    fontSize: 14,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  achievementTitleUnlocked: {
    color: "#7fe8ff",
  },
  achievementDescription: {
    color: "#d4ddff",
    fontSize: 12,
    fontWeight: "500",
  },
  achievementBadge: {
    color: "#7fe8ff",
    fontSize: 24,
    fontWeight: "900",
  },
  achievementLocked: {
    fontSize: 20,
    opacity: 0.5,
  },
});
