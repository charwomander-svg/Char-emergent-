import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";

import { COLORS } from "@/src/game/constants";
import { fetchNewsItems, type NewsItem } from "@/src/game/api";

const FALLBACK_NEWS_ITEMS: NewsItem[] = [
  {
    title: "Production polish update",
    date: "2026-07-26",
    body:
      "Added an interactive tutorial practice flow, leaderboard submission status messaging, and promo redemption history in Settings.",
  },
  {
    title: "QA fixes deployed",
    date: "2026-07-20",
    body:
      "Fixed total playtime/score tracking, aligned daily mission catches with lifetime catches, and added Android back confirmation for active runs.",
  },
  {
    title: "Promo system live",
    date: "2026-07-17",
    body:
      "Enabled backend promo support with built-in codes and daily redemption windows. DAILY100 now grants 100 coins once per day per player.",
  },
];

export default function NewsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<NewsItem[]>(FALLBACK_NEWS_ITEMS);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    fetchNewsItems()
      .then((rows) => {
        if (Array.isArray(rows) && rows.length > 0) {
          setItems(rows);
          const latestDate = rows
            .map((row) => row.date)
            .filter((value) => typeof value === "string" && value.trim().length > 0)
            .sort()
            .reverse()[0];
          setLastUpdated(latestDate ?? null);
        }
      })
      .catch(() => {
        // Keep local fallback news when backend is unavailable.
      });
  }, []);

  return (
    <SafeAreaView style={styles.container} testID="news-screen">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} testID="news-back-btn">
          <Text style={styles.backBtnText}>← BACK</Text>
        </TouchableOpacity>
        <View style={styles.headerCard}>
          <Text style={styles.title}>NEWS</Text>
          <Text style={styles.subtitle}>Latest updates and release notes</Text>
          {lastUpdated && <Text style={styles.lastUpdated}>Last updated: {lastUpdated}</Text>}
        </View>
        {items.map((item) => (
          <View key={`${item.date}-${item.title}`} style={styles.card}>
            <Text style={styles.cardDate}>{item.date}</Text>
            <Text style={styles.cardTitle} numberOfLines={1} ellipsizeMode="tail">{item.title}</Text>
            <Text style={styles.cardBody}>{item.body}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.uiBg },
  content: { padding: 16, gap: 10 },
  backBtn: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#4f5f93",
    borderRadius: 8,
    backgroundColor: "#101a33",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  backBtnText: { color: "#dce8ff", fontWeight: "800", letterSpacing: 1 },
  headerCard: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#67e8f9",
    backgroundColor: "#0f1a2d",
    padding: 12,
    gap: 4,
  },
  title: { color: "#FFFF00", fontSize: 22, fontWeight: "900", letterSpacing: 2.5 },
  subtitle: { color: "#b9d3ff", fontSize: 12, fontWeight: "700" },
  lastUpdated: { color: "#95a7da", fontSize: 10, fontWeight: "700", marginTop: 2 },
  card: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#445b8d",
    backgroundColor: "#121c36",
    padding: 12,
    gap: 5,
  },
  cardDate: { color: "#9fb2e6", fontWeight: "800", fontSize: 10, letterSpacing: 0.8 },
  cardTitle: { color: "#7fe8ff", fontWeight: "900", fontSize: 13, letterSpacing: 1.1 },
  cardBody: { color: "#edf3ff", fontSize: 12, lineHeight: 18 },
});
