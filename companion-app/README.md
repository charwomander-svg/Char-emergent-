# Ghost Maze Companion (Android)

Lightweight Expo Android app for editing Ghost Maze backend **news** and **promo/mail** codes with plain text fields.

Not intended for Google Play — personal/admin sideload only.

## Features

- Unlock with backend URL + `ADMIN_API_KEY`
- News editor: date, title, body
- Promo/mail editor: code, coins, power-up amounts, uses total, uses per person
- Admin key stored in SecureStore

## Run on Android

```bash
cd companion-app
npm install
# Point at local backend if needed, then:
npm run android
```

Or start Metro and open on a device/emulator:

```bash
npm start
```

## Backend requirements

The companion talks to the Ghost Maze API admin routes:

- `GET /api/admin/health`
- `/api/admin/news`
- `/api/admin/promos`

Set `ADMIN_API_KEY` on the backend before unlocking.

Default backend URL in the unlock screen:

`https://ghost-maze-backend.onrender.com`

For a local API from an Android emulator, use `http://10.0.2.2:8000`.
