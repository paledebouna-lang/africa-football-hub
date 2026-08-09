"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAccount } from "@/lib/account";
import { lastProposalFor, cooldownRemainingDays } from "@/lib/community";

export type ProposalState = { error?: string; notice?: string } | undefined;

/** Guard rails against typos and jokes: nothing outside this range is a serious bid. */
const MIN_PROPOSAL_USD = 500;
const MAX_PROPOSAL_USD = 200_000_000;

export async function proposeValue(
  _state: ProposalState,
  formData: FormData,
): Promise<ProposalState> {
  const account = await getAccount();
  if (!account) redirect("/fr/account/sign-in");

  if (account.isBanned) {
    return { error: "Ton compte est suspendu, tu ne peux pas proposer de valeur." };
  }

  const playerId = String(formData.get("playerId") ?? "").trim();
  const playerSlug = String(formData.get("playerSlug") ?? "").trim();
  if (!playerId || !playerSlug) return { error: "Joueur introuvable." };

  const raw = String(formData.get("valueUsd") ?? "").replace(/\s/g, "");
  const valueUsd = Number.parseInt(raw, 10);

  if (!Number.isFinite(valueUsd)) {
    return { error: "Saisis un montant en dollars, sans symbole ni espace." };
  }
  if (valueUsd < MIN_PROPOSAL_USD || valueUsd > MAX_PROPOSAL_USD) {
    return {
      error: `La valeur proposée doit être comprise entre ${MIN_PROPOSAL_USD} $ et ${MAX_PROPOSAL_USD.toLocaleString("fr-FR")} $.`,
    };
  }

  // One opinion per player per cooldown: without it, a single motivated person
  // could flood a player's page and manufacture a consensus on their own.
  const previous = await lastProposalFor(playerId, account.userId);
  if (previous) {
    const remaining = cooldownRemainingDays(previous.createdAt);
    if (remaining > 0) {
      return {
        error: `Tu as déjà proposé une valeur pour ce joueur. Tu pourras en proposer une nouvelle dans ${remaining} jour(s).`,
      };
    }
  }

  await prisma.valueProposal.create({
    data: {
      playerId,
      userId: account.userId,
      valueUsd,
      comment: String(formData.get("comment") ?? "").trim() || null,
    },
  });

  revalidatePath(`/fr/players/${playerSlug}`);
  revalidatePath("/admin/proposals");

  return {
    notice:
      "Merci. Ta proposition sera examinée avant d'être prise en compte dans la valeur du joueur.",
  };
}
