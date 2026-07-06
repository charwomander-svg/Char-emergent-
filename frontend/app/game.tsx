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
import { MAZE_COLS, MAZE_ROWS, MAX_LEVELS } from "@/src/game/constants";
import type { Direction, GhostId } from "@/src/game/types";
import { useGamepad } from "@/src/game/useGamepad";
import { useEconomy } from "@/src/game/useEconomy";
import { POWER_UPS, POWER_UP_ORDER, type PowerUpId } from "@/src/game/powerups";
import { loadSpeedrunData, saveBestRunMs } from "@/src/game/speedrun";
import { bonusTimeRemainingMs, BONUS_CONFIG } from "@/src/game/bonusGame";
import {
  queueAchievementUnlock,
  recordSpeedrunLevelBest,
  syncPlayGames,
} from "@/src/game/playGames";


function fmtMs(ms: number): string {
  const totalMs = Math.max(0, Math.floor(ms));
  const totalSeconds = Math.floor(totalMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const millis = totalMs % 1000;
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

export default function GameScreen() {
  const params = useLocalSearchParams<{
    mode?: string;
    seed?: string;
    seedDate?: string;
    level?: string;
  }>();
  const mode = params.mode === "custom" || params.mode === "speedrun"
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
    bonusAction,
  } = useGhostMaze({
    mode,
    dailySeed: Number.isFinite(seed) ? seed : undefined,
    dailySeedDate: params.seedDate ?? undefined,
    startingLevel: Number.isFinite(startLevel) ? Math.max(1, Math.floor(startLevel!)) : 1,
    onCoinsEarned: (n) => earnCoins(n),
  });
  const { width, height } = useWindowDimensions();
  const [mazeAreaSize, setMazeAreaSize] = useState({ width: 0, height: 0 });
  const cellSize = Math.max(
    12,
    Math.floor(Math.min(
      (mazeAreaSize.width > 0 ? mazeAreaSize.width : width) / MAZE_COLS,
      (mazeAreaSize.height > 0 ? mazeAreaSize.height : height) / MAZE_ROWS,
    )),
  );
  const [armedGhosts, setArmedGhosts] = useState<GhostId[]>([0]);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [bestRunMs, setBestRunMs] = useState(0);
  const timerAccumulatedRef = useRef(0);
  const timerRunningFromRef = useRef<number | null>(null);
  const submittedSpeedrunRef = useRef(false);
  const recordedSpeedrunLevelsRef = useRef<Record<number, true>>({});
  const previousLevelRef = useRef(state.level);
  const levelStartElapsedRef = useRef(0);
  const previousCatchesRef = useRef(state.catches);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    loadSpeedrunData().then((d) => setBestRunMs(d.bestRunMs));
    void syncPlayGames();
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
      void queueAchievementUnlock("gottaGoFast");
      if (state.level >= MAX_LEVELS) {
        const finalLevel = previousLevelRef.current;
        if (!recordedSpeedrunLevelsRef.current[finalLevel]) {
          recordedSpeedrunLevelsRef.current[finalLevel] = true;
          void recordSpeedrunLevelBest(finalLevel, finalMs - levelStartElapsedRef.current);
        }
      }
    }
  }, [mode, state.status, computeTimerMs, submitFinalScore]);

  useEffect(() => {
    if (mode !== "speedrun") return;
    const id = setInterval(() => setElapsedMs(computeTimerMs()), 16);
    return () => clearInterval(id);
  }, [mode, computeTimerMs]);

  useEffect(() => {
    if (state.status === "ready" && state.score === 0) {
      timerAccumulatedRef.current = 0;
      timerRunningFromRef.current = null;
      setElapsedMs(0);
      submittedSpeedrunRef.current = false;
      recordedSpeedrunLevelsRef.current = {};
      previousLevelRef.current = state.level;
      levelStartElapsedRef.current = 0;
    }
  }, [state.status, state.level, state.score]);

  useEffect(() => {
    if (mode !== "speedrun") return;
    const previousLevel = previousLevelRef.current;
    if (state.level > previousLevel) {
      const elapsed = computeTimerMs();
      if (!recordedSpeedrunLevelsRef.current[previousLevel]) {
        recordedSpeedrunLevelsRef.current[previousLevel] = true;
        void recordSpeedrunLevelBest(previousLevel, elapsed - levelStartElapsedRef.current);
      }
      levelStartElapsedRef.current = elapsed;
    }
    previousLevelRef.current = state.level;
  }, [computeTimerMs, mode, state.level]);

  useEffect(() => {
    if (armedGhosts.length === 4) {
      void queueAchievementUnlock("friends");
    }
  }, [armedGhosts]);

  const syncSelection = useCallback((next: GhostId[]) => {
    if (next.length > 0) selectGhost(next[0]);
    setArmedGhosts(next);
  }, [selectGhost]);

  const toggleGhostArm = useCallback((ghostId: GhostId) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    selectGhost(ghostId);
    setArmedGhosts((prev) => {
      if (prev.includes(ghostId)) {
        if (prev.length === 1) return prev;
        return prev.filter((id) => id !== ghostId);
      }
      return [...prev, ghostId].sort((a, b) => a - b) as GhostId[];
    });
  }, [selectGhost]);

  const applyDirectionToArmed = useCallback((dir: Direction) => {
    const targets = armedGhosts.length > 0 ? armedGhosts : [stateRef.current.selectedGhostId];
    targets.forEach((id) => setGhostDirection(id, dir));
  }, [armedGhosts, setGhostDirection]);

  // Keep a stable ref so the frozen panResponder closure always calls the latest version.
  const applyDirectionToArmedRef = useRef(applyDirectionToArmed);
  applyDirectionToArmedRef.current = applyDirectionToArmed;

  useGamepad({
    onDirection: (_id, dir) => {
      applyDirectionToArmedRef.current(dir);
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
        applyDirectionToArmedRef.current(dir);
      },
    })
  ).current;

  const activeEffects = useMemo(() => {
    const now = performance.now();
    const list: { key: string; label: string; color: string }[] = [];
    if (state.effects.speedBoostUntil > now) {
      list.push({
        key: "speed",
        label: `SPD ${Math.ceil((state.effects.speedBoostUntil - now) / 1000)}s`,
        color: "#ffd84d",
      });
    }
    if (state.effects.freezeUntil > now) {
      list.push({
        key: "freeze",
        label: `FRZ ${Math.ceil((state.effects.freezeUntil - now) / 1000)}s`,
        color: "#5bc0eb",
      });
    }
    if (state.effects.magnetUntil > now) {
      list.push({
        key: "magnet",
        label: `MAG ${Math.ceil((state.effects.magnetUntil - now) / 1000)}s`,
        color: "#ff477e",
      });
    }
    if (state.effects.revealUntil > now) {
      list.push({
        key: "reveal",
        label: `REV ${Math.ceil((state.effects.revealUntil - now) / 1000)}s`,
        color: "#00ffff",
      });
    }
    if (state.effects.shieldGhostId != null) {
      list.push({
        key: "shield",
        label: `SH G${state.effects.shieldGhostId + 1}`,
        color: "#9bc53d",
      });
    }
    if (state.effects.fastRespawn) {
      list.push({
        key: "fastRespawn",
        label: "FAST",
        color: "#ff9f1c",
      });
    }
    return list;
  }, [state.effects]);
  const inventoryItems = useMemo(
    () => POWER_UP_ORDER.slice(0, 8).map((id) => ({
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
  const ghostToggleItems = useMemo(
    () => state.ghosts.map((ghost) => ({
      ghost,
      armed: armedGhosts.includes(ghost.id),
      selected: state.selectedGhostId === ghost.id,
    })),
    [armedGhosts, state.ghosts, state.selectedGhostId],
  );

  const activatePowerUp = useCallback((id: PowerUpId) => {
    const applied = applyPowerUp(id);
    if (!applied) return;
    consumeInventory(id);
  }, [applyPowerUp, consumeInventory]);

  const bonusTimeLeft = state.bonusGame ? bonusTimeRemainingMs(state.bonusGame, performance.now()) : 0;
  const bonusItemsLeft = state.bonusGame ? state.bonusGame.items.filter((i) => !i.collected).length : 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.gameWrapper} {...panResponder.panHandlers}>
        <View
          style={styles.mazeArea}
          onLayout={(e) =>
            setMazeAreaSize({
              width: e.nativeEvent.layout.width,
              height: e.nativeEvent.layout.height,
            })
          }
        >
          <MazeRenderer
            maze={state.maze}
            ghosts={state.ghosts}
            pelletGuy={state.pelletGuy}
            cellSize={cellSize}
            selectedGhostId={state.selectedGhostId}
            ready={state.status === "ready"}
            level={state.level}
            bonusGame={state.bonusGame}
          />
        </View>
        <View style={styles.footerHud} testID="hud-bottom">
          <View style={styles.statusLine}>
            <Text style={styles.statusLabel}>PELLETS</Text>
            <Text style={styles.statusValue}>{state.pelletsRemaining}</Text>
            <Text style={styles.statusLabel}>CATCH</Text>
            <Text style={styles.statusValue}>{state.catches}</Text>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>MODE {mode.toUpperCase()}</Text>
              <Text style={styles.statusPillSub}>LV {state.level} · {statusLabel}</Text>
            </View>
            {mode === "speedrun" && (
              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>TIME {fmtMs(elapsedMs)}</Text>
                {bestRunMs > 0 && <Text style={styles.statusPillSub}>BEST {fmtMs(bestRunMs)}</Text>}
              </View>
            )}
            {state.bonusGame && (
              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>
                  {BONUS_CONFIG[state.bonusGame.type].label} {bonusItemsLeft}✕
                </Text>
                <Text style={styles.statusPillSub}>
                  {Math.ceil(bonusTimeLeft / 1000)}s LEFT
                </Text>
              </View>
            )}
            {activeEffects.length > 0 && (
              <View style={styles.effectRow}>
                {activeEffects.map((effect) => (
                  <View key={effect.key} style={[styles.effectChip, { borderColor: effect.color }]}>
                    <Text style={[styles.effectChipText, { color: effect.color }]}>{effect.label}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
          <View style={styles.ghostTogglePanel} testID="ghost-toggles">
            <View style={styles.panelHeader}>
              <Text style={styles.panelLabel}>GHOST TOGGLES</Text>
              <View style={styles.panelHeaderActions}>
                <TouchableOpacity
                  onPress={() => { setArmedGhosts([0, 1, 2, 3]); selectGhost(0); }}
                  style={styles.panelActionBtn}
                  testID="ghost-arm-all"
                >
                  <Text style={styles.panelActionText}>ALL</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { setArmedGhosts([0]); selectGhost(0); }}
                  style={styles.panelActionBtn}
                  testID="ghost-arm-reset"
                >
                  <Text style={styles.panelActionText}>RESET</Text>
                </TouchableOpacity>
                <Text style={styles.panelValue}>{armedGhosts.length}/4 ARMED</Text>
                <View style={styles.lifeHearts} testID="hud-lives">
                  {lifeDots.map((filled, index) => (
                    <Text key={index} style={[styles.lifeHeart, !filled && styles.lifeHeartEmpty]}>
                      ♥
                    </Text>
                  ))}
                </View>
              </View>
            </View>
            <View style={styles.ghostToggleRow}>
              {ghostToggleItems.map(({ ghost, armed, selected }) => (
                <TouchableOpacity
                  key={ghost.id}
                  onPress={() => toggleGhostArm(ghost.id)}
                  style={[
                    styles.ghostToggle,
                    { borderColor: ghost.color },
                    armed && styles.ghostToggleArmed,
                    selected && styles.ghostToggleSelected,
                  ]}
                  testID={`ghost-toggle-${ghost.id}`}
                >
                  <Text style={[styles.ghostToggleIndex, { color: armed ? ghost.color : "#7d88a8" }]}>
                    G{ghost.id + 1}
                  </Text>
                  <Text style={[styles.ghostToggleName, { color: selected ? "#f7fbff" : "#9aa6ca" }]}>
                    {ghost.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.slotRow} testID="hud-items">
            {inventoryItems.map(({ id, def, count }) => {
              const playable = state.status === "playing" && count > 0;
              return (
                <TouchableOpacity
                  key={id}
                  onPress={() => activatePowerUp(id)}
                  style={[
                    styles.slot,
                    { borderColor: def.color },
                    count === 0 && styles.slotDim,
                  ]}
                  disabled={!playable}
                  testID={`inventory-${id}`}
                >
                  <Text style={styles.slotIcon}>{def.icon}</Text>
                  <Text style={[styles.slotCount, { color: count > 0 ? def.color : "#7d88a8" }]}>
                    {count}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.controlRow}>
            <View style={styles.scorePill} testID="hud-score">
              <Text style={styles.scorePillLabel}>SCORE</Text>
              <Text style={styles.scorePillValue}>{state.score}</Text>
            </View>
            {(state.status === "playing" || state.status === "paused" || state.status === "ready") && (
              <TouchableOpacity onPress={togglePause} style={styles.pauseBtn} testID="pause-btn">
                <Text style={styles.pauseText}>{state.status === "paused" ? "RESUME" : "PAUSE"}</Text>
              </TouchableOpacity>
            )}
            {state.bonusGame && !state.bonusGame.complete &&
              (state.bonusGame.type === "galagaBlitz" || state.bonusGame.type === "digDugDash") && (
              <TouchableOpacity onPress={bonusAction} style={styles.actionBtn} testID="bonus-action-btn">
                <Text style={styles.pauseText}>
                  {state.bonusGame.type === "galagaBlitz" ? "🔥 FIRE" : "💨 PUMP"}
                </Text>
              </TouchableOpacity>
            )}
            {(state.status === "levelWon" || state.status === "levelLost" || state.status === "gameOver") && (
              <View style={styles.stateActions}>
                {state.status === "levelWon" && (
                  <TouchableOpacity onPress={advanceLevel} style={styles.stateBtn} testID="next-level-btn">
                    <Text style={styles.stateBtnText}>
                      {state.level >= MAX_LEVELS ? "FINISH!" : "NEXT LEVEL"}
                    </Text>
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
        </View>
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
  gameWrapper: { flex: 1, flexDirection: "column" },
  mazeArea: { flex: 1, alignItems: "center", justifyContent: "center" },
  footerHud: {
    paddingHorizontal: 8,
    paddingBottom: 8,
    paddingTop: 2,
    gap: 6,
  },
  statusLine: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#101426dd",
    borderWidth: 1,
    borderColor: "#2b3357",
  },
  statusLabel: { color: "#95a2c8", fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  statusValue: { color: "#f7fbff", fontSize: 14, fontWeight: "900", marginRight: 6 },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: "#171d31",
    borderWidth: 1,
    borderColor: "#303a60",
  },
  statusPillText: { color: "#f1f4ff", fontSize: 10, fontWeight: "900", letterSpacing: 0.5 },
  statusPillSub: { color: "#9aa6ca", fontSize: 9, fontWeight: "800", marginTop: 2 },
  bossMiniBarOuter: {
    marginTop: 4,
    height: 4,
    width: 92,
    borderRadius: 999,
    backgroundColor: "#2f1220",
    overflow: "hidden",
  },
  bossMiniBarInner: { height: 4, backgroundColor: "#ff305e", borderRadius: 999 },
  effectRow: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  effectChip: {
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: "#171d31",
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  effectChipText: { fontSize: 9, fontWeight: "900", letterSpacing: 0.5 },
  ghostTogglePanel: {
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#101426dd",
    borderWidth: 1,
    borderColor: "#2b3357",
  },
  panelHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  panelHeaderActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  panelActionBtn: {
    borderWidth: 1,
    borderColor: "#4a5580",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    backgroundColor: "#12172d",
  },
  panelActionText: { color: "#c8d0f0", fontSize: 9, fontWeight: "900", letterSpacing: 0.5 },
  panelLabel: { color: "#95a2c8", fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  panelValue: { color: "#f7fbff", fontSize: 10, fontWeight: "900", letterSpacing: 0.5 },
  lifeHearts: { flexDirection: "row", alignItems: "center", gap: 2, marginLeft: 2 },
  lifeHeart: { color: "#ff6b9a", fontSize: 13, fontWeight: "900" },
  lifeHeartEmpty: { color: "#5d3550" },
  ghostToggleRow: { flexDirection: "row", gap: 6 },
  ghostToggle: {
    flex: 1,
    minWidth: 0,
    borderRadius: 10,
    borderWidth: 1.5,
    backgroundColor: "#12172d",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    opacity: 0.6,
  },
  ghostToggleArmed: {
    backgroundColor: "#18213d",
    opacity: 1,
  },
  ghostToggleSelected: {
    borderWidth: 2,
    transform: [{ translateY: -1 }],
  },
  ghostToggleIndex: { fontSize: 10, fontWeight: "900", letterSpacing: 0.5 },
  ghostToggleName: { fontSize: 9, fontWeight: "800", marginTop: 2 },
  slotRow: {
    flexDirection: "row",
    gap: 5,
  },
  slot: {
    flex: 1,
    height: 52,
    borderRadius: 10,
    borderWidth: 1.5,
    backgroundColor: "#12172d",
    alignItems: "center",
    justifyContent: "center",
  },
  slotDim: { opacity: 0.4 },
  slotIcon: { fontSize: 18, lineHeight: 18 },
  slotCount: { fontSize: 10, fontWeight: "900", marginTop: 3 },
  controlRow: { flexDirection: "row", alignItems: "stretch", justifyContent: "center", gap: 8 },
  scorePill: {
    minWidth: 124,
    borderWidth: 1,
    borderColor: "#FFD23F",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#1d1d2f",
    justifyContent: "center",
  },
  scorePillLabel: { color: "#95a2c8", fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  scorePillValue: {
    color: "#FFD23F",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },
  pauseBtn: {
    borderWidth: 1,
    borderColor: "#ffff66",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#1d1d2f",
  },
  actionBtn: {
    borderWidth: 2,
    borderColor: "#ff4466",
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: "#2a0010",
  },
  pauseText: { color: "#FFFF66", fontWeight: "900", letterSpacing: 1 },
  stateActions: { flexDirection: "row", gap: 8 },
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
