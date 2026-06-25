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
  const { earnCoins } = useEconomy();
  const {
    state,
    setGhostDirection,
    selectGhost,
    togglePause,
    advanceLevel,
    retryLevel,
    startNewGame,
    submitFinalScore,
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
    Math.floor(Math.min(width / MAZE_COLS, (height - 250) / MAZE_ROWS)),
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hudTop} testID="hud-top">
        <Text style={styles.hudValue}>MODE: {mode.toUpperCase()}</Text>
        <Text style={styles.hudValue}>LEVEL: {state.level}</Text>
        <Text style={styles.hudValue}>LIVES: {state.lives}</Text>
        <Text style={styles.hudValue}>SCORE: {state.score}</Text>
      </View>
      <View style={styles.hudMid} testID="hud-mid">
        <Text style={styles.hudSub}>CATCHES {state.catches}</Text>
        <Text style={styles.hudSub}>COMBO x{Math.max(1, state.comboCount)}</Text>
        <Text style={styles.hudSub}>PELLETS {state.pelletsRemaining}/{state.totalPellets}</Text>
        <Text style={styles.hudSub}>AI {aiProfile.tier.toUpperCase()}</Text>
        {mode === "speedrun" && <Text style={styles.hudSub}>TIME {fmtMs(elapsedMs)}</Text>}
        {mode === "speedrun" && bestRunMs > 0 && <Text style={styles.hudSub}>BEST {fmtMs(bestRunMs)}</Text>}
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
      <View style={styles.effectsRow} testID="hud-effects">
        <Text style={styles.effectsLabel}>EFFECTS:</Text>
        <Text style={styles.effectsText}>{activeEffects.length ? activeEffects.join(" · ") : "none"}</Text>
      </View>

      <View style={styles.ghostStrip}>
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
  hudTop: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#0f0f1a",
    borderBottomWidth: 1,
    borderBottomColor: "#262640",
  },
  hudMid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#121226",
  },
  hudValue: { color: "#FFFF00", fontSize: 11, fontWeight: "900", letterSpacing: 1 },
  hudSub: { color: "#FFB897", fontSize: 10, fontWeight: "700", letterSpacing: 1 },
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
  effectsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#111827",
  },
  effectsLabel: { color: "#7fb4ff", fontSize: 10, fontWeight: "900" },
  effectsText: { color: "#d7e7ff", fontSize: 10, flexShrink: 1 },
  ghostStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 6,
    backgroundColor: "#0f0f1a",
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
  },
  messageText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 20,
    letterSpacing: 2,
    textAlign: "center",
    backgroundColor: "#000000aa",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
});
