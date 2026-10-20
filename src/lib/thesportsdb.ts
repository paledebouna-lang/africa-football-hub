/**
 * Minimal client for TheSportsDB v1 (https://www.thesportsdb.com), the source
 * of fixtures and results for the current season: unlike API-Football's free
 * plan, it publishes the season in progress. Only the fields the sync reads
 * are typed.
 *
 * THESPORTSDB_KEY defaults to the public test key "123", which is limited to
 * 30 requests a minute and caps a few endpoints (the whole-season listing
 * stops at 15 events, so fixtures are read round by round instead). A
 * supporter key from thesportsdb.com lifts those limits.
 */

const BASE_URL = "https://www.thesportsdb.com/api/v1/json";

export type TsdbLeague = {
  idLeague: string;
  strLeague: string;
  strLeagueAlternate: string | null;
  strSport: string;
  strCountry: string;
  strGender: string | null;
  intDivision: string | null;
  /** "0" for a league, "1" for a cup. */
  idCup: string | null;
  /** League id on API-Football v3, when TheSportsDB knows it. */
  idAPIfootballv3: string | null;
  /** e.g. "2026-2027" or "2026". */
  strCurrentSeason: string | null;
};

export type TsdbEvent = {
  idEvent: string;
  idAPIfootball: string | null;
  strHomeTeam: string;
  strAwayTeam: string;
  idHomeTeam: string;
  idAwayTeam: string;
  strHomeTeamBadge: string | null;
  strAwayTeamBadge: string | null;
  intHomeScore: string | null;
  intAwayScore: string | null;
  intRound: string | null;
  /** UTC date and time, e.g. "2026-09-26" and "15:30:00". */
  dateEvent: string | null;
  strTime: string | null;
  strTimestamp: string | null;
  strVenue: string | null;
  /** FT, NS, PST, CANC, AET, PEN… or a longer label such as "Match Finished". */
  strStatus: string | null;
  strPostponed: string | null;
};

export type TsdbTeam = {
  idTeam: string;
  strTeam: string;
  strTeamBadge: string | null;
  idAPIfootball: string | null;
};

export function theSportsDbKey(): string {
  return process.env.THESPORTSDB_KEY || "123";
}

// Pacing shared by every call of a run: the test key allows 30 requests a minute.
const SPACING_MS = Number(process.env.THESPORTSDB_SPACING_MS ?? 2_100);
let lastCallAt = 0;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function call<T>(path: string, params: Record<string, string | number>, retried = false): Promise<T[]> {
  const url = new URL(`${BASE_URL}/${theSportsDbKey()}/${path}`);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, String(value));

  const wait = lastCallAt + SPACING_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastCallAt = Date.now();

  const response = await fetch(url, { cache: "no-store" });
  if (response.status === 429 && !retried) {
    // Burst over the per-minute limit: wait for the window to reset, once.
    await sleep(61_000);
    return call<T>(path, params, true);
  }
  if (!response.ok) throw new Error(`TheSportsDB ${path} : HTTP ${response.status}`);

  // Every listing comes back under its own key, null when empty.
  const body = (await response.json()) as Record<string, T[] | null>;
  const rows = Object.values(body).find(Array.isArray);
  return rows ?? [];
}

/** Every league TheSportsDB lists for a country, by its English name ("Ivory Coast"). */
export async function fetchCountryLeagues(country: string): Promise<TsdbLeague[]> {
  const rows = await call<TsdbLeague>("search_all_leagues.php", { c: country });
  return rows.filter((league) => league.strSport === "Soccer");
}

export function fetchLeague(id: number): Promise<TsdbLeague[]> {
  return call<TsdbLeague>("lookupleague.php", { id });
}

/** The matches of one round of a season, e.g. round 3 of "2026-2027". */
export function fetchRound(league: number, season: string, round: number): Promise<TsdbEvent[]> {
  return call<TsdbEvent>("eventsround.php", { id: league, r: round, s: season });
}

export function fetchTeam(id: number): Promise<TsdbTeam[]> {
  return call<TsdbTeam>("lookupteam.php", { id });
}
