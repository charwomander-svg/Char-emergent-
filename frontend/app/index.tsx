import React, { useCallback, useEffect, useState } from "react";
import { Platform, View, Text, StyleSheet, TouchableOpacity, ScrollView, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { COLORS } from "@/src/game/constants";
import { useDailyMissions } from "@/src/game/dailyMissions";
import { syncPlayGames } from "@/src/game/playGames";
import { getSoundEngine } from "@/src/game/sounds";
import { useEconomy } from "@/src/game/useEconomy";
import { loadSettings } from "@/src/game/settings";
import {
  computeUnlockedThemeIds,
  getTotalGoldStars,
  getTotalStars,
  loadProgress,
  THEMES,
} from "@/src/game/progress";

export default function MainMenu() {
  const router = useRouter();
  const [webMounted, setWebMounted] = useState(false);
  const { width } = useWindowDimensions();
  const isCompactMenu = width < 390;
  const { coins, economy, grantCoins } = useEconomy();
  const [highestLevel, setHighestLevel] = useState(1);
  const [totalCatches, setTotalCatches] = useState(0);
  const [totalStars, setTotalStars] = useState(0);
  const [totalGoldStars, setTotalGoldStars] = useState(0);
  const [nextUnlockText, setNextUnlockText] = useState("All visible teams unlocked.");
  const { missions, completedCount, rewardClaimed, rewardCoins, dateKey, refresh } =
    useDailyMissions(economy ? grantCoins : undefined);

  useEffect(() => {
    let mounted = true;
    void syncPlayGames();
    loadSettings().then((s) => {
      if (!mounted) return;
      getSoundEngine().setEnabled(!!s.soundOn);
      getSoundEngine().setVolumes({ sfx: s.sfxVolume, music: s.musicVolume });
      if (s.soundOn && s.musicOn) getSoundEngine().startMusic();
    });
    loadProgress().then((p) => {
      if (!mounted) return;
      const unlocked = new Set(computeUnlockedThemeIds(p));
      setHighestLevel(p.highestLevel);
      setTotalCatches(p.totalCatches);
      setTotalStars(getTotalStars(p));
      setTotalGoldStars(getTotalGoldStars(p));
      const nextTheme = THEMES.filter((theme) => !theme.hidden && !unlocked.has(theme.id))[0];
      setNextUnlockText(nextTheme ? `${nextTheme.name}: ${nextTheme.unlockHint}` : "All visible teams unlocked.");
    });
    return () => {
      mounted = false;
      getSoundEngine().stopMusic();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  useEffect(() => {
    if (Platform.OS !== "web") return;
    setWebMounted(true);
  }, []);

  const go = (route: string) => {
    getSoundEngine().uiClick();
    router.push(route as any);
  };

  if (Platform.OS === "web" && !webMounted) {
    return (
      <SafeAreaView style={styles.container} testID="main-menu">
        <View style={styles.webBootPlaceholder}>
          <Text style={styles.webBootText}>Loading menu…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} testID="main-menu">
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <Text style={styles.kicker}>CHARWARE ARCADE</Text>
          <Text style={[styles.heroTitle, isCompactMenu && styles.heroTitleCompact]}>GHOST MAZE</Text>
          <Text style={styles.heroSubtitle}>Reverse Maze Chase</Text>
          <View style={[styles.heroMetaRow, isCompactMenu && styles.heroMetaRowCompact]}>
            <View style={styles.coinBadge} testID="menu-coin-balance">
              <Text style={styles.coinBadgeText}>🪙 {coins}</Text>
              <Text style={styles.coinBadgeLabel}>GHOST COINS</Text>
            </View>
            <View style={styles.metaPill}>
              <Text style={styles.metaPillLabel}>LEVEL</Text>
              <Text style={styles.metaPillValue}>{highestLevel}</Text>
            </View>
            <View style={styles.metaPill}>
              <Text style={styles.metaPillLabel}>CATCHES</Text>
              <Text style={styles.metaPillValue}>{totalCatches}</Text>
            </View>
            <View style={styles.metaPill}>
              <Text style={styles.metaPillLabel}>STARS</Text>
              <Text style={styles.metaPillValue}>{totalStars}</Text>
            </View>
          </View>
          <Text style={styles.heroFootnote}>Gold Stars: {totalGoldStars}</Text>
          <View style={styles.ghostRow} testID="ghost-preview-row">
            {COLORS.ghosts.map((c, i) => (
              <View key={i} style={[styles.ghostPreview, { backgroundColor: c }]}>
                <View style={styles.ghostEye} />
                <View style={[styles.ghostEye, { right: 4, left: undefined }]} />
              </View>
            ))}
            <View style={styles.pelletGuyPreview} />
          </View>
        </View>

        <TouchableOpacity style={styles.playBtn} onPress={() => go("/game")} testID="play-btn">
          <Text style={styles.playBtnText}>▶ START RUN</Text>
        </TouchableOpacity>

        <View style={styles.modeGrid}>
          <TouchableOpacity style={[styles.modeCard, isCompactMenu && styles.modeCardCompact, { borderColor: "#7FE8FF" }]} onPress={() => go("/speedrun")} testID="speedrun-btn">
            <Text style={[styles.modeTitle, { color: "#7FE8FF" }]}>⏱ SPEEDRUN</Text>
            <Text style={styles.modeSub}>Best time wins</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.modeCard, isCompactMenu && styles.modeCardCompact, { borderColor: "#FFD23F" }]} onPress={() => go("/game?mode=timeattack")} testID="timeattack-btn">
            <Text style={[styles.modeTitle, { color: "#FFD23F" }]}>🔥 TIME ATTACK</Text>
            <Text style={styles.modeSub}>3 minutes · infinite respawns</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.modeCard, isCompactMenu && styles.modeCardCompact, { borderColor: "#FF477E" }]} onPress={() => go("/game?mode=hardcore")} testID="hardcore-btn">
            <Text style={[styles.modeTitle, { color: "#FF477E" }]}>☠ HARDCORE</Text>
            <Text style={styles.modeSub}>No respawns</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.modeCard, isCompactMenu && styles.modeCardCompact, { borderColor: "#9CFF57" }]} onPress={() => go("/game?mode=endless")} testID="endless-btn">
            <Text style={[styles.modeTitle, { color: "#9CFF57" }]}>∞ ENDLESS</Text>
            <Text style={styles.modeSub}>Past level 50</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity style={[styles.actionBtn, isCompactMenu && styles.actionBtnCompact]} onPress={() => go("/levels")} testID="levels-btn"><Text style={styles.actionBtnText}>🎯 LEVEL SELECT</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, isCompactMenu && styles.actionBtnCompact]} onPress={() => go("/shop")} testID="shop-btn"><Text style={styles.actionBtnText}>🛒 SHOP</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, isCompactMenu && styles.actionBtnCompact]} onPress={() => go("/characters")} testID="characters-btn"><Text style={styles.actionBtnText}>👻 CHARACTERS</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, isCompactMenu && styles.actionBtnCompact]} onPress={() => go("/leaderboard")} testID="leaderboard-btn"><Text style={styles.actionBtnText}>🏆 LEADERBOARD</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, isCompactMenu && styles.actionBtnCompact]} onPress={() => go("/statistics")} testID="statistics-btn"><Text style={styles.actionBtnText}>📊 STATISTICS</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, isCompactMenu && styles.actionBtnCompact]} onPress={() => go("/tutorial")} testID="tutorial-btn"><Text style={styles.actionBtnText}>📘 TUTORIAL</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, isCompactMenu && styles.actionBtnCompact]} onPress={() => go("/settings")} testID="settings-btn"><Text style={styles.actionBtnText}>⚙️ SETTINGS</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, isCompactMenu && styles.actionBtnCompact]} onPress={() => go("/credits")} testID="credits-btn"><Text style={styles.actionBtnText}>🎬 CREDITS</Text></TouchableOpacity>
        </View>

        <View style={styles.unlockCard} testID="next-unlock-card">
          <Text style={styles.unlockTitle}>NEXT UNLOCK</Text>
          <Text style={styles.unlockText}>{nextUnlockText}</Text>
          <Text style={styles.unlockMeta}>LEVEL {highestLevel} · CATCHES {totalCatches}</Text>
        </View>

        <View style={styles.dailyMissionCard} testID="daily-missions-card">
          <View style={styles.dailyMissionHeader}>
            <Text style={styles.dailyMissionTitle}>DAILY MISSIONS</Text>
            <Text style={styles.dailyMissionDate}>{dateKey}</Text>
          </View>
          <Text style={styles.dailyMissionReward}>
            {rewardClaimed ? `Reward claimed · +${rewardCoins} coins` : `Complete all 3 for +${rewardCoins} Ghost Coins`}
          </Text>
          {missions.map((mission) => (
            <View key={mission.id} style={styles.dailyMissionRow}>
              <Text style={styles.dailyMissionBullet}>{mission.completed ? "✓" : "○"}</Text>
              <View style={styles.dailyMissionTextWrap}>
                <Text style={[styles.dailyMissionText, mission.completed && styles.dailyMissionTextDone]}>{mission.title}</Text>
                <Text style={styles.dailyMissionProgress}>{mission.progress}/{mission.target}</Text>
              </View>
            </View>
          ))}
          <Text style={styles.dailyMissionFooter}>{completedCount}/3 complete</Text>
        </View>

        <View style={styles.howToWrap}>
          <Text style={styles.howToTitle}>HOW TO PLAY</Text>
          <Text style={styles.howToText}>
            • Catch Pellet Guy 3 times to clear{"\n"}
            • Swipe to direct armed ghosts{"\n"}
            • Every 5th level is a bonus stage{"\n"}
            • Don&apos;t lose all ghosts or all pellets{"\n"}
            • 20 total ghost deaths in a stage is an auto-fail (resets each stage){"\n"}
            • Keyboard: WASD/Arrows move, 1-4 select/hold to cycle AI, F1-F8 use powerups, Backspace exits{"\n"}
            • Puppet Master Mode: G1 WASD, G2 YGHJ, G3 Arrows, G4 Numpad 8/4/2/6{"\n"}
            • Use 📘 TUTORIAL for complete systems and mode rules
          </Text>
        </View>

        <Text style={styles.footer}>v1.0 · HUDFD</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.uiBg },
  scrollContent: { paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  heroCard: {
    borderRadius: 16, borderWidth: 1, borderColor: "#3f4f88", backgroundColor: "#0f1428", padding: 14, gap: 10,
  },
  kicker: { color: "#7ca4ff", fontSize: 11, fontWeight: "800", letterSpacing: 1.6 },
  heroTitle: { color: "#ffff66", fontSize: 38, fontWeight: "900", letterSpacing: 2.4 },
  heroTitleCompact: { fontSize: 33, letterSpacing: 2.1 },
  heroSubtitle: { color: "#ffb897", fontSize: 13, fontWeight: "700", letterSpacing: 0.8 },
  heroMetaRow: { flexDirection: "row", gap: 8, alignItems: "stretch" },
  heroMetaRowCompact: { flexWrap: "wrap", gap: 6 },
  heroFootnote: { color: "#ffd54a", fontSize: 11, fontWeight: "800", letterSpacing: 0.8 },
  coinBadge: {
    flex: 1.25, backgroundColor: "#1f1f3a", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: "#FFD23F", alignItems: "center", justifyContent: "center",
  },
  coinBadgeText: { color: "#FFD23F", fontWeight: "900", fontSize: 18, letterSpacing: 1 },
  coinBadgeLabel: { color: "#FFB897", fontSize: 9, letterSpacing: 1.2, fontWeight: "bold", marginTop: 2 },
  metaPill: {
    flex: 1, borderRadius: 10, borderWidth: 1, borderColor: "#39466f", backgroundColor: "#171f39", alignItems: "center", justifyContent: "center", paddingVertical: 6,
  },
  metaPillLabel: { color: "#9fb2e6", fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  metaPillValue: { color: "#f7faff", fontSize: 14, fontWeight: "900", marginTop: 2 },
  ghostRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 6 },
  ghostPreview: {
    width: 36, height: 36, borderTopLeftRadius: 18, borderTopRightRadius: 18, position: "relative", justifyContent: "center",
  },
  ghostEye: { position: "absolute", width: 8, height: 8, borderRadius: 4, backgroundColor: "#FFFFFF", top: 10, left: 4 },
  pelletGuyPreview: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.pelletGuy },
  playBtn: {
    backgroundColor: "#FFFF00", paddingVertical: 14, borderRadius: 12, borderWidth: 2, borderColor: "#ff5f74", alignItems: "center",
  },
  playBtnText: { color: "#000000", fontWeight: "900", fontSize: 18, letterSpacing: 1.3 },
  modeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  modeCard: { width: "48%", borderRadius: 10, borderWidth: 1, backgroundColor: "#121a31", paddingHorizontal: 10, paddingVertical: 10 },
  modeCardCompact: { width: "100%" },
  modeTitle: { fontSize: 12, fontWeight: "900", letterSpacing: 0.7 },
  modeSub: { color: "#b3c1e6", fontSize: 10, marginTop: 4, fontWeight: "700" },
  quickActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  actionBtn: {
    borderRadius: 9, borderWidth: 1, borderColor: "#4a5f96", backgroundColor: "#121b35", paddingVertical: 9, paddingHorizontal: 10, minWidth: "31%",
  },
  actionBtnCompact: { minWidth: "48%" },
  actionBtnText: { color: "#ecf2ff", fontWeight: "800", fontSize: 12, letterSpacing: 0.5 },
  unlockCard: {
    width: "100%", padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#9f8bff", backgroundColor: "#17142b",
  },
  unlockTitle: { color: "#c8bcff", fontWeight: "900", letterSpacing: 1.2, fontSize: 12 },
  unlockText: { color: "#ffffff", marginTop: 4, fontWeight: "800", fontSize: 13 },
  unlockMeta: { color: "#bba9f5", marginTop: 6, fontSize: 10, letterSpacing: 1, fontWeight: "700" },
  dailyMissionCard: {
    width: "100%", padding: 14, borderRadius: 12, borderWidth: 2, borderColor: "#57e8ff", backgroundColor: "#101a2c", gap: 8,
  },
  dailyMissionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dailyMissionTitle: { color: "#57e8ff", fontWeight: "900", fontSize: 15, letterSpacing: 1.5 },
  dailyMissionDate: { color: "#FFB897", fontSize: 10, letterSpacing: 1, fontWeight: "bold" },
  dailyMissionReward: { color: "#FFF4A3", fontSize: 12, fontWeight: "bold", letterSpacing: 0.5 },
  dailyMissionRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  dailyMissionBullet: { color: "#57e8ff", fontSize: 14, fontWeight: "900", marginTop: 1 },
  dailyMissionTextWrap: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  dailyMissionText: { flex: 1, color: "#FFFFFF", fontSize: 13, lineHeight: 18 },
  dailyMissionTextDone: { color: "#9fffa9" },
  dailyMissionProgress: { color: "#FFB897", fontSize: 12, fontWeight: "900", minWidth: 34, textAlign: "right" },
  dailyMissionFooter: { color: "#9eb3d8", fontSize: 11, fontWeight: "bold", letterSpacing: 1, textAlign: "right" },
  howToWrap: {
    width: "100%", padding: 12, backgroundColor: COLORS.uiPanel, borderRadius: 8, borderWidth: 1, borderColor: COLORS.uiBorder,
  },
  howToTitle: {
    color: "#FFFF00", fontWeight: "900", fontSize: 14, letterSpacing: 2, marginBottom: 8, textAlign: "center",
  },
  howToText: { color: "#FFFFFF", fontSize: 12, lineHeight: 18 },
  footer: { color: "#444466", fontSize: 11, marginTop: 4, marginBottom: 8, letterSpacing: 1, textAlign: "center" },
  webBootPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  webBootText: {
    color: "#9fb2e6",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
});
