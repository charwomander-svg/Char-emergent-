import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { COLORS } from "@/src/game/constants";
import {
  THEMES,
  ProgressData,
  loadProgress,
  saveProgress,
  Theme,
} from "@/src/game/progress";
import {
  syncPlayGames,
  syncProgressAchievements,
} from "@/src/game/playGames";
import { getSoundEngine } from "@/src/game/sounds";

export default function CharactersScreen() {
  const router = useRouter();
  const [progress, setProgress] = useState<ProgressData | null>(null);

  useEffect(() => {
    loadProgress().then((next) => {
      setProgress(next);
      void syncProgressAchievements(next);
      void syncPlayGames();
    });
  }, []);

  if (!progress) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loading}>LOADING…</Text>
      </SafeAreaView>
    );
  }

  const selectTheme = async (t: Theme) => {
    if (!t.unlockedAt(progress)) return;
    getSoundEngine().uiClick();
    const next = { ...progress, selectedThemeId: t.id };
    setProgress(next);
    await saveProgress(next);
  };

  return (
    <SafeAreaView style={styles.container} testID="characters-screen">
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
        <Text style={styles.title}>CHARACTERS</Text>
        <View style={{ width: 72 }} />
      </View>

      <View style={styles.stats}>
        <Text style={styles.statLine}>
          HIGH LEVEL: <Text style={styles.statVal}>{progress.highestLevel}</Text>
        </Text>
        <Text style={styles.statLine}>
          HIGH SCORE: <Text style={styles.statVal}>{progress.highScore}</Text>
        </Text>
        <Text style={styles.statLine}>
          TOTAL CATCHES: <Text style={styles.statVal}>{progress.totalCatches}</Text>
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {THEMES.map((t) => {
          const unlocked = t.unlockedAt(progress);
          const selected = progress.selectedThemeId === t.id;
          return (
            <TouchableOpacity
              key={t.id}
              onPress={() => selectTheme(t)}
              style={[
                styles.card,
                selected && styles.cardSelected,
                !unlocked && styles.cardLocked,
              ]}
              testID={`theme-${t.id}`}
              disabled={!unlocked}
            >
              <View style={styles.cardRow}>
                <Text style={styles.cardName}>
                  {unlocked ? t.name : t.hidden ? "???" : t.name}
                </Text>
                {selected && <Text style={styles.selectedTag}>SELECTED</Text>}
                {!unlocked && <Text style={styles.lockedTag}>🔒 LOCKED</Text>}
              </View>
              <View style={styles.preview}>
                {t.ghostColors.map((c, i) => (
                  <View
                    key={i}
                    style={[
                      styles.ghostPreview,
                      {
                        backgroundColor: unlocked ? c : "#222244",
                        opacity: unlocked ? 1 : 0.5,
                      },
                    ]}
                  >
                    <View style={styles.ghostEye} />
                    <View style={[styles.ghostEye, { right: 4, left: undefined }]} />
                  </View>
                ))}
                <View
                  style={[
                    styles.pgPreview,
                    {
                      backgroundColor: unlocked ? t.pelletGuyColor : "#444",
                      opacity: unlocked ? 1 : 0.5,
                    },
                  ]}
                />
              </View>
              <Text style={styles.unlockText}>
                {unlocked ? "✓ Unlocked" : `🔒 ${t.unlockHint}`}
              </Text>
            </TouchableOpacity>
          );
        })}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
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
  backBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.uiBorder,
  },
  backBtnText: { color: "#FFFF00", fontWeight: "bold", letterSpacing: 1 },
  stats: {
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: COLORS.uiPanel,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.uiBorder,
  },
  statLine: { color: "#FFFFFF", fontSize: 13, lineHeight: 22, letterSpacing: 0.5 },
  statVal: { color: "#FFFF00", fontWeight: "bold" },
  scroll: { padding: 16 },
  card: {
    backgroundColor: COLORS.uiPanel,
    borderWidth: 2,
    borderColor: COLORS.uiBorder,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  cardSelected: {
    borderColor: "#FFFF00",
    backgroundColor: "#1a1a2e",
  },
  cardLocked: {
    opacity: 0.55,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  cardName: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold", letterSpacing: 1 },
  selectedTag: {
    color: "#000",
    backgroundColor: "#FFFF00",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: "bold",
    fontSize: 10,
  },
  lockedTag: {
    color: "#FFB897",
    fontWeight: "bold",
    fontSize: 11,
  },
  preview: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 8,
  },
  ghostPreview: {
    width: 38,
    height: 38,
    borderTopLeftRadius: 19,
    borderTopRightRadius: 19,
    position: "relative",
  },
  ghostEye: {
    position: "absolute",
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: "#FFFFFF",
    top: 10,
    left: 4,
  },
  pgPreview: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  unlockText: {
    color: "#FFB897",
    fontSize: 11,
    marginTop: 6,
    letterSpacing: 0.5,
  },
});
