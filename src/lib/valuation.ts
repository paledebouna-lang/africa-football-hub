/**
 * Player valuation engine.
 *
 * Two stages, deliberately separate:
 *
 *  1. A BASE value set by the level of the competition the player's club plays in
 *     and whether they hold a first-team place. Every registered player therefore
 *     has a value from day one — which is the point of the platform: revealing
 *     players nobody has priced yet.
 *
 *  2. A set of weighted MODIFIERS (age, competition level, contract, caps, and
 *     later performances and community votes) that move the value around the base.
 *
 * Criteria that cannot be computed are not scored as zero — they are dropped and
 * their weight is redistributed across the rest. The share of weight actually used
 * is reported as `confidence`, so an estimate built on three criteria is never
 * presented with the same authority as one built on eight.
 */

import { ageFrom, monthsUntil } from "@/lib/format";

export const VALUATION_WEIGHTS = {
  performance: 30,
  age: 20,
  clubLevel: 15,
  community: 20,
  contract: 10,
  nationalTeam: 5,
} as const;

export type ValuationCriterion = keyof typeof VALUATION_WEIGHTS;

/** How far a fully positive or fully negative profile can move the base value. */
const MAX_UPLIFT = 1.5;
const MAX_DISCOUNT = 0.6;

export type BaseBand = {
  minStrength: number;
  firstTeamUsd: number;
  lowerLevelUsd: number;
};

/**
 * Starting values in USD, by the strength of the competition the club plays in.
 * Bands are inclusive of their lower bound and evaluated from the top down.
 */
export const BASE_BANDS: BaseBand[] = [
  { minStrength: 0.8, firstTeamUsd: 150_000, lowerLevelUsd: 30_000 },
  { minStrength: 0.6, firstTeamUsd: 100_000, lowerLevelUsd: 20_000 },
  { minStrength: 0.3, firstTeamUsd: 30_000, lowerLevelUsd: 5_000 },
  { minStrength: 0, firstTeamUsd: 5_000, lowerLevelUsd: 0 },
];

export function baseValueUsd(
  competitionStrength: number | null,
  squadLevel: string,
): number {
  // No club or no competition: treat as the weakest band rather than refusing
  // to price the player at all.
  const strength = competitionStrength ?? 0;
  const band =
    BASE_BANDS.find((candidate) => strength >= candidate.minStrength) ??
    BASE_BANDS[BASE_BANDS.length - 1];

  return squadLevel === "FIRST_TEAM" ? band.firstTeamUsd : band.lowerLevelUsd;
}

export type CriterionScore = {
  criterion: ValuationCriterion;
  /** -1 (strongly negative) to +1 (strongly positive). */
  score: number;
  weight: number;
  label: string;
};

export type ValuationInput = {
  dateOfBirth: Date | null;
  squadLevel: string;
  contractUntil: Date | null;
  competitionStrength: number | null;
  /** Highest national-team involvement, if any is on record. */
  nationalTeam: { level: string; caps: number } | null;
  now?: Date;
};

export type ValuationResult = {
  valueUsd: number;
  baseUsd: number;
  confidence: number;
  criteria: CriterionScore[];
};

/**
 * Value peaks in the early-to-mid twenties: old enough to play, young enough that
 * a buying club gets several years of resale runway.
 */
function ageScore(age: number): number {
  if (age <= 17) return 0.3;
  if (age <= 20) return 0.55;
  if (age <= 23) return 0.6;
  if (age <= 27) return 0.45;
  if (age <= 30) return 0;
  if (age <= 33) return -0.45;
  return -0.75;
}

/** A player inside their final year will leave for nothing, and is priced as such. */
function contractScore(monthsRemaining: number): number {
  if (monthsRemaining >= 36) return 0.6;
  if (monthsRemaining >= 24) return 0.3;
  if (monthsRemaining >= 12) return 0;
  if (monthsRemaining >= 6) return -0.4;
  return -0.8;
}

function nationalTeamScore(level: string, caps: number): number {
  if (level === "SENIOR") {
    if (caps >= 25) return 1;
    if (caps >= 10) return 0.8;
    if (caps >= 1) return 0.6;
    return 0.4;
  }
  if (level === "U23" || level === "U20") return 0.35;
  return 0.2;
}

export function computeValuation(input: ValuationInput): ValuationResult {
  const now = input.now ?? new Date();
  const base = baseValueUsd(input.competitionStrength, input.squadLevel);
  const criteria: CriterionScore[] = [];

  const age = ageFrom(input.dateOfBirth, now);
  if (age !== null) {
    criteria.push({
      criterion: "age",
      score: ageScore(age),
      weight: VALUATION_WEIGHTS.age,
      label: `${age} ans`,
    });
  }

  if (input.competitionStrength !== null) {
    // 0.60 is the neutral point: the level of a mid-table African top division.
    const normalised = (input.competitionStrength - 0.6) / 0.7;
    criteria.push({
      criterion: "clubLevel",
      score: Math.max(-1, Math.min(1, normalised)),
      weight: VALUATION_WEIGHTS.clubLevel,
      label: input.competitionStrength.toFixed(2),
    });
  }

  if (input.contractUntil) {
    const months = monthsUntil(input.contractUntil, now);
    criteria.push({
      criterion: "contract",
      score: contractScore(months),
      weight: VALUATION_WEIGHTS.contract,
      label: months > 0 ? `${months} mois restants` : "expiré",
    });
  }

  if (input.nationalTeam) {
    criteria.push({
      criterion: "nationalTeam",
      score: nationalTeamScore(input.nationalTeam.level, input.nationalTeam.caps),
      weight: VALUATION_WEIGHTS.nationalTeam,
      label: `${input.nationalTeam.level} · ${input.nationalTeam.caps} sél.`,
    });
  }

  // `performance` and `community` are intentionally absent until match sheets and
  // user accounts exist. Their weight is redistributed, not counted as zero.
  const totalWeight = Object.values(VALUATION_WEIGHTS).reduce((a, b) => a + b, 0);
  const usedWeight = criteria.reduce((sum, item) => sum + item.weight, 0);

  if (usedWeight === 0) {
    return { valueUsd: base, baseUsd: base, confidence: 0, criteria };
  }

  const weighted =
    criteria.reduce((sum, item) => sum + item.score * item.weight, 0) / usedWeight;

  const multiplier =
    weighted >= 0 ? 1 + weighted * MAX_UPLIFT : 1 + weighted * MAX_DISCOUNT;

  // Round to a readable figure rather than pretending to dollar precision.
  const raw = base * multiplier;
  const step = raw >= 100_000 ? 5_000 : raw >= 10_000 ? 1_000 : 500;
  const valueUsd = Math.max(0, Math.round(raw / step) * step);

  return {
    valueUsd,
    baseUsd: base,
    confidence: usedWeight / totalWeight,
    criteria,
  };
}
