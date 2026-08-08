"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { youtubeVideoId } from "@/lib/youtube";
import { computeValuation } from "@/lib/valuation";
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

/**
 * Home and league listings are prerendered, so an edit in the admin must purge
 * the whole public tree or the change stays invisible until the next deploy.
 */
function revalidatePublicSite() {
  revalidatePath("/", "layout");
}

/** Slugs must be unique; append a counter when the natural slug is taken. */
async function uniqueSlug(
  base: string,
  model: "club" | "player" | "competition" | "coach",
  currentId?: string,
): Promise<string> {
  const seed = base.length > 0 ? base : "sans-nom";
  let candidate = seed;
  let counter = 2;

  const lookup = {
    club: (slug: string) => prisma.club.findUnique({ where: { slug } }),
    player: (slug: string) => prisma.player.findUnique({ where: { slug } }),
    competition: (slug: string) => prisma.competition.findUnique({ where: { slug } }),
    coach: (slug: string) => prisma.coach.findUnique({ where: { slug } }),
  }[model];

  for (;;) {
    const existing = await lookup(candidate);
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
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const fifaCategory = optionalInt(formData.get("fifaCategory"));
  if (fifaCategory !== null && (fifaCategory < 1 || fifaCategory > 4)) {
    return { error: "La catégorie FIFA doit être comprise entre 1 et 4." };
  }

  const parentClubId = optionalText(formData.get("parentClubId"));
  if (id && parentClubId === id) {
    return { error: "Un club ne peut pas être son propre club parent." };
  }

  const data = {
    ...parsed.data,
    type: (optionalText(formData.get("type")) ?? "CLUB") as never,
    shortName: optionalText(formData.get("shortName")),
    city: optionalText(formData.get("city")),
    stadium: optionalText(formData.get("stadium")),
    founded: optionalInt(formData.get("founded")),
    logoUrl: optionalText(formData.get("logoUrl")),
    teamPhotoUrl: optionalText(formData.get("teamPhotoUrl")),
    websiteUrl: optionalText(formData.get("websiteUrl")),
    fifaCategory,
    parentClubId,
    primaryCompetitionId: optionalText(formData.get("primaryCompetitionId")),
  };

  const slug = await uniqueSlug(slugify(data.nameEn), "club", id ?? undefined);

  if (id) {
    await prisma.club.update({ where: { id }, data: { ...data, slug } });
  } else {
    await prisma.club.create({ data: { ...data, slug } });
  }

  revalidatePath("/admin/clubs");
  revalidatePublicSite();
  redirect("/admin/clubs");
}

export async function deleteClub(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id"));

  await prisma.club.delete({ where: { id } });
  revalidatePath("/admin/clubs");
  revalidatePublicSite();
}

// ---------------------------------------------------------------- players

/**
 * Recomputes a player's value from the engine and stores it, unless an editor has
 * set the value by hand — a manual figure is never overwritten by the formula.
 * A new history point is only written when the number actually moves, so the
 * value chart shows real changes rather than one dot per save.
 */
async function refreshComputedValue(playerId: string): Promise<void> {
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
  const best =
    player.selections.find((selection) => selection.level === "SENIOR") ??
    player.selections[0] ??
    null;

  const result = computeValuation({
    dateOfBirth: player.dateOfBirth,
    squadLevel: player.squadLevel,
    contractUntil: player.contractUntil,
    competitionStrength: player.club?.primaryCompetition?.strengthCoefficient ?? null,
    nationalTeam: best ? { level: best.level, caps: best.caps } : null,
  });

  if (latest && latest.valueUsd === result.valueUsd) return;

  await prisma.marketValue.create({
    data: {
      playerId,
      valueUsd: result.valueUsd,
      source: "ALGORITHM",
      confidence: result.confidence,
      breakdown: {
        baseUsd: result.baseUsd,
        criteria: result.criteria,
      },
    },
  });
}

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
    ageCategory: (optionalText(formData.get("ageCategory")) ?? "SENIOR") as never,
    squadLevel: (optionalText(formData.get("squadLevel")) ?? "FIRST_TEAM") as never,
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

  // A value typed on the form always wins over the engine: an editor who has
  // looked at the player knows more than a formula.
  const manualValue = optionalInt(formData.get("marketValueUsd"));
  if (manualValue !== null) {
    const latest = await prisma.marketValue.findFirst({
      where: { playerId: player.id },
      orderBy: { effectiveAt: "desc" },
    });

    if (!latest || latest.valueUsd !== manualValue) {
      await prisma.marketValue.create({
        data: {
          playerId: player.id,
          valueUsd: manualValue,
          source: "MANUAL",
        },
      });
    }
  } else {
    await refreshComputedValue(player.id);
  }

  revalidatePath("/admin/players");
  revalidatePublicSite();
  redirect("/admin/players");
}

