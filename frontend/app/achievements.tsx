import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";

import { COLORS } from "@/src/game/constants";
import { ACHIEVEMENT_IDS } from "@/src/game/playGames";
import { storage } from "@/src/utils/storage";

interface PlayGamesData {
  unlockedAchievements: Array<keyof typeof ACHIEVEMENT_IDS>;
}

const ACHIEVEMENT_DESCRIPTIONS: Record<keyof typeof ACHIEVEMENT_IDS, { name: string; description: string }> = {
  flippingTheScript: { name: "Flipping the Script", description: "First successful catch" },
  oneAndDone: { name: "One and Done!", description: "Clear level 1" },
  bonus: { name: "BONUS!", description: "Fully clear a bonus stage" },
  gottaGoFast: { name: "Gotta Go Fast!", description: "Finish a speedrun" },
  topTen: { name: "Top Ten", description: "Reach level 10" },
  friends: { name: "Friends!", description: "Arm all four ghosts at once" },
  freeHugs: { name: "Free Hugs", description: "Reach 50 total catches" },
  twentyFiveToLife: { name: "25 to Life", description: "Reach 25 total catches" },
  halfwayThere: { name: "Halfway There", description: "Reach level 25" },
  rememberMeForCenturies: { name: "Remember Me for Centuries", description: "Reach 100 total catches" },
  classicConcentration: { name: "Classic Concentration", description: "Fill all 50 aggregate bests" },
  kingOfSpeed: { name: "The King of Speed", description: "Fill all 50 speedrun bests" },
  pelletSchmellet: { name: "Pellet, Schmellet", description: "Clear a level with very few pellets left" },
  chardcore: { name: "Chardcore", description: "View the credits" },
  shhhItsASecret: { name: "Shhh. It's a Secret", description: "Trigger the level-select cheat code" },
  closeCall: { name: "Close Call", description: "Clear a level on your last life" },
};

export default function AchievementsScreen() {
  const router = useRouter();
  const [unlocked, setUnlocked] = useState<Set<keyof typeof ACHIEVEMENT_IDS>>(new Set());

  useEffect(() => {
    const load = async () => {
      try {
        const raw = await storage.getItem("ghostMaze.playGames.v1", "");
        if (raw) {
          const data = JSON.parse(raw) as PlayGamesData;
          setUnlocked(new Set(data.unlockedAchievements || []));
        }
      } catch {
        // ignore
      }
    };
    void load();
  }, []);

  const achievements = Object.entries(ACHIEVEMENT_DESCRIPTIONS).map(([key, info]) => ({
    key: key as keyof typeof ACHIEVEMENT_IDS,
    ...info,
    unlocked: unlocked.has(key as keyof typeof ACHIEVEMENT_IDS),
  }));

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
        <View style={styles.statsCard}>
          <Text style={styles.statsText}>
            {unlocked.size} / {Object.keys(ACHIEVEMENT_DESCRIPTIONS).length} UNLOCKED
          </Text>
        </View>
        {achievements.map((achievement) => (
          <View
            key={achievement.key}
            style={[styles.card, achievement.unlocked ? styles.cardUnlocked : styles.cardLocked]}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.icon}>{achievement.unlocked ? "🏅" : "🔒"}</Text>
              <View style={styles.cardContent}>
                <Text style={[styles.achievementName, achievement.unlocked && styles.achievementNameUnlocked]}>
                  {achievement.name}
                </Text>
                <Text style={[styles.achievementDesc, achievement.unlocked && styles.achievementDescUnlocked]}>
                  {achievement.description}
                </Text>
              </View>
            </View>
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
  statsCard: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#FFD23F",
    backgroundColor: "#1f1f3a",
    padding: 14,
    alignItems: "center",
  },
  statsText: { color: "#FFD23F", fontWeight: "900", fontSize: 16, letterSpacing: 1.5 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  cardUnlocked: {
    borderColor: "#9CFF57",
    backgroundColor: "#1a2416",
  },
  cardLocked: {
    borderColor: "#3d4f88",
    backgroundColor: "#11192d",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  icon: { fontSize: 32 },
  cardContent: { flex: 1 },
  achievementName: {
    color: "#8a9bcc",
    fontWeight: "900",
    fontSize: 14,
    letterSpacing: 1,
    marginBottom: 4,
  },
  achievementNameUnlocked: {
    color: "#9CFF57",
  },
  achievementDesc: {
    color: "#5a6a99",
    fontSize: 12,
    fontWeight: "700",
  },
  achievementDescUnlocked: {
    color: "#d4ddff",
  },
});
