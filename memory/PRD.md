# Ghost Maze - Product Requirements Document

## Overview
**Ghost Maze** is a reverse Pac-Man mobile game built with Expo/React Native. The player controls all 4 ghosts simultaneously (independently) to chase and catch Pellet Guy through randomized mazes.

## Implemented Features (v3.0)

### Phase 1 — MVP (13 tests passing)
- Procedurally generated maze (recursive backtracking + loop carving)
- 4 independently-controlled ghosts (Blinky/Pinky/Inky/Clyde)
- Per-ghost D-pad controls, continuous-movement semantics
- Pellet Guy with random AI, faster than ghosts
- Win: catch Pellet Guy 3× per level; combo bonus for multi-hits
- Lose life: Pellet Guy eats all pellets / all ghosts
- Difficulty scaling, scoring with % pellets remaining bonus

### Phase 2 — Polish & Depth (14 tests passing)
- **Smooth animation**: `Animated.Value` + `transform: translateX/Y` interpolation
- **Sound + chiptune music**: procedural Web Audio API engine, 8-step minor-key music loop
- **Spike traps & barricades**: Pellet Guy drops traps, max 3 active
- **Vulnerable identification**: colored tufts + colored eyes when ghosts are blue
- **Character unlocks**: 7 themes (5 unlockable + 2 hidden), persisted locally
- **Smarter AI**: random → weighted-evasion → greedy maximize-distance escape
- **Ghost stuck-fix**: auto-pick valid direction when blocked

### Phase 3 — Network + Polish (24 tests passing: 14 backend + 10 frontend)
- **Daily Maze Challenge**: deterministic seeded mazes (UTC date → SHA-256 → 32-bit seed → mulberry32 PRNG). Same maze for everyone each day.
- **Online leaderboard**: FastAPI + MongoDB, separate Classic & Daily rankings, top 50 per board
- **Score submission**: in-game form on game over with player name; name sanitization on backend
- **Ghost-house exit stagger**: ghosts emerge 0/500/1000/1500ms apart for theatrical opening
- **Particle effects**: floating "+200" / "+800 COMBO!" text on catches with scale + fade animation
- **Swipe gesture controls**: PanResponder on maze area routes swipes to currently-selected ghost (works alongside D-pads)
- **New screens**: `/leaderboard` with Classic/Daily tabs + quick-play; Daily date prominently on main menu

## Backend API

| Method | Path | Notes |
|---|---|---|
| GET | `/api/` | Hello |
| GET | `/api/daily-seed` | `{seed_date, seed}` — today's UTC seed |
| POST | `/api/scores` | Submit a run; sanitizes name, validates daily seed |
| GET | `/api/leaderboard?mode=classic\|daily\|all&limit=N&daily_seed_date=YYYY-MM-DD` | Top scores, desc |
| GET/POST | `/api/status[,/]` | Legacy health endpoint (preserved) |

## Deferred (Phase 4+)
- **Native audio assets**: Current chiptune engine uses Web Audio API only — needs bundled WAV/MP3 files (1-2KB each) for `expo-audio` playback in Expo Go / standalone builds. Easiest path: source royalty-free 8-bit SFX pack, then `expo-audio` `useAudioPlayer(require("../assets/chomp.wav"))`.
- **Gamepad / controller support**: Web Gamepad API works in browser preview but native requires `react-native-game-controller` or similar — needs a development build (won't work in Expo Go). Recommend deferring until users request it.

## Tech Stack
- **Frontend**: Expo SDK 54, React Native, Expo Router (file-based)
- **Game loop**: `requestAnimationFrame` 60fps
- **Animation**: `Animated.Value` + `useNativeDriver` where supported
- **Audio**: Web Audio API (procedural)
- **Storage**: `@/src/utils/storage` (theme + stats)
- **Backend**: FastAPI + Motor (async MongoDB), Pydantic validation
- **Database**: MongoDB (`scores` collection + legacy `status_checks`)

## File Structure
```
/app/
├── backend/
│   ├── server.py              # API + leaderboard
│   ├── .env                   # MONGO_URL, DB_NAME
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── _layout.tsx
│   │   ├── index.tsx          # Main menu (4 buttons + daily date)
│   │   ├── game.tsx           # Game screen + swipe + particles
│   │   ├── characters.tsx     # Theme/unlock selector
│   │   └── leaderboard.tsx    # Classic/Daily tabs
│   └── src/game/
│       ├── types.ts
│       ├── constants.ts
│       ├── maze.ts            # Seeded procedural gen
│       ├── ai.ts              # Pellet Guy AI w/ evasion
│       ├── sounds.ts          # Web Audio chiptune engine
│       ├── progress.ts        # Theme catalog + save/load
│       ├── rng.ts             # mulberry32 PRNG
│       ├── api.ts             # Backend client
│       ├── useGhostMaze.ts    # Core game state hook
│       └── MazeRenderer.tsx   # Animated entity rendering
└── tests/                     # Pytest suite (14 backend tests passing)
```

## Test Coverage Summary
- **Phase 1**: 13/13 frontend
- **Phase 2**: 14/14 frontend
- **Phase 3**: 14/14 backend + 10/10 frontend = 24
- **Total**: 51 automated tests passing across 3 phases
