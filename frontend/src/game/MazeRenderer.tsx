import React from "react";
import { View, StyleSheet } from "react-native";
import type { CellType, Ghost, PelletGuy } from "@/src/game/types";
import { COLORS } from "@/src/game/constants";

interface Props {
  maze: CellType[][];
  ghosts: Ghost[];
  pelletGuy: PelletGuy;
  cellSize: number;
  selectedGhostId: number;
  ready: boolean;
}

// Cell renderer - memoized for performance
const Cell = React.memo(function Cell({
  type,
  size,
}: {
  type: CellType;
  size: number;
}) {
  if (type === 1) {
    // wall
    return (
      <View
        style={[
          styles.wall,
          { width: size, height: size, borderRadius: Math.max(2, size * 0.18) },
        ]}
      />
    );
  }
  if (type === 2) {
    // pellet
    const dot = Math.max(2, Math.floor(size * 0.22));
    return (
      <View
        style={[
          styles.cellCenter,
          { width: size, height: size },
        ]}
      >
        <View
          style={{
            width: dot,
            height: dot,
            borderRadius: dot / 2,
            backgroundColor: COLORS.pellet,
          }}
        />
      </View>
    );
  }
  if (type === 3) {
    // super pellet
    const dot = Math.max(6, Math.floor(size * 0.55));
    return (
      <View style={[styles.cellCenter, { width: size, height: size }]}>
        <View
          style={{
            width: dot,
            height: dot,
            borderRadius: dot / 2,
            backgroundColor: COLORS.superPellet,
          }}
        />
      </View>
    );
  }
  if (type === 4) {
    // ghost house - subtle marker
    return (
      <View
        style={[
          styles.cellCenter,
          { width: size, height: size, backgroundColor: "#000" },
        ]}
      >
        <View
          style={{
            width: size * 0.8,
            height: 2,
            backgroundColor: "#222244",
          }}
        />
      </View>
    );
  }
  // empty / pellet eaten
  return <View style={{ width: size, height: size }} />;
});

// Ghost sprite
const GhostSprite = React.memo(function GhostSprite({
  ghost,
  size,
  selected,
  ready,
}: {
  ghost: Ghost;
  size: number;
  selected: boolean;
  ready: boolean;
}) {
  const blink = ghost.vulnerable && ghost.vulnerableUntil - performance.now() < 2000;
  const color = !ghost.alive
    ? "transparent"
    : ghost.vulnerable
    ? blink && Math.floor(performance.now() / 200) % 2 === 0
      ? COLORS.ghostVulnerableEnd
      : COLORS.ghostVulnerable
    : ghost.color;

  const bodyRadius = size * 0.45;
  const eyeSize = Math.max(3, size * 0.22);
  const pupilSize = Math.max(2, size * 0.1);

  // Eye direction offset
  const eyeOffset = (() => {
    switch (ghost.direction) {
      case "up":
        return { x: 0, y: -1 };
      case "down":
        return { x: 0, y: 1 };
      case "left":
        return { x: -1, y: 0 };
      case "right":
        return { x: 1, y: 0 };
      default:
        return { x: 0, y: 0 };
    }
  })();

  return (
    <View
      style={[
        styles.entity,
        {
          width: size,
          height: size,
          left: ghost.x * size,
          top: ghost.y * size,
          pointerEvents: "none",
        },
      ]}
    >
      {/* Selection ring */}
      {selected && ghost.alive && (
        <View
          style={{
            position: "absolute",
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 2,
            borderColor: "#FFFFFF",
            opacity: 0.85,
          }}
        />
      )}
      {/* Ghost body */}
      {ghost.alive && (
        <>
          {/* Identity outline (visible especially when vulnerable) */}
          {ghost.vulnerable && (
            <View
              style={{
                position: "absolute",
                left: size * 0.08,
                top: size * 0.08,
                width: size * 0.84,
                height: size * 0.8,
                borderTopLeftRadius: bodyRadius * 1.1,
                borderTopRightRadius: bodyRadius * 1.1,
                borderWidth: 2,
                borderColor: ghost.color,
                opacity: 0.95,
              }}
            />
          )}
          <View
            style={{
              position: "absolute",
              left: size * 0.1,
              top: size * 0.1,
              width: size * 0.8,
              height: size * 0.55,
              borderTopLeftRadius: bodyRadius,
              borderTopRightRadius: bodyRadius,
              backgroundColor: color,
            }}
          />
          {/* Color tuft on top of head - always shows original color */}
          <View
            style={{
              position: "absolute",
              left: size * 0.38,
              top: size * 0.0,
              width: size * 0.24,
              height: size * 0.18,
              borderRadius: size * 0.12,
              backgroundColor: ghost.color,
              borderWidth: 1.5,
              borderColor: "#000000",
            }}
          />
          <View
            style={{
              position: "absolute",
              left: size * 0.1,
              top: size * 0.55,
              width: size * 0.8,
              height: size * 0.3,
              backgroundColor: color,
              flexDirection: "row",
              justifyContent: "space-between",
            }}
          />
          {/* zig-zag bottom */}
          <View
            style={{
              position: "absolute",
              left: size * 0.1,
              top: size * 0.7,
              width: size * 0.8,
              flexDirection: "row",
            }}
          >
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={{
                  width: size * 0.2,
                  height: size * 0.18,
                  backgroundColor: color,
                  borderBottomLeftRadius: size * 0.1,
                  borderBottomRightRadius: size * 0.1,
                  marginTop: i % 2 === 0 ? 0 : -size * 0.02,
                }}
              />
            ))}
          </View>
          {/* Eyes */}
          <View
            style={{
              position: "absolute",
              left: size * 0.22,
              top: size * 0.28,
              width: eyeSize,
              height: eyeSize,
              borderRadius: eyeSize / 2,
              backgroundColor: ghost.vulnerable ? ghost.color : "#FFFFFF",
              borderWidth: ghost.vulnerable ? 1 : 0,
              borderColor: "#FFFFFF",
            }}
          >
            {!ghost.vulnerable && (
              <View
                style={{
                  position: "absolute",
                  left: eyeSize / 2 - pupilSize / 2 + eyeOffset.x * 2,
                  top: eyeSize / 2 - pupilSize / 2 + eyeOffset.y * 2,
                  width: pupilSize,
                  height: pupilSize,
                  borderRadius: pupilSize / 2,
                  backgroundColor: COLORS.ghostPupil,
                }}
              />
            )}
          </View>
          <View
            style={{
              position: "absolute",
              right: size * 0.22,
              top: size * 0.28,
              width: eyeSize,
              height: eyeSize,
              borderRadius: eyeSize / 2,
              backgroundColor: ghost.vulnerable ? ghost.color : "#FFFFFF",
              borderWidth: ghost.vulnerable ? 1 : 0,
              borderColor: "#FFFFFF",
            }}
          >
            {!ghost.vulnerable && (
              <View
                style={{
                  position: "absolute",
                  left: eyeSize / 2 - pupilSize / 2 + eyeOffset.x * 2,
                  top: eyeSize / 2 - pupilSize / 2 + eyeOffset.y * 2,
                  width: pupilSize,
                  height: pupilSize,
                  borderRadius: pupilSize / 2,
                  backgroundColor: COLORS.ghostPupil,
                }}
              />
            )}
          </View>
          {/* Vulnerable mouth */}
          {ghost.vulnerable && (
            <View
              style={{
                position: "absolute",
                left: size * 0.3,
                top: size * 0.5,
                width: size * 0.4,
                height: size * 0.08,
                backgroundColor: "#FFFFFF",
              }}
            />
          )}
        </>
      )}
    </View>
  );
});

