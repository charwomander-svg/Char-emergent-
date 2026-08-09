import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useWindowDimensions, Platform, TextInput, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { COLORS } from "@/src/game/constants";
import { useDailyMissions } from "@/src/game/dailyMissions";
import { syncPlayGames } from "@/src/game/playGames";
import { getMusicTrackForLevel, getSoundEngine } from "@/src/game/sounds";
import { useEconomy } from "@/src/game/useEconomy";
import { DEFAULT_SETTINGS, loadSettings, saveSettings, SettingsData } from "@/src/game/settings";
import { redeemPromoCode } from "@/src/game/api";
import { getPlayerId } from "@/src/game/playerId";
import { addCoins, addInventory, loadEconomy, saveEconomy } from "@/src/game/economy";
import type { PowerUpId } from "@/src/game/powerups";
import {
  computeUnlockedThemeIds,
  getTotalGoldStars,
  getTotalStars,
  loadProgress,
  THEMES,
} from "@/src/game/progress";
import { storage } from "@/src/utils/storage";

const RELEASE_NOTES_SEEN_KEY = "ghostMaze.releaseNotesSeen.v1";
const RELEASE_NOTES_VERSION = "2026-07-26-production-polish";
const PROMO_HISTORY_KEY = "ghostMaze.promoHistory.v1";

interface PromoHistoryEntry {
  code: string;
  redeemedAt: string;
  summary: string;
}

