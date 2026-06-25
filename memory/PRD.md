# Ghost Maze - Product Requirements Document

## Overview
**Ghost Maze** is a reverse Pac-Man mobile game built with Expo/React Native. The player controls all 4 ghosts simultaneously to chase and catch Pellet Guy through randomized mazes. Now features online leaderboards, daily challenges, friend invites, custom seeds, gamepad support, bundled native audio, **dual-currency economy with Stripe microtransactions**, and **11 strategic power-ups**.

## Implemented Features (v5.0)

### Phase 1 — MVP (13 tests)
Maze gen, 4 ghosts, individual control, catches/lives/scoring.

### Phase 2 — Polish (14 tests)
Smooth animation, sounds + music, traps & barricades, character unlocks, smarter AI.

### Phase 3 — Network (24 tests)
Daily challenge, leaderboard, score submission, ghost-house stagger, particle effects, swipe gestures.

### Phase 6 — Boss Fights (v6.0)
- **Boss levels every 5 levels** (5, 10, 15, …): Pellet Guy becomes the "Boss" with **3 HP** displayed as a red bar replacing the pellets bar.
- **3 phases** keyed off remaining HP:
  - **Phase 1 — AWAKENED** (HP 3/3): 1.15× sprite, warm orange aura, 0.95× tick interval (slightly faster).
  - **Phase 2 — FURIOUS** (HP 2/3): 1.3× sprite, hot-pink aura, 0.85× speed, **teleports** to a random faraway pellet every ~9s.
  - **Phase 3 — FINAL FORM** (HP 1/3): 1.6× sprite, furious red pulsing aura, 0.75× speed, faster teleport cooldown (~6s), AND periodic **lunges** (1.2s windows) where touching ghosts get destroyed regardless of vulnerable state.
- **Each catch deals 1 HP and triggers an HP-pulse message** showing the new phase title.
- **On boss defeat**: Level cleared with **+2000 score + 500 🪙 bonus** plus an "⭐ BOSS DEFEATED ⭐" screen.
- **Rendering**: New `BossAuraSprite` (pulsing animated halo) + `visualScale` prop on PelletGuySprite so the sprite grows by phase.
- **Code organization**: All boss logic isolated in `/app/frontend/src/game/boss.ts` (~170 lines) — keeps `useGhostMaze.ts` focused on the arcade core. Engine hooks into `applyBossHit`, `maybeBossTeleport`, `maybeBossLunge`, `bossIsLunging`, `bossSpeedScale`.

### Phase 5 — Economy & Monetization (v5.0)
- **Dual-currency economy**: Persistent Ghost Coin wallet (AsyncStorage-backed). Coins earned via pellets (+1), super pellets (+5), catches (+25), level clears (+50), perfect runs (+100). Lifetime stats tracked.
- **11 power-ups**: Speed Boost, Teleport, Freeze, Shield, Fast Respawn, Pellet Scatter, Key (open barricades), Magnet, Reveal, Decoy, Quick Revive. Activated in-game from horizontal-scroll bar; consume one charge on use. Engine applies effects (timers, shields, AI reactions).
- **Stripe Microtransactions (NO ADS)**: 4 coin packs — $0.99/100, $2.99/400 (POPULAR), $4.99/1000 (BEST VALUE), $9.99/2500 (MEGA DEAL). Hosted Stripe Checkout via `/api/checkout/session`, idempotent server-side fulfillment via `/api/checkout/session/{id}` polling + optional webhook at `/api/checkout/webhook`. Single-player UUID `player_id` stored locally (no accounts).
- **In-app routing**: `/shop` (coin packs + power-ups), `/checkout/success` (polling + coin grant), `/checkout/cancel`. Player ID generated once and persisted via `getPlayerId()`.

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

## Release Scope Lock (v6.1)

### In-scope for release
1. **HUD v1**: score, level, lives, catches/combo, pellets remaining, active power-up effects, pause/state messages, and boss HP+phase cue.
2. **Multi-ghost arming**: top-row ghost buttons toggle independently; swipe commands apply to all armed ghosts; quick "ALL" and "RESET" actions.
3. **Payments hardening**: keep Stripe Checkout flow, add restore/sync balance UX, add checkout status retry UX.
4. **Speedrun mode**: dedicated game mode + timer + best-run local persistence + backend submission field + leaderboard tab sorted by fastest time.
5. **Boss readability polish**: explicit HUD phase and HP signal.
6. **Pellet Guy progression curve**: tiered AI profile from intro -> nightmare to smooth deeper-level scaling.
7. **Music controls**: settings-aware menu/game music start/stop handling.

### Out-of-scope for this release
- Native embedded Stripe SDK (to be wired when production SDK package path is provided).
- New authored music tracks (hooks present; final assets pending).
- Major combat/mechanics redesign beyond balancing knobs.

## Acceptance Criteria (Release Gate)

- HUD is legible on mobile and web, and reflects live game state accurately.
- Any combination of ghost arm buttons can be active at once; direction input affects all active ghosts.
- Shop can recover wallet state from backend and user can manually retry checkout confirmation.
- Speedrun entries can be submitted and appear on speedrun leaderboard ordered by shortest run time.
- Boss encounters visibly communicate HP/phase in HUD.
- Pellet Guy AI difficulty increases across level tiers without abrupt jumps.
- Music obeys sound/music settings and stops/starts correctly during menu/game transitions.

## HUD QA Cases

1. **State accuracy**: score, lives, catches, combo, pellets, and level update correctly as gameplay events happen.
2. **Boss HUD**: on level 5+, boss bar appears with correct HP decrement and phase label.
3. **Effect labels**: timed effects show countdowns and expire cleanly.
4. **Pause visibility**: pause overlay appears immediately and resume removes it.
5. **Responsiveness**: HUD remains readable at narrow mobile widths and larger web widths.
