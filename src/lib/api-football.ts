/**
 * Minimal client for API-Football v3 (https://www.api-football.com), the data
 * source behind the automatic fixtures, results and squads sync. Only the
 * fields the sync reads are typed.
 *
 * Needs API_FOOTBALL_KEY (the key from dashboard.api-football.com). Every call
 * spends one request of the account's quota, which is limited per minute and
 * per day (10 and 100 on the free plan): calls are spaced to stay under the
 * per-minute limit the API reports, and QuotaExhaustedError is thrown once the
 * day's requests are spent so a sync can stop cleanly and resume next time.
 */

const BASE_URL = "https://v3.football.api-sports.io";

export class QuotaExhaustedError extends Error {
  constructor() {
    super("Quota de requêtes API-Football du jour atteint.");
  }
}

export type ApiLeague = {
  league: { id: number; name: string; type: string };
  country: { name: string; code: string | null };
  seasons: { year: number; start: string; end: string; current: boolean }[];
};

export type ApiCountry = { name: string; code: string | null };

export type ApiTeam = {
  team: { id: number; name: string; logo: string | null; national: boolean };
};

export type ApiFixture = {
  fixture: {
    id: number;
    date: string;
    venue: { name: string | null } | null;
    status: { short: string };
  };
  league: { round: string | null };
  teams: {
    home: { id: number; name: string; logo: string | null };
    away: { id: number; name: string; logo: string | null };
  };
  goals: { home: number | null; away: number | null };
};

export type ApiSquadPlayer = {
  id: number;
  name: string;
  age: number | null;
  number: number | null;
  position: string | null;
  photo: string | null;
};

export function apiFootballConfigured(): boolean {
  return Boolean(process.env.API_FOOTBALL_KEY);
}

// Pacing state, shared by every call of a sync run. Until the API reports its
// per-minute limit, assume the free plan's 10 requests a minute.
let spacingMs = 6_500;
let lastCallAt = 0;
let dailyRemaining: number | null = null;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Requests left today, as last reported by the API (null before the first call). */
export function requestsRemainingToday(): number | null {
  return dailyRemaining;
}

async function call<T>(path: string, params: Record<string, string | number>, retried = false): Promise<T[]> {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) throw new Error("API_FOOTBALL_KEY n'est pas configurée.");
  if (dailyRemaining !== null && dailyRemaining <= 0) throw new QuotaExhaustedError();

  const url = new URL(path, BASE_URL);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, String(value));

  const wait = lastCallAt + spacingMs - Date.now();
  if (wait > 0) await sleep(wait);
  lastCallAt = Date.now();

  const response = await fetch(url, { headers: { "x-apisports-key": key }, cache: "no-store" });

  const perMinute = Number(response.headers.get("x-ratelimit-limit"));
  if (perMinute > 0) spacingMs = Math.ceil(60_000 / perMinute) + 100;
  const remaining = response.headers.get("x-ratelimit-requests-remaining");
  if (remaining !== null && remaining !== "") dailyRemaining = Number(remaining);

  const body = response.ok
    ? ((await response.json()) as { errors?: unknown; response?: T[] })
    : { errors: { http: response.status } };

  // Errors come back with a 200 status, as an object (or a non-empty array).
  const errors = body.errors;
  const hasErrors = Array.isArray(errors) ? errors.length > 0 : errors && Object.keys(errors).length > 0;
  if (hasErrors) {
    const text = JSON.stringify(errors);
    if (/requests?\b.*\b(day|limit)/i.test(text) && !/rateLimit/i.test(text)) throw new QuotaExhaustedError();
    if (response.status === 429 || /rateLimit/i.test(text)) {
      // Per-minute burst: wait for the window to reset and try once more.
      if (retried || dailyRemaining === 0) throw new QuotaExhaustedError();
      await sleep(61_000);
      return call<T>(path, params, true);
    }
    throw new Error(`API-Football ${path} : ${text}`);
  }

  return body.response ?? [];
}

export function fetchLeague(id: number) {
  return call<ApiLeague>("/leagues", { id });
}

export function fetchCountries() {
  return call<ApiCountry>("/countries", {});
}

/** Every league API-Football lists for a country, by its API name (e.g. "Ivory-Coast"). */
export function fetchCountryLeagues(country: string) {
  return call<ApiLeague>("/leagues", { country, type: "league" });
}

/** Every team API-Football knows in a country — no season needed, so any plan can read it. */
export function fetchCountryTeams(country: string) {
  return call<ApiTeam>("/teams", { country });
}

export function fetchFixtures(league: number, season: number) {
  return call<ApiFixture>("/fixtures", { league, season });
}

export async function fetchSquad(team: number): Promise<ApiSquadPlayer[]> {
  const rows = await call<{ players: ApiSquadPlayer[] }>("/players/squads", { team });
  return rows[0]?.players ?? [];
}
