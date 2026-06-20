# Word Dictionary — `words.json`

## Format

`words.json` is a compact JSON object keyed by word length (as a string).
Each value is a **sorted array of lowercase alphabetic strings**.

```json
{
  "4": ["aahs", "aardvark", ...],
  "5": ["aalii", "abaci", ...],
  ...
  "20": ["abdominohysterectomy", ...]
}
```

| Key | Length range | Total words |
|-----|-------------|-------------|
| `"4"` – `"20"` | 4–20 letters | ~232 700 |

## Usage

Load only the lengths your game session needs to keep memory low:

```ts
import wordsRaw from "../assets/words.json";

// TypeScript type helper
const wordsByLength = wordsRaw as Record<string, string[]>;

function getWords(length: number): string[] {
  return wordsByLength[String(length)] ?? [];
}

function isValidWord(word: string): boolean {
  const list = getWords(word.length);
  // Binary search on the sorted array — O(log n)
  let lo = 0, hi = list.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (list[mid] === word) return true;
    if (list[mid] < word) lo = mid + 1;
    else hi = mid - 1;
  }
  return false;
}
```

## Regenerating

```bash
pip install nltk
python scripts/generate_word_list.py
```

The source corpus is the **NLTK English words** list (public domain).
Words are filtered to: only alphabetic characters, length 4–20, lowercase.
