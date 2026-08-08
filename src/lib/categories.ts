export const AGE_CATEGORIES = ["SENIOR", "U23", "U20", "U19", "U17", "U15"] as const;
export type AgeCategoryValue = (typeof AGE_CATEGORIES)[number];

export const COMPETITION_TYPES = [
  "LEAGUE",
  "CUP",
  "SUPER_CUP",
  "CONTINENTAL",
  "INTERNATIONAL",
  "YOUTH",
] as const;

export const COACH_ROLES = [
  "HEAD_COACH",
  "ASSISTANT",
  "GOALKEEPING",
  "FITNESS",
  "ANALYST",
  "ACADEMY_DIRECTOR",
  "SCOUT",
] as const;

export const VIDEO_TYPES = ["HIGHLIGHTS", "MATCH", "INTERVIEW", "SKILLS"] as const;

/**
 * Groups a squad by age category, keeping the canonical senior-first order and
 * dropping categories with nobody in them.
 */
export function groupByAgeCategory<T extends { ageCategory: string }>(
  players: T[],
): { category: AgeCategoryValue; players: T[] }[] {
  return AGE_CATEGORIES.map((category) => ({
    category,
    players: players.filter((player) => player.ageCategory === category),
  })).filter((group) => group.players.length > 0);
}
