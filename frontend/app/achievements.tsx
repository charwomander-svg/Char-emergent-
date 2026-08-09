import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { COLORS } from "@/src/game/constants";
import { loadUnlockedAchievementKeys, type AchievementKey } from "@/src/game/playGames";
import { getSoundEngine } from "@/src/game/sounds";

type AchievementInfo = { key: AchievementKey; title: string; detail: string };

const ACHIEVEMENTS: AchievementInfo[] = [
  { key: "flippingTheScript", title: "Flipping the Script", detail: "Catch one ghost." },
  { key: "oneAndDone", title: "One and Done!", detail: "Clear level 1." },
  { key: "bonus", title: "BONUS!", detail: "Perfect-clear a bonus stage." },
  { key: "gottaGoFast", title: "Gotta Go Fast!", detail: "Finish a speedrun run." },
  { key: "topTen", title: "Top Ten", detail: "Reach level 10." },
  { key: "friends", title: "Friends!", detail: "Arm all four ghosts at once." },
  { key: "freeHugs", title: "Free Hugs", detail: "Reach 50 total catches." },
  { key: "twentyFiveToLife", title: "25 to Life", detail: "Reach 25 total catches." },
  { key: "halfwayThere", title: "We're Halfway There", detail: "Reach level 25." },
  { key: "rememberMeForCenturies", title: "Remember Me for Centuries", detail: "Reach 100 total catches." },
  { key: "classicConcentration", title: "Classic Concentration", detail: "Fill all 50 aggregate bests." },
  { key: "kingOfSpeed", title: "The King of Speed", detail: "Fill all 50 speedrun bests." },
  { key: "pelletSchmellet", title: "Pellet, Schmellet", detail: "Clear a level with very few pellets left." },
  { key: "chardcore", title: "Chardcore", detail: "View the credits." },
  { key: "shhhItsASecret", title: "Shhh. It's a Secret", detail: "Trigger the level-select cheat code." },
  { key: "closeCall", title: "Close Call", detail: "Clear a level on your last life." },
];

export default function AchievementsScreen() {
  const router = useRouter();
  const [unlocked, setUnlocked] = useState<AchievementKey[]>([]);

  useEffect(() => {
    loadUnlockedAchievementKeys().then(setUnlocked);
  }, []);

  const unlockedSet = useMemo(() => new Set(unlocked), [unlocked]);
  const unlockedCount = unlocked.length;

  return (
    <SafeAreaView style={styles.container} testID="achievements-screen">
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            getSoundEngine().uiClick();
            router.back();
          }}
          style={styles.backBtn}
          testID="back-btn"
        >
          <Text style={styles.backBtnText}>‹ BACK</Text>
        </TouchableOpacity>
        <Text style={styles.title}>ACHIEVEMENTS</Text>
        <View style={{ width: 72 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>PROGRESS</Text>
          <Text style={styles.summaryValue}>
            {unlockedCount}/{ACHIEVEMENTS.length} unlocked
          </Text>
        </View>

        {ACHIEVEMENTS.map((achievement) => {
          const isUnlocked = unlockedSet.has(achievement.key);
          return (
            <View key={achievement.key} style={[styles.card, isUnlocked ? styles.cardUnlocked : styles.cardLocked]}>
              <View style={styles.cardRow}>
                <Text style={[styles.cardTitle, isUnlocked && styles.cardTitleUnlocked]}>{achievement.title}</Text>
                <Text style={[styles.state, isUnlocked ? styles.stateUnlocked : styles.stateLocked]}>
                  {isUnlocked ? "UNLOCKED" : "LOCKED"}
                </Text>
              </View>
              <Text style={styles.cardDetail}>{achievement.detail}</Text>
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
    borderBottomWidth: 2,
    borderBottomColor: COLORS.uiBorder,
  },
  backBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.uiBorder,
  },
  backBtnText: { color: "#FFFF00", fontWeight: "bold", letterSpacing: 1 },
  title: { color: "#FFFF00", fontSize: 20, fontWeight: "900", letterSpacing: 2 },
  scroll: { padding: 14, gap: 12 },
  summaryCard: {
    backgroundColor: COLORS.uiPanel,
    borderWidth: 1,
    borderColor: COLORS.uiBorder,
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  summaryTitle: { color: "#7fe8ff", fontWeight: "900", fontSize: 13, letterSpacing: 1.3 },
  summaryValue: { color: "#ffffff", fontWeight: "900", fontSize: 18 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: "#11192d",
    padding: 14,
    gap: 6,
  },
  cardUnlocked: { borderColor: "#39D98A" },
  cardLocked: { borderColor: "#3d4f88" },
  cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  cardTitle: { flex: 1, color: "#d4ddff", fontSize: 15, fontWeight: "900" },
  cardTitleUnlocked: { color: "#B7FFD2" },
  state: { fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  stateUnlocked: { color: "#39D98A" },
  stateLocked: { color: "#9fb2e6" },
  cardDetail: { color: "#ffffff", fontSize: 12, lineHeight: 17, fontWeight: "700" },
});
