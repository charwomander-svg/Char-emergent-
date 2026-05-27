// Share helpers: native Web Share API on web; clipboard fallback
import { Platform, Share } from "react-native";

const APP_NAME = "Ghost Maze";

export function buildChallengeUrl(seed: number, label?: string): string {
  const base =
    (typeof window !== "undefined" && window.location?.origin) ||
    process.env.EXPO_PUBLIC_BACKEND_URL ||
    "";
  const params = new URLSearchParams({
    mode: "custom",
    seed: String(seed),
  });
  if (label) params.set("label", label);
  return `${base}/game?${params.toString()}`;
}

export interface ShareCard {
  title: string;
  message: string;
  url?: string;
}

export function buildScoreCard(opts: {
  playerName: string;
  score: number;
  level: number;
  catches: number;
  mode: "classic" | "daily" | "custom";
  dailyDate?: string;
  seed?: number;
}): ShareCard {
  const { playerName, score, level, catches, mode, dailyDate, seed } = opts;
  const lines: string[] = [];
  lines.push(`👻 ${APP_NAME} 👻`);
  if (mode === "daily" && dailyDate) {
    lines.push(`📅 Daily Challenge · ${dailyDate}`);
  } else if (mode === "custom" && seed != null) {
    lines.push(`🎲 Custom Maze · seed ${seed}`);
  } else {
    lines.push(`Classic Run`);
  }
  lines.push(`${playerName}: ${score.toLocaleString()} pts · Lvl ${level} · ${catches} catches`);
  lines.push("");
  lines.push("Can you beat me? 🎮");
  return {
    title: `${APP_NAME} – ${score.toLocaleString()} pts`,
    message: lines.join("\n"),
    url:
      mode === "custom" && seed != null
        ? buildChallengeUrl(seed, playerName)
        : undefined,
  };
}

/**
 * Share a card using native Share dialog (iOS/Android) or Web Share API.
 * Falls back to clipboard copy on platforms without share support.
 */
export async function shareCard(card: ShareCard): Promise<"shared" | "copied" | "failed"> {
  // Try native React Native Share on iOS/Android
  if (Platform.OS !== "web") {
    try {
      const result = await Share.share({
        title: card.title,
        message: card.url ? `${card.message}\n${card.url}` : card.message,
      });
      return result.action === Share.dismissedAction ? "failed" : "shared";
    } catch {
      return "failed";
    }
  }

  // Web: prefer navigator.share if available
  if (typeof navigator !== "undefined" && (navigator as any).share) {
    try {
      await (navigator as any).share({
        title: card.title,
        text: card.message,
        url: card.url,
      });
      return "shared";
    } catch {
      // user cancelled or rejected - treat as not-failed unless we have nothing else
    }
  }

  // Fallback: copy to clipboard
  try {
    if (typeof navigator !== "undefined" && (navigator as any).clipboard) {
      const text = card.url ? `${card.message}\n${card.url}` : card.message;
      await (navigator as any).clipboard.writeText(text);
      return "copied";
    }
  } catch {
    /* ignore */
  }
  return "failed";
}
