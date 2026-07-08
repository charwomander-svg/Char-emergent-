import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Easing, Text } from "react-native";
import type { CellType, Ghost, PelletGuy } from "@/src/game/types";
import type { BonusGameState } from "@/src/game/bonusGame";
import { BONUS_CONFIG } from "@/src/game/bonusGame";
import { COLORS, SPEED } from "@/src/game/constants";

interface Props {
  maze: CellType[][];
  ghosts: Ghost[];
  pelletGuy: PelletGuy;
  cellSize: number;
  selectedGhostId: number;
  ready: boolean;
  level: number;
  bonusGame?: BonusGameState | null;
  highContrast?: boolean;
}

function getWallPalette(level: number) {
  const tier = Math.floor((Math.max(1, level) - 1) / 10) % 5;
  switch (tier) {
    case 1:
      return { wall: "#0E8A2D", wallInner: "#42D96B" };
    case 2:
      return { wall: "#9E1A1A", wallInner: "#FF5A5A" };
    case 3:
      return { wall: "#5A22A6", wallInner: "#B47CFF" };
    case 4:
      return { wall: "#121212", wallInner: "#555555" };
    default:
      return { wall: COLORS.wall, wallInner: COLORS.wallInner };
  }
}

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

function useChompAnimation(duration = 120) {
  const chompAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(chompAnim, { toValue: 0, duration, useNativeDriver: true }),
        Animated.timing(chompAnim, { toValue: 1, duration, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [chompAnim, duration]);

  return chompAnim;
}

// Cell renderer - memoized for performance
const Cell = React.memo(function Cell({
  type,
  size,
  wallColor,
  wallInnerColor,
}: {
  type: CellType;
  size: number;
  wallColor: string;
  wallInnerColor: string;
}) {
  if (type === 1) {
    // wall
    return (
      <View
        style={[
          styles.wall,
          {
            width: size,
            height: size,
            borderRadius: Math.max(2, size * 0.18),
            backgroundColor: wallColor,
            borderColor: wallInnerColor,
          },
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
  highContrast = false,
}: {
  ghost: Ghost;
  size: number;
  selected: boolean;
  ready: boolean;
  moveDuration: number;
  highContrast?: boolean;
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
            borderColor: highContrast ? "#FFFF00" : "#FFFFFF",
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
  highContrast = false,
}: {
  pg: PelletGuy;
  size: number;
  moveDuration: number;
  visualScale?: number;
  highContrast?: boolean;
}) {
  const { animX, animY } = useSmoothPosition(pg.x, pg.y, moveDuration, size);

  // Chomp animation runs on the native thread — completely decoupled from JS
  // game-loop renders so it never blinks or stutters. Must be before early return.
  const chompAnim = useChompAnimation();

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
          borderWidth: highContrast ? 2 : 0,
          borderColor: highContrast ? "#111111" : "transparent",
          transform: [{ rotate: rotation }],
          overflow: "hidden",
        }}
      >
        {/* Mouth — opacity animated on native thread */}
        <Animated.View
          style={{
            opacity: chompAnim,
            position: "absolute",
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
          }}
        >
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
        </Animated.View>
      </View>
    </Animated.View>
  );
});

export default function MazeRenderer({
  maze,
  ghosts,
  pelletGuy,
  cellSize,
  selectedGhostId,
  ready,
  level,
  bonusGame,
  highContrast = false,
}: Props) {
  if (!maze || !maze.length || !maze[0]) return null;
  const width = maze[0].length * cellSize;
  const height = maze.length * cellSize;
  const scale = speedScale(level);
  const pgDuration = SPEED.pelletGuy * scale;
  const ghostNormalDuration = SPEED.ghost * scale;
  const ghostVulnDuration = SPEED.ghostVulnerable * scale;
  const wallPalette = getWallPalette(level);

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
            <Cell
              key={x}
              type={cell}
              size={cellSize}
              wallColor={wallPalette.wall}
              wallInnerColor={wallPalette.wallInner}
            />
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
        {/* Bonus game items — enemy Pellet Guys (flags stay as emoji) */}
        {bonusGame &&
          bonusGame.items
            .filter((item) => !item.collected)
            .map((item, idx) =>
              bonusGame.type === "rallyRound" ? (
                <BonusItemSprite
                  key={idx}
                  x={item.x}
                  y={item.y}
                  size={cellSize}
                  emoji={BONUS_CONFIG.rallyRound.emoji}
                  moveDuration={pgDuration}
                  moving={false}
                />
              ) : (
                <EnemyPelletGuySprite
                  key={idx}
                  x={item.x}
                  y={item.y}
                  dir={item.dir ?? "left"}
                  size={cellSize}
                  moveDuration={bonusGame.type === "digDugDash" ? pgDuration : ghostNormalDuration}
                  pumpCount={item.pumpCount ?? 0}
                />
              )
            )}
        {/* Galaga projectile */}
        {bonusGame?.projectile && (
          <BonusItemSprite
            key="projectile"
            x={bonusGame.projectile.x}
            y={bonusGame.projectile.y}
            size={cellSize}
            emoji="⚡"
            moveDuration={ghostNormalDuration}
            moving={false}
          />
        )}
        {/* Pellet Guy — hidden during bonus rounds */}
        {!bonusGame && (
          <PelletGuySprite
            pg={pelletGuy}
            size={cellSize}
            moveDuration={pgDuration}
            visualScale={1}
            highContrast={highContrast}
          />
        )}
        {ghosts
          .filter((g) => !bonusGame || g.id === selectedGhostId)
          .map((g) => (
          <GhostSprite
            key={g.id}
            ghost={g}
            size={cellSize}
            selected={g.id === selectedGhostId}
            ready={ready}
            moveDuration={g.vulnerable ? ghostVulnDuration : ghostNormalDuration}
            highContrast={highContrast}
          />
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Bonus item — a simple emoji overlay rendered at a fixed grid cell
// (for flags, targets) or with smooth movement (for Pookas).
// ---------------------------------------------------------------------------
const BonusItemSprite = React.memo(function BonusItemSprite({
  x,
  y,
  size,
  emoji,
  moveDuration,
  moving,
}: {
  x: number;
  y: number;
  size: number;
  emoji: string;
  moveDuration: number;
  moving: boolean;
}) {
  const { animX, animY } = useSmoothPosition(x, y, moving ? moveDuration : 0, size);
  return (
    <Animated.View
      style={[
        styles.entity,
        {
          width: size,
          height: size,
          transform: [
            { translateX: animX },
            { translateY: animY },
          ],
          pointerEvents: "none",
          alignItems: "center",
          justifyContent: "center",
        },
      ]}
    >
      <Text style={{ fontSize: size * 0.6, lineHeight: size }}>{emoji}</Text>
    </Animated.View>
  );
});

// Enemy Pellet Guy — same yellow chomping face as PelletGuy but tinted
// progressively red as pump count increases (Dig Dug inflation effect).
const EnemyPelletGuySprite = React.memo(function EnemyPelletGuySprite({
  x,
  y,
  dir,
  size,
  moveDuration,
  pumpCount,
}: {
  x: number;
  y: number;
  dir: string;
  size: number;
  moveDuration: number;
  pumpCount: number;
}) {
  const { animX, animY } = useSmoothPosition(x, y, moveDuration, size);
  const chompAnim = useChompAnimation(150);
  const rotation = dir === "right" ? "0deg"
    : dir === "down" ? "90deg"
    : dir === "left" ? "180deg"
    : "270deg";
  // Tint: normal=yellow, 1 pump=orange, 2 pumps=red (already popped)
  const faceColor = pumpCount >= 1 ? "#ff8800" : COLORS.pelletGuy;
  // Inflate scale: 1 pump = 1.15x
  const inflateScale = 1 + pumpCount * 0.15;
  return (
    <Animated.View
      style={[
        styles.entity,
        {
          width: size,
          height: size,
          transform: [{ translateX: animX }, { translateY: animY }],
          pointerEvents: "none",
        },
      ]}
    >
      <View
        style={{
          width: size * 0.85 * inflateScale,
          height: size * 0.85 * inflateScale,
          margin: size * 0.075,
          borderRadius: (size * 0.425) * inflateScale,
          backgroundColor: faceColor,
          transform: [{ rotate: rotation }],
          overflow: "hidden",
        }}
      >
        <Animated.View
          style={{
            opacity: chompAnim,
            position: "absolute",
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
          }}
        >
          <>
            <View
              style={{
                position: "absolute",
                left: size * 0.425 * inflateScale,
                top: 0,
                width: size * 0.5 * inflateScale,
                height: size * 0.425 * inflateScale,
                backgroundColor: COLORS.background,
                transform: [{ skewY: "-25deg" }],
                transformOrigin: "left bottom",
              } as any}
            />
            <View
              style={{
                position: "absolute",
                left: size * 0.425 * inflateScale,
                top: size * 0.425 * inflateScale,
                width: size * 0.5 * inflateScale,
                height: size * 0.425 * inflateScale,
                backgroundColor: COLORS.background,
                transform: [{ skewY: "25deg" }],
                transformOrigin: "left top",
              } as any}
            />
          </>
        </Animated.View>
      </View>
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
