import { prisma } from "@/lib/prisma";
import { computeValuation, type ValuationResult } from "@/lib/valuation";
import { performanceInputFor } from "@/lib/statistics";
import { communityConsensus } from "@/lib/community";

/**
 * Computes what the model would say about a player right now, regardless of
 * whether the value actually on display is this figure or a manually-set
 * one. Shared by refreshPlayerValuation (which decides whether to store it)
 * and the player page (which shows the criteria breakdown and radar even
 * for manually-priced players — the insight is useful either way).
 */
export async function computeLiveValuation(
  playerId: string,
): Promise<ValuationResult | null> {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    include: {
      club: { include: { primaryCompetition: true } },
      selections: { orderBy: { caps: "desc" } },
    },
  });
  if (!player) return null;

  const bestSelection =
    player.selections.find((selection) => selection.level === "SENIOR") ??
    player.selections[0] ??
    null;

  const [performance, consensus] = await Promise.all([
    performanceInputFor(playerId, player.clubId),
    communityConsensus(playerId),
  ]);

  return computeValuation({
    dateOfBirth: player.dateOfBirth,
    squadLevel: player.squadLevel,
    contractUntil: player.contractUntil,
    competitionStrength: player.club?.primaryCompetition?.strengthCoefficient ?? null,
    clubFifaCategory: player.club?.fifaCategory ?? null,
    nationalTeam: bestSelection
      ? { level: bestSelection.level, caps: bestSelection.caps }
      : null,
    position: player.position,
    performance,
    community: consensus,
  });
}

/**
 * Recomputes a player's value and stores it if it moved.
 *
 * Single implementation shared by the admin and the club workspace: a player
 * entered by a club must be priced exactly as one entered by the editorial team,
 * or the figures on the site would not be comparable.
 *
 * A value set by hand is never overwritten — a person who looked at the player
 * knows more than the formula.
 */
export async function refreshPlayerValuation(playerId: string): Promise<void> {
  const latest = await prisma.marketValue.findFirst({
    where: { playerId },
    orderBy: { effectiveAt: "desc" },
  });
  if (latest?.source === "MANUAL") return;

  const result = await computeLiveValuation(playerId);
  if (!result) return;

  if (latest && latest.valueUsd === result.valueUsd) return;

  await prisma.marketValue.create({
    data: {
      playerId,
      valueUsd: result.valueUsd,
      source: "ALGORITHM",
      confidence: result.confidence,
      breakdown: { baseUsd: result.baseUsd, criteria: result.criteria },
    },
  });
}
