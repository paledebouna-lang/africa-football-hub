"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import {
  verifyPassword,
  startAdminSession,
  endAdminSession,
  isAdminAuthenticated,
} from "@/lib/admin-auth";

export type ActionState = { error?: string } | undefined;

async function requireAdmin() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }
}

/** Slugs must be unique; append a counter when the natural slug is taken. */
async function uniqueSlug(
  base: string,
  model: "club" | "player" | "league",
  currentId?: string,
): Promise<string> {
  const seed = base.length > 0 ? base : "sans-nom";
  let candidate = seed;
  let counter = 2;

  for (;;) {
    const existing =
      model === "club"
        ? await prisma.club.findUnique({ where: { slug: candidate } })
        : model === "player"
          ? await prisma.player.findUnique({ where: { slug: candidate } })
          : await prisma.league.findUnique({ where: { slug: candidate } });

    if (!existing || existing.id === currentId) return candidate;
    candidate = `${seed}-${counter}`;
    counter += 1;
  }
}

function optionalText(value: FormDataEntryValue | null): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : null;
}

function optionalInt(value: FormDataEntryValue | null): number | null {
  const text = optionalText(value);
  if (text === null) return null;
  const parsed = Number.parseInt(text.replace(/\s/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function optionalDate(value: FormDataEntryValue | null): Date | null {
  const text = optionalText(value);
  if (text === null) return null;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

// ---------------------------------------------------------------- auth

export async function login(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const password = String(formData.get("password") ?? "");

  if (!verifyPassword(password)) {
    return { error: "Mot de passe incorrect." };
  }

  await startAdminSession();
  redirect("/admin");
}

export async function logout(): Promise<void> {
  await endAdminSession();
  redirect("/admin/login");
}

// ---------------------------------------------------------------- clubs

const clubSchema = z.object({
  nameFr: z.string().trim().min(1, "Le nom en français est obligatoire."),
  nameEn: z.string().trim().min(1, "Le nom en anglais est obligatoire."),
  nameAr: z.string().trim().min(1, "Le nom en arabe est obligatoire."),
  leagueId: z.string().trim().min(1, "Le championnat est obligatoire."),
});

export async function saveClub(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const id = optionalText(formData.get("id"));
  const parsed = clubSchema.safeParse({
    nameFr: formData.get("nameFr"),
    nameEn: formData.get("nameEn"),
    nameAr: formData.get("nameAr"),
    leagueId: formData.get("leagueId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const data = {
    ...parsed.data,
    shortName: optionalText(formData.get("shortName")),
    city: optionalText(formData.get("city")),
    stadium: optionalText(formData.get("stadium")),
    founded: optionalInt(formData.get("founded")),
    logoUrl: optionalText(formData.get("logoUrl")),
  };

  const slug = await uniqueSlug(slugify(data.nameEn), "club", id ?? undefined);

  if (id) {
    await prisma.club.update({ where: { id }, data: { ...data, slug } });
  } else {
    await prisma.club.create({ data: { ...data, slug } });
  }

  revalidatePath("/admin/clubs");
  redirect("/admin/clubs");
}

export async function deleteClub(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id"));

  await prisma.club.delete({ where: { id } });
  revalidatePath("/admin/clubs");
}

// ---------------------------------------------------------------- players

const playerSchema = z.object({
  name: z.string().trim().min(1, "Le nom du joueur est obligatoire."),
});

export async function savePlayer(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const id = optionalText(formData.get("id"));
  const parsed = playerSchema.safeParse({ name: formData.get("name") });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const position = optionalText(formData.get("position"));
  const foot = optionalText(formData.get("foot"));

  const data = {
    name: parsed.data.name,
    nameAr: optionalText(formData.get("nameAr")),
    dateOfBirth: optionalDate(formData.get("dateOfBirth")),
    position: position as never,
    foot: foot as never,
    heightCm: optionalInt(formData.get("heightCm")),
    shirtNumber: optionalInt(formData.get("shirtNumber")),
    contractUntil: optionalDate(formData.get("contractUntil")),
    agent: optionalText(formData.get("agent")),
    photoUrl: optionalText(formData.get("photoUrl")),
    clubId: optionalText(formData.get("clubId")),
    nationalityId: optionalText(formData.get("nationalityId")),
  };

  const slug = await uniqueSlug(slugify(data.name), "player", id ?? undefined);

  const player = id
    ? await prisma.player.update({ where: { id }, data: { ...data, slug } })
    : await prisma.player.create({ data: { ...data, slug } });

  // A value typed on the player form is recorded as a new point in the history.
  const marketValue = optionalInt(formData.get("marketValueEur"));
  if (marketValue !== null) {
    const latest = await prisma.marketValue.findFirst({
      where: { playerId: player.id },
      orderBy: { effectiveAt: "desc" },
    });

    if (!latest || latest.valueEur !== marketValue) {
      await prisma.marketValue.create({
        data: { playerId: player.id, valueEur: marketValue },
      });
    }
  }

  revalidatePath("/admin/players");
  redirect("/admin/players");
}

export async function deletePlayer(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id"));

  await prisma.player.delete({ where: { id } });
  revalidatePath("/admin/players");
}

// ---------------------------------------------------------------- transfers

const transferSchema = z.object({
  playerId: z.string().trim().min(1, "Le joueur est obligatoire."),
  date: z.string().trim().min(1, "La date est obligatoire."),
  type: z.string().trim().min(1, "Le type de transfert est obligatoire."),
});

export async function saveTransfer(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const id = optionalText(formData.get("id"));
  const parsed = transferSchema.safeParse({
    playerId: formData.get("playerId"),
    date: formData.get("date"),
    type: formData.get("type"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const date = optionalDate(formData.get("date"));
  if (!date) {
    return { error: "La date du transfert est invalide." };
  }

  const toClubId = optionalText(formData.get("toClubId"));

  const data = {
    playerId: parsed.data.playerId,
    fromClubId: optionalText(formData.get("fromClubId")),
    toClubId,
    seasonId: optionalText(formData.get("seasonId")),
    date,
    type: parsed.data.type as never,
    feeEur: optionalInt(formData.get("feeEur")),
    isFeeUndisclosed: formData.get("isFeeUndisclosed") === "on",
  };

  if (id) {
    await prisma.transfer.update({ where: { id }, data });
  } else {
    await prisma.transfer.create({ data });
  }

  // Recording an arrival also moves the player to their new club.
  if (data.type !== "LOAN_RETURN" && data.type !== "RETIRED") {
    await prisma.player.update({
      where: { id: data.playerId },
      data: { clubId: toClubId },
    });
  }

  revalidatePath("/admin/transfers");
  redirect("/admin/transfers");
}

export async function deleteTransfer(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id"));

  await prisma.transfer.delete({ where: { id } });
  revalidatePath("/admin/transfers");
}
