import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";

import { COLORS } from "@/src/game/constants";
import { showPlayGamesAchievements } from "@/src/game/playGames";

export default function AchievementsScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [autoLaunched, setAutoLaunched] = useState(false);

  const openAchievements = async () => {
    setIsLoading(true);
    setMessage("");
    try {
      const success = await showPlayGamesAchievements();
      if (!success) {
        setMessage("Google Play Games is not available or you're not signed in.");
      }
    } catch (error) {
      setMessage("Failed to open achievements. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!autoLaunched) {
      setAutoLaunched(true);
      openAchievements();
    }
  }, [autoLaunched]);

  return (
    <SafeAreaView style={styles.container} testID="achievements-screen">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} testID="back-btn">
          <Text style={styles.back}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🏆 ACHIEVEMENTS</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Google Play Games</Text>
          <Text style={styles.cardDesc}>
            View all your achievements and progress through Google Play Games.
          </Text>
          
          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={openAchievements}
            disabled={isLoading}
            testID="open-achievements-btn"
          >
            {isLoading ? (
              <ActivityIndicator color="#000000" />
            ) : (
              <Text style={styles.buttonText}>OPEN ACHIEVEMENTS</Text>
            )}
          </TouchableOpacity>

          {message ? (
            <View style={styles.messageBox}>
              <Text style={styles.messageText}>{message}</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.footnote}>
          Achievements are tracked through Google Play Games and require sign-in.
        </Text>
      </View>
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
  content: {
    flex: 1,
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.uiBorder,
    backgroundColor: COLORS.uiPanel,
    padding: 20,
    gap: 16,
  },
  cardTitle: {
    color: "#FFFF00",
    fontWeight: "900",
    fontSize: 18,
    letterSpacing: 1,
    textAlign: "center",
  },
  cardDesc: {
    color: "#b8c2eb",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#FFD23F",
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  buttonDisabled: {
    backgroundColor: "#6b7398",
  },
  buttonText: {
    color: "#000000",
    fontWeight: "900",
    fontSize: 16,
    letterSpacing: 1,
  },
  messageBox: {
    backgroundColor: "#1a2440",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#2a3556",
  },
  messageText: {
    color: "#d4ddff",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  footnote: {
    color: "#6b7398",
    fontSize: 12,
    textAlign: "center",
    fontStyle: "italic",
    maxWidth: 320,
  },
});

