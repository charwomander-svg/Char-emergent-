import React, { useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  PanResponder,
  useWindowDimensions,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";

import { useGhostMaze } from "@/src/game/useGhostMaze";
import MazeRenderer from "@/src/game/MazeRenderer";
import { CATCH_TO_WIN, MAZE_COLS, MAZE_ROWS } from "@/src/game/constants";
import type { Direction, GhostId } from "@/src/game/types";
import { useGamepad } from "@/src/game/useGamepad";

export default function GameScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    mode?: string;
    seed?: string;
    seedDate?: string;
    level?: string;
  }>();

  const mode = (params.mode === "daily" || params.mode === "classic" || params.mode === "custom")
    ? params.mode
    : "classic";
  const dailySeed = params.seed ? parseInt(params.seed, 10) : undefined;
  const dailySeedDate = params.seedDate;
  const startingLevel = params.level ? Math.max(1, parseInt(params.level, 10)) : 1;

  const {
    state,
    setGhostDirection,
    selectGhost,
    togglePause,
    advanceLevel,
    retryLevel,
    startNewGame,
  } = useGhostMaze({
    mode,
    dailySeed,
    dailySeedDate,
    startingLevel,
  });

  const { width, height } = useWindowDimensions();
  const cellSize = Math.max(
    12,
    Math.floor(Math.min(width / MAZE_COLS, (height - 140) / MAZE_ROWS)),
  );

  const stateRef = useRef(state);
  stateRef.current = state;

  // -----------------------------
  // GAMEPAD (optional)
  // -----------------------------
  useGamepad({
    onDirection: (id, dir) => {
      setGhostDirection(id, dir);
    },
    onSelect: (id) => {
      selectGhost(id);
    },
    getSelectedGhostId: () => stateRef.current.selectedGhostId,
    enabled: state.status === "playing",
  });

  // -----------------------------
  // SWIPE INPUT
  // -----------------------------
  const SWIPE_THRESHOLD = 25;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,

      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 5 || Math.abs(g.dy) > 5,

      onPanResponderRelease: (_, g) => {
        if (stateRef.current.status !== "playing") return;
        const dx = g.dx;
        const dy = g.dy;

        if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) {
          return;
        }

        let dir: Direction;

        if (Math.abs(dx) > Math.abs(dy)) {
          dir = dx > 0 ? "right" : "left";
        } else {
          dir = dy > 0 ? "down" : "up";
        }

        try {
          Haptics.selectionAsync();
        } catch {}

        setGhostDirection(stateRef.current.selectedGhostId, dir);
      },
    })
  ).current;

  const isTerminal =
    state.status === "levelWon" ||
    state.status === "levelLost" ||
    state.status === "gameOver";

  // -----------------------------
  // RENDER
  // -----------------------------
  return (
    <SafeAreaView style={styles.container}>

      {/* Top HUD */}
      <View style={styles.hud}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.hudBtn}
          testID="back-btn"
        >
          <Text style={styles.hudBtnText}>‹</Text>
        </TouchableOpacity>

        <View style={styles.hudCenter}>
          <Text style={styles.hudLevel}>LV {state.level}</Text>
          <Text style={styles.hudScore}>{state.score}</Text>
        </View>

        <View style={styles.hudRight}>
          <Text style={styles.hudLives}>{"❤️".repeat(Math.max(0, state.lives))}</Text>
          <Text style={styles.hudCatches}>
            {state.catches}/{CATCH_TO_WIN}
          </Text>
        </View>

        <TouchableOpacity
          onPress={togglePause}
          style={styles.hudBtn}
          testID="pause-btn"
          disabled={isTerminal || state.status === "ready"}
        >
          <Text style={styles.hudBtnText}>
            {state.status === "paused" ? "▶" : "⏸"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Ghost selector strip */}
      <View style={styles.ghostStrip}>
        {([0, 1, 2, 3] as GhostId[]).map((id) => (
          <TouchableOpacity
            key={id}
            onPress={() => selectGhost(id)}
            style={[
              styles.ghostTab,
              state.selectedGhostId === id && styles.ghostTabActive,
              { borderColor: state.ghosts[id]?.color ?? "#fff" },
            ]}
          >
            <Text style={styles.ghostTabText}>
              {["Blinky", "Pinky", "Inky", "Clyde"][id]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Game area */}
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

      {/* Status message overlay (ready/paused/won/lost) */}
      {state.status !== "playing" && (
        <View style={styles.overlay} pointerEvents={isTerminal || state.status === "paused" ? "box-none" : "none"}>
          <View style={styles.overlayCard}>
            <ScrollView contentContainerStyle={{ alignItems: "center" }}>
              {state.message ? (
                <Text style={styles.overlayMessage}>{state.message}</Text>
              ) : null}

              {state.status === "ready" && (
                <Text style={styles.overlaySubtext}>GET READY…</Text>
              )}

              {state.status === "paused" && (
                <>
                  <Text style={styles.overlaySubtext}>PAUSED</Text>
                  <TouchableOpacity style={styles.overlayBtn} onPress={togglePause} testID="resume-btn">
                    <Text style={styles.overlayBtnText}>▶ RESUME</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.overlayBtn, styles.overlayBtnSecondary]}
                    onPress={() => router.back()}
                    testID="quit-btn"
                  >
                    <Text style={[styles.overlayBtnText, { color: "#888899" }]}>✕ QUIT</Text>
                  </TouchableOpacity>
                </>
              )}

              {state.status === "levelWon" && (
                <>
                  <TouchableOpacity style={styles.overlayBtn} onPress={advanceLevel} testID="next-level-btn">
                    <Text style={styles.overlayBtnText}>▶ NEXT LEVEL</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.overlayBtn, styles.overlayBtnSecondary]}
                    onPress={() => router.back()}
                    testID="menu-btn"
                  >
                    <Text style={[styles.overlayBtnText, { color: "#888899" }]}>⌂ MENU</Text>
                  </TouchableOpacity>
                </>
              )}

              {state.status === "levelLost" && (
                <>
                  <TouchableOpacity style={styles.overlayBtn} onPress={retryLevel} testID="retry-btn">
                    <Text style={styles.overlayBtnText}>↺ RETRY</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.overlayBtn, styles.overlayBtnSecondary]}
                    onPress={() => router.back()}
                    testID="menu-btn"
                  >
                    <Text style={[styles.overlayBtnText, { color: "#888899" }]}>⌂ MENU</Text>
                  </TouchableOpacity>
                </>
              )}

              {state.status === "gameOver" && (
                <>
                  <Text style={styles.overlayScore}>
                    Final Score: {state.score}
                  </Text>
                  <TouchableOpacity style={styles.overlayBtn} onPress={startNewGame} testID="new-game-btn">
                    <Text style={styles.overlayBtnText}>▶ NEW GAME</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.overlayBtn, styles.overlayBtnSecondary]}
                    onPress={() => router.back()}
                    testID="menu-btn"
                  >
                    <Text style={[styles.overlayBtnText, { color: "#888899" }]}>⌂ MENU</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      )}

    </SafeAreaView>
  );
}

