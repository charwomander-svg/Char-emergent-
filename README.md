# Ghost Maze

Reverse Pac-Man game monorepo:

- `frontend/` — Expo / React Native Android game client
- `backend/` — FastAPI + MongoDB API
- `backend/companion/` — lightweight browser admin UI for news and promo/mail codes
- `companion-app/` — Android Expo admin app (sideload; not for Play Store)

## Companion admin

After setting `ADMIN_API_KEY` on the backend:

**Browser UI:** `https://<your-backend-host>/companion/`

**Android app:**

```bash
cd companion-app
npm install
npm run android
```

Use plain form fields (no JSON) to manage:

- News: date, title, body
- Promo/mail codes: code, coin reward, power-ups, uses total, uses per person

See `AGENTS.md` for local run instructions.
