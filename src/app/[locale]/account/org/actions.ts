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

async function uniquePlayerSlug(name: string, currentId?: string): Promise<string> {
  const seed = slugify(name) || "joueur";
  let candidate = seed;
  let counter = 2;

  for (;;) {
    const existing = await prisma.player.findUnique({ where: { slug: candidate } });
    if (!existing || existing.id === currentId) return candidate;
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

  const slug = await uniquePlayerSlug(data.name, playerId ?? undefined);

  const player = playerId
    ? await prisma.player.update({ where: { id: playerId }, data: { ...data, slug } })
    : await prisma.player.create({
        data: { ...data, slug, createdByOrganisationId: context.organisationId },
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
