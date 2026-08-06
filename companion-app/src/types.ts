export type NewsItem = {
  id?: string | null;
  title: string;
  date: string;
  body: string;
};

export type PromoItem = {
  code: string;
  reward: number;
  power_ups: Record<string, number>;
  max_uses_total: number | null;
  max_uses_per_person: number;
  active: boolean;
  daily: boolean;
  redeemed_count: number;
  source: "database" | "built_in" | "env";
  editable: boolean;
};

export type CompanionSettings = {
  apiBase: string;
  adminKey: string;
};
