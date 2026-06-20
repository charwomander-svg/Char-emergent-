import { baseSnapshot, createDeck } from "@/src/cards/games/base";
import type { CardAction, CardGameDefinition, GameSnapshot } from "@/src/cards/engine/types";

function createInitialState(seed: number): GameSnapshot {
  const snapshot = baseSnapshot("texas-holdem", seed, [
    "deck",
    "community",
    "player-1-hand",
    "player-2-hand",
    "pot",
    "discard",
  ]);
  const deck = createDeck(seed);
  snapshot.activeSeat = "player-1";
  snapshot.zones["player-1-hand"].cards = deck.slice(0, 2).map((card) => ({ ...card, faceUp: true }));
  snapshot.zones["player-2-hand"].cards = deck.slice(2, 4).map((card) => ({ ...card, faceUp: false }));
  snapshot.zones.deck.cards = deck.slice(4);
  return snapshot;
}

function getLegalActions(snapshot: GameSnapshot): CardAction[] {
  const actions: CardAction[] = [{ type: "resolve" }];
  if (snapshot.zones.community.cards.length < 5 && snapshot.zones.deck.cards.length > 0) {
    actions.unshift({ type: "deal", target: "community", count: snapshot.zones.community.cards.length === 0 ? 3 : 1 });
  }
  return actions;
}

function applyAction(snapshot: GameSnapshot, action: CardAction): GameSnapshot {
  if (action.type === "deal" && action.target === "community") {
    const deckCards = [...snapshot.zones.deck.cards];
    const communityCards = [...snapshot.zones.community.cards];
    const cardsToDeal = Math.min(action.count, deckCards.length);
    for (let count = 0; count < cardsToDeal; count += 1) {
      const nextCard = deckCards.shift();
      if (nextCard) {
        communityCards.push({ ...nextCard, faceUp: true });
      }
    }
    return {
      ...snapshot,
      revision: snapshot.revision + 1,
      turn: snapshot.turn + 1,
      zones: {
        ...snapshot.zones,
        deck: { ...snapshot.zones.deck, cards: deckCards },
        community: { ...snapshot.zones.community, cards: communityCards },
      },
      activeSeat: snapshot.activeSeat === "player-1" ? "player-2" : "player-1",
    };
  }

  if (action.type === "resolve") {
    return {
      ...snapshot,
      revision: snapshot.revision + 1,
      status: "draw",
    };
  }

  return { ...snapshot, revision: snapshot.revision + 1 };
}

export const texasHoldemDefinition: CardGameDefinition = {
  metadata: {
    id: "texas-holdem",
    title: "Texas Hold'em",
    category: "pvp",
    launchTier: "launch",
    playerCounts: [2, 3, 4],
    supportsOnline: true,
    supportsDailySeed: false,
    tags: ["betting", "community_cards", "hotseat", "online_ready"],
  },
  setup: {
    deck: { deckCount: 1, jokers: 0 },
    zones: ["deck", "community", "player-1-hand", "player-2-hand", "pot", "discard"],
    seats: [
      { id: "player-1", label: "Player 1" },
      { id: "player-2", label: "Player 2" },
    ],
  },
  createInitialState,
  getLegalActions,
  applyAction,
  evaluateWinState: (snapshot) => snapshot.status,
  validateDefinition: () => ({ ok: true, issues: [] }),
};
