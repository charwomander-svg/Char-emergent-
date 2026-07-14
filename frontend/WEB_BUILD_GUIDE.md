# Ghost Maze Web Export Build Guide

## Overview

This guide documents how to build and deploy Ghost Maze for web platforms including itch.io.

## Building for Web

### Export for Web

To export the Ghost Maze game for web deployment (e.g., itch.io), use the following command from the `frontend` directory:

```bash
npm run export:web
```

This command:
1. Runs `expo export -p web` to bundle the application for web
2. Automatically runs `node scripts/fix-web-assets.js` to correct asset paths
3. Generates a production-ready build in the `dist/` directory

### What the Fix Does

The Expo/Metro bundler has a known issue where asset paths can be doubled (e.g., `/assets/assets/sounds/` instead of `/assets/sounds/`). The `fix-web-assets.js` script fixes this by:

1. **Flattening the asset directory structure**: Moves files from `dist/assets/assets/` to `dist/assets/`
2. **Updating bundle references**: Replaces all `/assets/assets/` paths with `/assets/` in the JavaScript and HTML files
3. **Cleaning up empty directories**: Removes the now-empty `dist/assets/assets/` directory

This ensures all assets (images, sounds, fonts) load correctly when deployed to web servers.

## Deployment to itch.io

### Steps

1. **Build the web version**:
   ```bash
   cd frontend
   npm run export:web
   ```

2. **Verify the output**:
   Check that `dist/` contains:
   - `index.html` and other HTML route files
   - `_expo/` directory with the JavaScript bundle
   - `assets/` directory with subdirectories for `images/`, `sounds/`, and `node_modules/`

3. **Upload to itch.io**:
   - Create a new game project on itch.io
   - Under "Edit game" → "Hosting options", enable "This file will be played in the browser"
   - Upload the entire `dist/` directory as the build
   - Set `index.html` as the entry point if prompted

### itch.io Configuration

Ensure your itch.io game has:
- **Hosting option**: "This file will be played in the browser" (Whitelabel browser)
- **Upload**: All files from `dist/` directory
- **Entry point**: `index.html`

## Supported Platforms

The Ghost Maze build system supports multiple platforms:

### Native Android (APK/AAB)
- Build command: `cd frontend && npm ci && ./gradlew assembleRelease`
- Output: `frontend/android/app/build/outputs/apk/release/app-release.apk`
- Assets: Bundled directly using `require()` statements

### Expo Go (Mobile Preview)
- Build command: `cd frontend && expo start`
- Assets: Loaded from CDN for icon fonts, require() for game assets
- Requires: EAS account for release builds

### Web (itch.io, Vercel, etc.)
- Build command: `cd frontend && npm run export:web`
- Output: `dist/` directory
- Assets: Static files in `dist/assets/`
- Deployment: Copy `dist/` to any web server

## Asset Loading

The application uses the `@/assets/` alias (mapped to `./assets/` in tsconfig.json) for all asset imports:

```typescript
// Sounds (used in src/game/sounds.ts)
const SFX_SOURCE = require("@/assets/sounds/chomp.wav");

// Images (used in app/_layout.tsx)
const charwareLogo = require("@/assets/images/charware_splash.png");
```

This approach:
- Works across all platforms
- Is automatically processed by the bundler
- Requires the `fix-web-assets.js` script only for web exports

## Troubleshooting

### Assets not loading on itch.io

1. **Verify asset paths**: In the browser's dev tools (F12), check the Network tab to see if assets are being requested at `/assets/sounds/` (not `/assets/assets/sounds/`)
2. **Run the fix script**: Ensure `npm run export:web` was used (not just `expo export`)
3. **Check file permissions**: Ensure all files in `dist/` are readable

### Build fails with Metro errors

- Clear the Metro cache: `rm -rf .metro-cache`
- Reinstall dependencies: `npm ci`
- Try again: `npm run export:web`

## Development

For local web development, use:

```bash
npm run web
```

This starts the development server with hot reload, typically available at `http://localhost:8081`.
