import type { NewsItem, PromoItem } from "./types";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function normalizeBase(url: string): string {
  return (url || "").trim().replace(/\/+$/, "");
}

async function parseError(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  if (!text) return `Request failed (${res.status})`;
  try {
    const data = JSON.parse(text) as { detail?: unknown; message?: string };
    const detail = data.detail ?? data.message;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((d) =>
          typeof d === "object" && d && "msg" in d
            ? String((d as { msg: string }).msg)
            : JSON.stringify(d),
        )
        .join("; ");
    }
  } catch {
    // fall through
  }
  return text;
}

export async function adminRequest<T>(
  apiBase: string,
  adminKey: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const base = normalizeBase(apiBase);
  const res = await fetch(`${base}/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Key": adminKey.trim(),
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    throw new ApiError(await parseError(res), res.status);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function checkAdmin(apiBase: string, adminKey: string) {
  return adminRequest<{ ok: boolean; build: string }>(apiBase, adminKey, "/admin/health");
}

export function listNews(apiBase: string, adminKey: string) {
  return adminRequest<NewsItem[]>(apiBase, adminKey, "/admin/news");
}

export function createNews(
  apiBase: string,
  adminKey: string,
  body: { title: string; date: string; body: string },
) {
  return adminRequest<NewsItem>(apiBase, adminKey, "/admin/news", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateNews(
  apiBase: string,
  adminKey: string,
  id: string,
  body: Partial<{ title: string; date: string; body: string }>,
) {
  return adminRequest<NewsItem>(apiBase, adminKey, `/admin/news/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function deleteNews(apiBase: string, adminKey: string, id: string) {
  return adminRequest<{ ok: boolean }>(
    apiBase,
    adminKey,
    `/admin/news/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
}

export function listPromos(apiBase: string, adminKey: string) {
  return adminRequest<PromoItem[]>(apiBase, adminKey, "/admin/promos");
}

export function createPromo(
  apiBase: string,
  adminKey: string,
  body: {
    code: string;
    reward: number;
    power_ups: Record<string, number>;
    max_uses_total: number | null;
    max_uses_per_person: number;
    active: boolean;
  },
) {
  return adminRequest<PromoItem>(apiBase, adminKey, "/admin/promos", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updatePromo(
  apiBase: string,
  adminKey: string,
  code: string,
  body: {
    reward: number;
    power_ups: Record<string, number>;
    max_uses_total?: number | null;
    clear_max_uses_total?: boolean;
    max_uses_per_person: number;
    active: boolean;
  },
) {
  return adminRequest<PromoItem>(
    apiBase,
    adminKey,
    `/admin/promos/${encodeURIComponent(code)}`,
    {
      method: "PUT",
      body: JSON.stringify(body),
    },
  );
}

export function deletePromo(apiBase: string, adminKey: string, code: string) {
  return adminRequest<{ ok: boolean }>(
    apiBase,
    adminKey,
    `/admin/promos/${encodeURIComponent(code)}`,
    { method: "DELETE" },
  );
}
