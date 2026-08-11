"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { youtubeVideoId } from "@/lib/youtube";
import { refreshPlayerValuation } from "@/lib/refresh-valuation";
import { fetchAndImportNews } from "@/lib/news-fetch";
import { sendMail } from "@/lib/mailer";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  verifyPassword,
  startAdminSession,
  endAdminSession,
  isAdminAuthenticated,
} from "@/lib/admin-auth";

export type ActionState = { error?: string } | undefined;

async function requireAdmin() {
  if (!(await isAdminAuthenticated())) {
    redirect("/fr/account/sign-in?admin=1");
  }
}

/**
 * Home and league listings are prerendered, so an edit in the admin must purge
 * the whole public tree or the change stays invisible until the next deploy.
 */
function revalidatePublicSite() {
  revalidatePath("/", "layout");
}

type SluggedModel = "club" | "player" | "competition" | "coach" | "country";

const SLUG_LOOKUP = {
  club: (slug: string) => prisma.club.findUnique({ where: { slug } }),
  player: (slug: string) => prisma.player.findUnique({ where: { slug } }),
  competition: (slug: string) => prisma.competition.findUnique({ where: { slug } }),
  coach: (slug: string) => prisma.coach.findUnique({ where: { slug } }),
  country: (slug: string) => prisma.country.findUnique({ where: { slug } }),
} as const;

/** Slugs must be unique; append a counter when the natural slug is taken. */
async function uniqueSlug(base: string, model: SluggedModel): Promise<string> {
  const seed = base.length > 0 ? base : "sans-nom";
  let candidate = seed;
  let counter = 2;

  for (;;) {
    const existing = await SLUG_LOOKUP[model](candidate);
    if (!existing) return candidate;
    candidate = `${seed}-${counter}`;
    counter += 1;
  }
}

/**
 * A slug is assigned once and then left alone.
 *
 * Regenerating it on every save meant that simply correcting a club's spelling
 * silently changed its public address, breaking every link already shared or
 * indexed. A stable URL is worth more than a perfectly matching one.
 */
