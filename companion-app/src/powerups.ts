// Keep aligned with frontend/src/game/powerups.ts and backend KNOWN_POWER_UP_IDS.
export type PowerUpOption = {
  id: string;
  label: string;
};

export const POWER_UPS: PowerUpOption[] = [
  { id: "speedBoost", label: "Speed Boost" },
  { id: "freeze", label: "Freeze" },
  { id: "teleport", label: "Teleport" },
  { id: "shield", label: "Shield" },
  { id: "key", label: "Key" },
  { id: "magnet", label: "Magnet" },
  { id: "rewind", label: "Rewind" },
  { id: "pelletScatter", label: "Pellet Scatter" },
  { id: "hardcoreRevive", label: "Revive Token" },
  { id: "fastRespawn", label: "Quick Revive" },
  { id: "reveal", label: "Reveal" },
  { id: "decoy", label: "Decoy" },
];

export function formatPowerUps(powerUps: Record<string, number> | undefined): string {
  const labels = Object.fromEntries(POWER_UPS.map((p) => [p.id, p.label]));
  const entries = Object.entries(powerUps || {}).filter(([, qty]) => Number(qty) > 0);
  if (!entries.length) return "none";
  return entries.map(([id, qty]) => `${labels[id] || id} x${qty}`).join(", ");
}
