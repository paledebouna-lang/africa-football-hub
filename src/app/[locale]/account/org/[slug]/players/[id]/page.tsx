import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";
import { requireOrganisation, organisationScope } from "@/lib/org-access";
import { localizedName } from "@/lib/localized";
import { playerFormOptions, playerFormLabels } from "@/lib/org-options";
import { OrgPlayerForm } from "@/components/org-player-form";
import { OrgVideoForm } from "@/components/org-video-form";
import { VIDEO_TYPES } from "@/lib/categories";
import { saveOrgPlayer, addOrgPlayerVideo } from "@/app/[locale]/account/org/actions";

function toDateInput(value: Date | null): string {
  return value ? value.toISOString().slice(0, 10) : "";
}

export default async function EditOrgPlayerPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string; id: string }>;
}) {
  const { locale, slug, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const context = await requireOrganisation(slug);

  // Scope is applied in the query itself: a player outside the organisation is
  // simply not found, rather than fetched and then checked.
  const player = await prisma.player.findFirst({
    where: { AND: [{ id }, organisationScope(context)] },
    include: { videos: { orderBy: { createdAt: "desc" } } },
  });
  if (!player) notFound();

  const countries = await prisma.country.findMany({ orderBy: { nameFr: "asc" } });
  const options = playerFormOptions(t);

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <div>
        <p className="text-sm text-muted">
          <Link href={`/account/org/${slug}`} className="hover:text-brand">
            {context.organisationName}
          </Link>
        </p>
        <h1 className="text-2xl font-bold">{player.name}</h1>
        <Link
          href={`/players/${player.slug}`}
          className="mt-1 inline-block text-sm text-brand hover:underline"
        >
          {t("org.viewPublicProfile")}
        </Link>
      </div>

      <section className="rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-4 font-semibold">{t("player.profile")}</h2>
        <OrgPlayerForm
          action={saveOrgPlayer}
          orgSlug={slug}
          countries={countries.map((country) => ({
            value: country.id,
            label: localizedName(country, locale),
          }))}
          {...options}
          defaults={{
            id: player.id,
            name: player.name,
            nameAr: player.nameAr,
            dateOfBirth: toDateInput(player.dateOfBirth),
            position: player.position,
            foot: player.foot,
            ageCategory: player.ageCategory,
            squadLevel: player.squadLevel,
            heightCm: player.heightCm,
            shirtNumber: player.shirtNumber,
            contractUntil: toDateInput(player.contractUntil),
            nationalityId: player.nationalityId,
            photoUrl: player.photoUrl,
          }}
          labels={playerFormLabels(t)}
        />
      </section>

      <section className="rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-4 font-semibold">{t("player.videos")}</h2>

        {player.videos.length === 0 ? (
          <p className="mb-6 text-sm text-muted">{t("player.noVideos")}</p>
        ) : (
          <ul className="mb-6 divide-y divide-border rounded-lg border border-border">
            {player.videos.map((video) => (
              <li key={video.id} className="p-3 text-sm">
                <p className="font-medium">
                  {video.title ?? t(`videoType.${video.type}`)}
                </p>
                <p className="break-all text-xs text-muted">{video.url}</p>
              </li>
            ))}
          </ul>
        )}

        <OrgVideoForm
          action={addOrgPlayerVideo}
          orgSlug={slug}
          playerId={player.id}
          types={VIDEO_TYPES.map((type) => ({
            value: type,
            label: t(`videoType.${type}`),
          }))}
          labels={{
            url: t("org.videoUrl"),
            urlHint: t("org.videoUrlHint"),
            title: t("org.videoTitle"),
            type: t("transfers.type"),
            submit: t("org.addVideo"),
            pending: t("common.loading"),
          }}
        />
      </section>
    </div>
  );
}
