# Ghost Maze Companion Android app

Expo app for backend admin edits (news + promo/mail).

- Package: `dev.charware.ghostmaze.companion`
- Unlock with backend URL + `ADMIN_API_KEY`
- Admin key is stored in SecureStore
- Not a Play Store release target

Commands:

```bash
npm start
npm run android
npm run typecheck
npm run apk   # release APK -> dist/ghost-maze-companion.apk
```

CI: `.github/workflows/build-companion-apk.yml` uploads the APK as a workflow artifact.
