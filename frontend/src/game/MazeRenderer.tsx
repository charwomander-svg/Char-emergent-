import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Easing } from "react-native";
import type { CellType, Ghost, PelletGuy } from "@/src/game/types";
import { COLORS, SPEED } from "@/src/game/constants";
import {
(interface Props {
  maze: CellType[][];
  ghosts: Ghost[];
  pelletGuy: PelletGuy;
  cellSize: number;
  selectedGhostId: number;
  ready: boolean;
  level: number;
  boss?: BossState | null;
}

export const MazeRenderer: React.FC<Props> = React.memo(({
  maze,
  ghosts,
  pelletGuy,
  cellSize,
  selectedGhostId,
  ready,
  level,
  boss
}) => {
  
  // 💡 ADD THIS GUARD CLAUSE TO PREVENT THE CRASH
  if (!maze || !maze.length || !maze[0]) {

// Smooth position hook — interpolates grid coords to pixel coords with
// Animated.Value. Falls back to snap for non-adjacent jumps (respawn).
function useSmoothPosition(
  x: number,
  y: number,
  duration: number,
  cellSize: number,
) {
  const animX = useRef(new Animated.Value(x * cellSize)).current;
  const animY = useRef(new Animated.Value(y * cellSize)).current;
  const prevX = useRef(x);
  const prevY = useRef(y);
  const prevCellSize = useRef(cellSize);

  useEffect(() => {
    const dx = x - prevX.current;
    const dy = y - prevY.current;
    const sizeChanged = prevCellSize.current !== cellSize;
    const isAdjacent = Math.abs(dx) <= 1 && Math.abs(dy) <= 1 && (dx !== 0 || dy !== 0);

    if (sizeChanged || !isAdjacent) {
      animX.setValue(x * cellSize);
      animY.setValue(y * cellSize);
    } else {
      Animated.parallel([
        Animated.timing(animX, {
          toValue: x * cellSize,
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(animY, {
          toValue: y * cellSize,
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ]).start();
    }
    prevX.current = x;
    prevY.current = y;
    prevCellSize.current = cellSize;
  }, [x, y, cellSize, duration, animX, animY]);

  return { animX, animY };
}

function speedScale(level: number): number {
  return Math.max(0.55, 1 - (level - 1) * 0.05);
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
  if (type === 6) {
    // spike trap - red triangle X
    const sp = Math.max(4, size * 0.3);
    return (
      <View style={[styles.cellCenter, { width: size, height: size }]}>
        <View
          style={{
            width: sp,
            height: sp,
            backgroundColor: "#FF1144",
            transform: [{ rotate: "45deg" }],
            borderWidth: 1,
            borderColor: "#FFFF00",
          }}
        />
      </View>
    );
  }
  if (type === 7) {
    // barricade - striped brown/red wall
    const bw = size * 0.86;
    const bh = size * 0.86;
    return (
      <View style={[styles.cellCenter, { width: size, height: size }]}>
        <View
          style={{
            width: bw,
            height: bh,
            backgroundColor: "#8B4513",
            borderWidth: 2,
            borderColor: "#FF8C00",
            borderRadius: 3,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: bw * 0.8,
              height: 2,
              backgroundColor: "#FF8C00",
              marginBottom: 2,
            }}
          />
          <View
            style={{
              width: bw * 0.8,
              height: 2,
              backgroundColor: "#FF8C00",
            }}
          />
        </View>
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
  moveDuration,
}: {
  ghost: Ghost;
  size: number;
  selected: boolean;
  ready: boolean;
  moveDuration: number;
}) {
  const { animX, animY } = useSmoothPosition(ghost.x, ghost.y, moveDuration, size);

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
    <Animated.View
      style={[
        styles.entity,
        {
          width: size,
          height: size,
          left: 0,
          top: 0,
          transform: [
            { translateX: animX },
            { translateY: animY },
          ],
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
    </Animated.View>
  );
});

// Pellet Guy sprite (classic Pac-Man yellow circle with mouth)
const PelletGuySprite = React.memo(function PelletGuySprite({
  pg,
  size,
  moveDuration,
  visualScale = 1,
}: {
  pg: PelletGuy;
  size: number;
  moveDuration: number;
  visualScale?: number;
}) {
  const { animX, animY } = useSmoothPosition(pg.x, pg.y, moveDuration, size);

  if (!pg.alive) {
    // explosion / star
    return (
      <Animated.View
        style={[
          styles.entity,
          {
            width: size,
            height: size,
            left: 0,
            top: 0,
            transform: [
              { translateX: animX },
              { translateY: animY },
            ],
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
      </Animated.View>
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
    <Animated.View
      style={[
        styles.entity,
        {
          width: size,
          height: size,
          left: 0,
          top: 0,
          transform: [
            { translateX: animX },
            { translateY: animY },
            { scale: visualScale },
          ],
          pointerEvents: "none",
          zIndex: visualScale > 1 ? 2 : 1,
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
    </Animated.View>
  );
});

export default function Renderer({
  maze,
  ghosts,
  pelletGuy,
  cellSize,
  selectedGhostId,
  ready,
  level,
  boss,
}: Props) {
  const width = maze[0].length * cellSize;
  const height = maze.length * cellSize;
  const scale = speedScale(level);
  const pgDuration = SPEED.pelletGuy * scale;
  const ghostNormalDuration = SPEED.ghost * scale;
  const ghostVulnDuration = SPEED.ghostVulnerable * scale;

  // Boss visuals — aura tint + sprite scale + active lunge flash.
  const bossScale = bossVisualScale(boss ?? null);
  const aura = bossAuraColor(boss ?? null);
  const lunging = bossIsLunging(boss ?? null, performance.now());

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
        {/* Boss aura beneath Pellet Guy (pulses red while lunging) */}
        {boss && aura && pelletGuy.alive && (
          <BossAuraSprite
            x={pelletGuy.x}
            y={pelletGuy.y}
            size={cellSize}
            scale={bossScale + (lunging ? 0.25 : 0)}
            color={aura}
            lunging={lunging}
            moveDuration={pgDuration}
          />
        )}
        <PelletGuySprite
          pg={pelletGuy}
          size={cellSize}
          moveDuration={pgDuration}
          visualScale={bossScale}
        />
        {ghosts.map((g) => (
          <GhostSprite
            key={g.id}
            ghost={g}
            size={cellSize}
            selected={g.id === selectedGhostId}
            ready={ready}
            moveDuration={g.vulnerable ? ghostVulnDuration : ghostNormalDuration}
          />
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Boss aura — a soft animated circle behind the Pellet Guy showing the phase
// color and pulsing while a phase-3 lunge is active.
// ---------------------------------------------------------------------------
const BossAuraSprite = React.memo(function BossAuraSprite({
  x,
  y,
  size,
  scale,
  color,
  lunging,
  moveDuration,
}: {
  x: number;
  y: number;
  size: number;
  scale: number;
  color: string;
  lunging: boolean;
  moveDuration: number;
}) {
  const { animX, animY } = useSmoothPosition(x, y, moveDuration, size);
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  const auraSize = size * scale * 1.5;
  const offset = (auraSize - size) / 2;
  const opacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: lunging ? [0.55, 0.95] : [0.25, 0.55],
  });

  return (
    <Animated.View
      style={[
        styles.entity,
        {
          width: size,
          height: size,
          left: -offset,
          top: -offset,
          transform: [
            { translateX: animX },
            { translateY: animY },
          ],
          pointerEvents: "none",
        },
      ]}
    >
      <Animated.View
        style={{
          width: auraSize,
          height: auraSize,
          borderRadius: auraSize / 2,
          backgroundColor: color,
          opacity,
          shadowColor: color,
          shadowOpacity: 1,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 0 },
        }}
      />
    </Animated.View>
  );
});

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
