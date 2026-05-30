// Web Gamepad API integration for Ghost Maze
// Polls connected gamepads at 60Hz and dispatches direction/ghost-select events.
// Mapping (standard gamepad layout):
//   D-pad up/down/left/right OR Left stick → directional input for selected ghost
//   A/B/X/Y face buttons → select ghost 0/1/2/3 (Blinky/Pinky/Inky/Clyde)
//   LB/RB → cycle selected ghost prev/next
//
// Native (iOS/Android): Web Gamepad API not available. Hook gracefully no-ops.

import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import type { Direction, GhostId } from "./types";

const STICK_THRESHOLD = 0.55;
const DEBOUNCE_MS = 110;

interface Callbacks {
  onDirection: (ghostId, dir) => {
  inputQueueRef.current = { ghostId, dir };
  onSelect: (ghostId: GhostId) => void;
  getSelectedGhostId: () => GhostId;
  enabled?: boolean;
}

interface ButtonState {
  dpadUp: boolean;
  dpadDown: boolean;
  dpadLeft: boolean;
  dpadRight: boolean;
  a: boolean;
  b: boolean;
  x: boolean;
  y: boolean;
  lb: boolean;
  rb: boolean;
}

const emptyState = (): ButtonState => ({
  dpadUp: false, dpadDown: false, dpadLeft: false, dpadRight: false,
  a: false, b: false, x: false, y: false, lb: false, rb: false,
});

export function useGamepad(cb: Callbacks) {
  const lastButtonStateRef = useRef<ButtonState>(emptyState());
  const lastDirectionTimeRef = useRef(0);
  const enabledRef = useRef(true);
  const cbRef = useRef(cb);
  cbRef.current = cb;

  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (typeof window === "undefined" || !navigator.getGamepads) return;

    let rafId: number | null = null;

    const poll = () => {
      try {
        const pads = navigator.getGamepads ? navigator.getGamepads() : [];
        const gp = Array.from(pads).find((p) => p && p.connected);
        if (gp && enabledRef.current) {
          const buttons = gp.buttons;
          const axes = gp.axes;

          // Direction: prefer dpad (buttons 12-15), fall back to left stick (axes 0,1)
          let dir: Direction | null = null;
          if (buttons[12]?.pressed) dir = "up";
          else if (buttons[13]?.pressed) dir = "down";
          else if (buttons[14]?.pressed) dir = "left";
          else if (buttons[15]?.pressed) dir = "right";
          else {
            const ax = axes[0] ?? 0;
            const ay = axes[1] ?? 0;
            if (Math.abs(ax) > STICK_THRESHOLD || Math.abs(ay) > STICK_THRESHOLD) {
              if (Math.abs(ax) > Math.abs(ay)) {
                dir = ax > 0 ? "right" : "left";
              } else {
                dir = ay > 0 ? "down" : "up";
              }
            }
          }

          const now = performance.now();
          if (dir && now - lastDirectionTimeRef.current > DEBOUNCE_MS) {
            queuedDirectionRef.current = dir;
            lastDirectionTimeRef.current = now;
          }

          // Face buttons -> select ghost (edge-triggered: only on press, not hold)
          const prev = lastButtonStateRef.current;
          const cur: ButtonState = {
            dpadUp: !!buttons[12]?.pressed,
            dpadDown: !!buttons[13]?.pressed,
            dpadLeft: !!buttons[14]?.pressed,
            dpadRight: !!buttons[15]?.pressed,
            a: !!buttons[0]?.pressed,
            b: !!buttons[1]?.pressed,
            x: !!buttons[2]?.pressed,
            y: !!buttons[3]?.pressed,
            lb: !!buttons[4]?.pressed,
            rb: !!buttons[5]?.pressed,
          };
          if (cur.a && !prev.a) cbRef.current.onSelect(0);
          if (cur.b && !prev.b) cbRef.current.onSelect(1);
          if (cur.x && !prev.x) cbRef.current.onSelect(2);
          if (cur.y && !prev.y) cbRef.current.onSelect(3);
          if (cur.lb && !prev.lb) {
            const id = ((cbRef.current.getSelectedGhostId() + 3) % 4) as GhostId;
            cbRef.current.onSelect(id);
          }
          if (cur.rb && !prev.rb) {
            const id = ((cbRef.current.getSelectedGhostId() + 1) % 4) as GhostId;
            cbRef.current.onSelect(id);
          }
          lastButtonStateRef.current = cur;
        }
      } catch {
        /* ignore polling errors */
      }
      rafId = requestAnimationFrame(poll);
    };

    rafId = requestAnimationFrame(poll);

    const onConnect = (e: Event) => {
      // eslint-disable-next-line no-console
      console.log("[GhostMaze] Gamepad connected:", (e as any).gamepad?.id);
    };
    const onDisconnect = (e: Event) => {
      // eslint-disable-next-line no-console
      console.log("[GhostMaze] Gamepad disconnected:", (e as any).gamepad?.id);
    };

    window.addEventListener("gamepadconnected", onConnect);
    window.addEventListener("gamepaddisconnected", onDisconnect);

    return () => {
      if (rafId != null) cancelAnimationFrame(rafId);
      window.removeEventListener("gamepadconnected", onConnect);
      window.removeEventListener("gamepaddisconnected", onDisconnect);
    };
  }, []);

  // Allow caller to toggle
  enabledRef.current = cb.enabled !== false;
}
