// Web Gamepad API integration for Ghost Maze
// Polls connected gamepads at 60Hz and dispatches direction/ghost-select events.
// Mapping (standard gamepad layout):
//   D-pad up/down/left/right OR Left stick → directional input for selected ghost
//   A/B/X/Y face buttons → select ghost 0/1/2/3 (Ember/Blush/Rime/Rust)
//   LB/RB → cycle selected ghost prev/next
//   Start/Menu → pause/resume
//   LT/RT or Back/View → primary action (bonus action / contextual game action)
//
// Native (iOS/Android): Web Gamepad API not available. Hook gracefully no-ops.

import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import type { Direction, GhostId } from "./types";

const STICK_THRESHOLD = 0.55;
const DEBOUNCE_MS = 110;

interface Callbacks {
  onDirection: (ghostId: GhostId, dir: Direction) => void;
  onSelect: (ghostId: GhostId) => void;
  onPause?: () => void;
  onAction?: () => void;
  getSelectedGhostId: () => GhostId;
  isGhostSelectable?: (ghostId: GhostId) => boolean;
  deadzone?: number;
  invertY?: boolean;
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
  lt: boolean;
  rt: boolean;
  back: boolean;
  start: boolean;
}

const emptyState = (): ButtonState => ({
  dpadUp: false, dpadDown: false, dpadLeft: false, dpadRight: false,
  a: false, b: false, x: false, y: false, lb: false, rb: false,
  lt: false, rt: false, back: false, start: false,
});

export function useGamepad(cb: Callbacks) {
  const lastButtonStateRef = useRef<ButtonState>(emptyState());
  const lastDirectionTimeRef = useRef(0);
  const enabledRef = useRef(true);
  const cbRef = useRef(cb);
  cbRef.current = cb;

  useEffect(() => {
    // Web Gamepad API is browser-only; never touch DOM listeners on native.
    if (Platform.OS !== "web") return;

    const domWindow = globalThis as typeof globalThis & {
      addEventListener?: (type: string, listener: (event: Event) => void) => void;
      removeEventListener?: (type: string, listener: (event: Event) => void) => void;
      navigator?: Navigator;
    };
    const addListener = domWindow.addEventListener;
    const removeListener = domWindow.removeEventListener;
    const nav = domWindow.navigator ?? (typeof navigator !== "undefined" ? navigator : undefined);
    if (
      typeof addListener !== "function" ||
      typeof removeListener !== "function" ||
      typeof nav?.getGamepads !== "function"
    ) {
      return;
    }

    let rafId: number | null = null;

    const poll = () => {
      try {
        const pads = nav.getGamepads ? nav.getGamepads() : [];
        const gp = Array.from(pads).find((p) => p && p.connected);
        if (gp && enabledRef.current) {
          const isSelectable = (ghostId: GhostId) =>
            cbRef.current.isGhostSelectable?.(ghostId) ?? true;
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
            const ay = (axes[1] ?? 0) * (cbRef.current.invertY ? -1 : 1);
            const deadzone = cbRef.current.deadzone ?? STICK_THRESHOLD;
            if (Math.abs(ax) > deadzone || Math.abs(ay) > deadzone) {
              if (Math.abs(ax) > Math.abs(ay)) {
                dir = ax > 0 ? "right" : "left";
              } else {
                dir = ay > 0 ? "down" : "up";
              }
            }
          }

          const now = performance.now();
          if (dir && now - lastDirectionTimeRef.current > DEBOUNCE_MS) {
            cbRef.current.onDirection(cbRef.current.getSelectedGhostId(), dir);
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
            lt: !!buttons[6]?.pressed,
            rt: !!buttons[7]?.pressed,
            back: !!buttons[8]?.pressed,
            start: !!buttons[9]?.pressed,
          };
          if (cur.a && !prev.a && isSelectable(0)) cbRef.current.onSelect(0);
          if (cur.b && !prev.b && isSelectable(1)) cbRef.current.onSelect(1);
          if (cur.x && !prev.x && isSelectable(2)) cbRef.current.onSelect(2);
          if (cur.y && !prev.y && isSelectable(3)) cbRef.current.onSelect(3);
          if (cur.lb && !prev.lb) {
            let id = cbRef.current.getSelectedGhostId();
            for (let step = 0; step < 4; step++) {
              id = ((id + 3) % 4) as GhostId;
              if (isSelectable(id)) break;
            }
            cbRef.current.onSelect(id);
          }
          if (cur.rb && !prev.rb) {
            let id = cbRef.current.getSelectedGhostId();
            for (let step = 0; step < 4; step++) {
              id = ((id + 1) % 4) as GhostId;
              if (isSelectable(id)) break;
            }
            cbRef.current.onSelect(id);
          }
          if (cur.start && !prev.start) cbRef.current.onPause?.();
          if ((cur.rt && !prev.rt) || (cur.lt && !prev.lt) || (cur.back && !prev.back)) {
            cbRef.current.onAction?.();
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
      console.log("[GhostMaze] Gamepad connected:", (e as any).gamepad?.id);
    };
    const onDisconnect = (e: Event) => {
      console.log("[GhostMaze] Gamepad disconnected:", (e as any).gamepad?.id);
    };

    addListener("gamepadconnected", onConnect);
    addListener("gamepaddisconnected", onDisconnect);

    return () => {
      if (rafId != null) cancelAnimationFrame(rafId);
      removeListener("gamepadconnected", onConnect);
      removeListener("gamepaddisconnected", onDisconnect);
    };
  }, []);

  // Allow caller to toggle
  enabledRef.current = cb.enabled !== false;
}
