import { baseSnapshot, createDeck } from "@/src/cards/games/base";
import type { Card, CardAction, CardGameDefinition, GameSnapshot, Rank, Suit } from "@/src/cards/engine/types";

const foundationZones = ["foundation-1", "foundation-2", "foundation-3", "foundation-4"] as const;
const tableauZones = [
  "tableau-1",
  "tableau-2",
  "tableau-3",
  "tableau-4",
  "tableau-5",
  "tableau-6",
  "tableau-7",
] as const;
const rankOrder: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function getRankValue(rank: Rank): number {
  return rankOrder.indexOf(rank);
}

function isRedSuit(suit: Suit): boolean {
  return suit === "diamonds" || suit === "hearts";
}

function isFoundationZone(zoneId: string): zoneId is (typeof foundationZones)[number] {
  return foundationZones.includes(zoneId as (typeof foundationZones)[number]);
}

function isTableauZone(zoneId: string): zoneId is (typeof tableauZones)[number] {
  return tableauZones.includes(zoneId as (typeof tableauZones)[number]);
}

function canPlaceOnFoundation(card: Card, targetCards: Card[]): boolean {
  const topCard = targetCards[targetCards.length - 1];

  if (!topCard) {
    return card.rank === "A";
  }

  return topCard.suit === card.suit && getRankValue(card.rank) === getRankValue(topCard.rank) + 1;
}

function canPlaceOnTableau(card: Card, targetCards: Card[]): boolean {
  const topCard = targetCards[targetCards.length - 1];

  if (!topCard) {
    return card.rank === "K";
  }

  return isRedSuit(card.suit) !== isRedSuit(topCard.suit)
    && getRankValue(card.rank) === getRankValue(topCard.rank) - 1;
}

function isValidFaceUpRun(cards: Card[], startIndex: number): boolean {
  for (let index = startIndex; index < cards.length; index += 1) {
    if (!cards[index].faceUp) {
      return false;
    }

    if (index === cards.length - 1) {
      continue;
    }

    const current = cards[index];
    const next = cards[index + 1];
    if (
      isRedSuit(current.suit) === isRedSuit(next.suit)
      || getRankValue(current.rank) !== getRankValue(next.rank) + 1
    ) {
      return false;
    }
  }

  return true;
}

function getTopCard(cards: Card[]): Card | undefined {
  return cards[cards.length - 1];
}

function serializeAction(action: CardAction): string {
  return JSON.stringify(action);
}

function createInitialState(seed: number): GameSnapshot {
  const snapshot = baseSnapshot("klondike", seed, ["stock", "waste", ...foundationZones, ...tableauZones]);
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
  } else if (snapshot.zones.waste.cards.length > 0) {
    actions.push({ type: "draw", source: "waste", count: snapshot.zones.waste.cards.length });
  }

  const wasteTop = getTopCard(snapshot.zones.waste.cards);
  if (wasteTop) {
    for (const foundationZone of foundationZones) {
      if (canPlaceOnFoundation(wasteTop, snapshot.zones[foundationZone].cards)) {
        actions.push({
          type: "move",
          source: "waste",
          target: foundationZone,
          cardIds: [wasteTop.id],
        });
      }
    }

    for (const tableauZone of tableauZones) {
      if (canPlaceOnTableau(wasteTop, snapshot.zones[tableauZone].cards)) {
        actions.push({
          type: "move",
          source: "waste",
          target: tableauZone,
          cardIds: [wasteTop.id],
        });
      }
    }
  }

  for (const sourceZone of tableauZones) {
    const sourceCards = snapshot.zones[sourceZone].cards;

    for (let startIndex = 0; startIndex < sourceCards.length; startIndex += 1) {
      if (!isValidFaceUpRun(sourceCards, startIndex)) {
        continue;
      }

      const movingCards = sourceCards.slice(startIndex);
      const leadCard = movingCards[0];

      for (const targetZone of tableauZones) {
        if (sourceZone === targetZone) {
          continue;
        }

        if (canPlaceOnTableau(leadCard, snapshot.zones[targetZone].cards)) {
          actions.push({
            type: "move",
            source: sourceZone,
            target: targetZone,
            cardIds: movingCards.map((card) => card.id),
          });
        }
      }
    }

    const topCard = getTopCard(sourceCards);
    if (!topCard?.faceUp) {
      continue;
    }

    for (const foundationZone of foundationZones) {
      if (canPlaceOnFoundation(topCard, snapshot.zones[foundationZone].cards)) {
        actions.push({
          type: "move",
          source: sourceZone,
          target: foundationZone,
          cardIds: [topCard.id],
        });
      }
    }
  }

  for (const sourceZone of foundationZones) {
    const topCard = getTopCard(snapshot.zones[sourceZone].cards);
    if (!topCard) {
      continue;
    }

    for (const targetZone of tableauZones) {
      if (canPlaceOnTableau(topCard, snapshot.zones[targetZone].cards)) {
        actions.push({
          type: "move",
          source: sourceZone,
          target: targetZone,
          cardIds: [topCard.id],
        });
      }
    }
  }

  return actions;
}

