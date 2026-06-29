import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  PanResponder,
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
import { POWER_UPS, POWER_UP_ORDER, type PowerUpId } from "@/src/game/powerups";
import { loadSpeedrunData, saveBestRunMs } from "@/src/game/speedrun";

const QUICK_SLOT_IDS: PowerUpId[] = POWER_UP_ORDER;

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
  const [mazeArea, setMazeArea] = useState({ w: 300, h: 400 });
  const cellSize = Math.max(12, Math.floor(Math.min(mazeArea.w / MAZE_COLS, mazeArea.h / MAZE_ROWS)));
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

  useGamepad({
    onDirection: (_id, dir) => {
      applyDirectionToArmed(dir);
    },
    onSelect: (id) => {
      syncSelection([id]);
    },
    getSelectedGhostId: () => stateRef.current.selectedGhostId,
  });

  const applyDirectionToArmedRef = useRef(applyDirectionToArmed);
  applyDirectionToArmedRef.current = applyDirectionToArmed;

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
    () => QUICK_SLOT_IDS.map((id) => ({
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

  const bossHpPct = state.boss ? Math.max(0, (state.boss.hp / state.boss.maxHp) * 100) : 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.gameArea} {...panResponder.panHandlers}>
        <View style={styles.topHud} testID="hud-top">
          <View style={styles.topStat}>
            <Text style={styles.topLabel}>SCORE</Text>
            <Text style={styles.topValue}>{state.score}</Text>
          </View>
          <View style={styles.topStat}>
            <Text style={styles.topLabel}>LIVES</Text>
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
            <Text style={styles.lifeCount}>x{state.lives}</Text>
          </View>
          <View style={styles.topStat}>
            <Text style={styles.topLabel}>COMBO</Text>
            <Text style={styles.topValue}>x{Math.max(1, state.comboCount)}</Text>
          </View>
          <View style={styles.topStat}>
            <Text style={styles.topLabel}>Catch</Text>
            <Text style={styles.topValue}>{state.catches}</Text>
          </View>
          <View style={styles.topStat}>
            <Text style={styles.topLabel}>LEVEL</Text>
            <Text style={styles.topValue}>{state.level}</Text>
          </View>
        </View>
        <View
          style={styles.mazeContainer}
          onLayout={(e) => setMazeArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        >
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
        <View style={styles.footerHud} testID="hud-bottom">
          <View style={styles.statusLine}>
            <Text style={styles.statusLabel}>PELLETS</Text>
            <Text style={styles.statusValue}>{state.pelletsRemaining}</Text>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>MODE {mode.toUpperCase()}</Text>
              <Text style={styles.statusPillSub}>{statusLabel}</Text>
            </View>
            {mode === "speedrun" && (
              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>TIME {fmtMs(elapsedMs)}</Text>
                {bestRunMs > 0 && <Text style={styles.statusPillSub}>BEST {fmtMs(bestRunMs)}</Text>}
              </View>
            )}
            {state.boss && (
              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>BOSS {state.boss.hp}/{state.boss.maxHp}</Text>
                <Text style={styles.statusPillSub}>{state.boss.title}</Text>
                <View style={styles.bossMiniBarOuter}>
                  <View style={[styles.bossMiniBarInner, { width: `${bossHpPct}%` }]} />
                </View>
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
  gameArea: { flex: 1, flexDirection: "column" },
  topHud: {
    flexDirection: "row",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  topStat: {
    flex: 1,
    minWidth: 0,
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 6,
    backgroundColor: "#101426dd",
    borderWidth: 1,
    borderColor: "#2b3357",
  },
  topLabel: { color: "#95a2c8", fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  topValue: { color: "#f7fbff", fontSize: 13, fontWeight: "900" },
  lifeDots: { flexDirection: "row", gap: 3, marginTop: 3, alignItems: "center" },
  lifeDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#ff6b9a",
  },
  lifeDotFilled: { backgroundColor: "#ff6b9a" },
  lifeDotEmpty: { backgroundColor: "transparent" },
  lifeCount: { color: "#ff8ea9", fontSize: 9, fontWeight: "900", marginTop: 2, letterSpacing: 1 },
  footerHud: {
    gap: 4,
    paddingHorizontal: 8,
    paddingBottom: 4,
  },
  statusLine: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
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
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
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
  panelActionText: { color: "#c8d0f0", fontSize: 8, fontWeight: "900", letterSpacing: 0.5 },
  panelLabel: { color: "#95a2c8", fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  panelValue: { color: "#f7fbff", fontSize: 9, fontWeight: "900", letterSpacing: 0.5 },
  ghostToggleRow: { flexDirection: "row", gap: 4 },
  ghostToggle: {
    flex: 1,
    minWidth: 0,
    borderRadius: 10,
    borderWidth: 1.5,
    backgroundColor: "#12172d",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
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
  ghostToggleIndex: { fontSize: 11, fontWeight: "900", letterSpacing: 0.5 },
  slotRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 6,
  },
  slot: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1.5,
    backgroundColor: "#12172d",
    alignItems: "center",
    justifyContent: "center",
  },
  slotDim: { opacity: 0.4 },
  slotIcon: { fontSize: 16, lineHeight: 16 },
  slotCount: { fontSize: 9, fontWeight: "900", marginTop: 3 },
  controlRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  pauseBtn: {
    borderWidth: 1,
    borderColor: "#ffff66",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#1d1d2f",
  },
  pauseText: { color: "#FFFF66", fontWeight: "900", letterSpacing: 1, fontSize: 11 },
  stateActions: { flexDirection: "row", gap: 8 },
  stateBtn: {
    borderWidth: 1,
    borderColor: "#FFD23F",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#1a1a2a",
  },
  stateBtnText: { color: "#FFD23F", fontWeight: "900", letterSpacing: 1, fontSize: 11 },
  mazeContainer: { flex: 1, alignItems: "center", justifyContent: "center", overflow: "hidden" },
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
