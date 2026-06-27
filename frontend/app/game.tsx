import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  PanResponder,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";

import { useGhostMaze } from "@/src/game/useGhostMaze";
import MazeRenderer from "@/src/game/MazeRenderer";
import { MAZE_COLS, MAZE_ROWS } from "@/src/game/constants";
import type { Direction, GhostId } from "@/src/game/types";
import { useGamepad } from "@/src/game/useGamepad";
import { useEconomy } from "@/src/game/useEconomy";
import { POWER_UP_ORDER, POWER_UPS, type PowerUpId } from "@/src/game/powerups";
import { loadSpeedrunData, saveBestRunMs } from "@/src/game/speedrun";
import { getPelletDifficultyProfile } from "@/src/game/ai";

const GHOST_NAMES = ["Blinky", "Pinky", "Inky", "Clyde"] as const;
const GHOST_IDS = [0, 1, 2, 3] as GhostId[];

function fmtMs(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function GameScreen() {
  const params = useLocalSearchParams<{
    mode?: string;
    seed?: string;
    seedDate?: string;
    level?: string;
  }>();
  const mode = params.mode === "daily" || params.mode === "custom" || params.mode === "speedrun"
    ? params.mode
    : "classic";
  const seed = params.seed != null ? Number(params.seed) : undefined;
  const startLevel = params.level != null ? Number(params.level) : undefined;
  const { earnCoins, inventory, useInventory: consumeInventory } = useEconomy();
  const {
    state,
    setGhostDirection,
    selectGhost,
    togglePause,
    advanceLevel,
    retryLevel,
    startNewGame,
    submitFinalScore,
    applyPowerUp,
  } = useGhostMaze({
    mode,
    dailySeed: Number.isFinite(seed) ? seed : undefined,
    dailySeedDate: params.seedDate ?? undefined,
    startingLevel: Number.isFinite(startLevel) ? Math.max(1, Math.floor(startLevel!)) : 1,
    onCoinsEarned: (n) => earnCoins(n),
  });
  const { width, height } = useWindowDimensions();
  const cellSize = Math.max(
    12,
    Math.floor(Math.min(width / MAZE_COLS, (height - 420) / MAZE_ROWS)),
  );
  const [armedGhosts, setArmedGhosts] = useState<GhostId[]>([0]);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [bestRunMs, setBestRunMs] = useState(0);
  const timerAccumulatedRef = useRef(0);
  const timerRunningFromRef = useRef<number | null>(null);
  const submittedSpeedrunRef = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    loadSpeedrunData().then((d) => setBestRunMs(d.bestRunMs));
  }, []);

  const computeTimerMs = useCallback(() => {
    if (timerRunningFromRef.current == null) return timerAccumulatedRef.current;
    return timerAccumulatedRef.current + (performance.now() - timerRunningFromRef.current);
  }, []);

  useEffect(() => {
    if (mode !== "speedrun") return;
    if (state.status === "playing" && timerRunningFromRef.current == null) {
      timerRunningFromRef.current = performance.now();
    }
    if (state.status !== "playing" && timerRunningFromRef.current != null) {
      timerAccumulatedRef.current += performance.now() - timerRunningFromRef.current;
      timerRunningFromRef.current = null;
    }
    if (state.status === "gameOver" && !submittedSpeedrunRef.current) {
      submittedSpeedrunRef.current = true;
      const finalMs = computeTimerMs();
      setElapsedMs(finalMs);
      saveBestRunMs(finalMs).then(setBestRunMs);
      submitFinalScore("SPEEDRUN", finalMs).catch(() => {});
    }
  }, [mode, state.status, computeTimerMs, submitFinalScore]);

  useEffect(() => {
    if (mode !== "speedrun") return;
    const id = setInterval(() => setElapsedMs(computeTimerMs()), 200);
    return () => clearInterval(id);
  }, [mode, computeTimerMs]);

  useEffect(() => {
    if (state.status === "ready" && state.level === 1 && state.score === 0) {
      timerAccumulatedRef.current = 0;
      timerRunningFromRef.current = null;
      setElapsedMs(0);
      submittedSpeedrunRef.current = false;
    }
  }, [state.status, state.level, state.score]);

  const syncSelection = useCallback((next: GhostId[]) => {
    if (next.length > 0) selectGhost(next[0]);
    setArmedGhosts(next);
  }, [selectGhost]);

  const toggleGhost = useCallback((id: GhostId) => {
    setArmedGhosts((prev) => {
      const next = prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id];
      if (next.length > 0) selectGhost(next[0]);
      return next;
    });
  }, [selectGhost]);

  const applyDirectionToArmed = useCallback((dir: Direction) => {
    const targets = armedGhosts.length > 0 ? armedGhosts : [stateRef.current.selectedGhostId];
    targets.forEach((id) => setGhostDirection(id, dir));
  }, [armedGhosts, setGhostDirection]);

  useGamepad({
    onDirection: (_id, dir) => {
      applyDirectionToArmed(dir);
    },
    onSelect: (id) => {
      syncSelection([id]);
    },
    getSelectedGhostId: () => stateRef.current.selectedGhostId,
  });

  const SWIPE_THRESHOLD = 25;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 5 || Math.abs(g.dy) > 5,
      onPanResponderRelease: (_, g) => {
        const dx = g.dx;
        const dy = g.dy;
        if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) return;
        const dir: Direction =
          Math.abs(dx) > Math.abs(dy)
            ? dx > 0 ? "right" : "left"
            : dy > 0 ? "down" : "up";
        try {
          Haptics.selectionAsync();
        } catch {}
        applyDirectionToArmed(dir);
      },
    })
  ).current;

  const activeEffects = useMemo(() => {
    const now = performance.now();
    const list: string[] = [];
    if (state.effects.speedBoostUntil > now) list.push(`Speed ${Math.ceil((state.effects.speedBoostUntil - now) / 1000)}s`);
    if (state.effects.freezeUntil > now) list.push(`Freeze ${Math.ceil((state.effects.freezeUntil - now) / 1000)}s`);
    if (state.effects.magnetUntil > now) list.push(`Magnet ${Math.ceil((state.effects.magnetUntil - now) / 1000)}s`);
    if (state.effects.revealUntil > now) list.push(`Reveal ${Math.ceil((state.effects.revealUntil - now) / 1000)}s`);
    if (state.effects.shieldGhostId != null) list.push(`Shield G${state.effects.shieldGhostId + 1}`);
    if (state.effects.fastRespawn) list.push("Fast Respawn");
    return list;
  }, [state.effects]);
  const aiProfile = useMemo(() => getPelletDifficultyProfile(state.level), [state.level]);
  const inventoryItems = useMemo(
    () => POWER_UP_ORDER.map((id) => ({
      id,
      def: POWER_UPS[id],
      count: inventory[id] ?? 0,
    })),
    [inventory],
  );
  const lifeDots = useMemo(
    () => Array.from({ length: 3 }, (_, index) => index < state.lives),
    [state.lives],
  );
  const statusLabel = state.status === "playing"
    ? "LIVE"
    : state.status === "paused"
      ? "PAUSED"
      : state.status === "ready"
        ? "READY"
        : state.status === "levelWon"
          ? "CLEAR"
          : state.status === "levelLost"
            ? "LOST"
            : "GAME OVER";

  const activatePowerUp = useCallback((id: PowerUpId) => {
    const applied = applyPowerUp(id);
    if (!applied) return;
    consumeInventory(id);
  }, [applyPowerUp, consumeInventory]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hudShell} testID="hud-top">
        <View style={styles.heroCard}>
          <Text style={styles.heroKicker}>{mode.toUpperCase()}</Text>
          <Text style={styles.heroTitle}>LEVEL {state.level}</Text>
          <View style={styles.heroMeta}>
            <View style={styles.modePill}>
              <Text style={styles.pillLabel}>MODE</Text>
              <Text style={styles.pillValue}>{mode.toUpperCase()}</Text>
            </View>
            <View style={styles.statusPill}>
              <Text style={styles.pillLabel}>STATUS</Text>
              <Text style={styles.pillValue}>{statusLabel}</Text>
            </View>
          </View>
        </View>
        <View style={styles.statGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>LIVES</Text>
            <View style={styles.lifeDots}>
              {lifeDots.map((filled, index) => (
                <View
                  key={index}
                  style={[
                    styles.lifeDot,
                    filled ? styles.lifeDotFilled : styles.lifeDotEmpty,
                  ]}
                />
              ))}
            </View>
            <Text style={styles.statFootnote}>x{state.lives}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>SCORE</Text>
            <Text style={[styles.statValue, { color: "#ffe26b" }]}>{state.score}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>COMBO</Text>
            <Text style={[styles.statValue, { color: "#52c7ff" }]}>x{Math.max(1, state.comboCount)}</Text>
          </View>
        </View>
      </View>
      <View style={styles.metricPanel} testID="hud-mid">
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>PELLETS</Text>
          <Text style={styles.metricValue}>{state.pelletsRemaining} / {state.totalPellets}</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>CATCHES</Text>
          <Text style={styles.metricValue}>{state.catches}</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>AI INTRO</Text>
          <Text style={[styles.metricValue, { color: "#bf6bff" }]}>{aiProfile.tier.toUpperCase()}</Text>
        </View>
        {mode === "speedrun" && (
          <>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>TIME</Text>
              <Text style={styles.metricValue}>{fmtMs(elapsedMs)}</Text>
            </View>
            {bestRunMs > 0 && (
              <>
                <View style={styles.metricDivider} />
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>BEST</Text>
                  <Text style={styles.metricValue}>{fmtMs(bestRunMs)}</Text>
                </View>
              </>
            )}
          </>
        )}
      </View>
      {state.boss && (
        <View style={styles.bossWrap} testID="boss-hud">
          <Text style={styles.bossText}>BOSS {state.boss.title}</Text>
          <View style={styles.bossBarOuter}>
            <View style={[styles.bossBarInner, { width: `${(state.boss.hp / state.boss.maxHp) * 100}%` }]} />
          </View>
          <Text style={styles.bossText}>HP {state.boss.hp}/{state.boss.maxHp}</Text>
        </View>
      )}
      <View style={styles.hudSection} testID="hud-effects">
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>ACTIVE</Text>
          <Text style={styles.sectionNote}>{activeEffects.length ? "buffs live" : "empty slots"}</Text>
        </View>
        <View style={styles.activeBox}>
          {activeEffects.length ? (
            activeEffects.map((effect) => (
              <View key={effect} style={styles.activeChip}>
                <Text style={styles.activeChipText}>{effect}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyStateText}>(empty slots)</Text>
          )}
        </View>
      </View>
      <View style={styles.hudSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>INVENTORY</Text>
          <Text style={styles.sectionNote}>tap to use</Text>
        </View>
        <View style={styles.inventoryRow}>
          {inventoryItems.map(({ id, def, count }) => {
            const playable = state.status === "playing" && count > 0;
            return (
              <TouchableOpacity
                key={id}
                onPress={() => activatePowerUp(id)}
                style={[
                  styles.inventoryTile,
                  { borderColor: def.color },
                  count === 0 && styles.inventoryTileDim,
                ]}
                disabled={!playable}
                testID={`inventory-${id}`}
              >
                <Text style={styles.inventoryIcon}>{def.icon}</Text>
                <Text style={[styles.inventoryCount, { color: count > 0 ? def.color : "#7d88a8" }]}>
                  {count}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.ghostStrip}>
        <View style={styles.ghostStripHeader}>
          <Text style={styles.sectionTitle}>SELECT</Text>
          <Text style={styles.sectionNote}>ghost control</Text>
        </View>
        <View style={styles.ghostStripButtons}>
          {GHOST_IDS.map((id) => {
            const active = armedGhosts.includes(id);
            return (
              <TouchableOpacity
                key={id}
                onPress={() => toggleGhost(id)}
                onLongPress={() => syncSelection([id])}
                style={[styles.ghostTab, active && styles.ghostTabActive]}
                testID={`ghost-arm-${id}`}
              >
                <Text style={styles.ghostTabText}>{active ? "● " : "○ "}{GHOST_NAMES[id]}</Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            onPress={() => syncSelection([0, 1, 2, 3])}
            style={styles.ghostAction}
            testID="ghost-arm-all"
          >
            <Text style={styles.ghostActionText}>ALL</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => syncSelection([state.selectedGhostId])}
            style={styles.ghostAction}
            testID="ghost-reset"
          >
            <Text style={styles.ghostActionText}>RESET</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.gameArea} {...panResponder.panHandlers}>
        <MazeRenderer
          maze={state.maze}
          ghosts={state.ghosts}
          pelletGuy={state.pelletGuy}
          cellSize={cellSize}
          selectedGhostId={state.selectedGhostId}
          ready={state.status === "ready"}
          level={state.level}
          boss={state.boss}
        />
      </View>

      <View style={styles.bottomBar}>
        <TouchableOpacity onPress={togglePause} style={styles.pauseBtn} testID="pause-btn">
          <Text style={styles.pauseText}>{state.status === "paused" ? "RESUME" : "PAUSE"}</Text>
        </TouchableOpacity>
        {(state.status === "levelWon" || state.status === "levelLost" || state.status === "gameOver") && (
          <View style={styles.stateActions}>
            {state.status === "levelWon" && (
              <TouchableOpacity onPress={advanceLevel} style={styles.stateBtn} testID="next-level-btn">
                <Text style={styles.stateBtnText}>NEXT LEVEL</Text>
              </TouchableOpacity>
            )}
            {state.status === "levelLost" && (
              <TouchableOpacity onPress={retryLevel} style={styles.stateBtn} testID="retry-level-btn">
                <Text style={styles.stateBtnText}>RETRY LEVEL</Text>
              </TouchableOpacity>
            )}
            {state.status === "gameOver" && (
              <TouchableOpacity onPress={startNewGame} style={styles.stateBtn} testID="new-game-btn">
                <Text style={styles.stateBtnText}>NEW GAME</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {(state.message || state.status === "paused") && (
        <View style={styles.messageOverlay} pointerEvents="none" testID="status-message">
          <Text style={styles.messageText}>{state.status === "paused" ? "PAUSED" : state.message}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a12" },
  hudShell: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: "#0b0e1f",
  },
  heroCard: {
    flex: 1.2,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: "#111738",
    borderWidth: 1,
    borderColor: "#2bb7ff",
    shadowColor: "#2bb7ff",
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  heroKicker: { color: "#ffd84d", fontSize: 14, fontWeight: "900", letterSpacing: 2 },
  heroTitle: { color: "#f2f6ff", fontSize: 30, fontWeight: "900", letterSpacing: 1, marginTop: 2 },
  heroMeta: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    flexWrap: "wrap",
  },
  modePill: {
    flex: 1,
    minWidth: 88,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#255b91",
    backgroundColor: "#0a1730",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  statusPill: {
    flex: 1,
    minWidth: 88,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#3a2a75",
    backgroundColor: "#120d25",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  pillLabel: { color: "#95a9d7", fontSize: 9, fontWeight: "900", letterSpacing: 1.2 },
  pillValue: { color: "#f7fbff", fontSize: 13, fontWeight: "900", marginTop: 2 },
  statGrid: { flex: 1.6, flexDirection: "row", gap: 8 },
  statCard: {
    flex: 1,
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 12,
    backgroundColor: "#12192f",
    borderWidth: 1,
    borderColor: "#22406f",
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: { color: "#d8e0f7", fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  statValue: { fontSize: 26, fontWeight: "900", marginTop: 4 },
  statFootnote: { color: "#ff8ea9", fontSize: 11, fontWeight: "900", marginTop: 4, letterSpacing: 1 },
  lifeDots: { flexDirection: "row", gap: 5, marginTop: 8, alignItems: "center" },
  lifeDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#ff6b9a",
  },
  lifeDotFilled: { backgroundColor: "#ff6b9a" },
  lifeDotEmpty: { backgroundColor: "transparent" },
  metricPanel: {
    marginHorizontal: 10,
    marginBottom: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#4d2f88",
    backgroundColor: "#151225",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexWrap: "wrap",
  },
  metricItem: { minWidth: 80 },
  metricLabel: { color: "#a8b3d6", fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  metricValue: { color: "#f8fbff", fontSize: 17, fontWeight: "900", marginTop: 2 },
  metricDivider: { width: 1, height: 36, backgroundColor: "#30406e", marginHorizontal: 10 },
  hudSection: {
    marginHorizontal: 10,
    marginBottom: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#22406f",
    backgroundColor: "#0f1428",
    padding: 12,
  },
  sectionHeader: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  sectionTitle: { color: "#39a6ff", fontSize: 14, fontWeight: "900", letterSpacing: 2 },
  sectionNote: { color: "#a3b4d6", fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  activeBox: {
    minHeight: 50,
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#24345e",
    backgroundColor: "#08111e",
    padding: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
  },
  activeChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#7f59ff",
    backgroundColor: "#1a1234",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  activeChipText: { color: "#d8c8ff", fontSize: 11, fontWeight: "800" },
  emptyStateText: { color: "#7d88a8", fontSize: 12, fontWeight: "700" },
  inventoryRow: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#24345e",
    backgroundColor: "#08111e",
    padding: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    alignItems: "center",
  },
  inventoryTile: {
    minWidth: 56,
    minHeight: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    backgroundColor: "#12172d",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  inventoryTileDim: { opacity: 0.45 },
  inventoryIcon: { fontSize: 20 },
  inventoryCount: { fontSize: 12, fontWeight: "900", marginTop: 4 },
  bossWrap: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#240b15",
    borderTopWidth: 1,
    borderTopColor: "#80334d",
    borderBottomWidth: 1,
    borderBottomColor: "#80334d",
  },
  bossText: { color: "#ffd2dc", fontWeight: "900", letterSpacing: 1, fontSize: 11 },
  bossBarOuter: { marginTop: 5, marginBottom: 4, height: 8, backgroundColor: "#3b0d19", borderRadius: 6 },
  bossBarInner: { height: 8, backgroundColor: "#ff305e", borderRadius: 6 },
  ghostStrip: {
    marginHorizontal: 10,
    marginBottom: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#22406f",
    backgroundColor: "#0f1428",
    padding: 12,
  },
  ghostStripHeader: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  ghostStripButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
  },
  ghostTab: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333355",
    backgroundColor: "#1a1a2a",
  },
  ghostTabActive: { backgroundColor: "#2a2a44", borderColor: "#8ea7ff" },
  ghostTabText: { color: "white", fontSize: 12, fontWeight: "700" },
  ghostAction: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#5e5e7f",
    backgroundColor: "#212133",
  },
  ghostActionText: { color: "#FFB897", fontSize: 11, fontWeight: "900", letterSpacing: 1 },
  gameArea: { flex: 1, alignItems: "center", justifyContent: "center" },
  bottomBar: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#0f0f1a",
    borderTopWidth: 1,
    borderTopColor: "#262640",
  },
  pauseBtn: {
    alignSelf: "center",
    borderWidth: 1,
    borderColor: "#ffff66",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#1d1d2f",
  },
  pauseText: { color: "#FFFF66", fontWeight: "900", letterSpacing: 1 },
  stateActions: { marginTop: 8, alignItems: "center" },
  stateBtn: {
    borderWidth: 1,
    borderColor: "#FFD23F",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#1a1a2a",
  },
  stateBtnText: { color: "#FFD23F", fontWeight: "900", letterSpacing: 1 },
  messageOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "44%",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  messageText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 20,
    letterSpacing: 2,
    textAlign: "center",
    backgroundColor: "#060816f0",
    borderWidth: 1,
    borderColor: "#6b7cff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
});
