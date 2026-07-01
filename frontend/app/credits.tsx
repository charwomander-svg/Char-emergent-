import React, { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { COLORS } from "@/src/game/constants";
import { getSoundEngine } from "@/src/game/sounds";
import { loadProgress, saveProgress } from "@/src/game/progress";
import { MAX_LEVELS } from "@/src/game/constants";

const CHEAT_TAPS = 5;

const CREDITS = [
  { role: "Game Design", name: "Chardcore" },
  { role: "Programming", name: "Chardcore" },
  { role: "Art & Visual Design", name: "Chardcore" },
  { role: "Sound Design", name: "Chardcore" },
  { role: "Level Design", name: "Chardcore" },
  { role: "QA & Playtesting", name: "Chardcore" },
  { role: "Producer", name: "Chardcore" },
  { role: "Published by", name: "Charware Game Development Studio" },
];

export default function Credits() {
  const router = useRouter();
  const tapCount = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cheatActivated, setCheatActivated] = useState(false);

  const handleDevNameTap = useCallback(async () => {
    if (cheatActivated) return;

    tapCount.current += 1;

    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => {
      tapCount.current = 0;
    }, 3000);

    if (tapCount.current >= CHEAT_TAPS) {
      tapCount.current = 0;
      if (tapTimer.current) clearTimeout(tapTimer.current);

      const progress = await loadProgress();
      if (progress.highestLevel >= MAX_LEVELS) {
        Alert.alert("👻 Already Unlocked", "All levels are already accessible.");
        return;
      }
      const updated = { ...progress, highestLevel: MAX_LEVELS };
      await saveProgress(updated);
      setCheatActivated(true);
      getSoundEngine().levelWin?.();
      Alert.alert("👻 Cheat Activated", "All 50 levels are now unlocked!");
    }
  }, [cheatActivated]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>CREDITS</Text>
        <Text style={styles.subtitle}>Ghost Maze</Text>

        <View style={styles.divider} />

        {CREDITS.map(({ role, name }, i) => (
          <View key={i} style={styles.creditRow}>
            <Text style={styles.role}>{role}</Text>
            {i === 0 ? (
              // Developer credit — tap 5× for cheat
              <TouchableOpacity onPress={handleDevNameTap} activeOpacity={0.7}>
                <Text style={[styles.name, cheatActivated && styles.nameUnlocked]}>
                  {name}{cheatActivated ? " 👻" : ""}
                </Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.name}>{name}</Text>
            )}
          </View>
        ))}

        <View style={styles.divider} />

        <Text style={styles.thankYou}>Thank you for playing.</Text>
        <Text style={styles.madeWith}>Made with ❤️ and lots of ghost energy.</Text>

        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            getSoundEngine().uiClick();
            router.back();
          }}
        >
          <Text style={styles.backBtnText}>← BACK</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.uiBg,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  title: {
    fontSize: 40,
    fontWeight: "900",
    color: "#00FFFF",
    letterSpacing: 6,
    textShadowColor: "#00FFFF",
    textShadowRadius: 12,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF88",
    letterSpacing: 3,
    marginTop: 4,
    marginBottom: 8,
  },
  divider: {
    width: "60%",
    height: 1,
    backgroundColor: "#FFFFFF22",
    marginVertical: 24,
  },
  creditRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#FFFFFF11",
  },
  role: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF66",
    letterSpacing: 1,
    textTransform: "uppercase",
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 1,
    textAlign: "right",
  },
  nameUnlocked: {
    color: "#00FFCC",
    textShadowColor: "#00FFCC",
    textShadowRadius: 8,
  },
  thankYou: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF88",
    marginTop: 8,
  },
  madeWith: {
    fontSize: 12,
    color: "#FFFFFF44",
    marginTop: 6,
    marginBottom: 32,
  },
  backBtn: {
    borderWidth: 1,
    borderColor: "#FFFFFF44",
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  backBtnText: {
    color: "#FFFFFF88",
    fontWeight: "700",
    letterSpacing: 2,
    fontSize: 13,
  },
});
