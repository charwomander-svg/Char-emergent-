import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useGhostMaze } from "@/src/game/useGhostMaze";
import MazeRenderer from "@/src/game/MazeRenderer";
import { COLORS, MAZE_COLS, MAZE_ROWS } from "@/src/game/constants";
import type { Direction, GhostId } from "@/src/game/types";
import { getSoundEngine } from "@/src/game/sounds";

// Mini D-pad for one ghost
function GhostDpad({
  ghostId,
  color,
  name,
  alive,
  selected,
  onDirection,
  onSelect,
  size,
}: {
  ghostId: GhostId;
  color: string;
  name: string;
  alive: boolean;
  selected: boolean;
  onDirection: (dir: Direction) => void;
  onSelect: () => void;
  size: number;
}) {
  const btnSize = size * 0.32;
  const press = (dir: Direction) => {
    if (!alive) return;
    try {
      Haptics.selectionAsync();
    } catch {}
    onDirection(dir);
    onSelect();
  };
  return (
    <View
      style={[
        styles.dpadContainer,
        {
          width: size,
          height: size,
          borderColor: selected ? color : "#222244",
          opacity: alive ? 1 : 0.35,
        },
      ]}
      testID={`ghost-dpad-${ghostId}`}
    >
      {/* Ghost label */}
      <TouchableOpacity
        onPress={onSelect}
        style={[styles.ghostLabel, { backgroundColor: color }]}
        testID={`ghost-select-${ghostId}`}
      >
        <Text style={styles.ghostLabelText}>{name}</Text>
      </TouchableOpacity>

      {/* Up */}
      <TouchableOpacity
        onPress={() => press("up")}
        style={[
          styles.dpadBtn,
          {
            width: btnSize,
            height: btnSize,
            top: 0,
            left: size / 2 - btnSize / 2,
            backgroundColor: color,
          },
        ]}
        testID={`ghost-${ghostId}-up`}
      >
        <Text style={styles.dpadBtnText}>▲</Text>
      </TouchableOpacity>
      {/* Down */}
      <TouchableOpacity
        onPress={() => press("down")}
        style={[
          styles.dpadBtn,
          {
            width: btnSize,
            height: btnSize,
            bottom: 0,
            left: size / 2 - btnSize / 2,
            backgroundColor: color,
          },
        ]}
        testID={`ghost-${ghostId}-down`}
      >
        <Text style={styles.dpadBtnText}>▼</Text>
      </TouchableOpacity>
      {/* Left */}
      <TouchableOpacity
        onPress={() => press("left")}
        style={[
          styles.dpadBtn,
          {
            width: btnSize,
            height: btnSize,
            left: 0,
            top: size / 2 - btnSize / 2,
            backgroundColor: color,
          },
        ]}
        testID={`ghost-${ghostId}-left`}
      >
        <Text style={styles.dpadBtnText}>◀</Text>
      </TouchableOpacity>
      {/* Right */}
      <TouchableOpacity
        onPress={() => press("right")}
        style={[
          styles.dpadBtn,
          {
            width: btnSize,
            height: btnSize,
            right: 0,
            top: size / 2 - btnSize / 2,
            backgroundColor: color,
          },
        ]}
        testID={`ghost-${ghostId}-right`}
      >
        <Text style={styles.dpadBtnText}>▶</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function GameScreen() {
  const router = useRouter();
  const {
    state,
    setGhostDirection,
    selectGhost,
    togglePause,
    advanceLevel,
    retryLevel,
    startNewGame,
  } = useGhostMaze();

  const [soundOn, setSoundOn] = useState(true);
  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    getSoundEngine().setEnabled(next);
    if (!next) getSoundEngine().stopMusic();
    else getSoundEngine().startMusic();
  };

  // Stop music when leaving game screen
  useEffect(() => {
    return () => {
      getSoundEngine().stopMusic();
    };
  }, []);

  const { width: screenW, height: screenH } = Dimensions.get("window");

  // Compute cell size to fit width and ~52% of height
  const maxMazeW = screenW - 16;
  const maxMazeH = screenH * 0.5;
  const cellSize = Math.floor(
    Math.min(maxMazeW / MAZE_COLS, maxMazeH / MAZE_ROWS),
  );

  // Dpad size based on remaining space
  const dpadSize = Math.min(
    (screenW - 48) / 2,
    (screenH - cellSize * MAZE_ROWS - 160) / 2,
  );

  // Auto-advance level after a short pause
  useEffect(() => {
    if (state.status === "levelWon") {
      const t = setTimeout(() => advanceLevel(), 2500);
      return () => clearTimeout(t);
    }
    if (state.status === "levelLost") {
      const t = setTimeout(() => retryLevel(), 2500);
      return () => clearTimeout(t);
    }
  }, [state.status, advanceLevel, retryLevel]);

  return (
    <SafeAreaView style={styles.container} testID="game-screen">
      {/* HUD */}
      <View style={styles.hud} testID="game-hud">
        <View style={styles.hudCell}>
          <Text style={styles.hudLabel}>LEVEL</Text>
          <Text style={styles.hudValue} testID="hud-level">
            {state.level}
          </Text>
        </View>
        <View style={styles.hudCell}>
          <Text style={styles.hudLabel}>SCORE</Text>
          <Text style={styles.hudValue} testID="hud-score">
            {state.score}
          </Text>
        </View>
        <View style={styles.hudCell}>
          <Text style={styles.hudLabel}>CATCHES</Text>
          <Text style={styles.hudValue} testID="hud-catches">
            {state.catches}/3
          </Text>
        </View>
        <View style={styles.hudCell}>
          <Text style={styles.hudLabel}>LIVES</Text>
          <View style={styles.livesRow}>
            {Array.from({ length: state.lives }).map((_, i) => (
              <View
                key={i}
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 7,
                  backgroundColor: COLORS.pelletGuy,
                  marginRight: 3,
                }}
              />
            ))}
          </View>
        </View>
      </View>

      {/* Pellets bar */}
      <View style={styles.pelletsBar} testID="pellets-bar">
        <View
          style={[
            styles.pelletsFill,
            {
              width: `${
                state.totalPellets > 0
                  ? Math.round((state.pelletsRemaining / state.totalPellets) * 100)
                  : 0
              }%`,
            },
          ]}
        />
        <Text style={styles.pelletsText} testID="pellets-text">
          PELLETS: {state.pelletsRemaining}/{state.totalPellets}
        </Text>
      </View>

      {/* Maze */}
      <View style={styles.mazeWrap}>
        <MazeRenderer
          maze={state.maze}
          ghosts={state.ghosts}
          pelletGuy={state.pelletGuy}
          cellSize={cellSize}
          selectedGhostId={state.selectedGhostId}
          ready={state.status === "ready"}
          level={state.level}
        />
        {/* Overlay messages */}
        {state.message !== "" && (
          <View style={[styles.overlay, { pointerEvents: "box-none" }]}>
            <Text style={styles.overlayText} testID="overlay-message">
              {state.message}
            </Text>
            {(state.status === "gameOver") && (
              <View style={{ marginTop: 12 }}>
                <TouchableOpacity
                  style={styles.btn}
                  onPress={() => startNewGame()}
                  testID="restart-btn"
                >
                  <Text style={styles.btnText}>PLAY AGAIN</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, { marginTop: 8 }]}
                  onPress={() => router.replace("/")}
                  testID="menu-btn"
                >
                  <Text style={styles.btnText}>MAIN MENU</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Controls - 2x2 grid of mini D-pads */}
      <View style={styles.controls} testID="controls">
        <View style={styles.controlRow}>
          <GhostDpad
            ghostId={0}
            color={COLORS.ghosts[0]}
            name={COLORS.ghostNames[0]}
            alive={state.ghosts[0]?.alive ?? false}
            selected={state.selectedGhostId === 0}
            onDirection={(d) => setGhostDirection(0, d)}
            onSelect={() => selectGhost(0)}
            size={dpadSize}
          />
          <GhostDpad
            ghostId={1}
            color={COLORS.ghosts[1]}
            name={COLORS.ghostNames[1]}
            alive={state.ghosts[1]?.alive ?? false}
            selected={state.selectedGhostId === 1}
            onDirection={(d) => setGhostDirection(1, d)}
            onSelect={() => selectGhost(1)}
            size={dpadSize}
          />
        </View>
        <View style={styles.controlRow}>
          <GhostDpad
            ghostId={2}
            color={COLORS.ghosts[2]}
            name={COLORS.ghostNames[2]}
            alive={state.ghosts[2]?.alive ?? false}
            selected={state.selectedGhostId === 2}
            onDirection={(d) => setGhostDirection(2, d)}
            onSelect={() => selectGhost(2)}
            size={dpadSize}
          />
          <GhostDpad
            ghostId={3}
            color={COLORS.ghosts[3]}
            name={COLORS.ghostNames[3]}
            alive={state.ghosts[3]?.alive ?? false}
            selected={state.selectedGhostId === 3}
            onDirection={(d) => setGhostDirection(3, d)}
            onSelect={() => selectGhost(3)}
            size={dpadSize}
          />
        </View>
      </View>

      {/* Bottom action row */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.smallBtn}
          onPress={() => {
            getSoundEngine().uiClick();
            togglePause();
          }}
          testID="pause-btn"
        >
          <Text style={styles.smallBtnText}>
            {state.status === "paused" ? "RESUME" : "PAUSE"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.smallBtn}
          onPress={toggleSound}
          testID="sound-btn"
        >
          <Text style={styles.smallBtnText}>
            {soundOn ? "🔊 SOUND" : "🔇 MUTED"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.smallBtn}
          onPress={() => {
            getSoundEngine().uiClick();
            getSoundEngine().stopMusic();
            router.replace("/");
          }}
          testID="quit-btn"
        >
          <Text style={styles.smallBtnText}>QUIT</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.uiBg,
    alignItems: "center",
  },
  hud: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: COLORS.uiPanel,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.uiBorder,
  },
  hudCell: {
    alignItems: "center",
    minWidth: 60,
  },
  hudLabel: {
    color: "#FFFF00",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  hudValue: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
    fontVariant: ["tabular-nums"],
  },
  livesRow: {
    flexDirection: "row",
    marginTop: 4,
    minHeight: 16,
  },
  pelletsBar: {
    height: 18,
    width: "100%",
    backgroundColor: "#000",
    borderBottomWidth: 2,
    borderBottomColor: COLORS.uiBorder,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  pelletsFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "#5a3a00",
  },
  pelletsText: {
    color: "#FFB897",
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 1,
    zIndex: 2,
  },
  mazeWrap: {
    marginTop: 6,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  overlayText: {
    color: "#FFFF00",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    letterSpacing: 1,
    lineHeight: 26,
  },
  controls: {
    marginTop: 8,
    width: "100%",
    paddingHorizontal: 8,
    flex: 1,
    justifyContent: "center",
  },
  controlRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 4,
  },
  dpadContainer: {
    position: "relative",
    backgroundColor: "#0a0a18",
    borderWidth: 2,
    borderRadius: 12,
  },
  ghostLabel: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -28 }, { translateY: -10 }],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 1,
  },
  ghostLabelText: {
    color: "#000",
    fontSize: 9,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  dpadBtn: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  dpadBtnText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 16,
  },
  bottomBar: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 16,
    justifyContent: "space-between",
    width: "100%",
  },
  smallBtn: {
    backgroundColor: COLORS.uiPanel,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.uiBorder,
  },
  smallBtnText: {
    color: "#FFFF00",
    fontWeight: "bold",
    letterSpacing: 1,
    fontSize: 12,
  },
  btn: {
    backgroundColor: COLORS.uiPanel,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.uiBorder,
  },
  btnText: {
    color: "#FFFF00",
    fontWeight: "bold",
    letterSpacing: 1,
    fontSize: 16,
  },
});
