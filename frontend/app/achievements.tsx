import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { COLORS } from "@/src/game/constants";
import { ACHIEVEMENT_IDS } from "@/src/game/playGames";
import { storage } from "@/src/utils/storage";
import { getSoundEngine } from "@/src/game/sounds";

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
  key: string;
  id: string;
  title: string;
  description: string;
  emoji: string;
}

const ACHIEVEMENTS: Achievement[] = [
  {
    key: "flippingTheScript",
    id: ACHIEVEMENT_IDS.flippingTheScript,
    title: "Flipping the Script",
    description: "Make your first successful catch",
    emoji: "🎯",
  },
  {
    key: "oneAndDone",
    id: ACHIEVEMENT_IDS.oneAndDone,
    title: "One and Done!",
    description: "Clear level 1",
    emoji: "✅",
  },
  {
    key: "bonus",
    id: ACHIEVEMENT_IDS.bonus,
    title: "BONUS!",
    description: "Fully clear a bonus stage before time expires",
    emoji: "⭐",
  },
  {
    key: "gottaGoFast",
    id: ACHIEVEMENT_IDS.gottaGoFast,
    title: "Gotta Go Fast!",
    description: "Finish a speedrun run",
    emoji: "⏱️",
  },
  {
    key: "topTen",
    id: ACHIEVEMENT_IDS.topTen,
    title: "Top Ten",
    description: "Reach level 10",
    emoji: "🔟",
  },
  {
    key: "friends",
    id: ACHIEVEMENT_IDS.friends,
    title: "Friends!",
    description: "Arm all four ghosts at once",
    emoji: "👻",
  },
  {
    key: "freeHugs",
    id: ACHIEVEMENT_IDS.freeHugs,
    title: "Free Hugs",
    description: "Reach 50 total catches",
    emoji: "🤗",
  },
  {
    key: "twentyFiveToLife",
    id: ACHIEVEMENT_IDS.twentyFiveToLife,
    title: "25 to Life",
    description: "Reach 25 total catches",
    emoji: "🎖️",
  },
  {
    key: "halfwayThere",
    id: ACHIEVEMENT_IDS.halfwayThere,
    title: "We're Halfway There",
    description: "Reach level 25",
    emoji: "🏁",
  },
  {
    key: "rememberMeForCenturies",
    id: ACHIEVEMENT_IDS.rememberMeForCenturies,
    title: "Remember Me for Centuries",
    description: "Reach 100 total catches",
    emoji: "💯",
  },
  {
    key: "classicConcentration",
    id: ACHIEVEMENT_IDS.classicConcentration,
    title: "Classic Concentration",
    description: "Fill all 50 aggregate classic bests and submit",
    emoji: "🎮",
  },
  {
    key: "kingOfSpeed",
    id: ACHIEVEMENT_IDS.kingOfSpeed,
    title: "The King of Speed",
    description: "Fill all 50 aggregate speedrun bests and submit",
    emoji: "👑",
  },
  {
    key: "pelletSchmellet",
    id: ACHIEVEMENT_IDS.pelletSchmellet,
    title: "Pellet, Schmellet",
    description: "Clear a level with very few pellets left",
    emoji: "🟡",
  },
  {
    key: "chardcore",
    id: ACHIEVEMENT_IDS.chardcore,
    title: "Chardcore",
    description: "View the credits",
    emoji: "🎬",
  },
  {
    key: "shhhItsASecret",
    id: ACHIEVEMENT_IDS.shhhItsASecret,
    title: "Shhh. It's a Secret",
    description: "Trigger the level-select cheat code",
    emoji: "🤫",
  },
  {
    key: "closeCall",
    id: ACHIEVEMENT_IDS.closeCall,
    title: "Close Call",
    description: "Clear a level while on your last life",
    emoji: "❤️",
  },
];

const KEY = "ghostMaze.playGames.v1";

