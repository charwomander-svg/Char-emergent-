import { Platform } from "react-native";

declare global {
  interface Window {
    __GHOST_MAZE_ITCH_MODE__?: boolean;
  }
}

function isItchHost(hostname: string) {
  return /(^|\.)itch\.zone$/i.test(hostname) || /(^|\.)itch\.io$/i.test(hostname);
}

function detectEmbeddedRuntime() {
  if (typeof window === "undefined") return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export function detectItchWebRuntime() {
  if (typeof window === "undefined") return false;

  const hostname = window.location.hostname || "";
  const protocol = window.location.protocol || "";
  const search = window.location.search || "";
  const referrer = typeof document !== "undefined" ? document.referrer || "" : "";
  const embedded = detectEmbeddedRuntime();
  const nonHttpProtocol = protocol !== "" && !/^https?:$/i.test(protocol);

  return (
    /(?:\?|&)(?:itchObject|itchio)=/i.test(search) ||
    isItchHost(hostname) ||
    nonHttpProtocol ||
    /https?:\/\/(?:[^/]+\.)?itch\.io/i.test(referrer) ||
    /https?:\/\/(?:[^/]+\.)?itch\.zone/i.test(referrer) ||
    embedded
  );
}

export function isItchWebRuntime() {
  if (Platform.OS !== "web" || typeof window === "undefined") return false;

  if (typeof window.__GHOST_MAZE_ITCH_MODE__ === "boolean") {
    return window.__GHOST_MAZE_ITCH_MODE__;
  }

  const detected = detectItchWebRuntime();
  window.__GHOST_MAZE_ITCH_MODE__ = detected;
  return detected;
}