// -----------------------------
// STYLES
// -----------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a12",
  },

  hud: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: "#0f0f1a",
    borderBottomWidth: 1,
    borderBottomColor: "#2121DE",
  },

  hudBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },

  hudBtnText: {
    color: "#FFFF00",
    fontSize: 22,
    fontWeight: "900",
  },

  hudCenter: {
    flex: 1,
    alignItems: "center",
  },

  hudLevel: {
    color: "#888899",
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: "bold",
  },

  hudScore: {
    color: "#FFFF00",
    fontSize: 20,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
    letterSpacing: 1,
  },

  hudRight: {
    alignItems: "flex-end",
    marginRight: 4,
  },

  hudLives: {
    fontSize: 11,
  },

  hudCatches: {
    color: "#FFB897",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1,
  },

  gameArea: {
    flex: 1,
  },

  ghostStrip: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 6,
    backgroundColor: "#0f0f1a",
  },

  ghostTab: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#1a1a2a",
    borderWidth: 1,
    borderColor: "#333",
  },

  ghostTabActive: {
    backgroundColor: "#2a2a44",
  },

  ghostTabText: {
    color: "white",
    fontSize: 11,
    fontWeight: "bold",
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.75)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },

  overlayCard: {
    backgroundColor: "#111122",
    borderRadius: 16,
    padding: 24,
    maxWidth: 320,
    width: "85%",
    borderWidth: 2,
    borderColor: "#2121DE",
    maxHeight: "80%",
  },

  overlayMessage: {
    color: "#FFFF00",
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 1,
    lineHeight: 24,
    marginBottom: 16,
  },

  overlaySubtext: {
    color: "#888899",
    fontSize: 12,
    letterSpacing: 3,
    marginBottom: 16,
    textAlign: "center",
  },

  overlayScore: {
    color: "#FFB897",
    fontSize: 14,
    fontWeight: "bold",
    letterSpacing: 1,
    marginBottom: 16,
    textAlign: "center",
  },

  overlayBtn: {
    backgroundColor: "#FFFF00",
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 10,
    minWidth: 180,
    alignItems: "center",
  },

  overlayBtnSecondary: {
    backgroundColor: "#1a1a2e",
    borderWidth: 1,
    borderColor: "#333355",
  },

  overlayBtnText: {
    color: "#000",
    fontWeight: "900",
    fontSize: 14,
    letterSpacing: 2,
  },
});