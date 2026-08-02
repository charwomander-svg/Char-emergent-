// useFullscreen — native fullscreen / immersive-mode hook for Ghost Maze.
// • Android: hides status bar + navigation bar.
// • iOS: hides status bar.
// Restores system UI on unmount.

import { useCallback, useEffect, useState } from "react";
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

function isFullscreenSupported(): boolean {
  return true;
}

export function useFullscreen(opts: { autoEnter?: boolean } = {}): FullscreenApi {
  const { autoEnter = true } = opts;
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const isSupported = isFullscreenSupported();

  const enter = useCallback(async () => {
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
    if (isFullscreen) await exit();
    else await enter();
  }, [enter, exit, isFullscreen]);

  useEffect(() => {
    if (!autoEnter) return;
    void enter();
  }, [autoEnter, enter]);

  useEffect(() => {
    return () => {
      try {
        setStatusBarHidden(false, "fade");
      } catch {}
      if (Platform.OS === "android") {
        NavigationBar.setVisibilityAsync("visible").catch(() => {});
      }
    };
  }, []);

  return { isFullscreen, isSupported, enter, exit, toggle };
}