async function slugFor(
  base: string,
  model: SluggedModel,
  existingId?: string,
): Promise<string | undefined> {
  if (existingId) return undefined;
  return uniqueSlug(base, model);
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

/**
 * Image upload for the back office. The admin has no Supabase Auth session
 * (it authenticates via ADMIN_PASSWORD, not a member account), so it cannot
 * satisfy the storage bucket's "authenticated" RLS policy the way a club or
 * agency upload does. This runs server-side under requireAdmin() instead,
 * using the service-role client to bypass RLS directly.
 */
export async function adminUploadImage(
  formData: FormData,
): Promise<{ url?: string; error?: string }> {
  await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof Blob) || file.size === 0) {
    return { error: "Aucun fichier reçu." };
  }

  const folder = optionalText(formData.get("folder")) ?? "misc";

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return {
      error:
        "Envoi d'image indisponible : SUPABASE_SERVICE_ROLE_KEY n'est pas configurée.",
    };
  }

  const path = `${folder}/${crypto.randomUUID()}.jpg`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error } = await admin.storage
    .from("media")
    .upload(path, bytes, { contentType: "image/jpeg", upsert: false });

  if (error) return { error: error.message };

  const { data } = admin.storage.from("media").getPublicUrl(path);
  return { url: data.publicUrl };
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
  redirect("/fr/account/sign-in?admin=1");
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

  const slug = await slugFor(slugify(data.nameEn), "club", id ?? undefined);

  if (id) {
    await prisma.club.update({ where: { id }, data });
  } else {
    await prisma.club.create({ data: { ...data, slug: slug! } });
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
  const secondaryPositions = formData
    .getAll("secondaryPositions")
    .map(String)
    .filter((value) => value !== position);

  const data = {
    name: parsed.data.name,
    nameAr: optionalText(formData.get("nameAr")),
    dateOfBirth: optionalDate(formData.get("dateOfBirth")),
    position: position as never,
    secondaryPositions: secondaryPositions as never,
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

  const slug = await slugFor(slugify(data.name), "player", id ?? undefined);

  const player = id
    ? await prisma.player.update({ where: { id }, data })
    : await prisma.player.create({ data: { ...data, slug: slug! } });

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
    await refreshPlayerValuation(player.id);
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
  await refreshPlayerValuation(data.playerId);

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

// ---------------------------------------------------------------- matches

export async function saveAdminMatch(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const clubId = optionalText(formData.get("clubId"));
  const opponentId = optionalText(formData.get("opponentId"));
  const competitionId = optionalText(formData.get("competitionId"));
  const seasonId = optionalText(formData.get("seasonId"));
  const matchDate = optionalDate(formData.get("date"));

  if (!clubId || !opponentId || !competitionId || !seasonId || !matchDate) {
    return {
      error: "L'adversaire, la compétition, la saison et la date sont obligatoires.",
    };
  }
  if (clubId === opponentId) {
    return { error: "Un club ne peut pas jouer contre lui-même." };
  }

  const isHome = optionalText(formData.get("isHome")) === "1";
  const ownScore = optionalInt(formData.get("ownScore"));
  const opponentScore = optionalInt(formData.get("opponentScore"));

  const match = await prisma.match.create({
    data: {
      competitionId,
      seasonId,
      date: matchDate,
      homeClubId: isHome ? clubId : opponentId,
      awayClubId: isHome ? opponentId : clubId,
      homeScore: isHome ? ownScore : opponentScore,
      awayScore: isHome ? opponentScore : ownScore,
      ageCategory: (optionalText(formData.get("ageCategory")) ?? "SENIOR") as never,
      venue: optionalText(formData.get("venue")),
      matchday: optionalInt(formData.get("matchday")),
    },
  });

  revalidatePath(`/admin/clubs/${clubId}/matches`);
  revalidatePublicSite();
  redirect(`/admin/clubs/${clubId}/matches/${match.id}`);
}

/** Records one club's half of a team sheet, from the admin side. */
export async function saveAdminTeamSheet(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const matchId = optionalText(formData.get("matchId"));
  const clubId = optionalText(formData.get("clubId"));
  if (!matchId || !clubId) return { error: "Match introuvable." };

  const squad = await prisma.player.findMany({
    where: { clubId },
    select: { id: true },
  });

  const touched: string[] = [];

  for (const player of squad) {
    const played = formData.get(`played_${player.id}`) === "on";

    if (!played) {
      const removed = await prisma.matchAppearance.deleteMany({
        where: { matchId, playerId: player.id },
      });
      if (removed.count > 0) touched.push(player.id);
      continue;
    }

    const data = {
      clubId,
      isStarter: formData.get(`starter_${player.id}`) === "on",
      minutesPlayed: Math.max(
        0,
        Math.min(120, optionalInt(formData.get(`minutes_${player.id}`)) ?? 0),
      ),
      goals: Math.max(0, optionalInt(formData.get(`goals_${player.id}`)) ?? 0),
      assists: Math.max(0, optionalInt(formData.get(`assists_${player.id}`)) ?? 0),
      yellowCards: Math.max(
        0,
        Math.min(2, optionalInt(formData.get(`yellow_${player.id}`)) ?? 0),
      ),
      redCards: Math.max(
        0,
        Math.min(1, optionalInt(formData.get(`red_${player.id}`)) ?? 0),
      ),
      cleanSheet: formData.get(`clean_${player.id}`) === "on",
    };

    await prisma.matchAppearance.upsert({
      where: { matchId_playerId: { matchId, playerId: player.id } },
      update: data,
      create: { matchId, playerId: player.id, ...data },
    });
    touched.push(player.id);
  }

  for (const playerId of touched) {
    await refreshPlayerValuation(playerId);
  }

  revalidatePath(`/admin/clubs/${clubId}/matches`);
  revalidatePublicSite();
  redirect(`/admin/clubs/${clubId}/matches`);
}

export async function deleteAdminMatch(formData: FormData): Promise<void> {
  await requireAdmin();

  const matchId = String(formData.get("id"));
  const clubId = String(formData.get("clubId"));

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { appearances: { select: { playerId: true } } },
  });
  if (!match) return;

  const affected = match.appearances.map((appearance) => appearance.playerId);
  await prisma.match.delete({ where: { id: matchId } });

  for (const playerId of affected) {
    await refreshPlayerValuation(playerId);
  }

  revalidatePath(`/admin/clubs/${clubId}/matches`);
  revalidatePublicSite();
}

// ---------------------------------------------------------------- proposals

/**
 * Accepting or rejecting a community proposal. Accepting one changes the
 * consensus, so the player's value is recomputed immediately — and rejecting a
 * previously accepted one must do the same, or a withdrawn vote would keep
 * counting.
 */
export async function reviewProposal(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id"));
  const decision = String(formData.get("decision"));
  if (!["ACCEPTED", "REJECTED", "PENDING"].includes(decision)) return;

  const proposal = await prisma.valueProposal.update({
    where: { id },
    data: { status: decision as never, reviewedAt: new Date() },
  });

  await refreshPlayerValuation(proposal.playerId);

  revalidatePath("/admin/proposals");
  revalidatePublicSite();
}

