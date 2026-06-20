import { DeterministicRng } from "@/src/cards/engine/rng";
import type { Card, GameSnapshot, Rank, Suit, Zone } from "@/src/cards/engine/types";

const suits: Suit[] = ["clubs", "diamonds", "hearts", "spades"];
const ranks: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

export function createDeck(seed: number, deckCount = 1): Card[] {
  const rng = new DeterministicRng(seed);
  const cards: Card[] = [];
  for (let deck = 0; deck < deckCount; deck += 1) {
    for (const suit of suits) {
      for (const rank of ranks) {
        cards.push({
          id: `${deck}-${suit}-${rank}`,
          rank,
          suit,
          faceUp: false,
        });
      }
    }
  }
  return rng.shuffle(cards);
}

export function buildZones(labels: string[]): Record<string, Zone> {
  return labels.reduce<Record<string, Zone>>((map, label) => {
    map[label] = {
      id: label,
      label,
      cards: [],
    };
    return map;
  }, {});
}

export function baseSnapshot(rulesetId: string, seed: number, labels: string[]): GameSnapshot {
  return {
    rulesetId,
    seed,
    revision: 1,
    activeSeat: null,
    zones: buildZones(labels),
    turn: 1,
    status: "active",
  };
}
