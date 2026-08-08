import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAccount } from "@/lib/account";

export type OrgContext = {
  userId: string;
  organisationId: string;
  organisationName: string;
  type: string;
  role: string;
  /** The club this organisation speaks for, if any. Agencies have none. */
  clubId: string | null;
};

/**
 * Resolves the organisation a member is acting for, refusing anything that is
 * not theirs. Every delegated write goes through here: authorisation lives in
 * one place rather than being re-checked, and forgotten, in each action.
 */
export async function requireOrganisation(slug: string): Promise<OrgContext> {
  const account = await getAccount();
  if (!account) redirect("/fr/account/sign-in");
  if (account.isBanned) redirect("/fr/account");

  const membership = await prisma.organisationMember.findFirst({
    where: {
      userId: account.userId,
      isActive: true,
      organisation: { slug },
    },
    include: { organisation: true },
  });

  // Not a member, or the organisation is not approved: both send the member back
  // to their account page rather than leaking whether the organisation exists.
  if (!membership || membership.organisation.status !== "APPROVED") {
    redirect("/fr/account");
  }

  return {
    userId: account.userId,
    organisationId: membership.organisation.id,
    organisationName: membership.organisation.name,
    type: membership.organisation.type,
    role: membership.role,
    clubId: membership.organisation.clubId,
  };
}

/** Players an organisation is allowed to see and edit. */
export async function playersInScope(context: OrgContext) {
  return prisma.player.findMany({
    where: organisationScope(context),
    orderBy: [{ squadLevel: "asc" }, { name: "asc" }],
    include: {
      club: true,
      nationality: true,
      marketValues: { orderBy: { effectiveAt: "desc" }, take: 1 },
    },
  });
}

/**
 * A club sees its own squad. An agency sees the players it currently represents,
 * plus any it created itself — otherwise an agency could not add a free agent
 * before the representation exists.
 */
export function organisationScope(context: OrgContext) {
  if (context.clubId) {
    return {
      OR: [
        { clubId: context.clubId },
        { createdByOrganisationId: context.organisationId },
      ],
    };
  }

  return {
    OR: [
      {
        representations: {
          some: { organisationId: context.organisationId, endDate: null },
        },
      },
      { createdByOrganisationId: context.organisationId },
    ],
  };
}

/** Throws unless the given player is inside the organisation's scope. */
export async function assertPlayerInScope(
  context: OrgContext,
  playerId: string,
): Promise<void> {
  const player = await prisma.player.findFirst({
    where: { AND: [{ id: playerId }, organisationScope(context)] },
    select: { id: true },
  });

  if (!player) {
    throw new Error("Ce joueur ne fait pas partie de ton effectif.");
  }
}
