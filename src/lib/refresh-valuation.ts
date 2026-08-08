import { prisma } from "@/lib/prisma";
import { computeValuation } from "@/lib/valuation";
import { performanceInputFor } from "@/lib/statistics";

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
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    include: {
      club: { include: { primaryCompetition: true } },
      selections: { orderBy: { caps: "desc" } },
      marketValues: { orderBy: { effectiveAt: "desc" }, take: 1 },
    },
  });
  if (!player) return;

  const latest = player.marketValues[0];
  if (latest?.source === "MANUAL") return;

  // Senior caps outrank youth ones regardless of how many were won.
  const bestSelection =
    player.selections.find((selection) => selection.level === "SENIOR") ??
    player.selections[0] ??
    null;

  const performance = await performanceInputFor(playerId, player.clubId);

  const result = computeValuation({
    dateOfBirth: player.dateOfBirth,
    squadLevel: player.squadLevel,
    contractUntil: player.contractUntil,
    competitionStrength: player.club?.primaryCompetition?.strengthCoefficient ?? null,
    nationalTeam: bestSelection
      ? { level: bestSelection.level, caps: bestSelection.caps }
      : null,
    position: player.position,
    performance,
  });

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
