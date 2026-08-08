import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatDate, ageFrom } from "@/lib/format";
import { localizedName } from "@/lib/localized";
import { getCoachBySlug } from "@/lib/queries";

export default async function CoachPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const coach = await getCoachBySlug(slug);
  if (!coach) notFound();

  const age = ageFrom(coach.dateOfBirth);
  const currentSpell = coach.spells.find((spell) => spell.endDate === null);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      <header>
        {currentSpell && (
          <p className="text-sm text-muted">
            <Link
              href={`/clubs/${currentSpell.club.slug}`}
              className="hover:text-brand"
            >
              {localizedName(currentSpell.club, locale)}
            </Link>
            {" · "}
            {t(`coachRole.${currentSpell.role}`)}
          </p>
        )}
        <h1 className="text-2xl font-bold">
          {locale === "ar" && coach.nameAr ? coach.nameAr : coach.name}
        </h1>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard
          label={t("player.dateOfBirth")}
          value={formatDate(coach.dateOfBirth, locale)}
        />
        <InfoCard
          label={t("player.age")}
          value={age === null ? "—" : t("player.years", { count: age })}
        />
        <InfoCard
          label={t("player.nationality")}
          value={coach.nationality ? localizedName(coach.nationality, locale) : "—"}
        />
        <InfoCard label={t("coach.licence")} value={coach.licence ?? "—"} />
      </section>

      <section>
        <h2 className="text-xl font-semibold">{t("coach.career")}</h2>
        {coach.spells.length === 0 ? (
          <p className="mt-4 text-sm text-muted">{t("coach.noSpells")}</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-muted">
                <tr>
                  <th className="px-4 py-3 text-start font-medium">
                    {t("coach.club")}
                  </th>
                  <th className="px-4 py-3 text-start font-medium">
                    {t("coach.role")}
                  </th>
                  <th className="px-4 py-3 text-start font-medium">
                    {t("coach.from")}
                  </th>
                  <th className="px-4 py-3 text-start font-medium">
                    {t("coach.until")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {coach.spells.map((spell) => (
                  <tr key={spell.id}>
                    <td className="px-4 py-3">
                      <Link
                        href={`/clubs/${spell.club.slug}`}
                        className="font-medium hover:text-brand"
                      >
                        {localizedName(spell.club, locale)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {t(`coachRole.${spell.role}`)}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {formatDate(spell.startDate, locale)}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {spell.endDate ? (
                        formatDate(spell.endDate, locale)
                      ) : (
                        <span className="rounded bg-brand/15 px-2 py-0.5 text-xs font-medium text-brand">
                          {t("coach.current")}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}
