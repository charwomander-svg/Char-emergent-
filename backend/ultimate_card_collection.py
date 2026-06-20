from fastapi import APIRouter


LAUNCH_TIERS = {
    "launch": [
        {
            "id": "klondike",
            "name": "Klondike",
            "category": "solitaire",
            "why": "Recognizable flagship solitaire and ideal tutorial surface for drag, focus, undo, and hint systems.",
        },
        {
            "id": "spider",
            "name": "Spider Solitaire",
            "category": "solitaire",
            "why": "Deep replayability and validates multi-deck content and difficulty presets.",
        },
        {
            "id": "freecell",
            "name": "FreeCell",
            "category": "solitaire",
            "why": "Supports deterministic puzzle-like daily seeds and solver-friendly validation.",
        },
        {
            "id": "blackjack",
            "name": "Blackjack",
            "category": "dealer",
            "why": "Core dealer-mode template for payouts, hand resolution, and bankroll flow.",
        },
        {
            "id": "baccarat",
            "name": "Baccarat",
            "category": "dealer",
            "why": "Covers auto-draw dealer logic and alternate bet resolution.",
        },
        {
            "id": "three-card-poker",
            "name": "Three Card Poker",
            "category": "dealer",
            "why": "Exercises dealer qualification, side bets, and payout tables.",
        },
        {
            "id": "gin-rummy",
            "name": "Gin Rummy",
            "category": "pvp",
            "why": "Strong local-versus candidate with meld logic and approachable strategy.",
        },
        {
            "id": "hearts",
            "name": "Hearts",
            "category": "pvp",
            "why": "Validates AI turn order, trick resolution, and negative-score rule sets.",
        },
        {
            "id": "texas-holdem",
            "name": "Texas Hold'em",
            "category": "pvp",
            "why": "Tests betting rounds, shared community cards, and local/online extensibility.",
        },
    ],
    "post_launch": [
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
    "long_tail": [
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
}

SUPPORTED_MODES = {
    "launch": {
        "solitaire": ["solo", "daily_challenge", "resume"],
        "dealer": ["solo", "local_profile_stats"],
        "pvp": ["local_hotseat", "local_ai"],
    },
    "planned_online": {
        "phase_1": ["leaderboards", "cloud_saves", "daily_seed_sync"],
        "phase_2": ["async_challenges", "ranked_matchmaking", "cross_session_profiles"],
        "phase_3": ["real_time_multiplayer", "spectating", "tournaments"],
    },
}

XBOX_TARGETS = {
    "platforms": ["Xbox Series X", "Xbox Series S"],
    "render_targets": {
        "series_x": "4K UI-first presentation at 60 FPS",
        "series_s": "1440p UI-first presentation at 60 FPS",
    },
    "frame_budget_ms": 16.67,
    "input_latency_ms": 100,
    "save_behavior": [
        "Suspend/resume safe during any turn boundary",
        "Atomic local save slots with corruption rollback",
        "Cloud-save conflict resolution with newest verified timeline",
    ],
    "offline_behavior": [
        "All launch games playable offline after initial install",
        "Daily challenge falls back to cached seed when disconnected",
        "Queued telemetry and progression sync after reconnect",
    ],
    "accessibility_baseline": [
        "Controller-only navigation on every screen",
        "Large-text mode for 10-foot viewing distance",
        "High-contrast table themes and color-blind card indicators",
        "Narrated focus labels and remappable inputs",
        "Reduced motion and toggleable assist effects",
    ],
}

PLATFORM_CONSTRAINTS = {
    "engine_strategy": "Custom C++ gameplay runtime with data-authored rulesets and platform abstraction layers for Xbox services.",
    "stacks": {
        "graphics": ["Direct3D 12", "custom sprite/vector UI renderer", "texture-atlas card pipeline"],
        "input": ["XInput/GameInput abstraction", "focus graph navigation", "haptic routing"],
        "audio": ["XAudio2", "event-driven mixer", "dynamic ducking for narration"],
        "network": ["HTTPS service client", "PlayFab or equivalent account/profile layer", "server-authoritative leaderboard writes"],
    },
    "certification_impact": [
        "Suspend/resume from any gameplay state without desync",
        "Graceful handling of profile sign-in/out and controller reassignment",
        "Storage full, save denial, and corrupted-save recovery messaging",
        "Privacy-aware prompts before online features or telemetry submission",
        "Consistent offline fallbacks when services are unavailable",
    ],
}

CONTENT_PIPELINE = {
    "authoring_format": "Versioned JSON rules/content manifests validated against deterministic engine schemas.",
    "metadata_tags": [
        "category",
        "player_count",
        "deck_count",
        "complexity",
        "session_length",
        "luck_vs_skill",
        "supports_daily_seed",
        "supports_online",
    ],
    "localization_fields": ["title", "short_description", "tutorial_steps", "accessibility_labels"],
    "automation": [
        "Schema validation",
        "Ruleset legality simulation",
        "Replay determinism checks",
        "Catalog discoverability snapshot tests",
    ],
}

BACKEND_STRATEGY = {
    "launch_scope": ["leaderboards", "profiles", "cloud saves", "daily seeds", "telemetry ingestion"],
    "security": [
        "Signed score submissions",
        "Server-owned payout and progression math",
        "Replay hash verification for competitive modes",
        "Rate limits and audit trails for economy-affecting endpoints",
    ],
    "migration_path": [
        "Keep prototype REST shape for local development",
        "Move production auth/profile flows to Xbox-compatible identity providers",
        "Swap prototype leaderboards for platform-backed services without changing content definitions",
    ],
}

LIVE_OPS = {
    "launch_principles": [
        "Ship curated, polished catalog first",
        "Favor replayability and tutorial clarity over raw game count",
        "Use analytics to prioritize expansions by completion and retention",
    ],
    "content_drop_structure": [
        "Monthly themed packs",
        "Seasonal table skins and accessibility refinements",
        "Quarterly competitive and co-op feature drops",
    ],
}

VERTICAL_SLICES = [
    {
        "id": "klondike",
        "category": "solitaire",
        "goals": ["undo/replay", "hint hooks", "daily seed compatibility", "controller focus graph"],
    },
    {
        "id": "blackjack",
        "category": "dealer",
        "goals": ["payout tables", "house rules data", "economy hooks", "session persistence"],
    },
    {
        "id": "texas-holdem",
        "category": "pvp",
        "goals": ["betting rounds", "AI opponents", "hotseat turn privacy", "future online parity"],
    },
]


def get_blueprint() -> dict:
    return {
        "product_name": "The Ultimate Card Collection",
        "launch_tiers": LAUNCH_TIERS,
        "supported_modes": SUPPORTED_MODES,
        "xbox_targets": XBOX_TARGETS,
        "platform_constraints": PLATFORM_CONSTRAINTS,
        "content_pipeline": CONTENT_PIPELINE,
        "backend_strategy": BACKEND_STRATEGY,
        "vertical_slices": VERTICAL_SLICES,
        "live_ops": LIVE_OPS,
    }


router = APIRouter(prefix="/card-collection", tags=["card-collection"])


@router.get("/blueprint")
async def blueprint():
    return get_blueprint()


@router.get("/catalog")
async def catalog():
    return {
        "product_name": "The Ultimate Card Collection",
        "launch_tiers": LAUNCH_TIERS,
        "vertical_slices": VERTICAL_SLICES,
        "tag_dimensions": CONTENT_PIPELINE["metadata_tags"],
    }
