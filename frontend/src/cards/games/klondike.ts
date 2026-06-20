import { baseSnapshot, createDeck } from "@/src/cards/games/base";
import type { CardAction, CardGameDefinition, GameSnapshot } from "@/src/cards/engine/types";

function createInitialState(seed: number): GameSnapshot {
  const snapshot = baseSnapshot("klondike", seed, [
    "stock",
    "waste",
    "foundation-1",
    "foundation-2",
    "foundation-3",
    "foundation-4",
    "tableau-1",
    "tableau-2",
    "tableau-3",
    "tableau-4",
    "tableau-5",
    "tableau-6",
    "tableau-7",
  ]);
  const deck = createDeck(seed);

  let cursor = 0;
  for (let column = 1; column <= 7; column += 1) {
    const pile = deck.slice(cursor, cursor + column).map((card, index) => ({
      ...card,
      faceUp: index === column - 1,
    }));
    snapshot.zones[`tableau-${column}`].cards = pile;
    cursor += column;
  }

  snapshot.zones.stock.cards = deck.slice(cursor);
  return snapshot;
}

function getLegalActions(snapshot: GameSnapshot): CardAction[] {
  const actions: CardAction[] = [];
  if (snapshot.zones.stock.cards.length > 0) {
    actions.push({ type: "draw", source: "stock", count: 1 });
  }
  return actions;
}

function applyAction(snapshot: GameSnapshot, action: CardAction): GameSnapshot {
  if (action.type !== "draw" || action.source !== "stock") {
    return { ...snapshot, revision: snapshot.revision + 1 };
  }

  const stockCards = [...snapshot.zones.stock.cards];
  const wasteCards = [...snapshot.zones.waste.cards];
  const nextCard = stockCards.shift();

  if (nextCard) {
    wasteCards.unshift({ ...nextCard, faceUp: true });
  }

  return {
    ...snapshot,
    revision: snapshot.revision + 1,
    turn: snapshot.turn + 1,
    zones: {
      ...snapshot.zones,
      stock: { ...snapshot.zones.stock, cards: stockCards },
      waste: { ...snapshot.zones.waste, cards: wasteCards },
    },
  };
}

export const klondikeDefinition: CardGameDefinition = {
  metadata: {
    id: "klondike",
    title: "Klondike",
    category: "solitaire",
    launchTier: "launch",
    playerCounts: [1],
    supportsOnline: false,
    supportsDailySeed: true,
    tags: ["classic", "undo", "daily_seed", "controller_friendly"],
  },
  setup: {
    deck: { deckCount: 1, jokers: 0 },
    zones: [
      "stock",
      "waste",
      "foundation-1",
      "foundation-2",
      "foundation-3",
      "foundation-4",
      "tableau-1",
      "tableau-2",
      "tableau-3",
      "tableau-4",
      "tableau-5",
      "tableau-6",
      "tableau-7",
    ],
    seats: [{ id: "solo", label: "Solo" }],
  },
  createInitialState,
  getLegalActions,
  applyAction,
  evaluateWinState: (snapshot) => (snapshot.zones.stock.cards.length === 0 ? "won" : "active"),
  validateDefinition: () => ({ ok: true, issues: [] }),
};
