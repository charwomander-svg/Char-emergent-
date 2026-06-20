# The Ultimate Card Collection

This repository now includes the first implementation scaffold for an Xbox-first card game collection with a custom-engine direction.

## What was added

- A curated MVP blueprint with launch, post-launch, and long-tail game tiers
- Xbox platform targets, accessibility requirements, and certification-impact constraints
- A data-driven card rules foundation in `/home/runner/work/Char-emergent-/Char-emergent-/frontend/src/cards`
- Sample vertical-slice definitions for:
  - Klondike
  - Blackjack
  - Texas Hold'em
- Backend blueprint endpoints in `/home/runner/work/Char-emergent-/Char-emergent-/backend/ultimate_card_collection.py`
- A frontend blueprint screen at `/home/runner/work/Char-emergent-/Char-emergent-/frontend/app/collection.tsx`

## Backend endpoints

- `GET /api/card-collection/blueprint`
- `GET /api/card-collection/catalog`

## Current validation notes

- Baseline validation initially failed because local dependencies were not installed:
  - `pytest: command not found`
  - `expo: not found`

Install backend and frontend dependencies before running the repository validation commands again.