// Pellet Guy sprite (classic Pac-Man yellow circle with mouth)
const PelletGuySprite = React.memo(function PelletGuySprite({
  pg,
  size,
}: {
  pg: PelletGuy;
  size: number;
}) {
  if (!pg.alive) {
    // explosion / star
    return (
      <View
        style={[
          styles.entity,
          {
            width: size,
            height: size,
            left: pg.x * size,
            top: pg.y * size,
            justifyContent: "center",
            alignItems: "center",
            pointerEvents: "none",
          },
        ]}
      >
        <View
          style={{
            width: size * 0.4,
            height: size * 0.4,
            borderRadius: size * 0.2,
            backgroundColor: COLORS.danger,
            opacity: 0.7,
          }}
        />
      </View>
    );
  }

  // mouth rotation by direction
  const rotation = (() => {
    switch (pg.direction) {
      case "right":
        return "0deg";
      case "down":
        return "90deg";
      case "left":
        return "180deg";
      case "up":
        return "270deg";
      default:
        return "0deg";
    }
  })();

  // Mouth toggle (chomp animation)
  const chomp = Math.floor(performance.now() / 120) % 2 === 0;

  return (
    <View
      style={[
        styles.entity,
        {
          width: size,
          height: size,
          left: pg.x * size,
          top: pg.y * size,
          pointerEvents: "none",
        },
      ]}
    >
      <View
        style={{
          width: size * 0.85,
          height: size * 0.85,
          margin: size * 0.075,
          borderRadius: size * 0.425,
          backgroundColor: COLORS.pelletGuy,
          transform: [{ rotate: rotation }],
          overflow: "hidden",
        }}
      >
        {chomp && (
          <>
            <View
              style={{
                position: "absolute",
                left: size * 0.425,
                top: 0,
                width: size * 0.5,
                height: size * 0.425,
                backgroundColor: COLORS.background,
                transform: [{ skewY: "-25deg" }],
                transformOrigin: "left bottom",
              } as any}
            />
            <View
              style={{
                position: "absolute",
                left: size * 0.425,
                top: size * 0.425,
                width: size * 0.5,
                height: size * 0.425,
                backgroundColor: COLORS.background,
                transform: [{ skewY: "25deg" }],
                transformOrigin: "left top",
              } as any}
            />
          </>
        )}
      </View>
    </View>
  );
});

export default function MazeRenderer({
  maze,
  ghosts,
  pelletGuy,
  cellSize,
  selectedGhostId,
  ready,
}: Props) {
  const width = maze[0].length * cellSize;
  const height = maze.length * cellSize;

  return (
    <View
      style={[
        styles.maze,
        {
          width,
          height,
        },
      ]}
      testID="maze-board"
    >
      {/* Grid of cells - rendered row-by-row with flexbox */}
      {maze.map((row, y) => (
        <View key={y} style={{ flexDirection: "row" }}>
          {row.map((cell, x) => (
            <Cell key={x} type={cell} size={cellSize} />
          ))}
        </View>
      ))}

      {/* Entities layer */}
      <View
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width,
          height,
          pointerEvents: "none",
        }}
      >
        <PelletGuySprite pg={pelletGuy} size={cellSize} />
        {ghosts.map((g) => (
          <GhostSprite
            key={g.id}
            ghost={g}
            size={cellSize}
            selected={g.id === selectedGhostId}
            ready={ready}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  maze: {
    backgroundColor: COLORS.background,
    position: "relative",
  },
  wall: {
    backgroundColor: COLORS.wall,
    borderWidth: 1,
    borderColor: COLORS.wallInner,
  },
  cellCenter: {
    justifyContent: "center",
    alignItems: "center",
  },
  entity: {
    position: "absolute",
  },
});