export default function AchievementsScreen() {
  const router = useRouter();
  const [unlockedKeys, setUnlockedKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    try {
      const raw = await storage.getItem(KEY, "");
      if (raw) {
        const data = JSON.parse(raw as string) as PlayGamesData;
        setUnlockedKeys(new Set(data.unlockedAchievements || []));
      }
    } catch (error) {
      console.error("Failed to load achievements:", error);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    getSoundEngine().uiClick();
    router.back();
  };

  const unlockedCount = ACHIEVEMENTS.filter((ach) => unlockedKeys.has(ach.key)).length;
  const totalCount = ACHIEVEMENTS.length;
  const progressPercent = Math.round((unlockedCount / totalCount) * 100);

  return (
    <SafeAreaView style={styles.container} testID="achievements-screen">
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn} testID="back-btn">
            <Text style={styles.backBtnText}>← BACK</Text>
          </TouchableOpacity>
          <Text style={styles.title}>🏆 ACHIEVEMENTS</Text>
        </View>

        <View style={styles.progressCard}>
          <Text style={styles.progressTitle}>PROGRESS</Text>
          <Text style={styles.progressText}>
            {unlockedCount} / {totalCount} Unlocked ({progressPercent}%)
          </Text>
          {Platform.OS === "android" && (
            <Text style={styles.progressHint}>
              Sign in to Google Play Games to sync achievements across devices.
            </Text>
          )}
        </View>

        {loading ? (
          <View style={styles.loadingCard}>
            <Text style={styles.loadingText}>Loading achievements...</Text>
          </View>
        ) : (
          <View style={styles.achievementList}>
            {ACHIEVEMENTS.map((achievement) => {
              const isUnlocked = unlockedKeys.has(achievement.key);
              return (
                <View
                  key={achievement.key}
                  style={[styles.achievementCard, isUnlocked && styles.achievementCardUnlocked]}
                  testID={`achievement-${achievement.key}`}
                >
                  <View style={styles.achievementEmoji}>
                    <Text style={styles.achievementEmojiText}>
                      {isUnlocked ? achievement.emoji : "🔒"}
                    </Text>
                  </View>
                  <View style={styles.achievementContent}>
                    <Text style={[styles.achievementTitle, !isUnlocked && styles.achievementTitleLocked]}>
                      {achievement.title}
                    </Text>
                    <Text style={[styles.achievementDescription, !isUnlocked && styles.achievementDescriptionLocked]}>
                      {achievement.description}
                    </Text>
                  </View>
                  {isUnlocked && (
                    <View style={styles.achievementBadge}>
                      <Text style={styles.achievementBadgeText}>✓</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.uiBg },
  scrollContent: { paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  header: { gap: 12 },
  backBtn: {
    alignSelf: "flex-start",
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#4a5f96",
    backgroundColor: "#121b35",
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  backBtnText: { color: "#ecf2ff", fontWeight: "800", fontSize: 12, letterSpacing: 0.5 },
  title: {
    color: "#ffff66",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 2,
    textAlign: "center",
  },
  progressCard: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#FFD23F",
    backgroundColor: "#16152b",
    padding: 14,
    gap: 6,
  },
  progressTitle: { color: "#FFF4A3", fontWeight: "900", fontSize: 14, letterSpacing: 1.2 },
  progressText: { color: "#ffffff", fontSize: 16, fontWeight: "800" },
  progressHint: { color: "#d2d9fb", fontSize: 11, fontWeight: "700", marginTop: 4 },
  loadingCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#3f4f88",
    backgroundColor: "#0f1428",
    padding: 20,
    alignItems: "center",
  },
  loadingText: { color: "#ecf2ff", fontSize: 13, fontWeight: "700" },
  achievementList: { gap: 10 },
  achievementCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#3f4f88",
    backgroundColor: "#0f1428",
    padding: 12,
    gap: 12,
    opacity: 0.6,
  },
  achievementCardUnlocked: {
    borderColor: "#9CFF57",
    backgroundColor: "#1a2010",
    opacity: 1,
  },
  achievementEmoji: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#1f2644",
    alignItems: "center",
    justifyContent: "center",
  },
  achievementEmojiText: { fontSize: 28 },
  achievementContent: { flex: 1, gap: 4 },
  achievementTitle: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  achievementTitleLocked: { color: "#7a8aaa" },
  achievementDescription: {
    color: "#b3c1e6",
    fontSize: 12,
    fontWeight: "700",
  },
  achievementDescriptionLocked: { color: "#5a6a8a" },
  achievementBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#9CFF57",
    alignItems: "center",
    justifyContent: "center",
  },
  achievementBadgeText: { color: "#000000", fontSize: 18, fontWeight: "900" },
});
