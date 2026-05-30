#!/usr/bin/env bash

msg="$1"

if [ -z "$msg" ]; then
  echo "❌ Commit message required"
  exit 1
fi

echo "📦 Staging changes..."
git add .

echo "🧠 Committing..."
git commit -m "$msg"

echo "🚀 Pushing..."
git push

echo "✨ Done."