/**
 * Minimal client for API-Football v3 (https://www.api-football.com), the data
 * source behind the automatic fixtures, results and squads sync. Only the
 * fields the sync reads are typed.
 *
 * Needs API_FOOTBALL_KEY (the key from dashboard.api-football.com). Every call
 * spends one request of the account's daily quota.
 */

const BASE_URL = "https://v3.football.api-sports.io";

export type ApiLeague = {
  league: { id: number; name: string; type: string };
  country: { name: string; code: string | null };
  seasons: { year: number; start: string; end: string; current: boolean }[];
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

async function call<T>(path: string, params: Record<string, string | number>): Promise<T[]> {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) throw new Error("API_FOOTBALL_KEY n'est pas configurée.");

  const url = new URL(path, BASE_URL);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, String(value));

  const response = await fetch(url, { headers: { "x-apisports-key": key }, cache: "no-store" });
  if (!response.ok) throw new Error(`API-Football ${path} : HTTP ${response.status}`);

  const body = (await response.json()) as { errors?: unknown; response?: T[] };
  // Errors come back with a 200 status, as an object (or a non-empty array).
  const errors = body.errors;
  const hasErrors = Array.isArray(errors) ? errors.length > 0 : errors && Object.keys(errors).length > 0;
  if (hasErrors) throw new Error(`API-Football ${path} : ${JSON.stringify(errors)}`);

  return body.response ?? [];
}

export function fetchLeague(id: number) {
  return call<ApiLeague>("/leagues", { id });
}

/** Every league API-Football lists for a country, by its English name (e.g. "Ivory-Coast"). */
export function fetchCountryLeagues(country: string) {
  return call<ApiLeague>("/leagues", { country, type: "league" });
}

export function fetchFixtures(league: number, season: number) {
  return call<ApiFixture>("/fixtures", { league, season });
}

export async function fetchSquad(team: number): Promise<ApiSquadPlayer[]> {
  const rows = await call<{ players: ApiSquadPlayer[] }>("/players/squads", { team });
  return rows[0]?.players ?? [];
}