export async function deletePlayer(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id"));

  await prisma.player.delete({ where: { id } });
  revalidatePath("/admin/players");
  revalidatePublicSite();
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
    feeUsd: optionalInt(formData.get("feeUsd")),
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

  // A new club usually means a new competition level, hence a new value.
  await refreshComputedValue(data.playerId);

  revalidatePath("/admin/transfers");
  revalidatePublicSite();
  redirect("/admin/transfers");
}

export async function deleteTransfer(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id"));

  await prisma.transfer.delete({ where: { id } });
  revalidatePath("/admin/transfers");
  revalidatePublicSite();
}

// ---------------------------------------------------------------- honours

export async function saveHonour(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const holders = {
    clubId: optionalText(formData.get("clubId")),
    playerId: optionalText(formData.get("playerId")),
    coachId: optionalText(formData.get("coachId")),
    countryId: optionalText(formData.get("countryId")),
  };

  const filled = Object.values(holders).filter(Boolean);
  if (filled.length === 0) {
    return {
      error:
        "Choisis à qui appartient ce titre : un club, un joueur, un entraîneur ou une sélection nationale.",
    };
  }
  if (filled.length > 1) {
    return { error: "Un titre ne peut être attribué qu'à un seul bénéficiaire." };
  }

  const year = optionalInt(formData.get("year"));
  if (year === null || year < 1880 || year > new Date().getFullYear() + 1) {
    return { error: "L'année du titre est obligatoire et doit être plausible." };
  }

  const competitionId = optionalText(formData.get("competitionId"));
  const titleFr = optionalText(formData.get("titleFr"));

  // Either the title comes from a competition, or it is typed in by hand.
  if (!competitionId && !titleFr) {
    return {
      error:
        "Indique soit une compétition, soit un intitulé libre pour cette distinction.",
    };
  }

  await prisma.honour.create({
    data: {
      ...holders,
      competitionId,
      year,
      seasonLabel: optionalText(formData.get("seasonLabel")),
      type: (optionalText(formData.get("type")) ?? "WINNER") as never,
      titleFr,
      titleEn: optionalText(formData.get("titleEn")) ?? titleFr,
      titleAr: optionalText(formData.get("titleAr")) ?? titleFr,
      note: optionalText(formData.get("note")),
    },
  });

  revalidatePath("/admin/honours");
  revalidatePublicSite();
  redirect("/admin/honours");
}

export async function deleteHonour(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id"));

  await prisma.honour.delete({ where: { id } });
  revalidatePath("/admin/honours");
  revalidatePublicSite();
}

// ---------------------------------------------------------------- competitions

const competitionSchema = z.object({
  nameFr: z.string().trim().min(1, "Le nom en français est obligatoire."),
  nameEn: z.string().trim().min(1, "Le nom en anglais est obligatoire."),
  nameAr: z.string().trim().min(1, "Le nom en arabe est obligatoire."),
  type: z.string().trim().min(1, "Le type de compétition est obligatoire."),
});

