# AGENTS.md

## Cursor Cloud specific instructions

Ghost Maze is a "reverse Pac-Man" game. This repo is a monorepo with two runnable
services:

- `backend/` — FastAPI + MongoDB API (leaderboards, daily seed, promo codes, news).
- `frontend/` — Expo / React Native Android game client.

Android is the primary release target. Treat Android Verification / signed AAB
builds as the release gate; do not consider PRs release-ready until the Android
build passes and `versionCode`/signing are correct for Play Console.

The environment already has MongoDB 8, Node 22, Python 3.12, and a Python venv at
`backend/.venv`. The update script keeps `backend/.venv` and `frontend/node_modules` current.

### Running the services (dev mode)

1. MongoDB (required by the backend; not auto-started):
   `mongod --dbpath /var/lib/mongodb --bind_ip 127.0.0.1 --port 27017`
2. Backend API on :8000:
   `cd backend && source .venv/bin/activate && uvicorn server:app --host 0.0.0.0 --port 8000`
3. Frontend Android:
   `cd frontend && EXPO_PUBLIC_BACKEND_URL=http://localhost:8000 npm run android`
4. Companion admin UI (plain-text news + promo/mail editor, not a store app):
   open `http://localhost:8000/companion/` after setting `ADMIN_API_KEY` in `backend/.env`
5. Companion Android app (same admin features as the web UI):
   `cd companion-app && npm install && npm run android`
   Unlock with backend URL + `ADMIN_API_KEY`. Emulator local API: `http://10.0.2.2:8000`.

### Non-obvious gotchas

- The backend **refuses to start without `MONGO_URL`** (raises `RuntimeError` on startup).
  It reads `backend/.env` (gitignored). This file is created during setup with
  `MONGO_URL=mongodb://127.0.0.1:27017` and `DB_NAME=ghost_maze`; recreate it if missing.
- Companion admin routes (`/api/admin/*` and `/companion/`) require `ADMIN_API_KEY`.
  Send it as the `X-Admin-Key` header. News/promo edits are stored in MongoDB
  (`news_items`, `promo_codes`) so you do not need to hand-edit JSON env vars.
- The frontend defaults `EXPO_PUBLIC_BACKEND_URL` to the hosted Render backend
  (`https://ghost-maze-backend.onrender.com`). Always export it to `http://localhost:8000`
  when you want the Android client to talk to the local backend.
- Payments use Google Play Billing through the frontend `react-native-iap` integration.
  The backend does not expose card checkout endpoints.

### Known pre-existing app bugs (as of this setup, not environment issues)

The revert commit `8a08bad` ("Revert 'Production polish and music library options'") was
incomplete and left the frontend UI unable to run on a clean checkout:
- `frontend/app/index.tsx` and `frontend/app/settings.tsx` import `chooseMusicTrack` from
  `src/game/sounds.ts`, but that export was removed (only `getMusicTrackForLevel` remains) —
  causes an immediate blank/error screen on boot.
- `frontend/src/game/useGhostMaze.ts` references `startLevel` in a `useEffect` dependency
  array before its `const` declaration (temporal dead zone) — crashes "START RUN" with
  `Cannot access 'startLevel' before initialization`.
These are application-code defects, separate from environment setup.

### Lint / test commands

- Frontend lint: `cd frontend && npm run lint` (expect 0 errors; a few warnings are normal).
- Maze playability check: `cd frontend && npm run maze:check`.
- Backend tests are black-box HTTP tests against a running server, not in-process:
  start MongoDB + the backend, then
  `cd backend && source .venv/bin/activate && EXPO_PUBLIC_BACKEND_URL=http://localhost:8000 python -m pytest tests/`.