// ---------------------------------------------------------------- organisations

/**
 * Approving an organisation is the moment the platform vouches for it, so the
 * decision is recorded with its reviewer and reason rather than silently applied.
 */
export async function reviewOrganisation(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id"));
  const decision = String(formData.get("decision"));

  if (!["APPROVED", "REJECTED", "SUSPENDED", "PENDING"].includes(decision)) return;

  const reviewNote = optionalText(formData.get("reviewNote"));

  const organisation = await prisma.organisation.update({
    where: { id },
    data: {
      status: decision as never,
      reviewedAt: new Date(),
      reviewNote,
    },
  });

  if (decision === "APPROVED" || decision === "REJECTED") {
    await sendMail({
      to: organisation.email,
      subject:
        decision === "APPROVED"
          ? `Ta demande a été validée — ${organisation.name}`
          : `Ta demande n'a pas été retenue — ${organisation.name}`,
      text: [
        decision === "APPROVED"
          ? `Bonne nouvelle : la demande pour « ${organisation.name} » a été validée. Tu peux maintenant gérer ses joueurs depuis ton compte.`
          : `La demande pour « ${organisation.name} » n'a pas été retenue.`,
        reviewNote ? `\nMotif : ${reviewNote}` : null,
        `\n${process.env.NEXT_PUBLIC_SITE_URL}/fr/account`,
      ]
        .filter(Boolean)
        .join("\n"),
    });
  }

  revalidatePath("/admin/organisations");
  revalidatePublicSite();
}

// ---------------------------------------------------------------- countries

const countrySchema = z.object({
  nameFr: z.string().trim().min(1, "Le nom en français est obligatoire."),
  nameEn: z.string().trim().min(1, "Le nom en anglais est obligatoire."),
  nameAr: z.string().trim().min(1, "Le nom en arabe est obligatoire."),
  code: z
    .string()
    .trim()
    .min(2, "Le code du pays est obligatoire (ex. CIV, SEN).")
    .max(5, "Le code doit faire au plus 5 caractères.")
    .transform((value) => value.toUpperCase()),
});

