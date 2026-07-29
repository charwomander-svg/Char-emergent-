import { useCallback, useEffect, useRef, useState } from "react";

interface FullscreenApi {
  isFullscreen: boolean;
  isSupported: boolean;
  enter: () => Promise<void> | void;
  exit: () => Promise<void> | void;
  toggle: () => Promise<void> | void;
}

function isWebFullscreenSupported(): boolean {
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
  } catch {}
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isSupported = useRef(isWebFullscreenSupported()).current;
  const enteredOnceRef = useRef(false);

  const enter = useCallback(async () => {
    await webEnter();
  }, []);

  const exit = useCallback(async () => {
    await webExit();
  }, []);

  const toggle = useCallback(async () => {
    if (isWebInFullscreen()) await webExit();
    else await webEnter();
  }, []);

  useEffect(() => {
    if (!autoEnter || typeof window === "undefined") return;
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
  }, [autoEnter]);

  useEffect(() => {
    if (typeof document === "undefined") return;
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

  useEffect(() => {
    return () => {
      void webExit();
    };
  }, []);

  return { isFullscreen, isSupported, enter, exit, toggle };
}
