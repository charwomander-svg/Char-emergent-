// Seeded pseudo-random number generator (mulberry32)
// Deterministic - same seed produces same sequence
// Used for Daily Challenge mazes so all players get the same maze each day

// Polyfill for Math.imul (not available in all JavaScript environments)
const imul = Math.imul || function(a: number, b: number): number {
  const ah = (a >>> 16) & 0xffff;
  const al = a & 0xffff;
  const bh = (b >>> 16) & 0xffff;
  const bl = b & 0xffff;
  return ((al * bl) + (((ah * bl + al * bh) << 16) >>> 0) | 0);
};

export function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = imul(t ^ (t >>> 15), t | 1);
    t ^= t + imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Stable hash of any string -> 32-bit seed (kept consistent with backend SHA-256)
// For frontend convenience without crypto deps. Backend authority on actual seed.
export function hashStringToSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = imul(h, 16777619) >>> 0;
  }
  return h & 0x7fffffff;
}