export async function saveCompetition(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const id = optionalText(formData.get("id"));
  const parsed = competitionSchema.safeParse({
    nameFr: formData.get("nameFr"),
    nameEn: formData.get("nameEn"),
    nameAr: formData.get("nameAr"),
    type: formData.get("type"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const strength = Number.parseFloat(
    String(formData.get("strengthCoefficient") ?? "").replace(",", "."),
  );

  const data = {
    nameFr: parsed.data.nameFr,
    nameEn: parsed.data.nameEn,
    nameAr: parsed.data.nameAr,
    type: parsed.data.type as never,
    ageCategory: (optionalText(formData.get("ageCategory")) ?? "SENIOR") as never,
    tier: optionalInt(formData.get("tier")) ?? 1,
    logoUrl: optionalText(formData.get("logoUrl")),
    countryId: optionalText(formData.get("countryId")),
    strengthCoefficient: Number.isFinite(strength) && strength > 0 ? strength : 1,
  };

  const slug = await uniqueSlug(
    slugify(data.nameEn),
    "competition",
    id ?? undefined,
  );

  if (id) {
    await prisma.competition.update({ where: { id }, data: { ...data, slug } });
  } else {
    await prisma.competition.create({ data: { ...data, slug } });
  }

  revalidatePath("/admin/competitions");
  revalidatePublicSite();
  redirect("/admin/competitions");
}

export async function deleteCompetition(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id"));

  await prisma.competition.delete({ where: { id } });
  revalidatePath("/admin/competitions");
  revalidatePublicSite();
}

/** Enters or removes a club from a competition for the given season. */
export async function toggleClubEntry(formData: FormData): Promise<void> {
  await requireAdmin();

  const competitionId = String(formData.get("competitionId"));
  const clubId = String(formData.get("clubId"));
  const seasonId = String(formData.get("seasonId"));
  const shouldEnter = formData.get("enter") === "1";

  if (shouldEnter) {
    await prisma.clubCompetition.upsert({
      where: {
        clubId_competitionId_seasonId: { clubId, competitionId, seasonId },
      },
      update: {},
      create: { clubId, competitionId, seasonId },
    });
  } else {
    await prisma.clubCompetition.deleteMany({
      where: { clubId, competitionId, seasonId },
    });
  }

  revalidatePath(`/admin/competitions/${competitionId}/clubs`);
  revalidatePublicSite();
}

// ---------------------------------------------------------------- coaches

const coachSchema = z.object({
  name: z.string().trim().min(1, "Le nom de l'entraîneur est obligatoire."),
});

export async function saveCoach(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const id = optionalText(formData.get("id"));
  const parsed = coachSchema.safeParse({ name: formData.get("name") });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const data = {
    name: parsed.data.name,
    nameAr: optionalText(formData.get("nameAr")),
    dateOfBirth: optionalDate(formData.get("dateOfBirth")),
    photoUrl: optionalText(formData.get("photoUrl")),
    licence: optionalText(formData.get("licence")),
    nationalityId: optionalText(formData.get("nationalityId")),
  };

  const slug = await uniqueSlug(slugify(data.name), "coach", id ?? undefined);

  if (id) {
    await prisma.coach.update({ where: { id }, data: { ...data, slug } });
  } else {
    await prisma.coach.create({ data: { ...data, slug } });
  }

  revalidatePath("/admin/coaches");
  revalidatePublicSite();
  redirect("/admin/coaches");
}

export async function deleteCoach(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id"));

  await prisma.coach.delete({ where: { id } });
  revalidatePath("/admin/coaches");
  revalidatePublicSite();
}

export async function saveCoachSpell(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const coachId = optionalText(formData.get("coachId"));
  const clubId = optionalText(formData.get("clubId"));
  const startDate = optionalDate(formData.get("startDate"));

  if (!coachId || !clubId) {
    return { error: "L'entraîneur et le club sont obligatoires." };
  }
  if (!startDate) {
    return { error: "La date de début est obligatoire." };
  }

  const endDate = optionalDate(formData.get("endDate"));
  if (endDate && endDate < startDate) {
    return { error: "La date de fin ne peut pas précéder la date de début." };
  }

  await prisma.coachSpell.create({
    data: {
      coachId,
      clubId,
      startDate,
      endDate,
      role: (optionalText(formData.get("role")) ?? "HEAD_COACH") as never,
    },
  });

  revalidatePath(`/admin/coaches/${coachId}`);
  revalidatePublicSite();
  redirect(`/admin/coaches/${coachId}`);
}

export async function deleteCoachSpell(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id"));

  const spell = await prisma.coachSpell.delete({ where: { id } });
  revalidatePath(`/admin/coaches/${spell.coachId}`);
  revalidatePublicSite();
}

// ---------------------------------------------------------------- player media

export async function savePlayerVideo(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const playerId = optionalText(formData.get("playerId"));
  const url = optionalText(formData.get("url"));

  if (!playerId || !url) {
    return { error: "Le joueur et le lien de la vidéo sont obligatoires." };
  }
  if (youtubeVideoId(url) === null) {
    return {
      error: "Ce lien n'est pas une vidéo YouTube reconnue. Copie l'adresse depuis la barre du navigateur.",
    };
  }

  await prisma.playerVideo.create({
    data: {
      playerId,
      url,
      title: optionalText(formData.get("title")),
      type: (optionalText(formData.get("type")) ?? "HIGHLIGHTS") as never,
    },
  });

  revalidatePath(`/admin/players/${playerId}`);
  revalidatePublicSite();
  redirect(`/admin/players/${playerId}`);
}

export async function deletePlayerVideo(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id"));

  const video = await prisma.playerVideo.delete({ where: { id } });
  revalidatePath(`/admin/players/${video.playerId}`);
  revalidatePublicSite();
}

export async function saveSelection(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const playerId = optionalText(formData.get("playerId"));
  const countryId = optionalText(formData.get("countryId"));

  if (!playerId || !countryId) {
    return { error: "Le joueur et le pays sont obligatoires." };
  }

  const level = (optionalText(formData.get("level")) ?? "SENIOR") as never;
  const data = {
    caps: optionalInt(formData.get("caps")) ?? 0,
    goals: optionalInt(formData.get("goals")) ?? 0,
    isCurrent: formData.get("isCurrent") === "on",
    firstCallUp: optionalDate(formData.get("firstCallUp")),
  };

  // One row per player, country and level: re-submitting updates the numbers.
  await prisma.nationalTeamSelection.upsert({
    where: { playerId_countryId_level: { playerId, countryId, level } },
    update: data,
    create: { playerId, countryId, level, ...data },
  });

  // Caps feed the valuation, so the estimate is refreshed straight away.
  await refreshComputedValue(playerId);

  revalidatePath(`/admin/players/${playerId}`);
  revalidatePublicSite();
  redirect(`/admin/players/${playerId}`);
}

export async function deleteSelection(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id"));

  const selection = await prisma.nationalTeamSelection.delete({ where: { id } });
  revalidatePath(`/admin/players/${selection.playerId}`);
  revalidatePublicSite();
}
