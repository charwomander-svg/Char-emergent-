# Ghost Maze - Product Requirements Document

## Overview
**Ghost Maze** is a reverse Pac-Man mobile game built with Expo/React Native. The player controls all 4 ghosts simultaneously (independently) to chase and catch Pellet Guy through randomized mazes.

## Core Concept
- **Genre**: Arcade / Strategy
- **Platform**: Mobile (Android primary, iOS supported), Web preview
- **Inspiration**: Classic Pac-Man, reversed

## Implemented Features

### Phase 1 — MVP
- Procedurally generated maze (recursive backtracking + loop carving, 15×19 grid, symmetric)
- 4 independently-controlled ghosts: Blinky (red), Pinky (pink), Inky (cyan), Clyde (orange)
- Per-ghost D-pads with continuous-movement semantics
- Pellet Guy with random AI, faster than ghosts
- Win: catch Pellet Guy 3× per level; combo bonus for multi-ghost catches within 1.5s
- Lose life: Pellet Guy eats all pellets OR all 4 ghosts
- Difficulty scaling per level (speed, narrower mazes, more super pellets)
- Score: pellets + super pellets + catches + combo + (% pellets remaining × 20)
- Retro pixel-art aesthetic; full HUD; main menu; how-to-play

### Phase 2 — Polish & Depth
- **Smooth animation**: `Animated.Value` + `transform: translateX/Y` interpolation between cells (verified fractional offsets in testing)
- **Sound + chiptune music**: Programmatic Web Audio API engine — chomp, super pellet, catch, combo (ascending pitches), ghost eaten, level win/lose, UI clicks + 8-step minor-key bassline music loop. Toggle button in-game.
- **Spike traps & barricades**: Pellet Guy drops traps as he moves (level-scaled probability). Red diamonds = one-shot ghost kill. Orange-striped tiles = block ghosts for 8s. Max 3 active. Trap collisions trigger ghost death + score penalty.
- **Vulnerable-state identification**: Color tuft on head + colored eyes when vulnerable so player can still tell Blinky/Pinky/Inky/Clyde apart at a glance.
- **Character unlock progression**: 7 themes total, persisted via `@/src/utils/storage`. Unlocks scale to level milestones (3/5/7/10) + catch count (100) + perfect-clear achievement (1× hidden Blood Moon theme).
- **Smarter Pellet Guy AI**:
  - Level 1: random with straight-line preference
  - Levels 2-3: weighted random avoiding nearby ghosts (sense radius 4)
  - Levels 4+: greedy evasion (always picks direction maximizing Manhattan distance to threats, sense radius 7); large penalty for stepping into a ghost cell
- **Ghost stuck-fix**: When a ghost's set direction is blocked, automatically picks any valid non-reverse direction (so it never freezes)

## Roadmap (Phase 3+)

### Phase 3 — Network & Social
- Daily Maze Challenge (seeded maze, same for all players that day) + global leaderboard (MongoDB backend)
- Cross-device save sync
- Social share cards ("I caught Pellet Guy in 12s — can you beat me?")

### Phase 4 — Input Modes
- Swipe gesture controls per ghost
- Gamepad/controller support (Bluetooth & USB)
- Adjustable speed / accessibility options

### Phase 5 — Native Polish
- Bundled WAV audio assets so sound works on Expo Go native (currently Web Audio API only; native silently no-ops)
- Particle effects for catches and deaths
- Smooth ghost-house exit stagger

## Tech Stack
- **Frontend**: Expo SDK 54, React Native, Expo Router
- **Game loop**: `requestAnimationFrame` (60fps tick)
- **Rendering**: React Native Views (absolute + flex) with `Animated.View` for smooth motion
- **Audio**: Web Audio API (oscillator-based chiptune)
- **Storage**: `@/src/utils/storage` (AsyncStorage on native / localStorage on web)
- **Backend** (stubbed): FastAPI + MongoDB — reserved for Phase 3 leaderboard

## File Structure
```
/app/frontend/
├── app/
│   ├── _layout.tsx          # Expo Router root
│   ├── index.tsx            # Main menu (START + CHARACTERS)
│   ├── game.tsx             # Game screen + controls
│   └── characters.tsx       # Theme/unlock screen
└── src/
    └── game/
        ├── types.ts          # Game types (CellType, Ghost, etc.)
        ├── constants.ts      # Colors, speeds, scoring, trap balance
        ├── maze.ts           # Procedural maze gen + isWalkable
        ├── ai.ts             # Pellet Guy AI (random → evasive → greedy)
        ├── sounds.ts         # Chiptune sound engine (Web Audio API)
        ├── progress.ts       # Theme catalog + save/load progress
        ├── useGhostMaze.ts   # Core game state hook
        └── MazeRenderer.tsx  # Maze + animated entity rendering
```

## Key Test IDs
- Menu: `main-menu`, `play-btn`, `characters-btn`
- Characters: `characters-screen`, `back-btn`, `theme-{id}` (classic/neon/spectre/mono/candy/blood-moon/rainbow)
- Game: `game-screen`, `game-hud`, `maze-board`, `controls`
- HUD: `hud-level`, `hud-score`, `hud-catches`, `pellets-text`
- Controls: `ghost-dpad-{0-3}`, `ghost-select-{0-3}`, `ghost-{id}-{up|down|left|right}`
- Action: `pause-btn`, `sound-btn`, `quit-btn`, `restart-btn`, `menu-btn`
- Overlay: `overlay-message`
