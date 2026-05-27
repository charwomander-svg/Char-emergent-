# Ghost Maze - Product Requirements Document

## Overview
**Ghost Maze** is a reverse Pac-Man mobile game built with Expo/React Native. The player controls all 4 ghosts simultaneously (independently) to chase and catch Pellet Guy through randomized mazes.

## Core Concept
- **Genre**: Arcade / Strategy
- **Platform**: Mobile (Android primary, iOS supported), Web preview
- **Inspiration**: Classic Pac-Man, reversed

## MVP Implemented (v1.0)

### Game Mechanics
- **4 Independent Ghosts**: Blinky (red), Pinky (pink), Inky (cyan), Clyde (orange)
- **Individual Control**: Each ghost has its own 2x2 D-pad with 4 directional buttons
- **Continuous Movement**: Ghosts keep moving in last set direction until changed
- **Win Condition**: Catch Pellet Guy 3 times to clear a level
- **Loss Conditions**:
  - Pellet Guy eats all pellets → lose 1 life
  - Pellet Guy eats all 4 ghosts → lose 1 life
  - 0 lives remaining → Game Over

### Maze System
- **Procedurally Generated**: Recursive backtracking + loop carving
- **Symmetric**: Left-mirrored to right for classic feel
- **Size**: 15 columns × 19 rows
- **Difficulty Scaling**:
  - Higher levels = narrower (fewer loops)
  - Higher levels = faster entities
  - Higher levels = more super pellets
  - Higher levels = smarter Pellet Guy (placeholder for future AI tier-up)

### Entities
- **Ghosts**: Spawn in central "ghost house"; exit via top opening
- **Pellet Guy**: Spawns at bottom-center; faster than individual ghosts; AI moves randomly with straight-line preference (Level 1)
- **Pellets**: Filled in all walkable cells; +10 points each
- **Super Pellets**: 2-6 per level; +50 points; makes ghosts vulnerable for 6 seconds

### Scoring
- Pellet eaten by Pellet Guy: +10 (counts against player)
- Super pellet: +50
- Catch Pellet Guy: +200
- Combo bonus (multi-ghost catch within 1.5s): +300 per extra ghost
- Eat vulnerable ghost: +100
- **Level completion bonus**: % pellets remaining × 20 points

### UI/UX
- Retro pixel-art aesthetic (classic Pac-Man inspired)
- HUD: Level, Score, Catches (X/3), Lives, Pellets bar
- Main Menu with How-to-Play and visual previews
- 2×2 control grid (4 D-pads, one per ghost)
- Selected ghost shows highlight ring
- Pause/Resume and Quit buttons
- Haptic feedback on button presses (no-op on web)

## Roadmap (Phase 2+)

### Phase 2 - Enhanced Gameplay
- Smart Pellet Guy AI (evasion, pellet-seeking)
- Spike traps & barricades (Pellet Guy power-ups)
- Sound effects & music
- Swipe gesture controls (alternative to buttons)
- Smooth tile-to-tile movement animation
- Stagger ghost release from spawn

### Phase 3 - Persistence & Progression
- Local save data (level progress, high scores)
- Character unlock system (alternate ghost skins)
- Hidden characters
- Achievement system

### Phase 4 - Multiplayer & Backend
- Gamepad/controller support
- Online leaderboards (MongoDB backend)
- Daily challenges
- Social sharing

## Tech Stack
- **Frontend**: Expo SDK 54, React Native, Expo Router (file-based routing)
- **Rendering**: React Native Views (absolute positioning + flex)
- **Game Loop**: `requestAnimationFrame` for 60fps tick
- **Storage**: (Future) `@/src/utils/storage` for unlocks/scores
- **Backend**: FastAPI + MongoDB (stubbed; not connected in MVP)

## File Structure
```
/app/frontend/
├── app/
│   ├── _layout.tsx          # Expo Router root layout
│   ├── index.tsx            # Main menu screen
│   └── game.tsx             # Main game screen + controls
└── src/
    └── game/
        ├── types.ts         # TypeScript types
        ├── constants.ts     # Colors, speeds, scoring
        ├── maze.ts          # Procedural maze generation
        ├── ai.ts            # Pellet Guy AI
        ├── useGhostMaze.ts  # Core game state hook
        └── MazeRenderer.tsx # Maze + entity rendering
```

## Key Test IDs
- `main-menu`, `play-btn`
- `game-screen`, `game-hud`, `maze-board`, `controls`
- `hud-level`, `hud-score`, `hud-catches`, `pellets-text`
- `ghost-dpad-{0-3}`, `ghost-select-{0-3}`, `ghost-{id}-{up|down|left|right}`
- `pause-btn`, `quit-btn`, `restart-btn`, `menu-btn`
- `overlay-message`
