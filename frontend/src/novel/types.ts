// Visual Novel engine types

export type SpeakerId =
  | "narrator"
  | "dirk"
  | "priya"
  | "marcus"
  | "yuki"
  | "dave"
  | "elena"
  | "mireille"
  | "system";

export interface Speaker {
  id: SpeakerId;
  name: string;
  color: string;
  subtitle?: string;
}

export const SPEAKERS: Record<SpeakerId, Speaker> = {
  narrator: { id: "narrator", name: "", color: "#AAAACC" },
  dirk: { id: "dirk", name: "DIRK", color: "#4A9EFF", subtitle: "(CEO, Probably)" },
  priya: { id: "priya", name: "PRIYA", color: "#50FA7B", subtitle: "(Lead Developer)" },
  marcus: { id: "marcus", name: "MARCUS", color: "#BD93F9", subtitle: "(Writer)" },
  yuki: { id: "yuki", name: "YUKI", color: "#FF79C6", subtitle: "(Artist)" },
  dave: { id: "dave", name: "DAVE", color: "#FFB86C", subtitle: "(Marketing, Loosely)" },
  elena: { id: "elena", name: "ELENA", color: "#FFD700", subtitle: "(Unspoken Melody)" },
  mireille: { id: "mireille", name: "MIREILLE", color: "#FF6B8A", subtitle: "(Unspoken Melody)" },
  system: { id: "system", name: "SYSTEM", color: "#FF5555" },
};

export type TextSpeed = "slow" | "normal" | "fast" | "instant";

export interface NovelSettings {
  textSpeed: TextSpeed;
  autoAdvance: boolean;
  skipSeen: boolean;
}

export const DEFAULT_NOVEL_SETTINGS: NovelSettings = {
  textSpeed: "normal",
  autoAdvance: false,
  skipSeen: false,
};

export const TEXT_SPEED_MS: Record<TextSpeed, number> = {
  slow: 65,
  normal: 28,
  fast: 8,
  instant: 0,
};

export const TEXT_SPEED_LABELS: Record<TextSpeed, string> = {
  slow: "Slow (Savoring Every Word Like a Real Person)",
  normal: "Normal",
  fast: "Fast (You Already Know Where This Is Going)",
  instant: "Why Are You Even Here",
};

// A choice option: displayed text + the reaction line shown after selection
export interface ChoiceOption {
  text: string;
  reaction: string;
}

export type ScriptNode =
  | { type: "scene"; label: string; bg: string }
  | { type: "dialog"; speaker: SpeakerId; text: string }
  | { type: "choice"; prompt: string; options: ChoiceOption[] }
  | { type: "end" };

export type Script = ScriptNode[];
