import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  PanResponder,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";

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
  const { earnCoins, coins, inventory, useInventory: consumePowerUp } = useEconomy();
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

  const canActivatePowerUp = useCallback((id: PowerUpId) => {
    const cur = stateRef.current;
    if (cur.status !== "playing") return false;
    if ((inventory[id] ?? 0) <= 0) return false;

    switch (id) {
      case "shield":
      case "decoy":
        return !!cur.ghosts[cur.selectedGhostId]?.alive;
      case "teleport":
        return !!cur.ghosts[cur.selectedGhostId]?.alive && cur.pelletGuy.alive;
      case "key":
        return cur.barricades.length > 0;
      default:
        return true;
    }
  }, [inventory]);

  const activatePowerUp = useCallback((id: PowerUpId) => {
    if (!canActivatePowerUp(id)) return;
    if (!consumePowerUp(id)) return;
    if (!applyPowerUp(id)) return;
    try {
      Haptics.selectionAsync();
    } catch {}
  }, [applyPowerUp, canActivatePowerUp, consumePowerUp]);

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
    const list: { label: string; color: string }[] = [];
    if (state.effects.speedBoostUntil > now) list.push({ label: `SPD ${Math.ceil((state.effects.speedBoostUntil - now) / 1000)}s`, color: POWER_UPS.speedBoost.color });
    if (state.effects.freezeUntil > now) list.push({ label: `FRZ ${Math.ceil((state.effects.freezeUntil - now) / 1000)}s`, color: POWER_UPS.freeze.color });
    if (state.effects.magnetUntil > now) list.push({ label: `MAG ${Math.ceil((state.effects.magnetUntil - now) / 1000)}s`, color: POWER_UPS.magnet.color });
    if (state.effects.revealUntil > now) list.push({ label: `REV ${Math.ceil((state.effects.revealUntil - now) / 1000)}s`, color: POWER_UPS.reveal.color });
    if (state.effects.shieldGhostId != null) list.push({ label: `SHIELD G${state.effects.shieldGhostId + 1}`, color: POWER_UPS.shield.color });
    if (state.effects.fastRespawn) list.push({ label: "FAST RESPAWN", color: POWER_UPS.fastRespawn.color });
    if (state.effects.decoy && state.effects.decoy.until > now) list.push({ label: "DECOY ACTIVE", color: POWER_UPS.decoy.color });
    return list;
  }, [state.effects]);
  const ownedPowerUps = useMemo(
    () => POWER_UP_ORDER
      .map((id) => ({ id, def: POWER_UPS[id], count: inventory[id] ?? 0 }))
      .filter((p) => p.count > 0),
    [inventory],
  );
  const aiProfile = useMemo(() => getPelletDifficultyProfile(state.level), [state.level]);
  const now = performance.now();

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={["#261034", "#140c24", "#0c0b18"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hudTop}
        testID="hud-top"
      >
        <View style={styles.scoreHeader}>
          <View style={styles.scoreTitleWrap}>
            <Text style={styles.scoreEyebrow}>RETRO ARCADE HUD</Text>
            <Text style={styles.scoreValue}>SCORE {state.score.toLocaleString()}</Text>
          </View>
          <View style={styles.coinPill}>
            <Text style={styles.coinPillText}>🪙 {coins.toLocaleString()}</Text>
          </View>
        </View>
        <View style={styles.statRow}>
          <View style={styles.statChip}><Text style={styles.statLabel}>MODE</Text><Text style={styles.statValue}>{mode.toUpperCase()}</Text></View>
          <View style={styles.statChip}><Text style={styles.statLabel}>LVL</Text><Text style={styles.statValue}>{state.level}</Text></View>
          <View style={styles.statChip}><Text style={styles.statLabel}>LIVES</Text><Text style={styles.statValue}>{state.lives}</Text></View>
          <View style={styles.statChip}><Text style={styles.statLabel}>AI</Text><Text style={styles.statValue}>{aiProfile.tier.toUpperCase()}</Text></View>
        </View>
      </LinearGradient>
      <View style={styles.hudMid} testID="hud-mid">
        <Text style={styles.hudSub}>CATCHES {state.catches}</Text>
        <Text style={styles.hudSub}>COMBO x{Math.max(1, state.comboCount)}</Text>
        <Text style={styles.hudSub}>PELLETS {state.pelletsRemaining}/{state.totalPellets}</Text>
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
      <View style={styles.effectsWrap} testID="hud-effects">
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>POWER-UP STATUS</Text>
          <Text style={styles.sectionMeta}>{activeEffects.length ? `${activeEffects.length} ACTIVE` : "IDLE"}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.effectChipRow}>
          {activeEffects.length ? activeEffects.map((effect) => (
            <View key={effect.label} style={[styles.effectChip, { borderColor: effect.color }]}>
              <Text style={[styles.effectChipText, { color: effect.color }]}>{effect.label}</Text>
            </View>
          )) : (
            <View style={styles.effectChip}>
              <Text style={styles.effectChipText}>NONE ACTIVE</Text>
            </View>
          )}
        </ScrollView>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>POWER-UPS</Text>
          <Text style={styles.sectionMeta}>{ownedPowerUps.length} OWNED</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.powerupRow}>
          {POWER_UP_ORDER.map((id) => {
            const def = POWER_UPS[id];
            const count = inventory[id] ?? 0;
            const enabled = count > 0 && canActivatePowerUp(id);
            const active =
              (id === "speedBoost" && state.effects.speedBoostUntil > now) ||
              (id === "freeze" && state.effects.freezeUntil > now) ||
              (id === "magnet" && state.effects.magnetUntil > now) ||
              (id === "reveal" && state.effects.revealUntil > now) ||
              (id === "shield" && state.effects.shieldGhostId != null) ||
              (id === "fastRespawn" && state.effects.fastRespawn) ||
              (id === "decoy" && !!state.effects.decoy);
            return (
              <TouchableOpacity
                key={id}
                style={[
                  styles.powerupChip,
                  { borderColor: def.color },
                  count === 0 && styles.powerupChipEmpty,
                  active && styles.powerupChipActive,
                ]}
                onPress={() => activatePowerUp(id)}
                disabled={!enabled}
                testID={`powerup-${id}`}
              >
                <Text style={[styles.powerupIcon, { color: def.color }]}>{def.icon}</Text>
                <Text style={[styles.powerupCount, { color: def.color }]}>x{count}</Text>
                <Text style={styles.powerupName}>{def.short}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
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
              <Text numberOfLines={1} style={styles.ghostTabText}>{active ? "●" : "○"} {GHOST_NAMES[id]}</Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          onPress={() => syncSelection([0, 1, 2, 3])}
          style={styles.ghostAction}
          testID="ghost-arm-all"
        >
          <Text numberOfLines={1} style={styles.ghostActionText}>ALL</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => syncSelection([state.selectedGhostId])}
          style={styles.ghostAction}
          testID="ghost-reset"
        >
          <Text numberOfLines={1} style={styles.ghostActionText}>RESET</Text>
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
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#35264d",
    shadowColor: "#FF47A3",
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  scoreHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 8,
  },
  scoreTitleWrap: {
    flex: 1,
  },
  scoreEyebrow: {
    color: "#8f7cff",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 2,
  },
  scoreValue: {
    color: "#FFF28D",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  coinPill: {
    borderWidth: 1,
    borderColor: "#ff7bd1",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "#24102e",
  },
  coinPillText: {
    color: "#ffb8f0",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },
  statRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  statChip: {
    flexGrow: 1,
    minWidth: "23%",
    borderWidth: 1,
    borderColor: "#51406f",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: "#160f24",
  },
  statLabel: {
    color: "#9f8cff",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  statValue: {
    color: "#f6f0ff",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1,
  },
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
  hudMid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#121226",
    borderBottomWidth: 1,
    borderBottomColor: "#1e1e31",
  },
  hudSub: { color: "#FFB897", fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  effectsWrap: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 6,
    backgroundColor: "#10111f",
    borderBottomWidth: 1,
    borderBottomColor: "#252540",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  sectionTitle: {
    color: "#7fb4ff",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.4,
  },
  sectionMeta: {
    color: "#8d8db9",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },
  effectChipRow: {
    gap: 6,
    paddingBottom: 8,
  },
  effectChip: {
    borderWidth: 1,
    borderColor: "#3b4a7a",
    backgroundColor: "#171a2d",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 6,
  },
  effectChipText: {
    color: "#d7e7ff",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  powerupRow: {
    gap: 8,
    paddingBottom: 2,
  },
  powerupChip: {
    width: 82,
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: "#1a1228",
    alignItems: "center",
    paddingVertical: 8,
    marginRight: 8,
  },
  powerupChipEmpty: {
    opacity: 0.42,
  },
  powerupChipActive: {
    backgroundColor: "#2a1840",
  },
  powerupIcon: {
    fontSize: 18,
    marginBottom: 4,
  },
  powerupCount: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 2,
  },
  powerupName: {
    color: "#fff5ff",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
    textAlign: "center",
  },
  ghostStrip: {
    flexDirection: "row",
    flexWrap: "nowrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderTopWidth: 1,
    borderTopColor: "#262640",
    borderBottomWidth: 1,
    borderBottomColor: "#262640",
    backgroundColor: "#0f0f1a",
  },
  ghostTab: {
    flexGrow: 1,
    flexBasis: 0,
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333355",
    backgroundColor: "#1a1a2a",
  },
  ghostTabActive: { backgroundColor: "#2a2a44", borderColor: "#8ea7ff" },
  ghostTabText: { color: "white", fontSize: 10, fontWeight: "700", textAlign: "center" },
  ghostAction: {
    paddingVertical: 5,
    paddingHorizontal: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#5e5e7f",
    backgroundColor: "#212133",
  },
  ghostActionText: { color: "#FFB897", fontSize: 10, fontWeight: "900", letterSpacing: 1 },
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
