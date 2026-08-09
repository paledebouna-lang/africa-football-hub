import { prisma } from "@/lib/prisma";

export type Consensus = {
  consensusUsd: number;
  voteCount: number;
  lowestUsd: number;
  highestUsd: number;
};

/**
 * The community's verdict on a player, from proposals a moderator has accepted.
 *
 * The median is used rather than the average on purpose: one person proposing
 * fifty million as a joke shifts an average enormously and a median not at all.
 * Only accepted proposals count, so moderation is what admits a vote — not the
 * act of submitting one.
 */
export async function communityConsensus(
  playerId: string,
): Promise<Consensus | null> {
  const proposals = await prisma.valueProposal.findMany({
    where: { playerId, status: "ACCEPTED" },
    select: { valueUsd: true },
    orderBy: { valueUsd: "asc" },
  });

  if (proposals.length === 0) return null;

  const values = proposals.map((proposal) => proposal.valueUsd);
  const middle = Math.floor(values.length / 2);

  const median =
    values.length % 2 === 0
      ? Math.round((values[middle - 1] + values[middle]) / 2)
      : values[middle];

  return {
    consensusUsd: median,
    voteCount: values.length,
    lowestUsd: values[0],
    highestUsd: values[values.length - 1],
  };
}

/** How long a member must wait before proposing a new value for the same player. */
export const PROPOSAL_COOLDOWN_DAYS = 30;

export async function lastProposalFor(
  playerId: string,
  userId: string,
): Promise<{ createdAt: Date; status: string } | null> {
  return prisma.valueProposal.findFirst({
    where: { playerId, userId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true, status: true },
  });
}

export function cooldownRemainingDays(lastProposalAt: Date, now = new Date()): number {
  const elapsedDays =
    (now.getTime() - lastProposalAt.getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.ceil(PROPOSAL_COOLDOWN_DAYS - elapsedDays));
}
