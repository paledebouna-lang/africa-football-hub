"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireOrganisation, type OrgContext } from "@/lib/org-access";
import { refreshPlayerValuation } from "@/lib/refresh-valuation";

export type MatchState = { error?: string } | undefined;

function text(value: FormDataEntryValue | null): string | null {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed.length > 0 ? trimmed : null;
}

function int(value: FormDataEntryValue | null): number | null {
  const raw = text(value);
  if (raw === null) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

/** A club may only record matches it actually played in. */
function assertClubInMatch(
  context: OrgContext,
  match: { homeClubId: string; awayClubId: string },
): boolean {
  return (
    context.clubId === match.homeClubId || context.clubId === match.awayClubId
  );
}

export async function saveMatch(
  _state: MatchState,
  formData: FormData,
): Promise<MatchState> {
  const orgSlug = text(formData.get("orgSlug"));
  if (!orgSlug) return { error: "Organisation introuvable." };

  const context = await requireOrganisation(orgSlug);
  if (!context.clubId) {
    return { error: "Seuls les clubs peuvent enregistrer des matchs." };
  }

  const opponentId = text(formData.get("opponentId"));
  const competitionId = text(formData.get("competitionId"));
  const seasonId = text(formData.get("seasonId"));
  const rawDate = text(formData.get("date"));

  if (!opponentId || !competitionId || !seasonId || !rawDate) {
    return { error: "L'adversaire, la compétition, la saison et la date sont obligatoires." };
  }
  if (opponentId === context.clubId) {
    return { error: "Un club ne peut pas jouer contre lui-même." };
  }

  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) {
    return { error: "La date du match est invalide." };
  }

  const isHome = text(formData.get("isHome")) === "1";
  const ownScore = int(formData.get("ownScore"));
  const opponentScore = int(formData.get("opponentScore"));

  const match = await prisma.match.create({
    data: {
      competitionId,
      seasonId,
      date,
      homeClubId: isHome ? context.clubId : opponentId,
      awayClubId: isHome ? opponentId : context.clubId,
      homeScore: isHome ? ownScore : opponentScore,
      awayScore: isHome ? opponentScore : ownScore,
      ageCategory: (text(formData.get("ageCategory")) ?? "SENIOR") as never,
      venue: text(formData.get("venue")),
      matchday: int(formData.get("matchday")),
      status: (text(formData.get("status")) ?? "PLAYED") as never,
    },
  });

  revalidatePath(`/fr/account/org/${orgSlug}/matches`);
  redirect(`/fr/account/org/${orgSlug}/matches/${match.id}`);
}

/**
 * Records the club's own half of a team sheet. Each club fills only its own
 * players, so neither side can alter the other's figures.
 */
export async function saveTeamSheet(
  _state: MatchState,
  formData: FormData,
): Promise<MatchState> {
  const orgSlug = text(formData.get("orgSlug"));
  const matchId = text(formData.get("matchId"));
  if (!orgSlug || !matchId) return { error: "Match introuvable." };

  const context = await requireOrganisation(orgSlug);
  if (!context.clubId) {
    return { error: "Seuls les clubs peuvent saisir une feuille de match." };
  }

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || !assertClubInMatch(context, match)) {
    return { error: "Ce match ne concerne pas ton club." };
  }

  const squad = await prisma.player.findMany({
    where: { clubId: context.clubId },
    select: { id: true },
  });

  const touchedPlayers: string[] = [];

  for (const player of squad) {
    const minutes = int(formData.get(`minutes_${player.id}`)) ?? 0;
    const played = formData.get(`played_${player.id}`) === "on";

    if (!played) {
      // Removing a player from the sheet must also remove their line, otherwise
      // a correction would leave the old figures in place.
      const deleted = await prisma.matchAppearance.deleteMany({
        where: { matchId, playerId: player.id },
      });
      if (deleted.count > 0) touchedPlayers.push(player.id);
      continue;
    }

    const data = {
      clubId: context.clubId,
      isStarter: formData.get(`starter_${player.id}`) === "on",
      minutesPlayed: Math.max(0, Math.min(120, minutes)),
      goals: Math.max(0, int(formData.get(`goals_${player.id}`)) ?? 0),
      assists: Math.max(0, int(formData.get(`assists_${player.id}`)) ?? 0),
      yellowCards: Math.max(0, Math.min(2, int(formData.get(`yellow_${player.id}`)) ?? 0)),
      redCards: Math.max(0, Math.min(1, int(formData.get(`red_${player.id}`)) ?? 0)),
      cleanSheet: formData.get(`clean_${player.id}`) === "on",
    };

    await prisma.matchAppearance.upsert({
      where: { matchId_playerId: { matchId, playerId: player.id } },
      update: data,
      create: { matchId, playerId: player.id, ...data },
    });
    touchedPlayers.push(player.id);
  }

  // Minutes and goals feed the valuation, so every player on the sheet is repriced.
  for (const playerId of touchedPlayers) {
    await refreshPlayerValuation(playerId);
  }

  revalidatePath(`/fr/account/org/${orgSlug}/matches/${matchId}`);
  revalidatePath("/", "layout");
  redirect(`/fr/account/org/${orgSlug}/matches`);
}

export async function deleteMatch(formData: FormData): Promise<void> {
  const orgSlug = String(formData.get("orgSlug"));
  const matchId = String(formData.get("id"));

  const context = await requireOrganisation(orgSlug);
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { appearances: { select: { playerId: true } } },
  });

  if (!match || !context.clubId || !assertClubInMatch(context, match)) return;

  const affected = match.appearances.map((appearance) => appearance.playerId);
  await prisma.match.delete({ where: { id: matchId } });

  for (const playerId of affected) {
    await refreshPlayerValuation(playerId);
  }

  revalidatePath(`/fr/account/org/${orgSlug}/matches`);
  revalidatePath("/", "layout");
}
