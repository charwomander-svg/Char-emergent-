import React, { useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  PanResponder,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { useGhostMaze } from "@/src/game/useGhostMaze";
import MazeRenderer from "@/src/game/MazeRenderer";
import { MAZE_COLS, MAZE_ROWS } from "@/src/game/constants";
import type { Direction, GhostId } from "@/src/game/types";
import { useGamepad } from "@/src/game/useGamepad";

export default function GameScreen() {
  const {
    state,
    setGhostDirection,
    selectGhost,
  } = useGhostMaze();
  const { width, height } = useWindowDimensions();
  const cellSize = Math.max(
    12,
    Math.floor(Math.min(width / MAZE_COLS, (height - 80) / MAZE_ROWS)),
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

  // -----------------------------
  // RENDER
  // -----------------------------
  return (
    <SafeAreaView style={styles.container}>
      
      {/* Ghost selector strip */}
      <View style={styles.ghostStrip}>
        {([0, 1, 2, 3] as GhostId[]).map((id) => (
          <TouchableOpacity
            key={id}
            onPress={() => selectGhost(id)}
            style={[
              styles.ghostTab,
              state.selectedGhostId === id && styles.ghostTabActive,
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

  gameArea: {
    flex: 1,
  },

  ghostStrip: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 8,
    backgroundColor: "#0f0f1a",
  },

  ghostTab: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#1a1a2a",
  },

  ghostTabActive: {
    backgroundColor: "#2a2a44",
  },

  ghostTabText: {
    color: "white",
    fontSize: 12,
  },
});