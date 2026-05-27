// =============================================================================
// useFullscreen — cross-platform fullscreen / immersive-mode hook for Ghost Maze.
// -----------------------------------------------------------------------------
// • Web: uses the Fullscreen API on the document element. Browsers require a
//   user gesture, so the hook exposes both `enter()` (callable from a press
//   handler) and auto-attempts on first pointer/key event.
// • Android: hides the system status bar AND navigation bar (immersive sticky).
// • iOS: hides the status bar.
// On unmount the hook restores everything so the menu UI stays normal.
// =============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import * as NavigationBar from "expo-navigation-bar";
import { setStatusBarHidden } from "expo-status-bar";

interface FullscreenApi {
  isFullscreen: boolean;
  isSupported: boolean;
  enter: () => Promise<void> | void;
  exit: () => Promise<void> | void;
  toggle: () => Promise<void> | void;
}

function isWebFullscreenSupported(): boolean {
  if (Platform.OS !== "web") return true;
  if (typeof document === "undefined") return false;
  const d: any = document.documentElement;
  return !!(
    d.requestFullscreen ||
    d.webkitRequestFullscreen ||
    d.mozRequestFullScreen ||
    d.msRequestFullscreen
  );
}

async function webEnter(): Promise<void> {
  if (typeof document === "undefined") return;
  const el: any = document.documentElement;
  const req =
    el.requestFullscreen ||
    el.webkitRequestFullscreen ||
    el.mozRequestFullScreen ||
    el.msRequestFullscreen;
  if (!req) return;
  try {
    await req.call(el, { navigationUI: "hide" });
  } catch {
    // Some browsers (e.g. iOS Safari) reject without a direct gesture — fall
    // through silently; UI continues to function normally.
  }
}

async function webExit(): Promise<void> {
  if (typeof document === "undefined") return;
  const d: any = document;
  const ex =
    d.exitFullscreen ||
    d.webkitExitFullscreen ||
    d.mozCancelFullScreen ||
    d.msExitFullscreen;
  if (!ex) return;
  try {
    await ex.call(d);
  } catch {}
}

function isWebInFullscreen(): boolean {
  if (typeof document === "undefined") return false;
  const d: any = document;
  return !!(
    d.fullscreenElement ||
    d.webkitFullscreenElement ||
    d.mozFullScreenElement ||
    d.msFullscreenElement
  );
}

export function useFullscreen(opts: { autoEnter?: boolean } = {}): FullscreenApi {
  const { autoEnter = true } = opts;
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const isSupported = useRef(isWebFullscreenSupported()).current;
  const enteredOnceRef = useRef(false);

  const enter = useCallback(async () => {
    if (Platform.OS === "web") {
      await webEnter();
      // Web state will be reflected by `fullscreenchange` event below.
      return;
    }
    // Native: hide status bar + Android nav bar (immersive sticky).
    try {
      setStatusBarHidden(true, "fade");
    } catch {}
    if (Platform.OS === "android") {
      try {
        await NavigationBar.setVisibilityAsync("hidden");
        await NavigationBar.setBehaviorAsync("overlay-swipe");
      } catch {}
    }
    setIsFullscreen(true);
  }, []);

  const exit = useCallback(async () => {
    if (Platform.OS === "web") {
      await webExit();
      return;
    }
    try {
      setStatusBarHidden(false, "fade");
    } catch {}
    if (Platform.OS === "android") {
      try {
        await NavigationBar.setVisibilityAsync("visible");
      } catch {}
    }
    setIsFullscreen(false);
  }, []);

  const toggle = useCallback(async () => {
    if (Platform.OS === "web") {
      if (isWebInFullscreen()) await webExit();
      else await webEnter();
      return;
    }
    if (isFullscreen) await exit();
    else await enter();
  }, [enter, exit, isFullscreen]);

  // Auto-enter on first user gesture (web only — gesture is required by browsers).
  useEffect(() => {
    if (!autoEnter || Platform.OS !== "web") {
      if (autoEnter && Platform.OS !== "web") {
        // Native: we can enter immediately without a gesture.
        enter();
      }
      return;
    }
    if (typeof window === "undefined") return;
    const onAnyGesture = () => {
      if (enteredOnceRef.current) return;
      enteredOnceRef.current = true;
      void webEnter();
    };
    window.addEventListener("pointerdown", onAnyGesture, { once: true });
    window.addEventListener("keydown", onAnyGesture, { once: true });
    window.addEventListener("touchstart", onAnyGesture, { once: true });
    return () => {
      window.removeEventListener("pointerdown", onAnyGesture);
      window.removeEventListener("keydown", onAnyGesture);
      window.removeEventListener("touchstart", onAnyGesture);
    };
  }, [autoEnter, enter]);

  // Track web fullscreen state via the platform event.
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const onChange = () => setIsFullscreen(isWebInFullscreen());
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    document.addEventListener("mozfullscreenchange", onChange);
    document.addEventListener("MSFullscreenChange", onChange);
    setIsFullscreen(isWebInFullscreen());
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
      document.removeEventListener("mozfullscreenchange", onChange);
      document.removeEventListener("MSFullscreenChange", onChange);
    };
  }, []);

  // Restore on unmount (e.g. leaving the game screen).
  useEffect(() => {
    return () => {
      // Best-effort cleanup — don't await since unmount handlers are sync.
      if (Platform.OS === "web") {
        void webExit();
      } else {
        try {
          setStatusBarHidden(false, "fade");
        } catch {}
        if (Platform.OS === "android") {
          NavigationBar.setVisibilityAsync("visible").catch(() => {});
        }
      }
    };
  }, []);

  return { isFullscreen, isSupported, enter, exit, toggle };
}
