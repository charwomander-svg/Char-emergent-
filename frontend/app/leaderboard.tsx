import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { COLORS } from "@/src/game/constants";
import { getSoundEngine } from "@/src/game/sounds";
import {
  fetchLeaderboardSummary,
  type LeaderboardSummary,
  type ScoreEntry,
} from "@/src/game/api";

type Tab = "classic" | "speedrun" | "timeattack";

export default function LeaderboardScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("classic");
  const [summary, setSummary] = useState<LeaderboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const data = await fetchLeaderboardSummary(tab);
      setSummary(data);
    } catch (e: any) {
      setErr(e.message || "Failed to load leaderboard");
      setSummary(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab]);

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

  const playSpeedrun = () => {
    getSoundEngine().uiClick();
    router.push("/speedrun");
  };

  const playTimeAttack = () => {
    getSoundEngine().uiClick();
    router.push("/game?mode=timeattack");
  };

  const formatRunMs = (ms?: number | null): string => {
    if (!ms || ms <= 0) return "—";
    const totalMs = Math.floor(ms);
    const totalSeconds = Math.floor(totalMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const millis = totalMs % 1000;
    return `${minutes}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
  };

  const aggregateTitle =
    tab === "classic"
      ? "TOP 5 SUM OF BEST SCORES"
      : tab === "speedrun"
        ? "TOP 5 SUM OF BEST TIMES"
        : "TOP 5 TIME ATTACK SCORES";

  const levelRows = useMemo(() => {
    const byLevel = new Map<number, ScoreEntry>();
    for (const row of summary?.level_bests ?? []) byLevel.set(row.level, row);
    if (tab === "speedrun") {
      return Array.from({ length: 50 }, (_, index) => {
        const level = index + 1;
        return { level, entry: byLevel.get(level) ?? null };
      });
    }
    if (tab === "timeattack") {
      return (summary?.level_bests ?? []).map((entry, index) => ({ level: index + 1, entry }));
    }
    return Array.from(byLevel.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([level, entry]) => ({ level, entry }));
  }, [summary, tab]);

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

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === "classic" && styles.tabActive]}
          onPress={() => switchTab("classic")}
          testID="tab-classic"
        >
          <Text
            style={[styles.tabText, tab === "classic" && styles.tabTextActive]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.9}
          >
            CLASSIC
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === "speedrun" && styles.tabActive]}
          onPress={() => switchTab("speedrun")}
          testID="tab-speedrun"
        >
          <Text
            style={[styles.tabText, tab === "speedrun" && styles.tabTextActive]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.9}
          >
            SPEEDRUN
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === "timeattack" && styles.tabActive]}
          onPress={() => switchTab("timeattack")}
          testID="tab-timeattack"
        >
          <Text
            style={[styles.tabText, tab === "timeattack" && styles.tabTextActive]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.9}
          >
            TIME ATTACK
          </Text>
        </TouchableOpacity>
      </View>

      {tab === "speedrun" && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>Best time for each of the 50 levels.</Text>
          <TouchableOpacity
            style={styles.playBtn}
            onPress={playSpeedrun}
            testID="play-speedrun-btn"
          >
            <Text style={styles.playBtnText}>▶ START SPEEDRUN</Text>
          </TouchableOpacity>
        </View>
      )}

      {tab === "timeattack" && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>3 minutes. Infinite respawns. Highest score wins.</Text>
          <TouchableOpacity
            style={styles.playBtn}
            onPress={playTimeAttack}
            testID="play-timeattack-btn"
          >
            <Text style={styles.playBtnText}>🔥 START TIME ATTACK</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#FFFF00" />
          <Text style={styles.loadingText}>Loading leaderboard…</Text>
        </View>
      ) : err ? (
        <View style={styles.loadingWrap}>
          <Text style={styles.errorText}>{err}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryBtnText}>RETRY</Text>
          </TouchableOpacity>
        </View>
      ) : !summary || (!summary.overall_best && summary.level_bests.length === 0) ? (
        <View style={styles.loadingWrap}>
          <Text style={styles.emptyText}>No scores yet. Be the first!</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#FFFF00"
            />
          }
        >
          {tab === "classic" && summary.overall_best && (
            <View style={styles.overallCard}>
              <Text style={styles.overallLabel}>OVERALL HIGH SCORE</Text>
              <Text style={styles.overallScore}>{summary.overall_best.score}</Text>
              <Text style={styles.overallMeta}>
                {summary.overall_best.player_name} · L{summary.overall_best.level} ·{" "}
                {summary.overall_best.catches} catches
              </Text>
            </View>
          )}

          {tab !== "timeattack" && <Text style={styles.sectionTitle}>{aggregateTitle}</Text>}
          {tab !== "timeattack" && (summary.aggregate_bests.length > 0 ? (
            summary.aggregate_bests.map((entry, index) => (
              <View
                key={entry.id}
                style={[styles.row, styles.aggregateRow]}
                testID={`leaderboard-aggregate-${index + 1}`}
              >
                <Text style={styles.rank}>#{index + 1}</Text>
                <View style={styles.rowMain}>
                  <Text style={styles.playerName}>{entry.player_name}</Text>
                  <Text style={styles.rowMeta}>
                    50/50 cleared · {entry.catches} catches
                  </Text>
                </View>
                <Text style={styles.scoreText}>
                  {tab === "classic" ? entry.score : formatRunMs(entry.run_time_ms)}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyAggregateCard}>
              <Text style={styles.rowMeta}>
                No full 50-level aggregate runs yet.
              </Text>
            </View>
          ))}

          <Text style={styles.sectionTitle}>
            {tab === "classic"
              ? "BEST SCORE BY LEVEL"
              : tab === "speedrun"
                ? "BEST SPEEDRUN TIME BY LEVEL"
                : "BEST TIME ATTACK RUNS"}
          </Text>

          {levelRows.map(({ level, entry }) => (
            <View key={level} style={styles.row} testID={`leaderboard-level-${level}`}>
              <Text style={styles.rank}>{tab === "timeattack" ? `#${level}` : `L${level}`}</Text>
              <View style={styles.rowMain}>
                {entry ? (
                  <>
                    <Text style={styles.playerName}>{entry.player_name}</Text>
                    <Text style={styles.rowMeta}>
                      {tab === "classic"
                        ? `${entry.catches} catches · ${entry.theme_id}`
                        : tab === "speedrun"
                          ? `score ${entry.score} · ${entry.theme_id}`
                          : `L${entry.level} · ${entry.catches} catches · ${entry.theme_id}`}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.playerNameDim}>—</Text>
                    <Text style={styles.rowMeta}>No run yet</Text>
                  </>
                )}
              </View>
              <Text style={styles.scoreText}>
                {tab === "speedrun" ? formatRunMs(entry?.run_time_ms) : entry?.score ?? "—"}
              </Text>
            </View>
          ))}
        </ScrollView>
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
  tabText: { color: "#888899", fontWeight: "bold", letterSpacing: 1.2, fontSize: 12 },
  tabTextActive: { color: "#FFFF00" },
  banner: {
    margin: 16,
    marginBottom: 6,
    padding: 12,
    borderRadius: 8,
    backgroundColor: COLORS.uiPanel,
    borderWidth: 1,
    borderColor: COLORS.uiBorder,
    alignItems: "center",
  },
  bannerText: { color: "#FFB897", fontSize: 12, letterSpacing: 1, marginBottom: 8 },
  playBtn: {
    backgroundColor: "#FFFF00",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 6,
  },
  playBtnText: { color: "#000", fontWeight: "900", letterSpacing: 2, fontSize: 13 },
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
  scroll: { padding: 12, paddingBottom: 30 },
  overallCard: {
    backgroundColor: "#16162b",
    borderColor: "#FFFF00",
    borderWidth: 2,
    borderRadius: 10,
    padding: 16,
    marginBottom: 14,
    alignItems: "center",
  },
  overallLabel: { color: "#FFB897", fontSize: 12, fontWeight: "900", letterSpacing: 2 },
  overallScore: {
    color: "#FFFF00",
    fontSize: 34,
    fontWeight: "900",
    marginTop: 6,
    fontVariant: ["tabular-nums"],
  },
  overallMeta: { color: "#FFFFFF", fontSize: 12, marginTop: 4, letterSpacing: 1 },
  sectionTitle: {
    color: "#FFB897",
    fontWeight: "900",
    letterSpacing: 2,
    fontSize: 13,
    marginBottom: 8,
    marginTop: 4,
  },
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
  aggregateRow: {
    borderColor: "#FFFF00",
    backgroundColor: "#16162b",
  },
  emptyAggregateCard: {
    backgroundColor: COLORS.uiPanel,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.uiBorder,
    paddingHorizontal: 12,
    paddingVertical: 14,
    marginBottom: 8,
  },
  rank: {
    color: "#FFFF00",
    fontWeight: "900",
    fontSize: 16,
    width: 52,
    textAlign: "center",
  },
  rowMain: { flex: 1, marginLeft: 8 },
  playerName: { color: "#FFFFFF", fontWeight: "bold", fontSize: 14, letterSpacing: 1 },
  playerNameDim: { color: "#666688", fontWeight: "bold", fontSize: 14, letterSpacing: 1 },
  rowMeta: { color: "#888899", fontSize: 11, marginTop: 2 },
  scoreText: {
    color: "#FFFF00",
    fontWeight: "900",
    fontSize: 18,
    fontVariant: ["tabular-nums"],
  },
});
