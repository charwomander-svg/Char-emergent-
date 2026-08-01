# AGENTS.md

## Cursor Cloud specific instructions

Ghost Maze is a "reverse Pac-Man" game. This repo is a monorepo with two runnable
services plus a couple of static satellites:

- `backend/` — FastAPI + MongoDB API (leaderboards, daily seed, promo codes, news, Stripe payments).
- `frontend/` — Expo / React Native game client (Android/iOS/Web). Use the **web** target for testing in the cloud VM.
- `charware-site/` — static marketing page (`index.html`, no build).

The environment already has MongoDB 8, Node 22, Python 3.12, and a Python venv at
`backend/.venv`. The update script keeps `backend/.venv` and `frontend/node_modules` current.

### Running the services (dev mode)

1. MongoDB (required by the backend; not auto-started):
   `mongod --dbpath /var/lib/mongodb --bind_ip 127.0.0.1 --port 27017`
2. Backend API on :8000:
   `cd backend && source .venv/bin/activate && uvicorn server:app --host 0.0.0.0 --port 8000`
3. Frontend web on :8081 (point it at the local backend):
   `cd frontend && EXPO_PUBLIC_BACKEND_URL=http://localhost:8000 npx expo start --web --port 8081`

### Non-obvious gotchas

- The backend **refuses to start without `MONGO_URL`** (raises `RuntimeError` on startup).
  It reads `backend/.env` (gitignored). This file is created during setup with
  `MONGO_URL=mongodb://127.0.0.1:27017` and `DB_NAME=ghost_maze`; recreate it if missing.
- The frontend defaults `EXPO_PUBLIC_BACKEND_URL` to the hosted Render backend
  (`https://ghost-maze-backend.onrender.com`). Always export it to `http://localhost:8000`
  when you want the web client to talk to the local backend.
- Stripe is **optional**. Without `STRIPE_API_KEY`, the `/api/checkout/*` endpoints return
  503 and the 3 tests in `backend/tests/test_payments_api.py` fail with "Payments not configured".
  The other ~19 backend tests and all game features work without it.
- The web app installs a global `unhandledrejection` overlay in `frontend/app/+html.tsx`.
  On first web load (before any user click) browser audio-autoplay raises a benign
  `NotAllowedError: play() failed...` that this overlay renders full-screen; it is not a real crash.

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
