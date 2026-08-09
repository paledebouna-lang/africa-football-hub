"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { youtubeVideoId } from "@/lib/youtube";
import { refreshPlayerValuation } from "@/lib/refresh-valuation";
import { requireOrganisation, assertPlayerInScope } from "@/lib/org-access";

export type OrgState = { error?: string } | undefined;

function text(value: FormDataEntryValue | null): string | null {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed.length > 0 ? trimmed : null;
}

function int(value: FormDataEntryValue | null): number | null {
  const raw = text(value);
  if (raw === null) return null;
  const parsed = Number.parseInt(raw.replace(/\s/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function date(value: FormDataEntryValue | null): Date | null {
  const raw = text(value);
  if (raw === null) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Assigned once, at creation. Renaming a player must not change their public
 * address, or every link already shared to their profile would break.
 */
async function uniquePlayerSlug(name: string): Promise<string> {
  const seed = slugify(name) || "joueur";
  let candidate = seed;
  let counter = 2;

  for (;;) {
    const existing = await prisma.player.findUnique({ where: { slug: candidate } });
    if (!existing) return candidate;
    candidate = `${seed}-${counter}`;
    counter += 1;
  }
}

const playerSchema = z.object({
  slug: z.string().trim().min(1),
  name: z.string().trim().min(2, "Le nom du joueur est obligatoire."),
});

export async function saveOrgPlayer(
  _state: OrgState,
  formData: FormData,
): Promise<OrgState> {
  const parsed = playerSchema.safeParse({
    slug: formData.get("orgSlug"),
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const context = await requireOrganisation(parsed.data.slug);
  const playerId = text(formData.get("id"));

  if (playerId) {
    try {
      await assertPlayerInScope(context, playerId);
    } catch {
      return { error: "Ce joueur ne fait pas partie de ton effectif." };
    }
  }

  const data = {
    name: parsed.data.name,
    nameAr: text(formData.get("nameAr")),
    dateOfBirth: date(formData.get("dateOfBirth")),
    position: text(formData.get("position")) as never,
    foot: text(formData.get("foot")) as never,
    ageCategory: (text(formData.get("ageCategory")) ?? "SENIOR") as never,
    squadLevel: (text(formData.get("squadLevel")) ?? "FIRST_TEAM") as never,
    heightCm: int(formData.get("heightCm")),
    shirtNumber: int(formData.get("shirtNumber")),
    contractUntil: date(formData.get("contractUntil")),
    nationalityId: text(formData.get("nationalityId")),
    photoUrl: text(formData.get("photoUrl")),
    // A club account can only attach players to its own club; an agency leaves
    // the club as-is so it cannot move a player into a club it does not own.
    ...(context.clubId ? { clubId: context.clubId } : {}),
  };

  const player = playerId
    ? await prisma.player.update({ where: { id: playerId }, data })
    : await prisma.player.create({
        data: {
          ...data,
          slug: await uniquePlayerSlug(data.name),
          createdByOrganisationId: context.organisationId,
        },
      });

  // An agency that adds a player also records that it represents them.
  if (!playerId && !context.clubId) {
    await prisma.playerRepresentation.create({
      data: { playerId: player.id, organisationId: context.organisationId },
    });
  }

  await refreshPlayerValuation(player.id);

  revalidatePath(`/fr/account/org/${context.organisationName}`);
  revalidatePath("/", "layout");
  redirect(`/fr/account/org/${parsed.data.slug}`);
}

/**
 * Records an arrival or a departure for one of the organisation's players.
 * The club is always one side of the move: a club cannot invent a transfer
 * between two other clubs.
 */
export async function saveOrgTransfer(
  _state: OrgState,
  formData: FormData,
): Promise<OrgState> {
  const orgSlug = text(formData.get("orgSlug"));
  const playerId = text(formData.get("playerId"));
  if (!orgSlug || !playerId) return { error: "Joueur introuvable." };

  const context = await requireOrganisation(orgSlug);
  if (!context.clubId) {
    return { error: "Seuls les clubs peuvent enregistrer un transfert." };
  }

  try {
    await assertPlayerInScope(context, playerId);
  } catch {
    return { error: "Ce joueur ne fait pas partie de ton effectif." };
  }

  const transferDate = date(formData.get("date"));
  if (!transferDate) return { error: "La date du transfert est obligatoire." };

  const direction = text(formData.get("direction")) ?? "IN";
  const otherClubId = text(formData.get("otherClubId"));

  if (otherClubId === context.clubId) {
    return { error: "Le club d'origine et le club d'arrivée sont identiques." };
  }

  const isArrival = direction === "IN";

  await prisma.transfer.create({
    data: {
      playerId,
      fromClubId: isArrival ? otherClubId : context.clubId,
      toClubId: isArrival ? context.clubId : otherClubId,
      seasonId: text(formData.get("seasonId")),
      date: transferDate,
      type: (text(formData.get("type")) ?? "PERMANENT") as never,
      feeUsd: int(formData.get("feeUsd")),
      isFeeUndisclosed: formData.get("isFeeUndisclosed") === "on",
    },
  });

  // A departure moves the player out of the squad; an arrival brings them in.
  await prisma.player.update({
    where: { id: playerId },
    data: { clubId: isArrival ? context.clubId : otherClubId },
  });

  await refreshPlayerValuation(playerId);

  revalidatePath(`/fr/account/org/${orgSlug}/players/${playerId}`);
  revalidatePath("/", "layout");
  redirect(`/fr/account/org/${orgSlug}/players/${playerId}`);
}

export async function deleteOrgTransfer(formData: FormData): Promise<void> {
  const orgSlug = String(formData.get("orgSlug"));
  const transferId = String(formData.get("id"));

  const context = await requireOrganisation(orgSlug);
  if (!context.clubId) return;

  // Only a transfer this club was part of may be removed.
  const transfer = await prisma.transfer.findFirst({
    where: {
      id: transferId,
      OR: [{ fromClubId: context.clubId }, { toClubId: context.clubId }],
    },
  });
  if (!transfer) return;

  await prisma.transfer.delete({ where: { id: transferId } });
  await refreshPlayerValuation(transfer.playerId);

  revalidatePath(`/fr/account/org/${orgSlug}/players/${transfer.playerId}`);
  revalidatePath("/", "layout");
}

export async function addOrgPlayerVideo(
  _state: OrgState,
  formData: FormData,
): Promise<OrgState> {
  const orgSlug = text(formData.get("orgSlug"));
  const playerId = text(formData.get("playerId"));
  const url = text(formData.get("url"));

  if (!orgSlug || !playerId || !url) {
    return { error: "Le joueur et le lien de la vidéo sont obligatoires." };
  }

  const context = await requireOrganisation(orgSlug);

  try {
    await assertPlayerInScope(context, playerId);
  } catch {
    return { error: "Ce joueur ne fait pas partie de ton effectif." };
  }

  if (youtubeVideoId(url) === null) {
    return {
      error:
        "Ce lien n'est pas une vidéo YouTube reconnue. Copie l'adresse depuis la barre du navigateur.",
    };
  }

  await prisma.playerVideo.create({
    data: {
      playerId,
      url,
      title: text(formData.get("title")),
      type: (text(formData.get("type")) ?? "HIGHLIGHTS") as never,
    },
  });

  revalidatePath(`/fr/account/org/${orgSlug}/players/${playerId}`);
  revalidatePath("/", "layout");
  redirect(`/fr/account/org/${orgSlug}/players/${playerId}`);
}
