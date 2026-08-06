# Ghost Maze Companion

Lightweight plain-text admin UI for backend news and promo/mail codes.

## Open it

1. Set `ADMIN_API_KEY` in the backend environment (for local dev: `backend/.env`).
2. Start the backend.
3. Visit `/companion/` on the backend host (also available at `/admin`).

Example local URL: `http://localhost:8000/companion/`

## What you can edit

- **News**: date, title, body
- **Promo / mail codes**: code, coin reward, uses total, uses per person

No JSON editing is required. The page talks to `/api/admin/*` using your admin key.
