export type GameCategory = "solitaire" | "dealer" | "pvp";
export type LaunchTier = "launch" | "postLaunch" | "longTail";

export type LaunchGame = {
  id: string;
  name: string;
  category: GameCategory;
  why: string;
};

export type VerticalSlice = {
  id: string;
  category: GameCategory;
  goals: string[];
};

export const launchTiers: Record<LaunchTier, LaunchGame[] | string[]> = {
  launch: [
    {
      id: "klondike",
      name: "Klondike",
      category: "solitaire",
      why: "Flagship single-player ruleset for undo, hints, and daily-seed validation.",
    },
    {
      id: "spider",
      name: "Spider Solitaire",
      category: "solitaire",
      why: "Covers multi-deck layout difficulty and long-session progression.",
    },
    {
      id: "freecell",
      name: "FreeCell",
      category: "solitaire",
      why: "Supports deterministic puzzle verification and solver-style checks.",
    },
    {
      id: "blackjack",
      name: "Blackjack",
      category: "dealer",
      why: "Core payout-table and house-rule template for dealer games.",
    },
    {
      id: "baccarat",
      name: "Baccarat",
      category: "dealer",
      why: "Adds scripted dealer resolution and alternative bet outcomes.",
    },
    {
      id: "three-card-poker",
      name: "Three Card Poker",
      category: "dealer",
      why: "Exercises dealer qualification and side-bet configuration.",
    },
    {
      id: "gin-rummy",
      name: "Gin Rummy",
      category: "pvp",
      why: "Approachable local-versus card shedding and meld validation slice.",
    },
    {
      id: "hearts",
      name: "Hearts",
      category: "pvp",
      why: "Validates trick-taking AI and negative-score state tracking.",
    },
    {
      id: "texas-holdem",
      name: "Texas Hold'em",
      category: "pvp",
      why: "Tests betting rounds, community cards, and future online parity.",
    },
  ],
  postLaunch: [
    "Pyramid",
    "Golf",
    "Tri Peaks",
    "Canfield",
    "Pontoon",
    "Spanish 21",
    "Casino War",
    "Cribbage",
    "Spades",
    "Euchre",
    "Rummy 500",
    "Crazy Eights",
  ],
  longTail: [
    "Forty Thieves",
    "Yukon",
    "Russian Solitaire",
    "Pai Gow Poker",
    "Ultimate Texas Hold'em",
    "Bridge",
    "Pinochle",
    "Tarot",
    "Canasta",
    "President",
    "Durak",
    "Scopa",
  ],
};

export const supportedModes = {
  launch: {
    solitaire: ["solo", "daily challenge", "resume"],
    dealer: ["solo", "local profile stats"],
    pvp: ["local hotseat", "local AI"],
  },
  plannedOnline: {
    phase1: ["leaderboards", "cloud saves", "daily seed sync"],
    phase2: ["async challenges", "ranked matchmaking", "cross-session profiles"],
    phase3: ["real-time multiplayer", "spectating", "tournaments"],
  },
};

export const xboxTargets = {
  platforms: ["Xbox Series X", "Xbox Series S"],
  renderTargets: {
    seriesX: "4K UI-first presentation at 60 FPS",
    seriesS: "1440p UI-first presentation at 60 FPS",
  },
  frameBudgetMs: 16.67,
  inputLatencyMs: 100,
  saveBehavior: [
    "Suspend/resume safe at every turn boundary",
    "Atomic local saves with corruption rollback",
    "Cloud-save conflict resolution on verified timelines",
  ],
  offlineBehavior: [
    "All launch games playable offline",
    "Daily challenge uses cached seed when disconnected",
    "Progress queues for sync after reconnect",
  ],
  accessibilityBaseline: [
    "Controller-only navigation",
    "Large text for TV distance",
    "High-contrast and color-blind card themes",
    "Narrated focus labels and remappable inputs",
    "Reduced motion and toggleable assist effects",
  ],
};

export const platformConstraints = {
  engineStrategy:
    "Custom gameplay runtime with data-authored rulesets and Xbox platform abstraction layers.",
  stacks: {
    graphics: ["Direct3D 12", "custom UI renderer", "texture-atlas card pipeline"],
    input: ["GameInput/XInput abstraction", "focus graph navigation", "haptic routing"],
    audio: ["XAudio2", "event-driven mixer", "narration ducking"],
    network: ["HTTPS service client", "profile service", "server-authoritative leaderboard writes"],
  },
  certificationImpact: [
    "Suspend/resume without desync",
    "Profile sign-in/out and controller reassignment handling",
    "Storage full and save failure recovery UX",
    "Privacy-aware prompts before online or telemetry features",
    "Consistent offline fallback messaging",
  ],
};

export const contentPipeline = {
  authoringFormat: "Versioned JSON rules/content manifests validated by deterministic engine schemas.",
  metadataTags: [
    "category",
    "player_count",
    "deck_count",
    "complexity",
    "session_length",
    "luck_vs_skill",
    "supports_daily_seed",
    "supports_online",
  ],
  localizationFields: ["title", "shortDescription", "tutorialSteps", "accessibilityLabels"],
  automation: [
    "Schema validation",
    "Ruleset legality simulation",
    "Replay determinism checks",
    "Catalog discoverability snapshots",
  ],
};

export const backendStrategy = {
  launchScope: ["leaderboards", "profiles", "cloud saves", "daily seeds", "telemetry ingestion"],
  security: [
    "Signed score submissions",
    "Server-owned progression and payout math",
    "Replay hash verification for competitive modes",
    "Rate limits and audit trails around economy-affecting endpoints",
  ],
  migrationPath: [
    "Keep prototype REST flows for local iteration",
    "Move production auth/profile flows to Xbox-compatible identity",
    "Preserve content schema while swapping backend providers",
  ],
};

export const verticalSlices: VerticalSlice[] = [
  {
    id: "klondike",
    category: "solitaire",
    goals: ["undo/replay", "hint hooks", "daily seed compatibility", "controller focus graph"],
  },
  {
    id: "blackjack",
    category: "dealer",
    goals: ["payout tables", "house rules data", "economy hooks", "session persistence"],
  },
  {
    id: "texas-holdem",
    category: "pvp",
    goals: ["betting rounds", "AI opponents", "hotseat privacy", "future online parity"],
  },
];