export default function MainMenu() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isCompactMenu = width < 390;
  const { coins, economy, grantCoins } = useEconomy();
  const [highestLevel, setHighestLevel] = useState(1);
  const [totalCatches, setTotalCatches] = useState(0);
  const [totalStars, setTotalStars] = useState(0);
  const [totalGoldStars, setTotalGoldStars] = useState(0);
  const [nextUnlockText, setNextUnlockText] = useState("All visible teams unlocked.");
  const [showReleaseNotes, setShowReleaseNotes] = useState(false);
  const [menuSettings, setMenuSettings] = useState<SettingsData>(DEFAULT_SETTINGS);
  const [promoCode, setPromoCode] = useState("");
  const [redeemingPromo, setRedeemingPromo] = useState(false);
  const [promoFeedback, setPromoFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [promoHistory, setPromoHistory] = useState<PromoHistoryEntry | null>(null);
  const { missions, completedCount, rewardClaimed, rewardCoins, dateKey, refresh } =
    useDailyMissions(economy ? grantCoins : undefined);

  useEffect(() => {
    let mounted = true;
    if (Platform.OS === "android") {
      void syncPlayGames();
    }
    loadSettings().then((s) => {
      if (!mounted) return;
      setMenuSettings(s);
      getSoundEngine().setEnabled(!!s.soundOn);
      getSoundEngine().setVolumes({ sfx: s.sfxVolume, music: s.musicVolume });
      if (s.soundOn && s.musicOn) {
        getSoundEngine().startMusic(getMusicTrackForLevel(1));
      }
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
    storage.getItem<string>(RELEASE_NOTES_SEEN_KEY, "").then((seen) => {
      if (seen !== RELEASE_NOTES_VERSION) {
        setShowReleaseNotes(true);
      }
    });
    storage.getItem<string>(PROMO_HISTORY_KEY, "").then((value) => {
      if (!mounted || !value) return;
      try {
        const maybe = JSON.parse(value) as PromoHistoryEntry;
        if (typeof maybe.code !== "string" || typeof maybe.redeemedAt !== "string" || typeof maybe.summary !== "string") return;
        setPromoHistory(maybe);
      } catch {
        // Ignore malformed legacy entries.
      }
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

  const go = (route: string) => {
    getSoundEngine().uiClick();
    router.push(route as any);
  };

  const dismissReleaseNotes = () => {
    setShowReleaseNotes(false);
    void storage.setItem(RELEASE_NOTES_SEEN_KEY, RELEASE_NOTES_VERSION);
  };
  const redeemSecretCode = async () => {
    const cleaned = promoCode.trim();
    if (!cleaned || redeemingPromo) return;
    setRedeemingPromo(true);
    setPromoFeedback(null);
    try {
      if (cleaned.toUpperCase() === "WARM0NGER") {
        const next = {
          ...menuSettings,
          devMode: true,
          devInfiniteCoins: true,
          devInfiniteItems: true,
        };
        setMenuSettings(next);
        await saveSettings(next);
        const message = "Warm0nger enabled infinite coins, infinite items, and in-game dev actions.";
        setPromoFeedback({ kind: "success", message });
        if (menuSettings.haptics) {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        Alert.alert("Dev mode unlocked", message);
        setPromoCode("");
        return;
      }
      const playerId = await getPlayerId();
      const redeemed = await redeemPromoCode(cleaned, playerId);
      const economyData = await loadEconomy();
      let nextEconomy = addCoins(economyData, redeemed.rewards.coins ?? 0);
      for (const [rawId, qty] of Object.entries(redeemed.rewards.powerUps ?? {})) {
        const id = rawId as PowerUpId;
        if (typeof qty === "number" && qty > 0) {
          nextEconomy = addInventory(nextEconomy, id, qty);
        }
      }
      await saveEconomy(nextEconomy);
      const coinsReward = redeemed.rewards.coins ?? 0;
      const powerUps = Object.entries(redeemed.rewards.powerUps ?? {})
        .filter(([, qty]) => typeof qty === "number" && qty > 0)
        .map(([id, qty]) => `${qty} ${id}`);
      const rewards = [coinsReward > 0 ? `${coinsReward.toLocaleString()} Ghost Coins` : null, ...powerUps].filter(Boolean);
      const message = rewards.length > 0 ? `Added ${rewards.join(", ")} to your save.` : redeemed.message;
      setPromoFeedback({ kind: "success", message });
      if (menuSettings.haptics) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      const history: PromoHistoryEntry = {
        code: cleaned.toUpperCase(),
        redeemedAt: new Date().toISOString(),
        summary: message,
      };
      setPromoHistory(history);
      void storage.setItem(PROMO_HISTORY_KEY, JSON.stringify(history));
      Alert.alert("Code redeemed", message);
      setPromoCode("");
    } catch (error) {
      const message = error instanceof Error ? error.message.replace(/^HTTP \d+:\s*/, "") : "Unable to redeem code.";
      setPromoFeedback({ kind: "error", message });
      Alert.alert("Redeem failed", message);
    } finally {
      setRedeemingPromo(false);
    }
  };

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
        <TouchableOpacity
          style={styles.heroSecondaryBtn}
          onPress={() => go("/achievements")}
          testID="hero-achievements-btn"
        >
          <Text style={styles.heroSecondaryBtnText}>🏅 ACHIEVEMENTS</Text>
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
          <TouchableOpacity style={[styles.actionBtn, isCompactMenu && styles.actionBtnCompact]} onPress={() => go("/achievements")} testID="achievements-btn"><Text style={styles.actionBtnText}>🏅 ACHIEVEMENTS</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, isCompactMenu && styles.actionBtnCompact]} onPress={() => go("/statistics")} testID="statistics-btn"><Text style={styles.actionBtnText}>📊 STATISTICS</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, isCompactMenu && styles.actionBtnCompact]} onPress={() => go("/tutorial")} testID="tutorial-btn"><Text style={styles.actionBtnText}>📘 TUTORIAL</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, isCompactMenu && styles.actionBtnCompact]} onPress={() => go("/news")} testID="news-btn"><Text style={styles.actionBtnText}>📰 NEWS</Text></TouchableOpacity>
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
        <View style={styles.promoCard} testID="promo-code-card">
          <Text style={styles.promoTitle}>PROMO / SECRET CODE</Text>
          <Text style={styles.promoSub}>Redeem rewards directly from the main menu.</Text>
          <View style={styles.promoRow}>
            <TextInput
              value={promoCode}
              onChangeText={setPromoCode}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="ENTER CODE"
              placeholderTextColor="#7d88a8"
              style={styles.promoInput}
              testID="promo-code-input"
            />
            <TouchableOpacity
              onPress={redeemSecretCode}
              style={[styles.promoButton, redeemingPromo && styles.promoButtonDisabled]}
              disabled={redeemingPromo}
              testID="promo-code-submit"
            >
              <Text style={styles.promoButtonText}>{redeemingPromo ? "..." : "REDEEM"}</Text>
            </TouchableOpacity>
          </View>
          {promoFeedback && (
            <Text
              style={[
                styles.promoFeedback,
                promoFeedback.kind === "success" ? styles.promoFeedbackSuccess : styles.promoFeedbackError,
              ]}
              testID="promo-code-feedback"
            >
              {promoFeedback.message}
            </Text>
          )}
          {promoHistory && (
            <View style={styles.promoHistoryCard} testID="promo-code-history">
              <Text style={styles.promoHistoryTitle}>LAST REDEEMED</Text>
              <Text style={styles.promoHistoryText}>{promoHistory.code}</Text>
              <Text style={styles.promoHistoryText}>{new Date(promoHistory.redeemedAt).toLocaleString()}</Text>
              <Text style={styles.promoHistorySub}>{promoHistory.summary}</Text>
            </View>
          )}
        </View>

        {showReleaseNotes && (
          <View style={styles.releaseNotesCard} testID="release-notes-card">
            <Text style={styles.releaseNotesTitle}>WHAT&apos;S NEW</Text>
            <Text style={styles.releaseNotesText}>
              • Interactive tutorial practice{"\n"}
              • Leaderboard submission states + retry guidance{"\n"}
              • Promo redemption confirmation and history{"\n"}
              • Stability fixes from QA round
            </Text>
            <TouchableOpacity style={styles.releaseNotesBtn} onPress={dismissReleaseNotes} testID="release-notes-dismiss">
              <Text style={styles.releaseNotesBtnText}>GOT IT</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.footer}>v1.0 - HUDFD - SPRITEFIX2</Text>
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
  heroSecondaryBtn: {
    backgroundColor: "#17223f",
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#9CFF57",
    alignItems: "center",
  },
  heroSecondaryBtnText: { color: "#9CFF57", fontWeight: "900", fontSize: 14, letterSpacing: 1 },
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
  promoCard: {
    width: "100%", padding: 14, borderRadius: 12, borderWidth: 2, borderColor: "#ffd23f", backgroundColor: "#16152b", gap: 8,
  },
  promoTitle: { color: "#FFF4A3", fontWeight: "900", fontSize: 15, letterSpacing: 1.5 },
  promoSub: { color: "#d2d9fb", fontSize: 12, fontWeight: "700" },
  promoRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  promoInput: {
    flex: 1, borderWidth: 1, borderColor: "#394572", borderRadius: 8, backgroundColor: "#10172d", color: "#f4f7ff",
    paddingHorizontal: 12, paddingVertical: 10, fontWeight: "900", letterSpacing: 1,
  },
  promoButton: {
    borderWidth: 1, borderColor: "#FFD23F", borderRadius: 8, backgroundColor: "#202b4f", paddingHorizontal: 12, paddingVertical: 10,
  },
  promoButtonDisabled: { opacity: 0.6 },
  promoButtonText: { color: "#FFF4BF", fontSize: 12, fontWeight: "900", letterSpacing: 0.8 },
  promoFeedback: {
    borderWidth: 1, borderRadius: 8, fontSize: 12, fontWeight: "900", marginTop: 4, paddingHorizontal: 10, paddingVertical: 8,
  },
  promoFeedbackSuccess: { backgroundColor: "rgba(40, 167, 69, 0.16)", borderColor: "#39D98A", color: "#B7FFD2" },
  promoFeedbackError: { backgroundColor: "rgba(255, 79, 112, 0.14)", borderColor: "#FF6B8A", color: "#FFD1DC" },
  promoHistoryCard: {
    borderWidth: 1, borderColor: "#5f6aa0", borderRadius: 8, backgroundColor: "#10172d", paddingHorizontal: 10, paddingVertical: 8, gap: 2,
  },
  promoHistoryTitle: { color: "#9fb2e6", fontSize: 10, fontWeight: "900", letterSpacing: 0.8 },
  promoHistoryText: { color: "#f4f7ff", fontSize: 12, fontWeight: "900" },
  promoHistorySub: { color: "#c6d1f3", fontSize: 11, fontWeight: "700", marginTop: 2 },
  releaseNotesCard: {
    width: "100%",
    padding: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#FFD23F",
    backgroundColor: "#1c1b2f",
    gap: 8,
  },
  releaseNotesTitle: { color: "#FFF4A3", fontWeight: "900", fontSize: 14, letterSpacing: 1.4 },
  releaseNotesText: { color: "#f2f4ff", fontSize: 12, lineHeight: 18, fontWeight: "700" },
  releaseNotesBtn: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#FFD23F",
    borderRadius: 8,
    backgroundColor: "#2b2545",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  releaseNotesBtnText: { color: "#FFF4A3", fontWeight: "900", fontSize: 11, letterSpacing: 0.8 },
  footer: { color: "#444466", fontSize: 11, marginTop: 4, marginBottom: 8, letterSpacing: 1, textAlign: "center" },
});
