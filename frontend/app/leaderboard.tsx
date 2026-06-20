import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { COLORS } from "@/src/game/constants";
import { getSoundEngine } from "@/src/game/sounds";
import { fetchLeaderboard, fetchDailySeed, ScoreEntry } from "@/src/game/api";

type Tab = "classic" | "daily";

export default function LeaderboardScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("classic");
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dailySeed, setDailySeed] = useState<{ date: string; seed: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      if (tab === "daily" && !dailySeed) {
        const seed = await fetchDailySeed();
        setDailySeed({ date: seed.seed_date, seed: seed.seed });
      }
      const data = await fetchLeaderboard(tab, { limit: 50 });
      setScores(data);
    } catch (e: any) {
      setErr(e.message || "Failed to load leaderboard");
      setScores([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab, dailySeed]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const switchTab = (next: Tab) => {
    if (next === tab) return;
    getSoundEngine().uiClick();
    setTab(next);
    setLoading(true);
  };

  const playDailyChallenge = async () => {
    getSoundEngine().uiClick();
    try {
      const seed = dailySeed ?? (await fetchDailySeed().then((s) => ({ date: s.seed_date, seed: s.seed })));
      router.push(`/game?mode=daily&seed=${seed!.seed}&seedDate=${seed!.date}`);
    } catch (e) {
      setErr("Failed to fetch daily seed");
    }
  };

  return (
    <SafeAreaView style={styles.container} testID="leaderboard-screen">
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
        <Text style={styles.title}>LEADERBOARD</Text>
        <View style={{ width: 72 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === "classic" && styles.tabActive]}
          onPress={() => switchTab("classic")}
          testID="tab-classic"
        >
          <Text style={[styles.tabText, tab === "classic" && styles.tabTextActive]}>
            CLASSIC
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === "daily" && styles.tabActive]}
          onPress={() => switchTab("daily")}
          testID="tab-daily"
        >
          <Text style={[styles.tabText, tab === "daily" && styles.tabTextActive]}>
            DAILY
          </Text>
        </TouchableOpacity>
      </View>

      {tab === "daily" && (
        <View style={styles.dailyHeader}>
          <Text style={styles.dailyDate}>
            {dailySeed?.date ?? "—"} · seed #{dailySeed?.seed ?? "—"}
          </Text>
          <TouchableOpacity
            style={styles.playDailyBtn}
            onPress={playDailyChallenge}
            testID="play-daily-btn"
          >
            <Text style={styles.playDailyText}>▶ PLAY TODAY&apos;S MAZE</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#FFFF00" />
          <Text style={styles.loadingText}>Loading scores…</Text>
        </View>
      ) : err ? (
        <View style={styles.loadingWrap}>
          <Text style={styles.errorText}>{err}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryBtnText}>RETRY</Text>
          </TouchableOpacity>
        </View>
      ) : scores.length === 0 ? (
        <View style={styles.loadingWrap}>
          <Text style={styles.emptyText}>
            {tab === "daily"
              ? "No scores yet for today.\nPlay the daily maze to claim #1!"
              : "No scores yet. Be the first!"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={scores}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#FFFF00"
            />
          }
          renderItem={({ item, index }) => (
            <View
              style={[styles.row, index < 3 && styles.rowTop]}
              testID={`score-row-${index}`}
            >
              <Text style={styles.rank}>
                {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
              </Text>
              <View style={styles.rowMain}>
                <Text style={styles.playerName}>{item.player_name}</Text>
                <Text style={styles.rowMeta}>
                  L{item.level} · {item.catches} catches · {item.theme_id}
                </Text>
              </View>
              <Text style={styles.scoreText}>{item.score}</Text>
            </View>
          )}
        />
      )}
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
  title: { color: "#FFFF00", fontSize: 20, fontWeight: "900", letterSpacing: 3 },
  backBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.uiBorder,
  },
  backBtnText: { color: "#FFFF00", fontWeight: "bold", letterSpacing: 1 },
  tabs: { flexDirection: "row", paddingHorizontal: 16, paddingTop: 12 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: COLORS.uiBorder,
    backgroundColor: COLORS.uiPanel,
    alignItems: "center",
    marginHorizontal: 4,
    borderRadius: 8,
  },
  tabActive: { backgroundColor: "#1a1a2e", borderColor: "#FFFF00" },
  tabText: { color: "#888899", fontWeight: "bold", letterSpacing: 2 },
  tabTextActive: { color: "#FFFF00" },
  dailyHeader: {
    margin: 16,
    marginBottom: 4,
    padding: 12,
    borderRadius: 8,
    backgroundColor: COLORS.uiPanel,
    borderWidth: 1,
    borderColor: COLORS.uiBorder,
    alignItems: "center",
  },
  dailyDate: { color: "#FFB897", fontSize: 12, letterSpacing: 1, marginBottom: 8 },
  playDailyBtn: {
    backgroundColor: "#FFFF00",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 6,
  },
  playDailyText: { color: "#000", fontWeight: "900", letterSpacing: 2, fontSize: 13 },
  loadingWrap: { padding: 32, alignItems: "center", flex: 1, justifyContent: "center" },
  loadingText: { color: "#FFB897", marginTop: 8, letterSpacing: 1 },
  emptyText: { color: "#888899", textAlign: "center", lineHeight: 22, letterSpacing: 1 },
  errorText: { color: COLORS.danger, marginBottom: 8, textAlign: "center" },
  retryBtn: {
    backgroundColor: COLORS.uiPanel,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.uiBorder,
  },
  retryBtnText: { color: "#FFFF00", fontWeight: "bold", letterSpacing: 1 },
  list: { padding: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.uiPanel,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: COLORS.uiBorder,
  },
  rowTop: { borderColor: "#FFFF00" },
  rank: {
    color: "#FFFF00",
    fontWeight: "900",
    fontSize: 16,
    width: 44,
    textAlign: "center",
  },
  rowMain: { flex: 1, marginLeft: 8 },
  playerName: { color: "#FFFFFF", fontWeight: "bold", fontSize: 14, letterSpacing: 1 },
  rowMeta: { color: "#888899", fontSize: 11, marginTop: 2 },
  scoreText: {
    color: "#FFFF00",
    fontWeight: "900",
    fontSize: 18,
    fontVariant: ["tabular-nums"],
  },
});