function applyAction(snapshot: GameSnapshot, action: CardAction): GameSnapshot {
  const legalActions = new Set(getLegalActions(snapshot).map(serializeAction));
  if (!legalActions.has(serializeAction(action))) {
    return { ...snapshot, revision: snapshot.revision + 1 };
  }

  if (action.type === "draw" && action.source === "stock") {
    const stockCards = [...snapshot.zones.stock.cards];
    const wasteCards = [...snapshot.zones.waste.cards];
    const nextCard = stockCards.shift();

    if (nextCard) {
      wasteCards.push({ ...nextCard, faceUp: true });
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

  if (action.type === "draw" && action.source === "waste") {
    const stockCards = snapshot.zones.waste.cards
      .slice()
      .reverse()
      .map((card) => ({ ...card, faceUp: false }));

    return {
      ...snapshot,
      revision: snapshot.revision + 1,
      turn: snapshot.turn + 1,
      zones: {
        ...snapshot.zones,
        stock: { ...snapshot.zones.stock, cards: stockCards },
        waste: { ...snapshot.zones.waste, cards: [] },
      },
    };
  }

  if (action.type === "move") {
    const sourceCards = [...snapshot.zones[action.source].cards];
    const targetCards = [...snapshot.zones[action.target].cards];
    const moveStart = sourceCards.findIndex((card) => card.id === action.cardIds[0]);

    if (moveStart === -1) {
      return { ...snapshot, revision: snapshot.revision + 1 };
    }

    const movingCards = sourceCards.slice(moveStart);
    if (
      movingCards.length !== action.cardIds.length
      || movingCards.some((card, index) => card.id !== action.cardIds[index])
    ) {
      return { ...snapshot, revision: snapshot.revision + 1 };
    }

    const nextSourceCards = sourceCards.slice(0, moveStart);
    if (isTableauZone(action.source) && nextSourceCards.length > 0) {
      const revealedCard = nextSourceCards[nextSourceCards.length - 1];
      if (!revealedCard.faceUp) {
        nextSourceCards[nextSourceCards.length - 1] = { ...revealedCard, faceUp: true };
      }
    }

    return {
      ...snapshot,
      revision: snapshot.revision + 1,
      turn: snapshot.turn + 1,
      zones: {
        ...snapshot.zones,
        [action.source]: { ...snapshot.zones[action.source], cards: nextSourceCards },
        [action.target]: {
          ...snapshot.zones[action.target],
          cards: [...targetCards, ...movingCards.map((card) => ({ ...card, faceUp: true }))],
        },
      },
    };
  }

  return {
    ...snapshot,
    revision: snapshot.revision + 1,
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
  evaluateWinState: (snapshot) => {
    const foundationCount = foundationZones.reduce(
      (count, zoneId) => count + snapshot.zones[zoneId].cards.length,
      0,
    );
    return foundationCount === 52 ? "won" : "active";
  },
  validateDefinition: () => ({ ok: true, issues: [] }),
};
