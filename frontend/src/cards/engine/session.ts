import type { CardAction, CardEvent, CardGameDefinition, GameSnapshot } from "@/src/cards/engine/types";

export type SessionState = {
  definition: CardGameDefinition;
  history: CardEvent[];
  snapshots: GameSnapshot[];
};

export function createSession(definition: CardGameDefinition, seed: number): SessionState {
  const initial = definition.createInitialState(seed);
  return {
    definition,
    history: [
      { type: "seeded", seed },
      { type: "initialized", rulesetId: definition.metadata.id },
    ],
    snapshots: [initial],
  };
}

export function dispatchAction(session: SessionState, action: CardAction): SessionState {
  const current = session.snapshots[session.snapshots.length - 1];
  const next = session.definition.applyAction(current, action);
  next.status = session.definition.evaluateWinState(next);

  return {
    ...session,
    history: [...session.history, { type: "actionApplied", action }],
    snapshots: [...session.snapshots, next],
  };
}

export function undoLastAction(session: SessionState): SessionState {
  if (session.snapshots.length <= 1) {
    return session;
  }

  return {
    ...session,
    history: [...session.history, { type: "undo" }],
    snapshots: session.snapshots.slice(0, -1),
  };
}

export function replaySession(definition: CardGameDefinition, seed: number, actions: CardAction[]): SessionState {
  return actions.reduce(
    (state, action) => dispatchAction(state, action),
    createSession(definition, seed)
  );
}

export function serializeSession(session: SessionState): string {
  return JSON.stringify({
    rulesetId: session.definition.metadata.id,
    history: session.history,
    snapshots: session.snapshots,
  });
}
