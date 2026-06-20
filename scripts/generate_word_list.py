#!/usr/bin/env python3
"""
Generate the English word dictionary for the Wordle clone game.

Produces frontend/assets/words.json — an object keyed by word-length (as a
string) where every value is a sorted array of lowercase alphabetic words.
Words are drawn from the NLTK English words corpus and filtered to the
range 4–20 letters, matching the playable lengths in the game.

Usage:
    pip install nltk
    python scripts/generate_word_list.py
"""

import json
import os
import sys
from collections import defaultdict

try:
    import nltk
except ImportError:
    sys.exit("Error: nltk is not installed.  Run:  pip install nltk")

# Download the corpus quietly if not already present.
nltk.download("words", quiet=True)

from nltk.corpus import words as _nltk_words  # noqa: E402  (after download)

MIN_LEN = 4
MAX_LEN = 20

OUT_PATH = os.path.join(
    os.path.dirname(__file__), "..", "frontend", "assets", "words.json"
)


def build_dictionary() -> dict[str, list[str]]:
    """Return a dict mapping str(length) -> sorted list of words."""
    by_length: dict[str, set[str]] = defaultdict(set)
    for raw in _nltk_words.words():
        word = raw.lower()
        if word.isalpha() and MIN_LEN <= len(word) <= MAX_LEN:
            by_length[str(len(word))].add(word)

    return {str(length): sorted(by_length[str(length)]) for length in range(MIN_LEN, MAX_LEN + 1)}


def main() -> None:
    print("Building word dictionary…")
    dictionary = build_dictionary()

    total = sum(len(v) for v in dictionary.values())
    for length in range(MIN_LEN, MAX_LEN + 1):
        key = str(length)
        count = len(dictionary.get(key, []))
        print(f"  {length:2d} letters: {count:6d} words")
    print(f"  Total:    {total:6d} words")

    out_path = os.path.normpath(OUT_PATH)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as fh:
        # Compact JSON — no extra whitespace to keep the asset small.
        json.dump(dictionary, fh, separators=(",", ":"), ensure_ascii=True)
        fh.write("\n")

    size_kb = os.path.getsize(out_path) / 1024
    print(f"\nWrote {out_path} ({size_kb:.1f} KB)")


if __name__ == "__main__":
    main()
