#!/bin/bash

echo "🎮 Ghost Maze Release Ritual Starting..."

# 1. Stage everything
git add -A

# 2. Commit (auto message if none provided)
MSG=${1:-"chore: game update"}
git commit -m "$MSG"

# 3. Push to GitHub
git push

echo "📦 Build step (if configured)..."

# OPTIONAL: if you have a build command, uncomment ONE of these:

# npm run build
# npm run apk
# npm run android
# gradlew assembleRelease

echo "🚀 Release ritual complete!"