export async function saveCountry(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const id = optionalText(formData.get("id"));

  const parsed = countrySchema.safeParse({
    nameFr: formData.get("nameFr"),
    nameEn: formData.get("nameEn"),
    nameAr: formData.get("nameAr"),
    code: formData.get("code"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const existingCode = await prisma.country.findUnique({
    where: { code: parsed.data.code },
  });
  if (existingCode && existingCode.id !== id) {
    return { error: `Le code « ${parsed.data.code} » est déjà utilisé.` };
  }

  const data = { ...parsed.data, flagUrl: optionalText(formData.get("flagUrl")) };

  const country = id
    ? await prisma.country.update({ where: { id }, data })
    : await prisma.country.create({
        data: { ...data, slug: await uniqueSlug(slugify(data.nameFr), "country") },
      });

  revalidatePath(`/admin/countries/${country.id}`);
  revalidatePath("/admin/countries");
  revalidatePublicSite();
  redirect("/admin/countries");
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

  revalidatePublicSite();
  redirect(adminPathForHolder(holders));
}

/** Honours are edited from a profile, so we return to the profile we came from. */
function adminPathForHolder(holders: {
  clubId: string | null;
  playerId: string | null;
  coachId: string | null;
  countryId: string | null;
}): string {
  if (holders.clubId) return `/admin/clubs/${holders.clubId}`;
  if (holders.playerId) return `/admin/players/${holders.playerId}`;
  if (holders.coachId) return `/admin/coaches/${holders.coachId}`;
  if (holders.countryId) return `/admin/countries/${holders.countryId}`;
  return "/admin";
}

export async function deleteHonour(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id"));

  const honour = await prisma.honour.delete({ where: { id } });
  revalidatePath(adminPathForHolder(honour));
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

  const slug = await slugFor(slugify(data.nameEn), "competition", id ?? undefined);

  if (id) {
    await prisma.competition.update({ where: { id }, data });
  } else {
    await prisma.competition.create({ data: { ...data, slug: slug! } });
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

/** Assigns or clears which pool a club sits in, e.g. "A", "B", "Nord". */
export async function setClubEntryGroup(formData: FormData): Promise<void> {
  await requireAdmin();

  const competitionId = String(formData.get("competitionId"));
  const clubId = String(formData.get("clubId"));
  const seasonId = String(formData.get("seasonId"));
  const group = optionalText(formData.get("group"));

  await prisma.clubCompetition.updateMany({
    where: { clubId, competitionId, seasonId },
    data: { group },
  });

  revalidatePath(`/admin/competitions/${competitionId}/clubs`);
  revalidatePublicSite();
}

// ---------------------------------------------------------------- national team competitions

export async function toggleNationalTeamEntry(formData: FormData): Promise<void> {
  await requireAdmin();

  const competitionId = String(formData.get("competitionId"));
  const countryId = String(formData.get("countryId"));
  const seasonId = String(formData.get("seasonId"));
  const shouldEnter = formData.get("enter") === "1";

  if (shouldEnter) {
    await prisma.nationalTeamEntry.upsert({
      where: {
        countryId_competitionId_seasonId: { countryId, competitionId, seasonId },
      },
      update: {},
      create: { countryId, competitionId, seasonId },
    });
  } else {
    await prisma.nationalTeamEntry.deleteMany({
      where: { countryId, competitionId, seasonId },
    });
  }

  revalidatePath(`/admin/competitions/${competitionId}/countries`);
  revalidatePublicSite();
}

export async function setNationalTeamEntryGroup(formData: FormData): Promise<void> {
  await requireAdmin();

  const competitionId = String(formData.get("competitionId"));
  const countryId = String(formData.get("countryId"));
  const seasonId = String(formData.get("seasonId"));
  const group = optionalText(formData.get("group"));

  await prisma.nationalTeamEntry.updateMany({
    where: { countryId, competitionId, seasonId },
    data: { group },
  });

  revalidatePath(`/admin/competitions/${competitionId}/countries`);
  revalidatePublicSite();
}

export async function saveNationalTeamMatch(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const countryId = optionalText(formData.get("countryId"));
  const opponentId = optionalText(formData.get("opponentId"));
  const competitionId = optionalText(formData.get("competitionId"));
  const seasonId = optionalText(formData.get("seasonId"));
  const matchDate = optionalDate(formData.get("date"));

  if (!countryId || !opponentId || !competitionId || !seasonId || !matchDate) {
    return {
      error: "L'adversaire, la compétition, la saison et la date sont obligatoires.",
    };
  }
  if (countryId === opponentId) {
    return { error: "Une sélection ne peut pas jouer contre elle-même." };
  }

  const isHome = optionalText(formData.get("isHome")) === "1";
  const ownScore = optionalInt(formData.get("ownScore"));
  const opponentScore = optionalInt(formData.get("opponentScore"));

  const match = await prisma.nationalTeamMatch.create({
    data: {
      competitionId,
      seasonId,
      date: matchDate,
      homeCountryId: isHome ? countryId : opponentId,
      awayCountryId: isHome ? opponentId : countryId,
      homeScore: isHome ? ownScore : opponentScore,
      awayScore: isHome ? opponentScore : ownScore,
      ageCategory: (optionalText(formData.get("ageCategory")) ?? "SENIOR") as never,
      venue: optionalText(formData.get("venue")),
      matchday: optionalInt(formData.get("matchday")),
    },
  });

  revalidatePath(`/admin/countries/${countryId}/matches`);
  revalidatePublicSite();
  redirect(`/admin/countries/${countryId}/matches/${match.id}`);
}

/**
 * Records one country's half of a national-team sheet. Also keeps the
 * player's NationalTeamSelection caps/goals in sync, so the manually-tracked
 * career totals reflect real match sheets once they exist.
 */
export async function saveNationalTeamSheet(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const matchId = optionalText(formData.get("matchId"));
  const countryId = optionalText(formData.get("countryId"));
  if (!matchId || !countryId) return { error: "Match introuvable." };

  const match = await prisma.nationalTeamMatch.findUnique({ where: { id: matchId } });
  if (!match) return { error: "Match introuvable." };

  const level = (optionalText(formData.get("ageCategory")) ?? match.ageCategory) as never;

  // The pool of eligible players is whoever is currently selected at this
  // level for this country — the sheet cannot include a player nobody called up.
  const selections = await prisma.nationalTeamSelection.findMany({
    where: { countryId, level, isCurrent: true },
    select: { playerId: true },
  });

  const touched: string[] = [];

  for (const { playerId } of selections) {
    const played = formData.get(`played_${playerId}`) === "on";

    if (!played) {
      const removed = await prisma.nationalTeamMatchAppearance.deleteMany({
        where: { matchId, playerId },
      });
      if (removed.count > 0) touched.push(playerId);
      continue;
    }

    const goals = Math.max(0, optionalInt(formData.get(`goals_${playerId}`)) ?? 0);
    const data = {
      countryId,
      isStarter: formData.get(`starter_${playerId}`) === "on",
      minutesPlayed: Math.max(
        0,
        Math.min(120, optionalInt(formData.get(`minutes_${playerId}`)) ?? 0),
      ),
      goals,
      assists: Math.max(0, optionalInt(formData.get(`assists_${playerId}`)) ?? 0),
      yellowCards: Math.max(
        0,
        Math.min(2, optionalInt(formData.get(`yellow_${playerId}`)) ?? 0),
      ),
      redCards: Math.max(
        0,
        Math.min(1, optionalInt(formData.get(`red_${playerId}`)) ?? 0),
      ),
      cleanSheet: formData.get(`clean_${playerId}`) === "on",
    };

    await prisma.nationalTeamMatchAppearance.upsert({
      where: { matchId_playerId: { matchId, playerId } },
      update: data,
      create: { matchId, playerId, ...data },
    });
    touched.push(playerId);

    // The player's international career total grows by exactly one cap and
    // whatever they scored — a real appearance always counts.
    await prisma.nationalTeamSelection.updateMany({
      where: { playerId, countryId, level },
      data: { caps: { increment: 1 }, goals: { increment: goals } },
    });
  }

  for (const playerId of touched) {
    await refreshPlayerValuation(playerId);
  }

  revalidatePath(`/admin/countries/${countryId}/matches`);
  revalidatePublicSite();
  redirect(`/admin/countries/${countryId}/matches`);
}

export async function deleteNationalTeamMatch(formData: FormData): Promise<void> {
  await requireAdmin();

  const matchId = String(formData.get("id"));
  const countryId = String(formData.get("countryId"));

  const match = await prisma.nationalTeamMatch.findUnique({
    where: { id: matchId },
    include: { appearances: { select: { playerId: true } } },
  });
  if (!match) return;

  const affected = match.appearances.map((appearance) => appearance.playerId);
  await prisma.nationalTeamMatch.delete({ where: { id: matchId } });

  for (const playerId of affected) {
    await refreshPlayerValuation(playerId);
  }

  revalidatePath(`/admin/countries/${countryId}/matches`);
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

  const slug = await slugFor(slugify(data.name), "coach", id ?? undefined);

  if (id) {
    await prisma.coach.update({ where: { id }, data });
  } else {
    await prisma.coach.create({ data: { ...data, slug: slug! } });
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
  await refreshPlayerValuation(playerId);

  revalidatePath(`/admin/players/${playerId}`);
  revalidatePath(`/admin/countries/${countryId}`);
  revalidatePublicSite();

  // Selections are composed from the country page, so that is where we return.
  redirect(`/admin/countries/${countryId}`);
}

export async function deleteSelection(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id"));

  const selection = await prisma.nationalTeamSelection.delete({ where: { id } });
  await refreshPlayerValuation(selection.playerId);

  revalidatePath(`/admin/players/${selection.playerId}`);
  revalidatePath(`/admin/countries/${selection.countryId}`);
  revalidatePublicSite();
}

// ---------------------------------------------------------------- news

export async function saveNews(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const id = optionalText(formData.get("id"));
  const title = optionalText(formData.get("title"));
  const excerpt = optionalText(formData.get("excerpt"));

  if (!title || !excerpt) {
    return { error: "Le titre et le résumé sont obligatoires." };
  }

  const data = {
    title,
    excerpt,
    imageUrl: optionalText(formData.get("imageUrl")),
    sourceUrl: optionalText(formData.get("sourceUrl")),
    sourceName: optionalText(formData.get("sourceName")),
    publishedAt: optionalDate(formData.get("publishedAt")) ?? new Date(),
  };

  if (id) {
    await prisma.newsItem.update({ where: { id }, data });
  } else {
    await prisma.newsItem.create({ data: { ...data, origin: "MANUAL" } });
  }

  revalidatePath("/admin/news");
  revalidatePublicSite();
  redirect("/admin/news");
}

export async function deleteNews(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id"));

  await prisma.newsItem.delete({ where: { id } });
  revalidatePath("/admin/news");
  revalidatePublicSite();
}

/**
 * Manual trigger for the same press sweep Vercel Cron runs daily (see
 * vercel.json + /api/cron/fetch-news) — lets the admin pull fresh news on
 * demand instead of waiting for the schedule.
 */
export async function refreshNewsNow(): Promise<void> {
  await requireAdmin();

  await fetchAndImportNews();

  revalidatePath("/admin/news");
  revalidatePublicSite();
}
