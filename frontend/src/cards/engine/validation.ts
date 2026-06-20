import { DeterministicRng } from "@/src/cards/engine/rng";
import type { CardAction, CardGameDefinition, RulesValidationResult } from "@/src/cards/engine/types";

export function validateRulesDefinition(definition: CardGameDefinition): RulesValidationResult {
  const issues = [...definition.validateDefinition().issues];

  if (definition.setup.zones.length === 0) {
    issues.push({ severity: "error", message: "At least one zone is required." });
  }

  if (definition.metadata.playerCounts.length === 0) {
    issues.push({ severity: "error", message: "At least one supported player count is required." });
  }

  return {
    ok: issues.every((issue) => issue.severity !== "error"),
    issues,
  };
}

export function simulateActions(
  definition: CardGameDefinition,
  seed: number,
  actions: CardAction[],
): { legal: boolean; finalStatus: string } {
  const rng = new DeterministicRng(seed);
  const seededDefinition = definition.createInitialState(rng.nextInt(0x7fffffff));
  let snapshot = seededDefinition;

  for (const action of actions) {
    const legal = definition.getLegalActions(snapshot).some(
      (candidate) => JSON.stringify(candidate) === JSON.stringify(action),
    );
    if (!legal) {
      return { legal: false, finalStatus: snapshot.status };
    }
    snapshot = definition.applyAction(snapshot, action);
  }

  return { legal: true, finalStatus: definition.evaluateWinState(snapshot) };
}
