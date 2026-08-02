import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { fetchNewsItems, type NewsItem } from "@/src/game/api";

export default function NewsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<NewsItem[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "offline">("loading");

  useEffect(() => {
    let mounted = true;
    fetchNewsItems()
      .then((next) => {
        if (!mounted) return;
        setItems(next);
        setStatus("ready");
      })
      .catch(() => {
        if (!mounted) return;
        setStatus("offline");
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <SafeAreaView style={styles.container} testID="news-screen">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} testID="back-btn">
          <Text style={styles.back}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.title}>NEWS</Text>
        <View style={{ width: 60 }} />
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        {status === "loading" ? <Text style={styles.status}>Loading arcade updates...</Text> : null}
        {status === "offline" ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>News unavailable</Text>
            <Text style={styles.cardBody}>Check your connection and try again from the main menu.</Text>
          </View>
        ) : null}
        {items.map((item) => (
          <View key={`${item.date}-${item.title}`} style={styles.card}>
            <Text style={styles.cardDate}>{item.date}</Text>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardBody}>{item.body}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#060616" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#23234a",
  },
  back: { color: "#7FE8FF", fontWeight: "900", fontSize: 16 },
  title: { color: "#FFD23F", fontWeight: "900", fontSize: 24, letterSpacing: 2 },
  body: { padding: 18, paddingBottom: 40, gap: 14 },
  status: { color: "#C9D4FF", textAlign: "center", fontWeight: "700" },
  card: {
    backgroundColor: "#111128",
    borderColor: "#34346b",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  cardDate: { color: "#7FE8FF", fontSize: 12, fontWeight: "900", marginBottom: 8 },
  cardTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "900", marginBottom: 8 },
  cardBody: { color: "#D8DEFF", fontSize: 15, lineHeight: 22 },
});
