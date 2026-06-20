import { baseSnapshot, createDeck } from "@/src/cards/games/base";
import type { CardAction, CardGameDefinition, GameSnapshot } from "@/src/cards/engine/types";

function createInitialState(seed: number): GameSnapshot {
  const snapshot = baseSnapshot("blackjack", seed, [
    "shoe",
    "dealer-hand",
    "player-hand",
    "discard",
  ]);
  const deck = createDeck(seed, 6);
  snapshot.activeSeat = "player-1";
  snapshot.zones.shoe.cards = deck.slice(4);
  snapshot.zones["player-hand"].cards = deck.slice(0, 2).map((card) => ({ ...card, faceUp: true }));
  snapshot.zones["dealer-hand"].cards = [
    { ...deck[2], faceUp: true },
    { ...deck[3], faceUp: false },
  ];
  return snapshot;
}

function getLegalActions(): CardAction[] {
  return [
    { type: "draw", source: "shoe", count: 1 },
    { type: "resolve" },
  ];
}

function applyAction(snapshot: GameSnapshot, action: CardAction): GameSnapshot {
  if (action.type === "draw") {
    const shoeCards = [...snapshot.zones.shoe.cards];
    const playerCards = [...snapshot.zones["player-hand"].cards];
    const nextCard = shoeCards.shift();
    if (nextCard) {
      playerCards.push({ ...nextCard, faceUp: true });
    }
    return {
      ...snapshot,
      revision: snapshot.revision + 1,
      turn: snapshot.turn + 1,
      zones: {
        ...snapshot.zones,
        shoe: { ...snapshot.zones.shoe, cards: shoeCards },
        "player-hand": { ...snapshot.zones["player-hand"], cards: playerCards },
      },
    };
  }

  if (action.type === "resolve") {
    return {
      ...snapshot,
      revision: snapshot.revision + 1,
      status: "won",
    };
  }

  return { ...snapshot, revision: snapshot.revision + 1 };
}

export const blackjackDefinition: CardGameDefinition = {
  metadata: {
    id: "blackjack",
    title: "Blackjack",
    category: "dealer",
    launchTier: "launch",
    playerCounts: [1],
    supportsOnline: false,
    supportsDailySeed: false,
    tags: ["dealer", "economy", "payouts", "house_rules"],
  },
  setup: {
    deck: { deckCount: 6, jokers: 0 },
    zones: ["shoe", "dealer-hand", "player-hand", "discard"],
    seats: [
      { id: "dealer", label: "Dealer" },
      { id: "player-1", label: "Player 1" },
    ],
  },
  createInitialState,
  getLegalActions,
  applyAction,
  evaluateWinState: (snapshot) => snapshot.status,
  validateDefinition: () => ({ ok: true, issues: [] }),
};
