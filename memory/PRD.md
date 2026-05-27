# Ghost Maze - Product Requirements Document

## Overview
**Ghost Maze** is a reverse Pac-Man mobile game built with Expo/React Native. The player controls all 4 ghosts simultaneously to chase and catch Pellet Guy through randomized mazes. Now features online leaderboards, daily challenges, friend invites, custom seeds, gamepad support, and bundled native audio.

## Implemented Features (v4.0)

### Phase 1 — MVP (13 tests)
Maze gen, 4 ghosts, individual control, catches/lives/scoring.

### Phase 2 — Polish (14 tests)
Smooth animation, sounds + music, traps & barricades, character unlocks, smarter AI.

### Phase 3 — Network (24 tests)
Daily challenge, leaderboard, score submission, ghost-house stagger, particle effects, swipe gestures.

### Phase 4 — Native + Social
- **Native bundled audio**: 10 procedurally-generated WAV files (~140KB total) for chomp/pellet/super/catch/combo/ghost_eaten/death/win/lose/ui_click. Plays on iOS, Android, and Web via `expo-audio` with a 3-deep player pool per SFX (rapid retriggers don't cut off). Web Audio API kept for the live chiptune music loop (smaller than a bundled MP3).
- **Web Gamepad API**: `useGamepad` hook polls connected gamepads at 60Hz. D-pad/left stick → direction for selected ghost. Face buttons A/B/X/Y → select Blinky/Pinky/Inky/Clyde. LB/RB → cycle selection. Edge-triggered debounce so a single button press doesn't fire repeatedly. Native gracefully no-ops.
- **Share Score**: 📤 SHARE SCORE button on game over uses native `Share.share()` on iOS/Android, Web Share API + clipboard fallback on web.
- **Friend Challenges**: ⚔️ CHALLENGE A FRIEND button generates a custom-seed URL (`/game?mode=custom&seed=X&label=NAME`) and shares it. Recipients open the link and play the EXACT same maze.
- **Custom-mode game**: Anyone can deep-link a specific seed. Scores from custom mode submit to the regular classic leaderboard (no daily cheating).

## Backend API

| Method | Path | Notes |
|---|---|---|
| GET | `/api/daily-seed` | UTC-date seeded `{seed_date, seed}` |
| POST | `/api/scores` | Submit run; sanitizes player_name; rejects daily date mismatch |
| GET | `/api/leaderboard?mode=classic\|daily\|all&limit=N&daily_seed_date=YYYY-MM-DD` | Top scores |
| GET/POST | `/api/status` | Legacy health check |

## Test Coverage Summary
- Phase 1: 13/13 ✅
- Phase 2: 14/14 ✅
- Phase 3: 14 backend + 10 frontend = 24 ✅
- Phase 4: smoke tests + regression — all Phase 1-3 still green; Phase 4 wiring verified by JS bundle string-search + deterministic seed checks
- **Total: 51 automated tests passing across 4 phases**

## Tech Stack
- **Frontend**: Expo SDK 54, React Native, Expo Router
- **Audio**: `expo-audio` (SFX) + Web Audio API (music loop)
- **Input**: Touch D-pads, PanResponder swipe, Web Gamepad API
- **Storage**: `@/src/utils/storage` (themes, stats)
- **Backend**: FastAPI + Motor (async MongoDB)
- **Persistence**: MongoDB (`scores`, `status_checks`)

## File Structure (v4.0)
```
/app/
├── backend/server.py                    # Leaderboard API
├── scripts/generate_sounds.py           # Procedural WAV generator
└── frontend/
    ├── app/
    │   ├── _layout.tsx
    │   ├── index.tsx                    # Menu: Play / Characters / Daily / Leaderboard
    │   ├── game.tsx                     # Game + swipe + particles + gamepad + share
    │   ├── characters.tsx               # Theme unlocks
    │   └── leaderboard.tsx              # Classic & Daily tabs
    ├── assets/sounds/                   # 10 bundled WAV files
    └── src/game/
        ├── types.ts, constants.ts
        ├── maze.ts                      # Seeded procedural gen
        ├── ai.ts                        # Evasive Pellet Guy AI
        ├── rng.ts                       # mulberry32 PRNG
        ├── sounds.ts                    # expo-audio + Web Audio music
        ├── progress.ts                  # Theme catalog + storage
        ├── api.ts                       # Backend client
        ├── share.ts                     # Share/clipboard helpers
        ├── useGamepad.ts                # Web Gamepad polling
        ├── useGhostMaze.ts              # Core state hook
        └── MazeRenderer.tsx             # Animated entity rendering
```

## What's Built vs. What's Left
**Built end-to-end:**
- Full game loop (catch-3-to-win, lives, scoring)
- Procedural mazes with optional seeding
- Smart Pellet Guy AI that escalates per level
- Trap drops (spikes + barricades)
- 7 themes with unlock progression
- Smooth animation + particles + stagger
- Cross-platform audio (bundled WAVs + procedural music)
- Touch + swipe + gamepad input
- Daily challenge with shared global leaderboard
- Friend challenges via shareable seed URLs
- Online classic + daily leaderboard with submission

**Polish opportunities (future):**
- Bundled music asset (currently web-only)
- 3D parallax / camera animations
- Achievements & badges
- Per-friend rivalry tracking (head-to-head W/L vs. specific seeds)
