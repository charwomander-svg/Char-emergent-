import type { GameCategory } from "@/src/cards/blueprint";

export type Suit = "clubs" | "diamonds" | "hearts" | "spades";
export type Rank =
  | "A"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K";

export type Card = {
  id: string;
  rank: Rank;
  suit: Suit;
  faceUp: boolean;
};

export type RulesDeck = {
  deckCount: number;
  jokers: number;
  removeRanks?: Rank[];
};

export type CardAction =
  | { type: "draw"; source: string; count?: number }
  | { type: "move"; source: string; target: string; cardIds: string[] }
  | { type: "deal"; target: string; count: number }
  | { type: "resolve" };

export type CardEvent =
  | { type: "seeded"; seed: number }
  | { type: "initialized"; rulesetId: string }
  | { type: "actionApplied"; action: CardAction }
  | { type: "undo" };

export type Zone = {
  id: string;
  label: string;
  cards: Card[];
};

export type PlayerSeat = {
  id: string;
  label: string;
};

export type RulesMetadata = {
  id: string;
  title: string;
  category: GameCategory;
  launchTier: "launch" | "postLaunch" | "longTail";
  playerCounts: number[];
  supportsOnline: boolean;
  supportsDailySeed: boolean;
  tags: string[];
};

export type SetupDefinition = {
  deck: RulesDeck;
  zones: string[];
  seats: PlayerSeat[];
};

export type GameSnapshot = {
  rulesetId: string;
  seed: number;
  revision: number;
  activeSeat: string | null;
  zones: Record<string, Zone>;
  turn: number;
  status: "active" | "won" | "lost" | "draw";
};

export type ValidationIssue = {
  severity: "error" | "warning";
  message: string;
};

export type RulesValidationResult = {
  ok: boolean;
  issues: ValidationIssue[];
};

export type CardGameDefinition = {
  metadata: RulesMetadata;
  setup: SetupDefinition;
  createInitialState: (seed: number) => GameSnapshot;
  getLegalActions: (snapshot: GameSnapshot) => CardAction[];
  applyAction: (snapshot: GameSnapshot, action: CardAction) => GameSnapshot;
  evaluateWinState: (snapshot: GameSnapshot) => GameSnapshot["status"];
  validateDefinition: () => RulesValidationResult;
};
