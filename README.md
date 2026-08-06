# Ghost Maze

Reverse Pac-Man game monorepo:

- `frontend/` — Expo / React Native Android client
- `backend/` — FastAPI + MongoDB API
- `backend/companion/` — lightweight plain-text admin UI for news and promo/mail codes

## Companion admin

After setting `ADMIN_API_KEY` on the backend, open:

`https://<your-backend-host>/companion/`

Use plain form fields (no JSON) to manage:

- News: date, title, body
- Promo/mail codes: code, coin reward, power-ups, uses total, uses per person

See `AGENTS.md` for local run instructions.
