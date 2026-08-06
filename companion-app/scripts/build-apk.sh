#!/usr/bin/env bash
# Build a sideloadable release APK for the Ghost Maze Companion admin app.
# Output: companion-app/dist/ghost-maze-companion.apk
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export CI="${CI:-1}"
export ANDROID_HOME="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-}}"

if [[ -z "${ANDROID_HOME}" ]]; then
  echo "ANDROID_HOME / ANDROID_SDK_ROOT is not set." >&2
  exit 1
fi

if [[ ! -d node_modules ]]; then
  npm ci --no-audit --no-fund
fi

npx expo prebuild --platform android

chmod +x android/gradlew
(
  cd android
  ./gradlew assembleRelease --no-daemon
)

mkdir -p dist
cp android/app/build/outputs/apk/release/app-release.apk dist/ghost-maze-companion.apk
ls -lah dist/ghost-maze-companion.apk
echo "APK ready: $ROOT/dist/ghost-maze-companion.apk"
