import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { clearAdminKey, loadSettings } from "./src/storage";
import { colors } from "./src/theme";
import type { CompanionSettings } from "./src/types";
import { NewsScreen } from "./src/screens/NewsScreen";
import { PromosScreen } from "./src/screens/PromosScreen";
import { UnlockScreen } from "./src/screens/UnlockScreen";

type Tab = "news" | "mail";

export default function App() {
  const [booting, setBooting] = useState(true);
  const [settings, setSettings] = useState<CompanionSettings | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [tab, setTab] = useState<Tab>("news");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const loaded = await loadSettings();
        if (!cancelled) {
          setSettings(loaded);
          setUnlocked(false);
        }
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const lock = async () => {
    await clearAdminKey();
    setSettings((prev) => (prev ? { ...prev, adminKey: "" } : prev));
    setUnlocked(false);
    setTab("news");
  };

  if (booting || !settings) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.accent} size="large" />
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <StatusBar style="light" />
        {!unlocked ? (
          <UnlockScreen
            initial={settings}
            onUnlocked={(next) => {
              setSettings(next);
              setUnlocked(true);
            }}
          />
        ) : (
          <View style={styles.flex}>
            <View style={styles.header}>
              <View style={styles.flex}>
                <Text style={styles.headerTitle}>Ghost Maze Companion</Text>
                <Text style={styles.headerSub} numberOfLines={1}>
                  {settings.apiBase}
                </Text>
              </View>
              <Pressable onPress={lock} style={styles.lockBtn}>
                <Text style={styles.lockText}>Lock</Text>
              </Pressable>
            </View>

            <View style={styles.tabs}>
              <Pressable
                onPress={() => setTab("news")}
                style={[styles.tab, tab === "news" && styles.tabActive]}
              >
                <Text style={[styles.tabText, tab === "news" && styles.tabTextActive]}>News</Text>
              </Pressable>
              <Pressable
                onPress={() => setTab("mail")}
                style={[styles.tab, tab === "mail" && styles.tabActive]}
              >
                <Text style={[styles.tabText, tab === "mail" && styles.tabTextActive]}>
                  Promo / Mail
                </Text>
              </Pressable>
            </View>

            {tab === "news" ? (
              <NewsScreen settings={settings} />
            ) : (
              <PromosScreen settings={settings} />
            )}
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  headerSub: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  lockBtn: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  lockText: {
    color: colors.text,
    fontWeight: "700",
  },
  tabs: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tab: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: "transparent",
  },
  tabActive: {
    borderColor: colors.accent,
    backgroundColor: "rgba(124,140,255,0.18)",
  },
  tabText: {
    color: colors.muted,
    fontWeight: "700",
  },
  tabTextActive: {
    color: colors.text,
  },
});
